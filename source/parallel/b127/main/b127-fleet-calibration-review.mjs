/** B127: source-pinned half-step shape orientation hypothesis review, not world calibration. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {validateB114} from '../../b114/main/compile-b114.mjs';
import {validateCrossFlightSearch} from '../../b114/main/b114-cross-flight-position-search.mjs';
import {validateStairGalleryIntegration} from '../../b114/main/b114-stair-gallery-integration.mjs';
import {validateB121} from '../../b121/main/b121-fleet-review.mjs';
import {validateB125} from '../../b125/main/b125-fleet-fine-review.mjs';
import {validateB126} from '../../b126/main/b126-fleet-blockstate-review.mjs';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {reviewB127HalfStepOrientations} from './b127-halfstep-orientation.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(d,n),'utf8'));
function guard(r,label){
 if(r?.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
 r.executionAllowed!==false||r.worldContacts!==0||r.worldCoordinates!==null||
 r.commandCount!==0||r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.BuildPlan?.operations?.length!==0)throw Error('B127_UNSAFE_PARENT_'+label);
}
export async function assembleB127(dir='b114-review-output'){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const b121=read('b121-review-output','B121_Joint_Stair_Gallery_Design_Review.json');
 const b125=read('b125-review-output','B125_Fine_Step_Landing_Slab_Review.json');
 const b126=read('b126-review-output','B126_Stair_Blockstate_Slab_Fit_Review.json');
 if(!validateB114(b114)||!validateCrossFlightSearch(cross)||
 !validateStairGalleryIntegration(gallery)||!validateB121(b121)||
 !validateB125(b125)||!validateB126(b126)||
 b126.sourceB125Integrity!==b125.integritySha256||
 gallery.sourceB114Integrity!==b114.integritySha256||
 gallery.sourceCrossFlightIntegrity!==cross.integritySha256)
 throw Error('B127_PINNED_SOURCE_DIGEST_FAILED');
 [b114,cross,gallery,b121,b125,b126].forEach((r,i)=>guard(r,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==gallery.sourceB113Integrity||
 parent.sourceDesigns?.length!==15)throw Error('B127_B113_REFERENCE_DRIFT');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId;
  const c125=b125.cases.find(c=>c.id===id),c126=b126.cases.find(c=>c.id===id);
  const c121=b121.cases.find(c=>c.id===id);
  const cCross=cross.cases.find(c=>c.id===id);
  if(!c125||!c126||!c121||!cCross||
   c125.sourceStairs!==c126.originalStairs||
   c125.sourceFloors!==c126.originalFloors||
   c125.reviews.length!==c126.reviews.length||
   c126.originalStairs!==cCross.proposedOriginalStairs.length)
  throw Error('B127_FLEET_INVENTORY_MISMATCH_'+id);
  const reviews=[];
  for(const prior of c126.reviews){
   const from125=c125.reviews.find(x=>x.stairIndex===prior.stairIndex&&x.rank===prior.rank);
   const e=c121.heldExits.find(x=>x.stairIndex===prior.stairIndex&&
    x.jointDesign.shortlisted[prior.rank-1]?.shape===prior.shape);
   const idea=e?.jointDesign.shortlisted[prior.rank-1],
    stair=cCross.proposedOriginalStairs[prior.stairIndex];
   if(!from125||!idea||!stair||stair.fromLevel!==prior.fromLevel||
     stair.toLevel!==prior.toLevel)
    throw Error('B127_CANDIDATE_GEOMETRY_DRIFT');
   if(prior.shape!=='STRAIGHT_HALF_STEP_PROXY'){
    reviews.push({stairIndex:prior.stairIndex,rank:prior.rank,
     shape:prior.shape,status:'HOLD_U_TURN_ORIENTATION_MAPPING_UNRESOLVED',
     worldContacts:0,operations:[],constructionAllowed:false,
     realEducationCollisionCertified:false});
    continue;
   }
   const model=straightModel(idea.origin,idea.ascent,stair.fromLevel);
   const r=reviewB127HalfStepOrientations({model,
     priorB126:prior,sourceB125CutCells:from125.cutCells});
   reviews.push({stairIndex:prior.stairIndex,rank:prior.rank,shape:prior.shape,...r});
  }
  cases.push({id,originalStairs:c126.originalStairs,
   originalFloors:c126.originalFloors,reviews,sourceBuildingUnchanged:true});
 }
 const all=cases.flatMap(x=>x.reviews),straight=all.filter(x=>x.shape==='STRAIGHT_HALF_STEP_PROXY');
 const totals={buildings:cases.length,
  originalStairs:cases.reduce((n,c)=>n+c.originalStairs,0),
  originalFloors:cases.reduce((n,c)=>n+c.originalFloors,0),
  configurationsReviewed:all.length,
  halfStepSourceSamples:straight.reduce((n,r)=>n+r.sourceHalfStepSamplePoints,0),
  matchedSourceProxyShapeCandidates:straight.filter(r=>r.minimumShapeMismatchSamples===0).length,
  genericDirectionPermutationsStillUnverified:straight.reduce((n,r)=>n+r.unverifiedDirectionBijections,0),
  certifiedRealEducationOrientationMappings:0,
  realStepPasses:0,worldContacts:0,sourceBlocksChanged:0};
 if(totals.buildings!==15||totals.originalStairs!==102||totals.originalFloors!==66||
 totals.configurationsReviewed!==b126.totals.conceptualConfigurationsReviewed)
 throw Error('B127_FLEET_TOTALS_DRIFT');
 const data={schema:'minecraftaibuilder-b127-halfstep-facing-calibration-gate-offline-v1',
  sourceB126Integrity:b126.integritySha256,sourceB125Integrity:b125.integritySha256,
  cases,totals,
  limitations:[
   '40_LOCAL_HALF_STEP_SAMPLES_ARE_VIRTUAL_PROXY_NOT_EDUCATION_COLLISION',
   '24_GENERIC_BEDROCK_TO_CARDINAL_DIRECTION_MAPPINGS_HAVE_NO_EDUCATION_RECEIPTS',
   'NO_IN_GAME_BLOCK_PLACEMENT_READBACK_OR_TRAVERSAL',
   'UPPER_SLAB_CUT_8_CELLS_IS_UNBUILT_AND_SUPPORT_UNVERIFIED',
   'NINE_ORIGINAL_EXITS_AND_ALL_CONSTRUCTION_GATES_REMAIN_BLOCKED'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...data,integritySha256:H(data)};
}
export function validateB127(r){
 try{
  const {integritySha256,...base}=r??{},t=r.totals;
  return H(base)===integritySha256&&
   r.schema==='minecraftaibuilder-b127-halfstep-facing-calibration-gate-offline-v1'&&
   t.buildings===15&&t.originalStairs===102&&t.originalFloors===66&&
   t.configurationsReviewed===r.cases.reduce((n,c)=>n+c.reviews.length,0)&&
   t.certifiedRealEducationOrientationMappings===0&&t.realStepPasses===0&&
   t.worldContacts===0&&t.sourceBlocksChanged===0&&
   r.cases.every(c=>c.sourceBuildingUnchanged&&c.reviews.every(x=>
    x.worldContacts===0&&x.constructionAllowed===false&&
    x.operations.length===0&&
    (x.shape!=='STRAIGHT_HALF_STEP_PROXY'||
     (x.verifiedWorldStairStates===0&&x.verifiedPhysicalStepPasses===0&&
      x.actualBlockStateMapping===null&&x.worldCoordinates===null&&
      x.directionHypotheses.length===24&&
      x.directionHypotheses.every(d=>!d.calibrated&&!d.constructionAllowed)))))&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB127(r,output){
 if(!validateB127(r))throw Error('B127_FAIL_CLOSED');
 fs.mkdirSync(output,{recursive:true});
 const json=path.join(output,'B127_Halfstep_Facing_Offline_Review.json');
 const csv=path.join(output,'B127_Hypothesis_Comparisons.csv');
 const md=path.join(output,'B127_Halfstep_Orientation_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=['building,stair,shape,localAscent,shapeHypothesis,sourceSamples,sourceMismatch,realEducationValidated'];
 for(const c of r.cases)for(const x of c.reviews){
  for(const g of x.twoSourceProxyShapeTests??[])
   rows.push([c.id,x.stairIndex,x.shape,
    x.localAscent.dx+'/'+x.localAscent.dz,
    g.kind,g.samplePoints,g.mismatchedSourceTreadSamples,'NO'].join(','));
 }
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B127 — 階段の半段形状照合と向きの未認証候補整理（非施工）','',
  '|項目|結果|','|---|---:|',
  '|元建物|'+t.buildings+'|','|元階段|'+t.originalStairs+'|',
  '|元階床|'+t.originalFloors+'|','|候補設計|'+t.configurationsReviewed+'|',
  '|半段ローカルサンプル|'+t.halfStepSourceSamples+'|',
  '|元設計踏面と一致する試作形状候補|'+t.matchedSourceProxyShapeCandidates+'|',
  '|実機で未校正の向きの全単射候補|'+t.genericDirectionPermutationsStillUnverified+'|',
  '|Education実機向き認証|0|','|実階段通行認証|0|','',
  ...r.cases.flatMap(c=>c.reviews.map(x=>'- '+c.id+' #'+x.stairIndex+' '+x.status+
   (x.sourceProxyPreferredHalfShape?' / 設計上の形状='+x.sourceProxyPreferredHalfShape:''))),
  '','## 安全制限',...r.limitations.map(x=>'- '+x),'',
  'B127の一致は元設計AABBのみ。Bedrockのgeneric stateとEducationの実機状態は未照合。',
  'HOLD 9件 / NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[] / worldContacts=0'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB127(path.resolve(process.argv[2]??'b114-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:writeB127(r,path.resolve(process.argv[3]??'b127-review-output'))},null,2));
}
