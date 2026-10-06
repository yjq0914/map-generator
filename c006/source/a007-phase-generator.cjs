'use strict';
// Source-only, unqualified. Generation uses descriptor arithmetic, never runtime geometry.
const G = require('./recovery-generator.cjs');
const Accepted = require('./a006-style-registry.cjs');
const CONFIG = require('./configs/a007-phase-v1.json');
const same=require('node:util').isDeepStrictEqual;
const C = require('./recovery-canonical.cjs');
const U = require('./recovery-utils.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const VERSION = 'a007-phase-through-or-bypass/1';
const DEFAULT = Object.freeze({type:'phase-through-or-bypass', placement:'earliest', marginTicks:42, cueLeadTicks:42});
const ROUTES = ['main','branch'];
const fail = s => { throw Error('Phase window draft: '+s); };
const requireThat = (v,s) => { if(!v) fail(s); };
function controls(op) {
 requireThat(U.equal(Object.keys(op||{}).sort(),Object.keys(DEFAULT).sort()),'unexpected control fields');
 requireThat(op.type===DEFAULT.type&&['earliest','latest'].includes(op.placement),'unsupported operation');
 requireThat(Number.isInteger(op.marginTicks)&&op.marginTicks>=42&&op.marginTicks<=60,'margin outside authored 42..60 tick draft domain');
 requireThat(Number.isInteger(op.cueLeadTicks)&&op.cueLeadTicks>=42&&op.cueLeadTicks<=120,'cue lead outside authored 42..120 tick draft domain');
}
function supportedCandidates(m) {
 const out=[];
 for(const [i,c] of m.components.entries()) {
  const types=c.relations.map(r=>r.type);
  // No hardcoded component index, source ID, seed exception, or result-dependent selection.
  if(c.theme!=='wave'||c.startX===m.initial_player.x||c.endX===m.initial_player.x+m.horizon*F.VX*F.DT) continue;
  if(!U.equal([...types].sort(),['action-conditioned-spacing','short-relief-tail-corridor','whole-body-exit-route-domain'].sort())) continue;
  const own=m.obstacles.filter(o=>U.ownedIndex(o.id)===i);
  const islands=own.filter(o=>o.id.startsWith('c'+i+'-wave-island-')).sort((a,b)=>a.x-b.x);
  if(islands.length!==3||islands.some(o=>o.mechanic_kind!=='fixed_armor_or_spike'||o.collider.shape!=='rectangle'||o.collider.w!==55||o.collider.h!==36||o.motion!==null||o.timeline!==null||o.trigger_id)) continue;
  const wall=islands[1], previous=islands[0], next=islands[2];
  const routeParts={}; let compatible=true;
  for(const route of ROUTES) {
   const p=m.routes[route], segments=p.segments.filter(s=>s.endX>c.startX&&s.endX<=c.endX);
   const approach=segments.find(s=>U.near(s.endX,wall.x-F.R));
   const passage=segments.find(s=>U.near(s.endX,wall.x+wall.collider.w+F.R+15));
   const prior=segments.find(s=>U.near(s.endX,previous.x+previous.collider.w+F.R+15));
   const checkpoint=p.checkpoints.find(q=>q.id===wall.id.replace('-island-','-'));
   if(segments.length!==7||!approach||!passage||!prior||!checkpoint||!(prior.endX<approach.endX&&passage.endX<next.x-F.R)) {compatible=false;break;}
   routeParts[route]={approach,passage,prior,checkpoint};
  }
  if(!compatible) continue;
  out.push({componentIndex:i,wall,routeParts});
 }
 return out.sort((a,b)=>a.wall.x-b.wall.x);
}
function apply(parent,op=DEFAULT) {
 controls(op);
 requireThat(F.R===10&&F.VX===150&&F.DT===1/120&&F.G===820&&F.FLAP===-290,'physics dependency changed');
 const entry=C.entry(parent.condition||{}), expected=Accepted.generate(Accepted.CONFIG,entry);
 requireThat(U.equal(parent,expected,0),'requires exact canonical accepted recovery generation; rebase/integration must be separately versioned');
 const candidates=supportedCandidates(parent);
 requireThat(candidates.length>0,'no compatible ordinary wave phrase');
 const chosen=op.placement==='earliest'?candidates[0]:candidates.at(-1);
 const m=U.clone(parent), {componentIndex:i}=chosen;
 const wall=m.obstacles.find(o=>o.id===chosen.wall.id), c=m.components[i];
 const tickAtX=x=>(x-m.initial_player.x)/(F.VX*F.DT);
 // Tick-grid containment rounds OUTWARD. Floating arrival is not rounded into a pass.
 const enterTick=tickAtX(wall.x-F.R), exitTick=tickAtX(wall.x+wall.collider.w+F.R);
 const approachStartTick=tickAtX(chosen.routeParts.main.prior.endX);
 const absentStartTick=Math.floor(enterTick)-op.marginTicks;
 const absentEndTick=Math.ceil(exitTick)+op.marginTicks;
 const cueStartTick=Math.floor(approachStartTick)-op.cueLeadTicks;
 const warningTicks=absentStartTick-cueStartTick, solidTicks=60, reappearWarningTicks=96;
 requireThat(cueStartTick>=solidTicks&&warningTicks>=78&&warningTicks<=720,'unsupported cue/approach separation');
 const timeline={start_s:(cueStartTick-solidTicks)*F.DT,solid_s:solidTicks*F.DT,warning_s:warningTicks*F.DT,absent_s:(absentEndTick-absentStartTick)*F.DT,reappear_warning_s:reappearWarningTicks*F.DT};
 wall.mechanic_kind='phase_wall';wall.timeline=timeline;
 // Replace BOTH the narrow route segment and its checkpoint. The bypass stays byte-identical.
 const throughBand=[wall.y,wall.y+wall.collider.h], targetY=(throughBand[0]+throughBand[1])/2;
 const main=m.routes.main;
 const approach=main.segments.find(s=>U.near(s.endX,chosen.routeParts.main.approach.endX));
 const passage=main.segments.find(s=>U.near(s.endX,chosen.routeParts.main.passage.endX));
 approach.targetY=targetY;
 passage.targetY=targetY;passage.minY=targetY-48;passage.maxY=targetY+48;
 const checkpoint=main.checkpoints.find(q=>q.id===chosen.routeParts.main.checkpoint.id);
 checkpoint.y=[throughBand[0]-F.R,throughBand[1]+F.R];
 const relation={type:'phase-through-or-bypass',wallId:wall.id,throughRoute:'main',bypassRoute:'branch',throughBandY:throughBand,routeGuardBandY:[targetY-48,targetY+48],checkpointBandY:checkpoint.y.slice(),throughEvidence:'Actual body/player intersection independently required; broad guard does not imply passage',
  approachStartX:chosen.routeParts.main.prior.endX,wholeBodySpanX:[wall.x-F.R,wall.x+wall.collider.w+F.R],routeGuardEndX:passage.endX,
  supersedes:[{relation:'whole-body-exit-route-domain',scope:'main route at this wall only; through-band replaces inherited side-band'},
   {relation:'action-conditioned-spacing',scope:'spacing geometry retained; old action rationale is provenance, not revalidated intent on main at this wall'}],
  qualification:'source-only; no passage, recovery, cue visibility, reactive control or experience evidence'};
 c.relations.push(relation);m.design.components=m.components;
 m.design.phaseWindowProgram={schema:VERSION,operation:U.clone(op),componentIndex:i,wallId:wall.id,
  selection:'semantic ordinary-wave eligibility and requested earliest/latest compatible placement',eligibleComponents:candidates.map(q=>q.componentIndex),
  clocks:{units:'120Hz ticks; generated fixed-vx forecast, not observed execution',enterTick,exitTick,approachStartTick,cueStartTick,absentStartTick,absentEndTick,
   preMarginTicks:enterTick-absentStartTick,postMarginTicks:absentEndTick-exitTick,cueBeforeAuthoredApproachTicks:approachStartTick-cueStartTick},
  timelineSemantics:{disappearWarningLethal:true,reappearWarningLethal:false,overlapCanBlockReappearance:true,
   countedSafeInterval:'strict absence only; neither reappear warning nor overlap-blocked reappearance counts as safety slack'},
  controllerClaim:'Existing assigned-route MPC knows the full timeline. A successful future witness cannot demonstrate cue-reactive play.',
  cueEvidence:{scheduleAuthored:true,screenVisible:null,reactionFeasible:null,playerReadable:null},
  preserved:['all collider geometry','branch full route','spring/contact/event contracts','other route segments and checkpoints','component ordering/lengths/timeline','all bridges, final domains, physics and continuous runtime'],
  evidence:{physicalExecutions:0,qualification:'unqualified',knownStrategyPassage:null,finiteInformationPassage:null,humanFun:null}};
 m.id=m.mapId=VERSION+'-'+m.seed+'-'+op.placement;
 m.design.generatorVersion=VERSION;m.design.qualification='Unqualified phase passage draft; inherited geometry does not transfer full-course qualification';
 for(const route of ROUTES) Contract.validate(m,route);
 U.assertFiniteTree(m);F.validate(m);return m;
}
function generateParent(input={}){return Accepted.generate(Accepted.CONFIG,C.entry(input));}
function generate(config,input={}){if(!same(config,CONFIG))fail('changed config');return apply(generateParent(input),DEFAULT);}
module.exports={VERSION,CONFIG,DEFAULT,generate,generateParent,apply,supportedCandidates};
