'use strict';
// Prospective receiver-only semantics. Original prepared observer stays immutable.
const Base=require('./b007-observe-core-v2.cjs'),Q=require('../../harness/b002-metrics.cjs');
const VERSION='b007-saved-shape-seam-with-receiver-footprint/3';
function receiverFootprint(map,run,trace,context=map.design?.relocatedHammerProgram){
 const p=context?.phrase,rf=p?.routeFacts.find(q=>q.route===run.route);if(!rf)return{status:'unsupported',passed:false};
 const rows=trace.rows??[],frames=new Map((trace.bodySamples??[]).map(f=>[f.tick,f])),samples=[];let missing=false;
 for(const row of rows){const frame=frames.get(row[0]),body=frame?.bodies.find(b=>b.id===p.receiver.id);
  if(!body){if(row[1]>=p.receiverWholeBodyX[0]&&row[1]<=p.receiverWholeBodyX[1])missing=true;continue;}
  if(row[1]+Q.RADIUS<body.x||row[1]-Q.RADIUS>body.x+body.w)continue;
  if(body.shape!=='rectangle'||body.lethal!==true||![body.x,body.y,body.w,body.h].every(Number.isFinite)){missing=true;continue;}
  const x=row[1],y=row[2],qx=Math.max(body.x,Math.min(x,body.x+body.w)),qy=Math.max(body.y,Math.min(y,body.y+body.h)),margin=Math.hypot(x-qx,y-qy)-Q.RADIUS;
  const intendedSide=rf.receiver.side==='upper'?y<body.y+body.h/2:y>body.y+body.h/2;
  samples.push({tick:row[0],x,y,alive:!!row[5],body:{id:body.id,x:body.x,y:body.y,w:body.w,h:body.h},marginPx:margin,intendedSide});
 }
 const first=samples[0],last=samples.at(-1),before=first?rows.find(r=>r[0]===first.tick-1):null,after=last?rows.find(r=>r[0]===last.tick+1):null;
 const dense=!!samples.length&&samples.every((s,i)=>!i||s.tick===samples[i-1].tick+1),bracketed=!!before&&before[1]<p.receiverWholeBodyX[0]&&!!after&&after[1]>p.receiverWholeBodyX[1];
 const routeExit=rows.find(r=>r[1]>rf.receiver.segment.endX),deaths=(trace.events??[]).filter(e=>e.type==='death'&&(e.sourceId??e.id)===p.receiver.id);
 const rawEvents=(run.metrics?.routeEvents??[]).filter(e=>rf.receiver.checkpoints.some(c=>c.id===e.id));
 const passed=!missing&&dense&&bracketed&&!!routeExit&&samples.every(s=>s.alive&&s.marginPx>0&&s.intendedSide)&&deaths.length===0;
 return{schema:'b007-actual-receiver-footprint/1',status:missing?'missing':samples.length?'observed':'not_reached',sourceId:p.receiver.id,requestedSide:rf.receiver.side,passed,dense,bracketed,actualSampleCount:samples.length,first:first??null,last:last??null,minExactCircleRectangleMarginPx:samples.length?Math.min(...samples.map(s=>s.marginPx)):null,wrongSideTicks:samples.filter(s=>!s.intendedSide).map(s=>s.tick),nonpositiveMarginTicks:samples.filter(s=>s.marginPx<=0).map(s=>s.tick),sourceDeathEvents:deaths,wholeBodyExitTick:after?.[0]??null,routeExitTick:routeExit?.[0]??null,rawCheckpointEvents:rawEvents,rawCheckpointPass:rawEvents.length===rf.receiver.checkpoints.length&&rawEvents.every(q=>q.actual?.alive&&q.actual.y>=q.expected.y[0]&&q.actual.y<=q.expected.y[1]),scope:'Only receiver checkpoint y guards in this changed hammer encounter; every other inherited source/route/contact/final obligation remains unchanged. Integer-tick distances do not replace substep deaths.'};
}
function physicalTask(map,run,trace,context=map.design?.relocatedHammerProgram){
 const receiver=receiverFootprint(map,run,trace,context),ids=context?.phrase.routeFacts.find(q=>q.route===run.route)?.receiver.checkpoints.map(q=>q.id)??[];
 const metrics=run.metrics?{...run.metrics,routeEvents:run.metrics.routeEvents.filter(q=>!ids.includes(q.id))}:null;
 return{rawTaskPass:run.taskPass,physicalTaskPass:!!receiver.passed&&!!metrics&&Q.taskPass(metrics),excludedGuardIds:ids,receiver};
}
function observe(map,run,trace,context){const raw=Base.observe(map,run,trace,context);return{...raw,schema:VERSION,receiverPhysical:receiverFootprint(map,run,trace,context)};}
function observePair(pm,pr,pt,cm,cr,ct){const o=Base.observePair(pm,pr,pt,cm,cr,ct),context=cm.design?.relocatedHammerProgram;return{...o,schema:VERSION,parent:{...o.parent,receiverPhysical:receiverFootprint(pm,pr,pt,context)},candidate:{...o.candidate,receiverPhysical:receiverFootprint(cm,cr,ct,context)}};}
module.exports={VERSION,receiverFootprint,physicalTask,observe,observePair};
