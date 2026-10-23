/** R109: source-bound foot-datum comparison at R91 -> R94/R87 reading room.
 * R108 proves two "overhead" rays touched raised FLOOR/THRESHOLD faces.
 * Preserve every architectural triangle; compare only a research proxy route
 * referenced to the existing real floor elevations. Never claim walkability.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy} from './b198zr107-compact-reading-table-recovery.mjs';
import {inspectR108RightLaneSourceHits,OFFSETS} from './b198zr108-r91-right-lane-hit-triage.mjs';
import {extractR104ActiveR91Throat} from './b198zr104-r91-active-throat-repair.mjs';
import {screenR99FiniteRoute} from './b198zr99-finite-volume-route-witness.mjs';
import {sourceSurfaceAtXZ} from './b198zr90-source-surface-seams.mjs';

export const SCHEMA='minecraftaibuilder-b198zr109-realfloor-referenced-r91-route-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const round=x=>+x.toFixed(7);
const mid=(a,b)=>a.map((x,i)=>(x+b[i])/2);
const lerp=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const fail=x=>{throw Error('B198ZR109_'+x)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
const FLOOR=new Set([
 'right_R94_UNFURNISHED_TRUE_TERRACE_THRESHOLD_NOT_WALKABLE',
 'right_R87_CONTIGUOUS_PROGRAM_TERRACE_NOT_WALKABLE',
 'right_R87_SOURCE_CONTAINED_ROOM_FLOOR_NOT_CERTIFIED',
 'right_R91_NARROWING_GALLERY_TURNOUT_NOT_CERTIFIED',
 'right_reading_terrace'
]);
const TARGETS=Object.freeze(new Map([
 [.023,'right_R94_UNFURNISHED_TRUE_TERRACE_THRESHOLD_NOT_WALKABLE'],
 [.035,'right_R87_CONTIGUOUS_PROGRAM_TERRACE_NOT_WALKABLE']
]));
/** Existing floor triangles only. The highest nearby continuous research layer
 * is a proposed foot datum, not a claim that it is walkable or load-bearing.
 */
