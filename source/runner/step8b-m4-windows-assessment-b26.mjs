/** Pure assessment of future B26 sanitized Windows collector JSON (no I/O). */
const fail=k=>{throw Object.assign(new Error('B26_PROBE_'+k),{code:'B26_PROBE_'+k});};
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function assessB26WindowsEvidence(probe,offline){
 if(probe?.schema!=='minecraftaibuilder-step8b-b26-m4-readonly-probe-v1'||
    probe?.intent!=='LOCAL_FILES_AND_OS_METADATA_READ_ONLY'||
    probe?.projectIdentity!=='minecraft-ai-builder'||
    typeof probe?.collectedAt!=='string'||!Number.isFinite(Date.parse(probe.collectedAt))||
    probe?.safety?.notPrepared!==true||probe.safety.constructionApproved!==false||
    probe.safety.executionAllowed!==false||probe.safety.worldAccess!==false||
    probe.safety.bridgeContact!==false||probe.safety.projectFilesModified!==false||
    probe.safety.buildOperations!==0||
    probe?.operations!==undefined||probe?.BuildPlan!==undefined)fail('ENVELOPE');
 if(offline?.schema!=='minecraftaibuilder-step8b-b26-m4-offline-gate-v1'||
    offline.gate?.deployment!=='BLOCKED'||offline.BuildPlan?.operations?.length!==0||
    offline?.source?.sourceHashes===undefined)fail('OFFLINE_BASELINE');
 // This collector should never export command lines, paths, credentials or raw catalog records.
 const json=JSON.stringify(probe);
 if(/"(?:commandline|userprofile|projectroot|worldcoordinates|password|token|playerposition|testarea|rawrecords)"\s*:/i.test(json))fail('UNEXPECTED_PRIVATE_FIELD');
 if(!Array.isArray(probe.sourceChecks))fail('SOURCE_CHECKS');
 const expected=offline.source.sourceHashes;
 const checked=new Set(),statuses=[];
 for(const entry of probe.sourceChecks){
  if(!entry||typeof entry.key!=='string'||!Object.hasOwn(expected,entry.key)||checked.has(entry.key)||
   !['OK','MISSING','UNREADABLE','CHANGED_DURING_READ'].includes(entry.status)||
   (entry.status==='OK'?!/^[a-f0-9]{64}$/.test(entry.sha256):entry.sha256!==null))fail('SOURCE_ENTRY');
  checked.add(entry.key);
  statuses.push({key:entry.key,status:entry.status,
   finding:entry.status!=='OK'?'SOURCE_UNAVAILABLE':entry.sha256===expected[entry.key]?'SOURCE_MATCH':'SOURCE_DIFFERENT'});
 }
 if(checked.size!==Object.keys(expected).length)fail('SOURCE_COUNT');
 const sourceMatchCount=statuses.filter(x=>x.finding==='SOURCE_MATCH').length;
 const profile=probe.materialProfile;
 if(!profile||!['OK','UNAVAILABLE'].includes(profile.status))fail('PROFILE_SCHEMA');
 let profileFinding='PROFILE_UNAVAILABLE';
 if(profile.status==='OK'){
  if(typeof profile.version!=='string'||!integer(profile.recordCount)||!integer(profile.doorStateRecords)||
   !profile.statusCounts||Object.values(profile.statusCounts).some(x=>!integer(x))||
   Object.values(profile.statusCounts).reduce((a,b)=>a+b,0)!==profile.recordCount)fail('PROFILE_NUMBERS');
  profileFinding=profile.version===offline.source.educationVersion &&
   profile.recordCount===offline.archivedProfile.records &&
   profile.statusCounts.verified===offline.archivedProfile.verifiedAtCapture &&
   profile.statusCounts.unsupported===offline.archivedProfile.unsupportedAtCapture &&
   profile.doorStateRecords===offline.interior.historicalExactDoorVerificationRecords
   ?'ARCHIVED_PROFILE_COUNTS_MATCH':'PROFILE_COUNTS_CHANGED';
 }else if(profile.version!==null||profile.recordCount!==null||profile.statusCounts!==null||profile.doorStateRecords!==null)fail('PROFILE_UNAVAILABLE_CONTRACT');
 const process=probe.processSummary;
 if(!process||!['OK','UNAVAILABLE'].includes(process.status)||
  !['OK','UNAVAILABLE'].includes(process.listenerStatus)||
  !integer(process.listenerPortCount8000)||!integer(process.listenerPortCount8765)||
  (process.status==='OK'?!integer(process.nodeProcessCount):process.nodeProcessCount!==null))fail('PROCESS_SUMMARY');
 return {schema:'minecraftaibuilder-step8b-b26-m4-probe-assessment-v1',
  observedAt:probe.collectedAt,sourceMatchCount,sourceCount:statuses.length,
  sourceAllMatch:sourceMatchCount===statuses.length,sourceFindings:statuses,
  historicalProfileComparison:profileFinding,
  nodeCountAtCapture:process.nodeProcessCount,listenerObservationStatus:process.listenerStatus,
  // A port and Node count are not evidence of a particular project's loaded code.
  runningCodeIdentityProven:false,currentWorldSafetyProven:false,physicalDoorsProven:false,
  constructionReady:false,remainingBlockers:offline.blockers.length,
  safety:{notPrepared:true,constructionApproved:false,worldAccess:false,bridgeContact:false,commandCount:0},
  deploymentGate:'BLOCKED'};
}
