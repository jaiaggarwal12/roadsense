import { Type } from '@google/genai';
import type { Issue } from '../types';

// ---------------------------------------------------------------------------
// Civic Copilot — agent tool definitions (Gemini function calling)
// These declarations are sent to Gemini; the model decides which to invoke.
// Executors run server-side (against the store) or client-side (fallback).
// ---------------------------------------------------------------------------

export const toolDeclarations = [
  {
    name: 'listIssues',
    description: 'List or search civic issues, ranked by Impact Score. Use to answer "what needs attention", "show critical issues", etc.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        ward: { type: Type.STRING, description: 'Optional ward name filter, e.g. "Bellandur".' },
        status: { type: Type.STRING, description: 'Optional status: Reported, Verified, Work Order, In Progress, Resolved.' },
        minImpact: { type: Type.NUMBER, description: 'Optional minimum Impact Score (0-100).' },
        limit: { type: Type.NUMBER, description: 'Max results (default 5).' },
      },
    },
  },
  {
    name: 'getIssue',
    description: 'Get full details of one issue by its id (e.g. "RS-1042").',
    parameters: {
      type: Type.OBJECT,
      properties: { id: { type: Type.STRING } },
      required: ['id'],
    },
  },
  {
    name: 'createReport',
    description: 'File a new civic issue report on the citizen\'s behalf from a text description (no photo).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        damageType: { type: Type.STRING, description: 'Pothole, Road Cave-in, Broken Divider, Missing Manhole Cover, Damaged Footpath, Water Leakage, Broken Streetlight, Garbage Hotspot, or Other.' },
        severity: { type: Type.STRING, description: 'Hairline, Shallow, Deep, or Critical.' },
        ward: { type: Type.STRING },
        zone: { type: Type.STRING, description: 'School Zone, Hospital Zone, Expressway, Bridge Approach, Arterial Road, Residential Lane, or Market.' },
        location: { type: Type.STRING, description: 'Landmark or street.' },
        description: { type: Type.STRING, description: 'What the citizen described.' },
      },
      required: ['damageType', 'severity', 'ward', 'location'],
    },
  },
  {
    name: 'dispatchCrew',
    description: 'Generate a work order and assign the nearest available crew to an issue.',
    parameters: {
      type: Type.OBJECT,
      properties: { id: { type: Type.STRING } },
      required: ['id'],
    },
  },
  {
    name: 'escalateIssue',
    description: 'Escalate an overdue or high-impact issue to the ward councillor.',
    parameters: {
      type: Type.OBJECT,
      properties: { id: { type: Type.STRING } },
      required: ['id'],
    },
  },
  {
    name: 'getWardScorecard',
    description: 'Get performance stats for a ward or all wards (resolution rate, avg response, open count).',
    parameters: {
      type: Type.OBJECT,
      properties: { ward: { type: Type.STRING, description: 'Optional ward name; omit for all wards.' } },
    },
  },
  {
    name: 'searchCivicInfo',
    description: 'Look up real-world civic / weather / regulation info using Google Search grounding. Use for questions like "CPWD pothole repair rate", "monsoon forecast Bengaluru", "BBMP citizen charter SLA".',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ['query'],
    },
  },
  {
    name: 'locationContext',
    description: 'Get real-world context about a place/area (nearby landmarks, schools, hospitals, what surrounds a location) using Google Maps grounding. Use to judge zone risk or describe where an issue is.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING, description: 'Place or area, e.g. "Outer Ring Rd near school junction, Bengaluru".' } },
      required: ['query'],
    },
  },
  {
    name: 'readUrl',
    description: 'Read and summarise the content of a specific web page (e.g. a BBMP circular, news report, or tender PDF page) using URL context grounding.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: 'A full https URL.' },
        question: { type: Type.STRING, description: 'What to extract from the page.' },
      },
      required: ['url'],
    },
  },
];

export const SYSTEM_INSTRUCTION = `You are the RoadSense Civic Copilot — an autonomous operations agent for an Indian municipal road-repair platform (BBMP/BMC).
You help citizens, ward officers and crew supervisors by USING TOOLS, not by guessing.

Behaviour:
- Always call the appropriate tool(s) to read or change real platform state before answering. Chain multiple tools when needed (e.g. find the top critical issue, then dispatch a crew to it).
- For real-world facts (repair rates, weather, regulations) call searchCivicInfo so answers are grounded.
- When creating a report, infer sensible damageType/severity/zone from the description and confirm what you filed.
- Be concise and action-oriented. Use ₹ for money. Refer to issues by id.
- After acting, briefly state what you did and the resulting Impact Score / status.

Guardrails (constraint-based):
- Only help with civic road/infrastructure topics for Indian municipalities. Politely decline anything unrelated.
- NEVER invent issue ids, costs, contractors or statuses — report only what the tools return. If a tool errors, say so plainly.
- Do not give legal, medical or financial advice. Keep responses safe, factual and non-alarming.`;

export interface ToolContext {
  listIssues(a: { ward?: string; status?: string; minImpact?: number; limit?: number }): any;
  getIssue(a: { id: string }): any;
  createReport(a: any): any;
  dispatchCrew(a: { id: string }): any;
  escalateIssue(a: { id: string }): any;
  getWardScorecard(a: { ward?: string }): any;
  searchCivicInfo(a: { query: string }): Promise<any>;
  locationContext(a: { query: string }): Promise<any>;
  readUrl(a: { url: string; question?: string }): Promise<any>;
}

export async function executeTool(name: string, args: any, ctx: ToolContext): Promise<any> {
  switch (name) {
    case 'listIssues': return ctx.listIssues(args || {});
    case 'getIssue': return ctx.getIssue(args);
    case 'createReport': return ctx.createReport(args);
    case 'dispatchCrew': return ctx.dispatchCrew(args);
    case 'escalateIssue': return ctx.escalateIssue(args);
    case 'getWardScorecard': return ctx.getWardScorecard(args);
    case 'searchCivicInfo': return ctx.searchCivicInfo(args);
    case 'locationContext': return ctx.locationContext(args);
    case 'readUrl': return ctx.readUrl(args);
    default: return { error: `unknown tool ${name}` };
  }
}

/** Compact issue view returned to the model (keeps tokens + base64 out). */
export function summariseIssue(i: Issue) {
  return {
    id: i.id, damageType: i.damageType, severity: i.severity, status: i.status,
    ward: i.ward, zone: i.zone, location: i.location, impact: i.impact.total,
    confirmations: i.confirmations, slaHours: i.slaHours, ageHours: i.ageHours,
    contractor: i.contractor, estCost: i.analysis.estimatedCostRange,
  };
}
