#!/usr/bin/env python3
"""c006 saved-evidence presentation helpers; no engine imports or execution."""
import os, sys, json, gzip, hashlib, importlib.util, datetime, subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[2]
os.environ['MPLCONFIGDIR']=str(R/'visuals/c006-render-cache-v1/mpl')
os.environ['XDG_CACHE_HOME']=str(R/'visuals/c006-render-cache-v1/xdg')
sys.dont_write_bytecode=True
sp=importlib.util.spec_from_file_location('c006_saved_renderer',R/'visuals/render_evidence.py')
v=importlib.util.module_from_spec(sp);sys.modules[sp.name]=v;sp.loader.exec_module(v)
plt=v.plt;np=v.np
PALETTE=['#206da3','#be552c','#218c73','#9258b2','#d78c16','#435166']
def read(p):return v.load_json(R/p)[0]
def digest(p):return hashlib.sha256((R/p).read_bytes()).hexdigest()
def ref(p):return {'projectRelativePath':str(p),'sha256':digest(p)}
def write(p,obj):
 with (R/p).open('x') as f:json.dump(obj,f,indent=2,ensure_ascii=False);f.write('\n')
def immutable():
 for path,h in read('outer/c006/visual-immutable-baseline-v1.json').items():assert digest(path)==h,path
 f=read('outer/c006/formal-freeze-summary.json')
 for path,h in f['files'].items():assert digest(path)==h,path
 return {'baselineUnchanged':True,'formalFreezeUnchanged':True,'sourceManifestHash':f['manifestHash']}
def authenticate(run_id,label=None):
 path=f'evidence/runs/{run_id}.json.gz'
 a=v.load_arm('C',{'run':path,'label':label or run_id},R,False)
 assert a.run['sourceManifestHash']==read('outer/c006/formal-freeze-summary.json')['manifestHash']
 ledger=[json.loads(x) for x in (R/'ledger.jsonl').read_text().splitlines()]
 commit=[x for x in ledger if x.get('kind')=='commit' and x.get('id')==run_id]
 assert len(commit)==1,(run_id,len(commit));commit=commit[0]
 for k in ['mapHash','traceSHA256','resultSHA256']:assert a.run[k]==commit[k],(run_id,k)
 script="const fs=require('fs'),z=require('zlib'),c=require('crypto');let r=JSON.parse(z.gunzipSync(fs.readFileSync(process.argv[1])));let {resultSHA256,...b}=r;let s=c.createHash('sha256').update(JSON.stringify(b)).digest('hex');if(s!==resultSHA256)throw Error('result hash mismatch');process.stdout.write(s);"
 result=subprocess.check_output(['node','-e',script,str(R/path)],text=True)
 a.commit={'id':run_id,'seq':commit['seq'],'commitHash':commit['hash'],'mapHash':a.run['mapHash'],'traceSHA256':a.run['traceSHA256'],'resultSHA256':result,'runFile':ref(path),'resultHashMatches':True}
 return a
def source(a):return {'label':a.label,'runId':a.run['id'],'status':a.status,'terminalTick':a.end_tick,'mapHash':a.run['mapHash'],'references':a.refs,'verification':a.verification,'commitBinding':a.commit}
def nearest_saved(a,tick):
 ticks={int(r[0]) for r in a.rows};return min((f['tick'] for f in a.trace['bodySamples'] if f['tick'] in ticks),key=lambda t:abs(t-tick))
