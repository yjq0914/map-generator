'use strict';
// Bounded intent compiler. This module reads only immutable source and one accepted
// snapshot, never trial identities, result files, groups, holdouts, or engine poses.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const same = require('node:util').isDeepStrictEqual;
const B = require('./b005-stage-recovery.cjs');
const H = require('./b007-relocated-hammer.cjs');
const T = require('./b008-timed-aperture.cjs');
const J = require('./b010-warning-burst.cjs');
const TH = require('./b009-shared-program.cjs');
const JTH = require('./b012-three-program.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const U = require('./recovery-utils.cjs');
const clone = structuredClone;
const freeze = x => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const hash = x => crypto.createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const need = (v, s) => { if (!v) throw Error('Intent compiler: ' + s); };
const root = path.join(__dirname, '..');
const CONFIG = freeze(require('./configs/c001-intent-generator-v1.json'));
const VERSION = 'bounded-structural-intent-compiler/1';
const ownPath = 'source/c001-intent-generator.cjs';
const ownHash = hash(fs.readFileSync(path.join(root, ownPath)));
const configPath = 'source/configs/c001-intent-generator-v1.json';
const configFileHash = hash(fs.readFileSync(path.join(root, configPath)));
const sourceIdentity = hash({ config: CONFIG, module: ownHash });
const stamps = new Map();
const cache = new Map();
const CAP = 16;
const stats = { factBuilds: 0, factHits: 0, plans: 0, materializations: 0, sourceChecks: 0 };
const ACTIONS = Object.freeze(['maintain-side', 'read-warning', 'cross-moving-boundary', 'cross-changing-gap', 'change-side', 'receive']);
const AXES = Object.freeze(['warning', 'periodicMotion', 'projectileRhythm', 'apertureVariation']);
const ROUTES = Object.freeze(['preserve-both', 'shared-reception', 'separated-reception']);
function keys(x, names, label) {
  need(x && typeof x === 'object' && !Array.isArray(x) && same(Object.keys(x).sort(), [...names].sort()), label + ' has missing/unknown fields');
}
function dependencies() {
  stats.sourceChecks++;
  for (const [file, expected] of Object.entries({ ...CONFIG.dependencies, [ownPath]: ownHash, [configPath]: configFileHash })) {
    const p = path.join(root, file), st = fs.statSync(p, { bigint: true });
    const stamp = [st.dev, st.ino, st.size, st.mtimeNs, st.ctimeNs].join(':');
    if (stamps.get(file) !== stamp) {
      need(hash(fs.readFileSync(p)) === expected, 'immutable dependency changed: ' + file);
      stamps.set(file, stamp);
    }
  }
  need(same(CONFIG.qualifiedNormalForms.map(q => [q.key, q.recipes]), [['B', []], ['H', ['H']], ['T', ['T']], ['J', ['J']], ['HT', ['H', 'T']], ['HJT', ['H', 'J', 'T']]]), 'qualified combination frontier changed');
  const accepted = JSON.parse(fs.readFileSync(path.join(root, CONFIG.acceptedSnapshot)));
  need(accepted.round === 'b012', 'actual accepted b012 snapshot required');
  for (const q of CONFIG.qualifiedNormalForms) {
    need(accepted.explicitStyles.some(s => s.id === q.legacyStyle && s.generator === q.module), 'normal form lacks inherited acceptance: ' + q.key);
  }
  return sourceIdentity;
}
function entry(input = {}) { return H.entry(input); }
function normalizeRequest(request) {
  keys(request, ['schema', 'plannedActions', 'routeRelation', 'theme', 'constraints'], 'request');
  need(request.schema === CONFIG.requestSchema, 'unsupported request schema');
  need(Array.isArray(request.plannedActions) && request.plannedActions.length <= 12, 'at most twelve ordered planned actions required');
  for (const a of request.plannedActions) {
    keys(a, ['kind', 'stage'], 'planned action');
    need(ACTIONS.includes(a.kind), 'unsupported action: ' + a.kind);
    need(a.stage === 'any' || [0, 1, 2].includes(a.stage), 'unsupported action stage');
  }
  need(ROUTES.includes(request.routeRelation), 'unsupported route relation');
  keys(request.theme, AXES, 'theme');
  for (const k of AXES) need(Number.isFinite(request.theme[k]) && request.theme[k] >= -1 && request.theme[k] <= 1, 'theme weight outside [-1,1]: ' + k);
  const c = request.constraints;
  keys(c, ['minRecipes', 'maxRecipes', 'projectiles', 'encounterWindowSeconds'], 'constraints');
  need(Number.isInteger(c.minRecipes) && Number.isInteger(c.maxRecipes) && 0 <= c.minRecipes && c.minRecipes <= c.maxRecipes && c.maxRecipes <= 3, 'recipe cardinality outside qualified frontier');
  need(['allow', 'forbid', 'require'].includes(c.projectiles), 'unsupported projectile constraint');
  need(Array.isArray(c.encounterWindowSeconds) && c.encounterWindowSeconds.length === 2 && c.encounterWindowSeconds.every(Number.isFinite) && c.encounterWindowSeconds[0] >= 0 && c.encounterWindowSeconds[1] <= 120 && c.encounterWindowSeconds[0] < c.encounterWindowSeconds[1], 'invalid encounter window');
  return clone(request);
}
const secs = (m, x) => (x - m.initial_player.x) / F.VX;
function event(recipe, componentIndex, stage, kind, seconds, bodyIds, relation) {
  return { recipe, componentIndex, stage, kind, nominalSeconds: seconds, bodyIds: clone(bodyIds), structuralRelation: relation, scope: 'planned route/geometry event; actual action unmeasured' };
}
function summarizeSite(m, recipe, patch) {
  let componentIndex, source, receiver, routeFacts, window, events;
  if (recipe === 'H') {
    const p = patch.phrase;
    componentIndex = p.owner.componentIndex; source = patch.after; receiver = p.receiver;
    routeFacts = p.routeFacts.map(q => ({ route: q.route, sourceSide: q.source.side, receiverSide: q.receiver.side }));
    window = [secs(m, patch.effects.hammerProgram.wholeBodySweepX[0]), secs(m, receiver.x + receiver.collider.w + F.R)];
    const t = patch.effects.hammerProgram.nominalPivotCrossingSeconds;
    events = [['cross-moving-boundary', t, [source.id, source.id + ':arm']], ['change-side', secs(m, receiver.x - F.R), [receiver.id]], ['receive', window[1], [receiver.id]]];
  } else if (recipe === 'T') {
    const p = patch.phrase;
    componentIndex = p.componentIndex; source = patch.after; receiver = p.receivers[1].descriptor;
    routeFacts = p.receivers[0].routeFacts.map(q => ({ route: q.route, sourceSide: q.side === 'above' ? 'upper' : 'lower', receiverSide: p.receivers[1].routeFacts.find(z => z.route === q.route).side === 'above' ? 'upper' : 'lower' }));
    window = [source.timeline.start_s, secs(m, receiver.x + receiver.collider.w + F.R)];
    events = [['read-warning', source.timeline.start_s, patch.apertureProgram.runtimeBodyIds], ['cross-changing-gap', patch.apertureProgram.nominalCenterCrossingSeconds, patch.apertureProgram.runtimeBodyIds], ['change-side', secs(m, receiver.x - F.R), [receiver.id]], ['receive', window[1], [receiver.id]]];
  } else {
    const p = patch.effects.program.phrase;
    componentIndex = p.componentIndex; source = patch.after; receiver = p.receiver;
    routeFacts = p.routeFacts.map(q => ({ route: q.route, previousSide: q.previous.side, sourceSide: q.source.side, receiverSide: q.receiver.side }));
    window = [secs(m, p.previous.x - F.R), secs(m, receiver.x + receiver.collider.w + F.R)];
    events = [['maintain-side', secs(m, p.previous.x + p.previous.collider.w / 2), [p.previous.id, source.id]], ['read-warning', patch.effects.program.warning.startSeconds, [source.id]], ['cross-moving-boundary', patch.effects.program.nominalCoreSeconds, [source.id, ...patch.effects.program.expectedShots.map(s => s.id)]], ['change-side', secs(m, receiver.x - F.R), [receiver.id]], ['receive', window[1], [receiver.id]]];
  }
  need(routeFacts.length === 2 && routeFacts.every(q => q.sourceSide !== q.receiverSide), 'source and receiver do not establish two-route reversal');
  const stage = Number(m.components[componentIndex].stageId);
  const relation = routeFacts[0].receiverSide === routeFacts[1].receiverSide ? 'shared-reception' : 'separated-reception';
  const properties = {
    warning: Number((source.timeline?.warning_s || 0) > 0),
    periodicMotion: Number((source.motion?.period_s || 0) > 0 || (source.timeline?.opening_s || 0) > 0),
    projectileRhythm: Number((source.timeline?.count || 0) > 1 && source.mechanic_kind === 'burst_turret'),
    apertureVariation: Number((source.timeline?.opening_s || 0) > 0 && (source.timeline?.closing_s || 0) > 0 && (source.motion?.opening_px || 0) > 0)
  };
  need(window.every(Number.isFinite) && window[0] < window[1], 'invalid structural encounter bounds');
  return { recipe, componentIndex, stage, currentSourceId: source.id, currentSourceX: source.x, receiverId: receiver.id, receiverX: receiver.x, routeRelation: relation, routeFacts, encounterWindowSeconds: window, properties, patchHash: hash(patch), componentHash: hash(m.components[componentIndex]), sourceDescriptorHash: hash(source), receiverDescriptorHash: hash(receiver), events: events.map(e => event(recipe, componentIndex, stage, ...e, relation)), physicalQualification: 'inherited finite recipe evidence only; new request selection pending', humanFun: null };
}
function facts(input) {
  dependencies();
  const e = entry(input), k = hash(e);
  if (cache.has(k)) { stats.factHits++; return cache.get(k); }
  stats.factBuilds++;
  const base = B.generate(B.CONFIG, e);
  const hp = H.planHammerPatch(base, H.resolvePhrase(base));
  const tp = T.planPatch(base);
  const jp = J.planPatch(base);
  const patches = { H: hp, T: tp, J: jp };
  const sites = Object.fromEntries(Object.entries(patches).map(([r, p]) => [r, summarizeSite(base, r, p)]));
  need(new Set(Object.values(sites).map(s => s.componentIndex)).size === 3, 'recipe sites conflict');
  const f = { condition: freeze(e), base: freeze(base), baseMapHash: hash(base), patches: freeze(patches), sites: freeze(sites), maps: new Map() };
  if (cache.size >= CAP) cache.delete(cache.keys().next().value);
  cache.set(k, f);
  return f;
}
function matchActions(actions, events) {
  const matches = [];
  let after = -1;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const j = events.findIndex((ev, j) => j > after && ev.kind === a.kind && (a.stage === 'any' || ev.stage === a.stage));
    if (j < 0) return { matched: false, failure: 'ordered action ' + i + ' unmatched: ' + a.kind + '@' + a.stage, matches };
    after = j; matches.push({ requestActionIndex: i, eventIndex: j, event: clone(events[j]) });
  }
  return { matched: true, matches };
}
function evaluateForm(form, f, request) {
  const sites = form.recipes.map(r => f.sites[r]);
  const c = request.constraints, reasons = [];
  if (sites.length < c.minRecipes || sites.length > c.maxRecipes) reasons.push('recipe-count');
  const hasProjectiles = sites.some(s => s.properties.projectileRhythm > 0);
  if ((c.projectiles === 'forbid' && hasProjectiles) || (c.projectiles === 'require' && !hasProjectiles)) reasons.push('projectile-policy');
  if (request.routeRelation !== 'preserve-both' && (!sites.length || sites.some(s => s.routeRelation !== request.routeRelation))) reasons.push('route-relation');
  if (sites.some(s => s.encounterWindowSeconds[0] < c.encounterWindowSeconds[0] || s.encounterWindowSeconds[1] > c.encounterWindowSeconds[1])) reasons.push('actual-encounter-window');
  const events = sites.flatMap(s => s.events).sort((a, b) => a.nominalSeconds - b.nominalSeconds || a.recipe.localeCompare(b.recipe));
  const match = matchActions(request.plannedActions, events);
  if (!match.matched) reasons.push(match.failure);
  const profile = Object.fromEntries(AXES.map(axis => [axis, sites.length ? sites.reduce((n, s) => n + s.properties[axis], 0) / sites.length : 0]));
  const score = AXES.reduce((n, axis) => n + profile[axis] * request.theme[axis], 0);
  return { key: form.key, recipes: clone(form.recipes), eligible: reasons.length === 0, reasons, themeProfile: profile, themeScore: score, actionMatches: match.matches, events };
}
function makePlan(f, request) {
  stats.plans++;
  const normalized = normalizeRequest(request);
  const proposals = CONFIG.qualifiedNormalForms.map(q => evaluateForm(q, f, normalized));
  const eligible = proposals.filter(p => p.eligible).sort((a, b) => b.themeScore - a.themeScore || a.recipes.length - b.recipes.length || a.key.localeCompare(b.key));
  need(eligible.length > 0, 'unsupported brief; no qualified structural match: ' + proposals.map(p => p.key + '=' + p.reasons.join('|')).join('; '));
  const winner = eligible[0];
  return { schema: VERSION, sourceIdentity, condition: clone(f.condition), request: normalized, requestHash: hash(normalized), baseMapHash: f.baseMapHash, selectedNormalForm: winner.key, selectedRecipes: clone(winner.recipes), selectedSites: winner.recipes.map(r => clone(f.sites[r])), actionMatches: clone(winner.actionMatches), themeProfile: clone(winner.themeProfile), themeScore: winner.themeScore, proposalCount: proposals.length, eligibleCount: eligible.length, candidates: proposals.map(({ events, ...p }) => p), selectionRule: 'hard structural/action constraints first; mean descriptor theme dot product; fewer recipes; lexical stable tie-break', qualification: { plannedActionSemantics: true, newlyExecutedPhysics: false, newPhysicalComposition: false, arbitraryComposition: false, observedIntent: null, humanFun: null } };
}
function materialize(f, p) {
  const key = p.selectedNormalForm;
  if (f.maps.has(key)) return clone(f.maps.get(key));
  stats.materializations++;
  let map;
  if (key === 'B') map = clone(f.base);
  else if (key === 'H') map = H.mergeChecked(f.base, f.patches.H);
  else if (key === 'T') map = T.mergeChecked(f.base, f.patches.T);
  else if (key === 'J') map = J.mergeChecked(f.base, f.patches.J);
  else if (key === 'HT') map = TH.generate(TH.CONFIG, f.condition);
  else if (key === 'HJT') map = JTH.generate(JTH.CONFIG, f.condition);
  else throw Error('Intent compiler: unqualified normal form');
  // No new patch order: compositions are the exact previously accepted producers.
  // This comparison checks that planned current sites really materialized there.
  for (const s of p.selectedSites) {
    const actual = map.obstacles.filter(o => o.id === s.currentSourceId);
    need(actual.length === 1 && hash(actual[0]) === s.sourceDescriptorHash, 'materialized source differs from planned actual patch');
    const receiver = map.obstacles.filter(o => o.id === s.receiverId);
    need(receiver.length === 1 && hash(receiver[0]) === s.receiverDescriptorHash, 'materialized receiver differs from planned structural fact');
  }
  need(same(map.routes, f.base.routes) && same(map.condition, f.base.condition), 'protected routes or input changed');
  F.validate(map); U.assertFiniteTree(map); ['main', 'branch'].forEach(r => Contract.validate(map, r));
  f.maps.set(key, freeze(map));
  return clone(map);
}
function inspect(input = {}) { const f = facts(input); return { sourceIdentity, condition: clone(f.condition), baseMapHash: f.baseMapHash, sites: clone(f.sites), qualifiedNormalForms: CONFIG.qualifiedNormalForms.map(({ key, recipes }) => ({ key, recipes: clone(recipes) })) }; }
function planProgram(base, request) { const f = facts(base?.condition); need(same(base, f.base), 'planning requires complete exact b005 scaffold'); return makePlan(f, request); }
function mergeChecked(base, plan) { const f = facts(base?.condition); need(same(base, f.base), 'merge requires complete exact b005 scaffold'); const p = makePlan(f, plan?.request); need(same(plan, p), 'modified plan, request, owner, score, read-set or unknown field'); return materialize(f, p); }
function compile(input, request) { const f = facts(input), plan = makePlan(f, request), map = materialize(f, plan); return { schema: 'intent-generation-envelope/1', sourceIdentity, mapHash: hash(map), plan, map }; }
function generate(config, input, request) { need(same(config, CONFIG), 'configuration changed'); return compile(input, request).map; }
function generateParent(input = {}) { return clone(facts(input).base); }
function verifyEnvelope(envelope) { keys(envelope, ['schema', 'sourceIdentity', 'mapHash', 'plan', 'map'], 'envelope'); need(envelope.schema === 'intent-generation-envelope/1' && envelope.sourceIdentity === sourceIdentity, 'envelope source/schema mismatch'); const expected = compile(envelope.plan?.condition, envelope.plan?.request); need(same(envelope, expected), 'envelope differs from exact request-conditioned generation'); return true; }
function authenticateMap(map, request) { const expected = compile(map?.condition, request); need(same(map, expected.map), 'map differs from request-conditioned canonical output'); return { sourceIdentity, mapHash: expected.mapHash, plan: expected.plan }; }
module.exports = { CONFIG, VERSION, ACTIONS, AXES, ROUTES, hash, sourceIdentity, entry, dependencies, normalizeRequest, inspect, planProgram, mergeChecked, compile, generate, generateParent, verifyEnvelope, authenticateMap, cacheStats: () => ({ ...stats, entries: cache.size, capacity: CAP }), clearCache: () => cache.clear() };
