"""Pure minimal inclined-laser / closing-gate kernel. No runtime or file/network access."""
import copy,hashlib,json,math
from fractions import Fraction
SCHEMA="light-cavity-kernel-spec/1";PROVIDER_ID="light-cavity-kernel";PROVIDER_VERSION="1.0.0"
GRAMMAR_ID="laser-release-gate-reception";R=10.;VX=150.;X0=60.;W=2*math.pi/6
SOURCE_MAP={'schema': 'flappy-loop-lab/1',
 'id': 'r14-spatial-inclined-light-cavity',
 'seed': 1401,
 'units': {'distance': 'px', 'time': 's', 'velocity': 'px/s'},
 'width': 1210,
 'height': 540,
 'route_id': 'main',
 'obstacles': [{'id': 'ceiling-fold',
                'mechanic_kind': 'laser_scanner',
                'x': 210,
                'y': -100,
                'collider': {'shape': 'segment', 'w': 70, 'h': 450, 'width': 10},
                'motion': {'dx_px': 70, 'dy_px': 450, 'amplitude_px': 20, 'period_s': 6, 'phase_rad': 0},
                'timeline': {'start_s': 0.2, 'warning_s': 0.8, 'active_s': 3.4000000000000004, 'cooldown_s': 6},
                'interaction': {'lethal': True}},
               {'id': 'inclined-upper',
                'mechanic_kind': 'laser_scanner',
                'x': 280,
                'y': 350,
                'collider': {'shape': 'segment', 'w': 540, 'h': 330, 'width': 10},
                'motion': {'dx_px': 540, 'dy_px': -330, 'amplitude_px': 20, 'period_s': 6, 'phase_rad': 0},
                'timeline': {'start_s': 0.2, 'warning_s': 0.8, 'active_s': 3.4000000000000004, 'cooldown_s': 6},
                'interaction': {'lethal': True}},
               {'id': 'inclined-lower',
                'mechanic_kind': 'laser_scanner',
                'x': 280,
                'y': 560,
                'collider': {'shape': 'segment', 'w': 540, 'h': 330, 'width': 10},
                'motion': {'dx_px': 540, 'dy_px': -330, 'amplitude_px': 20, 'period_s': 6, 'phase_rad': 0},
                'timeline': {'start_s': 0.2, 'warning_s': 0.8, 'active_s': 3.4000000000000004, 'cooldown_s': 6},
                'interaction': {'lethal': True}},
               {'id': 'wide-receiving-cavity',
                'mechanic_kind': 'timed_armor_gate',
                'x': 550,
                'y': 350,
                'collider': {'shape': 'rectangle', 'w': 420, 'h': 1},
                'motion': {'opening_px': 320},
                'timeline': {'start_s': 1.1,
                             'warning_s': 0.8,
                             'opening_s': 0.8,
                             'hold_s': 1.7999999999999998,
                             'closing_s': 2.45,
                             'cooldown_s': 4},
                'interaction': {'lethal': True}}],
 'initial_player': {'x': 60, 'y': 440, 'vx': 150, 'vy': 0}}
SOURCE_MAP_SHA='503954916e016fe1fa57f09cae2743219f981d4dde752e564ccc78317de23a07'
SOURCE_TAPE_SHA='139041d6c8da867e3f709766145daaeca803f8fade414146a4cdbd2efdf5285d'
SOURCE_CONTROLLER_SHA='5ffa57fbcfccb5c0f20cf9ba7c6516e716e08a6b844e9f1cd1fe0174bb12a5de'
class SpecError(ValueError):
 def __init__(self,message,details=None):super().__init__(message);self.details=details or {}
