import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useStore } from '../App';
import * as api from '../services/api';
import { hasApiKey } from '../services/geminiService';
import { buildClientContext } from '../services/clientAgent';
import type { AgentStepTrace, ChatMsg } from '../services/agent';

interface Msg {
  role: 'user' | 'model';
  text: string;
  steps?: AgentStepTrace[];
  sources?: { title: string; uri: string }[];
}

const SUGGESTIONS = [
  'What are the most critical issues right now?',
  'Report a deep pothole near Bellandur bus stop',
  'Dispatch a crew to the top critical issue',
  "What's the CPWD rate for a pothole patch?",
];

const TOOL_ICON: Record<string, string> = {
  listIssues: '📋', getIssue: '🔎', createReport: '📝', dispatchCrew: '🚚',
  escalateIssue: '⏫', getWardScorecard: '🏛️', searchCivicInfo: '🌐', locationContext: '🗺️', readUrl: '🔗',
};

export default function Copilot() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'model', text: "Hi, I'm the RoadSense Civic Copilot 🤖. I can file reports, find and prioritise issues, dispatch crews, escalate, and look up real civic data with Google Search. What do you need?" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // keep a live ref to issues so the client agent reads fresh state
  const issuesRef = useRef(store.issues);
  issuesRef.current = store.issues;

  const clientCtx = useMemo(() => {
    const ai = hasApiKey() ? new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' }) : null;
    return buildClientContext({
      getIssues: () => issuesRef.current,
      addIssue: store.addIssue,
      updateIssue: store.updateIssue,
      ai,
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy, open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    const next: Msg[] = [...msgs, { role: 'user', text: q }];
    setMsgs(next);
    setBusy(true);
    const history: ChatMsg[] = next.map((m) => ({ role: m.role, text: m.text }));
    try {
      const res = await api.agent(history, clientCtx);
      setMsgs((p) => [...p, { role: 'model', text: res.reply, steps: res.steps, sources: res.sources }]);
    } catch (e) {
      setMsgs((p) => [...p, { role: 'model', text: 'Sorry — I hit an error running that. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={`copilot-fab ${open ? 'hidden' : ''}`} onClick={() => setOpen(true)} aria-label="Open Civic Copilot">
        <span style={{ fontSize: 22 }}>🤖</span>
        <span className="copilot-fab-label">Ask Copilot</span>
      </button>

      {open && (
        <div className="copilot-panel">
          <div className="copilot-head">
            <div className="flex center gap-8">
              <span className="logo-mark" style={{ width: 30, height: 30, fontSize: 14 }}>🤖</span>
              <div>
                <strong style={{ fontFamily: 'Sora', fontSize: 15 }}>Civic Copilot</strong>
                <div className="tiny">Gemini agent · function calling + Search</div>
              </div>
            </div>
            <button className="x-btn" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="copilot-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble-row ${m.role}`}>
                {m.role === 'model' && m.steps && m.steps.length > 0 && (
                  <div className="tool-trace">
                    {m.steps.map((s, j) => (
                      <div className="tool-step" key={j}>
                        <span>{TOOL_ICON[s.tool] ?? '⚙️'}</span>
                        <span className="tool-name">{s.tool}</span>
                        <span className="tool-res">{s.resultSummary}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`bubble ${m.role}`}>{m.text}</div>
                {m.role === 'model' && m.sources && m.sources.length > 0 && (
                  <div className="src-row">
                    {m.sources.map((s, j) => (
                      <a key={j} className="src-chip" href={s.uri} target="_blank" rel="noreferrer">🔗 {trim(s.title)}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="bubble-row model">
                <div className="bubble model flex center gap-8"><span className="spinner dark" /> thinking & calling tools…</div>
              </div>
            )}
          </div>

          {msgs.length <= 1 && (
            <div className="copilot-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggest-chip" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          <form className="copilot-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input
              className="input" placeholder="Ask or instruct the Copilot…"
              value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}

function trim(s: string) {
  return s.length > 26 ? s.slice(0, 26) + '…' : s;
}
