/**
 * B114 / non-executable HOLD-room recommendation overlay.
 * Chooses ergonomic bed placements after independent source-cell, headspace,
 * entry, side-access, and reversibility checks. Never touches Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const k2=p=>p.x+','+p.z;
const k3=p=>p.x+','+p.y+','+p.z;
const move=[{x:0,z:1},{x:0,z:-1},{x:1,z:0},{x:-1,z:0}];
const neighbors=p=>move.map(d=>({x:p.x+d.x,z:p.z+d.z}));
const row=(a,b)=>a.z-b.z||a.x-b.x;
const clone=x=>JSON.parse(JSON.stringify(x));
const identity=o=>o.level+':'+o.roomId;
const validPoint=p=>Number.isInteger(p?.x)&&Number.isInteger(p?.z);
function assertSafe(x,kind){
 if(x?.readiness!=='NOT_PREPARED'||x.constructionApproved!==false||
  x.executionAllowed!==false||x.worldContacts!==0||x.worldCoordinates!==null||
  x.commandCount!==0||x.BuildPlan?.status!=='NOT_PREPARED'||
  x.BuildPlan?.operations?.length!==0||x.BuildPlan?.commandCount!==0||
  x.gates?.length!==9||x.gates.some(g=>g.status!=='BLOCKED'))
  throw Error('B114_PROMOTION_UNSAFE_'+kind);
}
function interior(room){
 const R=room.roomRectangle,pts=[];
 if(![R?.x,R?.z,R?.width,R?.depth].every(Number.isInteger)||
  R.width<4||R.depth<4)throw Error('B114_PROMOTION_BAD_ROOM_BOUNDS');
 for(let z=R.z+1;z<R.z+R.depth-1;z++)
  for(let x=R.x+1;x<R.x+R.width-1;x++)pts.push({x,z});
 return pts;
}
function reachable(start,allowed){
 const seen=new Set(),queue=[];
 if(allowed.has(k2(start))){seen.add(k2(start));queue.push(start);}
 for(let i=0;i<queue.length;i++)
  for(const p of neighbors(queue[i])){
   const key=k2(p);
   if(allowed.has(key)&&!seen.has(key)){seen.add(key);queue.push(p);}
  }
 return seen;
}
function rotate(p,q){
 const dx=q.x-p.x,dz=q.z-p.z;
 if(Math.abs(dx)+Math.abs(dz)!==1)throw Error('B114_PROMOTION_NON_ADJACENT_BED');
 return {dx,dz};
}
function verifyOption(room,candidate,originalRoom,designFloor,occupiedWithoutOld){
 const errors=[],cells=interior(room),allowed=new Set(cells.map(k2)),layout=[];
 const blocked=new Set(),reserved=new Set(room.protectedDoorApproach.map(k2));
 const doors=originalRoom.entrance;
 if(!validPoint(room.doorInterior)||!validPoint(doors)||
  !allowed.has(k2(room.doorInterior))||!room.protectedDoorApproach.length||
  !room.protectedDoorApproach.every(p=>allowed.has(k2(p)))||
  !room.protectedDoorApproach.some(p=>k2(p)===k2(room.doorInterior)))
  errors.push('ENTRY_RESERVATION_SOURCE_INVALID');
 if(candidate.fixtures.length!==2||originalRoom.candidateFixtures.length!==2)
  errors.push('UNEXPECTED_BED_COUNT');
 if(!candidate.localPlanValid||candidate.autoApplied!==false||
  candidate.educationCollisionCertified!==false||candidate.userApproved!==false)
  errors.push('CANDIDATE_CLAIMS_APPROVAL');
 const originalByIndex=new Map(originalRoom.candidateFixtures.map(x=>[x.index,x]));
 const occupiedFixtureCells=[];
 for(const fix of candidate.fixtures){
  const src=originalByIndex.get(fix.index);
  if(!src||src.role!=='bed'||fix.role!=='bed'||
   !Array.isArray(fix.proposedFootprint)||fix.proposedFootprint.length!==2||
   !validPoint(fix.proposedAnchor)||!fix.originalSourceUnchanged||
   fix.blockStatesVerified!==false) {
   errors.push('INVALID_B113_BED_PROVENANCE');continue;
  }
  if(k2(src.sourceAnchor)!==k2(fix.originalAnchor))errors.push('ORIGINAL_ANCHOR_CHANGED');
  if(!fix.proposedFootprint.some(p=>k2(p)===k2(fix.proposedAnchor)))
   errors.push('BED_ANCHOR_OUTSIDE_FOOTPRINT');
  if(fix.proposedFootprint.some(p=>!validPoint(p)))errors.push('BED_COORDINATE_INVALID');
  else{
   try{rotate(fix.proposedFootprint[0],fix.proposedFootprint[1]);}
   catch{errors.push('BED_FOOTPRINT_DISCONNECTED');}
  }
  for(const p of fix.proposedFootprint){
   if(!allowed.has(k2(p)))errors.push('BED_CROSSES_ROOM_BOUNDARY');
   if(designFloor.footprintRows[p.z]?.[p.x]!=='1')
    errors.push('BED_NOT_SUPPORTED_BY_SOURCE_FLOOR_MASK');
   if(reserved.has(k2(p)))errors.push('BED_BLOCKS_ROOM_DOOR_APPROACH');
   if(blocked.has(k2(p)))errors.push('BED_FOOTPRINT_OVERLAP');
   blocked.add(k2(p));
   const voxel={x:p.x,y:room.level*5+1,z:p.z,kind:'B113_RELOCATED_BED_CONCEPT',
    owner:room.level+':'+room.roomId,fixtureIndex:fix.index,
    minecraftBlockId:null,placementAuthorized:false};
   occupiedFixtureCells.push(voxel);
   if(occupiedWithoutOld.has(k3(voxel)))errors.push('BED_INTERSECTS_EXISTING_BUILDING_SOLID');
  }
  layout.push(fix);
 }
 const free=new Set([...allowed].filter(k=>!blocked.has(k)));
 const seen=reachable(room.doorInterior,free);
 if(seen.size!==free.size)errors.push('DISCONNECTED_INTERIOR_ROUTE');
 for(const p of cells)if(free.has(k2(p))){
  // Entire player headroom in the source building design must remain clear.
  for(const y of [room.level*5+1,room.level*5+2])
   if(occupiedWithoutOld.has(k3({x:p.x,y,z:p.z})))
    errors.push('NON_FIXTURE_SOLID_BLOCKS_2HIGH_PASSAGE');
 }
 const sideByFixture=[];
 for(const f of layout){
  const [a,b]=f.proposedFootprint,{dx,dz}=rotate(a,b);
  const sides=[];
  for(const p of f.proposedFootprint)
   for(const q of [{x:p.x-dz,z:p.z+dx},{x:p.x+dz,z:p.z-dx}])
    if(seen.has(k2(q))&&!sides.some(x=>k2(x)===k2(q)))sides.push(q);
  sides.sort(row);
  if(sides.length<2)errors.push('BED_HAS_LESS_THAN_TWO_SIDE_ACCESS_CELLS');
  sideByFixture.push({fixtureIndex:f.index,cells:sides});
 }
 const uniqueSideCells=new Set(sideByFixture.flatMap(x=>x.cells.map(k2))).size;
 if(uniqueSideCells<4)errors.push('ROOM_HAS_LESS_THAN_FOUR_DISTINCT_SIDE_ACCESS_CELLS');
 const moved=layout.filter(f=>f.anchorRelocated).length;
 const displacement=layout.reduce((n,f)=>n+f.anchorShiftBlocks,0);
 if(moved>1||displacement>2)errors.push('EXCESSIVE_FURNITURE_CHANGE');
 if(layout.some(f=>f.actualBlockStatesAssigned===true))errors.push('GAME_STATES_UNKNOWN');
 return {valid:errors.length===0,errors:[...new Set(errors)],
  independentlyReachableFreeCells:seen.size,freeInteriorCells:free.size,
  reachableSideCellsByBed:sideByFixture,
  uniqueReachableSideAccessCells:uniqueSideCells,
  relocatedBedCount:moved,anchorDisplacementBlocks:displacement,
  proposedBedCells:occupiedFixtureCells};
}
function stagedBuilding(source,changes){
 const keys=new Set(),removalKeys=new Set(),added=[],sourceMap=new Map();
 for(const v of source.localOverlay){
  const key=k3(v);
  if(sourceMap.has(key))throw Error('B114_PROMOTION_SOURCE_DUPLICATE_'+source.id);
  sourceMap.set(key,v);
 }
 for(const r of changes)for(const old of r.removeOldProxyCells){
  const key=k3(old),found=sourceMap.get(key);
  if(found?.kind!=='UNRECONCILED_B105_DISPLAY_ONLY')
   throw Error('B114_PROMOTION_OLD_PROXY_PROVENANCE_MISMATCH:'+key);
  if(removalKeys.has(key))throw Error('B114_PROMOTION_DUPLICATE_REMOVAL');
  removalKeys.add(key);
 }
 for(const r of changes)for(const v of r.addRecommendedFurnitureCells){
  const key=k3(v);
  if(keys.has(key))throw Error('B114_PROMOTION_PROPOSALS_OVERLAP');
  keys.add(key);added.push(v);
  if(sourceMap.has(key)&&!removalKeys.has(key))
   throw Error('B114_PROMOTION_NEW_BED_INTERSECTS_SOURCE');
 }
 const merged=[...source.localOverlay.filter(v=>!removalKeys.has(k3(v))),...added];
 const unique=new Set(merged.map(k3));
 if(unique.size!==merged.length)throw Error('B114_PROMOTION_DUPLICATED_STAGED_VOXEL');
 // Undo the local-only edit and recover the exact original voxel array.
 const rollback=[...merged.filter(v=>!keys.has(k3(v))),
  ...source.localOverlay.filter(v=>removalKeys.has(k3(v)))];
 const sortedKeys=x=>x.map(v=>k3(v)+'/'+v.kind).sort();
 if(JSON.stringify(sortedKeys(rollback))!==JSON.stringify(sortedKeys(source.localOverlay)))
  throw Error('B114_PROMOTION_ROLLBACK_UNSAFE');
 return {buildingId:source.id,sourceUnchanged:true,
  sourceOverlaySha256:sha(source.localOverlay),
  stagedOverlaySha256:sha(merged),
  sourceVoxelCount:source.localOverlay.length,stagedVoxelCount:merged.length,
  removedDisplayProxyCells:removalKeys.size,addedBedFootprintCells:added.length,
  residualUnreconciledDisplayProxyCells:merged.filter(v=>v.kind==='UNRECONCILED_B105_DISPLAY_ONLY').length,
  stagedDuplicateVoxelCount:merged.length-unique.size,
  reversibleInLocalDesign:true,actualSourceFilePatch:null,
  entries:changes.map(r=>({roomId:r.roomId,level:r.level,
   removeOldProxyCells:r.removeOldProxyCells,
   addRecommendedFurnitureCells:r.addRecommendedFurnitureCells}))};
}
export function stageHeldRoomRecommendations(furniture,held,parent){
 assertSafe(furniture,'FURNITURE');assertSafe(held,'HELD');
 if(furniture.schema!=='minecraftaibuilder-b114-furniture-concept-reconciliation-v1'||
  held.schema!=='minecraftaibuilder-b114-held-beds-local-redesign-v1'||
  held.sourceFurnitureReconciliationSha256!==sha(furniture)||
  held.sourceB114Integrity!==furniture.sourceB114Integrity||
  held.sourceB113Integrity!==furniture.sourceB113Integrity||
  held.totals.initialHeldRooms!==4||furniture.totals.unreconciledRooms!==4)
  throw Error('B114_PROMOTION_SOURCE_INTEGRITY_MISMATCH');
 const changes=[],rejections=[],perBuilding=new Map();
 for(const r of held.reports){
  const caseSource=furniture.reports.find(b=>b.id===r.buildingId);
  const original=caseSource?.rooms.find(o=>o.roomId===r.roomId&&o.level===r.level);
  const floor=parent.sourceDesigns.find(d=>d.candidateId===r.buildingId)?.plan.floors[r.level];
  const sourceRoom=floor?.rooms.find(x=>x.id===r.roomId);
  if(!caseSource||!original||!floor||!sourceRoom||original.provisionalFullReplacement||
   JSON.stringify(original.roomRectangle)!==JSON.stringify(r.roomRectangle)||
   k2(original.entrance)!==k2(r.original?.entrance??original.entrance)||
   r.designApproved!==false||r.reconstructionApplied!==false||r.worldContacts!==0)
   throw Error('B114_PROMOTION_ROOM_REFERENCE_MISMATCH:'+r.id);
  if(k2(original.entrance)!==k2(sourceRoom.conceptualDoorOpening))
   throw Error('B114_PROMOTION_SOURCE_DOOR_CHANGED');
  const dropKeys=new Set(original.sourceB105DisplayProxyCells.map(k3));
  const remaining=new Map(caseSource.localOverlay.filter(v=>!dropKeys.has(k3(v))).map(v=>[k3(v),v]));
  const checked=r.alternatives.map((candidate,index)=>({candidateIndex:index,score:candidate.score,
   candidate,audit:verifyOption(r,candidate,original,floor,remaining)}));
  const viable=checked.filter(x=>x.audit.valid);
  // A wider, two-cells-per-bed side approach is more important than one less
  // moved design block; both edits are unapproved and never applied to source.
  viable.sort((a,b)=>
   Math.min(...b.audit.reachableSideCellsByBed.map(x=>x.cells.length))-
    Math.min(...a.audit.reachableSideCellsByBed.map(x=>x.cells.length))||
   b.audit.uniqueReachableSideAccessCells-a.audit.uniqueReachableSideAccessCells||
   a.audit.anchorDisplacementBlocks-b.audit.anchorDisplacementBlocks||
   a.score-b.score||a.candidateIndex-b.candidateIndex);
  const chosen=viable[0];
  if(!chosen){
   rejections.push({id:r.id,reason:'NO_CANDIDATE_WITH_INDEPENDENT_2HIGH_ACCESS_AUDIT',
    alternatives:checked.map(x=>({rank:x.candidateIndex+1,issues:x.audit.errors}))});
   continue;
  }
  const result={id:r.id,buildingId:r.buildingId,level:r.level,roomId:r.roomId,
   selectedOriginalRank:chosen.candidateIndex+1,allAlternativeAudits:checked.map(x=>({
    rank:x.candidateIndex+1,valid:x.audit.valid,issues:x.audit.errors,
    distinctSideAccessCells:x.audit.uniqueReachableSideAccessCells,
    bedSideAccessCounts:x.audit.reachableSideCellsByBed.map(z=>z.cells.length),
    movement:x.audit.anchorDisplacementBlocks})),
   recommendationBasis:'PRIORITIZE_TWO_REACHABLE_LONG_SIDE_CELLS_PER_BED_OVER_ONE_BLOCK_SAVED',
   relocatedAnchors:chosen.candidate.fixtures.map(x=>({
    index:x.index,original:x.originalAnchor,recommended:x.proposedAnchor,
    oldFootprint:x.originalFootprint,recommendedFootprint:x.proposedFootprint,
    anchorShiftBlocks:x.anchorShiftBlocks,orientation:x.proposedDirection
   })),
   independentlyVerifiedGeometry:chosen.audit.valid,
   connectedFreeCells:chosen.audit.independentlyReachableFreeCells,
   distinctSideAccessCells:chosen.audit.uniqueReachableSideAccessCells,
   bedSideAccessCounts:chosen.audit.reachableSideCellsByBed.map(x=>x.cells.length),
   relocatedBedCount:chosen.audit.relocatedBedCount,
   displacementBlocks:chosen.audit.anchorDisplacementBlocks,
   removeOldProxyCells:original.sourceB105DisplayProxyCells,
   addRecommendedFurnitureCells:chosen.audit.proposedBedCells,
   humanReviewRequired:true,sourceAnchorEditApproved:false,
   realDoorAndBedStatesVerified:false,constructionCommands:0,
   appliedToOriginal:false};
  changes.push(result);
  const group=perBuilding.get(r.buildingId)??[];
  group.push(result);perBuilding.set(r.buildingId,group);
 }
 const stages=[];
 for(const [id,rooms] of perBuilding){
  const source=furniture.reports.find(x=>x.id===id);
  stages.push(stagedBuilding(source,rooms));
 }
 const originalHeld=furniture.totals.unreconciledRooms,
  provisional=originalHeld-rejections.length;
 const totals={sourceBuildings:furniture.totals.buildings,
  sourceRooms:furniture.totals.rooms,
  originallyReconciledRooms:furniture.totals.replacedRooms,
  heldRoomsConsidered:originalHeld,
  recommendedRooms:provisional,geometryUnresolvedRooms:rejections.length,
  geometryStagedDesignRooms:furniture.totals.replacedRooms+provisional,
  recommendedBedAnchorRelocations:changes.reduce((n,x)=>n+x.relocatedBedCount,0),
  recommendedAnchorDisplacementBlocks:changes.reduce((n,x)=>n+x.displacementBlocks,0),
  removedHeldB105ProxyCells:stages.reduce((n,x)=>n+x.removedDisplayProxyCells,0),
  addedHeldB113BedBodyCells:stages.reduce((n,x)=>n+x.addedBedFootprintCells,0),
  stagedBuildingOverlays:stages.length,
  geometricallyIntersectingStagedVoxels:stages.reduce((n,x)=>n+x.stagedDuplicateVoxelCount,0),
  reversibleLocalBuildingOverlays:stages.filter(x=>x.reversibleInLocalDesign).length,
  roomsStillRequiringHumanAndEducationReview:provisional,
  physicallyCertifiedRooms:0,approvedSourceAnchorChanges:0,
  actualMinecraftCommands:0,worldContacts:0};
 const body={schema:'minecraftaibuilder-b114-held-room-reviewed-staging-v1',
  sourceB114Integrity:furniture.sourceB114Integrity,
  sourceFurnitureSha256:sha(furniture),
  sourceHeldCandidatesSha256:held.integritySha256,
  sourceB113Integrity:furniture.sourceB113Integrity,
  recommendationPolicy:'TWO_SIDE_ACCESS_CELLS_PER_BED_BEFORE_1_BLOCK_LESS_ANCHOR_MOVEMENT',
  recommendations:changes,rejected:rejections,stagedBuildingOverlays:stages,
  totals,proposalsAppliedToSource:false,
  sourceChangesRequestedButNotApproved:changes.map(x=>x.id),
  allUnapprovedMaterialAndBedStates:true,
  elligibility:'DESIGN_STAGING_ONLY_NOT_PHYSICAL_REACHABILITY',
  physicalConstructionReady:false,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,worldContacts:0,worldCoordinates:null,
  commandCount:0,gates:furniture.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...body,integritySha256:sha(body)};
}
export function validateHeldRoomStaging(x){
 try{
  const {integritySha256,...body}=x;
  return integritySha256===sha(body)&&x.schema==='minecraftaibuilder-b114-held-room-reviewed-staging-v1'&&
   x.sourceFurnitureSha256?.length===64&&x.sourceHeldCandidatesSha256?.length===64&&
   x.recommendations.every(r=>r.appliedToOriginal===false&&r.humanReviewRequired===true&&
    r.sourceAnchorEditApproved===false&&r.realDoorAndBedStatesVerified===false)&&
   x.totals.geometryStagedDesignRooms<=x.totals.sourceRooms&&
   x.totals.physicallyCertifiedRooms===0&&x.totals.approvedSourceAnchorChanges===0&&
   x.totals.actualMinecraftCommands===0&&x.totals.worldContacts===0&&
   x.proposalsAppliedToSource===false&&x.physicalConstructionReady===false&&
   x.readiness==='NOT_PREPARED'&&x.constructionApproved===false&&
   x.executionAllowed===false&&x.worldContacts===0&&x.worldCoordinates===null&&
   x.commandCount===0&&x.gates.length===9&&x.gates.every(g=>g.status==='BLOCKED')&&
   x.BuildPlan.status==='NOT_PREPARED'&&x.BuildPlan.operations.length===0&&
   x.BuildPlan.commandCount===0;
 }catch{return false;}
}
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rect=(x,y,w,h,fill,stroke='none',sw=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const txt=(x,y,s,size=14,color='#e5eef7',bold=500)=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+bold+'" fill="'+color+'">'+xml(s)+'</text>';
function overview(stage,held){
 const W=1560,H=1150,size=24,parts=[];
 for(const [i,r] of stage.recommendations.entries()){
  const source=held.reports.find(x=>x.id===r.id),R=source.roomRectangle;
  const boxX=30+(i%2)*775,boxY=115+Math.floor(i/2)*495;
  parts.push(rect(boxX,boxY,744,465,'#14263a','#35536a',1));
  parts.push(txt(boxX+20,boxY+37,r.id,18,'#f1f5f9',700));
  parts.push(txt(boxX+20,boxY+60,'BEST ERGONOMIC: source rank '+r.selectedOriginalRank+
   ', displacement '+r.displacementBlocks+', usable side cells '+r.distinctSideAccessCells,12,'#b0d4c9'));
  const footprintByBed=new Map(r.relocatedAnchors.flatMap(f=>f.recommendedFootprint.map(p=>[k2(p),f.index])));
  const reserved=new Set(source.protectedDoorApproach.map(k2));
  const beds=['#efa968','#afabff'];
  const x0=boxX+70,y0=boxY+97;
  for(let z=R.z;z<R.z+R.depth;z++)for(let x=R.x;x<R.x+R.width;x++){
   let fill='#43617a',key=x+','+z;
   if(x===R.x||x===R.x+R.width-1||z===R.z||z===R.z+R.depth-1)fill='#bed2df';
   else if(reserved.has(key))fill='#65bfae';
   if(footprintByBed.has(key))fill=beds[footprintByBed.get(key)%2];
   parts.push(rect(x0+(x-R.x)*size,y0+(z-R.z)*size,size,size,fill,'#263c53',.7));
  }
  parts.push(txt(boxX+30,boxY+362,'Green = door approach; orange/purple = bed footprint',12,'#c1d6e2'));
  parts.push(txt(boxX+30,boxY+390,'2 accessible long-side cells per bed (offline)',12,'#acd9c4'));
  parts.push(txt(boxX+30,boxY+426,'HUMAN + EDUCATION VERIFICATION REQUIRED • NOT APPLIED',11,'#ecba8e',700));
 }
 const head=txt(37,57,'B114 / FOUR BEDROOMS — PREFERRED NON-EXECUTABLE STAGING',25,'#eff5fa',700)+
 txt(39,83,'Full local building overlays checked for occupied voxels; rooms remain pending actual Education validation',13,'#a5bacf');
 const tail=txt(38,H-24,'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / source anchor changes NOT approved',12,'#a0b8cc');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+
 '" viewBox="0 0 '+W+' '+H+'"><title>Unapproved review of four bed placements</title>'+
 rect(0,0,W,H,'#0b1726')+head+parts.join('')+tail+'</svg>\n';
}
export function writeHeldRoomStaging(r,held,dir){
 if(!validateHeldRoomStaging(r))throw Error('B114_PROMOTION_WRITE_UNSAFE');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_Four_Bedroom_Preferred_Staging.json'),
  md=path.join(dir,'B114_Four_Bedroom_Preferred_Review_JA.md'),
  svg=path.join(dir,'B114_Four_Bedroom_Preferred_Review.svg');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const graphic=overview(r,held);
 if(/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(graphic))
  throw Error('B114_PROMOTION_SVG_UNSAFE');
 fs.writeFileSync(svg,graphic);
 fs.writeFileSync(md,[
  '# B114 — 保留4室の推奨家具配置を建物モデルへ仮統合（非施工）','',
  '既存の12候補を独立に再検査し、最小移動より各ベッド2セルの操作側余白を優先。',
  'B105の残存家具表示8セルを局所設計案から取り除き、ベッド占有候補16セルを2棟に合成。',
  '実B105/B113/B114ソースデータは一切変更・昇格せず、SHA256と完全復元を検証。','',
  '|検証|件数|','|---|---:|',
  '|対象15棟の室数|'+r.totals.sourceRooms+'|',
  '|以前から家具モデルが幾何学的に成立|'+r.totals.originallyReconciledRooms+'|',
  '|今回推奨配置を仮統合|'+r.totals.recommendedRooms+'|',
  '|仮統合したデザイン室数|'+r.totals.geometryStagedDesignRooms+'|',
  '|自動で採用できず継続保留|'+r.totals.geometryUnresolvedRooms+'|',
  '|操作やベッド実機認証済み|0|',
  '|元の建物を変更した数|0|','',
  '## 推奨配置と変更理由','',
  ...r.recommendations.flatMap(x=>[
   '### '+x.id,'',
   '- 推奨順位: 元の第'+x.selectedOriginalRank+'候補',
   '- 操作側空きセル: '+x.bedSideAccessCounts.join(' / ')+'、合計重複なし '+x.distinctSideAccessCells,
   '- アンカー変更: '+x.relocatedBedCount+'台、移動距離合計 '+x.displacementBlocks+'ブロック',
   '- 入口・全空きセルの連結: '+x.independentlyVerifiedGeometry,
   '- 承認状況: 保留（Minecraft Educationのベッド/ドアの状態未確認）',''
  ]),
  '## 安全条件','',
  '仮統合データは既存の占有セルから差分を合成しただけで、再び元モデルに復元できる。',
  '脚・頭ブロックの向き、実睡眠、衝突、ゲーム内外観は認証していない。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,md,svg};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const dir=path.resolve('b114-review-output'),
  furniture=JSON.parse(fs.readFileSync(path.join(dir,'B114_Furniture_Reconciliation_15_Buildings.json'),'utf8')),
  held=JSON.parse(fs.readFileSync(path.join(dir,'B114_Four_Held_Rooms_Bed_Redesign.json'),'utf8'));
 throw Error('B114_STAGING_REQUIRES_PINNED_PARENT_SOURCE_USE_BATCH_ONLY');
}