/**
 * V4H OPT-IN ONE-RESPONSE MODEL AUTHORSHIP FOR TRUE TWO-LEVEL PUBLIC USE.
 * The original author controls whole architecture, double-height hall,
 * loft side, stair lane and programme in exactly one JSON response.
 *
 * This is SOURCE-ONLY, not physical Minecraft walking or ART certification.
 */
import {createHash} from 'node:crypto';
import {HEIGHT_SCHEMA,HEIGHT_SYSTEM_PROMPT,compileHeightAuthorIntent}
 from './r125-v4g-height-author-ir.mjs';
import {compileAuthoredPublicMezzanine}
 from './r125-v4h-authored-mezzanine.mjs';
export const MEZZANINE_SCHEMA='minecraftaibuilder-r125-v4h-mezzanine-author-v1';
const fail=s=>{throw Error('R125_V4H_MEZZANINE_AUTHOR_'+s);};
// Compare actual field membership, not delimiter-joined names: an untrusted
// key like "id|massing" must never masquerade as two required author keys.
const exact=(v,fields)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===fields.length&&
 fields.every(field=>Object.hasOwn(v,field));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function compileMezzanineAuthorIntent(input){
 const raw=structuredClone(input);
 if(!exact(raw,['schema','id','title','brief','materials','spaces',
  'massing','wing','floorplate','atrium','mezzanine'])||
  raw.schema!==MEZZANINE_SCHEMA||
  !exact(raw.mezzanine,['side','stairLane','deckOffsetX','deckWidth','rise','purpose']))
  fail('ONE_COMPLETE_JSON_AND_EXPLICIT_FUNCTIONAL_LEVEL');
 const {mezzanine,...heightAuthor}=raw;
 heightAuthor.schema=HEIGHT_SCHEMA;
 const before=compileHeightAuthorIntent(heightAuthor);
 const upper=compileAuthoredPublicMezzanine(heightAuthor,mezzanine);
 const w=upper.sourceWitness;
 if(upper.originalGeometrySha256!==before.b143.geometrySha256||
  upper.finalGeometrySha256===before.b143.geometrySha256||
  upper.finalGeometrySha256!==upper.b143Compiled.geometrySha256||
  !Array.isArray(upper.b143Program)||upper.b143Program.length<2||
  !upper.b143Program.some(p=>p.level===1&&
   p.standingFloorY===mezzanine.rise+2)||
  w.physical2WideStairTreads!==mezzanine.rise+1||
  w.physicallySupportedUpperFloorCells!==3*mezzanine.deckWidth||
  w.physicalSupportingColumns!==4||
  w.connectedUpperProgram?.reachedFromEntrance!==true||
  w.connectedPublicService?.reachableFromEntrance!==true||
  w.connectedPublicService?.zoneId!==w.connectedUpperProgram?.id||
  w.physicalGlazingPreserved?.verifiedPanelGlassCells!==36||
  w.addedAboveGroundB143Cells<20||
  upper.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  upper.sourceRoutes.zones.some(z=>!z.reachedFromEntrance)||
  upper.sourceRoutes.featureAccess.some(f=>!f.reachableFromEntrance)||
  upper.worldContacts!==0||upper.worldWrites!==0||
  upper.readiness!=='NOT_PREPARED'||
  upper.executionAllowed!==false||upper.constructionApproved!==false||
  upper.BuildPlan.operations.length!==0||upper.gates.length!==9||
  upper.gates.some(g=>g!=='BLOCKED'))
  fail('REAL_UPPER_LEVEL_FUNCTION_OR_FROZEN_SAFETY_MISSING');
 const b143={...before.b143,
  design:upper.b143Design,compiled:upper.b143Compiled,
  sourceSha256:upper.b143Compiled.sourceSha256,
  geometrySha256:upper.b143Compiled.geometrySha256,
  program:upper.b143Program,sourceRoutes:upper.sourceRoutes,
  sourceProof:{...before.b143.sourceProof,
   physicallyConnectedAuthoredSecondLevel:w,
   physicallyConnectedUpperPublicEquipment:true,
   authorModelArtStatus:'NOT_REVIEWED'}
 };
 return {...before,
  authorContract:MEZZANINE_SCHEMA,
  mezzanineAuthorOriginal:raw,mezzanineAuthorSha256:hash(raw),
  authoredMezzanine:mezzanine,
  authoredMezzanineSourceWitness:w,
  unchangedAtriumGeometrySha256:before.b143.geometrySha256,
  b143,sourceSha256:b143.sourceSha256,geometrySha256:b143.geometrySha256,
  provenance:'ONE_ORIGINAL_COMPLETE_MODEL_JSON_REAL_IDENTITY_UNATTESTED',
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
}
export const MEZZANINE_SYSTEM_PROMPT=[
 HEIGHT_SYSTEM_PROMPT
  .replaceAll(HEIGHT_SCHEMA,MEZZANINE_SCHEMA)
  .replaceAll('schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium.',
   'schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium,mezzanine.'),
 'One architect, one original response, NO repairs: author mezzanine EXACT {side,stairLane,deckOffsetX,deckWidth,rise,purpose}.',
 'MANDATORY AUTHOR WINDOW CONTRACT in this same complete JSON: EACH covered space must include windowPriority, an array with precisely four UNIQUE compass direction strings; the set must be north, east, south and west, each once, in an order YOU invent. EACH sky space must set windowPriority:null. Do not omit, duplicate, shorten or use a single windowSide value. The host will not insert, reorder, select a template or repair any author windowPriority.',
 'The mezzanine is an OCCUPIED PUBLIC UPPER LEVEL inside the selected previously authored double-height atrium, not merely an attractive free-floating floor or decorative bridge.',
 'side north|south chooses which end contains a real 3-cell-deep supported upper deck; stairLane west|east chooses a separate 2-block-wide approach stair and matching safe opening.',
 'deckOffsetX integer 1..3, deckWidth integer 8..10, rise integer 6..8. Choose values compatible with the authored atrium dimensions and especially the original public reception fixture. You must explicitly avoid existing fixtures, doorways, windows, skylights and author public paths.',
 'The host independently checks every actual B143 stair tread, real landing support and overhead air, ORIGINAL equipment and glazing, and reachable 2-wide source walking from the main entrance to an upper programme AND its public service desk.',
 'Author a meaningful UNIQUE upper public purpose (12..140 chars, no markup). The point of the second level is user function, not shape novelty alone. Never move an invalid idea or regenerate by hidden host templates.',
 'No world writes. Structural load rating, user Minecraft walking and human architectural ART remain NOT_TESTED. Never promote this source study into a ready-to-construct plan.',
 'Return ONLY complete raw JSON, no markdown or explanations, EXACT top-level keys schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium,mezzanine. One model POST maximum; no paid API or second attempt.'
].join('\n');
