'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {runDiagnostic}=require('../../../diagnostic.cjs');
const here=__dirname,hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const runs=[];
for(const [seed,id] of [[701,'light-ramp-701'],[702,'tidal-short-step-702']]){
 const p=path.join(here,`../B1/runs/baseline-${seed}/map.json`),map=JSON.parse(fs.readFileSync(p));
 if(seed===701){for(const g of map.integration.guide)if(g.policy==='laser-channel'){g.target_y=450;g.target_y_end=255;}}
 else {for(const mod of map.integration.modules.filter(m=>m.family==='tidal-staircase')){const bank=map.obstacles.find(o=>o.id===mod.id+'-bank-2');bank.collider.w=60;const guides=map.integration.guide.filter(g=>g.module_id===mod.id),low=guides.find(g=>g.target_y===385),prior=guides[guides.indexOf(low)-1];low.x=bank.x+bank.collider.w+10;prior.until_x=low.x;}}
 const mapFile=id+'.map.json',bytes=JSON.stringify(map)+'\n';fs.writeFileSync(path.join(here,mapFile),bytes,{flag:'wx'});
 runs.push({seed,id,sourceMap:path.relative(here,p),sourceMapSHA256:hash(fs.readFileSync(p)),mapFile,mapFileSHA256:hash(bytes),horizonTicks:4500,changes:seed===701?'Authored light ramp450→255; same geometry and release clock':'Intermediate bank-2 width120→60; release at exact whole-radius tail; remaining roof/aperture unchanged'});
}
const manifest={schema:'handoff-exploratory-native-probes/1',status:'preregistered-two-distinct-candidates-no-search',controller:'relational-source-v3',controllerSourceSHA256:hash(fs.readFileSync(path.join(here,'../../../diagnostic.cjs'))),runtimeSHA256:hash(fs.readFileSync(path.join(here,'../../../vendor/flappy-runtime.js'))),continuity:'Full baseline-world map; one createState per probe; no restore or reset; all failures saved',runs};
fs.writeFileSync(path.join(here,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
for(const e of runs){const map=JSON.parse(fs.readFileSync(path.join(here,e.mapFile))),r=runDiagnostic(map,{id:e.id,mode:'relational-source-v3',horizonTicks:e.horizonTicks,outDir:path.join(here,e.id)});console.log(JSON.stringify({id:e.id,outcome:r.outcome,tick:r.actualTicks,death:r.death,final:[r.finalState.x,r.finalState.y,r.finalState.vy]}));}
