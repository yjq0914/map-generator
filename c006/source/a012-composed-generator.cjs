'use strict';
const same=require('node:util').isDeepStrictEqual,C=require('./recovery-canonical.cjs'),Base=require('./recovery-generator.cjs'),A=require('../design/following-gate-post-length.cjs'),P=require('./a007-phase-generator-v2.cjs'),Old=require('./a010-style-registry.cjs'),{merge}=require('./a010-composed-generator.cjs'),F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x}
const CONFIG=deepFreeze(require('./configs/a012-composed-v1.json'));
function generate(config,input={}){
 if(!same(config,CONFIG))throw Error('Composition changed config');const e=C.entry(input),base=Base.generate(Base.CONFIG,e),a=A.applyPostLength(base,e,CONFIG.operation),b=P.apply(base,CONFIG.phaseOperation),h=a.design.followingGateProgram.target,p=b.design.phaseWindowProgram,w=b.obstacles.find(o=>o.id===p.wallId);
 if(h.componentIndex===p.componentIndex||[h.topId,h.bottomId].includes(p.wallId))throw Error('Disjoint semantic targets required');
 const hs=h.radiusExpandedSweepX,ps=[w.x-F.R,w.x+w.collider.w+F.R],order=hs[1]<ps[0]?'horizontal-before-phase':ps[1]<hs[0]?'phase-before-horizontal':null;if(!order)throw Error('Separated actual target spans required');
 const m=merge(base,a,b);m.design.components=m.components;m.id=m.mapId=CONFIG.version+'-'+m.seed;m.design.generatorVersion=CONFIG.version;m.design.qualification='Unqualified late phase plus late following composition; requires fresh full qualification';
 m.design.compositionProgram={schema:'canonical-late-phase-late-following/1',operators:['latest-phase-window','late-horizontal-occupation'],canonical:'recovery-cumulative-v1',constructionParent:'a010',selection:'Independent ordinary-wave latest eligibility and accepted following bias+1; no condition labels or score lookup',targets:{horizontal:{componentIndex:h.componentIndex,pairId:h.pairId,sourceIds:[h.topId,h.bottomId]},phase:{componentIndex:p.componentIndex,wallId:p.wallId}},expectedOrder:order,actualTargetSpans:{horizontal:hs,phase:ps},phaseSelection:{eligibleComponents:p.eligibleComponents,placement:p.operation.placement},metadataPolicy:'a010 fail-closed semantic merge; no rejected a008/a011 construction',noTimingReset:true};
 for(const route of ['main','branch'])Contract.validate(m,route);F.validate(m);return m;
}
const STYLES=Object.freeze([...Old.STYLES,'late-phase-late-horizontal-composition']);
function generateStyle(style,input){return style==='late-phase-late-horizontal-composition'?generate(CONFIG,input):Old.generateStyle(style,input)}
module.exports={CONFIG,generate,generateStyle,STYLES};
