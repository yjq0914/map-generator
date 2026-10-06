#!/usr/bin/env python3
"""Experimental relational full-map compiler. No runtime stepping or hidden retries."""
from __future__ import annotations
import argparse, copy, hashlib, json, math, random, sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent))
import candidate_generate as candidates
import active_eligibility as eligibility

VERSION='combo-map-integration/1'
CATALOG={
 'cloister':{'provider':'cloister-full-circle@1.0.0','title':'Full-circle arcade','actions':['rise','fall','rise'],'themes':['arcade','foundry'],'pressure':2,'same_type':False},
 'slider-island':{'provider':'mixed01-slider-fixed-route@1.0.0','title':'Slider commits a route','actions':['read-phase','choose-layer','merge'],'themes':['foundry','arcade'],'pressure':3,'same_type':False},
 'spring-reception':{'provider':'spring-reset-opening-reception@1.0.0','title':'Optional spring and receiver','actions':['contact-or-bypass','retain-impulse','catch'],'themes':['foundry','signal'],'pressure':3,'same_type':False},
 'light-cavity':{'provider':'light-cavity-kernel@1.0.0','title':'Light release and receipt','actions':['rise','release-fall','catch'],'themes':['signal'],'pressure':3,'same_type':False},
 'tidal-staircase':{'provider':'integration/tidal-staircase@1','title':'Tidal wall shelves','actions':['rise','sustain','fall','recover'],'themes':['arcade','foundry'],'pressure':1,'same_type':True},
 'bellows-question-answer':{'provider':'integration/bellows-question-answer@1','title':'Gate question and answer','actions':['low-sustain','advance-rise','return-low'],'themes':['signal','foundry'],'pressure':2,'same_type':True},
}
THEMES={'arcade':['rise','fall','sustain'],'foundry':['choose-layer','contact-or-bypass','catch'],'signal':['read-phase','advance-rise','release-fall']}
ROLES=['introduce','develop','peak','release','recall','answer','resolve']
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()
def guide(rows):return [dict(x=a,until_x=b,target_y=y,**extra) for a,b,y,extra in rows]
def fragment(family,variant='base',difficulty='medium'):
 if family not in CATALOG:raise ValueError('Unknown family')
 if variant not in ['base','alternate']:raise ValueError('Unknown discrete variant')
 spec={};info=CATALOG[family]
 if family=='cloister':spec={'answer_advance_px':60 if variant=='alternate' else 0}
 elif family=='slider-island':spec={'branch':'upper','core_shift_px':60 if variant=='alternate' else 0}
 elif family=='spring-reception':spec={'gate_width_px':120 if variant=='alternate' else 90}
 elif family=='light-cavity':spec={'rail_mode':'upper','upper_rail_fraction':1/3 if variant=='base' else 2/3}
 else:
  from rules.additional import emit
  out=emit(family,variant='extended' if variant=='alternate' else 'base',difficulty=difficulty)
  out=copy.deepcopy(out);out['family']=family;out['variant']=variant;out['metadata']['provider']=info['provider'];return out
 emitted=candidates.generate(info['provider'],spec,root=HERE.parent)
 m=json.loads(emitted['map_bytes']);md=emitted['metadata'];p=md['provider_metadata'];end=m['width']
 if family=='cloister':
  advance=spec['answer_advance_px']
  g=guide([(60,160,298,{}),(160,480-advance,200,{}),(480-advance,795-advance/2,390,{}),(795-advance/2,1095,200,{}),(1095,end,298,{})])
 elif family=='slider-island':
  shift=spec['core_shift_px'];g=guide([(60,235+shift,298,{}),(235+shift,686+shift,190,{}),(686+shift,end,298,{})])
 elif family=='spring-reception':
  center=p['derived']['gate_center_y'];tail=p['derived']['gate_x']+spec['gate_width_px']+10
  g=guide([(60,300,330,{}),(300,440,415,{'policy':'spring-acquire'}),(440,tail,center-25,{'policy':'spring-receive'}),(tail,end,280,{})])
 else:
  release=p['derived']['release_player_x']
  g=guide([(60,280,440,{}),(280,release,400,{'target_y_end':235,'policy':'laser-channel'}),(release,end,375,{'policy':'laser-receive'})])
 return {'family':family,'variant':variant,'map':m,'metadata':md,'guide':g}

