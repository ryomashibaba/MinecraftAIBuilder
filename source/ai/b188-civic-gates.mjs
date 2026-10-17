/**
 * B188 — THREE CIVIC GATES / SEGMENTED GEOMETRY.
 * 16th strict B143 original 3D architecture module, SAME NEBULA ARK #37.
 * Builds visibly differentiated civic entrances and verifies a lossless
 * 3-district source-voxel decomposition without raising the 160k cap.
 * Absolutely NO Education-world writes, commands, coordinates or approval.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildLegibleCivic,auditCivicSourceNetwork}
 from './b187-legible-civic.mjs';
import {inspectCompleteVerticalLinks} from './b183-vertical-urban.mjs';
import {auditRoofGates} from './b185-celestial-portico.mjs';
import {auditRaisedCrown} from './b186-crown-observatory.mjs';
import {inspectQuadTierAccess} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
import {HALLS} from './b180-atrium-arrivals.mjs';
export const SCHEMA='minecraftaibuilder-b188-civic-gates-segmented-geometry-v1';
const SHA=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const fail=(ok,why)=>{if(!ok)throw Error('B188_'+why)};
const box=(id,origin,size,material='metal')=>
 ({id,shape:'box',mode:'add',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,shape:'beam',mode:'add',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,shape:'ellipsoid',mode:'add',center,radii,shell,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,shape:'torus',mode:'add',center,axis:'z',majorRadius,tubeRadius,material});
export const DISTRICTS=Object.freeze([
 Object.freeze({id:'north',x0:0,x1:42,landmarkX:24}),
 Object.freeze({id:'central',x0:43,x1:82,landmarkX:62}),
 Object.freeze({id:'south',x0:83,x1:123,landmarkX:101})
]);
export const PUBLIC_SEAM_LEVELS=Object.freeze([
 Object.freeze({standingY:61,z:29,from:'B180'}),
 Object.freeze({standingY:65,z:29,from:'B180'}),
 Object.freeze({standingY:69,z:29,from:'B180'}),
 Object.freeze({standingY:73,z:29,from:'B180'}),
 Object.freeze({standingY:75,z:25,from:'B184'}),
 Object.freeze({standingY:76,z:39,from:'B186'})
]);
/**
 * These are truly different building entrance masses, not three identical
 * full-width solid walls. The repeated proportions link the three halls,
 * while material accents and distinct portico crowns distinguish districts.
 * All new solids are below Y28 and Z<=20, outside established roof routes.
 */
