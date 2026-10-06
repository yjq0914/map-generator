'use strict';
// Generation only: derive one stage-local order from authored action relations,
// then relocate whole packages. No rollout, evidence lookup, rejection sampling,
// or state migration. Bounded-surface input support; stage-order planner unchanged.
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const ALGORITHM = 'relational-stage-order/1';
const SPRING_PROFILES = new Map([
  ['single-optional-spring/1', {ruleVersion: 1, startOffset: -245, width: 270}],
  ['single-optional-spring/2-guarded-input', {ruleVersion: 2, startOffset: -245, width: 270}],
  ['single-optional-spring/3-bounded-contact-surface', {ruleVersion: 3, startOffset: -40, width: 65}]
]);
const STRIDE = 1500, BOUNDARY = 1560, ROUTES = ['main', 'branch'];
const CONTACT_X = ['startX', 'landingTargetX', 'minContactX', 'maxContactX', 'receiverEntryX', 'receiverExitX'];
const RELATIONS = new Set(['planned-centerline-meander', 'action-conditioned-spacing',
  'same-side-hold-then-turn', 'sustained-moving-corridor', 'continuous-two-route-corridor',
  'fixed-island-between-moving-pairs', 'short-relief-tail-corridor', 'local-vertical-echo',
  'contact-first-optional-branch', 'whole-body-exit-route-domain']);
const clone = structuredClone, same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b) => Math.abs(a - b) < 1e-7;
const fail = message => { throw Error('Relational order transform: ' + message); };
const keys = (o, allowed, label) => {
  if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).some(k => !allowed.includes(k)))
    fail('unsupported ' + label + ' fields');
};
const ownedIndex = id => { const m = /^c(0|[1-9]\d*)-/.exec(id); return m ? +m[1] : -1; };
const remapId = (id, slot) => id.replace(/^c\d+-/, 'c' + slot + '-');
const localSegments = (m, route, i) => m.routes[route].segments.filter(s =>
  s.endX > i * STRIDE + 60 && s.endX <= i * STRIDE + BOUNDARY);
const localObjects = (m, i) => m.obstacles.filter(o => ownedIndex(o.id) === i);
const phaseShift = (motion, dx) => {
  const result = clone(motion);
  if (result) result.phase_rad -= dx / F.VX * 2 * Math.PI / result.period_s;
  return result;
};

