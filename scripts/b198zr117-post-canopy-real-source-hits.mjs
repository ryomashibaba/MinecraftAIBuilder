/** R117: REAL residual collision origin after R113 and R115 re-shaping.
 * No changed current architecture: compare authenticated source alternatives.
 */
import {createHash} from 'node:crypto';
import {buildR107CompactReadingStudy} from './b198zr107-compact-reading-table-recovery.mjs';
import {deriveR110SourceLane} from './b198zr110-source-contoured-right-room-approach.mjs';
import {identifyR111SourceOverhead} from './b198zr111-reversible-floor-finish-transition.mjs';
import {reshapeR113SourceCanopy} from './b198zr113-pitched-lantern-daylight-canopy.mjs';
import {raiseR115LanternAndSupportedBookwall} from './b198zr115-integral-lantern-clerestory.mjs';
export const SCHEMA='minecraftaibuilder-b198zr117-post-canopy-real-source-hits-v1';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=s=>{throw Error('B198ZR117_'+s)};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const points=f=>[f.a,f.b,f.c];
export function compareR117ActualChanges(before,after,declared){
 if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length||
  !Array.isArray(declared)||declared.length<1||new Set(declared).size!==declared.length)
  fail('AUTHENTICATED_EQUAL_MESH_AND_LOCAL_INDICES_REQUIRED');
 const set=new Set(declared),found=[];
 for(let i=0;i<before.length;i++){
  const a=before[i],b=after[i],altered=JSON.stringify(a)!==JSON.stringify(b);
  if(a.kind!==b.kind||altered!==set.has(i))fail('UNDECLARED_SOURCE_MESH_EDIT');
  if(!altered)continue;
  found.push({index:i,kind:a.kind,
   original:points(a),revised:points(b),
   yDisplacements:points(a).map((p,j)=>+(points(b)[j][1]-p[1]).toFixed(7))});
 }
 return found;
}
export function traceR117ResidualCanopyHits(r107){
 if(!r107||!Array.isArray(r107.faces)||!Array.isArray(r107.originalR98Faces)||
  r107.originalR98Faces.length!==4692||
  hash(r107.faces)!==r107.report?.alternativeR107Sha256||
  hash(r107.originalR98Faces)!==r107.report?.originalR98Sha256)
  fail('ORIGINAL_R107_R98_UNVERIFIED');
 const source=r107.faces,original=hash(source);
 const measure=faces=>{
  const lane=deriveR110SourceLane(faces,r107.originalR98Faces,.035,{gap:.003});
  if(!lane.sourceCoverageComplete||!lane.measured?.allDeclaredSourceSegmentsWithinProbeCoverage)
   fail('R110_REAL_GROUNDED_ROUTE_COVERAGE_REQUIRED');
  const origin=identifyR111SourceOverhead(lane);
  if(!origin.allCaptured)fail('TRUNCATED_REAL_SOURCE_HITS');
  return {counts:lane.measured.witnessCounts,
   witnesses:origin.sourceHits,kind:origin.sourceKinds,
   indices:origin.sourceIndices,route:lane.route};
 };
 const baseline=measure(source);
 if(baseline.counts.overhead!==7||baseline.indices.join(',')!=='4474')
  fail('KNOWN_CANOPY_BENCHMARK_CHANGED');
 const models=[
  {key:'R113_pitch_max',study:reshapeR113SourceCanopy(source,4474,
   {retract:.88,rise:.15})},
  {key:'R115_clerestory_max',study:raiseR115LanternAndSupportedBookwall(
   source,4474,{rise:.16})}
 ];
 const results=models.map(({key,study})=>({
  variant:key,sourceGeometrySha256:hash(study.faces),
  changedActualFaces:compareR117ActualChanges(source,study.faces,study.changedIndices),
  sourceProbes:measure(study.faces)
 }));
 if(hash(source)!==original)fail('SOURCE_ORIGINAL_MUTATED');
 return {schema:SCHEMA,historicalR107Sha256:original,
  historicalR98Sha256:hash(r107.originalR98Faces),
  baseline,results,geometryChangedInCurrentBuilding:false,
  firstHitOnlyNotAllOccludedFaces:true,
  humanArtReview:'NOT_REVIEWED',realWorldWalkingCertified:false,safety:safe()};
}
export function buildR117ResidualStudy(nodes){
 return traceR117ResidualCanopyHits(buildR107CompactReadingStudy(nodes));
}
