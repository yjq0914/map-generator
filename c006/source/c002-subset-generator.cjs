'use strict';
// Narrow prospective-experiment adapter. Construction and selection are the
// unchanged tested generic edit algebra; no subset-specific construction branch.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const same=require('node:util').isDeepStrictEqual;
const Algebra=require('./proposal-recipe-composer.cjs');
const Selector=require('./proposal-request-selector.cjs');
const H=require('./b007-relocated-hammer.cjs');
const clone=structuredClone,root=path.join(__dirname,'..');
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const need=(v,s)=>{if(!v)throw Error('c002 experiment adapter: '+s);};
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const CONFIG=freeze(require('./configs/c002-subset-generator-v1.json'));
const VERSION='c002-prospective-disjoint-subset-generator/1';
const ownFiles=['source/c002-subset-generator.cjs','source/configs/c002-subset-generator-v1.json'];
const ownHashes=Object.fromEntries(ownFiles.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
const sourceIdentity=hash({algebraSourceIdentity:Algebra.sourceIdentity,ownHashes});
const stamps=new Map();
function dependencies(){
  need(Algebra.dependencies()===CONFIG.algebraSourceIdentity,'algebra source differs from reviewed prototype');
  for(const [file,digest]of Object.entries(ownHashes)){
    const p=path.join(root,file),s=fs.statSync(p,{bigint:true}),stamp=[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');
    if(stamps.get(file)!==stamp){need(hash(fs.readFileSync(p))===digest,'adapter source changed: '+file);stamps.set(file,stamp);}
  }
  const forms=Array.from({length:8},(_,n)=>{const recipes=Algebra.RECIPE_IDS.filter((_,i)=>n&(1<<i));return {key:recipes.join('')||'B',recipes};});
  need(same(CONFIG.qualifiedNormalForms,forms),'prospective frontier differs from exact three-operator power set');
  need(CONFIG.frontierMeaning==='experiment-admission-only; not an adoption or physical-qualification claim','frontier meaning changed');
  return sourceIdentity;
}
function entry(input={}){return H.entry(input);}
function normalizeRequest(request){return Selector.normalizeRequest(request);}
function compile(input,request){
  dependencies();
  const condition=entry(input),result=Algebra.compile(condition,request,{mode:'experimental-static'});
  const plan={...clone(result.selection),schema:VERSION,sourceIdentity,condition:clone(condition),baseMapHash:result.plan.baseMapHash,
    construction:{algebraSourceIdentity:Algebra.sourceIdentity,planSHA256:hash(result.plan),subsetKey:result.plan.subsetKey,
      conflict:clone(result.plan.conflict),patchHashes:clone(result.map.design.recipeSetProgram?.patchHashes??{}),
      mode:'prospective formal experiment; prototype construction mode retained unchanged'},
    selectionRule:'hard structural/action constraints; mean descriptor theme dot product; fewer recipes; lexical stable tie-break',
    qualification:{...clone(result.selection.qualification),freshPhysicalEvidence:false,adopted:false,
      inheritedGeometryForm:result.plan.qualification.inheritedGeometryForm,newSubsetPending:result.plan.qualification.newSubsetPending,
      arbitraryComposition:false,enumerationOrderInvariant:true,geometricTimeOrderMutable:false}};
  return {schema:'intent-generation-envelope/1',sourceIdentity,mapHash:result.mapHash,plan,map:result.map};
}
function generateParent(input={}){dependencies();return Algebra.generateParent(entry(input));}
function generate(config,input,request){need(same(config,CONFIG),'config changed');return compile(input,request).map;}
function planProgram(base,request){need(same(base,generateParent(base?.condition)),'complete exact B required');return compile(base.condition,request).plan;}
function mergeChecked(base,plan){need(same(base,generateParent(base?.condition)),'complete exact B required');const e=compile(base.condition,plan?.request);need(same(plan,e.plan),'modified producer plan');return e.map;}
function verifyEnvelope(envelope){need(same(envelope,compile(envelope?.plan?.condition,envelope?.plan?.request)),'modified immutable envelope');return true;}
function authenticateMap(map,request){const e=compile(map?.condition,request);need(same(map,e.map),'map differs from requested construction');return {sourceIdentity,mapHash:e.mapHash,plan:e.plan};}
function cacheStats(){const q=Algebra.cacheStats();return {...q,factBuilds:q.builds};}
module.exports={CONFIG,VERSION,sourceIdentity,hash,entry,dependencies,normalizeRequest,compile,generate,generateParent,planProgram,mergeChecked,verifyEnvelope,authenticateMap,cacheStats};
