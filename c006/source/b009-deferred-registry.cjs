'use strict';
// Never activated here. Future serial owner supplies actual immutable b008 acceptance.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),same=require('node:util').isDeepStrictEqual;
const Candidate=require('./b009-shared-program.cjs');
const need=(v,s)=>{if(!v)throw Error('Deferred shared registry: '+s);};
const root=path.join(__dirname,'..'),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function authenticatePrerequisite(binding){
 need(binding&&Object.keys(binding).sort().join(',')==='acceptedPointerFile,acceptedPointerSHA256,config,configSHA256,module,moduleSHA256','explicit immutable b008 binding required');
 need(binding.acceptedPointerFile==='outer/b008/accepted-pointer.json'&&binding.module==='source/b008-style-registry.cjs'&&binding.config==='source/configs/b008-style-registry-v1.json','actual accepted b008 cumulative identity required');
 const bytes=fs.readFileSync(path.join(root,binding.acceptedPointerFile));need(digest(bytes)===binding.acceptedPointerSHA256,'accepted pointer bytes differ');const p=JSON.parse(bytes);
 need(p.round==='b008'&&p.generator===binding.module&&p.config===binding.config&&p.immutableRoundSnapshot===binding.acceptedPointerFile,'pointer is not immutable b008 acceptance');
 for(const [module,style]of [['source/b007-relocated-hammer.cjs','structurally-bound-swing-opposite-receiver'],['source/b008-timed-aperture.cjs','timed-aperture-opposite-receiver']])need(p.explicitStyles?.some(x=>x.id===style&&x.generator===module),'independent accepted operator absent');
 need(!p.explicitStyles.some(x=>/^source\/b006-/.test(x.generator)),'rejected b006 cannot be inherited');
 for(const k of ['module','config'])need(digest(fs.readFileSync(path.join(root,binding[k])))===binding[k+'SHA256'],'frozen cumulative '+k+' differs');
 const Parent=require(path.join(root,binding.module)),cfg=require(path.join(root,binding.config));need(same(cfg,Parent.CONFIG)&&Array.isArray(Parent.STYLES)&&!Parent.STYLES.includes(Candidate.STYLE),'stale/duplicate cumulative parent');
 need(p.explicitStyles.every(x=>Parent.STYLES.includes(x.id)),'accepted style missing from cumulative registry');
 return{Parent,pointer:p,binding:structuredClone(binding)};
}
function bind(binding){const {Parent}=authenticatePrerequisite(binding),CONFIG=Object.freeze({schema:'b009-deferred-cumulative-binding/1',parent:structuredClone(binding),candidate:Candidate.CONFIG.version});
 function generate(cfg,input){need(same(cfg,CONFIG),'binding config changed');return Parent.generate(Parent.CONFIG,input);}
 function generateStyle(style,input){return style===Candidate.STYLE?Candidate.generate(Candidate.CONFIG,input):Parent.generateStyle(style,input);}
 return{CONFIG,STYLE:Candidate.STYLE,STYLES:Object.freeze([...Parent.STYLES,Candidate.STYLE]),generate,generateStyle};}
module.exports={bind,authenticatePrerequisite,status:'unbound; conditional on actual b008 acceptance; combined qualification absent'};
