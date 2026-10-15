/** B129: offline-only engineering packet for repeated isolated Education orientation tests. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateB127} from '../../b127/main/b127-fleet-calibration-review.mjs';
import {validateB128,readB128ReceiptBatchFile} from '../../b128/main/b128-fleet-intake-review.mjs';
import {emptyB128ReceiptBatch} from '../../b128/main/b128-readback-receipts.mjs';
import {createB129CalibrationPlan,validateB129CalibrationPlan,
 analyzeB129RepeatedCalibration} from './b129-repeated-calibration.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const read=(folder,name)=>JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
function guard(x,label){
 if(x?.readiness!=='NOT_PREPARED'||x.executionAllowed!==false||
  x.constructionApproved!==false||x.worldContacts!==0||x.worldCoordinates!==null||
  x.commandCount!==0||x.gates?.length!==9||
  x.gates.some(g=>g.status!=='BLOCKED')||
  x.BuildPlan?.operations?.length!==0)
 throw Error('B129_UNSAFE_SOURCE_'+label);
}
export function assembleB129(providedBatch=null){
 const b127=read('b127-review-output','B127_Halfstep_Facing_Offline_Review.json');
 const b128=read('b128-review-output','B128_Offline_Readback_Intake_Review.json');
 if(!validateB127(b127)||!validateB128(b128)||
  b128.sourceB127Integrity!==b127.integritySha256||
  b127.totals.configurationsReviewed!==b128.totals.candidateConcepts)
 throw Error('B129_PARENT_DIGEST_OR_INVENTORY_DRIFT');
 guard(b127,'B127');guard(b128,'B128');
 const sourceConcepts=b127.cases.flatMap(c=>c.reviews.filter(r=>
   r.shape==='STRAIGHT_HALF_STEP_PROXY'));
 if(sourceConcepts.length!==1||
  sourceConcepts[0].sourceProxyPreferredHalfShape!=='FORWARD_UPPER_HALF'||
  sourceConcepts[0].minimumShapeMismatchSamples!==0)
 throw Error('B129_NO_UNAMBIGUOUS_SOURCE_STEP_SHAPE');
 const sourceShape=sourceConcepts[0].sourceProxyPreferredHalfShape;
 const plan=createB129CalibrationPlan(b127.integritySha256,sourceShape);
 const batch=providedBatch??emptyB128ReceiptBatch(b127.integritySha256);
 const intake=analyzeB129RepeatedCalibration({
  sourceB127Integrity:b127.integritySha256,sourceShape,batch});
 const totals={
  buildings:b127.totals.buildings,
  sourceStairs:b127.totals.originalStairs,
  sourceFloors:b127.totals.originalFloors,
  shortlistedDesignConcepts:b127.totals.configurationsReviewed,
  requiredIsolatedHumanTrialSlots:plan.requiredTrials.length,
  actualHumanReceiptsSupplied:intake.humanClaimedTrials,
  missingTrialSlots:intake.missingTrials.length,
  directionHypothesesNotContradictedByClaims:intake.claimConsistentDirectionPermutations,
  certifiedRealEducationOrientationMappings:0,
  certifiedActualStairTraversal:0,
  sourceBlocksChanged:0,worldContacts:0
 };
 if(totals.buildings!==15||totals.sourceStairs!==102||
  totals.sourceFloors!==66||totals.shortlistedDesignConcepts!==1||
  totals.requiredIsolatedHumanTrialSlots!==8)
 throw Error('B129_FLEET_INVENTORY_OR_PROTOCOL_DRIFT');
 const data={
  schema:'minecraftaibuilder-b129-repeated-orientation-calibration-packet-v1',
  sourceB128Integrity:b128.integritySha256,
  sourceB127Integrity:b127.integritySha256,
  plan,intake,totals,
  limitations:[
   'EIGHT_REPEATED_MANUAL_TRIAL_SLOTS_ARE_PROTOCOL_NOT_EXECUTION',
   'REAL_GAME_EVIDENCE_AND_IMAGE_CONTENT_NOT_COLLECTED_OR_AUTHENTICATED',
   'SELF_REPORTED_VALUES_DO_NOT_CERTIFY_MINECRAFT_EDUCATION_MAPPING',
   'NO_WALKABILITY_COLLISION_DOOR_OR_SLAB_SUPPORT_CERTIFICATION',
   'ORIGINAL_NINE_CONSTRUCTION_GATES_STILL_BLOCKED'
  ],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b128.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}
 };
 return {...data,integritySha256:H(data)};
}
export function validateB129(x){
 try{
  const {integritySha256,...base}=x??{},t=x.totals,i=x.intake;
  return H(base)===integritySha256&&
   x.schema==='minecraftaibuilder-b129-repeated-orientation-calibration-packet-v1'&&
   validateB129CalibrationPlan(x.plan)&&
   x.sourceB127Integrity===x.plan.sourceB127Integrity&&
   i.sourceB127Integrity===x.sourceB127Integrity&&
   i.trialPlanDigest===x.plan.integritySha256&&
   t.buildings===15&&t.sourceStairs===102&&t.sourceFloors===66&&
   t.shortlistedDesignConcepts===1&&t.requiredIsolatedHumanTrialSlots===8&&
   t.actualHumanReceiptsSupplied===i.humanClaimedTrials&&
   t.missingTrialSlots===i.missingTrials.length&&
   t.certifiedRealEducationOrientationMappings===0&&t.certifiedActualStairTraversal===0&&
   t.sourceBlocksChanged===0&&t.worldContacts===0&&
   i.actualEducationBlockStateMappingCertified===false&&
   i.actualPhysicalStairTraversalCertified===false&&
   i.evidenceImageContentIndependentlyReviewed===false&&
   i.constructionAllowed===false&&i.executionAllowed===false&&
   i.worldContacts===0&&i.worldCoordinates===null&&i.operations.length===0&&
   x.readiness==='NOT_PREPARED'&&x.constructionApproved===false&&
   x.executionAllowed===false&&x.worldContacts===0&&x.worldCoordinates===null&&
   x.commandCount===0&&x.gates.length===9&&x.gates.every(g=>g.status==='BLOCKED')&&
   x.BuildPlan?.status==='NOT_PREPARED'&&x.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB129(x,out){
 if(!validateB129(x))throw Error('B129_BLOCKED_UNSAFE_REPORT');
 fs.mkdirSync(out,{recursive:true});
 const report=path.join(out,'B129_Repeatability_Gate_Offline_Report.json'),
  protocol=path.join(out,'B129_Isolated_Calibration_Protocol.json'),
  worksheet=path.join(out,'B129_Manual_Calibration_Worksheet_JA.md'),
  empty=path.join(out,'B129_Empty_Receipt_Batch.json');
 fs.writeFileSync(report,JSON.stringify(x,null,2)+'\n');
 fs.writeFileSync(protocol,JSON.stringify(x.plan,null,2)+'\n');
 fs.writeFileSync(empty,JSON.stringify(emptyB128ReceiptBatch(x.sourceB127Integrity),null,2)+'\n');
 const t=x.totals;
 fs.writeFileSync(worksheet,[
 '# B129 — 階段の向き校正・手動計測票（非施工、自動操作なし）','',
 'この資料の出力時にはMinecraft Educationへ接続していません。これは独立した検証用ワールドを将来、利用者の明示承認を得て試験する場合の**観察項目**です。',
 '実世界座標、ブロック操作コマンド、設置スクリプトは含めません。生産建物への変更は一切禁止です。','',
 '## 目的と元設計',
 '- 15棟・102階段・66階床の元設計は変更しない',
 '- B127元踏面形状（設計のみ）: '+x.plan.expectedSourceProxyShape,
 '- 方向候補: 0/1/2/3 の4つの状態値と4方角の対応、24通りが未校正',
 '- 今回の実験観察: 2ラウンド×4方角＝8枠。両ラウンドは各方角で60秒以上離して別々の観察・証拠が必要',
 '- B128は版・観察時刻・試験領域・画像ハッシュ・方向申告の重複や矛盾を拒否する',
 '',
 '## 観察票（すべて未実施）',
 '|ID|ラウンド|想定上り方向|要記録項目|状態|',
 '|---|---:|---|---|---|',
 ...x.plan.requiredTrials.map(tr=>'|'+tr.trialId+'|'+tr.round+'|'+tr.ascent+
  '|Education版・UTC時刻・readbackした状態値・段の前後半形状・固有証拠SHA256|未実施|'),
 '',
 '## 証拠を入力するとき',
 '- B129_Empty_Receipt_Batch.jsonのreceipts配列は実測値がないため空。架空の値は書かない',
 '- 1観察を1つのreceiptに記録。receiptIdは表の LAB-R1-EAST などを正確に使用する',
 '- observedAscent はreceiptIdの方角、stateValueは実機で読んだ0〜3、observedUpperHalfShapeは見た観察内容を記録',
 '- 申告だけで実機認証しない。仮に8件が形式一致しても「独立の証拠レビューが必要」で止める',
 '- 版が異なる、向きに矛盾する、途中で上り方向が変わる、元踏面形状と合わない場合はHOLD',
 '',
 '## 現在の実測データ数値',
 '|検証項目|結果|','|---|---:|',
 '|元建物|'+t.buildings+'|',
 '|元階段|'+t.sourceStairs+'|',
 '|元階床|'+t.sourceFloors+'|',
 '|必要な観察枠|'+t.requiredIsolatedHumanTrialSlots+'|',
 '|提供済み実機観察記録|'+t.actualHumanReceiptsSupplied+'|',
 '|未実施枠|'+t.missingTrialSlots+'|',
 '|未否定の方向対応仮説|'+t.directionHypothesesNotContradictedByClaims+'|',
 '|実階段の通行認証|0|',
 '',
 '**NOT_PREPARED。既存の9ゲートはすべてBLOCKED。実機未接続、BuildPlan.operations=[]、worldContacts=0。**'
 ].join('\n')+'\n');
 return {report,protocol,worksheet,empty};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const provided=process.argv[3]?readB128ReceiptBatchFile(process.argv[3]):null;
 const x=assembleB129(provided);
 console.log(JSON.stringify({totals:x.totals,outputs:writeB129(x,path.resolve(process.argv[2]??'b129-review-output'))},null,2));
}
