import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {evaluateEvidenceDelta} from '../runner/step8b-evidence-b43.mjs';
import {evaluateBuildReadiness} from '../runner/step8b-readiness-b5.mjs';
const folder=process.env.STEP8B_SOURCE_DIR;
const enabled=folder&&fs.existsSync(path.join(folder,'WINDOWS_SNAPSHOT_MANIFEST.json'))?test:test.skip;
const read=f=>JSON.parse(fs.readFileSync(new URL('../reports/'+f,import.meta.url)));
const baseline=read('B4_1_ORIGINAL_WINDOWS_CAPTURE.json');
const geo=()=>Object.fromEntries(['hotel','apartment','office'].map(p=>[p,read(p.toUpperCase()+'_STATIC_B3.json')]));
const api=()=>read('STEP8B_B4_STATIC_API_AUDIT.json');
const fixture=()=>{
 const mf=JSON.parse(fs.readFileSync(path.join(folder,'WINDOWS_SNAPSHOT_MANIFEST.json'),'utf8').replace(/^\uFEFF/,''));
 const hashes=new Map(mf.files.map(f=>[f.path,f.sha256]));
 const keys=baseline.sourceChecks.map(f=>f.key);
 return {schema:'minecraftaibuilder-step8b-b42-readonly-probe-v1',collectedAt:'2026-10-10T20:00:00+09:00',intent:baseline.intent,
 projectIdentity:structuredClone(baseline.projectIdentity),sourceChecks:keys.map(key=>({key,status:'OK',sha256:hashes.get(key)})),
 processDiscovery:{status:'OK',nodeProcessCount:1,records:[{pid:12,entrypoint:null,launchMode:'NONE',scriptHint:'NONE',parentClass:'UNKNOWN',createdAt:'2026-10-10T19:59:00+09:00',modifiedAfterStart:null,listenerPorts:[]}],
 truncated:false,listenerQueryStatus:'OK',listenerPortsProbed:[8000,8765]},safety:structuredClone(baseline.safety)};
};
enabled('B4.4 future process creation time fails closed',()=>{
 const c=fixture();c.processDiscovery.records[0].createdAt='2026-10-10T20:01:00+09:00';
 assert.throws(()=>evaluateEvidenceDelta(folder,baseline,c),{code:'B43_PROCESS_START_AFTER_CAPTURE'});
});
enabled('B4.4 unknown source status cannot claim a match',()=>{
 const c=fixture();c.sourceChecks[0]={key:'package.json',status:'UNREADABLE',sha256:null};
 const r=evaluateEvidenceDelta(folder,baseline,c);assert.equal(r.comparison.runtimeEvidenceLevel,'SOURCE_CONFLICT');
});
enabled('B4.4 truncated inventory defeats a plausible matching process',()=>{
 const c=fixture();c.processDiscovery.nodeProcessCount=101;c.processDiscovery.truncated=true;
 c.processDiscovery.records=Array.from({length:100},(_,i)=>({...c.processDiscovery.records[0],pid:i+1}));
 c.processDiscovery.records[0].launchMode='ABSOLUTE_PROJECT_ENTRYPOINT';c.processDiscovery.records[0].entrypoint='bridge/src/server-step7j.js';c.processDiscovery.records[0].modifiedAfterStart=false;
 const r=evaluateEvidenceDelta(folder,baseline,c);assert.equal(r.comparison.runtimeEvidenceLevel,'OBSERVATION_INCOMPLETE');
});
enabled('B4.4 metadata-only report excludes PID and arbitrary incoming fields',()=>{
 const c=fixture();c.processDiscovery.records[0].pid=444444444;
 const out=evaluateEvidenceDelta(folder,baseline,c);assert.doesNotMatch(JSON.stringify(out),/444444444|CommandLine|api.?key/i);
});
enabled('B4.4 tampering historical B4 source pin cannot promote readiness',()=>{
 const b=structuredClone(baseline);b.sourceChecks[0].sha256='0'.repeat(64);
 const r=evaluateEvidenceDelta(folder,b);assert.equal(r.baseline.criticalMatches,7);assert.equal(r.deploymentGate,'BLOCKED');
});
enabled('B4.4 readiness matrix never outputs a material or world action even if capture hints match',()=>{
 const c=fixture();c.processDiscovery.records[0].entrypoint='bridge/src/server-step7j.js';c.processDiscovery.records[0].launchMode='ABSOLUTE_PROJECT_ENTRYPOINT';c.processDiscovery.records[0].modifiedAfterStart=false;
 const r=evaluateBuildReadiness(geo(),api(),evaluateEvidenceDelta(folder,baseline,c));
 assert.deepEqual(r.materialBlockIds,[]);assert.deepEqual(r.blockStates,[]);assert.equal(r.worldAnchor,null);
 assert.deepEqual(r.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});assert.equal(r.deploymentGate,'BLOCKED');
});
test('B4.4 pin source files retained unmodified from earlier stages',()=>{
 const files={'HOTEL_STATIC_B3.json':'541bc2122b4e776af5694c615907b5f73537cab0e6576e8be89b525de415c167',
 'APARTMENT_STATIC_B3.json':'3242b91b1efec79350026b1692bf25cebd7959e65e3b335bd8ccbf06002b1dad',
 'OFFICE_STATIC_B3.json':'156d9ab7f615b9a103def5f96d18c23c993cff2b2719702fe372250d25c99001',
 'STEP8B_B4_STATIC_API_AUDIT.json':'d805b99b419506cf880f81cb9fe0e479e16f94560cb40d7e56ec835545df8138'};
 for(const [name,sha] of Object.entries(files))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../reports/'+name,import.meta.url))).digest('hex'),sha);
});
test('B4.4 no execution / connection primitives in read-only code paths',()=>{
 for(const f of ['step8b-evidence-b43.mjs','step8b-readiness-b5.mjs']){
  const code=fs.readFileSync(new URL('../runner/'+f,import.meta.url),'utf8');
  assert.doesNotMatch(code,/\bexecutePlan\s*\(|\bexecSync\s*\(|\bfetch\s*\(|\bcreateConnection\s*\(|\bspawn\s*\(/);
 }
});