def extents(m):
 bounds=[]
 for o in m['obstacles']:
  x=o['x'];w=o['collider']['w'];motion=o.get('motion') or {}
  if o['mechanic_kind']=='laser_scanner':
   dx=motion.get('dx_px',w);bounds.append((min(x,x+dx)-15,max(x,x+dx)+15))
  elif o['mechanic_kind']=='horizontal_armor_slider':
   a=abs(motion.get('amplitude_px',0));bounds.append((x-a-10,x+w+a+10))
  else:bounds.append((x-10,x+w+10))
 return min(a for a,b in bounds),max(b for a,b in bounds)

def translate(o,dx,time_shift,prefix):
 o=copy.deepcopy(o);old=o['id'];o['id']=prefix+'-'+old;o['x']+=dx
 for field in ['group_id','stage_id','template_instance_id']:
  if field in o:o[field]=prefix+'-'+o[field]
 motion=o.get('motion') or {}
 if 'phase_rad' in motion and 'period_s' in motion:motion['phase_rad']-=2*math.pi*time_shift/motion['period_s']
 q=o.get('timeline') or {}
 # Absolute origins shift once. Duration-valued warning_s on laser/gate is not an origin.
 for key in ['start_s','first_s']:
  if key in q:q[key]+=time_shift
 if o['mechanic_kind']=='warning_drop_spike' and 'warning_s' in q:q['warning_s']+=time_shift
 if isinstance(o.get('effect_region'),dict) and 'x' in o['effect_region']:o['effect_region']['x']+=dx
 eligibility.require_mechanics(o,'translated body')
 return o

def seam_gap(a,b,role,difficulty,revision):
 # Reserve is for a real vertical preparation action, not a fixed rest/reset.
 ay=a['guide'][-1]['target_y'];by=b['guide'][0]['target_y']
 if revision>=3:
  # The final recovery row is trimmed; never use its unattained target as exit.
  end=a.get('active_end',extents(a['map'])[1]);incoming=b.get('active_start',extents(b['map'])[0])
  retained=[g for g in a['guide'] if g['x']<end]
  ay=retained[-1]['target_y_end'] if 'target_y_end' in retained[-1] else retained[-1]['target_y']
  begun=[g for g in b['guide'] if g['x']<=incoming]
  by=begun[-1]['target_y'] if begun else b['guide'][0]['target_y']
  if a['family']=='spring-reception' and not (revision>=5 and any(o['id']=='receipt-answer-roof' for o in a['map']['obstacles'])):ay=next(o for o in a['map']['obstacles'] if o['id']=='G-receiver')['y']+25
  if b['family']=='spring-reception':by=330  # preparation ceiling, contact remains optional
  if a['family']=='cloister' and b['family']=='slider-island':by=210
 dy=abs(by-ay)
 gap=65+min(120,dy*.65)+(25 if role=='release' else 0)
 if revision>=2:
  # L1 left input-state mismatch; geometry compatibility is repaired separately.
  # Small remaining approach reserve only, never a state-reset or generic rest.
  gap+=10 if b['family']=='slider-island' else 0
 return round(gap/5)*5

