import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {analyzeB114Case} from './b114-joined-design.mjs';
import {buildB114,validateB114,writeB114,sha} from './compile-b114.mjs';
let parent,base,r;
before(async()=>{
 parent=await assembleReferenceParent();
 base=buildB113(parent);
 assert(validateB113(base));
 r=buildB114(parent,base);
});
const report=()=>r;
const tamper=(change,rehash=false)=>{
 const copy=structuredClone(report());change(copy);
 if(rehash){const {integritySha256,...b}=copy;copy.integritySha256=sha(b);}
 return validateB114(copy);
};
test('01 15 source-verified B113 building IDs preserved',()=>{
 assert(validateB114(report()));assert.equal(report().cases.length,15);
 assert.deepEqual(report().cases.map(c=>c.id),base.cases.map(c=>c.id));
});
test('02 reference B113 parent hash and source proofs pinned',()=>{
 assert.equal(report().sourceB113Digest,base.integritySha256);
 assert.equal(report().sourceProofs.length,15);
});
test('03 all 102 source stair links accounted, 78 B113 footprints preserved',()=>{
 const t=report().totals;assert.equal(t.stairs,102);
 assert.equal(t.inheritedB113ExistingFootprints,78);
 assert.equal(t.inheritedB113ExistingFootprints+t.newlyFoundStraightReservations+
  t.remainingNoSourcePreservingStraight,102);
});
test('04 all 24 previously unreserved stairs explicitly get extended search or pending',()=>{
 const missing=report().cases.flatMap(c=>c.stairs).filter(s=>s.priorEligibleFootprints===0);
 assert.equal(missing.length,24);
 assert(missing.every(s=>s.checkedAdditionalFootprints>0||
  s.hypothesis==='NO_SOURCE_PRESERVING_STRAIGHT_2X7_CANDIDATE'));
});
test('05 no 2x7 candidate allowed to overlap protected source rooms',()=>{
 for(let i=0;i<15;i++){
  const design=parent.sourceDesigns[i];
  const c=report().cases[i];
  for(const l of c.stairs){
   if(!l.selected)continue;
   const floors=[design.plan.floors[l.fromLevel],design.plan.floors[l.toLevel]];
   assert.equal(l.selected.cells.length,14);
   for(const p of l.selected.cells)for(const f of floors){
    assert.equal(f.footprintRows[p.z]?.[p.x],'1');
    assert(f.rooms.every(room=>!(p.x>=room.x&&p.x<room.x+room.width&&
      p.z>=room.z&&p.z<room.z+room.depth)));
   }
  }
 }
});
test('06 proposed stair is always marked not physically traversable',()=>{
 for(const c of report().cases)for(const s of c.stairs){
  assert.equal(s.actualTraversabilityCertified,false);
  assert.equal(s.worldOperations,0);
  if(s.selected){
   assert.equal(s.selected.canExecute,false);
   assert.equal(s.selected.educationCollisionVerified,false);
   assert.equal(s.selected.requiresFloorAndCeilingApertures,true);
  }
 }
});
test('07 no claim about full-building real player access',()=>{
 assert(report().cases.every(c=>c.physicalWholeBuildingWalkabilityCertified===false&&
  c.conditionalRoutes.allRoomPathsPhysicallyCertified===false));
});
test('08 conditional room paths never exceed original B113 279 room count',()=>{
 const t=report().totals;assert(t.hypotheticalGroundToRoomPaths>=0);
 assert(t.hypotheticalGroundToRoomPaths<=279);
});
test('09 preserve full B113 repair proposal 3660 corridor cells',()=>{
 assert.equal(report().totals.proposedCorridorCells,3660);
 assert(report().cases.every(c=>c.proposalsApplied===false));
});
test('10 residual four B113 rooms reviewed with explicit anchors approval',()=>{
 assert.equal(report().totals.inheritedProblematicBedrooms,4);
 for(const c of report().cases)for(const room of c.interiorReview){
  assert.equal(room.appliedToOriginal,false);
  assert.equal(room.physicalUsabilityCertified,false);
  assert(room.testedUnapprovedAnchorRelocations>=0);
  if(room.proposal)assert.equal(room.proposal.anchorRelocationRequiresUserDesignReview,true);
 }
});
test('11 scenario report refuses any changed B113 case ID',()=>{
 assert.throws(()=>analyzeB114Case({...base.cases[0],id:'BAD'},
 parent.sourceDesigns[0],parent.parentB110Models[0],parent.models[0]),/PARENT_CASE_ID/);
});
test('12 no certification of Minecraft Edition states or complete buildings',()=>{
 const t=report().totals;assert.equal(t.educationValidatedStairStates,0);
 assert.equal(t.physicallyCertifiedFullBuildings,0);
});
test('13 no source geometry modifications, world contact or operation permission',()=>{
 const t=report().totals;assert.equal(t.worldContacts,0);
 assert.equal(t.constructionCommands,0);
 assert.equal(report().worldCoordinates,null);
 assert.deepEqual(report().BuildPlan.operations,[]);
 assert.equal(report().constructionApproved,false);
});
test('14 nine gates remain BLOCKED, historical holds preserved',()=>{
 assert.equal(report().gates.length,9);
 assert(report().gates.every(g=>g.status==='BLOCKED'));
 assert.equal(report().totals.legacyUnapproved,296);
 assert.equal(report().totals.legacyHeld,18);
});
test('15 a forged approval is rejected even if integrity hash is recomputed',()=>{
 assert.equal(tamper(x=>x.constructionApproved=true,true),false);
 assert.equal(tamper(x=>x.worldContacts=1,true),false);
 assert.equal(tamper(x=>x.gates[0].status='PASS',true),false);
 assert.equal(tamper(x=>x.cases[0].stairs[0].actualTraversabilityCertified=true,true),false);
});
test('16 tampering source proof is rejected',()=>{
 assert.equal(tamper(x=>x.sourceProofs[0].shaB111='bad',true),false);
});
test('17 copy-on-write parent source remains intact',()=>{
 const before=JSON.stringify(parent.sourceDesigns[0]);
 analyzeB114Case(base.cases[0],parent.sourceDesigns[0],parent.parentB110Models[0],parent.models[0]);
 assert.equal(JSON.stringify(parent.sourceDesigns[0]),before);
});
test('18 generate non-executable JSON, CSV and Japanese human review',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b114-test-'));
 try{
  const a=writeB114(report(),dir);
  assert.equal(JSON.parse(fs.readFileSync(a.jsonPath,'utf8')).cases.length,15);
  assert.equal(fs.readFileSync(a.csvPath,'utf8').trim().split('\n').length,16);
  assert(fs.readFileSync(a.mdPath,'utf8').includes('未認証'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