function validateInput(m, e, op) {
  keys(op, ['type'], 'operation');
  if (op.type !== undefined && op.type !== 'relational-order') fail('unsupported operation');
  if (!e || typeof e !== 'object' || Array.isArray(e)) fail('entry must be an object');
  if (F.R !== 10 || F.VX !== 150 || F.G !== 820 || F.FLAP !== -290 || F.DT !== 1 / 120)
    fail('physics/controller dependency changed');
  if (!m || m.schema !== 'timed-course-120/v1' || !Array.isArray(m.components) ||
      ![4, 12].includes(m.components.length) || !Array.isArray(m.obstacles) || m.height !== 540 ||
      m.horizon !== m.components.length * 1200 || m.design?.withBridge !== true ||
      m.design?.orderProgram || m.intervention || ['state', 'session', 'checkpoint'].some(k => k in m))
    fail('only an unordered generation-stage map is supported');
  if (!Number.isInteger(m.seed) || m.seed < 0 || m.seed > 4294967295 ||
      e.seed !== undefined && e.seed !== m.seed) fail('entry seed differs from map seed');
  const bounds = {y: [245, 300, 270], vy: [-65, 65, 0], lead: [-20, 20, 0], phase: [-.45, .45, 0]};
  for (const [k, [lo, hi, fallback]] of Object.entries(bounds)) {
    const v = m.condition?.[k] ?? fallback;
    if (!Number.isFinite(v) || v < lo || v > hi || e[k] !== undefined && e[k] !== v)
      fail('entry ' + k + ' differs from map or is outside support');
  }
  if (!same(m.initial_player, {x: 60, y: m.condition?.y ?? 270, vx: 150, vy: m.condition?.vy ?? 0}))
    fail('actual initial player differs from declared entry condition');
  if (!['none', 'upper-after', 'lower-before'].includes(m.condition?.adjacency ?? 'none') ||
      e.adjacency !== undefined && e.adjacency !== (m.condition?.adjacency ?? 'none'))
    fail('unsupported adjacency condition');
  if (['triggers', 'encounters', 'coins'].some(k => !Array.isArray(m[k]) || m[k].length) ||
      !same(m.macroPlan, [{id: 'course', startTick: 0, endTick: 14400}]))
    fail('cross-component triggers, encounters, coins or macro dependencies are unsupported');
  if (!same(Object.keys(m.routes || {}).sort(), ['branch', 'main'])) fail('two named routes required');
  try { F.validate(m); } catch (error) { fail('engine contract: ' + error.message); }
  const n = m.components.length;
  for (const [i, c] of m.components.entries()) {
    if (!['wave', 'mechanical', 'spring'].includes(c.theme) || c.offset !== i * STRIDE ||
        !Number.isFinite(c.entryPhase) || c.relations && !Array.isArray(c.relations) ||
        (c.relations || []).some(r => !r || !RELATIONS.has(r.type))) fail('unsupported component or relation');
    for (const r of c.relations || []) {
      const requiredTheme = ['planned-centerline-meander', 'sustained-moving-corridor', 'fixed-island-between-moving-pairs'].includes(r.type) ? 'mechanical' :
        r.type === 'contact-first-optional-branch' ? 'spring' : r.type === 'short-relief-tail-corridor' ? c.theme : 'wave';
      if (c.theme !== requiredTheme) fail('relation assigned to incompatible component theme');
    }
    const names = localObjects(m, i).map(o => o.id.slice(('c' + i + '-').length));
    const mandatory = c.theme === 'mechanical' ? [0, 1, 2].flatMap(g => ['top', 'bottom'].map(s => `press-${g}-${s}`)) :
      c.theme === 'spring' ? ['divider', 'spring', 'receiver', 'merge-top', 'merge-bottom'] :
      [0, 1, 2].map(g => 'wave-island-' + g);
    if ([...mandatory, 'recovery-top', 'recovery-bottom'].some(id => !names.includes(id)))
      fail('component package is incomplete');
    const optional = ['adj-upper', 'adj-lower', 'tail-top', 'tail-bottom'];
    if (c.theme === 'wave') optional.push('upper-route-rail', 'lower-route-rail');
    if (c.theme === 'mechanical') optional.push('receiver-island-0', 'receiver-island-1');
    if (names.some(id => !mandatory.includes(id) && !optional.includes(id) && !/^recovery-(top|bottom)$/.test(id)))
      fail('unrecognized component geometry');
    const tails = (c.relations || []).filter(r => r.type === 'short-relief-tail-corridor'), tail = tails[0];
    if (tails.length > 1 || !!tail !== names.includes('tail-top') || !!tail !== names.includes('tail-bottom'))
      fail('tail relation/geometry dependency mismatch');
    if (tail) {
      keys(tail, ['type', 'routeIntent', 'bridgeSeconds', 'continuousPhysicalState'], 'tail relation');
      const localStart = tail.routeIntent?.startX - c.offset;
      if (![1110, 1260].includes(localStart) || tail.bridgeSeconds !== 1.6 || tail.continuousPhysicalState !== true ||
          !same(tail.routeIntent, {targetY: 300, physicalGap: 240, startX: c.offset + localStart,
            endX: c.offset + 1300, bridgeStartX: c.offset + 1320}))
        fail('unsupported tail route intent');
      for (const [side, y, h] of [['top', -120, 300], ['bottom', 420, 120]]) {
        const body = m.obstacles.find(o => o.id === `c${i}-tail-${side}`);
        if (body.mechanic_kind !== 'fixed_armor_or_spike' || body.x !== c.offset + localStart ||
            body.y !== y || body.collider.w !== 1300 - localStart || body.collider.h !== h ||
            body.interaction.lethal !== true)
          fail('tail intent/paired geometry mismatch');
      }
    }
    const corridor = (c.relations || []).find(r => r.type === 'continuous-two-route-corridor');
    if (!!corridor !== names.includes('upper-route-rail') || !!corridor !== names.includes('lower-route-rail') ||
        corridor && (!Array.isArray(corridor.spine) || corridor.spine.length !== 2 || corridor.spine[0] <= c.offset + 60 || corridor.spine[1] >= c.offset + 1120))
      fail('two-route corridor relation/geometry dependency mismatch');
    const mixed = (c.relations || []).find(r => r.type === 'fixed-island-between-moving-pairs');
    if (!!mixed !== names.includes('receiver-island-0') || !!mixed !== names.includes('receiver-island-1') ||
        mixed?.receivers && (!Array.isArray(mixed.receivers) || mixed.receivers.length !== 2 ||
          mixed.receivers.some(r => !Number.isFinite(r.x) || r.x <= c.offset + 60 || r.x >= c.offset + 1120)))
      fail('mixed receiver relation/geometry dependency mismatch');
    for (const route of ROUTES) {
      const segs = localSegments(m, route, i), connector = m.routes[route].connectors?.[i];
      if (!segs.length || segs.at(-1).endX !== c.offset + BOUNDARY ||
          !connector || connector.startX !== c.offset + (tail ? 1320 : 1120) ||
          connector.boundaryX !== c.offset + BOUNDARY) fail('component route/bridge boundary changed');
      const checkpointNames = m.routes[route].checkpoints?.filter(q => ownedIndex(q.id) === i).map(q => q.id.slice(('c' + i + '-').length)).sort();
      const requiredChecks = c.theme === 'spring' ? [route === 'main' ? 'upper-side' : 'under-island', 'merge'] :
        [0, 1, 2].map(j => (c.theme === 'mechanical' ? 'press-' : 'wave-') + j);
      if (tail) {
        requiredChecks.push('tail-exit');
        const q = m.routes[route].checkpoints.find(q => q.id === `c${i}-tail-exit`);
        if (!same(q, {id: `c${i}-tail-exit`, x: c.offset + 1290, y: [190, 410], vy: [-450, 600]}))
          fail('tail checkpoint/intent mismatch');
      }
      if (mixed) requiredChecks.push('mixed-receiver-0', 'mixed-receiver-1');
      if (!same(checkpointNames, requiredChecks.sort())) fail('component checkpoint package incomplete or unfamiliar');
    }
  }
  if (m.components[0].theme !== 'wave') fail('first wave warmup must remain available');
  for (let stage = 0; stage < n / 4; stage++) {
    const count = m.components.slice(stage * 4, stage * 4 + 4).filter(c => c.theme === 'mechanical').length;
    if (count !== [2, 2, 1][stage]) fail('mechanical stage counts must be 2/2/1 (or first stage 2)');
  }
  const obsKeys = ['id', 'mechanic_kind', 'x', 'y', 'collider', 'motion', 'timeline', 'effect_region', 'interaction', 'group_id'];
  for (const o of m.obstacles) {
    const i = ownedIndex(o.id), c = m.components[i];
    keys(o, obsKeys, 'geometry'); keys(o.collider, ['shape', 'w', 'h'], 'collider');
    if (!c || o.group_id !== o.id || o.collider.shape !== 'rectangle' || o.timeline !== null ||
        o.effect_region !== null || !['fixed_armor_or_spike', 'vertical_armor_slider', 'spring_wall'].includes(o.mechanic_kind) ||
        o.x - F.R <= c.offset + 60 || o.x + o.collider.w + F.R >= c.offset + BOUNDARY)
      fail('geometry has unsupported cross-component dependency');
    if (o.mechanic_kind === 'vertical_armor_slider') {
      keys(o.motion, ['amplitude_px', 'period_s', 'phase_rad'], 'moving schedule');
      if (c.theme !== 'mechanical' || !/^c\d+-press-[0-2]-(top|bottom)$/.test(o.id)) fail('non-pair motion');
    } else if (o.motion !== null) fail('unsupported fixed-body motion');
    keys(o.interaction, o.mechanic_kind === 'spring_wall' ?
      ['lethal', 'bounce_speed_px_s', 'cooldown_s', 'contact_mode'] : ['lethal'], 'interaction');
  }
  // Validate actual paired collider gaps, not a metadata promise.
  const gaps = [], actualPairs = new Map();
  for (const [i, c] of m.components.entries()) if (c.theme === 'mechanical') {
    for (let gate = 0; gate < 3; gate++) {
      const id = `c${i}-press-${gate}`, a = m.obstacles.find(o => o.id === id + '-top'), b = m.obstacles.find(o => o.id === id + '-bottom');
      const gap = b.y - a.y - a.collider.h, stage = Math.floor(i / 4);
      if (a.x !== b.x || a.collider.w !== b.collider.w || !same(a.motion, b.motion) ||
          a.mechanic_kind !== 'vertical_armor_slider' || b.mechanic_kind !== 'vertical_armor_slider' ||
          a.interaction.lethal !== true || b.interaction.lethal !== true || gap < 120 || gap > 180)
        fail('unsupported synchronized mechanical pair');
      actualPairs.set(id, {componentIndex: i, stageIndex: stage, physicalGapPx: gap, motion: a.motion});
      if (gaps[stage] === undefined) gaps[stage] = gap;
      if (!near(gaps[stage], gap)) fail('stage aperture is not uniform');
    }
  }
  // Both explicitly bounded pressure versions are supported; the transform never alters either.
  if (![160, 180].includes(gaps[0]) || gaps.some((v, s) => !near(v, gaps[0] - 20 * s)))
    fail('unsupported stage aperture program');
  const pressure = m.design.pressureProgram;
  if (pressure?.algorithm !== 'stage-conditioned-aperture/1' || !Array.isArray(pressure.pairRecords) ||
      pressure.pairRecords.length !== actualPairs.size || pressure.relation?.introductionGapPx !== gaps[0] ||
      pressure.relation?.decreasePerStagePx !== 20) fail('missing or incompatible pressure dependency record');
  const recordedPairs = new Set();
  for (const r of pressure.pairRecords) {
    const pair = actualPairs.get(r.pairId);
    if (!pair || recordedPairs.has(r.pairId) || r.componentIndex !== pair.componentIndex || r.stageIndex !== pair.stageIndex ||
        !near(r.physicalGapPx, pair.physicalGapPx) || !near(r.nominalRadiusExpandedCoreWidthPx, pair.physicalGapPx - 2 * F.R) ||
        !same(r.inheritedMotion, pair.motion)) fail('pressure record ownership, gap or phase linkage changed');
    recordedPairs.add(r.pairId);
  }
  for (const route of ROUTES) {
    const p = m.routes[route];
    keys(p, ['segments', 'checkpoints', 'events', 'exit', 'recoveryTicks', 'finalDomain', 'connectors', 'contact'], 'route');
    try { Contract.validate(m, route); } catch (error) { fail('route contract: ' + error.message); }
    if (!Array.isArray(p.checkpoints) || !Array.isArray(p.connectors) || p.connectors.length !== n ||
        !same(p.finalDomain, {y: [245, 300], vy: [-65, 65]}) ||
        !same(p.exit, {x: n * STRIDE - 220, y: [150, 420], vy: [-310, 400]}) || p.recoveryTicks !== 120)
      fail('exit/recovery dependency changed');
    if (p.segments.some((s, i, a) => !Number.isFinite(s.endX) || s.endX <= 60 || s.endX > n * STRIDE + 60 || i && s.endX <= a[i - 1].endX))
      fail('segments must be strictly ordered and completely owned');
    for (const s of p.segments) {
      keys(s, ['endX', 'targetY', 'minY', 'maxY', 'vy', 'phase', 'mechanism', 'allowedActions', 'maxDwellTicks'], 'segment');
      if (![s.targetY, s.minY, s.maxY].every(Number.isFinite) || s.targetY < s.minY || s.targetY > s.maxY ||
          s.minY < 10 || s.maxY > 530 || s.minY >= s.maxY || !same(s.vy, [-450, 600]) ||
          s.phase !== 'any' || s.mechanism !== 'none' || !same(s.allowedActions, ['flap', 'release']) || s.maxDwellTicks !== null)
        fail('unsupported local route action contract');
    }
    for (const c of p.connectors) keys(c, ['startX', 'boundaryX'], 'connector');
    const seen = new Set();
    for (const q of p.checkpoints) {
      keys(q, ['id', 'x', 'y', 'vy'], 'checkpoint');
      if (typeof q.id !== 'string' || seen.has(q.id) || q.y.some(v => !Number.isFinite(v)) || q.y[0] > q.y[1] ||
          !Array.isArray(q.vy) || q.vy.length !== 2 || q.vy.some(v => !Number.isFinite(v)) || q.vy[0] > q.vy[1])
        fail('invalid or duplicate checkpoint');
      seen.add(q.id);
      if (q.id.startsWith('handoff-')) {
        const i = +q.id.slice(8);
        if (!Number.isInteger(i) || i < 0 || i >= n - 1 ||
            !same(q, {id: 'handoff-' + i, x: i * STRIDE + BOUNDARY, y: [245, 300], vy: [-65, 65]}))
          fail('handoff envelope changed');
      } else {
        const i = ownedIndex(q.id);
        if (!m.components[i] || q.x <= i * STRIDE + 60 || q.x >= i * STRIDE + BOUNDARY)
          fail('checkpoint ownership dependency');
      }
    }
    for (let i = 0; i < n - 1; i++) if (!seen.has('handoff-' + i)) fail('missing inherited handoff');
  }
  if (m.routeMarks.length !== n || m.routeMarks.some((r, i) => r.id !== 'component-' + i || r.x !== i * STRIDE + 1450))
    fail('one canonical route mark per component required');
  const springs = m.obstacles.filter(o => o.mechanic_kind === 'spring_wall');
  const springComponents = m.components.map((c, i) => c.theme === 'spring' ? i : -1).filter(i => i >= 0);
  if (springs.length !== springComponents.length || springs.length > 1 || m.routes.main.contact)
    fail('only one optional global branch contact is supported');
  if (springs.length) {
    const spring = springs[0], i = ownedIndex(spring.id), contact = m.routes.branch.contact;
    keys(contact, [...CONTACT_X, 'surfaceY', 'springId'], 'contact');
    const receiver = m.obstacles.find(o => o.id === `c${i}-receiver`);
    if (contact.springId !== spring.id || !same(m.routes.main.events, ['no-bounce']) || !same(m.routes.branch.events, ['bounce']) ||
        !near(contact.maxContactX, spring.x + spring.collider.w) || !near(contact.receiverEntryX, receiver.x - F.R) ||
        !near(contact.receiverExitX, receiver.x + receiver.collider.w + F.R) ||
        CONTACT_X.some(k => !Number.isFinite(contact[k]) || contact[k] <= i * STRIDE + 60 || contact[k] >= i * STRIDE + 1120) ||
        m.design.optionalSpringProgram?.index !== i || !(m.components[i].relations || []).some(r => r.type === 'contact-first-optional-branch'))
      fail('optional spring controller dependency mismatch');
    const component = m.components[i], program = m.design.optionalSpringProgram;
    const springRelations = component.relations.filter(r => r.type === 'contact-first-optional-branch');
    if (springRelations.length !== 1) fail('exactly one spring intent relation required');
    const intent = springRelations[0].intent;
    const profile = SPRING_PROFILES.get(program.algorithm);
    if (!profile || component.ruleId !== program.algorithm || component.ruleVersion !== profile.ruleVersion ||
        component.geometryTransform?.algorithm !== program.algorithm)
      fail('spring algorithm/ruleVersion/geometry linkage mismatch');
    const C = contact.landingTargetX, lead = m.condition?.lead ?? 0;
    const expectedIntent = {
      componentIndex: i, localDesiredContactX: intent?.localDesiredContactX, inheritedLeadPx: lead,
      desiredContactX: C, planeY: 475, desiredCenterY: 465, bounceVelocityY: -400,
      allowedContactX: [C - 40, C + 25], receiverCenterIntervalX: [C + 50, C + 100],
      receiverTopY: 410, receiverCenterMaximumY: 400,
      main: 'upper bypass, globally no bounce',
      branch: 'descending plane contact, one passive bounce, zero flaps through full receiver exit'
    };
    if (profile.ruleVersion === 3) expectedIntent.contactSurfaceX = [C - 40, C + 25];
    keys(intent, Object.keys(expectedIntent), 'spring intent');
    if (Object.entries(expectedIntent).some(([k, v]) => !same(intent[k], v)))
      fail('spring intent shape or contact surface mismatch');
    // Only the two historical broad profiles and the exact declared 65px
    // bounded profile are supported. Matching metadata cannot bless a new shape.
    for (const [name, x, y, width, height] of [
      ['divider', C - 355, 285, 80, 25],
      ['receiver', C + 60, 410, 30, 130],
      ['merge-top', C + 275, -120, 35, 300],
      ['merge-bottom', C + 275, 420, 35, 120]
    ]) {
      const body = m.obstacles.find(o => o.id === `c${i}-${name}`);
      if (body.mechanic_kind !== 'fixed_armor_or_spike' || body.x !== x || body.y !== y ||
          body.collider.w !== width || body.collider.h !== height || body.interaction.lethal !== true)
        fail('spring core geometry/intent mismatch');
    }
    if (!intent || intent.componentIndex !== i || intent.desiredContactX !== contact.landingTargetX ||
        !same(intent.allowedContactX, [contact.minContactX, contact.maxContactX]) ||
        !same(intent.receiverCenterIntervalX, [contact.receiverEntryX, contact.receiverExitX]) ||
        intent.planeY !== contact.surfaceY || contact.surfaceY !== spring.y ||
        !same(intent, m.design.optionalSpringProgram.intent) ||
        !Number.isFinite(intent.localDesiredContactX) || intent.localDesiredContactX < 725 || intent.localDesiredContactX > 765 ||
        intent.desiredContactX !== i * STRIDE + (m.condition?.lead ?? 0) + intent.localDesiredContactX ||
        contact.startX !== intent.desiredContactX - 250 || contact.minContactX !== intent.desiredContactX - 40 ||
        spring.x !== intent.desiredContactX + profile.startOffset || spring.collider.w !== profile.width || spring.collider.h !== 16 ||
        spring.y !== 475 || receiver.y !== 410 || receiver.collider.w !== 30 ||
        spring.interaction.lethal !== false || spring.interaction.bounce_speed_px_s !== 400 || spring.interaction.cooldown_s !== .2 ||
        spring.interaction.contact_mode !== 'descending-top-only')
      fail('spring intent/route dependency mismatch');
  } else if (m.routes.branch.contact || ROUTES.some(r => m.routes[r].events.length)) fail('unexpected global events/contact');
  return {seed: m.seed, n, physicalGapPx: gaps, centerClearancePx: gaps.map(g => g - 2 * F.R)};
}

