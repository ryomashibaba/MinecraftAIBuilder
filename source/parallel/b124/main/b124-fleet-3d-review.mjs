/** B124 all-fleet 3D landing/corridor/slab preflight; conceptual and non-executable. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {validateB114} from '../../b114/main/compile-b114.mjs';
import {validateCrossFlightSearch} from '../../b114/main/b114-cross-flight-position-search.mjs';
import {validateStairGalleryIntegration} from '../../b114/main/b114-stair-gallery-integration.mjs';
import {validateApartmentSwitchback} from '../../b114/main/b114-apartment-switchback-3d.mjs';
import {validateB117Review} from '../../b117/main/b117-fleet-review.mjs';
import {validateB121} from '../../b121/main/b121-fleet-review.mjs';
import {validateB122} from '../../b122/main/b122-fleet-route-review.mjs';
import {validateB123} from '../../b123/main/b123-fleet-network-review.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {auditB124StairCorridor3D} from './b124-3d-transition-audit.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(d,n),'utf8'));
function guard(x,tag){
 if(x?.readiness!=='NOT_PREPARED'||x.executionAllowed!==false||
 x.constructionApproved!==false||x.worldContacts!==0||x.worldCoordinates!==null||
 x.commandCount!==0||x.gates?.length!==9||
 x.gates.some(g=>g.status!=='BLOCKED')||x.BuildPlan?.operations?.length!==0)
 throw Error('B124_UNSAFE_SOURCE_'+tag);
}
function modelFor(stair,idea){
 if(idea.shape==='B120_BOUNDED_U_RETURN_5_RISE')
  return buildB120UTurn({origin:idea.origin,ascent:idea.ascent,
   fromLevel:stair.fromLevel,firstRise:idea.firstRise});
 if(idea.shape==='STRAIGHT_HALF_STEP_PROXY')
  return straightModel(idea.origin,idea.ascent,stair.fromLevel);
 throw Error('B124_UNSUPPORTED_SHAPE');
}
function otherStairSolids(cross,apt,target){
 const out=[];
 for(const [i,s]of cross.proposedOriginalStairs.entries()){
  if(i===target)continue;
  const switched=cross.id==='APARTMENT_V1'&&apt.selectedCandidate?.targetFlight===i;
  if(switched){
   const a=apt.selectedCandidate;
   out.push(...a.stairTreadAABBs,...a.platformAABBs,...(a.supportAABBs??[]));
  }else {
   const model=straightModel(s.proposedOrigin,s.proposedAscent,s.fromLevel);
   out.push(...model.treads,...(model.platform??[]),...model.supports);
  }
 }
 return out;
}
export async function assembleB124(dir='b114-review-output'){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apartment=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 const b117=read('b117-review-output','B117_15_Building_Slab_And_Gallery_Holds.json');
 const b121=read('b121-review-output','B121_Joint_Stair_Gallery_Design_Review.json');
 const b122=read('b122-review-output','B122_Full_Length_Corridors_And_Staged_Network.json');
 const b123=read('b123-review-output','B123_All_Stair_Interface_Network_Review.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
 !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apartment)||
 !validateB117Review(b117)||!validateB121(b121)||!validateB122(b122)||
 !validateB123(b123)||b123.sourceB122Integrity!==b122.integritySha256||
 b122.sourceB121Integrity!==b121.integritySha256||
 b117.sourceGalleryIntegrity!==gallery.integritySha256||
 gallery.sourceCrossFlightIntegrity!==cross.integritySha256||
 gallery.sourceApartmentSwitchbackIntegrity!==apartment.integritySha256||
 gallery.sourceB114Integrity!==b114.integritySha256)
 throw Error('B124_PINNED_SOURCE_DIGEST_FAILED');
 [b114,gallery,cross,apartment,b117,b121,b122,b123].forEach((x,i)=>guard(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==gallery.sourceB113Integrity||
 parent.sourceDesigns?.length!==15)throw Error('B124_B113_UNTRUSTED');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId;
  const c117=b117.cases.find(x=>x.id===id);
  const c121=b121.cases.find(x=>x.id===id);
  const c122=b122.cases.find(x=>x.id===id);
  const c123=b123.cases.find(x=>x.id===id);
  const cCross=cross.cases.find(x=>x.id===id);
  if(!c117||!c121||!c122||!c123||!cCross||
    cCross.proposedOriginalStairs.length!==c122.sourceStairs||
    c123.sourceStairs!==c122.sourceStairs||
    c117.stairs!==c122.sourceStairs)
   throw Error('B124_BUILDING_STAIR_INVENTORY_DRIFT_'+id);
  const concepts=[];
  if(c122.candidatesAudited.length){
   const volume=generateB105(design),qa=auditB105(volume,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B124_B105_REFERENCE_INVALID_'+id);
   for(const candidate of c122.candidatesAudited){
    const source=c121.heldExits.find(e=>e.stairIndex===candidate.stairIndex&&
      e.jointDesign.shortlisted[candidate.rank-1]?.shape===candidate.shape&&
      e.jointDesign.shortlisted[candidate.rank-1]?.origin.x===candidate.origin.x&&
      e.jointDesign.shortlisted[candidate.rank-1]?.origin.z===candidate.origin.z);
    const network=c123.conceptCandidates.find(x=>x.stairIndex===candidate.stairIndex&&
      x.rank===candidate.rank);
    if(!source||!network)throw Error('B124_MISSING_PINNED_CANDIDATE');
    const idea=source.jointDesign.shortlisted[candidate.rank-1];
    const stair=cCross.proposedOriginalStairs[candidate.stairIndex];
    const model=modelFor(stair,idea);
    const lo=idea.paths.LOWER?.candidate?.routeFootprint;
    const hi=idea.paths.UPPER?.candidate?.routeFootprint;
    if(!Array.isArray(lo)||!Array.isArray(hi)||
     candidate.routes.find(x=>x.side==='LOWER')?.routeFootprintCells!==lo.length||
     candidate.routes.find(x=>x.side==='UPPER')?.routeFootprintCells!==hi.length)
     throw Error('B124_CORRIDOR_SOURCE_COUNT_DRIFT');
    const openings=new Set(c117.slabs.filter(s=>s.stairIndex!==candidate.stairIndex&&
      s.toLevel===stair.toLevel).flatMap(s=>s.conceptualOpeningCells.map(K)));
    const result=auditB124StairCorridor3D({model,
      lowerFloor:design.plan.floors[stair.fromLevel],
      upperFloor:design.plan.floors[stair.toLevel],
      lowerRoute:lo,upperRoute:hi,
      sourceVoxels:volume.voxels,
      foreignStairSolids:otherStairSolids(cCross,apartment,candidate.stairIndex),
      foreignOpeningCells:openings});
    concepts.push({stairIndex:candidate.stairIndex,rank:candidate.rank,
      shape:candidate.shape,fromLevel:stair.fromLevel,toLevel:stair.toLevel,
      inheritedB122TwoFloorNoConflict:candidate.routes.every(x=>
        x.status==='NO_DETECTED_CONFLICT_IN_SCOPED_PROXIES'),
      inheritedB123NoNewNetworkRegression:network.status===
       'NO_NEW_TWO_WIDE_INTERFACE_REGRESSION_IN_SCOPED_PROXY',
      ...result,constructionAllowed:false});
   }
  }
  cases.push({id,sourceStairs:c122.sourceStairs,conceptFloors:design.plan.floors.length,
   concepts,sourceBuildingUnmodified:true});
 }
 const all=cases.flatMap(x=>x.concepts);
 const totals={buildings:cases.length,
   sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),
   sourceFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
   concepts3DAudited:all.length,
   scopedProxyWithoutNew3DConflict:all.filter(x=>x.status===
    'NO_NEW_CONFLICT_IN_SCOPED_3D_PROXIES'&&
    x.inheritedB122TwoFloorNoConflict&&x.inheritedB123NoNewNetworkRegression).length,
   conceptsWith3DHoldFindings:all.filter(x=>x.status==='HOLD_3D_TRANSITION_REVIEW').length,
   conceptualNewUpperSlabOpeningCells:all.reduce((n,x)=>n+x.conceptualNewUpperOpeningCells,0),
   upperLandingFineStepReviewConcepts:all.filter(x=>x.upperLandingFineStepCollisionReviewNeeded).length,
   actualPhysicalWalkabilityCertified:0,sourceBlocksChanged:0,worldContacts:0};
 if(totals.buildings!==15||totals.sourceStairs!==102||totals.sourceFloors!==66||
 totals.concepts3DAudited!==b122.totals.stairConfigurationsAudited||
 totals.concepts3DAudited!==b123.totals.conceptsReconciled)
 throw Error('B124_FLEET_INCOMPLETE_OR_CONCEPT_DRIFT');
 const base={schema:'minecraftaibuilder-b124-3d-slab-seam-proxy-preflight-v1',
  sourceB123Integrity:b123.integritySha256,
  sourceB122Integrity:b122.integritySha256,
  sourceB117Integrity:b117.integritySha256,
  cases,totals,limitations:[
   'SCOPED_STATIC_B105_VOXEL_AND_PROPOSED_STAIR_AABB_ONLY',
   'UPPER_LANDING_FINE_STEP_AND_ACTUAL_EDUCATION_BLOCKSTATE_UNCERTIFIED',
   'FLOOR_APERTURE_IS_CONCEPT_ONLY_NOT_PHYSICAL_ENGINEERING',
   'TWO_BLOCK_CORRIDOR_BODY_IS_STATIC_PROXY_NOT_REAL_DOOR_OR_TRAVERSAL',
   'ORIGINAL_NINE_EXIT_HOLDS_REMAIN_BLOCKED'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...base,integritySha256:H(base)};
}
export function validateB124(r){
 try{
  const {integritySha256,...base}=r??{},t=r.totals;
  return H(base)===integritySha256&&
   r.schema==='minecraftaibuilder-b124-3d-slab-seam-proxy-preflight-v1'&&
   t.buildings===15&&t.sourceStairs===102&&t.sourceFloors===66&&
   t.concepts3DAudited===r.cases.reduce((n,c)=>n+c.concepts.length,0)&&
   t.actualPhysicalWalkabilityCertified===0&&t.sourceBlocksChanged===0&&
   r.cases.every(c=>c.sourceBuildingUnmodified&&
    c.concepts.every(x=>x.sourceBuildingAndFloorMasksUnchanged&&
     x.worldContacts===0&&!x.constructionAllowed&&
     x.realFloorSupportCertified===false&&
     x.physicalStairBlockStatesCertified===false&&
     x.realPlayerStepAndDoorClearanceCertified===false&&
     x.proposedGeometryApplied===false))&&
   r.readiness==='NOT_PREPARED'&&!r.constructionApproved&&!r.executionAllowed&&
   r.worldContacts===0&&r.worldCoordinates===null&&r.commandCount===0&&
   r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB124(r,out){
 if(!validateB124(r))throw Error('B124_REPORT_FAIL_CLOSED');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B124_3D_Stair_Corridor_Slab_Review.json');
 const csv=path.join(out,'B124_3D_Transition_Findings.csv');
 const md=path.join(out,'B124_3D_Transition_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=['building,stairIndex,fromLevel,toLevel,3DStatus,code,hits,slabOpeningCells'];
 for(const c of r.cases)for(const x of c.concepts){
  if(x.findings.length)for(const f of x.findings)
   rows.push([c.id,x.stairIndex,x.fromLevel,x.toLevel,x.status,f.code,f.hits,
    x.conceptualNewUpperOpeningCells].join(','));
  else rows.push([c.id,x.stairIndex,x.fromLevel,x.toLevel,x.status,'NONE',0,
   x.conceptualNewUpperOpeningCells].join(','));
 }
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B124 — 階段・廊下・上階床開口の3D独立監査（非施工）','',
  '|項目|値|','|---|---:|',
  '|元建物|'+t.buildings+'|','|元階段|'+t.sourceStairs+'|',
  '|元階床|'+t.sourceFloors+'|','|3D監査したB122案|'+t.concepts3DAudited+'|',
  '|限定3D代理形状で追加干渉なし|'+t.scopedProxyWithoutNew3DConflict+'|',
  '|3D衝突・開口などによるHOLD案|'+t.conceptsWith3DHoldFindings+'|',
  '|概念上必要な上階床開口|'+t.conceptualNewUpperSlabOpeningCells+'|',
  '|階段上部踏面の細密衝突未認証案|'+t.upperLandingFineStepReviewConcepts+'|',
  '|Minecraft Education通行認証|0|','',
  ...r.cases.flatMap(c=>c.concepts.map(x=>
   '- '+c.id+' #'+x.stairIndex+' '+x.status+'：'+
   (x.issueCodes.join(' / ')||'限定代理形状の新しい干渉検出なし'))),
  '','## 未認証・施工禁止',
  ...r.limitations.map(x=>'- '+x),'',
  '元の9出口はすべてHOLD / NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB124(path.resolve(process.argv[2]??'b114-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:writeB124(r,path.resolve(process.argv[3]??'b124-review-output'))},null,2));
}
