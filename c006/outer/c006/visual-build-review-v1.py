#!/usr/bin/env python3
"""Package inspected c006 PNG evidence; no engine/replay/physics calls."""
from pathlib import Path
import runpy,datetime,collections
H=runpy.run_path(str(Path(__file__).with_name('visual-render-contrasts-v1.py')));globals().update({k:v for k,v in H.items() if not k.startswith('__')})
from PIL import Image
now=datetime.datetime.now(datetime.timezone.utc).isoformat();checks=immutable();freeze=read('outer/c006/formal-freeze-summary.json')
mainpath='visuals/c006-control00-main-actual-v1/manifest.json';contrastpath='visuals/c006-selected-contrasts-actual-v2/manifest.json'
main=read(mainpath);contrast=read(contrastpath)
assert digest(contrast['presentationRenderer']['projectRelativePath'])==contrast['presentationRenderer']['sha256']
assert digest(contrast['buildScript']['projectRelativePath'])==contrast['buildScript']['sha256']
findings={
 'full-map-pair.png':'Eight readable source-layout strips retain full x0–24000, including unvisited x18060–24000. The late x12000–18000 strips show fixed/moving package order reversed while narrow upper auxiliaries remain. Purple crosses are dynamic source anchors, never reconstructed moving poses. Saved paths stop at x18060.',
 'pressure-clearance-pair.png':'The full0–120s actual width/margin histories and observed status strips are retained. Widths coincide before the late intervention, then moving-pair troughs shift earlier in candidate. Each curve uses1200 half-open12-tick samples; the raw trace has1201 with terminal14400. Descriptive240px is not an acceptance or human-tension threshold.',
 'key-frame-01.png':'Control00 P/C tick11520: saved player x14460,y381.75/242.35,vy−126/−126. Parent last primary is fixed at x14490–14535,y252–288; candidate has the actual moving pair near x14500–14575. Both actual c9-adj-upper bodies at x14680–14715,y−120–165 remain visibly ahead, then tail/recovery rectangles. Whole viewport is not symmetric.',
 'key-frame-02.png':'Control00 P/C tick11808: saved first recovery entry x14820,y280.25/247.45,vy120/120. c9-adj-upper remains visible behind the player at the left side. Different next primary demand is partly visible at the far right: parent moving pair, candidate fixed island. Those far-right bodies are clipped by the actual viewport and are not projected to fuller shapes.',
 'key-frame-03.png':'Control00 P/C tick12810: x16072.5,y233.589583/383.239583,vy−3/161. Moving versus fixed primary demand has reversed at package10. Actual upper auxiliaries remain visible at parent x16165–16200 and candidate16240–16275. All coral bodies preserve their saved collision status.',
 'key-frame-04.png':'Control00 tick13453: both players have left edge16866.25,1.25px beyond the unchanged first successor island right edge16865. Actual y120.777778/122.827778 differs by2.05px; vy208.833333 matches. The downstream existing islands remain visible. No future body position was generated.',
 'action-motion-whole.png':'Full0–120s actual y,vy,exact flap ticks and alive coverage remain visible for the control00 pair. Main histories coincide until the late intervention then separate, with later convergence. Full input counts are verified separately from late counts; equal total counts would not imply identical timing.',
 'action-motion-window-01.png':'Control00 P/C actual late window10320–14160 (86–118s) keeps movement, velocities, inputs and alive strips. Different y trajectories and command times around packages9/10 are visible; no smoothing, counterfactual tolerance or ease claim.',
 'upper-order-late-sequence.png':'Six exact candidate panels compare controls00/01 at common ticks11520,11808,12810. Each row visibly retains c9-adj-upper and c10-adj-upper. At11520 moving-pair versus fixed-island demand accompanies y242.35/381.75; at12810 fixed versus moving accompanies y383.239583/247.939583. Both use seed1 HLT and first recovery2s. Actual upper auxiliary labels are legible and point to retained bodies. Primary pair symmetry does not make the full image symmetric.',
 'lower-order-late-sequence.png':'Six exact candidate panels compare controls04/05 at10900,11540,12100. Lower auxiliaries c9-adj-lower and c10-adj-lower are visibly preserved at the two entrances. At10900 the players coincide at y164.0625,vy−262.666667, while the first two island widths/vertical offsets differ. At11540 the last primary state separates strongly: y411.373611 versus77.906944. At12100 the lower-before neighbor and reversed next primary pattern are visible. Middle frames legitimately have no auxiliary in the camera; none was added.',
 'recovery-action-contrast.png':'97–104s exact state/input/margin plot separates controls00/02/03 with actual observed recovery bars98.4–100.4,98.4–99.6,98.4–100.0s. Curves agree on entry, then differ in command timing, y/vy and recorded nearest margin. Recovery input counts3/2/3 and exit states are in the bound evidence. Duration is not labeled as improvement or ease; recovery bar annotations remain readable above the bars.',
 'order-action-contrast.png':'Two explicitly separate same-entry columns show actual y/vy,nearest margin,exact inputs and alive coverage86–118s. Left is controls00/01, HLT2s; right controls04/05,HJT1.6s. Correct input/alive labels are C00/C01 left and C04/C05 right. Late input counts63/66 and72/73 differ, as do timings and trajectories. Each column is interpretable on its own; no cross-context causal inference.'
}
all_outputs=[];images=[]
for packet,m in [('control00-main',main),('same-entry-contrasts',contrast)]:
 for out in m['outputs']:
  assert digest(out['projectRelativePath'])==out['sha256']
  with Image.open(R/out['projectRelativePath']) as im:assert list(im.size)==out['pixelDimensions'];im.verify()
  out={**out,'packet':packet};all_outputs.append(out)
  images.append({**{k:out[k] for k in ['projectRelativePath','sha256','pixelDimensions']},'pixelInspection':'complete','finding':findings[out['path']]})
