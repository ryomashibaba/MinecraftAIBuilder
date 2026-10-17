/**
 * B198B honest geometric auditing and human-scored semantic evaluation.
 * A deterministic voxel compiler CANNOT decide whether a sculpture looks
 * good or whether Japanese natural language has been followed.
 * Therefore source facts, evaluator opinion and actual player movement are
 * separately represented, and never silently promoted to one PASS.
 */
import {createHash} from 'node:crypto';
import {MATERIALS,compileDesign,validateDesign} from './b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198b-quality-audit-v1';
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const assert=(cond,why)=>{if(!cond)throw Error('B198B_'+why)};
const ratio=(a,b)=>b===0?0:Math.round(10000*a/b)/10000;
/** Real 2x2 foot support plus TWO empty body/head layers, never walking. */
export function inspectSourceGeometry({design,compiled}){
 validateDesign(design);
 assert(compiled?.sourceSha256===H(design),'SOURCE_HASH_UNTRUSTED');
 assert(Array.isArray(compiled.primitives)&&compiled.primitives.length>0,
  'EMPTY_SOURCE_PRIMITIVES');
 const occupied=new Set(compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 assert(occupied.size===compiled.primitives.length,'NONUNIQUE_SOURCE_COORDINATES');
 const bounds=compiled.bounds;
 const sx=bounds.maxX-bounds.minX+1,sy=bounds.maxY-bounds.minY+1,
  sz=bounds.maxZ-bounds.minZ+1;
 const mat=Object.fromEntries(MATERIALS.map(x=>[x,0]));
 for(const p of compiled.primitives)mat[MATERIALS[p[3]]]++;
 const shapes=Object.fromEntries(
  [...new Set(design.elements.map(e=>e.shape))].sort()
   .map(s=>[s,design.elements.filter(e=>e.shape===s).length]));
 const valid2Wide=new Map(); // y,z -> array of x origins with genuine 2x2 feet
 for(const [x,y,z] of compiled.primitives){
  if(x>=bounds.maxX||z>=bounds.maxZ)continue;
  const floorY=y,standingY=y+1;
  if(standingY+1>=design.bounds.height)continue;
  let supported=true;
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
   const a=x+i,b=z+j;
   if(!occupied.has(K(a,floorY,b))||
      occupied.has(K(a,standingY,b))||
      occupied.has(K(a,standingY+1,b)))supported=false;
  }
  if(supported){
   const row=standingY+','+z;
   if(!valid2Wide.has(row))valid2Wide.set(row,[]);
   valid2Wide.get(row).push(x);
  }
 }
 let longestRun=0,longestSourceMoves=0,maxRows=0;
 const supportedLevels=new Set();let supportedSquares=0;
 const top=[];
 for(const [row,xs] of valid2Wide){
  const [y,z]=row.split(',').map(Number);
  supportedLevels.add(y);supportedSquares+=xs.length;maxRows++;
  xs.sort((a,b)=>a-b);
  let run=1,from=xs[0];
  for(let i=1;i<=xs.length;i++){
   if(i<xs.length&&xs[i]===xs[i-1]+1)run++;
   else{
    if(run>longestRun){
     longestRun=run;longestSourceMoves=Math.max(0,run-1);
     top.length=0;top.push({standingY:y,z,startX:from,endX:xs[i-1],
      2WideSupportedSquares:run});
    }
    if(i<xs.length){from=xs[i];run=1;}
   }
  }
 }
 const fullBoundingVolume=sx*sy*sz;
 const result={
  schema:SCHEMA,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  genuineOccupiedVoxels:compiled.primitives.length,
  distinctPrimitiveFamilies:Object.keys(shapes).length,
  sourcePrimitiveFamilyCounts:shapes,
  actualMaterialFamilyCounts:mat,
  usedMaterialFamilyCount:Object.values(mat).filter(x=>x>0).length,
  sourceBoundingSize:{x:sx,y:sy,z:sz},
  occupiedFractionOfActualBounds:ratio(occupied.size,fullBoundingVolume),
  source2WideSupportedFootprintSquares:supportedSquares,
  distinctSource2WideStandingLevels:supportedLevels.size,
  largestHorizontalSourceOnly2WideRun:longestRun,
  largestHorizontalSourceOnly2WideMoves:longestSourceMoves,
  exemplarLongestLocalRun:top.slice(0,1),
  internalVerticalConnectionsCertified:false,
  playerWalkingCertified:false,
  realStructuralLoadCertified:false,
  aestheticQualityCertified:false,
  sourceOnly:true,
  worldWrites:0,worldContacts:0,constructionApproved:false
 };
 return result;
}
export function inspectProtectedVoxelFidelity({
 baseDesign,revisionDesign,protectedElementIds=[]
}){
 validateDesign(baseDesign);validateDesign(revisionDesign);
 assert(baseDesign.id===revisionDesign.id,'PROTECTION_DIFFERENT_DESIGN');
 assert(Array.isArray(protectedElementIds)&&
  protectedElementIds.length>0,'PROTECTION_NEEDS_ELEMENT_IDS');
 const before=new Map(baseDesign.elements.map(e=>[e.id,e])),
  after=new Map(revisionDesign.elements.map(e=>[e.id,e]));
 for(const id of protectedElementIds){
  assert(before.has(id)&&after.has(id),'PROTECTED_SOURCE_ELEMENT_MISSING_'+id);
  assert(JSON.stringify(before.get(id))===JSON.stringify(after.get(id)),
   'PROTECTED_SOURCE_ELEMENT_EDITED_'+id);
 }
 const protectedGeometry={
  ...baseDesign,elements:baseDesign.elements.filter(e=>protectedElementIds.includes(e.id))};
 assert(protectedGeometry.elements.some(e=>e.mode==='add'),
  'NO_PROTECTED_ADD_GEOMETRY');
 const target=compileDesign(protectedGeometry);
 const actual=compileDesign(revisionDesign),original=compileDesign(baseDesign);
 const originalCells=new Map(original.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 const outputCells=new Map(actual.primitives.map(p=>[K(p[0],p[1],p[2]),p[3]]));
 let protectedReferenceCells=0,lost=0,materialChanged=0;
 for(const p of target.primitives){
  const k=K(p[0],p[1],p[2]);
  if(!originalCells.has(k))continue;
  protectedReferenceCells++;
  if(!outputCells.has(k))lost++;
  else if(outputCells.get(k)!==originalCells.get(k))materialChanged++;
 }
 assert(protectedReferenceCells>0,'PROTECTED_SOURCE_NO_ACTUAL_VOXELS');
 return {schema:SCHEMA,sourceOnly:true,protectedElementIds,
  protectedReferenceCells,lostSourceVoxels:lost,
  changedSourceMaterials:materialChanged,
  exactProtectedVoxelPreservationPassed:lost===0&&materialChanged===0,
  inheritedWalkabilityNotCertified:true};
}
export function evaluateSourceGoals(caseSpec,audit){
 assert(audit?.schema===SCHEMA,'NO_REPRODUCIBLE_SOURCE_AUDIT');
 assert(caseSpec?.sourceGoals,'MISSING_BENCHMARK_SOURCE_GOALS');
 const goals=caseSpec.sourceGoals;
 const checks={
  minimumOccupiedVoxels:audit.genuineOccupiedVoxels>=goals.minVoxels,
  minimumHeightSpan:audit.sourceBoundingSize.y>=goals.minHeightSpan,
  minimumMaterialFamilies:audit.usedMaterialFamilyCount>=goals.minMaterialFamilies,
  minimumPrimitiveFamilies:audit.distinctPrimitiveFamilies>=goals.minDistinctGeometries
 };
 return {status:Object.values(checks).every(Boolean)?
  'SOURCE_GOALS_PASS':'SOURCE_GOALS_FAIL',
  checks,sourceOnlyNotSemantic:true,sourceOnlyNotPhysical:true};
}
export function emptyHumanRubric(spec){
 return {caseId:spec.id,
  status:'UNREVIEWED',
  rubric:spec.criteria.map(c=>({criterionId:c.id,
   description:c.description,score:null,evidence:null})),
  requiredHumanReviewer:true,modelSelfRatingNotAccepted:true};
}
export function scoreHumanRubric(spec,submission){
 const names=spec.criteria.map(c=>c.id);
 assert(submission?.caseId===spec.id&&
  Array.isArray(submission?.rubric)&&submission.rubric.length===names.length,
  'INVALID_HUMAN_RUBRIC');
 const scores=[];
 for(let i=0;i<names.length;i++){
  const r=submission.rubric[i];
  assert(r.criterionId===names[i]&&
   Number.isInteger(r.score)&&r.score>=0&&r.score<=4&&
   typeof r.evidence==='string'&&r.evidence.trim().length>=15&&
   r.evidence.length<=750,'BAD_HUMAN_EVIDENCE_'+names[i]);
  scores.push(r.score);
 }
 const avg=ratio(scores.reduce((a,b)=>a+b,0),4*scores.length);
 return {caseId:spec.id,humanSuppliedScoreRatio:avg,
  scoreBreakdown:scores,humanEvidenceSupplied:true,
  verificationStatus:'SELF_REPORTED_HUMAN_RATING_NOT_INDEPENDENTLY_VERIFIED',
  geometryAndWorldSafetyNotInferred:true};
}
export function summarizeQualityResults(results,expectedIds){
 const ids=[...expectedIds],unique=new Set(ids);
 assert(unique.size===ids.length,'DUPLICATE_EXPECTED_CASES');
 const found=new Map();
 for(const r of results){
  assert(unique.has(r.caseId)&&!found.has(r.caseId),'UNEXPECTED_OR_DUPLICATED_RESULT');
  found.set(r.caseId,r);
 }
 const attempted=[...found.values()].filter(x=>x.attempted===true);
 const sourcePassed=attempted.filter(x=>x.sourceGoals?.status==='SOURCE_GOALS_PASS');
 const humanEvaluated=attempted.filter(x=>x.humanRating?.humanEvidenceSupplied===true);
 const statuses={};
 for(const id of ids){
  const x=found.get(id);
  statuses[id]=!x?'NOT_RUN':!x.attempted?'NOT_RUN':
   x.error?'MODEL_OR_SOURCE_HOLD':
   x.sourceGoals?.status??'SOURCE_ONLY_UNASSESSED';
 }
 return {schema:SCHEMA,expectedCaseCount:ids.length,
  attemptedCaseCount:attempted.length,
  sourceGoalsPassedCount:sourcePassed.length,
  humanReviewedCount:humanEvaluated.length,
  unreviewedCaseCount:ids.length-humanEvaluated.length,
  statusByCase:statuses,
  realProviderSemanticComplianceClaimed:false,
  actualMinecraftWalkingCertified:false,
  allQualityGatesPassed:false,
  remainingHumanReviewRequired:true,
  sourceOnly:true};
}
