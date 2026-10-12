/** Deterministic checkpoint verifier, never imports actual planner/Bridge. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {verifyB32Frozen,buildEmitterFixtureB33,validateEmitterFixtureB33,summarizeEmitterFixtureB33} from './runner/step8b-emitter-fixture-b33.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const fail=x=>{throw Error('B33_PACKAGE_'+x)};
const sha=b=>createHash('sha256').update(b).digest('hex');
const original=verifyB32Frozen(root);
const m=JSON.parse(fs.readFileSync(path.join(root,'B33_FILE_SHA256.json')));
if(m.schema!=='minecraftaibuilder-step8b-b33-manifest-v1'||m.fileCount!==Object.keys(m.files).length)fail('COUNT');
for(const [rel,digest] of Object.entries(m.files)){
 if(path.isAbsolute(rel)||rel.split('/').includes('..')||! /^[a-f0-9]{64}$/.test(digest))fail('PATH');
 const p=path.join(root,rel),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||sha(fs.readFileSync(p))!==digest)fail('FILE_'+rel);
}
const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B33_RECTANGLE_EMITTER_LEDGER.json')));
if(!validateEmitterFixtureB33(saved,root)||JSON.stringify(saved)!==JSON.stringify(buildEmitterFixtureB33(root)))fail('REPORT');
if(JSON.stringify(summarizeEmitterFixtureB33(saved))!==JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'reports/B33_SUMMARY.json')))))fail('SUMMARY');
for(const [n,k] of [['B33_NEW_TESTS.tap',40],['B33_B31_B32_REGRESSION.tap',80]]){
 const t=fs.readFileSync(path.join(root,'qa',n),'utf8');
 if(!t.includes(`# tests ${k}`)||!t.includes(`# pass ${k}`)||!t.includes('# fail 0')||!t.includes('# skipped 0'))fail('QA_'+n);
}
if(saved.BuildPlan.operations.length!==0||saved.readiness!=='NOT_PREPARED'||saved.deployment!=='BLOCKED'||saved.totals.engineCalls!==0||saved.totals.operationsEmitted!==0)fail('SAFETY');
console.log('B33_VERIFY_PASS',JSON.stringify({B32FrozenFiles:original,packageFiles:m.fileCount,testsExecuted:120,...saved.totals,readiness:'NOT_PREPARED'}));
