/**
 * R43 — Human-inspectable architectural sections from authoritative B143 voxels.
 * Coordinates are ONLY local B143 design-grid positions. No construction path.
 * Distinguishes objective space evidence from subjective design/aesthetic review.
 * NOT a production auto-design or repair engine. ZERO model/world operations.
 */
import {createHash} from 'node:crypto';
import {reviewR4PlannedProposal} from './b198zr4-planned-source.mjs';
import {inspectR41Candidate} from './b198zr41-architecture-authoring-candidate.mjs';

export const SCHEMA='minecraftaibuilder-b198zr43-architectural-sections-v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const safetystate=()=>({readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0});
const idx=(x,y,z,w,d)=>(y*d+z)*w+x;
const errorCode=e=>String(e?.message??'').match(
 /\b(?:B143|B198ZR[34])_[A-Z0-9_]+/)?.[0]??'UNCLASSIFIED_HOLD';

/** Render an exact small XZ section, NEVER a beautification or generated plan.
 *   # occupied voxel, o supported and head-clear position, . other air.
 *   E/D/V/Z label the inspection anchor if there is enough local space.
 * Centering a map on an anchor does not assert that the anchor is accessible.
 */
function section({grid,w,h,d,headroom,anchor,kind,id,size=17}){
 const [ax,ay,az]=anchor;
 const rx=Math.min(size,w),rz=Math.min(size,d);
 const x0=Math.max(0,Math.min(w-rx,ax-Math.floor(rx/2)));
 const z0=Math.max(0,Math.min(d-rz,az-Math.floor(rz/2)));
 const cell=(x,y,z)=>grid[idx(x,y,z,w,d)]!==0;
 const stand=(x,y,z)=>{
  if(y<1||y+headroom-1>=h||!cell(x,y-1,z))return false;
  for(let dy=0;dy<headroom;dy++)if(cell(x,y+dy,z))return false;
  return true;
 };
 const marker={entrance:'E',destination:'D',void:'V',zone:'Z'}[kind];
 const rows=[];
 for(let z=z0;z<z0+rz;z++){
  let row='';
  for(let x=x0;x<x0+rx;x++){
   const symbol=cell(x,ay,z)?'#':stand(x,ay,z)?'o':'.';
   row+=x===ax&&z===az?marker:symbol;
  }
  rows.push(row);
 }
 return {kind,id,anchor:anchor.slice(),atY:ay,
  originXZ:[x0,z0],dimensionsXZ:[rx,rz],
  rows,anchorOccupied:cell(ax,ay,az),
  anchorStandable:stand(ax,ay,az),
  relativeGridOnly:true};
}
function layerProfiles(primitives,height){
 const layers=Array.from({length:height},(_,y)=>({
  y,occupied:0,minX:null,maxX:null,minZ:null,maxZ:null
 }));
 for(const [x,y,z] of primitives){
  const a=layers[y];
  a.occupied++;
  a.minX=a.minX===null?x:Math.min(a.minX,x);
  a.maxX=a.maxX===null?x:Math.max(a.maxX,x);
  a.minZ=a.minZ===null?z:Math.min(a.minZ,z);
  a.maxZ=a.maxZ===null?z:Math.max(a.maxZ,z);
 }
 return layers.filter(layer=>layer.occupied>0);
}
function massDescriptors(design,profiles){
 const shapeCounts={},modeCounts={};
 for(const e of design.elements){
  shapeCounts[e.shape]=(shapeCounts[e.shape]??0)+1;
  modeCounts[e.mode]=(modeCounts[e.mode]??0)+1;
 }
 let changed=0;
 for(let i=1;i<profiles.length;i++){
  const a=profiles[i-1],b=profiles[i];
  if(b.y!==a.y+1||['minX','maxX','minZ','maxZ','occupied']
   .some(key=>a[key]!==b[key]))changed++;
 }
 return {sourceShapeCounts:shapeCounts,sourceModeCounts:modeCounts,
  occupiedYLayers:profiles.length,adjacentLayerProfileChanges:changed,
  visibleCurvatureVerified:false,
  artisticOriginalityCertified:false};
}
function feedback(result){
 const items=[];
 for(const x of result.protectedVoids){
  if(x.passed)continue;
  items.push({kind:'PRESERVE_REQUIRED_AIR',id:x.id,
   measured:{occupied:x.occupied,volume:x.volume},
   guidance:'実際の最終ADD/CUT後に空洞を残す。後続ADDによる埋め戻しや中実外殻を設計から見直す。'});
 }
 for(const x of result.destinations){
  if(x.passed)continue;
  items.push({kind:'CONNECT_DESTINATION',id:x.id,
   measured:{reachable:x.reachable,shortestPathSteps:x.shortestPathSteps,
    maximumPathSteps:x.maximumPathSteps},
   guidance:'目的地の支持床と頭上空間、階段下端・上端と踊り場の高さ、入口からの連続経路を見直す。'});
 }
 for(const x of result.functionalZones){
  if(x.passed)continue;
  items.push({kind:'FREE_FUNCTIONAL_ZONE',id:x.id,
   measured:{reachable:x.reachable,standable:x.standable,
    regionVolume:x.regionVolume},
   guidance:'家具・構造物ではなく立てる空気領域を確保し、入口から実際に到達できるよう配置する。'});
 }
 return items;
}

