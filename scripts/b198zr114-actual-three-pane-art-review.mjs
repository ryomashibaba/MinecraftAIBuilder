/** R114: fail-closed, three-pane actual source-mesh art comparison.
 * The R97 renderer requires EXACTLY THREE variants; R111-R113 accidentally
 * passed two when a geometry change was accepted. This adapter preserves
 * full before/after mesh and gives a useful isolated changed-facet third view.
 * Rendering is schematic SVG; no z-buffer, human art or walking certification.
 */
import {createHash} from 'node:crypto';
import {buildR97CompareViews,R97_VIEW_IDS}
 from './b198zr97-multiview-mesh-review.mjs';

export const SCHEMA='minecraftaibuilder-b198zr114-actual-three-pane-canopy-art-review-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('B198ZR114_'+x)};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const finite=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const canopy=k=>k==='right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY';
const bookwall=k=>k==='right_R93_LANTERN_BOOKWALL_NOT_CERTIFIED';
const bench=k=>k==='right_R93_CONTINUOUS_READING_SEAT_LEDGE_NOT_OCCUPANCY_CERTIFIED';
const floor=k=>k.startsWith('right_R87_CONTIGUOUS_PROGRAM_TERRACE')||
 k.startsWith('right_R94_UNFURNISHED_TRUE_TERRACE_THRESHOLD');
const permitted=(k,phase)=>phase==='R111'?floor(k):
 (phase==='R115'||phase==='R118')?(canopy(k)||bookwall(k)||
  phase==='R118'&&bench(k)):canopy(k);
export function buildR114ThreePaneReview(before,after,{phase,focus=[.54,.55,-.69]}={}){
 if(!['R111','R112','R113','R115','R118'].includes(phase)||!Array.isArray(before)||
  !Array.isArray(after)||before.length!==after.length||before.length<1||
  !finite(focus))
  fail('TWO_EQUAL_LENGTH_REAL_SOURCE_VARIANTS_REQUIRED');
 const changes=[];
 for(let i=0;i<before.length;i++){
  const original=before[i],modified=after[i];
  for(const f of [original,modified]){
   if(!f||typeof f.kind!=='string'||!['a','b','c'].every(k=>finite(f[k])))
    fail('VALID_TRIANGULATED_SOURCE_REQUIRED');
  }
  if(JSON.stringify(original)===JSON.stringify(modified))continue;
  if(original.kind!==modified.kind||!permitted(original.kind,phase))
   fail('ONLY_PHASE_SOURCE_FACETS_MAY_CHANGE');
  changes.push(i);
 }
 if(changes.length<1||changes.length>40)
  fail('LOCAL_BOUNDED_REAL_SOURCE_DELTA_REQUIRED');
 const clipped=changes.map(i=>after[i]);
 // These are the exact final changed facets, not invented render proxies.
 // Full before/after meshes stay intact, and only changed source facets
 // appear in the third (isolated) comparison panel.
 const views=buildR97CompareViews([
  {revision:phase+' historical original — FULL',faces:before},
  {revision:phase+' geometry proposal — FULL',faces:after},
  {revision:phase+' altered facets ONLY — CLIPPED',faces:clipped}
 ],focus);
 if(views.length!==R97_VIEW_IDS.length||
  views.some((v,i)=>v.id!==R97_VIEW_IDS[i]||
   v.sampleTriangleCounts[0]!==before.length||
   v.sampleTriangleCounts[1]!==after.length||
   v.sampleTriangleCounts[2]!==changes.length))
  fail('SIX_VIEW_REAL_TRIANGLE_FRAME_MISMATCH');
 return {schema:SCHEMA,phase,originalSha256:sha(before),candidateSha256:sha(after),
  sourceFacetCount:before.length,sourceFacetIndicesChanged:changes,
  clippedActualFacetCount:clipped.length,
  comparisonMode:'TWO_COMPLETE_MESHES_PLUS_ACTUAL_DELTA_ONLY',
  sameCameraAcrossThreePanels:true,
  projectionHasNoAccurateOcclusion:true,sourceMeshUntouched:true,
  humanAestheticReview:'NOT_REVIEWED',realTraversalCertified:false,
  authorHasNotApprovedRevisedArchitecture:true,
  safety:safe(),views};
}
