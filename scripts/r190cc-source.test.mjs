import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileR190CC,validateR190CC,SCHEMA,CB_SHA} from '../source/ai/r190cc-freeform-boolean.mjs';
const R=()=>fs.readFileSync(new URL('../evidence/r190cb/RIFT_LANTERN.json',import.meta.url));
const F=x=>fs.readFileSync(new URL('../evidence/r190cc/FORM_'+x+'.json',import.meta.url));
const D=x=>JSON.parse(F(x));
const go=x=>compileR190CC(Buffer.from(JSON.stringify(x)),R());
test('A/B author-defined oriented 3D implicit union and cuts are genuinely distinct, non-empty and source safe',()=>{
 const a=compileR190CC(F('A'),R()),b=compileR190CC(F('B'),R());
 assert.notEqual(a.geometrySha256,b.geometrySha256);
 for(const v of [a,b]){
  assert.ok(v.metrics.initialOccupied3d>16000);
  assert.ok(v.metrics.removedByTrue3dCuts>800);
  assert.ok(v.metrics.finalVoxelCount>7500);
  assert.ok(v.metrics.authoredRouteNodes===267);
  assert.equal(v.metrics.supportedRouteNodes,267);
  assert.equal(v.originalRouteSha256,CB_SHA);
  assert.ok(v.metrics.protectedVoidResults.every(q=>q.pass));
  assert.ok(v.metrics.programMetrics.length>=6);
  assert.deepEqual(v.BuildPlan.operations,[]);
  assert.deepEqual(v.gates,Array(9).fill('BLOCKED'));
  assert.equal(v.worldWrites,0);assert.equal(v.worldContacts,0);
  assert.equal(v.modelCalls,0);assert.equal(v.officialArtAdoptions,0);
  assert.equal(v.artGate,'ART_HOLD_REAL_EIGHT_VIEWS_REQUIRED');
 }
});
test('Raw A design / true 3D voxel SHA are reproducible and source does not mutate',()=>{
 const bytes=F('A'),before=Buffer.from(bytes);
 const a=compileR190CC(bytes,R()),b=compileR190CC(bytes,R());
 assert.equal(a.geometrySha256,b.geometrySha256);
 assert.equal(a.originalRawSha256,b.originalRawSha256);
 assert.deepEqual(bytes,before);
 assert.equal(validateR190CC(D('B')),true);
});
test('Fail closed on unknown world coordinates and changed schema',()=>{
 const p=D('A');p.worldCoordinates=[0,70,0];
 assert.throws(()=>go(p),/R190CC_SOURCE_FIELDS/);
 const b=D('B');b.schema=SCHEMA+'-unsafe';
 assert.throws(()=>go(b),/R190CC_SCHEMA/);
});
test('Fail closed on superseded route, unauthorized inferred stair source or geometry',()=>{
 const a=D('A');a.routeRef.source='an-unapproved-model';
 assert.throws(()=>go(a),/R190CC_ROUTE_PROVENANCE/);
 const b=D('B');b.solids[1].rotate=[90,0,0];
 assert.throws(()=>go(b),/R190CC_BRUSH_ROTATION/);
});
test('Fail closed on protected 3D air which final explicit routes actually occupy',()=>{
 const b=D('B');b.protectedVoids[0]={id:'actually-occupied',origin:[43,6,35],size:[4,4,4]};
 assert.throws(()=>go(b),/R190CC_PROTECTED_VOID_OCCUPIED/);
});
