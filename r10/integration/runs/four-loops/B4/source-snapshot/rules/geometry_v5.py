"""Stage-5 branch and receipt relations; native descriptors and guides only.

Use after geometry_v4.refine_fragment and before extents/planning. These are
discrete experimental alternatives, not a continuous safe parameter domain.
"""

from copy import deepcopy
import json
from pathlib import Path


def refine_fragment(f, difficulty="medium", revision=5):
    """Deep-copy f and apply alternate lower-slider or spring low-answer recipe.

    A Cloister predecessor still needs the composer's high carry-in connector
    on the lower slider's inlet. That connector changes only the inlet and first
    cue; it must retain the lower branch's source-derived phase and later cues.
    No runtime, state override, forced spring contact, or controller is used.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    out = deepcopy(f)
    if revision < 5 or out.get("variant") != "alternate":
        return out
    family = out.get("family")
    if family not in ("slider-island", "spring-reception"):
        return out
    if any(n.get("first_revision") == 5 for n in out["metadata"].get("integration_refinements", [])):
        return out

    if family == "slider-island":
        # Ask the existing provider to derive the phase; do not invent an
        # independent phase knob or silently mutate its upper-branch metadata.
        import candidate_generate
        previous_map = out["metadata"]["native_map_sha256"]
        spec = out["metadata"]["provider_metadata"]["normalized_spec"]
        shift = spec["core_shift_px"]
        emitted = candidate_generate.generate(
            "mixed01-slider-fixed-route@1.0.0",
            {"branch": "lower", "core_shift_px": shift},
            root=Path(__file__).resolve().parents[2],
        )
        out["map"] = json.loads(emitted["map_bytes"])
        out["metadata"] = deepcopy(emitted["metadata"])
        obs = {o["id"]: o for o in out["map"]["obstacles"]}
        obs["entry-top"]["collider"]["h"] = 240
        obs["entry-bottom"]["y"] = 440
        obs["entry-bottom"]["collider"]["h"] = 100
        island_drop = {"easy": 20, "medium": 30, "hard": 40}[difficulty]
        obs["island"]["y"] += island_drop
        island_clear = obs["island"]["x"] + obs["island"]["collider"]["w"] + 10
        lower_start = obs["entry-top"]["x"] + obs["entry-top"]["collider"]["w"] + 75
        lower_target = obs["island"]["y"] + obs["island"]["collider"]["h"] + 80
        lower_hold = obs["slider"]["x"] - 30
        out["guide"] = [
            {"x": 60, "until_x": lower_start, "target_y": 360},
            {"x": lower_start, "until_x": lower_hold, "target_y": 360, "target_y_end": lower_target},
            {"x": lower_hold, "until_x": island_clear + 1, "target_y": lower_target},
            {"x": island_clear + 1, "until_x": out["map"]["width"], "target_y": 298},
        ]
        note = {
            "id": "slider-lower-answer-v1",
            "first_revision": 5,
            "previous_source_native_map_sha256": previous_map,
            "changed_bodies": ["entry-top", "entry-bottom", "island"],
            "branch": "lower",
            "source_relation": "existing provider derives lower favored phase; core geometry and phase shift covary",
            "inlet_aperture_y": [240, 440],
            "island_drop_px": island_drop,
            "minimum_island_to_receiver_rise_px": obs["island"]["y"] + obs["island"]["collider"]["h"] + 10 - (obs["receiver-bottom"]["y"] - 10),
            "island_radius_clear_x": island_clear,
            "rise_to_receiver_x": island_clear + 1,
            "cloister_inlet_requirement": "retain upper carry-in aperture90..280 and target210 until lower_start; keep lower phase and subsequent lower/merge cues",
            "qualification": "experimental alternative, no transferred historical lower-branch success or entry state box",
        }
    else:
        gate = next(o for o in out["map"]["obstacles"] if o["id"] == "G-receiver")
        gate_back = gate["x"] + gate["collider"]["w"]
        gate_clear = gate_back + 10.0
        roof_x, roof_width, roof_height = gate_back + 220.0, 80.0, 390.0
        answer_clear = roof_x + roof_width + 10.0
        out["map"]["obstacles"].append({
            "id": "receipt-answer-roof",
            "mechanic_kind": "fixed_armor_or_spike",
            "x": roof_x,
            "y": 0.0,
            "collider": {"shape": "rectangle", "w": roof_width, "h": roof_height},
            "effect_region": None,
            "motion": None,
            "timeline": None,
            "interaction": {"lethal": True},
            "route_id": "main",
            "mount": "world",
            "group_id": "optional-receipt-answer",
            "stage_id": "integration-geometry-v5",
        })
        out["map"]["width"] = answer_clear + 160.0
        retained = [g for g in out["guide"] if g["x"] < gate_clear]
        for g in retained:
            g["until_x"] = min(g["until_x"], gate_clear)
        out["guide"] = retained + [
            {"x": gate_clear, "until_x": answer_clear, "target_y": 460},
            {"x": answer_clear, "until_x": out["map"]["width"], "target_y": 460},
        ]
        # The revision-3 compositor still owns the discrete widened receiver.
        opening = {"easy": 220.0, "medium": 200.0, "hard": 180.0}[difficulty]
        gate_max = gate["y"] + opening / 2 - 10
        note = {
            "id": "optional-spring-receipt-low-answer-v1",
            "first_revision": 5,
            "changed_bodies": ["receipt-answer-roof"],
            "spring_contact": "optional; existing contact or bypass reaches the same unchanged receiver",
            "relation": "retain original receiver through whole-body tail; then descend into a disjoint lower answer before next phrase",
            "receiver_radius_clear_x": gate_clear,
            "answer_radius_clear_x": answer_clear,
            "free_descent_distance_px": roof_x - 10 - gate_clear,
            "composed_receiver_center_upper_y": gate_max,
            "answer_center_lower_y": roof_height + 10,
            "minimum_receipt_to_answer_descent_px": roof_height + 10 - gate_max,
            "actual_spring_and_gate_descriptors_changed": False,
            "qualification": "experimental new relationship; geometry disjointness is not a trajectory or safe state box",
        }
    out["metadata"].setdefault("integration_refinements", []).append(note)
    return out
