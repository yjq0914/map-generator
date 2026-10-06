'use strict';
// Pure NEW observation epoch derived from recovered reducer; no engine import.
// Both actual kind and actual shape are now required on EVERY body tuple.
// bodyDictionary: [sourceId, actualKind, actualShape]
// playerRows: [tick,x,y,vx,vy,alive,appliedFlapOnPreviousTick]
// bodyRows: [tick, [[slot,x,y,w,h,lethal,status,actualKind,actualShape], ...]]
// windows: {pairId,startTick,endTick}, inclusive and dense. No imputation.
const OBSERVATION_VERSION='actual-synchronized-pair/2';
const HZ=120,VX=150,R=10,EPS=1e-7,finite=Number.isFinite;
const near=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<EPS;
function same(a,b) {
  if(Object.is(a,b))return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const aa=Object.keys(a).sort(),bb=Object.keys(b).sort();
  return aa.length===bb.length&&aa.every((k,i)=>k===bb[i]&&same(a[k],b[k]));
}
function observationResult(status,reason,extra={}) {return {status,missingReason:reason??null,...extra};}
function reduceObservations(input={}) {
  if(!input||typeof input!=='object'||Array.isArray(input)) return {schema:OBSERVATION_VERSION,status:'invalid',reason:'capture-object-required',pairs:[]};
  const {map,bodyDictionary=[],playerRows=[],bodyRows=[],windows=[]}=input;
  const raw=map?.design?.pressureProgram?.pairRecords;
  if(!Array.isArray(raw)) return {schema:OBSERVATION_VERSION,status:'invalid',reason:'declared-pressure-pairs-missing',pairs:[]};
  const declared=raw.map((p,i)=>({...p,pairId:p?.pairId??'invalid-declaration-'+i,topId:p?.topId??p?.pairId+'-top',bottomId:p?.bottomId??p?.pairId+'-bottom'}));
  if(![bodyDictionary,playerRows,bodyRows,windows].every(Array.isArray)) return {schema:OBSERVATION_VERSION,status:'invalid',reason:'capture-arrays-required',pairs:declared.map(p=>({pairId:p.pairId,status:'invalid',missingReason:'capture-arrays-required'}))};
  if(!declared.length) return {schema:OBSERVATION_VERSION,status:'not_applicable',pairs:[]};
  const makeIndex=(items,key)=>{const by=new Map(),duplicates=new Set();for(const x of items){const k=key(x);if(by.has(k))duplicates.add(k);by.set(k,x);}return {by,duplicates};};
  const px=makeIndex(playerRows,r=>r?.[0]),bx=makeIndex(bodyRows,r=>r?.[0]),wx=makeIndex(windows,w=>w?.pairId),dict=makeIndex(bodyDictionary,(d)=>d?.[0]);
  const sourceIndex=makeIndex(Array.isArray(map.obstacles)?map.obstacles:[],o=>o?.id),declarationIndex=makeIndex(declared,p=>p.pairId),descriptors=sourceIndex.by,bool=v=>[0,1,false,true].includes(v),on=v=>v===1||v===true;
  const pairs=declared.map(p=>{
    const base={pairId:p.pairId,componentIndex:p.componentIndex,sourceIds:[p.topId,p.bottomId],units:{duration:'seconds',width:'px'},source:'actual dense player and synchronized-body tuples'};
    const empty={entryIntervals:[],coreIntervals:[],exitIntervals:[],occupancyIntervals:[],coreDurationSeconds:null,occupancyDurationSeconds:null,minPairFreeWidthPx:null,minPlayerMarginPx:null};
    const finish=(s,r,extra={})=>({...base,...empty,...observationResult(s,r,extra)});
    if(typeof p.pairId!=='string'||!Number.isInteger(p.componentIndex)||p.componentIndex<0||!Array.isArray(map.components)||p.componentIndex>=map.components.length||!map.components[p.componentIndex]||declarationIndex.duplicates.has(p.pairId)||p.topId===p.bottomId) return finish('invalid','invalid-or-duplicate-pair-declaration');
    if(sourceIndex.duplicates.has(p.topId)||sourceIndex.duplicates.has(p.bottomId)) return finish('invalid','duplicate-source-body');
    const a=descriptors.get(p.topId),b=descriptors.get(p.bottomId);
    if(!a||!b) return finish('missing','declared-pair-source-body-missing');
    if(![a,b].every(o=>['fixed_armor_or_spike','vertical_armor_slider','horizontal_armor_slider'].includes(o.mechanic_kind)&&o.collider?.shape==='rectangle'&&!o.trigger_id&&!o.timeline)||a.mechanic_kind!==b.mechanic_kind) return finish('unsupported','declared-pair-semantics-unsupported');
    if(!finite(map.height)||!Number.isSafeInteger(map.horizon)||map.horizon<1||map.horizon>14400||![a,b].every(o=>[o.x,o.y,o.collider.w,o.collider.h].every(finite)&&o.collider.w>0&&o.collider.h>0)||b.y-a.y-a.collider.h<=0) return finish('invalid','invalid-source-aperture');
    if(!near(a.x,b.x)||!near(a.collider.w,b.collider.w)||!same(a.motion,b.motion)) return finish('invalid','declared-pair-not-synchronized');
    const w=wx.by.get(p.pairId);
    if(!w) return finish('missing','capture-window-not-supplied');
    if(wx.duplicates.has(p.pairId)||!Number.isInteger(w.startTick)||!Number.isInteger(w.endTick)||w.startTick<0||w.endTick<=w.startTick||w.endTick>map.horizon) return finish('invalid','invalid-or-duplicate-capture-window');
    const slots=[p.topId,p.bottomId].map(id=>bodyDictionary.findIndex(d=>d?.[0]===id));
    if(slots.some(n=>n<0)) return finish('missing','actual-body-dictionary-entry-missing');
    if([p.topId,p.bottomId].some(id=>dict.duplicates.has(id))) return finish('invalid','duplicate-body-dictionary-id');
    if(slots.some((n,j)=>!Array.isArray(bodyDictionary[n])||bodyDictionary[n].length!==3||bodyDictionary[n][1]!==[a,b][j].mechanic_kind||bodyDictionary[n][2]!=='rectangle')) return finish('unsupported','actual-kind-or-shape-unsupported');
    const valid=[],issues=[],widths=[],margins=[];
    for(let tick=w.startTick;tick<=w.endTick;tick++) {
      const r=px.by.get(tick),br=bx.by.get(tick);
      const issue=(status,reason)=>issues.push({tick,status,reason});
      if(!r||!br) {issue('missing','dense-player-or-body-row-missing');continue;}
      if(px.duplicates.has(tick)||bx.duplicates.has(tick)||!Array.isArray(r)||r.length!==7||!Array.from({length:5},(_,i)=>r[i]).every(finite)||!bool(r[5])||!bool(r[6])||!Array.isArray(br)||br.length!==2||!Array.isArray(br[1])) {issue('invalid','invalid-or-duplicate-dense-row');continue;}
      if(!on(r[5])) {issue('censored','player-dead');continue;}
      if(!near(r[3],VX)) {issue('unsupported','player-horizontal-velocity-not-fixed');continue;}
      const bb=slots.map(slot=>br[1].filter(v=>v?.[0]===slot));
      if(bb.some(v=>!v.length)) {issue('missing','actual-pair-body-missing');continue;}
      if(bb.some(v=>v.length!==1)) {issue('invalid','duplicate-actual-pair-body');continue;}
      const [top,bottom]=bb.map(v=>v[0]);
      if([top,bottom].some(v=>!Array.isArray(v)||v.length!==9||!Array.from({length:5},(_,i)=>v[i]).every(finite)||v[3]<=0||v[4]<=0||!bool(v[5])||typeof v[6]!=='string')) {issue('invalid','invalid-actual-body-tuple');continue;}
      if([top,bottom].some((v,j)=>v[7]!==[a,b][j].mechanic_kind||v[8]!=='rectangle')) {issue('unsupported','actual-row-kind-or-shape-unsupported');continue;}
      if([top,bottom].some(v=>!on(v[5])||v[6]!=='active')) {issue('unsupported','pair-not-active-lethal');continue;}
      const gap=bottom[2]-top[2]-top[4];
      if(!near(top[1],bottom[1])||!near(top[3],bottom[3])||!near(top[3],a.collider.w)||!near(top[4],a.collider.h)||!near(bottom[4],b.collider.h)||!near(gap,b.y-a.y-a.collider.h)) {issue('invalid','actual-pair-desynchronized-or-deformed');continue;}
      const q=r[1]-top[1],width=top[3],dx=Math.max(-q,0,q-width);
      let freeWidth=null,margin=null;
      if(dx<=R) {
        const expansion=Math.sqrt(Math.max(0,R*R-dx*dx)),lower=Math.max(R,top[2]+top[4]+expansion),upper=Math.min(map.height-R,bottom[2]-expansion);
        freeWidth=Math.max(0,upper-lower);margin=Math.min(r[2]-lower,upper-r[2]);widths.push(freeWidth);margins.push(margin);
      }
      valid.push({tick,q,width,freeWidth,margin,bodyX:top[1],x:r[1],y:r[2],vy:r[4],flapPrevious:on(r[6])});
    }
    const intervals={entryIntervals:[],coreIntervals:[],exitIntervals:[],occupancyIntervals:[]};
    const add=(list,start,end,bracket)=>{if(end-start<=EPS)return;const prior=list.at(-1);if(prior&&near(prior.endTick,start)){prior.endTick=end;prior.exitBracket=bracket;}else list.push({startTick:start,endTick:end,entryBracket:bracket,exitBracket:bracket});};
    for(let i=1;i<valid.length;i++) {
      const u=valid[i-1],v=valid[i];if(v.tick!==u.tick+1)continue;
      if(!near(v.x-u.x,VX/HZ)) {issues.push({tick:v.tick,status:'unsupported',reason:'actual-player-step-not-fixed-vx'});continue;}
      for(const [name,lo,hi] of [['entryIntervals',-R,0],['coreIntervals',0,u.width],['exitIntervals',u.width,u.width+R],['occupancyIntervals',-R,u.width+R]]) {
        const d=v.q-u.q;let start=0,end=1;
        // A plateau at q=0 or q=width belongs only to core.
        // Open shoulder boundaries prevent positive-duration double counting.
        if(d===0) {if(u.q<lo||u.q>hi||name==='entryIntervals'&&u.q===hi||name==='exitIntervals'&&u.q===lo)continue;}
        else {const aa=(lo-u.q)/d,bb=(hi-u.q)/d;start=Math.max(0,Math.min(aa,bb));end=Math.min(1,Math.max(aa,bb));}
        if(end>start) add(intervals[name],u.tick+start,u.tick+end,[u.tick,v.tick]);
      }
    }
    for(const list of Object.values(intervals)) for(const i of list) i.durationSeconds=(i.endTick-i.startTick)/HZ;
    const observedPartial={...intervals,validRows:valid.length,issues,observedMinPairFreeWidthPx:widths.length?Math.min(...widths):null,observedMinPlayerMarginPx:margins.length?Math.min(...margins):null};
    const priority=['invalid','unsupported','missing','censored'],problem=priority.find(s=>issues.some(i=>i.status===s));
    if(problem) return finish(problem,'incomplete-or-unsupported-actual-capture',{partialObservation:observedPartial});
    const first=valid[0],last=valid.at(-1),allBefore=valid.every(r=>r.q<-R),allAfter=valid.every(r=>r.q>r.width+R);
    if(allBefore) return finish('missing','not-reached-within-capture-window',{partialObservation:observedPartial});
    if(allAfter) return finish('missing','entry-before-capture-window',{partialObservation:observedPartial});
    if(!first||first.q>=-R||last.q<=last.width+R) return finish('censored','full-entry-and-exit-not-bracketed',{partialObservation:observedPartial});
    if(!intervals.coreIntervals.length || !intervals.entryIntervals.length || !intervals.exitIntervals.length) return finish('missing','entry-core-exit-not-observed',{partialObservation:observedPartial});
    const sum=name=>intervals[name].reduce((n,i)=>n+i.durationSeconds,0);
    const inputIntervals=intervals.occupancyIntervals.map(i=>{
      const startTick=Math.ceil(i.startTick),endTick=Math.floor(i.endTick);
      const rr=valid.filter(r=>r.tick>=startTick&&r.tick<=endTick);
      if(endTick<=startTick)return {status:'missing',reason:'no-complete-integer-command-interval',startTick:null,endTick:null,flapTicks:null,longestReleaseSeconds:null,yRangePx:rr.length?Math.max(...rr.map(r=>r.y))-Math.min(...rr.map(r=>r.y)):null,interpolatedOccupancyBounds:[i.startTick,i.endTick]};
      const ft=rr.filter(r=>r.flapPrevious&&r.tick-1>=Math.ceil(i.startTick)).map(r=>r.tick-1);let run=0,best=0;const fs=new Set(ft);
      for(let t=Math.ceil(i.startTick);t<Math.floor(i.endTick);t++){run=fs.has(t)?0:run+1;best=Math.max(best,run);}
      return {status:'observed',startTick,endTick,flapTicks:ft,longestReleaseSeconds:best/HZ,yRangePx:rr.length?Math.max(...rr.map(r=>r.y))-Math.min(...rr.map(r=>r.y)):null};
    });
    return finish('observed',null,{...intervals,coreDurationSeconds:sum('coreIntervals'),occupancyDurationSeconds:sum('occupancyIntervals'),
      minPairFreeWidthPx:widths.length?Math.min(...widths):null,minPlayerMarginPx:margins.length?Math.min(...margins):null,
      inputIntervals,sampledApertureStatus:margins.length?'observed':'missing',allCapturedSamplesInsideAperture:margins.length?margins.every(v=>v>0):null,validRows:valid.length,
      relativeProgressMonotone:valid.every((r,i)=>!i||r.q>valid[i-1].q),
      method:'all band intervals from adjacent actual live tuples; fractional boundaries linearly interpolated; pair-only circle-expanded aperture, not whole-map clearance or continuous collision proof'});
  });
  return {schema:OBSERVATION_VERSION,status:pairs.every(p=>p.status==='observed')?'observed':'incomplete',pairs,
    omissionPolicy:'Every declared pair is returned; missing windows/bodies/states are never zero or silently excluded',qualityClaim:false};
}

module.exports={OBSERVATION_VERSION,reduceObservations};
