#!/usr/bin/env node
/** Immutable predecessor-chain hash verification and safe offline B48 replay. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB48FromSource} from './parallel/b48/main/run-b48.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const error=x=>{throw Error('B48_PACKAGE_'+x)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))error('PATH');
 const p=path.join(ROOT,rel),stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink())error('INVALID_FILE');
 return fs.readFileSync(p);
}
const prev=JSON.parse(read('B47_FILE_SHA256.json'));
const m=JSON.parse(read('B48_FILE_SHA256.json'));
const frozen={...prev.baselineFiles,...prev.addedFiles,'B47_FILE_SHA256.json':hash(read('B47_FILE_SHA256.json'))};
if(m.schema!=='minecraftaibuilder-b48-integrated-sha-v1'||
 m.originalB47ManifestSha256!==hash(read('B47_FILE_SHA256.json'))||
 m.frozenB47FileCount!==Object.keys(frozen).length||m.frozenB47FileCount!==757||
 JSON.stringify(m.baselineFiles)!==JSON.stringify(frozen)||
 m.addedFileCount!==Object.keys(m.addedFiles??{}).length||m.addedFileCount<5)error('MANIFEST');
for(const [file,d] of Object.entries(m.baselineFiles))if(hash(read(file))!==d)error('FROZEN_CHANGED_'+file);
for(const [file,d] of Object.entries(m.addedFiles)){
 if(Object.hasOwn(m.baselineFiles,file)||file==='B48_FILE_SHA256.json'||hash(read(file))!==d)error('ADDED_CHANGED_'+file);
}
const tracked=new Set([...Object.keys(m.baselineFiles),...Object.keys(m.addedFiles),'B48_FILE_SHA256.json']);
function walk(folder,prefix=''){
 for(const e of fs.readdirSync(folder,{withFileTypes:true})){
  const rel=prefix?prefix+'/'+e.name:e.name;
  if(e.isDirectory())walk(path.join(folder,e.name),rel);
  else if(!e.isFile()||!tracked.has(rel))error('UNTRACKED_'+rel);
 }
}
walk(ROOT);
if(tracked.size!==m.frozenB47FileCount+m.addedFileCount+1)error('TRACKED_COUNT');
const {report}=buildB48FromSource();
const saved=JSON.parse(read('parallel/b48/main/B48_CANONICAL_GEOMETRY_REPORT.json'));
if(JSON.stringify(report)!==JSON.stringify(saved)||saved.readiness!=='NOT_PREPARED'||
 saved.blockers.M4Gates.length!==9||saved.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 saved.BuildPlan.operations.length||saved.engineCalls!==0||saved.executionAllowed!==false||
 saved.constructionApproved!==false)error('REPLAY_OR_SAFETY');
console.log('B48_PACKAGE_PASS',JSON.stringify({frozenB47:m.frozenB47FileCount,
 added:m.addedFileCount,checkedSourceFiles:tracked.size,buildings:saved.totals.buildings,
 floors:saved.totals.levels,normalizedRoofGroupings:saved.totals.canonicalRectangleGroupsChanged,
 blockedGates:9,engineCalls:0,operations:0}));
