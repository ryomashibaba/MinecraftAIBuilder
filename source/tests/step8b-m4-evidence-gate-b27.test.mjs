import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {assessB27Evidence} from '../runner/step8b-m4-evidence-gate-b27.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'reports/B26_M4_READONLY_PREFLIGHT.json'),'utf8'));
const NOW='2026-10-11T22:00:00+09:00';
const good=()=>({schema:'minecraftaibuilder-step8b-b27-m4-readonly-probe-v1',collectedAt:'2026-10-11T11:00:00+09:00',
 intent:'LOCAL_FILES_AND_OS_METADATA_READ_ONLY',projectIdentity:'minecraft-ai-builder',
 sourceChecks:Object.entries(baseline.source.sourceHashes).map(([key,sha256])=>({key,status:'OK',sha256})),
 materialProfile:{status:'OK',version:'v26.3',recordCount:966,statusCounts:{verified:827,unsupported:139},doorStateRecords:0},
 processSummary:{status:'OK',nodeProcessCount:3,listenerStatus:'OK',listenerPortCount8000:1,listenerPortCount8765:1,rootPathHintCount:1,entrypointHintCount:2},
 safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,projectFilesModified:false,buildOperations:0}});
const assess=x=>assessB27Evidence(x,baseline,{now:NOW});
const reject=x=>assert.throws(()=>assess(x),/^Error: B27_/);
function patch(fn){const x=good();fn(x);return x;}
test('B27.01 baseline B26 frozen offline evidence shape valid',()=>assert.equal(assess(good()).sourceCount,9));
test('B27.02 perfect 9/9 disk hashes stays blocked',()=>{let a=assess(good());assert.equal(a.sourceOutcome,'ALL_9_DISK_HASHES_MATCH');assert.equal(a.policy.deploymentGate,'BLOCKED');});
test('B27.03 even high process signals never prove runtime',()=>assert.equal(assess(good()).processObservation.runtimeIdentityAttested,false));
test('B27.04 historic material match is explicitly not live proof',()=>assert.match(assess(good()).materialFinding,/NOT_LIVE_PROOF/));
test('B27.05 source mutation identified but no promotion',()=>{const a=assess(patch(x=>x.sourceChecks[0].sha256='0'.repeat(64)));assert.equal(a.sourceOutcome,'SOURCE_DRIFT_DETECTED');assert.equal(a.blockersOpen,9);});
test('B27.06 missing source identified but all gates remain shut',()=>{const a=assess(patch(x=>{x.sourceChecks[0].status='MISSING';x.sourceChecks[0].sha256=null}));assert.equal(a.sourceOutcome,'SOURCE_DATA_INCOMPLETE');assert.equal(a.policy.commandCount,0);});
test('B27.07 rejects unexpected root data field',()=>reject(patch(x=>x.localPath='C:\\Users\\private')));
test('B27.08 rejects unauthorized BuildPlan',()=>reject(patch(x=>x.BuildPlan={operations:[{type:'setblock'}]})));
test('B27.09 rejects forged safety flag',()=>reject(patch(x=>x.safety.constructionApproved=true)));
test('B27.10 rejects disguised executionAllowed',()=>reject(patch(x=>x.safety.executionAllowed=true)));
test('B27.11 rejects commandline in processSummary',()=>reject(patch(x=>x.processSummary.commandLine='secret')));
test('B27.12 rejects duplicated source',()=>reject(patch(x=>x.sourceChecks[1].key=x.sourceChecks[0].key)));
test('B27.13 rejects missing source',()=>reject(patch(x=>x.sourceChecks.pop())));
test('B27.14 rejects unapproved source path',()=>reject(patch(x=>x.sourceChecks[0].key='config/.env')));
test('B27.15 rejects invalid digest',()=>reject(patch(x=>x.sourceChecks[0].sha256='AAA')));
test('B27.16 rejects fake missing status with digest',()=>reject(patch(x=>x.sourceChecks[0].status='MISSING')));
test('B27.17 rejects time lacking timezone',()=>reject(patch(x=>x.collectedAt='2026-10-11T11:00:00')));
test('B27.18 rejects stale file',()=>reject(patch(x=>x.collectedAt='2026-09-01T10:00:00+09:00')));
test('B27.19 rejects future capture',()=>reject(patch(x=>x.collectedAt='2026-10-12T12:00:00+09:00')));
test('B27.20 rejects conflicting material counts',()=>reject(patch(x=>x.materialProfile.recordCount=1000)));
test('B27.21 changed profile is blocked not misreported',()=>{const a=assess(patch(x=>x.materialProfile.version='v26.4'));assert.equal(a.materialFinding,'PROFILE_CHANGED');assert.equal(a.policy.deploymentGate,'BLOCKED');});
test('B27.22 missing profile remains unknown',()=>{const a=assess(patch(x=>x.materialProfile={status:'UNAVAILABLE',version:null,recordCount:null,statusCounts:null,doorStateRecords:null}));assert.equal(a.materialFinding,'PROFILE_UNAVAILABLE');});
test('B27.23 impossible process hints rejected',()=>reject(patch(x=>x.processSummary.entrypointHintCount=4)));
test('B27.24 listener unavailable must have zero counts',()=>reject(patch(x=>x.processSummary.listenerStatus='UNAVAILABLE')));
test('B27.25 no Node still not runtime proof',()=>{const a=assess(patch(x=>{x.processSummary.nodeProcessCount=0;x.processSummary.rootPathHintCount=0;x.processSummary.entrypointHintCount=0}));assert.equal(a.processObservation.runtimeIdentityAttested,false);});
test('B27.26 process unavailable can be reported',()=>{const a=assess(patch(x=>{x.processSummary.status='UNAVAILABLE';x.processSummary.nodeProcessCount=null;x.processSummary.rootPathHintCount=0;x.processSummary.entrypointHintCount=0}));assert.equal(a.processObservation.nodeProcessCount,null);});
test('B27.27 rejects injected secret in material status map',()=>reject(patch(x=>x.materialProfile.statusCounts.token='secret')));
test('B27.28 nine blockers stay blocked and named',()=>{let a=assess(good());assert.deepEqual(a.blockers.map(b=>b.id),Array.from({length:9},(_,i)=>'M4-'+String(i+1).padStart(2,'0')));assert.ok(a.blockers.every(b=>b.status==='BLOCKED'));});
test('B27.29 deterministic assessment digest',()=>assert.equal(assess(good()).assessmentSha256,assess(good()).assessmentSha256));
test('B27.30 no material, coordinates or operations',()=>{const a=assess(good());assert.deepEqual(a.policy.outputOperations,[]);assert.deepEqual(a.policy.materialIds,[]);assert.equal(a.policy.worldCoordinates,null);});
test('B27.31 rejects tampered baseline',()=>{let x=JSON.parse(JSON.stringify(baseline));x.gate.constructionApproved=true;assert.throws(()=>assessB27Evidence(good(),x,{now:NOW}),/B27_BASELINE_SAFETY/);});
test('B27.32 rejects missing blocker from baseline',()=>{let x=JSON.parse(JSON.stringify(baseline));x.blockers.pop();assert.throws(()=>assessB27Evidence(good(),x,{now:NOW}),/B27_BASELINE_SAFETY/);});
