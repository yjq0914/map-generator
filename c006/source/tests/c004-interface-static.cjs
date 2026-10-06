'use strict';
const fs=require('node:fs'),path=require('node:path'),same=require('node:util').isDeepStrictEqual;
const Guard=require('../../design/static-engine-guard.cjs'),A=require('../proposal-recipe-composer.cjs'),L=require('../c004-structural-laser.cjs'),G=require('../c004-laser-generator.cjs'),Old=require('../b003-warning-laser-v2.cjs'),Registry=require('../a012-style-registry.cjs'),S=require('../proposal-request-selector.cjs'),P=require('../c004-parent-binding.cjs'),Brief=require('../c001-intent-briefs.cjs'),Prefix=require('../c002-subset-briefs.cjs');
const clone=structuredClone,mode='preparation-static',checks=[],conditions=[];
const test=(name,fn)=>{fn();checks.push({name,pass:true});};
const ok=(v,s)=>{if(!v)throw Error(s);};const reject=(fn,why)=>{let e;try{fn();}catch(x){e=x;}ok(e&&(!why||e.message.includes(why)),'expected rejection: '+why);return e.message;};
const physical={seed:224143937,y:295,vy:-50,lead:-15,phase:.3,adjacency:'upper-after'};
const act=(kind,stage=0)=>({kind,stage});
const request=(rs)=>Brief.request([act('read-warning'),act('maintain-side'),act('receive'),...(rs.includes('T')?[act('cross-changing-gap'),act('receive')]:[]),...(rs.includes('H')?[act('cross-moving-boundary',1),act('receive',1)]:[])],{constraints:{minRecipes:rs.length,maxRecipes:rs.length,projectiles:'forbid',encounterWindowSeconds:[0,rs.length===1?15:120]}});
const base=A.generateParent(physical),patch=L.planPatch(base),site=L.summarizeSite(base,patch),oldMap=Old.generate(Old.CONFIG,physical);
conditions.push({condition:physical,purpose:'previously public laser source binding and all four bounded compositions'});
test('same physical recipe as old b003-v2 at known public source',()=>ok(same(patch.after,oldMap.obstacles.find(o=>o.id===patch.before.id)),'descriptor mismatch'));
test('old exact-a012 guard still rejects exactB',()=>reject(()=>Old.apply(base),'requires exact declared construction parent'));
test('same-side facts and warning/maintain/receive only',()=>ok(site.routeFacts.every(q=>q.sourceSide===q.receiverSide)&&same(site.events.map(e=>e.kind),['read-warning','maintain-side','receive']),'semantics'));
test('old summarizeSite reversal guard unchanged',()=>reject(()=>S.summarizeSite(base,'L',{effects:{program:{phrase:{componentIndex:patch.componentIndex,previous:patch.before,receiver:patch.phrase.receiver,routeFacts:patch.phrase.routeFacts.map(q=>({...q,previous:q.source}))},warning:{startSeconds:.46},nominalCoreSeconds:2,expectedShots:[]}},after:patch.after}),'reversal'));
test('minimum public tick0 prefix 1485 ticks',()=>ok(patch.effects.program.recovery.minimumStopTick===1485,'prefix changed'));
for(const rs of [['L'],['H','L'],['L','T'],['H','L','T']]){
 const companions=rs.filter(r=>r!=='L'),old=A.compose(physical,companions,{mode:'experimental-static'}),ins=A.inspect(physical);
 test('disjoint edits '+rs.join(''),()=>A.checkDisjoint(base,[...companions.map(r=>ins.edits[r]),patch.edit]));
 const out=L.applyToCompanion(base,old.map,patch);
 test('exact additive inverse '+rs.join(''),()=>ok(same(L.undo(out,patch),old.map),'inverse'));
 test('selector chooses '+rs.join(''),()=>ok(S.select(G.forms(),{sites:{...ins.sites,L:site}},request(rs),()=>true).selectedNormalForm===rs.join(''),'selection'));
}
test('L/J strict resource conflict',()=>reject(()=>A.checkDisjoint(base,[A.inspect(physical).edits.J,patch.edit]),'conflict'));
test('L/J current map explicitly rejected',()=>reject(()=>L.applyToCompanion(base,A.compose(physical,['J'],{mode:'experimental-static'}).map,patch),'L/J'));
test('mutated patch rejected',()=>{const p=clone(patch);p.after.timeline.active_s=.9;reject(()=>L.applyToCompanion(base,base,p),'mutated patch');});
test('changed protected receiver rejected',()=>{const b=clone(base);b.obstacles.find(o=>o.id===patch.phrase.receiver.id).y++;reject(()=>L.applyToCompanion(base,b,patch),'protected body');});
test('changed local route rejected',()=>{const b=clone(base);b.routes.main.segments[patch.phrase.routeFacts[0].source.segmentIndex].targetY++;reject(()=>L.applyToCompanion(base,b,patch),'local route');});
test('unsupported complete old semantic request remains unsupported',()=>reject(()=>S.select(G.forms().filter(f=>!f.recipes.includes('L')),A.inspect(physical),request(['L']),()=>true),'unsupported brief'));
test('durable terminal c003 parent binding',()=>ok(G.dependencies()===G.sourceIdentity&&P.CONFIG.round==='c003','terminal binding'));
const e={seed:1,y:270,vy:0,lead:0,phase:0,adjacency:'none'},macro={schema:'late-macro-request/1',firstDemand:'any',firstRecoverySeconds:1.6,theme:{staggerGradient:1,pairSymmetryGradient:-1}};
conditions.push({condition:e,purpose:'already public c003 source fixture, same macro in companion and L arm'});
for(const [recipes,companionIndex]of [[['L'],2],[['H','L','T'],6]]){
 const q={schema:G.REQUEST,prefix:request(recipes),companion:{schema:'flappy-prefix-and-late-macro-request/1',prefix:Prefix.control[companionIndex].request,macro}},pair=G.compilePair(e,q,mode);
 test('new interface selected '+recipes.join(''),()=>ok(same(pair.candidate.plan.selectedRecipes,recipes),'wrong selection'));
 test('same macro/routes '+recipes.join(''),()=>ok(same(pair.parent.map.design.lateMacroProgram,pair.candidate.map.design.lateMacroProgram)&&same(pair.parent.map.routes,pair.candidate.map.routes),'macro drift'));
 test('complete old intent not silently relaxed '+recipes.join(''),()=>ok(pair.candidate.plan.comparison.completeOldIntent.status==='unsupported'&&pair.candidate.plan.comparison.pairedSemanticRequestsEquivalent===false,'false semantic equivalence'));
 test('paired exact source admission '+recipes.join(''),()=>G.authenticatePair(pair.parent,pair.candidate,mode));
 if(recipes.length===1)test('mismatched companion rejected',()=>{const bad=clone(q);bad.companion.prefix=Prefix.control[3].request;reject(()=>G.compilePair(e,bad,mode),'candidate minus L');});
}
for(const p of Prefix.control){const q={schema:'flappy-prefix-and-late-macro-request/1',prefix:p.request,macro:null};test('inherited call-through '+p.briefId,()=>ok(same(G.compile(e,q,mode),P.compile(e,q,mode)),'inherited envelope changed'));}
const report={schema:'c004-focused-source-preparation-checks/1',sourceIdentity:G.sourceIdentity,checks:checks.length,passed:checks.every(q=>q.pass),conditions,guard:Guard.report(),results:checks,limits:['static construction only','no completed c004 or execution admission','c003 parent provisional until durable terminal binding','no current heldout values/results read']};
fs.writeFileSync(path.resolve(__dirname,'../../reports/c004-bound-static.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks,passed:report.passed,guard:report.guard}));
