'use strict';
const C=require('./common.cjs'),L=require('./general-ledger.cjs'),D=require('./general-freeze.cjs'),Q=require('./metrics.cjs'),O=require('./general-observer.cjs'),S=require('./general-retention.cjs');
const same=require('node:util').isDeepStrictEqual;
const ROLES=Object.freeze({assigned_main:{route:'main',policy:'route'},assigned_alternate:{route:'branch',policy:'route'},H1:{route:'main',policy:'H1'},'H1-slow':{route:'main',policy:'H1-slow'}});
const physicalCondition=e=>Object.fromEntries(['y','vy','lead','phase','adjacency','seed'].map(k=>[k,e?.[k]]));
function conditionKey(e){const p=physicalCondition(e);if(!['y','vy','lead','phase','seed'].every(k=>Number.isFinite(p[k]))||!Number.isInteger(p.seed)||p.seed<0||p.seed>4294967295||!['none','upper-after','lower-before'].includes(p.adjacency))throw Error('Invalid ordinary physical condition');return C.sha(p);}
function executionSpec(q){return {id:q.id,round:q.round,pool:q.pool??'main',role:q.role,arm:q.arm??null,condition:q.condition,generator:q.generator,stopTick:q.stopTick??14400,windows:q.windows??[],fullTrace:q.fullTrace===true,referenceId:q.referenceId??null};}
function validateSpec(q){
  if(!/^[A-Za-z0-9._-]+$/.test(q.id??'')||! /^[A-Za-z0-9._-]+$/.test(q.round??'')||!Object.hasOwn(ROLES,q.role)||!['main','local','diagnostic','replay'].includes(q.pool))throw Error('Invalid role/slot');
  conditionKey(q.condition);
  if(!Number.isInteger(q.stopTick)||q.stopTick<1||q.stopTick>14400||['main','replay'].includes(q.pool)&&q.stopTick!==14400)throw Error('Invalid real prefix length');
  O.windowsValid(q.windows,q.stopTick);
  if(q.pool==='local'&&!q.windows.length)throw Error('Local run needs declared observation window');
  if(!q.generator||typeof q.generator.module!=='string'||!q.generator.module.startsWith('source/')||!['generate','generateParent','compile'].includes(q.generator.export??'generate'))throw Error('Explicit source generator required');
  if((q.generator.export??'generate')==='generate'&&typeof q.generator.configPath!=='string')throw Error('Frozen generator config path required');
  if(q.pool==='replay'&&!q.referenceId||q.pool!=='replay'&&q.referenceId)throw Error('Exact reference tape is only supported in a registered replay slot');
  return q;
}
function panelPlan(round,conditions,parentGenerator,candidateGenerator,{windows=[],fullTraceConditionId=null}={}){
  const key=c=>C.sha({physical:conditionKey(c),request:c.brief??c.request??candidateGenerator.request??null});
  if(conditions.length!==24||new Set(conditions.map(key)).size!==24||!['control','explore','holdout'].every(g=>conditions.filter(c=>c.group===g).length===8))throw Error('Formal panel requires24 unique physical-condition+intent requests,8 per group');
  return {schema:'adaptive-execution-preregistration/1',round,expectedSlots:192,slots:conditions.flatMap(condition=>['parent','candidate'].flatMap(arm=>Object.keys(ROLES).map(role=>validateSpec(executionSpec({id:`${round}-${arm}-${condition.id}-${role}`,round,pool:'main',role,arm,condition,generator:arm==='parent'?parentGenerator:candidateGenerator,windows,fullTrace:condition.id===fullTraceConditionId&&role==='assigned_main'})))))};
}
function pureGeneration(generator,condition,root=C.ROOT){
  const F=require(C.within(root,'source/vendor/engine/core.js')),B=require(C.within(root,'source/vendor/baseline/core.js')),saved=[];
  for(const api of [F,B])for(const k of ['step','createState','rollout','restoreCheckpoint','restoreSession'])if(typeof api[k]==='function'){saved.push([api,k,api[k]]);api[k]=()=>{throw Error('Physical API forbidden during generation/static stage: '+k);};}
  try{const g=require(C.within(root,generator.module)),entry=generator.export??'generate',fn=g[entry],request=generator.request??condition.brief??condition.request;if(typeof fn!=='function')throw Error('Generator entrypoint missing');return entry==='generateParent'?fn(physicalCondition(condition)):entry==='compile'?fn(physicalCondition(condition),request):fn(C.read(C.within(root,generator.configPath)),physicalCondition(condition),request);}
  finally{for(const [api,k,fn]of saved)api[k]=fn;}
}
function load(id,root=C.ROOT){
  if(!/^[A-Za-z0-9._-]+$/.test(id))throw Error('Invalid evidence id');
  const r=C.readGz(C.within(root,'evidence/runs/'+id+'.json.gz')),{resultSHA256,...body}=r,commit=L.rows(root).find(x=>x.kind==='commit'&&x.id===id);
  if(C.sha(body)!==resultSHA256||!commit||commit.resultSHA256!==resultSHA256||commit.ticks!==r.ticks||commit.substeps!==r.substeps||commit.mapHash!==r.mapHash)throw Error('Unauthenticated run record');return r;
}
function trace(run,root=C.ROOT){const bytes=C.fs.readFileSync(C.within(root,run.traceFile));if(C.sha(bytes)!==run.traceSHA256)throw Error('Trace hash mismatch');const t=S.decode(bytes);if(t.id!==run.id||t.mapHash!==run.mapHash||C.sha(t.flapTicks)!==run.inputSHA256||C.sha(t.initialState)!==run.initialStateSHA256||C.sha(t.finalState)!==run.finalStateSHA256)throw Error('Trace/run mismatch');return t;}
function executeSlot(options){const root=options.outputRoot??C.ROOT;return C.locked(root,'.general-runner.lock',()=>executeInternal(options,root));}
function executeInternal(options,root){
  if(C.fs.existsSync(C.within(root,'STOP')))throw Error('STOP blocks new physics');
  const q=validateSpec(executionSpec(options)),{freeze,receiptPath,preregistrationPath}=options;
  const fr=C.checkSourceSnapshot(freeze,root),receipt=D.verifyReceipt(receiptPath,freeze,root);
  if(!fr.files[preregistrationPath])throw Error('Execution preregistration must be in frozen manifest');
  const prereg=C.read(C.within(root,preregistrationPath));
  if(prereg.schema!=='adaptive-execution-preregistration/1'||prereg.round!==q.round||prereg.slots.filter(s=>s.id===q.id).length!==1||!same(prereg.slots.find(s=>s.id===q.id),q))throw Error('Execution differs from frozen preregistered slot');
  for(const p of [q.generator.module,q.generator.configPath].filter(Boolean))if(!fr.files[p])throw Error('Generator/config outside source freeze');
  const dependencyHash=C.sha(Object.fromEntries(Object.entries(fr.files).filter(([p])=>p.startsWith('source/vendor/')||p.startsWith('harness/')||p==='design/storage-v2/retention-codec-v2.cjs')));
  const slot=C.sha({round:q.round,sourceManifestHash:fr.manifestHash,spec:q});
  const request=L.request({...q,slot,sourceManifestHash:fr.manifestHash,receiptHash:receipt.receiptHash,preregistrationPath,preregistrationSHA256:fr.files[preregistrationPath],executionSpecSHA256:C.sha(q)},root);L.reserve(request,root);
  const began=process.hrtime.bigint(),wall=()=>Number(process.hrtime.bigint()-began)/1e9;
  let map=null,mapHash=null,geometryHash=null,generationEnvelope=null,state=null,initialState=null,controller=null,description=null,metrics=null,quality=null,generalObservation=null,error=null,physicalStarted=false,physicsCalls=0,completedTicks=0,status='executed';
  const tm={executedSubsteps:0},rows=[],stateHashes=[],flapTicks=[],checkpoints=[],boundaries=[],clearanceSamples=[],pairCoreSamples=[],bodyCapture=O.createBodyCapture(q.windows),stateChain=C.crypto.createHash('sha256');
  const selected=new Set(q.windows.flatMap(w=>[w.startTick,w.endTick]));
  let input=null,reference=null;
  try{
    const generated=pureGeneration(q.generator,q.condition,root);
    if((q.generator.export??'generate')==='compile'){
      if(generated?.schema!=='intent-generation-envelope/1'||!generated.map||C.sha(generated.map)!==generated.mapHash)throw Error('Invalid immutable intent envelope');
      const {map:compiledMap,...metadata}=generated;map=compiledMap;generationEnvelope=metadata;
    }else map=generated;
    mapHash=C.sha(map);geometryHash=C.sha({obstacles:map.obstacles,routes:map.routes,components:map.components});
    if(map.horizon!==14400||map.durationTicks!==14400||!same(physicalCondition(map.condition),physicalCondition(q.condition)))throw Error('120s generated map/physical condition mismatch');
    const F=require(C.within(root,'source/vendor/engine/core.js')),R=require(C.within(root,'source/vendor/route-controller-v6.cjs')),P=require(C.within(root,'source/vendor/policies/policies-v4.cjs'));
    F.validate(map);require(C.within(root,'source/vendor/contract.cjs')).validate(map,ROLES[q.role].route);C.verifyLoaded(fr,root);C.checkSourceSnapshot(freeze,root);
    description=Q.describe(map); // Missing/narrow semantic evidence is reported, never a general admission gate.
    if(q.referenceId){reference=load(q.referenceId,root);const t=trace(reference,root);if(reference.mapHash!==mapHash||reference.role!==q.role||reference.executionDependencyHash!==dependencyHash||reference.error||reference.ticks!==14400||!reference.fullTrace||!q.fullTrace||!reference.taskPass)throw Error('Replay requires matching full passing nominal, roles and unchanged dependencies');input=new Set(t.flapTicks);}
    physicalStarted=true;state=F.createState(map);initialState=structuredClone(state);
    controller=input?null:ROLES[q.role].policy==='route'?R.create(map,ROLES[q.role].route,false):P.create(ROLES[q.role].policy,{seed:map.seed,task:'safe'});
    function capture(a=false){
      rows.push([state.tick,state.x,state.y,state.vy,+a,+state.alive,state.vx,state.main_time_s]);
      const serialized=JSON.stringify(state);stateChain.update(serialized+'\n');if(q.fullTrace)stateHashes.push({tick:state.tick,sha256:C.sha(serialized)});
      const bodies=F.obstacles(map,state.tick,state);pairCoreSamples.push(...Q.pairSamples(description,state,bodies,F.R));
      if(state.tick%12===0)clearanceSamples.push(O.clearance(map,state,bodies,F.R));
      bodyCapture.capture(O.bodyFrame(state,bodies,q.windows));
      if(state.tick%120===0)checkpoints.push({tick:state.tick,stateSHA256:C.sha(state)});
      if(selected.has(state.tick))boundaries.push({tick:state.tick,state:structuredClone(state),stateSHA256:C.sha(state),controllerStats:controller?.stats?.()??null,restorationUsed:false,pendingQueue:'Continuously retained in live controller closure; never reset/restored'});
    }
    capture();
    while(state.alive&&!state.terminal&&!state.won&&state.tick<q.stopTick){
      if(wall()>=L.LIMITS.watchdogSeconds)throw Error('180s per-run watchdog');
      const tick=state.tick,action=input?input.has(tick):!!controller(P.augmentObservation(map,state,F.observation(map,state)));
      if(action)flapTicks.push(tick);physicsCalls++;F.step(map,state,action,tm);completedTicks++;
      if(state.tick!==tick+1)throw Error('Non-unit physical tick advance');capture(action);
    }
    C.checkSourceSnapshot(freeze,root);
  }catch(e){error=String(e.stack||e);status=physicalStarted?'execution_failure':'generation_or_admission_failure';}
  const controllerStats=controller?.stats?.()??null;
  if(state&&rows.length)try{
    metrics=require(C.within(root,'source/vendor/metrics-v4.cjs')).measure(map,rows,state.events,ROLES[q.role].route,state,controllerStats);
    quality=Q.measure({map,rows,flapTicks,clearanceSamples,pairCoreSamples,route:ROLES[q.role].route});
    generalObservation=O.measure({map,rows,flapTicks,clearanceSamples,windows:q.windows});
  }catch(e){error=(error?error+'\n':'')+'Metric failure: '+String(e.stack||e);status='metric_failure';}
  const bodyFrames=bodyCapture.finish(),stateSequenceSHA256=stateChain.digest('hex'),taskPass=Q.taskPass(metrics),inputSHA256=C.sha(flapTicks),traceFile=state?'evidence/traces/'+q.id+'.json.gz':null,mapFile=map?'evidence/maps/'+mapHash+'.json.gz':null,runFile='evidence/runs/'+q.id+'.json.gz';
  let traceSHA256=null,evidenceSaved=false,retention=null;
  const evidence={id:q.id,round:q.round,role:q.role,...ROLES[q.role],mapHash,conditionHash:conditionKey(q.condition),sourceManifestHash:fr.manifestHash,executionDependencyHash:dependencyHash,inputSource:input?'exact-authenticated-replay':'live-frozen-controller',referenceId:q.referenceId,initialState,finalState:state,worldHeight:map?.height,rows,stateHashes:q.fullTrace?stateHashes:null,fullWorldHashes:q.fullTrace,checkpoints,boundaries,flapTicks,inputSHA256,stateSequenceSHA256,events:state?.events??[],clearanceSamples,pairCoreSamples,controllerStats,windows:q.windows,stateRowSchema:['tick','x','y','vy','inputCausingThisRow','alive','vx','absoluteTimeSeconds'],continuity:{startedAtTick:initialState?.tick??null,prefixPhysicalTicksCharged:physicsCalls,stopTick:q.stopTick,window:null,restorationUsed:false},error};
  try{
    let bytes=null;if(state){if(quality){const encoded=S.finish(evidence,{quality,rows,bodyFrames,windows:q.windows});bytes=encoded.traceBytes;retention=encoded.evidence.retention;}else{bytes=S.encode({...evidence,bodySamples:bodyFrames,retention:{status:'all-available-raw-fallback',qualificationBlocked:true}});}}
    L.resources(root,(bytes?.length??0)+(map?Buffer.byteLength(JSON.stringify(map)):0)+65536);
    if(map){const mf=C.within(root,mapFile);if(C.fs.existsSync(mf)){if(C.sha(C.readGz(mf))!==mapHash)throw Error('Existing immutable map differs');}else C.write(mf,C.zlib.gzipSync(JSON.stringify(map)));}
    if(bytes){traceSHA256=C.sha(bytes);C.write(C.within(root,traceFile),bytes);evidenceSaved=true;}
  }catch(e){error=(error?error+'\n':'')+'Evidence failure: '+String(e.stack||e);status='evidence_failure';}
  let sourceFrozen=true;try{C.checkSourceSnapshot(freeze,root);}catch(e){sourceFrozen=false;error=(error?error+'\n':'')+String(e.stack||e);status='source_changed';}
  const result={schema:'adaptive-general-physical-run/1',...q,...ROLES[q.role],slot,sourceManifestHash:fr.manifestHash,executionDependencyHash:dependencyHash,freeze,receiptHash:receipt.receiptHash,preregistrationPath,generationEnvelope,generationEnvelopeSHA256:generationEnvelope?C.sha(generationEnvelope):null,planSHA256:generationEnvelope?C.sha(generationEnvelope.plan):null,physicalStarted,status,conditionHash:conditionKey(q.condition),mapHash,geometryHash,mapFile,traceFile,runFile,traceSHA256,inputSHA256,stateSequenceSHA256,initialStateSHA256:C.sha(initialState),finalStateSHA256:C.sha(state),ticks:physicsCalls,completedTicks,substeps:tm.executedSubsteps,terminalTick:state?.tick??0,wallSeconds:wall(),metrics,taskPass,quality,generalObservation,retention,error,diagnosticOnly:['H1','H1-slow'].includes(q.role),integrity:{startedAtTickZero:initialState?.tick===0,physicalPrefixCharged:true,exactTickProgression:physicsCalls===completedTicks&&state?.tick===completedTicks,trueSubstepTelemetry:tm.executedSubsteps>=completedTicks,sourceFrozen,traceSaved:evidenceSaved},humanFunClaim:false};
  const resultSHA256=C.sha(result);C.write(C.within(root,runFile),C.zlib.gzipSync(JSON.stringify({...result,resultSHA256})));
  L.commit({id:q.id,status,physicalStarted,ticks:physicsCalls,substeps:tm.executedSubsteps,wallSeconds:result.wallSeconds,mapHash,traceSHA256,resultSHA256,error},root);
  return {...result,resultSHA256};
}
function runPlan({preregistrationPath,freeze,receiptPath,maxSlots=192},root=C.ROOT){
  if(!Number.isInteger(maxSlots)||maxSlots<1||maxSlots>192)throw Error('Bounded1–192 slots required');
  const p=C.read(C.within(root,preregistrationPath)),done=new Set(L.rows(root).filter(r=>r.kind==='request').map(r=>r.id)),out=[];
  for(const s of p.slots.filter(s=>!done.has(s.id)).slice(0,maxSlots)){if(C.fs.existsSync(C.within(root,'STOP')))break;const r=executeSlot({...s,preregistrationPath,freeze,receiptPath,outputRoot:root});out.push({id:r.id,status:r.status,ticks:r.ticks,taskPass:r.taskPass,error:r.error});if(r.error)break;}
  return {runs:out,cost:L.summary(root)};
}
function exactReplayComparison(a,b,root=C.ROOT){
  a=typeof a==='string'?load(a,root):a;b=typeof b==='string'?load(b,root):b;const at=trace(a,root),bt=trace(b,root);
  const checks={...Object.fromEntries(['mapHash','conditionHash','executionDependencyHash','role','ticks','inputSHA256','stateSequenceSHA256','initialStateSHA256','finalStateSHA256'].map(k=>[k,a[k]===b[k]])),everyTickHashes:at.stateHashes?.length===a.ticks+1&&same(at.stateHashes,bt.stateHashes),events:same(at.events,bt.events),allRows:same(at.rows,bt.rows)};
  return {passed:b.pool==='replay'&&b.referenceId===a.id&&!a.error&&!b.error&&Object.values(checks).every(Boolean),checks};
}
module.exports={ROLES,physicalCondition,conditionKey,executionSpec,validateSpec,panelPlan,pureGeneration,executeSlot,runPlan,load,trace,exactReplayComparison};
if(require.main===module){const [cmd,...a]=process.argv.slice(2);if(cmd==='run-plan')console.log(JSON.stringify(runPlan({preregistrationPath:a[0],freeze:a[1],receiptPath:a[2],maxSlots:a[3]?Number(a[3]):192})));else if(cmd==='summary')console.log(JSON.stringify(L.summary()));else throw Error('Commands: run-plan or summary');}
