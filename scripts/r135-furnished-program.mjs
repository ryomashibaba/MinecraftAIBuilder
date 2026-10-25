/**
 * R135 one model-authored NEW multi-zone program plus meaningful equipment.
 * The model chooses purpose/room order, form, and semantic role per zone;
 * the trusted R134 + R130 compiler generates physical B143 geometry.
 * No fixed building-category dispatch, no Minecraft/world writes.
 */
import {parseR134FreshModelReply} from './r134-fresh-model-pilot.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
const fail=code=>{throw Error('R135_FURNISHED_'+code);};
const fields=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const ROLES=new Set([
 'work-surface','equipment-bank','display-stand','storage-rack','seating'
]);
const CORNERS=new Set(['near-left','near-right','far-left','far-right']);
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,20}$/.test(s);
/**
 * Validate model-selected objects independently of any particular physical
 * layout. R141 graph mode must NOT require legacy strip furnishing to succeed
 * before applying its own spatial layout; reuse exactly the same semantic
 * contract as the legacy R135 parser.
 */
export function validateR135SemanticObjects(objects,zoneIds){
 if(!Array.isArray(zoneIds)||zoneIds.length<3||zoneIds.length>4||
  new Set(zoneIds).size!==zoneIds.length||
  !Array.isArray(objects)||objects.length<3||objects.length>8)
  fail('SEMANTIC_OBJECT_OR_ZONE_COUNT');
 const seenIds=new Set(),representedZones=new Set();
 for(const o of objects){
  if(!fields(o,['id','zoneId','role','corner'])||
   !slug(o.id)||seenIds.has(o.id)||!zoneIds.includes(o.zoneId)||
   !ROLES.has(o.role)||!CORNERS.has(o.corner))
   fail('UNSUPPORTED_SEMANTIC_OBJECT');
  seenIds.add(o.id);
  representedZones.add(o.zoneId);
 }
 if(zoneIds.some(id=>!representedZones.has(id)))
  fail('FUNCTIONAL_ZONE_WITHOUT_PROPOSED_EQUIPMENT');
 return {objects:objects.map(o=>({...o})),
  physicallyRepresentedZoneCount:representedZones.size};
}

export function parseR135FreshFurnishedReply(raw,request){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('MODEL_OUTPUT_MISSING_OR_TOO_LARGE');
 let answer;
 try{answer=JSON.parse(raw);}catch{fail('MODEL_NOT_JSON');}
 const fieldsV1=['id','title','footprint','materials','layout','form'];
 if(!fields(answer,[...fieldsV1,'objects'])||
  !Array.isArray(answer.objects)||answer.objects.length<3||
  answer.objects.length>8)fail('OUTPUT_FIELDS_OR_COUNT');
 // The existing new-building compiler validates and creates genuine shell,
 // supported floors, physical partitions and source-reachable rooms.
 const originalProgram=Object.fromEntries(fieldsV1.map(k=>[k,answer[k]]));
 const base=parseR134FreshModelReply(JSON.stringify(originalProgram),request);
 const zones=base.program[0].zones.map(z=>z.id);
 const semantics=validateR135SemanticObjects(answer.objects,zones);
 const intent={
  schema:ASSEMBLED_SCHEMA,basePlanSha256:base.planSha256,
  objects:answer.objects.map(o=>({...o,detail:'assembled'}))
 };
 const featured=applyR125FeatureIntent({base,intent});
 if(!featured.everyFeatureSourceAccessible||
  featured.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !featured.immutableBaseGeometryProven||
  featured.placements.length!==answer.objects.length)
  fail('PHYSICAL_EQUIPMENT_OR_SOURCE_ROUTES');
 return {
  schema:'r135-real-furnished-geometry-v1',
  base,featured,intent,
  objectRolesChosenByModel:answer.objects.map(o=>({
   id:o.id,zoneId:o.zoneId,role:o.role,corner:o.corner})),
  physicallyRepresentedZoneCount:semantics.physicallyRepresentedZoneCount,
  originalShellSourceSha256:base.sourceSha256,
  furnishedSourceSha256:featured.sourceSha256,
  addedTrueB143Voxels:featured.addedVoxelCount,
  sourceRoutes:featured.sourceRouteAudit.status,
  modelProvenance:'FROM_CALLER_RESPONSE_UNAUTHENTICATED',
  artStatus:'NOT_REVIEWED',realMinecraftUse:'NOT_TESTED',
  worldWrites:0,constructionApproved:false,gates:Array(9).fill('BLOCKED')
 };
}
