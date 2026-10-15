/** B120 fleet: B119's eight unresolved interfaces only; no world connection. */
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
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel,buildB119ProxyIndex} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {searchB120UTurns} from './b120-u-return-screener.mjs';

const K=p=>p.x+','+p.z;
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const read=(d,n)=>JSON.parse(fs.readFileSync(path.join(d,n),'utf8'));
function guard(x,name){
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
 x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
 x.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED')||
 x.BuildPlan?.status!=='NOT_PREPARED'||x.BuildPlan?.operations?.length!==0)
 throw Error('B120_UNSAFE_PARENT_'+name);
}
function foreignModel(cx,apartment,i){
 const s=cx.proposedOriginalStairs[i],
  selected=cx.id==='APARTMENT_V1'&&apartment.selectedCandidate?.targetFlight===i?
   apartment.selectedCandidate:null;
 if(selected)return {id:i,footprint:selected.footprint,
  body:selected.sweptPlayerAABBs,
  treads:[...selected.stairTreadAABBs,...selected.platformAABBs],
  supports:selected.supportAABBs??[],fromLevel:s.fromLevel,toLevel:s.toLevel};
 const m=straightModel(s.proposedOrigin,s.proposedAscent,s.fromLevel);
 const cells=[...new Map([...s.cells,...m.footprint].map(p=>[K(p),p])).values()];
 return {id:i,footprint:cells,body:m.body,treads:m.treads,supports:m.supports,
  fromLevel:s.fromLevel,toLevel:s.toLevel};
}
export async function generateB120(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const apartment=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 const b117=read('b117-review-output','B117_15_Building_Slab_And_Gallery_Holds.json');
 const b118=read('b118-review-output','B118_Nine_Exit_Alternatives.json');
 const b119=read('b119-review-output','B119_Nine_Whole_Stair_3D_Review.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gallery)||
 !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apartment)||
 !validateB117Review(b117)||!validateB118Review(b118)||!validateB119(b119)||
 b119.sourceB117Integrity!==b117.integritySha256||
 b119.sourceB118Integrity!==b118.integritySha256||
 b119.sourceB114Integrity!==b114.integritySha256||
 b117.sourceGalleryIntegrity!==gallery.integritySha256||
 b117.sourceCrossFlightIntegrity!==cross.integritySha256||
 b117.sourceApartmentIntegrity!==apartment.integritySha256)
 throw Error('B120_SOURCE_INTEGRITY_FAILURE');
 [b114,gallery,cross,apartment,b117,b118,b119].forEach((r,i)=>guard(r,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==b119.sourceB113Integrity&&
 b113.integritySha256!==b117.sourceB113Integrity)
 throw Error('B120_B113_REFERENCE_FAILED');
 // b119 intentionally does not repeat B113 digest in the report schema;
 // the checked B117 digest is the unambiguous source reference.
 if(b113.integritySha256!==b117.sourceB113Integrity||parent.sourceDesigns?.length!==15)
 throw Error('B120_PARENT_UNTRUSTED');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,cx=cross.cases.find(c=>c.id===id),
   c119=b119.cases.find(c=>c.id===id),c117=b117.cases.find(c=>c.id===id),
   c114=gallery.cases.find(c=>c.id===id),c113=b113.cases.find(c=>c.id===id);
  if(!cx||!c119||!c117||!c114||!c113||cx.stairLinks!==c119.sourceStairs||
   c119.heldExits.length!==c117.galleryHolds.length)
   throw Error('B120_SOURCE_BUILDING_MISMATCH_'+id);
  const floors=design.plan.floors,held=c119.heldExits.filter(e=>e.search.conservativeModelClear===0);
  const exits=[];
  if(held.length){
   const vol=generateB105(design),qa=auditB105(vol,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B120_B105_UNSAFE_'+id);
   const solidMap=buildB119ProxyIndex(vol.voxels);
   const models=cx.proposedOriginalStairs.map((_,i)=>foreignModel(cx,apartment,i));
   const galleryWalk=floors.map((f,L)=>new Set([
    ...f.gallery,...c113.horizontalRoutes[L].repair.addedCells,
    ...c114.addedGalleryCells.filter(x=>x.level===L)
   ].map(K)));
   const grouped=new Map();
   for(const exit of held){
    const index=exit.stairIndex;
    if(!grouped.has(index))grouped.set(index,[]);
    grouped.get(index).push(exit);
   }
   const searches=new Map();
   for(const [index]of grouped){
    const s=cx.proposedOriginalStairs[index];if(!s||s.stairIndex!==index)
     throw Error('B120_MISSING_HELD_STAIR_'+id);
    const others=models.filter(x=>x.id!==index);
    const occupied=floors.map(()=>new Set());
    for(const m of others)for(const level of [m.fromLevel,m.toLevel])
     for(const p of m.footprint)occupied[level].add(K(p));
    const apertures=floors.map(()=>new Set());
    for(const slab of c117.slabs){
     if(slab.stairIndex===index)continue;
     for(const p of slab.conceptualOpeningCells)apertures[slab.toLevel].add(K(p));
    }
    searches.set(index,searchB120UTurns({design,stair:s,otherModels:others,
     solidMap,walkByLevel:galleryWalk,occupiedByLevel:occupied,
     aperturesByLevel:apertures,maxShift:3}));
   }
   for(const e of held){
    const source=b118.cases.find(c=>c.id===id)?.exits.find(x=>x.stairIndex===e.stairIndex&&
     x.side===e.side&&x.level===e.level);
    if(!source)throw Error('B120_MISSING_B118_SOURCE_HELD_EXIT');
    const search=searches.get(e.stairIndex);
    exits.push({stairIndex:e.stairIndex,side:e.side,level:e.level,
     inheritedB119ConservativeClear:e.search.conservativeModelClear,
     originalB119Held:true,sourceB118OriginalBlocked:source.originalSearchStatus==='NO_FIXED_LANDING_TWO_WIDE_EXIT',
     search,physicalConstructionCertified:false,originalStairUnchanged:true});
   }
  }
  cases.push({id,sourceStairs:c119.sourceStairs,conceptFloors:c119.conceptFloors,
   B119InterfacesAlreadyWithLimitedCandidates:c119.heldExits.length-held.length,
   heldExits:exits,originalRoomsAndStructuresUntouched:true});
 }
 const all=cases.flatMap(c=>c.heldExits),distinct=cases.reduce((n,c)=>n+
  new Set(c.heldExits.map(e=>e.stairIndex)).size,0);
 const rejections=new Map();
 for(const c of cases){
  const dedup=new Map(c.heldExits.map(e=>[e.stairIndex,e.search]));
  for(const s of dedup.values())for(const [key,v]of Object.entries(s.rejectionCounts))
   rejections.set(key,(rejections.get(key)??0)+v);
 }
 const attempts=cases.reduce((n,c)=>n+[...new Map(c.heldExits.map(e=>[e.stairIndex,e.search])).values()]
  .reduce((k,s)=>k+s.attempted,0),0);
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
  sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),
  b119OriginalHeldExits:9,b119PreviouslyClearInterfaces:9-all.length,
  b120TargetHeldInterfaces:all.length,distinctTargetStairs:distinct,
  examinedUShapePoses:attempts,
  nowWithConditionalUTurnConcept:all.filter(e=>e.search.conservativeCandidates>0).length,
  stillHeldWithoutConservativeUTurn:all.filter(e=>e.search.conservativeCandidates===0).length,
  topRejections:[...rejections].sort((a,b)=>b[1]-a[1]).slice(0,12)
   .map(([code,count])=>({code,count})),
  buildingsModified:0,approvedConstructionOperations:0,
  actualMinecraftTraversalCertified:0,worldContacts:0};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.sourceStairs!==102||
 all.length!==8||distinct<1||totals.b119PreviouslyClearInterfaces!==1||
 totals.nowWithConditionalUTurnConcept+totals.stillHeldWithoutConservativeUTurn!==8)
 throw Error('B120_EXPECTED_EIGHT_UNRESOLVED_GATE');
 const body={schema:'minecraftaibuilder-b120-u-turn-eight-held-exits-v1',
  sources:{b119:b119.integritySha256,b118:b118.integritySha256,
   b117:b117.integritySha256,b114:b114.integritySha256},
  totals,cases,
  limitations:['U_TURN_FOOTPRINT_5_BY_4_CONCEPT_NOT_ACTUAL_EDUCATION_STAIRS',
  'MID_LANDING_SUPPORT_AND_HALF_STEP_COLLISIONS_ARE_UNVERIFIED',
  'THE_NINE_B119_ORIGINAL_HOLDS_REMAIN_BLOCKED',
  'B114_STAGED_GALLERIES_AND_B117_SLAB_OPENINGS_NOT_EXECUTED',
  'REAL_STRUCTURE_AND_STAIRS_BLOCKSTATES_NOT_CERTIFIED',
  'NO_MINECRAFT_WORLD_ACCESS_OR_OPERATIONS'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(x=>({...x})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB120(r){
 try{
  const {integritySha256,...body}=r??{},t=r.totals;
  return H(body)===integritySha256&&r.schema==='minecraftaibuilder-b120-u-turn-eight-held-exits-v1'&&
   t.buildings===15&&t.conceptFloors===66&&t.sourceStairs===102&&
   t.b119OriginalHeldExits===9&&t.b119PreviouslyClearInterfaces===1&&t.b120TargetHeldInterfaces===8&&
   t.nowWithConditionalUTurnConcept+t.stillHeldWithoutConservativeUTurn===8&&
   t.actualMinecraftTraversalCertified===0&&t.worldContacts===0&&
   r.cases.every(c=>c.originalRoomsAndStructuresUntouched&&c.heldExits.every(e=>
    e.originalB119Held&&e.physicalConstructionCertified===false&&e.originalStairUnchanged&&
    e.search.constructionAuthorized===false&&e.search.worldContacts===0))&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeB120(r,out){
 if(!validateB120(r))throw Error('B120_UNSAFE_REPORT');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B120_Eight_U_Turn_3D_Review.json'),
  csv=path.join(out,'B120_Eight_Held_Exit_Alternatives.csv'),
  md=path.join(out,'B120_U_Turn_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=[['building','stair','side','level','examined','proxyConcepts','originalHOLD','topRejections'].join(',')];
 for(const c of r.cases)for(const e of c.heldExits)
  rows.push([c.id,e.stairIndex,e.side,e.level,e.search.attempted,
   e.search.conservativeCandidates,'YES',
   Object.entries(e.search.rejectionCounts).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([x])=>x).join('+')].join(','));
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B120 — 残り8出口・折返し階段一体型3Dオフライン設計監査','',
  '|項目|件数|','|---|---:|',
  '|建物|'+t.buildings+'|','|階段接続|'+t.sourceStairs+'|',
  '|今回の保留対象出口|'+t.b120TargetHeldInterfaces+'|',
  '|折返し階段の候補が見つかった出口|'+t.nowWithConditionalUTurnConcept+'|',
  '|まだ保守的な設計候補がない出口|'+t.stillHeldWithoutConservativeUTurn+'|',
  '|試行した折返し配置|'+t.examinedUShapePoses+'|',
  '|実Minecraftで歩行・施工認証した出口|0|','',
  '## 8件の探索',
  ...r.cases.flatMap(c=>c.heldExits.map(e=>'- '+c.id+' #'+e.stairIndex+' '+e.side+
   ' L'+e.level+': '+(e.search.conservativeCandidates?
    '局所3D仮設計案あり・実機未認証':'局所3Dでも未解決')+
   ' / 上位の原因: '+Object.entries(e.search.rejectionCounts).sort((a,b)=>b[1]-a[1])
    .slice(0,3).map(([k])=>k).join(', '))),'',
  '## 元の9件は引き続きHOLD、施工は禁止',
  ...r.limitations.map(x=>'- '+x),'',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await generateB120(path.resolve(process.argv[2]??'b114-review-output'));
 const output=writeB120(r,path.resolve(process.argv[3]??'b120-review-output'));
 console.log(JSON.stringify({totals:r.totals,output},null,2));
}
