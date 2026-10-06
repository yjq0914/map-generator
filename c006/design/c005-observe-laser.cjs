'use strict';
// Pure saved-record interface. No source generator, runtime engine, projected
// poses, replay, or historical result lookup. The caller authenticates the
// committed run/trace and frozen dependency closure before qualification use.
const same = require('node:util').isDeepStrictEqual;
const crypto = require('node:crypto');
const Geometry = require('../harness/b002-metrics.cjs');
const Legacy = require('./laser/observe-warning-laser-v2.cjs');
const Effects = require('./laser/b003-effects-v2.cjs');
const { pointMargin } = require('./hammer/observe-hammer.cjs');
const { rectMargin } = require('./shared-program/observer-aperture-core-v1.cjs');
const VERSION = 'c005-saved-warning-laser-relations/1';
const PROGRAM = 'exact-b005-warning-laser-current-successor/2', R = 10, HZ = 120;
const finite = Number.isFinite, clone = structuredClone;
const hash = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const need = (v, s) => { if (!v) throw Error('Laser observer: ' + s); };
const digest = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
const unique = (xs, id) => { const a = xs.filter(x => x.id === id); need(a.length === 1, 'missing/duplicate descriptor ' + id); return a[0]; };
const ownedIndex = id => { const m = /^c(\d+)-/.exec(id); return m ? +m[1] : null; };
const close = (a, b) => finite(a) && finite(b) && Math.abs(a - b) < 1e-7;

