import React, { useMemo, useState } from 'react';
import { useStore } from '../App';
import { WARDS } from '../data/seed';
import { estimateCostLabel } from '../services/impactEngine';
import { ImpactBadge, StatusTag } from './ui';
import type { Issue } from '../types';

export default function GovernmentDashboard() {
  const { issues, open } = useStore();
  const [wardFilter, setWardFilter] = useState<string>('All');

  const ranked = useMemo(() => {
    const base = wardFilter === 'All' ? issues : issues.filter((i) => i.ward === wardFilter);
    return [...base]
      .filter((i) => i.status !== 'Resolved')
      .sort((a, b) => b.impact.total - a.impact.total);
  }, [issues, wardFilter]);

  const open_ = issues.filter((i) => i.status !== 'Resolved');
  const critical = open_.filter((i) => i.impact.total >= 85).length;
  const breaching = open_.filter((i) => i.ageHours > i.slaHours * 0.8).length;
  const resolved = issues.filter((i) => i.status === 'Resolved').length;

  const density = useMemo(() => {
    const m = new Map<string, number>();
    open_.forEach((i) => m.set(i.ward, (m.get(i.ward) ?? 0) + 1));
    const max = Math.max(1, ...m.values());
    return WARDS.map((w) => ({ name: w.name, count: m.get(w.name) ?? 0, pct: ((m.get(w.name) ?? 0) / max) * 100 }))
      .sort((a, b) => b.count - a.count);
  }, [open_]);

  return (
    <div className="container section">
      <div className="dash-head">
        <div>
          <span className="eyebrow">Government console · BBMP</span>
          <h2 className="mt-8" style={{ fontSize: 30 }}>Ranked work queue</h2>
          <p className="muted mt-8">No raw inbox — issues are auto-prioritised by Impact Score and SLA risk.</p>
        </div>
        <select className="input" style={{ width: 200 }} value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
          <option>All</option>
          {WARDS.map((w) => <option key={w.id}>{w.name}</option>)}
        </select>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="k-num">{open_.length}</div>
          <div className="k-lbl">Open issues</div>
          <div className="k-sub muted">across {WARDS.length} wards</div>
        </div>
        <div className="kpi">
          <div className="k-num" style={{ color: 'var(--danger)' }}>{critical}</div>
          <div className="k-lbl">Critical (Impact ≥ 85)</div>
          <div className="k-sub" style={{ color: 'var(--danger)' }}>life-safety priority</div>
        </div>
        <div className="kpi">
          <div className="k-num" style={{ color: 'var(--accent)' }}>{breaching}</div>
          <div className="k-lbl">SLA at risk</div>
          <div className="k-sub" style={{ color: 'var(--accent)' }}>{'>'} 80% of clock elapsed</div>
        </div>
        <div className="kpi">
          <div className="k-num" style={{ color: 'var(--ok)' }}>{resolved}</div>
          <div className="k-lbl">Resolved & audited</div>
          <div className="k-sub muted">verified by Audit Agent</div>
        </div>
      </div>

      <div className="dash-cols">
        <div className="card card-pad">
          <div className="flex between center">
            <strong style={{ fontFamily: 'Sora' }}>Top priority issues</strong>
            <span className="tiny">{ranked.length} open</span>
          </div>
          <div className="mt-16">
            {ranked.map((i, idx) => (
              <div className="queue-item" key={i.id} onClick={() => open(i)}>
                <div className="queue-rank" style={{ color: idx < 3 ? 'var(--brand)' : 'var(--text-2)' }}>#{idx + 1}</div>
                <img className="queue-thumb" src={i.imageUrl} alt={i.damageType} />
                <div style={{ minWidth: 0 }}>
                  <div className="flex gap-8 center wrap"><strong style={{ fontSize: 14.5 }}>{i.damageType}</strong><StatusTag status={i.status} /></div>
                  <div className="tiny" style={{ marginTop: 3 }}>{i.location} · {i.ward}</div>
                  <div className="flex gap-8 mt-8 wrap">
                    <span className="tiny">👥 {i.confirmations}</span>
                    <span className="tiny">💰 {estimateCostLabel(i.analysis)}</span>
                    <SlaPill issue={i} />
                  </div>
                </div>
                <div className="text-c"><ImpactBadge total={i.impact.total} /></div>
              </div>
            ))}
            {ranked.length === 0 && <p className="muted text-c" style={{ padding: 30 }}>No open issues in this ward 🎉</p>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card-pad">
            <strong style={{ fontFamily: 'Sora' }}>Complaint density heat-map</strong>
            <div className="mt-16">
              {density.map((d) => (
                <div className="heat-ward" key={d.name}>
                  <span style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{d.name}</span>
                  <div className="heat-track"><span style={{ width: `${d.pct}%` }} /></div>
                  <span className="tiny" style={{ width: 28, textAlign: 'right' }}>{d.count}</span>
                </div>
              ))}
            </div>
            <p className="tiny mt-16">Powered by Maps Platform ward boundaries + live report geotags.</p>
          </div>

          <div className="card card-pad">
            <strong style={{ fontFamily: 'Sora' }}>Ward performance</strong>
            <div className="mt-16">
              {WARDS.map((w) => (
                <div className="kv" key={w.id}>
                  <span className="k">Ward {w.id} · {w.name}</span>
                  <span className="v" style={{ color: w.resolutionRate >= 0.6 ? 'var(--ok)' : 'var(--accent)' }}>
                    {Math.round(w.resolutionRate * 100)}% · {w.avgResponseDays}d avg
                  </span>
                </div>
              ))}
            </div>
            <p className="tiny mt-16">Trends from BigQuery — used for annual ward scorecards.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlaPill({ issue }: { issue: Issue }) {
  const ratio = issue.ageHours / issue.slaHours;
  const overdue = ratio >= 1;
  const risk = ratio >= 0.8;
  const c = overdue ? 'var(--danger)' : risk ? 'var(--accent)' : 'var(--text-3)';
  const remaining = Math.max(0, issue.slaHours - issue.ageHours);
  return (
    <span className="tiny" style={{ color: c, fontWeight: 600 }}>
      ⏱️ {overdue ? 'SLA breached' : `${remaining}h to SLA`}
    </span>
  );
}
