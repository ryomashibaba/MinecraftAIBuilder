import test from 'node:test';
import assert from 'node:assert/strict';
import {auditB124StairCorridor3D} from './b124-3d-transition-audit.mjs';
const P=(x,z)=>({x,z}),box=(x,y,z,width=1,height=1,depth=1)=>
 ({x,y,z,width,height,depth});
function fixture(){
 const floor={footprintRows:Array(9).fill('1'.repeat(9)),rooms:[],gallery:[]};
 const lower=[P(2,3),P(2,4),P(3,3),P(3,4)];
 const upper=lower.map(x=>({...x}));
 return {model:{fromLevel:0,footprint:[P(1,3),P(1,4)],
  lowerLanding:[P(1,3),P(1,4)],upperLanding:[P(1,3),P(1,4)],
  body:[box(1.2,1,3.2,.4,2,.4)],treads:[box(1,0.5,3,.5,.5,.5)],
  platform:[],supports:[]},
  lowerFloor:floor,upperFloor:floor,lowerRoute:lower,upperRoute:upper,
  sourceVoxels:[],foreignStairSolids:[],foreignOpeningCells:new Set()};
}
test('clean two-lane 3D scoped seam is never promoted to physical certification',()=>{
 const r=auditB124StairCorridor3D(fixture());
 assert.equal(r.status,'NO_NEW_CONFLICT_IN_SCOPED_3D_PROXIES');
 assert.equal(r.lowerAndUpper.length,2);
 assert(r.lowerAndUpper.every(s=>s.seamTwoLanesAdjacent));
 assert.equal(r.physicalStairBlockStatesCertified,false);
 assert.equal(r.realFloorSupportCertified,false);
 assert.equal(r.realPlayerStepAndDoorClearanceCertified,false);
 assert.equal(r.constructionAllowed,false);
});
test('full 3D corridor scan detects a source B105 static voxel in upper two-high body',()=>{
 const a=fixture();a.sourceVoxels=[{x:3,y:7,z:4,kind:'WALL_PROXY'}];
 const r=auditB124StairCorridor3D(a);
 assert(r.issueCodes.includes('CORRIDOR_3D_STATIC_VOXEL_OCCUPIED'));
 assert.equal(r.status,'HOLD_3D_TRANSITION_REVIEW');
});
test('independent AABB tests catch conceptual stair solids intruding into corridor',()=>{
 const a=fixture();a.model.supports=[box(2.5,1.25,3.5,.2,.5,.2)];
 assert(auditB124StairCorridor3D(a).issueCodes.includes('CORRIDOR_BODY_OVER_PROPOSED_STAIR_SOLID'));
 const b=fixture();b.foreignStairSolids=[box(3.2,6.2,4.2,.5,.5,.5)];
 assert(auditB124StairCorridor3D(b).issueCodes.includes('CORRIDOR_BODY_OVER_FOREIGN_STAIR_SOLID'));
});
test('opening cut in corridor support slab is a conservative 3D hold',()=>{
 const a=fixture();
 a.model.body=[box(2.2,4.6,3.2,.5,1.4,.5)];
 const r=auditB124StairCorridor3D(a);
 assert.equal(r.conceptualNewUpperOpeningCells,1);
 assert(r.issueCodes.includes('CORRIDOR_OVER_REQUIRED_STAIR_SLAB_OPENING'));
});
test('protected rooms/gallery cannot be cut for an unapproved stair slab opening',()=>{
 const a=fixture();a.model.body=[box(4.2,4.6,4.2,.5,1.4,.5)];
 a.upperFloor={...a.upperFloor,rooms:[{x:4,z:4,width:1,depth:1}],
  gallery:[P(4,4)]};
 const r=auditB124StairCorridor3D(a);
 assert(r.issueCodes.includes('STAIR_OPENING_OVER_PROTECTED_ROOM'));
 assert(r.issueCodes.includes('STAIR_OPENING_OVER_PROTECTED_SOURCE_GALLERY'));
});
test('upper landing swept floor warning persists as unresolved fine step review',()=>{
 const a=fixture();a.model.body=[box(1.2,4.6,3.2,.5,1.3,.5)];
 const r=auditB124StairCorridor3D(a);
 assert.equal(r.protectedUpperLandingSweepTouches,1);
 assert.equal(r.upperLandingFineStepCollisionReviewNeeded,true);
 assert.equal(r.realPlayerStepAndDoorClearanceCertified,false);
});
test('missing source support mask and unrelated floor apertures cannot be overlooked',()=>{
 const a=fixture();
 a.upperFloor={...a.upperFloor,footprintRows:a.upperFloor.footprintRows.map(
 (r,i)=>i===3?r.slice(0,1)+'0'+r.slice(2):r)};
 a.foreignOpeningCells.add('3,4');
 const r=auditB124StairCorridor3D(a);
 assert(r.issueCodes.includes('UPPER_LANDING_SOURCE_SUPPORT_ABSENT'));
 assert(r.issueCodes.includes('CORRIDOR_OVER_OTHER_STAIR_OPENING'));
});
test('invalid inputs fail closed, not as free corridor clearance',()=>{
 const a=fixture();a.model.body=[box(1,0,1,-1,1,1)];
 assert.throws(()=>auditB124StairCorridor3D(a),/B124_INVALID_AABB/);
 const b=fixture();b.lowerRoute=[P(7,7)];
 assert(auditB124StairCorridor3D(b).issueCodes.includes('NO_ADJACENT_TWO_LANE_CORRIDOR_SEAM'));
});
