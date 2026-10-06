'use strict';
// Route-informed analytical MPC. Never calls engine step; predicted nodes are not physical ticks.
// Full planned route and known static/periodic rectangle geometry are permitted for this task executor.
const F=require('./engine/core');
const CFG={version:'route-mpc/3-delay-aware',epoch:12,depth:12,beam:18,sampleTicks:3,minFlapTicks:12,slowDelay:6};
function target(plan,x){const q=plan.segments.find(q=>x<=q.endX)||plan.segments.at(-1);return q;}
function create(map,route,slow=false){const plan=map.routes[route];if(!plan)throw Error('Missing assigned route '+route);let next=0,pending=[],last=-1e4,expanded=0,committed=false,setupTick=null;
 const act=obs=>{const t=obs.tick,actual=obs.player,lag=slow?6:0,p=lag?{...actual,x:actual.x+lag*1.25,y:actual.y+actual.vy*lag/120+820*(lag*lag/2+lag/4)/14400,vy:actual.vy+820*lag/120}:actual;let due=pending.includes(t);pending=pending.filter(v=>v>t);if(due)last=t;
 if(plan.contact && p.x>=plan.contact.startX && p.x<=plan.contact.receiverExitX){
 if(committed)return due;
 const landing=p.x+150*(290+Math.sqrt(Math.max(0,290*290+2*820*(plan.contact.surfaceY-10-p.y))))/820;
 if(landing>=plan.contact.landingTargetX){committed=true;setupTick=t+(slow?CFG.slowDelay:0);if(slow){pending.push(setupTick);return due;}last=t;return true;}
 }
 if(t<next)return due;next=t+CFG.epoch;
 let beam=[{y:p.y,vy:p.vy,cost:0,first:false,last,contacts:0}], bodies=[];
 for(let k=0;k<CFG.depth*CFG.epoch/CFG.sampleTicks;k++){const tt=t+(k+1)*CFG.sampleTicks;bodies.push(F.obstacles(map,tt+lag).filter(o=>o.x+o.w>=p.x-15&&o.x<=p.x+190&&o.kind!=='spring_wall'&&o.lethal));}
 for(let d=0;d<CFG.depth;d++){
  let cand=[];for(const n of beam)for(const a of [false,true]){if(a&&t+d*CFG.epoch-n.last<CFG.minFlapTicks)continue;
   let q={...n,vy:a?-290:n.vy,first:d?n.first:a,last:a?t+d*CFG.epoch:n.last,cost:n.cost+(a?1:0)};expanded++;
   for(let j=1;j<=CFG.epoch/CFG.sampleTicks;j++){
    const dt=CFG.sampleTicks/120,old=q.y,tt=t+d*CFG.epoch+j*CFG.sampleTicks,x=p.x+(tt-t)*1.25;
    q.vy+=820*dt;q.y+=q.vy*dt;const tar=target(plan,x);
    for(const o of map.obstacles)if(o.mechanic_kind==='spring_wall'&&x>=o.x-10&&x<=o.x+o.collider.w+10&&old<=o.y-10&&q.y>=o.y-10&&q.vy>0){q.y=o.y-10-.01;if(map.intervention?.mode!=='disable-bounce'){q.vy=-o.interaction.bounce_speed_px_s;q.contacts++;}}
    const outside=Math.max(0,tar.minY-q.y,q.y-tar.maxY);q.cost+=outside*outside*25+(q.y-tar.targetY)**2*.006;
    if(q.y<12||q.y>528)q.cost+=1e7;
    for(const o of bodies[d*CFG.epoch/CFG.sampleTicks+j-1])if(x>=o.x-14&&x<=o.x+o.w+14&&q.y>=o.y-14&&q.y<=o.y+o.h+14)q.cost+=1e7;
    if(tar.release&&a)q.cost+=5e5;
   }cand.push(q);
  }
  cand.sort((a,b)=>a.cost-b.cost);const cells=new Set();beam=[];for(const n of cand){const key=Math.round(n.y/3)+':'+Math.round(n.vy/12)+':'+n.first;if(!cells.has(key)){cells.add(key);beam.push(n);if(beam.length>=CFG.beam)break;}}
 }
 const chosen=beam[0]?.first||false;if(slow&&chosen){pending.push(t+CFG.slowDelay);return due;}if(chosen)last=t;return chosen||due;
 };act.stats=()=>({analyticalNodes:expanded,version:CFG.version,route,observation:'assigned route plus known rectangle schedule',delayTicks:slow?CFG.slowDelay:0,committed,setupTick,delayPredictionCompensated:true});return act;}
module.exports={CFG,target,create};
