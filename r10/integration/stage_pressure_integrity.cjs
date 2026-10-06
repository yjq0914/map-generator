'use strict';
// Read existing evidence only: no runtime loading, stepping or reconstruction.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const base=path.join(__dirname,'runs/stage-pressure'),repo=path.dirname(__dirname);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const read=p=>JSON.parse(fs.readFileSync(p));
const runtime=sha(fs.readFileSync(path.join(__dirname,'vendor/flappy-runtime.js'))),controller=sha(fs.readFileSync(path.join(__dirname,'diagnostic.cjs')));
function assert(v,m){if(!v)throw Error(m);}
assert(runtime==='58c19ff5f258bfc05ff2a4b1b9f8edbbf7742fc57fa1c0c294b1ddfda668e987','runtime drift');
assert(controller==='b97537cfc5e50fb43f8bd517d1c59be8d1038590069d434dab46cc79fbc26fb5','controller drift');
const runs=[],reuses=[];
function scan(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())scan(p);else if(e.name==='result.json')runs.push(d);else if(e.name==='REUSED.json')reuses.push(p);}}
scan(base);
for(const d of runs){const r=read(path.join(d,'result.json')),m=read(path.join(d,'map.json')),bytes=fs.readFileSync(path.join(d,'trace.json.gz')),t=JSON.parse(zlib.gunzipSync(bytes)),input=read(path.join(d,'inputs.json'));
 assert(r.traceSHA256===sha(bytes),d+' trace hash');assert(r.mapSHA256===sha(JSON.stringify(m)),d+' map hash');assert(t.mapSHA256===r.mapSHA256,d+' trace map');
 assert(r.runtimeSHA256===runtime&&r.controllerSourceSHA256===controller,d+' frozen sources');assert(t.rows.length===r.actualTicks+1,d+' rows');
 assert(t.rows.every((x,i)=>x[0]===i),d+' native ticks');assert(r.physicsCalls===r.actualTicks,d+' physics calls');assert(r.initialState.tick===0&&t.rows[0][0]===0,d+' one initial state');
 assert(r.continuity.nativeInitializations===1&&r.continuity.restores===0&&r.continuity.resets===0&&r.continuity.deletedHazards===0,d+' continuity');
 assert(input.inputSHA256===r.inputSHA256&&r.inputSHA256===sha(JSON.stringify(input.flapTicks)),d+' inputs');assert(input.flapTicks.length===r.flapCount,d+' count');
 assert(m.integration.status==='experimental',d+' experimental');assert(r.error===null,d+' execution error');
}
for(const p of reuses){const ref=read(p),d=path.join(repo,ref.sourceDir);assert(ref.hashBound===true,p+' hash binding');
 for(const [name,h]of Object.entries(ref.sourceFiles))assert(sha(fs.readFileSync(path.join(d,name)))===h,p+' source '+name);
 const r=read(path.join(d,'result.json'));assert(r.horizonTicks===ref.horizonTicks&&r.controllerSourceSHA256===controller&&r.runtimeSHA256===runtime,p+' reuse controls');
}
let logical=0,newPanel=0;for(let i=1;i<=4;i++){const d=path.join(base,`B${i}`);const requests={};for(const arm of['baseline','candidate','holdout']){const man=read(path.join(d,`${arm}-manifest.json`));assert(man.entries.length===8,d+' bounded arm');logical+=8;
 requests[arm]=man.entries.map(e=>e.request);for(const e of man.entries){assert(e.horizonTicks===3600,d+' horizon');assert(sha(fs.readFileSync(path.join(d,e.mapFile)))===e.mapFileSHA256,d+' preregistered map');if(!fs.existsSync(path.join(d,'runs',e.id,'REUSED.json')))newPanel++;}
 if(man.skill_reference)assert(sha(fs.readFileSync(path.join(repo,man.skill_reference.snapshot)))===man.skill_reference.sha256,d+' skill reference');
 }assert(JSON.stringify(requests.baseline)===JSON.stringify(requests.candidate),d+' paired requests');}
const frozen=read(path.join(base,'EVALUATOR-FREEZE.json'));for(const [f,h]of Object.entries(frozen.source_sha256))assert(sha(fs.readFileSync(path.join(__dirname,f)))===h,'evaluator '+f);
const result={schema:'stage-pressure-evidence-integrity/1',actualNativeRuns:runs.length,logicalPanelScenarios:logical,newPanelRuns:newPanel,hashBoundReuseEntries:reuses.length,diagnosticRuns:runs.filter(x=>x.includes('/B3/diagnostics/')).length,finishRuns:runs.filter(x=>x.includes('/B4/finish-checks/')).length,runtimeSHA256:runtime,controllerSHA256:controller,evaluatorFrozen:true,allVerified:true,scope:'Recorded evidence hashes, row/tick continuity, fixed sources and requests; not replay, playability or safety proof'};
assert(result.actualNativeRuns===70&&logical===96&&newPanel===64&&reuses.length===32&&result.diagnosticRuns===2&&result.finishRuns===4,'unexpected experiment count');
console.log(JSON.stringify(result,null,2));
