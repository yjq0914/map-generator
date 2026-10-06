"""Small, discrete stage-pressure alternatives for two long-cruise relations.

Call after the v4--v7 refinements. This module only edits authored native bodies
and feedback aims; it neither steps physics nor initializes/restores a state.
The old apertures/difficulty recipes and inlet/outlet bodies remain unchanged.
Stage pressure is multidimensional: stage 0 can demand sustained precision;
stages 1/2 here test redirect preparation and chained line changes, not a
claim that more flaps, more movement, or narrower gaps are inherently harder.
"""
from copy import deepcopy

import active_eligibility as eligibility

STAGES = ("read", "redirect", "chain")
FAMILIES = (
    "cloister", "slider-island", "spring-reception", "light-cavity",
    "tidal-staircase", "bellows-question-answer",
)
RADIUS = 10.0
FLAP_CREST_RISE_PX = 290.0 ** 2 / (2.0 * 820.0)
MARKER = "stage-local-static-redirections-v8"


def _wall(name, x, width, bottom):
    return {
        "id": name, "mechanic_kind": "fixed_armor_or_spike",
        "x": float(x), "y": 0.0,
        "collider": {"shape": "rectangle", "w": float(width), "h": float(bottom)},
        "effect_region": None, "motion": None, "timeline": None,
        "interaction": {"lethal": True}, "route_id": "main", "mount": "world",
        "group_id": "stage-local-line-change", "stage_id": "integration-stage-v8",
    }


def _band(body, side, height=540.0):
    if side == "above":
        return [RADIUS, body["y"] - RADIUS]
    return [body["y"] + body["collider"]["h"] + RADIUS, height - RADIUS]


def _tidal(out, stage):
    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    bank, notch, step = (bodies[n] for n in ("bank-1", "roof-2", "bank-2"))
    if (bank["x"] != 340 or notch["x"] != 540
            or step["collider"]["w"] != 60):
        raise ValueError("Tidal stage relation requires source banks and revision-6 short step")
    rows = out["guide"]
    indices = [i for i, g in enumerate(rows) if g["target_y"] == 180]
    if len(indices) != 1:
        raise ValueError("Tidal stage relation requires one explicit high shelf guide")
    i = indices[0]
    high, middle = rows[i:i + 2]
    if (middle["target_y"] != 270 or high["until_x"] != middle["x"]
            or middle["until_x"] != step["x"] + step["collider"]["w"] + RADIUS):
        raise ValueError("Tidal stage relation requires the unchanged middle-step release")
    old_high_span = [high["x"], high["until_x"]]
    width, x, notch_width, bottom, target = {
        1: (120.0, 600.0, 50.0, 260.0, 330.0),
        2: (100.0, 590.0, 70.0, 285.0, 355.0),
    }[stage]
    bank["collider"]["w"] = width
    notch.update(x=x, y=0.0)
    notch["collider"].update(w=notch_width, h=bottom)
    release = bank["x"] + width + RADIUS
    notch_clear = x + notch_width + RADIUS
    middle_clear = middle["until_x"]
    rows[i:i + 2] = [
        {**high, "until_x": release},
        {"x": release, "until_x": notch_clear, "target_y": target},
        {**middle, "x": notch_clear, "until_x": middle_clear},
    ]
    upstream_band, notch_band, step_band = _band(bank, "above"), _band(notch, "below"), _band(step, "above")
    return {
        "changed_bodies": ["bank-1", "roof-2"],
        "pressure_dimensions": ["line-change preparation", "whole-radius release precision", "chained descent/rise"],
        "action_bands": [
            {"source_body_ids": ["roof-1", "bank-1"], "x": bank["x"] + width / 2, "center_band_y": [bodies["roof-1"]["collider"]["h"] + RADIUS, upstream_band[1]]},
            {"source_body_ids": ["roof-2"], "x": x + notch_width / 2, "center_band_y": notch_band},
            {"source_body_ids": ["bank-2"], "x": step["x"] + step["collider"]["w"] / 2, "center_band_y": step_band},
        ],
        "relations": [{
            "kind": "high-bank-to-low-notch-to-middle-step",
            "body_ids": ["bank-1", "roof-2", "bank-2"],
            "center_bands_y": [upstream_band, notch_band, step_band],
            "minimum_first_descent_px": notch_band[0] - upstream_band[1],
            "first_bank_radius_clear_x": release,
            "notch_radius_entry_x": x - RADIUS,
            "notch_radius_clear_x": notch_clear,
            "middle_step_radius_entry_x": step["x"] - RADIUS,
            "preparation_runway_px": x - RADIUS - release,
            "notch_to_step_runway_px": step["x"] - RADIUS - notch_clear,
            "notch_target_y": target,
            "ideal_flap_crest_y": target - FLAP_CREST_RISE_PX,
            "ideal_crest_roof_reserve_px": target - FLAP_CREST_RISE_PX - notch_band[0],
            "original_high_guide_span_x": old_high_span,
            "high_guide_span_x": [high["x"], release],
            "stage_effect": "replace extended high cruise with a visible disjoint low notch, then re-enter the original middle step",
            "limits": "Steady ideal flap arc only; incoming vy, flap phase and entire carried passage remain unproved. The low-notch and middle-step bands overlap, so their rise is an authored aim, not a universal forced action.",
        }],
        "preserved": ["inlet roof-1", "all source aperture heights except relocated interior roof-2", "bank-2 and its low-descent release", "roof-3/bank-3 trough", "roof-4/bank-4 exit", "active x envelope", "all clocks and initial state"],
    }