def select_plan(seed,duration_s,difficulty,theme,actions,revision=1,holdout=False,families=None):
 rng=random.Random(seed);pool=[]
 allowed=list(CATALOG) if families is None else list(families)
 if len(set(allowed))<4 or any(x not in CATALOG for x in allowed):raise ValueError('Explicit palette requires4..6 distinct known families')
 for family in allowed:
  for variant in ['base','alternate']:
   f=fragment(family,variant,difficulty)
   if revision>=4:
    from rules.geometry_v4 import refine_fragment
    f=refine_fragment(f,difficulty,revision)
   if revision>=5:
    from rules.geometry_v5 import refine_fragment as refine_v5
    f=refine_v5(f,difficulty,revision)
   if revision>=6:
    from rules.handoffs_v6 import refine_fragment as refine_v6
    f=refine_v6(f,difficulty,revision)
   if revision>=7:
    from rules.receipt_v7 import refine_fragment as refine_receipt
    f=refine_receipt(f,difficulty,revision)
   f['active_start'],f['active_end']=extents(f['map']);pool.append(f)
 staged_pool={}
 if revision>=8:
  from rules.stage_relations_v8 import refine_fragment as refine_stage
  for source in pool:
   for stage in range(3):
    f=refine_stage(source,difficulty,stage,revision)
    f['active_start'],f['active_end']=extents(f['map'])
    staged_pool[(source['family'],source['variant'],stage)]=f
 if not (30<=duration_s<33 or duration_s==120):raise ValueError('Canonical supported request:30..32.9s short maps or exactly120s macro')
 max_bodies=40 if duration_s<33 else 384
 lower=30 if duration_s<33 else duration_s-1.2;upper=min(32.9,duration_s+1.2) if duration_s<33 else duration_s
 noise={(f['family'],f['variant']):rng.uniform(-.5,.5) for f in pool}
 states=[{'seq':[],'last':60.,'count':0,'score':0.,'seen':set()}];complete=[]
 max_depth=7 if duration_s<33 else 26
 for depth in range(max_depth):
  next_states=[]
  for st in states:
   role=ROLES[depth%len(ROLES)]
   if revision>=4:
    from rules.grammar_v4 import role_for
    role=role_for(depth,seed,theme)
   for source in pool:
    f=source
    authored_stage=None
    if revision>=8:
     from rules.stage_grammar_v8 import stage_context
     provisional_dx=0 if not st['seq'] else st['last']+seam_gap(st['seq'][-1]['fragment'],source,role,difficulty,revision)-source['active_start']
     authored_stage=stage_context(source['active_start']+provisional_dx,source['active_end']+provisional_dx,duration_s)
     f=staged_pool[(source['family'],source['variant'],authored_stage['index'])]
    if st['seq'] and st['seq'][-1]['fragment']['family']==f['family']:continue
    if revision>=2 and st['seq'] and st['seq'][-1]['fragment']['family']=='cloister' and f['family'] in ['spring-reception','bellows-question-answer','light-cavity']:continue
    if not st['seq'] and f['family'] in ['spring-reception','light-cavity']:continue
    if st['count']+len(f['map']['obstacles'])>max_bodies:continue
    if not st['seq']:dx=0
    else:dx=st['last']+seam_gap(st['seq'][-1]['fragment'],f,role,difficulty,revision)-f['active_start']
    end=f['active_end']+dx;duration=(end+160-60)/150
    if duration>upper:continue
    family=f['family'];meta=CATALOG[family];seen=st['seen']|{family}
    score=st['score'] if revision>=8 else st['score']+(2 if theme in meta['themes'] else 0)+sum(a in meta['actions'] for a in actions)*.5+(1.7 if family not in st['seen'] else -.7)
    score+=(1.1 if (role=='peak' and meta['pressure']==3) or (role=='release' and meta['pressure']==1) or (role=='introduce' and meta['pressure']<3) else 0) if revision<8 else 0
    score+=noise[(family,f['variant'])]+(.3 if holdout and f['variant']=='alternate' else 0)
    if duration_s==120 and revision<8:
     count=sum(r['fragment']['family']==family for r in st['seq'])
     score-=.75*count  # discourage a120s map from repeating its highest theme score
     if len(st['seq'])>=3:
      pair=(st['seq'][-1]['fragment']['family'],family)
      score-=1.2*sum((st['seq'][i]['fragment']['family'],st['seq'][i+1]['fragment']['family'])==pair for i in range(len(st['seq'])-1))
    if revision>=8:
     from rules.stage_grammar_v8 import score_adjustment
     score+=score_adjustment(st['seq'],f,dx,duration_s,theme,actions=actions)
    elif revision>=4:
     from rules.grammar_v4 import score_adjustment
     score+=score_adjustment(st['seq'],f,role,depth,seed,theme,actions=actions)
    row={'fragment':f,'dx':dx,'role':role}
    if revision>=8:row['authored_stage']=authored_stage
    ns={'seq':st['seq']+[row],'last':end,'count':st['count']+len(f['map']['obstacles']),'score':score,'seen':seen}
    if lower<=duration<=upper and len(seen)>=4:complete.append((score-2*abs(duration-duration_s),ns))
    if duration<upper-2:next_states.append(ns)
  # Keep diversity across last family and depth; this is authoring search, no physics feedback.
  next_states.sort(key=lambda x:x['score']-abs((x['last']+100-60)/150-min(duration_s,(depth+1)*5.5))*.2,reverse=True)
  states=next_states[:180]
  if not states:break
 if not complete:raise ValueError('No whole-fragment plan fits native bounds; no silent truncation/filler')
 complete.sort(key=lambda z:z[0],reverse=True)
 # Distinct held-out seed affects tie-breaking/variants, never threshold fitting after runs.
 if revision>=8:
  from rules.stage_grammar_v8 import choose_complete
  return choose_complete(complete,seed,theme,actions,duration_s=duration_s)
 if revision>=7:
  from rules.grammar_v7 import choose_complete
  return choose_complete(complete,seed,theme,actions)
 if revision>=4:
  from rules.grammar_v4 import choose_complete
  return choose_complete(complete,seed,theme,actions)
 return complete[0][1]

