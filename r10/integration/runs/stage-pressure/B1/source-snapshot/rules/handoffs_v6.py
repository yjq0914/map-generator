"""Revision-6 authored handoffs; no runtime stepping, state writes, or search.

The evidence is two explicit full-world diagnostic trajectories, not a safe
entry-state box or a claim about human playability. Earlier revisions remain
byte-for-byte equivalent at the fragment-data level.
"""

from copy import deepcopy


RADIUS = 10.0


def refine_fragment(f, difficulty="medium", revision=6):
    """Return an independent fragment with narrowly scoped carried-state cues.

    Light retains both real rails, their clocks, and its full closing receiver.
    Tidal shortens its intermediate shelf, leaving the next low roof and its
    aperture intact. Neither correction initializes or changes player state.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    out = deepcopy(f)
    family = out.get("family")
    if revision < 6 or family not in ("light-cavity", "tidal-staircase"):
        return out

    marker = {
        "light-cavity": "light-carried-ramp-and-receipt-v1",
        "tidal-staircase": "tidal-intermediate-step-release-v1",
    }[family]
    refinements = out["metadata"].setdefault("integration_refinements", [])
    if any(note.get("id") == marker for note in refinements):
        return out
    bodies = {o["id"]: o for o in out["map"]["obstacles"]}
    evidence_root = "integration/runs/four-loops/exploratory-handoffs"
    common = {
        "id": marker,
        "first_revision": 6,
        "difficulty_scope": "same discrete handoff correction across existing aperture recipes; not calibrated difficulty",
        "qualification": "experimental authored correction; no accepted state box or inherited qualification",
        "state_policy": "real incoming y/vy and world tick remain untouched; earlier hazards and future cycles remain live",
    }

    if family == "light-cavity":
        upper = bodies["inclined-upper"]
        lower = bodies["inclined-lower"]
        gate = bodies["wide-receiving-cavity"]
        ramps = [g for g in out["guide"] if g.get("policy") == "laser-channel"]
        if len(ramps) != 1:
            raise ValueError("Light correction requires one explicit channel ramp")
        ramp = ramps[0]
        before = deepcopy(ramp)
        # A threshold is the bottom of the flap arc, not its center. The old
        # 400px threshold requested an ascent into the early upper rail; the
        # old 235px late threshold requested an apex above the gate's top rim.
        # These are discrete authored reserves, not a solved input sequence.
        ramp["target_y"] = (upper["y"] + lower["y"]) / 2.0 - 5.0
        gate_center_min = gate["y"] - gate["motion"]["opening_px"] / 2.0 + RADIUS
        ramp["target_y_end"] = gate_center_min + 55.0
        refinements.append({
            **common,
            "changed_bodies": [],
            "changed_guide": {"before": before, "after": deepcopy(ramp)},
            "relation": "early threshold = rail midpoint minus 5px; late threshold = open gate minimum center y plus 55px authored flap-crest reserve",
            "preserved": ["finite rail lengths", "real laser cooldown", "release guide x", "gate opening and closing timeline", "whole-radius receipt tail"],
            "evidence": {
                "baseline": "B1 baseline-701 and baseline-703 active upper-rail deaths; baseline-706 open gate top death after pre-release flap",
                "probe": evidence_root + "/light-ramp-701/result.json",
                "finding": "450 to 255 ramp traversed full light module; full-world trajectory later died at unchanged tidal roof-3 tick2900",
                "limits": "one carried entry tested; alternate rail, other entries, late lower-rail clearance, and full-map qualification remain unproved",
            },
        })
    else:
        bank = bodies["bank-2"]
        low_roof = bodies["roof-3"]
        if bank["collider"]["shape"] != "rectangle" or bank["collider"]["w"] != 120:
            raise ValueError("Tidal correction requires the source 120px intermediate shelf")
        low_rows = [g for g in out["guide"] if g["target_y"] == 385]
        if len(low_rows) != 1:
            raise ValueError("Tidal correction requires one explicit low-trough row")
        low = low_rows[0]
        index = out["guide"].index(low)
        if index == 0:
            raise ValueError("Tidal low row must follow its intermediate shelf cue")
        prior = out["guide"][index - 1]
        if prior["until_x"] != low["x"]:
            raise ValueError("Tidal intermediate/low guides must share a boundary")
        old_width, old_release = bank["collider"]["w"], low["x"]
        bank["collider"]["w"] = old_width / 2.0
        release = bank["x"] + bank["collider"]["w"] + RADIUS
        if not prior["x"] < release < low["until_x"]:
            raise ValueError("Tidal geometric release does not fit the existing phrase")
        prior["until_x"] = release
        low["x"] = release
        refinements.append({
            **common,
            "changed_bodies": ["bank-2"],
            "intermediate_shelf_width_px": {"before": old_width, "after": bank["collider"]["w"]},
            "changed_guide_boundary": {"from_x": old_release, "to_x": release},
            "relation": "halve only intermediate bank-2; low descent cue starts at its right edge plus player radius; retain next low roof and aperture",
            "radius_clear_descent_runway_px": low_roof["x"] - RADIUS - release,
            "evidence": {
                "baseline": "B1 baseline-702 late target270 flap x966.25 caused roof-3 entry at y289.83; not an impossibility proof",
                "probe": evidence_root + "/tidal-short-step-702/result.json",
                "finding": "60px intermediate shelf and release x950 suppressed that late reset; full-world native win at3785 ticks",
                "limits": "one full-map trajectory tested; other variants, difficulties and carried entries remain unproved",
            },
        })
    return out
