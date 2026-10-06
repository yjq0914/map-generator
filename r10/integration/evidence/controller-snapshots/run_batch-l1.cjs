'use strict';
// One live native world per map. No source edits, obstacle culling, checkpoint
// restore, collision neutralization, hidden rehearsal, or controller search.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { sha, assertExcludedFree, provenance, generate: generateBaseline } = require('./baseline.cjs');
const CONTROLLER = Object.freeze({ id: 'ordinary-route-threshold-v1', lookaheadSeconds: 0.14, thresholdPx: 9, minimumVy: -100, minimumFlapTicks: 0, diagnostic: false });

function loadRuntime() {
  const file = path.join(__dirname, 'vendor/flappy-runtime.js');
  if (sha(fs.readFileSync(file)) !== provenance.runtime.sha256) throw Error('Canonical runtime SHA256 mismatch');
  // Loading in this realm preserves the runtime's strict Array prototype guard.
  require(file);
  return globalThis.FlappyRuntime;
}

function routeTargets(map, options = {}) {
  let guide = options.guide || map.integration?.guide || map.guide || map.metadata?.guide;
  if (!guide && map.routes?.main?.segments) {
    let start = 0;
    guide = map.routes.main.segments.map(s => { const g = { x: start, until_x: s.endX, target_y: s.targetY }; start = s.endX; return g; });
  }
  if (!guide) guide = [{ x: 0, until_x: map.width + 1, target_y: 270 }];
  guide = structuredClone(guide);
  if (!Array.isArray(guide) || !guide.length) throw Error('Route guide must be a nonempty array');
  for (const [i, g] of guide.entries()) {
    if (![g.x, g.until_x, g.target_y].every(Number.isFinite) || g.until_x <= g.x || g.target_y < 10 || g.target_y > 530) throw Error(`Invalid route guide segment ${i}`);
    if (g.target_y_end !== undefined && (!Number.isFinite(g.target_y_end) || g.target_y_end < 10 || g.target_y_end > 530)) throw Error(`Invalid route interpolation ${i}`);
    if (i && g.x < guide[i - 1].x) throw Error('Route guide must be ordered by x');
  }
  return guide;
}

function makeController(map, options = {}) {
  const guide = routeTargets(map, options);
  let last = -Infinity;
  function action(state) {
    // Later segments take precedence at a shared boundary. Gaps retain the
    // preceding target; no obstacle poses or future simulation enter control.
    let selected = guide[0];
    for (const g of guide) { if (g.x > state.x) break; selected = g; }
    const u = Math.max(0, Math.min(1, (state.x - selected.x) / (selected.until_x - selected.x)));
    const target = selected.target_y + ((selected.target_y_end ?? selected.target_y) - selected.target_y) * u;
    const flap = selected.policy === 'release' ? false : state.y + state.vy * CONTROLLER.lookaheadSeconds > target + CONTROLLER.thresholdPx && state.vy > CONTROLLER.minimumVy && state.tick - last >= CONTROLLER.minimumFlapTicks;
    if (flap) last = state.tick;
    return { flap, targetY: target, guidePolicy: selected.policy || 'feedback' };
  }
  return { action, guide, config: CONTROLLER };
}

function seamTargets(map, options = {}) {
  const supplied = options.seams || map.integration?.seams || map.seams || [];
  if (!Array.isArray(supplied)) throw Error('Seams must be an array');
  return supplied.map((s, i) => {
    const x = typeof s === 'number' ? s : s.x ?? s.boundary_x ?? s.world_x;
    if (!Number.isFinite(x) || x < 60 || x > map.width) throw Error(`Invalid seam x at ${i}`);
    return { ...(typeof s === 'number' ? {} : s), id: s.id || `seam-${i}`, x };
  });
}

function frame(runtime, map, state) {
  return { tick: state.tick, bodies: runtime.obstacles(map, state.tick, state).map(b => Object.fromEntries(['id', 'sourceId', 'kind', 'shape', 'x', 'y', 'w', 'h', 'x2', 'y2', 'width', 'rotation', 'status', 'phase', 'lethal', 'projectile', 'points'].filter(k => b[k] !== undefined).map(k => [k, b[k]]))) };
}

