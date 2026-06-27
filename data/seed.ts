import type { Contractor, Issue, Ward } from '../types';
import { computeImpact, slaHoursForImpact } from '../services/impactEngine';

// ---------------------------------------------------------------------------
// Seeded demo data — Bengaluru (BBMP) peripheral IT-corridor wards
// ---------------------------------------------------------------------------

/** Generates a crisp inline "satellite/road" placeholder so the app needs no CDN. */
export function placeholder(seed: string, label: string, tone = '#3b3f46'): string {
  const hash = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='hsl(${hash},14%,26%)'/>
        <stop offset='1' stop-color='hsl(${(hash + 40) % 360},16%,16%)'/>
      </linearGradient>
      <radialGradient id='p' cx='50%' cy='58%' r='34%'>
        <stop offset='0' stop-color='#05070a'/>
        <stop offset='0.7' stop-color='#0b0f15'/>
        <stop offset='1' stop-color='hsl(${hash},14%,24%)' stop-opacity='0'/>
      </radialGradient>
    </defs>
    <rect width='600' height='400' fill='url(#g)'/>
    <g stroke='${tone}' stroke-width='2' opacity='0.5'>
      <line x1='0' y1='120' x2='600' y2='150'/>
      <line x1='0' y1='300' x2='600' y2='270'/>
    </g>
    <g stroke='#e9d36c' stroke-width='6' stroke-dasharray='34 26' opacity='0.85'>
      <line x1='-20' y1='220' x2='620' y2='200'/>
    </g>
    <ellipse cx='300' cy='232' rx='150' ry='86' fill='url(#p)'/>
    <ellipse cx='300' cy='232' rx='150' ry='86' fill='none' stroke='#000' stroke-opacity='0.5' stroke-width='3'/>
    <text x='24' y='372' font-family='monospace' font-size='20' fill='#ffffff' opacity='0.82'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const WARDS: Ward[] = [
  { id: 24, name: 'Horamavu', avgResponseDays: 11, openIssues: 38, resolvedThisMonth: 52, resolutionRate: 0.58 },
  { id: 25, name: 'Thanisandra', avgResponseDays: 9, openIssues: 29, resolvedThisMonth: 61, resolutionRate: 0.67 },
  { id: 45, name: 'Jnanabharathi', avgResponseDays: 14, openIssues: 47, resolvedThisMonth: 40, resolutionRate: 0.46 },
  { id: 112, name: 'Bellandur', avgResponseDays: 8, openIssues: 33, resolvedThisMonth: 70, resolutionRate: 0.71 },
];

export const CONTRACTORS: Contractor[] = [
  { id: 'c1', name: 'Sri Venkateshwara Infra', available: true, proximityKm: 1.4, jobsDone: 312, repeatFailureRate: 0.08, amountPaid: 18900000, blacklisted: false },
  { id: 'c2', name: 'Metro RoadWorks Pvt Ltd', available: true, proximityKm: 3.2, jobsDone: 198, repeatFailureRate: 0.12, amountPaid: 12400000, blacklisted: false },
  { id: 'c3', name: 'Sai Constructions', available: false, proximityKm: 2.1, jobsDone: 421, repeatFailureRate: 0.27, amountPaid: 23100000, blacklisted: true },
  { id: 'c4', name: 'Namma Civil Crew', available: true, proximityKm: 0.9, jobsDone: 87, repeatFailureRate: 0.05, amountPaid: 5400000, blacklisted: false },
];

let counter = 1000;
export function nextId(): string {
  counter += 1;
  return `RS-${counter}`;
}

function buildIssue(p: {
  id: string;
  damageType: Issue['damageType'];
  severity: Issue['severity'];
  status: Issue['status'];
  ward: string;
  wardId: number;
  location: string;
  lat: number;
  lng: number;
  zone: Issue['zone'];
  traffic: number;
  rain: number;
  depth: number;
  confirmations: number;
  ageHours: number;
  contractor?: string;
  cost: [number, number];
  channel: Issue['channel'];
  anonymous?: boolean;
  brief: string;
  rootCause: string;
}): Issue {
  const impact = computeImpact({
    severity: p.severity, depthCm: p.depth, trafficScore: p.traffic, zone: p.zone, rainRisk7d: p.rain,
  });
  const sla = slaHoursForImpact(impact.total);
  const tl: Issue['timeline'] = [
    { status: 'Reported', label: 'Issue reported', timestamp: `${p.ageHours}h ago`, detail: `via ${p.channel}` },
  ];
  if (['Verified', 'Work Order', 'In Progress', 'Resolved'].includes(p.status))
    tl.push({ status: 'Verified', label: `Verified by ${p.confirmations} citizens`, timestamp: `${Math.max(1, p.ageHours - 2)}h ago` });
  if (['Work Order', 'In Progress', 'Resolved'].includes(p.status))
    tl.push({ status: 'Work Order', label: 'Work order generated', timestamp: `${Math.max(1, p.ageHours - 4)}h ago`, detail: p.contractor });
  if (['In Progress', 'Resolved'].includes(p.status))
    tl.push({ status: 'In Progress', label: 'Crew on site · before-photo logged', timestamp: `${Math.max(1, p.ageHours - 6)}h ago` });
  if (p.status === 'Resolved')
    tl.push({ status: 'Resolved', label: 'Repair validated by Audit Agent', timestamp: `${Math.max(1, p.ageHours - 8)}h ago`, detail: 'after-photo matched' });

  return {
    id: p.id,
    imageUrl: placeholder(p.id, p.id),
    afterImageUrl: p.status === 'Resolved' ? placeholder(p.id + 'after', 'REPAIRED', '#2f5a3a') : undefined,
    damageType: p.damageType,
    severity: p.severity,
    status: p.status,
    ward: p.ward,
    wardId: p.wardId,
    location: p.location,
    lat: p.lat,
    lng: p.lng,
    zone: p.zone,
    trafficScore: p.traffic,
    rainRisk7d: p.rain,
    confirmations: p.confirmations,
    reportedAt: `${p.ageHours}h ago`,
    slaHours: sla,
    ageHours: p.ageHours,
    contractor: p.contractor,
    anonymous: p.anonymous ?? false,
    channel: p.channel,
    impact,
    analysis: {
      isCivicIssue: true,
      damageType: p.damageType,
      severity: p.severity,
      estimatedDepthCm: p.depth,
      widthEstimate: '~0.6 m across',
      rootCause: p.rootCause,
      repairBrief: p.brief,
      materials: ['Hot-mix asphalt', 'Tack coat', 'Road paint'],
      estimatedCostRange: p.cost,
      confidence: 90,
      publicSummary: `${p.severity} ${p.damageType.toLowerCase()} reported at ${p.location}.`,
    },
    timeline: tl,
  };
}

export const SEED_ISSUES: Issue[] = [
  buildIssue({
    id: 'RS-1042', damageType: 'Pothole', severity: 'Critical', status: 'Work Order',
    ward: 'Jnanabharathi', wardId: 45, location: 'Outer Ring Rd × School Junction', lat: 12.94, lng: 77.51,
    zone: 'School Zone', traffic: 94, rain: 78, depth: 22, confirmations: 27, ageHours: 6,
    contractor: 'Namma Civil Crew', cost: [6500, 9500], channel: 'WhatsApp',
    brief: 'Deep crater beside school gate. Saw-cut perimeter, hot-mix in 2 lifts, compact.',
    rootCause: 'Subbase washout from leaking stormwater drain upstream.',
  }),
  buildIssue({
    id: 'RS-1039', damageType: 'Road Cave-in', severity: 'Critical', status: 'In Progress',
    ward: 'Horamavu', wardId: 24, location: 'Banaswadi Main Rd near flyover', lat: 13.02, lng: 77.65,
    zone: 'Bridge Approach', traffic: 88, rain: 64, depth: 30, confirmations: 41, ageHours: 9,
    contractor: 'Sri Venkateshwara Infra', cost: [42000, 70000], channel: 'App',
    brief: 'Localised cave-in at bridge approach. Barricade, excavate, GSB refill + concrete.',
    rootCause: 'Soil erosion under approach slab after monsoon saturation.',
  }),
  buildIssue({
    id: 'RS-1051', damageType: 'Missing Manhole Cover', severity: 'Critical', status: 'Verified',
    ward: 'Bellandur', wardId: 112, location: 'Bellandur Gate Service Rd', lat: 12.92, lng: 77.67,
    zone: 'Arterial Road', traffic: 81, rain: 35, depth: 18, confirmations: 33, ageHours: 3,
    cost: [3500, 6000], channel: 'WhatsApp', anonymous: true,
    brief: 'Open manhole — immediate barricade + replace SFRC cover. Life-safety priority.',
    rootCause: 'Cover stolen / displaced; no immediate guard placed.',
  }),
  buildIssue({
    id: 'RS-1033', damageType: 'Pothole', severity: 'Deep', status: 'Reported',
    ward: 'Thanisandra', wardId: 25, location: 'Thanisandra Main Rd × Tech Park', lat: 13.06, lng: 77.62,
    zone: 'Arterial Road', traffic: 76, rain: 58, depth: 13, confirmations: 8, ageHours: 2,
    cost: [4000, 7500], channel: 'App',
    brief: 'Cold-mix insufficient. Recommend hot-mix patch after drying.',
    rootCause: 'Edge cracking widened by heavy two-wheeler load + rain.',
  }),
  buildIssue({
    id: 'RS-1028', damageType: 'Water Leakage', severity: 'Deep', status: 'Resolved',
    ward: 'Bellandur', wardId: 112, location: 'Green Glen Layout 4th Cross', lat: 12.93, lng: 77.68,
    zone: 'Residential Lane', traffic: 38, rain: 42, depth: 10, confirmations: 14, ageHours: 30,
    contractor: 'Metro RoadWorks Pvt Ltd', cost: [8000, 14000], channel: 'Web',
    brief: 'Pipeline joint leak undermining road. Excavate, replace joint, reinstate.',
    rootCause: 'Corroded GI pipeline joint seeping under carriageway.',
  }),
  buildIssue({
    id: 'RS-1019', damageType: 'Damaged Footpath', severity: 'Shallow', status: 'Reported',
    ward: 'Horamavu', wardId: 24, location: 'Kalkere Rd footpath', lat: 13.03, lng: 77.66,
    zone: 'Residential Lane', traffic: 22, rain: 30, depth: 5, confirmations: 3, ageHours: 5,
    cost: [3000, 5500], channel: 'App',
    brief: 'Broken paver blocks. Re-lay on fresh sand bed.',
    rootCause: 'Settlement after utility trenching not properly reinstated.',
  }),
  buildIssue({
    id: 'RS-1047', damageType: 'Broken Streetlight', severity: 'Shallow', status: 'Verified',
    ward: 'Jnanabharathi', wardId: 45, location: 'BU Campus Rd', lat: 12.95, lng: 77.50,
    zone: 'Arterial Road', traffic: 49, rain: 20, depth: 0, confirmations: 11, ageHours: 7,
    cost: [3000, 4500], channel: 'WhatsApp',
    brief: 'Replace luminaire + check feeder; dark stretch is an accident risk at night.',
    rootCause: 'Driver/luminaire failure on ageing pole.',
  }),
];
