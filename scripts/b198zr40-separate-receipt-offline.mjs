/**
 * R40: externally stored (not independently authenticated) SHA receipt for R38.
 * A receipt MUST be stored outside the R38 bundle; it may be copied/edited,
 * so no trusted external anchoring, human authorship, model quality or world
 * authorization is ever certified. No network, Ollama or Minecraft.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readR38Bundle} from './b198zr38-audit-bundle-offline.mjs';
export const SCHEMA='minecraftaibuilder-b198zr40-separate-receipt-v1';
export const RECEIPT_FILE='R40_MANIFEST_RECEIPT.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hex64=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const same=(o,fields)=>obj(o)&&Object.keys(o).length===fields.length&&fields.every(x=>Object.hasOwn(o,x));
const fields=['schema','dataKind','manifestSha256','snapshotSha256','tailDigest',
 'entries','pins','manifestPinProvidedAtCreation','receiptIsHumanAuthenticated',
 'externalAnchorAuthenticated','modelCalls','worldContacts','worldWrites'];
const pinFields=['candidateSha256','briefSha256','r36ReviewEvidenceSha256'];
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 worldContacts:0,worldWrites:0,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const failure=(code)=>{throw Error('R40_'+code)};
const yes=(condition,code)=>{if(!condition)failure(code)};
const jsonBytes=x=>Buffer.from(JSON.stringify(x,null,2)+'\n','utf8');
function existingDir(directory){
 yes(typeof directory==='string'&&directory.length>0&&!directory.includes('\0'),'DIRECTORY_ARGUMENT');
 const st=fs.lstatSync(directory);
 yes(st.isDirectory()&&!st.isSymbolicLink(),'DIRECTORY_UNSAFE');
 return fs.realpathSync(directory);
}
function receiptLocation(bundleDir,receiptPath){
 yes(typeof receiptPath==='string'&&receiptPath.trim().length>0&&
  !receiptPath.includes('\0'),'RECEIPT_ARGUMENT');
 const root=existingDir(bundleDir);
 const output=path.resolve(receiptPath);
 const parent=existingDir(path.dirname(output));
 const actual=path.join(parent,path.basename(output));
 const relative=path.relative(root,actual);
 yes(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative),
  'RECEIPT_INSIDE_BUNDLE');
 return actual;
}
function validReceipt(r){
 return same(r,fields)&&r.schema===SCHEMA&&
  r.dataKind==='R37_REVIEWER_CLAIMS_NOT_HUMAN_CERTIFIED'&&
  hex64(r.manifestSha256)&&hex64(r.snapshotSha256)&&hex64(r.tailDigest)&&
  Number.isSafeInteger(r.entries)&&r.entries>=1&&r.entries<=24&&
  same(r.pins,pinFields)&&pinFields.every(k=>hex64(r.pins[k]))&&
  typeof r.manifestPinProvidedAtCreation==='boolean'&&
  r.receiptIsHumanAuthenticated===false&&
  r.externalAnchorAuthenticated===false&&
  r.modelCalls===0&&r.worldContacts===0&&r.worldWrites===0;
}
function compare(bundle,r){
 return bundle.manifestSha256===r.manifestSha256&&
  bundle.snapshotSha256===r.snapshotSha256&&
  bundle.tailDigest===r.tailDigest&&bundle.entries===r.entries&&
  pinFields.every(k=>bundle.pins[k]===r.pins[k]);
}
/** Generates only a claimed external receipt. The hash values are obtained
 * from a valid R38 bundle at call time, not from a trusted public authority.
 */
export function prepareR40Receipt({directory,expectedPins=null}={}){
 const data=readR38Bundle({directory,expectedPins});
 const receipt={
  schema:SCHEMA,dataKind:'R37_REVIEWER_CLAIMS_NOT_HUMAN_CERTIFIED',
  manifestSha256:data.manifestSha256,
  snapshotSha256:data.snapshotSha256,
  tailDigest:data.tailDigest,entries:data.entries,
  pins:data.pins,
  manifestPinProvidedAtCreation:false,
  receiptIsHumanAuthenticated:false,externalAnchorAuthenticated:false,
  modelCalls:0,worldContacts:0,worldWrites:0
 };
 yes(validReceipt(receipt),'RECEIPT_SCHEMA');
 return {receipt,bytes:jsonBytes(receipt),safety:safety()};
}
/** Refuses existing receipts and any receipt path inside the bundle.
 * Creates exactly one file, never modifies the R38 bundle or previous receipts.
 */
