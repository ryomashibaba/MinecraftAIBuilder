#!/usr/bin/env node
/** B62 immutable B61 baseline and additive offline-only package integrity gate. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB62FromSource} from './parallel/b62/main/run-b62.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const bad=x=>{throw Error('B62_PACKAGE_'+x);};
function bytes(rel){
 if(typeof rel!=='string'||!rel||rel.includes('\\')||rel.startsWith('/')||rel.split('/').some(x=>!x||x==='.'||x==='..'))bad('PATH');
 const file=path.join(root,rel),stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink())bad('NON_REGULAR_'+rel);
 return fs.readFileSync(file);
}
const base=JSON.parse(bytes('B61_FILE_SHA256.json'));
const frozen={...base.baselineFiles,...base.addedFiles,'B61_FILE_SHA256.json':sha(bytes('B61_FILE_SHA256.json'))};
const now=JSON.parse(bytes('B62_FILE_SHA256.json'));
if(base.schema!=='minecraftaibuilder-b61-integrated-sha-v1'||
 now.schema!=='minecraftaibuilder-b62-integrated-sha-v1'||
 Object.keys(frozen).length!==865||now.frozenB61FileCount!==865||
 now.originalB61ManifestSha256!==frozen['B61_FILE_SHA256.json']||
 JSON.stringify(now.baselineFiles)!==JSON.stringify(frozen)||
 now.addedFileCount!==10||Object.keys(now.addedFiles||{}).length!==10)bad('MANIFEST');
const known={...frozen,...now.addedFiles};
for(const [file,d] of Object.entries(known)){
 if(!/^[0-9a-f]{64}$/.test(d)||sha(bytes(file))!==d)bad('HASH_'+file);
}
const allowed=new Set([...Object.keys(known),'B62_FILE_SHA256.json']);
function visit(dir,rel=''){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const next=rel?rel+'/'+e.name:e.name;
  if(e.isDirectory()&&!e.isSymbolicLink())visit(path.join(dir,e.name),next);
  else if(!e.isFile()||!allowed.has(next))bad('UNTRACKED_OR_LINK_'+next);
 }
}
visit(root);
if(allowed.size!==876)bad('TOTAL_FILES');
const {report}=buildB62FromSource();
const saved=JSON.parse(bytes('parallel/b62/main/B62_RESERVATION_CONFLICT_REVIEW.json'));
if(JSON.stringify(report)!==JSON.stringify(saved)||report.alternatives.length!==3||
 report.findings.b61ThreeCellProposalCollidesWithElevatorReservation!==3||
 report.alternatives[2].minimumAddedCells!==5||
 report.alternatives[2].reservationCollisions.elevator.length!==0||
 report.alternatives[2].reservationCollisions.stair.length!==0||
 report.alternatives[2].roomOccupancyVerified!==false||report.alternatives[2].physicalTraversalVerified!==false||
 report.gates.length!==9||report.gates.some(g=>g.status!=='BLOCKED')||
 report.readiness!=='NOT_PREPARED'||report.BuildPlan.operations.length!==0||report.engineCalls!==0||report.scans!==0||report.worldContacts!==0)bad('SAFETY_OR_REPLAY');
const html=bytes('parallel/b62/main/B62_OFFLINE_CONFLICT_REVIEW.html').toString('utf8');
if(!html.includes(report.reportSha256)||!html.includes('NOT_PREPARED')||!html.includes('BLOCKED')||!html.includes('両設備を回避'))bad('HTML_RENDER');
console.log('B62_PACKAGE_PASS',JSON.stringify({frozenB61Sources:865,newFiles:10,totalSourceFiles:876,
 tests:46,b61Tests:39,unsafeB61ElevatorCollisions:3,
 nominallyReservationFreeAlternativeCells:5,physicalApproval:false,
 readiness:'NOT_PREPARED',blockedGates:9,operations:0}));
