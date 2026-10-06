'use strict';
const assert = require('node:assert/strict');
const F = require('../vendor/engine/core.js');
const U = require('../recovery-utils.cjs');
const G = require('../b001-relation-grammar.cjs');
const Old = require('../a012-style-registry.cjs');
const Registry = require('../b001-style-registry.cjs');
const Observe = require('../../design/grammar/observe-relation-chain.cjs');
let physicsCalls = 0;
for (const name of ['step', 'rollout', 'createState', 'restoreCheckpoint', 'restoreSession']) F[name] = () => { physicsCalls++; throw Error('Static test forbids physics ' + name); };
const orders = new Set(), stage1Orders = new Set();
let generated = 0, inheritedComparisons = 0, nontrivial = 0;
for (let seed = 0; seed < 96; seed++) {
  const input = {seed, y: [245, 270, 300][seed % 3], vy: [-65, 0, 65][seed % 3], lead: [-20, 0, 20][seed % 3], phase: [-.45, 0, .45][seed % 3], adjacency: ['none', 'upper-after', 'lower-before'][seed % 3]};
  const parent = G.generateParent(input), pbytes = JSON.stringify(parent), map = G.generate(G.CONFIG, input);
  assert.equal(JSON.stringify(parent), pbytes); assert.deepEqual(map, G.generate(G.CONFIG, input));
  const {moves, parentSlotAtSlot: order} = map.design.relationGrammarProgram;
  assert.equal(order[0], 0); assert.equal(order[2], 2); assert.deepEqual(order.slice(8), [8, 9, 10, 11]);
  assert.deepEqual(map.initial_player, parent.initial_player); assert.deepEqual(map.macroPlan, parent.macroPlan);
  assert.deepEqual(map.design.optionalSpringProgram, parent.design.optionalSpringProgram);
  for (const move of moves) {
    const before = parent.components[move.sourceIndex], after = map.components[move.slot];
    assert.equal(after.lengthPx, before.lengthPx);
    const po = parent.obstacles.filter(o => U.ownedIndex(o.id) === move.sourceIndex);
    for (const source of po) {
      const o = map.obstacles.find(o => o.id === U.remapId(source.id, move.slot));
      assert.deepEqual(o.collider, source.collider); assert.equal(o.y, source.y); assert.ok(U.near(o.x - after.offset, source.x - before.offset));
      if (source.motion) {
        const t0 = before.offset / F.VX, t1 = after.offset / F.VX;
        assert.ok(U.near(source.motion.phase_rad + t0 * 2 * Math.PI / source.motion.period_s,
          o.motion.phase_rad + t1 * 2 * Math.PI / o.motion.period_s));
      }
    }
  }
  for (const r of ['main', 'branch']) {
    assert.deepEqual(map.routes[r].contact, parent.routes[r].contact); assert.deepEqual(map.routes[r].events, parent.routes[r].events);
    assert.deepEqual(map.routes[r].exit, parent.routes[r].exit); assert.deepEqual(map.routes[r].finalDomain, parent.routes[r].finalDomain);
    assert.equal(map.routes[r].checkpoints.length, parent.routes[r].checkpoints.length);
    assert.equal(map.routes[r].segments.length, parent.routes[r].segments.length);
  }
  assert.deepEqual([...new Set(map.obstacles.map(o => o.mechanic_kind))].sort(), ['fixed_armor_or_spike', 'spring_wall', 'vertical_armor_slider']);
  orders.add(order.join(',')); stage1Orders.add(order.slice(4, 8).join(','));
  nontrivial += +order.some((q, i) => q !== i); generated++;
  if (seed < 8) {
    assert.deepEqual(Registry.generate(Registry.CONFIG, input), Old.generate(Old.CONFIG, input)); inheritedComparisons++;
    for (const style of Old.STYLES) { assert.deepEqual(Registry.generateStyle(style, input), Old.generateStyle(style, input)); inheritedComparisons++; }
  }
}
assert.throws(() => G.generate({...G.CONFIG, changed: true}, {}));
assert.throws(() => G.apply(G.generate(G.CONFIG, {})));
const modified = G.generateParent({}); modified.obstacles[0].x++;
assert.throws(() => G.apply(modified));
assert.throws(() => G.generate(G.CONFIG, {y: 200}));
assert.equal(Observe.observe({}, {}, {}).status, 'invalid');
assert.equal(Observe.compare({status: 'censored'}, {status: 'observed'}).status, 'not_identifiable');
const Batch = require('../../batch.cjs');
assert.deepEqual(Batch.pureGeneration(G.CONFIG, {seed: 0}), G.generate(G.CONFIG, {seed: 0}));
assert.deepEqual(Batch.pureGeneration(Registry.CONFIG, {seed: 0}), Old.generate(Old.CONFIG, {seed: 0}));
assert.equal(physicsCalls, 0);
const result = {pass: true, schema: 'b001-static-generation-fixtures/1', generatedConditions: generated,
  duplicateDeterminismChecks: generated, inheritedExactComparisons: inheritedComparisons,
  uniqueEarlyParentSlotOrders: orders.size, uniqueMiddleStageOrders: stage1Orders.size,
  changedMacroConditions: nontrivial, genericBatchRoutingChecks: 2, physicsCalls, physicalTicks: 0,
  qualification: 'static invariants only; order counts are not qualified behaviors or fun'};
console.log(JSON.stringify(result, null, 2));
