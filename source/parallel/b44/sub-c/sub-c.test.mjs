import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileB44CPreflight, BASELINE_REPORT_PATHS, reviewCandidateIR} from './preflight.mjs';
import {validateNonExecutableIR} from './safety-validator.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=process.env.B44_BASELINE_SOURCE||path.resolve(here,'../../../');
const load=(name)=>JSON.parse(fs.readFileSync(path.join(source,BASELINE_REPORT_PATHS[name]),'utf8'));
const sourceIR=(name)=>JSON.parse(fs.readFileSync(path.join(source,'reports/'+name),'utf8'));
const data=()=>Object.fromEntries(Object.keys(BASELINE_REPORT_PATHS).map(name=>[name,load(name)]));
const fixture=()=>({schema:'minecraftaibuilder-b44-sub-a-design-v1',kind:'LOCAL_SCHEMATIC_ONLY',readiness:'NOT_PREPARED',deployment:'BLOCKED',
 safety:{constructionApproved:false,executionAllowed:false,worldAccess:false,bridgeContact:false},
 doors:[{id:'D012',position:{x:3,z:4},blockId:null,doorStates:null,approved:false}],
 floors:[{level:1,cells:[{x:1,y:2,z:3}]}],worldAnchor:null,materialIds:[],BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}});
const reject=(patch,code)=>{const a=fixture();patch(a);assert.throws(()=>validateNonExecutableIR(a,{role:'sub-a'}),{code:`B44C_${code}`});};
test('exact frozen B26/B28/B29/B43 9 gates and immutable archive pins',()=>{
 const p=compileB44CPreflight(data());assert.equal(p.blockedGateCount,9);assert.equal(p.gates.length,9);
 assert.deepEqual(p.gates.map(g=>g.status),Array(9).fill('BLOCKED'));
 assert.equal(p.educationEdition.runtimeIdentity,'NOT_PROVEN');assert.equal(p.educationEdition.liveVersion,'unknown');
 assert.equal(p.capabilityChecks.filter(x=>x.status==='unknown').length,11);
 assert.equal(p.capabilityChecks.filter(x=>x.status==='verified').length,1);
 assert.equal(p.archivedCatalog.archiveVerified,827);assert.equal(p.archivedCatalog.archiveUnsupported,139);
 assert.equal(p.archivedCatalog.exactOrdinaryDoorRecords,0);
 assert.equal(p.BuildPlan.operations.length,0);
 assert.equal(p.engineCalls,0);assert.equal(p.buildOperations,0);
});
test('pin mismatch rejects altered baseline claims even with matching looking payload',()=>{
 const d=data();d.b28.runtime.identityAttested=true;
 assert.throws(()=>compileB44CPreflight(d),{code:'B44C_B28_HASH'});
 d.b28=load('b28');d.b26.blockers[0].confirmed=true;
 assert.throws(()=>compileB44CPreflight(d),{code:'B44C_B26_HASH'});
});
test('missing or unsupported baseline fails closed',()=>{
 const d=data(); delete d.b43graph;
 assert.throws(()=>compileB44CPreflight(d),{code:'B44C_B43GRAPH_PIN'});
});
test('representative A/B review-only IR can be accepted without granting execution',()=>{
 for(const role of ['sub-a','sub-b']){
  const a=fixture();a.schema=`minecraftaibuilder-b44-${role}-design-v1`;
  const r=reviewCandidateIR(a,role); assert.equal(r.acceptedForOfflineReview,true);
  assert.equal(r.deployment,'BLOCKED'); assert.equal(r.constructionApproved,false);
  assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.runtimeIdentity,'NOT_PROVEN');
 }
});
test('real frozen B43 nonexecuting concept assembly is accepted for offline review',()=>{
 const r=validateNonExecutableIR(sourceIR('B43_GUARDED_LAYOUT_ASSEMBLY.json'),{role:'baseline'});
 assert.equal(r.acceptedForOfflineReview,true);assert.equal(r.buildOperations,0);
});
test('real B43 multi-floor candidate input stays offline',()=>{
 const r=validateNonExecutableIR(sourceIR('B43_VERTICAL_CIRCULATION.json'),{role:'baseline'});
 assert.equal(r.acceptedForOfflineReview,true);assert.equal(r.runtimeIdentity,'NOT_PROVEN');
});
test('explicit approval (root or nested) always rejects',()=>{
 reject(a=>a.safety.constructionApproved=true,'MISSING_FAIL_CLOSED_SAFETY');
 reject(a=>a.doors[0].approved=true,'AUTHORIZATION_OR_PHYSICAL_PROOF');
 reject(a=>a.doors[0].paletteApproved=true,'AUTHORIZATION_OR_PHYSICAL_PROOF');
});
test('placements commands operations and nonempty build plans reject',()=>{
 reject(a=>a.BuildPlan.operations=[{x:1,z:2}], 'NONINERT_BUILDPLAN');
 reject(a=>a.doors[0].operations=[{do:'setblock'}], 'EXECUTABLE_PAYLOAD');
 reject(a=>a.doors[0].commands=['setblock 0 0 0 stone'], 'EXECUTABLE_PAYLOAD');
 reject(a=>a.doors[0].buildOperations=1, 'NONZERO_EXECUTION_COUNT');
});
test('world coordinates and material/state promotion reject',()=>{
 reject(a=>a.doors[0].worldCoordinates={x:1,y:2,z:3},'WORLD_REFERENCE');
 reject(a=>a.doors[0].worldAnchor={x:1,y:2,z:3},'WORLD_REFERENCE');
 reject(a=>a.doors[0].blockId='minecraft:stone','CONCRETE_BLOCK_OR_MATERIAL');
 reject(a=>a.doors[0].materialIds=['stone'],'CONCRETE_BLOCK_OR_MATERIAL');
 reject(a=>a.doors[0].doorBlockId=123,'CONCRETE_BLOCK_OR_MATERIAL');
 reject(a=>a.doors[0].description='minecraft:oak_stairs','CONCRETE_MINECRAFT_ID');
 reject(a=>a.coordinateFrame='WORLD','WORLD_FRAME');
});
test('loaded-runtime proof claims and physical verification cannot pass',()=>{
 reject(a=>a.runtimeIdentity='PROVEN','FALSE_PROOF_OR_APPROVAL');
 reject(a=>a.runtimeProven=true,'AUTHORIZATION_OR_PHYSICAL_PROOF');
 reject(a=>a.physicalValidated=true,'AUTHORIZATION_OR_PHYSICAL_PROOF');
 reject(a=>a.deployment='READY','FALSE_PROOF_OR_APPROVAL');
 reject(a=>a.readiness='PREPARED','FALSE_PROOF_OR_APPROVAL');
});
test('ambiguous or missing safety and invalid inputs fail closed',()=>{
 reject(a=>delete a.safety,'MISSING_FAIL_CLOSED_SAFETY');
 reject(a=>a.BuildPlan.commandCount=5,'NONINERT_BUILDPLAN');
 reject(a=>a.floors[0].cells[0].x=NaN,'NON_JSON_VALUE');
 reject(a=>a.loop=a,'SHARED_OR_CYCLIC_INPUT');
 assert.throws(()=>validateNonExecutableIR(fixture(),{role:'sub-x'}),{code:'B44C_ROLE'});
});

