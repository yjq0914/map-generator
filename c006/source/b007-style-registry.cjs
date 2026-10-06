'use strict';
const Factory=require('./b007-deferred-registry.cjs'),same=require('node:util').isDeepStrictEqual;
const CONFIG=Object.freeze(require('./configs/b007-style-registry-v1.json')),Bound=Factory.bind(CONFIG.parent);
const STYLES=Bound.STYLES,STYLE=Bound.STYLE;
function generate(config,input){if(!same(config,CONFIG))throw Error('Registry config changed');return Bound.generate(Bound.CONFIG,input);}
module.exports={CONFIG,STYLES,STYLE,generate,generateStyle:Bound.generateStyle};
