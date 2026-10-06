'use strict';
// Pure exact-parent transform: no simulation, state restore, outcome lookup or retries.
const Parent=require('./b001-relation-grammar.cjs'),Base=require('./recovery-generator.cjs');
const U=require('./recovery-utils.cjs'),F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
const same=require('node:util').isDeepStrictEqual,clone=structuredClone;
const VERSION='relation-conditioned-stage-recovery/1';
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
const CONFIG=freeze(require('./configs/b005-stage-recovery-v1.json')),ROUTES=['main','branch'];
const need=(x,s)=>{if(!x)throw Error('Stage recovery: '+s);};
const objects=(m,i)=>m.obstacles.filter(o=>U.ownedIndex(o.id)===i);
const segments=(m,r,i)=>m.routes[r].segments.filter(s=>s.endX>m.components[i].startX&&s.endX<=m.components[i].endX);
const phase=(v,dx)=>v===null?null:({...clone(v),phase_rad:v.phase_rad-dx/F.VX*2*Math.PI/v.period_s});
function validateInput(m){
 need(F.R===10&&F.VX===150&&F.DT===1/120&&F.G===820&&F.FLAP===-290,'physics changed');
 need(m&&!m.design?.stageRecoveryProgram&&same(m,Parent.generate(Parent.CONFIG,m.condition)),'requires exact untouched b001 construction, not canonical/b004/arbitrary ancestry');
 const e=m.condition;need(e.y>=245&&e.y<=300&&e.vy>=-65&&e.vy<=65&&e.lead>=-20&&e.lead<=20&&e.phase>=-.45&&e.phase<=.45,'outside declared ordinary six-field domain');
 need(m.components.length===12&&m.horizon===14400&&m.durationTicks===14400,'120s/twelve-package domain changed');
 need(m.design.adaptiveTransforms.length===0,'undeclared live adaptive metadata dependency');
 for(const i of [4,5,6,7]){
  const c=m.components[i];need(c.theme!=='spring'&&c.lengthPx===1500&&c.offset===i*1500,'requires unchanged contact-free second stage');
  for(const o of objects(m,i))need(o.collider.shape==='rectangle'&&['fixed_armor_or_spike','vertical_armor_slider'].includes(o.mechanic_kind)&&o.timeline===null&&o.effect_region===null&&(!o.motion||o.mechanic_kind==='vertical_armor_slider'),'unsupported spatial/time dependency');
 }
 return true;
}
// This is an executable geometric proof for EVERY admitted map, not a sampled
// physics claim. Body, mark, checkpoints, route segments and safe rectangle are
// all read from declared geometry. Keep inherited route-mark R allowance.
function transferBound(m,i){
 const c=m.components[i],os=objects(m,i),mark=m.routeMarks[i];
 const bodyRight=Math.max(...os.map(o=>o.x+o.collider.w+F.R));
 need(os.every(o=>o.x-F.R>c.startX),'left body envelope escaped');
 const routeFacts=ROUTES.map(route=>{
  const con=m.routes[route].connectors[i],ss=segments(m,route,i),qs=m.routes[route].checkpoints.filter(q=>U.ownedIndex(q.id)===i);
  need(con.boundaryX===c.endX&&ss.at(-1).endX===c.endX&&con.startX===c.offset+1320,'unsupported connector anatomy');
  need(ss.slice(0,-1).every(s=>s.endX<con.startX),'nonbridge route segment enters connector');
  need(os.filter(o=>o.x+o.collider.w+F.R>=con.startX).every(o=>o.mechanic_kind==='fixed_armor_or_spike'&&(o.y+o.collider.h<=140||o.y>=430)),'radius-expanded bridge rectangle is not clear');
  return{route,bridgeStartX:con.startX,boundaryX:con.boundaryX,lastCoreSegmentX:Math.max(c.startX,...ss.slice(0,-1).map(s=>s.endX)),lastOwnedCheckpointX:Math.max(c.startX,...qs.map(q=>q.x)),safePlayerCenterY:[150,420]};
 });
 const limits={bodyRadiusEnvelope:c.endX-bodyRight,routeMarkWithInheritedRadiusAllowance:c.endX-mark.x-F.R,
  bridgePositive:c.endX-Math.max(...routeFacts.map(q=>q.bridgeStartX)),
  routeCoreBeforeBoundary:c.endX-Math.max(...routeFacts.map(q=>q.lastCoreSegmentX)),
  ownedCheckpointsBeforeBoundary:c.endX-Math.max(...routeFacts.map(q=>q.lastOwnedCheckpointX))};
 const strictUpperPx=Math.min(...Object.values(limits));need(strictUpperPx>0,'no positive geometric transfer');
 const tickPx=F.VX*F.DT,maxIntegralTickPx=(Math.ceil(strictUpperPx/tickPx)-1)*tickPx;
 return{componentIndex:i,bodyRightLocal:bodyRight-c.offset,routeMarkLocal:mark.x-c.offset,boundaryLocal:c.endX-c.offset,limits,strictUpperPx,maxIntegralTickPx,routeFacts,scope:'generation geometry only; finite physical qualification required'};
}
function plan(m,program=CONFIG.program){
 validateInput(m);need(same(program,CONFIG.program),'program changed: create a new explicit version');
 const indices=[4,5,6,7],has=(i,t)=>m.components[i].relations.some(r=>r.type===t);
 const recipients=indices.filter(i=>has(i,program.recipient));
 const donors=indices.filter(i=>has(i,'sustained-moving-corridor')&&!has(i,program.recipient));
 need(recipients.length===1&&donors.length===1,'requires exactly one mixed-receiver and one plain-moving expression');
 const recipient=recipients[0],donor=donors[0],bounds=indices.map(i=>transferBound(m,i)),bound=bounds.find(x=>x.componentIndex===donor);
 need(program.transferPx>0&&Number.isInteger(program.transferPx/(F.VX*F.DT))&&program.transferPx<bound.strictUpperPx,'frozen transfer exceeds actual complete-geometry bound');
 const lengths=m.components.map((c,i)=>c.lengthPx+(i===recipient?program.transferPx:i===donor?-program.transferPx:0));let offset=0;
 const moves=m.components.map((c,i)=>{const q={componentIndex:i,previousOffset:c.offset,previousLengthPx:c.lengthPx,offset,deltaOffset:offset-c.offset,lengthPx:lengths[i],deltaLengthPx:lengths[i]-c.lengthPx,startX:60+offset,endX:60+offset+lengths[i],bridgeStartX:m.routes.main.connectors[i].startX+offset-c.offset};q.bridgeSeconds=(q.endX-q.bridgeStartX)/F.VX;q.startTick=offset/(F.VX*F.DT);q.endTick=(offset+lengths[i])/(F.VX*F.DT);offset+=lengths[i];return q;});
 need(offset===18000&&moves.every(q=>Number.isInteger(q.startTick)&&Number.isInteger(q.endTick)),'time closure');
 for(let s=0;s<3;s++)need(moves.slice(s*4,s*4+4).reduce((n,q)=>n+q.lengthPx,0)===6000,'40s stage closure');
 need(moves.filter(q=>q.componentIndex<4||q.componentIndex>=8).every(q=>q.deltaOffset===0&&q.deltaLengthPx===0),'first/contact/last stage changed');
 return{recipient,donor,transferPx:program.transferPx,selection:'unique mixed-moving-receiver recipient; unique plain-moving donor in same exact-b001 stage; relation intent, not observed pressure',bounds,moves};
}
function relations(rs,q){return rs.map(v=>{const r=clone(v),dx=q.deltaOffset;
 if(r.type==='fixed-island-between-moving-pairs')for(const p of r.receivers)p.x+=dx;
 if(r.type==='continuous-two-route-corridor')r.spine=r.spine.map(x=>x+dx);
 if(r.type==='short-relief-tail-corridor'){for(const k of ['startX','endX','bridgeStartX'])r.routeIntent[k]+=dx;r.bridgeSeconds=q.bridgeSeconds;}
 if(r.type==='adaptive-tail-entry')r.bridgeSeconds=q.bridgeSeconds;
 need(r.type!=='contact-first-optional-branch'||dx===0&&q.deltaLengthPx===0,'contact cannot move');return r;});}
