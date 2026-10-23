/**
 * R105: strictly source-bound min-mass adaptive widening of the currently
 * ACTIVE R91 right tier2 throat. No fake/obsolete R88 endpoint returned.
 * Compare exact R104 mesh with 5 finite candidate widths; fail closed.
 */
import {createHash} from 'node:crypto';
import {buildR104R91ActiveRepairStudy,extractR104ActiveR91Throat,
 designR104LiveR91Shoulders} from './b198zr104-r91-active-throat-repair.mjs';
import {screenR99FiniteRoute} from './b198zr99-finite-volume-route-witness.mjs';

export const SCHEMA='minecraftaibuilder-b198zr105-adaptive-active-r91-throat-width-v1';
export const PEAKS=Object.freeze([.010,.014,.018,.022,.025]);
const fail=s=>{throw Error('B198ZR105_'+s)};
const SHA=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
function screen(mesh,route){
 const w=screenR99FiniteRoute(mesh,route);
 return {floor:w.witnessCounts.floor,headroom:w.witnessCounts.overhead,
  lateral:w.witnessCounts.lateral,
  overheadWitnesses:w.examples.flatMap(st=>st.observed.filter(v=>v.class==='overhead')
   .map(v=>({segment:st.segment,at:st.at,
    sourceTriangle:v.triangle,sourceKind:v.kind,
    intersection:v.position}))).slice(0,16),
  uncovered:w.unscreenedSegmentCount,
  coverageComplete:w.allDeclaredSourceSegmentsWithinProbeCoverage,
  sampleStations:w.stationCount};
}
function legal(a,b){
 return a.coverageComplete&&b.coverageComplete&&
  b.floor<a.floor&&b.headroom<=a.headroom&&b.lateral<=a.lateral;
}
/** Accept an externally supplied exact R104 study; no original-source rebuild. */
export function optimizeR105LiveR91Widening(r104){
 if(!r104||!Array.isArray(r104.faces)||!r104.report||
  r104.report.sourceFaces!==4692||
  ![0,12].includes(r104.report.r91AddedTriangles))
  fail('EXACT_R104_SOURCE_STUDY_REQUIRED');
 const originalCount=r104.report.r91AddedTriangles;
 const original=r104.originalSourceFaces;
 if(!Array.isArray(original)||original.length!==4692||
  SHA(original)!==r104.report.originalR98Sha256||
  SHA(r104.faces.slice(0,4692))!==SHA(original))fail('R98_PREFIX_NOT_AUTHENTIC');
 const baseline=r104.faces.slice(0,r104.faces.length-originalCount);
 if(SHA(baseline.slice(0,4692))!==SHA(original))fail('R98_BASE_CHANGED');
 const throat=extractR104ActiveR91Throat(original);
 const line=[mid(...throat.middle),mid(...throat.terminal)];
 const ground=screen(baseline,line),oldR104=screen(r104.faces,line);
 const candidates=PEAKS.map(peak=>{
  const f=designR104LiveR91Shoulders(throat,{peak}).faces;
  const fit=f.every(t=>[t.a,t.b,t.c].every(p=>p[0]>.400001));
  const stats=screen([...baseline,...f],line);
  return {peak,faces:f,fit,stats,
   restoredGroundSamples:ground.floor-stats.floor,
   noNewOverheadOrLateral:stats.headroom<=ground.headroom&&
    stats.lateral<=ground.lateral,
   sampledNonregressionAgainstR104:
    !legal(ground,oldR104)||
    (stats.floor<=oldR104.floor&&stats.headroom<=oldR104.headroom&&
     stats.lateral<=oldR104.lateral),
   acceptedByProbe:fit&&legal(ground,stats)};
 });
 const pass=candidates.filter(c=>c.acceptedByProbe&&
  c.sampledNonregressionAgainstR104).sort((a,b)=>
   b.restoredGroundSamples-a.restoredGroundSamples||a.peak-b.peak);
 const best=pass[0]??null;
 // If R104 has a proven gain but every R105 candidate fails, preserve R104.
 // If R104 was held, no failed R105 surface may be activated.
 let shape=r104.faces,status='R104_GEOMETRY_RETAINED_UNVERIFIED_TO_IMPROVE';
 if(best){
  const improved=[...baseline,...best.faces];
  if(SHA(improved)!==SHA(r104.faces)){
   shape=improved;
   status='R105_MIN_MASS_GEOMETRIC_VARIANT_HUMAN_ART_HOLD';
  }else status='R104_WIDTH_ALREADY_BEST_UNDER_SAMPLED_WITNESS';
 }else status='HOLD_NO_NEW_R91_SOURCE_WITNESS_GAIN';
 if(SHA(shape.slice(0,4692))!==SHA(original))fail('R98_SOURCE_CORRUPTED');
 const report={
  schema:SCHEMA,sourceOriginalTriangles:4692,
  sourceR98MeshSHA256:SHA(original),
  sourceR104MeshSHA256:SHA(r104.faces),
  candidateR105MeshSHA256:SHA(shape),
  priorR104Status:r104.report.r91ProposedCorrectionStatus,
  priorR104AddedTriangles:originalCount,
  actualR91OverheadSourceKinds:[...new Set(ground.overheadWitnesses.map(x=>x.sourceKind))],
  actualR91OverheadFirstHit:ground.overheadWitnesses[0]??null,
  roofMustNotBeMovedUnlessHitSourceIsRoof:true,
  headroomPriority:ground.overheadWitnesses.length?
   (ground.overheadWitnesses.some(w=>String(w.sourceKind).includes('RAIL'))?
    'SOURCE_R91_RAIL_GEOMETRY_INSPECTION_REQUIRED':
    ground.overheadWitnesses.some(w=>String(w.sourceKind)==='right_crown')?
    'RIGHT_CROWN_SOURCE_LOCAL_ROOF_INSPECTION_REQUIRED':
    'OTHER_TRUE_SOURCE_HEADROOM_INTERSECTION_INSPECTION_REQUIRED'):
   'NO_REPORTED_HEADROOM_INTERSECTION_NOT_HUMAN_CERTIFIED',
  stableR102WeldedGalleryIDs:r104.report.keptR102JointVerifiedAprons,
  priorHeldApronIDs:r104.report.withheldUnjoinedAprons.map(x=>x.id),
  changedMeshFromR104:SHA(shape)!==SHA(r104.faces),
  selectedPeakNormalized:best?.peak??null,
  minMassMeansOnlySmallerNormalizedWidthNotAestheticApproval:true,
  originalR91Screen:ground,existingR104Screen:oldR104,
  attempts:candidates.map(({faces,...rest})=>rest),
  evaluationStatus:status,
  sourceR98ExactPrefix:true,
  originalR104PreservedSeparately:true,
  wholeRoutePhysicalClearanceCertification:false,
  buildingLoadBearingCertification:false,
  humanArtReview:'NOT_REVIEWED',
  sourceLLMGenerationImproved:false,
  safety:safety()
 };
 return {faces:shape,r104Faces:r104.faces,
  sourceFaces:original,report};
}
export function buildR105LiveR91ResearchVariant(nodes){
 return optimizeR105LiveR91Widening(buildR104R91ActiveRepairStudy(nodes));
}
