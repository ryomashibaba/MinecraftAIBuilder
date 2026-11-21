/** R120: source-authenticated R94 suspended daylight rib re-profile.
 * R119 confirms the surviving R118 first-hit (4535) is a LIGHT RIB, NOT
 * a second bench. Keep the real doorway, jamb, light edging and shelf.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor} from './b198zr107-compact-reading-table-recovery.mjs';
import {raiseR115LanternAndSupportedBookwall} from './b198zr115-integral-lantern-clerestory.mjs';
import {insetR118ActualConnectedSeat} from './b198zr118-reading-seat-clearance.mjs';
import {deriveR110SourceLane} from './b198zr110-source-contoured-right-room-approach.mjs';
import {identifyR111SourceOverhead} from './b198zr111-reversible-floor-finish-transition.mjs';
import {extractR104ActiveR91Throat} from './b198zr104-r91-active-throat-repair.mjs';
export const SCHEMA='minecraftaibuilder-b198zr120-raised-r94-lintel-with-reading-seat-v1';
export const RIB='right_R94_SUSPENDED_LIGHT_RIB_NOT_HEADROOM_CERTIFIED';
export const EDGE='right_R94_DAYLIGHT_EDGE_NOT_GUARD';
export const LIFTS=Object.freeze([.045,.070,.100,.135]);
const SHA=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const R=n=>+n.toFixed(7),K=p=>p.map(R).join(',');
const fail=n=>{throw Error('B198ZR120_'+n)};
const verts=f=>[f.a,f.b,f.c];
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const area=f=>{const u=f.b.map((x,i)=>x-f.a[i]),v=f.c.map((x,i)=>x-f.a[i]);return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;};
/** Keep both source R94 triangles, fixed outer shelf and jamb. Lift only
 * the interior peak of the lintel and its connected daylight edge.
 * Reject third-party shared vertices instead of silently cracking walls.
 */
