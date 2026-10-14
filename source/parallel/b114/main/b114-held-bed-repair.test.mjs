import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateHeldBedRepair,proposeHeldBedRepairs} from './b114-held-bed-repair.mjs';
const base='b114-review-output/';
const source=JSON.parse(fs.readFileSync(base+'B114_Furniture_Reconciliation_15_Buildings.json','utf8'));
const r=JSON.parse(fs.readFileSync(base+'B114_Four_Held_Rooms_Bed_Redesign.json','utf8'));
const key=p=>p.x+','+p.z;
test('four held original rooms all receive three independently derived review candidates',()=>{
 assert(validateHeldBedRepair(r));
 assert.equal(r.totals.initialHeldRooms,4);
 assert.equal(r.totals.candidateReadyForDesignerReview,4);
 assert.equal(r.totals.stillWithoutGeometryCandidate,0);
 assert.equal(r.totals.selectedAlternativesPresented,12);
 assert.deepEqual(r.reports.map(x=>x.id).sort(),[
 'APARTMENT_V3/L3/S004','APARTMENT_V3/L4/S004',
 'HOTEL_V3/L1/S004','HOTEL_V3/L1/S005']);
 assert(r.reports.every(p=>p.alternatives.length===3));
});
test('all candidate beds fit interior, protect door approach and give both beds side access',()=>{
 for(const room of r.reports){
  const R=room.roomRectangle;
  const reserved=new Set(room.protectedDoorApproach.map(key));
  for(const p of room.alternatives){
   assert(p.allFreeInteriorConnected===undefined||p.localPlanValid);
   assert.equal(p.bothBedsHaveReachableSideAccess,true);
   assert.equal(p.doorBufferUnobstructed,true);
   assert.equal(p.reachableFreeCells,p.availableFreeCells);
   assert.equal(p.fixtures.length,2);
   const occupied=p.fixtures.flatMap(f=>f.proposedFootprint.map(key));
   assert.equal(new Set(occupied).size,4);
   for(const fixture of p.fixtures){
    assert.equal(fixture.proposedFootprint.length,2);
    assert(fixture.reachableSideApproachCells.length>0);
    assert(fixture.proposedFootprint.every(pt=>pt.x>R.x&&pt.x<R.x+R.width-1&&
     pt.z>R.z&&pt.z<R.z+R.depth-1));
    assert(fixture.proposedFootprint.every(pt=>!reserved.has(key(pt))));
    assert(fixture.reachableSideApproachCells.every(pt=>!occupied.includes(key(pt))));
   }
  }
 }
});
test('results are stable when re-derived from the pinned source artifact',()=>{
 const fresh=proposeHeldBedRepairs(source);
 assert.equal(fresh.integritySha256,r.integritySha256);
 assert.deepEqual(fresh.totals,r.totals);
});
test('never auto-apply four candidate layouts or approve Education construction',()=>{
 assert.equal(r.proposalsAppliedToSource,false);
 assert.equal(r.totals.actualSourceRoomChanges,0);
 assert.equal(r.totals.physicallyCertifiedRooms,0);
 assert.equal(r.worldContacts,0);assert.equal(r.worldCoordinates,null);
 assert.equal(r.executionAllowed,false);assert.equal(r.constructionApproved,false);
 assert.equal(r.commandCount,0);assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.gates.length,9);
 assert(r.gates.every(g=>g.status==='BLOCKED'));
 assert(r.reports.every(x=>x.reviewGate!=='APPROVED'&&x.designApproved===false&&
  x.alternatives.every(a=>a.userApproved===false&&a.autoApplied===false)));
});
test('output contains static comparison graphic and Japanese instructions',()=>{
 const s=fs.readFileSync(base+'B114_Four_Held_Rooms_SideAccess.svg','utf8');
 const md=fs.readFileSync(base+'B114_Four_Held_Rooms_Review_JA.md','utf8');
 assert(s.startsWith('<svg '));assert(s.includes('SOURCE B113 — HELD'));
 assert(s.includes('PROPOSAL — NOT APPROVED'));
 assert(!/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(s));
 assert(md.includes('保留4室'));assert(md.includes('NOT_PREPARED'));
});
