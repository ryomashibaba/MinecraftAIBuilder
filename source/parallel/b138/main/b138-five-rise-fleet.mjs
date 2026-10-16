/**
 * B138 source-pinned fleet circulation plan. No Minecraft access, writes or
 * World coordinates.  B136/B137 empirical stair behaviour is NOT a proof
 * that all original 5-rise, 2-wide and door/ceiling assemblies work.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assembleReferenceParent} from '../../b113/main/b113-reference-parent.mjs';
import {buildB113,validateB113} from '../../b113/main/compile-b113.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const HASH=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=p=>p.x+','+p.z;
const K3=p=>p.x+','+p.y+','+p.z;
const integer=n=>Number.isSafeInteger(n);
export const B138_LIMITS=Object.freeze({
 buildings:15,floors:66,stairs:102,sourceFloorRise:5,
 verifiedB137TestRouteRise:6,conceptStairRuns:5,
 conceptWidth:2,conceptLength:7,
 siteConstructionApproved:false
});
function roomMask(room,p){
 return p.x>=room.x&&p.x<room.x+room.width&&
  p.z>=room.z&&p.z<room.z+room.depth;
}
/**
 * Pure 5-rise sketch in B113's seven-long two-wide reservations:
 * lower floor support at index 0 (kept), five normal lower-half stairs
 * indices 1..5, upper floor support at index 6 (kept).
 * Existing floor cells are not authorized replacements.
 */
export function b138FiveRiseSketch(stair,reservation){
 if(!stair||!integer(stair.fromLevel)||!integer(stair.toLevel)||
    stair.toLevel!==stair.fromLevel+1)throw Error('B138_STAIR_LEVEL_DRIFT');
 if(!reservation?.origin||
  !integer(reservation.origin.x)||!integer(reservation.origin.z)||
  !reservation.ascent||!integer(reservation.ascent.dx)||
  !integer(reservation.ascent.dz)||
  Math.abs(reservation.ascent.dx)+Math.abs(reservation.ascent.dz)!==1)
  throw Error('B138_INVALID_PINNED_RESERVATION');
 const {origin,ascent}=reservation,base=5*stair.fromLevel;
 const parts=[];
 for(let i=0;i<7;i++)for(let lane=0;lane<2;lane++){
  const position={
   x:origin.x+ascent.dx*i-ascent.dz*lane,
   y:base+(i===6?5:i),
   z:origin.z+ascent.dz*i+ascent.dx*lane
  };
  parts.push({index:i,lane,kind:i===0?'LOWER_FLOOR_SEAM':
   i===6?'UPPER_FLOOR_SEAM':'NORMAL_OAK_STAIR_CONCEPT',
   position,
   intendedTopY:position.y+1,blockstate:i>=1&&i<=5?
    {name:'minecraft:oak_stairs',weirdo_direction:
      ascent.dx===1?0:ascent.dx===-1?1:ascent.dz===1?2:3,
     upside_down_bit:false}:null});
 }
 if(parts.length!==14||new Set(parts.map(p=>K3(p.position))).size!==14)
  throw Error('B138_SKETCH_SELF_INTERSECTION');
 const first=parts.find(p=>p.index===0&&p.lane===0),
  last=parts.find(p=>p.index===6&&p.lane===0);
 if(last.intendedTopY-first.intendedTopY!==B138_LIMITS.sourceFloorRise)
  throw Error('B138_WRONG_FLOOR_RISE');
 // B113's chosen reservation must have the same 7x2 footprint in X/Z.
 if(!Array.isArray(reservation.footprintCells)||reservation.footprintCells.length!==14||
  new Set(reservation.footprintCells.map(K)).size!==14||
  reservation.footprintCells.some(p=>!parts.some(v=>v.position.x===p.x&&v.position.z===p.z)))
  throw Error('B138_RESERVATION_FOOTPRINT_CHANGED');
 const lower=parts.filter(p=>p.index===0).map(p=>({x:p.position.x,z:p.position.z}));
 const upper=parts.filter(p=>p.index===6).map(p=>({x:p.position.x,z:p.position.z}));
 if(!['lowerLanding','upperLanding'].every((key,i)=>{
  const expected=i===0?lower:upper;
  return Array.isArray(reservation[key])&&reservation[key].length===2&&
   reservation[key].every(p=>expected.some(q=>K(p)===K(q)));
 }))throw Error('B138_SOURCE_SEAM_MISMATCH');
 return {sourceFloorRise:5,
  localHeightDerivation:'LOWER_FLOOR_BLOCK_Y=5*fromLevel, STAIR1..5=Y+1..Y+5, UPPER_SEAM=Y+5',
  width:2,length:7,positions:parts,lowerSeam:lower,upperSeam:upper,
  worldLocationKnown:false,
  actuallyPlaced:false,headroomCertified:false,
  supportedLandingCertified:false,physicalCollisionCertified:false,
  worldOperations:[]};
}
function sourceReachability(levels,edges,excludedIndex=-1){
 const known=new Set([0]),queue=[0];
 for(let i=0;i<queue.length;i++){
  const a=queue[i];
  for(let e=0;e<edges.length;e++){
   if(e===excludedIndex)continue;
   const s=edges[e];
   const b=s.fromLevel===a?s.toLevel:s.toLevel===a?s.fromLevel:null;
   if(b!==null&&!known.has(b)){known.add(b);queue.push(b);}
  }
 }
 return {levelsReached:known.size,reachableLevels:[...known].sort((a,b)=>a-b),
  unreachableLevels:Array.from({length:levels},(_,i)=>i).filter(i=>!known.has(i))};
}
const unsupported=s=>s?.upperOvershoot!==0||
 s?.lowerLandingDistance>1||s?.upperLandingDistance>1||
 s?.physicalTraversalCertified!==false;
