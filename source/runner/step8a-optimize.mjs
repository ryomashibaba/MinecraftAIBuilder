// Step8A.5 conservative floor-plan alternatives; fully offline, never buildable.
// Only Step8A.3 concept-level circulation/room partition may change. Massing, dimensions,
// orientation, stair, elevator and envelope/facade grammar remain frozen for each proposal.
import {planDetailedCoordinates} from './step8a-detail.mjs';
import {assessPhysicalDesign} from './step8a-physical.mjs';
import {createHash} from 'node:crypto';
const sha=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex');
const block=(reason)=>{throw Object.assign(new Error(reason),{code:'UNSAFE_INPUT'});};
const presets=[
 {id:'INSET_6',title:'外壁際を回避する通路6グリッド',spacing:6,offsetX:2,offsetZ:2,edgeInset:1},
 {id:'INSET_7',title:'外壁際を回避する通路7グリッド',spacing:7,offsetX:3,offsetZ:3,edgeInset:1},
 {id:'INSET_5',title:'外壁際を回避する通路5グリッド',spacing:5,offsetX:2,offsetZ:2,edgeInset:1},
 {id:'INTERIOR_SHIFT_3',title:'内部通路位置のオフセット3',spacing:6,offsetX:3,offsetZ:3},
 {id:'INTERIOR_SHIFT_4',title:'内部通路位置のオフセット4',spacing:6,offsetX:4,offsetZ:4},
 {id:'COMPACT_5',title:'内部通路5グリッド',spacing:5,offsetX:3,offsetZ:3},
 {id:'WIDE_7',title:'内部通路7グリッド',spacing:7,offsetX:2,offsetZ:2},
];
function ensureSafe(...inputs){for(const value of inputs){if(value?.BuildPlan?.status!=='NOT_PREPARED'||value?.BuildPlan?.commandCount!==0||value.BuildPlan.operations?.length!==0||value.safety?.constructionApproved!==false||value.safety?.executionAllowed!==false)block('Unsafe design input');}}
const roomMetrics=physical=>({rooms:physical.metrics.roomCount,tooSmall:physical.metrics.smallInteriorRooms,unwindowed:physical.metrics.roomsWithoutAdjacentWindowIntent,
 furnitureIntent:physical.metrics.roomsWith2x2FurnitureReservation,
 usableArea:physical.roomQuality.flatMap(f=>f.rooms).reduce((s,r)=>s+r.usableInteriorCellsBeforeFurniture,0)});
