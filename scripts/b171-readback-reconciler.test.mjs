import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProbePacket} from '../source/ai/b170-readonly-probe-packet.mjs';
import {createB134Commands,evaluateB134Results}
 from '../source/parallel/b134/main/b134-live-probe.mjs';
import {b135Evaluate} from '../source/parallel/b135/main/b135-controlled-live.mjs';
import {
 makeEmptyB171Receipts,normalizeB171Receipt,reconcileB171,verifyB171Review
} from '../source/ai/b171-readback-reconciler.mjs';

const xyz='122 104 -138',checkpointId='north-tread-1';
const pos=[122,104,-138];
const match=()=>({statusCode:0,successCount:1});
const no134=()=>({statusCode:1,successCount:0});
const no135=()=>({statusCode:-2147352576,successCount:0});
function b134(state=1,coords=xyz){
 const raw=[match(),...[0,1,2,3].map(i=>i===state?match():no134())];
 const result=evaluateB134Results(coords,raw);
 assert.equal(result.provisionalStateValue,state);
 assert.equal(result.results.length,5);
 return {checkpointId,source:'B134',diagnostic:result};
}
function b135(state=1,coords=xyz){
 const raw=[match(),no135(),...[0,1,2,3].map(i=>i===state?match():no135())];
 const result=b135Evaluate(coords,raw);
 assert.equal(result.provisionalStateValue,state);
 assert.equal(result.probes.length,4);
 return {checkpointId,source:'B135',diagnostic:result};
}
const blank=packet=>({packetSha256:packet.sha256,observations:[]});
const archive=(packet,receipts)=>({
 schema:'minecraftaibuilder-b171-readback-receipts-v1',
 packetSha256:packet.sha256,receipts
});
const obs=(packet,coord)=>({packetSha256:packet.sha256,observations:[{
 checkpointId,blockId:'minecraft:oak_stairs',
 facing:'unknown',verticalHalf:'unknown',stairShape:'unknown',
 captureMethod:'external_readonly_import',minecraftVersion:'26.3',
 worldXYZ:coord,movementOutcome:'not_tested',evidenceNote:'',
 observedAt:null
}]});

test('empty import is genuinely unobserved, 18 checkpoints pinned; all nine HOLD gates intact',()=>{
 const packet=makeProbePacket(),data=makeEmptyB171Receipts(packet);
 const r=reconcileB171(packet,blank(packet),data);
 assert.equal(r.checkpointCount,18);
 assert.equal(r.diagnosticCount,0);
 assert.equal(r.noReadbacks,18);
 assert.equal(r.actualEducationReadbacksAuthenticated,0);
 assert.equal(r.blockStateToFacingMappingsCertified,0);
 assert.equal(r.original36DesignModelsModified,false);
 assert.equal(r.constructionApproved,false);
 assert.equal(r.worldWrites,0);
 assert.deepEqual(r.BuildPlan.operations,[]);
 assert(r.gates.every(x=>x==='BLOCKED'));
 assert(verifyB171Review(packet,blank(packet),data,r));
});

test('replay original legacy B134/B135 classifiers rather than trusting reported result labels',()=>{
 const r134=normalizeB171Receipt(b134());
 const r135=normalizeB171Receipt(b135());
 assert.equal(r134.provisionalWeirdoDirection,1);
 assert.equal(r135.provisionalWeirdoDirection,1);
 assert.deepEqual(r134.worldXYZ,pos);
 assert.deepEqual(r135.worldXYZ,pos);
 assert.equal(r134.commandCount,5);
 assert.equal(r135.commandCount,6);
 assert.equal(r134.gameClientAuthenticated,false);
 assert.equal(r135.realWorldAnchorCalibrated,false);
 assert.equal(r135.vanillaFacingMapped,false);
 assert.equal(createB134Commands(xyz).length,5);
 const packet=makeProbePacket();
 const data=archive(packet,[b134(),b135()]);
 const result=reconcileB171(packet,obs(packet,pos),data);
 const first=result.checkpoints.find(x=>x.checkpointId===checkpointId);
 assert.equal(first.stage,'REPEATED_REPORTS_CONSISTENT_UNAUTHENTICATED');
 assert.equal(first.provisionalWeirdoDirection,1);
 assert.equal(first.importedReports,2);
 assert.equal(first.directionValueToPhysicalFacingMapped,false);
 assert.equal(first.humanStateAndReadbackPhysicallyLinked,false);
 assert.equal(result.repeatedConsistent,1);
 assert.equal(result.noReadbacks,17);
 assert(verifyB171Review(packet,obs(packet,pos),data,result));
});

test('conflicting candidate values and observer position mismatch are blocked, not remapped',()=>{
 const packet=makeProbePacket();
 const differing=reconcileB171(packet,blank(packet),
  archive(packet,[b134(1),b135(2)]));
 assert.equal(differing.conflicts,1);
 assert.equal(differing.checkpoints[1].stage,'DIRECTION_VALUE_CONFLICT');
 assert.equal(differing.checkpoints[1].provisionalWeirdoDirection,null);
 const inconsistent=reconcileB171(packet,obs(packet,[122,104,-137]),
  archive(packet,[b134(1)]));
 assert.equal(inconsistent.conflicts,1);
 assert.equal(inconsistent.checkpoints[1].stage,'WORLD_COORDINATE_CONFLICT');
 assert.equal(inconsistent.checkpoints[1].localToWorldTransformCertified,false);
});

test('reject stale packets, duplicate receipts, forged command results and construction authority',()=>{
 const packet=makeProbePacket();
 const wrong=archive(packet,[b134()]);
 wrong.packetSha256='0'.repeat(64);
 assert.throws(()=>reconcileB171(packet,blank(packet),wrong),
  /B171_ARCHIVE_SCHEMA_OR_STALE_PACKET/);
 const duplicate=archive(packet,[b134(),b134()]);
 assert.throws(()=>reconcileB171(packet,blank(packet),duplicate),
  /B171_DUPLICATE_DIAGNOSTIC/);
 const malicious=b134();
 malicious.diagnostic.results[0].command='setblock 0 0 0 stone';
 assert.throws(()=>normalizeB171Receipt(malicious),
  /B171_B134_COMMANDS_OR_RESPONSES/);
 const bogus=b135();
 bogus.diagnostic.probes[0].classification='MATCH';
 assert.throws(()=>normalizeB171Receipt(bogus),
  /B171_B135_REPORTED_CLASSIFICATION_CONFLICT/);
 const construction=b134();
 construction.diagnostic.constructionAllowed=true;
 assert.throws(()=>normalizeB171Receipt(construction),
  /B171_LEGACY_WORLD_WRITE_GATE/);
 const data=archive(packet,[]);
 const result=reconcileB171(packet,blank(packet),data);
 const forged=structuredClone(result);forged.actualEducationReadbacksAuthenticated=1;
 assert(!verifyB171Review(packet,blank(packet),data,forged));
});

test('unknown/missing controls cannot be promoted into a direction candidate',()=>{
 const packet=makeProbePacket();
 const result=b135();
 result.diagnostic.controls.positive.statusCode=87;
 assert.throws(()=>normalizeB171Receipt(result),
  /B171_B135_REPORTED_CLASSIFICATION_CONFLICT/);
 const inconclusive=b134();
 inconclusive.diagnostic.results[3].response.successCount=null;
 assert.throws(()=>normalizeB171Receipt(inconclusive),
  /B171_B134_REPORTED_CLASSIFICATION_CONFLICT/);
});
