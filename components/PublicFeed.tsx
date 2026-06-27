import React, { useMemo, useState } from 'react';
import { useStore } from '../App';
import * as api from '../services/api';
import { CONTRACTORS, WARDS } from '../data/seed';
import { ImpactBadge, StatusTag } from './ui';
import type { Issue } from '../types';

export default function PublicFeed() {
  const { issues, open, updateIssue } = useStore();
  const [tab, setTab] = useState<'feed' | 'wards' | 'contractors'>('feed');

  const sorted = useMemo(() => [...issues].sort((a, b) => b.impact.total - a.impact.total), [issues]);

  async function confirm(i: Issue) {
    const updated = await api.confirmIssue(i);
    updateIssue(i.id, {
      confirmations: updated.confirmations,
      status: updated.status,
      timeline: updated.timeline,
    }, false);
  }

  return (
    <div className="container section">
      <span className="eyebrow">Public accountability</span>
      <h2 className="mt-8" style={{ fontSize: 30 }}>Every issue is a public thread</h2>
      <p className="muted mt-8">Transparency by default — confirm issues near you and watch wards & contractors get scored.</p>

      <div className="flex gap-8 mt-24 wrap">
        {(['feed', 'wards', 'contractors'] as const).map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
            {t === 'feed' ? 'Live feed' : t === 'wards' ? 'Ward scorecards' : 'Contractor ratings'}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {sorted.map((i) => (
            <div className="card" key={i.id}>
              <img src={i.afterImageUrl ?? i.imageUrl} alt={i.damageType} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: '18px 18px 0 0' }} />
              <div className="card-pad">
                <div className="flex between center wrap gap-8">
                  <strong>{i.damageType}</strong>
                  <StatusTag status={i.status} />
                </div>
                <div className="tiny" style={{ marginTop: 4 }}>{i.location} · {i.ward} · {i.reportedAt}</div>
                <div className="flex between center mt-16 wrap gap-8">
                  <ImpactBadge total={i.impact.total} />
                  <span className="tiny">👥 {i.confirmations} confirmed</span>
                </div>
                <div className="flex gap-8 mt-16 wrap">
                  <button className="btn btn-ghost btn-sm" onClick={() => open(i)}>View thread</button>
                  {i.status !== 'Resolved' && (
                    <button className="btn btn-primary btn-sm" onClick={() => confirm(i)}>👍 Confirm near me</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'wards' && (
        <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {WARDS.map((w) => {
            const live = issues.filter((i) => i.ward === w.name);
            const openCount = live.filter((i) => i.status !== 'Resolved').length;
            return (
              <div className="card card-pad" key={w.id}>
                <div className="flex between center"><strong style={{ fontFamily: 'Sora' }}>Ward {w.id}</strong>
                  <span className="tag" style={{ color: w.resolutionRate >= 0.6 ? 'var(--ok)' : 'var(--accent)', background: w.resolutionRate >= 0.6 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }}>
                    {Math.round(w.resolutionRate * 100)}%
                  </span>
                </div>
                <h4 style={{ fontSize: 18, marginTop: 4 }}>{w.name}</h4>
                <div className="kv mt-16"><span className="k">Avg response</span><span className="v">{w.avgResponseDays} days</span></div>
                <div className="kv"><span className="k">Open now</span><span className="v">{openCount}</span></div>
                <div className="kv"><span className="k">Resolved / month</span><span className="v">{w.resolvedThisMonth}</span></div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'contractors' && (
        <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {CONTRACTORS.map((c) => (
            <div className="card card-pad" key={c.id}>
              <div className="flex between center wrap gap-8">
                <strong>{c.name}</strong>
                {c.blacklisted
                  ? <span className="tag" style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.15)' }}>⛔ Flagged</span>
                  : <span className="tag" style={{ color: 'var(--ok)', background: 'rgba(34,197,94,0.15)' }}>Active</span>}
              </div>
              <div className="kv mt-16"><span className="k">Jobs completed</span><span className="v">{c.jobsDone}</span></div>
              <div className="kv"><span className="k">Repeat-failure rate</span>
                <span className="v" style={{ color: c.repeatFailureRate > 0.2 ? 'var(--danger)' : 'var(--ok)' }}>{Math.round(c.repeatFailureRate * 100)}%</span>
              </div>
              <div className="kv"><span className="k">Public funds paid</span><span className="v">₹{(c.amountPaid / 10000000).toFixed(2)} Cr</span></div>
              {c.repeatFailureRate > 0.2 && <p className="tiny mt-16" style={{ color: 'var(--danger)' }}>⚠️ {Math.round(c.repeatFailureRate * 100)}% of repairs re-reported within 60 days — auto-flagged by Audit Agent.</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
