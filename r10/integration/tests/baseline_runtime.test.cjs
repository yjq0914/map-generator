'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../baseline.cjs');
const R = require('../run_batch.cjs');

const empty = () => ({ schema: 'flappy-loop-lab/1', id: 'test-empty', seed: 1, width: 4560, height: 540, obstacles: [] });

test('unchanged c005 closure and canonical runtime authenticate', () => {
  assert.equal(B.verifyVendor(), true);
  assert.equal(R.loadRuntime().DT, 1 / 120);
  assert.equal(B.provenance.runtime.sha256, '58c19ff5f258bfc05ff2a4b1b9f8edbbf7742fc57fa1c0c294b1ddfda668e987');
});

test('baseline materializes the real accepted c005 byte-identical map', () => {
  const e = B.generate({ seed: 17, difficulty: 'medium', duration: 30 });
  assert.equal(e.metadata.mapSHA256, '929ab520e69d42aeb24e35c9002af5d5224ecd43d21e4f1554f0c883683562f2');
  assert.equal(e.metadata.selectedNormalForm, 'LT');
  assert.equal(e.map.durationTicks, 14400);
  assert.equal(e.map.width, 24000);
  assert.equal(e.metadata.evaluationHorizonTicks, 3600);
  assert.equal(e.metadata.semanticMatch, false);
  assert.equal(e.metadata.mapMutation, false);
  assert.equal(Object.hasOwn(e.map, 'integration'), false);
});

test('excluded mechanics are rejected recursively, including composite metadata', () => {
  assert.throws(() => B.assertExcludedFree({ children: [{ mechanics: ['suction_core'] }] }), /Excluded/);
  assert.throws(() => B.assertExcludedFree({ child: { mechanic_kind: 'push_pulse_core' } }), /Excluded/);
  assert.throws(() => B.assertExcludedFree({ payload: JSON.stringify({ components: [{ mechanic: 'suction_core' }] }) }), /Excluded/);
  assert.equal(B.assertExcludedFree({ active_eligibility: { excluded_mechanics: ['suction_core', 'push_pulse_core'] }, prose: 'suction_core' }), true);
  assert.equal(B.assertExcludedFree(empty()), true);
});

test('ordinary guide interpolation and explicit release only', () => {
  const guide = [{ x: 60, until_x: 160, target_y: 200, target_y_end: 300, policy: 'laser_release' }, { x: 160, until_x: 260, target_y: 200, policy: 'release' }];
  const c = R.makeController(empty(), { guide });
  assert.deepEqual(c.action({ x: 110, y: 290, vy: 0, tick: 0 }), { flap: true, targetY: 250, guidePolicy: 'laser_release' });
  assert.equal(c.action({ x: 170, y: 490, vy: 200, tick: 1 }).flap, false);
});

test('native short completion uses one continuous world and retains trace', () => {
  const map = empty();
  map.integration = { seams: [{ id: 'middle', x: 1560 }] };
  const before = B.sha(map);
  const { result, trace } = R.runMap(map, { id: 'test-short' });
  assert.equal(result.nativeWon, true);
  assert.equal(result.actualTicks, 3600);
  assert.equal(result.physicsCalls, 3600);
  assert.equal(result.outcome, 'native-win');
  assert.equal(result.continuity.nativeInitializations, 1);
  assert.equal(result.continuity.resets, 0);
  assert.equal(result.seams[0].crossed, true);
  assert.equal(result.seams[0].after.tick, result.seams[0].before.tick + 1);
  assert.equal(result.seams[0].next.tick, result.seams[0].after.tick + 1);
  assert.equal(trace.rows.length, 3601);
  assert.equal(trace.bodyFrames.length, 301);
  assert.equal(B.sha(map), before);
});

test('prefix survival never fabricates a native win', () => {
  const { result } = R.runMap(empty(), { horizonTicks: 60 });
  assert.equal(result.alive, true);
  assert.equal(result.survivedHorizon, true);
  assert.equal(result.nativeWon, false);
  assert.equal(result.outcome, 'alive-prefix-only');
});

test('death and unchanged old obstacles survive in evidence', () => {
  const map = empty();
  map.obstacles.push({ id: 'lethal-wall', mechanic_kind: 'fixed_armor_or_spike', x: 85, y: 0, collider: { shape: 'rectangle', w: 20, h: 540 }, interaction: { lethal: true } });
  const { result } = R.runMap(map, { horizonTicks: 60 });
  assert.equal(result.outcome, 'death');
  assert.equal(result.death.id, 'lethal-wall');
  assert.equal(result.nativeWon, false);
  assert.equal(result.continuity.obstacleCountAfter, 1);
});

test('panel admits exactly the declared 8+8+8 with matched nominal targets', () => {
  const entries = [];
  for (let i = 0; i < 8; i++) for (const arm of ['old', 'new']) entries.push({ id: `${arm}-${i}`, arm, cohort: 'paired', pairId: `pair-${i}`, seed: i, difficulty: 'medium', duration_s: 31.5 });
  for (let i = 0; i < 8; i++) entries.push({ id: `holdout-${i}`, arm: 'new', cohort: 'holdout', seed: i + 100, difficulty: 'medium', duration_s: 31.5 });
  assert.equal(R.validatePanel(entries), true);
  assert.throws(() => R.validatePanel(entries.slice(1)), /24/);
  const wrong = structuredClone(entries); wrong[1].difficulty = 'hard';
  assert.throws(() => R.validatePanel(wrong), /Unmatched/);
  const wrongHorizon = structuredClone(entries); wrongHorizon[0].horizonTicks = 3600; wrongHorizon[1].horizonTicks = 3612;
  assert.throws(() => R.validatePanel(wrongHorizon), /actual horizon/);
  const missingHorizon = structuredClone(entries); missingHorizon[0].horizonTicks = 3600;
  assert.throws(() => R.validatePanel(missingHorizon), /actual horizon/);
});

test('scenario aliases preserve actual horizon separate from nominal duration', () => {
  const entries = R.normalizeManifest({ scenarios: [{ id: 'old-5', arm: 'baseline', seed: 5, difficulty: 'medium', target_duration_s: 31.5, horizon_s: 31.6 }] });
  assert.equal(entries[0].arm, 'old');
  assert.equal(entries[0].horizonTicks, 3792);
  assert.equal(entries[0].duration_s, 31.5);
});

test('normalized entry changes cannot mutate saved manifest or its hash', () => {
  const manifest = { entries: [{ id: 'old-1', arm: 'old', seed: 1, guide: [{ x: 60, until_x: 100, target_y: 200 }] }] };
  const before = structuredClone(manifest), hash = B.sha(manifest);
  const entries = R.normalizeManifest(manifest);
  entries[0].mapFile = 'generated.map.json';
  entries[0].guide[0].target_y = 300;
  assert.deepEqual(manifest, before);
  assert.equal(B.sha(manifest), hash);
});
