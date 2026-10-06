'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { predictTopContact, createController } = require('../diagnostic.cjs');

test('diagnostic source threshold is literal and explicitly incomparable', () => {
  const map = { width: 1000, integration: { guide: [{ x: 60, until_x: 1000, target_y: 200, policy: 'laser_release' }] } };
  const c = createController(map, 'source-threshold', null);
  assert.equal(c.config.comparableToL1, false);
  assert.equal(c.config.diagnostic, true);
  assert.equal(c.action({ x: 200, y: 199.9, vy: 400 }).flap, false);
  assert.equal(c.action({ x: 200, y: 200, vy: 1 }).flap, true);
  assert.equal(c.action({ x: 200, y: 210, vy: 0 }).flap, false);
  assert.equal(c.action({ x: 200, y: 210, vy: -1 }).flap, false);
});

test('unknown diagnostic controller mode is refused', () => {
  assert.throws(() => createController({}, 'unreported-hybrid', null), /Mode must be/);
});

test('relational diagnostic releases only in acquisition or after observed same-module top contact', () => {
  const map = { width: 1000, integration: { guide: [{ x: 300, until_x: 440, target_y: 415, module_id: 'm02', policy: 'spring-acquire' }, { x: 440, until_x: 700, target_y: 260, module_id: 'm02', policy: 'spring-receive' }] } };
  const c = createController(map, 'relational-source-v2', null);
  assert.equal(c.action({ x: 350, y: 420, vy: 100, tick: 10, events: [] }).flap, false);
  assert.equal(c.action({ x: 450, y: 280, vy: 100, tick: 20, events: [] }).flap, true);
  const event = { type: 'bounce', id: 'm02-S-reset', side: 'top', tick: 18 };
  assert.equal(c.action({ x: 450, y: 280, vy: 100, tick: 20, events: [event] }).flap, false);
  assert.equal(c.action({ x: 460, y: 280, vy: 100, tick: 30, events: [event] }).flap, false);
  assert.equal(c.action({ x: 461, y: 280, vy: 100, tick: 31, events: [event] }).flap, true);
  assert.equal(c.action({ x: 450, y: 280, vy: 100, tick: 20, events: [{ ...event, id: 'm01-S-reset' }] }).flap, true);
  assert.equal(c.action({ x: 450, y: 280, vy: 100, tick: 20, events: [{ ...event, side: 'bottom' }] }).flap, true);
  assert.equal(c.stats().contactsForced, 0);
  assert.equal(c.stats().observations.length, 1);
});

test('v3 contact predictor uses actual state and radius-inset geometry', () => {
  const spring = { x: 400, y: 420, collider: { w: 70 } };
  const p = predictTopContact({ x: 350, y: 350, vy: 0, vx: 150 }, spring);
  assert.equal(p.admissible, false);
  assert.deepEqual(p.window, [410, 460]);
  const valid = predictTopContact({ x: 380, y: 350, vy: 0, vx: 150 }, spring);
  assert.equal(valid.admissible, true);
  assert.equal(predictTopContact({ x: 420, y: 411, vy: 1, vx: 150 }, spring).admissible, false);
});

test('v3 bypass locks only on an actual flap decision without state writes', () => {
  const map = { width: 1000, obstacles: [{ id: 'm02-S-reset', mechanic_kind: 'spring_wall', x: 400, y: 420, collider: { w: 70 } }, { id: 'm02-G-receiver', mechanic_kind: 'timed_armor_gate', y: 286 }], integration: { guide: [{ x: 300, until_x: 480, target_y: 415, module_id: 'm02', policy: 'spring-acquire' }, { x: 480, until_x: 700, target_y: 311, module_id: 'm02', policy: 'spring-receive' }] } };
  const c = createController(map, 'relational-source-v3', null);
  const state = { x: 320, y: 310, vy: 100, vx: 150, tick: 10, events: [] }, before = structuredClone(state);
  assert.equal(c.action(state).flap, true);
  assert.deepEqual(state, before);
  assert.equal(c.stats().branches.m02.locked, true);
  const wouldContact = c.action({ x: 380, y: 350, vy: 0, vx: 150, tick: 11, events: [] });
  assert.equal(wouldContact.contactPrediction.admissible, true);
  assert.equal(wouldContact.springBranch, 'bypass');
  assert.equal(wouldContact.releaseReason, null);
  assert.equal(c.stats().contactsForced, 0);
});
