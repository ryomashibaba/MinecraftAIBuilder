/** B35 offline package verifier; never calls engine/Bridge or creates BuildPlan operations. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyB34FrozenB35,buildCorridorReviewB35,validateCorridorReviewB35} from './runner/step8b-corridor-repair-b35.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const STOP=x=>{throw Error('B35_PACKAGE_'+x);};
const sha=x=>createHash('sha256').update(x).digest('hex');
if(verifyB34FrozenB35(root)!==590)STOP('B34_CHANGED');
const m=JSON.parse(fs.readFileSync(path.join(root,'B35_FILE_SHA256.json')));
if(m.schema!=='minecraftaibuilder-step8b-b35-manifest-v1'||m.fileCount!==Object.keys(m.files).length||m.fileCount!==602)STOP('MANIFEST_COUNT');
for(const [rel,expected] of Object.entries(m.files)){
 if(rel.startsWith('/')||rel.split('/').includes('..')||!/^[\w./-]+$/.test(rel)||!/^[a-f0-9]{64}$/.test(expected))STOP('MANIFEST_PATH');
 const p=path.join(root,rel),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||sha(fs.readFileSync(p))!==expected)STOP('HASH_'+rel);
}
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B35_CORRIDOR_REDESIGN_REPORT.json')));
validateCorridorReviewB35(report,root);
if(JSON.stringify(buildCorridorReviewB35(root))!==JSON.stringify(report))STOP('NONDETERMINISTIC');
const sums=report.totals;
if(sums.levelsReviewed!==5||sums.optionBExtraTerminalPrunes!==5||sums.originalRoomDoorPorts!==65||sums.optionBUnservedDoors!==0||sums.optionBAddedCells!==0||sums.approvedOptions!==0||sums.operationsEmitted!==0)STOP('COUNTS');
for(const [f,n] of [['B35_NEW_TESTS.tap',30],['B35_B34_REGRESSION.tap',34],['B35_B33_REGRESSION.tap',40]]){
 const s=fs.readFileSync(path.join(root,'qa',f),'utf8');
 if(!s.includes(`# tests ${n}`)||!s.includes(`# pass ${n}`)||!s.includes('# fail 0')||!s.includes('# skipped 0'))STOP('QA_'+f);
}
const summary=JSON.parse(fs.readFileSync(path.join(root,'reports/B35_SUMMARY.json')));
if(JSON.stringify(summary.totals)!==JSON.stringify(sums)||summary.approved!==false||summary.readiness!=='NOT_PREPARED'||summary.constructionCommands!==0)STOP('SUMMARY');
console.log('B35_PACKAGE_PASS',JSON.stringify({frozenB34Files:590,currentFiles:m.fileCount,testPass:104,...sums}));
