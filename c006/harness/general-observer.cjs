'use strict';
// Descriptive actual-state observation only. Never admits a source style or
// changes an inherited evaluator threshold. No runtime/controller import.
const Base = require('./metrics.cjs');
const Shape = require('./b008-metrics.cjs');
const VERSION = 'general-actual-shape-action-observer/1';
function windowsValid(windows = [], stopTick = 14400) {
  if (!Array.isArray(windows)) throw Error('Expected capture windows');
  const names = new Set();
  for (const w of windows) {
    const limits = {combo:[960,1800], stage:[3600,4800], transition:[3600,4800]}[w.layer];
    if (!limits || typeof w.name !== 'string' || !w.name || names.has(w.name) ||
      !Number.isInteger(w.startTick) || !Number.isInteger(w.endTick) || w.startTick < 0 ||
      w.endTick > stopTick || w.endTick-w.startTick < limits[0] || w.endTick-w.startTick > limits[1])
      throw Error('Invalid unique 8–15s combo or 30–40s stage/transition window');
    names.add(w.name);
    for(const key of ['forceSourceIds','bodySourceIds','exactBodyIds'])if(w[key]!==undefined&&(!Array.isArray(w[key])||w[key].length>64||w[key].some(id=>typeof id!=='string'||!id)))throw Error('Invalid frozen actual body source selection');
  }
  return windows;
}
const inWindows = (tick, windows) => windows.some(w => tick >= w.startTick && tick <= w.endTick);
function createBodyCapture(windows){
  const selected=new Map(),tail=new Array(241);let last=-1;
  return {capture(frame){last=frame.tick;tail[frame.tick%241]=frame;if(frame.tick%120===0||inWindows(frame.tick,windows))selected.set(frame.tick,frame);},
    finish(){for(const frame of tail)if(frame&&frame.tick>=last-240)selected.set(frame.tick,frame);return [...selected.values()].sort((a,b)=>a.tick-b.tick);}};
}
function bodyFrame(state, bodies, windows=[]) {
  const active=windows.filter(w=>state.tick>=w.startTick&&state.tick<=w.endTick),force=new Set(active.flatMap(w=>[...(w.forceSourceIds??[]),...(w.bodySourceIds??[])])),exact=new Set(active.flatMap(w=>w.exactBodyIds??[]));
  return {tick:state.tick,x:state.x,y:state.y,bodies:bodies.filter(b => {
    const q=Shape.runtimeBounds(b);
    return force.has(b.sourceId??b.id)||exact.has(b.id)||!Number.isFinite(q.minX) || !Number.isFinite(q.maxX) || q.maxX >= state.x-160 && q.minX <= state.x+640;
  }).map(b => structuredClone(b))};
}
function actionWindow(rows, flapTicks, clearanceSamples, window) {
  const {startTick,endTick}=window, last=rows.at(-1)?.[0]??-1;
  const selected=rows.filter(r=>r[0]>=startTick&&r[0]<=endTick);
  const complete=last>=endTick&&selected.length===endTick-startTick+1&&selected.every((r,i)=>r[0]===startTick+i&&r[5]);
  const live=selected.filter(r=>r[5]), inputs=flapTicks.filter(t=>t>=startTick&&t<Math.min(endTick,last));
  const gaps=inputs.slice(1).map((t,i)=>(t-inputs[i])/120);
  const anchors=[startTick,...inputs,Math.max(startTick,Math.min(endTick,last))];
  const release=anchors.slice(1).map((t,i)=>(t-anchors[i])/120);
  const samples=clearanceSamples.filter(s=>s.tick>=startTick&&s.tick<endTick);
  const widths=samples.filter(s=>s.status==='observed').map(s=>s.width);
  const expected=Math.max(0,Math.ceil((endTick-Math.ceil(startTick/12)*12)/12));
  let turns=0;
  for(let i=1;i<live.length;i++) if(live[i-1][3]*live[i][3]<0) turns++;
  return {...window,status:complete?'observed':'censored',observedThroughTick:Math.min(last,endTick),
    actualInputCount:inputs.length,flapIntervalSeconds:gaps,
    longestObservedInputGapSeconds:release.length?Math.max(...release):null,
    observedYRangePx:live.length?Math.max(...live.map(r=>r[2]))-Math.min(...live.map(r=>r[2])):null,
    observedMaxAbsVy:live.length?Math.max(...live.map(r=>Math.abs(r[3]))):null,
    observedVerticalDirectionChanges:turns,
    pressure:{status:samples.length===expected&&samples.every(s=>s.status==='observed')?'observed':samples.some(s=>s.status==='invalid')?'invalid':samples.some(s=>s.status==='unsupported')?'unsupported':last<endTick?'censored':'missing',
      expectedSamples:expected,observedSamples:widths.length,medianActualClearancePx:Base.median(widths),
      minimumActualClearancePx:widths.length?Math.min(...widths):null,
      sampledConstraintSeconds:widths.filter(x=>x<240).length/10,sampledWideOpenSeconds:widths.filter(x=>x>=240).length/10},
    feasibleInputWindow:{status:'unmeasured',reason:'Actual input intervals are not counterfactual feasible-input windows'}};
}
function measure({map,rows,flapTicks,clearanceSamples,windows=[]}) {
  const actionWindows=[];
  for(let startTick=0;startTick<map.horizon;startTick+=240)
    actionWindows.push(actionWindow(rows,flapTicks,clearanceSamples,{name:'action-'+startTick,layer:'action',startTick,endTick:Math.min(map.horizon,startTick+240)}));
  return {schema:VERSION,actualActionWindows:actionWindows,
    selectedWindows:windows.map(w=>actionWindow(rows,flapTicks,clearanceSamples,w)),
    scope:'Actual dense rows, exact inputs, and actual runtime circle/rectangle/capsule geometry only',
    unchangedThresholdPx:240,sourceSpecificAcceptedEvidence:{status:'not_evaluated',reason:'Separate versioned relation observer and source-domain qualification required'},
    finiteInputMargin:{status:'unmeasured'},humanFun:{status:'unmeasured'},acceptanceDecision:false};
}
module.exports={VERSION,windowsValid,inWindows,createBodyCapture,bodyFrame,actionWindow,measure,clearance:Shape.clearance,runtimeBounds:Shape.runtimeBounds};
