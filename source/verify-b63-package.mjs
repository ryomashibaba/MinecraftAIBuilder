#!/usr/bin/env node
/** Immutable B62 package gate + additive B63, no user input, no network, no build. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB63FromSource} from './parallel/b63/main/run-b63.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const bad=x=>{throw Error('B63_PACKAGE_'+x);};
function bytes(rel){
 if(typeof rel!=='string'||!rel||rel.includes('\\')||rel.startsWith('/')||rel.split('/').some(x=>!x||x==='.'||x==='..'))bad('PATH');
 const f=path.join(root,rel),st=fs.lstatSync(f);if(!st.isFile()||st.isSymbolicLink())bad('NON_REGULAR_'+rel);
 return fs.readFileSync(f);
}
const base=JSON.parse(bytes('B62_FILE_SHA256.json'));
const frozen={...base.baselineFiles,...base.addedFiles,'B62_FILE_SHA256.json':sha(bytes('B62_FILE_SHA256.json'))};
const now=JSON.parse(bytes('B63_FILE_SHA256.json'));
if(base.schema!=='minecraftaibuilder-b62-integrated-sha-v1'||now.schema!=='minecraftaibuilder-b63-integrated-sha-v1'||
 Object.keys(frozen).length!==876||now.frozenB62FileCount!==876||
 now.originalB62ManifestSha256!==frozen['B62_FILE_SHA256.json']||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||
 now.addedFileCount!==6||Object.keys(now.addedFiles||{}).length!==6)bad('MANIFEST');
const known={...frozen,...now.addedFiles};
for(const [rel,hash] of Object.entries(known))if(!/^[0-9a-f]{64}$/.test(hash)||sha(bytes(rel))!==hash)bad('HASH_'+rel);
const allowed=new Set([...Object.keys(known),'B63_FILE_SHA256.json']);
function walk(dir,rel=''){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const next=rel?rel+'/'+e.name:e.name;
  if(e.isDirectory()&&!e.isSymbolicLink())walk(path.join(dir,e.name),next);
  else if(!e.isFile()||!allowed.has(next))bad('UNTRACKED_OR_LINK_'+next);
 }
}
walk(root);
if(allowed.size!==883)bad('COUNT');
const {report}=buildB63FromSource();
if(JSON.stringify(report)!==JSON.stringify(JSON.parse(bytes('parallel/b63/main/B63_HYPOTHETICAL_WALL_REVIEW.json')))||
 report.alternatives.length!==3||report.alternatives[2].wallModelProfiles.length!==4||
 report.alternatives[2].wallModelProfiles[2].modelWallCollisionCellCount!==0||
 report.alternatives[2].wallModelProfiles[3].nominalElevatorOverlapCells.length!==4||
 report.alternatives[2].roomOccupancy!=='UNKNOWN'||report.alternatives.some(x=>x.approved!==false||x.emittable!==false)||
 report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||
 report.readiness!=='NOT_PREPARED'||report.executionAllowed!==false||report.BuildPlan.operations.length!==0||
 report.engineCalls!==0||report.scans!==0||report.worldContacts!==0)bad('REPLAY_SAFETY');
console.log('B63_PACKAGE_PASS',JSON.stringify({frozenB62Sources:876,addedFiles:6,totalSourceFiles:883,
 alternatives:3,modelWidths:4,standaloneTests:51,b62Tests:46,realRoomOccupancyVerified:false,
 ready:'NOT_PREPARED',blockedGates:9,constructionOperations:0}));
