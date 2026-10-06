#!/usr/bin/env python3
"""Operational scheduling only: execute frozen slots and honor frozen analyzer stop."""
import json,pathlib,subprocess,time,sys,datetime
R=pathlib.Path(__file__).resolve().parents[2];D=R/'outer/c006';freeze='protocols/freezes/c006-formal-v1.json'
def read_ready(p):
 try:return json.loads(p.read_text())
 except (FileNotFoundError,json.JSONDecodeError):return None
while True:
 pilot=read_ready(D/'pilot-analysis-summary.json')
 if pilot is not None:break
 if (D/'pilot-analysis-stderr.log').exists() and (D/'pilot-analysis-stderr.log').stat().st_size:raise RuntimeError('pilot analysis failed; inspect stderr')
 time.sleep(2)
if pilot['stopping']['stopRemainingPhysics']:
 print(json.dumps({'stage':'pilot','stopped':True,'stopping':pilot['stopping']}),flush=True);sys.exit(0)
blocks=[('control-rest-1',24,['control-01','control-02','control-03']),('control-rest-2',32,[f'control-{i:02d}' for i in range(4,8)]),('explore-1',32,[f'explore-{i:02d}' for i in range(4)]),('explore-2',32,[f'explore-{i:02d}' for i in range(4,8)]),('holdout-1',32,[f'holdout-{i:02d}' for i in range(4)]),('holdout-2',32,[f'holdout-{i:02d}' for i in range(4,8)])]
for name,count,ids in blocks:
 if (R/'STOP').exists():break
 with (D/(name+'-execution.jsonl')).open('w') as out,(D/(name+'-execution-stderr.log')).open('w') as err:subprocess.run(['node','outer/c006/run.cjs',str(count)],cwd=R,stdout=out,stderr=err,check=True)
 with (D/(name+'-analysis-summary.json')).open('w') as out,(D/(name+'-analysis-stderr.log')).open('w') as err:subprocess.run(['node','outer/c006/analyze.cjs',freeze,'--partial','--conditions',','.join(ids)],cwd=R,stdout=out,stderr=err,check=True)
 summary=read_ready(D/(name+'-analysis-summary.json'));assert summary is not None
 row={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'block':name,'completedSlots':summary['completedSlots'],'parentQualified':summary['parentQualified'],'candidateQualified':summary['candidateQualified'],'analysisWork':summary['analysisWork'],'stopRemainingPhysics':summary['stopping']['stopRemainingPhysics']}
 with (D/'block-progress.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
 print(json.dumps(row),flush=True)
 if summary['stopping']['stopRemainingPhysics']:break
