"""Structural stage-4/5 checks. These tests do not run native trajectories."""

import copy
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import generator as G
from rules.geometry_v4 import refine_fragment as v4
from rules.geometry_v5 import refine_fragment as v5


class GeometryRefinementTests(unittest.TestCase):
    def test_revision_gates_and_deep_copy(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                source = G.fragment(family, variant)
                before = copy.deepcopy(source)
                self.assertEqual(v4(source, revision=3), before)
                self.assertEqual(v5(source, revision=4), before)
                refined = v5(v4(source), revision=5)
                self.assertEqual(source, before)
                refined["map"]["obstacles"][0]["x"] = -999
                self.assertEqual(source, before)

    def test_cloister_release_independent_of_middle_advance(self):
        for difficulty in ("easy", "medium", "hard"):
            base = v4(G.fragment("cloister", "base", difficulty), difficulty)
            alternate = v4(G.fragment("cloister", "alternate", difficulty), difficulty)
            for variant, refined in (("base", base), ("alternate", alternate)):
                original = G.fragment("cloister", variant, difficulty)
                self.assertEqual(refined["map"], original["map"])
                self.assertEqual(refined["guide"][1]["until_x"], 480)
                self.assertEqual(refined["guide"][2]["x"], 480)
                self.assertEqual(refined["guide"][2]["until_x"], original["guide"][2]["until_x"])
                self.assertEqual(v4(refined, difficulty), refined)

    def test_cloister_release_derives_from_actual_first_disk(self):
        f = G.fragment("cloister", "alternate")
        first = next(o for o in f["map"]["obstacles"] if o["id"] == "solid-crown-1")
        first["x"] += 7
        refined = v4(f)
        self.assertEqual(refined["guide"][2]["x"], 487)
        self.assertEqual(refined["map"], f["map"])

    def test_slider_existing_lower_provider_and_clock_covenant(self):
        upper = G.fragment("slider-island", "alternate")
        lower = v5(upper)
        a = next(o for o in upper["map"]["obstacles"] if o["id"] == "slider")
        b = next(o for o in lower["map"]["obstacles"] if o["id"] == "slider")
        self.assertEqual(lower["metadata"]["provider_metadata"]["normalized_spec"]["branch"], "lower")
        self.assertAlmostEqual(b["motion"]["phase_rad"] - a["motion"]["phase_rad"], math.pi)
        self.assertEqual(len(upper["map"]["obstacles"]), len(lower["map"]["obstacles"]))
        translated = G.translate(b, 1000, 1000 / 150, "m02")
        for t in (0, 2.8, 5.1, 12):
            omega = 2 * math.pi / b["motion"]["period_s"]
            self.assertAlmostEqual(math.sin(omega * t + b["motion"]["phase_rad"]),
                                   math.sin(omega * (t + 1000 / 150) + translated["motion"]["phase_rad"]))

    def test_slider_real_contour_and_delayed_merge(self):
        for difficulty, drop in (("easy", 20), ("medium", 30), ("hard", 40)):
            lower = v5(G.fragment("slider-island", "alternate", difficulty), difficulty)
            obs = {o["id"]: o for o in lower["map"]["obstacles"]}
            self.assertEqual(obs["entry-top"]["collider"]["h"], 240)
            self.assertEqual(obs["entry-bottom"]["y"], 440)
            self.assertEqual(obs["island"]["y"], 215 + drop)
            self.assertEqual(obs["island"]["collider"]["w"], 135)
            island_clear = obs["island"]["x"] + 135 + 10
            self.assertGreater(lower["guide"][-1]["x"], island_clear)
            self.assertEqual(lower["guide"][-1]["target_y"], 298)
            note = lower["metadata"]["integration_refinements"][-1]
            self.assertEqual(note["minimum_island_to_receiver_rise_px"], 5 + drop)
            self.assertEqual(v5(lower, difficulty), lower)

    def test_spring_answer_keeps_spring_gate_and_optional_branch(self):
        for difficulty in ("easy", "medium", "hard"):
            original = G.fragment("spring-reception", "alternate", difficulty)
            refined = v5(original, difficulty)
            self.assertEqual(refined["map"]["obstacles"][:2], original["map"]["obstacles"])
            roof = refined["map"]["obstacles"][-1]
            gate = original["map"]["obstacles"][1]
            self.assertEqual(roof["mechanic_kind"], "fixed_armor_or_spike")
            self.assertEqual(roof["x"] - gate["x"] - gate["collider"]["w"], 220)
            self.assertEqual(roof["collider"], {"shape": "rectangle", "w": 80.0, "h": 390.0})
            note = refined["metadata"]["integration_refinements"][-1]
            self.assertGreater(note["minimum_receipt_to_answer_descent_px"], 0)
            self.assertAlmostEqual(note["answer_radius_clear_x"] - note["receiver_radius_clear_x"], 300)
            answer = refined["guide"][-2]
            self.assertEqual(answer["x"], note["receiver_radius_clear_x"])
            self.assertEqual(answer["target_y"], 460)
            self.assertEqual(v5(refined, difficulty), refined)

    def test_unselected_variants_stay_unchanged(self):
        for family in G.CATALOG:
            for variant in ("base", "alternate"):
                if family in ("slider-island", "spring-reception") and variant == "alternate":
                    continue
                f = G.fragment(family, variant)
                self.assertEqual(v5(f), f)

    def test_native_schema_and_recursive_exclusions_without_stepping(self):
        maps = []
        for family in G.CATALOG:
            for difficulty in ("easy", "medium", "hard"):
                for variant in ("base", "alternate"):
                    f = v5(v4(G.fragment(family, variant, difficulty), difficulty), difficulty)
                    G.eligibility.require_mechanics(f, "stage4/5 recursive fragment")
                    self.assertNotIn("intervention", f["map"])
                    maps.append(f["map"])
        script = "require('./integration/vendor/flappy-runtime.js');const ms=JSON.parse(require('node:fs').readFileSync(0,'utf8'));for(const m of ms)global.FlappyRuntime.validate(m);console.log(ms.length);"
        checked = subprocess.run(["node", "-e", script], input=json.dumps(maps), text=True,
                                 cwd=HERE.parent, capture_output=True, check=True)
        self.assertEqual(checked.stdout.strip(), "36")


if __name__ == "__main__":
    unittest.main()