/** Full source stair graph and per-level horizontal-entry triage, one building. */
export function b138AuditBuilding(design,case113){
 if(!design||!case113||design.candidateId!==case113.id)
  throw Error('B138_CASE_ID_MISMATCH');
 const floors=design.plan?.floors,stairs=case113.stairs,routes=case113.horizontalRoutes;
 if(!Array.isArray(floors)||!floors.length||!Array.isArray(stairs)||
    !Array.isArray(routes)||routes.length!==floors.length||
    case113.levels!==floors.length||
    floors.some((f,i)=>f.level!==i))
  throw Error('B138_FLOOR_INVENTORY_OR_ORDER_CHANGED');
 const edges=stairs.map((stair,i)=>{
  if(!integer(stair.fromLevel)||!integer(stair.toLevel)||
     stair.toLevel!==stair.fromLevel+1||
     stair.fromLevel<0||stair.toLevel>=floors.length||
     !integer(stair.coreIndex)||stair.coreIndex<0)
   throw Error('B138_STAIR_VERTICAL_EDGE_INVALID_'+i);
  const candidate=stair.reservation?.eligibleFootprints>0?
   b138FiveRiseSketch(stair,stair.reservation.sample):null;
  if(stair.reservation?.eligibleFootprints>0&&!candidate)
   throw Error('B138_ELIGIBLE_RESERVATION_HAS_NO_SAMPLE');
  return {stairIndex:i,fromLevel:stair.fromLevel,toLevel:stair.toLevel,
   coreIndex:stair.coreIndex,sourceIssueCodes:[...stair.issues],
   originalLegacyStairNeedsRedesign:unsupported(stair),
   legacyOvershoot:stair.upperOvershoot,
   originalLowerLandingGap:stair.lowerLandingDistance,
   originalUpperLandingGap:stair.upperLandingDistance,
   sourcePinned7x2Footprints:stair.reservation?.eligibleFootprints??0,
   fiveRiseSketch:candidate,
   b137SixRiseDemonstrationNotDirectlyTransferable:true,
   actualWalkabilityProvenForThisStair:false,constructionAllowed:false};
 });
 const bfs=sourceReachability(floors.length,edges);
 const endpoints=edges.flatMap(e=>[
  {stairIndex:e.stairIndex,level:e.fromLevel,side:'LOWER'},
  {stairIndex:e.stairIndex,level:e.toLevel,side:'UPPER'}
 ]);
 const counts=Array.from({length:floors.length},(_,i)=>({
  level:i,stairsTouching:endpoints.filter(x=>x.level===i).length,
  stairLowerSides:endpoints.filter(x=>x.level===i&&x.side==='LOWER').length,
  stairUpperSides:endpoints.filter(x=>x.level===i&&x.side==='UPPER').length,
  gallerySourceCells:floors[i].gallery.length,
  originalDoorways:routes[i].roomDoorways,
  originalHorizontalRoomConnections:routes[i].horizontalRoomConnections,
  proposedRepairedRoomConnections:routes[i].repair.roomConnections,
  proposedAdditionalGalleryCells:routes[i].repair.addedCells.length,
  physicallyReachableRoomDoors:0,
  actualTwoWideSeamVerified:false
 }));
 const bottlenecks=edges.filter(e=>
  sourceReachability(floors.length,edges,e.stairIndex).levelsReached<bfs.levelsReached)
  .map(e=>e.stairIndex);
 const suggested=edges.map(e=>({
  id:case113.id+'/STAIR_'+String(e.stairIndex).padStart(3,'0'),
  stairIndex:e.stairIndex,
  fromLevel:e.fromLevel,toLevel:e.toLevel,
  sourcePinnedGeometryAvailable:!!e.fiveRiseSketch,
  reason:!e.fiveRiseSketch?'NO_B113_SOURCE_FOOTPRINT_CANDIDATE':
   'GEOMETRY_SKETCH_ONLY_NO_CLEARANCE_OR_ACTUAL_LANDING_CERTIFICATE',
  highImpactIfLost:bottlenecks.includes(e.stairIndex),
  mandatoryBeforeWorldWrites:[
   'PHYSICAL_5_RISE_ADAPTER_AND_HEADROOM',
   'UPPER_FLOOR_APERTURE_AND_SUPPORT',
   'TWO_WIDE_CORRIDOR_SEAM_AND_DOOR_COLLISION',
   'MINECRAFT_EDUCATION_SOURCE_BLOCKSTATES_AND_LOCAL_WORLD_OCCUPANCY'
  ],
  worldOperationCount:0
 })).sort((a,b)=>Number(b.highImpactIfLost)-Number(a.highImpactIfLost)||
  Number(b.sourcePinnedGeometryAvailable)-Number(a.sourcePinnedGeometryAvailable)||
  a.fromLevel-b.fromLevel||a.stairIndex-b.stairIndex);
 return {id:case113.id,floors:floors.length,sourceStairs:edges.length,
  sourceVerticalGraph:{...bfs,
   status:bfs.unreachableLevels.length?
    'SOURCE_LEVEL_GRAPH_GAP':'SOURCE_LEVEL_GRAPH_REACHABLE_PROXY',
   physicallyTraversableCertified:false,
   criticalStairIndices:bottlenecks},
  conceptsWithPinnedB113Reservations:edges.filter(x=>x.fiveRiseSketch).length,
  originalLegacyStairsRequiringReview:edges.filter(x=>x.originalLegacyStairNeedsRedesign).length,
  floorInterfaces:counts,stairInterfaces:edges,
  priorities:suggested,untouchedSource:true,worldCoordinatesKnown:false};
}
export function b138Fleet(parent,b113){
 if(!validateB113(b113)||!Array.isArray(parent?.sourceDesigns)||parent.sourceDesigns.length!==15||
  !Array.isArray(b113.cases)||b113.cases.length!==15||
  parent.sourceDerivationLocale&&parent.sourceDerivationLocale!=='en-US')
  throw Error('B138_UNTRUSTED_PINNED_B113_INPUT');
 const cases=parent.sourceDesigns.map(d=>{
  const c=b113.cases.find(c=>c.id===d.candidateId);
  return b138AuditBuilding(d,c);
 });
 if(new Set(cases.map(x=>x.id)).size!==15)
  throw Error('B138_DUPLICATE_BUILDING_ID');
 const floors=cases.reduce((n,c)=>n+c.floors,0),
  stairs=cases.reduce((n,c)=>n+c.sourceStairs,0);
 if(floors!==B138_LIMITS.floors||stairs!==B138_LIMITS.stairs||
    cases.length!==B138_LIMITS.buildings||
    b113.totals.variants!==15||b113.totals.levels!==66||
    b113.totals.stairLinks!==102)
  throw Error('B138_15_66_102_SOURCE_DRIFT');
 const ranked=cases.flatMap(c=>c.priorities.map(p=>({...p,buildingId:c.id})))
  .sort((a,b)=>Number(b.highImpactIfLost)-Number(a.highImpactIfLost)||
    Number(b.sourcePinnedGeometryAvailable)-Number(a.sourcePinnedGeometryAvailable)||
    a.buildingId.localeCompare(b.buildingId,'en-US')||a.stairIndex-b.stairIndex);
 const totals={buildings:cases.length,sourceFloors:floors,sourceStairs:stairs,
  conceptualFloorGraphReachableBuildings:cases.filter(x=>!x.sourceVerticalGraph.unreachableLevels.length).length,
  conceptualUnreachableFloors:cases.reduce((n,c)=>n+c.sourceVerticalGraph.unreachableLevels.length,0),
  sourcePinned5RiseSketches:cases.reduce((n,c)=>n+c.conceptsWithPinnedB113Reservations,0),
  sourceStairIssuesRequiringRedesign:cases.reduce((n,c)=>n+c.originalLegacyStairsRequiringReview,0),
  elligibleForWorldWrites:0,actualEducationWorldContacts:0};
 const data={schema:'minecraftaibuilder-b138-fleet-five-rise-connectivity-v1',
  inheritedB113Integrity:b113.integritySha256,
  inheritedB113SourceBaselineSha256:HASH(b113.sourceBaseline),
  evidence:{
   userConfirmedB135DirectionMap:{EAST:0,SOUTH:2,WEST:1,NORTH:3},
   b136UserReportedJumpFreeThreeStepUpDown:true,
   b136UserReportedUpRise:3,b136UserReportedDownRise:-3,
   b137UserReportedBuild:{added:5,kept:3},
   b137UserReportedDownRise:-6,b137UserReportedDownAxis:-9.394708633422848,
   b137UserReportedUpRise:.5,b137UpQuantitativeResult:'INCONCLUSIVE',
   b137UserVisualObservation:'NO_VISIBLE_PROBLEM_REPORTED',
   rawB136B137JsonFilesAuthenticatedInRepo:false,
   doesNotCertify102SourceStairs:true
  },
  geometryTransfer:{demonstratedB137VerticalRise:6,
   originalBuildingFloorInterval:5,
   directB137RouteReuseAllowed:false,
   widthTwoFiveRiseAdapter:'SOURCE_PINNED_SKETCH_ONLY',
   originalRoomsCoresFloorsNeverModified:true},
  totals,cases,rankedReadOnlyWorkPackages:ranked,
  nextIntegrationGate:'5_RISE_STAIR_AND_LANDING_3D_CLEARANCE_WITH_SOURCE_VOXELS',
  sourceDesignChanged:false,worldContacts:0,worldCoordinates:null,
  commandCount:0,constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:b113.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],worldCoordinates:null,commandCount:0}
 };
 if(data.gates.length!==9||data.gates.some(g=>g.status!=='BLOCKED'))
  throw Error('B138_GATE_INTEGRITY_DRIFT');
 return {...data,integritySha256:HASH(data)};
}
export function verifyB138(report){
 try{
  const {integritySha256,...source}=report??{};
  return HASH(source)===integritySha256&&
   report.schema==='minecraftaibuilder-b138-fleet-five-rise-connectivity-v1'&&
   report.totals.buildings===15&&report.totals.sourceFloors===66&&
   report.totals.sourceStairs===102&&
   report.rankedReadOnlyWorkPackages.length===102&&
   report.cases.length===15&&
   report.geometryTransfer.directB137RouteReuseAllowed===false&&
   report.sourceDesignChanged===false&&report.worldContacts===0&&
   report.worldCoordinates===null&&report.commandCount===0&&
   report.executionAllowed===false&&report.constructionApproved===false&&
   report.readiness==='NOT_PREPARED'&&
   report.gates.length===9&&report.gates.every(g=>g.status==='BLOCKED')&&
   report.BuildPlan.operations.length===0&&
   report.BuildPlan.commandCount===0&&
   report.cases.every(c=>c.untouchedSource===true&&
    c.stairInterfaces.every(e=>e.constructionAllowed===false&&
     (e.fiveRiseSketch===null||e.fiveRiseSketch.worldOperations.length===0)));
 }catch{return false;}
}
export function saveB138(report,out=path.join(ROOT,'b138-review-output')){
 if(!verifyB138(report))throw Error('B138_REPORT_UNSAFE_OR_INVALID');
 fs.mkdirSync(out,{recursive:true});
 const json=path.join(out,'B138_15_Buildings_5_Rise_Connectivity.json');
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n');
 const t=report.totals;
 const lines=[
  '# B138 — 15棟の5ブロック階床間ネットワーク（オフライン）',
  '',
  '元の15棟・66階床・102階段のソースデータから計算した、施工前の接続候補一覧です。',
  '**Minecraft実機で102階段の移動や支持・衝突が成功したことは意味しません。**',
  '',
  '|指標|値|','|---|---:|',
  '|建物|'+t.buildings+'|','|階床|'+t.sourceFloors+'|',
  '|元の階段|'+t.sourceStairs+'|',
  '|概念的に1階からすべての階床へ到達する建物|'+t.conceptualFloorGraphReachableBuildings+'|',
  '|到達不可の階床数（概念グラフ）|'+t.conceptualUnreachableFloors+'|',
  '|B113の2列×7長予約に収まる5-riseスケッチ|'+t.sourcePinned5RiseSketches+'|',
  '|元の階段の構造見直し対象|'+t.sourceStairIssuesRequiringRedesign+'|',
  '',
  'B135は方向、B136は3段の無ジャンプ往復、B137は踊り場を挟む6段の視認と下り動作を検証済み。',
  '**B137の試験経路は6段上昇。元の建物の階床差5ブロックには、そのまま移植できません。**',
  '',
  '|建物|階床|元階段|概念接続先の階床|5-rise仮配置候補|',
  '|---|---:|---:|---:|---:|',
  ...report.cases.map(c=>'|'+c.id+'|'+c.floors+'|'+c.sourceStairs+
    '|'+c.sourceVerticalGraph.levelsReached+'/'+c.floors+'|'+c.conceptsWithPinnedB113Reservations+'|'),
  '',
  '## 次に実際の建築へ近づけるために',
  '',
  '検出した5-rise候補に対して、元B105床ボクセル・B123 2列廊下・B124上階開口との3D干渉を検査し、',
  '設置可能な候補の実物構造と支持材・動線を詰める。元の階段・部屋・コア・床を無断で変更しない。',
  '世界の座標と現地占有情報は依然不明。9件の施工ゲートを解除していません。',
  '',
  '**readiness = NOT_PREPARED、worldContacts = 0、BuildPlan.operations = []。**'
 ];
 const markdown=path.join(out,'B138_SOURCE_CIRCULATION_SUMMARY_JA.md');
 fs.writeFileSync(markdown,lines.join('\n')+'\n');
 return {json,markdown,totals:t,integritySha256:report.integritySha256};
}
export async function runB138({out}={}){
 const parent=await assembleReferenceParent();
 const b113=buildB113(parent);
 if(!validateB113(b113))throw Error('B138_PARENT_B113_REVALIDATION_FAILED');
 const report=b138Fleet(parent,b113);
 return saveB138(report,out);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await runB138(),null,2));}
 catch(e){console.error('B138_OFFLINE_HOLD:',e.message);process.exitCode=1;}
}
