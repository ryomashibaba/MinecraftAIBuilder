/** R190-AZ verified-source user-facing physical claims without model replay. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditR190AZModelClaims,writeR190AZAudit}
 from './r190az-physical-claims.mjs';

const original=fileURLToPath(new URL('../evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url));
const sha=x=>createHash('sha256').update(x).digest('hex');
const ORIGINAL_SHA='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17';
const box=(id,mode,origin,size,material)=>({
 id,mode,shape:'box',origin,size,...(material?{material}:{})
});
function designed(){
 return {design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'evidence-independent-model',title:'Creative multi-use civic canopy source proof',
  brief:'An author-chosen open-sided pavilion, real roof with an open sky cut and traversable floor.',
  bounds:{width:20,height:16,depth:20},designOnly:true,
  elements:[
   box('supported-floor','add',[2,0,2],[16,2,16],'stone'),
   box('cantilever-foundation','add',[2,2,2],[2,8,2],'concrete'),
   box('roof','add',[2,10,2],[16,4,16],'metal'),
   box('sky-opening','cut',[8,10,8],[4,4,4])
  ]},explanation:'A free open roofed civic canopy. Not an engineering safety claim.',
  assumptions:[],spatialPlan:{
   entrance:[6,2,5],headroom:2,
   protectedVoids:[{id:'sky-opening',origin:[8,2,8],size:[4,12,4],maxOccupiedCells:0}],
   destinations:[{id:'meeting-spot',point:[12,2,13],maximumPathSteps:45}],
   functionalZones:[{id:'people-space',origin:[5,2,4],size:[9,2,8],
    minimumReachablePositions:20,minimumReachablePercent:0.3}]
  }};
}
const audit=v=>auditR190AZModelClaims(Buffer.from(JSON.stringify(v)));

test('AZ original published real local model response remains HOLD, no invented geometry',()=>{
 const raw=fs.readFileSync(original),before=Buffer.from(raw);
 assert.equal(raw.length,2581);
 assert.equal(sha(raw),ORIGINAL_SHA);
 const r=auditR190AZModelClaims(raw,{expectedSha256:ORIGINAL_SHA});
 assert.equal(r.status,'HOLD_INVALID_B143');
 assert.equal(r.firstFailure,'B143_SCHEMA_OR_MODE');
 assert.equal(r.geometrySha256,null);assert.equal(r.physical,null);
 assert.equal(r.modelCallsByReview,0);assert.equal(r.worldWrites,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.equal(r.art,'ART_HOLD');
 assert.deepEqual(fs.readFileSync(original),before);
});
test('AZ independent valid original-source geometry checks effective sky and reachable destination',()=>{
 const s=designed(),before=JSON.stringify(s);
 const r=audit(s);
 assert.equal(r.status,'SOURCE_MODEL_CLAIMS_PHYSICAL_PROXIES_PASS_ART_HOLD');
 assert(r.geometrySha256!==null);
 assert(r.physical.finalSourceVoxelCount>200);
 assert.deepEqual(r.physical.cutEvidence.map(x=>x.status),['EFFECTIVE_CUT']);
 assert(r.physical.cutEvidence[0].removedSourceVoxels>=16);
 assert.equal(r.physical.modelDeclaredProtectedVoidEvidence[0].actualOccupied,0);
 assert.equal(r.physical.entranceStandable,true);
 assert.equal(r.physical.entranceToBoundaryAirProxy,true);
 assert.equal(r.physical.modelDeclaredDestinationEvidence[0].status,
  'SOURCE_PATH_PROXY_WITHIN_DECLARED_LIMIT');
 assert(r.physical.modelDeclaredDestinationEvidence[0].connectedStepProxy>4);
 assert.equal(r.physical.modelDeclaredZoneEvidence[0].status,
  'MODEL_ZONE_REACHABILITY_PROXY_MET');
 assert.equal(r.physical.noIndependentDoorOrRoofCertification,true);
 assert.equal(r.physical.stairWalkSimulation,'NOT_RUN');
 assert.equal(r.requirementFidelity,'NOT_CERTIFIED');
 assert.equal(r.actualMinecraftWalking,'NOT_TESTED');
 assert.equal(JSON.stringify(s),before);
});
test('AZ claim of sky courtyard fails when final B143 voxels occupy the protected volume',()=>{
 const s=designed();
 s.design.elements.push(box('late-air-occlusion','add',[8,4,8],[2,3,2],'metal'));
 const r=audit(s);
 assert.equal(r.status,'HOLD_MODEL_SOURCE_CLAIMS_UNSUPPORTED');
 assert.equal(r.physical.modelDeclaredProtectedVoidEvidence[0].actualOccupied,12);
 assert.equal(r.physical.modelDeclaredProtectedVoidEvidence[0].status,
  'HOLD_MODEL_VOID_OCCUPANCY_UNSUPPORTED');
});
test('AZ stops a CUT with no physical effect instead of calling it a genuine opening',()=>{
 const s=designed();
 s.design.elements.splice(3,1,box('no-op-court-cut','cut',[9,3,9],[2,2,2]));
 const r=audit(s);
 assert.equal(r.status,'HOLD_MODEL_SOURCE_CLAIMS_UNSUPPORTED');
 assert.equal(r.physical.cutEvidence[0].removedSourceVoxels,0);
 assert.equal(r.physical.cutEvidence[0].status,'HOLD_INEFFECTIVE_CUT');
});
test('AZ rejects a destination filled with a solid while preserving authored form',()=>{
 const s=designed();
 s.design.elements.push(box('blocked-target','add',[12,2,13],[2,2,2],'stone'));
 const r=audit(s);
 assert.equal(r.status,'HOLD_MODEL_SOURCE_CLAIMS_UNSUPPORTED');
 assert.equal(r.physical.modelDeclaredDestinationEvidence[0].status,
  'HOLD_DESTINATION_NOT_STANDABLE');
});
test('AZ missing author-provided functional declarations cannot gain a physical design PASS',()=>{
 const s=designed();
 delete s.spatialPlan.protectedVoids;
 const r=audit(s);
 assert.equal(r.status,'INSUFFICIENT_AUTHOR_DECLARATIONS');
 assert.equal(r.humanAestheticReview,'ART_HOLD');
});
test('AZ preserves SHA and outputs only derived evidence, no original or model call',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190az-'));
 try{
  const output=path.join(root,'new-review'),before=fs.readFileSync(original);
  assert.throws(()=>writeR190AZAudit({originalPath:original,outDir:output,
   expectedSha256:'0'.repeat(64)}),/R190AZ_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(output),false);
  const r=writeR190AZAudit({originalPath:original,outDir:output,
   expectedSha256:ORIGINAL_SHA});
  assert.equal(r.status,'HOLD_INVALID_B143');
  assert.deepEqual(fs.readdirSync(output).sort(),
   ['READ_ONLY_PHYSICAL_CLAIMS.json','STATUS_JA.txt']);
  assert.deepEqual(fs.readFileSync(original),before);
  assert.throws(()=>writeR190AZAudit({originalPath:original,outDir:output,
   expectedSha256:ORIGINAL_SHA}),/R190AZ_NEW_ABSOLUTE_OUTPUT_REQUIRED/);
  const symlink=path.join(root,'linked-original');
  fs.symlinkSync(original,symlink);
  assert.throws(()=>writeR190AZAudit({originalPath:symlink,
   outDir:path.join(root,'newer'),expectedSha256:ORIGINAL_SHA}),
   /R190AZ_UNSAFE_ORIGINAL/);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
