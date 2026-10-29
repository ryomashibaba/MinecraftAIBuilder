/** R190-AY source declaration review. Existing saved real response; no model calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {reviewR190AYPreservedClaims,writeR190AYReview}
 from './r190ay-source-claim-crosscheck.mjs';
const SOURCE=fileURLToPath(new URL('../evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url));
const SHA='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17';
const hash=x=>createHash('sha256').update(x).digest('hex');
const raw=()=>fs.readFileSync(SOURCE);

test('AY preserved real model original: lightwell CUT intersects zero prior ADD boxes',()=>{
 const before=raw();assert.equal(hash(before),SHA);
 const r=reviewR190AYPreservedClaims(before,{expectedSha256:SHA});
 assert.equal(r.originalSha256,SHA);
 assert.equal(r.originalBytes,2581);
 assert.equal(r.strictB143CompileStatus,'HOLD_B143_SCHEMA_OR_MODE');
 assert.equal(r.hasActualCompiledB143Geometry,false);
 const cut=r.sourceClaims.lightwell;
 assert.equal(cut.id,'light-well');
 assert.deepEqual(cut.priorAddElements,['base','main-wall','north-wall']);
 assert.equal(cut.priorAddsAllKnownBoxes,true);
 assert.deepEqual(cut.priorAddDeclaredIntersectionCells.map(x=>x.boxIntersectionCells),
  [0,0,0]);
 assert.equal(cut.status,'ZERO_CELLS_TO_CUT_IN_PRIOR_DECLARED_BOXES');
 assert.deepEqual(cut.laterUnsupportedAdditiveShapes,['staircase']);
 assert.equal(r.modelGeometryChanged,false);
 assert.equal(r.real3D,'NOT_GENERATED');
 assert.equal(r.requirementCoverage,'NOT_CERTIFIED');
 assert.equal(r.architectureBeauty,'ART_HOLD');
 assert.equal(r.worldContacts,0);assert.equal(r.worldWrites,0);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.deepEqual(raw(),before);
});
test('AY named north and south window are at identical original z band, no fabricated compass',()=>{
 const r=reviewR190AYPreservedClaims(raw(),{expectedSha256:SHA});
 assert.equal(r.sourceClaims.windows.status,
  'BOTH_NAMED_OPPOSITE_WINDOWS_AT_IDENTICAL_Z_BAND');
 assert.deepEqual(r.sourceClaims.windows.zBands,[[18,20],[18,20]]);
 assert.deepEqual(r.sourceClaims.windows.northWallBoxIntersectionCells,[8,8]);
 assert.equal(r.sourceClaims.windows.actualCompassOrientation,'NOT_ESTABLISHED');
 const claims=r.sourceClaims.claims;
 assert.equal(claims.length,6);
 assert.equal(claims.every(x=>x.certifiedPhysicalResult==='NOT_TESTED_INVALID_B143'),true);
 assert.equal(claims[0].originalClaimText,'light well');
 assert.equal(claims[1].originalClaimText,'north and south sides');
});
test('AY arrival and destination land inside explicitly authored solid floor boxes',()=>{
 const r=reviewR190AYPreservedClaims(raw(),{expectedSha256:SHA});
 const {entrance,destination,duplicate}=r.sourceClaims;
 assert.deepEqual(entrance.point,[10,0,10]);
 assert.deepEqual(entrance.declaredAddBoxesContainingPoint,['base','storage-floor']);
 assert.equal(entrance.status,'POINT_IN_LAST_ADDED_POSITIVE_BOX_WITHOUT_LATER_CUT');
 assert.deepEqual(entrance.laterCutCandidates,[]);
 assert.deepEqual(destination.point,[10,14,10]);
 assert.deepEqual(destination.declaredAddBoxesContainingPoint,['reading-room-floor']);
 assert.equal(destination.status,'POINT_IN_LAST_ADDED_POSITIVE_BOX_WITHOUT_LATER_CUT');
 assert.equal(entrance.actualB143Voxel,'UNAVAILABLE_INVALID_SOURCE');
 assert.equal(destination.actualB143Voxel,'UNAVAILABLE_INVALID_SOURCE');
 assert.equal(duplicate.declaredOverlappingBoxCells,512);
 assert.deepEqual(r.sourceClaims.claims[2].explicitDoorCutNames,[]);
});
test('AY a previously unsupported earlier add makes lightwell intersection INDETERMINATE, not pass',()=>{
 const p=JSON.parse(raw().toString('utf8'));
 p.design.elements.splice(2,0,{
  id:'unknown-roof',mode:'add',shape:'cylinder',axis:'y',
  origin:[7,2,7],radius:3,length:8,material:'stone'});
 let result=reviewR190AYPreservedClaims(Buffer.from(JSON.stringify(p)));
 assert.equal(result.sourceClaims.lightwell.status,'NOT_ESTABLISHED_UNKNOWN_PRIOR_ADDS');
 assert.equal(result.sourceClaims.lightwell.priorAddDeclaredIntersectionCells,null);
 const q=JSON.parse(raw().toString('utf8'));
 q.design.elements.splice(2,0,{id:'inside-void',shape:'box',mode:'add',
  material:'stone',origin:[9,4,9],size:[2,5,2]});
 result=reviewR190AYPreservedClaims(Buffer.from(JSON.stringify(q)));
 assert.equal(result.strictB143CompileStatus,'NOT_EVALUATED_SOURCE_ONLY');
 assert.equal(result.modelAuthorship,'NOT_ESTABLISHED');
 assert.equal(result.sourceClaims.lightwell.status,'PRIOR_DECLARED_BOXES_DO_INTERSECT');
 assert.equal(result.sourceClaims.lightwell.priorAddDeclaredIntersectionCells
  .find(x=>x.id==='inside-void').boxIntersectionCells,20);
});
test('AY refuses spoofed hashes and never copies original into output artifact',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190ay-'));
 const output=path.join(root,'new-review'),before=raw();
 try{
  assert.throws(()=>writeR190AYReview({originalPath:SOURCE,outDir:output,
   expectedSha256:'0'.repeat(64)}),/R190AY_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(output),false);
  const review=writeR190AYReview({originalPath:SOURCE,outDir:output,expectedSha256:SHA});
  assert.equal(review.sourceClaims.lightwell.status,'ZERO_CELLS_TO_CUT_IN_PRIOR_DECLARED_BOXES');
  assert.deepEqual(fs.readdirSync(output).sort(),
   ['SOURCE_ONLY_CLAIM_REVIEW_JA.md','SOURCE_ONLY_CLAIM_WITNESS.json']);
  assert(!fs.readdirSync(output).some(x=>x.includes('ORIGINAL')));
  assert.deepEqual(raw(),before);
  const md=fs.readFileSync(path.join(output,'SOURCE_ONLY_CLAIM_REVIEW_JA.md'),'utf8');
  assert.match(md,/吹き抜け/);assert.match(md,/真正3D/);
  assert.throws(()=>writeR190AYReview({originalPath:SOURCE,outDir:output,
   expectedSha256:SHA}),/R190AY_FRESH_ABSOLUTE_OUTPUT_REQUIRED/);
  const symlink=path.join(root,'symlink-response');
  fs.symlinkSync(SOURCE,symlink);
  assert.throws(()=>writeR190AYReview({originalPath:symlink,
   outDir:path.join(root,'newer'),expectedSha256:SHA}),/R190AY_UNSAFE_ORIGINAL_FILE/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
