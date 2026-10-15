import test from 'node:test';
import assert from 'node:assert/strict';
import {auditB116Corridor} from './b116-corridor-3d-core.mjs';
const p=(x,z)=>({x,z});
const f=[];for(let x=4;x<=9;x++)for(let z=3;z<=4;z++)f.push(p(x,z));
const proposal={status:'CONDITIONAL_TWO_WIDE_ROUTE_CANDIDATE',startAnchor:p(4,3),goalAnchor:p(8,3),
 fullFootprintCells:f,addedCells:f.filter(q=>q.x!==9)};
const scene=()=>({proposal,level:1,floor:{footprintRows:Array.from({length:12},()=> '1'.repeat(12))},
 rooms:[],cores:[],stairMask:new Set(),existingWalk:new Set(['9,3','9,4']),
 sourceVoxels:[],stairAABBs:[],proposedApertures:new Set()});
test('original mask and 2-wide source gallery with clear scoped headroom',()=>{
 const r=auditB116Corridor(scene());assert.equal(r.status,'NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES');
 assert.equal(r.testedFootprintCells,12);assert.equal(r.reachableTwoWideAnchors,5);
 assert.equal(r.actualPhysicalTraversalCertified,false);assert.equal(r.constructionAllowed,false);
});
test('room core stair footprint and original floor hole are detected',()=>{
 const a=scene();a.rooms=[{x:6,z:3,width:1,depth:2}];
 assert(auditB116Corridor(a).issueCodes.includes('SOURCE_MASK_ROOM_CORE_OR_STAIR_CONFLICT'));
 const b=scene();b.cores=[{x:6,z:3,width:1,depth:2}];
 assert(auditB116Corridor(b).issueCodes.includes('SOURCE_MASK_ROOM_CORE_OR_STAIR_CONFLICT'));
 const c=scene();c.stairMask.add('6,3');
 assert(auditB116Corridor(c).issueCodes.includes('SOURCE_MASK_ROOM_CORE_OR_STAIR_CONFLICT'));
 const d=scene();d.floor.footprintRows[3]='111110111111';
 assert(auditB116Corridor(d).issueCodes.includes('SOURCE_MASK_ROOM_CORE_OR_STAIR_CONFLICT'));
});
test('staged upper floor aperture and B105 proxy at height +1 or +2 rejected',()=>{
 const a=scene();a.proposedApertures.add('6,3');
 assert(auditB116Corridor(a).issueCodes.includes('STAGED_FLOOR_APERTURE_REMOVES_SUPPORT'));
 for(const y of [6,7]){const b=scene();b.sourceVoxels=[{x:7,y,z:3,kind:'WALL_PROXY'}];
  assert(auditB116Corridor(b).issueCodes.includes('SOURCE_B105_HEADROOM_OCCUPANCY'));}
 const c=scene();c.sourceVoxels=[{x:7,y:8,z:3,kind:'ROOF_PROXY'}];
 assert.equal(auditB116Corridor(c).status,'NO_CONFLICT_IN_SCOPED_SOURCE_PROXIES');
});
test('3D staged stair box blocks corridor; avoid false physical certification',()=>{
 const a=scene();a.stairAABBs=[{x:6.2,y:6.5,z:3.1,width:.4,height:.5,depth:.7}];
 assert(auditB116Corridor(a).issueCodes.includes('STAGED_STAIR_TREAD_OR_LANDING_AABB'));
});
test('fake gallery and bad added-cells delta are not accepted',()=>{
 const a=scene();a.existingWalk=new Set(['10,3','10,4']);
 const r=auditB116Corridor(a);
 assert(r.issueCodes.includes('SOURCE_GALLERY_DELTA_MISMATCH'));
 assert(r.issueCodes.includes('GOAL_NOT_CONNECTED_TO_TWO_ADJACENT_SOURCE_GALLERY_CELLS'));
});
test('disconnected route footprint and duplicates are rejected',()=>{
 const a=scene();a.proposal={...proposal,fullFootprintCells:[...f,p(11,11)]};
 assert(auditB116Corridor(a).issueCodes.includes('STRANDED_ROUTE_CELL'));
 const b=scene();b.proposal={...proposal,fullFootprintCells:[...f,f[0]]};
 assert(auditB116Corridor(b).issueCodes.includes('DUPLICATE_ROUTE_FOOTPRINT'));
});
test('B116 proof cannot issue construction commands',()=>{
 const r=auditB116Corridor(scene());
 assert.equal(r.constructionAllowed,false);
 for(const x of ['BuildPlan','worldCoordinates','operations'])assert.equal(Object.hasOwn(r,x),false);
});