export function findR109LocalFloorDatum(faces,p){
 if(!Array.isArray(faces)||!Array.isArray(p)||p.length!==3||
  !p.every(Number.isFinite))fail('FINITE_ACTUAL_FLOOR_AND_POINT_REQUIRED');
 const matching=[];
 faces.forEach((f,index)=>{
  if(!FLOOR.has(f.kind))return;
  const s=sourceSurfaceAtXZ(p,f);
  if(!s?.containedXZ)return;
  const rise=s.point[1]-p[1];
  if(rise<-.012-1e-6||rise>.035+1e-6)return;
  matching.push({index,kind:f.kind,y:s.point[1],rise:round(rise)});
 });
 if(!matching.length)return null;
 matching.sort((a,b)=>b.y-a.y||a.index-b.index);
 const floor=matching[0];
 return {sourceTriangle:floor.index,kind:floor.kind,
  sourceElevation:floor.y,sourceRise:floor.rise,
  proposedFootY:round(floor.y+.003),sourceLayers:matching.length};
}
export function inspectR109RealFloorReferencedRoute(r107){
 if(!r107||!r107.report||!Array.isArray(r107.faces)||
  !Array.isArray(r107.originalR98Faces)||r107.originalR98Faces.length!==4692||
  sha(r107.faces)!==r107.report.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report.originalR98Sha256)
  fail('AUTHENTICATED_SOURCE_R107_REQUIRED');
 const r108=inspectR108RightLaneSourceHits(r107);
 if(!r108.attributionComplete||r108.unresolvedOverheadTotal!==2||
  r108.lanes.some(l=>l.floorMissing||l.lateralHits)||
  [...TARGETS].some(([o,k])=>{
   const hit=r108.lanes.find(l=>l.offset===o);
   return hit?.sourceHits?.length!==1||hit.sourceHits[0].sourceKind!==k;
  }))fail('EXACT_R108_TWO_ACTUAL_FLOOR_HITS_REQUIRED');
 const throat=extractR104ActiveR91Throat(r107.originalR98Faces);
 const a=mid(...throat.middle),z=mid(...throat.terminal);
 const dx=z[0]-a[0],dz=z[2]-a[2],norm=Math.hypot(dx,dz);
 if(norm<.001)fail('R91_PLANAR_SOURCE_LINE_REQUIRED');
 const nx=dz/norm,nz=-dx/norm;
 const shift=(p,o)=>[round(p[0]+nx*o),round(p[1]),round(p[2]+nz*o)];
 const lanes=OFFSETS.map(offset=>{
  const route=[shift(a,offset),shift(z,offset)];
  const original=screenR99FiniteRoute(r107.faces,route);
  const old=r108.lanes.find(l=>l.offset===offset);
  if(!old||original.witnessCounts.overhead!==old.witnessCount||
   original.witnessCounts.floor!==old.floorMissing||
   original.witnessCounts.lateral!==old.lateralHits||
   !original.allDeclaredSourceSegmentsWithinProbeCoverage)
   fail('R108_SOURCE_LANE_DRIFT');
  if(!TARGETS.has(offset))return {offset,previous:original.witnessCounts,
   candidate:original.witnessCounts,proposed:false,accepted:false,
   reason:'UNCHANGED_NON_OBSTRUCTED_LANE'};
  const ends=route.map(p=>findR109LocalFloorDatum(r107.faces,p));
  const proposed=ends.every(Boolean)&&ends.every((e,i)=>
    Math.abs(e.proposedFootY-route[i][1])<=.035);
  const newRoute=proposed?route.map((p,i)=>[p[0],ends[i].proposedFootY,p[2]]):null;
  const grade=newRoute?Math.abs(newRoute[1][1]-newRoute[0][1])/norm:null;
  // Enforce a smooth localized route with TRUE surfaces underneath
  // all five intermediate stations. Avoid floor crossing by interpolation.
  const intermediates=newRoute?[0,.25,.5,.75,1].map(t=>{
    const p=lerp(...newRoute,t);
    const floor=findR109LocalFloorDatum(r107.faces,p);
    return {station:t,sourceTriangle:floor?.sourceTriangle??null,
      sourceKind:floor?.kind??null,
      elevationGap:floor?round(p[1]-floor.sourceElevation):null,
      nearActualFloor:!!floor&&Math.abs(p[1]-floor.sourceElevation)<=.009};
  }):[];
  const floorWitness=proposed&&grade<=.28&&
   intermediates.every(x=>x.nearActualFloor);
  const after=floorWitness?screenR99FiniteRoute(r107.faces,newRoute):null;
  const nonregression=!!after&&after.allDeclaredSourceSegmentsWithinProbeCoverage&&
    after.stationCount===original.stationCount&&
    after.witnessCounts.floor<=original.witnessCounts.floor&&
    after.witnessCounts.lateral<=original.witnessCounts.lateral&&
    after.witnessCounts.overhead<original.witnessCounts.overhead;
  return {offset,previous:original.witnessCounts,
   candidate:after?.witnessCounts??null,
   candidateStationCount:after?.stationCount??null,
   originalStationCount:original.stationCount,
   grade:grade===null?null:round(grade),
   originalRoute:route,proposedRoute:newRoute,
   sourceFloorAtEnds:ends,intermediateSourceFloorWitnesses:intermediates,
   exactFloorUnderProposedRoute:floorWitness,
   proposed:!!newRoute,accepted:nonregression,
   reason:nonregression?'LOCAL_PROXY_FOOT_DATUM_IMPROVES_SOURCE_RAYS_ONLY':
    'HOLD_NO_CONTINUOUS_NONREGRESSING_SOURCE_FOOT_DATUM'};
 });
 const accepted=lanes.filter(l=>l.accepted).length;
 const before=lanes.reduce((n,l)=>n+l.previous.overhead,0);
 const after=lanes.reduce((n,l)=>n+(l.accepted?l.candidate.overhead:l.previous.overhead),0);
 const conclusion=accepted===2&&after===0?
  'TWO_FLOOR_DATUM_PROXY_RAYS_CLEAR_NOT_ARCHITECTURAL_CERTIFICATION':
  accepted>0?'PARTIAL_FLOOR_DATUM_PROXY_GAIN_OTHER_SOURCE_HITS_HOLD':
  'HOLD_NO_SOURCE_SUPPORTED_GRADE_CORRECTION';
 return {schema:SCHEMA,sourceR98Sha256:sha(r107.originalR98Faces),
  sourceR107Sha256:sha(r107.faces),sourceTriangleCount:r107.faces.length,
  sourceGeometryChanged:false,originalR108Evidence:r108.conclusion,
  sourceHitKinds:r108.remainingSourceKinds,overheadBefore:before,
  conditionalProxyOverheadAfter:after,
  verifiedFloorDatumLanes:accepted,lanes,
  conclusion,architecturePhysicalChangeApplied:false,
  originalFacesRetainedByteForByte:true,
  realWorldHumanWalkingCertified:false,loadBearingCertified:false,
  modelGenerativeCapabilityCertified:false,artQuality:'NOT_REVIEWED',
  actualFloorStepsAndRampsStillNeedHumanInspection:true,safety:safety()};
}
export function buildR109RealFloorReferencedStudy(nodes){
 return inspectR109RealFloorReferencedRoute(buildR107CompactReadingStudy(nodes));
}
