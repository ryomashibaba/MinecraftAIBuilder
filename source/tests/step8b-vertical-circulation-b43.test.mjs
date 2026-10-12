import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildB43,buildB43ReviewAssembly,compileReviewAssemblyB43,solveUpperJunctionB43,validateB43} from '../runner/step8b-vertical-circulation-b43.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const report=buildB43(root),assembly=buildB43ReviewAssembly(root);
const b42=JSON.parse(fs.readFileSync(path.join(root,'reports/B42_MACRO_STAIR_MODULE.json')));
const b17=JSON.parse(fs.readFileSync(path.join(root,'reports/B17_INTERIOR_INTEGRATION_IR.json')));
const b21=JSON.parse(fs.readFileSync(path.join(root,'reports/B21_BLOCKSCALE_REVIEW.json')));
const flat=b=>b.buildings.find(x=>x.id==='apartment/candidate-01');
const upper=flat(b17).floors[1],walls=flat(b21).floors[1],rows=b42.transitions[0].floorMask.candidateFloorRows;
const copy=x=>JSON.parse(JSON.stringify(x));
const sign=x=>{const {reportSha256,...d}=x;x.reportSha256=createHash('sha256').update(JSON.stringify(d)).digest('hex');return x;};
const rejected=cb=>assert.throws(cb,/B43_/);

