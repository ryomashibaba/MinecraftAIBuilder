import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateApartmentSwitchback} from './b114-apartment-switchback-3d.mjs';
const folder='b114-review-output/';
const report=JSON.parse(fs.readFileSync(folder+'B114_APARTMENT_V1_Switchback_3D_Design_Review.json','utf8'));
const previous=JSON.parse(fs.readFileSync(folder+'B114_Final_Two_Stair_Conflicts_3D_Study.json','utf8'));
test('parametric 2+3 / 3+2 switchback 3D model has five-rise half-step approach and two-wide deck',()=>{
 assert(validateApartmentSwitchback(report));
 for(const p of [report.localPrototype.prototypeFirstRise2,report.localPrototype.prototypeFirstRise3]){
  assert.equal(p.footprintCells,20);
  assert.equal(p.landingCells,8);
  assert.equal(p.transitionDiscontinuities,0);
  assert.equal(p.midLandingHeightValid,true);
  assert(p.playerBodySweptAABBs>12);
  assert(p.treadShapes>0);
  assert.equal(p.realMinecraftBlockCollisionCertified,false);
 }
});
test('rigorous source masks, gallery and adjacent-flight AABB screening preserve failed results',()=>{
 assert.equal(report.totals.targetBuilding,'APARTMENT_V1');
 assert.equal(report.totals.sourceStairLinks,102);
 assert.equal(report.sourceTwoResidualIntegrity,previous.integritySha256);
 assert(report.totals.rawRectangularPlacementsAttempted>1000);
 assert.equal(report.totals.zeroInterferenceSwitchbackCandidates,
  report.alternativesCount+(report.selectedCandidate?1:0));
 assert.equal(report.totals.finalInterferencePairsConditional,
  report.selectedCandidate?0:1);
 assert(report.tests.reasonCounts.SOURCE_FLOOR_ROOM_OR_CORE>=0);
 assert.equal(report.totals.footprintFloorRoomCoreClear,
  report.totals.rawRectangularPlacementsAttempted-report.tests.reasonCounts.SOURCE_FLOOR_ROOM_OR_CORE);
 assert(report.totals.footprintFloorRoomCoreClear>=report.totals.bothGalleryInterfacesClear);
 assert(report.preferredCandidates.every(c=>c.noB105StructuralClashes&&
  c.noCrossFlightStructuralVoxelOverlap&&c.ownSupportBodyAABBConflicts===0));
});
test('all proposed geometry remains non-executable; no physical certification',()=>{
 assert.equal(report.physicallyConstructible,false);
 assert.equal(report.proposalsAppliedToSource,false);
 assert.equal(report.sourceEdits,0);
 assert.equal(report.worldContacts,0);
 assert.equal(report.constructionApproved,false);
 assert.equal(report.executionAllowed,false);
 assert.equal(report.readiness,'NOT_PREPARED');
 assert.deepEqual(report.BuildPlan.operations,[]);
 assert.equal(report.gates.length,9);
 assert(report.gates.every(g=>g.status==='BLOCKED'));
});
test('Japanese findings and local schematic cannot be mistaken for construction',()=>{
 const md=fs.readFileSync(folder+'B114_APARTMENT_V1_Switchback_Review_JA.md','utf8');
 const csv=fs.readFileSync(folder+'B114_APARTMENT_V1_Switchback_Rejection_Reasons.csv','utf8');
 const svg=fs.readFileSync(folder+'B114_APARTMENT_V1_U_Turn_Concept.svg','utf8');
 assert(md.includes('折返し階段'));
 assert(md.includes('NOT_PREPARED'));
 assert(csv.includes('SOURCE_FLOOR_ROOM_OR_CORE'));
 assert(svg.startsWith('<svg'));
 assert(!/<script|foreignObject|href=/i.test(svg));
});
