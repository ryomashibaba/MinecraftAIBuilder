/** B123 15-building / 102-stair interface reconciliation, no-world review only. */
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
import {validateB121} from '../../b121/main/b121-fleet-review.mjs';
import {validateB122} from '../../b122/main/b122-fleet-route-review.mjs';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {reconcileB123StairInterfaces} from './b123-interface-network.mjs';

const K=p=>p.x+','+p.z;
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(d,n),'utf8'));
function guard(x,tag){
 if(x?.readiness!=='NOT_PREPARED'||x.executionAllowed!==false||
 x.constructionApproved!==false||x.worldContacts!==0||x.worldCoordinates!==null||
 x.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED')||
 x.BuildPlan?.operations?.length!==0)throw Error('B123_UNSAFE_PARENT_'+tag);
}
function pose(stair,idea){
 if(idea.shape==='B120_BOUNDED_U_RETURN_5_RISE')
  return buildB120UTurn({origin:idea.origin,ascent:idea.ascent,
   fromLevel:stair.fromLevel,firstRise:idea.firstRise});
 if(idea.shape==='STRAIGHT_HALF_STEP_PROXY')
  return straightModel(idea.origin,idea.ascent,stair.fromLevel);
 throw Error('B123_UNSUPPORTED_SHAPE');
}
function buildInterfaces(cross,apt){
 return cross.proposedOriginalStairs.map((s,i)=>{
  if(i!==s.stairIndex)throw Error('B123_STAIR_INDEX_DRIFT');
  const switched=cross.id==='APARTMENT_V1'&&apt.selectedCandidate?.targetFlight===i;
  return {stairIndex:i,fromLevel:s.fromLevel,toLevel:s.toLevel,
   lowerLanding:switched?apt.selectedCandidate.entryCells:s.lowerLanding,
   upperLanding:switched?apt.selectedCandidate.exitCells:s.upperLanding};
 });
}
const empty=n=>Array.from({length:n},()=>new Set());
function baseWalk(design,b113,gal){
 const sourceByLevel=design.plan.floors.map((f,l)=>
  new Set([...f.gallery,...b113.horizontalRoutes[l].repair.addedCells].map(K)));
 const stagedByLevel=design.plan.floors.map((f,l)=>
  new Set(gal.addedGalleryCells.filter(p=>p.level===l).map(K)));
 return {sourceByLevel,stagedByLevel};
}
function noOpAudit(base,interfaces){
 const n=base.sourceByLevel.length;
 const first=interfaces[0];
 return reconcileB123StairInterfaces({...base,removedByLevel:empty(n),newByLevel:empty(n),
  stairInterfaces:interfaces,replacedStairIndex:first.stairIndex,
  replacementLandings:{lowerLanding:first.lowerLanding,upperLanding:first.upperLanding}});
}
export async function assembleB123(dir='b114-review-output'){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gal=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apt=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 const b121=read('b121-review-output','B121_Joint_Stair_Gallery_Design_Review.json');
 const b122=read('b122-review-output','B122_Full_Length_Corridors_And_Staged_Network.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gal)||
 !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apt)||
 !validateB121(b121)||!validateB122(b122)||
 b122.sourceB121Integrity!==b121.integritySha256||
 gal.sourceB114Integrity!==b114.integritySha256||
 gal.sourceCrossFlightIntegrity!==cross.integritySha256||
 b121.sourceB114Integrity!==b114.integritySha256)
 throw Error('B123_PINNED_PARENT_DIGEST_MISMATCH');
 [b114,gal,cross,apt,b121,b122].forEach((x,i)=>guard(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==gal.sourceB113Integrity||
 parent.sourceDesigns?.length!==15)throw Error('B123_B113_SOURCE_CHANGED');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId;
  const c113=b113.cases.find(c=>c.id===id);
  const cGal=gal.cases.find(c=>c.id===id);
  const cCross=cross.cases.find(c=>c.id===id);
  const c121=b121.cases.find(c=>c.id===id);
  const c122=b122.cases.find(c=>c.id===id);
  if(!c113||!cGal||!cCross||!c121||!c122)
   throw Error('B123_BUILDING_REFERENCE_MISSING_'+id);
  const interfaces=buildInterfaces(cCross,apt);
  if(interfaces.length!==c122.sourceStairs||interfaces.length!==cGal.stairLinks)
   throw Error('B123_102_STAIR_INVENTORY_MISMATCH_'+id);
  const base=baseWalk(design,c113,cGal);
  const baseline=noOpAudit(base,interfaces);
  const proposed=[];
  for(const reviewed of c122.candidatesAudited){
   const entry=c121.heldExits.find(e=>e.stairIndex===reviewed.stairIndex&&
    e.jointDesign.shortlisted[reviewed.rank-1]?.shape===reviewed.shape&&
    e.jointDesign.shortlisted[reviewed.rank-1]?.origin.x===reviewed.origin.x&&
    e.jointDesign.shortlisted[reviewed.rank-1]?.origin.z===reviewed.origin.z);
   if(!entry)throw Error('B123_B121_CANDIDATE_NOT_PINNED_'+id);
   const idea=entry.jointDesign.shortlisted[reviewed.rank-1];
   const flight=cCross.proposedOriginalStairs[reviewed.stairIndex];
   const model=pose(flight,idea);
   const removedByLevel=empty(design.plan.floors.length);
   const newByLevel=empty(design.plan.floors.length);
   for(const p of idea.stagedGalleryCellsForRedesign){
    if(!removedByLevel[p.level])throw Error('B123_BAD_REMOVAL_LEVEL');
    removedByLevel[p.level].add(K(p));
   }
   for(const side of ['LOWER','UPPER']){
    const level=side==='LOWER'?flight.fromLevel:flight.toLevel;
    const route=idea.paths[side]?.candidate;
    if(!route||!Array.isArray(route.addedCells))throw Error('B123_MISSING_FULL_ROUTE');
    for(const p of route.addedCells)newByLevel[level].add(K(p));
    const actual=reviewed.routes.find(s=>s.side===side);
    if(!actual||actual.level!==undefined&&actual.level!==level||
     actual.newRouteCells!==route.addedCells.length)
     throw Error('B123_B122_ROUTE_EVIDENCE_DRIFT');
   }
   const result=reconcileB123StairInterfaces({...base,removedByLevel,newByLevel,
    stairInterfaces:interfaces,replacedStairIndex:reviewed.stairIndex,
    replacementLandings:{lowerLanding:model.lowerLanding,upperLanding:model.upperLanding}});
   if(result.conceptualCellsAdded!==reviewed.combinedNewRouteCells||
    result.stagedCellsRemoved!==reviewed.requiredB114ReservationsToReroute)
    throw Error('B123_B122_CHANGE_BUDGET_MISMATCH');
   proposed.push({stairIndex:reviewed.stairIndex,rank:reviewed.rank,
    inheritedB122ScopedRouteWithoutConflict:reviewed.routes.every(x=>
     x.status==='NO_DETECTED_CONFLICT_IN_SCOPED_PROXIES'),
    ...result,
    constructionAllowed:false});
  }
  cases.push({id,sourceStairs:interfaces.length,levels:design.plan.floors.length,
   baselineInterfaces:baseline.interfaceRecords.map(x=>({stairIndex:x.stairIndex,
    fromLevel:x.fromLevel,toLevel:x.toLevel,rooted:x.before})),
   baselineRootedAnchorCount:baseline.baselineRootedAnchorCount,
   conceptCandidates:proposed,sourceBuildingUnchanged:true});
 }
 const candidates=cases.flatMap(c=>c.conceptCandidates);
 const totals={buildings:cases.length,
  stairInterfacesAudited:cases.reduce((n,c)=>n+c.sourceStairs,0),
  conceptsReconciled:candidates.length,
  noNewProxyRegressionCandidates:candidates.filter(x=>x.status===
   'NO_NEW_TWO_WIDE_INTERFACE_REGRESSION_IN_SCOPED_PROXY'&&
   x.inheritedB122ScopedRouteWithoutConflict).length,
  candidatesHeldForNetworkReview:candidates.filter(x=>x.status!==
   'NO_NEW_TWO_WIDE_INTERFACE_REGRESSION_IN_SCOPED_PROXY').length,
  otherStairInterfacesNewlyDisconnected:candidates.reduce((n,c)=>n+c.otherStairRegressionCount,0),
  sourceCellsChanged:0,physicallyWalkableCertified:0,worldContacts:0};
 if(totals.buildings!==15||totals.stairInterfacesAudited!==102||
 totals.conceptsReconciled!==b122.totals.stairConfigurationsAudited)
 throw Error('B123_INCOMPLETE_15_BUILDING_INVENTORY');
 const payload={schema:'minecraftaibuilder-b123-all-stair-network-rooted-2wide-v1',
  sourceB122Integrity:b122.integritySha256,sourceB121Integrity:b121.integritySha256,
  sourceGalleryIntegrity:gal.integritySha256,
  cases,totals,limitations:[
   'TWO_WIDE_2D_ROOTED_ADJACENCY_IS_NOT_EDUCATION_PHYSICAL_WALKABILITY',
   'ALL_102_STAIR_INTERFACES_AUDITED_AS_GEOMETRY_PROXIES_ONLY',
   'CURRENT_PROPOSED_OTHER_FLIGHTS_ARE_NOT_REMODELED_AS_BUILT_GEOMETRY',
   'PROPOSED_STAIR_DOOR_BLOCKSTATE_APERTURE_SUPPORT_AND_BEARING_UNCERTIFIED',
   'RECONNECTION_REVIEW_DOES_NOT_RELEASE_ORIGINAL_NINE_HOLDS'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(x=>({...x})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...payload,integritySha256:H(payload)};
}
export function validateB123(r){
 try {
  const {integritySha256,...body}=r??{},t=r.totals;
  const concepts=r.cases.flatMap(c=>c.conceptCandidates);
  return H(body)===integritySha256&&
   r.schema==='minecraftaibuilder-b123-all-stair-network-rooted-2wide-v1'&&
   t.buildings===15&&t.stairInterfacesAudited===102&&
   t.conceptsReconciled===concepts.length&&
   t.sourceCellsChanged===0&&t.physicallyWalkableCertified===0&&
   r.cases.every(c=>c.sourceBuildingUnchanged&&
    c.baselineInterfaces.length===c.sourceStairs&&
    c.conceptCandidates.every(x=>x.constructionAllowed===false&&
     x.worldContacts===0&&x.allOtherStairPhysicalConnectionsCertified===false&&
     x.allStair3DCollisionsCertified===false&&x.originalSourceModified===false&&
     x.interfaceRecords.length===c.sourceStairs))&&
   r.readiness==='NOT_PREPARED'&&!r.constructionApproved&&!r.executionAllowed&&
   r.worldContacts===0&&r.worldCoordinates===null&&r.commandCount===0&&
   r.gates.length===9&&r.gates.every(x=>x.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB123(r,out){
 if(!validateB123(r))throw Error('B123_REFUSE_UNSAFE_REPORT');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B123_All_Stair_Interface_Network_Review.json');
 const csv=path.join(out,'B123_Stair_Interface_Before_After.csv');
 const md=path.join(out,'B123_All_Stair_Interface_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const lines=['building,conceptTarget,stairIndex,side,beforeRooted,afterRooted,nonTargetRegression'];
 for(const c of r.cases)for(const v of c.conceptCandidates)for(const x of v.interfaceRecords)
 for(const side of ['LOWER','UPPER'])lines.push([
  c.id,v.stairIndex,x.stairIndex,side,x.before[side],x.after[side],
  x.lostPreviouslyRootedOtherInterfaceSides.includes(side)].join(','));
 fs.writeFileSync(csv,lines.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B123 — 15棟102階段の幅2ネットワーク再接続検査（非施工）','',
  '|項目|結果|','|---|---:|',
  '|建物|'+t.buildings+'|','|検査した既存階段|'+t.stairInterfacesAudited+'|',
  '|B122から引き継いだ一体案|'+t.conceptsReconciled+'|',
  '|限定2D代理モデルで新規断線なしの案|'+t.noNewProxyRegressionCandidates+'|',
  '|ネットワーク検査でHOLDとなった案|'+t.candidatesHeldForNetworkReview+'|',
  '|既存階段の接続口の新規断線件数|'+t.otherStairInterfacesNewlyDisconnected+'|',
  '|実Minecraft通行認証|0|','',
  ...r.cases.flatMap(c=>c.conceptCandidates.map(x=>
   '- '+c.id+' #'+x.stairIndex+': '+x.status+
   '、他階段の断線'+x.otherStairRegressionCount+'件、対象上下幅2接続='+x.replacedTargetBothRooted)),
  '', '## 未解決・安全制限',...r.limitations.map(x=>'- '+x),'',
  '元の9出口はすべてHOLD / NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB123(path.resolve(process.argv[2]??'b114-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:writeB123(r,path.resolve(process.argv[3]??'b123-review-output'))},null,2));
}
