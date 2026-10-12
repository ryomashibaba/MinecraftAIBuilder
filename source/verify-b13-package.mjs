// B13 package integrity and self-contained reproducibility verifier. No production engine access.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {validateB13Report} from './runner/step8b-module-contract-b13.mjs';import {renderB13Html} from './runner/step8b-visual-b13.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Error('B13_'+code)};
try{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B13_FILE_SHA256.json'),'utf8'));
 if(manifest.schema!=='minecraftaibuilder-step8b-b13-sha256-v1')fail('MANIFEST_SCHEMA');
 const included=[];function crawl(folder,rel=''){for(const ent of fs.readdirSync(folder,{withFileTypes:true})){const relative=rel?rel+'/'+ent.name:ent.name,full=path.join(folder,ent.name),st=fs.lstatSync(full);
  if(st.isSymbolicLink())fail('SYMLINK');if(st.isDirectory())crawl(full,relative);else if(!st.isFile())fail('NON_FILE');else if(!['B13_FILE_SHA256.json','verify-b13-package.mjs'].includes(relative))included.push(relative);
 }}crawl(root);included.sort();const listed=Object.keys(manifest.files).sort();if(JSON.stringify(included)!==JSON.stringify(listed))fail('FILE_INVENTORY');
 for(const rel of listed){if(rel.includes('..')||rel.startsWith('/')||!/^[-A-Za-z0-9_./]+$/.test(rel)||!(/^[a-f0-9]{64}$/.test(manifest.files[rel]))||sha(fs.readFileSync(path.join(root,rel)))!==manifest.files[rel])fail('HASH_OR_PATH_'+rel);}
 const original=JSON.parse(fs.readFileSync(path.join(root,'docs/B12_ORIGINAL_FILE_SHA256_B13.json'),'utf8'));if(original.schema!=='minecraftaibuilder-b13-b12-original-sha256-v1'||Object.keys(original.files).length!==204)fail('B12_PROVENANCE');
 for(const [rel,expected] of Object.entries(original.files))if(manifest.files[rel]!==expected)fail('B12_MODIFIED_'+rel);
 const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B13_MODULE_CONTRACT_REPORT.json'),'utf8'));validateB13Report(report,root);
 if(fs.readFileSync(path.join(root,'previews/B13_MODULE_CONTRACT_REVIEW.html'),'utf8')!==renderB13Html(report,root))fail('HTML_DIFFERENCE');
 const qa=JSON.parse(fs.readFileSync(path.join(root,'qa/B13_REGRESSION_QA.json'),'utf8'));
 if(qa.testGroups!==22||qa.step8bTests!==255||qa.step8aTests!==80||qa.pass!==335||qa.fail!==0||qa.skip!==0)fail('QA_AGGREGATE');
 for(const run of qa.testRuns){const tap=fs.readFileSync(path.join(root,run.resultFile),'utf8');if(!tap.includes('# tests '+run.tests+'\n')||!tap.includes('# pass '+run.tests+'\n')||!tap.includes('# fail 0\n')||!tap.includes('# skipped 0\n'))fail('QA_LOG_'+run.testFile);}
 const review=JSON.parse(fs.readFileSync(path.join(root,'qa/B13_UNSIGNED_REVIEW.json'),'utf8'));if(review.approved!==false||review.executionAllowed!==false||review.constructionApproved!==false||review.BuildPlan?.status!=='NOT_PREPARED'||review.BuildPlan?.operations.length!==0)fail('SIGNED_OR_ACTIONABLE_REVIEW');
 console.log('B13_PACKAGE_PASS',JSON.stringify({files:listed.length,b12Unchanged:Object.keys(original.files).length,qa:qa.pass,fail:qa.fail,skip:qa.skip,gate:report.deploymentGate}));
}catch(e){console.error('B13_PACKAGE_FAIL',e.message);process.exitCode=1}
