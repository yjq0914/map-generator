'use strict';
const same=require('node:util').isDeepStrictEqual,A=require('../source/c005-laser-generator.cjs');
const Old=require('./c003-current-interface.cjs'),Laser=require('./c005-observe-laser.cjs');
const need=(v,s)=>{if(!v)throw Error('c005 current interface: '+s);};
function inheritedPlan(plan){return{...structuredClone(plan),selectedRecipes:structuredClone(plan.comparison.companionRecipes),selectedSites:structuredClone(plan.selectedSites.filter(s=>s.recipe!=='L')),request:structuredClone(plan.request.companion)};}
function verifyGeneratedPair(parent,candidate,mode){
 const source=A.authenticatePair(parent,candidate,mode),p=candidate.plan;need(p.request.schema===A.REQUEST,'L experiment request required');
 need(same(parent.map.routes,candidate.map.routes)&&same(parent.map.design.componentTimeline,candidate.map.design.componentTimeline),'routes or macro timeline differ');
 need(same(parent.map.design.lateMacroProgram,candidate.map.design.lateMacroProgram),'companion macro changed');
 for(const s of p.selectedSites.filter(s=>s.recipe!=='L'))for(const id of [s.currentSourceId,s.receiverId])need(same(parent.map.obstacles.find(o=>o.id===id),candidate.map.obstacles.find(o=>o.id===id)),'companion source/receiver changed');
 const pressure=Old.pressureIdentity(parent.map,candidate.map,{macroPlan:null});
 Laser.admitProgram(parent.map,p.laserProgram);Laser.admitProgram(candidate.map,p.laserProgram);
 return{schema:'c005-static-current-map-contract/1',...source,pressure,laser:Laser.captureWindow(candidate.map,p.laserProgram),late:p.request.companion.macro===null?null:Old.lateWindow(parent.map,candidate.map),parentRoutesHash:p.expectedParentRoutesHash,candidateRoutesHash:p.expectedCandidateRoutesHash,runtimeAuthentication:false,physicsQualification:false};
}
module.exports={inheritedPlan,verifyGeneratedPair,compareMappedPressureRecords:Old.compareMappedPressureRecords};
