/** HOUSE_V3 offline-only integrated building candidate; NEVER world placement. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
import {buildB114,validateB114} from './compile-b114.mjs';
import {generateB105,auditB105} from '../../b105/main/b105-building-volume.mjs';
import {K,neighbors,reachable,straightFlight,intersects} from '../../b113/main/b113-geometry.mjs';
const cube=(p,y,h=1)=>({x:p.x,y,z:p.z,width:1,height:h,depth:1});
const overlaps=(a,b)=>a.some(x=>b.some(y=>intersects(x,y)));
const floorCells=f=>{let a=[];for(let z=0;z<f.footprintRows.length;z++)
 for(let x=0;x<f.footprintRows[z].length;x++)if(f.footprintRows[z][x]==='1')a.push({x,z});
 return a;};
const hasFloor=(f,p)=>f.footprintRows[p.z]?.[p.x]==='1';
const ordered=a=>[...new Map(a.map(x=>[K(x),x])).values()].sort((a,b)=>a.z-b.z||a.x-b.x);
function lift(b,stair){
 const {x,z}=stair.selected.origin,{dx,dz}=stair.selected.ascent;
 const c=[[b.x,b.z],[b.x+b.width,b.z],[b.x,b.z+b.depth],[b.x+b.width,b.z+b.depth]]
  .map(([a,d])=>[x+dx*a-dz*d,z+dz*a+dx*d]);
 const xx=c.map(p=>p[0]),zz=c.map(p=>p[1]);
 return {x:Math.min(...xx),y:stair.fromLevel*5+1+b.y,z:Math.min(...zz),
  width:Math.max(...xx)-Math.min(...xx),height:b.height,depth:Math.max(...zz)-Math.min(...zz)};
}
function bodies(f){
 return f.samples.flatMap((p,i)=>{
  const a={x:p.x-0.3,y:p.y,z:p.z-0.3,width:0.6,height:2,depth:0.6};
  if(!i)return [a];const b=f.samples[i-1];
  return [a,{x:Math.min(b.x,p.x)-0.3,y:Math.min(b.y,p.y),
   z:Math.min(b.z,p.z)-0.3,width:Math.abs(b.x-p.x)+0.6,
   height:Math.abs(b.y-p.y)+2,depth:Math.abs(b.z-p.z)+0.6}];
 });
}
function stairModel(link,i,flight,floors,foreign){
 if(!link.selected||link.selected.cells.length!==14)throw Error('HOUSE_UNRESERVED_FLIGHT');
 const body=bodies(flight).map(b=>lift(b,link));
 const solids=flight.solids.map(b=>lift(b,link));
 const supports=flight.supports.map(b=>lift(b,link));
 const lo=floors[link.fromLevel],hi=floors[link.toLevel];
 // The upper landing is a required supporting floor block, not a shaft hole.
 // Wide AABB sweeps can overlap it during the final half-step transition.
 // Keep it and mark transition collision as UNKNOWN pending real Education physics.
 const upperLandingSet=new Set(link.selected.upperLanding.map(K));
 const aperture=ordered(floorCells(hi).filter(p=>
  !upperLandingSet.has(K(p))&&body.some(b=>intersects(b,cube(p,hi.level*5)))));
 const required=new Set(aperture.map(K));
 const residualSlabCollisions=floors.flatMap(f=>floorCells(f).filter(p=>
  (f.level!==hi.level||!required.has(K(p)))&&
  !(f.level===hi.level&&upperLandingSet.has(K(p)))&&
  body.some(b=>intersects(b,cube(p,f.level*5))))
  .map(p=>({level:f.level,x:p.x,z:p.z})));
 const modelledFinalStepFloorOverlap=link.selected.upperLanding.filter(p=>
  body.some(b=>intersects(b,cube(p,hi.level*5)))).length;
 const foreignVolumeCollisions=foreign.filter(b=>body.some(o=>intersects(o,b)))
  .map(p=>({kind:p.kind,x:p.x,y:p.y,z:p.z}));
 return {index:i,coreIndex:link.coreIndex,fromLevel:link.fromLevel,toLevel:link.toLevel,
  origin:link.selected.origin,ascent:link.selected.ascent,
  lowerLanding:link.selected.lowerLanding,upperLanding:link.selected.upperLanding,
  lowerLandingSupported:link.selected.lowerLanding.every(p=>hasFloor(lo,p)),
  upperLandingSupported:link.selected.upperLanding.every(p=>hasFloor(hi,p)&&!required.has(K(p))),
  aperture,body,solids,supports,modelledFinalStepFloorOverlap,
  finalStepTransitionPhysicallyVerified:false,residualSlabCollisions,foreignVolumeCollisions,
  b114ConditionalConnection:link.selected.hypotheticalInterfloorLink,
  minecraftCollisionVerified:false,appliedToOriginal:false};
}
function joinedRoutes(floors,b113,models){
 const apertureByLevel=floors.map(()=>new Set());
 for(const m of models)for(const p of m.aperture)apertureByLevel[m.toLevel].add(K(p));
 const source=floors.map((f,i)=>new Set([...f.gallery,...b113.horizontalRoutes[i].repair.addedCells].map(K)));
 const free=source.map((s,i)=>new Set([...s].filter(k=>{
  if(apertureByLevel[i].has(k))return false;
  const [x,z]=k.split(',').map(Number);
  const air=cube({x,z},floors[i].level*5+1,2);
  return !models.some(m=>m.solids.concat(m.supports).some(v=>intersects(v,air)));
 })));
 const blocked=source.map((s,i)=>[...s].filter(k=>!free[i].has(k)));
 const landingSupported=models.map(m=>
  m.lowerLandingSupported&&m.upperLandingSupported&&
  !m.lowerLanding.some(p=>apertureByLevel[m.fromLevel].has(K(p)))&&
  !m.upperLanding.some(p=>apertureByLevel[m.toLevel].has(K(p))));
 const flightClashes=[];
 for(let a=0;a<models.length;a++)for(let b=a+1;b<models.length;b++)
  if(overlaps(models[a].body,models[b].solids.concat(models[b].supports))||
    overlaps(models[b].body,models[a].solids.concat(models[a].supports)))
    flightClashes.push({first:a,second:b});
 const links=models.map((m,i)=>{
  const lower=m.lowerLanding.every(p=>neighbors(p).some(n=>free[m.fromLevel].has(K(n))));
  const upper=m.upperLanding.every(p=>neighbors(p).some(n=>free[m.toLevel].has(K(n))));
  const clear=m.residualSlabCollisions.length===0&&m.foreignVolumeCollisions.length===0&&
    landingSupported[i]&&!flightClashes.some(c=>c.first===i||c.second===i);
  return {index:i,fromLevel:m.fromLevel,toLevel:m.toLevel,lower,upper,
   provisionalGeometryLink:lower&&upper&&clear,
   realPlayerTraversalCertified:false};
 });
 const reached=floors.map(()=>new Set());
 const seeds=floors[0].exits.flatMap(x=>x.edge);
 for(const seed of seeds)for(const k of reachable(seed,free[0]))reached[0].add(k);
 let change=true;
 while(change){
  change=false;
  for(const link of links.filter(x=>x.provisionalGeometryLink)){
   const m=models[link.index];
   for(const [src,dst,from,to] of [
    [link.fromLevel,link.toLevel,m.lowerLanding,m.upperLanding],
    [link.toLevel,link.fromLevel,m.upperLanding,m.lowerLanding]]){
    if(!from.some(p=>neighbors(p).some(n=>reached[src].has(K(n)))))continue;
    for(const p of to)for(const n of neighbors(p))
     for(const k of reachable(n,free[dst]))if(!reached[dst].has(k)){reached[dst].add(k);change=true;}
   }
  }
 }
 const rooms=b113.rooms.map(r=>{
  const d=floors[r.level].rooms.find(room=>room.id===r.roomId)?.conceptualDoorOpening?.outside;
  const path=!!d&&reached[r.level].has(K(d));
  return {level:r.level,id:r.roomId,doorExternal:d,doorReached:path,
   interiorClear:r.offlineOccupancyClear,provisionalAccess:path&&r.offlineOccupancyClear,
   realDoorAndBedUsageCertified:false};
 });
 return {apertureByLevel,sourceGalleryCounts:source.map(s=>s.size),freeGalleryCounts:free.map(s=>s.size),
  blockedGallery:blocked.map((arr,i)=>({level:i,count:arr.length,cells:arr.slice(0,30)})),
  landingSupported,flightClashes,links,rooms,
  reachedFloors:reached.filter(s=>s.size>0).length,
  reachedCells:reached.map(s=>s.size),validEntrances:seeds.filter(p=>free[0].has(K(p))).length};
}
export function inspectHouse(parent,b113,b114){
 if(!validateB113(b113)||!validateB114(b114))throw Error('B114_HOUSE_INVALID_PARENT');
 const id='HOUSE_V3',source=parent.sourceDesigns.find(d=>d.candidateId===id),
  c113=b113.cases.find(c=>c.id===id),c114=b114.cases.find(c=>c.id===id);
 const b111=parent.models.find(d=>d.id===id);
 if(!source||!c113||!c114||!b111||c113.source.b111Digest!==b111.digest||
  c114.sourceB113Integrity!==b111.digest||source.plan.floors.length!==2||
  c114.stairs.length!==2||c113.rooms.length!==3)throw Error('B114_HOUSE_PINNED_GEOMETRY_CHANGED');
 const volume=generateB105(source),qa=auditB105(volume,source.plan);
 if(qa.issueCount!==0||qa.envelopeConflicts!==0)throw Error('B114_HOUSE_SOURCE_VOLUME_INVALID');
 const foreign=volume.voxels.filter(v=>v.kind!=='EXTERIOR_PORTAL_VOID_PROXY')
  .map(v=>({...cube(v,v.y),kind:v.kind}));
 const flight=straightFlight(),floors=source.plan.floors,
  models=c114.stairs.map((s,i)=>stairModel(s,i,flight,floors,foreign));
 const walk=joinedRoutes(floors,c113,models);
 const roomsReached=walk.rooms.filter(r=>r.provisionalAccess).length;
 const totals={floors:floors.length,rooms:c113.rooms.length,stairs:models.length,
  originalOptimisticRooms:c114.conditionalRoutes.hypotheticalGroundToRoomPaths,
  originalConditionalStairLinks:c114.metrics.conditionalGalleryToGalleryInterfaces,
  postPlacementStairLinks:walk.links.filter(l=>l.provisionalGeometryLink).length,
  postPlacementRoomsReached:roomsReached,postPlacementFloorsReached:walk.reachedFloors,
  corridorCellsObstructed:walk.blockedGallery.reduce((n,r)=>n+r.count,0),
  proposedUpperFloorOpenings:walk.apertureByLevel.reduce((n,s)=>n+s.size,0),
  unsupportedLandingGroups:walk.landingSupported.filter(x=>!x).length,
  modelledFinalStepLandingOverlaps:models.reduce((n,m)=>n+m.modelledFinalStepFloorOverlap,0),
  otherStairCollisionPairs:walk.flightClashes.length,
  residualSlabBodyClashes:models.reduce((n,m)=>n+m.residualSlabCollisions.length,0),
  foreignVolumeClashes:models.reduce((n,m)=>n+m.foreignVolumeCollisions.length,0),
  certifiedStairs:0,certifiedRooms:0,worldContacts:0,commands:0};
 const interventions=[
  ...(totals.corridorCellsObstructed?['REROUTE_2_WIDE_GALLERY_AROUND_STAIRS']:[]),
  ...(totals.unsupportedLandingGroups?['REBUILD_SUPPORTED_LANDINGS']:[]),
  ...(totals.residualSlabBodyClashes?['REPAIR_FLOOR_APERTURES']:[]),
  ...(totals.foreignVolumeClashes?['MOVE_STAIR_OR_FACADE_GEOMETRY']:[]),
  ...(roomsReached<totals.rooms?['RESTORE_ENTRANCE_TO_ALL_ROOMS']:[]),
  'PHYSICAL_EDUCATION_STATE_AND_COLLISION_CHECK_UNAUTHORIZED'
 ];
 return {schema:'minecraftaibuilder-b114-house-v3-integrated-offline-v1',id,
  sourceB114Integrity:b114.integritySha256,sourceDesignProof:c113.source.sourceDesignSha256,
  coordinateBasis:'LOCAL_DESIGN_ONLY_Y_5L_FLOOR_AND_Y_5L+1_WALKING_AIR',
  conceptualFloors:floors.map(f=>({level:f.level,slabCellCount:floorCells(f).length})),
  floorApertureProposals:walk.apertureByLevel.map((s,level)=>({level,count:s.size,cells:[...s].sort()})),
  stairs:models.map(({body,solids,supports,...rest})=>rest),
  gallery:{...walk,apertureByLevel:undefined},
  totals,interventions,sourceVolumeIssueCount:qa.issueCount,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,gates:b114.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null},
  designChangesApplied:false,physicalTravelCertified:false};
}
export function writeHouse(r,dir){
 if(r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
  r.executionAllowed!==false||r.worldContacts!==0||r.worldCoordinates!==null||
  r.commandCount!==0||r.BuildPlan.operations.length!==0||r.gates.length!==9||
  r.gates.some(x=>x.status!=='BLOCKED'))throw Error('B114_HOUSE_UNSAFE_REPORT');
 fs.mkdirSync(dir,{recursive:true});
 const json=path.join(dir,'B114_HOUSE_V3_Integrated_3D.json'),
  md=path.join(dir,'B114_HOUSE_V3_Integrated_Review_JA.md');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 const t=r.totals;
 fs.writeFileSync(md,[
  '# B114 HOUSE_V3 全体3D動線・階段・床支持検査（オフライン）','',
  '元のB104・B105・B111・B113データは変更していません。施工も接続も許可していません。','',
  '|検査|値|','|---|---:|',
  '|原B114の仮階段接続|'+t.originalConditionalStairLinks+' / '+t.stairs+'|',
  '|階段を重ね、開口と廊下を考慮した仮接続|'+t.postPlacementStairLinks+' / '+t.stairs+'|',
  '|塞がれた廊下セル|'+t.corridorCellsObstructed+'|',
  '|新設が必要な上階床開口候補セル|'+t.proposedUpperFloorOpenings+'|',
  '|支持不足の踊り場群|'+t.unsupportedLandingGroups+'|',
  '|最終半段差で支持床と広域AABBが重なる候補（未認証）|'+t.modelledFinalStepLandingOverlaps+'|',
  '|別階段との干渉組|'+t.otherStairCollisionPairs+'|',
  '|残る床との身体干渉|'+t.residualSlabBodyClashes+'|',
  '|B105外装・家具との身体干渉|'+t.foreignVolumeClashes+'|',
  '|玄関からの通路・階段・各室の仮到達|'+t.postPlacementRoomsReached+' / '+t.rooms+'|',
  '|実機認証済みの室・階段|0|','',
  '## 優先修正候補',...r.interventions.map((x,i)=>(i+1)+'. '+x),'',
  '床スラブは元B104フットプリントを仮想的な立方体床として評価。開口は未適用の案です。',
  '原B114の「279室仮到達」は未設置階段の無条件グラフ接続を前提とするため、',
  'ここでは占有セル・支持柱・上階開口を差し引いて経路を再計算しました。',
  'それでも階段の実物理・ドア動作・屋根や仕上げの施工品質は検証していません。',
  'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[]'
 ].join('\n')+'\n');
 return {json,md};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent),b114=buildB114(parent,b113);
 const report=inspectHouse(parent,b113,b114),out=writeHouse(report,path.resolve('b114-review-output'));
 console.log(JSON.stringify({totals:report.totals,interventions:report.interventions,output:out},null,2));
}