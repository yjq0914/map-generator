# Baseline: realized pressure dimensions and cadence repetition

The evaluator is frozen in EVALUATOR-FREEZE.json before the first candidate trace. These observations read saved evidence only; no physics ran. R7-FROZEN-AUDIT is the definitive baseline; R7-BASELINE-AUDIT is a preserved pre-freeze draft whose laser horizontal band omitted half beam width.

## Strongest useful gaps

- The 120s macro5703 does not show one clear, uniformly rising three-stage load. Its native 40s thirds have flap rate 1.50/1.50/1.55s^-1, major 60px reversals 14/17/13, y travel 156.34/160.64/156.88px/s, and sampled clearance medians 55.72/59.95/53.59px. These are different descriptive axes, not a combined pressure score.

- Timing mix changes even with almost constant flap frequency: saved horizontal-occupancy laser-active frames 57/145/80 across the three stages, gate-closing 13/26/25. Counts are saved body/source frames, not reaction time or unique seconds; multiple bodies can overlap. Thus counting clicks alone misses actual changes in temporal mechanism exposure.

- macro5703 has 35.308s (29.42%) of observed time inside runs of at least 3 near-equal flap intervals. Longest 4.217s at 102.217–106.433s is m18 tidal-staircase/alternate, 6 intervals of 84–85ticks, with 52.79px actual y range. This is a clear repeated shallow-cycle source, although cadence regularity alone is not a fun verdict.

- New B1 baselines: longest-run median 2.8125s, max 3.5167s; equal-run union share median 24.40%. 701/702/704 tidal-alt runs are 3.5167s with 52.78px y range ; 708 tidal-base is 2.8083s with 53.39px range. These are concrete module-local targets for testing an action relation rather than merely editing metadata.

- Counterexample to equating regularity with monotony: 703/706 have light-cavity equal runs 2.158/2.167s with 159.54/158.27px y range. Equal-frequency clicks there accompany substantial movement. Preserve this distinction when reviewing an intervention.

- Only 1/8 new B1 baselines completes its intended final third. Two die at 29.85s and 28.108s; five surviving prefixes stop at 30s before their native endpoint. Report partial third-stage coverage and compare compatible observations, not the death-shortened lifespan. The failed long macro5701 provides only 40s of stage 1 and 18.292s of stage 2; stage 3 remains unobserved.

## Broader pressure interpretation

Pressure may come from precision, frequency, timing, anticipation/choice, carried-state control or sustained load/recovery; they need not rise together. Low-frequency precise timing can be demanding. The native audit measures frequency, movement, sampled proximity, saved gate/laser phase, module entry/exit y/vy and authored gate-clock reserves. Actual correctable spatial margin, early/late input tolerance, perceptual anticipation/choice burden, sustained mental load and subjective pressure remain UNKNOWN without appropriate perturbations or human evidence. No extra experiment matrix is implied.

Descriptor-derived full-body gate reserves are not input timing windows. A negative fully-open reserve can coexist with a successful passage during opening/closing and does not itself indicate collision. Sampled clearance is neither a safety bound nor a correction tolerance.

## Inspection artifacts

- baseline-profiles/macro5703-three-stage-profile.png: primary planned-time thirds, confirmed major movement and equal-run spans
- baseline-profiles/equal-cadence-different-movement.png: regular tidal tapping versus regular light ascent, with observed y ranges

- baseline-profiles/macro-5703-action-profile.png: full 120s native y/vy, clearance and flap marks
- baseline-profiles/macro-5701-action-profile.png: 58.292s failure, later stages unobserved
- baseline-profiles/baseline-701-action-profile.png: repeated shallow tidal tapping
- baseline-profiles/baseline-703-action-profile.png: equal cadence with large light ascent, then failure
- baseline-profiles/baseline-706-action-profile.png: another light-ascent/death case
- baseline-profiles/holdout-4408-action-profile.png: prior 20.725s heldout laser death

Profiles show native states, authored targets distinctly dashed, and recorded 0.1s clearance, with exact map/trace/runtime digests in adjacent JSON. They do not rerun physics.

## Commands

python3 -m unittest discover -s integration/tests -p test_stage_pressure_audit.py -v

python3 integration/audit_stage_pressure.py integration/runs/stage-pressure/B1/runs/candidate-* --out NEW.json --report NEW.md

Output destinations must be new; baseline evidence and evaluator definitions are not overwritten.
