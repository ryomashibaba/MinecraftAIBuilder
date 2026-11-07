/**
 * B198Z-R115: an architectural lantern clerestory, not a probe trick.
 * The original R93 canopy and its real outer book-wall form a continuous
 * elevated roof+wall ensemble. Extend the book wall upward while lifting
 * the complete canopy (not merely its inner tip) above the R91 approach.
 * Retain footprint, true terrace, desk, doorway, skylight program.
 * Evidence gates reject cracked joins, bad headroom and damaged old lanes.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor}
 from './b198zr107-compact-reading-table-recovery.mjs';
import {retreatR112SourceCanopy,CANOPY}
 from './b198zr112-lantern-canopy-clearance.mjs';
import {deriveR110SourceLane}
 from './b198zr110-source-contoured-right-room-approach.mjs';
import {identifyR111SourceOverhead}
 from './b198zr111-reversible-floor-finish-transition.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';

export const SCHEMA='minecraftaibuilder-b198zr115-integral-lantern-clerestory-v1';
export const WALL='right_R93_LANTERN_BOOKWALL_NOT_CERTIFIED';
export const ELEVATIONS=Object.freeze([.07,.10,.13,.16]);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const R=x=>+x.toFixed(7);
const key=p=>p.map(R).join(',');
const fail=x=>{throw Error('B198ZR115_'+x)};
const V=f=>[f.a,f.b,f.c];
const area=f=>{const a=f.a,b=f.b,c=f.c,
 u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],
 u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});

/** Alter only one historically witnessed R93 canopy bay and its ORIGINAL
 * two-triangle book wall. All changed upper vertices move as one; lower
 * shelf vertices and every other floor, furnishing and shell face remain.
 */
