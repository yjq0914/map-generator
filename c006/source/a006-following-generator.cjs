'use strict';
// NEW explicitly selected a006 branch. Accepted parent is recovery-cumulative-v1.
// No dispatcher, acceptance pointer, evidence lookup, engine execution or fallback.
// Immutable runtime closure MUST include design/following-gate-post-length.cjs
// (d71001cc4f6ef83f2672026b8fada39f76ee01c7849705156362ffe8c59f2ab5)
// and design/following-observations-v2.cjs
// (954d7defac987d0760584df7273c703d9a90ff10af43c298f75c7e05659617ff).
const {isDeepStrictEqual: same}=require('node:util');
const Parent=require('./recovery-generator.cjs');
const Canonical=require('./recovery-canonical.cjs');
const Following=require('../design/following-gate-post-length.cjs');
const F=require('./vendor/engine/core.js');
const VERSION='a006-following-v1';
const INPUT_KEYS=Object.freeze(['seed','y','vy','lead','phase','adjacency']);
const clone=structuredClone;
const check=(yes,message)=>{if(!yes)throw Error('A006 following: '+message);};
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x);}return x;}
const CONFIG=deepFreeze(require('./configs/a006-following-v1.json'));
const PARENT_CONFIG=deepFreeze({...clone(CONFIG),profile:'accepted-parent',operation:null});
const FROZEN_CONFIG=deepFreeze(require('./configs/a006-following-frozen-v1.json'));
check(same(FROZEN_CONFIG,{...clone(CONFIG),profile:'following-both-body-frozen'}),'frozen profile must exactly match the nominal construction recipe');
const PROFILES=deepFreeze({'accepted-parent':PARENT_CONFIG,'following-nominal':CONFIG,'following-both-body-frozen':FROZEN_CONFIG});
const PROFILE_NAMES=Object.freeze(Object.keys(PROFILES));
function entry(input={}){
 check(input&&typeof input==='object'&&!Array.isArray(input),'entry must be an object');
 // Never enumerate input or access condition ID, group, result, test ID, route,
 // profile, or any other experimental field. Only these six physical values enter.
 const physical=Object.fromEntries(INPUT_KEYS.map(k=>[k,input[k]]));
 for(const k of INPUT_KEYS)check(physical[k]!==null,'entry '+k+' must not be null');
 const e=Canonical.entry(physical);
 for(const [k,lo,hi]of [['y',245,300],['vy',-65,65],['lead',-20,20],['phase',-.45,.45]])check(e[k]>=lo&&e[k]<=hi,'entry '+k+' outside support');
 return e;
}
function profileConfig(config){
 check(config&&typeof config==='object'&&!Array.isArray(config),'explicit profile configuration required');
 check(Object.hasOwn(PROFILES,config.profile)&&same(config,PROFILES[config.profile]),'unknown or changed profile/configuration; new version required');
 return PROFILES[config.profile];
}
function descriptorDelta(before,after,ids,mode){
 check(Array.isArray(ids)&&ids.length===2&&new Set(ids).size===2,'exactly two selected source IDs required');
 check(before.obstacles.length===after.obstacles.length,'obstacle count changed');
 const changed=[];
 for(let i=0;i<before.obstacles.length;i++){
  const a=before.obstacles[i],b=after.obstacles[i];
  check(a.id===b.id,'descriptor order or identity changed');
  if(!same(a,b))changed.push(a.id);
  if(!ids.includes(a.id)){check(same(a,b),'unselected descriptor changed');continue;}
  const aa=clone(a),bb=clone(b);
  for(const k of ['x','mechanic_kind','motion']){delete aa[k];delete bb[k];}
  check(same(aa,bb),'selected collider, aperture, y, interaction, or other descriptor field changed');
  check(b.mechanic_kind===(mode==='moving'?'horizontal_armor_slider':'fixed_armor_or_spike'),'wrong selected descriptor kind');
  check(mode==='moving'?b.motion!==null:b.motion===null,'wrong selected descriptor motion');
 }
 check(same(changed.slice().sort(),ids.slice().sort()),'must change both selected descriptors and no others');
 const [a,b]=ids.map(id=>after.obstacles.find(o=>o.id===id));
 check(a&&b&&a.x===b.x&&a.collider.w===b.collider.w&&same(a.motion,b.motion),'pair is not synchronized');
 return changed;
}
function preservedParent(parent,moving){
 const p=moving.design.followingGateProgram,t=p?.target;
 check(p?.schema===Following.VERSION&&same(p.operation,CONFIG.operation),'operator recipe mismatch');
 check(t&&t.previousDescriptors?.length===2,'target provenance missing');
 const ids=[t.topId,t.bottomId];descriptorDelta(parent,moving,ids,'moving');
 for(const k of Object.keys(parent))if(!['obstacles','components','design'].includes(k))check(same(parent[k],moving[k]),'parent top-level field changed: '+k);
 check(same(Object.keys(parent).sort(),Object.keys(moving).sort()),'top-level schema changed');
 for(const k of Object.keys(parent.design))if(!['components','qualification'].includes(k))check(same(parent.design[k],moving.design[k]),'inherited design changed: '+k);
 check(same(Object.keys(moving.design).filter(k=>!['followingGateProgram','legacyPressureApplicability'].includes(k)).sort(),Object.keys(parent.design).sort()),'unexpected design field change');
 check(moving.components.length===parent.components.length,'component count changed');
 for(let i=0;i<parent.components.length;i++){
  const c=clone(moving.components[i]);
  if(i===t.componentIndex){
   const r=c.relations.pop();
   check(r?.type==='recovery-following-horizontal-pair'&&same(r.sourceIds,ids),'missing single explicit following relation');
  }
  check(same(c,parent.components[i]),'inherited component or relation changed');
 }
 check(same(moving.design.components,moving.components),'component alias mismatch');
 check(same(t.previousDescriptors,ids.map(id=>parent.obstacles.find(o=>o.id===id))),'previous descriptors are not final post-length parent');
 return ids;
}
function label(map,profile,ids){
 map.id=map.mapId=VERSION+'-'+profile+'-'+map.seed;
 map.design.generatorVersion=VERSION;
 map.design.a006FollowingExperiment={
  schema:'a006-following-experiment/1',version:VERSION,profile,
  constructionParent:'recovery-cumulative-v1',activation:'explicit profile only',
  inputFields:[...INPUT_KEYS],selectedSourceIds:[...ids],
  selectedPairId:map.design.followingGateProgram.target.pairId,
  coordinateEpoch:'final-post-length',inheritedOrderAndLengthUnchanged:true,routesUnchanged:true,
  actualDescriptorTreatment:profile==='following-nominal'?'synchronized-horizontal-motion':'both-body-frozen-at-authored-center',
  followingProgramRole:'construction provenance; inspect current descriptors for actual treatment',
  qualification:'new unpublished a006 candidate/control; physical qualification is external, not inherited'
 };
 map.design.qualification='Explicit a006 '+profile+'; no inherited following physical qualification';
 return map;
}
function generateParent(input={}){return Parent.generate(Parent.CONFIG,entry(input));}
function generateNominalMoving(input={}){
 const e=entry(input),parent=Parent.generate(Parent.CONFIG,e);
 // A rejection is propagated. No catch, alternative pair, or parent fallback.
 const moving=Following.applyPostLength(parent,e,CONFIG.operation);
 const ids=preservedParent(parent,moving);
 label(moving,'following-nominal',ids);F.validate(moving);return moving;
}
function freezeChecked(moving){
 const frozen=clone(moving),t=frozen.design.followingGateProgram.target,ids=[t.topId,t.bottomId];
 for(const id of ids){
  const body=frozen.obstacles.find(o=>o.id===id);
  check(body&&body.mechanic_kind==='horizontal_armor_slider','nominal selected body missing');
  body.x=t.authoredCenterX-body.collider.w/2;
  body.mechanic_kind='fixed_armor_or_spike';body.motion=null;
 }
 const changed=descriptorDelta(moving,frozen,ids,'frozen');
 // No route, component, relation, entry, collider or timing edits in the control.
 for(const k of Object.keys(moving))if(k!=='obstacles')check(same(moving[k],frozen[k]),'control changed geometry or metadata before labelling');
 label(frozen,'following-both-body-frozen',ids);
 frozen.design.a006FollowingExperiment.comparison={
  schema:'matched-both-body-frozen-at-authored-center/1',
  nominalProfile:'following-nominal',changedSourceIds:changed,
  frozenCenterX:t.authoredCenterX,freezeBothBodies:true,
  allowedDescriptorChanges:['x','mechanic_kind','motion'],
  routeClockReset:false,parentAxisSubstitutionIsSeparate:true,
  inheritedNominalPredictionsAreConstructionOnly:true
 };
 F.validate(frozen);return frozen;
}
function freezeNominalMoving(moving,input={}){
 const expected=generateNominalMoving(input);
 check(same(moving,expected),'comparison input is not canonical nominal moving output');
 return freezeChecked(moving);
}
function generateFrozenComparison(input={}){return freezeChecked(generateNominalMoving(input));}
function authenticateFrozenComparison(moving,frozen,input={}){
 const expected=freezeNominalMoving(moving,input);
 check(same(frozen,expected),'frozen comparison differs from exact canonical both-body freeze');
 return true;
}
function generate(config,input={}){
 const p=profileConfig(config).profile;
 if(p==='accepted-parent')return generateParent(input);
 if(p==='following-nominal')return generateNominalMoving(input);
 if(p==='following-both-body-frozen')return generateFrozenComparison(input);
 throw Error('A006 following: unreachable profile');
}
function generateProfile(name,input={}){
 check(typeof name==='string'&&Object.hasOwn(PROFILES,name),'unknown explicit profile');
 return generate(PROFILES[name],input);
}
function validateProfileMap(map,name,input={}){
 check(same(map,generateProfile(name,input)),'map differs from canonical explicit profile');return true;
}
module.exports={VERSION,CONFIG,PARENT_CONFIG,FROZEN_CONFIG,PROFILES,PROFILE_NAMES,INPUT_KEYS,
 entry,generate,generateProfile,generateParent,generateNominalMoving,generateFrozenComparison,
 freezeNominalMoving,authenticateFrozenComparison,validateProfileMap,OBSERVATION_VERSION:Following.OBSERVATION_VERSION};
