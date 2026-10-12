#!/usr/bin/env node
/** Integrity verification is read-only; old B72 source and all B73 delta included. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=m=>{throw Error('B73_PACKAGE_'+m)};
const m=JSON.parse(fs.readFileSync(path.join(root,'B73_INTEGRITY.json'),'utf8'));
if(m.schema!=='minecraftaibuilder-b73-frozen-preservation-v1'||Object.keys(m.originalB72Files||{}).length!==1190||Object.keys(m.b73NewFiles||{}).length<35)fail('MANIFEST');
const expected={...m.originalB72Files,...m.b73NewFiles};
if(Object.keys(expected).length!==1190+Object.keys(m.b73NewFiles).length)fail('OVERLAP');
for(const [rel,h] of Object.entries(expected)){
 if(rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('RELATIVE_PATH');
 const f=path.join(root,rel);if(!fs.existsSync(f)||!fs.lstatSync(f).isFile()||fs.lstatSync(f).isSymbolicLink()||sha(fs.readFileSync(f))!==h)fail('FILE_DRIFT '+rel);
}
let count=0;const allowed=new Set([...Object.keys(expected),'B73_INTEGRITY.json']);
function walk(dir,rel=''){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const p=rel?rel+'/'+e.name:e.name;
  if(e.isDirectory()&&!e.isSymbolicLink())walk(path.join(dir,e.name),p);
  else if(!e.isFile()||!allowed.has(p))fail('EXTRA_OR_SYMLINK '+p);
  else count++;
 }
}
walk(root);if(count!==allowed.size)fail('FILE_COUNT');
const report=JSON.parse(fs.readFileSync(path.join(root,'source/parallel/b73/main/B73_OFFLINE_PREFLIGHT_REPORT.json')));
if(report.readiness!=='NOT_PREPARED'||report.gates.length!==9||report.gates.some(x=>x.status!=='BLOCKED')||
 report.executionAllowed!==false||report.BuildPlan.operations.length!==0||report.BuildPlan.commandCount!==0||
 report.worldContacts!==0||report.summary.missingRuntimeAssetFiles!==6||report.summary.plannerExecutedOffline!==false)fail('SAFETY');
console.log('B73_PACKAGE_PASS',JSON.stringify({originalB72:1190,b73Files:Object.keys(m.b73NewFiles).length,zipFileEntries:allowed.size,
 sourcesPinned:30,runtimeCatalogMissing:6,productionPlannerRan:false,gatesBlocked:9,constructionCommands:0}));
