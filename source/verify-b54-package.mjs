#!/usr/bin/env node
/** B54 strict append-only package verifier: 801 frozen B53 sources + 8 added + manifest. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB54FromSource} from './parallel/b54/main/run-b54.mjs';
import {renderB54} from './parallel/b54/main/render-b54.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B54_PACKAGE_'+x)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||
  rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('PATH');
 const p=path.join(ROOT,rel),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink())fail('UNSAFE_FILE');
 return fs.readFileSync(p);
}
const old=JSON.parse(read('B53_FILE_SHA256.json'));
const now=JSON.parse(read('B54_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B53_FILE_SHA256.json':sha(read('B53_FILE_SHA256.json'))};
if(old.schema!=='minecraftaibuilder-b53-integrated-sha-v1'||Object.keys(frozen).length!==801||
 now.schema!=='minecraftaibuilder-b54-integrated-sha-v1'||now.frozenB53FileCount!==801||
 now.originalB53ManifestSha256!==sha(read('B53_FILE_SHA256.json'))||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||now.addedFileCount!==8||
 Object.keys(now.addedFiles||{}).length!==8)fail('MANIFEST');
const seen=new Set();
for(const [p,h] of Object.entries({...frozen,...now.addedFiles})){
 if(seen.has(p)||p==='B54_FILE_SHA256.json'||sha(read(p))!==h)fail('HASH_'+p);
 seen.add(p);
}
seen.add('B54_FILE_SHA256.json');
function walk(dir,prefix=''){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${e.name}`:e.name;
  if(e.isDirectory())walk(path.join(dir,e.name),rel);
  else if(!e.isFile()||!seen.has(rel))fail('UNTRACKED_OR_SYMLINK_'+rel);
 }
}
walk(ROOT);
if(seen.size!==810)fail('COUNT_'+seen.size);
const {report}=buildB54FromSource();
if(JSON.stringify(report)!==JSON.stringify(JSON.parse(read('parallel/b54/main/B54_DECISION_DOSSIER.json')))||
 renderB54(report)!==read('parallel/b54/main/B54_DECISION_DOSSIER.html').toString()||
 report.totals.buildings!==5||report.totals.levels!==30||
 report.totals.designProfiles!==15||report.totals.distinctLocalPlacementPairs!==11||
 report.totals.facadeVisualUnits!==3022||report.totals.physicalConstructionOperations!==0||
 report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||report.executionAllowed!==false||
 report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 report.BuildPlan.operations.length!==0||report.engineCalls!==0||report.scans!==0||
 report.sourcePreflight.productionFacadeParity!=='UNVERIFIED')fail('REPLAY_OR_SAFETY');
console.log('B54_PACKAGE_PASS',JSON.stringify({frozenB53:801,addedFiles:8,checkedSourceFiles:seen.size,
  buildings:report.totals.buildings,levels:report.totals.levels,designVariants:report.totals.designProfiles,
  distinctLocalPlacementPairs:report.totals.distinctLocalPlacementPairs,
  entryDisplayOverlaps:report.totals.entryVisualOverlapProfiles,roofLowBuffer:report.totals.roofLowBufferProfiles,
  M4Blocked:9,constructionOperations:0}));
