"""Descriptor and read-only old-evidence tests; no native stepping or replay."""
import copy
import gzip
import json
import math
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
from rules.notch_handoff_v9 import refine_fragment as notch_v9
from rules.timed_precision_v9 import refine_fragment as timed_v9
from rules.laser_release_v10 import (
    refine_fragment, _lower_center_bound, CYCLE_FIELDS, NATIVE_DT, FLAP_SPEED,
    GRAVITY, RADIUS, X0, SPEED,
)


def source(family="light-cavity", variant="base", difficulty="medium", stage=0):
    f = G.fragment(family, variant, difficulty)
    for refine in (v4, v5, v6, v7):
        f = refine(f, difficulty, 7)
    f = v8(f, difficulty, stage, 8)
    f = notch_v9(f, difficulty, stage, 9)
    return timed_v9(f, difficulty, stage, 9)


def body(f, name="inclined-lower"):
    return next(o for o in f["map"]["obstacles"] if o["id"] == name)


def phase(q, t):
    """Native clock descriptor expression only; does not load the runtime."""
    z = t - q["start_s"]
    if z < 0:
        return "idle"
    position = z % sum(q[k] for k in CYCLE_FIELDS)
    if position < q["warning_s"]:
        return "warning"
    if position < q["warning_s"] + q["active_s"]:
        return "active"
    return "cooldown"


