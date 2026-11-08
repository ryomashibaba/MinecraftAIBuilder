/**
 * R163: real upper clerestory daylight on the existing topology-led R162
 * occupied sections. No building-category templates, model inference,
 * original Qwen edits or Minecraft world access.
 */
import {compileDesign,verifyCompiled,MATERIALS} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';
const fail=code=>{throw Error('R163_CLERESTORY_'+code);};
const key=(x,y,z)=>x+','+y+','+z;
const low=compiled=>new Map(compiled.primitives
 .filter(p=>p[1]<=6).map(p=>[p.slice(0,3).join(','),p[3]]));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const safe=x=>x.worldContacts===0&&x.worldWrites===0&&
 x.constructionApproved===false&&x.executionAllowed===false&&
 x.gates?.length===9&&x.gates.every(g=>g==='BLOCKED')&&
 x.BuildPlan?.operations?.length===0;
export function deriveR163DaylitSections(base){
 if(base?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  !base.r162RoomSectionEvidence?.upperRoomSections||
  base.r162RoomSectionEvidence.upperRoomSections.length!==3||
  base.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !base.design||!base.compiled||!verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  !Array.isArray(base.placements)||base.placements.length<3||
  !safe(base))fail('VERIFIED_R162_SOURCE_REQUIRED');
 if(base.design.elements.some(e=>e.id.startsWith('r163-')))
  fail('ALREADY_APPLIED');
 const {width:w,depth:d}=base.design.bounds;
 const original=base.design.elements.length;
 const design=structuredClone(base.design);
 const materialId=MATERIALS.indexOf('glass');
 const wallId=MATERIALS.indexOf(
  design.elements.find(e=>e.id==='shell-west')?.material);
 if(materialId<0||wallId<0)fail('MATERIAL_PALETTE');
 const before=new Map(base.compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 const windows=[];
 for(let i=0;i<3;i++){
  const s=base.r162RoomSectionEvidence.upperRoomSections[i];
  const q=s.sourceRange,{x:[xl,xr],z:[zf,zb]}=s.perimeter;
  if(s.roofY<8||s.roofY>10||q.x[1]-q.x[0]+1<7||
   q.z[1]-q.z[0]+1<7)fail('UNSUPPORTED_ROOM_SECTION');
  // Only an actual exposed outer wall may hold a high window. A wall
  // against the shared gallery or another room is NOT daylight.
  const face=xl===1?'west':xr===w-2?'east':
   zf===1?'front':zb===d-2?'rear':null;
  if(!face)fail('NO_TRUE_EXTERIOR_FACE');
  const isX=face==='west'||face==='east';
  const span=isX?q.z:q.x;
  const n=Math.min(5,span[1]-span[0]-2);
  if(n<3)fail('GLAZING_SPAN_TOO_NARROW');
  const start=Math.floor((span[0]+span[1]-n+1)/2);
  const wx=face==='west'?xl:face==='east'?xr:start;
  const wz=face==='front'?zf:face==='rear'?zb:start;
  const origin=[wx,7,wz],size=isX?[1,1,n]:[n,1,1];
  // Test that all intended glazing cells are REAL upper wall voxels,
  // air immediately outside, and real room air on the inside.
  const outer=face==='west'?[-1,0]:face==='east'?[1,0]:
   face==='front'?[0,-1]:[0,1];
  const inner=[-outer[0],-outer[1]];
  const witnesses=[];
  for(let t=0;t<n;t++){
   const x=wx+(isX?0:t),z=wz+(isX?t:0);
   if(before.get(key(x,7,z))!==wallId||
    before.has(key(x+outer[0],7,z+outer[1]))||
    before.has(key(x+inner[0],7,z+inner[1])))
    fail('NOT_A_EXTERIOR_DAYLIGHT_FACE');
   witnesses.push({wall:[x,7,z],
    exterior:[x+outer[0],7,z+outer[1]],
    inhabitedInterior:[x+inner[0],7,z+inner[1]]});
  }
  design.elements.push({id:'r163-clere-cut-'+i,shape:'box',
   mode:'cut',origin:[...origin],size:[...size]});
  design.elements.push({id:'r163-clere-glass-'+i,shape:'box',
   mode:'add',material:'glass',origin:[...origin],size:[...size]});
  windows.push({zoneId:s.zoneId,wall:face,origin,size,
   realExteriorDaylightWitnesses:witnesses,
   paneVoxelCount:n,glazedAtY:7,highRoofY:s.roofY});
 }
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||
  !equal(design.elements.slice(0,original),base.design.elements))
  fail('ORIGINAL_DESIGN_PREFIX_CHANGED');
 if(!equal([...low(base.compiled)].sort(),[...low(compiled)].sort()))
  fail('LOWER_ARCHITECTURE_CHANGED');
 const after=new Map(compiled.primitives.map(p=>[key(p[0],p[1],p[2]),p[3]]));
 for(const [loc,material] of before){
  if(after.get(loc)===material)continue;
  const allowed=windows.some(win=>win.realExteriorDaylightWitnesses.some(
   witness=>key(...witness.wall)===loc));
  if(!allowed||material!==wallId||after.get(loc)!==materialId)
   fail('UNRELATED_VOXEL_CHANGED');
 }
 const roofProof=[];
 for(const s of base.r162RoomSectionEvidence.upperRoomSections){
  const q=s.sourceRange;
  let count=0;
  for(let x=q.x[0];x<=q.x[1];x++)
   for(let z=q.z[0];z<=q.z[1];z++){
    if(!after.has(key(x,s.roofY,z)))fail('ROOM_ROOF_HOLE');
    for(let y=6;y<s.roofY;y++)
     if(after.has(key(x,y,z)))fail('HIGH_ROOM_FILLED_BY_FALSE_ROOF');
    count++;
   }
  roofProof.push({zoneId:s.zoneId,roofY:s.roofY,
   fullRoomFootprintCoveredBySolidRoof:true,
   noObstructionY6ToRoof:true,coveredRealCells:count});
 }
 for(const win of windows)for(const witness of win.realExteriorDaylightWitnesses){
  if(after.get(key(...witness.wall))!==materialId||
   after.has(key(...witness.exterior))||
   after.has(key(...witness.inhabitedInterior)))
   fail('FALSE_OR_BLOCKED_CLERESTORY_DAYLIGHT');
 }
 const targets=base.placements.map(p=>({
  id:p.id,zoneId:p.zoneId,origin:p.origin,size:p.size}));
 const routes=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 if(routes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  routes.zones.length!==3||routes.featureAccess.length!==targets.length||
  !routes.featureAccess.every(x=>x.reachableFromEntrance))
  fail('ROOM_OR_EQUIPMENT_SOURCE_ROUTE_REGRESSION');
 const paneCount=windows.reduce((n,x)=>n+x.paneVoxelCount,0);
 return {...base,design,compiled,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  sourceRouteAudit:routes,
  r163DaylightAndRoofEvidence:{
   schema:'r163-real-clerestory-roof-protection-v1',
   provenance:'HOST_DERIVED_FROM_R162_REAL_ROOM_EXTERIOR_FACES_NOT_QWEN_AUTHORED',
   windowCount:windows.length,realGlassPaneCount:paneCount,
   realClerestoryWindows:windows,
   realRoomRoofCoverage:roofProof,
   allHighRoomsActuallyDaylitViaExteriorGlass:true,
   lowerVoxelsY6AndBelowUnchanged:true,
   allModelSelectedEquipmentReachable:true,
   modelCalls:0,humanArtReview:'ART_HOLD',
   realisticWeatherTightness:'NOT_TESTED',
   MinecraftWalking:'NOT_TESTED',worldWrites:0
  },
  readiness:'NOT_PREPARED',aestheticApproved:false,
  architecturalQuality:'HUMAN_REVIEW_REQUIRED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0};
}
