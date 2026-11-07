import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard,r32Bridge,r32Ring}
 from './b198zr32-synthetic-geometry-fixtures.mjs';
import {inspectR43ArchitecturalSections}
 from '../source/ai/b198zr43-sectional-architecture-review.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
const box=(id,mode,origin,size,material)=>({
 id,shape:'box',mode,origin,size,...(material?{material}:{})});
test('R43 sections use exact final voxels, support and headroom, no arbitrary score',()=>{
 const p=r32Courtyard(),raw=JSON.stringify(p),before=structuredClone(p);
 const compiled=compileDesign(p.design);
 const r=inspectR43ArchitecturalSections(raw);
 assert.equal(r.status,
  'ABSTRACT_SOURCE_AND_MODEL_DECLARED_PLAN_PASS_VISUAL_REVIEW_PENDING');
 assert.equal(r.strictSourceSha256,compiled.sourceSha256);
 assert.equal(r.strictGeometrySha256,compiled.geometrySha256);
 assert.equal(r.finalConceptualVoxelCount,compiled.primitives.length);
 assert.equal(r.originalRawSha256,sha(raw));
 assert.deepEqual(p,before);
 assert.equal(r.contractAuthorship,'MODEL_DECLARED_UNVERIFIED');
 assert.equal(r.humanVisualApproval,false);
 assert.equal(r.independentReviewerContractUsed,false);
 assert.equal(r.shapeMetricsDoNotProveBeauty,true);
 assert.equal(r.modelCalls,0);assert.equal(r.worldContacts,0);
 assert.equal(r.worldWrites,0);
 assert.equal(r.safety.readiness,'NOT_PREPARED');
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
 const entrance=r.crossSections[0];
 assert.equal(entrance.kind,'entrance');
 assert.deepEqual(entrance.anchor,p.spatialPlan.entrance);
 assert.equal(entrance.anchorStandable,true);
 assert.equal(entrance.anchorOccupied,false);
 assert.equal(entrance.rows.length,entrance.dimensionsXZ[1]);
 assert(entrance.rows.every(row=>row.length===entrance.dimensionsXZ[0]));
 const [x0,z0]=entrance.originXZ;
 const [w,d]=entrance.dimensionsXZ;
 const filled=new Set(compiled.primitives.map(([x,y,z])=>x+','+y+','+z));
 for(let zi=0;zi<d;zi++)for(let xi=0;xi<w;xi++){
  const x=x0+xi,z=z0+zi,y=entrance.atY;
  const glyph=entrance.rows[zi][xi];
  if(glyph==='E')continue;
  assert.equal(glyph==='#',filled.has(x+','+y+','+z));
 }
 assert(r.massDescriptors.occupiedYLayers>0);
 assert.equal(r.massDescriptors.artisticOriginalityCertified,false);
 assert.equal(r.architectureChangesAutoApplied,false);
});
test('R43 accepts different free topologies without selecting a building template',()=>{
 for(const create of [r32Bridge,r32Ring]){
  const p=create(),r=inspectR43ArchitecturalSections(JSON.stringify(p));
  assert.equal(r.status,
   'ABSTRACT_SOURCE_AND_MODEL_DECLARED_PLAN_PASS_VISUAL_REVIEW_PENDING');
  assert.equal(r.improvementFindings.length,0);
  assert(r.crossSections.some(s=>s.kind==='destination'));
  assert.equal(r.modelSelfDeclaredCriteriaAreNotIndependent,true);
 }
});
test('R43 detects actual late ADD filling a required open-air void',()=>{
 const p=r32Courtyard();
 p.design.elements.push(box('late-glass-add','add',[6,1,6],[4,4,4],'glass'));
 const r=inspectR43ArchitecturalSections(JSON.stringify(p));
 assert.equal(r.status,'HOLD_ABSTRACT_PROGRAM_OR_ROUTE');
 assert(r.improvementFindings.some(x=>x.kind==='PRESERVE_REQUIRED_AIR'&&
  x.id==='court-air'&&x.measured.occupied>0));
 const v=r.crossSections.find(x=>x.kind==='void'&&x.id==='court-air');
 assert(v); assert.equal(v.anchorOccupied,true);
 assert.equal(r.humanVisualApproval,false);
});
test('R43 diagnoses disconnected upper-floor destination with actual source',()=>{
 const p=r32Courtyard();
 p.spatialPlan.destinations[0].point=[7,2,2];
 const r=inspectR43ArchitecturalSections(JSON.stringify(p));
 assert.equal(r.status,'HOLD_ABSTRACT_PROGRAM_OR_ROUTE');
 assert(r.improvementFindings.some(x=>x.kind==='CONNECT_DESTINATION'));
 assert.equal(r.destinationEvidence[0].passed,false);
});
test('R43 refuses fake reachable zone when model filled its room with solids',()=>{
 const p=r32Courtyard();
 p.design.elements.push(box('filled-public-zone','add',[3,1,3],[10,3,10],'concrete'));
 const r=inspectR43ArchitecturalSections(JSON.stringify(p));
 assert.equal(r.status,'HOLD_ABSTRACT_PROGRAM_OR_ROUTE');
 assert(r.improvementFindings.some(x=>x.kind==='FREE_FUNCTIONAL_ZONE'));
 assert.equal(r.functionalZoneEvidence[0].passed,false);
});
test('R43 does not silently move entrance or repair CUT syntax',()=>{
 const p=r32Courtyard();p.spatialPlan.entrance=[7,0,2];
 const raw=JSON.stringify(p),r=inspectR43ArchitecturalSections(raw);
 assert.equal(r.status,'HOLD_SOURCE_OR_ENTRANCE');
 assert.equal(r.strictErrorCode,'B198ZR3_CONTRACT_ENTRANCE_NOT_STANDABLE');
 assert.deepEqual(r.crossSections,[]);
 assert.deepEqual(JSON.parse(raw).spatialPlan.entrance,[7,0,2]);
 const q=r32Courtyard();
 q.design.elements.find(e=>e.mode==='cut').material='glass';
 const bad=inspectR43ArchitecturalSections(JSON.stringify(q));
 assert.equal(bad.status,'HOLD_SOURCE_OR_ENTRANCE');
 assert.equal(bad.strictErrorCode,'B143_MATERIAL');
});
test('R43 rejects truncated JSON rather than inventing a rendered building',()=>{
 const raw='{"design":';
 const r=inspectR43ArchitecturalSections(raw);
 assert.equal(r.status,'HOLD_SOURCE_OR_ENTRANCE');
 assert.equal(r.strictErrorCode,'B198ZR4_NOT_JSON');
 assert.equal(r.originalRawSha256,sha(raw));
 assert.equal(r.crossSections.length,0);
 assert.equal(r.constructionApproved,false);
});
