import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {R30_GUIDE_SHA256,R30_GUIDE_UTF8_BYTES}
 from '../source/ai/b198zr30-generalized-space-guide.mjs';
import {R41_DRAFT_GUIDE,GUIDE_SHA256,GUIDE_UTF8_BYTES,
 PARENT_R30_SHA256,inspectR41Draft,inspectR41Candidate}
 from '../source/ai/b198zr41-architecture-authoring-candidate.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,origin,size,...(material?{material}:{})});
test('R41 is shorter than R30 and cannot trigger Qwen or world operations',()=>{
 const r=inspectR41Draft();
 assert.equal(GUIDE_SHA256,sha(R41_DRAFT_GUIDE));
 assert.equal(GUIDE_UTF8_BYTES,Buffer.byteLength(R41_DRAFT_GUIDE));
 assert.equal(PARENT_R30_SHA256,R30_GUIDE_SHA256);
 assert(GUIDE_UTF8_BYTES<R30_GUIDE_UTF8_BYTES);
 assert.equal(r.activation,'NOT_ENABLED');
 assert.equal(r.successRateMeasured,false);
 assert.equal(r.realModelImprovementProven,false);
 assert.equal(r.modelCalls,0);assert.equal(r.worldWrites,0);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R41 guidance preserves originality and known failure constraints',()=>{
 for(const t of ['Japanese brief','never a category template','four','cut',
   'MUST OMIT material','shell','before the openings/void cuts',
   'y>=1','supported floors','destinations','functionalZones',
   '3D','Minecraft']){
  if(t==='four'||t==='3D')continue;
  assert(R41_DRAFT_GUIDE.includes(t),t);
 }
 for(const forbidden of ['[23,0,44]','z=44','always construct a library',
   'automatically repair the model original'])
  assert(!R41_DRAFT_GUIDE.includes(forbidden),forbidden);
});
test('R41 accepts ONLY abstract B143/R3/R4 results, not Qwen quality proof',()=>{
 const raw=JSON.stringify(r32Courtyard());
 const r=inspectR41Candidate(raw);
 assert.equal(r.rawSha256,sha(raw));
 assert.equal(r.status,'FORMAL_GEOMETRY_ONLY_PASS_HUMAN_REVIEW_REQUIRED');
 assert.equal(r.issues.length,0);
 assert.equal(r.modelAuthorshipAuthenticated,false);
 assert.equal(r.independentHumanQualityApproved,false);
 assert.equal(r.minecraftWalkingVerified,false);
 assert.equal(r.originalUnchanged,true);
});
test('R41 catches illegal CUT material without modifying raw original',()=>{
 const p=r32Courtyard(),e=p.design.elements.find(e=>e.mode==='cut');
 e.material='glass';
 const raw=JSON.stringify(p),r=inspectR41Candidate(raw);
 assert.equal(r.status,'HOLD_SOURCE_OR_ENTRANCE');
 assert.equal(r.sourceErrorCode,'B143_MATERIAL');
 assert.equal(r.rawSha256,sha(raw));
 assert.equal(JSON.parse(raw).design.elements.find(e=>e.mode==='cut')?.material,'glass');
});
test('R41 detects a later ADD that refills a supposed open courtyard',()=>{
 const p=r32Courtyard();
 p.design.elements.push(box('late-occupancy','add',[6,1,6],[4,4,4],'glass'));
 const r=inspectR41Candidate(JSON.stringify(p));
 assert.equal(r.status,'HOLD_SPATIAL_BUILDABILITY');
 assert(r.issues.some(x=>x.kind==='VOID_REFILLED'&&x.id==='court-air'));
 assert.equal(r.independentHumanQualityApproved,false);
});
test('R41 blocks unsupported entrance instead of silently relocating it',()=>{
 const p=r32Courtyard();p.spatialPlan.entrance=[7,0,2];
 const raw=JSON.stringify(p),r=inspectR41Candidate(raw);
 assert.equal(r.status,'HOLD_SOURCE_OR_ENTRANCE');
 assert.equal(r.sourceErrorCode,'B198ZR3_CONTRACT_ENTRANCE_NOT_STANDABLE');
 assert.deepEqual(JSON.parse(raw).spatialPlan.entrance,[7,0,2]);
});
test('R41 never repairs unfinished raw JSON or guesses model identity',()=>{
 const r=inspectR41Candidate('{"design":');
 assert.equal(r.status,'HOLD_SOURCE_OR_ENTRANCE');
 assert.equal(r.sourceErrorCode,'B198ZR4_NOT_JSON');
 assert.equal(r.modelAuthorshipAuthenticated,false);
 assert.equal(r.modelCalls,0);assert.equal(r.worldContacts,0);
});
