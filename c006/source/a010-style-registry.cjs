'use strict';
const Old=require('./a009-style-registry.cjs'),New=require('./a010-composed-generator.cjs'),same=require('node:util').isDeepStrictEqual,CONFIG=require('./configs/a010-style-registry-v1.json');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x}deepFreeze(CONFIG);
const STYLES=New.STYLES;function generateStyle(style,input){return New.generateStyle(style,input)}function generate(config,input){if(!same(config,CONFIG))throw Error('Registry config changed');return Old.generate(Old.CONFIG,input)}module.exports={CONFIG,STYLES,generate,generateStyle};
