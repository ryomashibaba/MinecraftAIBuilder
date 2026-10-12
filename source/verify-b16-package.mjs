import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {validateB16Report} from './runner/step8b-connectivity-b16.mjs';
import {renderB16Html} from './runner/step8b-visual-b16.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw new Error('B16_PACKAGE_'+code)};
try{
 const original=JSON.parse(fs.readFileSync(path.join(root,'docs/B15_ORIGINAL_FILE_SHA256_B16.json')));
 if(original.schema!=='minecraftaibuilder-b16-b15-original-v1'||original.fileCount!==318||Object.keys(original.files).length!==318)fail('ORIGINAL_INVENTORY');
 for(const [rel,h] of Object.entries(original.files))if(rel.includes('..')||rel.startsWith('/')||!fs.existsSync(path.join(root,rel))||sha(fs.readFileSync(path.join(root,rel)))!==h)fail('B15_CHANGED_'+rel);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B16_FILE_SHA256.json')));
 if(manifest.schema!=='minecraftaibuilder-b16-inventory-v1')fail('FILE_MANIFEST');
 const inventory=[];
 function walk(folder,base=''){for(const ent of fs.readdirSync(folder,{withFileTypes:true})){
  const rel=base?base+'/'+ent.name:ent.name,full=path.join(folder,ent.name),st=fs.lstatSync(full);
  if(st.isSymbolicLink())fail('SYMLINK_'+rel);
  if(st.isDirectory())walk(full,rel);
  else if(st.isFile()&&!['B16_FILE_SHA256.json','verify-b16-package.mjs'].includes(rel))inventory.push(rel);
  else if(!st.isFile())fail('INVALID_ENTRY_'+rel);
 }}walk(root);inventory.sort();
 if(inventory.length!==manifest.fileCount||JSON.stringify(inventory)!==JSON.stringify(Object.keys(manifest.files).sort()))fail('FILE_INVENTORY');
 for(const rel of inventory)if(rel.includes('..')||rel.startsWith('/')||!/^[a-zA-Z0-9_.\/-]+$/.test(rel)||sha(fs.readFileSync(path.join(root,rel)))!==manifest.files[rel])fail('FILE_HASH_'+rel);
 const r=JSON.parse(fs.readFileSync(path.join(root,'reports/B16_CONNECTIVITY_REPORT.json')));validateB16Report(r,root);
 if(fs.readFileSync(path.join(root,'previews/B16_CONNECTIVITY_REVIEW.html'),'utf8')!==renderB16Html(r,root))fail('HTML_NOT_REPRODUCIBLE');
 const qa=JSON.parse(fs.readFileSync(path.join(root,'qa/B16_REGRESSION_QA.json')));
 if(qa.schema!=='minecraftaibuilder-b16-regression-v1'||qa.complete!==true||qa.testRuns?.length!==24||qa.passedRegression!==383||qa.failedOrIncompleteSuites?.length!==0)fail('REGRESSION_INCOMPLETE');
 for(const row of qa.testRuns){const name='B16_regression_'+path.basename(row.testFile,'.mjs')+'.tap',log=fs.readFileSync(path.join(root,'qa',name),'utf8');
  if(row.status!=='PASS'||row.fail!==0||row.skipped!==0||row.exitCode!==0||row.tests!==row.expected||row.pass!==row.expected||!log.includes('# pass '+row.pass+'\n')||!log.includes('# skipped 0\n'))fail('REGRESSION_LOG_'+row.testFile);
 }
 const fresh=fs.readFileSync(path.join(root,'qa/B16_NEW_TESTS.tap'),'utf8');
 for(const s of ['# tests 25\n','# pass 25\n','# fail 0\n','# skipped 0\n'])if(!fresh.includes(s))fail('NEW_TESTS_LOG');
 const browser=JSON.parse(fs.readFileSync(path.join(root,'qa/B16_BROWSER_SMOKE.json'))),review=JSON.parse(fs.readFileSync(path.join(root,'qa/B16_BROWSER_UNSIGNED_REVIEW.json')));
 if(browser.status!=='PASS'||browser.JSExceptions?.length||browser.externalRequests?.length||
  review.reportSha256!==r.reportSha256||review.approved!==false||review.applied!==false||review.constructionApproved!==false||review.executionAllowed!==false||
  review.BuildPlan.status!=='NOT_PREPARED'||review.BuildPlan.operations.length||review.BuildPlan.commandCount!==0)fail('BROWSER_REVIEW');
 console.log('B16_PACKAGE_PASS',JSON.stringify({shaVerifiedFiles:inventory.length,immutableB15:original.fileCount,regression:383,newTests:25,total:408,gate:'BLOCKED',commandCount:0}));
}catch(e){console.error('B16_PACKAGE_FAIL',e.message);process.exitCode=1}
