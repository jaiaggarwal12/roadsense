// ---------------------------------------------------------------------------
// RoadSense AI — Core domain model
// ---------------------------------------------------------------------------

export type DamageType =
  | 'Pothole'
  | 'Road Cave-in'
  | 'Broken Divider'
  | 'Missing Manhole Cover'
  | 'Damaged Footpath'
  | 'Water Leakage'
  | 'Broken Streetlight'
  | 'Garbage Hotspot'
  | 'Other';

export type Severity = 'Hairline' | 'Shallow' | 'Deep' | 'Critical';

export type IssueStatus =
  | 'Reported'
  | 'Verified'
  | 'Work Order'
  | 'In Progress'
  | 'Resolved';

export type ZoneType =
  | 'School Zone'
  | 'Hospital Zone'
  | 'Expressway'
  | 'Bridge Approach'
  | 'Arterial Road'
  | 'Residential Lane'
  | 'Market';

/** Output of the Gemini Vision Detection Agent. */
export interface VisionAnalysis {
  isCivicIssue: boolean;
  damageType: DamageType;
  severity: Severity;
  estimatedDepthCm: number;
  widthEstimate: string;
  rootCause: string;
  repairBrief: string;
  materials: string[];
  estimatedCostRange: [number, number];
  confidence: number; // 0-100
  publicSummary: string;
}

/** Breakdown of the four weighted Impact Score factors. */
export interface ImpactScore {
  total: number; // 0-100
  physicalSeverity: number;
  trafficVolume: number;
  zoneRisk: number;
  rainVulnerability: number;
}

export interface TimelineEvent {
  status: IssueStatus | 'Confirmation';
  label: string;
  timestamp: string;
  detail?: string;
}

export interface Issue {
  id: string;
  imageUrl: string;
  afterImageUrl?: string;
  damageType: DamageType;
  severity: Severity;
  status: IssueStatus;
  ward: string;
  wardId: number;
  location: string;
  lat: number;
  lng: number;
  zone: ZoneType;
  trafficScore: number; // 0-100, derived from Maps traffic
  rainRisk7d: number; // 0-100, derived from Earth Engine forecast
  confirmations: number;
  reportedAt: string;
  analysis: VisionAnalysis;
  impact: ImpactScore;
  timeline: TimelineEvent[];
  contractor?: string;
  slaHours: number;
  ageHours: number;
  anonymous: boolean;
  channel: 'App' | 'WhatsApp' | 'Web';
}

export interface Contractor {
  id: string;
  name: string;
  available: boolean;
  proximityKm: number;
  jobsDone: number;
  repeatFailureRate: number; // 0-1
  amountPaid: number; // ₹
  blacklisted: boolean;
}

export interface Ward {
  id: number;
  name: string;
  avgResponseDays: number;
  openIssues: number;
  resolvedThisMonth: number;
  resolutionRate: number; // 0-1
}

export type AgentName =
  | 'Detection'
  | 'Deduplication'
  | 'Prioritisation'
  | 'Dispatch'
  | 'Monitoring'
  | 'Audit';

export interface AgentStep {
  agent: AgentName;
  title: string;
  status: 'pending' | 'running' | 'done';
  detail?: string;
}

export type View = 'landing' | 'report' | 'government' | 'crew' | 'public' | 'about';
