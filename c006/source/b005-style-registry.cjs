'use strict';
const Rhythm=require('./b005-stage-recovery.cjs'),Parent=require('./b004-style-registry.cjs'),same=require('node:util').isDeepStrictEqual;
const CONFIG=Object.freeze(require('./configs/b005-style-registry-v1.json')),STYLE='relation-conditioned-stage-recovery';
const STYLES=Object.freeze([...Parent.STYLES,STYLE]);
function generate(config,input){if(!same(config,CONFIG))throw Error('Registry config changed');return Parent.generate(Parent.CONFIG,input);}
function generateStyle(style,input){return style===STYLE?Rhythm.generate(Rhythm.CONFIG,input):Parent.generateStyle(style,input);}
module.exports={CONFIG,STYLE,STYLES,generate,generateStyle};
