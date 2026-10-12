import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {evaluateBuildReadiness} from '../runner/step8b-readiness-b5.mjs';
import {evaluateEvidenceDelta} from '../runner/step8b-evidence-b43.mjs';
const decode=n=>JSON.parse(fs.readFileSync(new URL('../reports/'+n,import.meta.url)));
const geometry=()=>Object.fromEntries(['hotel','apartment','office'].map(p=>[p,decode(p.toUpperCase()+'_STATIC_B3.json')]));
const api=()=>decode('STEP8B_B4_STATIC_API_AUDIT.json');
const snapshot=process.env.STEP8B_SOURCE_DIR;
const historical=decode('B4_1_ORIGINAL_WINDOWS_CAPTURE.json');
const enabled=snapshot?test:test.skip;
const delta=()=>evaluateEvidenceDelta(snapshot,historical);
const safe=r=>{assert.equal(r.deploymentGate,'BLOCKED');assert.deepEqual(r.BuildPlan,{status:'NOT_PREPARED',operations:[],commandCount:0});assert.deepEqual(r.materialBlockIds,[]);assert.equal(r.worldCoordinates,null);assert.equal(r.safety.executionAllowed,false);};
enabled('B5 checks 3 programs and 288 geometry cases without enabling construction',()=>{
 const r=evaluateBuildReadiness(geometry(),api(),delta());safe(r);assert.equal(r.staticGeometryCases,288);assert.equal(r.programs.length,3);
 assert.equal(r.programs[2].mismatchedCandidates.length,1);
 assert.deepEqual(r.programs[2].mismatchedCandidates[0].removedCellsByFloor,[22,22,22,22,22,13]);
 assert.equal(r.gates.filter(g=>g.state==='BLOCKED').length,7);
});
enabled('B5 conceptual geometry comparisons cannot become execution compatibility',()=>{
 const r=evaluateBuildReadiness(geometry(),api(),delta());safe(r);assert.equal(r.runtimeIdentity,'NOT_PROVEN');assert.equal(r.executionCompatibility,'UNKNOWN');
});
enabled('B5 rejects missing use case, unsafe candidate, changed root program',()=>{
 const a=geometry();delete a.hotel;assert.throws(()=>evaluateBuildReadiness(a,api(),delta()),{code:'B5_PROGRAMS_NOT_COMPLETE'});
 const b=geometry();b.hotel.candidates[0].worldCoordinates={x:0};assert.throws(()=>evaluateBuildReadiness(b,api(),delta()),{code:'B5_UNSAFE_CANDIDATE'});
 const c=geometry();c.apartment.candidates[0].BuildPlan.operations=[{op:'build'}];assert.throws(()=>evaluateBuildReadiness(c,api(),delta()),{code:'B5_UNSAFE_CANDIDATE'});
});
enabled('B5 rejects tampered report checksum and changed matrix',()=>{
 const a=geometry();a.office.candidates[1].comparison.match=true;assert.throws(()=>evaluateBuildReadiness(a,api(),delta()),{code:'B5_GEOMETRY_CHECKSUM_MISMATCH'});
 const b=geometry();b.office.crossMatrix.pop();assert.throws(()=>evaluateBuildReadiness(b,api(),delta()),{code:'B5_UNSAFE_OR_INCOMPLETE_GEOMETRY'});
});
enabled('B5 rejects tampered matrix even with recalculated checksum',()=>{
 const a=geometry();a.hotel.crossMatrix[0].seed=999;
 const c={...a.hotel};delete c.reportSha256;a.hotel.reportSha256=createHash('sha256').update(JSON.stringify(c)).digest('hex');
 assert.throws(()=>evaluateBuildReadiness(a,api(),delta()),{code:'B5_GEOMETRY_BASELINE_CHANGED'});
});
enabled('B5 rejects execution enabled API audit or mismatched snapshot pin',()=>{
 const a=api();a.deploymentGate='OPEN';assert.throws(()=>evaluateBuildReadiness(geometry(),a,delta()),{code:'B5_INVALID_STATIC_API_EVIDENCE'});
 const b=api();b.snapshotManifestSha256='f'.repeat(64);assert.throws(()=>evaluateBuildReadiness(geometry(),b,delta()),{code:'B5_INVALID_STATIC_API_EVIDENCE'});
});
enabled('B5 rejects fake attested runtime or construction prepared status',()=>{
 const a=delta();a.runtimeIdentity='ATTESTED';assert.throws(()=>evaluateBuildReadiness(geometry(),api(),a),{code:'B5_INVALID_RUNTIME_EVIDENCE'});
 const b=delta();b.BuildPlan.status='PREPARED';assert.throws(()=>evaluateBuildReadiness(geometry(),api(),b),{code:'B5_INVALID_RUNTIME_EVIDENCE'});
});
test('B5 source does not invoke planner, write world, or network',()=>{
 const s=fs.readFileSync(new URL('../runner/step8b-readiness-b5.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(s,/executePlan|child_process|http:|https:|net:|fetch\(|build\/building|import .*engine/);
 assert.match(s,/operations:\[\],commandCount:0/);
});
