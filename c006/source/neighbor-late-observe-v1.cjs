'use strict';
// Pure saved-body reducer. No authenticated run admission, simulation, body pose
// synthesis, source replay, or threshold edits. All c003 modules stay untouched.
const path=require('node:path');
const VERSION='prospective-neighbor-saved-late-package-body-and-seam/1';
const need=(v,s)=>{if(!v)throw Error('Neighbor late observer: '+s);};
function create({sourceRoot,macro}){
 const root=path.resolve(sourceRoot,'..'),Core=require(path.join(root,'design/c003-saved-local-core.cjs'));
 const Old=require(path.join(root,'design/c003-late-observe.cjs')),U=require(path.join(sourceRoot,'recovery-utils.cjs'));
 const Macro=macro,BodyContract=require('./neighbor-saved-body-contract-v1.cjs').create({sourceRoot,macro});
 const {requiredPass,bridge}=Old,HZ=120;
 function macroRequest(plan){
  const q=plan?.request?.schema==='late-macro-request/1'?plan.request:plan?.request?.macro;
  need(q===null||q?.schema==='late-macro-request/1','explicit supported macro request absent');return q;
 }
function reduceUnsafe(map,run,trace,window,plan){
 need(['main','branch'].includes(run.route),'current route required');
 const requested=macroRequest(plan);need(requested,'explicit non-null macro request required');
 const view=Core.normalizeOrdinarySourceIds(Core.windowView(trace,window),map),coverage=Core.validateView(view);
 const continuity=trace.initialState?.tick===0&&trace.continuity?.startedAtTick===0&&trace.continuity.restorationUsed===false&&trace.continuity.prefixPhysicalTicksCharged===trace.finalState?.tick;
 const packages=[9,10].map(slot=>{
  const facts=Macro.geometryFacts(map,slot),coreIds=new Set(facts.bodyIds),owned=map.obstacles.filter(o=>U.ownedIndex(o.id)===slot);
  const sides=facts.routeSides[run.route]??null,auxiliaryById=new Map(facts.auxiliaryBodies.map(n=>[n.bodyId,n]));
  const bodyPasses=owned.map(o=>requiredPass(view,o,coreIds.has(o.id)&&sides?sides[facts.bodyIds.indexOf(o.id)]:auxiliaryById.get(o.id)?.requiredSide??null));
  const units=facts.units.map(u=>{const parts=u.bodyIds.map(id=>bodyPasses.find(b=>b.sourceId===id));return{bodyIds:u.bodyIds,passed:parts.every(p=>p.passed),firstTick:parts.every(p=>p.first)?Math.min(...parts.map(p=>p.first.tick)):null,fullExitTick:parts.every(p=>p.fullExit)?Math.max(...parts.map(p=>p.fullExit.tick)):null};});
  const ordered=units.every((u,i)=>u.passed&&(!i||units[i-1].fullExitTick<u.firstTick));
  const recovery=bridge(view,map.routes[run.route].connectors[slot]);
  const auxiliary=facts.auxiliaryBodies.map(n=>{
   const body=bodyPasses.find(b=>b.sourceId===n.bodyId),first=units[0],last=units.at(-1);
   const ordered=n.relation==='before-primary'?!!body.fullExit&&first.firstTick!==null&&body.fullExit.tick<first.firstTick:!!body.first&&last.fullExitTick!==null&&last.fullExitTick<body.first.tick;
   const beforeBridge=!!body.fullExit&&!!recovery.entry&&body.fullExit.tick<recovery.entry.tick;
   return{bodyId:n.bodyId,relation:n.relation,requiredSide:n.requiredSide,passed:body.passed,ordered,beforeBridge};
  });
  const fullBodyFirstTick=bodyPasses.every(b=>b.first)?Math.min(...bodyPasses.map(b=>b.first.tick)):null;
  const fullBodyExitTick=bodyPasses.every(b=>b.fullExit)?Math.max(...bodyPasses.map(b=>b.fullExit.tick)):null;
  const move=map.design.lateMacroProgram?.moves.find(q=>q.slot===slot);
  return{slot,sourceIndex:move?.sourceIndex??slot,demand:facts.demand,enforcedRouteSides:sides,actualUnits:units,bodyPasses,auxiliaryBodies:auxiliary,fullBodyFirstTick,fullBodyExitTick,bodyOrderObserved:ordered,recovery,
   passed:bodyPasses.every(p=>p.passed)&&ordered&&auxiliary.every(a=>a.passed&&a.ordered&&a.beforeBridge)&&recovery.passed};
 });
 const predecessor=bridge(view,map.routes[run.route].connectors[8]);
 const inventory=BodyContract.inventory(map);
 const side=o=>/-adj-upper$/.test(o.id)?'lower':/-adj-lower$/.test(o.id)?'upper':null;
 const approachBodies=inventory.approach.map(o=>requiredPass(view,o,side(o)));
 const next=inventory.successor.map(o=>requiredPass(view,o,side(o)));
 const successorPrimaryIds=new Set(inventory.firstPrimarySuccessor.map(o=>o.id));
 const nextPrimary=next.filter(p=>successorPrimaryIds.has(p.sourceId));
 const successorAuxiliaryOrder=inventory.successorNeighbors.every(n=>{const p=next.find(b=>b.sourceId===n.bodyId);return n.relation==='before-primary'?p.fullExit&&nextPrimary.every(q=>q.first&&p.fullExit.tick<q.first.tick):p.first&&nextPrimary.every(q=>q.fullExit&&q.fullExit.tick<p.first.tick);});
 const lastUnit=packages[1].actualUnits.at(-1),nextFirst=next.every(p=>p.first)?Math.min(...next.map(p=>p.first.tick)):null;
 const orderedAcrossPackages=packages[0].actualUnits.at(-1).fullExitTick!==null&&packages[1].actualUnits[0].firstTick!==null&&packages[0].actualUnits.at(-1).fullExitTick<packages[1].actualUnits[0].firstTick;
 const downstream=next.length>0&&next.every(p=>p.passed)&&lastUnit.fullExitTick!==null&&nextFirst!==null&&lastUnit.fullExitTick<nextFirst;
 const completePackageOrder=packages[0].fullBodyExitTick!==null&&packages[1].fullBodyFirstTick!==null&&packages[0].fullBodyExitTick<packages[1].fullBodyFirstTick;
 const completeSuccessorOrder=packages[1].fullBodyExitTick!==null&&nextFirst!==null&&packages[1].fullBodyExitTick<nextFirst;
 const actualPassed=completePackageOrder&&completeSuccessorOrder&&successorAuxiliaryOrder&&continuity&&coverage.fullWindow&&predecessor.passed&&approachBodies.every(p=>p.passed)&&packages.every(p=>p.passed)&&orderedAcrossPackages&&downstream;
 const typedRequest=run.arm==='candidate'?{firstDemand:requested.firstDemand,demandSatisfied:requested.firstDemand==='any'||packages[0].demand===requested.firstDemand,
  requestedFirstRecoveryTicks:Math.round(requested.firstRecoverySeconds*HZ),actualFirstRecoveryTicks:packages[0].recovery.actualSeconds===null?null:Math.round(packages[0].recovery.actualSeconds*HZ),
  recoverySatisfied:packages[0].recovery.status==='observed'&&Math.round(packages[0].recovery.actualSeconds*HZ)===Math.round(requested.firstRecoverySeconds*HZ)}:{scope:'scientific parent is measured against its own current route/geometry; new request satisfaction is a candidate obligation'};
 const parts=[predecessor,...approachBodies,...packages.flatMap(p=>[p.recovery,...p.bodyPasses]),...next];
 const status=parts.some(p=>p.status==='invalid')?'invalid':coverage.status==='missing'||parts.some(p=>p.status==='missing')?'missing':coverage.status==='not_reached'?'not_reached':actualPassed?'observed':'censored';
 return{schema:VERSION,status,window,coverage,continuousFromTickZero:continuity,predecessorBridge:predecessor,approachBodies,packages,nextDemand:next,orderedAcrossPackages,completePackageOrder,completeSuccessorOrder,successorAuxiliaryOrder,firstPrimarySuccessorBodyIds:[...successorPrimaryIds],successorNeighborBodyIds:inventory.successorNeighbors.map(n=>n.bodyId),downstreamFullBodyExitObserved:downstream,
  typedRequest,actualRelationPassed:actualPassed,requestSatisfied:run.arm!=='candidate'||typedRequest.demandSatisfied&&typedRequest.recoverySatisfied,
  sourceIdInference:view.sourceIdInference,sourceCollisionEvents:(view.events??[]).filter(e=>e.type==='death'&&[8,9,10,11].includes(U.ownedIndex(e.sourceId??e.id??''))),
  scopedPhysicsAuthority:'actual frame margins and saved substep death events; integer frame margins alone are not a continuous collision proof',humanFun:null,internalVisualSymmetryCreated:false,actualRecoveryQuality:null};
}
function reduce(map,run,trace,window,plan){
 try{if(macroRequest(plan)===null)return{schema:VERSION,status:'not_applicable',actualRelationPassed:true,requestSatisfied:true,reason:'exact accepted macro-null call-through; no new macro evidence claimed'};
 return Core.compact(reduceUnsafe(map,run,trace,window,plan));}catch(e){return{schema:VERSION,status:'invalid',reason:e.message,actualRelationPassed:false,requestSatisfied:false};}
}

 function inspectUntrustedFixture(map,run,trace,window,plan){
  const report=reduce(map,run,trace,window,plan);return{...report,fixtureComputedRelationPassed:report.actualRelationPassed,actualRelationPassed:false,requestSatisfied:false,authenticated:false,physicsQualification:false,qualificationBlocked:true};
 }
 return{VERSION,reduce,inspectUntrustedFixture,captureContract:BodyContract.captureContract};
}
module.exports={VERSION,create};
