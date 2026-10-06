'use strict';
// Only the implemented Hammer -> warning diagonal -> inherited turn program.
const Old = require('./a012-style-registry.cjs');
const C = require('./recovery-canonical.cjs');
const Hammer = require('./b002-swing-hammer.cjs');
const Laser = require('./b003-warning-laser-v2.cjs');
const Site = require('./b004-island-effect-patch.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const same = require('node:util').isDeepStrictEqual;
const clone = structuredClone;
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const CONFIG = freeze(require('./configs/b004-mechanic-relay-v1.json'));
const STYLE = 'hammer-warning-turn-relay';
const need = (v, why) => { if (!v) throw Error('Mechanic relay: ' + why); };
function plan(base, hammerProgram, program = CONFIG.program) {
  Site.exactBase(base);
  need(same(program, CONFIG.program), 'unsupported typed program or selector');
  need(same(hammerProgram, Hammer.apply(base).design.hammerProgram), 'requires exact b002 hammer program');
  const h = hammerProgram, all = Site.sites(base), component = base.components[h.componentIndex];
  need(component.relations.some(r => r.type === 'same-side-hold-then-turn'), 'requires inherited hold-then-turn phrase');
  const phrase = all.filter(s => s.componentIndex === h.componentIndex), hi = phrase.findIndex(s => s.sourceId === h.sourceId);
  need(hi >= 0, 'hammer origin is not a declared ordinary site');
  const hammer = phrase[hi], rejectedSites = [];
  for (let i = hi + 1; i < phrase.length - 1; i++) {
    const site = phrase[i], receiver = phrase[i + 1];
    const sidesHold = phrase.slice(hi + 1, i + 1).every(s => s.routes.every((r, j) => r.side === hammer.routes[j].side));
    const sidesTurn = receiver.routes.every((r, j) => r.side !== site.routes[j].side);
    if (!sidesHold || !sidesTurn) { rejectedSites.push({sourceId: site.sourceId, reason: 'actual route sides do not form hold then turn'}); continue; }
    let patch;
    try { patch = Site.laserAt(base, site, Laser.CONFIG.operation); }
    catch (error) { rejectedSites.push({sourceId: site.sourceId, reason: error.message}); continue; }
    const p = patch.laserProgram;
    const H = (h.wholeBodySweepX[1] - base.initial_player.x) / F.VX;
    const W = p.nominal.warningStartSeconds, A = p.nominal.activeStartSeconds, L = p.nominal.exitSeconds;
    const receiverEntry = (receiver.wholeBodyX[0] - base.initial_player.x) / F.VX;
    const receiverExit = (receiver.wholeBodyX[1] - base.initial_player.x) / F.VX;
    const receiverRouteExit = Math.max(...receiver.routes.map(r => (r.segment.endX - base.initial_player.x) / F.VX));
    // Separation is a geometric ordering claim only. No invented reaction-time threshold.
    if (!(H < W && W < A && A < p.nominal.entrySeconds && L < receiverEntry &&
      p.downstreamRecovery.nextIslandSourceId === receiver.sourceId)) {
      rejectedSites.push({sourceId: site.sourceId, reason: 'warning/order/receiver geometry is not distinct'}); continue;
    }
    const protectedIntervals = [
      {kind: 'hammer-exit-to-laser-entry', x: [h.wholeBodySweepX[1], p.wholeBodyHorizontalSpan[0]]},
      {kind: 'laser-exit-to-receiver-entry', x: [p.wholeBodyHorizontalSpan[1], receiver.wholeBodyX[0]]}
    ];
    need(protectedIntervals.every(q => q.x[0] < q.x[1] && !base.obstacles.some(o =>
      ![h.sourceId, site.sourceId, receiver.sourceId].includes(o.id) && o.collider.shape === 'rectangle' &&
      o.x - F.R < q.x[1] && o.x + o.collider.w + F.R > q.x[0])), 'another body intrudes into declared recovery interval');
    return {patch, relayProgram: {schema: 'hammer-warning-turn-relay/1', type: program.type,
      selector: program.selector, componentIndex: h.componentIndex,
      sources: {hammer: h.sourceId, laser: site.sourceId, receiver: receiver.sourceId},
      recipes: {hammer: Hammer.CONFIG.version, laser: Laser.CONFIG.version},
      routeRelations: hammer.routes.map((r, j) => ({route: r.route, sides: [r.side, site.routes[j].side, receiver.routes[j].side],
        targets: [r.segment.targetY, site.routes[j].segment.targetY, receiver.routes[j].segment.targetY]})),
      orderedSteps: [
        {type: 'qualified-recipe-hammer', sourceId: h.sourceId},
        {type: 'observe-continuous-recovery-and-advance-cue', fromSourceId: h.sourceId, toSourceId: site.sourceId},
        {type: 'frozen-recipe-diagonal-warning-crossing', sourceId: site.sourceId},
        {type: 'inherited-opposite-side-receiver', sourceId: receiver.sourceId}
      ],
      geometricSeconds: {hammerConservativeExit: H, firstWarning: W, firstActive: A,
        laserWholeBodyEntry: p.nominal.entrySeconds, laserCooldown: p.nominal.cooldownStartSeconds,
        laserWholeBodyExit: L, receiverWholeBodyEntry: receiverEntry, receiverWholeBodyExit: receiverExit,
        receiverRouteExit, hammerExitToWarning: W - H, hammerExitToActive: A - H,
        warningAfterHammerExit: A - Math.max(H, W), warningOverlappingHammerThreat: Math.max(0, Math.min(A, H) - W),
        laserExitToReceiverEntry: receiverEntry - L},
      timingInterpretation: 'nominal geometry, not measured recovery or human reaction thresholds; cue availability and later active encounter are separate quantities',
      protectedIntervals, receiver: clone(receiver), rejectedSites,
      stateTransfer: {mode: 'continuous-from-tick-zero', resets: false, absoluteWorldClock: true,
        requiredMeasurements: ['actual hammer disk/arm exit', 'y/vy/input between hazards', 'first runtime-visible warning',
          'actual active capsule crossing', 'laser full-body exit', 'receiver checkpoint and opposite-side passage', 'downstream recovery'],
        pendingControllerQueue: 'retained in live closure; exported snapshot may be unavailable'},
      qualification: null, humanFun: null,
      limits: ['b003 recipe acceptance is conditional; site and combination unqualified', 'exact default cumulative geometry only',
        'one same-component hold-then-turn phrase only', 'no arbitrary operator programs or macro reorganization']}};
  }
  throw Error('Mechanic relay: no distinct eligible hold-then-turn island; generation fails without resampling: ' + JSON.stringify(rejectedSites));
}
function mergeChecked(base, exactHammerMap, laserPatch) {
  Site.exactBase(base);
  const expectedHammer = Hammer.apply(base);
  need(same(exactHammerMap, expectedHammer), 'hammer input has undeclared changes or wrong ancestry');
  const selection = plan(base, expectedHammer.design.hammerProgram);
  need(same(laserPatch, selection.patch), 'patch/source/read-dependency/selection conflict');
  const {componentIndex, sourceId, before, after, relationAppend, laserProgram} = laserPatch;
  const h = expectedHammer.design.hammerProgram;
  need(h.componentIndex === componentIndex && h.sourceId !== sourceId, 'requires distinct targets in same declared component');
  need(new Set(base.obstacles.map(o => o.id)).size === base.obstacles.length, 'duplicate obstacle IDs');
  need(!base.obstacles.some(o => o.id === h.sourceId + ':arm'), 'hammer body ID collision');
  need(!base.design.hammerProgram && !base.design.laserProgram && !base.design.relayProgram, 'duplicate program application');
  const m = clone(exactHammerMap), index = m.obstacles.findIndex(o => o.id === sourceId);
  need(index >= 0 && same(m.obstacles[index], before) && after.id === before.id, 'before descriptor or identity conflict');
  const prefix = base.components[componentIndex].relations, current = m.components[componentIndex].relations;
  need(current.length === prefix.length + 1 && same(current.slice(0, prefix.length), prefix) &&
    current.at(-1).type === 'ordinary-island-positive-swing' && current.at(-1).sourceId === h.sourceId,
    'only exact original prefix plus one hammer relation may be extended');
  need(!current.some(r => r.sourceId === sourceId), 'duplicate relation sourceId');
  m.obstacles[index] = clone(after);
  m.components[componentIndex].relations = [...clone(current), clone(relationAppend)];
  m.design.laserProgram = clone(laserProgram); m.design.relayProgram = clone(selection.relayProgram);
  m.design.components = m.components;
  m.id = m.mapId = CONFIG.version + '-' + m.seed;
  m.design.generatorVersion = CONFIG.version; m.design.qualification = CONFIG.qualification;
  need(same(m.routes, base.routes), 'inherited route semantics changed');
  need(same(m.design.hammerProgram, expectedHammer.design.hammerProgram), 'hammer program changed');
  need(same(m.obstacles.filter(o => o.id !== sourceId), expectedHammer.obstacles.filter(o => o.id !== sourceId)), 'other obstacles changed');
  for (const route of ['main', 'branch']) Contract.validate(m, route);
  F.validate(m); return m;
}
function generate(config, input = {}) {
  need(same(config, CONFIG), 'configuration changed');
  const base = Old.generate(Old.CONFIG, C.entry(input));
  const hammer = Hammer.apply(base);
  return mergeChecked(base, hammer, plan(base, hammer.design.hammerProgram).patch);
}
module.exports = {CONFIG, STYLE, plan, mergeChecked, generate};