def _upper_slider(out, stage):
    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    island, slider = bodies["island"], bodies["slider"]
    if (island["x"] != 540 or slider["x"] != 450
            or len(out["guide"]) != 3):
        raise ValueError("Upper slider stage relation requires the source base branch")
    inlet, upper, merge = out["guide"]
    if (upper["x"] != 235 or upper["until_x"] != 686 or upper["target_y"] != 190
            or merge["x"] != upper["until_x"]):
        raise ValueError("Upper slider stage relation requires source upper-route guides")
    x, width = {1: (335.0, 40.0), 2: (345.0, 55.0)}[stage]
    notch = _wall("stage-approach-roof", x, width, 230.0)
    out["map"]["obstacles"].append(notch)
    clear = x + width + RADIUS
    out["guide"] = [
        inlet,
        {"x": upper["x"], "until_x": clear, "target_y": 300.0},
        {**upper, "x": clear},
        merge,
    ]
    changed = [notch["id"]]
    action_bands = [{"source_body_ids": [notch["id"], "corridor-bottom"], "x": x + width / 2, "center_band_y": [240.0, bodies["corridor-bottom"]["y"] - RADIUS]}]
    notch_band = [240.0, bodies["corridor-bottom"]["y"] - RADIUS]
    upper_band = [bodies["corridor-top"]["collider"]["h"] + RADIUS, island["y"] - RADIUS]
    relations = [{
        "kind": "low-approach-to-upper-island",
        "body_ids": [notch["id"], "slider", "island"],
        "center_bands_y": [notch_band, upper_band],
        "minimum_upper_route_rise_px": notch_band[0] - upper_band[1],
        "notch_radius_clear_x": clear,
        "slider_radius_entry_x": slider["x"] - RADIUS,
        "post_notch_preparation_runway_px": slider["x"] - RADIUS - clear,
        "island_radius_entry_x": island["x"] - RADIUS,
        "notch_target_y": 300.0,
        "ideal_flap_crest_y": 300.0 - FLAP_CREST_RISE_PX,
        "ideal_crest_roof_reserve_px": 300.0 - FLAP_CREST_RISE_PX - notch_band[0],
        "original_upper_guide_span_x": [upper["x"], upper["until_x"]],
        "upper_guide_span_x": [clear, upper["until_x"]],
        "stage_effect": "ordinary roof delays upper-route commitment; stage2 leaves30px rather than55px before the same live slider",
        "limits": "Disjoint bands describe the existing upper route only; a lower bypass remains possible. Slider phase and carried y/vy feasibility remain unproved.",
    }]
    if stage == 2:
        roof = _wall("stage-merge-roof", 830.0, 20.0, 245.0)
        out["map"]["obstacles"].append(roof)
        clear = roof["x"] + roof["collider"]["w"] + RADIUS
        out["guide"][-1:] = [
            {**merge, "until_x": clear, "target_y": 320.0},
            {**merge, "x": clear},
        ]
        changed.append(roof["id"])
        action_bands.append({"source_body_ids": [roof["id"], "corridor-bottom"], "x": roof["x"] + roof["collider"]["w"] / 2, "center_band_y": [255.0, bodies["corridor-bottom"]["y"] - RADIUS]})
        merge_band = [255.0, bodies["receiver-bottom"]["y"] - RADIUS]
        relations.append({
            "kind": "upper-island-to-deeper-merge",
            "body_ids": ["island", roof["id"], "receiver-top", "receiver-bottom"],
            "center_bands_y": [upper_band, merge_band],
            "minimum_upper_route_descent_px": merge_band[0] - upper_band[1],
            "island_radius_clear_x": island["x"] + island["collider"]["w"] + RADIUS,
            "merge_roof_radius_entry_x": roof["x"] - RADIUS,
            "merge_roof_radius_clear_x": clear,
            "merge_target_y": 320.0,
            "ideal_flap_crest_y": 320.0 - FLAP_CREST_RISE_PX,
            "ideal_crest_roof_reserve_px": 320.0 - FLAP_CREST_RISE_PX - merge_band[0],
            "stage_effect": "retain the original upper-to-middle return but require a deeper pre-receiver descent before the unchanged outlet",
            "limits": "Authored whole-radius line constraints; not a successful impulse sequence or accepted exit-state box.",
        })
    return {
        "changed_bodies": changed,
        "action_bands": action_bands,
        "pressure_dimensions": ["phase-aware route commitment", "line-change preparation"] + (["chained merge precision"] if stage == 2 else []),
        "relations": relations,
        "preserved": ["inlet bodies", "slider body, sine amplitude, phase and period", "island and both route possibilities", "receiver bodies and exit aperture", "active x envelope", "all clocks and initial state"],
    }


