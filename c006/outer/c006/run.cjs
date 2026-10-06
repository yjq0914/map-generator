'use strict';
// Small serial round driver; existing runner, ledger and physics are unchanged.
const C=require('../../harness/common.cjs'),Run=require('../../harness/general-runner.cjs'),L=require('../../harness/general-ledger.cjs');
const args=process.argv.slice(2),limit=Number(args[0]??192),freeze='protocols/freezes/c006-formal-v1.json',receiptPath='protocols/receipts/c006-formal-v1.json',preregistrationPath='outer/c006/formal-preregistration.json';
if(!Number.isInteger(limit)||limit<1||limit>192)throw Error('bounded slot count required');
const p=C.read(C.within(C.ROOT,preregistrationPath)),known=new Map(C.read(C.within(C.ROOT,'outer/c006/prospective-generation.json')).generation.map(x=>[x.id,x.generationError])),done=new Set(L.rows().filter(x=>x.kind==='request').map(x=>x.id)),out=[];
for(const s of p.slots.filter(s=>!done.has(s.id)).slice(0,limit)){
 if(C.fs.existsSync(C.within(C.ROOT,'STOP')))break;
 const r=Run.executeSlot({...s,freeze,receiptPath,preregistrationPath}),summary={id:r.id,status:r.status,physicalStarted:r.physicalStarted,ticks:r.ticks,taskPass:r.taskPass,error:r.error};out.push(summary);
 const cost=L.summary(),st=C.read(C.within(C.ROOT,'STATUS.json'));Object.assign(st,{currentRound:'c006',state:'c006-formal-running',phase:'formal-physical-evidence',formalCompleted:p.slots.filter(q=>L.rows().some(z=>z.kind==='commit'&&z.id===q.id)).length,lastSlot:r.id,openReservations:cost.pending.length,actual:cost,updatedAt:new Date().toISOString()});C.write(C.within(C.ROOT,'STATUS.json'),st,{exclusive:false});
 console.log(JSON.stringify(summary));
 if(r.error){const expected=known.get(s.condition.id)?.split('\n')[0];if(r.physicalStarted||!expected||!r.error.startsWith(expected))break;}
}
console.log(JSON.stringify({completedThisCall:out.length,cost:L.summary()}));
