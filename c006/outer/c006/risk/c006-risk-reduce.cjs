'use strict';
// Local diagnostic admission only. Never import the full-course c005 observer.
const C=require('../../../harness/common.cjs'),R=require('../../../harness/general-runner.cjs'),D=require('../../../harness/general-freeze.cjs');
const Laser=require('../../../design/c005-observe-laser.cjs'),same=require('node:util').isDeepStrictEqual;
const BASE='c005-candidate-explore-02-assigned_alternate',PURE='design/c005-observe-laser.cjs',PURE_HASH='077269fa7e8e349a7c004c0cfbdd5318946e60cd3c239219d7dca7634a495de1';
const EXPECTED={y:295.0001,vy:7.197080291970806,lead:15.181818181818182,phase:0.03267716535433074,adjacency:'none',seed:2444376036};
const need=(v,s)=>{if(!v)throw Error('c006 risk admission: '+s);};
const dependencyHash=f=>C.sha(Object.fromEntries(Object.entries(f.files).filter(([p])=>p.startsWith('source/vendor/')||p.startsWith('harness/')||p==='design/storage-v2/retention-codec-v2.cjs')));
function common(id){
 const run=R.load(id),trace=R.trace(run),map=C.readGz(C.within(C.ROOT,run.mapFile));
 need(C.sha(map)===run.mapHash&&C.sha({obstacles:map.obstacles,routes:map.routes,components:map.components})===run.geometryHash,'map and geometry');
 need(run.role==='assigned_alternate'&&trace.role===run.role&&run.route==='branch'&&trace.route===run.route,'fixed role');
 need(run.physicalStarted&&trace.inputSource==='live-frozen-controller'&&!run.referenceId,'real live-controller evidence');
 need(same(R.physicalCondition(run.condition),R.physicalCondition(map.condition))&&R.conditionKey(run.condition)===run.conditionHash&&trace.conditionHash===run.conditionHash,'six physical fields');
 need(run.generator.module==='source/c005-laser-generator.cjs'&&run.generator.export==='compile','unchanged c005 producer');
 const record=run.generationEnvelope;
 need(record?.schema==='intent-generation-envelope/1'&&C.sha(record)===run.generationEnvelopeSHA256&&C.sha(record.plan)===run.planSHA256,'committed envelope');
 need(record.plan.selectedNormalForm==='LT'&&record.plan.macroPlan===null&&record.plan.request.companion.macro===null,'LT and null macro');
 const envelope=R.pureGeneration(run.generator,run.condition);
 need(same(envelope,{...record,map}),'exact current c005 producer/map/plan identity');
 need(C.sha(C.fs.readFileSync(C.within(C.ROOT,PURE)))===PURE_HASH,'unchanged pure c005 Laser.reduce');
 return{run,trace,map,plan:record.plan};
}
function baseline(){
 const b=common(BASE),f=C.checkSourceSnapshot(b.run.freeze),receipt=D.verifyReceipt('protocols/receipts/c005-formal-v1.json',b.run.freeze);
 need(same(R.physicalCondition(b.run.condition),EXPECTED)&&b.run.pool==='main'&&b.run.stopTick===14400,'exact existing witness');
 need(f.manifestHash===b.run.sourceManifestHash&&receipt.receiptHash===b.run.receiptHash&&dependencyHash(f)===b.run.executionDependencyHash,'baseline frozen closure/receipt/dependencies');
 const report=Laser.reduce(b.map,b.run,b.trace,b.plan.laserProgram,{expectedSourceManifestHash:f.manifestHash});
 need(report.status==='observed'&&report.source.sourcePassed===true&&report.source.actualEndpointClearance.minimumActiveCapsuleDistancePx===1.1993583385478637,'baseline raw margin/source');
 return{...b,report};
}
function inputDifference(a,b,startTick,endTick){
 const observedEnd=Math.min(endTick,a.finalState.tick,b.finalState.tick),range={startTick,endTick,observedEndTick:observedEnd};
 const at=a.flapTicks.filter(t=>t>=startTick&&t<observedEnd),bt=b.flapTicks.filter(t=>t>=startTick&&t<observedEnd),as=new Set(at),bs=new Set(bt);
 const changedCommandTicks=[...at.filter(t=>!bs.has(t)),...bt.filter(t=>!as.has(t))].sort((x,y)=>x-y),rows=new Map(a.rows.map(r=>[r[0],r]));
 const pairs=b.rows.filter(r=>r[0]>=startTick&&r[0]<=observedEnd&&rows.has(r[0]));
 return{range,status:observedEnd===endTick?'observed':'censored',baselineInputs:at,probeInputs:bt,changedCommandTicks,changedCommandCount:changedCommandTicks.length,maxPairedYDifferencePx:pairs.length?Math.max(...pairs.map(r=>Math.abs(r[2]-rows.get(r[0])[2]))):null,interpretation:'Observed live-controller input difference across one changed physical parameter; not a same-condition parent comparison, causal warning response, or human tolerance'};
}
function summarize(b,report,base){
 const r=b.run,s=report.source,death=(b.trace.events??[]).filter(e=>e.type==='death'),firstSourceTick=s.actualPassage?.first?.tick??null;
 const classification=report.status==='invalid'?'invalid_local_evidence':s.actualPassage?.status==='not_reached'?'source_not_reached':s.collisionEvents?.length?'source_collision':s.sourcePassed===true?(report.actualRelationPassed?'local_window_survived':'downstream_or_coverage_problem'):'source_not_passed';
 const sourceAction=s.actualAction?.window??{startTick:0,endTick:report.window.endTick};
 return{runId:r.id,condition:R.physicalCondition(r.condition),sourceManifestHash:r.sourceManifestHash,mapHash:r.mapHash,resultSHA256:r.resultSHA256,traceSHA256:r.traceSHA256,inputSHA256:r.inputSHA256,classification,status:r.status,error:r.error,requestedStopTick:r.stopTick,actualTicks:r.ticks,actualSubsteps:r.substeps,serializedRunnerWallSeconds:r.wallSeconds,finalAlive:b.trace.finalState.alive,sourceReached:firstSourceTick!==null,sourceFirstTick:firstSourceTick,sourcePassageStatus:s.actualPassage?.status,sourceFullExitTick:s.actualPassage?.fullExit?.tick??null,sourcePassed:s.sourcePassed===true,sourceCollisionEvents:s.collisionEvents,minimumActiveCapsuleDistancePx:s.actualEndpointClearance.minimumActiveCapsuleDistancePx,activeCrossingSamples:s.actualEndpointClearance.activeCrossingSamples,lifecyclePassed:s.lifecycle?.passed,receiverPassed:report.receiver.passed,nextDemand:report.nextDemand.map(q=>({sourceId:q.sourceId,status:q.status,passed:q.passed})),remainingOwnerProblems:report.remainingOwnerBodies.filter(q=>!q.passed).map(q=>({sourceId:q.sourceId,status:q.status})),coverage:report.coverage,localRelationPassed:report.actualRelationPassed,deathEvents:death,inputDifference:base?{sourceWindow:inputDifference(base.trace,b.trace,sourceAction.startTick,sourceAction.endTick),wholeLocalWindow:inputDifference(base.trace,b.trace,0,report.window.endTick)}:null,wholeCourseTaskPassReportedOnly:r.taskPass,fullCourseQualification:null,humanTolerance:null,fairness:null,automaticMacroVeto:false};
}
function reduce(id,{freeze,receiptPath,preregistrationPath}){
 const base=baseline(),b=common(id),r=b.run,f=C.checkSourceSnapshot(freeze),receipt=D.verifyReceipt(receiptPath,freeze),p=C.read(C.within(C.ROOT,preregistrationPath));
 const slot=p.slots.find(q=>q.id===id);need(f.files[preregistrationPath]===C.sha(C.fs.readFileSync(C.within(C.ROOT,preregistrationPath)))&&same(R.executionSpec(r),slot),'exact frozen local slot');
 need(r.freeze===freeze&&r.sourceManifestHash===f.manifestHash&&b.trace.sourceManifestHash===f.manifestHash&&r.receiptHash===receipt.receiptHash&&r.preregistrationPath===preregistrationPath,'local freeze/receipt');
 need(r.executionDependencyHash===dependencyHash(f)&&b.trace.executionDependencyHash===r.executionDependencyHash&&r.executionDependencyHash===base.run.executionDependencyHash,'unchanged engine/controller/retention closure');
 need(r.pool==='local'&&r.arm==='candidate'&&r.integrity.sourceFrozen===true&&r.integrity.exactTickProgression===true,'local scope/integrity');
 need(same(r.condition.brief,base.run.condition.brief)&&same(r.generator,base.run.generator),'fixed request and producer');
 const window=Laser.captureWindow(b.map,b.plan.laserProgram);need(same(r.windows,[window])&&r.stopTick===window.endTick,'source-derived prefix capture/declared stop');
 const declaration=p.probes.find(x=>x.id===id),diff=Object.keys(EXPECTED).filter(k=>R.physicalCondition(r.condition)[k]!==EXPECTED[k]);
 need(diff.length===1&&diff[0]===declaration.field&&r.condition[declaration.field]===EXPECTED[declaration.field]+declaration.delta,'exact single-variable perturbation');
 need(r.mapHash===declaration.expectedMapHash&&C.sha(b.plan)===declaration.expectedPlanHash,'preregistered pure generation');
 C.verifyLoaded(f);C.checkSourceSnapshot(freeze);
 const report=Laser.reduce(b.map,r,b.trace,b.plan.laserProgram,{expectedSourceManifestHash:f.manifestHash});
 need(report.status!=='invalid','pure local reducer invalid: '+report.reason);
 return{schema:'c006-laser-margin-local-diagnostic/1',scope:'Four predeclared physical parameter perturbations around one authenticated saved LT alternate witness; local source/receiver/protected-neighbor window only',authentication:{ledgerRunAndTrace:true,frozenPreregistration:true,realTickZero:true,baselineRunId:BASE,pureReducer:PURE,pureReducerSHA256:PURE_HASH},summary:summarize(b,report,base),report};
}
module.exports={BASE,EXPECTED,PURE,PURE_HASH,baseline,reduce,summarize,inputDifference};
