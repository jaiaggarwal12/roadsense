import React from 'react';
import { useStore } from '../App';
import { ImpactBadge } from './ui';

const AGENTS = [
  { ico: '🔍', name: 'Detection', desc: 'Gemini Vision classifies type + severity' },
  { ico: '🧬', name: 'Deduplication', desc: 'Clusters reports within 100m' },
  { ico: '📊', name: 'Prioritisation', desc: 'Computes weighted Impact Score' },
  { ico: '🚚', name: 'Dispatch', desc: 'Picks contractor, builds work order' },
  { ico: '⏱️', name: 'Monitoring', desc: 'Runs SLA clock, auto-escalates' },
  { ico: '✅', name: 'Audit', desc: 'Validates before/after repair photos' },
];

const FEATURES = [
  { ico: '📷', t: 'Multimodal reporting', d: 'Photo, video or a WhatsApp message — auto GPS-tagged and instantly understood by Gemini Vision. Works offline on 2G.' },
  { ico: '🎯', t: 'Impact Score, not date', d: 'Every report is ranked by severity, traffic, zone risk and 7-day rain vulnerability — life-threatening damage rises to the top.' },
  { ico: '👥', t: 'Community verification', d: 'Nearby citizens confirm an issue; 3+ confirmations auto-escalate to the ward councillor with a generated brief.' },
  { ico: '🗂️', t: 'One-click work orders', d: 'Government sees a ranked queue, not an inbox. Generate a work order with GPS, materials and cost in two seconds.' },
  { ico: '🛠️', t: 'Crew operations app', d: 'Pinpoint navigation, AI repair brief, mandatory geo-stamped before/after photos that cannot be faked.' },
  { ico: '🏛️', t: 'Public accountability', d: 'A live thread per issue, ward scorecards and contractor performance — political pressure built in.' },
];

export default function Landing() {
  const { go, issues } = useStore();
  const top = [...issues].sort((a, b) => b.impact.total - a.impact.total).slice(0, 3);

  return (
    <div className="container">
      {/* HERO */}
      <section className="hero">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">Civic Intelligence · India</span>
            <h1 className="mt-16">
              Turn scattered complaints into <span className="grad">accountable repairs.</span>
            </h1>
            <p className="lead">
              RoadSense AI is the operational layer between citizens and repair crews. Snap a pothole,
              and a six-agent Gemini pipeline classifies it, scores its impact, dispatches a crew and
              proves the fix — end to end.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary" onClick={() => go('report')}>📷 Report an issue</button>
              <button className="btn btn-ghost" onClick={() => go('government')}>View Gov dashboard →</button>
            </div>
            <div className="badge-row">
              <span className="chip">⚡ Powered by Gemini 2.5</span>
              <span className="chip">🗺️ Maps + Earth Engine</span>
              <span className="chip">💬 WhatsApp-native</span>
              <span className="chip">📴 Offline-first</span>
            </div>
            <div className="stat-grid">
              <div className="stat"><div className="num">3,000+</div><div className="lbl">pothole deaths / year in India</div></div>
              <div className="stat"><div className="num">₹50,000 Cr</div><div className="lbl">annual economic loss</div></div>
              <div className="stat"><div className="num">73,500+</div><div className="lbl">BBMP complaints H1 2025</div></div>
              <div className="stat"><div className="num">58%</div><div className="lbl">road resolution rate today</div></div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="flex between center" style={{ marginBottom: 12 }}>
              <strong style={{ fontFamily: 'Sora' }}>Live priority queue</strong>
              <span className="tiny">auto-ranked by Impact Score</span>
            </div>
            <div className="mini-feed">
              {top.map((i) => (
                <div className="mini-row" key={i.id}>
                  <img src={i.imageUrl} alt={i.damageType} />
                  <div style={{ flex: 1 }}>
                    <div className="t">{i.damageType} · {i.ward}</div>
                    <div className="s">{i.location}</div>
                  </div>
                  <ImpactBadge total={i.impact.total} />
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm mt-16" style={{ width: '100%' }} onClick={() => go('public')}>
              Open public accountability feed →
            </button>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section className="section">
        <span className="eyebrow">Agentic core</span>
        <h2 className="mt-8" style={{ fontSize: 30 }}>A six-agent pipeline, not a complaint box</h2>
        <p className="muted mt-8" style={{ maxWidth: 640 }}>
          Each report flows through autonomous agents orchestrated on Vertex AI Agent Builder — every
          handoff is logged, measurable and accountable.
        </p>
        <div className="pipeline mt-24">
          {AGENTS.map((a) => (
            <div className="agent-node done" key={a.name}>
              <div className="a-ico">{a.ico}</div>
              <div className="a-name">{a.name} Agent</div>
              <div className="a-desc">{a.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" style={{ paddingTop: 0 }}>
        <span className="eyebrow">What makes it different</span>
        <h2 className="mt-8" style={{ fontSize: 30 }}>Built for the way Indian cities actually work</h2>
        <div className="feat-grid mt-24">
          {FEATURES.map((f) => (
            <div className="feat" key={f.t}>
              <div className="f-ico">{f.ico}</div>
              <h4>{f.t}</h4>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
        <div className="card card-pad mt-40 flex between center wrap gap-16" style={{ background: 'linear-gradient(135deg, var(--panel-2), var(--panel))' }}>
          <div>
            <h3 style={{ fontSize: 22 }}>See the full loop in 60 seconds.</h3>
            <p className="muted mt-8">Report → AI triage → work order → crew repair → audited resolution.</p>
          </div>
          <button className="btn btn-primary" onClick={() => go('report')}>Try the live demo →</button>
        </div>
      </section>
    </div>
  );
}