export function saveR40Receipt({directory,receiptPath,expectedPins=null}={}){
 const location=receiptLocation(directory,receiptPath);
 const prepared=prepareR40Receipt({directory,expectedPins});
 // wx also refuses existing regular files or symlinks (incl. dangling).
 fs.writeFileSync(location,prepared.bytes,{flag:'wx',mode:0o600});
 let digest=null;
 try{
  const raw=fs.readFileSync(location);
  yes(raw.equals(prepared.bytes),'POSTWRITE_BYTES');
  digest=sha(raw);
 }catch(e){
  // On readback failure leave the file as potential evidence; never overwrite.
  throw e;
 }
 return {
  schema:SCHEMA,status:'SEPARATE_RECEIPT_SAVED_NOT_AUTHENTICATED',
  receiptPath:location,receiptSha256:digest,
  manifestSha256:prepared.receipt.manifestSha256,
  snapshotSha256:prepared.receipt.snapshotSha256,
  tailDigest:prepared.receipt.tailDigest,
  needsOperatorControlledSeparateStorage:true,
  receiptStorageDurabilityVerified:false,
  receiptAuthenticated:false,
  modelCalls:0,worldContacts:0,worldWrites:0,safety:safety()
 };
}
function loadReceipt(bundleDir,receiptPath){
 const location=receiptLocation(bundleDir,receiptPath);
 const st=fs.lstatSync(location);
 yes(st.isFile()&&!st.isSymbolicLink()&&st.size>0&&st.size<=32768,
  'RECEIPT_FILE_UNSAFE');
 const raw=fs.readFileSync(location);
 let receipt;
 try{receipt=JSON.parse(raw.toString('utf8'))}catch{failure('RECEIPT_INVALID_JSON')}
 yes(validReceipt(receipt),'RECEIPT_SCHEMA');
 yes(raw.equals(jsonBytes(receipt)),'RECEIPT_NONCANONICAL');
 return {receipt,receiptSha256:sha(raw)};
}
/** No writes. This can detect a self-consistently rewritten R38 bundle
 * when the independently kept receipt has not also been changed.
 */
export function verifyR40Receipt({directory,receiptPath,expectedPins=null}={}){
 const base={
  schema:SCHEMA,externalAnchorAuthenticated:false,
  humanReviewerAuthenticated:false,
  r25Status:'HOLD',modelImprovementCertified:false,
  minecraftConstructionApproved:false,receiptWasExternallyStoredByThisTool:false,
  originalSourceFilesAuthenticated:false,
  filesModifiedByVerification:false,
  modelCalls:0,worldContacts:0,worldWrites:0,safety:safety()
 };
 try{
  const {receipt,receiptSha256}=loadReceipt(directory,receiptPath);
  const bundle=readR38Bundle({directory,expectedPins});
  if(!compare(bundle,receipt))
   return {...base,status:'HOLD_SEPARATE_RECEIPT_MISMATCH',
    diagnosticCode:'R38_CONTENT_DIFFERS_FROM_RECEIPT',receiptSha256,
    receiptManifestSha256:receipt.manifestSha256,
    observedManifestSha256:bundle.manifestSha256};
  return {...base,status:'SEPARATE_RECEIPT_MATCH_NOT_AUTHENTICATED',
   diagnosticCode:expectedPins===null?'MATCH_WITHOUT_EXTERNAL_SOURCE_PINS':
    'MATCH_WITH_CALLER_SUPPLIED_SOURCE_PINS',
   receiptSha256,manifestSha256:bundle.manifestSha256,
   snapshotSha256:bundle.snapshotSha256,
   tailDigest:bundle.tailDigest,entries:bundle.entries,
   suppliedSourcePinsAuthenticityVerified:false
  };
 }catch(e){
  const msg=String(e?.message||'R40_UNKNOWN');
  // Do not disclose input paths or potentially private review content.
  const known=msg.match(/^(R40_[A-Z_]+|R38_[A-Za-z0-9_.]+)$/)?.[1];
  return {...base,status:'HOLD_SEPARATE_RECEIPT_VERIFICATION',
   diagnosticCode:known||'FILESYSTEM_OR_UNRECOGNIZED_ERROR'};
 }
}
