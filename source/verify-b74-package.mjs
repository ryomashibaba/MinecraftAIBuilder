#!/usr/bin/env node
/** Read-only verifier for UNEXECUTED B74 distribution. Windows one-click copies may add Blocks.md later. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=(b)=>createHash('sha256').update(b).digest('hex');
const fail=(s)=>{throw Error('B74_PACKAGE_'+s)};
const m=JSON.parse(fs.readFileSync(path.join(root,'B74_INTEGRITY.json')));
if(m.schema!=='minecraftaibuilder-b74-immutable-base-and-added-delta-v1'||Object.keys(m.originalB73Files).length!==1239||Object.keys(m.b74NewFiles).length<40)fail('MANIFEST');
const set=new Set([...Object.keys(m.originalB73Files),...Object.keys(m.b74NewFiles),'B74_INTEGRITY.json']);
if(set.size!==1239+Object.keys(m.b74NewFiles).length+1)fail('DUPLICATE_PATH');
for(const [p,h] of Object.entries({...m.originalB73Files,...m.b74NewFiles})){
 if(p.startsWith('/')||p.includes('\\')||p.split('/').some(x=>!x||x==='.'||x==='..'))fail('PATH');
 const full=path.join(root,p);
 if(!fs.existsSync(full)||!fs.lstatSync(full).isFile()||fs.lstatSync(full).isSymbolicLink()||sha(fs.readFileSync(full))!==h)fail('DRIFT '+p);
}
let count=0;function walk(dir,rel=''){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const p=rel?rel+'/'+ent.name:ent.name;
  if(ent.isDirectory()&&!ent.isSymbolicLink())walk(path.join(dir,ent.name),p);
  else if(!ent.isFile()||!set.has(p))fail('EXTRA_OR_SYMLINK '+p);
  else count++;
 }
}
walk(root);if(count!==set.size)fail('COUNT');
const r=JSON.parse(fs.readFileSync(path.join(root,'source/parallel/b74/main/B74_OFFLINE_PLANNER_REPORT.json')));
if(r.readiness!=='NOT_PREPARED'||r.executionAllowed!==false||r.constructionApproved!==false||
 r.gates.length!==9||r.gates.some(x=>x.status!=='BLOCKED')||r.BuildPlan.operations.length||r.BuildPlan.commandCount!==0||
 r.summary.productionPlannerBuildingsRun!==0||r.source.blockListState!=='MISSING')fail('SAFETY_OR_FALSE_PLANNER_CLAIM');
console.log('B74_PACKAGE_PASS',JSON.stringify({originalB73:1239,newFiles:Object.keys(m.b74NewFiles).length,
 totalFiles:count,catalogSixVerified:true,realPlannerRuns:0,diagnosticFixtureOnly:true,gatesBlocked:9,worldCommands:0}));
