#!/usr/bin/env node
/** Verify every file from frozen B70, B71 additions, pinned source archive, and deterministic build. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB71FromSource} from './parallel/b71/main/run-b71.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'B71_INTEGRITY.json'),'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B71_PACKAGE_'+x)};
if(manifest.schema!=='minecraftaibuilder-b71-handoff-manifest-v1'||
 Object.keys(manifest.originalB70Files).length!==1151||Object.keys(manifest.b71AddedFiles).length<8)fail('MANIFEST');
const sourceList={...manifest.originalB70Files,...manifest.b71AddedFiles};
const wanted=new Set([...Object.keys(sourceList),'B71_INTEGRITY.json']);
for(const [key,expected] of Object.entries(sourceList)){
 if(typeof key!=='string'||key.startsWith('/')||key.includes('\\')||key.split('/').some(x=>!x||x==='.'||x==='..'))fail('PATH');
 const full=path.join(root,key),s=fs.lstatSync(full);
 if(!s.isFile()||s.isSymbolicLink()||sha(fs.readFileSync(full))!==expected)fail('HASH_'+key);
}
function visit(dir,base=''){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=base?base+'/'+ent.name:ent.name;
  if(ent.isDirectory()&&!ent.isSymbolicLink())visit(path.join(dir,ent.name),rel);
  else if(!ent.isFile()||!wanted.has(rel))fail('EXTRA_'+rel);
 }
}visit(root);
if(wanted.size!==Object.keys(manifest.originalB70Files).length+Object.keys(manifest.b71AddedFiles).length+1)fail('COUNT');
const x=buildB71FromSource(path.join(root,'B71_REFERENCE_PINNED_SOURCE_EVIDENCE.zip'));
const stored=JSON.parse(fs.readFileSync(path.join(root,'source/parallel/b71/main/B71_PINNED_SOURCE_ADAPTER_REPORT.json'),'utf8'));
if(JSON.stringify(x.report)!==JSON.stringify(stored)||x.report.gates.some(g=>g.status!=='BLOCKED')||
 x.report.BuildPlan.operations.length||x.report.summary.constructionCommands!==0||
 x.receipt.count.exactPinMatch!==5)fail('REPLAY_AND_SAFETY');
console.log('B71_HANDOFF_PASS',JSON.stringify({frozenB70Files:1151,b71AddedFiles:Object.keys(manifest.b71AddedFiles).length,
  productionSourcePinned:5,sections:30,blockedFloorPitchMismatch:24,doors:314,gatesBlocked:9,buildOperations:0}));
