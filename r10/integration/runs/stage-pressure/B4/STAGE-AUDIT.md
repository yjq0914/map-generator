# Native three-stage movement, space and cadence audit

Read-only saved evidence. No physics executions, composite pressure score, difficulty/fun claim, pass threshold, or safety range.

- **elapsed_time_stages**: Three equal thirds of intended native duration, durationTicks when present, otherwise ceil(authored actual_duration_s * 120). Integer edges are ceil(k * durationTicks / 3). Never rescale thirds to observed survival time. The native world clock is tick/120, not CPU wallSeconds.
- **spatial_stages**: Three equal x intervals from native initial x to the unique finish routeMark when present, otherwise map.width. Rendering width is not a timed-course finish. Assign native tick intervals by pre-action x; terminal attained coverage is separate. Time after the finish mark is separately reported, not hidden in stage3.
- **coverage**: Observed tick-interval duration / planned elapsed-stage duration; native attained max-x fraction for spatial stage. Unreached or partially observed stages retain censoring and are never treated as complete. Death and fixed-horizon prefix censoring differ from native win.
- **major_movement**: Directional-change hysteresis on actual recorded y: first movement is recognized at 60px from initial y; subsequently reversal is recognized only after moving 60px back from the running extreme. Events are assigned at the threshold-confirmation tick, even when their origin precedes the stage/module. Report 40/80px sensitivity too. The ordinary isolated -290px/s flap apex under820px/s² is about51px, so60px filters that small cycle. This is a chosen descriptive scale, not a calibrated action threshold.
- **input_transitions**: Changes of actual binary flap/hold decisions at consecutive pre-action ticks. These typically count about twice the flaps and are not semantic human-action changes. Cadence-change events separately count adjacent interflap gaps differing by more than2ticks; assign to the closing flap tick.
- **equal_cadence**: A maximal run of at least3 consecutive interflap intervals all within ±1tick of one fixed integer period, equivalently max(gaps)-min(gaps)<=2. Maximal windows may overlap; union of first-to-last-flap durations is used for time share, never the sum. No inferred extension before the first or after the last flap. Equal timing can accompany a large y excursion; it is cadence repetition, not proof of uninteresting play.
- **clearance**: Empirical distribution of saved bodyFrames every12ticks (0.1s) plus terminal frame, using native y and current saved lethal geometry plus floor/ceiling and10px player radius. Linear (n−1) quantiles, no interpolation in time or geometry. Unsupported shapes are disclosed. It is not continuous/substep minimum, temporal reaction budget, safe range, calibrated pressure, or human difficulty.
- **pressure_axes**: Frequency/action density, spatial precision, input timing, anticipation/choice, carried-state control and sustained load/recovery are separate dimensions. No stage is required to increase frequency and amplitude together. Low-frequency precise timing can be demanding, and equal-frequency tapping is not inherently boring. Sampled clearance is only geometric proximity; actual correctable spatial margin, early/late input window, perceptual/choice demands and subjective mental pressure are UNKNOWN without interventions or human evidence.
- **timing**: Saved gate/laser status and phase during radius-expanded horizontal occupancy are native observations at stored frame times. Fixed-x gate nominal full-body occupancy and signed full-open entry/tail reserves are descriptor-derived at150px/s, only reported when observed preterminal x/vx confirms constant speed. Select the clock cycle containing nominal occupancy midpoint. A negative reserve means nominal occupancy extends outside that fully-open window; it does not prove collision. Neither reserve nor warning duration is an input timing tolerance or reaction budget.
- **comparisons**: Descriptive separate dimensions, no composite score, pass target, fun inference or changed acceptance. Complete-stage-only summaries are accompanied by attained counts; survivor selection remains a limitation. Differences in intended duration/module placement and censoring must be retained.

## Group summaries

These stage medians use complete stages only; counts expose death/horizon censoring. They are not a paired causal estimate.

| Group | Stage | Attained / complete / all | Flaps/s | Y travel px/s | Major reversals/s | Sampled clearance median px |
|---|---:|---:|---:|---:|---:|---:|
| integration/runs/stage-pressure/B4/runs/baseline | 1 | 8 / 8 / 8 | 1.646 | 156.713 | 0.280 | 58.384 |
| integration/runs/stage-pressure/B4/runs/baseline | 2 | 8 / 8 / 8 | 1.531 | 157.807 | 0.475 | 51.429 |
| integration/runs/stage-pressure/B4/runs/baseline | 3 | 8 / 0 / 8 | — | — | — | — |
| integration/runs/stage-pressure/B4/runs/candidate | 1 | 8 / 8 / 8 | 1.646 | 156.713 | 0.280 | 58.384 |
| integration/runs/stage-pressure/B4/runs/candidate | 2 | 8 / 8 / 8 | 1.531 | 157.807 | 0.475 | 51.429 |
| integration/runs/stage-pressure/B4/runs/candidate | 3 | 8 / 0 / 8 | — | — | — | — |
| integration/runs/stage-pressure/B4/runs/holdout | 1 | 8 / 8 / 8 | 1.582 | 161.637 | 0.341 | 62.720 |
| integration/runs/stage-pressure/B4/runs/holdout | 2 | 8 / 8 / 8 | 1.582 | 158.875 | 0.492 | 51.009 |
| integration/runs/stage-pressure/B4/runs/holdout | 3 | 8 / 0 / 8 | — | — | — | — |

