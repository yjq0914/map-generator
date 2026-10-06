#!/usr/bin/env python3
"""Thin hash-pinned candidate emission. No physics or qualified-selection fallback."""
from __future__ import annotations
import argparse, copy, hashlib, json, math, sys, types
from pathlib import Path
from combo_library import ROOT, Invalid, resolve, digest
import active_eligibility as active

class CandidateError(ValueError):
 def __init__(self,message,details=None):super().__init__(message);self.details=details or {}

# An intentionally small input surface. Coupled geometry is checked by the pinned emitters.
GUARDS={
 'cloister-full-circle':{
  'schema':('enum',['cloister-placement-spec/1'],'cloister-placement-spec/1'),
  'disk_radius_px':('number',45,100,70),'support_width_ratio':('number',1,2,1),
  'node_span_px':('number',450,1200,620),'answer_advance_px':('number',None,None,0),
  'spin_rad_s':('number',-20,20,1.2),'spin_pattern':('enum',['uniform','alternating'],'uniform')},
 'mixed01-slider-fixed-route':{
  'schema':('enum',['mixed01-slider-route-spec/1'],'mixed01-slider-route-spec/1'),
  'branch':('enum',['upper','lower'],'upper'),'core_shift_px':('number',None,None,0),
  'entry_connector':('enum',['included'],'included')},
 'spring-reset-opening-reception':{
  'schema':('enum',['spring-opening-spec/1'],'spring-opening-spec/1'),
  'bounce_speed_px_s':('number',0,600,450),'gate_width_px':('number',20,300,90),
  'reference_contact_x':('number',360,430,390),'spring_top_y':('number',330,460,420),
  'receiver_center_offset_px':('number',None,None,0),'gate_phase_offset_s':('number',None,None,0)},
 'carried-speed-gate':{
  'schema':('enum',['carried-speed-gate-spec/1'],'carried-speed-gate-spec/1'),
  'island_tail_to_gate_front_px':('number',0,300,70),'gate_width_px':('number',40,400,80),
  'gate_center_y':('number',160,400,250),'opening_px':('number',100,240,160),
  'clock_basis':('enum',['observed-anchor','nominal150'],'observed-anchor'),
  'hold_mode':('enum',['whole-width','seed-width80'],'whole-width')},
 'light-cavity-kernel':{
  'schema':('enum',['light-cavity-kernel-spec/1'],'light-cavity-kernel-spec/1'),
  'laser_span_px':('number',400,660,540),'gate_width_px':('number',260,520,420),
  'release_lead_px':('number',20,180,100),'rail_mode':('enum',['none','upper','fold','both'],'none'),
  'upper_rail_fraction':('number',0.25,1,1),'fold_rise_px':('number',120,450,450)}
}

def _finite_number(value):
 if isinstance(value,bool) or not isinstance(value,(int,float)):return False
 try:return math.isfinite(value)
 except OverflowError:return False

def _finite_json(value):
 if isinstance(value,(int,float)) and not isinstance(value,bool) and not _finite_number(value):raise CandidateError('Nonfinite or unrepresentable JSON number')
 if isinstance(value,dict):
  if any(not isinstance(k,str) for k in value):raise CandidateError('JSON object keys must be strings')
  for item in value.values():_finite_json(item)
 elif isinstance(value,list):
  for item in value:_finite_json(item)
 elif value is not None and not isinstance(value,(str,int,float,bool)):raise CandidateError('Value is not plain JSON')

def _pairs(items):
 out={}
 for k,v in items:
  if k in out:raise CandidateError('Duplicate JSON key: '+k)
  out[k]=v
 return out

def parse_json(text):
 def reject(value):raise CandidateError('Nonfinite JSON number: '+value)
 try:value=json.loads(text,object_pairs_hook=_pairs,parse_constant=reject)
 except json.JSONDecodeError as e:raise CandidateError(str(e)) from e
 _finite_json(value);return value

def read_json(path):return parse_json(Path(path).read_text())