function admitProgram(map, program = map.design?.laserProgram) {
  const p = program;
  need(p?.schema === PROGRAM, 'current exact-B laser program required; legacy qualification is not transferable');
  need(map.height === 540 && map.horizon === 14400 && map.durationTicks === 14400, 'current course domain differs');
  need(Number.isInteger(p.componentIndex) && map.components[p.componentIndex], 'current owner absent');
  const source = unique(map.obstacles, p.sourceId), phrase = p.phrase;
  need(phrase?.source?.id === p.sourceId && same(phrase.source, p.replacement), 'source reference/replacement differs');
  need(ownedIndex(source.id) === p.componentIndex, 'source current owner differs');
  const candidate = !!map.design?.laserProgram;
  if (candidate) {
    need(same(map.design.laserProgram, p), 'supplied program differs from current committed map');
    need(source.mechanic_kind === 'laser_scanner' && source.collider?.shape === 'segment', 'current source is not native capsule');
    const expected = p.sourceIdentity?.currentDescriptorSHA256 ?? p.sourceIdentity?.sourceDescriptorSHA256;
    need(digest(expected) && hash(source) === expected && digest(p.sourceIdentity?.binding) && same(source, p.sourceDescriptor), 'current laser source descriptor hash differs');
  } else need(same(source, p.replacement), 'paired parent source differs from exact replacement');
  const rf = phrase.routeFacts;
  need(Array.isArray(rf) && rf.length === 2 && new Set(rf.map(x => x.route)).size === 2 && ['main', 'branch'].every(r => rf.some(q => q.route === r)), 'two actual route facts required');
  for (const q of rf) {
    need(['upper', 'lower'].includes(q.source?.side) && q.source.side === q.receiver?.side, 'source-reference/receiver must be same-side per route');
    for (const which of ['source', 'receiver']) {
      const f = q[which], desc = phrase[which], route = map.routes[q.route];
      need(route && route.segments.filter(s => same(s, f.segment)).length === 1, 'current route segment differs');
      const checks = f.checkpoints ?? (f.checkpoint ? [f.checkpoint] : []);
      need(checks.length > 0 && checks.every(c => route.checkpoints.filter(x => same(x, c)).length === 1), 'current route checkpoint differs');
      need(f.side === 'upper' ? f.segment.maxY < desc.y - R : f.segment.minY > desc.y + desc.collider.h + R, 'whole reference route band differs');
    }
  }
  need(rf[0].source.side !== rf[1].source.side, 'two separated authored lanes required');
  need(Array.isArray(phrase.ownerBodies) && Array.isArray(phrase.remainingIslands), 'explicit owner/protected descriptors required');
  const owner = map.obstacles.filter(o => ownedIndex(o.id) === p.componentIndex);
  need(same(owner.map(o => o.id).sort(), phrase.ownerBodies.map(o => o.id).sort()), 'owner capture declaration omits or adds a body');
  const protectedBodies = [phrase.receiver, ...phrase.remainingIslands, ...phrase.ownerBodies.filter(o => o.id !== p.sourceId)];
  for (const o of protectedBodies) need(o && same(unique(map.obstacles, o.id), o), 'protected current descriptor differs: ' + o?.id);
  const bridge = p.recovery?.packageBridge ?? p.recovery?.bridge;
  need(bridge && same(bridge, phrase.connector) && ['main', 'branch'].every(r => same(map.routes[r].connectors[p.componentIndex], bridge)), 'current package bridge differs');
  const next = p.recovery?.nextDemand;
  need(next && same(next, phrase.successor) && next.componentIndex === p.componentIndex + 1 && Array.isArray(next.firstDemandBodies) && next.firstDemandBodies.length > 0, 'next demand declaration differs');
  next.firstDemandBodies.forEach(o => need(same(unique(map.obstacles, o.id), o) && ownedIndex(o.id) === next.componentIndex, 'current next-demand descriptor differs'));
  const nextSpan = [Math.min(...next.firstDemandBodies.map(o => o.x)) - R, Math.max(...next.firstDemandBodies.map(o => o.x + o.collider.w)) + R];
  need(same(next.wholeBodyX, nextSpan), 'declared next-demand whole-body interval differs');
  need(Number.isInteger(p.recovery.minimumStopTick) && p.recovery.minimumStopTick > 0 && p.recovery.minimumStopTick <= map.horizon, 'source-derived capture end absent');
  need(p.recovery.minimumStopTick === Math.floor((nextSpan[1] - map.initial_player.x) / 1.25) + 1, 'capture end does not bracket actual next-demand fixed-x exit');
  const supported = [...protectedBodies, ...next.firstDemandBodies];
  need(supported.every(o => o.collider?.shape === 'rectangle' && ['fixed_armor_or_spike', 'vertical_armor_slider'].includes(o.mechanic_kind)), 'unsupported protected body; new adapter required');
  need(supported.every(o => !o.motion || o.mechanic_kind === 'vertical_armor_slider') && next.firstDemandBodies.every(o => !o.motion?.dx_px), 'horizontal motion needs a different full-passage capture contract');
  const context=p.currentSuccessorContext,index=next.componentIndex;
  const snapshot={component:map.components[index],bodies:map.obstacles.filter(o=>ownedIndex(o.id)===index),expression:map.design.stageRecoveryProgram.actualExpressions[index]};
  need(context?.schema==='known-exactB-current-successor-context/1'&&context.componentIndex===index&&same(context.current,snapshot)&&hash(snapshot)===context.currentSHA256&&hash(map.routes)===context.routesSHA256,'bound actual successor context differs');
  need(Array.isArray(context.selectedCompanions)&&context.selectedCompanions.every(r=>['H','T'].includes(r))&&new Set(context.selectedCompanions).size===context.selectedCompanions.length,'unsupported successor companion');
  need(digest(context.baseSHA256)&&digest(context.provenance?.acceptedProducerSourceIdentity)&&digest(context.provenance?.acceptedEnvelopeSHA256),'exact companion provenance absent');
  need(context.changed=== (context.currentSHA256!==context.baseSHA256),'changed successor classification differs');
  if(context.changed){
    const a=context.aperture,t=map.design.timedApertureProgram;
    need(same(context.changedBy,['T'])&&context.selectedCompanions.includes('T')&&a?.componentIndex===index&&t?.componentIndex===index,'changed successor requires bound T');
    need(hash(t)===a.programSHA256&&same(unique(map.obstacles,a.sourceId),a.descriptor)&&same(t.descriptor,a.descriptor)&&same(t.runtimeBodyIds,a.runtimeBodyIds)&&same(t.phrase.receivers.map(q=>q.descriptor.id),a.receiverIds),'actual T second pair/receiver binding differs');
  }else need(same(context.changedBy,[])&&context.aperture===null,'unchanged successor cannot claim T refresh');
  return { candidate, source, program: p, bridge, next, routeFacts: rf, currentSuccessorContext:context };
}

function captureWindow(map, program = map.design?.laserProgram) {
  const a = admitProgram(map, program), endTick = a.program.recovery.minimumStopTick;
  // Only the laser is forced for every lifecycle frame. Neighbor rectangles
  // must be present around their own actual full-body passages, checked below.
  need(endTick >= 960 && endTick <= 1800, 'source-derived prefix does not fit current 8–15s combo contract');
  return { name: 'laser', layer: 'combo', startTick: 0, endTick, forceSourceIds: [a.program.sourceId] };
}

