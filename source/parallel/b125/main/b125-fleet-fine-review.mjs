/** B125: pin B124 evidence, quantify fine half-step/sample landing contact and 8 conceptual cuts. */
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
import {validateB122} from '../../b122/main/b122-fleet-route-review.mjs';
import {validateB123} from '../../b123/main/b123-fleet-network-review.mjs';
import {validateB124} from '../../b124/main/b124-fleet-3d-review.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {auditB125FineLanding} from './b125-fine-landing-proof.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(d,n),'utf8'));
function guard(r,label){
 if(r?.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
 r.executionAllowed!==false||r.worldContacts!==0||r.worldCoordinates!==null||
 r.commandCount!==0||r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.BuildPlan?.operations?.length!==0)throw Error('B125_UNSAFE_PARENT_'+label);
}
function makeModel(stair,idea){
 if(idea.shape==='B120_BOUNDED_U_RETURN_5_RISE')
  return buildB120UTurn({origin:idea.origin,ascent:idea.ascent,
   fromLevel:stair.fromLevel,firstRise:idea.firstRise});
 if(idea.shape==='STRAIGHT_HALF_STEP_PROXY')
  return straightModel(idea.origin,idea.ascent,stair.fromLevel);
 throw Error('B125_UNSUPPORTED_PARENT_STAIR');
}
function otherSolids(cross,target){
 const solids=[];
 for(const [i,stair]of cross.proposedOriginalStairs.entries()){
  if(i===target)continue;
  const m=straightModel(stair.proposedOrigin,stair.proposedAscent,stair.fromLevel);
  solids.push(...m.treads,...m.supports);
 }
 return solids;
}
export async function assembleB125(dir='b114-review-output'){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const b121=read('b121-review-output','B121_Joint_Stair_Gallery_Design_Review.json');
 const b122=read('b122-review-output','B122_Full_Length_Corridors_And_Staged_Network.json');
 const b123=read('b123-review-output','B123_All_Stair_Interface_Network_Review.json');
 const b124=read('b124-review-output','B124_3D_Stair_Corridor_Slab_Review.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
 !validateCrossFlightSearch(cross)||!validateB121(b121)||
 !validateB122(b122)||!validateB123(b123)||!validateB124(b124)||
 gallery.sourceB114Integrity!==b114.integritySha256||
 gallery.sourceCrossFlightIntegrity!==cross.integritySha256||
 b122.sourceB121Integrity!==b121.integritySha256||
 b123.sourceB122Integrity!==b122.integritySha256||
 b124.sourceB123Integrity!==b123.integritySha256||
 b124.sourceB122Integrity!==b122.integritySha256)
 throw Error('B125_PINNED_SOURCE_DIGEST_MISMATCH');
 [b114,gallery,cross,b121,b122,b123,b124].forEach((x,i)=>guard(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==gallery.sourceB113Integrity||
 parent.sourceDesigns?.length!==15)throw Error('B125_SOURCE_PARENT_DRIFT');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId;
  const cCross=cross.cases.find(c=>c.id===id);
  const c113=b113.cases.find(c=>c.id===id);
  const c121=b121.cases.find(c=>c.id===id);
  const c122=b122.cases.find(c=>c.id===id);
  const c124=b124.cases.find(c=>c.id===id);
  if(!cCross||!c113||!c121||!c122||!c124||
    cCross.proposedOriginalStairs.length!==c124.sourceStairs||
    c124.concepts.length!==c122.candidatesAudited.length)
   throw Error('B125_STAIR_INVENTORY_CHANGED_'+id);
  const reviews=[];
  if(c124.concepts.length){
   const volume=generateB105(design),qa=auditB105(volume,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B125_SOURCE_VOXELS_INVALID');
   for(const candidate of c124.concepts){
    const parentIdea=c121.heldExits.find(e=>e.stairIndex===candidate.stairIndex&&
      e.jointDesign.shortlisted[candidate.rank-1]?.shape===candidate.shape);
    const prev=c122.candidatesAudited.find(c=>c.stairIndex===candidate.stairIndex&&
      c.rank===candidate.rank&&c.shape===candidate.shape);
    const idea=parentIdea?.jointDesign.shortlisted[candidate.rank-1];
    if(!idea||!prev||candidate.inheritedB123NoNewNetworkRegression!==true)
     throw Error('B125_UNPINNED_B124_CONCEPT');
    const stair=cCross.proposedOriginalStairs[candidate.stairIndex];
    if(!stair||stair.fromLevel!==candidate.fromLevel||stair.toLevel!==candidate.toLevel||
      idea.origin.x!==prev.origin.x||idea.origin.z!==prev.origin.z||
      idea.ascent.dx!==prev.ascent.dx||idea.ascent.dz!==prev.ascent.dz)
     throw Error('B125_CANDIDATE_GEOMETRY_CHANGED');
    const model=makeModel(stair,idea);
    const protectedUpperWalk=new Set([
      ...design.plan.floors[stair.toLevel].gallery,
      ...c113.horizontalRoutes[stair.toLevel].repair.addedCells].map(K));
    const result=auditB125FineLanding({
      shape:idea.shape,model,
      upperFloor:design.plan.floors[stair.toLevel],
      protectedUpperWalk,previousB124:candidate,
      sourceVoxels:volume.voxels,
      foreignStairSolids:otherSolids(cCross,candidate.stairIndex)});
    reviews.push({stairIndex:candidate.stairIndex,rank:candidate.rank,
      shape:idea.shape,sourceB124NoNew3DConflict:candidate.status===
      'NO_NEW_CONFLICT_IN_SCOPED_3D_PROXIES',...result});
   }
  }
  cases.push({id,sourceStairs:c124.sourceStairs,
    sourceFloors:c124.conceptFloors,reviews,originalBuildingUnmodified:true});
 }
 const all=cases.flatMap(x=>x.reviews);
 const totals={buildings:cases.length,
  sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),
  sourceFloors:cases.reduce((n,c)=>n+c.sourceFloors,0),
  fineReviewedConcepts:all.length,
  refinedScopedNoNewCollision:all.filter(x=>
    x.status==='NO_NEW_FINE_SAMPLE_PROXY_COLLISION_DETECTED_UNCERTIFIED').length,
  fineLandingOrCutHolds:all.filter(x=>x.status==='HOLD_FINE_LANDING_OR_APERTURE_REVIEW').length,
  replayedConceptualCutCells:all.reduce((n,x)=>n+x.independentlyReplayedOpeningCells,0),
  refinedNearUpperSamples:all.reduce((n,x)=>n+x.samplesNearUpperSlab,0),
  realWalkabilityCertified:0,actualSourceChanges:0,worldContacts:0};
 if(totals.buildings!==15||totals.sourceStairs!==102||totals.sourceFloors!==66||
 totals.fineReviewedConcepts!==b124.totals.concepts3DAudited||
 totals.replayedConceptualCutCells!==b124.totals.conceptualNewUpperSlabOpeningCells)
 throw Error('B125_INCOMPLETE_15_66_102_EVIDENCE');
 const data={schema:'minecraftaibuilder-b125-fine-step-landing-cut-offline-v1',
  sourceB124Integrity:b124.integritySha256,
  sourceB123Integrity:b123.integritySha256,
  sourceB122Integrity:b122.integritySha256,
  cases,totals,limitations:[
   'FINE_SAMPLES_ARE_HALF_STEP_DESIGN_PROXIES_NOT_EDUCATION_PHYSICS',
   'B105_STATIC_VOXELIR_IS_NOT_A_LIVE_WORLD_MEASUREMENT',
   'EIGHT_PROPOSED_SLAB_CUTS_ARE_UNBUILT_AND_REQUIRE_LOAD_SUPPORT_REVIEW',
   'EDUCATION_STAIR_BLOCKSTATE_ORIENTATION_AND_DOOR_SWING_UNVERIFIED',
   'ALL_ORIGINAL_NINE_EXIT_HOLDS_REMAIN_BLOCKED'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...data,integritySha256:H(data)};
}
export function validateB125(r){
 try{
  const {integritySha256,...body}=r??{},t=r.totals;
  return H(body)===integritySha256&&
   r.schema==='minecraftaibuilder-b125-fine-step-landing-cut-offline-v1'&&
   t.buildings===15&&t.sourceStairs===102&&t.sourceFloors===66&&
   t.fineReviewedConcepts===r.cases.reduce((n,c)=>n+c.reviews.length,0)&&
   t.replayedConceptualCutCells===r.cases.reduce((n,c)=>n+
    c.reviews.reduce((m,x)=>m+x.independentlyReplayedOpeningCells,0),0)&&
   t.realWalkabilityCertified===0&&t.actualSourceChanges===0&&
   r.cases.every(c=>c.originalBuildingUnmodified&&c.reviews.every(x=>
    x.educationStairBlockStateOrientation==='UNVERIFIED'&&
    x.structuralBearingAndRetainedSlabLoad==='UNVERIFIED'&&
    x.physicalTraversalCertified===false&&x.constructionAllowed===false&&
    x.worldContacts===0&&x.sourceGeometryUnchanged&&
    x.approvedSourceEdits===0&&x.BuildPlanOperations.length===0))&&
   r.readiness==='NOT_PREPARED'&&!r.constructionApproved&&!r.executionAllowed&&
   r.worldContacts===0&&r.worldCoordinates===null&&r.commandCount===0&&
   r.gates.length===9&&r.gates.every(x=>x.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB125(r,output){
 if(!validateB125(r))throw Error('B125_UNSAFE_OR_MALFORMED_REPORT');
 fs.mkdirSync(output,{recursive:true});
 const json=path.join(output,'B125_Fine_Step_Landing_Slab_Review.json'),
  csv=path.join(output,'B125_Fine_Landing_Conflict_Cells.csv'),
  md=path.join(output,'B125_Fine_Step_Landing_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=['building,stair,shape,code,hitCount,sampleCoordinates,stillHOLD'];
 for(const c of r.cases)for(const x of c.reviews){
  if(!x.findings.length)rows.push([c.id,x.stairIndex,x.shape,'NONE',0,'','YES'].join(','));
  for(const f of x.findings)rows.push([c.id,x.stairIndex,x.shape,f.code,f.hits,
    JSON.stringify(f.samples).replaceAll('"','""'),'YES'].map((v,i)=>i===5?'"'+v+'"':v).join(','));
 }
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
 '# B125 — 階段上部の半段細密・床開口の独立監査（非施工）','',
 '|項目|結果|','|---|---:|',
 '|元建物|'+t.buildings+'|','|元階段|'+t.sourceStairs+'|',
 '|元階床|'+t.sourceFloors+'|','|B124から継承した細密監査候補|'+t.fineReviewedConcepts+'|',
 '|限定細密代理形状で新規衝突なし|'+t.refinedScopedNoNewCollision+'|',
 '|細密検査・保護対象衝突による追加HOLD|'+t.fineLandingOrCutHolds+'|',
 '|独立照合した仮想床開口セル|'+t.replayedConceptualCutCells+'|',
 '|上階近傍の身体断面検査数|'+t.refinedNearUpperSamples+'|',
 '|実Educationの通行認証|0|','',
 ...r.cases.flatMap(c=>c.reviews.map(x=>'- '+c.id+' #'+x.stairIndex+' '+
  x.status+'：'+(x.findingCodes.join(' / ')||'今回の限定断面では検出なし')+
  ' / 仮想床開口 '+x.cutCells.length+'セル')),
 '','## 実機未認証および施工HOLD',
 ...r.limitations.map(x=>'- '+x),'',
 '元の9出口はすべてHOLD / NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB125(path.resolve(process.argv[2]??'b114-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:writeB125(r,path.resolve(process.argv[3]??'b125-review-output'))},null,2));
}
