'use strict';
// Static construction prototype. Plans every recipe on exact B, never on a
// previously edited map. No outcome, mutable pointer, or engine-pose reads.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const same = require('node:util').isDeepStrictEqual;
const B = require('./b005-stage-recovery.cjs');
const H = require('./b007-relocated-hammer.cjs');
const T = require('./b008-timed-aperture.cjs');
const J = require('./b010-warning-burst.cjs');
const F = require('./vendor/engine/core.js');
const Contract = require('./vendor/contract.cjs');
const U = require('./recovery-utils.cjs');
const Canon = require('./recovery-canonical.cjs');
const Selector = require('./proposal-request-selector.cjs');
const clone = structuredClone;
const freeze = x => { if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };
const hash = x => crypto.createHash('sha256').update(typeof x === 'string' || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest('hex');
const need = (x, s) => { if (!x) throw Error('Recipe composer: ' + s); };
const root = path.join(__dirname, '..');
const CONFIG = freeze(require('./configs/proposal-recipe-composer-v1.json'));
const VERSION = 'exact-b005-disjoint-recipe-set-prototype/1';
const RECIPE_IDS = Object.freeze(['H', 'J', 'T']);
const ownFiles = ['source/proposal-recipe-composer.cjs', 'source/proposal-request-selector.cjs', 'source/configs/proposal-recipe-composer-v1.json'];
const expected = {...CONFIG.dependencies, ...Object.fromEntries(ownFiles.map(f => [f, hash(fs.readFileSync(path.join(root, f)))]))};
const sourceIdentity = hash(expected), stamps = new Map(), cache = new Map(), CAP = 8;
const stats = { builds: 0, hits: 0, constructions: 0, sourceChecks: 0 };
function dependencies() {
  stats.sourceChecks++;
  for (const [file, digest] of Object.entries(expected)) {
    const p = path.join(root, file), s = fs.statSync(p, {bigint: true});
    const stamp = [s.dev, s.ino, s.size, s.mtimeNs, s.ctimeNs].join(':');
    if (stamps.get(file) !== stamp) { need(hash(fs.readFileSync(p)) === digest, 'immutable dependency changed: ' + file); stamps.set(file, stamp); }
  }
  need(same(CONFIG.inheritedGeometryForms, ['B', 'H', 'T', 'J', 'HT', 'HJT']), 'inherited geometry frontier changed');
  need(same(CONFIG.unqualifiedForms, ['HJ', 'JT']), 'experimental frontier changed');
  const baseline=JSON.parse(fs.readFileSync(path.join(root,'protocols/BASELINE-ACCEPTED.json'),'utf8'));
  need(baseline.round==='b012','immutable inherited baseline changed');
  return sourceIdentity;
}
function recipes(input) {
  need(Array.isArray(input) && input.length <= RECIPE_IDS.length && input.every(r => RECIPE_IDS.includes(r)), 'unknown recipe or unsupported recipe list');
  need(new Set(input).size === input.length, 'duplicate recipe');
  return [...input].sort();
}
const keyOf = rs => rs.join('') || 'B';
const allSubsets = () => Array.from({length: 1 << RECIPE_IDS.length}, (_, n) => RECIPE_IDS.filter((_, i) => n & (1 << i)));
function admission(input = {mode: 'inherited-geometry-only'}) {
  need(input && same(Object.keys(input), ['mode']) && ['inherited-geometry-only', 'experimental-static'].includes(input.mode), 'unsupported admission mode');
  return clone(input);
}
function unique(items, field, id) { const found = items.filter(x => x[field] === id); need(found.length === 1, 'missing/duplicate stable ID: ' + id); return found[0]; }
function identity(m) { return {id:m.id, mapId:m.mapId, generatorVersion:m.design.generatorVersion, qualification:m.design.qualification}; }
function setIdentity(m, v) { m.id=v.id; m.mapId=v.mapId; m.design.generatorVersion=v.generatorVersion; m.design.qualification=v.qualification; }
function componentAfter(base, i, relation) { const c=clone(base.components[i]); c.relations.push(clone(relation)); return c; }
function recordRead(o) { return {resource:'obstacles/'+o.id, beforeHash:hash(o)}; }
function adapt(base, recipe, p) {
  let i, before, after, component, expressionBefore, expressionAfter, declarations, pressure=[], protectedBodies, contextOwners;
  if (recipe === 'H') {
    i=p.componentIndex; before=[p.before]; after=[p.after]; component=componentAfter(base,i,p.effects.relationAppend);
    expressionBefore=p.effects.expressionBefore; expressionAfter=p.effects.expressionAfter;
    declarations={hammerProgram:p.effects.hammerProgram, relocatedHammerProgram:p.effects.bindingProgram};
    protectedBodies=[p.phrase.receiver,...p.phrase.remainingIslands,...p.phrase.successor.firstDemandBodies];
    contextOwners=[p.phrase.predecessor.componentIndex,p.phrase.successor.componentIndex];
  } else if (recipe === 'T') {
    i=p.phrase.componentIndex; before=p.before; after=[p.after]; component=p.componentAfter;
    expressionBefore=p.expressionBefore; expressionAfter=p.expressionAfter; declarations={timedApertureProgram:p.apertureProgram};
    pressure=[{before:p.apertureProgram.replacedPressureRecord, after:null}];
    protectedBodies=[...p.phrase.pairs.flatMap(x=>[x.top,x.bottom]).filter(o=>!before.some(b=>b.id===o.id)),...p.phrase.receivers.map(x=>x.descriptor),...p.phrase.tail,...p.phrase.recovery];
    contextOwners=[];
  } else if (recipe === 'J') {
    i=p.componentIndex; before=[p.before]; after=[p.after]; component=componentAfter(base,i,p.effects.relation);
    expressionBefore=p.effects.expressionBefore; expressionAfter=p.effects.expressionAfter; declarations={burstProgram:p.effects.program};
    protectedBodies=[p.effects.program.phrase.previous,p.effects.program.phrase.receiver,...p.effects.program.phrase.successor.firstDemandBodies];
    contextOwners=[p.effects.program.phrase.successor.componentIndex];
  } else { need(false,'unknown adapter'); }
  const writeResources=[...before.map(o=>'obstacles/'+o.id),...after.filter(o=>!before.some(b=>b.id===o.id)).map(o=>'obstacles/'+o.id),'components/'+i,'design.stageRecoveryProgram.actualExpressions/'+i,...Object.keys(declarations).map(k=>'design/'+k),...pressure.map(q=>'design.pressureProgram.pairRecords/'+q.before.pairId)];
  return {
    recipe, originalPatchHash:hash(p), baseSnapshotHash:hash(base),
    baseReadScope:'complete exact B; original legacy resolver and full patch are recomputed, never relabeled as reads of C',
    strictReads:protectedBodies.map(recordRead), contextReads:contextOwners.map(n=>({componentIndex:n,beforeHash:hash(base.components[n]),policy:'refresh-current-context; dynamic consequence requires new evidence'})),
    writeResources, obstacleEdits:[{before:clone(before),after:clone(after)}],
    componentEdit:{index:i,before:clone(base.components[i]),after:clone(component)},
    expressionEdit:{index:i,before:clone(expressionBefore),after:clone(expressionAfter)},
    pressureEdits:clone(pressure), declarations:clone(declarations)
  };
}
function resource(base, name) {
  if (name.startsWith('obstacles/')) return unique(base.obstacles,'id',name.slice(10));
  need(false,'unsupported strict-read resource');
}
function derivedWriteResources(p) {
  return [...p.obstacleEdits.flatMap(e=>[...e.before.map(o=>'obstacles/'+o.id),...e.after.filter(o=>!e.before.some(b=>b.id===o.id)).map(o=>'obstacles/'+o.id)]),
    'components/'+p.componentEdit.index,'design.stageRecoveryProgram.actualExpressions/'+p.expressionEdit.index,
    ...Object.keys(p.declarations).map(k=>'design/'+k),...p.pressureEdits.map(e=>'design.pressureProgram.pairRecords/'+e.before.pairId)];
}
function checkDisjoint(base, edits) {
  const writers=new Map(), readChanges=[];
  need(new Set(edits.map(p=>p.recipe)).size===edits.length,'duplicate recipe writer');
  for(const p of edits) {
    need(p.baseSnapshotHash===hash(base),'patch base read mismatch');
    need(same(p.writeResources,derivedWriteResources(p)),'write resources do not cover exact declared edits');
    need(p.componentEdit.index===p.expressionEdit.index,'component/expression owner mismatch');
    need(new Set(p.writeResources).size===p.writeResources.length,'duplicate write within recipe');
    for(const name of p.writeResources) { need(!writers.has(name),'write/write conflict: '+name); writers.set(name,p.recipe); }
    for(const e of p.obstacleEdits) {
      need(e.before.length>0 && e.after.length>0,'unsupported empty splice');
      const indices=e.before.map(o=>base.obstacles.findIndex(q=>q.id===o.id));
      need(indices.every((j,k)=>j>=0 && (k===0 || j===indices[0]+k)),'before source sequence not contiguous');
      e.before.forEach(o=>need(same(unique(base.obstacles,'id',o.id),o),'before descriptor mismatch'));
    }
    need(same(base.components[p.componentEdit.index],p.componentEdit.before),'component before mismatch');
    need(same(base.design.stageRecoveryProgram.actualExpressions[p.expressionEdit.index],p.expressionEdit.before),'expression before mismatch');
    p.pressureEdits.forEach(e=>need(same(unique(base.design.pressureProgram.pairRecords,'pairId',e.before.pairId),e.before),'pressure before mismatch'));
    Object.keys(p.declarations).forEach(k=>need(!Object.hasOwn(base.design,k),'metadata overwrite outside empty declaration slot'));
    p.strictReads.forEach(r=>need(hash(resource(base,r.resource))===r.beforeHash,'strict read descriptor mismatch'));
  }
  for(const p of edits) {
    for(const r of p.strictReads) need(!writers.has(r.resource) || writers.get(r.resource)===p.recipe,'write/read conflict: '+r.resource);
    for(const r of p.contextReads) {
      need(hash(base.components[r.componentIndex])===r.beforeHash,'context read mismatch');
      const writer=writers.get('components/'+r.componentIndex);
      if(writer && writer!==p.recipe) readChanges.push({reader:p.recipe,writer,componentIndex:r.componentIndex,policy:r.policy});
    }
  }
  return {writeResourceCount:writers.size,changedContextReads:readChanges.sort((a,b)=>a.reader.localeCompare(b.reader)||a.componentIndex-b.componentIndex),scope:'disjoint writes and protected descriptor reads only; full legacy read sets overlap and remain B provenance'};
}
function runtimeIds(map) {
  const seen=new Set(), ids=[];
  for(const o of map.obstacles) {
    let derived=[];
    if(o.mechanic_kind==='timed_armor_gate') derived=[o.id+':top',o.id+':bottom'];
    if(o.mechanic_kind==='swing_armor_hammer') derived=[o.id+':arm'];
    if(o.mechanic_kind==='burst_turret') {
      const b=map.design.burstProgram;
      need(b && b.sourceId===o.id && b.expectedShots.length===o.timeline.count,'burst runtime identity declaration mismatch');
      derived=b.expectedShots.map((q,j)=>{need(q.id===o.id+':wave0:shot'+j,'unexpected derived projectile ID');return q.id;});
    }
    for(const id of [o.id,...derived]) { need(!seen.has(id),'source/derived runtime ID collision: '+id); seen.add(id); ids.push(id); }
  }
  return ids;
}
function currentContexts(map, patches, selected) {
  const contexts={};
  for(const r of selected) {
    const p=patches[r], i=r==='T'?p.phrase.componentIndex:p.componentIndex;
    const source=p.after, sourceId=source.id;
    const context={role:'current-effective-context',basePatchHash:hash(p),component:clone(map.components[i]),source:clone(unique(map.obstacles,'id',sourceId)),routesHash:hash(map.routes)};
    if(r==='H') { context.predecessor=clone(map.components[p.phrase.predecessor.componentIndex]); context.successor=clone(map.components[p.phrase.successor.componentIndex]); }
    if(r==='J') { const n=p.effects.program.phrase.successor.componentIndex; context.successor=clone(map.components[n]); context.successorFirstDemandBodies=p.effects.program.phrase.successor.firstDemandBodies.map(o=>clone(unique(map.obstacles,'id',o.id))); }
    contexts[r]=context;
  }
  return contexts;
}
function applyEdits(base, edits) {
  const out=clone(base), bySource=new Map(), skip=new Set();
  for(const p of edits) for(const e of p.obstacleEdits) { bySource.set(e.before[0].id,e); e.before.slice(1).forEach(o=>skip.add(o.id)); }
  out.obstacles=base.obstacles.flatMap(o=>bySource.has(o.id)?clone(bySource.get(o.id).after):skip.has(o.id)?[]:[clone(o)]);
  for(const p of edits) {
    out.components[p.componentEdit.index]=clone(p.componentEdit.after);
    out.design.stageRecoveryProgram.actualExpressions[p.expressionEdit.index]=clone(p.expressionEdit.after);
    for(const e of p.pressureEdits) out.design.pressureProgram.pairRecords=out.design.pressureProgram.pairRecords.filter(q=>q.pairId!==e.before.pairId);
    // Deterministic metadata field insertion independent of recipe evaluation order.
  }
  const fields=edits.flatMap(p=>Object.entries(p.declarations)).sort(([a],[b])=>a.localeCompare(b));
  fields.forEach(([k,v])=>out.design[k]=clone(v)); out.design.components=out.components;
  return out;
}
function restorePressureRecords(current, baseline, removed) {
  const ids=current.map(q=>q.pairId), baseIds=baseline.map(q=>q.pairId);
  need(new Set(ids).size===ids.length,'duplicate pressure ID before inverse');
  need(new Set(baseIds).size===baseIds.length,'duplicate baseline pressure ID');
  const restored=new Map(current.map(q=>[q.pairId,clone(q)]));
  for(const q of removed) { need(!restored.has(q.pairId),'removed pressure record already present during inverse'); restored.set(q.pairId,clone(q)); }
  need(same([...restored.keys()].sort(),[...baseIds].sort()),'undeclared or missing pressure ID during inverse');
  const out=baseIds.map(id=>restored.get(id));
  need(same(out,baseline),'pressure inverse record differs from complete baseline');
  return out;
}
function undoEdits(map, base, edits) {
  const out=clone(map), bySource=new Map(), skip=new Set();
  for(const p of edits) for(const e of p.obstacleEdits) { bySource.set(e.after[0].id,e); e.after.slice(1).forEach(o=>skip.add(o.id)); }
  out.obstacles=out.obstacles.flatMap(o=>bySource.has(o.id)?clone(bySource.get(o.id).before):skip.has(o.id)?[]:[o]);
  for(const p of edits) {
    out.components[p.componentEdit.index]=clone(p.componentEdit.before);
    out.design.stageRecoveryProgram.actualExpressions[p.expressionEdit.index]=clone(p.expressionEdit.before);
    Object.keys(p.declarations).forEach(k=>delete out.design[k]);
  }
  out.design.pressureProgram.pairRecords=restorePressureRecords(out.design.pressureProgram.pairRecords,base.design.pressureProgram.pairRecords,edits.flatMap(p=>p.pressureEdits.map(e=>e.before)));
  out.design.components=out.components; delete out.design.recipeSetProgram; setIdentity(out,identity(base)); return out;
}
function facts(input={}) {
  dependencies(); const condition=H.entry(input), key=hash(condition);
  if(cache.has(key)) { stats.hits++; return cache.get(key); }
  stats.builds++; const base=B.generate(B.CONFIG,condition);
  const patches={H:H.planHammerPatch(base,H.resolvePhrase(base)),T:T.planPatch(base),J:J.planPatch(base)};
  const edits=Object.fromEntries(RECIPE_IDS.map(r=>[r,adapt(base,r,patches[r])]));
  need(new Set(Object.values(edits).map(e=>e.componentEdit.index)).size===3,'recipes must have distinct structural owners');
  const sites=Object.fromEntries(RECIPE_IDS.map(r=>[r,Selector.summarizeSite(base,r,patches[r])]));
  const f=freeze({condition,base,baseMapHash:hash(base),patches,edits,sites});
  if(cache.size>=CAP) cache.delete(cache.keys().next().value); cache.set(key,f); return f;
}
function makePlan(f, selected, mode) {
  const rs=recipes(selected), a=admission(mode), key=keyOf(rs);
  const inherited=CONFIG.inheritedGeometryForms.includes(key);
  need(inherited || a.mode==='experimental-static','unqualified recipe subset '+key+' requires later evidence; experimental-static preview only');
  const edits=rs.map(r=>clone(f.edits[r])), conflict=checkDisjoint(f.base,edits);
  return {schema:VERSION,sourceIdentity,condition:clone(f.condition),baseMapHash:f.baseMapHash,recipes:rs,subsetKey:key,admission:a,edits,conflict,
    qualification:{construction:'static prototype',inheritedGeometryForm:inherited?key:null,freshPhysicalEvidence:false,newSubsetPending:!inherited,arbitraryRecipeLibrary:false,actionOrder:'selected sites retain geometric time order; input enumeration order only is invariant',humanFun:null}};
}
function materialize(f, plan) {
  stats.constructions++; const out=applyEdits(f.base,plan.edits);
  if(plan.recipes.length) {
    const id='proposal-recipe-set-'+plan.subsetKey+'-'+f.base.seed;
    setIdentity(out,{id,mapId:id,generatorVersion:VERSION,qualification:'Experimental construction; qualification requires external evidence and exact source admission'});
    out.design.recipeSetProgram={schema:VERSION,sourceIdentity,baseMapHash:f.baseMapHash,recipes:clone(plan.recipes),subsetKey:plan.subsetKey,patchHashes:Object.fromEntries(plan.recipes.map(r=>[r,hash(f.patches[r])])),conflicts:clone(plan.conflict),effectiveContexts:currentContexts(out,f.patches,plan.recipes),qualification:clone(plan.qualification)};
  }
  need(same(undoEdits(out,f.base,plan.edits),f.base),'inverse failed: undeclared writes');
  // Exact inverse proves all protected global fields and nonselected bodies.
  need(same(out.routes,f.base.routes)&&same(out.design.componentTimeline,f.base.design.componentTimeline),'routes/absolute time changed');
  runtimeIds(out); F.validate(out); U.assertFiniteTree(out); ['main','branch'].forEach(r=>Contract.validate(out,r));
  return out;
}
function generateParent(input={}) { return clone(facts(input).base); }
function inspect(input={}) { const f=facts(input); return {sourceIdentity,condition:clone(f.condition),baseMapHash:f.baseMapHash,sites:clone(f.sites),edits:clone(f.edits),subsets:allSubsets().map(rs=>({key:keyOf(rs),recipes:rs,inheritedGeometry:CONFIG.inheritedGeometryForms.includes(keyOf(rs))}))}; }
function planProgram(base, selected, mode) { const f=facts(base?.condition); need(same(base,f.base),'requires complete exact B'); return makePlan(f,selected,mode); }
function mergeChecked(base, plan) { const f=facts(base?.condition); need(same(base,f.base),'requires complete exact B'); const canonical=makePlan(f,plan?.recipes,plan?.admission); need(same(plan,canonical),'modified plan/patch/read/write-set or unknown field'); return materialize(f,canonical); }
function auditEditOrder(base, plan, order) {
  const f=facts(base?.condition), canonical=makePlan(f,plan?.recipes,plan?.admission);
  need(same(base,f.base)&&same(plan,canonical),'order audit requires exact base and plan');
  need(same(recipes(order),canonical.recipes),'order audit requires one permutation of selected recipes');
  const shuffled=order.map(r=>canonical.edits.find(p=>p.recipe===r));
  checkDisjoint(f.base,shuffled);
  const actual=applyEdits(f.base,shuffled), expected=applyEdits(f.base,canonical.edits);
  need(same(actual,expected)&&hash(actual)===hash(expected),'raw edit application order changed map');
  need(same(undoEdits(actual,f.base,shuffled),f.base),'shuffled edit inverse failed');
  return true;
}
function compose(input, selected, mode) { const f=facts(input), plan=makePlan(f,selected,mode), map=materialize(f,plan); return {schema:'disjoint-recipe-composition-envelope/1',sourceIdentity,mapHash:hash(map),plan,map}; }
function reverseChecked(map, plan) { const f=facts(map?.condition), canonical=makePlan(f,plan?.recipes,plan?.admission); need(same(plan,canonical)&&same(map,materialize(f,canonical)),'cannot reverse mutated map/plan'); const out=undoEdits(map,f.base,canonical.edits); need(same(out,f.base),'reverse differs from exact B'); return out; }
function compile(input, request, mode) {
  const f=facts(input), a=admission(mode);
  const selection=Selector.select(allSubsets().map(rs=>({key:keyOf(rs),recipes:rs})),f,request,form=>a.mode==='experimental-static'||CONFIG.inheritedGeometryForms.includes(form.key));
  const envelope=compose(input,selection.selectedRecipes,a); envelope.selection=selection; return envelope;
}
function physicalContract(map) { return Canon.physicalContract(map); }
module.exports={CONFIG,VERSION,RECIPE_IDS,sourceIdentity,hash,dependencies,generateParent,inspect,planProgram,mergeChecked,auditEditOrder,compose,reverseChecked,compile,physicalContract,checkDisjoint,runtimeIds,restorePressureRecords,cacheStats:()=>({...stats,entries:cache.size,capacity:CAP})};
