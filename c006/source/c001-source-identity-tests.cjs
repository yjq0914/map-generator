'use strict';
// Mutation tests use an isolated disposable copy. No original or inherited bytes
// are edited, and no physical state/step function is called.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const sourceRoot = path.join(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'c001-source-identity-'));
fs.cpSync(path.join(sourceRoot, 'source'), path.join(tempRoot, 'source'), { recursive: true });
fs.mkdirSync(path.join(tempRoot, 'design'));
for (const name of ['following-gate-post-length.cjs', 'following-observations-v2.cjs']) fs.copyFileSync(path.join(sourceRoot, 'design', name), path.join(tempRoot, 'design', name));
fs.mkdirSync(path.join(tempRoot, 'protocols'));
fs.copyFileSync(path.join(sourceRoot, 'protocols/BASELINE-ACCEPTED.json'), path.join(tempRoot, 'protocols/BASELINE-ACCEPTED.json'));
let blocked = 0, forbiddenCalls = 0;
for (const [file, allowed] of [['vendor/engine/core.js', ['validate']], ['vendor/baseline/core.js', ['validate']], ['vendor/engine/timed-course.js', ['validate', 'isTimed']], ['vendor/engine/arrival-triggers.js', ['validate']], ['vendor/policies/baseline/core.js', ['validate']]]) {
  const api = require(path.join(tempRoot, 'source', file));
  for (const [key, v] of Object.entries(api)) if (typeof v === 'function' && !allowed.includes(key)) { blocked++; api[key] = () => { forbiddenCalls++; throw Error('NO PHYSICS'); }; }
}
const A = require(path.join(tempRoot, 'source/c001-intent-generator.cjs'));
A.dependencies();
const tests = [];
for (const relative of ['source/generator.cjs', 'design/following-gate-post-length.cjs', 'design/following-observations-v2.cjs', 'source/configs/c001-intent-generator-v1.json', 'protocols/BASELINE-ACCEPTED.json', 'source/c001-intent-generator.cjs']) {
  const p = path.join(tempRoot, relative), original = fs.readFileSync(p);
  fs.appendFileSync(p, '\n ');
  assert.throws(() => A.dependencies(), /immutable dependency changed/);
  fs.writeFileSync(p, original);
  assert.equal(A.dependencies(), A.sourceIdentity);
  tests.push({ relative, modifiedCopyRejected: true, restoredCopyAccepted: true });
}
assert.equal(forbiddenCalls, 0);
const report = { schema: 'c001-isolated-source-mutation-tests/1', sourceIdentity: A.sourceIdentity, tests, originalSourceEdited: false, blockedDynamicEngineExports: blocked, forbiddenCalls, generatedMaps: 0, physicalExecutions: 0, physicalTicks: 0 };
fs.writeFileSync(path.join(sourceRoot, 'design/c001-source-mutation-results.json'), JSON.stringify(report, null, 2) + '\n');
fs.rmSync(tempRoot, { recursive: true, force: true });
console.log(JSON.stringify(report));
