import test from 'node:test';
import assert from 'node:assert/strict';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {assessB121JointPose,exploreB121JointDesigns} from './b121-joint-corridor-planner.mjs';
const floor=()=>({footprintRows:Array(26).fill('1'.repeat(26)),rooms:[],gallery:[]});
function scene(){
 const design={plan:{floors:[floor(),floor()],cores:[{x:10,z:8,width:2,depth:2}]}};
 const stair={stairIndex:0,fromLevel:0,toLevel:1,coreIndex:0,
  proposedOrigin:{x:8,z:8},proposedAscent:{dx:1,dz:0}};
 const model=straightModel(stair.proposedOrigin,stair.proposedAscent,0);
 const sourceWalk=[new Set(['5,8','5,9']),new Set(['18,8','18,9'])];
 return {design,stair,model,sourceWalk,stagedWalk:[new Set(),new Set()],
  otherStairs:[],otherStairCells:[new Set(),new Set()],
  otherOpenings:[new Set(),new Set()],sourceSolidMap:new Map()};
}
test('no protected source edits and 2-wide connection at both levels',()=>{
 const a=scene(),r=assessB121JointPose(a);
 assert.equal(r.status,'CONDITIONAL_NO_STAGED_GALLERY_RELOCATION',r.reasonCodes.join(','));
 assert.equal(r.paths.LOWER.sourceRootedTwoWideCandidate,true);
 assert.equal(r.paths.UPPER.sourceRootedTwoWideCandidate,true);
 assert.equal(r.immutableSourceGalleryChanged,false);
 assert.equal(r.physicalWalkabilityCertified,false);
});
test('conceptually overlapping a staged gallery is labeled reroute, never source demolition',()=>{
 const a=scene(),hit=a.model.footprint[0];a.stagedWalk[0].add(hit.x+','+hit.z);
 const r=assessB121JointPose(a);
 assert.equal(r.status,'CONDITIONAL_REQUIRES_STAGED_GALLERY_REROUTE',r.reasonCodes.join(','));
 assert.equal(r.softGalleryDisplacementCount,1);
 assert.equal(r.stagedNetworkReconnectedCertified,false);
 assert.equal(r.hypotheticalEditsApplied,false);
});
test('immutable source gallery stays a hard blocker even if also staged',()=>{
 const a=scene(),q=a.model.footprint[0],k=q.x+','+q.z;
 a.sourceWalk[0].add(k);a.stagedWalk[0].add(k);
 const r=assessB121JointPose(a);
 assert.equal(r.status,'REJECTED_CONSERVATIVE_PROXY');
 assert(r.reasonCodes.includes('IMMUTABLE_SOURCE_GALLERY'));
});
test('protected room and missing floor never pass staged rerouting',()=>{
 const a=scene();a.design.plan.floors[0].rooms.push({x:9,z:8,width:1,depth:2});
 assert(assessB121JointPose(a).reasonCodes.includes('PROTECTED_ROOM'));
 const b=scene();b.design.plan.floors[0].footprintRows[8]='1'.repeat(8)+'0'+'1'.repeat(17);
 assert(assessB121JointPose(b).reasonCodes.includes('FLOOR_MASK_OUTSIDE'));
});
test('other stair collision and headroom block hypothetical relocation',()=>{
 const a=scene();a.otherStairCells[0].add('8,8');
 assert(assessB121JointPose(a).reasonCodes.includes('OTHER_STAIR_FOOTPRINT'));
 const b=scene(),v=b.model.body[0];
 for(let y=Math.floor(v.y);y<Math.ceil(v.y+v.height);y++)
  for(let z=Math.floor(v.z);z<Math.ceil(v.z+v.depth);z++)
  for(let x=Math.floor(v.x);x<Math.ceil(v.x+v.width);x++)
   b.sourceSolidMap.set(x+','+y+','+z,{x,y,z});
 assert(assessB121JointPose(b).reasonCodes.includes('B105_PLAYER_BODY'));
});
test('both levels must route to original source, not only pending staged gallery',()=>{
 const a=scene();a.sourceWalk[1]=new Set();a.stagedWalk[1]=new Set(['18,8','18,9']);
 const r=assessB121JointPose(a);
 assert.equal(r.status,'REJECTED_CONSERVATIVE_PROXY');
 assert(r.reasonCodes.includes('UNREACHABLE_IMMUTABLE_SOURCE_GALLERY_UPPER'));
});
test('U-turn model supports joint corridor screening with original design protected',()=>{
 const a=scene();
 a.design.plan.cores=[{x:8,z:7,width:1,depth:1}];
 a.stair.proposedOrigin={x:6,z:6};a.model=buildB120UTurn({origin:a.stair.proposedOrigin,
  ascent:{dx:1,dz:0},fromLevel:0,firstRise:2});
 a.sourceWalk=[new Set(['3,6','3,7']),new Set(['3,8','3,9'])];
 const r=assessB121JointPose(a);
 assert.equal(r.status,'CONDITIONAL_NO_STAGED_GALLERY_RELOCATION',r.reasonCodes.join(','));
 assert.equal(r.physicalWalkabilityCertified,false);
});
test('bounded joint search covers all straight + two U splits and does not apply changes',()=>{
 const a=scene(),r=exploreB121JointDesigns({...a,maxShift:0});
 assert.equal(r.attempted,12);
 assert.equal(r.constructionAllowed,false);
 assert.equal(r.designAndAllSourceGalleriesUnmodified,true);
 assert.equal(r.allOriginalHeldExitsRemainHeld,true);
 assert.throws(()=>exploreB121JointDesigns({...a,maxShift:9}),/B121_UNBOUNDED_SEARCH/);
});
test('too many proposed staged gallery displacements rejects by explicit budget',()=>{
 const a=scene();
 for(const p of a.model.footprint)a.stagedWalk[0].add(p.x+','+p.z);
 const r=assessB121JointPose({...a,maxSoftRelocation:1});
 assert(r.reasonCodes.includes('SOFT_GALLERY_CHANGE_BUDGET_EXCEEDED'));
});
