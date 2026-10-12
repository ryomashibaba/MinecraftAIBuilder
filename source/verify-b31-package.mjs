/** B31 checkpoint integrity + deterministic output check; no engine or bridge import. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {buildFloorDoorOverlayB31,validateFloorDoorOverlayB31,summarizeFloorDoorOverlayB31} from './runner/step8b-floor-door-overlay-b31.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const ok=(cond,code)=>{if(!cond)throw Error('B31_VERIFY_'+code)};
for(const [manifestName,count] of [['B30_FILE_SHA256.json',542],['B31_FILE_SHA256.json',null]]){
 const m=JSON.parse(fs.readFileSync(path.join(root,manifestName)));
 ok(Object.keys(m.files).length===m.fileCount&&(!count||m.fileCount===count),'MANIFEST_COUNT');
 for(const [rel,hash] of Object.entries(m.files)){
  ok(!rel.split('/').includes('..')&&!path.isAbsolute(rel),'MANIFEST_PATH');
  const p=path.join(root,rel);const st=fs.lstatSync(p);
  ok(st.isFile()&&!st.isSymbolicLink()&&sha(fs.readFileSync(p))===hash,'FILE_'+rel);
 }
}
const report=buildFloorDoorOverlayB31(root);
ok(validateFloorDoorOverlayB31(report,root),'REPORT');
const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B31_FLOOR_DOOR_OVERLAY.json')));
ok(JSON.stringify(saved)===JSON.stringify(report),'REPRODUCE');
const summary=JSON.parse(fs.readFileSync(path.join(root,'reports/B31_SUMMARY.json')));
ok(JSON.stringify(summary)===JSON.stringify(summarizeFloorDoorOverlayB31(report)),'SUMMARY');
for(const [name,count] of [['B31_NEW_TESTS.tap',41],['B31_B29_B30_RELATED_REGRESSION.tap',75]]){
 const t=fs.readFileSync(path.join(root,'qa',name),'utf8');
 ok(t.includes(`# tests ${count}`)&&t.includes(`# pass ${count}`)&&t.includes('# fail 0')&&t.includes('# skipped 0'),'TESTLOG_'+name);
}
ok(report.totals.proposedCutoutCells===50&&report.totals.doorPorts===314&&
 report.totals.engineCalls===0&&report.totals.operationsEmitted===0&&
 report.BuildPlan.operations.length===0&&report.safety.constructionApproved===false&&report.blockers.length===9,'SAFETY');
console.log('B31_VERIFY_PASS',JSON.stringify({previousFrozen:542,checkedCurrent:JSON.parse(fs.readFileSync(path.join(root,'B31_FILE_SHA256.json'))).fileCount,tests:116,originalFloorCells:12778,proposedCutouts:50,doorPorts:314,engineCalls:0,operations:0}));
