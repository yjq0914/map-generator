"""Small structural/clock tests, intentionally not a physics qualification suite."""

import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT.parent
SPEC = importlib.util.spec_from_file_location("additional_rules", ROOT / "rules" / "additional.py")
additional = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(additional)


def recipes():
    for family in additional.FAMILIES:
        for variant in additional.VARIANTS:
            for difficulty in additional.DIFFICULTIES:
                yield additional.emit(family, variant, difficulty)


def gate_gap(gate, time):
    """Native equation evaluated without advancing a player or runtime state."""
    q = gate["timeline"]
    z = time - q["start_s"]
    if z < 0:
        return 0.0
    phase = z % sum(q[k] for k in ("warning_s", "opening_s", "hold_s", "closing_s", "cooldown_s"))
    if phase < q["warning_s"]:
        return 0.0
    phase -= q["warning_s"]
    if phase < q["opening_s"]:
        return gate["motion"]["opening_px"] * phase / q["opening_s"]
    phase -= q["opening_s"]
    if phase < q["hold_s"]:
        return gate["motion"]["opening_px"]
    phase -= q["hold_s"]
    if phase < q["closing_s"]:
        return gate["motion"]["opening_px"] * (1 - phase / q["closing_s"])
    return 0.0


class AdditionalFamilies(unittest.TestCase):
    def test_discrete_domain_and_fresh_objects(self):
        for args in [("nope",), (additional.FAMILIES[0], "mirror"), (additional.FAMILIES[0], "base", "continuous")]:
            with self.assertRaises(ValueError):
                additional.emit(*args)
        a = additional.emit("tidal-staircase")
        b = additional.emit("tidal-staircase")
        self.assertEqual(a, b)
        a["map"]["obstacles"][0]["x"] = -999
        self.assertGreater(b["map"]["obstacles"][0]["x"], 0)

    def test_all_outputs_have_honest_contracts_and_gapless_guides(self):
        for output in recipes():
            m, meta, guide = output["map"], output["metadata"], output["guide"]
            json.dumps(output, allow_nan=False)
            self.assertEqual(m["initial_player"], {"x": 60, "y": 270, "vx": 150, "vy": 0})
            self.assertEqual(m["schema"], "flappy-loop-lab/1")
            self.assertLessEqual(m["width"], 5000)
            self.assertEqual(meta["classification"], "candidate_unqualified")
            self.assertFalse(meta["physically_qualified"])
            self.assertFalse(meta["new_physics_run"])
            self.assertIsNone(meta["continuous_safe_range"])
            self.assertAlmostEqual(meta["native_duration_s"], (m["width"] - 60) / 150)
            self.assertEqual(guide[0]["x"], 60)
            self.assertEqual(guide[-1]["until_x"], m["width"])
            for a, b in zip(guide, guide[1:]):
                self.assertEqual(a["until_x"], b["x"])
            for point in guide:
                self.assertLess(point["x"], point["until_x"])
                self.assertGreater(point["target_y"], 10)
                self.assertLess(point["target_y"], 530)
            for body in m["obstacles"]:
                self.assertNotIn(body["mechanic_kind"], ("suction_core", "push_pulse_core"))
                self.assertEqual(body["collider"]["shape"], "rectangle")
                self.assertTrue(body["interaction"]["lethal"])
            for source in meta["sources"]:
                self.assertTrue((LIBRARY / source["record"]).is_file())
                self.assertTrue((LIBRARY / source["payload"]).is_file())

    def test_tidal_medium_preserves_corrected_source_geometry(self):
        source = json.loads((LIBRARY / "records/candidates/candidate-spatial-tidal-terraces.v3.json").read_text())["source_payload"]
        output = additional.emit("tidal-staircase")
        for old, new in zip(source["obstacles"], output["map"]["obstacles"]):
            self.assertEqual(new["id"], old["id"])
            self.assertEqual(new["x"], old["x"] + 60)
            self.assertEqual(new["y"], old["y"])
            self.assertEqual(new["collider"], old["collider"])
        self.assertEqual(output["metadata"]["native_duration_s"], 10.2)

    def test_tidal_bands_are_actually_disjoint_for_every_recipe(self):
        for difficulty in additional.DIFFICULTIES:
            for variant in additional.VARIANTS:
                output = additional.emit("tidal-staircase", variant, difficulty)
                d = output["metadata"]["derived"]
                bands = d["exclusive_center_bands"]
                self.assertGreater(bands["low"][0], bands["high"][1])
                self.assertGreater(bands["low"][0], bands["exit"][1])
                self.assertGreater(d["minimum_high_to_low_change_px"], 0)
                self.assertGreater(d["minimum_low_to_exit_change_px"], 0)
                for key, x in d["band_probe_x"].items():
                    top, bottom = 10, 530
                    for body in output["map"]["obstacles"]:
                        if body["x"] <= x <= body["x"] + body["collider"]["w"]:
                            if body["y"] == 0:
                                top = max(top, body["collider"]["h"] + 10)
                            else:
                                bottom = min(bottom, body["y"] - 10)
                    self.assertEqual([top, bottom], bands[key])

    def test_tidal_extension_inserts_shelf_without_uniform_scaling(self):
        base = additional.emit("tidal-staircase")
        extended = additional.emit("tidal-staircase", "extended")
        b = {o["id"]: o for o in base["map"]["obstacles"]}
        e = {o["id"]: o for o in extended["map"]["obstacles"]}
        self.assertEqual(e["roof-1"], b["roof-1"])
        for name in ("roof-2", "bank-1"):
            self.assertEqual(e[name]["x"], b[name]["x"])
            self.assertEqual(e[name]["collider"]["w"] - b[name]["collider"]["w"], 180)
        for name in ("roof-3", "roof-4", "bank-2", "bank-3", "bank-4"):
            self.assertEqual(e[name]["x"] - b[name]["x"], 180)
            self.assertEqual(e[name]["collider"], b[name]["collider"])
        self.assertAlmostEqual(extended["metadata"]["native_duration_s"] - base["metadata"]["native_duration_s"], 1.2)

    def test_bellows_base_reconstructs_compact_source(self):
        output = additional.emit("bellows-question-answer")
        bodies = output["map"]["obstacles"]
        for body, x, hold, start in zip(bodies, [420, 690, 970.5, 1265.5], [1.25, 1.45, 1.55, 2.1], [.665, 2.365, 4.265, 6.036666666666667]):
            self.assertAlmostEqual(body["x"], x)
            self.assertAlmostEqual(body["timeline"]["hold_s"], hold)
            self.assertAlmostEqual(body["timeline"]["start_s"], start)
        self.assertAlmostEqual(output["map"]["width"], 1690.5)
        self.assertAlmostEqual(output["metadata"]["native_duration_s"], 10.87)

    def test_bellows_event_coupling_whole_body_holds_and_lethal_warning(self):
        for difficulty in additional.DIFFICULTIES:
            for variant in additional.VARIANTS:
                output = additional.emit("bellows-question-answer", variant, difficulty)
                events = output["metadata"]["derived"]["events"]
                for left, right in zip(events[:2], events[1:3]):
                    self.assertAlmostEqual(left["closing_start_s"], right["opening_start_s"])
                self.assertGreater(output["metadata"]["derived"]["minimum_first_low_to_high_change_px"], 0)
                for body, event in zip(output["map"]["obstacles"], events):
                    front, tail = event["whole_player_occupancy_s"]
                    self.assertGreater(front, event["full_open_start_s"])
                    self.assertLess(tail, event["closing_start_s"])
                    self.assertAlmostEqual(gate_gap(body, front), body["motion"]["opening_px"])
                    self.assertAlmostEqual(gate_gap(body, tail), body["motion"]["opening_px"])
                    self.assertEqual(gate_gap(body, body["timeline"]["start_s"] + .2), 0)
                    self.assertTrue(body["interaction"]["lethal"])

    def test_bellows_extended_couples_final_depth_to_hold(self):
        for difficulty in additional.DIFFICULTIES:
            b = additional.emit("bellows-question-answer", difficulty=difficulty)
            e = additional.emit("bellows-question-answer", "extended", difficulty)
            self.assertEqual(b["map"]["obstacles"][:3], e["map"]["obstacles"][:3])
            old, new = b["map"]["obstacles"][-1], e["map"]["obstacles"][-1]
            self.assertEqual(old["x"], new["x"])
            self.assertAlmostEqual(new["collider"]["w"] - old["collider"]["w"], 90)
            self.assertAlmostEqual(new["timeline"]["hold_s"] - old["timeline"]["hold_s"], .6)
            self.assertAlmostEqual(new["timeline"]["start_s"], old["timeline"]["start_s"])
            self.assertAlmostEqual(e["metadata"]["native_duration_s"] - b["metadata"]["native_duration_s"], .6)

    @unittest.skipUnless(shutil.which("node"), "Node unavailable for native descriptor validation")
    def test_canonical_runtime_accepts_all_descriptors_without_physics(self):
        runtime = ROOT / "vendor/flappy-runtime.js"
        if not runtime.is_file():
            self.skipTest("Parent has not installed the immutable runtime fixture")
        script = "require(process.argv[1]); const maps=JSON.parse(require('fs').readFileSync(0,'utf8')); for(const m of maps) globalThis.FlappyRuntime.validate(m); process.stdout.write(String(maps.length));"
        result = subprocess.run(["node", "-e", script, str(runtime)], input=json.dumps([o["map"] for o in recipes()]), capture_output=True, text=True, check=True)
        self.assertEqual(result.stdout, "12")


if __name__ == "__main__":
    unittest.main()
