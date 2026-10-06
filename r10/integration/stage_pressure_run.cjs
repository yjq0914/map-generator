'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {runDiagnostic}=require('./diagnostic.cjs');
const root=path.join(__dirname,'runs/stage-pressure');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
function run(loop,arm,reuseLoop=null){
 const dir=path.join(root,`B${loop}`),manifest=read(path.join(dir,`${arm}-manifest.json`));
 fs.mkdirSync(path.join(dir,'runs'),{recursive:true});
 for(const e of manifest.entries){
  const mapPath=path.join(dir,e.mapFile),map=read(mapPath),out=path.join(dir,'runs',e.id);
  if(fs.existsSync(out))throw Error('No evidence overwrite');
  if(hash(fs.readFileSync(mapPath))!==e.mapFileSHA256)throw Error('Changed preregistered map');
  if(reuseLoop!==null){
   const prior=path.join(root,`B${reuseLoop}`,'runs',`candidate-${e.seed}`),r=read(path.join(prior,'result.json'));
   if(JSON.stringify(read(path.join(prior,'map.json')))!==JSON.stringify(map)||r.horizonTicks!==e.horizonTicks||r.mode!=='relational-source-v3'||r.controllerSourceSHA256!==hash(fs.readFileSync(path.join(__dirname,'diagnostic.cjs')))||r.runtimeSHA256!==hash(fs.readFileSync(path.join(__dirname,'vendor/flappy-runtime.js'))))throw Error('Reuse signature mismatch');
   const sourceFiles=Object.fromEntries(['result.json','trace.json.gz','inputs.json','map.json'].map(n=>[n,hash(fs.readFileSync(path.join(prior,n)))]));
   fs.mkdirSync(out);fs.writeFileSync(path.join(out,'REUSED.json'),JSON.stringify({sourceDir:path.relative(path.join(__dirname,'..'),prior),sourceFiles,hashBound:true,horizonTicks:e.horizonTicks,request:e.request},null,2));
   console.log(JSON.stringify({id:e.id,reusedFrom:prior}));continue;
  }
  const r=runDiagnostic(map,{id:e.id,mode:'relational-source-v3',horizonTicks:e.horizonTicks,outDir:out});
  console.log(JSON.stringify({id:r.id,outcome:r.outcome,ticks:r.actualTicks,death:r.death?.id||null}));
 }
}
if(require.main===module)run(+process.argv[2],process.argv[3],process.argv[4]===undefined?null:+process.argv[4]);
module.exports={run};
