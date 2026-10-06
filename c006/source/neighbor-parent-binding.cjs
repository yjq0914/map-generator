'use strict';
// One explicit producer dependency. Finalize this config only after durable closure.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CONFIG=require('./configs/neighbor-parent-binding.json');
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const need=(v,s)=>{if(!v)throw Error('Neighbor parent binding: '+s);};
const sourceRoot=path.resolve(__dirname,CONFIG.sourceRoot),Parent=require(path.join(sourceRoot,CONFIG.module));
const digests=Object.fromEntries(['neighbor-parent-binding.cjs','configs/neighbor-parent-binding.json'].map(f=>[f,hash(fs.readFileSync(path.join(__dirname,f)))]));
const sourceIdentity=hash({digests,parent:CONFIG.expectedSourceIdentity});
function dependencies(){
 for(const [f,h]of Object.entries(digests))need(hash(fs.readFileSync(path.join(__dirname,f)))===h,'binding changed: '+f);
 need(Parent.dependencies()===CONFIG.expectedSourceIdentity,'bound producer changed');
 need(['preparation-only','durable-accepted'].includes(CONFIG.status),'unknown binding status');
 if(CONFIG.status==='durable-accepted'){
  const b=fs.readFileSync(path.resolve(sourceRoot,'..',CONFIG.acceptedSnapshot));need(hash(b)===CONFIG.acceptedSnapshotSHA256,'accepted snapshot differs');const a=JSON.parse(b);
  need(a.round===CONFIG.round&&a.generator==='source/'+CONFIG.module&&!a.pendingDurableSave,'snapshot is not the durable accepted producer');
 }
 return sourceIdentity;
}
const compile=(input,q)=>{dependencies();return Parent.compile(input,q);};
const entry=input=>{dependencies();return Parent.entry(input);};
const normalizeRequest=q=>{dependencies();return Parent.normalizeRequest(q);};
module.exports={CONFIG,sourceRoot,sourceIdentity,dependencies,compile,entry,normalizeRequest,hash};
