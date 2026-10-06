#!/usr/bin/env python3
"""Render saved native frames around one timed gate; zero physics stepping."""
import argparse,gzip,json,math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle,Circle

def render(folder,source_id,out):
 m=json.loads((folder/'map.json').read_text());r=json.loads((folder/'result.json').read_text())
 t=json.loads(gzip.decompress((folder/'trace.json.gz').read_bytes()));rows={q[0]:q for q in t['rows']}
 o=next(o for o in m['obstacles'] if o['id']==source_id)
 if o['mechanic_kind']!='timed_armor_gate':raise ValueError('Need a real timed gate')
 frames=[f for f in t['bodyFrames'] if f['tick'] in rows and o['x']-10<=rows[f['tick']][1]<=o['x']+o['collider']['w']+10]
 if not frames:raise ValueError('Gate was not reached in saved frames')
 indices=sorted(set([0,len(frames)//2,len(frames)-1]));frames=[frames[i] for i in indices]
 fig,axs=plt.subplots(1,len(frames),figsize=(10.5,6),squeeze=False,sharey=True,facecolor='#fbfaf6')
 details=[]
 for ax,f in zip(axs[0],frames):
  row=rows[f['tick']];bodies=[b for b in f['bodies'] if b.get('sourceId')==source_id or b['id'].startswith(source_id+':')]
  for b in bodies:
   if b['shape']=='rectangle':ax.add_patch(Rectangle((b['x'],b['y']),b['w'],b['h'],facecolor='#287f89',alpha=.8 if b.get('lethal') else .2))
  trail=[q for q in t['rows'] if f['tick']-100<=q[0]<=f['tick']+100]
  ax.plot([q[1] for q in trail],[q[2] for q in trail],color='#173c4c',lw=1.4)
  ax.add_patch(Circle((row[1],row[2]),10,facecolor='#e6b33d',edgecolor='#173c4c'))
  phase=sorted({b.get('phase',b.get('status','unknown')) for b in bodies})
  ax.set_title(f"tick{f['tick']} = {f['tick']/120:.3f}s\n{','.join(phase)}; y{row[2]:.2f}, vy{row[4]:.2f}",fontsize=10)
  ax.set_aspect('equal',adjustable='box')
  ax.set_xlim(o['x']-55,o['x']+o['collider']['w']+55);ax.set_ylim(o['y']+155,o['y']-155);ax.set_xlabel('Native world x (px)');ax.set_facecolor('#fbfaf6');ax.grid(alpha=.15)
  details.append({'tick':f['tick'],'nativeRow':row,'savedBodies':bodies})
 axs[0][0].set_ylabel('Native y (px, down +)')
 fig.suptitle(f'{folder.name} / {source_id}: saved occupied gate geometry',fontsize=15)
 fig.text(.04,.02,'Native saved 0.1s body frames and trajectory; timing/space evidence, not an input-tolerance or safety proof.',fontsize=10)
 fig.tight_layout(rect=(0,.06,1,.92));out.mkdir(parents=True,exist_ok=True);name=folder.name+'-'+source_id+'-occupancy'
 fig.savefig(out/(name+'.png'),dpi=125);plt.close(fig)
 (out/(name+'.json')).write_text(json.dumps({'mapSHA256':r['mapSHA256'],'traceSHA256':r['traceSHA256'],'runtimeSHA256':r['runtimeSHA256'],'physicsReruns':0,'frames':details},indent=2)+'\n')
 print(out/(name+'.png'))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('run',type=Path);p.add_argument('source_id');p.add_argument('--out',type=Path,required=True);a=p.parse_args();render(a.run,a.source_id,a.out)
