# B3 light receipt diagnosis and one B4 candidate

## Result

The sole preregistered `light-receipt-704` native diagnostic wins at tick 3749 (31.241667 s). This is a targeted repair witness on the failed B3 candidate-704 full world, not held-out evidence or a qualification result. All four native evidence files are retained. No second probe, grid, retry, state restore, deleted hazard, controller edit, or runtime edit was used.

The prior B3 failure remains intact: event tick 1618, final tick 1619, `m02-wide-receiving-cavity:top`, 13.491667 s. The last channel flap occurs at tick 1580, x=2035, y=260.022222. The guide releases at x=2045.5 but the real upward velocity persists. The original gate starts closing at tick 1600 and its top reaches the still-rising player. Both real rails have entered cooldown; they are not the recorded killer.

## Authored relation

`integration/rules/receipt_v7.py` changes only `wide-receiving-cavity.timeline.hold_s` and `.closing_s`, after the revision-6 light ramp. It preserves both finite rails and their clocks, all guide values and boundaries, the receiver's position/width/320px aperture, and the exact source one-third aperture at whole-radius tail. No input-state values are written.

Let A be time from real rail release to the receiver's whole-radius tail; u=290/820 is the native flap-to-apex time. For aperture P and retained tail fraction f=1/3, choose the earlier positive solution d to:

(d-u)(A-d) = P(1-f)/(2*820)

Add one native tick to d. Begin closing at release+d and set closing duration to (A-d)/(1-f). Thus the latest possible pre-release flap is already descending faster than the top rim when closing begins. The unchanged ramp's lowest threshold, 255, leaves 3.719512px analytical full-open crest clearance for an idealized flap starting exactly at that threshold.

For the existing source recipe: delay=0.463786468 s, hold=2.163786468 s, closing=1.904320299 s. Old hold/closing were 1.8/2.45 s. The new descending-speed bound is 90.304903px/s versus rim speed84.019479px/s. The tail center band remains86.666667px. Closing remains a real receiver demand; its later start is coupled to a faster closing rate, not an enlarged aperture or an abandoned tail squeeze. The gate's repeating period changes accordingly and is disclosed in refinement metadata; its old source-derived timing metadata is explicitly superseded.

## Limits and review

The analytical statement covers an idealized last pre-release flap followed by unforced ballistic motion at the source native speed/gravity. It is not a proof that all incoming states reach the ramp, that they clear either rail, that later catch flaps work, or that every repeated cycle is reachable. It is not an accepted incoming-state box, calibrated difficulty range, continuous parameter domain, or human-playability claim. Only alternate/medium in this one carried B3 world has a new diagnostic witness. Base/easy/hard are authoring-contract checked, not separately physically qualified here.

Stored full-tick receipt samples show minimum top clearance9.345139px and bottom clearance26.291550px. These are sampled center/radius margins, not claimed exact substep minima. The world continues across all three seams and wins with one initialization, zero resets/restores and all23 obstacles.

General promotion remains rejected. The B4 paired panel, independently selected unseen cases, terminal-aware grammar, rendered action review, and completion criteria remain the parent's gate.

## Integrity

- Frozen rule SHA256: `58544675d1113729b08a7ae2bdb3c6fec3a37154bb4b6eb848b4e4d923c0219b`
- Preregistered manifest SHA256: `ab2ef4182f19eb718315dcf268e2b932413936d4ba6d15b03582d5fefea251b4`
- Preregistered probe-map bytes SHA256: `ff73843472d910699df3db7f08a4b9a141992c931eff1b7b5c32873ed016993c`
- `diagnosis.json` binds original and new map/result/input/trace files by hash and records synchronized original terminal receiver bodies
- Seven focused no-physics tests pass; see `static-tests.txt` and `integration/tests/test_receipt_v7.py`