def snapshot(ax,a,tick,label='',trail=240):
 row,frame,status,reason=v.frame_status(a,tick)
 rec={'runId':a.run['id'],'tick':tick,'status':status}
 if status!='observed':
  v.scene_axes(ax,(0,800),540,True);ax.text(.5,.5,reason,ha='center',transform=ax.transAxes);return rec
 xlim=(row[1]-160,row[1]+640);v.scene_axes(ax,xlim,a.map['height'],True)
 for b in frame['bodies']:v.draw_body(ax,b)
 past=[r for r in a.rows if max(0,tick-trail)<=r[0]<=tick and xlim[0]-10<=r[1]<=xlim[1]+10]
 v.plot_rows(ax,past,v.COLORS['trace'],1,.65)
 ax.add_patch(v.Circle((row[1],row[2]),v.RADIUS,facecolor=v.COLORS['player'],edgecolor='white',linewidth=.9))
 if not row[5]:ax.plot(row[1],row[2],marker='x',color='black',markersize=13)
 visible=[]
 for b in frame['bodies']:
  l,t,r,bt=v.bounds(b)
  if r>=xlim[0] and l<=xlim[1] and bt>=0 and t<=a.map['height']:
   visible.append(b)
   if '-adj-' in b['id']:
    ax.annotate(b['id'],xy=((l+r)/2,(t+bt)/2),xytext=(0,18 if '-lower' in b['id'] else -18),textcoords='offset points',ha='center',fontsize=8,fontweight='bold',color='#7b3020',arrowprops={'arrowstyle':'-','color':'#7b3020','lw':.7})
 ax.set_title(f'{label}\ntick {tick} ({tick/120:.3f}s) | y {row[2]:.1f}, vy {row[3]:.1f}',loc='left',fontsize=10)
 ax.set_xlabel('world x (px); actual 800px viewport',fontsize=8);ax.tick_params(labelsize=8)
 rec.update({'playerRow':row,'worldXRange':list(xlim),'visibleBodies':visible,'actualBodyCount':len(frame['bodies']),'visibleAuxiliaries':[b['id'] for b in visible if '-adj-' in b['id']],'trailShownTicks':[past[0][0],past[-1][0]] if past else None})
 return rec
def sequence(arms,ticks,labels,out,name,title,subtitle):
 fig,axes=plt.subplots(len(arms),len(ticks[0]),figsize=(18,5.5*len(arms)),squeeze=False)
 fig.suptitle(title+'\n'+subtitle,fontsize=15,y=.984)
 records=[]
 for i,a in enumerate(arms):
  for j,t in enumerate(ticks[i]):records.append(snapshot(axes[i,j],a,t,labels[i][j]))
 fig.text(.045,.055,'Solid coral: saved active lethal body. Blue: actual player / past trajectory. Auxiliary labels identify retained bodies, not synthesized geometry.',fontsize=10)
 fig.text(.045,.031,'Exact retained ticks; equal x/y scale. Player-relative cameras may have different world x. Past trail over current bodies is not a same-time collision.',fontsize=10)
 fig.text(.045,.009,'Existing primary patterns were reordered with all auxiliaries. No whole-frame symmetry, new internal-pattern synthesis or human-fun claim.',fontsize=10)
 fig.subplots_adjust(left=.045,right=.99,top=.89,bottom=.12,wspace=.19,hspace=.30)
 return v.saved_image(fig,out/name,title,'actual-late-sequence',{'frames':records,'sameScale':True,'equalAspect':True})
def plot_saved(ax,a,col,index,field,start,end):
 rows=[r for r in a.rows if start<=r[0]<=end];xs=[];ys=[]
 for i,r in enumerate(rows):
  if i and r[0]!=rows[i-1][0]+1:xs.append(np.nan);ys.append(np.nan)
  xs.append(r[0]/120);ys.append(r[field])
 ax.plot(xs,ys,color=col,linewidth=.85,alpha=.9,label=a.label,linestyle=['-','--',':','-.'][index%4])
 if a.end_tick<end:ax.axvline(a.end_tick/120,color=col,linestyle=':',linewidth=.8)
def clearance(ax,a,col,index,field,end=14400,start=0):
 ss=[s for s in v.sample_series(a,end) if s['tick']>=start]
 ax.plot([s['tick']/120 for s in ss],[s.get(field,np.nan) if s['status']=='observed' else np.nan for s in ss],color=col,lw=.8,marker='.',ms=1,alpha=.85,label=a.label,ls=['-','--',':','-.'][index%4])
 return {'runId':a.run['id'],'sampleCount':len(ss),'statusCounts':dict(v.Counter(s['status'] for s in ss))}
