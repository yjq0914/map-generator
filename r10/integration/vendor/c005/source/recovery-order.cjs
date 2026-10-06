'use strict';
// NEW recovery construction derived from authenticated r012 bounded order.
// No claim of original a004 source recovery.
// Generation only: derive one stage-local order from authored action relations,
// then relocate whole packages. No rollout, evidence lookup, rejection sampling,
// or state migration. Bounded-surface input support; stage-order planner unchanged.
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const ALGORITHM = 'recovery-relation-interface-stage-order/1';
const Recovery=require('./recovery-utils.cjs');
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
  'contact-first-optional-branch', 'whole-body-exit-route-domain', 'adaptive-sustained-gates', 'adaptive-tail-entry']);
const clone = structuredClone, same = Recovery.equal;
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9;
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
  if (result && dx !== 0) result.phase_rad -= dx / F.VX * 2 * Math.PI / result.period_s;
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
      const requiredTheme = ['planned-centerline-meander', 'sustained-moving-corridor', 'fixed-island-between-moving-pairs', 'adaptive-sustained-gates', 'adaptive-tail-entry'].includes(r.type) ? 'mechanical' :
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
      if (![1230, 1260].includes(localStart) || tail.bridgeSeconds !== 1.6 || tail.continuousPhysicalState !== true ||
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
    // Derived world-coordinate equations may differ by floating reassociation.
    // Compare only those derived values within 1e-9; material geometry remains
    // constrained by exact constants and independent canonical validation.
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
      if (body.mechanic_kind !== 'fixed_armor_or_spike' || !near(body.x, x) || body.y !== y ||
          body.collider.w !== width || body.collider.h !== height || body.interaction.lethal !== true)
        fail('spring core geometry/intent mismatch');
    }
    if (!intent || intent.componentIndex !== i || !near(intent.desiredContactX, contact.landingTargetX) ||
        !same(intent.allowedContactX, [contact.minContactX, contact.maxContactX]) ||
        !same(intent.receiverCenterIntervalX, [contact.receiverEntryX, contact.receiverExitX]) ||
        intent.planeY !== contact.surfaceY || contact.surfaceY !== spring.y ||
        !same(intent, m.design.optionalSpringProgram.intent) ||
        !Number.isFinite(intent.localDesiredContactX) || intent.localDesiredContactX < 725 || intent.localDesiredContactX > 765 ||
        !near(intent.desiredContactX, i * STRIDE + (m.condition?.lead ?? 0) + intent.localDesiredContactX) ||
        !near(contact.startX, intent.desiredContactX - 250) || !near(contact.minContactX, intent.desiredContactX - 40) ||
        !near(spring.x, intent.desiredContactX + profile.startOffset) || spring.collider.w !== profile.width || spring.collider.h !== 16 ||
        spring.y !== 475 || receiver.y !== 410 || receiver.collider.w !== 30 ||
        spring.interaction.lethal !== false || spring.interaction.bounce_speed_px_s !== 400 || spring.interaction.cooldown_s !== .2 ||
        spring.interaction.contact_mode !== 'descending-top-only')
      fail('spring intent/route dependency mismatch');
  } else if (m.routes.branch.contact || ROUTES.some(r => m.routes[r].events.length)) fail('unexpected global events/contact');
  return {seed: m.seed, n, physicalGapPx: gaps, centerClearancePx: gaps.map(g => g - 2 * F.R)};
}

function eligibleStages(m){
 const n=m.components?.length||0, out=[];
 for(let begin=0;begin<n;begin+=4){
  const indices=Array.from({length:Math.min(4,n-begin)},(_,j)=>begin+j),reasons=[];
  for(const i of indices){
   const c=m.components[i],relations=(c.relations||[]).map(r=>r.type),objects=m.obstacles.filter(o=>ownedIndex(o.id)===i);
   const blocked=relations.filter(t=>['fixed-island-between-moving-pairs','contact-first-optional-branch'].includes(t));
   if(blocked.length)reasons.push({componentIndex:i,relations:blocked,reason:'receiver/contact interfaces not composition-qualified'});
   if(c.theme==='spring'||objects.some(o=>!['fixed_armor_or_spike','vertical_armor_slider'].includes(o.mechanic_kind))||ROUTES.some(r=>ownedIndex(m.routes[r]?.contact?.springId||'')===i))reasons.push({componentIndex:i,reason:'contact or unsupported mechanism'});
   if(relations.some(t=>!RELATIONS.has(t)))reasons.push({componentIndex:i,reason:'unsupported relation'});
   const tail=(c.relations||[]).find(r=>r.type==='short-relief-tail-corridor');
   for(const route of ROUTES){const q=m.routes[route]?.connectors?.[i];if(!q||!tail||!near(q.startX,tail.routeIntent.bridgeStartX)||q.boundaryX-q.startX<225||q.boundaryX-q.startX>255)reasons.push({componentIndex:i,route,reason:'unsupported recovery interface'});}
  }
  out.push({stageId:String(begin/4),componentIndices:indices,eligible:indices.length===4&&!reasons.length,reasons});
 }
 return out;
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
    const eligibility=eligibleStages(m)[stage];
    if(!eligibility.eligible){for(const sourceIndex of remaining){const slot=order.length;order.push(sourceIndex);decisions.push({slot,sourceIndex,reason:'preserve relation-ineligible stage',eligibility,candidates:[]});}continue;}
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
  require('./recovery-canonical.cjs').validate(parentMap,e);
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
    eligibleStages: eligibleStages(parentMap),
    construction: 'semantically eligible stage-local greedy relation construction; previous action compatibility, next action contrast, deterministic continuous seed ranks; no template list or outcomes',
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

module.exports={transform,eligibleStages,validateInput,planOrder,traits,ALGORITHM};
