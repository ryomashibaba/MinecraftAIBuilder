/**
 * Research-only: one Ollama-local constrained JSON response per genre.
 * No genre templates, no host modification of model answer, no SOURCE/ART pass.
 * The schema enforces field shape; geometry, routes, massing, functionality
 * and Minecraft safety still MUST pass frozen genuine compilers independently.
 */
import {CIVIC_ARCADE_SCHEMA}
 from './r125-v4j-civic-author-ir.mjs';
import {V4J_PRECISION_SYSTEM_PROMPT}
 from './r125-v4j-precision-prompt.mjs';

export const V4J_STRUCTURED_PROTOCOL='V4J_SINGLE_RESPONSE_SCHEMA_GUIDED_V3';
const integer=(minimum,maximum)=>({type:'integer',minimum,maximum});
const string=(minimum=3,maximum=150)=>({type:'string',minLength:minimum,maxLength:maximum});
const enumeration=(...values)=>({enum:values});
const object=props=>({type:'object',properties:props,
 required:Object.keys(props),additionalProperties:false});
const slug={type:'string',minLength:3,maxLength:35,
 pattern:'^[a-z][a-z0-9-]{2,34}$'};
const directions=['north','east','south','west'];
const materials=object({
 floor:enumeration('wood','stone','concrete'),
 wall:enumeration('wood','stone','concrete','metal'),
 roof:enumeration('wood','stone','concrete','metal'),
 public:enumeration('stone','concrete','accent')
});
const attach=object({
 to:slug,side:enumeration(...directions),shift:integer(-3,3)
});
const space=(covered)=>object({
 id:slug,purpose:string(),kind:enumeration(covered?'covered':'sky'),
 width:integer(18,30),depth:integer(18,30),
 roof:covered?enumeration('ridgeX','ridgeZ','shedX','shedZ'):enumeration(null),
 height:covered?enumeration('low','medium','high'):enumeration(null),
 facade:covered?enumeration('glass','wall'):enumeration(null),
 windowPriority:covered?{type:'array',items:enumeration(...directions),
  minItems:4,maxItems:4,uniqueItems:true}:enumeration(null),
 feature:string(),featureMaterial:enumeration('wood','stone','metal','concrete','accent'),
 attach:{anyOf:[{type:'null'},attach]}
});
export const V4J_STRUCTURED_CIVIC_JSON_SCHEMA=object({
 schema:enumeration(CIVIC_ARCADE_SCHEMA),id:slug,title:string(),
 brief:string(),materials,
 spaces:{type:'array',minItems:3,maxItems:5,
  items:{oneOf:[space(true),space(false)]}},
 massing:object({
  spaceId:slug,corner:enumeration('NW','NE','SW','SE'),
  cutWidth:integer(7,10),cutDepth:integer(7,10),
  publicAccessSide:enumeration('X','Z')
 }),
 wing:object({
  spaceId:slug,side:enumeration(...directions),
  start:integer(3,12),span:integer(10,18),reach:integer(6,9),
  roofY:enumeration(8,9),purpose:string()
 }),
 floorplate:object({
  spaceId:slug,corner:enumeration('NW','NE','SW','SE'),
  width:integer(6,8),depth:integer(6,8)
 }),
 atrium:object({
  spaceId:slug,offsetX:integer(3,7),offsetZ:integer(3,7),
  width:integer(10,16),depth:integer(10,16),
  lift:integer(7,11),roofForm:enumeration('ridgeX','ridgeZ','shedX','shedZ')
 }),
 mezzanine:object({
  side:enumeration('north','south'),
  stairLane:enumeration('west','east'),deckOffsetX:integer(1,3),
  deckWidth:integer(8,10),rise:integer(6,8),purpose:string(12,140)
 }),
 arcade:object({
  width:enumeration(12,15),depth:integer(3,5),setback:integer(0,1),
  roofline:{type:'array',items:integer(8,12),minItems:3,maxItems:3},
  postMaterial:enumeration('wood','stone','concrete','metal','accent'),
  roofMaterial:enumeration('wood','stone','concrete','metal'),
  serviceMaterial:enumeration('wood','stone','concrete','metal','accent'),
  purpose:string(12,160)
 })
});
export const V4J_STRUCTURED_RESPONSE_FORMAT={
 type:'json_schema',
 json_schema:{name:'v4j_original_civic_author',strict:true,
  schema:V4J_STRUCTURED_CIVIC_JSON_SCHEMA}
};
export const V4J_STRUCTURED_SYSTEM_PROMPT=[
 V4J_PRECISION_SYSTEM_PROMPT,
 'V3 SOURCE feasibility guard. Choose YOUR OWN genre-appropriate footprint and massing. Before output verify by arithmetic: the target covered room width >= 2*cutWidth+6 AND depth >= 2*cutDepth+6. If cutWidth is 10, the target room width must be at least 26; if width is 18, cutWidth 7 is impossible. Do not assume the HOST will shrink the mass or change room IDs.',
 'For spatial relationships: position each attached room on its parent side with shift -3..3, ensure any pair of unrelated room footprints does not overlap in BOTH horizontal axes. Avoid two children occupying the same parent side; check every new room against ALL earlier rooms, not only its parent. Preserve a continuous two-wide entry circulation path. The HOST never repositions a room.',
 'The attached JSON schema constrains types, object keys and enums only; it CANNOT prove room references, massing fit, collision freedom, actual B143 construction, safe circulation, design excellence or Minecraft construction approval. Choose independent functionality and exterior massing for the USER BRIEF. Return one original JSON, no explanation; no silent repair, no extra call.'
].join('\n');
