/** B29 standalone integrity validation. Read-only. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {buildAssemblyB29,validateAssemblyB29} from './runner/step8b-m4-assembly-contract-b29.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=v=>createHash('sha256').update(v).digest('hex');
const fail=s=>{throw Error('B29_VERIFY_'+s);};
const previous=JSON.parse(fs.readFileSync(path.join(root,'B28_FILE_SHA256.json')));
const current=JSON.parse(fs.readFileSync(path.join(root,'B29_FILE_SHA256.json')));
if(previous.schema!=='minecraftaibuilder-b28-m4-real-windows-evidence-manifest-v1'||previous.fileCount!==511||
 current.schema!=='minecraftaibuilder-b29-m3-m4-offline-assembly-manifest-v1'||
 current.fileCount!==Object.keys(current.files).length||current.fileCount<=511)fail('MANIFEST');
for(const [name,digest] of Object.entries(previous.files)){
 const file=path.join(root,name);if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||
 fs.lstatSync(file).isSymbolicLink()||sha(fs.readFileSync(file))!==digest)fail('B28_FROZEN_CHANGED_'+name);
}
for(const [name,digest] of Object.entries(current.files)){
 const file=path.join(root,name);if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||
 fs.lstatSync(file).isSymbolicLink()||sha(fs.readFileSync(file))!==digest)fail('B29_CHANGED_'+name);
}
for(const [name,n] of [
 ['B29_NEW_TESTS.tap',37],
 ['B29_REGRESSION_step8b-m4-real-evidence-b28.tap',28],
 ['B29_REGRESSION_step8b-m4-evidence-gate-b27.tap',32],
 ['B29_REGRESSION_step8b-m4-static-gate-b26.tap',40],
 ['B29_REGRESSION_step8b-m4-windows-assessment-b26.tap',18]]){
 const log=fs.readFileSync(path.join(root,'qa',name),'utf8');
 if(!log.includes('# tests '+n)||!log.includes('# pass '+n)||!log.includes('# fail 0')||!log.includes('# skipped 0'))fail('TEST_LOG_'+name);
}
const generated=buildAssemblyB29(root);
if(!validateAssemblyB29(generated,root))fail('ASSEMBLY');
const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B29_M3_M4_ASSEMBLY_IR.json')));
if(sha(Buffer.from(JSON.stringify(saved)))!==sha(Buffer.from(JSON.stringify(generated))))fail('ASSEMBLY_REPLAY');
const summary=JSON.parse(fs.readFileSync(path.join(root,'reports/B29_SUMMARY.json')));
if(summary.reportSha256!==generated.reportSha256||summary.totals?.doorPorts!==314||
 summary.totals?.commandsEmitted!==0||summary.unresolvedGates?.length!==9||
 summary.BuildPlan?.operations?.length!==0)fail('SUMMARY');
console.log('B29_VERIFY_PASS',JSON.stringify({frozenFiles:511,currentFiles:current.fileCount,tests:155,
 buildings:5,floors:30,doorPorts:314,blocked:9,operations:0}));
