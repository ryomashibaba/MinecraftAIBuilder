/** Entire B22 packet inventory + B21 byte-level immutable baseline + report replay. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildB22M3D,validateB22M3D} from './runner/step8b-m3d-contract-b22.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const fail=x=>{throw Error(`B22_VERIFY_${x}`)};
try{
 const old=json('B21_FILE_SHA256.json');
 if(old.fileCount!==415||Object.keys(old.files).length!==415)fail('B21_MANIFEST_COUNT');
 for(const [rel,h] of Object.entries(old.files)){
   if(!/^[A-Za-z0-9_./-]+$/.test(rel)||rel.includes('..'))fail('BAD_PATH');
   const file=path.join(root,rel);
   if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||sha(read(rel))!==h)fail(`FROZEN_CHANGED_${rel}`);
 }
 const manifest=json('B22_FILE_SHA256.json');const actual=[];
 function walk(d,base=''){
  for(const ent of fs.readdirSync(d,{withFileTypes:true})){
   const rel=base?`${base}/${ent.name}`:ent.name,full=path.join(d,ent.name);
   if(fs.lstatSync(full).isSymbolicLink())fail('SYMLINK');
   if(ent.isDirectory())walk(full,rel);
   else if(ent.isFile()&&!['B22_FILE_SHA256.json','verify-b22-package.mjs'].includes(rel))actual.push(rel);
   else if(!ent.isFile())fail('SPECIAL');
  }
 }
 walk(root);actual.sort();
 if(manifest.schema!=='minecraftaibuilder-b22-manifest-v1'||manifest.fileCount!==actual.length||
    JSON.stringify(Object.keys(manifest.files).sort())!==JSON.stringify(actual))fail('INVENTORY');
 for(const rel of actual){if(!/^[A-Za-z0-9_./-]+$/.test(rel)||rel.includes('..')||sha(read(rel))!==manifest.files[rel])fail(`DIGEST_${rel}`);}
 const report=json('reports/B22_M3D_READONLY_REPORT.json');
 if(!validateB22M3D(report,root)||JSON.stringify(report)!==JSON.stringify(buildB22M3D(root)))fail('REPORT_REPLAY');
 const summary=json('reports/B22_SUMMARY.json');
 if(summary.counts.originalConflictedDoorPorts!==118||summary.counts.candidateSideMoves!==0||summary.counts.conditionalReliefVoxelCount!==236||
    summary.BuildPlan.commandCount!==0||summary.deploymentGate!=='BLOCKED')fail('UNSAFE_SUMMARY');
 for(const [p,n] of [['qa/B22_NEW_TESTS.tap',30],['qa/B22_REGRESSION_B21.tap',44]]){
  const s=fs.readFileSync(path.join(root,p),'utf8');
  for(const [k,v] of Object.entries({tests:n,pass:n,fail:0,skipped:0}))if(!new RegExp(`^# ${k} ${v}$`,'m').test(s))fail(`QA_${p}_${k}`);
 }
 console.log('B22_PACKAGE_VERIFY_PASS',JSON.stringify({originalFileCount:415,packetFileCount:actual.length,
   b22Tests:30,b21Regression:44,approvedRepairs:0,gate:'BLOCKED',operations:0}));
}catch(e){console.error(e.message);process.exitCode=1;}
