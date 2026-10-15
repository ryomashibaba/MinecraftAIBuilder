/** B119 — source-locked 9-interface whole-stair redesign study, no Minecraft IO. */
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
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel,buildB119ProxyIndex,searchB119Stair} from './b119-full-stair-3d-search.mjs';

const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
const sourceGuard=(x,label)=>{
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
 x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
 x.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED')||
 x.BuildPlan?.status!=='NOT_PREPARED'||x.BuildPlan?.operations?.length!==0)
 throw Error('B119_UNSAFE_SOURCE_'+label);
};
function mapForeignModel(caseCross,apartment,index){
 const s=caseCross.proposedOriginalStairs[index];
 const selected=caseCross.id==='APARTMENT_V1'&&apartment.selectedCandidate?.targetFlight===index?
  apartment.selectedCandidate:null;
 if(selected)return {id:index,
  footprint:selected.footprint,body:selected.sweptPlayerAABBs,
  treads:[...selected.stairTreadAABBs,...selected.platformAABBs],
  supports:selected.supportAABBs,fromLevel:s.fromLevel,toLevel:s.toLevel};
 const m=straightModel(s.proposedOrigin,s.proposedAscent,s.fromLevel);
 // B114's conceptual footprint uses an older raw frame. Conservatively
 // reserve both its recorded cells and the correctly signed 3D voxel cells.
 const footprint=[...new Map([...s.cells,...m.footprint].map(p=>[K(p),p])).values()];
 return {id:index,footprint,body:m.body,treads:m.treads,supports:m.supports,
  fromLevel:s.fromLevel,toLevel:s.toLevel};
}
export async function buildB119(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json'),
 gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json'),
 cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json'),
 apartment=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json'),
 b117=read('b117-review-output','B117_15_Building_Slab_And_Gallery_Holds.json'),
 b118=read('b118-review-output','B118_Nine_Exit_Alternatives.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
 !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apartment)||
 !validateB117Review(b117)||!validateB118Review(b118)||
 b117.sourceB114Integrity!==b114.integritySha256||
 b117.sourceGalleryIntegrity!==gallery.integritySha256||
 b117.sourceCrossFlightIntegrity!==cross.integritySha256||
 b117.sourceApartmentIntegrity!==apartment.integritySha256||
 b118.sourceB117Integrity!==b117.integritySha256||
 b118.sourceB114GalleryIntegrity!==gallery.integritySha256)
 throw Error('B119_SOURCE_DIGEST_OR_SCHEMA_MISMATCH');
 [b114,gallery,cross,apartment,b117,b118].forEach((x,i)=>sourceGuard(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==b117.sourceB113Integrity||
 parent.sourceDesigns?.length!==15)throw Error('B119_REFERENCE_PARENT_MISMATCH');
 sourceGuard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,
   c113=b113.cases.find(x=>x.id===id),
   c114=gallery.cases.find(x=>x.id===id),
   cx=cross.cases.find(x=>x.id===id),
   c117=b117.cases.find(x=>x.id===id),
   c118=b118.cases.find(x=>x.id===id);
  if(!c113||!c114||!cx||!c117||!c118||
    c114.stairInterfaces.length!==cx.proposedOriginalStairs.length||
    c117.stairs!==c114.stairLinks||c118.sourceStairs!==c114.stairLinks||
    design.plan.floors.length!==c117.floors)throw Error('B119_BUILDING_REF_MISMATCH_'+id);
  const volume=generateB105(design),sourceAudit=auditB105(volume,design.plan);
  if(sourceAudit.issueCount||sourceAudit.envelopeConflicts)throw Error('B119_UNSAFE_B105_'+id);
  const solidMap=buildB119ProxyIndex(volume.voxels);
  const floors=design.plan.floors,models=cx.proposedOriginalStairs.map((_,i)=>mapForeignModel(cx,apartment,i));
  const galleryWalk=floors.map((floor,L)=>new Set([
   ...floor.gallery,...c113.horizontalRoutes[L].repair.addedCells,
   ...c114.addedGalleryCells.filter(p=>p.level===L)
  ].map(K)));
  const groups=new Map();
  for(const entry of c118.exits){
   const held=c117.galleryHolds.find(x=>x.stairIndex===entry.stairIndex&&
    x.side===entry.side&&x.level===entry.level);
   if(!held||held.reason!=='FIRST_TWO_ROWS_BLOCKED'||
    entry.inheritedB117Reason!==held.reason||
    entry.originalFixedLanding.length!==2||
    entry.originalSearchStatus!=='NO_FIXED_LANDING_TWO_WIDE_EXIT')
    throw Error('B119_UNTRUSTED_HELD_INTERFACE_'+id);
   let group=groups.get(entry.stairIndex);
   if(!group){group={index:entry.stairIndex,sides:new Set(),entries:[]};
    groups.set(entry.stairIndex,group);}
   group.sides.add(entry.side);group.entries.push(entry);
  }
  const resultByStair=new Map();
  for(const group of groups.values()){
   const stair=cx.proposedOriginalStairs[group.index];
   if(!stair||stair.stairIndex!==group.index)throw Error('B119_STAIR_INDEX_WRONG_'+id);
   const others=models.filter(x=>x.id!==group.index),occupied=floors.map(()=>new Set());
   for(const m of others)for(const level of [m.fromLevel,m.toLevel])
    for(const p of m.footprint)occupied[level].add(K(p));
   const aperture=floors.map(()=>new Set());
   // The old target flight is hypothetical and may be replaced by a design candidate.
   // Preserve all other B117 opening proposals as conservative collision constraints.
   for(const slab of c117.slabs){
    if(slab.stairIndex===group.index)continue;
    for(const p of slab.conceptualOpeningCells)aperture[slab.toLevel].add(K(p));
   }
   const search=searchB119Stair({design,stair,otherModels:others,solidMap,
    walkByLevel:galleryWalk,occupiedByLevel:occupied,aperturesByLevel:aperture,
    heldSides:group.sides,maxShift:3});
   resultByStair.set(group.index,search);
  }
  const exits=c118.exits.map(entry=>{
   const search=resultByStair.get(entry.stairIndex);
   if(!search)throw Error('B119_MISSING_EXPLORATION_'+id);
   return {stairIndex:entry.stairIndex,side:entry.side,level:entry.level,
    b118OriginalFixedLandingConcepts:entry.candidates.filter(x=>x.possibleInScoped2DModel).length,
    b118WholeStairRedesignHints:entry.conceptualShiftHints.length,
    b117Blockers:entry.firstRowBlockers,
    search,
    originalHeldUnchanged:true,physicallyCertified:false};
  });
  cases.push({id,conceptFloors:floors.length,sourceStairs:c114.stairLinks,
   distinctStairsRedesignedConceptually:groups.size,
   heldExits:exits,allProtectedRoomsAndFloorsUnchanged:true,worldContacts:0});
 }
 const all=cases.flatMap(c=>c.heldExits),unique=cases.reduce((n,c)=>n+c.distinctStairsRedesignedConceptually,0);
 const withCandidate=all.filter(e=>e.search.conservativeModelClear>0);
 const topCodes=new Map();
 for(const e of all)for(const [code,n] of Object.entries(e.search.rejectionCounts))
  topCodes.set(code,(topCodes.get(code)??0)+n);
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
  sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),
  originalHeldExits:all.length,distinctHeldStairs:unique,
  sourceLocked3DCandidateInterfaces:withCandidate.length,
  interfacesWithoutWholeStairProxySolution:all.length-withCandidate.length,
  exploratory3DPosesExamined:cases.reduce((n,c)=>n+
   [...new Map(c.heldExits.map(e=>[e.stairIndex,e.search])).values()].reduce((m,s)=>m+s.attempts,0),0),
  mostCommonRejections:[...topCodes].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([code,count])=>({code,count})),
  sourceBuildingsChanged:0,sourceStairsRelocated:0,physicallyCertifiedStairs:0,
  worldContacts:0,constructionCommands:0};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.sourceStairs!==102||
 totals.originalHeldExits!==9||
 totals.interfacesWithoutWholeStairProxySolution+totals.sourceLocked3DCandidateInterfaces!==9)
 throw Error('B119_COVERAGE_OR_UNSAFE_INFERENCE');
 const body={schema:'minecraftaibuilder-b119-nine-interfaces-whole-flight-local-3d-review-v1',
  sourceB117Integrity:b117.integritySha256,sourceB118Integrity:b118.integritySha256,
  sourceB114Integrity:b114.integritySha256,cases,totals,
  limitations:[
   'WHOLE_STAIR_CANDIDATES_ARE_UNBUILT_LOCAL_DESIGNS_NOT_EDUCATION_BLOCKS',
   'SHALLOW_STAIR_RAIL_SUPPORT_PROXIES_DO_NOT_PROVE_REAL_BEARING_OR_ROTATION',
   'B114_GALLERY_ADDITIONS_AND_B117_FLOOR_OPENINGS_NOT_EXECUTED',
   'ALL_NINE_ORIGINAL_GALLERY_HOLDS_REMAIN_UNRELEASED',
   'BLOCK_STATES_DOOR_HEADROOM_MINECRAFT_REAL_PHYSICS_NOT_CERTIFIED',
   'NO_WORLD_COORDINATES_OR_MINECRAFT_CONNECTION'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(x=>({...x})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB119(r){
 try{const {integritySha256,...payload}=r??{},t=r.totals;
 return H(payload)===integritySha256&&
 r.schema==='minecraftaibuilder-b119-nine-interfaces-whole-flight-local-3d-review-v1'&&
 t.buildings===15&&t.conceptFloors===66&&t.sourceStairs===102&&
 t.originalHeldExits===9&&t.physicallyCertifiedStairs===0&&
 t.sourceBuildingsChanged===0&&t.sourceStairsRelocated===0&&
 t.interfacesWithoutWholeStairProxySolution+t.sourceLocked3DCandidateInterfaces===9&&
 r.cases.length===15&&r.cases.every(c=>c.allProtectedRoomsAndFloorsUnchanged&&
 c.heldExits.every(e=>e.originalHeldUnchanged&&!e.physicallyCertified&&
 e.search.sourceStairsNotMoved&&!e.search.physicalMovementCertified&&
 e.search.constructionAllowed===false))&&
 r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&r.executionAllowed===false&&
 r.worldContacts===0&&r.worldCoordinates===null&&r.commandCount===0&&
 r.gates.length===9&&r.gates.every(x=>x.status==='BLOCKED')&&
 r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB119(r,out){
 if(!validateB119(r))throw Error('B119_INVALID_REPORT');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B119_Nine_Whole_Stair_3D_Review.json'),
  csv=path.join(out,'B119_Nine_Exit_3D_Holds.csv'),
  md=path.join(out,'B119_Whole_Stair_3D_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const lines=[['building','stairIndex','side','level','posesTried','unbuilt3DConcepts','stillHeld','commonRejects'].join(',')];
 for(const c of r.cases)for(const e of c.heldExits)
  lines.push([c.id,e.stairIndex,e.side,e.level,e.search.attempts,e.search.conservativeModelClear,
   'YES',Object.entries(e.search.rejectionCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join('+')].join(','));
 fs.writeFileSync(csv,lines.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B119 — 残る9件の階段を3D全体モデルで再設計・監査（非施工）','',
  '|検証範囲|結果|','|---|---:|',
  '|建物|'+t.buildings+'|','|階段接続|'+t.sourceStairs+'|',
  '|元から保留の出口|'+t.originalHeldExits+'|',
  '|階段一体型の仮設計候補が見つかった出口|'+t.sourceLocked3DCandidateInterfaces+'|',
  '|局所3Dで通路まで成立しない出口|'+t.interfacesWithoutWholeStairProxySolution+'|',
  '|探索した全体3D配置|'+t.exploratory3DPosesExamined+'|',
  '|Minecraftで歩行認証した階段|0|','',
  '## 保留9件の内訳',
  ...r.cases.flatMap(c=>c.heldExits.map(e=>'- '+c.id+' #'+e.stairIndex+' '+e.side+' L'+e.level+
   ': '+(e.search.conservativeModelClear?'局所的な仮候補あり':'3DでもHOLD')+
   '、位置探索 '+e.search.attempts+'、主要ブロッカー: '+
   Object.keys(e.search.rejectionCounts).slice(0,5).join(', '))),'',
  '## 重要：HOLDは一切解除していません',
  ...r.limitations.map(x=>'- '+x),
  '','NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await buildB119(path.resolve(process.argv[2]??'b114-review-output'));
 const files=writeB119(r,path.resolve(process.argv[3]??'b119-review-output'));
 console.log(JSON.stringify({totals:r.totals,files},null,2));
}
