'use strict';
const fs=require('node:fs'),path=require('node:path');
const A=require('./proposal-recipe-composer.cjs'),hash=A.hash,same=require('node:util').isDeepStrictEqual;
const CONFIG=require('./configs/c005-parent-binding-v1.json'),root=path.join(__dirname,'..');
const need=(v,s)=>{if(!v)throw Error('c005 parent binding: '+s);};
need(/^source\/[a-z0-9-]+\.cjs$/.test(CONFIG.module),'relative producer required');
const Parent=require(path.join(root,CONFIG.module));
const files=['source/c005-parent-binding.cjs','source/configs/c005-parent-binding-v1.json'];
const digests=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
const sourceIdentity=hash({digests,parent:Parent.sourceIdentity});
function dependencies(mode){
 for(const [f,h]of Object.entries(digests))need(hash(fs.readFileSync(path.join(root,f)))===h,'binding changed: '+f);
 const actual=Parent.dependencies();
 if(mode==='preparation-static'&&CONFIG.status.startsWith('awaiting-'))return sourceIdentity;
 need(CONFIG.status==='durable-terminal-parent','terminal parent has not been supplied');
 need(actual===CONFIG.expectedSourceIdentity,'producer identity differs');
 const bytes=fs.readFileSync(path.join(root,CONFIG.acceptedSnapshot));need(hash(bytes)===CONFIG.acceptedSnapshotSHA256,'snapshot differs');const a=JSON.parse(bytes);
 need(a.round===CONFIG.round&&a.generator===CONFIG.module&&!a.pendingDurableSave,'snapshot is not durable accepted producer');return sourceIdentity;
}
function compile(input,q,mode){dependencies(mode);return Parent.compile(input,q);}
function normalizeRequest(q,mode){dependencies(mode);return Parent.normalizeRequest(q);}
function entry(input,mode){dependencies(mode);return Parent.entry(input);}
module.exports={CONFIG,sourceIdentity,dependencies,compile,normalizeRequest,entry,hash};
