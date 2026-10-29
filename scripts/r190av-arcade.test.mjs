import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {R190AV_AUTHOR_CASES} from './r190av-arcade-fixtures.mjs';
import {R190AU_AUTHOR_CASES} from './r190au-author-forum-fixtures.mjs';
import {reviewR190AUMandatoryForum} from '../source/ai/r190au-mandatory-forum.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {writeR190AVArcadeGallery} from './r190av-arcade-gallery.mjs';

test('AV open colonnade massing is author-provided, sky/route/ground prove physically real',()=>{
 const studies=R190AV_AUTHOR_CASES.map(reviewR190AUMandatoryForum);
 assert.equal(new Set(studies.map(s=>s.source.source.compiled.geometrySha256)).size,2);
 for(const [i,s] of studies.entries()){
  const p=R190AV_AUTHOR_CASES[i].design.parti;
  assert.equal(p.masses.length,20);
  assert.equal(p.masses.filter(m=>m.shape==='beam').length,3);
  assert(p.masses.every(m=>['beam','box'].includes(m.shape)));
  assert.equal(s.routeAudit.everyTwoWideGroundRouteRequiresSky,true);
  assert(s.routeAudit.shortestWitnessForumPadSteps>=10);
  assert.equal(s.source.structure.detachedVoxelCount,0);
  assert.equal(s.source.structure.elevatedComponentCount,1);
  assert(s.source.source.audit.openSkyColumns===168);
  assert.equal(s.source.zones.length,3);
  for(const z of s.source.zones){
   assert.equal(z.sourceClearHeadroomCells,z.sourceFloorCells*7);
   assert.equal(z.kind==='sheltered'?
    z.verifiedOverheadRoofCells:z.verifiedOpenSkyCells,z.sourceFloorCells);
  }
  assert(verifyCompiled(s.source.source.design,s.source.source.compiled));
  const realOps=s.source.source.compiled.stats.designOperations;
  for(const id of ['author-east-return-door','author-civic-sky-void',
   'south-forum-ground-threshold','north-forum-ground-threshold']){
   const op=realOps.find(e=>e.element===id);
   assert(op&&op.mode==='cut'&&op.removed>=8,
    'Every authored opening must actually remove real B143 cells: '+id);
  }
  assert.equal(s.modelCallsByReview,0);
  assert.equal(s.worldWrites,0);assert.equal(s.worldContacts,0);
  assert.equal(s.readiness,'NOT_PREPARED');
  assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(s.BuildPlan.operations,[]);
  assert.equal(s.art,'ART_HOLD');
 }
});
test('AV does not modify older AU synthetic inputs and does not auto repair pillars',()=>{
 const baseline=R190AU_AUTHOR_CASES.map(x=>structuredClone(x));
 const samples=R190AV_AUTHOR_CASES.map(x=>JSON.stringify(x));
 for(const p of R190AV_AUTHOR_CASES)reviewR190AUMandatoryForum(p);
 assert.deepEqual(R190AU_AUTHOR_CASES,baseline);
 assert.deepEqual(R190AV_AUTHOR_CASES.map(JSON.stringify),samples);
 const broken=structuredClone(R190AV_AUTHOR_CASES[0]);
 const pillar=broken.design.parti.masses.find(m=>m.id==='west-arch-front-a');
 pillar.size[2]=6;
 assert.throws(()=>reviewR190AUMandatoryForum(broken),
  /R190AT_ZONE_LACKS_HEADROOM/);
 const bypass=structuredClone(R190AV_AUTHOR_CASES[1]);
 bypass.design.parti.voids=bypass.design.parti.voids.filter(v=>
  v.geometry.id!=='south-forum-ground-threshold');
 assert.throws(()=>reviewR190AUMandatoryForum(bypass),
  /R190AU_FORUM_HAS_WALKABLE_BYPASS/);
});
test('AV true B143 comparison artifacts and no success-at-any-price art admission',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190av-')),target=path.join(root,'new');
 try{
  assert.deepEqual(writeR190AVArcadeGallery(target),
   {scenes:3,modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  const receipt=JSON.parse(fs.readFileSync(path.join(target,'SUMMARY.json'),'utf8'));
  assert.equal(receipt.scenes.length,3);
  assert.equal(receipt.scenes[0].kind,'AU_PREVIOUS_REFERENCE');
  assert(receipt.viewsChangedFromAU.length>=3);
  assert(receipt.viewsChangedBetweenNewCases.length>=2);
  assert.deepEqual(receipt.gates,Array(9).fill('BLOCKED'));
  assert.equal(receipt.officialArtAdoptions,0);
  for(const sc of receipt.scenes){
   assert(fs.readFileSync(path.join(target,sc.name+'-REAL-B143.html'),'utf8').includes('R190-AV'));
   for(const v of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(target,sc.name+'-'+v+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190AVArcadeGallery(target),/R190AV_FRESH_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
