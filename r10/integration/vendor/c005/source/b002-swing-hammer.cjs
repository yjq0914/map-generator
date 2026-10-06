'use strict';
// Pure construction. Geometry is derived from the earliest ordinary-wave island;
// no experimental identity, outcomes, controller runs, or stored maps are read.
const Old = require('./a012-style-registry.cjs');
const C = require('./recovery-canonical.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const same = require('node:util').isDeepStrictEqual;
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const CONFIG = freeze(require('./configs/b002-swing-hammer-v1.json'));
const STYLE = 'early-swinging-hammer';
const need = (v, s) => { if (!v) throw Error('Swing hammer: ' + s); };
function target(m) {
  const candidates = m.components.flatMap((c, componentIndex) => {
    if (c.theme !== 'wave' || !c.relations.some(r => r.type === 'whole-body-exit-route-domain')) return [];
    return m.obstacles.filter(o => o.mechanic_kind === 'fixed_armor_or_spike' && o.collider.shape === 'rectangle' &&
      o.interaction?.lethal === true && o.motion === null && o.timeline === null && o.effect_region === null &&
      o.x > c.startX && o.x + o.collider.w < m.routes.main.connectors[componentIndex].startX &&
      o.y >= 100 && o.y + o.collider.h <= m.height - 100 && o.collider.h <= 60)
      .map(o => ({componentIndex, obstacle: o}));
  }).sort((a, b) => a.obstacle.x - b.obstacle.x || a.obstacle.id.localeCompare(b.obstacle.id));
  need(candidates.length, 'no ordinary island in declared domain');
  return candidates[0];
}
function apply(parent, operation = CONFIG.operation) {
  need(same(operation, CONFIG.operation), 'changed operation requires new frozen candidate');
  need(same(parent, Old.generate(Old.CONFIG, C.entry(parent.condition))), 'requires exact declared construction parent');
  need(F.R === 10 && F.VX === 150 && F.DT === 1 / 120, 'frozen physical constants changed');
  const m = structuredClone(parent), {componentIndex, obstacle: prior} = target(parent), op = operation;
  const pivot = {x: prior.x + prior.collider.w / 2, y: prior.y + prior.collider.h / 2 - op.pivotAboveIslandCenterPx};
  const encounterSeconds = (pivot.x - m.initial_player.x) / F.VX;
  const phase = op.nominalPivotPhaseRad - encounterSeconds * 2 * Math.PI / op.periodSeconds;
  const hammer = {...structuredClone(prior), mechanic_kind: 'swing_armor_hammer', x: pivot.x, y: pivot.y,
    collider: {shape: 'circle', w: op.headDiameterPx, h: op.headDiameterPx},
    motion: {length_px: op.lengthPx, amplitude_rad: op.amplitudeRad, period_s: op.periodSeconds,
      phase_rad: phase, arm_width_px: op.armWidthPx}, timeline: null, effect_region: null};
  m.obstacles[m.obstacles.findIndex(o => o.id === prior.id)] = hammer;
  const halfSweep = Math.sin(op.amplitudeRad) * op.lengthPx + op.headDiameterPx / 2;
  const sweep = {minX: pivot.x - halfSweep, maxX: pivot.x + halfSweep,
    minY: Math.min(pivot.y - op.armWidthPx / 2, pivot.y + Math.cos(op.amplitudeRad) * op.lengthPx - op.headDiameterPx / 2),
    maxY: pivot.y + op.lengthPx + op.headDiameterPx / 2};
  need(sweep.minX - F.R > m.components[componentIndex].startX && sweep.maxX + F.R < m.routes.main.connectors[componentIndex].startX,
    'hammer sweep must precede real recovery connector');
  const next = parent.obstacles.filter(o => o.x > prior.x && o.collider.shape === 'rectangle' && o.y >= 100 && o.y + o.collider.h <= m.height - 100)
    .sort((a,b) => a.x-b.x)[0];
  need(next && next.x - F.R > sweep.maxX + F.R, 'whole-body post-hammer recovery interval required');
  const program = {schema: 'ordinary-island-positive-swing/1', sourceId: prior.id, componentIndex,
    constructionParent: CONFIG.constructionParent, replacement: structuredClone(prior), operation: structuredClone(op),
    pivot, authoredPhaseRad: phase, nominalPivotCrossingSeconds: encounterSeconds,
    phaseAlignment: 'positive maximum angle at nominal fixed-VX pivot crossing; absolute world clock retained',
    physicalBodyIds: [prior.id, prior.id + ':arm'], physicalSweepBounds: sweep,
    wholeBodySweepX: [sweep.minX - F.R, sweep.maxX + F.R],
    downstreamRecovery: {startX: sweep.maxX + F.R, nextIslandEntryX: next.x - F.R,
      availableDistancePx: next.x - F.R - sweep.maxX - F.R,
      scope: 'authored free horizontal interval; actual successful exit and state recovery still unmeasured'},
    actionHypothesis: 'lethal upper arm intrudes into inherited upper island corridor; upper route prepares or times a lift while lower route passes beneath the moving disk, then resumes its next inherited island approach',
    routePolicy: 'all route targets, bands, checkpoints, connectors, contact and final domains are unchanged; inherited rectangle bands are planning guards, not proof of hammer clearance',
    actualGeometryPolicy: 'only saved runtime circle/capsule geometry and exact collision semantics count as physical demand; AABB planning avoidance alone cannot qualify the action hypothesis',
    controllerLimits: ['assigned routes use conservative AABB forecasts', 'assigned segment x+w broadphase misses leftward extent; first encounter is designed in positive-angle half-cycle', 'H1 exact shapes are diagnostic, not human-quality evidence'],
    qualification: null, humanFun: null};
  m.components[componentIndex].relations.push({type: 'ordinary-island-positive-swing', sourceId: prior.id,
    nominalPivotCrossingSeconds: encounterSeconds, realDownstreamRecoveryX: [program.downstreamRecovery.startX, program.downstreamRecovery.nextIslandEntryX]});
  m.design.hammerProgram = program; m.design.components = m.components;
  m.id = m.mapId = CONFIG.version + '-' + m.seed; m.design.generatorVersion = CONFIG.version;
  m.design.qualification = CONFIG.qualification;
  need(same(m.routes, parent.routes), 'inherited route semantics changed');
  for (const route of ['main', 'branch']) Contract.validate(m, route);
  F.validate(m); return m;
}
function generate(config, input = {}) {
  need(same(config, CONFIG), 'configuration changed');
  return apply(Old.generate(Old.CONFIG, C.entry(input)));
}
module.exports = {CONFIG, STYLE, target, apply, generate};
