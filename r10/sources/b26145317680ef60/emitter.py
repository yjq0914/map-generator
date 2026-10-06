"""Pure measured-carried-speed gate emitter. No file/network I/O or player integration."""
import copy, hashlib, json, math
SCHEMA="carried-speed-gate-spec/1"; PROVIDER_ID="carried-speed-gate"; PROVIDER_VERSION="1.0.0"
GRAMMAR_ID="measured-carried-speed-opening"; R=10.
PREFIX_MAP={'schema': 'flappy-loop-lab/1',
 'id': 'r18-sr-f0697f4dfb00',
 'seed': 1,
 'width': 1270.0,
 'height': 540,
 'route_id': 'main',
 'units': {'distance': 'px', 'time': 's', 'velocity': 'px/s'},
 'generator_parameters': {},
 'initial_player': {'x': 60, 'y': 330, 'vx': 150, 'vy': 0},
 'obstacles': [{'id': 'S-capture',
                'mechanic_kind': 'suction_core',
                'route_id': 'main',
                'x': 560.0,
                'y': 160.0,
                'collider': {'shape': 'circle', 'w': 40.0, 'h': 40.0},
                'effect_region': {'radius_px': 220},
                'motion': None,
                'timeline': None,
                'interaction': {'lethal': True, 'acceleration_px_s2': 220},
                'mount': 'world',
                'group_id': 'carried-reception',
                'stage_id': 'R18'},
               {'id': 'P-receiver',
                'mechanic_kind': 'fixed_armor_or_spike',
                'route_id': 'main',
                'x': 840.0,
                'y': 240,
                'collider': {'shape': 'polygon',
                             'w': 250,
                             'h': 170,
                             'points': [[0.0, 90], [90.0, 0], [200.0, 20], [250.0, 90], [250.0, 170], [0.0, 170]]},
                'effect_region': None,
                'motion': None,
                'timeline': None,
                'interaction': {'lethal': True},
                'mount': 'world',
                'group_id': 'carried-reception',
                'stage_id': 'R18'}]}
ANCHOR={'tick':538,'time_s':4.483333333333333,'x':801.4579157363617,'y':245.93857034571474,'vx':60.60698349607955,'vy':-187.50000000000003,'alive':True,'won':False}
ANCHOR_SHA256='0306bcc2164172345c10cbcdeeec18e72232eea8b60b887bc31a5f240b04bf05'
PREFIX_MAP_SHA256='4399985a5a4eb8fa3cc91df30cdb5f6a9bd604af16a4c11d473b0b571f80b036'
CONTROLLER_SHA256='45401a7fb3ca9816a2751c72c39fa36abe5b9428a3f178b5c99e4b2c34919003'
PREFIX_TAPE_SHA256='9343b89cc7c8666debd1e03df2b630599919a9df393d3fb3305c7638d0d876c9'
PREFIX_TRACE_SHA256='966f5cd0b26bde548589227cfc73dc63a5a0752263060ae5e42556a9fcbeeb5a'
PREFIX_FLAPS=[1,86,170,255,350,430,523]
class SpecError(ValueError):
 def __init__(self,message,details=None):super().__init__(message);self.details=details or {}
