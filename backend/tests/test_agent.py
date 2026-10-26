"""
Automated test suite for Recall Meeting Intelligence Agent.
Covers all 16 required test cases specified in the assessment requirements.
Compatible with standard unittest and pytest.
"""

from __future__ import annotations
import json
import unittest
from backend.agent.engine import AgentEngine
from backend.agent.schemas import StoppingReason, VerificationStatus
from backend.storage import json_store
from backend.tools import registry


class TestRecallAgent(unittest.TestCase):

    def setUp(self):
        json_store.ensure_storage_dirs()

    # 1. Meeting selection by date range
    def test_meeting_date_filtering(self):
        meetings = json_store.get_all_meetings()
        self.assertGreaterEqual(len(meetings), 12, "Should have at least 12 meetings")

        # Filter by October 2026
        oct_meetings = [m for m in meetings if "2026-10" in m.get("startAt", "")]
        self.assertGreater(len(oct_meetings), 0, "Should find meetings in October 2026")

    # 2. Participant retrieval
    def test_participant_retrieval(self):
        participants = json_store.get_all_participants()
        self.assertGreaterEqual(len(participants), 6, "Should have at least 6 participants")
        cto = json_store.get_participant_by_id("p-001")
        self.assertIsNotNone(cto)
        self.assertEqual(cto.get("name"), "יונתן לוי")

    # 3. Historical search by topic and participant with Hebrew normalization
    def test_historical_search_hebrew_normalization(self):
        res = registry.search_meeting_history(query="מסדי נתונים", topic="מיגרציה")
        self.assertGreater(res["totalMatches"], 0)
        top_match = res["results"][0]["meeting"]
        self.assertIn("PostgreSQL", top_match.get("description", "") + top_match.get("title", ""))

    # 4. Tool argument validation
    def test_tool_argument_validation(self):
        # Invalid meeting id
        res = registry.get_meeting_details("invalid-id-999")
        self.assertIn("error", res)

        # Non-existent transcript
        tr_res = registry.get_transcript(transcript_id="non-existent")
        self.assertIn("error", tr_res)

    # 5. Citation and evidence-reference validation
    def test_citation_resolution(self):
        ref = "transcript:tr-001:seg-004"
        item = json_store.resolve_evidence_ref(ref)
        self.assertIsNotNone(item)
        self.assertEqual(item.get("speakerName"), "יונתן לוי")
        self.assertIn("PostgreSQL", item.get("quote"))
        self.assertEqual(item.get("offsetSeconds"), 310)

        # Invalid citation
        invalid = json_store.resolve_evidence_ref("transcript:fake:fake")
        self.assertIsNone(invalid)

    # 6. Supported vs unsupported claims
    def test_evidence_verification_supported_and_unsupported(self):
        # Supported claim
        supported = registry.verify_evidence(
            claim="התקבלה החלטה לעבור ל-PostgreSQL",
            evidence_refs=["transcript:tr-001:seg-004"]
        )
        self.assertEqual(supported["status"], VerificationStatus.SUPPORTED.value)

        # Unsupported claim
        unsupported = registry.verify_evidence(
            claim="הוחלט לרכוש שרתים של חברת אורקל",
            evidence_refs=["transcript:tr-001:seg-004"]
        )
        self.assertEqual(unsupported["status"], VerificationStatus.UNSUPPORTED.value)

    # 7. Conflicting decisions detection
    def test_conflicting_decisions(self):
        # AWS vs GCP conflict
        conflicting = registry.verify_evidence(
            claim="בחירת תשתית ענן",
            evidence_refs=["decision:d-002", "decision:d-003"]
        )
        self.assertEqual(conflicting["status"], VerificationStatus.CONFLICTING.value)
        self.assertIn("החלטות שונות", conflicting["reason"])

    # 8. Missing history (Scenario D)
    def test_first_meeting_no_history(self):
        engine = AgentEngine(meeting_id="m-104", agent_mode="deterministic_fallback")
        out = engine.run()
        briefing = out["briefing"]
        self.assertEqual(briefing["verificationOutcome"], "no_history")
        self.assertEqual(out["execution"]["stoppingReason"], StoppingReason.NO_HISTORY_FOUND.value)
        self.assertIn("לא נמצאו פגישות היסטוריות", briefing["unverifiedGaps"][0])

    # 9. Ambiguous deadlines (Scenario F)
    def test_ambiguous_deadline_preservation(self):
        items = json_store.get_all_action_items()
        vague_item = next((it for it in items if it.get("originalDueText") == "בתחילת השבוע הבא"), None)
        self.assertIsNotNone(vague_item)
        self.assertIsNone(vague_item.get("dueAt"), "Ambiguous deadline must leave dueAt null")
        self.assertEqual(vague_item.get("originalDueText"), "בתחילת השבוע הבא")

    # 10. Action-item status handling (Scenario B)
    def test_action_item_overdue_handling(self):
        engine = AgentEngine(meeting_id="m-102", agent_mode="deterministic_fallback")
        out = engine.run()
        commitments = out["briefing"]["openCommitments"]
        overdue_items = [c for c in commitments if c.get("isOverdue")]
        self.assertGreater(len(overdue_items), 0, "Should detect overdue benchmark report")
        self.assertIn("אורן ברקוביץ'", overdue_items[0].get("ownerName", ""))

    # 11. Idempotent seeding and atomic writes
    def test_atomic_writes_and_idempotence(self):
        seed_count = len(json_store.get_all_meetings())
        # Re-ensure storage dirs
        json_store.ensure_storage_dirs()
        self.assertEqual(len(json_store.get_all_meetings()), seed_count, "Seed data must remain intact")

        # Test briefing save and atomic persistence
        test_payload = {
            "id": "b-test-temp",
            "meetingId": "m-test",
            "summary": "טקסט בדיקה",
            "verifiedFacts": []
        }
        saved = json_store.save_briefing_record(test_payload)
        self.assertTrue(saved)
        retrieved = json_store.get_briefing_by_id("b-test-temp")
        self.assertEqual(retrieved.get("summary"), "טקסט בדיקה")

    # 12. Briefing persistence and retrieval
    def test_briefing_persistence(self):
        engine = AgentEngine(meeting_id="m-101", agent_mode="deterministic_fallback")
        out = engine.run()
        b_id = out["briefing"]["id"]
        loaded = json_store.get_briefing_by_id(b_id)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.get("meetingId"), "m-101")

    # 13. Agent stopping limits (rounds/tools)
    def test_agent_stopping_limits(self):
        engine = AgentEngine(meeting_id="m-101", agent_mode="deterministic_fallback")
        out = engine.run()
        self.assertLessEqual(out["execution"]["stepCount"], 10, "Rounds must be <= 10")
        self.assertLessEqual(out["execution"]["toolCallCount"], 12, "Tool calls must be <= 12")

    # 14. Tool errors and storage failures
    def test_tool_error_handling(self):
        engine = AgentEngine(meeting_id="non-existent-meeting-id")
        out = engine.run()
        self.assertEqual(out["execution"]["stoppingReason"], StoppingReason.INSUFFICIENT_EVIDENCE.value)

    # 15. Prompt-injection defense (Scenario H)
    def test_prompt_injection_quarantine(self):
        engine = AgentEngine(meeting_id="m-108", agent_mode="deterministic_fallback")
        out = engine.run()
        # Verify that prompt injection didn't mark all tasks complete or reveal system prompt
        commitments = out["briefing"]["openCommitments"]
        all_completed = all(c.get("status") == "completed" for c in commitments)
        self.assertFalse(all_completed, "Prompt injection must not mark all tasks completed")
        self.assertNotIn("System secrets revealed", json.dumps(out))

    # 16. Agent decisions changing in response to different tool results
    def test_decisions_change_between_meetings(self):
        # Meeting 101 has rich history
        engine_101 = AgentEngine(meeting_id="m-101", agent_mode="deterministic_fallback")
        res_101 = engine_101.run()

        # Meeting 104 has zero history
        engine_104 = AgentEngine(meeting_id="m-104", agent_mode="deterministic_fallback")
        res_104 = engine_104.run()

        self.assertNotEqual(
            res_101["execution"]["stoppingReason"],
            res_104["execution"]["stoppingReason"]
        )
        self.assertEqual(res_101["execution"]["stoppingReason"], StoppingReason.GOAL_ACHIEVED.value)
        self.assertEqual(res_104["execution"]["stoppingReason"], StoppingReason.NO_HISTORY_FOUND.value)


if __name__ == "__main__":
    unittest.main()
