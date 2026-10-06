# V4 small loop: purposeful seeded order selection

## Defect and bounded change

The saved L2B new-701 and new-2701 maps have identical family order:
cloister → slider-island → spring-reception → tidal-staircase → cloister.
They differ in discrete variants, but this is not meaningful macro-order diversity.
The 701 medium/arcade four-family authoring search already yielded 29 eligible
family orders across 462 variant-level candidates; returning the highest additive
theme/action score discarded that existing diversity.

`grammar_v4.py` adds four finite authored phrase outlines, selected by a stable
SHA-256 seed. Slots describe contour, route commitment, receipt and timing, with
different peak/release positions. They are action phrases of variable geometric
length, not fixed-time bins. The theme still scores distinct family affinities.

Beam adjustments reward newly covered requested actions, slot fit and a first
thematic contribution, and penalize repeated adjacent family pairs. Final
selection first maximizes requested-action coverage among the admitted beam
candidates. It then ranks family orders by average phrase fit, distinct thematic
contributions and repeated high-pressure/pair penalties. A seed chooses among
orders within 0.20 authored-fit points of the best fit. Each family order competes
once regardless of how many discrete variants generated it. The original
compiler score chooses its representative variant, retaining the duration-fit
preference there.

This is a bounded authoring heuristic. The beam can still discard useful plans;
maximum coverage here is not a global satisfiability proof. The pressure metadata
is authored rather than a measurement of player difficulty. Novel orders can
expose untested or poor seams; diversity is not evidence of safety or fun.

## Exact integration interface

- `role_for(depth, seed, theme) -> str`: use before calculating the seam reserve,
  so the chosen role actually influences geometry instead of being relabeled later
- `score_adjustment(seq, f, role, depth, seed, theme, *, actions=None) -> float`:
  add to the beam candidate score; passing the requested actions enables the
  incremental newly-covered-verb bonus
- `choose_complete(complete, seed, theme, actions) -> state`: replace selection of
  `complete[0][1]`; input is the existing `(duration_adjusted_score, state)` list
- `plan_metadata(seed, theme) -> dict`: readable authored outline description

`choose_complete` returns a shallow copy of the selected compiler state and adds
`state['grammar']`. Fragment geometry, descriptor count, placement, variant,
qualification and original scalar score are untouched. The added metadata gives
the actual family order, admitted/coverage-maximizing/near-equal order counts,
covered verbs, outline and authored fit. Copy it into `integration.plan.grammar`.
Keep revision 1–3 on their original selector so saved evidence remains reproducible.

The compiler remains responsible for its existing family palette, at least four
distinct families, 30–32.9 second short-map duration, no more than 40 descriptors,
excluded mechanics and structural seam restrictions. This module does not step
physics, change clocks, reset state, edit fragments or assign qualification.

## Focused verification

`python -m unittest discover -s integration/tests -p test_grammar_v4.py -v`

Eight tests passed. They check stable distinct seeded outlines and roles,
requested-action priority over scalar theme score, candidate duplication/input
order invariance, source immutability and admitted geometry preservation, new
verb reward, deterministic actual generation within native short-map limits,
actual selection changes under action/theme controls, and explicit empty-result
failure. These are authoring tests only; no physics episodes or broad grids were
run by this small loop.

With the revision-4 parent integration at verification time, medium/arcade seed701
and seed2701 on the original four-family palette selected different macro orders:

- 701: cloister → tidal-staircase → spring-reception → slider-island → cloister
- 2701: tidal-staircase → spring-reception → cloister → slider-island → cloister

Both had 36 descriptors and remained within 30–32.9 seconds. These orders are
examples of changed authoring output, not accepted or physically qualified recipes.