function validateRows(trace, window, { requireSource = null } = {}) {
  need(trace.initialState?.tick === 0 && trace.continuity?.startedAtTick === 0 && trace.continuity?.restorationUsed === false, 'continuous real tick-zero evidence required');
  need(Array.isArray(trace.rows) && Array.isArray(trace.bodySamples) && Array.isArray(trace.flapTicks), 'actual rows, bodies and inputs required');
  const rows = trace.rows.filter(r => r[0] >= window.startTick && r[0] <= window.endTick);
  const frames = trace.bodySamples.filter(f => f.tick >= window.startTick && f.tick <= window.endTick);
  need(new Set(rows.map(r => r[0])).size === rows.length && new Set(frames.map(f => f.tick)).size === frames.length, 'duplicate saved ticks');
  need(rows.every((r, i) => !i || r[0] > rows[i - 1][0]) && frames.every((f, i) => !i || f.tick > frames[i - 1].tick), 'saved ticks are not ordered');
  need(trace.flapTicks.every((t, i, a) => Number.isInteger(t) && t >= 0 && t < trace.finalState.tick && (!i || t > a[i - 1])), 'malformed input tape');
  const byRow = new Map(rows.map(r => [r[0], r])), byFrame = new Map(frames.map(f => [f.tick, f])), commands = new Set(trace.flapTicks);
  const end = Math.min(window.endTick, trace.finalState?.tick ?? -1);
  let missingTicks = 0, missingSourceTicks = 0;
  for (let t = window.startTick; t <= end; t++) {
    const row = byRow.get(t), frame = byFrame.get(t);
    if (!row || !frame) { missingTicks++; continue; }
    need(row.length === 8 && [0, 1, 2, 3, 6, 7].every(k => finite(row[k])) && row[0] === t && close(row[7], t / HZ) && [0, 1].includes(+row[4]) && [0, 1].includes(+row[5]), 'malformed actual player row');
    need(row[1] === frame.x && row[2] === frame.y && !!row[4] === commands.has(t - 1), 'actual body/player/input mismatch');
    need(Array.isArray(frame.bodies) && new Set(frame.bodies.map(b => b.id)).size === frame.bodies.length, 'duplicate body identity');
    if (requireSource && !frame.bodies.some(b => b.id === requireSource && b.sourceId === requireSource)) missingSourceTicks++;
  }
  const fullWindow = !missingTicks && !missingSourceTicks && end === window.endTick && rows.every(r => !!r[5]);
  return { status: missingTicks || missingSourceTicks ? 'missing' : end < window.endTick || rows.some(r => !r[5]) ? 'censored' : 'observed', fullWindow, missingTicks, missingSourceTicks, reachedTick: end, rows, frames, byRow, byFrame };
}

function sourceRecords(map, trace, p) {
  const source = unique(map.obstacles, p.sourceId);
  need(source.mechanic_kind === 'laser_scanner' && source.collider?.shape === 'segment', 'source descriptor is not a laser');
  const rows = new Map(trace.rows.map(r => [r[0], r]));
  need(rows.size === trace.rows.length && new Set(trace.bodySamples.map(f => f.tick)).size === trace.bodySamples.length, 'duplicate source/player frames');
  need(trace.rows.every((r, i, all) => !i || r[0] > all[i - 1][0]) && trace.bodySamples.every((f, i, all) => !i || f.tick > all[i - 1].tick), 'source/player frames not ordered');
  const records = [];
  for (const frame of trace.bodySamples) {
    const matches = frame.bodies.filter(b => b.id === p.sourceId || b.sourceId === p.sourceId);
    if (!matches.length) continue;
    need(matches.length === 1, 'ambiguous actual laser source identity');
    const b = matches[0], row = rows.get(frame.tick);
    need(row && row[1] === frame.x && row[2] === frame.y, 'actual laser/player frame mismatch');
    need(b.id === p.sourceId && b.sourceId === p.sourceId && b.kind === 'laser_scanner' && b.shape === 'segment', 'wrong actual laser primitive or identity');
    need(['x', 'y', 'x2', 'y2', 'width'].every(k => finite(b[k])) && b.width > 0, 'missing actual endpoints/width');
    need(close(b.x, source.x) && close(b.x2 - b.x, source.motion.dx_px) && close(b.y2 - b.y, source.motion.dy_px) && b.width === source.collider.width, 'actual capsule dimensions differ from current descriptor');
    need(Math.abs(b.y - source.y) <= Math.abs(source.motion.amplitude_px) + 1e-7, 'actual endpoint outside declared sweep envelope');
    need(['idle', 'warning', 'active', 'cooldown'].includes(b.status) && b.lethal === (b.status === 'active'), 'invalid actual laser lifecycle/lethality');
    // Declared phase boundaries can be checked against the actual phase label;
    // this never calculates a source position or substitutes a projected pose.
    const q = source.timeline, elapsed = frame.tick * (1 / HZ) - q.start_s;
    const phase = elapsed >= 0 ? elapsed % (q.warning_s + q.active_s + q.cooldown_s) : 0;
    const expectedStatus = elapsed < 0 ? 'idle' : phase < q.warning_s ? 'warning' : phase < q.warning_s + q.active_s ? 'active' : 'cooldown';
    need(b.status === expectedStatus, 'actual lifecycle label differs from current authored schedule');
    const bounds = Geometry.runtimeBounds(b), slice = Geometry.capsuleSlice(row[1], b, R);
    records.push({ tick: frame.tick, row, body: b, slice, slab: !!slice, right: row[1] - R > bounds.maxX,
      marginPx: pointMargin(row[1], row[2], b, R), alive: !!row[5] });
  }
  return records;
}

