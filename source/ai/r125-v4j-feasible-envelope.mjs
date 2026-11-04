/**
 * Opt-in V4 (NOT production): mathematically feasible authoring envelope.
 *
 * V2/V3 real Qwen both produced MASSING_PRIMARY_VOLUME_TOO_SMALL on housing.
 * This bounds the OPTIONS OFFERED TO THE ORIGINAL MODEL; never adjusts the
 * returned JSON or repositions rooms. All other structural/ART gates remain.
 * Cost: reduces the allowed massing-cut range from 7..10 to 7..8 and
 * increases min COVERED room footprint from 18 to 22; this is intentional,
 * localized to this research variant, and must be judged against aesthetic
 * diversity, not blindly promoted to production.
 */
import {V4J_STRUCTURED_CIVIC_JSON_SCHEMA,V4J_STRUCTURED_SYSTEM_PROMPT}
 from './r125-v4j-structured-author-schema.mjs';

export const V4J_ENVELOPE_PROTOCOL='V4J_SINGLE_RESPONSE_FEASIBLE_MASSING_V4';
export const V4J_ENVELOPE_BOUNDS=Object.freeze({
 coveredMin:22,coveredMax:30,cutMin:7,cutMax:8
});
const {coveredMin,coveredMax,cutMin,cutMax}=V4J_ENVELOPE_BOUNDS;
const schema=structuredClone(V4J_STRUCTURED_CIVIC_JSON_SCHEMA);
const covered=schema.properties.spaces.items.oneOf.find(x=>x.properties.kind.enum[0]==='covered');
if(!covered)throw Error('V4J_V4_COVERED_SCHEMA_MISSING');
covered.properties.width={type:'integer',minimum:coveredMin,maximum:coveredMax};
covered.properties.depth={type:'integer',minimum:coveredMin,maximum:coveredMax};
schema.properties.massing.properties.cutWidth={
 type:'integer',minimum:cutMin,maximum:cutMax
};
schema.properties.massing.properties.cutDepth={
 type:'integer',minimum:cutMin,maximum:cutMax
};
// Machine-check the envelope itself. No assumptions about generated room IDs.
if(coveredMin<2*cutMax+6||coveredMax>30||cutMin<7||
 schema.properties.spaces.items.oneOf[1].properties.width.minimum!==18)
 throw Error('V4J_V4_FEASIBILITY_SCHEMA_INVARIANT');
export const V4J_ENVELOPE_CIVIC_SCHEMA=schema;
export const V4J_ENVELOPE_RESPONSE_FORMAT={
 type:'json_schema',json_schema:{
  name:'v4j_feasible_author_v4',strict:true,schema
 }
};
export const V4J_ENVELOPE_SYSTEM_PROMPT=[
 V4J_STRUCTURED_SYSTEM_PROMPT,
 'V4 AUTHOR-OWNED FEASIBLE ENVELOPE: every covered space has width/depth 22..30. Choose YOUR own footprints, arrangement, functional spaces, roof and material aesthetics. The massing cutWidth/cutDepth must each be integer 7..8. This is a study-only range to ensure ANY covered room has width >= 2*cutWidth+6 and depth >= 2*cutDepth+6. NEVER choose sky space as massing.spaceId.',
 'These boundaries do not resolve arbitrary source collisions. Design nonoverlapping spatial relationships without host relocation; avoid placing two child spaces on the same physical parent side and verify that no pair of rooms has area overlap in both x and z. The still-frozen source compiler decides actual validity, not this prompt or schema.',
 'V4 GRAPH_ENTRY source condition: the FIRST covered space is the public north-entry reception. The NORTH face of spaces[0] is reserved for the original external public entrance and its forecourt. Never attach ANY later space directly to spaces[0].id with attach.side="north". Choose your own meaningful arrangement via east, west or south of that first space or use another earlier parent; no host redirection or hidden repair. A room linked to the first space on its north side makes the frozen graph compiler reject GRAPH_ENTRY even when massing dimensions fit.',
 'V4 RELATIVE PLAN CHECK (research-only, no geometry template): the generic compiler anchors the first space at local x=48,z=42. An east child starts at parent.x+parent.width-1; a west child at parent.x-child.width+1; a south child at parent.z+parent.depth-1; a north child at parent.z-child.depth+1. On the perpendicular axis it centers the child using floor((parentSize-childSize)/2)+attach.shift (shift -3..3). Each declared link must have a single shared boundary cell and >=7 cells of contact along the side. Check the actual rectangles of EVERY pair: no pair may overlap by more than one cell in BOTH axes; do not put two overlapping children on one parent side. These are the existing frozen generic SOURCE constraints, not design choices made by the HOST. Choose your own non-colliding creative topology before output; failed original JSON is never silently moved or repaired.',
 'FINAL ROOT-ENTRY CHECK BEFORE ONE ORIGINAL JSON: set rootId=spaces[0].id. For EVERY later spaces[i], inspect its original attach.to and attach.side. If attach.to equals rootId AND attach.side is north, this plan is invalid because the root NORTH facade belongs to the public entrance. Choose a different original, author-owned topology BEFORE sending your one JSON; do not ask the HOST to relocate any room, and do not produce a follow-up correction. A north attachment on a NONROOT parent is not automatically forbidden: it must satisfy the actual frozen graph and all-room overlap checks. Preserve creative massing, functions, materials and room purposes. Perform this exact root-side check even if every JSON field and massing dimension is valid.',
 'One original JSON. If you cannot design a valid building inside these constraints, do not claim B143 success or architectural ART pass. No model follow-up, paid API, or world write.'
].join('\n');
