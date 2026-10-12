/** B36 offline package verifier; cannot connect to Minecraft or generate construction instructions. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildStairSectionB36,validateStairSectionB36} from './runner/step8b-local-stair-section-b36.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B36_PACKAGE_'+s)};
const baseline=fs.readFileSync(path.join(root,'B35_FILE_SHA256.json'));
if(hash(baseline)!=='61f84415415dd7bfa3bd500dcc8b4d2021dace61609befcda3d3f338d4973fc4')fail('B35_MANIFEST_MODIFIED');
const b35=JSON.parse(baseline),m=JSON.parse(fs.readFileSync(path.join(root,'B36_FILE_SHA256.json')));
if(b35.fileCount!==602||Object.keys(b35.files).length!==602)fail('B35_COUNT');
if(m.schema!=='minecraftaibuilder-step8b-b36-manifest-v1'||m.fileCount!==Object.keys(m.files).length)fail('B36_MANIFEST');
for(const [rel,expected] of Object.entries(m.files)){
 if(!/^[\w./-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(expected))fail('PATH');
 const f=path.join(root,rel),stat=fs.lstatSync(f);
 if(!stat.isFile()||stat.isSymbolicLink()||hash(fs.readFileSync(f))!==expected)fail('HASH_'+rel);
}
for(const [rel,expected] of Object.entries(b35.files))if(m.files[rel]!==expected)fail('BASELINE_'+rel);
const r=JSON.parse(fs.readFileSync(path.join(root,'reports/B36_LOCAL_STAIR_SECTION_REPORT.json')));
validateStairSectionB36(r,root);
const sm=JSON.parse(fs.readFileSync(path.join(root,'reports/B36_SUMMARY.json')));
if(sm.layers!==5||sm.schematicCorridorToStairInterfaceEdges.A!==15||sm.schematicCorridorToStairInterfaceEdges.B!==10||
 sm.directlyAdjacentToUpperFloorCutout.A!==5||sm.directlyAdjacentToUpperFloorCutout.B!==5||
 sm.approval!==false||sm.constructionCommands!==0||sm.readiness!=='NOT_PREPARED')fail('SUMMARY');
for(const [file,amount] of [['B36_NEW_TESTS.tap',32],['B36_B34_B35_REGRESSION.tap',64]]){
 const s=fs.readFileSync(path.join(root,'qa',file),'utf8');
 if(!s.includes(`# tests ${amount}`)||!s.includes(`# pass ${amount}`)||!s.includes('# fail 0')||!s.includes('# skipped 0'))fail('QA_'+file);
}
console.log('B36_PACKAGE_PASS',JSON.stringify({B35FrozenFiles:602,B36Files:m.fileCount,B36NewTests:32,relatedRegression:64,totalPassing:96,...r.totals}));
