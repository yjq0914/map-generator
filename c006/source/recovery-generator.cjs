'use strict';
// NEW recovery-cumulative-v1, constructed from byte-authenticated r012 and
// declared historical behavior. Never a claim of restoring original a004 bytes.
const Base=require('./relations-r012.cjs'),R012=require('./versions/r012.json');
const C=require('./recovery-canonical.cjs'),O=require('./recovery-order.cjs'),L=require('./recovery-length.cjs'),U=require('./recovery-utils.cjs'),F=require('./vendor/engine/core.js');
const CONFIG=require('./configs/recovery-cumulative-v1.json');
function componentTimeline(m){
 U.assert(m.schema==='timed-course-120/v1'&&m.design?.withBridge===true,'unsupported timeline source schema');
 const tickDistance=F.VX*F.DT,x0=m.initial_player.x;
 U.assert(m.initial_player.vx===F.VX,'timeline requires declared fixed horizontal velocity');
 const timeline=m.components.map((c,i)=>{
  const a=m.routes.main.connectors[i],b=m.routes.branch.connectors[i],startX=x0+c.offset,endX=a.boundaryX;
  U.assert(a&&b&&U.equal(a,b),'route connector timeline mismatch');
  U.assert(endX>startX,'nonpositive component interval');
  if(c.lengthPx!==undefined)U.assert(U.near(endX-startX,c.lengthPx),'component length/timeline mismatch');
  if(i)U.assert(U.near(startX,m.routes.main.connectors[i-1].boundaryX),'timeline gap/overlap');
  const startTick=(startX-x0)/tickDistance,endTick=(endX-x0)/tickDistance;
  U.assert(Number.isInteger(startTick)&&Number.isInteger(endTick),'nonintegral generated component clock');
  return {componentIndex:i,stageId:String(Math.floor(i/4)),startX,endX,startTick,endTick};
 });
 U.assert(timeline[0].startTick===0&&timeline.at(-1).endTick===m.horizon,'component timeline does not cover horizon');
 for(let i=0;i<timeline.length;i+=4){const stage=timeline.slice(i,i+4);U.assert(stage.length===4&&stage.at(-1).endTick-stage[0].startTick===4800,'stage must preserve compiler 40s contract');}
 return timeline;
}
function annotateSemantics(map){const m=U.clone(map);m.design.componentTimeline=componentTimeline(m);m.design.timelineProvenance={schema:'fixed-velocity-connector-projection/1',source:'actual component.offset and both route connector.boundaryX; source compiler four-components-per-stage contract',metadataOnly:true};return m;}
function generateParent(entry={}){return Base.generate(R012,C.entry(entry));}
function generate(config=CONFIG,input={}){
 U.assert(U.equal(config,CONFIG,0),'unsupported recovery configuration; change source version and requalify instead of silently dropping inherited capability');
 const e=C.entry(input);let m=C.generate(e);
 m=O.transform(m,e,config.order);m=L.apply(m,e,config.length);m=annotateSemantics(m);
 m.id=m.mapId=config.version+'-'+e.seed;m.design.generatorVersion=config.version;
 m.design.recoveryConstruction={schema:config.schema,constructionParent:config.constructionParent,historicalTarget:config.historicalTarget,originalSourceRestored:false,originalAcceptanceInherited:false,phaseCalibrationInherited:false,extraHoldInherited:false,recipe:U.clone(config),provenance:['byte-authenticated r012 dependencies','persisted a001/a004 decisions and limited Site geometry','complete adaptive-length tool-output transcription used as construction input'],qualification:config.qualification};
 m.design.qualification='New cumulative recovery construction; pure static checks only until separately qualified';
 U.assertFiniteTree(m);F.validate(m);return m;
}
module.exports={generate,generateParent,componentTimeline,annotateSemantics,CONFIG};
if(require.main===module){const fs=require('node:fs'),entry=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):{};process.stdout.write(JSON.stringify(generate(CONFIG,entry))+'\n');}
