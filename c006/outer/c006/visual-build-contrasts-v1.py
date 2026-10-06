#!/usr/bin/env python3
"""Generate bounded c006 presentation contrasts from authenticated saved evidence."""
from pathlib import Path
import runpy,datetime
H=runpy.run_path(str(Path(__file__).with_name('visual-render-contrasts-v1.py')));globals().update({k:v for k,v in H.items() if not k.startswith('__')})
immutable()
out=R/'visuals/c006-selected-contrasts-actual-v1';assert not out.exists();out.mkdir()
labels=['C00 moving-first / 2s','C01 fixed-first / 2s','C02 moving-first / 1.2s','C03 moving-first / 1.6s','C04 hold-turn then stagger','C05 stagger then hold-turn']
A=[authenticate(f'c006-candidate-control-{i:02d}-assigned_main',label) for i,label in enumerate(labels)]
P=authenticate('c006-parent-control-00-assigned_main','Control00 parent')
reports={};recs={}
for a in [P,*A]:
 d,rr=observed_report(a);reports[a.run['id']]={'summary':d['summary'],'contrastInput':{k:x for k,x in d['contrastInput'].items() if k not in ['actualTrajectory','actualCommands']}};recs[a.run['id']]=rr
# Verify each same-entry comparison directly, independent of shorthand captions.
for i,j in [(0,1),(0,2),(0,3),(4,5)]:
 x,y=[reports[A[k].run['id']]['contrastInput'] for k in [i,j]]
 for key in ['physical','prefixRequest','prefixMapHash','window']:assert x[key]==y[key],(i,j,key)
 if (i,j) in [(0,1),(4,5)]:assert x['firstRecoveryTicks']==y['firstRecoveryTicks']
 else:assert x['actualOrder']==y['actualOrder']
outputs=[]
outputs.append(sequence([A[0],A[1]],[[11520,11808,12810]]*2,[['C00: moving package9 + upper auxiliary','C00: actual first recovery entry','C00: fixed package10 + upper auxiliary'],['C01: fixed package9 + upper auxiliary','C01: actual first recovery entry','C01: moving package10 + upper auxiliary']],out,'upper-order-late-sequence.png','c006 | Upper-after: existing moving / fixed order reverses','Same entry, seed1 HLT, first recovery2s. Two complete packages retain their upper-after neighbors.'))
outputs.append(sequence([A[4],A[5]],[[10900,11540,12100]]*2,[['C04: hold-turn starts after lower auxiliary','C04: third primary + recovery approach','C04: stagger starts after lower auxiliary'],['C05: stagger starts after lower auxiliary','C05: third primary + recovery approach','C05: hold-turn starts after lower auxiliary']],out,'lower-order-late-sequence.png','c006 | Lower-before: two existing stagger patterns change order','Same entry, seed0 HJT, first recovery1.6s. Actual lower-before neighbors remain in both package entrances.'))
outputs.append(action_compare([A[0],A[2],A[3]],out,'recovery-action-contrast.png','c006 | Same entry and moving-first order: actual recovery2.0 / 1.2 / 1.6s',start=11640,end=12480,recoveries={k:v[0] for k,v in recs.items()}))
outputs.append(order_actions([[A[0],A[1]],[A[4],A[5]]],out,'order-action-contrast.png'))
# Recorded contrast metrics use saved rows and exact action ticks, without stepping.
contrasts=[]
for i,j in [(0,1),(0,2),(0,3),(2,3),(4,5)]:
 a,b=A[i],A[j];ar={r[0]:r for r in a.rows};br={r[0]:r for r in b.rows};ticks=sorted(set(ar)&set(br));late=[t for t in ticks if 10320<=t<=14160]
 inputs_a=[t for t in a.trace['flapTicks'] if 10320<=t<14160];inputs_b=[t for t in b.trace['flapTicks'] if 10320<=t<14160]
 first=next((t for t in ticks if ar[t][1:]!=br[t][1:]),None)
 contrasts.append({'runs':[a.run['id'],b.run['id']],'firstDifferentSavedStateTick':first,'lateWindow':[10320,14160],'maximumYDifferencePx':max(abs(ar[t][2]-br[t][2]) for t in late),'inputCounts':[len(inputs_a),len(inputs_b)],'inputSymmetricDifference':sorted(set(inputs_a)^set(inputs_b)),'actualFirstRecovery':[recs[a.run['id']][0],recs[b.run['id']][0]]})
manifest={'schema':'c006-saved-actual-contrast-render/1','round':'c006','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'fixture':False,'newPhysicsStarts':0,'newPhysicsTicks':0,'renderer':ref('visuals/render_evidence.py'),'presentationRenderer':ref('outer/c006/visual-render-contrasts-v1.py'),'buildScript':ref('outer/c006/visual-build-contrasts-v1.py'),'sourceReferences':[source(a) for a in [P,*A]],'observedRecoveries':recs,'contrasts':contrasts,'outputs':[{**o,'projectRelativePath':str((out/o['path']).relative_to(R))} for o in outputs],'review':{'pixelInspection':'pending'},'qualification':'Six selected public assigned_main controls; full-panel decision remains separate','immutableChecks':immutable()}
write(str(out.relative_to(R)/'manifest.json'),manifest)
write('outer/c006/visual-evidence-extract-v1.json',{'schema':'c006-selected-saved-evidence-extract/1','sourceReferences':manifest['sourceReferences'],'observedRecoveries':recs,'contrasts':contrasts,'selectedFrames':[o['frames'] for o in outputs if 'frames' in o],'newPhysicsStarts':0,'newPhysicsTicks':0})
print('Rendered',len(outputs),'contrast PNGs; all source and frozen hashes unchanged')
