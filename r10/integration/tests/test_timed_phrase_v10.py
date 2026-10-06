"""Descriptor invariants and passive B2 saved-state geometry, no native runs."""
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
from rules.timed_precision_v9 import refine_fragment as v9
from rules.timed_phrase_v10 import refine_fragment, CYCLE_FIELDS, MARKER, TAIL_OPEN_FRACTION


def source(family="bellows-question-answer", variant="alternate", difficulty="medium", stage=2):
    f = G.fragment(family, variant, difficulty)
    for refine in (v4, v5, v6, v7):
        f = refine(f, difficulty, 7)
    return v9(v8(f, difficulty, stage, 8), difficulty, stage, 9)


def body(f, name="A-out"):
    return next(o for o in f["map"]["obstacles"] if o["id"] == name)


def full(q):
    return q["start_s"] + q["warning_s"] + q["opening_s"]


def open_fraction(q, t):
    """Piecewise descriptor formula; no native runtime or player stepping."""
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
    return 1.0 - phase / q["closing_s"] if phase < q["closing_s"] else 0.0


def static_snapshot_distance(gate, row):
    """Circle-to-finite-rectangle distance at one saved state, not a replay."""
    gap = gate["motion"]["opening_px"] * open_fraction(gate["timeline"], row[0] / 120.0)
    x, y = row[1:3]
    dx = max(gate["x"] - x, 0.0, x - gate["x"] - gate["collider"]["w"])
    rects = [(-120.0, gate["y"] - gap / 2.0), (gate["y"] + gap / 2.0, 660.0)]
    return min(math.hypot(dx, max(low - y, 0.0, y - high)) - 10.0 for low, high in rects)


