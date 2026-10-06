'use strict';
const C=require('./common.cjs'),K=require('../design/storage-v2/retention-codec-v2.cjs'),O=require('./general-observer.cjs');
const VERSION='general-dense-physical-evidence/1';
function encode(e) {
  const {rows,stateHashes,checkpoints,...rest}=e;
  return C.zlib.gzipSync(JSON.stringify({...rest,schema:VERSION,rowsPacked:K.packRows(rows),stateHashesPacked:K.packHashes(stateHashes),checkpointsPacked:K.packHashes(checkpoints)}),{level:6});
}
function decode(bytes) {
  const e=JSON.parse(C.zlib.gunzipSync(bytes));
  if(e.schema!==VERSION)throw Error('Unexpected general evidence schema');
  const {rowsPacked,stateHashesPacked,checkpointsPacked,...rest}=e;
  return {...rest,rows:K.unpackRows(rowsPacked),stateHashes:K.unpackHashes(stateHashesPacked,'sha256'),checkpoints:K.unpackHashes(checkpointsPacked,'stateSHA256')};
}
function finish(e,{quality,rows,bodyFrames,windows}) {
  const last=e.finalState?.tick??0;
  const dense={...e,rows};
  const primary=K.primaryTape({quality,integrity:{exactTickProgression:e.continuity.startedAtTick===0&&last===e.continuity.prefixPhysicalTicksCharged},completedTicks:last,ticks:last},dense,{height:e.worldHeight});
  if(JSON.stringify(K.recomputePrimary(primary))!==JSON.stringify(quality.clearance))throw Error('Unchanged primary reducer/retention mismatch');
  const evidence={...dense,schema:VERSION,primarySamples:primary,
    bodySamples:bodyFrames.filter(s=>s.tick%120===0||s.tick===last||s.tick>=last-240||O.inWindows(s.tick,windows)),
    retention:{policyVersion:VERSION,fullDensePlayerRows:true,allInputsEventsInitialFinalResults:true,
      everyTickWorldStateHashes:e.fullWorldHashes===true,fullWorldStateSequenceCommitment:true,
      all12TickClearanceGeometry:true,allActualPairSamples:true,
      actualBodyStorage:'one-second local overview + every requested window tick + final two seconds; no synthetic poses',
      outsideWindowBodies:'Unretained per-tick body geometry requires authenticated replay',
      primarySampleValuesExactlyRecomputable:true}};
  return {evidence,traceBytes:encode(evidence)};
}
module.exports={VERSION,encode,decode,finish};
