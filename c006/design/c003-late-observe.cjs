'use strict';
// Pure reduction of retained actual rows and bodies. Never calls runtime poses.
const Core=require('./c003-saved-local-core.cjs'),Shape=require('../harness/b008-metrics.cjs');
const Macro=require('../source/c003-late-macro-core.cjs'),U=require('../source/recovery-utils.cjs');
const VERSION='c003-saved-late-package-body-and-seam/1',HZ=120,VX=150,R=10;
const need=(v,s)=>{if(!v)throw Error('c003 late observer: '+s);};
const state=r=>r?{tick:r[0],x:r[1],y:r[2],vy:r[3],alive:!!r[5],vx:r[6],absoluteSeconds:r[7]}:null;
function requiredPass(view,descriptor,side=null){
 const raw=Core.bodyPass(view,descriptor.id,side),frames=new Map(view.bodySamples.map(f=>[f.tick,f]));
 const left=descriptor.x-R,right=descriptor.x+descriptor.collider.w+R,issues=[];
 for(const row of view.rows){
  // One physical tick on either side suffices to bracket the entire fixed-x slab.
  if(row[1]<left-VX/HZ||row[1]>right+VX/HZ)continue;
  const bodies=frames.get(row[0])?.bodies.filter(b=>b.id===descriptor.id)??[];
  if(bodies.length!==1){issues.push({tick:row[0],status:'missing',reason:'required-actual-slab-body-absent-or-duplicate'});continue;}
  const b=bodies[0];
  if(b.shape!=='rectangle'||b.kind!==descriptor.mechanic_kind||b.sourceId!==descriptor.id||b.x!==descriptor.x||b.w!==descriptor.collider.w||b.h!==descriptor.collider.h||!Number.isFinite(b.y)||(descriptor.motion===null&&b.y!==descriptor.y))issues.push({tick:row[0],status:'invalid',reason:'actual-body-differs-from-authenticated-current-descriptor'});
 }
 const last=view.rows.at(-1),status=issues.some(q=>q.status==='invalid')?'invalid':issues.length?'missing':raw.status==='not_reached'&&last?.[1]>=left?'missing':raw.status;
 return{...raw,status,passed:raw.passed&&!issues.length&&status==='observed',requiredGeometryIssues:issues,expectedFixedHorizontalSlab:[left,right],actualPoseSource:'saved frame body only'};
}
function bridge(view,connector){
 const rows=view.rows,entryIndex=rows.findIndex(r=>r[1]>=connector.startX),exitIndex=rows.findIndex(r=>r[1]>=connector.boundaryX),entry=rows[entryIndex],exit=rows[exitIndex],before=rows[entryIndex-1],after=rows[exitIndex+1];
 const firstX=rows[0]?.[1],lastX=rows.at(-1)?.[1],selected=entry&&exit?rows.slice(entryIndex,exitIndex+1):[],dense=selected.length>0&&selected.every((r,i)=>!i||r[0]===selected[i-1][0]+1);
 const bracketed=!!before&&before[1]<connector.startX&&!!after&&after[1]>connector.boundaryX;
 const status=!rows.length||lastX<connector.startX?'not_reached':firstX>=connector.startX?'missing':!exit||!after?'censored':!dense||!bracketed?'missing':'observed';
 const commandTicks=entry&&exit?view.flapTicks.filter(t=>t>=entry[0]&&t<exit[0]):null;
 return{status,passed:status==='observed'&&selected.every(r=>r[5])&&!!before[5]&&!!after[5],entry:state(entry),exit:state(exit),before:state(before),after:state(after),dense,bracketed,
  authoredSeconds:(connector.boundaryX-connector.startX)/VX,actualSeconds:entry&&exit?(exit[0]-entry[0])/HZ:null,commandTicks,
  controllerEntry:(view.controllerStats?.connectorEvents??[]).find(e=>e.type==='connector-entry'&&e.x===connector.boundaryX)??null,
  pendingQueue:'continuously live from tick zero; internal pending inputs unavailable, never restored'};
}
function reduceUnsafe(map,run,trace,window,plan){
 need(['main','branch'].includes(run.route),'current route required');
 const view=Core.normalizeOrdinarySourceIds(Core.windowView(trace,window),map),coverage=Core.validateView(view);
 const continuity=trace.initialState?.tick===0&&trace.continuity?.startedAtTick===0&&trace.continuity.restorationUsed===false&&trace.continuity.prefixPhysicalTicksCharged===trace.finalState?.tick;
 const packages=[9,10].map(slot=>{
  const facts=Macro.geometryFacts(map,slot),coreIds=new Set(facts.bodyIds),owned=map.obstacles.filter(o=>U.ownedIndex(o.id)===slot);
  const sides=facts.routeSides[run.route]??null;
  const bodyPasses=owned.map(o=>requiredPass(view,o,coreIds.has(o.id)&&sides?sides[facts.bodyIds.indexOf(o.id)]:null));
  const units=facts.units.map(u=>{const parts=u.bodyIds.map(id=>bodyPasses.find(b=>b.sourceId===id));return{bodyIds:u.bodyIds,passed:parts.every(p=>p.passed),firstTick:parts.every(p=>p.first)?Math.min(...parts.map(p=>p.first.tick)):null,fullExitTick:parts.every(p=>p.fullExit)?Math.max(...parts.map(p=>p.fullExit.tick)):null};});
  const ordered=units.every((u,i)=>u.passed&&(!i||units[i-1].fullExitTick<u.firstTick));
  const recovery=bridge(view,map.routes[run.route].connectors[slot]);
  const move=map.design.lateMacroProgram?.moves.find(q=>q.slot===slot);
  return{slot,sourceIndex:move?.sourceIndex??slot,demand:facts.demand,enforcedRouteSides:sides,actualUnits:units,bodyPasses,bodyOrderObserved:ordered,recovery,
   passed:bodyPasses.every(p=>p.passed)&&ordered&&recovery.passed};
 });
 const predecessor=bridge(view,map.routes[run.route].connectors[8]);
 const previousBodies=map.obstacles.filter(o=>U.ownedIndex(o.id)===8),lastCoreX=Math.max(...previousBodies.filter(o=>!/-tail-|-recovery-/.test(o.id)).map(o=>o.x));
 const approachBodies=previousBodies.filter(o=>o.x===lastCoreX||/-tail-|-recovery-/.test(o.id)).map(o=>requiredPass(view,o));
 const firstX=Math.min(...map.obstacles.filter(o=>U.ownedIndex(o.id)===11&&!/-tail-|-recovery-/.test(o.id)).map(o=>o.x));
 const next=map.obstacles.filter(o=>U.ownedIndex(o.id)===11&&o.x===firstX).map(o=>requiredPass(view,o));
 const lastUnit=packages[1].actualUnits.at(-1),nextFirst=next.every(p=>p.first)?Math.min(...next.map(p=>p.first.tick)):null;
 const orderedAcrossPackages=packages[0].actualUnits.at(-1).fullExitTick!==null&&packages[1].actualUnits[0].firstTick!==null&&packages[0].actualUnits.at(-1).fullExitTick<packages[1].actualUnits[0].firstTick;
 const downstream=next.length>0&&next.every(p=>p.passed)&&lastUnit.fullExitTick!==null&&nextFirst!==null&&lastUnit.fullExitTick<nextFirst;
 const actualPassed=continuity&&coverage.fullWindow&&predecessor.passed&&approachBodies.every(p=>p.passed)&&packages.every(p=>p.passed)&&orderedAcrossPackages&&downstream;
 const typedRequest=run.arm==='candidate'?{firstDemand:plan.request.macro.firstDemand,demandSatisfied:plan.request.macro.firstDemand==='any'||packages[0].demand===plan.request.macro.firstDemand,
  requestedFirstRecoveryTicks:Math.round(plan.request.macro.firstRecoverySeconds*HZ),actualFirstRecoveryTicks:packages[0].recovery.actualSeconds===null?null:Math.round(packages[0].recovery.actualSeconds*HZ),
  recoverySatisfied:packages[0].recovery.status==='observed'&&Math.round(packages[0].recovery.actualSeconds*HZ)===Math.round(plan.request.macro.firstRecoverySeconds*HZ)}:{scope:'scientific parent is measured against its own current route/geometry; new request satisfaction is a candidate obligation'};
 const parts=[predecessor,...approachBodies,...packages.flatMap(p=>[p.recovery,...p.bodyPasses]),...next];
 const status=parts.some(p=>p.status==='invalid')?'invalid':coverage.status==='missing'||parts.some(p=>p.status==='missing')?'missing':coverage.status==='not_reached'?'not_reached':actualPassed?'observed':'censored';
 return{schema:VERSION,status,window,coverage,continuousFromTickZero:continuity,predecessorBridge:predecessor,approachBodies,packages,nextDemand:next,orderedAcrossPackages,downstreamFullBodyExitObserved:downstream,
  typedRequest,actualRelationPassed:actualPassed,requestSatisfied:run.arm!=='candidate'||typedRequest.demandSatisfied&&typedRequest.recoverySatisfied,
  sourceIdInference:view.sourceIdInference,sourceCollisionEvents:(view.events??[]).filter(e=>e.type==='death'&&[8,9,10,11].includes(U.ownedIndex(e.sourceId??e.id??''))),
  scopedPhysicsAuthority:'actual frame margins and saved substep death events; integer frame margins alone are not a continuous collision proof',humanFun:null,internalVisualSymmetryCreated:false,actualRecoveryQuality:null};
}
function reduce(map,run,trace,window,plan){
 if(plan.request.macro===null)return{schema:VERSION,status:'not_applicable',actualRelationPassed:true,requestSatisfied:true,reason:'exact accepted macro-null call-through; no new macro evidence claimed'};
 try{return Core.compact(reduceUnsafe(map,run,trace,window,plan));}catch(e){return{schema:VERSION,status:'invalid',reason:e.message,actualRelationPassed:false,requestSatisfied:false};}
}
module.exports={VERSION,reduce,requiredPass,bridge};
