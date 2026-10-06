'use strict';
// Pure generation from authored island/route relations, never a saved trajectory.
const Old = require('./a012-style-registry.cjs');
const C = require('./recovery-canonical.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const same = require('node:util').isDeepStrictEqual;
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const CONFIG = freeze(require('./configs/b003-warning-laser-v2.json'));
const STYLE = 'early-diagonal-warning-laser';
const need = (v, s) => { if (!v) throw Error('Warning laser: ' + s); };
function routeAt(m, route, x) { return m.routes[route].segments.find(s => s.endX > x); }
function target(m) {
  const candidates = m.components.flatMap((c, componentIndex) => {
    if (c.theme !== 'wave' || !c.relations.some(r => r.type === 'whole-body-exit-route-domain')) return [];
    return m.obstacles.filter(o => o.mechanic_kind === 'fixed_armor_or_spike' &&
      o.collider.shape === 'rectangle' && o.interaction?.lethal === true && o.motion === null &&
      o.timeline === null && o.effect_region === null && o.x > c.startX &&
      o.x + o.collider.w < m.routes.main.connectors[componentIndex].startX &&
      o.y >= 100 && o.y + o.collider.h <= m.height - 100 && o.collider.h <= 60)
      .map(obstacle => {
        const x = obstacle.x + obstacle.collider.w / 2;
        const paths = ['main', 'branch'].map(route => ({route, segment: routeAt(m, route, x)}));
        const [upper, lower] = paths.slice().sort((a, b) => a.segment.targetY - b.segment.targetY);
        return {componentIndex, obstacle, upper, lower};
      }).filter(t => t.upper.segment.targetY < t.obstacle.y - F.R &&
        t.lower.segment.targetY > t.obstacle.y + t.obstacle.collider.h + F.R);
  }).sort((a, b) => a.obstacle.x - b.obstacle.x || a.obstacle.id.localeCompare(b.obstacle.id));
  need(candidates.length, 'no ordinary island with opposing authored route lanes');
  return candidates[0];
}
function apply(parent, operation = CONFIG.operation) {
  need(same(operation, CONFIG.operation), 'changed operation requires a new frozen candidate');
  need(same(parent, Old.generate(Old.CONFIG, C.entry(parent.condition))), 'requires exact declared construction parent');
  need(F.R === 10 && F.VX === 150 && F.DT === 1 / 120 && F.G === 820 && F.FLAP === -290, 'immutable physics changed');
  const m = structuredClone(parent), op = operation;
  const {componentIndex, obstacle: prior, upper, lower} = target(parent);
  const dx = prior.collider.w, dy = lower.segment.targetY - upper.segment.targetY;
  const expandedRadius = F.R + op.beamWidthPx / 2;
  const span = [prior.x - expandedRadius, prior.x + dx + expandedRadius];
  const entrySeconds = (span[0] - m.initial_player.x) / F.VX;
  const exitSeconds = (span[1] - m.initial_player.x) / F.VX;
  const midpointSeconds = (prior.x + dx / 2 - m.initial_player.x) / F.VX;
  const activeStartSeconds = entrySeconds - op.activationLeadBeforeWholeBodyEntrySeconds;
  const warningStartSeconds = activeStartSeconds - op.warningSeconds;
  const phase = -midpointSeconds * 2 * Math.PI / op.motionPeriodSeconds + m.condition.phase;
  need(warningStartSeconds >= 0, 'not enough real prefix for declared warning');
  need(activeStartSeconds + op.activeSeconds > entrySeconds && activeStartSeconds + op.activeSeconds < exitSeconds,
    'first active period must overlap entry and release before whole-body exit');
  const laser = {...structuredClone(prior), mechanic_kind: 'laser_scanner', x: prior.x, y: upper.segment.targetY,
    collider: {shape: 'segment', w: dx, h: dy, width: op.beamWidthPx},
    motion: {dx_px: dx, dy_px: dy, amplitude_px: op.verticalSweepPx,
      period_s: op.motionPeriodSeconds, phase_rad: phase},
    timeline: {start_s: warningStartSeconds, warning_s: op.warningSeconds,
      active_s: op.activeSeconds, cooldown_s: op.cooldownSeconds}, effect_region: null};
  const next = parent.obstacles.filter(o => o.x > prior.x + prior.collider.w &&
    o.x < m.routes.main.connectors[componentIndex].startX && o.collider.shape === 'rectangle' &&
    o.y >= 100 && o.y + o.collider.h <= m.height - 100)
    .sort((a, b) => a.x - b.x)[0];
  need(next && next.x - F.R > span[1] + F.VX * .75, 'requires at least .75 s real free recovery before next island');
  need(upper.segment.targetY - op.verticalSweepPx - expandedRadius > 30 &&
    lower.segment.targetY + op.verticalSweepPx + expandedRadius < m.height - 30, 'beam sweep leaves physical outer routes');
  m.obstacles[m.obstacles.findIndex(o => o.id === prior.id)] = laser;
  const program = {schema: 'authored-upper-lower-diagonal-scan/1', sourceId: prior.id, componentIndex,
    constructionParent: CONFIG.constructionParent, replacement: structuredClone(prior), operation: structuredClone(op),
    upper: {route: upper.route, targetY: upper.segment.targetY}, lower: {route: lower.route, targetY: lower.segment.targetY},
    authoredEndpoints: [{x: laser.x, y: laser.y}, {x: laser.x + dx, y: laser.y + dy}],
    wholeBodyHorizontalSpan: span,
    nominal: {warningStartSeconds, activeStartSeconds, cooldownStartSeconds: activeStartSeconds + op.activeSeconds,
      entrySeconds, exitSeconds, midpointSeconds, physicalPrefixSeconds: exitSeconds + .75},
    phaseAlignment: 'zero vertical translation at nominal fixed-VX midpoint plus public phase input; absolute world clock retained',
    downstreamRecovery: {startX: span[1], nextIslandEntryX: next.x - F.R,
      availableDistancePx: next.x - F.R - span[1], nextIslandSourceId: next.id,
      scope: 'authored free interval only; actual exit, recovery state and next encounter not yet tested'},
    actionHypothesis: 'visible nonlethal diagonal warning precedes a descending active capsule across upper and lower authored lanes; upper prepares a lift, lower prepares a later descent, and cooldown releases the crossing before the inherited receiver',
    routePolicy: 'inherited target bands/checkpoints/connectors stay unchanged as broad intended sides; capsule clearance must be measured from actual endpoints, never the replaced rectangle',
    measurementDependency: 'certified harness/b002-metrics.cjs + harness/b002-runner.cjs actual endpoint/status capture; no duplicate adapter',
    controllerLimits: ['assigned-route planner uses AABB forecasts, not capsule-aware forecasts',
      'H1 has visible capsule endpoints and motion estimates but no hidden future activation schedule',
      'scripted input changes cannot establish that the warning caused a human reaction'],
    physicsExecutions: 0, qualification: null, humanFun: null};
  m.components[componentIndex].relations.push({type: 'authored-upper-lower-diagonal-scan', sourceId: prior.id,
    upperRoute: upper.route, lowerRoute: lower.route, nominalWarningSeconds: op.warningSeconds,
    realDownstreamRecoveryX: [program.downstreamRecovery.startX, program.downstreamRecovery.nextIslandEntryX]});
  m.design.laserProgram = program; m.design.components = m.components;
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
module.exports = {CONFIG, STYLE, routeAt, target, apply, generate};
