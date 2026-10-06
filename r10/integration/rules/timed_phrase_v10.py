"""A source-thickness-driven alternate to the stage-2 high closing receipt.

Call after timed_precision_v9. Base keeps that high A-in closing relation;
alternate restores its source A-in and closes the thicker low A-out instead.
This module constructs descriptors only. Saved B2 states support a geometry
hypothesis, not a native witness or a measured input-timing tolerance.
"""
from copy import deepcopy
import math

import active_eligibility as eligibility
from .additional import emit
from .timed_precision_v9 import CYCLE_FIELDS, MARKER as V9_MARKER

RADIUS = 10.0
SPEED = 150.0
X0 = 60.0
NATIVE_DT = 1.0 / 120.0
TAIL_OPEN_FRACTION = 3.0 / 4.0
MARKER = "bellows-alternate-low-sustained-close-v10"


def _full_open(q):
    return q["start_s"] + q["warning_s"] + q["opening_s"]


def refine_fragment(f, difficulty="medium", stage=0, revision=10):
    """Move alternate's occupied closing from high receipt to thick low outlet.

    A-out starts closing at its nominal body midpoint, with three-quarters of
    its source maximum aperture at whole-radius tail. Its longer source body
    therefore receives a longer, slower closing exposure than base's A-in.
    Cooldown absorbs the hold/closing change; every full cycle stays unchanged.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(stage, bool) or not isinstance(stage, int) or stage not in range(3):
        raise ValueError("stage must be the integer 0, 1, or 2")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    eligibility.require_mechanics(f, "timed phrase input including nested provenance")
    out = deepcopy(f)
    if revision < 10:
        return out
    previous = out.get("metadata", {}).get("timed_phrase_v10")
    if previous:
        if (previous["stage_index"] != stage or previous["difficulty"] != difficulty
                or out.get("variant") != "alternate"):
            raise ValueError("Cannot restage an already refined timed phrase; use its original source")
        return out
    if stage != 2 or out.get("family") != "bellows-question-answer":
        return out
    if out.get("variant") not in ("base", "alternate"):
        raise ValueError("Timed phrase requires a known discrete bellows variant")
    prior = out["metadata"].get("timed_precision_v9")
    if (not prior or prior.get("id") != V9_MARKER
            or prior.get("stage_index") != stage or prior.get("difficulty") != difficulty):
        raise ValueError("Timed phrase requires the matching stage-2 timed_precision_v9 source")
    if out["variant"] == "base":
        return out
    prior_stage = out["metadata"].get("stage_relations_v8")
    if prior_stage and prior_stage["stage_index"] != stage:
        raise ValueError("Timed phrase stage must match the original stage refinement")

    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    canonical = emit("bellows-question-answer", "extended", difficulty)
    source = {o["id"]: o for o in canonical["map"]["obstacles"]}
    if len(out["map"]["obstacles"]) != 4 or set(bodies) != set(source):
        raise ValueError("Timed phrase requires the four unchanged source bellows bodies")
    initial = out["map"].get("initial_player", {})
    if initial.get("x") != X0 or initial.get("vx") != SPEED:
        raise ValueError("Timed phrase requires the unchanged source initial x and native speed")
    high, low = bodies["A-in"], bodies["A-out"]
    if (high["timeline"] != prior["after_timeline"]
            or prior["before_timeline"] != source["A-in"]["timeline"]):
        raise ValueError("A-in must retain its exact v9 clock and original source provenance")
    restored_high = deepcopy(high)
    restored_high["timeline"] = deepcopy(prior["before_timeline"])
    if (restored_high != source["A-in"]
            or any(bodies[k] != source[k] for k in ("Q-in", "Q-out", "A-out"))):
        raise ValueError("Timed phrase requires unchanged source bodies and A-out clock")
    if (low["collider"]["w"] != 210.0 or low["y"] != 375.0
            or not math.isclose(low["x"] - high["x"], 295.0, abs_tol=1e-8, rel_tol=0)):
        raise ValueError("Timed phrase requires the source thick low outlet and high-to-low release")

    before_high = deepcopy(high["timeline"])
    high["timeline"] = deepcopy(restored_high["timeline"])
    q, before_low = low["timeline"], deepcopy(low["timeline"])
    old_period = sum(q[k] for k in CYCLE_FIELDS)
    full_open = _full_open(q)
    x, width = low["x"], low["collider"]["w"]
    entry = (x - RADIUS - X0) / SPEED
    close_at = (x + width / 2.0 - X0) / SPEED
    tail = (x + width + RADIUS - X0) / SPEED
    closing = (tail - close_at) / (1.0 - TAIL_OPEN_FRACTION)
    hold = close_at - full_open
    cooldown = old_period - q["warning_s"] - q["opening_s"] - hold - closing
    if (full_open > entry or full_open + q["hold_s"] < tail
            or not entry < close_at < tail or min(hold, closing, cooldown) < NATIVE_DT):
        raise ValueError("Occupied low-outlet closing does not fit the source native clock")
    q.update(hold_s=hold, closing_s=closing, cooldown_s=cooldown)
    aperture = low["motion"]["opening_px"]
    high_tail = (high["x"] + high["collider"]["w"] + RADIUS - X0) / SPEED
    high_close = _full_open(high["timeline"]) + high["timeline"]["hold_s"]
    link = bodies["Q-out"]["timeline"]
    link_time = _full_open(link) + link["hold_s"]
    if not math.isclose(link_time, high["timeline"]["start_s"] + high["timeline"]["warning_s"], abs_tol=1e-8, rel_tol=0):
        raise ValueError("Q-out closing must still launch A-in opening on the same clock")

    note = {
        "id": MARKER, "first_revision": 10, "stage_index": 2,
        "difficulty": difficulty, "variant": "alternate",
        "changed_bodies": ["A-in", "A-out"],
        "occupied_closing_body": "A-out", "restored_source_body": "A-in",
        "changed_fields": ["timeline.hold_s", "timeline.closing_s", "timeline.cooldown_s"],
        "before_timelines": {"A-in": before_high, "A-out": before_low},
        "after_timelines": {"A-in": deepcopy(high["timeline"]), "A-out": deepcopy(q)},
        "supersedes_refinements": [V9_MARKER],
        "pressure_dimensions": ["time-dependent spatial precision", "sustained carried-state control", "high-receipt-to-low-answer contrast"],
        "relation": "Alternate restores the fully-open high receipt, releases to the source thick low answer, then closes A-out from its midpoint to three-quarters maximum opening at whole-radius tail; base retains the shorter high A-in closing relation",
        "tradeoff": "Alternate's high receipt is less confined than v9; its later thick low outlet is now time-dependent. This relocates and lengthens occupied closing rather than increasing every pressure measure.",
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
            "nominal_tail_interior_center_band_y": [low["y"] - aperture * TAIL_OPEN_FRACTION / 2.0 + RADIUS, low["y"] + aperture * TAIL_OPEN_FRACTION / 2.0 - RADIUS],
            "each_rim_speed_px_s": aperture / (2.0 * closing),
            "A_in_restored_full_open_tail_reserve_s": high_close - high_tail,
            "A_in_to_A_out_whole_radius_release_runway_px": x - RADIUS - (high["x"] + high["collider"]["w"] + RADIUS),
            "Q_out_close_equals_A_in_open_s": link_time,
            "cycle_periods_s": {name: sum(body["timeline"][k] for k in CYCLE_FIELDS) for name, body in bodies.items()},
        },
        "visible_cues": ["unchanged 0.9-second warning", "source high-to-low answer geometry", "actual inward-moving rims through the latter half of the thick low outlet"],
        "preserved": ["all body coordinates, widths and maximum openings", "all feedback guides", "Q-in and Q-out clocks", "source A-in clock", "A-out warning/opening origin and duration", "all four full cycle periods and later warning origins", "source active envelope and optional spring elsewhere", "actual incoming state, persistent world clock and earlier live hazards"],
        "supersedes_source_relation": "Source A-out full-open tail reserve and closed time describe the unrefined source, not this occupied closing clock; source A-in full-open timing is restored and Q-out-to-A-in opening linkage remains current",
        "evidence_basis": {
            "source": "integration/runs/stage-pressure/B2/FINDINGS.md, STAGE-AUDIT.json and saved candidate/holdout maps/traces",
            "observed_source": "Eight reached stage-2 alternate A-out passages have fully-open saved native geometry through whole-radius tail, about325-377px y and two or three flaps in their 1.5333-second occupancy",
            "proposed_support": "Descriptor-over-saved-row geometry for those eight passages reduces gate-only trace-point minima from 33.70-43.12px to 16.54-32.75px; 0.1-second saved-state subset minima change from 34.31-43.47px to 17.21-35.20px",
            "actual_changed_map_measurement": None,
        },
        "qualification": "experimental authored hypothesis; no new native witness, accepted state box, measured input-timing tolerance, calibrated human pressure, or qualification promotion",
        "limitations": ["Saved-state geometry is passive evaluation, not native execution of the new clocks", "Whole-radius occupancy and interior center bands are descriptor calculations, not control margins", "Unchanged guides may produce unchanged inputs; neither extra clicks nor human prediction demand is established", "Native panel must report actual A-out occupied phases, y/vy, geometry and censoring separately"],
        "state_policy": "No native physics run, state reset, incoming-state override, controller edit, clock reset, or hazard deletion",
    }
    # Preserve the unmodified historical refinement in the append-only list,
    # but remove its active metadata key so the restored A-in is not counted as
    # a live v9 closing passage. The complete old note remains explicit history.
    historical = out["metadata"].pop("timed_precision_v9")
    out["metadata"].setdefault("superseded_refinements", []).append({
        "metadata_key": "timed_precision_v9", "superseded_by": MARKER,
        "refinement": historical,
    })
    out["metadata"]["timed_phrase_v10"] = note
    out["metadata"].setdefault("integration_refinements", []).append(deepcopy(note))
    eligibility.require_mechanics(out, "timed phrase output including nested provenance")
    return out