## baseline-701

alive-prefix-only; observed 30.000s / intended 31.042s; horizon 30.000s. Spatial finish 4715.50px (map.width); rendering width 4715.50px; time after spatial finish 0.000s.
Equal-cadence union 9.167s (30.6% of observed duration). Longest 2.808s, 7.992–10.800s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.350/10.350 | 100.0% complete | 5/4 | 0.386 | 1.643 | 0.870 | 153.583 | 13.529 / 47.835 / 67.503 / 131.531 |
| 2 | 10.350/10.350 | 100.0% complete | 6/6 | 0.580 | 1.546 | 1.159 | 161.842 | 14.940 / 29.138 / 51.467 / 78.894 |
| 3 | 9.300/10.342 | 89.9% alive-prefix-only | 3/3 | 0.323 | 1.505 | 0.968 | 166.116 | 23.251 / 35.393 / 64.285 / 97.772 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 7, 'timed_armor_gate:open': 30} | 0.453 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 slider-island base (2.808s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 slider-island/base: longest 2.808s at 7.992–10.800s; total equal 2.808s / observed 5.500s; major60 reversals 3; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.108s at 27.692–29.800s; total equal 3.183s / observed 8.608s; major60 reversals 3; active-end alive True
- m03 tidal-staircase/base: longest 2.100s at 17.017–19.117s; total equal 2.100s / observed 9.000s; major60 reversals 5; active-end alive True
- m01 cloister/base: longest 1.075s at 4.900–5.975s; total equal 1.075s / observed 6.867s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-701`; exact file/runtime/controller digests in JSON.

## baseline-702

alive-prefix-only; observed 30.000s / intended 31.642s; horizon 30.000s. Spatial finish 4805.47px (map.width); rendering width 4805.47px; time after spatial finish 0.000s.
Equal-cadence union 1.075s (3.6% of observed duration). Longest 1.075s, 24.317–25.392s, 3 intervals, 43–43ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.550/10.550 | 100.0% complete | 4/3 | 0.284 | 1.611 | 1.232 | 159.315 | 18.017 / 30.815 / 61.859 / 97.534 |
| 2 | 10.550/10.550 | 100.0% complete | 4/4 | 0.379 | 1.517 | 1.232 | 151.391 | 14.422 / 22.422 / 54.704 / 73.131 |
| 3 | 8.900/10.542 | 84.4% alive-prefix-only | 5/5 | 0.562 | 1.573 | 1.236 | 167.969 | 11.941 / 31.408 / 56.271 / 88.217 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 5 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 29} | 0.318 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 bellows-question-answer base (1.075s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 bellows-question-answer/base: longest 1.075s at 24.317–25.392s; total equal 1.075s / observed 6.700s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-702`; exact file/runtime/controller digests in JSON.

## baseline-703

alive-prefix-only; observed 30.000s / intended 32.583s; horizon 30.000s. Spatial finish 4947.47px (map.width); rendering width 4947.47px; time after spatial finish 0.000s.
Equal-cadence union 9.542s (31.8% of observed duration). Longest 2.167s, 27.325–29.492s, 4 intervals, 65–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.867/10.867 | 100.0% complete | 4/3 | 0.276 | 1.380 | 0.920 | 164.179 | 18.973 / 28.905 / 55.030 / 81.098 |
| 2 | 10.858/10.858 | 100.0% complete | 5/5 | 0.460 | 1.658 | 1.197 | 157.481 | 2.916 / 16.217 / 46.354 / 90.071 |
| 3 | 8.275/10.858 | 76.2% alive-prefix-only | 2/2 | 0.242 | 1.450 | 0.846 | 154.024 | 6.847 / 25.907 / 48.779 / 75.018 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 8} | 0.080 |
| 2 | 2 | {'timed_armor_gate:open': 13} | 0.288 |
| 3 | 5 | {'laser_scanner:active': 43, 'laser_scanner:cooldown': 4, 'timed_armor_gate:closing': 8, 'timed_armor_gate:open': 30} | -0.767 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 light-cavity base (2.167s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 light-cavity/base: longest 2.167s at 27.325–29.492s; total equal 2.167s / observed 3.950s; major60 reversals 1; active-end alive False
- m04 bellows-question-answer/alternate: longest 2.108s at 23.725–25.833s; total equal 3.192s / observed 8.050s; major60 reversals 3; active-end alive True
- m03 tidal-staircase/alternate: longest 2.100s at 13.783–15.883s; total equal 2.100s / observed 10.267s; major60 reversals 4; active-end alive True
- m01 slider-island/base: longest 2.083s at 1.683–3.767s; total equal 2.083s / observed 5.700s; major60 reversals 1; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-703`; exact file/runtime/controller digests in JSON.

## baseline-704

alive-prefix-only; observed 30.000s / intended 32.575s; horizon 30.000s. Spatial finish 4945.47px (map.width); rendering width 4945.47px; time after spatial finish 0.000s.
Equal-cadence union 7.775s (25.9% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.858/10.858 | 100.0% complete | 3/2 | 0.184 | 1.658 | 0.829 | 153.584 | 15.769 / 30.715 / 53.186 / 112.981 |
| 2 | 10.858/10.858 | 100.0% complete | 5/5 | 0.460 | 1.474 | 1.197 | 163.213 | 9.789 / 34.925 / 61.792 / 80.205 |
| 3 | 8.283/10.858 | 76.3% alive-prefix-only | 4/4 | 0.483 | 1.569 | 1.207 | 165.152 | 15.323 / 31.201 / 52.017 / 80.901 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 23} | 0.199 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m02 cloister/base: longest 1.075s at 14.567–15.642s; total equal 1.075s / observed 5.867s; major60 reversals 2; active-end alive True
- m05 bellows-question-answer/base: longest 1.075s at 25.550–26.625s; total equal 1.075s / observed 5.767s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-704`; exact file/runtime/controller digests in JSON.

## baseline-705

alive-prefix-only; observed 30.000s / intended 30.333s; horizon 30.000s. Spatial finish 4609.97px (map.width); rendering width 4609.97px; time after spatial finish 0.000s.
Equal-cadence union 5.350s (17.8% of observed duration). Longest 2.167s, 22.883–25.050s, 4 intervals, 65–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.117/10.117 | 100.0% complete | 4/3 | 0.297 | 1.680 | 1.087 | 162.573 | 15.652 / 38.822 / 64.139 / 133.143 |
| 2 | 10.108/10.108 | 100.0% complete | 5/5 | 0.495 | 1.484 | 1.088 | 149.913 | 10.500 / 25.988 / 50.878 / 76.615 |
| 3 | 9.775/10.108 | 96.7% alive-prefix-only | 7/7 | 0.716 | 1.330 | 1.023 | 168.176 | 13.335 / 29.550 / 60.602 / 95.189 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'laser_scanner:active': 56, 'laser_scanner:cooldown': 10, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 23} | -0.595 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 light-cavity alternate (2.167s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 light-cavity/alternate: longest 2.167s at 22.883–25.050s; total equal 2.167s / observed 5.800s; major60 reversals 2; active-end alive True
- m02 tidal-staircase/base: longest 2.108s at 11.042–13.150s; total equal 2.108s / observed 8.600s; major60 reversals 4; active-end alive True
- m01 cloister/base: longest 1.075s at 4.900–5.975s; total equal 1.075s / observed 6.867s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-705`; exact file/runtime/controller digests in JSON.

## baseline-706

alive-prefix-only; observed 30.000s / intended 30.442s; horizon 30.000s. Spatial finish 4625.50px (map.width); rendering width 4625.50px; time after spatial finish 0.000s.
Equal-cadence union 7.792s (26.0% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.150/10.150 | 100.0% complete | 3/2 | 0.197 | 1.576 | 0.690 | 154.110 | 15.769 / 30.183 / 52.257 / 121.590 |
| 2 | 10.150/10.150 | 100.0% complete | 5/5 | 0.493 | 1.576 | 1.379 | 158.133 | 11.142 / 27.135 / 51.392 / 78.316 |
| 3 | 9.700/10.142 | 95.6% alive-prefix-only | 2/2 | 0.206 | 1.443 | 0.825 | 158.495 | 10.663 / 26.016 / 54.756 / 91.001 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 2 | {'timed_armor_gate:open': 12} | 0.368 |
| 3 | 5 | {'laser_scanner:active': 54, 'laser_scanner:cooldown': 10, 'timed_armor_gate:closing': 12, 'timed_armor_gate:open': 34} | 0.388 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 light-cavity/alternate: longest 2.167s at 25.275–27.442s; total equal 2.167s / observed 5.467s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-706`; exact file/runtime/controller digests in JSON.

## baseline-707

alive-prefix-only; observed 30.000s / intended 30.650s; horizon 30.000s. Spatial finish 4657.50px (map.width); rendering width 4657.50px; time after spatial finish 0.000s.
Equal-cadence union 4.208s (14.0% of observed duration). Longest 2.108s, 12.517–14.625s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.217/10.217 | 100.0% complete | 4/3 | 0.294 | 1.664 | 1.175 | 161.345 | 9.792 / 25.374 / 61.737 / 132.337 |
| 2 | 10.217/10.217 | 100.0% complete | 5/5 | 0.489 | 1.566 | 1.077 | 153.105 | 3.582 / 16.153 / 46.497 / 85.551 |
| 3 | 9.567/10.217 | 93.6% alive-prefix-only | 3/3 | 0.314 | 1.463 | 1.150 | 164.725 | 16.929 / 25.739 / 50.204 / 79.095 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 25} | 0.288 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 2.108s at 12.517–14.625s; total equal 2.108s / observed 9.967s; major60 reversals 4; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-707`; exact file/runtime/controller digests in JSON.

## baseline-708

alive-prefix-only; observed 30.000s / intended 32.708s; horizon 30.000s. Spatial finish 4965.47px (map.width); rendering width 4965.47px; time after spatial finish 0.000s.
Equal-cadence union 6.700s (22.3% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.908/10.908 | 100.0% complete | 3/2 | 0.183 | 1.650 | 0.825 | 153.919 | 15.769 / 30.791 / 53.467 / 111.752 |
| 2 | 10.900/10.900 | 100.0% complete | 5/5 | 0.459 | 1.468 | 1.284 | 161.666 | 13.092 / 36.382 / 61.196 / 80.282 |
| 3 | 8.192/10.900 | 75.2% alive-prefix-only | 3/3 | 0.366 | 1.587 | 1.221 | 162.439 | 15.782 / 33.094 / 55.094 / 79.226 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 25} | 0.368 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 23.575–24.650s; total equal 1.075s / observed 7.342s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-708`; exact file/runtime/controller digests in JSON.

