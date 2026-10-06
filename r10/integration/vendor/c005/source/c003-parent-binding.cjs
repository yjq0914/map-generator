'use strict';
// An explicit immutable producer binding, never latest-pointer autodiscovery.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),CONFIG=require('./configs/c003-parent-binding-v1.json');
const hash=x=>crypto.createHash('sha256').update(Buffer.isBuffer(x)||typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const need=(v,s)=>{if(!v)throw Error('c003 parent binding: '+s);};
need(/^source\/[a-z0-9-]+\.cjs$/.test(CONFIG.module),'invalid relative producer');
const Parent=require(path.join(root,CONFIG.module));
const paths=['source/c003-parent-binding.cjs','source/configs/c003-parent-binding-v1.json'];
const files=Object.fromEntries(paths.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
const sourceIdentity=hash({files,parent:CONFIG.expectedSourceIdentity,accepted:CONFIG.acceptedSnapshotSHA256});
function dependencies(){
 for(const [f,h]of Object.entries(files))need(hash(fs.readFileSync(path.join(root,f)))===h,'binding changed: '+f);
 need(Parent.dependencies()===CONFIG.expectedSourceIdentity,'accepted producer identity changed');
 const bytes=fs.readFileSync(path.join(root,CONFIG.acceptedSnapshot));
 need(hash(bytes)===CONFIG.acceptedSnapshotSHA256,'accepted snapshot changed');
 const accepted=JSON.parse(bytes);
 need(accepted.round===CONFIG.round&&accepted.generator===CONFIG.module&&!accepted.pendingDurableSave,'binding is not a durable accepted producer');
 return sourceIdentity;
}
function compile(input,request){dependencies();return Parent.compile(input,request);}
function normalizeRequest(request){dependencies();return Parent.normalizeRequest(request);}
function entry(input){dependencies();return Parent.entry(input);}
module.exports={CONFIG,sourceIdentity,dependencies,compile,normalizeRequest,entry,hash};
