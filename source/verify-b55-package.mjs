#!/usr/bin/env node
/** Append-only B55 verification: B54 source 810 files frozen, 8 new plus manifest. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB55FromSource} from './parallel/b55/main/run-b55.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=x=>{throw Error('B55_PACKAGE_'+x)};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'))fail('BAD_PATH');
 const full=path.join(ROOT,rel),st=fs.lstatSync(full);
 if(!st.isFile()||st.isSymbolicLink())fail('UNSAFE_SOURCE');
 return fs.readFileSync(full);
}
const prior=JSON.parse(read('B54_FILE_SHA256.json'));
const now=JSON.parse(read('B55_FILE_SHA256.json'));
const frozen={...prior.baselineFiles,...prior.addedFiles,'B54_FILE_SHA256.json':sha(read('B54_FILE_SHA256.json'))};
if(prior.schema!=='minecraftaibuilder-b54-integrated-sha-v1'||Object.keys(frozen).length!==810||
 now.schema!=='minecraftaibuilder-b55-integrated-sha-v1'||now.frozenB54FileCount!==810||
 now.originalB54ManifestSha256!==sha(read('B54_FILE_SHA256.json'))||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||now.addedFileCount!==8||Object.keys(now.addedFiles||{}).length!==8)fail('MANIFEST');
const seen=new Set();
for(const [name,expected] of Object.entries({...frozen,...now.addedFiles})){
 if(seen.has(name)||name==='B55_FILE_SHA256.json'||sha(read(name))!==expected)fail('SOURCE_HASH_'+name);
 seen.add(name);
}
seen.add('B55_FILE_SHA256.json');
function walk(dir,prefix=''){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const relative=prefix?`${prefix}/${item.name}`:item.name;
  if(item.isDirectory())walk(path.join(dir,item.name),relative);
  else if(!item.isFile()||!seen.has(relative))fail('UNTRACKED_OR_LINK_'+relative);
 }
}
walk(ROOT);if(seen.size!==819)fail('COUNT_'+seen.size);
const {report}=buildB55FromSource();
if(JSON.stringify(report)!==JSON.stringify(JSON.parse(read('parallel/b55/main/B55_PRODUCTION_SOURCE_GATE.json')))||
 report.intake.counts.MISSING!==5||report.intake.counts.PINNED_MATCH!==0||
 report.intake.snapshotStatus!=='INCOMPLETE_SOURCE_EVIDENCE'||
 report.productionFacadeParity!=='UNVERIFIED'||report.decision!=='HOLD'||
 report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(x=>x.status!=='BLOCKED')||
 report.safety.readiness!=='NOT_PREPARED'||report.safety.executionAllowed!==false||
 report.safety.BuildPlan.operations.length!==0||report.engineCalls!==0||report.actualConstructionOperations!==0)fail('REPLAY_SAFETY');
console.log('B55_PACKAGE_PASS',JSON.stringify({frozenB54:Object.keys(frozen).length,addedFiles:8,checkedSourceFiles:seen.size,
  intakeMissing:5,parity:'UNVERIFIED',safety:'NOT_PREPARED',M4Blocked:9,operations:0}));