class LaserReleaseV10Tests(unittest.TestCase):
    def test_all_variants_stages_difficulties_only_two_fields_in_each_rail(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                for stage in range(3):
                    with self.subTest(variant=variant, difficulty=difficulty, stage=stage):
                        f = source(variant=variant, difficulty=difficulty, stage=stage)
                        before = copy.deepcopy(f)
                        out = refine_fragment(f, difficulty, stage)
                        self.assertEqual(f, before)
                        self.assertEqual(refine_fragment(out, difficulty, stage), out)
                        self.assertEqual(out["guide"], f["guide"])
                        self.assertEqual(G.extents(out["map"]), G.extents(f["map"]))
                        self.assertEqual(out["metadata"]["integration_refinements"][:-1], f["metadata"]["integration_refinements"])
                        restored = copy.deepcopy(out["map"])
                        for name in ("inclined-upper", "inclined-lower"):
                            old = body(f, name)
                            new = next(o for o in restored["obstacles"] if o["id"] == name)
                            for key in ("active_s", "cooldown_s"):
                                self.assertNotEqual(new["timeline"][key], old["timeline"][key])
                                new["timeline"][key] = old["timeline"][key]
                        self.assertEqual(restored, f["map"])
                        note = out["metadata"]["laser_release_v10"]
                        self.assertFalse(note["geometry_changed"])
                        self.assertTrue(note["physical_clock_changed"])
                        self.assertEqual(note["feedback_changes"], [])
                        self.assertIsNone(note["evidence_basis"]["actual_changed_map_measurement"])

    def test_revision_nine_and_other_families_are_exact_copies(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                for stage in range(3):
                    f = source(family=family, variant=variant, stage=stage)
                    out = refine_fragment(f, stage=stage, revision=9)
                    self.assertEqual(out, f)
                    self.assertIsNot(out, f)
                    if family != "light-cavity":
                        self.assertEqual(refine_fragment(f, stage=stage), f)

    def test_descriptor_root_and_quantified_small_live_ascent_loss(self):
        for variant in ("base", "alternate"):
            out = refine_fragment(source(variant=variant))
            d = out["metadata"]["laser_release_v10"]["derived"]
            self.assertAlmostEqual(d["old_physical_release_s"], 4.4)
            self.assertAlmostEqual(d["physical_release_s"], 4.228003190362817)
            self.assertAlmostEqual(d["physical_release_player_x"], 694.2004785544226)
            self.assertAlmostEqual(d["old_active_duration_s"], 3.4)
            self.assertAlmostEqual(d["new_active_duration_s"], 3.228003190362817)
            self.assertAlmostEqual(d["active_duration_retained_fraction"], .9494127030478875)
            self.assertAlmostEqual(d["live_feedback_ascent_distance_retained_fraction"], 414.2004785544226 / 440)
            self.assertAlmostEqual(d["root_time_s"], 4.236336523696151)
            self.assertAlmostEqual(d["reference_frame_reserve_px"], 3.412032925199433)
            self.assertAlmostEqual(d["reference_descent_speed_px_s"], FLAP_SPEED + GRAVITY * NATIVE_DT)
            self.assertAlmostEqual(d["root_full_radius_lower_bound_y"] - d["root_feedback_threshold_y"], d["reference_frame_reserve_px"])
            self.assertAlmostEqual(d["root_time_s"] - d["physical_release_s"], NATIVE_DT)
            root = d["root_time_s"]
            rail = body(out)
            for t, sign in ((root - .01, 1), (root + .01, -1)):
                x = X0 + SPEED * t
                threshold = 450 + (255 - 450) * (x - 280) / 440
                surplus = _lower_center_bound(rail, t, x) - threshold
                self.assertGreater(sign * (surplus - d["reference_frame_reserve_px"]), 0)
            # Physical cooldown is inside the finite beam, not endpoint bypass.
            self.assertAlmostEqual(d["release_before_finite_endpoint_px"], 125.7995214455774)
            self.assertGreater(d["physical_release_s"], (body(out, "wide-receiving-cavity")["x"] - RADIUS - X0) / SPEED)

    def test_every_future_warning_and_active_origin_and_native_sine_are_preserved(self):
        for variant in ("base", "alternate"):
            f = source(variant=variant)
            out = refine_fragment(f)
            for name in ("inclined-upper", "inclined-lower"):
                old, new = body(f, name), body(out, name)
                self.assertEqual(old["motion"], new["motion"])
                self.assertEqual(old["collider"], new["collider"])
                for dx in (0, 2425, 3645.4695121951218):
                    shift = dx / SPEED
                    before = G.translate(old, dx, shift, "m05")
                    after = G.translate(new, dx, shift, "m05")
                    pq, q = before["timeline"], after["timeline"]
                    old_period, period = (sum(clock[k] for k in CYCLE_FIELDS) for clock in (pq, q))
                    self.assertAlmostEqual(period, old_period)
                    self.assertAlmostEqual(period, 10.2)
                    for cycle in (0, 1, 2, 8):
                        origin = q["start_s"] + cycle * period
                        self.assertAlmostEqual(origin, pq["start_s"] + cycle * old_period)
                        self.assertAlmostEqual(origin + q["warning_s"], pq["start_s"] + pq["warning_s"] + cycle * old_period)
                        self.assertEqual(phase(q, origin + q["warning_s"] + .1), "active")
                    d = out["metadata"]["laser_release_v10"]["derived"]
                    # Earliest lattice sample at/after cooldown occurs by root,
                    # even for translated modules with fractional-tick origins.
                    actual_cooldown_sample = math.ceil((d["physical_release_s"] + shift) / NATIVE_DT) * NATIVE_DT
                    self.assertLessEqual(actual_cooldown_sample, d["root_time_s"] + shift + 1e-12)
                    self.assertEqual(phase(q, actual_cooldown_sample + 1e-10), "cooldown")
                    self.assertEqual(after["motion"], before["motion"])

    def test_physical_release_feedback_release_and_gate_are_truthfully_distinct(self):
        f = source()
        out = refine_fragment(f)
        note = out["metadata"]["laser_release_v10"]
        d = note["derived"]
        self.assertLess(d["physical_release_s"], d["feedback_release_s"])
        self.assertEqual(d["feedback_release_player_x"], 720)
        self.assertEqual(body(out, "wide-receiving-cavity"), body(f, "wide-receiving-cavity"))
        self.assertAlmostEqual(d["gate_closing_start_s"], 4.863786467654517)
        self.assertEqual(out["guide"], f["guide"])
        self.assertIn("historical", note["supersedes_source_relation"])
        self.assertIn("not a bound on arbitrary incoming vy", " ".join(note["limitations"]))
        self.assertIn("not be reported as active-rail traversal", " ".join(note["limitations"]))
        q = body(out)["timeline"]
        self.assertEqual(phase(q, 4.1), "active")
        self.assertEqual(phase(q, 4.3), "cooldown")

    def test_passive_saved_deaths_change_phase_without_replaying_any_state(self):
        for batch, run in (("B2", "holdout-6206"), ("B1", "holdout-6103"), ("B1", "baseline-703"), ("B1", "baseline-706")):
            path = HERE / "runs/stage-pressure" / batch / "runs" / run
            m = json.loads((path / "map.json").read_text())
            result = json.loads((path / "result.json").read_text())
            with gzip.open(path / "trace.json.gz", "rt") as handle:
                trace = json.load(handle)
            module = next(mo for mo in m["integration"]["modules"] if mo["family"] == "light-cavity")
            difficulty = m["generator_parameters"]["difficulty"]
            stage = module.get("pressure_stage", {}).get("authored", {}).get("index", 0)
            f = source(variant=module["variant"], difficulty=difficulty, stage=stage)
            new = body(refine_fragment(f, difficulty, stage))
            new = G.translate(new, module["shift_x"], module["time_shift_s"], module["id"])
            old = next(o for o in m["obstacles"] if o["id"] == new["id"])
            self.assertEqual(result["death"]["id"], old["id"])
            final = trace["rows"][-1]
            self.assertTrue(707 <= final[1] - module["shift_x"] <= 712)
            self.assertGreater(final[4], 140)
            self.assertEqual(final[7], 0)  # Literal feedback still held before collision.
            self.assertEqual(phase(old["timeline"], final[0] / 120), "active")
            self.assertEqual(phase(new["timeline"], final[0] / 120), "cooldown")
            flaps = [fl for fl in trace["flapDecisions"] if old["x"] <= fl["x"] <= final[1]]
            self.assertGreaterEqual(len(flaps), 5)
            self.assertGreater(flaps[0]["y"] - flaps[-1]["y"], 140)
            self.assertTrue(all(phase(new["timeline"], fl["tick"] / 120) == "active" for fl in flaps))
            # This is a phase evaluation over immutable old state data, not
            # evidence that the altered map survives beyond that stored death.

    def test_validation_and_recursive_exclusion(self):
        f = source()
        for stage in (-1, 3, True, 0.0, "0"):
            with self.assertRaisesRegex(ValueError, "stage"):
                refine_fragment(f, stage=stage)
        for revision in (True, 10.0, "10"):
            with self.assertRaisesRegex(ValueError, "revision"):
                refine_fragment(f, revision=revision)
        with self.assertRaisesRegex(ValueError, "difficulty"):
            refine_fragment(f, difficulty="unknown")
        with self.assertRaisesRegex(ValueError, "restage"):
            refine_fragment(refine_fragment(f), stage=1)
        with self.assertRaisesRegex(ValueError, "stage"):
            refine_fragment(source(stage=1), stage=2)
        with self.assertRaisesRegex(ValueError, "revision-7"):
            refine_fragment(v6(G.fragment("light-cavity")))
        broken = copy.deepcopy(f)
        broken["guide"][1]["target_y_end"] -= 1
        with self.assertRaisesRegex(ValueError, "feedback ramp"):
            refine_fragment(broken)
        broken = copy.deepcopy(f)
        body(broken)["motion"]["phase_rad"] = .01
        with self.assertRaisesRegex(ValueError, "geometry and sine phase"):
            refine_fragment(broken)
        broken = copy.deepcopy(f)
        body(broken, "inclined-upper")["timeline"]["active_s"] -= .01
        with self.assertRaisesRegex(ValueError, "synchronized"):
            refine_fragment(broken)
        for kind in ("suction_core", "push_pulse_core"):
            for family, revision in (("light-cavity", 10), ("light-cavity", 9), ("cloister", 10)):
                broken = source(family=family)
                broken["metadata"]["nested_history"] = {"children": [json.dumps({"mechanic_kind": kind})]}
                with self.assertRaises(ValueError):
                    refine_fragment(broken, revision=revision)


if __name__ == "__main__":
    unittest.main()
