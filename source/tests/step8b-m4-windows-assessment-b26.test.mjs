import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {assessB26WindowsEvidence} from '../runner/step8b-m4-windows-assessment-b26.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=JSON.parse(fs.readFileSync(path.join(root,'reports/B26_M4_READONLY_PREFLIGHT.json'),'utf8'));
const good=()=>({schema:'minecraftaibuilder-step8b-b26-m4-readonly-probe-v1',collectedAt:'2026-10-11T12:00:00+09:00',intent:'LOCAL_FILES_AND_OS_METADATA_READ_ONLY',projectIdentity:'minecraft-ai-builder',
 sourceChecks:Object.entries(base.source.sourceHashes).map(([key,sha256])=>({key,status:'OK',sha256})),
 materialProfile:{status:'OK',version:'v26.3',recordCount:966,doorStateRecords:0,statusCounts:{verified:827,unsupported:139}},
 processSummary:{status:'OK',nodeProcessCount:3,listenerStatus:'OK',listenerPortCount8000:1,listenerPortCount8765:1},
 safety:{notPrepared:true,constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false,projectFilesModified:false,buildOperations:0}});
const reject=x=>assert.throws(()=>assessB26WindowsEvidence(x,base),/B26_PROBE_/);
test('M4.01 all matching files still blocked',()=>{const r=assessB26WindowsEvidence(good(),base);assert.equal(r.sourceMatchCount,9);assert.equal(r.deploymentGate,'BLOCKED');});
test('M4.02 loaded Node processes do not imply runtime attestation',()=>{const r=assessB26WindowsEvidence(good(),base);assert.equal(r.runningCodeIdentityProven,false);});
test('M4.03 archived profile matching is not construction approval',()=>{const r=assessB26WindowsEvidence(good(),base);assert.equal(r.historicalProfileComparison,'ARCHIVED_PROFILE_COUNTS_MATCH');assert.equal(r.constructionReady,false);});
test('M4.04 one changed source is identified',()=>{const x=good();x.sourceChecks[0].sha256='0'.repeat(64);const r=assessB26WindowsEvidence(x,base);assert.equal(r.sourceMatchCount,8);assert.equal(r.sourceAllMatch,false);});
test('M4.05 missing source is not counted',()=>{const x=good();x.sourceChecks[0].status='MISSING';x.sourceChecks[0].sha256=null;assert.equal(assessB26WindowsEvidence(x,base).sourceMatchCount,8);});
test('M4.06 reject missing key',()=>{const x=good();x.sourceChecks.pop();reject(x);});
test('M4.07 reject duplicate key',()=>{const x=good();x.sourceChecks[1].key=x.sourceChecks[0].key;reject(x);});
test('M4.08 reject extra untrusted key',()=>{const x=good();x.sourceChecks.push({key:'config/.env',status:'OK',sha256:'0'.repeat(64)});reject(x);});
test('M4.09 reject forced authorization',()=>{const x=good();x.safety.constructionApproved=true;reject(x);});
test('M4.10 reject unexpected executable content',()=>{const x=good();x.BuildPlan={operations:[{type:'fill'}]};reject(x);});
test('M4.11 reject commandLine export',()=>{const x=good();x.processSummary.commandLine='private';reject(x);});
test('M4.12 changed education profile does not pass archived compare',()=>{const x=good();x.materialProfile.version='v26.4';assert.equal(assessB26WindowsEvidence(x,base).historicalProfileComparison,'PROFILE_COUNTS_CHANGED');});
test('M4.13 missing profile is an explicit unknown',()=>{const x=good();x.materialProfile={status:'UNAVAILABLE',version:null,recordCount:null,doorStateRecords:null,statusCounts:null};assert.equal(assessB26WindowsEvidence(x,base).historicalProfileComparison,'PROFILE_UNAVAILABLE');});
test('M4.14 reject forged material count totals',()=>{const x=good();x.materialProfile.recordCount=999;reject(x);});
test('M4.15 no Node does not claim machine is permanently stopped',()=>{const x=good();x.processSummary.nodeProcessCount=0;assert.equal(assessB26WindowsEvidence(x,base).runningCodeIdentityProven,false);});
test('M4.16 reject false safety posture',()=>{const x=good();x.safety.worldAccess=true;reject(x);});
test('M4.17 invalid date is blocked',()=>{const x=good();x.collectedAt='bad-date';reject(x);});
test('M4.18 rejects arbitrary listener count',()=>{const x=good();x.processSummary.listenerPortCount8000=-1;reject(x);});
