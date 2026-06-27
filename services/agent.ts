import { GoogleGenAI } from '@google/genai';
import { SYSTEM_INSTRUCTION, executeTool, toolDeclarations, type ToolContext } from './agentTools';

// ---------------------------------------------------------------------------
// Civic Copilot agent loop — multi-step Gemini function calling.
// Isomorphic: runs on the backend (store-backed ctx) or in-browser (fallback).
// ---------------------------------------------------------------------------

const MODEL = 'gemini-2.5-flash';
const MAX_TURNS = 6;

export interface ChatMsg { role: 'user' | 'model'; text: string; }

export interface AgentStepTrace {
  tool: string;
  args: any;
  resultSummary: string;
}

export interface AgentResult {
  reply: string;
  steps: AgentStepTrace[];
  sources: { title: string; uri: string }[];
}

export async function runAgent(
  ai: GoogleGenAI,
  history: ChatMsg[],
  ctx: ToolContext
): Promise<AgentResult> {
  const contents: any[] = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  const steps: AgentStepTrace[] = [];
  const sources: { title: string; uri: string }[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let res;
    try {
      res = await generateWithRetry(ai, contents);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const rateLimited = e?.status === 429 || msg.includes('RESOURCE_EXHAUSTED');
      return {
        reply: rateLimited
          ? "⚠️ The Gemini free-tier rate limit (5 requests/min) was hit. Please wait about a minute and try again — or use a paid API key for unlimited agent runs."
          : `I hit an error talking to Gemini: ${msg.slice(0, 160)}`,
        steps, sources,
      };
    }

    const calls = res.functionCalls ?? [];
    if (!calls.length) {
      return { reply: (res.text ?? '').trim() || 'Done.', steps, sources };
    }

    // Record the model turn that requested the calls.
    const modelParts = calls.map((c) => ({ functionCall: { name: c.name, args: c.args } }));
    contents.push({ role: 'model', parts: modelParts });

    // Execute each requested tool and feed results back.
    const responseParts: any[] = [];
    for (const call of calls) {
      const name = call.name as string;
      const args = call.args ?? {};
      let result: any;
      try {
        result = await executeTool(name, args, ctx);
      } catch (e) {
        result = { error: (e as Error).message };
      }
      if (result?.sources && Array.isArray(result.sources)) {
        for (const s of result.sources) if (s?.uri) sources.push(s);
      }
      steps.push({ tool: name, args, resultSummary: summarise(result) });
      responseParts.push({ functionResponse: { name, response: wrap(result) } });
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  return { reply: 'I ran several steps but hit the reasoning limit — please refine your request.', steps, sources };
}

async function generateWithRetry(ai: GoogleGenAI, contents: any[]) {
  let lastErr: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: toolDeclarations as any }],
          temperature: 0.4,
        },
      });
    } catch (e: any) {
      lastErr = e;
      // Retry once on transient overload (503); bail fast on hard rate limits (429).
      if (e?.status === 503 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function wrap(result: any): Record<string, any> {
  // functionResponse.response must be an object.
  if (result === null || result === undefined) return { result: null };
  if (Array.isArray(result)) return { items: result };
  if (typeof result !== 'object') return { result };
  return result;
}

function summarise(result: any): string {
  try {
    if (result?.error) return `error: ${result.error}`;
    if (Array.isArray(result)) return `${result.length} item(s)`;
    if (result?.items) return `${result.items.length} item(s)`;
    if (result?.id) return `${result.id} · ${result.status ?? ''}`.trim();
    if (result?.answer) return result.answer.slice(0, 80);
    const s = JSON.stringify(result);
    return s.length > 90 ? s.slice(0, 90) + '…' : s;
  } catch {
    return 'ok';
  }
}
