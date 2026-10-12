/** B34 checkpoint integrity verifier: NEVER loads running engine. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {verifyB33CheckpointB34,buildShaftReviewB34,validateShaftReviewB34} from './runner/step8b-shaft-access-b34.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const deny=x=>{throw Error('B34_PACKAGE_'+x)};
const prev=verifyB33CheckpointB34(root);
const m=JSON.parse(fs.readFileSync(path.join(root,'B34_FILE_SHA256.json')));
if(m.schema!=='minecraftaibuilder-step8b-b34-manifest-v1'||m.fileCount!==Object.keys(m.files).length||m.fileCount<prev)deny('MANIFEST_COUNT');
for(const [rel,digest] of Object.entries(m.files)){
 if(rel.startsWith('/')||rel.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(digest))deny('INVALID_PATH');
 const p=path.join(root,rel),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||sha(fs.readFileSync(p))!==digest)deny('CHANGED_'+rel);
}
const r=JSON.parse(fs.readFileSync(path.join(root,'reports/B34_SHAFT_ACCESS_REPORT.json')));
validateShaftReviewB34(r,root);
if(JSON.stringify(r)!==JSON.stringify(buildShaftReviewB34(root)))deny('REPORT_NONDETERMINISTIC');
for(const [f,tests] of [['B34_NEW_TESTS.tap',34],['B34_B33_REGRESSION.tap',40],['B34_B31_B32_REGRESSION.tap',80]]){
 const s=fs.readFileSync(path.join(root,'qa',f),'utf8');
 if(!s.includes(`# tests ${tests}`)||!s.includes(`# pass ${tests}`)||!s.includes('# fail 0')||!s.includes('# skipped 0'))deny('TEST_EVIDENCE_'+f);
}
if(r.reviews.some(v=>v.approved||v.autoSelected||v.applied)||r.BuildPlan.operations.length||r.readiness!=='NOT_PREPARED')deny('SAFETY');
console.log('B34_PACKAGE_PASS',JSON.stringify({priorFrozenFiles:prev,B34Files:m.fileCount,qaPass:154,...r.totals}));
