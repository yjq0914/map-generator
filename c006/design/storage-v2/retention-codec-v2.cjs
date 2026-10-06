'use strict';
// Pure prospective retention only. No filesystem, runtime, controller or simulation imports.
const crypto=require('node:crypto'),zlib=require('node:zlib');
const SCHEMA='targeted-evidence-retention/2', STATUS=['observed','not_applicable','missing','censored','unsupported','invalid'];
const sha=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function insist(v,m){if(!v)throw Error(m);}
function validateJSON(v){if(typeof v==='number')insist(Number.isFinite(v)&&!Object.is(v,-0),'Non-JSON number: preserve by explicit typed extension before retention');else if(Array.isArray(v))for(const x of v)validateJSON(x);else if(v&&typeof v==='object')for(const x of Object.values(v))validateJSON(x);else insist(v===null||['boolean','string'].includes(typeof v),'Non-JSON value');}
function doubles(a){const b=Buffer.alloc(a.length*8);a.forEach((x,i)=>{insist(typeof x==='number'&&Number.isFinite(x),'Invalid float64');b.writeDoubleLE(x,i*8);});return b.toString('base64');}
function undoubles(s,n){const b=Buffer.from(s,'base64');insist(b.length===n*8&&b.toString('base64')===s,'Invalid float64 tape');return Array.from({length:n},(_,i)=>b.readDoubleLE(i*8));}
function packRows(rows){insist(rows.every(r=>Array.isArray(r)&&r.length===8),'Row schema mismatch');return {length:rows.length,columns:Array.from({length:8},(_,i)=>doubles(rows.map(r=>r[i])))};}
function unpackRows(p){insist(p.columns.length===8,'Row column count');const c=p.columns.map(s=>undoubles(s,p.length));return Array.from({length:p.length},(_,i)=>c.map(a=>a[i]));}
function packHashes(a){if(a===null)return null;insist(Array.isArray(a),'Hash vector absent');return {ticks:a.map(x=>x.tick),sha256Bytes:Buffer.concat(a.map(x=>{insist(/^[a-f0-9]{64}$/.test(x.sha256??x.stateSHA256),'Invalid state hash');return Buffer.from(x.sha256??x.stateSHA256,'hex');})).toString('base64')};}
function unpackHashes(p,key){if(p===null)return null;const b=Buffer.from(p.sha256Bytes,'base64');insist(b.length===32*p.ticks.length&&b.toString('base64')===p.sha256Bytes,'Invalid hash tape');return p.ticks.map((tick,i)=>({tick,[key]:b.subarray(i*32,i*32+32).toString('hex')}));}
function authenticate({run,traceBytes,map,request,reserve,commit,ledger}){
 let prev=null;for(let i=0;i<ledger.length;i++){const {hash,...r}=ledger[i];insist(r.seq===i&&r.previousHash===prev&&sha(r)===hash,'Ledger chain mismatch');prev=hash;}
 for(const [kind,row]of Object.entries({request,reserve,commit}))insist(row?.kind===kind&&row.id===run.id&&ledger.some(x=>x.hash===row.hash&&eq(x,row)),'Missing authenticated '+kind);
 const {resultSHA256,...body}=run;insist(sha(body)===resultSHA256&&commit.resultSHA256===resultSHA256,'Result authentication mismatch');
 insist(commit.ticks===run.ticks&&commit.substeps===run.substeps&&commit.mapHash===run.mapHash&&reserve.maxTicks>=run.ticks,'Execution ledger mismatch');
 insist(sha(map)===run.mapHash&&sha(traceBytes)===run.traceSHA256&&commit.traceSHA256===run.traceSHA256,'Map/trace authentication mismatch');
 const trace=JSON.parse(zlib.gunzipSync(traceBytes));
 for(const k of ['id','mapHash','sourceManifestHash','executionDependencyHash','conditionHash','stateSequenceSHA256'])insist(trace[k]===run[k],'Trace '+k+' mismatch');
 insist(sha(trace.flapTicks)===run.inputSHA256&&trace.inputSHA256===run.inputSHA256,'Input mismatch');
 insist(sha(trace.initialState)===run.initialStateSHA256&&sha(trace.finalState)===run.finalStateSHA256,'Initial/final mismatch');
 insist(request.sourceManifestHash===run.sourceManifestHash,'Request source mismatch');
 return {trace,authentication:{method:'ledger-result-trace-map-input-initial-final-sha256/1',ledgerRows:ledger.length,ledgerHead:prev,requestHash:request.hash,reserveHash:reserve.hash,commitHash:commit.hash,sourceManifestHash:run.sourceManifestHash}};
}
// Normalize the exact sampled reducer domain. Legacy reduced traces contain sample geometry
// but omit some corresponding player rows; that boundary is always disclosed below.
function primaryTape(run,trace,map){
 const scope=run.quality.scope,last=trace.finalState.tick,byTick=new Map(),duplicateRows=new Set(),samples=new Map(),duplicateSamples=new Set();
 for(const r of trace.rows){if(byTick.has(r[0]))duplicateRows.add(r[0]);byTick.set(r[0],r);}
 for(const s of trace.clearanceSamples){if(samples.has(s.tick))duplicateSamples.add(s.tick);samples.set(s.tick,s);}
 const dense=trace.rows.length===last+1&&trace.rows.every((r,i)=>r[0]===i);
 const sequence=run.integrity.exactTickProgression===true&&run.completedTicks===last&&run.ticks===last&&trace.continuity.startedAtTick===0;
 insist(dense||sequence,'No authenticated continuous sequence attestation');
 const items=[];for(let t=Math.ceil(scope.startTick/12)*12;t<scope.endTick;t+=12){
  let s=samples.get(t),status;
  if(t>last)status='censored';else if(duplicateSamples.has(t)||duplicateRows.has(t))status='invalid';else if(!s||dense&&!byTick.has(t))status='missing';else{
   status=s.status;insist(STATUS.includes(status),'Unknown sample status');
   const r=byTick.get(t);if(status==='observed'&&(!Number.isFinite(s.width)||s.width<=0||s.width>map.height-20||!Number.isFinite(s.margin)||s.margin<0||s.margin>s.width/2||!Number.isFinite(s.lowerY)||!Number.isFinite(s.upperY)||Math.abs(s.upperY-s.lowerY-s.width)>1e-7||r&&(s.tick!==r[0]||s.x!==r[1]||s.y!==r[2]||!r[5])))status='invalid';
  }
  items.push({tick:t,status,width:status==='observed'?s.width:null});
 }
 return {schema:'effective-clearance-width-status/1',scope,firstTick:Math.ceil(scope.startTick/12)*12,samplePeriodTicks:12,terminalTick:last,continuousDenseSequence:sequence,normalizationCoverage:dense?'all-source-player-rows-validated':'legacy-reduced-source: sample geometry and retained rows validated; unretained row identity rests on authenticated runner/ledger',items};
}
function recomputePrimary(t){
 const expected=t.items,counts=Object.fromEntries(STATUS.map(k=>[k,0]));let nC=0,nW=0,c=0,w=0,maxC=0,maxW=0,min=null;
 expected.forEach((s,i)=>{insist(s.tick===t.firstTick+i*12&&STATUS.includes(s.status),'Malformed effective sample schedule');counts[s.status]++;const v=s.status==='observed';insist(!v||Number.isFinite(s.width),'Observed width missing');if(v&&s.width<240){nC++;c+=12/120;}else c=0;if(v&&s.width>=240){nW++;w+=12/120;}else w=0;maxC=Math.max(maxC,c);maxW=Math.max(maxW,w);if(v)min=min===null?s.width:Math.min(min,s.width);});
 const complete=t.continuousDenseSequence&&counts.observed===expected.length&&t.terminalTick>=t.scope.endTick;
 return {status:complete?'observed':counts.invalid?'invalid':counts.unsupported?'unsupported':counts.missing?'missing':'censored',samplePeriodTicks:12,expectedSamples:expected.length,counts,observedConstraintSeconds:nC*12/120,observedWideOpenSeconds:nW*12/120,maxContinuousSampledConstraintSeconds:maxC,maxContinuousSampledWideOpenSeconds:maxW,minimumObservedWidthPx:min};
}
function packPrimary(t){const {items,...header}=t;return {...header,statusCodes:items.map(x=>STATUS.indexOf(x.status)),widths:doubles(items.map(x=>x.width??0))};}
function unpackPrimary(p){const {statusCodes,widths,...header}=p,w=undoubles(widths,statusCodes.length);return {...header,items:statusCodes.map((c,i)=>{insist(Number.isInteger(c)&&c>=0&&c<STATUS.length,'Invalid status code');return {tick:p.firstTick+i*12,status:STATUS[c],width:c===0?w[i]:null};})};}
function policy(input={}){const p={schema:'targeted-retention-policy/2',overviewPeriodTicks:120,failureTailTicks:240,fullTrace:false,targetPairIds:[],targetComponentIndices:[],targetRanges:[],preregistrationHash:null,benchmarkOnly:false,...input};insist(p.schema==='targeted-retention-policy/2'&&p.overviewPeriodTicks===120&&p.failureTailTicks===240,'Unapproved retention periods');insist(typeof p.fullTrace==='boolean'&&Array.isArray(p.targetPairIds)&&Array.isArray(p.targetComponentIndices)&&Array.isArray(p.targetRanges),'Invalid target policy');if(p.targetPairIds.length||p.targetComponentIndices.length||p.targetRanges.length)insist(/^[a-f0-9]{64}$/.test(p.preregistrationHash??''),'Targets need frozen preregistration hash');for(const r of p.targetRanges)insist(Number.isInteger(r.startTick)&&Number.isInteger(r.endTick)&&r.startTick>=0&&r.endTick>=r.startTick,'Invalid target range');return p;}
function retain({run,trace,request,reserve,commit,map,authentication,retentionPolicy={},targetObservations=null,preregistration=null}){
 validateJSON({run,trace,request,reserve,commit,map,authentication,retentionPolicy,targetObservations,preregistration});
 const p=policy(retentionPolicy);
 const hasTargets=p.targetPairIds.length||p.targetComponentIndices.length||p.targetRanges.length;
 if(hasTargets){insist(preregistration&&sha(preregistration)===p.preregistrationHash,'Preregistration content hash mismatch');insist(eq(preregistration.targetPairIds,p.targetPairIds)&&eq(preregistration.targetComponentIndices,p.targetComponentIndices)&&eq(preregistration.targetRanges,p.targetRanges),'Target policy differs from preregistration');if(!p.benchmarkOnly)insist(authentication.preregistrationSHA256===p.preregistrationHash,'Preregistration lacks frozen admission binding');}
 const knownPairs=new Set((map.design?.pressureProgram?.pairRecords??[]).map(x=>x.pairId)),knownComponents=new Set((map.design?.componentTimeline??[]).map(x=>x.componentIndex));
 for(const id of p.targetPairIds)insist(knownPairs.has(id),'Unknown target pair');for(const id of p.targetComponentIndices)insist(knownComponents.has(id),'Unknown target component');
 insist(!trace.fullDenseRows||p.fullTrace,'Cannot downgrade a representative full trace');
 if(p.fullTrace){insist(trace.fullDenseRows&&trace.rows.length===run.terminalTick+1&&trace.rows.every((r,i)=>r[0]===i),'Full trace needs every actual row');insist(trace.stateHashes?.length===run.terminalTick+1&&trace.stateHashes.every((x,i)=>x.tick===i),'Full trace needs every actual full-state hash');}
 const ranges=[...(trace.continuity.window?[trace.continuity.window]:[]),...p.targetRanges];
 const targetComponents=(map.design?.componentTimeline??[]).filter(c=>p.targetComponentIndices.includes(c.componentIndex)),inComponent=x=>targetComponents.some(c=>x>=c.startX-10&&x<=c.endX+10);
 const inRange=t=>ranges.some(r=>t>=r.startTick&&t<=r.endTick),target=s=>p.targetPairIds.includes(s.pairId)||p.targetComponentIndices.includes(s.componentIndex),failure=run.taskPass!==true||run.error!==null;
 const pairCoreSamples=trace.pairCoreSamples.filter(s=>inRange(s.tick)||target(s)||failure&&s.tick>=run.terminalTick-240),pairTicks=new Set(pairCoreSamples.map(s=>s.tick)),boundaryTicks=new Set(trace.boundaries.map(b=>b.tick)),last=run.terminalTick;
 const rows=trace.rows.filter(r=>p.fullTrace||r[0]===0||r[0]===last||r[0]%120===0||boundaryTicks.has(r[0])||failure&&r[0]>=last-240||inRange(r[0])||inComponent(r[1])||pairTicks.has(r[0]));
 const bodySamples=trace.bodySamples.filter(s=>inRange(s.tick)||inComponent(s.x)||boundaryTicks.has(s.tick)||failure&&s.tick>=last-240);
 const primary=primaryTape(run,trace,map);insist(eq(recomputePrimary(primary),run.quality.clearance),'Primary recomputation differs from authenticated result');
 const observed=trace.clearanceSamples.filter(s=>s.status==='observed'),min=observed.length?Math.min(...observed.map(s=>s.width)):null,criticalTicks=new Set();
 if(min!==null)criticalTicks.add(observed.find(s=>s.width===min).tick);for(const status of STATUS){const s=trace.clearanceSamples.find(s=>s.status===status);if(s)criticalTicks.add(s.tick);}
 const criticalClearanceSamples=trace.clearanceSamples.filter(s=>criticalTicks.has(s.tick)||inRange(s.tick)||inComponent(s.x)||failure&&s.tick>=last-240);
 const {rows:discardRows,clearanceSamples:discardClearance,pairCoreSamples:discardPair,bodySamples:discardBody,stateHashes,checkpoints,rowStorage,...header}=trace;
 const rowTicks=new Set(rows.map(r=>r[0]));
 const targetedPairIds=[...new Set([...p.targetPairIds,...(map.design?.pressureProgram?.pairRecords??[]).filter(x=>p.targetComponentIndices.includes(x.componentIndex)).map(x=>x.pairId)])];
 const targetCoverage=targetedPairIds.map(id=>{const all=trace.pairCoreSamples.filter(s=>s.pairId===id),keep=pairCoreSamples.filter(s=>s.pairId===id),contiguous=all.length>0&&all.every((s,i)=>!i||s.tick===all[i-1].tick+1),rowsComplete=all.length>0&&all.every(s=>rowTicks.has(s.tick)),before=all.some(s=>s.status==='observed'&&s.centerX<s.x),after=all.some(s=>s.status==='observed'&&s.centerX>s.endX);return {pairId:id,sampleCount:all.length,retainedExactly:eq(all,keep),contiguous,allRawRowsRetained:rowsComplete,bracketedEntry:before,bracketedExit:after,status:!all.length?'censored':!contiguous||!rowsComplete?'missing':!before||!after?'censored':'observed'};});
 const componentCoverage=targetComponents.map(c=>{const rr=rows.filter(r=>r[1]>=c.startX-10&&r[1]<=c.endX+10),continuous=rr.length>0&&rr.every((r,i)=>!i||r[0]===rr[i-1][0]+1),before=rr.some(r=>r[1]<=c.startX),after=rr.some(r=>r[1]>=c.endX);return {componentIndex:c.componentIndex,retainedRows:rr.length,continuous,bracketedEntry:before,bracketedExit:after,status:!rr.length?'censored':!continuous?'missing':!before||!after?'censored':'observed'};});
 const rangeCoverage=ranges.map(r=>{const end=Math.min(r.endTick,last),n=Math.max(0,end-r.startTick+1),actual=rows.filter(x=>x[0]>=r.startTick&&x[0]<=end);return {startTick:r.startTick,endTick:r.endTick,actualPrefixRows:n,retainedRows:actual.length,status:last<r.startTick?'censored':actual.length!==n?'missing':last<r.endTick?'censored':'observed'};});
 const selected={...header,rows,pairCoreSamples,bodySamples,criticalClearanceSamples,primarySamples:primary,stateHashes,checkpoints:p.fullTrace?checkpoints:checkpoints.filter(s=>s.tick===0||s.tick===last||boundaryTicks.has(s.tick)||inRange(s.tick)||failure&&s.tick>=last-240),fullDenseRows:p.fullTrace,rowStorage:p.fullTrace?'all actual player rows; full per-tick world-state SHA vector':'1s overview + initial/final/boundaries + failure-last2s + preregistered targets + actual local window'};
 return {schema:SCHEMA,policy:p,preregistration,authentication,request,reserve,commit,run,mapReference:{mapHash:run.mapHash,mapFile:run.mapFile},trace:selected,targetObservations,coverage:{fullRawSemanticsRetained:false,oneSecondWorldHashesRetained:p.fullTrace?'all':'only initial/final/boundaries/explicit time ranges/failure tail; pair/component-only second hashes omitted; complete sequence commitment remains',fullDensePlayerRows:p.fullTrace,everyTickWorldStateHashes:p.fullTrace,newMechanicQualification:false,targetObservationValidation:targetObservations===null?'not supplied':'retained verbatim; separate versioned mechanic evaluator and admission required',allInputsAndResultsRetained:true,primarySampleValuesRecomputable:true,geometryRecomputation:'Full underlying clearance geometry requires authenticated replay except retained critical/target/failure samples',otherSemanticRecomputation:'All original values retained in run; non-target dense pair/component/cadence recomputation requires authenticated replay',sourceCounts:{rows:discardRows.length,clearanceSamples:discardClearance.length,pairCoreSamples:discardPair.length,bodySamples:discardBody.length},retainedCounts:{rows:rows.length,criticalClearanceSamples:criticalClearanceSamples.length,pairCoreSamples:pairCoreSamples.length,bodySamples:bodySamples.length},targetDenseCoverage:!hasTargets?'no-new-target-claim':targetCoverage.every(x=>x.status==='observed')&&componentCoverage.every(x=>x.status==='observed')&&rangeCoverage.every(x=>x.status==='observed')?'declared-target-rows-observed':'incomplete-declared-target; cannot qualify a new relation',targetCoverage,componentCoverage,rangeCoverage,preregistrationBinding:!hasTargets?'not_applicable':p.benchmarkOnly?'static-counterfactual-only; not a frozen execution policy':'frozen-admission-bound'}};
}
function verifyRetained(out){
 insist(out.schema===SCHEMA,'Retained schema mismatch');const p=policy(out.policy),r=out.run,t=out.trace;
 const {resultSHA256,...body}=r;insist(sha(body)===resultSHA256,'Retained original result hash mismatch');
 for(const kind of ['request','reserve','commit']){const row=out[kind],{hash,...payload}=row;insist(sha(payload)===hash&&row.kind===kind&&row.id===r.id&&out.authentication[kind+'Hash']===hash,'Retained '+kind+' binding mismatch');}
 insist(out.commit.resultSHA256===resultSHA256&&out.commit.ticks===r.ticks&&out.commit.substeps===r.substeps&&out.commit.mapHash===r.mapHash,'Retained commit mismatch');
 for(const k of ['id','role','mapHash','sourceManifestHash','executionDependencyHash','conditionHash','stateSequenceSHA256'])insist(t[k]===r[k],'Retained trace '+k+' mismatch');
 insist(out.mapReference.mapHash===r.mapHash&&out.mapReference.mapFile===r.mapFile,'Retained map reference mismatch');
 insist(sha(t.initialState)===r.initialStateSHA256&&sha(t.finalState)===r.finalStateSHA256&&sha(t.flapTicks)===r.inputSHA256&&t.inputSHA256===r.inputSHA256,'Retained physical commitment mismatch');
 insist(t.fullDenseRows===p.fullTrace&&out.coverage.fullDensePlayerRows===p.fullTrace&&out.coverage.everyTickWorldStateHashes===p.fullTrace,'Retained full trace flags mismatch');
 insist(t.rows.every((row,i)=>row.length===8&&row.every(Number.isFinite)&&Number.isInteger(row[0])&&(!i||row[0]>t.rows[i-1][0])),'Invalid retained rows');
 if(p.fullTrace)insist(t.rows.length===r.terminalTick+1&&t.rows.every((x,i)=>x[0]===i)&&t.stateHashes?.length===r.terminalTick+1&&t.stateHashes.every((x,i)=>x.tick===i&&/^[a-f0-9]{64}$/.test(x.sha256)),'Incomplete retained full trace');
 if(p.targetPairIds.length||p.targetComponentIndices.length||p.targetRanges.length)insist(out.preregistration&&sha(out.preregistration)===p.preregistrationHash,'Retained preregistration mismatch');
 const ps=t.primarySamples,scope=r.quality.scope;insist(ps.schema==='effective-clearance-width-status/1'&&ps.samplePeriodTicks===12&&eq(ps.scope,scope)&&ps.firstTick===Math.ceil(scope.startTick/12)*12&&ps.terminalTick===r.terminalTick&&ps.items.length===Math.max(0,Math.ceil((scope.endTick-ps.firstTick)/12)),'Retained primary domain mismatch');
 insist(eq(recomputePrimary(ps),r.quality.clearance),'Retained primary metric mismatch');return out;
}
function encode(retained){verifyRetained(retained);const {rows,primarySamples,stateHashes,checkpoints,...rest}=retained.trace;const payload={...retained,trace:{...rest,rowsPacked:packRows(rows),primaryPacked:packPrimary(primarySamples),stateHashesPacked:packHashes(stateHashes),checkpointsPacked:packHashes(checkpoints)}};const bytes=zlib.gzipSync(JSON.stringify(payload),{level:9});return {bytes,sha256:sha(bytes)};}
function decode(bytes,expectedSHA256){insist(typeof expectedSHA256==='string'&&sha(bytes)===expectedSHA256,'Encoded evidence hash mismatch');const p=JSON.parse(zlib.gunzipSync(bytes));insist(p.schema===SCHEMA,'Unsupported evidence schema');policy(p.policy);const {rowsPacked,primaryPacked,stateHashesPacked,checkpointsPacked,...rest}=p.trace;const out={...p,trace:{...rest,rows:unpackRows(rowsPacked),primarySamples:unpackPrimary(primaryPacked),stateHashes:unpackHashes(stateHashesPacked,'sha256'),checkpoints:unpackHashes(checkpointsPacked,'stateSHA256')}};insist(eq(recomputePrimary(out.trace.primarySamples),out.run.quality.clearance),'Decoded primary metric mismatch');return verifyRetained(out);}
// Optional exact-content sharing. Every nominal/replay is still executed and reduced
// independently. Only byte-identical packed physical payloads may share one blob.
function encodeShared(retained){
 verifyRetained(retained);const {id,inputSource,referenceId,...physical}=retained.trace;
 const {rows,primarySamples,stateHashes,checkpoints,...rest}=physical;
 const shared={schema:'targeted-physical-payload/2',trace:{...rest,rowsPacked:packRows(rows),primaryPacked:packPrimary(primarySamples),stateHashesPacked:packHashes(stateHashes),checkpointsPacked:packHashes(checkpoints)}};
 const blobBytes=zlib.gzipSync(JSON.stringify(shared),{level:9}),blobSHA256=sha(blobBytes);
 const {trace,...header}=retained,envelope={schema:'targeted-shared-envelope/2',retainedHeader:header,traceIdentity:{id,inputSource,referenceId},blobSHA256};
 const envelopeBytes=zlib.gzipSync(JSON.stringify(envelope),{level:9});
 return {blobBytes,blobSHA256,envelopeBytes,envelopeSHA256:sha(envelopeBytes)};
}
function decodeShared(envelopeBytes,envelopeSHA256,blobBytes){
 insist(sha(envelopeBytes)===envelopeSHA256,'Shared envelope hash mismatch');const e=JSON.parse(zlib.gunzipSync(envelopeBytes));
 insist(e.schema==='targeted-shared-envelope/2'&&sha(blobBytes)===e.blobSHA256,'Shared blob binding mismatch');
 const b=JSON.parse(zlib.gunzipSync(blobBytes));insist(b.schema==='targeted-physical-payload/2','Shared blob schema mismatch');
 const {rowsPacked,primaryPacked,stateHashesPacked,checkpointsPacked,...rest}=b.trace;
 const out={...e.retainedHeader,trace:{...rest,...e.traceIdentity,rows:unpackRows(rowsPacked),primarySamples:unpackPrimary(primaryPacked),stateHashes:unpackHashes(stateHashesPacked,'sha256'),checkpoints:unpackHashes(checkpointsPacked,'stateSHA256')}};
 insist(out.schema===SCHEMA,'Shared retained schema mismatch');policy(out.policy);
 insist(eq(recomputePrimary(out.trace.primarySamples),out.run.quality.clearance),'Shared primary metric mismatch');return verifyRetained(out);
}
module.exports={verifyRetained,encodeShared,decodeShared,SCHEMA,STATUS,sha,authenticate,primaryTape,recomputePrimary,policy,retain,encode,decode,packRows,unpackRows,packHashes,unpackHashes};
