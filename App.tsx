import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Issue, View } from './types';
import { SEED_ISSUES } from './data/seed';
import * as api from './services/api';
import Landing from './components/Landing';
import ReportFlow from './components/ReportFlow';
import GovernmentDashboard from './components/GovernmentDashboard';
import CrewApp from './components/CrewApp';
import PublicFeed from './components/PublicFeed';
import About from './components/About';
import IssueModal from './components/IssueModal';
import Copilot from './components/Copilot';

interface Store {
  issues: Issue[];
  geminiLive: boolean;
  mode: 'backend' | 'local' | 'loading';
  addIssue: (i: Issue) => void;
  updateIssue: (id: string, patch: Partial<Issue>, persist?: boolean) => void;
  open: (i: Issue) => void;
  go: (v: View) => void;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('Store missing');
  return c;
};

const TABS: { key: View; label: string; icon: string }[] = [
  { key: 'landing', label: 'Home', icon: '🏠' },
  { key: 'government', label: 'Govt', icon: '🏛️' },
  { key: 'report', label: 'Report', icon: '📷' },
  { key: 'crew', label: 'Crew', icon: '🛠️' },
  { key: 'public', label: 'Public', icon: '📣' },
];

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [issues, setIssues] = useState<Issue[]>(SEED_ISSUES);
  const [active, setActive] = useState<Issue | null>(null);
  const [geminiLive, setGeminiLive] = useState(false);
  const [mode, setMode] = useState<'backend' | 'local' | 'loading'>('loading');

  useEffect(() => {
    let alive = true;
    api.bootstrap().then((b) => {
      if (!alive) return;
      setIssues(b.issues);
      setGeminiLive(b.geminiLive);
      setMode(b.mode);
    });
    return () => { alive = false; };
  }, []);

  const store = useMemo<Store>(
    () => ({
      issues, geminiLive, mode,
      addIssue: (i) => setIssues((p) => [i, ...p]),
      updateIssue: (id, patch, persist = true) => {
        setIssues((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
        if (persist) void api.patchIssue(id, patch);
      },
      open: (i) => setActive(i),
      go: (v) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    }),
    [issues, geminiLive, mode]
  );

  const activeLive = active ? issues.find((i) => i.id === active.id) ?? active : null;

  const statusLabel = mode === 'loading' ? 'Connecting…'
    : geminiLive ? (mode === 'backend' ? 'Live · secured' : 'Live')
    : 'Demo';

  return (
    <Ctx.Provider value={store}>
      <div className="app-shell">
        {/* Compact app bar */}
        <header className="app-bar">
          <div className="app-bar-inner">
            <button className="brand" onClick={() => store.go('landing')}>
              <span className="logo-mark">R</span>
              <span className="brand-name">RoadSense<span style={{ color: 'var(--brand)' }}>AI</span></span>
            </button>
            <div className="nav-spacer" />
            <span className="status-pill">
              <span className={`dot ${geminiLive ? 'on' : 'off'}`} /> {statusLabel}
            </span>
            <button
              className={`appbar-btn ${view === 'about' ? 'active' : ''}`}
              onClick={() => store.go('about')}
              aria-label="Platform info"
            >ⓘ</button>
          </div>
        </header>

        <main className="app-main">
          {view === 'landing' && <Landing />}
          {view === 'report' && <ReportFlow />}
          {view === 'government' && <GovernmentDashboard />}
          {view === 'crew' && <CrewApp />}
          {view === 'public' && <PublicFeed />}
          {view === 'about' && <About />}
        </main>

        {/* Bottom tab bar — app navigation */}
        <nav className="bottom-nav">
          {TABS.map((t) =>
            t.key === 'report' ? (
              <button key={t.key} className="tab-fab" onClick={() => store.go('report')} aria-label="Report an issue">
                <span style={{ fontSize: 24 }}>📷</span>
              </button>
            ) : (
              <button
                key={t.key}
                className={`tab-item ${view === t.key ? 'active' : ''}`}
                onClick={() => store.go(t.key)}
              >
                <span className="tab-ico">{t.icon}</span>
                <span className="tab-label">{t.label}</span>
              </button>
            )
          )}
        </nav>
      </div>

      {activeLive && <IssueModal issue={activeLive} onClose={() => setActive(null)} />}
      <Copilot />
    </Ctx.Provider>
  );
}
