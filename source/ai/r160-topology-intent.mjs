/** R160 independent spatial topology choice; other unused style choices absent. */
import {validateR151EnvelopeIntent}
 from './r149-architectural-expression.mjs';
export const R160_TOPOLOGY_SCHEMA='minecraftaibuilder-r160-topology-ir-v1';
export const R160_TOPOLOGIES=Object.freeze([
 'central-spine','west-gallery','east-gallery'
]);
export function r160ToR151(ir){
 if(!ir||typeof ir!=='object'||Array.isArray(ir))throw Error('R160_INVALID_IR');
 const {spatialTopology,...base}=ir;
 return {...base,schema:'minecraftaibuilder-r151-envelope-intent-v1'};
}
export function validateR160TopologyIntent(ir){
 const fields=['schema','entryHierarchy','daylightStrategy','roofEdge','spatialTopology'];
 if(!ir||typeof ir!=='object'||Array.isArray(ir)||
  Object.keys(ir).length!==fields.length||
  !fields.every(k=>Object.hasOwn(ir,k))||
  ir.schema!==R160_TOPOLOGY_SCHEMA||
  !R160_TOPOLOGIES.includes(ir.spatialTopology))
  throw Error('R160_STRICT_TOPOLOGY_IR');
 try{validateR151EnvelopeIntent(r160ToR151(ir));}
 catch{throw Error('R160_STRICT_ENVELOPE_IR');}
 return true;
}
