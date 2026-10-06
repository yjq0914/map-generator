'use strict';
// The formal runner uses compile for both arms, preserving the same request.
const A=require('./c003-macro-generator.cjs');
module.exports={VERSION:A.VERSION,sourceIdentity:A.sourceIdentity,dependencies:A.dependencies,entry:A.entry,normalizeRequest:A.normalizeRequest,compile:A.compileParent};
