/**
 * B171 — reconcile existing B134/B135 testforblock *diagnostic documents*
 * with B170's source-pinned 18-checkpoint observation packet.
 *
 * No sockets, commands, world reads/writes or automatically resolved
 * local→Minecraft coordinate transform. Re-evaluates raw diagnostic
 * responses; refuses to trust reported classifications or claimed authority.
 *
 * Note: B134 and B135 diagnostics are NOT authenticated client evidence.
 * Repetition does not convert user-supplied JSON into live verification.
 */
import {createHash} from 'node:crypto';
import {makeProbePacket,verifyProbePacket,reviewProbeSubmission}
 from './b170-readonly-probe-packet.mjs';
import {createB134Commands,evaluateB134Results}
 from '../parallel/b134/main/b134-live-probe.mjs';
import {b135Commands,b135Evaluate}
 from '../parallel/b135/main/b135-controlled-live.mjs';

export const SCHEMA='minecraftaibuilder-b171-readback-reconciliation-v1';
export const RECEIPT_SCHEMA='minecraftaibuilder-b171-readback-receipts-v1';
const h=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const guard=(v,m)=>{if(!v)throw Error('B171_'+m);};
const only=(o,fields)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).every(x=>fields.includes(x));
const xyz=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isSafeInteger)&&
 Math.abs(p[0])<=30000000&&Math.abs(p[2])<=30000000&&
 p[1]>=-64&&p[1]<=320;