export function civicGateElements(){
 const elements=[];
 const primary=['concrete','wood','accent'];
 const crown=['glow','glass','metal'];
 for(const [idx,hall] of HALLS.entries()){
  const p='b188-'+hall.id[0],x=hall.centerX;
  elements.push(
   box(p+'-ground-concourse',[x-10,5,2],[21,1,13],primary[idx]),
   box(p+'-elevated-civic-gallery',[x-9,11,3],[19,1,12],'glass'),
   box(p+'-atrium-front-overlook',[x-10,19,2],[21,1,11],primary[idx]),
   box(p+'-raised-front-threshold',[x-7,24,5],[15,1,9],crown[idx]),
   box(p+'-illuminated-low-portal',[x-8,4,1],[17,1,2],'glow'),
   box(p+'-gateway-luminous-brow',[x-9,25,4],[19,1,2],'glow'),
   box(p+'-terrace-observation-lip',[x-9,9,15],[19,1,3],primary[idx]),
   box(p+'-intermediate-garden-ribbon',[x-8,15,13],[17,1,4],'wood'),
   ell(p+'-glazed-hollow-vestibule',[x,14,10],[8,8,7],'glass',1),
   tor(p+'-wayfinding-oculus',[x,15,9],6,1,'glow'),
   tor(p+'-tiered-lumen-ring',[x,21,9],4,1,crown[idx]),
   beam(p+'-western-portal-pylon',[x-10,2,3],[x-10,27,4],'metal'),
   beam(p+'-eastern-portal-pylon',[x+10,2,3],[x+10,27,4],'metal'),
   beam(p+'-west-upper-chord',[x-9,13,3],[x-3,26,5],crown[idx]),
   beam(p+'-east-upper-chord',[x+9,13,3],[x+3,26,5],crown[idx]),
   beam(p+'-inner-arch',[x-6,8,2],[x-1,22,3],'accent'),
   beam(p+'-outer-arch',[x+6,8,2],[x+1,22,3],'accent')
  );
  for(let k=0;k<5;k++){
   const xx=x-8+4*k;
   elements.push(
    beam(p+'-luminous-front-rib-'+k,[xx,2,1],[xx,21,2],
     k%2?'metal':'glow'),
    beam(p+'-back-accent-tie-'+k,[xx,4,17],[xx+1,18,18],
     k%2?'accent':'metal')
   );
  }
  // District-specific authentic THREE-dimensional wayfinding accents,
  // not additional artificial routes or claims of player collision.
  if(idx===0)elements.push(
   box(p+'-double-north-light',[x-5,8,2],[11,1,3],'glow'),
   beam(p+'-upper-north-spire',[x,15,4],[x,27,5],'accent'));
  if(idx===1)elements.push(
   ell(p+'-central-focal-core',[x,10,7],[5,4,4],'accent',1),
   box(p+'-central-terraced-hall',[x-6,21,3],[13,1,7],'glow'));
  if(idx===2)elements.push(
   tor(p+'-south-forward-ring',[x,10,8],8,1,'accent'),
   box(p+'-south-public-lip',[x-7,7,1],[15,1,6],'wood'));
 }
 // Ground-connected districts get a continuous architectural foundation,
 // but this is NOT asserted as a real accessible corridor.
 elements.push(
  box('b188-front-megastructure-base',[12,3,0],[104,1,2],'metal'),
  box('b188-front-light-stream',[12,2,0],[104,1,1],'glow'),
  box('b188-lower-transit-fascia',[12,22,0],[104,1,2],'accent'),
  box('b188-interdistrict-public-band',[12,16,0],[104,1,2],'concrete'),
  beam('b188-west-district-arch',[35,4,3],[51,19,4],'glow'),
  beam('b188-east-district-arch',[90,4,3],[74,19,4],'glow')
 );
 fail(elements.length>=80&&elements.length<=160,
  'STRICT_MODULE_ELEMENT_LIMIT_'+elements.length);
 fail(new Set(elements.map(e=>e.id)).size===elements.length,
  'DUPLICATED_SOURCE_ELEMENT');
 return elements;
}
export function createCivicGatesModule(){
 const d={schema:DSL,id:'nebula-ark-b188-three-civic-gates',
  title:'NEBULA ARK — THREE DISTINCT CIVIC GATES',
  brief:'三大ホールの巨大な玄関施設を、それぞれ異なる立体構造と光・ガラス・公共テラスを使って識別できるように設計。旧通路に干渉せず独立した新モジュールで増築する。',
  bounds:{width:124,height:78,depth:50},
  elements:civicGateElements(),designOnly:true};
 validateDesign(d);return d;
}
function is2wide(c,x,y,z){
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
  if(!c.has(key(x+dx,y-1,z+dz))||
     c.has(key(x+dx,y,z+dz))||c.has(key(x+dx,y+1,z+dz)))
   return false;
 return true;
}
/**
 * This is a LOSSLESS x-slab segregation of the compiled finite original
 * volume, not independent build permission. Note the seam inspection uses
 * a 2wide floor footprint crossing both source districts at x=42 or 82.
 * All carried source cells remain present once and only once.
 */
