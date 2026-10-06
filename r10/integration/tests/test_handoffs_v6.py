"""Authoring and saved-evidence checks only; these tests execute no physics."""

import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest


HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import generator as G
from rules.handoffs_v6 import refine_fragment


SOURCE_SHA256 = "8b37c0ec981a51e6cb10c283fb70be4450e168de8c28dd3d7532dd4ddfecdaab"
EVIDENCE = HERE / "runs/four-loops/exploratory-handoffs"


class HandoffsV6Tests(unittest.TestCase):
    def test_revision_six_source_is_frozen(self):
        self.assertEqual(hashlib.sha256((HERE / "rules/handoffs_v6.py").read_bytes()).hexdigest(), SOURCE_SHA256)

    def test_revision_gate_and_unaffected_families(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                for difficulty in ("easy", "medium", "hard"):
                    with self.subTest(family=family, variant=variant, difficulty=difficulty):
                        f = G.fragment(family, variant, difficulty)
                        self.assertEqual(refine_fragment(f, difficulty, 5), f)
                        if family not in ("light-cavity", "tidal-staircase"):
                            self.assertEqual(refine_fragment(f, difficulty, 6), f)

    def test_copy_idempotence_and_mechanics(self):
        for family in ("light-cavity", "tidal-staircase"):
            for variant in ("base", "alternate"):
                for difficulty in ("easy", "medium", "hard"):
                    with self.subTest(family=family, variant=variant, difficulty=difficulty):
                        f = G.fragment(family, variant, difficulty)
                        snapshot = copy.deepcopy(f)
                        out = refine_fragment(f, difficulty, 6)
                        self.assertEqual(f, snapshot)
                        self.assertIsNot(out, f)
                        self.assertIsNot(out["map"], f["map"])
                        self.assertEqual(refine_fragment(out, difficulty, 6), out)
                        self.assertEqual(refine_fragment(f, difficulty, 7), out)
                        self.assertEqual(len(out["metadata"]["integration_refinements"]), 1)
                        self.assertEqual([o["id"] for o in out["map"]["obstacles"]], [o["id"] for o in f["map"]["obstacles"]])
                        G.eligibility.require_mechanics(out, "revision6 handoff static test")

    def test_light_changes_only_ramp_targets(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                with self.subTest(variant=variant, difficulty=difficulty):
                    f = G.fragment("light-cavity", variant, difficulty)
                    out = refine_fragment(f, difficulty, 6)
                    self.assertEqual(out["map"], f["map"])
                    expected = copy.deepcopy(f["guide"])
                    ramp = next(g for g in expected if g.get("policy") == "laser-channel")
                    ramp.update(target_y=450.0, target_y_end=255.0)
                    self.assertEqual(out["guide"], expected)
                    self.assertEqual(out["metadata"]["integration_refinements"][0]["changed_bodies"], [])

    def test_tidal_changes_only_step_width_and_release_boundary(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                with self.subTest(variant=variant, difficulty=difficulty):
                    f = G.fragment("tidal-staircase", variant, difficulty)
                    out = refine_fragment(f, difficulty, 6)
                    expected_map = copy.deepcopy(f["map"])
                    bank = next(o for o in expected_map["obstacles"] if o["id"] == "bank-2")
                    bank["collider"]["w"] = 60.0
                    self.assertEqual(out["map"], expected_map)
                    release = bank["x"] + bank["collider"]["w"] + 10.0
                    self.assertEqual(release, 770.0 if variant == "base" else 950.0)
                    expected_guide = copy.deepcopy(f["guide"])
                    low_index = next(i for i, g in enumerate(expected_guide) if g["target_y"] == 385)
                    expected_guide[low_index]["x"] = release
                    expected_guide[low_index - 1]["until_x"] = release
                    self.assertEqual(out["guide"], expected_guide)
                    self.assertEqual(out["metadata"]["integration_refinements"][0]["radius_clear_descent_runway_px"], 130.0)
                    for left, right in zip(out["guide"], out["guide"][1:]):
                        self.assertEqual(left["until_x"], right["x"])

    def test_invalid_arguments_and_source_drift_fail_explicitly(self):
        f = G.fragment("light-cavity")
        for revision in (True, 6.0, "6"):
            with self.assertRaisesRegex(ValueError, "revision"):
                refine_fragment(f, "medium", revision)
        with self.assertRaisesRegex(ValueError, "difficulty"):
            refine_fragment(f, "unknown", 6)
        f["guide"] = [g for g in f["guide"] if g.get("policy") != "laser-channel"]
        with self.assertRaisesRegex(ValueError, "channel ramp"):
            refine_fragment(f, "medium", 6)
        f = G.fragment("tidal-staircase")
        next(o for o in f["map"]["obstacles"] if o["id"] == "bank-2")["collider"]["w"] = 100
        with self.assertRaisesRegex(ValueError, "120px"):
            refine_fragment(f, "medium", 6)

    def test_exactly_two_recorded_probes_and_all_failures_retained(self):
        manifest = json.loads((EVIDENCE / "manifest.json").read_text())
        self.assertEqual([r["id"] for r in manifest["runs"]], ["light-ramp-701", "tidal-short-step-702"])
        self.assertEqual(len(manifest["runs"]), 2)
        outcomes = []
        for entry in manifest["runs"]:
            data = (EVIDENCE / entry["mapFile"]).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), entry["mapFileSHA256"])
            self.assertEqual(hashlib.sha256((EVIDENCE / entry["sourceMap"]).read_bytes()).hexdigest(), entry["sourceMapSHA256"])
            result = json.loads((EVIDENCE / entry["id"] / "result.json").read_text())
            outcomes.append(result["outcome"])
            self.assertEqual(result["horizonTicks"], 4500)
            self.assertEqual(result["controllerSourceSHA256"], manifest["controllerSourceSHA256"])
            self.assertEqual(result["runtimeSHA256"], manifest["runtimeSHA256"])
            for filename in ("map.json", "result.json", "trace.json.gz", "inputs.json"):
                self.assertTrue((EVIDENCE / entry["id"] / filename).is_file())
            for key, value in (("nativeInitializations", 1), ("restores", 0), ("resets", 0), ("deletedHazards", 0)):
                self.assertEqual(result["continuity"][key], value)
        self.assertEqual(outcomes, ["death", "native-win"])

    def test_same_terminal_tick_review_preserves_correct_death_sources(self):
        review = json.loads((EVIDENCE / "terminal-body-review.json").read_text())
        records = {r["seed"]: r for r in review["baseline"]}
        for seed in (701, 703):
            self.assertEqual(records[seed]["death"]["mechanic"], "laser_scanner")
            self.assertTrue(all(b["status"] == "active" and b["lethal"] for b in records[seed]["terminalBodies"]))
        self.assertEqual(records[706]["death"]["id"], "m02-wide-receiving-cavity:top")
        self.assertTrue(all(b["status"] == "open" and b["lethal"] for b in records[706]["terminalBodies"]))
        self.assertEqual(records[702]["death"]["id"], "m01-roof-3")
        for probe in review["probes"]:
            for filename, digest in probe["hashes"].items():
                self.assertEqual(hashlib.sha256((EVIDENCE / probe["id"] / filename).read_bytes()).hexdigest(), digest)


if __name__ == "__main__":
    unittest.main()
