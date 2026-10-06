'use strict';
// Coordinator grants a serial ledger turn before launching this exact frozen driver.
const C=require('../../../harness/common.cjs'),R=require('../../../harness/general-runner.cjs'),L=require('../../../harness/general-ledger.cjs'),Risk=require('./c006-risk-reduce.cjs');
const [freeze,receiptPath,permission]=process.argv.slice(2),preregistrationPath='outer/c006/risk/c006-risk-preregistration.json';
if(!freeze||!receiptPath||permission!=='RUN_FOUR_PREREGISTERED_LOCAL_PROBES')throw Error('Explicit coordinator launch token and durable freeze/receipt required');
const p=C.read(C.within(C.ROOT,preregistrationPath));if(p.slots.length!==4||p.maximumNewPhysicalTicks!==6036)throw Error('Unexpected risk budget');
const done=new Set(L.rows().filter(r=>r.kind==='request').map(r=>r.id)),reports=[];
for(const slot of p.slots){
 if(C.fs.existsSync(C.within(C.ROOT,'STOP')))break;
 if(done.has(slot.id))throw Error('No rerun or silent resume: existing risk request '+slot.id);
 const run=R.executeSlot({...slot,freeze,receiptPath,preregistrationPath});
 if(run.physicalStarted&&run.traceFile){const report=Risk.reduce(run.id,{freeze,receiptPath,preregistrationPath});C.write(C.within(C.ROOT,'outer/c006/risk/'+run.id+'-report.json'),report);reports.push(report.summary);console.log(JSON.stringify(report.summary));}
 else{reports.push({runId:run.id,status:run.status,error:run.error,physicalStarted:run.physicalStarted,actualTicks:run.ticks});console.log(JSON.stringify(reports.at(-1)));}
 if(run.error)break;
}
const result={schema:'c006-laser-margin-risk-results/1',reports,completed:reports.length===4,scope:'Local diagnostics only; no automatic macro-extension veto',newPhysicalStarts:reports.filter(q=>q.physicalStarted!==false).length,newPhysicalTicks:reports.reduce((n,q)=>n+(q.actualTicks??0),0),ledger:L.summary()};
C.write(C.within(C.ROOT,'outer/c006/risk/c006-risk-results.json'),result);console.log(JSON.stringify({completed:result.completed,newPhysicalStarts:result.newPhysicalStarts,newPhysicalTicks:result.newPhysicalTicks}));