class TimedPhraseV10Tests(unittest.TestCase):
    def test_copy_idempotence_only_clock_fields_and_preserved_source_geometry(self):
        for difficulty in ("easy", "medium", "hard"):
            with self.subTest(difficulty=difficulty):
                f = source(difficulty=difficulty)
                before = copy.deepcopy(f)
                out = refine_fragment(f, difficulty, 2)
                self.assertEqual(f, before)
                self.assertEqual(refine_fragment(out, difficulty, 2), out)
                self.assertEqual(out["guide"], f["guide"])
                self.assertEqual(G.extents(out["map"]), G.extents(f["map"]))
                restored = copy.deepcopy(out["map"])
                for name in ("A-in", "A-out"):
                    changed = next(o for o in restored["obstacles"] if o["id"] == name)
                    for field in ("hold_s", "closing_s", "cooldown_s"):
                        self.assertNotEqual(changed["timeline"][field], body(f, name)["timeline"][field])
                        changed["timeline"][field] = body(f, name)["timeline"][field]
                self.assertEqual(restored, f["map"])
                raw = G.fragment("bellows-question-answer", "alternate", difficulty)
                self.assertEqual(body(out, "A-in"), body(raw, "A-in"))
                for name in ("Q-in", "Q-out"):
                    self.assertEqual(body(out, name), body(f, name))

    def test_base_other_stages_families_and_old_revision_are_exact(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                for difficulty in ("easy", "medium", "hard"):
                    for stage in range(3):
                        f = source(family, variant, difficulty, stage)
                        self.assertEqual(refine_fragment(f, difficulty, stage, 9), f)
                        if family != "bellows-question-answer" or variant == "base" or stage != 2:
                            out = refine_fragment(f, difficulty, stage)
                            self.assertEqual(out, f)
                            self.assertIsNot(out, f)

    def test_low_sustained_closing_is_longer_slower_than_base_high_receipt(self):
        for difficulty in ("easy", "medium", "hard"):
            alternate = refine_fragment(source(difficulty=difficulty), difficulty, 2)
            base = refine_fragment(source(variant="base", difficulty=difficulty), difficulty, 2)
            low = body(alternate)
            d = alternate["metadata"]["timed_phrase_v10"]["derived"]
            bd = base["metadata"]["timed_precision_v9"]["derived"]
            entry, tail = d["nominal_whole_radius_occupancy_s"]
            close = full(low["timeline"]) + low["timeline"]["hold_s"]
            self.assertAlmostEqual(close, d["closing_start_s"])
            self.assertAlmostEqual(60 + 150 * close, low["x"] + low["collider"]["w"] / 2)
            self.assertLess(entry, close)
            self.assertLess(close, tail)
            self.assertAlmostEqual(tail - entry, 230 / 150)
            self.assertAlmostEqual(tail - close, 115 / 150)
            self.assertAlmostEqual(low["timeline"]["closing_s"], 46 / 15)
            self.assertAlmostEqual(open_fraction(low["timeline"], tail), TAIL_OPEN_FRACTION)
            self.assertAlmostEqual(open_fraction(low["timeline"], (close + tail) / 2), 7 / 8)
            self.assertGreater(tail - close, bd["closing_occupied_duration_s"])
            self.assertLess(d["each_rim_speed_px_s"], bd["each_rim_speed_px_s"])
            self.assertGreater(d["A_in_restored_full_open_tail_reserve_s"], .30)
            self.assertAlmostEqual(d["A_in_to_A_out_whole_radius_release_runway_px"], 179)
            high = body(alternate, "A-in")
            for x in (high["x"] - 10, high["x"] + 48, high["x"] + 106):
                self.assertAlmostEqual(open_fraction(high["timeline"], (x - 60) / 150), 1)

    def test_all_cycle_periods_warning_opening_origins_and_link_are_preserved(self):
        for difficulty in ("easy", "medium", "hard"):
            f = source(difficulty=difficulty)
            out = refine_fragment(f, difficulty, 2)
            for name in ("Q-in", "Q-out", "A-in", "A-out"):
                old, new = body(f, name)["timeline"], body(out, name)["timeline"]
                old_period, new_period = [sum(q[k] for k in CYCLE_FIELDS) for q in (old, new)]
                self.assertAlmostEqual(old_period, new_period)
                self.assertGreater(min(new[k] for k in CYCLE_FIELDS), 1 / 120)
                for field in ("start_s", "warning_s", "opening_s"):
                    self.assertEqual(old[field], new[field])
                for cycle in (0, 1, 2, 7, 20):
                    self.assertAlmostEqual(old["start_s"] + cycle * old_period, new["start_s"] + cycle * new_period)
            pq, aq = body(out, "Q-out")["timeline"], body(out, "A-in")["timeline"]
            self.assertAlmostEqual(full(pq) + pq["hold_s"], aq["start_s"] + aq["warning_s"])

    def test_explicit_supersession_preserves_history_without_active_v9_claim(self):
        f = source()
        out = refine_fragment(f, stage=2)
        md = out["metadata"]
        self.assertNotIn("timed_precision_v9", md)
        historical = md["superseded_refinements"][-1]
        self.assertEqual(historical["refinement"], f["metadata"]["timed_precision_v9"])
        self.assertEqual(historical["superseded_by"], MARKER)
        self.assertEqual(md["integration_refinements"][:-1], f["metadata"]["integration_refinements"])
        self.assertEqual(md["timed_phrase_v10"]["occupied_closing_body"], "A-out")
        self.assertIsNone(md["timed_phrase_v10"]["evidence_basis"]["actual_changed_map_measurement"])
        self.assertFalse(md["physically_qualified"])
        self.assertFalse(md["new_physics_run"])

    def test_eight_B2_alternate_passages_support_passive_geometry_hypothesis(self):
        root = HERE / "runs/stage-pressure/B2/runs"
        passages = []
        for folder in sorted(root.iterdir()):
            if not (folder / "map.json").is_file():
                continue
            m = json.loads((folder / "map.json").read_text())
            modules = [mo for mo in m["integration"]["modules"] if mo["family"] == "bellows-question-answer" and mo["variant"] == "alternate" and mo["pressure_stage"]["authored"]["index"] == 2]
            if not modules:
                continue
            with gzip.open(folder / "trace.json.gz", "rt") as handle:
                trace = json.load(handle)
            rows_by_tick = {r[0]: r for r in trace["rows"]}
            for module in modules:
                difficulty = m["generator_parameters"]["difficulty"]
                f = source(difficulty=difficulty)
                proposed = refine_fragment(f, difficulty, 2)
                new = G.translate(body(proposed), module["shift_x"], module["time_shift_s"], module["id"])
                old = next(o for o in m["obstacles"] if o["id"] == new["id"])
                self.assertEqual(old, G.translate(body(f), module["shift_x"], module["time_shift_s"], module["id"]))
                rows = [r for r in trace["rows"] if old["x"] - 10 <= r[1] <= old["x"] + old["collider"]["w"] + 10]
                self.assertGreaterEqual(len(rows), 184)
                self.assertGreaterEqual(trace["rows"][-1][1], old["x"] + old["collider"]["w"] + 10)
                self.assertTrue(all(r[5] for r in rows))
                self.assertTrue(all(math.isclose(open_fraction(old["timeline"], r[0] / 120), 1) for r in rows))
                native_phases = {b.get("phase") for frame in trace["bodyFrames"] if frame["tick"] in rows_by_tick and old["x"] - 10 <= rows_by_tick[frame["tick"]][1] <= old["x"] + old["collider"]["w"] + 10 for b in frame["bodies"] if b.get("sourceId") == old["id"]}
                self.assertEqual(native_phases, {"open"})
                for frame in trace["bodyFrames"]:
                    row = rows_by_tick.get(frame["tick"])
                    if row is None or not old["x"] - 10 <= row[1] <= old["x"] + old["collider"]["w"] + 10:
                        continue
                    saved = [b for b in frame["bodies"] if b.get("sourceId") == old["id"]]
                    self.assertEqual(len(saved), 2)
                    distances = []
                    for rect in saved:
                        dx = max(rect["x"] - row[1], 0, row[1] - rect["x"] - rect["w"])
                        dy = max(rect["y"] - row[2], 0, row[2] - rect["y"] - rect["h"])
                        distances.append(math.hypot(dx, dy) - 10)
                    self.assertAlmostEqual(static_snapshot_distance(old, row), min(distances))
                flaps = [tick for tick in trace["flapTicks"] if rows[0][0] <= tick <= rows[-1][0]]
                self.assertIn(len(flaps), (2, 3))
                self.assertGreater(min(r[2] for r in rows), 324)
                self.assertLess(max(r[2] for r in rows), 378)
                self.assertLess(min(r[4] for r in rows), -280)
                self.assertGreater(max(r[4] for r in rows), 280)
                closing_rows = [r for r in rows if open_fraction(new["timeline"], r[0] / 120) < .999]
                self.assertGreaterEqual(len(closing_rows), 91)
                old_min = min(static_snapshot_distance(old, r) for r in rows)
                new_min = min(static_snapshot_distance(new, r) for r in rows)
                self.assertGreater(old_min - new_min, 8)
                self.assertGreater(new_min, 16)
                self.assertLess(new_min, 33)
                passages.append(folder.name)
        self.assertEqual(passages, ["candidate-701", "candidate-703", "holdout-6201", "holdout-6202", "holdout-6204", "holdout-6205", "holdout-6207", "holdout-6208"])

    def test_reject_incompatible_source_restaging_and_recursive_excluded_mechanics(self):
        f = source()
        for stage in (-1, 3, True, 2.0, "2"):
            with self.assertRaisesRegex(ValueError, "stage"):
                refine_fragment(f, stage=stage)
        for revision in (True, 10.0, "10"):
            with self.assertRaisesRegex(ValueError, "revision"):
                refine_fragment(f, revision=revision)
        with self.assertRaisesRegex(ValueError, "difficulty"):
            refine_fragment(f, difficulty="unknown", stage=2)
        out = refine_fragment(f, stage=2)
        with self.assertRaisesRegex(ValueError, "restage"):
            refine_fragment(out, stage=1)
        with self.assertRaisesRegex(ValueError, "restage"):
            refine_fragment(out, difficulty="easy", stage=2)
        for mutate in (
            lambda x: body(x)["timeline"].update(hold_s=3.0),
            lambda x: body(x)["collider"].update(w=120.0),
            lambda x: body(x, "A-in")["timeline"].update(closing_s=.55),
            lambda x: body(x, "Q-out")["timeline"].update(hold_s=2.0),
            lambda x: x["metadata"]["timed_precision_v9"]["before_timeline"].update(hold_s=2.0),
            lambda x: x["map"]["initial_player"].update(vx=151.0),
            lambda x: x["metadata"].pop("timed_precision_v9"),
        ):
            broken = copy.deepcopy(f)
            mutate(broken)
            with self.assertRaises(ValueError):
                refine_fragment(broken, stage=2)
        for kind in ("suction_core", "push_pulse_core"):
            for stage, revision in ((0, 10), (2, 10), (2, 9)):
                for nested in ({"children": [{"mechanic_kind": kind}]}, json.dumps({"mechanics": [kind]})):
                    broken = copy.deepcopy(f)
                    broken["metadata"]["nested"] = nested
                    with self.assertRaises(ValueError):
                        refine_fragment(broken, stage=stage, revision=revision)


if __name__ == "__main__":
    unittest.main()
