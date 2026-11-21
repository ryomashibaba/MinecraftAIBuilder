/**
 * R149: typology-neutral, host-owned envelope expression over a complete
 * REAL B143 program. Never edits or claims Qwen's spatial choices.
 * Restricted to exterior wall skins (x=1/w-2 or z=1/d-2),
 * roof/eaves (y>=6), and visible exterior entry framing (z=0).
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=s=>{throw Error('R149_EXPRESSION_'+s);};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const cell=p=>p.join(',');
export const R151_EXPRESSION_SCHEMA='minecraftaibuilder-r151-envelope-intent-v1';
export const R152_EXPRESSION_SCHEMA='minecraftaibuilder-r152-envelope-intent-v1';
export function validateR152EnvelopeIntent(intent){
 const keys=['schema','entryHierarchy','daylightStrategy','roofEdge','section'];
 if(!intent||typeof intent!=='object'||Array.isArray(intent)||
  Object.keys(intent).length!==keys.length||
  !keys.every(k=>Object.hasOwn(intent,k))||
  intent.schema!==R152_EXPRESSION_SCHEMA||
  !['quiet','emphasized'].includes(intent.entryHierarchy)||
  !['even','focused'].includes(intent.daylightStrategy)||
  !['fine','parapet'].includes(intent.roofEdge)||
  !['continuous','raised-entry'].includes(intent.section))
  fail('MODEL_R152_SECTION_CONTRACT');
 return true;
}
export function validateR151EnvelopeIntent(intent){
 const keys=['schema','entryHierarchy','daylightStrategy','roofEdge'];
 if(!intent||typeof intent!=='object'||Array.isArray(intent)||
  Object.keys(intent).length!==keys.length||
  !keys.every(k=>Object.hasOwn(intent,k))||
  intent.schema!==R151_EXPRESSION_SCHEMA||
  !['quiet','emphasized'].includes(intent.entryHierarchy)||
  !['even','focused'].includes(intent.daylightStrategy)||
  !['fine','parapet'].includes(intent.roofEdge))
  fail('MODEL_EXPRESSION_INTENT_CONTRACT');
 return true;
}
function interior(compiled,w,d){
 return compiled.primitives.filter(p=>p[0]>=2&&p[0]<=w-3&&
  p[2]>=2&&p[2]<=d-3&&p[1]>=1&&p[1]<=5)
  .map(cell).sort();
}
export function deriveR149EnvelopeExpression(base,{plan,expressionIntent=null}={}){
 if(expressionIntent!==null){
  if(expressionIntent.schema===R152_EXPRESSION_SCHEMA)
   validateR152EnvelopeIntent(expressionIntent);
  else validateR151EnvelopeIntent(expressionIntent);
 }
 if(base?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  !plan?.footprint||!plan?.materials||!plan?.form||
  !base.design||!base.compiled||
  !verifyCompiled(base.design,base.compiled)||
  base.compiled.sourceSha256!==base.sourceSha256||
  base.compiled.geometrySha256!==base.geometrySha256||
  !Array.isArray(base.program)||base.program.length!==1||
  !Array.isArray(base.placements)||base.placements.length<1||
  base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  base.design.elements.some(e=>e.id.startsWith('r149-')))
  fail('VERIFIED_FURNISHED_BASE_REQUIRED');
 const w=base.design.bounds.width,d=base.design.bounds.depth;
 if(w<24||d<24||base.design.bounds.height<8||
  plan.footprint.width!==w||plan.footprint.depth!==d||
  !['wood','stone','concrete','metal'].includes(plan.materials.roof)||
  !['flat','ridge','sawtooth'].includes(plan.form.roofProfile))
  fail('UNSUPPORTED_ENVELOPE_DIMENSIONS');
 const entry=base.design.elements.find(e=>e.id==='exterior-entrance');
 if(!entry||entry.mode!=='cut'||entry.shape!=='box'||
  !eq(entry.size,[2,3,1])||entry.origin[1]!==2||
  entry.origin[2]!==1)fail('EXTERIOR_ENTRY_NOT_PINNED');
 const xDoor=entry.origin[0];
 if(xDoor<2||xDoor+2>=w)fail('EXTERIOR_ENTRY_OUT_OF_RANGE');
 const design=structuredClone(base.design),initial=design.elements.length;
 const add=(id,mode,material,origin,size)=>{
  design.elements.push({id:'r149-'+id,shape:'box',mode,
   ...(mode==='add'?{material}:{}),origin,size});
 };
 const window=(side,index,origin,size)=>{
  add('glazing-'+side+'-'+index+'-cut','cut',null,origin,size);
  add('glazing-'+side+'-'+index+'-glass','add','glass',origin,size);
 };
 // Generous but regularly spaced window bays, with real masonry piers.
 // Leave the model-selected entrance and a one-cell jamb untouched.
 let front=0,rear=0,side=0;
 for(let x=3;x<=w-6;x+=6){
  if(x+2<xDoor-1||x>xDoor+2){
   window('front',front++,[x,3,1],[3,2,1]);
  }
  if(expressionIntent?.daylightStrategy!=='focused'||x%12===3)
   window('rear',rear++,[x,3,d-2],[3,2,1]);
 }
 for(let z=3;z<=d-6;z+=6){
  if(expressionIntent?.daylightStrategy==='focused'&&z>3)continue;
  window('west',side,[1,3,z],[1,2,3]);
  window('east',side,[w-2,3,z],[1,2,3]);side++;
 }
 // Continuous slender eave unifies the roof edge without modifying the
 // caller's chosen roof profile; roof does not intrude on any room.
 const roof=plan.materials.roof;
 add('eave-front','add',roof,[0,6,0],[w,1,1]);
 add('eave-back','add',roof,[0,6,d-1],[w,1,1]);
 add('eave-west','add',roof,[0,6,1],[1,1,d-2]);
 add('eave-east','add',roof,[w-1,6,1],[1,1,d-2]);
 if(expressionIntent?.roofEdge==='parapet'){
  // Exterior roof-edge mass, without cutting the original roof profile.
  add('parapet-front','add',roof,[0,7,0],[w,1,1]);
  add('parapet-rear','add',roof,[0,7,d-1],[w,1,1]);
  add('parapet-west','add',roof,[0,7,1],[1,1,d-2]);
  add('parapet-east','add',roof,[w-1,7,1],[1,1,d-2]);
 }
 // Actual exterior face (z=0), not a fictitious second doorway.
 // Vertical jambs + lintel make the entrance legible from the street.
 add('entry-jamb-west','add','accent',[xDoor-1,2,0],[1,3,1]);
 add('entry-jamb-east','add','accent',[xDoor+2,2,0],[1,3,1]);
 add('entry-lintel','add','accent',[xDoor-1,5,0],[4,1,1]);
 if(expressionIntent?.entryHierarchy==='emphasized'&&
   (xDoor<3||xDoor+4>=w))
  fail('REQUESTED_PORTICO_EXCEEDS_BUILDING_FOOTPRINT');
 add('entry-canopy','add','accent',[xDoor-1,6,0],
  [expressionIntent?.entryHierarchy==='emphasized'?6:4,1,1]);
 if(expressionIntent?.entryHierarchy==='emphasized'){
  add('entry-portal-left','add','accent',[xDoor-2,2,0],[1,4,1]);
  add('entry-portal-right','add','accent',[xDoor+3,2,0],[1,4,1]);
 }
 // R152 genuine taller entry-room section, rather than a fake rooftop box.
 // Ceiling under this segment is REMOVED; upper walls, high windows and
 // weather-covering roof are rebuilt. All existing room/feature voxels y<=5 stay.
 let raisedRoom=null;
 if(expressionIntent?.section==='raised-entry'){
  const matches=base.program[0].zones.filter(zone=>
   zone.range.z[0]===2&&xDoor>=zone.range.x[0]&&
   xDoor+1<=zone.range.x[1]);
  if(matches.length!==1)fail('R152_REAL_ENTRY_ROOM_NOT_UNIQUE');
  const zone=matches[0],x0=zone.range.x[0]-1,
   x1=zone.range.x[1]+1,z0=1,z1=zone.range.z[1]+1,
   sx=x1-x0+1,sz=z1-z0+1;
  if(x0<1||x1>w-2||z1>d-2||sx<7||sz<7||
   design.bounds.height<=9)
   fail('R152_ROOM_CANNOT_SUPPORT_SECTION');
  add('section-remove-low-ceiling','cut',null,
   [x0+1,6,z0+1],[sx-2,4,sz-2]);
  add('section-front','add',plan.materials.wall,
   [x0,6,z0],[sx,3,1]);
  add('section-back','add',plan.materials.wall,
   [x0,6,z1],[sx,3,1]);
  add('section-west','add',plan.materials.wall,
   [x0,6,z0+1],[1,3,sz-2]);
  add('section-east','add',plan.materials.wall,
   [x1,6,z0+1],[1,3,sz-2]);
  add('section-glazing-cut','cut',null,
   [x0+1,7,z0],[sx-2,2,1]);
  add('section-glazing-glass','add','glass',
   [x0+1,7,z0],[sx-2,2,1]);
  add('section-higher-roof','add',roof,
   [x0,9,z0],[sx,1,sz]);
  raisedRoom={zoneId:zone.id,roofHeight:9,
   oldCeilingHeight:6,footprint:{x:[x0,x1],z:[z0,z1]},
   interiorWitness:[x0+2,z0+2]};
 }
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_COMPILE_MISMATCH');
 if(!eq(design.elements.slice(0,initial),base.design.elements)||
  !eq(interior(compiled,w,d),interior(base.compiled,w,d)))
  fail('INTERIOR_OR_MODEL_PROGRAM_REGRESSION');
 // Windows may NOT turn the real exterior door into a glass wall.
 const occupied=new Set(compiled.primitives.map(p=>cell(p.slice(0,3))));
 if(raisedRoom){
  const [cx,cz]=raisedRoom.interiorWitness;
  if([6,7,8].some(y=>occupied.has(cell([cx,y,cz])))||
   !occupied.has(cell([cx,9,cz])))
   fail('R152_HIGH_ROOM_CEILING_NOT_REAL');
 }
 for(const x of [xDoor,xDoor+1])for(const z of [0,1,2])
  for(const y of [2,3,4]){
   if(occupied.has(cell([x,y,z])))fail('EXTERIOR_ENTRY_BLOCKED');
  }
 const enhanced={...base,design,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  expressionAuthorship:'HOST_DERIVED_NOT_MODEL_ARCHITECTURAL_INTENT',
  architecturalQuality:'HUMAN_REVIEW_REQUIRED',
  aestheticApproved:false,minecraftWalking:'NOT_TESTED',
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
 const targets=base.placements.map(p=>({
  id:p.id,zoneId:p.zoneId,origin:p.origin,size:p.size
 }));
 // R130's furnished result deliberately has a DIFFERENT wrapper schema.
 // Route QA expects only the generic B143 plan-to-source audit shape.
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.featureAccess?.length!==targets.length||
  !routes.featureAccess.every(p=>p.reachableFromEntrance))
  fail('ROOM_OR_EQUIPMENT_ROUTE_REGRESSION');
 return {...enhanced,sourceRouteAudit:routes,
  r149ExpressionEvidence:{
   proposalSource:expressionIntent===null?
    'HOST_DERIVED_GENERIC_ENVELOPE_NOT_QWEN_SELECTED':
    'HOST_GEOMETRY_FROM_EXPLICIT_CALLER_EXPRESSION_INTENT',
   explicitR151ArchitectureIntent:expressionIntent===null?null:
    structuredClone(expressionIntent),
   retainedOriginalSourceElements:initial,
   appendedExteriorSourceElements:design.elements.length-initial,
   windowBays:{front,rear,eachSide:side},
   entranceOrigin:[...entry.origin],
   unchangedInteriorVoxels:true,
   originalRoomCount:base.program[0].zones.length,
   originalEquipmentCount:base.placements.length,
   originalRoofProfile:plan.form.roofProfile,
   modelIntentChanged:false,
   modelExpressionIntentProvided:expressionIntent!==null,
   r152RealRoomRaisedSection:raisedRoom,
   originalSourceSha256:base.sourceSha256,
   enhancedSourceSha256:compiled.sourceSha256,
   aestheticJudgement:'HOLD_FOR_HUMAN_3D_REVIEW',
   minecraftWalking:'NOT_TESTED',
   safety:'NOT_PREPARED_9_BLOCKED_0_WORLD_WRITES'
  }};
}
