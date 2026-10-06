'use strict';
// Adapter only: the accepted c005 compiler and its authenticated dependencies
// are vendored byte-for-byte. Duration and difficulty are benchmark metadata,
// never an unreported rewrite of the historical map.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const VENDOR = path.join(__dirname, 'vendor');
const provenance = require('./vendor/provenance.json');
const sha = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const EXCLUDED = new Set(['suction_core', 'push_pulse_core']);

function assertExcludedFree(value, at = '$') {
  // Match active_eligibility.py: recurse through actual mechanic descriptor
  // fields and embedded JSON. Policy exclusion lists/prose are not instances.
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (['mechanic_kind', 'mechanic', 'mechanics'].includes(key)) {
      const declared = typeof child === 'string' ? [child] : Array.isArray(child) ? child.filter(x => typeof x === 'string') : [];
      for (const kind of declared) if (EXCLUDED.has(kind)) throw Error(`Excluded mechanic at ${at}.${key}: ${kind}`);
    }
    assertExcludedFree(child, `${at}.${key}`);
  } else if (typeof value === 'string' && /^[\s]*[\[{]/.test(value)) {
    let parsed;
    try { parsed = JSON.parse(value); } catch (_) { return true; }
    assertExcludedFree(parsed, `${at}[embedded-json]`);
  }
  return true;
}

function verifyVendor() {
  for (const file of provenance.files) {
    if (sha(fs.readFileSync(path.join(VENDOR, 'c005', file.path))) !== file.sha256) throw Error(`Historical source changed: ${file.path}`);
  }
  if (sha(fs.readFileSync(path.join(VENDOR, provenance.runtime.path))) !== provenance.runtime.sha256) throw Error('Canonical runtime changed');
  return true;
}

function difficultyIndex(difficulty) {
  if (typeof difficulty === 'number' && Number.isFinite(difficulty) && difficulty >= 0 && difficulty <= 1) return difficulty < 1 / 3 ? 0 : difficulty < 2 / 3 ? 2 : 3;
  const index = { easy: 0, low: 0, medium: 2, normal: 2, hard: 3, high: 3 }[difficulty];
  if (index === undefined) throw Error('Difficulty must be easy/medium/hard or a nominal number in [0,1]');
  return index;
}

function generate({ seed, difficulty = 'medium', duration = 30, duration_s = duration, condition = null, request = null } = {}) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) throw Error('seed must be uint32');
  if (!Number.isFinite(duration_s) || duration_s < 30 || duration_s > 40 || Math.abs(Math.round(duration_s * 120) - duration_s * 120) > 1e-8) throw Error('Baseline prefix duration must be 30–40 seconds on the 120Hz grid');
  verifyVendor();
  const A = require('./vendor/c005/source/c005-laser-generator.cjs');
  const Briefs = require('./vendor/c005/source/c005-laser-briefs.cjs');
  const physicalCondition = condition ? { ...condition, seed } : { seed, y: 270, vy: 0, lead: 0, phase: 0, adjacency: 'none' };
  const nominalIndex = difficultyIndex(difficulty);
  const actualRequest = request || Briefs.request(nominalIndex);
  const envelope = A.compile(physicalCondition, actualRequest);
  if (envelope.sourceIdentity !== provenance.acceptedSourceIdentity || sha(envelope.map) !== envelope.mapHash) throw Error('c005 source/map authentication failed');
  assertExcludedFree(envelope.map);
  return {
    map: envelope.map,
    metadata: {
      schema: 'combo-map-old-baseline/1',
      seed, nominalDifficulty: difficulty, requestedDurationSeconds: duration_s,
      evaluationHorizonTicks: Math.round(duration_s * 120),
      generator: 'accepted-c005-unchanged', sourceIdentity: envelope.sourceIdentity,
      mapSHA256: envelope.mapHash, planSHA256: sha(envelope.plan),
      physicalCondition, request: actualRequest,
      selectedNormalForm: envelope.plan.selectedNormalForm,
      nativeDurationSeconds: 120, nativeDurationTicks: 14400,
      mapMutation: false, comparisonMode: 'same-seed-and-nominal-target-only',
      semanticMatch: false, calibratedDifficultyMatch: false,
      difficultyAdapter: 'Nominal easy/low/[0,1/3) -> original L; medium/normal/[1/3,2/3) -> LT; hard/high/[2/3,1] -> HLT. This is not a calibrated difficulty match.',
      limitations: [
        'The accepted generator has no 30–40s duration parameter. The complete 120s native map is retained and evaluated only through a real continuous prefix.',
        'Survival at the short horizon is not native won=true or evidence of completing the old whole-course obligations.',
        'Old and new generator semantics and encounter density differ. Paired seeds and nominal targets do not establish causal or calibrated-difficulty equivalence.',
        'A new ordinary route-aware controller is used in the batch, not the historical qualification controller or saved qualification tapes.'
      ]
    }
  };
}

module.exports = { generate, verifyVendor, assertExcludedFree, difficultyIndex, sha, provenance };

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const rawDifficulty = get('--difficulty', 'medium');
  const difficulty = /^\d*\.?\d+$/.test(rawDifficulty) ? Number(rawDifficulty) : rawDifficulty;
  const result = generate({ seed: Number(get('--seed', '1')), difficulty, duration: Number(get('--duration', '30')) });
  const out = get('--out', null);
  if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n'); }
  else process.stdout.write(JSON.stringify(result) + '\n');
}