def load_registry(root=ROOT):
 data=read_json(Path(root)/'candidate-providers.json')
 if not isinstance(data,dict) or set(data)!={'schema','providers'} or data['schema']!='candidate-provider-registry/1':raise CandidateError('Invalid candidate registry')
 if not isinstance(data['providers'],list):raise CandidateError('Registry providers must be a list')
 seen=set()
 for p in data['providers']:
  fields={'id','version','source','dependencies','entrypoint','serializer','provenance','limitations','historical_maps','mechanics'}
  if not isinstance(p,dict) or set(p)!=fields or p['id'] not in GUARDS:raise CandidateError('Unsupported provider registration')
  if not isinstance(p['version'],str) or not p['version']:raise CandidateError('Provider version required')
  token=p['id']+'@'+p['version']
  if token in seen:raise CandidateError('Duplicate provider/version')
  seen.add(token)
  if p['entrypoint']!='emit' or p['serializer']!='native_json':raise CandidateError('Unsupported callable')
  # Current providers are standard-library-only single files, not importable dependency trees.
  if p['dependencies']!=[]:raise CandidateError('Provider dependencies are not supported by this thin entrypoint')
  if not isinstance(p['limitations'],list) or not p['limitations']:raise CandidateError('Provider limitations required')
  if not isinstance(p['provenance'],list) or not isinstance(p['historical_maps'],list):raise CandidateError('Invalid provider provenance')
  active.provider_eligibility(p)
 return data['providers']

def checked_source(provider,root=ROOT):
 s=provider['source']
 if not isinstance(s,dict) or set(s)!={'path','sha256'} or not isinstance(s['sha256'],str):raise CandidateError('Invalid source binding')
 try:path=resolve(root,s['path']);raw=path.read_bytes()
 except (Invalid,OSError) as e:raise CandidateError(str(e)) from e
 if hashlib.sha256(raw).hexdigest()!=s['sha256']:raise CandidateError('Provider source SHA256 mismatch; no provider executed')
 return path,raw

def resolve_spec(provider_id,spec):
 if not isinstance(spec,dict):raise CandidateError('Spec must be a plain JSON object')
 _finite_json(spec);guard=GUARDS[provider_id]
 unknown=set(spec)-set(guard)
 if unknown:raise CandidateError('Unsupported parameters: '+', '.join(sorted(unknown)))
 out={k:copy.deepcopy(v[-1]) for k,v in guard.items()};out.update(copy.deepcopy(spec))
 for k,rule in guard.items():
  v=out[k]
  if rule[0]=='enum':
   if not isinstance(v,str) or v not in rule[1]:raise CandidateError('Unsupported '+k)
  else:
   if not _finite_number(v):raise CandidateError(k+' must be a finite number')
   lo,hi=rule[1:3]
   if (lo is not None and v<lo) or (hi is not None and v>hi):raise CandidateError(k+' outside advertised domain')
 if provider_id=='cloister-full-circle' and out['spin_rad_s']==0:raise CandidateError('spin0 is not a native visual freeze')
 if provider_id=='spring-reset-opening-reception' and out['bounce_speed_px_s']<=0:raise CandidateError('bounce_speed_px_s must be positive')
 return out

def providers(root=ROOT,include_inactive=False):
 out=[]
 for p in load_registry(root):
  eligibility=active.provider_eligibility(p)
  if not eligibility['active'] and not include_inactive:continue
  checked_source(p,root)
  out.append({'provider':p['id']+'@'+p['version'],'source':p['source'],'dependencies':p['dependencies'],
   'status':'candidate_only' if eligibility['active'] else 'inactive_historical_provider','active_eligibility':eligibility,'parameters':{k:{'type':v[0],'allowed':v[1] if v[0]=='enum' else {'minimum':v[1],'maximum':v[2]},'default':v[-1]} for k,v in GUARDS[p['id']].items()},
   'limitations':p['limitations'],'provenance':p['provenance']})
 return out

