import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileR190BZ,validateR190BZ,SCHEMA} from '../source/ai/r190bz-open-shell.mjs';
const root=new URL('../evidence/r190bz/',import.meta.url);
const read=k=>fs.readFileSync(new URL('FORM_'+k+'.json',root));
const doc=k=>JSON.parse(read(k).toString('utf8'));
const compile=x=>compileR190BZ(Buffer.from(JSON.stringify(x)));
test('Two independent author-defined open-shell sources become real distinct voxels, with protected rifts empty',()=>{
 const a=compileR190BZ(read('A')),b=compileR190BZ(read('B'));
 assert.equal(validateR190BZ(doc('A')),true);
 assert.equal(validateR190BZ(doc('B')),true);
 assert.notEqual(a.geometrySha256,b.geometrySha256);
 for(const x of [a,b]){
  assert.ok(x.stats.voxels>1000);
  assert.ok(x.stats.triangles>=30);
  assert.equal(x.stats.voidResults.length,2);
  assert.ok(x.stats.voidResults.every(v=>v.pass&&v.occupiedCells===0));
  assert.equal(x.BuildPlan.operations.length,0);
  assert.equal(x.gates.length,9);assert.ok(x.gates.every(x=>x==='BLOCKED'));
  assert.equal(x.worldContacts,0);assert.equal(x.worldWrites,0);
  assert.equal(x.modelCalls,0);assert.equal(x.art,'ART_HOLD');
  assert.equal(x.functionGate,'NOT_TESTED');
 }
});
test('Bytes and voxels are deterministic; no source mutation',()=>{
 const src=read('A');const before=Buffer.from(src);
 const a=compileR190BZ(src),b=compileR190BZ(src);
 assert.equal(a.originalRawSha256,b.originalRawSha256);
 assert.equal(a.geometrySha256,b.geometrySha256);
 assert.deepEqual(src,before);
});
test('Reject injected source fields and unapproved world coordinates',()=>{
 const x=doc('A');x.worldCoordinates=[1,2,3];
 assert.throws(()=>validateR190BZ(x),/R190BZ_FORMAT/);
});
test('Reject degenerate surface rather than invent a replacement',()=>{
 const x=doc('A');x.patches[0].vertices[2]=x.patches[0].vertices[0];
 assert.throws(()=>compile(x),/R190BZ_DEGENERATE_TRIANGLE/);
});
test('Reject invalid authored vertices and noninteger geometry',()=>{
 const x=doc('A');x.patches[0].vertices[0][0]=1;
 assert.throws(()=>compile(x),/R190BZ_PATCH_VERTICES/);
 const y=doc('B');y.spines[0].path[0][1]=12.5;
 assert.throws(()=>compile(y),/R190BZ_SPINE_GEOMETRY/);
});
test('Reject occupied protected void based on final voxels',()=>{
 const x=doc('A');x.protectedVoids[0]={id:'illegal-occupied-main-shell',
  origin:[10,5,7],size:[29,29,28]};
 assert.throws(()=>compile(x),/R190BZ_PROTECTED_VOID_OCCUPIED/);
});
test('Reject changed schema and duplicate element IDs',()=>{
 const x=doc('B');x.schema=SCHEMA+'-altered';
 assert.throws(()=>compile(x),/R190BZ_FORMAT/);
 const y=doc('B');y.patches[1].id=y.patches[0].id;
 assert.throws(()=>compile(y),/R190BZ_DUPLICATE_ID/);
});
