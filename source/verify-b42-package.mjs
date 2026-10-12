/** Offline-only checkpoint verification; never loads Minecraft or Bridge. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateB42} from './runner/step8b-macro-module-b42.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const digest=x=>createHash('sha256').update(x).digest('hex');
const refuse=msg=>{throw Error(`B42_PACKAGE_${msg}`);};
const inherited=JSON.parse(fs.readFileSync(path.join(root,'B41_FILE_SHA256.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'B42_FILE_SHA256.json')));
if(inherited.schema!=='minecraftaibuilder-step8b-b41-manifest-v1'||inherited.fileCount!==667||
 manifest.schema!=='minecraftaibuilder-step8b-b42-manifest-v1'||
 manifest.fileCount!==Object.keys(manifest.files).length||manifest.fileCount<675)refuse('MANIFEST');
for(const [rel,h] of Object.entries(manifest.files)){
 if(!/^[a-zA-Z0-9_./-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||
  !/^[a-f0-9]{64}$/.test(h))refuse('FILE_PATH');
 const p=path.join(root,rel),st=fs.lstatSync(p);
 if(!st.isFile()||st.isSymbolicLink()||digest(fs.readFileSync(p))!==h)refuse('FILE_HASH_'+rel);
}
for(const [rel,h] of Object.entries(inherited.files))if(manifest.files[rel]!==h)refuse('FROZEN_B41_'+rel);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B42_MACRO_STAIR_MODULE.json')));
if(!validateB42(report,root)||report.totals.upperLandingDoorReachable!==5||
 report.totals.potentialUpperConnectorNewCorridorCells!==35||
 report.totals.potentialUpperConnectorWallOverlayCells!==20||
 report.totals.engineCalls!==0||report.BuildPlan.operations.length!==0)refuse('REPORT');
for(const [name,n] of [['B42_NEW_TESTS.tap',32],['B42_RELATED_REGRESSION.tap',112]]){
 const tap=fs.readFileSync(path.join(root,'qa',name),'utf8');
 for(const x of [`# tests ${n}`,`# pass ${n}`,'# fail 0','# skipped 0'])if(!tap.includes(x))refuse('QA_'+name);
}
console.log('B42_PACKAGE_PASS',JSON.stringify({frozenB41Files:667,b42ManifestFiles:manifest.fileCount,
 newTests:32,relatedTests:112,upperDoorAccess:report.totals.upperLandingDoorReachable,
 unresolvedWallOverlayCells:report.totals.potentialUpperConnectorWallOverlayCells,
 engineCalls:0,constructionOperations:0}));
