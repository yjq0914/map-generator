'use strict';
// NEW recovery derivative of a complete tool-output transcription (not original disk hash).
// Bounded generation-time package relocation. Never calls physics or restores state.
const F=require('./vendor/engine/core.js'),Contract=require('./vendor/contract.cjs');
const VERSION='recovery-balanced-recovery-lengths/1',STRIDE=1500,N=12,X0=60,VX=150,ROUTES=['main','branch'];
const clone=structuredClone,near=require('./recovery-utils.cjs').near,same=require('./recovery-utils.cjs').equal;
const fail=s=>{throw Error('Adaptive length: '+s);};
const owned=id=>{const m=/^c(0|[1-9]\d*)-/.exec(id);return m?+m[1]:-1;};
const RELATIONS=new Set(['planned-centerline-meander','action-conditioned-spacing','same-side-hold-then-turn','sustained-moving-corridor','continuous-two-route-corridor','fixed-island-between-moving-pairs','short-relief-tail-corridor','local-vertical-echo','contact-first-optional-branch','whole-body-exit-route-domain','adaptive-sustained-gates','adaptive-tail-entry']);
const KINDS=new Set(['fixed_armor_or_spike','vertical_armor_slider','spring_wall']);
const CONTACT_X=['startX','landingTargetX','minContactX','maxContactX','receiverEntryX','receiverExitX'];
const INTENT_X=['desiredContactX'],INTENT_ARRAYS=['allowedContactX','receiverCenterIntervalX','contactSurfaceX'];
function shiftIntent(intent,dx){const q=clone(intent);for(const k of INTENT_X)if(k in q){if(!Number.isFinite(q[k]))fail('nonfinite spring intent');q[k]+=dx;}for(const k of INTENT_ARRAYS)if(k in q){if(!Array.isArray(q[k])||!q[k].every(Number.isFinite))fail('invalid spring interval');q[k]=q[k].map(x=>x+dx);}return q;}
function phaseShift(q,dx){if(q===null)return null;if(dx===0)return clone(q);if(!q||!Number.isFinite(q.period_s)||!Number.isFinite(q.phase_rad))fail('unsupported periodic motion');return{...clone(q),phase_rad:q.phase_rad-dx/VX*2*Math.PI/q.period_s};}
function rank(seed,stage,index,channel){let x=(seed^Math.imul(stage+31,0x9e3779b1)^Math.imul(index+7,0x85ebca77)^Math.imul(channel+41,0xc2b2ae3d))>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return((x>>>0)+.5)/4294967296;}
function localSegments(m,route,i){return m.routes[route].segments.filter(s=>s.endX>i*STRIDE+X0&&s.endX<=i*STRIDE+1560);}
function validateInput(m,e,op){
 if(!op||typeof op!=='object'||Array.isArray(op)||Object.keys(op).some(k=>!['type','deltaPx','recoveryBias','seedSalt'].includes(k))||op.type!=='balanced-component-lengths')fail('unsupported operation');
 if(op.deltaPx!==15||!Number.isFinite(op.recoveryBias??0)||Math.abs(op.recoveryBias??0)>1||!Number.isInteger(op.seedSalt??0)||(op.seedSalt??0)<0||(op.seedSalt??0)>0xffffffff)fail('length controls outside support');
 const eligibility=require('./recovery-order.cjs').eligibleStages(m);const stages=eligibility.filter(s=>s.eligible).map(s=>Number(s.stageId));if(!stages.length)fail('no relation-qualified stage available for length changes');
 if(F.R!==10||F.VX!==150||F.G!==820||F.FLAP!==-290||F.DT!==1/120)fail('physics dependency changed');
 if(!m||m.schema!=='timed-course-120/v1'||m.components?.length!==N||m.horizon!==14400||m.durationTicks!==14400||m.height!==540||m.initial_player?.x!==X0||m.initial_player?.vx!==VX||!m.design?.withBridge||m.design.lengthProgram||m.intervention||['state','session','checkpoint'].some(k=>k in m))fail('requires an unlengthened120s course');
 if(!Number.isInteger(m.seed)||m.seed<0||m.seed>0xffffffff||!e||typeof e!=='object'||Array.isArray(e))fail('invalid entry');
 for(const k of ['seed','y','vy','lead','phase','adjacency'])if(e[k]!==undefined&&e[k]!== (k==='seed'?m.seed:m.condition?.[k]??({y:270,vy:0,lead:0,phase:0,adjacency:'none'}[k])))fail('entry differs from map: '+k);
 if(['triggers','encounters','coins'].some(k=>!Array.isArray(m[k])||m[k].length)||!same(m.macroPlan,[{id:'course',startTick:0,endTick:14400}])||!same(m.expected,{}))fail('unrecognized cross-package timeline or external target');
 if(!same(Object.keys(m.routes).sort(),['branch','main'])||m.routeMarks?.length!==N)fail('route package mismatch');
 for(const[cIndex,c]of m.components.entries()){
  if(c.offset!==cIndex*STRIDE||!['wave','mechanical','spring'].includes(c.theme)||c.lengthPx!==undefined||c.startX!==undefined||c.endX!==undefined||c.stageId!==undefined||!Array.isArray(c.relations)||c.relations.some(r=>!RELATIONS.has(r.type)))fail('unsupported component layout or relation');
  const mark=m.routeMarks[cIndex];if(mark.id!=='component-'+cIndex||mark.x!==c.offset+1450)fail('component route mark changed');
  const tails=c.relations.filter(r=>r.type==='short-relief-tail-corridor');if(tails.length!==1||tails[0].routeIntent.bridgeStartX!==c.offset+1320||tails[0].routeIntent.endX!==c.offset+1300||tails[0].bridgeSeconds!==1.6)fail('requires known tail/bridge anatomy');
  for(const route of ROUTES){const p=m.routes[route],ss=localSegments(m,route,cIndex),con=p.connectors?.[cIndex];if(!ss.length||ss.at(-1).endX!==c.offset+1560||!con||con.startX!==c.offset+1320||con.boundaryX!==c.offset+1560)fail('component route or bridge changed');if(ss.slice(0,-1).some(s=>s.endX>=con.startX))fail('unsupported route transition inside bridge');}
 }
 for(const o of m.obstacles){const i=owned(o.id),c=m.components[i];if(!c||!KINDS.has(o.mechanic_kind)||o.collider?.shape!=='rectangle'||o.trigger_id||o.effect_region!==null||o.group_id!==o.id)fail('unsupported obstacle ownership or geometry');
  if(o.timeline!==null)fail('unrecognized obstacle timeline');
  if(o.mechanic_kind==='vertical_armor_slider'){if(!o.motion||Object.keys(o.motion).some(k=>!['amplitude_px','period_s','phase_rad'].includes(k)))fail('unsupported motion schedule');}
  else if(o.motion!==null)fail('unknown body motion');
  const swing=0;
  if(o.x-swing-F.R<=c.offset+X0||o.x+o.collider.w+swing+F.R>=c.offset+1515)fail('body exceeds shortest package envelope');
  // Existing recovery rails are inside the analytic bridge. They must remain
  // entirely outside its radius-expanded safe rectangle, not merely be ignored.
  if(o.x+o.collider.w+swing>=c.offset+1320&&(!(o.mechanic_kind==='fixed_armor_or_spike')||!(o.y+o.collider.h<=140||o.y>=430)))fail('bridge is not the declared static safe rectangle');
 }
 for(const route of ROUTES){Contract.validate(m,route);const p=m.routes[route];if(p.connectors.length!==N||p.segments.some((s,i,a)=>i&&s.endX<=a[i-1].endX))fail('unordered route');for(const q of p.checkpoints){const h=/^handoff-(\d+)$/.exec(q.id),i=owned(q.id);if(h){if(+h[1]>=N-1||q.x!==Number(h[1])*STRIDE+1560)fail('handoff changed');}else if(!m.components[i]||q.x<i*STRIDE+X0||q.x>i*STRIDE+1320)fail('unknown checkpoint dependency');}}
 const pressure=m.design.pressureProgram;if(!Array.isArray(pressure?.pairRecords))fail('missing pressure provenance');for(const p of pressure.pairRecords){if(!m.components[p.componentIndex]||owned(p.pairId)!==p.componentIndex)fail('pressure ownership mismatch');}
 for(const a of m.design.adaptiveTransforms||[])if(a.schema!=='adaptive-rectangle-relations/1'||!['sustained-gates','tail-entry'].includes(a.operation?.type)||!Array.isArray(a.changes)||a.changes.some(q=>!m.components[q.componentIndex]))fail('unknown adaptive audit metadata');
 F.validate(m);return{stages,eligibility};
}
function recoveryDemand(m,i){
 const c=m.components[i],values=ROUTES.map(route=>{const ys=localSegments(m,route,i).filter(s=>s.endX<c.offset+1320).map(s=>s.targetY);let travel=0;for(let j=0;j<ys.length;j++)travel+=Math.abs(ys[j]-(j?ys[j-1]:300));return Math.min(1,travel/900);});
 return(values[0]+values[1])/2;
}
function plan(m,op,support){
 const deltas=Array(N).fill(0),decisions=[],seed=(m.seed^(op.seedSalt??0))>>>0,bias=op.recoveryBias??0;
 for(const stage of support.stages){const eligible=Array.from({length:4},(_,j)=>stage*4+j).filter(i=>i!==0&&i!==N-1&&m.components[i].theme!=='spring');if(eligible.length<2)fail('not enough safe donor/recipient components');const candidates=eligible.map(i=>({componentIndex:i,recoveryDemand:recoveryDemand(m,i),recipientRank:rank(seed,stage,i,0),donorRank:rank(seed,stage,i,1)}));
  for(const q of candidates){q.recipientScore=q.recipientRank+2*bias*q.recoveryDemand;q.donorScore=q.donorRank-2*bias*q.recoveryDemand;}
  const recipient=[...candidates].sort((a,b)=>b.recipientScore-a.recipientScore||a.componentIndex-b.componentIndex)[0].componentIndex,donor=candidates.filter(q=>q.componentIndex!==recipient).sort((a,b)=>b.donorScore-a.donorScore||a.componentIndex-b.componentIndex)[0].componentIndex;
  deltas[recipient]=op.deltaPx;deltas[donor]=-op.deltaPx;decisions.push({stage,recipient,donor,transferPx:op.deltaPx,candidates});
 }
 let offset=0;const moves=deltas.map((deltaLengthPx,i)=>{const q={componentIndex:i,stage:Math.floor(i/4),previousOffset:i*STRIDE,offset,deltaOffset:offset-i*STRIDE,previousLengthPx:STRIDE,lengthPx:STRIDE+deltaLengthPx,deltaLengthPx};q.startX=X0+offset;q.endX=q.startX+q.lengthPx;q.startTick=offset/1.25;q.endTick=(offset+q.lengthPx)/1.25;q.bridgeStartX=offset+1320;q.bridgeBoundaryX=q.endX;q.bridgeTicks=(q.bridgeBoundaryX-q.bridgeStartX)/1.25;offset+=q.lengthPx;return q;});
 if(offset!==18000||moves[0].deltaLengthPx||moves.at(-1).deltaLengthPx||moves.at(-1).deltaOffset||moves.some(q=>!Number.isInteger(q.startTick)||!Number.isInteger(q.endTick)||q.bridgeTicks<156||q.bridgeTicks>228))fail('length closure failed');
 for(let stage=0;stage<3;stage++)if(moves.slice(stage*4,stage*4+4).reduce((n,q)=>n+q.lengthPx,0)!==6000)fail('stage length closure failed');return{moves,decisions};
}
function shiftRelations(values,move){const dx=move.deltaOffset,dt=dx/VX;return values.map(value=>{const r=clone(value);
 if(r.type==='continuous-two-route-corridor')r.spine=r.spine.map(x=>x+dx);
 if(r.type==='fixed-island-between-moving-pairs')for(const q of r.receivers)q.x+=dx;
 if(r.type==='short-relief-tail-corridor'){for(const k of ['startX','endX','bridgeStartX'])r.routeIntent[k]+=dx;r.bridgeSeconds=move.bridgeTicks/120;}
 if(r.type==='contact-first-optional-branch')r.intent=shiftIntent(r.intent,dx);
 if(r.type==='adaptive-tail-entry')r.bridgeSeconds=move.bridgeTicks/120;
 return r;});}
