'use strict';
// Saved rows/body reducer only. No engine import, obstacle generation or physics.
const Q=require('../../harness/b008-metrics.cjs'),same=require('node:util').isDeepStrictEqual;
const VERSION='b009-saved-timed-per-body-reducer/1',R=10,HZ=120;
const finite=Number.isFinite,need=(x,s)=>{if(!x)throw Error('Timed observer: '+s);};
const rectMargin=(row,b)=>Math.hypot(Math.max(b.x-row[1],0,row[1]-b.x-b.w),Math.max(b.y-row[2],0,row[2]-b.y-b.h))-R;
const live=b=>b.lethal===true&&!['warning','idle','cleared'].includes(b.status);
function panelPair(source,ids,bodies){
 const bs=bodies.filter(b=>b.sourceId===source||ids.includes(b.id));
 need(bs.length===2&&ids.every(id=>bs.filter(b=>b.id===id).length===1),'missing/duplicate/misattributed actual timed panel');
 const [top,bottom]=ids.map(id=>bs.find(b=>b.id===id));
 need(bs.every(b=>b.sourceId===source&&b.kind==='timed_armor_gate'&&b.shape==='rectangle'&&[b.x,b.y,b.w,b.h].every(finite)&&b.w>0&&b.h>0&&b.lethal===true),'descriptor or malformed body used as timed panel');
 need(top.x===bottom.x&&top.w===bottom.w&&top.status===bottom.status&&top.phase===bottom.phase,'panel x/width/activity mismatch');
 const gap=bottom.y-top.y-top.h;need(gap>=-1e-7&&['closed','opening','open','closing'].includes(top.status),'invalid panel aperture/status');
 need(top.phase==='warning'?top.status==='closed'&&Math.abs(gap)<1e-7:top.phase===top.status,'warning must remain closed, zero-gap and lethal');
 return{top,bottom,gap,centerY:(bottom.y+top.y+top.h)/2};
}
function captureWindow(map,context=map.design?.timedApertureProgram){
 need(context?.phrase,'typed aperture phrase required');const c=map.design.componentTimeline[context.componentIndex];
 return{layer:'combo',startTick:c.startTick,endTick:Math.min(map.horizon,c.endTick+1)};
}
function reduce(map,run,trace,context=map.design?.timedApertureProgram){
 need(context?.schema==='exact-b005-timed-aperture-receiver/1','typed timed aperture declaration required');need(['main','branch'].includes(run?.route),'declared route required');
 const p=context.phrase,w=trace.retentionWindow??trace.continuity?.window,expectedWindow=captureWindow(map,context);need(w&&w.startTick===expectedWindow.startTick&&w.endTick>=expectedWindow.endTick,'full phrase and boundary+1 retained window required');
 const rows=trace.rows??[],frames=trace.bodySamples??[],commands=new Set(trace.flapTicks??[]);need(new Set(rows.map(r=>r[0])).size===rows.length&&new Set(frames.map(f=>f.tick)).size===frames.length,'duplicate actual rows/frames');
 const byTick=new Map(rows.map(r=>[r[0],r])),byFrame=new Map(frames.map(f=>[f.tick,f]));
 const reached=Math.min(w.endTick,trace.finalState?.tick??-1),kept=rows.filter(r=>r[0]>=w.startTick&&r[0]<=reached),missing=[];
 for(let t=w.startTick;t<=reached;t++){const row=byTick.get(t),f=byFrame.get(t);if(!row||!f){missing.push(t);continue;}need(row.length>=8&&[row[0],row[1],row[2],row[3],row[6],row[7]].every(finite)&&Math.abs(row[7]-t/HZ)<1e-9&&[0,1].includes(row[4])&&[0,1].includes(row[5]),'malformed saved player row');need(f.x===row[1]&&f.y===row[2]&&new Set(f.bodies.map(b=>b.id)).size===f.bodies.length,'frame/player mismatch or duplicate body');need(!!row[4]===commands.has(t-1),'saved input-causing-row mismatch');}
 const state=r=>r?{tick:r[0],x:r[1],y:r[2],vy:r[3],alive:!!r[5],inputCausingRow:!!r[4],commandAtTick:commands.has(r[0])}:null;
 const continuous=trace.initialState?.tick===0&&trace.continuity?.startedAtTick===0&&trace.continuity?.restorationUsed===false&&trace.continuity?.prefixPhysicalTicksCharged===trace.finalState?.tick;
 const deaths=(trace.events??[]).filter(e=>e.type==='death'),candidate=!!map.design?.timedApertureProgram;
 function group(ids,descriptors,side=null,timed=false){
  // Fixed-horizontal neighbors are reduced per body. Shorter members may leave
  // the saved viewport after their own observed exit while longer members remain.
  if(!timed&&ids.length>1){
   need(ids.length===descriptors.length&&descriptors.every(o=>o.collider?.shape==='rectangle'&&(!o.motion||o.mechanic_kind==='vertical_armor_slider')),'per-body neighbors require invariant horizontal extent');
   const parts=descriptors.map(o=>group([o.id],[o],side,false));
   const complete=parts.every(q=>q.status==='observed'),pick=(key,last=false)=>complete?parts.map(q=>q[key]).filter(Boolean).sort((a,b)=>(last?-1:1)*(a.tick-b.tick))[0]??null:null;
   const ticks=[...new Set(parts.flatMap(q=>q.samples.map(s=>s.tick)))].sort((a,b)=>a-b),samples=ticks.map(t=>{const ss=parts.flatMap(q=>q.samples.filter(s=>s.tick===t)),margins=ss.flatMap(s=>s.margins);return{...ss[0],slab:ss.some(s=>s.slab),core:ss.some(s=>s.core),lethal:ss.every(s=>s.lethal),margins,minExactMarginPx:Math.min(...margins.map(q=>q.marginPx)),intendedSide:ss.every(s=>s.intendedSide),bodies:ss.flatMap(s=>s.bodies)};});
   return{status:parts.some(q=>q.status==='invalid')?'invalid':parts.some(q=>q.status==='missing')?'missing':complete?'observed':'censored',bodyIds:ids,requestedSide:side,issues:parts.flatMap(q=>q.issues.map(e=>({...e,bodyId:q.bodyIds[0]}))),passed:complete&&parts.every(q=>q.passed),dense:parts.every(q=>q.dense),bracketedWholeBodyPassage:parts.every(q=>q.bracketedWholeBodyPassage),firstBodyOverlap:pick('firstBodyOverlap'),lastBodyOverlap:pick('lastBodyOverlap',true),fullBodyExit:pick('fullBodyExit',true),coreEntry:pick('coreEntry'),coreExit:pick('coreExit',true),minimumOverlapMarginPx:parts.every(q=>q.minimumOverlapMarginPx!==null)?Math.min(...parts.map(q=>q.minimumOverlapMarginPx)):null,wrongSideTicks:[...new Set(parts.flatMap(q=>q.wrongSideTicks))].sort((a,b)=>a-b),samples,perBody:parts,aggregation:'Every body independently retains actual entry bracket, dense overlap and strict-right exit; later disappearance of an exited short body does not invalidate an unrelated longer member.'};
  }
  const x=Math.min(...descriptors.map(o=>o.x)),endX=Math.max(...descriptors.map(o=>o.x+o.collider.w)),samples=[],issues=[];
  for(const row of kept){const f=byFrame.get(row[0]);if(!f)continue;const expected=row[1]>=x-640&&row[1]<=endX+160,bs=f.bodies.filter(b=>ids.includes(b.id)||timed&&b.sourceId===context.sourceId);
   if(!bs.length){if(expected)issues.push({tick:row[0],status:'missing',reason:'expected-saved-body-absent'});continue;}
   if(bs.length!==ids.length){issues.push({tick:row[0],status:'missing',reason:'partial-body-group'});continue;}
   let aperture=null;try{if(timed){aperture=panelPair(context.sourceId,ids,f.bodies);need(aperture.top.x===context.descriptor.x&&aperture.top.w===context.descriptor.collider.w&&Math.abs(aperture.centerY-context.descriptor.y)<1e-7&&aperture.top.y===-120&&Math.abs(aperture.bottom.y+aperture.bottom.h-map.height-120)<1e-7,'timed body structural geometry mismatch');}else need(ids.every(id=>bs.some(b=>b.id===id))&&bs.every(b=>b.shape==='rectangle'&&b.sourceId===b.id&&[b.x,b.y,b.w,b.h].every(finite)&&b.w>0&&b.h>0&&live(b)),'invalid neighboring actual rectangle');need(bs.every(b=>{const d=descriptors.find(o=>o.id===b.id);return timed||d&&b.x===d.x&&b.w===d.collider.w&&b.kind===d.mechanic_kind&&(d.motion!==null||b.y===d.y&&b.h===d.collider.h);}), 'neighbor actual descriptor/geometry mismatch');}catch(e){issues.push({tick:row[0],status:'invalid',reason:e.message});continue;}
   const slab=row[1]+R>=x&&row[1]-R<=endX,core=row[1]>=x&&row[1]<=endX;
   const margins=bs.map(b=>({id:b.id,marginPx:rectMargin(row,b)}));
   let topMargin=null,bottomMargin=null;if(aperture){const ts=Q.rectangleSlice(row[1],aperture.top,R),bslice=Q.rectangleSlice(row[1],aperture.bottom,R);topMargin=ts?row[2]-ts[1]:null;bottomMargin=bslice?bslice[0]-row[2]:null;}
   const intendedSide=side?(side==='above'?row[2]<bs[0].y+bs[0].h/2:row[2]>bs[0].y+bs[0].h/2):true;
   samples.push({tick:row[0],state:state(row),slab,core,phase:timed?aperture.top.phase:null,status:timed?aperture.top.status:null,lethal:bs.every(live),physicalGapPx:aperture?.gap??null,coreNetClearancePx:aperture?aperture.gap-2*R:null,topInnerY:aperture?aperture.top.y+aperture.top.h:null,bottomInnerY:aperture?.bottom.y??null,apertureCenterY:aperture?.centerY??null,topSliceMarginPx:topMargin,bottomSliceMarginPx:bottomMargin,margins,minExactMarginPx:Math.min(...margins.map(q=>q.marginPx)),intendedSide,bodies:bs});
  }
  const overlap=samples.filter(s=>s.slab),core=samples.filter(s=>s.core),first=overlap[0],last=overlap.at(-1),before=first?samples.find(s=>s.tick===first.tick-1):null,after=last?samples.find(s=>s.tick===last.tick+1):null;
  const dense=!!first&&overlap.length===last.tick-first.tick+1,full=!!before&&!before.slab&&before.state.x<x-R&&!!after&&!after.slab&&after.state.x>endX+R;
  const good=overlap.every(s=>s.state.alive&&s.minExactMarginPx>0&&s.intendedSide),recordedDeath=deaths.some(e=>ids.includes(e.id)||timed&&e.sourceId===context.sourceId);
  const status=issues.some(q=>q.status==='invalid')?'invalid':issues.length||missing.length?'missing':!first?(trace.finalState?.x<x-R?'censored':'missing'):!dense?'missing':!full?'censored':'observed';
  return{status,bodyIds:ids,requestedSide:side,issues,passed:status==='observed'&&good&&!recordedDeath,dense,bracketedWholeBodyPassage:full,firstBodyOverlap:first??null,lastBodyOverlap:last??null,fullBodyExit:full?after:null,coreEntry:core[0]??null,coreExit:core.at(-1)??null,minimumOverlapMarginPx:overlap.length?Math.min(...overlap.map(s=>s.minExactMarginPx)):null,wrongSideTicks:overlap.filter(s=>!s.intendedSide).map(s=>s.tick),samples};
 }
 const target=p.pairs[1],aperture=group(candidate?context.runtimeBodyIds:[target.top.id,target.bottom.id],candidate?[context.descriptor]:[target.top,target.bottom],null,candidate);
 const previous=group([p.pairs[0].top.id,p.pairs[0].bottom.id],[p.pairs[0].top,p.pairs[0].bottom]);
 const above=group([p.receivers[0].descriptor.id],[p.receivers[0].descriptor],'above'),below=group([p.receivers[1].descriptor.id],[p.receivers[1].descriptor],'below');
 const next=group([p.pairs[2].top.id,p.pairs[2].bottom.id],[p.pairs[2].top,p.pairs[2].bottom]),tail=group(p.tail.map(o=>o.id),p.tail),recovery=group(p.recovery.map(o=>o.id),p.recovery);
 const cross=x=>kept.find(r=>r[1]>=x),be=cross(p.connector.startX),bx=cross(p.connector.boundaryX),bridgeRows=kept.filter(r=>be&&bx&&r[0]>=be[0]&&r[0]<=bx[0]);
 const bridge={entry:state(be),exit:state(bx),dense:!!be&&!!bx&&bridgeRows.length===bx[0]-be[0]+1,alive:!!be&&!!bx&&bridgeRows.every(r=>r[5]),commandTicks:be&&bx?[...commands].filter(t=>t>=be[0]&&t<bx[0]):null,connectorPlan:(trace.controllerStats?.connectorEvents??[]).find(e=>e.type==='connector-plan'&&be&&e.tick===be[0])??null,connectorEntry:(trace.controllerStats?.connectorEvents??[]).find(e=>e.type==='connector-entry'&&Math.abs(e.x-p.connector.boundaryX)<1e-7)??null,continuousQueue:trace.controllerQueueContinuity??null};
 const observedA=aperture.samples,warning=observedA.find(s=>s.phase==='warning'&&s.status==='closed'&&s.lethal&&s.bodies.some(b=>b.x<=s.state.x+520&&b.x+b.w>=s.state.x-R)),opening=observedA.find(s=>s.status==='opening'),closing=observedA.find(s=>s.status==='closing');
 const occupancy=candidate?Object.fromEntries([['opening','opening'],['hold','open'],['closing','closing']].map(([label,status])=>{const ss=observedA.filter(s=>s.slab&&s.status===status);return[label,{actualOccupiedTickCount:ss.length,first:ss[0]??null,last:ss.at(-1)??null,commandTicks:ss.filter(s=>s.state.commandAtTick).map(s=>s.tick),gapRangePx:ss.length?[Math.min(...ss.map(s=>s.physicalGapPx)),Math.max(...ss.map(s=>s.physicalGapPx))]:null,edgeVelocitySamples:ss.slice(1).flatMap((s,i)=>s.tick===ss[i].tick+1?[{tick:s.tick,topPxPerSecond:(s.topInnerY-ss[i].topInnerY)*HZ,bottomPxPerSecond:(s.bottomInnerY-ss[i].bottomInnerY)*HZ}]:[])}];})):null;
 const groups=[previous,above,aperture,below,next,tail,recovery],order=groups.every((g,i)=>!i||groups[i-1].fullBodyExit&&g.firstBodyOverlap&&groups[i-1].fullBodyExit.tick<g.firstBodyOverlap.tick);
 const whole=continuous&&!missing.length&&reached===w.endTick&&kept.every(r=>r[5])&&groups.every(g=>g.status==='observed')&&bridge.dense&&bridge.alive;
 const rawChecks=(run.metrics?.routeEvents??[]).filter(e=>p.receivers.some(r=>r.routeFacts.some(q=>q.checkpoint.id===e.id))||p.pairs.some(q=>q.record.pairId===e.id));
 return{schema:VERSION,status:groups.some(g=>g.status==='invalid')?'invalid':missing.length||groups.some(g=>g.status==='missing')?'missing':whole?'observed':'censored',window:w,candidate,missingTicks:missing,continuousFromTickZero:continuous,coverage:{wholePhrase:whole,nextComponentFirstDemand:false},rawGuards:{taskPass:run.taskPass??null,checkpoints:rawChecks},actualRelation:{passed:whole&&groups.every(g=>g.passed)&&order&&(!run.role?.startsWith('assigned_')||!!bridge.connectorEntry)&&(!candidate||!!warning&&Object.values(occupancy).every(o=>o.actualOccupiedTickCount>0)),ordered:order,apertureThenIntendedReceiver:aperture.passed&&below.passed&&!!aperture.fullBodyExit&&!!below.firstBodyOverlap&&aperture.fullBodyExit.tick<below.firstBodyOverlap.tick},previousGate:previous,aboveReceiver:above,aperture,belowReceiver:below,nextGate:next,tail,recovery,bridge,occupancy,visibleLethalWarning:warning??null,timing:{warningToOpeningSeconds:warning&&opening?(opening.tick-warning.tick)/HZ:null,warningToBodyEntrySeconds:warning&&aperture.firstBodyOverlap?(aperture.firstBodyOverlap.tick-warning.tick)/HZ:null,closingToFullExitSeconds:closing&&aperture.fullBodyExit?(aperture.fullBodyExit.tick-closing.tick)/HZ:null},physicalDeathEvents:deaths,actualRows:kept,commandTicks:[...commands].filter(t=>t>=w.startTick&&t<w.endTick),postGateAuthoredWholeBodyGapPx:context.postApertureWholeBodyGapPx,continuousSubstepCollisionAuthority:'authenticated run/events; integer-tick geometric margins do not establish continuous collision freedom',warningCausalResponse:null,naturalRouteChoice:null,humanFun:null,visiblePlayerBrowserTouch:null,H1DiagnosticOnly:true};
}
function safeReduce(map,run,trace,context){try{return reduce(map,run,trace,context);}catch(e){return{schema:VERSION,status:'invalid',reason:e.message,actualRelation:{passed:false}};}}

// Pure reduction only. Production callers must authenticate an unchanged parent
// trace and select a declared named window before reaching this function.
module.exports={VERSION,panelPair,captureWindow,rectMargin,reduce:safeReduce,EXTRACTED_FROM:{path:'harness/b008-observer-v2.cjs',sha256:'9cd42cdb2643f4fa3114196a1e048ab78d7e6e79c59c637c602256453d8ab910'}};
