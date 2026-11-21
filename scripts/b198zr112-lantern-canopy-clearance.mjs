/** R112: preserve a real lantern-shaped reading canopy while retracting its
 * intrusive inner eave over the right R91 approach. This is a *physical
 * mesh variant* and not a moved avatar probe, deleted canopy, or Minecraft.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor}
 from './b198zr107-compact-reading-table-recovery.mjs';
import {deriveR110SourceLane}
 from './b198zr110-source-contoured-right-room-approach.mjs';
import {identifyR111SourceOverhead}
 from './b198zr111-reversible-floor-finish-transition.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';

export const SCHEMA='minecraftaibuilder-b198zr112-lantern-canopy-inward-eave-retreat-v1';
export const CANOPY='right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY';
export const RETRACTIONS=Object.freeze([.35,.55,.75,.88]);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const rnd=x=>+x.toFixed(7);
const fail=x=>{throw Error('B198ZR112_'+x)};
const vv=f=>[f.a,f.b,f.c];
const vkey=p=>p.map(rnd).join(',');
const edges=f=>[[f.a,f.b],[f.b,f.c],[f.c,f.a]]
 .map(([a,b])=>[vkey(a),vkey(b)].sort().join('|'));
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const area=f=>{const u=f.b.map((v,i)=>v-f.a[i]),v=f.c.map((w,i)=>w-f.a[i]);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
  u[0]*v[1]-u[1]*v[0])/2;};
/** Move only the narrow inner edge of the SOURCE R93 canopy toward its
 * stable outer high-shelf edge. Shared canopy vertices move together.
 * Preserve both triangles and any connected adjacent canopy of that bay.
 */
