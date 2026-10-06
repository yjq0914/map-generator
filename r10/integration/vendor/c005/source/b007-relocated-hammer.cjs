'use strict';
// Exact-b005 structural binding only. This module never executes physics or reads outcomes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const same=require('node:util').isDeepStrictEqual,clone=structuredClone;
const B005=require('./b005-stage-recovery.cjs'),Hammer=require('./b002-swing-hammer.cjs');
const Canon=require('./recovery-canonical.cjs'),U=require('./recovery-utils.cjs');
const F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const CONFIG=freeze(require('./configs/b007-relocated-hammer-v1.json'));
const STYLE='structurally-bound-swing-opposite-receiver',VERSION='exact-b005-phrase-hammer-binding/1';
const ROUTES=['main','branch'],KEYS=['seed','y','vy','lead','phase','adjacency'];
const need=(v,s)=>{if(!v)throw Error('Relocated hammer: '+s);};
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const owned=(m,i)=>m.obstacles.filter(o=>U.ownedIndex(o.id)===i);
function entry(input={}){need(input&&typeof input==='object'&&!Array.isArray(input),'six-field object required');need(Object.keys(input).every(k=>KEYS.includes(k)),'only six physical fields accepted; no experimental identity');return Canon.entry(input);}
function dependencies(){for(const [file,digest]of Object.entries(CONFIG.dependencies))need(hash(fs.readFileSync(path.join(__dirname,'..',file)))===digest,'frozen dependency changed: '+file);need(same(CONFIG.operation,Hammer.CONFIG.operation),'frozen b002 recipe changed');}
function validateInput(m){
 dependencies();need(F.R===10&&F.VX===150&&F.DT===1/120&&F.G===820&&F.FLAP===-290,'immutable physics changed');
 need(m&&!m.design?.relocatedHammerProgram&&!m.design?.hammerProgram,'missing scaffold or repeated mechanism binding');
 const e=entry(m.condition);need(same(m,B005.generate(B005.CONFIG,e)),'requires entire exact unmodified b005 scaffold');
 need(m.components.length===12&&m.horizon===14400&&m.durationTicks===14400,'120s/twelve-component domain changed');
 return true;
}
function routeAt(m,route,o){
 const r=m.routes[route],mid=o.x+o.collider.w/2,index=r.segments.findIndex(s=>s.endX>mid),s=r.segments[index];
 need(s,'route segment missing');const start=index?r.segments[index-1].endX:m.initial_player.x;
 const side=s.targetY<o.y-F.R?'upper':s.targetY>o.y+o.collider.h+F.R?'lower':null;
 const checkpoints=r.checkpoints.filter(q=>q.x>=o.x-F.R&&q.x<=o.x+o.collider.w+F.R);
 need(side&&start<=o.x-F.R&&s.endX>=o.x+o.collider.w+F.R&&checkpoints.length===1,'incomplete whole-body route/checkpoint');
 need(checkpoints.every(q=>side==='upper'?q.y[1]<o.y-F.R:q.y[0]>o.y+o.collider.h+F.R),'checkpoint side mismatch');
 return{route,segmentIndex:index,startX:start,segment:clone(s),side,checkpoints:clone(checkpoints)};
}
function resolvePhrase(m,request=CONFIG.program){
 validateInput(m);need(same(request,CONFIG.program),'unsupported typed binding command');
 const candidates=m.components.flatMap((c,i)=>String(c.stageId)===String(request.request.stage)&&c.theme==='wave'&&c.relations.some(r=>r.type==='whole-body-exit-route-domain')&&!c.relations.some(r=>['continuous-two-route-corridor','contact-first-optional-branch'].includes(r.type))?[i]:[]);
 need(candidates.length===1,'requires unique semantic ordinary-wave entry phrase');const i=candidates[0],c=m.components[i];
 const con=m.routes.main.connectors[i];need(same(con,m.routes.branch.connectors[i]),'route connector mismatch');
 const islands=owned(m,i).filter(o=>o.mechanic_kind==='fixed_armor_or_spike'&&o.collider.shape==='rectangle'&&o.interaction?.lethal===true&&o.motion===null&&o.timeline===null&&o.effect_region===null&&o.y>=100&&o.y+o.collider.h<=m.height-100&&o.collider.h<=60).sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 need(islands.length>=2,'ordinary source and immediate receiver required');
 need(islands.every(o=>o.x-F.R>c.startX&&o.x+o.collider.w+F.R<con.startX),'ordinary body domain escaped package core');
 const [source,receiver]=islands,routeFacts=ROUTES.map(route=>({route,source:routeAt(m,route,source),receiver:routeAt(m,route,receiver)}));
 need(routeFacts[0].source.side!==routeFacts[1].source.side&&routeFacts.every(q=>q.source.side!==q.receiver.side),'requires two inherited opposite-side receiver itineraries');
 const gm=m.design.relationGrammarProgram,mv=gm.moves[i],sm=m.design.stageRecoveryProgram.moves[i],sourceIndex=gm.parentSlotAtSlot[i];
 need(mv.slot===i&&mv.sourceIndex===sourceIndex&&gm.slotOfParent[sourceIndex]===i&&sm.componentIndex===i&&sm.offset===c.offset&&same(c.grammarRelocation,{schema:gm.schema,...mv,earlierRelocationFields:'inherited generation provenance'}),'stale owner or relocation provenance');
 const predecessor=i-1,successor=i+1;need(m.components[predecessor]&&m.components[successor],'missing actual neighbour');
 const nextObjects=owned(m,successor).filter(o=>!/-tail-|-recovery-/.test(o.id)).sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 need(nextObjects.length&&nextObjects.every(o=>o.collider.shape==='rectangle'&&(!o.motion||o.mechanic_kind==='vertical_armor_slider')),'unsupported next-demand body');
 const nextX=nextObjects[0].x,nextBodies=nextObjects.filter(o=>o.x===nextX);
 return{schema:'actual-ordinary-wave-opposite-receiver-phrase/1',semanticSelection:{stage:request.request.stage,matchedComponentIndices:candidates,rule:'unique wave + whole-body-exit; excludes continuous split/contact; first actual ordinary body then next'},
  owner:{componentIndex:i,sourceId:source.id,groupId:source.group_id,b001ParentComponentIndex:sourceIndex,b001Move:clone(mv),b005Move:clone(sm),sourceCoordinates:{b001ParentX:source.x-mv.deltaOffset-sm.deltaOffset,b001X:source.x-sm.deltaOffset},currentCoordinates:{sourceX:source.x,componentOffset:c.offset}},
  source:clone(source),receiver:clone(receiver),remainingIslands:clone(islands.slice(2)),routeFacts,
  sourceWholeBodyX:[source.x-F.R,source.x+source.collider.w+F.R],receiverWholeBodyX:[receiver.x-F.R,receiver.x+receiver.collider.w+F.R],
  predecessor:{componentIndex:predecessor,component:clone(m.components[predecessor]),connectors:Object.fromEntries(ROUTES.map(r=>[r,clone(m.routes[r].connectors[predecessor])]))},
  component:clone(c),connectors:Object.fromEntries(ROUTES.map(r=>[r,clone(m.routes[r].connectors[i])])),
  successor:{componentIndex:successor,component:clone(m.components[successor]),firstDemandBodies:clone(nextBodies),wholeBodyX:[Math.min(...nextBodies.map(o=>o.x))-F.R,Math.max(...nextBodies.map(o=>o.x+o.collider.w))+F.R],kind:nextBodies.length===2&&nextBodies.every(o=>o.mechanic_kind==='vertical_armor_slider')?'moving-pair':'inherited-rectangle-demand'}};
}
function planHammerPatch(m,phrase,request=CONFIG.program){
 const actual=resolvePhrase(m,request);need(same(phrase,actual),'phrase differs from current source/receiver/route/owner');
 const p=actual,prior=p.source,op=CONFIG.operation,i=p.owner.componentIndex;
 need(!m.obstacles.some(o=>o.id===prior.id+':arm'||o.group_id===prior.id+':arm'),'generated arm ID conflict');
 const pivot={x:prior.x+prior.collider.w/2,y:prior.y+prior.collider.h/2-op.pivotAboveIslandCenterPx};
 const nominalPivotCrossingSeconds=(pivot.x-m.initial_player.x)/F.VX,phase=op.nominalPivotPhaseRad-nominalPivotCrossingSeconds*2*Math.PI/op.periodSeconds;
 const after={...clone(prior),mechanic_kind:'swing_armor_hammer',x:pivot.x,y:pivot.y,collider:{shape:'circle',w:op.headDiameterPx,h:op.headDiameterPx},motion:{length_px:op.lengthPx,amplitude_rad:op.amplitudeRad,period_s:op.periodSeconds,phase_rad:phase,arm_width_px:op.armWidthPx},timeline:null,effect_region:null};
 const half=Math.sin(op.amplitudeRad)*op.lengthPx+op.headDiameterPx/2;
 const sweep={minX:pivot.x-half,maxX:pivot.x+half,minY:Math.min(pivot.y-op.armWidthPx/2,pivot.y+Math.cos(op.amplitudeRad)*op.lengthPx-op.headDiameterPx/2),maxY:pivot.y+op.lengthPx+op.headDiameterPx/2};
 need(sweep.minX-F.R>p.component.startX&&sweep.maxX+F.R<p.connectors.main.startX,'whole hammer sweep escapes package or enters bridge');
 need(p.receiver.x-F.R>sweep.maxX+F.R,'positive real post-hammer body interval required');
 need(sweep.minY-F.R>0&&sweep.maxY+F.R<m.height,'sweep escapes world height');
 const protectedIntervals=[{role:'swing-sweep',x:[sweep.minX-F.R,sweep.maxX+F.R],allowedIds:[prior.id]},{role:'post-swing-to-receiver',x:[sweep.maxX+F.R,p.receiver.x-F.R],allowedIds:[]}];
 const occupancy=protectedIntervals.map(q=>({...clone(q),bodyIds:m.obstacles.filter(o=>o.x+o.collider.w+F.R>q.x[0]&&o.x-F.R<q.x[1]).map(o=>o.id)}));
 need(occupancy.every(q=>q.bodyIds.every(id=>q.allowedIds.includes(id))),'undeclared body intrudes into protected swing/receiver interval');
 const expressionBefore=clone(m.design.stageRecoveryProgram.actualExpressions[i]);
 const expressionAfter={...clone(expressionBefore),body:{kind:'sequence',children:[{kind:'swing-head-and-arm',bodyIds:[prior.id,prior.id+':arm']},{kind:'opposite-receiver',bodyIds:[p.receiver.id],routes:p.routeFacts.map(q=>({route:q.route,fromSide:q.source.side,toSide:q.receiver.side}))},{kind:'remaining-inherited-phrase',bodyIds:p.remainingIslands.map(o=>o.id)}]},descriptor:{...clone(expressionBefore.descriptor),demand:'swing-then-opposite-receiver'},scaffoldExpressionBeforeBinding:expressionBefore,qualification:'new structural composition; actual action, natural route selection and human fun unmeasured'};
 const readDependencies={scaffoldSHA256:hash(m),configuration:clone(CONFIG),selectionComponents:clone(m.components),allObstacleDescriptors:clone(m.obstacles),routes:clone(m.routes),initialPlayer:clone(m.initial_player),condition:clone(m.condition),height:m.height,physics:{R:F.R,VX:F.VX,DT:F.DT,G:F.G,FLAP:F.FLAP},protectedIntervals:occupancy,phrase:clone(p)};
 const hammerProgram={schema:'ordinary-island-positive-swing/1',sourceId:prior.id,componentIndex:i,constructionParent:CONFIG.constructionParent,replacement:clone(prior),operation:clone(op),pivot,authoredPhaseRad:phase,nominalPivotCrossingSeconds,phaseAlignment:'unchanged b002 pi/2 - absolute nominal arrival phase; no added condition.phase; no second relocation',physicalBodyIds:[prior.id,prior.id+':arm'],physicalSweepBounds:sweep,wholeBodySweepX:[sweep.minX-F.R,sweep.maxX+F.R],downstreamRecovery:{startX:sweep.maxX+F.R,nextIslandEntryX:p.receiver.x-F.R,nextIslandSourceId:p.receiver.id,availableDistancePx:p.receiver.x-F.R-sweep.maxX-F.R,scope:'conservative authored sweep gap only; actual saved dynamic body entry/last exit required'},routePolicy:'all inherited routes and rectangle planning guards unchanged; actual circle/capsule demand evaluated separately',qualification:null,humanFun:null};
 const bindingProgram={schema:VERSION,program:clone(request),comparisonParent:CONFIG.comparisonParent,scaffoldSHA256:hash(m),readDependenciesSHA256:hash(readDependencies),phrase:clone(p),recipeIdentity:clone(CONFIG.recipeIdentity),physicalQualification:null,humanFun:null,limits:['exact b005 scaffold only','one frozen b002 recipe at one structurally resolved phrase','no b004 full relay migration','old b005 fixed-rectangle seam gap is inapplicable after binding','no arbitrary intent compilation']};
 return{schema:'exact-b005-hammer-structural-patch/1',sourceId:prior.id,componentIndex:i,obstacleIndex:m.obstacles.findIndex(o=>o.id===prior.id),before:clone(prior),after,owner:clone(p.owner),phrase:clone(p),readDependencies,
  effects:{relationAppend:{type:'structurally-bound-swing-opposite-receiver',sourceId:prior.id,receiverId:p.receiver.id,routes:p.routeFacts.map(q=>({route:q.route,sourceSide:q.source.side,receiverSide:q.receiver.side}))},expressionBefore,expressionAfter,hammerProgram,bindingProgram,identityBefore:{id:m.id,mapId:m.mapId,generatorVersion:m.design.generatorVersion,qualification:m.design.qualification},identityAfter:{id:CONFIG.version+'-'+m.seed,mapId:CONFIG.version+'-'+m.seed,generatorVersion:CONFIG.version,qualification:CONFIG.qualification}}};
}
function materialize(m,p){const out=clone(m),e=p.effects;out.obstacles[p.obstacleIndex]=clone(p.after);out.components[p.componentIndex].relations.push(clone(e.relationAppend));out.design.components=out.components;out.design.stageRecoveryProgram.actualExpressions[p.componentIndex]=clone(e.expressionAfter);out.design.hammerProgram=clone(e.hammerProgram);out.design.relocatedHammerProgram=clone(e.bindingProgram);out.id=e.identityAfter.id;out.mapId=e.identityAfter.mapId;out.design.generatorVersion=e.identityAfter.generatorVersion;out.design.qualification=e.identityAfter.qualification;return out;}
function undoDeclared(m,p){const out=clone(m),e=p.effects;out.obstacles[p.obstacleIndex]=clone(p.before);out.components[p.componentIndex].relations.pop();out.design.components=out.components;out.design.stageRecoveryProgram.actualExpressions[p.componentIndex]=clone(e.expressionBefore);delete out.design.hammerProgram;delete out.design.relocatedHammerProgram;out.id=e.identityBefore.id;out.mapId=e.identityBefore.mapId;out.design.generatorVersion=e.identityBefore.generatorVersion;out.design.qualification=e.identityBefore.qualification;return out;}
function mergeChecked(m,p,request=CONFIG.program){const expected=planHammerPatch(m,resolvePhrase(m,request),request);need(same(p,expected),'patch conflict: changed before/owner/read-set/phase/effects or unknown field');const out=materialize(m,p);need(same(undoDeclared(out,p),m),'undeclared write detected by full scaffold reversal');need(same(out.routes,m.routes),'inherited routes changed');U.assertFiniteTree(out);for(const r of ROUTES)Contract.validate(out,r);F.validate(out);return out;}
function reverseChecked(candidate,p){const m=undoDeclared(candidate,p);validateInput(m);const expected=planHammerPatch(m,resolvePhrase(m));need(same(p,expected)&&same(candidate,materialize(m,p)),'cannot reverse mutated patch/candidate');return m;}
function generateParent(input={}){dependencies();return B005.generate(B005.CONFIG,entry(input));}
function apply(m,request=CONFIG.program){return mergeChecked(m,planHammerPatch(m,resolvePhrase(m,request),request),request);}
function generateProgram(config=CONFIG,input={}){need(same(config,CONFIG),'configuration differs from frozen candidate');return apply(generateParent(input),config.program);}
module.exports={CONFIG,STYLE,VERSION,entry,dependencies,validateInput,resolvePhrase,planHammerPatch,mergeChecked,reverseChecked,generateParent,apply,generateProgram,generate:generateProgram};