function traits(m, i) {
  const c = m.components[i], relationTypes = (c.relations || []).map(r => r.type);
  const paths = ROUTES.map(route => {
    const all = localSegments(m, route, i), core = all.filter(s => s.endX <= c.offset + 1110);
    const use = core.length ? core : [all[0]];
    const ys = use.map(s => s.targetY), deltas = ys.map((y, j) => y - (j ? ys[j - 1] : 300));
    return {entry: deltas[0] / 240, terminal: deltas.at(-1) / 480,
      travel: Math.min(1, deltas.reduce((sum, d) => sum + Math.abs(d), 0) / 900),
      turns: deltas.slice(1).filter((d, j) => d * deltas[j] < 0).length / 4,
      firstY: ys[0], hold: Math.min(1, Math.max(...use.map((s, j) =>
        s.endX - (j ? use[j - 1].endX : c.offset + 60))) / 1050)};
  });
  const mean = k => (paths[0][k] + paths[1][k]) / 2;
  return {sourceIndex: i, theme: c.theme, relations: relationTypes,
    entryAction: paths.map(p => p.entry), terminalAction: paths.map(p => p.terminal),
    rhythm: [mean('travel'), mean('turns'), mean('hold'), c.theme === 'mechanical' ? 1 : 0,
      c.theme === 'spring' ? 1 : 0, Math.min(1, Math.abs(paths[0].firstY - paths[1].firstY) / 300)]};
}
function affinity(a, b) {
  // These are authored experiential relations, never a claim of physical feasibility.
  const compatibility = 1 - Math.min(1, a.terminalAction.reduce((s, x, r) => s + Math.abs(x - b.entryAction[r]), 0) / 4);
  const contrast = a.rhythm.reduce((s, x, j) => s + Math.abs(x - b.rhythm[j]), 0) / a.rhythm.length;
  const roleChange = a.theme === b.theme ? 0 : 1;
  const relationContrast = same(a.relations, b.relations) ? 0 : 1;
  return .35 * compatibility + .35 * contrast + .2 * roleChange + .1 * relationContrast;
}
function rank(seed, stage, slot, source) {
  let x = (seed ^ Math.imul(stage + 11, 0x9e3779b1) ^ Math.imul(slot + 23, 0x85ebca77) ^ Math.imul(source + 41, 0xc2b2ae3d)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return ((x >>> 0) + .5) / 4294967296;
}
function planOrder(m, support) {
  const all = m.components.map((_, i) => traits(m, i)), order = [], decisions = [];
  // Construct each slot from remaining packages. There is no permutation/template table.
  for (let stage = 0; stage < support.n / 4; stage++) {
    const remaining = [0, 1, 2, 3].map(j => stage * 4 + j);
    while (remaining.length) {
      const slot = order.length, previous = order.length ? all[order.at(-1)] : null;
      if (slot === 0) {
        order.push(0); remaining.splice(remaining.indexOf(0), 1);
        decisions.push({slot, sourceIndex: 0, reason: 'preserve authored initial-condition warmup', candidates: []});
        continue;
      }
      const candidates = remaining.map(i => {
        const incoming = affinity(previous, all[i]);
        let successors = remaining.filter(j => j !== i);
        if (!successors.length && stage + 1 < support.n / 4) successors = [0, 1, 2, 3].map(j => (stage + 1) * 4 + j);
        const outgoing = successors.length ? Math.max(...successors.map(j => affinity(all[i], all[j]))) :
          1 - Math.min(1, all[i].rhythm[0]);
        const seedRank = rank(support.seed, stage, slot, i);
        return {sourceIndex: i, incoming, outgoing, seedRank, score: .65 * incoming + .35 * outgoing + .9 * seedRank};
      }).sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex);
      const picked = candidates[0].sourceIndex;
      order.push(picked); remaining.splice(remaining.indexOf(picked), 1);
      decisions.push({slot, sourceIndex: picked, reason: 'previous/next relation plus continuous seeded rank', candidates});
    }
  }
  return {order, decisions, traits: all};
}