export function retreatR112SourceCanopy(faces,sourceIndex,
 {fraction,allowR113Intermediate=false}={}){
 // R112's original four measured candidates stay immutable. R113's
 // intermediate .65 is opt-in only, never added to its historical sweep.
 if(typeof allowR113Intermediate!=='boolean')
  fail('EXPLICIT_R113_INTERMEDIATE_PERMISSION_REQUIRED');
 if(!Array.isArray(faces)||!Number.isInteger(sourceIndex)||
  sourceIndex<0||sourceIndex>=faces.length||
  !(RETRACTIONS.includes(fraction)||
    allowR113Intermediate&&fraction===.65)||faces[sourceIndex]?.kind!==CANOPY)
  fail('AUTHENTIC_R93_CANOPY_TRIANGLE_AND_BOUNDED_RETRACTION_REQUIRED');
 const edgeMap=new Map(),canopies=[];
 faces.forEach((f,i)=>{
  if(f.kind!==CANOPY)return;
  canopies.push(i);
  for(const k of edges(f)){
   if(!edgeMap.has(k))edgeMap.set(k,[]);
   edgeMap.get(k).push(i);
  }
 });
 const seen=new Set([sourceIndex]),queue=[sourceIndex];
 while(queue.length){
  const i=queue.shift();
  for(const e of edges(faces[i]))for(const j of edgeMap.get(e)||[])
   if(!seen.has(j)){seen.add(j);queue.push(j);}
 }
 // Avoid silently retreating a whole gallery instead of the one source bay.
 if(seen.size<2||seen.size>8)fail('NONLOCAL_OR_SINGLE_FACE_CANOPY_REJECTED');
 const vertices=new Map(),zGroups=new Map();
 for(const i of seen)for(const p of vv(faces[i])){
  const k=vkey(p),z=rnd(p[2]).toString();
  vertices.set(k,p);
  if(!zGroups.has(z))zGroups.set(z,new Set());
  zGroups.get(z).add(k);
 }
 if(zGroups.size<2||zGroups.size>6)fail('TERRACE_STATION_ANCHORS_AMBIGUOUS');
 const replacement=new Map();
 let moved=0,anchored=0;
 for(const keys of zGroups.values()){
  const points=[...keys].map(k=>({k,p:vertices.get(k)}))
   .sort((a,b)=>a.p[0]-b.p[0]);
  if(points.length!==2||points[0].p[0]>=points[1].p[0]-.015)
   fail('REAL_CANOPY_INNER_AND_OUTER_EDGE_MISSING');
  const [inner,outer]=points;
  const next=[rnd(inner.p[0]+fraction*(outer.p[0]-inner.p[0])),
   inner.p[1],inner.p[2]];
  if(next[0]>=outer.p[0]-.003)fail('CANOPY_RIB_COLLAPSE');
  replacement.set(inner.k,next);
  replacement.set(outer.k,outer.p);
  moved++;anchored++;
 }
 const altered=faces.map((f,i)=>{
  if(!seen.has(i))return f;
  return {kind:f.kind,...Object.fromEntries(['a','b','c'].map(k=>
   [k,replacement.get(vkey(f[k]))??f[k]]))};
 });
 if([...seen].some(i=>!(area(altered[i])>1e-10))||
  altered.length!==faces.length||sha(altered)===sha(faces)||
  altered.some((f,i)=>!seen.has(i)&&JSON.stringify(f)!==JSON.stringify(faces[i])))
  fail('DEGENERATE_CANOPY_OR_UNRELATED_SOURCE_CHANGED');
 // The roof-facing shelf supports remain fixed; no cutout, loss of canopy
 // surface program, or synthetic central void is introduced.
 return {faces:altered,sourceFaceIndex:sourceIndex,changedIndices:[...seen].sort((a,b)=>a-b),
  sourceKinds:[CANOPY],retreatFraction:fraction,
  originalMeshSha256:sha(faces),alternativeMeshSha256:sha(altered),
  anchoredShelfStations:anchored,retractedInteriorStations:moved,
  canopyFacetCountPreserved:true,realTerraceFurniturePortalAndOuterShellUnmodified:true};
}
export function inspectR112LanternCanopyRevision(r107){
 if(!r107||!Array.isArray(r107.faces)||!Array.isArray(r107.originalR98Faces)||
  r107.originalR98Faces.length!==4692||!r107.report?.originalR98Preserved||
  sha(r107.faces)!==r107.report?.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256)
  fail('AUTHENTICATED_R107_AND_ARCHIVED_R98_REQUIRED');
 const base=deriveR110SourceLane(r107.faces,r107.originalR98Faces,.035,{gap:.003});
 const attribution=identifyR111SourceOverhead(base);
 if(!base.sourceCoverageComplete||!attribution.allCaptured||
  attribution.overheadCount!==7||attribution.sourceIndices.length!==1||
  attribution.sourceHits.some(x=>x.kind!==CANOPY)||
  attribution.sourceIndices[0]!==4474)
  fail('SEVEN_SOURCE_PROVEN_R93_CANOPY_OVERHEAD_HITS_REQUIRED');
 const throat=extractR104ActiveR91Throat(r107.originalR98Faces);
 const originalFive=auditR107AdjacentCorridor(r107.faces,throat);
 const variants=[],results=[];
 for(const fraction of RETRACTIONS){
  const candidate=retreatR112SourceCanopy(r107.faces,4474,{fraction});
  const route=deriveR110SourceLane(candidate.faces,r107.originalR98Faces,.035,{gap:.003});
  const adjacent=auditR107AdjacentCorridor(candidate.faces,throat);
  const lanesNonregressing=adjacent.allFiniteSourceLanesScreened&&
   originalFive.surrogateLanes.every((p,i)=>{
    const n=adjacent.surrogateLanes[i];
    return n.floor<=p.floor&&n.headroom<=p.headroom&&n.lateral<=p.lateral;
   });
  const proof=route.measured?.allDeclaredSourceSegmentsWithinProbeCoverage&&
   route.sourceCoverageComplete&&route.measured.witnessCounts.floor===0&&
   route.measured.witnessCounts.lateral===0&&lanesNonregressing;
  const improved=proof&&route.measured.witnessCounts.overhead<
   base.measured.witnessCounts.overhead;
  const record={fraction,canopyIndices:candidate.changedIndices,
   roofAndOuterShelfAnchored:true,realSourceFloorPreserved:true,
   historicR98Preserved:true,fiveLaneNonregression:lanesNonregressing,
   floorHits:route.measured?.witnessCounts.floor??null,
   overheadHits:route.measured?.witnessCounts.overhead??null,
   lateralHits:route.measured?.witnessCounts.lateral??null,
   nineByThreeSourceCoverage:route.sourceCoverageComplete,
   accepted:!!improved,meshSha256:candidate.alternativeMeshSha256};
  variants.push(record);
  if(improved)results.push({record,...candidate});
 }
 results.sort((a,b)=>a.record.overheadHits-b.record.overheadHits||
  a.record.fraction-b.record.fraction);
 const selected=results[0]??null;
 const active=selected?.faces??r107.faces;
 return {faces:active,report:{schema:SCHEMA,
  archivedR98Sha256:sha(r107.originalR98Faces),
  originalR107Sha256:sha(r107.faces),
  selectedMeshSha256:sha(active),
  originalR107Preserved:true,originalSourceR98Preserved:true,
  originalR110OverheadHits:attribution.overheadCount,
  originalSourceTriangle:attribution.sourceIndices[0],
  originalSourceKind:CANOPY,originalR110HitWitnesses:attribution.sourceHits,
  canopyRetreatCandidates:variants,selected: selected?.record??null,
  changedCanopyFacets:selected?.changedIndices.length??0,
  sourceGeometryChanged:!!selected,
  status:selected?
   'R93_CANOPY_RETRACTED_REAL_TRIANGLE_SHAPE_ALTERNATIVE_ART_HOLD':
   'HOLD_NO_SOURCE_VERIFIED_NONREGRESSING_CANOPY_RETREAT',
  originalRoomProgramRetained:true,interiorDaylightNeedsHumanReview:true,
  safety:safety(),humanWalkingCertified:false,artReview:'NOT_REVIEWED',
  structuralLoadCert:false,originalModelGeneralizationCertified:false}};
}
export function buildR112LanternCanopyStudy(nodes){
 return inspectR112LanternCanopyRevision(buildR107CompactReadingStudy(nodes));
}
