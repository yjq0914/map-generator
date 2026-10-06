'use strict';
// Deterministic authored geometry locates retention; it is never execution evidence.
const VERSION='b007-geometry-following-retention/2',HZ=120,VX=150,R=10;
function windowFor(candidate){
 const p=candidate.design?.relocatedHammerProgram?.phrase;
 if(!p)throw Error('Missing resolved phrase for retention');
 const x0=candidate.initial_player.x,tick=x=>(x-x0)/VX*HZ;
 // Strict body exit is the first integer after the expanded actual-descriptor boundary.
 const nextExitTick=Math.floor(tick(p.successor.wholeBodyX[1]))+1;
 const predecessorStartTick=Math.ceil(tick(p.predecessor.connectors.main.startX));
 const preferredEnd=Math.ceil((nextExitTick+32)/60)*60;
 // Keep15s if shifting its end before the next grid point still gives32 post-exit ticks.
 const comboEnd=Math.min(preferredEnd,predecessorStartTick-1+1800);
 const fitsCombo=comboEnd>=nextExitTick+32;
 const layer=fitsCombo?'combo':'stage',duration=fitsCombo?1800:3600;
 const endTick=fitsCombo?comboEnd:preferredEnd,startTick=endTick-duration;
 if(startTick<0||endTick>14400||startTick>=predecessorStartTick||endTick<=nextExitTick)throw Error('Phrase coverage cannot fit existing15s/30s retention modes');
 const xs=[p.predecessor.connectors.main.startX,p.predecessor.connectors.main.boundaryX,...candidate.design.hammerProgram.wholeBodySweepX,...p.receiverWholeBodyX,...p.remainingIslands.flatMap(o=>[o.x-R,o.x+o.collider.w+R]),p.connectors.main.startX,p.connectors.main.boundaryX,...p.successor.wholeBodyX,...p.routeFacts.map(r=>r.receiver.segment.endX)];
 const observationBoundaries=[...new Set([startTick,endTick,...xs.flatMap(x=>{const t=Math.ceil(tick(x));return[t-1,t,t+1];})])].filter(t=>t>=startTick&&t<=endTick).sort((a,b)=>a-b);
 return{schema:VERSION,retentionWindow:{layer,startTick,endTick},observationBoundaries,position:{slot:p.owner.componentIndex,sourceId:p.source.id,receiverId:p.receiver.id,nextDemandIds:p.successor.firstDemandBodies.map(o=>o.id),b005Shift:p.owner.b005Move.deltaOffset},planningCoverage:{predecessorStartTick,nextExitTick,actualShapeEntryAndLastExit:'must be measured from saved bodies; authored geometry only locates window'}};
}
module.exports={VERSION,windowFor};
