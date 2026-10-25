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
function interior(compiled,w,d){
 return compiled.primitives.filter(p=>p[0]>=2&&p[0]<=w-3&&
  p[2]>=2&&p[2]<=d-3&&p[1]>=1&&p[1]<=5)
  .map(cell).sort();
}
export function deriveR149EnvelopeExpression(base,{plan}={}){
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
  window('rear',rear++,[x,3,d-2],[3,2,1]);
 }
 for(let z=3;z<=d-6;z+=6){
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
 // Actual exterior face (z=0), not a fictitious second doorway.
 // Vertical jambs + lintel make the entrance legible from the street.
 add('entry-jamb-west','add','accent',[xDoor-1,2,0],[1,3,1]);
 add('entry-jamb-east','add','accent',[xDoor+2,2,0],[1,3,1]);
 add('entry-lintel','add','accent',[xDoor-1,5,0],[4,1,1]);
 add('entry-canopy','add','accent',[xDoor-1,6,0],[4,1,1]);
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('B143_COMPILE_MISMATCH');
 if(!eq(design.elements.slice(0,initial),base.design.elements)||
  !eq(interior(compiled,w,d),interior(base.compiled,w,d)))
  fail('INTERIOR_OR_MODEL_PROGRAM_REGRESSION');
 // Windows may NOT turn the real exterior door into a glass wall.
 const occupied=new Set(compiled.primitives.map(p=>cell(p.slice(0,3))));
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
   proposalSource:'HOST_DERIVED_GENERIC_ENVELOPE_NOT_QWEN_SELECTED',
   retainedOriginalSourceElements:initial,
   appendedExteriorSourceElements:design.elements.length-initial,
   windowBays:{front,rear,eachSide:side},
   entranceOrigin:[...entry.origin],
   unchangedInteriorVoxels:true,
   originalRoomCount:base.program[0].zones.length,
   originalEquipmentCount:base.placements.length,
   originalRoofProfile:plan.form.roofProfile,
   modelIntentChanged:false,
   originalSourceSha256:base.sourceSha256,
   enhancedSourceSha256:compiled.sourceSha256,
   aestheticJudgement:'HOLD_FOR_HUMAN_3D_REVIEW',
   minecraftWalking:'NOT_TESTED',
   safety:'NOT_PREPARED_9_BLOCKED_0_WORLD_WRITES'
  }};
}
