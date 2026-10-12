/** B27: fail-closed assessment of a sanitized Windows read-only capture.
 * This module cannot emit world coordinates, materials, placement ops, or authorization.
 */
import {createHash} from 'node:crypto';

const fail = key => { throw Object.assign(new Error('B27_'+key), {code:'B27_'+key}); };
const nonnegative = n => Number.isSafeInteger(n) && n >= 0;
const strictKeys = (obj, keys, label) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) ||
      Object.keys(obj).length !== keys.length ||
      Object.keys(obj).some(k => !keys.includes(k))) fail(label);
};
const hex = h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h);
const blockers = ['M4-01','M4-02','M4-03','M4-04','M4-05','M4-06','M4-07','M4-08','M4-09'];
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function assessB27Evidence(probe, baseline, {now=new Date().toISOString(),maxAgeDays=14}={}) {
  strictKeys(baseline, ['schema','kind','source','archivedProfile','interior','symbolicRotations','blockers','allBlockersOpen','nextWindowsReadOnlyInputs','caution','gate','BuildPlan','reportSha256'],'BASELINE_FIELDS');
  if(baseline.schema!=='minecraftaibuilder-step8b-b26-m4-offline-gate-v1'||
     baseline.gate?.deployment!=='BLOCKED'||baseline.gate?.constructionApproved!==false||
     baseline.gate?.runtimeProven!==false||baseline.BuildPlan?.status!=='NOT_PREPARED'||
     baseline.BuildPlan?.operations?.length!==0||baseline.BuildPlan?.commandCount!==0||
     baseline.BuildPlan?.worldCoordinates!==null||baseline.BuildPlan?.materialIds?.length!==0||
     baseline.allBlockersOpen!==true||!Array.isArray(baseline.blockers)||
     baseline.blockers.length!==9||baseline.blockers.some((b,i)=>b.id!==blockers[i]||b.confirmed!==false))fail('BASELINE_SAFETY');
  const expected=baseline.source?.sourceHashes;
  if(!expected||Object.keys(expected).length!==9||Object.values(expected).some(x=>!hex(x)))fail('BASELINE_HASHES');
  strictKeys(probe, ['schema','collectedAt','intent','projectIdentity','sourceChecks','materialProfile','processSummary','safety'],'TOP_LEVEL_FIELDS');
  if(probe.schema!=='minecraftaibuilder-step8b-b27-m4-readonly-probe-v1'||
     probe.intent!=='LOCAL_FILES_AND_OS_METADATA_READ_ONLY'||
     probe.projectIdentity!=='minecraft-ai-builder')fail('ENVELOPE');
  // Enforce explicit timezone, freshness, and no evidence from the future.
  if(typeof probe.collectedAt!=='string'||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(probe.collectedAt)) fail('TIMESTAMP_FORMAT');
  const collected=Date.parse(probe.collectedAt), current=Date.parse(now);
  if(!Number.isFinite(collected)||!Number.isFinite(current)||!Number.isSafeInteger(maxAgeDays)||maxAgeDays<1||maxAgeDays>90||
     collected>current+5*60*1000||collected<current-maxAgeDays*86400*1000)fail('EVIDENCE_STALE_OR_FUTURE');
  strictKeys(probe.safety,['notPrepared','constructionApproved','executionAllowed','worldAccess','bridgeContact','projectFilesModified','buildOperations'],'SAFETY_FIELDS');
  if(probe.safety.notPrepared!==true||probe.safety.constructionApproved!==false||
     probe.safety.executionAllowed!==false||probe.safety.worldAccess!==false||
     probe.safety.bridgeContact!==false||probe.safety.projectFilesModified!==false||
     probe.safety.buildOperations!==0)fail('SAFETY');
  if(!Array.isArray(probe.sourceChecks)||probe.sourceChecks.length!==9)fail('SOURCE_LENGTH');
  const seen=new Set(), findings=[];
  for(const entry of probe.sourceChecks){
    strictKeys(entry,['key','status','sha256'],'SOURCE_ENTRY_FIELDS');
    if(typeof entry.key!=='string'||!Object.hasOwn(expected,entry.key)||seen.has(entry.key)||
       !['OK','MISSING','UNREADABLE','CHANGED_DURING_READ'].includes(entry.status)||
       (entry.status==='OK'?!hex(entry.sha256):entry.sha256!==null))fail('SOURCE_ENTRY');
    seen.add(entry.key);
    findings.push({key:entry.key,finding:entry.status!=='OK'?'SOURCE_UNAVAILABLE':entry.sha256===expected[entry.key]?'DISK_HASH_MATCH':'DISK_HASH_CHANGED'});
  }
  findings.sort((a,b)=>a.key.localeCompare(b.key,'en'));
  strictKeys(probe.materialProfile,['status','version','recordCount','statusCounts','doorStateRecords'],'PROFILE_FIELDS');
  const profile=probe.materialProfile;let materialFinding='PROFILE_UNAVAILABLE';
  if(profile.status==='OK'){
    strictKeys(profile.statusCounts,['verified','unsupported'],'PROFILE_STATUS_FIELDS');
    if(typeof profile.version!=='string'||!nonnegative(profile.recordCount)||
       !nonnegative(profile.doorStateRecords)||!nonnegative(profile.statusCounts.verified)||
       !nonnegative(profile.statusCounts.unsupported)||
       profile.recordCount!==profile.statusCounts.verified+profile.statusCounts.unsupported||
       profile.doorStateRecords>profile.recordCount)fail('PROFILE_COUNTS');
    materialFinding=profile.version===baseline.source.educationVersion&&
       profile.recordCount===baseline.archivedProfile.records&&
       profile.statusCounts.verified===baseline.archivedProfile.verifiedAtCapture&&
       profile.statusCounts.unsupported===baseline.archivedProfile.unsupportedAtCapture&&
       profile.doorStateRecords===baseline.interior.historicalExactDoorVerificationRecords
       ?'ARCHIVED_PROFILE_COUNTS_MATCH_NOT_LIVE_PROOF':'PROFILE_CHANGED';
  }else if(profile.status==='UNAVAILABLE'){
    if(profile.version!==null||profile.recordCount!==null||profile.statusCounts!==null||profile.doorStateRecords!==null)fail('PROFILE_UNAVAILABLE_VALUES');
  }else fail('PROFILE_STATUS');
  strictKeys(probe.processSummary,['status','nodeProcessCount','listenerStatus','listenerPortCount8000','listenerPortCount8765','rootPathHintCount','entrypointHintCount'],'PROCESS_FIELDS');
  const process=probe.processSummary;
  if(!['OK','UNAVAILABLE'].includes(process.status)||
     !['OK','UNAVAILABLE'].includes(process.listenerStatus)||
     !nonnegative(process.listenerPortCount8000)||!nonnegative(process.listenerPortCount8765)||
     !nonnegative(process.rootPathHintCount)||!nonnegative(process.entrypointHintCount)||
     (process.status==='OK'?!nonnegative(process.nodeProcessCount):process.nodeProcessCount!==null)||
     (process.status==='UNAVAILABLE'&&(process.rootPathHintCount!==0||process.entrypointHintCount!==0))||
     (process.status==='OK'&&(process.rootPathHintCount>process.nodeProcessCount||process.entrypointHintCount>process.nodeProcessCount))||
     (process.listenerStatus==='UNAVAILABLE'&&(process.listenerPortCount8000!==0||process.listenerPortCount8765!==0)))fail('PROCESS_VALUES');
  const matches=findings.filter(x=>x.finding==='DISK_HASH_MATCH').length;
  const sourceOutcome=matches===9?'ALL_9_DISK_HASHES_MATCH':findings.some(x=>x.finding==='DISK_HASH_CHANGED')?'SOURCE_DRIFT_DETECTED':'SOURCE_DATA_INCOMPLETE';
  const gateDetails=blockers.map(id=>({id,status:'BLOCKED',reason:id==='M4-01'
    ? (matches===9?'DISK_MATCH_ONLY_LOADED_RUNTIME_NOT_ATTESTED':'DISK_IDENTITY_UNCONFIRMED')
    : id==='M4-02'||id==='M4-05'?'ARCHIVED_PROFILE_NOT_LIVE_EXACT_STATES'
    : id==='M4-09'?'NO_CONSTRUCTION_AUTHORIZATION':'PHYSICAL_OR_WORLD_PROOF_MISSING'}));
  const result={schema:'minecraftaibuilder-step8b-b27-m4-assessment-v1',
    evidenceTimestamp:probe.collectedAt,sourceOutcome,sourceMatches:matches,sourceCount:9,
    sourceFindings:findings,materialFinding,
    processObservation:{nodeProcessCount:process.nodeProcessCount,rootPathHintCount:process.rootPathHintCount,
      entrypointHintCount:process.entrypointHintCount,listenerStatus:process.listenerStatus,
      port8000:process.listenerStatus==='OK'?process.listenerPortCount8000:null,
      port8765:process.listenerStatus==='OK'?process.listenerPortCount8765:null,
      runtimeIdentityAttested:false},
    blockers:gateDetails,blockersOpen:9,
    policy:{notPrepared:true,constructionApproved:false,worldAccess:false,bridgeContact:false,
      outputOperations:[],commandCount:0,worldCoordinates:null,materialIds:[],deploymentGate:'BLOCKED'},
    finding:'DISK_HASHES_AND_OS_COUNTS_DO_NOT_ATTEST_LOADED_ENGINE_OR_WORLD_SAFETY'};
  return {...result,assessmentSha256:hash(result)};
}