def base_spec():return {'schema':SCHEMA,'island_tail_to_gate_front_px':70,'gate_width_px':80,'gate_center_y':250,'opening_px':160,'clock_basis':'observed-anchor','hold_mode':'whole-width'}
def native_json(m):return json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
def prefix_map():return copy.deepcopy(PREFIX_MAP)
def state_at(m,t):
 """Gate clock geometry, no player state inference or simulation."""
 o=next(o for o in m['obstacles'] if o['mechanic_kind']=='timed_armor_gate');q=o['timeline'];period=sum(q[k] for k in ['warning_s','opening_s','hold_s','closing_s','cooldown_s']);z=t-q['start_s'];p=z%period if z>=0 else 0
 phase='closed';f=0.
 if z>=0:
  if p<q['warning_s']:phase='warning'
  elif p<q['warning_s']+q['opening_s']:phase='opening';f=(p-q['warning_s'])/q['opening_s']
  elif p<q['warning_s']+q['opening_s']+q['hold_s']:phase='open';f=1.
  elif p<q['warning_s']+q['opening_s']+q['hold_s']+q['closing_s']:phase='closing';f=1-(p-q['warning_s']-q['opening_s']-q['hold_s'])/q['closing_s']
 gap=f*o['motion']['opening_px'];top=o['y']-gap/2;bot=o['y']+gap/2
 return {'id':o['id'],'phase':phase,'gap_px':gap,'warning_closed_lethal':phase=='warning','body_lethal':True,'support_band_y':[top+R,bot-R] if gap>2*R else None,'bounds_exclusive':True,'bodies':[{'x':o['x'],'y':-120,'w':o['collider']['w'],'h':top+120},{'x':o['x'],'y':bot,'w':o['collider']['w'],'h':660-bot}],'period_s':period,'cycle_index':int(math.floor(z/period)) if z>=0 else None}

