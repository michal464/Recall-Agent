"""
Command-line interface for Recall agent.
Used by the server subprocess runner and standalone command line executions.
Outputs pure JSON to stdout.
"""

from __future__ import annotations
import argparse
import json
import sys
from backend.agent.engine import AgentEngine
from backend.storage import json_store

SCENARIO_MAP = {
    "A": "m-101",
    "B": "m-102",
    "C": "m-103",
    "D": "m-104",
    "E": "m-105",
    "F": "m-106",
    "G": "m-107",
    "H": "m-108",
}


def main():
    parser = argparse.ArgumentParser(description="Recall Meeting Intelligence Agent CLI")
    parser.add_argument("--meeting-id", type=str, help="Target meeting ID")
    parser.add_argument("--scenario", type=str, help="Scenario ID (A-H)")
    parser.add_argument("--mode", type=str, default="deterministic_fallback", help="Agent mode")

    args = parser.parse_args()

    meeting_id = args.meeting_id
    if args.scenario:
        scen_key = args.scenario.upper()
        if scen_key in SCENARIO_MAP:
            meeting_id = SCENARIO_MAP[scen_key]
        else:
            sys.stderr.write(f"Unknown scenario: {args.scenario}\n")
            sys.exit(1)

    if not meeting_id:
        sys.stderr.write("Missing --meeting-id or --scenario\n")
        sys.exit(1)

    engine = AgentEngine(meeting_id=meeting_id, agent_mode=args.mode)
    result = engine.run()

    # Output pure JSON result to stdout
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
