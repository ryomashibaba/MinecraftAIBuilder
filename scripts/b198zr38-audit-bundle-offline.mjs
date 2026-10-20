/**
 * R38 — local, offline-only R37 review CLAIM ledger export and read-back.
 *
 * Store only the synthetic or externally supplied reviewer claim ledger, not
 * Qwen raw responses, Minecraft coordinates, attached images, or permission.
 * No model, network, world adapter, background process, or auto-repair.
 * A self-consistent hash bundle is NOT authenticated authorship, durable
 * trusted timestamp, external anchoring, append-only storage, or approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyR37Ledger} from './b198zr37-human-quality-audit-offline.mjs';

export const SCHEMA='minecraftaibuilder-b198zr38-audit-bundle-v1';
export const SNAPSHOT_SCHEMA='minecraftaibuilder-b198zr38-review-claims-snapshot-v1';
export const MANIFEST_SCHEMA='minecraftaibuilder-b198zr38-review-claims-manifest-v1';
export const SNAPSHOT_FILE='R38_REVIEW_CLAIMS.json';
export const MANIFEST_FILE='R38_MANIFEST.json';
export const MAX_SNAPSHOT_BYTES=3*1024*1024;
const digest=b=>createHash('sha256').update(b).digest('hex');
const hex64=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>obj(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const encode=v=>Buffer.from(JSON.stringify(v,null,2)+'\n','utf8');
const err=id=>{throw Error('R38_'+id)};
const yes=(v,id)=>{if(!v)err(id)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const pinKeys=['candidateSha256','briefSha256','r36ReviewEvidenceSha256'];
const snapshotKeys=['schema','dataKind','pins','entries','tailDigest','qualityCertified','modelCalls','worldContacts','worldWrites','safety'];
const manifestKeys=['schema','snapshotFile','snapshotBytes','snapshotSha256',
 'entries','tailDigest','dataKind','modelCalls','worldContacts','worldWrites'];
const allowedFiles=[MANIFEST_FILE,SNAPSHOT_FILE].sort();
function checkPins(p){
 yes(exact(p,pinKeys)&&pinKeys.every(k=>hex64(p[k])),'PINS');
 return p;
}
function checkEntries(entries,pins){
 yes(Array.isArray(entries)&&entries.length>=1&&entries.length<=24,'ENTRY_COUNT');
 const result=verifyR37Ledger(entries);
 yes(result.valid,'R37_LEDGER_'+(result.reason||'INVALID'));
 yes(entries.every(e=>e.review.candidateSha256===pins.candidateSha256&&
  e.review.briefSha256===pins.briefSha256&&
  e.review.r36ReviewEvidenceSha256===pins.r36ReviewEvidenceSha256),
  'MIXED_PINS');
 return result;
}
function checkSnapshot(v){
 yes(exact(v,snapshotKeys)&&v.schema===SNAPSHOT_SCHEMA&&
  v.dataKind==='R37_REVIEWER_CLAIMS_NOT_HUMAN_CERTIFIED'&&
  v.qualityCertified===false&&v.modelCalls===0&&
  v.worldContacts===0&&v.worldWrites===0,'SNAPSHOT_FIELDS');
 const pins=checkPins(v.pins);
 const verified=checkEntries(v.entries,pins);
 yes(v.tailDigest===verified.tailDigest,'SNAPSHOT_TAIL');
 yes(JSON.stringify(v.safety)===JSON.stringify(safety()),'SNAPSHOT_SAFETY');
 return verified;
}
function checkManifest(m,bytes,snapshot,ledger){
 yes(exact(m,manifestKeys)&&m.schema===MANIFEST_SCHEMA&&
  m.snapshotFile===SNAPSHOT_FILE&&
  m.snapshotBytes===bytes.length&&m.snapshotSha256===digest(bytes)&&
  m.entries===snapshot.entries.length&&m.tailDigest===ledger.tailDigest&&
  m.dataKind===snapshot.dataKind&&m.modelCalls===0&&
  m.worldContacts===0&&m.worldWrites===0,'MANIFEST');
}
function pathCheck(directory){
 yes(typeof directory==='string'&&directory.length>0&&
  !directory.includes('\0'),'DIR_ARGUMENT');
 const dir=path.resolve(directory),st=fs.lstatSync(dir);
 yes(st.isDirectory()&&!st.isSymbolicLink(),'DIRECTORY_NOT_REAL');
 const names=fs.readdirSync(dir).sort();
 yes(JSON.stringify(names)===JSON.stringify(allowedFiles),'UNEXPECTED_FILES');
 return dir;
}
function readSizedFile(directory,name,maxBytes){
 const p=path.join(directory,name),st=fs.lstatSync(p);
 yes(st.isFile()&&!st.isSymbolicLink()&&
  st.size>0&&st.size<=maxBytes,'UNSAFE_OR_OVERSIZE_'+name);
 return fs.readFileSync(p);
}
function parseBytes(bytes,name){
 let v;
 try{v=JSON.parse(bytes.toString('utf8'))}
 catch{err('INVALID_JSON_'+name)}
 // No silent BOM stripping, loss of original bytes or accidental truncation.
 yes(Buffer.compare(encode(v),bytes)===0,'NON_CANONICAL_'+name);
 return v;
}
export function buildR38Bundle({entries,pins}={}){
 const suppliedPins=checkPins(pins);
 // Round-trip a detached value before inspecting and serializing it, so no
 // caller reference changes are reflected in saved content.
 let detached;
 try{detached=JSON.parse(JSON.stringify(entries))}
 catch{err('NON_JSON_ENTRIES')}
 const ledger=checkEntries(detached,suppliedPins);
 const snapshot={
  schema:SNAPSHOT_SCHEMA,
  dataKind:'R37_REVIEWER_CLAIMS_NOT_HUMAN_CERTIFIED',
  pins:{...suppliedPins},entries:detached,tailDigest:ledger.tailDigest,
  qualityCertified:false,modelCalls:0,worldContacts:0,worldWrites:0,
  safety:safety()
 };
 const snapshotBytes=encode(snapshot);
 yes(snapshotBytes.length<=MAX_SNAPSHOT_BYTES,'SNAPSHOT_SIZE');
 const manifest={
  schema:MANIFEST_SCHEMA,snapshotFile:SNAPSHOT_FILE,
  snapshotBytes:snapshotBytes.length,
  snapshotSha256:digest(snapshotBytes),
  entries:detached.length,tailDigest:ledger.tailDigest,
  dataKind:snapshot.dataKind,
  modelCalls:0,worldContacts:0,worldWrites:0
 };
 const manifestBytes=encode(manifest);
 return {snapshotBytes,manifestBytes,
  manifestSha256:digest(manifestBytes),
  snapshotSha256:manifest.snapshotSha256,
  entries:detached.length,tailDigest:ledger.tailDigest,
  authenticity:'NOT_AUTHENTICATED',safety:safety()};
}
/** Creates a brand new output directory, never overwrites an existing one.
 * Writes manifest LAST as completion marker. No persistent Library upload.
 * This is local filesystem convenience, NOT fault-proof transactional storage.
 */
