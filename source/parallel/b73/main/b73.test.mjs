import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';
import {buildB73} from './run-b73.mjs';
import {inspectB73Sources,RUNTIME_ASSETS} from './b73-asset-contract.mjs';
import {createOfflinePlanner} from './b73-vm-runner.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(here,'runtime_evidence');const meta=JSON.parse(fs.readFileSync(path.join(root,'B72_DEPENDENCY_MANIFEST.json')));
test('pinned production 5 and additional 25 clean',()=>{const r=inspectB73Sources(root,meta);assert.equal(r.pinnedSourceCount,30);assert.equal(r.pinnedSourcesMismatch,0)});
test('static JS imports closed',()=>{assert.deepEqual(inspectB73Sources(root,meta).staticESMClosureMissing,[])});
test('six runtime assets known exact',()=>{assert.equal(RUNTIME_ASSETS.length,6);assert.deepEqual(inspectB73Sources(root,meta).missingRuntimeAssets,RUNTIME_ASSETS)});
test('reject changed source hash',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b73-pin-'));try{
 fs.cpSync(root,dir,{recursive:true});fs.appendFileSync(path.join(dir,'engine/src/safety.js'),'\n//mutated');
 assert.throws(()=>inspectB73Sources(dir,meta),/SOURCE_MISMATCH/);
}finally{fs.rmSync(dir,{recursive:true,force:true})}});
test('reject symlink evidence',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'b73-link-'));try{
 fs.cpSync(root,dir,{recursive:true});const f=path.join(dir,'engine/src/safety.js');fs.unlinkSync(f);fs.symlinkSync(path.join(root,'engine/src/safety.js'),f);
 assert.throws(()=>inspectB73Sources(dir,meta),/SYMLINK/);
}finally{fs.rmSync(dir,{recursive:true,force:true})}});
test('refuse to run planner with assets missing',async()=>{await assert.rejects(createOfflinePlanner(root,meta),/MISSING_ASSETS/)});
test('fail source scope mismatch',()=>{const altered=structuredClone(meta);altered.files.pop();assert.throws(()=>inspectB73Sources(root,altered),/BAD_DEPENDENCY_MANIFEST/)});
test('B73 safety, package lineage, isolated runner status',async()=>{const r=await buildB73();assert.equal(r.runtimeStatus,'BLOCKED_MISSING_CATALOG_RUNTIME_ASSETS');assert.equal(r.readiness,'NOT_PREPARED');assert.equal(r.executionAllowed,false);
 assert.equal(r.constructionApproved,false);assert.equal(r.gates.length,9);assert.ok(r.gates.every(g=>g.status==='BLOCKED'));
 assert.equal(r.BuildPlan.operations.length,0);assert.equal(r.BuildPlan.commandCount,0);assert.equal(r.worldContacts,0);
 assert.equal(r.plans.length,0);assert.equal(r.summary.plannerExecutedOffline,false);
 const saved=JSON.parse(fs.readFileSync(path.join(here,'B73_OFFLINE_PREFLIGHT_REPORT.json')));
 assert.deepEqual(r,saved);
});
