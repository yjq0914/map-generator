"""Static authoring checks only. No native trajectory is run or qualified here."""
import copy
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import generator as G
from rules.geometry_v4 import refine_fragment as v4
from rules.geometry_v5 import refine_fragment as v5
from rules.handoffs_v6 import refine_fragment as v6
from rules.receipt_v7 import refine_fragment as v7
from rules.stage_relations_v8 import refine_fragment, STAGES, FLAP_CREST_RISE_PX


def source(family, variant="base", difficulty="medium"):
    f = G.fragment(family, variant, difficulty)
    for refine in (v4, v5, v6, v7):
        f = refine(f, difficulty, 7)
    return f


def bodies(f):
    return {o["id"]: o for o in f["map"]["obstacles"]}


class StageRelationsV8Tests(unittest.TestCase):
    def test_copy_idempotence_stage_metadata_and_recursive_exclusion(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                for difficulty in ("easy", "medium", "hard"):
                    for stage in range(3):
                        with self.subTest(family=family, variant=variant, difficulty=difficulty, stage=stage):
                            f = source(family, variant, difficulty)
                            before = copy.deepcopy(f)
                            out = refine_fragment(f, difficulty, stage)
                            self.assertEqual(f, before)
                            self.assertIsNot(f["map"], out["map"])
                            self.assertEqual(refine_fragment(out, difficulty, stage), out)
                            note = out["metadata"]["stage_relations_v8"]
                            self.assertEqual(note["stage_index"], stage)
                            self.assertEqual(note["stage_name"], STAGES[stage])
                            self.assertIn("hypothesis", note["qualification"])
                            self.assertEqual(out["map"].get("initial_player"), f["map"].get("initial_player"))
                            self.assertEqual(G.extents(out["map"]), G.extents(f["map"]))
                            self.assertEqual(out["map"]["width"], f["map"]["width"])
                            G.eligibility.require_mechanics(out, "static stage test")
                            for left, right in zip(out["guide"], out["guide"][1:]):
                                self.assertEqual(left["until_x"], right["x"])
                            for row in out["guide"]:
                                self.assertLess(row["x"], row["until_x"])
                            for band in note["action_bands"]:
                                self.assertTrue(set(band["source_body_ids"]) <= bodies(out).keys())
                                self.assertLess(band["center_band_y"][0], band["center_band_y"][1])

    def test_revision_gate_and_explicit_unaffected_scope(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                f = source(family, variant)
                self.assertEqual(refine_fragment(f, "medium", 2, 7), f)
                for stage in range(3):
                    out = refine_fragment(f, "medium", stage)
                    changed = stage > 0 and (family == "tidal-staircase" or family == "slider-island" and variant == "base")
                    self.assertEqual(out["metadata"]["stage_relations_v8"]["geometry_changed"], changed)
                    if not changed:
                        self.assertEqual(out["map"], f["map"])
                        self.assertEqual(out["guide"], f["guide"])

    def test_tidal_changes_only_two_interior_bodies_and_retains_exit(self):
        for difficulty in ("easy", "medium", "hard"):
            for variant in ("base", "alternate"):
                f = source("tidal-staircase", variant, difficulty)
                for stage in (1, 2):
                    out = refine_fragment(f, difficulty, stage)
                    old, new = bodies(f), bodies(out)
                    changed = {k for k in old if old[k] != new[k]}
                    self.assertEqual(changed, {"bank-1", "roof-2"})
                    self.assertEqual(set(old), set(new))
                    self.assertEqual(out["guide"][0], f["guide"][0])
                    self.assertEqual(out["guide"][4:], f["guide"][3:])
                    relation = out["metadata"]["stage_relations_v8"]["relations"][0]
                    self.assertGreater(relation["minimum_first_descent_px"], 0)
                    self.assertGreater(relation["ideal_crest_roof_reserve_px"], 8)
                    self.assertGreater(relation["notch_to_step_runway_px"], 0)
                    self.assertLess(relation["high_guide_span_x"][1] - relation["high_guide_span_x"][0], 300)
                    self.assertGreaterEqual(relation["original_high_guide_span_x"][1] - relation["original_high_guide_span_x"][0], 480)
                redirect = refine_fragment(f, difficulty, 1)["metadata"]["stage_relations_v8"]["relations"][0]
                chain = refine_fragment(f, difficulty, 2)["metadata"]["stage_relations_v8"]["relations"][0]
                self.assertGreater(chain["minimum_first_descent_px"], redirect["minimum_first_descent_px"])
                self.assertLess(chain["notch_to_step_runway_px"], redirect["notch_to_step_runway_px"])

    def test_slider_keeps_original_mechanism_phase_apertures_and_bounds(self):
        f = source("slider-island")
        for stage, added, runway in ((1, 1, 55), (2, 2, 30)):
            out = refine_fragment(f, "medium", stage)
            old, new = bodies(f), bodies(out)
            self.assertEqual({k: new[k] for k in old}, old)
            self.assertEqual(len(new), len(old) + added)
            self.assertEqual(out["guide"][0], f["guide"][0])
            self.assertEqual(out["guide"][-1]["target_y"], f["guide"][-1]["target_y"])
            info = out["metadata"]["stage_relations_v8"]
            relation = info["relations"][0]
            self.assertEqual(relation["minimum_upper_route_rise_px"], 35)
            self.assertEqual(relation["post_notch_preparation_runway_px"], runway)
            self.assertGreater(relation["ideal_crest_roof_reserve_px"], 8)
            self.assertLess(relation["upper_guide_span_x"][1] - relation["upper_guide_span_x"][0], 302)
            if stage == 2:
                self.assertEqual(info["relations"][1]["minimum_upper_route_descent_px"], 50)

    def test_ideal_arc_is_only_analytic_and_all_native_clocks_unchanged(self):
        self.assertAlmostEqual(FLAP_CREST_RISE_PX, 51.28048780487805)
        for family in G.CATALOG:
            f = source(family)
            out = refine_fragment(f, "medium", 2)
            old, new = bodies(f), bodies(out)
            for name, body in old.items():
                self.assertEqual(new[name].get("motion"), body.get("motion"))
                self.assertEqual(new[name].get("timeline"), body.get("timeline"))
                self.assertEqual(new[name].get("interaction"), body.get("interaction"))

    def test_invalid_inputs_and_restage_rejected(self):
        f = source("tidal-staircase")
        for stage in (-1, 3, True, "1", 1.0):
            with self.assertRaisesRegex(ValueError, "stage"):
                refine_fragment(f, stage=stage)
        for revision in (True, "8", 8.0):
            with self.assertRaisesRegex(ValueError, "revision"):
                refine_fragment(f, revision=revision)
        with self.assertRaisesRegex(ValueError, "difficulty"):
            refine_fragment(f, "unknown", 1)
        with self.assertRaisesRegex(ValueError, "restage"):
            refine_fragment(refine_fragment(f, stage=1), stage=2)
        with self.assertRaisesRegex(ValueError, "revision-6"):
            refine_fragment(G.fragment("tidal-staircase"), stage=1)

    def test_forbidden_mechanics_rejected_even_in_nested_provenance(self):
        for kind in ("suction_core", "push_pulse_core"):
            f = source("cloister")
            f["metadata"]["nested"] = {"x": [{"mechanic_kind": kind}]}
            with self.assertRaises(ValueError):
                refine_fragment(f, stage=0)


if __name__ == "__main__":
    unittest.main()
