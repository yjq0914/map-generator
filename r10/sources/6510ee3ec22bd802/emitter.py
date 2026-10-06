"""Small deterministic mixed01 slider + fixed-route emitter. Standard library only.
No I/O, engine import, physics, random sampling, clipping, or CLI side effects.
"""
from __future__ import annotations
import copy, hashlib, json, math

SCHEMA = 'mixed01-slider-route-spec/1'
GRAMMAR_ID = 'mixed01-slider-fixed-route'
DEFAULT_ENTRY = {'x': 60, 'y': 270, 'vx': 150, 'vy': 0}
SEED_MAP_SHA = {
 'upper': 'e20e63c6e9d3317976d2f655c2be01224393c8c959b99c1e373e5f285eba1825',
 'lower': 'ff6d52c609d8de5d1edc91842fde49cc7dfb4c9b65393367b2c06de0eb7189bd',
}
SEED_EXITS = {
 'upper': {'x':1065,'local_x':1005,'y':264.76527777777744,'vy':160.99999999999986,'vx':150},
 'lower': {'x':1065,'local_x':1005,'y':263.8541666666667,'vy':154.16666666666654,'vx':150},
}

class SpecError(ValueError): pass

def seed_spec(branch='upper'):
 return {'schema':SCHEMA,'branch':branch,'core_shift_px':0,'entry_connector':'included'}

def native_json(native_map):
 """Deterministic serialization, matching the reviewed seed JS pretty JSON."""
 return json.dumps(native_map, ensure_ascii=False, indent=2, allow_nan=False)+'\n'

def _num(v):
 return int(v) if v == int(v) else v

def _finite(v):
 return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)

def semantic_descriptors(native_map):
 """Exclude provenance labels; include all collision/motion/interaction fields."""
 fields=('id','mechanic_kind','x','y','collider','effect_region','motion','timeline','interaction')
 return {'schema':native_map['schema'],'width':native_map['width'],'height':native_map['height'],
         'initial_player':copy.deepcopy(native_map.get('initial_player',DEFAULT_ENTRY)),
         'obstacles':[{k:copy.deepcopy(o[k]) for k in fields} for o in native_map['obstacles']]}

def semantic_hash(native_map):
 s=json.dumps(semantic_descriptors(native_map),sort_keys=True,separators=(',',':'),allow_nan=False)
 return hashlib.sha256(s.encode()).hexdigest()

def _body(id,x,y,w,h):
 return {'id':id,'mechanic_kind':'fixed_armor_or_spike','route_id':'main','x':_num(x),'y':y,
 'collider':{'shape':'rectangle','w':w,'h':h},'effect_region':None,'motion':None,'timeline':None,
 'interaction':{'lethal':True},'mount':'world','group_id':id,'stage_id':'mixed01-v2',
 'sprint_id':'isolated-short-trace','template_instance_id':'mixed01-v2'}

