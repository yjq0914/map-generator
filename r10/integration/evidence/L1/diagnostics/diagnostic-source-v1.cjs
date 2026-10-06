'use strict';
// Explicitly incomparable controller diagnostics. This file never changes or
// calls the L1 runner's action policy. One invocation is one native trajectory.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { sha, assertExcludedFree, verifyVendor, provenance } = require('./baseline.cjs');
const { loadRuntime, routeTargets, seamTargets } = require('./run_batch.cjs');
const controllerProvenance = require('./vendor/diagnostic-controller-provenance.json');

function createController(map, mode, runtime) {
  if (mode === 'historical-mpc') {
    verifyVendor();
    for (const f of controllerProvenance.files) if (sha(fs.readFileSync(path.join(__dirname, 'vendor', f.path))) !== f.sha256) throw Error('Historical controller source changed');
    const act = require('./vendor/c005/source/vendor/route-controller-v6.cjs').create(map, 'main', false);
    return {
      config: { mode, comparableToL1: false, diagnostic: true, source: 'unchanged route-controller-v6 -> v5', information: 'Assigned original route and known future geometry; analytical MPC, not ordinary feedback', files: controllerProvenance.files },
      action: s => ({ flap: !!act({ ...runtime.observation(map, s), tick: s.tick }), targetY: null }),
      stats: () => act.stats()
    };
  }
  if (mode !== 'source-threshold') throw Error('Mode must be historical-mpc or source-threshold');
  const guide = routeTargets(map);
  return {
    config: { mode, comparableToL1: false, diagnostic: true, source: 'literal source-style y >= target && vy > 0', information: 'Authored guide only; no lookahead, obstacle feedback, rehearsals, or automatic spring/laser policy' },
    action: s => {
      let g = guide[0];
      for (const q of guide) { if (q.x > s.x) break; g = q; }
      const u = Math.max(0, Math.min(1, (s.x - g.x) / (g.until_x - g.x)));
      const targetY = g.target_y + ((g.target_y_end ?? g.target_y) - g.target_y) * u;
      return { flap: s.y >= targetY && s.vy > 0, targetY, guide: g };
    },
    stats: () => ({ noModelSearch: true })
  };
}

function bodyFrame(runtime, map, state) {
  return { tick: state.tick, bodies: runtime.obstacles(map, state.tick, state).map(b => Object.fromEntries(['id', 'sourceId', 'kind', 'shape', 'x', 'y', 'w', 'h', 'x2', 'y2', 'width', 'rotation', 'status', 'phase', 'lethal', 'projectile', 'points'].filter(k => b[k] !== undefined).map(k => [k, b[k]]))) };
}