test('B43 validates its independent recomputed snapshot',()=>assert.equal(validateB43(report,root),true));
test('B43 snapshot matches stored evidence',()=>assert.deepEqual(report,JSON.parse(fs.readFileSync(path.join(root,'reports/B43_VERTICAL_CIRCULATION.json')))));
test('B43 whole-building graph spans 6 floors and 5 transition links',()=>assert.deepEqual([report.floors.length,report.junctions.length],[6,5]));
test('B43 starts with all 78 nominal door interfaces',()=>assert.equal(report.totals.doorReservations,78));
test('B43 source reachability is conditional 77 of 78 only',()=>assert.equal(report.totals.conceptualAccessDoors,77));
test('B43 does not conceal isolated level-one D012',()=>assert.deepEqual(report.totals.unreachableDoorIds,['apartment/candidate-01/L1/D012']));
test('B43 hypothetical bridge connects all 13 doors at each upper level',()=>assert.ok(report.junctions.every(j=>j.alternatives.localShort.reachableDoorIDs.length===13)));
test('B43 wall clear route is a long detour, not approved',()=>assert.ok(report.junctions.every(j=>j.alternatives.wallClearDetour.steps===83&&j.alternatives.wallClearDetour.wallConflictCells.length===0&&j.alternatives.wallClearDetour.wallWorkApproved===false)));
test('B43 all local connectors are exactly 9 steps',()=>assert.ok(report.junctions.every(j=>j.alternatives.localShort.steps===9)));
test('B43 all local connectors require 7 new corridor cells',()=>assert.equal(report.totals.localJunctionNewCorridorCells,35));
test('B43 all local connectors interfere with 4 nominal wall cells',()=>assert.equal(report.totals.localJunctionWallConflictCells,20));
test('B43 wall candidate IDs enumerate 5 owners each',()=>assert.equal(report.totals.localJunctionWallCandidateOwners,25));
test('B43 every wall-replan request explicitly lacks approval',()=>assert.ok(report.junctions.every(j=>j.wallReplanRequests.length===4&&j.wallReplanRequests.every(c=>c.approved===false&&c.wallCandidateIds.length>0))));
test('B43 never mistakenly crosses retagged (11,18) stair entrance',()=>assert.ok(report.junctions.every(j=>j.alternatives.localShort.route.every(p=>`${p.x},${p.z}`!=='11,18'))));
test('B43 does not pass through reserved elevator or stair footprint',()=>assert.ok(report.junctions.every((j,i)=>{
 const f=flat(b17).floors[i+1];const res=new Set([...f.stairReservation,...f.elevatorReservation].map(p=>`${p.x},${p.z}`));
 return j.alternatives.localShort.route.every(p=>!res.has(`${p.x},${p.z}`));
})));
test('B43 stops at source entrance (10,18) rather than a different floor section',()=>assert.ok(report.junctions.every(j=>JSON.stringify(j.alternatives.localShort.route.at(-1))==='{"x":10,"z":18}')));
test('B43 source lower stair gets retagged exactly on levels 1 through 5',()=>assert.deepEqual(report.floors.map(f=>f.lowerStairEntranceRetag),[...Array.from({length:5},()=>({x:11,z:18})),null]));
test('B43 source upper landing has 7 new corridor cells levels 2 through 6',()=>assert.deepEqual(report.floors.map(f=>f.upperLandingConnectorCells.length),[0,7,7,7,7,7]));
test('B43 does not claim certified room or support geometry',()=>assert.ok(report.junctions.every(j=>!j.alternatives.localShort.roomInteriorsVerified&&!j.alternatives.localShort.supportVerified)));
test('B43 retains all nine blocked M4 gates',()=>assert.deepEqual(report.blockers.map(x=>x.status),Array(9).fill('BLOCKED')));
test('B43 never imports verified block IDs, world anchor, or build operations',()=>{assert.equal(report.BuildPlan.worldCoordinates,null);assert.deepEqual(report.BuildPlan.materialIds,[]);assert.deepEqual(report.BuildPlan.operations,[]);});
test('B43 guarded assembly has 6 floor records and 5 stair links',()=>assert.deepEqual([assembly.sixLevels.length,assembly.fiveStairLinks.length],[6,5]));
test('B43 guarded assembly has source floor reference only for upper levels',()=>assert.deepEqual(assembly.sixLevels.map(f=>f.proposedFloorRows===null),[true,false,false,false,false,false]));
test('B43 guarded assembly keeps stair block states null and all construction permission false',()=>assert.ok(assembly.fiveStairLinks.every(s=>s.realBlockStates===null&&s.installationAuthorized===false)));
test('B43 guarded assembly retains 4 wall owner review tasks for each upper level',()=>assert.deepEqual(assembly.sixLevels.map(l=>l.proposedWallOwnerReplans.length),[0,4,4,4,4,4]));
test('B43 guarded assembly never provides executable operations',()=>assert.equal(assembly.BuildPlan.operations.length,0));
test('B43 guarded assembly refuses approved modifications in forged source',()=>{
 const altered=copy(report);altered.junctions[0].wallReplanRequests[0].approved=true;
 rejected(()=>compileReviewAssemblyB43(b42,altered));
});
test('B43 validator refuses forged construction permission even when report is re-signed',()=>{
 const altered=copy(report);altered.safety.constructionApproved=true;rejected(()=>validateB43(sign(altered),root));
});
test('B43 validator refuses forged engine operations even when report is re-signed',()=>{
 const altered=copy(report);altered.BuildPlan.operations=[{type:'setblock'}];rejected(()=>validateB43(sign(altered),root));
});
test('B43 validator refuses forged graph connectivity even when report is re-signed',()=>{
 const altered=copy(report);altered.totals.conceptualAccessDoors=78;rejected(()=>validateB43(sign(altered),root));
});
test('B43 connector requires a legitimate floor grid',()=>rejected(()=>solveUpperJunctionB43(upper,walls,['###','##'],{x:15,z:18},{x:10,z:18})));
test('B43 connector rejects endpoints on stair reserved cells',()=>rejected(()=>solveUpperJunctionB43(upper,walls,rows,{x:13,z:18},{x:10,z:18})));
test('B43 source guard rejects modified B42 manifest, even if JSON remains readable',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'B43-source-probe-'));
 try{
  const file=path.join(tmp,'B42_FILE_SHA256.json');fs.copyFileSync(path.join(root,'B42_FILE_SHA256.json'),file);
  fs.appendFileSync(file,'\n');rejected(()=>buildB43(tmp));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('B43 module never imports Bridge, runtime planner, or launches subprocesses',()=>{
 const code=fs.readFileSync(path.join(root,'runner/step8b-vertical-circulation-b43.mjs'),'utf8');
 assert.doesNotMatch(code,/from\s+['"][^'"]*(?:node:child_process|bridge|general-building-planner)/);
 assert.doesNotMatch(code,/\b(?:spawn|execFile|fetch|setBlock|fillBlocks|writeFileSync)\s*\(/);
});
