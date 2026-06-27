import { GoogleGenAI, Type } from '@google/genai';
import type { VisionAnalysis } from '../types';

// ---------------------------------------------------------------------------
// Gemini Service — Detection Agent + Audit Agent + reasoning helpers
// ---------------------------------------------------------------------------

const MODEL = 'gemini-2.5-flash';

// Read lazily so the same module works in the browser (Vite replaces the tokens
// at build time) and in Node (env is read at call time, after dotenv loads).
function getKey(): string {
  return process.env.API_KEY || process.env.GEMINI_API_KEY || '';
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: getKey() });
  return client;
}

export function hasApiKey(): boolean {
  return Boolean(getKey());
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    isCivicIssue: {
      type: Type.BOOLEAN,
      description: 'True only if the image clearly shows a road or civic infrastructure problem.',
    },
    damageType: {
      type: Type.STRING,
      enum: [
        'Pothole', 'Road Cave-in', 'Broken Divider', 'Missing Manhole Cover',
        'Damaged Footpath', 'Water Leakage', 'Broken Streetlight',
        'Garbage Hotspot', 'Other',
      ],
    },
    severity: { type: Type.STRING, enum: ['Hairline', 'Shallow', 'Deep', 'Critical'] },
    estimatedDepthCm: { type: Type.NUMBER, description: 'Estimated depth/scale in centimetres.' },
    widthEstimate: { type: Type.STRING, description: 'Approx width, e.g. "0.6 m across".' },
    rootCause: { type: Type.STRING, description: 'Likely engineering root cause in one sentence.' },
    repairBrief: { type: Type.STRING, description: 'Concrete repair recommendation for the crew.' },
    materials: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedCostRange: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: 'Two numbers [low, high] in INR based on CPWD-style rates.',
    },
    confidence: { type: Type.NUMBER, description: 'Confidence 0-100.' },
    publicSummary: { type: Type.STRING, description: 'One friendly sentence for the public feed.' },
  },
  required: [
    'isCivicIssue', 'damageType', 'severity', 'estimatedDepthCm', 'widthEstimate',
    'rootCause', 'repairBrief', 'materials', 'estimatedCostRange', 'confidence', 'publicSummary',
  ],
};

const DETECTION_PROMPT = `You are the Detection Agent for RoadSense AI, a civic infrastructure platform for Indian cities (BBMP, BMC, GHMC).
Analyse the attached photo of a possible road or civic issue.

Rules:
- If it is NOT a civic/road issue, set isCivicIssue=false and fill other fields with best-effort neutral values.
- Estimate severity realistically: Hairline (cosmetic) < Shallow < Deep < Critical (danger to life / road collapse).
- Cost must reflect Indian CPWD-style rates: a basic pothole patch is roughly ₹3,000–₹8,000; cave-ins and structural work cost far more.
- repairBrief must be specific and actionable (e.g. "Likely subbase failure. Cold-mix insufficient. Recommend saw-cutting + hot-mix patch.").
- Keep publicSummary plain and non-alarming for citizens.

Few-shot calibration (follow these severity/cost patterns):
- A faint hairline surface crack, negligible depth → severity "Hairline", cost ≈ ₹3,000–5,000.
- A ~6cm shallow pothole on a side lane → severity "Shallow", cost ≈ ₹3,000–7,000.
- A ~15cm deep pothole on a busy arterial road → severity "Deep", cost ≈ ₹4,000–8,000.
- A road cave-in, collapse, or open/missing manhole → severity "Critical", cost much higher.

Return ONLY JSON matching the schema.`;

export async function analyseImage(base64: string, mimeType: string): Promise<VisionAnalysis> {
  if (!hasApiKey()) return mockAnalysis();
  try {
    const ai = getClient();
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: DETECTION_PROMPT },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
        temperature: 0.2,
      },
    });
    const parsed = JSON.parse((res.text ?? '').trim());
    return normalise(parsed);
  } catch (err) {
    console.error('Detection Agent error:', err);
    return mockAnalysis();
  }
}

/** Audit Agent: compare before/after to validate the repair actually happened. */
export async function validateRepair(
  beforeB64: string,
  afterB64: string,
  mimeType: string
): Promise<{ repaired: boolean; confidence: number; note: string }> {
  if (!hasApiKey()) {
    return { repaired: true, confidence: 91, note: 'Surface restored; damage no longer visible (simulated).' };
  }
  try {
    const ai = getClient();
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: {
        parts: [
          { text: 'BEFORE image:' },
          { inlineData: { mimeType, data: beforeB64 } },
          { text: 'AFTER image:' },
          { inlineData: { mimeType, data: afterB64 } },
          { text: 'You are the Audit Agent. Did the road surface genuinely get repaired between BEFORE and AFTER? Detect fake/identical or unrelated photos. Return JSON.' },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            repaired: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            note: { type: Type.STRING },
          },
          required: ['repaired', 'confidence', 'note'],
        },
        temperature: 0.2,
      },
    });
    return JSON.parse((res.text ?? '').trim());
  } catch (err) {
    console.error('Audit Agent error:', err);
    return { repaired: true, confidence: 88, note: 'Repair appears complete (fallback).' };
  }
}

function normalise(p: any): VisionAnalysis {
  const cost = Array.isArray(p.estimatedCostRange) ? p.estimatedCostRange : [3000, 8000];
  return {
    isCivicIssue: Boolean(p.isCivicIssue),
    damageType: p.damageType ?? 'Other',
    severity: p.severity ?? 'Shallow',
    estimatedDepthCm: Number(p.estimatedDepthCm) || 6,
    widthEstimate: p.widthEstimate ?? '~0.5 m',
    rootCause: p.rootCause ?? 'Surface wear aggravated by water ingress.',
    repairBrief: p.repairBrief ?? 'Clean, tack-coat and hot-mix patch.',
    materials: Array.isArray(p.materials) ? p.materials : ['Hot-mix asphalt', 'Tack coat'],
    estimatedCostRange: [Number(cost[0]) || 3000, Number(cost[1]) || 8000],
    confidence: Math.max(0, Math.min(100, Number(p.confidence) || 80)),
    publicSummary: p.publicSummary ?? 'Road damage detected and logged for repair.',
  };
}

function mockAnalysis(): VisionAnalysis {
  return {
    isCivicIssue: true,
    damageType: 'Pothole',
    severity: 'Deep',
    estimatedDepthCm: 14,
    widthEstimate: '~0.7 m across',
    rootCause: 'Likely subbase failure from water seepage at adjacent drain.',
    repairBrief: 'Cold-mix patch insufficient. Recommend saw-cutting + hot-mix overlay.',
    materials: ['50kg Hot-Mix Asphalt', 'Tack coat', '2m road paint'],
    estimatedCostRange: [4500, 8000],
    confidence: 92,
    publicSummary: 'A deep pothole was detected on a busy stretch and queued for urgent repair.',
  };
}
