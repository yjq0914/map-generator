'use strict';
const {request,action}=require('./c001-intent-briefs.cjs');
const a=action,r=request;
const pair=(actions,options={})=>r(actions,{...options,constraints:{minRecipes:2,maxRecipes:2,projectiles:'require',...options.constraints}});
const control=[
 {briefId:'control-coupled-early-pair',hypothesis:'J followed by T from the same exact B requires real continuous successor evidence',request:pair([a('maintain-side',0),a('cross-changing-gap',0),a('receive',0)])},
 {briefId:'control-separated-pair',hypothesis:'J and later H omit the aperture while preserving both requested action sites',request:pair([a('maintain-side',0),a('receive',1)])},
 {briefId:'control-retain-empty',hypothesis:'the empty subset is complete exact B',request:r([],{constraints:{minRecipes:0,maxRecipes:0}})},
 {briefId:'control-retain-moving',hypothesis:'single moving-boundary construction is physically unchanged',request:r([a('cross-moving-boundary',1),a('receive',1)],{constraints:{projectiles:'forbid'}})},
 {briefId:'control-retain-aperture',hypothesis:'single aperture construction is physically unchanged',request:r([a('cross-changing-gap',0),a('receive',0)],{constraints:{projectiles:'forbid'}})},
 {briefId:'control-retain-projectiles',hypothesis:'single warning projectile construction is physically unchanged',request:r([a('maintain-side',0),a('receive',0)],{constraints:{projectiles:'require'}})},
 {briefId:'control-retain-two',hypothesis:'the inherited non-projectile two-operator map is physically unchanged',request:r([a('cross-changing-gap',0),a('receive',1)],{constraints:{minRecipes:2,maxRecipes:2,projectiles:'forbid'}})},
 {briefId:'control-retain-three',hypothesis:'the inherited three-operator map is physically unchanged',request:r([a('maintain-side',0),a('cross-changing-gap',0),a('receive',1)],{constraints:{minRecipes:3,maxRecipes:3}})}
];
const explore=[
 {briefId:'explore-sparse-late-cover',hypothesis:'fewer-recipes tie-break selects sparse HJ rather than gratuitous HJT',request:pair([a('maintain-side',0),a('receive',1)],{constraints:{maxRecipes:3}})},
 {briefId:'explore-sparse-early-cover',hypothesis:'fewer-recipes tie-break selects sparse JT rather than gratuitous HJT',request:pair([a('maintain-side',0),a('cross-changing-gap',0)],{constraints:{maxRecipes:3}})},
 {briefId:'explore-dislike-aperture',hypothesis:'descriptor preference preserves HJ under a three-recipe allowance',request:pair([a('read-warning',0),a('cross-moving-boundary',1)],{theme:{apertureVariation:-5/13},constraints:{maxRecipes:3}})},
 {briefId:'explore-warning-cadence',hypothesis:'warning preference preserves JT without an unnecessary later hammer',request:pair([a('maintain-side',0),a('cross-changing-gap',0)],{theme:{warning:7/17},constraints:{maxRecipes:3}})},
 {briefId:'explore-late-two-receivers',hypothesis:'ordered two-stage receptions bind distinct J and H sites',request:pair([a('maintain-side',0),a('receive',0),a('receive',1)],{theme:{projectileRhythm:3/11}})},
 {briefId:'explore-early-time-bound',hypothesis:'real early encounter bounds exclude the late H site',request:pair([a('maintain-side',0),a('cross-changing-gap',0),a('receive',0)],{constraints:{encounterWindowSeconds:[0,40],maxRecipes:3}})},
 {briefId:'explore-separated-receptions',hypothesis:'actual receiver relation admits HJ and excludes the shared-aperture site',request:pair([a('maintain-side',0),a('receive',1)],{routeRelation:'separated-reception',theme:{periodicMotion:2/9},constraints:{maxRecipes:3}})},
 {briefId:'explore-mixed-early-theme',hypothesis:'combined descriptor preference remains a bounded structural criterion',request:pair([a('maintain-side',0),a('cross-changing-gap',0)],{theme:{warning:2/7,projectileRhythm:3/11,apertureVariation:5/13},constraints:{maxRecipes:3}})}
];
const holdoutDomain={actualValuesPresent:false,requestedCount:8,
 construction:'After semantic source and reducer freeze, create fresh six-field physical conditions and bounded request mixtures once, preserve failures without resampling.',
 strata:[{count:4,domain:'J early action followed by H stage1 action, budget2 or2..3; separated reception or aperture penalty; unseen continuous weights'},
 {count:4,domain:'J early action followed by T aperture, budget2 or2..3; early actual encounter window or nonnegative warning/aperture preferences; unseen continuous weights'}],
 limitation:'Two new subsets of three fixed-site operators, not arbitrary action language, temporal reordering, new mechanisms or human-fun qualification'};
module.exports={action,request,control,explore,holdoutDomain};
