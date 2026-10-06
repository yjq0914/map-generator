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
| integration/runs/stage-pressure/B1/runs/baseline | 1 | 8 / 8 / 8 | 1.573 | 154.197 | 0.236 | 58.306 |
| integration/runs/stage-pressure/B1/runs/baseline | 2 | 8 / 8 / 8 | 1.525 | 158.436 | 0.431 | 52.612 |
| integration/runs/stage-pressure/B1/runs/baseline | 3 | 8 / 1 / 8 | 1.700 | 159.319 | 0.400 | 63.917 |
| integration/runs/stage-pressure/B1/runs/candidate | 1 | 8 / 7 / 8 | 1.643 | 154.110 | 0.276 | 53.467 |
| integration/runs/stage-pressure/B1/runs/candidate | 2 | 6 / 6 / 8 | 1.531 | 159.899 | 0.475 | 53.048 |
| integration/runs/stage-pressure/B1/runs/candidate | 3 | 6 / 0 / 8 | — | — | — | — |
| integration/runs/stage-pressure/B1/runs/holdout | 1 | 8 / 8 / 8 | 1.552 | 158.051 | 0.242 | 60.125 |
| integration/runs/stage-pressure/B1/runs/holdout | 2 | 8 / 8 / 8 | 1.594 | 159.099 | 0.478 | 52.669 |
| integration/runs/stage-pressure/B1/runs/holdout | 3 | 8 / 0 / 8 | — | — | — | — |

## baseline-701

