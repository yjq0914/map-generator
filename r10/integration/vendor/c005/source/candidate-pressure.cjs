'use strict';
// A pure, cumulative map transform. No evidence, panel, result, or seed lookup.
const Base = require('./generator.cjs');
const F = require('./vendor/engine/core.js');
const ParentConfig = require('./versions/g000-reference.json');
const SAME = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const EPS = 1e-8;
const fail = s => { throw Error('Pressure transform: ' + s); };

function validateConfig(config) {
  if (!config || config.algorithm !== 'stage-conditioned-aperture/1' ||
      typeof config.version !== 'string' || !config.version || config.phaseProgression !== true)
    fail('unsupported configuration');
  const r = config.relation, s = config.support;
  if (!r || r.componentsPerStage !== 4 ||
      !SAME(r.stageRoles, ['introduction', 'development', 'closure']) ||
      !Number.isFinite(r.introductionGapPx) || !Number.isFinite(r.decreasePerStagePx) ||
      r.decreasePerStagePx < 0 || r.seedVariationPx !== 0 ||
      r.minimumPhysicalGapPx !== 120 || r.minimumRadiusExpandedCoreWidthPx !== 100 ||
      !Array.isArray(r.physicalGapBoundsPx) || r.physicalGapBoundsPx.length !== 2 ||
      !r.physicalGapBoundsPx.every(Number.isFinite)) fail('invalid parameter relation');
  if (F.R !== 10) fail('unsupported player radius');
  const values = [0, 1, 2].map(stage => r.introductionGapPx - stage * r.decreasePerStagePx);
  const [lo, hi] = r.physicalGapBoundsPx;
  if (lo < 120 || hi > 200 || lo > hi || values.some(x => x < lo || x > hi || x - 2 * F.R < 100))
    fail('parameter support violates bounded aperture domain');
  if (!s || !SAME(s.levels, ['whole', 'stage']) || !SAME(s.stageIndices, [0, 1, 2]) ||
      !SAME(s.physicalGapValuesPx, values) ||
      !SAME(s.radiusExpandedCoreWidthValuesPx, values.map(x => x - 2 * F.R)))
    fail('declared finite support differs from executable relation');
  return values;
}

function collectPairs(map) {
  if (!map || map.height !== 540 || !Array.isArray(map.components) ||
      ![4, 12].includes(map.components.length)) fail('unsupported component domain');
  const ids = new Set(), pairs = new Map();
  for (const o of map.obstacles) {
    if (ids.has(o.id)) fail('duplicate obstacle id');
    ids.add(o.id);
    const q = /^c(\d+)-press-(\d+)-(top|bottom)$/.exec(o.id);
    if (!q) {
      if (o.id.includes('-press-')) fail('unrecognized mechanical pair id');
      continue;
    }
    const component = +q[1], gate = +q[2], side = q[3];
    if (!map.components[component] || map.components[component].theme !== 'mechanical' ||
        gate < 0 || gate > 2) fail('mechanical pair outside component relation');
    const key = `c${component}-press-${gate}`;
    if (!pairs.has(key)) pairs.set(key, {id: key, component, gate});
    pairs.get(key)[side] = o;
  }
  for (const [i, component] of map.components.entries()) {
    if (!['wave', 'mechanical'].includes(component.theme) || component.offset !== i * 1500)
      fail('unsupported component layout');
    if (component.theme === 'mechanical') {
      for (let j = 0; j < 3; j++) if (!pairs.has(`c${i}-press-${j}`)) fail('missing gate');
    }
  }
  if (!pairs.size) fail('no mechanical pairs');
  for (const p of pairs.values()) {
    const a = p.top, b = p.bottom;
    if (!a || !b || a.mechanic_kind !== 'vertical_armor_slider' || b.mechanic_kind !== a.mechanic_kind ||
        a.collider.shape !== 'rectangle' || b.collider.shape !== 'rectangle' ||
        a.x !== b.x || a.collider.w !== b.collider.w || a.collider.w < 2 * F.R ||
        a.interaction?.lethal !== true || b.interaction?.lethal !== true ||
        !a.motion || !SAME(a.motion, b.motion) || !SAME(a.timeline, b.timeline) || a.timeline !== null)
      fail('pair lacks synchronized lethal rectangle geometry');
    if (!Number.isFinite(a.motion.amplitude_px) || Math.abs(a.motion.amplitude_px) > 100 ||
        !Number.isFinite(a.motion.period_s) || a.motion.period_s <= 0 ||
        !Number.isFinite(a.motion.phase_rad)) fail('invalid inherited motion');
    const topEdge = a.y + a.collider.h, bottomEdge = b.y;
    if (![topEdge, bottomEdge, a.y, b.collider.h].every(Number.isFinite) || bottomEdge <= topEdge)
      fail('invalid parent aperture');
    // A synchronized pair is the only lethal body at its horizontal core. No
    // auxiliary/off-route object can fabricate the declared aperture contrast.
    if (map.obstacles.some(o => o !== a && o !== b &&
        o.x < a.x + a.collider.w && o.x + o.collider.w > a.x && o.interaction?.lethal !== false))
      fail('other geometry overlaps mechanical core');
  }
  return [...pairs.values()].sort((a, b) => a.component - b.component || a.gate - b.gate);
}

