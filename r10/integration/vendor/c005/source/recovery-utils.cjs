'use strict';
// New recovery construction. Numeric equivalence is bounded absolute comparison,
// never quantization, a novelty hash, or a substitute for exact source identity.
const EPS=1e-9, clone=structuredClone;
function equal(a,b,eps=EPS){
 if(typeof a!==typeof b)return false;
 if(typeof a==='number')return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=eps;
 if(a===null||b===null||typeof a!=='object')return a===b;
 if(Array.isArray(a)!==Array.isArray(b))return false;
 if(Array.isArray(a))return a.length===b.length&&a.every((v,i)=>equal(v,b[i],eps));
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
 return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&equal(a[k],b[k],eps));
}
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=EPS;
const ownedIndex=id=>{const m=/^c(0|[1-9]\d*)-/.exec(id);return m?+m[1]:-1;};
const remapId=(id,slot)=>id.replace(/^c\d+-/,'c'+slot+'-');
function assert(value,message){if(!value)throw Error('Recovery generator: '+message);}
function keys(value,allowed,label){assert(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>allowed.includes(k)),'unsupported '+label+' fields');}
function assertFiniteTree(v,path='value'){if(typeof v==='number')assert(Number.isFinite(v),'nonfinite '+path);else if(v&&typeof v==='object')for(const [k,q] of Object.entries(v))assertFiniteTree(q,path+'.'+k);}
module.exports={EPS,clone,equal,near,ownedIndex,remapId,assert,keys,assertFiniteTree};
