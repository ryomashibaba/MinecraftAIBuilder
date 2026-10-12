#!/usr/bin/env node
/** B51 append-only source audit + static replay. Refuse untracked files / symlinks. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB51FromSource} from './parallel/b51/main/run-b51.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=s=>{throw Error('B51_PACKAGE_'+s)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||
  rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('INVALID_PATH');
 const abs=path.join(ROOT,rel),info=fs.lstatSync(abs);
 if(!info.isFile()||info.isSymbolicLink())fail('NONREGULAR_FILE');
 return fs.readFileSync(abs);
}
const old=JSON.parse(read('B50_FILE_SHA256.json'));
const now=JSON.parse(read('B51_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B50_FILE_SHA256.json':hash(read('B50_FILE_SHA256.json'))};
if(old.schema!=='minecraftaibuilder-b50-integrated-sha-v1'||
 old.frozenB49FileCount!==771||old.addedFileCount!==6||
 now.schema!=='minecraftaibuilder-b51-integrated-sha-v1'||
 now.originalB50ManifestSha256!==hash(read('B50_FILE_SHA256.json'))||
 now.frozenB50FileCount!==778||Object.keys(frozen).length!==778||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||
 now.addedFileCount!==6||Object.keys(now.addedFiles||{}).length!==6)fail('MANIFEST');
const seen=new Set(Object.keys(frozen));
for(const [rel,sha] of Object.entries(frozen))if(hash(read(rel))!==sha)fail('FROZEN_'+rel);
for(const [rel,sha] of Object.entries(now.addedFiles)){
 if(seen.has(rel)||rel==='B51_FILE_SHA256.json'||hash(read(rel))!==sha)fail('ADDED_'+rel);
 seen.add(rel);
}
seen.add('B51_FILE_SHA256.json');
function walk(dir,prefix=''){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${e.name}`:e.name;
  if(e.isDirectory())walk(path.join(dir,e.name),rel);
  else if(!e.isFile()||!seen.has(rel))fail('UNTRACKED_OR_SYMLINK_'+rel);
 }
}
walk(ROOT);
if(seen.size!==785)fail('FILE_COUNT');
const {report}=buildB51FromSource();
const saved=JSON.parse(read('parallel/b51/main/B51_ARCHITECTURE_CONTRACT_REPORT.json'));
if(JSON.stringify(saved)!==JSON.stringify(report)||
 saved.totals.buildings!==5||saved.totals.levels!==30||saved.totals.facadeUnits!==3022||
 saved.totals.roofOptionsReviewed!==91||saved.totals.entryOptionsReviewed!==91||
 saved.totals.expandedRoofPreviewCandidates!==1464||
 saved.totals.minecraftCommands!==0||saved.totals.constructionOperations!==0||
 saved.totals.runtimePlannerCalls!==0||
 saved.readiness!=='NOT_PREPARED'||saved.deployment!=='BLOCKED'||
 saved.constructionApproved!==false||saved.executionAllowed!==false||
 saved.worldCoordinates!==null||saved.materialIds.length!==0||
 saved.engineCalls!==0||saved.buildOperations!==0||
 saved.BuildPlan.operations.length!==0||saved.BuildPlan.commandCount!==0||
 saved.blockers.M4Gates.length!==9||saved.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 saved.scope.deployment!=='FORBIDDEN')fail('REPORT_OR_SAFETY');
console.log('B51_PACKAGE_PASS',JSON.stringify({frozenB50:now.frozenB50FileCount,
 newB51SourceFiles:now.addedFileCount,checkedSourceFiles:seen.size,
 buildings:saved.totals.buildings,levels:saved.totals.levels,
 originalFacadeUnits:saved.totals.facadeUnits,
 rooftopExpandedCandidates:saved.totals.expandedRoofPreviewCandidates,
 blockedGates:9,engineCalls:0,operations:0}));
