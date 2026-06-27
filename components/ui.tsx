import React from 'react';
import type { IssueStatus, Severity } from '../types';
import { impactTier } from '../services/impactEngine';

export const STATUS_COLOR: Record<IssueStatus, string> = {
  Reported: '#64748b',
  Verified: '#38bdf8',
  'Work Order': '#818cf8',
  'In Progress': '#f59e0b',
  Resolved: '#22c55e',
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  Hairline: '#22c55e',
  Shallow: '#eab308',
  Deep: '#f97316',
  Critical: '#ef4444',
};

export function StatusTag({ status }: { status: IssueStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span className="tag" style={{ color: c, background: `${c}22` }}>
      <span className="dot" style={{ background: c, width: 7, height: 7 }} />
      {status}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: Severity }) {
  const c = SEVERITY_COLOR[severity];
  return <span className="tag" style={{ color: c, background: `${c}22` }}>{severity}</span>;
}

export function ImpactBadge({ total }: { total: number }) {
  const t = impactTier(total);
  return (
    <span className="tag" style={{ color: t.color, background: t.bg }}>
      Impact {total} · {t.label}
    </span>
  );
}

/** Circular impact score ring (pure SVG). */
export function ScoreRing({ value, size = 140 }: { value: number; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const t = impactTier(value);
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2a37" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={t.color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="val">
        <div className="n" style={{ color: t.color }}>{value}</div>
        <div className="l">{t.label}</div>
      </div>
    </div>
  );
}

export function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="flex between" style={{ fontSize: 12.5 }}>
        <span className="muted">{label}</span>
        <span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div className="factor-bar">
        <span style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

/** Read a File into base64 (no prefix) + data URL. */
export function readImage(file: File): Promise<{ base64: string; dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({ base64, dataUrl, mimeType: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