function runDiagnostic(input, { id, mode, horizonTicks, outDir }) {
  if (!/^[A-Za-z0-9._-]+$/.test(id) || !Number.isSafeInteger(horizonTicks) || horizonTicks < 1 || horizonTicks > 14400) throw Error('Invalid diagnostic id/horizon');
  if (fs.existsSync(outDir)) throw Error('Refusing to overwrite a diagnostic directory');
  const map = input.map || input;
  assertExcludedFree(map);
  if (map.intervention) throw Error('Runtime interventions are forbidden');
  const runtime = loadRuntime(); runtime.validate(map);
  const mapSHA256 = sha(map), sourceSHA256 = sha(fs.readFileSync(__filename));
  const controller = createController(map, mode, runtime);
  const state = runtime.createState(map), initialState = structuredClone(state);
  const specs = [
    ...seamTargets(map).map(s => ({ ...s, category: 'module-seam' })),
    ...routeTargets(map).filter(g => g.x > 60 && g.x <= map.width).map((g, i) => ({ id: `guide-${i}`, x: g.x, category: 'guide-threshold', targetY: g.target_y, guidePolicy: g.policy || 'feedback', moduleId: g.module_id || null }))
  ].sort((a, b) => a.x - b.x);
  const thresholds = specs.map(s => ({ ...s, crossed: false, before: null, after: null }));
  const rows = [], bodyFrames = [], checkpoints = [], flapTicks = [], flapDecisions = [];
  const stateChain = crypto.createHash('sha256'), telemetry = { executedSubsteps: 0 };
  const start = process.hrtime.bigint(); let error = null, physicsCalls = 0;
  function capture(inputCausingRow = null, targetY = null) {
    rows.push([state.tick, state.x, state.y, state.vx, state.vy, +state.alive, +state.won, inputCausingRow, targetY]);
    stateChain.update(JSON.stringify(state) + '\n');
    if (state.tick % 12 === 0) bodyFrames.push(bodyFrame(runtime, map, state));
    if (state.tick % 120 === 0) checkpoints.push({ tick: state.tick, state: structuredClone(state) });
  }
  capture();
  try {
    while (state.alive && !state.won && !state.terminal && state.tick < horizonTicks) {
      if (Number(process.hrtime.bigint() - start) / 1e9 > 120) throw Error('Diagnostic watchdog exceeded');
      const before = structuredClone(state), decision = controller.action(state);
      if (decision.flap) { flapTicks.push(state.tick); flapDecisions.push({ tick: state.tick, x: state.x, y: state.y, vy: state.vy, targetY: decision.targetY }); }
      runtime.step(map, state, decision.flap, telemetry); physicsCalls++;
      if (state.tick !== before.tick + 1) throw Error('Non-unit native tick');
      for (const t of thresholds) if (!t.crossed && before.x < t.x && state.x >= t.x) Object.assign(t, { crossed: true, before, after: structuredClone(state) });
      capture(+decision.flap, decision.targetY);
    }
  } catch (e) { error = String(e.stack || e); }
  if (bodyFrames.at(-1)?.tick !== state.tick) bodyFrames.push(bodyFrame(runtime, map, state));
  if (sha(map) !== mapSHA256) throw Error('Diagnostic mutated map');
  const death = state.events.find(e => e.type === 'death') || null;
  const result = {
    schema: 'combo-map-controller-diagnostic/1', id, mode, mapSHA256, runtimeSHA256: provenance.runtime.sha256, controllerSourceSHA256: sourceSHA256,
    diagnosticOnly: true, comparableToL1: false, comparableAcrossModes: false,
    scope: 'Targeted controller diagnosis on one untouched map; no improvement, family qualification, or human playability claim',
    controller: controller.config, controllerStats: controller.stats(),
    horizonTicks, actualTicks: state.tick, physicsCalls, nativeWon: state.won, alive: state.alive,
    survivedHorizon: state.alive && state.tick >= horizonTicks,
    outcome: error ? 'execution-error' : state.won ? 'native-win' : !state.alive ? 'death' : 'alive-prefix-only',
    death, initialState, finalState: structuredClone(state), thresholds,
    seams: thresholds.filter(t => t.category === 'module-seam'), springContacts: state.events.filter(e => e.type === 'bounce'),
    events: state.events, flapCount: flapTicks.length, inputSHA256: sha(flapTicks), stateSequenceSHA256: stateChain.digest('hex'),
    continuity: { nativeInitializations: 1, restores: 0, resets: 0, deletedHazards: 0, obstacleCount: map.obstacles.length },
    wallSeconds: Number(process.hrtime.bigint() - start) / 1e9, error
  };
  const trace = { schema: 'combo-map-native-trace/1', id, mapSHA256, runtimeSHA256: result.runtimeSHA256, controller: controller.config, guide: routeTargets(map), horizonTicks, rowSchema: ['tick', 'x', 'y', 'vx', 'vy', 'alive', 'won', 'inputCausingRow', 'targetY'], rows, bodyFrames, checkpoints, flapTicks, flapDecisions, thresholds, seams: result.seams, events: result.events, initialState, finalState: result.finalState };
  fs.mkdirSync(outDir, { recursive: true });
  const bytes = zlib.gzipSync(JSON.stringify(trace), { level: 9 });
  fs.writeFileSync(path.join(outDir, 'trace.json.gz'), bytes);
  fs.writeFileSync(path.join(outDir, 'inputs.json'), JSON.stringify({ mapSHA256, mode, ticks: state.tick, inputSHA256: result.inputSHA256, flapTicks }) + '\n');
  fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(map) + '\n');
  Object.assign(result, { traceFile: 'trace.json.gz', traceSHA256: sha(bytes), inputFile: 'inputs.json' });
  fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}

module.exports = { createController, runDiagnostic };
if (require.main === module) {
  const args = process.argv.slice(2), get = n => args[args.indexOf(n) + 1];
  for (const n of ['--map', '--mode', '--horizon', '--id', '--out']) if (!args.includes(n)) throw Error(`Missing ${n}`);
  const input = JSON.parse(fs.readFileSync(get('--map')));
  const result = runDiagnostic(input, { id: get('--id'), mode: get('--mode'), horizonTicks: Math.ceil(Number(get('--horizon')) * 120), outDir: path.resolve(get('--out')) });
  console.log(JSON.stringify({ id: result.id, outcome: result.outcome, ticks: result.actualTicks, death: result.death, seams: result.seams.filter(s => s.crossed).length, wallSeconds: result.wallSeconds }));
}
