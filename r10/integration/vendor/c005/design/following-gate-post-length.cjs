'use strict';
// NEW static-only post-length derivative. Not original recovered bytes/qualification.
// Construction input: tool-call transcription SHA256 3a56619925066d4221b56236dee8620df9b9bb3f9f5d179d389d0ec02615274b.
// Literal static dependencies only; no evidence lookup, execution, restore, or fallback selection.
const F = require('../source/vendor/engine/core.js');
const VERSION = 'recovery-following-gate-post-length/1';
const {OBSERVATION_VERSION, reduceObservations} = require('./following-observations-v2.cjs');
const G=require('../source/recovery-generator.cjs'), C=require('../source/recovery-canonical.cjs'), U=require('../source/recovery-utils.cjs');
const HZ = 120, VX = 150, R = 10, EPS = 1e-7, ROUTES = ['main', 'branch'];
const clone = structuredClone, finite = Number.isFinite;
const near = (a,b) => finite(a) && finite(b) && Math.abs(a-b) < EPS;
const fail = s => { throw Error('Following gate: ' + s); };
function same(a,b) {
  if (Object.is(a,b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a)!==Array.isArray(b)) return false;
  const aa=Object.keys(a).sort(),bb=Object.keys(b).sort();
  return aa.length===bb.length && aa.every((k,i)=>k===bb[i] && same(a[k],b[k]));
}
function keys(o, allowed, label) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).some(k=>!allowed.includes(k))) fail('unsupported '+label+' fields');
}
function bounded(v,lo,hi,label) { if (!finite(v)||v<lo||v>hi) fail(label+' outside support'); return v; }
function uint(v,label) { if (!Number.isInteger(v)||v<0||v>0xffffffff) fail('invalid '+label); return v; }
function dependencies() {
  if (F.R!==R || F.VX!==VX || F.G!==820 || F.FLAP!==-290 || F.DT!==1/HZ || F.engineId!=='timed-course-120hz-v1') fail('physics dependency changed');
}
function controls(op) {
  keys(op,['type','speedRatio','periodSeconds','crossingPhase','placementBias','seedSalt'],'operation');
  if(op.type!=='following-gate-post-length') fail('explicit following-gate-post-length operation required');
  return {type:op.type,speedRatio:bounded(op.speedRatio,.35,.85,'speed ratio'),
    periodSeconds:bounded(op.periodSeconds,2.5,4,'period'),
    crossingPhase:bounded(op.crossingPhase??0,-Math.PI/6,Math.PI/6,'crossing phase'),
    placementBias:bounded(op.placementBias??0,-1,1,'placement bias'),seedSalt:uint(op.seedSalt??0,'seed salt')};
}
function records(map) {
  const rr=map.design?.pressureProgram?.pairRecords;
  if(!Array.isArray(rr)) fail('declared pressure pair records required');
  const seen=new Set();
  return rr.map(p=>{
    if(!p || typeof p.pairId!=='string' || seen.has(p.pairId) || !Number.isInteger(p.componentIndex) || !map.components?.[p.componentIndex]) fail('duplicate or invalid pair declaration');
    seen.add(p.pairId);
    return {...p,topId:p.topId??p.pairId+'-top',bottomId:p.bottomId??p.pairId+'-bottom',checkpointId:p.checkpointId??p.pairId};
  });
}
function objects(map) {
  if(!Array.isArray(map.obstacles)) fail('missing obstacles');
  const index=new Map(); for(const o of map.obstacles) {if(index.has(o.id)) fail('duplicate source body');index.set(o.id,o);} return index;
}
function rectangle(o,kinds) {
  if(!o || !kinds.includes(o.mechanic_kind) || o.collider?.shape!=='rectangle' || ![o.x,o.y,o.collider.w,o.collider.h].every(finite) || o.collider.w<=0 || o.collider.h<=0 || o.interaction?.lethal!==true || o.trigger_id || o.effect_region!==null || o.timeline!==null) fail('unsupported lethal rectangle');
}
function pairGeometry(p,index,kinds=['vertical_armor_slider']) {
  const top=index.get(p.topId),bottom=index.get(p.bottomId);
  rectangle(top,kinds); rectangle(bottom,kinds);
  if(top.id===bottom.id || top.mechanic_kind!==bottom.mechanic_kind || !near(top.x,bottom.x) || !near(top.collider.w,bottom.collider.w) || !same(top.motion,bottom.motion)) fail('pair synchronization mismatch');
  if(top.mechanic_kind!=='fixed_armor_or_spike') {
    keys(top.motion,['amplitude_px','period_s','phase_rad'],'motion');
    if(![top.motion.amplitude_px,top.motion.period_s,top.motion.phase_rad].every(finite) || Math.abs(top.motion.amplitude_px)>100 || top.motion.period_s<.25) fail('motion dependency changed');
  } else if(top.motion!==null) fail('static pair has motion');
  const gap=bottom.y-top.y-top.collider.h;
  if(gap<120-EPS || gap>180+EPS || !near(gap,p.physicalGapPx) || !near(gap-2*R,p.nominalRadiusExpandedCoreWidthPx)) fail('pressure gap dependency mismatch');
  return {top,bottom,gap};
}
function swept(o) {
  if(!['fixed_armor_or_spike','vertical_armor_slider','horizontal_armor_slider','spring_wall','phase_wall'].includes(o.mechanic_kind) || o.collider?.shape!=='rectangle' || ![o.x,o.collider.w].every(finite)) fail('unsupported neighboring hazard');
  const a=o.mechanic_kind==='horizontal_armor_slider'?Math.abs(o.motion?.amplitude_px):0;
  if(!finite(a)) fail('invalid neighboring motion');
  return [o.x-a,o.x+o.collider.w+a];
}
function validateMap(map,entry={}) {
  dependencies();
  if(!map || map.schema!=='timed-course-120/v1' || map.height!==540 || map.horizon!==14400 || map.durationTicks!==14400 || map.components?.length!==12 || !map.design?.withBridge || map.design.lengthProgram?.schema!=='recovery-balanced-recovery-lengths/1' || map.intervention || ['state','session','checkpoint'].some(k=>k in map)) fail('requires supported final post-length course');
  if(map.initial_player?.x!==60 || map.initial_player.vx!==VX) fail('fixed player entry dependency changed');
  uint(map.seed,'map seed');
  for(const [k,lo,hi,fallback] of [['y',245,300,270],['vy',-65,65,0],['lead',-20,20,0],['phase',-.45,.45,0]]) bounded(map.condition?.[k]??fallback,lo,hi,'entry '+k);
  if(!near(map.initial_player.y,map.condition?.y??270)||!near(map.initial_player.vy,map.condition?.vy??0)||!['none','upper-after','lower-before'].includes(map.condition?.adjacency??'none')) fail('actual entry disagrees with condition');
  if(!entry || typeof entry!=='object' || Array.isArray(entry)) fail('invalid entry');
  for(const k of ['seed','y','vy','lead','phase','adjacency']) if(entry[k]!==undefined && entry[k] !== (k==='seed'?map.seed:map.condition?.[k]??({y:270,vy:0,lead:0,phase:0,adjacency:'none'}[k]))) fail('entry differs from map');
  if(!same(Object.keys(map.routes||{}).sort(),['branch','main']) || ['triggers','encounters','coins'].some(k=>!Array.isArray(map[k])||map[k].length)) fail('unsupported route or cross-component dependency');
  for(const [i,c] of map.components.entries()) {
    if(!finite(c.offset) || !near(c.offset+60,c.startX) || !Array.isArray(c.relations)) fail('unsupported component coordinates');
    for(const r of ROUTES) {
      const p=map.routes[r],con=p.connectors?.[i];
      if(!con || ![con.startX,con.boundaryX].every(finite) || con.startX>=con.boundaryX || !Array.isArray(p.checkpoints) || !Array.isArray(p.segments) || p.segments.some((s,j,a)=>!finite(s.endX)||j&&s.endX<=a[j-1].endX)) fail('route endpoint dependency changed');
    }
  }
  objects(map); records(map); F.validate(map);
}
function localSegments(map,route,c) {
  const i=map.components.indexOf(c),end=map.routes[route].connectors[i].boundaryX;
  return map.routes[route].segments.filter(s=>s.endX>c.offset+60 && s.endX<=end);
}
// Eligibility is relational and geometric. No hardcoded component/pair IDs or success table.
function candidates(map) {
  const ix=objects(map),rr=records(map),eligible=[],excluded=[];
  for(const [i,c] of map.components.entries()) {
    if(c.theme!=='mechanical') {excluded.push({componentIndex:i,reason:'not-mechanical'});continue;}
    const types=c.relations.map(r=>r.type);
    const contact=ROUTES.some(r=>{const q=map.routes[r].contact;return q&&ix.get(q.springId)?.x>=c.offset+60&&ix.get(q.springId)?.x<map.routes[r].connectors[i].boundaryX;});
    if(types.includes('fixed-island-between-moving-pairs') || types.some(t=>/spring|contact/.test(t)) || contact || map.obstacles.some(o=>o.mechanic_kind==='spring_wall'&&o.x>=c.offset+60&&o.x<map.routes.main.connectors[i].boundaryX)) {excluded.push({componentIndex:i,reason:'mixed-receiver-or-contact'});continue;}
    const meanders=c.relations.filter(r=>r.type==='planned-centerline-meander'),sustained=c.relations.filter(r=>r.type==='sustained-moving-corridor');
    if(meanders.length>1 || sustained.length!==1) {excluded.push({componentIndex:i,reason:'missing-pure-mechanical-intent'});continue;}
    const pp=rr.filter(p=>p.componentIndex===i).map(p=>({...p,...pairGeometry(p,ix)})).sort((a,b)=>a.top.x-b.top.x);
    if(pp.length<3 || meanders.length&&meanders[0].centers?.length!==pp.length || pp.some((p,j)=>j&&p.top.x<=pp[j-1].top.x)) fail('mechanical relation and declared pair order disagree');
    if(pp.at(-1).top.collider.w!==sustained[0].lastGateMaximum || pp.at(-1).top.collider.w!==75) fail('protected final gate changed');
    for(const [member,p] of pp.slice(0,2).entries()) {
      if(![90,100,105].includes(p.top.collider.w)) fail('unsupported first/second pair width');
      if(!same(p.inheritedMotion,p.top.motion)) fail('pressure motion provenance mismatch');
      if(!near((p.top.y+p.top.collider.h+p.bottom.y)/2,meanders.length?meanders[0].centers[member]:p.inheritedCenterY)) fail('meander aperture center mismatch');
      const center=p.top.x+p.top.collider.w/2;
      for(const r of ROUTES) {const qq=map.routes[r].checkpoints.filter(q=>q.id===p.checkpointId);if(qq.length!==1||!near(qq[0].x,center)) fail('authored checkpoint center mismatch');}
      eligible.push({pairId:p.pairId,topId:p.topId,bottomId:p.bottomId,checkpointId:p.checkpointId,componentIndex:i,member,position:center});
    }
  }
  return {eligible,excluded};
}
function hash(seed,text) {let h=seed>>>0;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}h^=h>>>16;return (h>>>0)/4294967296;}
function nominal(map,target) {
  const o=objects(map).get(target.topId),a=o.motion.amplitude_px,omega=2*Math.PI/o.motion.period_s;
  const center=target.authoredCenterX,tc=(center-map.initial_player.x)/VX;
  const relative=t=>map.initial_player.x+VX*t-o.x-a*Math.sin(omega*t+o.motion.phase_rad);
  const solve=q=>{let lo=0,hi=map.horizon/HZ;if(relative(lo)>q||relative(hi)<q) fail('nominal crossing outside course');for(let n=0;n<70;n++){const mid=(lo+hi)/2;if(relative(mid)<q)lo=mid;else hi=mid;}return (lo+hi)/2;};
  const ts=[-R,0,o.collider.w,o.collider.w+R].map(solve);
  if(!near(relative(tc),o.collider.w/2)) fail('authored crossing phase compensation failed');
  return {crossingTimeSeconds:tc,entryStartSeconds:ts[0],coreStartSeconds:ts[1],coreEndSeconds:ts[2],fullBodyExitSeconds:ts[3],
    coreDurationSeconds:ts[2]-ts[1],occupancyDurationSeconds:ts[3]-ts[0],frozenCoreDurationSeconds:o.collider.w/VX,
    frozenOccupancyDurationSeconds:(o.collider.w+2*R)/VX,minimumRelativeSpeedPxS:VX-Math.abs(a*omega),
    source:'closed-form descriptor plus monotone scalar roots; NOT simulated player/body observations'};
}
function protectAndCheck(map,target) {
  const ix=objects(map),a=ix.get(target.topId),b=ix.get(target.bottomId),c=map.components[target.componentIndex],sweep=swept(a),radiusSweep=[sweep[0]-R,sweep[1]+R];
  if(!near(a.x,b.x)||!same(a.motion,b.motion)||!near(a.collider.w,b.collider.w)) fail('both converted bodies must stay synchronized');
  if(radiusSweep[0]<=c.startX+5 || ROUTES.some(r=>radiusSweep[1]>=map.routes[r].connectors[target.componentIndex].startX-15)) fail('swept gate touches component entry or bridge');
  // Conservative periodic envelopes, including off-route and protected hazards.
  for(const o of map.obstacles) if(![a.id,b.id].includes(o.id)) {const q=swept(o);if(q[0]-R<radiusSweep[1]+5&&q[1]+R>radiusSweep[0]-5) fail('swept gate overlaps neighboring hazard or spring');}
  const endpoints=[];
  for(const route of ROUTES) {
    const ss=localSegments(map,route,c),s=ss.find(s=>s.endX>=target.authoredCenterX),j=ss.indexOf(s),previous=j?ss[j-1].endX:c.startX;
    if(!s || previous>radiusSweep[0]-5) fail('route approach enters swept gate');
    if(s.endX<radiusSweep[1]+5-EPS) fail('unchanged route endpoint precedes full swept body exit');
    if(s.targetY<a.y+a.collider.h+R || s.targetY>b.y-R) fail('route target outside fixed aperture');
    endpoints.push({route,segmentEndX:s.endX,minimumFullBodyAllowancePx:s.endX-sweep[1]});
  }
  return {sweptBodyX:sweep,radiusExpandedSweepX:radiusSweep,routeEndpoints:endpoints};
}
function validateParent(parent,entry) {
  validateMap(parent,entry);
  if(parent.design.followingGateProgram) fail('following gate already applied');
  const expected=G.generate(G.CONFIG,C.entry(parent.condition));
  if(!U.equal(C.physicalContract(parent),C.physicalContract(expected)) ||
      !same(parent.design.orderProgram,expected.design.orderProgram) ||
      !same(parent.design.lengthProgram,expected.design.lengthProgram) ||
      !same(parent.design.componentTimeline,expected.design.componentTimeline) ||
      !same(parent.design.recoveryConstruction,expected.design.recoveryConstruction)) fail('not canonical recovery-cumulative-v1 post-length source');
  // Membership, map geometry and all inherited order/length decisions are checked
  // against the fixed construction. Neither old eligibility predicate is changed.
}
function applyPostLength(parent,entry={},operation) {
  const op=controls(operation); validateParent(parent,entry);
  const available=candidates(parent);if(!available.eligible.length) fail('no eligible pure first/second gate pair');
  const lo=Math.min(...available.eligible.map(p=>p.position)),hi=Math.max(...available.eligible.map(p=>p.position));
  const ranked=available.eligible.map(p=>({...p,score:hash((parent.seed^op.seedSalt)>>>0,p.pairId)+2*op.placementBias*(hi===lo?.5:(p.position-lo)/(hi-lo))})).sort((a,b)=>b.score-a.score||a.position-b.position||a.pairId.localeCompare(b.pairId));
  // Choose once. A geometric rejection is retained by caller, never rerank/retry.
  const chosen=ranked[0],m=clone(parent),ix=objects(m),a=ix.get(chosen.topId),b=ix.get(chosen.bottomId),omega=2*Math.PI/op.periodSeconds;
  const amplitude=op.speedRatio*VX/omega;
  if(amplitude>100 || amplitude<=0 || amplitude*omega>=VX) fail('amplitude or monotonicity bound exceeded');
  const center=a.x+a.collider.w/2,tc=(center-m.initial_player.x)/VX,worldPhase=op.crossingPhase-omega*tc;
  const originalRouteEnds=Object.fromEntries(ROUTES.map(r=>[r,localSegments(m,r,m.components[chosen.componentIndex]).find(s=>s.endX>=center)?.endX]));
  if(!Object.values(originalRouteEnds).every(finite)) fail('missing target route');
  const target={...chosen,authoredCenterX:center,authoredRightX:a.x+a.collider.w,originalRouteEnds,componentOffset:m.components[chosen.componentIndex].offset,
    previousDescriptors:[clone(a),clone(b)],amplitudePx:amplitude,worldPhase,crossingTimeSeconds:tc};
  for(const o of [a,b]) {o.x-=amplitude*Math.sin(op.crossingPhase);o.mechanic_kind='horizontal_armor_slider';o.motion={amplitude_px:amplitude,period_s:op.periodSeconds,phase_rad:worldPhase};}
  const geometry=protectAndCheck(m,target),theory=nominal(m,target);
  if(theory.coreDurationSeconds<=theory.frozenCoreDurationSeconds || theory.occupancyDurationSeconds<=theory.frozenOccupancyDurationSeconds) fail('nominal following intent not realized');
  // New post-length relation. Never sent back through the inherited order/length operators.
  m.components[chosen.componentIndex].relations.push({type:'recovery-following-horizontal-pair',target:'press-pair',member:chosen.member,
    sourceIds:[a.id,b.id],amplitudePx:amplitude,periodSeconds:op.periodSeconds,
    componentRelativePhase:worldPhase+omega*m.components[chosen.componentIndex].offset/VX,
    worldPhase,replacesVerticalMotion:true,runtimeClockReset:false});
  m.design.followingGateProgram={schema:VERSION,operation:op,target:{...target,...geometry,nominal:theory},
    selection:{eligible:available.eligible,excluded:available.excluded,ranked},coordinateEpoch:'final-post-length', sourceVersion:'recovery-cumulative-v1', routesChanged:false, orderAndLengthDecisionsPreserved:true,
    descriptorWidthChanged:false,verticalMotionReplaced:true,activation:'explicit candidate only',qualification:'static-only; physical, input-demand, readability and fun unknown'};
  m.design.legacyPressureApplicability='Horizontal pair requires actual synchronized body reducer; static-x pressure rows remain unsupported';
  m.design.components=m.components;
  m.design.qualification='Exploratory post-length horizontal pair; static geometry only, no inherited physical qualification';
  validateMap(m,entry);
  return m;
}
// Deliberately no finalize, generate, default recipe, or harness dispatch entry.
module.exports={VERSION,OBSERVATION_VERSION,applyPostLength,candidates,reduceObservations};
