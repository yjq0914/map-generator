#!/usr/bin/env python3
"""Promote only after confirmed raw evidence Library retention."""
import pathlib,json,datetime,hashlib
R=pathlib.Path(__file__).resolve().parents[2]
def read(p):return json.loads((R/p).read_text())
def write(p,x):(R/p).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
u=read('outer/c006/raw-library-upload.json')['results'][0];assert u['status']=='succeeded';m=read('outer/c006/raw-archive-prepared.json');assert hashlib.sha256(pathlib.Path(m['archive']).read_bytes()).hexdigest()==m['sha256'];decision=read('outer/c006/decision.json');now=datetime.datetime.now(datetime.timezone.utc).isoformat()
receipt={'schema':'adaptive-qualified-round-save/1','round':'c006','status':'succeeded','libraryFileId':u['library_file_id'],'currentVersion':u['current_version_number'],'archiveSHA256':m['sha256'],'archiveBytes':m['bytes'],'savedAt':now,'remoteBytesVerified':False};write('protocols/receipts/c006-qualified-round.json',receipt)
accepted=read('outer/c006/accepted-before.json');status=decision['status']
if status=='conditional-adopt':
 accepted.update(version=decision['version'],round='c006',generator='source/neighbor-generator.cjs',config='source/configs/neighbor-parent-binding.json',entrypoint='compile(physicalCondition,{schema:"neighbor-late-macro-request/1",parentRequest,macro})',qualification=decision['qualification'],decision='outer/c006/decision.json',rule='outer/c006/rule.json',sourceFreeze=decision['sourceFreeze'],sourceManifestHash=decision['sourceManifestHash'],parent='outer/c006/accepted-before.json',limitations=['explicit same-condition macro-null cumulative parentRequest required for new neighbor macro','complete old intent refusal reported separately','complete packages9/10 and known upper-after/lower-before bodies only','old adjacency-none macro and prior calls unchanged','L desired-prefix/companion and L/J guards retained','new internal patterns and whole-image symmetry not claimed','four laser risk points do not certify a neighborhood or human tolerance','finite sampled domain; human fun and natural choice unknown'],pendingDurableSave=False,qualifiedArchive=receipt,acceptedAt=now,immutableRoundSnapshot='outer/c006/accepted-pointer.json')
 write('ACCEPTED.json',accepted)
write('outer/c006/accepted-pointer.json',accepted)
gaps=read('outer/c006/gap-results.json')
for g in gaps:
 if g.get('adoption')=='pending durable close':g['adoption']='conditional only'
write('GAPS.json',gaps)
st=read('STATUS.json');assert not any(q['round']=='c006' for q in st['rounds']);st.update(completed=6,currentRound='c006',state='c006-raw-saved-final-source-pending',phase='final-source-and-progress-save',accepted=accepted['version'],currentAcceptedVersion=accepted['version'],latestAcceptedVersion=accepted['version'],formalCompleted=decision['formalSlots'],formalUnstarted=decision['unstartedSlots'],localProbeCompleted=decision['localRiskSlots'],openReservations=0,actual=read('outer/c006/analysis.json')['cost'],updatedAt=now);st['rounds'].append({'round':'c006','status':status,'rawLibraryFileId':receipt['libraryFileId'],'formalSlots':decision['formalSlots'],'localProbeSlots':decision['localRiskSlots'],**decision['cost']});write('STATUS.json',st)
t=read('outer/c006/timing.json');t.update(qualifiedArchiveSavedAt=now,acceptedPointerPromotedAt=now if status=='conditional-adopt' else None);write('outer/c006/timing.json',t)
a=read('outer/c006/analysis.json');progress=R/'PROGRESS.zh-CN.md';old=progress.read_text();oldbody=old.split('\n',2)[2] if old.startswith('# 实时进度\n') else old
text='# 实时进度\n\n6/12轮已终判；c006决定：'+status+'。当前接受版 '+accepted['version']+'。本轮raw已保存，正在完成最终累计源码和进度保存。旧17调用、默认3类机制、旧限定可选并集10类保持；有限请求可选机制并集7类，本轮增加带邻体的编排域。\n\n## 历史记录\n\n'+oldbody
text+='\n\n## c006：带邻体的顺序、净空动作与恢复表达\n\n- '+str(decision['formalSlots'])+'/192正式槽，'+str(decision['unstartedSlots'])+'未启动；另4个预声明局部probe单列计账\n- 指定路线父/候选完整资格：'+str(sum(p['parentQualified'] for p in a['pairs']))+'/48、'+str(sum(p['candidateQualified'] for p in a['pairs']))+'/48\n- 同入口moving/fixed和stagger顺序对照保留全部辅助体；2/1.2/1.6s恢复分别按真实240/144/192ticks核对，实际输入与状态差异见分析\n- primary图案排序不等于含邻体整图对称，没有创造新内部图案。旧完整意图支持与显式macro-null物理companion分开\n- 复用1.199px激光基线；phase±0.1/y±3四个1509tick局部点均存活，余量9.636–24.560px，仍不代表连续邻域、玩家容错或公平性\n- main/局部合计成本：'+str(decision['cost'])+'\n- raw已保存：'+receipt['libraryFileId']+'；最终累计源码/进度保存成功后持久关闭\n'
progress.write_text(text)
print(json.dumps({'status':status,'acceptedVersion':accepted['version'],'rawLibraryFileId':receipt['libraryFileId'],'rawVersion':receipt['currentVersion']}))
