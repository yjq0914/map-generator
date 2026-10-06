'use strict';
// Independent exactB binding of the frozen b003-v2 physical recipe. The old
// exact-a012 entrypoint/guard is unchanged and is never called on this parent.
const fs=require('node:fs'),path=require('node:path'),same=require('node:util').isDeepStrictEqual;
const Parent=require('./c005-parent-binding.cjs');
const A=require('./proposal-recipe-composer.cjs'),Old=require('./b003-warning-laser-v2.cjs');
const U=require('./recovery-utils.cjs'),F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
const clone=structuredClone,hash=A.hash,VERSION='exact-b005-warning-laser-current-successor/2',ROUTES=['main','branch'];
const ownFile=__filename,ownHash=hash(fs.readFileSync(ownFile));
const legacyFiles=['source/b003-warning-laser-v2.cjs','source/configs/b003-warning-laser-v2.json'];
const legacyHashes=Object.fromEntries(legacyFiles.map(p=>[p,hash(fs.readFileSync(path.join(__dirname,'..',p)))]));
const sourceIdentity=hash({version:VERSION,ownHash,legacyHashes,algebra:A.sourceIdentity,parent:Parent.sourceIdentity});
const need=(v,s)=>{if(!v)throw Error('Structural laser: '+s);};
function dependencies(){A.dependencies();need(hash(fs.readFileSync(ownFile))===ownHash,'source changed');for(const [p,h]of Object.entries(legacyHashes))need(hash(fs.readFileSync(path.join(__dirname,'..',p)))===h,'legacy recipe changed: '+p);return sourceIdentity;}
function exactBase(m){dependencies();need(F.R===10&&F.VX===150&&F.DT===1/120&&F.G===820&&F.FLAP===-290,'physics changed');need(same(m,A.generateParent(m?.condition)),'complete exact B required');}
function routeFact(m,route,o){
 const r=m.routes[route],j=r.segments.findIndex(s=>s.endX>o.x+o.collider.w/2),s=r.segments[j],start=j?r.segments[j-1].endX:m.initial_player.x;
 need(s&&start<=o.x-F.R&&s.endX>=o.x+o.collider.w+F.R,'whole-body route segment missing');
 const checks=r.checkpoints.filter(q=>q.x>=o.x-F.R&&q.x<=o.x+o.collider.w+F.R);need(checks.length===1,'unique body checkpoint missing');
 const side=s.maxY<o.y-F.R?'upper':s.minY>o.y+o.collider.h+F.R?'lower':null;
 need(side&&(side==='upper'?checks[0].y[1]<o.y-F.R:checks[0].y[0]>o.y+o.collider.h+F.R),'whole route band/checkpoint does not enforce a side');
 return{route,segmentIndex:j,segmentStartX:start,segment:clone(s),checkpoint:clone(checks[0]),side};
}
function resolvePhrase(m){
 exactBase(m);const t=Old.target(m),i=t.componentIndex,c=m.components[i],source=t.obstacle;
 const ownerBodies=m.obstacles.filter(o=>U.ownedIndex(o.id)===i),connector=m.routes.main.connectors[i];
 need(same(connector,m.routes.branch.connectors[i]),'two route connectors differ');
 const islands=ownerBodies.filter(o=>o.mechanic_kind==='fixed_armor_or_spike'&&o.collider.shape==='rectangle'&&o.interaction?.lethal===true&&o.motion===null&&o.timeline===null&&o.effect_region===null&&o.y>=100&&o.y+o.collider.h<=m.height-100&&o.collider.h<=60).sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 need(islands.length===3&&islands[0].id===source.id,'earliest laser target must be the first of three current islands');
 const receiver=islands[1],routeFacts=ROUTES.map(route=>({route,source:routeFact(m,route,source),receiver:routeFact(m,route,receiver)}));
 need(routeFacts.every(q=>q.source.side===q.receiver.side)&&routeFacts[0].source.side!==routeFacts[1].source.side,'same-side two-route receiver required; L never invents reversal');
 need(islands.every(o=>o.x-F.R>c.startX&&o.x+o.collider.w+F.R<connector.startX),'island escaped owning component/bridge');
 const expression=m.design.stageRecoveryProgram.actualExpressions[i];need(expression.body.kind==='hold-then-turn'&&same(expression.body.bodyIds,ownerBodies.filter(o=>!/-tail-|-recovery-/.test(o.id)).sort((a,b)=>a.x-b.x).map(o=>o.id)),'unsupported current same-side expression');
 const successor=m.components[i+1],next=m.obstacles.filter(o=>U.ownedIndex(o.id)===i+1&&!/-tail-|-recovery-/.test(o.id)).sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 need(successor&&successor.theme!=='spring'&&next.length&&next.every(o=>o.collider.shape==='rectangle'&&(!o.motion||o.mechanic_kind==='vertical_armor_slider')),'unsupported successor');
 const first=next.filter(o=>o.x===next[0].x);
 return{schema:'actual-warning-maintain-receive-phrase/1',componentIndex:i,component:clone(c),source:clone(source),receiver:clone(receiver),remainingIslands:clone(islands.slice(2)),ownerBodies:clone(ownerBodies),routeFacts,
  routes:routeFacts.map(q=>({route:q.route,sourceSide:q.source.side,receiverSide:q.receiver.side,sourceSegment:clone(q.source.segment),receiverSegment:clone(q.receiver.segment)})),
  sideReference:'replaced fixed island defines authored lane sign only; capsule clearance is measured from actual endpoints',connector:clone(connector),expression:clone(expression),
  successor:{componentIndex:i+1,firstDemandBodies:clone(first),wholeBodyX:[Math.min(...first.map(o=>o.x))-F.R,Math.max(...first.map(o=>o.x+o.collider.w))+F.R]}};
}
function planPatch(m){
 const p=resolvePhrase(m),prior=p.source,i=p.componentIndex,op=Old.CONFIG.operation;
 const [upper,lower]=p.routeFacts.map(q=>({route:q.route,segment:q.source.segment})).sort((a,b)=>a.segment.targetY-b.segment.targetY);
 // Frozen b003-v2 arithmetic; absolute clock and public phase retained.
 const dx=prior.collider.w,dy=lower.segment.targetY-upper.segment.targetY,expandedRadius=F.R+op.beamWidthPx/2;
 const span=[prior.x-expandedRadius,prior.x+dx+expandedRadius],entrySeconds=(span[0]-m.initial_player.x)/F.VX,exitSeconds=(span[1]-m.initial_player.x)/F.VX;
 const midpointSeconds=(prior.x+dx/2-m.initial_player.x)/F.VX,activeStartSeconds=entrySeconds-op.activationLeadBeforeWholeBodyEntrySeconds,warningStartSeconds=activeStartSeconds-op.warningSeconds;
 const phase=-midpointSeconds*2*Math.PI/op.motionPeriodSeconds+m.condition.phase;
 need(warningStartSeconds>=0,'not enough real prefix for warning');
 need(activeStartSeconds+op.activeSeconds>entrySeconds&&activeStartSeconds+op.activeSeconds<exitSeconds,'active must overlap entry and release before exit');
 need(p.receiver.x-F.R>span[1]+F.VX*.75,'requires at least .75s real free recovery');
 need(upper.segment.targetY-op.verticalSweepPx-expandedRadius>30&&lower.segment.targetY+op.verticalSweepPx+expandedRadius<m.height-30,'beam sweep leaves physical outer routes');
 const after={...clone(prior),mechanic_kind:'laser_scanner',x:prior.x,y:upper.segment.targetY,collider:{shape:'segment',w:dx,h:dy,width:op.beamWidthPx},motion:{dx_px:dx,dy_px:dy,amplitude_px:op.verticalSweepPx,period_s:op.motionPeriodSeconds,phase_rad:phase},timeline:{start_s:warningStartSeconds,warning_s:op.warningSeconds,active_s:op.activeSeconds,cooldown_s:op.cooldownSeconds},effect_region:null};
 const program={schema:VERSION,sourceId:prior.id,componentIndex:i,sourceIdentity:{binding:sourceIdentity,currentDescriptorSHA256:hash(after)},sourceDescriptor:clone(after),constructionParent:'complete exact b005; fresh L binding, no old qualification transfer',scaffoldSHA256:hash(m),replacement:clone(prior),operation:clone(op),phrase:clone(p),
  upper:{route:upper.route,targetY:upper.segment.targetY},lower:{route:lower.route,targetY:lower.segment.targetY},authoredEndpoints:[{x:after.x,y:after.y},{x:after.x+dx,y:after.y+dy}],wholeBodyHorizontalSpan:span,
  nominal:{warningStartSeconds,activeStartSeconds,cooldownStartSeconds:activeStartSeconds+op.activeSeconds,entrySeconds,exitSeconds,midpointSeconds,physicalPrefixSeconds:exitSeconds+.75},
  phaseAlignment:'zero vertical translation at nominal fixed-VX midpoint plus public phase; absolute clock retained',downstreamRecovery:{startX:span[1],nextIslandEntryX:p.receiver.x-F.R,availableDistancePx:p.receiver.x-F.R-span[1],nextIslandSourceId:p.receiver.id},
  recovery:{packageBridge:clone(p.connector),bridge:clone(p.connector),nextDemand:clone(p.successor),observationStartTick:0,minimumStopTick:Math.floor((p.successor.wholeBodyX[1]-m.initial_player.x)/(F.VX*F.DT))+1},
  actionHypothesis:'read native warning, traverse active vertically sweeping capsule, maintain the authored lane through the same-side fixed receiver; actual capsule clearance/input change requires saved evidence',physicalQualification:null,humanFun:null};
 const expressionAfter={...clone(p.expression),body:{kind:'sequence',children:p.expression.body.bodyIds.map(id=>id===prior.id?{kind:'native-warning-sweeping-laser',bodyIds:[id]}:id===p.receiver.id?{kind:'same-side-fixed-receiver',bodyIds:[id],routes:p.routeFacts.map(q=>({route:q.route,from:q.source.side,to:q.receiver.side}))}:{kind:'inherited-adjacency',bodyIds:[id]})},descriptor:{...clone(p.expression.descriptor),demand:'read-warning-maintain-receive-then-inherited-turn'},scaffoldExpressionBeforeBinding:clone(p.expression),qualification:'structural planned semantics; actual actions unmeasured'};
 const relation={type:'native-warning-laser-same-side-receiver',sourceId:prior.id,receiverId:p.receiver.id},componentAfter=clone(m.components[i]);componentAfter.relations.push(relation);
 const strict=p.ownerBodies.filter(o=>o.id!==prior.id).concat(p.successor.firstDemandBodies);
 const edit={recipe:'L',originalPatchHash:null,baseSnapshotHash:hash(m),baseReadScope:'complete exact B; frozen v2 laser math rebound to current resolved source and receiver',strictReads:strict.map(o=>({resource:'obstacles/'+o.id,beforeHash:hash(o)})),contextReads:[{componentIndex:i+1,beforeHash:hash(m.components[i+1]),policy:'refresh-current-context; dynamic consequence requires new evidence'}],writeResources:['obstacles/'+prior.id,'components/'+i,'design.stageRecoveryProgram.actualExpressions/'+i,'design/laserProgram'],obstacleEdits:[{before:[clone(prior)],after:[clone(after)]}],componentEdit:{index:i,before:clone(m.components[i]),after:componentAfter},expressionEdit:{index:i,before:clone(p.expression),after:expressionAfter},pressureEdits:[],declarations:{laserProgram:program}};
 const patch={schema:VERSION,sourceIdentity,componentIndex:i,before:clone(prior),after,phrase:p,effects:{program,expressionBefore:clone(p.expression),expressionAfter,relation},edit};edit.originalPatchHash=hash({...patch,edit:null});return patch;
}
function summarizeSite(m,p){
 const source=p.after,receiver=p.phrase.receiver,i=p.componentIndex,stage=Number(m.components[i].stageId),n=p.effects.program.nominal,secs=x=>(x-m.initial_player.x)/F.VX;
 const relation='separated-reception',events=[['read-warning',n.warningStartSeconds,[source.id]],['maintain-side',secs(receiver.x-F.R),[source.id,receiver.id]],['receive',secs(receiver.x+receiver.collider.w+F.R),[receiver.id]]];
 need(p.phrase.routeFacts.every(q=>q.source.side===q.receiver.side),'L reversal unsupported');
 return{recipe:'L',componentIndex:i,stage,currentSourceId:source.id,currentSourceX:source.x,receiverId:receiver.id,receiverX:receiver.x,routeRelation:relation,routeFacts:p.phrase.routeFacts.map(q=>({route:q.route,sourceSide:q.source.side,receiverSide:q.receiver.side})),sideReference:p.phrase.sideReference,encounterWindowSeconds:[n.warningStartSeconds,events.at(-1)[1]],properties:{warning:1,periodicMotion:1,projectileRhythm:0,apertureVariation:0},patchHash:hash(p),componentHash:hash(m.components[i]),sourceDescriptorHash:hash(source),receiverDescriptorHash:hash(receiver),events:events.map(([kind,nominalSeconds,bodyIds])=>({recipe:'L',componentIndex:i,stage,kind,nominalSeconds,bodyIds,structuralRelation:relation,scope:'planned warning and unchanged same-side fixed-receiver route facts; actual action unmeasured'})),physicalQualification:'new exactB binding unqualified; prior b003-v2 geometry is provenance only',humanFun:null};
}
// A context is refreshed only from an exact accepted producer envelope, then
// independently matched to the selected canonical exactB edit set. No caller
// can bless an arbitrary changed component by supplying a replacement hash.
function successorSnapshot(map,index){return{component:clone(map.components[index]),bodies:clone(map.obstacles.filter(o=>U.ownedIndex(o.id)===index)),expression:clone(map.design.stageRecoveryProgram.actualExpressions[index])};}
function bindCurrentSuccessor(base,envelope,p,mode){
 const companion=envelope?.map,rs=envelope?.plan?.selectedRecipes;
 need(companion&&Array.isArray(rs)&&rs.every(r=>['H','T'].includes(r)),'only declared H/T companion envelope allowed; L/J conflict');
 need(same(envelope,Parent.compile(envelope.plan.condition,envelope.plan.request,mode)),'companion is not exact accepted producer output');
 need(same(companion.condition,base.condition),'companion condition changed');
 const f=A.inspect(base.condition),expected=A.compose(base.condition,rs,{mode:'experimental-static'}),index=p.componentIndex+1;
 const conflict=A.checkDisjoint(base,[...rs.map(r=>f.edits[r]),p.edit]);
 need(index<9,'successor overlaps late-macro domain');
 const current=successorSnapshot(companion,index),canonical=successorSnapshot(expected.map,index),before=successorSnapshot(base,index);
 need(same(current,canonical),'successor is not the declared exactB operator result');
 const changed=!same(current,before),writers=rs.filter(r=>f.edits[r].componentEdit.index===index);
 need(!changed||same(writers,['T']),'changed successor requires selected exactB T writer');
 const aperture=changed?companion.design.timedApertureProgram:null;
 if(changed){
  need(aperture?.componentIndex===index&&same(aperture,expected.map.design.timedApertureProgram),'current T program differs from canonical edit');
  need(same(companion.obstacles.find(o=>o.id===aperture.sourceId),aperture.descriptor),'actual T descriptor differs');
  need(same(aperture.phrase.pairs[0].top,p.phrase.successor.firstDemandBodies.find(o=>o.id===aperture.phrase.pairs[0].top.id))&&same(aperture.phrase.pairs[0].bottom,p.phrase.successor.firstDemandBodies.find(o=>o.id===aperture.phrase.pairs[0].bottom.id)),'T changed protected first demand');
 }
 return{schema:'known-exactB-current-successor-context/1',componentIndex:index,current,baseSHA256:hash(before),currentSHA256:hash(current),routesSHA256:hash(companion.routes),changed,changedBy:changed?writers:[],selectedCompanions:clone(rs),
  provenance:{acceptedProducerSourceIdentity:envelope.sourceIdentity,acceptedEnvelopeSHA256:hash(envelope),exactBMapSHA256:hash(base),canonicalSelectedMapSHA256:expected.mapHash,selectedEditHashes:Object.fromEntries(rs.map(r=>[r,hash(f.edits[r])])),conflict},
  aperture:aperture?{sourceId:aperture.sourceId,componentIndex:aperture.componentIndex,descriptor:clone(aperture.descriptor),runtimeBodyIds:clone(aperture.runtimeBodyIds),receiverIds:aperture.phrase.receivers.map(q=>q.descriptor.id),programSHA256:hash(aperture),requiredObserver:'design/shared-program/observer-aperture-core-v1.cjs'}:null,
  physicalQualification:null,scope:'current exact accepted companion; unchanged strict source/receiver/first demand; changed T second pair and receiver require actual current-run evidence'};
}
function applyToCompanion(base,envelope,p,mode){
 const companion=envelope?.map;
 need(same(p,planPatch(base)),'mutated patch');need(companion&&!companion.design.laserProgram&&!companion.design.burstProgram,'L/J conflict or duplicate laser');
 const e=p.edit,i=p.componentIndex;need(same(companion.components[i],e.componentEdit.before)&&same(companion.design.stageRecoveryProgram.actualExpressions[i],e.expressionEdit.before),'L owner/expression changed');
 for(const r of e.strictReads)need(hash(companion.obstacles.find(o=>o.id===r.resource.slice(10)))===r.beforeHash,'protected body changed: '+r.resource);
 need(same(companion.obstacles.find(o=>o.id===p.before.id),p.before),'source changed');
 for(const r of ROUTES){for(const q of p.phrase.routeFacts.filter(q=>q.route===r))for(const f of [q.source,q.receiver])need(same(companion.routes[r].segments[f.segmentIndex],f.segment)&&same(companion.routes[r].checkpoints.find(c=>c.id===f.checkpoint.id),f.checkpoint),'local route changed');need(same(companion.routes[r].connectors[i],p.phrase.connector),'bridge changed');}
 const context=bindCurrentSuccessor(base,envelope,p,mode);
 const out=clone(companion);out.obstacles[out.obstacles.findIndex(o=>o.id===p.before.id)]=clone(p.after);out.components[i]=clone(e.componentEdit.after);out.design.components=out.components;out.design.stageRecoveryProgram.actualExpressions[i]=clone(e.expressionEdit.after);out.design.laserProgram={...clone(p.effects.program),currentSuccessorContext:context};
 need(same(undo(out,p),companion),'undeclared laser edit');A.runtimeIds(out);U.assertFiniteTree(out);F.validate(out);ROUTES.forEach(r=>Contract.validate(out,r));return out;
}
function undo(map,p){const out=clone(map),i=p.componentIndex;out.obstacles[out.obstacles.findIndex(o=>o.id===p.after.id)]=clone(p.before);out.components[i]=clone(p.edit.componentEdit.before);out.design.components=out.components;out.design.stageRecoveryProgram.actualExpressions[i]=clone(p.effects.expressionBefore);delete out.design.laserProgram;return out;}
module.exports={VERSION,sourceIdentity,dependencies,exactBase,routeFact,resolvePhrase,planPatch,summarizeSite,successorSnapshot,bindCurrentSuccessor,applyToCompanion,undo,hash};
