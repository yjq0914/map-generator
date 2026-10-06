"""Two deterministic DESIGN30-derived relational fragment emitters.

This module only constructs native descriptors.  It never advances a runtime,
restores a state, samples independent coordinates, or assigns qualification.
Difficulty names denote discrete authoring recipes, not measured skill bands.
"""

from __future__ import annotations

from copy import deepcopy


FAMILIES = ("tidal-staircase", "bellows-question-answer")
VARIANTS = ("base", "extended")
DIFFICULTIES = ("easy", "medium", "hard")
X0 = 60.0
HEIGHT = 540.0
RADIUS = 10.0
SPEED = 150.0


def _body(name, kind, x, y, width, height, group):
    return {
        "id": name,
        "mechanic_kind": kind,
        "x": float(x),
        "y": float(y),
        "collider": {"shape": "rectangle", "w": float(width), "h": float(height)},
        "effect_region": None,
        "motion": None,
        "timeline": None,
        "interaction": {"lethal": True},
        "route_id": "main",
        "mount": "world",
        "group_id": group,
        "stage_id": "integration-additional-v1",
    }


def _map(family, variant, difficulty, width, bodies):
    return {
        "schema": "flappy-loop-lab/1",
        "id": f"{family}-{variant}-{difficulty}",
        "seed": 1,
        "width": float(width),
        "height": 540,
        "route_id": "main",
        "units": {"distance": "px", "time": "s", "velocity": "px/s"},
        "generator_parameters": {
            "family": family,
            "variant": variant,
            "difficulty": difficulty,
            "status": "candidate_unqualified",
        },
        "initial_player": {"x": 60, "y": 270, "vx": 150, "vy": 0},
        "obstacles": bodies,
    }


def _metadata(family, variant, difficulty, native, sources, verbs):
    return {
        "schema": "additional-relational-fragment/1",
        "family": family,
        "variant": variant,
        "difficulty": difficulty,
        "classification": "candidate_unqualified",
        "physically_qualified": False,
        "continuous_safe_range": None,
        "difficulty_status": "discrete authored recipes; ordering not empirically calibrated",
        "new_physics_run": False,
        "sources": sources,
        "behavioral_verbs": verbs,
        "native_duration_s": (native["width"] - X0) / SPEED,
        "entry": {
            "initial_player": deepcopy(native["initial_player"]),
            "accepted_state_box": None,
        },
        "exit": {
            "actual_state": None,
            "desired_target_y": 270,
            "preserve": ["actual x/y/vx/vy", "world tick and clock", "all earlier live hazards"],
        },
        "guide_scope": (
            "Piecewise control aims on [x, until_x); not a trajectory, clearance proof, "
            "input tape, accepted state range, or horizontal waiting instruction"
        ),
        "composition_scope": (
            "Standalone fresh entry only. Translation must retime every clocked descriptor "
            "against the persistent world clock; composition must receive actual incoming state."
        ),
    }


def _guide(spans):
    return [
        {"x": float(start), "target_y": float(target), "until_x": float(end)}
        for start, end, target in spans
    ]


