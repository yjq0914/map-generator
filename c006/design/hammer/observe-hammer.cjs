'use strict';
// Pure reducer of captured actual body/player records; no simulation or implied causality.
const fs=require('node:fs');
const finite=Number.isFinite;
const active=b=>b.lethal===true&&!['warning','idle','cleared'].includes(b.status);
function pointMargin(x,y,b,r=10){
 if(b.shape==='circle'){if(![x,y,r,b.x,b.y,b.w,b.h].every(finite)||b.w!==b.h)throw Error('Incomplete saved disk');return Math.hypot(x-b.x-b.w/2,y-b.y-b.h/2)-b.w/2-r;}
 if(b.shape==='segment'){if(![x,y,r,b.x,b.y,b.x2,b.y2,b.width].every(finite))throw Error('Incomplete saved capsule');const dx=b.x2-b.x,dy=b.y2-b.y,u=Math.max(0,Math.min(1,((x-b.x)*dx+(y-b.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-b.x-u*dx,y-b.y-u*dy)-b.width/2-r;}
 throw Error('Hammer reducer requires actual circle/segment');
}
function observe(map,e,parent=null){
 const p=map.design?.hammerProgram;if(!p)throw Error('Declared hammer program required');
 const w=e.retentionWindow??e.continuity?.window;if(!w)throw Error('Declared retained window required');
 const rowMap=new Map((e.rows??[]).map(r=>[r[0],r])),parentRows=new Map((parent?.rows??[]).map(r=>[r[0],r]));
 const frames=(e.bodySamples??[]).filter(f=>f.tick>=w.startTick&&f.tick<=w.endTick),seen=new Set(),samples=[];
 for(const f of frames){if(seen.has(f.tick))throw Error('Duplicate saved actual frame');seen.add(f.tick);const row=rowMap.get(f.tick);if(!row||row[1]!==f.x||row[2]!==f.y)throw Error('Saved body/player frame mismatch');
  const bodies=f.bodies.filter(b=>b.sourceId===p.sourceId),live=bodies.filter(active);if(bodies.length!==2||!bodies.some(b=>b.shape==='circle')||!bodies.some(b=>b.shape==='segment'))throw Error('Missing actual hammer body');
  const pr=parentRows.get(f.tick),margin=live.length?Math.min(...live.map(b=>pointMargin(f.x,f.y,b))):null;
  samples.push({tick:f.tick,x:f.x,y:f.y,alive:!!row[5],marginPx:margin,rotation:bodies.find(b=>b.shape==='circle').rotation,
    inActualHorizontalSlab:live.some(b=>{const lo=b.shape==='segment'?Math.min(b.x,b.x2)-b.width/2:b.x,hi=b.shape==='segment'?Math.max(b.x,b.x2)+b.width/2:b.x+b.w;return f.x+10>=lo&&f.x-10<=hi;}),activeIds:live.map(b=>b.id),parentYDeltaPx:pr?f.y-pr[2]:null,
    parentPathAgainstCandidateSavedShapeMarginPx:pr&&live.length?Math.min(...live.map(b=>pointMargin(pr[1],pr[2],b))):null});
 }
 const expected=Math.max(0,Math.min(w.endTick,e.finalState?.tick??-1)-w.startTick+1),complete=frames.length===expected&&samples.every((s,i)=>!i||s.tick===samples[i-1].tick+1),live=samples.filter(s=>finite(s.marginPx));
 const after=samples.filter(s=>s.x>p.downstreamRecovery.startX&&s.alive),matched=samples.filter(s=>s.parentYDeltaPx!==null),flaps=(e.flapTicks??[]).filter(t=>t>=w.startTick&&t<w.endTick),parentFlaps=parent?(parent.flapTicks??[]).filter(t=>t>=w.startTick&&t<w.endTick):null;
 return {schema:'b002-hammer-actual-window/1',sourceId:p.sourceId,window:w,status:complete&&samples.at(-1)?.tick===w.endTick&&samples.every(x=>x.alive)?'observed':'censored',fullActualWindow:complete,actualSamples:samples.length,expectedReachedSamples:expected,
 minObservedBodyMarginPx:live.length?Math.min(...live.map(x=>x.marginPx)):null,observedTicksWithin24px:live.filter(s=>s.marginPx<=24).length,
 allEncounterAnglesPositive:live.some(s=>s.inActualHorizontalSlab)?live.filter(s=>s.inActualHorizontalSlab).every(s=>s.rotation>0):null,actualHorizontalSlabTicks:live.filter(s=>s.inActualHorizontalSlab).map(s=>s.tick),
 postWholeSweepExit:{actualAliveTicks:after.length,firstTick:after[0]?.tick??null,lastTick:after.at(-1)?.tick??null,durationSeconds:after.length>1?(after.at(-1).tick-after[0].tick)/120:null,lastState:after.length?rowMap.get(after.at(-1).tick):null},
 actualActionDifference:parentFlaps?{flapTapeChanged:JSON.stringify(flaps)!==JSON.stringify(parentFlaps),flaps,comparisonFlaps:parentFlaps,maxAbsoluteYDifferencePx:matched.length?Math.max(...matched.map(x=>Math.abs(x.parentYDeltaPx))):null}:null,
 counterfactualGeometryOnly:parent?{parentPathWouldOverlapSavedCandidateShape:matched.some(s=>s.parentPathAgainstCandidateSavedShapeMarginPx!==null&&s.parentPathAgainstCandidateSavedShapeMarginPx<=0),overlapTicks:matched.filter(s=>s.parentPathAgainstCandidateSavedShapeMarginPx!==null&&s.parentPathAgainstCandidateSavedShapeMarginPx<=0).map(s=>s.tick),causalPhysicalReplay:false,qualification:'geometric counterfactual only; no actual collided state or all-routes necessity claim'}:null,
 planningGuardChange:false,physicalCollisionEvents:(e.events??[]).filter(q=>q.type==='death'&&q.sourceId===p.sourceId),samples,humanFun:null,qualityClaim:false};
}
function read(p){const b=fs.readFileSync(p);return p.endsWith('.gz')?require('../../harness/retention-v3.cjs').decode(b):JSON.parse(b);}
if(require.main===module){const [mp,tp,out,pp]=process.argv.slice(2);const map=mp.endsWith('.gz')?JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(mp))):read(mp);fs.writeFileSync(out,JSON.stringify(observe(map,read(tp),pp?read(pp):null),null,2)+'\n');}
module.exports={pointMargin,observe};
