'use strict';
// Explicit styles preserve the accepted vertical default byte-for-byte.
// Source capability is distinct from external qualification; never selects by test ID.
const same=require('node:util').isDeepStrictEqual,Parent=require('./recovery-generator.cjs'),Horizontal=require('./a006-following-generator.cjs'),CONFIG=require('./configs/a006-style-registry-v1.json');
function deepFreeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(deepFreeze);Object.freeze(x)}return x;}deepFreeze(CONFIG);
const STYLES=Object.freeze(['vertical-default','long-horizontal-occupation']);
function generateStyle(style,entry){if(style==='vertical-default')return Horizontal.generateParent(entry);if(style==='long-horizontal-occupation')return Horizontal.generateNominalMoving(entry);throw Error('Unknown explicit style; no fallback');}
function generate(config,entry){if(!same(config,CONFIG))throw Error('Registry config changed; new source version required');return generateStyle(CONFIG.defaultStyle,entry);}
module.exports={CONFIG,STYLES,generate,generateStyle};
