"""Bounded tidal handoff repair after stage_relations_v8; no trajectory search.

B1 candidate-703/705 died at the new roof-2 after a last high-shelf flap.
The v8 steady low-notch arc calculation did not cover that carried ascent.
This revision changes two trailing/leading edges, never an aperture or clock.
All calculations below are continuous, ideal one-flap diagnostics, not native
simulation, an accepted incoming-state range, or an input-tolerance window.
"""
from copy import deepcopy
from math import sqrt

import active_eligibility as eligibility
from .stage_relations_v8 import FAMILIES, STAGES, MARKER as V8_MARKER

MARKER = "tidal-last-high-flap-handoff-v9"
RADIUS, SPEED, GRAVITY, FLAP_VY = 10.0, 150.0, 820.0, -290.0
# A discrete authored repair, shared across existing difficulty apertures.
# Stage 2 keeps its deeper, longer roof but moves both handoff edges upstream.
RECIPES = {
    1: {"bank_width": 85.0, "notch_x": 600.0},
    2: {"bank_width": 65.0, "notch_x": 580.0},
}
EVIDENCE_ROOT = "integration/runs/stage-pressure/B1"
EVIDENCE = (
    {
        "id": "candidate-703", "module_id": "m03", "variant": "alternate",
        "difficulty": "hard", "stage_index": 1,
        "result": EVIDENCE_ROOT + "/runs/candidate-703/result.json",
        "trace": EVIDENCE_ROOT + "/runs/candidate-703/trace.json.gz",
        "map_file": EVIDENCE_ROOT + "/runs/candidate-703/map.json",
        "map_sha256": "c88120ad5c8e7fca577e53f394a32da6a1d581eed5b7384554254a9833354c02",
        "trace_sha256": "7d6b8c9c33e8608b61e9e989aae35cbb284a9aa110d4a4a50290c62bf4161727",
        "last_high_flap": {"tick": 1201, "local_x": 461.280487804878, "y": 181.2906944444446, "incoming_vy": 283.9999999999998},
        "old_release_state": {"tick": 1208, "local_x": 470.030487804878, "y": 165.86881944444463, "vy": -242.16666666666654},
        "death_state": {"tick": 1304, "event_tick": 1303, "local_x": 590.030487804878, "y": 235.90215277777787, "vy": 413.8333333333338},
        "death_body": "m03-roof-2",
    },
    {
        "id": "candidate-705", "module_id": "m02", "variant": "base",
        "difficulty": "easy", "stage_index": 1,
        "result": EVIDENCE_ROOT + "/runs/candidate-705/result.json",
        "trace": EVIDENCE_ROOT + "/runs/candidate-705/trace.json.gz",
        "map_file": EVIDENCE_ROOT + "/runs/candidate-705/map.json",
        "map_sha256": "5c3b73b6ad38175f2dbe56e2dc41b20787618ba86593faa4b97e3e0bbfdedc2f",
        "trace_sha256": "c1c3f9ccd9a6b1a758d72ad6a9770591b7f1ee1e6785652ce7d865d10588695a",
        "last_high_flap": {"tick": 1039, "local_x": 458.75, "y": 180.66284722222164, "incoming_vy": 283.9999999999998},
        "old_release_state": {"tick": 1048, "local_x": 470.0, "y": 161.3472222222217, "vy": -228.49999999999991},
        "death_state": {"tick": 1144, "event_tick": 1143, "local_x": 590.0, "y": 242.31388888888827, "vy": 427.50000000000057},
        "death_body": "m02-roof-2",
    },
)


def _ideal_y(y, runway):
    t = runway / SPEED
    return y + FLAP_VY * t + GRAVITY * t * t / 2.0


def _descent_runway(y, plane):
    """Descending root from one ideal flap; not a reachability certificate."""
    return SPEED * (-FLAP_VY + sqrt(FLAP_VY ** 2 + 2 * GRAVITY * (plane - y))) / GRAVITY


