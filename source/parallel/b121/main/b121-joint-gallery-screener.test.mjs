import test from 'node:test';
import assert from 'node:assert/strict';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {auditB121JointPose,searchB121Joint} from './b121-joint-gallery-screener.mjs';
const floor=()=>({footprintRows:Array(26).fill('1'.repeat(26)),rooms:[],gallery:[]});
function scene(){
 const design={plan:{floors:[floor(),floor()],cores:[{x:8,z:7,width:1,depth:1}]}};
 const stair={fromLevel:0,toLevel:1,coreIndex:0,proposedOrigin:{x:6,z:6},proposedAscent:{dx:1,dz:0}};
 const model=buildB120UTurn({origin:stair.proposedOrigin,ascent:stair.proposedAscent,fromLevel:0,firstRise:2});
 const protectedWalkByLevel=[new Set(['3,6','3,7']),new Set(['3,8','3,9'])];
 return {design,stair,model,solidMap:new Map(),otherModels:[],
  protectedWalkByLevel,stagedGalleryByLevel:[new Set(),new Set()],
  occupiedByLevel:[new Set(),new Set()],aperturesByLevel:[new Set(),new Set()]};
}
test('tentative B114 corridors can be proposed for reroute without ever modifying baseline galleries',()=>{
 const a=scene(),original=JSON.stringify(a.protectedWalkByLevel.map(s=>[...s]));
 a.stagedGalleryByLevel[0].add('7,6');
 const x=auditB121JointPose(a);
 assert.equal(x.status,'SIMULTANEOUS_UNBUILT_STAIR_GALLERY_REPLAN_IDEA',x.counterfactualReasonCodes.join(','));
 assert(x.onlyStagedObstacle);assert.equal(x.stagedOverlap[0].footprintCells,1);
 assert(x.routeReplacementConcepts.LOWER.addedCells.length>0);
 assert(x.routeReplacementConcepts.UPPER.addedCells.length>0);
 assert.equal(JSON.stringify(a.protectedWalkByLevel.map(s=>[...s])),original);
 assert.equal(x.currentConstructionHOLD,true);
});
test('actual existing gallery remains immutable even if coincident with staged cells',()=>{
 const a=scene();a.protectedWalkByLevel[0].add('7,6');a.stagedGalleryByLevel[0].add('7,6');
 const x=auditB121JointPose(a);
 assert.equal(x.status,'IMMUTABLE_SOURCE_OR_OTHER_CONSTRAINT_HOLD');
 assert(x.counterfactualReasonCodes.includes('PRESERVED_GALLERY_FOOTPRINT'));
 assert.equal(x.stagedOverlap[0].footprintCells,0);
});
test('protected rooms, missing floor, other stairs and source wall remain hard blocks',()=>{
 for(const kind of ['room','floor','stair','wall']){
  const a=scene();a.stagedGalleryByLevel[0].add('7,6');
  if(kind==='room')a.design.plan.floors[0].rooms.push({x:7,z:6,width:1,depth:1});
  if(kind==='floor')a.design.plan.floors[0].footprintRows[6]='1'.repeat(7)+'0'+'1'.repeat(18);
  if(kind==='stair')a.occupiedByLevel[0].add('7,6');
  if(kind==='wall'){
   const b=a.model.body[0];
   a.solidMap.set(Math.floor(b.x)+','+Math.floor(b.y)+','+Math.floor(b.z),
    {x:Math.floor(b.x),y:Math.floor(b.y),z:Math.floor(b.z),kind:'SOURCE_WALL'});
  }
  const x=auditB121JointPose(a);
  assert.equal(x.status,'IMMUTABLE_SOURCE_OR_OTHER_CONSTRAINT_HOLD',kind);
 }
});
test('gallery reroute cannot succeed if original destination is absent',()=>{
 const a=scene();a.protectedWalkByLevel[1].clear();a.stagedGalleryByLevel[0].add('7,6');
 const x=auditB121JointPose(a);
 assert(x.counterfactualReasonCodes.includes('NO_TWO_WIDE_UPPER_GALLERY'));
 assert.equal(x.status,'IMMUTABLE_SOURCE_OR_OTHER_CONSTRAINT_HOLD');
});
test('bounded joint search tests 2 splits and 4 rotations, retaining all holds',()=>{
 const a=scene();a.stagedGalleryByLevel[0].add('7,6');
 const x=searchB121Joint({...a,maxShift:0});
 assert.equal(x.totals.examined,8);assert(x.totals.newlyViable>=1);
 assert.equal(x.allNineOriginalHoldsRemain,true);
 assert.equal(x.globalConnectivityCertified,false);
 assert.deepEqual(x.BuildPlan.operations,[]);
});
test('invalid/unbounded exploration is rejected and no mutation payload returned',()=>{
 const a=scene();
 assert.throws(()=>searchB121Joint({...a,maxShift:20}),/B121_UNBOUNDED_SEARCH/);
 const x=auditB121JointPose(a);
 assert.equal(x.executableOperations.length,0);
 assert.equal(x.actualMinecraftWalkabilityCertified,false);
 assert.equal(x.worldContacts,0);
});
