"""Pure default-spring -> timed-opening emitter. No runtime stepping or trajectory solver."""
import copy, hashlib, json, math
SCHEMA='spring-opening-spec/1'
GRAMMAR_ID='spring-reset-opening-reception'
R=10.; VX=150.; X0=60.; G=820.; FLAP=-290.; DT=1/120
class SpecError(ValueError):
 def __init__(self,message,details=None):super().__init__(message);self.details=details or {}
def base_spec():
 return {'schema':SCHEMA,'bounce_speed_px_s':450,'gate_width_px':90,'reference_contact_x':390,'spring_top_y':420,'receiver_center_offset_px':0,'gate_phase_offset_s':0}
def native_json(m):return json.dumps(m,ensure_ascii=False,indent=2,allow_nan=False)+'\n'
def state_at(native_map,time_s):
 """Clock geometry only. It cannot infer spring contacts or cooldown state."""
 out=[]
 for o in native_map['obstacles']:
  if o['mechanic_kind']=='spring_wall':
   out.append({'id':o['id'],'kind':o['mechanic_kind'],'phase':'active','lethal':False,'body':{'x':o['x'],'y':o['y'],'w':o['collider']['w'],'h':o['collider']['h']},'actual_cooldown_until_tick':None,'body_persists_during_cooldown':True});continue
  q=o['timeline'];period=sum(q[k] for k in ['warning_s','opening_s','hold_s','closing_s','cooldown_s']);z=time_s-q['start_s'];p=z%period if z>=0 else 0;phase='closed';f=0.
  if z>=0:
   if p<q['warning_s']:phase='warning'
   elif p<q['warning_s']+q['opening_s']:phase='opening';f=(p-q['warning_s'])/q['opening_s']
   elif p<q['warning_s']+q['opening_s']+q['hold_s']:phase='open';f=1.
   elif p<q['warning_s']+q['opening_s']+q['hold_s']+q['closing_s']:phase='closing';f=1-(p-q['warning_s']-q['opening_s']-q['hold_s'])/q['closing_s']
  gap=f*o['motion']['opening_px'];top=o['y']-gap/2;bot=o['y']+gap/2
  out.append({'id':o['id'],'kind':o['mechanic_kind'],'phase':phase,'gap_px':gap,'lethal':True,'warning_is_closed_lethal':phase=='warning','support_band_y':[top+R,bot-R] if gap>2*R else None,'bounds_exclusive':True,'bodies':[{'x':o['x'],'y':-120,'w':o['collider']['w'],'h':top+120},{'x':o['x'],'y':bot,'w':o['collider']['w'],'h':660-bot}],'period_s':period})
 return out

