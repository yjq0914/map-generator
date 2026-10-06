'use strict';
const Patrol=require('./b006-patrol-encounter.cjs'),Parent=require('./b005-style-registry.cjs'),same=require('node:util').isDeepStrictEqual;
const CONFIG=Object.freeze(require('./configs/b006-style-registry-v1.json'));
const STYLES=Object.freeze([...Parent.STYLES,Patrol.STYLE]);
function generate(config,input){if(!same(config,CONFIG))throw Error('Registry config changed');return Parent.generate(Parent.CONFIG,input);}
function generateStyle(style,input){return style===Patrol.STYLE?Patrol.generate(Patrol.CONFIG,input):Parent.generateStyle(style,input);}
module.exports={CONFIG,STYLES,generate,generateStyle};
