import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {auditR190ArchivedQwenR146,compileR190ArchivedQwenWithHost,
 auditR190ArchivedR125Plan}
 from '../source/ai/r190-saved-qwen-bridge.mjs';
import {R190_R146_EXPLICIT_HOST_COMPLETION as host}
 from './r190-saved-qwen-host-completion.mjs';
const raw=fs.readFileSync(new URL('./fixtures/r146-user-qwen14b-20261025-raw.json',
 import.meta.url),'utf8');
const realR146Hash='d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591';
const read=f=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+f,import.meta.url),'utf8'));
test('R190-E authentic archived R146 bytes HOLD instead of inventing dimensions',()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),realR146Hash);
 const a=auditR190ArchivedQwenR146(raw);
 assert.equal(a.rawSha256,realR146Hash);
 assert.equal(a.originalRoomCount,4);
 assert.equal(a.directModelAdjacencyCount,1);
 assert.equal(a.originalObjectCount,8);
 assert.equal(a.worldSourceGenerated,false);
 assert.equal(a.modelSpatialAutonomyVerified,false);
 assert.equal(a.status,'HOLD_MISSING_INDEPENDENT_SPATIAL_DESIGN');
 assert.ok(a.missingFromArchivedModel.includes('ROOM_EXACT_WIDTH_DEPTH_HEIGHT'));
 assert.ok(a.preservedButNotRepresented.some(i=>
  i.intent==='form.roofProfile'&&i.value==='sawtooth'));
 assert.deepEqual(a.BuildPlan.operations,[]);
 assert.equal(a.worldWrites,0);
});
test('R190-E host supplement compiles source without attributing host room geometry to Qwen',()=>{
 const before=JSON.stringify(host),original=raw;
 const r=compileR190ArchivedQwenWithHost(raw,host);
 assert.equal(JSON.stringify(host),before);
 assert.equal(raw,original);
 assert.equal(r.archivedOriginalSha256,realR146Hash);
 assert.equal(r.qwenAuthoredGeometryOrTopology,false);
 assert.equal(r.originalModelEntryPreserved,true);
 assert.equal(r.originalModelDirectEdgesVerified,1);
 assert.equal(r.originalEquipmentStillNotRendered,8);
 assert.equal(r.originalRoofAndFacadeStillNotRendered,true);
 assert.equal(r.modelCalls,0);
 assert.equal(r.candidates.length,3);
 assert.equal(new Set(r.candidates.map(c=>c.geometrySha256)).size,3);
 for(const c of r.candidates){
  assert.equal(c.sourceVerified,true);
  assert.ok(c.realB143Voxels>1000);
  assert.ok(c.sourceRoutePads>30);
  assert.ok(c.realDirectPortals.some(p=>
   p.includes('fabrication-studio')&&p.includes('technical-repair-bay')));
 }
 assert.equal(r.roomEvidence.find(x=>x.id==='fabrication-studio').modelRelativeWeight,4);
 assert.equal(r.roomEvidence.find(x=>x.id==='fabrication-studio').hostAddedDimensionsAndTopology.width,14);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert.equal(r.worldWrites,0);
 assert.equal(r.worldContacts,0);
 assert.equal(r.readiness,'NOT_PREPARED');
 assert.deepEqual(r.gates,Array(9).fill('BLOCKED'));
});
test('R190-E fail-closed when host falsifies a Qwen direct edge or injects commands',()=>{
 const notDirect=structuredClone(host);
 notDirect.rooms.find(s=>s.id==='technical-repair-bay').parentId='entry-demonstration';
 notDirect.rooms.find(s=>s.id==='technical-repair-bay').side='east';
 assert.throws(()=>compileR190ArchivedQwenWithHost(raw,notDirect),
  /MODEL_DIRECT_ADJACENCY_NOT_REPRESENTABLE/);
 const missing=structuredClone(host);
 missing.rooms.pop();
 assert.throws(()=>compileR190ArchivedQwenWithHost(raw,missing),/HOST_ROOM_COUNT/);
 const injected=structuredClone(host);
 injected.worldCommand='/fill';
 assert.throws(()=>compileR190ArchivedQwenWithHost(raw,injected),/HOST_FIELDS/);
 const wrong=structuredClone(host);
 wrong.roofMaterial='sawtooth';
 assert.throws(()=>compileR190ArchivedQwenWithHost(raw,wrong),/HOST_ROOF_MATERIAL/);
 const hostile=JSON.parse(raw);hostile.worldCommand='/fill';
 assert.throws(()=>auditR190ArchivedQwenR146(JSON.stringify(hostile)),/MODEL_TOP_LEVEL_FIELDS/);
});
test('R190-E preserved three real R125 Qwen programs HOLD on missing multilevel semantics',()=>{
 const paths=['r125-qwen14b-residential-2024a.json',
  'r125-qwen14b-shop-20261024.json',
  'r125-qwen14b-research-20261024.json'];
 const a=paths.map(x=>auditR190ArchivedR125Plan(read(x)));
 assert.deepEqual(a.map(x=>x.originalLevelCount),[2,1,2]);
 assert.deepEqual(a.map(x=>x.originalModelRoomCount),[4,2,4]);
 assert.ok(a.every(x=>x.status==='HOLD_UNTRANSLATED_R125_SPATIAL_PROGRAM'));
 assert.ok(a.every(x=>x.sourceGenerated===false&&x.worldWrites===0));
 assert.ok(a.every(x=>x.cannotSilentlyRepresent.includes('R125_SPLIT_PERCENTS')));
});