def action_compare(arms,out,name,title,start=10320,end=14160,recoveries=None):
 fig,axs=plt.subplots(5,1,figsize=(17,11.5),sharex=True,gridspec_kw={'height_ratios':[2,2,1.7,1,1]})
 fig.suptitle(title,fontsize=15,y=.98);records=[]
 for i,a in enumerate(arms):
  col=PALETTE[i];plot_saved(axs[0],a,col,i,2,start,end);plot_saved(axs[1],a,col,i,3,start,end);clearance(axs[2],a,col,i,'margin',end,start)
  inputs=[t for t in a.trace['flapTicks'] if start<=t<end];axs[3].scatter(np.array(inputs)/120,[i]*len(inputs),marker='|',s=45,color=col)
  axs[4].plot([r[0]/120 for r in a.rows if start<=r[0]<=end],[i if r[5] else np.nan for r in a.rows if start<=r[0]<=end],color=col,lw=3)
  rr=(recoveries or {}).get(a.run['id'])
  if rr:
   en,ex=rr['entryTick'],rr['exitTick']
   axs[4].plot([en/120,ex/120],[i+.2,i+.2],color=col,lw=7,solid_capstyle='butt')
   axs[4].text((en+ex)/240,i+.31,f'{(ex-en)/120:g}s actual recovery',color=col,ha='center',fontsize=8)
  records.append({'runId':a.run['id'],'exactInputCount':len(inputs),'startTick':start,'endTick':end,'terminalTick':a.end_tick,'status':a.status,'recovery':rr})
 axs[0].set_ylim(540,0);axs[0].set_ylabel('Actual y (px)');axs[0].legend(ncol=min(3,len(arms)),fontsize=9,loc='upper right')
 bound=max(abs(r[3]) for a in arms for r in a.rows if start<=r[0]<=end)*1.05;axs[1].set_ylim(-bound,bound);axs[1].set_ylabel('Actual vy (px/s)');axs[1].axhline(0,color='#999',lw=.5)
 axs[2].set_ylim(0,270);axs[2].set_ylabel('Nearest margin (px)');axs[3].set_ylabel('Exact input ticks');axs[4].set_ylabel('Alive / recovery');axs[4].set_xlabel('Actual simulation time (s), tick / 120')
 for ax in axs[3:]:ax.set_yticks(range(len(arms)),[a.label for a in arms],fontsize=8);ax.set_ylim(-.5,len(arms)-.1)
 for ax in axs:ax.set_xlim(start/120,end/120);ax.grid(alpha=.18,lw=.5)
 fig.text(.06,.037,'Saved y/vy, recorded nearest vertical margin and exact flapTicks. Recovery bars use saved observed bridge entry/exit, not desired duration alone.',fontsize=10)
 fig.text(.06,.016,'Allocated recovery is not measured ease or feasible-input tolerance. Gaps and deaths are not extended into success. No human-fun claim.',fontsize=10)
 fig.subplots_adjust(left=.15,right=.985,bottom=.1,top=.92,hspace=.18)
 return v.saved_image(fig,out/name,title,'actual-action-recovery-contrast',{'startTick':start,'endTick':end,'arms':records,'sameScale':True})
