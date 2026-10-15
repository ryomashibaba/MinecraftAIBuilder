import test from 'node:test';
import assert from 'node:assert/strict';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {auditB126StairMaterialization} from './b126-stair-blockstate-witness.mjs';
const P=(x,z)=>({x,z});
function build(ascent={dx:1,dz:0}){
 const model=straightModel(P(4,4),ascent,0);
 const upperFloor={footprintRows:Array(30).fill('1'.repeat(30)),rooms:[],gallery:[]};
 return {shape:'STRAIGHT_HALF_STEP_PROXY',model,upperFloor,
  sourceVoxels:[],b125CutCells:[],referenceCutCount:0,protectedWalk:new Set()};
}
test('5x2 stair block cells are unique, source footprint aligned and not executable',()=>{
 const a=build(),r=auditB126StairMaterialization(a);
 assert.equal(r.analyzedPotentialStairCells,10);
 assert.equal(new Set(r.blocks.map(b=>JSON.stringify(b.relativeDesignCell))).size,10);
 assert(r.blocks.every(b=>b.possibleWeirdoDirections.join(',')==='0,1,2,3'));
 assert(r.blocks.every(b=>b.actualFacingUnresolved&&b.scheduledForConstruction===false));
 assert.deepEqual(r.operations,[]);
 assert.equal(r.bedrockToEducationParityCertified,false);
 assert.equal(r.physicalPassageCertified,false);
});
test('all four cardinal rotations preserve 10 unique source cells',()=>{
 for(const ascent of [{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}]){
  const r=auditB126StairMaterialization(build(ascent));
  assert.equal(r.analyzedPotentialStairCells,10);
  assert.equal(r.blocks.filter(x=>x.relativeDesignCell.y===5).length,2);
 }
});
test('upper-floor retained slab overlapping top stair blocks is held',()=>{
 const r=auditB126StairMaterialization(build());
 assert.equal(r.retainedSlabBlockOverlapCount,2);
 assert.equal(r.status,'HOLD_STAIR_BLOCKSTATE_AND_SLAB_FIT');
});
test('conceptual floor cut covering two top-block cells removes only that scoped overlap',()=>{
 const a=build(),pre=auditB126StairMaterialization(a);
 const top=pre.blocks.filter(b=>b.relativeDesignCell.y===5).map(b=>b.relativeDesignCell);
 a.b125CutCells=top;a.referenceCutCount=top.length;
 const r=auditB126StairMaterialization(a);
 assert.equal(r.retainedSlabBlockOverlapCount,0);
 assert.equal(r.status,'NO_SCOPED_CANDIDATE_BLOCK_CONFLICT_BUT_STATE_UNVERIFIED');
 assert.equal(r.actualBlockFacingCertified,false);
});
test('immutable protected gallery cannot be treated as a cuttable floor',()=>{
 const a=build(),pre=auditB126StairMaterialization(a);
 const cell=pre.blocks.find(b=>b.relativeDesignCell.y===5).relativeDesignCell;
 a.b125CutCells=[cell];a.referenceCutCount=1;
 a.protectedWalk.add(cell.x+','+cell.z);
 const r=auditB126StairMaterialization(a);
 assert.equal(r.sourceGalleryCutConflicts,1);
 assert.equal(r.constructionAllowed,false);
});
test('a proposed stair cell replacing a source voxel is an explicit hard hold',()=>{
 const a=build(),pre=auditB126StairMaterialization(a);
 const c=pre.blocks[0].relativeDesignCell;
 a.sourceVoxels=[{...c,kind:'B105_PROTECTED_WALL'}];
 const r=auditB126StairMaterialization(a);
 assert(r.findings.some(f=>f.code==='PROPOSED_STAIR_BLOCK_REPLACES_SOURCE_B105_SOLID'));
});
test('U-turn cannot acquire invented block corner/landing mappings',()=>{
 const a=build();
 a.shape='B120_BOUNDED_U_RETURN_5_RISE';
 a.model=buildB120UTurn({origin:P(4,4),ascent:{dx:1,dz:0},fromLevel:0,firstRise:2});
 const r=auditB126StairMaterialization(a);
 assert.equal(r.analyzedPotentialStairCells,0);
 assert(r.findings.some(f=>f.code==='U_TURN_REQUIRES_EXACT_BLOCK_CORNER_AND_PLATFORM_MAPPING'));
 assert.equal(r.stateMappingAuthorized,false);
});
test('cut count and floor y drift are rejected before any candidate construction',()=>{
 const a=build();a.referenceCutCount=1;
 assert.throws(()=>auditB126StairMaterialization(a),/B126_UNPINNED_SOURCE_INPUT/);
 const b=build();b.b125CutCells=[{x:2,y:999,z:2}];b.referenceCutCount=1;
 assert.throws(()=>auditB126StairMaterialization(b),/B126_CUT_Y_REFERENCE_DRIFT/);
});
test('Education material and orientation remain speculative despite Bedrock keys',()=>{
 const r=auditB126StairMaterialization(build());
 assert.equal(r.genericBedrockEvidence.educationVersionParity,'UNVERIFIED');
 assert.equal(r.genericBedrockEvidence.relativeFacingMapping,'UNVERIFIED');
 assert.equal(r.genericBedrockEvidence.autoCornerStateOutcome,'UNVERIFIED');
 assert.equal(r.educationVersionBlockRegistryCertified,false);
 assert.equal(r.worldContacts,0);
 assert.equal(r.worldCoordinates,null);
});