def _repair(out, stage):
    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    bank, notch, step = (bodies[name] for name in ("bank-1", "roof-2", "bank-2"))
    expected = {1: (120.0, 600.0, 50.0, 260.0, 330.0),
                2: (100.0, 590.0, 70.0, 285.0, 355.0)}[stage]
    if (bank["x"], bank["collider"]["w"], notch["x"], notch["y"],
            notch["collider"]["w"], notch["collider"]["h"], step["collider"]["w"]) != (
            340.0, expected[0], expected[1], 0.0, expected[2], expected[3], 60.0):
        raise ValueError("Tidal v9 repair requires the unmodified v8 bank/notch and v6 middle step")
    if any(body["collider"]["shape"] != "rectangle" for body in (bank, notch, step)):
        raise ValueError("Tidal v9 repair requires rectangular source bodies")
    rows = out["guide"]
    indices = [i for i, g in enumerate(rows) if g["target_y"] == 180.0]
    if len(indices) != 1 or indices[0] + 2 >= len(rows):
        raise ValueError("Tidal v9 repair requires one high/notch/middle guide sequence")
    i = indices[0]
    high, low, middle = rows[i:i + 3]
    old_release = bank["x"] + bank["collider"]["w"] + RADIUS
    old_clear = notch["x"] + notch["collider"]["w"] + RADIUS
    if (high["until_x"], low["x"], low["until_x"], low["target_y"], middle["x"],
            middle["target_y"], middle["until_x"]) != (
            old_release, old_release, old_clear, expected[4], old_clear,
            270.0, step["x"] + step["collider"]["w"] + RADIUS):
        raise ValueError("Tidal v9 repair requires unchanged v8 whole-radius guide boundaries")
    before_bodies = {name: deepcopy(bodies[name]) for name in ("bank-1", "roof-2")}
    before_guides = deepcopy(rows[i:i + 3])
    before_relation = deepcopy(out["metadata"]["stage_relations_v8"]["relations"][0])
    recipe = RECIPES[stage]
    bank["collider"]["w"] = recipe["bank_width"]
    notch["x"] = recipe["notch_x"]
    release = bank["x"] + bank["collider"]["w"] + RADIUS
    entry = notch["x"] - RADIUS
    clear = notch["x"] + notch["collider"]["w"] + RADIUS
    step_entry = step["x"] - RADIUS
    high["until_x"] = low["x"] = release
    low["until_x"] = middle["x"] = clear

    # The grammar reads this active key. Keep its bands/positions truthful;
    # the immutable historical v8 refinement remains in integration_refinements.
    current = out["metadata"]["stage_relations_v8"]
    current["geometry_revision"] = 9
    current["latest_refinement_id"] = MARKER
    current["action_bands"] = [
        {"source_body_ids": ["roof-1", "bank-1"], "x": bank["x"] + bank["collider"]["w"] / 2,
         "center_band_y": [bodies["roof-1"]["y"] + bodies["roof-1"]["collider"]["h"] + RADIUS, bank["y"] - RADIUS]},
        {"source_body_ids": ["roof-2"], "x": notch["x"] + notch["collider"]["w"] / 2,
         "center_band_y": [notch["y"] + notch["collider"]["h"] + RADIUS, out["map"].get("height", 540) - RADIUS]},
        {"source_body_ids": ["bank-2"], "x": step["x"] + step["collider"]["w"] / 2,
         "center_band_y": [RADIUS, step["y"] - RADIUS]},
    ]
    relation = current["relations"][0]
    relation.update({
        "first_bank_radius_clear_x": release,
        "notch_radius_entry_x": entry,
        "notch_radius_clear_x": clear,
        "middle_step_radius_entry_x": step_entry,
        "preparation_runway_px": entry - release,
        "notch_to_step_runway_px": step_entry - clear,
        "high_guide_span_x": [high["x"], release],
        "latest_refinement_id": MARKER,
        "limits": "Ideal last-high-flap and low-notch arcs only; actual incoming state ranges, input timing tolerance, and native passage remain unproved. Low-notch and middle-step bands overlap, so the rise is an authored aim, not universally forced.",
    })
    notch_plane = notch["y"] + notch["collider"]["h"] + RADIUS
    step_plane = step["y"] - RADIUS
    required = _descent_runway(high["target_y"], notch_plane)
    ideal_entry = _ideal_y(high["target_y"], entry - release)
    crest = low["target_y"] - FLAP_VY ** 2 / (2 * GRAVITY)
    # The base middle step is the tighter branch. Extended variant is longer;
    # do not extrapolate an unflapped arc over that whole additional distance.
    base_step_runway = 700.0 - RADIUS - clear
    ideal_step = _ideal_y(low["target_y"], base_step_runway)
    if not (entry - release > required and crest > notch_plane
            and ideal_step < step_plane and base_step_runway >= 30.0):
        raise ValueError("Tidal v9 discrete recipe violates its stated ideal handoff constraints")
    return {
        "geometry_changed": True,
        "changed_bodies": [name for name in before_bodies if before_bodies[name] != bodies[name]],
        "body_changes": [{"id": name, "before": before_bodies[name], "after": deepcopy(bodies[name])}
                         for name in before_bodies if before_bodies[name] != bodies[name]],
        "guide_before": before_guides, "guide_after": deepcopy(rows[i:i + 3]),
        "v8_relation_before": before_relation, "relation_after": deepcopy(relation),
        "action_bands": deepcopy(current["action_bands"]),
        "active_relation_key": "stage_relations_v8",
        "analytic_constraints": {
            "model": "y(t)=y0-290t+410t^2; t=runway/150; one ideal flap at the guide release",
            "gravity_px_s2": GRAVITY, "flap_vy_px_s": FLAP_VY, "speed_px_s": SPEED, "radius_px": RADIUS,
            "high_target_y": high["target_y"], "notch_target_y": low["target_y"],
            "notch_min_center_y": notch_plane, "middle_step_max_center_y": step_plane,
            "old_descent_runway_px": before_relation["preparation_runway_px"],
            "ideal_minimum_descent_runway_px": required,
            "descent_runway_px": entry - release,
            "ideal_last_high_flap_entry_y": ideal_entry,
            "ideal_entry_plane_difference_px": ideal_entry - notch_plane,
            "ideal_low_flap_crest_y": crest,
            "ideal_crest_plane_difference_px": crest - notch_plane,
            "base_notch_to_step_runway_px": base_step_runway,
            "actual_notch_to_step_runway_px": step_entry - clear,
            "ideal_base_step_entry_y_after_release_flap": ideal_step,
            "ideal_base_step_plane_difference_px": step_plane - ideal_step,
            "scope": "Conditional continuous examples only. Differences are analytic geometric reserves, not measured safe-state margins. Tick overshoot, arbitrary incoming y/vy, flap phases and the complete native trajectory are not certified.",
        },
        "evidence": deepcopy(list(EVIDENCE)),
        "evidence_interpretation": "Both observed failures are stage1. Stage2 is an analytic consistency repair, not an observed stage2 failure. r7 baseline703/705 traversed their high-shelf tidal modules, but their order and carried entries differ from v8 and are not counterfactual same-state tests.",
        "preserved": ["all aperture heights", "notch widths and targets", "middle step and its low-trough release", "all other bodies and downstream guide rows", "source clocks and interactions", "active x envelope and world dimensions", "initial state and actual carried-state policy"],
    }


