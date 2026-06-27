import type { Contractor, Issue, TimelineEvent, VisionAnalysis, Ward, ZoneType } from '../types';
import { analyseImage, validateRepair, hasApiKey } from './geminiService';
import { computeImpact, slaHoursForImpact } from './impactEngine';
import { CONTRACTORS, SEED_ISSUES, WARDS, nextId } from '../data/seed';
import { runAgent, type AgentResult, type ChatMsg } from './agent';
import type { ToolContext } from './agentTools';
import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Unified data layer. Prefers the RoadSense backend (key stays server-side);
// falls back to in-browser Gemini + local state when no backend is present
// (e.g. the Google AI Studio single-app deployment).
// ---------------------------------------------------------------------------

let backendUp: boolean | null = null;

async function probeBackend(): Promise<boolean> {
  if (backendUp !== null) return backendUp;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(t);
    backendUp = r.ok;
  } catch {
    backendUp = false;
  }
  return backendUp;
}

export interface Bootstrap {
  issues: Issue[];
  wards: Ward[];
  contractors: Contractor[];
  geminiLive: boolean;
  mode: 'backend' | 'local';
}

export async function bootstrap(): Promise<Bootstrap> {
  if (await probeBackend()) {
    try {
      const r = await fetch('/api/bootstrap');
      const d = await r.json();
      return { ...d, mode: 'backend' };
    } catch { /* fall through */ }
  }
  return { issues: [...SEED_ISSUES], wards: WARDS, contractors: CONTRACTORS, geminiLive: hasApiKey(), mode: 'local' };
}

export async function analyze(base64: string, mimeType: string): Promise<VisionAnalysis> {
  if (await probeBackend()) {
    try {
      const r = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (r.ok) return r.json();
    } catch { /* fall through */ }
  }
  return analyseImage(base64, mimeType);
}

export interface CreatePayload {
  analysis: VisionAnalysis;
  imageDataUrl: string;
  ward: string;
  wardId: number;
  zone: ZoneType;
  location: string;
  channel: Issue['channel'];
  anonymous: boolean;
}

export async function createIssue(payload: CreatePayload, existing: Issue[]): Promise<Issue> {
  if (await probeBackend()) {
    try {
      const r = await fetch('/api/issues', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) return r.json();
    } catch { /* fall through */ }
  }
  return buildIssueLocal(payload, existing);
}

export async function confirmIssue(issue: Issue): Promise<Issue> {
  if (await probeBackend()) {
    try {
      const r = await fetch(`/api/issues/${issue.id}/confirm`, { method: 'POST' });
      if (r.ok) return r.json();
    } catch { /* fall through */ }
  }
  const confirmations = issue.confirmations + 1;
  const verified = issue.status === 'Reported' && confirmations >= 3;
  return {
    ...issue,
    confirmations,
    status: verified ? 'Verified' : issue.status,
    timeline: verified
      ? [...issue.timeline, { status: 'Verified', label: `Verified by ${confirmations} citizens`, timestamp: 'just now', detail: 'escalated to ward councillor' }]
      : issue.timeline,
  };
}

export async function patchIssue(id: string, patch: Partial<Issue>): Promise<void> {
  if (await probeBackend()) {
    try {
      await fetch(`/api/issues/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch { /* ignore — local store already updated */ }
  }
}

export interface AuditResult {
  verdict: { repaired: boolean; confidence: number; note: string };
  issue: Issue;
}

export async function auditRepair(
  issue: Issue, beforeB64: string, afterB64: string, mimeType: string, afterDataUrl: string
): Promise<AuditResult> {
  if (await probeBackend()) {
    try {
      const r = await fetch(`/api/issues/${issue.id}/audit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beforeBase64: beforeB64, afterBase64: afterB64, mimeType, afterDataUrl }),
      });
      if (r.ok) return r.json();
    } catch { /* fall through */ }
  }
  const verdict = await validateRepair(beforeB64, afterB64, mimeType);
  const updated: Issue = verdict.repaired
    ? {
        ...issue,
        status: 'Resolved',
        afterImageUrl: afterDataUrl,
        timeline: [...issue.timeline,
          { status: 'In Progress', label: 'Crew on site · before-photo logged', timestamp: 'earlier', detail: 'geo-stamped' },
          { status: 'Resolved', label: `Repair validated by Audit Agent (${verdict.confidence}%)`, timestamp: 'just now', detail: verdict.note },
        ],
      }
    : issue;
  return { verdict, issue: updated };
}

// --- Civic Copilot agent ----------------------------------------------------
export async function agent(history: ChatMsg[], clientCtx?: ToolContext): Promise<AgentResult> {
  if (await probeBackend()) {
    try {
      const r = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history }),
      });
      if (r.ok) return r.json();
    } catch { /* fall through */ }
  }
  if (clientCtx && hasApiKey()) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
    return runAgent(ai, history, clientCtx);
  }
  return {
    reply: "I'm the Civic Copilot. I'm running without a connected agent backend or Gemini key right now, so I can't take live actions. Connect the backend (npm run dev:all) to see me file reports, dispatch crews and search civic data autonomously.",
    steps: [], sources: [],
  };
}

// --- local mirror of the server's create logic -----------------------------
function buildIssueLocal(p: CreatePayload, existing: Issue[]): Issue {
  const dupes = existing.filter(
    (i) => i.ward === p.ward && i.damageType === p.analysis.damageType && i.status !== 'Resolved'
  ).length;
  const confirmations = dupes + 1;
  const trafficScore = 40 + Math.round(Math.random() * 55);
  const rainRisk7d = 25 + Math.round(Math.random() * 60);
  const impact = computeImpact({
    severity: p.analysis.severity, depthCm: p.analysis.estimatedDepthCm, trafficScore, zone: p.zone, rainRisk7d,
  });
  const verified = confirmations >= 3;
  const timeline: TimelineEvent[] = [
    { status: 'Reported', label: 'Issue reported', timestamp: 'just now', detail: `via ${p.channel}` },
  ];
  if (verified) timeline.push({ status: 'Verified', label: `Auto-verified · ${confirmations} citizen reports`, timestamp: 'just now', detail: 'escalated to ward councillor' });
  return {
    id: nextId(),
    imageUrl: p.imageDataUrl,
    damageType: p.analysis.damageType,
    severity: p.analysis.severity,
    status: verified ? 'Verified' : 'Reported',
    ward: p.ward, wardId: p.wardId, location: p.location,
    lat: 12.94 + Math.random() * 0.1, lng: 77.5 + Math.random() * 0.18,
    zone: p.zone, trafficScore, rainRisk7d, confirmations,
    reportedAt: 'just now', analysis: p.analysis, impact,
    slaHours: slaHoursForImpact(impact.total), ageHours: 0,
    anonymous: p.anonymous, channel: p.channel, contractor: 'Namma Civil Crew',
    timeline,
  };
}
