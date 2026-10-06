"""Pure descriptors and passive saved-state geometry; no native stepping."""
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
from rules.timed_precision_v9 import refine_fragment, CYCLE_FIELDS, TAIL_OPEN_FRACTION


def source(family="bellows-question-answer", variant="base", difficulty="medium", stage=2):
    f = G.fragment(family, variant, difficulty)
    for refine in (v4, v5, v6, v7):
        f = refine(f, difficulty, 7)
    return v8(f, difficulty, stage, 8)


def body(f, name="A-in"):
    return next(o for o in f["map"]["obstacles"] if o["id"] == name)


def full(q):
    return q["start_s"] + q["warning_s"] + q["opening_s"]


def open_fraction(q, t):
    """Native descriptor's piecewise gap formula, with no runtime invocation."""
    z = t - q["start_s"]
    if z < 0:
        return 0.0
    phase = z % sum(q[k] for k in CYCLE_FIELDS)
    phase -= q["warning_s"]
    if phase < 0:
        return 0.0
    if phase < q["opening_s"]:
        return phase / q["opening_s"]
    phase -= q["opening_s"]
    if phase < q["hold_s"]:
        return 1.0
    phase -= q["hold_s"]
    if phase < q["closing_s"]:
        return 1.0 - phase / q["closing_s"]
    return 0.0


def static_snapshot_distance(gate, row):
    """Circle-to-current-finite-rectangle distance at one stored state only."""
    gap = gate["motion"]["opening_px"] * open_fraction(gate["timeline"], row[0] / 120.0)
    x, y = row[1:3]
    dx = max(gate["x"] - x, 0.0, x - gate["x"] - gate["collider"]["w"])
    rectangles = [(-120.0, gate["y"] - gap / 2.0), (gate["y"] + gap / 2.0, 660.0)]
    return min(math.hypot(dx, max(low - y, 0.0, y - high)) - 10.0 for low, high in rectangles)


