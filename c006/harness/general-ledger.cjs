'use strict';
// Single-process serialized runner; only request/reserve/commit rows are written.
const C=require('./common.cjs');
const LIMITS=Object.freeze({physicalStarts:3200,ticks:38000000,activeWallSeconds:57600,evidenceBytes:1073741824,minFreeBytes:402653184,watchdogSeconds:180,runEvidenceHeadroom:8388608});
const caches=new Map();
function rows(root=C.ROOT){
  const p=C.within(root,'ledger.jsonl'); if(!C.fs.existsSync(p))return[];
  const size=C.fs.statSync(p).size,cache=caches.get(p); if(cache?.size===size)return cache.rows;
  const str=C.fs.readFileSync(p,'utf8'); if(str&&!str.endsWith('\n'))throw Error('Unclosed ledger tail; fail closed');
  const rr=str.trim()?str.trim().split('\n').map(JSON.parse):[]; let previousHash=null;
  for(let i=0;i<rr.length;i++){const {hash,...r}=rr[i];if(r.seq!==i||r.previousHash!==previousHash||C.sha(r)!==hash||!['request','reserve','commit'].includes(r.kind))throw Error('Ledger chain invalid');previousHash=hash;}
  caches.set(p,{size,rows:rr});return rr;
}
function append(row,root=C.ROOT){
  const rr=rows(root),r={seq:rr.length,previousHash:rr.at(-1)?.hash??null,at:new Date().toISOString(),...row};
  if(!['request','reserve','commit'].includes(r.kind))throw Error('Only request/reserve/commit ledger events');
  const out={...r,hash:C.sha(r)},p=C.within(root,'ledger.jsonl'),fd=C.fs.openSync(p,'a');
  try{C.fs.writeSync(fd,JSON.stringify(out)+'\n');C.fs.fsyncSync(fd);}finally{C.fs.closeSync(fd);}
  caches.set(p,{size:C.fs.statSync(p).size,rows:[...rr,out]});return out;
}
function summary(root=C.ROOT){
  const rr=rows(root),requests=rr.filter(x=>x.kind==='request'),reserves=rr.filter(x=>x.kind==='reserve'),commits=rr.filter(x=>x.kind==='commit'),byCommit=new Map(commits.map(r=>[r.id,r])),reservedIds=new Set(reserves.map(r=>r.id)),pending=reserves.filter(r=>!byCommit.has(r.id));
  return {requests:requests.length,reserves:reserves.length,commits:commits.length,
    physicalStarts:commits.filter(r=>r.physicalStarted).length,ticks:commits.reduce((n,r)=>n+r.ticks,0),
    substeps:commits.reduce((n,r)=>n+r.substeps,0),activeWallSeconds:commits.reduce((n,r)=>n+r.wallSeconds,0),
    pending:pending.map(r=>({id:r.id,maxTicks:r.maxTicks})),unreservedRequests:requests.filter(r=>!reservedIds.has(r.id)).map(r=>r.id),
    errors:commits.filter(r=>r.status!=='executed').map(r=>({id:r.id,status:r.status})),head:rr.at(-1)?.hash??null};
}
function resources(root=C.ROOT,extra=0){
  const used=C.bytes(C.within(root,'evidence'))+(C.fs.existsSync(C.within(root,'ledger.jsonl'))?C.fs.statSync(C.within(root,'ledger.jsonl')).size:0),d=C.fs.statfsSync(root),free=d.bavail*d.bsize;
  if(used+extra>LIMITS.evidenceBytes)throw Error('1GiB added evidence cap');
  if(free-extra<LIMITS.minFreeBytes)throw Error('384MiB free disk safety floor');
  return {evidenceBytes:used,freeBytes:free};
}
function request(spec,root=C.ROOT){
  const rr=rows(root),s=summary(root);
  if(s.pending.length||s.unreservedRequests.length)throw Error('Prior execution unresolved; no new request');
  if(rr.some(r=>r.id===spec.id||r.kind==='request'&&r.slot===spec.slot))throw Error('Duplicate execution id/slot');
  resources(root,LIMITS.runEvidenceHeadroom);
  if(s.physicalStarts+1>LIMITS.physicalStarts||s.ticks+spec.stopTick>LIMITS.ticks||s.activeWallSeconds+LIMITS.watchdogSeconds>LIMITS.activeWallSeconds)throw Error('Practical execution cap reached');
  return append({kind:'request',...spec},root);
}
function reserve(request,root=C.ROOT){
  const rr=rows(root);if(!rr.some(r=>r.kind==='request'&&r.hash===request.hash)||rr.some(r=>r.id===request.id&&r.kind!=='request'))throw Error('Unique authenticated request required');
  return append({kind:'reserve',id:request.id,slot:request.slot,maxTicks:request.stopTick,requestHash:request.hash,sourceManifestHash:request.sourceManifestHash},root);
}
function commit(value,root=C.ROOT){
  const rr=rows(root),reserve=rr.find(r=>r.kind==='reserve'&&r.id===value.id);
  if(!reserve||rr.some(r=>r.kind==='commit'&&r.id===value.id)||!Number.isInteger(value.ticks)||value.ticks<0||value.ticks>reserve.maxTicks||!Number.isInteger(value.substeps)||value.substeps<0||!Number.isFinite(value.wallSeconds)||value.wallSeconds<0||typeof value.physicalStarted!=='boolean')throw Error('Invalid actual execution settlement');
  return append({kind:'commit',...value,reserveHash:reserve.hash},root);
}
module.exports={LIMITS,rows,summary,resources,request,reserve,commit};
