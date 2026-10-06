#!/usr/bin/env python3
import json, math, subprocess, sys
from pathlib import Path
from generator import build
HERE=Path(__file__).resolve().parent

def prepare(name='L1',revision=1):
 root=HERE/'evidence'/name
 if root.exists():raise ValueError('Batch directory already exists; preserve prior evidence')
 root.mkdir(parents=True)
 scenarios=[]
 for i in range(16):
  held=i>=8;seed=(1701+i-8) if held else 701+i
  difficulty=['easy','medium','hard','medium'][i%4];theme=['arcade','foundry','signal'][i%3]
  m=build(seed,31.5,difficulty,theme,experimental=True,revision=revision,holdout=held)
  ticks=math.ceil((m['width']-60)/150*120);horizon=ticks/120
  arm='holdout' if held else 'new';name=f'{arm}-{seed}';d=root/name;d.mkdir();(d/'map.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
  row={'id':name,'arm':arm,'seed':seed,'difficulty':difficulty,'theme':theme,'map_path':f'{name}/map.json','horizon_s':horizon,'target_duration_s':31.5}
  if not held:
   baseline_name=f'baseline-{seed}';b=root/baseline_name;b.mkdir()
   subprocess.run(['node',str(HERE/'baseline.cjs'),'--seed',str(seed),'--difficulty',difficulty,'--duration',str(horizon),'--out',str(b/'envelope.json')],check=True)
   env=json.loads((b/'envelope.json').read_text());(b/'map.json').write_text(json.dumps(env['map'],ensure_ascii=False,indent=2)+'\n');(b/'metadata.json').write_text(json.dumps(env['metadata'],ensure_ascii=False,indent=2)+'\n')
   scenarios.append({**row,'id':baseline_name,'arm':'baseline','map_path':f'{baseline_name}/envelope.json'})
  scenarios.append(row)
 manifest={'schema':'combo-integration-panel/1','revision':revision,'scope':'8 same-seed/nominal-target and identical actual-horizon pairs;8 held-out seeds. Same ordinary route-guide controller, different semantic requests and uncalibrated difficulty. No causal win-rate improvement claim.','experimental':True,'scenarios':scenarios}
 (root/'panel.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'panel':str(root/'panel.json'),'count':len(scenarios),'new_family_orders':[[x['family'] for x in json.loads((root/r['map_path']).read_text())['integration']['modules']] for r in scenarios if r['arm']!='baseline']},indent=2))
if __name__=='__main__':prepare(sys.argv[1] if len(sys.argv)>1 else 'L1',int(sys.argv[2]) if len(sys.argv)>2 else 1)
