/** B17 manifest and immutable-original verifier. Recomputes no game operations. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {compileB17IR,validateB17IR,summarizeB17} from './runner/step8b-integration-ir-b17.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=k=>{throw Error('B17_VERIFY_'+k)};
try{
 const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/B16_ORIGINAL_FILE_SHA256_B17.json'),'utf8'));
 if(baseline.schema!=='minecraftaibuilder-b17-b16-immutable-source-v1'||baseline.fileCount!==358||Object.keys(baseline.files).length!==baseline.fileCount)fail('BASELINE_MANIFEST');
 for(const [rel,digest] of Object.entries(baseline.files)){
  const full=path.join(root,rel);if(rel.includes('..')||path.isAbsolute(rel)||!fs.existsSync(full)||fs.lstatSync(full).isSymbolicLink()||sha(fs.readFileSync(full))!==digest)fail('ORIGINAL_CHANGED_'+rel);
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B17_FILE_SHA256.json'),'utf8'));
 const list=[];
 function walk(folder,base=''){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const rel=base?base+'/'+entry.name:entry.name;const full=path.join(folder,entry.name);
  if(fs.lstatSync(full).isSymbolicLink())fail('SYMLINK_'+rel);
  if(entry.isDirectory())walk(full,rel);
  else if(entry.isFile()&&!['B17_FILE_SHA256.json','verify-b17-package.mjs'].includes(rel))list.push(rel);
  else if(!entry.isFile())fail('INVALID_'+rel);
 }}walk(root);list.sort();
 if(list.length!==manifest.fileCount||JSON.stringify(list)!==JSON.stringify(Object.keys(manifest.files).sort()))fail('FILE_SET');
 for(const rel of list){if(!/^[a-zA-Z0-9_.\/-]+$/.test(rel)||sha(fs.readFileSync(path.join(root,rel)))!==manifest.files[rel])fail('FILE_HASH_'+rel)}
 const saved=JSON.parse(fs.readFileSync(path.join(root,'reports/B17_INTERIOR_INTEGRATION_IR.json'),'utf8'));
 if(saved?.provenance?.snapshotSignals?.sourceHashState!=='FIVE_PINNED_SOURCE_FILES_MATCH'||saved.provenance.snapshotSignals.verifiedFiles!==5)fail('WINDOWS_PIN_EVIDENCE');
 // Stored report generated with explicit pinned snapshot; same schematic data must be reproduced
 // without snapshot signal, not silently upgrade a pinned source check to runtime verification.
 const neutral=structuredClone(saved),neutralSummary=neutral.provenance.snapshotSignals;
 neutral.provenance.snapshotSignals={sourceHashState:'PINNED_HISTORICAL_ONLY',inspectedNow:false,plannerScope:'NOT_EXECUTED',verifiedFiles:0};
 delete neutral.reportSha256;neutral.reportSha256=sha(Buffer.from(JSON.stringify(neutral)));
 validateB17IR(neutral,root);
 const reportSummary=JSON.parse(fs.readFileSync(path.join(root,'reports/B17_READINESS_SUMMARY.json'),'utf8'));
 if(JSON.stringify(reportSummary)!==JSON.stringify(summarizeB17(saved)))fail('SUMMARY_CHANGED');
 for(const [f,n] of [['B17_NEW_TESTS.tap',20],['B17_B14_RELEVANT_REGRESSION.tap',23],['B17_B16_FOCUSED_REGRESSION.tap',3]]){
  const content=fs.readFileSync(path.join(root,'qa',f),'utf8');if(!content.includes(`# tests ${n}\n`)||!content.includes(`# pass ${n}\n`)||!content.includes('# fail 0\n'))fail('QA_LOG_'+f);
 }
 if(saved.BuildPlan?.status!=='NOT_PREPARED'||saved.BuildPlan?.operations?.length||saved.deploymentGate!=='BLOCKED')fail('UNSAFE_REPORT');
 console.log('B17_PACKAGE_PASS',JSON.stringify({immutableB16Files:baseline.fileCount,shaVerifiedFiles:manifest.fileCount,focusedQAPass:46,sourcePinnedFiles:5,gate:'BLOCKED',operations:0}));
}catch(e){console.error('B17_PACKAGE_FAIL',e.message);process.exitCode=1}
