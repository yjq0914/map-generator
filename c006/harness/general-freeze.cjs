'use strict';
const C=require('./common.cjs');
function create(id,extra=[],root=C.ROOT){
  if(!/^[A-Za-z0-9._-]+$/.test(id))throw Error('Invalid freeze id');
  const paths=[...['source','harness'].flatMap(d=>C.walk(C.within(root,d)).filter(p=>/\.(?:cjs|js|json)$/.test(p)).map(p=>C.path.relative(root,p).split(C.path.sep).join('/'))),
    ...C.walk(C.within(root,'design')).filter(p=>/\.(?:cjs|js)$/.test(p)).map(p=>C.path.relative(root,p).split(C.path.sep).join('/')),
    ...C.walk(C.within(root,'outer')).filter(p=>/\/accepted(?:-before|-pointer)?\.json$/.test(p)).map(p=>C.path.relative(root,p).split(C.path.sep).join('/')),
    ...['protocols/BASELINE-ACCEPTED.json'].filter(p=>C.fs.existsSync(C.within(root,p))),...extra];
  const files=Object.fromEntries([...new Set(paths)].sort().map(p=>[p,C.sha(C.fs.readFileSync(C.within(root,p)))]));
  const f={schema:'recovery-source-freeze/1',id,at:new Date().toISOString(),files,manifestHash:C.sha(files)},path='protocols/freezes/'+id+'.json';
  C.write(C.within(root,path),f);return {path,...f};
}
function verifyReceipt(receiptPath,freeze,root=C.ROOT){
  if(typeof receiptPath!=='string')throw Error('Verified local durable source receipt required');
  const receipt=C.read(C.within(root,receiptPath)),fr=C.checkSourceSnapshot(freeze,root);
  if(receipt.schema!=='adaptive-durable-receipt/1'||receipt.status!=='succeeded'||!receipt.libraryFileId||receipt.currentVersion===undefined||receipt.currentVersion===null||! /^[0-9a-f]{64}$/.test(receipt.archiveSHA256??'')||receipt.sourceManifestHash!==fr.manifestHash||receipt.freezePath!==freeze||!Number.isFinite(Date.parse(receipt.savedAt)))throw Error('Durable source receipt must bind successful Library save to exact frozen source');
  return {...receipt,receiptHash:C.sha(receipt)};
}
module.exports={create,verifyReceipt};
if(require.main===module)console.log(JSON.stringify(create(process.argv[2],process.argv.slice(3))));
