#!/usr/bin/env node
/** B59 hermetic source integrity + deterministic replay verifier; no writable operations. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB59FromSource} from './parallel/b59/main/run-b59.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=code=>{throw Error('B59_PACKAGE_'+code);};
function read(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(s=>!s||s==='.'||s==='..'))fail('BAD_PATH');
 const p=path.join(ROOT,rel),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink())fail('NON_REGULAR');return fs.readFileSync(p);
}
const prior=JSON.parse(read('B58_FILE_SHA256.json'));
const current=JSON.parse(read('B59_FILE_SHA256.json'));
const frozen={...prior.baselineFiles,...prior.addedFiles,'B58_FILE_SHA256.json':sha(read('B58_FILE_SHA256.json'))};
if(prior.schema!=='minecraftaibuilder-b58-integrated-sha-v1'||Object.keys(frozen).length!==844||
 current.schema!=='minecraftaibuilder-b59-integrated-sha-v1'||current.frozenB58FileCount!==844||
 current.originalB58ManifestSha256!==sha(read('B58_FILE_SHA256.json'))||
 JSON.stringify(current.baselineFiles)!==JSON.stringify(frozen)||
 current.addedFileCount!==6||Object.keys(current.addedFiles||{}).length!==6)fail('MANIFEST');
const expected={...frozen,...current.addedFiles};
for(const [rel,digest] of Object.entries(expected))if(!/^[0-9a-f]{64}$/.test(digest)||sha(read(rel))!==digest)fail('SHA_'+rel);
const seen=new Set([...Object.keys(expected),'B59_FILE_SHA256.json']);
function walk(abs,prefix=''){
 for(const ent of fs.readdirSync(abs,{withFileTypes:true})){
  const rel=prefix?`${prefix}/${ent.name}`:ent.name;
  if(ent.isDirectory())walk(path.join(abs,ent.name),rel);
  else if(!ent.isFile()||!seen.has(rel))fail('UNTRACKED_OR_LINK_'+rel);
 }
}
walk(ROOT);if(seen.size!==851)fail('COUNT');
const {report}=buildB59FromSource();
if(JSON.stringify(report)!==JSON.stringify(JSON.parse(read('parallel/b59/main/B59_ACCESS_GAP_REPORT.json')))||
 report.totals.doors!==314||report.totals.historicUnverified!==60||
 report.readiness!=='NOT_PREPARED'||report.productionFacadeParity!=='UNVERIFIED'||
 report.blockers.M4Gates.length!==9||report.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
 report.BuildPlan.operations.length!==0||report.engineCalls!==0)fail('REPLAY_OR_SAFETY');
console.log('B59_PACKAGE_PASS',JSON.stringify({originalB58Files:844,newCodeFiles:6,checkedFiles:seen.size,
 conceptDoors:report.totals.doors,historicalUnresolvedUpperDoors:60,notPrepared:true,blockedGates:9,worldOperations:0}));
