/**
 * B130 Windows offline lab collection wizard.
 * No game APIs, PowerShell, subprocesses, network, world coordinates or commands.
 * Evidence files are copied ONLY after manual selection and validation; never uploaded.
 * Human self-reports and hashes are NOT authenticated real Minecraft readbacks.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import readline from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {emptyB128ReceiptBatch,analyzeB128ReadbackReceipts} from '../../b128/main/b128-readback-receipts.mjs';
import {validateB129CalibrationPlan,analyzeB129RepeatedCalibration} from '../../b129/main/b129-repeated-calibration.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const allowedExt=new Set(['.png','.jpg','.jpeg','.webp']);
const maxProofSize=25*1024*1024;
const parseJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const PACKAGE_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const pathsFor=root=>({
 plan:path.join(root,'B129_Isolated_Calibration_Protocol.json'),
 records:path.join(root,'data','B130_Observation_Receipts.json'),
 evidence:path.join(root,'evidence'),
 review:path.join(root,'data','B130_Offline_Receipt_Review.json')
});
function getPlan(root){
 const x=parseJSON(pathsFor(root).plan);
 if(!validateB129CalibrationPlan(x))throw Error('B130_INVALID_SOURCE_PLAN');
 return x;
}
function loadRecords(root,plan){
 const p=pathsFor(root).records;
 const data=fs.existsSync(p)?parseJSON(p):
  emptyB128ReceiptBatch(plan.sourceB127Integrity);
 analyzeB128ReadbackReceipts({sourceB127Integrity:plan.sourceB127Integrity,batch:data});
 return data;
}
function evidenceFileInfo(filename){
 if(typeof filename!=='string'||!filename)throw Error('B130_MISSING_MANUAL_PROOF');
 const ext=path.extname(filename).toLowerCase();
 if(!allowedExt.has(ext))throw Error('B130_UNSUPPORTED_EVIDENCE_IMAGE');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>maxProofSize)
  throw Error('B130_BAD_EVIDENCE_FILE');
 const bytes=fs.readFileSync(filename);
 return {digest:sha(bytes),bytes,ext};
}
function ensureProofCopies(root,records){
 const d=pathsFor(root).evidence;
 for(const r of records.receipts)for(const o of r.observations){
  const candidates=fs.existsSync(d)?fs.readdirSync(d)
   .filter(n=>n.startsWith(o.evidenceSha256+'.')&&allowedExt.has(path.extname(n).toLowerCase())):[];
  if(candidates.length!==1)throw Error('B130_EVIDENCE_IMAGE_MISSING_OR_DUPLICATED');
  if(sha(fs.readFileSync(path.join(d,candidates[0])))!==o.evidenceSha256)
   throw Error('B130_EVIDENCE_IMAGE_TAMPERED');
 }
}
function atomicJSON(filename,value){
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const temporary=filename+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{flag:'w'});
 fs.renameSync(temporary,filename);
}
export function inspectB130Package(root=PACKAGE_ROOT){
 if(Number(process.versions.node.split('.')[0])<22)throw Error('B130_NODE_22_REQUIRED');
 const plan=getPlan(root),batch=loadRecords(root,plan);
 ensureProofCopies(root,batch);
 const review=analyzeB129RepeatedCalibration({
  sourceB127Integrity:plan.sourceB127Integrity,
  sourceShape:plan.expectedSourceProxyShape,batch});
 const status={
  sourceB127Integrity:plan.sourceB127Integrity,
  totalTrialSlots:plan.requiredTrials.length,
  humanClaimedReceiptCount:review.humanClaimedTrials,
  remainingTrialIds:review.missingTrials,
  claimConsistentDirectionMappings:review.claimConsistentDirectionPermutations,
  warningStatus:review.status,
  evidenceAuthenticityIndependentlyCertified:false,
  educationBlockstatesCertified:false,
  realMovementCertified:false,
  constructionAllowed:false,worldContacts:0,worldCoordinates:null,operations:[]
 };
 return {plan,batch,review,status};
}
export function addB130ManualObservation({
 root=PACKAGE_ROOT,trialId,educationVersion,stateValue,observedUpperHalfShape,
 proofFile,readbackConfirmed,observedAt
}){
 if(readbackConfirmed!==true)throw Error('B130_READBACK_NOT_EXPLICITLY_CONFIRMED');
 const {plan,batch}=inspectB130Package(root);
 const trial=plan.requiredTrials.find(t=>t.trialId===trialId);
 if(!trial)throw Error('B130_UNKNOWN_CALIBRATION_TRIAL');
 if(batch.receipts.some(r=>r.receiptId===trialId))throw Error('B130_TRIAL_ALREADY_RECORDED');
 if(!Number.isInteger(stateValue)||stateValue<0||stateValue>3)
  throw Error('B130_STATE_VALUE_MUST_BE_READBACK_0_TO_3');
 if(!['FORWARD_UPPER_HALF','REVERSE_UPPER_HALF','UNOBSERVED'].includes(observedUpperHalfShape))
  throw Error('B130_BAD_REPORTED_TREAD_SHAPE');
 const proof=evidenceFileInfo(proofFile);
 const stamp=observedAt??new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
 const record={
  receiptId:trialId,sourceB127Integrity:plan.sourceB127Integrity,
  edition:'Minecraft Education',version:educationVersion,
  specimenScope:'ISOLATED_NON_PRODUCTION',observedAt:stamp,
  observations:[{stateValue,observedAscent:trial.ascent,
   observedUpperHalfShape,readbackClaimed:true,
   evidenceSha256:proof.digest,traversalClaim:'NOT_TESTED'}]
 };
 const candidate={...batch,receipts:[...batch.receipts,record]};
 // Never write records that fail strict B128 or B129 validation.
 analyzeB128ReadbackReceipts({
  sourceB127Integrity:plan.sourceB127Integrity,batch:candidate});
 const review=analyzeB129RepeatedCalibration({
  sourceB127Integrity:plan.sourceB127Integrity,
  sourceShape:plan.expectedSourceProxyShape,batch:candidate});
 const file=path.join(pathsFor(root).evidence,proof.digest+proof.ext);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file))throw Error('B130_DUPLICATED_PROOF_FILE');
 fs.writeFileSync(file,proof.bytes,{flag:'wx'});
 atomicJSON(pathsFor(root).records,candidate);
 atomicJSON(pathsFor(root).review,{
  status:review.status,trialCount:review.humanClaimedTrials,
  missingTrials:review.missingTrials,
  shapeMismatchReports:review.sourceProxyShapeMismatchReports,
  timingHolds:review.repeatTimestampSpacingViolations,
  claimConsistentDirectionMappings:review.claimConsistentDirectionPermutations,
  realEducationMappingCertified:false,realMovementCertified:false,
  constructionAllowed:false,worldContacts:0,operations:[],
  warning:'ONLY HUMAN CLAIMS; SCREENSHOTS HAVE NOT BEEN AUTHENTICATED'
 });
 return inspectB130Package(root).status;
}
async function wizard(root=PACKAGE_ROOT){
 const rl=readline.createInterface({input,output});
 try{
  for(;;){
   const {status}=inspectB130Package(root);
   console.log('\nB130 Minecraft Education 階段校正記録（オフライン・非施工）');
   console.log('完了申告 '+status.humanClaimedReceiptCount+
    '/'+status.totalTrialSlots+' / 実機認証 0 / 残り '+status.remainingTrialIds.length);
   console.log('状態: '+status.warningStatus);
   if(!status.remainingTrialIds.length){console.log('受付枠終了。証拠内容の独立確認が必要です。');break;}
   console.log('次の観察枠: '+status.remainingTrialIds[0]+
    '（実験はMinecraft Educationの隔離された検証用ワールドに限る）');
   const proceed=(await rl.question('登録は R / 終了は Q: ')).trim().toUpperCase();
   if(proceed!=='R')break;
   const next=status.remainingTrialIds[0];
   const actual=(await rl.question('実機で階段を調べ、状態値を読み取りましたか？ 本当に実施した場合のみ READBACK と入力: ')).trim();
   if(actual!=='READBACK'){console.log('未実施として残します。');continue;}
   const version=(await rl.question('表示・確認した Minecraft Education の正確な版 (例: 1.26.32.0): ')).trim();
   const value=Number((await rl.question('本当にreadbackした weirdo_direction 値（0〜3）: ')).trim());
   const shape=(await rl.question('踏面の見え方 FORWARD_UPPER_HALF / REVERSE_UPPER_HALF / UNOBSERVED: ')).trim();
   const filename=(await rl.question('自分で撮影した証拠画像ファイル(.png/.jpg/.jpeg/.webp)のパス: ')).trim().replace(/^"|"$/g,'');
   const approved=(await rl.question('この画像をオフライン記録フォルダーへコピーしますか？ YES で確定: ')).trim();
   if(approved!=='YES'){console.log('画像は読み込まず、登録も行いません。');continue;}
   try{
    const s=addB130ManualObservation({
     root,trialId:next,educationVersion:version,stateValue:value,
     observedUpperHalfShape:shape,proofFile:filename,readbackConfirmed:true
    });
    console.log('ローカルに記録しました。状態: '+s.warningStatus);
   }catch(e){console.error('登録できません: '+e.message);}
  }
 }finally{rl.close();}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const action=process.argv[2]??'--interactive';
  if(action==='--check')console.log(JSON.stringify(inspectB130Package().status,null,2));
  else if(action==='--interactive')await wizard();
  else throw Error('B130_ONLY_CHECK_OR_INTERACTIVE');
 }catch(e){console.error('B130安全停止: '+e.message);process.exitCode=1;}
}
