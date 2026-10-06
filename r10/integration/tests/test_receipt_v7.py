"""Revision-7 receipt authoring and stored-evidence tests; no native stepping."""
import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import generator as G
from rules.handoffs_v6 import refine_fragment as v6
from rules.receipt_v7 import refine_fragment, FLAP_SPEED, GRAVITY

SOURCE_SHA256 = "58544675d1113729b08a7ae2bdb3c6fec3a37154bb4b6eb848b4e4d923c0219b"
ROOT = HERE / "runs/four-loops/exploratory-receipt"


class ReceiptV7Tests(unittest.TestCase):
    def make(self, variant="base", difficulty="medium"):
        return v6(G.fragment("light-cavity", variant, difficulty), difficulty, 6)

    def test_rule_source_frozen(self):
        self.assertEqual(hashlib.sha256((HERE / "rules/receipt_v7.py").read_bytes()).hexdigest(), SOURCE_SHA256)

    def test_revision_gate_and_unaffected_families(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                for difficulty in ("easy", "medium", "hard"):
                    f = v6(G.fragment(family, variant, difficulty), difficulty, 6)
                    self.assertEqual(refine_fragment(f, difficulty, 6), f)
                    if family != "light-cavity":
                        self.assertEqual(refine_fragment(f, difficulty, 7), f)

    def test_only_two_gate_clock_fields_change(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                f = self.make(variant, difficulty)
                prior = copy.deepcopy(f)
                out = refine_fragment(f, difficulty, 7)
                self.assertEqual(f, prior)
                self.assertEqual(refine_fragment(out, difficulty, 7), out)
                self.assertEqual(out["guide"], f["guide"])
                restored = copy.deepcopy(out["map"])
                old_gate = next(o for o in f["map"]["obstacles"] if o["id"] == "wide-receiving-cavity")
                new_gate = next(o for o in restored["obstacles"] if o["id"] == "wide-receiving-cavity")
                for key in ("hold_s", "closing_s"):
                    self.assertNotEqual(new_gate["timeline"][key], old_gate["timeline"][key])
                    new_gate["timeline"][key] = old_gate["timeline"][key]
                self.assertEqual(restored, f["map"])

    def test_original_tail_squeeze_and_ballistic_reserve(self):
        for variant in ("base", "alternate"):
            out = refine_fragment(self.make(variant), "medium", 7)
            d = out["metadata"]["integration_refinements"][-1]["derived"]
            fraction = 1 - (d["whole_radius_tail_s"] - d["closing_start_s"]) / d["closing_duration_s"]
            self.assertAlmostEqual(fraction, 1 / 3)
            self.assertAlmostEqual(d["whole_radius_tail_center_band_px"], 320 / 3 - 20)
            self.assertGreater(d["latest_flap_descent_speed_at_close_px_s"], d["top_rim_speed_px_s"])
            self.assertGreater(d["full_open_latest_flap_crest_min_y"], d["full_open_center_min_y"])
            self.assertAlmostEqual(d["latest_flap_descent_speed_at_close_px_s"], GRAVITY * d["release_to_closing_s"] - FLAP_SPEED)

    def test_invalid_arguments_and_missing_reserve_fail(self):
        f = self.make()
        for revision in (True, "7", 7.0):
            with self.assertRaisesRegex(ValueError, "revision"):
                refine_fragment(f, "medium", revision)
        with self.assertRaisesRegex(ValueError, "difficulty"):
            refine_fragment(f, "unknown", 7)
        with self.assertRaisesRegex(ValueError, "crest clearance"):
            refine_fragment(G.fragment("light-cavity"), "medium", 7)
        f["guide"][1]["until_x"] += 20
        with self.assertRaisesRegex(ValueError, "cooldown"):
            refine_fragment(f, "medium", 7)

    def test_single_preregistered_probe_full_evidence_retained(self):
        manifest = json.loads((ROOT / "manifest.json").read_text())
        self.assertEqual(manifest["maximum_native_runs"], 1)
        self.assertEqual(manifest["ruleSourceSHA256"], SOURCE_SHA256)
        self.assertEqual(len(manifest["runs"]), 1)
        entry = manifest["runs"][0]
        for key, sha_key in (("mapFile", "mapFileSHA256"), ("sourceMap", "sourceMapSHA256")):
            self.assertEqual(hashlib.sha256((ROOT / entry[key]).read_bytes()).hexdigest(), entry[sha_key])
        result = json.loads((ROOT / entry["id"] / "result.json").read_text())
        self.assertEqual(result["outcome"], "native-win")
        self.assertEqual(result["actualTicks"], 3749)
        self.assertEqual(result["horizonTicks"], 4500)
        self.assertEqual(result["controllerSourceSHA256"], manifest["controllerSourceSHA256"])
        self.assertEqual(result["runtimeSHA256"], manifest["runtimeSHA256"])
        self.assertEqual(result["continuity"], {"nativeInitializations": 1, "restores": 0, "resets": 0, "deletedHazards": 0, "obstacleCount": 23})
        for name in ("map.json", "result.json", "trace.json.gz", "inputs.json"):
            self.assertTrue((ROOT / entry["id"] / name).is_file())

    def test_probe_map_is_exactly_two_clock_changes(self):
        manifest = json.loads((ROOT / "manifest.json").read_text())
        entry = manifest["runs"][0]
        old = json.loads((ROOT / entry["sourceMap"]).read_text())
        new = json.loads((ROOT / entry["mapFile"]).read_text())
        old_gate = next(o for o in old["obstacles"] if o["id"] == "m02-wide-receiving-cavity")
        new_gate = next(o for o in new["obstacles"] if o["id"] == "m02-wide-receiving-cavity")
        for key in ("hold_s", "closing_s"):
            new_gate["timeline"][key] = old_gate["timeline"][key]
        self.assertEqual(new, old)


if __name__ == "__main__":
    unittest.main()
