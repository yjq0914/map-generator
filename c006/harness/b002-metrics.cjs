'use strict';

// Pure, versioned geometry adapter. It consumes the bodies recorded by the live
// runtime; it does not synthesize poses, import an engine, or advance physics.
// Rectangle-pair semantics and the existing statistical reducers stay frozen.
const legacy = require('./metrics.cjs');
const VERSION = 'semantic-actual-body-observation/b002-shape-clearance-1';
const finite = Number.isFinite;
const inactive = new Set(['cleared', 'idle', 'warning']);
const rectangleKinds = new Set([
  'fixed_armor_or_spike', 'vertical_armor_slider',
  'horizontal_armor_slider', 'phase_wall'
]);
const result = (status, fields = {}) => ({status, ...fields});

function diskSlice(x, cx, cy, radius) {
  const dx = Math.abs(x - cx);
  if (dx > radius) return null;
  const extent = Math.sqrt(Math.max(0, (radius - dx) * (radius + dx)));
  return [cy - extent, cy + extent];
}

function circleSlice(x, body, r = legacy.RADIUS) {
  if (!body || ![x, r, body.x, body.y, body.w, body.h].every(finite) ||
      r < 0 || body.w <= 0 || body.h !== body.w) {
    throw Error('Invalid actual circle slice');
  }
  // F.bounds/body semantics: x/y are the disk bounding-box top-left, not center.
  return diskSlice(x, body.x + body.w / 2, body.y + body.h / 2, body.w / 2 + r);
}

function capsuleSlice(x, body, r = legacy.RADIUS) {
  if (!body || ![x, r, body.x, body.y, body.x2, body.y2, body.width].every(finite) ||
      r < 0 || body.width < 0) {
    throw Error('Invalid actual capsule slice');
  }
  // A runtime segment is a swept disk along endpoints, not an x/y/w/h box.
  // Its w/h may be zero and x2/y2 may lie before x/y.
  const radius = body.width / 2 + r;
  const dx = body.x2 - body.x, dy = body.y2 - body.y;
  const length = Math.hypot(dx, dy);
  if (!finite(length) || !finite(radius)) throw Error('Invalid capsule extent');
  if (length === 0) return diskSlice(x, body.x, body.y, radius);
  if (x < Math.min(body.x, body.x2) - radius ||
      x > Math.max(body.x, body.x2) + radius) return null;

  // Exact capsule = endpoint disks union the oriented central rectangle.
  // Intersect its two linear inequalities with the requested vertical line:
  //   0 <= dot(point - start, unit-axis) <= length
  //  -R <= dot(point - start, unit-normal) <= R.
  // No polygon tessellation, AABB substitution, pose sampling, or root search.
  const ux = dx / length, uy = dy / length, localX = x - body.x;
  let lo = -Infinity, hi = Infinity, intersects = true;
  function intersect(coefficient, constant, lower, upper) {
    if (coefficient === 0) {
      if (constant < lower || constant > upper) intersects = false;
      return;
    }
    const a = (lower - constant) / coefficient;
    const b = (upper - constant) / coefficient;
    lo = Math.max(lo, Math.min(a, b));
    hi = Math.min(hi, Math.max(a, b));
  }
  intersect(uy, ux * localX, 0, length);
  intersect(ux, -uy * localX, -radius, radius);
  const slices = [diskSlice(x, body.x, body.y, radius),
    diskSlice(x, body.x2, body.y2, radius)].filter(Boolean);
  if (intersects && lo <= hi) slices.push([body.y + lo, body.y + hi]);
  if (!slices.length) return null;
  // The capsule is convex, so its nonempty vertical slice is one interval.
  return [Math.min(...slices.map(s => s[0])), Math.max(...slices.map(s => s[1]))];
}

function geometryIssue(body) {
  const keys = body.shape === 'segment' ? ['x', 'y', 'x2', 'y2', 'width'] : ['x', 'y', 'w', 'h'];
  if (keys.some(k => body[k] === undefined || body[k] === null)) return 'missing';
  if (!keys.every(k => finite(body[k]))) return 'invalid';
  if (body.shape === 'segment') return body.width < 0 ? 'invalid' : null;
  if (body.w <= 0 || body.h <= 0 || body.shape === 'circle' && body.w !== body.h) return 'invalid';
  return null;
}

function runtimeBounds(body) {
  // Same geometry meanings as F.bounds; recompute from recorded body fields,
  // never trust a stale cached bounds object. This function is pure.
  if (body.shape === 'segment') {
    return {minX: Math.min(body.x, body.x2) - body.width / 2,
      maxX: Math.max(body.x, body.x2) + body.width / 2,
      minY: Math.min(body.y, body.y2) - body.width / 2,
      maxY: Math.max(body.y, body.y2) + body.width / 2};
  }
  return {minX: body.x, maxX: body.x + body.w,
    minY: body.y, maxY: body.y + body.h};
}

