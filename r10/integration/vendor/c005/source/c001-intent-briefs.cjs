'use strict';
// Public, result-independent requests only. A separate reviewer creates actual
// fresh holdout values after the semantic source/evaluator freeze.
const action = (kind, stage = 'any') => ({ kind, stage });
function request(actions, options = {}) {
  return { schema: 'flappy-action-theme-request/1', plannedActions: actions.map(x => typeof x === 'string' ? action(x) : x), routeRelation: options.routeRelation || 'preserve-both', theme: { warning: 0, periodicMotion: 0, projectileRhythm: 0, apertureVariation: 0, ...options.theme }, constraints: { minRecipes: 1, maxRecipes: 1, projectiles: 'allow', encounterWindowSeconds: [0, 120], ...options.constraints } };
}
const control = [
  { briefId: 'control-moving-separate', hypothesis: 'same generic moving-boundary request selects a no-warning periodic recipe', request: request(['cross-moving-boundary', 'change-side', 'receive'], { routeRelation: 'separated-reception', theme: { periodicMotion: 1, warning: -1 } }) },
  { briefId: 'control-shared-aperture', hypothesis: 'actual same-side receiver agreement forces shared geometry', request: request(['cross-changing-gap', 'receive'], { routeRelation: 'shared-reception' }) },
  { briefId: 'control-warning-reversal', hypothesis: 'warning plus separated receiver sides selects moving projectiles', request: request(['read-warning', 'change-side', 'receive'], { routeRelation: 'separated-reception' }) },
  { briefId: 'control-gap-then-middle', hypothesis: 'ordered actions in two stages require a qualified two-recipe program', request: request([action('cross-changing-gap', 0), action('cross-moving-boundary', 1), action('receive', 1)], { constraints: { minRecipes: 2, maxRecipes: 2, projectiles: 'forbid' } }) },
  { briefId: 'control-three-stage-events', hypothesis: 'three distinct requested events select the qualified three-recipe program', request: request(['maintain-side', 'cross-changing-gap', action('cross-moving-boundary', 1), action('receive', 1)], { constraints: { minRecipes: 3, maxRecipes: 3 } }) },
  { briefId: 'control-periodic-motion', hypothesis: 'theme is a descriptor preference rather than a style lookup', request: request(['change-side', 'receive'], { theme: { periodicMotion: 1, apertureVariation: -1, warning: -1 } }) },
  { briefId: 'control-telegraphed-gap', hypothesis: 'same broad action brief responds to measured source descriptor axes', request: request(['change-side', 'receive'], { theme: { warning: 0.5, apertureVariation: 1, projectileRhythm: -0.5 } }) },
  { briefId: 'control-pulsed-projectiles', hypothesis: 'same broad action brief changes actual mechanic content under theme preference', request: request(['change-side', 'receive'], { theme: { projectileRhythm: 1, periodicMotion: -0.5 } }) }
];
const explore = [
  { briefId: 'explore-later-moving', hypothesis: 'actual encounter window rules out early projectiles', request: request(['cross-moving-boundary', 'receive'], { constraints: { encounterWindowSeconds: [40, 80] } }) },
  { briefId: 'explore-early-moving', hypothesis: 'same action with early time constraint uses actual site timing', request: request(['cross-moving-boundary', 'receive'], { constraints: { encounterWindowSeconds: [0, 10] } }) },
  { briefId: 'explore-first-stage-warning', hypothesis: 'shared route constraints override a preference for projectiles', request: request([action('read-warning', 0), action('receive', 0)], { routeRelation: 'shared-reception', theme: { projectileRhythm: 1 } }) },
  { briefId: 'explore-middle-only', hypothesis: 'stage binding overrides an early-warning preference', request: request([action('cross-moving-boundary', 1), action('receive', 1)], { theme: { warning: 1 } }) },
  { briefId: 'explore-ordered-double-receive', hypothesis: 'repeated action tokens bind separate chronological events', request: request([action('receive', 0), action('receive', 1)], { constraints: { minRecipes: 2, maxRecipes: 2, projectiles: 'forbid' } }) },
  { briefId: 'explore-minimal-extra-closure', hypothesis: 'action coverage may need a qualified superset when two-operator subset lacks evidence', request: request(['maintain-side', action('receive', 1)], { constraints: { minRecipes: 2, maxRecipes: 3, projectiles: 'require' } }) },
  { briefId: 'explore-weighted-balance', hypothesis: 'fractional preference weights are not names of whole-map styles', request: request(['change-side', 'receive'], { theme: { warning: 2 / 7, periodicMotion: 5 / 11, projectileRhythm: -3 / 13, apertureVariation: 1 / 17 } }) },
  { briefId: 'explore-input-order-closure', hypothesis: 'warn then gap then late reception uses chronological actual sites', request: request(['read-warning', 'cross-changing-gap', action('receive', 1)], { constraints: { minRecipes: 2, maxRecipes: 3 }, theme: { projectileRhythm: -0.25 } }) }
];
const holdoutDomain = {
  actualValuesPresent: false,
  requestedCount: 8,
  construction: 'Reviewer supplies new physical six-field conditions and new continuous preference mixtures after freeze; no test identity enters generator.',
  strata: [
    { count: 2, domain: 'Generic change-side -> receive; novel fractional theme weights; one separates warning preference from periodic preference' },
    { count: 2, domain: 'Moving-boundary -> receive; unseen supported actual time-window bounds within [0,10] or [40,80]; never choose bounds from trial outcomes' },
    { count: 1, domain: 'Shared reception with conflicting projectile preference; actual route constraint must dominate' },
    { count: 1, domain: 'Gap crossing stage0 -> moving boundary stage1 -> receive, budget2 and no projectiles' },
    { count: 1, domain: 'Maintain-side -> gap crossing -> middle receive, budget3, new theme mixture' },
    { count: 1, domain: 'Maintain-side -> middle receive, budget2..3; qualified closure chooses 3 rather than unqualified J+H subset' }
  ],
  limitation: 'New combinations of bounded request fields, not open natural-language intent or arbitrary physical compositions; preserve generation failures in denominator.'
};
module.exports = { action, request, control, explore, holdoutDomain };
