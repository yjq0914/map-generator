'use strict';
// Source-only exact normal form. No mutable pointer, evidence or engine pose reads.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const same=require('node:util').isDeepStrictEqual,clone=structuredClone;
const B=require('./b005-stage-recovery.cjs'),H=require('./b007-relocated-hammer.cjs'),T=require('./b008-timed-aperture.cjs');
const U=require('./recovery-utils.cjs'),F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const CONFIG=freeze(require('./configs/b009-shared-program-v1.json')),VERSION='exact-b005-fixed-timed-hammer-program/1',STYLE='shared-base-timed-aperture-and-hammer';
const need=(v,s)=>{if(!v)throw Error('Shared program: '+s);};
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
function dependencies(){
 const expected={schema:'fixed-two-mechanic-program/1',scaffold:'exact-b005-stage-recovery-v1',operations:[{type:'timed-middle-pair-receiver-chain',stage:0,operator:'b008-timed-aperture',request:T.CONFIG.program},{type:'relocated-hammer-opposite-receiver',stage:1,operator:'b007-relocated-hammer',request:H.CONFIG.program}],normalForm:'T+H; stable source IDs; exactly one materialization from B'};
 need(same(CONFIG.program,expected),'fixed typed operation/schema/phase recipe changed');
 need(CONFIG.version==='b009-shared-base-timed-and-hammer-v1'&&CONFIG.module==='source/b009-shared-program.cjs'&&CONFIG.comparisonParent===H.CONFIG.version&&CONFIG.constructionParent==='exact-b005-stage-recovery-v1','fixed source/comparison identity changed');
 need(Object.keys(CONFIG).sort().join(',')==='activation,comparisonParent,constructionParent,dependencies,module,program,qualification,version','unknown configuration field');
 for(const [f,h]of Object.entries(CONFIG.dependencies))need(hash(fs.readFileSync(path.join(__dirname,'..',f)))===h,'frozen dependency changed: '+f);
}
function entry(e={}){return H.entry(e);}
function identity(m,v){m.id=v.id;m.mapId=v.mapId;m.design.generatorVersion=v.generatorVersion;m.design.qualification=v.qualification;}
function uniqueById(os,id){const xs=os.filter(o=>o.id===id);need(xs.length===1,'source ID missing/duplicate: '+id);return xs[0];}
function witnesses(input){
 dependencies();const e=entry(input),base=B.generate(B.CONFIG,e);H.validateInput(base);T.validateInput(base);
 const hp=H.planHammerPatch(base,H.resolvePhrase(base)),tp=T.planPatch(base,T.resolvePhrase(base));
 const hammer=H.mergeChecked(base,hp),aperture=T.mergeChecked(base,tp);
 need(same(H.reverseChecked(hammer,hp),base)&&same(T.reverseChecked(aperture,tp),base),'old exact reversals failed');
 need(hp.componentIndex!==tp.phrase.componentIndex&&String(base.components[hp.componentIndex].stageId)==='1'&&String(base.components[tp.phrase.componentIndex].stageId)==='0','fixed typed owner conflict');
 need(!tp.before.some(o=>o.id===hp.sourceId),'overlapping source write');
 need(same(hp.effects.identityBefore,tp.identityBefore),'global base identity conflict');
 const ids=base.obstacles.map(o=>o.id);need(new Set(ids).size===ids.length,'duplicate base source ID');
 need(ids.indexOf(tp.before[1].id)===ids.indexOf(tp.before[0].id)+1,'base pair adjacency changed');
 return{base,hp,tp,hammer,aperture};
}
function programPlan(w){const {base,hp,tp,hammer,aperture}=w;return{schema:VERSION,program:clone(CONFIG.program),baseSHA256:hash(base),singleOutputSHA256:{hammer:hash(hammer),aperture:hash(aperture)},
 sourceIdentities:Object.fromEntries(['source/b005-stage-recovery.cjs','source/configs/b005-stage-recovery-v1.json','source/b007-relocated-hammer.cjs','source/configs/b007-relocated-hammer-v1.json','source/b008-timed-aperture.cjs','source/configs/b008-timed-aperture-v1.json'].map(f=>[f,CONFIG.dependencies[f]])),
 baseReadHashes:{hammer:hash(hp.readDependencies),aperture:tp.parentSHA256,hammerPatch:hash(hp),aperturePatch:hash(tp)},
 resolvedOperations:[{type:CONFIG.program.operations[0].type,componentIndex:tp.phrase.componentIndex,removedSourceIds:tp.before.map(o=>o.id),sourceId:tp.after.id,runtimeBodyIds:clone(tp.apertureProgram.runtimeBodyIds)},{type:CONFIG.program.operations[1].type,componentIndex:hp.componentIndex,sourceId:hp.sourceId,runtimeBodyIds:clone(hp.effects.hammerProgram.physicalBodyIds)}],
 identityBefore:clone(hp.effects.identityBefore),identityAfter:{id:CONFIG.version+'-'+base.seed,mapId:CONFIG.version+'-'+base.seed,generatorVersion:CONFIG.version,qualification:CONFIG.qualification},
 singleIdentities:{hammer:clone(hp.effects.identityAfter),aperture:clone(tp.identityAfter)},
 pressure:{originalCount:base.design.pressureProgram.pairRecords.length,commonPairIds:clone(tp.apertureProgram.commonPressurePairIds),replacedRecordSHA256:hash(tp.apertureProgram.replacedPressureRecord)},
 provenance:{hammerDeclaration:'design.hammerProgram',hammerBinding:'design.relocatedHammerProgram',apertureDeclaration:'design.timedApertureProgram',scope:'complete frozen single-operator declarations planned on B; never claimed as reads of C',wholeBaseMapCopies:0},
 readConflictResolution:{baseReadSets:'recomputed through unchanged old guards on exactly the same B',globalIdentity:'one combined writer',components:'distinct typed owners merged once',actualExpressions:'two distinct current slots; all other slots retained',pressure:'remove precisely one authenticated B record by stable pairId',hammerPredecessorChanged:hp.phrase.predecessor.componentIndex===tp.phrase.componentIndex,changedReadContexts:'separate current effective snapshots, immutable original base phrase retained in relocatedHammerProgram'},
 physicalQualification:null,humanFun:null};}
