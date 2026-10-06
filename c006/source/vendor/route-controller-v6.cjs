'use strict';
const Base=require('./route-controller-v5.cjs');
function bridge(p,ticks,delay){let beam=[{y:p.y,vy:p.vy,cost:0,last:-1000,actions:[]}],elapsed=0,nodes=0;const finalFlap=ticks-42;
 while(elapsed<ticks){const dt=Math.min(6,ticks-elapsed,elapsed<finalFlap?finalFlap-elapsed:6);let out=[];
  for(const q of beam)for(const a of elapsed===finalFlap?[true]:elapsed>finalFlap||elapsed<delay?[false]:[false,true]){if(a&&elapsed-q.last<12)continue;nodes++;const vy0=a?-290:q.vy,vy=vy0+820*dt/120,y=q.y+vy0*dt/120+820*(dt*dt/2+dt/4)/(120*120),outside=Math.max(0,150-y,y-420),target=elapsed+dt>=finalFlap?270:322;out.push({y,vy,cost:q.cost+outside*outside*1000+(y-target)**2*.0002+(a?.05:0),last:a?elapsed:q.last,actions:a?[...q.actions,elapsed]:q.actions});}
  out.sort((a,b)=>a.cost-b.cost);beam=[];const seen=new Set();for(const q of out){const k=Math.round(q.y/2)+':'+Math.round(q.vy/10);if(!seen.has(k)){seen.add(k);beam.push(q);if(beam.length>=72)break;}}elapsed+=dt;
 }
 beam.sort((a,b)=>(a.cost+(a.y-270)**2*20)-(b.cost+(b.y-270)**2*20));return{...beam[0],nodes};}
function create(map,route,slow=false){const base=Base.create(map,route,slow),cs=map.routes[route].connectors||[],done=new Set(),events=[];let active=null,nodes=0;
 const act=obs=>{if(active&&obs.player.x>=active.c.boundaryX){events.push({type:'connector-entry',tick:obs.tick,x:obs.player.x,y:obs.player.y,vy:obs.player.vy});active=null;}
  if(!active){const i=cs.findIndex((c,i)=>!done.has(i)&&obs.player.x>=c.startX&&obs.player.x<c.boundaryX);if(i>=0){const c=cs[i],n=Math.round((c.boundaryX-obs.player.x)/1.25),plan=bridge(obs.player,n,slow?6:0);done.add(i);nodes+=plan.nodes;active={c,startTick:obs.tick,plan};events.push({type:'connector-plan',tick:obs.tick,predictedY:plan.y,predictedVy:plan.vy,actualInputOffsets:plan.actions,commandOffsets:plan.actions.map(t=>t-(slow?6:0))});}}
  if(active)return active.plan.actions.includes(obs.tick-active.startTick);return base(obs);
 };act.stats=()=>({...base.stats(),version:'route-mpc/3+analytic-bridge/2',connectorAnalyticalNodes:nodes,connectorEvents:events,connectorProtocol:'bounded analytical free-flight bridge in declared static safe rectangle; actual physics replay validates; no reset/teleport'});return act;}
module.exports={create,CFG:{...Base.CFG,version:'route-mpc/3+analytic-bridge/2'}};
