# RoadSense AI — Project Description

> Paste this into a Google Doc, set sharing to **"Anyone with the link → Viewer"**, and submit the link.
> Do **not** edit the doc after you submit (judges may check version history).

---

## Problem Statement Selected
**Problem Statement 2 — Community Hero: Hyperlocal Problem Solver.**
Communities face potholes, water leakages, broken streetlights, waste and infrastructure issues.
Reporting today is fragmented, hard to track and lacks transparency. We build a platform that lets
citizens **identify, report, validate, track and resolve** community issues through collaboration,
data and intelligent automation — with transparency and accountability built in.

## Solution Overview
**RoadSense AI** is a mobile-first civic platform — the operational layer between citizens and repair
crews. A citizen reports an issue with a photo; a **six-agent Gemini pipeline** classifies it, scores
its real-world impact, generates a work order, dispatches a crew, and **proves the repair** with an
AI before/after audit. On top sits the **Civic Copilot** — a true Gemini *function-calling* agent that
can operate the whole platform from natural language and ground answers with Google Search & Maps.

Four roles in one installable app: **Citizen · Government · Crew · Public**.

## Key Features
- **Multimodal reporting** — photo upload (camera-first PWA), auto context; WhatsApp/web channels.
- **AI Impact Score** — weighted triage: Physical Severity 35% · Traffic 30% · Zone Risk 20% · Rain 15%.
- **Civic Copilot (agent)** — function calling to list/prioritise issues, file reports, generate work
  orders, escalate to councillors, and look up real civic data; every tool call is shown live.
- **Six-agent pipeline** — Detection → Deduplication → Prioritisation → Dispatch → Monitoring → Audit.
- **Government console** — ranked work queue (not an inbox), heat-map, SLA clock, one-click work orders.
- **Crew app** — GPS navigation, AI repair brief, tamper-proof geo-stamped before/after photos.
- **AI repair audit** — Gemini compares before/after photos to confirm the fix actually happened.
- **Public accountability** — issue threads, community verification, ward & contractor scorecards.
- **Installable PWA** — works like a native app on any phone; offline-friendly shell.

## Technologies Used
- **Frontend:** React 19, Vite 6, TypeScript, PWA (web manifest + service-worker-ready shell).
- **Backend:** Node.js, Express (REST API), file-backed persistence, Dockerised for Cloud Run.
- **AI SDK:** `@google/genai`.

## Google Technologies Utilized
- **Gemini 2.5 Flash — Vision:** damage type/severity/cost detection and before/after repair audit.
- **Gemini 2.5 Flash — Function Calling:** powers the autonomous Civic Copilot agent.
- **Grounding with Google Search:** real-world civic facts (CPWD rates, monsoon forecast, SLAs) with citations.
- **Grounding with Google Maps:** location/zone context around an issue.
- **URL Context:** reads BBMP circulars / news pages on request.
- **Google Cloud Run:** serverless deployment (the Gemini key stays server-side).
- **Google AI Studio:** build & deploy tooling.
- *(Reference architecture also maps to Maps Platform, Earth Engine, Firebase, Vertex AI Agent Builder, BigQuery.)*

## Credits / Attribution
All application logic, prompts, agent design, UI and backend code are original work built during the
challenge window. Open-source libraries used (with licenses) are listed in `ATTRIBUTION.md` — React,
Vite, Express, cors, dotenv, tsx, TypeScript, and the `@google/genai` SDK. No forked repository was
submitted as our own.

## Links
- **Deployed app (Google Cloud · Firebase Hosting):** https://roadsense-ai-8858c.web.app
- **GitHub repository:** https://github.com/jaiaggarwal12/roadsense
- **Demo video (optional):** `<paste link here>`
