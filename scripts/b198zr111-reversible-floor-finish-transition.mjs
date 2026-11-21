/** R111: source-derived right reading-room FLOOR FINISH transition alternatives.
 * R110 proves nine x three floor witnesses but seven overhead Ray hits.
 * Never remove the actual terrace, source R98 record, entry portal or furniture.
 * Only re-level redundant R87/R94 decorative floor overlays if the actual
 * overhead offenders are proven to be those layers, with full regression.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor}
 from './b198zr107-compact-reading-table-recovery.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';
import {deriveR110SourceLane}
 from './b198zr110-source-contoured-right-room-approach.mjs';
import {sourceSurfaceAtXZ}
 from './b198zr90-source-surface-seams.mjs';
import {screenR99FiniteRoute}
 from './b198zr99-finite-volume-route-witness.mjs';

export const SCHEMA='minecraftaibuilder-b198zr111-reversible-right-reading-finish-transition-v1';
const KIND={
 'right_R87_CONTIGUOUS_PROGRAM_TERRACE_NOT_WALKABLE':.0035,
 'right_R94_UNFURNISHED_TRUE_TERRACE_THRESHOLD_NOT_WALKABLE':.004
};
const FINISH=new Set(Object.keys(KIND));
const LIFTS=Object.freeze([.001,.002]);
const SHA=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const round=x=>+x.toFixed(7);
const fail=x=>{throw Error('B198ZR111_'+x)};
const tri=f=>[f.a,f.b,f.c];
const key=p=>p.map(round).join(',');
const edgeKeys=f=>[[f.a,f.b],[f.b,f.c],[f.c,f.a]]
 .map(([a,b])=>[key(a),key(b)].sort().join('|'));
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
/** R99 returns first 24 witness stations only; reject incomplete attribution. */
export function identifyR111SourceOverhead(lane){
 if(!lane?.measured||!Array.isArray(lane.measured.examples))
  fail('REAL_R110_SOURCE_RAY_REQUIRED');
 const found=lane.measured.examples.flatMap(st=>st.observed
  .filter(x=>x.class==='overhead')
  .map(x=>({kind:x.kind,triangle:x.triangle,at:x.position,
   sourceStation:st.at,probeOffset:x.offset})));
 return {allCaptured:found.length===lane.measured.witnessCounts.overhead,
  overheadCount:lane.measured.witnessCounts.overhead,
  captured:found.length,sourceKinds:[...new Set(found.map(x=>x.kind))],
  sourceIndices:[...new Set(found.map(x=>x.triangle))],
  sourceHits:found};
}
/** Each changed finish vertex must sit on an UNCHANGED real terrace
 * at its documented +.0035/+ .004 offset. Source evidence is never modified.
 */
