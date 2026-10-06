'use strict';
const F=require('./engine/core');
const rect=(id,x,y,w,h)=>({id,mechanic_kind:'fixed_armor_or_spike',x,y,collider:{shape:'rectangle',w,h},motion:null,timeline:null,effect_region:null,interaction:{lethal:true},group_id:id});
function spring(id,x,y,w=180){const o=rect(id,x,y,w,16);o.mechanic_kind='spring_wall';o.interaction={lethal:false,bounce_speed_px_s:400,cooldown_s:.2,contact_mode:'descending-top-only'};return o;}
function seg(endX,targetY,minY=20,maxY=520,extra={}){return{endX,targetY,minY,maxY,vy:[-450,600],phase:'any',mechanism:'none',allowedActions:['flap','release'],maxDwellTicks:null,...extra};}
function base(id,e={},ticks=1200){return{schema:'timed-course-120/v1',id,mapId:id,seed:20261004,height:540,width:24000,worldBounds:{minX:0,maxX:24000},durationTicks:14400,winMode:'timed-route',initial_player:{x:60,y:e.y??270,vx:150,vy:e.vy??0},routeMarks:[{id:'end',x:60+ticks*1.25-40,yMin:10,yMax:530,direction:'forward',portalPolicy:'physical-crossing-only'}],macroPlan:[{id:'course',startTick:0,endTick:14400}],encounters:[],triggers:[],obstacles:[],coins:[],horizon:ticks,condition:e,routes:{},expected:{}};}
function fixture(kind,e={}){const m=base('fixture-'+kind,e,1200);let path=[seg(2000,300)];
 if(kind==='climb')path=[seg(200,300),seg(650,200),seg(2000,300)];
 if(kind==='descend')path=[seg(200,280),seg(700,410),seg(2000,300)];
 if(['under-island','landing','bounce-receiver','merge'].includes(kind)){
  path=[seg(200,310),seg(490,425,340,500),seg(690,450,340,510),seg(860,300),seg(2000,300)];
  m.obstacles.push(rect('divider',390,270,80,40));
  if(kind!=='under-island')m.obstacles.push(spring('spring',500,475,230));
  if(kind==='bounce-receiver')m.obstacles.push(rect('receiver',765,415,30,125));
  if(kind==='merge')m.obstacles.push(rect('merge-top',1020,-120,35,300),rect('merge-bottom',1020,420,35,120));
 }
 if(kind==='dynamic-gate'){path=[seg(2000,300)];for(const [i,y,h]of [[0,-120,300],[1,420,120]]){const o=rect('moving-'+i,680,y,40,h);o.mechanic_kind='vertical_armor_slider';o.motion={amplitude_px:25,period_s:3,phase_rad:e.phase||0};m.obstacles.push(o);}}
 m.routes.main={segments:path,events:kind==='landing'||kind==='bounce-receiver'?['bounce']:[],exit:{x:1300,y:[100,460],vy:[-320,320]},recoveryTicks:120};
 m.expected={kind,required:kind==='under-island'?{crossX:470,yMin:325}:kind==='climb'?{crossX:500,yMax:260}:kind==='descend'?{crossX:550,yMin:335}:null};F.validate(m);return m;}
module.exports={rect,spring,seg,base,fixture};