function shiftAdaptiveMetadata(items,moves){return(items||[]).map(value=>{const r=clone(value);r.changes=r.changes.map(q=>{const move=moves[q.componentIndex],dx=move.deltaOffset,dt=dx/VX;
 if(r.operation.type==='tail-entry'){for(const k of ['previousStartX','startX','endX','recoveryStartX'])q[k]+=dx;q.recoveryBoundaryX+=dx+move.deltaLengthPx;}
 return q;});r.coordinateScope='current post-length positions; operation selection and explicitly marked historical descriptor snapshots retain provenance';return r;});}
function apply(parent,e={},op){
 const support=validateInput(parent,e,op);validateCanonical(parent,e);const planned=plan(parent,op,support),moves=planned.moves,m=clone(parent);
 m.components=parent.components.map((source,i)=>{const q=moves[i],c=clone(source);c.offset=q.offset;c.lengthPx=q.lengthPx;c.startX=q.startX;c.endX=q.endX;c.stageId=String(q.stage);c.relations=shiftRelations(c.relations,q);c.lengthRelocation={schema:VERSION,previousOffset:q.previousOffset,deltaOffset:q.deltaOffset,deltaLengthPx:q.deltaLengthPx};return c;});
 m.obstacles=parent.obstacles.map(source=>{const o=clone(source),q=moves[owned(o.id)];o.x+=q.deltaOffset;if(o.motion)o.motion=phaseShift(o.motion,q.deltaOffset);if(o.timeline)o.timeline.start_s+=q.deltaOffset/VX;return o;});
 // A physical route mark belongs to its local obstacle package. Do not pull it
 // left with a shorter bridge: it must still follow the recovery rails' exit.
 m.routeMarks=parent.routeMarks.map((r,i)=>({...clone(r),x:r.x+moves[i].deltaOffset}));
 for(const route of ROUTES){const p=m.routes[route],src=parent.routes[route];p.segments=moves.flatMap(q=>localSegments(parent,route,q.componentIndex).map((s,j,all)=>({...clone(s),endX:s.endX+q.deltaOffset+(j===all.length-1?q.deltaLengthPx:0)})));
  p.checkpoints=src.checkpoints.map(value=>{const q=clone(value),handoff=/^handoff-(\d+)$/.exec(q.id),move=moves[handoff?+handoff[1]:owned(q.id)];q.x+=move.deltaOffset+(handoff?move.deltaLengthPx:0);return q;}).sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
  p.connectors=moves.map(q=>({startX:q.bridgeStartX,boundaryX:q.bridgeBoundaryX}));if(p.contact){const dx=moves[owned(p.contact.springId)].deltaOffset;for(const k of CONTACT_X)p.contact[k]+=dx;}
  Contract.validate(m,route);if(p.segments.length!==src.segments.length||p.segments.some((s,i,a)=>i&&s.endX<=a[i-1].endX)||!same(p.exit,src.exit)||!same(p.finalDomain,src.finalDomain)||p.recoveryTicks!==src.recoveryTicks)fail('route package closure failed');
 }
 m.macroPlan=moves.map(q=>({id:'component-'+q.componentIndex,startTick:q.startTick,endTick:q.endTick}));m.design.components=m.components;
 m.design.pressureProgram.pairRecords=m.design.pressureProgram.pairRecords.map(p=>({...p,inheritedMotion:phaseShift(p.inheritedMotion,moves[p.componentIndex].deltaOffset)}));
 if(m.design.optionalSpringProgram){const p=m.design.optionalSpringProgram,q=moves[p.index];if(!q||parent.components[p.index].theme!=='spring'||q.deltaLengthPx!==0)fail('spring package was resized');p.intent=shiftIntent(p.intent,q.deltaOffset);p.lengthRelocation={deltaOffset:q.deltaOffset,localLengthUnchanged:true,inheritedComponentCoordinateScope:'pre-length generation provenance'};}
 m.design.adaptiveTransforms=shiftAdaptiveMetadata(m.design.adaptiveTransforms,moves);
 const sourceInvariants={sameLocalColliderGeometry:m.obstacles.every((o,i)=>same(o.collider,parent.obstacles[i].collider)&&o.y===parent.obstacles[i].y&&near(o.x-m.components[owned(o.id)].offset,parent.obstacles[i].x-parent.components[owned(o.id)].offset)),routeMarksRetainLocalX:m.routeMarks.every((r,i)=>r.x-m.components[i].offset===1450&&r.x<m.components[i].endX-F.R),sameInitialDomain:same(m.initial_player,parent.initial_player),sameGlobalExitDomains:ROUTES.every(r=>same(m.routes[r].exit,parent.routes[r].exit)&&same(m.routes[r].finalDomain,parent.routes[r].finalDomain)),bridgeSafePlayerCenterY:[150,420],springLocalLengthUnchanged:m.components.filter(c=>c.theme==='spring').every(c=>c.lengthPx===1500)};
 if(Object.values(sourceInvariants).some(v=>v===false))fail('source coordinate/domain invariant failed');
 m.design.lengthProgram={schema:VERSION,operation:clone(op),eligibility:support.eligibility,moves,decisions:planned.decisions,totalLengthPx:18000,totalTicks:14400,stageLengthPx:[6000,6000,6000],sourceInvariants,preserved:['initial_player','physical constants','local core and contact geometry','local periodic phase at nominal arrival','final component offset and length','exit/recovery/final-domain contracts','continuous runtime state'],varied:'Only recovery bridge duration and downstream generation coordinates; no within-core dilation',construction:'Seed/brief-ranked recipient and distinct donor per selected stage; no fixed permutation or seed-to-template table',provenanceCoordinates:['orderProgram source/move history','geometryTransforms','optionalSpringProgram inheritedComponent','adaptive horizontal previousDescriptors'],qualification:'static generation only; bridge and seam physical outcomes require new paired evidence',runtimeStateRestored:false};
 m.design.qualification='Prospective variable recovery-length grammar; no physical bridge or experiential qualification inherited';F.validate(m);return m;
}
function validateCanonical(m,e){
 const C=require('./recovery-canonical.cjs'),O=require('./recovery-order.cjs');
 let expected=C.generate(e);if(m.design.orderProgram)expected=O.transform(expected,e,{type:'relational-order'});
 if(!same(C.physicalContract(m),C.physicalContract(expected)))fail('input is not the canonical inherited/order construction');
}
module.exports={apply,validateInput,plan,VERSION};
