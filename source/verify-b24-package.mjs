/** End-to-end B24 additive integrity, report replay and historical byte preservation. */
import fs from 'node:fs';import path from 'node:path';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {validateB24M3F,buildB24M3F,summarizeB24} from './runner/step8b-m3f-assembly-b24.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const err=x=>{throw Error('B24_VERIFY_'+x)};
const read=rel=>fs.readFileSync(path.join(root,rel));
const json=rel=>JSON.parse(read(rel));
try {
 const frozen=json('B23_FILE_SHA256.json');
 if(sha(read('B23_FILE_SHA256.json'))!=='aa2265ffe6423c091ff920060f564fda6ccdd90a7a5b11980aae01292749128c'||
    frozen.fileCount!==441||Object.keys(frozen.files).length!==441)err('FROZEN_MANIFEST_CHANGED');
 for(const [rel,digest] of Object.entries(frozen.files)){
  if(!/^[a-zA-Z0-9_./-]+$/.test(rel)||rel.includes('..'))err('BAD_FROZEN_PATH');
  const fp=path.join(root,rel),stat=fs.lstatSync(fp);
  if(!stat.isFile()||stat.isSymbolicLink()||sha(read(rel))!==digest)err('FROZEN_CHANGED_'+rel);
 }
 if(sha(read('verify-b23-package.mjs'))!=='c2366dcb4e7b1ac7f2aa4a9463f9924fec978b1a4d837665917007d43bd0a9ff')err('FROZEN_VERIFIER_CHANGED');
 const manifest=json('B24_FILE_SHA256.json'),actual=[];
 function visit(p='',sub=''){
  for(const entry of fs.readdirSync(path.join(root,p),{withFileTypes:true})){
   const rel=sub?`${sub}/${entry.name}`:entry.name,full=path.join(root,rel);
   if(entry.isSymbolicLink())err('SYMLINK');
   if(entry.isDirectory())visit(rel,rel);
   else if(entry.isFile()&&!['B24_FILE_SHA256.json','verify-b24-package.mjs'].includes(rel))actual.push(rel);
   else if(!entry.isFile())err('SPECIAL_FILE');
  }
 }
 visit();actual.sort();
 if(manifest.schema!=='minecraftaibuilder-b24-m3f-inventory-v1'||manifest.fileCount!==actual.length||
   JSON.stringify(Object.keys(manifest.files).sort())!==JSON.stringify(actual))err('INVENTORY');
 for(const rel of actual)if(!/^[a-zA-Z0-9_./-]+$/.test(rel)||rel.includes('..')||sha(read(rel))!==manifest.files[rel])err('HASH_'+rel);
 const r=json('reports/B24_M3F_ASSEMBLY_LEDGER.json');
 validateB24M3F(r,root);
 if(JSON.stringify(summarizeB24(r))!==JSON.stringify(json('reports/B24_SUMMARY.json')))err('SUMMARY');
 if(r.counts.candidateExcessOwnerClaims!==3990||r.counts.initialDoorWallVoxelHits!==236||
    r.counts.proposedDoorWallVoxelHits!==0||r.counts.slabCandidateCutoutCells!==50||r.deploymentGate!=='BLOCKED')err('EXPECTED_RESULT');
 for(const [name,n] of [['B24_M3F_NEW_35.tap',35],['B24_M3F_B22_B23_REGRESSION_64.tap',64],['B24_M3F_B21_REGRESSION_44.tap',44]]){
  const text=read('qa/'+name).toString();
  for(const [key,value] of Object.entries({tests:n,pass:n,fail:0,skipped:0}))
   if(!new RegExp(`^# ${key} ${value}$`,'m').test(text))err('QA_'+name+'_'+key);
 }
 console.log('B24_PACKAGE_VERIFY_PASS',JSON.stringify({b23OriginalFiles:frozen.fileCount+2,sourceInventoryFiles:manifest.fileCount,
   newB24Tests:35,relatedB21B22B23:108,totalRelevantTests:143,
   doorsRelocatedCandidate:118,sharedWallOwnerVoxels:3990,proposedStairCutCells:50,operations:0,gate:'BLOCKED'}));
}catch(e){console.error(e.stack??e.message);process.exitCode=1;}
