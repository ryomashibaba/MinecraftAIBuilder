/**
 * R162: real inhabited upper sections derived from physical room footprints.
 *
 * HOST geometry compiler: uses same semantic weight regardless of building
 * genre, neither invents a new Qwen decision nor modifies original source.
 * 3 rooms, supported source only; zero construction or Minecraft world IO.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {auditR125SourceRoutes} from './r125-source-routes.mjs';

const fail=s=>{throw Error('R162_SECTION_'+s)};
const coord=p=>p.slice(0,3).join(',');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const lower=compiled=>new Map(compiled.primitives.filter(p=>p[1]<=5)
 .map(p=>[coord(p),p[3]]));
export function deriveR162RoomSectionMassing(base,{topologyIntent}={}){
 if(!['central-spine','west-gallery','east-gallery'].includes(topologyIntent))
  fail('TOPOLOGY_INTENT_REQUIRED');
 if(base?.schema!=='minecraftaibuilder-r125-featured-source-v1'||
  base?.r149ExpressionEvidence?.unchangedInteriorVoxels!==true||
  base?.sourceRouteAudit?.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  !base.design||!base.compiled||
  !verifyCompiled(base.design,base.compiled)||
  base.sourceSha256!==base.compiled.sourceSha256||
  base.geometrySha256!==base.compiled.geometrySha256||
  !Array.isArray(base.placements)||base.placements.length<3||
  !Array.isArray(base.program)||base.program.length!==1||
  base.program[0].zones.length!==3)
  fail('VERIFIED_THREE_ROOM_R149_SOURCE_REQUIRED');
 if(base.design.elements.some(e=>e.id.startsWith('r162-')))
  fail('CANNOT_APPLY_TWICE');
 const zones=base.program[0].zones;
 const {width:w,depth:d,height:h}=base.design.bounds;
 const roof=base.design.elements.find(e=>e.id==='roof-base');
 const wall=base.design.elements.find(e=>e.id==='shell-west');
 if(h<12||!roof||roof.mode!=='add'||!wall||wall.mode!=='add')
  fail('BOUNDING_ENVELOPE_NOT_SUPPORTED');
 const physicallySide=zones.every(z=>z.physicalSector?.includes('gallery-room'));
 const side=topologyIntent!=='central-spine';
 if(physicallySide!==side)fail('PHYSICAL_TOPOLOGY_NOT_MATCHING_MODEL_INTENT');
 const originalElements=base.design.elements.length;
 const design=structuredClone(base.design);
 const add=(id,mode,origin,size,material)=>{
  design.elements.push({id:'r162-'+id,shape:'box',mode,
   ...(mode==='add'?{material}:{}),origin,size});
 };
 const ranked=zones.map(z=>z.id).sort((a,b)=>{
  const wa=zones.find(z=>z.id===a).relativeWeight;
  const wb=zones.find(z=>z.id===b).relativeWeight;
  return wa-wb||a.localeCompare(b);
 });
 if(!zones.every(z=>Number.isSafeInteger(z.relativeWeight)&&z.relativeWeight>0))
  fail('THREE_DISTINCT_EXPLICIT_FUNCTIONAL_WEIGHTS_REQUIRED');
 const sections=zones.map(zone=>{
  const [x0,x1]=zone.range.x,[z0,z1]=zone.range.z;
  const roofY=8+ranked.indexOf(zone.id);
  if(x0<2||z0<2||x1>w-3||z1>d-3||
   x1-x0+1<7||z1-z0+1<7||roofY>=h-1)
   fail('ROOM_CANNOT_FIT_A_REAL_HIGH_SECTION');
  return {zoneId:zone.id,
   sourceRange:structuredClone(zone.range),
   roofY,previousRoofY:6,
   interiorStartY:6,
   roomWeight:zone.relativeWeight,
   perimeter:{x:[x0-1,x1+1],z:[z0-1,z1+1]},
   witness:[Math.floor((x0+x1)/2),Math.floor((z0+z1)/2)]};
 });
 // Remove the original ceiling above EACH interior region FIRST, so no
 // volume is falsely classified as usable when old B143 caps remain inside.
 for(let i=0;i<sections.length;i++){
  const s=sections[i],q=s.sourceRange;
  add('clear-low-roof-'+i,'cut',[q.x[0],6,q.z[0]],
   [q.x[1]-q.x[0]+1,s.roofY-6,q.z[1]-q.z[0]+1]);
 }
 // Build true high enclosing perimeter walls aligned to lower room walls,
 // with independent stepped roofs following real room weight and position.
 for(let i=0;i<sections.length;i++){
  const s=sections[i],{x:[xl,xr],z:[zf,zb]}=s.perimeter;
  const wallHeight=s.roofY-6;
  const spanX=xr-xl+1,spanZ=zb-zf+1;
  add('west-wall-'+i,'add',[xl,6,zf],[1,wallHeight,spanZ],wall.material);
  add('east-wall-'+i,'add',[xr,6,zf],[1,wallHeight,spanZ],wall.material);
  add('front-wall-'+i,'add',[xl+1,6,zf],[spanX-2,wallHeight,1],wall.material);
  add('rear-wall-'+i,'add',[xl+1,6,zb],[spanX-2,wallHeight,1],wall.material);
 }
 // Roof caps come AFTER all wall operations. Original ceilings were removed
 // within actual room x/z footprints. Adjacent roof decks can step naturally.
 for(let i=0;i<sections.length;i++){
  const s=sections[i],{x:[xl,xr],z:[zf,zb]}=s.perimeter;
  add('roof-'+i,'add',[xl,s.roofY,zf],
   [xr-xl+1,1,zb-zf+1],roof.material);
 }
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled)||
  !equal(design.elements.slice(0,originalElements),base.design.elements))
  fail('SOURCE_IMMUTABILITY');
 if(!equal([...lower(compiled)].sort(),[...lower(base.compiled)].sort()))
  fail('ORIGINAL_ROOMS_AND_EQUIPMENT_VOXELS_CHANGED');
 const vox=new Set(compiled.primitives.map(coord));
 for(const section of sections){
  const [x,z]=section.witness;
  if(!vox.has([x,section.roofY,z].join(','))||
   Array.from({length:section.roofY-6},(_,i)=>i+6)
    .some(y=>vox.has([x,y,z].join(','))))
   fail('ROOFTOP_IS_NOT_REAL_OPEN_HIGH_ROOM');
  // Every room must contain a measurable genuine extra usable void, not
  // a decorative roof tower that leaves its old ceiling in place.
  const q=section.sourceRange;
  let available=0;
  for(let ix=q.x[0];ix<=q.x[1];ix++)
   for(let iz=q.z[0];iz<=q.z[1];iz++){
    if(vox.has([ix,6,iz].join(','))||vox.has([ix,7,iz].join(',')))
     continue;
    available++;
   }
  section.clearHighInteriorArea=available;
  if(available<35)fail('HIGH_INTERIOR_CANNOT_BE_USED');
 }
 const targets=base.placements.map(p=>({
  id:p.id,zoneId:p.zoneId,origin:p.origin,size:p.size}));
 const audit=auditR125SourceRoutes({
  schema:'minecraftaibuilder-r125-plan-to-b143-result-v1',
  design,compiled,program:base.program,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256
 },{featureTargets:targets});
 if(audit.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  audit.featureAccess.length!==targets.length||
  !audit.featureAccess.every(f=>f.reachableFromEntrance))
  fail('ROOM_EQUIPMENT_SOURCE_ROUTE_REGRESSION');
 return {...base,design,compiled,
  parentSourceSha256:base.sourceSha256,
  parentGeometrySha256:base.geometrySha256,
  sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  sourceRouteAudit:audit,
  r162RoomSectionEvidence:{
   schema:'r162-actual-inhabited-roof-sections-v1',
   provenance:'HOST_DERIVED_FROM_MODEL_ROOM_WEIGHTS_AND_REAL_TOPOLOGY_NOT_MODEL_VOXELS',
   topologyIntent,realRoomCount:sections.length,
   upperRoomSections:sections,
   oldCeilingRemoved:true,unmodifiedAllCellsY5AndBelow:true,
   sourceEquipmentAccessible:audit.featureAccess.length,
   sourceRoutes:audit.status,
   initialElements:originalElements,finalElements:design.elements.length,
   modelCallsDuringGeometry:0,realMinecraftWalking:'NOT_TESTED',
   humanArtReview:'ART_HOLD',worldWrites:0},
  readiness:'NOT_PREPARED',aestheticApproved:false,
  architecturalQuality:'HUMAN_REVIEW_REQUIRED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  worldContacts:0,worldWrites:0};
}