export function writeR38Bundle({directory,entries,pins}={}){
 yes(typeof directory==='string'&&directory.trim()!==''&&
  !directory.includes('\0'),'DIR_ARGUMENT');
 const bundle=buildR38Bundle({entries,pins});
 const dir=path.resolve(directory);
 // lstat on existing directory rejects it, even if empty or symlink.
 yes(!fs.existsSync(dir),'DESTINATION_ALREADY_EXISTS');
 let created=false;
 try{
  fs.mkdirSync(dir,{recursive:false,mode:0o700});
  created=true;
  fs.writeFileSync(path.join(dir,SNAPSHOT_FILE),bundle.snapshotBytes,
   {flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(dir,MANIFEST_FILE),bundle.manifestBytes,
   {flag:'wx',mode:0o600});
  const verified=readR38Bundle({directory:dir,
   expectedManifestSha256:bundle.manifestSha256,expectedPins:pins});
  yes(verified.status==='SUPPLIED_MANIFEST_PIN_MATCHED_NOT_AUTHENTICATED',
   'POSTWRITE_VERIFY');
  return {status:'BUNDLE_WRITTEN_AND_READBACK_CHECKED_NOT_AUTHENTICATED',
   directory:dir,manifestSha256:bundle.manifestSha256,
   snapshotSha256:bundle.snapshotSha256,entries:bundle.entries,
   tailDigest:bundle.tailDigest,
   externallyAnchored:false,modelCalls:0,worldContacts:0,worldWrites:0,
   safety:safety()};
 }catch(e){
  // No preexisting files are ever removed: only cleanup the directory
  // successfully created by this call. Local malicious actors are out of scope.
  if(created)try{fs.rmSync(dir,{recursive:true,force:true})}catch{}
  throw e;
 }
}
/** Recalculates both file hashes, verifies complete R37 chain and optional
 * independent expected pins. Never infers human authenticity.
 */
export function readR38Bundle({directory,expectedManifestSha256=null,
 expectedPins=null}={}){
 const dir=pathCheck(directory);
 const manifestBytes=readSizedFile(dir,MANIFEST_FILE,32768);
 const snapshotBytes=readSizedFile(dir,SNAPSHOT_FILE,MAX_SNAPSHOT_BYTES);
 const manifest=parseBytes(manifestBytes,MANIFEST_FILE);
 const snapshot=parseBytes(snapshotBytes,SNAPSHOT_FILE);
 const ledger=checkSnapshot(snapshot);
 checkManifest(manifest,snapshotBytes,snapshot,ledger);
 if(expectedManifestSha256!==null){
  yes(hex64(expectedManifestSha256)&&
   digest(manifestBytes)===expectedManifestSha256,'MANIFEST_PIN_MISMATCH');
 }
 if(expectedPins!==null){
  const pins=checkPins(expectedPins);
  yes(pinKeys.every(k=>pins[k]===snapshot.pins[k]),'SUPPLIED_PINS_MISMATCH');
 }
 return {
  schema:SCHEMA,
  status:expectedManifestSha256===null?
   'SELF_CONSISTENT_BUNDLE_UNANCHORED':
   'SUPPLIED_MANIFEST_PIN_MATCHED_NOT_AUTHENTICATED',
  manifestSha256:digest(manifestBytes),
  snapshotSha256:digest(snapshotBytes),
  entries:snapshot.entries.length,tailDigest:ledger.tailDigest,
  pins:{...snapshot.pins},
  reviewerIdentityAuthenticated:false,
  originalEvidenceFilesRead:false,
  sourceQwenRawFileIncluded:false,
  humanArchitecturalQualityApproved:false,
  modelImprovementCertified:false,
  appendOnlyStorageVerified:false,
  externallyAnchored:false,modelCalls:0,worldContacts:0,worldWrites:0,
  safety:safety()
 };
}