alive-prefix-only; observed 30.000s / intended 30.542s; horizon 30.000s. Spatial finish 4640.47px (map.width); rendering width 4640.47px; time after spatial finish 0.000s.
Equal-cadence union 9.567s (31.9% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.183/10.183 | 100.0% complete | 3/2 | 0.196 | 1.571 | 0.687 | 154.183 | 22.274 / 35.203 / 62.192 / 124.089 |
| 2 | 10.183/10.183 | 100.0% complete | 6/6 | 0.589 | 1.375 | 0.982 | 170.431 | 23.656 / 37.123 / 65.487 / 95.996 |
| 3 | 9.633/10.175 | 94.7% alive-prefix-only | 4/4 | 0.415 | 1.765 | 1.038 | 165.254 | 11.656 / 28.707 / 62.757 / 86.644 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 5 | {'timed_armor_gate:open': 34} | 0.488 |
| 3 | 0 | {'timed_armor_gate:open': 6} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 cloister/base: longest 1.433s at 23.267–24.700s; total equal 2.508s / observed 6.500s; major60 reversals 3; active-end alive True
- m02 bellows-question-answer/base: longest 1.075s at 12.000–13.075s; total equal 1.075s / observed 8.008s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-701`; exact file/runtime/controller digests in JSON.

## baseline-702

alive-prefix-only; observed 30.000s / intended 30.775s; horizon 30.000s. Spatial finish 4675.47px (map.width); rendering width 4675.47px; time after spatial finish 0.000s.
Equal-cadence union 3.517s (11.7% of observed duration). Longest 3.517s, 15.983–19.500s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.258/10.258 | 100.0% complete | 4/3 | 0.292 | 1.560 | 1.072 | 157.808 | 19.374 / 36.974 / 70.293 / 197.000 |
| 2 | 10.258/10.258 | 100.0% complete | 3/3 | 0.292 | 1.560 | 0.975 | 150.617 | 21.100 / 31.345 / 53.415 / 87.433 |
| 3 | 9.483/10.258 | 92.4% alive-prefix-only | 4/4 | 0.422 | 1.371 | 1.265 | 163.710 | 11.647 / 18.835 / 51.048 / 84.454 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 4 | {'timed_armor_gate:open': 29} | 0.403 |
| 2 | 0 | {} | — |
| 3 | 1 | {'timed_armor_gate:open': 10} | 0.080 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m03 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 tidal-staircase/alternate: longest 3.517s at 15.983–19.500s; total equal 3.517s / observed 10.367s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-702`; exact file/runtime/controller digests in JSON.

## baseline-703

death; observed 29.850s / intended 32.717s; horizon 30.000s. Spatial finish 4967.47px (map.width); rendering width 4967.47px; time after spatial finish 0.000s.
Equal-cadence union 9.575s (32.1% of observed duration). Longest 2.158s, 27.150–29.308s, 4 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.908/10.908 | 100.0% complete | 4/3 | 0.275 | 1.650 | 1.283 | 154.211 | 16.274 / 29.028 / 57.721 / 186.500 |
| 2 | 10.908/10.908 | 100.0% complete | 3/3 | 0.275 | 1.375 | 1.008 | 158.627 | 7.031 / 24.201 / 50.091 / 80.350 |
| 3 | 8.033/10.900 | 73.7% death | 3/3 | 0.373 | 1.618 | 0.747 | 154.396 | -0.546 / 12.010 / 45.561 / 71.537 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 4 | {'timed_armor_gate:open': 29} | 0.323 |
| 2 | 1 | {'timed_armor_gate:open': 8} | 0.080 |
| 3 | 3 | {'laser_scanner:active': 45, 'timed_armor_gate:open': 12} | -1.270 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 light-cavity base (2.158s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 light-cavity/base: longest 2.158s at 27.150–29.308s; total equal 2.158s / observed 4.200s; major60 reversals 2; active-end alive False
- m02 slider-island/base: longest 2.117s at 10.725–12.842s; total equal 2.117s / observed 5.800s; major60 reversals 2; active-end alive True
- m04 tidal-staircase/base: longest 2.117s at 17.375–19.492s; total equal 5.300s / observed 9.233s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-703`; exact file/runtime/controller digests in JSON.

## baseline-704

alive-prefix-only; observed 30.000s / intended 32.400s; horizon 30.000s. Spatial finish 4919.97px (map.width); rendering width 4919.97px; time after spatial finish 0.000s.
Equal-cadence union 6.700s (22.3% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.800/10.800 | 100.0% complete | 3/2 | 0.185 | 1.574 | 0.741 | 153.056 | 15.769 / 30.639 / 53.122 / 114.211 |
| 2 | 10.800/10.800 | 100.0% complete | 5/5 | 0.463 | 1.574 | 1.204 | 171.825 | 15.909 / 40.252 / 65.679 / 95.511 |
| 3 | 8.400/10.800 | 77.8% alive-prefix-only | 3/3 | 0.357 | 1.667 | 1.310 | 157.595 | 20.976 / 29.641 / 56.861 / 77.922 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 1 | {'timed_armor_gate:open': 7} | 0.080 |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m03 cloister/base: longest 1.075s at 17.333–18.408s; total equal 1.075s / observed 6.333s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-704`; exact file/runtime/controller digests in JSON.

## baseline-705

alive-prefix-only; observed 30.000s / intended 30.442s; horizon 30.000s. Spatial finish 4625.47px (map.width); rendering width 4625.47px; time after spatial finish 0.000s.
Equal-cadence union 6.325s (21.1% of observed duration). Longest 2.108s, 5.058–7.167s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.150/10.150 | 100.0% complete | 4/3 | 0.296 | 1.576 | 0.985 | 158.602 | 22.374 / 40.280 / 68.202 / 198.500 |
| 2 | 10.150/10.150 | 100.0% complete | 3/3 | 0.296 | 1.478 | 1.084 | 148.075 | 18.315 / 33.460 / 58.387 / 88.326 |
| 3 | 9.700/10.142 | 95.6% alive-prefix-only | 2/2 | 0.206 | 1.443 | 0.928 | 165.992 | 11.243 / 30.744 / 58.028 / 87.895 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 4 | {'timed_armor_gate:open': 35} | 0.503 |
| 2 | 0 | {} | — |
| 3 | 1 | {'timed_armor_gate:open': 9} | 0.080 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 bellows-question-answer alternate (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 bellows-question-answer/alternate: longest 2.108s at 5.058–7.167s; total equal 2.108s / observed 9.908s; major60 reversals 2; active-end alive True
- m03 tidal-staircase/base: longest 2.108s at 16.683–18.792s; total equal 4.217s / observed 9.167s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-705`; exact file/runtime/controller digests in JSON.

## baseline-706

death; observed 28.108s / intended 30.975s; horizon 30.000s. Spatial finish 4705.47px (map.width); rendering width 4705.47px; time after spatial finish 0.000s.
Equal-cadence union 7.442s (26.5% of observed duration). Longest 2.167s, 25.400–27.567s, 4 intervals, 65–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.325/10.325 | 100.0% complete | 4/3 | 0.291 | 1.550 | 0.872 | 152.222 | 24.126 / 32.149 / 58.891 / 86.563 |
| 2 | 10.325/10.325 | 100.0% complete | 6/6 | 0.581 | 1.550 | 1.259 | 158.012 | 15.314 / 23.639 / 50.030 / 82.711 |
| 3 | 7.458/10.325 | 72.2% death | 1/1 | 0.134 | 1.475 | 0.939 | 153.555 | -0.642 / 28.929 / 55.786 / 85.603 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'timed_armor_gate:open': 19} | 0.318 |
| 3 | 5 | {'laser_scanner:active': 57, 'timed_armor_gate:open': 30} | 0.388 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 light-cavity alternate (2.167s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 light-cavity/alternate: longest 2.167s at 25.400–27.567s; total equal 2.167s / observed 3.667s; major60 reversals 1; active-end alive False
- m02 tidal-staircase/base: longest 2.117s at 6.900–9.017s; total equal 2.117s / observed 9.167s; major60 reversals 3; active-end alive True
- m01 slider-island/base: longest 2.083s at 1.683–3.767s; total equal 2.083s / observed 5.700s; major60 reversals 1; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 18.158–19.233s; total equal 1.075s / observed 7.275s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-706`; exact file/runtime/controller digests in JSON.

## baseline-707

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
| 2 | 3 | {'laser_scanner:active': 38, 'timed_armor_gate:open': 4} | -1.270 |
| 3 | 0 | {'laser_scanner:active': 8, 'laser_scanner:cooldown': 8, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 12} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (2.817s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 2.817s at 7.550–10.367s; total equal 4.917s / observed 10.367s; major60 reversals 2; active-end alive True
- m03 light-cavity/base: longest 2.158s at 18.058–20.217s; total equal 2.158s / observed 6.000s; major60 reversals 3; active-end alive True
- m04 cloister/alternate: longest 1.075s at 22.467–23.542s; total equal 2.150s / observed 6.467s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-707`; exact file/runtime/controller digests in JSON.

## baseline-708

alive-prefix-only; observed 30.000s / intended 32.508s; horizon 30.000s. Spatial finish 4935.44px (map.width); rendering width 4935.44px; time after spatial finish 0.000s.
Equal-cadence union 5.992s (20.0% of observed duration). Longest 2.808s, 6.925–9.733s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.842/10.842 | 100.0% complete | 3/2 | 0.184 | 1.476 | 0.830 | 158.439 | 18.017 / 30.499 / 52.949 / 96.359 |
| 2 | 10.833/10.833 | 100.0% complete | 5/5 | 0.462 | 1.662 | 1.385 | 158.246 | 13.447 / 22.110 / 51.808 / 79.766 |
| 3 | 8.325/10.833 | 76.8% alive-prefix-only | 5/5 | 0.601 | 1.201 | 0.841 | 176.278 | 29.274 / 39.431 / 62.108 / 86.431 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 2 | {'timed_armor_gate:open': 15} | 0.199 |
| 3 | 4 | {'timed_armor_gate:open': 32} | 0.403 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase base (2.808s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/base: longest 2.808s at 6.925–9.733s; total equal 4.917s / observed 9.167s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 21.183–22.258s; total equal 1.075s / observed 7.375s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/baseline-708`; exact file/runtime/controller digests in JSON.

## candidate-701

alive-prefix-only; observed 30.000s / intended 31.042s; horizon 30.000s. Spatial finish 4715.50px (map.width); rendering width 4715.50px; time after spatial finish 0.000s.
Equal-cadence union 9.167s (30.6% of observed duration). Longest 2.808s, 7.992–10.800s, 4 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.350/10.350 | 100.0% complete | 5/4 | 0.386 | 1.643 | 0.870 | 153.583 | 13.529 / 47.835 / 67.503 / 131.531 |
| 2 | 10.350/10.350 | 100.0% complete | 6/6 | 0.580 | 1.546 | 1.159 | 161.842 | 14.940 / 29.138 / 51.121 / 77.649 |
| 3 | 9.300/10.342 | 89.9% alive-prefix-only | 3/3 | 0.323 | 1.505 | 0.968 | 166.116 | 23.251 / 37.043 / 65.660 / 97.772 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 37} | 0.503 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 slider-island base (2.808s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 slider-island/base: longest 2.808s at 7.992–10.800s; total equal 2.808s / observed 5.500s; major60 reversals 3; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.108s at 27.692–29.800s; total equal 3.183s / observed 8.608s; major60 reversals 3; active-end alive True
- m03 tidal-staircase/base: longest 2.100s at 17.017–19.117s; total equal 2.100s / observed 9.000s; major60 reversals 5; active-end alive True
- m01 cloister/base: longest 1.075s at 4.900–5.975s; total equal 1.075s / observed 6.867s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-701`; exact file/runtime/controller digests in JSON.

## candidate-702

alive-prefix-only; observed 30.000s / intended 31.642s; horizon 30.000s. Spatial finish 4805.47px (map.width); rendering width 4805.47px; time after spatial finish 0.000s.
Equal-cadence union 1.075s (3.6% of observed duration). Longest 1.075s, 24.317–25.392s, 3 intervals, 43–43ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.550/10.550 | 100.0% complete | 4/3 | 0.284 | 1.611 | 1.232 | 159.315 | 18.017 / 30.815 / 61.859 / 97.534 |
| 2 | 10.550/10.550 | 100.0% complete | 4/4 | 0.379 | 1.517 | 1.232 | 151.391 | 14.422 / 22.422 / 54.704 / 73.131 |
| 3 | 8.900/10.542 | 84.4% alive-prefix-only | 5/5 | 0.562 | 1.573 | 1.236 | 167.969 | 22.249 / 33.344 / 59.030 / 89.917 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 5 | {'timed_armor_gate:open': 33} | 0.388 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 bellows-question-answer base (1.075s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 bellows-question-answer/base: longest 1.075s at 24.317–25.392s; total equal 1.075s / observed 6.700s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-702`; exact file/runtime/controller digests in JSON.

## candidate-703

death; observed 10.867s / intended 32.583s; horizon 30.000s. Spatial finish 4947.47px (map.width); rendering width 4947.47px; time after spatial finish 0.000s.
Equal-cadence union 2.083s (19.2% of observed duration). Longest 2.083s, 1.683–3.767s, 3 intervals, 82–84ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.867/10.867 | 100.0% complete | 4/3 | 0.276 | 1.380 | 0.828 | 159.117 | -0.030 / 27.393 / 52.236 / 80.069 |
| 2 | 0.000/10.858 | 0.0% unreached-death | 0/0 | — | — | — | — | — / — / — / — |
| 3 | 0.000/10.858 | 0.0% unreached-death | 0/0 | — | — | — | — | — / — / — / — |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 8} | 0.080 |
| 2 | 0 | {} | — |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 slider-island base (2.083s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 slider-island/base: longest 2.083s at 1.683–3.767s; total equal 2.083s / observed 5.700s; major60 reversals 1; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-703`; exact file/runtime/controller digests in JSON.

## candidate-704

alive-prefix-only; observed 30.000s / intended 32.575s; horizon 30.000s. Spatial finish 4945.47px (map.width); rendering width 4945.47px; time after spatial finish 0.000s.
Equal-cadence union 7.775s (25.9% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.858/10.858 | 100.0% complete | 3/2 | 0.184 | 1.658 | 0.829 | 153.584 | 15.769 / 30.715 / 53.186 / 112.981 |
| 2 | 10.858/10.858 | 100.0% complete | 5/5 | 0.460 | 1.474 | 1.197 | 163.213 | 9.789 / 34.925 / 61.792 / 80.205 |
| 3 | 8.283/10.858 | 76.3% alive-prefix-only | 4/4 | 0.483 | 1.569 | 1.207 | 165.152 | 26.885 / 32.406 / 54.411 / 82.651 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 27} | 0.353 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m02 cloister/base: longest 1.075s at 14.567–15.642s; total equal 1.075s / observed 5.867s; major60 reversals 2; active-end alive True
- m05 bellows-question-answer/base: longest 1.075s at 25.550–26.625s; total equal 1.075s / observed 5.767s; major60 reversals 3; active-end alive False

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-704`; exact file/runtime/controller digests in JSON.

## candidate-705

death; observed 9.533s / intended 30.333s; horizon 30.000s. Spatial finish 4609.97px (map.width); rendering width 4609.97px; time after spatial finish 0.000s.
Equal-cadence union 1.075s (11.3% of observed duration). Longest 1.075s, 4.900–5.975s, 3 intervals, 43–43ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 9.533/10.117 | 94.2% death | 4/3 | 0.315 | 1.573 | 0.839 | 156.569 | 0.000 / 39.628 / 65.000 / 137.934 |
| 2 | 0.000/10.108 | 0.0% unreached-death | 0/0 | — | — | — | — | — / — / — / — |
| 3 | 0.000/10.108 | 0.0% unreached-death | 0/0 | — | — | — | — | — / — / — / — |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 0 | {} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 cloister base (1.075s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 cloister/base: longest 1.075s at 4.900–5.975s; total equal 1.075s / observed 6.867s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-705`; exact file/runtime/controller digests in JSON.

## candidate-706

alive-prefix-only; observed 30.000s / intended 30.442s; horizon 30.000s. Spatial finish 4625.50px (map.width); rendering width 4625.50px; time after spatial finish 0.000s.
Equal-cadence union 7.792s (26.0% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.150/10.150 | 100.0% complete | 3/2 | 0.197 | 1.576 | 0.690 | 154.110 | 15.769 / 30.183 / 52.257 / 121.590 |
| 2 | 10.150/10.150 | 100.0% complete | 5/5 | 0.493 | 1.576 | 1.379 | 158.133 | 11.142 / 27.135 / 51.392 / 78.316 |
| 3 | 9.700/10.142 | 95.6% alive-prefix-only | 2/2 | 0.206 | 1.443 | 0.825 | 158.495 | 10.538 / 24.157 / 54.756 / 91.001 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 2 | {'timed_armor_gate:open': 12} | 0.368 |
| 3 | 5 | {'laser_scanner:active': 56, 'laser_scanner:cooldown': 8, 'timed_armor_gate:closing': 12, 'timed_armor_gate:open': 34} | 0.388 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 light-cavity/alternate: longest 2.167s at 25.275–27.442s; total equal 2.167s / observed 5.467s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-706`; exact file/runtime/controller digests in JSON.

## candidate-707

alive-prefix-only; observed 30.000s / intended 30.650s; horizon 30.000s. Spatial finish 4657.50px (map.width); rendering width 4657.50px; time after spatial finish 0.000s.
Equal-cadence union 4.208s (14.0% of observed duration). Longest 2.108s, 12.517–14.625s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.217/10.217 | 100.0% complete | 4/3 | 0.294 | 1.664 | 1.077 | 161.345 | 9.792 / 24.805 / 60.527 / 132.337 |
| 2 | 10.217/10.217 | 100.0% complete | 5/5 | 0.489 | 1.566 | 1.077 | 153.105 | 3.582 / 16.153 / 46.497 / 85.551 |
| 3 | 9.567/10.217 | 93.6% alive-prefix-only | 3/3 | 0.314 | 1.463 | 1.150 | 164.725 | 18.850 / 26.902 / 50.820 / 79.095 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 29} | 0.323 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 tidal-staircase alternate (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 tidal-staircase/alternate: longest 2.108s at 12.517–14.625s; total equal 2.108s / observed 9.967s; major60 reversals 4; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-707`; exact file/runtime/controller digests in JSON.

## candidate-708

alive-prefix-only; observed 30.000s / intended 32.708s; horizon 30.000s. Spatial finish 4965.47px (map.width); rendering width 4965.47px; time after spatial finish 0.000s.
Equal-cadence union 6.700s (22.3% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.908/10.908 | 100.0% complete | 3/2 | 0.183 | 1.650 | 0.825 | 153.919 | 15.769 / 30.791 / 53.467 / 111.752 |
| 2 | 10.900/10.900 | 100.0% complete | 5/5 | 0.459 | 1.468 | 1.284 | 161.666 | 13.092 / 36.382 / 61.196 / 80.282 |
| 3 | 8.192/10.900 | 75.2% alive-prefix-only | 3/3 | 0.366 | 1.587 | 1.221 | 162.439 | 27.931 / 36.823 / 55.779 / 79.226 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 29} | 0.403 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 23.575–24.650s; total equal 1.075s / observed 7.342s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/candidate-708`; exact file/runtime/controller digests in JSON.

## holdout-6101

alive-prefix-only; observed 30.000s / intended 30.675s; horizon 30.000s. Spatial finish 4660.50px (map.width); rendering width 4660.50px; time after spatial finish 0.000s.
Equal-cadence union 4.258s (14.2% of observed duration). Longest 2.108s, 27.267–29.375s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.225/10.225 | 100.0% complete | 3/2 | 0.196 | 1.467 | 1.076 | 158.115 | 18.869 / 32.472 / 65.222 / 95.212 |
| 2 | 10.225/10.225 | 100.0% complete | 5/5 | 0.489 | 1.663 | 1.174 | 153.795 | 11.006 / 26.758 / 52.975 / 77.769 |
| 3 | 9.550/10.225 | 93.4% alive-prefix-only | 3/3 | 0.314 | 1.466 | 0.942 | 163.324 | 24.368 / 37.965 / 63.713 / 93.053 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 35} | 0.503 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 bellows-question-answer alternate (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 bellows-question-answer/alternate: longest 2.108s at 27.267–29.375s; total equal 3.183s / observed 8.608s; major60 reversals 3; active-end alive True
- m02 cloister/base: longest 1.075s at 10.267–11.342s; total equal 1.075s / observed 6.133s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6101`; exact file/runtime/controller digests in JSON.

## holdout-6102

alive-prefix-only; observed 30.000s / intended 32.108s; horizon 30.000s. Spatial finish 4875.47px (map.width); rendering width 4875.47px; time after spatial finish 0.000s.
Equal-cadence union 6.375s (21.2% of observed duration). Longest 2.117s, 1.583–3.700s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.708/10.708 | 100.0% complete | 3/2 | 0.187 | 1.588 | 1.121 | 149.902 | 15.519 / 27.132 / 57.423 / 114.211 |
| 2 | 10.700/10.700 | 100.0% complete | 5/5 | 0.467 | 1.495 | 1.215 | 166.168 | 10.883 / 35.390 / 62.010 / 76.535 |
| 3 | 8.592/10.700 | 80.3% alive-prefix-only | 4/4 | 0.466 | 1.513 | 1.048 | 163.530 | 29.837 / 35.865 / 57.516 / 84.827 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 35} | 0.403 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase base (2.117s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/base: longest 2.117s at 1.583–3.700s; total equal 2.117s / observed 9.467s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.108s at 26.550–28.658s; total equal 3.183s / observed 8.108s; major60 reversals 2; active-end alive True
- m02 cloister/base: longest 1.075s at 13.367–14.442s; total equal 1.075s / observed 5.867s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6102`; exact file/runtime/controller digests in JSON.

## holdout-6103

death; observed 20.483s / intended 30.050s; horizon 30.000s. Spatial finish 4567.50px (map.width); rendering width 4567.50px; time after spatial finish 0.000s.
Equal-cadence union 4.267s (20.8% of observed duration). Longest 2.158s, 17.783–19.942s, 4 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.017/10.017 | 100.0% complete | 4/3 | 0.300 | 1.597 | 1.098 | 157.988 | 10.341 / 22.344 / 52.449 / 93.012 |
| 2 | 10.017/10.017 | 100.0% complete | 4/4 | 0.399 | 1.597 | 0.998 | 160.789 | 3.818 / 15.540 / 52.008 / 91.834 |
| 3 | 0.450/10.017 | 4.5% death | 0/0 | 0.000 | 0.000 | 0.000 | 94.466 | -0.610 / 5.598 / 27.284 / 32.323 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 3 | {'laser_scanner:active': 50, 'timed_armor_gate:open': 7} | -1.270 |
| 3 | 0 | {'laser_scanner:active': 6, 'timed_armor_gate:open': 5} | — |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m03 light-cavity alternate (2.158s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 light-cavity/alternate: longest 2.158s at 17.783–19.942s; total equal 2.158s / observed 4.183s; major60 reversals 2; active-end alive False
- m02 tidal-staircase/alternate: longest 2.108s at 11.992–14.100s; total equal 2.108s / observed 10.200s; major60 reversals 4; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6103`; exact file/runtime/controller digests in JSON.

## holdout-6104

alive-prefix-only; observed 30.000s / intended 30.275s; horizon 30.000s. Spatial finish 4600.50px (map.width); rendering width 4600.50px; time after spatial finish 0.000s.
Equal-cadence union 3.183s (10.6% of observed duration). Longest 2.108s, 27.208–29.317s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.092/10.092 | 100.0% complete | 3/2 | 0.198 | 1.486 | 1.090 | 158.918 | 18.017 / 30.625 / 63.310 / 93.012 |
| 2 | 10.092/10.092 | 100.0% complete | 5/5 | 0.495 | 1.685 | 1.189 | 155.956 | 9.430 / 18.699 / 46.349 / 72.394 |
| 3 | 9.817/10.092 | 97.3% alive-prefix-only | 3/3 | 0.306 | 1.426 | 1.019 | 161.463 | 20.643 / 33.791 / 62.965 / 89.975 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 35} | 0.403 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 bellows-question-answer alternate (2.000s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m02 cloister/base: longest 1.075s at 10.267–11.342s; total equal 1.075s / observed 6.133s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6104`; exact file/runtime/controller digests in JSON.

## holdout-6105

alive-prefix-only; observed 30.000s / intended 31.308s; horizon 30.000s. Spatial finish 4755.47px (map.width); rendering width 4755.47px; time after spatial finish 0.000s.
Equal-cadence union 3.942s (13.1% of observed duration). Longest 1.792s, 10.000–11.792s, 5 intervals, 43–43ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.442/10.442 | 100.0% complete | 6/5 | 0.479 | 1.532 | 1.245 | 161.067 | 11.967 / 23.620 / 61.581 / 94.876 |
| 2 | 10.433/10.433 | 100.0% complete | 4/4 | 0.383 | 1.725 | 1.054 | 157.588 | 7.099 / 31.195 / 60.415 / 83.192 |
| 3 | 9.125/10.433 | 87.5% alive-prefix-only | 3/3 | 0.329 | 1.425 | 1.096 | 168.480 | 23.742 / 34.013 / 57.904 / 97.193 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 10} | 0.080 |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 27} | 0.503 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m02 spring-reception alternate (0.333s overlap); m03 cloister alternate (1.458s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m03 cloister/alternate: longest 1.433s at 10.358–11.792s; total equal 2.508s / observed 6.667s; major60 reversals 3; active-end alive True
- m05 bellows-question-answer/base: longest 1.075s at 23.650–24.725s; total equal 1.075s / observed 7.500s; major60 reversals 2; active-end alive False

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6105`; exact file/runtime/controller digests in JSON.

## holdout-6106

alive-prefix-only; observed 30.000s / intended 31.442s; horizon 30.000s. Spatial finish 4775.47px (map.width); rendering width 4775.47px; time after spatial finish 0.000s.
Equal-cadence union 2.700s (9.0% of observed duration). Longest 2.700s, 18.800–21.500s, 5 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.483/10.483 | 100.0% complete | 4/3 | 0.286 | 1.622 | 1.145 | 147.845 | 18.017 / 30.777 / 60.280 / 99.271 |
| 2 | 10.483/10.483 | 100.0% complete | 6/6 | 0.572 | 1.526 | 1.145 | 164.693 | 9.619 / 20.014 / 52.364 / 76.055 |
| 3 | 9.033/10.475 | 86.2% alive-prefix-only | 3/3 | 0.332 | 1.439 | 0.996 | 159.463 | 1.245 / 24.256 / 52.968 / 89.438 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 8} | 0.080 |
| 2 | 3 | {'laser_scanner:active': 48, 'timed_armor_gate:open': 5} | -1.270 |
| 3 | 4 | {'laser_scanner:active': 9, 'laser_scanner:cooldown': 7, 'timed_armor_gate:closing': 13, 'timed_armor_gate:open': 39} | 0.403 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 light-cavity alternate (2.700s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 light-cavity/alternate: longest 2.700s at 18.800–21.500s; total equal 2.700s / observed 6.000s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6106`; exact file/runtime/controller digests in JSON.

## holdout-6107

alive-prefix-only; observed 30.000s / intended 32.050s; horizon 30.000s. Spatial finish 4867.44px (map.width); rendering width 4867.44px; time after spatial finish 0.000s.
Equal-cadence union 6.000s (20.0% of observed duration). Longest 2.108s, 26.542–28.650s, 3 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.683/10.683 | 100.0% complete | 5/4 | 0.374 | 1.404 | 0.936 | 169.423 | 12.250 / 23.867 / 59.970 / 94.190 |
| 2 | 10.683/10.683 | 100.0% complete | 6/6 | 0.562 | 1.591 | 0.936 | 160.543 | 3.296 / 14.788 / 47.736 / 95.548 |
| 3 | 8.633/10.683 | 80.8% alive-prefix-only | 3/3 | 0.347 | 1.622 | 1.274 | 156.682 | 19.398 / 27.493 / 52.589 / 80.731 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 10} | 0.080 |
| 2 | 0 | {} | — |
| 3 | 4 | {'timed_armor_gate:open': 35} | 0.323 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m04 bellows-question-answer alternate (2.108s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m04 bellows-question-answer/alternate: longest 2.108s at 26.542–28.650s; total equal 2.108s / observed 8.050s; major60 reversals 3; active-end alive True
- m03 tidal-staircase/alternate: longest 2.100s at 16.525–18.625s; total equal 3.533s / observed 10.500s; major60 reversals 5; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6107`; exact file/runtime/controller digests in JSON.

## holdout-6108

alive-prefix-only; observed 30.000s / intended 30.508s; horizon 30.000s. Spatial finish 4635.47px (map.width); rendering width 4635.47px; time after spatial finish 0.000s.
Equal-cadence union 10.592s (35.3% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.175/10.175 | 100.0% complete | 3/2 | 0.197 | 1.572 | 0.688 | 154.157 | 15.769 / 30.183 / 52.257 / 121.590 |
| 2 | 10.167/10.167 | 100.0% complete | 4/4 | 0.393 | 1.574 | 1.180 | 157.656 | 8.952 / 19.996 / 53.132 / 82.530 |
| 3 | 9.658/10.167 | 95.0% alive-prefix-only | 3/3 | 0.311 | 1.553 | 1.035 | 165.931 | 22.571 / 36.210 / 57.033 / 83.923 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 1 | {'timed_armor_gate:open': 9} | 0.080 |
| 3 | 4 | {'timed_armor_gate:open': 35} | 0.403 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/alternate: longest 2.108s at 27.167–29.275s; total equal 3.183s / observed 7.942s; major60 reversals 2; active-end alive True
- m03 slider-island/base: longest 1.075s at 15.650–16.725s; total equal 1.075s / observed 6.333s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B1/runs/holdout-6108`; exact file/runtime/controller digests in JSON.
