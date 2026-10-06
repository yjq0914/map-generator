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
| integration/runs/four-loops/B4/finish-checks/full | 1 | 2 / 2 / 2 | 1.546 | 160.462 | 0.281 | 61.279 |
| integration/runs/four-loops/B4/finish-checks/full | 2 | 2 / 2 / 2 | 1.452 | 164.804 | 0.516 | 60.884 |
| integration/runs/four-loops/B4/finish-checks/full | 3 | 2 / 2 / 2 | 1.499 | 157.611 | 0.470 | 63.487 |
| integration/runs/four-loops/B4/finish-checks/macro | 1 | 2 / 2 / 2 | 1.500 | 156.948 | 0.338 | 55.070 |
| integration/runs/four-loops/B4/finish-checks/macro | 2 | 2 / 1 / 2 | 1.500 | 160.638 | 0.425 | 59.954 |
| integration/runs/four-loops/B4/finish-checks/macro | 3 | 1 / 1 / 2 | 1.550 | 156.883 | 0.325 | 53.588 |
| integration/runs/four-loops/B4/runs/baseline | 1 | 8 / 8 / 8 | 1.517 | 155.706 | 0.238 | 60.635 |
| integration/runs/four-loops/B4/runs/baseline | 2 | 8 / 7 / 8 | 1.532 | 160.569 | 0.388 | 52.682 |
| integration/runs/four-loops/B4/runs/baseline | 3 | 7 / 0 / 8 | — | — | — | — |
| integration/runs/four-loops/B4/runs/candidate | 1 | 8 / 8 / 8 | 1.582 | 153.763 | 0.231 | 58.999 |
| integration/runs/four-loops/B4/runs/candidate | 2 | 8 / 8 / 8 | 1.525 | 160.431 | 0.431 | 52.106 |
| integration/runs/four-loops/B4/runs/candidate | 3 | 8 / 1 / 8 | 1.700 | 159.319 | 0.400 | 63.917 |
| integration/runs/four-loops/B4/runs/holdout | 1 | 8 / 8 / 8 | 1.577 | 157.381 | 0.235 | 58.566 |
| integration/runs/four-loops/B4/runs/holdout | 2 | 8 / 7 / 8 | 1.500 | 163.620 | 0.485 | 60.036 |
| integration/runs/four-loops/B4/runs/holdout | 3 | 7 / 2 / 8 | 1.650 | 158.735 | 0.400 | 64.948 |

## baseline-701

