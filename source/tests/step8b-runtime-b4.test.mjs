import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateWindowsB4,PINNED_PATHS} from '../runner/step8b-runtime-b4.mjs';
const snapshot=process.env.STEP8B_SOURCE_DIR;
const sourceTest=snapshot&&fs.existsSync(path.join(snapshot,'WINDOWS_SNAPSHOT_MANIFEST.json'))?test:test.skip;
const fixture=()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(snapshot,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,''));
 const index=new Map(manifest.files.map(x=>[x.path,x.sha256]));
 return {schema:'minecraftaibuilder-step8b-b4-probe-v1',collectedAt:'2026-10-10T19:00:00+09:00',intent:'LOCAL_READ_ONLY_NO_API_CALLS',
  projectIdentity:{packageName:'minecraft-ai-builder',present:true,rootMarkerPresent:true},
  sourceChecks:PINNED_PATHS.map(key=>({key,status:'OK',sha256:index.get(key)})),
  processDiscovery:{status:'OK',nodeProcessCount:0,candidates:[]},
  safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,worldAccess:false,bridgeContact:false,projectFilesModified:false}};
};
const audit=p=>evaluateWindowsB4(snapshot,p);
sourceTest('B4 matches all 8 critical source pins without asserting runtime compatibility',()=>{
 const original=fixture(),before=JSON.stringify(original),r=audit(original);
 assert.equal(JSON.stringify(original),before);
 assert.equal(r.sourceAlignment,'CRITICAL_FILES_MATCH_CAPTURED_SOURCE');
 assert.equal(r.sourceFilesVerified,249);
 assert.equal(r.runtimeIdentity,'NOT_PROVEN');
 assert.equal(r.executionCompatibility,'UNKNOWN');
 assert.equal(r.deploymentGate,'BLOCKED');
 assert.deepEqual(r.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});
 assert.equal(r.worldAnchor,null);assert.deepEqual(r.blockStates,[]);
});
sourceTest('B4 sees no process without falsely claiming runtime absent',()=>{
 const r=audit(fixture());assert.equal(r.processState,'NO_NODE_PROCESS_OBSERVED');
 assert.equal(r.staticAPI.routeSource.planBuilding,'SOURCE_PRESENT_PROHIBITED_TO_CALL');
 assert.equal(r.staticAPI.routeSource.buildBuilding,'SOURCE_PRESENT_PROHIBITED_TO_CALL');
 assert.equal(r.staticAPI.plannerEntrypoint,'STATIC_EXPORT_PRESENT_PROHIBITED_TO_INVOKE');
});
sourceTest('B4 process metadata is only a heuristic even with absolute path and no source edits',()=>{
 const p=fixture();p.processDiscovery={status:'OK',nodeProcessCount:1,candidates:[{pid:4141,entrypoint:'bridge/src/server-step7j.js',launchMode:'PROJECT_ABSOLUTE_REFERENCE',createdAt:'2026-10-10T08:00:00Z',modifiedAfterStart:false}]};
 const r=audit(p);assert.equal(r.processState,'POSSIBLE_LAUNCH_MATCH_NOT_ATTESTED');assert.equal(r.runtimeIdentity,'NOT_PROVEN');
 assert.equal(r.processSignals[0].provenance,'PROCESS_COMMANDLINE_HEURISTIC_ONLY');
});
sourceTest('B4 relative process path or modified file does not count as trusted',()=>{
 const p=fixture();p.processDiscovery={status:'OK',nodeProcessCount:2,candidates:[
 {pid:4141,entrypoint:'bridge/src/server-step7j.js',launchMode:'RELATIVE_REFERENCE_UNBOUND',createdAt:null,modifiedAfterStart:null},
 {pid:4142,entrypoint:'bridge/src/server-step7o.js',launchMode:'PROJECT_ABSOLUTE_REFERENCE',createdAt:'2026-10-10T08:00:00Z',modifiedAfterStart:true}]};
 assert.equal(audit(p).processState,'RUNNING_PROJECT_IDENTITY_UNRESOLVED');
});
sourceTest('B4 distinguishes blocked access from no runtime',()=>{
 const p=fixture();p.processDiscovery={status:'ACCESS_DENIED_OR_UNAVAILABLE',nodeProcessCount:0,candidates:[]};
 assert.equal(audit(p).processState,'PROCESS_QUERY_UNAVAILABLE');
});
sourceTest('B4 detects source hash drift and unreadable files',()=>{
 const p=fixture();p.sourceChecks[0].sha256='f'.repeat(64);
 assert.equal(audit(p).sourceAlignment,'SOURCE_DRIFT_OR_UNREADABLE');
 p.sourceChecks[0]={key:'package.json',status:'UNREADABLE',sha256:null};
 assert.equal(audit(p).criticalChecks[0].comparison,'NOT_READABLE');
});
sourceTest('B4 fails closed on forged approval',()=>{
 const p=fixture();p.safety.executionAllowed=true;
 assert.throws(()=>audit(p),{code:'UNSAFE_CAPTURE_STATE'});
});
sourceTest('B4 rejects raw command line and path exfiltration',()=>{
 const p=fixture();p.processDiscovery={status:'OK',nodeProcessCount:1,candidates:[{pid:1,entrypoint:'bridge/src/server-step7j.js',launchMode:'PROJECT_ABSOLUTE_REFERENCE',createdAt:null,modifiedAfterStart:null,commandLine:'secret token=abc'}]};
 assert.throws(()=>audit(p),{code:'INVALID_PROCESS_RECORD'});
 const pp=fixture();pp.projectIdentity.root='C:\\Users\\someone';
 assert.throws(()=>audit(pp),{code:'UNKNOWN_PROJECT'});
});
sourceTest('B4 rejects altered or extra source list',()=>{
 const p=fixture();p.sourceChecks.push({...p.sourceChecks[0]});
 assert.throws(()=>audit(p),{code:'INVALID_SOURCE_LIST'});
 const x=fixture();x.sourceChecks[1].key=x.sourceChecks[0].key;
 assert.throws(()=>audit(x),{code:'INVALID_SOURCE_RECORD'});
});
sourceTest('B4 rejects tampered counts and unknown process classification',()=>{
 const p=fixture();p.processDiscovery.candidates=[{pid:1,entrypoint:null,launchMode:'PROJECT_ABSOLUTE_REFERENCE',createdAt:null,modifiedAfterStart:null}];p.processDiscovery.nodeProcessCount=1;
 assert.throws(()=>audit(p),{code:'INVALID_PROCESS_CLASSIFICATION'});
 const x=fixture();x.processDiscovery.nodeProcessCount=-1;
 assert.throws(()=>audit(x),{code:'INVALID_PROCESS_DISCOVERY'});
});
sourceTest('B4 payload guarantees no call arguments or write-capable operations in emitted JSON',()=>{
 const raw=JSON.stringify(audit(fixture()));
 for(const k of ['commandLine','fullPath','apiKey','authToken','worldName','localPath','password'])assert.ok(!raw.includes('"'+k+'"'));
 assert.ok(raw.includes('NOT_PREPARED'));
});
