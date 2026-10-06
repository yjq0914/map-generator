'use strict';
// Pure observation of SAVED ACTUAL frames and inputs. No engine dependency or action selection.
// Relies on the certified b002 shape adapter, rather than implementing another geometry kernel.
const Geometry = require('../../harness/b002-metrics.cjs');
const VERSION = 'actual-warning-diagonal-laser/2';
const finite = Number.isFinite;
function observe(map, run, trace) {
  const p = map.design?.laserProgram;
  if (!p) return {schema: VERSION, status: 'unsupported', reason: 'laser construction missing'};
  if (trace?.initialState?.tick !== 0 || trace?.continuity?.startedAtTick !== 0 || trace?.continuity?.restorationUsed !== false)
    return {schema: VERSION, status: 'invalid', reason: 'continuous tick-zero evidence required'};
  if (!Array.isArray(trace.rows) || !Array.isArray(trace.bodySamples) || !Array.isArray(trace.flapTicks))
    return {schema: VERSION, status: 'missing', reason: 'actual rows/body frames/input tape required'};
  const rowAt = new Map(trace.rows.map(row => [row[0], row]));
  const frames = trace.bodySamples.map(frame => ({...frame, body: frame.bodies.find(b => b.sourceId === p.sourceId)}));
  const targetFrames = frames.filter(f => f.body);
  if (!targetFrames.length) return {schema: VERSION, status: 'not_reached', reason: 'no saved target body'};
  if (targetFrames.some(f => !rowAt.has(f.tick) || !['x', 'y', 'x2', 'y2', 'width'].every(k => finite(f.body[k])) ||
    f.body.shape !== 'segment' || typeof f.body.lethal !== 'boolean' || typeof f.body.status !== 'string'))
    return {schema: VERSION, status: 'invalid', reason: 'actual player/body geometry incomplete'};
  const visibility = targetFrames.map(f => {
    const b = f.body, row = rowAt.get(f.tick), bounds = Geometry.runtimeBounds(b);
    const visible = bounds.maxX >= row[1] - 10 && bounds.minX <= row[1] + 520;
    const slice = Geometry.capsuleSlice(row[1], b, 10);
    const side = !slice ? 'outside-x-span' : row[2] < slice[0] ? 'above' : row[2] > slice[1] ? 'below' : 'overlapping';
    const margin = !slice ? null : side === 'above' ? slice[0] - row[2] : side === 'below' ? row[2] - slice[1] : -Math.min(row[2] - slice[0], slice[1] - row[2]);
    return {tick: f.tick, status: b.status, lethal: b.lethal, visible, side, margin, x: row[1], y: row[2], vy: row[3],
      endpointY: b.y, endpoint2Y: b.y2, alive: row[5] === true || row[5] === 1};
  });
  const transitions = visibility.filter((f, i, all) => !i || f.status !== all[i - 1].status).map(f => ({tick: f.tick, status: f.status, lethal: f.lethal}));
  const firstActive = visibility.find(f => f.status === 'active');
  const warning = visibility.filter(f => f.status === 'warning' && f.visible && (!firstActive || f.tick < firstActive.tick));
  const warningContiguous = warning.every((f, i) => !i || f.tick === warning[i - 1].tick + 1);
  const warningSeconds = warning.length && firstActive && warningContiguous ? (firstActive.tick - warning[0].tick) / 120 : null;
  const crossing = visibility.filter(f => f.side !== 'outside-x-span');
  const activeCrossing = crossing.filter(f => f.lethal && f.status === 'active');
  const sideChanges = crossing.filter((f, i) => i && f.side !== crossing[i - 1].side)
    .map((f, i) => ({tick: f.tick, side: f.side, status: f.status, lethal: f.lethal}));
  const exitFrame = targetFrames.find(f => { const row = rowAt.get(f.tick); return row[1] - 10 > Math.max(f.body.x, f.body.x2) + f.body.width / 2; });
  const exitRow = exitFrame ? rowAt.get(exitFrame.tick) : null;
  const recoveryEndTick = exitRow ? exitRow[0] + 90 : null;
  const recoveryRow = recoveryEndTick === null ? null : rowAt.get(recoveryEndTick);
  const measuredWindow = {startTick: warning[0]?.tick ?? targetFrames[0].tick,
    endTick: recoveryEndTick ?? targetFrames.at(-1).tick};
  const localRows = trace.rows.filter(row => row[0] >= measuredWindow.startTick && row[0] <= measuredWindow.endTick);
  const windowFlaps = trace.flapTicks.filter(t => t >= measuredWindow.startTick && t < measuredWindow.endTick);
  const dense = localRows.length === measuredWindow.endTick - measuredWindow.startTick + 1;
  return {schema: VERSION, status: recoveryRow && dense ? 'observed' : 'censored', role: run.role, sourceId: p.sourceId,
    taskPass: run.taskPass, transitions, warning: {firstVisibleTick: warning[0]?.tick ?? null,
      firstActiveTick: firstActive?.tick ?? null, sampledContinuousSeconds: warningSeconds,
      runtimeAvailableAtLeast065Seconds: warningSeconds === null ? null : warningSeconds >= .65,
      playerReadCue: null, causeOfResponse: null},
    activeCrossing: {samples: activeCrossing.length,
      actualMinVerticalSliceMarginPx: activeCrossing.length ? Math.min(...activeCrossing.map(f => f.margin)) : null,
      endpointTravelPx: activeCrossing.length ? Math.max(...activeCrossing.map(f => f.endpointY)) - Math.min(...activeCrossing.map(f => f.endpointY)) : null},
    sideChanges, recovery: {wholeBodyExitTick: exitRow?.[0] ?? null, sampledAfter075Seconds: !!recoveryRow,
      alive: recoveryRow ? !!recoveryRow[5] : null, y: recoveryRow?.[2] ?? null, vy: recoveryRow?.[3] ?? null},
    actualAction: {window: measuredWindow, dense, flapTicks: windowFlaps,
      yRangePx: localRows.length ? Math.max(...localRows.map(r => r[2])) - Math.min(...localRows.map(r => r[2])) : null},
    humanFun: null, limits: ['visibility is available runtime cue, not evidence the controller or a person read it',
      'capsule-slice margin is at saved sample ticks, not a continuous collision certificate',
      'input change must be compared to the same role/condition parent; causal warning response remains unknown',
      'recovery survival is observed state only; full route and subsequent receiver still require formal evidence']};
}
function compareInputs(parentTrace, candidateTrace, window) {
  if (!Array.isArray(parentTrace?.rows) || !Array.isArray(candidateTrace?.rows) || !Array.isArray(parentTrace?.flapTicks) || !Array.isArray(candidateTrace?.flapTicks))
    return {status: 'missing', reason: 'paired actual trace required'};
  if (parentTrace.initialState?.tick !== 0 || candidateTrace.initialState?.tick !== 0 ||
    parentTrace.continuity?.startedAtTick !== 0 || candidateTrace.continuity?.startedAtTick !== 0 ||
    parentTrace.continuity?.restorationUsed !== false || candidateTrace.continuity?.restorationUsed !== false ||
    !parentTrace.conditionHash || parentTrace.conditionHash !== candidateTrace.conditionHash || parentTrace.role !== candidateTrace.role)
    return {status: 'invalid', reason: 'same condition/role and continuous real tick-zero pair required'};
  const a = new Set(parentTrace.flapTicks.filter(t => t >= window.startTick && t < window.endTick));
  const b = new Set(candidateTrace.flapTicks.filter(t => t >= window.startTick && t < window.endTick));
  const rows = new Map(parentTrace.rows.map(r => [r[0], r]));
  const paired = candidateTrace.rows.filter(r => r[0] >= window.startTick && r[0] <= window.endTick && rows.has(r[0]));
  return {status: paired.length === window.endTick - window.startTick + 1 ? 'observed' : 'censored', window,
    changedCommandTicks: [...a].filter(t => !b.has(t)).length + [...b].filter(t => !a.has(t)).length,
    maxPairedYDifferencePx: paired.length ? Math.max(...paired.map(r => Math.abs(r[2] - rows.get(r[0])[2]))) : null,
    warningCausedResponse: null, interpretation: 'scripted policy behavioral contrast; not warning causality or human preference'};
}
module.exports = {VERSION, observe, compareInputs};
