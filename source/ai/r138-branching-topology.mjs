/**
 * R138 generic branchable topology: a four-wide central access spine with
 * independently accessible rooms in two side wings. Not a fixed building
 * category, no renaming-only or wall-decoration fake complexity.
 *
 * This is a HOST-DERIVED architectural alternative for existing short
 * 3/4-zone semantic programs. Their original compiled B143 scene, semantic
 * zone IDs, room purposes and weights are preserved as independent records.
 * New real B143 3D is a separately hashed derivative; NOT model-authored.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=s=>{throw Error('R138_BRANCH_'+s);};
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
export function deriveR138BranchedTopology(base,{spatialBalance='balanced'}={}){
 if(!['balanced','left-wide','right-wide'].includes(spatialBalance))
  fail('INVALID_SPATIAL_BALANCE');
 if(base?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  base?.spatialIRSchema!=='minecraftaibuilder-r134-multi-zone-program-v1'||
  !base?.plan||!base?.design||!base?.compiled||
  !verifyCompiled(base.design,base.compiled)||
  base?.sourceSha256!==base.compiled.sourceSha256||
  base?.geometrySha256!==base.compiled.geometrySha256||
  base.program?.length!==1||base.plan.layout?.axis!=='z')
  fail('VERIFIED_BASE_Z_MULTIZONE_REQUIRED');
 const {width:w,depth:d}=base.plan.footprint;
 const zones=base.program[0].zones,rooms=zones.length;
 if(![3,4].includes(rooms)||w<24||d<24||w>32||d>32)
  fail('OUT_OF_BOUNDS_FOR_ACTUAL_BRANCHING');
 // R158: genuinely change room width, not the facade labels.
 const shift=spatialBalance==='left-wide'?2:
  spatialBalance==='right-wide'?-2:0;
 const leftWall=Math.floor(w/2)-3+shift,
  rightWall=Math.floor(w/2)+2+shift;
 const gapStart=leftWall+1,gapEnd=rightWall-1;
 if(shift!==0&&w<28)fail('SHIFTED_SPINE_NEEDS_REAL_ROOM_WIDTH');
 const divider=Math.floor(d/2);
 const front=[2,divider-1],rear=[divider+1,d-3];
 const left=[2,leftWall-1],right=[rightWall+1,w-3];
 if(gapEnd-gapStart+1<4||left[1]-left[0]+1<7||
  right[1]-right[0]+1<7||front[1]-front[0]+1<7||
  rear[1]-rear[0]+1<7)fail('BRANCH_WINGS_TOO_SMALL_FOR_REAL_FURNITURE');
 if(shift!==0&&(w<28||leftWall-2<7||w-3-rightWall<7))
  fail('SHIFTED_SPINE_NEEDS_REAL_ROOM_WIDTH');
 const footprints=rooms===4?[
  {sector:'front-left',x:left,z:front,wallX:leftWall},
  {sector:'front-right',x:right,z:front,wallX:rightWall},
  {sector:'rear-left',x:left,z:rear,wallX:leftWall},
  {sector:'rear-right',x:right,z:rear,wallX:rightWall}
 ]:[
  {sector:'front-left',x:left,z:front,wallX:leftWall},
  {sector:'whole-right',x:right,z:[2,d-3],wallX:rightWall},
  {sector:'rear-left',x:left,z:rear,wallX:leftWall}
 ];
 const design=structuredClone(base.design);
 // The original source entrance is centered. A shifted shared spine MUST
 // move that physical opening before the R138 independent route audit;
 // R139 subsequently relocates the exterior door into the selected room.
 const preliminaryEntry=design.elements.find(e=>e.id==='exterior-entrance');
 if(shift!==0){
  if(!preliminaryEntry||preliminaryEntry.mode!=='cut'||
   preliminaryEntry.shape!=='box'||preliminaryEntry.size[0]!==2)
   fail('ORIGINAL_EXTERIOR_DOOR_MISSING');
  preliminaryEntry.origin[0]+=shift;
 }
 // Existing genuine envelope, roof, front door and source glass are reused.
 // Replaces ONLY the original internal linear partition.
 design.elements=design.elements.filter(x=>
  !x.id.startsWith('zone-divider-')&&!x.id.startsWith('zone-door-'));
 const wall=base.plan.materials.wall,boxes=[];
 const push=(id,mode,origin,size)=>{
  boxes.push({id,shape:'box',mode,
   ...(mode==='add'?{material:wall}:{}),origin,size});
 };
 push('branched-side-wall-left','add',[leftWall,2,2],[1,4,d-4]);
 push('branched-side-wall-right','add',[rightWall,2,2],[1,4,d-4]);
 push('branched-divider-left','add',[2,2,divider],
  [leftWall-2,4,1]);
 if(rooms===4)
  push('branched-divider-right','add',[rightWall+1,2,divider],
   [w-3-rightWall,4,1]);
 // A genuine 2-block opening from shared circulation into each room,
 // never a merely labelled connection.
 const doors=[];
 for(const [i,shape] of footprints.entries()){
  const zDoor=Math.floor((shape.z[0]+shape.z[1])/2)-1;
  const id='branched-zone-door-'+i;
  push(id,'cut',[shape.wallX,2,zDoor],[1,3,2]);
  doors.push({id,zoneId:zones[i].id,wallX:shape.wallX,zStart:zDoor,
   connectsToSharedCentralSpine:true});
 }
 design.elements.push(...boxes);
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('DERIVED_B143_INVALID');
 const program=[{
  ...structuredClone(base.program[0]),splitAxis:'branch-central-spine',
  partitionCount:rooms===4?4:3,
  centralSharedSpine:{range:{x:[gapStart,gapEnd],z:[2,d-3]},
   standingFloorY:2},
  zones:zones.map((z,i)=>({
   ...z,range:{x:[...footprints[i].x],z:[...footprints[i].z]},
   physicalSector:footprints[i].sector,
   actualSourceRoomRangeDerivedByHost:true
  }))
 }];
 const derivative={
  ...base,design,compiled,program,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  parentPlanSha256:base.planSha256,
  planSha256:sha({
   basePlanSha256:base.planSha256,
   variant:'r138-central-spine',
   positions:footprints.map((f,i)=>[zones[i].id,f.sector])
  }),
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  modelAuthorship:'ORIGINAL_SEMANTIC_PROGRAM_MODEL_OR_USER;HOST_ARCHITECTURAL_ALTERNATIVE',
  architecturalQuality:'NOT_REVIEWED',inGameWalking:'NOT_TESTED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldWrites:0,worldContacts:0
 };
 const route=auditR125SourceRoutes(derivative);
 if(route.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !route.zones.every(z=>z.reachedFromEntrance&&z.reachedTwoWidePadCount>0))
  fail('NEW_BRANCH_NOT_REAL_SOURCE_REACHABLE');
 return {
  ...derivative,
  sourceRouteAudit:route,
  topologyProvenance:'HOST_DERIVED_NOT_MODEL_ARCHITECTURAL_CHOICE',
  zoneLayoutShape:shift===0?'BRANCHED_CENTRAL_SPINE_WITH_SIDE_ROOMS':
   'BRANCHED_SHIFTED_SPINE_WITH_REAL_DIFFERENT_WING_WIDTHS',
  r158SpatialBalanceEvidence:{spatialBalance,shiftCells:shift,
   modelSelectionAuthenticated:false,
   leftWingInteriorWidth:left[1]-left[0]+1,
   rightWingInteriorWidth:right[1]-right[0]+1,
   centralSpineX:[gapStart,gapEnd],
   sectors:footprints.map(f=>({sector:f.sector,x:f.x,z:f.z})),
   humanArtReview:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'},
  zoneDoorEvidence:doors,
  originalQwenRoomIntentUnmodified:zones.every((z,i)=>
   z.id===program[0].zones[i].id&&
   z.purpose===program[0].zones[i].purpose),
  actualPlayerMovementCertified:false,
  aestheticApproved:false
 };
}