alive-prefix-only; observed 30.000s / intended 30.942s; horizon 30.000s. Spatial finish 4700.47px (map.width); rendering width 4700.47px; time after spatial finish 0.000s.
Equal-cadence union 8.808s (29.4% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.317/10.317 | 100.0% complete | 3/2 | 0.194 | 1.648 | 0.775 | 155.300 | 22.274 / 35.610 / 62.257 / 121.821 |
| 2 | 10.317/10.317 | 100.0% complete | 4/4 | 0.388 | 1.454 | 0.969 | 158.225 | 23.656 / 40.338 / 64.415 / 95.494 |
| 3 | 9.367/10.308 | 90.9% alive-prefix-only | 4/4 | 0.427 | 1.601 | 1.601 | 158.608 | 12.782 / 27.059 / 57.738 / 94.294 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 4 | {'timed_armor_gate:open': 37} | 0.503 |
| 3 | 1 | {'timed_armor_gate:open': 9} | 0.080 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m02 bellows-question-answer/alternate: longest 2.108s at 16.967–19.075s; total equal 3.183s / observed 8.608s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B3/runs/candidate-701`; exact file/runtime/controller digests in JSON.

## baseline-702

alive-prefix-only; observed 30.000s / intended 31.342s; horizon 30.000s. Spatial finish 4760.47px (map.width); rendering width 4760.47px; time after spatial finish 0.000s.
Equal-cadence union 4.250s (14.2% of observed duration). Longest 2.817s, 15.233–18.050s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.450/10.450 | 100.0% complete | 4/3 | 0.287 | 1.435 | 0.957 | 163.396 | 19.374 / 37.080 / 70.470 / 194.000 |
| 2 | 10.450/10.450 | 100.0% complete | 3/3 | 0.287 | 1.531 | 0.957 | 166.393 | 12.429 / 29.626 / 52.326 / 89.596 |
| 3 | 9.100/10.442 | 87.2% alive-prefix-only | 3/3 | 0.330 | 1.538 | 1.319 | 149.630 | 15.205 / 22.484 / 54.904 / 95.163 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 5 | {'timed_armor_gate:open': 31} | 0.388 |
| 2 | 0 | {'timed_armor_gate:open': 8} | — |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m03 tidal-staircase alternate (2.817s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 tidal-staircase/alternate: longest 2.817s at 15.233–18.050s; total equal 4.250s / observed 10.667s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B3/runs/candidate-702`; exact file/runtime/controller digests in JSON.

## baseline-703

alive-prefix-only; observed 30.000s / intended 31.317s; horizon 30.000s. Spatial finish 4757.50px (map.width); rendering width 4757.50px; time after spatial finish 0.000s.
Equal-cadence union 8.000s (26.7% of observed duration). Longest 2.708s, 16.225–18.933s, 5 intervals, 65–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.442/10.442 | 100.0% complete | 4/3 | 0.287 | 1.532 | 1.053 | 155.095 | 16.274 / 28.426 / 54.880 / 194.000 |
| 2 | 10.442/10.442 | 100.0% complete | 3/3 | 0.287 | 1.532 | 0.958 | 160.569 | 2.730 / 22.653 / 52.682 / 77.517 |
| 3 | 9.117/10.433 | 87.4% alive-prefix-only | 3/3 | 0.329 | 1.645 | 0.987 | 152.402 | 3.547 / 14.601 / 41.369 / 85.736 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 4 | {'timed_armor_gate:open': 35} | 0.323 |
| 2 | 3 | {'laser_scanner:active': 43, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 16, 'timed_armor_gate:open': 13} | -1.633 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m03 light-cavity base (2.708s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 light-cavity/base: longest 2.708s at 16.225–18.933s; total equal 2.708s / observed 5.800s; major60 reversals 2; active-end alive True
- m01 bellows-question-answer/alternate: longest 2.108s at 6.775–8.883s; total equal 2.108s / observed 9.183s; major60 reversals 2; active-end alive True
- m04 tidal-staircase/base: longest 2.108s at 22.175–24.283s; total equal 2.108s / observed 9.217s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/four-loops/B3/runs/candidate-703`; exact file/runtime/controller digests in JSON.

## baseline-704

death; observed 13.492s / intended 31.242s; horizon 30.000s. Spatial finish 4745.50px (map.width); rendering width 4745.50px; time after spatial finish 0.000s.
Equal-cadence union 2.700s (20.0% of observed duration). Longest 2.700s, 10.467–13.167s, 5 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.417/10.417 | 100.0% complete | 3/2 | 0.192 | 1.440 | 0.960 | 161.055 | 13.384 / 33.699 / 63.201 / 194.000 |
| 2 | 3.075/10.417 | 29.5% death | 1/1 | 0.325 | 1.951 | 0.650 | 126.744 | -0.391 / 12.985 / 49.011 / 67.276 |
| 3 | 0.000/10.408 | 0.0% unreached-death | 0/0 | — | — | — | — | — / — / — / — |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 6 | {'laser_scanner:active': 4, 'timed_armor_gate:open': 35} | 0.403 |
| 2 | 1 | {'laser_scanner:active': 51, 'laser_scanner:cooldown': 2, 'timed_armor_gate:closing': 1, 'timed_armor_gate:open': 13} | -1.633 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 light-cavity alternate (2.700s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 light-cavity/alternate: longest 2.700s at 10.467–13.167s; total equal 2.700s / observed 3.983s; major60 reversals 1; active-end alive False

Evidence: `integration/runs/four-loops/B3/runs/candidate-704`; exact file/runtime/controller digests in JSON.

## baseline-705

alive-prefix-only; observed 30.000s / intended 31.142s; horizon 30.000s. Spatial finish 4730.47px (map.width); rendering width 4730.47px; time after spatial finish 0.000s.
Equal-cadence union 3.900s (13.0% of observed duration). Longest 2.108s, 5.058–7.167s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.383/10.383 | 100.0% complete | 4/3 | 0.289 | 1.541 | 0.963 | 157.075 | 22.374 / 40.307 / 67.625 / 195.500 |
| 2 | 10.383/10.383 | 100.0% complete | 5/5 | 0.482 | 1.445 | 0.867 | 174.619 | 11.090 / 31.476 / 61.784 / 97.141 |
| 3 | 9.233/10.375 | 89.0% alive-prefix-only | 3/3 | 0.325 | 1.516 | 1.408 | 150.197 | 5.356 / 26.640 / 63.432 / 95.009 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 4 | {'timed_armor_gate:open': 35} | 0.503 |
| 2 | 1 | {'timed_armor_gate:open': 10} | 0.080 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 bellows-question-answer alternate (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 bellows-question-answer/alternate: longest 2.108s at 5.058–7.167s; total equal 2.108s / observed 9.908s; major60 reversals 2; active-end alive True
- m03 tidal-staircase/base: longest 1.433s at 14.492–15.925s; total equal 1.433s / observed 9.467s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B3/runs/candidate-705`; exact file/runtime/controller digests in JSON.

## baseline-706

alive-prefix-only; observed 30.000s / intended 31.142s; horizon 30.000s. Spatial finish 4730.50px (map.width); rendering width 4730.50px; time after spatial finish 0.000s.
Equal-cadence union 10.967s (36.6% of observed duration). Longest 3.508s, 6.925–10.433s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.383/10.383 | 100.0% complete | 2/1 | 0.096 | 1.541 | 0.867 | 146.336 | 18.017 / 30.184 / 52.842 / 95.017 |
| 2 | 10.383/10.383 | 100.0% complete | 4/4 | 0.385 | 1.541 | 0.867 | 163.668 | 6.237 / 18.972 / 53.112 / 88.522 |
| 3 | 9.233/10.375 | 89.0% alive-prefix-only | 3/3 | 0.325 | 1.516 | 0.866 | 162.337 | 25.614 / 33.069 / 57.538 / 87.796 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'laser_scanner:active': 55, 'timed_armor_gate:open': 12} | -1.633 |
| 3 | 4 | {'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 16, 'timed_armor_gate:open': 37} | 0.403 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (3.508s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 3.508s at 6.925–10.433s; total equal 5.617s / observed 10.367s; major60 reversals 2; active-end alive True
- m03 light-cavity/alternate: longest 2.158s at 18.108–20.267s; total equal 2.158s / observed 6.000s; major60 reversals 3; active-end alive True
- m04 bellows-question-answer/alternate: longest 1.075s at 23.317–24.392s; total equal 1.075s / observed 7.533s; major60 reversals 2; active-end alive False

Evidence: `integration/runs/four-loops/B3/runs/candidate-706`; exact file/runtime/controller digests in JSON.

## baseline-707

alive-prefix-only; observed 30.000s / intended 32.050s; horizon 30.000s. Spatial finish 4867.47px (map.width); rendering width 4867.47px; time after spatial finish 0.000s.
Equal-cadence union 7.442s (24.8% of observed duration). Longest 2.108s, 7.550–9.658s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.683/10.683 | 100.0% complete | 3/2 | 0.187 | 1.498 | 0.936 | 156.113 | 18.244 / 22.634 / 54.892 / 94.326 |
| 2 | 10.683/10.683 | 100.0% complete | 6/6 | 0.562 | 1.685 | 1.310 | 157.814 | 3.524 / 17.805 / 46.042 / 76.008 |
| 3 | 8.633/10.683 | 80.8% alive-prefix-only | 3/3 | 0.347 | 1.622 | 1.042 | 165.659 | 3.946 / 34.047 / 61.623 / 88.169 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'timed_armor_gate:open': 19} | 0.238 |
| 3 | 2 | {'timed_armor_gate:open': 17} | 0.406 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase base (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/base: longest 2.108s at 7.550–9.658s; total equal 4.217s / observed 9.167s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 18.675–19.750s; total equal 1.075s / observed 6.950s; major60 reversals 3; active-end alive True
- m05 cloister/alternate: longest 1.075s at 28.558–29.633s; total equal 1.075s / observed 5.483s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/four-loops/B3/runs/candidate-707`; exact file/runtime/controller digests in JSON.

## baseline-708

alive-prefix-only; observed 30.000s / intended 31.975s; horizon 30.000s. Spatial finish 4855.47px (map.width); rendering width 4855.47px; time after spatial finish 0.000s.
Equal-cadence union 7.425s (24.8% of observed duration). Longest 2.117s, 6.900–9.017s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.658/10.658 | 100.0% complete | 4/3 | 0.281 | 1.501 | 0.844 | 152.336 | 24.126 / 32.169 / 59.014 / 87.567 |
| 2 | 10.658/10.658 | 100.0% complete | 6/6 | 0.563 | 1.595 | 1.314 | 157.282 | 15.314 / 24.195 / 51.456 / 83.335 |
| 3 | 8.683/10.658 | 81.5% alive-prefix-only | 3/3 | 0.345 | 1.727 | 1.036 | 169.624 | 31.574 / 39.776 / 61.888 / 86.317 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'timed_armor_gate:open': 19} | 0.318 |
| 3 | 2 | {'timed_armor_gate:open': 17} | 0.486 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase base (2.117s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/base: longest 2.117s at 6.900–9.017s; total equal 2.117s / observed 9.167s; major60 reversals 3; active-end alive True
- m01 slider-island/base: longest 2.083s at 1.683–3.767s; total equal 2.083s / observed 5.700s; major60 reversals 1; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 18.158–19.233s; total equal 1.075s / observed 7.275s; major60 reversals 3; active-end alive True
- m05 cloister/alternate: longest 1.075s at 24.442–25.517s; total equal 2.150s / observed 5.558s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/four-loops/B3/runs/candidate-708`; exact file/runtime/controller digests in JSON.

## candidate-701

alive-prefix-only; observed 30.000s / intended 32.475s; horizon 30.000s. Spatial finish 4930.47px (map.width); rendering width 4930.47px; time after spatial finish 0.000s.
Equal-cadence union 5.300s (17.7% of observed duration). Longest 2.117s, 1.583–3.700s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.825/10.825 | 100.0% complete | 4/3 | 0.277 | 1.570 | 1.109 | 161.013 | 24.389 / 34.002 / 65.431 / 116.150 |
| 2 | 10.825/10.825 | 100.0% complete | 5/5 | 0.462 | 1.478 | 1.109 | 158.313 | 19.774 / 34.740 / 61.732 / 97.224 |
| 3 | 8.350/10.825 | 77.1% alive-prefix-only | 4/4 | 0.479 | 1.557 | 1.078 | 166.542 | 16.197 / 38.303 / 60.656 / 79.052 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 4} | 0.418 |
| 2 | 4 | {'timed_armor_gate:open': 34} | 0.503 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase base (2.117s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/base: longest 2.117s at 1.583–3.700s; total equal 2.117s / observed 9.467s; major60 reversals 2; active-end alive True
- m04 slider-island/base: longest 2.108s at 21.383–23.492s; total equal 2.108s / observed 5.533s; major60 reversals 1; active-end alive True
- m02 bellows-question-answer/base: longest 1.075s at 10.767–11.842s; total equal 1.075s / observed 8.008s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/candidate-701`; exact file/runtime/controller digests in JSON.

## candidate-702

alive-prefix-only; observed 30.000s / intended 32.675s; horizon 30.000s. Spatial finish 4960.47px (map.width); rendering width 4960.47px; time after spatial finish 0.000s.
Equal-cadence union 9.067s (30.2% of observed duration). Longest 2.692s, 9.783–12.475s, 5 intervals, 63–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.892/10.892 | 100.0% complete | 4/3 | 0.275 | 1.561 | 1.010 | 159.539 | 3.683 / 33.874 / 62.845 / 188.000 |
| 2 | 10.892/10.892 | 100.0% complete | 3/3 | 0.275 | 1.469 | 0.735 | 156.688 | 5.570 / 20.451 / 52.184 / 92.691 |
| 3 | 8.217/10.892 | 75.4% alive-prefix-only | 4/4 | 0.487 | 1.704 | 1.095 | 156.548 | 18.397 / 29.151 / 54.786 / 78.455 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 6 | {'laser_scanner:active': 24, 'timed_armor_gate:open': 29} | 0.403 |
| 2 | 1 | {'laser_scanner:active': 31, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 12, 'timed_armor_gate:open': 17} | -1.270 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 light-cavity alternate (2.692s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 light-cavity/alternate: longest 2.692s at 9.783–12.475s; total equal 2.692s / observed 5.467s; major60 reversals 2; active-end alive True
- m03 tidal-staircase/base: longest 2.117s at 15.700–17.817s; total equal 5.300s / observed 9.467s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/candidate-702`; exact file/runtime/controller digests in JSON.

## candidate-703

alive-prefix-only; observed 30.000s / intended 30.950s; horizon 30.000s. Spatial finish 4702.47px (map.width); rendering width 4702.47px; time after spatial finish 0.000s.
Equal-cadence union 8.167s (27.2% of observed duration). Longest 2.817s, 7.992–10.808s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.317/10.317 | 100.0% complete | 5/4 | 0.388 | 1.648 | 0.969 | 153.736 | 15.294 / 51.065 / 67.320 / 131.531 |
| 2 | 10.317/10.317 | 100.0% complete | 5/5 | 0.485 | 1.551 | 1.260 | 162.549 | 12.653 / 24.542 / 48.030 / 76.906 |
| 3 | 9.367/10.317 | 90.8% alive-prefix-only | 2/2 | 0.214 | 1.388 | 0.854 | 155.679 | 3.791 / 24.458 / 50.312 / 75.935 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'timed_armor_gate:open': 21} | 0.238 |
| 3 | 5 | {'laser_scanner:active': 43, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 12, 'timed_armor_gate:open': 40} | 0.308 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 slider-island base (2.817s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 slider-island/base: longest 2.817s at 7.992–10.808s; total equal 2.817s / observed 5.500s; major60 reversals 3; active-end alive True
- m05 light-cavity/base: longest 2.167s at 25.733–27.900s; total equal 2.167s / observed 5.467s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.108s at 22.142–24.250s; total equal 3.183s / observed 7.817s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/candidate-703`; exact file/runtime/controller digests in JSON.

## candidate-704

alive-prefix-only; observed 30.000s / intended 32.000s; horizon 30.000s. Spatial finish 4859.97px (map.width); rendering width 4859.97px; time after spatial finish 0.000s.
Equal-cadence union 10.592s (35.3% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.667/10.667 | 100.0% complete | 3/2 | 0.188 | 1.594 | 0.750 | 153.790 | 15.769 / 30.563 / 53.057 / 115.441 |
| 2 | 10.667/10.667 | 100.0% complete | 6/6 | 0.562 | 1.594 | 1.219 | 157.158 | 15.909 / 40.190 / 65.016 / 90.289 |
| 3 | 8.667/10.667 | 81.2% alive-prefix-only | 4/4 | 0.462 | 1.615 | 0.923 | 166.498 | 19.543 / 34.509 / 60.744 / 78.454 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 1 | {'timed_armor_gate:open': 7} | 0.080 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 slider-island/base: longest 2.817s at 20.308–23.125s; total equal 2.817s / observed 5.500s; major60 reversals 3; active-end alive True
- m03 cloister/base: longest 1.075s at 17.333–18.408s; total equal 1.075s / observed 6.333s; major60 reversals 2; active-end alive True
- m05 cloister/base: longest 1.075s at 28.817–29.892s; total equal 1.075s / observed 5.200s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/four-loops/B4/runs/candidate-704`; exact file/runtime/controller digests in JSON.

## candidate-705

alive-prefix-only; observed 30.000s / intended 32.042s; horizon 30.000s. Spatial finish 4865.97px (map.width); rendering width 4865.97px; time after spatial finish 0.000s.
Equal-cadence union 6.000s (20.0% of observed duration). Longest 2.817s, 18.717–21.533s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.683/10.683 | 100.0% complete | 6/5 | 0.468 | 1.404 | 0.936 | 166.312 | 22.374 / 39.657 / 68.852 / 191.000 |
| 2 | 10.683/10.683 | 100.0% complete | 4/4 | 0.374 | 1.591 | 1.123 | 149.451 | 16.213 / 41.771 / 63.467 / 89.467 |
| 3 | 8.633/10.675 | 80.9% alive-prefix-only | 3/3 | 0.347 | 1.506 | 1.158 | 169.465 | 18.939 / 30.889 / 60.470 / 94.512 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 5 | {'timed_armor_gate:open': 29} | 0.488 |
| 2 | 0 | {'timed_armor_gate:open': 8} | — |
| 3 | 3 | {'timed_armor_gate:open': 20} | 0.488 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 slider-island base (2.817s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 slider-island/base: longest 2.817s at 18.717–21.533s; total equal 2.817s / observed 5.500s; major60 reversals 3; active-end alive True
- m01 bellows-question-answer/base: longest 2.108s at 5.058–7.167s; total equal 2.108s / observed 9.308s; major60 reversals 2; active-end alive True
- m03 cloister/base: longest 1.075s at 15.767–16.842s; total equal 1.075s / observed 6.333s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/candidate-705`; exact file/runtime/controller digests in JSON.

## candidate-706

alive-prefix-only; observed 30.000s / intended 31.375s; horizon 30.000s. Spatial finish 4765.47px (map.width); rendering width 4765.47px; time after spatial finish 0.000s.
Equal-cadence union 8.158s (27.2% of observed duration). Longest 2.808s, 6.925–9.733s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.458/10.458 | 100.0% complete | 2/1 | 0.096 | 1.530 | 0.861 | 147.262 | 18.017 / 30.247 / 52.949 / 94.731 |
| 2 | 10.458/10.458 | 100.0% complete | 6/6 | 0.574 | 1.625 | 1.147 | 162.847 | 15.018 / 27.759 / 52.028 / 81.322 |
| 3 | 9.083/10.458 | 86.9% alive-prefix-only | 3/3 | 0.330 | 1.431 | 0.991 | 162.002 | 7.968 / 29.760 / 61.719 / 94.263 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'timed_armor_gate:open': 19} | 0.318 |
| 3 | 5 | {'laser_scanner:active': 56, 'laser_scanner:cooldown': 8, 'timed_armor_gate:closing': 9, 'timed_armor_gate:open': 34} | 0.388 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase base (2.808s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/base: longest 2.808s at 6.925–9.733s; total equal 4.917s / observed 9.167s; major60 reversals 2; active-end alive True
- m05 light-cavity/alternate: longest 2.167s at 25.933–28.100s; total equal 2.167s / observed 5.158s; major60 reversals 2; active-end alive False
- m04 bellows-question-answer/base: longest 1.075s at 18.725–19.800s; total equal 1.075s / observed 7.275s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/candidate-706`; exact file/runtime/controller digests in JSON.

## candidate-707

native-win; observed 30.000s / intended 30.000s; horizon 30.000s. Spatial finish 4560.00px (map.width); rendering width 4560.00px; time after spatial finish 0.000s.
Equal-cadence union 9.225s (30.8% of observed duration). Longest 2.817s, 7.550–10.367s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.000/10.000 | 100.0% complete | 2/1 | 0.100 | 1.600 | 1.000 | 148.183 | 18.508 / 22.993 / 55.153 / 96.506 |
| 2 | 10.000/10.000 | 100.0% complete | 4/4 | 0.400 | 1.500 | 0.900 | 166.458 | 4.057 / 13.289 / 47.744 / 85.488 |
| 3 | 10.000/10.000 | 100.0% complete | 4/4 | 0.400 | 1.700 | 1.000 | 159.319 | 9.224 / 37.342 / 63.917 / 111.479 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'laser_scanner:active': 35, 'timed_armor_gate:open': 4} | -1.270 |
| 3 | 0 | {'laser_scanner:active': 8, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 12} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (2.817s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 2.817s at 7.550–10.367s; total equal 4.917s / observed 10.367s; major60 reversals 2; active-end alive True
- m03 light-cavity/base: longest 2.158s at 18.058–20.217s; total equal 2.158s / observed 6.000s; major60 reversals 3; active-end alive True
- m04 cloister/alternate: longest 1.075s at 22.467–23.542s; total equal 2.150s / observed 6.467s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/candidate-707`; exact file/runtime/controller digests in JSON.

## candidate-708

alive-prefix-only; observed 30.000s / intended 31.508s; horizon 30.000s. Spatial finish 4785.44px (map.width); rendering width 4785.44px; time after spatial finish 0.000s.
Equal-cadence union 5.617s (18.7% of observed duration). Longest 3.508s, 6.925–10.433s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.508/10.508 | 100.0% complete | 2/1 | 0.095 | 1.618 | 0.856 | 147.695 | 18.017 / 30.310 / 52.951 / 94.444 |
| 2 | 10.500/10.500 | 100.0% complete | 3/3 | 0.286 | 1.429 | 1.143 | 168.819 | 10.712 / 21.841 / 51.765 / 92.468 |
| 3 | 8.992/10.500 | 85.6% alive-prefix-only | 5/5 | 0.556 | 1.446 | 1.223 | 159.673 | 20.332 / 33.722 / 61.344 / 90.346 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 1 | {'timed_armor_gate:open': 9} | 0.080 |
| 3 | 5 | {'timed_armor_gate:open': 31} | 0.388 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (3.508s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 3.508s at 6.925–10.433s; total equal 5.617s / observed 10.367s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/candidate-708`; exact file/runtime/controller digests in JSON.

## holdout-4401

native-win; observed 30.000s / intended 30.000s; horizon 30.000s. Spatial finish 4560.00px (map.width); rendering width 4560.00px; time after spatial finish 0.000s.
Equal-cadence union 7.833s (26.1% of observed duration). Longest 3.517s, 7.050–10.567s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.000/10.000 | 100.0% complete | 2/1 | 0.100 | 1.600 | 0.900 | 146.336 | 18.869 / 34.212 / 61.015 / 95.832 |
| 2 | 10.000/10.000 | 100.0% complete | 4/4 | 0.400 | 1.500 | 1.100 | 162.021 | 24.187 / 32.726 / 54.309 / 79.514 |
| 3 | 10.000/10.000 | 100.0% complete | 4/4 | 0.400 | 1.600 | 1.100 | 158.152 | 7.240 / 28.381 / 65.818 / 101.624 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'laser_scanner:active': 44, 'timed_armor_gate:open': 4} | -1.270 |
| 3 | 0 | {'laser_scanner:active': 11, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 12} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 3.517s at 7.050–10.567s; total equal 3.517s / observed 10.367s; major60 reversals 2; active-end alive True
- m03 light-cavity/alternate: longest 2.167s at 18.350–20.517s; total equal 2.167s / observed 6.000s; major60 reversals 3; active-end alive True
- m04 cloister/base: longest 1.075s at 26.967–28.042s; total equal 1.075s / observed 6.467s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/holdout-4401`; exact file/runtime/controller digests in JSON.

## holdout-4402

alive-prefix-only; observed 30.000s / intended 31.542s; horizon 30.000s. Spatial finish 4790.44px (map.width); rendering width 4790.44px; time after spatial finish 0.000s.
Equal-cadence union 3.192s (10.6% of observed duration). Longest 2.117s, 1.583–3.700s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.517/10.517 | 100.0% complete | 4/3 | 0.285 | 1.521 | 1.046 | 159.912 | 15.519 / 26.502 / 57.127 / 116.671 |
| 2 | 10.517/10.517 | 100.0% complete | 6/6 | 0.571 | 1.426 | 1.046 | 171.296 | 21.076 / 35.780 / 60.036 / 90.307 |
| 3 | 8.967/10.508 | 85.3% alive-prefix-only | 5/5 | 0.558 | 1.338 | 1.338 | 154.892 | 14.251 / 23.583 / 59.929 / 95.475 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 1} | 0.318 |
| 2 | 4 | {'timed_armor_gate:open': 45} | 0.403 |
| 3 | 1 | {'timed_armor_gate:open': 2} | 0.080 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase base (2.117s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/base: longest 2.117s at 1.583–3.700s; total equal 2.117s / observed 9.467s; major60 reversals 2; active-end alive True
- m02 bellows-question-answer/alternate: longest 1.075s at 10.767–11.842s; total equal 1.075s / observed 8.208s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/holdout-4402`; exact file/runtime/controller digests in JSON.

## holdout-4403

alive-prefix-only; observed 30.000s / intended 31.917s; horizon 30.000s. Spatial finish 4847.47px (map.width); rendering width 4847.47px; time after spatial finish 0.000s.
Equal-cadence union 8.383s (27.9% of observed duration). Longest 2.817s, 20.692–23.508s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.642/10.642 | 100.0% complete | 6/5 | 0.470 | 1.410 | 1.034 | 163.671 | 16.274 / 31.901 / 60.006 / 191.000 |
| 2 | 10.642/10.642 | 100.0% complete | 6/6 | 0.564 | 1.691 | 1.034 | 163.620 | 11.410 / 37.057 / 63.726 / 83.421 |
| 3 | 8.717/10.633 | 82.0% alive-prefix-only | 3/3 | 0.344 | 1.491 | 0.688 | 166.460 | 10.325 / 24.665 / 53.936 / 78.669 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 5 | {'timed_armor_gate:open': 36} | 0.308 |
| 2 | 0 | {'timed_armor_gate:open': 2} | — |
| 3 | 3 | {'laser_scanner:active': 55, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 16} | -1.270 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 slider-island base (2.817s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 slider-island/base: longest 2.817s at 20.692–23.508s; total equal 2.817s / observed 5.500s; major60 reversals 3; active-end alive True
- m05 light-cavity/alternate: longest 2.700s at 26.242–28.942s; total equal 2.700s / observed 4.950s; major60 reversals 2; active-end alive False
- m03 cloister/base: longest 1.433s at 13.075–14.508s; total equal 2.508s / observed 6.667s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/holdout-4403`; exact file/runtime/controller digests in JSON.

## holdout-4404

alive-prefix-only; observed 30.000s / intended 32.000s; horizon 30.000s. Spatial finish 4859.97px (map.width); rendering width 4859.97px; time after spatial finish 0.000s.
Equal-cadence union 9.517s (31.7% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.667/10.667 | 100.0% complete | 3/2 | 0.188 | 1.594 | 0.750 | 153.790 | 15.769 / 30.563 / 53.057 / 115.441 |
| 2 | 10.667/10.667 | 100.0% complete | 6/6 | 0.562 | 1.594 | 1.406 | 156.801 | 29.416 / 43.107 / 65.859 / 92.438 |
| 3 | 8.667/10.667 | 81.2% alive-prefix-only | 4/4 | 0.462 | 1.615 | 1.038 | 163.641 | 19.836 / 40.579 / 62.328 / 81.264 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 1 | {'timed_armor_gate:open': 7} | 0.080 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 slider-island/base: longest 2.817s at 20.358–23.175s; total equal 2.817s / observed 5.500s; major60 reversals 3; active-end alive True
- m05 cloister/alternate: longest 1.075s at 28.767–29.842s; total equal 1.075s / observed 5.200s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/four-loops/B4/runs/holdout-4404`; exact file/runtime/controller digests in JSON.

## holdout-4405

alive-prefix-only; observed 30.000s / intended 30.908s; horizon 30.000s. Spatial finish 4695.47px (map.width); rendering width 4695.47px; time after spatial finish 0.000s.
Equal-cadence union 8.808s (29.4% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.308/10.308 | 100.0% complete | 3/2 | 0.194 | 1.649 | 0.776 | 155.222 | 22.274 / 35.610 / 62.257 / 121.821 |
| 2 | 10.300/10.300 | 100.0% complete | 5/5 | 0.485 | 1.262 | 1.262 | 173.720 | 19.907 / 28.624 / 69.136 / 98.270 |
| 3 | 9.392/10.300 | 91.2% alive-prefix-only | 2/2 | 0.213 | 1.597 | 0.958 | 152.916 | 11.037 / 33.827 / 60.615 / 94.258 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 1 | {'timed_armor_gate:open': 9} | 0.080 |
| 3 | 4 | {'timed_armor_gate:open': 35} | 0.503 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/alternate: longest 1.075s at 22.875–23.950s; total equal 1.075s / observed 8.542s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/holdout-4405`; exact file/runtime/controller digests in JSON.

## holdout-4406

alive-prefix-only; observed 30.000s / intended 32.675s; horizon 30.000s. Spatial finish 4960.47px (map.width); rendering width 4960.47px; time after spatial finish 0.000s.
Equal-cadence union 9.067s (30.2% of observed duration). Longest 2.692s, 9.783–12.475s, 5 intervals, 63–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.892/10.892 | 100.0% complete | 4/3 | 0.275 | 1.561 | 1.010 | 159.539 | 3.683 / 33.874 / 62.845 / 188.000 |
| 2 | 10.892/10.892 | 100.0% complete | 3/3 | 0.275 | 1.469 | 0.735 | 156.688 | 5.570 / 20.451 / 52.184 / 92.691 |
| 3 | 8.217/10.892 | 75.4% alive-prefix-only | 4/4 | 0.487 | 1.704 | 1.095 | 156.548 | 18.397 / 29.151 / 54.786 / 78.455 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 6 | {'laser_scanner:active': 24, 'timed_armor_gate:open': 29} | 0.403 |
| 2 | 1 | {'laser_scanner:active': 19, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 12, 'timed_armor_gate:open': 17} | -1.270 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 light-cavity base (2.692s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 light-cavity/base: longest 2.692s at 9.783–12.475s; total equal 2.692s / observed 5.467s; major60 reversals 2; active-end alive True
- m03 tidal-staircase/base: longest 2.117s at 15.700–17.817s; total equal 5.300s / observed 9.467s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/holdout-4406`; exact file/runtime/controller digests in JSON.

## holdout-4407

native-win; observed 30.000s / intended 30.000s; horizon 30.000s. Spatial finish 4560.00px (map.width); rendering width 4560.00px; time after spatial finish 0.000s.
Equal-cadence union 9.225s (30.8% of observed duration). Longest 2.817s, 7.550–10.367s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.000/10.000 | 100.0% complete | 2/1 | 0.100 | 1.600 | 1.000 | 148.183 | 18.508 / 22.993 / 55.153 / 96.506 |
| 2 | 10.000/10.000 | 100.0% complete | 4/4 | 0.400 | 1.500 | 0.900 | 166.458 | 4.057 / 13.289 / 47.744 / 85.488 |
| 3 | 10.000/10.000 | 100.0% complete | 4/4 | 0.400 | 1.700 | 1.000 | 159.319 | 9.224 / 37.268 / 64.079 / 111.479 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'laser_scanner:active': 44, 'timed_armor_gate:open': 4} | -1.270 |
| 3 | 0 | {'laser_scanner:active': 11, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 12} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (2.817s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 2.817s at 7.550–10.367s; total equal 4.917s / observed 10.367s; major60 reversals 2; active-end alive True
- m03 light-cavity/alternate: longest 2.158s at 18.058–20.217s; total equal 2.158s / observed 6.000s; major60 reversals 3; active-end alive True
- m04 cloister/base: longest 1.075s at 22.467–23.542s; total equal 2.150s / observed 6.467s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/holdout-4407`; exact file/runtime/controller digests in JSON.

## holdout-4408

death; observed 20.725s / intended 31.742s; horizon 30.000s. Spatial finish 4820.47px (map.width); rendering width 4820.47px; time after spatial finish 0.000s.
Equal-cadence union 5.350s (25.8% of observed duration). Longest 2.158s, 18.025–20.183s, 4 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.583/10.583 | 100.0% complete | 4/3 | 0.283 | 1.512 | 1.039 | 159.585 | 15.519 / 26.502 / 57.127 / 116.671 |
| 2 | 10.142/10.583 | 95.8% death | 3/3 | 0.296 | 1.578 | 0.986 | 152.481 | -0.818 / 28.208 / 52.039 / 85.504 |
| 3 | 0.000/10.575 | 0.0% unreached-death | 0/0 | — | — | — | — | — / — / — / — |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 1} | 0.318 |
| 2 | 6 | {'laser_scanner:active': 54, 'timed_armor_gate:open': 41} | 0.403 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m03 light-cavity alternate (2.158s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 light-cavity/alternate: longest 2.158s at 18.025–20.183s; total equal 2.158s / observed 3.650s; major60 reversals 1; active-end alive False
- m01 tidal-staircase/base: longest 2.117s at 1.583–3.700s; total equal 2.117s / observed 9.467s; major60 reversals 2; active-end alive True
- m02 bellows-question-answer/base: longest 1.075s at 10.767–11.842s; total equal 1.075s / observed 7.608s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/runs/holdout-4408`; exact file/runtime/controller digests in JSON.

## full-701

native-win; observed 32.475s / intended 32.475s; horizon 32.483s. Spatial finish 4930.47px (map.width); rendering width 4930.47px; time after spatial finish 0.000s.
Equal-cadence union 6.375s (19.6% of observed duration). Longest 2.117s, 1.583–3.700s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.825/10.825 | 100.0% complete | 4/3 | 0.277 | 1.570 | 1.109 | 161.013 | 24.389 / 34.002 / 65.431 / 116.150 |
| 2 | 10.825/10.825 | 100.0% complete | 5/5 | 0.462 | 1.478 | 1.109 | 158.313 | 19.774 / 34.740 / 61.732 / 97.224 |
| 3 | 10.825/10.825 | 100.0% complete | 4/4 | 0.370 | 1.570 | 1.016 | 160.201 | 16.197 / 39.949 / 61.265 / 89.359 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 4} | 0.418 |
| 2 | 4 | {'timed_armor_gate:open': 34} | 0.503 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase base (2.117s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/base: longest 2.117s at 1.583–3.700s; total equal 2.117s / observed 9.467s; major60 reversals 2; active-end alive True
- m04 slider-island/base: longest 2.108s at 21.383–23.492s; total equal 2.108s / observed 5.533s; major60 reversals 1; active-end alive True
- m02 bellows-question-answer/base: longest 1.075s at 10.767–11.842s; total equal 1.075s / observed 8.008s; major60 reversals 3; active-end alive True
- m05 cloister/base: longest 1.075s at 29.200–30.275s; total equal 1.075s / observed 6.300s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/finish-checks/full-701`; exact file/runtime/controller digests in JSON.

## full-4402

native-win; observed 31.542s / intended 31.542s; horizon 31.550s. Spatial finish 4790.44px (map.width); rendering width 4790.44px; time after spatial finish 0.000s.
Equal-cadence union 3.192s (10.1% of observed duration). Longest 2.117s, 1.583–3.700s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.517/10.517 | 100.0% complete | 4/3 | 0.285 | 1.521 | 1.046 | 159.912 | 15.519 / 26.502 / 57.127 / 116.671 |
| 2 | 10.517/10.517 | 100.0% complete | 6/6 | 0.571 | 1.426 | 1.046 | 171.296 | 21.076 / 35.780 / 60.036 / 90.307 |
| 3 | 10.508/10.508 | 100.0% complete | 6/6 | 0.571 | 1.427 | 1.427 | 155.020 | 14.251 / 24.594 / 65.709 / 107.525 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 1} | 0.318 |
| 2 | 4 | {'timed_armor_gate:open': 45} | 0.403 |
| 3 | 1 | {'timed_armor_gate:open': 7} | 0.080 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase base (2.117s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/base: longest 2.117s at 1.583–3.700s; total equal 2.117s / observed 9.467s; major60 reversals 2; active-end alive True
- m02 bellows-question-answer/alternate: longest 1.075s at 10.767–11.842s; total equal 1.075s / observed 8.208s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/finish-checks/full-4402`; exact file/runtime/controller digests in JSON.

## macro-5701

death; observed 58.292s / intended 120.000s; horizon 120.000s. Spatial finish 17900.00px (routeMarks[id=finish].x); rendering width 24000.00px; time after spatial finish 0.000s.
Equal-cadence union 17.725s (30.4% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 40.000/40.000 | 100.0% complete | 14/13 | 0.325 | 1.500 | 0.925 | 157.561 | 15.123 / 29.528 / 54.416 / 91.635 |
| 2 | 18.292/40.000 | 45.7% death | 7/7 | 0.383 | 1.640 | 0.929 | 167.051 | -0.080 / 26.377 / 56.407 / 82.334 |
| 3 | 0.000/40.000 | 0.0% unreached-death | 0/0 | — | — | — | — | — / — / — / — |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 6 | {'timed_armor_gate:open': 54} | 0.353 |
| 2 | 3 | {'laser_scanner:active': 55, 'timed_armor_gate:open': 11} | -1.270 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m05 tidal-staircase/alternate: longest 2.808s at 28.550–31.358s; total equal 6.000s / observed 10.367s; major60 reversals 2; active-end alive True
- m09 light-cavity/alternate: longest 2.158s at 55.592–57.750s; total equal 2.158s / observed 3.983s; major60 reversals 2; active-end alive False
- m07 cloister/base: longest 1.792s at 41.908–43.700s; total equal 2.867s / observed 6.500s; major60 reversals 3; active-end alive True
- m02 bellows-question-answer/alternate: longest 1.075s at 12.000–13.075s; total equal 1.075s / observed 8.208s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/finish-checks/macro-5701`; exact file/runtime/controller digests in JSON.

## macro-5703

native-win; observed 120.000s / intended 120.000s; horizon 120.000s. Spatial finish 17871.38px (routeMarks[id=finish].x); rendering width 24000.00px; time after spatial finish 1.250s.
Equal-cadence union 35.308s (29.4% of observed duration). Longest 4.217s, 102.217–106.433s, 6 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 40.000/40.000 | 100.0% complete | 15/14 | 0.350 | 1.500 | 1.000 | 156.335 | 8.075 / 30.532 / 55.725 / 97.675 |
| 2 | 40.000/40.000 | 100.0% complete | 17/17 | 0.425 | 1.500 | 1.075 | 160.638 | 4.119 / 31.437 / 59.954 / 90.912 |
| 3 | 40.000/40.000 | 100.0% complete | 13/13 | 0.325 | 1.550 | 0.900 | 156.883 | 6.966 / 27.712 / 53.588 / 96.336 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 11 | {'laser_scanner:active': 55, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 78} | 0.318 |
| 2 | 15 | {'laser_scanner:active': 143, 'laser_scanner:cooldown': 15, 'timed_armor_gate:closing': 26, 'timed_armor_gate:open': 98} | 0.388 |
| 3 | 5 | {'laser_scanner:active': 79, 'laser_scanner:cooldown': 15, 'timed_armor_gate:closing': 25, 'timed_armor_gate:open': 41} | -1.270 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m18 tidal-staircase alternate (4.217s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m18 tidal-staircase/alternate: longest 4.217s at 102.217–106.433s; total equal 6.325s / observed 9.800s; major60 reversals 2; active-end alive True
- m03 tidal-staircase/alternate: longest 3.517s at 12.592–16.108s; total equal 3.517s / observed 10.433s; major60 reversals 2; active-end alive True
- m15 tidal-staircase/alternate: longest 2.808s at 84.875–87.683s; total equal 4.917s / observed 10.667s; major60 reversals 3; active-end alive True
- m19 light-cavity/alternate: longest 2.700s at 113.458–116.158s; total equal 2.700s / observed 6.000s; major60 reversals 3; active-end alive True
- m11 light-cavity/alternate: longest 2.167s at 63.225–65.392s; total equal 2.167s / observed 5.800s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/four-loops/B4/finish-checks/macro-5703`; exact file/runtime/controller digests in JSON.
