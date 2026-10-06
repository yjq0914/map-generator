# Additional relational fragment families

Implementation: `additional.py`

API: `emit(family, variant='base', difficulty='medium')` returns a new independent dictionary with `map`, `metadata`, and `guide`. Families are `tidal-staircase` and `bellows-question-answer`; both accept only `base`/`extended` and `easy`/`medium`/`hard`. There is no coordinate jitter, independent phase input, free continuous parameter range, or external-state override.

All maps use the unchanged native `flappy-loop-lab/1` runtime contract, start at `(60,270,150,0)`, and finish at their actual map width. Each guide entry is a piecewise target over `[x, until_x)`. Guides are control hints, not trajectories or input witnesses. The final guide's endpoint is the map width.

## 1. Tidal staircase

**Source:** `candidate-spatial-tidal-terraces@3`, author `tidal-admissible-band-v2`, DESIGN30 R02. Frozen source payload: `sources/0764d4245af0a4a4/families.json`. Source evidence: `evidence-r02-spatial-geometry@1`, `review-r02-tidal-v2@1`.

The medium/base emission exactly preserves the corrected source's eight fixed rectangles, translated from source-local x to native world x by +60. It does not restore the earlier invalid flat-corridor design. The earlier R01 counterexample remains valid for that earlier design.

**Behavior:** prepare → climb and sustain a crest → release downward into a trough → sustain low → lift to exit.

**Visible cause:** unequal overlapping roof and bank lengths form a continuous stepped negative space. This is ordinary fixed wall geometry, not eight independent narrow pipe gates. The high, low, and exit restrictions overlap longitudinally with different runs. Their high/low admissible center bands are disjoint, so a constant-height solution cannot traverse the entire map. This only proves a minimum vertical change, not the full amplitude of the suggested guide.

**Relational difficulty recipes:** high and exit aperture is 180/160/136 px for easy/medium/hard. The low aperture is always 10 px taller; centers stay at y170/395/220. Both edges derive from the same aperture rather than independently moving walls. The intermediate bank stays at y330. Every recipe preserves disjoint high/low and low/exit bands.

| Recipe | High center band | Low center band | Exit center band | Minimum high→low change | Minimum low→exit change |
|---|---|---|---|---:|---:|
| easy | (90,250) | (310,480) | (140,300) | 60 px | 10 px |
| medium | (100,240) | (320,470) | (150,290) | 80 px | 30 px |
| hard | (112,228) | (332,458) | (162,278) | 104 px | 54 px |

These are open geometric bands for a radius-10 player at the recorded interior probe x positions. They are not safe incoming states, accepted velocity ranges, or physical family bounds.

**Meaningful length variation:** `extended` inserts 180 px at source-local x520 inside the high shelf. Only the two bodies crossing that cut are lengthened; only later bodies shift. The opening preparation and early roof stay unchanged. The player must sustain the high crest longer. Base duration is 10.2 s; extended is 11.4 s. Both retain 110 px of radius-clear final recovery.

**Limits:** source geometry review only, no inherited native tape or reachable entry/exit box. The new apertures and inserted shelf remain unqualified. The guide may require changes after a bounded native run; a controller failure does not prove map impossibility.

## 2. Bellows question–answer

**Source:** `candidate-same-type-bellows@3`, author `same-type.bellows`, DESIGN30 R05 compact-handoff revision. Frozen source payload: `sources/1d509cf664af73f4/concepts.json`. Source evidence: `review-r01-same-v2@1`, `review-r05-closure@1`.

Medium/base reconstructs the compact four-gate geometry: x420,690,970.5,1265.5; widths72,72,96,120; center heights375,215,245,375; openings180,160,180,200. The last source clock had been rounded to6.0367 s; this emitter derives6.036666… s directly from full-body occupation. It does not copy the rounded decimal as an independent knob.

**Behavior:** descend to the low call → lift into the high reply → retain a high handoff → release into the low answer → sustain through a thicker outlet.

**Visible cause:** four full-height opening wall bodies form two opposite-height phrases. The first closes as the second begins to open; the first phrase's high outlet closes as the second phrase's high inlet begins to open. The last low gate is thicker and remains fully open longer. All gates retain closed, opening, fully open, closing and cooldown states.

**Relations retained:**

- Q-in closing start = Q-out opening start
- Q-out closing start = A-in opening start
- A-out retains its295 px offset from A-in, giving the second phrase a different descending answer
- Full-open windows contain the radius-expanded occupation `[x−10, x+width+10] /150`, with explicit positive front and tail reserves
- Warning remains a closed lethal wall; there is no outer bypass and no horizontal waiting action

**Relational difficulty recipes:** easy/medium/hard use a common temporal-reserve change of +0.10/0/−0.08 s and aperture change of +6/0/−12 px. Gate holds are recomputed from thickness plus the reserve on both sides. The close/open equations then derive subsequent x positions and their clock starts together. This preserves the event relation instead of independently randomizing phase. The labels are authored, not empirically calibrated difficulty levels.

The first low/high pair's center bands remain disjoint, requiring at least4/10/22 px of upward change. This is deliberately weaker than claiming the entire160 px center-to-center ascent is mandatory. The high handoff is only an intersection of geometrically permitted bands; no measured y/vy transfer is claimed. The final answer permits band-edge alternatives, so a full descent to its center is an intended rhythm rather than a proven requirement.

**Meaningful length variation:** `extended` thickens only the final gate by90 px and adds0.6 s to its hold and map duration. Its warning/opening clock and front reserve stay fixed; the radius-expanded tail reserve is preserved. The extension adds sustained low outlet occupation, not a duplicate chamber or empty rest.

| Recipe | Base duration | Extended duration |
|---|---:|---:|
| easy | 11.27 s | 11.87 s |
| medium | 10.87 s | 11.47 s |
| hard | 10.55 s | 11.15 s |

The final radius-clear recovery is295 px in every recipe. This longer tail belongs to the thick low outlet's transition back toward a neutral target. A composing generator should account for the actual measured state rather than appending another fixed empty rest.

**Why not pendulum:** the inspected R04 `candidate-spatial-pendulum-vault@1` explicitly admits an all-time y472–530 low bypass. Its source review labels it an optional canopy-pressure study and says frozen arrangements may preserve most of the sentence. It would add a mechanism without equally strong evidence for distinct forced motion. Bellows has exact event and whole-body timing relations, although its gameplay still needs a bounded test.

## Validation and integration limits

Run `python -m unittest discover -s integration/tests -p test_additional.py -v` from the integration repository root.

At implementation handoff, all9 focused tests pass. They cover all12 discrete combinations; deterministic fresh outputs; valid provenance paths; corrected tidal source fidelity and forced band changes; localized shelf insertion; compact bellows reconstruction; full-body temporal reserves; lethal warning; gate depth/hold coupling; and acceptance of every descriptor by the unchanged bundled native runtime. Runtime validation is a schema/domain check only. No runtime steps, controller episodes, collision proof, renderer review, or human playtest were run by this emitter task.

Every emission remains `candidate_unqualified`. No physically qualified duration or continuous safe parameter range is introduced. Historical evidence remains attached to its exact historical subject.

Composing a fragment must translate descriptors and its guide, and must convert every gate clock to the ongoing global clock consistently. Do not copy `initial_player` into a seam, reset velocity or tick, remove earlier gates, or ignore later cycles. The composer owns measured entry/exit compatibility and native full-map evidence. Parent visual review is still required before accepting the integrated appearance or gameplay.
