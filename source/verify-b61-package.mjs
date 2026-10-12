#!/usr/bin/env node
/** Strict B60 freeze + B61 new-files hash validation, fully offline. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB61FromSource} from './parallel/b61/main/run-b61.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const bad=s=>{throw Error('B61_PACKAGE_'+s)};
function read(f){
 if(typeof f!=='string'||!f||f.includes('\\')||f.startsWith('/')||f.split('/').some(x=>!x||x==='.'||x==='..'))bad('BAD_PATH');
 const full=path.join(root,f),stat=fs.lstatSync(full);
 if(!stat.isFile()||stat.isSymbolicLink())bad('NON_REGULAR_'+f);
 return fs.readFileSync(full);
}
const old=JSON.parse(read('B60_FILE_SHA256.json'));
const freeze={...old.baselineFiles,...old.addedFiles,'B60_FILE_SHA256.json':sha(read('B60_FILE_SHA256.json'))};
const current=JSON.parse(read('B61_FILE_SHA256.json'));
if(old.schema!=='minecraftaibuilder-b60-integrated-sha-v1'||
 current.schema!=='minecraftaibuilder-b61-integrated-sha-v1'||
 Object.keys(freeze).length!==858||current.frozenB60FileCount!==858||
 current.originalB60ManifestSha256!==freeze['B60_FILE_SHA256.json']||
 JSON.stringify(current.baselineFiles)!==JSON.stringify(freeze)||
 current.addedFileCount!==6||Object.keys(current.addedFiles||{}).length!==6)bad('MANIFEST');
const known={...freeze,...current.addedFiles};
for(const [f,digest] of Object.entries(known)){
 if(!/^[0-9a-f]{64}$/.test(digest)||sha(read(f))!==digest)bad('HASH_'+f);
}
const allowed=new Set([...Object.keys(known),'B61_FILE_SHA256.json']);
function visit(dir,rel=''){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  const sub=rel?rel+'/'+ent.name:ent.name;
  if(ent.isDirectory()&&!ent.isSymbolicLink())visit(path.join(dir,ent.name),sub);
  else if(!ent.isFile()||!allowed.has(sub))bad('UNTRACKED_OR_LINK_'+sub);
 }
}
visit(root);
if(allowed.size!==865)bad('FILE_COUNT');
const {report}=buildB61FromSource();
const frozenReport=JSON.parse(read('parallel/b61/main/B61_LOCAL_CONNECTOR_CONTRACT.json'));
if(JSON.stringify(report)!==JSON.stringify(frozenReport)||
 report.gap.minimumNewCorridorCells!==3||report.topology.candidateSymbolicallyConnected!==78||
 report.topology.historicB42UpperDoorsStillUnverified!==60||
 report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||
 report.BuildPlan.status!=='NOT_PREPARED'||report.BuildPlan.operations.length!==0||
 report.worldContacts!==0||report.engineCalls!==0||report.scans!==0||
 report.gap.physicalRouteApproved!==false)bad('REPLAY_OR_SAFETY');
console.log('B61_PACKAGE_PASS',JSON.stringify({frozenB60Files:858,newFiles:6,sourceFiles:865,
 hypotheticalConnectedDoors:78,minNewCorridorCells:3,physicalApproval:false,
 readiness:report.readiness,nineGatesBlocked:true,operations:0}));
