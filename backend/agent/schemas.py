"""
Schemas and data structures for Recall agent and tools.
Compatible with Python 3.10 standard library and Pydantic.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    UNSUPPORTED = "unsupported"
    CONFLICTING = "conflicting"


class AgentMode(str, Enum):
    GEMINI = "gemini"
    DETERMINISTIC_FALLBACK = "deterministic_fallback"


class StoppingReason(str, Enum):
    GOAL_ACHIEVED = "goal_achieved"
    MAX_ROUNDS_REACHED = "max_rounds_reached"
    MAX_TOOLS_REACHED = "max_tools_reached"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    NO_HISTORY_FOUND = "no_history_found"


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]


@dataclass
class AgentEvent:
    timestamp: str
    round: int
    tool: str
    rationale: str
    arguments: Dict[str, Any]
    result_summary: str
    evidence_gathered_count: int


@dataclass
class BriefingData:
    id: str
    meetingId: str
    createdAt: str
    agentMode: str
    summary: str
    verifiedFacts: List[Dict[str, Any]]
    inferences: List[Dict[str, Any]]
    openCommitments: List[Dict[str, Any]]
    previousDecisions: List[Dict[str, Any]]
    conflicts: List[Dict[str, Any]]
    suggestedQuestions: List[str]
    unverifiedGaps: List[str]
    verificationOutcome: str
    executionId: str


@dataclass
class ExecutionRecord:
    id: str
    meetingId: str
    goal: str
    status: str
    startedAt: str
    finishedAt: Optional[str]
    stepCount: int
    toolCallCount: int
    stoppingReason: str
    agentMode: str
    events: List[Dict[str, Any]]