## candidate-701

alive-prefix-only; observed 30.000s / intended 31.042s; horizon 30.000s. Spatial finish 4715.50px (map.width); rendering width 4715.50px; time after spatial finish 0.000s.
Equal-cadence union 9.167s (30.6% of observed duration). Longest 2.808s, 7.992–10.800s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.350/10.350 | 100.0% complete | 5/4 | 0.386 | 1.643 | 0.870 | 153.583 | 13.529 / 47.835 / 67.503 / 131.531 |
| 2 | 10.350/10.350 | 100.0% complete | 6/6 | 0.580 | 1.546 | 1.159 | 161.842 | 14.940 / 29.138 / 51.467 / 78.894 |
| 3 | 9.300/10.342 | 89.9% alive-prefix-only | 3/3 | 0.323 | 1.505 | 0.968 | 166.116 | 23.251 / 35.393 / 64.285 / 97.772 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 7, 'timed_armor_gate:open': 30} | 0.453 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 slider-island base (2.808s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 slider-island/base: longest 2.808s at 7.992–10.800s; total equal 2.808s / observed 5.500s; major60 reversals 3; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.108s at 27.692–29.800s; total equal 3.183s / observed 8.608s; major60 reversals 3; active-end alive True
- m03 tidal-staircase/base: longest 2.100s at 17.017–19.117s; total equal 2.100s / observed 9.000s; major60 reversals 5; active-end alive True
- m01 cloister/base: longest 1.075s at 4.900–5.975s; total equal 1.075s / observed 6.867s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-701`; exact file/runtime/controller digests in JSON.

## candidate-702

alive-prefix-only; observed 30.000s / intended 31.642s; horizon 30.000s. Spatial finish 4805.47px (map.width); rendering width 4805.47px; time after spatial finish 0.000s.
Equal-cadence union 1.075s (3.6% of observed duration). Longest 1.075s, 24.317–25.392s, 3 intervals, 43–43ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.550/10.550 | 100.0% complete | 4/3 | 0.284 | 1.611 | 1.232 | 159.315 | 18.017 / 30.815 / 61.859 / 97.534 |
| 2 | 10.550/10.550 | 100.0% complete | 4/4 | 0.379 | 1.517 | 1.232 | 151.391 | 14.422 / 22.422 / 54.704 / 73.131 |
| 3 | 8.900/10.542 | 84.4% alive-prefix-only | 5/5 | 0.562 | 1.573 | 1.236 | 167.969 | 11.941 / 31.408 / 56.271 / 88.217 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 5 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 29} | 0.318 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 bellows-question-answer base (1.075s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 bellows-question-answer/base: longest 1.075s at 24.317–25.392s; total equal 1.075s / observed 6.700s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-702`; exact file/runtime/controller digests in JSON.

## candidate-703

alive-prefix-only; observed 30.000s / intended 32.583s; horizon 30.000s. Spatial finish 4947.47px (map.width); rendering width 4947.47px; time after spatial finish 0.000s.
Equal-cadence union 9.542s (31.8% of observed duration). Longest 2.167s, 27.325–29.492s, 4 intervals, 65–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.867/10.867 | 100.0% complete | 4/3 | 0.276 | 1.380 | 0.920 | 164.179 | 18.973 / 28.905 / 55.030 / 81.098 |
| 2 | 10.858/10.858 | 100.0% complete | 5/5 | 0.460 | 1.658 | 1.197 | 157.481 | 2.916 / 16.217 / 46.354 / 90.071 |
| 3 | 8.275/10.858 | 76.2% alive-prefix-only | 2/2 | 0.242 | 1.450 | 0.846 | 154.024 | 6.847 / 25.907 / 48.779 / 75.018 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 8} | 0.080 |
| 2 | 2 | {'timed_armor_gate:open': 13} | 0.288 |
| 3 | 5 | {'laser_scanner:active': 43, 'laser_scanner:cooldown': 4, 'timed_armor_gate:closing': 8, 'timed_armor_gate:open': 30} | -0.767 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 light-cavity base (2.167s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 light-cavity/base: longest 2.167s at 27.325–29.492s; total equal 2.167s / observed 3.950s; major60 reversals 1; active-end alive False
- m04 bellows-question-answer/alternate: longest 2.108s at 23.725–25.833s; total equal 3.192s / observed 8.050s; major60 reversals 3; active-end alive True
- m03 tidal-staircase/alternate: longest 2.100s at 13.783–15.883s; total equal 2.100s / observed 10.267s; major60 reversals 4; active-end alive True
- m01 slider-island/base: longest 2.083s at 1.683–3.767s; total equal 2.083s / observed 5.700s; major60 reversals 1; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-703`; exact file/runtime/controller digests in JSON.

## candidate-704

alive-prefix-only; observed 30.000s / intended 32.575s; horizon 30.000s. Spatial finish 4945.47px (map.width); rendering width 4945.47px; time after spatial finish 0.000s.
Equal-cadence union 7.775s (25.9% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.858/10.858 | 100.0% complete | 3/2 | 0.184 | 1.658 | 0.829 | 153.584 | 15.769 / 30.715 / 53.186 / 112.981 |
| 2 | 10.858/10.858 | 100.0% complete | 5/5 | 0.460 | 1.474 | 1.197 | 163.213 | 9.789 / 34.925 / 61.792 / 80.205 |
| 3 | 8.283/10.858 | 76.3% alive-prefix-only | 4/4 | 0.483 | 1.569 | 1.207 | 165.152 | 15.323 / 31.201 / 52.017 / 80.901 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 23} | 0.199 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m02 cloister/base: longest 1.075s at 14.567–15.642s; total equal 1.075s / observed 5.867s; major60 reversals 2; active-end alive True
- m05 bellows-question-answer/base: longest 1.075s at 25.550–26.625s; total equal 1.075s / observed 5.767s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-704`; exact file/runtime/controller digests in JSON.

## candidate-705

alive-prefix-only; observed 30.000s / intended 30.333s; horizon 30.000s. Spatial finish 4609.97px (map.width); rendering width 4609.97px; time after spatial finish 0.000s.
Equal-cadence union 5.350s (17.8% of observed duration). Longest 2.167s, 22.883–25.050s, 4 intervals, 65–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.117/10.117 | 100.0% complete | 4/3 | 0.297 | 1.680 | 1.087 | 162.573 | 15.652 / 38.822 / 64.139 / 133.143 |
| 2 | 10.108/10.108 | 100.0% complete | 5/5 | 0.495 | 1.484 | 1.088 | 149.913 | 10.500 / 25.988 / 50.878 / 76.615 |
| 3 | 9.775/10.108 | 96.7% alive-prefix-only | 7/7 | 0.716 | 1.330 | 1.023 | 168.176 | 13.335 / 29.550 / 60.602 / 95.189 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'laser_scanner:active': 56, 'laser_scanner:cooldown': 10, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 23} | -0.595 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 light-cavity alternate (2.167s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 light-cavity/alternate: longest 2.167s at 22.883–25.050s; total equal 2.167s / observed 5.800s; major60 reversals 2; active-end alive True
- m02 tidal-staircase/base: longest 2.108s at 11.042–13.150s; total equal 2.108s / observed 8.600s; major60 reversals 4; active-end alive True
- m01 cloister/base: longest 1.075s at 4.900–5.975s; total equal 1.075s / observed 6.867s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-705`; exact file/runtime/controller digests in JSON.

## candidate-706

alive-prefix-only; observed 30.000s / intended 30.442s; horizon 30.000s. Spatial finish 4625.50px (map.width); rendering width 4625.50px; time after spatial finish 0.000s.
Equal-cadence union 7.792s (26.0% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.150/10.150 | 100.0% complete | 3/2 | 0.197 | 1.576 | 0.690 | 154.110 | 15.769 / 30.183 / 52.257 / 121.590 |
| 2 | 10.150/10.150 | 100.0% complete | 5/5 | 0.493 | 1.576 | 1.379 | 158.133 | 11.142 / 27.135 / 51.392 / 78.316 |
| 3 | 9.700/10.142 | 95.6% alive-prefix-only | 2/2 | 0.206 | 1.443 | 0.825 | 158.495 | 10.663 / 26.016 / 54.756 / 91.001 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 2 | {'timed_armor_gate:open': 12} | 0.368 |
| 3 | 5 | {'laser_scanner:active': 54, 'laser_scanner:cooldown': 10, 'timed_armor_gate:closing': 12, 'timed_armor_gate:open': 34} | 0.388 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 light-cavity/alternate: longest 2.167s at 25.275–27.442s; total equal 2.167s / observed 5.467s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-706`; exact file/runtime/controller digests in JSON.

## candidate-707

alive-prefix-only; observed 30.000s / intended 30.650s; horizon 30.000s. Spatial finish 4657.50px (map.width); rendering width 4657.50px; time after spatial finish 0.000s.
Equal-cadence union 4.208s (14.0% of observed duration). Longest 2.108s, 12.517–14.625s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.217/10.217 | 100.0% complete | 4/3 | 0.294 | 1.664 | 1.175 | 161.345 | 9.792 / 25.374 / 61.737 / 132.337 |
| 2 | 10.217/10.217 | 100.0% complete | 5/5 | 0.489 | 1.566 | 1.077 | 153.105 | 3.582 / 16.153 / 46.497 / 85.551 |
| 3 | 9.567/10.217 | 93.6% alive-prefix-only | 3/3 | 0.314 | 1.463 | 1.150 | 164.725 | 16.929 / 25.739 / 50.204 / 79.095 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 25} | 0.288 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 2.108s at 12.517–14.625s; total equal 2.108s / observed 9.967s; major60 reversals 4; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-707`; exact file/runtime/controller digests in JSON.

## candidate-708

alive-prefix-only; observed 30.000s / intended 32.708s; horizon 30.000s. Spatial finish 4965.47px (map.width); rendering width 4965.47px; time after spatial finish 0.000s.
Equal-cadence union 6.700s (22.3% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.908/10.908 | 100.0% complete | 3/2 | 0.183 | 1.650 | 0.825 | 153.919 | 15.769 / 30.791 / 53.467 / 111.752 |
| 2 | 10.900/10.900 | 100.0% complete | 5/5 | 0.459 | 1.468 | 1.284 | 161.666 | 13.092 / 36.382 / 61.196 / 80.282 |
| 3 | 8.192/10.900 | 75.2% alive-prefix-only | 3/3 | 0.366 | 1.587 | 1.221 | 162.439 | 15.782 / 33.094 / 55.094 / 79.226 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 25} | 0.368 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 23.575–24.650s; total equal 1.075s / observed 7.342s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/runs/candidate-708`; exact file/runtime/controller digests in JSON.

