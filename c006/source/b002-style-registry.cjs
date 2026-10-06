'use strict';
// The coordinator must bind inheritB001 before freezing. No result/ledger lookup.
const Old = require('./a012-style-registry.cjs'), Hammer = require('./b002-swing-hammer.cjs');
const same = require('node:util').isDeepStrictEqual;
const CONFIG = Object.freeze(require('./configs/b002-style-registry-v1.json'));
const Grammar = CONFIG.inheritB001 ? require('./b001-style-registry.cjs') : null;
const Parent = Grammar || Old;
const STYLES = Object.freeze([...Parent.STYLES, Hammer.STYLE]);
function generate(config, input) {
  if (!same(config, CONFIG)) throw Error('Registry config changed');
  return Parent.generate(Parent.CONFIG, input);
}
function generateStyle(style, input) {
  return style === Hammer.STYLE ? Hammer.generate(Hammer.CONFIG, input) : Parent.generateStyle(style, input);
}
module.exports = {CONFIG, STYLES, generate, generateStyle};
