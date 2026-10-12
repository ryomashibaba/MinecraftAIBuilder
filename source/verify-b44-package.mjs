#!/usr/bin/env node
/** Read-only static integrity verifier. Not a deployment permission or execution runner. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sum=x=>createHash('sha256').update(x).digest('hex');
const err=k=>{throw Error('B44_PACKAGE_'+k)};
function readFile(rel){
 if(rel.startsWith('/')||rel.split('/').some(x=>x==='..'||!x))err('PATH');
 const f=path.join(ROOT,rel),st=fs.lstatSync(f);
 if(!st.isFile()||st.isSymbolicLink())err('NOT_REGULAR_'+rel);
 return fs.readFileSync(f);
}
const frozenRaw=readFile('B43_FILE_SHA256.json');
if(sum(frozenRaw)!=='364cf34f7f7760e932c998fbb27cdaca77c08fc95a02c54168ee15db68a73317')err('B43_MANIFEST_CHANGED');
const frozen=JSON.parse(frozenRaw),b44=JSON.parse(readFile('B44_MAIN_FILE_SHA256.json'));
if(frozen.fileCount!==690||Object.keys(frozen.files).length!==690||b44.schema!=='minecraftaibuilder-b44-main-integration-sha-v1'||
 b44.frozenFiles!==690||b44.addedFileCount!==31||Object.keys(b44.addedFiles).length!==31)err('MANIFEST_CONTRACT');
for(const [rel,expected] of Object.entries(frozen.files))if(sum(readFile(rel))!==expected)err('B43_FROZEN_CHANGED_'+rel);
for(const [rel,expected] of Object.entries(b44.addedFiles)){
 if(Object.hasOwn(frozen.files,rel)||rel==='B44_MAIN_FILE_SHA256.json')err('OVERWRITTEN_'+rel);
 if(sum(readFile(rel))!==expected)err('DIFF_CHANGED_'+rel);
}
const known=new Set([...Object.keys(frozen.files),...Object.keys(b44.addedFiles),'B43_FILE_SHA256.json','B44_MAIN_FILE_SHA256.json']);
function collect(dir,rel=''){
 for(const x of fs.readdirSync(dir,{withFileTypes:true})){
  const loc=rel?rel+'/'+x.name:x.name;
  if(x.isDirectory())collect(path.join(dir,x.name),loc);
  else if(x.isFile()){
   if(!known.has(loc))err('UNTRACKED_FILE_'+loc);
  }else err('NONFILE_'+loc);
 }
}
collect(ROOT);
console.log('B44_INTEGRATION_PACKAGE_PASS',JSON.stringify({b43FrozenFiles:690,addedFiles:31,sourceFiles:723,
 mergeRoles:['sub-a','sub-b','sub-c','main'],readiness:'NOT_PREPARED',deployment:'BLOCKED',operations:0}));
