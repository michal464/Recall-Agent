"""
FastAPI HTTP application for Recall Meeting Intelligence Agent.
Provides REST endpoints for calendar meetings, agent executions, briefings,
evidence inspection, and demo scenarios.
"""

from __future__ import annotations
import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.agent.engine import AgentEngine
from backend.storage import json_store
from backend.tools import registry

app = FastAPI(
    title="Recall — סוכן חכם להכנה לפגישות",
    description="Evidence-backed meeting intelligence agent backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Recall Meeting Intelligence Agent"}


@app.get("/api/calendar/meetings")
def get_meetings(
    date_from: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    date_to: Optional[str] = Query(None, description="End date filter (ISO format)")
):
    """List calendar meetings, optionally filtered by date range."""
    meetings = json_store.get_all_meetings()
    briefings = json_store.get_all_briefings()
    briefed_meeting_ids = {b.get("meetingId") for b in briefings if b.get("meetingId")}

    enriched = []
    for m in meetings:
        start_at = m.get("startAt", "")
        if date_from and start_at < date_from:
            continue
        if date_to and start_at > date_to:
            continue

        enriched.append({
            **m,
            "hasBriefing": m.get("id") in briefed_meeting_ids,
            "briefingId": f"b-{m.get('id')}" if m.get("id") in briefed_meeting_ids else None
        })

    return {"total": len(enriched), "meetings": enriched}


@app.get("/api/calendar/meetings/{meeting_id}")
def get_meeting(meeting_id: str):
    """Get single meeting details with participants."""
    res = registry.get_meeting_details(meeting_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@app.post("/api/agent/prepare-briefing/{meeting_id}")
def prepare_briefing(meeting_id: str, mode: Optional[str] = None):
    """Trigger agent execution loop to prepare a briefing for the selected meeting."""
    meeting = json_store.get_meeting_by_id(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail=f"פגישה {meeting_id} לא נמצאה")

    engine = AgentEngine(meeting_id=meeting_id, agent_mode=mode)
    result = engine.run()
    return result


@app.get("/api/agent/executions/{execution_id}")
def get_execution(execution_id: str):
    """Retrieve execution trace and events."""
    rec = json_store.get_execution_record(execution_id)
    if not rec:
        raise HTTPException(status_code=404, detail="רישום ביצוע לא נמצא")
    return rec


@app.get("/api/agent/briefings/{briefing_id}")
def get_briefing(briefing_id: str):
    """Retrieve briefing by ID or meeting ID."""
    b = json_store.get_briefing_by_id(briefing_id)
    if not b:
        raise HTTPException(status_code=404, detail="תדריך לא נמצא")
    return b


@app.post("/api/agent/scenario/{scenario_id}")
def run_scenario(scenario_id: str):
    """Run one of the 8 demonstration scenarios (A-H)."""
    scenario_map = {
        "A": "m-101",
        "B": "m-102",
        "C": "m-103",
        "D": "m-104",
        "E": "m-105",
        "F": "m-106",
        "G": "m-107",
        "H": "m-108",
    }
    m_id = scenario_map.get(scenario_id.upper())
    if not m_id:
        raise HTTPException(status_code=400, detail=f"תרחיש לא חוקי: {scenario_id}")

    engine = AgentEngine(meeting_id=m_id)
    result = engine.run()
    return {
        "scenario": scenario_id.upper(),
        "meetingId": m_id,
        **result
    }


@app.get("/api/evidence/{evidence_ref:path}")
def resolve_evidence(evidence_ref: str):
    """Resolve stable evidence reference to original source text, speaker, and offset."""
    item = json_store.resolve_evidence_ref(evidence_ref)
    if not item:
        raise HTTPException(status_code=404, detail="אסמכתא לא נמצאה במאגר")
    return item


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
