'use strict';
// Pure candidate transform: no evidence/panel/seed-score lookup and no physics.
// Apply AFTER the pressure transform. v5 has exactly one persistent commitment.
const G = require('./vendor/generator-v3.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const ALGORITHM = 'single-optional-spring/2-guarded-input'; // Numeric-only compatible assertion repair; geometry program unchanged.
const X_KEYS = ['startX', 'landingTargetX', 'minContactX', 'maxContactX', 'receiverEntryX', 'receiverExitX'];
const CORE_IDS = ['divider', 'spring', 'receiver', 'merge-top', 'merge-bottom'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = message => { throw Error('Optional spring transform: ' + message); };
const near = (a, b) => Math.abs(a - b) < 1e-8;
const GUARD_RELATION = Object.freeze({type: 'whole-body-exit-route-domain', radiusPx: 10,
  oneControllerEpochPixels: 15,
  sideBands: 'derived from actual island edges and4px planning allowance',
  freeTransitionBetweenBodies: true});
const SEGMENT_KEYS = ['endX', 'targetY', 'minY', 'maxY', 'vy', 'phase', 'mechanism', 'allowedActions', 'maxDwellTicks'];
const keysMatch = (value, keys) => value && typeof value === 'object' &&
  same(Object.keys(value).sort(), [...keys].sort());
function knownSegment(s) {
  return keysMatch(s, SEGMENT_KEYS) &&
    [s.endX, s.targetY, s.minY, s.maxY].every(Number.isFinite) &&
    s.minY <= s.targetY && s.targetY <= s.maxY &&
    same(s.vy, [-450, 600]) && s.phase === 'any' && s.mechanism === 'none' &&
    same(s.allowedActions, ['flap', 'release']) && s.maxDwellTicks === null;
}
function validateGuardedWave(parentMap, index, slotsByRoute) {
  const c = parentMap.components[index], off = c.offset, prefix = `c${index}-`;
  const relations = c.relations || [];
  if (!Array.isArray(relations)) fail('target relations must be an array');
  const guards = relations.filter(r => r?.type === GUARD_RELATION.type);
  const counts = ['main', 'branch'].map(r => slotsByRoute[r].length);
  if (counts.every(n => n === 4)) {
    if (guards.length) fail('body-guard relation requires seven matching segments on both routes');
    return 'legacy-four-segment-wave';
  }
  if (!counts.every(n => n === 7) || guards.length !== 1 ||
      !keysMatch(guards[0], Object.keys(GUARD_RELATION)) ||
      Object.keys(GUARD_RELATION).some(k => guards[0][k] !== GUARD_RELATION[k]) ||
      relations.some(r => r?.type === 'continuous-two-route-corridor'))
    fail('unsupported body-guard relation or route shape');
  const islands = [0, 1, 2].map(j => parentMap.obstacles.find(o => o.id === `${prefix}wave-island-${j}`));
  for (let j = 0; j < 3; j++) {
    const o = islands[j];
    if (!o || !keysMatch(o, ['id', 'mechanic_kind', 'x', 'y', 'collider', 'motion', 'timeline', 'effect_region', 'interaction', 'group_id']) ||
        o.mechanic_kind !== 'fixed_armor_or_spike' || o.group_id !== o.id ||
        !keysMatch(o.collider, ['shape', 'w', 'h']) || o.collider.shape !== 'rectangle' ||
        ![o.x, o.y, o.collider.w, o.collider.h].every(Number.isFinite) ||
        o.collider.w <= 0 || o.collider.h !== 36 || o.motion !== null || o.timeline !== null ||
        o.effect_region !== null || !keysMatch(o.interaction, ['lethal']) || o.interaction.lethal !== true ||
        o.x - 10 <= off + 60 || o.x + o.collider.w + 25 >= off + 1120 ||
        (j && islands[j - 1].x + islands[j - 1].collider.w + 25 >= o.x - 10))
      fail('body guard requires three ordered disjoint fixed wave islands before the bridge');
    const bands = [[30, o.y - 14], [o.y + o.collider.h + 14, 510]];
    const side = {};
    for (const route of ['main', 'branch']) {
      const q = parentMap.routes[route].checkpoints.find(q => q.id === `${prefix}wave-${j}`);
      const approach = slotsByRoute[route][2 * j], guard = slotsByRoute[route][2 * j + 1];
      side[route] = bands.findIndex(b => same(b, q.y));
      if (!keysMatch(q, ['id', 'x', 'y', 'vy']) || !Number.isFinite(q.x) ||
          q.x < o.x || q.x > o.x + o.collider.w || !same(q.vy, [-310, 360]) ||
          side[route] < 0 || !q.y.every(Number.isFinite) || q.y[0] >= q.y[1] ||
          !knownSegment(approach) || !knownSegment(guard) ||
          approach.endX !== o.x - 10 || guard.endX !== o.x + o.collider.w + 10 + 15 ||
          approach.minY !== 30 || approach.maxY !== 510 ||
          guard.minY !== q.y[0] || guard.maxY !== q.y[1] ||
          approach.targetY !== guard.targetY)
        fail('body-guard approach, full-body exit, target, or checkpoint sideband changed');
    }
    if (side.main === side.branch) fail('body-guard routes must use opposite actual island sidebands');
  }
  for (const route of ['main', 'branch']) {
    const final = slotsByRoute[route][6];
    if (!knownSegment(final) || final.endX !== off + 1560 || final.targetY !== 300 ||
        final.minY !== 30 || final.maxY !== 510)
      fail('body-guard final recovery segment changed');
  }
  return 'whole-body-guard-seven-segment-wave';
}

function transform(parentMap, e = {}, op = {}) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) fail('entry must be an object');
  if (!op || typeof op !== 'object' || Array.isArray(op) ||
      Object.keys(op).some(k => !['type', 'index', 'desiredContactX'].includes(k)) ||
      (op.type !== undefined && op.type !== 'optional-spring')) fail('unsupported operation');
  const index = op.index ?? 2, desiredContactX = op.desiredContactX ?? 745;
  if (!Number.isInteger(index) || !Number.isFinite(desiredContactX) ||
      desiredContactX < 725 || desiredContactX > 765) fail('outside declared contact-position support');
  if (F.R !== 10 || F.VX !== 150 || F.G !== 820 || F.FLAP !== -290 || F.DT !== 1 / 120)
    fail('controller/physics constants changed');
  if (!parentMap || !Array.isArray(parentMap.obstacles) || !Array.isArray(parentMap.components) ||
      ![4, 12].includes(parentMap.components.length) ||
      parentMap.horizon !== parentMap.components.length * 1200 || parentMap.height !== 540 ||
      parentMap.components.some((c, i) => c.offset !== i * 1500 || !['wave', 'mechanical'].includes(c.theme)) ||
      parentMap.components[index]?.theme !== 'wave') fail('target must be one existing wave component');
  if (parentMap.intervention || parentMap.obstacles.some(o => o.mechanic_kind === 'spring_wall') ||
      Object.values(parentMap.routes || {}).some(p => p.contact || p.contacts))
    fail('exactly one new contact is supported; interventions and existing contacts are excluded');
  const lead = parentMap.condition?.lead ?? 0;
  if (!Number.isFinite(lead) || lead < -20 || lead > 20 ||
      (e.lead !== undefined && e.lead !== lead)) fail('entry lead differs from parent or is outside support');
  if (!same(Object.keys(parentMap.routes || {}).sort(), ['branch', 'main'])) fail('two named routes required');
  for (const route of ['main', 'branch']) {
    const p = parentMap.routes[route];
    Contract.validate(parentMap, route);
    if (!Array.isArray(p.checkpoints)) fail('checkpoint list required');
    if (!Array.isArray(p.connectors) || p.connectors.length !== parentMap.components.length ||
        p.connectors.some((c, i) => c.startX !== i * 1500 + 1120 || c.boundaryX !== i * 1500 + 1560))
      fail('only inherited 1120..1560 analytical bridges are supported');
    if ((p.events || []).some(v => route !== 'main' || v !== 'no-bounce'))
      fail('existing global event requirements conflict with optional spring scope');
    if (p.segments.some((s, i) => !Number.isFinite(s.endX) || (i && s.endX <= p.segments[i - 1].endX)))
      fail('route segments must be strictly ordered');
  }
  F.validate(parentMap);
  const off = index * 1500, prefix = `c${index}-`, dx = desiredContactX - 745;
  const waveIds = [0, 1, 2].map(j => `${prefix}wave-island-${j}`);
  const inheritedIds = ['recovery-top', 'recovery-bottom', 'adj-upper', 'adj-lower'].map(id => prefix + id);
  if (waveIds.some(id => !parentMap.obstacles.some(o => o.id === id)) ||
      parentMap.obstacles.some(o => o.id.startsWith(prefix) && !waveIds.includes(o.id) && !inheritedIds.includes(o.id)))
    fail('target contains unfamiliar component geometry');
  const slotsByRoute = {};
  for (const route of ['main', 'branch']) {
    const p = parentMap.routes[route], local = p.checkpoints.filter(q => q.id.startsWith(prefix));
    if (!same(local.map(q => q.id).sort(), [0, 1, 2].map(j => `${prefix}wave-${j}`)))
      fail('target wave checkpoints changed');
    // The preceding component's final segment ends at off+60. Preserve it.
    const slots = p.segments.filter(s => s.endX > off + 60 && s.endX <= off + 1560);
    if (![4, 7].includes(slots.length) || slots.at(-1).endX !== off + 1560 ||
        slots.some(s => !Number.isFinite(s.targetY) || !Number.isFinite(s.minY) ||
          !Number.isFinite(s.maxY) || s.targetY < s.minY || s.targetY > s.maxY))
      fail('target wave segment boundary or target changed');
    slotsByRoute[route] = slots;
  }
  const inheritedRouteShape = validateGuardedWave(parentMap, index, slotsByRoute);

  // Route first: desired plane crossing C determines the spring and receiver.
  // The existing v4 anatomy supplies offsets, not an outcome-selected map ID.
  const C = off + lead + desiredContactX;
  const intent = {
    componentIndex: index, localDesiredContactX: desiredContactX, inheritedLeadPx: lead,
    desiredContactX: C, planeY: 475, desiredCenterY: 465, bounceVelocityY: -400,
    allowedContactX: [C - 40, C + 25], receiverCenterIntervalX: [C + 50, C + 100],
    receiverTopY: 410, receiverCenterMaximumY: 400,
    main: 'upper bypass, globally no bounce',
    branch: 'descending plane contact, one passive bounce, zero flaps through full receiver exit'
  };
  const sub = G.combo('spring', 4, {lead});
  const native = sub.routes.branch.contact;
  if (!near(native.landingTargetX, lead + 745) || native.surfaceY !== intent.planeY ||
      !X_KEYS.every((k, j) => near(native[k] - lead, [495, 745, 705, 770, 795, 845][j])) ||
      sub.obstacles.find(o => o.id === 'receiver')?.y !== intent.receiverTopY ||
      sub.obstacles.find(o => o.id === 'spring')?.interaction.bounce_speed_px_s !== 400)
    fail('spring-v4 anatomy changed');
  const map = structuredClone(parentMap);
  const objects = CORE_IDS.map(id => {
    const o = structuredClone(sub.obstacles.find(o => o.id === id));
    if (!o) fail('spring-v4 core object missing');
    o.x += off + dx; o.id = prefix + id; o.group_id = o.id;
    return o;
  });
  if (objects.some(o => o.x - F.R <= off + 60 || o.x + o.collider.w + F.R >= off + 1120))
    fail('new radius-expanded geometry reaches a preserved bridge');
  map.obstacles = map.obstacles.filter(o => !waveIds.includes(o.id));
  if (objects.some(a => map.obstacles.some(b => b.x < a.x + a.collider.w + 2 * F.R &&
      b.x + b.collider.w > a.x - 2 * F.R))) fail('inherited geometry overlaps new core');
  map.obstacles.push(...objects);

  for (const route of ['main', 'branch']) {
    const p = map.routes[route], src = sub.routes[route];
    const before = p.segments.filter(s => s.endX <= off + 60);
    const after = p.segments.filter(s => s.endX > off + 1560);
    const replacement = src.segments.map((s, j) => ({...structuredClone(s),
      endX: j === src.segments.length - 1 ? off + 1560 : s.endX + off + dx}));
    p.segments = [...before, ...replacement, ...after];
    p.checkpoints = [...p.checkpoints.filter(q => !q.id.startsWith(prefix)),
      ...src.checkpoints.map(q => ({...structuredClone(q), id: prefix + q.id, x: q.x + off + dx}))]
      .sort((a, b) => a.x - b.x);
    p.events = [...src.events];
  }
  map.routes.branch.contact = {...structuredClone(native), springId: prefix + native.springId};
  for (const k of X_KEYS) map.routes.branch.contact[k] += off + dx;
  const contact = map.routes.branch.contact, spring = objects.find(o => o.id === prefix + 'spring');
  const receiver = objects.find(o => o.id === prefix + 'receiver');
  if (!near(contact.landingTargetX, C) || !near(contact.minContactX, C - 40) ||
      !near(contact.maxContactX, spring.x + spring.collider.w) ||
      !near(contact.receiverEntryX, receiver.x - F.R) ||
      !near(contact.receiverExitX, receiver.x + receiver.collider.w + F.R) ||
      contact.receiverExitX >= off + 1120) fail('contact/receiver derivation is inconsistent');

  const component = map.components[index], previous = structuredClone(component);
  map.components[index] = {...component, theme: 'spring', variant: 4, swap: false,
    sourceRule: {ruleId: component.ruleId, ruleVersion: component.ruleVersion, theme: component.theme, swap: !!component.swap},
    ruleId: ALGORITHM, ruleVersion: 2,
    geometryTransform: {algorithm: ALGORITHM, empiricalParentRuleSupportInherited: false,
      qualification: 'static candidate only; no physical evidence'},
    relations: [{type: 'contact-first-optional-branch', intent}]};
  // This is only an ideal endpoint envelope, never an engine trajectory.
  const idealY = x => intent.desiredCenterY - 400 * ((x - C) / F.VX) +
    F.G * ((x - C) / F.VX) ** 2 / 2;
  const idealEndpointCenterYs = intent.receiverCenterIntervalX.map(idealY);
  const program = {
    algorithm: ALGORITHM, inheritedRouteShape, index, operation: {type: 'optional-spring', index, desiredContactX}, intent,
    inheritedComponent: previous, geometrySource: 'generator-v3.combo(spring,4): static anatomy only',
    relation: 'C=component.offset+entry.lead+desiredContactX; spring=[C-245,C+25]; receiver body=[C+60,C+90]; full radius-expanded crossing=[C+50,C+100]',
    idealEnvelope: {kind: 'continuous algebraic design check, not physical execution',
      endpointCenterYs: idealEndpointCenterYs,
      minimumEndpointClearancePx: intent.receiverCenterMaximumY - Math.max(...idealEndpointCenterYs)},
    controllerScope: 'one global plan.contact; persistent v5 commitment; inherited v6 bridges and true global clock',
    preserved: ['initial_player', 'horizon', 'durationTicks', 'routeMarks', 'all mechanical geometry and phases',
      'all other components', 'connectors', 'handoff checkpoints', 'global exit/recovery/finalDomain'],
    metricScope: {contactChain: 'existing metrics-v4 exact spring ID, setup, contact window, one bounce and zero flaps through radius-expanded receiver exit',
      main: 'existing global no-bounce requirement',
      cadence: 'spring is not a three-wave/press checkpoint component; existing cadence becomes null for its stage and whole course',
      pressure: 'existing mechanical pairs and five-component full-course domain are unchanged'},
    empiricalParentRuleSupportInherited: false, historicalThreeAblationCertificationInherited: false,
    realizedExecutionEvidence: null, qualification: 'unvalidated single-contact composition; not natural-choice or human-fun evidence'
  };
  map.design = {...map.design, components: map.components,
    theme: 'wave-mechanical-single-optional-spring',
    referenceQualification: 'Parent evidence is provenance only. The added mechanism exceeds the historical fixed/vertical-slider rule domain and requires a prospective candidate contract.',
    routeScope: 'main bypass itinerary and one frozen spring-branch itinerary; no online or arbitrary branch choice',
    unsupported: [...new Set([...(map.design?.unsupported || []).filter(s => !['spring stage composition', 'spring composition'].includes(s)),
      'multiple spring contacts', 'unvalidated single-spring composition', 'historical three-ablation certification'])],
    optionalSpringProgram: program};
  for (const route of ['main', 'branch']) Contract.validate(map, route);
  F.validate(map);
  return map;
}

