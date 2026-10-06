'use strict';
const Old=require('./a007-style-registry-v2.cjs'),Phase=require('./a008-hold-turn-generator.cjs'),same=require('node:util').isDeepStrictEqual,CONFIG=require('./configs/a008-style-registry-v1.json');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x;}deepFreeze(CONFIG);
const STYLES=Object.freeze([...Old.STYLES,'interface-hold-then-turn']);function generateStyle(style,entry){if(style==='interface-hold-then-turn')return Phase.generate(Phase.CONFIG,entry);return Old.generateStyle(style,entry);}function generate(config,entry){if(!same(config,CONFIG))throw Error('Registry config changed');return generateStyle(CONFIG.defaultStyle,entry);}module.exports={CONFIG,STYLES,generate,generateStyle};
