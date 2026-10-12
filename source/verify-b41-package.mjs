/** B41 local artifact verification, never calls Minecraft, planner, Bridge or network. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateB41} from './runner/step8b-stair-shape-integration-b41.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error(`B41_PACKAGE_${s}`);};
const older=JSON.parse(fs.readFileSync(path.join(root,'B40_FILE_SHA256.json'),'utf8'));
const current=JSON.parse(fs.readFileSync(path.join(root,'B41_FILE_SHA256.json'),'utf8'));
if(older.schema!=='minecraftaibuilder-step8b-b40-manifest-v1'||older.fileCount!==656||
 current.schema!=='minecraftaibuilder-step8b-b41-manifest-v1'||current.fileCount!==Object.keys(current.files).length)fail('MANIFEST');
for(const [rel,h] of Object.entries(current.files)){
 if(!/^[\w.\/-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||!/^([a-f0-9]){64}$/.test(h))fail('PATH');
 const full=path.join(root,rel);let stat;try{stat=fs.lstatSync(full);}catch{fail('MISSING_'+rel);}
 if(!stat.isFile()||stat.isSymbolicLink()||sha(fs.readFileSync(full))!==h)fail('HASH_'+rel);
}
for(const [rel,digest] of Object.entries(older.files))if(current.files[rel]!==digest)fail('B40_FROZEN_'+rel);
const r=JSON.parse(fs.readFileSync(path.join(root,'reports/B41_STAIR_REDESIGN_AUDIT.json'),'utf8'));
if(!validateB41(r,root)||r.baseline.nominalRouteCount!==44||r.baseline.withTurningRises!==44||
 r.baseline.withReusedApproachCells!==14||r.totals.straightProposals!==5||
 r.totals.proposalsWithNoConceptualClashes!==5||r.totals.physicalRoutesVerified!==0)fail('REPORT');
for(const [name,count] of [['B41_NEW_TESTS.tap',33],['B41_RELATED_REGRESSION.tap',96]]){
 const tap=fs.readFileSync(path.join(root,'qa',name),'utf8');
 for(const check of [`# tests ${count}`,`# pass ${count}`,'# fail 0','# skipped 0'])if(!tap.includes(check))fail('QA_'+name);
}
console.log('B41_PACKAGE_PASS',JSON.stringify({parentOriginalFiles:older.fileCount,packageManifestFiles:current.fileCount,newTests:33,relatedRegression:96,...r.baseline,...r.totals}));
