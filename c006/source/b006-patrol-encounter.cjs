'use strict';
// One finite pure-construction recipe. Never executes an engine/controller,
// reads evidence/holdouts, selects by condition identity, or mutates a parent.
const Base = require('./a012-style-registry.cjs');
const C = require('./recovery-canonical.cjs');
const Site = require('./b004-island-effect-patch.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const same = require('node:util').isDeepStrictEqual;
const clone = structuredClone;
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const CONFIG = freeze(require('./configs/b006-patrol-encounter-v1.json'));
const STYLE = 'diagonal-patrol-turn-encounter';
const need = (v, why) => { if (!v) throw Error('Patrol encounter: ' + why); };

// Descriptor geometry for prospective construction only. Actual observation MUST
// read saved engine bodies and must not substitute these predicted positions.
function descriptorCenter(o, seconds) {
  const q = o.motion, angle = seconds * 2 * Math.PI / q.period_s + q.phase_rad;
  const z = (1 + Math.sin(angle)) / 2, rate = Math.PI / q.period_s * Math.cos(angle);
  return {x: o.x + o.collider.w / 2 + q.dx_px * z,
    y: o.y + o.collider.h / 2 + q.dy_px * z,
    vx: q.dx_px * rate, vy: q.dy_px * rate};
}
function select(base) {
  Site.exactBase(base);
  const all = Site.sites(base);
  for (const site of all) {
    const component = base.components[site.componentIndex];
    if (!component.relations.some(r => r.type === 'same-side-hold-then-turn')) continue;
    const phrase = all.filter(s => s.componentIndex === site.componentIndex), i = phrase.findIndex(s => s.sourceId === site.sourceId);
    if (i < 1 || i + 1 >= phrase.length) continue;
    const previous = phrase[i - 1], receiver = phrase[i + 1];
    if (!site.routes.every((r, j) => r.route === previous.routes[j].route && r.route === receiver.routes[j].route &&
      r.side === previous.routes[j].side && r.side !== receiver.routes[j].side)) continue;
    // First semantic site is selected before geometric checks: no seed retries,
    // no outcome search and no fallback to another site on construction failure.
    return {previous, site, receiver};
  }
  throw Error('Patrol encounter: no declared consecutive hold-to-turn phrase');
}
function plan(base, operation = CONFIG.operation) {
  need(same(operation, CONFIG.operation), 'changed recipe/selector requires new version');
  Site.exactBase(base);
  need(F.R === 10 && F.VX === 150 && F.DT === 1 / 120 && F.G === 820 && F.FLAP === -290, 'immutable physics changed');
  const {previous, site, receiver} = select(base), prior = site.obstacle, op = operation;
  const [upper, lower] = site.routes.slice().sort((a, b) => a.segment.targetY - b.segment.targetY);
  const diameter = op.diameterPx, radius = diameter / 2, dx = op.horizontalTravelPx;
  const centerX = prior.x + prior.collider.w / 2, centerSeconds = (centerX - base.initial_player.x) / F.VX;
  const patrol = {...clone(prior), mechanic_kind: 'patrol_spike_rotor',
    x: centerX - dx / 2 - radius, y: upper.segment.targetY - radius,
    collider: {shape: 'circle', w: diameter, h: diameter},
    motion: {dx_px: dx, dy_px: lower.segment.targetY - upper.segment.targetY,
      period_s: op.periodSeconds, phase_rad: -centerSeconds * 2 * Math.PI / op.periodSeconds + base.condition.phase},
    timeline: null, effect_region: null};
  const expandedRadius = radius + F.R;
  const sweep = {minX: patrol.x, maxX: patrol.x + dx + diameter,
    minY: patrol.y, maxY: patrol.y + patrol.motion.dy_px + diameter};
  const wholeBodyX = [sweep.minX - F.R, sweep.maxX + F.R];
  const peakDiskVx = dx * Math.PI / op.periodSeconds;
  need(dx > 0 && patrol.motion.dy_px > 0 && peakDiskVx < F.VX, 'requires diagonal path and monotone relative-x traversal');
  need(sweep.minY - F.R > 30 && sweep.maxY + F.R < base.height - 30, 'physical outer routes must remain open');
  need(previous.wholeBodyX[1] < wholeBodyX[0] && wholeBodyX[1] < receiver.wholeBodyX[0] &&
    receiver.wholeBodyX[1] < site.connector.startX, 'ordered whole-body hold/patrol/receiver/recovery required');
  const protectedIntervals = [
    {type: 'previous-exit-to-patrol-sweep', x: [previous.wholeBodyX[1], wholeBodyX[0]]},
    {type: 'patrol-sweep-to-receiver-entry', x: [wholeBodyX[1], receiver.wholeBodyX[0]]}
  ];
  // This ordinary phrase contains only static rectangles at these cuts. Refuse
  // rather than assume a safe envelope for any undeclared intervening mechanic.
  const local = base.obstacles.filter(o => ![prior.id, previous.sourceId, receiver.sourceId].includes(o.id) &&
    o.x + o.collider.w + F.R > previous.wholeBodyX[1] && o.x - F.R < receiver.wholeBodyX[1]);
  need(local.length === 0, 'another body overlaps the declared encounter/recovery x domain');
  const lo = (wholeBodyX[0] - base.initial_player.x) / F.VX;
  const hi = (wholeBodyX[1] - base.initial_player.x) / F.VX;
  const signedX = t => base.initial_player.x + F.VX * t - descriptorCenter(patrol, t).x;
  const cross = value => {
    let a = lo, b = hi;
    need(signedX(a) <= value && signedX(b) >= value, 'relative traversal root is not bracketed');
    for (let n = 0; n < 64; n++) { const mid = (a + b) / 2; if (signedX(mid) < value) a = mid; else b = mid; }
    return (a + b) / 2;
  };
  const occupancy = {entrySeconds: cross(-expandedRadius), centerCrossingSeconds: cross(0), exitSeconds: cross(expandedRadius)};
  const entryCenter = descriptorCenter(patrol, occupancy.entrySeconds), exitCenter = descriptorCenter(patrol, occupancy.exitSeconds);
  const program = {schema: 'hold-diagonal-patrol-opposite-receiver/1', sourceId: prior.id,
    componentIndex: site.componentIndex, constructionParent: clone(CONFIG.constructionParent), operation: clone(op),
    selector: op.selector, sources: {previous: previous.sourceId, patrol: prior.id, receiver: receiver.sourceId},
    replacement: clone(prior), previous: clone(previous), site: clone(site), receiver: clone(receiver),
    physicalBodyIds: [prior.id], physicalSweepBounds: sweep, wholeBodySweepX: wholeBodyX,
    trackCenterEndpoints: [{x: patrol.x + radius, y: patrol.y + radius},
      {x: patrol.x + dx + radius, y: patrol.y + patrol.motion.dy_px + radius}],
    nominal: {sourceCenterSeconds: centerSeconds, ...occupancy,
      occupancySeconds: occupancy.exitSeconds - occupancy.entrySeconds,
      diskCenterAtEntry: entryCenter, diskCenterAtExit: exitCenter,
      diskVerticalTravelDuringOverlapPx: exitCenter.y - entryCenter.y,
      previousWholeBodyExitSeconds: (previous.wholeBodyX[1] - base.initial_player.x) / F.VX,
      conservativeSweepEntrySeconds: lo, conservativeSweepExitSeconds: hi,
      receiverWholeBodyEntrySeconds: (receiver.wholeBodyX[0] - base.initial_player.x) / F.VX,
      receiverWholeBodyExitSeconds: (receiver.wholeBodyX[1] - base.initial_player.x) / F.VX,
      receiverRouteExitSeconds: (Math.max(...receiver.routes.map(r => r.segment.endX)) - base.initial_player.x) / F.VX,
      interpretation: 'analytic descriptor geometry under fixed vx; not executed states or measured action'},
    relativeTraversal: {signedCoordinate: 'bird.x - actualDiskCenter.x',
      entryBoundary: -expandedRadius, exitBoundary: expandedRadius,
      peakDiskVxPxPerSecond: peakDiskVx, minimumBirdMinusDiskVxPxPerSecond: F.VX - peakDiskVx,
      meaning: 'strictly increasing signed x at fixed vx guarantees one geometric pass; exact disk avoidance is a separate y-dependent question'},
    protectedIntervals,
    receiverInterface: {routes: site.routes.map((r, j) => ({route: r.route,
      sides: [previous.routes[j].side, r.side, receiver.routes[j].side],
      targets: [previous.routes[j].segment.targetY, r.segment.targetY, receiver.routes[j].segment.targetY]})),
      sweepExitToReceiverDistancePx: receiver.wholeBodyX[0] - wholeBodyX[1],
      sweepExitToReceiverSeconds: (receiver.wholeBodyX[0] - wholeBodyX[1]) / F.VX,
      requiredObservation: 'actual signed disk exit; continuous y/vy/input; actual opposite-side receiver checkpoint/body exit; recovery after route exit'},
    actionHypothesis: 'a forward/downward moving disk can share the bird horizontal station while crossing lane heights; an upper lift or lower delayed/advanced turn then feeds the opposite-side receiver',
    mechanismDifference: 'one translated circle along a diagonal track, no pivot/arm or active/cooldown; disk x speed changes relative occupation while disk y changes the safe side; rotation is cosmetic and contributes no evidence',
    routePolicy: 'all existing route segments/bands/checkpoints/connectors/contact/events/exits remain exact; these are requested witnesses, not forced choices or physical margins',
    controllerLimits: ['existing assigned-route MPC forecasts live body AABBs; extra AABB avoidance is not disk demand',
      'existing controller can forecast this translated circle without a new controller; adequacy remains untested',
      'H1 and H1-slow remain diagnostic; neither success nor failure is a fun veto'],
    stateTransfer: {mode: 'continuous-from-tick-zero', resets: false, absoluteWorldClock: true,
      pendingQueue: 'retained in the existing live closure; no exported restorable queue claimed'},
    qualification: null, humanFun: null};
  return {schema: 'default-island-patrol-patch/1', componentIndex: site.componentIndex,
    sourceId: prior.id, before: clone(prior), after: patrol, patrolProgram: program,
    relationAppend: {type: op.type, sourceId: prior.id, previousSourceId: previous.sourceId,
      receiverSourceId: receiver.sourceId, orderedSteps: ['same-side-establishment', 'diagonal-relative-pass', 'opposite-side-receiver']},
    readDependencies: {routes: clone(base.routes), component: clone(base.components[site.componentIndex]),
      condition: clone(base.condition), initialPlayer: clone(base.initial_player), height: base.height,
      previous: clone(previous), receiver: clone(receiver)}};
}
function mergeChecked(base, patch) {
  Site.exactBase(base);
  need(same(patch, plan(base)), 'patch/source/read-dependency/selection conflict');
  need(new Set(base.obstacles.map(o => o.id)).size === base.obstacles.length, 'duplicate source identity');
  need(!base.design.patrolProgram, 'duplicate application');
  const m = clone(base), index = m.obstacles.findIndex(o => o.id === patch.sourceId);
  need(index >= 0 && same(m.obstacles[index], patch.before) && patch.after.id === patch.before.id, 'before descriptor mismatch');
  const c = m.components[patch.componentIndex];
  need(!c.relations.some(r => r.sourceId === patch.sourceId), 'relation source conflict');
  m.obstacles[index] = clone(patch.after); c.relations.push(clone(patch.relationAppend));
  m.design.patrolProgram = clone(patch.patrolProgram); m.design.components = m.components;
  m.id = m.mapId = CONFIG.version + '-' + m.seed;
  m.design.generatorVersion = CONFIG.version; m.design.qualification = CONFIG.qualification;
  need(same(m.routes, base.routes), 'inherited route interface changed');
  need(same(m.obstacles.filter(o => o.id !== patch.sourceId), base.obstacles.filter(o => o.id !== patch.sourceId)), 'undeclared obstacle changed');
  for (const route of ['main', 'branch']) Contract.validate(m, route);
  F.validate(m); return m;
}
function apply(base, operation = CONFIG.operation) { return mergeChecked(base, plan(base, operation)); }
function generate(config, input = {}) {
  need(same(config, CONFIG), 'changed config requires new candidate');
  return apply(Base.generate(Base.CONFIG, C.entry(input)));
}
module.exports = {CONFIG, STYLE, select, plan, mergeChecked, apply, generate, descriptorCenter};