def base_spec():return {'schema':SCHEMA,'laser_span_px':540,'gate_width_px':420,'release_lead_px':100,'rail_mode':'none','upper_rail_fraction':1,'fold_rise_px':450}
def seed_spec():return {**base_spec(),'rail_mode':'both'}
def source_map():return copy.deepcopy(SOURCE_MAP)
def native_json(m):return json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
def _n(v):return int(v) if float(v).is_integer() else v
def state_at(m,t):
 out=[]
 for o in m['obstacles']:
  q=o['timeline'];z=t-q['start_s']
  if o['mechanic_kind']=='laser_scanner':
   period=q['warning_s']+q['active_s']+q['cooldown_s'];p=z%period if z>=0 else 0;phase='idle' if z<0 else 'warning' if p<q['warning_s'] else 'active' if p<q['warning_s']+q['active_s'] else 'cooldown';motion=o['motion'];y=o['y']+motion['amplitude_px']*math.sin(2*math.pi*t/motion['period_s']+motion['phase_rad']);out.append({'id':o['id'],'kind':o['mechanic_kind'],'phase':phase,'lethal':phase=='active','segment':[[o['x'],y],[o['x']+motion['dx_px'],y+motion['dy_px']]],'width':o['collider']['width'],'period_s':period})
  else:
   period=sum(q[k] for k in ['warning_s','opening_s','hold_s','closing_s','cooldown_s']);p=z%period if z>=0 else 0;f=0.;phase='closed'
   if z>=0:
    if p<q['warning_s']:phase='warning'
    elif p<q['warning_s']+q['opening_s']:phase='opening';f=(p-q['warning_s'])/q['opening_s']
    elif p<q['warning_s']+q['opening_s']+q['hold_s']:phase='open';f=1.
    elif p<q['warning_s']+q['opening_s']+q['hold_s']+q['closing_s']:phase='closing';f=1-(p-q['warning_s']-q['opening_s']-q['hold_s'])/q['closing_s']
   gap=f*o['motion']['opening_px'];top=o['y']-gap/2;bottom=o['y']+gap/2;out.append({'id':o['id'],'kind':o['mechanic_kind'],'phase':phase,'lethal':True,'warning_closed_lethal':phase=='warning','gap_px':gap,'center_band_y':[top+R,bottom-R] if gap>2*R else None,'bounds_exclusive':True,'bodies':[{'x':o['x'],'y':-120,'w':o['collider']['w'],'h':top+120},{'x':o['x'],'y':bottom,'w':o['collider']['w'],'h':660-bottom}],'period_s':period})
 return out

