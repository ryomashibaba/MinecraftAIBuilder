/** Offline B27 checksum + frozen B26 verification. No network, game, or writes. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateB26M4} from './runner/step8b-m4-static-gate-b26.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const fail=x=>{throw Error('B27_PACKAGE_'+x)};
const hash=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(fs.readFileSync(path.join(root,'B26_FILE_SHA256.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'B27_FILE_SHA256.json'),'utf8'));
if(old.fileCount!==486||Object.keys(old.files).length!==486||
   manifest.schema!=='minecraftaibuilder-b27-m4-readonly-evidence-inventory-v1'||
   manifest.fileCount!==Object.keys(manifest.files).length||manifest.fileCount<486)fail('MANIFEST');
for(const [f,sha] of Object.entries(old.files)){
 const p=path.join(root,f);if(!fs.existsSync(p))fail('B26_MISSING_'+f);
 const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||hash(fs.readFileSync(p))!==sha)fail('B26_CHANGED_'+f);
}
for(const [f,sha] of Object.entries(manifest.files)){
 const p=path.join(root,f);if(!fs.existsSync(p))fail('B27_MISSING_'+f);
 const st=fs.lstatSync(p);if(!st.isFile()||st.isSymbolicLink()||hash(fs.readFileSync(p))!==sha)fail('B27_CHANGED_'+f);
}
const b26=JSON.parse(fs.readFileSync(path.join(root,'reports/B26_M4_READONLY_PREFLIGHT.json'),'utf8'));
if(!validateB26M4(b26,root)||b26.blockers.some(b=>b.confirmed!==false)||
   b26.BuildPlan.operations.length!==0)fail('GATE');
const checked=[['B27_NEW_GATE_32_PASS.tap',32],['B27_COLLECTOR_CONTRACT_12_PASS.tap',12],
 ['B27_B26_TARGETED_REGRESSION_58_PASS.tap',58],['B27_B25_REGRESSION_48_PASS.tap',48]];
for(const [f,n] of checked){let s=fs.readFileSync(path.join(root,'qa',f),'utf8');if(!s.includes('# tests '+n)||
   !s.includes('# pass '+n)||!s.includes('# fail 0')||!s.includes('# skipped 0'))fail('QA_'+f);}
console.log('B27_PACKAGE_VERIFY_PASS',JSON.stringify({frozenB26:old.fileCount,packageFiles:manifest.fileCount,
 offlineTests:150,blockers:9,gate:'BLOCKED',constructionOperations:0}));
