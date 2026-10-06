"""Stage-2 bellows: close a live gate during its occupied traversal.

This is a pure descriptor relation. It does not run physics or change the
controller, guides, player state, body coordinates, or maximum apertures.
Saved B1 states support an occupied-geometry hypothesis only; they are not a
native witness for this changed clock or a measured input-timing tolerance.
"""
from copy import deepcopy
import math

import active_eligibility as eligibility

RADIUS = 10.0
SPEED = 150.0
X0 = 60.0
NATIVE_DT = 1.0 / 120.0
TAIL_OPEN_FRACTION = 2.0 / 3.0
MARKER = "bellows-occupied-midpoint-close-v9"
CYCLE_FIELDS = ("warning_s", "opening_s", "hold_s", "closing_s", "cooldown_s")


def refine_fragment(f, difficulty="medium", stage=0, revision=9):
    """Refine only the A-in clock of a stage-2 bellows, without native stepping.

    Closing begins at the nominal body-midpoint crossing. The closing duration
    is three times the remaining whole-radius-tail travel time, leaving exactly
    two-thirds of the original maximum opening at that tail. Cooldown absorbs
    the hold/closing changes so every later cycle starts at its original time.
    The same discrete recipe applies to all existing difficulty/variant pairs;
    those names are not calibrated human skill or pressure levels.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(stage, bool) or not isinstance(stage, int) or stage not in range(3):
        raise ValueError("stage must be the integer 0, 1, or 2")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    eligibility.require_mechanics(f, "timed precision input including nested provenance")
    out = deepcopy(f)
    if revision < 9:
        return out
    previous = out.get("metadata", {}).get("timed_precision_v9")
    if previous:
        if previous["stage_index"] != stage or previous["difficulty"] != difficulty:
            raise ValueError("Cannot restage an already refined timed fragment; use its original source")
        return out
    if stage != 2 or out.get("family") != "bellows-question-answer":
        return out
    prior_stage = out["metadata"].get("stage_relations_v8")
    if prior_stage and prior_stage["stage_index"] != stage:
        raise ValueError("Timed precision stage must match the original stage refinement")
    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    if "A-in" not in bodies or "Q-out" not in bodies:
        raise ValueError("Timed bellows relation requires A-in and Q-out")
    gate, preceding = bodies["A-in"], bodies["Q-out"]
    initial = out["map"].get("initial_player", {})
    aperture = gate.get("motion", {}).get("opening_px")
    if (gate["mechanic_kind"] != "timed_armor_gate"
            or preceding["mechanic_kind"] != "timed_armor_gate"
            or gate["collider"]["shape"] != "rectangle"
            or gate["collider"]["w"] != 96.0 or gate["y"] != 245.0
            or initial.get("x") != X0 or initial.get("vx") != SPEED
            or aperture != {"easy": 186.0, "medium": 180.0, "hard": 168.0}[difficulty]):
        raise ValueError("Timed bellows relation requires the unchanged A-in source geometry and native speed")
    q, before = gate["timeline"], deepcopy(gate["timeline"])
    pq = preceding["timeline"]
    old_period = sum(q[k] for k in CYCLE_FIELDS)
    full_open = q["start_s"] + q["warning_s"] + q["opening_s"]
    opening_start = q["start_s"] + q["warning_s"]
    preceding_close = pq["start_s"] + pq["warning_s"] + pq["opening_s"] + pq["hold_s"]
    if not math.isclose(opening_start, preceding_close, abs_tol=1e-8, rel_tol=0):
        raise ValueError("Q-out closing must still launch A-in opening on the same clock")
    x, width = gate["x"], gate["collider"]["w"]
    entry = (x - RADIUS - X0) / SPEED
    close_at = (x + width / 2.0 - X0) / SPEED
    tail = (x + width + RADIUS - X0) / SPEED
    closing = (tail - close_at) / (1.0 - TAIL_OPEN_FRACTION)
    hold = close_at - full_open
    cooldown = old_period - q["warning_s"] - q["opening_s"] - hold - closing
    if (full_open > entry or full_open + q["hold_s"] < tail
            or not entry < close_at < tail
            or min(hold, closing, cooldown) < NATIVE_DT):
        raise ValueError("Occupied closing relation does not fit the source full-open traversal and native clock")
    q.update(hold_s=hold, closing_s=closing, cooldown_s=cooldown)
    note = {
        "id": MARKER, "first_revision": 9, "stage_index": 2,
        "difficulty": difficulty,
        "changed_bodies": ["A-in"],
        "changed_fields": ["timeline.hold_s", "timeline.closing_s", "timeline.cooldown_s"],
        "before_timeline": before, "after_timeline": deepcopy(q),
        "pressure_dimensions": ["time-dependent spatial precision", "sustained carried-state control"],
        "relation": "A-in starts closing at nominal body-midpoint crossing and reaches two-thirds maximum opening at whole-radius tail, before the unchanged lower A-out answer",
        "supersedes_source_relation": "Source-derived A-in full-open tail reserve and closed time describe the unrefined source, not this occupied closing clock; Q-out-to-A-in opening linkage and cycle period remain current",
        "derived": {
            "nominal_whole_radius_occupancy_s": [entry, tail],
            "nominal_whole_radius_occupancy_x": [x - RADIUS, x + width + RADIUS],
            "closing_start_s": close_at,
            "closing_start_player_x": x + width / 2.0,
            "closing_occupied_duration_s": tail - close_at,
            "closing_occupied_distance_px": width / 2.0 + RADIUS,
            "closing_duration_s": closing,
            "nominal_tail_open_fraction": TAIL_OPEN_FRACTION,
            "nominal_tail_opening_px": aperture * TAIL_OPEN_FRACTION,
            "nominal_tail_interior_center_band_y": [gate["y"] - aperture * TAIL_OPEN_FRACTION / 2.0 + RADIUS, gate["y"] + aperture * TAIL_OPEN_FRACTION / 2.0 - RADIUS],
            "each_rim_speed_px_s": aperture / (2.0 * closing),
            "Q_out_close_equals_A_in_open_s": opening_start,
            "cycle_period_s": old_period,
        },
        "visible_cues": ["unchanged 0.9-second warning", "actual inward-moving A-in gate rims", "unchanged lower A-out answer"],
        "preserved": ["all body coordinates and widths", "all maximum openings", "all feedback guides", "Q-in, Q-out and A-out clocks", "A-in warning/opening origin and duration", "A-in full cycle period and every later warning origin", "source inlet/outlet geometry and active envelope", "actual incoming state, persistent world clock and earlier live hazards"],
        "evidence_basis": {
            "source": "integration/runs/stage-pressure/B1/STAGE-AUDIT.json and B1 saved candidate/holdout maps/traces",
            "observed_source": "Observed bellows occupancy samples were fully open; A-in sustained flap arcs occurred inside an unchanged aperture",
            "proposed_support": "Descriptor-over-saved-state checks of 12 reached stage-2 A-in passages reduced trace-point minimum distance from 25.28-33.70px to 5.15-22.15px; this was passive geometry evaluation, not native execution of the new recipe",
            "actual_changed_map_measurement": None,
        },
        "qualification": "experimental authored hypothesis; no new native witness, accepted state box, measured input-timing tolerance, or calibrated human pressure",
        "limitations": ["Fixed-x occupancy and interior center bands are descriptor calculations, not control margins", "Saved-state geometry checks do not establish native survival or feasible intervention windows", "Unchanged guides can produce identical inputs; changed proximity does not prove increased action frequency, human prediction, or subjective difficulty", "Native panel observations must report actual occupied phases, y/vy, collision geometry and censoring separately"],
        "state_policy": "No native physics run, state reset, incoming-state override, controller edit, clock reset, or hazard deletion",
    }
    out["metadata"]["timed_precision_v9"] = note
    out["metadata"].setdefault("integration_refinements", []).append(deepcopy(note))
    eligibility.require_mechanics(out, "timed precision output including nested provenance")
    return out
