'use strict';
// Install before generators/candidate load. No restoration within this process.
let forbiddenCalls=0;const blocked=[];
for(const [file,allowed] of [
 ['../source/vendor/engine/core.js',['validate']],
 ['../source/vendor/baseline/core.js',['validate']],
 ['../source/vendor/engine/timed-course.js',['validate','isTimed']],
 ['../source/vendor/engine/arrival-triggers.js',['validate']],
 ['../source/vendor/policies/baseline/core.js',['validate']]
]) {
 const api=require(file);
 for(const [key,value] of Object.entries(api))if(typeof value==='function'&&!allowed.includes(key)) {
  blocked.push(file+':'+key);
  api[key]=()=>{forbiddenCalls++;throw Error('STATIC-ONLY prohibits '+file+':'+key);};
 }
}
module.exports={report:()=>({blockedDynamicEngineExports:blocked.length,forbiddenCalls,physicalExecutions:0,physicalTicks:0}),blocked};
