// Step8B/B4: provenance-only offline analysis. NEVER import engine/bridge or call endpoints.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditSourceDirectory} from './step8b-compatibility.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const HEX=/^[0-9a-f]{64}$/;
const SNAPSHOT_MANIFEST='34ef239cd1d6e59c7d36fb070bd305e7572d944dee949c0648312ec94090534c';
export const PINNED_PATHS=Object.freeze([
 'package.json','bridge/src/server-step7j.js','bridge/src/server-step7o.js',
 'bridge/src/general-building.js','engine/src/general-building-planner.js',
 'engine/src/building-grammar.js','engine/src/build-anchor.js','scripts/start-dedicated-canary.js'
]);
export const KNOWN_ENTRYPOINTS=Object.freeze(['bridge/src/server-step7j.js','bridge/src/server-step7o.js','mcp/src/server-step7f.js']);
const approvedStatus=new Set(['OK','MISSING','UNREADABLE','CHANGED_DURING_READ']);
const approvedModes=new Set(['PROJECT_ABSOLUTE_REFERENCE','RELATIVE_REFERENCE_UNBOUND','NO_KNOWN_ENTRYPOINT']);
function check(condition,code){if(!condition){const e=new Error(code);e.code=code;throw e;}}
const only=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>fields.includes(k));
function staticAPI(root){
 const read=p=>fs.readFileSync(path.join(root,p),'utf8');
 const pkg=JSON.parse(read('package.json'));
 const bridge=read('bridge/src/general-building.js');
 const server=read('bridge/src/server-step7j.js');
 const planner=read('engine/src/general-building-planner.js');
 return {
  bridgeEntrypoint:pkg.scripts?.bridge==='node bridge/src/server-step7j.js'?'PACKAGE_SCRIPT_TARGET_IDENTIFIED':'PACKAGE_SCRIPT_TARGET_UNKNOWN',
  routeSource:{planBuilding:bridge.includes('route === "/plan/building"')&&server.includes('"/plan/building"')?'SOURCE_PRESENT_PROHIBITED_TO_CALL':'NOT_VERIFIED',
   buildBuilding:bridge.includes('route !== "/build/building"')&&server.includes('"/build/building"')?'SOURCE_PRESENT_PROHIBITED_TO_CALL':'NOT_VERIFIED'},
  plannerEntrypoint:planner.includes('export const createBuildingPlan =')?'STATIC_EXPORT_PRESENT_PROHIBITED_TO_INVOKE':'NOT_VERIFIED',
  note:'Static text signatures only; no routes called, modules imported, execution semantics or runtime identity proved'
 };
}
export function evaluateWindowsB4(snapshotDir,capture){
 const snapshot=auditSourceDirectory(snapshotDir);
 check(snapshot.sourceManifestSha256===SNAPSHOT_MANIFEST&&snapshot.status==='SOURCE_INVENTORY_CHECKED_MAPPING_UNKNOWN'&&snapshot.sourceFilesVerified===249,'UNPINNED_SNAPSHOT');
 const manifest=JSON.parse(fs.readFileSync(path.join(snapshotDir,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,''));
 check(only(capture,['schema','collectedAt','intent','projectIdentity','sourceChecks','processDiscovery','safety'])&&capture.schema==='minecraftaibuilder-step8b-b4-probe-v1','INVALID_CAPTURE_SCHEMA');
 check(capture.intent==='LOCAL_READ_ONLY_NO_API_CALLS'&&only(capture.safety,['notPrepared','executionAllowed','constructionApproved','worldAccess','bridgeContact','projectFilesModified'])&&
 capture.safety.notPrepared===true&&capture.safety.executionAllowed===false&&capture.safety.constructionApproved===false&&
 capture.safety.worldAccess===false&&capture.safety.bridgeContact===false&&capture.safety.projectFilesModified===false,'UNSAFE_CAPTURE_STATE');
 check(typeof capture.collectedAt==='string'&&Number.isFinite(Date.parse(capture.collectedAt)),'INVALID_CAPTURE_DATE');
 check(only(capture.projectIdentity,['packageName','present','rootMarkerPresent'])&&capture.projectIdentity.packageName==='minecraft-ai-builder'&&capture.projectIdentity.present===true&&capture.projectIdentity.rootMarkerPresent===true,'UNKNOWN_PROJECT');
 check(Array.isArray(capture.sourceChecks)&&capture.sourceChecks.length===PINNED_PATHS.length,'INVALID_SOURCE_LIST');
 const expected=new Map(manifest.files.map(r=>[r.path,r.sha256]));
 const seen=new Set();const comparisons=[];
 for(const r of capture.sourceChecks){
  check(only(r,['key','status','sha256'])&&PINNED_PATHS.includes(r.key)&&!seen.has(r.key)&&approvedStatus.has(r.status),'INVALID_SOURCE_RECORD');
  seen.add(r.key);check(r.status!=='OK'?r.sha256===null:HEX.test(r.sha256),'INVALID_SOURCE_HASH');
  comparisons.push({key:r.key,status:r.status,comparison:r.status!=='OK'?'NOT_READABLE':expected.get(r.key)===r.sha256?'MATCH':'DRIFT'});
 }
 check(PINNED_PATHS.every(p=>seen.has(p)),'MISSING_CRITICAL_SOURCE');
 const discovery=capture.processDiscovery;
 check(only(discovery,['status','nodeProcessCount','candidates'])&&['OK','ACCESS_DENIED_OR_UNAVAILABLE'].includes(discovery.status)&&
 Number.isSafeInteger(discovery.nodeProcessCount)&&discovery.nodeProcessCount>=0&&discovery.nodeProcessCount<=10000&&
 Array.isArray(discovery.candidates)&&discovery.candidates.length<=100&&discovery.candidates.length<=discovery.nodeProcessCount,'INVALID_PROCESS_DISCOVERY');
 if(discovery.status!=='OK')check(discovery.candidates.length===0,'INVALID_PROCESS_DISCOVERY');
 const processSignals=[];
 for(const p of discovery.candidates){
  check(only(p,['pid','entrypoint','launchMode','createdAt','modifiedAfterStart'])&&Number.isSafeInteger(p.pid)&&p.pid>0&&p.pid<=4294967295&&
   (p.entrypoint===null||KNOWN_ENTRYPOINTS.includes(p.entrypoint))&&approvedModes.has(p.launchMode)&&
   (p.createdAt===null||(typeof p.createdAt==='string'&&Number.isFinite(Date.parse(p.createdAt))))&&
   (p.modifiedAfterStart===null||typeof p.modifiedAfterStart==='boolean'),'INVALID_PROCESS_RECORD');
  check((p.entrypoint===null)===(p.launchMode==='NO_KNOWN_ENTRYPOINT'),'INVALID_PROCESS_CLASSIFICATION');
  processSignals.push({pid:p.pid,entrypoint:p.entrypoint,launchMode:p.launchMode,
   modifiedAfterStart:p.modifiedAfterStart,provenance:p.launchMode==='PROJECT_ABSOLUTE_REFERENCE'&&p.modifiedAfterStart===false?'PROCESS_COMMANDLINE_HEURISTIC_ONLY':'AMBIGUOUS_OR_OUTDATED'});
 }
 const sourceAlignment=comparisons.every(x=>x.comparison==='MATCH')?'CRITICAL_FILES_MATCH_CAPTURED_SOURCE':'SOURCE_DRIFT_OR_UNREADABLE';
 let processState='UNKNOWN';
 if(discovery.status!=='OK')processState='PROCESS_QUERY_UNAVAILABLE';
 else if(discovery.nodeProcessCount===0)processState='NO_NODE_PROCESS_OBSERVED';
 else if(processSignals.some(p=>p.provenance==='PROCESS_COMMANDLINE_HEURISTIC_ONLY'))processState='POSSIBLE_LAUNCH_MATCH_NOT_ATTESTED';
 else processState='RUNNING_PROJECT_IDENTITY_UNRESOLVED';
 const output={schema:'minecraftaibuilder-step8b-b4-runtime-evidence-v1',collectedAt:capture.collectedAt,
  status:'READ_ONLY_EVIDENCE_EVALUATED_NOT_RUNTIME_ATTESTED',runtimeIdentity:'NOT_PROVEN',executionCompatibility:'UNKNOWN',
  sourceAlignment,processState,criticalChecks:comparisons,processSignals,
  staticAPI:staticAPI(snapshotDir),snapshotManifestSha256:SNAPSHOT_MANIFEST,sourceFilesVerified:snapshot.sourceFilesVerified,
  limitations:['Source hashes match disk bytes only, not modules cached in a running Node.js process',
   'CIM command line filtering is heuristic; matching text is not secure evidence of process cwd or loaded files',
   'No network/Bridge/Minecraft connection or API invoked',
   'No real-world anchor/material states/voxel plan execution or world permissions verified'],
  nextGate:'REQUIRES_SEPARATE_RUNTIME_ATTESTATION_AND_EXPLICIT_CONSTRUCTION_APPROVAL',
  deploymentGate:'BLOCKED',worldAnchor:null,worldCoordinates:null,blockStates:[],materialBlockIds:[],
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true}};
 output.reportSha256=digest(JSON.stringify(output));
 return output;
}
