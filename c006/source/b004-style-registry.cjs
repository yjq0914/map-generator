'use strict';
const Relay=require('./b004-mechanic-relay.cjs'), Parent=require('./b003-style-registry-v2.cjs'),same=require('node:util').isDeepStrictEqual;
const CONFIG=Object.freeze(require('./configs/b004-style-registry-v1.json'));
const STYLES=Object.freeze([...Parent.STYLES,Relay.STYLE]);
function generate(config,input){if(!same(config,CONFIG))throw Error('Registry config changed');return Parent.generate(Parent.CONFIG,input);}
function generateStyle(style,input){return style===Relay.STYLE?Relay.generate(Relay.CONFIG,input):Parent.generateStyle(style,input);}
module.exports={CONFIG,STYLES,generate,generateStyle};
