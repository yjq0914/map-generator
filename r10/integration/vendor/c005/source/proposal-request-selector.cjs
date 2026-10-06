'use strict';
// Request semantics copied unchanged from c001; selector now enumerates the power
// set and delegates construction to the edit algebra, never to a normal-form producer.
const same = require('node:util').isDeepStrictEqual;
const crypto = require('node:crypto');
const F = require('./vendor/engine/core.js');
const clone = structuredClone;
const hash = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const need = (x,s) => { if(!x) throw Error('Recipe request: '+s); };
const CONFIG = {requestSchema:'flappy-action-theme-request/1'};
const ACTIONS = Object.freeze(['maintain-side', 'read-warning', 'cross-moving-boundary', 'cross-changing-gap', 'change-side', 'receive']);
const AXES = Object.freeze(['warning', 'periodicMotion', 'projectileRhythm', 'apertureVariation']);
const ROUTES = Object.freeze(['preserve-both', 'shared-reception', 'separated-reception']);
function keys(x, names, label) {
  need(x && typeof x === 'object' && !Array.isArray(x) && same(Object.keys(x).sort(), [...names].sort()), label + ' has missing/unknown fields');
}
function normalizeRequest(request) {
  keys(request, ['schema', 'plannedActions', 'routeRelation', 'theme', 'constraints'], 'request');
  need(request.schema === CONFIG.requestSchema, 'unsupported request schema');
  need(Array.isArray(request.plannedActions) && request.plannedActions.length <= 12, 'at most twelve ordered planned actions required');
  for (const a of request.plannedActions) {
    keys(a, ['kind', 'stage'], 'planned action');
    need(ACTIONS.includes(a.kind), 'unsupported action: ' + a.kind);
    need(a.stage === 'any' || [0, 1, 2].includes(a.stage), 'unsupported action stage');
  }
  need(ROUTES.includes(request.routeRelation), 'unsupported route relation');
  keys(request.theme, AXES, 'theme');
  for (const k of AXES) need(Number.isFinite(request.theme[k]) && request.theme[k] >= -1 && request.theme[k] <= 1, 'theme weight outside [-1,1]: ' + k);
  const c = request.constraints;
  keys(c, ['minRecipes', 'maxRecipes', 'projectiles', 'encounterWindowSeconds'], 'constraints');
  need(Number.isInteger(c.minRecipes) && Number.isInteger(c.maxRecipes) && 0 <= c.minRecipes && c.minRecipes <= c.maxRecipes && c.maxRecipes <= 3, 'recipe cardinality outside qualified frontier');
  need(['allow', 'forbid', 'require'].includes(c.projectiles), 'unsupported projectile constraint');
  need(Array.isArray(c.encounterWindowSeconds) && c.encounterWindowSeconds.length === 2 && c.encounterWindowSeconds.every(Number.isFinite) && c.encounterWindowSeconds[0] >= 0 && c.encounterWindowSeconds[1] <= 120 && c.encounterWindowSeconds[0] < c.encounterWindowSeconds[1], 'invalid encounter window');
  return clone(request);
}
const secs = (m, x) => (x - m.initial_player.x) / F.VX;
function event(recipe, componentIndex, stage, kind, seconds, bodyIds, relation) {
  return { recipe, componentIndex, stage, kind, nominalSeconds: seconds, bodyIds: clone(bodyIds), structuralRelation: relation, scope: 'planned route/geometry event; actual action unmeasured' };
}
function summarizeSite(m, recipe, patch) {
  let componentIndex, source, receiver, routeFacts, window, events;
  if (recipe === 'H') {
    const p = patch.phrase;
    componentIndex = p.owner.componentIndex; source = patch.after; receiver = p.receiver;
    routeFacts = p.routeFacts.map(q => ({ route: q.route, sourceSide: q.source.side, receiverSide: q.receiver.side }));
    window = [secs(m, patch.effects.hammerProgram.wholeBodySweepX[0]), secs(m, receiver.x + receiver.collider.w + F.R)];
    const t = patch.effects.hammerProgram.nominalPivotCrossingSeconds;
    events = [['cross-moving-boundary', t, [source.id, source.id + ':arm']], ['change-side', secs(m, receiver.x - F.R), [receiver.id]], ['receive', window[1], [receiver.id]]];
  } else if (recipe === 'T') {
    const p = patch.phrase;
    componentIndex = p.componentIndex; source = patch.after; receiver = p.receivers[1].descriptor;
    routeFacts = p.receivers[0].routeFacts.map(q => ({ route: q.route, sourceSide: q.side === 'above' ? 'upper' : 'lower', receiverSide: p.receivers[1].routeFacts.find(z => z.route === q.route).side === 'above' ? 'upper' : 'lower' }));
    window = [source.timeline.start_s, secs(m, receiver.x + receiver.collider.w + F.R)];
    events = [['read-warning', source.timeline.start_s, patch.apertureProgram.runtimeBodyIds], ['cross-changing-gap', patch.apertureProgram.nominalCenterCrossingSeconds, patch.apertureProgram.runtimeBodyIds], ['change-side', secs(m, receiver.x - F.R), [receiver.id]], ['receive', window[1], [receiver.id]]];
  } else {
    const p = patch.effects.program.phrase;
    componentIndex = p.componentIndex; source = patch.after; receiver = p.receiver;
    routeFacts = p.routeFacts.map(q => ({ route: q.route, previousSide: q.previous.side, sourceSide: q.source.side, receiverSide: q.receiver.side }));
    window = [secs(m, p.previous.x - F.R), secs(m, receiver.x + receiver.collider.w + F.R)];
    events = [['maintain-side', secs(m, p.previous.x + p.previous.collider.w / 2), [p.previous.id, source.id]], ['read-warning', patch.effects.program.warning.startSeconds, [source.id]], ['cross-moving-boundary', patch.effects.program.nominalCoreSeconds, [source.id, ...patch.effects.program.expectedShots.map(s => s.id)]], ['change-side', secs(m, receiver.x - F.R), [receiver.id]], ['receive', window[1], [receiver.id]]];
  }
  need(routeFacts.length === 2 && routeFacts.every(q => q.sourceSide !== q.receiverSide), 'source and receiver do not establish two-route reversal');
  const stage = Number(m.components[componentIndex].stageId);
  const relation = routeFacts[0].receiverSide === routeFacts[1].receiverSide ? 'shared-reception' : 'separated-reception';
  const properties = {
    warning: Number((source.timeline?.warning_s || 0) > 0),
    periodicMotion: Number((source.motion?.period_s || 0) > 0 || (source.timeline?.opening_s || 0) > 0),
    projectileRhythm: Number((source.timeline?.count || 0) > 1 && source.mechanic_kind === 'burst_turret'),
    apertureVariation: Number((source.timeline?.opening_s || 0) > 0 && (source.timeline?.closing_s || 0) > 0 && (source.motion?.opening_px || 0) > 0)
  };
  need(window.every(Number.isFinite) && window[0] < window[1], 'invalid structural encounter bounds');
  return { recipe, componentIndex, stage, currentSourceId: source.id, currentSourceX: source.x, receiverId: receiver.id, receiverX: receiver.x, routeRelation: relation, routeFacts, encounterWindowSeconds: window, properties, patchHash: hash(patch), componentHash: hash(m.components[componentIndex]), sourceDescriptorHash: hash(source), receiverDescriptorHash: hash(receiver), events: events.map(e => event(recipe, componentIndex, stage, ...e, relation)), physicalQualification: 'inherited finite recipe evidence only; new request selection pending', humanFun: null };
}
function matchActions(actions, events) {
  const matches = [];
  let after = -1;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const j = events.findIndex((ev, j) => j > after && ev.kind === a.kind && (a.stage === 'any' || ev.stage === a.stage));
    if (j < 0) return { matched: false, failure: 'ordered action ' + i + ' unmatched: ' + a.kind + '@' + a.stage, matches };
    after = j; matches.push({ requestActionIndex: i, eventIndex: j, event: clone(events[j]) });
  }
  return { matched: true, matches };
}
function evaluateForm(form, f, request) {
  const sites = form.recipes.map(r => f.sites[r]);
  const c = request.constraints, reasons = [];
  if (sites.length < c.minRecipes || sites.length > c.maxRecipes) reasons.push('recipe-count');
  const hasProjectiles = sites.some(s => s.properties.projectileRhythm > 0);
  if ((c.projectiles === 'forbid' && hasProjectiles) || (c.projectiles === 'require' && !hasProjectiles)) reasons.push('projectile-policy');
  if (request.routeRelation !== 'preserve-both' && (!sites.length || sites.some(s => s.routeRelation !== request.routeRelation))) reasons.push('route-relation');
  if (sites.some(s => s.encounterWindowSeconds[0] < c.encounterWindowSeconds[0] || s.encounterWindowSeconds[1] > c.encounterWindowSeconds[1])) reasons.push('actual-encounter-window');
  const events = sites.flatMap(s => s.events).sort((a, b) => a.nominalSeconds - b.nominalSeconds || a.recipe.localeCompare(b.recipe));
  const match = matchActions(request.plannedActions, events);
  if (!match.matched) reasons.push(match.failure);
  const profile = Object.fromEntries(AXES.map(axis => [axis, sites.length ? sites.reduce((n, s) => n + s.properties[axis], 0) / sites.length : 0]));
  const score = AXES.reduce((n, axis) => n + profile[axis] * request.theme[axis], 0);
  return { key: form.key, recipes: clone(form.recipes), eligible: reasons.length === 0, reasons, themeProfile: profile, themeScore: score, actionMatches: match.matches, events };
}

