import test from 'node:test';
import assert from 'node:assert/strict';
import {
 makeProbePacket,verifyProbePacket,reviewProbeSubmission,
 verifyObservationReview,KNOWN_B166_SOURCE_SHA256,
 KNOWN_B166_GEOMETRY_SHA256
} from '../source/ai/b170-readonly-probe-packet.mjs';
const packet=makeProbePacket();
const input=(id,more={})=>({
 checkpointId:id,blockId:null,facing:'unknown',verticalHalf:'unknown',
 stairShape:'unknown',captureMethod:'example_only',minecraftVersion:'',
 worldXYZ:null,movementOutcome:'not_tested',evidenceNote:'',
 observedAt:null,...more
});
test('18 exact wing checkpoints preserve local-only coordinates, all foot/body samples, no world permission',()=>{
 assert(verifyProbePacket(packet));
 assert.equal(packet.checkpointCount,18);
 assert.deepEqual(packet.checkpoints.map(x=>x.id).slice(0,3),
  ['north-entry','north-tread-1','north-tread-2']);
 assert.equal(new Set(packet.checkpoints.map(x=>x.id)).size,18);
 assert.deepEqual(packet.checkpoints.at(0).localStanding,[30,19,15]);
 assert.deepEqual(packet.checkpoints.at(7).localStanding,[30,26,29]);
 assert.deepEqual(packet.checkpoints.at(8).localStanding,[30,26,30]);
 assert.deepEqual(packet.checkpoints.at(9).localStanding,[79,19,73]);
 assert.deepEqual(packet.checkpoints.at(17).localStanding,[79,26,88]);
 assert(packet.checkpoints.every(x=>x.localFloorCells.length===4&&
  x.localBodyClearanceCells.length===8&&x.worldCoordinates===null&&
  x.observedMinecraftBlockId===null&&x.measuredByRealGame===false));
 assert.equal(packet.pinnedSourceSha256,KNOWN_B166_SOURCE_SHA256);
 assert.equal(packet.pinnedGeometrySha256,KNOWN_B166_GEOMETRY_SHA256);
 assert.deepEqual(packet.BuildPlan.operations,[]);
 assert(packet.gates.every(x=>x==='BLOCKED'));
});
test('empty records are unobserved, partial examples remain partial and snapshots never certify client physics',()=>{
 const empty={packetSha256:packet.sha256,observations:[]};
 const a=reviewProbeSubmission(packet,empty);
 assert.equal(a.stage,'UNOBSERVED');
 assert.equal(a.missingCheckpointIds.length,18);
 assert(verifyObservationReview(packet,empty,a));
 const partial={packetSha256:packet.sha256,observations:[
  input('north-tread-1',{blockId:'minecraft:stone',evidenceNote:'offline example'})]};
 const r=reviewProbeSubmission(packet,partial);
 assert.equal(r.stage,'PARTIAL_USER_SUPPLIED_UNAUTHENTICATED');
 assert.equal(r.reviewedCount,1);
 assert.equal(r.completeButUnauthenticatedCount,0);
 assert.equal(r.actualBlockStatesCertified,false);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.worldWrites,0);
 assert(verifyObservationReview(packet,partial,r));
});
test('18 externally supplied complete readings never acquire certification or world-write permissions',()=>{
 const record=id=>input(id,{
  blockId:'minecraft:stone',facing:'north',verticalHalf:'bottom',
  stairShape:'straight',captureMethod:'external_readonly_import',
  minecraftVersion:'Minecraft Education 26.3',
  worldXYZ:[-123,105,231],movementOutcome:'observed_pass',
  observedAt:'2026-10-17T12:30:00+09:00'});
 const s={packetSha256:packet.sha256,
  observations:packet.checkpoints.map(x=>record(x.id))};
 const result=reviewProbeSubmission(packet,s);
 assert.equal(result.stage,'COMPLETE_USER_SUPPLIED_UNAUTHENTICATED');
 assert.equal(result.completeButUnauthenticatedCount,18);
 assert.equal(result.reviewedCount,18);
 assert.equal(result.actualBlockStatesCertified,false);
 assert.equal(result.clientRuntimeVerified,false);
 assert.equal(result.minecraftPhysicsCertified,false);
 assert.equal(result.realWorldLocationCertified,false);
 assert.equal(result.constructionApproved,false);
 assert.deepEqual(result.BuildPlan.operations,[]);
 assert(result.gates.every(x=>x==='BLOCKED'));
 assert(verifyObservationReview(packet,s,result));
 const fake=structuredClone(result);fake.minecraftPhysicsCertified=true;
 assert(!verifyObservationReview(packet,s,fake));
});
test('refuse fake authority, stale packet, forged block metadata and duplicate anchors',()=>{
 const sha=packet.sha256;
 for(const forbidden of [
  {constructionApproved:true},{worldWrites:1},{worldContacts:1},
  {BuildPlan:{operations:[{type:'setblock'}]}},
  {minecraftCommands:['/fill 1 2 3']},
  {physicsCertified:true}
 ]){
  assert.throws(()=>reviewProbeSubmission(packet,{
   packetSha256:sha,observations:[],...forbidden}),/B170_UNTRUSTED_AUTHORITY_FIELD_/);
 }
 assert.throws(()=>reviewProbeSubmission(packet,{
  packetSha256:'0'.repeat(64),observations:[]}),/B170_STALE_PACKET/);
 assert.throws(()=>reviewProbeSubmission(packet,{
  packetSha256:sha,observations:[input('north-entry'),input('north-entry')]}),
  /B170_UNKNOWN_OR_DUPLICATE_CHECKPOINT/);
 assert.throws(()=>reviewProbeSubmission(packet,{
  packetSha256:sha,observations:[input('south-tread-3',{blockId:'give @p'})]}),
  /B170_BLOCK_ID_FORMAT/);
 assert.throws(()=>reviewProbeSubmission(packet,{
  packetSha256:sha,observations:[input('south-tread-3',{worldXYZ:[0,900,0]})]}),
  /B170_WORLD_COORDINATES/);
 assert.throws(()=>reviewProbeSubmission(packet,{
  packetSha256:sha,observations:[{...input('north-entry'),gameCertified:true}]}),
  /B170_EXTRA_FIELD/);
 const forged=structuredClone(packet);forged.checkpoints[0].worldCoordinates=[100,70,20];
 assert(!verifyProbePacket(forged));
});
