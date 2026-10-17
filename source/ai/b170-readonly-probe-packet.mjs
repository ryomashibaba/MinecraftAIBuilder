/**
 * B170 — no-write, no-network Minecraft Education stair measurement packet.
 *
 * The B165/B166 stair coordinates below are LOCAL DESIGN coordinates.
 * Their exact mapping to an Education world is UNKNOWN. This module NEVER
 * opens a socket, runs Minecraft commands, builds blocks or infers a world
 * origin. External observations are user-supplied evidence, not attested
 * game-client readings or a physics certificate.
 *
 * The packet is a concrete 18-checkpoint human/importable measurement plan.
 */
import {createHash} from 'node:crypto';
export const SCHEMA='minecraftaibuilder-b170-education-readonly-packet-v1';
export const SOURCE_ID='doppler-orbital-crown-navigation-network';
export const KNOWN_B166_SOURCE_SHA256=
 '5c7c554bf716592b73e46d9c42666640bcd363192f727ccfe60b551033d5a9dc';
export const KNOWN_B166_GEOMETRY_SHA256=
 '024048b90cac904299cfad474359da0ab2cefda0744723bc73d3f4a0bc3aad22';
const SHA=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const assert=(v,name)=>{if(!v)throw Error('B170_'+name)};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const pt=x=>Array.isArray(x)&&x.length===3&&
 x.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=128);
const worldPt=x=>Array.isArray(x)&&x.length===3&&
 x.every(Number.isSafeInteger)&&Math.abs(x[0])<=30000000&&
 Math.abs(x[2])<=30000000&&x[1]>=-64&&x[1]<=320;
const wingList=[
 {wing:'north',x:30,z:17,entry:[30,19,15],top:[30,26,30]},
 {wing:'south',x:79,z:75,entry:[79,19,73],top:[79,26,88]}
];
export function makeProbePacket(){
 const checks=[];
 for(const wing of wingList){
  const stops=[
   {name:'entry',standing:wing.entry},
   ...Array.from({length:7},(_,i)=>({
    name:'tread-'+(i+1),standing:[wing.x,20+i,wing.z+2*i]})),
   {name:'upper-mezzanine',standing:wing.top}
  ];
  for(let i=0;i<stops.length;i++){
   const stop=stops[i],[x,y,z]=stop.standing;
   const footCells=[];
   const bodyCells=[];
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
    footCells.push([x+dx,y-1,z+dz]);
    for(let dy=0;dy<2;dy++)bodyCells.push([x+dx,y+dy,z+dz]);
   }
   checks.push({
    id:wing.wing+'-'+stop.name,wing:wing.wing,kind:stop.name,
    order:i,localStanding:stop.standing,localFloorCells:footCells,
    localBodyClearanceCells:bodyCells,
    localCellsPerFloor:4,headClearanceCells:8,
    worldCoordinates:null,
    observedMinecraftBlockId:null,
    observedBlockStates:null,
    observedCollisionBoxes:null,
    actualPlayerMovement:null,
    measuredByRealGame:false,
    claim:'LOCAL_DESIGN_TARGET_NOT_A_WORLD_COORDINATE'
   });
  }
 }
 const core={
  schema:SCHEMA,sourceModelId:SOURCE_ID,
  pinnedSourceSha256:KNOWN_B166_SOURCE_SHA256,
  pinnedGeometrySha256:KNOWN_B166_GEOMETRY_SHA256,
  editionTarget:'Minecraft Education',targetRelease:'26.3 (unverified)',
  coordinateFrame:'LOCAL_DESIGN_ONLY',worldCoordinateTransform:null,
  requiredRealWorldAnchorCalibration:true,wingCount:2,
  checkpointCount:18,checkpoints:checks,
  labelsAreNotMinecraftBlockStates:true,
  expectedLiveWorldToMatchDesign:false,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0,BuildPlan:{operations:[]}
 };
 return {...core,sha256:SHA(core)};
}
export function verifyProbePacket(packet){
 try{
  return eq(makeProbePacket(),packet)&&packet.checkpoints.length===18&&
   packet.checkpoints.every(c=>c.worldCoordinates===null&&
    c.measuredByRealGame===false&&pt(c.localStanding))&&
   packet.gates.every(g=>g==='BLOCKED')&&
   packet.BuildPlan.operations.length===0&&packet.worldWrites===0;
 }catch{return false}
}
/**
 * Import observations **without** elevating them to true verified game
 * state. Actual observation record has no authority to grant construction,
 * change model voxels, resolve the local→world coordinate transform, or
 * certify player movement. Optional worldXYZ is just unverified metadata.
 */
