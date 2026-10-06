#!/usr/bin/env python3
"""Read-only summaries; no physics, replay, admission, or qualification changes."""
import gzip,json,math
from pathlib import Path
HERE=Path(__file__).resolve().parent

def body_distance(x,y,b):
 if b.get('shape')=='circle':return math.hypot(x-b['x']-b['w']/2,y-b['y']-b['h']/2)-b['w']/2-10
 if b.get('shape')=='segment':
  dx=b['x2']-b['x'];dy=b['y2']-b['y'];u=max(0,min(1,((x-b['x'])*dx+(y-b['y'])*dy)/(dx*dx+dy*dy or 1)))
  return math.hypot(x-b['x']-u*dx,y-b['y']-u*dy)-10-b.get('width',0)/2
 if b.get('shape')=='rectangle':return math.hypot(x-max(b['x'],min(x,b['x']+b['w'])),y-max(b['y'],min(y,b['y']+b['h'])))-10
 return None

def metrics(folder):
 r=json.loads((folder/'result.json').read_text());t=json.loads(gzip.decompress((folder/'trace.json.gz').read_bytes()));m=json.loads((folder/'map.json').read_text());rows={a[0]:a for a in t['rows']};best=None
 for fr in t['bodyFrames']:
  p=rows.get(fr['tick'])
  if p is None:continue
  distances=[(body_distance(p[1],p[2],b),b['id']) for b in fr['bodies'] if b.get('lethal')]
  distances=[(d,oid) for d,oid in distances if d is not None]+[(p[2]-10,'ceiling-boundary'),(530-p[2],'floor-boundary')]
  for d,oid in distances:
   if best is None or d<best['clearance_px']:best={'clearance_px':d,'tick':fr['tick'],'body':oid}
 return {'id':r['id'],'outcome':r['outcome'],'time_s':r['actualTicks']/120,'horizon_s':r['horizonTicks']/120,'flaps':r['flapCount'],'contacts':r['springContacts'],'seams_crossed':sum(s['crossed'] for s in r['seams']),'seams_total':len(r['seams']),'sampled_current_geometry_minimum':best,'minimum_scope':'Stored12-tick frames only, not continuous or substep minimum and not a safe range','y_span':[min(x[2] for x in t['rows']),max(x[2] for x in t['rows'])],'families':[q['family'] for q in m['integration']['modules']],'variants':[q['variant'] for q in m['integration']['modules']],'requested_difficulty':m['generator_parameters']['difficulty'],'death':r.get('death'),'final_state':{k:r['finalState'].get(k) for k in ['tick','x','y','vx','vy','terminal','won']},'map_sha256':r['mapSHA256'],'runtime_sha256':r['runtimeSHA256'],'continuity':r['continuity']}

def main():
 result={'schema':'combo-integration-final-summary/1','experimental_native_trajectories':40,'trajectory_accounting':{'L1_panel':24,'L1_controller_diagnostics':2,'L2_initial':8,'L2_targeted':4,'L3_macro':2},'unit_fixture_rollouts_excluded':True,'short_targeted':[metrics(p) for p in sorted((HERE/'evidence/L2B/runs').iterdir())],'macro':[metrics(p) for p in sorted((HERE/'evidence/L3/runs').iterdir())],'qualification':'No new qualified families, recipes or continuous safe ranges; no human-play evidence','scope':'Six callable relational families; output remains explicitly experimental; rhythm/diversity and120s generalization goals remain unmet'}
 (HERE/'FINAL-SUMMARY.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['experimental_native_trajectories','trajectory_accounting']},indent=2))
 for k in ['short_targeted','macro']:
  for r in result[k]:print(r['id'],r['outcome'],r['time_s'],r['seams_crossed'],'contacts',len(r['contacts']),'sampledmin',r['sampled_current_geometry_minimum'])
if __name__=='__main__':main()
