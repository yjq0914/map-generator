'use strict';
// Prospectively frozen admission for intentionally changed current routes.
// The original c001 admission/comparison guards remain unchanged.
const same=require('node:util').isDeepStrictEqual,C=require('../harness/common.cjs');
const A=require('../source/c005-laser-generator.cjs'),Current=require('./c005-current-interface.cjs');
const Core=require('./c003-saved-local-core.cjs'),Late=require('./c003-late-observe.cjs'),Laser=require('./c005-observe-laser.cjs');
const VERSION='c005-authenticated-companion-laser-observer/1',bundles=new WeakSet();
const need=(v,s)=>{if(!v)throw Error('c005 admission: '+s);};
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const clone=structuredClone;
function captureWindows(parent,candidate,mode){
 const contract=Current.verifyGeneratedPair(parent,candidate,mode),windows=Core.captureWindows(candidate.map,Current.inheritedPlan(candidate.plan));
 windows.push(contract.laser);
 if(contract.late)windows.push(contract.late.window);
 require('../harness/general-observer.cjs').windowsValid(windows,14400);
 return windows.sort((a,b)=>a.startTick-b.startTick||a.name.localeCompare(b.name));
}
function validateCommittedRecord(run,trace,map,frozen,request,expectedSourceManifestHash,expectedExecutionDependencyHash){
 need(digest(expectedSourceManifestHash)&&frozen.manifestHash===expectedSourceManifestHash&&run.sourceManifestHash===expectedSourceManifestHash&&trace.sourceManifestHash===expectedSourceManifestHash,'source freeze differs');
 const Run=require('../harness/general-runner.cjs');
 const expectedModule={'parent':'source/c005-laser-parent.cjs','candidate':'source/c005-laser-generator.cjs'}[run.arm];
 need(run.pool==='main'&&!run.referenceId&&trace.inputSource==='live-frozen-controller','formal live-controller main slot required; replay cannot qualify interaction');
 need(expectedModule&&run.generator?.module===expectedModule&&run.generator.export==='compile'&&frozen.files[expectedModule],'exact prospective arm producer required');
 need(C.sha(map)===run.mapHash&&trace.mapHash===run.mapHash&&C.sha({obstacles:map.obstacles,routes:map.routes,components:map.components})===run.geometryHash,'map/geometry identity differs');
 const dependencyHash=C.sha(Object.fromEntries(Object.entries(frozen.files).filter(([p])=>p.startsWith('source/vendor/')||p.startsWith('harness/')||p==='design/storage-v2/retention-codec-v2.cjs')));
 need(trace.executionDependencyHash===run.executionDependencyHash&&run.executionDependencyHash===dependencyHash&&(!expectedExecutionDependencyHash||run.executionDependencyHash===expectedExecutionDependencyHash),'execution dependency differs');
 need(run.route===Run.ROLES[run.role]?.route&&trace.role===run.role&&trace.route===run.route,'role/current route differs');
 need(same(Run.physicalCondition(run.condition),Run.physicalCondition(map.condition))&&Run.conditionKey(run.condition)===run.conditionHash&&trace.conditionHash===run.conditionHash,'physical input differs');
 need(run.physicalStarted===true&&run.stopTick===14400&&trace.initialState?.tick===0&&trace.finalState?.tick===run.terminalTick&&run.ticks===run.completedTicks&&run.completedTicks===run.terminalTick&&trace.continuity?.startedAtTick===0&&trace.continuity.restorationUsed===false&&trace.continuity.prefixPhysicalTicksCharged===run.ticks&&run.integrity.exactTickProgression===true&&run.integrity.sourceFrozen===true,'full-horizon charged tick-zero run required');
 need(trace.stateSequenceSHA256===run.stateSequenceSHA256&&same(trace.events,trace.finalState.events),'state/event chain differs');
 need(C.sha(trace.flapTicks)===run.inputSHA256&&trace.inputSHA256===run.inputSHA256&&trace.flapTicks.every((t,i,ts)=>Number.isInteger(t)&&t>=0&&t<run.terminalTick&&(!i||t>ts[i-1])),'exact input tape differs');
 need(same(trace.windows,run.windows),'run/trace retention differs');
 const requests=[run.generator?.request,run.condition?.brief,run.condition?.request].filter(q=>q!==null&&q!==undefined);
 need(requests.length>0&&requests.every(q=>same(q,request)),'missing or ambiguous frozen request');
 const record=run.generationEnvelope;
 need(record?.schema==='intent-generation-envelope/1'&&record.mapHash===run.mapHash&&C.sha(record)===run.generationEnvelopeSHA256&&C.sha(record.plan)===run.planSHA256,'committed producer envelope differs');
 need(A.dependencies()===record.sourceIdentity&&record.plan.sourceIdentity===record.sourceIdentity&&same(record.plan.request,A.normalizeRequest(request))&&record.plan.requestHash===C.sha(record.plan.request),'producer source/request differs');
 A.verifyEnvelope({...record,map},run.arm);
 const routesHash=run.arm==='parent'?record.plan.expectedParentRoutesHash:record.plan.expectedCandidateRoutesHash;
 need(C.sha(map.routes)===routesHash,'committed current route contract differs');
 return record.plan;
}
function reduceSaved(map,run,trace,plan,pair){
 const inherited=Current.inheritedPlan(plan),optional=Core.reduceSaved(map,run,trace,inherited,pair.candidate.map),windows=captureWindows(pair.parent,pair.candidate);
 const localLaser=Laser.reduce(map,run,trace,plan.laserProgram),context=plan.laserProgram.currentSuccessorContext;
 const t=optional.reports.T,downstream=context.changed?{required:true,writer:'T',sourceId:context.aperture.sourceId,receiverIds:context.aperture.receiverIds,status:t?.status??'missing',coverage:t?.coverage??null,aperture:t?.aperture??null,belowReceiver:t?.belowReceiver??null,bridge:t?.bridge??null,passed:t?.actualRelationPassed===true&&t?.coverage?.fullWindow===true&&t?.actualRelation?.apertureThenIntendedReceiver===true}:{required:false,status:'not_applicable',passed:true};
 const laser={...localLaser,localLaserRelationPassed:localLaser.actualRelationPassed,currentSuccessor:downstream,actualRelationPassed:localLaser.actualRelationPassed&&downstream.passed},late=Late.reduce(map,run,trace,windows.find(w=>w.name==='late-macro-stage'),inherited);
 return{schema:VERSION,optional,laser,late,fullQualificationCandidate:!run.error&&!trace.retention?.qualificationBlocked&&optional.fullQualificationCandidate&&laser.actualRelationPassed&&late.actualRelationPassed&&late.requestSatisfied,
  scopedTask:optional.scopedTask,rawTaskPass:run.taskPass??null,diagnosticOnly:!run.role.startsWith('assigned_'),
  qualificationScope:'new actual warning/capsule/same-side fixed reception plus protected owner/bridge/successor; exact declared companion H/T including actual changed-successor T second pair and receiver, and same late macro checked on current full-course trace; no relaxed L guard',humanFun:null,naturalRouteChoice:null};
}
function loadAuthenticated(id,{root=C.ROOT,expectedSourceManifestHash,expectedExecutionDependencyHash=null}={}){
 need(digest(expectedSourceManifestHash),'explicit prospective source manifest required');
 const Run=require('../harness/general-runner.cjs'),run=Run.load(id,root),trace=Run.trace(run,root),map=C.readGz(C.within(root,run.mapFile));
 const frozen=C.checkSourceSnapshot(run.freeze,root),request=run.generator?.request??run.condition?.brief??run.condition?.request;
 const plan=validateCommittedRecord(run,trace,map,frozen,request,expectedSourceManifestHash,expectedExecutionDependencyHash);
 const pair=A.compilePair(Run.physicalCondition(map.condition),request),contract=Current.verifyGeneratedPair(pair.parent,pair.candidate),windows=captureWindows(pair.parent,pair.candidate);
 for(const window of windows)need(run.windows.some(w=>same(w,window)),'required prospective actual-body window absent');
 C.verifyLoaded(frozen,root);C.checkSourceSnapshot(run.freeze,root);
 const report=reduceSaved(map,run,trace,plan,pair);
 const authentication={runId:id,resultSHA256:run.resultSHA256,traceSHA256:run.traceSHA256,sourceManifestHash:run.sourceManifestHash,executionDependencyHash:run.executionDependencyHash,mapHash:run.mapHash,inputSHA256:run.inputSHA256,stateSequenceSHA256:run.stateSequenceSHA256,planSHA256:run.planSHA256,sourceIdentity:A.sourceIdentity,currentRoutesHash:C.sha(map.routes),admissionMode:'new-prospective-exact-producer-and-current-routes; old guards unchanged'};
 const bundle=freeze({map,run,trace,plan,contract,report:{...report,authenticated:true,authentication},authentication});bundles.add(bundle);return bundle;
}
function compareAuthenticated(parent,candidate){
 need(bundles.has(parent)&&bundles.has(candidate),'only newly admitted committed-run bundles can be compared');
 need(parent.run.arm==='parent'&&candidate.run.arm==='candidate'&&parent.run.role===candidate.run.role&&same(parent.map.condition,candidate.map.condition)&&same(parent.plan,candidate.plan),'pair role/input/composite request differs');
 need(parent.run.sourceManifestHash===candidate.run.sourceManifestHash&&parent.run.executionDependencyHash===candidate.run.executionDependencyHash,'pair frozen dependencies differ');
 need(parent.run.mapHash===candidate.plan.baseMapHash&&C.sha(parent.map.routes)===candidate.plan.expectedParentRoutesHash&&C.sha(candidate.map.routes)===candidate.plan.expectedCandidateRoutesHash,'pair current map/route identities differ');
 const pressure=Current.compareMappedPressureRecords(parent.run.quality,candidate.run.quality,candidate.contract.pressure);
 const actionDifference=Laser.compareInputs(parent.trace,candidate.trace,candidate.contract.laser);
 return{schema:VERSION,authenticated:true,parent:parent.report,candidate:candidate.report,pressure:{...pressure,authenticated:true},actionDifference,
  sourcePairIdentity:candidate.contract.pressure,routeIdentity:{parent:parent.authentication.currentRoutesHash,candidate:candidate.authentication.currentRoutesHash,intentionallyDifferent:parent.authentication.currentRoutesHash!==candidate.authentication.currentRoutesHash},
  actualInteractionQualified:parent.report.fullQualificationCandidate&&candidate.report.fullQualificationCandidate,everyRouteMustChange:false,completeOldIntent:candidate.plan.comparison.completeOldIntent,semanticRequestsEquivalent:false,humanFun:null};
}
function inspectUntrustedFixture(map,run,trace,plan,pair){const result=reduceSaved(map,run,trace,plan,pair);return{...result,fixtureComputedQualification:result.fullQualificationCandidate,fullQualificationCandidate:false,authenticated:false,qualificationBlocked:true,scope:'pure reducer fixture only; not new physical evidence'};}
module.exports={VERSION,captureWindows,loadAuthenticated,compareAuthenticated,inspectUntrustedFixture,validateCommittedRecord};