function clearance(map, state, bodies, r = legacy.RADIUS) {
  const base = {tick: state?.tick ?? null, x: state?.x ?? null,
    y: state?.y ?? null, width: null, margin: null};
  if (!map || !state) return result('missing', {...base, reason: 'actual-state-or-world-missing'});
  if (state.alive === false) return result('censored', {...base, reason: 'dead-at-sample'});
  if (state.alive === undefined || map.height === undefined) {
    return result('missing', {...base, reason: 'actual-state-or-world-fields-missing'});
  }
  if (state.alive !== true || ![state.x, state.y, state.tick, map.height, r].every(finite) ||
      r < 0 || map.height <= 2 * r || state.y < r || state.y > map.height - r) {
    return result('invalid', {...base, reason: 'invalid-state-or-world-bounds'});
  }
  if (!Array.isArray(bodies)) return result('missing', {...base, reason: 'actual-bodies-missing'});
  if (bodies.some(b => !b || typeof b !== 'object' || Array.isArray(b))) {
    return result('invalid', {...base, reason: 'invalid-actual-body-record'});
  }
  // Preserve the exact historical rectangle result, including its applicability
  // policy and field shape. The new adapter does not rewrite old evidence.
  if (bodies.every(b => b.shape === 'rectangle')) return legacy.clearance(map, state, bodies, r);
  const ids = new Set(), near = [], slices = [];
  for (const body of bodies) {
    if (body.id === undefined || body.id === null) {
      return result('missing', {...base, reason: 'actual-body-id-missing'});
    }
    if (ids.has(body.id)) return result('invalid', {...base, reason: 'duplicate-actual-body'});
    ids.add(body.id);
    // Ignore neutralized/nonlethal bodies and the same inactive states ignored
    // by live collision. A phase label alone must not override lethal/status.
    if (body.lethal === false || inactive.has(body.status)) continue;
    if (body.lethal === undefined || body.status === undefined) {
      return result('missing', {...base, reason: 'actual-body-activity-missing', bodyId: body.id});
    }
    if (body.lethal !== true || typeof body.status !== 'string') {
      return result('invalid', {...base, reason: 'invalid-actual-body-activity', bodyId: body.id});
    }
    const supported = body.shape === 'circle' || body.shape === 'segment' ||
      body.shape === 'rectangle' && rectangleKinds.has(body.kind);
    if (!supported) {
      const bounds = runtimeBounds(body);
      if (finite(bounds.minX) && finite(bounds.maxX) && bounds.maxX >= bounds.minX &&
          (bounds.minX > state.x + r || bounds.maxX < state.x - r)) continue;
      return result('unsupported', {...base, reason: 'nearby-lethal-unsupported-shape-or-rectangle-kind', bodyId: body.id});
    }
    const issue = geometryIssue(body);
    if (issue) return result(issue, {...base, reason: issue + '-actual-' + body.shape, bodyId: body.id});
    const bounds = runtimeBounds(body);
    if (!Object.values(bounds).every(finite)) {
      return result('invalid', {...base, reason: 'nonfinite-actual-body-bounds', bodyId: body.id});
    }
    if (bounds.minX > state.x + r || bounds.maxX < state.x - r) continue;
    let slice;
    try {
      slice = body.shape === 'circle' ? circleSlice(state.x, body, r) :
        body.shape === 'segment' ? capsuleSlice(state.x, body, r) : legacy.rectangleSlice(state.x, body, r);
    } catch {
      return result('invalid', {...base, reason: 'invalid-actual-shape-slice', bodyId: body.id});
    }
    if (slice && !slice.every(finite)) {
      return result('invalid', {...base, reason: 'nonfinite-actual-shape-slice', bodyId: body.id});
    }
    near.push(body);
    if (slice) slices.push([Math.max(r, slice[0]), Math.min(map.height - r, slice[1])]);
  }
  const spans = legacy.merge(slices), free = [];
  let lower = r;
  for (const [a, b] of spans) {
    if (a > lower) free.push([lower, a]);
    lower = Math.max(lower, b);
  }
  if (lower < map.height - r) free.push([lower, map.height - r]);
  const overlap = spans.some(([a, b]) => state.y >= a && state.y <= b);
  const interval = overlap ? null : free.find(([a, b]) => state.y >= a && state.y <= b);
  return interval ? result('observed', {...base, width: interval[1] - interval[0],
    margin: Math.min(state.y - interval[0], interval[1] - state.y),
    lowerY: interval[0], upperY: interval[1], activeBodyIds: near.map(b => b.id),
    activeRectangleIds: near.filter(b => b.shape === 'rectangle').map(b => b.id)}) :
    result('invalid', {...base, reason: 'actual-center-overlaps-radius-expanded-lethal-body'});
}

function measure(input) {
  const measured = legacy.measure(input);
  return {...measured, schema: VERSION, method: {...measured.method,
    clearance: 'Exact bird-radius-expanded vertical slices of actual runtime rectangles, circles, and segment capsules; rectangle applicability unchanged; active lethal bodies only',
    geometry: 'Circle x/y are bounding-box top-left with w=h. Segment x/y and x2/y2 are endpoints with width; reversed, axial, and zero-length endpoints supported',
    pairCore: measured.method.pairCore + '; rectangle pairs only, unchanged legacy reducer',
    baseReducerSchema: legacy.VERSION}};
}

module.exports = {...legacy, VERSION, LEGACY_VERSION: legacy.VERSION,
  circleSlice, capsuleSlice, segmentSlice: capsuleSlice, runtimeBounds,
  clearance, measure};
