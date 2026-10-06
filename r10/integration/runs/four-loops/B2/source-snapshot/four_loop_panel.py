#!/usr/bin/env python3
"""Bounded immutable panels. Exact hash reuse only, no rollout selection."""
import sys,json,math,hashlib,subprocess,gzip
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE));import generator
ROOT=HERE/'runs/four-loops'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def sources():
 paths=[HERE/'generator.py',HERE/'diagnostic.cjs',HERE/'run_batch.cjs',HERE/'vendor/flappy-runtime.js']+sorted((HERE/'rules').glob('*.py'))
 return {str(p.relative_to(HERE)):sha(p) for p in paths}
def request(seed,i,holdout=False):return dict(seed=seed,duration_s=31.5,difficulty=['easy','medium','hard','medium'][i%4],theme=['arcade','foundry','signal'][i%3],experimental=True,holdout=holdout)
def make(ln,arm,revision):
 root=ROOT/f'B{ln}'; root.mkdir(exist_ok=True);target=root/f'{arm}-maps'
 if target.exists():raise ValueError('No overwrite')
 target.mkdir(); rows=[]
 for i in range(8):
  held=arm=='holdout';seed=4000+ln*100+i+1 if held else 701+i
  req=request(seed,i,held);m=generator.build(**req,revision=revision)
  id=f'{arm}-{seed}';d=target/id;d.mkdir();(d/'map.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
  rows.append(dict(id=id,arm=arm,seed=seed,pairId=None if held else f'seed-{seed}',request=req,revision=revision,mapFile=str((d/'map.json').relative_to(root)),horizonTicks=3600,mapFileSHA256=sha(d/'map.json')))
 result=dict(schema='four-loop-arm/1',bigLoop=ln,arm=arm,revision=revision,sources=sources(),entries=rows)
 (root/f'{arm}-manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'arm':arm,'bigLoop':ln,'count':len(rows)}))
def reuse_baseline(ln,prior):
 import shutil
 root=ROOT/f'B{ln}';root.mkdir(exist_ok=True)
 srcroot=ROOT/f'B{prior}';source=json.load(open(srcroot/'candidate-manifest.json'))
 target=root/'baseline-maps'
 if target.exists():raise ValueError('No overwrite')
 target.mkdir();rows=[]
 for row in source['entries']:
  row=dict(row);row['id']=f"baseline-{row['seed']}";row['arm']='baseline'
  d=target/row['id'];d.mkdir();shutil.copyfile(srcroot/row['mapFile'],d/'map.json')
  row['mapFile']=str((d/'map.json').relative_to(root));row['mapFileSHA256']=sha(d/'map.json');rows.append(row)
 result=dict(source,arm='baseline',bigLoop=ln,entries=rows,reuseSourceLoop=prior,reuseSourceManifestSHA256=sha(srcroot/'candidate-manifest.json'))
 (root/'baseline-manifest.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'baselineCopiedExactly':8,'sourceLoop':prior}))
def summarize(ln):
 from analyze_results import metrics
 root=ROOT/f'B{ln}'; allrows=[]
 for arm in ['baseline','candidate','holdout']:
  manifest=json.load(open(root/f'{arm}-manifest.json'))
  for row in manifest['entries']:
   d=root/'runs'/row['id']; reuse=d/'REUSED.json'
   if reuse.exists():
    rj=json.load(open(reuse));d=HERE.parent/rj['sourceDir']
    for name,digest in rj['sourceFiles'].items():assert sha(d/name)==digest
   met=metrics(d);met.update(arm=arm,seed=row['seed'],reused=reuse.exists(),sourceDir=str(d.relative_to(HERE.parent)));allrows.append(met)
 stats={}
 for arm in ['baseline','candidate','holdout']:
  rows=[r for r in allrows if r['arm']==arm]
  stats[arm]={'count':len(rows),'survived30s':sum(r['time_s']>=30 and r['outcome']!='death' for r in rows),'nativeWins':sum(r['outcome']=='native-win' for r in rows),'medianObservedSeconds':sorted(r['time_s'] for r in rows)[len(rows)//2],'uniqueOrders':len({tuple(r['families']) for r in rows}),'families':sorted({f for r in rows for f in r['families']}),'actualNewRuns':sum(not r['reused'] for r in rows)}
 out=dict(schema='four-loop-panel-summary/1',loop=ln,logicalScenarios=24,observationTicks=3600,controller='unchanged relational-source-v3',statistics=stats,rows=allrows,claims='Same nominal requests and equal horizon, difficulty not human-calibrated. No fun or qualification claim.')
 (root/'summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(stats,indent=2))
if __name__=='__main__':
 if sys.argv[1]=='make':make(int(sys.argv[2]),sys.argv[3],int(sys.argv[4]))
 elif sys.argv[1]=='summarize':summarize(int(sys.argv[2]))
 elif sys.argv[1]=='reuse-baseline':reuse_baseline(int(sys.argv[2]),int(sys.argv[3]))
