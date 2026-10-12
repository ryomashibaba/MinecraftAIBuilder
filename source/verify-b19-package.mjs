/** Checks original B18 immutability, B19 file inventory, QA and offline report reproducibility. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {buildM3ReadOnlyAdapter} from './runner/step8b-planner-contract-m3.mjs';
import {M3_SOURCE_SHA256} from './runner/step8b-planner-contract-m3.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const die=t=>{throw Error('M3_PACKAGE_'+t)};
const fileHash=rel=>hash(fs.readFileSync(path.join(root,rel)));
const json=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const sealed='B18_FILE_SHA256.json';
const originalManifestHash='d68cdb799375689d17e83982953906470f1171d91e22d2f49da77dfd297e2820';
const originalVerifierHash='9e60ca29e44de6ad4026c2a303a8fd22557e62ad07923a3377553c95e395901f';
try{
 if(fileHash(sealed)!==originalManifestHash||fileHash('verify-b18-package.mjs')!==originalVerifierHash)die('B18_CORE_CHANGED');
 const original=json(sealed);
 if(original.schema!=='minecraftaibuilder-b18-file-sha256-v1'||original.fileCount!==379||Object.keys(original.files).length!==379)die('B18_MANIFEST');
 for(const [rel,expected] of Object.entries(original.files)){
  if(!/^[A-Za-z0-9_.\/-]+$/.test(rel)||rel.includes('..')||fileHash(rel)!==expected)die('B18_ORIGINAL_CHANGED_'+rel);
 }
 const current=json('B19_FILE_SHA256.json');const files=[];
 function scan(dir,base=''){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=base?base+'/'+ent.name:ent.name,full=path.join(dir,ent.name);
   if(fs.lstatSync(full).isSymbolicLink())die('SYMLINK_'+rel);
   if(ent.isDirectory())scan(full,rel);
   else if(ent.isFile()&&!['B19_FILE_SHA256.json','verify-b19-package.mjs'].includes(rel))files.push(rel);
   else if(!ent.isFile())die('NONFILE_'+rel);
  }
 }
 scan(root);files.sort();
 if(current.schema!=='minecraftaibuilder-b19-m3-file-sha256-v1'||current.fileCount!==files.length||
  JSON.stringify(Object.keys(current.files).sort())!==JSON.stringify(files))die('INVENTORY');
 for(const rel of files)if(!/^[A-Za-z0-9_.\/-]+$/.test(rel)||rel.includes('..')||fileHash(rel)!==current.files[rel])die('HASH_'+rel);
 const saved=json('reports/B19_M3_READONLY_ADAPTER.json'),summary=json('reports/B19_M3_SUMMARY.json');
 const evidence=json('qa/B19_M3_SOURCE_ATTESTATION.json');const {reportSha256:attHash,...attFields}=evidence;
 if(hash(JSON.stringify(attFields))!==attHash||evidence.sourceVerification!=='PINNED_DISK_SOURCE_MATCH'||
  JSON.stringify(evidence.sourceHashMatches)!==JSON.stringify(M3_SOURCE_SHA256)||evidence.buildOperations!==0||
  evidence.bridgeContact!==false||evidence.engineExecuted!==false)die('SOURCE_ATTESTATION');
 const {reportSha256,...reportFields}=saved;if(hash(JSON.stringify(reportFields))!==reportSha256)die('REPORT_DIGEST');
 const expected=buildM3ReadOnlyAdapter(root);
 expected.provenance.sourceVerification='PINNED_DISK_SOURCE_MATCH';expected.sourceSnapshotReadOnly=true;
 const {reportSha256:old,...expectedFields}=expected;expected.reportSha256=hash(JSON.stringify(expectedFields));
 if(JSON.stringify(expected)!==JSON.stringify(saved))die('REPORT_REPLAY');
 if(JSON.stringify(summary.counts)!==JSON.stringify(saved.counts)||summary.deploymentGate!=='BLOCKED'||
  summary.BuildPlan?.status!=='NOT_PREPARED'||summary.BuildPlan?.operations?.length!==0||summary.BuildPlan?.commandCount!==0||
  saved.deploymentGate!=='BLOCKED'||saved.BuildPlan?.operations?.length!==0||saved.BuildPlan?.commandCount!==0||
  saved.blockers?.some(b=>b.status!=='BLOCKED'))die('SAFETY_OR_SUMMARY');
 for(const [rel,tests] of [['qa/B19_M3_NEW_TESTS.tap',26],['qa/B19_M2_REGRESSION.tap',35]]){
  const tap=fs.readFileSync(path.join(root,rel),'utf8');
  for(const [k,v] of [['tests',tests],['pass',tests],['fail',0],['skipped',0]]){
   if(!new RegExp('^# '+k+' '+v+'$', 'm').test(tap))die('QA_'+rel+'_'+k);
  }
 }
 console.log('M3_B19_PACKAGE_VERIFY_PASS',JSON.stringify({immutableB18Source:381,packageFiles:files.length,
  newTests:26,b18Regression:35,sourceHashes:7,gate:'BLOCKED',operations:0}));
}catch(e){console.error('M3_B19_PACKAGE_VERIFY_FAIL',e.message);process.exitCode=1}
