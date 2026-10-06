'use strict';
// Candidate routing only. Adding this module does not advance acceptance.
const Old = require('./a012-style-registry.cjs');
const New = require('./b001-relation-grammar.cjs');
const same = require('node:util').isDeepStrictEqual;
const STYLE = 'pinned-contact-relation-composition';
const CONFIG = Object.freeze(require('./configs/b001-style-registry-v1.json'));
const STYLES = Object.freeze([...Old.STYLES, STYLE]);
function generate(config, input) {
  if (!same(config, CONFIG)) throw Error('Registry config changed');
  return Old.generate(Old.CONFIG, input);
}
function generateStyle(style, input) {
  return style === STYLE ? New.generate(New.CONFIG, input) : Old.generateStyle(style, input);
}
module.exports = {CONFIG, STYLES, STYLE, generate, generateStyle};
