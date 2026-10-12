// Step8B/B4.3: cross-capture comparison; read-only, non-execution, fail-closed.
import {createHash} from 'node:crypto';
import {evaluateWindowsB4} from './step8b-runtime-b4.mjs';
import {evaluateWindowsB42} from './step8b-runtime-b42.mjs';
const hash = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function requireState(cond,code){if(!cond){const e=new Error(code);e.code=code;throw e;}}
function safety(r){requireState(r.runtimeIdentity==='NOT_PROVEN'&&r.executionCompatibility==='UNKNOWN'&&r.deploymentGate==='BLOCKED'&&
 r.BuildPlan?.status==='NOT_PREPARED'&&r.BuildPlan.commandCount===0&&Array.isArray(r.BuildPlan.operations)&&r.BuildPlan.operations.length===0&&
 r.safety?.constructionApproved===false&&r.safety?.executionAllowed===false,'B43_SAFETY_INVARIANT');}
export const B43_SCHEMA='minecraftaibuilder-step8b-b43-evidence-delta-v1';
export function evaluateEvidenceDelta(snapshotDir,originalB4Capture,b42Capture=null){
 const previous=evaluateWindowsB4(snapshotDir,originalB4Capture);safety(previous);
 const pTime=Date.parse(previous.collectedAt);
 requireState(Number.isFinite(pTime),'B43_BAD_BASELINE_TIME');
 let recent=null;
 if(b42Capture!==null){
  recent=evaluateWindowsB42(snapshotDir,b42Capture);safety(recent);
  for(const record of b42Capture.processDiscovery.records){
   if(record.createdAt!==null)requireState(Date.parse(record.createdAt)<=Date.parse(recent.collectedAt),'B43_PROCESS_START_AFTER_CAPTURE');
  }
  requireState(Date.parse(recent.collectedAt)>pTime,'B43_CAPTURE_NOT_NEWER_THAN_BASELINE');
  requireState(recent.snapshotManifestSha256===previous.snapshotManifestSha256&&recent.sourceFilesVerified===previous.sourceFilesVerified,'B43_SNAPSHOT_MISMATCH');
 }
 const criticalPrevious=Object.fromEntries(previous.criticalChecks.map(c=>[c.key,c.comparison]));
 const criticalCurrent=recent?Object.fromEntries(recent.criticalChecks.map(c=>[c.key,c.comparison])):null;
 const mutations=recent?Object.keys(criticalPrevious).filter(k=>criticalPrevious[k]!==criticalCurrent[k]):[];
 const sourceState=recent===null?'AWAITING_WINDOWS_B42_CAPTURE':recent.sourceAlignment==='CRITICAL_FILES_MATCH_CAPTURED_SOURCE'?'CRITICAL_DISK_SOURCES_MATCH':'CRITICAL_DISK_SOURCE_DRIFT_OR_UNREADABLE';
 const processState=recent?.processState??'AWAITING_WINDOWS_B42_CAPTURE';
 const runtimeEvidenceLevel=recent===null?'BASELINE_ONLY':sourceState!=='CRITICAL_DISK_SOURCES_MATCH'?'SOURCE_CONFLICT':
  processState==='POSSIBLE_PROJECT_LAUNCH_NOT_ATTESTED'?'POSSIBLE_LAUNCH_NOT_ATTESTED':
  ['PROCESS_QUERY_UNAVAILABLE','PROCESS_INVENTORY_INCOMPLETE'].includes(processState)?'OBSERVATION_INCOMPLETE':
  'NO_ATTESTED_PROJECT_LAUNCH';
 const output={schema:B43_SCHEMA,snapshotManifestSha256:previous.snapshotManifestSha256,status:'EVIDENCE_CORRELATION_ONLY_NO_RUNTIME_ATTESTATION',
  baseline:{collectedAt:previous.collectedAt,sourceAlignment:previous.sourceAlignment,nodeProcessCount:originalB4Capture.processDiscovery.nodeProcessCount,
   criticalMatches:previous.criticalChecks.filter(c=>c.comparison==='MATCH').length},
  current:recent===null?{status:'NOT_COLLECTED'}:{status:'EVALUATED',collectedAt:recent.collectedAt,sourceAlignment:recent.sourceAlignment,
   processState,nodeProcessCount:recent.processDiscovery.nodeProcessCount,inspectedCount:recent.processDiscovery.inspectedCount,
   listenerQueryStatus:recent.processDiscovery.listenerQueryStatus,observedSignals:recent.processSignals.length},
  comparison:{sourceState,criticalComparisonTransitions:mutations,processState,processCountDelta:recent===null?null:recent.processDiscovery.nodeProcessCount-originalB4Capture.processDiscovery.nodeProcessCount,
   runtimeEvidenceLevel},runtimeIdentity:'NOT_PROVEN',executionCompatibility:'UNKNOWN',deploymentGate:'BLOCKED',
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true},
  constraints:['Offline source bytes and process metadata only','No loaded-module attestation or proof of process identity','No network, API, Minecraft, world or materials verification',
   'A command-line match or port PID cannot authorize construction']};
 output.reportSha256=hash(output);
 return output;
}