function select(forms,f,request,admitted) {
  const normalized=normalizeRequest(request);
  const candidates=forms.map(form=>{
    const p=evaluateForm(form,f,normalized);
    if(!admitted(form)){p.eligible=false;p.reasons.push('unqualified-combination');}
    return p;
  });
  const eligible=candidates.filter(p=>p.eligible).sort((a,b)=>b.themeScore-a.themeScore||a.recipes.length-b.recipes.length||a.key.localeCompare(b.key));
  need(eligible.length,'unsupported brief; '+candidates.map(p=>p.key+'='+p.reasons.join('|')).join(';'));
  const winner=eligible[0];
  return {schema:'disjoint-recipe-request-plan/1',request:normalized,requestHash:hash(normalized),selectedNormalForm:winner.key,selectedRecipes:clone(winner.recipes),selectedSites:winner.recipes.map(r=>clone(f.sites[r])),actionMatches:clone(winner.actionMatches),themeProfile:clone(winner.themeProfile),themeScore:winner.themeScore,proposalCount:forms.length,eligibleCount:eligible.length,candidates:candidates.map(({events,...p})=>p),qualification:{plannedActionSemantics:true,observedActions:null,actualThemePerception:null,humanFun:null}};
}
module.exports={ACTIONS,AXES,ROUTES,normalizeRequest,summarizeSite,select};
