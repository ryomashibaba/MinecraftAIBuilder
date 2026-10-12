import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateWindowsB42,B42_SCHEMA} from '../runner/step8b-runtime-b42.mjs';
import {PINNED_PATHS} from '../runner/step8b-runtime-b4.mjs';
const source=process.env.STEP8B_SOURCE_DIR;
const canTest=source&&fs.existsSync(path.join(source,'WINDOWS_SNAPSHOT_MANIFEST.json'))?test:test.skip;
const make=()=>{
 const mf=JSON.parse(fs.readFileSync(path.join(source,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,''));
 const ids=new Map(mf.files.map(f=>[f.path,f.sha256]));
 return {schema:B42_SCHEMA,collectedAt:'2026-10-10T19:21:44+09:00',intent:'LOCAL_READ_ONLY_NO_API_CALLS',
  projectIdentity:{packageName:'minecraft-ai-builder',present:true,rootMarkerPresent:true},
  sourceChecks:PINNED_PATHS.map(key=>({key,status:'OK',sha256:ids.get(key)})),
  processDiscovery:{status:'OK',nodeProcessCount:4,truncated:false,listenerQueryStatus:'OK',listenerPortsProbed:[8000,8765],records:[1,2,3,4].map(pid=>node(pid))},
  safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,worldAccess:false,bridgeContact:false,projectFilesModified:false}};
};
const node=(pid,over={})=>({pid,entrypoint:null,launchMode:'NONE',scriptHint:'NONE',parentClass:'UNKNOWN',createdAt:null,modifiedAfterStart:null,listenerPorts:[],...over});
const audit=v=>evaluateWindowsB42(source,v);
const blocked=a=>{assert.equal(a.deploymentGate,'BLOCKED');assert.equal(a.runtimeIdentity,'NOT_PROVEN');assert.equal(a.executionCompatibility,'UNKNOWN');assert.deepEqual(a.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});assert.deepEqual(a.blockStates,[]);assert.equal(a.safety.executionAllowed,false);};
canTest('B4.1 captured four unidentified node processes: no attribution, 8/8 pins',()=>{
 const c=make();const before=JSON.stringify(c);const r=audit(c);
 assert.equal(JSON.stringify(c),before);
 assert.equal(r.sourceAlignment,'CRITICAL_FILES_MATCH_CAPTURED_SOURCE');
 assert.equal(r.processState,'NODE_PRESENT_PROJECT_IDENTITY_UNRESOLVED');
 assert.equal(r.processDiscovery.nodeProcessCount,4);blocked(r);
});
canTest('Absolute source reference + unchanged disk is still not memory attestation',()=>{
 const c=make();c.processDiscovery.records[0]=node(1,{entrypoint:'bridge/src/server-step7j.js',launchMode:'ABSOLUTE_PROJECT_ENTRYPOINT',createdAt:'2026-10-10T09:00:00Z',modifiedAfterStart:false});
 const r=audit(c);assert.equal(r.processState,'POSSIBLE_PROJECT_LAUNCH_NOT_ATTESTED');blocked(r);
});
canTest('Absolute project reference with changed source remains suspect',()=>{
 const c=make();c.processDiscovery.records[0]=node(1,{entrypoint:'mcp/src/server-step7f.js',launchMode:'ABSOLUTE_PROJECT_ENTRYPOINT',createdAt:'2026-10-10T09:00:00Z',modifiedAfterStart:true});
 const r=audit(c);assert.equal(r.processState,'PROJECT_LAUNCH_STALE_OR_AGE_UNKNOWN');blocked(r);
});
canTest('Relative path and npm script name are not project identification',()=>{
 const c=make();c.processDiscovery.records[1]=node(2,{entrypoint:'scripts/start-dedicated-canary.js',launchMode:'RELATIVE_ENTRYPOINT_UNBOUND',scriptHint:'CANARY_SCRIPT',parentClass:'CMD'});
 assert.equal(audit(c).processState,'UNBOUND_PROJECT_LAUNCH_HINT');
});
canTest('Port owner 8000+8765 alone is not trusted as MinecraftAIBuilder',()=>{
 const c=make();c.processDiscovery.records[0]=node(1,{listenerPorts:[8000,8765]});
 const r=audit(c);assert.equal(r.processState,'LISTENER_PORT_ONLY_UNATTRIBUTED');blocked(r);
});
canTest('Unavailable local port map cannot be manufactured',()=>{
 const c=make();c.processDiscovery.listenerQueryStatus='UNAVAILABLE';c.processDiscovery.records[0].listenerPorts=[8000];
 assert.throws(()=>audit(c),{code:'B42_UNAVAILABLE_LISTENERS_FORGED'});
});
canTest('Denied process query is not zero running nodes',()=>{
 const c=make();c.processDiscovery={status:'ACCESS_DENIED_OR_UNAVAILABLE',nodeProcessCount:0,records:[],truncated:false,listenerQueryStatus:'UNAVAILABLE',listenerPortsProbed:[8000,8765]};
 assert.equal(audit(c).processState,'PROCESS_QUERY_UNAVAILABLE');
});
canTest('Truncated process inventory fails closed even if path matches',()=>{
 const c=make();c.processDiscovery.nodeProcessCount=101;c.processDiscovery.records=Array.from({length:100},(_,i)=>node(i+1));c.processDiscovery.truncated=true;
 c.processDiscovery.records[0]=node(1,{entrypoint:'bridge/src/server-step7j.js',launchMode:'ABSOLUTE_PROJECT_ENTRYPOINT',createdAt:'2026-10-10T09:00:00Z',modifiedAfterStart:false});
 assert.equal(audit(c).processState,'PROCESS_INVENTORY_INCOMPLETE');
});
canTest('Tampered process count, duplicate PID and injected full command rejected',()=>{
 const c=make();c.processDiscovery.nodeProcessCount=5;
 assert.throws(()=>audit(c),{code:'B42_INCONSISTENT_PROCESS_COUNT'});
 const d=make();d.processDiscovery.records[1].pid=1;
 assert.throws(()=>audit(d),{code:'B42_INVALID_PROCESS_RECORD'});
 const e=make();e.processDiscovery.records[0].commandLine='api-key=secret';
 assert.throws(()=>audit(e),{code:'B42_INVALID_PROCESS_RECORD'});
});
canTest('Malformed launcher combinations and forged permissions rejected',()=>{
 const c=make();c.processDiscovery.records[0].entrypoint='bridge/src/server-step7j.js';
 assert.throws(()=>audit(c),{code:'B42_INVALID_LAUNCH_CLASSIFICATION'});
 const d=make();d.safety.constructionApproved=true;
 assert.throws(()=>audit(d),{code:'UNSAFE_CAPTURE_STATE'});
});
canTest('No node processes is not runtime compatibility PASS',()=>{
 const c=make();c.processDiscovery.nodeProcessCount=0;c.processDiscovery.records=[];
 const r=audit(c);assert.equal(r.processState,'NO_NODE_PROCESS_OBSERVED');blocked(r);
});
canTest('Invalid listener-port list / bogus age flags rejected',()=>{
 const c=make();c.processDiscovery.records[0].listenerPorts=[9999];
 assert.throws(()=>audit(c),{code:'B42_INVALID_PROCESS_RECORD'});
 const d=make();d.processDiscovery.records[0].modifiedAfterStart=false;
 assert.throws(()=>audit(d),{code:'B42_INVALID_AGE_SIGNAL'});
});
canTest('Schema downgrade, source drift and extraneous keys fail closed',()=>{
 const c=make();c.schema='minecraftaibuilder-step8b-b4-probe-v1';
 assert.throws(()=>audit(c),{code:'B42_INVALID_CAPTURE'});
 const d=make();d.sourceChecks[0].sha256='f'.repeat(64);
 assert.equal(audit(d).sourceAlignment,'SOURCE_DRIFT_OR_UNREADABLE');
 const e=make();e.processDiscovery.mcpSecrets=['xxx'];
 assert.throws(()=>audit(e),{code:'B42_INVALID_PROCESS_DISCOVERY'});
});
test('B4.2 collector remains standalone read-only and has no project write or API call',()=>{
 const here=path.dirname(fileURLToPath(import.meta.url));
 const ps=fs.readFileSync(path.join(here,'../tools/COLLECT_WINDOWS_B42_READONLY.ps1'),'utf8');
 assert.match(ps,/Get-CimInstance/);assert.match(ps,/Get-NetTCPConnection/);
 assert.match(ps,/FileMode\]::CreateNew/);
 assert.doesNotMatch(ps,/Invoke-RestMethod|Invoke-WebRequest|Start-Process|Set-Content|Set-Item|Remove-Item|New-NetTCPConnection|\.Send\(/);
 assert.match(ps,/processDiscovery=\[ordered\]/);
 const report=fs.readFileSync(path.join(here,'../runner/step8b-runtime-b42.mjs'),'utf8');
 assert.doesNotMatch(report,/import .*general-building|import .*server-step7/);
});
