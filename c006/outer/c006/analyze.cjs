'use strict';
// Freeze before revealing the c006 holdout. This only reduces committed evidence.
const C=require('../../harness/common.cjs'),Run=require('../../harness/general-runner.cjs'),L=require('../../harness/general-ledger.cjs');
const O=require('../../design/neighbor-observe.cjs'),A=require('../../source/neighbor-generator.cjs'),Core=require('../../design/c003-saved-local-core.cjs');
const same=require('node:util').isDeepStrictEqual;
const DIR='outer/c006',PREREG=DIR+'/formal-preregistration.json',STATIC='reports/c006-bound-static.json',PUBLIC=DIR+'/public-binding-static.json';
const VERSION='c006-saved-neighbor-panel-analysis/1',CACHE='c006-bound-authenticated-pair-cache/1';
const roles=['assigned_main','assigned_alternate'],forms=['B','H','T','J','HT','HJ','JT','HJT','L','HL','LT','HLT'];
// Same numerical identity tolerance as c003; not a new task/pressure threshold.
const Y_IDENTITY_TOLERANCE=1e-7;
const contrastSpecs=[['control-00','control-01','moving-fixed-order'],['control-04','control-05','stagger-order'],['control-00','control-02','recovery-duration'],['control-00','control-03','recovery-duration'],['control-02','control-03','recovery-duration']];
const need=(v,s)=>{if(!v)throw Error('c006 analysis: '+s);};
function compact(x,key=''){
 if(Array.isArray(x)&&/^(overlapTicks|commandTicks|changedCommandTicks|actualSlabTicks|rows|actualRows|seamActualRows|frames|samples|edgeVelocitySamples|wrongSideTicks)$/.test(key))return{retainedInAuthenticatedTrace:true,count:x.length,sha256:C.sha(x),first:x[0]??null,last:x.at(-1)??null};
 if(Array.isArray(x))return x.map(v=>compact(v));
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,compact(v,k)]));return x;
}
function boundFile(f,rel){need(f.files[rel]&&f.files[rel]===C.sha(C.fs.readFileSync(C.within(C.ROOT,rel))),'file absent from or differs from source freeze: '+rel);return C.read(C.within(C.ROOT,rel));}
function isMacroNull(q){if(q?.schema==='flappy-laser-companion-request/1')return isMacroNull(q.companion);return q?.schema==='flappy-prefix-and-late-macro-request/1'&&q.macro===null;}
function actionSummary(d){return d?{changedCommandTickCount:d.changedCommandTicks.length,changedCommandTicksSHA256:C.sha(d.changedCommandTicks),commandCountDelta:d.commandCountDelta,maximumYDifferencePx:d.maximumYDifferencePx,actualActionChanged:d.changedCommandTicks.length>0||d.maximumYDifferencePx>Y_IDENTITY_TOLERANCE,scope:d.scope}:null;}
function lateSummary(q){
 const packages=q.packages??[],allBodies=[...(q.approachBodies??[]),...packages.flatMap(p=>p.bodyPasses??[]),...(q.nextDemand??[])],auxiliary=packages.flatMap(p=>p.auxiliaryBodies??[]);
 return{status:q.status,fullWindow:q.coverage?.fullWindow===true,continuousFromTickZero:q.continuousFromTickZero===true,actualRelationPassed:q.actualRelationPassed===true,requestSatisfied:q.requestSatisfied===true,
  predecessorBridgePassed:q.predecessorBridge?.passed===true,allBodyPasses:allBodies.length>0&&allBodies.every(b=>b.passed===true),actualBodyCount:allBodies.length,actualNeighborBodyCount:allBodies.filter(b=>/-adj-(upper|lower)$/.test(b.sourceId)).length,
  carriedNeighborIds:auxiliary.map(a=>a.bodyId),carriedNeighborsPassed:auxiliary.length>0&&auxiliary.every(a=>a.passed&&a.ordered&&a.beforeBridge),
  allPackageBridgesPassed:packages.length===2&&packages.every(p=>p.recovery?.passed===true),allPrimaryOrdersObserved:packages.length===2&&packages.every(p=>p.bodyOrderObserved===true),
  orderedAcrossPackages:q.orderedAcrossPackages===true,completePackageOrder:q.completePackageOrder===true,completeSuccessorOrder:q.completeSuccessorOrder===true,successorAuxiliaryOrder:q.successorAuxiliaryOrder===true,downstreamFullBodyExitObserved:q.downstreamFullBodyExitObserved===true,
  actualPackageSourceOrder:packages.map(p=>p.sourceIndex),firstRecoverySeconds:packages[0]?.recovery?.actualSeconds??null,typedRequest:q.typedRequest??null,
  packages:packages.map(p=>({slot:p.slot,sourceIndex:p.sourceIndex,demand:p.demand,passed:p.passed,fullBodyFirstTick:p.fullBodyFirstTick,fullBodyExitTick:p.fullBodyExitTick,recovery:compact(p.recovery),auxiliaryBodies:p.auxiliaryBodies})),
  internalVisualSymmetryCreated:q.internalVisualSymmetryCreated??false};
}
function optionalSummary(report,selected){
 const laser=report.laser,hasL=selected.includes('L');
 return{selectedRecipes:selected,relationsPassed:report.optional.actualRelationsPassed===true,scopedTask:report.scopedTask,recipes:Object.fromEntries(Object.entries(report.optional.reports).map(([k,v])=>[k,{status:v.status,actualRelationPassed:v.actualRelationPassed,fullWindow:v.coverage?.fullWindow??null}])),
  laser:{required:hasL,status:laser.status,relationPassed:laser.actualRelationPassed===true,localRelationPassed:!hasL||laser.localLaserRelationPassed===true,lifecyclePassed:!hasL||laser.source?.lifecycle?.passed===true,sameSide:!hasL||laser.sourceReferenceSide===laser.receiverSide,currentSuccessor:laser.currentSuccessor??{required:false,passed:true},minimumActiveCapsuleDistancePx:laser.source?.actualEndpointClearance?.minimumActiveCapsuleDistancePx??null,actualEndpointTravelPx:laser.source?.actualEndpointClearance?.actualEndpointTravelPx??null}};
}
function curveAction(run){return{quality:compact(run.quality),actualActionWindows:run.generalObservation?.actualActionWindows??null,selectedActionWindows:run.generalObservation?.selectedWindows??null,unchangedThresholdPx:run.generalObservation?.unchangedThresholdPx??null,qualityClaim:false,humanFun:null};}
function contrastInput(candidate){
 const window=candidate.contract.late.window,view=Core.windowView(candidate.trace,window),coverage=Core.validateView(view),macro=candidate.plan.request.macro;
 return{physical:Run.physicalCondition(candidate.map.condition),prefixRequest:candidate.plan.request.parentRequest,prefixMapHash:candidate.plan.baseMapHash,selectedNormalForm:candidate.plan.selectedNormalForm,macro,order:candidate.plan.macroPlan.selected.order,
  actualOrder:candidate.report.late.packages?.map(p=>p.sourceIndex)??[],firstRecoveryTicks:candidate.report.late.typedRequest?.actualFirstRecoveryTicks??null,requestedRecoveryTicks:Math.round(macro.firstRecoverySeconds*120),
  qualified:candidate.report.fullQualificationCandidate,actualRelationPassed:candidate.report.late.actualRelationPassed,requestSatisfied:candidate.report.late.requestSatisfied,window,coverage,
  actualTrajectory:view.rows.map(r=>[r[0],r[2]]),actualCommands:view.flapTicks.filter(t=>t>=window.startTick&&t<window.endTick),inputSHA256:candidate.run.inputSHA256,traceSHA256:candidate.run.traceSHA256};
}
function compareContrast(x,y,a,b,kind,role){
 const rowMap=new Map(x.actualTrajectory),shared=y.actualTrajectory.filter(r=>rowMap.has(r[0])),delta=Math.max(0,...shared.map(r=>Math.abs(r[1]-rowMap.get(r[0])))),commandsChanged=!same(x.actualCommands,y.actualCommands);
 const sameWindow=same(x.window,y.window),fullWindows=x.coverage.fullWindow&&y.coverage.fullWindow&&sameWindow&&shared.length===x.actualTrajectory.length&&shared.length===y.actualTrajectory.length;
 const sameInput=same(x.physical,y.physical)&&same(x.prefixRequest,y.prefixRequest)&&x.prefixMapHash===y.prefixMapHash;
 const sameRecovery=x.requestedRecoveryTicks===y.requestedRecoveryTicks&&x.firstRecoveryTicks===y.firstRecoveryTicks,orderChanged=!same(x.order,y.order),observedOrders=same(x.actualOrder,x.order)&&same(y.actualOrder,y.order);
 const requestKeys=['firstDemand'],sameOtherRequest=requestKeys.every(k=>same(x.macro[k],y.macro[k]));
 const expectedManipulation=kind==='recovery-duration'?sameOtherRequest&&same(x.macro.theme,y.macro.theme)&&!orderChanged&&!sameRecovery&&x.requestedRecoveryTicks!==y.requestedRecoveryTicks:
  sameOtherRequest&&sameRecovery&&orderChanged&&(kind==='moving-fixed-order'?x.macro.theme.staggerGradient===y.macro.theme.staggerGradient&&x.macro.theme.pairSymmetryGradient!==y.macro.theme.pairSymmetryGradient:x.macro.theme.pairSymmetryGradient===y.macro.theme.pairSymmetryGradient&&x.macro.theme.staggerGradient!==y.macro.theme.staggerGradient);
 const actualRecoverySatisfied=x.firstRecoveryTicks===x.requestedRecoveryTicks&&y.firstRecoveryTicks===y.requestedRecoveryTicks;
 const actualActionChanged=fullWindows&&(commandsChanged||delta>Y_IDENTITY_TOLERANCE);
 return{a,b,kind,role,samePhysicalAndPrefix:sameInput,fullSavedTraceWindows:fullWindows,bothQualified:x.qualified&&y.qualified,bothActualRelations:x.actualRelationPassed&&y.actualRelationPassed,bothRequestsSatisfied:x.requestSatisfied&&y.requestSatisfied,
  selectedForms:[x.selectedNormalForm,y.selectedNormalForm],expectedManipulation,orderChanged,actualOrdersObserved:observedOrders,orders:[x.order,y.order],recoveryBeforeTicks:x.firstRecoveryTicks,recoveryAfterTicks:y.firstRecoveryTicks,actualRecoverySatisfied,
  maximumYDifferencePx:delta,commandsChanged,actualActionChanged,trajectoryHashes:[C.sha(x.actualTrajectory),C.sha(y.actualTrajectory)],commandHashes:[C.sha(x.actualCommands),C.sha(y.actualCommands)],inputSHA256:[x.inputSHA256,y.inputSHA256],traceSHA256:[x.traceSHA256,y.traceSHA256],
  passed:sameInput&&fullWindows&&x.qualified&&y.qualified&&x.actualRelationPassed&&y.actualRelationPassed&&x.requestSatisfied&&y.requestSatisfied&&observedOrders&&expectedManipulation&&actualRecoverySatisfied&&actualActionChanged,
  scope:'Actual candidate-to-candidate trajectories and inputs at the same absolute clock; existing primary pattern ordering only, no whole-image symmetry, internal synthesis, causal-effort or every-route-change claim'};
}
function runBinding(run){return Object.fromEntries(['id','resultSHA256','sourceManifestHash','executionDependencyHash','conditionHash','mapHash','geometryHash','inputSHA256','traceSHA256','stateSequenceSHA256','planSHA256','generationEnvelopeSHA256','traceFile','mapFile','physicalStarted'].map(k=>[k,run[k]??null]));}
function backingFiles(raw){return raw.flatMap(r=>[r.traceFile,r.mapFile].filter(Boolean)).map(file=>({file,sha256:C.sha(C.fs.readFileSync(C.within(C.ROOT,file)))}));}
function readCache(file,binding){
 if(!C.fs.existsSync(C.within(C.ROOT,file)))return null;
 const saved=C.readGz(C.within(C.ROOT,file)),{cacheSHA256,...body}=saved;
 need(saved.schema===CACHE&&C.sha(body)===cacheSHA256&&same(saved.binding,binding),'cached pair provenance/integrity differs: '+file);
 for(const b of saved.backingFiles)need(C.sha(C.fs.readFileSync(C.within(C.ROOT,b.file)))===b.sha256,'cached pair backing artifact differs: '+b.file);
 return saved;
}
function reducePair(c,role,raw,binding,evidence){
 let summary,comparison=null,input=null;
 if(raw.some(r=>!r.physicalStarted))summary={condition:c.id,group:c.group,adjacency:c.adjacency,role,parentQualified:false,candidateQualified:false,generationRefusal:raw.map(r=>({arm:r.arm,status:r.status,error:r.error,physicalStarted:r.physicalStarted})),newPhysicalEvidence:false,evidence};
 else try{
  const parent=O.loadAuthenticated(raw[0].id,{expectedSourceManifestHash:binding.sourceManifestHash}),candidate=O.loadAuthenticated(raw[1].id,{expectedSourceManifestHash:binding.sourceManifestHash});comparison=O.compareAuthenticated(parent,candidate);
  const parentLate=lateSummary(parent.report.late),late=lateSummary(candidate.report.late),parentOptional=optionalSummary(parent.report,parent.plan.selectedRecipes),optional=optionalSummary(candidate.report,candidate.plan.selectedRecipes),action=actionSummary(comparison.actionDifference);
  summary={condition:c.id,group:c.group,adjacency:c.adjacency,role,selectedNormalForm:candidate.plan.selectedNormalForm,selectedRecipes:candidate.plan.selectedRecipes,parentQualified:parent.report.fullQualificationCandidate,candidateQualified:candidate.report.fullQualificationCandidate,
   parentRawTaskPass:parent.run.taskPass,candidateRawTaskPass:candidate.run.taskPass,parentScopedTaskPass:parent.report.scopedTask.physicalTaskPass,candidateScopedTaskPass:candidate.report.scopedTask.physicalTaskPass,parentOptional,optional,parentLate,late,
   actionDifference:action,changed:action?.actualActionChanged===true,geometryChanged:parent.run.mapHash!==candidate.run.mapHash,macroOrder:candidate.plan.macroPlan.selected.order,completeOldIntent:candidate.plan.comparison.completeOldIntent,
   explicitSameMacroNullPrefix:isMacroNull(candidate.plan.request.parentRequest)&&parent.run.mapHash===candidate.plan.baseMapHash,sameCumulativePlan:same(parent.plan,candidate.plan),
   pressure:comparison.pressure,curveAction:{parent:curveAction(parent.run),candidate:curveAction(candidate.run)},sourcePairIdentity:comparison.sourcePairIdentity,routeIdentity:comparison.routeIdentity,evidence};
  if(c.group==='control')input=contrastInput(candidate);
 }catch(error){summary={condition:c.id,group:c.group,adjacency:c.adjacency,role,parentQualified:false,candidateQualified:false,error:String(error.stack||error),evidence};}
 const record={schema:CACHE,binding,backingFiles:backingFiles(raw),summary,contrastInput:input,report:compact({comparison,denseEvidence:raw.map(r=>({arm:r.arm,trace:r.traceFile,traceSHA256:r.traceSHA256})),scientificComparator:'Same explicit durable c005 macro-null cumulative physical prefix versus adding neighbor-aware late macro; complete old intent reported separately',oldObserverGuardsUnchanged:true,everyRouteMustChange:false,humanFun:null})};
 C.write(C.within(C.ROOT,evidence),C.zlib.gzipSync(JSON.stringify({...record,cacheSHA256:C.sha(record)})),{exclusive:true});return record;
}
function analyze({freezePath='protocols/freezes/c006-formal-v1.json',partial=false,conditions:requested=null}={}){
 const began=Date.now(),f=C.checkSourceSnapshot(freezePath),p=boundFile(f,PREREG),stat=boundFile(f,STATIC),pub=boundFile(f,PUBLIC);
 need(f.files[DIR+'/analyze.cjs']===C.sha(C.fs.readFileSync(__filename)),'analyzer must be prospectively frozen');
 need(stat.sourceIdentity===A.dependencies()&&pub.sourceIdentity===stat.sourceIdentity,'static producer identity differs');
 need(p.round==='c006'&&p.expectedSlots===192&&p.slots.length===192&&new Set(p.slots.map(s=>s.id)).size===192,'exact 192-slot panel required');
 const conditions=[...new Map(p.slots.map(s=>[s.condition.id,s.condition])).values()];need(conditions.length===24&&['control','explore','holdout'].every(g=>conditions.filter(c=>c.group===g).length===8),'exact 8/8/8 panel required');
 for(const c of conditions)for(const arm of ['parent','candidate'])for(const role of Object.keys(Run.ROLES))need(p.slots.filter(s=>s.condition.id===c.id&&s.arm===arm&&s.role===role).length===1,'missing/duplicate panel arm-role');
 const selection=requested===null?null:new Set(Array.isArray(requested)?requested:String(requested).split(',').filter(Boolean));
 if(selection){need(partial,'--conditions is only valid with --partial');for(const id of selection)need(conditions.some(c=>c.id===id),'unknown selected condition '+id);}
 const done=new Map(L.rows().filter(r=>r.kind==='commit').map(r=>[r.id,r])),pairs=[],missing=[],diagnostics=[],contrastInputs={},distribution={control:{},explore:{},holdout:{}};let newlyReducedPairs=0,reusedPairs=0;
 for(const c of conditions){let recorded=false;for(const role of roles){
  const slots=['parent','candidate'].map(arm=>p.slots.find(s=>s.condition.id===c.id&&s.arm===arm&&s.role===role));
  if(!slots.every(s=>done.has(s.id))){missing.push({condition:c.id,role,reason:'uncommitted'});continue;}
  const evidence=DIR+'/pair-reports/'+c.id+'-'+role+'.json.gz';
  const raw=slots.map(s=>{const r=Run.load(s.id);need(same(Run.executionSpec(r),s),'committed run differs from formal slot '+s.id);return r;});
  const binding={sourceManifestHash:f.manifestHash,analyzerSHA256:f.files[DIR+'/analyze.cjs'],preregistrationSHA256:f.files[PREREG],sourceIdentity:A.sourceIdentity,conditionSHA256:C.sha(c),role,runs:raw.map(runBinding)};
  let saved=readCache(evidence,binding);
  if(saved)reusedPairs++;else if(selection&&!selection.has(c.id)){missing.push({condition:c.id,role,reason:'completed-pair-awaiting-selected-analysis'});continue;}else{saved=reducePair(c,role,raw,binding,evidence);newlyReducedPairs++;}
  const pair=saved.summary;pairs.push(pair);if(saved.contrastInput)contrastInputs[c.id+'|'+role]=saved.contrastInput;
  if(!recorded&&pair.selectedNormalForm){distribution[c.group][pair.selectedNormalForm]=(distribution[c.group][pair.selectedNormalForm]??0)+1;recorded=true;}
 }}
 const contrasts=[];for(const [a,b,kind]of contrastSpecs)for(const role of roles){const x=contrastInputs[a+'|'+role],y=contrastInputs[b+'|'+role];if(x&&y)contrasts.push(compareContrast(x,y,a,b,kind,role));}
 for(const slot of p.slots.filter(s=>!roles.includes(s.role)))if(done.has(slot.id)){try{const r=Run.load(slot.id);need(same(Run.executionSpec(r),slot)&&r.sourceManifestHash===f.manifestHash,'diagnostic slot/source differs');diagnostics.push({id:r.id,arm:r.arm,role:r.role,group:r.condition.group,ticks:r.ticks,aliveHorizon:r.metrics?.aliveHorizon??false,rawTaskPass:r.taskPass,error:r.error,physicalStarted:r.physicalStarted,funVeto:false,assignedQualification:false});}catch(e){diagnostics.push({id:slot.id,role:slot.role,error:String(e.stack||e),funVeto:false,assignedQualification:false});}}
 const complete=p.slots.every(s=>done.has(s.id))&&pairs.length===48&&!missing.length,all=fn=>pairs.length===48&&pairs.every(fn),allArms=fn=>all(q=>fn(q.parentLate)&&fn(q.late));
 const publicForms=[...new Set(pub.rows.map(r=>r.form))],publicAllTwelve=forms.every(k=>publicForms.includes(k));
 const criteria={all192SlotsCommitted:complete,all48ParentAssigned:all(q=>q.parentQualified),all48CandidateAssigned:all(q=>q.candidateQualified),noGenerationRefusal:pairs.every(q=>!q.generationRefusal),noAssignedEvidenceError:pairs.every(q=>!q.error),noDiagnosticExecutionError:diagnostics.every(d=>d.physicalStarted===true&&!d.error),
  allFullCourseScopedTasks:all(q=>q.parentScopedTaskPass&&q.candidateScopedTaskPass),allInheritedOptionalRelations:all(q=>q.parentOptional?.relationsPassed&&q.optional?.relationsPassed),
  allActualLateBodyRelations:allArms(q=>q?.actualRelationPassed&&q.fullWindow&&q.continuousFromTickZero&&q.allBodyPasses&&q.allPrimaryOrdersObserved&&q.completePackageOrder&&q.completeSuccessorOrder&&q.successorAuxiliaryOrder&&q.downstreamFullBodyExitObserved),
  allActualNeighborRelations:allArms(q=>q?.actualNeighborBodyCount>0&&q.carriedNeighborsPassed),allActualBridges:allArms(q=>q?.predecessorBridgePassed&&q.allPackageBridgesPassed),allCandidateRequestsSatisfied:all(q=>q.late?.requestSatisfied),
  allCurrentLaserRelations:all(q=>[q.parentOptional,q.optional].every(o=>o?.laser.relationPassed&&o.laser.localRelationPassed&&o.laser.lifecyclePassed&&o.laser.sameSide)),
  allChangedTSuccessorRelations:pairs.some(q=>q.optional?.laser.currentSuccessor.required)&&all(q=>[q.parentOptional,q.optional].every(o=>!o?.laser.currentSuccessor.required||o.laser.currentSuccessor.passed===true)),
  bothAdjacencyClassesObserved:['upper-after','lower-before'].every(a=>pairs.some(q=>q.adjacency===a&&q.parentQualified&&q.candidateQualified&&q.late?.carriedNeighborsPassed)),
  allTwelveSelectedFormsObserved:publicAllTwelve&&forms.every(k=>pairs.some(q=>q.selectedNormalForm===k&&q.parentQualified&&q.candidateQualified)),
  sameExplicitMacroNullCumulativePrefix:all(q=>q.explicitSameMacroNullPrefix&&q.sameCumulativePlan),mappedPressureIdentityPreserved:all(q=>q.pressure?.authenticated===true&&q.pressure.thresholdChanged===false&&q.sourcePairIdentity?.removedPairCount===0&&q.sourcePairIdentity?.addedPairCount===0),
  movingFixedOrderContrast:contrasts.some(q=>q.kind==='moving-fixed-order'&&q.passed),staggerOrderContrast:contrasts.some(q=>q.kind==='stagger-order'&&q.passed),allThreeRecoveryRequestsObserved:contrastSpecs.filter(q=>q[2]==='recovery-duration').every(([a,b])=>contrasts.some(q=>q.a===a&&q.b===b&&q.passed)),
  inheritedStaticGuards:stat.passed===true,neighborDomainExplicit:conditions.every(c=>['upper-after','lower-before'].includes(c.adjacency)&&c.brief?.schema===A.REQUEST&&isMacroNull(c.brief.parentRequest))};
 const decisiveFailures=[];
 for(const q of pairs)if(!q.parentQualified||!q.candidateQualified||q.error||q.generationRefusal)decisiveFailures.push({kind:'assigned-evidence-failure',condition:q.condition,role:q.role,parentQualified:q.parentQualified,candidateQualified:q.candidateQualified,evidence:q.evidence,error:q.error??null});
 for(const d of diagnostics)if(d.error||d.physicalStarted!==true)decisiveFailures.push({kind:'diagnostic-execution-integrity-failure',id:d.id,error:d.error??null});
 for(const [a,b,kind]of contrastSpecs){const matches=contrasts.filter(q=>q.a===a&&q.b===b);if(matches.length===roles.length&&!matches.some(q=>q.passed))decisiveFailures.push({kind:'frozen-request-contrast-failure',a,b,contrast:kind});}
 if(!stat.passed||!publicAllTwelve||!criteria.neighborDomainExplicit)decisiveFailures.push({kind:'frozen-structural-contract-failure'});
 const recommendation=decisiveFailures.length?'reject-or-incomplete-review':complete?(Object.values(criteria).every(Boolean)?'conditional-adopt':'reject-or-incomplete-review'):'pending';
 const result={schema:VERSION,round:'c006',partial,sourceManifestHash:f.manifestHash,conditions:conditions.length,completedSlots:p.slots.filter(s=>done.has(s.id)).length,complete,pairs,missing,diagnostics,distribution,contrasts,criteria,recommendation,
  analysisWork:{newlyReducedPairs,reusedPairs,requestedConditions:selection?[...selection]:null,cache:'compressed authenticated reductions bound to exact committed source/run/input/trace identities; backing artifacts checked without repeated reduction'},
  stopping:{stopRemainingPhysics:decisiveFailures.length>0,decisiveFailures,policy:'Stop on decisive frozen assigned-evidence, request-contrast or integrity failure; never narrow the assigned panel or criteria after reveal'},
  publicStructuralCoverage:{forms:publicForms,allTwelve:publicAllTwelve},cost:L.summary(),elapsedSeconds:(Date.now()-began)/1000,samplingUnit:'24 physical-condition-plus-request maps; assigned routes are correlated',
  scope:'Same durable c005 macro-null cumulative prefix and current optional H/T/J/L, including changed T successor; complete late packages9/10 with every actual neighbor, body exit and bridge; existing primary pattern ordering and integral recovery allocation only',
  thresholdChanges:false,everyRouteMustChange:false,wholeImageSymmetry:null,internalPatternSynthesis:false,humanFun:null,naturalRouteChoice:null};
 C.checkSourceSnapshot(freezePath);
 C.write(C.within(C.ROOT,DIR+'/'+(partial?'pilot-analysis':'analysis')+'.json'),result,{exclusive:false});
 return{completedSlots:result.completedSlots,assignedPairs:pairs.length,parentQualified:pairs.filter(q=>q.parentQualified).length,candidateQualified:pairs.filter(q=>q.candidateQualified).length,criteria,recommendation,stopping:result.stopping,analysisWork:result.analysisWork,errors:pairs.filter(q=>q.error).map(q=>({condition:q.condition,role:q.role,error:q.error})),failed:pairs.filter(q=>!q.parentQualified||!q.candidateQualified).map(q=>({condition:q.condition,role:q.role,parentQualified:q.parentQualified,candidateQualified:q.candidateQualified,evidence:q.evidence})),cost:result.cost,elapsedSeconds:result.elapsedSeconds};
}
module.exports={analyze,compareContrast,actionSummary,lateSummary,isMacroNull};
if(require.main===module){const args=process.argv.slice(2),at=args.indexOf('--conditions'),equal=args.find(s=>s.startsWith('--conditions=')),conditionIds=at>=0?args[at+1]:equal?.slice('--conditions='.length);need(at<0||conditionIds&&!conditionIds.startsWith('--'),'--conditions requires comma-separated IDs');const freeze=args.find((s,i)=>!s.startsWith('--')&&(at<0||i!==at+1))||'protocols/freezes/c006-formal-v1.json';console.log(JSON.stringify(analyze({freezePath:freeze,partial:args.includes('--partial'),conditions:conditionIds??null})));}