export function sourceBackedR111Finish(faces,original,seedIndices,{lift=.001}={}){
 if(!Array.isArray(faces)||!Array.isArray(original)||original.length!==4692||
  !Array.isArray(seedIndices)||!seedIndices.length||seedIndices.length>24||
  !LIFTS.includes(lift)||seedIndices.some(i=>!Number.isInteger(i)))
  fail('AUTHENTICATED_BOUNDED_SOURCE_FLOOR_FINISH_REQUIRED');
 const priorOriginal=SHA(original),old=SHA(faces);
 const originalTerraces=original.filter(f=>f.kind==='right_reading_terrace');
 const seeds=[...new Set(seedIndices)];
 if(seeds.some(i=>i<0||i>=faces.length||!FINISH.has(faces[i].kind)))
  fail('ONLY_REAL_R87_R94_FLOOR_FINISH_HITS_ALLOWED');
 const candidates=faces.map((f,i)=>({f,i})).filter(x=>FINISH.has(x.f.kind));
 const edgeIndex=new Map();
 for(const x of candidates)for(const e of edgeKeys(x.f)){
  const k=x.f.kind+':'+e;
  if(!edgeIndex.has(k))edgeIndex.set(k,[]);
  edgeIndex.get(k).push(x.i);
 }
 const changed=new Set(seeds),pending=[...seeds];
 while(pending.length){
  const i=pending.pop(),f=faces[i];
  for(const e of edgeKeys(f))for(const j of edgeIndex.get(f.kind+':'+e)??[]){
   if(!changed.has(j)){changed.add(j);pending.push(j)}
  }
 }
 if(changed.size>24)fail('SOURCE_FINISH_COMPONENT_TOO_LARGE');
 const exact=[];
 for(const i of changed){
  const f=faces[i],expected=KIND[f.kind];
  const ps=tri(f);
  if(ps.some(p=>p[0]<.400001||p[0]>.91||p[2]<-.90||
   p[2]>-.45||p[1]<.35||p[1]>.55))
   fail('FURNITURE_OR_OTHER_FLOOR_REGION_NOT_ALLOWED');
  for(const p of ps){
   const supports=originalTerraces.map(x=>sourceSurfaceAtXZ(p,x))
    .filter(x=>x?.containedXZ&&Math.abs(p[1]-x.point[1]-expected)<.00003);
   if(!supports.length)fail('FINISH_VERTEX_NOT_ON_ORIGINAL_SOURCE_TERRACE');
  }
  exact.push({index:i,kind:f.kind,oldLift:expected,newLift:lift});
 }
 const mesh=faces.map((f,i)=>{
  if(!changed.has(i))return f;
  const dy=round(KIND[f.kind]-lift);
  return {kind:f.kind,...Object.fromEntries(['a','b','c'].map(k=>
    [k,[f[k][0],round(f[k][1]-dy),f[k][2]]]))};
 });
 if(SHA(original)!==priorOriginal||SHA(faces)!==old||
  mesh.length!==faces.length||changed.size===0||
  SHA(mesh)===old)fail('SOURCE_ARCHIVE_OR_DELTA_INVALID');
 if(mesh.some((f,i)=>!changed.has(i)&&JSON.stringify(f)!==JSON.stringify(faces[i])))
  fail('UNRELATED_ARCHITECTURE_FACES_CHANGED');
 return {faces:mesh,modifiedFacets:exact,alteredFacetCount:changed.size,
  originalMeshSha256:old,alternativeMeshSha256:SHA(mesh),
  historicR98Sha256:priorOriginal,
  unmodifiedRealReadingTerraceFaces:true,
  originalEntryPortalAndFurnitureUnmodified:true};
}
export function studyR111RealFinishTransition(r107){
 if(!r107||!Array.isArray(r107.faces)||!r107.report||
  !Array.isArray(r107.originalR98Faces)||r107.originalR98Faces.length!==4692||
  SHA(r107.faces)!==r107.report.alternativeR107Sha256||
  SHA(r107.originalR98Faces)!==r107.report.originalR98Sha256)
  fail('REAL_R107_SOURCE_AND_R98_SHA_REQUIRED');
 const original=deriveR110SourceLane(r107.faces,r107.originalR98Faces,.035,{gap:.003});
 if(!original.measured?.allDeclaredSourceSegmentsWithinProbeCoverage||
  original.measured.witnessCounts.floor!==0||
  original.measured.witnessCounts.overhead!==7||
  original.measured.witnessCounts.lateral!==0)
  fail('R110_SEVEN_OVERHEAD_AND_FULL_FLOOR_WITNESSES_REQUIRED');
 const source=identifyR111SourceOverhead(original);
 const valid=source.allCaptured&&source.sourceIndices.every(i=>
  FINISH.has(r107.faces[i]?.kind));
 const throat=extractR104ActiveR91Throat(r107.originalR98Faces);
 const before=auditR107AdjacentCorridor(r107.faces,throat);
 let alternatives=[],chosen=null;
 if(valid)for(const lift of LIFTS){
  try {
   const altered=sourceBackedR111Finish(
    r107.faces,r107.originalR98Faces,source.sourceIndices,{lift});
   const after=auditR107AdjacentCorridor(altered.faces,throat);
   const fiveLaneNoRegression=after.allFiniteSourceLanesScreened&&
    before.surrogateLanes.every((s,i)=>{
     const a=after.surrogateLanes[i];
     return a.floor<=s.floor&&a.headroom<=s.headroom&&a.lateral<=s.lateral;
    });
   const lane=deriveR110SourceLane(altered.faces,r107.originalR98Faces,.035,{gap:.003});
   const acceptable=lane.sourceCoverageComplete&&
    lane.measured?.allDeclaredSourceSegmentsWithinProbeCoverage&&
    lane.measured.witnessCounts.floor===0&&
    lane.measured.witnessCounts.lateral===0&&
    lane.measured.witnessCounts.overhead<original.measured.witnessCounts.overhead&&
    fiveLaneNoRegression;
   const record={lift,modifiedCount:altered.alteredFacetCount,
    modifiedKinds:[...new Set(altered.modifiedFacets.map(x=>x.kind))],
    originalHeadroom:7,afterHeadroom:lane.measured?.witnessCounts.overhead??null,
    afterFloor:lane.measured?.witnessCounts.floor??null,
    afterLateral:lane.measured?.witnessCounts.lateral??null,
    allNineByThreeGrounded:lane.sourceCoverageComplete,
    fiveLaneNoRegression,acceptable,
    sourceArchiveKept:true};
   alternatives.push(record);
   if(acceptable&&(!chosen||record.afterHeadroom<chosen.record.afterHeadroom))
    chosen={record,...altered};
  }catch(e){alternatives.push({lift,acceptable:false,error:String(e)})}
 }
 const active=chosen?.faces??r107.faces;
 return {faces:active,historicalR98Faces:r107.originalR98Faces,
  unchangedR107Faces:r107.faces,report:{
  schema:SCHEMA,originalR107Sha256:SHA(r107.faces),
  historicalR98Sha256:SHA(r107.originalR98Faces),
  activeR111Sha256:SHA(active),
  originalR107Preserved:SHA(r107.faces)===r107.report.alternativeR107Sha256,
  fullSourceR98ArchivePreserved:true,
  r110UnresolvedOverhead:7,
  overheadHitAttribution:source,
  allOverheadHitsAreVerifiedRedundantFloorFinishes:valid,
  alternatives:alternatives,selected:chosen?.record??null,
  alteredFacetCount:chosen?.alteredFacetCount??0,
  evaluationStatus:chosen?
   'SOURCE_FLOOR_FINISH_ART_VARIANT_GEOMETRY_REVISED_HUMAN_HOLD':
   !valid?'HOLD_HEADROOM_CAUSED_BY_NONFINISH_OR_TRUNCATED_SOURCE':
   'HOLD_NO_NONREGRESSING_FLOOR_FINISH_ALTERNATIVE',
  originalFurnishingRestored:false, // Existing relocation from R107 preserved
  sourceGeometryChanged:!!chosen,
  buildPlanEmitted:false,
  realWorldHumanWalkingCertified:false,realFloorLoadCapacityCertified:false,
  architecturalVisualApproval:'NOT_REVIEWED',
  originalQwenGenerativeQualityUnknown:true,safety:safe()
 }};
}
export function buildR111SourceFinishStudy(nodes){
 return studyR111RealFinishTransition(buildR107CompactReadingStudy(nodes));
}
