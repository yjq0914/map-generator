'use strict';
const same=require('node:util').isDeepStrictEqual,C=require('./recovery-canonical.cjs'),Base=require('./recovery-generator.cjs'),A=require('../design/following-gate-post-length.cjs'),P=require('./a007-phase-generator-v2.cjs'),Old=require('./a010-style-registry.cjs'),{merge}=require('./a010-composed-generator.cjs'),F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x}
const CONFIG=deepFreeze(require('./configs/a011-composed-v1.json'));
function generate(config,input={}){
 if(!same(config,CONFIG))throw Error('Composition changed config');const e=C.entry(input),base=Base.generate(Base.CONFIG,e),a=A.applyPostLength(base,e,CONFIG.operation),b=P.generate(P.CONFIG,e),h=a.design.followingGateProgram.target,p=b.design.phaseWindowProgram,wall=b.obstacles.find(o=>o.id===p.wallId);
 if(h.componentIndex===p.componentIndex||[h.topId,h.bottomId].includes(p.wallId))throw Error('Composition requires disjoint semantic targets');
 const horizontalBeforePhase=h.radiusExpandedSweepX[1]<wall.x-F.R,phaseBeforeHorizontal=wall.x+wall.collider.w+F.R<h.radiusExpandedSweepX[0];
 if(horizontalBeforePhase===phaseBeforeHorizontal)throw Error('Composition requires strictly separated target spans');
 const m=merge(base,a,b);m.design.components=m.components;m.id=m.mapId=CONFIG.version+'-'+m.seed;m.design.generatorVersion=CONFIG.version;m.design.qualification='Unqualified explicit seeded relative-position composition; independent qualification is not composition qualification';
 m.design.compositionProgram={schema:'canonical-nonconflicting-seeded-relative-composition/1',operators:horizontalBeforePhase?['horizontal-occupation','phase-through-or-bypass']:['phase-through-or-bypass','horizontal-occupation'],canonical:'recovery-cumulative-v1',selection:'bias0 seeded ranking over relational eligible actual positions; one choice, no retry',targets:{horizontal:{componentIndex:h.componentIndex,pairId:h.pairId,sourceIds:[h.topId,h.bottomId]},phase:{componentIndex:p.componentIndex,wallId:p.wallId}},expectedOrder:horizontalBeforePhase?'horizontal-before-phase':'phase-before-horizontal',actualTargetSpans:{horizontal:h.radiusExpandedSweepX,phase:[wall.x-F.R,wall.x+wall.collider.w+F.R]},metadataPolicy:'same frozen a010 merge; semantic leaf conflicts fail closed',noTimingReset:true};
 for(const r of ['main','branch'])Contract.validate(m,r);F.validate(m);return m;
}
const STYLES=Object.freeze([...Old.STYLES,'seeded-relative-composition']);
function generateStyle(style,input){return style==='seeded-relative-composition'?generate(CONFIG,input):Old.generateStyle(style,input)}
module.exports={CONFIG,generate,generateStyle,STYLES};
