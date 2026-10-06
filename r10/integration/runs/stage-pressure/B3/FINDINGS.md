# B3: two realized timing phrases; freeze rather than invent another change

## Recommendation

Freeze revision 10 for the final bounded validation. B3 and the two targeted native diagnostics provide actual evidence for the changed relationships without revealing a new defect that justifies a speculative fourth geometry change. This is an experimental-version decision, not a calibrated difficulty, robust-playability or fun claim.

The frozen evaluator is unchanged. This review only reads saved maps, traces and results. Sources are B3/STAGE-AUDIT.json/.md, the native run folders and PAIR-STATE-CHECKS.json; diagnostic paths and exact trace hashes are recorded in that companion file.

## Actual occupied phases

| Timing phrase | Candidate emitted / occupied-closing witnessed / tail alive | Heldout emitted / occupied-closing witnessed / tail alive | Closing occupancy in saved frames |
|---|---|---|---|
| Base: high A-in closes | 4 / 4 / 4 | 3 / 3 / 3 | Four frames per passage |
| Alternate: thick low A-out closes | 2 / 2 / 2 | 3 / 3 / 3 | Seven or eight frames per passage |

The alternate now really restores a fully-open high receipt and places slower, longer occupied closing after the high-to-low answer. It is not another label on the same active A-in clock. Its nominal occupied closing lasts 0.7667s, versus 0.3867s for the retained high A-in relation. The saved observations are separate from these descriptor durations.

Paired gate-specific sampled proximity demonstrates the intended redistribution:

| Seed | A-in sampled minimum, B2→B3 | A-out sampled minimum, B2→B3 |
|---:|---:|---:|
| 701 | 15.62→33.21px | 43.47→35.20px |
| 703 | 14.03→25.87px | 34.31→27.66px |

The alternate’s high receipt becomes less confined while the low outlet becomes more confined and stays occupied longer. This is a pressure-shape tradeoff, not a claim that every dimension increases. The five low-closing passages have sampled gate-only minima of 21.31–35.20px. Retained high A-in heldout 6308 remains tight at 3.55px sampled clearance; do not call it robust.

## Native inputs and movement did not change in the paired panel

All eight candidate 30s native row arrays are exactly identical to their B2 baselines, including x/y/vy, alive/won, input-causing-row and authored target columns. Thus click frequency, actual movement, reversal counts and equal-cadence runs are unchanged in this paired observation window. Changed phases and body poses supply the new evidence.

The paired first-two-stage medians remain:

| Axis | Intended stage 1 | Intended stage 2 |
|---|---:|---:|
| Flaps/s | 1.646 | 1.531 |
| 60px reversals/s | 0.280 | 0.475 |
| Sampled clearance median | 58.38px | 51.43px |

Observed stage-3 flap and reversal medians remain 1.484/s and 0.344/s. Equal-run longest median remains 2.488s and union-time share 24.13%. These unchanged action metrics are compatible with changed timing-dependent confinement and should not be treated as evidence that the clock changes did nothing.

All candidate and heldout first two thirds are complete, while every panel final third remains censored. Median final-third coverage is 87.18% candidate and 84.53% heldout. The heldout observations are a new seed group, so their modest axis differences are not paired causal effects.

## Laser release: retained demand and explicit tradeoff

The local physical release moves from 4.4000s to 4.2280s, while the feedback release stays at 4.4000s and the full repeating cycle remains 10.2s. Both rails and their geometry remain present; their final segment now occurs during real cooldown.

Keep the two denominators separate:

- Active duration: 3.4000→3.2280s, retaining 94.94%
- Feedback-ascent distance under live rails: 440.00→414.20px, retaining 94.14%

It would be inaccurate to call both values “94.94% of active ascent.” The candidate saves 153 active and 24 cooldown laser-occupancy source frames, versus 158 active and 19 cooldown previously. Frequency and trajectory stay unchanged, but the dangerous late phase is reduced. This is the intended risk/demand tradeoff, not a proof of an input-tolerance window.

## Two bounded diagnostics close specific open loops

### Exact previously failed heldout 6206

`diagnostics/known-laser-6206-r10` reaches native win at 31.508s. Body coordinates/colliders are unchanged, and every native row before the former terminal row is exactly the same as the B2 failure. Runtime and controller hashes match. This isolates the late release repair much more directly than a new heldout success would.

It verifies this previously failing case with the revised physical phase. It does not establish that all possible carried states are safe or eliminate the observed precision demand in the rest of the live ascent.

### Previously censored spring tail 708

`diagnostics/full-tail-708-r10` reaches native win at 32.708s. Its entire previous 30s row prefix is unchanged. It records an actual top spring bounce at tick 3674, about 30.617s, after the old observation horizon. The earlier predicted contact is therefore now supported by one actual full-tail witness; it was correctly left unclaimed in the censored panels.

Both diagnostics preserve the runtime/controller and continuous native state. The review ran no additional physics.


### Complete intended thirds in the two bounded checks

These are two targeted diagnostic witnesses, not a representative replacement for the panel. Both now have all three intended stages fully observed.

| Check | Stage | Observed/planned s | Flaps/s | Major reversals/s | Sampled clearance min/median px |
|---|---:|---:|---:|---:|---:|
| known-laser-6206-r10 | 1 | 10.508/10.508 | 1.523 | 0.381 | 18.02/59.91 |
| known-laser-6206-r10 | 2 | 10.500/10.500 | 1.619 | 0.476 | 9.62/51.01 |
| known-laser-6206-r10 | 3 | 10.500/10.500 | 1.429 | 0.286 | 10.07/55.32 |
| full-tail-708-r10 | 1 | 10.908/10.908 | 1.650 | 0.183 | 15.77/53.47 |
| full-tail-708-r10 | 2 | 10.900/10.900 | 1.468 | 0.459 | 13.09/61.20 |
| full-tail-708-r10 | 3 | 10.900/10.900 | 1.376 | 0.550 | 15.78/59.33 |

The full stage vectors are still not uniformly rising; the tail observation establishes completion, not a pressure score. The unchanged evaluator and hashes are recorded in DIAGNOSTIC-STAGE-AUDIT.json.

## Remaining gaps and why they do not justify an invented change

1. The full panel still lacks complete final-stage observations; the already planned full short/macro checks are the right next evidence
2. Small sampled clearances, especially 6308’s high receipt, leave robustness and actual correction/input windows unknown. This does not license narrowing more gaps or claiming safety
3. Paired macro family/variant orders remain unchanged; the improvement is two realized timing phrases within those orders. Heldout orders are all distinct, but same-theme order similarity has only 3/3/1 pairs and remains descriptive
4. Long initial tidal/upper-route regular tapping remains. Equal timing may support sustained precision or a large ascent; it is not automatically a defect to remove
5. Human anticipation, readable recovery, mental load and fun remain unmeasured. The current native evidence cannot establish a universally increasing three-stage “pressure” scalar

The strongest continuation is controlled validation of the frozen relationships and complete tails, not a new motif invented to make every metric rise or to obtain a preferred pass percentage.
