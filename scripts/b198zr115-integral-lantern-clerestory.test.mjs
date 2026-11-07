import test from 'node:test';
import assert from 'node:assert/strict';
import {raiseR115LanternAndSupportedBookwall,buildR115IntegralLanternStudy,WALL}
 from './b198zr115-integral-lantern-clerestory.mjs';
import {CANOPY}
 from './b198zr112-lantern-canopy-clearance.mjs';
const nodes={
 entrance:[[0,.05,-1.11],[.53,.05,-1.11],[.53,.05,-.75]],
 westAccess:[[0,.05,-1.11],[-.53,.05,-1.11],[-.53,.05,-.75]],
 westAscent:[[-.53,.05,-.75],[-.53,.20,.72],[-.68,.20,.72],
  [-.68,.38,-.72],[-.53,.38,-.72],[ -.53,.54,.72]],
 eastAscent:[[.53,.05,-.75],[.53,.24,.73],[.68,.24,.73],
  [.68,.44,-.72],[.53,.44,-.72],[.53,.64,.73],
  [.68,.64,.73],[.68,.80,-.72],[.68,.80,.35],[.55,.80,.35]]
};
test('R115 quick: lift real canopy and joined bookwall while retaining all four triangles',()=>{
 const lowA=[.7,.47,-.7],lowB=[.7,.47,-.65];
 const highA=[.7,.55,-.7],highB=[.7,.55,-.65];
 const innerA=[.5,.58,-.7],innerB=[.5,.58,-.65];
 const original=[
  {kind:WALL,a:lowA,b:lowB,c:highB},
  {kind:WALL,a:lowA,b:highB,c:highA},
  {kind:CANOPY,a:highA,b:highB,c:innerB},
  {kind:CANOPY,a:highA,b:innerB,c:innerA},
  {kind:'right_reading_terrace',a:[.6,.4,-.7],b:[.8,.4,-.7],c:[.6,.4,-.65]}
 ];
 const frozen=JSON.stringify(original);
 const v=raiseR115LanternAndSupportedBookwall(original,3,{rise:.1});
 assert.equal(JSON.stringify(original),frozen);
 assert.deepEqual(v.changedIndices,[0,1,2,3]);
 assert.equal(v.faces[4],original[4]);
 assert.deepEqual(v.faces[0].a,lowA);
 assert.equal(v.faces[0].c[1],.65);
 assert.equal(v.faces[3].c[1],.68);
 assert.equal(v.connectedOuterShelfStations,2);
 assert.equal(v.floorDeskAtriumAndEntryUntouched,true);
 assert.throws(()=>raiseR115LanternAndSupportedBookwall(original,3,{rise:.3}),
  /EXACT_REAL_CANOPY_AND_APPROVED_LIFT_REQUIRED/);
 assert.throws(()=>raiseR115LanternAndSupportedBookwall(original,0,{rise:.1}),
  /EXACT_REAL_CANOPY_AND_APPROVED_LIFT_REQUIRED/);
});
test('R115 real: actual R93 lantern clerestory variant only if original five lanes survive',()=>{
 const result=buildR115IntegralLanternStudy(nodes),r=result.report;
 assert.equal(r.oldHeadroom,7);
 assert.equal(r.provenObstructingR93Triangle,4474);
 assert.equal(r.candidateCount,4);
 assert.equal(r.originalRoomFloorDeskEntryAndShellRetained,true);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert.equal(r.safety.gates.length,9);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.independentVisualQuality,'NOT_REVIEWED');
 assert.equal(r.realPhysicalWalkabilityCertified,false);
 if(r.selection){
  assert.equal(r.geometryChanged,true);
  assert.equal(r.selection.acceptedByResearchGeometry,true);
  assert(r.selection.overhead<7);
  assert.equal(r.selection.allOldFiveLanesNonregressing,true);
  assert.equal(r.actualFacetsAltered,4);
 }else{
  assert.equal(r.geometryChanged,false);
  assert.equal(r.actualFacetsAltered,0);
 }
 console.log('R115_REAL_INTEGRAL_LANTERN',JSON.stringify({
  decision:r.decision,sourceHeadroom:r.oldHeadroom,
  candidates:r.candidates,selection:r.selection,changed:r.actualFacetsAltered
 }));
});