function selfTest() {
  const assert = require('node:assert/strict');
  // An accidental execution call is a fixture failure; no physical ticks run.
  const executionKeys = Object.keys(F).filter(k => typeof F[k] === 'function' && k !== 'validate');
  let forbiddenPhysicsCalls = 0;
  const saved = Object.fromEntries(executionKeys.map(k => [k, F[k]]));
  for (const k of executionKeys) F[k] = () => { forbiddenPhysicsCalls++; throw Error('Static fixtures forbid physics: ' + k); };
  let cases = 0;
  try {
    const Pressure = require('./candidate-pressure.cjs');
    const Config = require('./versions/o002-candidate.json');
    const entry = {y: 270, vy: 0, lead: 0, phase: 0, adjacency: 'none', seed: 42};
    const base = Pressure.generate(Config, entry), snapshot = structuredClone(base);
    const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
    freeze(base);
    for (const index of [0, 2, 5, 11]) {
      const m = transform(base, entry, {index}); const off = index * 1500, pre = `c${index}-`;
      assert.deepEqual(base, snapshot);
      assert.deepEqual(m.initial_player, base.initial_player);
      assert.deepEqual(m.routeMarks, base.routeMarks);
      assert.deepEqual(m.components.filter((_, i) => i !== index), base.components.filter((_, i) => i !== index));
      assert.deepEqual(m.obstacles.filter(o => !o.id.startsWith(pre)), base.obstacles.filter(o => !o.id.startsWith(pre)));
      assert.deepEqual(m.obstacles.filter(o => o.id.startsWith(pre) && /recovery|adj-/.test(o.id)),
        base.obstacles.filter(o => o.id.startsWith(pre) && /recovery|adj-/.test(o.id)));
      assert.equal(m.obstacles.filter(o => o.mechanic_kind === 'spring_wall').length, 1);
      assert.deepEqual(m.routes.main.events, ['no-bounce']); assert.equal(m.routes.main.contact, undefined);
      assert.deepEqual(m.routes.branch.events, ['bounce']);
      assert.equal(m.routes.branch.contact.springId, pre + 'spring');
      assert.equal(m.routes.branch.contact.receiverExitX, off + 845);
      for (const r of ['main', 'branch']) {
        for (const key of ['connectors', 'exit', 'recoveryTicks', 'finalDomain']) assert.deepEqual(m.routes[r][key], base.routes[r][key]);
        assert.deepEqual(m.routes[r].checkpoints.filter(q => !q.id.startsWith(pre)), base.routes[r].checkpoints.filter(q => !q.id.startsWith(pre)));
        assert.deepEqual(m.routes[r].segments.filter(s => s.endX <= off + 60 || s.endX > off + 1560),
          base.routes[r].segments.filter(s => s.endX <= off + 60 || s.endX > off + 1560));
        assert(m.routes[r].segments.every((s, i, a) => !i || s.endX > a[i - 1].endX));
      }
      assert.deepEqual(transform(base, entry, {index}), m); cases++;
    }
    for (const level of ['stage', 'whole']) for (const lead of [-20, 0, 20])
      for (const adjacency of ['none', 'upper-after', 'lower-before']) for (const desiredContactX of [725, 745, 765]) {
        const e = {...entry, lead, adjacency}, p = Pressure.generate(Config, e, {level});
        const m = transform(p, e, {index: 2, desiredContactX});
        assert.equal(m.routes.branch.contact.landingTargetX, 3000 + lead + desiredContactX);
        assert.equal(m.routes.branch.contact.receiverExitX, 3100 + lead + desiredContactX);
        const receiver = m.obstacles.find(o => o.id === 'c2-receiver');
        assert.equal(receiver.x + receiver.collider.w + F.R, m.routes.branch.contact.receiverExitX);
        assert(m.design.optionalSpringProgram.idealEnvelope.minimumEndpointClearancePx > 19);
        cases++;
      }
    const clone = () => structuredClone(snapshot);
    const reject = fn => { assert.throws(fn, /Optional spring transform:/); cases++; };
    reject(() => transform(base, null));
    reject(() => transform({...snapshot, obstacles: null}, entry));
    reject(() => transform(base, entry, {index: 1}));
    reject(() => transform(base, entry, {index: -1}));
    reject(() => transform(base, entry, {index: 2.5}));
    reject(() => transform(base, entry, {index: 12}));
    reject(() => transform(base, entry, {desiredContactX: 724}));
    reject(() => transform(base, entry, {desiredContactX: 766}));
    reject(() => transform(base, entry, {desiredContactX: NaN}));
    reject(() => transform(base, entry, {type: 'another'}));
    reject(() => transform(base, entry, {indices: [0, 2]}));
    reject(() => transform(base, {...entry, lead: 1}));
    reject(() => transform(transform(base, entry), entry));
    reject(() => { const p = clone(); p.routes.branch.contact = {}; transform(p, entry); });
    reject(() => { const p = clone(); p.routes.branch.events = ['no-bounce']; transform(p, entry); });
    reject(() => { const p = clone(); p.routes.main.connectors[2].startX++; transform(p, entry); });
    reject(() => { const p = clone(); p.obstacles = p.obstacles.filter(o => o.id !== 'c2-wave-island-1'); transform(p, entry); });
    reject(() => { const p = clone(); p.obstacles.push({...structuredClone(p.obstacles[0]), id: 'c2-unknown'}); transform(p, entry); });
    reject(() => { const p = clone(); p.routes.branch.checkpoints.find(q => q.id === 'c2-wave-0').id = 'c2-unknown'; transform(p, entry); });
    reject(() => { const p = clone(); p.obstacles.push({...structuredClone(p.obstacles[0]), id: 'foreign-object', x: 3500}); transform(p, entry); });
    cases += guardedFixtures(assert, entry, freeze);
    assert.equal(forbiddenPhysicsCalls, 0);
    return {pass: true, staticFixtureCases: cases, forbiddenPhysicsApis: executionKeys.length,
      forbiddenPhysicsCalls, physicsTicksExecuted: 0, evidenceOrHoldoutReads: 0,
      claim: 'structural invariants only; no controller execution, survival, natural-choice or ablation certification'};
  } finally { for (const k of executionKeys) F[k] = saved[k]; }
}
function guardedFixtures(assert, entry, freeze) {
  // Fixed synthetic input only; no panel data, score lookup, or seed selection.
  const inputs = ['r004', 'r006'].map(revision => ({revision,
    config: require(`./versions/${revision === 'r004' ? 'r004-repair' : revision}.json`),
    source: require(`./relations-${revision === 'r004' ? 'r004-repair' : revision}.cjs`)}));
  const Legacy = require('./spring-transform.cjs');
  let cases = 0;
  const local = (m, r, i = 2) => m.routes[r].segments.filter(s => s.endX > i * 1500 + 60 && s.endX <= i * 1500 + 1560);
  const checkpoint = (m, r, j) => m.routes[r].checkpoints.find(q => q.id === `c2-wave-${j}`);
  const island = (m, j) => m.obstacles.find(o => o.id === `c2-wave-island-${j}`);
  const bodyRelation = m => m.components[2].relations.find(r => r.type === GUARD_RELATION.type);
  const bases = {};
  for (const {revision, config, source} of inputs) {
    bases[revision] = source.generate(config, entry);
    for (const level of ['stage', 'whole']) for (const lead of [-20, 0, 20])
      for (const adjacency of ['none', 'upper-after', 'lower-before']) {
        const e = {...entry, lead, adjacency}, base = source.generate(config, e, {level});
        const snapshot = structuredClone(base);
        freeze(base);
        const indices = base.components.flatMap((c, i) => c.theme === 'wave' &&
          !c.relations?.some(r => r.type === 'continuous-two-route-corridor') ? [i] : []);
        for (const index of indices) for (const desiredContactX of [725, 745, 765]) {
          const op = {index, desiredContactX}, m = transform(base, e, op);
          const off = index * 1500, pre = `c${index}-`;
          assert.deepEqual(base, snapshot);
          assert.deepEqual(m, transform(base, e, op));
          for (const key of ['id', 'mapId', 'initial_player', 'horizon', 'durationTicks', 'routeMarks'])
            assert.deepEqual(m[key], base[key]);
          assert.equal(m.obstacles.filter(o => o.mechanic_kind === 'spring_wall').length, 1);
          assert.equal(m.routes.branch.contact.springId, pre + 'spring');
          assert.equal(m.routes.branch.contact.landingTargetX, off + lead + desiredContactX);
          assert.equal(m.routes.branch.contact.receiverExitX, off + lead + desiredContactX + 100);
          assert.deepEqual(m.components.filter((_, i) => i !== index), base.components.filter((_, i) => i !== index));
          assert.deepEqual(m.obstacles.filter(o => !o.id.startsWith(pre)), base.obstacles.filter(o => !o.id.startsWith(pre)));
          assert.deepEqual(m.obstacles.filter(o => o.id.startsWith(pre) && /recovery|adj-/.test(o.id)),
            base.obstacles.filter(o => o.id.startsWith(pre) && /recovery|adj-/.test(o.id)));
          assert.equal(m.design.optionalSpringProgram.inheritedRouteShape,
            revision === 'r004' ? 'legacy-four-segment-wave' : 'whole-body-guard-seven-segment-wave');
          for (const route of ['main', 'branch']) {
            const p = m.routes[route], old = base.routes[route];
            for (const key of ['connectors', 'exit', 'recoveryTicks', 'finalDomain']) assert.deepEqual(p[key], old[key]);
            assert.deepEqual(p.checkpoints.filter(q => !q.id.startsWith(pre)), old.checkpoints.filter(q => !q.id.startsWith(pre)));
            const retained = s => s.endX <= off + 60 || s.endX > off + 1560;
            assert.deepEqual(p.segments.filter(retained), old.segments.filter(retained));
            assert(p.segments.every((s, i, list) => !i || s.endX > list[i - 1].endX));
            assert.equal(local(m, route, index).at(-1).endX, off + 1560);
          }
          // A new input validator must not change the actual spring conversion.
          if (revision === 'r004') {
            const legacy = Legacy.transform(base, e, op);
            assert.deepEqual(m.obstacles, legacy.obstacles);
            assert.deepEqual(m.routes, legacy.routes);
          }
          cases++;
        }
      }
  }
  const reject = (label, mutate, revision = 'r006', op = {index: 2}) => {
    const base = structuredClone(bases[revision]);
    mutate(base);
    const snapshot = structuredClone(base);
    assert.throws(() => transform(base, entry, op), undefined, label);
    assert.deepEqual(base, snapshot, label + ': rejected input must remain unchanged');
    cases++;
  };
  reject('missing guard relation', m => { m.components[2].relations = m.components[2].relations.filter(r => r.type !== GUARD_RELATION.type); });
  reject('duplicate guard relation', m => m.components[2].relations.push(structuredClone(bodyRelation(m))));
  reject('changed guard relation kind', m => { bodyRelation(m).type = 'unknown-guard'; });
  for (const [field, value] of [['radiusPx', 9], ['oneControllerEpochPixels', 14],
    ['sideBands', 'arbitrary'], ['freeTransitionBetweenBodies', false], ['extra', true]])
    reject('guard relation ' + field, m => { bodyRelation(m)[field] = value; });
  for (const field of Object.keys(GUARD_RELATION))
    reject('missing guard relation field ' + field, m => { delete bodyRelation(m)[field]; });
  reject('non-array relation list', m => { m.components[2].relations = {}; });
  reject('unrecognized target geometry', m => m.obstacles.push({...structuredClone(island(m, 0)), id: 'c2-unknown', group_id: 'c2-unknown'}));
  reject('twin corridor target', () => {}, 'r006', {index: 6});
  reject('twin relation cannot masquerade as guarded wave', m => m.components[2].relations.push({type: 'continuous-two-route-corridor'}));
  reject('foreign overlap still rejected', m => m.obstacles.push({...structuredClone(island(m, 0)), id: 'foreign-object', group_id: 'foreign-object', x: 3500}));
  reject('four-segment route with body-guard claim', m => m.components[2].relations.push({...GUARD_RELATION}), 'r004');
  reject('seven-segment route without body-guard claim', m => {
    for (const r of ['main', 'branch']) {
      const old = local(m, r), guarded = local(bases.r006, r);
      m.routes[r].segments.splice(m.routes[r].segments.indexOf(old[0]), old.length, ...structuredClone(guarded));
    }
  }, 'r004');
  for (const route of ['main', 'branch']) {
    for (const j of [0, 1, 2]) {
      for (const pairOffset of [0, 1]) {
        for (const delta of [-1, 1]) reject(`${route}/${j}/${pairOffset} wrong boundary ${delta}`,
          m => { local(m, route)[2 * j + pairOffset].endX += delta; });
        for (const [key, value] of [['targetY', 29], ['targetY', NaN], ['phase', 'unknown'],
          ['mechanism', 'unknown'], ['allowedActions', ['release']], ['vy', [-450, 601]],
          ['maxDwellTicks', 5], ['extraGuard', true]])
          reject(`${route}/${j}/${pairOffset} unsupported ${key}`,
            m => { local(m, route)[2 * j + pairOffset][key] = value; });
      }
      reject(`${route}/${j} mismatched targets`, m => { local(m, route)[2 * j].targetY++; });
      reject(`${route}/${j} approach sideband`, m => { local(m, route)[2 * j].minY++; });
      reject(`${route}/${j} narrowed approach`, m => { local(m, route)[2 * j].maxY--; });
      reject(`${route}/${j} wrong guard lower bound`, m => { local(m, route)[2 * j + 1].minY++; });
      reject(`${route}/${j} wrong guard upper bound`, m => { local(m, route)[2 * j + 1].maxY--; });
      reject(`${route}/${j} target outside sideband`, m => {
        const guard = local(m, route)[2 * j + 1], target = guard.minY === 30 ? guard.maxY + 1 : guard.minY - 1;
        guard.targetY = local(m, route)[2 * j].targetY = target;
      });
      reject(`${route}/${j} checkpoint belongs to wrong island`, m => { checkpoint(m, route, j).x = island(m, j).x - 1; });
      reject(`${route}/${j} checkpoint beyond island`, m => { checkpoint(m, route, j).x = island(m, j).x + island(m, j).collider.w + 1; });
      reject(`${route}/${j} checkpoint unknown field`, m => { checkpoint(m, route, j).extra = true; });
      reject(`${route}/${j} checkpoint velocity changed`, m => { checkpoint(m, route, j).vy = [-450, 600]; });
      reject(`${route}/${j} co-edited band not physical`, m => {
        const q = checkpoint(m, route, j), guard = local(m, route)[2 * j + 1];
        q.y = [q.y[0] + 1, q.y[1] - 1]; guard.minY = q.y[0]; guard.maxY = q.y[1];
      });
    }
    for (const [key, value] of [['endX', 4559], ['endX', 4561], ['targetY', 301], ['minY', 20],
      ['maxY', 520], ['phase', 'unknown'], ['mechanism', 'unknown'], ['allowedActions', ['flap']],
      ['vy', [-450, 601]], ['maxDwellTicks', 1], ['extra', true]])
      reject(`${route} final ${key}`, m => { local(m, route)[6][key] = value; });
    reject(`${route} missing segment`, m => {
      const q = local(m, route)[0]; m.routes[route].segments.splice(m.routes[route].segments.indexOf(q), 1);
    });
    reject(`${route} extra segment`, m => {
      const q = local(m, route)[0]; m.routes[route].segments.splice(m.routes[route].segments.indexOf(q), 0, {...q, endX: q.endX - 1});
    });
    reject(`${route} four/seven mismatch`, m => {
      const old = local(m, route); m.routes[route].segments.splice(m.routes[route].segments.indexOf(old[0]), 7,
        ...structuredClone(local(bases.r004, route)));
    });
    reject(`${route} out-of-order guards`, m => {
      const list = m.routes[route].segments, old = local(m, route), k = list.indexOf(old[0]);
      [list[k], list[k + 1]] = [list[k + 1], list[k]];
    });
  }
  for (const j of [0, 1, 2]) {
    reject(`${j} opposite-side contract lost`, m => {
      const q = checkpoint(m, 'main', j), alt = checkpoint(m, 'branch', j);
      alt.y = [...q.y];
      const a = local(m, 'main'), b = local(m, 'branch');
      b[2 * j].targetY = b[2 * j + 1].targetY = a[2 * j].targetY;
      b[2 * j + 1].minY = q.y[0]; b[2 * j + 1].maxY = q.y[1];
    });
    reject(`${j} stale position`, m => { island(m, j).x++; });
    reject(`${j} stale width`, m => { island(m, j).collider.w++; });
    reject(`${j} stale vertical edge`, m => { island(m, j).y++; });
    reject(`${j} unsupported island height`, m => { island(m, j).collider.h++; });
    reject(`${j} nonlethal island`, m => { island(m, j).interaction.lethal = false; });
    reject(`${j} moving island`, m => { island(m, j).motion = {amplitude_px: 1, period_s: 2, phase_rad: 0}; });
    reject(`${j} timed island`, m => { island(m, j).timeline = {start_s: 0}; });
    reject(`${j} extra collider key`, m => { island(m, j).collider.extra = true; });
    reject(`${j} extra interaction`, m => { island(m, j).interaction.other = true; });
    reject(`${j} extra island field`, m => { island(m, j).other = true; });
    reject(`${j} changed group`, m => { island(m, j).group_id = 'unknown'; });
    reject(`${j} absent island`, m => { m.obstacles = m.obstacles.filter(o => o !== island(m, j)); });
  }
  const unrepaired = require('./relations-r004.cjs').generate(require('./versions/r004.json'), entry);
  assert.throws(() => transform(unrepaired, entry), /route segments must be strictly ordered/); cases++;
  return cases;
}

module.exports = {transform, selfTest, ALGORITHM};
if (require.main === module) {
  if (process.argv.length !== 3 || process.argv[2] !== '--self-test') throw Error('Usage: node source/spring-transform-guarded.cjs --self-test');
  process.stdout.write(JSON.stringify(selfTest()) + '\n');
}
