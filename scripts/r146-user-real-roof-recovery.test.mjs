import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {recoverR146RoofProfileAsMaterial}
 from '../source/ai/r146-roof-material-boundary.mjs';
import {makeR134FreshRequest}
 from './r134-fresh-model-pilot.mjs';
import {parseR139RelationalFurnishedReply}
 from './r139-relational-model.mjs';
import {replayR146SavedQwen}
 from './r146-replay-saved-qwen.mjs';
import {CASE} from './r141-local-graph-evidence.mjs';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const original=fs.readFileSync(path.join(dirname,'fixtures',
 'r146-user-qwen14b-20261025-raw.json'),'utf8');
const request=makeR134FreshRequest({brief:CASE.brief});
const sha=s=>createHash('sha256').update(s).digest('hex');
const expected='d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591';

test('user-verified real Qwen raw must stay BYTE EXACT and strict parser fails ONLY at original malformed roof material',()=>{
 assert.equal(sha(original),expected);
 assert.throws(()=>parseR139RelationalFurnishedReply(original,request),
  /R134_MULTIZONE_PLAN_CONTRACT/);
 const answer=JSON.parse(original);
 assert.equal(answer.materials.roof,'sawtooth');
 assert.equal(answer.form.roofProfile,'sawtooth');
 assert.equal(answer.objects.length,8);
 assert.equal(answer.relations.entryFacingZoneId,'entry-demonstration');
 assert.deepEqual(answer.relations.directAdjacencies,
  [['fabrication-studio','technical-repair-bay']]);
});

test('exact one-field recovery preserves Qwen room program, direct link and eight choices',()=>{
 const before=JSON.parse(original);
 const corrected=recoverR146RoofProfileAsMaterial(original,before);
 assert.equal(sha(original),expected);
 assert.equal(corrected.evidence.rawSha256,expected);
 assert.equal(corrected.derivedReply.materials.roof,'metal');
 assert.equal(corrected.evidence.hostRepairRequired,true);
 assert.equal(corrected.evidence.repairActions.length,1);
 assert.deepEqual(corrected.derivedReply.relations,before.relations);
 assert.deepEqual(corrected.derivedReply.layout,before.layout);
 assert.deepEqual(corrected.derivedReply.objects,before.objects);
 assert.deepEqual(corrected.derivedReply.form,before.form);
 assert.equal(corrected.evidence.modelCalls,0);
 assert.equal(corrected.evidence.worldWrites,0);
 const output=parseR139RelationalFurnishedReply(original,request,
  {allowRoofMaterialCorrection:true});
 assert.equal(output.boundedHostRepairRequired,true);
 assert.equal(output.hostRepairActions.length,1);
 assert.equal(output.relationalBase.directAdjacencyDoorEvidence.length,1);
 assert.equal(output.relationalBase.entryFacingZoneEvidence.zoneId,
  'entry-demonstration');
 assert.equal(output.featured.placements.length,8);
 assert.equal(output.featured.sourceRouteAudit.status,
  'SOURCE_ROUTES_REACH_ALL_ZONES');
 assert.equal(output.worldWrites,0);
});

test('R146 rejects invented material fixes when the shape token does not exactly match chosen profile',()=>{
 const before=JSON.parse(original);
 before.form.roofProfile='ridge';
 assert.throws(()=>recoverR146RoofProfileAsMaterial(original,before),
  /R146_ROOF_AMBIGUOUS_OR_UNSUPPORTED/);
 before.form.roofProfile='sawtooth';
 before.materials.roof='quartzium';
 assert.throws(()=>recoverR146RoofProfileAsMaterial(original,before),
  /R146_ROOF_AMBIGUOUS_OR_UNSUPPORTED/);
});

test('offline Qwen replay generates source-only 3D with independent room and all eight equipment proofs',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r146-archived-'));
 t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
 const dir=path.join(temp,'one-replay');
 const result=replayR146SavedQwen({outDir:dir});
 assert.equal(result.status,
  'REAL_QWEN_PROGRAM_HOST_CORRECTED_MATERIAL_REAL_3D_SOURCE_REVIEW_REQUIRED',
  result.failureReason);
 assert.equal(result.modelCalls,0);
 assert.equal(result.verifiedOriginalR145RawSha256,true);
 assert.equal(result.hostMaterialCorrectionApplied,true);
 assert.equal(result.qwenRoomGraphChanged,false);
 assert.equal(result.qwenEquipmentChanged,false);
 assert.equal(result.roomCount,4);
 assert.equal(result.furnishedEquipmentCount,8);
 assert.equal(result.directDoorCount,1);
 assert.equal(result.independentGraphSourceAudit,'SOURCE_ROOM_GRAPH_VERIFIED');
 assert.equal(fs.readFileSync(path.join(dir,
  'R145_QWEN_RAW_ORIGINAL_UNCHANGED.txt'),'utf8'),original);
 assert.ok(fs.existsSync(path.join(dir,'index.html')));
 assert.equal(result.worldWrites,0);
 assert.deepEqual(result.gates,Array(9).fill('BLOCKED'));
 assert.throws(()=>replayR146SavedQwen({outDir:dir}),
  /R146_REPLAY_OUTPUT_EXISTS_OR_INVALID_ARGUMENTS/);
});
