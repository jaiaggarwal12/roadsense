# 🛣️ RoadSense AI

**Intelligent Road & Civic Damage Detection, Dispatch & Accountability Platform**

> Problem Statement 2 — *Community Hero: Hyperlocal Problem Solver*
> Built with **Gemini 2.5** (Vision + **Function Calling** + **Google Search grounding**) as the core.
> Full-stack: React PWA frontend + Cloud Run–ready Node backend.

A citizen snaps a pothole; a six-agent Gemini pipeline classifies it, scores its impact, dispatches
a crew and proves the fix. On top sits the **Civic Copilot** — a true tool-calling AI agent that
operates the entire platform on command.

---

## ✨ Highlights

| Area | What we built |
|---|---|
| **Civic Copilot agent** | Conversational Gemini agent using **function calling** to autonomously list/prioritise issues, file reports, generate work orders, escalate, and **search real civic data with Google grounding** (cited). Every tool call is shown live. |
| **Citizen reporting** | Photo / WhatsApp / web, auto GPS-tag, instant Gemini Vision analysis with a live agent pipeline. |
| **AI triage** | Weighted **Impact Score** = Severity 35% · Traffic 30% · Zone risk 20% · Rain 15%. |
| **Government console** | Ranked queue, heat-map, SLA clock, one-click work orders. |
| **Crew app** | GPS nav, AI repair brief, tamper-proof before/after photos validated by the Audit Agent. |
| **Public feed** | Accountability threads, community verification, ward & contractor scorecards. |
| **Installable PWA** | Mobile-first, add-to-home-screen, works like a native app. |

## 🤖 Agentic depth (two layers)

1. **Civic Copilot** — multi-step Gemini **function calling** agent. Tools:
   `listIssues · getIssue · createReport · dispatchCrew · escalateIssue · getWardScorecard · searchCivicInfo`.
   It chains tools (e.g. *find the top critical issue → dispatch a crew to it*) and grounds facts via Google Search.
2. **Report pipeline** — `Detection → Deduplication → Prioritisation → Dispatch → Monitoring → Audit`,
   with the Detection and Audit agents backed by real Gemini Vision calls.

## 🧰 Google technologies

Gemini 2.5 Vision · Gemini Function Calling · Grounding with Google Search · Maps Platform ·
Earth Engine · Firebase Realtime DB · Vertex AI Agent Builder · BigQuery · Cloud Run.

---

## 🏗️ Architecture

```
Browser (React PWA)
   │  /api/*  (Vite dev proxy → :8787)
   ▼
Node + Express backend  ── Gemini key stays server-side ──►  Gemini API
   ├─ /api/analyze            Detection Agent (Vision)
   ├─ /api/issues (CRUD)      Dedup + Prioritisation + Dispatch
   ├─ /api/issues/:id/audit   Audit Agent (before/after)
   ├─ /api/agent              Civic Copilot (function calling + Search)
   └─ serves /dist            single Cloud Run service in production
```

The frontend uses a single data layer (`services/api.ts`) that **prefers the backend** but
**falls back to in-browser Gemini** when no backend is present — so the Google AI Studio
single-app deployment still works end-to-end.

## 🚀 Run locally

```bash
npm install
# add your key (already provided in .env.local):  GEMINI_API_KEY=...
npm run dev:all      # runs frontend (5173) + backend (8787) together
```

Open http://localhost:5173. Or run them separately: `npm run dev` and `npm run server`.

Without a key the app runs in **demo mode** with a realistic simulated analysis.

## 📦 Production build

```bash
npm run build        # builds the PWA into /dist
npm run start        # backend serves /dist + API on :8787
```

## ☁️ Deploy

- **Cloud Run** (recommended for the full agentic backend): `docker build` with the included
  `Dockerfile`, set `GEMINI_API_KEY` as a service env var, deploy. Key never reaches the browser.
- **Google AI Studio** (single-app): reads `process.env.API_KEY` injected at deploy time; the
  in-browser fallback keeps the Copilot and analysis working.
  See https://ai.google.dev/gemini-api/docs/aistudio-deploying

> ⚠️ The Gemini **free tier allows ~5 requests/min**. The Copilot makes a few calls per task, so
> heavy demoing can hit the limit — it degrades gracefully with a clear message. Use a paid key for
> unlimited runs.

---

## 🗂️ Structure

```
index.html / index.tsx / styles.css   PWA shell + design system
App.tsx                                state store + routing + Copilot mount
types.ts                               domain model
public/                                manifest.webmanifest + icon.svg
services/
  geminiService.ts   Detection + Audit agents (Gemini Vision)
  agent.ts           isomorphic agent loop (function calling)
  agentTools.ts      tool declarations + executor + system prompt
  clientAgent.ts     in-browser ToolContext (AI Studio fallback)
  impactEngine.ts    Impact Score + SLA logic
  api.ts             unified data layer (backend ↔ local fallback)
data/seed.ts         seeded Bengaluru demo data
components/          Landing, ReportFlow, GovernmentDashboard, CrewApp,
                     PublicFeed, IssueModal, About, Copilot, ui
server/
  index.ts           Express API + static hosting
  agent.ts           store-backed Copilot + Google Search grounding
  store.ts           file-backed persistence
Dockerfile           Cloud Run image
```

Built for the Vibe2Ship hackathon (Coding Ninjas × Google for Developers) · © 2026 RoadSense AI
