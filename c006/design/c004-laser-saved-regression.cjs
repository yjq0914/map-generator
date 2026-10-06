'use strict';
// Read-only regression against four already-completed b003-v2 saved arms.
// No new map execution; adversarial copies are labeled and never saved as runs.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), Module = require('node:module');
const originalLoad = Module._load;
let forbiddenImports = 0;
Module._load = function (request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  if (/\/source\/vendor\/(engine|baseline)\//.test(resolved)) {
    forbiddenImports++; throw Error('Saved-only regression forbids runtime import: ' + resolved);
  }
  return originalLoad.apply(this, arguments);
};
const root = path.resolve(__dirname, '../../lean-twelve-loop');
const C = require(path.join(root, 'harness/common.cjs'));
const Run = require(path.join(root, 'harness/b003-runner.cjs'));
const Old = require(path.join(root, 'design/laser/observe-warning-laser-v2.cjs'));
const Effects = require(path.join(root, 'design/laser/b003-effects-v2.cjs'));
const O = require('./c004-observe-laser.cjs');
const outcomes = [], negative = [], pairs = [];
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
function load(id) {
  const run = Run.load(id), trace = Run.trace(run), map = C.readGz(C.within(root, run.mapFile));
  assert.equal(C.sha(map), run.mapHash);
  return { run, trace, map };
}
for (const kind of ['local-v2', 'control-00']) for (const role of ['assigned_main', 'assigned_alternate']) {
  const prefix = kind === 'local-v2' ? 'b003-local-v2-' : 'b003-';
  const suffix = kind === 'local-v2' ? role : 'b003-control-00-' + role;
  const c = load(prefix + 'candidate-' + suffix), p = load(prefix + 'parent-' + suffix);
  const old = Old.observe(c.map, c.run, c.trace), observed = O.observeActualSource(c.map, c.run, c.trace);
  for (const key of ['status', 'transitions', 'warning', 'activeCrossing', 'sideChanges', 'recovery', 'actualAction']) assert.deepEqual(observed[key], old[key], 'legacy saved arithmetic changed: ' + key);
  assert.equal(observed.sourcePassed, true);
  assert.equal(observed.currentProgramAdmission, false);
  const effects = Effects.observePair(c.map, c.run, c.trace, p.trace), inputs = O.compareInputs(p.trace, c.trace, old.actualAction.window);
  assert.deepEqual(inputs, effects.pairedActualInputs);
  assert.equal(O.reduce(c.map, c.run, c.trace).actualRelationPassed, false, 'legacy map cannot qualify new binding');
  const localWindow = { startTick: 48, endTick: 480 };
  if (kind === 'local-v2') assert.equal(O.validateRows(c.trace, localWindow, { requireSource: c.map.design.laserProgram.sourceId }).fullWindow, true);
  outcomes.push({ id: c.run.id, resultSHA256: c.run.resultSHA256, traceSHA256: c.run.traceSHA256, mapHash: c.run.mapHash,
    sourceStatus: observed.status, firstCycleStates: observed.lifecycle.firstCycleTransitions.map(x => x.status),
    sampledWarningSeconds: observed.warning.sampledContinuousSeconds, activeSamples: observed.activeCrossing.samples,
    originalVerticalSliceMarginPx: observed.activeCrossing.actualMinVerticalSliceMarginPx,
    actualCapsuleDistancePx: observed.actualEndpointClearance.minimumActiveCapsuleDistancePx,
    endpointTravelPx: observed.actualEndpointClearance.actualEndpointTravelPx,
    allowedNonlethalOverlapSamples: observed.actualEndpointClearance.nonlethalOverlapSamples,
    changedCommandTicks: inputs.changedCommandTicks, oldPathOverlapSamples: effects.geometricCounterfactual.oldPathOverlapSamples,
    legacyArithmeticIdentical: true, currentProgramAdmission: false });
  pairs.push(c);
}
const input = pairs[0], source = input.map.design.laserProgram.sourceId;
function mutation(name, edit) {
  const t = structuredClone(input.trace); edit(t);
  let rejected = false, reason;
  try { rejected = O.observeActualSource(input.map, input.run, t).sourcePassed !== true; reason = 'sourcePassed=false'; }
  catch (e) { rejected = true; reason = e.message; }
  assert.equal(rejected, true, name + ' was falsely admitted'); negative.push({ name, rejected, reason });
}
const actual = t => t.bodySamples.find(f => f.bodies.some(b => b.id === source && b.status === 'active'));
const body = f => f.bodies.find(b => b.id === source);
mutation('duplicate saved frame', t => t.bodySamples.push(structuredClone(actual(t))));
mutation('duplicate source body', t => { const f = actual(t); f.bodies.push(structuredClone(body(f))); });
mutation('wrong explicit sourceId', t => { body(actual(t)).sourceId = 'wrong'; });
mutation('wrong body ID', t => { body(actual(t)).id = 'wrong'; });
mutation('fixed body relabeled laser', t => { body(actual(t)).kind = 'fixed_armor_or_spike'; });
mutation('rectangle passed as capsule', t => { body(actual(t)).shape = 'rectangle'; });
mutation('missing actual endpoint', t => { delete body(actual(t)).x2; });
mutation('wrong actual width', t => { body(actual(t)).width++; });
mutation('nonlethal active phase', t => { body(actual(t)).lethal = false; });
mutation('lethal warning phase', t => { const f = t.bodySamples.find(f => body(f)?.status === 'warning'); body(f).lethal = true; });
mutation('fixed endpoint poses do not prove moving boundary', t => {
  const d = input.map.obstacles.find(o => o.id === source);
  for (const f of t.bodySamples) { const b = body(f); if (b) { b.y = d.y; b.y2 = d.y + d.motion.dy_px; } }
});
mutation('missing actual crossing sample', t => { const f = t.bodySamples.find(f => f.tick === 200); f.bodies = f.bodies.filter(b => b.id !== source); });
mutation('missing warning sample', t => { const f = t.bodySamples.find(f => f.tick === 100); f.bodies = f.bodies.filter(b => b.id !== source); });
mutation('authoritative recorded source death', t => { t.events.push({ type: 'death', tick: 200, sourceId: source }); });
const copies = ['observe-warning-laser-v2.cjs', 'b003-effects-v2.cjs'].map(name => {
  const old = fs.readFileSync(path.join(root, 'design/laser', name)), copy = fs.readFileSync(path.join(__dirname, 'laser', name));
  assert.deepEqual(copy, old); return { file: 'design/laser/' + name, sha256: sha(copy), unchanged: true };
});
const report = { schema: 'c004-laser-old-saved-regression/1', physicsExecutions: 0, physicsTicks: 0,
  runtimeImports: forbiddenImports, existingSavedCandidateArms: outcomes.length, existingSavedPairedParentArms: outcomes.length,
  outcomes, adversarialTests: negative, unchangedLegacyDependencies: copies,
  currentExactBPhysicalValidation: { status: 'not_run', reason: 'No new current-binding runs authorized in this preparation; old b003-v2 saved evidence is kernel/lifecycle regression only' },
  originalRecordsModified: false, acceptanceOrFreezeChanged: false };
const out = process.argv[2]; if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
