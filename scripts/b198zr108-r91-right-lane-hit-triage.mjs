/** R108: diagnose the two remaining right-hand surrogate lane hits.
 * Source-bound offline triangle witnesses only; no geometry edits or Minecraft.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy}
 from './b198zr107-compact-reading-table-recovery.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';
import {screenR99FiniteRoute}
 from './b198zr99-finite-volume-route-witness.mjs';

export const SCHEMA='minecraftaibuilder-b198zr108-right-r91-headroom-source-hit-triage-v1';
export const OFFSETS=Object.freeze([-.035,-.023,0,.023,.035]);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const round=x=>+x.toFixed(7);
const mid=(a,b)=>a.map((x,i)=>(x+b[i])/2);
const fail=x=>{throw Error('B198ZR108_'+x)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const kindRole=k=>k==='right_R87_READING_TABLE_NOT_OCCUPANCY'||
 k==='right_R87_TABLE_SIDE'?'READING_FURNITURE':
 String(k).includes('RAIL')?'RAIL':
 String(k).includes('crown')||String(k).includes('CROWN')?'CROWN_SHELL':
 String(k).includes('R91_NARROWING_GALLERY')?'ACTIVE_R91_FLOOR':
 'UNCLASSIFIED_REAL_SOURCE_TRIANGLE';

/** Map actual R99 overhead witnesses to exact active and historical faces.
 * Reject truncated scans, out-of-bounds refs, and invented hit coordinates.
 */