function currentContexts(m,w){const {hp,tp}=w,p=hp.phrase;return{
 hammer:{role:'current-effective-context',basePhraseSHA256:hash(p),component:clone(m.components[hp.componentIndex]),sourceDescriptor:clone(uniqueById(m.obstacles,hp.sourceId)),predecessorComponent:clone(m.components[p.predecessor.componentIndex]),successorComponent:clone(m.components[p.successor.componentIndex]),routesSHA256:hash(m.routes),unchangedBridgeSHA256:hash({predecessor:p.predecessor.connectors,owner:p.connectors}),unchangedSuccessorBodiesSHA256:hash(p.successor.firstDemandBodies)},
 aperture:{role:'current-effective-context',basePhraseSHA256:hash(tp.phrase),component:clone(m.components[tp.phrase.componentIndex]),sourceDescriptor:clone(uniqueById(m.obstacles,tp.after.id)),routesSHA256:hash(m.routes)}
 };}
function checkRuntimeIds(m){const source=new Set(m.obstacles.map(o=>o.id));need(source.size===m.obstacles.length,'duplicate source identity');const runtime=[];for(const o of m.obstacles){const ids=o.mechanic_kind==='timed_armor_gate'?[o.id+':top',o.id+':bottom']:o.mechanic_kind==='swing_armor_hammer'?[o.id,o.id+':arm']:[o.id];for(const id of ids){need(id===o.id||!source.has(id),'derived/source ID collision');runtime.push(id);}}need(new Set(runtime).size===runtime.length,'derived runtime ID collision');}
function checkCurrent(m,w){const {base,hp,tp}=w;checkRuntimeIds(m);
 for(const r of ['main','branch'])Contract.validate(m,r);F.validate(m);U.assertFiniteTree(m);
 for(const q of hp.readDependencies.protectedIntervals){const ids=m.obstacles.filter(o=>o.x+o.collider.w+F.R>q.x[0]&&o.x-F.R<q.x[1]).map(o=>o.id);need(ids.every(id=>q.allowedIds.includes(id)),'combined intrusion in '+q.role);}
 for(const k of ['routes','routeMarks','macroPlan','initial_player','horizon','durationTicks','width','height','condition'])need(same(m[k],base[k]),'protected field changed: '+k);
 need(same(m.design.componentTimeline,base.design.componentTimeline),'absolute clock/timeline changed');
 need(same(m.design.components,m.components),'current component aliases differ');
 need(same(m.design.stageRecoveryProgram.actualExpressions[hp.componentIndex],hp.effects.expressionAfter)&&same(m.design.stageRecoveryProgram.actualExpressions[tp.phrase.componentIndex],tp.expressionAfter),'current expression mismatch');
 const pairs=base.design.pressureProgram.pairRecords.filter(r=>r.pairId!==tp.apertureProgram.replacedPressureRecord.pairId);need(pairs.length===14&&base.design.pressureProgram.pairRecords.length===15&&same(pairs,m.design.pressureProgram.pairRecords),'authenticated14 current pressure mismatch');
 need(same(pairs.map(r=>r.pairId),tp.apertureProgram.commonPressurePairIds),'common pressure identity mismatch');
}
function materialize(w,plan){const {base,hp,tp}=w,m=clone(base),remove=new Set(tp.before.map(o=>o.id));
 // Single traversal of B. Original saved integer indices never address C.
 m.obstacles=base.obstacles.flatMap(o=>{if(o.id===hp.sourceId){need(same(o,hp.before),'hammer before mismatch');return[clone(hp.after)];}if(o.id===tp.before[0].id){need(same(o,tp.before[0]),'timed top before mismatch');return[clone(tp.after)];}if(remove.has(o.id)){need(same(o,tp.before[1]),'timed bottom before mismatch');return[];}return[clone(o)];});
 m.components[hp.componentIndex].relations.push(clone(hp.effects.relationAppend));m.components[tp.phrase.componentIndex]=clone(tp.componentAfter);m.design.components=m.components;
 m.design.stageRecoveryProgram.actualExpressions[hp.componentIndex]=clone(hp.effects.expressionAfter);m.design.stageRecoveryProgram.actualExpressions[tp.phrase.componentIndex]=clone(tp.expressionAfter);
 m.design.pressureProgram.pairRecords=m.design.pressureProgram.pairRecords.filter(r=>r.pairId!==tp.apertureProgram.replacedPressureRecord.pairId);
 m.design.hammerProgram=clone(hp.effects.hammerProgram);m.design.relocatedHammerProgram=clone(hp.effects.bindingProgram);m.design.timedApertureProgram=clone(tp.apertureProgram);identity(m,plan.identityAfter);
 m.design.sharedMechanicProgram={...clone(plan),effectiveContexts:currentContexts(m,w)};checkCurrent(m,w);return m;}