def _tidal(variant, difficulty):
    """Keep unequal overlapping banks; derive height bands from shared apertures."""
    # Baseline exactly preserves the corrected R02 local geometry, translated by60.
    aperture = {"easy": 180.0, "medium": 160.0, "hard": 136.0}[difficulty]
    inserted_shelf = 180.0 if variant == "extended" else 0.0
    cut = 520.0
    high_center, low_center, exit_center = 170.0, 395.0, 220.0
    high_roof = high_center - aperture / 2
    high_bank = high_center + aperture / 2
    low_roof = low_center - (aperture + 10) / 2
    low_bank = low_center + (aperture + 10) / 2
    exit_roof = exit_center - aperture / 2
    exit_bank = exit_center + aperture / 2
    descriptors = [
        ("roof-1", 220, 0, 180, high_roof),
        ("roof-2", 480, 0, 220, high_roof),
        ("roof-3", 850, 0, 260, low_roof),
        ("roof-4", 1170, 0, 190, exit_roof),
        ("bank-1", 280, high_bank, 300, HEIGHT - high_bank),
        ("bank-2", 640, 330, 120, 210),
        ("bank-3", 920, low_bank, 290, HEIGHT - low_bank),
        ("bank-4", 1280, exit_bank, 130, HEIGHT - exit_bank),
    ]
    bodies = []
    for name, x, y, width, height in descriptors:
        # Inserting a held section stretches ONLY bodies crossing the cut and
        # translates its suffix. It does not multiply every x or empty gap.
        if x >= cut:
            x += inserted_shelf
        elif x + width > cut:
            width += inserted_shelf
        bodies.append(_body(name, "fixed_armor_or_spike", X0 + x, y, width, height, "tidal-banks"))

    def wx(x):
        return X0 + x + (inserted_shelf if x > cut else 0.0)

    native = _map("tidal-staircase", variant, difficulty, X0 + 1530 + inserted_shelf, bodies)
    metadata = _metadata(
        "tidal-staircase", variant, difficulty, native,
        [
            {
                "candidate_id": "candidate-spatial-tidal-terraces",
                "candidate_version": 3,
                "author_id": "tidal-admissible-band-v2",
                "round": "R02",
                "record": "records/candidates/candidate-spatial-tidal-terraces.v3.json",
                "payload": "sources/0764d4245af0a4a4/families.json",
                "evidence_ids": ["evidence-r02-spatial-geometry@1", "review-r02-tidal-v2@1"],
                "scope": "corrected static geometry only; source has no physics witness",
            }
        ],
        ["prepare", "climb", "sustain high", "release downward", "sustain low", "lift to exit"],
    )
    high_band = [high_roof + RADIUS, high_bank - RADIUS]
    low_band = [low_roof + RADIUS, low_bank - RADIUS]
    exit_band = [exit_roof + RADIUS, exit_bank - RADIUS]
    metadata.update({
        "action_grammar": "prepare → climb and sustain → release into long trough → lift to exit",
        "theme": "Unequal stair banks outline one crest and a deeper trough",
        "mechanics": ["fixed_armor_or_spike"],
        "parameters": {"high_aperture_px": aperture, "low_aperture_px": aperture + 10, "inserted_high_shelf_px": inserted_shelf},
        "relations": [
            "High, low and exit center heights are fixed; each roof/bank pair derives from one shared aperture",
            "Roof and bank horizontal runs are unequal, offset and overlapping, not repeated paired pipes",
            "The low aperture is10px taller than the high one; intermediate bank remains a descent step",
            "Extended inserts180px inside the existing high shelf and translates only the suffix; duration gains1.2s",
        ],
        "derived": {
            "exclusive_center_bands": {"high": high_band, "low": low_band, "exit": exit_band},
            "band_probe_x": {"high": wx(520), "low": wx(980), "exit": wx(1320)},
            "minimum_high_to_low_change_px": low_band[0] - high_band[1],
            "minimum_low_to_exit_change_px": low_band[0] - exit_band[1],
            "constant_y_global_intersection_empty": True,
            "last_body_radius_clear_x": wx(1420),
            "radius_clear_recovery_px": 110.0,
        },
        "limitations": [
            "Disjoint static bands require a height change, not the exact larger illustrated wave",
            "No native trajectory, input range, camera readability, seam or human-play claim",
            "The earlier v1 flat-y270 counterexample remains valid for v1; this uses its corrected successor",
            "Extended shelf and easy/hard aperture recipes are new unqualified relational adaptations",
        ],
    })
    # Targets anticipate the next restriction, but retain the high bank until
    # the whole player clears it. These are feedback hints, not solved inputs.
    guide = _guide([
        (X0, wx(115), 270),
        (wx(115), wx(595), 180),
        (wx(595), wx(750), 270),
        (wx(750), wx(1125), 385),
        (wx(1125), wx(1260), 270),
        (wx(1260), wx(1420), 235),
        (wx(1420), native["width"], 270),
    ])
    return {"map": native, "metadata": metadata, "guide": guide}


