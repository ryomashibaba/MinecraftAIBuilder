/** Offline checkpoint verifier: B24 frozen inputs + B25 files + saved deterministic report. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildB25M3G,validateB25M3G,summarizeB25} from './runner/step8b-m3g-junction-compiler-b25.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const fail=s=>{throw Error('B25_CHECK_'+s)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const inv=JSON.parse(fs.readFileSync(path.join(root,'B25_FILE_SHA256.json')));
if(inv.schema!=='minecraftaibuilder-b25-m3g-inventory-v1'||inv.fileCount!==Object.keys(inv.files).length)fail('INVENTORY');
const b24=JSON.parse(fs.readFileSync(path.join(root,'B24_FILE_SHA256.json')));
if(b24.fileCount!==453||Object.keys(b24.files).length!==453)fail('B24_PIN');
for(const [k,v] of Object.entries(inv.files)){
 const p=path.join(root,k),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||sha(fs.readFileSync(p))!==v)fail('HASH_'+k);
}
for(const [k,v] of Object.entries(b24.files)){
 const p=path.join(root,k);
 if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==v)fail('FROZEN_CHANGE_'+k);
}
const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B25_JUNCTION_COMPILER_LEDGER.json')));
if(!validateB25M3G(saved,root))fail('REPORT');
const summary=JSON.parse(fs.readFileSync(path.join(root,'reports/B25_SUMMARY.json')));
if(JSON.stringify(summary)!==JSON.stringify(summarizeB25(saved)))fail('SUMMARY');
for (const [file,expected] of [['B25_NEW_TESTS.tap',48],['B25_REGRESSION_b21.tap',44],
 ['B25_REGRESSION_b24.tap',35],['B25_REGRESSION_b22_focused.tap',16],['B25_REGRESSION_b23_focused.tap',16]]){
 const t=fs.readFileSync(path.join(root,'qa',file),'utf8');
 if(!t.includes(`# tests ${expected}`)||!t.includes(`# pass ${expected}`)||
    !t.includes('# fail 0')||!t.includes('# skipped 0'))fail('QA_'+file);
}
if(saved.deploymentGate!=='BLOCKED'||saved.BuildPlan.status!=='NOT_PREPARED'||
 saved.BuildPlan.operations.length!==0||saved.BuildPlan.commandCount!==0)fail('DEPLOY');
console.log('B25_PACKAGE_VERIFY_PASS',JSON.stringify({frozenB24:b24.fileCount,b25Files:inv.fileCount,
 testsCompleted:159,sharedJunctions:saved.counts.sharedWallVoxels,
 sameRoomScope:saved.topology.SAME_ROOM_SCOPE,gate:saved.deploymentGate,operations:0}));
