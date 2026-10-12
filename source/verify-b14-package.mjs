// Standalone B14 archive verifier. Fails closed on any altered prior artifact.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {validateB14Report} from './runner/step8b-interior-modules-b14.mjs';import {renderB14Html} from './runner/step8b-visual-b14.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));const sha=b=>createHash('sha256').update(b).digest('hex');const fail=code=>{throw Error('B14_'+code)};
try{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'B14_FILE_SHA256.json'),'utf8'));
 if(manifest.schema!=='minecraftaibuilder-step8b-b14-sha256-v1')fail('MANIFEST_SCHEMA');
 const actual=[];function crawl(dir,prefix=''){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const rel=prefix?prefix+'/'+ent.name:ent.name,full=path.join(dir,ent.name),st=fs.lstatSync(full);if(st.isSymbolicLink())fail('SYMLINK');if(st.isDirectory())crawl(full,rel);else if(st.isFile()){if(!['B14_FILE_SHA256.json','verify-b14-package.mjs'].includes(rel))actual.push(rel)}else fail('NONFILE')}}crawl(root);actual.sort();
 const listed=Object.keys(manifest.files).sort();if(JSON.stringify(listed)!==JSON.stringify(actual)||manifest.fileCount!==listed.length)fail('INVENTORY');
 for(const rel of listed){if(rel.startsWith('/')||rel.includes('..')||!/^[-A-Za-z0-9_./]+$/.test(rel)||!/^[a-f0-9]{64}$/.test(manifest.files[rel])||sha(fs.readFileSync(path.join(root,rel)))!==manifest.files[rel])fail('HASH_'+rel)}
 const original=JSON.parse(fs.readFileSync(path.join(root,'docs/B13_ORIGINAL_FILE_SHA256_B14.json'),'utf8'));
 if(original.schema!=='minecraftaibuilder-b14-b13-original-sha256-v1'||original.fileCount!==241)fail('B13_PROVENANCE');
 for(const [rel,expected] of Object.entries(original.files)){if(rel.includes('..')||sha(fs.readFileSync(path.join(root,rel)))!==expected)fail('B13_CHANGED_'+rel)}
 const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B14_INPUT_CONTRACT_REPORT.json'),'utf8'));
 validateB14Report(report,root);
 if(fs.readFileSync(path.join(root,'previews/B14_INPUT_REVIEW.html'),'utf8')!==renderB14Html(report,root))fail('HTML_MISMATCH');
 const newTap=fs.readFileSync(path.join(root,'qa/B14_NEW_TESTS.tap'),'utf8');for(const fragment of ['# tests 23\n','# pass 23\n','# fail 0\n','# skipped 0\n'])if(!newTap.includes(fragment))fail('NEW_QA');
 const b14=JSON.parse(fs.readFileSync(path.join(root,'qa/B14_REGRESSION_QA.json'),'utf8'));
 if(b14.B14New!==23||b14.B13PreviouslyVerified!==335||b14.rerunConfirmed!==335||b14.failedOrIncompleteSuites.length!==0||b14.testRuns.length!==22)fail('REGRESSION_QA');
 for(const row of b14.testRuns){const tap=fs.readFileSync(path.join(root,row.resultFile),'utf8');if(row.status!=='PASS'||row.exitCode!==0||row.pass!==row.tests||row.tests!==row.previousExpectedTests||row.fail!==0||row.skip!==0||!tap.includes('# pass '+row.tests+'\n')||!tap.includes('# skipped 0\n'))fail('QA_'+row.testFile)}
 const review=JSON.parse(fs.readFileSync(path.join(root,'qa/B14_BROWSER_UNSIGNED_REVIEW.json'),'utf8'));
 if(review.approved!==false||review.constructionApproved!==false||review.executionAllowed!==false||review.BuildPlan?.status!=='NOT_PREPARED'||review.BuildPlan.operations.length||review.BuildPlan.commandCount!==0||review.sourceSha256!==report.reportSha256)fail('REVIEW_UNSAFE');
 console.log('B14_PACKAGE_PASS',JSON.stringify({files:listed.length,b13OriginalFiles:original.fileCount,tests:b14.rerunConfirmed+b14.B14New,buildings:report.totals.buildings,nominalEdges:report.totals.nominalBoundaryEdges,gate:report.deploymentGate}));
}catch(e){console.error('B14_PACKAGE_FAIL',e.message);process.exitCode=1;}
