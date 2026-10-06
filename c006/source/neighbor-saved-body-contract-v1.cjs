'use strict';
// Prospective capture/reducer compatibility aid, not authenticated admission.
// Uses saved rows/bodies only. Existing c003 observers remain untouched.
const path=require('node:path');
const VERSION='prospective-neighbor-saved-body-contract/1',R=10,VX=150,HZ=120;
const need=(v,s)=>{if(!v)throw Error('Neighbor body contract: '+s);};
function create({sourceRoot,macro}){
 const U=require(path.join(sourceRoot,'recovery-utils.cjs'));
 const owned=(m,i)=>m.obstacles.filter(o=>U.ownedIndex(o.id)===i);
 const primary=(m,i)=>owned(m,i).filter(o=>!/-tail-|-recovery-|-adj-/.test(o.id));
 function inventory(m){
  const pre=primary(m,8),next=primary(m,11);need(pre.length&&next.length,'missing neighboring primary demand');
  const lastX=Math.max(...pre.map(o=>o.x)),firstX=Math.min(...next.map(o=>o.x));
  const approach=owned(m,8).filter(o=>o.x>=lastX||/-tail-|-recovery-/.test(o.id));
  const successorNeighbors=macro.neighbors(m,11);
  const successor=owned(m,11).filter(o=>o.x<=firstX||successorNeighbors.some(n=>n.bodyId===o.id));
  const packages=[9,10].map(i=>({slot:i,facts:macro.geometryFacts(m,i),bodies:owned(m,i)}));
  return{approach,packages,successor,successorNeighbors,firstPrimarySuccessor:next.filter(o=>o.x===firstX)};
 }
 function captureContract(parent,candidate){
  const maps=[parent,candidate],items=maps.map(inventory),x0=parent.initial_player.x;
  need(candidate.initial_player.x===x0,'initial x differs');
  const tick=x=>(x-x0)/VX*HZ;
  const startX=Math.min(...maps.map(m=>m.routes.main.connectors[8].startX),...items.flatMap(x=>x.approach.map(o=>o.x-R)));
  const successorExitX=Math.max(...items.flatMap(x=>x.successor.map(o=>o.x+o.collider.w+R)));
  const successorExitTick=Math.floor(tick(successorExitX))+1,endTick=Math.ceil((successorExitTick+1)/HZ)*HZ;
  const duration=Math.max(3600,Math.ceil((endTick-(Math.floor(tick(startX))-1))/HZ)*HZ),startTick=endTick-duration;
  need(duration<=4800&&startTick>=0&&endTick<=14400&&startTick<tick(startX)&&endTick>successorExitTick,'required actual-body capture does not fit unchanged 30–40 second window');
  return{schema:VERSION,window:{name:'late-macro-stage',layer:'stage',startTick,endTick},arms:items.map((x,i)=>({arm:i?'candidate':'parent',requiredBodyIds:[...x.approach,...x.packages.flatMap(p=>p.bodies),...x.successor].map(o=>o.id),primarySuccessorBodyIds:x.firstPrimarySuccessor.map(o=>o.id),successorNeighborIds:x.successorNeighbors.map(n=>n.bodyId),carriedNeighborIds:x.packages.flatMap(p=>p.facts.auxiliaryBodies.map(n=>n.bodyId))})),physicsQualification:false};
 }
 return{VERSION,inventory,captureContract};
}
module.exports={VERSION,create};
