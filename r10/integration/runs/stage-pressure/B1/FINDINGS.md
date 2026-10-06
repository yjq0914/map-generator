# B1 interpretation: changed movement, incomplete stage chaining

## Main finding

B1 produces real body-backed redirection, but does not yet demonstrate a three-stage progression across precision, frequency and timing. It shifts gate encounters toward the ending, shortens some repeated shallow tapping, and introduces a reproducible carried-state release defect. Treat these as separate findings, not one score or a pass-rate objective.

Sources: STAGE-AUDIT.json/.md, summary.json, the paired maps/results/traces in runs/, and the frozen evaluator hash recorded in EVALUATOR-FREEZE.json. This review ran no physics and changed no evaluator or map.

## Native stage observations and censoring

Primary windows are thirds of each map’s intended native duration, not thirds of its observed life. Map durations and selected module placement differ despite paired nominal requests; this is a descriptive comparison, not a same-geometry causal experiment.

| Arm | Complete stages 1 / 2 / 3 | Stage 1 flap/s | Stage 2 flap/s | Stage 1 major reversals/s | Stage 2 major reversals/s | Stage 1 sampled clearance median px | Stage 2 sampled clearance median px |
|---|---|---:|---:|---:|---:|---:|---:|
| Baseline | 8 / 8 / 1 | 1.573 | 1.525 | 0.236 | 0.431 | 58.31 | 52.61 |
| Candidate | 7 / 6 / 0 | 1.643 | 1.531 | 0.276 | 0.475 | 53.47 | 53.05 |
| Heldout | 8 / 8 / 0 | 1.552 | 1.594 | 0.242 | 0.478 | 60.12 | 52.67 |

These are medians over complete stages only, hence their denominators differ. Candidate 703 dies at 10.867s and 705 at 9.533s; neither reaches stage 2. No candidate or heldout map observes its entire intended final third. The observed final-stage median coverage is 87.2% among the six reached candidates and 86.8% among all eight heldouts; the missing endings must stay missing.

On the five seed pairs where both runs reach 30s (701, 702, 704, 707, 708), median major-reversal density rises in stage 1 from 0.185 to 0.284/s, while stage 2 is effectively unchanged at 0.462 to 0.460/s. Thus the whole-arm movement change is not evidence of progressively increasing later-stage demand. This selected, equal-observation subset is a censoring check, not a replacement population or acceptance gate.

## Equal cadence: measurable change, important counterexamples

- Whole-arm longest-run median: 2.813s baseline → 2.458s candidate; heldout 2.113s
- Whole-arm equal-run union-time share median: 24.40% → 20.75%; heldout 17.10%
- The two early candidate deaths contribute short traces. On the five pairs both reaching 30s, longest-run median shortens 3.517 → 2.808s, but union-time share is unchanged at 22.33% → 22.33%
- The longest shallow 84–85 tick cycles remain in unchanged first-stage tidal modules, for example candidate 704/706/708 at 3.517s
- Regular tapping is not inherently monotonous: the baseline light examples already showed roughly 159px ascent during regular 64–65 tick intervals. Always inspect actual y/clearance and timing context alongside the cadence metric

The narrower supported claim is that some long uninterrupted cycles were broken, rather than that total cadence repetition or pressure monotonically improved.

## Actual changed relations

Across candidate and heldout maps, 18 changed modules were emitted: ten tidal redirections and eight upper-slider approaches. Seventeen were reached; fifteen reached their active endpoint alive. All are the redirect variant (authoring stage index 1). No chain variant (authoring stage index 2) was emitted. Authoring stage is assigned by active-module midpoint, so a redirect module can begin and fail inside elapsed stage 1.

