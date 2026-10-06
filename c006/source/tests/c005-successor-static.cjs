'use strict';
const fs=require('node:fs'),path=require('node:path'),same=require('node:util').isDeepStrictEqual;
const Guard=require('../../design/static-engine-guard.cjs'),A=require('../proposal-recipe-composer.cjs'),L=require('../c005-structural-laser.cjs'),G=require('../c005-laser-generator.cjs'),P=require('../c005-parent-binding.cjs'),Old=require('../c004-laser-generator.cjs'),O=require('../../design/c005-observe.cjs'),Laser=require('../../design/c005-observe-laser.cjs');
const mode='preparation-static',clone=structuredClone,rows=require('../../reports/revealed-c004-regression-inputs.json').conditions,checks=[];
const ok=(v,s)=>{if(!v)throw Error(s);},test=(name,fn)=>{fn();checks.push({name,pass:true});};
const reject=(fn,why)=>{let e;try{fn();}catch(x){e=x;}ok(e&&(!why||e.message.includes(why)),'expected rejection: '+why);return e.message;};
let failedPair,failedPatch,failedBase,failedCompanion;
for(const c of rows){
 const physical=Object.fromEntries(['seed','y','vy','lead','phase','adjacency'].map(k=>[k,c[k]])),pair=G.compilePair(physical,c.brief,mode),base=A.generateParent(physical),patch=L.planPatch(base),companion=P.compile(physical,c.brief.companion,mode),context=pair.candidate.plan.laserProgram.currentSuccessorContext;
 test(c.id+' exact source and same macro/routes',()=>{G.authenticatePair(pair.parent,pair.candidate,mode);ok(same(pair.parent.map.routes,pair.candidate.map.routes)&&same(pair.parent.map.design.lateMacroProgram,pair.candidate.map.design.lateMacroProgram),'same macro/routes');});
 test(c.id+' unchanged strict descriptors and additive inverse',()=>{ok(same(L.undo(L.applyToCompanion(base,companion,patch,mode),patch),companion.map),'inverse');for(const r of patch.edit.strictReads)ok(L.hash(pair.candidate.map.obstacles.find(o=>o.id===r.resource.slice(10)))===r.beforeHash,'strict descriptor drift');});
 test(c.id+' current successor admitted in both arms with actual-body windows',()=>{Laser.admitProgram(pair.parent.map,pair.candidate.plan.laserProgram);Laser.admitProgram(pair.candidate.map,pair.candidate.plan.laserProgram);const windows=O.captureWindows(pair.parent,pair.candidate,mode);ok(windows.some(w=>w.name==='laser'&&w.startTick===0),'laser tick-zero');if(context.changed)ok(windows.some(w=>w.name==='aperture'&&w.forceSourceIds.includes(context.aperture.sourceId)),'T actual capture absent');});
 if(c.id==='control-04'){
  test('old frozen c004 refusal remains reproduced',()=>reject(()=>Old.compilePair(physical,c.brief),'successor context changed'));
  test('repair is specifically selected T second pair and receiver',()=>ok(context.changed&&same(context.changedBy,['T'])&&context.aperture.sourceId===companion.map.design.timedApertureProgram.sourceId&&context.aperture.receiverIds.length===2,'missing bound T context'));
  [failedPair,failedPatch,failedBase,failedCompanion]=[pair,patch,base,companion];
 }else test('nonconflicting public case has unchanged successor and physical laser',()=>{const old=Old.compilePair(physical,c.brief);ok(!context.changed&&same(pair.candidate.map.obstacles,old.candidate.map.obstacles)&&same(pair.candidate.map.routes,old.candidate.map.routes),'physical public regression');});
}
const mutate=(fn)=>{const e=clone(failedCompanion);fn(e);return e;};
test('undeclared successor relation rejected',()=>reject(()=>L.applyToCompanion(failedBase,mutate(e=>e.map.components[1].relations.push({type:'undeclared'})),failedPatch,mode),'not exact accepted'));
test('undeclared actual T descriptor rejected',()=>reject(()=>L.applyToCompanion(failedBase,mutate(e=>e.map.obstacles.find(o=>o.id===e.map.design.timedApertureProgram.sourceId).y+=.5),failedPatch,mode),'not exact accepted'));
test('protected first demand still rejected before context refresh',()=>reject(()=>L.applyToCompanion(failedBase,mutate(e=>e.map.obstacles.find(o=>o.id===failedPatch.phrase.successor.firstDemandBodies[0].id).y++),failedPatch,mode),'protected body'));
test('protected L receiver still rejected',()=>reject(()=>L.applyToCompanion(failedBase,mutate(e=>e.map.obstacles.find(o=>o.id===failedPatch.phrase.receiver.id).y++),failedPatch,mode),'protected body'));
test('L/J strict conflict remains',()=>reject(()=>A.checkDisjoint(failedBase,[A.inspect(failedBase.condition).edits.J,failedPatch.edit]),'conflict'));
test('falsified context cannot pass current-run admission',()=>{const m=clone(failedPair.candidate.map);m.design.laserProgram.currentSuccessorContext.current.component.relations=[];reject(()=>Laser.admitProgram(m),'bound actual successor context differs');});
test('unchanged inherited call-through',()=>ok(same(G.compile(failedBase.condition,failedCompanion.plan.request,mode),failedCompanion),'inherited envelope drift'));
const report={schema:'c005-focused-successor-repair-static/1',sourceIdentity:G.sourceIdentity,passed:true,checks:checks.length,results:checks,conditions:rows.map(c=>({id:c.id,originalRound:'c004',freshHeldout:false})),guard:Guard.report(),noNewDynamicEvidence:true,scope:'one revealed failed LT condition and one public nonconflicting L condition; old regression retained, no broad grid',pending:['durable serial ownership','prospective source and Library freeze','new paired actual T-successor evidence']};
fs.writeFileSync(path.resolve(__dirname,'../../reports/c005-bound-static.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks,passed:report.passed,guard:report.guard}));
