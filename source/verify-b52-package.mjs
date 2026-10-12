#!/usr/bin/env node
/** B52 append-only verification. No network, runtime or construction. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB52FromSource} from './parallel/b52/main/run-b52.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B52_PACKAGE_'+s)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||
  rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('UNSAFE_PATH');
 const name=path.join(ROOT,rel),stat=fs.lstatSync(name);
 if(!stat.isFile()||stat.isSymbolicLink())fail('NOT_A_FILE');
 return fs.readFileSync(name);
}
const old=JSON.parse(read('B51_FILE_SHA256.json'));
const now=JSON.parse(read('B52_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B51_FILE_SHA256.json':hash(read('B51_FILE_SHA256.json'))};
if(old.schema!=='minecraftaibuilder-b51-integrated-sha-v1'||old.frozenB50FileCount!==778||
 old.addedFileCount!==6||
 now.schema!=='minecraftaibuilder-b52-integrated-sha-v1'||
 now.originalB51ManifestSha256!==hash(read('B51_FILE_SHA256.json'))||
 now.frozenB51FileCount!==785||Object.keys(frozen).length!==785||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||
 now.addedFileCount!==6||Object.keys(now.addedFiles||{}).length!==6)fail('MANIFEST');
const seen=new Set(Object.keys(frozen));
for(const [p,sha] of Object.entries(frozen))if(hash(read(p))!==sha)fail('FROZEN_'+p);
for(const [p,sha] of Object.entries(now.addedFiles)){
 if(seen.has(p)||p==='B52_FILE_SHA256.json'||hash(read(p))!==sha)fail('NEW_'+p);
 seen.add(p);
}
seen.add('B52_FILE_SHA256.json');
function walk(root,prefix=''){
 for(const e of fs.readdirSync(root,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${e.name}`:e.name;
  if(e.isDirectory())walk(path.join(root,e.name),rel);
  else if(!e.isFile()||!seen.has(rel))fail('UNTRACKED_OR_SYMLINK_'+rel);
 }
}
walk(ROOT);
if(seen.size!==792)fail('FILE_COUNT');
const {report}=buildB52FromSource();
const saved=JSON.parse(read('parallel/b52/main/B52_ARCHITECTURE_PORTFOLIO.json'));
if(JSON.stringify(report)!==JSON.stringify(saved)||
 saved.totals.buildings!==5||saved.totals.levels!==30||saved.totals.facadeVisualEdges!==3022||
 saved.totals.entranceCandidates!==91||saved.totals.rooftop2DCandidates!==1464||
 saved.totals.designVariants!==15||saved.totals.distinctPreviewPairs!==11||
 saved.totals.facadeGraphicTransitions!==1807||
 saved.readiness!=='NOT_PREPARED'||saved.deployment!=='BLOCKED'||
 saved.constructionApproved!==false||saved.executionAllowed!==false||
 saved.worldCoordinates!==null||saved.materialIds.length!==0||
 saved.BuildPlan.operations.length!==0||saved.BuildPlan.commandCount!==0||
 saved.blockers.M4Gates.length!==9||saved.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 saved.engineCalls!==0||saved.minecraftCommands!==0||saved.scans!==0||saved.buildOperations!==0||
 saved.provenance.productionFacadeSourceAvailable!==false||
 saved.provenance.productionParity!=='UNVERIFIED')fail('REPORT_OR_SAFETY');
console.log('B52_PACKAGE_PASS',JSON.stringify({
 frozenB51:785,newSourceFiles:6,checkedSourceFiles:seen.size,
 buildings:saved.totals.buildings,levels:saved.totals.levels,
 entryOptions:saved.totals.entranceCandidates,roof2DOptions:saved.totals.rooftop2DCandidates,
 reviewedAlternatives:saved.totals.designVariants,distinctPairs:saved.totals.distinctPreviewPairs,
 M4GatesBlocked:9,constructionOperations:0}));
