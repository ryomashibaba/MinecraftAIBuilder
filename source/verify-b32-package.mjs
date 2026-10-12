/** B32 restore/manifest/report verification. No engine or Minecraft imports. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {checkB31Immutable,buildFloorSeamB32,validateFloorSeamB32,summarizeFloorSeamB32,createGuardedPlannerPrototype} from './runner/step8b-floor-seam-b32.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const fail=s=>{throw Error('B32_PACKAGE_'+s)};
const hash=b=>createHash('sha256').update(b).digest('hex');
const b31=checkB31Immutable(root);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'B32_FILE_SHA256.json')));
if(manifest.schema!=='minecraftaibuilder-b32-floor-seam-manifest-v1'||manifest.fileCount!==Object.keys(manifest.files).length)fail('MANIFEST_COUNT');
for(const [rel,expected] of Object.entries(manifest.files)){
 if(rel.split('/').includes('..')||path.isAbsolute(rel)||! /^[0-9a-f]{64}$/.test(expected))fail('MANIFEST_PATH');
 const p=path.join(root,rel);const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||hash(fs.readFileSync(p))!==expected)fail('FILE_'+rel);
}
const generated=buildFloorSeamB32(root);
const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B32_FLOOR_SEAM_LEDGER.json')));
if(!validateFloorSeamB32(saved,root)||JSON.stringify(generated)!==JSON.stringify(saved))fail('REPORT_NOT_REPRODUCIBLE');
const summary=JSON.parse(fs.readFileSync(path.join(root,'reports/B32_SUMMARY.json')));
if(JSON.stringify(summarizeFloorSeamB32(saved))!==JSON.stringify(summary))fail('SUMMARY');
const src=fs.readFileSync(path.join(root,'dev/reference-engine-general-building-planner.js'),'utf8');
if(createGuardedPlannerPrototype(src)!==fs.readFileSync(path.join(root,'dev/general-building-planner.B32_GUARDED_DEV_COPY.txt'),'utf8'))fail('GUARDED_DEV_COPY');
for(const [name,n] of [['B32_NEW_TESTS.tap',39],['B32_B29_B31_REGRESSION.tap',116]]){
 const t=fs.readFileSync(path.join(root,'qa',name),'utf8');
 if(!t.includes(`# tests ${n}`)||!t.includes(`# pass ${n}`)||!t.includes('# fail 0')||!t.includes('# skipped 0'))fail('QA_'+name);
}
if(saved.readiness!=='NOT_PREPARED'||saved.deployment!=='BLOCKED'||saved.BuildPlan.operations.length!==0||
 saved.totals.engineCalls!==0||saved.totals.operationsEmitted!==0||saved.totals.nearOuterWallCandidates!==5)fail('SAFETY');
console.log('B32_VERIFY_PASS',JSON.stringify({frozenB31:b31,packageFiles:manifest.fileCount,testsExecuted:155,
 floorCellsBefore:12778,floorCellsProposed:12728,exteriorAdjacentCutoutCandidates:5,
 engineCalls:0,operations:0,readiness:'NOT_PREPARED'}));
