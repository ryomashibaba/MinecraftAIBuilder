/** Strict opt-in R159 2-axis spatial choice; no geometry or world actions. */
import {R158_SCHEMA,validateR158SpatialBalanceIntent,toR155RoofIntent}
 from './r158-spatial-balance.mjs';
export const R159_SCHEMA='minecraftaibuilder-r159-floorplan-ir-v1';
export function toR158FromR159(ir){
 if(!ir||Array.isArray(ir)||typeof ir!=='object')
  throw Error('R159_INVALID_IR');
 const {depthBalance,...old}=ir;
 return {...old,schema:R158_SCHEMA};
}
export function toR155FromR159(ir){
 return toR155RoofIntent(toR158FromR159(ir));
}
export function validateR159FloorplanIntent(ir){
 const fields=['schema','entryHierarchy','daylightStrategy','roofEdge',
  'volumeHierarchy','arrivalSpace','roofSilhouette','spatialBalance','depthBalance'];
 if(!ir||Array.isArray(ir)||typeof ir!=='object'||
  Object.keys(ir).length!==fields.length||
  !fields.every(k=>Object.hasOwn(ir,k))||ir.schema!==R159_SCHEMA||
  !['balanced','front-deep','rear-deep'].includes(ir.depthBalance))
  throw Error('R159_STRICT_FLOORPLAN_IR');
 try{validateR158SpatialBalanceIntent(toR158FromR159(ir));}
 catch{throw Error('R159_STRICT_R158_COMPATIBILITY');}
 return true;
}
