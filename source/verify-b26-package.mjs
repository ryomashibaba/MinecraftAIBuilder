/** B26 checkpoint integrity verifier (no writes, no world). */
import fs from 'node:fs';import path from 'node:path';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {validateB26M4} from './runner/step8b-m4-static-gate-b26.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B26_VERIFY_'+x)};
const b25=JSON.parse(fs.readFileSync(path.join(root,'B25_FILE_SHA256.json')));
const b26=JSON.parse(fs.readFileSync(path.join(root,'B26_FILE_SHA256.json')));
if(b25.fileCount!==469||Object.keys(b25.files).length!==469||
 b26.schema!=='minecraftaibuilder-b26-m4-inventory-v1'||b26.fileCount!==Object.keys(b26.files).length)fail('MANIFEST_SCHEMA');
for(const [name,digest] of Object.entries(b25.files)){
 const p=path.join(root,name);const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||hash(fs.readFileSync(p))!==digest)fail('B25_MODIFIED_'+name);
}
for(const [name,digest] of Object.entries(b26.files)){
 const p=path.join(root,name);const st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||hash(fs.readFileSync(p))!==digest)fail('B26_CHANGED_'+name);
}
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B26_M4_READONLY_PREFLIGHT.json')));
if(!validateB26M4(report,root))fail('REPORT');
for(const [file,count] of [['B26_NEW_TESTS.tap',40],['B26_ASSESSMENT_TESTS.tap',18],['B26_B25_TARGETED_REGRESSION.tap',48]]){
 const s=fs.readFileSync(path.join(root,'qa',file),'utf8');
 if(!s.includes('# tests '+count)||!s.includes('# pass '+count)||!s.includes('# fail 0')||!s.includes('# skipped 0'))fail('QA_'+file);
}
if(report.blockers.length!==9||report.BuildPlan.operations.length!==0||report.BuildPlan.commandCount!==0)fail('BLOCK');
console.log('B26_PACKAGE_VERIFY_PASS',JSON.stringify({frozenB25:b25.fileCount,b26Files:b26.fileCount,b26Tests:58,b25Tests:48,gate:report.gate.deployment,operations:0}));