export function attributeR108OverheadHits(faces,historic,scan,offset){
 if(!Array.isArray(faces)||!Array.isArray(historic)||
  !Array.isArray(scan?.examples)||!Number.isFinite(offset))
  fail('REAL_TRIANGLES_AND_WITNESSES_REQUIRED');
 const observations=scan.examples.flatMap(st=>st.observed
  .filter(w=>w.class==='overhead')
  .map(w=>({station:st.at,step:st.step,probeOffset:w.offset,...w})));
 if(observations.length!==scan.witnessCounts?.overhead)
  return {offset,witnessCount:scan.witnessCounts?.overhead??null,
   captured:observations.length,fullyAttributed:false,
   sourceHits:[],reason:'R99_FIRST_24_STATIONS_TRUNCATED_HOLD'};
 const oldMap=new Map();
 historic.forEach((f,i)=>{
  const k=JSON.stringify(f);
  if(!oldMap.has(k))oldMap.set(k,[]);
  oldMap.get(k).push(i);
 });
 const sourceHits=observations.map(w=>{
  const f=faces[w.triangle],p=w.position;
  if(!f||w.kind!==f.kind||!Array.isArray(p)||p.length!==3||
   !p.every(Number.isFinite)||!Array.isArray(w.station)||
   !['a','b','c'].every(k=>Array.isArray(f[k])&&f[k].length===3))
   fail('R99_EXACT_TRIANGLE_PROVENANCE_REQUIRED');
  const verts=[f.a,f.b,f.c];
  if(p.some((v,i)=>v<Math.min(...verts.map(t=>t[i]))-1e-5||
    v>Math.max(...verts.map(t=>t[i]))+1e-5))
   fail('RAY_POINT_OUTSIDE_HIT_SOURCE_TRIANGLE_BOUNDS');
  const a=f.b.map((v,i)=>v-f.a[i]),c=f.c.map((v,i)=>v-f.a[i]);
  const cross=[a[1]*c[2]-a[2]*c[1],
   a[2]*c[0]-a[0]*c[2],a[0]*c[1]-a[1]*c[0]];
  const norm=Math.hypot(...cross);
  if(!(norm>1e-10))fail('DEGENERATE_HIT_TRIANGLE');
  return {offset,activeMeshIndex:w.triangle,sourceKind:f.kind,
   architecturalRole:kindRole(f.kind),intersection:p.map(round),
   routeStation:w.station.map(round),stationStep:w.step,
   withinLaneWidthSample:w.probeOffset,
   unitNormal:cross.map(q=>round(q/norm)),
   matchingHistoricR98Indices:oldMap.get(JSON.stringify(f))??[],
   activeFaceVertices:verts};
 });
 return {offset,witnessCount:observations.length,captured:observations.length,
  fullyAttributed:true,sourceHits};
}
export function inspectR108RightLaneSourceHits(r107){
 if(!r107||!Array.isArray(r107.faces)||
  !Array.isArray(r107.originalR98Faces)||
  r107.originalR98Faces.length!==4692||
  sha(r107.faces)!==r107.report?.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256||
  !r107.report?.originalR98Preserved)
  fail('AUTHENTICATED_R107_AND_ORIGINAL_R98_REQUIRED');
 const throat=extractR104ActiveR91Throat(r107.originalR98Faces);
 const a=mid(...throat.middle),z=mid(...throat.terminal);
 const dx=z[0]-a[0],dz=z[2]-a[2],length=Math.hypot(dx,dz);
 if(length<.001)fail('ACTIVE_R91_ROUTE_REQUIRED');
 const nx=dz/length,nz=-dx/length;
 const prev=r107.report.selectedR107SurrogateCorridorLanes;
 if(prev?.surrogateLanes?.length!==5||
  !prev.allFiniteSourceLanesScreened)fail('R107_ALL_FIVE_LANES_REQUIRED');
 const lanes=OFFSETS.map((offset,i)=>{
  const move=p=>[round(p[0]+offset*nx),round(p[1]),
   round(p[2]+offset*nz)];
  const scan=screenR99FiniteRoute(r107.faces,[move(a),move(z)]);
  const before=prev.surrogateLanes[i];
  if(before.offset!==offset||scan.witnessCounts.floor!==before.floor||
   scan.witnessCounts.overhead!==before.headroom||
   scan.witnessCounts.lateral!==before.lateral||
   !scan.allDeclaredSourceSegmentsWithinProbeCoverage)
   fail('R107_WITNESS_COUNT_OR_COVERAGE_DRIFT');
  return {...attributeR108OverheadHits(
   r107.faces,r107.originalR98Faces,scan,offset),
   floorMissing:scan.witnessCounts.floor,
   lateralHits:scan.witnessCounts.lateral};
 });
 const remaining=lanes.flatMap(x=>x.sourceHits);
 const allAttributed=lanes.every(x=>x.fullyAttributed);
 const allClear=allAttributed&&lanes.every(x=>
  x.witnessCount===0&&x.floorMissing===0&&x.lateralHits===0);
 return {schema:SCHEMA,originalR98Sha256:sha(r107.originalR98Faces),
  activeR107Sha256:sha(r107.faces),activeTriangleCount:r107.faces.length,
  historicalTriangleCount:4692,sourceGeometryChangedInR108:false,
  laneOffsets:OFFSETS,lanes,unresolvedOverheadTotal:
   lanes.reduce((sum,x)=>sum+x.witnessCount,0),
  attributionComplete:allAttributed,
  remainingSourceKinds:[...new Set(remaining.map(x=>x.sourceKind))],
  conclusion:!allAttributed?'HOLD_TRUNCATED_SOURCE_HIT_EVIDENCE':
   allClear?'NO_LOCAL_RAY_HITS_STILL_NOT_WALKABILITY_CERTIFIED':
   'HOLD_ACTUAL_SOURCE_TRIANGLE_CORRECTION_REQUIRED',
  architecturalBeauty:'NOT_REVIEWED',
  humanWalkingCertified:false,structuralSupportCertified:false,
  independentHumanArtReviewRequired:true,sourceAIAbilityCertified:false,
  safety:safety()};
}
export function buildR108RightLaneSourceHitStudy(nodes){
 return inspectR108RightLaneSourceHits(buildR107CompactReadingStudy(nodes));
}
