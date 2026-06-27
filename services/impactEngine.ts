import type { ImpactScore, Severity, VisionAnalysis, ZoneType } from '../types';

// ---------------------------------------------------------------------------
// Impact Score Engine — Prioritisation Agent
// Impact = Physical Severity (35%) + Traffic Volume (30%)
//        + Zone Risk (20%) + Rain Vulnerability (15%)
// ---------------------------------------------------------------------------

const SEVERITY_WEIGHT: Record<Severity, number> = {
  Hairline: 25,
  Shallow: 55,
  Deep: 82,
  Critical: 100,
};

const ZONE_MULTIPLIER: Record<ZoneType, number> = {
  'School Zone': 100,
  'Hospital Zone': 100,
  Expressway: 92,
  'Bridge Approach': 95,
  'Arterial Road': 70,
  Market: 60,
  'Residential Lane': 35,
};

export interface ImpactInputs {
  severity: Severity;
  depthCm: number;
  trafficScore: number; // 0-100
  zone: ZoneType;
  rainRisk7d: number; // 0-100
}

export function computeImpact(inputs: ImpactInputs): ImpactScore {
  const { severity, depthCm, trafficScore, zone, rainRisk7d } = inputs;

  // Physical severity blends the discrete class with measured depth.
  const depthSignal = Math.min(100, (depthCm / 30) * 100);
  const physical = clamp(SEVERITY_WEIGHT[severity] * 0.7 + depthSignal * 0.3);

  const traffic = clamp(trafficScore);
  const zoneRisk = clamp(ZONE_MULTIPLIER[zone]);
  const rain = clamp(rainRisk7d);

  const total = Math.round(
    physical * 0.35 + traffic * 0.3 + zoneRisk * 0.2 + rain * 0.15
  );

  return {
    total: clamp(total),
    physicalSeverity: Math.round(physical),
    trafficVolume: Math.round(traffic),
    zoneRisk: Math.round(zoneRisk),
    rainVulnerability: Math.round(rain),
  };
}

/** SLA target derived from impact tier — higher impact, tighter clock. */
export function slaHoursForImpact(total: number): number {
  if (total >= 85) return 24;
  if (total >= 70) return 48;
  if (total >= 50) return 96;
  return 168;
}

export function impactTier(total: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (total >= 85) return { label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' };
  if (total >= 70) return { label: 'High', color: '#ea580c', bg: 'rgba(234,88,12,0.12)' };
  if (total >= 50) return { label: 'Moderate', color: '#ca8a04', bg: 'rgba(202,138,4,0.14)' };
  return { label: 'Low', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' };
}

export function estimateCostLabel(analysis: VisionAnalysis): string {
  const [lo, hi] = analysis.estimatedCostRange;
  return `₹${lo.toLocaleString('en-IN')} – ₹${hi.toLocaleString('en-IN')}`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