assert len(all_outputs)==12
sources=contrast['sourceReferences'];coverage=[]
for s in sources:
 a=authenticate(s['runId']);d,rr=observed_report(a)
 assert d['binding']['analyzerSHA256']==digest('outer/c006/analyze.cjs')
 assert d['binding']['preregistrationSHA256']==digest('outer/c006/formal-preregistration.json')
 assert a.status=='alive' and a.end_tick==14400
 coverage.append({'runId':a.run['id'],'mapHash':a.run['mapHash'],'traceSHA256':a.run['traceSHA256'],'storedRows':len(a.rows),'storedBodyFrames':len(a.trace['bodySamples']),'storedClearanceSamples':len(a.trace['clearanceSamples']),'clearanceStatusCounts':dict(collections.Counter(x['status'] for x in a.trace['clearanceSamples'])),'exactWholeCourseInputCount':len(a.trace['flapTicks']),'exactLateInputCount':sum(10320<=t<14160 for t in a.trace['flapTicks']),'terminalTick':a.end_tick,'status':a.status,'condition':a.run['condition']['id'],'role':a.run['role'],'commitBinding':a.commit})
limits=[
 'Seven selected assigned_main runs across six public controls, not an aggregate or full192-slot qualification. Formal decision and gate audits remain separate.',
 'Parent/candidate control00 changed order and recovery jointly; isolate same-entry order using00/01 and04/05, and same-order duration using00/02/03.',
 'All exact body/player poses, inputs and clearance come from saved traces authenticated to commit/result/map/trace hashes. No physics starts, state steps, controller calls, replay, source body projections or synthetic dynamic poses.',
 'Static source-map footprints and dynamic anchors are different from actual timestamped bodies. Horizontal compression in full map cannot establish runtime readability.',
 'The upper-after and lower-before auxiliaries make the whole scene asymmetric. Primary theme ordering does not establish whole-frame symmetry or new internal-pattern synthesis.',
 'Recorded width and nearest margin are geometric proxies. Recovery duration and actual input differences do not measure feasible-input tolerance, human ease, human fun, natural route discovery or causal warning comprehension.',
 'Saved bridge entry/exit states are observed route intervals. Their shared exit vy near−3 does not erase differing y, inputs or downstream demand.',
 'Integer-tick drawings do not independently re-audit substep collision authority, ledger chain, source observer correctness or formal adoption. Those remain formal analysis obligations.',
 'No Site publication, Library upload, source/harness/design change, acceptance-pointer change or generic old visual-suite rerun was performed.'
]
review={'schema':'c006-actual-visual-pixel-review/1','round':'c006','createdAt':now,'pixelInspection':'complete','method':'Opened and visually inspected all12 final PNGs at original image paths; checked visible bodies, labels, scales, curve coverage and legibility against saved rows/bodies/report entries. Hash/file-open checks are additional, not substituted for pixel inspection.','qualification':'selected-public-controls-witness-only-full-panel-decision-separate','newPhysicsStarts':0,'newPhysicsTicks':0,'renderer':ref('visuals/render_evidence.py'),'presentationRenderer':ref('outer/c006/visual-render-contrasts-v1.py'),'renderManifests':[ref(mainpath),ref(contrastpath)],'sourceReferences':sources,'coverage':coverage,'images':images,'observedRecoveries':contrast['observedRecoveries'],'sameEntryContrasts':contrast['contrasts'],'immutableChecks':{**checks,'baselineFiles':len(read('outer/c006/visual-immutable-baseline-v1.json')),'formalFreezeFiles':len(freeze['files'])},'crossCuttingLimits':limits,'pngCount':12,'totalPNGBytes':sum(o['bytes'] for o in all_outputs),'supersededDraft':{'directory':'visuals/c006-selected-contrasts-actual-v1','pngCount':4,'selected':False,'reason':'Initial presentation draft had shared-y tick-label leakage into left order panel and overly long lower-sequence titles. Corrected without changing evidence; all four final v2 PNGs were inspected again.'}}
write('outer/c006/visual-review-v1.json',review)
narrative='''# c006 实际图像复核：保留邻体的晚段编排

完成12张最终 PNG 的逐张实际像素复核；网站精选6张。证据为6个公开控制条件的7条 assigned_main 记录：control00父版，以及control00–05候选。每条均保存14401行、末tick14400仍存活，commit/result/map/trace与配对缓存身份检查通过。此图包不替代192槽正式资格、碰撞子步或采用判定。

## 可见证据

- 完整源布局保留x0–24000，含x18060之后未到访区域。灰色是固定源占位，紫色×只是动态源锚点；运行时移动姿态只来自保存的body frame
- Upper-after对照00/01保持seed1、HLT和2s恢复。三列共同ticks11520、11808、12810分别呈现首包末primary、恢复入口、次包末primary；c9-adj-upper与c10-adj-upper有可读标签，实际保留。11520玩家y242.35/381.75；12810为383.239583/247.939583，moving/fixed顺序反转可见
- Lower-before对照04/05保持seed0、HJT和1.6s恢复。10900与12100入口帧保留两个下邻体；首两个岛宽度与纵向错位有真实差异。11540末primary处y411.373611/77.906944。中列相机没有邻体，明确保持不补画
- 压力图保留control00父/候选完整0–120s、净自由中心宽度、最近垂直余量及observed状态条。图中每臂1200个半开12tick采样；原记录另含terminal14400，共1201
- 恢复对照00/02/03保持相同入口、HLT和moving-first顺序。实际首桥均从11808开始，分别在12048/11952/12000退出，即240/144/192ticks，兑现2.0/1.2/1.6s。桥内真实输入分别3/2/3次；出口y269.466667/264.35/269.983333，vy均约−3。图示状态、输入及余量差异，不把较长时长叫改善
- 首次保存状态差异：00/01为10801；00/02为11851；00/03为11959；04/05为10969。晚段10320–14160输入数分别63/66、63/63、63/65、72/73；相同数量也可能不同输入时序
- 两组同入口顺序对照在动作图分为左右列，分别是00/01与04/05，不能跨列推断因果。初版共享轴标签问题已修正并重看v2实际像素；初版保留但不用于网站

## 解释边界

全场景含上/下邻体，不能因primary局部pair而叫整图对称。本轮是已有内部图案和完整包的顺序/恢复配置，未声称创造新内部图案。清晰的源布局不等于相机时刻可读性；几何净空和实际输入不等于人类张力、容错、乐趣或自然发现。恢复桥有明确实际起止，不代表更容易。

没有新物理启动/步进、控制器调用、回放、动态姿态推算、trace重写或旧泛用视觉测试重跑；249个source/harness/design/renderer基线文件与全部正式冻结文件hash不变。没有发布网站或上传Library。精确run ID、map/trace/hash、配对缓存文件、图片hash与选择理由见JSON审查和网站清单。
'''
with (R/'outer/c006/visual-review-v1.md').open('x') as f:f.write(narrative)
selected=['full-map-pair.png','pressure-clearance-pair.png','upper-order-late-sequence.png','lower-order-late-sequence.png','recovery-action-contrast.png','order-action-contrast.png']
featured=[]
for n in selected:
 o=next(x for x in all_outputs if x['path']==n);featured.append({**{k:o[k] for k in ['projectRelativePath','sha256','bytes','pixelDimensions','kind','caption','packet']},'pixelInspection':'complete','reviewFinding':findings[n]})
