/**
 * HOUSE_V3 conceptual architectural material and fixture finish audit.
 * Geometry-preserving local design study: NO placement, block-state assertions
 * or Minecraft/Education connectivity. Candidate IDs are not compatibility proof.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {buildB114,validateB114} from './compile-b114.mjs';
import {inspectHouse} from './b114-house-v3-integrated.mjs';
import {buildHouseUnified3D,validateHouseUnified3D} from './b114-house-unified-3d.mjs';
import {auditHouseArchitecture} from './b114-house-architecture.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';

const roles=['FOUNDATION','FACADE','GLAZING','ROOF_CAP','ROOF_TIER','STAIR_SUPPORT',
 'STAIR_FINISH','PARTITION','FRAME','LINTEL','DOOR_HEADER','FURNITURE_PROXY'];
const spec=(block,color,reason)=>({candidateBlockFamily:block,visualColor:color,designPurpose:reason,
 educationBlockStateVerified:false,placementReady:false});
export const THEMES=Object.freeze([
 {id:'DAYLIGHT_CEDAR',title:'Daylight Cedar',direction:'Warm contemporary home; light plaster, cedar rhythm and deep-blue roof',recommendedForVisualReview:true,
  roles:{
   FOUNDATION:spec('minecraft:spruce_planks','#a78f70','warm interior walking floor'),
   FACADE:spec('minecraft:white_concrete','#efe8db','continuous pale exterior volume'),
   GLAZING:spec('minecraft:light_blue_stained_glass','#8acdde','restrained azure glazing rhythm'),
   ROOF_CAP:spec('minecraft:deepslate_tiles','#334555','subroof with deep slate surface'),
   ROOF_TIER:spec('minecraft:deepslate_tiles','#3d4c5f','strong sculptural roof tiers'),
   STAIR_SUPPORT:spec('minecraft:spruce_planks','#80654e','contained stair frame'),
   STAIR_FINISH:spec('minecraft:spruce_stairs','#c5a07a','stair finish candidate not physical halfstep equivalent'),
   PARTITION:spec('minecraft:white_concrete','#eee4d8','calm light partition field'),
   FRAME:spec('minecraft:stripped_spruce_log','#a47752','visible vertical timber accents'),
   LINTEL:spec('minecraft:stripped_spruce_log','#ac835b','entry eaves and window headers'),
   DOOR_HEADER:spec('minecraft:spruce_planks','#b3916a','timber room door trim'),
   FURNITURE_PROXY:spec('minecraft:oak_planks','#d1ab7e','existing B105 furniture placeholders only')
  }},
 {id:'NORDIC_STONE',title:'Nordic Stone',direction:'Quiet neutral modern architecture with thin charcoal accents',recommendedForVisualReview:false,
  roles:{
   FOUNDATION:spec('minecraft:polished_andesite','#96999b','hardwearing calm floor'),
   FACADE:spec('minecraft:calcite','#e4e5e4','monolithic pale mineral shell'),
   GLAZING:spec('minecraft:gray_stained_glass','#9ab9c7','light-filtered windows'),
   ROOF_CAP:spec('minecraft:polished_deepslate','#3e4b58','restrained dark roof'),
   ROOF_TIER:spec('minecraft:deepslate_tiles','#52616f','graphic tier silhouette'),
   STAIR_SUPPORT:spec('minecraft:stone_bricks','#7e888d','dense stone structural core'),
   STAIR_FINISH:spec('minecraft:stone_brick_stairs','#a1a9ae','unverified tread replacement candidate'),
   PARTITION:spec('minecraft:smooth_quartz','#e9e6de','light interior partition'),
   FRAME:spec('minecraft:polished_andesite','#7f878f','disciplined facade grid'),
   LINTEL:spec('minecraft:polished_andesite','#828b91','thin mineral eaves'),
   DOOR_HEADER:spec('minecraft:birch_planks','#c3b9a4','quiet doorway warmth'),
   FURNITURE_PROXY:spec('minecraft:birch_planks','#d3c8b0','concept furnishing color only')
  }},
 {id:'BRICK_ATELIER',title:'Brick Atelier',direction:'Rich masonry exterior, warm interior and metal-dark roof',recommendedForVisualReview:false,
  roles:{
   FOUNDATION:spec('minecraft:dark_oak_planks','#76604b','warm durable interior'),
   FACADE:spec('minecraft:bricks','#af7465','strong masonry house identity'),
   GLAZING:spec('minecraft:light_gray_stained_glass','#8db6bd','contrasting cool glass'),
   ROOF_CAP:spec('minecraft:deepslate_tiles','#303841','quiet near-black roof'),
   ROOF_TIER:spec('minecraft:deepslate_tiles','#3e434c','layered masonry silhouette'),
   STAIR_SUPPORT:spec('minecraft:stone_bricks','#79736d','masonry stair core'),
   STAIR_FINISH:spec('minecraft:brick_stairs','#b88a76','stairs concept only, not equivalent to halfstep physics'),
   PARTITION:spec('minecraft:white_terracotta','#ded0bd','soft rendered interior'),
   FRAME:spec('minecraft:dark_oak_log','#67503f','dark timber reveals'),
   LINTEL:spec('minecraft:dark_oak_planks','#72543f','deep timber window and door lintels'),
   DOOR_HEADER:spec('minecraft:dark_oak_planks','#78624e','subtle door return'),
   FURNITURE_PROXY:spec('minecraft:oak_planks','#c7a37f','provisional furnishing')
  }}
]);
const key=p=>p.x+','+p.y+','+p.z;
const position=p=>p.x+','+p.z;
function categorize(v) {
 const a=v.types;
 if(a.includes('STAIR_SUPPORT_PROXY'))return 'STAIR_SUPPORT';
 const first=a[0];
 const look={FLOOR_SLAB_PROXY:'FOUNDATION',FACADE_PANEL_PROXY:'FACADE',
  WINDOW_GLAZING_PROXY:'GLAZING',ROOF_CAP_PROXY:'ROOF_CAP',
  FURNITURE_PLACEHOLDER:'FURNITURE_PROXY'};
 const role=look[first];
 if(!role)throw Error('B114_FINISH_UNKNOWN_SOURCE_ROLE:'+first);
 return role;
}
function overlayRole(v){
 if(v.role==='ROOF_STEPPED_MASSING')return 'ROOF_TIER';
 if(v.role==='FACADE_LINTEL_BAND')return 'LINTEL';
 if(v.role==='ROOM_PARTITION'){
  if(v.semanticMaterialRole==='DOOR_HEADER')return 'DOOR_HEADER';
  if(v.semanticMaterialRole==='WOOD_FRAME_PIER')return 'FRAME';
  return 'PARTITION';
 }
 throw Error('B114_FINISH_UNKNOWN_ADDITION:'+v.role);
}
const e=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rect=(x,y,w,h,c,stroke='none',sw=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const text=(x,y,words,size=16,color='#eaf0f5',weight=500)=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+e(words)+'</text>';
const header=(title,subtitle,w,h,body)=>'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><title>'+e(title)+'</title>'+rect(0,0,w,h,'#0e1826')+text(38,57,title,27,'#f2f4f8',700)+text(40,84,subtitle,13,'#a5bbc9')+body+text(42,h-21,'B114 DESIGN STUDY ONLY  /  NOT_PREPARED  /  9 BLOCKED  /  worldContacts=0',12,'#8fa7ba')+'</svg>\n';
function facadeBoard(v,source){
 const W=1480,H=890,cardW=452,cardH=690,vol=source.volume;
 const faces=vol.facadeFaces.flatMap(f=>f.faces.filter(p=>p.sides.includes('N')));
 const facade=new Set(faces.map(position));
 const columns=faces.map(x=>x.x);
 const min=Math.min(...columns),max=Math.max(...columns);
 const cap=new Set(vol.voxels.filter(p=>p.kind==='ROOF_CAP_PROXY'&&p.y===10).map(position));
 const roof=new Map();
 for(const p of source.roof)roof.set(p.x,Math.max(roof.get(p.x)??10,p.y));
 let body='';
 for(let j=0;j<THEMES.length;j++){
  const theme=THEMES[j],bx=35+j*489,by=122;
  body+=rect(bx,by,cardW,cardH,'#142335','#32475c',1);
  body+=text(bx+22,by+38,theme.title,24,'#f4f0ea',700);
  body+=text(bx+22,by+61,theme.id,12,'#adbecc');
  const gap=Math.max(11,Math.min(18,390/(max-min+1))),sx=x=>bx+28+(x-min)*gap,
   sy=y=>by+415-y*20;
  for(const p of vol.voxels){
   if(!facade.has(position(p))||p.y>10||p.kind==='FURNITURE_PLACEHOLDER')continue;
   const role=p.kind==='WINDOW_GLAZING_PROXY'?'GLAZING':
    p.kind==='EXTERIOR_PORTAL_VOID_PROXY'?null:
    p.kind==='FACADE_PANEL_PROXY'?'FACADE':null;
   if(role)body+=rect(sx(p.x),sy(p.y),gap,20,theme.roles[role].visualColor,'#26394b',.45);
  }
  for(const p of source.band)if(facade.has(position(p)))
   body+=rect(sx(p.x),sy(p.y),gap,20,theme.roles.LINTEL.visualColor,'#26394b',.5);
  for(const [x,y] of roof)if(x>=min&&x<=max&&cap.has(x+','+faces[0].z)===false){
   // Side silhouette uses roof tiers for conceptual projection; no actual visibility/occlusion.
   for(let yy=11;yy<=y;yy++)body+=rect(sx(x),sy(yy),gap,20,theme.roles.ROOF_TIER.visualColor,'#26394b',.45);
  }
  const swatches=['FACADE','FRAME','GLAZING','ROOF_TIER','FOUNDATION','PARTITION'];
  swatches.forEach((role,i)=>{
   const x=bx+23+(i%3)*146,y=by+473+Math.floor(i/3)*77;
   body+=rect(x,y,30,30,theme.roles[role].visualColor);
   body+=text(x+39,y+20,role,11,'#e6eef6');
  });
  body+=text(bx+23,by+655,theme.recommendedForVisualReview?'PRIMARY DESIGN DIRECTION':'ALTERNATE STUDY',13,
   theme.recommendedForVisualReview?'#82dcc6':'#a6b8ca',700);
 }
 return header('HOUSE_V3 / THREE FACADE MATERIAL DIRECTIONS',
  'Conceptual elevation projection, source B105 windows + B114 roof/facade; not an approved 3D render',W,H,body);
}
function interiorBoard(rooms,theme) {
 const W=1500,H=830,cardW=455,cardH=622;
 let body='';
 rooms.forEach((room,i)=>{
  const bx=30+i*493,by=121,r=room.roomRectangle;
  body+=rect(bx,by,cardW,cardH,'#142335','#32475c',1);
  body+=text(bx+24,by+35,'LEVEL '+room.level+' / '+room.roomId,20,'#f1f5f8',700);
  body+=text(bx+24,by+58,'Furniture '+room.fixtures.length+' / '+(room.offlineClear?'clear':'review'),12,'#b1c3d0');
  const sc=Math.min(27,Math.floor(350/Math.max(r.width,r.depth)));
  const ox=bx+44,oy=by+98;
  const occupied=new Map();
  for(const f of room.fixtures)for(const p of f.footprint)occupied.set(position(p),f.role);
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const bound=x===r.x||x===r.x+r.width-1||z===r.z||z===r.z+r.depth-1;
   const role=occupied.get(x+','+z);
   const fill=role?theme.roles.FURNITURE_PROXY.visualColor:
    bound?theme.roles.PARTITION.visualColor:theme.roles.FOUNDATION.visualColor;
   body+=rect(ox+(x-r.x)*sc,oy+(z-r.z)*sc,sc,sc,fill,'#253747',.7);
  }
  const door=room.door;
  body+=rect(ox+(door.x-r.x)*sc+3,oy+(door.z-r.z)*sc+3,sc-6,sc-6,'#74dfad');
  for(const f of room.fixtures){
   body+=text(bx+25,by+485+(f.index%4)*25,f.role.toUpperCase()+
    ' | '+f.candidateBlockFamilies.join(' + '),11,'#c7d8e3');
  }
  body+=text(bx+24,by+591,'State and interaction UNVERIFIED',12,'#ffcf89');
 });
 return header('HOUSE_V3 / THREE ROOM FUNCTION BOARDS',
  'B113 furniture footprints and source doors; B105 proxy shapes are not equivalent to actual furniture',W,H,body);
}
export function buildFinishStudy(parent,b113,b114,house,unified,architecture){
 if(!validateB113(b113)||!validateB114(b114)||!validateHouseUnified3D(unified)||
  house.id!=='HOUSE_V3'||architecture?.id!=='HOUSE_V3'||
  architecture.constructionApproved!==false||architecture.worldContacts!==0||
  architecture.sourceB114Integrity!==b114.integritySha256||
  architecture.sourceUnifiedDigest!==unified.integritySha256||
  architecture.gates.length!==9||architecture.gates.some(g=>g.status!=='BLOCKED'))
  throw Error('B114_FINISH_UNSAFE_REFERENCES');
 const design=parent.sourceDesigns.find(x=>x.candidateId==='HOUSE_V3');
 const c113=b113.cases.find(x=>x.id==='HOUSE_V3');
 if(!design||!c113||c113.rooms.length!==3)throw Error('B114_FINISH_INVALID_ROOM_SOURCE');
 const volume=generateB105(design),qa=auditB105(volume,design.plan);
 if(qa.issueCount||qa.envelopeConflicts)throw Error('B114_FINISH_B105_PARENT_FAILED');
 for(const theme of THEMES){
  const declared=Object.keys(theme.roles).sort().join();
  if(declared!==[...roles].sort().join()||Object.values(theme.roles).some(m=>
   !m.candidateBlockFamily.startsWith('minecraft:')||m.educationBlockStateVerified!==false||
   m.placementReady!==false))
   throw Error('B114_FINISH_PALETTE_UNSAFE_OR_INCOMPLETE');
 }
 const assignments=[],coordinates=new Set();
 const emit=(v,role,sourceRole)=>{
  const k=key(v);
  if(coordinates.has(k))throw Error('B114_FINISH_NEW_SOLID_OVERLAP:'+k);
  coordinates.add(k);
  assignments.push({x:v.x,y:v.y,z:v.z,finishRole:role,sourceRole,
   blockIdAssigned:false,blockStates:null,designOnly:true});
 };
 for(const v of unified.candidateSolids)emit(v,categorize(v),v.types.join('+'));
 for(const v of architecture.addedElements)emit(v,overlayRole(v),v.role+':'+v.semanticMaterialRole);
 const counts=Object.fromEntries(roles.map(role=>[role,assignments.filter(v=>v.finishRole===role).length]));
 counts.STAIR_FINISH=unified.stairHalfStepAABBs.length;
 const b105Furniture=volume.voxels.filter(v=>v.kind==='FURNITURE_PLACEHOLDER');
 const rooms=c113.rooms.map(a=>{
  const f=design.plan.floors[a.level],r=f.rooms.find(x=>x.id===a.roomId);
  if(!r||!a.door||a.door.executable!==false)throw Error('B114_FINISH_INVALID_ROOM_DOOR');
  const proxy=b105Furniture.filter(v=>v.owner===a.level+':'+a.roomId);
  const sourceProxy=new Set(proxy.map(position));
  const actual=new Set(a.fixtures.flatMap(v=>v.footprint.map(position)));
  const intersection=[...actual].filter(k=>sourceProxy.has(k)).length;
  return {roomId:a.roomId,level:a.level,roomRectangle:{x:r.x,z:r.z,width:r.width,depth:r.depth},
   door:{x:r.conceptualDoorOpening.x,z:r.conceptualDoorOpening.z,
    side:r.conceptualDoorOpening.side,candidateBlockFamily:'minecraft:spruce_door',
    upperLowerStateMappingVerified:false,airSpaceReserved:true},
   fixtures:a.fixtures.map((fixture,index)=>({index,role:fixture.role,
    footprint:fixture.footprint,interactSideCandidates:fixture.interactionApproaches.length,
    candidateBlockFamilies:fixture.recipe.materials,
    actualBedOrStorageUseVerified:false,orientationStateAssigned:false})),
   offlineClear:a.offlineOccupancyClear,physicalRoomUsabilityCertified:false,
   b105ProxyCount:proxy.length,b113ActualFootprintCells:actual.size,
   matchingProxyFootprints:intersection,proxyDisagreementExpected:true,
   sourceAnchorsPreserved:a.sourceAnchorsPreserved};
 });
 const missingRoles=assignments.filter(p=>!THEMES[0].roles[p.finishRole]).length;
 const doorCellSet=new Set(architecture.protectedDoors.flatMap(d=>d.airAtY.map(y=>d.x+','+y+','+d.z)));
 const doorObstructions=assignments.filter(v=>doorCellSet.has(key(v)));
 const stairs=unified.stairHalfStepAABBs.map(v=>({stair:v.stair,proxyAABB:v.box,
  finishRole:'STAIR_FINISH',minecraftCollisionVerified:false,recipeExecutable:false}));
 const facade=volume.facadeFaces.map(f=>({level:f.level,windowFaces:f.faces.filter(v=>v.glazed).length,
  exitFaceCount:f.faces.filter(v=>v.opening).length}));
 const report={
  schema:'minecraftaibuilder-b114-finish-study-offline-v1',id:'HOUSE_V3',
  sourceB114Integrity:b114.integritySha256,sourceUnifiedDigest:unified.integritySha256,
  primaryStyle:'DAYLIGHT_CEDAR',styleCandidates:THEMES,roleCounts:counts,
  assignmentCounts:{sourceSolidCells:unified.candidateSolids.length,
   architectureAddedCells:architecture.addedElements.length,
   totalNonOverlappingCellAssignments:assignments.length,
   stairHalfStepProxies:stairs.length,unmappedRoles:missingRoles,
   blockedReservedDoorCells:doorObstructions.length,
   sourceSourceCollisions:unified.totals.solidVoxelRoleConflicts,
   additionalArchitecturalCollisions:architecture.totals.overlapsExistingSourceSolids},
  coordinateLedger:assignments,stairFinishes:stairs,rooms,facade,
  proxyActualFurnitureDifferenceNotAnError:true,
  visualMockupsHumanApproved:false,educationEditionVersionVerified:false,
  noClaimOfFunctionalFurniture:true,roofWeatherproofCertified:false,
  unresolved:[
   'PHYSICAL_STAIRS_HALF_STEP_FINAL_LANDING_UNVERIFIED',
   'MINECRAFT_EDUCATION_BLOCK_PALETTE_AND_STATES_UNVERIFIED',
   'DOOR_HINGE_OPENING_AND_BED_SLEEP_INTERACTION_UNVERIFIED',
   'MATERIAL_STYLE_AND_RENDERING_NOT_APPROVED'
  ],
  sourceChangesApplied:false,materializedMinecraftBlocks:0,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,gates:b114.gates.map(x=>({...x})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(missingRoles||doorObstructions.length||rooms.some(r=>!r.offlineClear))report.reviewRequired=true;
 else report.reviewRequired=false;
 return {report,source:{volume,band:architecture.addedElements.filter(v=>v.role==='FACADE_LINTEL_BAND'),
   roof:architecture.addedElements.filter(v=>v.role==='ROOF_STEPPED_MASSING')}};
}
export function writeFinishStudy(output,dir){
 const {report,source}=output;
 if(report.readiness!=='NOT_PREPARED'||report.constructionApproved!==false||
  report.executionAllowed!==false||report.worldContacts!==0||
  report.worldCoordinates!==null||report.commandCount!==0||
  report.gates.length!==9||report.gates.some(x=>x.status!=='BLOCKED')||
  report.BuildPlan.operations.length!==0||report.materializedMinecraftBlocks!==0)
  throw Error('B114_FINISH_OUTPUT_UNSAFE');
 fs.mkdirSync(dir,{recursive:true});
 const manifest=path.join(dir,'B114_HOUSE_V3_Finish_Study.json'),
  facade=path.join(dir,'B114_HOUSE_V3_Facade_Material_Options.svg'),
  rooms=path.join(dir,'B114_HOUSE_V3_Interior_Options.svg'),
  readme=path.join(dir,'B114_HOUSE_V3_Finish_Review_JA.md');
 fs.writeFileSync(manifest,JSON.stringify(report,null,2)+'\n');
 const sheets=[{path:facade,svg:facadeBoard(report,source)},
  {path:rooms,svg:interiorBoard(report.rooms,THEMES[0])}];
 for(const s of sheets){
  if(!s.svg.startsWith('<svg ')||/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(s.svg))
   throw Error('B114_FINISH_UNSAFE_SVG');
  fs.writeFileSync(s.path,s.svg);
 }
 const t=report.assignmentCounts;
 const summary=[
  '# HOUSE_V3 — 素材・外観・室内の仕上げレビュー（非施工）','',
  '主案: Daylight Cedar（白い壁＋木目アクセント＋濃色の段状屋根）。',
  '比較案: Nordic Stone / Brick Atelier。図面は立体的な実機スクリーンショットではない。','',
  '|項目|値|','|---|---:|',
  '|元ソリッド占有セル|'+t.sourceSolidCells+'|',
  '|今回前工程の建築追加セル|'+t.architectureAddedCells+'|',
  '|重複しない仕上げ割当対象セル|'+t.totalNonOverlappingCellAssignments+'|',
  '|階段半段差候補|'+t.stairHalfStepProxies+'|',
  '|未分類の素材ロール|'+t.unmappedRoles+'|',
  '|保護ドア開口の塞がれたセル|'+t.blockedReservedDoorCells+'|',
  '|実機でブロック・家具機能を認証した数|0|','',
  '## 各室の実占有候補と表示用家具の違い',
  ...report.rooms.map(r=>'- L'+r.level+' '+r.roomId+': B113設備'+r.fixtures.length+
    '点、設備占有'+r.b113ActualFootprintCells+'セル、B105表示用プロキシ'+r.b105ProxyCount+
    'セル。双方の位置が異なってもB105は旧表示であり、施工可能とは見なさない。'),
  '',
  '## 未認証の重要条件',
  ...report.unresolved.map(v=>'- '+v),
  '',
  '各minecraft:*はデザイン段階の候補IDにすぎず、Educationでの使用可否やBlockStateを確認していない。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ];
 fs.writeFileSync(readme,summary.join('\n')+'\n');
 return {manifest,facade,rooms,readme};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const parent=await assembleReferenceParent(),b113=buildB113(parent),b114=buildB114(parent,b113);
 const house=inspectHouse(parent,b113,b114);
 const unified=buildHouseUnified3D(parent,b113,b114,house);
 const arch=auditHouseArchitecture(parent,b113,b114,house,unified);
 const output=buildFinishStudy(parent,b113,b114,house,unified,arch);
 writeFinishStudy(output,path.resolve('b114-review-output'));
 console.log(JSON.stringify({counts:output.report.assignmentCounts,rooms:output.report.rooms.map(r=>({id:r.roomId,level:r.level,fixtures:r.fixtures.length})),reviewRequired:output.report.reviewRequired},null,2));
}