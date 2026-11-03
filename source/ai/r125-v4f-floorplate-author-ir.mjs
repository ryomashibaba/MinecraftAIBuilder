/**
 * V4F ONE model/author response owns the entire R125 spatial program,
 * real public skylight void, accessible contoured exterior wing AND an actual
 * covered-building nonrectangular roof+floor footprint (not a roof-only cut).
 * Research-only. Existing default V4D and earlier V4E author schema frozen.
 */
import {createHash} from 'node:crypto';
import {WING_SCHEMA,WING_SYSTEM_PROMPT,compileWingAuthorIntent}
 from './r125-v4e-wing-author-ir.mjs';
import {compileAuthoredCoveredFloorplateSetback}
 from './r125-v4e-authored-covered-floorplate-setback.mjs';
export const FLOORPLATE_SCHEMA='minecraftaibuilder-r125-v4f-covered-floorplate-author-v1';
const fail=s=>{throw Error('R125_V4F_FLOORPLATE_AUTHOR_'+s);};
const exact=(v,keys)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===keys.slice().sort().join('|');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function compileFloorplateAuthorIntent(untrusted){
 const raw=structuredClone(untrusted);
 if(!exact(raw,['schema','id','title','brief','materials','spaces','massing','wing','floorplate'])||
  raw.schema!==FLOORPLATE_SCHEMA||
  !exact(raw.floorplate,['spaceId','corner','width','depth']))
  fail('EXPLICIT_WHOLE_ARCHITECTURE_JSON_CONTRACT');
 const {floorplate,...wing}=raw;
 wing.schema=WING_SCHEMA;
 const old=compileWingAuthorIntent(wing);
 const fresh=compileAuthoredCoveredFloorplateSetback(wing,floorplate);
 const witness=fresh.actualSourceWitness;
 if(fresh.unmodifiedPriorGeometrySha256!==old.b143.geometrySha256||
  fresh.finalGeometrySha256===old.b143.geometrySha256||
  fresh.b143Compiled.geometrySha256!==fresh.finalGeometrySha256||
  witness.originalWalkableFloorColumnsRemoved!==floorplate.width*floorplate.depth||
  witness.roofSilhouetteComparison.views.find(v=>v.face==='roof')
   .silhouetteChangedCells<floorplate.width*floorplate.depth||
  witness.physicallyVerifiedNewExternalFacadeCells<50||
  witness.originalGlassAndBothAirLayers.verifiedPanelGlassCells<36||
  fresh.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  fresh.worldWrites!==0||fresh.worldContacts!==0||
  fresh.readiness!=='NOT_PREPARED'||fresh.constructionApproved!==false||
  fresh.executionAllowed!==false||fresh.BuildPlan.operations.length!==0||
  fresh.gates.length!==9||fresh.gates.some(x=>x!=='BLOCKED'))
  fail('TRUE_B143_FLOORPLATE_AND_WORLD0_FAIL_CLOSED');
 const b143={...old.b143,design:fresh.b143Design,
  compiled:fresh.b143Compiled,
  sourceSha256:fresh.b143Compiled.sourceSha256,
  geometrySha256:fresh.b143Compiled.geometrySha256,
  sourceRoutes:fresh.sourceRoutes,
  sourceProof:{...old.b143.sourceProof,
   explicitlyAuthoredTrueCoveredFloorplateWitness:witness,
   independentHumanArt:'NOT_REVIEWED'}
 };
 return {...old,authorContract:FLOORPLATE_SCHEMA,
  floorplateAuthorOriginal:raw,floorplateAuthorSha256:hash(raw),
  authoredFloorplate:floorplate,authoredFloorplateSourceWitness:witness,
  unchangedWingGeometrySha256:old.b143.geometrySha256,
  b143,sourceSha256:b143.sourceSha256,geometrySha256:b143.geometrySha256,
  provenance:'ONE_EXPLICIT_ORIGINAL_AUTHOR_RESPONSE_IDENTITY_NOT_ATTESTED',
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0
 };
}
export const FLOORPLATE_SYSTEM_PROMPT=[
 WING_SYSTEM_PROMPT
  .replaceAll(WING_SCHEMA,FLOORPLATE_SCHEMA)
  .replace('schema,id,title,brief,materials,spaces,massing,wing.',
   'schema,id,title,brief,materials,spaces,massing,wing,floorplate.'),
 'In the SAME one JSON response author floorplate EXACT {spaceId,corner,width,depth}.',
 'floorplate targets a COVERED functional room, preferably the first reception main building if its chosen external corner is genuinely unshared. It may target another authored covered room if the main reception corners are blocked by attached spaces.',
 'Choose corner NW|NE|SW|SE and width/depth integers 6..8. This is NOT the existing massing public roof cut: it removes the real room FLOOR, all external walls, and the whole overhead ROOF at that corner; a newly exposed enclosed inner wall is physically built.',
 'The TWO outer corner faces MUST be completely unshared with every linked room, not currently occupied by the sky-open public massing, not occupied by the author wing, glazing, original 4-wide entrance or any functional fixtures.',
 'Do not use a generic corner or artificial host template. Decide a meaningful asymmetrical floorplate as the original architect. The host never repairs, relocates, resizes or secretly regenerates invalid author decisions.',
 'All original functional routes, original entrance, physical glazed windows, covered wing and public void must remain demonstrably accessible in real B143. Otherwise SOURCE HOLD, no Minecraft writes. No structural, weather or human ART claims.',
 'Return the full root keys EXACTLY schema,id,title,brief,materials,spaces,massing,wing,floorplate. One complete JSON, one MODEL request maximum, no wrapper or retry.'
].join('\n');