def _bellows(variant, difficulty):
    """Clock-paired four gates: low/high question, high/low thicker answer."""
    margin_delta = {"easy": 0.10, "medium": 0.0, "hard": -0.08}[difficulty]
    aperture_delta = {"easy": 6.0, "medium": 0.0, "hard": -12.0}[difficulty]
    final_extension = 90.0 if variant == "extended" else 0.0
    warning, opening, closing, cooldown = 0.9, 0.45, 0.55, 12.0
    widths = [72.0, 72.0, 96.0, 120.0 + final_extension]
    baseline_widths = [72.0, 72.0, 96.0, 120.0]
    baseline_holds = [1.25, 1.45, 1.55, 2.1]
    heights = [375.0, 215.0, 245.0, 375.0]
    apertures = [180.0 + aperture_delta, 160.0 + aperture_delta, 180.0 + aperture_delta, 200.0 + aperture_delta]
    # Equal front/tail reserves are from the actual radius-expanded occupancy,
    # not a center crossing. Increasing final thickness increases hold too.
    margins = [(hold - (width + 2 * RADIUS) / SPEED) / 2 + margin_delta
               for hold, width in zip(baseline_holds, baseline_widths)]
    holds = [(width + 2 * RADIUS) / SPEED + 2 * margin
             for width, margin in zip(widths, margins)]
    bodies, events = [], []
    previous_close = None
    for i, name in enumerate(("Q-in", "Q-out", "A-in", "A-out")):
        width, hold, margin = widths[i], holds[i], margins[i]
        if i == 0:
            x = 420.0
            full = (x - RADIUS - X0) / SPEED - margin
        elif i in (1, 2):
            # A closing event launches the next opening on the SAME clock.
            full = previous_close + opening
            x = X0 + SPEED * (full + margin) + RADIUS
        else:
            # Preserve the distinct downward answer's interior flight space.
            x = bodies[2]["x"] + 295.0
            full = (x - RADIUS - X0) / SPEED - margin
        start = full - warning - opening
        close = full + hold
        gate = _body(name, "timed_armor_gate", x, heights[i], width, HEIGHT, "question" if i < 2 else "answer")
        gate["motion"] = {"opening_px": apertures[i]}
        gate["timeline"] = {
            "start_s": start, "warning_s": warning, "opening_s": opening,
            "hold_s": hold, "closing_s": closing, "cooldown_s": cooldown,
        }
        bodies.append(gate)
        events.append({
            "id": name,
            "warning_start_s": start,
            "opening_start_s": full - opening,
            "full_open_start_s": full,
            "closing_start_s": close,
            "closed_s": close + closing,
            "whole_player_occupancy_s": [(x - RADIUS - X0) / SPEED, (x + width + RADIUS - X0) / SPEED],
            "full_open_front_margin_s": margin,
            "full_open_tail_margin_s": margin,
            "exclusive_center_band": [heights[i] - apertures[i] / 2 + RADIUS, heights[i] + apertures[i] / 2 - RADIUS],
        })
        previous_close = close
    native = _map("bellows-question-answer", variant, difficulty, bodies[-1]["x"] + widths[-1] + 305, bodies)
    metadata = _metadata(
        "bellows-question-answer", variant, difficulty, native,
        [
            {
                "candidate_id": "candidate-same-type-bellows",
                "candidate_version": 3,
                "author_id": "same-type.bellows",
                "round": "R05",
                "record": "records/candidates/candidate-same-type-bellows.v3.json",
                "payload": "sources/1d509cf664af73f4/concepts.json",
                "evidence_ids": ["review-r01-same-v2@1", "review-r05-closure@1"],
                "scope": "event/geometry timing only; source has no physical cross-chamber transfer witness",
            }
        ],
        ["descend to low call", "lift into reply", "retain high handoff", "release to low answer", "sustain through thick outlet"],
    )
    metadata.update({
        "action_grammar": "low entry → high reply → high handoff → low answer → sustain through thick outlet",
        "theme": "Two wall-bellows chambers, with a low-to-high question and a thicker reversed answer",
        "mechanics": ["timed_armor_gate"],
        "parameters": {
            "whole_player_front_tail_margin_delta_s": margin_delta,
            "aperture_delta_px": aperture_delta,
            "final_gate_extension_px": final_extension,
        },
        "relations": [
            "Q-in closing begins exactly when Q-out opening begins",
            "Q-out closing begins exactly when A-in opening begins; no per-body clock reset",
            "Opening clocks derive from radius-expanded front/tail occupancy and positive temporal reserves",
            "The answer reverses the low-to-high question; final gate is thickest and has the longest full-open hold",
            "Extended final gate adds90px body thickness and0.6s hold/duration; it adds a sustained outlet, not an empty rest",
        ],
        "derived": {
            "events": events,
            "Q_out_close_equals_A_in_open_s": events[1]["closing_start_s"],
            "high_handoff_band_intersection": [max(events[1]["exclusive_center_band"][0], events[2]["exclusive_center_band"][0]), min(events[1]["exclusive_center_band"][1], events[2]["exclusive_center_band"][1])],
            "minimum_first_low_to_high_change_px": events[0]["exclusive_center_band"][0] - events[1]["exclusive_center_band"][1],
            "last_body_radius_clear_x": bodies[-1]["x"] + widths[-1] + RADIUS,
            "radius_clear_recovery_px": 295.0,
        },
        "limitations": [
            "Gate warning is CLOSED and lethal; no outside bypass and no horizontal waiting",
            "Clock coverage is not a reachable y/vy interval or a successful passage",
            "High handoff is a geometric band intersection only; actual state transfer remains unmeasured",
            "The first question forces only the reported minimum height change; the full centerline excursion is optional",
            "The final answer's bands may overlap; descending all the way to its center is an authoring intent",
            "Future cycles remain live in compositions; no deletion or neutralization of earlier gates",
            "Difficulty and extension are discrete unqualified adaptations, not inherited source qualification",
        ],
    })
    first, second, third, last = bodies
    guide = _guide([
        (X0, first["x"] - 180, 270),
        (first["x"] - 180, first["x"] + widths[0] + RADIUS, heights[0]),
        (first["x"] + widths[0] + RADIUS, second["x"] + widths[1] + RADIUS, heights[1]),
        (second["x"] + widths[1] + RADIUS, third["x"] + widths[2] + RADIUS, heights[2]),
        (third["x"] + widths[2] + RADIUS, last["x"] + widths[3] + RADIUS, heights[3]),
        (last["x"] + widths[3] + RADIUS, native["width"], 270),
    ])
    return {"map": native, "metadata": metadata, "guide": guide}


def emit(family, variant="base", difficulty="medium"):
    """Emit a deterministic native fragment plus provenance and control hints.

    Only the named discrete recipes are accepted. There is deliberately no
    seed-driven coordinate jitter, external entry-state override, or free phase.
    """
    if family not in FAMILIES:
        raise ValueError(f"Unknown additional family: {family!r}; expected one of {FAMILIES}")
    if variant not in VARIANTS:
        raise ValueError(f"Unknown variant: {variant!r}; expected one of {VARIANTS}")
    if difficulty not in DIFFICULTIES:
        raise ValueError(f"Unknown difficulty: {difficulty!r}; expected one of {DIFFICULTIES}")
    return _tidal(variant, difficulty) if family == "tidal-staircase" else _bellows(variant, difficulty)
