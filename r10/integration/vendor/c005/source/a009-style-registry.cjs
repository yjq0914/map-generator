'use strict';
const Old=require('./a007-style-registry-v2.cjs'),New=require('./a009-composed-generator.cjs'),same=require('node:util').isDeepStrictEqual,CONFIG=require('./configs/a009-style-registry-v1.json');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x}deepFreeze(CONFIG);
const STYLES=New.STYLES;function generateStyle(style,input){return New.generateStyle(style,input)}function generate(config,input){if(!same(config,CONFIG))throw Error('Registry config changed');return Old.generate(Old.CONFIG,input)}module.exports={CONFIG,STYLES,generate,generateStyle};
