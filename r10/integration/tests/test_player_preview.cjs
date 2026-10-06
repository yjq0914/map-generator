'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'../..');
test('packaged player selects saved maps, pauses, restarts, and toggles guide without physics',()=>{
 const elements=new Map();const canvasCtx=new Proxy({}, {get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 function el(id){if(!elements.has(id))elements.set(id,{id,tagName:'DIV',style:{},files:[],children:[],listeners:{},disabled:false,value:'0',textContent:'',append(x){this.children.push(x)},setAttribute(k,v){this[k]=v},addEventListener(k,f){this.listeners[k]=f},getContext(){return canvasCtx},width:1200,height:540});return elements.get(id)}
 const document={hidden:false,getElementById:el,querySelector:s=>el(s.replace(/^#/,'')),createElement:t=>({tagName:t,style:{},setAttribute(){}}),listeners:{},addEventListener(k,f){this.listeners[k]=f}};
 const sandbox={document,window:{listeners:{},addEventListener(k,f){this.listeners[k]=f}},performance:{now:()=>1},requestAnimationFrame:()=>{},console};
 vm.createContext(sandbox);vm.runInContext('globalThis.structuredClone=v=>JSON.parse(JSON.stringify(v));',sandbox);
 vm.runInContext(fs.readFileSync(path.join(ROOT,'integration/vendor/flappy-runtime.js'),'utf8'),sandbox);
 const html=fs.readFileSync(path.join(ROOT,'delivery-four-loops/playable/player.html'),'utf8');
 for(const m of html.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/g))if(m[1].trim())vm.runInContext(m[1],sandbox);
 assert.equal(el('examples').children.length,6);assert.equal(vm.runInContext('state.tick',sandbox),0);assert.equal(el('play').disabled,false);
 el('play').onclick();assert.equal(vm.runInContext('playing',sandbox),true);el('pause').onclick();assert.equal(vm.runInContext('playing',sandbox),false);
 el('examples').value='3';el('examples').listeners.change();assert.equal(vm.runInContext('map.durationTicks',sandbox),14400);assert.equal(vm.runInContext('state.tick',sandbox),0);
 el('guide').onclick();assert.equal(vm.runInContext('showGuide',sandbox),false);el('restart').onclick();assert.equal(vm.runInContext('state.tick',sandbox),0);
 el('examples').value='5';el('examples').listeners.change();assert.match(el('filename').textContent,/counterexample/);assert.equal(el('error').textContent,'');
});
