/** B122 full proposed-gallery route re-audit, pinned to B121 Draft #23. */
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
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {straightModel} from '../../b119/main/b119-full-stair-3d-search.mjs';
import {buildB120UTurn} from '../../b120/main/b120-u-return-screener.mjs';
import {studyFloorSlab} from '../../b117/main/b117-geometry.mjs';
import {auditB122FullRoute} from './b122-full-corridor-proof.mjs';
const K=p=>p.x+','+p.z,H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const read=(dir,name)=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
function guarded(x,name){
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
 x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
 x.commandCount!==0||x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED')||
 x.BuildPlan?.operations?.length!==0)throw Error('B122_UNSAFE_PARENT_'+name);
}
function foreignStair(s,index,cross,apt){
 const selected=cross.id==='APARTMENT_V1'&&apt.selectedCandidate?.targetFlight===index?
  apt.selectedCandidate:null;
 if(selected)return {id:index,levels:[s.fromLevel,s.toLevel],
  footprint:selected.footprint,body:selected.sweptPlayerAABBs,
  treads:[...selected.stairTreadAABBs,...selected.platformAABBs],
  supports:selected.supportAABBs??[]};
 const m=straightModel(s.proposedOrigin,s.proposedAscent,s.fromLevel);
 return {id:index,levels:[s.fromLevel,s.toLevel],
  footprint:[...new Map([...s.cells,...m.footprint].map(p=>[K(p),p])).values()],
  body:m.body,treads:m.treads,supports:m.supports};
}
function modelFor(stair,idea){
 if(idea.shape==='B120_BOUNDED_U_RETURN_5_RISE')
  return buildB120UTurn({origin:idea.origin,ascent:idea.ascent,
   fromLevel:stair.fromLevel,firstRise:idea.firstRise});
 if(idea.shape==='STRAIGHT_HALF_STEP_PROXY')
  return straightModel(idea.origin,idea.ascent,stair.fromLevel);
 throw Error('B122_UNKNOWN_B121_SHAPE');
}
export async function assembleB122(dir){
 const b114=read(dir,'B114_Conditional_Circulation_15_Buildings.json');
 const cross=read(dir,'B114_15_Buildings_CrossFlight_Position_Study.json');
 const gallery=read(dir,'B114_15_Buildings_Stair_Gallery_Integrated_Design.json');
 const apt=read(dir,'B114_APARTMENT_V1_Switchback_3D_Design_Review.json');
 const b121=read('b121-review-output','B121_Joint_Stair_Gallery_Design_Review.json');
 if(!validateB114(b114)||!validateCrossFlightSearch(cross)||
 !validateStairGalleryIntegration(gallery)||!validateB121(b121)||
 b121.sourceB114Integrity!==b114.integritySha256||
 gallery.sourceB114Integrity!==b114.integritySha256||
 gallery.sourceCrossFlightIntegrity!==cross.integritySha256)
 throw Error('B122_PINNED_SOURCE_CHANGED');
 [b114,cross,gallery,apt,b121].forEach((x,i)=>guarded(x,i));
 const parent=await assembleReferenceParent(),b113=buildB113(parent);
 if(!validateB113(b113)||parent.sourceDesigns?.length!==15)throw Error('B122_PARENT_UNTRUSTED');
 guarded(b113,'B113');
 const cases=[];
 for(const design of parent.sourceDesigns){
  const id=design.candidateId,report=b121.cases.find(c=>c.id===id),
   rc=cross.cases.find(c=>c.id===id),r113=b113.cases.find(c=>c.id===id),
   r114=gallery.cases.find(c=>c.id===id);
  if(!report||!rc||!r113||!r114||report.sourceStairs!==rc.proposedOriginalStairs.length)
   throw Error('B122_BUILDING_REFERENCE_NOT_FOUND_'+id);
  const rows=[];
  if(report.heldExits.some(e=>e.jointDesign.conditionalTotal>0)){
   const sourceVolume=generateB105(design),qa=auditB105(sourceVolume,design.plan);
   if(qa.issueCount||qa.envelopeConflicts)throw Error('B122_B105_INVALID_'+id);
   const floorCount=design.plan.floors.length,sourceWalk=design.plan.floors.map((f,L)=>
    new Set([...f.gallery,...r113.horizontalRoutes[L].repair.addedCells].map(K)));
   const stagedWalk=design.plan.floors.map((f,L)=>
    new Set(r114.addedGalleryCells.filter(p=>p.level===L).map(K)));
   const foreignModels=rc.proposedOriginalStairs.map((s,i)=>foreignStair(s,i,rc,apt));
   const reviewed=new Set();
   for(const entry of report.heldExits){
    if(!entry.jointDesign.conditionalTotal)continue;
    for(const [rank,idea]of entry.jointDesign.shortlisted.entries()){
     const uid=entry.stairIndex+'/'+idea.shape+'/'+K(idea.origin)+'/'+K(idea.ascent)+'/'+idea.firstRise;
     if(reviewed.has(uid))continue;reviewed.add(uid);
     const stair=rc.proposedOriginalStairs[entry.stairIndex];
     if(!stair)throw Error('B122_BAD_STAIR_IDENTIFIER');
     const model=modelFor(stair,idea);
     const others=foreignModels.filter(x=>x.id!==entry.stairIndex);
     const occupied=Array.from({length:floorCount},()=>new Set());
     const foreignBox=Array.from({length:floorCount},()=>({treads:[],supports:[]}));
     for(const other of others)for(const level of other.levels){
      for(const p of other.footprint)occupied[level].add(K(p));
      foreignBox[level].treads.push(...other.treads);
      foreignBox[level].supports.push(...other.supports);
     }
     const apertures=Array.from({length:floorCount},()=>new Set());
     const slablayer=studyFloorSlab({fromLevel:stair.fromLevel,toLevel:stair.toLevel,
      lowerFloor:design.plan.floors[stair.fromLevel],upperFloor:design.plan.floors[stair.toLevel],
      lowerLanding:model.lowerLanding,upperLanding:model.upperLanding,
      bodyAABBs:model.body});
     for(const p of slablayer.conceptualOpeningCells)apertures[stair.toLevel].add(K(p));
     const sides=[];
     for(const [side,level,landing]of[
      ['LOWER',stair.fromLevel,model.lowerLanding],['UPPER',stair.toLevel,model.upperLanding]]){
      const route=idea.paths[side]?.candidate;
      if(!route)throw Error('B122_B121_CONDITIONAL_MISSING_SIDE_ROUTE');
      const removed=new Set(idea.stagedGalleryCellsForRedesign.filter(p=>p.level===level).map(K));
      const proposedOccupied=new Set(occupied[level]);
      for(const p of model.footprint)proposedOccupied.add(K(p));
      const result=auditB122FullRoute({candidate:route,landing,side,level,
       floor:design.plan.floors[level],cores:design.plan.cores,
       sourceWalk:sourceWalk[level],stagedWalk:stagedWalk[level],
       removedStaged:removed,otherStairCells:proposedOccupied,
       apertureCells:apertures[level],solidVoxels:sourceVolume.voxels,
       foreignTreads:foreignBox[level].treads,foreignSupports:foreignBox[level].supports});
      sides.push({side,level,...result});
     }
     rows.push({stairIndex:entry.stairIndex,rank:rank+1,shape:idea.shape,
      firstRise:idea.firstRise,origin:idea.origin,ascent:idea.ascent,
      requiredB114ReservationsToReroute:idea.softGalleryDisplacementCount,
      routes:sides,combinedNewRouteCells:sides.reduce((n,x)=>n+x.newRouteCells,0),
      networkReconnectionCertified:false,physicalWalkabilityCertified:false,
      originalSourceProtected:true,constructionAllowed:false});
    }
   }
  }
  cases.push({id,sourceStairs:report.sourceStairs,heldExits:report.heldExits.length,
   candidatesAudited:rows,allOriginalBuildingsUnchanged:true});
 }
 const all=cases.flatMap(c=>c.candidatesAudited),routes=all.flatMap(x=>x.routes);
 const totals={buildings:cases.length,sourceStairs:cases.reduce((n,c)=>n+c.sourceStairs,0),
  originalHeldExits:9,b121HeldInterfaces:8,
  corridorsIndependentlyAudited:routes.length,stairConfigurationsAudited:all.length,
  scopedTwoFloorNoConflict:all.filter(x=>x.routes.every(s=>s.status==='NO_DETECTED_CONFLICT_IN_SCOPED_PROXIES')).length,
  configurationsWithHoldFindings:all.filter(x=>x.routes.some(s=>s.status==='HOLD_FULL_ROUTE_REVIEW')).length,
  reviewedNewRouteCells:routes.reduce((n,x)=>n+x.newRouteCells,0),
  reviewedB114RelocationCells:all.reduce((n,x)=>n+x.requiredB114ReservationsToReroute,0),
  certifiedRealWalkable:0,worldContacts:0,constructionCommands:0};
 if(totals.buildings!==15||totals.sourceStairs!==102||
  cases.reduce((n,c)=>n+c.heldExits,0)!==8||
  !all.length||totals.corridorsIndependentlyAudited!==all.length*2)
 throw Error('B122_INCOMPLETE_CORRIDOR_EVIDENCE');
 const body={schema:'minecraftaibuilder-b122-independent-full-route-network-v1',
  sourceB121Integrity:b121.integritySha256,
  cases,totals,limitations:[
   'FULL_CORRIDOR_SOURCE_PROXY_AUDIT_NOT_ACTUAL_FLOOR_SUPPORT',
   'GALLERY_TWO_WIDE_GRAPH_NEVER_CERTIFIES_ALL_OTHER_STAIRS',
   'ANY_B114_STAGED_NETWORK_IS_HYPOTHETICAL_NOT_CONSTRUCTED',
   'STAIR_BLOCK_STATES_DOORS_COLLISION_AND_BEARING_NOT_VERIFIED',
   'ORIGINAL_NINE_STAIR_HOLDS_REMAIN_BLOCKED'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b114.gates.map(x=>({...x})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:H(body)};
}
export function validateB122(r){
 try{const {integritySha256,...body}=r??{},t=r.totals;
 return H(body)===integritySha256&&r.schema==='minecraftaibuilder-b122-independent-full-route-network-v1'&&
 t.buildings===15&&t.sourceStairs===102&&t.originalHeldExits===9&&t.b121HeldInterfaces===8&&
 t.corridorsIndependentlyAudited===t.stairConfigurationsAudited*2&&
 t.certifiedRealWalkable===0&&t.worldContacts===0&&
 r.cases.every(c=>c.allOriginalBuildingsUnchanged&&c.candidatesAudited.every(x=>
 x.originalSourceProtected&&!x.networkReconnectionCertified&&!x.physicalWalkabilityCertified&&
 !x.constructionAllowed&&x.routes.every(s=>!s.actualEducationCollisionCertified&&
 !s.realFloorSupportCertified&&!s.proposedEditApplied&&!s.constructionAllowed&&
 !s.rootToAllOtherStairsCertified)))&&
 r.readiness==='NOT_PREPARED'&&!r.constructionApproved&&!r.executionAllowed&&
 r.worldContacts===0&&r.worldCoordinates===null&&r.commandCount===0&&
 r.gates.length===9&&r.gates.every(x=>x.status==='BLOCKED')&&
 r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB122(r,out){
 if(!validateB122(r))throw Error('B122_UNSAFE_OR_CORRUPTED_OUTPUT');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B122_Full_Length_Corridors_And_Staged_Network.json');
 const md=path.join(out,'B122_Full_Route_Independent_Review_JA.md');
 const csv=path.join(out,'B122_Individual_Corridor_Proofs.csv');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const lines=['building,stair,shape,side,level,sourcePlusAddedCells,newRouteCells,issueCodes,networkNewlyUnrooted,stillHOLD'];
 for(const c of r.cases)for(const x of c.candidatesAudited)for(const side of x.routes)
  lines.push([c.id,x.stairIndex,x.shape,side.side,side.floor,
   side.routeFootprintCells,side.newRouteCells,
   side.issueCodes.join('+'),side.newlyUnrootedStagedCells,'YES'].join(','));
 fs.writeFileSync(csv,lines.join('\n')+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B122 — B121案の廊下全長と未施工B114ネットワーク独立監査','',
  '|項目|結果|','|---|---:|',
  '|参照建物|'+t.buildings+'|','|元の階段|'+t.sourceStairs+'|',
  '|監査した階段3D配置|'+t.stairConfigurationsAudited+'|',
  '|全長を独立検査した上下階廊下|'+t.corridorsIndependentlyAudited+'|',
  '|限定したソース代理モデル上の無干渉案|'+t.scopedTwoFloorNoConflict+'|',
  '|干渉・再接続などのレビュー保留がある案|'+t.configurationsWithHoldFindings+'|',
  '|延べ新規通路セル|'+t.reviewedNewRouteCells+'|',
  '|見直すB114未施工予約セル|'+t.reviewedB114RelocationCells+'|',
  '|実Minecraftで通行認証したもの|0|','',
  '## 判定された全通路',
  ...r.cases.flatMap(c=>c.candidatesAudited.flatMap(x=>x.routes.map(s=>
   '- '+c.id+' #'+x.stairIndex+' '+x.shape+' '+s.side+' L'+s.floor+
   ' 新規'+s.newRouteCells+'セル、追加審査: '+
   (s.issueCodes.join(' / ')||'限定代理形状上では検出なし')))),'',
  '## 施工・過大認証の禁止',
  ...r.limitations.map(x=>'- '+x),
  '','元の9出口はすべてHOLD。NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,md,csv};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=await assembleB122(path.resolve(process.argv[2]??'b114-review-output'));
 console.log(JSON.stringify({totals:r.totals,output:writeB122(r,path.resolve(process.argv[3]??'b122-review-output'))},null,2));
}