function runMap(input, options = {}) {
  const map = input.map || input;
  const metadata = input.map ? input.metadata || {} : {};
  const guide = options.guide || metadata.guide;
  const seams = options.seams || metadata.seams;
  const runtime = loadRuntime();
  assertExcludedFree(map);
  if (map.intervention) throw Error('Benchmark maps must not contain runtime interventions');
  runtime.validate(map);
  const mapSHA256 = sha(map);
  const horizonTicks = options.horizonTicks ?? metadata.evaluationHorizonTicks ?? map.integration?.evaluationHorizonTicks ?? map.durationTicks ?? Math.ceil((map.width - 60) / runtime.VX / runtime.DT);
  if (!Number.isSafeInteger(horizonTicks) || horizonTicks < 1 || horizonTicks > 14400) throw Error('Invalid evaluation horizon');
  const controller = makeController(map, { guide });
  const seamSpecs = seamTargets(map, { seams });
  const seamRecords = seamSpecs.map(spec => ({ ...spec, crossed: false, before: null, after: null, next: null, status: 'not-reached' }));
  const start = process.hrtime.bigint();
  const state = runtime.createState(map);
  const initialState = structuredClone(state);
  const rows = [[state.tick, state.x, state.y, state.vx, state.vy, +state.alive, +state.won, null, null]];
  const flapTicks = [], bodyFrames = [], checkpoints = [];
  const stateChain = crypto.createHash('sha256');
  const telemetry = { executedSubsteps: 0 };
  let physicsCalls = 0, error = null;
  const capture = () => {
    const serialized = JSON.stringify(state);
    stateChain.update(serialized + '\n');
    if (state.tick % 120 === 0) checkpoints.push({ tick: state.tick, stateSHA256: sha(serialized), state: structuredClone(state) });
    if (state.tick % 12 === 0) bodyFrames.push(frame(runtime, map, state));
  };
  capture();
  try {
    while (state.alive && !state.won && !state.terminal && state.tick < horizonTicks) {
      if (Number(process.hrtime.bigint() - start) / 1e9 > (options.watchdogSeconds || 120)) throw Error('Native rollout watchdog exceeded');
      const before = structuredClone(state);
      const decision = controller.action(state);
      if (decision.flap) flapTicks.push(state.tick);
      runtime.step(map, state, decision.flap, telemetry);
      physicsCalls++;
      if (state.tick !== before.tick + 1) throw Error('Native world failed to advance exactly one tick');
      rows.push([state.tick, state.x, state.y, state.vx, state.vy, +state.alive, +state.won, +decision.flap, decision.targetY]);
      for (const seam of seamRecords) {
        if (!seam.crossed && before.x < seam.x && state.x >= seam.x) {
          Object.assign(seam, { crossed: true, status: state.alive ? 'crossed-alive' : 'crossed-dead', crossingTick: state.tick, before, after: structuredClone(state), currentBodies: frame(runtime, map, state).bodies });
        } else if (seam.crossed && !seam.next && state.tick === seam.crossingTick + 1) seam.next = structuredClone(state);
      }
      capture();
    }
  } catch (e) { error = String(e.stack || e); }
  if (!bodyFrames.length || bodyFrames.at(-1).tick !== state.tick) bodyFrames.push(frame(runtime, map, state));
  if (sha(map) !== mapSHA256) throw Error('Map changed during native rollout');
  const death = state.events.find(e => e.type === 'death') || null;
  for (const seam of seamRecords) if (!seam.crossed) seam.status = death ? 'not-reached-before-death' : 'not-reached-before-horizon';
  const nativeWon = state.won === true;
  const survivedHorizon = state.alive === true && state.tick >= horizonTicks;
  const result = {
    schema: 'combo-map-native-run/1', id: options.id || map.id || `map-${map.seed}`,
    mapSHA256, runtimeSHA256: provenance.runtime.sha256, controller: CONTROLLER,
    controllerSourceSHA256: sha(fs.readFileSync(__filename)), routeGuideSHA256: sha(controller.guide),
    seed: map.seed, metadata, horizonTicks, actualTicks: state.tick, physicsCalls,
    nativeWon, alive: state.alive, survivedHorizon,
    outcome: error ? 'execution-error' : nativeWon ? 'native-win' : death || !state.alive ? 'death' : state.tick >= horizonTicks ? 'alive-prefix-only' : 'native-terminal-without-win',
    death, terminal: state.terminal || null,
    initialState, finalState: structuredClone(state), events: structuredClone(state.events), seams: seamRecords,
    stateSequenceSHA256: stateChain.digest('hex'), inputSHA256: sha(flapTicks),
    flapCount: flapTicks.length,
    springContacts: state.events.filter(e => e.type === 'bounce'),
    executedSubsteps: telemetry.executedSubsteps || null,
    substepNote: telemetry.executedSubsteps ? 'Caller-owned native runtime telemetry' : 'The canonical legacy fast path does not expose executed substeps; ticks are counted exactly',
    wallSeconds: Number(process.hrtime.bigint() - start) / 1e9,
    continuity: { nativeInitializations: 1, restores: 0, resets: 0, deletedHazards: 0, obstacleCountBefore: map.obstacles.length, obstacleCountAfter: map.obstacles.length, previousHazardsRetained: true, controllerContinuous: true },
    qualification: 'Small fixed-controller integration observation only; no human-playability, fun, or global family qualification',
    error
  };
  const trace = {
    schema: 'combo-map-native-trace/1', id: result.id, mapSHA256, runtimeSHA256: result.runtimeSHA256,
    controller: CONTROLLER, guide: controller.guide, horizonTicks,
    rowSchema: ['tick', 'x', 'y', 'vx', 'vy', 'alive', 'won', 'inputCausingRow', 'targetY'],
    rows, flapTicks, checkpoints, bodyFrames,
    initialState, finalState: result.finalState, seams: seamRecords, events: result.events,
    stateSequenceSHA256: result.stateSequenceSHA256, inputSHA256: result.inputSHA256,
    continuity: result.continuity
  };
  return { result, trace };
}

