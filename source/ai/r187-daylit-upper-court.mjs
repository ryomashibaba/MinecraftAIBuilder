/**
 * R187: one EASTERN DAYLIT SKYCOURT and WESTERN STAIR-ATRIUM vertical
 * slice, physically connected to the existing R186 room and staircase.
 *
 * Independent opt-in. The prior R186 building is never mutated.
 * Unblocked daylight VIEW-RAYS and SOURCE-reachable outdoor balcony are
 * real B143 occupancy proofs, not a lighting simulation, real Minecraft
 * physics or structural certification. Input is explicit synthetic fixture.
 */
import {createHash} from 'node:crypto';
import {R186_SCHEMA,compileR186VerticalSlice,auditR186SourceSlice}
 from './r186-vertical-public-slice.mjs';
import {compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
export const R187_SCHEMA='minecraftaibuilder-r187-daylit-upper-court-source-v1';
const fail=s=>{throw Error('R187_DAYLIT_UPPER_COURT_'+s);};
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const key=(x,y,z)=>x+','+y+','+z;
const sha=s=>createHash('sha256').update(s).digest('hex');
const gates=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldWrites:0,worldContacts:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export const R187_INSTRUCTIONS=[
 'One opt-in JSON: schema,base,daylight with no extra properties.',
 'schema minecraftaibuilder-r187-daylit-upper-court-source-v1',
 'base: complete VERIFIED R186 reply (source-only elevated crossing).',
 'daylight: {roomId:"assembly-gallery",roomFacing:"east",',
 'stairFacing:"west",courtUse:"accessible-outdoor-balcony"}.',
 'Host creates one BOUNDED glass stair aperture, one roofless east',
 'light court physically reached from the original furnished room.',
 'Views through glass and actual terrace pads are SOURCE geometry only.',
 'No automatic building approval, world coordinates or model calls.'
].join('\n');
function parse(raw){
 if(typeof raw!=='string'||raw.length<80||raw.length>24000)
  fail('RAW_BOUNDS');
 let q;try{q=JSON.parse(raw);}catch{fail('INVALID_JSON')}
 if(!exact(q,['schema','base','daylight'])||
  q.schema!==R187_SCHEMA||q.base?.schema!==R186_SCHEMA||
  !exact(q.daylight,['roomId','roomFacing','stairFacing','courtUse'])||
  q.daylight.roomId!=='assembly-gallery'||
  q.daylight.roomFacing!=='east'||
  q.daylight.stairFacing!=='west'||
  q.daylight.courtUse!=='accessible-outdoor-balcony')
  fail('STRICT_DAYLIGHT_IR');
 return q;
}
const occupied=compiled=>new Map(compiled.primitives.map(p=>
 [key(p[0],p[1],p[2]),p[3]]));

export function auditR187DaylitRoom(design,compiled){
 if(!verifyCompiled(design,compiled))fail('UNVERIFIED_SOURCE');
 // Carry forward ALL of R186's checked stair/room/furniture invariants.
 const parent=auditR186SourceSlice(design,compiled);
 const map=occupied(compiled),has=(x,y,z)=>map.has(key(x,y,z));
 const glass=3,metal=2;
 const westGlass=[];
 // Sightline from a real point INSIDE the ascending stair void towards
 // the exterior through a single actual material-glass skin at x6.
 for(const z of [21,23,25]){
  const eyeY=z===21?10:z===23?12:14;
  if(has(11,eyeY,z)||
   map.get(key(6,eyeY,z))!==glass||
   has(5,eyeY,z))
   fail('STAIR_EXTERIOR_DAYLIGHT_MISSING_'+z);
  for(let x=7;x<=10;x++)
   if(has(x,eyeY,z))fail('STAIR_VIEW_BLOCKED_'+x+'_'+z);
  westGlass.push({stairEye:[11,eyeY,z],
   glazing:[6,eyeY,z],outsideAir:[5,eyeY,z]});
 }
 const eastViews=[];
 // Actual upper ROOM east facade has panoramic glass from interior
 // to an OPEN skycourt, not glass flush against a solid second tower.
 for(const z of [23,24]){
  if(has(29,18,z)||map.get(key(30,18,z))!==glass||
   has(43,18,z))
   fail('UPPER_ROOM_GLAZING_NOT_EXTERIOR_'+z);
  for(let x=31;x<=42;x++)
   if(has(x,18,z))fail('PANORAMA_BLOCKED_'+x+'_'+z);
  eastViews.push({roomEye:[29,18,z],
   glazing:[30,18,z],clearSkycourtX:[31,42],
   externalAir:[43,18,z]});
 }
 // Door at the EAST room facade must be truly void, and lead to a
 // supported clear 2-wide patio; a nearby window is NOT counted as door.
 for(const z of [25,26])for(let y=17;y<=19;y++)
  if(has(30,y,z))fail('REAL_PANORAMA_DOOR_BLOCKED');
 for(let x=31;x<=41;x++)for(let z=25;z<=28;z++){
  if(!has(x,16,z)||has(x,17,z)||has(x,18,z))
   fail('BALCONY_TWO_WIDE_SOURCE_DECK_INVALID');
 }
 // A portion of the larger east courtyard really opens to sky. There
 // cannot be a glass roof secretly blocking the "daylit" courtyard.
 for(let y=17;y<=30;y++)if(has(36,y,26))
  fail('SKYCOURT_NOT_OPEN_TO_SKY_'+y);
 // TWO supporting source posts really join terrace deck to foundation;
 // no engineering load verification is claimed.
 for(const [x,z] of [[32,22],[41,29]])
  for(let y=9;y<=16;y++){
   if(!has(x,y,z))fail('TERRACE_POST_PHYSICALLY_DISCONNECTED');
  }
 for(const [x,z] of [[32,22],[41,29]])
  if(map.get(key(x,12,z))!==metal)
   fail('TERRACE_SUPPORT_WRONG_MATERIAL');
 const zones=[
  {level:0,standingFloorY:2,partitionCount:0,zones:[
   {id:'old-public-underpass',range:{x:[22,25],z:[34,38]}}]},
  {level:1,standingFloorY:17,partitionCount:1,zones:[
   {id:'enclosed-assembly-gallery',range:{x:[22,27],z:[22,27]}},
   {id:'reachable-open-east-balcony',range:{x:[33,40],z:[25,28]}}]}
 ];
 const physical={
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,program:zones
 };
 const furnishedTarget={id:'public-display',
  zoneId:'enclosed-assembly-gallery',
  origin:[27,17,23],size:[2,3,3]};
 const audit=auditR125SourceRoutes(physical,{featureTargets:[furnishedTarget]});
 if(audit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  audit.zones.length!==3||
  audit.zones.some(z=>!z.reachedFromEntrance)||
  audit.featureAccess.length!==1||
  !audit.featureAccess[0].reachableFromEntrance)
  fail('UPPER_SKYCOURT_NOT_REACHED_FROM_REAL_ENTRANCE');
 return {schema:'r187-real-b143-daylight-balcony-source-audit-v1',
  sourceRoomAndStairAudit:parent.schema,
  original16StairStepsAndEquipmentVerified:true,
  westStairLightViewRayWitnesses:westGlass,
  eastRoomPanoramaViewRayWitnesses:eastViews,
  actualBalconyAccess:audit.zones[2],
  actualEnclosedRoomAccess:audit.zones[1],
  preservedGroundPublicAccess:audit.zones[0],
  preservedExhibitService:audit.featureAccess[0],
  sourcePublicGraphStatus:audit.status,
  rooflessLightcourtVoxelColumn:[36,17,26,30],
  supportedPatioDepthCells:4,
  physicallyContinuousPosts:2,
  daylightStatus:'STRAIGHT_LINE_AIR_GLASS_SOURCE_ONLY',
  luxIllumination:'NOT_SIMULATED',
  realMinecraftWalking:'NOT_TESTED',
  loadBearingCapacity:'NOT_TESTED',
  allOtherRooms:'NOT_MODELED',
  aestheticStatus:'ART_HOLD',
  ...gates()};
}
export function compileR187DaylitUpperCourt(raw){
 const q=parse(raw);
 let baseline;
 try{baseline=compileR186VerticalSlice(JSON.stringify(q.base));}
 catch{fail('INVALID_R186_VERTICAL_SLICE_SOURCE')}
 if(baseline.verticalSourceAudit?.reachedAllRequestedZones!==true||
  !verifyCompiled(baseline.design,baseline.compiled))
  fail('R186_BASE_UNVERIFIED');
 const design=structuredClone(baseline.design);
 const box=(id,mode,origin,size,material)=>{
  design.elements.push({id,shape:'box',mode,
   ...(mode==='add'?{material}:{}),origin,size});
 };
 // West hall: a REAL deep recess opens the stairwell's exterior wall,
 // while a thin glass panel still provides a physical transparent skin.
 box('r187-west-real-deep-stair-lightwell','cut',
  [6,6,18],[5,10,12]);
 box('r187-west-human-scale-glass-skin','add',
  [6,7,19],[1,8,10],'glass');
 // East: large physical negative mass (not a facade decal), starting
 // ABOVE the original tower's lower support plinth.
 box('r187-east-actual-skycourt-subtraction','cut',
  [31,10,21],[12,15,10]);
 // One true balcony ground plane at upper level, connected via the
 // opening to the R186 upper gallery; the pillar footprints are at
 // the outer patio corners, not over the source-verified walk tracks.
 box('r187-east-reconnected-outdoor-deck','add',
  [31,16,22],[12,1,9],'wood');
 box('r187-court-structural-post-a','add',
  [32,10,22],[2,6,2],'metal');
 box('r187-court-structural-post-b','add',
  [40,10,29],[2,6,2],'metal');
 // Wider room glazing exposes real skycourt void; a neighboring DOOR
 // is a genuine air gap, NEVER secretly filled with glass.
 box('r187-widen-room-east-window','cut',
  [30,18,22],[1,2,6]);
 box('r187-room-actual-panoramic-glass','add',
  [30,18,22],[1,2,6],'glass');
 box('r187-cut-balcony-walkable-door','cut',
  [30,17,25],[1,3,2]);
 // Edges of the lightcourt are actual crossbeams, never a suspended
 // magic room/roof silently represented as approved construction.
 box('r187-east-lightcourt-south-rim','add',
  [31,21,20],[12,2,1],'metal');
 box('r187-east-lightcourt-north-rim','add',
  [31,21,31],[12,2,1],'metal');
 if(design.elements.length>160)
  fail('B143_ELEMENT_BUDGET');
 const compiled=compileDesign(design);
 const proof=auditR187DaylitRoom(design,compiled);
 // HIGH confidence: preserve every coordinate of the old public axis,
 // original ascending tread/clearance (including side walls) and old
 // display as physical materials, not just a successful route string.
 const old=occupied(baseline.compiled),now=occupied(compiled);
 for(let z=7;z<=38;z++)for(let x=22;x<=25;x++)
  for(let y=1;y<=3;y++)
   if(old.get(key(x,y,z))!==now.get(key(x,y,z)))
    fail('GROUND_PUBLIC_AXIS_CHANGED');
 for(let z=14;z<=29;z++)for(let x=11;x<=13;x++)
  for(let y=1;y<=17;y++)
   if(old.get(key(x,y,z))!==now.get(key(x,y,z)))
    fail('ORIGINAL_VERTICAL_STAIR_CELLS_CHANGED');
 for(let x=27;x<=28;x++)for(let y=17;y<=19;y++)
  for(let z=23;z<=25;z++)
   if(old.get(key(x,y,z))!==now.get(key(x,y,z)))
    fail('ORIGINAL_EXHIBIT_MOVED_OR_DESTROYED');
 if(compiled.geometrySha256===baseline.compiled.geometrySha256)
  fail('NO_ACTUAL_GEOMETRY_CHANGE');
 return {
  schema:'r187-real-functional-daylit-void-slice-v1',
  originalRawSha256:sha(raw),rawSyntheticIR:raw,
  originalR186GeometrySha256:baseline.compiled.geometrySha256,
  originalR186VoxelCount:baseline.compiled.primitives.length,
  resultingR187VoxelCount:compiled.primitives.length,
  provenance:'STATIC_SYNTHETIC_HOST_GEOMETRY_NOT_MODEL_GENERATED',
  design,compiled,sourceOnly:true,modelCalls:0,
  daylightSourceAudit:proof,artDecision:'ART_HOLD_HUMAN_REVIEW',
  ...gates()
 };
}
