/** B121 15-building joint stair + conditional-gallery redesign review, read-only. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {validateB114} from '../../b114/main/compile-b114.mjs';
import {validateStairGalleryIntegration} from '../../b114/main/b114-stair-gallery-integration.mjs';
import {validateCrossFlightSearch} from '../../b114/main/b114-cross-flight-position-search.mjs';
import {validateB117Review} from '../../b117/main/b117-fleet-review.mjs';
import {validateB118Review} from '../../b118/main/b118-fleet-review.mjs';
import {validateB119} from '../../b119/main/b119-fleet-whole-stair-review.mjs';
import {validateB120} from '../../b120/main/b120-fleet-review.mjs';
import {validateApartmentSwitchback} from '../../b114/main/b114-apartment-switchback-3d.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel,buildB119ProxyIndex} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {exploreB121JointDesigns} from './b121-joint-corridor-planner.mjs';
const K=p=>p.x+','+p.z,H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const read=(d,f)=>JSON.parse(fs.readFileSync(path.join(d,f),'utf8'));
function guard(r,label){
 if(r?.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
 r.executionAllowed!==false||r.worldContacts!==0||r.worldCoordinates!==null||
 r.commandCount!==0||r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.BuildPlan?.operations?.length!==0)throw Error('B121_UNSAFE_PARENT_'+label);
}
function originalStairProxy(cx,apt,i){
 const s=cx.proposedOriginalStairs[i],sel=cx.id==='APARTMENT_V1'&&
  apt.selectedCandidate?.targetFlight===i?apt.selectedCandidate:null;
 if(sel)return {id:i,fromLevel:s.fromLevel,toLevel:s.toLevel,
  footprint:sel.footprint,body:sel.sweptPlayerAABBs,
  treads:[...sel.stairTreadAABBs,...sel.platformAABBs],
  supports:sel.supportAABBs??[]};
 const m=straightModel(s.proposedOrigin,s.proposedAscent,s.fromLevel);
 return {id:i,fromLevel:s.fromLevel,toLevel:s.toLevel,
  footprint:[...new Map([...s.cells,...m.footprint].map(p=>[K(p),p])).values()],
  body:m.body,treads:m.treads,supports:m.supports};
}
export async function assembleB121(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json'),
  gal=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json'),
  cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json'),
  apt=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json'),
  b117=read('b117-review-output','B117_15_Building_Slab_And_Gallery_Holds.json'),
  b118=read('b118-review-output','B118_Nine_Exit_Alternatives.json'),
  b119=read('b119-review-output','B119_Nine_Whole_Stair_3D_Review.json'),
  b120=read('b120-review-output','B120_Eight_U_Turn_3D_Review.json');
 if(!validateB114(b114)||!validateStairGalleryIntegration(gal)||
 !validateCrossFlightSearch(cross)||!validateApartmentSwitchback(apt)||
 !validateB117Review(b117)||!validateB118Review(b118)||!validateB119(b119)||
 !validateB120(b120)||b120.sources.b119!==b119.integritySha256||
 b120.sources.b118!==b118.integritySha256||
 b120.sources.b117!==b117.integritySha256||
 b120.sources.b114!==b114.integritySha256||
 b117.sourceGalleryIntegrity!==gal.integritySha256||
 b117.sourceCrossFlightIntegrity!==cross.integritySha256||
 b117.sourceApartmentIntegrity!==apt.integritySha256)
 throw Error('B121_SOURCE_CHAIN_DIGEST_MISMATCH');
 [b114,gal,cross,apt,b117,b118,b119,b120].forEach((x,i)=>guard(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||b113.integritySha256!==b117.sourceB113Integrity||
  parent.sourceDesigns?.length!==15)throw Error('B121_B113_SOURCE_MISMATCH');
 guard(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,cx=cross.cases.find(c=>c.id===id),
   c113=b113.cases.find(c=>c.id===id),c114=gal.cases.find(c=>c.id===id),
   c117=b117.cases.find(c=>c.id===id),c119=b119.cases.find(c=>c.id===id),
   c120=b120.cases.find(c=>c.id===id);
  if(!cx||!c113||!c114||!c117||!c119||!c120||
   c119.sourceStairs!==cx.proposedOriginalStairs.length||
   c120.sourceStairs!==c119.sourceStairs||
   design.plan.floors.length!==c120.conceptFloors||
   c120.heldExits.length!==c119.heldExits.filter(e=>e.search.conservativeModelClear===0).length)
   throw Error('B121_BUILDING_COVERAGE_MISMATCH_'+id);
  const held=c120.heldExits,entries=[];
  if(held.length){
   const generated=generateB105(design),qa=auditB105(generated,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B121_B105_SOURCE_UNSAFE_'+id);
   const sourceSolidMap=buildB119ProxyIndex(generated.voxels);
   const models=cx.proposedOriginalStairs.map((_,i)=>originalStairProxy(cx,apt,i));
   // B113 repaired corridors form the protected baseline once validated.
   // ONLY B114 additions are unbuilt, retractable concept reservations.
   const sourceWalk=design.plan.floors.map((f,level)=>new Set([
    ...f.gallery,...c113.horizontalRoutes[level].repair.addedCells
   ].map(K)));
   const stagedWalk=design.plan.floors.map((f,level)=>new Set(
    c114.addedGalleryCells.filter(p=>p.level===level).map(K)));
   const groups=new Map();
   for(const e of held){
    const parentEntry=c119.heldExits.find(x=>x.stairIndex===e.stairIndex&&
     x.side===e.side&&x.level===e.level);
    if(!parentEntry||parentEntry.search.conservativeModelClear!==0)
     throw Error('B121_HELD_REFERENCE_MISMATCH_'+id);
    if(!groups.has(e.stairIndex))groups.set(e.stairIndex,[]);
    groups.get(e.stairIndex).push(e);
   }
   const results=new Map();
   for(const [idx]of groups){
    const stair=cx.proposedOriginalStairs[idx];
    if(!stair||stair.stairIndex!==idx)throw Error('B121_MISSING_STAIR_'+id);
    const otherStairs=models.filter(m=>m.id!==idx),
     otherStairCells=design.plan.floors.map(()=>new Set()),
     otherOpenings=design.plan.floors.map(()=>new Set());
    for(const m of otherStairs)for(const level of [m.fromLevel,m.toLevel])
     for(const p of m.footprint)otherStairCells[level].add(K(p));
    for(const slab of c117.slabs){
     if(slab.stairIndex===idx)continue;
     for(const p of slab.conceptualOpeningCells)otherOpenings[slab.toLevel].add(K(p));
    }
    results.set(idx,exploreB121JointDesigns({design,stair,sourceWalk,stagedWalk,
     otherStairs,otherStairCells,otherOpenings,sourceSolidMap,maxShift:3}));
   }
   for(const e of held)entries.push({stairIndex:e.stairIndex,side:e.side,level:e.level,
    originalB119B120Hold:true,jointDesign:results.get(e.stairIndex),
    originalSourceCellsAndStairUnchanged:true,constructionApproved:false});
  }
  cases.push({id,sourceStairs:c120.sourceStairs,conceptFloors:c120.conceptFloors,
   heldExits:entries,distinctHeldStairs:new Set(entries.map(x=>x.stairIndex)).size,
   originalFloorRoomsAndCoreUnaffected:true});
 }
 const all=cases.flatMap(c=>c.heldExits),countDistinct=cases.reduce((n,c)=>n+c.distinctHeldStairs,0);
 const unique=cases.flatMap(c=>[...new Map(c.heldExits.map(e=>[e.stairIndex,e.jointDesign])).values()]);
 const reasons=new Map();
 for(const x of unique)for(const [code,v]of Object.entries(x.rejectedByReason))
  reasons.set(code,(reasons.get(code)??0)+v);
 const totals={buildings:cases.length,conceptFloors:cases.reduce((n,c)=>n+c.conceptFloors,0),
  sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),originalHeldExits:9,
  inheritedB119OneConcept:1,b121TargetExits:all.length,distinctTargetStairs:countDistinct,
  attemptedJointPoses:unique.reduce((n,x)=>n+x.attempted,0),
  interfacesWithRootedConcept:all.filter(x=>x.jointDesign.conditionalTotal>0).length,
  interfacesStillWithoutRootedConcept:all.filter(x=>x.jointDesign.conditionalTotal===0).length,
  interfacesWithStagedGalleryReroute:all.filter(x=>x.jointDesign.requiresStagedReroute>0).length,
  affectedSourceCellsApplied:0,physicallyCertifiedExits:0,worldContacts:0,constructionCommands:0,
  mainRejections:[...reasons].sort((a,b)=>b[1]-a[1]).slice(0,14)
   .map(([code,count])=>({code,count}))};
 if(totals.buildings!==15||totals.conceptFloors!==66||totals.sourceStairs!==102||
  totals.b121TargetExits!==8||totals.distinctTargetStairs!==7||
  totals.interfacesWithRootedConcept+totals.interfacesStillWithoutRootedConcept!==8||
  unique.some(x=>x.attempted!==300))
  throw Error('B121_INCOMPLETE_15_66_102_8_FLEET_GATE');
 const body={schema:'minecraftaibuilder-b121-joint-stair-gallery-source-rooted-screen-v1',
  sourceB120Integrity:b120.integritySha256,
  sourceB119Integrity:b119.integritySha256,
  sourceB117Integrity:b117.integritySha256,
  sourceB114Integrity:b114.integritySha256,
  cases,totals,
  limitations:['SOURCE_GALLERY_IMMUTABLE_AND_PENDING_GALLERY_ONLY_HYPOTHETICALLY_REROUTABLE',
   'ORIGINAL_SOURCE_GALLERY_TWO_WIDE_ROOT_MUST_BE_REACHABLE_ON_BOTH_FLOORS',
   'STAGED_GALLERY_OTHER_STAIR_NETWORK_RECONNECTION_NOT_CERTIFIED',
   'CONCEPT_STAIR_STRENGTH_SUPPORTS_AND_BEDROCK_BLOCKSTATES_UNVERIFIED',
   'ALL_NINE_ORIGINAL_HOLDS_REMAIN_UNRELEASED',
   'MINECRAFT_WORLD_NOT_CONTACTED_AND_NO_EDITS_MADE'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,gates:b114.gates.map(x=>({...x})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB121(r){
 try{
  const {integritySha256,...body}=r??{},t=r.totals;
  return H(body)===integritySha256&&
   r.schema==='minecraftaibuilder-b121-joint-stair-gallery-source-rooted-screen-v1'&&
   t.buildings===15&&t.conceptFloors===66&&t.sourceStairs===102&&
   t.originalHeldExits===9&&t.inheritedB119OneConcept===1&&t.b121TargetExits===8&&
   t.distinctTargetStairs===7&&
   t.interfacesWithRootedConcept+t.interfacesStillWithoutRootedConcept===8&&
   t.affectedSourceCellsApplied===0&&t.physicallyCertifiedExits===0&&
   r.cases.every(c=>c.originalFloorRoomsAndCoreUnaffected&&c.heldExits.every(e=>
    e.originalB119B120Hold&&e.originalSourceCellsAndStairUnchanged&&
    e.constructionApproved===false&&e.jointDesign.constructionAllowed===false&&
    e.jointDesign.allOriginalHeldExitsRemainHeld))&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations.length===0;
 }catch{return false;}
}
export function writeB121(r,dir){
 if(!validateB121(r))throw Error('B121_REFUSE_UNSAFE_OUTPUT');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B121_Joint_Stair_Gallery_Design_Review.json'),
  csv=path.join(dir,'B121_Eight_Exit_Change_Budget.csv'),
  md=path.join(dir,'B121_Joint_Stair_Gallery_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const rows=[['building','stairIndex','side','level','poses','rootedIdeas','stagedGalleryReroutes','HOLD'].join(',')];
 for(const c of r.cases)for(const e of c.heldExits)
  rows.push([c.id,e.stairIndex,e.side,e.level,e.jointDesign.attempted,
   e.jointDesign.conditionalTotal,e.jointDesign.requiresStagedReroute,'YES'].join(','));
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B121 — 階段＋周辺廊下の一体設計、原典廊下は完全保護（非施工）','',
  '|監査内容|値|','|---|---:|','|元の建物|'+t.buildings+'|',
  '|全階段|'+t.sourceStairs+'|','|B121対象の保留出口|'+t.b121TargetExits+'|',
  '|試行した階段＋廊下の一体配置|'+t.attemptedJointPoses+'|',
  '|上下階の元廊下に幅2で接続できた概念案のある出口|'+t.interfacesWithRootedConcept+'|',
  '|その条件で未解決の出口|'+t.interfacesStillWithoutRootedConcept+'|',
  '|既存の仮廊下を再設計する必要がある概念案を含む出口|'+t.interfacesWithStagedGalleryReroute+'|',
  '|実Minecraftで認証・施工した出口|0|','',
  '## 8件の検討',
  ...r.cases.flatMap(c=>c.heldExits.map(e=>'- '+c.id+' #'+e.stairIndex+' '+e.side+
   ' L'+e.level+': '+(e.jointDesign.conditionalTotal?
   '原典廊下へ接続可能な未施工の概念案あり':'構造・原典廊下接続の制約で未解決')+
   ' / 設計仮案 '+e.jointDesign.conditionalTotal+' 件')),'',
  '## 絶対に変更していない部分',
  ...r.limitations.map(x=>'- '+x),'',
  '廊下の仮置きセル移動は仮説であり、他の階段/廊下への接続の再成立は認証していません。',
  '元の9件はすべてHOLD。NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,csv,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB121(path.resolve(process.argv[2]??'b114-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:writeB121(r,path.resolve(process.argv[3]??'b121-review-output'))},null,2));
}
