"""Small physical live-rail clock repair, with all feedback and geometry frozen.

Apply after the revision-7 receipt and the stage refinements. The root below is
of authored moving-capsule geometry minus an authored feedback threshold, never
of a rollout or incoming state. Its one-frame reference reserve is a discrete
recipe choice, not a proved state box, safe input interval, or human tolerance.
"""
from copy import deepcopy
import math

import active_eligibility as eligibility

RADIUS = 10.0
SPEED = 150.0
X0 = 60.0
GRAVITY = 820.0
FLAP_SPEED = 290.0
NATIVE_DT = 1.0 / 120.0
CYCLE_FIELDS = ("warning_s", "active_s", "cooldown_s")
MARKER = "live-laser-threshold-release-v10"


def _lower_center_bound(rail, t, x):
    """Interior above-capsule center boundary, not a reachable-state bound."""
    motion = rail["motion"]
    slope = motion["dy_px"] / motion["dx_px"]
    centerline = (rail["y"] + slope * (x - rail["x"])
                  + motion["amplitude_px"] * math.sin(
                      t * 2.0 * math.pi / motion["period_s"] + motion["phase_rad"]))
    return centerline - (RADIUS + rail["collider"]["width"] / 2.0) * math.hypot(1.0, slope)


def refine_fragment(f, difficulty="medium", stage=0, revision=10):
    """Preserve both finite rails; advance only their active-to-cooldown edge.

    Compensating cooldown preserves every later warning and active origin.
    The feedback release and receiving-gate clock deliberately stay unchanged.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(stage, bool) or not isinstance(stage, int) or stage not in range(3):
        raise ValueError("stage must be the integer0,1,or2")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    eligibility.require_mechanics(f, "laser release input including nested provenance")
    out = deepcopy(f)
    if revision < 10 or out.get("family") != "light-cavity":
        return out
    previous = out["metadata"].get("laser_release_v10")
    if previous:
        if previous["stage_index"] != stage or previous["difficulty"] != difficulty:
            raise ValueError("Cannot restage an already refined laser fragment; use its original source")
        return out
    prior_stage = out["metadata"].get("stage_relations_v8")
    if prior_stage and prior_stage["stage_index"] != stage:
        raise ValueError("Laser release stage must match the original stage refinement")
    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    if not all(name in bodies for name in ("inclined-upper", "inclined-lower", "wide-receiving-cavity")):
        raise ValueError("Laser release requires both retained rails and the receiver")
    upper, lower, gate = (bodies[n] for n in ("inclined-upper", "inclined-lower", "wide-receiving-cavity"))
    ramps = [g for g in out["guide"] if g.get("policy") == "laser-channel"]
    initial = out["map"].get("initial_player", {})
    notes = out["metadata"].setdefault("integration_refinements", [])
    if (len(ramps) != 1 or initial.get("x") != X0 or initial.get("vx") != SPEED
            or not any(n.get("id") == "light-release-crest-before-closing-v1" for n in notes)):
        raise ValueError("Laser release requires the revision-7 receipt and unchanged native speed")
    ramp = ramps[0]
    expected_ramp = {"x": 280.0, "until_x": 720.0, "target_y": 450.0, "target_y_end": 255.0}
    if any(ramp.get(k) != v for k, v in expected_ramp.items()):
        raise ValueError("Laser release requires the unchanged revision-6 feedback ramp")
    for rail, length in ((lower, 540.0), (upper, {"base": 180.0, "alternate": 360.0}.get(out.get("variant")))):
        motion, collider = rail.get("motion", {}), rail.get("collider", {})
        if (length is None or rail["mechanic_kind"] != "laser_scanner" or rail["x"] != 280
                or rail["y"] != (560 if rail is lower else 350)
                or collider.get("shape") != "segment" or collider.get("width") != 10
                or collider.get("w") != length or collider.get("h") != length * 11 / 18
                or motion.get("dx_px") != length or motion.get("dy_px") != -length * 11 / 18
                or motion.get("amplitude_px") != 20 or motion.get("period_s") != 6
                or motion.get("phase_rad") != 0 or rail.get("interaction", {}).get("lethal") is not True):
            raise ValueError("Laser release requires unchanged source finite rail geometry and sine phase")
    before = {rail["id"]: deepcopy(rail["timeline"]) for rail in (upper, lower)}
    source_q = lower["timeline"]
    feedback_release = (ramp["until_x"] - X0) / SPEED
    if (upper["timeline"] != source_q or source_q.get("start_s") != .2
            or source_q.get("warning_s") != .8 or source_q.get("cooldown_s") != 6
            or not math.isclose(source_q["start_s"] + source_q["warning_s"] + source_q["active_s"], feedback_release, abs_tol=1e-10, rel_tol=0)):
        raise ValueError("Laser release requires the original synchronized rail clocks")
    slope = lower["motion"]["dy_px"] / lower["motion"]["dx_px"]
    omega = 2.0 * math.pi / lower["motion"]["period_s"]
    sine_speed = abs(lower["motion"]["amplitude_px"] * omega)
    guide_slope = (ramp["target_y_end"] - ramp["target_y"]) / (ramp["until_x"] - ramp["x"])
    maximum_upward_boundary_speed = abs(slope * SPEED) + sine_speed
    # This is a reference single-flap return speed, NOT a maximum carried vy.
    # The source's late descending threshold and native frame give an explicit
    # recipe scale. Incoming states can exceed it; no safety box is asserted.
    reference_descent_speed = FLAP_SPEED + GRAVITY * NATIVE_DT
    reserve = (reference_descent_speed + maximum_upward_boundary_speed) * NATIVE_DT

    def threshold(t):
        return ramp["target_y"] + guide_slope * (X0 + SPEED * t - ramp["x"])

    def surplus(t):
        return _lower_center_bound(lower, t, X0 + SPEED * t) - threshold(t)

    entry = (gate["x"] - RADIUS - X0) / SPEED
    lo, hi = entry, feedback_release
    # A global derivative bound makes this a unique descriptor root. Do not
    # sample a trajectory or select among alternative recipes after execution.
    if (slope * SPEED + sine_speed - guide_slope * SPEED >= 0
            or not (ramp["x"] < X0 + SPEED * entry < ramp["until_x"])
            or not (surplus(lo) > reserve > surplus(hi))):
        raise ValueError("Laser release lacks the source monotone late threshold/capsule crossing")
    for _ in range(60):
        mid = (lo + hi) / 2.0
        if surplus(mid) > reserve:
            lo = mid
        else:
            hi = mid
    root = (lo + hi) / 2.0
    # A translated module need not land on the global120Hz tick lattice. One
    # extra tick prevents the first native cooldown sample falling after root.
    release = root - NATIVE_DT
    active_start = source_q["start_s"] + source_q["warning_s"]
    active = release - active_start
    removed = feedback_release - release
    release_x = X0 + SPEED * release
    capsule_offset = (RADIUS + lower["collider"]["width"] / 2.0) * math.hypot(1.0, slope)
    foot_x = release_x - slope * capsule_offset / (1.0 + slope * slope)
    if (not entry < release < feedback_release or active <= 0
            or not lower["x"] < foot_x < lower["x"] + lower["motion"]["dx_px"]):
        raise ValueError("Laser release must remain inside the live finite lower segment")
    for rail in (upper, lower):
        rail["timeline"]["active_s"] = active
        rail["timeline"]["cooldown_s"] += removed
    note = {
        "id": MARKER, "first_revision": 10, "stage_index": stage, "difficulty": difficulty,
        "physical_clock_changed": True, "geometry_changed": False,
        "changed_bodies": ["inclined-upper", "inclined-lower"],
        "changed_fields": ["timeline.active_s", "timeline.cooldown_s"],
        "feedback_changes": [], "before_timelines": before,
        "after_timelines": {rail["id"]: deepcopy(rail["timeline"]) for rail in (upper, lower)},
        "relation": "Both real rails enter cooldown one native tick before the unique point where the moving full-radius lower-capsule boundary approaches the unchanged rising feedback threshold by one reference frame of combined descent and boundary sweep; added cooldown preserves every later warning/active origin",
        "supersedes_source_relation": "Source and v6/v7 descriptions equating physical rail cooldown with feedback release x720 are historical. Physical cooldown now precedes that unchanged feedback cue. The v7 gate still protects the latest flap before the later feedback release, with unchanged closing onset and whole-radius tail squeeze.",
        "derived": {
            "old_physical_release_s": feedback_release,
            "physical_release_s": release, "physical_release_player_x": release_x,
            "feedback_release_s": feedback_release, "feedback_release_player_x": ramp["until_x"],
            "physical_to_feedback_release_s": removed,
            "old_active_duration_s": before[lower["id"]]["active_s"],
            "new_active_duration_s": active,
            "active_duration_retained_fraction": active / before[lower["id"]]["active_s"],
            "live_feedback_ascent_distance_px": release_x - ramp["x"],
            "old_live_feedback_ascent_distance_px": ramp["until_x"] - ramp["x"],
            "live_feedback_ascent_distance_retained_fraction": (release_x - ramp["x"]) / (ramp["until_x"] - ramp["x"]),
            "root_time_s": root, "reference_frame_reserve_px": reserve,
            "reference_descent_speed_px_s": reference_descent_speed,
            "maximum_source_boundary_upward_speed_px_s": maximum_upward_boundary_speed,
            "root_full_radius_lower_bound_y": _lower_center_bound(lower, root, X0 + SPEED * root),
            "root_feedback_threshold_y": threshold(root),
            "native_clock_alignment_lead_s": NATIVE_DT,
            "capsule_vertical_center_offset_px": capsule_offset,
            "release_before_finite_endpoint_px": lower["x"] + lower["motion"]["dx_px"] - release_x,
            "rail_cycle_period_s": sum(source_q[k] for k in CYCLE_FIELDS),
            "gate_closing_start_s": sum(gate["timeline"][k] for k in ("start_s", "warning_s", "opening_s", "hold_s")),
        },
        "pressure_dimensions": ["active ascending input cadence", "carried-state control", "real phase release and closing receipt"],
        "preserved": ["both finite rail bodies and collision widths", "rail positions, slopes and native sine phase", "synchronized real active ascent and repeating cooldown", "rail warning origins, active origins and full cycle period", "all feedback guides and last-flap release cue", "all receiving-gate geometry and clocks", "continuous incoming y/vy and world time", "all earlier hazards and all later cycles"],
        "evidence_basis": {
            "saved_runs": ["integration/runs/stage-pressure/B2/runs/holdout-6206", "integration/runs/stage-pressure/B1/runs/holdout-6103", "integration/runs/stage-pressure/B1/runs/baseline-703", "integration/runs/stage-pressure/B1/runs/baseline-706"],
            "observed_source": "The four saved native traces descend into the still-active lower rail at local x707.5-710.8 after repeated64-65tick rising flap intervals. The literal threshold waits for y to reach its target while the capsule bound overtakes it before the original x720 cooldown.",
            "actual_changed_map_measurement": None,
        },
        "qualification": "experimental descriptor-level clock repair; no new native witness, accepted entry-state box, safe input interval, or calibrated human pressure",
        "limitations": ["The reference native-frame reserve is an authored choice, not a bound on arbitrary incoming vy or a measured intervention tolerance", "An unchanged-feedback ascent can retain identical click cadence; frequency is separate from actual ascent and spatial/phase demand", "Passive saved-state phase checks do not establish changed-map survival or full receipt", "The last part of the feedback ascent now occurs during real cooldown and must not be reported as active-rail traversal"],
        "state_policy": "No physics execution, rollout search, state reset, incoming-state override, controller change, clock reset, or hazard deletion",
    }
    out["metadata"]["laser_release_v10"] = note
    notes.append(deepcopy(note))
    eligibility.require_mechanics(out, "laser release output including nested provenance")
    return out
