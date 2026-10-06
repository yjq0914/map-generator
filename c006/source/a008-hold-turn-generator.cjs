'use strict';
// SOURCE ONLY. Descriptor arithmetic and schema validation; no physics or retrieval.
const G=require('./recovery-generator.cjs');
const C=require('./recovery-canonical.cjs');
const U=require('./recovery-utils.cjs');
const F=require('./vendor/engine/core.js');
const Contract=require('./vendor/contract.cjs');
const VERSION='a008-interface-hold-turn/1';
const Accepted=require('./a007-style-registry-v2.cjs'),CONFIG=require('./configs/a008-hold-turn-v1.json');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x;}deepFreeze(CONFIG);
const DEFAULT=Object.freeze({type:'same-side-hold-then-turn',placement:'latest'});
const ROUTES=['main','branch'];
const TYPES=['action-conditioned-spacing','short-relief-tail-corridor','whole-body-exit-route-domain'].sort();
const fail=s=>{throw Error('Hold/turn draft: '+s);};
const need=(v,s)=>{if(!v)fail(s);};
function controls(op){
 need(op&&typeof op==='object'&&!Array.isArray(op)&&U.equal(Object.keys(op).sort(),Object.keys(DEFAULT).sort()),'unexpected controls');
 need(op.type===DEFAULT.type&&['earliest','latest'].includes(op.placement),'unsupported experience/placement');
}
function side(q,o){return q.maxY<o.y?'upper':q.minY>o.y+o.collider.h?'lower':null;}
function supportedCandidates(m){
 const out=[];
 for(const [i,c] of m.components.entries()){
  // Ownership identifiers address packages; neither original source index nor seed chooses eligibility.
  if(c.theme!=='wave'||c.startX===m.initial_player.x||c.endX===m.initial_player.x+m.horizon*F.VX*F.DT)continue;
  if(!U.equal(c.relations.map(r=>r.type).sort(),TYPES))continue;
  const guard=c.relations.find(r=>r.type==='whole-body-exit-route-domain');
  const tail=c.relations.find(r=>r.type==='short-relief-tail-corridor');
  if(guard.radiusPx!==F.R||guard.oneControllerEpochPixels!==15||!guard.freeTransitionBetweenBodies)continue;
  const bodies=m.obstacles.filter(o=>U.ownedIndex(o.id)===i&&o.collider?.shape==='rectangle'&&o.collider.h===36).sort((a,b)=>a.x-b.x);
  if(bodies.length!==3||bodies.some(o=>o.mechanic_kind!=='fixed_armor_or_spike'||o.collider.w!==55||o.motion!==null||o.timeline!==null||o.effect_region!==null||o.trigger_id))continue;
  const parts={};let valid=true;
  for(const route of ROUTES){
   const p=m.routes[route],ss=p.segments.filter(s=>s.endX>c.startX&&s.endX<=c.endX),connector=p.connectors[i];
   if(ss.length!==7||!connector||connector.startX!==tail.routeIntent.bridgeStartX||connector.boundaryX!==c.endX||ss[6].targetY!==tail.routeIntent.targetY){valid=false;break;}
   const triples=bodies.map((o,j)=>{
    const approach=ss[j*2],passage=ss[j*2+1],checkpoints=p.checkpoints.filter(q=>q.x>=o.x&&q.x<=o.x+o.collider.w&&U.equal(q.y,[passage.minY,passage.maxY]));
    return {approach,passage,checkpoint:checkpoints.length===1?checkpoints[0]:null,side:side(passage,o)};
   });
   if(triples.some((q,j)=>!q.checkpoint||!q.side||!U.near(q.approach.endX,bodies[j].x-F.R)||!U.near(q.passage.endX,bodies[j].x+bodies[j].collider.w+F.R+15)||q.approach.targetY!==q.passage.targetY||q.approach.minY!==30||q.approach.maxY!==510||q.passage.targetY<q.passage.minY||q.passage.targetY>q.passage.maxY)) {valid=false;break;}
   if(triples[0].side===triples[1].side||triples[1].side===triples[2].side||triples[0].side!==triples[2].side){valid=false;break;}
   parts[route]=triples;
  }
  if(!valid||parts.main.some((q,j)=>q.side===parts.branch[j].side))continue;
  // New widths are the accepted r004 primitive, checked against actual neighbours and tail.
  if(bodies.some((o,j)=>o.x+(j<2?110:45)+F.R+15>=(j<2?bodies[j+1].x-F.R:tail.routeIntent.startX-F.R)))continue;
  out.push({componentIndex:i,bodies,parts,entrySide:parts.main[0].side});
 }
 return out.sort((a,b)=>a.bodies[0].x-b.bodies[0].x);
}
function apply(parent,op=DEFAULT){
 controls(op);
 need(F.R===10&&F.VX===150&&F.DT===1/120&&F.G===820&&F.FLAP===-290,'physics dependency changed');
 const expected=generateParent(parent.condition||{});
 need(U.equal(parent,expected,0),'requires actual accepted a007 vertical-default output; explicit old styles and repeated/composed phrases are rejected');
 const candidates=supportedCandidates(parent);need(candidates.length,'no eligible ordinary guarded wave phrase');
 const chosen=op.placement==='earliest'?candidates[0]:candidates.at(-1),i=chosen.componentIndex,m=U.clone(parent),c=m.components[i];
 // Reuse the geometry recipe actually read in relations-r012 holdTurn, but adapt
 // the post-whole-body/post-order/post-length interfaces instead of calling its fixed index loop.
 const centers=[245,255,270],widths=[110,110,45],oldSides={},newSides={},changes=[];
 const bodies=chosen.bodies.map((b,j)=>{const o=m.obstacles.find(o=>o.id===b.id);o.y=centers[j]-o.collider.h/2;o.collider.w=widths[j];changes.push({id:o.id,oldY:b.y,newY:o.y,oldWidth:b.collider.w,newWidth:o.collider.w});return o;});
 for(const route of ROUTES){
  const first=chosen.parts[route][0].side,sides=[first,first,first==='upper'?'lower':'upper'];
  oldSides[route]=chosen.parts[route].map(q=>q.side);newSides[route]=sides;
  const p=m.routes[route];
  for(const [j,q] of chosen.parts[route].entries()){
   const o=bodies[j],upper=sides[j]==='upper',target=centers[j]+(upper?-95:110),band=upper?[30,o.y-F.R-4]:[o.y+o.collider.h+F.R+4,510];
   const approach=p.segments.find(s=>s.endX===q.approach.endX),passage=p.segments.find(s=>s.endX===q.passage.endX),checkpoint=p.checkpoints.find(t=>t.id===q.checkpoint.id);
   approach.targetY=target;passage.targetY=target;passage.endX=o.x+o.collider.w+F.R+15;passage.minY=band[0];passage.maxY=band[1];
   checkpoint.x=o.x+o.collider.w/2;checkpoint.y=band;
  }
  // The gap between the first two bodies inherits a common side band. No claim
  // that empty space physically forces it; it is the authored sustained route intent.
  const firstBand=p.segments.find(s=>s.endX===bodies[0].x+widths[0]+F.R+15),secondBand=p.segments.find(s=>s.endX===bodies[1].x+widths[1]+F.R+15);
  const hold=p.segments.find(s=>s.endX===chosen.parts[route][1].approach.endX);
  hold.minY=Math.max(firstBand.minY,secondBand.minY);hold.maxY=Math.min(firstBand.maxY,secondBand.maxY);
  need(hold.targetY>=hold.minY&&hold.targetY<=hold.maxY,'sustained target outside common band');
  need(p.segments.every((s,j,a)=>s.targetY>=s.minY&&s.targetY<=s.maxY&&(!j||s.endX>a[j-1].endX)),'invalid route ordering/target');
 }
 const holdSpan=[bodies[0].x-F.R,bodies[1].x+widths[1]+F.R+15],turnSpan=[holdSpan[1],bodies[2].x-F.R];
 const relation={type:'same-side-hold-then-turn',schema:VERSION,mainSides:newSides.main,branchSides:newSides.branch,islandWidth:110,lastIslandWidth:45,
  bodyIds:bodies.map(o=>o.id),selection:'ordinary relation/interface eligibility, actual entry side, requested placement',holdSpanX:holdSpan,turnTransitionSpanX:turnSpan,
  routeIntent:'same side across two widened bodies and their connecting gap, then one side switch before third body; normal tail recovery follows',
  supersedes:[{relation:'action-conditioned-spacing',scope:'island x and geometric intervals retained; old alternating-action rationale is provenance only'},
   {relation:'whole-body-exit-route-domain',scope:'all three physical exits retained and rebased to new widths; only first-to-second free transition replaced by common hold-side band'}],
  physicallyForcedContinuousHold:false,actualMotionReversalCount:null,qualification:'source-only, unqualified in every selected context and orientation'};
 c.relations.push(relation);m.design.components=m.components;
 m.design.phraseProgram={schema:VERSION,operation:U.clone(op),componentIndex:i,eligibleComponents:candidates.map(q=>q.componentIndex),entrySide:chosen.entrySide,oldSides,newSides,changes,
  predicted:{holdSpanX:holdSpan,holdSeconds:(holdSpan[1]-holdSpan[0])/F.VX,turnTransitionSpanX:turnSpan,transitionSeconds:(turnSpan[1]-turnSpan[0])/F.VX,units:'fixed-vx route forecast, not observed motion'},
  preserved:['other component packages','all island x coordinates','component order/lengths and global clock','tail and complete recovery bridges','spring/contact/events','initial state, route exits and final domains','physics and runtime'],
  evidence:{physicalExecutions:0,physicalTicks:0,actualHoldSeconds:null,actualTurn:null,readability:null,humanFun:null,qualification:'unqualified'}};
 m.id=m.mapId=VERSION+'-'+m.seed+'-'+op.placement;m.design.generatorVersion=VERSION;
 m.design.qualification='Unqualified semantic phrase draft; changing upstream routes invalidates downstream entry and full-course qualification';
 for(const route of ROUTES)Contract.validate(m,route);U.assertFiniteTree(m);F.validate(m);return m;
}
function generateParent(input={}){return Accepted.generate(Accepted.CONFIG,C.entry(input));}
function generate(config,input={}){need(require('node:util').isDeepStrictEqual(config,CONFIG),'config changed');return apply(generateParent(input),CONFIG.operation);}
module.exports={VERSION,CONFIG,DEFAULT,generateParent,generate,apply,supportedCandidates};