function shiftIntent(intent, dx, slot) {
  const r = clone(intent); r.componentIndex = slot; r.desiredContactX += dx;
  for (const k of ['allowedContactX', 'receiverCenterIntervalX', 'contactSurfaceX'])
    if (Object.hasOwn(r, k)) r[k] = r[k].map(x => x + dx);
  return r;
}
function moveRelations(relations, dx, slot) {
  return (relations || []).map(value => {
    const r = clone(value);
    if (r.type === 'continuous-two-route-corridor') r.spine = r.spine.map(x => x + dx);
    if (r.type === 'fixed-island-between-moving-pairs' && r.receivers) r.receivers.forEach(q => { q.x += dx; });
    if (r.type === 'short-relief-tail-corridor') for (const k of ['startX', 'endX', 'bridgeStartX']) r.routeIntent[k] += dx;
    if (r.type === 'contact-first-optional-branch') r.intent = shiftIntent(r.intent, dx, slot);
    return r;
  });
}
function transform(parentMap, e = {}, op = {}) {
  const support = validateInput(parentMap, e, op);
  // Complete the plan before deriving any relocated routes or geometry.
  const planned = planOrder(parentMap, support);
  const toSlot = []; planned.order.forEach((source, slot) => { toSlot[source] = slot; });
  const map = clone(parentMap), moves = planned.order.map((sourceIndex, slot) =>
    ({sourceIndex, slot, deltaOffset: (slot - sourceIndex) * STRIDE, stage: Math.floor(slot / 4)}));
  map.components = moves.map(({sourceIndex, slot, deltaOffset}) => {
    const c = clone(parentMap.components[sourceIndex]); c.offset = slot * STRIDE;
    if (c.relations) c.relations = moveRelations(c.relations, deltaOffset, slot);
    c.orderRelocation = {algorithm: ALGORITHM, sourceIndex, slot, deltaOffset};
    return c;
  });
  map.obstacles = moves.flatMap(({sourceIndex, slot, deltaOffset}) => localObjects(parentMap, sourceIndex).map(source => {
    const o = clone(source); o.id = remapId(o.id, slot); o.group_id = o.id; o.x += deltaOffset;
    o.motion = phaseShift(o.motion, deltaOffset); return o;
  }));
  map.routeMarks = moves.map(({sourceIndex, slot, deltaOffset}) => ({...clone(parentMap.routeMarks[sourceIndex]),
    id: 'component-' + slot, x: parentMap.routeMarks[sourceIndex].x + deltaOffset}));
  for (const route of ROUTES) {
    const p = map.routes[route], src = parentMap.routes[route];
    p.segments = moves.flatMap(({sourceIndex, deltaOffset}) => localSegments(parentMap, route, sourceIndex)
      .map(s => ({...clone(s), endX: s.endX + deltaOffset})));
    p.checkpoints = moves.flatMap(({sourceIndex, slot, deltaOffset}) => {
      const q = src.checkpoints.filter(q => ownedIndex(q.id) === sourceIndex)
        .map(q => ({...clone(q), id: remapId(q.id, slot), x: q.x + deltaOffset}));
      if (slot < support.n - 1) q.push({id: 'handoff-' + slot, x: slot * STRIDE + BOUNDARY, y: [245, 300], vy: [-65, 65]});
      return q;
    }).sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
    p.connectors = moves.map(({sourceIndex, deltaOffset}) => ({startX: src.connectors[sourceIndex].startX + deltaOffset,
      boundaryX: src.connectors[sourceIndex].boundaryX + deltaOffset}));
    if (p.contact) {
      const source = ownedIndex(p.contact.springId), slot = toSlot[source], dx = (slot - source) * STRIDE;
      p.contact.springId = remapId(p.contact.springId, slot);
      for (const k of CONTACT_X) p.contact[k] += dx;
    }
    if (p.segments.length !== src.segments.length || p.segments.some((s, i, a) => i && s.endX <= a[i - 1].endX))
      fail('relocation lost a segment or produced non-increasing endpoints');
    Contract.validate(map, route);
  }
  map.design.components = map.components;
  if (map.design.pressureProgram?.pairRecords) {
    map.design.pressureProgram.pairRecords = map.design.pressureProgram.pairRecords.map(r => {
      const oldIndex = r.componentIndex, slot = toSlot[oldIndex], dx = (slot - oldIndex) * STRIDE;
      return {...r, pairId: remapId(r.pairId, slot), componentIndex: slot,
        inheritedMotion: phaseShift(r.inheritedMotion, dx)};
    }).sort((a, b) => a.componentIndex - b.componentIndex || a.pairId.localeCompare(b.pairId));
  }
  // Earlier operation records are provenance in source-slot coordinates. Add an
  // explicit current-slot view instead of rewriting the generating recipe.
  if (map.design.optionalSpringProgram) {
    const p = map.design.optionalSpringProgram, source = p.index, slot = toSlot[source], dx = (slot - source) * STRIDE;
    p.preOrderIndex = source; p.index = slot; p.intent = shiftIntent(p.intent, dx, slot);
    p.orderRelocation = {sourceIndex: source, slot, deltaOffset: dx,
      provenanceFields: ['operation', 'inheritedComponent', 'preserved']};
  }
  map.design.orderProgram = {algorithm: ALGORITHM, operation: {type: 'relational-order'}, seed: support.seed,
    sourceAtSlot: planned.order, slotOfSource: toSlot, moves, decisions: planned.decisions, authoredTraits: planned.traits,
    physicalGapPxByStage: support.physicalGapPx, centerClearancePxByStage: support.centerClearancePx,
    mechanicalComponentsByStage: [2, 2, 1].slice(0, support.n / 4),
    construction: 'stage-local greedy relation construction; previous action compatibility, next action contrast, deterministic continuous seed ranks; no template list or outcomes',
    warmup: 'source component 0 fixed at slot 0 to preserve the initial-condition introduction',
    phaseRelation: 'newPhase = oldPhase - deltaOffset / 150 * 2*pi / period; one uninterrupted global clock',
    provenanceCoordinates: 'relationshipProgram, geometryTransforms and optionalSpringProgram.operation/inheritedComponent retain pre-order source-slot coordinates; use slotOfSource to resolve',
    preserved: ['initial_player', 'horizon', 'durationTicks', 'global clock semantics', 'exit', 'recoveryTicks', 'finalDomain',
      'local collider dimensions', 'paired stage gaps', 'complete local route packages'],
    qualification: 'finite supported stage composition only; static relocation invariants are not trajectory feasibility, online choice or human experience evidence',
    runtimeStateMigrated: false, realizedExecutionEvidence: null};
  map.design.qualification = 'unvalidated relational macro-order; requires fresh paired full-span execution';
  F.validate(map);
  return map;
}

