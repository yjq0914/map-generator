'use strict';
const Old=require('./a006-style-registry.cjs'),Phase=require('./a007-phase-generator-v2.cjs'),same=require('node:util').isDeepStrictEqual,CONFIG=require('./configs/a007-style-registry-v2.json');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x;}deepFreeze(CONFIG);
const STYLES=Object.freeze([...Old.STYLES,'phase-through-or-bypass']);function generateStyle(style,entry){if(style==='phase-through-or-bypass')return Phase.generate(Phase.CONFIG,entry);return Old.generateStyle(style,entry);}function generate(config,entry){if(!same(config,CONFIG))throw Error('Registry config changed');return generateStyle(CONFIG.defaultStyle,entry);}module.exports={CONFIG,STYLES,generate,generateStyle};
