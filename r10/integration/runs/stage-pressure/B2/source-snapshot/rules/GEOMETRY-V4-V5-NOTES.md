# Staged geometry and cue small loops

This worker ran exactly **2 new native trajectories**, both saved under
`integration/runs/four-loops/exploratory-geometry/`. It ran no panel or grid.
All original L2B/L3 outcomes remain untouched. The two experiments use one
fresh native world each and the unchanged `relational-source-v3` controller.
They are short, deliberately chosen two-fragment checks, not 30-second panel
outcomes, human trials, entry-state ranges, or 120-second evidence.

## Priority 1: first-disk clearance, revision 4

L2B `new-2701` saved-frame minimum is 0.476734666 px at tick324 against
`m01-solid-crown-1`: x465, y285.819444, vy468.5. Its first disk is unchanged by
the alternate recipe; only the middle circle/hanger/floor moves60px earlier.
The old guide nevertheless also moved the first descent cue from480 to420.
That erroneous dependence caused the player to descend around the first
disk's right shoulder before its full radius cleared. `new-708` shows the
same failure tendency at the first disk in a translated alternate fragment.

`geometry_v4.refine_fragment(f, difficulty='medium', revision=4)` returns a
deep copy. For revision>=4 it derives the first Cloister descent boundary
from actual first-disk right + player radius10 + release reserve10, giving480
for both current variants. Base480 stays480; alternate420 becomes480. No
obstacle, aperture, speed, phase, or initial state changes. Revision<4 is an
exact independent copy. Metadata records the relation and evidence.

This fixes the mistaken cue dependency rather than relaxing the disk. The
provider's coupled disk-radius and node-span recipes already exist, but are
not needed for this change and were not modified. The middle advance remains
an actual geometric variant. No safe descending-state range is claimed.

## Priority 2: lower slider with real contour, revision 5

The source provider already exposes a lower branch with a derived phase
opposite the upper branch. The old compiler always requested upper for both
variants. This is an **unused existing concept**, not a missing mechanic.

`geometry_v5.refine_fragment(f, difficulty='medium', revision=5)` is a second
deep-copy, idempotent helper, intended after v4 and before extents/planning.
It leaves revisions<5 and base variants unchanged. Alternate slider now:

- Calls the existing provider's lower branch with the original core shift;
  lower phase is derived by the provider, then global translation remains
  coupled through the existing clock transform
- Changes inlet opening to240..440 and first target to360
- Moves the existing island down20/30/40px for easy/medium/hard, without
  adding bodies or changing its width
- Ramps from360 toward425/435/445, then holds through the whole player's
  island clearance, then rises to the original receiver target298
- Creates a required island-to-receiver rise of at least25/35/45px from the
  disjoint center bands, rather than the old lower geometry's5px minimum

Thus the alternative changes collision geometry and uses a different forced
merge relation. The authoring target still exceeds the minimum forced motion;
the entire intended excursion is not proved mandatory. This does not show
that every sustained section is interesting or that lower is better than upper.

For a Cloister predecessor, preserve the composer's high carry-in opening
90..280 and first target210. Do not replace its lower phase or subsequent
lower/merge cues. The targeted probe retains exactly that connector; no
categorical Cloister→lower block was needed for that one measured entry.
Other incoming states remain unqualified.

## Priority 3: optional receipt followed by a low answer, revision 5

L2B `new-2701`'s spring module only spans y223..275 and has no top contact.
That legitimate bypass follows one receiver aim throughout, so merely
including a spring does not make a distinct action phrase. The missing
relationship was receipt→following action, not a missing spring primitive.

The alternate v5 spring adds one ordinary fixed roof after the receiver,
leaving both original spring and receiver descriptors unchanged. The
compositor still applies its revision3 receiver width recipe:

- Roof starts220px after gate back, is80px wide and390px high
- Descent cue target460 begins only after the whole player clears the gate
- Radius-clear descent distance is200px, not a fixed empty rest
- The new roof's allowed center y>400 is disjoint from the receiver's maximum
  center386.514/376.514/366.514 at easy/medium/hard, forcing at least
  13.486/23.486/33.486px downward change
