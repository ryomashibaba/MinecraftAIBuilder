/**
 * R146 one-field, exact-value recovery for a model confusing material and
 * roof profile. The original raw response NEVER changes. No heuristics about
 * building genres, geometry, rooms, equipment, model links, or extra calls.
 *
 * Accept ONLY materials.roof === form.roofProfile and that token is a known
 * roof *shape* (not a roof material). Use the already model-selected wall
 * material as host replacement and mark it unambiguously HOST DERIVED.
 */
import {createHash} from 'node:crypto';
const materials=new Set(['wood','stone','concrete','metal']);
const profiles=new Set(['flat','ridge','sawtooth']);
export function recoverR146RoofProfileAsMaterial(raw,reply){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000||
  !reply||Array.isArray(reply)||typeof reply!=='object'||
  typeof reply.materials!=='object'||reply.materials===null||
  typeof reply.form!=='object'||reply.form===null)
  throw Error('R146_ROOF_INVALID_INPUT');
 const original=reply.materials.roof,wall=reply.materials.wall;
 if(materials.has(original))return {
  derivedReply:structuredClone(reply),
  evidence:{
   schema:'r146-exact-roof-material-boundary-v1',
   rawSha256:createHash('sha256').update(raw).digest('hex'),
   originalRawPreserved:true,repairActions:[],hostRepairRequired:false,
   modelRoomGraphUnmodified:true,modelEquipmentUnmodified:true,
   modelCalls:0,worldWrites:0
  }
 };
 if(!profiles.has(original)||reply.form.roofProfile!==original||
  !materials.has(wall))
  throw Error('R146_ROOF_AMBIGUOUS_OR_UNSUPPORTED');
 const derived=structuredClone(reply);
 derived.materials.roof=wall;
 return {
  derivedReply:derived,
  evidence:{
   schema:'r146-exact-roof-material-boundary-v1',
   rawSha256:createHash('sha256').update(raw).digest('hex'),
   originalRawPreserved:true,
   hostRepairRequired:true,
   repairActions:[{
    code:'EXACT_ROOF_SHAPE_IN_MATERIAL_FIELD',
    field:'materials.roof',
    originallyModelAuthored:original,
    derivedByHost:wall,
    method:'copy existing model-selected wall material',
    preservedRoofProfile:derived.form.roofProfile
   }],
   modelRoomGraphUnmodified:
    JSON.stringify(derived.relations)===JSON.stringify(reply.relations)&&
    JSON.stringify(derived.layout)===JSON.stringify(reply.layout),
   modelEquipmentUnmodified:
    JSON.stringify(derived.objects)===JSON.stringify(reply.objects),
   modelCalls:0,worldWrites:0
  }
 };
}
