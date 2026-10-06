'use strict';
const O=require('./observe-warning-laser-v2.cjs'),Q=require('../../harness/b002-metrics.cjs');
function observePair(map,run,trace,parentTrace){
 const observation=O.observe(map,run,trace);if(!observation.actualAction)return observation;
 const inputs=O.compareInputs(parentTrace,trace,observation.actualAction.window),parentRows=new Map(parentTrace.rows.map(r=>[r[0],r])),id=map.design.laserProgram.sourceId;
 const frames=trace.bodySamples.filter(f=>f.tick>=observation.actualAction.window.startTick&&f.tick<=observation.actualAction.window.endTick).flatMap(f=>{const b=f.bodies.find(b=>b.sourceId===id),r=parentRows.get(f.tick);if(!b||!r||!b.lethal||b.status!=='active')return[];const sl=Q.capsuleSlice(r[1],b,10);return sl&&r[2]>=sl[0]&&r[2]<=sl[1]?[{tick:f.tick,parentX:r[1],parentY:r[2],slice:sl}]:[];});
 return {...observation,pairedActualInputs:inputs,geometricCounterfactual:{oldPathOverlapSamples:frames.length,firstOverlap:frames[0]??null,interpretation:'Same-tick parent path versus saved actual candidate capsule. Geometry only; not a causal replay or universal necessity.'},actionAndActualBodyDemand:inputs.status==='observed'&&inputs.changedCommandTicks>0&&frames.length>0};
}
module.exports={observePair};