const key=p=>p.join(',');
const classResult=['MATCH','NO_MATCH','UNKNOWN'];
const strictReadbackMeta=(raw)=>{
 guard(raw&&typeof raw==='object'&&!Array.isArray(raw),'DIAGNOSTIC_OBJECT');
 guard(raw.constructionAllowed===false&&
  Array.isArray(raw.operations)&&raw.operations.length===0,
  'LEGACY_WORLD_WRITE_GATE');
 guard(raw.authenticatedStairCertification!==true&&
  raw.independentlyCertified!==true&&raw.walkabilityVerified!==true&&
  raw.traversabilityVerified!==true,'FORGED_GAME_AUTHORITY');
};
export function normalizeB171Receipt(receipt){
 guard(only(receipt,['checkpointId','source','diagnostic']),'RECEIPT_FIELDS');
 guard(typeof receipt.checkpointId==='string'&&
  /^((north|south)-(entry|tread-[1-7]|upper-mezzanine))$/.test(receipt.checkpointId),
  'CHECKPOINT_ID');
 guard(receipt.source==='B134'||receipt.source==='B135','SOURCE_TYPE');
 const d=receipt.diagnostic;
 strictReadbackMeta(d);
 let raw,expected,replayed,position;
 if(receipt.source==='B134'){
  guard(d.schema==='minecraftaibuilder-b134-live-readonly-diagnostic-v1'&&
   xyz([d.coords?.x,d.coords?.y,d.coords?.z])&&
   Array.isArray(d.results)&&d.results.length===5&&
   (d.provisionalStateValue===null||Number.isInteger(d.provisionalStateValue)),
   'B134_HEADER');
 }else{
  guard(d.schema==='minecraftaibuilder-b135-live-raw-control-v1'&&
   xyz([d.position?.x,d.position?.y,d.position?.z])&&
   Array.isArray(d.probes)&&d.probes.length===4&&
   d.controls&&typeof d.controls==='object','B135_HEADER');
 }
 if(receipt.source==='B134'){
  position=[d.coords.x,d.coords.y,d.coords.z];
  expected=createB134Commands(d.coords);
  guard(d.results.every((v,i)=>v?.command===expected[i]&&
   classResult.includes(v.classification)&&
   v.response&&typeof v.response==='object'),'B134_COMMANDS_OR_RESPONSES');
  raw=d.results.map(x=>x.response);
  replayed=evaluateB134Results(d.coords,raw);
  guard(same(replayed.results,d.results)&&
   replayed.outcome===d.outcome&&
   replayed.provisionalStateValue===d.provisionalStateValue,
   'B134_REPORTED_CLASSIFICATION_CONFLICT');
 }else{
  position=[d.position.x,d.position.y,d.position.z];
  expected=b135Commands(position.join(' '));
  raw=[d.controls.positive,d.controls.negative,...d.probes.map(x=>x.response)];
  guard(d.probes.every((p,i)=>p?.stateValue===i&&
   classResult.includes(p.classification)&&
   p.response&&typeof p.response==='object'),'B135_PROBES');
  replayed=b135Evaluate(position.join(' '),raw);
  guard(replayed.controlsValid===d.controlsValid&&
   same(replayed.controls,d.controls)&&same(replayed.probes,d.probes)&&
   replayed.provisionalStateValue===d.provisionalStateValue&&
   replayed.outcome===d.outcome,'B135_REPORTED_CLASSIFICATION_CONFLICT');
 }
 const possibleState=replayed.provisionalStateValue;
 const conclusive=Number.isInteger(possibleState)&&possibleState>=0&&
  possibleState<=3;
 guard(conclusive||possibleState===null,'IMPOSSIBLE_STATE_VALUE');
 return {
  checkpointId:receipt.checkpointId,source:receipt.source,
  worldXYZ:position,worldPositionFingerprinted:h(position),
  readbackSha256:h(d),commandCount:expected.length,
  provisionalWeirdoDirection:conclusive?possibleState:null,
  status:conclusive?'SINGLE_READBACK_CONSISTENT_BUT_UNATTESTED':
    'INCONCLUSIVE_READBACK',
  legacyClassification:replayed.outcome,
  gameClientAuthenticated:false,
  realWorldAnchorCalibrated:false,
  vanillaFacingMapped:false,
  minecraftPhysicsCertified:false
 };
}
export function makeEmptyB171Receipts(packet=makeProbePacket()){
 guard(verifyProbePacket(packet),'UNTRUSTED_PACKET');
 return {schema:RECEIPT_SCHEMA,packetSha256:packet.sha256,receipts:[]};
}
export function reconcileB171(packet,submission,archive){
 guard(verifyProbePacket(packet),'PINNED_PACKET_INVALID');
 guard(only(archive,['schema','packetSha256','receipts'])&&
  archive.schema===RECEIPT_SCHEMA&&archive.packetSha256===packet.sha256,
  'ARCHIVE_SCHEMA_OR_STALE_PACKET');
 guard(Array.isArray(archive.receipts)&&archive.receipts.length<=72,
  'ARCHIVE_TOO_LARGE');
 const reviewed=reviewProbeSubmission(packet,submission);
 guard(reviewed.constructionApproved===false&&
  reviewed.clientRuntimeVerified===false&&
  reviewed.gates.every(g=>g==='BLOCKED'),'B170_BASELINE_UNSAFE');
 const all=new Map(packet.checkpoints.map(x=>[x.id,[]]));
 const proofIds=new Set();
 for(const v of archive.receipts){
  const entry=normalizeB171Receipt(v);
  guard(all.has(entry.checkpointId),'UNKNOWN_CHECKPOINT');
  const dedup=entry.checkpointId+':'+entry.source+':'+entry.readbackSha256;
  guard(!proofIds.has(dedup),'DUPLICATE_DIAGNOSTIC');
  proofIds.add(dedup);all.get(entry.checkpointId).push(entry);
 }
 const observations=new Map(submission.observations.map(o=>[o.checkpointId,o]));
 const checkpoints=packet.checkpoints.map(p=>{
  const items=all.get(p.id),typed=observations.get(p.id)??null;
  const coords=[...new Set(items.map(x=>key(x.worldXYZ)))];
  const stateCandidates=[...new Set(items
   .filter(x=>x.provisionalWeirdoDirection!==null)
   .map(x=>x.provisionalWeirdoDirection))].sort();
  const humanCoords=typed?.worldXYZ??null;
  const coordsConflict=coords.length>1||
   (humanCoords!==null&&coords.length>0&&
    key(humanCoords)!==coords[0]);
  const stateConflict=stateCandidates.length>1;
  const uncertain=items.some(x=>x.provisionalWeirdoDirection===null);
  const stage=coordsConflict?'WORLD_COORDINATE_CONFLICT':
   stateConflict?'DIRECTION_VALUE_CONFLICT':
   items.length===0?'NOT_OBSERVED':
   uncertain?'INCONCLUSIVE_NEEDS_REPEAT':
   items.length===1?'ONE_READBACK_UNAUTHENTICATED':
   'REPEATED_REPORTS_CONSISTENT_UNAUTHENTICATED';
  const candidate=coordsConflict||stateConflict||uncertain||
   items.length===0?null:stateCandidates[0];
  return {
   checkpointId:p.id,wing:p.wing,localStanding:p.localStanding,
   worldCoordinatesKnownToSource:false,
   operatorEnteredWorldXYZ:humanCoords,
   diagnosticPositionCount:coords.length,
   readbackSources:items.map(x=>x.source),
   readbackProofHashes:items.map(x=>x.readbackSha256),
   importedReports:items.length,stage,
   provisionalWeirdoDirection:candidate??null,
   multipleReportsAreIndependentMeasurementsCertified:false,
   directionValueToPhysicalFacingMapped:false,
   uploadedBlockId:typed?.blockId??null,
   humanStateAndReadbackPhysicallyLinked:false,
   localToWorldTransformCertified:false,
   engineStairCollisionCertified:false,
   playerTraversalCertified:false
  };
 });
 const stageCount=(v)=>checkpoints.filter(x=>x.stage===v).length;
 const core={
  schema:SCHEMA,pinnedPacketSha256:packet.sha256,
  pinnedSourceSha256:packet.pinnedSourceSha256,
  pinnedGeometrySha256:packet.pinnedGeometrySha256,
  humanSubmissionReviewSha256:reviewed.sha256,
  sourceStatus:'LOCAL_DESIGN_WORLD_TRANSFORM_UNKNOWN',
  checkpoints,checkpointCount:checkpoints.length,
  diagnosticCount:archive.receipts.length,
  conflicts:stageCount('WORLD_COORDINATE_CONFLICT')+
   stageCount('DIRECTION_VALUE_CONFLICT'),
  repeatedConsistent:stageCount('REPEATED_REPORTS_CONSISTENT_UNAUTHENTICATED'),
  noReadbacks:stageCount('NOT_OBSERVED'),
  actualEducationReadbacksAuthenticated:0,
  blockStateToFacingMappingsCertified:0,
  original36DesignModelsModified:false,
  actualEducationCollisionCertified:false,
  playerPhysicsCertified:false,
  constructionApproved:false,worldContacts:0,worldWrites:0,
  worldCoordinates:null,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 return {...core,sha256:h(core)};
}
export function verifyB171Review(packet,submission,archive,report){
 try{
  return same(reconcileB171(packet,submission,archive),report)&&
   report.constructionApproved===false&&report.worldContacts===0&&
   report.actualEducationReadbacksAuthenticated===0&&
   report.gates.length===9&&report.gates.every(x=>x==='BLOCKED')&&
   report.BuildPlan.operations.length===0;
 }catch{return false}
}
