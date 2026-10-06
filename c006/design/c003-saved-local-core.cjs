'use strict';
// Authenticated saved-record adapter. No engine import, simulation, pose synthesis,
// map projection, repaired trace, or historical outcome lookup in production.
const same = require('node:util').isDeepStrictEqual;
const C = require('../harness/common.cjs');
const Q = require('../harness/b008-metrics.cjs');
const Hammer = require('./relocated-hammer/b007-observe-v3.cjs');
const HammerWindow = require('./relocated-hammer/b007-window-v2.cjs');
const Aperture = require('./shared-program/observer-aperture-core-v1.cjs');
const Burst = require('../harness/b012-burst-observer.cjs');
const { pointMargin } = require('./hammer/observe-hammer.cjs');
const VERSION = 'c001-request-selected-saved-relations/2', R = 10, HZ = 120;
const need = (v, s) => { if (!v) throw Error('Intent observer: ' + s); };
const clone = structuredClone;
const bundles = new WeakSet();
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const live = b => b.lethal === true && !['warning', 'idle', 'cleared'].includes(b.status);
function freeze(x) { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.values(x).forEach(freeze); Object.freeze(x); } return x; }
function captureWindows(map, plan) {
  need(Array.isArray(plan?.selectedRecipes) && new Set(plan.selectedRecipes).size === plan.selectedRecipes.length, 'selected recipe plan required');
  const out = [];
  for (const recipe of plan.selectedRecipes) {
    if (recipe === 'J') {
      const p = map.design?.burstProgram; need(p, 'selected burst absent');
      out.push({ name: 'burst', layer: 'combo', startTick: 0, endTick: p.recovery.minimumStopTick, forceSourceIds: [p.sourceId, p.phrase.previous.id, p.phrase.receiver.id, ...p.recovery.nextDemand.firstDemandBodies.map(o => o.id)] });
    } else if (recipe === 'T') {
      const p = map.design?.timedApertureProgram; need(p, 'selected aperture absent');
      out.push({ name: 'aperture', ...Aperture.captureWindow(map, p), forceSourceIds: [p.sourceId] });
    } else if (recipe === 'H') {
      need(map.design?.relocatedHammerProgram, 'selected hammer absent');
      out.push({ name: 'hammer', ...HammerWindow.windowFor(map).retentionWindow, forceSourceIds: [map.design.hammerProgram.sourceId] });
    } else throw Error('Intent observer: unknown selected recipe');
  }
  return out.sort((a, b) => a.startTick - b.startTick || a.name.localeCompare(b.name));
}
function windowView(trace, window) {
  const inside = t => t >= window.startTick && t <= window.endTick;
  return { schema: 'selected-saved-trace-view/1', retentionWindow: clone(window), rows: (trace.rows || []).filter(r => inside(r[0])), bodySamples: (trace.bodySamples || []).filter(f => inside(f.tick)), flapTicks: trace.flapTicks, initialState: trace.initialState, finalState: trace.finalState, continuity: trace.continuity, events: trace.events, boundaries: trace.boundaries, controllerStats: trace.controllerStats, controllerQueueContinuity: trace.controllerQueueContinuity || 'Live controller closure preserved from tick0; restorable internal queue unavailable', originalTraceHashAbsentByDesign: true };
}
// Metadata-only evaluation amendment: runtime ordinary bodies may omit sourceId.
// Infer identity from an exact unique native descriptor; never infer a pose.
function normalizeOrdinarySourceIds(view, map) {
  const descriptors = new Map();
  for (const o of map.obstacles) descriptors.set(o.id, [...(descriptors.get(o.id) || []), o]);
  const ordinary = new Set(['fixed_armor_or_spike', 'vertical_armor_slider', 'horizontal_armor_slider']);
  const inferred = new Map();
  const bodySamples = view.bodySamples.map(frame => ({ ...frame, bodies: frame.bodies.map(body => {
    const matches = descriptors.get(body.id) || [];
    need(matches.length <= 1, 'ambiguous actual body source identity: ' + body.id);
    if (!matches.length || !ordinary.has(matches[0].mechanic_kind)) return body;
    const descriptor = matches[0];
    need(body.kind === descriptor.mechanic_kind && body.shape === 'rectangle' && descriptor.collider?.shape === 'rectangle', 'ordinary source kind/primitive mismatch: ' + body.id);
    need([body.x, body.y, body.w, body.h].every(Number.isFinite) && body.w > 0 && body.h > 0 && body.w === descriptor.collider.w && body.h === descriptor.collider.h, 'ordinary source dimensions invalid: ' + body.id);
    need(body.sourceId === undefined || body.sourceId === descriptor.id, 'wrong explicit source identity: ' + body.id);
    if (body.sourceId !== undefined) return body;
    const previous = inferred.get(body.id);
    inferred.set(body.id, { sourceId: descriptor.id, kind: descriptor.mechanic_kind, descriptorSHA256: C.sha(descriptor), inferredFrameCount: (previous?.inferredFrameCount || 0) + 1, firstTick: previous?.firstTick ?? frame.tick, lastTick: frame.tick });
    return { ...body, sourceId: descriptor.id };
  }) }));
  return { ...view, bodySamples, sourceIdInference: { schema: 'unique-ordinary-source-identity-view/1', metadataOnly: true, originalTraceModified: false, poseFieldsChanged: false, inferredBodies: [...inferred.values()], method: 'Missing sourceId only; unique exact descriptor id, matching kind and rectangle primitive/dimensions; explicit wrong sourceId rejected' } };
}
function adapterIdentity() {
  const file = 'design/c001-observe-v2.cjs';
  return { file, sha256: C.sha(C.fs.readFileSync(C.path.join(__dirname, 'c001-observe-v2.cjs'))), originalObserver: 'design/c001-observe.cjs', metadataOnlyAmendment: true };
}
function verifyEvaluationClosure(frozen, root, evaluationFiles) {
  const adapter = adapterIdentity(), allowed = { ...evaluationFiles, [adapter.file]: adapter.sha256 };
  for (const [file, expected] of Object.entries(allowed)) {
    need((file.startsWith('design/') || file.startsWith('outer/')) && digest(expected), 'only explicitly hash-bound evaluation amendments allowed');
    need(C.sha(C.fs.readFileSync(C.within(root, file))) === expected, 'evaluation amendment hash differs: ' + file);
  }
  for (const file of Object.keys(require.cache)) {
    if (!file.startsWith(C.path.resolve(root) + C.path.sep)) continue;
    const relative = C.path.relative(root, file).split(C.path.sep).join('/');
    const expected = frozen.files[relative] || allowed[relative];
    need(expected && C.sha(C.fs.readFileSync(file)) === expected, 'loaded file outside original freeze or explicit evaluation amendment: ' + relative);
  }
  return { ...adapter, originalObserverSHA256: frozen.files[adapter.originalObserver] ?? null, originalSourceManifestHash: frozen.manifestHash, separatelyBoundEvaluationFiles: allowed };
}
function validateView(view) {
  const { startTick, endTick } = view.retentionWindow, reached = Math.min(endTick, view.finalState?.tick ?? -1), rows = view.rows, frames = view.bodySamples;
  need(new Set(rows.map(r => r[0])).size === rows.length && new Set(frames.map(f => f.tick)).size === frames.length, 'duplicate saved player/body ticks');
  const byRow = new Map(rows.map(r => [r[0], r])), byFrame = new Map(frames.map(f => [f.tick, f])), commands = new Set(view.flapTicks);
  let missing = 0;
  for (let t = startTick; t <= reached; t++) {
    const r = byRow.get(t), f = byFrame.get(t);
    if (!r || !f) { missing++; continue; }
    need(r.length === 8 && [0, 1, 2, 3, 6, 7].every(k => Number.isFinite(r[k])) && Number.isInteger(r[0]) && Math.abs(r[7] - t / HZ) < 1e-9 && [0, 1].includes(r[4]) && [0, 1].includes(r[5]), 'malformed saved row');
    need(r[1] === f.x && r[2] === f.y && !!r[4] === commands.has(t - 1), 'body/player/input mismatch');
    need(new Set(f.bodies.map(b => b.id)).size === f.bodies.length, 'duplicate body identity');
  }
  return { status: missing ? 'missing' : reached < startTick ? 'not_reached' : reached < endTick || rows.some(r => !r[5]) ? 'censored' : 'observed', missingTicks: missing, reachedTick: reached, fullWindow: !missing && reached === endTick && rows.every(r => r[5]) };
}
function distance(row, body) { return body.shape === 'rectangle' ? Aperture.rectMargin(row, body) : pointMargin(row[1], row[2], body, R); }
function bodyPass(view, id, requestedSide = null) {
  const byFrame = new Map(view.bodySamples.map(f => [f.tick, f])), records = [], issues = [];
  for (const row of view.rows) {
    const frame = byFrame.get(row[0]); if (!frame) continue;
    const matching = frame.bodies.filter(b => b.id === id);
    if (!matching.length) continue;
    if (matching.length !== 1) { issues.push('duplicate ' + id); continue; }
    const b = matching[0], bounds = Q.runtimeBounds(b);
    if (!['rectangle', 'circle', 'segment'].includes(b.shape) || !Object.values(bounds).every(Number.isFinite) || !live(b)) { issues.push('malformed/inactive actual body ' + id); continue; }
    const slab = row[1] + R >= bounds.minX && row[1] - R <= bounds.maxX;
    const side = requestedSide === null || (requestedSide === 'upper' ? row[2] < (bounds.minY + bounds.maxY) / 2 : row[2] > (bounds.minY + bounds.maxY) / 2);
    records.push({ tick: row[0], row, body: b, slab, right: row[1] - R > bounds.maxX, margin: distance(row, b), intendedSide: side });
  }
  const overlaps = records.filter(x => x.slab), first = overlaps[0], last = overlaps.at(-1), before = first && records.find(x => x.tick === first.tick - 1), after = last && records.find(x => x.tick === last.tick + 1);
  const dense = overlaps.length > 0 && overlaps.every((x, i) => !i || x.tick === overlaps[i - 1].tick + 1);
  const bracketed = !!before && !before.slab && !!after && !after.slab && after.right;
  const status = issues.length ? 'invalid' : !first ? 'not_reached' : !dense ? 'missing' : !bracketed ? 'censored' : 'observed';
  const death = (view.events || []).filter(e => e.type === 'death' && (e.id === id || e.sourceId === id));
  return { status, sourceId: id, requestedSide, passed: status === 'observed' && overlaps.every(x => x.row[5] && x.margin > 0 && x.intendedSide) && !death.length, dense, bracketedWholeBodyPassage: bracketed, overlapTicks: overlaps.map(x => x.tick), minimumActualMarginPx: overlaps.length ? Math.min(...overlaps.map(x => x.margin)) : null, first: first ? { tick: first.tick, row: first.row, body: first.body } : null, last: last ? { tick: last.tick, row: last.row, body: last.body } : null, fullExit: bracketed ? { tick: after.tick, row: after.row, body: after.body } : null, wrongSideTicks: overlaps.filter(x => !x.intendedSide).map(x => x.tick), deathEvents: death, issues };
}
function burstParentRelation(view, context, route) {
  const p = context.phrase, rf = p.routeFacts.find(x => x.route === route);
  const previous = bodyPass(view, p.previous.id, rf.previous.side), source = bodyPass(view, p.source.id, rf.source.side), receiver = bodyPass(view, p.receiver.id, rf.receiver.side);
  const next = context.recovery.nextDemand.firstDemandBodies.map(o => bodyPass(view, o.id));
  const cross = x => view.rows.find(r => r[1] > x), entry = cross(context.recovery.bridge.startX), exit = cross(context.recovery.bridge.boundaryX), routeExit = cross(rf.receiver.segment.endX);
  return { status: validateView(view).status, previous, source, receiver, nextDemand: next, bridge: { entry, exit }, receiverRouteExit: routeExit, actualRelationPassed: [previous, source, receiver, ...next].every(x => x.passed) && !!entry?.[5] && !!exit?.[5] && !!routeExit?.[5], actualProjectileLifecycle: { status: 'not_applicable', reason: 'parent retains original rectangular source; no invented projectile data' } };
}
function burstCandidateRelation(map, run, view) {
  const capture = Burst.create(map), frames = new Map(view.bodySamples.map(f => [f.tick, f]));
  for (const r of view.rows) {
    const f = frames.get(r[0]); need(f, 'missing burst actual frame');
    Burst.capture(capture, map, { tick: r[0], x: r[1], y: r[2], vy: r[3], alive: !!r[5], vx: r[6] }, f.bodies, !!r[4]);
  }
  const result = Burst.reduce(capture, map, view.events || [], view.finalState, run.route);
  const p = map.design.burstProgram, rf = p.phrase.routeFacts.find(q => q.route === run.route);
  const motion = p.expectedShots.map(q => {
    const bs = capture.frames.flatMap(f => f.bodies.filter(b => b.id === q.id).map(b => ({ tick: f.tick, ...b })));
    const steps = bs.slice(1).map((b, i) => ({ tick: b.tick, dx: b.x - bs[i].x, dy: b.y - bs[i].y, deltaTick: b.tick - bs[i].tick }));
    return { id: q.id, actualBodyFrames: bs.length, moved: steps.some(s => s.dx !== 0 || s.dy !== 0), velocityMatches: bs.length > 1 && bs.every(b => b.vx === p.projectileVelocity.vx && b.vy === p.projectileVelocity.vy) && steps.every(s => s.deltaTick === 1 && Math.abs(s.dx - p.projectileVelocity.vx / HZ) < 1e-7 && Math.abs(s.dy - p.projectileVelocity.vy / HZ) < 1e-7), firstActualBody: bs[0] ?? null, lastActualBody: bs.at(-1) ?? null };
  });
  const core = bodyPass(view, p.sourceId, rf.source.side), previous = bodyPass(view, p.phrase.previous.id, rf.previous.side), receiver = bodyPass(view, p.phrase.receiver.id, rf.receiver.side);
  const next = p.recovery.nextDemand.firstDemandBodies.map(o => bodyPass(view, o.id));
  const routeExit = view.rows.find(r => r[1] > rf.receiver.segment.endX);
  return { ...result, actualShotMotion: motion, corePhysical: core, previousPhysical: previous, receiverPhysical: receiver, nextDemandPhysical: next, receiverRouteExit: routeExit ?? null,
    actualRelationPassed: result.status === 'observed' && result.lifecycle.status === 'observed' && motion.every(q => q.moved && q.velocityMatches) && result.receiver.status === 'observed' && result.recovery.bridgeExited && result.recovery.successorBodyExitObserved && [previous, core, receiver, ...next].every(q => q.passed) && !!routeExit?.[5] && result.projectilePassage.actualSlabTicks.length > 0 && result.projectilePassage.minimumRecordedMarginPx > 0 && !result.collisionEvents.length };
}
function scopedTask(run, selected, contexts, reports) {
  const ids = [], mechanisms = {};
  if (selected.includes('H')) {
    const h = contexts.H.phrase.routeFacts.find(q => q.route === run.route), local = h.receiver.checkpoints.map(q => q.id);
    ids.push(...local); mechanisms.H = { excludedGuardIds: local, physicalReplacementPassed: reports.H.receiverPhysical?.passed === true, historicalCaveat: 'b007 post-reveal receiver-footprint correction explicitly inherited and frozen prospectively' };
  }
  if (selected.includes('T')) {
    const t = contexts.T, r = t.phrase.receivers[1].routeFacts.find(q => q.route === run.route), local = [t.replacedPressureRecord.pairId, r.checkpoint.id];
    ids.push(...local); mechanisms.T = { excludedGuardIds: local, physicalReplacementPassed: reports.T.actualRelation?.passed === true };
  }
  need(new Set(ids).size === ids.length, 'overlapping changed guard scopes');
  const events = run.metrics?.routeEvents || [], present = ids.every(id => events.filter(e => e.id === id).length === 1);
  const metrics = run.metrics ? { ...run.metrics, routeEvents: events.filter(e => !ids.includes(e.id)) } : null;
  return { rawTaskPass: run.taskPass ?? null, physicalTaskPass: present && Object.values(mechanisms).every(q => q.physicalReplacementPassed) && Q.taskPass(metrics), excludedGuardIds: ids, guardsPresent: present, mechanisms, rawChangedGuards: events.filter(e => ids.includes(e.id)), scope: 'Only selected accepted H receiver and selected T replaced pair/lower receiver guards in both paired arms; J and all other route/contact/recovery/final obligations remain original' };
}
function compact(value, key = '') {
  if (['seamActualRows', 'actualRows', 'samples', 'frames', 'edgeVelocitySamples'].includes(key) && Array.isArray(value)) return { retainedInAuthenticatedTrace: true, count: value.length };
  if (Array.isArray(value)) return value.map(x => compact(x));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, compact(v, k)]));
  return value;
}
function reduceSaved(map, run, trace, plan, candidateMap) {
  const windows = captureWindows(candidateMap, plan), contexts = { H: candidateMap.design.relocatedHammerProgram, T: candidateMap.design.timedApertureProgram, J: candidateMap.design.burstProgram }, reports = {}, views = {};
  const isCandidate = !!map.design.burstProgram || !!map.design.timedApertureProgram || !!map.design.relocatedHammerProgram;
  for (const recipe of plan.selectedRecipes) {
    const name = { H: 'hammer', T: 'aperture', J: 'burst' }[recipe], window = windows.find(w => w.name === name), view = normalizeOrdinarySourceIds(windowView(trace, window), map); views[recipe] = view;
    try {
      const coverage = validateView(view);
      if (recipe === 'H') {
        const h = Hammer.observe(map, run, view, contexts.H), groups = [h.source, h.receiver, h.nextDemand, ...(h.remainingIslands || [])];
        const safe = groups.length >= 3 && groups.every(g => g?.status === 'observed' && g.minimumActualBodyMarginPx > 0) && !(h.physicalCollisionEvents || []).length;
        reports.H = { ...h, coverage, actualRelationPassed: coverage.fullWindow && h.status === 'observed' && h.wholeWindowDense && h.continuousFromRealTickZero && safe && h.receiverPhysical?.passed === true && !!h.nextDemand?.firstFullExitAfterLastOverlap && !!h.predecessorBridge?.entry && !!h.predecessorBridge?.exit && !!h.packageBridge?.entry && !!h.packageBridge?.exit && !!h.oppositeReceiver?.routeExit };
      } else if (recipe === 'T') {
        const t = Aperture.reduce(map, run, view, contexts.T);
        reports.T = { ...t, coverage, actualRelationPassed: coverage.fullWindow && t.actualRelation?.passed === true, nextComponentFirstDemand: { status: 'not_applicable', reason: 'inherited T contract covers next gate in same phrase and full package recovery; next component is checked by whole-course contracts' } };
      } else reports.J = { ...(map.design?.burstProgram ? burstCandidateRelation(map, run, view) : burstParentRelation(view, contexts.J, run.route)), coverage };
    } catch (error) { reports[recipe] = { status: 'invalid', reason: error.message, actualRelationPassed: false }; }
  }
  const task = scopedTask(run, plan.selectedRecipes, contexts, reports);
  const allRelations = plan.selectedRecipes.every(r => reports[r]?.actualRelationPassed === true);
  return { schema: VERSION, selectedRecipes: clone(plan.selectedRecipes), windows, sourceIdInference: Object.fromEntries(Object.entries(views).map(([key, view]) => [key, view.sourceIdInference])), reports: compact(reports), scopedTask: task, actualRelationsPassed: allRelations, rawTaskPass: run.taskPass ?? null, fullQualificationCandidate: !run.error && !trace.retention?.qualificationBlocked && allRelations && task.physicalTaskPass, diagnosticOnly: !run.role?.startsWith('assigned_'), physicsScope: 'Saved actual bodies/events only; integer-tick margins do not prove continuous collision freedom independently of recorded substep deaths', warningCausalResponse: null, naturalRouteChoice: null, humanFun: null };
}

module.exports={VERSION,captureWindows,windowView,normalizeOrdinarySourceIds,validateView,bodyPass,reduceSaved,compact};