## holdout-6401

alive-prefix-only; observed 30.000s / intended 31.208s; horizon 30.000s. Spatial finish 4740.50px (map.width); rendering width 4740.50px; time after spatial finish 0.000s.
Equal-cadence union 5.992s (20.0% of observed duration). Longest 2.808s, 8.000–10.808s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.408/10.408 | 100.0% complete | 5/4 | 0.384 | 1.633 | 0.961 | 153.031 | 15.864 / 51.371 / 67.926 / 130.725 |
| 2 | 10.400/10.400 | 100.0% complete | 6/6 | 0.577 | 1.538 | 1.250 | 162.160 | 14.414 / 27.236 / 54.822 / 78.226 |
| 3 | 9.192/10.400 | 88.4% alive-prefix-only | 3/3 | 0.326 | 1.523 | 0.979 | 164.564 | 23.064 / 35.789 / 63.898 / 92.990 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 7, 'timed_armor_gate:open': 27} | 0.453 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 slider-island base (2.808s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 slider-island/base: longest 2.808s at 8.000–10.808s; total equal 2.808s / observed 5.667s; major60 reversals 3; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.108s at 27.800–29.908s; total equal 3.183s / observed 8.467s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6401`; exact file/runtime/controller digests in JSON.

## holdout-6402

alive-prefix-only; observed 30.000s / intended 30.275s; horizon 30.000s. Spatial finish 4600.47px (map.width); rendering width 4600.47px; time after spatial finish 0.000s.
Equal-cadence union 5.317s (17.7% of observed duration). Longest 2.808s, 26.933–29.742s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.092/10.092 | 100.0% complete | 5/4 | 0.396 | 1.486 | 1.090 | 162.781 | 17.515 / 28.550 / 59.544 / 95.877 |
| 2 | 10.092/10.092 | 100.0% complete | 5/5 | 0.495 | 1.685 | 1.288 | 154.633 | 10.333 / 19.178 / 55.442 / 97.086 |
| 3 | 9.817/10.092 | 97.3% alive-prefix-only | 3/3 | 0.306 | 1.528 | 1.019 | 164.257 | 24.375 / 34.197 / 59.965 / 85.112 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 10} | 0.080 |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 8, 'timed_armor_gate:open': 27} | 0.353 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 bellows-question-answer alternate (2.275s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 bellows-question-answer/alternate: longest 2.108s at 26.933–29.042s; total equal 3.183s / observed 8.375s; major60 reversals 3; active-end alive True
- m03 tidal-staircase/alternate: longest 1.433s at 10.333–11.767s; total equal 1.433s / observed 10.500s; major60 reversals 5; active-end alive True

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6402`; exact file/runtime/controller digests in JSON.

## holdout-6403

alive-prefix-only; observed 30.000s / intended 30.217s; horizon 30.000s. Spatial finish 4592.50px (map.width); rendering width 4592.50px; time after spatial finish 0.000s.
Equal-cadence union 4.808s (16.0% of observed duration). Longest 2.700s, 17.783–20.483s, 5 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.075/10.075 | 100.0% complete | 4/3 | 0.298 | 1.588 | 1.092 | 157.362 | 10.341 / 23.021 / 55.000 / 93.012 |
| 2 | 10.075/10.075 | 100.0% complete | 4/4 | 0.397 | 1.588 | 0.993 | 161.483 | 3.818 / 15.607 / 51.756 / 91.414 |
| 3 | 9.850/10.067 | 97.8% alive-prefix-only | 3/3 | 0.305 | 1.421 | 0.914 | 156.619 | 12.075 / 26.097 / 53.421 / 82.687 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'laser_scanner:active': 52, 'timed_armor_gate:open': 8} | -1.270 |
| 3 | 4 | {'laser_scanner:active': 2, 'laser_scanner:cooldown': 10, 'timed_armor_gate:closing': 17, 'timed_armor_gate:open': 35} | 0.288 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m03 light-cavity alternate (2.700s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 light-cavity/alternate: longest 2.700s at 17.783–20.483s; total equal 2.700s / observed 6.000s; major60 reversals 3; active-end alive True
- m02 tidal-staircase/alternate: longest 2.108s at 11.992–14.100s; total equal 2.108s / observed 10.200s; major60 reversals 4; active-end alive True

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6403`; exact file/runtime/controller digests in JSON.

## holdout-6404

alive-prefix-only; observed 30.000s / intended 30.375s; horizon 30.000s. Spatial finish 4615.50px (map.width); rendering width 4615.50px; time after spatial finish 0.000s.
Equal-cadence union 5.983s (19.9% of observed duration). Longest 2.808s, 27.000–29.808s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.125/10.125 | 100.0% complete | 5/4 | 0.395 | 1.679 | 1.185 | 162.415 | 13.519 / 32.277 / 62.895 / 133.143 |
| 2 | 10.125/10.125 | 100.0% complete | 5/5 | 0.494 | 1.481 | 0.988 | 153.329 | 15.583 / 20.049 / 47.857 / 73.262 |
| 3 | 9.750/10.125 | 96.3% alive-prefix-only | 2/2 | 0.205 | 1.538 | 1.026 | 165.255 | 24.437 / 34.013 / 55.425 / 84.067 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 8, 'timed_armor_gate:open': 27} | 0.353 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 bellows-question-answer alternate (2.308s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 bellows-question-answer/alternate: longest 2.108s at 27.000–29.108s; total equal 3.183s / observed 8.108s; major60 reversals 2; active-end alive True
- m02 tidal-staircase/base: longest 2.100s at 11.050–13.150s; total equal 2.100s / observed 8.600s; major60 reversals 4; active-end alive True

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6404`; exact file/runtime/controller digests in JSON.

## holdout-6405

alive-prefix-only; observed 30.000s / intended 30.333s; horizon 30.000s. Spatial finish 4609.97px (map.width); rendering width 4609.97px; time after spatial finish 0.000s.
Equal-cadence union 4.267s (14.2% of observed duration). Longest 2.167s, 22.817–24.983s, 4 intervals, 65–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.117/10.117 | 100.0% complete | 5/4 | 0.395 | 1.680 | 1.186 | 162.342 | 13.519 / 33.657 / 63.335 / 133.143 |
| 2 | 10.108/10.108 | 100.0% complete | 5/5 | 0.495 | 1.484 | 0.989 | 152.904 | 15.771 / 26.487 / 50.263 / 77.134 |
| 3 | 9.775/10.108 | 96.7% alive-prefix-only | 6/6 | 0.614 | 1.330 | 1.023 | 165.496 | 8.621 / 30.618 / 63.112 / 98.837 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'laser_scanner:active': 56, 'laser_scanner:cooldown': 10, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 23} | -0.595 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 light-cavity alternate (2.167s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 light-cavity/alternate: longest 2.167s at 22.817–24.983s; total equal 2.167s / observed 5.967s; major60 reversals 2; active-end alive True
- m02 tidal-staircase/base: longest 2.100s at 11.050–13.150s; total equal 2.100s / observed 8.600s; major60 reversals 4; active-end alive True

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6405`; exact file/runtime/controller digests in JSON.

## holdout-6406

alive-prefix-only; observed 30.000s / intended 30.608s; horizon 30.000s. Spatial finish 4650.50px (map.width); rendering width 4650.50px; time after spatial finish 0.000s.
Equal-cadence union 5.892s (19.6% of observed duration). Longest 2.700s, 25.017–27.717s, 5 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.208/10.208 | 100.0% complete | 4/3 | 0.294 | 1.567 | 1.176 | 155.731 | 14.458 / 25.475 / 55.783 / 91.300 |
| 2 | 10.200/10.200 | 100.0% complete | 5/5 | 0.490 | 1.667 | 1.176 | 162.354 | 14.543 / 23.028 / 57.158 / 92.572 |
| 3 | 9.592/10.200 | 94.0% alive-prefix-only | 2/2 | 0.209 | 1.355 | 0.834 | 156.078 | 9.885 / 23.139 / 51.649 / 84.888 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 2 | {'timed_armor_gate:open': 14} | 0.368 |
| 3 | 5 | {'laser_scanner:active': 55, 'laser_scanner:cooldown': 9, 'timed_armor_gate:closing': 17, 'timed_armor_gate:open': 29} | -0.387 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 light-cavity alternate (2.700s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 light-cavity/alternate: longest 2.700s at 25.017–27.717s; total equal 2.700s / observed 5.467s; major60 reversals 2; active-end alive True
- m02 tidal-staircase/alternate: longest 2.100s at 12.075–14.175s; total equal 2.100s / observed 10.200s; major60 reversals 4; active-end alive True
- m03 bellows-question-answer/base: longest 1.092s at 17.742–18.833s; total equal 1.092s / observed 7.775s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6406`; exact file/runtime/controller digests in JSON.

## holdout-6407

alive-prefix-only; observed 30.000s / intended 30.983s; horizon 30.000s. Spatial finish 4707.50px (map.width); rendering width 4707.50px; time after spatial finish 0.000s.
Equal-cadence union 6.367s (21.2% of observed duration). Longest 2.117s, 17.667–19.783s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.333/10.333 | 100.0% complete | 3/2 | 0.194 | 1.548 | 1.065 | 162.703 | 20.261 / 29.265 / 62.545 / 91.243 |
| 2 | 10.325/10.325 | 100.0% complete | 5/5 | 0.484 | 1.646 | 1.065 | 156.268 | 3.460 / 15.250 / 44.613 / 85.016 |
| 3 | 9.342/10.325 | 90.5% alive-prefix-only | 3/3 | 0.321 | 1.499 | 1.070 | 162.535 | 21.670 / 28.080 / 50.225 / 74.699 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 8, 'timed_armor_gate:open': 27} | 0.273 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m03 tidal-staircase alternate (2.117s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 tidal-staircase/alternate: longest 2.117s at 17.667–19.783s; total equal 2.117s / observed 9.800s; major60 reversals 4; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.100s at 27.658–29.758s; total equal 3.175s / observed 7.883s; major60 reversals 3; active-end alive True
- m02 cloister/base: longest 1.075s at 10.150–11.225s; total equal 1.075s / observed 6.133s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6407`; exact file/runtime/controller digests in JSON.

## holdout-6408

alive-prefix-only; observed 30.000s / intended 32.375s; horizon 30.000s. Spatial finish 4915.47px (map.width); rendering width 4915.47px; time after spatial finish 0.000s.
Equal-cadence union 1.075s (3.6% of observed duration). Longest 1.075s, 10.208–11.283s, 3 intervals, 43–43ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.792/10.792 | 100.0% complete | 4/3 | 0.278 | 1.575 | 1.112 | 160.932 | 18.017 / 29.771 / 63.956 / 95.317 |
| 2 | 10.792/10.792 | 100.0% complete | 5/5 | 0.463 | 1.575 | 1.205 | 162.518 | 9.840 / 24.472 / 48.215 / 72.852 |
| 3 | 8.417/10.792 | 78.0% alive-prefix-only | 4/4 | 0.475 | 1.426 | 1.069 | 152.768 | 20.415 / 30.865 / 57.457 / 87.566 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:closing': 8, 'timed_armor_gate:open': 27} | 0.353 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 cloister alternate (1.075s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 cloister/alternate: longest 1.075s at 10.208–11.283s; total equal 1.075s / observed 6.300s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B4/runs/holdout-6408`; exact file/runtime/controller digests in JSON.
