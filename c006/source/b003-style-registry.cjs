'use strict';
// Bind accepted ancestry before freezing. This never reads outcome files/ledgers.
const Laser = require('./b003-warning-laser.cjs');
const same = require('node:util').isDeepStrictEqual;
const CONFIG = Object.freeze(require('./configs/b003-style-registry-v1.json'));
const allowedParents = new Set(['source/a012-style-registry.cjs', 'source/b001-style-registry.cjs', 'source/b002-style-registry.cjs']);
if (!allowedParents.has(CONFIG.inheritedRegistry)) throw Error('Unrecognized declared registry ancestry');
const Parent = require('./' + CONFIG.inheritedRegistry.slice('source/'.length));
const STYLES = Object.freeze([...Parent.STYLES, Laser.STYLE]);
function generate(config, input) {
  if (!same(config, CONFIG)) throw Error('Registry config changed');
  return Parent.generate(Parent.CONFIG, input);
}
function generateStyle(style, input) {
  return style === Laser.STYLE ? Laser.generate(Laser.CONFIG, input) : Parent.generateStyle(style, input);
}
module.exports = {CONFIG, STYLES, generate, generateStyle};
