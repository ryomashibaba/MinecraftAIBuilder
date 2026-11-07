/** R190-BH — direct analysis of archived genuine original, NO generated model. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190BHArchivedOriginal,writeR190BHArchivedReview,
 parseR190BHArgs} from './r190bh-actual-original-postmortem.mjs';
const H=x=>createHash('sha256').update(x).digest('hex');
const fixture=new URL('../evidence/r190aa/pilot-01/MODEL_RESPONSE_ORIGINAL.txt',import.meta.url);
const realExpected='0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17';

test('BH diagnoses genuine archived Qwen text beyond first schema failure with no invented geometry',()=>{
 const original=fs.readFileSync(fixture),before=H(original);
 assert.equal(before,realExpected);
 const d=inspectR190BHArchivedOriginal(original,{expectedSha256:before});
 assert.equal(d.originalSha256,before);
 assert.equal(d.status,'HOLD_ARCHIVED_MODEL_CONTRACT_VIOLATIONS');
 assert.equal(d.strictR4ParsingStatus,'HOLD_STRICT_R4_OR_B143');
 assert.equal(d.sourceGeometryProduced,false);
 assert.equal(d.sourceWasRepaired,false);
 assert.equal(d.originalUnmodified,true);
 assert.equal(d.worldWrites,0);assert.equal(d.modelCalls,0);
 assert.equal(d.art,'ART_HOLD');
 const entries=d.literalFindings,byCode=c=>entries.filter(v=>v.code===c);
 assert.equal(byCode('TOP_LEVEL_CONTRACT_DRIFT').length,1);
 assert.deepEqual(byCode('TOP_LEVEL_CONTRACT_DRIFT')[0].observation.extraKeys,
  ['attempt','maxAttempts']);
 assert.equal(byCode('B143_SCHEMA_MISMATCH').length,1);
 assert.equal(byCode('CUT_HAS_FORBIDDEN_MATERIAL').length,3);
 assert.equal(byCode('STAIRCASE_UNSUPPORTED_AXIS').length,1);
 assert(byCode('STANDING_POINT_INTERSECTS_LITERAL_ADD_BOX').some(
  x=>x.path==='spatialPlan.entrance'));
 assert(byCode('STANDING_POINT_INTERSECTS_LITERAL_ADD_BOX').some(
  x=>x.path==='spatialPlan.destinations[0]'));
 assert.equal(byCode('HEADROOM_EXTENDS_PAST_BOUNDS').length,1);
 assert.equal(d.independentArchitecturalQualityReview,'NOT_PERFORMED');
 assert.equal(H(original),before);
});
test('BH rejects changed original SHA, never auto-fixes schema or source',()=>{
 const original=fs.readFileSync(fixture);
 const changed=Buffer.from(original.toString('utf8').replace('"schema":"b143"',
  '"schema":"minecraftaibuilder-b143-building-dsl-v1"'));
 assert.notEqual(H(changed),realExpected);
 assert.throws(()=>inspectR190BHArchivedOriginal(changed,{
  expectedSha256:realExpected}),/R190BH_ORIGINAL_SHA_MISMATCH/);
});
test('BH refuses new geometry artifacts and writes only real-raw diagnostic JSON',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bh-original-'));
 const copied=path.join(root,'original.txt'),out=path.join(root,'source-diagnostic');
 try{
  const original=fs.readFileSync(fixture);fs.writeFileSync(copied,original);
  const report=writeR190BHArchivedReview({originalPath:copied,
   expectedSha256:realExpected,outDir:out});
  assert.equal(report.originalSha256,realExpected);
  assert.deepEqual(fs.readdirSync(out),['R190BH_ARCHIVED_ORIGINAL_FINDINGS.json']);
  assert.deepEqual(fs.readFileSync(copied),original);
  assert.throws(()=>writeR190BHArchivedReview({originalPath:copied,
   expectedSha256:realExpected,outDir:out}),/R190BH_PATHS/);
  assert.deepEqual(report.gates,Array(9).fill('BLOCKED'));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('BH synthetic clean metadata is not evidence of architecture quality',()=>{
 const d={design:{schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'bh-fake-only',title:'Synthetic',brief:'Synthetic source test',
  bounds:{width:12,height:12,depth:12},designOnly:true,
  elements:[{id:'floor',mode:'add',shape:'box',material:'stone',
   origin:[0,0,0],size:[12,1,12]}]},
 explanation:'Only fake test source.',assumptions:[],
 spatialPlan:{designIntent:'Tiny source-only test.',massStrategy:'One flat base source.',
 circulationStrategy:'Continuous flat floor.',entrance:[2,1,2],headroom:2,
 protectedVoids:[],destinations:[{id:'a',point:[3,1,3],maximumPathSteps:8}],
 functionalZones:[{id:'f',origin:[2,1,2],size:[4,1,4],
  minimumReachablePositions:1,minimumReachablePercent:1}]}};
 const raw=Buffer.from(JSON.stringify(d));
 const report=inspectR190BHArchivedOriginal(raw,{expectedSha256:H(raw)});
 assert.equal(report.literalFindings.length,0);
 assert.equal(report.improvementCertified,false);
 assert.equal(report.independentVisualArtReview,'NOT_PERFORMED');
 assert.equal(report.art,'ART_HOLD');assert.equal(report.worldContacts,0);
});
test('BH CLI has no model execution or repair flag',()=>{
 assert.deepEqual(parseR190BHArgs(['--help']),{help:true});
 assert.deepEqual(parseR190BHArgs(['--original','a','--sha',realExpected,'--out','b']),{
  originalPath:'a',expectedSha256:realExpected,outDir:'b'});
 assert.throws(()=>parseR190BHArgs(['--original','a','--sha',realExpected,
  '--out','b','--repair-model','yes']),/R190BH_ARGUMENTS/);
});
