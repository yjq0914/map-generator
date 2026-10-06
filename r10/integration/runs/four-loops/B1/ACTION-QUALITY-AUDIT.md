# Authored intent and observed action audit

Read-only analysis of existing maps and native traces. No physics was executed.

- Authored family, theme and verb coverage is metadata, not performed-action coverage.
- A constant guide target is author intent, not constant actual y or absence of player actions; spring policies may override it.
- Native y ranges use stored end-of-tick states, not substep extrema or clearance guarantees.
- Flaps are the frozen author-informed controller decisions, not observed human actions.
- Reached x thresholds and nonlethal bounce contacts are observations, not whole-module safety proofs.
- Deaths and the fixed horizon censor later actions; unreachable-in-this-trace is not impossible.
- No composite score, changed acceptance threshold, new physics, or fun/difficulty claim.

## integration/runs/four-loops/B1

### baseline

8 maps; 5 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 1; native wins: 0.
Reached seams: 17/37. Median observed duration: 14.083 s (death/horizon censored).
Longest constant target per map, median/max: 480.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.557/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 290.1 px. Full traces have unequal observed durations.
Final roles: {'answer': 5, 'recall': 3}; maps with resolve: 0; unconsumed resolve outline slot: 0.

- baseline-701: cloister → slider-island → light-cavity → tidal-staircase → spring-reception; death at 14.083s; seams 2/4
- baseline-702: tidal-staircase → spring-reception → slider-island → spring-reception → bellows-question-answer → spring-reception; death at 6.800s; seams 0/5
- baseline-703: bellows-question-answer → light-cavity → slider-island → spring-reception → light-cavity → spring-reception; death at 10.300s; seams 1/5
- baseline-704: cloister → slider-island → light-cavity → tidal-staircase → spring-reception; death at 23.767s; seams 3/4
- baseline-705: tidal-staircase → spring-reception → slider-island → spring-reception → bellows-question-answer → spring-reception; alive-prefix-only at 30.000s; seams 5/5
- baseline-706: bellows-question-answer → light-cavity → spring-reception → slider-island → light-cavity → spring-reception; death at 12.700s; seams 1/5
- baseline-707: cloister → slider-island → light-cavity → tidal-staircase → spring-reception; death at 14.083s; seams 2/4
- baseline-708: cloister → slider-island → spring-reception → light-cavity → bellows-question-answer → spring-reception; death at 16.058s; seams 3/5

- bellows-question-answer: authored/reached/active-end-alive 5/3/3; reached native y-range median 213.51076388888904; bounces 0
- cloister: authored/reached/active-end-alive 4/4/4; reached native y-range median 241.35989583333335; bounces 0
- light-cavity: authored/reached/active-end-alive 8/6/1; reached native y-range median 42.9744791666667; bounces 0
- slider-island: authored/reached/active-end-alive 8/5/5; reached native y-range median 159.94999999999985; bounces 0
- spring-reception: authored/reached/active-end-alive 15/4/3; reached native y-range median 63.80781250000007; bounces 0
- tidal-staircase: authored/reached/active-end-alive 5/3/1; reached native y-range median 160.21944444444372; bounces 0
### candidate

8 maps; 7 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 4; native wins: 0.
Reached seams: 19/28. Median observed duration: 24.562 s (death/horizon censored).
Longest constant target per map, median/max: 485.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.550/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 269.9 px. Full traces have unequal observed durations.
Final roles: {'answer': 4, 'peak': 3, 'release': 1}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- candidate-701: tidal-staircase → bellows-question-answer → light-cavity → slider-island; death at 6.800s; seams 0/3
- candidate-702: bellows-question-answer → light-cavity → tidal-staircase → slider-island → spring-reception; death at 12.700s; seams 1/4
- candidate-703: bellows-question-answer → slider-island → light-cavity → tidal-staircase; death at 19.125s; seams 2/3
- candidate-704: bellows-question-answer → light-cavity → tidal-staircase → slider-island; death at 10.442s; seams 1/3
- candidate-705: bellows-question-answer → spring-reception → tidal-staircase → slider-island → spring-reception; alive-prefix-only at 30.000s; seams 4/4
- candidate-706: slider-island → tidal-staircase → light-cavity → bellows-question-answer; alive-prefix-only at 30.000s; seams 3/3
- candidate-707: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4
- candidate-708: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4

- bellows-question-answer: authored/reached/active-end-alive 8/7/6; reached native y-range median 212.8246527777774; bounces 0
- cloister: authored/reached/active-end-alive 2/2/0; reached native y-range median 241.05173611111115; bounces 0
- light-cavity: authored/reached/active-end-alive 5/4/1; reached native y-range median 217.61597222222235; bounces 0
- slider-island: authored/reached/active-end-alive 8/5/5; reached native y-range median 160.85416666666654; bounces 0
- spring-reception: authored/reached/active-end-alive 5/4/3; reached native y-range median 62.9925347222221; bounces 1
- tidal-staircase: authored/reached/active-end-alive 8/5/4; reached native y-range median 257.22986111111106; bounces 0
### holdout

8 maps; 8 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 4; native wins: 0.
Reached seams: 20/27. Median observed duration: 23.329 s (death/horizon censored).
Longest constant target per map, median/max: 572.5/660.0 px. This is guide intent only.
Native flap-rate median: 1.543/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 278.8 px. Full traces have unequal observed durations.
Final roles: {'answer': 2, 'peak': 3, 'recall': 1, 'release': 2}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- holdout-4101: cloister → slider-island → light-cavity → tidal-staircase; death at 14.083s; seams 2/3
- holdout-4102: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4
- holdout-4103: bellows-question-answer → slider-island → light-cavity → tidal-staircase; death at 16.658s; seams 2/3
- holdout-4104: tidal-staircase → bellows-question-answer → light-cavity → slider-island; death at 6.800s; seams 0/3
- holdout-4105: bellows-question-answer → spring-reception → tidal-staircase → slider-island → spring-reception; alive-prefix-only at 30.000s; seams 4/4
- holdout-4106: slider-island → tidal-staircase → light-cavity → bellows-question-answer; alive-prefix-only at 30.000s; seams 3/3
- holdout-4107: bellows-question-answer → light-cavity → tidal-staircase → slider-island; death at 10.300s; seams 1/3
- holdout-4108: cloister → slider-island → spring-reception → tidal-staircase → bellows-question-answer; alive-prefix-only at 30.000s; seams 4/4

- bellows-question-answer: authored/reached/active-end-alive 7/6/4; reached native y-range median 212.72604166666656; bounces 0
- cloister: authored/reached/active-end-alive 3/3/2; reached native y-range median 241.50381944444447; bounces 0
- light-cavity: authored/reached/active-end-alive 5/4/1; reached native y-range median 40.55781250000001; bounces 0
- slider-island: authored/reached/active-end-alive 8/6/6; reached native y-range median 160.7026041666664; bounces 0
- spring-reception: authored/reached/active-end-alive 4/4/3; reached native y-range median 64.84166666666673; bounces 1
- tidal-staircase: authored/reached/active-end-alive 8/5/4; reached native y-range median 257.8309027777776; bounces 0

Detailed JSON retains per-module y ranges, contacts, cadence, actual states at seams, every family order, 
provider parameter use and source hashes. Unselected provider choices are structural unused concepts, 
not automatically missing physical relations, and do not inherit qualification.
