/**
 * OFFLINE OPT-IN B105->B110->B111 source-regeneration research.
 * Uses the frozen official compilers as dependencies; NEVER modifies original
 * inputs, canonical modules, B110 provenance or a Minecraft world. The existing
 * B111 preferred furniture orientation is NOT replaced; a separate research
 * selector tests whether an alternate B111-legal orientation can improve 2x2.
 * No actual Minecraft block-state, door width, walking or ART certification.
 */
import {auditB105} from '../source/parallel/b105/main/b105-building-volume.mjs';
import {deriveB110Interfaces,auditB110Model}
 from '../source/parallel/b110/main/b110-functional-interfaces.mjs';
import {modelB111Interiors,auditB111Model}
 from '../source/parallel/b111/main/b111-interior-access.mjs';
import {auditRoomTwoWide} from './b111-independent-two-wide-room-audit.mjs';
import {selectB111LegalBedOrientation}
 from './b111-original-anchor-orientation-selector.mjs';
import {proposeB111RoomTwoWide} from './b111-two-wide-furniture-whatif.mjs';

const key=(x,y,z)=>x+','+y+','+z;
const fail=(code)=>{throw Error('B111_B105_CHAIN_'+code);};
const snapshot=x=>JSON.stringify(x);
const validAudit=a=>a&&a.envelopeConflicts===0&&a.roofCoverageGaps===0&&
 a.portalVoidGaps===0&&a.furniturePathViolations===0&&a.stairInterfaceGaps===0&&a.issueCount===0;
const safe=x=>x?.constructionApproved===false&&x?.worldContacts===0&&
 x?.worldCoordinates===null&&x?.BuildPlan?.status==='NOT_PREPARED'&&
 x.BuildPlan.operations?.length===0&&x.BuildPlan.commandCount===0&&
 x.BuildPlan.worldCoordinates===null;
const eq=(a,b)=>snapshot(a)===snapshot(b);
function assertSource(volume,design){
 if(!safe(volume)||!safe(design))
  fail('B105_DESIGN_OR_WORLD_SAFETY_INVARIANT');
 const audit=auditB105(volume,design.plan);
 if(!validAudit(audit))
  fail('B105_SOURCE_AUDIT_'+JSON.stringify({
   envelopeConflicts:audit.envelopeConflicts,
   roofCoverageGaps:audit.roofCoverageGaps,
   portalVoidGaps:audit.portalVoidGaps,
   furniturePathViolations:audit.furniturePathViolations,
   stairInterfaceGaps:audit.stairInterfaceGaps,
   issueCount:audit.issueCount,
   issues:audit.geometryIssues?.slice(0,5)
  }));
}
const rid=(id,level,roomId)=>id+'/'+level+'/'+roomId;
function checkProposedRoom(room,chosen){
 if(chosen.status!=='UNADOPTED_SOURCE_ANCHOR_SHIFT'||
  chosen.maxAnchorShift!==1||chosen.fixtureChanges?.length!==room.furniture.length)
  fail('NOT_BOUNDED_SOURCE_PROPOSAL');
 const alter=room.furniture.map((f,i)=>{
  const p=chosen.fixtureChanges[i];
  if(p.fixtureIndex!==f.fixtureIndex||p.role!==f.role||
   !eq(p.originalAnchor,f.anchor)||!eq(p.originalFootprint,f.footprint)||
   p.shift>1||p.shift<0||!Number.isSafeInteger(p.researchAnchor.x)||
   !Number.isSafeInteger(p.researchAnchor.z))fail('ORIGINAL_FURNITURE_PROVENANCE');
  return {...structuredClone(f),anchor:structuredClone(p.researchAnchor),
   footprint:structuredClone(p.researchFootprint)};
 });
 const proof=auditRoomTwoWide({...room,furniture:alter});
 if(proof.status!=='2W_PROXY_CLEAR'||!proof.originalOneWideReachable)
  fail('RESEARCH_FURNITURE_TWO_WIDE_FALSE');
 return chosen.fixtureChanges;
}
/**
 * A single-building, non-mutating B105 candidate. Baseline uses genuine
 * B110/B111 compilers; proposals are generic geometry, never genre templates.
 * Changes the actual B105 research voxel IR and matching interior anchors,
 * then independently regenerates B110 and B111 using the original compilers.
 */
