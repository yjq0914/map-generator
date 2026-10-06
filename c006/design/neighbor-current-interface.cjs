'use strict';
// Exact current-map admission, preserving the prior L observer and its guards.
const path=require('node:path'),same=require('node:util').isDeepStrictEqual,A=require('../source/neighbor-generator.cjs');
const root=path.resolve(A.sourceRoot,'..'),Old=require(path.join(root,'design/c003-current-interface.cjs'));
const Late=require('../source/neighbor-late-observe-v1.cjs').create({sourceRoot:A.sourceRoot,macro:A.Macro});
const need=(v,s)=>{if(!v)throw Error('Neighbor current interface: '+s);};
function laserObserver(){return require(path.join(root,'design/c005-observe-laser.cjs'));}
function inheritedPlan(plan){const p=structuredClone(plan.parentPlan);p.selectedRecipes=p.selectedRecipes.filter(r=>r!=='L');p.selectedSites=p.selectedSites.filter(s=>s.recipe!=='L');if(p.request.schema==='flappy-laser-companion-request/1')p.request=structuredClone(p.request.companion);return p;}
function verifyGeneratedPair(parent,candidate){
 const source=A.authenticatePair(parent,candidate),p=candidate.plan;need(p.request.schema===A.REQUEST,'new explicit macro companion request required');
 A.Macro.verifyProtected(parent.map,candidate.map);
 need(A.hash(parent.map.routes)===p.expectedParentRoutesHash&&A.hash(candidate.map.routes)===p.expectedCandidateRoutesHash,'current route fingerprint differs');
 const pressure=Old.pressureIdentity(parent.map,candidate.map,{macroPlan:p.macroPlan});
 const selected=p.selectedRecipes;need(!(selected.includes('L')&&selected.includes('J')),'L/J conflict');
 for(const s of p.selectedSites)for(const id of [s.currentSourceId,s.receiverId])need(same(parent.map.obstacles.find(o=>o.id===id),candidate.map.obstacles.find(o=>o.id===id)),'accepted optional source/receiver changed');
 let laser=null;
 if(selected.includes('L')){
  const L=laserObserver(),programs={parent:parent.map.design.laserProgram,candidate:candidate.map.design.laserProgram};
  L.admitProgram(parent.map,programs.parent);L.admitProgram(candidate.map,programs.candidate);
  const pw=L.captureWindow(parent.map,programs.parent),cw=L.captureWindow(candidate.map,programs.candidate);need(same(pw,cw),'pinned L capture changed');
  const binding=candidate.map.design.lateMacroProgram.currentLaserRouteBinding;need(binding&&binding.beforeRoutesSHA256===p.expectedParentRoutesHash&&binding.afterRoutesSHA256===p.expectedCandidateRoutesHash&&binding.programBeforeSHA256===A.hash(programs.parent)&&binding.programAfterSHA256===A.hash(programs.candidate),'explicit current L route rebinding differs');
  laser={window:pw,programs:structuredClone(programs),routeBinding:structuredClone(binding)};
 }else need(!parent.map.design.laserProgram&&!candidate.map.design.laserProgram,'unselected L present');
 return{schema:'prospective-neighbor-current-map-contract/1',...source,pressure,laser,late:Late.captureContract(parent.map,candidate.map),parentRoutesHash:p.expectedParentRoutesHash,candidateRoutesHash:p.expectedCandidateRoutesHash,runtimeAuthentication:false,physicsQualification:false};
}
module.exports={inheritedPlan,verifyGeneratedPair,compareMappedPressureRecords:Old.compareMappedPressureRecords,Late,laserObserver};
