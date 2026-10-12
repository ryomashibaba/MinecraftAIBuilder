#!/usr/bin/env node
/** B60 deterministic provenance/immutability validator. Non-mutating. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB60FromSource} from './parallel/b60/main/run-b60.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const bad=(s)=>{throw Error('B60_PACKAGE_'+s);};
function read(relative){
 if(typeof relative!=='string'||!relative||relative.startsWith('/')||relative.includes('\\')||relative.split('/').some(x=>!x||x==='..'||x==='.') )bad('INVALID_PATH');
 const full=path.join(root,relative),st=fs.lstatSync(full);
 if(st.isSymbolicLink()||!st.isFile())bad('NOT_REGULAR_'+relative);
 return fs.readFileSync(full);
}
const old=JSON.parse(read('B59_FILE_SHA256.json')),
 frozen={...old.baselineFiles,...old.addedFiles,'B59_FILE_SHA256.json':sha(read('B59_FILE_SHA256.json'))},
 current=JSON.parse(read('B60_FILE_SHA256.json'));
if(old.schema!=='minecraftaibuilder-b59-integrated-sha-v1'||
 current.schema!=='minecraftaibuilder-b60-integrated-sha-v1'||
 current.frozenB59FileCount!==851||Object.keys(frozen).length!==851||
 current.originalB59ManifestSha256!==sha(read('B59_FILE_SHA256.json'))||
 JSON.stringify(current.baselineFiles)!==JSON.stringify(frozen)||
 current.addedFileCount!==6||Object.keys(current.addedFiles||{}).length!==6)bad('MANIFEST');
const known={...frozen,...current.addedFiles};
for(const [relative,digest] of Object.entries(known)){
 if(!/^[a-f0-9]{64}$/.test(digest)||sha(read(relative))!==digest)bad('FILE_HASH_'+relative);
}
const allowed=new Set([...Object.keys(known),'B60_FILE_SHA256.json']);
const visit=(dir,rel='')=>{
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const sub=rel?rel+'/'+e.name:e.name,full=path.join(dir,e.name);
  if(e.isDirectory()&&!e.isSymbolicLink())visit(full,sub);
  else if(!e.isFile()||!allowed.has(sub))bad('UNTRACKED_OR_LINK_'+sub);
 }
};
visit(root);
if(allowed.size!==858)bad('COUNT');
const {report}=buildB60FromSource(),file=JSON.parse(read('parallel/b60/main/B60_GUARDED_CIRCULATION_CONTRACT.json'));
if(JSON.stringify(report)!==JSON.stringify(file)||report.totals.reachableSymbolicDoors!==77||
 report.totals.unresolvedSymbolicDoors!==1||report.comparison.b42HistoricUpperDoorAccess.unverified!==60||
 report.BuildPlan.operations.length!==0||report.BuildPlan.status!=='NOT_PREPARED'||
 report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||report.engineCalls!==0||report.scans!==0)bad('RECOMPUTE_OR_SAFETY');
console.log('B60_PACKAGE_PASS',JSON.stringify({frozenSourceFiles:851,addedSourceFiles:6,verifiedSourceFiles:858,
  graphReachable77of78:true,historicalUnverified60:true,notPrepared:true,nineGatesBlocked:true,buildOperations:0}));