def emit(spec):
 if not isinstance(spec,dict):raise SpecError('spec must be a dict')
 if set(spec)-set(base_spec()):raise SpecError('unsupported spec field')
 d={**base_spec(),**copy.deepcopy(spec)}
 if d['schema']!=SCHEMA:raise SpecError('wrong schema')
 for k,v in d.items():
  if k!='schema' and (not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v)):raise SpecError(k+' must be finite')
 b=d['bounce_speed_px_s'];w=d['gate_width_px'];xc=d['reference_contact_x'];sy=d['spring_top_y'];offset=d['gate_phase_offset_s'];yc=sy-R-.01
 if not 0<b<=600 or not 20<=w<=300 or not 330<=sy<=460 or not 360<=xc<=430:raise SpecError('outside selected native/profile domain')
 tc=(xc-X0)/VX;apex_delay=b/G;rise=b*b/(2*G);center=yc-rise+d['receiver_center_offset_px'];front=tc+.85*apex_delay;gx=X0+VX*front+R;tail=(gx+w+R-X0)/VX
 full=front-.08+offset;close=tail+.12+offset;opening=.55;warning=.8;start=full-opening-warning;hold=close-full
 if not 90<center<450 or start<0 or hold<DT:raise SpecError('derived gate shape/timeline outside selected domain')
 spring={'id':'S-reset','mechanic_kind':'spring_wall','route_id':'main','x':360,'y':sy,'collider':{'shape':'rectangle','w':70,'h':18},'effect_region':None,'motion':None,'timeline':None,'interaction':{'lethal':False,'bounce_speed_px_s':b,'cooldown_s':.35},'mount':'world','group_id':'reset-reception','stage_id':'R19'}
 gate={'id':'G-receiver','mechanic_kind':'timed_armor_gate','route_id':'main','x':gx,'y':center,'collider':{'shape':'rectangle','w':w,'h':540},'effect_region':None,'motion':{'opening_px':160},'timeline':{'start_s':start,'warning_s':warning,'opening_s':opening,'hold_s':hold,'closing_s':.6,'cooldown_s':3.5},'interaction':{'lethal':True},'mount':'world','group_id':'reset-reception','stage_id':'R19'}
 native={'schema':'flappy-loop-lab/1','id':'r19-so-'+hashlib.sha256(json.dumps(d,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:12],'seed':1,'width':gx+w+300,'height':540,'route_id':'main','units':{'distance':'px','time':'s','velocity':'px/s'},'generator_parameters':{},'initial_player':{'x':60,'y':330,'vx':150,'vy':0},'obstacles':[spring,gate]}
 lo=center-80+R;hi=center+80-R;clear_spring=(430+R-X0)/VX;reference_return=2*b/G;full_preview=max(0,(gx+w-X0-520)/VX)
 derived={'reference_contact_time_s':tc,'reference_contact_x':xc,'conditional_top_reset_y':yc,'conditional_top_reset_vy':-b,'reference_freeflight_apex_delay_s':apex_delay,'reference_freeflight_rise_px':rise,'reference_freeflight_apex_y':yc-rise,'reference_estimate_scope':'continuous gravity reference only; not native integration, no contact or reachability witness','gate_center_y':center,'gate_x':gx,'gate_full_radius_front_s':front,'gate_center_crossing_s':(gx+w/2-X0)/VX,'gate_full_radius_tail_s':tail,'gate_full_open_start_s':full,'gate_closing_start_s':close,'full_open_support_band_y':[lo,hi],'full_open_front_margin_s':front-full,'full_open_tail_margin_s':close-tail,'reference_contact_to_gate_front_s':front-tc,'spring_full_radius_tail_clear_s':clear_spring,'spring_remaining_x_clearance_after_reference_contact_s':clear_spring-tc,'reference_return_to_reset_height_s':reference_return,'reference_flap_overwrite_speed_difference_px_s':b-abs(FLAP),'reference_held_y_at_gate_front':yc-b*(front-tc)+G*(front-tc)**2/2,'reference_immediate_flap_y_at_gate_front':yc+FLAP*(front-tc)+G*(front-tc)**2/2,'reference_no_flap_y_at_gate_tail':yc-b*(tail-tc)+G*(tail-tc)**2/2,'gate_first_fully_in_520px_lookahead_s':full_preview,'preview_before_warning_s':start-full_preview,'nominal_alive_map_exit_s':(native['width']-X0)/VX,'actual_contact':None,'actual_reception_y_vy':None}
 violations=[]
 if not 360+R<=xc<=430-R:violations.append('reference contact must be within the spring interior with10px lateral margin')
 if b-abs(FLAP)<100:violations.append('selected strong-reset question needs at least100px/s initial speed difference from flap')
 if front-clear_spring<.12:violations.append('selected receiver needs at least.12s whole-radius horizontal separation after the spring tail')
 if clear_spring-tc>=reference_return:violations.append('selected clearance-before-return reference condition fails')
 if not lo+12<derived['reference_held_y_at_gate_front']<hi-12:violations.append('conditional no-flap reference front posture lacks12px support-band margin')
 if full>front+1e-12 or close<tail-1e-12:violations.append('full-open-through-whole-radius gate occupancy contract fails')
 if violations:raise SpecError('; '.join(violations)+'; only this authored reference relation rejected, not all spring routes',{'rejected_native_map':native,'derived':derived,'violations':violations,'scope':'conditional contact + geometric/continuous-reference authoring rule; no physics'})
 future=start+warning+opening+hold+.6+3.5
 metadata={'schema':'spring-opening-emission/1','grammar_id':GRAMMAR_ID,'parameterization':'optional-default-reset-to-clocked-aperture','classification':'candidate','spec':d,'derived':derived,'relations':{'spring_to_receiver':'gate center=top−R−.01−b²/(2g)+offset; gate front time=t_reference+.85*b/g; both use a conditional top reset, not an observed event','whole_width':'hold extends from front−.08 to whole-radius tail+.12; width+2R is included, not only center crossing','not_arrival_triggered':'gate clock is fixed from authored reference; actual spring contact may be earlier/later/absent. No clock reset, no wait.','reference_scope':'closed-form constant-gravity quantities are layout estimates, not native discrete trajectories or input feasibility; support bands at expanded front/tail are conservative near corners','native_spring':'default contact: any circle/body hit can trigger; oldY<spring.y+h/2 chooses top. No descending-only filter or timed-course substitution.','order':'flap sets vy−290 at tick start; a later spring collision in that tick can override it. A flap on a later tick can override the bounce.','cooldown':'per source, tick+ceil(.35/DT); active body remains and contact is not automatically retriggered while cooldown is running'},'entry':{'initial_player':native['initial_player'],'accepted_box':None,'spring_contact_event':None},'exit':{'actual_state':None,'desired_y':[220,340],'desired_vy':[-150,150],'clock_if_alive_s':derived['nominal_alive_map_exit_s'],'preserve':['absolute tick/time','actual y/vy','S-reset cooldown tick','active spring body','gate period and future warnings']},'optional_bypass':'Flap above the spring and enter the same aperture with ordinary cadence. Spring avoidance is legitimate and changes preparation/input history; no claim it is harder or worse until compared. There is no outside bypass around the full-height gate.','test_question':{'not_run':True,'goal':'Can an actual top-contact tape retain the stronger reset, then catch with a later flap through the entire gate and recover? Compare a post-contact early flap and an avoid-spring tape.','measure':['actual first bounce tick, side, x/y/vy and cooldown','first gate-body overlap y/vy','whole gate-tail y/vy','flap times and actual exit state'],'early_flap_limit':'Only compare after a real bounce and record the next-tick flap. Same-tick input can be overwritten by contact; later flaps may be necessary. Never interpret no-early-flap as no-flap forever.','controller_sketch':'Observe first actual top bounce; compare retain versus next-tick flap, then use the same declared downstream feedback. An avoidance tape is a separate branch, not a forged no-bounce checkpoint.'},'preview_contract':{'native_lookahead_px':520,'full_gate_in_range_s':full_preview,'warning_starts_s':start,'verified_renderer':False,'gate_warning_closed_lethal':True,'spring_has_no_countdown':True,'rule':'spring and aperture silhouettes appear during approach; do not invent contact-triggered opening cues'},'future_state':{'spring_remains_active':True,'gate_next_warning_s':future,'world_not_reset':True},'risks':['actual top contact may not happen at reference x/time','side or bottom contact uses oldY midpoint and can push downward','retaining bounce too long can fall into lower gate; an early or late flap may still work under other input histories','cooldown collision can overlap active spring without a new reset; body is not removed','full-open clock coverage does not prove y/vy passage','spring avoidance may be cheaper; compare before claiming gameplay value'],'measured_bounds':None,'new_physics_run':False,'native_map_sha256':hashlib.sha256(native_json(native).encode()).hexdigest()}
 return {'map':native,'metadata':metadata}
