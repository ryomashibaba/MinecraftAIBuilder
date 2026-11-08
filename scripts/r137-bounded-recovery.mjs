/**
 * R137: bounded, *provenance-labelled*, deterministic recovery of a real
 * model's short architectural IR. Fix only two sharply identified host/model
 * boundary mistakes, never invent rooms, roles, layouts or new creativity.
 *
 * - clear roof-profile-as-material confusion -> wall material, only if the
 *   exact profile token was duplicated in materials.roof;
 * - axis size increases by integer cells WITHIN requested site to physically
 *   accommodate the model's unchanged actual room/equipment plan.
 *
 * The raw model response is retained byte-for-byte and SHA-pinned.
 */
import {createHash} from 'node:crypto';
import {parseR134FreshModelReply} from './r134-fresh-model-pilot.mjs';
export const SCHEMA='minecraftaibuilder-r137-bounded-recovery-v1';
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const refuse=code=>{throw Error('R137_RECOVERY_'+code);};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const dimensions={
 'work-surface':[5,3],'equipment-bank':[5,2],
 'display-stand':[5,2],'storage-rack':[5,2],'seating':[4,3]
};
const roofMaterials=new Set(['concrete','wood','stone','metal']);
const profiles=new Set(['flat','ridge','sawtooth']);
function roomNeeds(answer,base){
 const needs=new Map(base.program[0].zones.map(z=>[z.id,{x:0,z:0}]));
 for(const o of answer.objects){
  const size=dimensions[o.role];
  if(!size||!needs.has(o.zoneId))return {status:'UNSUPPORTED_ROLE_OR_ZONE'};
  const n=needs.get(o.zoneId);
  n.x=Math.max(n.x,size[0]+2);
  n.z=Math.max(n.z,size[1]+2);
 }
 const shortages=[];
 for(const z of base.program[0].zones){
  const n=needs.get(z.id);
  for(const axis of ['x','z']){
   const span=z.range[axis][1]-z.range[axis][0]+1;
   if(span<n[axis])shortages.push({
    zone:z.id,axis,minimumClearCells:n[axis],actualClearCells:span});
  }
 }
 return {status:shortages.length?'ROOM_EQUIPMENT_CLEARANCE_SHORTAGE':'CLEARANCE_PREFLIGHT_OK',
  shortages};
}
export function recoverR137Furnished({raw,request,build}={}){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000||
  typeof build!=='function'||request?.site===undefined)
  refuse('MISSING_INPUT');
 let proposed;
 try{proposed=JSON.parse(raw);}catch{refuse('RAW_NOT_JSON');}
 const planKeys=['id','title','footprint','materials','layout','form','objects'];
 if(!exact(proposed,planKeys)||!exact(proposed.materials,['floor','wall','roof'])||
  !exact(proposed.footprint,['width','depth'])||
  !exact(proposed.layout,['axis','spaces'])||
  !['x','z'].includes(proposed.layout.axis)||
  !Array.isArray(proposed.layout.spaces)||
  ![3,4].includes(proposed.layout.spaces.length)||
  !Array.isArray(proposed.objects)||!proposed.objects.length||
  proposed.objects.length>8)refuse('INVALID_INPUT_FORMAT');
 const original=structuredClone(proposed),roof=proposed.materials.roof,
  wall=proposed.materials.wall;
 const repairs=[];
 if(!roofMaterials.has(roof)){
  if(!profiles.has(roof)||proposed.form?.roofProfile!==roof||
   !roofMaterials.has(wall))
   refuse('ROOF_NOT_SAFELY_RECOVERABLE');
  proposed.materials.roof=wall;
  repairs.push({code:'ROOF_PROFILE_USED_AS_MATERIAL',
   field:'materials.roof',original:roof,revised:wall,
   basis:'same value already present in form.roofProfile; use valid wall material'});
 }
 const axis=proposed.layout.axis;
 const axisKey=axis==='x'?'width':'depth';
 const oldLength=proposed.footprint[axisKey];
 const siteMax=request.site[axis==='x'?'maxWidth':'maxDepth'];
 const rooms=proposed.layout.spaces.length;
 const absoluteMinimum=5*rooms+3;
 if(!Number.isSafeInteger(oldLength)||oldLength<18||oldLength>32||
  !Number.isSafeInteger(siteMax)||siteMax<18||siteMax>32||
  !Number.isSafeInteger(proposed.footprint[axis==='x'?'depth':'width'])||
  oldLength>siteMax||absoluteMinimum>siteMax)
  refuse('SITE_OR_AXIS_UNRECOVERABLE');
 const attempts=[];
 for(let length=Math.max(oldLength,absoluteMinimum);length<=siteMax;length++){
  proposed.footprint[axisKey]=length;
  const source=Object.fromEntries(['id','title','footprint','materials','layout','form']
   .map(k=>[k,proposed[k]]));
  let base;
  try{
   base=parseR134FreshModelReply(JSON.stringify(source),request);
  }catch(e){
   attempts.push({axisSize:length,stage:'BASE_SOURCE',reason:String(e.message).slice(0,140)});
   // Only an obviously insufficient physical envelope may be expanded.
   if(!String(e.message).includes('FOOTPRINT_TOO_SMALL_FOR_ROOM_COUNT'))throw e;
   continue;
  }
  const clearance=roomNeeds(proposed,base);
  if(clearance.status!=='CLEARANCE_PREFLIGHT_OK'){
   attempts.push({axisSize:length,stage:'EQUIPMENT_CLEARANCE',
    reason:clearance.status,shortages:clearance.shortages});
   if(clearance.status==='UNSUPPORTED_ROLE_OR_ZONE')
    refuse('INVALID_MODEL_ROLE_OR_ZONE');
   continue;
  }
  let result;
  try{result=build(JSON.stringify(proposed),request);}
  catch(e){
   attempts.push({axisSize:length,stage:'FURNISHED_SOURCE',
    reason:String(e.message).slice(0,170)});
   // A larger footprint may fix a physically impossible piece placement.
   if(!String(e.message).startsWith('R125_FEATURE_NO_SAFE_PLACEMENT_'))
    throw e;
   continue;
  }
  if(length!==oldLength)repairs.push({
   code:'INSUFFICIENT_AXIS_LENGTH_FOR_USABLE_ROOMS_AND_EQUIPMENT',
   field:'footprint.'+axisKey,original:oldLength,revised:length,
   boundedBySiteMaximum:siteMax});
  const evidence={
   schema:SCHEMA,modelOriginalRawSha256:hash(raw),
   originalModelJSONPreserved:true,
   modelAuthoredRoomIdsAndPurposesUnchanged:
    JSON.stringify(original.layout.spaces)===JSON.stringify(proposed.layout.spaces),
   modelAuthoredEquipmentIntentsUnchanged:
    JSON.stringify(original.objects)===JSON.stringify(proposed.objects),
   worldWrites:0,modelCalls:0,
   derivedFootprint:structuredClone(proposed.footprint),
   boundedHostRepairRequired:repairs.length>0,
   repairActions:repairs,attempts,
   originalProgramInvalidOrInfeasible:repairs.length>0,
   independentAestheticApproval:false,
   originalUnmodifiedSourceWasSuccessfullyBuilt:false,
   derivedCodeProvenance:'SAVED_LOCAL_MODEL_RAW_PLUS_EXPLICIT_BOUNDED_HOST_GEOMETRY_CORRECTION'
  };
  return {result,evidence,derivedReply:structuredClone(proposed)};
 }
 refuse('NO_SAFE_FURNISHED_CANDIDATE_WITHIN_SITE');
}
