import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {r190AMSyntheticPlan,writeR190AMGallery} from './r190am-author-layout-gallery.mjs';
import {asAF} from './r190ag-synthetic-fixtures.mjs';
import {compileR190SemanticPlan,validateR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {inspectR190AFIntent} from '../source/ai/r190af-program-intent.mjs';
import {studyR190AG,r190AGSemanticProjection} from '../source/ai/r190ag-integrated-proposals.mjs';
import {reviewR190AJOriginal,R190AJ_SYSTEM_GUIDE} from '../source/ai/r190aj-model-intent-adapter.mjs';
const safe=r=>{
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.equal(r.constructionApproved,false);assert.equal(r.executionAllowed,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);assert.equal(r.art,'ART_HOLD');
};
test('AM authored offset changes physical macro form without other authored changes',()=>{
 const hashes=[];
 for(const shift of [-8,0,8]){
  const p=r190AMSyntheticPlan(shift),snapshot=JSON.stringify(p);
  const b=compileR190SemanticPlan(p);
  assert.equal(JSON.stringify(p),snapshot);
  const root=b.layout.spaces.find(x=>x.id==='showroom');
  const child=b.layout.spaces.find(x=>x.id==='workshop');
  assert.equal(child.x-root.x,Math.floor((root.w-child.w)/2)+shift);
  assert.equal(child.z-root.z,root.d-1);
  assert.deepEqual(b.layout.sitePlacement.authorLockedTangentialOffsets,
   [{spaceId:'workshop',tangentShift:shift}]);
  assert.equal(b.audit.witnesses.length,3);
  assert.equal(b.audit.allProgramSpacesReachable,true);
  assert.equal(b.layout.portals.length,2);safe(b);hashes.push(b.compiled.geometrySha256);
 }
 assert.equal(new Set(hashes).size,3);
 const legacy=r190AMSyntheticPlan(0);
 delete legacy.spaces[1].tangentShift;
 const a=compileR190SemanticPlan(legacy),b=compileR190SemanticPlan(r190AMSyntheticPlan(0));
 assert.equal(a.compiled.geometrySha256,b.compiled.geometrySha256);
 assert.equal(a.layout.sitePlacement.authorLockedTangentialOffsets,undefined);
});
test('AM invalid and impossible choices must HOLD, never host-repair',()=>{
 for(const value of [-25,25,2.5,null,'8',{}]){
  const p=r190AMSyntheticPlan(0);p.spaces[1].tangentShift=value;
  assert.throws(()=>validateR190SemanticPlan(p),/SPACE/);
 }
 const root=r190AMSyntheticPlan(0);root.spaces[0].tangentShift=1;
 assert.throws(()=>validateR190SemanticPlan(root),/SPACE/);
 const impossible=r190AMSyntheticPlan(24);
 assert.equal(validateR190SemanticPlan(impossible),true);
 assert.throws(()=>compileR190SemanticPlan(impossible),/NO_FEASIBLE_SPATIAL_LAYOUT/);
});
test('AM retains explicit author offset throughout AF AG AJ without new inference',()=>{
 const p=asAF(r190AMSyntheticPlan(8)),raw=JSON.stringify(p);
 assert.match(R190AJ_SYSTEM_GUIDE,/tangentShift/);
 assert.equal(p.children[0].tangentShift,8);
 const af=inspectR190AFIntent(raw);
 assert.equal(af.status,'PROVISIONAL_SOURCE_ONLY_NO_ART_APPROVAL',af.error);
 const projection=r190AGSemanticProjection(p);
 assert.equal(projection.spaces[1].tangentShift,8);
 const direct=compileR190SemanticPlan(projection);
 assert.equal(af.sourcePreview.geometrySha256,direct.compiled.geometrySha256);
 const ag=studyR190AG(raw);assert(ag.baseline);
 assert.equal(ag.baseline.compiled.geometrySha256,direct.compiled.geometrySha256);
 const aj=reviewR190AJOriginal(raw);
 assert.equal(aj.receipt.status,'PROVISIONAL_B143_NO_ART_APPROVAL');
 assert.equal(aj.ag.baseline.compiled.geometrySha256,direct.compiled.geometrySha256);
 safe(aj.receipt);
 const bad=structuredClone(p);bad.root.tangentShift=3;
 assert.match(inspectR190AFIntent(JSON.stringify(bad)).error,/ROOM_SHAPE/);
});
test('AM gallery has three genuine source views and no output overwrite',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190am-')),out=path.join(root,'new');
 try{
  assert.deepEqual(writeR190AMGallery(out),
   {count:3,art:'ART_HOLD',worldWrites:0,modelCalls:0});
  const s=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(s.comparison,'ONLY_WORKSHOP_TANGENT_SHIFT_CHANGED');
  assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
  assert.equal(new Set(s.studies.map(x=>x.geometrySha256)).size,3);
  for(const x of s.studies){
   assert(x.trueB143VoxelCount>1000);
   assert(fs.readFileSync(path.join(out,x.label+'-REAL-B143.html'),'utf8').includes('R190-AM SYNTHETIC'));
   for(const v of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(out,x.label+'-'+v+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190AMGallery(out),/NEW_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
