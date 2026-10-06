"""Pure full-circle Cloister placement factory. No file/network access or physics."""
import copy,hashlib,json,math
SCHEMA='cloister-placement-spec/1';PROVIDER_ID='cloister-full-circle';PROVIDER_VERSION='1.0.0'
GRAMMAR_ID='cloister-compressed-flush-v2';R=10.;VX=150.;X0=60.
SEED_MAP_SHA256='18b18d7dbc21bf953cbf386a11f62bb7f5887bc083193f70ebe9ab03373143fb'
SEED_TAPE_SHA256='dff3598abcba9926ba23b98bc021c0ae94d9d6a5f89331bb9459d2da3ec50c76'
class SpecError(ValueError):
 def __init__(self,message,details=None):super().__init__(message);self.details=details or {}
def base_spec():return {'schema':SCHEMA,'disk_radius_px':70,'support_width_ratio':1,'node_span_px':620,'answer_advance_px':0,'spin_rad_s':1.2,'spin_pattern':'uniform'}
def _n(v):return int(v) if isinstance(v,(int,float)) and float(v).is_integer() else v
def native_json(m):return json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
def semantic_hash(m):return hashlib.sha256(json.dumps(m,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
def collision_signature(m):
 """Only for this provider's static full circles/fixed rectangles; not a generic engine hash."""
 if m.get('intervention'):raise ValueError('signature does not accept native interventions')
 if any(o['mechanic_kind'] not in ['hero_rotor','fixed_armor_or_spike'] for o in m['obstacles']):raise ValueError('signature only supports this static collision grammar')
 rows=[{'id':o['id'],'kind':o['mechanic_kind'],'x':o['x'],'y':o['y'],'collider':o['collider'],'lethal':o['interaction'].get('lethal',True)} for o in m['obstacles']]
 return semantic_hash({'width':m['width'],'height':m['height'],'initial_player':m.get('initial_player',{'x':60,'y':270,'vx':150,'vy':0}),'bodies':rows})
def state_at(m,time_s):
 out=[]
 for o in m['obstacles']:
  x={'id':o['id'],'kind':o['mechanic_kind'],'shape':o['collider']['shape'],'x':o['x'],'y':o['y'],'w':o['collider']['w'],'h':o['collider']['h'],'lethal':True,'collision_shape_static':True}
  if o['mechanic_kind']=='hero_rotor':x['decorative_rotation_rad']=time_s*(o['motion']['angular_speed_rad_s'] or 2);x['entire_disk_lethal']=True
  out.append(x)
 return out

def emit(spec):
 if not isinstance(spec,dict):raise SpecError('spec must be dict')
 unknown=set(spec)-set(base_spec())
 if unknown:raise SpecError('unsupported parameters: '+', '.join(sorted(unknown)))
 d={**base_spec(),**copy.deepcopy(spec)}
 if d['schema']!=SCHEMA:raise SpecError('wrong schema')
 if d['spin_pattern'] not in ['uniform','alternating']:raise SpecError('spin_pattern must be uniform or alternating')
 for k in ['disk_radius_px','support_width_ratio','node_span_px','answer_advance_px','spin_rad_s']:
  v=d[k]
  if not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v):raise SpecError(k+' must be finite')
 r=d['disk_radius_px'];ratio=d['support_width_ratio'];sw=r*ratio;span=d['node_span_px'];advance=d['answer_advance_px'];spin=d['spin_rad_s']
 if not 45<=r<=100 or not 1<=ratio<=2 or not 450<=span<=1200 or abs(spin)>20:raise SpecError('outside selected radius/support/span/spin domain')
 if spin==0:raise SpecError('spin0 is rejected: native rotation uses speed||2, so zero is not a visual freeze')
 centers=[390,390+span/2+10-advance,390+span];upper_y=85+160+r;lower_y=430-155-r;ys=[upper_y,lower_y,upper_y];obs=[]
 def body(oid,kind,x,y,w,h,shape='rectangle',speed=None):
  o={'id':oid,'mechanic_kind':kind,'x':_n(x),'y':_n(y),'collider':{'shape':shape,'w':_n(w),'h':_n(h)}}
  if speed is not None:o['motion']={'angular_speed_rad_s':speed}
  o['route_id']='main';o['effect_region']=None
  if speed is None:o['motion']=None
  o.update({'timeline':None,'interaction':{'lethal':True},'mount':'world','group_id':oid,'stage_id':'R02','sprint_id':'isolated-short-trace','template_instance_id':GRAMMAR_ID})
  return o
 for i,(cx,cy) in enumerate(zip(centers,ys),1):
  speed=spin*(-1 if d['spin_pattern']=='alternating' and i%2==0 else 1)
  obs.append(body('solid-crown-'+str(i),'hero_rotor',cx-r,cy-r,2*r,2*r,'circle',speed))
  if i!=2:
   top=cy+r-2;obs.append(body('joined-plinth-'+str(i),'fixed_armor_or_spike',cx-sw/2,top,sw,540-top));capw=2*r+(20 if i==1 else -10);obs.append(body('canopy-'+str(i),'fixed_armor_or_spike',cx-capw/2,0,capw,85))
  else:
   obs.append(body('joined-hanger-2','fixed_armor_or_spike',cx-sw/2,0,sw,cy-r+2));floorw=2*r+90;obs.append(body('floor-loft-2','fixed_armor_or_spike',cx-floorw/2,430,floorw,110))
 is_seed=d==base_spec();mapid='cloister-v2-attempt01' if is_seed else 'r21-cl-'+semantic_hash(d)[:12]
 native={'schema':'flappy-loop-lab/1','id':mapid,'seed':1,'units':{'distance':'px','time':'s','velocity':'px/s'},'width':_n(centers[-1]+r+180),'height':540,'route_id':'main','generator_parameters':{},'obstacles':obs}
 gap1=centers[1]-centers[0];gap2=centers[2]-centers[1];disk_bays=[gap1-2*(r+R),gap2-2*(r+R)]
 cap1=obs[2];floor=obs[5];cap3=obs[8];slab_bays=[floor['x']-R-(cap1['x']+cap1['collider']['w']+R),cap3['x']-R-(floor['x']+floor['collider']['w']+R)]
 derived={'disk_centers':[[ _n(x),_n(y)] for x,y in zip(centers,ys)],'center_gaps_px':[gap1,gap2],'constant_outer_span_px':span,'full_radius_disk_free_bays_px':disk_bays,'full_radius_disk_free_bays_s':[x/VX for x in disk_bays],'conservative_opposed_slab_free_bays_px':slab_bays,'center_slice_open_bands_y':[[95,235],[285,420],[95,235]],'band_bounds_exclusive':True,'minimum_center_height_change_between_station_slices_px':50,'support_extremum_overlap_px':2,'support_width_px':sw,'upper_physical_passage_px':160,'lower_physical_passage_px':155,'exit_if_alive_s':(native['width']-X0)/VX,'station_center_times_s':[(x-X0)/VX for x in centers],'actual_new_run_state':None}
 violations=[]
 if any(x<60 for x in disk_bays):violations.append('selected full-circle transition needs at least60px between expanded disk extents')
 if any(x<30 for x in slab_bays):violations.append('selected transition needs at least30px between conservative opposite roof/floor extents')
 if not all(0<o['collider']['h']<=2000 and 0<o['collider']['w']<=2000 for o in obs):violations.append('native collider domain')
 if violations:raise SpecError('; '.join(violations)+'; only this static placement contract rejected, not every flight through a closer arrangement',{'rejected_native_map':native,'derived':derived,'violations':violations,'scope':'radius-expanded spatial reserve and profile validity, not latest-flap or input proof'})
 rawhash=hashlib.sha256(native_json(native).encode()).hexdigest();changes={k:v for k,v in d.items() if v!=base_spec()[k]};visual=set(changes)<= {'spin_rad_s','spin_pattern'}
 md={'schema':'cloister-placement-emission/1','provider_id':PROVIDER_ID,'provider_version':PROVIDER_VERSION,'grammar_id':GRAMMAR_ID,'parameterization':'full-circle-placement-factory','classification':'candidate','spec':d,'parameter_effects':{'spin_rad_s':'visual rotation only; full-circle collision unchanged','spin_pattern':'visual direction pattern only','disk_radius_px':'collision/profile change; supports and caps resize, center heights compensate to retain passage apertures','support_width_ratio':'collision/support-width change; any claimed retained corridor must be bounded explicitly, not global visual equivalence','node_span_px':'collision/spacing change; both center gaps and final reception position derive from it','answer_advance_px':'collision/placement change; move middle circle+hanger+floor together, reallocating descent/re-lift bays with outer stations fixed'},'variant_effect':'exact-seed-reconstruction' if is_seed else 'visual-only' if visual else 'collision-placement-change','changed_spec':changes,'derived':derived,'relations':{'centers':'C1.x390; C2.x390+span/2+10−advance; C3.x390+span. Seed center gaps320/300.','profile':'upper circle center y85+160+r; lower center y430−155−r; full passage widths160/155 remain intact','flush_support':'support width=r*ratio, centered under/above full circle; extremum overlaps2px, so no artificial seam','cap_widths':'first roof2r+20; lower floor2r+90; last roof2r−10, all centered on their associated disk','action':'above → below → above stays the sentence; advancing the middle answer trades descent preparation for re-lift preparation','rotation':'whole disks remain filled and lethal at all angles. Decorative spokes, if drawn, are paint only. Zero is rejected because native||2 fallback is not stationary.'},'collision_signature_sha256':collision_signature(native),'native_map_sha256':rawhash,'semantic_map_sha256':semantic_hash(native),'seed_identity':{'reconstruction_expected':is_seed,'exact_map_bytes_match':rawhash==SEED_MAP_SHA256,'reference_map_path':'../../physics/cloister-v2-attempt01-map.json','reference_map_sha256':SEED_MAP_SHA256,'reference_input_path':'../../physics/cloister-v2-attempt01-inputs.json','reference_tape_sha256':SEED_TAPE_SHA256,'old_evidence_applies_to_exact_map_only':True},'old_measured_evidence':{'linked_exact_seed_only':True,'not_new_measurement':True,'map_sha256':SEED_MAP_SHA256,'entry':{'tick':0,'x':60,'y':270,'vx':150,'vy':0},'exit':{'tick':960,'time_s':8,'x':1260,'y':251.41249999999965,'vy':51.66666666666654,'vx':150},'flaps':13,'observed_substep_minimum_clearance_px':28.394444444444616,'not_a_general_safe_box':True,'new_variant_replay_performed':False},'entry':{'native_default':{'x':60,'y':270,'vx':150,'vy':0},'accepted_box':None},'exit':{'actual_new_run_state':None,'desired_y':[220,330],'desired_vy':[-150,150],'preserve':['absolute time','actual y/vy','all full-circle collision geometry'],'one_old_seed_tuple_is_not_an_exit_range':True},'input_question':'Does moving the middle full disk group60px earlier require an earlier release or changed re-lift cadence, while changing signed spin alone leaves all collision geometry identical?','preview_contract':{'lookahead_px':520,'renderer_verified':False,'rule':'show each full disk boundary and its joined support. Rotation may change appearance, never advertise gaps between painted spokes.'},'risks':['new structural placement has no input witness','old seed tape was a route-guided existence witness, not first-sight play','visual-only changes can affect readability but cannot create physical blade windows','conservative free-bay reserves are not a latest flap time or reachability proof'],'new_physics_run':False,'measured_bounds':None}
 return {'map':native,'metadata':md}
