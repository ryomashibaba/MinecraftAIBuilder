/**
 * R177: strict, category-neutral ground-outline choice supplied INSIDE
 * the same caller-provided design reply, not inferred from the room label.
 * The model/author chooses the rectangle and corner. Host still compiles
 * B143 voxels and may reject infeasible choices without silent substitution.
 */
import {validateR160TopologyIntent} from './r160-topology-intent.mjs';
export const R177_SCHEMA='minecraftaibuilder-r177-ground-outline-ir-v1';
const corners=Object.freeze(['front-west','front-east','rear-west','rear-east']);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function validateR177GroundIntent(ir){
 const keys=['schema','entryHierarchy','daylightStrategy','roofEdge',
  'spatialTopology','groundShape'];
 if(!exact(ir,keys)||ir.schema!==R177_SCHEMA)
  throw Error('R177_GROUND_IR_FIELDS');
 const {groundShape,...topology}=ir;
 validateR160TopologyIntent({...topology,
  schema:'minecraftaibuilder-r160-topology-ir-v1'});
 if(!exact(groundShape,['kind','corner','spanX','spanZ'])||
  groundShape.kind!=='open-corner-court'||
  !corners.includes(groundShape.corner)||
  !Number.isSafeInteger(groundShape.spanX)||
  !Number.isSafeInteger(groundShape.spanZ)||
  groundShape.spanX<3||groundShape.spanX>6||
  groundShape.spanZ<3||groundShape.spanZ>6)
  throw Error('R177_STRICT_CORNER_AND_EXTENTS');
 return true;
}
export function r177ToR160(ir){
 validateR177GroundIntent(ir);
 const {groundShape,...topology}=ir;
 return {...topology,schema:'minecraftaibuilder-r160-topology-ir-v1'};
}
export const R177_MODEL_INSTRUCTIONS=[
 'R177 is OPTIONAL: when enabled, output architecture with EXACTLY:',
 'schema, entryHierarchy, daylightStrategy, roofEdge, spatialTopology, groundShape.',
 'schema is minecraftaibuilder-r177-ground-outline-ir-v1.',
 'Keep the existing R160 architectural choices and room IDs.',
 'groundShape has EXACTLY kind, corner, spanX, spanZ.',
 'kind must be open-corner-court.',
 'corner: front-west, front-east, rear-west, rear-east (entrance is front).',
 'spanX and spanZ independently choose integers from 3 through 6.',
 'This requests a REAL uncovered outdoor corner removed from the ground floor.',
 'Choose a corner based on room function, entry and exterior use; do NOT copy',
 'an architectural style, use-type template, or assume the host can force it.',
 'The host must preserve accessible rooms and furnished objects; unsafe',
 'choices are rejected, never silently moved to another corner.',
 'Do not write coordinates, Minecraft commands, scripts or approvals.'
].join('\\n');
