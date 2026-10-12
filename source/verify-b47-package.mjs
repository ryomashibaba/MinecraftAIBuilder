#!/usr/bin/env node
/** B47 package verifier: immutable B46 base + strict path hash audit + offline replay. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB47FromSource} from './parallel/b47/main/run-b47.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
const fail=k=>{throw Error('B47_PACKAGE_'+k)};
const read=rel=>{
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('PATH');
 const full=path.join(ROOT,rel),st=fs.lstatSync(full);
 if(!st.isFile()||st.isSymbolicLink())fail('FILE');
 return fs.readFileSync(full);
};
const manifest=JSON.parse(read('B47_FILE_SHA256.json'));
const old=JSON.parse(read('B46_FILE_SHA256.json'));
if(manifest.schema!=='minecraftaibuilder-b47-checkpoint-sha-v1'||
 manifest.frozenB46FileCount!==749||Object.keys(manifest.baselineFiles??{}).length!==749||
 manifest.originalB46ManifestSha256!==hash(read('B46_FILE_SHA256.json'))||
 !Number.isSafeInteger(manifest.addedFileCount)||manifest.addedFileCount<6||
 Object.keys(manifest.addedFiles??{}).length!==manifest.addedFileCount)fail('MANIFEST');
const expectedB46={...old.baselineFiles,...old.addedFiles,
 'B46_FILE_SHA256.json':hash(read('B46_FILE_SHA256.json'))};
if(JSON.stringify(expectedB46)!==JSON.stringify(manifest.baselineFiles))fail('INHERITANCE');
for(const [rel,digest] of Object.entries(manifest.baselineFiles))if(hash(read(rel))!==digest)fail('FROZEN_MODIFIED_'+rel);
for(const [rel,digest] of Object.entries(manifest.addedFiles)){
 if(Object.hasOwn(manifest.baselineFiles,rel)||rel==='B47_FILE_SHA256.json'||hash(read(rel))!==digest)fail('NEW_MODIFIED_'+rel);
}
const tracked=new Set([...Object.keys(manifest.baselineFiles),...Object.keys(manifest.addedFiles),'B47_FILE_SHA256.json']);
function walk(folder,prefix=''){
 for(const e of fs.readdirSync(folder,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${e.name}`:e.name;
  if(e.isDirectory())walk(path.join(folder,e.name),rel);
  else if(!e.isFile()||!tracked.has(rel))fail('UNTRACKED_'+rel);
 }
}
walk(ROOT);
if(tracked.size!==750+manifest.addedFileCount)fail('TRACKED_COUNT');
const report=JSON.parse(read('parallel/b47/main/B47_PINNED_PLANNER_COMPATIBILITY.json'));
if(report.schema!=='minecraftaibuilder-b47-pinned-planner-envelope-compatibility-v1'||report.readiness!=='NOT_PREPARED'||
 report.deployment!=='BLOCKED'||report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 report.engineCalls!==0||report.buildOperations!==0||report.BuildPlan.operations.length||report.materialIds.length||
 report.constructionApproved!==false||report.executionAllowed!==false||report.worldCoordinates!==null)fail('SAFETY');
const replay=buildB47FromSource().report;
if(JSON.stringify(replay)!==JSON.stringify(report))fail('REPLAY');
console.log('B47_PACKAGE_PASS',JSON.stringify({frozenB46:749,addedFiles:manifest.addedFileCount,
 checkedSourceFiles:tracked.size,buildings:5,floors:30,roofDecompositionDifferences:report.totals.equivalentCoverageDifferentRectangleDecompositions,
 blockedGates:9,engineCalls:0,operations:0}));
