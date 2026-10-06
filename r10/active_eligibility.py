"""Versioned active-use overlay. Never edits or invalidates historical records."""
from __future__ import annotations
import hashlib,json
from pathlib import Path

POLICY_PATH=Path(__file__).resolve().with_name('active-eligibility-policy.json')
_SOURCE_DOCUMENTS={}
class EligibilityError(ValueError):pass

def policy():
 try:
  raw=POLICY_PATH.read_bytes();p=json.loads(raw)
  if p['schema']!='combo-active-eligibility-policy/1' or type(p['version']) is not int or p['version']<1:raise ValueError('Invalid policy version')
  if not isinstance(p['excluded_mechanics'],list) or not p['excluded_mechanics'] or any(not isinstance(x,str) for x in p['excluded_mechanics']):raise ValueError('Invalid excluded mechanics')
 except (OSError,ValueError,KeyError,TypeError) as e:raise EligibilityError('Active eligibility policy unavailable or invalid') from e
 return {'policy':f"{p['id']}@{p['version']}",'sha256':hashlib.sha256(raw).hexdigest(),'excluded_mechanics':p['excluded_mechanics'],'inactive_provider_ids':p.get('inactive_provider_ids',[])}

def mechanics(value):
 """Inspect descriptor fields, not prose, filenames, runtime code or 'core_shift'."""
 out=set()
 def walk(v):
  if isinstance(v,dict):
   for k,x in v.items():
    if k=='mechanic_kind' and isinstance(x,str):out.add(x)
    elif k in ('mechanic','mechanics'):
     if isinstance(x,str):out.add(x)
     elif isinstance(x,list):out.update(y for y in x if isinstance(y,str))
    walk(x)
  elif isinstance(v,list):
   for x in v:walk(x)
  elif isinstance(v,str) and v.lstrip().startswith(('{','[')):
   try:walk(json.loads(v))
   except (ValueError,RecursionError):pass
 walk(value);return out

def require_mechanics(value,label='descriptor'):
 p=policy();blocked=sorted(mechanics(value)&set(p['excluded_mechanics']))
 if blocked:raise EligibilityError(f"Inactive under {p['policy']}: {label} contains {', '.join(blocked)}")
 return p

def provider_eligibility(provider):
 p=policy();declared=provider.get('mechanics')
 if not isinstance(declared,list) or not declared or any(not isinstance(x,str) for x in declared):raise EligibilityError('Provider mechanic declaration required')
 blocked=sorted(set(declared)&set(p['excluded_mechanics']))
 return {**p,'active':not blocked and provider['id'] not in p['inactive_provider_ids'],'excluded_mechanics_present':blocked}

def _source_json(root,source):
 rel=source.get('path');base=Path(root).resolve()
 if not isinstance(rel,str) or Path(rel).is_absolute() or '..' in Path(rel).parts:raise EligibilityError('Invalid active source path')
 p=(base/rel).resolve()
 if not p.is_relative_to(base):raise EligibilityError('Active source escapes library')
 try:raw=p.read_bytes()
 except OSError as e:raise EligibilityError('Missing active source: '+rel) from e
 if hashlib.sha256(raw).hexdigest()!=source.get('sha256'):raise EligibilityError('Active source hash mismatch: '+rel)
 if p.suffix!='.json':return None
 if source['sha256'] in _SOURCE_DOCUMENTS:return _SOURCE_DOCUMENTS[source['sha256']]
 try:
  d=json.loads(raw)
  _SOURCE_DOCUMENTS[source['sha256']]=d
  return d
 except ValueError as e:raise EligibilityError('Invalid active JSON source: '+rel) from e

def record_eligibility(record,records,root):
 p=policy();excluded=set(p['excluded_mechanics']);reasons=[];visited=set();visiting=set();maps=[]
 def visit(r):
  k=f"{r['id']}@{r['version']}"
  if k in visiting:raise EligibilityError('Active component cycle: '+k)
  if k in visited:return
  visiting.add(k)
  for m in sorted(mechanics(r)&excluded):reasons.append(k+' contains '+m)
  native=[]
  for s in r.get('sources',[]):
   # Code can support excluded mechanics without a map instantiating them.
   if not str(s.get('path','')).endswith('.json'):continue
   d=_source_json(root,s)
   selected=d
   # Shared concept bundles are history, not implicit membership in every sibling.
   if isinstance(d,dict):
    for field in ('candidates','concepts'):
     if isinstance(d.get(field),list):
      payload=r.get('source_payload',{})
      ids={x for x in [s.get('original_id'),payload.get('id'),payload.get('key')] if x is not None}
      matches=[x for x in d[field] if isinstance(x,dict) and x.get('id',x.get('key')) in ids]
      if matches:selected=matches
   for m in sorted(mechanics(selected)&excluded):reasons.append(k+' source '+s['path']+' contains '+m)
   if isinstance(d,dict) and d.get('schema')=='flappy-loop-lab/1':
    if not isinstance(d.get('obstacles'),list) or any(not isinstance(o,dict) or not isinstance(o.get('mechanic_kind'),str) for o in d['obstacles']):
     reasons.append(k+' has an unauditable native-map descriptor '+s['path']);continue
    native.append((s,d))
    for m in sorted(mechanics(d)&excluded):reasons.append(k+' map '+s['path']+' contains '+m)
  if r.get('kind')=='family':
   for v in r.get('qualified_variants',[]):
    matches={s['sha256']:(s,d) for s,d in native if s.get('original_id')==v['variant_id']}
    if len(matches)!=1:reasons.append(k+':'+v['variant_id']+' lacks one exact native-map source binding')
    else:
     s,d=next(iter(matches.values()));maps.append({'family':k,'variant':v['variant_id'],'path':s['path'],'sha256':s['sha256'],'mechanics':sorted(mechanics(d))})
  refs=list(r.get('components',[]))
  if r.get('kind')=='family':refs+=[r['candidate_ref']]
  for ref in refs:
   child=f"{ref['id']}@{ref['version']}"
   if child not in records:raise EligibilityError('Missing active component: '+child)
   visit(records[child])
  visiting.remove(k);visited.add(k)
 visit(record)
 return {**p,'active':not reasons,'reasons':sorted(set(reasons)),'records_checked':sorted(visited),'exact_maps':maps}

def require_record(record,records,root):
 result=record_eligibility(record,records,root)
 if not result['active']:raise EligibilityError('Inactive under '+result['policy']+': '+'; '.join(result['reasons']))
 return result
