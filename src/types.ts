export interface Participant {
  id: string;
  name: string;
  role: string;
  organization: string;
}

export interface Meeting {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  participantIds: string[];
  transcriptIds: string[];
  description: string;
  hasBriefing?: boolean;
  briefingId?: string | null;
}

export interface ExecutionEvent {
  timestamp: string;
  round: number;
  tool: string;
  rationale: string;
  arguments: Record<string, any>;
  result_summary: string;
  evidence_gathered_count: number;
}

export interface ExecutionRecord {
  id: string;
  meetingId: string;
  goal: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  stepCount: number;
  toolCallCount: number;
  stoppingReason: string;
  agentMode: string;
  events: ExecutionEvent[];
}

export interface Briefing {
  id: string;
  meetingId: string;
  createdAt: string;
  agentMode: string;
  summary: string;
  verifiedFacts: Array<{
    fact: string;
    status: string;
    evidenceRefs: string[];
  }>;
  inferences: Array<{
    inference: string;
    basedOnRefs: string[];
  }>;
  openCommitments: Array<{
    id: string;
    description: string;
    ownerName: string;
    status: string;
    dueAt: string | null;
    originalDueText: string;
    evidenceRefs: string[];
    isOverdue?: boolean;
  }>;
  previousDecisions: Array<{
    id: string;
    topic: string;
    description: string;
    status: string;
    evidenceRefs: string[];
    createdAt: string;
  }>;
  conflicts: Array<{
    topic: string;
    decisionA: {
      id: string;
      description: string;
      evidenceRefs: string[];
      createdAt: string;
    };
    decisionB: {
      id: string;
      description: string;
      evidenceRefs: string[];
      createdAt: string;
    };
    status: string;
  }>;
  suggestedQuestions: string[];
  unverifiedGaps: string[];
  verificationOutcome: string;
  executionId: string;
  stoppingReason?: string;
}

export interface EvidenceDetail {
  ref: string;
  type: string;
  quote?: string;
  speakerName?: string;
  speakerId?: string;
  meetingId?: string;
  meetingTitle?: string;
  meetingDate?: string;
  offsetSeconds?: number;
  topic?: string;
  status?: string;
  supersedes?: string | null;
  ownerName?: string;
  dueAt?: string | null;
  originalDueText?: string;
  verified: boolean;
}