export function reviewProbeSubmission(packet,submission){
 assert(verifyProbePacket(packet),'PACKET_TAMPERED');
 assert(submission&&typeof submission==='object'&&
  !Array.isArray(submission),'SUBMISSION_SCHEMA');
 const forbidden=[
  'constructionApproved','worldWrites','BuildPlan','gates',
  'readiness','physicsCertified','playerCollisionCertified',
  'worldContacts','fullyVerified','realWorldTransformCertified',
  'worldCoordinateTransform','minecraftCommands'];
 for(const field of forbidden)assert(!(field in submission),
  'UNTRUSTED_AUTHORITY_FIELD_'+field);
 assert(submission.packetSha256===packet.sha256,'STALE_PACKET');
 assert(Array.isArray(submission.observations)&&
  submission.observations.length<=18,'OBSERVATION_LIST');
 const refs=new Set(packet.checkpoints.map(x=>x.id));
 const seen=new Set(),reviewed=[];
 for(const o of submission.observations){
  assert(o&&typeof o==='object'&&!Array.isArray(o),'OBSERVATION_OBJECT');
  const allowed=[
   'checkpointId','blockId','facing','verticalHalf','stairShape',
   'captureMethod','minecraftVersion','worldXYZ',
   'movementOutcome','evidenceNote','observedAt'];
  assert(Object.keys(o).every(k=>allowed.includes(k)),'EXTRA_FIELD');
  assert(typeof o.checkpointId==='string'&&refs.has(o.checkpointId)&&
   !seen.has(o.checkpointId),'UNKNOWN_OR_DUPLICATE_CHECKPOINT');
  seen.add(o.checkpointId);
  assert(o.blockId===null||
   (typeof o.blockId==='string'&&
    /^[a-z0-9_]+:[a-z0-9_./-]{1,70}$/.test(o.blockId)),
   'BLOCK_ID_FORMAT');
  assert(['unknown','north','south','east','west'].includes(o.facing),
   'FACING');
  assert(['unknown','top','bottom','double'].includes(o.verticalHalf),
   'VERTICAL_HALF');
  assert(['unknown','straight','inner_left','inner_right',
   'outer_left','outer_right'].includes(o.stairShape),'STAIR_SHAPE');
  assert(['manual_observation','external_readonly_import','example_only']
   .includes(o.captureMethod),'MEASUREMENT_PROVENANCE');
  assert(typeof o.minecraftVersion==='string'&&
   o.minecraftVersion.length<=55,'MINECRAFT_VERSION');
  assert(o.worldXYZ===null||worldPt(o.worldXYZ),'WORLD_COORDINATES');
  assert(['not_tested','observed_pass','observed_fail'].includes(o.movementOutcome),
   'MOVEMENT_VALUE');
  assert(typeof o.evidenceNote==='string'&&o.evidenceNote.length<=320,
   'EVIDENCE_NOTE_LENGTH');
  assert(o.observedAt===null||
   (typeof o.observedAt==='string'&&
    /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(o.observedAt)&&
    Number.isFinite(Date.parse(o.observedAt))),
   'OBSERVATION_TIME');
  const hasState=o.blockId!==null&&o.facing!=='unknown'&&
   o.verticalHalf!=='unknown'&&o.stairShape!=='unknown';
  // Full evidence requires grounding of EXACT block ID, orientation, world
  // coordinate and capture provenance, not just a user-entered "passed".
  const hasLocation=o.worldXYZ!==null&&o.observedAt!==null&&
   o.captureMethod!=='example_only';
  reviewed.push({
   checkpointId:o.checkpointId,recordSha256:SHA(o),
   classification:hasState&&hasLocation?
    'STATE_RECORDED_UNAUTHENTICATED':'PARTIAL_OR_SYNTHETIC',
   blockId:o.blockId,hasBlockState:hasState,hasWorldLocation:hasLocation,
   captureMethod:o.captureMethod,
   movementOutcome:o.movementOutcome,
   actualGameReadingAttested:false,
   minecraftPhysicsCertified:false
  });
 }
 const complete=reviewed.filter(x=>
  x.classification==='STATE_RECORDED_UNAUTHENTICATED').length;
 const core={
  schema:'minecraftaibuilder-b170-observation-review-v1',
  pinnedProbePacketSha256:packet.sha256,
  pinnedOriginalGeometrySha256:packet.pinnedGeometrySha256,
  reviewedRecords:reviewed,reviewedCount:reviewed.length,
  completeButUnauthenticatedCount:complete,
  requiredCount:packet.checkpointCount,
  missingCheckpointIds:packet.checkpoints.map(x=>x.id)
   .filter(id=>!seen.has(id)),
  stage:reviewed.length===0?'UNOBSERVED':
   complete===18?'COMPLETE_USER_SUPPLIED_UNAUTHENTICATED':
   'PARTIAL_USER_SUPPLIED_UNAUTHENTICATED',
  clientRuntimeVerified:false,actualBlockStatesCertified:false,
  realWorldLocationCertified:false,minecraftPhysicsCertified:false,
  constructionApproved:false,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 return {...core,sha256:SHA(core)};
}
export function verifyObservationReview(packet,submission,review){
 try{
  return eq(reviewProbeSubmission(packet,submission),review)&&
   review.constructionApproved===false&&review.gates.every(v=>v==='BLOCKED')&&
   review.BuildPlan.operations.length===0;
 }catch{return false}
}
