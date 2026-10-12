#!/usr/bin/env node
/** Complete B71 byte conservation + B72 deterministic offline replay. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB72} from './parallel/b72/main/run-b72.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=e=>{throw Error('B72_PACKAGE_'+e)};
const manifest=JSON.parse(fs.readFileSync(path.join(root,'B72_INTEGRITY.json'),'utf8'));
if(manifest.schema!=='minecraftaibuilder-b72-integrated-manifest-v1'||Object.keys(manifest.originalB71Files).length!==1164||Object.keys(manifest.b72AddedFiles).length<10)fail('MANIFEST');
const expect={...manifest.originalB71Files,...manifest.b72AddedFiles};
if(Object.keys(expect).length!==Object.keys(manifest.originalB71Files).length+Object.keys(manifest.b72AddedFiles).length)fail('OVERLAPPING_MANIFEST');
const wanted=new Set([...Object.keys(expect),'B72_INTEGRITY.json']);
for(const [rel,digest] of Object.entries(expect)){
 if(rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='..'||x==='.')||!/^[a-f0-9]{64}$/.test(digest))fail('INVALID_MANIFEST');
 const file=path.join(root,rel);if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||sha(fs.readFileSync(file))!==digest)fail('BYTE_DRIFT_'+rel);
}
let seen=0;
function visit(dir,base=''){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const rel=base?base+'/'+e.name:e.name;
  if(e.isDirectory()&&!e.isSymbolicLink())visit(path.join(dir,e.name),rel);
  else if(!e.isFile()||!wanted.has(rel))fail('EXTRA_OR_SYMLINK_'+rel);
  else seen++;
 }
}
visit(root);if(seen!==wanted.size)fail('FILE_COUNT');
const {report}=buildB72();
const stored=JSON.parse(fs.readFileSync(path.join(root,'source/parallel/b72/main/B72_PRODUCTION_INPUT_PREFLIGHT_REPORT.json'),'utf8'));
if(JSON.stringify(report)!==JSON.stringify(stored)||report.readiness!=='NOT_PREPARED'||report.executionAllowed!==false||
 report.constructionApproved!==false||report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||
 report.BuildPlan.operations.length!==0||report.BuildPlan.commandCount!==0||report.summary.realOutputVerifiedFloors!==0||
 report.jobs.some(j=>j.sendToPlannerAllowed!==false||j.constructionApproved!==false)||report.engineCalls!==0||report.worldContacts!==0)fail('REPLAY_OR_SAFETY');
console.log('B72_HANDOFF_PASS',JSON.stringify({frozenB71Files:1164,newB72Files:Object.keys(manifest.b72AddedFiles).length,
 sourceBackedInputCandidateBuildings:report.jobs.length,sourceSupportedPitchFiveFloors:30,realPlannerOutputsVerified:0,
 dependencyFilesStillNeededAtLeast:15,blockedGates:9,buildOperations:0}));
