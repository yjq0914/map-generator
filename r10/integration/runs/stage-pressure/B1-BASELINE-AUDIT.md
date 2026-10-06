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
