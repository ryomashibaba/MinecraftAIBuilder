/** R26 mock-only diagnostics: NO Qwen, Ollama, Minecraft, or world I/O. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {analyzeR26Original,writeR26OriginalWhatIf}
 from './b198zr26-saved-original-whatif.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const candidate=()=>({
 design:{
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  designOnly:true,id:'r26-synthetic-test-hall',
  title:'Synthetic QA-only Library',brief:'No actual model was called for this fixture',
  bounds:{width:20,height:12,depth:20},
  elements:[
   {id:'floor',shape:'box',mode:'add',material:'concrete',
    origin:[0,0,0],size:[20,1,20]},
   {id:'outer',shape:'box',mode:'add',material:'glass',
    origin:[1,1,1],size:[18,7,18],shell:1},
   {id:'atrium',shape:'box',mode:'cut',origin:[2,1,2],size:[16,7,16]},
   {id:'bookshelf',shape:'box',mode:'add',material:'wood',
    origin:[7,1,7],size:[2,4,2]},
   ...Array.from({length:5},(_,i)=>({
    id:'window'+i,shape:'box',mode:'cut',material:'glass',
    origin:[1+i*3,2,1],size:[2,2,1]
   }))
  ]
 },
 spatialPlan:{
  designIntent:'A public QA hall used for source-only testing.',
  massStrategy:'Conceptual roof and walls with a hollowed interior.',
  circulationStrategy:'Entry reaches the central hall without simulation guarantees.',
  entrance:[3,1,2],headroom:2,
  protectedVoids:[],
  destinations:[{id:'inside',point:[3,1,3],maximumPathSteps:24}],
  functionalZones:[{id:'reading-zone',origin:[6,1,6],size:[5,1,5],
   minimumReachablePositions:20,minimumReachablePercent:80}]
 },
 explanation:'Fake mock; no actual model or approved building.',
 assumptions:[]
});
test('R26 preserves SHA pinned model original and exposes 5 illegal CUT materials',()=>{
 const x=JSON.stringify(candidate()),h=sha(x);
 const r=analyzeR26Original(x,{expectedSha256:h});
 assert.equal(r.rawSha256,h);
 assert.equal(sha(x),h);
 assert.equal(r.sourceElements,9);
 assert.equal(r.originalReview,'B143_MATERIAL');
 assert.equal(r.invalidCutMaterialElements.length,5);
 assert.equal(r.invalidAddMaterialElements.length,0);
 assert.equal(r.whatIf.transformationCount,5);
 assert.equal(r.whatIf.status,'SIMULATED_COMPILED_NOT_AN_ACCEPTED_ORIGINAL');
 assert(r.whatIf.strictB143SimulatedVoxelCount>0);
 assert.equal(r.whatIf.exactFinalVoxelZoneOccupancy[0].id,'reading-zone');
 assert.equal(r.whatIf.exactFinalVoxelZoneOccupancy[0].volumeCells,25);
 assert.equal(r.whatIf.exactFinalVoxelZoneOccupancy[0].occupiedCells,4);
 assert.equal(r.whatIf.exactFinalVoxelZoneOccupancy[0].materialCounts.wood,4);
 assert.equal(r.whatIf.simulatedSourceNeverPersisted,true);
 assert.equal(r.whatIf.neverEligibleForConstructionOrQualityApproval,true);
 assert.equal(r.attribution.modelRequests,0);
 assert.equal(r.safety.worldWrites,0);
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 assert.equal(r.sourceQuality,'HOLD_UNLESS_SEPARATELY_VERIFIED');
});
test('R26 refuses to fabricate missing ADD materials or infer material from element name',()=>{
 const x=candidate();
 x.design.elements[3].material=undefined;
 const raw=JSON.stringify(x);
 const r=analyzeR26Original(raw,{expectedSha256:sha(raw)});
 assert.equal(r.invalidCutMaterialElements.length,5);
 assert.equal(r.invalidAddMaterialElements.length,1);
 assert.equal(r.whatIf.status,'SKIPPED_NO_UNAMBIGUOUS_CUT_MATERIAL_ONLY');
 assert.equal(r.whatIf.transformationCount,0);
 assert.equal(r.whatIf.hypotheticalCloneSha256,null);
 assert.equal(r.whatIf.strictB143SimulatedVoxelCount,null);
 assert.deepEqual(r.whatIf.exactFinalVoxelZoneOccupancy,[]);
});
test('R26 does not simulate an edit when no invalid CUT material exists',()=>{
 const x=candidate();
 for(const e of x.design.elements)if(e.mode==='cut')delete e.material;
 const raw=JSON.stringify(x);
 const r=analyzeR26Original(raw,{expectedSha256:sha(raw)});
 assert.equal(r.invalidCutMaterialElements.length,0);
 assert.equal(r.whatIf.status,'SKIPPED_NO_UNAMBIGUOUS_CUT_MATERIAL_ONLY');
 assert.equal(r.whatIf.hypotheticalCloneSha256,null);
});
test('R26 wrong SHA is rejected before source parse or output creation',()=>{
 const original=JSON.stringify(candidate());
 assert.throws(()=>analyzeR26Original(original,{expectedSha256:'a'.repeat(64)}),
  /B198ZR26_ORIGINAL_SHA_MISMATCH/);
 assert.throws(()=>analyzeR26Original(original,{expectedSha256:null}),
  /B198ZR26_ORIGINAL_SHA_MISMATCH/);
});
test('R26 output report is new file only; preserves exact original bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r26-source-only-'));
 try{
  const input=path.join(root,'R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
  const output=path.join(root,'R26_OFFLINE_WHATIF.json');
  const original=JSON.stringify(candidate())+'\n';
  fs.writeFileSync(input,original);
  const r=writeR26OriginalWhatIf({
   rawPath:input,expectedSha256:sha(original),outPath:output});
  assert.equal(r.rawSha256,sha(original));
  assert.equal(fs.readFileSync(input,'utf8'),original);
  const emitted=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(emitted.whatIf.simulatedSourceNeverPersisted,true);
  assert.equal(emitted.sourceElements,9);
  assert.deepEqual(fs.readdirSync(root).sort(),[
   'R26_OFFLINE_WHATIF.json','R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt']);
  assert.throws(()=>writeR26OriginalWhatIf({
   rawPath:input,expectedSha256:sha(original),outPath:input}),
   /B198ZR26_NO_SOURCE_OVERWRITE/);
  assert.throws(()=>writeR26OriginalWhatIf({
   rawPath:input,expectedSha256:sha(original),outPath:output}),
   /B198ZR26_NEW_REPORT_ONLY/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
