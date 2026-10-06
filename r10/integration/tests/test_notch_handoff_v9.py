"""Focused static checks; no physics calls, controller edit, or extra probes."""
import copy
import gzip
import hashlib
import json
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
from rules.stage_relations_v8 import refine_fragment as v8
from rules.notch_handoff_v9 import refine_fragment, EVIDENCE, MARKER
from rules.stage_grammar_v8 import fragment_profile


def source(family="tidal-staircase", variant="base", difficulty="medium", stage=1):
    f = G.fragment(family, variant, difficulty)
    for refine in (v4, v5, v6, v7):
        f = refine(f, difficulty, 7)
    return v8(f, difficulty, stage)


def bodies(f):
    return {b["id"]: b for b in f["map"]["obstacles"]}


class NotchHandoffV9Tests(unittest.TestCase):
    def test_scope_copy_idempotence_and_unchanged_state_clocks(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                for difficulty in ("easy", "medium", "hard"):
                    for stage in range(3):
                        with self.subTest(family=family, variant=variant, difficulty=difficulty, stage=stage):
                            f = source(family, variant, difficulty, stage)
                            before = copy.deepcopy(f)
                            out = refine_fragment(f, difficulty, stage)
                            self.assertEqual(f, before)
                            self.assertIsNot(out["map"], f["map"])
                            self.assertEqual(refine_fragment(out, difficulty, stage), out)
                            note = out["metadata"]["notch_handoff_v9"]
                            changed = family == "tidal-staircase" and stage > 0
                            self.assertEqual(note["geometry_changed"], changed)
                            self.assertEqual(note["stage_index"], stage)
                            self.assertIn("not a calibrated", note["qualification"])
                            self.assertEqual(G.extents(f["map"]), G.extents(out["map"]))
                            self.assertEqual(out["map"].get("initial_player"), f["map"].get("initial_player"))
                            for field in ("width", "height"):
                                self.assertEqual(out["map"][field], f["map"][field])
                            self.assertEqual(set(bodies(out)), set(bodies(f)))
                            for name, old in bodies(f).items():
                                for field in ("motion", "timeline", "interaction", "effect_region"):
                                    self.assertEqual(bodies(out)[name].get(field), old.get(field))
                            if not changed:
                                self.assertEqual(out["map"], f["map"])
                                self.assertEqual(out["guide"], f["guide"])
                                self.assertEqual(out["metadata"]["stage_relations_v8"], f["metadata"]["stage_relations_v8"])
                            G.eligibility.require_mechanics(out, "v9 test")

    def test_only_bounded_edges_and_matching_guides_change(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                for stage, width, notch_x, release in ((1, 85, 600, 435), (2, 65, 580, 415)):
                    f = source(variant=variant, difficulty=difficulty, stage=stage)
                    out = refine_fragment(f, difficulty, stage)
                    old, new = bodies(f), bodies(out)
                    expected = copy.deepcopy(old)
                    expected["bank-1"]["collider"]["w"] = width
                    expected["roof-2"]["x"] = notch_x
                    self.assertEqual(new, expected)
                    self.assertEqual(new["bank-1"]["y"], old["bank-1"]["y"])
                    self.assertEqual(new["roof-2"]["collider"], old["roof-2"]["collider"])
                    expected_guides = copy.deepcopy(f["guide"])
                    i = next(i for i, g in enumerate(expected_guides) if g["target_y"] == 180)
                    expected_guides[i]["until_x"] = expected_guides[i + 1]["x"] = release
                    expected_guides[i + 1]["until_x"] = expected_guides[i + 2]["x"] = 660
                    self.assertEqual(out["guide"], expected_guides)
                    for left, right in zip(out["guide"], out["guide"][1:]):
                        self.assertEqual(left["until_x"], right["x"])
                    for guide in out["guide"]:
                        self.assertLess(guide["x"], guide["until_x"])
                    self.assertEqual(out["metadata"]["notch_handoff_v9"]["changed_bodies"],
                                     ["bank-1"] if stage == 1 else ["bank-1", "roof-2"])

    def test_high_notch_middle_sequence_and_truthful_active_grammar_bands(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                for stage in (1, 2):
                    out = refine_fragment(source(variant=variant, difficulty=difficulty, stage=stage), difficulty, stage)
                    obs = bodies(out)
                    info = out["metadata"]["stage_relations_v8"]
                    self.assertEqual(info["latest_refinement_id"], MARKER)
                    self.assertEqual(info["geometry_revision"], 9)
                    bands = info["action_bands"]
                    for band in bands:
                        self.assertLess(band["center_band_y"][0], band["center_band_y"][1])
                        for name in band["source_body_ids"]:
                            body = obs[name]
                            self.assertLessEqual(body["x"], band["x"])
                            self.assertLessEqual(band["x"], body["x"] + body["collider"]["w"])
                    self.assertGreater(bands[1]["center_band_y"][0], bands[0]["center_band_y"][1])
                    self.assertLess(bands[1]["center_band_y"][0], bands[2]["center_band_y"][1])
                    self.assertEqual(bands[0]["center_band_y"], [obs["roof-1"]["collider"]["h"] + 10, obs["bank-1"]["y"] - 10])
                    self.assertEqual(bands[1]["center_band_y"], [obs["roof-2"]["collider"]["h"] + 10, 530])
                    self.assertEqual(bands[2]["center_band_y"], [10, obs["bank-2"]["y"] - 10])
                    out["active_start"], out["active_end"] = G.extents(out["map"])
                    profile = fragment_profile(out)
                    for band in bands:
                        self.assertIn(band, profile["source_bands"])
                    relation = info["relations"][0]
                    self.assertEqual(relation["preparation_runway_px"], 155)
                    self.assertEqual(relation["notch_radius_clear_x"], 660)
                    self.assertEqual(relation["notch_to_step_runway_px"], 30 if variant == "base" else 210)
                    self.assertIn("not universally forced", relation["limits"])

    def test_ideal_last_flap_checks_are_explicitly_conditional(self):
        for stage, expected_minimum in ((1, 141.10102351140543), (2, 148.5744247986359)):
            out = refine_fragment(source(stage=stage), stage=stage)
            note = out["metadata"]["notch_handoff_v9"]
            a = note["analytic_constraints"]
            self.assertAlmostEqual(a["ideal_minimum_descent_runway_px"], expected_minimum)
            self.assertLess(a["old_descent_runway_px"], expected_minimum)
            self.assertGreater(a["descent_runway_px"], expected_minimum)
            self.assertAlmostEqual(a["ideal_last_high_flap_entry_y"], 318.12222222222226)
            self.assertGreater(a["ideal_entry_plane_difference_px"], 23)
            self.assertGreater(a["ideal_crest_plane_difference_px"], 8)
            self.assertGreater(a["ideal_base_step_plane_difference_px"], 6)
            self.assertEqual(a["base_notch_to_step_runway_px"], 30)
            self.assertIn("not measured safe-state margins", a["scope"])
            self.assertIn("not an observed stage2 failure", note["evidence_interpretation"])
            self.assertIn("no physics run", note["state_policy"])

    def test_historical_v8_record_stays_exact_while_active_view_updates(self):
        f = source(stage=2)
        out = refine_fragment(f, stage=2)
        old_history = f["metadata"]["integration_refinements"]
        self.assertEqual(out["metadata"]["integration_refinements"][:-1], old_history)
        note = out["metadata"]["notch_handoff_v9"]
        self.assertEqual(note["v8_relation_before"], f["metadata"]["stage_relations_v8"]["relations"][0])
        self.assertEqual(note["relation_after"], out["metadata"]["stage_relations_v8"]["relations"][0])
        self.assertEqual(note["action_bands"], out["metadata"]["stage_relations_v8"]["action_bands"])

    def test_observed_failure_provenance_matches_frozen_files(self):
        for witness in EVIDENCE:
            result = json.loads((HERE.parent / witness["result"]).read_text())
            raw = (HERE.parent / witness["trace"]).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), witness["trace_sha256"])
            self.assertEqual(result["mapSHA256"], witness["map_sha256"])
            self.assertEqual(result["death"]["id"], witness["death_body"])
            trace = json.loads(gzip.decompress(raw))
            flap = next(f for f in trace["flapDecisions"] if f["tick"] == witness["last_high_flap"]["tick"])
            self.assertEqual(flap["targetY"], 180)
            self.assertAlmostEqual(flap["y"], witness["last_high_flap"]["y"])
            self.assertAlmostEqual(flap["vy"], witness["last_high_flap"]["incoming_vy"])
            for key in ("old_release_state", "death_state"):
                recorded = witness[key]
                actual = trace["rows"][recorded["tick"]]
                self.assertAlmostEqual(actual[2], recorded["y"])
                self.assertAlmostEqual(actual[4], recorded["vy"])
            death = witness["death_state"]
            self.assertLess(death["y"], 260)
            self.assertGreater(death["vy"], 400)

    def test_revision_gate_and_invalid_or_unexpected_sources(self):
        f = source()
        self.assertEqual(refine_fragment(f, stage=1, revision=8), f)
        for stage in (-1, 3, True, 1.0, "1"):
            with self.assertRaisesRegex(ValueError, "stage"):
                refine_fragment(f, stage=stage)
        for revision in (True, 9.0, "9"):
            with self.assertRaisesRegex(ValueError, "revision"):
                refine_fragment(f, stage=1, revision=revision)
        with self.assertRaisesRegex(ValueError, "difficulty"):
            refine_fragment(f, difficulty="unknown", stage=1)
        with self.assertRaisesRegex(ValueError, "match"):
            refine_fragment(f, stage=2)
        with self.assertRaisesRegex(ValueError, "restage"):
            refine_fragment(refine_fragment(f, stage=1), stage=2)
        with self.assertRaisesRegex(ValueError, "after stage_relations_v8"):
            refine_fragment(G.fragment("tidal-staircase"), stage=1)
        altered = copy.deepcopy(f)
        bodies(altered)["bank-1"]["collider"]["w"] = 119
        with self.assertRaisesRegex(ValueError, "unmodified v8"):
            refine_fragment(altered, stage=1)
        altered = copy.deepcopy(f)
        altered["guide"][2]["x"] -= 1
        with self.assertRaisesRegex(ValueError, "guide boundaries"):
            refine_fragment(altered, stage=1)

    def test_recursive_exclusion_even_for_unaffected_scope_or_old_revision(self):
        for mechanic in ("suction_core", "push_pulse_core"):
            for stage in (0, 1, 2):
                for revision in (8, 9):
                    f = source("cloister", stage=stage)
                    f["metadata"]["untrusted_nested"] = {"serialized": json.dumps([{"mechanic_kind": mechanic}])}
                    with self.assertRaises(ValueError):
                        refine_fragment(f, stage=stage, revision=revision)


if __name__ == "__main__":
    unittest.main()
