#!/usr/bin/env python3
"""Two full short suffix checks and two new-seed native 120s worlds, once only."""
import json,math,sys,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE));import generator
root=HERE/'runs/four-loops/B4/finish-checks'
if root.exists():raise ValueError('Never overwrite or rerun finish checks')
root.mkdir();entries=[]
for id,source in [('full-701','candidate-701'),('full-4402','holdout-4402')]:
 p=HERE/'runs/four-loops/B4/runs'/source/'map.json';m=json.loads(p.read_text());out=root/(id+'.map.json');out.write_text(json.dumps(m)+'\n');entries.append(dict(id=id,mapFile=out.name,horizonTicks=math.ceil((m['width']-60)/150*120)+1,scope='Targeted complete short map, not paired-panel observation',sourceMap=str(p.relative_to(HERE))))
for seed,theme in [(5701,'foundry'),(5703,'signal')]:
 id=f'macro-{seed}';m=generator.build(seed,120,'medium',theme,experimental=True,revision=7,holdout=True);out=root/(id+'.map.json');out.write_text(json.dumps(m)+'\n');entries.append(dict(id=id,mapFile=out.name,horizonTicks=14400,scope='New-seed native120s single continuous world, one run, no reset or checkpoint injection'))
for e in entries:e['mapFileSHA256']=hashlib.sha256((root/e['mapFile']).read_bytes()).hexdigest()
manifest=dict(schema='four-loop-final-finish-checks/1',basis='B4 paired8/8 and unseen7/8 at30s plus three actual30s native wins warrant two final whole short maps and exactlytwo120s trials. No reruns after outcome. No fifth bigloop.',entries=entries,controller='relational-source-v3',controllerSHA256=hashlib.sha256((HERE/'diagnostic.cjs').read_bytes()).hexdigest(),runtimeSHA256=hashlib.sha256((HERE/'vendor/flappy-runtime.js').read_bytes()).hexdigest())
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(root/'manifest.json')