function selfTest() {
  const assert = require('node:assert/strict');
  // Block every exported engine function except static schema validation (and
  // the timed-schema predicate). Include the lower-level APIs, not just F.step.
  const engines = [
    ['core', F, ['validate']],
    ['baseline', require('./vendor/baseline/core.js'), ['validate']],
    ['timed', require('./vendor/engine/timed-course.js'), ['validate', 'isTimed']],
    ['arrival', require('./vendor/engine/arrival-triggers.js'), ['validate']]
  ];
  const saved = [];
  let forbiddenPhysicsCalls = 0;
  for (const [name, api, allowed] of engines) for (const k of Object.keys(api))
    if (typeof api[k] === 'function' && !allowed.includes(k)) {
      saved.push([api, k, api[k]]);
      api[k] = () => { forbiddenPhysicsCalls++; throw Error('Static fixtures forbid physics: ' + name + '.' + k); };
    }
  try {
    // Preserve the original 414 fixtures with the frozen broad-spring author.
    const Author = require('./relations-r007.cjs');
    const OriginalOrder = require('../design/order-transform.cjs');
    const fs = require('node:fs');
    const plannerText = s => s.slice(s.indexOf('function traits('), s.indexOf('function shiftIntent('));
    assert.equal(plannerText(fs.readFileSync(__filename, 'utf8')),
      plannerText(fs.readFileSync(require.resolve('../design/order-transform.cjs'), 'utf8')));
    let originalOrderComparisons = 0;
    const entry = {y: 270, vy: 0, lead: 0, phase: 0, adjacency: 'none', seed: 42};
    const current = [{type: 'wave-rhythm', delta: 35}, {type: 'hold-turn', indices: [0, 8], width: 115},
      {type: 'long-gates', width: 90}, {type: 'twin-corridor', indices: [6], center: 260}];
    const future = [{type: 'optional-spring', index: 2}, ...current,
      {type: 'meander', amplitude: 18}, {type: 'mixed-receiver', indices: [3, 7], offset: 70},
      {type: 'short-tail'}, {type: 'mirror-wave', indices: [10]}, {type: 'whole-body-guard'}];
    let cases = 0, generated = 0;
    const orders = new Set(), themes = new Set(), springSlots = new Set(), stageOrders = [new Set(), new Set(), new Set()];
    const generate = (e, operations = current, level = 'whole') => Author.generate({version: 'order-static-fixture', operations}, e, {level});
    const check = (p, e) => {
      const before = JSON.stringify(p), m = transform(p, e), plan = m.design.orderProgram;
      assert.equal(JSON.stringify(p), before); assert.deepEqual(transform(p, e), m);
      if (p.design.optionalSpringProgram?.algorithm !== 'single-optional-spring/3-bounded-contact-surface' &&
          !p.components.some(c => c.relations?.some(r => r.type === 'short-relief-tail-corridor' && r.routeIntent.startX === c.offset + 1260))) {
        assert.deepEqual(m, OriginalOrder.transform(p, e)); originalOrderComparisons++;
      }
      for (const key of ['relationshipProgram', 'geometryTransforms']) assert.deepEqual(m.design[key], p.design[key]);
      for (const key of ['initial_player', 'condition', 'durationTicks', 'horizon', 'macroPlan', 'worldBounds']) assert.deepEqual(m[key], p[key]);
      assert.equal(new Set(plan.sourceAtSlot).size, p.components.length); assert.equal(plan.sourceAtSlot[0], 0);
      for (const {sourceIndex, slot, deltaOffset} of plan.moves) {
        assert.equal(Math.floor(sourceIndex / 4), Math.floor(slot / 4));
        assert.equal(m.components[slot].theme, p.components[sourceIndex].theme);
        assert.equal(m.components[slot].offset, slot * STRIDE);
        assert.deepEqual(m.components[slot].relations, p.components[sourceIndex].relations && moveRelations(p.components[sourceIndex].relations, deltaOffset, slot));
        const sourceObjects = localObjects(p, sourceIndex), newObjects = localObjects(m, slot);
        assert.equal(sourceObjects.length, newObjects.length);
        for (const o of sourceObjects) {
          const moved = newObjects.find(q => q.id === remapId(o.id, slot)); assert(moved);
          assert.equal(moved.x, o.x + deltaOffset); assert.equal(moved.y, o.y); assert.deepEqual(moved.collider, o.collider);
          assert.deepEqual(moved.interaction, o.interaction);
          if (o.motion) for (const localSeconds of [0, .3, 2.25, 8, 10]) {
            const oldPhase = (sourceIndex * 10 + localSeconds) * 2 * Math.PI / o.motion.period_s + o.motion.phase_rad;
            const newPhase = (slot * 10 + localSeconds) * 2 * Math.PI / moved.motion.period_s + moved.motion.phase_rad;
            assert(near(oldPhase, newPhase));
          }
        }
        for (const route of ROUTES) {
          assert.deepEqual(localSegments(m, route, slot), localSegments(p, route, sourceIndex).map(s => ({...s, endX: s.endX + deltaOffset})));
          const oldCheck = p.routes[route].checkpoints.filter(q => ownedIndex(q.id) === sourceIndex);
          const newCheck = m.routes[route].checkpoints.filter(q => ownedIndex(q.id) === slot);
          assert.deepEqual(newCheck, oldCheck.map(q => ({...q, id: remapId(q.id, slot), x: q.x + deltaOffset})).sort((a, b) => a.x - b.x || a.id.localeCompare(b.id)));
        }
      }
      for (const route of ROUTES) {
        for (const key of ['exit', 'recoveryTicks', 'finalDomain', 'events']) assert.deepEqual(m.routes[route][key], p.routes[route][key]);
        assert.equal(m.routes[route].segments.length, p.routes[route].segments.length);
        for (let slot = 0; slot < m.components.length; slot++) {
          assert.equal(m.routes[route].segments.filter(s => s.endX === slot * STRIDE + BOUNDARY).length, 1);
          assert.equal(m.routes[route].checkpoints.filter(q => q.id === 'handoff-' + slot).length, slot < m.components.length - 1 ? 1 : 0);
        }
        assert.equal(m.routes[route].checkpoints.length, p.routes[route].checkpoints.length);
      }
      if (p.routes.branch.contact) {
        const original = p.routes.branch.contact, oldIndex = ownedIndex(original.springId), slot = plan.slotOfSource[oldIndex], c = m.routes.branch.contact;
        assert.equal(c.springId, `c${slot}-spring`);
        for (const k of CONTACT_X) assert.equal(c[k], original[k] + (slot - oldIndex) * STRIDE);
        const sourceProgram = p.design.optionalSpringProgram, targetProgram = m.design.optionalSpringProgram;
        const sourceIntent = sourceProgram.intent, targetIntent = targetProgram.intent;
        assert.equal(targetProgram.index, slot); assert.equal(targetProgram.preOrderIndex, oldIndex);
        assert.equal(targetIntent.componentIndex, slot);
        const dx = (slot - oldIndex) * STRIDE;
        assert.equal(targetIntent.desiredContactX, sourceIntent.desiredContactX + dx);
        for (const key of ['allowedContactX', 'receiverCenterIntervalX', 'contactSurfaceX']) {
          if (Object.hasOwn(sourceIntent, key)) assert.deepEqual(targetIntent[key], sourceIntent[key].map(x => x + dx));
          else assert.equal(Object.hasOwn(targetIntent, key), false);
        }
        assert.deepEqual(m.components[slot].relations.find(r => r.type === 'contact-first-optional-branch').intent, targetIntent);
        for (const key of ['operation', 'inheritedComponent', 'preserved']) assert.deepEqual(targetProgram[key], sourceProgram[key]);
        if (sourceIntent.contactSurfaceX) {
          const surface = m.obstacles.find(o => o.id === c.springId);
          assert.deepEqual(targetIntent.contactSurfaceX, [surface.x, surface.x + surface.collider.w]);
          assert.deepEqual(targetIntent.contactSurfaceX, [c.minContactX, c.maxContactX]);
          assert.equal(surface.collider.w, 65);
        }
        springSlots.add(slot);
      }
      const gaps = m.components.map((c, i) => c.theme === 'mechanical' ? m.obstacles.find(o => o.id === `c${i}-press-0-bottom`).y -
        m.obstacles.find(o => o.id === `c${i}-press-0-top`).y - m.obstacles.find(o => o.id === `c${i}-press-0-top`).collider.h : null);
      gaps.forEach((gap, i) => { if (gap !== null) assert(near(gap, plan.physicalGapPxByStage[Math.floor(i / 4)])); });
      F.validate(m); ROUTES.forEach(r => Contract.validate(m, r));
      cases++; generated++; return m;
    };
    for (let seed = 0; seed < 256; seed++) {
      const e = {...entry, seed}, m = check(generate(e, future), e), order = m.design.orderProgram.sourceAtSlot;
      orders.add(order.join(',')); themes.add(m.components.map(c => c.theme).join(','));
      stageOrders.forEach((set, stage) => set.add(order.slice(stage * 4, stage * 4 + 4).join(',')));
    }
    for (const level of ['whole', 'stage']) for (const lead of [-20, 0, 20]) for (const phase of [-.4, 0, .4])
      for (const adjacency of ['none', 'upper-after', 'lower-before']) {
        const e = {...entry, lead, phase, adjacency}; check(generate(e, level === 'whole' ? current : [], level), e);
      }
    for (const index of [2, 5, 6, 8, 10, 11]) for (let seed = 0; seed < 8; seed++) {
      const e = {...entry, seed};
      check(generate(e, [{type: 'optional-spring', index}, ...current, {type: 'short-tail'}, {type: 'whole-body-guard'}]), e);
    }
    for (const seed of [0, 1, 42, 65535, 4294967295]) {
      const e = {...entry, seed};
      const m = check(generate(e, [{type: 'hold-turn', width: 110}, {type: 'long-gates', width: 90},
        {type: 'guarded-twin', indices: [6]}]), e);
      for (const [i, c] of m.components.entries()) if (c.theme === 'wave' && !c.relations.some(r => r.type === 'continuous-two-route-corridor'))
        assert.equal(localSegments(m, 'main', i).length, 7);
    }
    const base = generate(entry, future), snapshot = clone(base);
    const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
    check(freeze(base), entry); assert.deepEqual(base, snapshot);
    // A second bounded pressure program demonstrates preservation of actual 160/140/120 physical gaps too.
    const tighter = clone(snapshot);
    for (const o of tighter.obstacles.filter(o => /-press-\d+-top$/.test(o.id))) {
      const b = tighter.obstacles.find(v => v.id === o.id.replace(/top$/, 'bottom'));
      o.collider.h += 10; b.y -= 10; b.collider.h += 10;
    }
    tighter.design.pressureProgram.relation.introductionGapPx -= 20;
    tighter.design.pressureProgram.relation.physicalGapBoundsPx = [120, 160];
    for (const r of tighter.design.pressureProgram.pairRecords) { r.physicalGapPx -= 20; r.nominalRadiusExpandedCoreWidthPx -= 20; }
    assert.deepEqual(check(tighter, entry).design.orderProgram.physicalGapPxByStage, [160, 140, 120]);
    const reject = fn => { assert.throws(fn, /Relational order transform:/); cases++; };
    const mutation = fn => { const p = clone(snapshot); fn(p); reject(() => transform(p, entry)); };
    reject(() => transform(base, null)); reject(() => transform(base, entry, {type: 'shuffle'}));
    reject(() => transform(base, entry, {indices: [0, 1]})); reject(() => transform(base, {...entry, seed: 8}));
    reject(() => transform(base, {...entry, lead: 1})); reject(() => transform(transform(base, entry), entry));
    mutation(p => { p.state = {tick: 1}; });
    mutation(p => { p.initial_player.y = 490; }); mutation(p => { p.initial_player.vy = 400; });
    mutation(p => { p.design.pressureProgram.pairRecords[0].componentIndex = 0; });
    mutation(p => { p.design.pressureProgram.pairRecords[0].physicalGapPx++; });
    mutation(p => { p.design.pressureProgram.pairRecords[0].inheritedMotion.phase_rad++; });
    mutation(p => { p.design.pressureProgram.pairRecords[1] = clone(p.design.pressureProgram.pairRecords[0]); }); mutation(p => { p.components[1].offset++; });
    mutation(p => { p.components[3].theme = 'wave'; }); mutation(p => { p.components[0].theme = 'spring'; });
    mutation(p => { p.components[0].relations.push({type: 'unknown-dependency'}); });
    mutation(p => { p.components[0].relations.push({type: 'planned-centerline-meander'}); });
    mutation(p => { p.components[6].relations.find(r => r.type === 'continuous-two-route-corridor').spine = []; });
    mutation(p => { p.components[1].relations.find(r => r.type === 'short-relief-tail-corridor').routeIntent.startX++; });
    mutation(p => { p.components[2].relations.find(r => r.type === 'contact-first-optional-branch').intent.desiredContactX++; });
    mutation(p => { p.routes.branch.contact.springId = 'c1-spring'; }); mutation(p => { p.routes.branch.contact.receiverExitX++; });
    mutation(p => { p.routes.branch.contact.surfaceY++; }); mutation(p => { p.routes.branch.contact.startX++; });
    mutation(p => { p.obstacles.find(o => o.id === 'c2-spring').y++; });
    mutation(p => { p.routes.main.contact = clone(p.routes.branch.contact); });
    mutation(p => { p.routes.branch.contacts = [p.routes.branch.contact]; });
    mutation(p => { p.routes.branch.events = []; });
    mutation(p => { delete p.routes.main.segments[0].minY; });
    mutation(p => { p.routes.main.segments[1].endX = p.routes.main.segments[0].endX; });
    mutation(p => { p.routes.main.segments = p.routes.main.segments.filter(s => s.endX !== 1560); });
    mutation(p => { p.routes.main.connectors[0].startX--; });
    mutation(p => { p.routes.main.checkpoints.find(q => q.id === 'handoff-0').vy = [-66, 65]; });
    mutation(p => { p.routes.main.checkpoints = p.routes.main.checkpoints.filter(q => q.id !== 'handoff-0'); });
    mutation(p => { p.routes.main.checkpoints = p.routes.main.checkpoints.filter(q => q.id !== 'c1-press-0'); });
    mutation(p => { p.routes.main.checkpoints.find(q => q.id === 'c1-press-0').id = 'c1-unknown'; });
    mutation(p => { p.routes.main.checkpoints.push({id: 'handoff-11', x: 18060, y: [245, 300], vy: [-65, 65]}); });
    mutation(p => { p.obstacles[0].id = p.obstacles[0].group_id = 'foreign-object'; });
    mutation(p => { p.obstacles[0].collider.w = -1; }); mutation(p => { p.obstacles[0].x = NaN; });
    mutation(p => { p.obstacles[0].x = 40; }); mutation(p => { p.obstacles[0].interaction.pair_id = 'foreign'; });
    mutation(p => { p.triggers.push({id: 'unsupported'}); }); mutation(p => { p.coins.push({x: 500}); });
    mutation(p => { p.routeMarks.pop(); });
    mutation(p => { p.obstacles.find(o => o.id === 'c1-press-0-top').motion.phase_rad++; });
    mutation(p => { p.obstacles.find(o => o.id === 'c1-press-0-top').collider.h++; });
    const vx = F.VX; F.VX = 151;
    try { reject(() => transform(base, entry)); } finally { F.VX = vx; }
    assert(orders.size > 32); assert(themes.size > 12); assert(springSlots.size > 1);
    assert(stageOrders.every(set => set.size > 1));
    assert.equal(cases, 414); assert.equal(generated, 365);
    const legacyFixtureCases = cases, legacyGeneratedMaps = generated;
    const Accepted6 = require('./relations-r006.cjs'), config6 = require('./versions/r006.json');
    const Accepted7 = require('./relations-r007.cjs'), config7 = require('./versions/r007.json');
    const BoundedAuthor = require('./relations-r008-repair.cjs'), config8 = require('./versions/r008-repair.json');
    const BroadGuarded = require('./spring-transform-guarded.cjs');
    const candidateSets = [[], [{type: 'short-tail'}], [{type: 'mirror-wave', indices: [10]}],
      [{type: 'short-tail'}, {type: 'mirror-wave', indices: [10]}]];
    const buildCandidate = (e, extra = [], level = 'whole', desiredContactX = 745) =>
      BoundedAuthor.generate({...config8, operations: [...config8.operations.map(op =>
        op.type === 'optional-spring' ? {...op, desiredContactX} : op), ...extra]}, e, {level});
    const counts = {acceptedInputMaps: 0, boundedCandidateMaps: 0, boundedStageMaps: 0,
      boundedSeedMaps: 0, boundedContactPositionMaps: 0, boundedSpringSourceMaps: 0, broadGuardedMaps: 0, fractionalContactMaps: 0};
    for (const lead of [-20, 0, 20]) for (const phase of [-.4, 0, .4])
      for (const adjacency of ['none', 'upper-after', 'lower-before']) {
        const e = {...entry, lead, phase, adjacency};
        check(Accepted6.generate(config6, e), e); check(Accepted7.generate(config7, e), e);
        counts.acceptedInputMaps += 2;
        for (const extra of candidateSets) {
          check(buildCandidate(e, extra), e); counts.boundedCandidateMaps++;
          check(buildCandidate(e, extra, 'stage'), e); counts.boundedStageMaps++;
        }
      }
    // Fixed, prospective consecutive seeds: every generated case must pass.
    // There is no result-conditioned replacement, skip, or seed selection.
    for (let seed = 0; seed < 64; seed++) {
      const e = {...entry, seed}; check(buildCandidate(e), e); counts.boundedSeedMaps++;
    }
    for (const level of ['whole', 'stage']) for (const lead of [-20, 0, 20])
      for (const adjacency of ['none', 'upper-after', 'lower-before']) for (const desiredContactX of [725, 745, 765]) {
        const e = {...entry, lead, adjacency};
        check(buildCandidate(e, [], level, desiredContactX), e); counts.boundedContactPositionMaps++;
      }
    const boundedSpringSlots = new Set();
    for (const index of [2, 5, 6, 8, 10, 11]) for (let seed = 0; seed < 8; seed++) {
      const e = {...entry, seed};
      const operations = [{type: 'optional-spring', index}, ...current, {type: 'short-tail'}, {type: 'whole-body-guard'}];
      const m = check(BoundedAuthor.generate({version: 'bounded-order-static-fixture', operations}, e), e);
      boundedSpringSlots.add(m.design.optionalSpringProgram.index); counts.boundedSpringSourceMaps++;
    }
    for (const lead of [-20, 0, 20]) for (const adjacency of ['none', 'upper-after', 'lower-before']) {
      const e = {...entry, lead, adjacency};
      check(BroadGuarded.transform(Accepted7.generate(config7, e), e, {index: 2}), e); counts.broadGuardedMaps++;
    }
    // Do not recover the authored local decimal by subtracting large world
    // offsets: cancellation could incorrectly reject a supported fractional C.
    for (const desiredContactX of [725.1, 725.125, 745.1, 764.99]) {
      check(BroadGuarded.transform(Accepted7.generate(config7, entry), entry, {index: 2, desiredContactX}), entry);
      check(buildCandidate(entry, [], 'whole', desiredContactX), entry); counts.fractionalContactMaps += 2;
    }
    const boundedBase = buildCandidate(entry), broadBase = BroadGuarded.transform(Accepted7.generate(config7, entry), entry, {index: 2});
    const boundedSnapshot = clone(boundedBase);
    check(freeze(boundedBase), entry); assert.deepEqual(boundedBase, boundedSnapshot);
    const beforeNegative = cases;
    const shapeMutation = (base, fn) => { const p = clone(base); fn(p); reject(() => transform(p, entry)); };
    const mutateBounded = fn => shapeMutation(boundedSnapshot, fn);
    const mutateIntents = (p, fn) => {
      fn(p.design.optionalSpringProgram.intent);
      fn(p.components[2].relations.find(r => r.type === 'contact-first-optional-branch').intent);
    };
    for (const [field, value] of [['algorithm', 'single-optional-spring/1'], ['algorithm', 'unknown-spring']])
      mutateBounded(p => { p.design.optionalSpringProgram[field] = value; });
    for (const value of [1, 2, 4, '3', undefined]) mutateBounded(p => { p.components[2].ruleVersion = value; });
    for (const value of ['single-optional-spring/1', 'unknown-spring', undefined]) {
      mutateBounded(p => { p.components[2].ruleId = value; });
      mutateBounded(p => { p.components[2].geometryTransform.algorithm = value; });
    }
    mutateBounded(p => { delete p.components[2].geometryTransform; });
    mutateBounded(p => { p.components[2].relations.push(clone(p.components[2].relations[0])); });
    for (const value of [undefined, null, [], [3705], [3705, 3770, 3771], [3770, 3705], [3500, 3770], [3706, 3770], [3705, 3771], [NaN, 3770], ['3705', 3770]])
      mutateBounded(p => { mutateIntents(p, q => { q.contactSurfaceX = value; }); });
    mutateBounded(p => { p.design.optionalSpringProgram.intent.contactSurfaceX[0]++; });
    mutateBounded(p => { p.components[2].relations[0].intent.contactSurfaceX[1]++; });
    for (const [key, value] of [['localDesiredContactX', 744], ['localDesiredContactX', NaN], ['localDesiredContactX', '745'], ['inheritedLeadPx', 1], ['desiredCenterY', 466],
      ['bounceVelocityY', -399], ['receiverTopY', 409], ['receiverCenterMaximumY', 399],
      ['main', 'bounce permitted'], ['branch', 'multiple contacts'], ['unknownGeometryX', 3745]])
      mutateBounded(p => { mutateIntents(p, q => { q[key] = value; }); });
    for (const [name, field, value] of [['spring', 'x', 3704], ['spring', 'x', 3500],
      ['spring', 'y', 474], ['receiver', 'x', 3806], ['receiver', 'y', 411],
      ['divider', 'x', 3391], ['merge-top', 'x', 4021], ['merge-bottom', 'y', 419]])
      mutateBounded(p => { p.obstacles.find(o => o.id === 'c2-' + name)[field] = value; });
    for (const [name, field, value] of [['spring', 'w', 64], ['spring', 'w', 66], ['spring', 'w', 270],
      ['spring', 'h', 15], ['receiver', 'w', 31], ['receiver', 'h', 129], ['divider', 'h', 24]])
      mutateBounded(p => { p.obstacles.find(o => o.id === 'c2-' + name).collider[field] = value; });
    mutateBounded(p => { const s = p.obstacles.find(o => o.id === 'c2-spring'); s.x = 3500; s.collider.w = 270; });
    mutateBounded(p => { const s = p.obstacles.find(o => o.id === 'c2-spring'); s.x--; s.collider.w++; });
    mutateBounded(p => { p.obstacles.find(o => o.id === 'c2-spring').interaction.cooldown_s = .3; });
    mutateBounded(p => { p.routes.branch.contact.maxContactX++; });
    mutateBounded(p => { p.routes.branch.contact.minContactX--; });
    for (const base of [snapshot, broadBase]) {
      shapeMutation(base, p => { const s = p.obstacles.find(o => o.id === 'c2-spring'); s.x = 3705; s.collider.w = 65; });
      shapeMutation(base, p => { mutateIntents(p, q => { q.contactSurfaceX = [3705, 3770]; }); });
      shapeMutation(base, p => { p.design.optionalSpringProgram.algorithm = 'single-optional-spring/3-bounded-contact-surface'; });
      shapeMutation(base, p => { p.components[2].ruleVersion = 3; });
      shapeMutation(base, p => { const s = p.obstacles.find(o => o.id === 'c2-spring'); s.x++; s.collider.w--; });
    }
    const boundedStrictRejectionCases = cases - beforeNegative;
    assert.equal(cases, 937); assert.equal(generated, 819);
    const preTailFixtureCases = cases, preTailGeneratedMaps = generated;
    const TailAuthor = require('./relations-r010.cjs'), SourceAuthor = require('./relations-author.cjs');
    const config10 = require('./versions/r010.json');
    const progression = {type: 'progressive-meander', indices: [1, 4, 9], amplitudes: [20, 35, 50]};
    const tailConfig = (startX, future) => ({...config10, operations: [
      ...config10.operations.map(op => op.type === 'short-tail' ? {...op, startX} : op), ...(future ? [progression] : [])]});
    const buildTail = (e, startX, future = false, level = 'whole') =>
      (future ? SourceAuthor : TailAuthor).generate(tailConfig(startX, future), e, {level});
    let tailByteEquivalentComparisons = 0;
    counts.tail1260Maps = 0; counts.tail1110CompanionMaps = 0; counts.progressiveTailMaps = 0;
    counts.tailSeedMaps = 0; counts.tailFrozenMaps = 0; counts.nonSpringTailMaps = 0;
    const compareTailExtents = (early, late) => {
      assert.deepEqual(late.design.orderProgram, early.design.orderProgram);
      const normalized = clone(late);
      for (const [i, c] of normalized.components.entries()) {
        const intent = c.relations.find(r => r.type === 'short-relief-tail-corridor').routeIntent;
        assert.deepEqual(intent, {targetY: 300, physicalGap: 240, startX: c.offset + 1260,
          endX: c.offset + 1300, bridgeStartX: c.offset + 1320});
        intent.startX = c.offset + 1110;
        for (const side of ['top', 'bottom']) {
          const o = normalized.obstacles.find(o => o.id === `c${i}-tail-${side}`);
          assert.equal(o.x, c.offset + 1260); assert.equal(o.collider.w, 40);
          o.x = c.offset + 1110; o.collider.w = 190;
        }
      }
      for (const op of normalized.design.relationshipProgram) if (op.type === 'short-tail') op.startX = 1110;
      // Every byte besides the explicitly declared tail extent and recipe is
      // identical. In particular the planner, routes and bridge are unchanged.
      assert.equal(JSON.stringify(normalized), JSON.stringify(early)); tailByteEquivalentComparisons++;
    };
    for (const level of ['whole', 'stage']) for (const lead of [-20, 0, 20])
      for (const phase of [-.4, 0, .4]) for (const adjacency of ['none', 'upper-after', 'lower-before'])
        for (const future of [false, true]) {
          const e = {...entry, lead, phase, adjacency};
          const early = check(buildTail(e, 1110, future, level), e), late = check(buildTail(e, 1260, future, level), e);
          counts.tail1110CompanionMaps++; counts.tail1260Maps++; if (future) counts.progressiveTailMaps += 2;
          compareTailExtents(early, late);
          if (future) for (const {sourceIndex, slot} of late.design.orderProgram.moves)
            if ([1, 4, 9].includes(sourceIndex)) {
              const relation = late.components[slot].relations.find(r => r.type === 'planned-centerline-meander');
              assert.equal(relation.stageAmplitude, [20, 35, 50][Math.floor(sourceIndex / 4)]);
              assert.equal(relation.wholeBodyGateExitExtraPx, 25);
            }
        }
    for (let seed = 0; seed < 32; seed++) for (const future of [false, true]) {
      const e = {...entry, seed}; check(buildTail(e, 1260, future), e); counts.tailSeedMaps++;
    }
    const tail1260Base = buildTail(entry, 1260), tail1110Base = buildTail(entry, 1110);
    const frozenTail = freeze(clone(tail1260Base)); check(frozenTail, entry); counts.tailFrozenMaps++;
    const nonSpringTail = startX => SourceAuthor.generate({...config6,
      operations: [...config6.operations, {type: 'short-tail', startX}]}, entry);
    compareTailExtents(check(nonSpringTail(1110), entry), check(nonSpringTail(1260), entry)); counts.nonSpringTailMaps += 2;
    const beforeTailNegative = cases;
    for (const [base, localStart, otherStart] of [[tail1110Base, 1110, 1260], [tail1260Base, 1260, 1110]]) {
      const mutateTail = fn => shapeMutation(base, p => {
        const c = p.components[1], r = c.relations.find(r => r.type === 'short-relief-tail-corridor');
        const top = p.obstacles.find(o => o.id === 'c1-tail-top'), bottom = p.obstacles.find(o => o.id === 'c1-tail-bottom');
        fn(p, c, r, top, bottom);
      });
      mutateTail((p, c, r) => { r.routeIntent.startX = c.offset + otherStart; });
      mutateTail((p, c, r, top) => { top.x = c.offset + otherStart; top.collider.w = 1300 - otherStart; });
      mutateTail((p, c, r, top, bottom) => { for (const o of [top, bottom]) { o.x = c.offset + otherStart; o.collider.w = 1300 - otherStart; } });
      for (const unsupported of [1109, 1111, 1250, 1259, 1261, 1110.5])
        mutateTail((p, c, r, top, bottom) => {
          r.routeIntent.startX = c.offset + unsupported;
          for (const o of [top, bottom]) { o.x = c.offset + unsupported; o.collider.w = 1300 - unsupported; }
        });
      for (const [key, value] of [['endX', 2801], ['bridgeStartX', 2821], ['physicalGap', 239],
        ['targetY', 301], ['startX', String(1500 + localStart)], ['unknownX', 2770]])
        mutateTail((p, c, r) => { r.routeIntent[key] = value; });
      mutateTail((p, c, r) => { delete r.routeIntent; });
      mutateTail((p, c, r) => { c.relations.push(clone(r)); });
      mutateTail((p, c, r) => { r.bridgeSeconds = 1.5; });
      mutateTail((p, c, r) => { r.continuousPhysicalState = false; });
      mutateTail((p, c, r) => { r.unknownGeometry = true; });
      mutateTail((p, c, r, top) => { top.collider.w++; });
      mutateTail((p, c, r, top) => { top.collider.h++; });
      mutateTail((p, c, r, top) => { top.y++; });
      mutateTail((p, c, r, top, bottom) => { bottom.y--; });
      mutateTail((p, c, r, top, bottom) => { bottom.collider.h++; });
      mutateTail((p, c, r, top) => { top.interaction.lethal = false; });
      mutateTail((p, c, r, top) => { top.motion = {amplitude_px: 1, period_s: 2, phase_rad: 0}; });
      mutateTail(p => { p.routes.main.checkpoints.find(q => q.id === 'c1-tail-exit').x++; });
      mutateTail(p => { p.routes.branch.checkpoints.find(q => q.id === 'c1-tail-exit').y = [191, 410]; });
      mutateTail(p => { p.routes.main.checkpoints.find(q => q.id === 'c1-tail-exit').vy = [-451, 600]; });
      mutateTail(p => { p.routes.main.connectors[1].startX++; });
      mutateTail(p => { p.obstacles = p.obstacles.filter(o => o.id !== 'c1-tail-top'); });
      mutateTail((p, c) => { c.relations = c.relations.filter(r => r.type !== 'short-relief-tail-corridor'); });
      mutateTail(p => { p.obstacles = p.obstacles.filter(o => !/^c1-tail-/.test(o.id)); });
      mutateTail((p, c) => {
        c.relations = c.relations.filter(r => r.type !== 'short-relief-tail-corridor');
        p.obstacles = p.obstacles.filter(o => !/^c1-tail-/.test(o.id));
      });
      mutateTail(p => { p.routes.main.checkpoints.push(clone(p.routes.main.checkpoints.find(q => q.id === 'c1-tail-exit'))); });
    }
    const tailStrictRejectionCases = cases - beforeTailNegative;
    assert.deepEqual([...boundedSpringSlots].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    assert.equal(forbiddenPhysicsCalls, 0);
    return {pass: true, staticFixtureCases: cases, generatedMaps: generated, duplicateDeterminismChecks: generated,
      legacyFixtureCases, legacyGeneratedMaps, addedStrictRejectionCases: boundedStrictRejectionCases + tailStrictRejectionCases,
      boundedStrictRejectionCases, tailStrictRejectionCases, preTailFixtureCases, preTailGeneratedMaps, tailByteEquivalentComparisons,
      addedGeneratedMaps: generated - legacyGeneratedMaps, fixtureGroups: counts,
      plannerSourceUnchanged: true, originalOrderComparisons,
      boundedSpringSlots: [...boundedSpringSlots].sort((a, b) => a - b),
      forbiddenPhysicsCalls, blockedEngineFunctions: saved.length,
      seedCount: 256, uniqueSourceOrders: orders.size, uniqueThemeOrders: themes.size,
      perStageSourceOrders: stageOrders.map(s => s.size), relocatedSpringSlots: [...springSlots].sort((a, b) => a - b),
      physicsTicksExecuted: 0, fixtureEvidenceOrHoldoutReads: 0,
      claim: 'finite static package-relocation invariants only; full fresh paired 120-second execution still required'};
  } finally { for (const [api, k, value] of saved) api[k] = value; }
}
module.exports = {transform, selfTest, ALGORITHM};
if (require.main === module) {
  if (process.argv.length !== 3 || process.argv[2] !== '--self-test') throw Error('Usage: node source/order-transform-bounded.cjs --self-test');
  process.stdout.write(JSON.stringify(selfTest()) + '\n');
}
