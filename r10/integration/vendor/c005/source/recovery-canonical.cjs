'use strict';
const Base=require('./relations-r012.cjs'),R012=require('./versions/r012.json'),S=require('./recovery-sustain.cjs'),U=require('./recovery-utils.cjs');
const INPUT_KEYS=['seed','y','vy','lead','phase','adjacency'];
function entry(input={}){
 U.assert(input&&typeof input==='object'&&!Array.isArray(input),'entry must be object');
 // Experimental ID/group/result fields never enter generation. Public conditions
 // alone are parameters; there is no lookup keyed by identity or seed.
 const e={seed:input.seed??20261004,y:input.y??270,vy:input.vy??0,lead:input.lead??0,phase:input.phase??0,adjacency:input.adjacency??'none'};
 for(const k of INPUT_KEYS.filter(k=>k!=='adjacency'))U.assert(Number.isFinite(e[k]),'invalid entry '+k);
 U.assert(Number.isInteger(e.seed)&&e.seed>=0&&e.seed<=4294967295,'seed must be unsigned32');
 U.assert(['none','upper-after','lower-before'].includes(e.adjacency),'unknown adjacency');
 return e;
}
function generate(e){return S.transform(Base.generate(R012,entry(e)));}
function physicalContract(m){return {schema:m.schema,seed:m.seed,height:m.height,width:m.width,worldBounds:m.worldBounds,durationTicks:m.durationTicks,winMode:m.winMode,initial_player:m.initial_player,routeMarks:m.routeMarks,macroPlan:m.macroPlan,encounters:m.encounters,triggers:m.triggers,obstacles:m.obstacles,coins:m.coins,horizon:m.horizon,condition:entry(m.condition),routes:m.routes,components:m.components,pressureProgram:m.design?.pressureProgram,optionalSpringProgram:m.design?.optionalSpringProgram};}
function validate(m,e){const expected=generate(e);U.assert(U.equal(physicalContract(m),physicalContract(expected)),'input differs from canonical inherited geometry, complete routes, motion, or intent; material changes require a new version');return true;}
module.exports={generate,validate,entry,physicalContract};
