'use strict';
// Explicit accepted-prefix physical companion plus new complete late request.
const fs=require('node:fs'),path=require('node:path'),same=require('node:util').isDeepStrictEqual;
const Parent=require('./neighbor-parent-binding.cjs'),Core=require('./neighbor-late-macro-v2.cjs'),clone=structuredClone,hash=Core.hash;
const VERSION='prospective-neighbor-companion-generator/1',REQUEST='neighbor-late-macro-request/1';
const binding={status:Parent.CONFIG.status,expectedSourceIdentity:Parent.sourceIdentity,producerBinding:clone(Parent.CONFIG),...(Parent.CONFIG.status==='durable-accepted'?{acceptedSnapshot:Parent.CONFIG.acceptedSnapshot,acceptedSnapshotSHA256:Parent.CONFIG.acceptedSnapshotSHA256,round:Parent.CONFIG.round,generator:'source/'+Parent.CONFIG.module}:{})};
const Macro=Core.create({sourceRoot:Parent.sourceRoot,parent:Parent,binding});
const files=['neighbor-generator.cjs','neighbor-parent.cjs'],digests=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(__dirname,f)))]));
const sourceIdentity=hash({digests,parent:Parent.sourceIdentity,macro:Macro.sourceIdentity});
const need=(v,s)=>{if(!v)throw Error('Neighbor envelope: '+s);};
function dependencies(){Parent.dependencies();Macro.dependencies();for(const [f,h]of Object.entries(digests))need(hash(fs.readFileSync(path.join(__dirname,f)))===h,'source changed: '+f);return sourceIdentity;}
const entry=input=>Parent.entry(input);
function normalizeRequest(q){
 if(q?.schema!==REQUEST)return Parent.normalizeRequest(q);
 need(same(Object.keys(q).sort(),['macro','parentRequest','schema']),'unknown/missing request fields');
 need(q.macro!==null,'new companion experiment requires non-null macro; use exact inherited request otherwise');
 return{schema:REQUEST,parentRequest:Parent.normalizeRequest(q.parentRequest),macro:Macro.request(q.macro)};
}
function oldCompleteRequest(q,macro){
 if(q.schema==='flappy-prefix-and-late-macro-request/1')return{...clone(q),macro:clone(macro)};
 if(q.schema==='flappy-laser-companion-request/1')return{...clone(q),companion:oldCompleteRequest(q.companion,macro)};
 throw Error('unsupported old complete request shape');
}
function compilePair(input,q){
 dependencies();const request=normalizeRequest(q);
 if(request.schema!==REQUEST){const unchanged=Parent.compile(input,request);return{parent:clone(unchanged),candidate:clone(unchanged)};}
 const accepted=Parent.compile(input,request.parentRequest),moved=Macro.compile(input,request.parentRequest,request.macro,'experimental-static');
 need(accepted.mapHash===moved.plan.prefixMapHash&&!accepted.map.design.lateMacroProgram,'explicit macro-null accepted prefix is required in both arms');
 const selectedRecipes=clone(accepted.plan.selectedRecipes);need(Array.isArray(selectedRecipes),'accepted recipe plan required');
 need(!(selectedRecipes.includes('L')&&selectedRecipes.includes('J')),'L/J conflict');
 let completeOldIntent;try{const exact=Parent.compile(input,oldCompleteRequest(request.parentRequest,request.macro));completeOldIntent={status:'supported',mapHash:exact.mapHash,selectedRecipes:clone(exact.plan.selectedRecipes)};}catch(e){completeOldIntent={status:'unsupported',reason:e.message,physicalFallback:'none; the explicit same-condition macro-null parentRequest supplies the physical companion'};}
 const plan={schema:VERSION,sourceIdentity,condition:clone(accepted.map.condition),request,requestHash:hash(request),baseMapHash:accepted.mapHash,parentPlan:clone(accepted.plan),parentEnvelopeSHA256:hash(accepted),parentProducerSourceIdentity:accepted.sourceIdentity,
  selectedNormalForm:accepted.plan.selectedNormalForm,selectedRecipes,selectedSites:clone(accepted.plan.selectedSites),macroPlan:clone(moved.plan),
  parentBinding:clone(Parent.CONFIG),comparison:{kind:'same-explicit-accepted-prefix-vs-add-neighbor-macro',completeOldIntent,pairedSemanticRequestsEquivalent:false},
  expectedParentRoutesHash:hash(accepted.map.routes),expectedCandidateRoutesHash:hash(moved.map.routes),
  qualification:{prospectiveExperiment:true,actualParentBinding:Parent.CONFIG.status,freshPhysics:false,oldCallsUnchanged:true,internalPatternsCreated:false,humanFun:null}};
 const envelope=map=>({schema:'intent-generation-envelope/1',sourceIdentity,mapHash:hash(map),plan:clone(plan),map});
 return{parent:envelope(accepted.map),candidate:envelope(moved.map)};
}
const compile=(input,q)=>compilePair(input,q).candidate,compileParent=(input,q)=>compilePair(input,q).parent;
function verifyEnvelope(e,arm){need(['parent','candidate'].includes(arm),'explicit arm required');need(same(e,compilePair(e?.plan?.condition,e?.plan?.request)[arm]),'modified envelope');return true;}
function authenticatePair(parent,candidate){need(same(parent?.plan,candidate?.plan),'different pair plans');verifyEnvelope(parent,'parent');verifyEnvelope(candidate,'candidate');return{sourceIdentity,parentMapHash:parent.mapHash,candidateMapHash:candidate.mapHash,planHash:hash(candidate.plan),newGameplaySample:parent.mapHash!==candidate.mapHash};}
module.exports={VERSION,REQUEST,CONFIG:Parent.CONFIG,sourceRoot:Parent.sourceRoot,Macro,sourceIdentity,dependencies,entry,normalizeRequest,compile,compileParent,compilePair,verifyEnvelope,authenticatePair,hash};
