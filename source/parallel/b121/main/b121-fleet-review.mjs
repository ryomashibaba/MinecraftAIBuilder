/** B121: read-only source-pinned 15-building counterfactual gallery review. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {validateB114} from '../../b114/main/compile-b114.mjs';
import {validateStairGalleryIntegration} from '../../b114/main/b114-stair-gallery-integration.mjs';
import {validateCrossFlightSearch} from '../../b114/main/b114-cross-flight-position-search.mjs';
import {validateApartmentSwitchback} from '../../b114/main/b114-apartment-switchback-3d.mjs';
import {validateB117Review} from '../../b117/main/b117-fleet-review.mjs';
import {validateB118Review} from '../../b118/main/b118-fleet-review.mjs';
import {validateB119} from '../../b119/main/b119-fleet-whole-stair-review.mjs';
import {validateB120} from '../../b120/main/b120-fleet-review.mjs';
import {straightModel,buildB119ProxyIndex} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {searchB121JointGallery} from './b121-joint-gallery-counterfactual.mjs';

const K=p=>p.x+','+p.z;
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(d,n),'utf8'));
const guard=(x,name)=>{
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
  x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
  x.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED')||
  x.BuildPlan?.operations?.length!==0)throw Error('B121_UNSAFE_PARENT_'+name);
};
function modelForeign(cx,apartment,i){
 const s=cx.proposedOriginalStairs[i];
 const sel=cx.id==='APARTMENT_V1'&&apartment.selectedCandidate?.targetFlight===i?
  apartment.selectedCandidate:null;
 if(sel)return {id:i,footprint:sel.footprint,body:sel.sweptPlayerAABBs,
  treads:[...sel.stairTreadAABBs,...sel.platformAABBs],
  supports:sel.supportAABBs??[],fromLevel:s.fromLevel,toLevel:s.toLevel};
 const m=straightModel(s.proposedOrigin,s.proposedAscent,s.fromLevel);
 const f=[...new Map([...s.cells,...m.footprint].map(p=>[K(p),p])).values()];
 return {id:i,footprint:f,body:m.body,treads:m.treads,supports:m.supports,
  fromLevel:s.fromLevel,toLevel:s.toLevel};
}
export async function buildB121(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apartment=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 const b117=read('b117-review-output','B117_15_Building_Slab_And_Gallery_Holds.json');
 const b118=read('b118-review-output','B118_Nine_Exit_Alternatives.json');
 const b119=read('b119-review-output','B119_Nine_Whole_Stair_3D_Review.json');
 const b120=read('b120-review-output','B120_Eight_U_Turn_3D_Review.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
  !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apartment)||
  !validateB117Review(b117)||!validateB118Review(b118)||
  !validateB119(b119)||!validateB120(b120)||
  b120.sources.b119!==b119.integritySha256||
  b120.sources.b118!==b118.integritySha256||
  b120.sources.b117!==b117.integritySha256||
  b120.sources.b114!==b114.integritySha256||
  b119.sourceB114Integrity!==b114.integritySha256||
  b117.sourceGalleryIntegrity!==gallery.integritySha256||
  b117.sourceCrossFlightIntegrity!==cross.integritySha256||
  b117.sourceApartmentIntegrity!==apartment.integritySha256)
  throw Error('B121_UPSTREAM_DIGEST_OR_SCHEMA_CHANGED');
 [b114,gallery,cross,apartment,b117,b118,b119,b120].forEach((x,i)=>guard(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==b117.sourceB113Integrity||
  parent.sourceDesigns?.length!==15)throw Error('B121_B113_REFERENCE_INVALID');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,
   c120=b120.cases.find(x=>x.id===id),
   c119=b119.cases.find(x=>x.id===id),
   c117=b117.cases.find(x=>x.id===id),
   c114=gallery.cases.find(x=>x.id===id),
   c113=b113.cases.find(x=>x.id===id),
   cx=cross.cases.find(x=>x.id===id);
  if(!c120||!c119||!c117||!c114||!c113||!cx||
   c120.sourceStairs!==c119.sourceStairs||
   c114.stairLinks!==cx.proposedOriginalStairs.length||
   c120.heldExits.length!==c119.heldExits.filter(e=>e.search.conservativeModelClear===0).length)
   throw Error('B121_CASE_PROVENANCE_INVALID_'+id);
  const stairs=new Map();
  if(c120.heldExits.length){
   const vol=generateB105(design),qa=auditB105(vol,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B121_UNSAFE_B105_'+id);
   const sourceVoxels=buildB119ProxyIndex(vol.voxels);
   const models=cx.proposedOriginalStairs.map((_,i)=>modelForeign(cx,apartment,i));
   const floors=design.plan.floors;
   const sourceWalkByLevel=floors.map((f,L)=>new Set([
    ...f.gallery,...c113.horizontalRoutes[L].repair.addedCells].map(K)));
   // Crucial: B114 extra gallery cells are *unbuilt* and are NOT source gallery.
   const unbuiltB114GalleryByLevel=floors.map((f,L)=>{
    const source=sourceWalkByLevel[L];
    return new Set(c114.addedGalleryCells.filter(p=>p.level===L)
     .map(K).filter(key=>!source.has(key)));
   });
   for(const index of new Set(c120.heldExits.map(e=>e.stairIndex))){
    const stair=cx.proposedOriginalStairs[index],others=models.filter(m=>m.id!==index);
    if(!stair||stair.stairIndex!==index)throw Error('B121_BAD_STAIR_INDEX');
    const occupied=floors.map(()=>new Set());
    for(const m of others)for(const level of [m.fromLevel,m.toLevel])
     for(const p of m.footprint)occupied[level].add(K(p));
    const apertures=floors.map(()=>new Set());
    for(const slab of c117.slabs){
     if(slab.stairIndex===index)continue;
     for(const p of slab.conceptualOpeningCells)apertures[slab.toLevel].add(K(p));
    }
    const result=searchB121JointGallery({design,stair,otherModels:others,
     solidMap:sourceVoxels,sourceWalkByLevel,unbuiltB114GalleryByLevel,
     occupiedByLevel:occupied,aperturesByLevel:apertures,
     maxShift:3,constructModel:buildB120UTurn});
    // B120 had zero geometrically valid U-turns. An acceptance without changing
    // at least one B114 draft reservation is a provenance error, not a new fix.
    if(result.shortlist.some(x=>x.b114UnbuiltGalleryCellsToRetire.length===0))
     throw Error('B121_NO_IDENTIFIABLE_DRAFT_GALLERY_REDIRECT');
    stairs.set(index,result);
   }
  }
  const exits=c120.heldExits.map(e=>{
   if(!c119.heldExits.some(x=>x.stairIndex===e.stairIndex&&x.side===e.side&&
    x.level===e.level&&x.search.conservativeModelClear===0))
    throw Error('B121_HELD_EXIT_SOURCE_DISAGREES');
   const r=stairs.get(e.stairIndex);
   if(!r)throw Error('B121_HELD_STAIR_NOT_SCANNED');
   return {stairIndex:e.stairIndex,side:e.side,level:e.level,
    inheritedB120ConditionalUTurns:e.search.conservativeCandidates,
    jointGallerySearch:r,
    originalB119NineHoldsRemain:true,physicalReconstructionCertified:false};
  });
  cases.push({id,sourceStairs:c120.sourceStairs,conceptFloors:c120.conceptFloors,
   targetedStairs:stairs.size,heldExits:exits,
   sourceGalleryAndRoomsUnchanged:true,worldContacts:0});
 }
 const exits=cases.flatMap(c=>c.heldExits);
 const unique=cases.flatMap(c=>[...new Map(c.heldExits.map(x=>[x.stairIndex,x.jointGallerySearch])).values()]);
 const common=new Map();
 for(const s of unique)for(const [code,n]of Object.entries(s.rejectCounts))
  common.set(code,(common.get(code)??0)+n);
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
  sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),
  originalNineHolds:9,targetedHeldExits:exits.length,uniqueStairs:unique.length,
  exploredJointConfigurations:unique.reduce((n,r)=>n+r.tested,0),
  interfacesWithReviewOnlyJointOptions:exits.filter(e=>e.jointGallerySearch.passingProxyDesigns>0).length,
  interfacesWithoutJointOption:exits.filter(e=>e.jointGallerySearch.passingProxyDesigns===0).length,
  topRejects:[...common].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([code,count])=>({code,count})),
  sourceGalleryCellsRemoved:0,sourceBuildingsChanged:0,actualWorldCertifications:0,
  worldContacts:0,constructionCommands:0};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.sourceStairs!==102||
  totals.targetedHeldExits!==8||totals.uniqueStairs!==7||
  totals.exploredJointConfigurations!==1400||
  totals.interfacesWithReviewOnlyJointOptions+totals.interfacesWithoutJointOption!==8)
  throw Error('B121_FLEET_15_66_102_8_7_1400_COVERAGE_FAILED');
 const body={schema:'minecraftaibuilder-b121-source-locked-joint-gallery-review-v1',
  sourceB120Integrity:b120.integritySha256,sourceB119Integrity:b119.integritySha256,
  sourceB114GalleryIntegrity:gallery.integritySha256,sourceB113Integrity:b113.integritySha256,
  cases,totals,
  warnings:['B114_ONLY_UNBUILT_GALLERY_RESERVATIONS_CAN_BE_COUNTERFACTUALLY_REDIRECTED',
   'ORIGINAL_FLOORS_ROOMS_CORES_GALLERIES_AND_B113_REPAIRS_ARE_IMMUTABLE',
   'B105_AND_OTHER_STAIR_PROXIES_CHECKED_NOT_REAL_BEDROCK_PHYSICS',
   'ALL_NINE_ORIGINAL_HOLDS_MAINTAINED',
   'WORLD_AND_CONSTRUCTION_INTERFACE_NOT_PRESENT'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB121(r){
 try{
  const {integritySha256,...body}=r??{},t=r.totals;
  return H(body)===integritySha256&&r.schema==='minecraftaibuilder-b121-source-locked-joint-gallery-review-v1'&&
   t.buildings===15&&t.conceptFloors===66&&t.sourceStairs===102&&
   t.originalNineHolds===9&&t.targetedHeldExits===8&&t.uniqueStairs===7&&
   t.exploredJointConfigurations===1400&&
   t.interfacesWithReviewOnlyJointOptions+t.interfacesWithoutJointOption===8&&
   t.sourceGalleryCellsRemoved===0&&t.sourceBuildingsChanged===0&&
   t.actualWorldCertifications===0&&t.worldContacts===0&&
   r.cases.every(c=>c.sourceGalleryAndRoomsUnchanged&&c.heldExits.every(e=>
    e.originalB119NineHoldsRemain&&!e.physicalReconstructionCertified&&
    e.jointGallerySearch.allProtectedSourceGalleryRetained&&
    e.jointGallerySearch.allOriginalNineHoldsRemain&&
    e.jointGallerySearch.constructionApproved===false))&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(x=>x.status==='BLOCKED')&&
   r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeB121(r,dir){
 if(!validateB121(r))throw Error('B121_REPORT_SAFETY_FAILED');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B121_Eight_Joint_Gallery_Review.json');
 const csv=path.join(dir,'B121_Eight_Exit_Shortlist.csv');
 const md=path.join(dir,'B121_Joint_Stair_Gallery_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=[['building','stairIndex','side','level','searchedPoses','localCounterfactualDesigns','originalHOLD'].join(',')];
 for(const c of r.cases)for(const e of c.heldExits)
  rows.push([c.id,e.stairIndex,e.side,e.level,e.jointGallerySearch.tested,
   e.jointGallerySearch.passingProxyDesigns,'YES'].join(','));
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B121 — 階段とB114未施工廊下の一体再設計（オフライン）','',
  '|検証対象|件数|','|---|---:|',
  '|建物|'+t.buildings+'|','|階段接続|'+t.sourceStairs+'|',
  '|元のHOLD出口|'+t.originalNineHolds+'|','|今回の8出口|'+t.targetedHeldExits+'|',
  '|検証した配置|'+t.exploredJointConfigurations+'|',
  '|限定的な一体型3D設計候補が見つかった出口|'+t.interfacesWithReviewOnlyJointOptions+'|',
  '|候補なしの出口|'+t.interfacesWithoutJointOption+'|',
  '|実Minecraftで認証された出口|0|','',
  '## 対象8出口（すべて元のHOLD維持）',
  ...r.cases.flatMap(c=>c.heldExits.map(e=>'- '+c.id+' #'+e.stairIndex+
   ' '+e.side+' L'+e.level+': '+(e.jointGallerySearch.passingProxyDesigns?
   'B114未施工廊下の変更を要する局所仮案あり':'元設計保護下の一体仮案なし'))),
  '','## 未認証・変更禁止',
  ...r.warnings.map(x=>'- '+x),
  '','NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=await buildB121(path.resolve(process.argv[2]??'b114-review-output'));
 const files=writeB121(report,path.resolve(process.argv[3]??'b121-review-output'));
 console.log(JSON.stringify({totals:report.totals,files},null,2));
}
