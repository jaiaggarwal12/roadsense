import React, { useRef, useState } from 'react';
import { useStore } from '../App';
import * as api from '../services/api';
import type { AgentStep, Issue, VisionAnalysis, ZoneType } from '../types';
import { estimateCostLabel } from '../services/impactEngine';
import { FactorBar, ImpactBadge, readImage, ScoreRing, SeverityTag } from './ui';

const ZONES: ZoneType[] = [
  'School Zone', 'Hospital Zone', 'Expressway', 'Bridge Approach', 'Arterial Road', 'Residential Lane', 'Market',
];

const PIPELINE: { agent: AgentStep['agent']; title: string }[] = [
  { agent: 'Detection', title: 'Gemini Vision analysing image' },
  { agent: 'Deduplication', title: 'Clustering nearby reports (100m)' },
  { agent: 'Prioritisation', title: 'Computing weighted Impact Score' },
  { agent: 'Dispatch', title: 'Matching contractor + work order' },
];

export default function ReportFlow() {
  const { addIssue, go, open, issues, geminiLive } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [img, setImg] = useState<{ base64: string; dataUrl: string; mimeType: string } | null>(null);
  const [ward, setWard] = useState('Jnanabharathi');
  const [zone, setZone] = useState<ZoneType>('Arterial Road');
  const [location, setLocation] = useState('Outer Ring Rd near School Junction');
  const [channel, setChannel] = useState<Issue['channel']>('App');
  const [anonymous, setAnonymous] = useState(false);

  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [created, setCreated] = useState<Issue | null>(null);

  const wardIdMap: Record<string, number> = {
    Horamavu: 24, Thanisandra: 25, Jnanabharathi: 45, Bellandur: 112,
  };

  async function pickFile(file?: File) {
    if (!file) return;
    const r = await readImage(file);
    setImg(r);
    setAnalysis(null);
    setCreated(null);
    setSteps([]);
  }

  function setStep(idx: number, status: AgentStep['status'], detail?: string) {
    setSteps((p) => p.map((s, i) => (i === idx ? { ...s, status, detail } : s)));
  }

  async function runPipeline() {
    if (!img) return;
    setBusy(true);
    setCreated(null);
    const init: AgentStep[] = PIPELINE.map((p) => ({ agent: p.agent, title: p.title, status: 'pending' }));
    setSteps(init);

    // 1. Detection Agent (Gemini Vision — via secured backend or in-browser).
    setStep(0, 'running');
    const result = await api.analyze(img.base64, img.mimeType);
    setAnalysis(result);
    if (!result.isCivicIssue) {
      setStep(0, 'done', 'No civic issue detected in this image');
      setBusy(false);
      return;
    }
    setStep(0, 'done', `${result.severity} ${result.damageType} · ${result.confidence}% confidence`);

    // 2. Dedup Agent → 3. Prioritisation → 4. Dispatch all run on create.
    setStep(1, 'running');
    await wait(450);
    const issue = await api.createIssue(
      {
        analysis: result,
        imageDataUrl: img.dataUrl,
        ward,
        wardId: wardIdMap[ward] ?? 45,
        zone,
        location,
        channel,
        anonymous,
      },
      issues
    );
    const dupes = Math.max(0, issue.confirmations - 1);
    setStep(1, 'done', dupes > 0 ? `Merged ${dupes} duplicate report(s) nearby` : 'No duplicates — new issue');

    setStep(2, 'running');
    await wait(500);
    setStep(2, 'done', `Impact Score ${issue.impact.total}/100`);

    setStep(3, 'running');
    await wait(500);
    setStep(3, 'done', `Assigned crew: ${issue.contractor ?? 'nearest available'}`);

    addIssue(issue);
    setCreated(issue);
    setBusy(false);
  }

  return (
    <div className="container section">
      <span className="eyebrow">Citizen reporting</span>
      <h2 className="mt-8" style={{ fontSize: 30 }}>Report a road or civic issue</h2>
      <p className="muted mt-8">Upload a photo. Gemini does the rest — classification, severity, cost and dispatch.</p>

      {!geminiLive && (
        <div className="banner warn mt-16">
          ⚠️ Gemini not connected — running in demo mode with a realistic simulated analysis.
        </div>
      )}

      <div className="report-grid mt-24">
        {/* LEFT: capture + form */}
        <div className="card card-pad">
          <input
            ref={fileRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => pickFile(e.target.files?.[0] ?? undefined)}
          />
          <div className={`dropzone ${img ? 'has-img' : ''}`} onClick={() => fileRef.current?.click()}>
            {img ? (
              <img className="preview-img" src={img.dataUrl} alt="preview" />
            ) : (
              <>
                <div style={{ fontSize: 40 }}>📷</div>
                <p style={{ fontWeight: 700, marginTop: 8 }}>Tap to capture or upload</p>
                <p className="tiny mt-8">JPG / PNG · auto GPS-tagged · works offline</p>
              </>
            )}
          </div>
          {img && <button className="btn btn-ghost btn-sm mt-16" onClick={() => fileRef.current?.click()}>Change photo</button>}

          <div className="mt-24">
            <div className="field">
              <label>Ward</label>
              <select className="input" value={ward} onChange={(e) => setWard(e.target.value)}>
                {Object.keys(wardIdMap).map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Zone type</label>
                <select className="input" value={zone} onChange={(e) => setZone(e.target.value as ZoneType)}>
                  {ZONES.map((z) => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Channel</label>
                <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as Issue['channel'])}>
                  <option>App</option><option>WhatsApp</option><option>Web</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Location / landmark</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <label className="flex center gap-8 tiny" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              Report anonymously
            </label>
          </div>

          <button className="btn btn-primary mt-24" style={{ width: '100%' }} disabled={!img || busy} onClick={runPipeline}>
            {busy ? <><span className="spinner" /> Running agent pipeline…</> : '⚡ Analyse & dispatch'}
          </button>
        </div>

        {/* RIGHT: pipeline + result */}
        <div>
          {steps.length === 0 && !analysis && (
            <div className="card card-pad text-c" style={{ color: 'var(--text-3)' }}>
              <div style={{ fontSize: 38 }}>🤖</div>
              <p className="mt-16">The six-agent pipeline runs here once you analyse a photo.</p>
            </div>
          )}

          {steps.length > 0 && (
            <div className="card card-pad">
              <strong style={{ fontFamily: 'Sora' }}>Agent pipeline</strong>
              <div className="mt-16" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {steps.map((s) => (
                  <div className={`agent-node ${s.status}`} key={s.agent} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12 }}>
                    <div className="a-ico" style={{ width: 32, height: 32, fontSize: 14 }}>
                      {s.status === 'done' ? '✓' : s.status === 'running' ? <span className="spinner dark" /> : '·'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.agent} Agent</div>
                      <div className="tiny">{s.detail ?? s.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis && !analysis.isCivicIssue && (
            <div className="banner warn mt-16">
              🤔 Gemini didn't detect a clear road/civic issue in this image. Try a clearer photo of the damage.
            </div>
          )}

          {analysis && analysis.isCivicIssue && created && (
            <div className="card card-pad mt-16">
              <div className="flex between center wrap gap-12">
                <div>
                  <span className="tiny">Detected</span>
                  <h3 style={{ fontSize: 20 }}>{analysis.damageType}</h3>
                  <div className="flex gap-8 mt-8"><SeverityTag severity={analysis.severity} /><ImpactBadge total={created.impact.total} /></div>
                </div>
                <ScoreRing value={created.impact.total} size={120} />
              </div>

              <div className="grid-2 mt-24">
                <div>
                  <FactorBar label="Physical severity · 35%" value={created.impact.physicalSeverity} color="#ef4444" />
                  <FactorBar label="Traffic volume · 30%" value={created.impact.trafficVolume} color="#f59e0b" />
                  <FactorBar label="Zone risk · 20%" value={created.impact.zoneRisk} color="#38bdf8" />
                  <FactorBar label="Rain vulnerability · 15%" value={created.impact.rainVulnerability} color="#818cf8" />
                </div>
                <div>
                  <div className="kv"><span className="k">Est. depth</span><span className="v">{analysis.estimatedDepthCm} cm</span></div>
                  <div className="kv"><span className="k">Width</span><span className="v">{analysis.widthEstimate}</span></div>
                  <div className="kv"><span className="k">Est. cost</span><span className="v">{estimateCostLabel(analysis)}</span></div>
                  <div className="kv"><span className="k">SLA target</span><span className="v">{created.slaHours} h</span></div>
                  <div className="kv"><span className="k">Confidence</span><span className="v">{analysis.confidence}%</span></div>
                </div>
              </div>

              <div className="mt-16" style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--border-soft)' }}>
                <div className="tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI repair brief</div>
                <p className="mt-8" style={{ fontSize: 14 }}>{analysis.repairBrief}</p>
                <p className="tiny mt-8"><strong>Root cause:</strong> {analysis.rootCause}</p>
                <div className="flex gap-8 wrap mt-8">
                  {analysis.materials.map((m) => <span className="chip" key={m}>{m}</span>)}
                </div>
              </div>

              <div className="flex gap-12 mt-24 wrap">
                <button className="btn btn-primary" onClick={() => open(created)}>View issue {created.id} →</button>
                <button className="btn btn-ghost" onClick={() => go('government')}>Open Gov dashboard</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
