/** B126: bind Bedrock stair-state candidate evidence to B125 full fleet without world commands. */
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
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {auditB126StairMaterialization} from './b126-stair-blockstate-witness.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(d,n),'utf8'));
function guard(r,label){
 if(r?.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
 r.executionAllowed!==false||r.worldContacts!==0||r.worldCoordinates!==null||
 r.commandCount!==0||r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.BuildPlan?.operations?.length!==0)throw Error('B126_UNSAFE_PARENT_'+label);
}
function modelFor(stair,idea){
 if(idea.shape==='B120_BOUNDED_U_RETURN_5_RISE')
  return buildB120UTurn({origin:idea.origin,ascent:idea.ascent,
   fromLevel:stair.fromLevel,firstRise:idea.firstRise});
 if(idea.shape==='STRAIGHT_HALF_STEP_PROXY')
  return straightModel(idea.origin,idea.ascent,stair.fromLevel);
 throw Error('B126_UNSUPPORTED_SOURCE_SHAPE');
}
export async function assembleB126(dir='b114-review-output'){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const b121=read('b121-review-output','B121_Joint_Stair_Gallery_Design_Review.json');
 const b125=read('b125-review-output','B125_Fine_Step_Landing_Slab_Review.json');
 if(!validateB114(b114)||!validateCrossFlightSearch(cross)||
 !validateStairGalleryIntegration(gallery)||!validateB121(b121)||!validateB125(b125)||
 gallery.sourceB114Integrity!==b114.integritySha256||
 gallery.sourceCrossFlightIntegrity!==cross.integritySha256||
 b121.sourceB114Integrity!==b114.integritySha256)
 throw Error('B126_PARENT_DIGEST_MISMATCH');
 [b114,cross,gallery,b121,b125].forEach((x,i)=>guard(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==gallery.sourceB113Integrity||
 parent.sourceDesigns?.length!==15)throw Error('B126_SOURCE_PARENT_DRIFT');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,
   c113=b113.cases.find(c=>c.id===id),
   c125=b125.cases.find(c=>c.id===id),
   c121=b121.cases.find(c=>c.id===id),
   cCross=cross.cases.find(c=>c.id===id);
  if(!c113||!c125||!c121||!cCross||
   c125.sourceStairs!==cCross.proposedOriginalStairs.length||
   c125.sourceFloors!==design.plan.floors.length)
  throw Error('B126_INCOMPLETE_FLEET_'+id);
  const reviews=[];
  if(c125.reviews.length){
   const volume=generateB105(design),qa=auditB105(volume,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B126_INVALID_B105_'+id);
   for(const prior of c125.reviews){
    const e=c121.heldExits.find(x=>x.stairIndex===prior.stairIndex&&
     x.jointDesign.shortlisted[prior.rank-1]?.shape===prior.shape);
    if(!e)throw Error('B126_STAIR_NOT_PINNED_'+id);
    const idea=e.jointDesign.shortlisted[prior.rank-1],
     stair=cCross.proposedOriginalStairs[prior.stairIndex];
    if(!stair||stair.fromLevel!==prior.fromLevel||stair.toLevel!==prior.toLevel)
     throw Error('B126_STAIR_FLOOR_CHANGED');
    const model=modelFor(stair,idea);
    const protectedWalk=new Set([
     ...design.plan.floors[stair.toLevel].gallery,
     ...c113.horizontalRoutes[stair.toLevel].repair.addedCells].map(K));
    const proof=auditB126StairMaterialization({
     shape:prior.shape,model,
     upperFloor:design.plan.floors[stair.toLevel],
     sourceVoxels:volume.voxels,
     b125CutCells:prior.cutCells,
     referenceCutCount:prior.independentlyReplayedOpeningCells,
     protectedWalk});
    reviews.push({stairIndex:prior.stairIndex,rank:prior.rank,
     originalB125Status:prior.status, ...proof});
   }
  }
  cases.push({id,originalStairs:c125.sourceStairs,
    originalFloors:c125.sourceFloors,reviews,sourceBuildingUnchanged:true});
 }
 const all=cases.flatMap(c=>c.reviews);
 const totals={
  buildings:cases.length,sourceStairs:cases.reduce((s,c)=>s+c.originalStairs,0),
  sourceFloors:cases.reduce((s,c)=>s+c.originalFloors,0),
  conceptualConfigurationsReviewed:all.length,
  materialCandidateStairCells:all.reduce((s,x)=>s+x.analyzedPotentialStairCells,0),
  conceptualUpperFloorCutCells:all.reduce((s,x)=>s+x.conceptualCutCells,0),
  stillBlockedByMaterializedOverlap:all.filter(x=>x.status==='HOLD_STAIR_BLOCKSTATE_AND_SLAB_FIT').length,
  preservedSlabBlockOverlapCells:all.reduce((s,x)=>s+x.retainedSlabBlockOverlapCount,0),
  actuallyVerifiedEducationStairOrientations:0,
  realMovementCertified:0,sourceBlockWrites:0,worldContacts:0
 };
 if(totals.buildings!==15||totals.sourceStairs!==102||totals.sourceFloors!==66||
 totals.conceptualConfigurationsReviewed!==b125.totals.fineReviewedConcepts||
 totals.conceptualUpperFloorCutCells!==b125.totals.replayedConceptualCutCells)
 throw Error('B126_PARENT_INVENTORY_DRIFT');
 const data={schema:'minecraftaibuilder-b126-stair-blockstate-candidate-slab-fit-offline-v1',
  sourceB125Integrity:b125.integritySha256,cases,totals,
  limitations:[
   'BEDROCK_GENERIC_STAIR_STATES_ARE_REFERENCED_NOT_EDUCATION_VERSION_CERTIFIED',
   'WEIRDO_DIRECTION_TO_DESIGN_ASCENT_MAPPING_REQUIRES_EXPLICIT_EDUCATION_CALIBRATION',
   'UPPER_FLOOR_AND_SOURCE_B105_VOXEL_CONFLICTS_ARE_DESIGN_LOCAL_PROXIES',
   'U_TURN_CORNER_AND_PLATFORM_BLOCKSTATE_NOT_DERIVED',
   'ALL_NINE_HOLDS_REMAIN_NOT_PREPARED_AND_NO_CONSTRUCTION_COMMANDS'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...data,integritySha256:H(data)};
}
export function validateB126(r){
 try{
  const {integritySha256,...base}=r??{},t=r.totals;
  return H(base)===integritySha256&&
   r.schema==='minecraftaibuilder-b126-stair-blockstate-candidate-slab-fit-offline-v1'&&
   t.buildings===15&&t.sourceStairs===102&&t.sourceFloors===66&&
   t.conceptualConfigurationsReviewed===r.cases.reduce((s,c)=>s+c.reviews.length,0)&&
   t.actuallyVerifiedEducationStairOrientations===0&&t.realMovementCertified===0&&
   t.sourceBlockWrites===0&&t.worldContacts===0&&
   r.cases.every(c=>c.sourceBuildingUnchanged&&c.reviews.every(x=>
    x.constructionAllowed===false&&x.stateMappingAuthorized===false&&
    x.educationVersionBlockRegistryCertified===false&&
    x.actualBlockFacingCertified===false&&x.physicalPassageCertified===false&&
    x.worldContacts===0&&x.worldCoordinates===null&&
    x.operations.length===0&&x.sourceBuildingModified===false))&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(x=>x.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB126(r,output){
 if(!validateB126(r))throw Error('B126_UNSAFE_EVIDENCE');
 fs.mkdirSync(output,{recursive:true});
 const json=path.join(output,'B126_Stair_Blockstate_Slab_Fit_Review.json');
 const csv=path.join(output,'B126_NonExecutable_Stair_Block_Candidates.csv');
 const md=path.join(output,'B126_Blockstate_Candidate_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=['building,stairIndex,shape,localX,localY,localZ,hypotheticalBlock,possibleDirections,educationValidated,constructionAllowed'];
 for(const c of r.cases)for(const x of c.reviews){
  for(const b of x.blocks)rows.push([
   c.id,x.stairIndex,x.shape,b.relativeDesignCell.x,b.relativeDesignCell.y,
   b.relativeDesignCell.z,b.hypotheticalMaterial,
   b.possibleWeirdoDirections.join('/'),'NO','NO'].join(','));
 }
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
 '# B126 — Education階段BlockState候補と上階床の重なり監査（施工なし）','',
 '|項目|結果|','|---|---:|',
 '|原典建物|'+t.buildings+'|','|原典階段|'+t.sourceStairs+'|',
 '|原典階床|'+t.sourceFloors+'|','|構成を照合した候補|'+t.conceptualConfigurationsReviewed+'|',
 '|階段ブロック候補セル|'+t.materialCandidateStairCells+'|',
 '|概念上の床開口セル|'+t.conceptualUpperFloorCutCells+'|',
 '|既存床とのブロック重なりセル|'+t.preservedSlabBlockOverlapCells+'|',
 '|床・ブロックモデルによる追加HOLD案|'+t.stillBlockedByMaterializedOverlap+'|',
 '|Education実機で認証した向き|0|','',
 ...r.cases.flatMap(c=>c.reviews.map(x=>'- '+c.id+' #'+x.stairIndex+
  ' '+x.status+' / '+x.findings.map(f=>f.code+':'+f.count).join(', '))),
 '','## 出典と未認証',...r.limitations.map(s=>'- '+s),'',
 'generic Bedrock vanilla registry: https://learn.microsoft.com/en-us/minecraft/creator/reference/content/blockreference/examples/auxvaluetoblockstatemap?view=minecraft-bedrock-stable',
 '',
 'HOLD 9件 / NOT_PREPARED / BLOCKED 9 / BuildPlan.operations=[] / worldContacts=0'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB126(path.resolve(process.argv[2]??'b114-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:writeB126(r,path.resolve(process.argv[3]??'b126-review-output'))},null,2));
}
