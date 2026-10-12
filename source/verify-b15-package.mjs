// Fail-closed offline verifier for B15; never touches Minecraft or any production code.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {validateB15Report} from './runner/step8b-virtual-volume-b15.mjs';
import {renderB15Html} from './runner/step8b-visual-b15.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
function fail(msg){throw Error('B15_PACKAGE_'+msg)}
try{
 const original=JSON.parse(fs.readFileSync(path.join(root,'docs/B14_ORIGINAL_FILE_SHA256_B15.json'),'utf8'));
 if(original.schema!=='minecraftaibuilder-b15-b14-original-v1'||original.fileCount!==279||Object.keys(original.files).length!==279)fail('ORIGINAL_SCHEMA');
 for(const [rel,h] of Object.entries(original.files)){
  if(rel.includes('..')||rel.startsWith('/')||!/^[a-f0-9]{64}$/.test(h)||!fs.existsSync(path.join(root,rel))||sha(fs.readFileSync(path.join(root,rel)))!==h)fail('B14_ORIGINAL_CHANGED_'+rel);
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B15_FILE_SHA256.json'),'utf8'));
 if(manifest.schema!=='minecraftaibuilder-b15-file-hash-v1')fail('MANIFEST_SCHEMA');
 const paths=[];
 function walk(where,prefix=''){for(const ent of fs.readdirSync(where,{withFileTypes:true})){
  const rel=prefix?prefix+'/'+ent.name:ent.name,full=path.join(where,ent.name),stat=fs.lstatSync(full);
  if(stat.isSymbolicLink())fail('SYMLINK_'+rel);
  if(stat.isDirectory())walk(full,rel);
  else if(stat.isFile()){
   if(!['B15_FILE_SHA256.json','verify-b15-package.mjs'].includes(rel))paths.push(rel);
  }else fail('INVALID_ENTRY_'+rel);
 }}walk(root);paths.sort();
 if(JSON.stringify(paths)!==JSON.stringify(Object.keys(manifest.files).sort())||manifest.fileCount!==paths.length)fail('FILE_INVENTORY');
 for(const rel of paths){if(rel.startsWith('/')||rel.includes('..')||!/^[A-Za-z0-9_./-]+$/.test(rel)||sha(fs.readFileSync(path.join(root,rel)))!==manifest.files[rel])fail('SHA_'+rel)}
 const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B15_VIRTUAL_REVIEW_REPORT.json'),'utf8'));
 validateB15Report(report,root);
 if(fs.readFileSync(path.join(root,'previews/B15_VIRTUAL_REVIEW.html'),'utf8')!==renderB15Html(report,root))fail('HTML_NOT_REPRODUCIBLE');
 const qa=JSON.parse(fs.readFileSync(path.join(root,'qa/B15_REGRESSION_QA.json'),'utf8'));
 if(qa.schema!=='minecraftaibuilder-b15-regression-v1'||qa.rerunConfirmed!==335||qa.B14PreviouslyVerified!==358||qa.B15New!==25||qa.failedOrIncompleteSuites.length!==0||qa.testRuns.length!==22)fail('QA_COUNTS');
 for(const row of qa.testRuns){const log=fs.readFileSync(path.join(root,row.resultFile),'utf8');if(row.status!=='PASS'||row.exitCode!==0||row.tests!==row.pass||row.fail!==0||row.skip!==0||!log.includes('# pass '+row.tests+'\n')||!log.includes('# skipped 0\n'))fail('QA_'+row.testFile)}
 for(const [name,count] of [['B15_B14_RECHECK.tap',23],['B15_NEW_TESTS.tap',25]]){
  const t=fs.readFileSync(path.join(root,'qa',name),'utf8');
  for(const part of [`# tests ${count}\n`,`# pass ${count}\n`,'# fail 0\n','# skipped 0\n'])if(!t.includes(part))fail('QA_'+name);
 }
 const review=JSON.parse(fs.readFileSync(path.join(root,'qa/B15_BROWSER_UNSIGNED_REVIEW.json'),'utf8'));
 if(review.schema!=='minecraftaibuilder-b15-unsigned-review-v1'||review.reportSha256!==report.reportSha256||review.approved!==false||review.applied!==false||review.constructionApproved!==false||review.executionAllowed!==false||review.BuildPlan.status!=='NOT_PREPARED'||review.BuildPlan.commandCount!==0||review.BuildPlan.operations.length!==0)fail('UNSAFE_BROWSER_REVIEW');
 console.log('B15_PACKAGE_PASS',JSON.stringify({files:paths.length,originalB14Files:original.fileCount,tests:335+23+25,buildings:report.baseline.buildings,levels:report.baseline.levels,virtualCases:report.virtualScenarios.length,commandCount:0,gate:report.deploymentGate}));
}catch(e){console.error('B15_PACKAGE_FAIL',e.message);process.exitCode=1;}
