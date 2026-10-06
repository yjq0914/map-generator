'use strict';
const fs=require('node:fs'),path=require('node:path'),same=require('node:util').isDeepStrictEqual;
const root=path.resolve(__dirname,'../..'),guard=require('../../design/static-engine-guard.cjs');
const A=require('../c002-subset-generator.cjs'),Algebra=require('../proposal-recipe-composer.cjs'),Old=require('../c001-intent-generator.cjs');
const B=require('../c002-subset-briefs.cjs'),O=require('../../design/c001-observe-v2.cjs');
const condition={seed:0,y:270,vy:0,lead:0,phase:0,adjacency:'none'},checks=[];
const check=(name,pass,detail={})=>{if(!pass)throw Error(name);checks.push({name,passed:true,...detail});};
for(const {briefId,request}of B.control){
 const e=A.compile(condition,request),raw=Algebra.compile(condition,request,{mode:'experimental-static'});
 check('unchanged generic construction: '+e.plan.selectedNormalForm,same(e.map,raw.map)&&e.mapHash===raw.mapHash);
 check('immutable envelope: '+e.plan.selectedNormalForm,A.verifyEnvelope(e));
 const form=A.CONFIG.qualifiedNormalForms.find(f=>f.key===e.plan.selectedNormalForm);
 check('unchanged v2 observer source/plan admission: '+form.key,
  same(form.recipes,e.plan.selectedRecipes)&&same(e.plan.selectedSites.map(s=>s.recipe),form.recipes)&&
  e.plan.sourceIdentity===A.dependencies()&&same(e.plan.condition,A.entry(condition))&&
  same(e.plan.request,A.normalizeRequest(request))&&e.plan.requestHash===A.hash(e.plan.request));
 check('source-derived capture windows: '+form.key,O.captureWindows(e.map,e.plan).length===form.recipes.length);
 if(Algebra.CONFIG.inheritedGeometryForms.includes(form.key)){
  const old=Old.compile(condition,request);
  check('complete inherited physical contract: '+form.key,same(Algebra.physicalContract(e.map),Algebra.physicalContract(old.map)),{legacyMapHash:old.mapHash,currentMapHash:e.mapHash});
 }
}
check('base exact identity',same(A.generateParent(condition),Old.generateParent(condition)));
const sample=A.compile(condition,B.control[0].request),mutated=structuredClone(sample);mutated.plan.selectedRecipes=['J'];
let rejected=false;try{A.verifyEnvelope(mutated);}catch{rejected=true;}check('mutated envelope rejected',rejected);
rejected=false;try{Algebra.compose(condition,['J','T']);}catch{rejected=true;}check('prototype ordinary JT entry remains fail-closed',rejected);
const report={schema:'c002-interface-static/1',sourceIdentity:A.sourceIdentity,checks,count:checks.length,
 inheritedPrototype:{manifestSHA256:A.hash(fs.readFileSync(path.join(root,'protocols/c002-prototype-manifest.json'))),staticChecks:345,mutationChecks:5,rerun:false},
 physics:guard.report(),legacyObserverSHA256:A.hash(fs.readFileSync(path.join(root,'design/c001-observe-v2.cjs'))),
 qualification:'Static source/interface compatibility only; no new physical qualification'};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});fs.writeFileSync(path.join(root,'reports/c002-interface-static.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({count:report.count,physics:report.physics,sourceIdentity:report.sourceIdentity}));
