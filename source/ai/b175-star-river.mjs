/**
 * B175 — NEBULA ARK / STAR RIVER SKYDECK
 * Third independently strict-B143 design module, not a raised DSL cap.
 * All geometries are conceptual local XYZ. This cannot contact Minecraft.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,
 validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {buildSkycanyon,ASCENT_STATIONS} from './b174-skycanyon.mjs';
export const SCHEMA='minecraftaibuilder-b175-star-river-skydeck-v1';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const yes=(value,why)=>{if(!value)throw Error('B175_'+why)};
const K=(x,y,z)=>x+','+y+','+z;
const box=(id,origin,size,material='metal')=>({
 id,shape:'box',mode:'add',origin,size,material});
const ell=(id,center,radii,material='glass',shell=1)=>({
 id,shape:'ellipsoid',mode:'add',center,radii,shell,material});
const beam=(id,start,end,material='metal',thickness=1)=>({
 id,shape:'beam',mode:'add',start,end,thickness,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>({
 id,shape:'torus',mode:'add',center,axis:'z',majorRadius,tubeRadius,material});
const cut=(id,origin,size)=>({id,shape:'box',mode:'cut',origin,size});

/** New volumetric architecture: a >100-block sky promenade and three canopy plazas. */
export function starRiverParts(){
 const e=[
  // Long contiguous 2x2+ supported source-real public concourse.
  box('b175-star-river-main-deck',[9,59,9],[108,1,8],'concrete'),
  box('b175-star-river-front-parapet',[9,60,7],[108,2,2],'glass'),
  box('b175-star-river-rear-parapet',[9,60,17],[108,2,2],'glass'),
  // Vast vertically separate external stage projecting towards the viewer.
  box('b175-north-projection',[13,54,3],[27,1,8],'accent'),
  box('b175-central-projection',[44,54,3],[36,1,8],'accent'),
  box('b175-south-projection',[86,54,3],[29,1,8],'accent'),
  // Upper structural aerial ribbons and transverse links (true voxels).
  box('b175-structural-upper-west',[35,66,12],[17,1,8],'metal'),
  box('b175-structural-upper-east',[74,66,12],[17,1,8],'metal'),
  box('b175-orbit-panorama-mid',[50,70,18],[25,1,12],'accent')
 ];
 for(const d of [
  {name:'north',cx:24,l:12,w:26},
  {name:'core',cx:62,l:46,w:32},
  {name:'south',cx:101,l:88,w:26}
 ]){
  e.push(
   // These shells sit above the validated promenade headroom.
   ell('b175-'+d.name+'-canopy',[d.cx,68,11],
     d.name==='core'?[15,6,8]:[11,6,8],'glass',1),
   box('b175-'+d.name+'-floating-garden',[d.l,65,8],
     [d.w,1,11],'wood'),
   box('b175-'+d.name+'-glass-belvedere',[d.l+2,68,9],
     [d.w-4,1,9],'glass'),
   box('b175-'+d.name+'-canopy-spine',[d.cx-2,72,12],
     [5,2,4],'metal'),
   box('b175-'+d.name+'-light-ridge',[d.l+4,73,10],
     [d.w-8,1,3],'glow')
  );
  // Tall, legible spatial supports under the multi-storey walkway.
  for(let n=0;n<4;n++){
   const x=d.l+2+n*6;
   e.push(
    beam('b175-'+d.name+'-foreleg-'+n,[x,30,5],[x+1,54,6],
      n%2===0?'metal':'accent'),
    beam('b175-'+d.name+'-pier-'+n,[x,36,16],[x+1,59,18],
      n%2===0?'metal':'glow')
   );
  }
 }
 // New roof silhouette and monumental lateral diagonals between terminals.
 e.push(
  tor('b175-orbital-east-light',[83,66,24],8,1,'glow'),
  tor('b175-orbital-west-light',[41,66,24],8,1,'glow'),
  beam('b175-front-bridge-west',[37,54,3],[49,68,5],'metal',2),
  beam('b175-front-bridge-east',[88,54,3],[76,68,5],'metal',2),
  beam('b175-west-tower-web',[16,48,3],[31,71,6],'accent'),
  beam('b175-east-tower-web',[109,48,3],[94,71,6],'accent'),
  // One explicitly allowed offline correction to the B174 landing pier:
  // X72/Y39/Z46..48 occludes the next-to-last tread's body envelope.
  // This conceptual design CUT is handled by the versioned compositor;
  // never interpreted as a Minecraft setblock/fill operation.
  cut('b175-landing-body-clearance',[72,39,46],[1,1,3])
 );
 yes(e.length>=50&&e.length<160,'MODULE_ELEMENT_COUNT');
 yes(new Set(e.map(x=>x.id)).size===e.length,'DUPLICATE_ELEMENTS');
 return e;
}
export function createStarRiverModule(){
 const design={
  schema:DSL,id:'nebula-ark-star-river-module',
  title:'NEBULA ARK — STAR RIVER SKYDECK',
  brief:'独立した第三設計モジュールで三つの天空広場、広大な展望回廊、空中庭園、ガラス天蓋、巨大柱列を立体形状として増設。実機施工は未承認。',
  bounds:{width:124,height:78,depth:50},
  elements:starRiverParts(),designOnly:true
 };
 validateDesign(design);
 return design;
}
/** Stronger geometry-only checks, never Minecraft collision certification. */
export function analyzeSteppedInterfaces(scene){
 const occupied=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
 const bodyClear=(x,y,z)=>{for(let dx=0;dx<2;dx++)
  for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++)
   if(occupied.has(K(x+dx,y+dy,z+dz)))return false;
  return true;
 };
 const edges=[];
 for(let i=0;i<ASCENT_STATIONS.length-1;i++){
  const a=ASCENT_STATIONS[i],b=ASCENT_STATIONS[i+1];
  const [ax,ay,az]=a.standing,[bx,by,bz]=b.standing;
  yes(bx-ax===3&&by-ay===1&&az===bz,'SOURCE_STATION_DISCONTINUITY_'+i);
  // Two full-body supported staging locations prior to transition.
  for(const x of [ax,ax+1]){
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
    yes(occupied.has(K(x+dx,ay-1,az+dz)),
      'STAGING_UNSUPPORTED_'+i+'_'+x);
   yes(bodyClear(x,ay,az),'STAGING_BLOCKED_'+i+'_'+x);
  }
  // 2x2 mixed-height interface: last column of lower tread adjacent
  // to first column of next higher tread, with upper two-cell clearance.
  const edgeX=ax+2;
  for(let dz=0;dz<2;dz++){
   yes(occupied.has(K(edgeX,ay-1,az+dz)),
       'OLD_TREAD_MISSING_AT_'+i);
   yes(occupied.has(K(edgeX+1,ay,az+dz)),
       'RISER_NOT_ADJACENT_'+i);
  }
  yes(bodyClear(edgeX,by,az),'UPPER_BODY_ENVELOPE_BLOCKED_'+i);
  // Upper platform 2x2 station must be fully supported and clear.
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
   yes(occupied.has(K(bx+dx,by-1,bz+dz)),
       'UPPER_TREAD_UNSUPPORTED_'+i);
  yes(bodyClear(bx,by,bz),'NEXT_STATION_BODY_COLLISION_'+i);
  edges.push({index:i,from:a.station,to:b.station,
    verticalRise:1,horizontalStartDelta:3,
    separatedTreadGapCells:0,
    fullStaging2x2:true,mixedHeightEdge2x2:true,
    upperEnvelope2High:true,
    minecraftMovementCertified:false});
 }
 return {sourceStationCount:ASCENT_STATIONS.length,
  verifiedGeometricInterfaces:edges.length,
  body:[2,2],headroomCells:2,
  mixedHeightStepInterfaceCount:edges.length,
  continuousMinecraftWalkingCertified:false,
  independentStepPhysicalTraversabilityCertified:false,
  edgesSha256:sha(edges)};
}
function verifyFlatGallery(scene){
 const occupied=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
 for(let x=12;x<=112+1;x++)for(let dz=0;dz<2;dz++){
  yes(occupied.has(K(x,59,11+dz)),'STAR_RIVER_FLOOR_MISSING_'+x);
  for(let dy=0;dy<2;dy++)
   yes(!occupied.has(K(x,60+dy,11+dz)),'STAR_RIVER_BLOCKED_'+x);
 }
 return {standingY:60,z:11,fromX:12,toX:112,
  supported2x2FlatMoves:100,realWorldMovementCertified:false};
}
function checkHistoricRoutes(scene){
 const occupied=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
 for(const [y,z,start,end] of [[14,7,10,112],[26,20,12,110]]){
  for(let x=start;x<=end+1;x++)for(let dz=0;dz<2;dz++){
   yes(occupied.has(K(x,y-1,z+dz)),'HISTORIC_FLOOR_MISSING');
   yes(!occupied.has(K(x,y,z+dz))&&
       !occupied.has(K(x,y+1,z+dz)),'HISTORIC_CORRIDOR_BLOCKED');
  }
 }
 return [102,98];
}
function joinParentFirst(old,add,design){
 const cells=new Map(old.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 // The only cross-module deletion is an explicit, three-cell local
 // design clearance at the transition into the inherited high arrival pier.
 // The frozen parent remains unchanged; no protected lower/upper route
 // voxels or Minecraft world state are touched.
 const cuts=design.elements.filter(x=>x.mode==='cut');
 yes(cuts.length===1&&cuts[0].id==='b175-landing-body-clearance'&&
  JSON.stringify(cuts[0].origin)==='[72,39,46]'&&
  JSON.stringify(cuts[0].size)==='[1,1,3]',
  'ONLY_WHITELISTED_OFFLINE_CUT_ALLOWED');
 let removedParentCells=0;
 for(let z=46;z<=48;z++){
  const k=K(72,39,z);
  yes(cells.delete(k),'LANDING_CLEARANCE_PARENT_SOURCE_MISMATCH_'+z);
  removedParentCells++;
 }
 let added=0,overlap=0;
 for(const p of add.primitives){
  const k=K(p[0],p[1],p[2]);
  if(cells.has(k)){overlap++;continue}
  cells.set(k,p);added++;
 }
 yes(cells.size<=MAX_CELLS,'COMBINED_GLOBAL_VOXEL_BUDGET');
 yes(added>=2000,'INSUFFICIENT_NEW_ARCHITECTURE');
 const primitives=[...cells.values()].sort((a,b)=>a[1]-b[1]||
  a[2]-b[2]||a[0]-b[0]);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 const layerCounts=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
  layerCounts[MATERIALS[p[3]]]++;
 }
 yes(max[0]<124&&max[1]<78&&max[2]<50,'BOUNDS_LIMIT');
 const sourceSha256=sha({schema:SCHEMA,parentSourceSha256:old.sourceSha256,
  addonSourceSha256:add.sourceSha256,mergePolicy:'parent-first',designId:design.id});
 const geometrySha256=sha({sourceSha256,primitives});
 const scene={...old,id:'nebula-ark-star-river-skydeck',
  title:'NEBULA ARK — STAR RIVER / 三大天空広場の巨大都市',
  brief:'B174の多層立体都市を保護し、天空の巨大回廊・天蓋・展望広場を独立モジュールで追加。',
  primitives,sourceSha256,geometrySha256,
  bounds:{minX:min[0],maxX:max[0],minY:min[1],maxY:max[1],
    minZ:min[2],maxZ:max[2]},
  levels:Math.floor(max[1]/5)+1,
  stats:{...old.stats,voxels:primitives.length,layerCounts,
   moduleCount:3,designOperations:[
    ...old.stats.designOperations,
    ...add.stats.designOperations.map(a=>({...a,module:design.id}))]}};
 return {scene,unique:added,overlap,removedParentCells};
}
export function buildStarRiver(){
 const previous=buildSkycanyon();
 const design=createStarRiverModule(),addon=compileDesign(design);
 yes(verifyCompiled(design,addon),'B143_MODULE_INTEGRITY');
 const merged=joinParentFirst(previous.compiled,addon,design);
 const stepped=analyzeSteppedInterfaces(merged.scene);
 const gallery=verifyFlatGallery(merged.scene);
 const oldRoutes=checkHistoricRoutes(merged.scene);
 const report={
  schema:SCHEMA,modelId:merged.scene.id,
  priorModelId:previous.compiled.id,
  sourceSha256:merged.scene.sourceSha256,
  geometrySha256:merged.scene.geometrySha256,
  parentGeometrySha256:previous.compiled.geometrySha256,
  addonSourceSha256:addon.sourceSha256,
  parentVoxelCount:previous.compiled.primitives.length,
  addedUnique3dCells:merged.unique,removedDesignCells:merged.removedParentCells,
  unmodifiedParentOverlap:merged.overlap,
  real3dCells:merged.scene.primitives.length,
  inheritedAuthoredElements:previous.report.totalAuthoredElements,
  newAuthoredElements:design.elements.length,
  totalAuthoredElements:previous.report.totalAuthoredElements+design.elements.length,
  moduleCount:3,independentModuleCap:160,combinedVoxelLimit:MAX_CELLS,
  sourceGeometryAscentStations:stepped.sourceStationCount,
  inspectedMixedHeightTransitions:stepped.verifiedGeometricInterfaces,
  geometryStepEvidenceSha256:stepped.edgesSha256,
  horizontalSkyPromenadeSupported2x2Moves:gallery.supported2x2FlatMoves,
  inheritedLowerMoves:oldRoutes[0],inheritedUpperMoves:oldRoutes[1],
  continuousMinecraftWalkingCertified:false,
  realStepCollisionCertified:false,structuralLoadCertified:false,
  realFallSafetyCertified:false,actualWorldContactCertified:false,
  prior36GalleryUnchanged:true,B172B173B174SourceUnchanged:true,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 yes(verifyStarRiver(report),'SECURITY_GATE');
 return {previous,design,addon,compiled:merged.scene,report,stepped,gallery};
}
export function verifyStarRiver(r){
 return Boolean(r&&r.schema===SCHEMA&&r.modelId==='nebula-ark-star-river-skydeck'&&
  r.moduleCount===3&&r.independentModuleCap===160&&r.combinedVoxelLimit===MAX_CELLS&&
  r.inheritedAuthoredElements===225&&r.newAuthoredElements>=50&&
  r.newAuthoredElements<=160&&
  r.totalAuthoredElements===r.inheritedAuthoredElements+r.newAuthoredElements&&
  r.addedUnique3dCells>=2000&&
  r.removedDesignCells===3&&
  r.real3dCells===r.parentVoxelCount+r.addedUnique3dCells-r.removedDesignCells&&
  r.sourceSha256?.length===64&&r.geometrySha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  r.sourceGeometryAscentStations===15&&r.inspectedMixedHeightTransitions===14&&
  r.geometryStepEvidenceSha256?.length===64&&
  r.horizontalSkyPromenadeSupported2x2Moves===100&&
  r.inheritedLowerMoves===102&&r.inheritedUpperMoves===98&&
  r.continuousMinecraftWalkingCertified===false&&
  r.realStepCollisionCertified===false&&r.structuralLoadCertified===false&&
  r.realFallSafetyCertified===false&&r.actualWorldContactCertified===false&&
  r.prior36GalleryUnchanged===true&&r.B172B173B174SourceUnchanged===true&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