export function tryB105B110B111TwoWideOptIn(design,originalB105){
 const beforeDesign=snapshot(design),beforeB105=snapshot(originalB105);
 assertSource(originalB105,design);
 const originalB110=deriveB110Interfaces(design,originalB105);
 if(!auditB110Model(originalB110)||!safe(originalB110))fail('B110_BASELINE_INVALID');
 const originalB111=modelB111Interiors(design,originalB110);
 if(!auditB111Model(originalB111,design,originalB110)||!safe(originalB111))
  fail('B111_BASELINE_INVALID');
 const originalRoutes=originalB111.rooms.map(r=>({r,assessment:selectB111LegalBedOrientation(r)}));
 const shiftList=[];
 for(const {r,assessment} of originalRoutes){
  if(assessment.status!=='HOLD_REQUIRES_B110_ANCHOR_OR_ROOM')continue;
  const suggestion=proposeB111RoomTwoWide(r);
  if(suggestion.status!=='UNADOPTED_SOURCE_ANCHOR_SHIFT')
   fail('UNRESOLVED_REQUIRES_MORE_THAN_1_CELL');
  shiftList.push({level:r.level,roomId:r.roomId,
   original:r,changes:checkProposedRoom(r,suggestion)});
 }
 const b105=structuredClone(originalB105);
 const originalByLocation=new Map(originalB105.voxels.map(v=>[key(v.x,v.y,v.z),v]));
 if(originalByLocation.size!==originalB105.voxels.length)fail('B105_DUPLICATE_VOXELS');
 const remove=new Set(),insert=new Map();let movedAnchors=0;
 for(const s of shiftList){
  const entry=b105.interior.find(r=>r.level===s.level&&r.roomId===s.roomId);
  if(!entry||entry.fixtures.length!==s.changes.length)fail('B105_ROOM_INTERFACE_MISSING');
  const y=s.level*5+1,owner=s.level+':'+s.roomId;
  for(const [i,p] of s.changes.entries()){
   const before=p.originalAnchor,after=p.researchAnchor;
   if(!eq(entry.fixtures[i],before))fail('B105_B110_ORIGINAL_ANCHOR_NOT_SAME');
   const oldKey=key(before.x,y,before.z),nextKey=key(after.x,y,after.z);
   const originalMarker=originalByLocation.get(oldKey);
   if(originalMarker?.kind!=='FURNITURE_PLACEHOLDER'||
    originalMarker.owner!==owner||originalMarker.level!==s.level)
    fail('B105_ORIGINAL_MARKER_MISSING');
   remove.add(oldKey);
   if(insert.has(nextKey))fail('B105_DUPLICATE_FUTURE_ANCHORS');
   insert.set(nextKey,{...structuredClone(originalMarker),x:after.x,z:after.z});
   entry.fixtures[i]=structuredClone(after);
   if(oldKey!==nextKey)movedAnchors++;
  }
 }
 for(const k of insert.keys())if(originalByLocation.has(k)&&!remove.has(k))
  fail('B105_FUTURE_ANCHOR_OVERLAPS_OTHER_SOURCE');
 b105.voxels=b105.voxels.filter(v=>!remove.has(key(v.x,v.y,v.z)));
 for(const voxel of insert.values())b105.voxels.push(voxel);
 b105.voxels.sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x);
 if(b105.voxels.length!==originalB105.voxels.length)
  fail('B105_VOXEL_CARDINALITY_CHANGED');
 assertSource(b105,design);
 const nextB110=deriveB110Interfaces(design,b105);
 const nextB111=modelB111Interiors(design,nextB110);
 if(!auditB110Model(nextB110)||!safe(nextB110)||
  !auditB111Model(nextB111,design,nextB110)||!safe(nextB111))
  fail('REGENERATED_B110_OR_B111_INVALID');
 if(nextB110.fixtures.length!==originalB110.fixtures.length||
  nextB111.rooms.length!==originalB111.rooms.length)fail('ROOM_COUNT_CHANGED');
 const allOld=new Map(originalB111.rooms.map(r=>[rid(design.candidateId,r.level,r.roomId),r]));
 let unchangedClear=0,orientations=0,reanchored=0,notCleared=0;
 const candidates=[];
 for(const room of nextB111.rooms){
  const old=allOld.get(rid(design.candidateId,room.level,room.roomId));
  if(!old||!eq(old.roomRectangle,room.roomRectangle)||!eq(old.doorInterior,room.doorInterior)||
   !eq(old.furniture.map(f=>f.role),room.furniture.map(f=>f.role)))
   fail('B104_ROOM_OR_FUNCTION_CHANGED');
  const assessment=selectB111LegalBedOrientation(room);
  if(assessment.status==='ALREADY_2W_PROXY_CLEAR')unchangedClear++;
  else if(assessment.status==='UNADOPTED_B111_LEGAL_BED_ORIENTATION')orientations++;
  else notCleared++;
  const wasShifted=shiftList.some(s=>s.level===room.level&&s.roomId===room.roomId);
  if(wasShifted)reanchored++;
  candidates.push({level:room.level,roomId:room.roomId,
   sourceRoomUnchanged:!wasShifted,sourceStatus:assessment.status,
   proposedOrientation:assessment.alternative});
 }
 if(notCleared||unchangedClear+orientations!==nextB111.rooms.length||
  reanchored!==shiftList.length)fail('REGENERATED_2W_UNRESOLVED');
 if(beforeDesign!==snapshot(design)||beforeB105!==snapshot(originalB105))
  fail('ORIGINALS_CHANGED');
 const oldMarker=new Map(originalB105.voxels.filter(v=>v.kind==='FURNITURE_PLACEHOLDER')
  .map(v=>[key(v.x,v.y,v.z),v]));
 const newMarker=new Map(b105.voxels.filter(v=>v.kind==='FURNITURE_PLACEHOLDER')
  .map(v=>[key(v.x,v.y,v.z),v]));
 const changedMarkerPositions=[...oldMarker.keys()].filter(k=>!newMarker.has(k)).length;
 if(changedMarkerPositions!==[...newMarker.keys()].filter(k=>!oldMarker.has(k)).length)
  fail('PLACEHOLDER_MARKER_DELTA_NOT_BALANCED');
 const oldNonFurniture=originalB105.voxels.filter(v=>v.kind!=='FURNITURE_PLACEHOLDER');
 const newNonFurniture=b105.voxels.filter(v=>v.kind!=='FURNITURE_PLACEHOLDER');
 if(!eq(oldNonFurniture,newNonFurniture))fail('NON_FURNITURE_VOLUME_DRIFT');
 return {status:'UNADOPTED_REGENERATED_B105_B110_B111_SOURCE_ONLY',
  id:design.candidateId,
  summary:{rooms:nextB111.rooms.length,originalFixtureAnchors:originalB110.fixtures.length,
   reanchoredRooms:reanchored,reanchoredFixtureCount:movedAnchors,
   netFurniturePlaceholderMoves:changedMarkerPositions,
   twoWideDirect:unchangedClear,twoWideByLegalOrientation:orientations,
   twoWideUnresolved:notCleared,oldSourceGeometryUnchanged:true,
   actualMinecraftWalkingVerified:false,realBedrockBlocksVerified:false},
  changes:shiftList.map(s=>({level:s.level,roomId:s.roomId,
   before:s.changes.map(p=>p.originalAnchor),after:s.changes.map(p=>p.researchAnchor)})),
  orientationResearch:candidates.filter(c=>c.proposedOrientation),
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldContacts:0,worldWrites:0,
   BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')}};
}
