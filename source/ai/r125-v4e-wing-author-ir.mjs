/**
 * ONE-RESPONSE AUTHOR intent for whole program + substantive open-sky mass +
 * externally protruding, publicly walkable roof wing. No host genre templates,
 * model retries, world operations, or human ART certification.
 */
import {createHash} from 'node:crypto';
import {RANKED_SCHEMA} from './r125-v4e-ranked-exterior-ir.mjs';
import {MASSING_SCHEMA,MASSING_SYSTEM_PROMPT,compileMassingAuthorIntent}
 from './r125-v4e-massing-author-ir.mjs';
import {compileAuthoredExteriorWing}
 from './r125-v4e-authored-exterior-wing.mjs';
export const WING_SCHEMA='minecraftaibuilder-r125-v4e-exterior-wing-author-v1';
const fail=s=>{throw Error('R125_V4E_WING_AUTHOR_'+s);};
const exactly=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');

export function compileWingAuthorIntent(input){
 const raw=structuredClone(input);
 if(!exactly(raw,['schema','id','title','brief','materials','spaces','massing','wing'])||
  raw.schema!==WING_SCHEMA||
  !(exactly(raw.wing,['spaceId','side','start','span','reach','roofY','purpose'])||
    exactly(raw.wing,['spaceId','side','start','span','reach','roofY','purpose','outline'])))
  fail('ONE_JSON_WHOLE_ARCHITECTURE_CONTRACT');
 const {wing,...massingAuthor}=raw;
 massingAuthor.schema=MASSING_SCHEMA;
 const before=compileMassingAuthorIntent(massingAuthor);
 const {massing,...ranked}=massingAuthor;ranked.schema=RANKED_SCHEMA;
 const final=compileAuthoredExteriorWing(ranked,massing,wing);
 const witness=final.sourceWingWitness;
 if(before.b143.geometrySha256!==final.previousMassingGeometrySha256||
  before.b143.geometrySha256===final.newGeometrySha256||
  final.b143Compiled.geometrySha256!==final.newGeometrySha256||
  final.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  witness.actualSupportedWingFloorCells<60||
  witness.actualCoverRoofCells!==witness.actualSupportedWingFloorCells||
  witness.realPortalCellsRemoved!==6||
  (Object.hasOwn(wing,'outline')&&
   (witness.authorContourExplicit!==true||
    witness.actualVerifiedDistinctStepDepths<2||
    witness.physicallyVerifiedSupportPostCount<4))||
  witness.twoWideUserRoute.status!=='SOURCE_TWO_WIDE_ENTRANCE_TO_WING_REACHABLE'||
  witness.independentRoofSilhouette.views.find(v=>v.face==='roof')
   .silhouetteChangedCells<witness.actualCoverRoofCells||
  final.worldContacts!==0||final.worldWrites!==0||
  final.readiness!=='NOT_PREPARED'||
  final.constructionApproved!==false||final.executionAllowed!==false||
  final.gates.length!==9||final.gates.some(x=>x!=='BLOCKED')||
  final.BuildPlan.operations.length!==0)
  fail('REAL_B143_WING_AND_SAFETY_FAIL_CLOSED');
 const b143={...before.b143,
  design:final.b143Design,compiled:final.b143Compiled,
  sourceSha256:final.b143Compiled.sourceSha256,
  geometrySha256:final.b143Compiled.geometrySha256,
  sourceRoutes:final.sourceRoutes,
  sourceProof:{...before.b143.sourceProof,
   wholeExteriorWingAuthorSourceWitness:witness,
   humanArchitecturalArt:'NOT_REVIEWED'}};
 return {...before,authorContract:WING_SCHEMA,
  wingAuthorOriginal:raw,wingAuthorSha256:sha(raw),
  authoredWing:wing,authoredWingSourceWitness:witness,
  unchangedMassingGeometrySha256:before.b143.geometrySha256,
  b143,sourceSha256:b143.sourceSha256,geometrySha256:b143.geometrySha256,
  provenance:'ONE_WHOLE_ARCHITECTURE_MODEL_OR_AUTHOR_UNATTESTED',
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
}
export const WING_SYSTEM_PROMPT=[
 MASSING_SYSTEM_PROMPT
  .replaceAll(MASSING_SCHEMA,WING_SCHEMA)
  .replace('schema,id,title,brief,materials,spaces,massing.',
   'schema,id,title,brief,materials,spaces,massing,wing.'),
 'Also author wing EXACT {spaceId,side,start,span,reach,roofY,purpose} with OPTIONAL outline:[depth1,depth2,depth3].',
 'Select a COVERED room and a genuinely unshared, buildable EXTERIOR side north|south|east|west, distinct from the first room north public entry.',
 'start integer 3..12 along chosen wall, span integer 10..18, reach 6..9 cells outward beyond the whole old building footprint, roofY 8 or 9 below the selected room eave.',
 'For a genuine AUTHOR-CHOSEN irregular wing, prefer outline:[6,9,7] with reach:9 as an example, but independently choose all three values. Each depth is an integer 6..reach, max must equal reach (8 or 9 when outline is present), min must be at least 2 below max. Three consecutive bands follow the original authored span; they are never automatically inferred or relocated. Omit outline only for the archived rectangular behavior.',
 'Choose a meaningful original purpose for the wing as a sheltered public working or gathering place. It must connect by its REAL 2-wide door to the existing building and have a supported ground and physical roof columns.',
 'The portal removes only 2x3 lower wall cells; windows on the same facade are legal ONLY if their real glass and both immediately adjacent AIR layers remain intact. Shared links, blocked entries, missing outside land and lost routes FAIL CLOSED.',
 'A second HOST model POST or auto-relocation is prohibited. One original JSON must author the whole useful building AND its genuine exterior footprint. Keep all nine Minecraft world gates BLOCKED. SOURCE is not ART or Minecraft success.'
].join('\n');