function apply(parent,program=CONFIG.program){
 const p=plan(parent,program),m=clone(parent),moves=p.moves;
 m.components=parent.components.map((v,i)=>{const q=moves[i];if(!q.deltaOffset&&!q.deltaLengthPx)return clone(v);return{...clone(v),offset:q.offset,lengthPx:q.lengthPx,startX:q.startX,endX:q.endX,relations:relations(v.relations,q),stageRecoveryRelocation:{schema:VERSION,deltaOffset:q.deltaOffset,deltaLengthPx:q.deltaLengthPx,earlierRelocationFields:'immutable pre-b005 generation provenance'}};});
 m.obstacles=parent.obstacles.map(v=>{const q=moves[U.ownedIndex(v.id)];if(!q.deltaOffset)return clone(v);const o=clone(v);o.x+=q.deltaOffset;if(o.motion)o.motion=phase(o.motion,q.deltaOffset);return o;});
 m.routeMarks=parent.routeMarks.map((v,i)=>({...clone(v),x:v.x+moves[i].deltaOffset}));
 for(const route of ROUTES){const r=m.routes[route],s=parent.routes[route];
  r.segments=moves.flatMap(q=>segments(parent,route,q.componentIndex).map((v,i,a)=>({...clone(v),endX:v.endX+q.deltaOffset+(i===a.length-1?q.deltaLengthPx:0)})));
  r.checkpoints=s.checkpoints.map(v=>{const h=/^handoff-(\d+)$/.exec(v.id),q=moves[h?+h[1]:U.ownedIndex(v.id)];need(q,'unknown checkpoint owner');return{...clone(v),x:v.x+q.deltaOffset+(h?q.deltaLengthPx:0)};});
  r.connectors=moves.map(q=>({startX:q.bridgeStartX,boundaryX:q.endX}));
  for(const k of ['contact','exit','finalDomain','events','recoveryTicks'])need(same(r[k],s[k]),'global/contact route contract changed: '+k);
  need(r.segments.every((v,i,a)=>!i||v.endX>a[i-1].endX),'unordered segments');Contract.validate(m,route);
 }
 m.macroPlan=moves.map(q=>({id:'component-'+q.componentIndex,startTick:q.startTick,endTick:q.endTick}));
 m.design.pressureProgram.pairRecords=parent.design.pressureProgram.pairRecords.map(v=>({...clone(v),inheritedMotion:phase(v.inheritedMotion,moves[v.componentIndex].deltaOffset)}));
 m.design.components=m.components;m.design.componentTimeline=Base.componentTimeline(m);
 m.design.stageRecoveryProgram={schema:VERSION,program:clone(program),comparisonParent:CONFIG.comparisonParent,constructionParent:CONFIG.constructionParent,...p,
  actualExpressions:m.components.map((c,i)=>({...Parent.expression(m,i),componentIndex:i})),
  phaseRule:'phase_new=phase_b001-deltaX/VX*2pi/period; no clock reset',
  metadataScope:{actual:['components/relations','routes/segments/checkpoints/connectors','routeMarks','macroPlan','componentTimeline','pressureProgram.pairRecords','stageRecoveryProgram.actualExpressions'],historical:['recoveryConstruction','lengthProgram','orderProgram.moves','relationGrammarProgram (explicit parent-coordinate expressions)','geometryTransforms','relationshipProgram','earlier component relocations']},
  preserved:['same exact b001 order in both arms','entire local core/contact geometry','three40s stages and120s total','first/contact/last packages','global exit/finalDomain','continuous state/controller queue/absolute clock'],
  limits:['one declared no-contact stage','no b004 combination','not arbitrary variable-length compiler','no transfer chosen from physical outcomes'],physicalQualification:null,humanFun:null};
 for(const i of [4,5,6,7])transferBound(m,i);
 need(same(m.initial_player,parent.initial_player),'initial state changed');
 need(same(m.components.slice(0,4),parent.components.slice(0,4))&&same(m.components.slice(8),parent.components.slice(8)),'outside-stage package changed');
 m.design.generatorVersion=CONFIG.version;m.design.qualification='Unqualified finite b001 stage recovery allocation; geometry is not playability';m.id=m.mapId=CONFIG.version+'-'+m.seed;
 U.assertFiniteTree(m);F.validate(m);return m;
}
function generateParent(input={}){return Parent.generate(Parent.CONFIG,input);}
function generate(config=CONFIG,input={}){need(same(config,CONFIG),'configuration differs from frozen candidate');return apply(generateParent(input),config.program);}
module.exports={VERSION,CONFIG,generateParent,generate,apply,plan,transferBound,validateInput};
