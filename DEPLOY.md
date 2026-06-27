# Deployment & Submission Guide

The hackathon requires the final app to be **deployed on Google Cloud**. Two supported paths:

---

## Path A — Google AI Studio (simplest; 2 free deploys for new users)

AI Studio publishes a **client-side** app. RoadSense AI has a built-in in-browser fallback, so the
Copilot, photo analysis and grounding all work without our Node backend.

1. Go to https://aistudio.google.com → **Build**.
2. Create an app and **import** this project (or paste files). Ensure `index.html`, `index.tsx`,
   `App.tsx`, `styles.css`, `metadata.json`, `components/`, `services/`, `data/`, `types.ts` are present.
3. Add your Gemini key in **Secrets** (AI Studio injects `process.env.API_KEY`).
4. Click **Publish** → you get a public **Cloud Run** link. Submit that link.

> Note: AI Studio's Android framework is "coming soon", so we ship a **PWA** — installable on any
> phone (Add to Home Screen) and accessible from any device.

## Path B — Cloud Run (full stack: server-side key + the agent backend)

Deploy the Dockerised full app (frontend served by the backend, key never reaches the browser).

```bash
# one-time
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# deploy (free-tier friendly)
gcloud run deploy roadsense-ai \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY
```

`gcloud` builds the included `Dockerfile`, runs `npm run build`, and starts `npm run start`
(Express serves `/dist` + the API). The command prints your public Cloud Run URL — submit that.

---

## GitHub (mandatory)

```bash
git init            # already done if a .git folder exists
git add .
git commit -m "RoadSense AI — Vibe2Ship submission"
git branch -M main
git remote add origin https://github.com/<you>/roadsense-ai.git
git push -u origin main
```
`.gitignore` already excludes `node_modules`, `dist` and `.env.local` (your key is never pushed).
Share **this project's** repo link only.

## Project description (mandatory)
Paste `PROJECT_DESCRIPTION.md` into a **Google Doc**, set **Anyone with link → Viewer**, submit the
link, and **don't edit it after submitting**.

## Submit
Submit all three links (deployed app, GitHub, Google Doc) **only on the BlockseBlock platform**
before **29 June 2026, 2:00 PM**.

## Free-tier note
Gemini free tier ≈ 5 requests/min. The Copilot makes a few calls per task; pace your demo or use a
paid key. No paid credits are required for the rest of the stack.
