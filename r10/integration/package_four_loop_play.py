#!/usr/bin/env python3
"""Package exact saved native maps and an offline selectable player; no physics."""
import json,hashlib,shutil
from pathlib import Path
HERE=Path(__file__).resolve().parent;OUT=HERE.parent/'delivery-four-loops/playable';OUT.mkdir(parents=True,exist_ok=True)
root=HERE/'runs/four-loops/B4'
choices=[('full701 · 32.475s verified win',root/'finish-checks/full-701'),('full4402 · 31.542s verified win',root/'finish-checks/full-4402'),('short707 · 30.000s verified win',root/'runs/candidate-707'),('macro5703 · 120.000s verified win',root/'finish-checks/macro-5703'),('counterexample4408 · death20.725s',root/'runs/holdout-4408'),('counterexample5701 · death58.292s',root/'finish-checks/macro-5701')]
examples=[];files=[]
for label,p in choices:
 m=json.loads((p/'map.json').read_text());r=json.loads((p/'result.json').read_text());name=p.name+'.json';(OUT/'maps').mkdir(exist_ok=True);shutil.copyfile(p/'map.json',OUT/'maps'/name)
 examples.append({'label':label,'map':m});files.append({'file':'maps/'+name,'mapSHA256':r['mapSHA256'],'sourceResult':str((p/'result.json').relative_to(HERE)),'outcome':r['outcome'],'actualTicks':r['actualTicks']})
s=(HERE/'player.html').read_text().replace('Combo maps · local player','Four-loop native maps · preserved preview').replace('<h1>Combo maps</h1>','<h1>Four-loop native maps</h1>').replace('EXPERIMENTAL · LOCAL ONLY','EXPERIMENTAL · SAVED PREVIEW')
s=s.replace('<div class="controls">','<div class="controls"><select id="examples" aria-label="Choose a saved native map"></select>')
s=s.replace('Choose a new map from integration/evidence','Choose a saved map or open another map.json')
js='''
const examples=DEMO_MAPS;
const picker=document.getElementById('examples');
examples.forEach((v,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=v.label;picker.append(o);});
function openExample(i){pause();const selected=examples[i];if(!selected)return;try{const data=structuredClone(selected.map);assertActive(data);E.validate(data);map=data;families=[...new Set((meta().modules||[]).map(m=>m.family))].sort();els.filename.textContent=selected.label;els.error.textContent='';reset();}catch(err){els.error.textContent=err.message;}}
picker.addEventListener('change',()=>openExample(Number(picker.value)));
openExample(0);
'''.replace('DEMO_MAPS',json.dumps(examples,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c'))
s=s.replace('</script></body>',js+'</script></body>');(OUT/'player.html').write_text(s)
(OUT/'MANIFEST.json').write_text(json.dumps({'schema':'four-loop-native-preview/1','physicsRerunsDuringPackaging':0,'maps':files,'limitations':'Author-informed native trajectories only. Counterexamples labeled, not promoted. Source includes full inputs/results. UI syntax and minimal DOM behavior tested; no human play or aesthetic validation.'},indent=2)+'\n')
(OUT/'README.md').write_text('''# 四轮实验保存的原生试玩版本

打开 player.html，下拉菜单含 4 张有完整原生通关证据的地图与 2 张明确标注的反例。Space/点击拍动，P暂停，R重开。全部使用随包原生 runtime，不联网。

两张完整短图分别 32.475 秒和 31.542 秒，一张原生 30 秒图，一张真正单世界 120 秒图。保存的胜利只是作者知情控制器在确切地图上的存在证据，不是真人可玩/有趣或连续安全参数范围。反例有意保留。

黄色虚线只是作者控制阈值，可关闭；实体是当前原生碰撞体，完整圆盘不是可穿环。仅保存文件，没有发布网站。
''')
print(OUT)