def refine_fragment(f, difficulty="medium", stage=0, revision=8):
    """Deep-copy one v7 fragment into an explicit unqualified stage alternative.

    The lower slider and four other families are deliberately unchanged in this
    initial, causally small revision. Reapplying the same stage is idempotent;
    applying a different stage to already refined geometry is rejected rather
    than compounding edits. Start from the original v7 fragment for each stage.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(stage, bool) or not isinstance(stage, int) or stage not in range(3):
        raise ValueError("stage must be the integer0,1,or2")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    eligibility.require_mechanics(f, "stage relation input including nested provenance")
    out = deepcopy(f)
    if revision < 8:
        return out
    if out.get("family") not in FAMILIES:
        raise ValueError("Unknown stage relation family")
    previous = out["metadata"].get("stage_relations_v8")
    if previous:
        if previous["stage_index"] != stage or previous["difficulty"] != difficulty:
            raise ValueError("Cannot restage an already refined fragment; use its original v7 source")
        return out
    info = {
        "id": MARKER, "first_revision": 8, "stage_index": stage,
        "stage_name": STAGES[stage], "difficulty": difficulty,
        "geometry_changed": False, "changed_bodies": [], "relations": [], "action_bands": [],
        "pressure_dimensions": ["existing sustained precision and route reading"],
        "reason": "Stage0 preserves the established source relationship" if stage == 0 else "Initial v8 scope deliberately leaves this family/branch unchanged",
        "qualification": "experimental authored pressure hypothesis; not observed action, calibrated difficulty, or a safe incoming-state box",
        "state_policy": "no physics run, state reset, incoming-state override, clock reset, or hazard deletion",
    }
    if stage and out["family"] == "tidal-staircase":
        info.update(_tidal(out, stage), geometry_changed=True, reason="Break the observed extended high corridor with body-backed redirection")
    elif stage and out["family"] == "slider-island" and out.get("variant") == "base":
        info.update(_upper_slider(out, stage), geometry_changed=True, reason="Replace upper-route cruise with an ordinary roof and later route commitment")
    out["metadata"]["stage_relations_v8"] = info
    out["metadata"].setdefault("integration_refinements", []).append(deepcopy(info))
    eligibility.require_mechanics(out, "stage relation output including nested provenance")
    return out
