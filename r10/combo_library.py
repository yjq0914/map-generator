#!/usr/bin/env python3
"""A file-backed combo design library. No generator execution or physics imports."""
from __future__ import annotations
import argparse, copy, hashlib, json, math, os, re, sys, tempfile
from pathlib import Path
import active_eligibility as active

ROOT=Path(__file__).resolve().parent
KINDS={'candidate':'candidates','family':'families','legacy':'legacy','evidence':'evidence','experiment':'experiments','round':'rounds'}
ID=re.compile(r'^[a-z][a-z0-9-]{1,95}$')
class Invalid(ValueError): pass

def read_json(path):
 def reject(x): raise Invalid(f'Non-finite JSON number: {x}')
 try: return json.loads(Path(path).read_text(),parse_constant=reject)
 except (OSError,json.JSONDecodeError) as e: raise Invalid(str(e)) from e

def canonical(value): return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False).encode()
def digest(value): return hashlib.sha256(canonical(value)).hexdigest()
def file_hash(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def key(record): return f"{record['id']}@{record['version']}"
def resolve(root,path):
 if not isinstance(path,str) or not path or '\\' in path: raise Invalid('Invalid path')
 rel=Path(path)
 if rel.is_absolute() or any(p in ('..','.') for p in rel.parts): raise Invalid('Path traversal rejected: '+path)
 out=(Path(root)/rel).resolve(); base=Path(root).resolve()
 if not out.is_relative_to(base): raise Invalid('Path/symlink escapes library: '+path)
 return out

def schema_check(value,schema,base,path='$'):
 """Evaluate the complete subset used in schemas/*.json; fail closed on unsupported keywords."""
 supported={'$schema','$defs','$ref','type','const','enum','required','properties','additionalProperties','items','minItems','minLength','pattern','minimum','exclusiveMinimum','oneOf','description','title'}
 unknown=set(schema)-supported
 if unknown: raise Invalid(f'{path}: unsupported schema keywords {sorted(unknown)}')
 if '$ref' in schema:
  filename,_,fragment=schema['$ref'].partition('#'); refschema=read_json(resolve(base,filename)) if filename else schema
  for part in fragment.strip('/').split('/') if fragment else []: refschema=refschema[part]
  return schema_check(value,refschema,base,path)
 if 'oneOf' in schema:
  successes=0
  for option in schema['oneOf']:
   try: schema_check(value,option,base,path); successes+=1
   except Invalid: pass
  if successes!=1: raise Invalid(f'{path}: expected exactly one valid alternative, got {successes}')
 def istype(t):
  return {'null':value is None,'boolean':isinstance(value,bool),'string':isinstance(value,str),'object':isinstance(value,dict),'array':isinstance(value,list),'number':isinstance(value,(int,float)) and not isinstance(value,bool),'integer':isinstance(value,int) and not isinstance(value,bool)}[t]
 if 'type' in schema:
  ts=schema['type'] if isinstance(schema['type'],list) else [schema['type']]
  if not any(istype(t) for t in ts): raise Invalid(f'{path}: expected {ts}')
 if 'const' in schema and (value!=schema['const'] or type(value)!=type(schema['const'])): raise Invalid(f'{path}: const mismatch')
 if 'enum' in schema and value not in schema['enum']: raise Invalid(f'{path}: invalid enum {value!r}')
 if isinstance(value,(int,float)) and not isinstance(value,bool):
  if not math.isfinite(value): raise Invalid(f'{path}: non-finite number')
  if 'minimum' in schema and value<schema['minimum']: raise Invalid(f'{path}: below minimum')
  if 'exclusiveMinimum' in schema and value<=schema['exclusiveMinimum']: raise Invalid(f'{path}: below exclusive minimum')
 if isinstance(value,str):
  if len(value)<schema.get('minLength',0): raise Invalid(f'{path}: empty string')
  if 'pattern' in schema and not re.search(schema['pattern'],value): raise Invalid(f'{path}: pattern mismatch')
 if isinstance(value,list):
  if len(value)<schema.get('minItems',0): raise Invalid(f'{path}: too few items')
  for i,item in enumerate(value): schema_check(item,schema.get('items',{}),base,f'{path}[{i}]')
 if isinstance(value,dict):
  for name in schema.get('required',[]):
   if name not in value: raise Invalid(f'{path}: missing {name}')
  props=schema.get('properties',{})
  if schema.get('additionalProperties') is False and set(value)-set(props): raise Invalid(f'{path}: unknown fields {sorted(set(value)-set(props))}')
  for name,item in value.items():
   if name in props: schema_check(item,props[name],base,f'{path}.{name}')

def source_check(root,source):
 p=resolve(root,source['path'])
 if not p.is_file(): raise Invalid('Missing source file: '+source['path'])
 if file_hash(p)!=source['sha256']: raise Invalid('Source hash mismatch: '+source['path'])

def load(root=ROOT):
 records={}
 for kind,directory in KINDS.items():
  for p in sorted((root/'records'/directory).glob('*.json')):
   # Validate path, schema, and filename before trusting an ID.
   resolve(root,str(p.relative_to(root)))
   r=read_json(p); schema_check(r,read_json(ROOT/'schemas'/f'{kind}.schema.json'),ROOT/'schemas')
   if r['kind']!=kind or p.name!=f"{r['id']}.v{r['version']}.json": raise Invalid(f'Kind/filename mismatch: {p.name}')
   if key(r) in records: raise Invalid('Duplicate record '+key(r))
   records[key(r)]=r
 return records

def durations(r):
 if 'duration' not in r:return
 a=r['duration']['authored']; mi,reco,ma=a['min_s'],a['recommended_s'],a['max_s']
 if reco is None:
  if r.get('kind')!='candidate':raise Invalid('Null authored recommendation is candidate-only: '+key(r))
  if mi is not None and ma is not None and mi>ma:raise Invalid('Authored duration ordering: '+key(r))
  return
 vals=reco if isinstance(reco,list) else [reco]
 if len(vals)>2 or vals!=sorted(vals):raise Invalid('Invalid recommended duration range')
 if mi is not None and min(vals)<mi or ma is not None and max(vals)>ma: raise Invalid('Authored duration ordering: '+key(r))

def getref(records,ref):
 k=key(ref)
 if k not in records: raise Invalid('Missing record reference: '+k)
 return records[k]

def validate(records,root=ROOT):
 for k,r in records.items():
  kind=r.get('kind')
  if kind not in KINDS: raise Invalid('Unknown record kind')
  schema_check(r,read_json(ROOT/'schemas'/f'{kind}.schema.json'),ROOT/'schemas')
  if k!=key(r): raise Invalid('Record key mismatch')
  for source in r['sources']:source_check(root,source)
  durations(r)
  for comp in r.get('components',[]):
   c=getref(records,comp)
   if c['kind'] not in ('candidate','family','legacy'): raise Invalid('Invalid component kind')
   if kind=='family' and c['kind']!='family':raise Invalid('Qualified nesting requires qualified families')
  for ref in r.get('evidence_refs',[])+r.get('review',{}).get('decision_refs',[]):
   if getref(records,ref)['kind']!='evidence':raise Invalid('Non-evidence reference')
  if kind=='round':
   for ref in r['candidate_refs']:
    if getref(records,ref)['kind']!='candidate':raise Invalid('Round candidate reference kind')
   for ref in r['review_refs']+r['decision_refs']:
    if getref(records,ref)['kind']!='evidence':raise Invalid('Round review reference kind')
  if kind=='family':validate_family(r,records,root)
 # Edges include inherited/nested references. DFS catches self-loops and indirect cycles.
 visiting=set();done=set()
 def visit(k):
  if k in visiting: raise Invalid('Cyclic nesting: '+k)
  if k in done:return
  visiting.add(k)
  for child in records[k].get('components',[]): visit(key(child))
  visiting.remove(k);done.add(k)
 for k in records:visit(k)
 return {'valid':True,'counts':{kind:sum(r['kind']==kind for r in records.values()) for kind in KINDS},'physics_executed':False}

def family_spec_digest(r):
 spec=copy.deepcopy(r);spec.pop('qualification',None);return digest(spec)

def validate_family(r,records,root):
 cand=getref(records,r['candidate_ref'])
 if cand['kind']!='candidate' or cand['status'] in ('rejected','archived'): raise Invalid('Promotion needs active candidate')
 if digest(cand)!=r['candidate_sha256']:raise Invalid('Candidate content binding mismatch')
 for ref in r['legacy_refs']:
  if getref(records,ref)['kind']!='legacy':raise Invalid('Invalid legacy reference')
 gen=r['generator']
 for source in [gen['source'],gen['runtime_source']]+gen['dependencies']:source_check(root,source)
 variant_ids=[v['variant_id'] for v in r['qualified_variants']]
 if len(set(variant_ids))!=len(variant_ids):raise Invalid('Duplicate qualified variant')
 if set(variant_ids)!=set(r['duration']['physically_qualified']['variant_ids']):raise Invalid('Physical duration domain mismatch')
 for v in r['qualified_variants']:
  schema_check(v['parameters'],gen['parameter_schema'],ROOT/'schemas',f"parameters.{v['variant_id']}")
  a=r['duration']['authored']
  if (a['min_s'] is not None and v['duration_s']<a['min_s']) or (a['max_s'] is not None and v['duration_s']>a['max_s']):raise Invalid('Qualified duration outside authored domain')
 needed={'static_validation','physical_validation','design_review','interface_validation'}
 refs=r['qualification']['evidence_refs']
 if len({key(x) for x in refs})!=len(refs):raise Invalid('Duplicate evidence reference')
 for variant in variant_ids:
  found=set()
  for ref in refs:
   e=getref(records,ref)
   if e['kind']!='evidence' or e['result']!='pass' or e['scope'] is None: raise Invalid('Qualification requires passing scoped evidence')
   scope=e['scope']
   if scope['family_spec_sha256']!=family_spec_digest(r):raise Invalid('Evidence family specification mismatch')
   for sid in scope['variant_ids']:
    v=next((v for v in r['qualified_variants'] if v['variant_id']==sid),None)
    if not v or scope['variant_sha256'].get(sid)!=digest(v):raise Invalid('Evidence variant content mismatch')
   if scope['candidate_ref']!=r['candidate_ref'] or scope['candidate_sha256']!=r['candidate_sha256'] or scope['runtime_sha256']!=gen['runtime_source']['sha256'] or scope['generator_sha256']!=gen['source']['sha256']: raise Invalid('Evidence identity/scope mismatch')
   if set(scope['variant_ids'])-set(variant_ids):raise Invalid('Evidence claims unlisted variants')
   if e['evidence_kind']=='design_review' and (not e['review_decision'] or e['review_decision']['decision']!='approve_scoped'):raise Invalid('Explicit scoped reviewer approval required')
   if variant in scope['variant_ids']:found.add(e['evidence_kind'])
  if needed-found:raise Invalid('Missing qualification evidence for '+variant+': '+','.join(sorted(needed-found)))

def index_data(records):
 return {'schema':'combo-library-index/1','generated_from':'validated immutable record files','physics_executed':False,
 'layers':{'candidate_design_archive':[k for k,r in sorted(records.items()) if r['kind']=='candidate'],
 'qualified_combo_families':[k for k,r in sorted(records.items()) if r['kind']=='family'],
 'legacy_limited':[k for k,r in sorted(records.items()) if r['kind']=='legacy'],
 'skill_scripts':{'guide':'SKILL.md','cli':'combo_library.py','operations':['select','vary','compose'],'limitations':['Qualified families only; exact tested variants only','Composition output remains an unvalidated candidate; no generator or physics is executed']}},
 'round_refs':[k for k,r in sorted(records.items()) if r['kind']=='round'],
 'experiment_refs':[k for k,r in sorted(records.items()) if r['kind']=='experiment'],
 'records':{k:{'kind':r['kind'],'status':r['status'],'title':r['title'],'sha256':digest(r),'path':f"records/{KINDS[r['kind']]}/{r['id']}.v{r['version']}.json"} for k,r in sorted(records.items())}}

def atomic_json(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.write-')
 try:
  with os.fdopen(fd,'w') as f:json.dump(value,f,ensure_ascii=False,indent=2,allow_nan=False);f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)

def reindex(root,records):
 validate(records,root);atomic_json(resolve(root,'index.json'),index_data(records))

def write_record(root,r):
 records=load(root);k=key(r)
 if k in records:
  if records[k]==r:
   if r['kind']=='family':active.require_record(r,records,root)
   return {'unchanged':k}
  raise Invalid('Immutable version exists; increase version')
 records[k]=r;validate(records,root)
 if r['kind']=='family':active.require_record(r,records,root)
 p=resolve(root,f"records/{KINDS[r['kind']]}/{r['id']}.v{r['version']}.json")
 atomic_json(p,r);reindex(root,records)
 return {'written':k,'sha256':digest(r)}

def qualified(records,root=ROOT):return [r for r in records.values() if r['kind']=='family' and r['status']=='qualified_scoped' and active.record_eligibility(r,records,root)['active']]
def select(records,duration=None,root=ROOT):
 return [{'family':key(r),'title':r['title'],'variants':[v for v in r['qualified_variants'] if duration is None or v['duration_s']==duration],'limitations':r['qualification']['limitations']} for r in qualified(records,root) if duration is None or any(v['duration_s']==duration for v in r['qualified_variants'])]

def vary(records,family_key,variant_id,root=ROOT):
 r=records.get(family_key)
 if not r or r['kind']!='family' or r['status']!='qualified_scoped':raise Invalid('Variation requires a qualified family')
 try:active.require_record(r,records,root)
 except active.EligibilityError as e:raise Invalid(str(e)) from e
 v=next((v for v in r['qualified_variants'] if v['variant_id']==variant_id),None)
 if not v:raise Invalid('Variant not explicitly qualified; record a new candidate instead')
 return {'status':'qualified_recipe_reference','family':family_key,'variant':v,'generator_executed':False,'limitations':r['qualification']['limitations']}

def compose(records,keys,root=ROOT):
 if not keys:raise Invalid('Composition needs families')
 recipes=[]
 for token in keys:
  family_id,sep,variant_id=token.partition(':')
  if not sep:raise Invalid('Use family-id@version:variant-id')
  recipes.append(vary(records,family_id,variant_id,root))
 joins=[]
 for i in range(len(recipes)-1):
  left,right=recipes[i],recipes[i+1]
  # Equality is only a declaration check, never an executable bridge or seam qualification.
  a,b=left['variant']['exit_contract'],right['variant']['entry_contract']
  joins.append({'from':left['family'],'to':right['family'],'declared_contract_match':a==b,'requires_interface_validation':True,'constraints':records[left['family']]['adjacency_constraints']+records[right['family']]['adjacency_constraints']})
 return {'status':'unvalidated_composition_plan','recipes':recipes,'joins':joins,'duration_s':sum(x['variant']['duration_s'] for x in recipes),'duration_note':'Sum before authored bridge/recovery changes; not a qualified duration','requires':['candidate archive record','bridge/state carry design','nested DAG validation','full composition physical and design review'],'generator_executed':False,'qualification_transferred':False}

def main(argv=None):
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=ROOT)
 sub=p.add_subparsers(dest='command',required=True)
 for name in ['validate','index','list','eligibility']:sub.add_parser(name)
 q=sub.add_parser('read');q.add_argument('record_key')
 for name in ['write','promote']:q=sub.add_parser(name);q.add_argument('file',type=Path)
 q=sub.add_parser('select');q.add_argument('--duration',type=float)
 q=sub.add_parser('vary');q.add_argument('family');q.add_argument('variant')
 q=sub.add_parser('compose');q.add_argument('families',nargs='+')
 args=p.parse_args(argv);root=args.root.resolve()
 try:
  if args.command in ('write','promote'):
   r=read_json(args.file)
   if args.command=='promote' and r.get('kind')!='family':raise Invalid('Promote accepts family proposals only')
   result=write_record(root,r)
  else:
   records=load(root);validation=validate(records,root)
   if args.command=='validate':
    result=validation
    ip=root/'index.json'
    if ip.exists() and read_json(ip)!=index_data(records):raise Invalid('Index stale: run index')
   elif args.command=='index':reindex(root,records);result=validation
   elif args.command=='list':result=[{'key':k,'kind':r['kind'],'status':r['status'],'title':r['title']} for k,r in sorted(records.items())]
   elif args.command=='read':
    if args.record_key not in records:raise Invalid('Unknown record '+args.record_key)
    result=records[args.record_key]
   elif args.command=='eligibility':result={'policy':active.policy(),'scope':'Active-use overlay; historical qualification records unchanged','families':{key(r):active.record_eligibility(r,records,root) for r in records.values() if r['kind']=='family'}}
   elif args.command=='select':result={'matches':select(records,args.duration,root),'no_fallback_to_candidates_or_legacy':True,'active_eligibility_policy':active.policy()}
   elif args.command=='vary':result=vary(records,args.family,args.variant,root)
   else:result=compose(records,args.families,root)
  print(json.dumps(result,ensure_ascii=False,indent=2));return 0
 except (Invalid,KeyError,TypeError,ValueError) as e:
  print(json.dumps({'error':str(e),'physics_executed':False},ensure_ascii=False),file=sys.stderr);return 2
if __name__=='__main__':sys.exit(main())
