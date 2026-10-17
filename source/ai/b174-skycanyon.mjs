/**
 * B174 NEBULA ARK — Skycanyon Transit / Modular city-volume expansion.
 * B173's source and strict per-document B143 limits are UNCHANGED.
 * Two independently validated B143 documents are composited into ONE
 * offline design scene. No world coordinates, Minecraft APIs, or writes.
 */
import {createHash} from 'node:crypto';
import {MATERIALS,MAX_CELLS,compileDesign,validateDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildNebulaArkB173} from './b173-nebula-ark.mjs';
export const SCHEMA='minecraftaibuilder-b174-skycanyon-modular-v1';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=p=>p[0]+','+p[1]+','+p[2];
const ok=(v,m)=>{if(!v)throw Error('B174_'+m)};
const box=(id,origin,size,material='metal')=>
 ({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,mode:'add',shape:'beam',start,end,thickness,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,mode:'add',shape:'torus',center,axis:'z',
   majorRadius,tubeRadius,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,mode:'add',shape:'ellipsoid',center,radii,material,shell});
const heightRoute=Array.from({length:15},(_,i)=>({
 station:i,standing:[31+3*i,26+i,46],deck:[31+3*i,25+i,46]
}));
export const ASCENT_STATIONS=Object.freeze(heightRoute.map(x=>
 Object.freeze({station:x.station,standing:Object.freeze(x.standing),
 deck:Object.freeze(x.deck)})));
