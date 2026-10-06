# Small loop: light and tidal carried-state handoffs

Status: source frozen; integration reserved for B3 after B2 diagnosis. This small
loop is exploratory evidence, not an additional official big loop or a passed
panel. Exactly **2 native physics probes** were run: **1 full-map failure and
1 full-map native win**. No failed attempt was dropped, and no further physics
was used for the focused tests.

## Frozen source and exact edit scope

- Source: `integration/rules/handoffs_v6.py`
- SHA-256: `8b37c0ec981a51e6cb10c283fb70be4450e168de8c28dd3d7532dd4ddfecdaab`
- Entry point: `refine_fragment(f, difficulty, revision)`; no-op below revision6
- Pure deep copy; repeat calls are idempotent. It runs no controller, simulator,
  planner, replay, state restore or tuning search
- Light: only the channel guide endpoints change, `400→235` to `450→255`
  - Early cue is source rail midpoint minus5px
  - Late cue is the fully open gate's minimum player-center y plus55px of
    authored flap-crest reserve
  - Rails, finite lengths, all clocks, cooldown, release x, gate opening,
    closing and full tail remain unchanged
- Tidal: only bank-2 width changes120→60px. The low-target cue moves to that
  shortened bank's right edge plus10px player radius
  - Base release x810→770; alternate x990→950
  - Radius-clear descent runway grows70→130px
  - Roof-3, its low aperture, other seven bodies, map width, initial state and
    all other guide targets remain unchanged
- Generator, runtime and diagnostic controller were not edited by this work
- The same discrete correction is available across difficulties; no measured
  difficulty ordering or accepted carried-state box is claimed

## Source diagnosis, checked at the exact terminal tick

`terminal-body-review.json` stores native
`runtime.obstacles(map, finalState.tick, finalState)` results and hashes of the
baseline maps, results, traces and inputs. A montage was not used to infer phase.

- Baseline701: active upper laser; terminal tick1690, player x2172.5/y370.484
- Baseline703: active upper laser; terminal tick1236, player x1604.375/y357.924
- Baseline706: the receiver is fully open, but its top remains lethal. A late
  flap at y246.199 carries the player upward into the top; terminal y199.751
  violates the y200 center limit. This is not a laser phase failure
- Baseline702: late target270 flap at x966.25/y272.670 leaves the player only at
  y289.828 when its radius meets roof-3 at x1080. The shortened intermediate
  bank permits an earlier real release, rather than widening the next wall

Each is a failure of the recorded authored-cue trajectory. None proves the
original geometry impossible for every input or incoming state.

## Two preregistered full-world probes

The manifest was written before either run. Each candidate starts from its
recorded B1 baseline map and changes only its stated light or tidal relationship.
Horizon is4500 ticks. Both use unchanged `relational-source-v3`, one native
initialization, zero restores/resets and zero deleted hazards. They are not
official3600-tick paired-panel observations.

1. `light-ramp-701`: **full-map failure**, tick2900, unchanged tidal roof-3
   - Light's complete geometry and receiver tail are traversed
   - Actual light→tidal seam: tick2228, x2845, y348.35, vy195.1667
   - The original light failure ended at tick1690
   - This is a local handoff improvement, not a full-map win
2. `tidal-short-step-702`: **full-map native win**, tick3785
   - Original tidal failure ended at tick816
   - No initial state was taken from a checkpoint or injected at a seam

Both directories retain `map.json`, `trace.json.gz`, `inputs.json` and complete
`result.json`, including the failed light probe. `manifest.json` binds candidate
maps, original sources, controller and runtime. `terminal-body-review.json`
also records result, trace and input hashes.

## Static regression coverage

`integration/tests/test_handoffs_v6.py` checks the frozen source hash, revision
gate, all36 family/variant/difficulty combinations, unchanged unrelated
families, no mutation, idempotence, exact edit scope, invalid source rejection,
retained evidence hashes,2 probes with1 failure/1 win, native continuity and
correct same-tick death phases. These checks run no physics.

## Remaining limits

The light probe tests one base-rail carried entry; alternate rails and other
entries remain untested by this small loop. The tidal probe tests one medium
alternate fragment from native full-map start. The two changes have not been
jointly probed here. B3 must diagnose its own complete panel, including failures,
late lower-rail clearance, subsequent seams and variant/difficulty differences.
No family qualification, universal clearance, or human-playability claim is
transferred from either result.