def emit(spec):
 if not isinstance(spec,dict):raise SpecError('spec must be dict')
 unknown=set(spec)-set(base_spec())
 if unknown:raise SpecError('unsupported parameters: '+', '.join(sorted(unknown)))
 d={**base_spec(),**copy.deepcopy(spec)}
 if d['schema']!=SCHEMA:raise SpecError('wrong schema')
 if d['clock_basis'] not in ['observed-anchor','nominal150'] or d['hold_mode'] not in ['whole-width','seed-width80']:raise SpecError('unsupported clock/hold enum')
 for k in ['island_tail_to_gate_front_px','gate_width_px','gate_center_y','opening_px']:
  if not isinstance(d[k],(int,float)) or isinstance(d[k],bool) or not math.isfinite(d[k]):raise SpecError(k+' must be finite')
 gap=d['island_tail_to_gate_front_px'];w=d['gate_width_px'];cy=d['gate_center_y'];opening=d['opening_px']
 if not 0<=gap<=300 or not 40<=w<=400 or not 160<=cy<=400 or not 100<=opening<=240 or cy-opening/2<R or cy+opening/2>540-R:raise SpecError('outside selected/native receiving profile domain')
 island=PREFIX_MAP['obstacles'][1];island_tail=island['x']+island['collider']['w']+R;gx=island_tail+gap+R;xf=gx-R;xt=gx+w+R
 actual_v=ANCHOR['vx'];clock_v=actual_v if d['clock_basis']=='observed-anchor' else 150
 actual_front=ANCHOR['time_s']+(xf-ANCHOR['x'])/actual_v;actual_tail=ANCHOR['time_s']+(xt-ANCHOR['x'])/actual_v
 scheduled_front=ANCHOR['time_s']+(xf-ANCHOR['x'])/clock_v;hold_w=w if d['hold_mode']=='whole-width' else 80;scheduled_tail=ANCHOR['time_s']+(gx+hold_w+R-ANCHOR['x'])/clock_v
 full=scheduled_front-.2;close=scheduled_tail+.2;warning=.8;opening_s=.65;closing_s=.65;cooldown=3.5;start=full-opening_s-warning;hold=close-full
 if start<0 or hold<=0:raise SpecError('derived native timeline invalid')
 gate={'id':'G-carried-receiver','mechanic_kind':'timed_armor_gate','route_id':'main','x':gx,'y':cy,'collider':{'shape':'rectangle','w':w,'h':540},'effect_region':None,'motion':{'opening_px':opening},'timeline':{'start_s':start,'warning_s':warning,'opening_s':opening_s,'hold_s':hold,'closing_s':closing_s,'cooldown_s':cooldown},'interaction':{'lethal':True},'mount':'world','group_id':'measured-carried-reception','stage_id':'R22'}
 m=copy.deepcopy(PREFIX_MAP);m['id']='r22-cg-'+hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:12];m['width']=xt+180;m['obstacles'].append(gate)
 exit_t=ANCHOR['time_s']+(m['width']-ANCHOR['x'])/actual_v;period=warning+opening_s+hold+closing_s+cooldown;next_warning=start+period
 derived={'island_whole_radius_tail_x':island_tail,'gate_x':gx,'gate_first_radius_envelope_x':xf,'gate_whole_radius_tail_x':xt,'gate_width_px':w,'gate_full_open_support_band_y':[cy-opening/2+R,cy+opening/2-R],'band_bounds_exclusive':True,'measured_reference_vx_px_s':actual_v,'clock_speed_used_px_s':clock_v,'hold_width_used_px':hold_w,'conditional_actual_front_s':actual_front,'conditional_actual_tail_s':actual_tail,'conditional_entire_body_occupancy_s':actual_tail-actual_front,'scheduled_front_reference_s':scheduled_front,'scheduled_tail_reference_s':scheduled_tail,'full_open_start_s':full,'closing_start_s':close,'full_open_front_margin_to_observed_vx_s':actual_front-full,'full_open_tail_margin_to_observed_vx_s':close-actual_tail,'gate_warning_start_s':start,'gate_motion_start_s':start+warning,'gate_period_s':period,'gate_next_warning_s':next_warning,'gate_next_opening_s':next_warning+warning,'gate_next_full_open_s':next_warning+warning+opening_s,'new_world_width':m['width'],'conditional_new_world_exit_s':exit_t,'new_world_arrival_and_exit_observed':False}
 violations=[]
 if gap<40:violations.append('selected receiving phrase needs at least40px after the island full-radius tail')
 if start<=ANCHOR['time_s'] or start+warning<=ANCHOR['time_s']:violations.append('new gate warning/motion must start after the measured anchor')
 if m['width']<=PREFIX_MAP['width']:violations.append('R22 must be a new larger world, not an extension of the old run record')
 if full>actual_front+1e-9 or close<actual_tail-1e-9:violations.append('first full-open interval does not cover observed-vx whole-body gate occupancy')
 if violations:raise SpecError('; '.join(violations)+'; this conditional measured-anchor admission is rejected, not every entry/clock/route',{'rejected_native_map':m,'derived':derived,'violations':violations,'anchor_evidence_sha256':ANCHOR_SHA256,'scope':'only conditional on fresh reproduction of the pinned old anchor and no later horizontal forces; no new input or route proof'})
 md={'schema':'carried-speed-gate-emission/1','provider_id':PROVIDER_ID,'provider_version':PROVIDER_VERSION,'grammar_id':GRAMMAR_ID,'parameterization':'frozen-force-prefix-to-clocked-receiver','classification':'candidate','spec':d,'derived':derived,'anchor_evidence':{'path':'../shared/observed-field-off-anchor.json','sha256':ANCHOR_SHA256,'observed_old_tuple':copy.deepcopy(ANCHOR),'evidence_only_no_restore':True,'snapshot_injected':False},'prefix_identity':{'source_map_sha256':PREFIX_MAP_SHA256,'source_controller_sha256':CONTROLLER_SHA256,'input_prefix_sha256':PREFIX_TAPE_SHA256,'trace_prefix_sha256':PREFIX_TRACE_SHA256,'prefix_flap_ticks':list(PREFIX_FLAPS),'prefix_decisions':'0 through537 inclusive','anchor_decision538_flap':False,'anchor_decision_excluded_from_prefix':True,'initial_player_unchanged':m['initial_player']==PREFIX_MAP['initial_player'],'prefix_descriptors_unchanged':m['obstacles'][:2]==PREFIX_MAP['obstacles'],'source_map_path':'../../physics/R18-suction-island/force-on-map.json','source_controller_path':'../../physics/R18-suction-island/proposed-controller.cjs'},'relations':{'placement':'gate first expanded-x plane = old island full-radius tail + gap; whole gate tail includes actual width+2R','clock':'conditional t(x)=old measured tA+(x−xA)/old measured positivevx; never150 after force','hold':'full open from derived front−.2 to derived full-radius tail+.2; width control does not silently reuse an80px hold','force_free':'anchor x801.4579 is beyond all field x<=800. If fresh prefix matches and remains alive, positivevx is unchanged by remaining static island and timed gate; no new horizontal force exists.','motion_scope':'new gate is static closed through anchor. Starting its motion later avoids a new global motion term in the pre-anchor adaptive-substep budget; actual prefix equality must still be tested.','vertical_scope':'the clock formula gives longitudinal crossing times only. It neither propagates old anchorvy to the gate nor certifies passage over the island or through the opening.'},'fresh_world_contract':{'start':'native createState of NEW map at x60/y330/vx150/vy0, tick0','never':['restore or inject the old snapshot','change new map hash to the old hash','resume the old12s-capped run','claim old X1270 was observed'],'prefix_test':'replay exact decisions0..537 or explicitly declared same frozen feedback; compare actual tick538 state before decision538','compare_fields':['tick','x','y','vx','vy','alive','won','main_time_s','main_progress_px','cooldowns','broken','portalCooldownUntil','physicsSubsteps','old mechanicState keys and field event history'],'new_state_keys':'new gate status keys may exist; compare the compatible old-key projection, not byte equality of the whole mechanicState','mismatch_rule':'if anchor differs, do not certify the schedule from the old tuple; record mismatch and stop or redesign under parent selection'},'entry':{'initial_player':copy.deepcopy(m['initial_player']),'new_anchor_observed':False,'accepted_box':None},'exit':{'actual_new_state':None,'time_conditional_s':exit_t,'desired_y':[cy-40,cy+40],'desired_vy':[-150,150],'preserve':['absolute new-world tick','actualvx/vy','force source membership/history','full gate period and future cycles'],'gate_state_at_conditional_exit':state_at(m,exit_t)},'old_R18_terminal':{'terminal':'12s-cap','tick':1440,'x':1257.0204083486444,'alive':True,'won':False,'X1270_observed':False,'record_not_modified':True},'input_question':'Can a new fresh world reproduce the frozen force prefix, traverse the original island with actual carriedvx, then receive and recover through a gate whose whole-body hold uses that measured speed?','controller_scope':{'source_feedback':'frozen R18 actual-position feedback is a reproducible prefix candidate; it is not a visible-only human policy','new_suffix':'keep a declared receiver feedback after prefix/island. Default center250 can test ordinary recovery; lower/deeper variants require a separately declared posture target. No suffix has run.','no_arrival_reset':True},'preview_contract':{'native_lookahead_px':520,'conditional_gate_full_visibility_after_anchor_s':ANCHOR['time_s']+(gx+w-520-ANCHOR['x'])/actual_v if gx+w-520>ANCHOR['x'] else None,'already_fully_in_range_at_anchor':gx+w<=ANCHOR['x']+520,'gate_warning_remains_closed_lethal':True,'verified_renderer':False,'rule':'gate source and aperture motion must be visible before actual commitment; longitudinal range is not a human readability test'},'future_cycles':{'period_s':period,'next_warning_s':next_warning,'next_opening_s':next_warning+warning,'next_full_open_s':next_warning+warning+opening_s,'source_repeats':True,'not_reset_at_local_exit':True},'risks':['fresh prefix may not match despite descriptor preservation; compare instead of assuming','actual island/receiver/posture can fail despite a correctly aligned gate clock','new dynamic gate can change later substeps and input timings','different upstream force exposure changesvx and invalidates this pinned clock','full-open is a sufficient timing contract, not all possible centered routes during partial opening'],'measured_bounds':None,'new_physics_run':False,'native_map_sha256':hashlib.sha256(native_json(m).encode()).hexdigest()}
 return {'map':m,'metadata':md}