function passage(records) {
  const inside = records.filter(r => r.slab), first = inside[0], last = inside.at(-1);
  const before = first && records.find(r => r.tick === first.tick - 1), after = last && records.find(r => r.tick === last.tick + 1);
  const dense = inside.length > 0 && inside.every((r, i) => !i || r.tick === inside[i - 1].tick + 1);
  const bracketed = !!before && !before.slab && !!after && !after.slab && after.right;
  return { status: !first ? 'not_reached' : !dense ? 'missing' : !bracketed ? 'censored' : 'observed', dense, bracketedWholeBodyPassage: bracketed,
    overlapTicks: inside.map(r => r.tick), first: first ? { tick: first.tick, row: first.row, body: first.body } : null,
    last: last ? { tick: last.tick, row: last.row, body: last.body } : null,
    fullExit: bracketed ? { tick: after.tick, row: after.row, body: after.body } : null };
}

// Deliberately usable for regression on old SAVED laser records, without
// claiming they admit the new program. This never returns current qualification.
function observeActualSource(map, run, trace, p = map.design?.laserProgram) {
  need(p?.sourceId && Array.isArray(trace.rows) && Array.isArray(trace.bodySamples), 'actual source evidence missing');
  const records = sourceRecords(map, trace, p), old = Legacy.observe(map, run, trace), pass = passage(records);
  const active = records.filter(r => r.body.status === 'active' && r.slab);
  const firstSequence = old.transitions?.slice(0, 4) ?? [];
  const lifecyclePassed = ['idle', 'warning', 'active', 'cooldown'].every((s, i) => firstSequence[i]?.status === s && firstSequence[i].lethal === (s === 'active'));
  const actualEndpointTravelPx = active.length ? Math.max(...active.map(r => r.body.y)) - Math.min(...active.map(r => r.body.y)) : null;
  const collisionEvents = (trace.events ?? []).filter(e => e.type === 'death' && (e.id === p.sourceId || e.sourceId === p.sourceId));
  return { ...old, schema: VERSION + '/source', savedSourceSchema: p.schema, currentProgramAdmission: false,
    actualPassage: pass, actualEndpointClearance: { activeCrossingSamples: active.length,
      minimumActiveCapsuleDistancePx: active.length ? Math.min(...active.map(r => r.marginPx)) : null,
      actualEndpointTravelPx, movingBoundaryObserved: active.length > 1 && actualEndpointTravelPx > 0,
      nonlethalOverlapSamples: records.filter(r => r.slab && !r.body.lethal && r.marginPx <= 0).length,
      fixedReplacementTreatedAsMoving: false },
    lifecycle: { passed: lifecyclePassed, firstCycleTransitions: firstSequence, allSavedStatusesConsistent: true, actualPhaseLabelsMatchDeclaredTiming: true,
      coverage: 'Idle, warning, active and cooldown are admitted as distinct actual states; only active bodies require lethal capsule clearance' },
    collisionEvents, sourcePassed: old.status === 'observed' && pass.status === 'observed' && lifecyclePassed && old.warning.runtimeAvailableAtLeast065Seconds === true && active.length > 1 && actualEndpointTravelPx > 0 && active.every(r => r.alive && r.marginPx > 0) && old.recovery.alive === true && !collisionEvents.length,
    actualSourceSide: null, sourceSideInterpretation: 'Authored source side refers to replaced fixed island; no invented capsule-side or turn claim' };
}

