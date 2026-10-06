'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let checks=0,forbiddenPhysicsCalls=0;
const saved=[];
// Fail closed for every dynamic export in all engine layers. This also blocks
// observation/body queries and state construction, not only stepping/rollout.
for(const [file,allowed]of [['vendor/engine/core.js',['validate']],['vendor/baseline/core.js',['validate']],['vendor/engine/timed-course.js',['validate','isTimed']],['vendor/engine/arrival-triggers.js',['validate']],['vendor/policies/baseline/core.js',['validate']]]){
 const api=require(path.join(root,file));for(const [key,value]of Object.entries(api))if(typeof value==='function'&&!allowed.includes(key)){saved.push([api,key,value]);api[key]=()=>{forbiddenPhysicsCalls++;throw Error('Static-only fixtures forbid '+file+':'+key);};}
}
const G=require('../recovery-generator.cjs'),C=require('../recovery-canonical.cjs'),O=require('../recovery-order.cjs'),L=require('../recovery-length.cjs'),S=require('../recovery-sustain.cjs'),U=require('../recovery-utils.cjs');
const ok=(v,msg)=>{assert.ok(v,msg);checks++;},eq=(a,b,msg)=>{assert.deepStrictEqual(a,b,msg);checks++;},near=(a,b,msg)=>ok(Math.abs(a-b)<=1e-9,msg),reject=(f,rx=/./)=>{assert.throws(f,rx);checks++;};
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
try{
 const deps=require('../DEPENDENCIES.json');for(const q of deps.files){const b=fs.readFileSync(path.join(root,q.path));eq(hash(b),q.sha256);eq(b.length,q.bytes);}
 const original=require('./fixtures/authenticated-r012-cases.json');
 for(const c of original.cases){eq(hash(require('./legacy-r012-fixture.cjs')(c.condition)),c.mapHash,'authentic r012 exact recorded map bytes');eq(hash(fs.readFileSync(path.join(root,'versions/r012.json'))),c.configSHA256);}
 const entries=[{}, {seed:0,y:245,vy:-65,lead:-20,phase:-.45,adjacency:'upper-after'}, {seed:4294967295,y:300,vy:65,lead:20,phase:.45,adjacency:'lower-before'}, {seed:99,y:268.774,vy:-21.5012,lead:19.984,phase:.133822,adjacency:'upper-after'}];
 for(let i=0;i<32;i++)entries.push({seed:(Math.imul(i+1,2654435761)>>>0),y:245+(i*17%550)/10,vy:-65+(i*29%1300)/10,lead:-20+(i*37%400)/10,phase:-.45+(i*53%900)/1000,adjacency:['none','upper-after','lower-before'][i%3]});
 // Independent reviewer's ordinary fractional probes; no rounding of JS arithmetic.
 for(let i=0;i<128;i++)entries.push({seed:(Math.imul(i+53,2246822507)>>>0),y:245+(i*17%54999)/1000,vy:-65+(i*7919%129999)/1000,lead:-20+(i*7919%399999)/10000,phase:-.45+(i*53%899999)/1000000,adjacency:['none','upper-after','lower-before'][i%3]});
 const orders=new Set(),lengths=new Set();let descriptorComparisons=0;
 for(const e0 of entries){const e=C.entry(e0),p=C.generate(e),snapshot=JSON.stringify(p),m=G.generate(G.CONFIG,e);
  eq(JSON.stringify(p),snapshot,'transforms preserve source object');eq(G.generate(G.CONFIG,{...e,id:'poison',group:'holdout',results:{perfect:true},testId:'secret'}),m,'test identity must not influence generation');
  eq(m.initial_player,p.initial_player);eq(m.routes.main.events,['no-bounce']);eq(m.routes.branch.events,['bounce']);eq(m.routes.branch.contact,p.routes.branch.contact);ok(!m.routes.main.contact);
  const order=m.design.orderProgram.sourceAtSlot;orders.add(order.join(','));lengths.add(m.components.map(c=>c.lengthPx).join(','));eq(order.slice(0,8),[0,1,2,3,4,5,6,7]);eq([...order].sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i));
  eq(m.design.componentTimeline[0].startTick,0);eq(m.design.componentTimeline.at(-1).endTick,14400);eq(m.macroPlan.map(q=>[q.startTick,q.endTick]),m.design.componentTimeline.map(q=>[q.startTick,q.endTick]));
  eq(m.components.map(c=>c.lengthPx).filter(x=>x===1485).length,1);eq(m.components.map(c=>c.lengthPx).filter(x=>x===1515).length,1);
  eq(m.obstacles.length,p.obstacles.length);eq(m.obstacles.filter(o=>o.mechanic_kind==='spring_wall').length,1);
  eq([...new Set(m.obstacles.map(o=>o.mechanic_kind))].sort(),['fixed_armor_or_spike','spring_wall','vertical_armor_slider']);
  for(let stage=0;stage<3;stage++){const t=m.design.componentTimeline.slice(stage*4,stage*4+4);eq(t.at(-1).endTick-t[0].startTick,4800);eq(t.at(-1).endX-t[0].startX,6000);}
  for(const [slot,c] of m.components.entries()){
   const source=order[slot],before=p.components[source],dx=c.offset-before.offset;eq(c.theme,before.theme);eq(Math.floor(source/4),Math.floor(slot/4));
   if(slot<8){eq(c.offset,before.offset);eq(c.lengthPx,1500);}
   const own=m.obstacles.filter(o=>U.ownedIndex(o.id)===slot),old=p.obstacles.filter(o=>U.ownedIndex(o.id)===source);eq(own.length,old.length);
   for(const a of old){const b=own.find(o=>o.id===U.remapId(a.id,slot));ok(b);near(b.x,a.x+dx);eq(b.y,a.y);eq(b.collider,a.collider);eq(b.interaction,a.interaction);eq(b.timeline,null);eq(b.effect_region,null);descriptorComparisons++;
    if(a.motion){eq(b.motion.amplitude_px,a.motion.amplitude_px);eq(b.motion.period_s,a.motion.period_s);for(const seconds of [0,.3,2.25,8,10])near((c.offset/150+seconds)*2*Math.PI/b.motion.period_s+b.motion.phase_rad,(before.offset/150+seconds)*2*Math.PI/a.motion.period_s+a.motion.phase_rad,'true shared-clock motion alignment');}
   }
   const tail=c.relations.find(r=>r.type==='short-relief-tail-corridor');near(tail.routeIntent.startX-c.offset,c.theme==='mechanical'?1230:1260);near(tail.routeIntent.endX,c.offset+1300);near(tail.bridgeSeconds,(m.routes.main.connectors[slot].boundaryX-m.routes.main.connectors[slot].startX)/150);
   if(c.theme==='mechanical')for(let j=0;j<3;j++){const a=own.find(o=>o.id===`c${slot}-press-${j}-top`),b=own.find(o=>o.id===`c${slot}-press-${j}-bottom`);eq(a.collider.w,j<2?100:75);eq(b.collider.w,a.collider.w);near(b.y-a.y-a.collider.h,180-20*Math.floor(slot/4));}
   if(before.relations.some(r=>r.type==='same-side-hold-then-turn')){const rr=c.relations.find(r=>r.type==='same-side-hold-then-turn');eq(rr.mainSides,['upper','upper','lower']);eq(own.filter(o=>/-wave-island-[01]$/.test(o.id)).map(o=>o.collider.w),[110,110]);}
   if(before.relations.some(r=>r.type==='continuous-two-route-corridor')){eq(own.filter(o=>/-(upper|lower)-route-rail$/.test(o.id)).length,2);ok(c.relations.some(r=>r.type==='whole-body-exit-route-domain'));}
   if(before.relations.some(r=>r.type==='fixed-island-between-moving-pairs')){eq(own.filter(o=>o.id.includes('-receiver-island-')).length,2);for(let j=0;j<2;j++){const q=own.find(o=>o.id===`c${slot}-receiver-island-${j}`);eq(q.y,j===0?280:241,'accepted receiver offset55 retained');}}
   for(const route of ['main','branch']){const src=p.routes[route],dst=m.routes[route],oldSeg=src.segments.filter(s=>s.endX>before.offset+60&&s.endX<=before.offset+1560),newSeg=dst.segments.filter(s=>s.endX>c.startX&&s.endX<=c.endX);eq(newSeg.length,oldSeg.length);for(let j=0;j<oldSeg.length;j++){const expected={...oldSeg[j],endX:oldSeg[j].endX+dx+(j===oldSeg.length-1?c.lengthPx-1500:0)};ok(U.equal(newSeg[j],expected),'complete relocated route segment');}for(const q of src.checkpoints.filter(q=>U.ownedIndex(q.id)===source)){const got=dst.checkpoints.find(v=>v.id===U.remapId(q.id,slot));ok(U.equal(got,{...q,id:U.remapId(q.id,slot),x:q.x+dx}));}eq(dst.connectors[slot].boundaryX,c.endX);}
  }
  for(const route of ['main','branch']){const p0=p.routes[route],p1=m.routes[route];eq(p1.exit,p0.exit);eq(p1.finalDomain,p0.finalDomain);eq(p1.recoveryTicks,120);for(let i=0;i<11;i++)eq(p1.checkpoints.find(q=>q.id==='handoff-'+i).x,m.components[i].endX);}
  for(const r of m.design.pressureProgram.pairRecords){const a=m.obstacles.find(o=>o.id===r.pairId+'-top'),b=m.obstacles.find(o=>o.id===r.pairId+'-bottom');ok(U.equal(r.inheritedMotion,a.motion));near(r.physicalGapPx,b.y-a.y-a.collider.h);}
 }
 ok(orders.size>=3,'relations yield multiple actual component orders');ok(lengths.size>=3,'balanced donor/recipient generator yields multiple actual length patterns');
 const e=C.entry({seed:42,lead:19.984,phase:.133822}),p=C.generate(e),op={type:'relational-order'};
 for(const mutate of [m=>m.obstacles.find(o=>o.id==='c2-divider').x+=1e-7,m=>m.routes.branch.contact.startX+=1e-7,m=>m.obstacles[0].x+=1e-7,m=>m.obstacles[0].collider.w+=1e-7,m=>m.obstacles.splice(m.obstacles.findIndex(o=>o.id==='c3-receiver-island-0'),1),m=>m.routes.branch.contact.receiverExitX+=1e-7,m=>m.routes.main.events=[],m=>m.routes.main.checkpoints.pop(),m=>m.routes.main.connectors[9].startX+=1,m=>m.components[8].relations=m.components[8].relations.filter(r=>r.type!=='whole-body-exit-route-domain'),m=>m.components[9].relations.push({type:'unknown'}),m=>m.obstacles.find(o=>o.id==='c2-spring').collider.w=66]){const q=structuredClone(p);mutate(q);reject(()=>O.transform(q,e,op));}
 const q=structuredClone(p),top=q.obstacles.find(o=>o.motion),bottom=q.obstacles.find(o=>o.id===top.id.replace('-top','-bottom'));top.motion.phase_rad+=1.42e-14;bottom.motion.phase_rad+=1.42e-14;ok(O.transform(q,e,op),'tiny representational phase difference accepted without quantization');
 const bad=structuredClone(p);bad.components[9].relations.push({type:'contact-first-optional-branch'});eq(O.eligibleStages(bad)[2].eligible,false);const bad2=structuredClone(p);bad2.components[8].relations.push({type:'fixed-island-between-moving-pairs'});eq(O.eligibleStages(bad2)[2].eligible,false);const renamed=structuredClone(p);renamed.components.forEach(c=>c.stageId='not-a-selector');eq(O.eligibleStages(renamed).map(s=>s.eligible),[false,false,true]);
 const ignored={...e};for(const k of ['id','group','results','testId'])Object.defineProperty(ignored,k,{get(){throw Error('Read forbidden experimental field '+k);}});eq(G.generateParent(ignored),G.generateParent(e));eq(G.generate(G.CONFIG,ignored),G.generate(G.CONFIG,e));
 const unsupported=structuredClone(p);unsupported.obstacles.find(o=>o.id==='c9-press-0-top').mechanic_kind='phase_wall';eq(O.eligibleStages(unsupported)[2].eligible,false);
 for(const input of [{seed:-1},{seed:1.2},{seed:4294967296},{y:NaN},{phase:Infinity},{lead:21},{y:301},{adjacency:'unknown'}])reject(()=>G.generate(G.CONFIG,input));
 for(const edit of [c=>delete c.sustain,c=>c.sustain.widthPx=90,c=>c.sustain.indices=[1],c=>c.length.deltaPx=30,c=>c.length.stageIndices=[0,1,2],c=>c.phase={enabled:true}]){const c=structuredClone(G.CONFIG);edit(c);reject(()=>G.generate(c,e));}
 reject(()=>L.apply(p,e,{type:'balanced-component-lengths',deltaPx:30}));reject(()=>L.apply(p,e,{type:'balanced-component-lengths',deltaPx:15,stageIndices:[2]}));reject(()=>L.apply(G.generate(G.CONFIG,e),e,G.CONFIG.length));
 ok(U.equal({x:1},{x:1+1.42e-14}));ok(!U.equal({x:1},{x:1+1e-7}));ok(!U.equal({x:NaN},{x:NaN}));ok(!U.equal({x:1},{x:'1'}));ok(!U.equal([1,2],[2,1]));ok(!U.equal({a:1},{a:1,b:2}));
 // Absolute equality is not transitive; no numeric bins/hashes are used for novelty.
 ok(U.equal(0,.75e-9));ok(U.equal(.75e-9,1.5e-9));ok(!U.equal(0,1.5e-9));
 const site=require('./fixtures/limited-site-geometry.json'),siteChecks=[];
 for(const c of site.cases){const a=c.round==='a001'&&c.arm==='parent'?G.generateParent(c.derivedEntry):c.round==='a004'&&c.arm==='candidate'?G.generate(G.CONFIG,c.derivedEntry):C.generate(c.derivedEntry);
  ok(U.equal(a.obstacles,c.obstacles),'limited Site obstacle descriptors');eq(a.height,c.height);eq(a.durationTicks,c.durationTicks);
  const projection=values=>values.map(v=>{const q=structuredClone(v);if(q.orderRelocation)delete q.orderRelocation.algorithm;if(q.lengthRelocation)delete q.lengthRelocation.schema;return q;});ok(U.equal(projection(a.components),projection(c.components)),'limited Site component geometric/intent descriptors');
  siteChecks.push({round:c.round,arm:c.arm,obstacles:c.obstacles.length,geometryAndComponentProjectionEqual:true,sourceSHA256:c.sourceSHA256,conditionDerivation:c.conditionDerivation});
 }
 eq(forbiddenPhysicsCalls,0);
 const result={schema:'recovery-generator-static-results/1',passed:true,checks,physicalExecutions:0,physicalTicks:0,forbiddenPhysicsCalls,dependencyFiles:deps.files.length,authenticatedR012ExactRecordedMaps:original.cases.length,cumulativeParameterFixtures:entries.length,independentReviewerFractionalProbes:128,actualOrderVariants:orders.size,actualLengthVariants:lengths.size,descriptorComparisons,siteChecks,scope:site.scope,qualification:'Pure construction/static invariants only; full new physical qualification remains required'};
 console.log(JSON.stringify(result,null,2));
}finally{for(const [api,key,value]of saved)api[key]=value;}
