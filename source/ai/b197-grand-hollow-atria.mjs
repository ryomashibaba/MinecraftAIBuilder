/**
 * B197 — RETURN TO NEBULA ARK: GRAND HOLLOW ATRIA.
 * The SEVENTEENTH independent STRICT B143 source module of the ORIGINAL
 * #37 NEBULA ARK, not a sixth separately named concept facility.
 * Builds three truly open grand entrance halls with four distinct
 * mezzanine levels and 2-wide, headroom-clear local gallery segments.
 * Preserves every historical voxel, predecessor floor seam and roof edge.
 * No Minecraft-world coordinates, APIs, construction approval or writes.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildCivicGates,auditCivicDistrictSegmentation,DISTRICTS} from './b188-civic-gates.mjs';
import {auditCivicSourceNetwork} from './b187-legible-civic.mjs';
import {HALLS} from './b180-atrium-arrivals.mjs';
export const SCHEMA='minecraftaibuilder-b197-main-grand-hollow-atrium-v1';
export const STANDING_LEVELS=Object.freeze([33,41,49,57]);
const SHA=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const guard=(v,s)=>{if(!v)throw Error('B197_'+s)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const ell=(id,center,radii,material='glass')=>({id,mode:'add',shape:'ellipsoid',center,radii,shell:1,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>({id,mode:'add',shape:'torus',center,axis:'z',majorRadius,tubeRadius,material});
const beam=(id,start,end,material='metal')=>({id,mode:'add',shape:'beam',start,end,thickness:1,material});
export function grandAtriumElements(){
 const e=[];
 const trim=['glow','accent','wood'];
 for(const [i,h] of HALLS.entries()){
  const x=h.centerX,p='b197-'+h.id[0],m=trim[i];
  e.push(
   // Differentiated giant glass SHELLS, not solid-filled dome interiors.
   ell(p+'-monumental-open-vault',[x,45,12],[10,15,8],'glass'),
   ell(p+'-high-sunlit-crown',[x,65,11],[9,10,8],'glass'),
   tor(p+'-great-illuminated-arch',[x,50,6],9,1,m),
   tor(p+'-high-city-identity-halo',[x,65,7],7,1,'glow'),
   beam(p+'-west-flying-arch',[x-11,31,4],[x-11,73,6],'metal'),
   beam(p+'-east-flying-arch',[x+11,31,4],[x+11,73,6],'metal'),
   box(p+'-western-ribbon-fin',[x-12,35,1],[2,34,3],m),
   box(p+'-eastern-ribbon-fin',[x+11,35,1],[2,34,3],m),
   box(p+'-lantern-roof-edge',[x-10,74,1],[21,1,6],'glass'),
   box(p+'-forward-sunshade',[x-10,70,1],[21,1,3],m),
   box(p+'-deep-underslung-glass',[x-9,29,5],[19,1,4],'glass')
  );
  // Civic four-level U-shaped open galleries. Two separated edge decks
  // preserve a huge central air void at z11..16; each Y+1 public
  // standing strip at z8..9 is a real source-verified 2x2 square.
  for(const [n,standing] of STANDING_LEVELS.entries()){
   const y=standing-1,k=p+'-L'+n;
   e.push(
    // New open-air front gallery above the original entrance portico.
    // Z1..3 is outside old rear/roof circulation and avoids the original
    // inherited facade shell at Z7..20; source tests still verify clearance.
    box(k+'-clear-forecourt',[x-8,y,1],[17,1,3],n%2?'glass':'concrete'),
    box(k+'-front-gallery',[x-8,y,7],[17,1,4],n%2?'wood':'concrete'),
    box(k+'-rear-observation',[x-8,y,17],[17,1,2],n%2?'accent':'glass'),
    box(k+'-side-balcony-west',[x-10,y,11],[3,1,7],m),
    box(k+'-side-balcony-east',[x+8,y,11],[3,1,7],m),
    box(k+'-underdeck-front-light',[x-7,y-2,5],[15,1,2],'glow')
   );
  }
  for(let n=0;n<5;n++){
   const xx=x-8+4*n;
   e.push(
    beam(p+'-front-arcade-lantern-'+n,[xx,30,3],[xx,72,3],n%2?'metal':'glow'),
    beam(p+'-deep-roof-truss-'+n,[xx,60,2],[xx,74,5],n%2?m:'metal')
   );
  }
  // Honest architectural hierarchy: each hall has a unique signature.
  if(i===0)e.push(
   beam('b197-north-aurora-needle',[x,38,2],[x,76,3],'glow'),
   box('b197-north-arcadian-brow',[x-8,61,2],[17,1,3],'accent'));
  if(i===1)e.push(
   ell('b197-central-sky-lantern',[x,67,8],[5,7,4],'accent'),
   box('b197-central-triple-canopy',[x-8,75,2],[17,1,5],'glass'));
  if(i===2)e.push(
   tor('b197-south-sunset-signet',[x,58,5],10,1,'accent'),
   box('b197-south-civic-banner',[x-8,72,2],[17,1,3],'wood'));
 }
 // Monumental continuous luminous front horizon. Purely visible external
 // architecture, cannot intersect B180/184/186 gallery z25..43.
 e.push(
  box('b197-citywide-high-lantern-rim',[12,72,0],[104,1,2],'glow'),
  box('b197-citywide-mid-transit-crest',[12,52,0],[104,1,2],'accent'),
  box('b197-citywide-midfloor-rim',[12,44,0],[104,1,2],'glass'),
  box('b197-citywide-low-city-rail',[12,36,0],[104,1,2],'metal')
 );
 guard(e.length>=110&&e.length<=160,'ARCHITECTURAL_MODULE_PARTS_'+e.length);
 guard(new Set(e.map(x=>x.id)).size===e.length,'DUPLICATE_GENUINE_PARTS');
 return e;
}
export function createGrandAtriumModule(){
 const d={schema:DSL,id:'nebula-ark-b197-grand-hollow-atrium',
  title:'NEBULA ARK — GRAND HOLLOW ATRIA / OPEN VERTICAL EXPLORATION',
  brief:'元のNEBULA ARK三大ホールに吹抜け、天空アーチ、4層のU字展望回廊を増築。既存ソース通路を保全し施工と実歩行は未認証。',
  designOnly:true,bounds:{width:124,height:78,depth:50},
  elements:grandAtriumElements()};
 validateDesign(d);return d;
}
function analyzeOpenGalleries(compiled){
 const occupied=new Set(compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 const floor=(x,y,z)=>{
  for(let a=0;a<2;a++)for(let b=0;b<2;b++){
   const xx=x+a,zz=z+b;
   if(!occupied.has(K(xx,y-1,zz))||
    occupied.has(K(xx,y,zz))||occupied.has(K(xx,y+1,zz)))return false;
  }
  return true;
 };
 const sections=[];
 for(const hall of HALLS)for(const y of STANDING_LEVELS){
  // Keep every original voxel and search only EXISTING source-supported
  // floor/headroom squares within the actually authored front galleries.
  // Unverified/blocked spans never become fictitious route edges.
  let best=null;
  for(const z of [1,2,7,8,9]){
   let start=null;
   const found=[];
   for(let x=hall.centerX-8;x<=hall.centerX+6;x++){
    if(floor(x,y,z)){if(start===null)start=x;}
    else if(start!==null){found.push([start,x-1]);start=null;}
   }
   if(start!==null)found.push([start,hall.centerX+6]);
   for(const [a,b] of found){
    const length=b-a+1;
    if(!best||length>best.length)best={z,startX:a,endX:b,length};
   }
  }
  // This is an architectural design proposal. A sealed inherited wall or
  // glass atrium can legitimately prevent a usable new continuous balcony.
  // Such floors remain explicit HOLD, rather than deleting old geometry.
  const verified=best?.length>=4;
  sections.push({hall:hall.id,standingY:y,
   proposedGallery:true,
   auditStatus:verified?'SOURCE_SUPPORTED_LOCAL_SPAN':'HOLD_BLOCKED_BY_INHERITED_GEOMETRY',
   verifiedSourceStartX:verified?best.startX:null,
   verifiedSourceEndX:verified?best.endX:null,
   actualSourceZ:verified?best.z:null,
   supportedSourceOnlyFootprints:verified?best.length:0,
   continuousHorizontalEdges:verified?best.length-1:0,
   bodyAndHeadUnobstructed:verified,
   physicalAccessNotCertified:true});
 }
 const edges=sections.reduce((n,p)=>n+p.continuousHorizontalEdges,0);
 const verified=sections.filter(x=>x.auditStatus==='SOURCE_SUPPORTED_LOCAL_SPAN').length;
 return {gallerySourceLevels:sections,attemptedFourTierHallGalleries:sections.length,
  sourceVerifiedLocalGalleries:verified,
  heldInaccessibleLocalGalleries:sections.length-verified,
  horizontalSourceVerifiedEdges:edges,
  localPathSha256:SHA(sections),
  realVerticalConnectionsCertified:false};
}
function extend(old,addon,design){
 const map=new Map(old.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let newCells=0,already=0;
 for(const p of addon.primitives){
  const k=K(p[0],p[1],p[2]);
  if(map.has(k)){already++;continue}
  map.set(k,p);newCells++;
 }
 guard(newCells>=1200&&newCells<=MAX_CELLS-old.primitives.length,
  'SOURCE_CAPACITY_OR_QUALITY_'+newCells);
 const primitives=[...map.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 guard(primitives.length<=MAX_CELLS,'ORIGINAL_160K_LIMIT_RETAINED');
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const materials=Object.fromEntries(MATERIALS.map(v=>[v,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  materials[MATERIALS[p[3]]]++;
 }
 guard(bounds.maxX<=123&&bounds.maxY<=77&&bounds.maxZ<=49,'HISTORIC_MAIN_ENVELOPE');
 const sourceSha256=SHA({schema:SCHEMA,inherited:old.sourceSha256,extra:addon.sourceSha256,
  merge:'strictly-add-only-parent-priority'});
 const geometrySha256=SHA({sourceSha256,primitives});
 const compiled={...old,
  id:'nebula-ark-grand-hollow-atria',
  title:'NEBULA ARK — 三大吹抜けの巨大入口と空中U字ギャラリー',
  brief:'本館三大ホールの外観・大きな吹抜け・4層の空中回廊を元の都市建築へ増築。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...old.stats,voxels:primitives.length,
   layerCounts:materials,moduleCount:17,
   designOperations:[...old.stats.designOperations,
    ...addon.stats.designOperations.map(o=>({...o,module:design.id}))]}};
 return {compiled,newCells,already};
}
export function buildB197(){
 const original=buildCivicGates(),design=createGrandAtriumModule(),
  addon=compileDesign(design);
 guard(verifyCompiled(design,addon),'STRICT_B143_ARCHITECTURE_REJECTED');
 const {compiled,newCells,already}=extend(original.compiled,addon,design);
 const net=auditCivicSourceNetwork(compiled);
 const city=auditCivicDistrictSegmentation(compiled);
 const atria=analyzeOpenGalleries(compiled);
 guard(net.joinedVertices===21&&net.verifiedEdges===30,
  'ORIGINAL_21_WAYPOINT_AND_30_ROUTE_PROOF_LOST');
 guard(city.checkedCrossDistrict2WideSeams===12&&city.verifiedExactReassembly,
  'ORIGINAL_TWELVE_SEAMS_OR_LOSSLESS_DISTRICTS_LOST');
 guard(atria.attemptedFourTierHallGalleries===12&&
  atria.sourceVerifiedLocalGalleries+atria.heldInaccessibleLocalGalleries===12,
  'NOT_REAL_ATRIUM_GALLERY_FLOORS');
 const report={
  schema:SCHEMA,originalMainArchitecture:'NEBULA ARK #37',
  originalB188MainVoxels:original.compiled.primitives.length,
  newActualSourceOccupiedCells:newCells,
  sourceCellsAfterExpansion:compiled.primitives.length,
  remainingMain160kCells:MAX_CELLS-compiled.primitives.length,
  originalSourceUnchanged:true,existingOldCellsOverwritten:0,
  inheritedMainGeometrySha256:original.compiled.geometrySha256,
  original36GalleryModelsUntouched:true,oldB172ThroughB196FilesUnchanged:true,
  historicInheritedIndependentMainModules:16,
  newStrictB143MainModules:1,mainStrictModuleCount:17,
  newSourceArchitecturalParts:design.elements.length,
  newIndependentOriginalBuildings:0,
  originalSourceProtectedWaypoints:net.joinedVertices,
  originalSourceProtectedNetworkEdges:net.verifiedEdges,
  originalInterdistrictSourceSeams:city.checkedCrossDistrict2WideSeams,
  attemptedNewGalleryHallLevels:atria.attemptedFourTierHallGalleries,
  newGeometryVerifiedLocalGalleryLevels:atria.sourceVerifiedLocalGalleries,
  newGalleryClearanceHeldLevels:atria.heldInaccessibleLocalGalleries,
  gallerySourceOnlyHorizontalEdges:atria.horizontalSourceVerifiedEdges,
  galleryProofSha256:atria.localPathSha256,
  compiledSourceSha256:compiled.sourceSha256,
  compiledGeometrySha256:compiled.geometrySha256,
  individualModelSourceCellCap:MAX_CELLS,
  originalFiveSeparateBuildingsStillFive:true,
  noCombinedB143Monolith:true,
  newHollowGalleriesNotPhysicallyConnectedCertified:true,
  actualMinecraftWalkingCertified:false,actualFallProtectionCertified:false,
  worldContacts:0,worldWrites:0,worldCoordinates:null,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 guard(verifyB197Report(report),'SOURCE_SAFETY_NOT_PREPARED');
 return {original,design,addon,compiled,net,city,atria,report};
}
export function verifyB197Report(r){
 return Boolean(r&&r.schema===SCHEMA&&r.originalMainArchitecture==='NEBULA ARK #37'&&
  r.originalB188MainVoxels===142773&&
  r.newActualSourceOccupiedCells>=1200&&
  r.sourceCellsAfterExpansion===r.originalB188MainVoxels+r.newActualSourceOccupiedCells&&
  r.sourceCellsAfterExpansion<=MAX_CELLS&&
  r.remainingMain160kCells===MAX_CELLS-r.sourceCellsAfterExpansion&&
  r.originalSourceUnchanged===true&&r.existingOldCellsOverwritten===0&&
  r.inheritedMainGeometrySha256?.length===64&&
  r.original36GalleryModelsUntouched===true&&r.oldB172ThroughB196FilesUnchanged===true&&
  r.historicInheritedIndependentMainModules===16&&
  r.newStrictB143MainModules===1&&r.mainStrictModuleCount===17&&
  r.newSourceArchitecturalParts>=110&&r.newSourceArchitecturalParts<=160&&
  r.newIndependentOriginalBuildings===0&&
  r.originalSourceProtectedWaypoints===21&&r.originalSourceProtectedNetworkEdges===30&&
  r.originalInterdistrictSourceSeams===12&&
  r.attemptedNewGalleryHallLevels===12&&
  r.newGeometryVerifiedLocalGalleryLevels>=0&&
  r.newGalleryClearanceHeldLevels>=0&&
  r.newGeometryVerifiedLocalGalleryLevels+r.newGalleryClearanceHeldLevels===12&&
  r.gallerySourceOnlyHorizontalEdges>=0&&r.galleryProofSha256?.length===64&&
  r.compiledSourceSha256?.length===64&&r.compiledGeometrySha256?.length===64&&
  r.compiledGeometrySha256!==r.inheritedMainGeometrySha256&&
  r.individualModelSourceCellCap===MAX_CELLS&&
  r.originalFiveSeparateBuildingsStillFive===true&&r.noCombinedB143Monolith===true&&
  r.newHollowGalleriesNotPhysicallyConnectedCertified===true&&
  r.actualMinecraftWalkingCertified===false&&r.actualFallProtectionCertified===false&&
  r.worldContacts===0&&r.worldWrites===0&&r.worldCoordinates===null&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
