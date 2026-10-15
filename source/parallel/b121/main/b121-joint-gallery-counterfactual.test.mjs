import test from 'node:test';
import assert from 'node:assert/strict';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {inspectB121GalleryOverlay,searchB121JointGallery} from './b121-joint-gallery-counterfactual.mjs';
const p=(x,z)=>({x,z});
const floor=()=>({footprintRows:Array(25).fill('1'.repeat(25)),rooms:[],gallery:[]});
function fixture(){
 const design={plan:{floors:[floor(),floor()],cores:[{x:8,z:7,width:1,depth:1}]}};
 const stair={stairIndex:0,fromLevel:0,toLevel:1,coreIndex:0,
  proposedOrigin:p(6,6),proposedAscent:{dx:1,dz:0}};
 const model=buildB120UTurn({origin:p(6,6),ascent:{dx:1,dz:0},fromLevel:0,firstRise:2});
 return {design,stair,model,otherModels:[],solidMap:new Map(),
  sourceWalkByLevel:[new Set(['3,6','3,7']),new Set(['3,8','3,9'])],
  unbuiltB114GalleryByLevel:[new Set(['7,6']),new Set(['7,6'])],
  occupiedByLevel:[new Set(),new Set()],
  aperturesByLevel:[new Set(),new Set()]};
}
test('B114 unbuilt-only gallery overlap can be analysed without altering original galleries',()=>{
 const x=inspectB121GalleryOverlay(fixture());
 assert.equal(x.originalB120Status,'REJECTED_PROXY_CONFIGURATION');
 assert.equal(x.hypotheticalB120Status,'CONDITIONAL_U_TURN_DESIGN_ONLY',JSON.stringify(x.revisedConceptRejectionCodes));
 assert(x.b114UnbuiltGalleryCellsToRetire.length>=1);
 assert.equal(x.sourceGalleryCellsRetired,0);
 assert.equal(x.originalNineHoldsReleased,0);
 assert.equal(x.actualConstructionAllowed,false);
});
test('preexisting source gallery is never relaxed or retired',()=>{
 const s=fixture();s.unbuiltB114GalleryByLevel[0].delete('7,6');
 s.sourceWalkByLevel[0].add('7,6');
 const r=inspectB121GalleryOverlay(s);
 assert.equal(r.status,'NO_SOURCE_LOCKED_JOINT_PROXY_CANDIDATE');
 assert.equal(r.sourceGalleryCellsRetired,0);
 assert(r.revisedConceptRejectionCodes.includes('PRESERVED_GALLERY_FOOTPRINT'));
});
test('intersecting staged and original masks are rejected as ambiguous provenance',()=>{
 const s=fixture();s.sourceWalkByLevel[0].add('7,6');
 assert.throws(()=>inspectB121GalleryOverlay(s),/B121_STAGED_SOURCE_OVERLAP_UNCLASSIFIED/);
});
test('protected rooms and source B105 static proxies are never hypothetical concessions',()=>{
 const a=fixture();a.design.plan.floors[0].rooms=[{x:7,z:6,width:1,depth:1}];
 assert(inspectB121GalleryOverlay(a).revisedConceptRejectionCodes.includes('PROTECTED_ROOM'));
 const b=fixture();const v=b.model.body[0];
 b.solidMap.set(Math.floor(v.x)+','+Math.floor(v.y)+','+Math.floor(v.z),{
  x:Math.floor(v.x),y:Math.floor(v.y),z:Math.floor(v.z),kind:'B105_WALL'});
 assert(inspectB121GalleryOverlay(b).revisedConceptRejectionCodes.includes('B105_PLAYER_SWEEP_COLLISION'));
});
test('missing either lower or upper two-wide source-gallery root is never approved',()=>{
 const x=fixture();x.sourceWalkByLevel[1]=new Set();
 const r=inspectB121GalleryOverlay(x);
 assert.equal(r.status,'NO_SOURCE_LOCKED_JOINT_PROXY_CANDIDATE');
 assert.equal(r.actualConstructionAllowed,false);
});
test('bounded counterfactual exploration never changes original stair or world',()=>{
 const a=fixture();
 const r=searchB121JointGallery({...a,maxShift:0,constructModel:buildB120UTurn});
 assert.equal(r.tested,8);
 assert.equal(r.originalStairsUntouched,true);
 assert.equal(r.allProtectedSourceGalleryRetained,true);
 assert.equal(r.allOriginalNineHoldsRemain,true);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.worldContacts,0);
});
test('bounded search rejects unlimited poses and no construction payload is exposed',()=>{
 const a=fixture();
 assert.throws(()=>searchB121JointGallery({...a,maxShift:4,constructModel:buildB120UTurn}),/B121_INVALID_BOUNDED_SEARCH/);
 const out=inspectB121GalleryOverlay(a);
 for(const id of ['BuildPlan','worldCoordinates','executionAllowed','worldCommands'])
  assert.equal(Object.hasOwn(out,id),false);
});
