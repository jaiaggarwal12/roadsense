import React from 'react';
import type { Issue } from '../types';
import { estimateCostLabel } from '../services/impactEngine';
import { FactorBar, ImpactBadge, ScoreRing, SeverityTag, StatusTag } from './ui';

export default function IssueModal({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="flex gap-8 center wrap">
            <strong style={{ fontFamily: 'Sora' }}>{issue.id}</strong>
            <StatusTag status={issue.status} />
          </div>
          <button className="x-btn" onClick={onClose}>×</button>
        </div>

        <div className="card-pad">
          {/* image(s) */}
          <div className={issue.afterImageUrl ? 'grid-2' : ''}>
            <div>
              {issue.afterImageUrl && <div className="tiny" style={{ marginBottom: 6 }}>BEFORE</div>}
              <img src={issue.imageUrl} alt="before" style={{ width: '100%', borderRadius: 12, aspectRatio: '3/2', objectFit: 'cover' }} />
            </div>
            {issue.afterImageUrl && (
              <div>
                <div className="tiny" style={{ marginBottom: 6, color: 'var(--ok)' }}>AFTER · audited</div>
                <img src={issue.afterImageUrl} alt="after" style={{ width: '100%', borderRadius: 12, aspectRatio: '3/2', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          <div className="flex between center wrap gap-12 mt-24">
            <div>
              <h3 style={{ fontSize: 22 }}>{issue.damageType}</h3>
              <p className="tiny" style={{ marginTop: 4 }}>{issue.location} · {issue.ward} · {issue.zone}</p>
              <div className="flex gap-8 mt-8 wrap">
                <SeverityTag severity={issue.severity} />
                <ImpactBadge total={issue.impact.total} />
                <span className="chip">{issue.channel}{issue.anonymous ? ' · anon' : ''}</span>
              </div>
            </div>
            <ScoreRing value={issue.impact.total} size={120} />
          </div>

          <div className="grid-2 mt-24">
            <div className="card card-pad">
              <strong style={{ fontSize: 14 }}>Impact breakdown</strong>
              <div className="mt-16">
                <FactorBar label="Physical severity · 35%" value={issue.impact.physicalSeverity} color="#ef4444" />
                <FactorBar label="Traffic volume · 30%" value={issue.impact.trafficVolume} color="#f59e0b" />
                <FactorBar label="Zone risk · 20%" value={issue.impact.zoneRisk} color="#38bdf8" />
                <FactorBar label="Rain vulnerability · 15%" value={issue.impact.rainVulnerability} color="#818cf8" />
              </div>
            </div>
            <div className="card card-pad">
              <strong style={{ fontSize: 14 }}>Assessment</strong>
              <div className="mt-16">
                <div className="kv"><span className="k">Est. depth</span><span className="v">{issue.analysis.estimatedDepthCm} cm</span></div>
                <div className="kv"><span className="k">Width</span><span className="v">{issue.analysis.widthEstimate}</span></div>
                <div className="kv"><span className="k">Est. cost</span><span className="v">{estimateCostLabel(issue.analysis)}</span></div>
                <div className="kv"><span className="k">SLA target</span><span className="v">{issue.slaHours} h</span></div>
                <div className="kv"><span className="k">Confidence</span><span className="v">{issue.analysis.confidence}%</span></div>
                {issue.contractor && <div className="kv"><span className="k">Contractor</span><span className="v">{issue.contractor}</span></div>}
              </div>
            </div>
          </div>

          <div className="card card-pad mt-16">
            <strong style={{ fontSize: 14 }}>AI repair brief</strong>
            <p className="mt-8" style={{ fontSize: 14 }}>{issue.analysis.repairBrief}</p>
            <p className="tiny mt-8"><strong>Root cause:</strong> {issue.analysis.rootCause}</p>
            <div className="flex gap-8 wrap mt-8">{issue.analysis.materials.map((m) => <span className="chip" key={m}>{m}</span>)}</div>
          </div>

          <div className="card card-pad mt-16">
            <strong style={{ fontSize: 14 }}>Resolution timeline</strong>
            <div className="timeline mt-16">
              {issue.timeline.map((t, i) => (
                <div className={`tl-node ${i === issue.timeline.length - 1 ? '' : 'muted-node'}`} key={i}>
                  <div className="tl-label">{t.label}</div>
                  <div className="tl-meta">{t.timestamp}{t.detail ? ` · ${t.detail}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
