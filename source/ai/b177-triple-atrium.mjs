/**
 * B177 — NEBULA ARK: TRIPLE ATRIUM SPINE.
 * Fifth STRICT independent B143 module. Adds genuinely new multi-level
 * peripheral galleries around the three B176 cathedrals, a continuous
 * elevated ~100-move front roof promenade, large glazed vaults and true
 * cross-terminal bridges. This file NEVER emits Minecraft world commands.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,
 validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {buildAuroraCathedral,analyzeAuroraTransit}
 from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b177-triple-atrium-spine-v1';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const requireSafe=(v,why)=>{if(!v)throw Error('B177_'+why)};
const box=(id,origin,size,material='metal')=>
 ({id,shape:'box',mode:'add',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,shape:'beam',mode:'add',start,end,thickness,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow',axis='y')=>
 ({id,shape:'torus',mode:'add',center,axis,majorRadius,tubeRadius,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,shape:'ellipsoid',mode:'add',center,radii,material,shell});
export const ZONES=Object.freeze([
 Object.freeze({id:'north',cx:24,x:11,w:27}),
 Object.freeze({id:'core',cx:62,x:47,w:31}),
 Object.freeze({id:'south',cx:101,x:88,w:27})
]);
export const ATRIUM_TIERS=Object.freeze([60,64,68,72]);
/** Every tier is a genuine perimeter gallery, NOT a solid filled hall slab. */
export function atriumSpineElements(){
 const e=[
  // TRUE flat upper roof promenade. Two-cell headroom is checked below.
  box('b177-roof-public-spine',[9,74,0],[108,1,7],'concrete'),
  box('b177-roof-front-rail',[9,75,0],[108,2,1],'glass'),
  box('b177-roof-rear-rail',[9,75,7],[108,2,1],'glass'),
  box('b177-front-accent-lip',[9,73,7],[108,1,3],'glow')
 ];
 for(const z of ZONES){
  for(const [i,y] of ATRIUM_TIERS.entries()){
   const prefix='b177-'+z.id+'-tier-'+i;
   e.push(
    box(prefix+'-front-gallery',[z.x,y,28],[z.w,1,3],
      i%2===0?'accent':'concrete'),
    box(prefix+'-rear-gallery',[z.x,y,43],[z.w,1,3],
      i%2===0?'wood':'glass'),
    box(prefix+'-west-wing',[z.x,y,31],[3,1,12],'metal'),
    box(prefix+'-east-wing',[z.x+z.w-3,y,31],[3,1,12],'metal')
   );
  }
  e.push(
   // The central volumes remain partly open as multi-storey atria.
   tor('b177-'+z.id+'-aurora-overring',
    [z.cx,73,36],11,1,'glow','y'),
   tor('b177-'+z.id+'-interior-orbit',
    [z.cx,65,36],7,1,'accent','z'),
   ell('b177-'+z.id+'-prism-vault',
    [z.cx,72,35],z.id==='core'?[15,5,10]:[13,5,10],'glass',1),
   box('b177-'+z.id+'-sky-viewing-station',
    [z.x+4,70,27],[z.w-8,1,6],'wood')
  );
  // Monumental rib rhythm, a spatially legible structural-like language.
  for(let n=0;n<4;n++){
   const x=z.x+3+n*6;
   e.push(
    beam('b177-'+z.id+'-front-pylon-'+n,
     [x,56,27],[x,73,29],n%2?'accent':'metal',1),
    // Stand above the inherited Y57 2-wide rear public promenade.
    beam('b177-'+z.id+'-rear-pylon-'+n,
     [x,60,46],[x,74,43],n%2?'glow':'metal',1)
   );
  }
 }
 e.push(
  // Bridge slabs cross source-true gaps, not merely drawn viewer lines.
  box('b177-west-high-crossing',[35,72,28],[16,1,4],'glass'),
  box('b177-east-high-crossing',[74,72,28],[18,1,4],'glass'),
  box('b177-west-mid-crossing',[35,68,36],[16,1,4],'metal'),
  box('b177-east-mid-crossing',[74,68,36],[18,1,4],'metal'),
  beam('b177-central-north-diagonal',[32,58,26],[53,75,32],'accent',1),
  beam('b177-central-south-diagonal',[91,58,26],[72,75,32],'accent',1)
 );
 requireSafe(e.length>=75&&e.length<=160,'MODULE_ELEMENT_COUNT');
 requireSafe(new Set(e.map(x=>x.id)).size===e.length,'DUPLICATE_ID');
 return e;
}
export function createTripleAtriumModule(){
 const design={schema:DSL,id:'nebula-ark-triple-atrium-module',
  title:'NEBULA ARK — TRIPLE ATRIUM SPINE',
  brief:'既存巨大施設に四層の環状回廊、3つの本物の巨大空洞、天空展望帯、複数の空中橋、巨大ガラスヴォールトを独立設計モジュールで増築。施工と実機衝突は未認証。',
  bounds:{width:124,height:78,depth:50},
  elements:atriumSpineElements(),designOnly:true};
 validateDesign(design);return design;
}
const occupied=scene=>new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
function checkFlat(occ,{x0,x1,y,z}){
 const violations=[];
 for(let x=x0;x<=x1+1;x++)for(let dz=0;dz<2;dz++){
  if(!occ.has(K(x,y-1,z+dz)))
   violations.push('FLOOR@'+K(x,y-1,z+dz));
  for(let dy=0;dy<2;dy++)
   if(occ.has(K(x,y+dy,z+dz)))
    violations.push('BODY@'+K(x,y+dy,z+dz));
 }
 requireSafe(violations.length===0,
  '2WIDE_ROUTE_'+y+'_'+z+'_'+violations.slice(0,15).join('|')+
  '_FAILURES_'+violations.length);
 return x1-x0;
}
export function auditTripleAtrium(scene){
 const occ=occupied(scene);
 const inherited=[
  {x0:10,x1:112,y:14,z:7},
  {x0:12,x1:110,y:26,z:20},
  {x0:12,x1:112,y:60,z:3},
  {x0:12,x1:118,y:57,z:45}
 ];
 const prior2wideMoves=inherited.map(r=>checkFlat(occ,r));
 const roof2wideMoves=checkFlat(occ,
  {x0:12,x1:112,y:75,z:2});
 const courtyardAir=[];
 // Count actual clear void cells in the ring centers above a real
 // building floor. Geometry-only; no player collision claim.
 for(const zone of ZONES){
  let voidCells=0,checked=0;
  for(let x=zone.cx-5;x<=zone.cx+5;x++)
   for(let y=61;y<=71;y++)
    for(let z=34;z<=40;z++){
     checked++;
     if(!occ.has(K(x,y,z)))voidCells++;
    }
  requireSafe(voidCells>=100,'ATRIUM_VOID_FILLED_'+zone.id+'_'+voidCells);
  courtyardAir.push({id:zone.id,airCells:voidCells,inspectedCells:checked,
   emptyFraction:Math.round(1000*voidCells/checked)/1000});
 }
 return {oldFlat2wideMoves:prior2wideMoves,
  newRoof2wideMoves:roof2wideMoves,
  roofStandingY:75,roofZ:2,
  atriumHollowMetrics:courtyardAir,
  galleryLevels:[...ATRIUM_TIERS],
  actualPlayerWalkingCertified:false,
  physicalInterfloorTraversalCertified:false,
  fallSafetyCertified:false,
  realMinecraftCollisionCertified:false};
}
function mergeSource(parent,addon,design){
 const cells=new Map(parent.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let novel=0,overlap=0;
 for(const p of addon.primitives){
  const key=K(p[0],p[1],p[2]);
  if(cells.has(key)){overlap++;continue;}
  cells.set(key,p);novel++;
 }
 requireSafe(novel>=2000,'NO_NEW_PUBLIC_ARCHITECTURE');
 requireSafe(cells.size<=MAX_CELLS,'GLOBAL_VOXEL_CAP');
 const primitives=[...cells.values()].sort((a,b)=>a[1]-b[1]||
  a[2]-b[2]||a[0]-b[0]);
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 const counts=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);}
  counts[MATERIALS[p[3]]]++;
 }
 requireSafe(hi[0]<124&&hi[1]<78&&hi[2]<50,'BOUNDS');
 const sourceSha256=sha({schema:SCHEMA,base:parent.sourceSha256,
  addon:addon.sourceSha256,method:'parent-precedence'});
 const geometrySha256=sha({sourceSha256,primitives});
 return {compiled:{...parent,id:'nebula-ark-triple-atrium-spine',
  title:'NEBULA ARK — TRIPLE ATRIUM SPINE / 巨大環状展望回廊',
  brief:'実三次元構造で構成された三大中空アトリウム、四層の空中回廊と超巨大展望帯。',
  primitives,sourceSha256,geometrySha256,
  bounds:{minX:lo[0],maxX:hi[0],minY:lo[1],maxY:hi[1],
   minZ:lo[2],maxZ:hi[2]},
  levels:Math.floor(hi[1]/5)+1,
  stats:{...parent.stats,voxels:primitives.length,
   layerCounts:counts,moduleCount:5,
   designOperations:[...parent.stats.designOperations,
    ...addon.stats.designOperations.map(o=>({...o,module:design.id}))]}},
  novel,overlap};
}
export function buildTripleAtrium(){
 const parent=buildAuroraCathedral(),design=createTripleAtriumModule(),
  addon=compileDesign(design);
 requireSafe(verifyCompiled(design,addon),'B143_SOURCE_VERIFICATION');
 const merged=mergeSource(parent.compiled,addon,design);
 const audit=auditTripleAtrium(merged.compiled);
 // Recheck all inherited geometric stair station-seams; a new roof
 // vault may not cut off an earlier transit path.
 const ascents=analyzeAuroraTransit(merged.compiled);
 const r={schema:SCHEMA,modelId:merged.compiled.id,
  sourceSha256:merged.compiled.sourceSha256,
  geometrySha256:merged.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  moduleSourceSha256:addon.sourceSha256,
  inherited3dVoxels:parent.compiled.primitives.length,
  newlyOccupied3dVoxels:merged.novel,
  final3dVoxels:merged.compiled.primitives.length,
  overlapCellsPreserved:merged.overlap,
  inheritedElements:parent.report.totalElements,
  newElements:design.elements.length,
  totalElements:parent.report.totalElements+design.elements.length,
  independentlyValidatedModules:5,b143ElementsPerModuleCap:160,
  globalOccupiedVoxelCap:MAX_CELLS,
  original2WideMoves:audit.oldFlat2wideMoves,
  newUpper2WideMoves:audit.newRoof2wideMoves,
  newAtriumAirMetrics:audit.atriumHollowMetrics,
  newGalleryTierHeights:audit.galleryLevels,
  inheritedNewStairSeams:ascents.newAdjacentMixedHeightSeams,
  realPlayerWalkingCertified:false,
  realInterfloorTraversalCertified:false,
  realMinecraftCollisionCertified:false,
  fallSafetyCertified:false,structuralStabilityCertified:false,
  historic36Untouched:true,B172ToB176Unmodified:true,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 requireSafe(verifyTripleAtriumReport(r),'SECURITY_REPORT');
 return {parent,design,addon,compiled:merged.compiled,audit,report:r};
}
export function verifyTripleAtriumReport(r){
 return Boolean(r&&r.schema===SCHEMA&&
  r.modelId==='nebula-ark-triple-atrium-spine'&&
  r.independentlyValidatedModules===5&&r.b143ElementsPerModuleCap===160&&
  r.globalOccupiedVoxelCap===MAX_CELLS&&
  r.inherited3dVoxels===77677&&r.newlyOccupied3dVoxels>=2000&&
  r.final3dVoxels===r.inherited3dVoxels+r.newlyOccupied3dVoxels&&
  r.inheritedElements===357&&r.newElements>=75&&r.newElements<=160&&
  r.totalElements===r.inheritedElements+r.newElements&&
  r.sourceSha256?.length===64&&r.geometrySha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  JSON.stringify(r.original2WideMoves)==='[102,98,100,106]'&&
  r.newUpper2WideMoves===100&&
  r.inheritedNewStairSeams===17&&
  r.newGalleryTierHeights?.join(',')==='60,64,68,72'&&
  r.newAtriumAirMetrics?.length===3&&
  r.newAtriumAirMetrics.every(x=>x.airCells>=100)&&
  r.realPlayerWalkingCertified===false&&
  r.realInterfloorTraversalCertified===false&&
  r.realMinecraftCollisionCertified===false&&
  r.fallSafetyCertified===false&&r.structuralStabilityCertified===false&&
  r.historic36Untouched===true&&r.B172ToB176Unmodified===true&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(v=>v==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
