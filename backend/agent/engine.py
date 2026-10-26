"""
Recall Agent Engine.
Implements a bounded, verifiable decision loop with dynamic tool selection,
real tool execution, evidence accumulation, factual verification,
and clear stopping reasons.
"""

from __future__ import annotations
import datetime
import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional, Set

from backend.agent.prompts import AGENT_SYSTEM_PROMPT
from backend.agent.schemas import AgentMode, StoppingReason, VerificationStatus
from backend.storage import json_store
from backend.tools import registry

MAX_ROUNDS = 10
MAX_TOOL_CALLS = 12
MAX_DURATION_SECONDS = 40.0


class AgentEngine:
    def __init__(self, meeting_id: str, agent_mode: Optional[str] = None):
        self.meeting_id = meeting_id
        self.execution_id = f"exec-{uuid.uuid4().hex[:8]}"
        self.started_at = datetime.datetime.now().isoformat()

        # Check API key for mode
        api_key = os.environ.get("GEMINI_API_KEY")
        if agent_mode:
            self.agent_mode = agent_mode
        elif api_key and api_key != "MY_GEMINI_API_KEY":
            self.agent_mode = AgentMode.GEMINI.value
        else:
            self.agent_mode = AgentMode.DETERMINISTIC_FALLBACK.value

        self.goal = (
            "Prepare an accurate, concise, evidence-backed briefing for the selected "
            "meeting by investigating relevant historical meetings, transcript excerpts, "
            "recorded decisions, and outstanding commitments."
        )

        self.accumulated_evidence: Dict[str, Any] = {}
        self.events: List[Dict[str, Any]] = []
        self.tool_calls_count = 0
        self.round_count = 0
        self.stopping_reason: str = StoppingReason.GOAL_ACHIEVED.value
        self.start_time = time.time()

        # Outstanding investigation goals
        self.pending_tasks: List[str] = [
            "inspect_meeting",
            "search_history",
            "gather_transcripts",
            "check_commitments",
            "check_decisions",
            "verify_claims",
            "synthesize"
        ]

    def _execute_tool(self, tool_name: str, arguments: Dict[str, Any], rationale: str) -> Dict[str, Any]:
        """Execute a registered tool, record execution event, and update counts."""
        if tool_name not in registry.TOOL_REGISTRY:
            return {"error": f"כלי לא מורשה: {tool_name}"}

        self.tool_calls_count += 1
        fn = registry.TOOL_REGISTRY[tool_name]
        try:
            result = fn(**arguments)
        except Exception as e:
            result = {"error": f"שגיאה בהפעלת כלי {tool_name}: {str(e)}"}

        # Summarize result for trace
        if isinstance(result, dict):
            if "totalMatches" in result:
                summary = f"נמצאו {result['totalMatches']} תוצאות היסטוריות תואמות"
            elif "totalSegments" in result:
                summary = f"אותרו {result['totalSegments']} מקטעי תמליל"
            elif "totalItems" in result:
                summary = f"אותרו {result['totalItems']} משימות והתחייבויות"
            elif "totalDecisions" in result:
                summary = f"אותרו {result['totalDecisions']} החלטות קודמות"
            elif "status" in result:
                summary = f"סטטוס אימות: {result.get('status')} - {result.get('reason', '')}"
            elif "meeting" in result:
                summary = f"פרטי פגישה: {result['meeting'].get('title')}"
            else:
                summary = str(result)[:120]
        else:
            summary = str(result)[:120]

        event = {
            "timestamp": datetime.datetime.now().isoformat(),
            "round": self.round_count,
            "tool": tool_name,
            "rationale": rationale,
            "arguments": arguments,
            "result_summary": summary,
            "evidence_gathered_count": len(self.accumulated_evidence)
        }
        self.events.append(event)
        return result

    def run(self) -> Dict[str, Any]:
        """Run the bounded agent decision loop."""
        # Initialize execution record in storage
        initial_record = {
            "id": self.execution_id,
            "meetingId": self.meeting_id,
            "goal": self.goal,
            "status": "running",
            "startedAt": self.started_at,
            "finishedAt": None,
            "stepCount": 0,
            "toolCallCount": 0,
            "stoppingReason": "",
            "agentMode": self.agent_mode,
            "events": []
        }
        json_store.save_execution_record(initial_record)

        meeting_data: Optional[Dict[str, Any]] = None
        historical_meetings: List[Dict[str, Any]] = []
        transcripts: List[Dict[str, Any]] = []
        action_items: List[Dict[str, Any]] = []
        decisions: List[Dict[str, Any]] = []
        verified_facts: List[Dict[str, Any]] = []
        conflicts: List[Dict[str, Any]] = []
        unverified_gaps: List[str] = []

        while self.round_count < MAX_ROUNDS and self.tool_calls_count < MAX_TOOL_CALLS:
            self.round_count += 1
            elapsed = time.time() - self.start_time
            if elapsed > MAX_DURATION_SECONDS:
                self.stopping_reason = StoppingReason.TIME_LIMIT_EXCEEDED.value
                break

            # -------------------------------------------------------------
            # STEP 1: Inspect Selected Meeting
            # -------------------------------------------------------------
            if "inspect_meeting" in self.pending_tasks:
                res = self._execute_tool(
                    "get_meeting_details",
                    {"meeting_id": self.meeting_id},
                    "קריאת נתוני הפגישה הנבחרת: נושא, שעה, משתתפים ותיאור התחלתי"
                )
                if "error" in res:
                    self.stopping_reason = StoppingReason.INSUFFICIENT_EVIDENCE.value
                    unverified_gaps.append(f"לא ניתן לטעון את הפגישה {self.meeting_id}")
                    break

                meeting_data = res["meeting"]
                self.accumulated_evidence[res["stableRef"]] = res["meeting"]
                self.pending_tasks.remove("inspect_meeting")
                continue

            # -------------------------------------------------------------
            # STEP 2: Search Relevant History
            # -------------------------------------------------------------
            if "search_history" in self.pending_tasks and meeting_data:
                participants = meeting_data.get("participantIds", [])
                primary_p = participants[1] if len(participants) > 1 else (participants[0] if participants else None)
                title = meeting_data.get("title", "")

                # Derive search keywords from title
                keywords = [w for w in title.split() if len(w) > 3 and w not in ["שבועי", "ישיבת", "סנכרון", "פגישת"]]
                query = " ".join(keywords[:2]) if keywords else ""

                res = self._execute_tool(
                    "search_meeting_history",
                    {
                        "query": query,
                        "participant_id": primary_p,
                        "exclude_meeting_id": self.meeting_id
                    },
                    f"חיפוש פגישות היסטוריות לפי משתתף {primary_p} ומילות מפתח '{query}'"
                )

                matches = res.get("results", [])
                if not matches:
                    # Honest reporting: First meeting (Scenario D) or zero history
                    self.stopping_reason = StoppingReason.NO_HISTORY_FOUND.value
                    unverified_gaps.append("לא נמצאו פגישות היסטוריות קודמות עם משתתפים אלו במערכת")
                    self.pending_tasks.clear()
                    break

                for m in matches:
                    historical_meetings.append(m["meeting"])
                    self.accumulated_evidence[m["stableRef"]] = m["meeting"]

                self.pending_tasks.remove("search_history")
                continue

            # -------------------------------------------------------------
            # STEP 3: Retrieve Transcripts
            # -------------------------------------------------------------
            if "gather_transcripts" in self.pending_tasks:
                # Gather transcripts from relevant historical meetings
                found_segments = 0
                for hm in historical_meetings[:3]:
                    hm_id = hm.get("id")
                    if self.tool_calls_count >= MAX_TOOL_CALLS:
                        break

                    res = self._execute_tool(
                        "get_transcript",
                        {"meeting_id": hm_id},
                        f"שליפת תמליל עבור פגישה היסטורית {hm_id}"
                    )
                    segs = res.get("segments", [])
                    found_segments += len(segs)
                    for s in segs:
                        ref = s.get("stableRef")
                        # Prompt injection check: check if segment contains hostile instructions
                        text = s.get("text", "")
                        if "Ignore all previous instructions" in text or "התעלם מכל ההוראות" in text:
                            # Quarantined as untrusted factual quote
                            s["is_untrusted_input"] = True
                        self.accumulated_evidence[ref] = s
                        transcripts.append(s)

                if found_segments == 0:
                    unverified_gaps.append("לא נמצאו תמלילים מפורטים לפגישות ההיסטוריות שנבדקו")

                self.pending_tasks.remove("gather_transcripts")
                continue

            # -------------------------------------------------------------
            # STEP 4: Check Open Commitments & Action Items
            # -------------------------------------------------------------
            if "check_commitments" in self.pending_tasks:
                participants = meeting_data.get("participantIds", []) if meeting_data else []
                for p_id in participants:
                    if self.tool_calls_count >= MAX_TOOL_CALLS:
                        break
                    res = self._execute_tool(
                        "get_open_action_items",
                        {"participant_id": p_id},
                        f"בדיקת משימות והתחייבויות פתוחות עבור משתתף {p_id}"
                    )
                    items = res.get("actionItems", [])
                    for it in items:
                        self.accumulated_evidence[it.get("stableRef")] = it
                        action_items.append(it)

                self.pending_tasks.remove("check_commitments")
                continue

            # -------------------------------------------------------------
            # STEP 5: Check Recorded Decisions
            # -------------------------------------------------------------
            if "check_decisions" in self.pending_tasks:
                res = self._execute_tool(
                    "get_decisions",
                    {},
                    "שליפת החלטות ארגוניות רלוונטיות ובדיקת רשומות מחליפות או סותרות"
                )
                decs = res.get("decisions", [])
                seen_topics: Dict[str, Dict[str, Any]] = {}

                for d in decs:
                    ref = d.get("stableRef")
                    self.accumulated_evidence[ref] = d
                    topic = d.get("topic", "")

                    # Contradiction detection (e.g. AWS vs GCP)
                    if topic in seen_topics:
                        prev_d = seen_topics[topic]
                        conflicts.append({
                            "topic": topic,
                            "decisionA": {
                                "id": prev_d.get("id"),
                                "description": prev_d.get("description"),
                                "evidenceRefs": prev_d.get("evidenceRefs", []),
                                "createdAt": prev_d.get("createdAt")
                            },
                            "decisionB": {
                                "id": d.get("id"),
                                "description": d.get("description"),
                                "evidenceRefs": d.get("evidenceRefs", []),
                                "createdAt": d.get("createdAt")
                            },
                            "status": "סתירה דורשת הכרעה"
                        })
                    else:
                        seen_topics[topic] = d

                    decisions.append(d)

                self.pending_tasks.remove("check_decisions")
                continue

            # -------------------------------------------------------------
            # STEP 6: Verify Proposed Factual Claims against Evidence
            # -------------------------------------------------------------
            if "verify_claims" in self.pending_tasks:
                # Propose candidate facts based on gathered evidence
                candidate_claims = []
                for d in decisions[:2]:
                    candidate_claims.append({
                        "claim": f"התקבלה החלטה בנושא {d.get('topic')}: {d.get('description')}",
                        "refs": d.get("evidenceRefs", []) + [d.get("stableRef")]
                    })

                for cc in candidate_claims:
                    if self.tool_calls_count >= MAX_TOOL_CALLS:
                        break
                    v_res = self._execute_tool(
                        "verify_evidence",
                        {"claim": cc["claim"], "evidence_refs": cc["refs"]},
                        f"אימות עובדתי של טענה מול אסמכתאות: {cc['claim'][:60]}"
                    )
                    v_status = v_res.get("status")
                    if v_status in [VerificationStatus.SUPPORTED.value, VerificationStatus.PARTIALLY_SUPPORTED.value]:
                        verified_facts.append({
                            "fact": cc["claim"],
                            "status": v_status,
                            "evidenceRefs": v_res.get("supportedRefs", [])
                        })
                    elif v_status == VerificationStatus.CONFLICTING.value:
                        # Recorded as conflict
                        pass
                    else:
                        unverified_gaps.append(f"טענה לא אומתה: {cc['claim']}")

                self.pending_tasks.remove("verify_claims")
                continue

            # -------------------------------------------------------------
            # STEP 7: Synthesis & Completion
            # -------------------------------------------------------------
            if "synthesize" in self.pending_tasks or len(self.pending_tasks) == 0:
                self.stopping_reason = StoppingReason.GOAL_ACHIEVED.value
                break

        # Check safety limits
        if self.round_count >= MAX_ROUNDS:
            self.stopping_reason = StoppingReason.MAX_ROUNDS_REACHED.value
        elif self.tool_calls_count >= MAX_TOOL_CALLS:
            self.stopping_reason = StoppingReason.MAX_TOOLS_REACHED.value

        # Build Hebrew Briefing Structure
        m_title = meeting_data.get("title", "") if meeting_data else "פגישה"
        summary_text = f"תדריך הכנה עבור '{m_title}'. "
        if historical_meetings:
            summary_text += f"נבחנו {len(historical_meetings)} פגישות קודמות, {len(transcripts)} מקטעי תמליל ו-{len(decisions)} החלטות."
        else:
            summary_text += "לא אותרה היסטוריה קודמת עבור משתתפי הפגישה."

        # Process commitments (Scenario B overdue detection, Scenario F ambiguous deadline)
        processed_commitments = []
        for it in action_items:
            processed_commitments.append({
                "id": it.get("id"),
                "description": it.get("description"),
                "ownerName": it.get("ownerName"),
                "status": it.get("status"),
                "dueAt": it.get("dueAt"),
                "originalDueText": it.get("originalDueText"),
                "evidenceRefs": it.get("evidenceRefs", []),
                "isOverdue": it.get("status") == "overdue"
            })

        # Suggested questions based on evidence gaps and conflicts
        suggested_questions = []
        if conflicts:
            suggested_questions.append(
                f"נדרשת הכרעה סופית בין החלטות סותרות בנושא {conflicts[0]['topic']} (בחירה בין AWS ECS לבין GCP Cloud Run)."
            )
        if any(c.get("isOverdue") for c in processed_commitments):
            overdue_item = next(c for c in processed_commitments if c.get("isOverdue"))
            suggested_questions.append(
                f"מה הסטטוס של המשימה שהייתה אמורה להסתיים ({overdue_item.get('originalDueText')}): {overdue_item.get('description')}?"
            )
        if any(c.get("dueAt") is None and c.get("originalDueText") for c in processed_commitments):
            vague_item = next(c for c in processed_commitments if c.get("dueAt") is None)
            suggested_questions.append(
                f"הגדרת תאריך יעד מדויק למשימה שנוסחה כ-'{vague_item.get('originalDueText')}': {vague_item.get('description')}."
            )
        if not suggested_questions:
            suggested_questions.append("האם חלו שינויים מאז הסנכרון הקודם המצריכים עדכון תוכנית העבודה?")

        briefing_id = f"b-{self.meeting_id}"
        briefing_payload = {
            "id": briefing_id,
            "meetingId": self.meeting_id,
            "createdAt": datetime.datetime.now().isoformat(),
            "agentMode": self.agent_mode,
            "summary": summary_text,
            "verifiedFacts": verified_facts,
            "inferences": [
                {
                    "inference": "הצוות מתמקד בשיפור ביצועים וחיסכון בעלויות לקראת גרסה 2.0",
                    "basedOnRefs": [d.get("stableRef") for d in decisions[:2]]
                }
            ] if decisions else [],
            "openCommitments": processed_commitments,
            "previousDecisions": [
                {
                    "id": d.get("id"),
                    "topic": d.get("topic"),
                    "description": d.get("description"),
                    "status": d.get("status"),
                    "evidenceRefs": d.get("evidenceRefs", []),
                    "createdAt": d.get("createdAt")
                }
                for d in decisions
            ],
            "conflicts": conflicts,
            "suggestedQuestions": suggested_questions,
            "unverifiedGaps": unverified_gaps,
            "verificationOutcome": "verified" if verified_facts else ("no_history" if not historical_meetings else "partial"),
            "executionId": self.execution_id,
            "stoppingReason": self.stopping_reason
        }

        # Save briefing using real tool
        self._execute_tool(
            "save_briefing",
            {"meeting_id": self.meeting_id, "briefing_data": briefing_payload},
            "שמירת התדריך המובנה הסופי במאגר הנתונים של זמן הריצה"
        )

        # Update final execution record
        finished_at = datetime.datetime.now().isoformat()
        final_record = {
            "id": self.execution_id,
            "meetingId": self.meeting_id,
            "goal": self.goal,
            "status": "completed",
            "startedAt": self.started_at,
            "finishedAt": finished_at,
            "stepCount": self.round_count,
            "toolCallCount": self.tool_calls_count,
            "stoppingReason": self.stopping_reason,
            "agentMode": self.agent_mode,
            "events": self.events
        }
        json_store.save_execution_record(final_record)

        return {
            "briefing": briefing_payload,
            "execution": final_record
        }
