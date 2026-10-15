/** B128 fleet continuity + inert external receipt import, never world/calibration certification. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateB127} from '../../b127/main/b127-fleet-calibration-review.mjs';
import {validateB126} from '../../b126/main/b126-fleet-blockstate-review.mjs';
import {analyzeB128ReadbackReceipts,emptyB128ReceiptBatch} from './b128-readback-receipts.mjs';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const read=(folder,name)=>JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
function guard(r,label){
 if(r?.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
 r.executionAllowed!==false||r.worldContacts!==0||r.worldCoordinates!==null||
 r.commandCount!==0||r.gates?.length!==9||r.gates.some(g=>g.status!=='BLOCKED')||
 r.BuildPlan?.operations?.length!==0)throw Error('B128_UNSAFE_PARENT_'+label);
}
export function readB128ReceiptBatchFile(input){
 // This imports existing explicit human text, never launches Minecraft or performs readback.
 if(typeof input!=='string'||!input||!input.endsWith('.json'))
  throw Error('B128_ONLY_EXPLICIT_JSON_RECEIPT_INPUT');
 const b=fs.readFileSync(input);
 if(b.byteLength>32768)throw Error('B128_RECEIPT_INPUT_TOO_LARGE');
 let data;try{data=JSON.parse(b.toString('utf8'));}catch{throw Error('B128_MALFORMED_JSON');}
 return data;
}
export function assembleB128(folder='b114-review-output',providedBatch=null){
 const b127=read('b127-review-output','B127_Halfstep_Facing_Offline_Review.json');
 const b126=read('b126-review-output','B126_Stair_Blockstate_Slab_Fit_Review.json');
 if(!validateB127(b127)||!validateB126(b126)||
 b127.sourceB126Integrity!==b126.integritySha256)
 throw Error('B128_INVALID_B127_B126_SOURCE_CHAIN');
 guard(b127,'B127');guard(b126,'B126');
 const batch=providedBatch??emptyB128ReceiptBatch(b127.integritySha256);
 const receiptReview=analyzeB128ReadbackReceipts({
  sourceB127Integrity:b127.integritySha256,batch});
 const cases=b127.cases.map(c=>({
  id:c.id,originalStairs:c.originalStairs,originalFloors:c.originalFloors,
  plannedConcepts:c.reviews.map(r=>({
   stairIndex:r.stairIndex,rank:r.rank,shape:r.shape,
   previousB127Status:r.status,
   claimedMappingHypothesesRemaining:receiptReview.directionHypothesesNotContradictedByClaims,
   calibratedInActualEducation:false,
   physicallyTraversableCertified:false,
   constructionAllowed:false
  })),sourceBuildingUnmodified:true
 }));
 const t=b127.totals;
 const totals={
  buildings:cases.length,
  originalStairs:cases.reduce((n,c)=>n+c.originalStairs,0),
  originalFloors:cases.reduce((n,c)=>n+c.originalFloors,0),
  candidateConcepts:cases.reduce((n,c)=>n+c.plannedConcepts.length,0),
  humanSuppliedReceiptCount:receiptReview.submittedReceiptCount,
  humanReportedOrientationObservations:receiptReview.reportedObservationCount,
  consistentButUnverifiedStatePermutations:receiptReview.directionHypothesesNotContradictedByClaims,
  certifiedActualEducationOrientationMappings:0,
  certifiedRealPlayerTraversal:0,
  sourceBlockWrites:0,worldContacts:0};
 if(totals.buildings!==15||totals.originalStairs!==102||
 totals.originalFloors!==66||totals.candidateConcepts!==t.configurationsReviewed)
 throw Error('B128_FLEET_INVENTORY_DRIFT');
 const data={schema:'minecraftaibuilder-b128-education-readback-intake-offline-v1',
  sourceB127Integrity:b127.integritySha256,
  sourceB126Integrity:b126.integritySha256,
  receiptReview,cases,totals,
  limitations:[
   'NO_REAL_GAME_READBACK_IN_THIS_RUN',
   'USER_SUBMITTED_RECEIPT_CONTENT_AND_DIGESTS_ARE_NOT_AUTHENTICATED',
   'PROVISIONAL_DIRECTION_FILTERING_IS_NOT_EDUCATION_CERTIFICATION',
   'NO_PHYSICAL_STAIR_TRAVERSAL_OR_SUPPORT_VALIDATION',
   'ORIGINAL_NINE_CONSTRUCTION_GATES_REMAIN_BLOCKED'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  worldContacts:0,worldCoordinates:null,commandCount:0,
  gates:b127.gates.map(g=>({...g})),
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null}};
 return {...data,integritySha256:H(data)};
}
export function validateB128(r){
 try{
  const {integritySha256,...base}=r??{},t=r.totals,review=r.receiptReview;
  return H(base)===integritySha256&&
   r.schema==='minecraftaibuilder-b128-education-readback-intake-offline-v1'&&
   t.buildings===15&&t.originalStairs===102&&t.originalFloors===66&&
   t.candidateConcepts===r.cases.reduce((n,c)=>n+c.plannedConcepts.length,0)&&
   t.humanSuppliedReceiptCount===review.submittedReceiptCount&&
   t.humanReportedOrientationObservations===review.reportedObservationCount&&
   t.consistentButUnverifiedStatePermutations===review.directionHypothesesNotContradictedByClaims&&
   t.certifiedActualEducationOrientationMappings===0&&
   t.certifiedRealPlayerTraversal===0&&t.sourceBlockWrites===0&&t.worldContacts===0&&
   review.provenanceAuthenticityVerified===false&&
   review.actualEducationBlockStateMappingCertified===false&&
   review.physicalTraversalCertified===false&&review.constructionAllowed===false&&
   review.worldContacts===0&&review.worldCoordinates===null&&
   review.operations.length===0&&
   r.cases.every(c=>c.sourceBuildingUnmodified&&c.plannedConcepts.every(x=>
    x.calibratedInActualEducation===false&&
    x.physicallyTraversableCertified===false&&x.constructionAllowed===false))&&
   r.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
   r.executionAllowed===false&&r.worldContacts===0&&r.worldCoordinates===null&&
   r.commandCount===0&&r.gates.length===9&&r.gates.every(g=>g.status==='BLOCKED')&&
   r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.operations?.length===0;
 }catch{return false;}
}
export function writeB128(r,output){
 if(!validateB128(r))throw Error('B128_FAIL_CLOSED');
 fs.mkdirSync(output,{recursive:true});
 const json=path.join(output,'B128_Offline_Readback_Intake_Review.json');
 const csv=path.join(output,'B128_Unverified_Orientation_Hypotheses.csv');
 const md=path.join(output,'B128_Readback_Intake_Review_JA.md');
 const template=path.join(output,'B128_Empty_Receipt_Template.json');
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n');
 fs.writeFileSync(template,JSON.stringify(emptyB128ReceiptBatch(r.sourceB127Integrity),null,2)+'\n');
 const rows=['candidateIndex,ascentEAST,ascentNORTH,ascentWEST,ascentSOUTH,actualEducationCertified'];
 for(const [i,p] of r.receiptReview.remainingHypothesisValuesByDirection.entries())
  rows.push([i+1,...p,'NO'].join(','));
 fs.writeFileSync(csv,rows.join('\n')+'\n');
 const t=r.totals,review=r.receiptReview;
 fs.writeFileSync(md,[
  '# B128 — Minecraft Education階段の実機記録受付ゲート（非施工）','',
  '|項目|結果|','|---|---:|',
  '|原典建物|'+t.buildings+'|','|原典階段|'+t.originalStairs+'|',
  '|原典階床|'+t.originalFloors+'|','|設計候補|'+t.candidateConcepts+'|',
  '|ユーザー提供の記録|'+t.humanSuppliedReceiptCount+'|',
  '|報告された方向観察（未認証）|'+t.humanReportedOrientationObservations+'|',
  '|記録と矛盾しない方向対応候補（未認証）|'+t.consistentButUnverifiedStatePermutations+'|',
  '|実Minecraft Educationで認証済みの方向対応|0|',
  '|実階段で認証済みの通行|0|','',
  '状態: '+review.status,'',
  '観測記録は手動申告であり、画像SHA256やスキーマだけでは真正性を証明できない。',
  '実世界座標・施工コマンド・自動プレイヤー操作は取り込まない。',
  ...r.limitations.map(x=>'- '+x),'',
  '原9出口 HOLD / NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[] / worldContacts=0'
 ].join('\n')+'\n');
 return {json,csv,md,template};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const batch=process.argv[4]?readB128ReceiptBatchFile(process.argv[4]):null;
 const r=assembleB128(path.resolve(process.argv[2]??'b114-review-output'),batch);
 console.log(JSON.stringify({totals:r.totals,outputs:writeB128(r,path.resolve(process.argv[3]??'b128-review-output'))},null,2));
}
