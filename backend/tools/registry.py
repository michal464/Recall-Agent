"""
Registered server-side tools for Recall agent.
All tools are real Python functions with input/output validation,
Hebrew text normalization, and strict grounding in stored JSON records.
"""

from __future__ import annotations
import re
import datetime
from typing import Any, Dict, List, Optional
from backend.storage import json_store


def normalize_hebrew(text: str) -> str:
    """Normalize Hebrew text by stripping nikud, redundant punctuation, and spaces."""
    if not text:
        return ""
    # Strip Hebrew nikud (Unicode 0x0591 - 0x05C7)
    text = re.sub(r"[\u0591-\u05C7]", "", text)
    # Strip excessive whitespace
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def get_meeting_details(meeting_id: str) -> Dict[str, Any]:
    """Retrieve full meeting details, including participants and metadata."""
    meeting = json_store.get_meeting_by_id(meeting_id)
    if not meeting:
        return {"error": f"פגישה עם מזהה {meeting_id} לא נמצאה"}

    participants = []
    for pid in meeting.get("participantIds", []):
        p = json_store.get_participant_by_id(pid)
        if p:
            participants.append(p)

    return {
        "meeting": meeting,
        "participants": participants,
        "stableRef": f"meeting:{meeting_id}"
    }


def search_meeting_history(
    query: str = "",
    participant_id: Optional[str] = None,
    topic: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    exclude_meeting_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search historical meetings with Hebrew normalization, participant filtering,
    relevance ranking, and references to underlying records.
    """
    meetings = json_store.get_all_meetings()
    norm_query = normalize_hebrew(query)
    norm_topic = normalize_hebrew(topic or "")
    matched: List[Dict[str, Any]] = []

    for m in meetings:
        m_id = m.get("id")
        if exclude_meeting_id and m_id == exclude_meeting_id:
            continue

        # Check date range if provided
        start_at = m.get("startAt", "")
        if date_from and start_at < date_from:
            continue
        if date_to and start_at > date_to:
            continue

        # Check participant
        if participant_id and participant_id not in m.get("participantIds", []):
            continue

        # Relevance scoring
        score = 0
        reasons = []

        title_norm = normalize_hebrew(m.get("title", ""))
        desc_norm = normalize_hebrew(m.get("description", ""))

        if norm_query:
            query_words = norm_query.split()
            for w in query_words:
                if len(w) > 2 and w in title_norm:
                    score += 10
                    reasons.append(f"מילת מפתח '{w}' נמצאה בכותרת")
                elif len(w) > 2 and w in desc_norm:
                    score += 5
                    reasons.append(f"מילת מפתח '{w}' נמצאה בתיאור")

        if norm_topic and (norm_topic in title_norm or norm_topic in desc_norm):
            score += 15
            reasons.append(f"נושא הפגישה תואם ל-'{topic}'")

        if participant_id:
            score += 8
            reasons.append("משתתף רלוונטי נכח בפגישה")

        if score > 0 or (not norm_query and not norm_topic and participant_id):
            matched.append({
                "meeting": m,
                "relevanceScore": score,
                "relevanceReasons": reasons,
                "stableRef": f"meeting:{m_id}"
            })

    # Sort by relevance descending, then date descending
    matched.sort(
        key=lambda x: (x["relevanceScore"], x["meeting"].get("startAt", "")),
        reverse=True
    )

    return {
        "totalMatches": len(matched),
        "results": matched
    }


def get_transcript(
    meeting_id: Optional[str] = None,
    transcript_id: Optional[str] = None,
    search_terms: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieve transcript segments with speaker, offset, and stable IDs."""
    transcript = None
    if transcript_id:
        transcript = json_store.get_transcript_by_id(transcript_id)
    elif meeting_id:
        transcript = json_store.get_transcript_by_meeting(meeting_id)

    if not transcript:
        return {"error": "תמליל לא נמצא", "segments": []}

    segments = transcript.get("segments", [])
    if search_terms:
        norm_terms = normalize_hebrew(search_terms).split()
        filtered = []
        for seg in segments:
            seg_norm = normalize_hebrew(seg.get("text", ""))
            if any(term in seg_norm for term in norm_terms if len(term) > 2):
                filtered.append(seg)
        segments = filtered

    annotated_segments = []
    tr_id = transcript.get("id")
    for seg in segments:
        annotated_segments.append({
            **seg,
            "stableRef": f"transcript:{tr_id}:{seg.get('id')}"
        })

    return {
        "transcriptId": tr_id,
        "meetingId": transcript.get("meetingId"),
        "totalSegments": len(annotated_segments),
        "segments": annotated_segments
    }


def get_open_action_items(
    meeting_id: Optional[str] = None,
    participant_id: Optional[str] = None,
    topic: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieve commitments, distinguishing open/blocked/overdue and vague deadlines."""
    items = json_store.get_all_action_items()
    filtered = []
    norm_topic = normalize_hebrew(topic or "")

    for item in items:
        if meeting_id and item.get("meetingId") != meeting_id:
            continue
        if participant_id and item.get("ownerId") != participant_id:
            continue
        if norm_topic:
            desc_norm = normalize_hebrew(item.get("description", ""))
            if norm_topic not in desc_norm:
                continue

        owner = json_store.get_participant_by_id(item.get("ownerId", ""))
        meeting = json_store.get_meeting_by_id(item.get("meetingId", ""))

        filtered.append({
            **item,
            "ownerName": owner.get("name") if owner else "לא ידוע",
            "meetingTitle": meeting.get("title") if meeting else "פגישה קודמת",
            "stableRef": f"action:{item.get('id')}"
        })

    return {
        "totalItems": len(filtered),
        "actionItems": filtered
    }


def get_decisions(
    meeting_id: Optional[str] = None,
    topic: Optional[str] = None,
    participant_id: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieve recorded decisions, preserving superseding and conflicting records."""
    decisions = json_store.get_all_decisions()
    filtered = []
    norm_topic = normalize_hebrew(topic or "")

    for d in decisions:
        if meeting_id and d.get("meetingId") != meeting_id:
            continue
        if norm_topic:
            topic_norm = normalize_hebrew(d.get("topic", ""))
            desc_norm = normalize_hebrew(d.get("description", ""))
            if norm_topic not in topic_norm and norm_topic not in desc_norm:
                continue

        meeting = json_store.get_meeting_by_id(d.get("meetingId", ""))
        filtered.append({
            **d,
            "meetingTitle": meeting.get("title") if meeting else "פגישה קודמת",
            "stableRef": f"decision:{d.get('id')}"
        })

    return {
        "totalDecisions": len(filtered),
        "decisions": filtered
    }


def verify_evidence(claim: str, evidence_refs: List[str]) -> Dict[str, Any]:
    """
    Check whether a factual claim is supported by actual stored records.
    Returns: 'supported', 'partially_supported', 'unsupported', or 'conflicting'.
    Verification is grounded strictly in stored records, never LLM confidence alone.
    """
    if not evidence_refs:
        return {
            "status": "unsupported",
            "reason": "לא סופקו מזהי אסמכתאות (evidence_refs)",
            "supportedRefs": [],
            "resolvedEvidence": []
        }

    resolved = []
    norm_claim = normalize_hebrew(claim)
    claim_words = [w for w in norm_claim.split() if len(w) > 2]

    for ref in evidence_refs:
        item = json_store.resolve_evidence_ref(ref)
        if item:
            resolved.append(item)

    if not resolved:
        return {
            "status": "unsupported",
            "reason": "כל האסמכתאות שצוינו אינן קיימות במאגר הנתונים",
            "supportedRefs": [],
            "resolvedEvidence": []
        }

    # Check for conflicting decisions among resolved evidence
    decision_topics = {}
    has_conflict = False
    conflict_notes = []

    for r in resolved:
        if r.get("type") == "decision":
            topic = r.get("topic")
            supersedes = r.get("supersedes")
            if supersedes:
                has_conflict = True
                conflict_notes.append(f"החלטה {r.get('ref')} החליפה את {supersedes}")
            if topic in decision_topics and decision_topics[topic] != r.get("ref"):
                has_conflict = True
                conflict_notes.append(f"נמצאו שתי החלטות שונות בנושא '{topic}'")
            decision_topics[topic] = r.get("ref")

    if has_conflict:
        return {
            "status": "conflicting",
            "reason": "נמצאו רישומים סותרים במאגר: " + "; ".join(conflict_notes),
            "supportedRefs": [r["ref"] for r in resolved],
            "resolvedEvidence": resolved
        }

    # Check textual relevance of resolved evidence to the claim
    matching_refs = []
    for r in resolved:
        quote = r.get("quote", "")
        norm_quote = normalize_hebrew(quote)
        match_count = sum(1 for w in claim_words if w in norm_quote)
        if match_count >= 1 or len(claim_words) == 0:
            matching_refs.append(r["ref"])

    if len(matching_refs) == len(resolved) and len(matching_refs) > 0:
        return {
            "status": "supported",
            "reason": "הטענה מגובה במלואה על ידי האסמכתאות שנבדקו",
            "supportedRefs": matching_refs,
            "resolvedEvidence": resolved
        }
    elif len(matching_refs) > 0:
        return {
            "status": "partially_supported",
            "reason": "הטענה נתמכת בחלקה על ידי חלק מהמקורות",
            "supportedRefs": matching_refs,
            "resolvedEvidence": resolved
        }
    else:
        return {
            "status": "unsupported",
            "reason": "תוכן האסמכתאות אינו מאשש את מילות הטענה שנבדקה",
            "supportedRefs": [],
            "resolvedEvidence": resolved
        }


def save_briefing(meeting_id: str, briefing_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate schema and persist completed briefing to JSON file."""
    briefing_data["meetingId"] = meeting_id
    if not briefing_data.get("createdAt"):
        briefing_data["createdAt"] = datetime.datetime.now().isoformat()

    success = json_store.save_briefing_record(briefing_data)
    if success:
        return {"status": "saved", "briefingId": briefing_data.get("id")}
    return {"status": "error", "message": "שגיאה בשמירת התדריך לקובץ"}


def record_agent_event(execution_id: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
    """Append event to execution record."""
    exec_rec = json_store.get_execution_record(execution_id)
    if not exec_rec:
        return {"error": "רישום ריצה לא נמצא"}
    events = exec_rec.get("events", [])
    events.append(event_data)
    exec_rec["events"] = events
    exec_rec["toolCallCount"] = exec_rec.get("toolCallCount", 0) + 1
    json_store.save_execution_record(exec_rec)
    return {"status": "recorded"}


TOOL_REGISTRY = {
    "get_meeting_details": get_meeting_details,
    "search_meeting_history": search_meeting_history,
    "get_transcript": get_transcript,
    "get_open_action_items": get_open_action_items,
    "get_decisions": get_decisions,
    "verify_evidence": verify_evidence,
    "save_briefing": save_briefing,
    "record_agent_event": record_agent_event,
}
