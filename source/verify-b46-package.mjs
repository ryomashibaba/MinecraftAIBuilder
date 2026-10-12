#!/usr/bin/env node
/** Read-only B46 checkpoint validator. Never imports the builder or any execution SDK. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=k=>{throw Error('B46_PACKAGE_'+k)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('PATH');
 const file=path.join(ROOT,rel),st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink())fail('REGULAR_FILE_'+rel);
 return fs.readFileSync(file);
}
const manifest=JSON.parse(read('B46_FILE_SHA256.json'));
if(manifest.schema!=='minecraftaibuilder-b46-checkpoint-sha-v1'||manifest.baselineFileCount!==736||
 manifest.addedFileCount!==12||Object.keys(manifest.baselineFiles??{}).length!==736||
 Object.keys(manifest.addedFiles??{}).length!==12||
 manifest.baselineB45ManifestSha256!=='e5bde7a5d95b0821db9288e34b5ecdd9ea69161280031401a49f0fd423fe8670')fail('BAD_MANIFEST');
if(hash(read('B45_FILE_SHA256.json'))!==manifest.baselineB45ManifestSha256)fail('OLD_MANIFEST_CHANGED');
const upstream=JSON.parse(read('B45_FILE_SHA256.json'));
const original={...upstream.baselineFiles,...upstream.addedFiles,
 'B45_FILE_SHA256.json':manifest.baselineB45ManifestSha256};
if(Object.keys(original).length!==736)fail('UPSTREAM_FILE_COUNT');
if(JSON.stringify(original)!==JSON.stringify(manifest.baselineFiles))fail('OLD_MANIFEST_CONTENT');
for(const [rel,digest] of Object.entries(manifest.baselineFiles))if(hash(read(rel))!==digest)fail('FROZEN_MODIFIED_'+rel);
for(const [rel,digest] of Object.entries(manifest.addedFiles)){
 if(Object.hasOwn(original,rel)||rel==='B46_FILE_SHA256.json')fail('OVERWRITE_'+rel);
 if(hash(read(rel))!==digest)fail('NEW_MODIFIED_'+rel);
}
const tracked=new Set([...Object.keys(original),...Object.keys(manifest.addedFiles),'B46_FILE_SHA256.json']);
function walk(dir,prefix=''){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${entry.name}`:entry.name,abs=path.join(dir,entry.name);
  if(entry.isDirectory())walk(abs,rel);
  else if(!entry.isFile()||!tracked.has(rel))fail('UNTRACKED_'+rel);
 }
}
walk(ROOT);
if(tracked.size!==749)fail('TRACKED_COUNT');
const review=JSON.parse(read('parallel/b46/main/B46_PLANNER_GEOMETRY_REVIEW.json'));
if(review?.schema!=='minecraftaibuilder-b46-safe-local-planner-geometry-contract-v1'||
 review?.readiness!=='NOT_PREPARED'||review?.deployment!=='BLOCKED'||
 review?.buildOperations!==0||review?.engineCalls!==0||review?.BuildPlan?.operations?.length!==0||
 review?.BuildPlan?.commandCount!==0||review?.materialIds?.length!==0||
 review?.packets?.length!==175||review?.blockers?.M4Gates?.length!==9||
 review.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 review?.constructionApproved!==false||review?.executionAllowed!==false)fail('SAFETY_DATA');
console.log('B46_PACKAGE_PASS',JSON.stringify({frozenB45:736,b46Added:12,checkedSourceFiles:749,
 localGeometryPackets:review.packets.length,blockedGates:9,operations:0}));
