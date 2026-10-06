# Authored intent and observed action audit

Read-only analysis of existing maps and native traces. No physics was executed.

- Authored family, theme and verb coverage is metadata, not performed-action coverage.
- A constant guide target is author intent, not constant actual y or absence of player actions; spring policies may override it.
- Native y ranges use stored end-of-tick states, not substep extrema or clearance guarantees.
- Flaps are the frozen author-informed controller decisions, not observed human actions.
- Reached x thresholds and nonlethal bounce contacts are observations, not whole-module safety proofs.
- Deaths and the fixed horizon censor later actions; unreachable-in-this-trace is not impossible.
- No composite score, changed acceptance threshold, new physics, or fun/difficulty claim.

Sequence similarity = 1 − token Levenshtein distance / max(lengths), with unit insertion/deletion/substitution costs; both empty = 1. Action sequences concatenate module.action tokens, preserving duplicates. Similarity describes repetition, not quality.


## integration/runs/four-loops/B1

### baseline

8 maps; 5 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 1; native wins: 0.
All requested verbs attached to reached active modules: 3/8 (still not verified performed actions). Reached seams: 17/37. Median observed duration: 14.083 s (death/horizon censored).
Longest constant target per map, median/max: 480.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.557/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 290.1 px. Full traces have unequal observed durations.
Final roles: {'answer': 5, 'recall': 3}; maps with resolve: 0; unconsumed resolve outline slot: 0.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 1.0/1.0 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.5/0.5789473684210527 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.6666666666666667/0.6666666666666667 (1 pairs)

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
All requested verbs attached to reached active modules: 6/8 (still not verified performed actions). Reached seams: 19/28. Median observed duration: 24.562 s (death/horizon censored).
Longest constant target per map, median/max: 485.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.550/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 269.9 px. Full traces have unequal observed durations.
Final roles: {'answer': 4, 'peak': 3, 'release': 1}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.3125 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.0/0.0625 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.25/0.15384615384615385 (1 pairs)

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
All requested verbs attached to reached active modules: 6/8 (still not verified performed actions). Reached seams: 20/27. Median observed duration: 23.329 s (death/horizon censored).
Longest constant target per map, median/max: 572.5/660.0 px. This is guide intent only.
Native flap-rate median: 1.543/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 278.8 px. Full traces have unequal observed durations.
Final roles: {'answer': 2, 'peak': 3, 'recall': 1, 'release': 2}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.25/0.3076923076923077 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.25 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.25/0.15384615384615385 (1 pairs)

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

## integration/runs/four-loops/B2

### baseline

8 maps; 7 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 4; native wins: 0.
All requested verbs attached to reached active modules: 6/8 (still not verified performed actions). Reached seams: 19/28. Median observed duration: 24.562 s (death/horizon censored).
Longest constant target per map, median/max: 485.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.550/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 269.9 px. Full traces have unequal observed durations.
Final roles: {'answer': 4, 'peak': 3, 'release': 1}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.3125 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.0/0.0625 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.25/0.15384615384615385 (1 pairs)

- baseline-701: tidal-staircase → bellows-question-answer → light-cavity → slider-island; death at 6.800s; seams 0/3
- baseline-702: bellows-question-answer → light-cavity → tidal-staircase → slider-island → spring-reception; death at 12.700s; seams 1/4
- baseline-703: bellows-question-answer → slider-island → light-cavity → tidal-staircase; death at 19.125s; seams 2/3
- baseline-704: bellows-question-answer → light-cavity → tidal-staircase → slider-island; death at 10.442s; seams 1/3
- baseline-705: bellows-question-answer → spring-reception → tidal-staircase → slider-island → spring-reception; alive-prefix-only at 30.000s; seams 4/4
- baseline-706: slider-island → tidal-staircase → light-cavity → bellows-question-answer; alive-prefix-only at 30.000s; seams 3/3
- baseline-707: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4
- baseline-708: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4

- bellows-question-answer: authored/reached/active-end-alive 8/7/6; reached native y-range median 212.8246527777774; bounces 0
- cloister: authored/reached/active-end-alive 2/2/0; reached native y-range median 241.05173611111115; bounces 0
- light-cavity: authored/reached/active-end-alive 5/4/1; reached native y-range median 217.61597222222235; bounces 0
- slider-island: authored/reached/active-end-alive 8/5/5; reached native y-range median 160.85416666666654; bounces 0
- spring-reception: authored/reached/active-end-alive 5/4/3; reached native y-range median 62.9925347222221; bounces 1
- tidal-staircase: authored/reached/active-end-alive 8/5/4; reached native y-range median 257.22986111111106; bounces 0
### candidate

8 maps; 6 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 3; native wins: 0.
All requested verbs attached to reached active modules: 6/8 (still not verified performed actions). Reached seams: 16/26. Median observed duration: 18.562 s (death/horizon censored).
Longest constant target per map, median/max: 485.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.516/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 308.3 px. Full traces have unequal observed durations.
Final roles: {'answer': 2, 'peak': 5, 'release': 1}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.25 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.0625 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.25/0.15384615384615385 (1 pairs)