export function raiseR115LanternAndSupportedBookwall(faces,hitIndex,{rise}={}){
 if(!Array.isArray(faces)||faces.length<4||!Number.isInteger(hitIndex)||
  hitIndex<0||hitIndex>=faces.length||faces[hitIndex]?.kind!==CANOPY||
  !ELEVATIONS.includes(rise))
  fail('EXACT_REAL_CANOPY_AND_APPROVED_LIFT_REQUIRED');
 const sourceHash=hash(faces);
 const linked=retreatR112SourceCanopy(faces,hitIndex,{fraction:.55});
 const canopies=linked.changedIndices;
 if(canopies.length!==2)fail('CANOPY_BAY_TOPOLOGY_DRIFT');
 const zGroups=new Map(),top=new Map();
 for(const i of canopies)for(const vertex of V(faces[i])){
  const z=R(vertex[2]).toString();
  if(!zGroups.has(z))zGroups.set(z,new Map());
  zGroups.get(z).set(key(vertex),vertex);
 }
 if(zGroups.size!==2)fail('TWO_REAL_R93_STATIONS_REQUIRED');
 const outer=new Set();
 for(const group of zGroups.values()){
  const pair=[...group.values()].sort((a,b)=>a[0]-b[0]);
  if(pair.length!==2||pair[1][0]-pair[0][0]<.016)
   fail('ACTUAL_INNER_AND_OUTER_R93_RIBS_REQUIRED');
  outer.add(key(pair[1]));
  for(const q of pair){
   const raised=[q[0],R(q[1]+rise),q[2]];
   // Geometric R93 roof envelope, not a load or human occupancy guarantee.
   const above=.98-.095*(q[2]-.17)**2-.09;
   if(raised[1]>=above)fail('R93_DAYLIGHT_SHELL_MARGIN_TOO_SMALL');
   top.set(key(q),raised);
  }
 }
 const zStations=new Set([...zGroups.keys()]);
 const walls=faces.map((f,i)=>({f,i})).filter(({f})=>
  f.kind===WALL&&V(f).every(q=>zStations.has(R(q[2]).toString()))&&
  V(f).some(q=>outer.has(key(q)))).map(x=>x.i);
 if(walls.length!==2)fail('SOURCE_JOINED_LANTERN_BOOKWALL_NOT_FOUND');
 const changed=new Set([...canopies,...walls]);
 // No hanging joins: if any other facet uses a lifted vertex it must also
 // move; otherwise this option needs a wider architectural redesign.
 const outside=faces.map((f,i)=>({i,f})).filter(({i,f})=>
  !changed.has(i)&&V(f).some(p=>top.has(key(p))));
 if(outside.length)fail('SOURCE_VERTEX_USED_BY_ADJACENT_UNMODIFIED_ARCHITECTURE');
 const updated=faces.map((f,i)=>{
  if(!changed.has(i))return f;
  return {kind:f.kind,...Object.fromEntries(['a','b','c'].map(k=>
    [k,top.get(key(f[k]))??f[k]]))};
 });
 if(updated.length!==faces.length||updated.some((f,i)=>
  f.kind!==faces[i].kind||
  (changed.has(i)?area(f)<1e-10:JSON.stringify(f)!==JSON.stringify(faces[i])))||
  hash(updated)===sourceHash||changed.size!==4)
  fail('NONLOCAL_OR_DEGENERATE_SOURCE_LANTERN_REVISION');
 for(const i of walls)for(const k of ['a','b','c']){
  const point=faces[i][k],p=updated[i][k];
  // All original low shelf anchors must stay unchanged.
  if(!outer.has(key(point))&&JSON.stringify(p)!==JSON.stringify(point))
   fail('LOWER_BOOKSHELF_FOOTPRINT_WAS_MODIFIED');
 }
 return {faces:updated,sourceSha256:sourceHash,
  candidateSha256:hash(updated),sourceHitIndex:hitIndex,
  changedIndices:[...changed].sort((a,b)=>a-b),
  originalCanopyTriangleCount:canopies.length,originalBookwallTriangleCount:walls.length,
  connectedOuterShelfStations:outer.size,actualLift:rise,
  oldFacesUnaffected:faces.length-changed.size,
  materialProgram:'HIGHER_LANTERN_CLERESTORY_OVER_REAL_BOOK_WALL',
  floorDeskAtriumAndEntryUntouched:true,sourceOriginKept:true};
}
export function studyR115IntegralLantern(r107){
 if(!r107||!Array.isArray(r107.faces)||!Array.isArray(r107.originalR98Faces)||
  r107.originalR98Faces.length!==4692||
  hash(r107.faces)!==r107.report?.alternativeR107Sha256||
  hash(r107.originalR98Faces)!==r107.report?.originalR98Sha256||
  !r107.report.originalR98Preserved)
  fail('UNALTERED_ARCHIVED_R107_AND_R98_REQUIRED');
 const original=deriveR110SourceLane(r107.faces,r107.originalR98Faces,.035,{gap:.003});
 const hits=identifyR111SourceOverhead(original);
 if(!original.sourceCoverageComplete||!hits.allCaptured||
  hits.overheadCount!==7||hits.sourceIndices.length!==1||
  hits.sourceIndices[0]!==4474||hits.sourceHits.some(h=>h.kind!==CANOPY))
  fail('R111_SEVEN_PROVEN_R93_CANOPY_HITS_REQUIRED');
 const throat=extractR104ActiveR91Throat(r107.originalR98Faces);
 const baseline=auditR107AdjacentCorridor(r107.faces,throat);
 const proposals=[];let best=null;
 for(const rise of ELEVATIONS){
  try{
   const changed=raiseR115LanternAndSupportedBookwall(
    r107.faces,4474,{rise});
   const route=deriveR110SourceLane(changed.faces,r107.originalR98Faces,
    .035,{gap:.003});
   const five=auditR107AdjacentCorridor(changed.faces,throat);
   const oldLanesStillClear=five.allFiniteSourceLanesScreened&&
    baseline.surrogateLanes.every((a,i)=>{
     const after=five.surrogateLanes[i];
     return after.floor<=a.floor&&after.headroom<=a.headroom&&
      after.lateral<=a.lateral;
    });
   const counts=route.measured?.witnessCounts;
   const eligible=!!counts&&route.sourceCoverageComplete&&
    route.measured.allDeclaredSourceSegmentsWithinProbeCoverage&&
    counts.floor===0&&counts.lateral===0&&
    counts.overhead<7&&oldLanesStillClear;
   const record={rise,realModifiedFaces:changed.changedIndices,
    footprintAndExteriorStructureRetained:true,
    nineByThreeFloorSourceSupported:route.sourceCoverageComplete,
    sourceSegmentProbesComplete:route.measured?.allDeclaredSourceSegmentsWithinProbeCoverage??false,
    floor:counts?.floor??null,overhead:counts?.overhead??null,
    lateral:counts?.lateral??null,allOldFiveLanesNonregressing:oldLanesStillClear,
    acceptedByResearchGeometry:eligible,
    sourceMeshSha256:changed.candidateSha256};
   proposals.push(record);
   if(eligible&&(!best||record.overhead<best.record.overhead||
    record.overhead===best.record.overhead&&rise<best.record.rise))
    best={record,...changed};
  }catch(e){proposals.push({rise,acceptedByResearchGeometry:false,
    geometricRejection:String(e)});}
 }
 const active=best?.faces??r107.faces;
 return {faces:active,report:{schema:SCHEMA,sourceR98Sha256:hash(r107.originalR98Faces),
  sourceR107Sha256:hash(r107.faces),activeSha256:hash(active),
  oldHeadroom:7,provenObstructingR93Triangle:4474,
  candidateCount:proposals.length,candidates:proposals,
  selection:best?.record??null,geometryChanged:!!best,
  actualFacetsAltered:best?.changedIndices.length??0,
  decision:best?
   'SOURCE_GEOMETRY_CLERESTORY_CANDIDATE_REQUIRES_ART_REVIEW':
   'HOLD_NO_EVIDENCE_SUPPORTED_CLERESTORY_CHANGE',
  originalRoomFloorDeskEntryAndShellRetained:true,
  sourceOriginalsNeverOverwritten:true,
  independentVisualQuality:'NOT_REVIEWED',
  realPhysicalWalkabilityCertified:false,structuralLoadApproved:false,
  originalModelGenerativeSkillImproved:false,safety:safety()}};
}
export function buildR115IntegralLanternStudy(nodes){
 return studyR115IntegralLantern(buildR107CompactReadingStudy(nodes));
}
