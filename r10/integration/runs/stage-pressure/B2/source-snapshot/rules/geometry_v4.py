"""Small, staged authoring corrections with no physics or runtime state access.

``refine_fragment`` always deep-copies its input. Revision 4 fixes the Cloister
release relation; revisions below 4 preserve the original fragment exactly.
All corrections are experimental and transfer no historical qualification.
"""

from copy import deepcopy


RADIUS = 10.0


def refine_fragment(f, difficulty="medium", revision=4):
    """Return an independent fragment with the corrections enabled by revision.

    The first Cloister disk does not move when the middle answer advances, so
    its release cue must not advance either. Keep the first upper target until
    the whole player clears that disk, plus a discrete 10 px release reserve.
    No obstacle, phase, clock, initial state, or spring behavior is changed.
    This is an authored cue relation, not a proved safe incoming-state range.
    """
    if difficulty not in ("easy", "medium", "hard"):
        raise ValueError("Unknown discrete difficulty")
    if isinstance(revision, bool) or not isinstance(revision, int):
        raise ValueError("revision must be an integer")
    out = deepcopy(f)
    if revision < 4 or out.get("family") != "cloister":
        return out

    marker = "cloister-first-disk-release-v1"
    refinements = out["metadata"].setdefault("integration_refinements", [])
    if any(note.get("id") == marker for note in refinements):
        return out

    first = next(o for o in out["map"]["obstacles"] if o["id"] == "solid-crown-1")
    if first["collider"]["shape"] != "circle":
        raise ValueError("Cloister correction requires the full first disk")
    # These rows remain explicit authored targets, not runtime observations.
    upper, descent = out["guide"][1:3]
    if upper["until_x"] != descent["x"]:
        raise ValueError("Cloister upper/descent guide must have a common boundary")
    prior = descent["x"]
    radius_clear = first["x"] + first["collider"]["w"] + RADIUS
    release = max(prior, radius_clear + 10.0)
    if not upper["x"] < release < descent["until_x"]:
        raise ValueError("Cloister release no longer fits its descent row")
    upper["until_x"] = release
    descent["x"] = release
    refinements.append({
        "id": marker,
        "first_revision": 4,
        "changed_bodies": [],
        "changed_guide_boundary": {"from_x": prior, "to_x": release},
        "relation": "first upper-to-lower cue >= first full disk right + player radius + 10 px; independent of middle answer advance",
        "first_disk_radius_clear_x": radius_clear,
        "release_reserve_px": 10.0,
        "evidence_basis": "L2B new-2701 tick324 first-disk clearance 0.476734666 px; alternate cue advanced to420 despite unchanged first disk",
        "qualification": "experimental authored correction; not a measured safe state box or inherited qualification",
    })
    return out