class TimedPrecisionV9Tests(unittest.TestCase):
    def test_all_recipes_copy_idempotence_and_only_three_clock_fields(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                with self.subTest(variant=variant, difficulty=difficulty):
                    f = source(variant=variant, difficulty=difficulty)
                    before = copy.deepcopy(f)
                    out = refine_fragment(f, difficulty, 2)
                    self.assertEqual(f, before)
                    self.assertEqual(refine_fragment(out, difficulty, 2), out)
                    self.assertEqual(out["guide"], f["guide"])
                    self.assertEqual(G.extents(out["map"]), G.extents(f["map"]))
                    restored = copy.deepcopy(out["map"])
                    new = next(o for o in restored["obstacles"] if o["id"] == "A-in")
                    for key in ("hold_s", "closing_s", "cooldown_s"):
                        self.assertNotEqual(new["timeline"][key], body(f)["timeline"][key])
                        new["timeline"][key] = body(f)["timeline"][key]
                    self.assertEqual(restored, f["map"])
                    self.assertEqual(out["metadata"]["timed_precision_v9"]["evidence_basis"]["actual_changed_map_measurement"], None)

    def test_stage_zero_one_other_families_and_revision_eight_are_exact(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                for difficulty in ("easy", "medium", "hard"):
                    for stage in range(3):
                        f = source(family, variant, difficulty, stage)
                        self.assertEqual(refine_fragment(f, difficulty, stage, 8), f)
                        if family != "bellows-question-answer" or stage != 2:
                            out = refine_fragment(f, difficulty, stage)
                            self.assertEqual(out, f)
                            self.assertIsNot(out, f)

    def test_midpoint_to_radius_tail_is_live_closing_not_unused_reserve(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                out = refine_fragment(source(variant=variant, difficulty=difficulty), difficulty, 2)
                gate = body(out)
                d = out["metadata"]["timed_precision_v9"]["derived"]
                entry, tail = d["nominal_whole_radius_occupancy_s"]
                close = full(gate["timeline"]) + gate["timeline"]["hold_s"]
                self.assertAlmostEqual(close, d["closing_start_s"])
                self.assertAlmostEqual(60 + 150 * close, gate["x"] + gate["collider"]["w"] / 2)
                self.assertLess(entry, close)
                self.assertLess(close, tail)
                self.assertAlmostEqual(tail - close, 58 / 150)
                self.assertAlmostEqual(gate["timeline"]["closing_s"], 1.16)
                self.assertAlmostEqual(open_fraction(gate["timeline"], tail), TAIL_OPEN_FRACTION)
                inside = (close + tail) / 2
                self.assertLess(60 + 150 * inside, gate["x"] + gate["collider"]["w"])
                self.assertAlmostEqual(open_fraction(gate["timeline"], inside), 5 / 6)
                self.assertGreater(gate["motion"]["opening_px"] * (1 - open_fraction(gate["timeline"], inside)) / 2, 13)

    def test_cycle_cooldown_and_Q_out_opening_link_preserved_for_all_recipes(self):
        for variant in ("base", "alternate"):
            for difficulty in ("easy", "medium", "hard"):
                f = source(variant=variant, difficulty=difficulty)
                out = refine_fragment(f, difficulty, 2)
                before, after = body(f)["timeline"], body(out)["timeline"]
                self.assertGreater(after["cooldown_s"], 0)
                self.assertGreater(after["hold_s"], 0)
                old_period, new_period = [sum(q[k] for k in CYCLE_FIELDS) for q in (before, after)]
                self.assertAlmostEqual(new_period, old_period)
                for cycle in (0, 1, 2, 7):
                    self.assertAlmostEqual(after["start_s"] + cycle * new_period, before["start_s"] + cycle * old_period)
                self.assertEqual({k: after[k] for k in ("start_s", "warning_s", "opening_s")}, {k: before[k] for k in ("start_s", "warning_s", "opening_s")})
                pq = body(out, "Q-out")["timeline"]
                self.assertAlmostEqual(full(pq) + pq["hold_s"], after["start_s"] + after["warning_s"])
                for name in ("Q-in", "Q-out", "A-out"):
                    self.assertEqual(body(out, name), body(f, name))

    def test_saved_B1_states_show_changed_occupied_geometry_only_not_native_replay(self):
        # Saved states are never fed into a runtime. This establishes only that
        # the proposal changes occupied lethal geometry on two reached traces.
        root = HERE / "runs/stage-pressure/B1/runs"
        for run_id in ("candidate-701", "holdout-6106"):
            m = json.loads((root / run_id / "map.json").read_text())
            with gzip.open(root / run_id / "trace.json.gz", "rt") as handle:
                trace = json.load(handle)
            module = next(mo for mo in m["integration"]["modules"] if mo["family"] == "bellows-question-answer")
            self.assertEqual(module["pressure_stage"]["authored"]["index"], 2)
            difficulty = m["generator_parameters"]["difficulty"]
            f = source(variant=module["variant"], difficulty=difficulty)
            new = body(refine_fragment(f, difficulty, 2))
            new = G.translate(new, module["shift_x"], module["time_shift_s"], module["id"])
            old = next(o for o in m["obstacles"] if o["id"] == new["id"])
            rows = [r for r in trace["rows"] if old["x"] - 10 <= r[1] <= old["x"] + old["collider"]["w"] + 10]
            self.assertGreater(len(rows), 90)
            self.assertTrue(all(math.isclose(open_fraction(old["timeline"], r[0] / 120), 1.0) for r in rows))
            self.assertTrue(any(open_fraction(new["timeline"], r[0] / 120) < .8 for r in rows))
            old_distance = min(static_snapshot_distance(old, r) for r in rows)
            new_distance = min(static_snapshot_distance(new, r) for r in rows)
            self.assertGreater(old_distance - new_distance, 15)

    def test_validation_and_recursive_exclusion_even_when_unaffected(self):
        f = source()
        for stage in (-1, 3, True, 2.0, "2"):
            with self.assertRaisesRegex(ValueError, "stage"):
                refine_fragment(f, stage=stage)
        for revision in (True, 9.0, "9"):
            with self.assertRaisesRegex(ValueError, "revision"):
                refine_fragment(f, revision=revision)
        with self.assertRaisesRegex(ValueError, "difficulty"):
            refine_fragment(f, difficulty="unknown", stage=2)
        out = refine_fragment(f, stage=2)
        with self.assertRaisesRegex(ValueError, "restage"):
            refine_fragment(out, stage=1)
        with self.assertRaisesRegex(ValueError, "stage"):
            refine_fragment(source(stage=1), stage=2)
        broken = copy.deepcopy(f)
        body(broken, "Q-out")["timeline"]["hold_s"] += .1
        with self.assertRaisesRegex(ValueError, "Q-out"):
            refine_fragment(broken, stage=2)
        for kind in ("suction_core", "push_pulse_core"):
            for stage in (0, 2):
                broken = copy.deepcopy(f)
                broken["metadata"]["nested"] = {"children": [{"mechanic_kind": kind}]}
                with self.assertRaises(ValueError):
                    refine_fragment(broken, stage=stage)


if __name__ == "__main__":
    unittest.main()
