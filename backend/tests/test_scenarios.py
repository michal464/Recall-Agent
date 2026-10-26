"""
Automated tests for all 8 demonstration scenarios (A through H).
Verifies that each scenario executes through the real agent engine and satisfies its criteria.
"""

from __future__ import annotations
import unittest
from backend.agent.engine import AgentEngine
from backend.agent.schemas import StoppingReason


class TestScenarios(unittest.TestCase):

    def test_scenario_a_standard_recurring_meeting(self):
        """Scenario A: Retrieves history, identifies PostgreSQL decision, verifies evidence."""
        engine = AgentEngine(meeting_id="m-101", agent_mode="deterministic_fallback")
        res = engine.run()
        briefing = res["briefing"]
        self.assertEqual(res["execution"]["stoppingReason"], StoppingReason.GOAL_ACHIEVED.value)
        self.assertGreater(len(briefing["verifiedFacts"]), 0)
        self.assertTrue(any("PostgreSQL" in f["fact"] for f in briefing["verifiedFacts"]))

    def test_scenario_b_outstanding_commitment(self):
        """Scenario B: Identifies overdue benchmark report from Oren Berkovich."""
        engine = AgentEngine(meeting_id="m-102", agent_mode="deterministic_fallback")
        res = engine.run()
        briefing = res["briefing"]
        overdue = [c for c in briefing["openCommitments"] if c.get("isOverdue")]
        self.assertGreater(len(overdue), 0)
        self.assertEqual(overdue[0]["ownerName"], "אורן ברקוביץ'")
        self.assertEqual(overdue[0]["originalDueText"], "עד ה-15 באוקטובר 2026")

    def test_scenario_c_conflicting_decisions(self):
        """Scenario C: Detects conflicting decisions (AWS ECS vs GCP Cloud Run)."""
        engine = AgentEngine(meeting_id="m-103", agent_mode="deterministic_fallback")
        res = engine.run()
        briefing = res["briefing"]
        self.assertGreater(len(briefing["conflicts"]), 0)
        conflict = briefing["conflicts"][0]
        self.assertEqual(conflict["topic"], "תשתית פריסת ענן")
        self.assertIn("AWS", conflict["decisionA"]["description"])
        self.assertIn("GCP", conflict["decisionB"]["description"])

    def test_scenario_d_first_meeting(self):
        """Scenario D: No prior history found, agent honestly reports it."""
        engine = AgentEngine(meeting_id="m-104", agent_mode="deterministic_fallback")
        res = engine.run()
        self.assertEqual(res["execution"]["stoppingReason"], StoppingReason.NO_HISTORY_FOUND.value)
        self.assertEqual(res["briefing"]["verificationOutcome"], "no_history")

    def test_scenario_e_older_relevant_decision(self):
        """Scenario E: Discovers older security policy decision despite recent syncs."""
        engine = AgentEngine(meeting_id="m-105", agent_mode="deterministic_fallback")
        res = engine.run()
        decisions = res["briefing"]["previousDecisions"]
        sec_decision = next((d for d in decisions if "מפתחות API" in d.get("topic", "") or "רוטציה" in d.get("description", "")), None)
        self.assertIsNotNone(sec_decision)
        self.assertIn("90 יום", sec_decision["description"])

    def test_scenario_f_ambiguous_deadline(self):
        """Scenario F: Preserves vague deadline 'בתחילת השבוע הבא' without hallucinating calendar date."""
        engine = AgentEngine(meeting_id="m-106", agent_mode="deterministic_fallback")
        res = engine.run()
        commitments = res["briefing"]["openCommitments"]
        vague = next((c for c in commitments if c.get("originalDueText") == "בתחילת השבוע הבא"), None)
        self.assertIsNotNone(vague)
        self.assertIsNone(vague.get("dueAt"))

    def test_scenario_g_insufficient_evidence(self):
        """Scenario G: Information not present in dataset, agent reports gaps and stops safely."""
        engine = AgentEngine(meeting_id="m-107", agent_mode="deterministic_fallback")
        res = engine.run()
        self.assertIn(res["execution"]["stoppingReason"], [StoppingReason.GOAL_ACHIEVED.value, StoppingReason.INSUFFICIENT_EVIDENCE.value])
        # Briefing should be generated without hallucinated budget amounts
        self.assertNotIn("$1,000,000", res["briefing"]["summary"])

    def test_scenario_h_prompt_injection(self):
        """Scenario H: Malicious transcript text treated as quoted untrusted data."""
        engine = AgentEngine(meeting_id="m-108", agent_mode="deterministic_fallback")
        res = engine.run()
        # Verify that prompt injection failed to mark all commitments completed
        commitments = res["briefing"]["openCommitments"]
        all_completed = all(c.get("status") == "completed" for c in commitments)
        self.assertFalse(all_completed)
        self.assertNotIn("Ignore all previous instructions", res["briefing"]["summary"])


if __name__ == "__main__":
    unittest.main()
