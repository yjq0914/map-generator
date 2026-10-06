#!/usr/bin/env python3
"""Archive one terminal round's source, raw evidence and readable results."""
import argparse, gzip, hashlib, json, pathlib, tarfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    p=argparse.ArgumentParser();p.add_argument('round');a=p.parse_args()
    if len(a.round)!=4 or a.round[0]!='c' or not a.round[1:].isdigit(): raise ValueError('Invalid round')
    rd=ROOT/'outer'/a.round
    decision=json.loads((rd/'decision.json').read_text())
    if decision.get('status') not in ['conditional-adopt','reject','incomplete']: raise ValueError('Terminal decision required')
    selected={'ledger.jsonl','PLAN.zh-CN.md','PROGRESS.zh-CN.md','STATUS.json','GAPS.json','archive_round.py',
              'checkpoint.py','visuals/render_evidence.py','visuals/README.md','visuals/test_render_evidence.py',
              'protocols/storage-budget-v2.json','protocols/core-research.zh-CN.md','protocols/inherited-regression.json',
              'outer/c001/decision.json','outer/c001/rule.json','outer/c001/final-review.json','outer/c001/accepted-pointer.json',
              'outer/c002/decision.json','outer/c002/rule.json','outer/c002/final-review.json','outer/c002/accepted-pointer.json',
              'outer/c003/decision.json','outer/c003/rule.json','outer/c003/final-review.json','outer/c003/accepted-pointer.json',
              'outer/c004/decision.json','outer/c004/analysis.json','outer/c004/early-stop.json','outer/c004/successor-refusal-diagnosis.json','outer/c004/accepted-pointer.json','outer/c005/decision.json','outer/c005/rule.json','outer/c005/final-review.json','outer/c005/accepted-pointer.json'}
    for q in (ROOT/'protocols/freezes').glob(a.round+'-*.json'): selected.add(str(q.relative_to(ROOT)))
    for q in (ROOT/'holdouts').glob(a.round+'-*.json'): selected.add(str(q.relative_to(ROOT)))
    freezes=set();runs=[]
    # Reused thin-margin witness is independent evidence, not a repeated run.
    if a.round=='c006':
        witness='evidence/runs/c005-candidate-explore-02-assigned_alternate.json.gz'
        old=json.loads(gzip.decompress((ROOT/witness).read_bytes()))
        selected.update([witness,old['mapFile'],old['traceFile'],old['freeze'],'protocols/receipts/c005-formal-v1.json','outer/c005/formal-preregistration.json'])
        selected.update(json.loads((ROOT/old['freeze']).read_text())['files'])
    for q in sorted((ROOT/'evidence/runs').glob(a.round+'-*.json.gz')):
        record=json.loads(gzip.decompress(q.read_bytes()));runs.append(record)
        selected.add(str(q.relative_to(ROOT)));freezes.add(record['freeze'])
        for key in ['mapFile','traceFile']:
            if record.get(key): selected.add(record[key])
    for fr in freezes:
        selected.add(fr);selected.update(json.loads((ROOT/fr).read_text())['files'])
    for q in rd.rglob('*'):
        if q.is_file() and '__pycache__' not in q.parts: selected.add(str(q.relative_to(ROOT)))
    for folder in (ROOT/'visuals').glob(a.round+'-*'):
        if folder.is_dir() and 'render-cache' not in folder.name:
            selected.update(str(q.relative_to(ROOT)) for q in folder.rglob('*') if q.is_file())
    for q in (ROOT/'protocols/receipts').glob(a.round+'-*.json'): selected.add(str(q.relative_to(ROOT)))
    for name in selected:
        q=(ROOT/name).resolve();q.relative_to(ROOT)
        if not q.is_file():raise ValueError('Missing archive member '+name)
    manifest={'schema':'adaptive-round-archive/1','round':a.round,'decisionStatus':decision['status'],
              'actualRuns':len(runs),'ticks':sum(r['ticks'] for r in runs),'files':{n:{'bytes':(ROOT/n).stat().st_size,'sha256':sha(ROOT/n)} for n in sorted(selected)}}
    mp=rd/'raw-archive-manifest.json';mp.write_text(json.dumps(manifest,indent=2)+'\n');selected.add(str(mp.relative_to(ROOT)))
    out=ROOT/'checkpoints'/('Flappy-adaptive-general-'+a.round+'-evidence.tar.gz')
    with tarfile.open(out,'w:gz',compresslevel=4) as tar:
        for name in sorted(selected):tar.add(ROOT/name,arcname='adaptive-general-twelve/'+name,recursive=False)
    receipt={'archive':str(out),'bytes':out.stat().st_size,'sha256':sha(out),'files':len(selected),'actualRuns':len(runs),'ticks':manifest['ticks']}
    (rd/'raw-archive-prepared.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
if __name__=='__main__':main()
