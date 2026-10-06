'use strict';
// A new explicit companion experiment. Its physical reference is an unchanged
// accepted request, not a silent relaxation of the new complete intent.
const fs=require('node:fs'),path=require('node:path'),same=require('node:util').isDeepStrictEqual;
const Parent=require('./c004-parent-binding.cjs'),A=require('./proposal-recipe-composer.cjs'),Selector=require('./proposal-request-selector.cjs'),L=require('./c004-structural-laser.cjs');
const clone=structuredClone,hash=A.hash,VERSION='c004-structural-laser-companion-generator/1',REQUEST='flappy-laser-companion-request/1';
const need=(v,s)=>{if(!v)throw Error('c004 palette: '+s);};
const files=['c004-laser-generator.cjs','c004-laser-parent.cjs'];
const digests=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(__dirname,f)))]));
const sourceIdentity=hash({digests,parent:Parent.sourceIdentity,laser:L.sourceIdentity});
function dependencies(mode){Parent.dependencies(mode);L.dependencies();for(const [f,h]of Object.entries(digests))need(hash(fs.readFileSync(path.join(__dirname,f)))===h,'source changed: '+f);return sourceIdentity;}
function entry(input,mode){return Parent.entry(input,mode);}
function normalizeRequest(q,mode){
 if(q?.schema!==REQUEST)return Parent.normalizeRequest(q,mode);
 need(q&&same(Object.keys(q).sort(),['companion','prefix','schema']),'unknown/missing new request fields');
 return{schema:REQUEST,prefix:Selector.normalizeRequest(q.prefix),companion:Parent.normalizeRequest(q.companion,mode)};
}
function facts(input){const f=A.inspect(input),base=A.generateParent(input),patch=L.planPatch(base);return{...f,base,patch,sites:{...f.sites,L:L.summarizeSite(base,patch)}};}
function forms(){return [...Array.from({length:8},(_,n)=>{const rs=A.RECIPE_IDS.filter((_,i)=>n&(1<<i));return{key:rs.join('')||'B',recipes:rs};}),...[["L"],["H","L"],["L","T"],["H","L","T"]].map(recipes=>({key:recipes.join(''),recipes}))];}
function compilePair(input,q,mode){
 dependencies(mode);const request=normalizeRequest(q,mode);
 if(request.schema!==REQUEST){const unchanged=Parent.compile(input,request,mode);return{parent:clone(unchanged),candidate:clone(unchanged)};}
 const condition=entry(input,mode),f=facts(condition),selection=Selector.select(forms(),f,request.prefix,()=>true);
 need(selection.selectedRecipes.includes('L'),'new wrapper must select L; call inherited producer for unchanged requests');
 const companion=Parent.compile(condition,request.companion,mode),companionRecipes=selection.selectedRecipes.filter(r=>r!=='L');
 need(same(companion.plan.selectedRecipes,companionRecipes),'explicit companion must select exactly candidate minus L');
 const oldEdits=companionRecipes.map(r=>f.edits[r]),conflict=A.checkDisjoint(f.base,[...oldEdits,f.patch.edit]);
 const candidateMap=L.applyToCompanion(f.base,companion.map,f.patch);
 candidateMap.id=candidateMap.mapId=VERSION+'-'+candidateMap.seed;candidateMap.design.generatorVersion=VERSION;candidateMap.design.qualification='Prospective exactB laser binding with explicit accepted companion; current physical qualification pending';
 // The accepted parent is asked the new semantic brief separately. Refusal is
 // a capability result and is never substituted into the physical reference.
 const oldRequest=request.companion.schema==='flappy-prefix-and-late-macro-request/1'?{...clone(request.companion),prefix:clone(request.prefix)}:clone(request.prefix);
 let oldIntent;try{const p=Parent.compile(condition,oldRequest,mode);oldIntent={status:'supported',selectedRecipes:clone(p.plan.selectedRecipes),mapHash:p.mapHash};}catch(e){oldIntent={status:'unsupported',reason:e.message,physicalFallback:'none; independent explicitly requested companion supplies physical reference'};}
 const plan={schema:VERSION,sourceIdentity,condition:clone(condition),request,requestHash:hash(request),baseMapHash:hash(companion.map),exactBMapHash:hash(f.base),selectedNormalForm:selection.selectedNormalForm,selectedRecipes:clone(selection.selectedRecipes),selectedSites:clone(selection.selectedSites),actionMatches:clone(selection.actionMatches),themeProfile:clone(selection.themeProfile),themeScore:selection.themeScore,selection:clone(selection),
  parentBinding:{module:Parent.CONFIG.module,round:Parent.CONFIG.round,bindingSourceIdentity:Parent.sourceIdentity,acceptedSnapshotSHA256:Parent.CONFIG.acceptedSnapshotSHA256},
  comparison:{kind:'explicit-companion-plus-identical-macro-vs-add-L',companionRequest:clone(request.companion),companionPlanHash:hash(companion.plan),companionProducerSourceIdentity:companion.sourceIdentity,companionRecipes,completeOldIntent:oldIntent,pairedSemanticRequestsEquivalent:false},
  laserPatchHash:hash(f.patch),conflict,expectedParentRoutesHash:hash(companion.map.routes),expectedCandidateRoutesHash:hash(candidateMap.routes),
  laserProgram:clone(f.patch.effects.program),macroPlan:clone(companion.plan.macroPlan??null),qualification:{prospectiveExperiment:true,freshPhysics:false,oldCallsUnchanged:true,LJCompatible:false,newPhysicalEvidence:false,humanFun:null}};
 need(same(candidateMap.routes,companion.map.routes)&&same(candidateMap.design.lateMacroProgram,companion.map.design.lateMacroProgram),'same macro/routes changed');
 const envelope=map=>({schema:'intent-generation-envelope/1',sourceIdentity,mapHash:hash(map),plan:clone(plan),map});return{parent:envelope(companion.map),candidate:envelope(candidateMap)};
}
function compile(input,q,mode){return compilePair(input,q,mode).candidate;}
function compileParent(input,q,mode){return compilePair(input,q,mode).parent;}
function verifyEnvelope(e,arm,mode){need(['parent','candidate'].includes(arm),'explicit arm required');need(same(e,compilePair(e?.plan?.condition,e?.plan?.request,mode)[arm]),'modified envelope');return true;}
function authenticatePair(parent,candidate,mode){need(same(parent?.plan,candidate?.plan),'different pair plans');verifyEnvelope(parent,'parent',mode);verifyEnvelope(candidate,'candidate',mode);return{sourceIdentity,parentMapHash:parent.mapHash,candidateMapHash:candidate.mapHash,planHash:hash(candidate.plan),newGameplaySample:parent.mapHash!==candidate.mapHash};}
module.exports={VERSION,REQUEST,sourceIdentity,dependencies,entry,normalizeRequest,compile,compileParent,compilePair,verifyEnvelope,authenticatePair,forms,facts,hash};
