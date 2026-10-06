# Progress
- Base: library commit a6d2e0679e70e42b5ca5e0ff0dd5f950f394e542
- Isolation: new clone and integration/combo-maps-v1 branch; originals untouched
- Selected lanes: existing Cloister, slider/island, spring/reception, laser/reception; adding tidal fixed geometry and timed-gate question/answer
- Loop1 completed; Loop2 targeted corrections in progress (results below)

## Loop1: actual integration + fixed24-map panel
- Generated16 actual native-finish short maps (8 paired,8 unseen seeds) spanning31.45–31.69s, plus8 unchanged accepted-c005 full maps evaluated at exactly matched short horizons
- All24 parsed and passed native validation; one pre-run implementation guard false-positive on a policy exclusion list was corrected without allowing excluded descriptors
- Ordinary controller:0/24 completed/survived. Old8 all failed at190ticks; new15/16 completed the first Cloister then failed at first seam, remaining first-slider case failed early
- Two targeted controller diagnostics: unchanged old701+historical MPC survived31.5s; new701+literal source threshold still failed at same65px throat seam
- Conclusion: old ordinary-controller failure cannot rank old generator quality. New carried-state seam defect is independently reproduced
- Parent viewed actual detail/seam plots and required real high-entry geometry, optional spring contact/bypass, and no large blank-reset fix

## Loop2: evidence-led geometry and action correction
- Revision2 replaces Cloister→slider center throat with explicit high-carry90..280 opening; blocks direct Cloister→spring/low-bellows/light ingress
- Eight bounded runs: first repaired seam and full slider now crossed; failures concentrate in optional spring acquisition/receipt (descending too early, bottom contact, or too-high late catch), with one light ingress failure
- Revision3 is a targeted four-case correction: optional acquisition based on actual incoming state, discrete wider receiver, safe-band catch threshold. No physical state injection or mid-world restore; outputs still experimental
-120s decision remains conditional on a useful integrated result; no quota-based acceptance

## Frozen final state
- Loop2 targeted4/4 native completions:31.1667–31.6667s;2 actual top-contact→receiver trajectories and2 no-contact paths
- Parent visually reviewed4-map overview and detailed708/2703; accepted limited short integration evidence, explicitly rejected claims that diversity/pressure goals are complete
- Loop3:2 actual120s-world checks failed at6.800s (extended tidal) and10.4417s (bellows→light); full states and counterexamples retained. No repeated retries to manufacture a120s pass
- Six callable families and native full-map generation delivered, but long-map generalization, rhythm and robustness remain open. new2701 has only0.477px sampled clearance; not a robust recipe
-40 experimental trajectories total. Final focused checks:22 Python+15 Node passed, plus player/renderer syntax checks. Original library git remains clean, paused old batch remains paused
- Batch frozen by parent review; no publication or additional physics