def emit(spec):
 """Return {'map': native descriptors, 'metadata': candidate/provenance/contracts}.

 core_shift_px translates corridor/slider/island/receiver/exit as one group.
 Slider phase is derived, never accepted independently. External entry contracts
 are metadata requirements; they are not engine state injection or accepted boxes.
 """
 if not isinstance(spec,dict): raise SpecError('spec must be a dict')
 allowed={'schema','branch','core_shift_px','entry_connector','external_entry_contract','entry_player'}
 unknown=set(spec)-allowed
 if unknown: raise SpecError('Unsupported fields: '+', '.join(sorted(unknown))+'; phase is derived, not independently editable')
 if spec.get('schema')!=SCHEMA: raise SpecError('schema must be '+SCHEMA)
 branch=spec.get('branch')
 if branch not in ('upper','lower'): raise SpecError('branch must be upper or lower')
 delta=spec.get('core_shift_px',0)
 if not _finite(delta): raise SpecError('core_shift_px must be finite')
 connector=spec.get('entry_connector','included')
 if connector not in ('included','external'): raise SpecError('entry_connector must be included or external')
 contract=spec.get('external_entry_contract')
 if connector=='external':
  if not isinstance(contract,dict) or contract.get('status')!='authored-condition':
   raise SpecError('external connector requires external_entry_contract with status=authored-condition')
  tick=contract.get('start_tick',0)
  if not isinstance(tick,int) or isinstance(tick,bool) or tick<0: raise SpecError('contract start_tick must be a nonnegative integer')
 elif contract is not None:
  raise SpecError('external_entry_contract is only valid when entry_connector=external')
 entry=spec.get('entry_player')
 if entry is not None:
  if not isinstance(entry,dict) or set(entry)!=set(DEFAULT_ENTRY) or not all(_finite(v) for v in entry.values()):
   raise SpecError('entry_player must contain only finite x,y,vx,vy')
  if entry['x']!=60 or entry['vx']!=150 or not 50<=entry['y']<=490 or abs(entry['vy'])>500:
   raise SpecError('entry_player outside native initial-player domain; continuation x/tick belongs in external contract')
 corridor_x=300+delta
 if connector=='included' and corridor_x-220<=20:
  raise SpecError('grammar constraint: corridor start minus throat right must exceed 2R=20px; no clipping')
 if corridor_x<0 or not 100<=1065+delta<=5000:
  raise SpecError('translated module exceeds native geometry domain')
 omega=2*math.pi/5.2
 seed_phi=math.pi/2-2*math.pi*2.8/5.2+(math.pi if branch=='lower' else 0)
 # Keep the exact seed arithmetic at delta=0; no floating re-expression of phi.
 phi=seed_phi if delta==0 else seed_phi-omega*delta/150
 obs=[]
 if connector=='included':
  obs += [_body('entry-top',180,0,40,220),_body('entry-bottom',180,340,40,200)]
 obs += [_body('corridor-top',300+delta,0,605,70),_body('corridor-bottom',300+delta,470,605,70),
         _body('slider',450+delta,185,56,170),_body('island',540+delta,215,135,110),
         _body('receiver-top',860+delta,0,45,210),_body('receiver-bottom',860+delta,340,45,200)]
 slider=next(o for o in obs if o['id']=='slider')
 slider['mechanic_kind']='vertical_armor_slider'
 slider['motion']={'type':'sine','amplitude_px':75,'period_s':5.2,'phase_rad':phi}
 exact_default=(delta==0 and connector=='included' and entry is None)
 normalized={'schema':SCHEMA,'branch':branch,'core_shift_px':_num(delta),'entry_connector':connector}
 if contract is not None: normalized['external_entry_contract']=copy.deepcopy(contract)
 if entry is not None: normalized['entry_player']=copy.deepcopy(entry)
 suffix=hashlib.sha256(json.dumps(normalized,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()[:12]
 native={'schema':'flappy-loop-lab/1','id':f'mixed01-v2-{branch}-favored' if exact_default else 'r11-mixed01-'+suffix,
 'seed':1,'units':{'distance':'px','time':'s','velocity':'px/s'},'width':_num(1065+delta),'height':540,
 'route_id':'main','generator_parameters':{},'obstacles':obs}
 if entry is not None: native['initial_player']=copy.deepcopy(entry)
 file_sha=hashlib.sha256(native_json(native).encode()).hexdigest()
 witness_exact=file_sha==SEED_MAP_SHA[branch]
 proof_base='../../physics/mixed01-v2-'+branch+'-attempt01'
 metadata={
  'schema':'mixed01-slider-route-emission/1','grammar_id':GRAMMAR_ID,'emitter_version':'v1','normalized_spec':normalized,
  'classification':'candidate','native_map_sha256':file_sha,'semantic_sha256':semantic_hash(native),
  'relationship':{
   'formula':'x_core_new=x_core_seed+delta; phi_new=phi_seed-(2*pi/5.2)*(delta/150)',
   'fixed_values':{'vx_reference':150,'period_s':5.2,'amplitude_px':75,'slider_to_island_raw_gap_px':34,'island_to_receiver_raw_gap_px':185},
   'derived':{'translation_delay_s':delta/150,'favored_extremum_s':2.8+delta/150,'phase_rad':phi,'throat_to_corridor_raw_gap_px':corridor_x-220 if connector=='included' else None},
   'what_it_preserves':'At t_new=t_seed+delta/150, slider pose equals seed pose at t_seed, for an unchanged horizontal-speed reference.',
   'what_it_does_not_preserve':'Gravity, flap history, entry state, connector recovery or controller behavior are not time-translated by this identity.'},
  'entry_connector':{'mode':connector,'condition':copy.deepcopy(contract) if connector=='external' else 'Included throat is conditional: omit only when caller supplies a separately justified state contract. It is not proven required.',
                     'entry_player_if_new_episode':copy.deepcopy(entry or DEFAULT_ENTRY),'accepted_entry_box':None},
  'clock_contract':{'geometry_clock':'runtime absolute tick; never renormalize a supplied continuation tick',
                    'required_start_tick':contract.get('start_tick',0) if connector=='external' else 0,
                    'createState_auto_injects_contract':False},
  'authored_bounds':{'proposed_exit_goal':{'y':[245,305],'vy':[-100,160]},'status':'design target only, not accepted or guaranteed',
                     'grammar_constraints':['included throat right220 to corridor start must exceed2R=20','slider/island/receiver move together; relative gaps fixed','phase cannot be independently supplied']},
  'measured_bounds':None,
  'historical_seed_evidence':{'source_map':proof_base+'-map.json','source_result':proof_base+'-result.json','source_map_sha256':SEED_MAP_SHA[branch],
    'runtime_sha256':'58c19ff5f258bfc05ff2a4b1b9f8edbbf7742fc57fa1c0c294b1ddfda668e987','applies_to_this_exact_map':witness_exact,'entry':copy.deepcopy(DEFAULT_ENTRY),'ticks':804,'time_s':6.7,'exit_state':copy.deepcopy(SEED_EXITS[branch]),
    'authored_exit_goal_met_by_seed':branch=='lower','upper_vy_mismatch':'upper measured vy≈161 exceeds proposed +160, with no tolerance added',
    'scope':'One historical route-guided existence witness only; no entry/exit box, human readability or family transfer guarantee. Not rerun.'},
  'new_physics_run':False,'transformed_candidate_has_no_inherited_success':not witness_exact,
  'render_contract':{'use':'map.obstacles and actual emitted slider equation; no hand-copied geometry','player_trajectory':'none unless separately linked to exact historical trace'}
 }
 return {'map':native,'metadata':metadata}
