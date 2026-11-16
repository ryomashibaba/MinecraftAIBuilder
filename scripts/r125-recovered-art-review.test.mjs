import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {parseRecoveredArtArgs,reviewRecoveredArchitecture}
 from './r125-recovered-art-review.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const original=fs.readFileSync(new URL(
 '../evidence/r125-real-l-corner-20261101/MODEL_RESPONSE_ORIGINAL.txt',
 import.meta.url),'utf8');
const prompt='日本語で展示と利用動線が明快な建物を建築してください。職員が作業し、訪問者が安全に作品を見られる必要があります。';
function study(root,name,source,pass){
 const home=path.join(root,name),one=path.join(home,'tide-observatory');
 fs.mkdirSync(one,{recursive:true});
 const row={id:'tide-observatory',sourceVerified:pass,
  originalSha256:sha(original),
  ...(pass?{sourceSha256:source.sourceSha256,
    geometrySha256:source.geometrySha256}:{})};
 fs.writeFileSync(path.join(home,'BATCH_REPORT.json'),
  JSON.stringify({schema:'r125-local-plan-batch-v1',
   planned:1,attempted:1,originalResponseCount:1,
   model:'qwen3:14b',worldWrites:0,automaticRetries:0,
   sourcePassCount:pass?1:0,allSourceVerified:pass,completed:[row]}));
 fs.writeFileSync(path.join(one,'MODEL_RESPONSE_ORIGINAL.txt'),original);
 fs.writeFileSync(path.join(one,'REQUEST_ORIGINAL.txt'),prompt);
 if(pass)fs.writeFileSync(path.join(one,'B143_SOURCE_REVIEW_ONLY.json'),
  JSON.stringify(source.sourceDesign));
 return home;
}

test('one offline recovery replays saved original exactly and produces old/new source art without another POST',()=>{
 const verified=diagnoseR125ArchitecturePlanOriginal(original);
 assert.equal(verified.sourceVerified,true);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v11-recovered-art-'));
 try{
  const beforeStudy=study(root,'old',verified,true);
  const failedStudy=study(root,'failed',verified,false);
  const outDir=path.join(root,'NEW_PRIVATE_REVIEW');
  const args=['--before-study',beforeStudy,'--failed-study',failedStudy,
   '--out',outDir];
  assert.deepEqual(parseRecoveredArtArgs(args),{beforeStudy,failedStudy,outDir});
  const report=reviewRecoveredArchitecture({beforeStudy,failedStudy,outDir});
  assert.equal(report.originalRequestsIdentical,true);
  assert.equal(report.modelCalls,0);
  assert.equal(report.retries,0);
  assert.equal(report.worldWrites,0);
  assert.equal(report.sourceOriginalsEdited,false);
  assert.equal(report.artifactStatus,'SOURCE_PASS_ART_REVIEW_READY');
  assert.equal(report.humanArt,'NOT_REVIEWED');
  assert.equal(report.minecraftWalking,'NOT_TESTED');
  assert.equal(report.before.originalSha256,sha(original));
  assert.equal(report.after.originalSha256,sha(original));
  assert.equal(report.after.sourceVerified,true);
  assert.equal(report.after.sourceSha256,verified.sourceSha256);
  assert.equal(report.finalVoxelDifference.sameActualGeometryAndMaterial,true);
  assert.equal(report.education.sourceSha256,verified.sourceSha256);
  assert.equal(report.education.geometrySha256,verified.geometrySha256);
  assert.equal(report.education.worldWrites,0);
  assert.equal(report.education.inGameBlockPlacement,'NOT_TESTED');
  assert.equal(report.education.inGameWalk,'NOT_TESTED');
  assert.ok(report.education.usedMaterials.length>=1);
  assert.equal(report.education.materialCounts.stone>=0,true);
  assert.match(report.education.status,/^DISPOSABLE_PREVIEW_ONLY_/);
  assert.equal(report.education.userMustUseNewDisposableWorld,true);
  const makecode=fs.readFileSync(report.education.packet,'utf8');
  assert.ok(makecode.includes('mabbuild'));
  assert.equal(sha(makecode),report.education.packetSha256);
  const packet=JSON.parse(fs.readFileSync(path.join(outDir,
   'EDUCATION_DISPOSABLE_PREVIEW','MAKECODE_EXPORT_REPORT.json'),'utf8'));
  assert.equal(packet.materialMode,'UNVERIFIED_TEST_WORLD_PREVIEW');
  assert.equal(packet.sourceSha256,verified.sourceSha256);
  assert.equal(packet.geometrySha256,verified.geometrySha256);
  assert.equal(packet.worldWrites,0);
  assert.equal(packet.programExecuted,false);
  assert.deepEqual(packet.BuildPlan.operations,[]);
  assert.equal(report.education.plannedVoxelCount,
   packet.plannedVoxelCount);
  assert(fs.existsSync(report.abImage));
  assert.equal(fs.readFileSync(report.abImage).subarray(0,8).toString('hex'),
   '89504e470d0a1a0a');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(outDir,
   'RECOVERY_ART_REPORT.json'),'utf8')),report);
  const newDiag=JSON.parse(fs.readFileSync(path.join(outDir,
   'RECOVERED_SOURCE','SOURCE_DIAGNOSIS.json'),'utf8'));
  assert.equal(newDiag.sourceVerified,true);
  assert.equal(fs.readFileSync(path.join(failedStudy,'tide-observatory',
   'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'),original);
  assert.throws(()=>reviewRecoveredArchitecture({
   beforeStudy,failedStudy,outDir}),/NEW_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('offline recovered art refuses different prompts and tampered originals before output',()=>{
 const verified=diagnoseR125ArchitecturePlanOriginal(original);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mab-v11-recovered-hold-'));
 try{
  const beforeStudy=study(root,'old',verified,true);
  const failedStudy=study(root,'failed',verified,false);
  const outDir=path.join(root,'NEW');
  const request=path.join(failedStudy,'tide-observatory','REQUEST_ORIGINAL.txt');
  fs.writeFileSync(request,prompt+' 改変');
  assert.throws(()=>reviewRecoveredArchitecture({
   beforeStudy,failedStudy,outDir}),/MODEL_REQUEST_NOT_EXACTLY_THE_SAME/);
  assert.equal(fs.existsSync(outDir),false);
  fs.writeFileSync(request,prompt);
  fs.writeFileSync(path.join(failedStudy,'tide-observatory',
   'MODEL_RESPONSE_ORIGINAL.txt'),original+' ');
  assert.throws(()=>reviewRecoveredArchitecture({
   beforeStudy,failedStudy,outDir}),/ORIGINAL_HASH_MISMATCH/);
  assert.equal(fs.existsSync(outDir),false);
  assert.throws(()=>parseRecoveredArtArgs(['--before-study','x']),
   /REQUIRE_BEFORE_FAILED_OUT/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
