/**
 * B114 offline-only authoritative fixture-footprint reconciliation.
 * Replaces B105 furniture display proxies with B113 source-pinned fixture footprints
 * ONLY in a local design overlay. No actual blocks, states, world contacts or commands.
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
import {intersects,K} from '../../b113/main/b113-geometry.mjs';

const key=p=>p.x+','+p.y+','+p.z;
const k2=p=>p.x+','+p.z;
const box=p=>({x:p.x,y:p.y,z:p.z,width:1,height:1,depth:1});
const sort=(a,b)=>a.level-b.level||a.z-b.z||a.x-b.x||a.y-b.y;
const within=(r,p)=>p.x>r.x&&p.x<r.x+r.width-1&&p.z>r.z&&p.z<r.z+r.depth-1;
function sameSet(a,b){const x=new Set(a),y=new Set(b);return x.size===y.size&&[...x].every(v=>y.has(v));}
function roomProposals(design,b113Case,volume,extra){
 const roomData=[],sourceFurniture=volume.voxels.filter(v=>v.kind==='FURNITURE_PLACEHOLDER');
 const sourceFurnitureByOwner=new Map();
 for(const v of sourceFurniture){
  const o=sourceFurnitureByOwner.get(v.owner)??[];
  o.push(v);sourceFurnitureByOwner.set(v.owner,o);
 }
 const permanent=volume.voxels.filter(v=>v.kind!=='FURNITURE_PLACEHOLDER');
 const basePermanent=new Set(permanent.map(key));
 const roomReferences=new Map(b113Case.rooms.map(r=>[r.level+':'+r.roomId,r]));
 const designRoomIds=new Set();
 const newCellOwners=new Map(),clashes=[];
 const removed=[],added=[],unreconciled=[];
 for(const floor of design.plan.floors)for(const room of floor.rooms){
  const id=floor.level+':'+room.id;
  designRoomIds.add(id);
  const source=roomReferences.get(id);
  if(!source||source.roomId!==room.id||source.level!==floor.level)
   throw Error('B114_FIXTURE_MISSING_SOURCE_ROOM:'+id);
  const old=sourceFurnitureByOwner.get(id)??[];
  const frame={
   level:floor.level,roomId:room.id,roomKey:id,roomRectangle:{
    x:room.x,z:room.z,width:room.width,depth:room.depth},
   entrance:{x:room.conceptualDoorOpening.x,z:room.conceptualDoorOpening.z},
   sourceB105DisplayProxyCells:old.map(v=>({x:v.x,y:v.y,z:v.z})),
   originalB105ProxyCount:old.length,
   sourceB113Fixtures:source.fixtures.length,
   originalB113FootprintCount:source.fixtures.reduce((n,f)=>n+f.footprint.length,0),
   b113OccupancyClear:source.offlineOccupancyClear,
   sourceAnchorsPreserved:source.sourceAnchorsPreserved,
   physicalInteractionCertified:false,replaceSourceFiles:false,
   visualReviewRequired:false,provisionalFullReplacement:false,
   candidateFixtures:[],replacedOldProxyCells:[],newLocalOccupancyCells:[],
   reviewProblems:[]};
  if(!source.offlineOccupancyClear||!source.sourceAnchorsPreserved)
   frame.reviewProblems.push('B113_UNRESOLVED_ROOM_OCCUPANCY');
  const approvedWithinSource=[];
  const local=new Set();
  for(const f of source.fixtures){
   const h=f.recipe?.height,cells=f.recipe?.cells;
   if(!Number.isInteger(h)||h<1||h>3||cells!==f.footprint.length)
    frame.reviewProblems.push('FIXTURE_DIMENSION_UNVERIFIED:'+f.fixtureIndex);
   if(f.physicallyUsableCertified!==false||f.materialStatesAssigned!==false)
    throw Error('B114_FIXTURE_UNEXPECTED_GAME_CERTIFICATION');
   const footprint=[];
   for(const p of f.footprint){
    if(!Number.isInteger(p.x)||!Number.isInteger(p.z)||!within(room,p)||
     floor.footprintRows[p.z]?.[p.x]!=='1')
     frame.reviewProblems.push('FIXTURE_OUTSIDE_SUPPORTED_ROOM:'+f.fixtureIndex);
    const height=Number.isInteger(h)&&h>0&&h<=3?h:0;
    for(let dy=1;dy<=height;dy++){
     const voxel={x:p.x,y:floor.level*5+dy,z:p.z,level:floor.level,
      owner:id,fixtureIndex:f.fixtureIndex,fixtureRole:f.role,
      conceptualOccupancyOnly:true,minecraftBlockId:null,realBlockStateVerified:false};
     const k=key(voxel);
     if(local.has(k))frame.reviewProblems.push('INTERSECTING_FIXTURE_CELLS:'+k);
     local.add(k);footprint.push(voxel);
     if(basePermanent.has(k))frame.reviewProblems.push('B105_PERMANENT_SOLID_CLASH:'+k);
     if(extra?.solidKeys?.has(k))frame.reviewProblems.push('B114_ARCHITECTURAL_SOLID_CLASH:'+k);
     if(extra?.stairBoxes?.some(b=>intersects(box(voxel),b)))
      frame.reviewProblems.push('B114_STAIR_TREAD_CLASH:'+k);
     if(extra?.doorAir?.has(k))frame.reviewProblems.push('BLOCKED_PROTECTED_DOOR_AIR:'+k);
     if(extra?.passageCells?.[floor.level]?.has(k2(voxel)))
      frame.reviewProblems.push('BLOCKED_GALLERY_CELL:'+k);
    }
   }
   frame.candidateFixtures.push({
    index:f.fixtureIndex,role:f.role,sourceAnchor:f.anchor,
    groundFootprint:f.footprint,occupiedCells:footprint,
    candidateBlockFamilies:f.recipe.materials,
    interactionApproachCells:f.interactionApproaches.length,
    physicalUseCertified:false,actualBlockStatesAssigned:false});
   if(f.interactionApproaches.length===0)
    frame.reviewProblems.push('NO_FURNITURE_INTERACTION_APPROACH:'+f.fixtureIndex);
   approvedWithinSource.push(...footprint);
  }
  frame.reviewProblems=[...new Set(frame.reviewProblems)];
  if(frame.reviewProblems.length===0){
   frame.provisionalFullReplacement=true;
   frame.replacedOldProxyCells=old.map(v=>({x:v.x,y:v.y,z:v.z}));
   frame.newLocalOccupancyCells=approvedWithinSource;
   removed.push(...frame.replacedOldProxyCells.map(v=>({...v,roomKey:id})));
   for(const v of approvedWithinSource){
    const k=key(v),prior=newCellOwners.get(k);
    if(prior)clashes.push({cell:k,first:prior,second:id});
    newCellOwners.set(k,id);added.push(v);
   }
  }else unreconciled.push(id);
  frame.visualReviewRequired=frame.originalB105ProxyCount!==frame.originalB113FootprintCount||
   !sameSet(old.map(k2),source.fixtures.flatMap(f=>f.footprint.map(k2)))||
   frame.reviewProblems.length>0;
  roomData.push(frame);
 }
 if(designRoomIds.size!==roomReferences.size||
  [...sourceFurnitureByOwner.keys()].some(x=>!designRoomIds.has(x)))
  throw Error('B114_FIXTURE_B105_B113_ROOM_SOURCE_MISMATCH');
 const remainingOldProxy=sourceFurniture.filter(v=>!removed.some(p=>key(p)===key(v)));
 const overlayCells=[...permanent.map(v=>({x:v.x,y:v.y,z:v.z,kind:v.kind,source:'B105'})),
  ...remainingOldProxy.map(v=>({x:v.x,y:v.y,z:v.z,kind:'UNRECONCILED_B105_DISPLAY_ONLY',source:'B105'})),
  ...added.map(v=>({x:v.x,y:v.y,z:v.z,kind:'B113_FIXTURE_CONCEPT_ONLY',source:'B113'}))];
 const allKeys=new Set(overlayCells.map(key));
 if(allKeys.size!==overlayCells.length)clashes.push({kind:'OVERLAY_DUPLICATE_SOLID_KEY'});
 const total={rooms:roomData.length,replacedRooms:roomData.filter(x=>x.provisionalFullReplacement).length,
  unreconciledRooms:unreconciled.length,
  sourceDisplayProxies:sourceFurniture.length,
  obsoleteDisplayProxiesRemoved:removed.length,
  b113FixtureSourceCount:roomData.reduce((n,r)=>n+r.sourceB113Fixtures,0),
  newB113FurnitureBodyCells:added.length,
  retainedHeldSourceProxies:remainingOldProxy.length,
  finalLocalSolidCells:overlayCells.length,
  visualReviewRooms:roomData.filter(r=>r.visualReviewRequired).length,
  staticGeometryClashes:clashes.length,
  realInteractionCertifiedRooms:0,worldContacts:0,constructionCommands:0};
 return {id:b113Case.id,typology:b113Case.typology,floors:design.plan.floors.length,
  sourceIntegrityDigest:b113Case.source.b111Digest,
  rooms:roomData,totals:total,clashes,unreconciled,
  localOverlay:overlayCells,removedDisplayProxies:removed,addedFurnitureBodies:added,
  sourceFilesChanged:false,physicalBlockStateCertified:false};
}
export function reconcileAll(parent,b113,b114,house,unified,arch){
 if(!validateB113(b113)||!validateB114(b114)||
  !validateHouseUnified3D(unified)||house.id!=='HOUSE_V3'||arch.id!=='HOUSE_V3'||
  arch.sourceB114Integrity!==b114.integritySha256||
  arch.sourceUnifiedDigest!==unified.integritySha256||
  house.sourceB114Integrity!==b114.integritySha256)
  throw Error('B114_FIXTURE_UNSAFE_SOURCE');
 const reports=[];
 for(const c of b113.cases){
  const design=parent.sourceDesigns.find(d=>d.candidateId===c.id);
  if(!design)throw Error('B114_FIXTURE_MISSING_CASE_DESIGN:'+c.id);
  const vol=generateB105(design),audit=auditB105(vol,design.plan);
  if(audit.issueCount||audit.envelopeConflicts)throw Error('B114_FIXTURE_B105_AUDIT_FAILED:'+c.id);
  let extra=null;
  if(c.id==='HOUSE_V3'){
   const solidKeys=new Set([
    ...unified.candidateSolids.filter(v=>!v.types.includes('FURNITURE_PLACEHOLDER')).map(key),
    ...arch.addedElements.map(key)
   ]);
   const doorAir=new Set(arch.protectedDoors.flatMap(d=>d.airAtY.map(y=>
    key({x:d.x,y,z:d.z}))));
   const passageCells=design.plan.floors.map((f,i)=>new Set([
    ...f.gallery.map(K),...c.horizontalRoutes[i].repair.addedCells.map(K),
    ...house.gallery.twoWideDetours[i].addedCells
   ]));
   extra={solidKeys,doorAir,passageCells,
    stairBoxes:unified.stairHalfStepAABBs.map(x=>x.box)};
  }
  reports.push(roomProposals(design,c,vol,extra));
 }
 if(reports.length!==15||reports.reduce((n,x)=>n+x.totals.rooms,0)!==279||
  !reports.some(r=>r.id==='HOUSE_V3'))throw Error('B114_FIXTURE_UNEXPECTED_REVIEW_SCOPE');
 const sum=k=>reports.reduce((n,r)=>n+r.totals[k],0);
 const houseReport=reports.find(r=>r.id==='HOUSE_V3');
 const totals={buildings:reports.length,rooms:sum('rooms'),
  replacedRooms:sum('replacedRooms'),unreconciledRooms:sum('unreconciledRooms'),
  sourceDisplayProxies:sum('sourceDisplayProxies'),
  obsoleteDisplayProxiesRemoved:sum('obsoleteDisplayProxiesRemoved'),
  proposedB113FixtureOccupancyCells:sum('newB113FurnitureBodyCells'),
  heldDisplayProxyCells:sum('retainedHeldSourceProxies'),
  reportsWithStaticClashes:reports.filter(r=>r.totals.staticGeometryClashes>0).length,
  visualReviewRooms:sum('visualReviewRooms'),
  houseReplacedRooms:houseReport.totals.replacedRooms,
  houseUnreconciledRooms:houseReport.totals.unreconciledRooms,
  physicallyCertifiedRoomCount:0,worldContacts:0,constructionCommands:0};
 return {schema:'minecraftaibuilder-b114-furniture-concept-reconciliation-v1',
  sourceB114Integrity:b114.integritySha256,
  sourceUnifiedDigest:unified.integritySha256,
  sourceB113Integrity:b113.integritySha256,
  directSourceMutation:false,
  educationBedOrientationAndDoorStateVerified:false,
  recipePaletteVersionUnverified:true,
  reviewRequired:sum('visualReviewRooms')>0||sum('unreconciledRooms')>0,
  noAutomaticPromotionOfHeldRooms:true,
  reports,totals,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
}
const e=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rect=(x,y,w,h,c,stroke='none',sw=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'" stroke="'+stroke+'" stroke-width="'+sw+'"/>';
const label=(x,y,str,size=14,color='#eaf2f8',weight=500)=>'<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+e(str)+'</text>';
function furnitureBoard(house){
 const W=1480,H=730,scale=28,body=[];
 for(const [i,room] of house.rooms.entries()){
  const bx=34+i*487,by=135,r=room.roomRectangle;
  body.push(rect(bx,by,460,522,'#17283a','#415368',1));
  body.push(label(bx+20,by+34,'LEVEL '+room.level+' / '+room.roomId,21,'#eff4f8',700));
  body.push(label(bx+20,by+58,'B105 proxy '+room.originalB105ProxyCount+
   ' cells  →  B113 '+room.originalB113FootprintCount+' cells',12,'#adc4d4'));
  const ox=bx+44,oy=by+94;
  const newMap=new Map(room.candidateFixtures.flatMap(f=>f.groundFootprint.map(p=>
   [k2(p),f.role])));
  const oldMap=new Set(room.sourceB105DisplayProxyCells.map(k2));
  for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++){
   const edge=x===r.x||x===r.x+r.width-1||z===r.z||z===r.z+r.depth-1;
   const fill=edge?'#cadce7':'#56717f';
   body.push(rect(ox+(x-r.x)*scale,oy+(z-r.z)*scale,scale,scale,fill,'#253849',.8));
   const k=x+','+z;
   if(oldMap.has(k)){
    const xx=ox+(x-r.x)*scale,yy=oy+(z-r.z)*scale;
    body.push(rect(xx+5,yy+5,scale-10,scale-10,'none','#d7667b',2));
    body.push('<path d="M'+(xx+6)+' '+(yy+6)+' l'+(scale-12)+' '+(scale-12)+
     ' M'+(xx+scale-6)+' '+(yy+6)+' l-'+(scale-12)+' '+(scale-12)+
     '" stroke="#d7667b" stroke-width="2"/>');
   }
   if(newMap.has(k)){
    const color=newMap.get(k)==='bed'?'#f6c478':'#9dcba9';
    body.push(rect(ox+(x-r.x)*scale+3,oy+(z-r.z)*scale+3,scale-6,scale-6,color,'#283444',1));
   }
  }
  const d=room.entrance;
  body.push(rect(ox+(d.x-r.x)*scale+6,oy+(d.z-r.z)*scale+6,scale-12,scale-12,'#65d6b1'));
  body.push(label(bx+20,by+394,'Beds / seating: '+room.sourceB113Fixtures+
   ' • Geometry-only review',12,'#c9d5e0'));
  body.push(label(bx+20,by+423,room.provisionalFullReplacement?
   'Display-proxy replacement: PROPOSED':'HOLD • fixture review required',12,
   room.provisionalFullReplacement?'#89dfc2':'#f2ab99',700));
  body.push(label(bx+20,by+468,'Amber = B113 fixture footprints',11,'#f6c478'));
  body.push(label(bx+20,by+491,'Red X = obsolete B105 display proxies',11,'#e18b9c'));
 }
 const text=label(35,55,'HOUSE_V3 / FURNITURE SOURCE RECONCILIATION',26,'#eef4f8',700)+
 label(36,83,'B105 old display versus B113 supported fixture footprints • local coordinates only • NOT a real-world Minecraft preview',13,'#aec3d3')+
 body.join('')+label(36,H-22,'NOT_PREPARED / 9 BLOCKED / no Education interaction verified / worldContacts=0',12,'#9eb8c8');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+
 '" viewBox="0 0 '+W+' '+H+'"><title>HOUSE_V3 source-provenance furniture replacement review</title>'+
 rect(0,0,W,H,'#0c1826')+text+'</svg>\n';
}
export function writeFurnitureReview(report,dir){
 if(report.readiness!=='NOT_PREPARED'||report.constructionApproved!==false||
  report.executionAllowed!==false||report.worldContacts!==0||
  report.worldCoordinates!==null||report.commandCount!==0||
  report.BuildPlan?.operations?.length!==0||report.gates?.length!==9||
  report.gates.some(g=>g.status!=='BLOCKED'))throw Error('B114_FURNITURE_REVIEW_UNSAFE');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_Furniture_Reconciliation_15_Buildings.json'),
  md=path.join(dir,'B114_Furniture_Reconciliation_Review_JA.md'),
  svg=path.join(dir,'B114_HOUSE_V3_Furniture_Reconciled.svg');
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n');
 const h=report.reports.find(r=>r.id==='HOUSE_V3'),picture=furnitureBoard(h);
 if(/<script|<foreignObject|(?:xlink:)?href=|javascript:/i.test(picture))
  throw Error('B114_FURNITURE_UNSAFE_IMAGE');
 fs.writeFileSync(svg,picture);
 const t=report.totals;
 fs.writeFileSync(md,[
  '# B114 — B105旧表示とB113家具候補の統合（非施工）','',
  'B105表示専用家具を、B113の元アンカー・実占有候補に差し替えた局所設計オーバーレイ。',
  '元のB105・B113・B111ソースを編集していない。Minecraft実機への接続・操作なし。','',
  '|結果|件数|','|---|---:|',
  '|評価した建物|'+t.buildings+'|',
  '|評価した部屋|'+t.rooms+'|',
  '|配置案を生成できる部屋|'+t.replacedRooms+'|',
  '|B113の室内未解決等による保留|'+t.unreconciledRooms+'|',
  '|旧B105表示用家具セル|'+t.sourceDisplayProxies+'|',
  '|案から除外した旧家具表示セル|'+t.obsoleteDisplayProxiesRemoved+'|',
  '|新B113家具代理の占有ボクセル|'+t.proposedB113FixtureOccupancyCells+'|',
  '|保留室でそのまま残す旧表示|'+t.heldDisplayProxyCells+'|',
  '|位置・表示の目視再確認が必要な室|'+t.visualReviewRooms+'|',
  '|HOUSE_V3で差し替えた部屋|'+t.houseReplacedRooms+' / 3|',
  '|3D静的干渉が残る建物|'+t.reportsWithStaticClashes+'|','',
  '## 未解決室',
  ...report.reports.flatMap(b=>b.rooms.filter(r=>!r.provisionalFullReplacement).
   map(r=>'- '+b.id+' / L'+r.level+' / '+r.roomId+': '+r.reviewProblems.join(', '))),
  '',
  '今回の「差し替え」は読み取り専用のローカル3Dデータだけ。家具実配置・ベッド睡眠・ドア操作・Education版BlockState・美観は認証していない。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,md,svg};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const parent=await assembleReferenceParent(),b113=buildB113(parent),b114=buildB114(parent,b113);
 const house=inspectHouse(parent,b113,b114),unified=buildHouseUnified3D(parent,b113,b114,house);
 const arch=auditHouseArchitecture(parent,b113,b114,house,unified);
 const result=reconcileAll(parent,b113,b114,house,unified,arch);
 console.log(JSON.stringify({totals:result.totals,output:writeFurnitureReview(result,path.resolve('b114-review-output'))},null,2));
}