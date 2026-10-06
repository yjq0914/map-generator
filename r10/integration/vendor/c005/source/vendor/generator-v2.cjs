'use strict';
// Generates solely from requested theme/parameters/entry and adopted rules; never reads run labels or seed scores.
const M=require('./maps.cjs'),F=require('./engine/core');
function combo(theme,v=1,e={},options={}){const m=M.base(`${theme}-v${v}-${e.id||'input'}`,e,1200),q=e.lead||0,at=x=>x+q;const exit={x:at(1320),y:[160,410],vy:[-310,300]};
 const route=(segments,checkpoints,events=[])=>({segments,checkpoints,events,exit,recoveryTicks:120});
 if(theme==='spring'){
  const right=v===0?710:v===1?740:770,top=v===2?425:415;
  m.obstacles=[M.rect('divider',at(390),270,80,40),M.spring('spring',at(500),475,right-500),M.rect('receiver',at(right+35),top,30,540-top),M.rect('merge-top',at(1020),-120,35,300),M.rect('merge-bottom',at(1020),420,35,120)];
  m.routes.main=route([M.seg(at(800),225),M.seg(2000,300)],[{id:'upper-side',x:at(430),y:[30,245],vy:[-310,300]},{id:'merge',x:at(1065),y:[190,410],vy:[-310,300]}],['no-bounce']);
  m.routes.branch=route([M.seg(at(200),310),M.seg(at(495),425,340,500),M.seg(at(right+35),450,340,510),M.seg(2000,300)],[{id:'under-island',x:at(430),y:[325,510],vy:[-310,350]},{id:'merge',x:at(1065),y:[190,410],vy:[-310,300]}],['bounce']);
  m.routes.branch.contact={startX:at(495),landingTargetX:at(right-25),surfaceY:475,springId:'spring',minContactX:at(right-65),maxContactX:at(right),receiverEntryX:at(right+25),receiverExitX:at(right+75)};
 }else if(theme==='wave'){
  const centers=v===0?[270,270,270]:v===1?[235,310,240]:[250,290,250],xs=[310,650,990],sg={main:[],branch:[]},cp={main:[],branch:[]};
  for(let i=0;i<3;i++){const x=at(xs[i]),cy=centers[i],h=36;m.obstacles.push(M.rect('wave-island-'+i,x,cy-18,v===2?30:45,h));for(const r of ['main','branch']){const upper=(i+(r==='branch'?1:0))%2===0,y=upper?cy-95:cy+110;sg[r].push(M.seg(x+65,y,30,510));cp[r].push({id:'wave-'+i,x:x+22,y:upper?[30,cy-32]:[cy+32,510],vy:[-310,360]});}}
  for(const r of ['main','branch']){sg[r].push(M.seg(2000,300));m.routes[r]=route(sg[r],cp[r]);}
 }else if(theme==='mechanical'){
  const amp=v===0?0:v===1?20:18,clear=v===0?185:v===1?155:165;
  for(let i=0;i<3;i++){const x=at(320+i*340),phase=(e.phase||0)+i*.7;for(const [side,y,h]of [['top',-120,270-clear/2+120],['bottom',270+clear/2,540-(270+clear/2)]]){const o=M.rect('press-'+i+'-'+side,x,y,40,h);if(amp){o.mechanic_kind='vertical_armor_slider';o.motion={amplitude_px:amp,period_s:3.2+i*.2,phase_rad:phase};}m.obstacles.push(o);}}
  for(const r of ['main','branch'])m.routes[r]=route([M.seg(2000,r==='main'?265:295)],[320,660,1000].map((x,i)=>({id:'press-'+i,x:at(x+20),y:[170,370],vy:[-310,350]})));
  m.routeMeaning='main and alternate lane tasks in one corridor; no distinct optional branch claim';
 }else throw Error('Unsupported theme');
 if(e.adjacency==='upper-after')m.obstacles.push(M.rect('adj-upper',at(1180),-120,35,285));if(e.adjacency==='lower-before')m.obstacles.push(M.rect('adj-lower',at(150),465,35,75));
 m.obstacles.push(M.rect('recovery-top',at(1370),-120,30,260),M.rect('recovery-bottom',at(1370),430,30,110));
 m.design={theme,variant:v,parentVariant:0,goal:options.goal||theme,implemented:'rectangle geometry, route checkpoints, state exit, exact contact commitment',unsupported:['continuous reachability certification','natural readable choice','arbitrary phases','human fun'],entryDomain:{y:[245,300],vy:[-65,65],lead:[-20,20],phase:[-.45,.45],adjacency:['none','upper-after','lower-before']}};
 F.validate(m);return m;
}
function compose(components,e={},level='stage'){
 const count=level==='whole'?12:4;if(components.length!==count)throw Error('Wrong component count');if(components.some(c=>c.theme==='spring'))throw Error('Multi-contact composition not implemented; keep spring as conditional combo only');
 const m=M.base(`${level}-${components.map(x=>x.ruleId).join('-')}`,e,count*1200);m.routes={main:{segments:[],checkpoints:[],events:[],exit:{x:count*1500-120,y:[160,410],vy:[-310,300]},recoveryTicks:120},branch:{segments:[],checkpoints:[],events:[],exit:{x:count*1500-120,y:[160,410],vy:[-310,300]},recoveryTicks:120}};
 m.routeMarks=[];m.components=[];
 components.forEach((c,i)=>{const off=i*1500,sub=combo(c.theme,c.variant,{...e,lead:e.lead||0,id:'compose-'+i});for(const o of sub.obstacles){const p=structuredClone(o);p.id=`c${i}-${o.id}`;p.group_id=p.id;p.x+=off;m.obstacles.push(p);}for(const r of ['main','branch']){const ss=sub.routes[r].segments.map(s=>({...s,endX:Math.min(s.endX,1560)+off}));m.routes[r].segments.push(...ss);m.routes[r].checkpoints.push(...sub.routes[r].checkpoints.map(q=>({...q,id:`c${i}-${q.id}`,x:q.x+off})));}m.routeMarks.push({id:'component-'+i,x:off+1450,yMin:10,yMax:530,direction:'forward',portalPolicy:'physical-crossing-only'});m.components.push({...c,offset:off});});
 m.design={theme:'wave-mechanical-course',level,stageCount:count/4,components:m.components,goal:'tested combination connectors, pressure alternation and recovery',unsupported:['spring composition','arbitrary branch combinations','natural route discovery','human enjoyment']};F.validate(m);return m;
}
module.exports={combo,compose};