- Tidal: bank-1 is shortened and roof-2 moved into a low notch, then the original middle step is retained. Successful changed tidal modules register four or five 60px major reversals, with their old extended high cycle shortened or absent. The changed bodies really exist; this is not a renamed role or dashed-guide-only change
- Upper slider: the ordinary approach roof delays the high-route commitment while preserving the moving slider, island and receiver. All seven reached changed upper-slider modules reach their active endpoint alive, usually with three major reversals. Most have no module-local run of three near-equal intervals; heldout 6108 retains a 1.075s run of 43-tick intervals. This is one frozen-controller observation, not robust incoming-state qualification
- No gate or laser clock changed in B1. Timing differences arise from selected family order and placement

### Defect: carried ascent consumes the tidal release runway

| Candidate | Bank-1 radius-clear tick | y / vy at release | Available runway | y at roof radius-entry | Required center for wholly below roof |
|---|---:|---:|---:|---:|---:|
| 703 | 1208 | 165.87px / −242.17px/s | 120px = 0.8s | 235.90px | 270px |
| 705 | 1048 | 161.35px / −228.50px/s | 120px = 0.8s | 242.31px | 270px |

Both die on the new roof-2. The release begins during a strong upward phase; the authored 0.8s runway does not recover enough downward displacement in these carried states. The steady ideal flap-crest reserve in metadata is not a bound on this incoming y/vy. Fix this relation’s preparation using the observed entry state and unchanged physics, without interpreting the deaths as successful pressure increases or declaring the map impossible. Retain the heldout 6103 lower-laser death separately; it is a different existing relation.

## Timing and spatial precision remain distinct

Saved gate-open horizontal-occupancy frames move sharply toward the ending:

| Arm | Stage 1 | Stage 2 | Stage 3 |
|---|---:|---:|---:|
| Baseline | 93 | 87 | 111 |
| Candidate | 8 | 12 | 189 |
| Heldout | 28 | 21 | 246 |

These are body/source frame counts, not unique elapsed seconds or reaction-time budgets, and later-stage observation is censored. Final-stage median descriptor-derived minimum full-open edge reserve is about 0.080s in baseline versus 0.388s candidate and 0.403s heldout among stages with gate entries. That is evidence of later clocked encounters; it does not establish tighter temporal precision. Full-open edge reserves are neither actual early/late input tolerances nor safety margins. A successfully crossed opening/closing gate can even have a negative full-open reserve.

The next pressure-axis question is whether later actions couple real timing/precision constraints to the carried state, rather than merely placing more generously open gates later or raising flap frequency. Correctable spatial margin, actual input timing window, anticipation/choice burden and subjective mental pressure remain UNKNOWN. No extra perturbation grid is warranted by this review.

## Repetition: order and shared shape lineage, not aesthetic grading

The candidate has eight distinct family orders versus seven baseline. However, within-theme family-order similarity (unit-cost normalized Levenshtein; three pairs for arcade/foundry, one for signal) changes:

| Theme | Baseline median | Candidate median | Heldout median |
|---|---:|---:|---:|
| Arcade | 0.25 | 0.50 | 0.60 |
| Foundry | 0.40 | 0.20 | 0.60 |
| Signal | 0.40 | 0.40 | 0.80 |

More unique full orders therefore does not uniformly reduce same-theme repetition. Heldout similarity is an independent small group, not a paired deterioration claim. Candidate endings use bellows/light/spring in counts 4/2/2; heldouts use bellows/spring in counts 6/2. The stage-local changed geometry itself reuses one redirect recipe per family, and no chain recipe appears. This is an observable concentration of family/variant morphology, not a perceptual similarity score or proof of poor visual quality.

## Recommended next separation

1. Repair the narrow tidal carried-state preparation defect as a relation problem; preserve its body-backed line change and document any scope tradeoff
2. Separately investigate the missing realized final-stage timing/precision coupling and repeated terminal relation, using the already bounded next panel and preregistered finish checks
3. Keep reporting the vector of movement, frequency, sampled proximity, saved phase, carried-state evidence and coverage. Do not require every axis to rise, treat regular tapping as automatically bad, or tune to a chosen success percentage
