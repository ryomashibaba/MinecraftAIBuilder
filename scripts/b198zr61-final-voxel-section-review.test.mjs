import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {prepareR61Sections,writeR61FinalVoxelSections} from './b198zr61-final-voxel-section-review.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
test('R61 B143 final voxels show standable entry without claiming aesthetics',()=>{
 const p=r32Courtyard(),raw=JSON.stringify(p),c=compileDesign(p.design);
 const r=prepareR61Sections({raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:c.geometrySha256});
 assert.equal(r.r43GeometrySha256,c.geometrySha256);
 assert(r.finalVoxelSectionsAvailable);
 assert.equal(r.sections.find(s=>s.kind==='entrance').anchorStandable,true);
 assert.equal(r.humanQualityReview,'NOT_REVIEWED');
 assert.equal(r.modelCriteriaAreNotIndependent,true);
 assert(r.safety.gates.every(x=>x==='BLOCKED'));
 assert.deepEqual(r.safety.BuildPlan.operations,[]);
});
test('R61 identifies actual late ADD in atrium even when strict B143 compiles',()=>{
 const p=r32Courtyard();p.design.elements.push({
  id:'refill-void',shape:'box',mode:'add',material:'concrete',
  origin:[6,1,6],size:[4,4,4]});
 const raw=JSON.stringify(p),c=compileDesign(p.design);
 const r=prepareR61Sections({raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:c.geometrySha256});
 assert.equal(r.r43Status,'HOLD_ABSTRACT_PROGRAM_OR_ROUTE');
 assert(r.geometryDerivedIssues.some(i=>i.kind==='PRESERVE_REQUIRED_AIR'&&
  i.id==='court-air'&&i.measured.occupied>0));
 assert.equal(r.aestheticScoreCertified,false);
});
test('R61 rejects source and geometry SHA mismatch, refuses overwrite',()=>{
 const p=r32Courtyard(),raw=JSON.stringify(p),c=compileDesign(p.design);
 assert.throws(()=>prepareR61Sections({raw,expectedRawSha256:'0'.repeat(64),
  expectedGeometrySha256:c.geometrySha256}),/SOURCE_AND_COMPILER_HASH_REQUIRED/);
 assert.throws(()=>prepareR61Sections({raw,expectedRawSha256:sha(raw),
  expectedGeometrySha256:'f'.repeat(64)}),/R43_GEOMETRY_HASH_MISMATCH/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r61-sections-'));
 try{
  writeR61FinalVoxelSections({raw,expectedRawSha256:sha(raw),
   expectedGeometrySha256:c.geometrySha256,destination:dir});
  assert(fs.existsSync(path.join(dir,'R61_FINAL_VOXEL_SECTION_REVIEW.html')));
  assert.throws(()=>writeR61FinalVoxelSections({raw,expectedRawSha256:sha(raw),
   expectedGeometrySha256:c.geometrySha256,destination:dir}),/NO_OVERWRITE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