function transform(parentMap, config) {
  const values = validateConfig(config);
  // Clone first: the caller may still need the exact accepted parent map.
  const map = structuredClone(parentMap);
  const pairs = collectPairs(map), previousVersion = map.design?.generatorVersion ?? null;
  const changedComponents = new Map(), pairRecords = [];
  for (const p of pairs) {
    const a = p.top, b = p.bottom, stage = Math.floor(p.component / config.relation.componentsPerStage);
    const oldTopEdge = a.y + a.collider.h, oldBottomEdge = b.y;
    const center = (oldTopEdge + oldBottomEdge) / 2;
    const gap = values[stage], oldGap = oldBottomEdge - oldTopEdge;
    const topEdge = center - gap / 2, bottomEdge = center + gap / 2;
    const bottomAnchor = b.y + b.collider.h;
    // Change both inner edges by equal/opposite amounts; preserve outer anchors
    // and the complete shared moving-center function, including global phase.
    a.collider.h = topEdge - a.y;
    b.y = bottomEdge;
    b.collider.h = bottomAnchor - bottomEdge;
    const amplitude = Math.abs(a.motion.amplitude_px);
    if (a.collider.h <= 0 || b.collider.h <= 0 ||
        topEdge - amplitude < F.R || bottomEdge + amplitude > map.height - F.R)
      fail('transformed aperture outside supported vertical domain');
    if (Math.abs((a.y + a.collider.h + b.y) / 2 - center) > EPS ||
        Math.abs(b.y - a.y - a.collider.h - gap) > EPS) fail('aperture algebra failed');
    pairRecords.push({pairId: p.id, componentIndex: p.component, stageIndex: stage,
      role: config.relation.stageRoles[stage], parentPhysicalGapPx: oldGap,
      physicalGapPx: gap, nominalRadiusExpandedCoreWidthPx: gap - 2 * F.R,
      inheritedCenterY: center, inheritedMotion: structuredClone(a.motion)});
    if (Math.abs(gap - oldGap) > EPS) changedComponents.set(p.component, stage);
  }
  for (const [i, stage] of changedComponents) {
    const c = map.components[i];
    c.sourceRule = {ruleId: c.ruleId, ruleVersion: c.ruleVersion};
    c.ruleId = `${config.version}-mechanical-stage-${stage}`;
    c.ruleVersion = 1;
    c.geometryTransform = {algorithm: config.algorithm, version: config.version,
      empiricalParentRuleSupportInherited: false, qualification: 'unvalidated transformed geometry'};
  }
  const priorTransforms = map.design?.geometryTransforms || [];
  map.design = {...map.design, generatorVersion: config.version, components: map.components,
    referenceQualification: 'Stage-conditioned geometry transform. Historical parent rule evidence is provenance only and does not certify transformed geometry. Requires prospective finite physical validation.',
    generatorBatchTarget: true, stageRoles: [...config.relation.stageRoles],
    geometryTransforms: [...priorTransforms, {algorithm: config.algorithm, version: config.version,
      parentGeneratorVersion: previousVersion, relation: structuredClone(config.relation),
      empiricalParentRuleSupportInherited: false, qualification: 'static-only; physical evidence absent',
      pairedGateCount: pairs.length, changedComponentIndices: [...changedComponents.keys()]}],
    pressureProgram: {algorithm: config.algorithm, relation: structuredClone(config.relation),
      pairRecords, realizedExecutionEvidence: null,
      claimScope: 'Static synchronized-pair geometry only; not a trajectory, survival, recovery, readability, or human-fun claim'}};
  F.validate(map);
  return map;
}

function generate(config, e = {}, options = {}) {
  validateConfig(config);
  if (config.parent !== ParentConfig.version) fail('generator parent is not the accepted reference');
  const seed = e.seed ?? 20261004;
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) fail('seed must be unsigned32');
  return transform(Base.generate(ParentConfig, e, options), config);
}

module.exports = {generate, transform, validateConfig, collectPairs};