def build(seed=701,duration_s=31.5,difficulty='medium',theme='arcade',actions=None,experimental=False,revision=7,holdout=False,families=None):
 if not experimental:raise ValueError('New composed maps require explicit experimental=True; no qualified continuation recipes exist')
 if difficulty not in ['easy','medium','hard'] or theme not in THEMES:raise ValueError('Unknown difficulty/theme')
 if isinstance(seed,bool) or not isinstance(seed,int) or not 0<=seed<=4294967295:raise ValueError('Seed outside uint32')
 actions=list(actions or THEMES[theme]);st=select_plan(seed,duration_s,difficulty,theme,actions,revision,holdout,families)
 modules=[];bodies=[];guides=[];seams=[];previous=None
 for index,row in enumerate(st['seq']):
  f=copy.deepcopy(row['fragment']);dx=row['dx'];ts=dx/150;prefix=f'm{index+1:02d}';a=f['active_start']+dx;b=f['active_end']+dx
  connector=None
  if revision>=2 and previous and previous['family']=='cloister' and f['family']=='slider-island':
   # Parent-reviewed geometry repair: preserve high exit instead of demanding an
   # unmeasured descent to the old middle throat and immediate re-ascent.
   top=next(o for o in f['map']['obstacles'] if o['id']=='entry-top');bottom=next(o for o in f['map']['obstacles'] if o['id']=='entry-bottom')
   top['collider']['h']=90;bottom['y']=280;bottom['collider']['h']=260
   f['guide'][0]['target_y']=210
   connector={'id':'upper-carry-entry-v1','changed_bodies':['entry-top','entry-bottom'],'aperture_y':[90,280],'previous_aperture_y':[220,340],'reason':'Cloister actual upper exit cannot descend into old throat across65px; high inlet preserves carried upper route','qualification':'new experimental relational connector; no historical qualification'}
  if revision>=3 and f['family']=='spring-reception':
   gate=next(o for o in f['map']['obstacles'] if o['id']=='G-receiver')
   original_opening=gate['motion']['opening_px'];gate['motion']['opening_px']={'easy':220,'medium':200,'hard':180}[difficulty]
   for g in f['guide']:
    if g.get('policy')=='spring-receive':g['target_y']=gate['y']+25
   connector={'id':'optional-wide-spring-reception-v1','changed_bodies':['G-receiver'],'previous_opening_px':original_opening,'opening_px':gate['motion']['opening_px'],'reason':'L2 actual top bounce plus a later catch flap reached y216 at top rim; wider receiver admits carried contact/bypass state; acquisition stays optional','qualification':'discrete experimental geometry; no proved state box or continuous range'}
  start=60 if previous is None else previous['active_end_x'];end=b
  bodyids=[]
  for source in f['map']['obstacles']:
   o=translate(source,dx,ts,prefix);bodyids.append(o['id']);bodies.append(o)
  for g in f['guide']:
   q=copy.deepcopy(g);q['x']+=dx;q['until_x']+=dx;q['x']=max(q['x'],start);q['until_x']=min(q['until_x'],b);q['module_id']=prefix
   if q['until_x']>q['x']:guides.append(q)
  module={'id':prefix,'family':f['family'],'title':CATALOG[f['family']]['title'],'variant':f['variant'],'start_x':start,'active_start_x':a,'active_end_x':b,'end_x':end,'shift_x':dx,'time_shift_s':ts,'action':CATALOG[f['family']]['actions']+(['descend-answer'] if any(o['id']=='receipt-answer-roof' for o in f['map']['obstacles']) else []),'role':row['role'],'provider':CATALOG[f['family']]['provider'],'body_ids':bodyids,'source_map_sha256':digest(f['map']),'source_metadata':f['metadata'],'qualification':'experimental-composition-no-transferred-qualification','connector_variant':connector}
  if revision>=8:
   from rules.stage_grammar_v8 import stage_context
   module['pressure_stage']={'authored':row.get('authored_stage'),'final_course':stage_context(a,b,120 if duration_s==120 else (st['last']+100)/150),'scope':'stage intent anchored to actual module geometry; not observed or calibrated difficulty'}
  modules.append(module)
  if previous:
   seams.append({'from':previous['id'],'to':prefix,'from_family':previous['family'],'to_family':f['family'],'x':start,'next_active_x':a,'spatial_reserve_px':a-start,'time_s':(start-60)/150,'intent':'prepare next height/phase while keeping real incoming y,vy,tick/cooldowns','planning_basis':'retained exit guide and incoming preparation aim; not an attained state box' if revision>=3 else 'original terminal guide target (known discarded-guide limitation in revisions1/2)','attained_state':None,'qualified_state_box':None})
  previous=module
 width=st['last']+160
 # Finish is a short active recovery: continues the final target rather than state injection.
 if guides:guides.append({'x':st['last'],'until_x':width,'target_y':guides[-1]['target_y'],'module_id':modules[-1]['id'],'policy':'terminal-recovery'})
 m={'schema':'flappy-loop-lab/1','id':f'combo-r{revision}-{seed}-{theme}','seed':seed,'units':{'distance':'px','time':'s','velocity':'px/s'},'width':width,'height':540,'route_id':'main','generator_parameters':{'requested_duration_s':duration_s,'difficulty':difficulty,'theme':theme,'actions':actions},'obstacles':bodies,'integration':{'schema':VERSION,'status':'experimental','revision':revision,'guide':guides,'modules':modules,'seams':seams,'plan':{'theme':theme,'requested_actions':actions,'difficulty':difficulty,'difficulty_scope':'discrete authored geometry choices; not calibrated human difficulty','rhythm':[x['role'] for x in modules],'selection_score':st['score'],'actual_duration_s':(width-60)/150,'target_duration_s':duration_s,'allowed_families':list(CATALOG) if families is None else list(families),'unmatched_requested_actions':[a for a in actions if not any(a in x['action'] for x in modules)],'holdout':holdout},'state_policy':'one continuous world; no intermediate createState/restore; previous cycles retained','qualification':'unqualified candidate full map; historical exact recipe proofs do not transfer'}}
 if duration_s>=33:
  m.update(schema='timed-course-120/v1',width=24000,durationTicks=14400,winMode='timed-route',worldBounds={'minX':0,'maxX':24000},routeMarks=[{'id':'finish','x':min(width-50,17900),'yMin':10,'yMax':530,'direction':'forward','portalPolicy':'physical-crossing-only'}],macroPlan=[{'startTick':0,'endTick':14400}],encounters=[],triggers=[])
  m['integration']['plan']['actual_duration_s']=120
  # Macro phrases inherit actual variable-length module boundaries, not12s bins.
  starts=[0]+[min(14399,round((modules[i]['start_x']-60)/150*120)) for i in range(7,len(modules),7)]+[14400]
  m['macroPlan']=[{'startTick':a,'endTick':b,'intent':['establish','develop','return','resolve'][i%4],'theme':theme} for i,(a,b) in enumerate(zip(starts,starts[1:])) if b>a]
  guides[-1]['until_x']=24000
 if revision>=4:m['integration']['plan']['grammar']=st.get('grammar')
 if revision>=8:
  d=m['integration']['plan']['actual_duration_s']
  m['integration']['plan']['pressure_stages']=[{'index':i,'intent':intent,'start_s':d*i/3,'end_s':d*(i+1)/3,'scope':'authored hypothesis; real trajectory pressure reported separately'} for i,intent in enumerate(['establish sustained precision','predict visible redirection','chain mixed timing and reception'])]
  if duration_s==120:m['macroPlan']=[{'startTick':i*4800,'endTick':(i+1)*4800,'intent':intent,'theme':theme} for i,intent in enumerate(['establish','redirect','chain'])]
 eligibility.require_mechanics(m,'full map including provenance and nested composites')
 return m

