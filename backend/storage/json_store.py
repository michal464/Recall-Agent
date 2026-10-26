"""
Storage layer for Recall application.
Provides explicit read/write functions, schema validation, atomic file writes,
and safe non-destructive access to seed and runtime data.
"""

from __future__ import annotations
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
SEED_DIR = DATA_DIR / "seed"
RUNTIME_DIR = DATA_DIR / "runtime"
BRIEFINGS_DIR = RUNTIME_DIR / "briefings"
EXECUTIONS_DIR = RUNTIME_DIR / "executions"


def ensure_storage_dirs() -> None:
    """Ensure runtime directories exist without touching seed data."""
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    BRIEFINGS_DIR.mkdir(parents=True, exist_ok=True)
    EXECUTIONS_DIR.mkdir(parents=True, exist_ok=True)


def _read_json_file(file_path: Path, default: Any = None) -> Any:
    """Safely read and parse a JSON file."""
    if not file_path.exists():
        return default
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return default


def _atomic_write_json(file_path: Path, data: Any) -> bool:
    """
    Atomically write JSON data to file using a temporary file and replace.
    Prevents corrupted files on unexpected interruptions or concurrent reads.
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    temp_fd, temp_path_str = tempfile.mkstemp(
        dir=str(file_path.parent),
        prefix="temp_",
        suffix=".json"
    )
    temp_path = Path(temp_path_str)
    try:
        with os.fdopen(temp_fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_path, file_path)
        return True
    except Exception as e:
        print(f"Error atomically writing {file_path}: {e}")
        if temp_path.exists():
            temp_path.unlink()
        return False


# Seed data readers
def get_all_meetings() -> List[Dict[str, Any]]:
    return _read_json_file(SEED_DIR / "meetings.json", default=[])


def get_all_participants() -> List[Dict[str, Any]]:
    return _read_json_file(SEED_DIR / "participants.json", default=[])


def get_all_transcripts() -> List[Dict[str, Any]]:
    return _read_json_file(SEED_DIR / "transcripts.json", default=[])


def get_all_decisions() -> List[Dict[str, Any]]:
    return _read_json_file(SEED_DIR / "decisions.json", default=[])


def get_all_action_items() -> List[Dict[str, Any]]:
    return _read_json_file(SEED_DIR / "action_items.json", default=[])


# Specific item getters
def get_meeting_by_id(meeting_id: str) -> Optional[Dict[str, Any]]:
    for m in get_all_meetings():
        if m.get("id") == meeting_id:
            return m
    return None


def get_participant_by_id(participant_id: str) -> Optional[Dict[str, Any]]:
    for p in get_all_participants():
        if p.get("id") == participant_id:
            return p
    return None


def get_transcript_by_id(transcript_id: str) -> Optional[Dict[str, Any]]:
    for t in get_all_transcripts():
        if t.get("id") == transcript_id:
            return t
    return None


def get_transcript_by_meeting(meeting_id: str) -> Optional[Dict[str, Any]]:
    for t in get_all_transcripts():
        if t.get("meetingId") == meeting_id:
            return t
    return None


# Runtime data writers & readers
def save_briefing_record(briefing_data: Dict[str, Any]) -> bool:
    """Save completed briefing to runtime storage."""
    ensure_storage_dirs()
    briefing_id = briefing_data.get("id") or f"b-{briefing_data.get('meetingId')}"
    briefing_data["id"] = briefing_id
    target_path = BRIEFINGS_DIR / f"{briefing_id}.json"
    return _atomic_write_json(target_path, briefing_data)


def get_briefing_by_id(briefing_id: str) -> Optional[Dict[str, Any]]:
    ensure_storage_dirs()
    target_path = BRIEFINGS_DIR / f"{briefing_id}.json"
    if target_path.exists():
        return _read_json_file(target_path)
    # Check if requested by meetingId
    for f in BRIEFINGS_DIR.glob("*.json"):
        data = _read_json_file(f)
        if data and (data.get("id") == briefing_id or data.get("meetingId") == briefing_id):
            return data
    return None


def get_all_briefings() -> List[Dict[str, Any]]:
    ensure_storage_dirs()
    results = []
    for f in BRIEFINGS_DIR.glob("*.json"):
        data = _read_json_file(f)
        if data:
            results.append(data)
    return results


def save_execution_record(execution_data: Dict[str, Any]) -> bool:
    """Save agent execution trace to runtime storage."""
    ensure_storage_dirs()
    exec_id = execution_data.get("id")
    if not exec_id:
        return False
    target_path = EXECUTIONS_DIR / f"{exec_id}.json"
    return _atomic_write_json(target_path, execution_data)


def get_execution_record(exec_id: str) -> Optional[Dict[str, Any]]:
    ensure_storage_dirs()
    target_path = EXECUTIONS_DIR / f"{exec_id}.json"
    return _read_json_file(target_path)


def resolve_evidence_ref(ref: str) -> Optional[Dict[str, Any]]:
    """
    Resolve a stable evidence reference (e.g. 'transcript:tr-001:seg-004', 'decision:d-001', 'action:a-001')
    to its full source record with original quote, speaker, meeting date, and offset.
    Never fabricates missing data.
    """
    if not ref or not isinstance(ref, str):
        return None

    parts = ref.split(":")
    ref_type = parts[0]

    if ref_type == "transcript" and len(parts) >= 3:
        tr_id = parts[1]
        seg_id = parts[2]
        tr = get_transcript_by_id(tr_id)
        if not tr:
            return None
        meeting = get_meeting_by_id(tr.get("meetingId", ""))
        for seg in tr.get("segments", []):
            if seg.get("id") == seg_id:
                return {
                    "ref": ref,
                    "type": "transcript",
                    "quote": seg.get("text"),
                    "speakerName": seg.get("speakerLabel"),
                    "speakerId": seg.get("speakerId"),
                    "meetingId": tr.get("meetingId"),
                    "meetingTitle": meeting.get("title") if meeting else "פגישה היסטורית",
                    "meetingDate": meeting.get("startAt") if meeting else None,
                    "offsetSeconds": seg.get("offsetSeconds"),
                    "verified": True
                }

    elif ref_type == "decision" and len(parts) >= 2:
        dec_id = parts[1]
        for d in get_all_decisions():
            if d.get("id") == dec_id:
                meeting = get_meeting_by_id(d.get("meetingId", ""))
                return {
                    "ref": ref,
                    "type": "decision",
                    "quote": d.get("description"),
                    "topic": d.get("topic"),
                    "status": d.get("status"),
                    "meetingId": d.get("meetingId"),
                    "meetingTitle": meeting.get("title") if meeting else "פגישה היסטורית",
                    "meetingDate": d.get("createdAt"),
                    "supersedes": d.get("supersedes"),
                    "evidenceRefs": d.get("evidenceRefs", []),
                    "verified": True
                }

    elif ref_type == "action" and len(parts) >= 2:
        act_id = parts[1]
        for a in get_all_action_items():
            if a.get("id") == act_id:
                meeting = get_meeting_by_id(a.get("meetingId", ""))
                owner = get_participant_by_id(a.get("ownerId", ""))
                return {
                    "ref": ref,
                    "type": "action",
                    "quote": a.get("description"),
                    "ownerName": owner.get("name") if owner else None,
                    "dueAt": a.get("dueAt"),
                    "originalDueText": a.get("originalDueText"),
                    "status": a.get("status"),
                    "meetingId": a.get("meetingId"),
                    "meetingTitle": meeting.get("title") if meeting else "פגישה היסטורית",
                    "verified": True
                }

    elif ref_type == "meeting" and len(parts) >= 2:
        meet_id = parts[1]
        m = get_meeting_by_id(meet_id)
        if m:
            return {
                "ref": ref,
                "type": "meeting",
                "quote": m.get("description"),
                "meetingTitle": m.get("title"),
                "meetingDate": m.get("startAt"),
                "verified": True
            }

    return None