export function skycanyonParts(){
 const e=[];
 // REAL stepped 3-wide voxel pedestals with a deliberately unobstructed
 // 2x2 station footprint. This is NOT vanilla stair-block collision.
 for(const s of ASCENT_STATIONS){
  e.push(box('b174-skycanyon-riser-'+String(s.station).padStart(2,'0'),
   s.deck,[3,1,3],s.station%3===0?'accent':'metal'));
 }
 // Grounded in existing Y25 source gallery, a lateral 2x2-width
 // link reaches the stepped structure along the rear glass canyon.
 e.push(
  box('b174-gateway-entrance-deck',[29,25,20],[7,1,29],'concrete'),
  box('b174-upper-arrival-pier',[72,39,39],[13,1,10],'concrete'),
  box('b174-upper-outlook-slab',[79,40,33],[6,1,14],'accent'),
  box('b174-canyon-backbone',[29,42,41],[56,2,3],'metal'),
  box('b174-canyon-balcony-crest',[37,51,35],[50,1,7],'glass')
 );
 // Massive genuine floors across three terminal crowns: more than
 // ornamentation, these turn inaccessible void silhouettes into terraces.
 for(const d of [
  {n:'north',x:12,w:26,cx:24},
  {n:'core',x:47,w:31,cx:62},
  {n:'south',x:88,w:27,cx:101}
 ]){
  e.push(
   box('b174-'+d.n+'-panorama-hall',[d.x,57,19],[d.w,1,22],'concrete'),
   box('b174-'+d.n+'-crown-terrace',[d.x+3,64,24],[d.w-6,1,15],'wood'),
   box('b174-'+d.n+'-inverted-arcade',[d.x+2,53,39],[d.w-4,2,3],'metal'),
   box('b174-'+d.n+'-sky-garden',[d.x+4,65,25],[d.w-8,1,12],'accent'),
   tor('b174-'+d.n+'-vertical-halo',[d.cx,62,28],10,2,'glow'),
   ell('b174-'+d.n+'-glass-umbrella',[d.cx,67,29],
       d.n==='core'?[15,7,12]:[12,6,11],'glass',1)
  );
  // Dramatic colonnade: eight tall spatial ribs per terminal.
  for(let j=0;j<4;j++){
   const x=d.x+3+j*(d.w-6)/3|0;
   e.push(
    beam('b174-'+d.n+'-front-pylon-'+j,[x,40,18],[x+1,59,18],
     j%2===0?'metal':'accent',1),
    beam('b174-'+d.n+'-rear-pylon-'+j,[x,41,40],[x+1,59,40],
     j%2===0?'metal':'glow',1));
  }
 }
 // Two high sky galleries actually join the three new decks.
 e.push(
  box('b174-sky-corridor-west',[35,57,27],[15,1,7],'glass'),
  box('b174-sky-corridor-east',[75,57,27],[17,1,7],'glass'),
  box('b174-crown-crossing-west',[36,64,28],[18,1,5],'metal'),
  box('b174-crown-crossing-east',[71,64,28],[20,1,5],'metal')
 );
 // Recognizable monumental ribs between the roof shells and oculi.
 const chords=[
  [[11,51,32],[26,72,31]],[[37,51,32],[24,72,31]],
  [[46,51,32],[62,75,31]],[[78,51,32],[62,75,31]],
  [[88,51,32],[101,72,31]],[[114,51,32],[101,72,31]],
  [[31,39,42],[49,58,42]],[[92,39,42],[75,58,42]]
 ];
 chords.forEach(([a,b],i)=>e.push(beam('b174-arch-diagonal-'+i,
  a,b,i%2===0?'metal':'accent',1)));
 ok(e.length<=160&&e.length>=60,'ADDON_DSL_LIMIT');
 ok(new Set(e.map(p=>p.id)).size===e.length,'DUPLICATE_PART_ID');
 return e;
}
export function createSkycanyonModule(){
 const d={
  schema:'minecraftaibuilder-b143-building-dsl-v1',
  id:'nebula-ark-skycanyon-module',
  title:'NEBULA ARK — SKY CANYON TRANSIT',
  brief:'既存の巨大三大ドーム上部に実3D回廊、階段状テラス、巨大天空環、広場を追加する独立した設計モジュール。実機施工・階間移動は未認証。',
  bounds:{width:124,height:78,depth:50},
  elements:skycanyonParts(),designOnly:true
 };
 validateDesign(d);
 return d;
}
function compose(base,addon,original,extension){
 const cells=new Map(base.primitives.map(p=>[K(p),p]));
 let newlyOccupied=0,overlap=0;
 for(const p of addon.primitives){
  const k=K(p);
  if(cells.has(k)){overlap++;continue;} // parent remains authoritative
  cells.set(k,p);newlyOccupied++;
 }
 ok(newlyOccupied>=1000,'NOT_ENOUGH_NEW_VOXELS');
 ok(cells.size<=MAX_CELLS,'GLOBAL_VOXEL_LIMIT');
 const primitives=[...cells.values()].sort((a,b)=>
  a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 const layerCounts=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
  layerCounts[MATERIALS[p[3]]]++;
 }
 ok(max[0]<124&&max[1]<78&&max[2]<50,'COMPOSITE_OUT_OF_BOUNDS');
 const sourceSha256=H({schema:SCHEMA,policy:'parent-wins-overlap',
  baseSourceSha256:base.sourceSha256,moduleSourceSha256:addon.sourceSha256,
  original,extension});
 const geometrySha256=H({sourceSha256,primitives});
 const scene={...base,id:'nebula-ark-skycanyon-transit',
  title:'NEBULA ARK — SKY CANYON TRANSIT / 多層空中都市',
  brief:'B173に約60要素以上の追加独立モジュールを合成した天空展望都市。',
  primitives,bounds:{minX:min[0],maxX:max[0],minY:min[1],maxY:max[1],
   minZ:min[2],maxZ:max[2]},
  levels:Math.floor(max[1]/5)+1,
  stats:{...base.stats,voxels:primitives.length,layerCounts,
   moduleCount:2,designOperations:[
    ...base.stats.designOperations,
    ...addon.stats.designOperations.map(x=>({...x,module:extension.id}))]},
  sourceSha256,geometrySha256};
 return {scene,newlyOccupied,overlap};
}
function validateStations(scene){
 const occupied=new Set(scene.primitives.map(K));
 let stations=0;
 for(const {standing,station} of ASCENT_STATIONS){
  const [x,y,z]=standing;
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   ok(occupied.has(K([x+dx,y-1,z+dz])),'ASCENT_UNSUPPORTED_'+station);
   for(let dy=0;dy<2;dy++)
    ok(!occupied.has(K([x+dx,y+dy,z+dz])),
     'ASCENT_BLOCKED_HEADROOM_'+station);
  }
  stations++;
 }
 return stations;
}
function validateInheritedFlatRoutes(scene){
 const occupied=new Set(scene.primitives.map(K));
 for(const [y,z,a,b] of [[14,7,10,112],[26,20,12,110]]){
  for(let x=a;x<=b+1;x++)for(let dz=0;dz<2;dz++){
   ok(occupied.has(K([x,y-1,z+dz])),'OLD_ROUTE_SUPPORT');
   ok(!occupied.has(K([x,y,z+dz]))&&
      !occupied.has(K([x,y+1,z+dz])),'OLD_ROUTE_BLOCKED');
  }
 }
 return {lowerMoves:102,upperMoves:98};
}
export function buildSkycanyon(){
 const parent=buildNebulaArkB173();
 const design=createSkycanyonModule();
 const addon=compileDesign(design);
 ok(verifyCompiled(design,addon),'MODULE_COMPILATION');
 const combined=compose(parent.compiled,addon,parent.design.id,design);
 const scene=combined.scene;
 const stations=validateStations(scene);
 const oldRoutes=validateInheritedFlatRoutes(scene);
 const report={
  schema:SCHEMA,modelId:scene.id,
  parentModelId:parent.design.id,
  parentGeometrySha256:parent.compiled.geometrySha256,
  parentSourceSha256:parent.compiled.sourceSha256,
  addonSourceSha256:addon.sourceSha256,
  addonGeometrySha256:addon.geometrySha256,
  combinedSourceSha256:scene.sourceSha256,
  combinedGeometrySha256:scene.geometrySha256,
  parentVoxels:parent.compiled.primitives.length,
  addedUnique3dVoxels:combined.newlyOccupied,
  overlappingVoxelsPreserved:combined.overlap,
  final3dVoxels:scene.primitives.length,
  originalElements:parent.design.elements.length,
  addedModuleElements:design.elements.length,
  totalAuthoredElements:parent.design.elements.length+design.elements.length,
  moduleCount:2,b143ModuleElementCap:160,
  moduleVoxelLimit:MAX_CELLS,combinedVoxelBudget:MAX_CELLS,
  ascentSupported2x2Stations:stations,ascentRequiresMinecraftVerification:true,
  continuous2x2VerticalRouteCertified:false,
  finalPlayerWalkingCertified:false,stairCollisionCertified:false,
  structuralSafetyCertified:false,fallRiskCertified:false,
  oldLowerFlat2x2Moves:oldRoutes.lowerMoves,
  oldUpperFlat2x2Moves:oldRoutes.upperMoves,
  historic36GalleryUnmodified:true,priorB172B173SourcesUnmodified:true,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 ok(verifySkycanyon(report),'REPORT_SAFETY_GATES');
 return {design,moduleCompiled:addon,parent,compiled:scene,report};
}
export function verifySkycanyon(r){
 return Boolean(r&&r.schema===SCHEMA&&r.modelId==='nebula-ark-skycanyon-transit'&&
  r.moduleCount===2&&r.b143ModuleElementCap===160&&
  r.originalElements===151&&r.addedModuleElements>=60&&
  r.addedModuleElements<=160&&
  r.totalAuthoredElements===r.originalElements+r.addedModuleElements&&
  r.addedUnique3dVoxels>=1000&&
  r.final3dVoxels===r.parentVoxels+r.addedUnique3dVoxels&&
  r.combinedSourceSha256?.length===64&&
  r.combinedGeometrySha256?.length===64&&
  r.combinedGeometrySha256!==r.parentGeometrySha256&&
  r.ascentSupported2x2Stations===15&&
  r.oldLowerFlat2x2Moves===102&&r.oldUpperFlat2x2Moves===98&&
  r.ascentRequiresMinecraftVerification===true&&
  r.continuous2x2VerticalRouteCertified===false&&
  r.finalPlayerWalkingCertified===false&&
  r.stairCollisionCertified===false&&r.structuralSafetyCertified===false&&
  r.fallRiskCertified===false&&r.historic36GalleryUnmodified===true&&
  r.priorB172B173SourcesUnmodified===true&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(g=>g==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
