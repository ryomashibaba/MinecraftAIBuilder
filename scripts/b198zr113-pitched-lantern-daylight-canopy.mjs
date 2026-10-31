/** R113: source-bound pitched lantern canopy alternative. R112 retracts
 * the inner eave but leaves R110's seven collisions. Maintain the original
 * outer high shelf, triangulated roof and reading program; lift/recede only
 * the inner ridge. Source provenance and actual probe nonregression gate all.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy,auditR107AdjacentCorridor}
 from './b198zr107-compact-reading-table-recovery.mjs';
import {CANOPY,retreatR112SourceCanopy}
 from './b198zr112-lantern-canopy-clearance.mjs';
import {deriveR110SourceLane}
 from './b198zr110-source-contoured-right-room-approach.mjs';
import {identifyR111SourceOverhead}
 from './b198zr111-reversible-floor-finish-transition.mjs';
import {extractR104ActiveR91Throat}
 from './b198zr104-r91-active-throat-repair.mjs';

export const SCHEMA='minecraftaibuilder-b198zr113-pitched-lantern-daylight-canopy-v1';
export const PROFILES=Object.freeze([
 {retract:.55,rise:.060},{retract:.65,rise:.090},
 {retract:.75,rise:.120},{retract:.88,rise:.150}
]);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const R=x=>+x.toFixed(7);
const key=p=>p.map(R).join(',');
const fail=x=>{throw Error('B198ZR113_'+x)};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const area=f=>{const u=f.b.map((x,i)=>x-f.a[i]),v=f.c.map((x,i)=>x-f.a[i]);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
 u[0]*v[1]-u[1]*v[0])/2;};
export function reshapeR113SourceCanopy(faces,hitIndex,{retract,rise}={}){
 if(!PROFILES.some(x=>x.retract===retract&&x.rise===rise))
  fail('PREAPPROVED_BOUNDED_PITCH_PROFILE_REQUIRED');
 const prior=retreatR112SourceCanopy(faces,hitIndex,
  {fraction:retract,allowR113Intermediate:retract===.65});
 const groups=new Map();
 for(const i of prior.changedIndices)for(const p of
  [prior.faces[i].a,prior.faces[i].b,prior.faces[i].c]){
  const z=R(p[2]).toString(),k=key(p);
  if(!groups.has(z))groups.set(z,new Map());
  groups.get(z).set(k,p);
 }
 const moved=new Map(),vertices=[];
 for(const station of groups.values()){
  const sorted=[...station.values()].sort((a,b)=>a[0]-b[0]);
  if(sorted.length!==2||sorted[1][0]-sorted[0][0]<.003)
   fail('TWO_ANCHORED_CANOPY_RIDGES_REQUIRED');
  const inner=sorted[0],outer=sorted[1];
  const tip=[inner[0],R(inner[1]+rise),inner[2]];
  const z=tip[2],roof=.98-.095*(z-.17)**2;
  if(tip[1]>=roof-.09)fail('UPLIFT_NEAR_SOURCE_ROOF_REJECTED');
  moved.set(key(inner),tip);moved.set(key(outer),outer);
  vertices.push({originalInner:inner,raisedInner:tip,anchoredOuter:outer});
 }
 const changed=new Set(prior.changedIndices);
 const alternative=prior.faces.map((f,i)=>{
  if(!changed.has(i))return f;
  return {kind:f.kind,...Object.fromEntries(['a','b','c'].map(q=>
   [q,moved.get(key(f[q]))??f[q]]))};
 });
 if(alternative.length!==faces.length||
  [...changed].some(i=>alternative[i].kind!==CANOPY||area(alternative[i])<1e-10)||
  alternative.some((f,i)=>!changed.has(i)&&
   JSON.stringify(f)!==JSON.stringify(faces[i]))||
  sha(alternative)===sha(faces))
  fail('NONLOCAL_OR_DEGENERATE_LANTERN_CEILING');
 return {faces:alternative,retract,rise,changedIndices:prior.changedIndices,
  originalSha256:sha(faces),alternativeSha256:sha(alternative),
  roofAnchoredStations:vertices,
  floorFurnitureAndShelfAnchorsUnmodified:true,
  canopyFacetCountUnchanged:true};
}
export function inspectR113PitchedCanopyStudy(r107){
 if(!r107||!Array.isArray(r107.faces)||!Array.isArray(r107.originalR98Faces)||
  r107.originalR98Faces.length!==4692||
  sha(r107.faces)!==r107.report?.alternativeR107Sha256||
  sha(r107.originalR98Faces)!==r107.report?.originalR98Sha256||
  !r107.report.originalR98Preserved)
  fail('AUTHENTICATED_R107_AND_R98_SOURCE_REQUIRED');
 const baseline=deriveR110SourceLane(r107.faces,r107.originalR98Faces,.035,{gap:.003});
 const hit=identifyR111SourceOverhead(baseline);
 if(!baseline.sourceCoverageComplete||!hit.allCaptured||
  hit.overheadCount!==7||hit.sourceIndices.length!==1||
  hit.sourceIndices[0]!==4474||hit.sourceHits.some(w=>w.kind!==CANOPY))
  fail('SEVEN_ACTUAL_R93_CANOPY_HITS_REQUIRED');
 const throat=extractR104ActiveR91Throat(r107.originalR98Faces);
 const five=auditR107AdjacentCorridor(r107.faces,throat);
 const candidates=[];let winner=null;
 for(const option of PROFILES){
  try {
   const variant=reshapeR113SourceCanopy(r107.faces,4474,option);
  const inspected=deriveR110SourceLane(variant.faces,r107.originalR98Faces,.035,{gap:.003});
  const adjacent=auditR107AdjacentCorridor(variant.faces,throat);
  const noneWorse=adjacent.allFiniteSourceLanesScreened&&
    five.surrogateLanes.every((a,i)=>{
     const v=adjacent.surrogateLanes[i];
     return v.floor<=a.floor&&v.headroom<=a.headroom&&v.lateral<=a.lateral;
    });
  const count=inspected.measured?.witnessCounts;
  const valid=!!count&&inspected.sourceCoverageComplete&&
   inspected.measured.allDeclaredSourceSegmentsWithinProbeCoverage&&
   count.floor===0&&count.lateral===0&&
   count.overhead<hit.overheadCount&&noneWorse;
  const record={...option,faces:variant.changedIndices,
   sourceRoofAndOuterShelfAnchored:true,
   allNineByThreeGrounded:inspected.sourceCoverageComplete,
   oldOverhead:hit.overheadCount,newOverhead:count?.overhead??null,
   newFloor:count?.floor??null,newLateral:count?.lateral??null,
   fiveLaneNonregression:noneWorse,
   accepted:valid,meshSha256:variant.alternativeSha256};
  candidates.push(record);
  if(valid&&(!winner||record.newOverhead<winner.record.newOverhead||
    record.newOverhead===winner.record.newOverhead&&
    record.rise<winner.record.rise))winner={...variant,record};
  }catch(error){
   // A genuine roof/collision/continuity rejection must not prevent
   // inspection of the other three already-authored architectural proposals.
   const message=String(error?.message??error);
   if(!message.startsWith('B198ZR112_')&&
      !message.startsWith('B198ZR113_'))throw error;
   candidates.push({...option,accepted:false,
    rejectedByRealSourceGeometry:message,
    alteredSourceTriangles:0,geometryChanged:false});
  }
 }
 if(candidates.length!==PROFILES.length)
  fail('FOUR_INDEPENDENT_ARCHITECTURAL_DECISIONS_REQUIRED');
 const active=winner?.faces??r107.faces;
 return {faces:active,report:{schema:SCHEMA,
  sourceR98Sha256:sha(r107.originalR98Faces),
  sourceR107Sha256:sha(r107.faces),activeMeshSha256:sha(active),
  originalSourcesPreserved:true,previousHeadroomIntersections:7,
  attributedR93SourceFaceIndex:4474,canopyShapeVariants:candidates,
  selected:winner?.record??null,actual3DFacetsChanged:winner?.changedIndices.length??0,
  geometryChanged:!!winner,
  status:winner?'PITCHED_LANTERN_CANOPY_SOURCE_VARIANT_ART_HOLD':
   'HOLD_NO_NONREGRESSING_PITCHED_LANTERN_CANOPY',
  originalFurnitureFloorAndReadingProgramPreserved:true,
  originalQwenAIAbilityUnchanged:true,realWalkingCertified:false,
  independentArtReview:'NOT_REVIEWED',structuralSupportCertified:false,
  safety:safe()}};
}
export function buildR113PitchedCanopyStudy(nodes){
 return inspectR113PitchedCanopyStudy(buildR107CompactReadingStudy(nodes));
}
