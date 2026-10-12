#!/usr/bin/env node
/** B49 immutable B48-chain and offline-only architecture replay gate. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB49FromSource} from './parallel/b49/main/run-b49.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B49_PACKAGE_'+s)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||
  rel.split('/').some(p=>!p||p==='.'||p==='..'))fail('INVALID_PATH');
 const p=path.join(ROOT,rel),stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink())fail('NOT_REGULAR_FILE');
 return fs.readFileSync(p);
}
const prev=JSON.parse(read('B48_FILE_SHA256.json'));
const curr=JSON.parse(read('B49_FILE_SHA256.json'));
const frozen={...prev.baselineFiles,...prev.addedFiles,
 'B48_FILE_SHA256.json':hash(read('B48_FILE_SHA256.json'))};
if(curr.schema!=='minecraftaibuilder-b49-integrated-sha-v1'||
 curr.originalB48ManifestSha256!==hash(read('B48_FILE_SHA256.json'))||
 prev.schema!=='minecraftaibuilder-b48-integrated-sha-v1'||
 prev.frozenB47FileCount!==757||prev.addedFileCount!==6||
 curr.frozenB48FileCount!==764||Object.keys(frozen).length!==764||
 JSON.stringify(curr.baselineFiles)!==JSON.stringify(frozen)||
 curr.addedFileCount!==Object.keys(curr.addedFiles??{}).length||curr.addedFileCount!==6)fail('MANIFEST');
for(const [rel,d] of Object.entries(curr.baselineFiles))if(hash(read(rel))!==d)fail('FROZEN_CHANGED_'+rel);
for(const [rel,d] of Object.entries(curr.addedFiles)){
 if(Object.hasOwn(curr.baselineFiles,rel)||rel==='B49_FILE_SHA256.json'||hash(read(rel))!==d)fail('ADDED_CHANGED_'+rel);
}
const tracked=new Set([...Object.keys(curr.baselineFiles),...Object.keys(curr.addedFiles),'B49_FILE_SHA256.json']);
function walk(root,prefix=''){
 for(const entry of fs.readdirSync(root,{withFileTypes:true})){
  const rel=prefix?prefix+'/'+entry.name:entry.name;
  if(entry.isDirectory())walk(path.join(root,entry.name),rel);
  else if(!entry.isFile()||!tracked.has(rel))fail('UNTRACKED_'+rel);
 }
}
walk(ROOT);
if(tracked.size!==curr.frozenB48FileCount+curr.addedFileCount+1)fail('COUNT');
const {report}=buildB49FromSource();
const saved=JSON.parse(read('parallel/b49/main/B49_ARCHITECTURE_INTERFACE_ATLAS.json'));
if(JSON.stringify(saved)!==JSON.stringify(report)||
 saved.readiness!=='NOT_PREPARED'||saved.deployment!=='BLOCKED'||
 saved.blockers.M4Gates.length!==9||saved.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 saved.BuildPlan.operations.length!==0||saved.BuildPlan.commandCount!==0||
 saved.engineCalls!==0||saved.buildOperations!==0||
 saved.constructionApproved!==false||saved.executionAllowed!==false||
 saved.totals.physicalConstructionOperations!==0||saved.totals.runtimePlannerInvocations!==0||
 saved.scope.transitionToDeployment!=='FORBIDDEN')fail('REPLAY_OR_SAFETY');
console.log('B49_PACKAGE_PASS',JSON.stringify({frozenB48:curr.frozenB48FileCount,
 added:curr.addedFileCount,checkedSourceFiles:tracked.size,
 buildings:saved.totals.buildings,levels:saved.totals.levels,
 visualWindowSlots:saved.totals.visualWindowSlots,topRoofCandidates:saved.totals.unplacedTopRoofHorizontalCandidates,
 blockedGates:9,engineCalls:0,operations:0}));