test('no promotion from symbolic to real ordinary door/stair block states',()=>{
 reject(a=>a.doors[0].hinge='left','UNVERIFIED_BLOCK_STATE_PROMOTED');
 reject(a=>a.doors[0].stateUpper='upper','UNVERIFIED_BLOCK_STATE_PROMOTED');
 reject(a=>a.doors[0].openState=false,'UNVERIFIED_BLOCK_STATE_PROMOTED');
 reject(a=>a.stairs=[{stairHalf:'top'}],'UNVERIFIED_BLOCK_STATE_PROMOTED');
 reject(a=>a.stairs=[{collisionVerified:true}],'PHYSICAL_PROOF_PROMOTED');
 reject(a=>a.approvedVariant={name:'A'},'CANDIDATE_APPROVAL_PROMOTED');
});

test('ambiguous operation/world aliases also fail closed',()=>{
 reject(a=>a.candidatePlacement={x:1,y:2,z:3},'EXECUTABLE_PAYLOAD');
 reject(a=>a.worldCoords=[1,2,3],'WORLD_REFERENCE');
 reject(a=>a.doorState='north','UNVERIFIED_BLOCK_STATE_PROMOTED');
 reject(a=>a.isApprovedToBuild=true,'AUTHORIZATION_OR_PHYSICAL_PROOF');
 reject(a=>a.physicalDoorVerified=true,'PHYSICAL_PROOF_PROMOTED');
});
