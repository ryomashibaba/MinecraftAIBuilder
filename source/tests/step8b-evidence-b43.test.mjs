import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {evaluateEvidenceDelta} from '../runner/step8b-evidence-b43.mjs';
import {PINNED_PATHS} from '../runner/step8b-runtime-b4.mjs';
const dir=process.env.STEP8B_SOURCE_DIR;
const enabled=dir&&fs.existsSync(path.join(dir,'WINDOWS_SNAPSHOT_MANIFEST.json'))?test:test.skip;
const historical=JSON.parse(fs.readFileSync(new URL('../reports/B4_1_RUNTIME_ASSESSMENT_20261010.json',import.meta.url)));
const historicalInput=JSON.parse(fs.readFileSync(new URL('../reports/B4_1_ORIGINAL_WINDOWS_CAPTURE.json',import.meta.url)));
function make(){const mf=JSON.parse(fs.readFileSync(path.join(dir,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,''));const sha=new Map(mf.files.map(f=>[f.path,f.sha256]));return {
 schema:'minecraftaibuilder-step8b-b42-readonly-probe-v1',collectedAt:'2026-10-10T20:00:00+09:00',intent:'LOCAL_READ_ONLY_NO_API_CALLS',
 projectIdentity:{packageName:'minecraft-ai-builder',present:true,rootMarkerPresent:true},sourceChecks:PINNED_PATHS.map(key=>({key,status:'OK',sha256:sha.get(key)})),
 processDiscovery:{status:'OK',nodeProcessCount:4,records:[1,2,3,4].map(pid=>({pid,entrypoint:null,launchMode:'NONE',scriptHint:'NONE',parentClass:'UNKNOWN',createdAt:null,modifiedAfterStart:null,listenerPorts:[]})),truncated:false,listenerQueryStatus:'OK',listenerPortsProbed:[8000,8765]},
 safety:{notPrepared:true,executionAllowed:false,constructionApproved:false,worldAccess:false,bridgeContact:false,projectFilesModified:false}
};}
const safe=r=>{assert.equal(r.deploymentGate,'BLOCKED');assert.equal(r.runtimeIdentity,'NOT_PROVEN');assert.equal(r.executionCompatibility,'UNKNOWN');assert.deepEqual(r.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});};
enabled('B43 historical B4 baseline source exactly pinned and no fabricated B42',()=>{
 const r=evaluateEvidenceDelta(dir,historicalInput);safe(r);assert.equal(r.comparison.runtimeEvidenceLevel,'BASELINE_ONLY');
 assert.equal(r.baseline.nodeProcessCount,4);assert.equal(r.baseline.criticalMatches,8);assert.equal(r.current.status,'NOT_COLLECTED');
 assert.equal(r.baseline.collectedAt,historical.collectedAt);
});
enabled('B43 new report matches baseline 8 hashes but cannot attest loaded code',()=>{
 const input=make();const before=JSON.stringify(input);const r=evaluateEvidenceDelta(dir,historicalInput,input);safe(r);
 assert.equal(JSON.stringify(input),before);assert.equal(r.comparison.sourceState,'CRITICAL_DISK_SOURCES_MATCH');
 assert.equal(r.comparison.runtimeEvidenceLevel,'NO_ATTESTED_PROJECT_LAUNCH');assert.equal(r.comparison.processCountDelta,0);
 assert.deepEqual(r.comparison.criticalComparisonTransitions,[]);
});
enabled('B43 absolute entrypoint path remains possible-only',()=>{
 const c=make();c.processDiscovery.records[0]={...c.processDiscovery.records[0],entrypoint:'bridge/src/server-step7j.js',launchMode:'ABSOLUTE_PROJECT_ENTRYPOINT',createdAt:'2026-10-10T19:30:00+09:00',modifiedAfterStart:false};
 const r=evaluateEvidenceDelta(dir,historicalInput,c);safe(r);
 assert.equal(r.comparison.runtimeEvidenceLevel,'POSSIBLE_LAUNCH_NOT_ATTESTED');
});
enabled('B43 port only is non-attesting; no PID leaked into summary',()=>{
 const c=make();c.processDiscovery.records[0].pid=123456;c.processDiscovery.records[0].listenerPorts=[8000,8765];
 const r=evaluateEvidenceDelta(dir,historicalInput,c);safe(r);assert.equal(r.comparison.runtimeEvidenceLevel,'NO_ATTESTED_PROJECT_LAUNCH');
 assert.doesNotMatch(JSON.stringify(r),/123456/);
});
enabled('B43 source drift is blocked even when apparent process matches',()=>{
 const c=make();c.sourceChecks[0].sha256='f'.repeat(64);
 c.processDiscovery.records[0]={...c.processDiscovery.records[0],entrypoint:'bridge/src/server-step7j.js',launchMode:'ABSOLUTE_PROJECT_ENTRYPOINT',createdAt:'2026-10-10T19:30:00+09:00',modifiedAfterStart:false};
 const r=evaluateEvidenceDelta(dir,historicalInput,c);safe(r);assert.equal(r.comparison.runtimeEvidenceLevel,'SOURCE_CONFLICT');
 assert.deepEqual(r.comparison.criticalComparisonTransitions,['package.json']);
});
enabled('B43 snapshots earlier than baseline rejected rather than compared',()=>{
 const c=make();c.collectedAt='2026-10-10T18:00:00+09:00';
 assert.throws(()=>evaluateEvidenceDelta(dir,historicalInput,c),{code:'B43_CAPTURE_NOT_NEWER_THAN_BASELINE'});
});
enabled('B43 replay same timestamp rejected',()=>{
 const c=make();c.collectedAt=historicalInput.collectedAt;
 assert.throws(()=>evaluateEvidenceDelta(dir,historicalInput,c),{code:'B43_CAPTURE_NOT_NEWER_THAN_BASELINE'});
});
enabled('B43 safety bypass, unknown keys and fake process owner rejected',()=>{
 const a=make();a.safety.executionAllowed=true;assert.throws(()=>evaluateEvidenceDelta(dir,historicalInput,a),{code:'UNSAFE_CAPTURE_STATE'});
 const b=make();b.processDiscovery.records[0].commandLine='token=secret';assert.throws(()=>evaluateEvidenceDelta(dir,historicalInput,b),{code:'B42_INVALID_PROCESS_RECORD'});
 const c=make();c.processDiscovery.records[0].listenerPorts=[22];assert.throws(()=>evaluateEvidenceDelta(dir,historicalInput,c),{code:'B42_INVALID_PROCESS_RECORD'});
});
enabled('B43 incomplete process inventory remains incomplete',()=>{
 const c=make();c.processDiscovery.status='ACCESS_DENIED_OR_UNAVAILABLE';c.processDiscovery.nodeProcessCount=0;c.processDiscovery.records=[];
 const r=evaluateEvidenceDelta(dir,historicalInput,c);safe(r);assert.equal(r.comparison.runtimeEvidenceLevel,'OBSERVATION_INCOMPLETE');
});
test('B43 implementation has no external I/O, Minecraft/Bridge imports or executable plan',()=>{
 const s=fs.readFileSync(new URL('../runner/step8b-evidence-b43.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(s,/child_process|http:|https:|net:|dgram:|fetch\(|executePlan|build\/building/);
 assert.match(s,/commandCount:0/);
});
