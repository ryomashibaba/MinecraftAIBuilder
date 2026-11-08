import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileR190CA,validateR190CA,SCHEMA} from '../source/ai/r190ca-authored-space-mass.mjs';
const src=k=>fs.readFileSync(new URL('../evidence/r190ca/MASS_'+k+'.json',import.meta.url));
const doc=k=>JSON.parse(src(k));
const compile=p=>compileR190CA(Buffer.from(JSON.stringify(p)));
test('Distinct author-designed volumetric masses are compiled into actual finite occupied voxels and negative civic space',()=>{
 const a=compileR190CA(src('A')),b=compileR190CA(src('B'));
 assert.notEqual(a.geometrySha256,b.geometrySha256);
 for(const c of [a,b]){
  assert.ok(c.stats.voxelCount>5000);
  assert.ok(c.stats.removedByCuts>500);
  assert.ok(c.stats.programs.length>=3);
  assert.ok(c.stats.programs.some(p=>p.supportedClearCells>40));
  assert.ok(c.stats.protectedVoidResults.every(v=>v.pass));
  assert.equal(c.modelCalls,0);assert.equal(c.worldContacts,0);assert.equal(c.worldWrites,0);
  assert.deepEqual(c.BuildPlan.operations,[]);assert.deepEqual(c.gates,Array(9).fill('BLOCKED'));
  assert.equal(c.artGate,'ART_HOLD');assert.equal(c.routesGate,'NOT_TESTED');
 }
});
test('Raw bytes and authored geometry reproducible without original source mutation',()=>{
 const before=src('A'),old=Buffer.from(before),a=compileR190CA(before),b=compileR190CA(before);
 assert.equal(a.originalRawSha256,b.originalRawSha256);
 assert.equal(a.geometrySha256,b.geometrySha256);
 assert.deepEqual(before,old);
 assert.equal(validateR190CA(doc('B')),true);
});
test('Reject unauthorised world coordinates and any extra schema field',()=>{
 const p=doc('A');p.worldCoordinates=[0,70,0];
 assert.throws(()=>compile(p),/R190CA_FORMAT/);
 const q=doc('B');q.schema=SCHEMA+'-unknown';
 assert.throws(()=>compile(q),/R190CA_FORMAT/);
});
test('Reject invalid polygon winding, duplicate program identifiers and original design mutation',()=>{
 const a=doc('A');a.masses[0].profiles[1].points.reverse();
 assert.throws(()=>compile(a),/R190CA_WINDING/);
 const b=doc('B');b.programs[1].id=b.programs[0].id;
 assert.throws(()=>compile(b),/R190CA_DUPLICATE_ID/);
});
test('Reject protected void actually occupied by supported built geometry',()=>{
 const p=doc('A');p.protectedVoids[0]={id:'wrong-occupied-bay',
  origin:[24,30,29],size:[4,4,4]};
 assert.throws(()=>compile(p),/R190CA_PROTECTED_VOID_OCCUPIED/);
});
test('Reject invalid floor level and unsupported building values without automatic repair',()=>{
 const p=doc('B');p.masses[0].floorYs[0]=94;
 assert.throws(()=>compile(p),/R190CA_FLOOR_LEVELS/);
 const q=doc('B');q.cuts[0].radii=[0,9,9];
 assert.throws(()=>compile(q),/R190CA_CUT_PARAMS/);
});
