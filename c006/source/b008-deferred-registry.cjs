'use strict';
// This factory is unbound. It neither reads nor updates ACCEPTED.json.
// Bind and freeze the actual cumulative parent only during authorized serial integration.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),same=require('node:util').isDeepStrictEqual;
const Candidate=require('./b008-timed-aperture.cjs');
const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',f))).digest('hex');
function bind(binding){
 if(!binding||Object.keys(binding).sort().join(',')!=='config,configSHA256,module,moduleSHA256')throw Error('Deferred registry: explicit frozen parent identity required');
 if(!/^source\/b\d{3}-style-registry(?:-v\d+)?\.cjs$/.test(binding.module)||!/^source\/configs\/b\d{3}-style-registry-v\d+\.json$/.test(binding.config))throw Error('Deferred registry: unsupported cumulative parent registry');
 if(digest(binding.module)!==binding.moduleSHA256||digest(binding.config)!==binding.configSHA256)throw Error('Deferred registry: parent identity mismatch');
 const Parent=require(path.join(__dirname,'..',binding.module)),config=require(path.join(__dirname,'..',binding.config));
 if(!same(config,Parent.CONFIG)||!Array.isArray(Parent.STYLES)||Parent.STYLES.includes(Candidate.STYLE))throw Error('Deferred registry: stale or duplicate parent');
 const CONFIG=Object.freeze({schema:'b008-explicit-registry-binding/1',parent:structuredClone(binding),candidate:Candidate.CONFIG.version});
 function generate(cfg,input){if(!same(cfg,CONFIG))throw Error('Deferred registry: frozen configuration changed');return Parent.generate(Parent.CONFIG,input);}
 function generateStyle(style,input){return style===Candidate.STYLE?Candidate.generate(Candidate.CONFIG,input):Parent.generateStyle(style,input);}
 return{CONFIG,STYLE:Candidate.STYLE,STYLES:Object.freeze([...Parent.STYLES,Candidate.STYLE]),generate,generateStyle};
}
module.exports={bind,status:'unbound; no acceptance or physical combination implied'};
