/** R190-AT functional geometry must be physically true source B143. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {R190AT_AUTHOR_CASES} from './r190at-functional-fixtures.mjs';
import {validateR190ATZones,reviewR190ATZones} from '../source/ai/r190at-functional-zones.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {writeR190ATGallery} from './r190at-gallery.mjs';
const clone=x=>structuredClone(x);

test('AT 2 authored architectural proposals have real shelter, forum, source circulation',()=>{
 const studies=R190AT_AUTHOR_CASES.map(reviewR190ATZones);
 assert.equal(new Set(studies.map(s=>s.source.compiled.geometrySha256)).size,2);
 for(const s of studies){
  assert(verifyCompiled(s.source.design,s.source.compiled));
  assert.equal(s.sourceEllipsoidsCylindersToruses,0);
  assert.equal(s.structure.detachedVoxelCount,0);
  assert.equal(s.structure.status,'SOURCE_CONTACT_PASS_NOT_ENGINEERING');
  assert.equal(s.source.audit.allAnchorsReachable,true);
  assert(s.source.audit.openSkyColumns>=168);
  assert.equal(s.zones.length,3);
  assert.equal(s.zones.filter(z=>z.kind==='sheltered').length,2);
  assert.equal(s.zones.filter(z=>z.kind==='open-sky').length,1);
  for(const z of s.zones){
   assert(z.sourceFloorCells>=80);
   assert.equal(z.sourceClearHeadroomCells,z.sourceFloorCells*7);
   assert.equal(z.kind==='sheltered'?
    z.verifiedOverheadRoofCells:z.verifiedOpenSkyCells,z.sourceFloorCells);
   assert.equal(z.functionalUseSupportedByVoxels,'NOT_CERTIFIED');
  }
  assert.equal(s.shelterVsOpenSky,'REAL_B143_SOURCE_VERIFIED');
  assert.equal(s.realTwoWideSourceRoute,true);
  assert.equal(s.automaticModelOrHostGeometry,false);
  assert.equal(s.actualMinecraftWalking,'NOT_TESTED');
  assert.equal(s.loadBearing,'NOT_CERTIFIED');
  assert.equal(s.modelCallsByReview,0);
  assert.equal(s.readiness,'NOT_PREPARED');
  assert.deepEqual(s.BuildPlan.operations,[]);
  assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
  assert.equal(s.worldContacts,0);assert.equal(s.worldWrites,0);
  assert.equal(s.art,'ART_HOLD');
 }
});
test('AT authored skylight remains true when a mass is deliberately subtracted in SOURCE',()=>{
 const x=clone(R190AT_AUTHOR_CASES[0]);
 x.parti.masses.push({id:'fake-court-roof',shape:'box',mode:'add',
  material:'metal',origin:[34,15,27],size:[8,2,10]});
 const r=reviewR190ATZones(x);
 const sky=r.zones.find(z=>z.kind==='open-sky');
 assert.equal(sky.verifiedOpenSkyCells,sky.sourceFloorCells);
 assert.equal(r.structure.detachedVoxelCount,0);
 const fake=r.source.compiled.stats.designOperations.find(op=>op.element==='fake-court-roof');
 assert(fake.added>0);
 const voidOperation=r.source.compiled.stats.designOperations.find(op=>op.element==='author-civic-sky-void');
 assert(voidOperation.removed>=80);
});
test('AT weather shelter cannot be an occupied low slab',()=>{
 const x=clone(R190AT_AUTHOR_CASES[0]);
 x.parti.masses.find(m=>m.id==='west-public-roof').origin[1]=8;
 assert.throws(()=>reviewR190ATZones(x),
  /R190AT_ZONE_LACKS_HEADROOM|R190AT_DETACHED_BUILDING_MASS/);
});
test('AT no silent fixes: sheltered space without roof is HOLD',()=>{
 const x=clone(R190AT_AUTHOR_CASES[0]);
 x.parti.masses=x.parti.masses.filter(m=>m.id!=='west-public-roof');
 assert.throws(()=>reviewR190ATZones(x),/R190AT_SHELTERED_ZONE_HAS_NO_CANOPY/);
});
test('AT rejects invented program semantics and broken physical zoning',()=>{
 const x=clone(R190AT_AUTHOR_CASES[0]);
 x.functionalZones[0].headroom=0;
 assert.throws(()=>validateR190ATZones(x),/R190AT_ZONE_FIELDS/);
 const y=clone(R190AT_AUTHOR_CASES[0]);
 y.functionalZones[0].origin=[50,27];
 assert.throws(()=>validateR190ATZones(y),/R190AT_ANCHOR_OUTSIDE_PHYSICAL_ZONE/);
 const civic=clone(R190AT_AUTHOR_CASES[0]);
 civic.functionalZones[1].origin=[31,27];
 civic.functionalZones[1].size=[11,10];
 assert.throws(()=>validateR190ATZones(civic),/R190AT_CIVIC_ZONE_OUTSIDE_AUTHORED_VOID/);
 const sheltered=clone(R190AT_AUTHOR_CASES[0]);
 sheltered.functionalZones[2].origin=[41,27];
 sheltered.functionalZones[2].size=[16,9];
 assert.throws(()=>validateR190ATZones(sheltered),/R190AT_SHELTERED_ZONE_OVERLAPS_SKY/);
 const bad=clone(R190AT_AUTHOR_CASES[0]);
 bad.functionalZones[1].kind='sheltered';
 assert.throws(()=>validateR190ATZones(bad),/R190AT_CIVIC_SEQUENCE_MISSING|R190AT_SHELTERED_ZONE_OVERLAPS_SKY/);
 const mutate=clone(R190AT_AUTHOR_CASES[0]);
 mutate.newKey='auto-fill-function';
 assert.throws(()=>validateR190ATZones(mutate),/R190AT_TOP_LEVEL/);
});
test('AT exact author IR unchanged, strict B143 source provenance',()=>{
 const x=clone(R190AT_AUTHOR_CASES[1]),orig=JSON.stringify(x);
 const r=reviewR190ATZones(x);
 assert.equal(JSON.stringify(x),orig);
 assert.deepEqual(r.original,x);
 assert.equal(r.source.compiled.designOnly,true);
 const broken=clone(r.source.compiled);
 broken.primitives[0][0]++;
 assert.equal(verifyCompiled(r.source.design,broken),false);
});
test('AT gallery source renders and five matching perspective views, art remains HOLD',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r190at-')),dir=path.join(temp,'fresh');
 try{
  assert.deepEqual(writeR190ATGallery(dir),
   {count:3,modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  const report=JSON.parse(fs.readFileSync(path.join(dir,'SUMMARY.json'),'utf8'));
  assert.equal(report.cases.length,3);
  assert.equal(report.cases[0].kind,'PREVIOUS_AR_REFERENCE');
  assert.equal(report.cases[1].sourceEllipsoidsCylindersToruses,0);
  assert.equal(report.cases[2].sourceEllipsoidsCylindersToruses,0);
  assert(report.changeBetweenATCases.length>=3);
  assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
  assert.equal(report.officialArtAdoptions,0);
  for(const c of report.cases){
   assert(fs.readFileSync(path.join(dir,c.name+'-REAL-B143.html'),'utf8').includes('R190-AT'));
   for(const view of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(dir,c.name+'-'+view+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190ATGallery(dir),/R190AT_FRESH_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(temp,{force:true,recursive:true});}
});