const countCells=detail=>detail.roomsAndCorridors.floors.reduce((sum,f)=>sum+f.corridorCells.length,0);
function rejectReason(base,proposed,detail){
 const a=roomMetrics(base),b=roomMetrics(proposed),floors=detail.roomsAndCorridors.floors;
 if(detail.issues.length||floors.some(f=>f.issues.length||!f.areaConserved||!f.partitionDisjoint||!f.roomsReachableFromStairOnSchematic))return 'ROOM_CIRCULATION_NOT_PROVEN';
 if(a.rooms>0&&b.rooms<Math.ceil(a.rooms*.90))return 'ROOM_COUNT_LOSS_GT_10_PERCENT';
 if(a.usableArea>0&&b.usableArea<a.usableArea*.90)return 'USABLE_ROOM_AREA_LOSS_GT_10_PERCENT';
 if(b.tooSmall>a.tooSmall)return 'MORE_TINY_ROOMS';
 if(b.unwindowed>a.unwindowed)return 'MORE_ROOMS_WITHOUT_WINDOW_INTENT';
 if(b.furnitureIntent<Math.ceil(a.furnitureIntent*.90))return 'FURNITURE_INTENT_LOSS_GT_10_PERCENT';
 if(proposed.collisions.count>=base.collisions.count)return 'NO_STRICT_COLLISION_REDUCTION';
 for(const [kind,v] of Object.entries(proposed.collisions.byType))if(v>(base.collisions.byType[kind]??0))return 'NEW_OR_INCREASED_COLLISION_TYPE';
 return null;
}
export function proposeImprovements(concept,architecture,detail,baseline,{maxProposals=3}={}){
 ensureSafe(concept,architecture,detail,baseline);
 if(!Number.isInteger(maxProposals)||maxProposals<1||maxProposals>3)throw Object.assign(new Error('maxProposals should be between 1 and 3'),{code:'BAD_BUDGET'});
 const independentlyRechecked=assessPhysicalDesign(concept,architecture,detail);
 if(sha(independentlyRechecked)!==sha(baseline))block('Forged or stale baseline physical assessment');
 const originalHash=sha([concept,architecture,detail,baseline]),trials=[],eligible=[];
 const old=roomMetrics(baseline);
 for(const config of presets){
  const candidateDetail=planDetailedCoordinates(concept,architecture,{corridorVariant:config});
  ensureSafe(candidateDetail);
  // Strictly preserve all user-established macro constraints, facade modules and cores.
  if(sha(candidateDetail.stair)!==sha(detail.stair)||sha(candidateDetail.facade)!==sha(detail.facade)){
   trials.push({id:config.id,status:'REJECTED_MACRO_OR_FACADE_CHANGE'});continue;
  }
  const candidatePhysical=assessPhysicalDesign(concept,architecture,candidateDetail);
  const reason=rejectReason(baseline,candidatePhysical,candidateDetail);
  const record={id:config.id,status:reason?'REJECTED':'REVIEW_CANDIDATE',reason,
   fromCollisions:baseline.collisions.count,toCollisions:candidatePhysical.collisions.count,
   fromRooms:old.rooms,toRooms:candidatePhysical.metrics.roomCount};
  trials.push(record);
  if(reason)continue;
  const next=roomMetrics(candidatePhysical),delta={
    collisionsRemoved:baseline.collisions.count-candidatePhysical.collisions.count,
    roomCountDifference:next.rooms-old.rooms,usableRoomAreaDifference:next.usableArea-old.usableArea,
    unwindowedRoomDifference:next.unwindowed-old.unwindowed,
    corridorCellDifference:countCells(candidateDetail)-countCells(detail)};
  const proposal={id:config.id,label:config.title,status:'SCHEMATIC_ALTERNATIVE_FOR_HUMAN_REVIEW_NOT_BUILDABLE',
   corridorGridParameters:{spacing:config.spacing,offsetX:config.offsetX,offsetZ:config.offsetZ,avoidFootprintBoundary:!!config.edgeInset},
   baseline:{collisionCount:baseline.collisions.count,byType:baseline.collisions.byType,roomQuality:old},
   revised:{collisionCount:candidatePhysical.collisions.count,byType:candidatePhysical.collisions.byType,roomQuality:next,blockingIssues:candidatePhysical.blockingIssues},
   delta,unverified:['外壁ガラス実ブロック','階段の実歩行','複数避難経路','廊下の必要幅','家具配置とドア開閉','EV機構','構造安全','Minecraft Education内での施工'],
   floors:candidateDetail.roomsAndCorridors.floors.map(f=>({level:f.level,rooms:f.rooms,corridorCells:f.corridorCells,coreStairCells:f.coreStairCells,elevatorCells:f.elevatorCells,areaConserved:f.areaConserved,partitionDisjoint:f.partitionDisjoint})),
   BuildPlan:{status:'NOT_PREPARED',commandCount:0,operations:[]},
   safety:{constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true}};
  if(!eligible.some(p=>sha(p.floors)===sha(proposal.floors)))eligible.push(proposal);
 }
 eligible.sort((a,b)=>b.delta.collisionsRemoved-a.delta.collisionsRemoved||b.revised.roomQuality.rooms-a.revised.roomQuality.rooms||b.revised.roomQuality.usableArea-a.revised.roomQuality.usableArea||a.id.localeCompare(b.id));
 const proposals=eligible.slice(0,maxProposals);
 if(sha([concept,architecture,detail,baseline])!==originalHash)block('Optimization must not mutate the source plan');
 return {schema:'minecraftaibuilder-step8a5-optimization-v1',status:proposals.length?'OFFLINE_IMPROVEMENTS_AVAILABLE_NOT_BUILDABLE':'NO_SAFE_IMPROVEMENT_SHOWN',
  assumptions:['Step8A.4の局所ボクセル仮予約で比較した相対改善','部屋・廊下の配置は変わるため元の内装配置ではない','外観・敷地寸法・指定用途・方角・階数・形状・階段/EV・外壁モジュールは変更しない','実際の建築品質や施工可能性は未検証'],
  protectedDesign:{program:concept.BuildingComposition.program,massing:concept.BuildingComposition.massing,dimensions:concept.BuildingComposition.dimensions,floors:concept.BuildingComposition.floorCount,
    orientation:concept.BuildingComposition.orientation,stairAndElevatorHashesUnchanged:true,facadeModulesHashUnchanged:true},
  baseline:{collisions:baseline.collisions.count,roomCount:old.rooms,usableRoomArea:old.usableArea},
  trials,proposals,preferredForManualReview:proposals[0]?.id??null,
  validation:{originalDataSha256:originalHash,originalSourcesUntouched:true,independentPhysicalReassessment:true,avoidFakeCertification:true,
   originalDesignSafetyUnverified:true,constructionReady:false},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true}};
}
