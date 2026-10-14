import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateHeldRoomStaging} from './b114-held-room-staging.mjs';
const p='b114-review-output/';
const x=JSON.parse(fs.readFileSync(p+'B114_Four_Bedroom_Preferred_Staging.json','utf8'));
const f=JSON.parse(fs.readFileSync(p+'B114_Furniture_Reconciliation_15_Buildings.json','utf8'));
test('four broad-side-access room recommendations generate 279 staged geometry rooms',()=>{
 assert(validateHeldRoomStaging(x));
 assert.equal(x.totals.sourceRooms,279);
 assert.equal(x.totals.originallyReconciledRooms,275);
 assert.equal(x.totals.heldRoomsConsidered,4);
 assert.equal(x.totals.recommendedRooms,4);
 assert.equal(x.totals.geometryUnresolvedRooms,0);
 assert.equal(x.totals.geometryStagedDesignRooms,279);
 assert.equal(x.totals.roomsStillRequiringHumanAndEducationReview,4);
 assert.equal(x.recommendations.length,4);
 assert(x.recommendations.every(r=>r.selectedOriginalRank===3));
});
test('each candidate provides minimum two approach cells to each of two beds',()=>{
 for(const r of x.recommendations){
  assert.equal(r.independentlyVerifiedGeometry,true);
  assert.equal(r.bedSideAccessCounts.length,2);
  assert(r.bedSideAccessCounts.every(n=>n>=2));
  assert.equal(r.distinctSideAccessCells,4);
  assert.equal(r.relocatedBedCount,1);
  assert.equal(r.displacementBlocks,2);
  assert.equal(r.addRecommendedFurnitureCells.length,4);
  assert.equal(r.removeOldProxyCells.length,2);
  assert(r.allAlternativeAudits.some(a=>a.rank===1&&a.distinctSideAccessCells===2));
  assert(r.allAlternativeAudits.some(a=>a.rank===3&&a.distinctSideAccessCells===4));
  assert.equal(r.sourceAnchorEditApproved,false);
 }
});
test('staging is voxel-unique, reversible and leaves all original building overlays intact',()=>{
 assert.equal(x.totals.stagedBuildingOverlays,2);
 assert.equal(x.totals.reversibleLocalBuildingOverlays,2);
 assert.equal(x.totals.geometricallyIntersectingStagedVoxels,0);
 assert.equal(x.totals.removedHeldB105ProxyCells,8);
 assert.equal(x.totals.addedHeldB113BedBodyCells,16);
 for(const s of x.stagedBuildingOverlays){
  const source=f.reports.find(q=>q.id===s.buildingId);
  assert(s.sourceUnchanged);assert(s.reversibleInLocalDesign);
  assert.equal(s.sourceVoxelCount,source.localOverlay.length);
  assert.equal(s.stagedVoxelCount,s.sourceVoxelCount-s.removedDisplayProxyCells+s.addedBedFootprintCells);
  assert.equal(s.residualUnreconciledDisplayProxyCells,0);
  assert.equal(s.stagedDuplicateVoxelCount,0);
  assert.equal(s.actualSourceFilePatch,null);
 }
});
test('selected geometry remains fully unapproved and non-executable',()=>{
 assert.equal(x.physicalConstructionReady,false);
 assert.equal(x.proposalsAppliedToSource,false);
 assert.equal(x.totals.physicallyCertifiedRooms,0);
 assert.equal(x.totals.approvedSourceAnchorChanges,0);
 assert.equal(x.readiness,'NOT_PREPARED');
 assert.equal(x.constructionApproved,false);assert.equal(x.executionAllowed,false);
 assert.equal(x.worldContacts,0);assert.equal(x.worldCoordinates,null);
 assert.equal(x.commandCount,0);assert.deepEqual(x.BuildPlan.operations,[]);
 assert.equal(x.gates.length,9);assert(x.gates.every(g=>g.status==='BLOCKED'));
});
test('Japanese source-provenance review plus local 4-room graphic are standalone',()=>{
 const md=fs.readFileSync(p+'B114_Four_Bedroom_Preferred_Review_JA.md','utf8'),
  svg=fs.readFileSync(p+'B114_Four_Bedroom_Preferred_Review.svg','utf8');
 assert(md.includes('仮統合したデザイン室数'));
 assert(md.includes('279'));
 assert(md.includes('NOT_PREPARED'));
 assert(svg.startsWith('<svg '));
 assert(svg.includes('HUMAN + EDUCATION VERIFICATION REQUIRED'));
 assert(!/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(svg));
});