function rectanglePass(coverage, descriptor, events, side = null) {
  const records = [], id = descriptor.id;
  let missingAtRequiredSlab = 0;
  for (const row of coverage.rows) {
    const frame = coverage.byFrame.get(row[0]); if (!frame) continue;
    const bs = frame.bodies.filter(b => b.id === id || b.sourceId === id);
    // These supported rectangles have fixed x. This is a presence obligation,
    // not a body pose synthesized from the descriptor.
    const required = row[1] + R + 1.25 >= descriptor.x && row[1] - R - 1.25 <= descriptor.x + descriptor.collider.w;
    if (!bs.length) { if (required) missingAtRequiredSlab++; continue; }
    need(bs.length === 1, 'ambiguous protected body ' + id);
    const b = bs[0];
    need(b.id === id && (b.sourceId === undefined || b.sourceId === id) && b.kind === descriptor.mechanic_kind && b.shape === 'rectangle' && ['x', 'y', 'w', 'h'].every(k => finite(b[k])) && b.x === descriptor.x && b.w === descriptor.collider.w && b.h === descriptor.collider.h, 'actual rectangle identity/dimensions differ: ' + id);
    need(b.lethal === true && b.status === 'active', 'protected rectangle lifecycle differs: ' + id);
    if (!descriptor.motion) need(b.y === descriptor.y, 'fixed boundary recorded as moving: ' + id);
    const bounds = Geometry.runtimeBounds(b), slab = row[1] + R >= bounds.minX && row[1] - R <= bounds.maxX;
    const intendedSide = side === null || (side === 'upper' ? row[2] < bounds.minY : row[2] > bounds.maxY);
    records.push({ tick: row[0], row, body: b, slab, right: row[1] - R > bounds.maxX, marginPx: rectMargin(row, b), intendedSide });
  }
  const pass = passage(records), inside = records.filter(r => r.slab), deathEvents = events.filter(e => e.type === 'death' && (e.id === id || e.sourceId === id));
  const status = missingAtRequiredSlab ? 'missing' : pass.status;
  return { ...pass, status, sourceId: id, requestedSide: side, descriptorKind: descriptor.mechanic_kind,
    fixedBoundary: descriptor.motion === null, movingBoundaryClaim: false,
    missingAtRequiredSlab, minimumActualBodyMarginPx: inside.length ? Math.min(...inside.map(r => r.marginPx)) : null,
    wrongSideTicks: inside.filter(r => !r.intendedSide).map(r => r.tick), deathEvents,
    sourceIdentityInference: 'Only missing sourceId of unique same-ID matching rectangle is tolerated; no actual pose fields changed',
    passed: status === 'observed' && inside.every(r => r.row[5] && r.marginPx > 0 && r.intendedSide) && !deathEvents.length };
}

