/** B37 package verification, offline. No construction or runtime dependencies. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateLandingEnvelopeB37} from './runner/step8b-landing-envelope-b37.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const h=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B37_PACKAGE_'+s)};
const old=fs.readFileSync(path.join(root,'B36_FILE_SHA256.json'));
if(h(old)!=='d782ad0156a29da879ae493b9f61476e36d1e4b8adc6f2726b8d3f1fac24993b')fail('B36_BASELINE_MODIFIED');
const b36=JSON.parse(old),m=JSON.parse(fs.readFileSync(path.join(root,'B37_FILE_SHA256.json')));
if(b36.fileCount!==613||Object.keys(b36.files).length!==613)fail('BASELINE_COUNT');
if(m.schema!=='minecraftaibuilder-step8b-b37-manifest-v1'||m.fileCount!==Object.keys(m.files).length)fail('MANIFEST');
for(const [rel,expected] of Object.entries(m.files)){
 if(!/^[\w./-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(expected))fail('PATH');
 const file=path.join(root,rel),stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||h(fs.readFileSync(file))!==expected)fail('BAD_HASH_'+rel);
}
for(const [rel,expected] of Object.entries(b36.files))if(m.files[rel]!==expected)fail('FROZEN_CHANGED_'+rel);
const r=JSON.parse(fs.readFileSync(path.join(root,'reports/B37_LANDING_ENVELOPE_REPORT.json')));
validateLandingEnvelopeB37(r,root);
const summary=JSON.parse(fs.readFileSync(path.join(root,'reports/B37_SUMMARY.json')));
if(summary.levels!==5||summary.nominalCorridorToStairPorts.A!==15||summary.nominalCorridorToStairPorts.B!==10||
 summary.nominal2x2Footprints.A!==5||summary.nominal2x2Footprints.B!==5||
 summary.physicallyCertifiedLandings!==0||summary.selectedOption!==null||
 summary.readiness!=='NOT_PREPARED'||summary.deployment!=='BLOCKED'||summary.buildOperations!==0)fail('SUMMARY');
for(const [file,n] of [['B37_NEW_TESTS.tap',32],['B37_B35_B36_REGRESSION.tap',62]]){
 const txt=fs.readFileSync(path.join(root,'qa',file),'utf8');
 if(!txt.includes(`# tests ${n}`)||!txt.includes(`# pass ${n}`)||!txt.includes('# fail 0')||!txt.includes('# skipped 0'))fail('QA_'+file);
}
console.log('B37_PACKAGE_PASS',JSON.stringify({frozenB36Files:b36.fileCount,checkedFiles:m.fileCount,newTests:32,relatedRegression:62,...r.totals}));
