/** Offline integrity verifier. No changes to user worlds or previous files. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B28_VERIFY_'+x);};
const old=JSON.parse(fs.readFileSync(path.join(root,'B27_FILE_SHA256.json')));
const current=JSON.parse(fs.readFileSync(path.join(root,'B28_FILE_SHA256.json')));
if(old.fileCount!==499||Object.keys(old.files).length!==499||
 current.schema!=='minecraftaibuilder-b28-m4-real-windows-evidence-manifest-v1'||
 current.fileCount!==Object.keys(current.files).length||current.fileCount<=499)fail('MANIFEST');
for(const [name,digest] of Object.entries(old.files)){
 const file=path.join(root,name);
 if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||sha(fs.readFileSync(file))!==digest)fail('B27_ORIGINAL_CHANGED:'+name);
}
for(const [name,digest] of Object.entries(current.files)){
 const file=path.join(root,name);
 if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||sha(fs.readFileSync(file))!==digest)fail('B28_PACKAGE_CHANGED:'+name);
}
for(const [f,n] of [['B28_NEW_28_PASS.tap',28],['B28_B26_B27_TARGETED_102_PASS.tap',102]]){
 const content=fs.readFileSync(path.join(root,'qa',f),'utf8');
 if(!content.includes('# tests '+n)||!content.includes('# pass '+n)||!content.includes('# fail 0')||!content.includes('# skipped 0'))fail('QA:'+f);
}
const a=JSON.parse(fs.readFileSync(path.join(root,'reports/B28_REAL_WINDOWS_RECONCILIATION.json')));
if(a.schema!=='minecraftaibuilder-step8b-b28-real-evidence-reconciliation-v1'||
 a.disk.matched!==9||a.remainingBlockers!==9||a.archivedCatalog.archivedVerified!==827||
 a.BuildPlan.operations.length!==0||a.BuildPlan.commandCount!==0||a.safety.constructionApproved!==false)fail('GATE');
console.log('B28_PACKAGE_VERIFY_PASS',JSON.stringify({frozenB27:499,files:current.fileCount,tests:130,blockers:9,commands:0}));
