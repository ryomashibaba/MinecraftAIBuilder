/** R190-BB proof tests, SOURCE only. */
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {R190BB_AUTHOR_CASES} from './r190bb-source-fixtures.mjs';
import {reviewR190BASupportedExterior} from './r190ba-supported-exterior-source.mjs';
import {reviewR190BBOutdoorTransition,renderR190BBPlanSVG,writeR190BBAudit}
 from './r190bb-outdoor-transition-source.mjs';
const ORIGINAL=fileURLToPath(new URL('../evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url));
const SHA='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17';
const H=b=>createHash('sha256').update(b).digest('hex');
const check=s=>reviewR190BBOutdoorTransition(Buffer.from(JSON.stringify(s)));
test('BB preserved original exact SHA is invalid B143 and no imaginary outdoor access',()=>{
 const raw=fs.readFileSync(ORIGINAL),old=Buffer.from(raw);
 assert.equal(H(raw),SHA);
 const r=reviewR190BBOutdoorTransition(raw,{expectedSha256:SHA});
 assert.equal(r.priorBAStatus,'HOLD_UPSTREAM_INVALID_SOURCE');
 assert.equal(r.status,'HOLD_UPSTREAM_NO_SUPPORTED_TWO_WIDE_BOUNDARY_ROUTE');
 assert.equal(r.sourceTransitionEvidence,null);
 assert.equal(r.originalUnmodified,true);assert.equal(r.modelProviderCalled,false);
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
 assert.deepEqual(r.BuildPlan.operations,[]);assert.equal(r.worldWrites,0);
 assert.deepEqual(fs.readFileSync(ORIGINAL),old);
});
test('BB complete canopy all the way to boundary is NOT a sky-open exterior',()=>{
 const s=R190BB_AUTHOR_CASES.covered(),before=JSON.stringify(s),bytes=Buffer.from(before);
 const ba=reviewR190BASupportedExterior(bytes);
 assert.equal(ba.status,'SOURCE_TWO_WIDE_SUPPORTED_FLAT_BOUNDARY_PATH_FOUND');
 const r=check(s);
 assert.equal(r.status,'HOLD_SUPPORTED_BOUNDARY_BUT_SKY_EXPOSURE_UNPROVEN');
 assert.equal(r.sourceTransitionEvidence.shelterToSkyOpenBoundary,false);
 assert.equal(r.sourceTransitionEvidence.entranceToSkyOpenBoundary,false);
 assert.equal(r.sourceTransitionEvidence.skyOpenBoundaryPadCount,0);
 assert(r.sourceTransitionEvidence.shelteredEntrancePadCount>0);
 assert.equal(JSON.stringify(s),before);
});
test('BB true floor + 2-high air exits from roofed hall into fully open sky',()=>{
 const s=R190BB_AUTHOR_CASES.outdoors(),before=JSON.stringify(s);
 const r=check(s),e=r.sourceTransitionEvidence;
 assert.equal(r.status,'SOURCE_SHELTER_TO_SKY_OPEN_LOCAL_BOUNDARY_FOUND');
 assert.equal(e.shelterToSkyOpenBoundary,true);
 assert(e.witnessLengthSteps>=2);assert(e.firstSkyOpenPadIndex>0);
 assert.equal(e.witness[0].exposure,'sheltered');
 assert.equal(e.witness.at(-1).exposure,'sky-open');
 assert.equal(e.witness.at(-1).pad[0],0);
 assert(e.witness.every(p=>p.pad[1]===2));
 assert.equal(e.boundaryIsNotRealMinecraftExterior,true);
 assert.equal(r.actualMinecraftWalking,'NOT_TESTED');
 assert.equal(r.modelCallsByReview,0);assert.equal(r.art,'ART_HOLD');
 assert.equal(JSON.stringify(s),before);
 assert(renderR190BBPlanSVG(r).includes('<polyline'));
});
test('BB explores alternate exit when a closer boundary pad is covered',()=>{
 const r=check(R190BB_AUTHOR_CASES.alternate()),e=r.sourceTransitionEvidence;
 assert.equal(r.status,'SOURCE_SHELTER_TO_SKY_OPEN_LOCAL_BOUNDARY_FOUND');
 assert(e.skyOpenBoundaryPadCount>0);
 assert(e.witness.at(-1).pad[2]>=6);
});
test('BB narrow single-block floor is not a false-positive supported exit',()=>{
 const r=check(R190BB_AUTHOR_CASES.tooNarrow());
 assert.equal(r.status,'HOLD_UPSTREAM_NO_SUPPORTED_TWO_WIDE_BOUNDARY_ROUTE');
 assert.equal(r.sourceTransitionEvidence,null);
});
test('BB sky-open entrance cannot be represented as sheltered to sky transition',()=>{
 const r=check(R190BB_AUTHOR_CASES.openEntrance()),e=r.sourceTransitionEvidence;
 assert.equal(r.status,'SOURCE_SKY_OPEN_BOUNDARY_BUT_NOT_SHELTERED_ENTRANCE');
 assert.equal(e.shelteredEntrancePadCount,0);
 assert.equal(e.entranceToSkyOpenBoundary,true);
 assert.equal(e.shelterToSkyOpenBoundary,false);
});
test('BB file destination, hash, symlink and source confidentiality fail closed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r190bb-')),out=path.join(root,'new');
 try{
  assert.throws(()=>writeR190BBAudit({originalPath:ORIGINAL,outDir:out,
   expectedSha256:'0'.repeat(64)}),/R190BB_ORIGINAL_SHA_MISMATCH/);
  assert.equal(fs.existsSync(out),false);
  const before=fs.readFileSync(ORIGINAL);
  const r=writeR190BBAudit({originalPath:ORIGINAL,outDir:out,expectedSha256:SHA});
  assert.equal(r.status,'HOLD_UPSTREAM_NO_SUPPORTED_TWO_WIDE_BOUNDARY_ROUTE');
  assert.deepEqual(fs.readdirSync(out).sort(),
   ['READ_ONLY_SKY_BOUNDARY.json','SOURCE_2WIDE_ROUTE.svg','STATUS_JA.txt']);
  assert(fs.readFileSync(path.join(out,'SOURCE_2WIDE_ROUTE.svg'),'utf8').includes('<svg'));
  assert.deepEqual(fs.readFileSync(ORIGINAL),before);
  assert.throws(()=>writeR190BBAudit({originalPath:ORIGINAL,outDir:out,
   expectedSha256:SHA}),/R190BB_FRESH_OUTPUT/);
  const link=path.join(root,'symlink-original');fs.symlinkSync(ORIGINAL,link);
  assert.throws(()=>writeR190BBAudit({originalPath:link,outDir:path.join(root,'elsewhere'),
   expectedSha256:SHA}),/R190BB_UNSAFE_ORIGINAL/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
