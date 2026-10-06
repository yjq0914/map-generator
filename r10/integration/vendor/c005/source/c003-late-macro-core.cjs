'use strict';
// Static, bounded request-conditioned relocation of complete packages 9 and 10.
// No simulator/controller imports, engine poses, saved states, or outcome reads.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const same=require('node:util').isDeepStrictEqual,clone=structuredClone;
const Intent=require('./c003-parent-binding.cjs'),Grammar=require('./b001-relation-grammar.cjs');
const Base=require('./recovery-generator.cjs'),U=require('./recovery-utils.cjs');
const F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
const VERSION='c003-bound-late-request-macro/1',SLOTS=[9,10],ROUTES=['main','branch'];
const DEMANDS=['any','hold-then-turn','alternating-body-passages','moving-hold'];
const RELATIONS=['action-conditioned-spacing','same-side-hold-then-turn','whole-body-exit-route-domain','short-relief-tail-corridor','sustained-moving-corridor','adaptive-sustained-gates','adaptive-tail-entry'];
const ownPath=path.join(__dirname,'c003-late-macro-core.cjs');
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const ownHash=hash(fs.readFileSync(ownPath));
const sourceIdentity=hash({version:VERSION,module:ownHash,parent:Intent.sourceIdentity});
const need=(v,s)=>{if(!v)throw Error('Late macro: '+s);};
const near=(a,b)=>Math.abs(a-b)<1e-9,objects=(m,i)=>m.obstacles.filter(o=>U.ownedIndex(o.id)===i);
const localSegments=(m,r,i)=>m.routes[r].segments.filter(s=>s.endX>m.components[i].startX&&s.endX<=m.components[i].endX);
const phase=(v,dx)=>v===null?null:({...clone(v),phase_rad:v.phase_rad-dx/F.VX*2*Math.PI/v.period_s});
const keys=(x,ks,label)=>need(x&&typeof x==='object'&&!Array.isArray(x)&&same(Object.keys(x).sort(),[...ks].sort()),'unknown/missing '+label+' fields');
function request(q){
 keys(q,['schema','firstDemand','firstRecoverySeconds','theme'],'request');
 need(q.schema==='late-macro-request/1'&&DEMANDS.includes(q.firstDemand),'unsupported action request');
 need(Number.isFinite(q.firstRecoverySeconds)&&q.firstRecoverySeconds>0&&q.firstRecoverySeconds<=4&&near(q.firstRecoverySeconds*120,Math.round(q.firstRecoverySeconds*120)),'recovery must be positive integral ticks, <=4 seconds');
 keys(q.theme,['staggerGradient','pairSymmetryGradient'],'theme');
 for(const x of Object.values(q.theme))need(Number.isFinite(x)&&Math.abs(x)<=1,'theme weight outside [-1,1]');
 return clone(q);
}
function geometryFacts(m,i){
 const core=objects(m,i).filter(o=>!/-tail-|-recovery-/.test(o.id)).sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 need(core.length>0,'empty core');
 const moving=core.every(o=>o.mechanic_kind==='vertical_armor_slider');
 let units,routeSides={},demand,pairedSymmetry=0;
 if(moving){
  const xs=[...new Set(core.map(o=>o.x))];need(xs.length===3&&core.length===6,'expected three complete moving pairs');
  units=xs.map(x=>{const p=core.filter(o=>o.x===x).sort((a,b)=>a.y-b.y),[a,b]=p;need(p.length===2&&a.collider.w===b.collider.w&&same(a.motion,b.motion),'unaligned moving pair');
   const upper=a.y+a.collider.h,lower=b.y;need(lower-upper>2*F.R,'closed moving gap');
   return{x:x+a.collider.w/2,y:(upper+lower)/2,bodyIds:p.map(o=>o.id),mirrorResidualPx:Math.abs(upper+lower-m.height),gapPx:lower-upper};});
  pairedSymmetry=units.filter(q=>near(q.mirrorResidualPx,0)).length/units.length;demand='moving-hold';
 }else{
  need(core.length===3&&core.every(o=>o.mechanic_kind==='fixed_armor_or_spike'&&o.motion===null),'expected three ordinary fixed islands');
  units=core.map(o=>({x:o.x+o.collider.w/2,y:o.y+o.collider.h/2,bodyIds:[o.id]}));
  for(const r of ROUTES)routeSides[r]=core.map(o=>{
   const mid=o.x+o.collider.w/2,ss=m.routes[r].segments,j=ss.findIndex(s=>s.endX>mid),s=ss[j],left=j?ss[j-1].endX:m.initial_player.x;
   need(s&&left<=o.x-F.R&&s.endX>=o.x+o.collider.w+F.R,'route does not cover whole island');
   const side=s.maxY<o.y-F.R?'upper':s.minY>o.y+o.collider.h+F.R?'lower':null;
   need(side,'side must be enforced by actual body-expanded route band');return side;});
  need(routeSides.main.every((s,j)=>s!==routeSides.branch[j]),'two routes no longer separated');
  const changes=routeSides.main.slice(1).map((s,j)=>s!==routeSides.main[j]);
  need(changes[1]&&(changes[0]===true||changes[0]===false),'unsupported side sequence');
  demand=changes[0]?'alternating-body-passages':'hold-then-turn';
 }
 const gaps=units.slice(1).map((u,j)=>u.x-units[j].x),dy=units.slice(1).map((u,j)=>u.y-units[j].y);
 return{componentIndex:i,demand,bodyIds:core.map(o=>o.id),units,routeSides,
  stagger:dy.reduce((a,v)=>a+Math.abs(v),0)/(dy.length*m.height),pairedSymmetry,
  centerSpacingPx:gaps,spacingGradientPx:gaps[1]-gaps[0],verticalStepsPx:dy,
  qualification:'actual descriptor geometry and enforced route bands; movement/readability unmeasured'};
}
// Bound uses actual bodies, route mark, route core, owned checkpoints and bridge.
// Shrinking by d requires d < every residual; no seed-index table or fixed bound.
function shrinkBound(m,i){
 const c=m.components[i],os=objects(m,i);need(os.length&&os.every(o=>o.x-F.R>c.startX),'left body envelope escaped');
 const con=m.routes.main.connectors[i];need(same(con,m.routes.branch.connectors[i]),'different route bridges');
 const ends=[],checks=[];
 for(const r of ROUTES){const ss=localSegments(m,r,i);need(ss.length&&ss.at(-1).endX===c.endX&&ss.slice(0,-1).every(s=>s.endX<con.startX),'unsupported bridge segment anatomy');ends.push(...ss.slice(0,-1).map(s=>s.endX));checks.push(...m.routes[r].checkpoints.filter(q=>U.ownedIndex(q.id)===i).map(q=>q.x));}
 need(os.filter(o=>o.x+o.collider.w+F.R>=con.startX).every(o=>o.mechanic_kind==='fixed_armor_or_spike'&&(o.y+o.collider.h<=140||o.y>=430)),'bridge rectangle [150,420] is not body-safe');
 const limits={body:c.endX-Math.max(...os.map(o=>o.x+o.collider.w+F.R)),mark:c.endX-m.routeMarks[i].x-F.R,bridge:c.endX-con.startX,routeCore:c.endX-Math.max(c.startX,...ends),checkpoint:c.endX-Math.max(c.startX,...checks)};
 const strictUpperPx=Math.min(...Object.values(limits)),tickPx=F.VX*F.DT;
 need(strictUpperPx>0,'nonpositive shrink bound');
 return{componentIndex:i,limits,strictUpperPx,maxIntegralShrinkTicks:Math.ceil(strictUpperPx/tickPx)-1,safeBridgeCenterY:[150,420],proofScope:'static exclusion only, not reachable-state proof'};
}
function validateBase(m){
 need(F.R===10&&F.VX===150&&F.DT===1/120&&F.G===820&&F.FLAP===-290,'physics changed');
 need(m.components.length===12&&m.horizon===14400&&m.durationTicks===14400&&m.initial_player.x===60&&m.initial_player.vx===150,'course domain changed');
 need(!m.design.lateMacroProgram&&m.design.adaptiveTransforms.length===0,'unknown prior transform');
 for(const i of SLOTS){const c=m.components[i];need(c.stageId==='2'&&c.theme!=='spring'&&c.relations.every(r=>RELATIONS.includes(r.type)),'unsupported late relation');
  for(const o of objects(m,i))need(o.collider.shape==='rectangle'&&['fixed_armor_or_spike','vertical_armor_slider'].includes(o.mechanic_kind)&&o.timeline===null&&o.effect_region===null&&o.group_id===o.id&&!o.trigger_id&&(!o.motion||o.mechanic_kind==='vertical_armor_slider'&&Number.isFinite(o.motion.period_s)&&o.motion.period_s>0),'nonlocal or unsupported body dependency');
  geometryFacts(m,i);shrinkBound(m,i);
 }
 return true;
}
function facts(input,prefixRequest){need(hash(fs.readFileSync(ownPath))===ownHash,'prototype source mutated after load');Intent.dependencies();const env=Intent.compile(input,prefixRequest);validateBase(env.map);return env;}
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
 return{schema:VERSION,sourceIdentity,condition:clone(m.condition),prefixRequest:clone(env.plan.request),prefixMapHash:env.mapHash,request:r,candidates,selected,moves,geometryFacts:facts,bounds,
  qualification:{staticOnly:true,newPhysics:false,continuousEntranceMeasured:false,actualAction:null,visualReadability:null,humanFun:null}};
}
function shiftRelations(rs,q){return rs.map(v=>{const r=clone(v);if(r.type==='short-relief-tail-corridor'){for(const k of ['startX','endX','bridgeStartX'])r.routeIntent[k]+=q.deltaOffset;r.bridgeSeconds=(q.endX-q.bridgeStartX)/F.VX;}if(r.type==='adaptive-tail-entry')r.bridgeSeconds=(q.endX-q.bridgeStartX)/F.VX;return r;});}
function optionalContexts(m){
 const contexts={};
 for(const [key,program] of Object.entries({H:m.design.hammerProgram,T:m.design.timedApertureProgram,J:m.design.burstProgram})){if(!program)continue;const i=program.componentIndex;need(i<=7,'optional owner escaped pinned prefix');contexts[key]={componentIndex:i,source:clone(m.obstacles.find(o=>o.id===program.sourceId)),component:clone(m.components[i]),predecessor:i?clone(m.components[i-1]):null,successor:clone(m.components[i+1]),connectors:Object.fromEntries(ROUTES.map(r=>[r,clone(m.routes[r].connectors[i])]))};}
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
 for(const i of SLOTS)out.design.stageRecoveryProgram.actualExpressions[i]=Grammar.expression(out,i);
 out.design.lateMacroProgram={schema:VERSION,sourceIdentity,prefixMapHash:p.prefixMapHash,request:clone(p.request),moves:clone(p.moves),qualification:clone(p.qualification),
  phaseRule:'phase_new=phase_parent-deltaX/VX*2pi/period; absolute world clock never reset',
  currentPressurePairIds:out.design.pressureProgram.pairRecords.map(v=>v.pairId),pressureIdentityMap:m.design.pressureProgram.pairRecords.map(v=>{const q=bySource.get(v.componentIndex);return{before:v.pairId,after:q?U.remapId(v.pairId,q.slot):v.pairId};}),currentOptionalContexts:optionalContexts(out),currentRoutesHash:hash(out.routes),legacyAdmission:'old whole-map hashes/common-pair IDs are provenance; c003-current-interface binds the current map, routes, and explicit identity map',
  actualExpressions:SLOTS.map(i=>geometryFacts(out,i)),effectiveContexts:SLOTS.map(i=>({componentIndex:i,predecessor:clone(out.components[i-1]),successor:clone(out.components[i+1]),entryX:out.components[i].startX,exitX:out.components[i].endX})),
  metadataScope:{current:['components','routes','routeMarks','macroPlan','componentTimeline','pressureProgram.pairRecords','stageRecoveryProgram.actualExpressions','lateMacroProgram'],historical:['orderProgram','lengthProgram','relationGrammarProgram','stageRecoveryProgram.moves/operation/bounds','geometryTransforms','relationshipProgram','prior component relocations','inherited optional declarations: full-map hashes/common-pair lists; local contexts remain unchanged']}};
 out.id=out.mapId=VERSION+'-'+out.seed;out.design.generatorVersion=VERSION;out.design.qualification='Unqualified static macro proposal; no physical or visual acceptance';
 verifyProtected(m,out);for(const i of SLOTS)shrinkBound(out,i);U.assertFiniteTree(out);F.validate(out);return out;
}
function verifyProtected(a,b){
 for(const i of [0,1,2,3,4,5,6,7,8,11]){need(same(a.components[i],b.components[i])&&same(objects(a,i),objects(b,i))&&same(a.routeMarks[i],b.routeMarks[i]),'pinned package changed');for(const r of ROUTES)need(same(localSegments(a,r,i),localSegments(b,r,i))&&same(a.routes[r].connectors[i],b.routes[r].connectors[i]),'pinned route changed');}
 for(const r of ROUTES)for(const k of ['contact','exit','finalDomain','events','recoveryTicks'])need(same(a.routes[r][k],b.routes[r][k]),'global route contract changed');
 for(const k of ['initial_player','condition','horizon','durationTicks','triggers','encounters','coins'])need(same(a[k],b[k]),'global state changed');
 for(const k of ['hammerProgram','relocatedHammerProgram','timedApertureProgram','burstProgram','optionalSpringProgram','sharedMechanicProgram','threeMechanicProgram'])need(same(a.design[k],b.design[k]),'optional interface changed');
 need(same(optionalContexts(a),optionalContexts(b)),'current optional context changed');
 need(new Set(b.obstacles.map(o=>o.id)).size===b.obstacles.length,'source ID collision');
 return true;
}
function undoDeclared(out,base){
 const m=clone(out);for(const k of ['components','obstacles','routeMarks','routes','macroPlan','id','mapId'])m[k]=clone(base[k]);
 for(const k of ['components','componentTimeline','generatorVersion','qualification'])m.design[k]=clone(base.design[k]);
 m.design.pressureProgram.pairRecords=clone(base.design.pressureProgram.pairRecords);m.design.stageRecoveryProgram.actualExpressions=clone(base.design.stageRecoveryProgram.actualExpressions);delete m.design.lateMacroProgram;return m;
}
function planProgram(base,prefixRequest,q){const env=facts(base?.condition,prefixRequest);need(same(base,env.map),'requires exact explicitly bound parent output');return makePlan(env,q);}
function mergeChecked(base,p){const env=facts(base?.condition,p?.prefixRequest),expected=makePlan(env,p?.request);need(same(base,env.map)&&same(p,expected),'modified input/plan/source/request');const out=materialize(base,p);need(same(undoDeclared(out,base),base),'undeclared write detected');return out;}
function compile(input,prefixRequest,q,mode){need(mode==='experimental-static','new macro domain requires explicit experimental-static mode');const env=facts(input,prefixRequest),plan=makePlan(env,q),map=materialize(env.map,plan);need(same(undoDeclared(map,env.map),env.map),'backward reconstruction failed');return{schema:'late-macro-envelope/1',sourceIdentity,plan,mapHash:hash(map),map};}
function reverseChecked(out,p){const env=facts(out?.condition,p?.prefixRequest),expected=makePlan(env,p?.request);need(same(p,expected)&&same(out,materialize(env.map,expected)),'mutated map or plan');const restored=undoDeclared(out,env.map);need(same(restored,env.map),'exact inverse failed');return restored;}
module.exports={VERSION,sourceIdentity,request,geometryFacts,shrinkBound,validateBase,planProgram,mergeChecked,compile,reverseChecked,verifyProtected,hash};