- Active span grows300px and one descriptor; the map width includes recovery
- The spring remains optional, native two-sided behavior and cooldown persist,
  and the full receiver clock and future cycles remain live

The composer must use the retained low-answer exit aim460 for its next seam.
Its old spring-specific override `gate.y+25` would discard this real final
action. The parent owns that narrowly scoped integration correction.

Only the contact branch received a dedicated native probe here. Geometry
allows a bypass to the same receiver; this worker did not separately measure
a bypass followed by the new low answer. Do not call that branch proven from
this pair of experiments.

## Other failures: diagnoses handed back without changes here

**Extended tidal high shelf → low roof:** L3 `macro-3701` hits roof3 at
tick816, x1080, y289.827778, vy331.833333. Roof front is1090; the conservative
full-overlap center band requires y>320. The180px insertion changes the flap
cycle at release even though guide coordinates shift with the geometry.
Static band disjointness and added shelf length do not establish a reachable
release state. Prioritize a carried-state release/preparation relationship,
then verify that exact extension; do not reset the clock or infer impossibility
from this controller failure. Fixed-bank stair geometry already exists; the
missing element is its entry/release-state coupling.

**Bellows → light:** L3 `macro-3703` crosses the seam around x1485.5 with
y354.389, vy215.667. At the next light guide boundary, the target abruptly
changes440→400. A flap then drives upward into the still-active upper laser,
dying at tick1253, x1626.25, y374.498, vy−180.667. The original light source
assumes fresh y440/vy0; translated clock geometry alone does not reproduce
that posture. The source already supplies laser rails/masks and native gate
timing. The missing relation is actual incoming state→sloped-channel approach
and release/receipt, not a new laser mechanism. No rail was deleted here.

## The two native probes

1. `lower-slider-carry-in`: corrected alternate Cloister → alternate lower
   slider, real high inlet connector; native win at tick1660/13.833333s.
   Seam state tick824, x1090, y155.216667, vy−98.666667. Slider observed
   y160.293..436.066 and ended its active geometry near y270.824/vy−194.333.
   Saved12-tick body-frame minimum19.773611px against island at tick1320.
2. `spring-receipt-low-answer`: extended Bellows → alternate spring receipt
   and new roof; native win at tick1785/14.875s. Real native top bounce at
   tick1243. Spring phrase observed y229.214..464.013; at final roof clearance
   x2130 it was y411.169/vy−44. Saved-frame minimum13.215594px against the
   answer roof at tick1656.

Both are one native initialization, zero resets/restores/deleted hazards.
The saved minima are discrete frame observations, **not continuous/substep
minimum bounds**. The measured wins do not qualify a family, seam range,
difficulty scale, full generator, or human-fun claim.

Complete result/map/input/trace hashes, state-sequence hashes, actual contact
events, and measured module ranges are in
`integration/runs/four-loops/exploratory-geometry/summary.json`. Each run folder
retains `map.json`, `inputs.json`, `trace.json.gz`, and `result.json`; the exact
authoring inputs are also retained beside the folders.

## Source freeze and structural checks

- v4 SHA256: `270cd874898ba514acfc48cc4a3243786e861934a554fbd39ce8d51d753e74d3`
- v5 SHA256: `d5d80e073d32895a0121adf046e5e20073053ecb29f30ab505dca4d226baaaaf`
- Controller SHA256: `b97537cfc5e50fb43f8bd517d1c59be8d1038590069d434dab46cc79fbc26fb5`
- Runtime SHA256: `58c19ff5f258bfc05ff2a4b1b9f8edbbf7742fc57fa1c0c294b1ddfda668e987`

`test_geometry_v4_v5.py`:8 tests passed. They cover revision isolation,
deep-copy/no mutation, idempotence, first-disk cue derivation, source lower
phase and global phase covariance, real island/inlet shape, spring/gate
preservation, disjoint answer bands, recursive exclusions, and36 fragment
schema validations. Schema validation performs no runtime steps and adds no
trajectory to the count. No edits were made here to generator.py,
diagnostic.cjs, frozen provider sources, or the native runtime.
