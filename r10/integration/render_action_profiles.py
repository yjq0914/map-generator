#!/usr/bin/env python3
"""Read-only native action and sampled-clearance evidence. Never reruns physics."""
import argparse,gzip,json,math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from analyze_results import body_distance

def render(folder,out):
 m=json.loads((folder/'map.json').read_text());r=json.loads((folder/'result.json').read_text());t=json.loads(gzip.decompress((folder/'trace.json.gz').read_bytes()))
 rows=t['rows'];bytick={q[0]:q for q in rows};times=[q[0]/120 for q in rows];clear=[];unsupported=set()
 for f in t['bodyFrames']:
  p=bytick.get(f['tick'])
  if not p:continue
  ds=[(p[2]-10,'ceiling'),(530-p[2],'floor')]
  for b in f['bodies']:
   if not b.get('lethal'):continue
   d=body_distance(p[1],p[2],b)
   if d is not None:ds.append((d,b['id']))
   else:unsupported.add(b.get('shape','unknown'))
  d,name=min(ds);clear.append(dict(tick=f['tick'],time_s=f['tick']/120,clearance_px=d,body=name))
 fig,axs=plt.subplots(3,1,figsize=(16,9),sharex=True,facecolor='#fbfaf6',gridspec_kw={'height_ratios':[2,1,1.4]})
 fig.subplots_adjust(top=.82,hspace=.15,bottom=.10,left=.07,right=.98)
 planned=m.get('integration',{}).get('plan',{}).get('actual_duration_s',r['horizonTicks']/120)
 title=f"{folder.name} | {r['outcome']} | observed {r['actualTicks']/120:.3f}s / authored {planned:.3f}s"
 fig.text(.07,.95,title,fontsize=18,weight='bold',color='#203c49')
 fig.text(.07,.906,'Solid curves = native recorded state. Gold dashed = authored threshold (not trajectory). Flap marks = actual input.',fontsize=10)
 fig.text(.07,.88,'Clearance uses saved 0.1s body frames only; not a continuous/substep lower bound or a difficulty/fun score.',fontsize=10)
 if len(m['integration']['modules'])>8:
  aliases={'bellows-question-answer':'Gate','spring-reception':'Spring','tidal-staircase':'Tide','slider-island':'Slider','light-cavity':'Light','cloister':'Cloister'}
  labels=[f"{i+1} {aliases.get(q['family'],q['family'])}" for i,q in enumerate(m['integration']['modules'])]
  fig.text(.07,.852,'  ·  '.join(labels[:10]),fontsize=8,color='#506371')
  fig.text(.07,.832,'  ·  '.join(labels[10:]),fontsize=8,color='#506371')
  fig.subplots_adjust(top=.79)
 palette=['#e6d9c0','#c8dee1','#ddd5e5','#d7e5c8','#ecd5d0','#d0dded']
 for i,mod in enumerate(m['integration']['modules']):
  a=(mod['start_x']-60)/150;b=(mod['end_x']-60)/150
  for ax in axs:ax.axvspan(a,min(b,times[-1]),color=palette[i%6],alpha=.36) if a<times[-1] else None
  if a<times[-1]:axs[0].text(max(0,a)+.06,25,str(i+1) if len(m['integration']['modules'])>8 else mod['family'],fontsize=7,rotation=0,va='top')
 axs[0].plot(times,[q[2] for q in rows],color='#173c4c',lw=1)
 hints=[(q[0]/120,q[8]) for q in rows if q[8] is not None]
 if hints:axs[0].plot([x for x,y in hints],[y for x,y in hints],color='#c69930',ls='--',lw=.8)
 flaps=t.get('flapTicks',[]);axs[0].scatter([v/120 for v in flaps],[520]*len(flaps),marker='|',s=30,color='#426f8b')
 axs[0].set_ylim(540,0);axs[0].set_ylabel('Native y (px, down +)')
 axs[1].plot(times,[q[4] for q in rows],lw=.8,color='#695c94');axs[1].axhline(0,lw=.6,color='#a5a5a5');axs[1].set_ylabel('Native vy (px/s)')
 axs[2].plot([q['time_s'] for q in clear],[q['clearance_px'] for q in clear],color='#34765c',lw=.9);axs[2].axhline(0,color='#a55044',lw=.8)
 axs[2].set_ylabel('Sampled clearance (px)');axs[2].set_xlabel('Continuous native world time (s)');axs[2].set_xlim(0,max(times[-1],.1))
 for ax in axs:ax.set_facecolor('#fbfaf6');ax.grid(axis='y',alpha=.2);ax.spines[['top','right']].set_visible(False)
 out.mkdir(parents=True,exist_ok=True);fn=out/(folder.name+'-action-profile.png');fig.savefig(fn,dpi=110);plt.close(fig)
 data={'schema':'native-action-profile/1','id':r['id'],'mapSHA256':r['mapSHA256'],'traceSHA256':r['traceSHA256'],'runtimeSHA256':r['runtimeSHA256'],'observedSeconds':times[-1],'authoredSeconds':planned,'physicsReruns':0,'unsupportedShapes':sorted(unsupported),'sampledClearance':clear,'scope':'Saved12tick frames only. Native y/vy and actual flap times; no fun/difficulty or safety claim.'}
 (out/(folder.name+'-action-profile.json')).write_text(json.dumps(data,indent=2)+'\n');print(fn)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('runs',nargs='+',type=Path);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
 for f in a.runs:render(f,a.out)
