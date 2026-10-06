'use strict';
// Separate prospective adapter: no change to c003 source or accepted calls.
// Materialization/plan/inverse below are carried from c003, with source-bound
// parent injection and primary/auxiliary fact separation. No runtime calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const same=require('node:util').isDeepStrictEqual,clone=structuredClone;
const VERSION='prospective-neighbor-late-request-macro/2-current-laser-routes',SLOTS=[9,10],ROUTES=['main','branch'];
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const need=(v,s)=>{if(!v)throw Error('Neighbor macro: '+s);};
const ownHash=hash(fs.readFileSync(__filename));
function create({sourceRoot,parent,binding}){
 need(binding&&['preparation-only','durable-accepted'].includes(binding.status),'explicit binding status required');
 need(parent&&parent.sourceIdentity===binding.expectedSourceIdentity,'parent source identity differs');
 need(typeof parent.compile==='function'&&typeof parent.dependencies==='function','parent compiler/dependencies required');
 const root=path.resolve(sourceRoot),BINDING=clone(binding),Intent=parent;
 const load=f=>require(path.join(root,f));
 const Legacy=load('c003-late-macro-core.cjs'),Grammar=load('b001-relation-grammar.cjs');
 const Base=load('recovery-generator.cjs'),U=load('recovery-utils.cjs'),F=load('vendor/engine/core.js'),Contract=load('vendor/contract.cjs');
 const paths=['c003-late-macro-core.cjs','b001-relation-grammar.cjs','recovery-generator.cjs','recovery-utils.cjs','vendor/engine/core.js','vendor/contract.cjs'];
 const digests=Object.fromEntries(paths.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
 const sourceIdentity=hash({version:VERSION,module:ownHash,dependencies:digests,parent:BINDING});
 const near=(a,b)=>Math.abs(a-b)<1e-9,objects=(m,i)=>m.obstacles.filter(o=>U.ownedIndex(o.id)===i);
 const localSegments=(m,r,i)=>m.routes[r].segments.filter(s=>s.endX>m.components[i].startX&&s.endX<=m.components[i].endX);
 const phase=(v,dx)=>v===null?null:({...clone(v),phase_rad:v.phase_rad-dx/F.VX*2*Math.PI/v.period_s});
 const request=Legacy.request,shrinkBound=Legacy.shrinkBound;
 const RELATIONS=['action-conditioned-spacing','same-side-hold-then-turn','whole-body-exit-route-domain','short-relief-tail-corridor','sustained-moving-corridor','adaptive-sustained-gates','adaptive-tail-entry'];
 function dependencies(){
  need(hash(fs.readFileSync(__filename))===ownHash,'adapter changed after load');
  for(const [f,h]of Object.entries(digests))need(hash(fs.readFileSync(path.join(root,f)))===h,'immutable dependency changed: '+f);
  need(Intent.dependencies()===BINDING.expectedSourceIdentity,'parent identity changed');
  if(BINDING.status==='durable-accepted'){
   need(BINDING.acceptedSnapshot&&BINDING.acceptedSnapshotSHA256&&BINDING.round&&BINDING.generator,'incomplete accepted binding');
   const bytes=fs.readFileSync(path.resolve(root,'..',BINDING.acceptedSnapshot));need(hash(bytes)===BINDING.acceptedSnapshotSHA256,'accepted snapshot changed');
   const a=JSON.parse(bytes);need(a.round===BINDING.round&&a.generator===BINDING.generator&&!a.pendingDurableSave,'parent is not the explicitly durable accepted producer');
  }
  return sourceIdentity;
 }
 function neighbors(m,i){
  const adjacency=m.condition.adjacency;
  need(['none','upper-after','lower-before'].includes(adjacency),'unsupported adjacency');
  const os=objects(m,i),aux=os.filter(o=>/-adj-/.test(o.id));
  const suffix=adjacency==='upper-after'?'adj-upper':'adj-lower';
  need(aux.length===(adjacency==='none'?0:1),'incomplete or duplicate neighbor inventory');
  return aux.map(o=>{
   const upper=adjacency==='upper-after',expectedId=`c${i}-${suffix}`,c=m.components[i];
   need(o.id===expectedId&&o.group_id===o.id&&!o.trigger_id&&o.mechanic_kind==='fixed_armor_or_spike'&&o.motion===null&&o.timeline===null&&o.effect_region===null&&same(o.collider,{shape:'rectangle',w:35,h:upper?285:75})&&o.y===(upper?-120:465)&&same(o.interaction,{lethal:true}),'unsupported carried-neighbor dependency');
   need(near(o.x,c.offset+(upper?1180:150)+m.condition.lead),'neighbor is not inherited package-relative geometry');
   const slab=[o.x-F.R,o.x+o.collider.w+F.R],core=os.filter(v=>!/-tail-|-recovery-|-adj-/.test(v.id));
   need(core.length&&slab[0]>c.startX&&slab[1]<c.endX,'neighbor body-expanded slab leaves package');
   need(upper?slab[0]>Math.max(...core.map(v=>v.x+v.collider.w+F.R)):slab[1]<Math.min(...core.map(v=>v.x-F.R)),'neighbor overlaps or crosses primary demand order');
   need(slab[1]<m.routes.main.connectors[i].startX&&slab[1]<m.routes.branch.connectors[i].startX,'neighbor intrudes into analytic bridge');
   return{bodyId:o.id,descriptor:clone(o),bodyExpandedSlab:slab,relation:upper?'after-primary-before-bridge':'before-primary',requiredSide:upper?'lower':'upper',scope:'carried body; not an extra primary action unit or theme sample'};
  });
 }
 function primaryView(m,i){const ids=new Set(neighbors(m,i).map(n=>n.bodyId));return{...m,obstacles:m.obstacles.filter(o=>!ids.has(o.id))};}
 function geometryFacts(m,i){const auxiliaryBodies=neighbors(m,i),primary=Legacy.geometryFacts(primaryView(m,i),i);return{...primary,auxiliaryBodies};}
 function laserContext(m){
  const p=m.design.laserProgram;if(!p)return null;
  const c=p.currentSuccessorContext,index=p.componentIndex;
  need(p.schema==='exact-b005-warning-laser-current-successor/2'&&Number.isInteger(index)&&index<=7&&c?.componentIndex===index+1,'unsupported laser successor dependency');
  need(c.routesSHA256===hash(m.routes),'laser global route binding is stale');
  const snapshot={component:m.components[index+1],bodies:objects(m,index+1),expression:m.design.stageRecoveryProgram.actualExpressions[index+1]};
  need(same(snapshot,c.current)&&hash(snapshot)===c.currentSHA256,'laser current successor differs');
  const ids=[p.sourceId,p.phrase.receiver.id,...p.recovery.nextDemand.firstDemandBodies.map(o=>o.id)];
  need(ids.every(id=>U.ownedIndex(id)<9)&&ids.every(id=>m.obstacles.some(o=>o.id===id)),'laser protected bodies escape pinned prefix');
  return{componentIndex:index,successorIndex:index+1,source:clone(m.obstacles.find(o=>o.id===p.sourceId)),receiver:clone(p.phrase.receiver),firstDemand:clone(p.recovery.nextDemand.firstDemandBodies),currentSuccessor:clone(snapshot),program:clone(p)};
 }
 function validateBase(m){
  need(F.R===10&&F.VX===150&&F.DT===1/120&&F.G===820&&F.FLAP===-290,'physics changed');
  need(m.components.length===12&&m.horizon===14400&&m.durationTicks===14400&&m.initial_player.x===60&&m.initial_player.vx===150,'course domain changed');
  need(!m.design.lateMacroProgram&&m.design.adaptiveTransforms.length===0,'unknown prior transform; parent request must leave late macro off');
  need(['triggers','encounters','coins'].every(k=>Array.isArray(m[k])&&!m[k].length),'unsupported global cross-package dependency');
  laserContext(m);
  for(const i of SLOTS){const c=m.components[i];need(c.stageId==='2'&&c.theme!=='spring'&&c.relations.every(r=>RELATIONS.includes(r.type)),'unsupported late relation');
   for(const o of objects(m,i))need(o.collider.shape==='rectangle'&&['fixed_armor_or_spike','vertical_armor_slider'].includes(o.mechanic_kind)&&o.timeline===null&&o.effect_region===null&&o.group_id===o.id&&!o.trigger_id&&(!o.motion||o.mechanic_kind==='vertical_armor_slider'&&Number.isFinite(o.motion.period_s)&&o.motion.period_s>0),'nonlocal or unsupported body dependency');
   geometryFacts(m,i);shrinkBound(m,i);
  }
  return true;
 }
 function facts(input,parentRequest){dependencies();const env=Intent.compile(input,parentRequest);need(env.mapHash===hash(env.map),'parent map hash differs');validateBase(env.map);return{...env,parentRequest:clone(parentRequest)};}
function makePlan(env,q){
 const m=env.map,r=request(q),bounds=SLOTS.map(i=>shrinkBound(m,i)),facts=SLOTS.map(i=>geometryFacts(m,i));
 const candidates=[[9,10],[10,9]].map(order=>{
  const a=m.components[order[0]],b=m.components[order[1]],fa=facts.find(f=>f.componentIndex===order[0]),fb=facts.find(f=>f.componentIndex===order[1]);
  const oldBridgeTicks=Math.round((a.endX-m.routes.main.connectors[order[0]].startX)/(F.VX*F.DT));
  const transferTicks=Math.round(r.firstRecoverySeconds*120)-oldBridgeTicks,delta=transferTicks*F.VX*F.DT;
  const donor=transferTicks>=0?order[1]:order[0],bound=bounds.find(q=>q.componentIndex===donor),reasons=[];
  if(Math.abs(transferTicks)>60||Math.abs(transferTicks)>bound.maxIntegralShrinkTicks)reasons.push('duration-outside-capped-geometric-domain');
  if(r.firstDemand!=='any'&&fa.demand!==r.firstDemand)reasons.push('first-demand');
  const gradients={staggerGradient:fb.stagger-fa.stagger,pairSymmetryGradient:fb.pairedSymmetry-fa.pairedSymmetry};
  const themeScore=Object.keys(gradients).reduce((n,k)=>n+gradients[k]*r.theme[k],0);
  return{order,transferTicks,transferPx:delta,donor,bound,firstDemand:fa.demand,gradients,themeScore,eligible:!reasons.length,reasons};
 });
 const eligible=candidates.filter(c=>c.eligible).sort((a,b)=>b.themeScore-a.themeScore||Math.abs(a.transferTicks)-Math.abs(b.transferTicks)||a.order[0]-b.order[0]);
 need(eligible.length,'unsupported request: '+candidates.map(c=>c.order.join(',')+':'+c.reasons.join('|')).join(';'));
 const selected=eligible[0],moves=[];let offset=m.components[9].offset;
 for(let j=0;j<2;j++){const sourceIndex=selected.order[j],c=m.components[sourceIndex],slot=9+j,lengthPx=c.lengthPx+(j===0?selected.transferPx:-selected.transferPx),deltaOffset=offset-c.offset;
  moves.push({slot,sourceIndex,previousOffset:c.offset,previousLengthPx:c.lengthPx,offset,deltaOffset,lengthPx,deltaLengthPx:lengthPx-c.lengthPx,startX:60+offset,endX:60+offset+lengthPx,bridgeStartX:m.routes.main.connectors[sourceIndex].startX+deltaOffset,startTick:offset/(F.VX*F.DT),endTick:(offset+lengthPx)/(F.VX*F.DT)});offset+=lengthPx;}
 need(offset===m.components[11].offset&&moves.every(q=>Number.isInteger(q.startTick)&&Number.isInteger(q.endTick)),'closure or integral time failed');
 return{schema:VERSION,sourceIdentity,condition:clone(m.condition),prefixRequest:clone(env.parentRequest),prefixMapHash:env.mapHash,request:r,candidates,selected,moves,geometryFacts:facts,bounds,
  qualification:{staticOnly:true,newPhysics:false,continuousEntranceMeasured:false,actualAction:null,visualReadability:null,humanFun:null}};
}
function shiftRelations(rs,q){return rs.map(v=>{const r=clone(v);if(r.type==='short-relief-tail-corridor'){for(const k of ['startX','endX','bridgeStartX'])r.routeIntent[k]+=q.deltaOffset;r.bridgeSeconds=(q.endX-q.bridgeStartX)/F.VX;}if(r.type==='adaptive-tail-entry')r.bridgeSeconds=(q.endX-q.bridgeStartX)/F.VX;return r;});}
function optionalContexts(m){
 const contexts={};
 for(const [key,program] of Object.entries({H:m.design.hammerProgram,T:m.design.timedApertureProgram,J:m.design.burstProgram,L:m.design.laserProgram})){if(!program)continue;const i=program.componentIndex;need(i<=7,'optional owner escaped pinned prefix');contexts[key]={componentIndex:i,source:clone(m.obstacles.find(o=>o.id===program.sourceId)),component:clone(m.components[i]),predecessor:i?clone(m.components[i-1]):null,successor:clone(m.components[i+1]),connectors:Object.fromEntries(ROUTES.map(r=>[r,clone(m.routes[r].connectors[i])]))};}
 return contexts;
}
function materialize(m,p){
 const out=clone(m),bySource=new Map(p.moves.map(q=>[q.sourceIndex,q]));
 for(const q of p.moves){const c=clone(m.components[q.sourceIndex]);Object.assign(c,{offset:q.offset,lengthPx:q.lengthPx,startX:q.startX,endX:q.endX,relations:shiftRelations(c.relations,q),lateMacroRelocation:{schema:VERSION,...clone(q),priorRelocations:'historical construction provenance'}});out.components[q.slot]=c;out.routeMarks[q.slot]={...clone(m.routeMarks[q.sourceIndex]),id:'component-'+q.slot,x:m.routeMarks[q.sourceIndex].x+q.deltaOffset};}
 out.obstacles=m.obstacles.filter(o=>!bySource.has(U.ownedIndex(o.id)));
 const replacements=p.moves.flatMap(q=>objects(m,q.sourceIndex).map(v=>({...clone(v),id:U.remapId(v.id,q.slot),group_id:U.remapId(v.group_id,q.slot),x:v.x+q.deltaOffset,motion:phase(v.motion,q.deltaOffset)})));
 const insert=out.obstacles.findIndex(o=>U.ownedIndex(o.id)===11);out.obstacles.splice(insert,0,...replacements);
 for(const r of ROUTES){const src=m.routes[r],dst=out.routes[r];
  dst.segments=m.components.flatMap((c,i)=>{const q=p.moves.find(q=>q.slot===i);return q?localSegments(m,r,q.sourceIndex).map((s,j,a)=>({...clone(s),endX:s.endX+q.deltaOffset+(j===a.length-1?q.deltaLengthPx:0)})):clone(localSegments(m,r,i));});
  dst.checkpoints=src.checkpoints.filter(v=>!bySource.has(U.ownedIndex(v.id))&&!['handoff-9','handoff-10'].includes(v.id));
  for(const q of p.moves){dst.checkpoints.push(...src.checkpoints.filter(v=>U.ownedIndex(v.id)===q.sourceIndex).map(v=>({...clone(v),id:U.remapId(v.id,q.slot),x:v.x+q.deltaOffset})));dst.checkpoints.push({...clone(src.checkpoints.find(v=>v.id==='handoff-'+q.slot)),x:q.endX});dst.connectors[q.slot]={startX:q.bridgeStartX,boundaryX:q.endX};}
  dst.checkpoints.sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));need(dst.segments.every((s,j,a)=>!j||s.endX>a[j-1].endX),'nonincreasing route');Contract.validate(out,r);
 }
 out.macroPlan=out.components.map((c,i)=>({id:'component-'+i,startTick:c.offset/(F.VX*F.DT),endTick:(c.offset+c.lengthPx)/(F.VX*F.DT)}));
 out.design.pressureProgram.pairRecords=m.design.pressureProgram.pairRecords.map(v=>{const q=bySource.get(v.componentIndex);return q?{...clone(v),componentIndex:q.slot,pairId:U.remapId(v.pairId,q.slot),inheritedMotion:phase(v.inheritedMotion,q.deltaOffset)}:clone(v);}).sort((a,b)=>a.componentIndex-b.componentIndex||a.pairId.localeCompare(b.pairId));
 out.design.components=out.components;out.design.componentTimeline=Base.componentTimeline(out);
 const oldLaser=laserContext(m);let currentLaserRouteBinding=null;
 if(oldLaser){out.design.laserProgram=clone(m.design.laserProgram);out.design.laserProgram.currentSuccessorContext.routesSHA256=hash(out.routes);
  currentLaserRouteBinding={schema:'exact-pinned-laser-current-route-rebinding/1',beforeRoutesSHA256:hash(m.routes),afterRoutesSHA256:hash(out.routes),programBeforeSHA256:hash(m.design.laserProgram),programAfterSHA256:hash(out.design.laserProgram),componentIndex:oldLaser.componentIndex,successorIndex:oldLaser.successorIndex,pinnedContextSHA256:hash({...oldLaser,program:null}),changedField:'laserProgram.currentSuccessorContext.routesSHA256',qualification:'authenticated whole-package9/10 move only; protected early bodies and successor unchanged'};
 }
 for(const i of SLOTS)out.design.stageRecoveryProgram.actualExpressions[i]=Grammar.expression(primaryView(out,i),i);
 out.design.lateMacroProgram={schema:VERSION,sourceIdentity,prefixMapHash:p.prefixMapHash,request:clone(p.request),moves:clone(p.moves),qualification:clone(p.qualification),
  phaseRule:'phase_new=phase_parent-deltaX/VX*2pi/period; absolute world clock never reset',
  currentPressurePairIds:out.design.pressureProgram.pairRecords.map(v=>v.pairId),pressureIdentityMap:m.design.pressureProgram.pairRecords.map(v=>{const q=bySource.get(v.componentIndex);return{before:v.pairId,after:q?U.remapId(v.pairId,q.slot):v.pairId};}),currentOptionalContexts:optionalContexts(out),currentLaserRouteBinding,currentRoutesHash:hash(out.routes),legacyAdmission:'old whole-map hashes/common-pair IDs are provenance; prospective neighbor admission must bind the actual parent, current map/routes and explicit pressure identity map',
  actualExpressions:SLOTS.map(i=>geometryFacts(out,i)),effectiveContexts:SLOTS.map(i=>({componentIndex:i,predecessor:clone(out.components[i-1]),successor:clone(out.components[i+1]),entryX:out.components[i].startX,exitX:out.components[i].endX})),
  metadataScope:{current:['components','routes','routeMarks','macroPlan','componentTimeline','pressureProgram.pairRecords','stageRecoveryProgram.actualExpressions','lateMacroProgram','laserProgram.currentSuccessorContext.routesSHA256 when L exists'],historical:['orderProgram','lengthProgram','relationGrammarProgram','stageRecoveryProgram.moves/operation/bounds','geometryTransforms','relationshipProgram','prior component relocations','inherited optional declarations: full-map hashes/common-pair lists; local contexts remain unchanged']}};
 out.id=out.mapId=VERSION+'-'+out.seed;out.design.generatorVersion=VERSION;out.design.qualification='Unqualified static macro proposal; no physical or visual acceptance';
 verifyProtected(m,out);for(const i of SLOTS)shrinkBound(out,i);U.assertFiniteTree(out);F.validate(out);return out;
}
function verifyProtected(a,b){
 for(const i of [0,1,2,3,4,5,6,7,8,11]){need(same(a.components[i],b.components[i])&&same(objects(a,i),objects(b,i))&&same(a.routeMarks[i],b.routeMarks[i]),'pinned package changed');for(const r of ROUTES)need(same(localSegments(a,r,i),localSegments(b,r,i))&&same(a.routes[r].connectors[i],b.routes[r].connectors[i]),'pinned route changed');}
 for(const r of ROUTES)for(const k of ['contact','exit','finalDomain','events','recoveryTicks'])need(same(a.routes[r][k],b.routes[r][k]),'global route contract changed');
 for(const k of ['initial_player','condition','horizon','durationTicks','triggers','encounters','coins'])need(same(a[k],b[k]),'global state changed');
 for(const k of ['hammerProgram','relocatedHammerProgram','timedApertureProgram','burstProgram','optionalSpringProgram','sharedMechanicProgram','threeMechanicProgram'])need(same(a.design[k],b.design[k]),'optional interface changed');
 if(a.design.laserProgram){const expected=clone(a.design.laserProgram);expected.currentSuccessorContext.routesSHA256=hash(b.routes);need(same(expected,b.design.laserProgram),'laser changed beyond declared current-route hash');const aa=laserContext(a),bb=laserContext(b);need(same({...aa,program:null},{...bb,program:null}),'laser protected prefix/successor changed');}else need(!b.design.laserProgram,'laser added');
 need(same(optionalContexts(a),optionalContexts(b)),'current optional context changed');
 need(new Set(b.obstacles.map(o=>o.id)).size===b.obstacles.length,'source ID collision');
 return true;
}
function undoDeclared(out,base){
 const m=clone(out);for(const k of ['components','obstacles','routeMarks','routes','macroPlan','id','mapId'])m[k]=clone(base[k]);
 for(const k of ['components','componentTimeline','generatorVersion','qualification'])m.design[k]=clone(base.design[k]);
 m.design.pressureProgram.pairRecords=clone(base.design.pressureProgram.pairRecords);m.design.stageRecoveryProgram.actualExpressions=clone(base.design.stageRecoveryProgram.actualExpressions);if(base.design.laserProgram)m.design.laserProgram=clone(base.design.laserProgram);delete m.design.lateMacroProgram;return m;
}
function planProgram(base,prefixRequest,q){const env=facts(base?.condition,prefixRequest);need(same(base,env.map),'requires exact explicitly bound parent output');return makePlan(env,q);}
function mergeChecked(base,p){const env=facts(base?.condition,p?.prefixRequest),expected=makePlan(env,p?.request);need(same(base,env.map)&&same(p,expected),'modified input/plan/source/request');const out=materialize(base,p);need(same(undoDeclared(out,base),base),'undeclared write detected');return out;}
function compile(input,prefixRequest,q,mode){need(mode==='experimental-static','new macro domain requires explicit experimental-static mode');const env=facts(input,prefixRequest),plan=makePlan(env,q),map=materialize(env.map,plan);need(same(undoDeclared(map,env.map),env.map),'backward reconstruction failed');return{schema:'late-macro-envelope/1',sourceIdentity,plan,mapHash:hash(map),map};}
function reverseChecked(out,p){const env=facts(out?.condition,p?.prefixRequest),expected=makePlan(env,p?.request);need(same(p,expected)&&same(out,materialize(env.map,expected)),'mutated map or plan');const restored=undoDeclared(out,env.map);need(same(restored,env.map),'exact inverse failed');return restored;}

 // Existing request forms remain exact parent producer call-through. The new
 // shape is explicit, and parentRequest must produce no prior late transform.
 function compileRequest(input,q,mode){
  dependencies();if(q?.schema!=='neighbor-late-macro-request/1')return Intent.compile(input,q);
  need(same(Object.keys(q).sort(),['macro','parentRequest','schema']),'unknown/missing adapter request fields');
  if(q.macro===null)return Intent.compile(input,q.parentRequest);
  return compile(input,q.parentRequest,q.macro,mode);
 }
 return{VERSION,sourceIdentity,binding:clone(BINDING),dependencies,request,laserContext,neighbors,primaryView,geometryFacts,shrinkBound,validateBase,planProgram,mergeChecked,compile,compileRequest,reverseChecked,verifyProtected,hash};
}
module.exports={VERSION,create,hash};
