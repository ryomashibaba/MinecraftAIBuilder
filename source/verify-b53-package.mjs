#!/usr/bin/env node
/** B53 append-only source manifest and replay validation. Read-only, offline. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB53FromSource} from './parallel/b53/main/run-b53.mjs';
import {renderB53} from './parallel/b53/main/render-b53.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B53_PACKAGE_'+s)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||
  rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('UNSAFE_PATH');
 const full=path.join(ROOT,rel),stat=fs.lstatSync(full);
 if(!stat.isFile()||stat.isSymbolicLink())fail('NOT_A_FILE');return fs.readFileSync(full);
}
const old=JSON.parse(read('B52_FILE_SHA256.json'));
const now=JSON.parse(read('B53_FILE_SHA256.json'));
const frozen={...old.baselineFiles,...old.addedFiles,'B52_FILE_SHA256.json':hash(read('B52_FILE_SHA256.json'))};
if(old.schema!=='minecraftaibuilder-b52-integrated-sha-v1'||old.frozenB51FileCount!==785||
 old.addedFileCount!==6||Object.keys(frozen).length!==792||
 now.schema!=='minecraftaibuilder-b53-integrated-sha-v1'||
 now.originalB52ManifestSha256!==hash(read('B52_FILE_SHA256.json'))||
 now.frozenB52FileCount!==792||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||
 now.addedFileCount!==8||Object.keys(now.addedFiles||{}).length!==8)fail('MANIFEST');
const seen=new Set(Object.keys(frozen));
for(const [p,sha] of Object.entries(frozen))if(hash(read(p))!==sha)fail('FROZEN_'+p);
for(const [p,sha] of Object.entries(now.addedFiles)){
 if(seen.has(p)||p==='B53_FILE_SHA256.json'||hash(read(p))!==sha)fail('ADDED_'+p);seen.add(p);
}
seen.add('B53_FILE_SHA256.json');
function walk(root,prefix=''){
 for(const e of fs.readdirSync(root,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${e.name}`:e.name;
  if(e.isDirectory())walk(path.join(root,e.name),rel);
  else if(!e.isFile()||!seen.has(rel))fail('UNTRACKED_OR_LINK_'+rel);
 }
}
walk(ROOT);if(seen.size!==801)fail('SOURCE_COUNT_'+seen.size);
const {report}=buildB53FromSource();
const saved=JSON.parse(read('parallel/b53/main/B53_VISUAL_REVIEW.json'));
if(JSON.stringify(report)!==JSON.stringify(saved)||
 read('parallel/b53/main/B53_VISUAL_REVIEW.html').toString()!==renderB53(report)||
 report.totals.buildings!==5||report.totals.levels!==30||
 report.totals.facadeVisualEdges!==3022||report.totals.originalGraphicTransitions!==1807||
 report.totals.designVariants!==15||report.totals.physicalConstructionOperations!==0||
 report.readiness!=='NOT_PREPARED'||report.deployment!=='BLOCKED'||
 report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 report.executionAllowed!==false||report.BuildPlan.operations.length!==0||
 report.engineCalls!==0||report.minecraftCommands!==0||report.scans!==0||report.buildOperations!==0||
 report.provenance.productionParity!=='UNVERIFIED')fail('REPLAY_OR_SAFETY');
console.log('B53_PACKAGE_PASS',JSON.stringify({frozenB52:792,newSourceFiles:8,checkedSourceFiles:seen.size,
 buildings:report.totals.buildings,levels:report.totals.levels,facadeGraphicMarkers:report.totals.facadeVisualEdges,
 floorCells:report.totals.floorCells,roofCells:report.totals.roofCells,
 visualTransitionBefore:report.totals.originalGraphicTransitions,
 visualTransitionPreview:report.totals.previewGraphicTransitions,
 displayOnlyCellsSuggested:report.totals.isolatedGraphicCellsSuggested,M4GatesBlocked:9,worldOperations:0}));
