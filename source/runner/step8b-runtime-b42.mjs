// Step8B/B4.2: offline-only evaluation of read-only sanitized Windows signals.
// Deliberately never imports the building engine, opens a socket or runs user programs.
import {evaluateWindowsB4, PINNED_PATHS} from './step8b-runtime-b4.mjs';
import {createHash} from 'node:crypto';
const SHA256=v=>createHash('sha256').update(v).digest('hex');
const allowedEntries=new Set([
 'bridge/src/server-step7j.js','bridge/src/server-step7o.js',
 'mcp/src/server-step7f.js','scripts/start-dedicated-canary.js',
 'bridge/src/server.js'
]);
const allowedLaunch=new Set(['ABSOLUTE_PROJECT_ENTRYPOINT','RELATIVE_ENTRYPOINT_UNBOUND','PROJECT_ROOT_ONLY','NONE']);
const allowedScripts=new Set(['BRIDGE_SCRIPT','MCP_SCRIPT','CANARY_SCRIPT','NONE']);
const allowedParents=new Set(['NODE','CMD','POWERSHELL','OTHER','UNKNOWN']);
const allowedStatuses=new Set(['OK','UNAVAILABLE']);
const ports=[8000,8765];
function ensure(b,code){if(!b){const e=new Error(code);e.code=code;throw e;}}
const fields=(v,allowed,exact=false)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).every(k=>allowed.includes(k))&&(!exact||Object.keys(v).length===allowed.length);
export const B42_SCHEMA='minecraftaibuilder-step8b-b42-readonly-probe-v1';
export function evaluateWindowsB42(snapshotDir,capture){
 ensure(fields(capture,['schema','collectedAt','intent','projectIdentity','sourceChecks','processDiscovery','safety'],true)&&capture.schema===B42_SCHEMA,'B42_INVALID_CAPTURE');
 const d=capture.processDiscovery;
 ensure(fields(d,['status','nodeProcessCount','records','truncated','listenerQueryStatus','listenerPortsProbed'],true),'B42_INVALID_PROCESS_DISCOVERY');
 ensure((d.status==='OK'||d.status==='ACCESS_DENIED_OR_UNAVAILABLE')&&
 Number.isSafeInteger(d.nodeProcessCount)&&d.nodeProcessCount>=0&&d.nodeProcessCount<=10000&&
 typeof d.truncated==='boolean'&&Array.isArray(d.records)&&d.records.length<=100&&
 allowedStatuses.has(d.listenerQueryStatus)&&Array.isArray(d.listenerPortsProbed)&&
 JSON.stringify(d.listenerPortsProbed)===JSON.stringify(ports),'B42_INVALID_PROCESS_DISCOVERY');
 ensure((d.status!=='OK'&&d.nodeProcessCount===0&&d.records.length===0&&!d.truncated)||
 (d.status==='OK'&&d.records.length===Math.min(d.nodeProcessCount,100)&&d.truncated===(d.nodeProcessCount>100)),'B42_INCONSISTENT_PROCESS_COUNT');
 const ids=new Set();
 const signals=[];
 for(const r of d.records){
  ensure(fields(r,['pid','entrypoint','launchMode','scriptHint','parentClass','createdAt','modifiedAfterStart','listenerPorts'],true)&&
   Number.isSafeInteger(r.pid)&&r.pid>0&&r.pid<=4294967295&&!ids.has(r.pid)&&
   (r.entrypoint===null||allowedEntries.has(r.entrypoint))&&
   allowedLaunch.has(r.launchMode)&&allowedScripts.has(r.scriptHint)&&allowedParents.has(r.parentClass)&&
   (r.createdAt===null||(typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))))&&
   (r.modifiedAfterStart===null||typeof r.modifiedAfterStart==='boolean')&&
   Array.isArray(r.listenerPorts)&&r.listenerPorts.length<=2&&r.listenerPorts.every(p=>ports.includes(p))&&
   new Set(r.listenerPorts).size===r.listenerPorts.length,'B42_INVALID_PROCESS_RECORD');
  ids.add(r.pid);
  ensure((r.entrypoint!==null)===(r.launchMode==='ABSOLUTE_PROJECT_ENTRYPOINT'||r.launchMode==='RELATIVE_ENTRYPOINT_UNBOUND'),'B42_INVALID_LAUNCH_CLASSIFICATION');
  if(d.listenerQueryStatus==='UNAVAILABLE')ensure(r.listenerPorts.length===0,'B42_UNAVAILABLE_LISTENERS_FORGED');
  if(r.modifiedAfterStart!==null)ensure(r.createdAt!==null,'B42_INVALID_AGE_SIGNAL');
  const reason=r.launchMode==='ABSOLUTE_PROJECT_ENTRYPOINT'?'SOURCE_PATH_IN_COMMANDLINE_UNATTESTED':
   r.launchMode==='RELATIVE_ENTRYPOINT_UNBOUND'?'RELATIVE_SOURCE_PATH_UNBOUND':
   r.launchMode==='PROJECT_ROOT_ONLY'?'ROOT_PATH_WITHOUT_ENTRYPOINT':
   r.scriptHint!=='NONE'?'SCRIPT_NAME_NOT_PROJECT_BOUND':
   r.listenerPorts.length>0?'LISTENER_PORT_OWNER_NOT_IDENTITY':'NO_PROJECT_SIGNAL';
  signals.push({pid:r.pid,entrypoint:r.entrypoint,launchMode:r.launchMode,scriptHint:r.scriptHint,
   parentClass:r.parentClass,modifiedAfterStart:r.modifiedAfterStart,listenerPorts:r.listenerPorts,reason});
 }
 // Reuse the B4 fail-closed snapshot/inventory/hashes/safety proof; no B4.2 flags can bypass it.
 const base=evaluateWindowsB4(snapshotDir,{
  schema:'minecraftaibuilder-step8b-b4-probe-v1',collectedAt:capture.collectedAt,
  intent:capture.intent,projectIdentity:capture.projectIdentity,
  sourceChecks:capture.sourceChecks,
  processDiscovery:{status:d.status,nodeProcessCount:d.nodeProcessCount,candidates:[]},
  safety:capture.safety
 });
 let state;
 if(d.status!=='OK')state='PROCESS_QUERY_UNAVAILABLE';
 else if(d.truncated)state='PROCESS_INVENTORY_INCOMPLETE';
 else if(d.nodeProcessCount===0)state='NO_NODE_PROCESS_OBSERVED';
 else if(signals.some(r=>r.launchMode==='ABSOLUTE_PROJECT_ENTRYPOINT'&&r.modifiedAfterStart===false))state='POSSIBLE_PROJECT_LAUNCH_NOT_ATTESTED';
 else if(signals.some(r=>r.launchMode==='ABSOLUTE_PROJECT_ENTRYPOINT'))state='PROJECT_LAUNCH_STALE_OR_AGE_UNKNOWN';
 else if(signals.some(r=>r.launchMode!=='NONE'||r.scriptHint!=='NONE'))state='UNBOUND_PROJECT_LAUNCH_HINT';
 else if(signals.some(r=>r.listenerPorts.length>0))state='LISTENER_PORT_ONLY_UNATTRIBUTED';
 else state='NODE_PRESENT_PROJECT_IDENTITY_UNRESOLVED';
 const out={...base,schema:'minecraftaibuilder-step8b-b42-assessment-v1',
  status:'READ_ONLY_PROCESS_SIGNALS_NOT_RUNTIME_ATTESTATION',processState:state,processSignals:signals,
  processDiscovery:{status:d.status,nodeProcessCount:d.nodeProcessCount,inspectedCount:d.records.length,
   truncated:d.truncated,listenerQueryStatus:d.listenerQueryStatus,listenerPortsProbed:ports},
  limitations:[...base.limitations,
   'Listening on default ports 8000 or 8765 is not a unique project identity; ports may be overridden',
   'npm script name, parent process, command-line path and timestamps cannot prove working directory or loaded modules',
   'Running a read-only collector cannot certify that all other processes avoided Minecraft or world mutations'],
  nextGate:'RUNTIME_IDENTITY_NOT_ATTESTED_REQUIRES_EXPLICIT_SEPARATE_GATE_AND_CONSTRUCTION_APPROVAL'};
 delete out.reportSha256;
 out.reportSha256=SHA256(JSON.stringify(out));
 ensure(out.sourceFilesVerified===249&&out.BuildPlan.status==='NOT_PREPARED'&&out.BuildPlan.commandCount===0&&out.deploymentGate==='BLOCKED'&&out.executionCompatibility==='UNKNOWN','B42_SAFETY_INVARIANT');
 return out;
}
