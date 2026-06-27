import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Contractor, Issue, TimelineEvent, Ward } from '../types';
import { CONTRACTORS, SEED_ISSUES, WARDS } from '../data/seed';

// ---------------------------------------------------------------------------
// File-backed store — stands in for Firestore / BigQuery in this demo.
// Persists issues to server/data.json so reports survive restarts.
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');

interface DB {
  issues: Issue[];
  seq: number;
}

let db: DB;

function load(): DB {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(raw.issues)) return raw as DB;
    }
  } catch (e) {
    console.warn('[store] could not read data.json, seeding fresh:', (e as Error).message);
  }
  return { issues: [...SEED_ISSUES], seq: 2000 };
}

function persist() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.warn('[store] persist failed:', (e as Error).message);
  }
}

db = load();

export function nextId(): string {
  db.seq += 1;
  return `RS-${db.seq}`;
}

export function getIssues(): Issue[] {
  return [...db.issues].sort((a, b) => b.impact.total - a.impact.total);
}

export function getIssue(id: string): Issue | undefined {
  return db.issues.find((i) => i.id === id);
}

export function addIssue(issue: Issue): Issue {
  db.issues.unshift(issue);
  persist();
  return issue;
}

export function updateIssue(id: string, patch: Partial<Issue>): Issue | undefined {
  const idx = db.issues.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  db.issues[idx] = { ...db.issues[idx], ...patch };
  persist();
  return db.issues[idx];
}

export function appendTimeline(id: string, ev: TimelineEvent): Issue | undefined {
  const issue = getIssue(id);
  if (!issue) return undefined;
  return updateIssue(id, { timeline: [...issue.timeline, ev] });
}

export function getWards(): Ward[] {
  return WARDS;
}

export function getContractors(): Contractor[] {
  return CONTRACTORS;
}

/** Picks the best available, well-rated contractor (Dispatch Agent helper). */
export function pickContractor(): Contractor | undefined {
  return getContractors()
    .filter((c) => c.available && !c.blacklisted)
    .sort((a, b) => a.proximityKm - b.proximityKm || a.repeatFailureRate - b.repeatFailureRate)[0];
}
