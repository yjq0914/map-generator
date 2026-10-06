'use strict';
// STATIC ONLY: block dynamic exports before loading any generator.
const guard=require('../../design/static-engine-guard.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Parent=require('../recovery-generator.cjs'),G=require('../a006-following-generator.cjs');
const Following=require('../../design/following-gate-post-length.cjs');
const ROOT=path.resolve(__dirname,'../..'),clone=structuredClone;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const accepted=JSON.parse(fs.readFileSync(path.join(ROOT,'outer/a005-recovery/accepted-pointer.json'),'utf8'));
const parentFreeze=JSON.parse(fs.readFileSync(path.join(ROOT,accepted.sourceFreeze),'utf8'));
let assertions=0,generatedProfiles=0,negativeCases=0,identityCases=0;
const eq=(a,b,msg)=>{assert.deepStrictEqual(a,b,msg);assertions++;};
const ok=(v,msg)=>{assert.ok(v,msg);assertions++;};
const rejects=(fn,rx=/./)=>{assert.throws(fn,rx);assertions++;negativeCases++;};
function changed(before,after){return before.obstacles.flatMap((o,i)=>JSON.stringify(o)===JSON.stringify(after.obstacles[i])?[]:[o.id]);}
const entries=[
 {seed:1,y:270,vy:0,lead:0,phase:0,adjacency:'none'},
 {},
 {seed:0,y:245,vy:-65,lead:-20,phase:-.45,adjacency:'upper-after'},
 {seed:0xffffffff,y:300,vy:65,lead:20,phase:.45,adjacency:'lower-before'},
 {seed:47,y:245+2/7,vy:-65+3/11,lead:20-5/13,phase:.45-1/19,adjacency:'none'},
 {seed:299,y:300-1/3,vy:65-1/9,lead:-20+1/7,phase:-.45+1/11,adjacency:'lower-before'},
 {seed:22,y:268.774,vy:-21.5012,lead:19.984,phase:.133822,adjacency:'upper-after'},
 {seed:2147483647,y:282.5,vy:31.125,lead:1/3,phase:-1/7,adjacency:'none'}
];
let example;const targets=new Set(),orders=new Set(),lengths=new Set();
for(const raw of entries){
 const input=clone(raw),inputBefore=JSON.stringify(input),e=G.entry(input);
 eq(Object.keys(e),['seed','y','vy','lead','phase','adjacency']);
 const parent=G.generate(G.PARENT_CONFIG,input),moving=G.generate(G.CONFIG,input),frozen=G.generate(G.FROZEN_CONFIG,input);
 generatedProfiles+=3;
 eq(JSON.stringify(input),inputBefore,'generation does not mutate entry');
 eq(parent,Parent.generate(Parent.CONFIG,e),'parent remains byte-identical accepted generator output');
 const t=moving.design.followingGateProgram.target,ids=[t.topId,t.bottomId];
 targets.add(t.pairId);orders.add(parent.design.orderProgram.sourceAtSlot.join(','));lengths.add(parent.components.map(c=>c.lengthPx).join(','));
 eq(moving.design.followingGateProgram.operation,{type:'following-gate-post-length',speedRatio:.6,periodSeconds:3,crossingPhase:0,placementBias:-1,seedSalt:0});
 eq(changed(parent,moving).sort(),ids.slice().sort());eq(changed(moving,frozen).sort(),ids.slice().sort());
 for(let i=0;i<parent.obstacles.length;i++){
  const p=parent.obstacles[i],m=moving.obstacles[i],f=frozen.obstacles[i];
  if(!ids.includes(p.id)){eq(m,p,'unselected descriptor identical');eq(f,p,'control does not alter unselected descriptor');continue;}
  for(const k of Object.keys(p))if(!['x','mechanic_kind','motion'].includes(k)){eq(m[k],p[k],'moving selected protected field');eq(f[k],p[k],'frozen selected protected field');}
  eq(m.mechanic_kind,'horizontal_armor_slider');eq(f.mechanic_kind,'fixed_armor_or_spike');eq(f.motion,null);
  eq(f.x,t.authoredCenterX-f.collider.w/2);eq(f.x,p.x);
  eq(m.motion.amplitude_px,.6*150/(2*Math.PI/3));eq(m.motion.period_s,3);
  ok(Math.abs(m.motion.phase_rad+(2*Math.PI/3)*(t.authoredCenterX-60)/150)<1e-12,'independent phase arithmetic within rounding tolerance');
 }
 for(const k of ['routes','routeMarks','macroPlan','initial_player','horizon','durationTicks','seed','condition','height','width','worldBounds','winMode','encounters','triggers','coins']){
  eq(moving[k],parent[k],k+' inherited');eq(frozen[k],parent[k],k+' inherited in control');
 }
 for(const k of ['orderProgram','lengthProgram','componentTimeline','timelineProvenance','pressureProgram','optionalSpringProgram','recoveryConstruction']){
  eq(moving.design[k],parent.design[k]);eq(frozen.design[k],parent.design[k]);
 }
 for(let i=0;i<parent.components.length;i++){
  const a=clone(moving.components[i]);if(i===t.componentIndex){const r=a.relations.pop();eq(r.type,'recovery-following-horizontal-pair');eq(r.sourceIds,ids);}
  eq(a,parent.components[i]);eq(frozen.components[i],moving.components[i],'control retains relational construction provenance');
 }
 eq(moving.design.components,moving.components);eq(frozen.design.components,frozen.components);
 eq(Parent.annotateSemantics(moving),moving,'outer semantic annotation is idempotent');
 eq(Parent.annotateSemantics(frozen),frozen,'outer annotation retains exact frozen comparison identity');
 eq(frozen.design.followingGateProgram,moving.design.followingGateProgram,'predictions retained only as labelled construction provenance');
 eq(frozen.design.a006FollowingExperiment.actualDescriptorTreatment,'both-body-frozen-at-authored-center');
 eq(frozen.design.a006FollowingExperiment.comparison.changedSourceIds,ids);
 eq(frozen.design.a006FollowingExperiment.comparison.inheritedNominalPredictionsAreConstructionOnly,true);
 eq(frozen.design.a006FollowingExperiment.comparison.freezeBothBodies,true);
 eq(G.generateProfile('following-nominal',e),moving,'explicit registry matches named API');
 eq(G.generateProfile('following-both-body-frozen',e),frozen);
 eq(G.freezeNominalMoving(moving,e),frozen);
 eq(G.authenticateFrozenComparison(moving,frozen,e),true);
 eq(G.validateProfileMap(moving,'following-nominal',e),true);
 eq(G.validateProfileMap(frozen,'following-both-body-frozen',e),true);
 eq(G.generateNominalMoving(e),moving,'deterministic repeated generation');
 example??={e,parent,moving,frozen,ids};
}
const {e,parent,moving,frozen,ids}=example;
eq(moving.design.followingGateProgram.target.pairId,'c1-press-0');
eq(moving.design.followingGateProgram.target.authoredCenterX,1870);
eq(frozen.design.a006FollowingExperiment.profile,'following-both-body-frozen');
const proposal=JSON.parse(fs.readFileSync(path.join(ROOT,'design/calibration-proposal.json'),'utf8'));
eq(G.CONFIG.operation,proposal.operation,'exact prospective controls');eq(e,proposal.entry);
eq(moving.design.followingGateProgram.target.nominal,proposal.target.nominal,'nominal values unchanged from proposal');
// No implicit global activation or fallback. Registry is local, complete and immutable.
eq(G.PROFILE_NAMES,['accepted-parent','following-nominal','following-both-body-frozen']);
eq(G.PARENT_CONFIG.operation,null);ok(Object.isFrozen(G.PROFILES));ok(Object.isFrozen(G.CONFIG.operation));
rejects(()=>G.generate());rejects(()=>G.generate({}));rejects(()=>G.generateProfile());
for(const profile of ['default','nominal','__proto__','constructor','toString','unknown'])rejects(()=>G.generateProfile(profile,e),/unknown explicit profile/);
for(const mutation of [c=>c.operation.speedRatio=.61,c=>c.operation.periodSeconds=2.99,c=>c.operation.crossingPhase=.01,c=>c.operation.placementBias=0,c=>c.operation.seedSalt=1,c=>c.operation.componentIndex=1,c=>c.profile='unknown',c=>c.conditionId='public',c=>delete c.operation,c=>c.version='a006-following-v2']){
 const c=clone(G.CONFIG);mutation(c);rejects(()=>G.generate(c,e),/configuration/);
}
for(const input of [null,[],{seed:-1},{seed:1.5},{seed:4294967296},{y:244.99},{y:300.01},{vy:NaN},{vy:65.01},{lead:20.01},{phase:.45001},{adjacency:'other'}])rejects(()=>G.generate(G.CONFIG,input));
for(const key of G.INPUT_KEYS)rejects(()=>G.generate(G.CONFIG,{...e,[key]:null}),/must not be null/);
for(const profile of G.PROFILE_NAMES){
 const full={...e};for(const k of ['id','conditionId','group','results','testId','holdout','route','profile'])Object.defineProperty(full,k,{enumerable:true,get(){throw Error('experimental metadata read: '+k);}});
 eq(G.generateProfile(profile,full),G.generateProfile(profile,e),'experimental metadata getters never read');identityCases++;
}
// Authenticate full candidate and comparison maps; never accept one-body or off-pair edits.
for(const mutate of [
 m=>m.obstacles.find(o=>o.id===ids[0]).motion.amplitude_px+=1e-7,
 m=>m.obstacles.find(o=>!ids.includes(o.id)).x+=1e-7,
 m=>m.routes.main.segments[0].endX+=1e-7,
 m=>m.components[1].relations.pop(),
 m=>m.design.followingGateProgram.target.topId='wrong',
 m=>m.design.followingGateProgram.operation.speedRatio=.61,
 m=>m.intervention={mode:'freeze-motion',id:ids[0]},
 m=>m.condition.id='condition-identity'
]){const bad=clone(moving);mutate(bad);rejects(()=>G.freezeNominalMoving(bad,e),/not canonical/);}
for(const mutate of [
 m=>Object.assign(m.obstacles.find(o=>o.id===ids[0]),clone(moving.obstacles.find(o=>o.id===ids[0]))),
 m=>m.obstacles.find(o=>o.id===ids[1]).x+=1e-7,
 m=>m.obstacles.find(o=>!ids.includes(o.id)).y+=1e-7,
 m=>m.routes.branch.checkpoints[0].x+=1,
 m=>m.durationTicks-=1,
 m=>m.design.a006FollowingExperiment.comparison.freezeBothBodies=false,
 m=>m.components[1].relations.pop()
]){const bad=clone(frozen);mutate(bad);rejects(()=>G.authenticateFrozenComparison(moving,bad,e),/exact canonical both-body freeze/);}
rejects(()=>G.freezeNominalMoving(parent,e),/not canonical/);
rejects(()=>G.freezeNominalMoving(frozen,e),/not canonical/);
rejects(()=>G.freezeNominalMoving(moving,{...e,seed:2}),/not canonical/);
rejects(()=>G.validateProfileMap(frozen,'following-nominal',e));
// Fault injection stays entirely within pure source API. The dynamic guard is untouched.
const originalApply=Following.applyPostLength;let calls=0;
try{
 Following.applyPostLength=()=>{calls++;throw Error('deliberate unsafe chosen target');};
 rejects(()=>G.generateNominalMoving(e),/unsafe chosen target/);eq(calls,1,'no rerank, retry, or parent fallback');
 Following.applyPostLength=(...args)=>{const m=originalApply(...args);m.obstacles.find(o=>o.id!==m.design.followingGateProgram.target.topId&&o.id!==m.design.followingGateProgram.target.bottomId).x+=1;return m;};
 rejects(()=>G.generateNominalMoving(e),/unselected descriptor changed/);
 Following.applyPostLength=(...args)=>{const m=originalApply(...args);m.routes.main.segments[0].endX+=1;return m;};
 rejects(()=>G.generateNominalMoving(e),/top-level field changed: routes/);
 Following.applyPostLength=(...args)=>{const m=originalApply(...args);m.obstacles.find(o=>o.id===m.design.followingGateProgram.target.bottomId).y+=1;return m;};
 rejects(()=>G.generateNominalMoving(e),/selected collider, aperture, y/);
}finally{Following.applyPostLength=originalApply;}
eq(G.generateNominalMoving(e),moving,'pure fault injections restored');
// Compare unchanged parent files directly to the accepted immutable source freeze.
let frozenParentFiles=0;
for(const [file,digest]of Object.entries(parentFreeze.files))if(file.startsWith('source/')||file.startsWith('harness/')){
 eq(sha(fs.readFileSync(path.join(ROOT,file))),digest,'accepted source unchanged: '+file);frozenParentFiles++;
}
for(const [file,digest]of Object.entries({
 'design/following-gate-post-length.cjs':'d71001cc4f6ef83f2672026b8fada39f76ee01c7849705156362ffe8c59f2ab5',
 'design/following-observations-v2.cjs':'954d7defac987d0760584df7273c703d9a90ff10af43c298f75c7e05659617ff'
}))eq(sha(fs.readFileSync(path.join(ROOT,file))),digest,'design runtime dependency unchanged');
eq(guard.report().blockedDynamicEngineExports,45);eq(guard.report().forbiddenCalls,0);
console.log(JSON.stringify({schema:'a006-following-source-static-fixtures/1',passed:true,assertions,inputEntries:entries.length,
 generatedProfiles,negativeCases,identityCases,targets:[...targets],orderVariants:orders.size,lengthVariants:lengths.size,
 parentAcceptedVersion:accepted.version,parentFreeze:accepted.sourceFreeze,parentFreezeHash:accepted.sourceManifestHash,
 frozenParentFilesUnchanged:frozenParentFiles,...guard.report(),
 qualification:'Pure source generation, strict matched-control authentication, preservation and fail-closed fixtures only; no physical qualification'},null,2));
