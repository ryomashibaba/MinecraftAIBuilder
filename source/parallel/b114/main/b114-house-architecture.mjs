/**
 * B114 HOUSE_V3 - independent architectural shell, room partitions, openings
 * and roof-massing review. All generated cells are non-executable LOCAL
 * DESIGN PROPOSALS. No Minecraft access, coordinates, or build commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {buildB114,validateB114} from './compile-b114.mjs';
import {inspectHouse} from './b114-house-v3-integrated.mjs';
import {buildHouseUnified3D,validateHouseUnified3D} from './b114-house-unified-3d.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {intersects,K,neighbors} from '../../b113/main/b113-geometry.mjs';

const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const xyz=(x,y,z)=>x+','+y+','+z;
const box=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
const sort=(a,b)=>a.y-b.y||a.z-b.z||a.x-b.x;
const mask=(floor,p)=>floor.footprintRows[p.z]?.[p.x]==='1';
const rect=(r,p)=>p.x>=r.x&&p.x<r.x+r.width&&p.z>=r.z&&p.z<r.z+r.depth;
const boundary=(r,p)=>rect(r,p)&&(p.x===r.x||p.x===r.x+r.width-1||
 p.z===r.z||p.z===r.z+r.depth-1);
const key2=p=>p.x+','+p.z;

function roofDepths(f) {
 const allowed=new Set(),depth=new Map(),queue=[];
 for(let z=0;z<f.footprintRows.length;z++)for(let x=0;x<f.footprintRows[z].length;x++){
  const p={x,z};if(mask(f,p))allowed.add(key2(p));
 }
 for(const key of allowed){
  const [x,z]=key.split(',').map(Number),p={x,z};
  if(neighbors(p).some(n=>!allowed.has(key2(n)))){
   queue.push(p);depth.set(key,0);
  }
 }
 for(let i=0;i<queue.length;i++){
  const p=queue[i],d=depth.get(key2(p));
  for(const n of neighbors(p)){
   const k=key2(n);
   if(allowed.has(k)&&!depth.has(k)){depth.set(k,d+1);queue.push(n);}
  }
 }
 if(depth.size!==allowed.size)throw Error('B114_ARCH_ROOF_DEPTH_INCOMPLETE');
 return depth;
}
function elevations(volume,added) {
 const lines={};
 for(const side of ['N','E','S','W']){
  const rows=[];
  for(let level=volume.levels-1;level>=0;level--){
   const face=volume.facadeFaces[level].faces.filter(f=>f.sides.includes(side));
   if(!face.length){rows.push('L'+level+' (none)');continue;}
   const axis=side==='N'||side==='S'?'x':'z';
   const min=Math.min(...face.map(f=>f[axis])),max=Math.max(...face.map(f=>f[axis]));
   const chars=[];
   for(let k=min;k<=max;k++){
    const f=face.find(p=>p[axis]===k);
    chars.push(!f?' ':f.opening?'E':f.glazed?'W':'#');
   }
   rows.push('L'+level+' '+chars.join('')+' [upper band proposal]');
  }
  lines[side]=rows;
 }
 return {legend:{'#':'facade panel','W':'existing window concept',
  'E':'existing external portal',' ':'no projected face'},
  profiles:lines,upperFacadeBandCells:added.filter(p=>p.role==='FACADE_LINTEL_BAND').length,
  visualQualityHumanApproved:false,notAnImageRender:true};
}
export function auditHouseArchitecture(parent,b113,b114,house,unified) {
 if(!validateB113(b113)||!validateB114(b114)||!validateHouseUnified3D(unified)||
  house?.id!=='HOUSE_V3'||unified.id!=='HOUSE_V3'||
  unified.sourceB114Integrity!==b114.integritySha256||
  house.sourceB114Integrity!==b114.integritySha256||
  house.sourceDesignProof!==unified.sourceHouseSourceDigest)
  throw Error('B114_ARCH_UNSAFE_SOURCE');
 const design=parent.sourceDesigns.find(x=>x.candidateId==='HOUSE_V3');
 const c113=b113.cases.find(x=>x.id==='HOUSE_V3');
 if(!design||!c113||design.plan.floors.length!==2||c113.rooms.length!==3)
  throw Error('B114_ARCH_SOURCE_CHANGED');
 const volume=generateB105(design),qa=auditB105(volume,design.plan);
 if(qa.issueCount||qa.envelopeConflicts)throw Error('B114_ARCH_PARENT_ENVELOPE_FAILED');
 const floors=design.plan.floors;
 const base=new Map(unified.candidateSolids.map(v=>[xyz(v.x,v.y,v.z),v]));
 const proposal=new Map(),overlapsSource=[],selfRoleClashes=[];
 const put=(p,role,owner,style)=>{
  const key=xyz(p.x,p.y,p.z),original=base.get(key),prior=proposal.get(key);
  if(original)overlapsSource.push({x:p.x,y:p.y,z:p.z,role,originalKinds:original.types});
  if(prior){
   if(prior.role!==role)selfRoleClashes.push({x:p.x,y:p.y,z:p.z,
    from:prior.role,to:role});
   prior.owners.push(owner);return;
  }
  proposal.set(key,{...p,role,owners:[owner],semanticMaterialRole:style,
   minecraftBlockId:null,placementAuthorized:false});
 };
 const expectedRoomDoors=[];
 const roomWallByLevel=floors.map(()=>new Set());
 for(const floor of floors)for(const r of floor.rooms){
  const d=r.conceptualDoorOpening,level=floor.level,y0=level*5;
  if(!boundary(r,{x:d.x,z:d.z}))throw Error('B114_ARCH_DOOR_NOT_ON_ROOM_BOUNDARY');
  expectedRoomDoors.push({level,roomId:r.id,side:d.side,x:d.x,z:d.z,
   airAtY:[y0+1,y0+2],physicalDoorPairCertified:false,
   educationHingeOrStateAssigned:false});
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   if(!boundary(r,{x,z}))continue;
   for(let y=y0+1;y<=y0+4;y++){
    if(x===d.x&&z===d.z&&(y===y0+1||y===y0+2))continue;
    const p={x,y,z};
    roomWallByLevel[level].add(key2(p));
    const opening=x===d.x&&z===d.z;
    const style=opening?'DOOR_HEADER':
     ((x+z+level)%6===0?'WOOD_FRAME_PIER':'WARM_PLASTER_PARTITION');
    put(p,'ROOM_PARTITION',level+':'+r.id,style);
   }
  }
 }
 // B105 created exterior envelope at y=5*level+1..+3 only.
 // The fourth layer is genuinely absent, even below an intact roof.
 for(const f of volume.facadeFaces){
  for(const face of f.faces){
   const p={x:face.x,y:f.level*5+4,z:face.z};
   put(p,'FACADE_LINTEL_BAND','ENVELOPE_L'+f.level,
    face.opening?'PORTAL_HEAD_AND_EAVE':face.glazed?'WINDOW_HEADER_FRAME':'TIMBER_EAVE_BAND');
  }
 }
 // The B105 roof style label says SIMPLE_STEPPED, but the existing cap is flat.
 // Preserve the entire flat cap as subroof, add a non-executable concentric tier
 // option above it; no roof replacement, no verified weatherproofing.
 const roofTop=floors.at(-1),depths=roofDepths(roofTop);
 const profileLevels=new Map();
 for(const [key,distance] of depths){
  const [x,z]=key.split(',').map(Number),tiers=Math.min(3,Math.floor(distance/2));
  profileLevels.set(tiers,(profileLevels.get(tiers)??0)+1);
  for(let layer=1;layer<=tiers;layer++)put({x,y:floors.length*5+layer,z},
   'ROOF_STEPPED_MASSING','ROOF_HOUSE_V3','STEPPED_GABLED_MASSING_RESEARCH');
 }
 const proposalCells=[...proposal.values()].sort(sort);
 const facadeBand=proposalCells.filter(p=>p.role==='FACADE_LINTEL_BAND'),
  partition=proposalCells.filter(p=>p.role==='ROOM_PARTITION'),
  roof=proposalCells.filter(p=>p.role==='ROOF_STEPPED_MASSING');
 const opened=expectedRoomDoors.flatMap(d=>d.airAtY.map(y=>({x:d.x,y,z:d.z,
  level:d.level,roomId:d.roomId})));
 const blockedDoorCells=opened.filter(p=>base.has(xyz(p.x,p.y,p.z))||
  proposal.has(xyz(p.x,p.y,p.z)));
 const stairs=unified.stairHalfStepAABBs;
 const stairHalfStepOverlaps=proposalCells.flatMap(p=>stairs.filter(s=>
  intersects(box(p),s.box)).map(s=>({x:p.x,y:p.y,z:p.z,
   stair:s.stair,role:p.role})));
 const proposedPassage=floors.map((f,i)=>new Set([
  ...f.gallery.map(K),
  ...c113.horizontalRoutes[i].repair.addedCells.map(K),
  ...house.gallery.twoWideDetours[i].addedCells
 ]));
 const newWallBlocksGallery=partition.filter(p=>
  (p.y%5===1||p.y%5===2)&&proposedPassage[Math.floor(p.y/5)]?.has(K(p)));
 const furnitureOverlaps=partition.filter(p=>base.get(xyz(p.x,p.y,p.z))?.
  types.includes('FURNITURE_PLACEHOLDER'));
 const sourceRoofCaps=unified.candidateSolids.filter(v=>v.types.includes('ROOF_CAP_PROXY')),
  topCaps=sourceRoofCaps.filter(v=>v.y===floors.length*5);
 const sourceRoofCells=new Set(topCaps.map(K)),missingCaps=[...depths.keys()]
  .filter(k=>!sourceRoofCells.has(k));
 const roofOutsideCap=roof.filter(p=>!sourceRoofCells.has(K(p)));
 const grossInteriorWallCount=partition.length;
 const beamOnlyWalls=partition.filter(p=>p.y%5===4).length;
 const roofAesthetic={
  originalRoofStyle:volume.roofProfile,originalTopCapHeight:floors.length*5,
  originalTopFlatCapCells:topCaps.length,proposedTierBlocks:roof.length,
  proposedTierFootprintCounts:Object.fromEntries([...profileLevels].sort((a,b)=>a[0]-b[0])),
  allOriginalRoofCapsPreserved:true,physicalRoofWeatherproofCertified:false,
  structuralLoadsVerified:false,exteriorHumanApproved:false
 };
 const totals={conceptRooms:3,levels:2,
  originalFacadeWindowProxyCells:volume.summary.windowProxies,
  addedFacadeBandCells:facadeBand.length,
  proposedPartitionWallCells:grossInteriorWallCount,
  upperPartitionSealingCells:beamOnlyWalls,
  protectedDoorAirCells:opened.length,
  proposedRoofTierBlocks:roof.length,
  previouslyFlatRoofCapCells:topCaps.length,
  doorOpeningObstructions:blockedDoorCells.length,
  newWallBlockedGalleryCells:newWallBlocksGallery.length,
  newWallFurnitureClashes:furnitureOverlaps.length,
  stairHalfStepClashes:stairHalfStepOverlaps.length,
  overlapsExistingSourceSolids:overlapsSource.length,
  incompatibleNewRoleOverlaps:selfRoleClashes.length,
  roofCellsOutsideTopCap:roofOutsideCap.length,missingRoofCapCells:missingCaps.length,
  priorWidth2RoomPaths:unified.totals.independentlyVerifiedTwoWideRoomPaths,
  potentialRoomPathsAfterAddingWalls:unified.totals.independentlyVerifiedTwoWideRoomPaths-
   new Set(newWallBlocksGallery.map(p=>p.x+','+p.y+','+p.z)).size,
  certifiedActualDoors:0,certifiedFinishedRooms:0,certifiedExteriorFinish:0,
  worldContacts:0,commands:0};
 // The last metric above is an *upper bound of no worsening*; do NOT label
 // it as a recomputed path or let it become negative without a diagnostic.
 if(totals.potentialRoomPathsAfterAddingWalls<0)
  totals.potentialRoomPathsAfterAddingWalls=0;
 const blockingDiagnostics=[
  ...overlapsSource.length?['NEW_MASSING_OVERLAPS_PREEXISTING_SOLID']:[],
  ...selfRoleClashes.length?['NEW_SEMANTIC_ROLES_OVERLAP']:[],
  ...blockedDoorCells.length?['NEW_WALL_BLOCKS_DOOR_AIR']:[],
  ...newWallBlocksGallery.length?['PARTITION_INTERSECTS_PROPOSED_GALLERY']:[],
  ...stairHalfStepOverlaps.length?['NEW_WALL_INTERSECTS_STAIR_STEP']:[],
  ...missingCaps.length?['TOP_ROOF_SOURCE_COVERAGE_GAP']:[],
  ...roofOutsideCap.length?['PROPOSED_ROOF_OUTSIDE_SOURCE_FOOTPRINT']:[]
 ];
 return {schema:'minecraftaibuilder-b114-house-architectural-review-v1',
  id:'HOUSE_V3',sourceB114Integrity:b114.integritySha256,
  sourceUnifiedDigest:unified.integritySha256,sourceDesignDigest:unified.sourceHouseSourceDigest,
  conceptualAdditionKind:'LOCAL_ARCHITECTURAL_DESIGN_OVERLAY_NOT_WORLD_COMMANDS',
  addedElements:proposalCells,protectedDoors:expectedRoomDoors,
  collisions:{overlapsSource,selfRoleClashes,blockedDoorCells,newWallBlocksGallery,
   furnitureOverlaps,stairHalfStepOverlaps,missingCaps,roofOutsideCap},
  perFloor:roomWallByLevel.map((a,level)=>({level,uniquePartitionFootprint:a.size})),
  elevations:elevations(volume,proposalCells),roofAesthetic,totals,blockingDiagnostics,
  unresolvedCertifications:[
   'PHYSICAL_EDUCATION_DOOR_AND_STAIR_COLLISION_UNVERIFIED',
   'WINDOW_GLAZING_AND_BED_STATE_UNVERIFIED',
   'EXTERIOR_SIGHTLINES_MATERIALS_AND_ROOF_STAIRCASE_FINISH_UNAPPROVED',
   'ACTUAL_WORLD_STABILITY_AND_WEATHERPROOFING_UNVERIFIED'
  ],
  appearanceReadiness:'CONCEPTUAL_VISUAL_MASSING_ONLY',
  physicallyUsableRoomsCertified:0,buildingFinished:false,buildingConstructionReady:false,
  readability:'LOCAL_COORDINATES_ONLY',proposalAppliedToSource:false,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
}
export function writeArchitecture(x,folder){
 if(x.readiness!=='NOT_PREPARED'||x.executionAllowed!==false||
  x.constructionApproved!==false||x.worldContacts!==0||x.worldCoordinates!==null||
  x.commandCount!==0||x.BuildPlan?.operations?.length!==0||x.gates?.length!==9||
  x.gates.some(g=>g.status!=='BLOCKED'))throw Error('B114_ARCH_REPORT_UNSAFE');
 fs.mkdirSync(folder,{recursive:true});
 const jp=path.join(folder,'B114_HOUSE_V3_Architectural_Overlay_Review_JA.md'),
  json=path.join(folder,'B114_HOUSE_V3_Architectural_Overlay.json');
 fs.writeFileSync(json,JSON.stringify(x,null,2)+'\n');
 const t=x.totals;
 const md=[
  '# HOUSE_V3 — 間仕切り・屋根・外壁の設計オーバーレイ（非施工）','',
  'B105の家具・屋根と、B114の床・階段・廊下を保持した局所設計への追加案。',
  '外壁上端1段の補完、3室の間仕切り4段、ドア用の2段開口、段状屋根の意匠を設計する。','',
  '|監査項目|検出値|','|---|---:|',
  '|追加外壁上端の候補セル|'+t.addedFacadeBandCells+'|',
  '|部屋の間仕切り候補セル|'+t.proposedPartitionWallCells+'|',
  '|間仕切りの最上段（隙間防止）|'+t.upperPartitionSealingCells+'|',
  '|保護されたドア開口セル|'+t.protectedDoorAirCells+'|',
  '|屋根の段状装飾案セル|'+t.proposedRoofTierBlocks+'|',
  '|ドア開口が塞がれる箇所|'+t.doorOpeningObstructions+'|',
  '|間仕切りと廊下の衝突|'+t.newWallBlockedGalleryCells+'|',
  '|間仕切りと階段踏面の衝突|'+t.stairHalfStepClashes+'|',
  '|追加案と既存ボクセルの衝突|'+t.overlapsExistingSourceSolids+'|',
  '|既存屋根のカバー抜け|'+t.missingRoofCapCells+'|','',
  '## 四面の概念外観（E=出入口・W=窓・#=外壁）','',
  ...Object.entries(x.elevations.profiles).flatMap(([k,v])=>[
   '### '+k,'','\`\`\`text',...v,'\`\`\`','']),
  '## 施工認証と未解決事項','',
  ...x.blockingDiagnostics.map(z=>'- '+z),
  ...x.unresolvedCertifications.map(z=>'- '+z),'',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / commandCount=0 / BuildPlan.operations=[]',
  '元の階段形状・外壁・部屋配置を含む既存データは変更しない。'
 ];
 fs.writeFileSync(jp,md.join('\n')+'\n');
 return {json,jp};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const parent=await assembleReferenceParent(),b113=buildB113(parent),b114=buildB114(parent,b113);
 const house=inspectHouse(parent,b113,b114),unified=buildHouseUnified3D(parent,b113,b114,house);
 const result=auditHouseArchitecture(parent,b113,b114,house,unified);
 writeArchitecture(result,path.resolve('b114-review-output'));
 console.log(JSON.stringify({totals:result.totals,blockingDiagnostics:result.blockingDiagnostics,
  roofAesthetic:result.roofAesthetic},null,2));
}