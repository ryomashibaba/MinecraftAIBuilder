/** Opt-in R158 wing balance IR, explicitly projects into legacy R155 roof IR. */
import {validateR155RooflineIntent} from './r155-roofline.mjs';
export const R158_SCHEMA='minecraftaibuilder-r158-spatial-balance-ir-v1';
export function toR155RoofIntent(ir){
 if(!ir||typeof ir!=='object'||Array.isArray(ir))throw Error('R158_INVALID_IR');
 const {spatialBalance,...roof}=ir;
 return {...roof,schema:'minecraftaibuilder-r155-roofline-ir-v1'};
}
export function validateR158SpatialBalanceIntent(ir){
 const fields=['schema','entryHierarchy','daylightStrategy','roofEdge',
  'volumeHierarchy','arrivalSpace','roofSilhouette','spatialBalance'];
 if(!ir||typeof ir!=='object'||Array.isArray(ir)||
  Object.keys(ir).length!==fields.length||
  !fields.every(k=>Object.hasOwn(ir,k))||ir.schema!==R158_SCHEMA||
  !['balanced','left-wide','right-wide'].includes(ir.spatialBalance))
  throw Error('R158_STRICT_SPATIAL_IR');
 try{validateR155RooflineIntent(toR155RoofIntent(ir));}
 catch{throw Error('R158_STRICT_ROOFLINE_IR');}
 return true;
}
