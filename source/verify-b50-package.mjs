#!/usr/bin/env node
/** Strict append-only B49 baseline audit and B50 static report replay. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB50FromSource} from './parallel/b50/main/run-b50.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=s=>{throw Error('B50_PACKAGE_'+s)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||
  rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('INVALID_PATH');
 const p=path.join(ROOT,rel),stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink())fail('NONREGULAR_FILE');
 return fs.readFileSync(p);
}
const old=JSON.parse(read('B49_FILE_SHA256.json'));
const now=JSON.parse(read('B50_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B49_FILE_SHA256.json':hash(read('B49_FILE_SHA256.json'))};
if(old.schema!=='minecraftaibuilder-b49-integrated-sha-v1'||
 old.frozenB48FileCount!==764||old.addedFileCount!==6||
 now.schema!=='minecraftaibuilder-b50-integrated-sha-v1'||
 now.originalB49ManifestSha256!==hash(read('B49_FILE_SHA256.json'))||
 now.frozenB49FileCount!==771||Object.keys(frozen).length!==771||
 JSON.stringify(frozen)!==JSON.stringify(now.baselineFiles)||
 now.addedFileCount!==6||Object.keys(now.addedFiles??{}).length!==6)fail('MANIFEST');
const included=new Set(Object.keys(frozen));
for(const [rel,sha] of Object.entries(now.baselineFiles))if(hash(read(rel))!==sha)fail('FROZEN_CHANGED_'+rel);
for(const [rel,sha] of Object.entries(now.addedFiles)){
 if(included.has(rel)||rel==='B50_FILE_SHA256.json'||hash(read(rel))!==sha)fail('ADDED_CHANGED_'+rel);
 included.add(rel);
}
included.add('B50_FILE_SHA256.json');
function walk(dir,prefix=''){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${e.name}`:e.name;
  if(e.isDirectory())walk(path.join(dir,e.name),rel);
  else if(!e.isFile()||!included.has(rel))fail('UNTRACKED_OR_SYMLINK_'+rel);
 }
}
walk(ROOT);
if(included.size!==778)fail('COUNT');
const {report,b49}=buildB50FromSource();
const saved=JSON.parse(read('parallel/b50/main/B50_FACADE_DESIGN_REVIEW.json'));
if(JSON.stringify(saved)!==JSON.stringify(report)||
 saved.totals.facadeUnits!==b49.totals.facadeUnitEdges||
 saved.buildings.length!==5||saved.totals.levels!==30||
 saved.totals.actualModulesEmitted!==0||saved.totals.actualDoors!==0||
 saved.totals.realRoofsPlaced!==0||saved.totals.runtimePlannerInvocations!==0||
 saved.totals.realComposeFacadeInvocations!==0||saved.totals.physicalConstructionOperations!==0||
 saved.readiness!=='NOT_PREPARED'||saved.deployment!=='BLOCKED'||
 saved.constructionApproved!==false||saved.executionAllowed!==false||
 saved.engineCalls!==0||saved.buildOperations!==0||saved.worldCoordinates!==null||
 saved.materialIds.length!==0||saved.BuildPlan.operations.length!==0||
 saved.BuildPlan.commandCount!==0||saved.blockers.M4Gates.length!==9||
 saved.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 saved.scope.transitionToDeployment!=='FORBIDDEN')fail('REPLAY_OR_SAFETY');
console.log('B50_PACKAGE_PASS',JSON.stringify({frozenB49:now.frozenB49FileCount,
 newB50SourceFiles:now.addedFileCount,checkedSourceFiles:included.size,
 buildings:saved.totals.buildings,levels:saved.totals.levels,
 facadeUnits:saved.totals.facadeUnits,displayOnlyBays:saved.totals.displayOnlyBays,
 blockedM4Gates:9,engineCalls:0,operations:0}));