export function liftR120RealDoorLightRib(faces,index,{rise}={}){
 if(!Array.isArray(faces)||!Number.isInteger(index)||index<0||
  index+1>=faces.length||!LIFTS.includes(rise)||
  faces[index]?.kind!==RIB||faces[index+1]?.kind!==EDGE)
  fail('VERIFIED_R94_RIB_AND_ATTACHED_DAYLIGHT_EDGE_REQUIRED');
 const rib=faces[index],edge=faces[index+1],original=SHA(faces);
 if(K(rib.a)!==K(edge.a)||K(rib.c)!==K(edge.b)||
  K(rib.a)===K(rib.b)||K(rib.b)===K(rib.c)||
  Math.abs(rib.a[2]-rib.b[2])>.00001||
  Math.abs(rib.c[2]-rib.b[2])>.03)
  fail('TRUE_R94_DAYLIGHT_RIB_SHARED_PEAK_TOPOLOGY_REQUIRED');
 const lift=p=>[p[0],R(p[1]+rise),p[2]],move=new Map();
 move.set(K(rib.b),lift(rib.b));move.set(K(rib.c),lift(rib.c));
 // The source doorway is never moved. Any additional consumer of the
 // raised lintel vertex would introduce an untracked disconnected seam.
 if(faces.some((f,i)=>i!==index&&i!==index+1&&
  verts(f).some(p=>move.has(K(p)))))
  fail('ADJACENT_ORIGINAL_ARCHITECTURE_SHARES_LIFTED_RIB_TIP');
 for(const p of move.values()){
  const roof=.98-.095*(p[2]-.17)**2;
  if(p[1]>=roof-.09)fail('ORIGINAL_RIGHT_SHELL_DAYLIGHT_MARGIN_EXCEEDED');
 }
 const raised=faces.map((f,i)=>{
  if(i!==index&&i!==index+1)return f;
  return {kind:f.kind,...Object.fromEntries(['a','b','c'].map(k=>
   [k,move.get(K(f[k]))??f[k]]))};
 });
 if(raised.length!==faces.length||area(raised[index])<1e-10||
  area(raised[index+1])<1e-10||SHA(raised)===original||
  raised.some((f,i)=>i!==index&&i!==index+1&&
   JSON.stringify(f)!==JSON.stringify(faces[i])))
  fail('NONLOCAL_OR_DEGENERATE_R94_CREST');
 return {faces:raised,changedIndices:[index,index+1],rise,
  originalSha256:original,changedSha256:SHA(raised),
  preservedOuterBookShelf:rib.a,preservedOuterDaylightEdge:edge.c,
  originalR94DoorwayJambUntouched:true,originalR93BenchStillPresent:true};
}
export function studyR120RibAndReadingBench(r107){
 if(!r107||r107.originalR98Faces?.length!==4692||
  SHA(r107.faces)!==r107.report?.alternativeR107Sha256||
  SHA(r107.originalR98Faces)!==r107.report?.originalR98Sha256||
  !r107.report?.originalR98Preserved)
  fail('ARCHIVED_REAL_R107_R98_MESH_REQUIRED');
 const original=r107.faces,r98=r107.originalR98Faces,old=SHA(original);
 const elevated=raiseR115LanternAndSupportedBookwall(original,4474,{rise:.16});
 const inset=insetR118ActualConnectedSeat(elevated.faces,4476,.55);
 const baseline=deriveR110SourceLane(inset.faces,r98,.035,{gap:.003});
 const identified=identifyR111SourceOverhead(baseline);
 if(!baseline.sourceCoverageComplete||!identified.allCaptured||
  identified.overheadCount!==7||identified.sourceIndices.join(',')!=='4535'||
  inset.faces[4535]?.kind!==RIB||inset.faces[4536]?.kind!==EDGE)
  fail('R119_SOURCE_R94_INTRUSIVE_DAYLIGHT_RIB_4535_REQUIRED');
 const originalOtherLanes=auditR107AdjacentCorridor(original,extractR104ActiveR91Throat(r98));
 let chosen=null;const trials=[];
 for(const rise of LIFTS){
  try{
   const moved=liftR120RealDoorLightRib(inset.faces,4535,{rise});
   const lane=deriveR110SourceLane(moved.faces,r98,.035,{gap:.003});
   const old5=auditR107AdjacentCorridor(moved.faces,extractR104ActiveR91Throat(r98));
   const nonregressing=old5.allFiniteSourceLanesScreened&&
    originalOtherLanes.surrogateLanes.every((old,i)=>{
     const now=old5.surrogateLanes[i];
     return now.floor<=old.floor&&now.headroom<=old.headroom&&now.lateral<=old.lateral;
    });
   const counts=lane.measured?.witnessCounts;
   const hits=counts?identifyR111SourceOverhead(lane):null;
   const acceptable=!!counts&&lane.sourceCoverageComplete&&
    lane.measured.allDeclaredSourceSegmentsWithinProbeCoverage&&
    hits.allCaptured&&counts.floor===0&&counts.lateral===0&&
    counts.overhead<7&&nonregressing;
   const delta=[...new Set([...elevated.changedIndices,...inset.indices,...moved.changedIndices])].sort((a,b)=>a-b);
   if(delta.length>40||delta.some(i=>![
    'right_R93_LANTERN_BOOKWALL_NOT_CERTIFIED',
    'right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY',
    'right_R93_CONTINUOUS_READING_SEAT_LEDGE_NOT_OCCUPANCY_CERTIFIED',RIB,EDGE
   ].includes(original[i]?.kind)))fail('UNAPPROVED_ARCHITECTURAL_FACET');
   const record={rise,changedSourceFaceIndices:delta,
    genuineR94RibAndDaylightEdgeRetained:true,originalDoorwayJambUntouched:true,
    sourceFloorAllNineByThree:lane.sourceCoverageComplete,
    floor:counts?.floor??null,overhead:counts?.overhead??null,
    lateral:counts?.lateral??null,
    firstOverheadIndices:hits?.sourceIndices??[],
    firstOverheadKinds:hits?.sourceKinds??[],
    oldFiveSourceCorridorsNonregressing:nonregressing,acceptedBySourceGeometry:acceptable,
    sourceMeshSha256:moved.changedSha256};
   trials.push(record);
   if(acceptable&&(!chosen||record.overhead<chosen.record.overhead||
       record.overhead===chosen.record.overhead&&rise<chosen.record.rise))
    chosen={faces:moved.faces,record};
  }catch(err){
   const message=String(err?.message??err);
   if(!message.startsWith('B198ZR120_'))throw err;
   trials.push({rise,acceptedBySourceGeometry:false,rejection:message});
  }
 }
 if(trials.length!==LIFTS.length||SHA(original)!==old)
  fail('FOUR_REAL_SOURCE_RIB_OPTIONS_AND_HISTORIC_SOURCE_REQUIRED');
 const active=chosen?.faces??original;
 return {faces:active,report:{schema:SCHEMA,
  sourceR107Sha256:old,sourceR98Sha256:SHA(r98),
  provenR119CollisionTriangle:4535,
  provenR119CollisionKind:RIB,originalR118Overhead:7,
  revisionIncludesAuthenticSeatAndCanopy:true,
  studiedLightRibLifts:trials,selected:chosen?.record??null,
  geometryChanged:!!chosen,activeSha256:SHA(active),
  status:chosen?'SOURCE_3D_R94_RIB_REVISION_AWAITING_ART_AND_WALK_REVIEW':
   'HOLD_NO_REAL_SOURCE_PROVEN_R94_RIB_CLEARANCE',
  humanWalkingApproved:false,windowLightAndLoadCertified:false,
  humanArtApproval:'NOT_REVIEWED',realModelGeneralizationUnchanged:true,
  safety:safety()}};
}
export function buildR120LightRibStudy(nodes){
 return studyR120RibAndReadingBench(buildR107CompactReadingStudy(nodes));
}