site={'schema':'c006-website-ready-actual-visual-manifest/1','round':'c006','createdAt':now,'status':'ready-for-ingestion-not-published','qualification':review['qualification'],'sourceFreeze':freeze['id'],'sourceManifestHash':freeze['manifestHash'],'fixture':False,'publicURL':None,'published':False,'newPhysicsStarts':0,'newPhysicsTicks':0,'renderer':ref('visuals/render_evidence.py'),'presentationRenderer':ref('outer/c006/visual-render-contrasts-v1.py'),'requests':{'pilot':ref('outer/c006/visual-request-main-v1.json'),'selection':ref('outer/c006/visual-selection-plan-v1.json'),'contrastBuild':ref('outer/c006/visual-build-contrasts-v2.py')},'review':{**ref('outer/c006/visual-review-v1.json'),'pixelInspection':'complete','narrativeProjectRelativePath':'outer/c006/visual-review-v1.md','narrativeSHA256':digest('outer/c006/visual-review-v1.md')},'rawSelectedEvidence':ref('outer/c006/visual-evidence-extract-v2.json'),'renderManifests':[ref(mainpath),ref(contrastpath)],'sourceReferences':sources,'featuredAssets':featured,'outputs':all_outputs,'pngCount':12,'totalOutputBytes':sum(o['bytes'] for o in all_outputs),'roundBoundary':{'selectedPublicConditions':6,'selectedAssignedRuns':7,'selectedRole':'assigned_main','preregisteredSlots':192,'acceptanceClaim':False,'formalStatusAuthority':'outer/c006 formal analysis/decision, when present; not this visual packet'},'ingestionNotes':['Use six featuredAssets in listed order; include direct source/report references beside the gallery.','Keep all12 final PNG outputs and both final render manifests. Do not select visuals/c006-selected-contrasts-actual-v1, which is a superseded presentation draft.','Full maps show source footprints/dynamic anchors, distinct from exact retained runtime frames.','Upper/lower auxiliary labels point to actual saved bodies. Middle lower frames legitimately have no auxiliary visible.','Recovered v2 order-action labels are C00/C01 left and C04/C05 right; two separate contexts.','Full pressure remains0–120s; recovery detail97–104s supplements full-course coverage, never replaces it.','Local paths are evidence pointers; replace with verified website-relative links at ingestion. Nothing is published by this manifest.'],'crossCuttingLimits':limits}
write('outer/c006/visual-site-manifest-v1.json',site)
assert immutable()==checks
print({'ready':True,'finalPNGs':12,'featuredPNGs':6,'sources':7,'bytes':site['totalOutputBytes'],'manifestSHA256':digest('outer/c006/visual-site-manifest-v1.json'),'coverage':[(x['runId'],x['storedBodyFrames'],x['exactWholeCourseInputCount']) for x in coverage]})