- candidate-701: tidal-staircase → bellows-question-answer → spring-reception → slider-island; death at 6.800s; seams 0/3
- candidate-702: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- candidate-703: bellows-question-answer → slider-island → light-cavity → tidal-staircase; death at 19.125s; seams 2/3
- candidate-704: bellows-question-answer → light-cavity → tidal-staircase → slider-island; death at 10.442s; seams 1/3
- candidate-705: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- candidate-706: slider-island → tidal-staircase → light-cavity → bellows-question-answer; death at 18.000s; seams 2/3
- candidate-707: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; death at 11.400s; seams 1/4
- candidate-708: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4

- bellows-question-answer: authored/reached/active-end-alive 8/5/5; reached native y-range median 212.82465277777757; bounces 0
- cloister: authored/reached/active-end-alive 2/1/0; reached native y-range median 240.59965277777783; bounces 0
- light-cavity: authored/reached/active-end-alive 3/3/0; reached native y-range median 31.150000000000034; bounces 0
- slider-island: authored/reached/active-end-alive 8/6/4; reached native y-range median 178.9921875; bounces 0
- spring-reception: authored/reached/active-end-alive 5/3/3; reached native y-range median 219.54166666666683; bounces 2
- tidal-staircase: authored/reached/active-end-alive 8/6/4; reached native y-range median 256.9267361111109; bounces 0
### holdout

8 maps; 7 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 4; native wins: 0.
All requested verbs attached to reached active modules: 6/8 (still not verified performed actions). Reached seams: 22/28. Median observed duration: 24.883 s (death/horizon censored).
Longest constant target per map, median/max: 660.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.533/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 296.2 px. Full traces have unequal observed durations.
Final roles: {'peak': 5, 'recall': 1, 'release': 1, 'resolve': 1}; maps with resolve: 1; unconsumed resolve outline slot: 7.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.5/0.4285714285714286 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.4/0.375 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 1.0/1.0 (1 pairs)

- holdout-4201: tidal-staircase → bellows-question-answer → spring-reception → slider-island; death at 6.800s; seams 0/3
- holdout-4202: slider-island → tidal-staircase → spring-reception → bellows-question-answer; alive-prefix-only at 30.000s; seams 3/3
- holdout-4203: slider-island → tidal-staircase → light-cavity → bellows-question-answer; death at 17.958s; seams 2/3
- holdout-4204: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- holdout-4205: cloister → slider-island → spring-reception → cloister → tidal-staircase → spring-reception; alive-prefix-only at 30.000s; seams 5/5
- holdout-4206: slider-island → tidal-staircase → light-cavity → bellows-question-answer; death at 18.000s; seams 2/3
- holdout-4207: tidal-staircase → bellows-question-answer → spring-reception → slider-island → cloister; alive-prefix-only at 30.000s; seams 4/4
- holdout-4208: cloister → slider-island → spring-reception → tidal-staircase → bellows-question-answer; death at 19.767s; seams 3/4

- bellows-question-answer: authored/reached/active-end-alive 7/3/3; reached native y-range median 212.223611111111; bounces 0
- cloister: authored/reached/active-end-alive 4/4/3; reached native y-range median 241.50381944444447; bounces 0
- light-cavity: authored/reached/active-end-alive 2/2/0; reached native y-range median 25.57447916666669; bounces 0
- slider-island: authored/reached/active-end-alive 8/7/6; reached native y-range median 178.85000000000002; bounces 0
- spring-reception: authored/reached/active-end-alive 7/5/5; reached native y-range median 164.4649305555551; bounces 2
- tidal-staircase: authored/reached/active-end-alive 8/8/6; reached native y-range median 257.3788194444443; bounces 0

## integration/runs/four-loops/B3

### baseline

8 maps; 6 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 3; native wins: 0.
All requested verbs attached to reached active modules: 6/8 (still not verified performed actions). Reached seams: 16/26. Median observed duration: 18.562 s (death/horizon censored).
Longest constant target per map, median/max: 485.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.516/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 308.3 px. Full traces have unequal observed durations.
Final roles: {'answer': 2, 'peak': 5, 'release': 1}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.25 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.0625 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.25/0.15384615384615385 (1 pairs)

- baseline-701: tidal-staircase → bellows-question-answer → spring-reception → slider-island; death at 6.800s; seams 0/3
- baseline-702: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- baseline-703: bellows-question-answer → slider-island → light-cavity → tidal-staircase; death at 19.125s; seams 2/3
- baseline-704: bellows-question-answer → light-cavity → tidal-staircase → slider-island; death at 10.442s; seams 1/3
- baseline-705: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- baseline-706: slider-island → tidal-staircase → light-cavity → bellows-question-answer; death at 18.000s; seams 2/3
- baseline-707: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; death at 11.400s; seams 1/4
- baseline-708: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4

