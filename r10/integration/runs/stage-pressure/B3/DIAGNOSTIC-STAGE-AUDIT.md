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
| integration/runs/stage-pressure/B3/diagnostics/full | 1 | 1 / 1 / 1 | 1.650 | 153.919 | 0.183 | 53.467 |
| integration/runs/stage-pressure/B3/diagnostics/full | 2 | 1 / 1 / 1 | 1.468 | 161.666 | 0.459 | 61.196 |
| integration/runs/stage-pressure/B3/diagnostics/full | 3 | 1 / 1 / 1 | 1.376 | 164.712 | 0.550 | 59.335 |
| integration/runs/stage-pressure/B3/diagnostics/known | 1 | 1 / 1 / 1 | 1.523 | 148.658 | 0.381 | 59.912 |
| integration/runs/stage-pressure/B3/diagnostics/known | 2 | 1 / 1 / 1 | 1.619 | 161.840 | 0.476 | 51.007 |
| integration/runs/stage-pressure/B3/diagnostics/known | 3 | 1 / 1 / 1 | 1.429 | 158.750 | 0.286 | 55.316 |

## known-laser-6206-r10

native-win; observed 31.508s / intended 31.508s; horizon 31.517s. Spatial finish 4785.47px (map.width); rendering width 4785.47px; time after spatial finish 0.000s.
Equal-cadence union 3.775s (12.0% of observed duration). Longest 2.700s, 25.933–28.633s, 5 intervals, 64–65ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.508/10.508 | 100.0% complete | 5/4 | 0.381 | 1.523 | 1.142 | 148.658 | 18.017 / 30.815 / 59.912 / 99.123 |
| 2 | 10.500/10.500 | 100.0% complete | 5/5 | 0.476 | 1.619 | 1.333 | 161.840 | 9.619 / 20.177 / 51.007 / 76.570 |
| 3 | 10.500/10.500 | 100.0% complete | 3/3 | 0.286 | 1.429 | 0.857 | 158.750 | 10.069 / 25.081 / 55.316 / 93.158 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 1 | {'timed_armor_gate:open': 8} | 0.080 |
| 2 | 2 | {'timed_armor_gate:open': 14} | 0.368 |
| 3 | 5 | {'laser_scanner:active': 43, 'laser_scanner:cooldown': 9, 'timed_armor_gate:closing': 17, 'timed_armor_gate:open': 29} | -0.387 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m05 light-cavity base (2.700s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m05 light-cavity/base: longest 2.700s at 25.933–28.633s; total equal 2.700s / observed 5.467s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 18.675–19.750s; total equal 1.075s / observed 7.608s; major60 reversals 3; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/diagnostics/known-laser-6206-r10`; exact file/runtime/controller digests in JSON.

## full-tail-708-r10

native-win; observed 32.708s / intended 32.708s; horizon 32.717s. Spatial finish 4965.47px (map.width); rendering width 4965.47px; time after spatial finish 0.000s.
Equal-cadence union 6.700s (20.5% of observed duration). Longest 3.517s, 1.583–5.100s, 5 intervals, 84–85ticks.

| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10.908/10.908 | 100.0% complete | 3/2 | 0.183 | 1.650 | 0.825 | 153.919 | 15.769 / 30.791 / 53.467 / 111.752 |
| 2 | 10.900/10.900 | 100.0% complete | 5/5 | 0.459 | 1.468 | 1.284 | 161.666 | 13.092 / 36.382 / 61.196 / 80.282 |
| 3 | 10.900/10.900 | 100.0% complete | 6/6 | 0.550 | 1.376 | 1.101 | 164.712 | 15.782 / 35.705 / 59.335 / 88.909 |

| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |
|---:|---:|---|---:|
| 1 | 0 | {} | — |
| 2 | 0 | {} | — |
| 3 | 5 | {'timed_armor_gate:closing': 4, 'timed_armor_gate:open': 32} | 0.318 |
Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.

Longest-run sources: m01 tidal-staircase alternate (3.517s overlap)

Top module-local equal-cadence sources (module slicing may split a cross-module run):
- m01 tidal-staircase/alternate: longest 3.517s at 1.583–5.100s; total equal 5.625s / observed 10.667s; major60 reversals 2; active-end alive True
- m04 bellows-question-answer/base: longest 1.075s at 23.575–24.650s; total equal 1.075s / observed 7.342s; major60 reversals 2; active-end alive True

Evidence: `integration/runs/stage-pressure/B3/diagnostics/full-tail-708-r10`; exact file/runtime/controller digests in JSON.
