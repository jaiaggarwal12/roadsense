import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load env BEFORE anything reads the key. geminiService reads lazily anyway.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

import express from 'express';
import cors from 'cors';
import type { Issue, TimelineEvent, VisionAnalysis, ZoneType } from '../types';
import { analyseImage, validateRepair, hasApiKey } from '../services/geminiService';
import { computeImpact, slaHoursForImpact } from '../services/impactEngine';
import { runServerAgent } from './agent.js';
import * as store from './store.js';

const app = express();
const PORT = Number(process.env.PORT) || 8787;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// ---- request log (lightweight) -------------------------------------------
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) console.log(`${req.method} ${req.path}`);
  next();
});

// ---- health & bootstrap ---------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, geminiLive: hasApiKey(), time: new Date().toISOString() });
});

app.get('/api/bootstrap', (_req, res) => {
  res.json({
    issues: store.getIssues(),
    wards: store.getWards(),
    contractors: store.getContractors(),
    geminiLive: hasApiKey(),
  });
});

app.get('/api/issues', (_req, res) => res.json(store.getIssues()));
app.get('/api/issues/:id', (req, res) => {
  const i = store.getIssue(req.params.id);
  if (!i) return res.status(404).json({ error: 'not found' });
  res.json(i);
});

// ---- Detection Agent: analyse an uploaded image ---------------------------
app.post('/api/analyze', async (req, res) => {
  const { imageBase64, mimeType } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' });
  try {
    const analysis = await analyseImage(imageBase64, mimeType || 'image/jpeg');
    res.json(analysis);
  } catch (e) {
    console.error('analyze error', e);
    res.status(500).json({ error: 'analysis failed' });
  }
});

// ---- Create issue: runs Dedup + Prioritisation + Dispatch agents ----------
app.post('/api/issues', (req, res) => {
  const {
    analysis, imageDataUrl, ward, wardId, zone, location, channel, anonymous,
  } = req.body as {
    analysis: VisionAnalysis; imageDataUrl: string; ward: string; wardId: number;
    zone: ZoneType; location: string; channel: Issue['channel']; anonymous: boolean;
  };
  if (!analysis || !imageDataUrl) return res.status(400).json({ error: 'analysis + imageDataUrl required' });

  // Deduplication Agent — cluster against existing nearby reports of same type.
  const dupes = store.getIssues().filter(
    (i) => i.ward === ward && i.damageType === analysis.damageType && i.status !== 'Resolved'
  ).length;
  const confirmations = dupes + 1;

  // Maps + Earth Engine signals (simulated here; real deploy calls the APIs).
  const trafficScore = 40 + Math.round(Math.random() * 55);
  const rainRisk7d = 25 + Math.round(Math.random() * 60);

  // Prioritisation Agent.
  const impact = computeImpact({
    severity: analysis.severity, depthCm: analysis.estimatedDepthCm,
    trafficScore, zone, rainRisk7d,
  });
  const slaHours = slaHoursForImpact(impact.total);

  // Dispatch Agent.
  const contractor = store.pickContractor();

  const verified = confirmations >= 3;
  const timeline: TimelineEvent[] = [
    { status: 'Reported', label: 'Issue reported', timestamp: 'just now', detail: `via ${channel}` },
  ];
  if (verified) timeline.push({ status: 'Verified', label: `Auto-verified · ${confirmations} citizen reports`, timestamp: 'just now', detail: 'escalated to ward councillor' });

  const issue: Issue = {
    id: store.nextId(),
    imageUrl: imageDataUrl,
    damageType: analysis.damageType,
    severity: analysis.severity,
    status: verified ? 'Verified' : 'Reported',
    ward, wardId: wardId ?? 45, location,
    lat: 12.94 + Math.random() * 0.1,
    lng: 77.5 + Math.random() * 0.18,
    zone, trafficScore, rainRisk7d, confirmations,
    reportedAt: 'just now',
    analysis, impact, slaHours, ageHours: 0,
    anonymous: Boolean(anonymous), channel: channel ?? 'App',
    contractor: contractor?.name,
    timeline,
  };
  store.addIssue(issue);
  res.status(201).json(issue);
});

// ---- Update / patch an issue ----------------------------------------------
app.patch('/api/issues/:id', (req, res) => {
  const updated = store.updateIssue(req.params.id, req.body ?? {});
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

// ---- Community verification ------------------------------------------------
app.post('/api/issues/:id/confirm', (req, res) => {
  const issue = store.getIssue(req.params.id);
  if (!issue) return res.status(404).json({ error: 'not found' });
  const confirmations = issue.confirmations + 1;
  const becomesVerified = issue.status === 'Reported' && confirmations >= 3;
  const patch: Partial<Issue> = {
    confirmations,
    status: becomesVerified ? 'Verified' : issue.status,
    timeline: becomesVerified
      ? [...issue.timeline, { status: 'Verified', label: `Verified by ${confirmations} citizens`, timestamp: 'just now', detail: 'escalated to ward councillor' }]
      : issue.timeline,
  };
  res.json(store.updateIssue(issue.id, patch));
});

// ---- Audit Agent: validate before/after, close the job --------------------
app.post('/api/issues/:id/audit', async (req, res) => {
  const issue = store.getIssue(req.params.id);
  if (!issue) return res.status(404).json({ error: 'not found' });
  const { beforeBase64, afterBase64, mimeType, afterDataUrl } = req.body ?? {};
  if (!beforeBase64 || !afterBase64) return res.status(400).json({ error: 'before + after required' });

  const verdict = await validateRepair(beforeBase64, afterBase64, mimeType || 'image/jpeg');
  if (verdict.repaired) {
    store.updateIssue(issue.id, {
      status: 'Resolved',
      afterImageUrl: afterDataUrl,
      timeline: [...issue.timeline,
        { status: 'In Progress', label: 'Crew on site · before-photo logged', timestamp: 'earlier', detail: 'geo-stamped' },
        { status: 'Resolved', label: `Repair validated by Audit Agent (${verdict.confidence}%)`, timestamp: 'just now', detail: verdict.note },
      ],
    });
  }
  res.json({ verdict, issue: store.getIssue(issue.id) });
});

// ---- Civic Copilot agent (Gemini function calling + Search grounding) -----
app.post('/api/agent', async (req, res) => {
  const { history } = req.body ?? {};
  if (!Array.isArray(history)) return res.status(400).json({ error: 'history[] required' });
  try {
    const result = await runServerAgent(history);
    res.json(result);
  } catch (e) {
    console.error('agent error', e);
    res.status(500).json({ error: 'agent failed', detail: (e as Error).message });
  }
});

// ---- Serve built frontend in production -----------------------------------
const distDir = path.join(root, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🛣️  RoadSense AI backend on http://localhost:${PORT}`);
  console.log(`   Gemini: ${hasApiKey() ? 'LIVE ✅' : 'demo mode ⚠️'}`);
  console.log(`   Frontend: ${fs.existsSync(distDir) ? 'serving /dist' : 'run "npm run dev" separately'}\n`);
});
