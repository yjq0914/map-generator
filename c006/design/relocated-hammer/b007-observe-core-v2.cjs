'use strict';
// Reduces retained runtime records only. No simulation, synthesized poses, or evidence lookup.
const same=require('node:util').isDeepStrictEqual;
const Shape=require('../../harness/b002-metrics.cjs');
const {pointMargin}=require('../hammer/observe-hammer.cjs');
const VERSION='b007-saved-shape-seam-per-body-successor/2',R=10,HZ=120;
const live=b=>b.lethal===true&&!['warning','idle','cleared'].includes(b.status);
const need=(v,s)=>{if(!v)throw Error('Saved seam observation: '+s);};
function margin(row,b){if(b.shape!=='rectangle')return pointMargin(row[1],row[2],b,R);return Math.hypot(Math.max(b.x-row[1],0,row[1]-b.x-b.w),Math.max(b.y-row[2],0,row[2]-b.y-b.h))-R;}
function observer(map,run,trace,context=map.design?.relocatedHammerProgram){
 need(context?.schema==='exact-b005-phrase-hammer-binding/1','b007 phrase context required');
 need(['main','branch'].includes(run?.route),'declared assigned route required');
 const w=trace?.retentionWindow??trace?.continuity?.window;need(w&&Number.isInteger(w.startTick)&&Number.isInteger(w.endTick),'retained window required');
 const rows=trace.rows??[],frames=(trace.bodySamples??[]).filter(f=>f.tick>=w.startTick&&f.tick<=w.endTick),flaps=trace.flapTicks??[];
 need(new Set(rows.map(r=>r[0])).size===rows.length&&new Set(frames.map(f=>f.tick)).size===frames.length,'duplicate row/body frame');
 const byTick=new Map(rows.map(r=>[r[0],r])),byFrame=new Map(frames.map(f=>[f.tick,f])),commands=new Set(flaps),p=context.phrase;
 const state=t=>{const r=byTick.get(t);return r?{tick:r[0],x:r[1],y:r[2],vy:r[3],inputCausingRow:!!r[4],alive:!!r[5],commandAtTick:commands.has(t)}:null;};
 for(const f of frames){const r=byTick.get(f.tick);need(r&&r[1]===f.x&&r[2]===f.y,'body/player frame mismatch');need(new Set(f.bodies.map(b=>b.id)).size===f.bodies.length,'duplicate actual body ID');}
 const reached=Math.min(w.endTick,trace.finalState?.tick??-1),expected=Math.max(0,reached-w.startTick+1);
 const kept=rows.filter(r=>r[0]>=w.startTick&&r[0]<=reached),dense=kept.length===expected&&kept.every((r,j)=>r[0]===w.startTick+j);
 const denseFrames=frames.length===expected&&frames.every((f,j)=>f.tick===w.startTick+j);
 const cross=(x,strict=false)=>kept.find(r=>strict?r[1]>x:r[1]>=x);
 const stateCross=(x,strict=false)=>{const r=cross(x,strict);return r?state(r[0]):null;};
 function bodyGroup(ids,{hammer=false,guaranteedRightX=null}={}){
  const samples=[];
  for(const f of frames){const bodies=f.bodies.filter(b=>ids.includes(b.id));if(!bodies.length)continue;
   need(bodies.length===ids.length,'partial physical body group: '+ids.join(','));
   if(hammer)need(bodies.length===2&&bodies.some(b=>b.shape==='circle')&&bodies.some(b=>b.shape==='segment'),'hammer head/arm shape mismatch');
   need(bodies.every(b=>['rectangle','circle','segment'].includes(b.shape)&&typeof b.lethal==='boolean'&&typeof b.status==='string'),'unsupported or missing actual shape status');
   const row=byTick.get(f.tick),active=bodies.filter(live),bounds=bodies.map(Shape.runtimeBounds);need(bounds.every(b=>Object.values(b).every(Number.isFinite)),'nonfinite actual shape bounds');
   const slab=active.some(b=>{const q=Shape.runtimeBounds(b);return row[1]+R>=q.minX&&row[1]-R<=q.maxX;});
   samples.push({tick:f.tick,slab,minMarginPx:active.length?Math.min(...active.map(b=>margin(row,b))):null,allRight:bounds.every(b=>row[1]-R>b.maxX),state:state(f.tick),bodies});
  }
  if(!samples.length)return{status:reached<w.startTick?'not_reached':'missing',physicalBodyIds:ids};
  need(samples.every((s,j)=>!j||s.tick===samples[j-1].tick+1),'sparse saved physical body group');
  if(hammer)need(samples.length===expected,'head and arm must be retained at every reached window tick');
  const overlapping=samples.filter(s=>s.slab),first=overlapping[0],last=overlapping.at(-1),before=first?samples.find(s=>s.tick===first.tick-1):null,after=last?samples.find(s=>s.tick===last.tick+1):null;
  const full=!!(before&&!before.slab&&after&&!after.slab&&after.allRight&&samples.filter(s=>s.tick>last.tick).every(s=>!s.slab));
  const allSweepExit=guaranteedRightX===null?null:stateCross(guaranteedRightX,true);
  const event=s=>s?{state:s.state,bodies:s.bodies,minBodyMarginPx:s.minMarginPx}:null;
  const perBody=ids.map(id=>{const ss=samples.map(s=>{const b=s.bodies.find(b=>b.id===id),q=Shape.runtimeBounds(b);return{sample:s,body:b,slab:live(b)&&s.state.x+R>=q.minX&&s.state.x-R<=q.maxX,right:s.state.x-R>q.maxX};}),hits=ss.filter(s=>s.slab),first=hits[0],last=hits.at(-1),exit=last?ss.find(s=>s.sample.tick===last.sample.tick+1):null;return{bodyId:id,firstHorizontalOverlap:first?{state:first.sample.state,body:first.body}:null,lastHorizontalOverlap:last?{state:last.sample.state,body:last.body}:null,firstFullExitAfterLastOverlap:exit&&!exit.slab&&exit.right?{state:exit.sample.state,body:exit.body}:null};});
  const distances=samples.filter(s=>s.minMarginPx!==null);
  return{status:first&&full&&(!hammer||allSweepExit)?'observed':reached<w.endTick?'censored':'missing',physicalBodyIds:ids,perBody,savedTicks:samples.length,firstHorizontalOverlap:event(first),lastHorizontalOverlap:event(last),firstFullExitAfterLastOverlap:full?event(after):null,bracketedEntry:!!before&&!before.slab,bracketedLastExit:full,minimumActualBodyMarginPx:distances.length?Math.min(...distances.map(s=>s.minMarginPx)):null,actualOverlapTicks:overlapping.map(s=>s.tick),conservativeAllSweepExit:allSweepExit,conservativeSweepIsNotActualEntryOrExit:true};
 }
 function bridge(c){const start=stateCross(c.startX),end=stateCross(c.boundaryX),a=start?.tick,b=end?.tick;
  const boundary=(trace.boundaries??[]).find(v=>v.tick===b),ev=trace.controllerStats?.connectorEvents??[];
  return{authoredSeconds:(c.boundaryX-c.startX)/150,startX:c.startX,boundaryX:c.boundaryX,entry:start,exit:end,commandTicks:a!==undefined&&b!==undefined?flaps.filter(t=>t>=a&&t<b):null,terminal42TickFlap:b!==undefined?{tick:b-42,issued:commands.has(b-42)}:null,controllerPlan:ev.find(e=>e.type==='connector-plan'&&e.tick===a)??null,controllerExit:ev.find(e=>e.type==='connector-entry'&&Math.abs(e.x-c.boundaryX)<1e-7)??null,boundaryEvidence:boundary??null,queueContinuity:{actualSnapshotAvailable:!!boundary?.controllerSnapshot,declaredContinuouslyRetained:trace.controllerQueueContinuity??null,restorationUsed:trace.continuity?.restorationUsed??null,qualification:'live-closure continuity declaration plus saved boundary events; unexported queue values remain unavailable'}};
 }
 const candidate=!!map.design?.hammerProgram,sourceIds=candidate?[p.source.id,p.source.id+':arm']:[p.source.id];
 const source=bodyGroup(sourceIds,{hammer:candidate,guaranteedRightX:candidate?map.design.hammerProgram.wholeBodySweepX[1]:null});
 const receiver=bodyGroup([p.receiver.id]),remaining=p.remainingIslands.map(o=>({sourceId:o.id,...bodyGroup([o.id])}));
 // Successor descriptors have fixed x: individual bodies can legitimately leave
 // the saved viewport after their own actual exit while longer rails remain.
 need(p.successor.firstDemandBodies.every(o=>o.collider?.shape==='rectangle'&&(!o.motion||o.mechanic_kind==='vertical_armor_slider')),'per-body successor reduction requires invariant horizontal extent');
 const nextParts=p.successor.firstDemandBodies.map(o=>({sourceId:o.id,...bodyGroup([o.id])}));
 for(const o of p.successor.firstDemandBodies)for(const f of frames){const b=f.bodies.find(b=>b.id===o.id);if(b)need(b.shape==='rectangle'&&b.x===o.x&&b.w===o.collider.w,'successor saved horizontal bounds differ from fixed descriptor');}
 const nextComplete=nextParts.length>0&&nextParts.every(q=>q.status==='observed');
 const select=(field,latest)=>nextComplete?nextParts.map(q=>q[field]).sort((a,b)=>(latest?-1:1)*(a.state.tick-b.state.tick))[0]:null;
 const next={status:nextComplete?'observed':reached<w.startTick?'not_reached':reached<w.endTick?'censored':'missing',physicalBodyIds:p.successor.firstDemandBodies.map(o=>o.id),perBody:nextParts.flatMap(q=>q.perBody??[]),individualBodyObservations:nextParts,firstHorizontalOverlap:select('firstHorizontalOverlap',false),lastHorizontalOverlap:select('lastHorizontalOverlap',true),firstFullExitAfterLastOverlap:select('firstFullExitAfterLastOverlap',true),bracketedEntry:nextComplete,bracketedLastExit:nextComplete,minimumActualBodyMarginPx:nextComplete?Math.min(...nextParts.map(q=>q.minimumActualBodyMarginPx)):null,actualOverlapTicks:[...new Set(nextParts.flatMap(q=>q.actualOverlapTicks??[]))].sort((a,b)=>a-b),aggregation:'Every declared fixed-horizontal body must independently have dense actual bracketed entry, last overlap and strict-right full exit; group exit is latest actual per-body exit. No absent poses reconstructed; hammer joint retention unchanged.'};
 const rf=p.routeFacts.find(q=>q.route===run.route),checkpoint=q=>{const s=stateCross(q.x);return{checkpoint:q,state:s,inInheritedYBand:s?s.y>=q.y[0]&&s.y<=q.y[1]:null};};
 const sourceChecks=rf.source.checkpoints.map(checkpoint),receiverChecks=rf.receiver.checkpoints.map(checkpoint);
 const receiverRouteExit=stateCross(rf.receiver.segment.endX,true),pred=bridge(p.predecessor.connectors[run.route]),tail=bridge(p.connectors[run.route]);
 const continuous=trace.initialState?.tick===0&&trace.continuity?.startedAtTick===0&&trace.continuity?.restorationUsed===false&&trace.continuity?.prefixPhysicalTicksCharged===trace.finalState?.tick;
 const complete=dense&&denseFrames&&reached===w.endTick&&kept.every(r=>r[5]===1);
 return{schema:VERSION,window:w,status:complete&&continuous&&[source,receiver,next,...remaining].every(x=>x.status==='observed')&&pred.entry&&pred.exit&&tail.entry&&tail.exit&&receiverRouteExit?'observed':reached<w.startTick?'not_reached':reached<w.endTick?'censored':'missing',candidate,sourceId:p.source.id,receiverId:p.receiver.id,route:run.route,wholeWindowDense:complete,continuousFromRealTickZero:continuous,source,receiver,remainingIslands:remaining,predecessorBridge:pred,packageBridge:tail,nextDemand:{kind:p.successor.kind,...next},oppositeReceiver:{inheritedSourceSide:rf.source.side,inheritedReceiverSide:rf.receiver.side,oppositeSides:rf.source.side!==rf.receiver.side,sourceChecks,receiverChecks,routeExit:receiverRouteExit},seamActualRows:kept,commandTicks:flaps.filter(t=>t>=w.startTick&&t<w.endTick),physicalCollisionEvents:(trace.events??[]).filter(e=>e.type==='death'),missingBodyOrStateIsNeverZeroDemand:true,measurement:'Saved circle/segment exact Euclidean body margin, real horizontal overlap and last exit; AABB planning guard and conservative sweep remain separate',inapplicableInheritedClaim:'b005 fixed-rectangle savedEdge +/-0.5s body-gap equality at donor→hammer',humanNaturalRouteSelection:null,humanCueResponse:null,humanFun:null,qualityThreshold:null};
}
function observe(map,run,trace,context){try{return observer(map,run,trace,context);}catch(e){return{schema:VERSION,status:'invalid',reason:e.message};}}
function observePair(pm,pr,pt,cm,cr,ct){
 const context=cm.design?.relocatedHammerProgram;if(!context)return{schema:VERSION,status:'unsupported'};
 if(!same(pm.condition,cm.condition)||!same(pm.routes,cm.routes)||pr.route!==cr.route)return{schema:VERSION,status:'invalid',reason:'pair physical condition/routes/role mismatch'};
 const parent=observe(pm,pr,pt,context),candidate=observe(cm,cr,ct,context),a=parent.seamActualRows??[],b=candidate.seamActualRows??[];
 const comparable=parent.status==='observed'&&candidate.status==='observed'&&same(parent.window,candidate.window)&&parent.continuousFromRealTickZero&&candidate.continuousFromRealTickZero;
 const at=new Set(parent.commandTicks??[]),bt=new Set(candidate.commandTicks??[]),changed=[...new Set([...at,...bt])].filter(t=>at.has(t)!==bt.has(t)).sort((x,y)=>x-y);
 const geometric=[];if(comparable){const rows=new Map(a.map(r=>[r[0],r]));for(const f of ct.bodySamples.filter(f=>f.tick>=candidate.window.startTick&&f.tick<=candidate.window.endTick)){const r=rows.get(f.tick),bs=f.bodies.filter(x=>x.sourceId===context.phrase.source.id&&live(x));if(r&&bs.length===2){const d=Math.min(...bs.map(x=>pointMargin(r[1],r[2],x)));if(d<=0)geometric.push({tick:f.tick,marginPx:d});}}}
 return{schema:VERSION,status:comparable?'observed':'incomplete',parent,candidate,actualActionChanges:comparable?{changedCommandTicks:changed,commandCountDelta:bt.size-at.size,maxAbsoluteYDifferencePx:Math.max(...a.map((r,i)=>Math.abs(r[2]-b[i][2]))),maxAbsoluteVyDifference:Math.max(...a.map((r,i)=>Math.abs(r[3]-b[i][3])))}:null,parentPathAgainstCandidateSavedBody:comparable?{overlap:geometric,causalPhysicalReplay:false,scope:'geometry-only contrast; no necessity or causal collision claim'}:null,requiresEveryRouteToChange:false,botFailureFunVeto:false,humanFun:null};
}
module.exports={VERSION,observe,observePair};
