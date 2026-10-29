/** R190-AU: prove the public sky court is obligatory, not merely reachable. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {R190AU_AUTHOR_CASES} from './r190au-author-forum-fixtures.mjs';
import {reviewR190AUMandatoryForum} from '../source/ai/r190au-mandatory-forum.mjs';
import {reviewR190ATZones} from '../source/ai/r190at-functional-zones.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {writeR190AUSourceGallery} from './r190au-civic-route-gallery.mjs';

const clone=x=>structuredClone(x);
test('AU two authored non-pod designs require sky forum on every B143 2-wide route',()=>{
 const studies=R190AU_AUTHOR_CASES.map(reviewR190AUMandatoryForum);
 assert.equal(new Set(studies.map(x=>x.source.source.compiled.geometrySha256)).size,2);
 for(const s of studies){
  assert.equal(s.routeAudit.bypassReachableWithoutSky,false);
  assert.equal(s.routeAudit.everyTwoWideGroundRouteRequiresSky,true);
  assert(s.routeAudit.actualForumWalkablePads>100);
  assert(s.routeAudit.sourceWalkableTwoWidePads>300);
  assert(s.routeAudit.shortestWitnessForumPadSteps>=6);
  assert.equal(s.routeAudit.sourceRouteWitness.length,s.routeAudit.shortestWitnessSteps+1);
  assert(s.source.zones.find(x=>x.kind==='open-sky').sourceFloorCells===168);
  assert.equal(s.source.structure.detachedVoxelCount,0);
  assert(verifyCompiled(s.source.source.design,s.source.source.compiled));
  assert.equal(s.source.sourceEllipsoidsCylindersToruses,0);
  assert.equal(s.noAutomaticGeometryRepairs,true);
  assert.equal(s.modelCallsByReview,0);
  assert.equal(s.worldContacts,0);assert.equal(s.worldWrites,0);
  assert.equal(s.readiness,'NOT_PREPARED');
  assert.deepEqual(s.gates,Array(9).fill('BLOCKED'));
  assert.deepEqual(s.BuildPlan.operations,[]);
  assert.equal(s.art,'ART_HOLD');
 }
});
test('AU original unmodified AT still allows outdoor forum to be bypassed',()=>{
 for(const original of R190AU_AUTHOR_CASES){
  const bypass=clone(original);
  bypass.design.parti.voids=bypass.design.parti.voids.filter(v=>v.role!=='spatial-relief');
  const reviewed=reviewR190ATZones(bypass.design);
  assert(reviewed.source.audit.allAnchorsReachable);
  assert(reviewed.source.audit.openSkyColumns>=168);
  assert.throws(()=>reviewR190AUMandatoryForum(bypass),
   /R190AU_FORUM_HAS_WALKABLE_BYPASS/);
 }
});
test('AU removing only one authored edge threshold exposes real bypass',()=>{
 for(const original of R190AU_AUTHOR_CASES){
  const p=clone(original);
  p.design.parti.voids=p.design.parti.voids.filter(v=>
   v.geometry.id!=='south-forum-ground-threshold');
  assert.throws(()=>reviewR190AUMandatoryForum(p),
   /R190AU_FORUM_HAS_WALKABLE_BYPASS/);
 }
});
test('AU must not silently repair a removed sky floor or route',()=>{
 const bad=clone(R190AU_AUTHOR_CASES[0]);
 bad.design.parti.voids.find(v=>v.geometry.id==='south-forum-ground-threshold')
  .geometry.origin=[32,0,26];
 assert.throws(()=>reviewR190AUMandatoryForum(bad),
  /R190AQ_SKY_FLOOR_UNSUPPORTED/);
 const miss=clone(R190AU_AUTHOR_CASES[0]);
 miss.sequence.forum='missing';
 assert.throws(()=>reviewR190AUMandatoryForum(miss),/R190AU_ANCHOR_NOT_DEFINED/);
 const x=clone(R190AU_AUTHOR_CASES[0]);
 x.design.functionalZones.find(v=>v.kind==='open-sky').size=[8,10];
 assert.throws(()=>reviewR190AUMandatoryForum(x),
  /R190AU_FORUM_ZONE_NOT_ENTIRE_AUTHORED_SKY/);
});
test('AU source gallery exports actual B143 and ground-route proof + no overwrite',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r190au-')),out=path.join(temp,'fresh');
 try{
  assert.deepEqual(writeR190AUSourceGallery(out),
   {cases:3,source2WideRoutes:2,modelCalls:0,worldWrites:0,art:'ART_HOLD'});
  const d=JSON.parse(fs.readFileSync(path.join(out,'SUMMARY.json'),'utf8'));
  assert.equal(d.cases.length,3);
  assert.equal(d.cases[0].routeStatus,'HOLD_FORUM_HAS_WALKABLE_BYPASS');
  for(const c of d.cases.slice(1)){
   assert.equal(c.routeStatus,'MANDATORY_OPEN_SKY_FORUM_SOURCE_PROVEN');
   assert(c.routeWitnessLength>20);
  }
  assert.equal(d.officialArtAdoptions,0);
  assert.deepEqual(d.gates,Array(9).fill('BLOCKED'));
  for(const c of d.cases){
   assert(fs.readFileSync(path.join(out,c.name+'-TRUE-B143.html'),'utf8')
    .includes('R190-AU SOURCE'));
   assert(fs.readFileSync(path.join(out,c.name+'-ground-route.svg'),'utf8').includes('<svg'));
   for(const v of ['front','rear','west','east','roof'])
    assert(fs.readFileSync(path.join(out,c.name+'-'+v+'.svg'),'utf8').includes('<svg'));
  }
  assert.throws(()=>writeR190AUSourceGallery(out),/R190AU_NEW_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
