'use strict';
// Reference generator adapter. It reads conditions/config only; no experiment evidence.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),K=require('./vendor/compiler.cjs'),F=require('./vendor/engine/core.js');
const read=id=>JSON.parse(fs.readFileSync(path.join(__dirname,'rules',id+'.json'),'utf8'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function verifyRules(){
 const index=read('rule-index'),seen=new Map(),active=new Set();
 function check(id){
  if(active.has(id))throw Error('Cyclic rule dependencies');if(seen.has(id))return seen.get(id);
  const r=read(id),pin=index.rules.find(p=>p.ruleId===id);
  if(!pin||pin.version!==r.version||hash(r)!==pin.sha256)throw Error('Rule dependency hash/version mismatch '+id);
  if(!['combo','stage','whole'].includes(r.level))throw Error('Unsupported rule level');
  if((r.parentRules||[]).length!==(pin.parentRuleRefs||[]).length)throw Error('Unpinned rule dependencies');
  active.add(id);for(const p of pin.parentRuleRefs||[]){if(!(r.parentRules||[]).includes(p.ruleId))throw Error('Unpinned parent');const dep=check(p.ruleId);if(dep.version!==p.version||hash(dep)!==p.sha256)throw Error('Dependency pin mismatch');}active.delete(id);seen.set(id,r);return r;
 }
 check('r14-whole');
 return {root:seen.get('r14-whole'),deep:seen.get('r06-wave'),press:seen.get('r08-mechanical'),close:seen.get('r09-wave')};
}
function generate(config,e={},options={}){
 const verified=verifyRules(),rules=verified;
 if(!K.accepts(verified.root,e))throw Error('Outside declared finite reference domain');
 const pattern=[{key:'deep'},{key:'press'},{key:'deep'},{key:'press'},{key:'press'},{key:'close',swap:true},{key:'deep'},{key:'press',swap:true},{key:'deep'},{key:'press'},{key:'close'},{key:'close'}];
 const level=options.level||'whole';if(!['whole','stage'].includes(level))throw Error('Unsupported generation level');const entries=level==='whole'?pattern:pattern.slice(0,4);
 const m=K.compile(entries.map(x=>({rule:rules[x.key],swap:!!x.swap})),e,true,{level,name:'reference-generator',phaseProgression:config.phaseProgression!==false});
 m.seed=e.seed??20261004;m.design.generatorVersion=config.version;m.design.referenceQualification='historical observed-goal evidence only; not full-contract certified';m.design.generatorBatchTarget=true;
 const allowed=verified.root.predicate.mechanismsAllowed,aliases={fixed_armor_or_spike:'fixed',vertical_armor_slider:'vertical-slider'};if(m.obstacles.some(o=>!allowed.includes(aliases[o.mechanic_kind])))throw Error('Mechanism outside declared rule domain');
 F.validate(m);return m;
}
module.exports={generate,verifyRules};
