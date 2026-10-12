/** B23 archive replay check, including every original B22 source byte. */
import fs from 'node:fs';import path from 'node:path';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {buildB23M3E,validateB23M3E,summarizeB23} from './runner/step8b-m3e-door-topology-b23.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B23_VERIFY_'+s);};
const read=x=>fs.readFileSync(path.join(root,x));
const json=x=>JSON.parse(read(x));
try{
 const baselineRel='docs/B22_ALL_ORIGINAL_FILE_SHA256_B23.json';
 if(sha(read(baselineRel))!=='792d889142204d0179dd239d51e73c51cafa860184eb974f639dbfb997c51f6e')fail('BASELINE_DIGEST');
 const baseline=json(baselineRel);
 if(baseline.fileCount!==429||Object.keys(baseline.files).length!==429)fail('BASELINE_COUNT');
 for(const [rel,hash] of Object.entries(baseline.files)){
  if(!/^[A-Za-z0-9_./-]+$/.test(rel)||rel.includes('..'))fail('BASELINE_PATH');
  const p=path.join(root,rel);
  if(!fs.existsSync(p)||!fs.lstatSync(p).isFile()||fs.lstatSync(p).isSymbolicLink()||sha(read(rel))!==hash)fail('FROZEN_CHANGED_'+rel);
 }
 const manifest=json('B23_FILE_SHA256.json'),actual=[];
 function visit(dir,sub=''){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=sub?`${sub}/${e.name}`:e.name,full=path.join(dir,e.name);
   if(e.isSymbolicLink())fail('SYMLINK');
   if(e.isDirectory())visit(full,rel);
   else if(e.isFile()&&!['B23_FILE_SHA256.json','verify-b23-package.mjs'].includes(rel))actual.push(rel);
   else if(!e.isFile())fail('SPECIAL_ENTRY');
  }
 }
 visit(root);actual.sort();
 if(manifest.schema!=='minecraftaibuilder-b23-inventory-v1'||manifest.fileCount!==actual.length||
   JSON.stringify(Object.keys(manifest.files).sort())!==JSON.stringify(actual))fail('INVENTORY_MISMATCH');
 for(const rel of actual){if(!/^[A-Za-z0-9_./-]+$/.test(rel)||rel.includes('..')||sha(read(rel))!==manifest.files[rel])fail('FILE_'+rel);}
 const report=json('reports/B23_M3E_DOOR_RELOCATION_REVIEW.json');
 validateB23M3E(report,root);
 const summary=json('reports/B23_SUMMARY.json');
 if(JSON.stringify(summary)!==JSON.stringify(summarizeB23(report)))fail('SUMMARY_REPLAY');
 if(report.counts.candidateRelocations!==118||report.counts.remainingConflictedPorts!==0||report.counts.remainingOverlapVoxelHits!==0||
    report.counts.physicalRepairs!==0||report.deploymentGate!=='BLOCKED'||report.BuildPlan.commandCount!==0)fail('UNSAFE_RESULT');
 for(const [name,n] of [['B23_NEW_TESTS.tap',34],['B23_REGRESSION_B21.tap',44],['B23_REGRESSION_B22.tap',30]]){
  const tap=read('qa/'+name).toString();
  for(const [key,val] of Object.entries({tests:n,pass:n,fail:0,skipped:0}))
   if(!new RegExp(`^# ${key} ${val}$`,'m').test(tap))fail('MISSING_TEST_EVIDENCE_'+name+'_'+key);
 }
 console.log('B23_PACKAGE_VERIFY_PASS',JSON.stringify({b22ImmutableFiles:429,packetFiles:manifest.fileCount,
  tests:108,relocatedDoorCandidates:118,remainingModeledVoxelOverlaps:0,physicalRepairs:0,gate:'BLOCKED',operations:0}));
}catch(e){console.error(e.stack||e.message);process.exitCode=1;}
