/**
 * V4J opt-in ONE-response author owns entire building, upper public level
 * and exterior three-bay civic forecourt. No host style templates or repairs.
 * Genuine B143 SOURCE, not model identity, ART or world certification.
 */
import {createHash} from 'node:crypto';
import {MEZZANINE_SCHEMA,MEZZANINE_SYSTEM_PROMPT,
 compileMezzanineAuthorIntent} from './r125-v4h-mezzanine-author-ir.mjs';
import {compileAuthoredCivicApproachArcade}
 from '../../scripts/r125-v4j-civic-arcade.mjs';

export const CIVIC_ARCADE_SCHEMA='minecraftaibuilder-r125-v4j-civic-arcade-author-v1';
const fail=x=>{throw Error('R125_V4J_CIVIC_AUTHOR_'+x);};
const fields=['schema','id','title','brief','materials','spaces','massing',
 'wing','floorplate','atrium','mezzanine','arcade'];
const exact=(v,k)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===k.slice().sort().join('|');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

export function compileCivicArcadeAuthorIntent(untrusted){
 const original=structuredClone(untrusted);
 if(!exact(original,fields)||original.schema!==CIVIC_ARCADE_SCHEMA)
  fail('ONE_ORIGINAL_JSON_WITH_COMPLETE_PUBLIC_ARCHITECTURE');
 const {arcade,...mezzanineAuthor}=original;
 mezzanineAuthor.schema=MEZZANINE_SCHEMA;
 const base=compileMezzanineAuthorIntent(mezzanineAuthor);
 const newSource=compileAuthoredCivicApproachArcade(mezzanineAuthor,arcade);
 const w=newSource.sourceWitness,compiled=newSource.b143Compiled;
 if(newSource.priorGeometrySha256!==base.b143.geometrySha256||
  newSource.finalGeometrySha256!==compiled.geometrySha256||
  !w.losslessOriginalB143Packing?.realCompiledVoxelsIdentical||
  !w.entranceToNewPublicZone?.reachedFromEntrance||
  !w.preservedRealUpperPublicZone?.reachedFromEntrance||
  w.realPublicFloorContinuity?.width!==2||
  !w.allFunctionsReachable||
  newSource.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  newSource.sourceRoutes.zones.some(z=>!z.reachedFromEntrance)||
  newSource.sourceRoutes.featureAccess.some(f=>!f.reachableFromEntrance)||
  newSource.worldContacts!==0||newSource.worldWrites!==0||
  newSource.readiness!=='NOT_PREPARED'||
  newSource.constructionApproved!==false||
  newSource.executionAllowed!==false||
  newSource.gates.length!==9||
  newSource.gates.some(g=>g!=='BLOCKED')||
  newSource.BuildPlan.operations.length!==0)
  fail('TRUE_2_LEVEL_CIVIC_SOURCE_OR_WORLD_GATE_NOT_PROVEN');
 const b143={...base.b143,
  design:newSource.b143Design,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  program:newSource.b143Program,sourceRoutes:newSource.sourceRoutes,
  sourceProof:{...base.b143.sourceProof,
   authorOwnedCivicArcadeRealB143:w,
   independentVisualArt:'NOT_REVIEWED'}
 };
 return {...base,authorContract:CIVIC_ARCADE_SCHEMA,
  civicArcadeAuthorOriginal:original,
  civicArcadeAuthorSha256:hash(original),
  authoredArcade:structuredClone(arcade),
  authoredArcadeSourceWitness:w,
  unchangedMezzanineGeometrySha256:base.b143.geometrySha256,
  b143,sourceSha256:b143.sourceSha256,
  geometrySha256:b143.geometrySha256,
  provenance:'ONE_UNALTERED_MODEL_JSON_IDENTITY_NOT_AUTHENTICATED',
  realModel:'NOT_TESTED',humanArt:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0};
}

export const CIVIC_ARCADE_SYSTEM_PROMPT=[
 MEZZANINE_SYSTEM_PROMPT
  .replaceAll(MEZZANINE_SCHEMA,CIVIC_ARCADE_SCHEMA)
  .replaceAll('schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium,mezzanine',
   'schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium,mezzanine,arcade'),
 'In the SAME original JSON author an exterior usable public arcade with EXACT arcade keys width,depth,setback,roofline,postMaterial,roofMaterial,serviceMaterial,purpose.',
 'width must be 12 or 15; depth integer 3..5; setback 0..1. roofline is EXACTLY three integer heights 8..12 and cannot be all equal. Roof heights are original AUTHOR architectural decisions, not host style defaults.',
 'postMaterial and serviceMaterial: stone|wood|concrete|metal|accent; roofMaterial: stone|wood|concrete|metal. purpose: 12..160 chars describing real sheltered public work or service, not a decorative motif.',
 'Public forecourt is a SECOND, physically distinct external roof outside the existing entry canopy. Pick dimensions fitting the authored 3D public approach without touching ANY existing original voxel, entrance, genuine windows, stair or upper-level service. Host refuses overlap, obstructed two-wide routes and insufficient safe B143 budget; no model retry or silent auto-shrink.',
 'The three bays have real roof volume and physical paired support columns. TWO public service workpoints on both sides must remain reachable from the main entry with clear supported 2-wide floor and air.',
 'Architectural beauty, Minecraft walking, structural safety and model authenticity are NOT certified by B143 SOURCE. No world write or paid API. Return only one strict JSON with EXACT root keys '+fields.join(',')+'.'
].join('\n');
