/** Strict immutable-package check; no runtime/Bridge/world interaction. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateLandingFloorHeightB38} from './runner/step8b-landing-floor-height-b38.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const digest=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B38_PACKAGE_'+s);};
const old=JSON.parse(fs.readFileSync(path.join(root,'B37_FILE_SHA256.json')));
const cur=JSON.parse(fs.readFileSync(path.join(root,'B38_FILE_SHA256.json')));
if(old.schema!=='minecraftaibuilder-step8b-b37-manifest-v1'||old.fileCount!==624||Object.keys(old.files).length!==624||
 cur.schema!=='minecraftaibuilder-step8b-b38-manifest-v1'||Object.keys(cur.files).length!==cur.fileCount)fail('MANIFEST');
for(const [rel,expected] of Object.entries(cur.files)){
 if(!/^[\w./-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(expected))fail('PATH');
 const p=path.join(root,rel),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||digest(fs.readFileSync(p))!==expected)fail('HASH_'+rel);
}
for(const [rel,expected] of Object.entries(old.files))if(cur.files[rel]!==expected)fail('BASELINE_MODIFIED_'+rel);
if(cur.files['B37_FILE_SHA256.json']!=='31aeb78d1a9d34f5ac61fc507610b8bea9e29bf687b77c70cb50c1b6479de08b')fail('OLD_MANIFEST_TAMPER');
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B38_LANDING_FLOOR_HEIGHT_REPORT.json'),'utf8'));
validateLandingFloorHeightB38(report,root);
const sum=JSON.parse(fs.readFileSync(path.join(root,'reports/B38_SUMMARY.json'),'utf8'));
if(sum.reviewVariants!==10||sum.landingCandidate4of4CellsRetained!==10||sum.candidateRectangleCoverageExact!==10||
 sum.stairTopSurfaceYMatchesUpperPlate!==10||sum.directEdgeTransitionVerified!==0||sum.transitionRedesignRequired!==10||
 sum.actualSupportOrPassabilityCertified!==0||sum.approvedVariant!==null||sum.readiness!=='NOT_PREPARED'||
 sum.deployment!=='BLOCKED'||sum.buildOperations!==0||sum.windowsActions!==0)fail('SUMMARY');
for(const [name,expected] of [['B38_NEW_TESTS.tap',27],['B38_RELATED_REGRESSION.tap',94]]){
 const t=fs.readFileSync(path.join(root,'qa',name),'utf8');
 if(!t.includes(`# tests ${expected}`)||!t.includes(`# pass ${expected}`)||!t.includes('# fail 0')||!t.includes('# skipped 0'))fail('QA_'+name);
}
console.log('B38_PACKAGE_PASS',JSON.stringify({frozenB37Files:old.fileCount,checkedFiles:cur.fileCount,newTests:27,relatedRegression:94,...report.totals}));
