/** B43 immutable checkpoint validator; read-only, no engine calls. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB43,validateB43,buildB43ReviewAssembly} from './runner/step8b-vertical-circulation-b43.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const digest=x=>createHash('sha256').update(x).digest('hex');
const reject=s=>{throw Error('B43_PACKAGE_'+s);};
const old=JSON.parse(fs.readFileSync(path.join(root,'B42_FILE_SHA256.json')));
const fresh=JSON.parse(fs.readFileSync(path.join(root,'B43_FILE_SHA256.json')));
if(old.schema!=='minecraftaibuilder-step8b-b42-manifest-v1'||old.fileCount!==678||
 fresh.schema!=='minecraftaibuilder-step8b-b43-manifest-v1'||
 fresh.fileCount!==Object.keys(fresh.files).length||fresh.fileCount<688)reject('MANIFEST');
for(const [rel,h] of Object.entries(fresh.files)){
 if(!/^[A-Za-z0-9_./-]+$/.test(rel)||rel.startsWith('/')||rel.split('/').includes('..')||
  !/^[a-f0-9]{64}$/.test(h))reject('PATH');
 const file=path.join(root,rel);let st;try{st=fs.lstatSync(file);}catch{reject('MISSING_'+rel);}
 if(!st.isFile()||st.isSymbolicLink()||digest(fs.readFileSync(file))!==h)reject('HASH_'+rel);
}
for(const [rel,h] of Object.entries(old.files))if(fresh.files[rel]!==h)reject('FROZEN_B42_'+rel);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/B43_VERTICAL_CIRCULATION.json')));
if(!validateB43(report,root)||report.totals.conceptualAccessDoors!==77||
 report.totals.localJunctionWallConflictCells!==20||report.totals.localJunctionNewCorridorCells!==35||
 report.BuildPlan.operations.length!==0||report.readiness!=='NOT_PREPARED')reject('REPORT');
const assembly=JSON.parse(fs.readFileSync(path.join(root,'reports/B43_GUARDED_LAYOUT_ASSEMBLY.json')));
if(JSON.stringify(buildB43ReviewAssembly(root))!==JSON.stringify(assembly)||
 assembly.BuildPlan.operations.length!==0||assembly.executionAllowed!==false)reject('ASSEMBLY');
for(const [name,n] of [['B43_NEW_TESTS.tap',34],['B43_RELATED_REGRESSION.tap',105]]){
 const tap=fs.readFileSync(path.join(root,'qa',name),'utf8');
 for(const txt of [`# tests ${n}`,`# pass ${n}`,'# fail 0','# skipped 0'])if(!tap.includes(txt))reject('QA_'+name);
}
console.log('B43_PACKAGE_PASS',JSON.stringify({frozenB42Files:678,b43ManifestFiles:fresh.fileCount,
 newTests:34,relatedTests:105,nominalAccess:'77/78',wallConflicts:20,constructionOperations:0,engineCalls:0}));
