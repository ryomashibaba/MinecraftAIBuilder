/**
 * R110: revise the right-tier2 approach as a source-contoured 3D circulation
 * proposal rather than destroying an existing reading-room floor triangle.
 * The unchanged mesh is audited at nine x/z stations, three width samples,
 * and every connecting segment. This is a research proxy, not human walking.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy} from './b198zr107-compact-reading-table-recovery.mjs';
import {inspectR109RealFloorReferencedRoute,findR109LocalFloorDatum}
 from './b198zr109-realfloor-referenced-r91-route.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';
import {screenR99FiniteRoute,PROXY}
 from './b198zr99-finite-volume-route-witness.mjs';

export const SCHEMA='minecraftaibuilder-b198zr110-source-contoured-right-room-approach-v1';
export const PROFILE_STATIONS=Object.freeze([0,.125,.25,.375,.5,.625,.75,.875,1]);
export const FOOT_GAPS=Object.freeze([.003,.004,.005,.006]);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const R=x=>+x.toFixed(7);
const fail=x=>{throw Error('B198ZR110_'+x)};
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
/** Existing R91 cross-sections define position; never assume a new floor. */
export function deriveR110SourceLane(faces,original,offset=.035,{gap=.003}={}){
 if(!Array.isArray(faces)||!Array.isArray(original)||original.length!==4692||
  !Number.isFinite(offset)||Math.abs(offset)>.03501||
  !FOOT_GAPS.includes(gap))
  fail('AUTHENTICATED_REAL_SOURCE_AND_BOUNDED_GAP_REQUIRED');
 const throat=extractR104ActiveR91Throat(original);
 const a=mid(...throat.middle),b=mid(...throat.terminal);
 const dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);
 if(length<.001)fail('SOURCE_R91_PLANAR_LENGTH_REQUIRED');
 const normal=[dz/length,-dx/length];
 const sourcePoints=PROFILE_STATIONS.map(t=>{
  const p=lerp(a,b,t);
  return [R(p[0]+normal[0]*offset),R(p[1]),
   R(p[2]+normal[1]*offset)];
 });
 const rows=sourcePoints.map((p,i)=>{
  const source=findR109LocalFloorDatum(faces,p);
  if(!source)return {t:PROFILE_STATIONS[i],sourcePoint:p,
    hasRealSourceFloor:false};
  const q=[p[0],R(source.sourceElevation+gap),p[2]];
  const across=[-PROXY.halfWidth,0,PROXY.halfWidth].map(o=>{
   const sample=[R(p[0]+o*normal[0]),p[1],R(p[2]+o*normal[1])];
   const floor=findR109LocalFloorDatum(faces,sample);
   const heightGap=floor===null?null:R(q[1]-floor.sourceElevation);
   return {offset:o,sourceTriangle:floor?.sourceTriangle??null,
    sourceKind:floor?.kind??null,
    floorElevation:floor?.sourceElevation??null,
    footAboveFloor:heightGap,
    boundedRealFloor:heightGap!==null&&heightGap>=.001&&heightGap<=.012};
  });
  return {t:PROFILE_STATIONS[i],sourcePoint:p,
   proposedPoint:q,hasRealSourceFloor:true,
   floorTriangle:source.sourceTriangle,floorKind:source.kind,
   sourceElevation:source.sourceElevation,footGap:gap,
   widthWitnesses:across,
   allThreeRealFloorSamples:across.every(w=>w.boundedRealFloor)};
 });
 const available=rows.every(w=>w.hasRealSourceFloor);
 const route=available?rows.map(w=>w.proposedPoint):null;
 const grades=route?route.slice(1).map((p,i)=>{
  const from=route[i],planar=Math.hypot(p[0]-from[0],p[2]-from[2]);
  return planar<1e-9?Infinity:R(Math.abs(p[1]-from[1])/planar);
 }):[];
 const coverage=available&&rows.every(w=>w.allThreeRealFloorSamples)&&
  grades.every(g=>g<=.28);
 const measured=coverage?screenR99FiniteRoute(faces,route):null;
 return {offset,gap,sourcePoints,profile:rows,route,
  stationCount:rows.length,sourceCoverageComplete:coverage,
  maxPlanarGrade:grades.length?Math.max(...grades):null,
  widthHalfSpan:PROXY.halfWidth,measured,
  unapprovedFullHumanBodySweep:false,
  rejectedReason:!available?'NO_REAL_SOURCE_FLOOR_AT_PROFILE_STATION':
    !coverage?'SOURCE_FLOOR_HEIGHT_OR_GRADE_DISCONTINUITY':
    !measured?.allDeclaredSourceSegmentsWithinProbeCoverage?
    'R99_DISCRETE_PROBES_INCOMPLETE':'SOURCE_PROFILE_SAMPLED'};
}
export function inspectR110RightSourceContouredApproach(r107){
 if(!r107||!Array.isArray(r107.faces)||!Array.isArray(r107.originalR98Faces)||
  r107.originalR98Faces.length!==4692||
  sha(r107.faces)!==r107.report?.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256)
  fail('R107_UNALTERED_REAL_MESH_REQUIRED');
 const r109=inspectR109RealFloorReferencedRoute(r107);
 const failed=r109.lanes.find(l=>l.offset===.035);
 const success=r109.lanes.find(l=>l.offset===.023);
 if(r109.overheadBefore!==2||r109.verifiedFloorDatumLanes!==1||
  r109.conditionalProxyOverheadAfter!==1||
  failed?.previous.overhead!==1||failed.accepted||
  !success?.accepted||success.candidate?.overhead!==0)
  fail('R109_MEASURED_ONE_CLEAR_ONE_UNRESOLVED_REQUIRED');
 const reference=screenR99FiniteRoute(r107.faces,failed.proposedRoute);
 if(reference.witnessCounts.overhead!==1||reference.witnessCounts.floor!==0||
  reference.witnessCounts.lateral!==0)
  fail('R109_BASELINE_REPRODUCIBILITY_REQUIRED');
 const tests=FOOT_GAPS.map(gap=>deriveR110SourceLane(
  r107.faces,r107.originalR98Faces,.035,{gap}));
 const qualified=tests.filter(x=>x.sourceCoverageComplete&&
  x.measured?.allDeclaredSourceSegmentsWithinProbeCoverage&&
  x.measured.witnessCounts.floor===0&&
  x.measured.witnessCounts.lateral===0&&
  x.measured.witnessCounts.overhead<reference.witnessCounts.overhead);
 const selected=qualified[0]??null;
 const old=r109.lanes.map(x=>({
  offset:x.offset,floor:x.previous.floor,
  overhead:x.previous.overhead,lateral:x.previous.lateral}));
 // Compare exact same source mesh. Improvements reflect the circulation
 // route proposal ONLY, not an architectural build or material edit.
 const conditional={...Object.fromEntries([
  ['floor',0],['overhead',r109.conditionalProxyOverheadAfter],
  ['lateral',0]])};
 if(selected)conditional.overhead=success.candidate.overhead+
  selected.measured.witnessCounts.overhead;
 return {schema:SCHEMA,sourceMeshSha256:sha(r107.faces),
  historicalR98Sha256:sha(r107.originalR98Faces),
  geometryChanged:false,existingBuildingTriangles:r107.faces.length,
  previousRawSourceLaneOverheadTotal:r109.overheadBefore,
  r109ConditionalTotal:r109.conditionalProxyOverheadAfter,
  r110ConditionalTotal:conditional.overhead,
  verifiedFiveSourceLanes:old,
  candidateCount:tests.length,
  rejectedCandidateCount:tests.length-qualified.length,
  candidateSummaries:tests.map(x=>({
   footGap:x.gap,fullyGrounded:x.sourceCoverageComplete,
   maxPlanarGrade:x.maxPlanarGrade,
   measuredCounts:x.measured?.witnessCounts??null,
   rejection:x.rejectedReason,
   supportedStations:x.profile.filter(y=>y.allThreeRealFloorSamples).length
  })),
  selectedProfile:selected?.profile??null,
  selectedRoute:selected?.route??null,
  selectedFootGap:selected?.gap??null,
  qualifiedByBoundedFloorSource:!!selected,
  priorR109OtherFourLanesPreserved:true,
  sourceGeometryAndReadingFurnitureUnchanged:true,
  decision:selected?
   'CANDIDATE_SOURCE_CONTOURED_ROOM_APPROACH_NOT_ACTUAL_WALKING':
   'HOLD_ACTUAL_R87_R94_TRANSITION_GEOMETRY_NEEDS_DESIGN',
  humanWalkingCertified:false,
  originalQwenGenerationImproved:false,artQuality:'NOT_REVIEWED',
  constructionCertified:false,safety:safety()};
}
export function buildR110RightSourceApproachStudy(nodes){
 return inspectR110RightSourceContouredApproach(buildR107CompactReadingStudy(nodes));
}