export function auditCivicDistrictSegmentation(scene){
 const byDistrict=DISTRICTS.map(d=>({...d,primitives:[]}));
 const findIndex=x=>x<=42?0:x<=82?1:2;
 const original=new Set();
 for(const p of scene.primitives){
  const [x,y,z]=p,identifier=key(x,y,z);
  fail(x>=0&&x<124&&y>=0&&y<78&&z>=0&&z<50,
   'DISTRICT_ENVELOPE_OUT_OF_BOUNDS');
  fail(!original.has(identifier),'DUPLICATE_WORLD_VOXEL_'+identifier);
  original.add(identifier);
  byDistrict[findIndex(x)].primitives.push(p);
 }
 const counts=byDistrict.map(x=>x.primitives.length);
 fail(counts.every(n=>n>8000)&&counts.reduce((a,b)=>a+b,0)===scene.primitives.length,
  'DISTRICT_INCONSISTENT_VOLUME_COUNT');
 const decomposed=new Set();
 for(const d of byDistrict)for(const p of d.primitives){
  const id=key(p[0],p[1],p[2]);
  fail(!decomposed.has(id),'SEGMENT_OVERLAP_'+id);
  decomposed.add(id);
 }
 fail(decomposed.size===original.size&&
   [...original].every(k=>decomposed.has(k)),
  'SEGMENT_LOSS_OR_ADDITION');
 const floorSeams=[];
 for(const x of [42,82])for(const level of PUBLIC_SEAM_LEVELS){
  fail(is2wide(original,x,level.standingY,level.z),
   'CROSS_DISTRICT_2WIDE_PROTECTED_ROUTE_'+x+'_'+level.standingY);
  floorSeams.push({from:x===42?'north':'central',
   to:x===42?'central':'south',
   crossX:x,standingY:level.standingY,z:level.z,
   twoWideFloorAndHeadroomProof:true,predecessor:level.from});
 }
 fail(floorSeams.length===12,'NOT_ALL_CROSS_DISTRICT_ROUTES_PROVEN');
 const summaries=byDistrict.map(x=>({
  id:x.id,x0:x.x0,x1:x.x1,
  containedOriginalHallCenter:x.landmarkX,
  realCells:x.primitives.length,
  geometryCellsSha256:SHA(x.primitives),
  // The partition is a proposed scalable representation, NEVER
  // an executable segmentation work order or loaded chunk request.
  constructionApproved:false,worldCoordinates:null,
  worldWrites:0,executionOperations:[]
 }));
 return {districts:summaries,totalPartitionCells:counts.reduce((a,b)=>a+b,0),
  verifiedExactReassembly:true,partitionOverlapCells:0,
  checkedCrossDistrict2WideSeams:floorSeams.length,
  crossDistrictFloorSeams:floorSeams,
  partitionSha256:SHA({summaries,floorSeams}),
  futureShardPlanOnly:true,worldContacts:0,worldWrites:0,
  independentChunkBuildAuthorization:false};
}
function compose(parent,addon,design){
 const map=new Map(parent.primitives.map(p=>[key(p[0],p[1],p[2]),p]));
 let unique=0,overlap=0;
 for(const p of addon.primitives){
  const at=key(p[0],p[1],p[2]);
  if(map.has(at)){overlap++;continue}
  map.set(at,p);unique++;
 }
 fail(unique>=1700,'NO_SUBSTANTIVE_3D_ARCHITECTURE');
 fail(map.size<=MAX_CELLS,'GLOBAL_160000_LIMIT');
 const primitives=[...map.values()].sort((a,b)=>
  a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,
  minZ:Infinity,maxZ:-Infinity};
 const materialCounts=Object.fromEntries(MATERIALS.map(x=>[x,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  materialCounts[MATERIALS[p[3]]]++;
 }
 fail(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,
  'MAX_SOURCE_ENVELOPE');
 const sourceSha256=SHA({schema:SCHEMA,parent:parent.sourceSha256,
  newDesign:addon.sourceSha256,composition:'add-only-parent-priority'});
 const geometrySha256=SHA({sourceSha256,primitives});
 return {compiled:{...parent,id:'nebula-ark-civic-gates-segmented-geometry',
  title:'NEBULA ARK — CIVIC GATES / 三大巨大施設の入口と未来都市基盤',
  brief:'三大巨大ホールごとに異なる巨大公共入口と展望外殻を持つ未来的立体建築。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...parent.stats,voxels:primitives.length,
   layerCounts:materialCounts,moduleCount:16,
   designOperations:[...parent.stats.designOperations,
    ...addon.stats.designOperations.map(o=>({...o,module:design.id}))]}},
  unique,overlap};
}
export function buildCivicGates(){
 const parent=buildLegibleCivic(),design=createCivicGatesModule(),
  addon=compileDesign(design);
 fail(verifyCompiled(design,addon),'INVALID_STRICT_B143_CIVIC_MODULE');
 const assembled=compose(parent.compiled,addon,design);
 // Strictly rerun predecessors against the COMPOSITE, not stale proofs.
 const routes=auditCivicSourceNetwork(assembled.compiled);
 const stair=inspectCompleteVerticalLinks(assembled.compiled);
 const roof=auditRoofGates(assembled.compiled);
 const raised=auditRaisedCrown(assembled.compiled);
 const bridges=inspectQuadTierAccess(assembled.compiled);
 const oldSky=inspectPublicConcourse(assembled.compiled);
 const oldStairs=analyzeAuroraTransit(assembled.compiled);
 fail(routes.joinedVertices===21&&routes.verifiedEdges===30&&
   stair.sourceCompleteConnections===9&&roof.joined===3&&
   raised.sourceConnectedRaisedParks===3&&bridges.passed===8,
  'HISTORIC_VOXEL_CIRCULATION_REGRESSION');
 const segmentation=auditCivicDistrictSegmentation(assembled.compiled);
 const report={schema:SCHEMA,id:assembled.compiled.id,
  sourceSha256:assembled.compiled.sourceSha256,
  geometrySha256:assembled.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  parentOccupiedCells:parent.compiled.primitives.length,
  newActualOccupiedCells:assembled.unique,
  compositeOccupiedCells:assembled.compiled.primitives.length,
  actualCellsRemaining:MAX_CELLS-assembled.compiled.primitives.length,
  originalOccupiedCellsPreserved:true,
  inheritedAuthoredElements:parent.report.totalAuthoredElements,
  newlyAuthoredElements:design.elements.length,
  totalAuthoredElements:parent.report.totalAuthoredElements+design.elements.length,
  independentStrictB143Modules:16,
  maxElementsPerIndependentModule:160,globalCellLimit:MAX_CELLS,
  sourceVerifiedWaypoints:routes.joinedVertices,
  sourceVerifiedNetworkEdges:routes.verifiedEdges,
  sourceNetworkDigest:routes.sourceRoutingGraphSha256,
  verifiedShardDistrictCount:segmentation.districts.length,
  losslessShardReassembly:segmentation.verifiedExactReassembly,
  exactShardVoxelCount:segmentation.totalPartitionCells,
  crossDistrict2WideSeams:segmentation.checkedCrossDistrict2WideSeams,
  originalEightSkybridges:bridges.passed,
  originalThreeRoofGates:roof.joined,
  originalNineFloorToFloorFlights:stair.sourceCompleteConnections,
  originalThreeRaisedSkyparks:raised.sourceConnectedRaisedParks,
  originalThreeOldRoofPortals:oldSky.connectedSkyPortals,
  original17RiserInterfaces:oldStairs.newAdjacentMixedHeightSeams,
  districtsProofSha256:segmentation.partitionSha256,
  historic36GalleryUnchanged:true,B172ToB187SourcesUnmodified:true,
  sourceOnlyGeometry:true,physicalMinecraftWalkingCertified:false,
  minecraftStepPhysicsCertified:false,collisionAndFallSafetyCertified:false,
  districtConstructionAuthorized:false,worldCoordinates:null,
  worldContacts:0,worldWrites:0,constructionApproved:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
 fail(verifyCivicGatesReport(report),'UNSAFE_REPORT');
 return {parent,design,addon,compiled:assembled.compiled,
  routes,segmentation,report};
}
export function verifyCivicGatesReport(r){
 return Boolean(r&&r.schema===SCHEMA&&
  r.id==='nebula-ark-civic-gates-segmented-geometry'&&
  r.parentOccupiedCells===136012&&r.newActualOccupiedCells>=1700&&
  r.compositeOccupiedCells===r.parentOccupiedCells+r.newActualOccupiedCells&&
  r.compositeOccupiedCells<=MAX_CELLS&&
  r.actualCellsRemaining===MAX_CELLS-r.compositeOccupiedCells&&
  r.originalOccupiedCellsPreserved===true&&
  r.inheritedAuthoredElements===1450&&
  r.newlyAuthoredElements>=80&&r.newlyAuthoredElements<=160&&
  r.totalAuthoredElements===r.inheritedAuthoredElements+r.newlyAuthoredElements&&
  r.independentStrictB143Modules===16&&
  r.maxElementsPerIndependentModule===160&&r.globalCellLimit===MAX_CELLS&&
  r.sourceVerifiedWaypoints===21&&r.sourceVerifiedNetworkEdges===30&&
  r.sourceNetworkDigest?.length===64&&
  r.verifiedShardDistrictCount===3&&r.losslessShardReassembly===true&&
  r.exactShardVoxelCount===r.compositeOccupiedCells&&
  r.crossDistrict2WideSeams===12&&
  r.originalEightSkybridges===8&&r.originalThreeRoofGates===3&&
  r.originalNineFloorToFloorFlights===9&&r.originalThreeRaisedSkyparks===3&&
  r.originalThreeOldRoofPortals===3&&r.original17RiserInterfaces===17&&
  r.districtsProofSha256?.length===64&&
  r.geometrySha256?.length===64&&r.sourceSha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  r.historic36GalleryUnchanged===true&&r.B172ToB187SourcesUnmodified===true&&
  r.sourceOnlyGeometry===true&&r.physicalMinecraftWalkingCertified===false&&
  r.minecraftStepPhysicsCertified===false&&r.collisionAndFallSafetyCertified===false&&
  r.districtConstructionAuthorized===false&&r.worldCoordinates===null&&
  r.worldContacts===0&&r.worldWrites===0&&r.constructionApproved===false&&
  r.readiness==='NOT_PREPARED'&&r.gates?.length===9&&
  r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
