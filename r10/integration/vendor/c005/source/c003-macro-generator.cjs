'use strict';
// One request and one parent-selected optional program in both scientific arms.
// Macro-null is an exact inherited call-through, never a new physics sample.
const fs=require('node:fs'),path=require('node:path');
const same=require('node:util').isDeepStrictEqual,clone=structuredClone;
const Parent=require('./c003-parent-binding.cjs'),Macro=require('./c003-late-macro-core.cjs');
const hash=Parent.hash,VERSION='c003-request-selected-parent-plus-macro/1';
const files=['c003-macro-generator.cjs','c003-macro-parent.cjs','c003-late-macro-core.cjs'];
const digests=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(__dirname,f)))]));
const sourceIdentity=hash({files:digests,parent:Parent.sourceIdentity,macro:Macro.sourceIdentity});
const need=(v,s)=>{if(!v)throw Error('c003 macro interface: '+s);};
function dependencies(){Parent.dependencies();for(const [f,h]of Object.entries(digests))need(hash(fs.readFileSync(path.join(__dirname,f)))===h,'source changed: '+f);return sourceIdentity;}
function entry(input){return Parent.entry(input);}
function normalizeRequest(q){
 need(q&&typeof q==='object'&&!Array.isArray(q)&&same(Object.keys(q).sort(),['macro','prefix','schema']),'unknown/missing request fields');
 need(q.schema==='flappy-prefix-and-late-macro-request/1','request schema');
 return{schema:q.schema,prefix:Parent.normalizeRequest(q.prefix),macro:q.macro===null?null:Macro.request(q.macro)};
}
function compilePair(input,q){
 dependencies();const request=normalizeRequest(q),parent=Parent.compile(input,request.prefix);
 const transformed=request.macro===null?null:Macro.compile(input,request.prefix,request.macro,'experimental-static');
 const candidateMap=transformed?.map??clone(parent.map),physical=x=>({obstacles:x.obstacles,routes:x.routes,routeMarks:x.routeMarks});
 const plan={schema:VERSION,sourceIdentity,condition:clone(parent.plan.condition),request,requestHash:hash(request),baseMapHash:parent.mapHash,
  parentBinding:{round:Parent.CONFIG.round,module:Parent.CONFIG.module,producerSourceIdentity:parent.sourceIdentity,bindingSourceIdentity:Parent.sourceIdentity,acceptedSnapshotSHA256:Parent.CONFIG.acceptedSnapshotSHA256},
  selectedNormalForm:parent.plan.selectedNormalForm,selectedRecipes:clone(parent.plan.selectedRecipes),selectedSites:clone(parent.plan.selectedSites),prefixPlanHash:hash(parent.plan),macroPlan:transformed?.plan??null,
  expectedParentRoutesHash:hash(parent.map.routes),expectedCandidateRoutesHash:hash(candidateMap.routes),
  geometryChanged:!same(physical(parent.map),physical(candidateMap)),
  qualification:{prospectiveExperiment:true,freshPhysics:false,macroEnabled:request.macro!==null,sourceAndLocalContextInheritanceOnly:true,currentMapInteractionsMeasured:false,internalSymmetryOrStaggerCreated:false,humanFun:null}};
 const envelope=map=>({schema:'intent-generation-envelope/1',sourceIdentity,mapHash:hash(map),plan:clone(plan),map});
 return{parent:envelope(parent.map),candidate:envelope(candidateMap)};
}
function compile(input,request){return compilePair(input,request).candidate;}
function compileParent(input,request){return compilePair(input,request).parent;}
function verifyEnvelope(envelope,arm){need(['parent','candidate'].includes(arm),'explicit scientific arm required');need(same(envelope,compilePair(envelope?.plan?.condition,envelope?.plan?.request)[arm]),'modified envelope');return true;}
function authenticatePair(parent,candidate){
 need(same(parent?.plan,candidate?.plan),'arms differ in request/plan');
 const expected=compilePair(candidate?.plan?.condition,candidate?.plan?.request);
 need(same(parent,expected.parent)&&same(candidate,expected.candidate),'pair is not exact bound source output');
 return{sourceIdentity,parentMapHash:parent.mapHash,candidateMapHash:candidate.mapHash,planHash:hash(candidate.plan),routesAreIntentionallyDifferent:!same(parent.map.routes,candidate.map.routes),newGameplaySample:candidate.plan.geometryChanged};
}
module.exports={VERSION,sourceIdentity,dependencies,entry,normalizeRequest,compile,compileParent,compilePair,verifyEnvelope,authenticatePair,hash};
