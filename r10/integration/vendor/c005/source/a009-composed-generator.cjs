'use strict';
const same=require('node:util').isDeepStrictEqual,C=require('./recovery-canonical.cjs'),Base=require('./recovery-generator.cjs'),A=require('./a006-following-generator.cjs'),B=require('./a007-phase-generator-v2.cjs'),Old=require('./a007-style-registry-v2.cjs'),F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x}
const CONFIG=deepFreeze(require('./configs/a009-composed-v1.json')),clone=structuredClone;
const labels=new Set(['id','mapId','design.generatorVersion','design.qualification','design.components']);
function noDelete(base,x){if(base&&x&&typeof base==='object'&&typeof x==='object'){for(const k of Object.keys(base)){if(!Object.hasOwn(x,k))throw Error('Composition deletion forbidden: '+k);noDelete(base[k],x[k])}}}
function merge(base,a,b,path=''){
 if(!path){noDelete(base,a);noDelete(base,b)}
 if(labels.has(path))return clone(base);
 if(same(a,base))return clone(b);if(same(b,base)||same(a,b))return clone(a);
 if([base,a,b].every(x=>Array.isArray(x))&&base.length===a.length&&a.length===b.length)return base.map((x,i)=>merge(x,a[i],b[i],path+'.'+i));
 if([base,a,b].every(x=>x&&typeof x==='object'&&!Array.isArray(x))){const out={};for(const k of new Set([...Object.keys(base),...Object.keys(a),...Object.keys(b)])){const p=path?path+'.'+k:k;if(!Object.hasOwn(base,k)){if(Object.hasOwn(a,k)&&Object.hasOwn(b,k)&&!same(a[k],b[k]))throw Error('Composition added-field conflict: '+p);out[k]=clone(Object.hasOwn(a,k)?a[k]:b[k]);}else{if(!Object.hasOwn(a,k)||!Object.hasOwn(b,k))throw Error('Composition deletion forbidden: '+p);out[k]=merge(base[k],a[k],b[k],p)}}return out}
 throw Error('Composition semantic conflict: '+path);
}
function generate(config,input={}){
 if(!same(config,CONFIG))throw Error('Composition changed config');const e=C.entry(input),base=Base.generate(Base.CONFIG,e),a=A.generate(A.CONFIG,e),b=B.generate(B.CONFIG,e);
 const h=a.design.followingGateProgram.target,p=b.design.phaseWindowProgram;
 if(h.componentIndex===p.componentIndex||[h.topId,h.bottomId].includes(p.wallId))throw Error('Composition requires disjoint semantic targets');
 const m=merge(base,a,b);m.design.components=m.components;m.id=m.mapId='a009-horizontal-phase-composed-v1-'+m.seed;
 m.design.generatorVersion='a009-horizontal-phase-composed-v1';m.design.qualification='Unqualified explicit composition; independent qualifications do not imply composed qualification';
 m.design.compositionProgram={schema:'canonical-nonconflicting-two-operator-composition/1',operators:['long-horizontal-occupation','phase-through-or-bypass'],canonical:'recovery-cumulative-v1',selection:'independent semantic targets from ordinary six-field canonical input; fail closed on overlap or conflict',targets:{horizontal:{componentIndex:h.componentIndex,pairId:h.pairId,sourceIds:[h.topId,h.bottomId]},phase:{componentIndex:p.componentIndex,wallId:p.wallId}},metadataPolicy:'id/mapId/generatorVersion/qualification explicitly replaced; design.components rebuilt alias; all other semantic leaf conflicts rejected',noTimingReset:true};
 for(const r of ['main','branch'])Contract.validate(m,r);F.validate(m);return m;
}
const STYLES=Object.freeze([...Old.STYLES,'horizontal-phase-composition']);
function generateStyle(style,input){return style==='horizontal-phase-composition'?generate(CONFIG,input):Old.generateStyle(style,input)}
module.exports={CONFIG,generate,generateStyle,STYLES,merge};