def refine_fragment(f, difficulty="medium", stage=0, revision=9):
    """Deep-copy a v8 fragment, repairing only tidal stages 1/2 once.

    A new stage must start from the original source. Reapplication is idempotent;
    unrelated families and stage0 retain the exact v8 map and guide values.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(stage, bool) or not isinstance(stage, int) or stage not in range(3):
        raise ValueError("stage must be the integer 0, 1, or 2")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    eligibility.require_mechanics(f, "notch v9 input including nested provenance")
    out = deepcopy(f)
    if revision < 9:
        return out
    if out.get("family") not in FAMILIES:
        raise ValueError("Unknown notch-handoff family")
    metadata = out["metadata"]
    previous = metadata.get("notch_handoff_v9")
    if previous:
        if previous["stage_index"] != stage or previous["difficulty"] != difficulty:
            raise ValueError("Cannot restage an already refined fragment; use its original source")
        return out
    source = metadata.get("stage_relations_v8", {})
    if source.get("id") != V8_MARKER:
        raise ValueError("Notch v9 must be applied after stage_relations_v8")
    if source.get("stage_index") != stage or source.get("difficulty") != difficulty:
        raise ValueError("Notch v9 stage/difficulty must match its v8 source")
    note = {
        "id": MARKER, "first_revision": 9, "stage_index": stage,
        "stage_name": STAGES[stage], "difficulty": difficulty,
        "geometry_changed": False, "changed_bodies": [], "action_bands": [],
        "reason": "Only tidal stages1/2 have the new notch handoff; preserve all other v8 choices",
        "qualification": "experimental authored handoff correction; not a calibrated pressure score, accepted state box, input timing window, or native survival result",
        "state_policy": "no physics run, trajectory search, state reset, incoming-state override, clock reset, or hazard deletion",
    }
    if out["family"] == "tidal-staircase" and stage:
        note.update(_repair(out, stage))
        note["reason"] = "Move whole-radius release ahead of the observed late high-shelf flap; retain a bounded middle-step preparation interval"
    metadata["notch_handoff_v9"] = note
    metadata.setdefault("integration_refinements", []).append(deepcopy(note))
    eligibility.require_mechanics(out, "notch v9 output including nested provenance")
    return out