def observed_report(a):
 condition=a.run['condition']['id'];path=f'outer/c006/pair-reports/{condition}-assigned_main.json.gz';d=read(path)
 script="const fs=require('fs'),z=require('zlib'),c=require('crypto');let d=JSON.parse(z.gunzipSync(fs.readFileSync(process.argv[1])));let {cacheSHA256,...b}=d;let s=c.createHash('sha256').update(JSON.stringify(b)).digest('hex');if(s!==cacheSHA256)throw Error('cache hash mismatch');process.stdout.write(s);"
 sh=subprocess.check_output(['node','-e',script,str(R/path)],text=True)
 assert d['binding']['sourceManifestHash']==a.run['sourceManifestHash']
 binding=next(x for x in d['binding']['runs'] if x['id']==a.run['id'])
 for k in ['resultSHA256','traceSHA256','mapHash','stateSequenceSHA256']:assert binding[k]==a.run[k],k
 for b in d['backingFiles']:assert digest(b['file'])==b['sha256']
 arm='late' if a.run['arm']=='candidate' else 'parentLate';packages=d['summary'][arm]['packages'];rows={int(r[0]):r for r in a.rows};out=[]
 for p in packages:
  rec=p['recovery'];assert rec['status']=='observed'
  for k in ['entry','exit']:
   rr=rows[rec[k]['tick']]
   assert [rec[k][x] for x in ['x','y','vy']]==rr[1:4]
  start,end=rec['entry']['tick'],rec['exit']['tick'];inputs=[t for t in a.trace['flapTicks'] if start<=t<end]
  assert len(inputs)==rec['commandTicks']['count']
  assert (end-start)/120==rec['actualSeconds']
  out.append({'slot':p['slot'],'sourceIndex':p['sourceIndex'],'demand':p['demand'],'entryTick':start,'exitTick':end,'entry':rec['entry'],'exit':rec['exit'],'actualSeconds':rec['actualSeconds'],'commandTicks':inputs,'auxiliaryBodies':p['auxiliaryBodies'],'reportFile':ref(path),'cacheSHA256':sh})
 return d,out
def order_actions(groups,out,name):
 fig,axs=plt.subplots(5,2,figsize=(19,12),sharex=True,sharey=False,gridspec_kw={'height_ratios':[2,2,1.7,1,.8]});start,end=10320,14160;records=[]
 fig.suptitle('c006 | Two same-entry order comparisons, assigned_main\nLeft: upper-after, seed1 HLT, 2s recovery. Right: lower-before, seed0 HJT, 1.6s recovery.',fontsize=15,y=.983)
 for col,arms in enumerate(groups):
  for i,a in enumerate(arms):
   color=PALETTE[i];plot_saved(axs[0,col],a,color,i,2,start,end);plot_saved(axs[1,col],a,color,i,3,start,end);clearance(axs[2,col],a,color,i,'margin',end,start)
   ts=[t for t in a.trace['flapTicks'] if start<=t<end];axs[3,col].scatter(np.array(ts)/120,[i]*len(ts),marker='|',s=32,color=color)
   rows=[r for r in a.rows if start<=r[0]<=end];axs[4,col].plot([r[0]/120 for r in rows],[i if r[5] else np.nan for r in rows],color=color,lw=2)
   records.append({'runId':a.run['id'],'exactInputCount':len(ts),'startTick':start,'endTick':end,'terminalTick':a.end_tick,'status':a.status})
  axs[0,col].set_ylim(540,0);axs[0,col].legend(fontsize=9,loc='upper right');axs[1,col].set_ylim(-900,900);axs[1,col].axhline(0,color='#999',lw=.5);axs[2,col].set_ylim(0,270)
  for row in [3,4]:axs[row,col].set_yticks([0,1],[a.label.split(' ')[0] for a in arms]);axs[row,col].set_ylim(-.4,1.4)
  axs[4,col].set_xlabel('Actual simulation time (s)')
 for ax in axs.flat:ax.set_xlim(start/120,end/120);ax.grid(alpha=.18,lw=.5)
 for ax,label in zip(axs[:,0],['Actual y (px)','Actual vy (px/s)','Nearest margin (px)','Exact flapTicks','Alive']):ax.set_ylabel(label)
 fig.text(.06,.04,'Each column holds entry, cumulative prefix and first-recovery duration fixed. All y/vy, clearance margins and input times are saved actual measurements.',fontsize=10)
 fig.text(.06,.019,'The two columns are separate contexts; no cross-column causal comparison. Existing package order changed; no new internal pattern synthesis or human-fun claim.',fontsize=10)
 fig.subplots_adjust(left=.06,right=.99,top=.91,bottom=.10,hspace=.19,wspace=.13)
 return v.saved_image(fig,out/name,'Actual state, input and margin differences for two separate same-entry order comparisons.','actual-order-action-contrast',{'startTick':start,'endTick':end,'groups':[[a.run['id'] for a in g] for g in groups],'arms':records,'sameScale':True})
