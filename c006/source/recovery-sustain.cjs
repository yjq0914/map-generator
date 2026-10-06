'use strict';
// Reconstructed a001 recipe, derived from persisted decisions and compact Site
// geometry. This is new code and does not claim the lost a001 module's identity.
const F=require('./vendor/engine/core.js');
const {clone,equal,near,assert,keys}=require('./recovery-utils.cjs');
const DECLARED_COMPONENTS=Object.freeze([1,3,4,7,9]);
const OP=Object.freeze({type:'recovery-sustained-mechanical',indices:[1,3,4,7,9],widthPx:100,tailStartX:1230});
function transform(parent,op=OP){
 keys(op,['type','indices','widthPx','tailStartX'],'sustain recipe');
 assert(equal(op,OP),'sustain recipe outside inherited declared domain');
 assert(parent.components?.length===12,'sustain requires complete twelve-component recipe');
 const m=clone(parent);
 for(const i of DECLARED_COMPONENTS){
  const c=m.components[i];assert(c.theme==='mechanical','declared sustain component is not mechanical');
  assert(!c.relations?.some(r=>r.type==='adaptive-sustained-gates'||r.type==='adaptive-tail-entry'),'sustain already applied');
  for(let j=0;j<3;j++){
   const top=m.obstacles.find(o=>o.id===`c${i}-press-${j}-top`),bottom=m.obstacles.find(o=>o.id===`c${i}-press-${j}-bottom`);
   assert(top&&bottom&&top.mechanic_kind==='vertical_armor_slider'&&bottom.mechanic_kind===top.mechanic_kind,'missing paired moving gate');
   assert(top.x===bottom.x&&equal(top.motion,bottom.motion)&&top.collider.w===bottom.collider.w,'asymmetric moving pair');
   const before=top.collider.w,width=j<2?100:75;
   assert(before===(j<2?90:75),'inherited gate width changed');
   for(const route of ['main','branch']){
    const p=m.routes[route],q=p.checkpoints.find(q=>q.id===`c${i}-press-${j}`);assert(q,'missing gate checkpoint');q.x=top.x+width/2;
    for(const s of p.segments)if(near(s.endX,top.x+before+10)||near(s.endX,top.x+before+25))s.endX+=width-before;
   }
   top.collider.w=bottom.collider.w=width;
  }
  const tail=c.relations.find(r=>r.type==='short-relief-tail-corridor');
  assert(tail&&near(tail.routeIntent.startX,c.offset+1260)&&near(tail.routeIntent.endX,c.offset+1300),'missing inherited tail interface');
  for(const side of ['top','bottom']){const o=m.obstacles.find(o=>o.id===`c${i}-tail-${side}`);assert(o&&near(o.x,c.offset+1260)&&o.collider.w===40,'tail body mismatch');o.x=c.offset+1230;o.collider.w=70;}
  tail.routeIntent.startX=c.offset+1230;
  c.relations.push({type:'adaptive-sustained-gates',widthPx:100,lastGateWidthPx:75,wholeBodyExitRetained:true},{type:'adaptive-tail-entry',localStartX:1230,physicalGapPx:240,bridgeSeconds:1.6,postTailClearancePx:20,continuousPhysicalState:true});
 }
 m.design.components=m.components;
 m.design.recoverySustain={algorithm:'recovery-sustained-mechanical/1',recipe:clone(OP),sourceScope:'reconstructed from declared a001 capability and compact geometry; no original source equivalence claim'};
 F.validate(m);return m;
}
module.exports={transform,DECLARED_COMPONENTS,OP};
