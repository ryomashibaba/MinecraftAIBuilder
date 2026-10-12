/** Verify immutable B29 original, all B30 payloads and deterministic recomputation. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildEngineBoundaryB30,validateEngineBoundaryB30,summarizeEngineBoundaryB30} from './runner/step8b-engine-boundary-b30.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(b,message)=>{if(!b)throw Error('B30_VERIFY_'+message)};
const orig=JSON.parse(fs.readFileSync(path.join(root,'B29_FILE_SHA256.json')));
const current=JSON.parse(fs.readFileSync(path.join(root,'B30_FILE_SHA256.json')));
check(orig.fileCount===526&&Object.keys(orig.files).length===526,'OLD_MANIFEST');
check(current.schema==='minecraftaibuilder-b30-engine-boundary-manifest-v1'&&current.fileCount===Object.keys(current.files).length,'MANIFEST');
const ensureFiles=(files,tag)=>{
 for(const [rel,digest] of Object.entries(files)){
  const p=path.join(root,rel);const s=fs.lstatSync(p);
  check(s.isFile()&&!s.isSymbolicLink()&&sha(fs.readFileSync(p))===digest,tag+'_'+rel);
 }
};
ensureFiles(orig.files,'B29_FROZEN');ensureFiles(current.files,'B30_CHANGED');
for(const [name,n] of [
 ['B30_NEW_TESTS.tap',38],
 ['B30_REGRESSION_step8b-m4-assembly-b29.tap',37],
 ['B30_REGRESSION_step8b-m4-real-evidence-b28.tap',28],
 ['B30_REGRESSION_step8b-m4-evidence-gate-b27.tap',32],
 ['B30_REGRESSION_step8b-m4-static-gate-b26.tap',40],
 ['B30_REGRESSION_step8b-m4-windows-assessment-b26.tap',18]
]){
 const log=fs.readFileSync(path.join(root,'qa',name),'utf8');
 check(log.includes('# tests '+n)&&log.includes('# pass '+n)&&log.includes('# fail 0')&&log.includes('# skipped 0'),'QA_'+name);
}
const report=buildEngineBoundaryB30(root);check(validateEngineBoundaryB30(report,root),'REPORT');
const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B30_ENGINE_BOUNDARY_REPORT.json')));
check(JSON.stringify(saved)===JSON.stringify(report),'REPRODUCIBILITY');
const sum=JSON.parse(fs.readFileSync(path.join(root,'reports/B30_SUMMARY.json')));
check(JSON.stringify(sum)===JSON.stringify(summarizeEngineBoundaryB30(report)),'SUMMARY');
const probe=JSON.parse(fs.readFileSync(path.join(root,'qa/B30_SNAPSHOT_INSPECTION.json')));
check(probe.matchedFileCount===9&&probe.runtimeIdentityAttested===false&&probe.plannerInvoked===false&&probe.constructionOperations===0,'PROBE');
check(report.totals.slabCutoutCandidateCells===50&&report.totals.operationsEmitted===0&&report.unresolvedCount===9,'SAFETY');
console.log('B30_VERIFY_PASS',JSON.stringify({frozenFiles:526,currentFiles:current.fileCount,tests:193,buildings:5,overlapCells:50,engineCalls:0,operations:0}));
