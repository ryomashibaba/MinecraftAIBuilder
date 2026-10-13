/** B110 — 15 offline Education-first functional interfaces.
 * No Minecraft communication. Never exports executable placements.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateB100} from '../../b100/main/compile-b100.mjs';
import {validateUniversalCandidate} from '../../b100/main/b100-universal-design.mjs';
import {B101_SCENARIOS} from '../../b101/main/compile-b101.mjs';
import {coDesignB104} from '../../b104/main/b104-joint-layout.mjs';
import {generateB105} from '../../b105/main/b105-building-volume.mjs';
import {deriveB110Interfaces,auditB110Model,inspectBlockCandidate,B110_BLOCK_CANDIDATES,B110_REFERENCE} from './b110-functional-interfaces.mjs';
export function assembleB110(){
 const frozen=JSON.parse(fs.readFileSync(new URL('../../b100/main/B100_GENERIC_DESIGN_REPORT.json',import.meta.url),'utf8'));
 if(!validateB100(frozen)||frozen.reportSha256?.length!==64)throw Error('B110_FROZEN_REPORT_FAILED');
 const models=[];
 for(const group of frozen.architectureCases){
  const programme=B101_SCENARIOS[group.caseId];
  if(!programme)throw Error('B110_UNKNOWN_PROGRAMME');
  for(const c of group.options){
   if(!validateUniversalCandidate(c,group.brief))throw Error('B110_UNSAFE_B100');
   const d=coDesignB104(c,programme),v=generateB105(d);
   const m=deriveB110Interfaces(d,v);
   if(!auditB110Model(m))throw Error('B110_BAD_MODEL');
   models.push(m);
  }
 }
 const sum=k=>models.reduce((n,m)=>n+m.metrics[k],0);
 const totals={typologies:frozen.architectureCases.length,variants:models.length,
  floors:models.reduce((n,m)=>n+m.levels,0),
  conceptRooms:sum('conceptRooms'),nominalDoors:sum('conceptualDoors'),
  conceptDoorwaysConnected:sum('nominalConnectedDoorways'),
  twoHighDoorClearances:sum('twoHighDoorClearances'),
  groundExitCandidates:sum('exteriorOpeningCandidates'),
  groundExitPairsSourcePreserved:sum('twoWideExitPairsWithAir'),
  verticalCoreLinks:sum('stairLinks'),
  sixTreadDiagrams:sum('stairTreadProxies'),
  stairProxyHeadroomMatchesB105:sum('stairLinksWithNoEnvelopeConflict'),
  furnitureAnchors:sum('fixtureAnchors'),
  bedSecondaryCellCandidates:sum('bedWithSecondCellCandidate'),
  bedLayoutsNeedReview:sum('bedNeedsLayoutReview'),
  flaggedSpatialInterfaces:sum('geometryIssues'),
  bedrockReferenceRoles:Object.keys(B110_BLOCK_CANDIDATES).length,
  versionPinnedEducationVerifiedBlocks:0,actualUsableDoors:0,
  actualTraversableStairs:0,physicallyCompletedRooms:0,
  worldContacts:0,installedBlocks:0,legacyUnapproved:296,legacyHeld:18};
 const report={schema:'minecraftaibuilder-b110-functional-readiness-review-v1',
  targetEdition:'MINECRAFT_EDUCATION',
  targetVersionFamily:'26.3_USER_REFERENCE_NOT_VERIFIED_INSTALLED_BUILD',
  frozenParentSha256:frozen.reportSha256,
  reference:B110_REFERENCE,
  materialCandidates:Object.fromEntries(Object.keys(B110_BLOCK_CANDIDATES).map(k=>[k,inspectBlockCandidate(k)])),
  cases:models.map(m=>({id:m.id,typology:m.typology,levels:m.levels,...m.metrics,
   digest:m.digest,reviewOnly:true})),
  totals,
  nextRequiredVerification:[
   'VERIFY_INSTALLED_EDUCATION_VERSION_AND_BLOCK_PALETTE_WITH_LOCAL_WORK',
   'TEST_DOOR_UPPER_LOWER_HINGE_FACING_AND_PLACEMENT_AT_APPROVED_PROBE_ONLY',
   'TEST_STAIR_STEP_HEIGHT_DIRECTION_AND_PLAYER_HEADROOM_AT_APPROVED_PROBE_ONLY',
   'VALIDATE_REAL_BED_TWO_CELL_PLACEMENT_AND_FURNITURE_BARRIER_EFFECT',
   'HUMAN_EGRESS_AND_ROOM_QUALITY_REVIEW_BEFORE_ANY_BUILD_APPROVAL'
  ],
  compatibilityVerdict:'BEDROCK_REFERENCE_PRESENT_EDUCATION_26_3_UNVERIFIED',
  doorsInstalled:false,stairsTraversableCertified:false,interiorRoomsFinished:0,
  realBlockstateMatches:0,actualWorldContacts:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,worldCoordinates:null,blockOperations:[],
  gates:frozen.gates.map(g=>({...g,status:'BLOCKED'})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 if(!validateB110Report(report))throw Error('B110_REPORT_INVALID');
 return {report,models};
}
export function validateB110Report(r){
 if(r?.schema!=='minecraftaibuilder-b110-functional-readiness-review-v1'||
 r.targetEdition!=='MINECRAFT_EDUCATION'||r.reference?.readiness!=='EDUCATION_TARGET_UNVERIFIED'||
 r.compatibilityVerdict!=='BEDROCK_REFERENCE_PRESENT_EDUCATION_26_3_UNVERIFIED'||
 r.frozenParentSha256?.length!==64||
 r.readiness!=='NOT_PREPARED'||r.worldCoordinates!==null||
 r.constructionApproved!==false||r.executionAllowed!==false||
 r.blockOperations?.length!==0||r.actualWorldContacts!==0||
 r.BuildPlan?.status!=='NOT_PREPARED'||r.BuildPlan.operations?.length!==0||
 r.BuildPlan.commandCount!==0||r.BuildPlan.worldCoordinates!==null||
 r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.cases?.length!==15||r.nextRequiredVerification?.length!==5)return false;
 const t=r.totals,sum=k=>r.cases.reduce((n,o)=>n+o[k],0);
 const map={conceptRooms:'conceptRooms',nominalDoors:'conceptualDoors',
  conceptDoorwaysConnected:'nominalConnectedDoorways',
  twoHighDoorClearances:'twoHighDoorClearances',
  groundExitCandidates:'exteriorOpeningCandidates',
  groundExitPairsSourcePreserved:'twoWideExitPairsWithAir',
  verticalCoreLinks:'stairLinks',sixTreadDiagrams:'stairTreadProxies',
  stairProxyHeadroomMatchesB105:'stairLinksWithNoEnvelopeConflict',
  furnitureAnchors:'fixtureAnchors',bedSecondaryCellCandidates:'bedWithSecondCellCandidate',
  bedLayoutsNeedReview:'bedNeedsLayoutReview',flaggedSpatialInterfaces:'geometryIssues'};
 return t.typologies===5&&t.variants===15&&t.floors===66&&
 t.conceptRooms===279&&t.nominalDoors===279&&
 t.verticalCoreLinks===102&&t.sixTreadDiagrams===612&&
 t.furnitureAnchors===558&&
 t.bedrockReferenceRoles===9&&
 t.versionPinnedEducationVerifiedBlocks===0&&t.actualUsableDoors===0&&
 t.actualTraversableStairs===0&&t.physicallyCompletedRooms===0&&
 t.worldContacts===0&&t.installedBlocks===0&&
 t.legacyUnapproved===296&&t.legacyHeld===18&&
 r.realBlockstateMatches===0&&r.doorsInstalled===false&&
 r.stairsTraversableCertified===false&&r.interiorRoomsFinished===0&&
 Object.entries(map).every(([k,v])=>t[k]===sum(v))&&
 r.cases.every(c=>c.digest?.length===64&&c.reviewOnly===true)&&
 Object.values(r.materialCandidates??{}).length===9&&
 Object.values(r.materialCandidates).every(c=>c.executable===false&&
 c.education26_3Status==='UNVERIFIED_LOCAL_BUILD');
}
export function writeB110(data,outputDir){
 if(!validateB110Report(data?.report)||data.models?.length!==15||
 !data.models.every(auditB110Model))throw Error('B110_EXPORT_UNSAFE');
 fs.mkdirSync(outputDir,{recursive:true});
 const reportFile=path.join(outputDir,'B110_Offline_Functional_Readiness.json');
 const modelFile=path.join(outputDir,'B110_All_15_Building_Interfaces.json');
 const reviewFile=path.join(outputDir,'B110_Review_Next_Actions_JA.md');
 fs.writeFileSync(reportFile,JSON.stringify(data.report,null,2)+'\n');
 fs.writeFileSync(modelFile,JSON.stringify(data.models,null,2)+'\n');
 const t=data.report.totals;
 const md=[
 '# B110 — 建物15案の施工可能性・インターフェース準備レビュー',
 '',
 'これはMinecraft Educationの施工データではなく、実機で確認すべき場所を整理したオフライン検証結果です。',
 '',
 '|対象|オフライン候補数|実機認証数|',
 '|---|---:|---:|',
 '|部屋の概念ドア|'+t.nominalDoors+'|0|',
 '|階段の接続候補|'+t.verticalCoreLinks+'|0|',
 '|階段踏み面の概念図|'+t.sixTreadDiagrams+'|0|',
 '|家具アンカー|'+t.furnitureAnchors+'|0|',
 '|実際のEducation 26.3/26.32 BlockState|9種類の参照候補|0|',
 '',
 '概念的なドア接続：'+t.conceptDoorwaysConnected+' / '+t.nominalDoors,
 '概念的な外部開口：'+t.groundExitPairsSourcePreserved+' / '+t.groundExitCandidates,
 '家具の二セルベッド候補：'+t.bedSecondaryCellCandidates+'、追加検討：'+t.bedLayoutsNeedReview,
 '検証を要する概念位置：'+t.flaggedSpatialInterfaces,
 '',
 '## 重要：環境互換性',
 'MicrosoftのBedrock公式ブロックリストに記載されているという事実は、利用者のMinecraft Educationインストール環境での動作・設置可能性を証明しません。',
 'ローカルWorkで実機バージョンと状態辞書を検証するまで、対応状況は UNVERIFIED です。',
 '',
 '## 次に必要な実機作業（承認付きの別工程）',
 ...data.report.nextRequiredVerification.map((x,i)=>String(i+1)+'. '+x),
 '',
 '## 永続安全条件',
 'NOT_PREPARED / 9 BLOCKED / worldContacts=0 / BuildPlan.operations=[] / worldCoordinates=null / constructionApproved=false。',
 '旧296未承認と18保留を変更していません。'
 ].join('\n');
 fs.writeFileSync(reviewFile,md+'\n');
 return {reportFile,modelFile,reviewFile,typologies:5,buildings:15};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const r=assembleB110();
 console.log(JSON.stringify({totals:r.report.totals,artifacts:process.argv.includes('--write-review')?
  writeB110(r,path.resolve('b110-review-output')):null},null,2));
}