function validatePanel(entries) {
  if (entries.length !== 24) throw Error('This lightweight panel requires exactly 24 map entries');
  const old = entries.filter(e => e.arm === 'old' && e.cohort === 'paired');
  const fresh = entries.filter(e => e.arm === 'new' && e.cohort === 'paired');
  const holdouts = entries.filter(e => e.arm === 'new' && e.cohort === 'holdout');
  if (old.length !== 8 || fresh.length !== 8 || holdouts.length !== 8) throw Error('Expected 8 paired old, 8 paired new, 8 new heldouts');
  if (new Set(entries.map(e => e.id)).size !== 24) throw Error('Run IDs must be distinct');
  for (const e of old) {
    const mates = fresh.filter(q => q.pairId === e.pairId);
    if (!e.pairId || mates.length !== 1 || mates[0].seed !== e.seed || JSON.stringify(mates[0].difficulty) !== JSON.stringify(e.difficulty) || mates[0].duration_s !== e.duration_s) throw Error(`Unmatched same-seed nominal target: ${e.id}`);
  }
  if (new Set(old.map(e => e.pairId)).size !== 8 || new Set(holdouts.map(e => e.seed)).size !== 8 || holdouts.some(h => old.some(e => e.seed === h.seed))) throw Error('Pairs must be unique; heldout seeds must be fresh and unique');
  return true;
}

function normalizeManifest(manifest) {
  if (manifest.entries) return manifest.entries;
  if (!Array.isArray(manifest.scenarios)) throw Error('Manifest requires entries or scenarios');
  return manifest.scenarios.map(s => ({
    ...s,
    arm: s.arm === 'baseline' ? 'old' : 'new',
    cohort: s.arm === 'holdout' ? 'holdout' : 'paired',
    pairId: s.arm === 'holdout' ? null : s.pairId || `seed-${s.seed}`,
    mapFile: s.map_path || s.mapFile,
    duration_s: s.target_duration_s ?? s.duration_s ?? 31.5,
    horizonTicks: s.horizonTicks ?? (s.horizon_s === undefined ? undefined : Math.ceil(s.horizon_s * 120))
  }));
}

