export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type IncidentStatus = 'Active' | 'Investigating' | 'Resolved';

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  logs: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  rootCause: string | null;
  resolution: string | null;
  runbookId: string | null;
  impactDuration: string | null;
  affectedUsers: string | null;
  lessonsLearned: string | null;
}

export interface Runbook {
  id: string;
  name: string;
  service: string;
  description: string;
  severity: Severity;
  steps: string[];
  verificationSteps: string[];
  notes: string | null;
}

export interface Postmortem {
  id: string;
  incidentId: string;
  rootCause: string;
  resolutionSteps: string;
  runbookUsed: string | null;
  lessonsLearned: string;
  additionalNotes: string | null;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  incidentId: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  incidentId: string;
  role: 'user' | 'agent';
  content: string;
  createdAt: string;
}

export interface RecalledIncidentSummary {
  incidentId: string;
  title: string;
  service: string;
  severity: Severity;
  relevance: 'Matched' | 'Similar' | 'Related';
  resolutionTime: string | null;
  rootCauseSummary: string | null;
  runbookId: string | null;
  memoryText: string;
}

export interface RecallOutcome {
  usedHindsight: boolean;
  memoriesFound: number;
  recalledIncidents: RecalledIncidentSummary[];
  rawMemoryTexts: string[];
  error?: string;
}

export interface AgentAnalysis {
  summary: string;
  evidence: string[];
  historicalContext: string[];
  likelyRootCause: string;
  recommendedActions: string[];
  suggestedRunbookId: string | null;
  risksToVerify: string[];
  usedFallback: boolean;
  fallbackReason?: string;
}