/** R43 is a diagnostic advisory, not independent human or provider proof.
 * Declared plan is model-claimed. It is validated by the strict R3 algorithm
 * but the model's choice of easy thresholds remains UNTRUSTED.
 */
export function inspectR43ArchitecturalSections(raw){
 if(typeof raw!=='string'||raw.length===0||Buffer.byteLength(raw)>120000)
  throw Error('B198ZR43_RAW_SIZE');
 const common={schema:SCHEMA,originalRawSha256:sha(raw),
  originalUnmodified:true,modelCalls:0,worldContacts:0,worldWrites:0,
  sourceAuthorshipAuthenticated:false,independentReviewerContractUsed:false,
  humanVisualApproval:false,briefAlignmentCertified:false,
  originalAestheticsCertified:false,physicalWalkingCertified:false,
  constructionApproved:false,safety:safetystate()};
 let r;
 try{r=reviewR4PlannedProposal(raw)}
 catch(e){
  const previous=inspectR41Candidate(raw);
  return {...common,status:'HOLD_SOURCE_OR_ENTRANCE',
   strictErrorCode:errorCode(e),priorR41Status:previous.status,
   priorR41SourceErrorCode:previous.sourceErrorCode,
   crossSections:[],architectureChangesAutoApplied:false};
 }
 const {design,compiled,plan}=r;
 const {width:w,height:h,depth:d}=design.bounds;
 const grid=new Uint8Array(w*h*d);
 for(const [x,y,z,material] of compiled.primitives)
  grid[idx(x,y,z,w,d)]=material+1;
 const profiles=layerProfiles(compiled.primitives,h);
 const review=r.declaredPlanReview;
 const evidence=review.results;
 const anchors=[{kind:'entrance',id:'declared-entrance',point:plan.entrance}];
 for(const item of plan.destinations.slice(0,3))
  anchors.push({kind:'destination',id:item.id,point:item.point});
 for(const item of plan.functionalZones.slice(0,3))
  anchors.push({kind:'zone',id:item.id,point:[
   item.origin[0]+Math.floor((item.size[0]-1)/2),
   item.origin[1],item.origin[2]+Math.floor((item.size[2]-1)/2)]});
 for(const item of plan.protectedVoids.slice(0,2))
  anchors.push({kind:'void',id:item.id,point:[
   item.origin[0]+Math.floor((item.size[0]-1)/2),
   item.origin[1],item.origin[2]+Math.floor((item.size[2]-1)/2)]});
 const crossSections=anchors.map(a=>section({
  grid,w,h,d,headroom:plan.headroom,anchor:a.point,
  kind:a.kind,id:a.id
 }));
 const findings=feedback(evidence);
 const formalPass=review.status==='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS'&&
  r.status==='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS';
 return {...common,status:formalPass?
  'ABSTRACT_SOURCE_AND_MODEL_DECLARED_PLAN_PASS_VISUAL_REVIEW_PENDING':
  'HOLD_ABSTRACT_PROGRAM_OR_ROUTE',
  strictSourceSha256:compiled.sourceSha256,
  strictGeometrySha256:compiled.geometrySha256,
  finalConceptualVoxelCount:compiled.primitives.length,
  dimensions:structuredClone(design.bounds),
  sourceElementCount:design.elements.length,
  massDescriptors:massDescriptors(design,profiles),
  levelProfiles:profiles,maximumCrossSectionWidth:17,
  crossSections,
  abstractFunctionalContractStatus:review.status,
  contractAuthorship:review.contractAuthorship,
  destinationEvidence:evidence.destinations,
  functionalZoneEvidence:evidence.functionalZones,
  voidEvidence:evidence.protectedVoids,
  abstractReachablePositions:evidence.abstractReachablePositions,
  improvementFindings:findings,
  modelSelfDeclaredCriteriaAreNotIndependent:true,
  shapeMetricsDoNotProveBeauty:true,
  humanReviewQuestions:[
   '建築用途に応じた独創的な外観と全体構成になっているか',
   '階層・階段・内部空洞・目的地が使いやすく、設計意図と一致しているか',
   '断面と3D表示が一致し、正面・背面・屋根の構成に説得力があるか'
  ],
  architectureChangesAutoApplied:false};
}
