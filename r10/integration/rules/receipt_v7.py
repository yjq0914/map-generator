"""Revision-7 light receipt: preserve tail squeeze, defer it past retained ascent.

Pure authored geometry/clock relationship. No rollout, incoming-state override,
seed lookup, controller change, aperture enlargement, or claimed entry box.
"""
from copy import deepcopy
from math import sqrt

RADIUS = 10.0
GRAVITY = 820.0
FLAP_SPEED = 290.0
NATIVE_DT = 1.0 / 120.0
TAIL_OPEN_FRACTION = 1.0 / 3.0


def refine_fragment(f, difficulty="medium", revision=7):
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    out = deepcopy(f)
    if revision < 7 or out.get("family") != "light-cavity":
        return out
    marker = "light-release-crest-before-closing-v1"
    notes = out["metadata"].setdefault("integration_refinements", [])
    if any(n.get("id") == marker for n in notes):
        return out
    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    gate = bodies["wide-receiving-cavity"]
    ramps = [g for g in out["guide"] if g.get("policy") == "laser-channel"]
    if len(ramps) != 1:
        raise ValueError("Receipt correction requires one explicit light ramp")
    ramp = ramps[0]
    initial = out["map"]["initial_player"]
    vx = initial["vx"]
    if vx <= 0 or gate["collider"]["shape"] != "rectangle":
        raise ValueError("Receipt correction requires positive native speed and rectangular gate")
    release = (ramp["until_x"] - initial["x"]) / vx
    tail = (gate["x"] + gate["collider"]["w"] + RADIUS - initial["x"]) / vx
    aperture = gate["motion"]["opening_px"]
    open_min = gate["y"] - aperture / 2 + RADIUS
    crest_floor = min(ramp["target_y"], ramp.get("target_y_end", ramp["target_y"])) - FLAP_SPEED ** 2 / (2 * GRAVITY)
    if crest_floor <= open_min:
        raise ValueError("Light ramp lacks full-open flap-crest clearance; apply revision-6 ramp first")
    for name in ("inclined-upper", "inclined-lower"):
        clock = bodies[name]["timeline"]
        if abs(clock["start_s"] + clock["warning_s"] + clock["active_s"] - release) > 1e-8:
            raise ValueError("Guide release must coincide with real rail cooldown")
    # Closing must not catch the retained last pre-release upward flap. Its
    # earliest permitted onset is when an unforced latest flap is descending
    # at least as fast as the top rim. Covary closing duration so the original
    # one-third full-radius-tail aperture remains exactly the same.
    # (delay - flap_speed/g) * (tail-release-delay)
    #     = aperture * (1-tail_fraction) / (2*g)
    available = tail - release
    apex = FLAP_SPEED / GRAVITY
    k = aperture * (1 - TAIL_OPEN_FRACTION) / (2 * GRAVITY)
    discriminant = (available - apex) ** 2 - 4 * k
    if available <= apex or discriminant <= 0:
        raise ValueError("Insufficient receipt runway for retained flap and original tail squeeze")
    delay = (available + apex - sqrt(discriminant)) / 2 + NATIVE_DT
    close_at = release + delay
    closing = (tail - close_at) / (1 - TAIL_OPEN_FRACTION)
    q = gate["timeline"]
    full_open_at = q["start_s"] + q["warning_s"] + q["opening_s"]
    hold = close_at - full_open_at
    rim_speed = aperture / (2 * closing)
    if hold <= 0 or closing <= 0 or GRAVITY * delay - FLAP_SPEED < rim_speed:
        raise ValueError("Derived receipt closure does not fit the native clock")
    before = deepcopy(q)
    q["hold_s"], q["closing_s"] = hold, closing
    notes.append({
        "id": marker,
        "first_revision": 7,
        "changed_bodies": ["wide-receiving-cavity"],
        "changed_fields": ["timeline.hold_s", "timeline.closing_s"],
        "before_timeline": before,
        "after_timeline": deepcopy(q),
        "relation": "gate stays fully open until the latest pre-release flap descends at least as fast as the top rim, plus one native tick; closing duration covaries to preserve source one-third aperture at whole-radius tail",
        "supersedes_source_relation": "closing begins release+0.1; source-derived clock and future-cycle numbers are historical, not the refined gate's clocks",
        "derived": {
            "release_s": release,
            "whole_radius_tail_s": tail,
            "release_to_closing_s": delay,
            "closing_start_s": close_at,
            "closing_duration_s": closing,
            "top_rim_speed_px_s": rim_speed,
            "latest_flap_descent_speed_at_close_px_s": GRAVITY * delay - FLAP_SPEED,
            "full_open_latest_flap_crest_min_y": crest_floor,
            "full_open_center_min_y": open_min,
            "whole_radius_tail_open_fraction": TAIL_OPEN_FRACTION,
            "whole_radius_tail_center_band_px": aperture * TAIL_OPEN_FRACTION - 2 * RADIUS,
            "gate_repeat_period_s": sum(q[k] for k in ("warning_s", "opening_s", "hold_s", "closing_s", "cooldown_s")),
        },
        "preserved": ["both real finite rails and their cooldown", "guide and release position", "gate x/y/width and aperture", "whole-radius-tail squeeze", "continuous real incoming state and world time", "repeating gate and earlier live hazards"],
        "scope": "discrete experimental recipe for existing light fragments; analytical latest-flap reserve plus one full-world diagnostic is not a reachable-entry box or general qualification",
        "evidence": "integration/runs/four-loops/exploratory-receipt/manifest.json",
    })
    return out