function undoDeclared(m,w){const {base,hp,tp}=w,out=clone(m);out.obstacles=out.obstacles.flatMap(o=>o.id===hp.sourceId?[clone(hp.before)]:o.id===tp.after.id?clone(tp.before):[o]);
 out.components[hp.componentIndex].relations.pop();out.components[tp.phrase.componentIndex]=clone(tp.componentBefore);out.design.components=out.components;
 out.design.stageRecoveryProgram.actualExpressions[hp.componentIndex]=clone(hp.effects.expressionBefore);out.design.stageRecoveryProgram.actualExpressions[tp.phrase.componentIndex]=clone(tp.expressionBefore);
 const byId=new Map(out.design.pressureProgram.pairRecords.map(r=>[r.pairId,r]));byId.set(tp.apertureProgram.replacedPressureRecord.pairId,clone(tp.apertureProgram.replacedPressureRecord));out.design.pressureProgram.pairRecords=base.design.pressureProgram.pairRecords.map(r=>byId.get(r.pairId));
 delete out.design.hammerProgram;delete out.design.relocatedHammerProgram;delete out.design.timedApertureProgram;delete out.design.sharedMechanicProgram;identity(out,hp.effects.identityBefore);return out;}
function generate(config=CONFIG,input={}){if(arguments.length===1&&!same(config,CONFIG)){input=config;config=CONFIG;}need(same(config,CONFIG),'configuration changed');const w=witnesses(input),plan=programPlan(w),m=materialize(w,plan);need(same(undoDeclared(m,w),w.base),'combined reversal failed');return m;}
function planProgram(base,program=CONFIG.program){need(same(program,CONFIG.program),'unknown typed program/order/operation');const w=witnesses(base?.condition);need(same(base,w.base),'program requires untouched exact B');return programPlan(w);}
function mergeChecked(base,plan){const w=witnesses(base?.condition);need(same(base,w.base)&&same(plan,programPlan(w)),'unknown field/read-set/owner/program conflict');const m=materialize(w,plan);need(same(undoDeclared(m,w),base),'undeclared combined writes');return m;}
function validateCombined(m){need(m?.design?.sharedMechanicProgram,'combined declaration missing');const w=witnesses(m.condition),canonical=materialize(w,programPlan(w));need(same(m,canonical),'candidate differs from complete deterministic normal form');need(same(undoDeclared(m,w),w.base),'exact B reversal failed');return true;}
function reverseChecked(m){validateCombined(m);const w=witnesses(m.condition),out=undoDeclared(m,w);need(same(out,w.base),'combined reverse differs from B');return out;}
function project(m,arm){validateCombined(m);need(['B','H','T'].includes(arm),'projection must be B/H/T');const w=witnesses(m.condition),out=undoDeclared(m,w);need(same(out,w.base),'projection base not exact');if(arm==='B')return out;const result=arm==='H'?H.mergeChecked(out,w.hp):T.mergeChecked(out,w.tp);need(same(result,arm==='H'?w.hammer:w.aperture),'single projection differs from frozen output');return result;}
function validateScientificMap(m){need(m&&m.condition,'map required');if(m.design?.sharedMechanicProgram){validateCombined(m);return{arm:'C',sourceValidated:true};}const w=witnesses(m.condition);need(same(m,w.hammer),'only exact H scientific parent or exact C allowed');return{arm:'H',sourceValidated:true};}
function commonPairViews(m){need(m&&m.condition,'map required');const w=witnesses(m.condition),combined=materialize(w,programPlan(w)),arm=m.design?.sharedMechanicProgram?'C':'H';need(same(m,arm==='C'?combined:w.hammer),'only exact H or C common-pair source');const v={arm,sourceValidated:true},ids=w.tp.apertureProgram.commonPressurePairIds;
 need(same(w.hammer.design.pressureProgram.pairRecords.filter(r=>ids.includes(r.pairId)),combined.design.pressureProgram.pairRecords),'parent/candidate common records differ');
 return{...v,baseMapHash:hash(w.base),parentMapHash:hash(w.hammer),candidateMapHash:hash(combined),commonPairIds:clone(ids),replacedPressureRecord:clone(w.tp.apertureProgram.replacedPressureRecord),originalPressurePairCount:15,map:m};}
function effectiveObserverContexts(m){need(m&&m.condition,'map required');const w=witnesses(m.condition),arm=m.design?.sharedMechanicProgram?'C':'H';need(same(m,arm==='C'?materialize(w,programPlan(w)):w.hammer),'only exact H or C effective context');const h=clone(w.hp.effects.bindingProgram),a=clone(w.tp.apertureProgram);
 h.phrase.component=clone(m.components[w.hp.componentIndex]);h.phrase.source=clone(uniqueById(m.obstacles,w.hp.sourceId));h.phrase.predecessor.component=clone(m.components[h.phrase.predecessor.componentIndex]);h.phrase.successor.component=clone(m.components[h.phrase.successor.componentIndex]);
 a.phrase.component=clone(m.components[w.tp.phrase.componentIndex]);
 return{hammer:h,aperture:a};}
module.exports={CONFIG,VERSION,STYLE,hash,entry,dependencies,generate,planProgram,mergeChecked,validateCombined,reverseChecked,project,validateScientificMap,commonPairViews,effectiveObserverContexts};
