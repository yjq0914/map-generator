'use strict';
const Prior=require('./generator-v2.cjs'),F=require('./engine/core');
function combo(theme,v=1,e={},options={}){if(v<3)return Prior.combo(theme,v,e,options);const m=Prior.combo(theme,theme==='wave'?1:2,e,options),lead=e.lead||0;
 if(theme==='wave'){const centers=v===3?[225,320,250]:[245,300,220],old=[235,310,240];for(let i=0;i<3;i++){const d=centers[i]-old[i],o=m.obstacles.find(o=>o.id==='wave-island-'+i);o.y+=d;o.collider.w=v===4?55:45;for(const r of Object.values(m.routes)){r.segments[i].targetY+=d;r.checkpoints[i].y=r.checkpoints[i].y.map(y=>y===30||y===510?y:y+d);}}}
 if(theme==='spring'){m.obstacles.find(o=>o.id==='divider').y=285;m.obstacles.find(o=>o.id==='divider').collider.h=25;m.routes.main.segments[0].targetY=200;if(v===4){const rec=m.obstacles.find(o=>o.id==='receiver');rec.y=410;rec.collider.h=130;m.routes.branch.contact.landingTargetX=lead+745;}}
 if(theme==='mechanical'){for(const o of m.obstacles.filter(o=>o.id.startsWith('press-'))){o.motion.amplitude_px=v===3?24:18;const gap=v===3?160:175;if(o.id.endsWith('-top'))o.collider.h=270-gap/2+120;else{o.y=270+gap/2;o.collider.h=540-o.y;}}}
 m.id=`${theme}-v${v}-${e.id||'input'}`;m.mapId=m.id;m.design.variant=v;m.design.parentVariant=theme==='wave'?1:2;m.design.independentControllerRevision='route-mpc/3-delay-aware';F.validate(m);return m;
}
module.exports={combo,compose:Prior.compose};
