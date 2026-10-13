/** B111 offline building usability: inspect room occupancy, no world I/O. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {coDesignB104} from '../../b104/main/b104-joint-layout.mjs';
import {assembleB110,validateB110Report} from '../../b110/main/compile-b110.mjs';
import {modelB111Interiors,auditB111Model,drawB111RoomAscii} from './b111-interior-access.mjs';

export function assembleB111(){
 const parent=assembleB110();
 if(!validateB110Report(parent.report)||parent.models.length!==15)throw Error('B111_INVALID_PARENT_B110');
 const frozen=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(frozen)||frozen.reportSha256!==parent.report.frozenParentSha256)
  throw Error('B111_INVALID_FROZEN_B100');
 const models=[],sourceDesigns=[];
 for(const group of frozen.architectureCases){
  const programme=B101_SCENARIOS[group.caseId];
  if(!programme)throw Error('B111_UNKNOWN_CASE');
  for(const option of group.options){
   const original=parent.models.find(m=>m.id===option.id);
   if(!original)throw Error('B111_MISSING_B110_BASELINE');
   const d=coDesignB104(option,programme);
   const m=modelB111Interiors(d,original);
   if(!auditB111Model(m,d,original))throw Error('B111_SPATIAL_DATA_INVALID');
   models.push(m);sourceDesigns.push(d);
  }
 }
 const sum=k=>models.reduce((n,m)=>n+m.metrics[k],0);
 const t={
  typologies:5,variants:models.length,floors:models.reduce((n,m)=>n+m.levels,0),
  rooms:sum('conceptRooms'),originalFixtureAnchors:sum('conceptualFurnitureSourceCells'),
  roomsWithConnectedSingleCellWalkways:sum('roomPathPasses'),
  roomsRequiringRevision:sum('roomNeedsRedesign'),
  proposedTwoCellBeds:sum('bedsProposedAsTwoCells'),
  bedsMissingUsableSecondCell:sum('bedPairsStillUnresolved'),
  doorwayInteriorBlockedRooms:sum('roomDoorInteriorBlocked'),
  roomsWithoutFree2x2Space:sum('roomsWithNo2wideWalkableSquare'),
  disconnectedInteriorCells:sum('disconnectedInteriorCells'),
  furnitureAccessFailures:sum('fixtureApproachFailures'),
  furnitureOverlaps:sum('furnitureOverlapCells'),
  reachableInteriorCells:sum('primaryPassageCells'),
  combinationsEvaluated:sum('fixtureCandidateOptionsEvaluated'),
  physicallyCompletedRooms:0,verifiedBlockStatesEducation26_3:0,
  worldContacts:0,legacyUnapproved:296,legacyHeld:18};
 const report={schema:'minecraftaibuilder-b111-readonly-interior-usability-report-v1',
  parentB110BaselineSha256:parent.report.frozenParentSha256,
  parentB110ModelDigests:parent.models.map(m=>m.digest),
  conceptualScope:'TWO_CELL_BEDS_AND_GRID_WALKABILITY_ONLY',
  bedrockCollisionValidation:'NOT_RUN_EDUCATION_26_3_UNVERIFIED',
  livePlayerMobilityValidation:'NOT_RUN',
  twoWideCorridorCertification:false,
  humanInteriorReviewApproved:false,
  totals:t,
  byBuilding:models.map(m=>({id:m.id,typology:m.typology,levels:m.levels,
   ...m.metrics,digest:m.digest,reviewOnly:true})),
  selectedIssueSamples:models.flatMap(m=>m.rooms.filter(r=>r.issues.length>0)
   .map(r=>({building:m.id,level:r.level,room:r.roomId,issues:r.issues,
    roomStatus:r.decision}))).slice(0,75),
  nextStage:'B112_OFFLINE_INTEGRATION_AUDIT_AND_LOCAL_WORK_HANDOFF_PREPARATION',
  nextWorkStage:'B113_AFTER_B112_USE_LOCAL_WORK_FOR_REAL_EDUCATION_ENVIRONMENT_READ_ONLY_VERIFICATION',
  gates:parent.report.gates.map(g=>({...g})),
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB111Report(report))throw Error('B111_INVALID_REPORT');
 return {report,models,sourceDesigns,parentB110Models:parent.models};
}
export function validateB111Report(r){
 if(r?.schema!=='minecraftaibuilder-b111-readonly-interior-usability-report-v1'||
 r.parentB110BaselineSha256?.length!==64||
 r.parentB110ModelDigests?.length!==15||
 r.conceptualScope!=='TWO_CELL_BEDS_AND_GRID_WALKABILITY_ONLY'||
 r.bedrockCollisionValidation!=='NOT_RUN_EDUCATION_26_3_UNVERIFIED'||
 r.livePlayerMobilityValidation!=='NOT_RUN'||
 r.twoWideCorridorCertification!==false||
 r.humanInteriorReviewApproved!==false||
 r.nextStage!=='B112_OFFLINE_INTEGRATION_AUDIT_AND_LOCAL_WORK_HANDOFF_PREPARATION'||
 r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.readiness!=='NOT_PREPARED'||r.worldContacts!==0||r.worldCoordinates!==null||
 r.executionAllowed!==false||r.constructionApproved!==false||
 r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan.operations?.length!==0||
 r.BuildPlan.commandCount!==0||r.BuildPlan.worldCoordinates!==null||
 r.byBuilding?.length!==15||!Array.isArray(r.selectedIssueSamples))return false;
 const t=r.totals,map={
  rooms:'conceptRooms',originalFixtureAnchors:'conceptualFurnitureSourceCells',
  roomsWithConnectedSingleCellWalkways:'roomPathPasses',
  roomsRequiringRevision:'roomNeedsRedesign',
  proposedTwoCellBeds:'bedsProposedAsTwoCells',
  bedsMissingUsableSecondCell:'bedPairsStillUnresolved',
  doorwayInteriorBlockedRooms:'roomDoorInteriorBlocked',
  roomsWithoutFree2x2Space:'roomsWithNo2wideWalkableSquare',
  disconnectedInteriorCells:'disconnectedInteriorCells',
  furnitureAccessFailures:'fixtureApproachFailures',
  furnitureOverlaps:'furnitureOverlapCells',
  reachableInteriorCells:'primaryPassageCells',
  combinationsEvaluated:'fixtureCandidateOptionsEvaluated'
 };
 const sum=k=>r.byBuilding.reduce((n,m)=>n+m[k],0);
 return t.typologies===5&&t.variants===15&&t.floors===66&&t.rooms===279&&
 t.originalFixtureAnchors===558&&
 t.roomsWithConnectedSingleCellWalkways+t.roomsRequiringRevision===279&&
 t.physicallyCompletedRooms===0&&t.verifiedBlockStatesEducation26_3===0&&
 t.worldContacts===0&&t.legacyUnapproved===296&&t.legacyHeld===18&&
 t.proposedTwoCellBeds>=0&&t.bedsMissingUsableSecondCell>=0&&
 r.byBuilding.every(m=>m.reviewOnly===true&&m.digest?.length===64&&
  m.actualBedsCertified===0&&m.actualUsableFurnitureCertified===0&&
  m.roomsCertifiedComplete===0&&m.verifiedEducationBlockStates===0&&
  m.worldCommandsExecuted===0)&&
 Object.entries(map).every(([key,src])=>t[key]===sum(src));
}
export function writeB111(data,dir){
 if(!validateB111Report(data?.report)||data.models?.length!==15||
 data.models.some(m=>!m.reviewOnly||m.worldContacts!==0||m.constructionApproved!==false||
 m.BuildPlan.operations.length!==0))throw Error('B111_UNSAFE_EXPORT');
 fs.mkdirSync(dir,{recursive:true});
 const reportFile=path.join(dir,'B111_Interior_Accessibility_Report.json');
 const modelsFile=path.join(dir,'B111_15_Building_Room_Layouts.json');
 const mdFile=path.join(dir,'B111_Interior_Findings_JA.md');
 const examplesFile=path.join(dir,'B111_Five_Building_Room_Maps.txt');
 fs.writeFileSync(reportFile,JSON.stringify(data.report,null,2)+'\n');
 fs.writeFileSync(modelsFile,JSON.stringify(data.models,null,2)+'\n');
 const t=data.report.totals;
 const lines=[
 '# B111 — 室内の通行性・家具の2セル占有を検証した結果',
 '',
 '※これは設計上のローカル2D床セル解析です。実Minecraft Educationの実機認証・施工命令ではありません。',
 '',
 '|指標|結果|','|---|---:|',
 '|概念上の室内|'+t.rooms+'|',
 '|既存B105家具アンカー|'+t.originalFixtureAnchors+'|',
 '|2セルベッドの候補が割り当てられた数|'+t.proposedTwoCellBeds+'|',
 '|2セルベッドの候補が残った数|'+t.bedsMissingUsableSecondCell+'|',
 '|家具の占有を入れて入口から全床へ到達できる部屋|'+t.roomsWithConnectedSingleCellWalkways+'|',
 '|再設計を要する部屋|'+t.roomsRequiringRevision+'|',
 '|2x2の空き床候補がない部屋|'+t.roomsWithoutFree2x2Space+'|',
 '|歩ける領域から孤立した室内床セル|'+t.disconnectedInteriorCells+'|',
 '|家具に隣接するアクセス経路がない箇所|'+t.furnitureAccessFailures+'|',
 '|家具占有範囲の重複セル|'+t.furnitureOverlaps+'|',
 '',
 '検証方法：元の設計位置を動かさず、ベッドが隣接2セルを使う仮定で組み合わせを探索。'+
 '他の家具との重複、扉の内側の通行可能性、家具の隣まで到達できるかを検査。',
 '2x2空間は候補の存在だけを数え、法令や現実の車いす対応などは認証しない。',
 '',
 '## 再検討が必要な場所（抜粋）',
 ...data.report.selectedIssueSamples.slice(0,40).map(x=>
  '- '+x.building+' / '+x.room+'（L'+x.level+'）: '+x.issues.join(', ')),
 '',
 '## 次の工程',
 'B112：B100〜B111全体の整合性・施工禁止監査とローカルWorkに渡す資料の整理。',
 'B112完了時に「次のB113ではローカルWorkを使用」と明示。その次のチャットはWork用プロンプト作成に専念。',
 '',
 '施工禁止：NOT_PREPARED / 9 BLOCKED / worldContacts=0 / worldCoordinates=null / BuildPlan.operations=[]。',
 '本工程で実際に家具を配置・ドアを設置・階段を通行したわけではない。'
 ];
 fs.writeFileSync(mdFile,lines.join('\n')+'\n');
 const type=['house','hotel','apartment','office','library'];
 fs.writeFileSync(examplesFile,type.map(kind=>{
  const model=data.models.find(x=>x.typology===kind),room=model.rooms[0];
  return kind.toUpperCase()+' / '+model.id+' / '+room.roomId+' / '+room.decision+
    '\nD=door interior, B=bed, S=shelf, T=desk, C=seat, F=fixture, a=reachable approach, #=room wall\n'+
    drawB111RoomAscii(room)+'\n';
 }).join('\n')+'\n');
 return {reportFile,modelsFile,mdFile,examplesFile,buildings:15,rooms:t.rooms};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const x=assembleB111();
 const files=process.argv.includes('--write-review')?writeB111(x,path.resolve('b111-review-output')):null;
 console.log(JSON.stringify({totals:x.report.totals,files},null,2));
}
