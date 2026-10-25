/**
 * R139 future LOCAL model reply boundary: one response jointly chooses
 * functional zones, furnished objects and their actual spatial relationship.
 * An added "relations" field is NEW model output; old saved R136 captures
 * have no such field and must never be labelled model-authored relations.
 */
import {parseR135FreshFurnishedReply}
 from './r135-furnished-program.mjs';
import {SCHEMA,deriveR139RelationalTopology}
 from '../source/ai/r139-room-relations.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {createHash} from 'node:crypto';

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
 'directAdjacencies is an array of 0, 1 or 2 pairs of distinct existing room ids.',
 'These pairs mean DIRECT 2-wide openings between rooms, not connections via hall.',
 'Pairs must not share a room. With three rooms choose at most one pair.',
 'Do not use genre templates, coordinates, hidden code or Minecraft commands.',
 'The host validates feasible geometry and will reject incompatible graphs.'
].join('\n');

export function parseR139RelationalFurnishedReply(raw,request){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('MISSING_OR_OVERSIZED_MODEL_REPLY');
 let reply;
 try{reply=JSON.parse(raw);}catch{fail('NOT_JSON');}
 const keys=['id','title','footprint','materials','layout','form',
  'objects','relations'];
 if(!only(reply,keys)||!only(reply.relations,
  ['entryFacingZoneId','directAdjacencies']))
  fail('FULL_REPLY_CONTRACT');
 const {relations,...originalReply}=reply;
 // Existing R135 validates objects, roles and ALL original room semantics.
 // No category-dependent fallback or prompt-to-room-name guess is used.
 const prior=parseR135FreshFurnishedReply(JSON.stringify(originalReply),request);
 const semanticIntent={
  schema:SCHEMA,basePlanSha256:prior.base.planSha256,
  entryFacingZoneId:relations.entryFacingZoneId,
  directAdjacencies:relations.directAdjacencies
 };
 const relational=deriveR139RelationalTopology(prior.base,semanticIntent);
 const featured=applyR125FeatureIntent({base:relational,intent:{
  schema:ASSEMBLED_SCHEMA,basePlanSha256:relational.planSha256,
  objects:prior.objectRolesChosenByModel.map(x=>({...x,detail:'assembled'}))
 }});
 if(featured.sourceRouteAudit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !featured.everyFeatureSourceAccessible)
  fail('FURNISHED_SOURCE_ROUTES');
 return {
  schema:'r139-one-reply-room-graph-and-furniture-v1',
  originalRawSha256:sha(raw),sourceModelReplyRaw:raw,
  modelReplyAuthenticity:'CALLER_PROVIDED_UNVERIFIED',
  authoredFields:['layout.spaces','objects','relations'],
  semanticIntent,
  originalSequentialBase:prior.base,
  relationalBase:relational,featured,
  derivedSourceSha256:featured.sourceSha256,
  derivedGeometrySha256:featured.geometrySha256,
  modelCallsDuringParsing:0,
  hostGeneratedGeometry:true,
  aestheticStatus:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0
 };
}
