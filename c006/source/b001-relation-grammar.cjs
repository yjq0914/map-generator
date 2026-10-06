'use strict';
// Pure generation. Relocate complete relation expressions, never a player,
// runtime snapshot, clock, controller queue, or a fragment of an expression.
const Base = require('./recovery-generator.cjs');
const C = require('./recovery-canonical.cjs');
const U = require('./recovery-utils.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const same = require('node:util').isDeepStrictEqual;
const VERSION = 'pinned-contact-relation-chain/1';
function freeze(x) { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; }
const CONFIG = freeze(require('./configs/b001-relation-grammar-v1.json'));
const ROUTES = ['main', 'branch'];
const RELATIONS = new Set(['action-conditioned-spacing', 'same-side-hold-then-turn',
  'whole-body-exit-route-domain', 'short-relief-tail-corridor', 'sustained-moving-corridor',
  'fixed-island-between-moving-pairs', 'adaptive-sustained-gates', 'adaptive-tail-entry',
  'contact-first-optional-branch', 'continuous-two-route-corridor', 'local-vertical-echo']);
const need = (x, message) => { if (!x) throw Error('Relation grammar: ' + message); };
const objects = (m, i) => m.obstacles.filter(o => U.ownedIndex(o.id) === i);
const segments = (m, route, i) => m.routes[route].segments.filter(s =>
  s.endX > m.components[i].startX && s.endX <= m.components[i].endX);
const phaseShift = (motion, dx) => motion === null ? null :
  {...U.clone(motion), phase_rad: motion.phase_rad - dx / F.VX * 2 * Math.PI / motion.period_s};

function rank(seed, stage, slot, source) {
  let x = (seed ^ Math.imul(stage + 11, 0x9e3779b1) ^ Math.imul(slot + 23, 0x85ebca77) ^ Math.imul(source + 41, 0xc2b2ae3d)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return ((x >>> 0) + .5) / 4294967296;
}

// Typed expressions are derived from owned physical primitives and inherited
// action declarations. They are compositional descriptions, not extra gates.
function expression(m, i) {
  const c = m.components[i], types = c.relations.map(r => r.type);
  const core = objects(m, i).filter(o => !/-(tail|recovery)-/.test(o.id)).sort((a, b) => a.x - b.x);
  const primitive = (kind, ids) => ({kind, bodyIds: ids});
  let body;
  if (types.includes('contact-first-optional-branch')) body = primitive('optional-single-contact-receiver', core.map(o => o.id));
  else if (types.includes('continuous-two-route-corridor')) body = primitive('sustained-split-lanes', core.map(o => o.id));
  else if (c.theme === 'mechanical') {
    const gates = core.filter(o => /-press-\d-top$/.test(o.id));
    body = {kind: 'sequence', children: gates.flatMap((o, j) => {
      const child = [primitive('follow-moving-pair', [o.id, o.id.replace(/-top$/, '-bottom')])];
      const receiver = core.find(q => q.id.endsWith('-receiver-island-' + j));
      if (receiver) child.push(primitive(j ? 'receive-below' : 'receive-above', [receiver.id]));
      return child;
    })};
  } else body = primitive(types.includes('same-side-hold-then-turn') ? 'hold-then-turn' : 'alternating-body-passages', core.map(o => o.id));
  const localPaths = ROUTES.map(route => {
    const all = segments(m, route, i), core = all.filter(s => s.endX < m.routes[route].connectors[i].startX);
    return core.length ? core : [all[0]];
  });
  const entryTargets = localPaths.map(p => p[0].targetY);
  const travel = localPaths.reduce((sum, p) => sum + p.reduce((v, s, j) => v + Math.abs(s.targetY - (j ? p[j - 1].targetY : 270)), 0), 0) / 2;
  return {componentIndex: i, theme: c.theme, body,
    entry: {kind: 'continuous-state', y: [245, 300], vy: [-65, 65], qualification: 'inherited receiver target; new seam not yet physically qualified'},
    exit: {kind: 'real-bridge', startX: m.routes.main.connectors[i].startX, endX: c.endX},
    descriptor: {entryTargets, authoredTravelPx: travel,
      demand: c.theme === 'mechanical' ? (types.includes('fixed-island-between-moving-pairs') ? 'moving-and-receive' : 'moving-hold') : body.kind},
    qualification: 'authored expression; actual movement and human interpretation unmeasured'};
}

function validateInput(m) {
  need(F.R === 10 && F.VX === 150 && F.DT === 1 / 120 && F.G === 820 && F.FLAP === -290, 'immutable physics changed');
  need(m.components?.length === 12 && m.horizon === 14400 && m.design.withBridge && !m.design.relationGrammarProgram, 'requires one untouched cumulative course');
  need(same(m, Base.generate(Base.CONFIG, C.entry(m.condition))), 'requires exact cumulative default construction; no a008/a011 or precomposed input');
  for (let i = 0; i < 8; i++) {
    const c = m.components[i], os = objects(m, i);
    need(c.lengthPx === 1500 && c.startX === 60 + i * 1500 && c.endX === 1560 + i * 1500, 'unsupported mutable-stage lengths');
    need(c.relations.every(r => RELATIONS.has(r.type)), 'unrecognized relation dependency');
    for (const o of os) {
      need(o.collider.shape === 'rectangle' && ['fixed_armor_or_spike', 'vertical_armor_slider', 'spring_wall'].includes(o.mechanic_kind) && o.timeline === null && o.effect_region === null, 'unsupported body dependency');
      need(o.x - F.R > c.startX && o.x + o.collider.w + F.R < c.endX, 'body exceeds local package');
      if (o.motion) need(o.mechanic_kind === 'vertical_armor_slider' && Number.isFinite(o.motion.period_s), 'nonlocal motion');
    }
    for (const route of ROUTES) {
      const con = m.routes[route].connectors[i];
      need(con.startX === c.offset + 1320 && con.boundaryX === c.endX && segments(m, route, i).at(-1).endX === c.endX, 'incomplete real bridge');
      need(os.filter(o => o.x + o.collider.w >= con.startX).every(o => o.mechanic_kind === 'fixed_armor_or_spike' && (o.y + o.collider.h <= 140 || o.y >= 430)), 'analytic bridge lacks safe rectangle');
    }
  }
  need(m.components.filter(c => c.theme === 'spring').length === 1, 'requires one pinned contact package');
  return true;
}

function plan(m, op = CONFIG.operation) {
  need(same(op, CONFIG.operation), 'configuration changed; create and freeze a new candidate');
  const expressions = m.components.map((_, i) => expression(m, i));
  const order = m.components.map((_, i) => i), decisions = [], seed = (m.seed ^ op.seedSalt) >>> 0;
  for (const stage of op.stages) {
    const indices = [0, 1, 2, 3].map(j => stage * 4 + j);
    const pinned = indices.filter(i => i === 0 || m.components[i].theme === 'spring');
    const remaining = indices.filter(i => !pinned.includes(i));
    for (const slot of indices) {
      if (pinned.includes(slot)) { decisions.push({slot, sourceIndex: slot, reason: 'pinned warmup/contact'}); continue; }
      const previous = slot ? expressions[order[slot - 1]] : null;
      const candidates = remaining.map(i => {
        const current = expressions[i];
        const contrast = previous ? +(previous.descriptor.demand !== current.descriptor.demand) : 0;
        const incomingTargetChangePx = previous ? current.descriptor.entryTargets.reduce((v, y, r) => v + Math.abs(y - previous.descriptor.entryTargets[r]), 0) / 2 : 0;
        const seededRank = rank(seed, stage, slot, i);
        return {sourceIndex: i, contrast, incomingTargetChangePx, seededRank, score: seededRank + .25 * contrast};
      }).sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex);
      order[slot] = candidates[0].sourceIndex;
      remaining.splice(remaining.indexOf(order[slot]), 1);
      decisions.push({slot, sourceIndex: order[slot], reason: 'typed demand contrast plus continuous seeded rank', candidates});
    }
  }
  need(new Set(order).size === 12 && order.every((source, slot) => Math.floor(source / 4) === Math.floor(slot / 4)), 'invalid package permutation');
  return {order, decisions, expressions};
}

function moveRelations(relations, dx) {
  return relations.map(value => {
    const r = U.clone(value);
    if (r.type === 'continuous-two-route-corridor') r.spine = r.spine.map(x => x + dx);
    if (r.type === 'fixed-island-between-moving-pairs') for (const q of r.receivers) q.x += dx;
    if (r.type === 'short-relief-tail-corridor') for (const k of ['startX', 'endX', 'bridgeStartX']) r.routeIntent[k] += dx;
    need(r.type !== 'contact-first-optional-branch' || dx === 0, 'contact package must remain pinned');
    return r;
  });
}

function apply(parent, op = CONFIG.operation) {
  validateInput(parent);
  const planned = plan(parent, op), m = U.clone(parent), slotOfSource = [];
  const moves = planned.order.map((sourceIndex, slot) => {
    slotOfSource[sourceIndex] = slot;
    return {sourceIndex, slot, deltaOffset: parent.components[slot].offset - parent.components[sourceIndex].offset};
  });
  m.components = moves.map(({sourceIndex, slot, deltaOffset: dx}) => {
    const c = U.clone(parent.components[sourceIndex]), target = parent.components[slot];
    c.offset = target.offset; c.startX = target.startX; c.endX = target.endX; c.lengthPx = target.lengthPx;
    c.relations = moveRelations(c.relations, dx);
    c.grammarRelocation = {schema: VERSION, sourceIndex, slot, deltaOffset: dx, earlierRelocationFields: 'inherited generation provenance'};
    return c;
  });
  m.obstacles = moves.flatMap(({sourceIndex, slot, deltaOffset: dx}) => objects(parent, sourceIndex).map(value => {
    const o = U.clone(value); o.id = U.remapId(o.id, slot); o.group_id = o.id; o.x += dx;
    if (o.motion && dx) o.motion = phaseShift(o.motion, dx);
    return o;
  }));
  m.routeMarks = moves.map(({sourceIndex, slot, deltaOffset: dx}) => ({...U.clone(parent.routeMarks[sourceIndex]), id: 'component-' + slot, x: parent.routeMarks[sourceIndex].x + dx}));
  for (const route of ROUTES) {
    const p = m.routes[route], src = parent.routes[route];
    p.segments = moves.flatMap(({sourceIndex, deltaOffset: dx}) => segments(parent, route, sourceIndex).map(s => ({...U.clone(s), endX: s.endX + dx})));
    p.checkpoints = moves.flatMap(({sourceIndex, slot, deltaOffset: dx}) => {
      const qs = src.checkpoints.filter(q => U.ownedIndex(q.id) === sourceIndex).map(q => ({...U.clone(q), id: U.remapId(q.id, slot), x: q.x + dx}));
      if (slot < 11) qs.push({...U.clone(src.checkpoints.find(q => q.id === 'handoff-' + slot)), x: m.components[slot].endX});
      return qs;
    }).sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
    p.connectors = moves.map(({sourceIndex, deltaOffset: dx}) => ({startX: src.connectors[sourceIndex].startX + dx, boundaryX: src.connectors[sourceIndex].boundaryX + dx}));
    if (p.contact) need(slotOfSource[U.ownedIndex(p.contact.springId)] === U.ownedIndex(p.contact.springId), 'contact ID changed');
    need(p.segments.length === src.segments.length && p.segments.every((s, j, all) => !j || s.endX > all[j - 1].endX), 'non-increasing segment composition');
    need(same(p.contact, src.contact) && same(p.exit, src.exit) && same(p.finalDomain, src.finalDomain) && same(p.events, src.events), 'global route contract changed');
    Contract.validate(m, route);
  }
  m.design.pressureProgram.pairRecords = parent.design.pressureProgram.pairRecords.map(p => {
    const slot = slotOfSource[p.componentIndex], dx = moves[slot].deltaOffset;
    return {...U.clone(p), componentIndex: slot, pairId: U.remapId(p.pairId, slot), inheritedMotion: dx ? phaseShift(p.inheritedMotion, dx) : U.clone(p.inheritedMotion)};
  }).sort((a, b) => a.componentIndex - b.componentIndex || a.pairId.localeCompare(b.pairId));
  const inheritedOrder = m.design.orderProgram;
  m.design.orderProgram = {algorithm: VERSION, sourceAtSlot: planned.order.map(i => inheritedOrder.sourceAtSlot[i]),
    slotOfSource: [], moves, construction: 'stage-local typed expression chain; warmup/contact pinned; all expressions used once; no outcome lookup',
    provenanceCoordinates: 'sourceAtSlot composes original pre-recovery source; moves address cumulative-parent slots',
    qualification: 'new seams and changed downstream states require fresh full-course evidence'};
  m.design.orderProgram.sourceAtSlot.forEach((i, slot) => { m.design.orderProgram.slotOfSource[i] = slot; });
  m.design.relationGrammarProgram = {schema: VERSION, operation: U.clone(op), comparisonParent: CONFIG.comparisonParent,
    constructionParent: CONFIG.constructionParent, parentSlotAtSlot: planned.order, slotOfParent: slotOfSource,
    moves, decisions: planned.decisions, inheritedOrderProgram: inheritedOrder,
    expression: {kind: 'sequence', children: planned.order.map(source => planned.expressions[source])},
    coordinateScope: 'expression child IDs are parent coordinates; actual geometry/current relations use moves; prior recipes are historical provenance',
    phaseRule: 'phase_new = phase_parent - deltaX / VX * 2pi / period; absolute world clock never resets',
    preserved: ['local geometry/route intent', 'twelve packages', 'stage counts/gaps/duration', 'warmup and spring positions', 'recovery lengths', 'default and all explicit old styles through registry'],
    limits: ['fixed twelve-package compiler', 'stage-local only', 'no free repetition', 'pinned contact', 'no width/recovery/anticipation improvement claimed'],
    physicsExecutions: 0, qualityQualification: null, humanFun: null};
  m.design.components = m.components;
  m.design.componentTimeline = Base.componentTimeline(m);
  m.design.generatorVersion = CONFIG.version;
  m.design.qualification = 'Unqualified compositional generator candidate; static legality is not playability or human fun';
  m.id = m.mapId = CONFIG.version + '-' + m.seed;
  U.assertFiniteTree(m); F.validate(m); return m;
}

function generateParent(input = {}) { return Base.generate(Base.CONFIG, C.entry(input)); }
function generate(config = CONFIG, input = {}) {
  need(same(config, CONFIG), 'candidate config differs from frozen source');
  return apply(generateParent(input), config.operation);
}
module.exports = {VERSION, CONFIG, generateParent, generate, apply, plan, expression, validateInput};
