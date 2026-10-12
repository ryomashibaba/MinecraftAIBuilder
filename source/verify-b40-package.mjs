/** B40 verification. Read-only local integrity and regeneration check. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateB40} from './runner/step8b-crosslevel-stair-b40.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B40_PACKAGE_'+s);};
const before=JSON.parse(fs.readFileSync(path.join(root,'B39_FILE_SHA256.json')));
const after=JSON.parse(fs.readFileSync(path.join(root,'B40_FILE_SHA256.json')));
if(before.schema!=='minecraftaibuilder-step8b-b39-manifest-v1'||before.fileCount!==646||
 after.schema!=='minecraftaibuilder-step8b-b40-manifest-v1'||Object.keys(after.files).length!==after.fileCount)fail('MANIFEST');
for(const [rel,h] of Object.entries(after.files)){
 if(!/^[\w./-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(h))fail('PATH');
 const f=path.join(root,rel);let st;try{st=fs.lstatSync(f);}catch{fail('MISSING_'+rel);}
 if(!st.isFile()||st.isSymbolicLink()||sha(fs.readFileSync(f))!==h)fail('HASH_'+rel);
}
for(const [rel,h] of Object.entries(before.files))if(after.files[rel]!==h)fail('FROZEN_'+rel);
const r=JSON.parse(fs.readFileSync(path.join(root,'reports/B40_CROSSLEVEL_STAIR_AUDIT.json')));
if(!validateB40(r,root)||r.totals.nominalRouteInstances!==44||r.totals.uniqueLocalRouteSignatures!==7||
 r.totals.commonSignatureCountAcrossAllVariants!==3||r.totals.physicalRoutesVerified!==0)fail('REGEN');
for(const [rel,n] of [['B40_NEW_TESTS.tap',27],['B40_RELATED_REGRESSION.tap',96]]){
 const tap=fs.readFileSync(path.join(root,'qa',rel),'utf8');
 if(!tap.includes(`# tests ${n}`)||!tap.includes(`# pass ${n}`)||!tap.includes('# fail 0')||!tap.includes('# skipped 0'))fail('QA_'+rel);
}
console.log('B40_PACKAGE_PASS',JSON.stringify({frozenOriginalFiles:before.fileCount,packageManifestFiles:after.fileCount,newTests:27,relatedRegression:96,...r.totals}));
