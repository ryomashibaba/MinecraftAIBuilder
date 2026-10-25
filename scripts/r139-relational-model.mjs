/**
 * R139 future LOCAL model reply boundary: one response jointly chooses
 * functional zones, furnished objects and their actual spatial relationship.
 * An added "relations" field is NEW model output; old saved R136 captures
 * have no such field and must never be labelled model-authored relations.
 */
import {validateR135SemanticObjects}
 from './r135-furnished-program.mjs';
import {compileR134MultiZonePlan,SCHEMA as R134_SCHEMA}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {SCHEMA,deriveR139RelationalTopology}
 from '../source/ai/r139-room-relations.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {createHash} from 'node:crypto';
import {recoverR146RoofProfileAsMaterial}
 from '../source/ai/r146-roof-material-boundary.mjs';

const fail=x=>{throw Error('R139_MODEL_'+x);};
const only=(v,fields)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
const sha=x=>createHash('sha256').update(x).digest('hex');

/** Append to the R134/R135 instruction when requesting a NEW model run.
 * Exactly one explicit relations object; no invented coordinates.
 */
export const RELATIONAL_INSTRUCTIONS=[
 'Also output exactly one extra top-level key: relations.',
 'relations has EXACTLY entryFacingZoneId and directAdjacencies.',
 'entryFacingZoneId is an existing room id chosen for the entrance-facing row.',
 'directAdjacencies is an array of 1 or 2 pairs of distinct existing room ids.',
 'Your new design must demonstrate at least one genuine direct connection.',
 'These pairs mean DIRECT 2-wide openings between rooms, not connections via hall.',
 'Pairs must not share a room. With three rooms choose at most one pair.',
 'Do not use genre templates, coordinates, hidden code or Minecraft commands.',
 'The host validates feasible geometry and will reject incompatible graphs.'
].join('\n');

export function parseR139RelationalFurnishedReply(raw,request,
 {allowRoofMaterialCorrection=false}={}){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('MISSING_OR_OVERSIZED_MODEL_REPLY');
 let reply;
 try{reply=JSON.parse(raw);}catch{fail('NOT_JSON');}
 const keys=['id','title','footprint','materials','layout','form',
  'objects','relations'];
 if(!only(reply,keys)||!only(reply.relations,
  ['entryFacingZoneId','directAdjacencies']))
  fail('FULL_REPLY_CONTRACT');
 const repaired=allowRoofMaterialCorrection?
  recoverR146RoofProfileAsMaterial(raw,reply):{
   derivedReply:structuredClone(reply),evidence:{
    schema:'r146-exact-roof-material-boundary-v1',
    rawSha256:sha(raw),originalRawPreserved:true,
    hostRepairRequired:false,repairActions:[],modelCalls:0,worldWrites:0
   }
  };
 const {relations,...originalReply}=repaired.derivedReply;
 // Validate semantic room program FIRST, without furnishing the obsolete
 // strip. A valid spatial graph can have more usable equipment clearance
 // than a narrow linear strip; premature strip fitting gave false HOLDs.
 const {objects,...programReply}=originalReply;
 if(!only(programReply,['id','title','footprint','materials','layout','form'])||
  !request?.site||!programReply.footprint||
  programReply.footprint.width>request.site.maxWidth||
  programReply.footprint.depth>request.site.maxDepth)
  fail('PROGRAM_OR_SITE_CONTRACT');
 const base=compileR134MultiZonePlan({
  schema:R134_SCHEMA,...programReply,brief:request.naturalLanguageBrief
 });
 const semantics=validateR135SemanticObjects(objects,
  base.program[0].zones.map(z=>z.id));
 const semanticIntent={
  schema:SCHEMA,basePlanSha256:base.planSha256,
  entryFacingZoneId:relations.entryFacingZoneId,
  directAdjacencies:relations.directAdjacencies
 };
 const relational=deriveR139RelationalTopology(base,semanticIntent);
 const featured=applyR125FeatureIntent({base:relational,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:relational.planSha256,
  objects:semantics.objects.map(x=>({...x,detail:'assembled'}))
 }});
 if(featured.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !featured.everyFeatureSourceAccessible)
  fail('FURNISHED_SOURCE_ROUTES');
 return {
  schema:'r139-one-reply-room-graph-and-furniture-v1',
  originalRawSha256:sha(raw),sourceModelReplyRaw:raw,
  modelReplyAuthenticity:'CALLER_PROVIDED_UNVERIFIED',
  authoredFields:['layout.spaces','objects','relations'],
  derivedModelReply:repaired.derivedReply,
  boundedHostRepairRequired:repaired.evidence.hostRepairRequired,
  hostRepairActions:repaired.evidence.repairActions,
  roofMaterialBoundaryEvidence:repaired.evidence,
  semanticIntent,
  originalSequentialBase:base,
  relationalBase:relational,featured,
  derivedSourceSha256:featured.sourceSha256,
  derivedGeometrySha256:featured.geometrySha256,
  modelCallsDuringParsing:0,
  legacyStripFurnitureNotRequired:true,
  semanticEquipmentZoneCount:semantics.physicallyRepresentedZoneCount,
  hostGeneratedGeometry:true,
  aestheticStatus:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0
 };
}
