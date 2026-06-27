import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../App';
import * as api from '../services/api';
import { estimateCostLabel } from '../services/impactEngine';
import { ImpactBadge, readImage, SeverityTag } from './ui';
import type { Issue } from '../types';

export default function CrewApp() {
  const { issues, updateIssue, open } = useStore();
  const jobs = useMemo(
    () => issues.filter((i) => ['Verified', 'Work Order', 'In Progress'].includes(i.status))
      .sort((a, b) => b.impact.total - a.impact.total),
    [issues]
  );
  const [selId, setSelId] = useState<string | null>(null);
  const sel = jobs.find((j) => j.id === selId) ?? jobs[0] ?? null;

  return (
    <div className="container section">
      <span className="eyebrow">Crew mobile app · field ops</span>
      <h2 className="mt-8" style={{ fontSize: 30 }}>Today's assigned jobs</h2>
      <p className="muted mt-8">GPS navigation, AI repair brief, and tamper-proof before/after photo capture.</p>

      <div className="crew-wrap mt-24">
        <div className="card card-pad">
          <div className="flex between center"><strong style={{ fontFamily: 'Sora' }}>Job list</strong><span className="tiny">{jobs.length} jobs</span></div>
          <div className="mt-16">
            {jobs.map((j) => (
              <div className={`job-card ${sel?.id === j.id ? 'sel' : ''}`} key={j.id} onClick={() => setSelId(j.id)}>
                <div className="flex between center">
                  <strong style={{ fontSize: 14 }}>{j.damageType}</strong>
                  <ImpactBadge total={j.impact.total} />
                </div>
                <div className="tiny" style={{ marginTop: 4 }}>{j.location}</div>
                <div className="tiny" style={{ marginTop: 4 }}>📍 {j.lat.toFixed(3)}, {j.lng.toFixed(3)} · {j.ward}</div>
              </div>
            ))}
            {jobs.length === 0 && <p className="muted text-c" style={{ padding: 20 }}>No active jobs.</p>}
          </div>
        </div>

        {sel ? <JobDetail key={sel.id} job={sel} updateIssue={updateIssue} open={open} /> : (
          <div className="card card-pad text-c muted">Select a job to begin.</div>
        )}
      </div>
    </div>
  );
}

function JobDetail({ job, updateIssue, open }: { job: Issue; updateIssue: (id: string, p: Partial<Issue>, persist?: boolean) => void; open: (i: Issue) => void }) {
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const [before, setBefore] = useState<{ base64: string; dataUrl: string; mimeType: string } | null>(null);
  const [after, setAfter] = useState<{ base64: string; dataUrl: string; mimeType: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [verdict, setVerdict] = useState<{ repaired: boolean; confidence: number; note: string } | null>(null);

  async function startWork() {
    if (!before) return;
    updateIssue(job.id, {
      status: 'In Progress',
      timeline: [...job.timeline, { status: 'In Progress', label: 'Crew on site · before-photo logged', timestamp: 'just now', detail: 'geo-stamped' }],
    });
  }

  async function closeJob() {
    if (!before || !after) return;
    setValidating(true);
    const { verdict: v, issue: updated } = await api.auditRepair(job, before.base64, after.base64, after.mimeType, after.dataUrl);
    setVerdict(v);
    setValidating(false);
    if (v.repaired) {
      // Backend already persisted; mirror into local store without re-persisting.
      updateIssue(job.id, {
        status: updated.status,
        afterImageUrl: updated.afterImageUrl,
        timeline: updated.timeline,
      }, false);
    }
  }

  const resolved = verdict?.repaired || job.status === 'Resolved';

  return (
    <div className="card card-pad">
      <div className="flex between center wrap gap-12">
        <div>
          <span className="tiny">Job {job.id}</span>
          <h3 style={{ fontSize: 20 }}>{job.damageType} · {job.ward}</h3>
          <div className="flex gap-8 mt-8 wrap"><SeverityTag severity={job.severity} /><ImpactBadge total={job.impact.total} /></div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => open(job)}>Full record →</button>
      </div>

      <div className="mt-16" style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--border-soft)' }}>
        <div className="flex between"><span className="tiny">📍 Navigate to</span><span className="tiny">{job.lat.toFixed(4)}, {job.lng.toFixed(4)}</span></div>
        <p style={{ fontWeight: 600, marginTop: 4 }}>{job.location}</p>
        <a className="btn btn-ghost btn-sm mt-8" target="_blank" rel="noreferrer"
           href={`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`}>
          Open in Google Maps ↗
        </a>
      </div>

      <div className="mt-16" style={{ padding: 14, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--border-soft)' }}>
        <div className="tiny" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI repair brief</div>
        <p className="mt-8" style={{ fontSize: 14 }}>{job.analysis.repairBrief}</p>
        <div className="flex gap-8 wrap mt-8">{job.analysis.materials.map((m) => <span className="chip" key={m}>{m}</span>)}</div>
        <p className="tiny mt-8">Est. materials/cost: {estimateCostLabel(job.analysis)}</p>
      </div>

      <div className="grid-2 mt-24">
        <div>
          <label className="tiny" style={{ fontWeight: 600 }}>Before photo (required)</label>
          <input ref={beforeRef} type="file" accept="image/*" capture="environment" hidden
                 onChange={async (e) => { const f = e.target.files?.[0]; if (f) setBefore(await readImage(f)); }} />
          <div className={`photo-slot mt-8 ${before ? 'filled' : ''}`} onClick={() => beforeRef.current?.click()}>
            {before ? <img src={before.dataUrl} alt="before" /> : <div><div style={{ fontSize: 26 }}>📸</div><p className="tiny mt-8">Capture before</p></div>}
          </div>
        </div>
        <div>
          <label className="tiny" style={{ fontWeight: 600 }}>After photo (to close)</label>
          <input ref={afterRef} type="file" accept="image/*" capture="environment" hidden
                 onChange={async (e) => { const f = e.target.files?.[0]; if (f) setAfter(await readImage(f)); }} />
          <div className={`photo-slot mt-8 ${after ? 'filled' : ''}`} onClick={() => afterRef.current?.click()}>
            {after ? <img src={after.dataUrl} alt="after" /> : <div><div style={{ fontSize: 26 }}>✅</div><p className="tiny mt-8">Capture after</p></div>}
          </div>
        </div>
      </div>

      {verdict && (
        <div className={`banner ${verdict.repaired ? '' : 'warn'} mt-16`}
             style={verdict.repaired ? { background: 'rgba(34,197,94,0.1)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' } : {}}>
          {verdict.repaired ? '✅' : '⚠️'} Audit Agent · {verdict.confidence}% — {verdict.note}
        </div>
      )}

      <div className="flex gap-12 mt-24 wrap">
        {job.status !== 'In Progress' && !resolved && (
          <button className="btn btn-ghost" disabled={!before} onClick={startWork}>Log before-photo & start</button>
        )}
        {!resolved && (
          <button className="btn btn-primary" disabled={!before || !after || validating} onClick={closeJob}>
            {validating ? <><span className="spinner" /> Validating repair…</> : '✅ Close job (AI audit)'}
          </button>
        )}
        {resolved && <span className="tag" style={{ color: 'var(--ok)', background: 'rgba(34,197,94,0.15)' }}>Job resolved & audited</span>}
      </div>
    </div>
  );
}
