'use strict';
// Source/geometry contract for a NEW prospective observer. No runtime poses.
// This does not authenticate an execution or turn fixtures into evidence.
const same=require('node:util').isDeepStrictEqual,clone=structuredClone;
const A=require('../source/c003-macro-generator.cjs'),U=require('../source/recovery-utils.cjs');
const need=(v,s)=>{if(!v)throw Error('c003 current interface: '+s);};
const R=10,VX=150,HZ=120,hash=A.hash;
function pressureIdentity(parent,candidate,plan){
 const before=parent.design.pressureProgram.pairRecords,after=candidate.design.pressureProgram.pairRecords;
 const declared=plan.macroPlan?candidate.design.lateMacroProgram.pressureIdentityMap:before.map(p=>({before:p.pairId,after:p.pairId}));
 need(declared.length===before.length&&after.length===before.length,'pressure pair lost or added');
 need(new Set(declared.map(q=>q.before)).size===declared.length&&new Set(declared.map(q=>q.after)).size===declared.length,'pressure identity not bijective');
 const rows=before.map(p=>{
  const move=plan.macroPlan?.moves.find(m=>m.sourceIndex===p.componentIndex),expected=move?U.remapId(p.pairId,move.slot):p.pairId;
  const q=declared.find(q=>q.before===p.pairId),record=after.find(q=>q.pairId===expected);
  need(q&&q.after===expected&&record,'missing or stale current pressure identity');
  const bodies=['top','bottom'].map(side=>{
   const old=parent.obstacles.find(o=>o.id===p.pairId+'-'+side),current=candidate.obstacles.find(o=>o.id===expected+'-'+side);
   need(old&&current&&same(old.collider,current.collider)&&old.y===current.y&&old.x+(move?.deltaOffset??0)===current.x,'mapped pair body changed beyond declaration');
   need(old.mechanic_kind===current.mechanic_kind,'mapped pair kind differs');
   const motion=old.motion===null?null:{...clone(old.motion),phase_rad:old.motion.phase_rad-(move?.deltaOffset??0)/VX*2*Math.PI/old.motion.period_s};
   need(same(motion,current.motion),'mapped pair absolute-phase transform differs');
   return{before:old.id,after:current.id};
  });
  return{before:p.pairId,after:expected,beforeComponent:p.componentIndex,afterComponent:record.componentIndex,deltaX:move?.deltaOffset??0,bodies};
 });
 return{schema:'c003-explicit-pressure-bijection/1',rows,removedPairCount:0,addedPairCount:0,scope:'all inherited same physical pairs; mapping is identity provenance, not an improvement'};
}
function lateWindow(parent,candidate){
 const x0=parent.initial_player.x,tick=x=>(x-x0)/VX*HZ;
 need(candidate.initial_player.x===x0,'initial x differs');
 const maps=[parent,candidate],predecessorStart=Math.min(...maps.map(m=>m.routes.main.connectors[8].startX));
 const demands=maps.map(m=>{
  const bodies=m.obstacles.filter(o=>U.ownedIndex(o.id)===11&&!/-tail-|-recovery-/.test(o.id));
  need(bodies.length&&bodies.every(o=>o.collider.shape==='rectangle'),'unsupported successor demand');
  const firstX=Math.min(...bodies.map(o=>o.x)),first=bodies.filter(o=>o.x===firstX);
  return{bodyIds:first.map(o=>o.id),fullBodyExitX:Math.max(...first.map(o=>o.x+o.collider.w+R))};
 });
 const successorExitTick=Math.max(...demands.map(q=>Math.floor(tick(q.fullBodyExitX))+1));
 const endTick=Math.ceil((successorExitTick+1)/HZ)*HZ;
 const duration=Math.max(3600,Math.ceil((endTick-(Math.floor(tick(predecessorStart))-1))/HZ)*HZ),startTick=endTick-duration;
 need(duration<=4800&&startTick>=0&&endTick<=14400&&startTick<tick(predecessorStart)&&endTick>successorExitTick,'late evidence cannot fit unchanged stage-window domain');
 return{window:{name:'late-macro-stage',layer:'stage',startTick,endTick},authoredCoverage:{predecessorBridgeStartX:predecessorStart,successorDemands:demands,successorExitTick,bodyPoseSynthesized:false},
  bodyRetention:'ordinary local actual-body capture already brackets fixed/vertical body slabs; no force-all-body list',
  qualification:'window location only; full actual entrance, both bridges, moved-body exits and successor exit still required'};
}
function verifyGeneratedPair(parent,candidate){
 const source=A.authenticatePair(parent,candidate),plan=candidate.plan;
 need(hash(parent.map.routes)===plan.expectedParentRoutesHash&&hash(candidate.map.routes)===plan.expectedCandidateRoutesHash,'current route identity differs');
 const pressure=pressureIdentity(parent.map,candidate.map,plan);
 const pSites=plan.selectedSites.map(s=>({recipe:s.recipe,source:parent.map.obstacles.find(o=>o.id===s.currentSourceId),receiver:parent.map.obstacles.find(o=>o.id===s.receiverId)}));
 const cSites=plan.selectedSites.map(s=>({recipe:s.recipe,source:candidate.map.obstacles.find(o=>o.id===s.currentSourceId),receiver:candidate.map.obstacles.find(o=>o.id===s.receiverId)}));
 need(same(pSites,cSites),'optional source or receiver changed');
 return{schema:'c003-static-current-map-contract/1',...source,pressure,late:plan.request.macro===null?null:lateWindow(parent.map,candidate.map),
  parentRoutesHash:plan.expectedParentRoutesHash,candidateRoutesHash:plan.expectedCandidateRoutesHash,
  runtimeAuthentication:false,physicsQualification:false,optionalInheritance:'source/body/context and prior scoped recipe evidence only; current execution must be checked',
  oldObserverPolicy:'c001 compareAuthenticated remains unchanged and must reject unequal global routes; use a new explicitly frozen admission wrapper'};
}
function compareMappedPressureRecords(parentQuality,candidateQuality,identity){
 const rows=identity.rows.map(m=>{
  const a=parentQuality.pressurePairs.filter(p=>p.pairId===m.before),b=candidateQuality.pressurePairs.filter(p=>p.pairId===m.after);
  need(a.length===1&&b.length===1,'saved pressure reducer lacks unique mapped pair');
  return{identity:clone(m),parent:clone(a[0]),candidate:clone(b[0]),comparable:a[0].status==='observed'&&b[0].status==='observed',
   medianWidthDeltaPx:a[0].status==='observed'&&b[0].status==='observed'?b[0].medianWidthPx-a[0].medianWidthPx:null};
 });
 need(parentQuality.pressurePairs.length===rows.length&&candidateQuality.pressurePairs.length===rows.length,'unmapped saved pressure pair');
 return{schema:'c003-mapped-pressure-description/1',rows,removedPairCountsAsImprovement:false,thresholdChanged:false,authenticated:false,scope:'pure matching reducer; caller must first authenticate both committed actual runs'};
}
module.exports={verifyGeneratedPair,pressureIdentity,lateWindow,compareMappedPressureRecords};