def main():
 p=argparse.ArgumentParser();p.add_argument('--seed',type=int,default=701);p.add_argument('--duration',type=float,default=31.5);p.add_argument('--difficulty',choices=['easy','medium','hard'],default='medium');p.add_argument('--theme',choices=list(THEMES),default='arcade');p.add_argument('--experimental',action='store_true');p.add_argument('--families',help='Comma-separated explicit4..6family palette');p.add_argument('--revision',type=int,default=7);p.add_argument('--holdout',action='store_true');p.add_argument('--out',type=Path);p.add_argument('--list-families',action='store_true');a=p.parse_args()
 if a.list_families:
  print(json.dumps({'schema':VERSION,'status':'six callable experimental relational families','families':CATALOG},ensure_ascii=False,indent=2));return
 if a.out is None:p.error('--out is required for generation')
 m=build(a.seed,a.duration,a.difficulty,a.theme,experimental=a.experimental,revision=a.revision,holdout=a.holdout,families=a.families.split(',') if a.families else None)
 a.out.parent.mkdir(parents=True,exist_ok=True)
 with a.out.open('x') as f:json.dump(m,f,ensure_ascii=False,indent=2,allow_nan=False)
 print(json.dumps({'map':str(a.out),'duration_s':m['integration']['plan']['actual_duration_s'],'families':[x['family'] for x in m['integration']['modules']],'body_count':len(m['obstacles']),'qualification':'experimental'}))
if __name__=='__main__':main()