def generate(token,spec,root=ROOT):
 if not isinstance(token,str) or token.count('@')!=1:raise CandidateError('Use an explicit provider-id@version; no latest fallback')
 p=next((p for p in load_registry(root) if p['id']+'@'+p['version']==token),None)
 if p is None:raise CandidateError('Unknown provider/version')
 eligibility=active.provider_eligibility(p)
 if not eligibility['active']:raise CandidateError('Inactive under '+eligibility['policy']+': '+token+' contains '+', '.join(eligibility['excluded_mechanics_present']))
 resolved=resolve_spec(p['id'],spec)  # Reject unknown/type errors before loading provider code.
 path,raw=checked_source(p,root)
 module=types.ModuleType('_candidate_provider_'+hashlib.sha256(raw).hexdigest()[:16]);module.__file__=str(path)
 # Execute exactly the bytes just hashed, avoiding a second read or bytecode-cache ambiguity.
 exec(compile(raw,str(path),'exec'),module.__dict__)
 if getattr(module,'PROVIDER_ID',p['id'])!=p['id'] or getattr(module,'PROVIDER_VERSION',p['version'])!=p['version']:raise CandidateError('Provider identity/version mismatch')
 try:output=module.emit(copy.deepcopy(resolved))
 except ValueError as e:
  active.require_mechanics(getattr(e,'details',{}),'provider diagnostic')
  raise CandidateError(str(e),getattr(e,'details',None)) from e
 if not isinstance(output,dict) or set(output)!={'map','metadata'}:raise CandidateError('Unexpected provider output')
 _finite_json(output)
 if not isinstance(output['map'],dict) or output['map'].get('schema')!='flappy-loop-lab/1' or not isinstance(output['metadata'],dict):raise CandidateError('Invalid provider map/metadata')
 active.require_mechanics(output['map'],'emitted map, including nested composites')
 rawmap=module.native_json(output['map']).encode('utf-8')
 if parse_json(rawmap.decode())!=output['map']:raise CandidateError('Provider serialization mismatch')
 active.require_mechanics(parse_json(rawmap.decode()),'serialized map, including nested composites')
 map_sha=hashlib.sha256(rawmap).hexdigest();md=output['metadata']
 matches=[copy.deepcopy(h) for h in p['historical_maps'] if h['map_sha256']==map_sha]
 metadata={'schema':'candidate-generated-output/1','status':'unqualified_candidate_output','provider':token,
  'source':copy.deepcopy(p['source']),'dependencies':copy.deepcopy(p['dependencies']),'active_eligibility':eligibility,
  'requested_spec':copy.deepcopy(spec),'resolved_spec':resolved,'resolved_spec_sha256':digest(resolved),
  'native_map_sha256':map_sha,'parameter_effects':copy.deepcopy(md.get('parameter_effects',{})),
  'variant_effect':md.get('variant_effect','unclassified-by-provider'),
  'restricted_collision_signature_sha256':md.get('collision_signature_sha256'),
  'historical_exact_map_matches':matches,'historical_match_scope':'Exact native-map bytes only; not a new run, accepted entry/tape/state or family qualification. Collision signature is never an evidence lookup key.',
  'provider_metadata':md,'physics_executed':False,'qualification_transferred':False,
  'limitations':copy.deepcopy(p['limitations'])}
 return {'map_bytes':rawmap,'metadata':metadata}

def write_output(result,destination):
 active.require_mechanics(parse_json(result['map_bytes'].decode('utf-8')),'output map, including nested composites')
 out=Path(destination)
 out.mkdir(parents=False,exist_ok=False)  # Explicit fresh destination; never replace old files.
 with (out/'map.json').open('xb') as f:f.write(result['map_bytes'])
 with (out/'metadata.json').open('x') as f:f.write(json.dumps(result['metadata'],ensure_ascii=False,indent=2,allow_nan=False)+'\n')
 return {'status':'unqualified_candidate_output','directory':str(out),'native_map_sha256':result['metadata']['native_map_sha256'],'physics_executed':False,'qualification_transferred':False}

def main(argv=None):
 parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
 q=sub.add_parser('providers');q.add_argument('--all',action='store_true',help='Include inactive historical registrations; never enables emission');p=sub.add_parser('emit');p.add_argument('provider');p.add_argument('--spec',required=True,type=Path);p.add_argument('--out',required=True,type=Path)
 args=parser.parse_args(argv)
 try:
  if args.command=='providers':result={'providers':providers(include_inactive=args.all),'active_eligibility_policy':active.policy(),'scope':'Active providers by default; --all includes inactive history only'}
  else:
   if args.out.exists() or args.out.is_symlink():raise CandidateError('Output destination already exists')
   result=write_output(generate(args.provider,read_json(args.spec)),args.out)
  print(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False));return 0
 except (CandidateError,OSError,TypeError,ValueError) as e:
  print(json.dumps({'status':'rejected_candidate_request','error':str(e),'details':getattr(e,'details',{}),'physics_executed':False,'qualification_transferred':False},ensure_ascii=False,allow_nan=False),file=sys.stderr);return 2
if __name__=='__main__':sys.exit(main())
