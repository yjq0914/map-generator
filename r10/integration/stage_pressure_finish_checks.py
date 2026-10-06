#!/usr/bin/env python3
"""Preregistered two complete short tails and two native120s worlds, once only."""
import hashlib,json,math,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE));import generator
ROOT=HERE/'runs/stage-pressure';out=ROOT/'B4/finish-checks'
if out.exists():raise ValueError('Do not overwrite or retry final checks')
plan=json.loads((ROOT/'FINAL-CHECK-PREREGISTRATION.json').read_text());out.mkdir();entries=[];skipped=[]
for requested in plan['full_short_sources']:
 source=ROOT/requested;reuse=source/'REUSED.json'
 if reuse.exists():
  info=json.loads(reuse.read_text());source=HERE.parent/info['sourceDir']
  for name,h in info['sourceFiles'].items():assert hashlib.sha256((source/name).read_bytes()).hexdigest()==h
 result=json.loads((source/'result.json').read_text())
 if result['actualTicks']<3600 or not result['alive']:
  skipped.append(dict(source=requested,reason='Known source failed before30s; no replacement or redundant full replay'));continue
 m=json.loads((source/'map.json').read_text());seed=m['seed'];id=f'full-{seed}';p=out/(id+'.map.json');p.write_text(json.dumps(m)+'\n')
 entries.append(dict(id=id,mapFile=p.name,horizonTicks=math.ceil((m['width']-60)/150*120)+1,sourceRun=requested,resolvedSourceRun=str(source.relative_to(HERE.parent)),scope='Preregistered complete short suffix witness from one fresh native world, not a continuation/restoration'))
for req in plan['macro_requests']:
 m=generator.build(**req,revision=10,experimental=True);id=f"macro-{req['seed']}";p=out/(id+'.map.json');p.write_text(json.dumps(m)+'\n')
 entries.append(dict(id=id,mapFile=p.name,horizonTicks=14400,request=req,scope='Preregistered unseen native120s world; once only, no reset or replay'))
for e in entries:e['mapFileSHA256']=hashlib.sha256((out/e['mapFile']).read_bytes()).hexdigest()
manifest=dict(schema='stage-pressure-final-checks/1',revision=10,basis='B3 and B4 short evidence supports bounded full-tail and120s checks; no new-version claim in frozen B4',entries=entries,skipped=skipped,controllerSHA256=hashlib.sha256((HERE/'diagnostic.cjs').read_bytes()).hexdigest(),runtimeSHA256=hashlib.sha256((HERE/'vendor/flappy-runtime.js').read_bytes()).hexdigest(),preregistrationSHA256=hashlib.sha256((ROOT/'FINAL-CHECK-PREREGISTRATION.json').read_bytes()).hexdigest())
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(out/'manifest.json')
