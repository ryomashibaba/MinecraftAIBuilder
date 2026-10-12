#!/usr/bin/env node
/** Read-only verifier for B45; 723 B44 source files preserved byte-for-byte. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=c=>{throw Error('B45_PACKAGE_'+c)};
function read(rel){
 if(!rel||rel.startsWith('/')||rel.split('/').some(s=>s===''||s==='..'||s==='.')||rel.includes('\\'))fail('PATH');
 const abs=path.join(ROOT,rel),stat=fs.lstatSync(abs);
 if(!stat.isFile()||stat.isSymbolicLink())fail('NOT_REGULAR_'+rel);
 return fs.readFileSync(abs);
}
const contract=JSON.parse(read('B45_FILE_SHA256.json'));
if(contract.schema!=='minecraftaibuilder-b45-main-checkpoint-sha-v1'||contract.baselineFileCount!==723||
 Object.keys(contract.baselineFiles).length!==723||contract.addedFileCount!==Object.keys(contract.addedFiles).length||
 contract.baselineB44ManifestSha256!=='3e7183239b4a787f3f33d23579ced8a163f0351d2e1a0265e87da4522cde9082')fail('MANIFEST');
if(sha(read('B44_MAIN_FILE_SHA256.json'))!==contract.baselineB44ManifestSha256)fail('B44_MANIFEST_CHANGED');
for(const [rel,want] of Object.entries(contract.baselineFiles))if(sha(read(rel))!==want)fail('B44_MODIFIED_'+rel);
for(const [rel,want] of Object.entries(contract.addedFiles)){
 if(Object.hasOwn(contract.baselineFiles,rel)||rel==='B45_FILE_SHA256.json')fail('OVERWRITE_'+rel);
 if(sha(read(rel))!==want)fail('B45_MODIFIED_'+rel);
}
const known=new Set([...Object.keys(contract.baselineFiles),...Object.keys(contract.addedFiles),'B45_FILE_SHA256.json']);
function walk(root,base=''){
 for(const e of fs.readdirSync(root,{withFileTypes:true})){
  const rel=base?base+'/'+e.name:e.name,abs=path.join(root,e.name);
  if(e.isDirectory())walk(abs,rel);
  else if(!e.isFile()||!known.has(rel))fail('UNTRACKED_'+rel);
 }
}
walk(ROOT);
console.log('B45_PACKAGE_PASS',JSON.stringify({b44Frozen:723,b45Added:contract.addedFileCount,
 checkedFiles:known.size,readiness:'NOT_PREPARED',blockedGates:9,operations:0}));
