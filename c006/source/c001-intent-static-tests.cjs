'use strict';
// Pure checks only. Every dynamic engine entry point is blocked before any
// candidate or legacy generator is loaded. This is not physical evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const blocked = []; let forbiddenCalls = 0;
for (const [file, allowed] of [
  ['./vendor/engine/core.js', ['validate']], ['./vendor/baseline/core.js', ['validate']],
  ['./vendor/engine/timed-course.js', ['validate', 'isTimed']], ['./vendor/engine/arrival-triggers.js', ['validate']],
  ['./vendor/policies/baseline/core.js', ['validate']]
]) {
  const api = require(file);
  for (const [key, value] of Object.entries(api)) if (typeof value === 'function' && !allowed.includes(key)) {
    blocked.push(file + ':' + key);
    api[key] = () => { forbiddenCalls++; throw Error('STATIC-ONLY prohibits ' + file + ':' + key); };
  }
}
const A = require('./c001-intent-generator.cjs');
const Briefs = require('./c001-intent-briefs.cjs');
const clone = structuredClone;
const begin = performance.now();
const e = seed => ({ seed, y: 270, vy: 0, lead: 0, phase: 0, adjacency: 'none' });
const outcome = [];
const envelopes = new Map();
const expectedKeys = ['H', 'T', 'J', 'HT', 'HJT', 'H', 'T', 'J', 'H', 'J', 'T', 'H', 'HT', 'HJT', 'T', 'HT'];
let passed = 0, negativeTests = 0, equivalenceChecks = 0;
function test(name, f) { f(); passed++; }
function reject(name, f) { test(name, () => assert.throws(f, /Intent compiler:/)); negativeTests++; }
for (const seed of [0, 1, 3]) {
  const sites = A.inspect(e(seed));
  const rows = [...Briefs.control, ...Briefs.explore];
  rows.forEach((b, i) => {
    const env = A.compile(e(seed), b.request);
    test('brief ' + b.briefId + ' seed ' + seed, () => assert.equal(env.plan.selectedNormalForm, expectedKeys[i]));
    test('intention matches are geometry-derived ' + i + ':' + seed, () => assert(env.plan.actionMatches.every(q => q.event.bodyIds.length && q.event.componentIndex >= 0)));
    if (seed === 3) envelopes.set(env.plan.selectedNormalForm, env);
    outcome.push({ seed, briefId: b.briefId, selected: env.plan.selectedNormalForm, selectedSites: env.plan.selectedSites.map(s => ({ recipe: s.recipe, componentIndex: s.componentIndex, encounterWindowSeconds: s.encounterWindowSeconds })), mapHash: env.mapHash, requestHash: env.plan.requestHash, eligibleCount: env.plan.eligibleCount, themeScore: env.plan.themeScore });
  });
  test('different actual hammer owner from seed topology ' + seed, () => assert.equal(sites.sites.H.componentIndex, { 0: 4, 1: 7, 3: 6 }[seed]));
}
const base = A.generateParent(e(3));
for (const [key, module] of [['H', './b007-relocated-hammer.cjs'], ['T', './b008-timed-aperture.cjs'], ['J', './b010-warning-burst.cjs'], ['HT', './b009-shared-program.cjs'], ['HJT', './b012-three-program.cjs']]) {
  const old = require(module); const canonical = old.generate(old.CONFIG, e(3));
  test('unchanged canonical map ' + key, () => assert.deepEqual(envelopes.get(key).map, canonical)); equivalenceChecks++;
}
const noRecipe = Briefs.request([], { constraints: { minRecipes: 0, maxRecipes: 0 } });
const empty = A.compile(e(3), noRecipe);
test('empty request retains exact base', () => assert.deepEqual(empty.map, base)); equivalenceChecks++;
const req = Briefs.control[0].request;
const plan = A.planProgram(base, req);
test('checked merge equals canonical compile', () => assert.deepEqual(A.mergeChecked(base, plan), A.compile(e(3), req).map));
test('envelope verifies', () => assert.equal(A.verifyEnvelope(envelopes.get('H')), true));
test('condition identity cannot enter source', () => assert.throws(() => A.inspect({ ...e(3), group: 'holdout' }), /only six physical fields/)); negativeTests++;
for (const [name, change] of [
  ['unknown action', r => r.plannedActions[0].kind = 'teleport'],
  ['unknown request field', r => r.styleId = 'H'],
  ['unknown theme field', r => r.theme.style = 'hammer'],
  ['theme NaN', r => r.theme.warning = NaN],
  ['theme out of domain', r => r.theme.warning = 2],
  ['unknown constraint', r => r.constraints.extra = 1],
  ['noninteger count', r => r.constraints.minRecipes = 0.5],
  ['reversed count', r => r.constraints.minRecipes = 2],
  ['invalid encounter interval', r => r.constraints.encounterWindowSeconds = [80, 40]],
  ['unknown route relation', r => r.routeRelation = 'mirror-gravity'],
  ['unknown action field', r => r.plannedActions[0].conditionId = 'special'],
  ['unsupported stage', r => r.plannedActions[0].stage = 3],
  ['unsupported schema', r => r.schema = 'unbounded-natural-language'],
  ['action ordering', r => r.plannedActions = [{ kind: 'receive', stage: 1 }, { kind: 'read-warning', stage: 0 }]],
  ['missing structural window', r => r.constraints.encounterWindowSeconds = [82, 95]],
  ['contradictory route', r => { r.routeRelation = 'shared-reception'; r.plannedActions[0].stage = 1; }]
]) { const r = clone(req); change(r); reject(name, () => A.compile(e(3), r)); }
reject('unqualified J+H subset', () => A.compile(e(3), Briefs.request(['maintain-side', { kind: 'receive', stage: 1 }], { constraints: { minRecipes: 2, maxRecipes: 2, projectiles: 'require' } })));
reject('unqualified J+T subset', () => A.compile(e(3), Briefs.request(['maintain-side', 'cross-changing-gap'], { constraints: { minRecipes: 2, maxRecipes: 2, projectiles: 'require' } })));
reject('empty cannot satisfy shared relation', () => A.compile(e(3), Briefs.request([], { routeRelation: 'shared-reception', constraints: { minRecipes: 0, maxRecipes: 0 } })));
for (const [name, change] of [
  ['score', p => p.themeScore += 1], ['site owner', p => p.selectedSites[0].componentIndex++],
  ['source geometry', p => p.selectedSites[0].currentSourceX++], ['route evidence', p => p.selectedSites[0].routeFacts[0].sourceSide = 'wrong'],
  ['recipe list', p => p.selectedRecipes.push('J')], ['source identity', p => p.sourceIdentity = 'forged'],
  ['request', p => p.request.theme.warning = 1], ['unknown plan field', p => p.actualFun = true]
]) { const p = clone(plan); change(p); reject('modified plan ' + name, () => A.mergeChecked(base, p)); }
const badBase = clone(base); badBase.obstacles[0].x += 1;
reject('modified base', () => A.planProgram(badBase, req));
const badEnvelope = clone(envelopes.get('H')); badEnvelope.map.obstacles[0].x += 1; badEnvelope.mapHash = A.hash(badEnvelope.map);
reject('modified map with recomputed hash', () => A.verifyEnvelope(badEnvelope));
const badEnvelope2 = clone(envelopes.get('H')); badEnvelope2.extra = true;
reject('unknown envelope field', () => A.verifyEnvelope(badEnvelope2));
test('generation config cannot change', () => assert.throws(() => A.generate({ ...A.CONFIG, version: 'mutated' }, e(3), req), /configuration changed/)); negativeTests++;
test('dynamic engine never touched', () => assert.equal(forbiddenCalls, 0));
const report = {
  schema: 'c001-pure-generation-static-checks/1', sourceIdentity: A.sourceIdentity,
  passed, failed: 0, generatedRequestCases: outcome.length + 1,
  physicalConditionCount: 3, canonicalOutputEquivalenceChecks: equivalenceChecks, negativeTests,
  blockedDynamicEngineExports: blocked.length, forbiddenCalls, physicalExecutions: 0, physicalTicks: 0,
  observedHammerOwners: [4, 7, 6], selections: outcome,
  checks: ['ordered action matching', 'actual route relation precedence', 'theme preference response', 'actual site timing restrictions', 'qualified combination closure', 'tampered source/plan/map rejection', 'all selected output maps canonical'],
  limitations: ['No physical playability or observed action test', 'No new heldout conditions were read', 'Legacy style registry regression is distinct from six checked canonical constructors', 'No human or browser readability evidence'],
  cache: A.cacheStats(), wallSeconds: (performance.now() - begin) / 1000
};
const out = process.argv[2] || path.join(__dirname, '..', 'design', 'c001-static-results.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: out, passed, negativeTests, generatedRequestCases: report.generatedRequestCases, equivalenceChecks, physicalExecutions: 0, physicalTicks: 0, wallSeconds: report.wallSeconds }));