- bellows-question-answer: authored/reached/active-end-alive 8/5/5; reached native y-range median 212.82465277777757; bounces 0
- cloister: authored/reached/active-end-alive 2/1/0; reached native y-range median 240.59965277777783; bounces 0
- light-cavity: authored/reached/active-end-alive 3/3/0; reached native y-range median 31.150000000000034; bounces 0
- slider-island: authored/reached/active-end-alive 8/6/4; reached native y-range median 178.9921875; bounces 0
- spring-reception: authored/reached/active-end-alive 5/3/3; reached native y-range median 219.54166666666683; bounces 2
- tidal-staircase: authored/reached/active-end-alive 8/6/4; reached native y-range median 256.9267361111109; bounces 0
### candidate

8 maps; 6 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 7; native wins: 0.
All requested verbs attached to reached active modules: 7/8 (still not verified performed actions). Reached seams: 24/26. Median observed duration: 30.000 s (death/horizon censored).
Longest constant target per map, median/max: 485.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.562/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 316.0 px. Full traces have unequal observed durations.
Final roles: {'answer': 2, 'peak': 5, 'release': 1}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.25 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.0625 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.25/0.15384615384615385 (1 pairs)

- candidate-701: tidal-staircase → bellows-question-answer → spring-reception → slider-island; alive-prefix-only at 30.000s; seams 3/3
- candidate-702: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- candidate-703: bellows-question-answer → slider-island → light-cavity → tidal-staircase; alive-prefix-only at 30.000s; seams 3/3
- candidate-704: bellows-question-answer → light-cavity → tidal-staircase → slider-island; death at 13.492s; seams 1/3
- candidate-705: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- candidate-706: slider-island → tidal-staircase → light-cavity → bellows-question-answer; alive-prefix-only at 30.000s; seams 3/3
- candidate-707: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4
- candidate-708: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4

- bellows-question-answer: authored/reached/active-end-alive 8/8/7; reached native y-range median 212.72604166666656; bounces 0
- cloister: authored/reached/active-end-alive 2/2/0; reached native y-range median 241.05173611111115; bounces 0
- light-cavity: authored/reached/active-end-alive 3/3/2; reached native y-range median 229.9913194444445; bounces 0
- slider-island: authored/reached/active-end-alive 8/7/5; reached native y-range median 179.1975694444445; bounces 0
- spring-reception: authored/reached/active-end-alive 5/5/5; reached native y-range median 219.54166666666683; bounces 2
- tidal-staircase: authored/reached/active-end-alive 8/7/6; reached native y-range median 257.22986111111106; bounces 0
### holdout

8 maps; 5 distinct authored orders; requested verbs represented in metadata in 8/8. Alive at horizon: 8; native wins: 0.
All requested verbs attached to reached active modules: 8/8 (still not verified performed actions). Reached seams: 26/26. Median observed duration: 30.000 s (death/horizon censored).
Longest constant target per map, median/max: 660.0/660.0 px. This is guide intent only.
Native flap-rate median: 1.550/s; per-map median inter-flap interval median: 84.0 ticks; native y-range median: 312.7 px. Full traces have unequal observed durations.
Final roles: {'answer': 1, 'peak': 6, 'release': 1}; maps with resolve: 0; unconsumed resolve outline slot: 8.

- arcade within-arm pairwise normalized Levenshtein similarity, family/action median: 0.19999999999999996/0.3125 (3 pairs)
- foundry within-arm pairwise normalized Levenshtein similarity, family/action median: 0.4/0.25 (3 pairs)
- signal within-arm pairwise normalized Levenshtein similarity, family/action median: 0.5/0.3846153846153846 (1 pairs)

- holdout-4301: bellows-question-answer → light-cavity → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- holdout-4302: tidal-staircase → bellows-question-answer → spring-reception → slider-island → cloister; alive-prefix-only at 30.000s; seams 4/4
- holdout-4303: bellows-question-answer → light-cavity → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- holdout-4304: slider-island → tidal-staircase → spring-reception → bellows-question-answer → cloister; alive-prefix-only at 30.000s; seams 4/4
- holdout-4305: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3
- holdout-4306: tidal-staircase → bellows-question-answer → light-cavity → slider-island; alive-prefix-only at 30.000s; seams 3/3
- holdout-4307: tidal-staircase → bellows-question-answer → light-cavity → slider-island; alive-prefix-only at 30.000s; seams 3/3
- holdout-4308: bellows-question-answer → spring-reception → tidal-staircase → slider-island; alive-prefix-only at 30.000s; seams 3/3

- bellows-question-answer: authored/reached/active-end-alive 8/8/8; reached native y-range median 212.72604166666656; bounces 0
- cloister: authored/reached/active-end-alive 2/2/0; reached native y-range median 243.37951388888894; bounces 0
- light-cavity: authored/reached/active-end-alive 4/4/4; reached native y-range median 194.76371527777786; bounces 0
- slider-island: authored/reached/active-end-alive 8/8/3; reached native y-range median 160.8541666666666; bounces 0
- spring-reception: authored/reached/active-end-alive 4/4/4; reached native y-range median 192.0710069444443; bounces 3
- tidal-staircase: authored/reached/active-end-alive 8/8/8; reached native y-range median 257.74236111111065; bounces 0

Detailed JSON retains per-module y ranges, contacts, cadence, actual states at seams, every family order, 
provider parameter use and source hashes. Unselected provider choices are structural unused concepts, 
not automatically missing physical relations, and do not inherit qualification.
