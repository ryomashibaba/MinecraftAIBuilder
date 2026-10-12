/** Strict B39 restoration test. No operational engine imported. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateB39} from './runner/step8b-stair-route-b39.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B39_PACKAGE_'+s);};
const old=JSON.parse(fs.readFileSync(path.join(root,'B38_FILE_SHA256.json')));
const now=JSON.parse(fs.readFileSync(path.join(root,'B39_FILE_SHA256.json')));
if(old.schema!=='minecraftaibuilder-step8b-b38-manifest-v1'||old.fileCount!==635||
 now.schema!=='minecraftaibuilder-step8b-b39-manifest-v1'||now.fileCount!==Object.keys(now.files).length)fail('MANIFEST');
for(const [rel,expected] of Object.entries(now.files)){
 if(!/^[\w./-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(expected))fail('PATH');
 const f=path.join(root,rel),st=fs.lstatSync(f);
 if(st.isSymbolicLink()||!st.isFile()||sha(fs.readFileSync(f))!==expected)fail('HASH_'+rel);
}
for(const [rel,h] of Object.entries(old.files))if(now.files[rel]!==h)fail('B38_FROZEN_'+rel);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B39_STAIR_ROUTE_REVIEW.json')));
if(!validateB39(report,root))fail('REPORT');
const sum=JSON.parse(fs.readFileSync(path.join(root,'reports/B39_SUMMARY.json')));
if(sum.existingFloorOpeningViableVariants!==0||sum.proposedFloorOpeningNominalVariants!==10||
 sum.proposedFloorOpeningNominalPaths!==44||sum.unmodifiedFrozenFiles!==635||
 sum.constructionApproved!==false||sum.approvedVariant!==null||sum.buildOperations!==0||
 sum.readiness!=='NOT_PREPARED'||sum.deployment!=='BLOCKED'||sum.windowsActions!==0||
 sum.installedHeadroomOrSupportCertified!==0)fail('SUMMARY');
for(const [name,count] of [['B39_NEW_TESTS.tap',29],['B39_B35_B38_REGRESSION.tap',121]]){
 const t=fs.readFileSync(path.join(root,'qa',name),'utf8');
 if(!t.includes(`# tests ${count}`)||!t.includes(`# pass ${count}`)||
 !t.includes('# fail 0')||!t.includes('# skipped 0'))fail('QA_'+name);
}
console.log('B39_PACKAGE_PASS',JSON.stringify({frozenB38Files:old.fileCount,newFiles:now.fileCount,
 newTests:29,relatedTests:121,...report.totals}));
