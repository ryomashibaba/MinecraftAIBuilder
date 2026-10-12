/** B28: reconcile one real, sanitized Windows observation with the exact archived
 *  catalog fingerprint. Read-only; deliberately impossible to emit placements.
 */
import {createHash} from 'node:crypto';
import {assessB27Evidence} from './step8b-m4-evidence-gate-b27.mjs';
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const fail=x=>{throw Object.assign(new Error('B28_'+x),{code:'B28_'+x});};
const EXACT_PROOF={snapshot:'62d1de7d0148d514fded1544c254a9beab4299018dc054aff353557df0809a1f',catalog:'842de2f91b0c84c9bd601fbeae9f04e6edf6a1b97b688635163a7c7816bd3a5f'};
const allowedProof=['schema','sourceSnapshotHash','catalogSha256','educationVersion','recordCount','statusCounts','exactOrdinaryDoorRecords','meaning','containsRawRecords'];
function checkProof(p,baseline){
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==allowedProof.length||Object.keys(p).some(x=>!allowedProof.includes(x))||
 p.schema!=='minecraftaibuilder-b28-archived-catalog-proof-v1'||p.sourceSnapshotHash!==EXACT_PROOF.snapshot||
 p.catalogSha256!==EXACT_PROOF.catalog||p.sourceSnapshotHash!==baseline.source.windowsSnapshotSha256||
 p.catalogSha256!==baseline.source.sourceHashes['catalog/education.json']||
 p.educationVersion!==baseline.source.educationVersion||p.recordCount!==966||
 p.statusCounts?.verified!==827||p.statusCounts?.unsupported!==139||
 Object.keys(p.statusCounts||{}).length!==2||p.exactOrdinaryDoorRecords!==0||
 p.meaning!=='ARCHIVED_SNAPSHOT_BYTE_IDENTITY_ONLY_NOT_CURRENT_GAME_ACCEPTANCE'||p.containsRawRecords!==false)fail('UNTRUSTED_ARCHIVE_PROOF');
}
function ensureFrozen(b){
 if(b?.allBlockersOpen!==true||b?.blockers?.length!==9||b?.gate?.deployment!=='BLOCKED'||
 b?.gate?.readiness!=='NOT_PREPARED'||b?.gate?.constructionApproved!==false||
 b?.BuildPlan?.status!=='NOT_PREPARED'||b?.BuildPlan?.operations?.length!==0||
 b?.BuildPlan?.worldCoordinates!==null||b?.BuildPlan?.commandCount!==0)fail('BASELINE_GATE');
}
export function reconcileB28(probe,baseline,proof,options={}){
 ensureFrozen(baseline);checkProof(proof,baseline);
 // B27 owns strict input schema, freshness, anomaly, source and permission checks.
 const previous=assessB27Evidence(probe,baseline,options);
 const diskCatalogMatched=previous.sourceFindings.some(x=>x.key==='catalog/education.json'&&x.finding==='DISK_HASH_MATCH');
 const recovered=Boolean(diskCatalogMatched);
 const collectorContradiction=probe.materialProfile.status==='OK'&&previous.materialFinding==='PROFILE_CHANGED'&&recovered;
 const noCandidate=probe.processSummary.status==='OK'&&previous.processObservation.listenerStatus==='OK'&&
   previous.processObservation.port8000===0&&previous.processObservation.port8765===0&&
   previous.processObservation.rootPathHintCount===0&&previous.processObservation.entrypointHintCount===0;
 const currentCaptureOnly={collectedAt:probe.collectedAt,nodeProcessCount:probe.processSummary.nodeProcessCount,
  rootHints:probe.processSummary.rootPathHintCount,entrypointHints:probe.processSummary.entrypointHintCount,
  ports:{port8000:previous.processObservation.port8000,port8765:previous.processObservation.port8765}};
 const next=[
  {priority:1,key:'OFFLINE_DOOR_STAIR_MATERIAL_CONTRACT',action:'Integrate symbolic doors, stairs and palette roles as an isolated offline contract; do not select actual material IDs',needsWindowsNow:false,physicalProof:false},
  {priority:2,key:'OFFLINE_OFFICE02_SHAPE_RECONCILIATION',action:'Resolve the preserved office02 exterior/corridor design discrepancy in a candidate-only adapter',needsWindowsNow:false,physicalProof:false},
  {priority:3,key:'TARGETED_RUNTIME_OR_WORLD_ATTESTATION',action:'Defer until the actual engine is intentionally running or an authorized isolated-world validation is scheduled',needsWindowsNow:true,physicalProof:false}
 ];
 const payload={schema:'minecraftaibuilder-step8b-b28-real-evidence-reconciliation-v1',kind:'READ_ONLY_EVIDENCE_AND_ARCHIVE_IDENTITY_ONLY',
  collectedAt:probe.collectedAt,originalEvidenceSha256:sha(probe),
  disk:{checked:9,matched:previous.sourceMatches,outcome:previous.sourceOutcome,engineLoadedHashAttested:false},
  archivedCatalog:{capturedProfileStatus:probe.materialProfile.status,verifiedByteIdentity:recovered,
   recoveredBy:'PINNED_CATALOG_SHA256_AND_OFFLINE_SNAPSHOT_RECOUNT',
   archiveSnapshotSha256:proof.sourceSnapshotHash,archiveCatalogSha256:proof.catalogSha256,
   version:recovered?proof.educationVersion:null,records:recovered?proof.recordCount:null,
   archivedVerified:recovered?proof.statusCounts.verified:null,
   archivedUnsupported:recovered?proof.statusCounts.unsupported:null,
   ordinaryDoorExactStateEvidenceRecords:recovered?proof.exactOrdinaryDoorRecords:null,
   liveMinecraftAcceptanceProven:false,
   finding:collectorContradiction?'COLLECTOR_COUNT_CONFLICT_REVIEW_REQUIRED':recovered?'ARCHIVE_COUNTS_RECOVERED_FROM_MATCHED_DISK_BYTES_NOT_LIVE_PROOF':'ARCHIVE_COUNTS_NOT_APPLICABLE_TO_CHANGED_DISK_CATALOG'},
  runtime:{...currentCaptureOnly,signal:noCandidate?'NO_PROJECT_RUNTIME_HINT_OR_LISTENER_OBSERVED':'INCOMPLETE_RUNTIME_SIGNAL',identityAttested:false},
  blockers:previous.blockers,remainingBlockers:9,
  nextActions:next,repeatSameWindowsCollectionNow:collectorContradiction,
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,physicalModifications:0},
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...payload,reportSha256:sha(payload)};
}
