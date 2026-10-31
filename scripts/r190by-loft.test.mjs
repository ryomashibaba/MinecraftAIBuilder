import test from 'node:test';
import assert from 'node:assert/strict';
import {compileR190BY,validateR190BY,SCHEMA} from '../source/ai/r190by-freeform-loft.mjs';
const poly=[[8,9],[13,8],[19,11],[19,19],[13,22],[8,18]];
function fixture(){
 return {schema:SCHEMA,id:'loft-fixture-01',title:'Pure real source geometry',
  originalBriefSha256:'b'.repeat(64),bounds:{width:40,height:32,depth:32},
  intent:{architecturalIdea:'An independently authored contour shell shape',
   publicExperience:'Research the skyline not real building walking',
   nextReview:'Review genuine source geometry and empty protected voids'},
  shells:[{id:'single-shell',material:'metal',thickness:2,contours:[
   {y:3,points:poly},{y:13,points:poly.map(([x,z])=>[x+1,z])},
   {y:23,points:poly.map(([x,z])=>[x+2,z])}]}],
  decks:[{id:'small-terrace',material:'wood',y:8,thickness:1,
   polygon:[[9,10],[14,9],[16,13],[15,18],[9,18],[8,14]]}],
  ribbons:[{id:'slanted-support',material:'accent',radius:1,
   path:[[4,2,5],[5,16,5],[5,29,7]]}],
  protectedVoids:[{id:'far-void',origin:[28,3,10],size:[5,15,6]},
   {id:'other-void',origin:[28,18,21],size:[5,7,6]}],
  designOnly:true};
}
const duplicate=x=>JSON.parse(JSON.stringify(x));
test('Author controlled loft interpolates to stable final source voxels without world operations',()=>{
 const doc=fixture(),raw=Buffer.from(JSON.stringify(doc));
 const first=compileR190BY(raw),second=compileR190BY(raw);
 assert.equal(validateR190BY(doc),true);
 assert.equal(first.geometrySha256,second.geometrySha256);
 assert.equal(first.originalRawSha256,second.originalRawSha256);
 assert.ok(first.primitives.length>300);
 assert.equal(first.stats.voidResults.length,2);
 assert.equal(first.stats.voidResults.every(x=>x.occupiedCells===0),true);
 assert.equal(first.BuildPlan.operations.length,0);
 assert.equal(first.worldWrites,0);
 assert.equal(first.modelCalls,0);
 assert.equal(first.art,'ART_HOLD');
 assert.equal(raw.toString('utf8'),JSON.stringify(doc));
});
test('Different author control contour changes actually change geometry',()=>{
 const a=fixture(),b=fixture();
 b.shells[0].contours[1].points=b.shells[0].contours[1].points.map(([x,z])=>[x+2,z]);
 assert.notEqual(compileR190BY(Buffer.from(JSON.stringify(a))).geometrySha256,
  compileR190BY(Buffer.from(JSON.stringify(b))).geometrySha256);
});
test('Reject changed polygon winding without autorotation',()=>{
 const x=fixture();x.shells[0].contours[1].points.reverse();
 assert.throws(()=>compileR190BY(Buffer.from(JSON.stringify(x))),/R190BY_WINDING_CHANGE/);
});
test('Reject self-intersection instead of silently fixing control points',()=>{
 const x=fixture();x.shells[0].contours[0].points=[[8,8],[19,19],[19,8],[8,19],[20,20],[10,23]];
 assert.throws(()=>compileR190BY(Buffer.from(JSON.stringify(x))),
  /R190BY_(SELF_INTERSECTION|COLLAPSED_POLYGON)/);
});
test('Reject a protected void occupied by actual solid source voxels',()=>{
 const x=fixture();x.protectedVoids[0]={id:'wrong-void',origin:[8,3,9],size:[10,13,10]};
 assert.throws(()=>compileR190BY(Buffer.from(JSON.stringify(x))),/R190BY_PROTECTED_VOID_OCCUPIED/);
});
test('Reject out-of-bounds ribbons and unknown source fields',()=>{
 const x=fixture();x.ribbons[0].path[0]=[0,2,5];
 assert.throws(()=>compileR190BY(Buffer.from(JSON.stringify(x))),/R190BY_RIBBON_OUTSIDE_BOUNDS/);
 const y=fixture();y.unapprovedWorldCoordinates=[100,100,100];
 assert.throws(()=>validateR190BY(y),/R190BY_SOURCE_FORMAT/);
});