def emit(spec):
 if not isinstance(spec,dict):raise SpecError('spec must be a dict')
 unknown=set(spec)-set(base_spec())
 if unknown:raise SpecError('unknown parameters: '+', '.join(sorted(unknown)))
 s={**base_spec(),**copy.deepcopy(spec)}
 if s['schema']!=SCHEMA:raise SpecError('wrong schema')
 if s['rail_mode'] not in ['none','upper','fold','both']:raise SpecError('rail_mode must be none/upper/fold/both')
 for k in ['laser_span_px','gate_width_px','release_lead_px','upper_rail_fraction','fold_rise_px']:
  if not isinstance(s[k],(int,float)) or isinstance(s[k],bool) or not math.isfinite(s[k]):raise SpecError(k+' must be finite')
 span=s['laser_span_px'];gw=s['gate_width_px'];lead=s['release_lead_px'];uf=s['upper_rail_fraction'];fr=s['fold_rise_px'];mode=s['rail_mode']
 if not 400<=span<=660 or not 260<=gw<=520 or not 20<=lead<=180 or not .25<=uf<=1 or not 120<=fr<=450:raise SpecError('outside this compact source/profile domain')
 # Rational construction preserves the seed's exact2.45 closing duration; no parameter clipping.
 rel_f=(Fraction(str(span))+220-Fraction(str(lead)))/150;close_f=rel_f+Fraction(1,10);tail_f=(500+Fraction(str(gw)))/150
 release=float(rel_f);close=float(close_f);tail=float(tail_f);closing=float((tail_f-close_f)*Fraction(3,2));front=3.2;inside=(550+gw-X0)/VX;slope=-330/span;normal=15*math.sqrt(1+slope*slope)
 if release<=1 or close<=2.7 or closing<.5 or closing>5:raise SpecError('derived native clocks outside selected kernel domain')
 originals={o['id']:copy.deepcopy(o) for o in SOURCE_MAP['obstacles']};lo=copy.deepcopy(originals['inclined-lower']);up=copy.deepcopy(originals['inclined-upper']);fold=copy.deepcopy(originals['ceiling-fold']);gate=copy.deepcopy(originals['wide-receiving-cavity'])
 for b in [lo,up,fold]:b['timeline']['active_s']=release-1
 lo['collider']['w']=_n(span);lo['motion']['dx_px']=_n(span)
 up['collider']['w']=_n(span*uf);up['collider']['h']=_n(330*uf);up['motion']['dx_px']=_n(span*uf);up['motion']['dy_px']=_n(-330*uf)
 fold['y']=_n(350-fr);fold['collider']['h']=_n(fr);fold['motion']['dy_px']=_n(fr)
 gate['collider']['w']=_n(gw);gate['timeline']['hold_s']=close-2.7;gate['timeline']['closing_s']=closing
 bodies=[]
 if mode in ['fold','both']:bodies.append(fold)
 if mode in ['upper','both']:bodies.append(up)
 bodies += [lo,gate]
 is_seed=s==seed_spec();m=copy.deepcopy(SOURCE_MAP);m['id']=SOURCE_MAP['id'] if is_seed else 'r23-lk-'+hashlib.sha256(json.dumps(s,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:12];m['obstacles']=bodies;m['width']=_n(550+gw+240)
 def line(t,y0):return y0+slope*(X0+VX*t-280)+20*math.sin(W*t)
 def gap(t):
  if t<1.9:return 0.
  if t<2.7:return 320*(t-1.9)/.8
  if t<close:return 320.
  if t<close+closing:return 320*(1-(t-close)/closing)
  return 0.
 # Monotone line+sine because |slope|*VX > A*omega throughout the supported span domain.
 upper_near=mode in ['upper','both'] and 280+span*uf+15>=X0+VX*front
 bands=[]
 for t in [front,release]:
  low=max(10,200,line(t,350)+normal if upper_near else 10);high=min(530,500,line(t,560)-normal);bands.append({'time_s':t,'low':low,'high':high,'width':high-low})
 active_min=min(bands,key=lambda q:q['width']);pre=min(500,line(release,560)-normal,530);inside_low=max(10,350-gap(inside)/2+R);tail_band=gap(tail)-2*R;descent=inside_low-pre
 removed=[copy.deepcopy(o) for o in SOURCE_MAP['obstacles'] if o['id'] not in {x['id'] for x in bodies}]
 retained_changes={o['id']:[k for k in o if o[k]!=originals[o['id']].get(k)] for o in bodies if o!=originals[o['id']]}
 d={'laser_span_px':span,'lower_endpoint_x':280+span,'lower_endpoint_y_before_sine':230,'slope':slope,'laser_release_s':release,'release_player_x':X0+VX*release,'release_before_finite_end_px':lead,'gate_front_radius_time_s':front,'gate_inside_right_edge_time_s':inside,'gate_whole_radius_tail_s':tail,'gate_closing_start_s':close,'gate_closing_duration_s':closing,'gate_tail_open_fraction':1/3,'gate_tail_center_band_px':tail_band,'active_overlap_endpoint_bands':bands,'active_overlap_min_center_band_px':active_min['width'],'pre_release_above_lower_branch_upper_y':pre,'inside_tail_gate_lower_y':inside_low,'required_same_branch_descent_px':descent,'capsule_vertical_offset_px':normal,'upper_rail_intersects_receiver_envelope':upper_near,'upper_rail_end_x':280+span*uf,'upper_rail_to_gate_front_conservative_gap_px':540-(280+span*uf+15),'fold_start_y_before_sine':350-fr,'map_width':m['width'],'exit_if_alive_s':(m['width']-X0)/VX,'new_actual_player_states':None}
 bad=[]
 if not 2.7<=front<release<tail:bad.append('real laser cooldown must occur inside full-radius gate occupancy after full opening')
 if not 280+15<=X0+VX*front<X0+VX*release<=280+span-15:bad.append('active cavity overlap/release must remain inside the finite lower capsule span')
 if active_min['width']<40:bad.append('selected above-lower branch has less than40px conservative active overlap band')
 if tail_band<80-1e-8:bad.append('whole gate tail has less than80px center band')
 if descent<30:bad.append('selected release-to-receipt branch has less than30px geometric descent contrast')
 if bad:raise SpecError('; '.join(bad)+'; only this conservative action-kernel relation is rejected, not all bypasses/inputs',{'rejected_native_map':m,'derived':d,'removed_source_bodies':removed,'violations':bad,'scope':'fixed-clock finite-capsule/whole-tail branch geometry; no input proof'})
 raw=hashlib.sha256(native_json(m).encode()).hexdigest();period_gate=sum(gate['timeline'][k] for k in ['warning_s','opening_s','hold_s','closing_s','cooldown_s']);period_laser=.8+(release-1)+6
 md={'schema':'light-cavity-kernel-emission/1','provider_id':PROVIDER_ID,'provider_version':PROVIDER_VERSION,'grammar_id':GRAMMAR_ID,'parameterization':'minimum-inclined-release-kernel','classification':'candidate','spec':s,'derived':d,'removed_source_bodies':removed,'removed_source_ids':[o['id'] for o in removed],'retained_body_changes_from_source':retained_changes,'source_lineage':{'map_path':'../../physics/R14-light-cavity/map.json','map_sha256':SOURCE_MAP_SHA,'tape_path':'../../physics/R14-light-cavity/attempt01-inputs.json','tape_sha256':SOURCE_TAPE_SHA,'controller_sha256':SOURCE_CONTROLLER_SHA,'source_exact_bytes_reconstructed':raw==SOURCE_MAP_SHA,'old_measured_exit_only':{'tick':920,'time_s':7.666666666666667,'x':1210,'y':330.5499999999999,'vx':150,'vy':78.99999999999989},'old_measured_release_crossing_only':{'cooldown_first_old_capsule_overlap_s':4.6625,'old_centerline_cross_s':4.729166666666667,'full_gate_tail_s':6.133333333333333},'old_tape_not_run_here':True,'old_controller_requires_upper_body':'It directly dereferences inclined-upper; do not call it unchanged on a no-upper map. Any adapted controller needs a new declaration.'},'relations':{'footprint_release':'lower laser starts280/560 and ends at y230; span changes slope. Release when x=finiteEnd−lead, not after endpoint bypass.','closing':'close begins release+.1; duration=1.5*(wholeRadiusTail−closeStart), leaving exactly1/3 of320px gap at tail','recovery':'world ends240px after gate right edge, retaining230px after full-radius tail; no arbitrary terminal trimming','finite_scope':'beam is one width10 fixed-direction capsule translated vertically by native sineA20/P6, never rotated/tracked','active_band':'overlap uses full-radius lower halfplane and gate top; optional upper adds a conservative halfplane only if its expanded x extent reaches the receiver. Monotone line+sine extrema are endpoint-exact for this band.','descent_scope':'pre-release above-lower-branch upper bound compared with actual gate-right-edge lower bound; not a global unique-route or reachable-flight claim'},'body_roles':{'inclined-lower':{'mechanical':'live lower capsule bounds the above-beam branch, then real cooldown releases crossing space','visual':'one visible rising edge, less enclosed than the source channel'},'wide-receiving-cavity':{'mechanical':'closing full-width aperture receives a lower posture and persists through full tail','visual':'one shared cavity makes the release/reception location legible'},'inclined-upper':{'mechanical':'adds a real early upper collision boundary; late gate top can dominate it. Shortening/removal changes branch access.','visual':'paired parallel rails give channel identity and rhythm; losing them is a real design cost even if a tape could pass'},'ceiling-fold':{'mechanical':'long fold can constrain entry side; short fold leaves an above-tip alternative. Not automatically redundant.','visual':'a distinct entrance turn prepares the rising phrase'}},'optional_upper_branch':{'kernel':'with both rails removed, high preparation before the incline is available as a geometric alternative; it need not trace the lower edge','short_rail_or_fold':'a short upper rail can end before the gate, and a short fold can leave an above-tip route; actual reachability/control cost remains unknown','full_source':'full ceiling fold/full upper rail can block that early high route, so do not promise identical bypass for all masks','limits':'the gate still needs real entry and full-tail receipt; an optional high branch is not proof that every phase can be ignored'},'entry':{'initial_player':copy.deepcopy(m['initial_player']),'accepted_box':None},'exit':{'actual_new_state':None,'time_if_alive_s':d['exit_if_alive_s'],'desired_y':[300,390],'desired_abs_vy':120,'preserve':['absolute time','actual y/vy','every retained laser timeline','gate phase and future cycles']},'future_cycles':{'laser_next_warning_s':.2+period_laser,'laser_next_active_s':1+period_laser,'gate_next_warning_s':1.1+period_gate,'gate_next_opening_s':1.9+period_gate,'all_retained_sources_repeat':True,'not_reset_at_exit':True},'readability_cost':'minimum kernel may retain the action relation while losing the original channel enclosure and entry rhythm; visual value must be reviewed independently of collision removability','input_question':'Can two actual bodies preserve a readable rise, an interior lower-capsule crossing during real cooldown, and a closing-gate full-tail receipt from the declared entry?','preview_contract':{'lookahead_px':520,'camera_verified':False,'rule':'show actual finite lower beam and real gate aperture; warning beam is nonlethal, gate warning stays solid. Endpoint/cooldown cues must remain distinguishable.'},'risks':['no new input or trajectory is inherited by removing bodies','earlier high preparation may weaken following-the-incline gameplay while remaining valid','compact steeper slope can change flap timing despite preserved late band relation','old controller relies on removed upper rail','losing channel identity can be a cost even with a pass'],'measured_bounds':None,'new_physics_run':False,'native_map_sha256':raw}
 return {'map':m,'metadata':md}
