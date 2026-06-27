import React from 'react';
import { useStore } from '../App';

const TECH = [
  { ico: '👁️', name: 'Gemini 2.5 Vision', use: 'Classifies damage type & severity from photos; validates before/after repairs; generates repair briefs.' },
  { ico: '🤖', name: 'Gemini Function Calling', use: 'Powers the Civic Copilot agent — autonomously calls platform tools to file reports, dispatch crews and escalate.' },
  { ico: '🌐', name: 'Grounding w/ Google Search', use: 'The Copilot grounds real-world answers (CPWD rates, monsoon forecasts, BBMP SLAs) with cited sources.' },
  { ico: '🗺️', name: 'Maps Platform', use: 'GPS precision, traffic volume for Impact Score, crew routing and ward boundary detection.' },
  { ico: '🌧️', name: 'Earth Engine', use: '7-day rainfall vulnerability scoring and historical flood-zone risk multipliers.' },
  { ico: '🔥', name: 'Firebase Realtime DB', use: 'Live complaint feed, crew location tracking and real-time citizen status updates.' },
  { ico: '🧠', name: 'Vertex AI Agent Builder', use: 'Orchestrates the Detection → Dedup → Prioritisation → Dispatch → Monitoring → Audit pipeline.' },
  { ico: '📊', name: 'BigQuery', use: 'Historical patterns, contractor analytics, ward trends and seasonal prediction models.' },
  { ico: '☁️', name: 'Cloud Run', use: 'Serverless backend (key stays server-side) that auto-scales 8× during monsoon complaint spikes.' },
];

const CRITERIA = [
  { label: 'Problem Solving & Impact', detail: '₹50,000 Cr problem, 3,000+ deaths/yr — measurable safety + accountability outcomes.' },
  { label: 'Agentic Depth', detail: 'A real tool-calling Copilot agent + a six-agent pipeline with logged, multi-step reasoning.' },
  { label: 'Innovation & Creativity', detail: 'Impact Score triage, WhatsApp-native reporting, AI before/after audit, agent ops console.' },
  { label: 'Usage of Google Technologies', detail: 'Gemini Vision + Function Calling + Search grounding, Maps, Earth Engine, Vertex AI, BigQuery, Cloud Run.' },
  { label: 'Product Experience & Design', detail: 'Installable PWA, four polished personas, conversational agent on every screen.' },
];

export default function About() {
  const { go } = useStore();
  return (
    <div className="container section">
      <span className="eyebrow">Platform & architecture</span>
      <h2 className="mt-8" style={{ fontSize: 32 }}>The operational layer for civic repair</h2>
      <p className="muted mt-8" style={{ maxWidth: 680 }}>
        RoadSense AI addresses Problem Statement 2 — <strong>Community Hero: Hyperlocal Problem Solver</strong>.
        It lets citizens identify, report, validate, track and resolve community issues through collaboration,
        data and intelligent automation.
      </p>

      <h3 className="mt-40" style={{ fontSize: 22 }}>Google technology stack</h3>
      <div className="tech-grid mt-16">
        {TECH.map((t) => (
          <div className="tech-card" key={t.name}>
            <div className="tc-name"><span style={{ fontSize: 20 }}>{t.ico}</span> {t.name}</div>
            <div className="tc-use">{t.use}</div>
          </div>
        ))}
      </div>

      <div className="card card-pad mt-40" style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.12), var(--panel))' }}>
        <span className="eyebrow" style={{ color: 'var(--brand-3)' }}>★ Agentic core</span>
        <h3 className="mt-8" style={{ fontSize: 22 }}>Meet the Civic Copilot 🤖</h3>
        <p className="muted mt-8" style={{ maxWidth: 720 }}>
          Tap the Copilot button on any screen. It's a true Gemini agent: it uses <strong>function calling</strong> to
          autonomously operate the platform — listing and prioritising issues, filing reports, generating work orders,
          escalating to councillors — and <strong>grounds real-world answers with Google Search</strong> (with citations).
          Every tool call it makes is shown live, so you can watch it reason and act.
        </p>
        <div className="flex gap-8 wrap mt-16">
          {['listIssues', 'createReport', 'dispatchCrew', 'escalateIssue', 'getWardScorecard', 'searchCivicInfo'].map((t) => (
            <span className="chip" key={t} style={{ fontFamily: 'monospace' }}>{t}()</span>
          ))}
        </div>
      </div>

      <div className="grid-2 mt-40">
        <div className="card card-pad">
          <h3 style={{ fontSize: 20 }}>The four failure points we fix</h3>
          <div className="mt-16">
            {[
              ['Complaint black hole', '200+ duplicate reports per pothole, zero deduplication.'],
              ['No prioritisation', 'Systems sort by date, not risk to life or commuters.'],
              ['Verbal dispatch', '"Main road near the temple" — crews patch the wrong spot.'],
              ['No completion proof', 'Closed without photo, timestamp or crew ID.'],
            ].map(([t, d], i) => (
              <div className="kv" key={i} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <strong style={{ fontSize: 14 }}>{i + 1}. {t}</strong>
                <span className="tiny">{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <h3 style={{ fontSize: 20 }}>Hackathon evaluation fit</h3>
          <div className="mt-16">
            {CRITERIA.map((c) => (
              <div className="kv" key={c.label} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <strong style={{ fontSize: 14, color: 'var(--brand)' }}>{c.label}</strong>
                <span className="tiny">{c.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-pad mt-40 flex between center wrap gap-16" style={{ background: 'linear-gradient(135deg, var(--panel-2), var(--panel))' }}>
        <div>
          <h3 style={{ fontSize: 22 }}>Year 1: 35M residents. Year 3: 200M.</h3>
          <p className="muted mt-8">BBMP Bangalore · MCGM Mumbai · GHMC Hyderabad · CMC Chennai — SaaS to Urban Local Bodies.</p>
        </div>
        <button className="btn btn-primary" onClick={() => go('report')}>Try the live demo →</button>
      </div>
    </div>
  );
}
