# Experimental combo-driven map generator

Six callable relational families now produce actual native maps. This first integration batch is **frozen**: four targeted short maps completed, while both120-second checks failed early. No broad playability, calibrated difficulty, rhythm quality or human-fun qualification is claimed. See `REPORT.zh-CN.md` and `FINAL-SUMMARY.json`.

## Requirements
- Python3.10+ and Node20+ for generation, validation and the local player runtime
- Python generation uses only the standard library; Matplotlib is needed only to regenerate PNG evidence
- No network, paid service, remote dependency or website deployment is required

Run commands from the package/repository root (the directory containing `candidate_generate.py` and `integration/`).

## List the6 callable families

```sh
python3 integration/generator.py --list-families
```

The integration catalog wraps4 frozen providers and2 new source-linked rule emitters. It does not promote candidate records or rewrite the historical qualified-family index.

## Generate a tested-request short map

```sh
python3 integration/generator.py --experimental --revision 3 \
  --seed 708 --duration 31.5 --difficulty medium --theme foundry \
  --families cloister,slider-island,spring-reception,tidal-staircase \
  --out /tmp/combo-new-708.json
```

This exact request reproduces the saved new-708 map (actual31.6667s). The output path must not already exist. Qualification is still experimental: a successful saved controller is not a safe input-state range.

Omit `--families` to select from all6 families. Other themes are `arcade` and `signal`; difficulty recipes are `easy`, `medium`, `hard`. `--holdout` labels a new-seed scenario and biases the discrete variant choice; it is not proof the scenario is statistically independent. Requested actions are supported by the Python `build(..., actions=[...])` API; unmet verbs are disclosed in `integration.plan.unmatched_requested_actions`.

The ordinary runtime supports at most5000px/40 descriptors. Therefore actual short requests are30..32.9s, inside the requested30–40s band; the compiler refuses unsupported durations rather than silently truncate a phrase. `--duration 120` uses the canonical timed-course world with one continuous state, at most384 bodies and an absolute14400tick finish. There is currently no passing120s evidence.

## Inspect a generated map without running physics

```sh
node -e "require('./integration/vendor/flappy-runtime.js');const m=require('/tmp/combo-new-708.json');console.log(global.FlappyRuntime.validate(m),m.integration.plan)"
```

## Reproduce the short evidence, if you choose to run another trajectory

```sh
node integration/diagnostic.cjs --map /tmp/combo-new-708.json \
  --mode relational-source-v3 --horizon 31.6666666666667 \
  --id local-708 --out /tmp/combo-local-708-run
```

The output directory must be new. This performs a **new** native run; the delivered batch has already stopped. The diagnostic knows the authored route and spring geometry. It is an existence controller, not a first-sight or human-control model.

## Play the saved actual maps

Open `integration/player.html` in a browser, then choose `integration/evidence/L2B/runs/new-708/map.json` (or any of the other3 successful short examples). Press Space/click to flap, P to pause, R to restart. Keep `vendor/flappy-runtime.js` beside the HTML's directory structure. The separate playable ZIP already has the4 examples under `maps/`.

The player renders actual current runtime bodies and native input. Local file bytes are not uploaded. Its JavaScript syntax was checked; actual desktop/mobile interactive UX and human play were not validated. Gold lines are authored control hints, not trajectories or safe corridors.

## Old baseline and24-case panel

`baseline.cjs` calls the byte-identical accepted c005 compiler and its pinned dependencies. It retains the120s map and records the short prefix horizon separately. `prepare_batch.py` and `run_batch.cjs` implement8 old/new seed+nominal-target pairs plus8 new heldouts. The L1 panel's actual observation horizons are equal within each pair. Requests and difficulties are not semantically/calibration matched, and later diagnostic policies differ, so win rates cannot rank the generators.

Do not rerun the24-case panel just to inspect its results. Saved manifests/results/inputs/traces live in `evidence/L1/`; earlier failed outcomes are preserved. Frozen older runner/controller versions are kept with the evidence for provenance.

## Focused verification

```sh
python3 -m unittest discover -s integration/tests -p 'test_*.py' -v
node --test integration/tests/*.cjs
```

Final result:22 Python tests and15 Node tests passed. The tests cover deterministic saved-map reproduction, dependency/runtime hashes, recursive exclusions, explicit experimental mode, selection axes, phase covariance, paired horizons, controller decisions and a few small synthetic native fixtures. This is not the historical heavy regression matrix.

## Evidence navigation
- `visuals/L1/`: paired old/new plots, measured first-seam failures
- `visuals/L2B/`:4 complete short trajectories and detailed maps
- `evidence/L2B/runs/`: original maps, input tapes, gzip traces and terminal results
- `evidence/L3/runs/`:2 actual120s-world early failures, complete state/parameters retained
- `actual_contact_summary.cjs`: read-only distinction between actual top contact, receiver clearance and final controller branch labels
- `analyze_results.py`: read-only summaries;0.1s saved-body minima are explicitly not continuous clearance bounds

## Isolation and policy

Original DESIGN30 history and the paused adaptive-general-twelve batch were not changed. The runtime remains SHA25658c19ff5f258bfc05ff2a4b1b9f8edbbf7742fc57fa1c0c294b1ddfda668e987. `suction_core`, `push_pulse_core` and nested containing composites remain excluded. None of the two historical qualified families/four exact recipes inherits general composition qualification.

The lean delivery is a runnable dependency/evidence subset of the new integration repository, not a replacement for all160 historical candidate records. The full local git repository retains that base history and all integration changes.
