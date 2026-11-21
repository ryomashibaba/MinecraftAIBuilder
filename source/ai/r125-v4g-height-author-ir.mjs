/**
 * V4G one original model/author JSON owns full functional building INCLUDING
 * a roof-removing double-height hall. No silent host design, no second POST,
 * no Minecraft world or architecture/art certification.
 */
import {createHash} from 'node:crypto';
import {FLOORPLATE_SCHEMA,FLOORPLATE_SYSTEM_PROMPT,compileFloorplateAuthorIntent}
 from './r125-v4f-floorplate-author-ir.mjs';
import {compileAuthoredTallPublicHall}
 from './r125-v4g-authored-atrium-height.mjs';
export const HEIGHT_SCHEMA='minecraftaibuilder-r125-v4g-tall-hall-author-v1';
const fail=s=>{throw Error('R125_V4G_HEIGHT_AUTHOR_'+s);};
const exact=(v,keys)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===keys.slice().sort().join('|');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function compileHeightAuthorIntent(untrusted){
 const raw=structuredClone(untrusted);
 if(!exact(raw,['schema','id','title','brief','materials','spaces',
  'massing','wing','floorplate','atrium'])||
  raw.schema!==HEIGHT_SCHEMA||
  !exact(raw.atrium,['spaceId','offsetX','offsetZ','width','depth','lift','roofForm']))
  fail('ONE_JSON_WHOLE_BUILDING_AND_HEIGHT_CONTRACT');
 const {atrium,...floorplate}=raw;
 floorplate.schema=FLOORPLATE_SCHEMA;
 const before=compileFloorplateAuthorIntent(floorplate);
 const final=compileAuthoredTallPublicHall(floorplate,atrium);
 const w=final.actualSourceWitness;
 if(final.priorGeometrySha256!==before.b143.geometrySha256||
  final.finalGeometrySha256!==final.b143Compiled.geometrySha256||
  w.usableGroundLevelAtriumFloorColumns!==atrium.width*atrium.depth||
  w.physicallyPresentRaisedRoofCells!==atrium.width*atrium.depth||
  w.physicallyGlazedClerestoryCells<96||
  w.actualGlassInsideOutsideAIRCells!==2*w.physicallyGlazedClerestoryCells||
  w.actualGainAtHighestVoxel<5||
  w.verifiedTallHallCenterVerticalAirCells<18||
  w.realHallEntryTwoWideWalk.width!==2||
  final.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  final.worldContacts!==0||final.worldWrites!==0||
  final.readiness!=='NOT_PREPARED'||final.constructionApproved!==false||
  final.executionAllowed!==false||final.BuildPlan.operations.length!==0||
  final.gates.length!==9||final.gates.some(g=>g!=='BLOCKED'))
  fail('ACTUAL_TALL_HALL_AND_WORLD_GATES_NOT_PROVEN');
 const b143={...before.b143,design:final.b143Design,
  compiled:final.b143Compiled,
  sourceSha256:final.b143Compiled.sourceSha256,
  geometrySha256:final.b143Compiled.geometrySha256,
  sourceRoutes:final.sourceRoutes,
  sourceProof:{...before.b143.sourceProof,
   originalAuthorDoubleHeightAtriumEvidence:w,
   actualModelArchitecturalArt:'NOT_REVIEWED'}
 };
 return {...before,authorContract:HEIGHT_SCHEMA,
  heightAuthorOriginal:raw,heightAuthorSha256:hash(raw),
  authoredAtrium:atrium,authoredTallHallSourceWitness:w,
  unchangedFloorplateGeometrySha256:before.b143.geometrySha256,
  b143,sourceSha256:b143.sourceSha256,geometrySha256:b143.geometrySha256,
  provenance:'ONE_ORIGINAL_AUTHOR_COMPLETE_JSON_REAL_MODEL_IDENTITY_UNATTESTED',
  humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0};
}
export const HEIGHT_SYSTEM_PROMPT=[
 FLOORPLATE_SYSTEM_PROMPT
  .replaceAll(FLOORPLATE_SCHEMA,HEIGHT_SCHEMA)
  .replace('schema,id,title,brief,materials,spaces,massing,wing,floorplate.',
   'schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium.'),
 'Also author atrium EXACT {spaceId,offsetX,offsetZ,width,depth,lift,roofForm}, in the SAME JSON answer.',
 'Choose a functional COVERED room, preferably the MAIN public arrival / gathering hall, and an original full-height spatial purpose for its central inhabited raised volume.',
 'offsetX and offsetZ each 3..7 interior cells from that room original left/top; width and depth each 10..16; the far side MUST leave at least three cells of the original room. The atrium footprint MUST NOT overlap the authored covered-floorplate setback nor the open-sky massing void.',
 'lift is 7..11 cells ABOVE the original room own peak roof. roofForm MUST be ridgeX, ridgeZ, shedX or shedZ. The host builds a 3D 1-cell thick fully enclosed elevated wall ring, 3-cell tall TRUE glass clerestory on FOUR sides with verified double AIR, and a sloping roof with REAL B143 connected perimeter supports.',
 'The old roof is completely removed across the authored atrium footprint; original walkable floor and functional equipment stay unchanged. This is an inhabitable tall public hall, not an empty decorative object placed on an unremoved existing roof.',
 'Never borrow a fixed genre-specific host design or repair an invalid selection. Verify the original entrance to hall 2-wide continuous route; original windows, outlets, public void and covered wing must survive. Reject unsafe or impossible original output rather than retrying.',
 'Return ONLY one fully complete JSON with EXACT root keys schema,id,title,brief,materials,spaces,massing,wing,floorplate,atrium. No second model request, paid API or Minecraft world operation. B143 SOURCE does not certify weather, structural adequacy or art.'
].join('\n');