function runBatch(manifest, outDir, { baseDir = process.cwd(), onResult = null } = {}) {
  const entries = normalizeManifest(manifest);
  validatePanel(entries);
  const runtime = loadRuntime();
  if (fs.existsSync(path.join(outDir, 'manifest.json'))) throw Error('Refusing to overwrite an existing batch output directory');
  // Admit the complete preregistered set before any run. Do not silently drop a
  // broken map or replace a failed condition after observing its outcome.
  const loaded = entries.map(entry => {
    if (!/^[A-Za-z0-9._-]+$/.test(entry.id)) throw Error('Unsafe run ID');
    if (!entry.mapFile && entry.arm !== 'old') throw Error(`New map path required: ${entry.id}`);
    const input = entry.mapFile ? JSON.parse(fs.readFileSync(path.resolve(baseDir, entry.mapFile))) : generateBaseline({ seed: entry.seed, difficulty: entry.difficulty, duration: entry.horizonTicks === undefined ? entry.duration_s : entry.horizonTicks / 120 });
    const bytes = entry.mapFile ? fs.readFileSync(path.resolve(baseDir, entry.mapFile)) : Buffer.from(JSON.stringify(input));
    const map = input.map || input;
    assertExcludedFree(map); runtime.validate(map);
    routeTargets(map, { guide: entry.guide || input.metadata?.guide });
    seamTargets(map, { seams: entry.seams || input.metadata?.seams });
    if (map.intervention) throw Error('Interventions forbidden');
    if (map.seed !== entry.seed || entry.mapSHA256 && sha(map) !== entry.mapSHA256) throw Error(`Map identity mismatch: ${entry.id}`);
    return { entry, input, fileSHA256: sha(bytes) };
  });
  fs.mkdirSync(outDir, { recursive: true });
  const planFile = path.join(outDir, 'manifest.json');
  if (fs.existsSync(planFile)) throw Error('Refusing to overwrite an existing batch output directory');
  fs.writeFileSync(planFile, JSON.stringify(manifest, null, 2) + '\n');
  const results = [];
  for (const { entry, input, fileSHA256 } of loaded) {
    if (!entry.mapFile) {
      entry.mapFile = `${entry.id}.map.json`;
      fs.writeFileSync(path.join(outDir, entry.mapFile), JSON.stringify(input));
    }
    const { result, trace } = runMap(input, { id: entry.id, horizonTicks: entry.horizonTicks, guide: entry.guide, seams: entry.seams });
    Object.assign(result, { arm: entry.arm, cohort: entry.cohort, pairId: entry.pairId || null, nominalDifficulty: entry.difficulty, nominalDurationSeconds: entry.duration_s, mapFile: entry.mapFile, mapFileSHA256: fileSHA256 });
    const traceFile = `${entry.id}.trace.json.gz`;
    const tapeFile = `${entry.id}.inputs.json`;
    const traceBytes = zlib.gzipSync(JSON.stringify(trace), { level: 9 });
    fs.writeFileSync(path.join(outDir, traceFile), traceBytes);
    fs.writeFileSync(path.join(outDir, tapeFile), JSON.stringify({ schema: 'combo-map-input-tape/1', mapSHA256: result.mapSHA256, runtimeSHA256: result.runtimeSHA256, controller: CONTROLLER, ticks: result.actualTicks, flapTicks: trace.flapTicks, inputSHA256: result.inputSHA256 }) + '\n');
    Object.assign(result, { traceFile, traceSHA256: sha(traceBytes), tapeFile });
    fs.writeFileSync(path.join(outDir, `${entry.id}.result.json`), JSON.stringify(result, null, 2) + '\n');
    results.push(result);
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ schema: 'combo-map-batch-results/1', completed: results.length, planned: 24, manifestSHA256: sha(manifest), controller: CONTROLLER, results }, null, 2) + '\n');
    if (onResult) onResult(result);
  }
  return results;
}

module.exports = { CONTROLLER, loadRuntime, routeTargets, makeController, seamTargets, runMap, validatePanel, normalizeManifest, runBatch };

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = name => args[args.indexOf(name) + 1];
  if (!args.includes('--manifest') || !args.includes('--out')) throw Error('Usage: node run_batch.cjs --manifest PANEL.json --out NEW_OUTPUT_DIR');
  const manifestPath = path.resolve(get('--manifest'));
  const results = runBatch(JSON.parse(fs.readFileSync(manifestPath)), path.resolve(get('--out')), { baseDir: path.dirname(manifestPath), onResult: r => process.stdout.write(JSON.stringify({ id: r.id, outcome: r.outcome, ticks: r.actualTicks, death: r.death?.id || null, seamsCrossed: r.seams.filter(s => s.crossed).length }) + '\n') });
  process.stdout.write(JSON.stringify({ completed: results.length, nativeWins: results.filter(r => r.nativeWon).length, survivedHorizon: results.filter(r => r.survivedHorizon).length }) + '\n');
}
