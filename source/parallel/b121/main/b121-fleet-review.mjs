/** B121 fleet — consider changing ONLY unbuilt B114 gallery additions with new U-turn stairs. */
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
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel,buildB119ProxyIndex} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {searchB121Joint} from './b121-joint-gallery-screener.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const verifyHold=(p,name)=>{
 if(p?.readiness!=='NOT_PREPARED'||p.constructionApproved!==false||
 p.executionAllowed!==false||p.worldContacts!==0||p.worldCoordinates!==null||
 p.commandCount!==0||p.gates?.length!==9||p.gates.some(g=>g.status!=='BLOCKED')||
 p.BuildPlan?.status!=='NOT_PREPARED'||p.BuildPlan?.operations?.length!==0)
 throw Error('B121_SOURCE_SAFETY_REJECTED_'+name);
};
function foreign(cx,apt,i){
 const s=cx.proposedOriginalStairs[i];
 const selected=cx.id==='APARTMENT_V1'&&apt.selectedCandidate?.targetFlight===i?
  apt.selectedCandidate:null;
 if(selected)return {id:i,footprint:selected.footprint,body:selected.sweptPlayerAABBs,
  treads:[...selected.stairTreadAABBs,...selected.platformAABBs],
  supports:selected.supportAABBs??[],fromLevel:s.fromLevel,toLevel:s.toLevel};
 const m=straightModel(s.proposedOrigin,s.proposedAscent,s.fromLevel);
 return {id:i,footprint:[...new Map([...s.cells,...m.footprint].map(p=>[K(p),p])).values()],
  body:m.body,treads:m.treads,supports:m.supports,fromLevel:s.fromLevel,toLevel:s.toLevel};
}
export async function buildB121(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apt=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 const b117=read('b117-review-output','B117_15_Building_Slab_And_Gallery_Holds.json');
 const b118=read('b118-review-output','B118_Nine_Exit_Alternatives.json');
 const b119=read('b119-review-output','B119_Nine_Whole_Stair_3D_Review.json');
 const b120=read('b120-review-output','B120_Eight_U_Turn_3D_Review.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
 !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apt)||
 !validateB117Review(b117)||!validateB118Review(b118)||!validateB119(b119)||
 !validateB120(b120)||b120.sources.b119!==b119.integritySha256||
 b120.sources.b118!==b118.integritySha256||
 b120.sources.b117!==b117.integritySha256||
 b120.sources.b114!==b114.integritySha256||
 b119.sourceB118Integrity!==b118.integritySha256||
 b119.sourceB117Integrity!==b117.integritySha256||
 b117.sourceGalleryIntegrity!==gallery.integritySha256||
 b117.sourceCrossFlightIntegrity!==cross.integritySha256||
 b117.sourceApartmentIntegrity!==apt.integritySha256)
 throw Error('B121_PARENT_PROVENANCE_INVALID');
 [b114,gallery,cross,apt,b117,b118,b119,b120].forEach((p,i)=>verifyHold(p,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==b117.sourceB113Integrity||
 parent.sourceDesigns?.length!==15)throw Error('B121_SOURCE_PARENT_INVALID');
 verifyHold(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,base=b120.cases.find(c=>c.id===id),
   c114=gallery.cases.find(c=>c.id===id),cx=cross.cases.find(c=>c.id===id),
   c113=b113.cases.find(c=>c.id===id),c117=b117.cases.find(c=>c.id===id),
   c119=b119.cases.find(c=>c.id===id);
  if(!base||!c114||!cx||!c113||!c117||!c119||
   base.heldExits.length!==c119.heldExits.filter(e=>e.search.conservativeModelClear===0).length||
   base.sourceStairs!==cx.proposedOriginalStairs.length)
   throw Error('B121_BUILDING_GRAPH_MISMATCH_'+id);
  const floors=design.plan.floors,results=[];
  if(base.heldExits.length){
   const vol=generateB105(design),qa=auditB105(vol,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B121_B105_SOURCE_UNSAFE_'+id);
   const solidMap=buildB119ProxyIndex(vol.voxels);
   const others=cx.proposedOriginalStairs.map((s,i)=>foreign(cx,apt,i));
   // Protected route baseline: original gallery and the independently verified B113 repair.
   // Only the later B114 integrated proposals are negotiable in this planning exercise.
   const protectedWalk=floors.map((f,L)=>new Set([
    ...f.gallery,...c113.horizontalRoutes[L].repair.addedCells
   ].map(K)));
   const stagedWalk=floors.map((f,L)=>new Set(
    c114.addedGalleryCells.filter(x=>x.level===L).map(K)));
   const byStair=new Map();
   for(const e of base.heldExits){
    if(e.search.conservativeCandidates!==0||!e.originalB119Held)
     throw Error('B121_EXPECTED_STILL_HELD_U_TURN_'+id);
    if(!byStair.has(e.stairIndex))byStair.set(e.stairIndex,[]);
    byStair.get(e.stairIndex).push(e);
   }
   const searches=new Map();
   for(const [index] of byStair){
    const stair=cx.proposedOriginalStairs[index];
    if(!stair||stair.stairIndex!==index)throw Error('B121_TARGET_STAIR_INVALID_'+id);
    const foreignStairs=others.filter(x=>x.id!==index);
    const occupied=floors.map(()=>new Set());
    for(const m of foreignStairs)for(const level of [m.fromLevel,m.toLevel])
     for(const p of m.footprint)occupied[level].add(K(p));
    const apertures=floors.map(()=>new Set());
    for(const slab of c117.slabs){
     if(slab.stairIndex===index)continue;
     for(const p of slab.conceptualOpeningCells)apertures[slab.toLevel].add(K(p));
    }
    searches.set(index,searchB121Joint({design,stair,otherModels:foreignStairs,solidMap,
     protectedWalkByLevel:protectedWalk,stagedGalleryByLevel:stagedWalk,
     occupiedByLevel:occupied,aperturesByLevel:apertures,maxShift:3}));
   }
   for(const e of base.heldExits){
    const source=c119.heldExits.find(x=>x.stairIndex===e.stairIndex&&
     x.side===e.side&&x.level===e.level);
    if(!source||source.search.conservativeModelClear!==0)
     throw Error('B121_STALE_EIGHT_HELD_SOURCE');
    const search=searches.get(e.stairIndex);
    results.push({stairIndex:e.stairIndex,level:e.level,side:e.side,
     originalHOLD:true,b120ConditionalUPlanCount:0,search,
     noSourceGalleryChanges:true,noActualStairRelocations:true,
     actualMinecraftWalkabilityCertified:false});
   }
  }
  cases.push({id,sourceStairs:base.sourceStairs,conceptFloors:base.conceptFloors,
   B120UnresolvedOriginalExits:results.length,exits:results,
   originalsUntouched:true});
 }
 const all=cases.flatMap(c=>c.exits);
 const distinct=cases.reduce((n,c)=>n+new Set(c.exits.map(x=>x.stairIndex)).size,0);
 const searches=cases.flatMap(c=>[...new Map(c.exits.map(x=>[x.stairIndex,x.search])).values()]);
 const reasons=new Map();
 for(const s of searches)for(const [name,count] of Object.entries(s.reasonCounts))
  reasons.set(name,(reasons.get(name)??0)+count);
 const newlyViable=all.filter(x=>x.search.totals.newlyViable>0).length;
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
  sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),b120UnresolvedExits:all.length,
  distinctStairs:distinct,posesReviewed:searches.reduce((n,s)=>n+s.totals.examined,0),
  interfacesWithCounterfactualReplanIdeas:newlyViable,
  interfacesStillWithoutJointPlan:all.length-newlyViable,
  totalIndividualNewPoseIdeas:searches.reduce((n,s)=>n+s.totals.newlyViable,0),
  sourceBuildingsModified:0,sourceGalleryCellsDeleted:0,
  originallyHeldNineReleased:0,physicallyCertifiedExits:0,worldContacts:0,
  leadingImmutableBlockers:[...reasons].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([code,count])=>({code,count}))};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.sourceStairs!==102||
 totals.b120UnresolvedExits!==8||totals.distinctStairs!==7||
 totals.posesReviewed!==1400||
 totals.interfacesWithCounterfactualReplanIdeas+totals.interfacesStillWithoutJointPlan!==8)
 throw Error('B121_INCOMPLETE_EIGHT_EXIT_COVERAGE');
 const body={schema:'minecraftaibuilder-b121-stair-plus-unbuilt-gallery-joint-whatif-v1',
  parentB120Digest:b120.integritySha256,parentB119Digest:b119.integritySha256,
  parentB117Digest:b117.integritySha256,cases,totals,
  limitations:[
   'B114_INTEGRATED_GALLERY_ADDITIONS_ARE_NOT_APPLIED_AND_MAY_ONLY_BE_REPLANNED',
   'ORIGINAL_GALLERY_AND_B113_REPAIR_BASELINE_ARE_IMMUTABLE',
   'A_SINGLE_STAIR_GALLERY_PAIR_PASS_DOES_NOT_REVALIDATE_OTHER_STAGED_GALLERY_BRANCHES',
   'U_TURN_SUPPORT_AND_BEDROCK_BLOCKSTATES_UNVERIFIED',
   'ALL_NINE_ORIGINAL_STAIR_EXITS_STILL_HOLD',
   'NO_MINECRAFT_WORLD_ACCESS_OR_CONSTRUCTION'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB121(r){
 try{const {integritySha256,...body}=r??{},t=r.totals;
 return H(body)===integritySha256&&
 r.schema==='minecraftaibuilder-b121-stair-plus-unbuilt-gallery-joint-whatif-v1'&&
 t.buildings===15&&t.conceptFloors===66&&t.sourceStairs===102&&
 t.b120UnresolvedExits===8&&t.distinctStairs===7&&t.posesReviewed===1400&&
 t.interfacesWithCounterfactualReplanIdeas+t.interfacesStillWithoutJointPlan===8&&
 t.originallyHeldNineReleased===0&&t.physicallyCertifiedExits===0&&
 t.sourceBuildingsModified===0&&t.sourceGalleryCellsDeleted===0&&t.worldContacts===0&&
 r.cases.length===15&&r.cases.every(c=>c.originalsUntouched&&c.exits.every(e=>
  e.originalHOLD&&e.noSourceGalleryChanges&&e.noActualStairRelocations&&
  e.actualMinecraftWalkabilityCertified===false&&
  e.search.allNineOriginalHoldsRemain&&e.search.constructionAuthorized===false&&
  e.search.BuildPlan.operations.length===0))&&
 r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
 r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
 r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
 r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeB121(r,out){
 if(!validateB121(r))throw Error('B121_RESULT_SAFETY_FAILED');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B121_Stair_Gallery_Joint_WhatIf_Review.json');
 const csv=path.join(out,'B121_Eight_Held_Exit_WhatIfs.csv');
 const md=path.join(out,'B121_Integrated_Corridor_Redesign_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=[['building','stair','side','level','poses','jointRerouteIdeas','held','topImmutableReasons'].join(',')];
 for(const c of r.cases)for(const e of c.exits){
  rows.push([c.id,e.stairIndex,e.side,e.level,e.search.totals.examined,
   e.search.totals.newlyViable,'YES',
   Object.entries(e.search.reasonCounts).sort((a,b)=>b[1]-a[1]).slice(0,4)
    .map(([k])=>k).join('+')].join(','));
 }
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B121 — 8出口の階段＋未施工廊下の共同再配置（非施工）','',
  '|項目|件数|','|---|---:|',
  '|建物|'+t.buildings+'|','|階段接続|'+t.sourceStairs+'|',
  '|保留出口|'+t.b120UnresolvedExits+'|',
  '|試行した3D仮設計配置|'+t.posesReviewed+'|',
  '|未施工のB114廊下案を再配置すれば成立し得る出口|'+t.interfacesWithCounterfactualReplanIdeas+'|',
  '|既存を保護したまま成立案がない出口|'+t.interfacesStillWithoutJointPlan+'|',
  '|Minecraftで施工・歩行が認証された出口|0|','',
  '## 出口別のレビュー',
  ...r.cases.flatMap(c=>c.exits.map(e=>'- '+c.id+' #'+e.stairIndex+' '+e.side+' L'+e.level+
   '：'+(e.search.totals.newlyViable?'未施工廊下の再計画案あり（HOLD継続）':'元の建物を保護したままでは未解決'))),
  '','## 施工・既存建物の保護',
  ...r.limitations.map(x=>'- '+x),
  '','NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await buildB121(path.resolve(process.argv[2]??'b114-review-output'));
 const files=writeB121(r,path.resolve(process.argv[3]??'b121-review-output'));
 console.log(JSON.stringify({totals:r.totals,files},null,2));
}