function reduce(map, run, trace, program = map.design?.laserProgram, options = {}) {
  try {
    const a = admitProgram(map, program), p = a.program, window = captureWindow(map, p);
    need(run.mapHash === hash(map) && trace.mapHash === run.mapHash && run.geometryHash === hash({ obstacles: map.obstacles, routes: map.routes, components: map.components }), 'saved map/geometry identity differs');
    need(digest(run.sourceManifestHash) && trace.sourceManifestHash === run.sourceManifestHash && digest(run.executionDependencyHash) && trace.executionDependencyHash === run.executionDependencyHash, 'saved source/capture closure identity absent or differs');
    if (options.expectedSourceManifestHash) need(run.sourceManifestHash === options.expectedSourceManifestHash, 'explicit frozen source identity differs');
    need(run.role === trace.role && ['main', 'branch'].includes(run.route) && (!trace.route || trace.route === run.route), 'saved route/role mismatch');
    need(trace.conditionHash === run.conditionHash && hash(trace.flapTicks) === run.inputSHA256 && trace.inputSHA256 === run.inputSHA256, 'saved input/condition identity differs');
    const physical = m => Object.fromEntries(['y', 'vy', 'lead', 'phase', 'adjacency', 'seed'].map(k => [k, m?.[k]]));
    need(same(physical(run.condition), physical(map.condition)) && hash(physical(run.condition)) === run.conditionHash, 'saved/current six-field physical condition differs');
    need(hash(trace.initialState) === run.initialStateSHA256 && hash(trace.finalState) === run.finalStateSHA256 && trace.stateSequenceSHA256 === run.stateSequenceSHA256 && same(trace.events, trace.finalState.events), 'saved state/event chain differs');
    need(run.terminalTick === trace.finalState?.tick && run.ticks === run.completedTicks && run.completedTicks === run.terminalTick && trace.continuity?.prefixPhysicalTicksCharged === run.ticks && run.integrity?.exactTickProgression === true, 'charged continuous tick-zero progression differs');
    need(same(run.windows, trace.windows) && run.windows.some(w => same(w, window)), 'explicit source-derived dense capture window/forced laser missing');
    const coverage = validateRows(trace, window, { requireSource: a.candidate ? p.sourceId : null });
    const view = { ...trace, rows: coverage.rows, bodySamples: coverage.frames, retentionWindow: window };
    const rf = a.routeFacts.find(q => q.route === run.route), events = trace.events ?? [];
    const source = a.candidate ? observeActualSource(map, run, view, p) : rectanglePass(coverage, a.source, events, rf.source.side);
    const receiver = rectanglePass(coverage, p.phrase.receiver, events, rf.receiver.side);
    const extras = [...new Map(p.phrase.ownerBodies.filter(o => ![p.sourceId, p.phrase.receiver.id].includes(o.id)).map(o => [o.id, o])).values()];
    const remainingOwnerBodies = extras.map(o => rectanglePass(coverage, o, events));
    const nextDemand = a.next.firstDemandBodies.map(o => rectanglePass(coverage, o, events));
    const cross = x => coverage.rows.find(r => r[1] > x) ?? null;
    const bridge = { entry: cross(a.bridge.startX), exit: cross(a.bridge.boundaryX) };
    const receiverRouteExit = cross(rf.receiver.segment.endX);
    const collisionEvents = events.filter(e => e.type === 'death' && e.tick >= window.startTick && e.tick <= window.endTick);
    const sourcePassed = a.candidate ? source.sourcePassed : source.passed;
    const actualRelationPassed = coverage.fullWindow && sourcePassed && [receiver, ...remainingOwnerBodies, ...nextDemand].every(q => q.passed) && !!bridge.entry?.[5] && !!bridge.exit?.[5] && !!receiverRouteExit?.[5] && !collisionEvents.length && !run.error && !trace.retention?.qualificationBlocked;
    const { rows, frames, byRow, byFrame, ...summaryCoverage } = coverage;
    return { schema: VERSION, status: summaryCoverage.status, candidate: a.candidate, sourceId: p.sourceId, window,
      admission: { currentProgramSchema: PROGRAM, mapHash: run.mapHash, sourceManifestHash: run.sourceManifestHash, executionDependencyHash: run.executionDependencyHash,
        sourceDescriptorSHA256: hash(a.source), ledgerAndFrozenClosureAuthentication: 'Required from caller; this pure reducer does not read files or authenticate a commit' },
      coverage: summaryCoverage, source, receiver, remainingOwnerBodies, nextDemand, packageBridge: bridge, receiverRouteExit,
      sourceReferenceSide: rf.source.side, receiverSide: rf.receiver.side, routeRelation: 'same-side source-reference to immediate receiver; separated routes',
      actualLaserLifecycle: a.candidate ? source.lifecycle : { status: 'not_applicable', reason: 'Parent is the unchanged fixed rectangle, never labeled a moving boundary' },
      pairedActualInputs: options.parentTrace && a.candidate ? Effects.observePair(map, run, view, options.parentTrace) : null,
      collisionEvents, actualRelationPassed, rawTaskPass: run.taskPass ?? null, changedGuardExclusions: [],
      inheritedRouteGuardsChanged: false, fullCourseQualification: null, warningCausalResponse: null, naturalRouteChoice: null, humanFun: null,
      limits: ['Saved integer-tick capsule clearance is not an independent continuous collision certificate; recorded substep deaths are authoritative', 'Current exact-B qualification still requires its own frozen physical runs and original whole-course guards; old b003 evidence is geometry regression only'] };
  } catch (error) { return { schema: VERSION, status: 'invalid', reason: error.message, actualRelationPassed: false }; }
}

module.exports = { VERSION, PROGRAM, admitProgram, captureWindow, validateRows, observeActualSource, reduce, compareInputs: Legacy.compareInputs };
