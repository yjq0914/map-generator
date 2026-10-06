'use strict';
// A narrow construction interface over EXACT default cumulative geometry.
// No simulation, outcome lookup, retries, seed filtering, or arbitrary-parent support.
const Old = require('./a012-style-registry.cjs');
const C = require('./recovery-canonical.cjs');
const F = require('./vendor/engine/core.js');
const Laser = require('./b003-warning-laser-v2.cjs');
const same = require('node:util').isDeepStrictEqual;
const clone = structuredClone;
const need = (v, why) => { if (!v) throw Error('Island effect patch: ' + why); };
function exactBase(base) {
  need(same(base, Old.generate(Old.CONFIG, C.entry(base.condition))), 'requires exact declared default construction parent');
  need(F.R === 10 && F.VX === 150 && F.DT === 1 / 120 && F.G === 820 && F.FLAP === -290, 'immutable physics changed');
}
function routeRecord(base, route, obstacle) {
  const path = base.routes[route], x = obstacle.x + obstacle.collider.w / 2;
  const segmentIndex = path.segments.findIndex(s => s.endX > x), segment = path.segments[segmentIndex];
  if (!segment) return null;
  return {route, segmentIndex, startX: segmentIndex ? path.segments[segmentIndex - 1].endX : base.initial_player.x,
    segment: clone(segment), side: segment.targetY < obstacle.y - F.R ? 'upper' :
      segment.targetY > obstacle.y + obstacle.collider.h + F.R ? 'lower' : null,
    checkpoints: clone(path.checkpoints.filter(p => p.x >= obstacle.x - F.R && p.x <= obstacle.x + obstacle.collider.w + F.R))};
}
function enumerate(base) {
  return base.components.flatMap((component, componentIndex) => {
    if (component.theme !== 'wave' || !component.relations.some(r => r.type === 'whole-body-exit-route-domain')) return [];
    return base.obstacles.filter(o => o.mechanic_kind === 'fixed_armor_or_spike' && o.collider.shape === 'rectangle' &&
      o.interaction?.lethal === true && o.motion === null && o.timeline === null && o.effect_region === null &&
      o.x > component.startX && o.x + o.collider.w < base.routes.main.connectors[componentIndex].startX &&
      o.y >= 100 && o.y + o.collider.h <= base.height - 100 && o.collider.h <= 60).map(obstacle => {
        const routes = ['main', 'branch'].map(route => routeRecord(base, route, obstacle));
        return {schema: 'default-ordinary-island-site/1', componentIndex, sourceId: obstacle.id, obstacle: clone(obstacle),
          wholeBodyX: [obstacle.x - F.R, obstacle.x + obstacle.collider.w + F.R], routes,
          connector: clone(base.routes.main.connectors[componentIndex])};
      }).filter(s => s.routes.every(r => r?.side) && s.routes[0].side !== s.routes[1].side);
  }).sort((a, b) => a.obstacle.x - b.obstacle.x || a.sourceId.localeCompare(b.sourceId));
}
function sites(base) { exactBase(base); return enumerate(base); }
function laserAt(base, site, operation = Laser.CONFIG.operation) {
  exactBase(base);
  need(same(operation, Laser.CONFIG.operation), 'only frozen b003 v2 operation is supported');
  const actual = enumerate(base).find(s => s.componentIndex === site.componentIndex && s.sourceId === site.sourceId);
  need(actual && same(site, actual), 'site does not exactly match current declared geometry/routes');
  const {componentIndex, obstacle: prior} = actual, op = operation;
  const [upper, lower] = actual.routes.slice().sort((a, b) => a.segment.targetY - b.segment.targetY);
  // These descriptor/program calculations intentionally match frozen b003 v2.
  const dx = prior.collider.w, dy = lower.segment.targetY - upper.segment.targetY;
  const expandedRadius = F.R + op.beamWidthPx / 2;
  const span = [prior.x - expandedRadius, prior.x + dx + expandedRadius];
  const entrySeconds = (span[0] - base.initial_player.x) / F.VX;
  const exitSeconds = (span[1] - base.initial_player.x) / F.VX;
  const midpointSeconds = (prior.x + dx / 2 - base.initial_player.x) / F.VX;
  const activeStartSeconds = entrySeconds - op.activationLeadBeforeWholeBodyEntrySeconds;
  const warningStartSeconds = activeStartSeconds - op.warningSeconds;
  const phase = -midpointSeconds * 2 * Math.PI / op.motionPeriodSeconds + base.condition.phase;
  need(warningStartSeconds >= 0, 'not enough real prefix for declared warning');
  need(activeStartSeconds + op.activeSeconds > entrySeconds && activeStartSeconds + op.activeSeconds < exitSeconds,
    'first active period must overlap entry and release before whole-body exit');
  const laser = {...clone(prior), mechanic_kind: 'laser_scanner', x: prior.x, y: upper.segment.targetY,
    collider: {shape: 'segment', w: dx, h: dy, width: op.beamWidthPx},
    motion: {dx_px: dx, dy_px: dy, amplitude_px: op.verticalSweepPx,
      period_s: op.motionPeriodSeconds, phase_rad: phase},
    timeline: {start_s: warningStartSeconds, warning_s: op.warningSeconds,
      active_s: op.activeSeconds, cooldown_s: op.cooldownSeconds}, effect_region: null};
  const next = base.obstacles.filter(o => o.x > prior.x + prior.collider.w &&
    o.x < base.routes.main.connectors[componentIndex].startX && o.collider.shape === 'rectangle' &&
    o.y >= 100 && o.y + o.collider.h <= base.height - 100).sort((a, b) => a.x - b.x)[0];
  // Existing b003 source guard retained verbatim, not a new relay quality gate.
  need(next && next.x - F.R > span[1] + F.VX * .75, 'requires at least .75 s real free recovery before next island');
  need(upper.segment.targetY - op.verticalSweepPx - expandedRadius > 30 &&
    lower.segment.targetY + op.verticalSweepPx + expandedRadius < base.height - 30, 'beam sweep leaves physical outer routes');
  const program = {schema: 'authored-upper-lower-diagonal-scan/1', sourceId: prior.id, componentIndex,
    constructionParent: Laser.CONFIG.constructionParent, replacement: clone(prior), operation: clone(op),
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
  const relationAppend = {type: 'authored-upper-lower-diagonal-scan', sourceId: prior.id,
    upperRoute: upper.route, lowerRoute: lower.route, nominalWarningSeconds: op.warningSeconds,
    realDownstreamRecoveryX: [program.downstreamRecovery.startX, program.downstreamRecovery.nextIslandEntryX]};
  return {schema: 'default-island-laser-patch/1', componentIndex, sourceId: prior.id, before: clone(prior), after: laser,
    relationAppend, laserProgram: program, site: clone(actual), readDependencies: {
      component: clone(base.components[componentIndex]), routes: clone(base.routes), initialPlayer: clone(base.initial_player),
      condition: clone(base.condition), height: base.height, nextIsland: clone(next)}};
}
module.exports = {sites, laserAt, exactBase};
