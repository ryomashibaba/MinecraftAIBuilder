/**
 * B180 — FOUR TIER ATRIUM ARRIVALS.
 * Eighth independent strict B143 architectural module: hall-side arrival
 * concourses join all 8 previously proven B179 bridge spans at four heights.
 * Geometry ONLY: no Education or other Minecraft commands/world locations.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildQuadTier,inspectQuadTierAccess,TIERS,CROSSINGS}
 from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b180-four-tier-atrium-arrivals-v1';
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const yes=(ok,reason)=>{if(!ok)throw Error('B180_'+reason)};
const box=(id,origin,size,material='metal')=>
 ({id,shape:'box',mode:'add',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,shape:'beam',mode:'add',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,shape:'ellipsoid',mode:'add',center,radii,shell,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,shape:'torus',mode:'add',center,axis:'z',majorRadius,tubeRadius,material});
export const HALLS=Object.freeze([
 Object.freeze({id:'north',centerX:24,left:14,width:20}),
 Object.freeze({id:'core',centerX:62,left:53,width:21}),
 Object.freeze({id:'south',centerX:101,left:92,width:20})
]);
export const ARRIVAL={x0:18,xLast:108,frontZ:27,depth:7,walkZ:29};
export function atriumArrivalParts(){
 const e=[];
 // The vital part: 4 real 91-block long seven-deep concourses.
 // Central air volumes Z35..41 remain OPEN for visual cathedral scale.
 for(const [i,y] of TIERS.entries()){
  const mid='b180-tier-'+i;
  e.push(
   box(mid+'-continuous-public-floor',[ARRIVAL.x0,y,ARRIVAL.frontZ],
    [ARRIVAL.xLast-ARRIVAL.x0+2,1,ARRIVAL.depth],i%2?'glass':'concrete'),
   box(mid+'-front-architectural-light',[18,y-2,25],[92,1,2],'glow'),
   box(mid+'-side-exterior-rim',[18,y-1,34],[92,1,2],'metal')
  );
  for(const h of HALLS){
   const id=mid+'-'+h.id;
   e.push(
    // Source-real hall side arrival aprons on the same elevation as bridges.
    box(id+'-inner-portal',[h.left,y,25],[h.width,1,5],'wood'),
    box(id+'-landmark-platform',[h.left+2,y,32],[h.width-4,1,3],'accent'),
    box(id+'-front-recess-panel',[h.left+3,y-2,23],
      [h.width-6,1,2],'glow'),
    box(id+'-flanking-support',[h.left+2,y-3,35],
      [h.width-4,1,2],'metal'),
    box(id+'-luminescent-edge',[h.left+3,y,24],
      [h.width-6,1,1],'glow')
   );
  }
 }
 // Visual character matters as much as pure connectivity. Enormous ribs,
 // glass lanterns and lateral diagonals are outside the 2x2 corridors.
 for(const h of HALLS){
  for(let n=0;n<4;n++){
   const x=h.left+2+n*5;
   e.push(
    beam('b180-'+h.id+'-outer-vertical-rib-'+n,
      [x,28,22],[x+1,54,23],n%2?'metal':'accent'),
    beam('b180-'+h.id+'-low-garden-column-'+n,
      [x,29,37],[x,53,38],n%2?'glow':'metal')
   );
  }
  e.push(
   ell('b180-'+h.id+'-grand-glazed-podium',
    [h.centerX,45,38],[9,7,6],'glass',1),
   tor('b180-'+h.id+'-orbital-entry-ring',
    [h.centerX,44,38],5,1,'glow'),
   beam('b180-'+h.id+'-diagonal-beacon',
    [h.left+1,39,20],[h.centerX,57,21],'accent')
  );
 }
 e.push(
  beam('b180-west-transit-side-buttress',[35,31,20],[51,55,22],'metal',2),
  beam('b180-east-transit-side-buttress',[90,31,20],[74,55,22],'metal',2),
  box('b180-grand-east-external-ribbon',[92,35,19],[20,1,4],'accent'),
  box('b180-grand-west-external-ribbon',[14,35,19],[20,1,4],'accent')
 );
 yes(e.length>=85&&e.length<=160,'MODULE_ELEMENT_COUNT_'+e.length);
 yes(new Set(e.map(p=>p.id)).size===e.length,'DUPLICATE_PART');
 return e;
}
export function createAtriumArrivalModule(){
 const d={schema:DSL,id:'nebula-ark-four-tier-arrival-module',
  title:'NEBULA ARK — FOUR TIER ATRIUM ARRIVALS',
  brief:'3つの巨大アトリウム内部を四層にわたる長大な公共通路・到着広場でつなぐ。実床、巨大ガラス正面、柱列・都市級の外装を追加するが、Minecraft実機施工は未承認。',
  bounds:{width:124,height:78,depth:50},
  elements:atriumArrivalParts(),designOnly:true};
 validateDesign(d);return d;
}
function toSet(scene){return new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])))}
function sq(x,z){return [[x,z],[x+1,z],[x,z+1],[x+1,z+1]]}
export function inspectFourTierArrivalPaths(scene){
 const occupied=toSet(scene),tiers=[];
 const is2wide=(x,y,z)=>sq(x,z).every(([a,b])=>
  occupied.has(K(a,y-1,b))&&
  !occupied.has(K(a,y,b))&&!occupied.has(K(a,y+1,b)));
 const points=[24,62,101];
 for(const [index,deck] of TIERS.entries()){
  const standingY=deck+1,bridgeNodes=[];
  let unsupported=0,blocked=0;
  // Ensure *all* full 2x2 footprints on the 90-column longitudinal band.
  for(let x=ARRIVAL.x0;x<=ARRIVAL.xLast;x++)
   for(let dx=0;dx<=1;dx++)for(let dz=0;dz<2;dz++){
    if(!occupied.has(K(x+dx,deck,ARRIVAL.walkZ+dz)))unsupported++;
    if(occupied.has(K(x+dx,standingY,ARRIVAL.walkZ+dz)))blocked++;
    if(occupied.has(K(x+dx,standingY+1,ARRIVAL.walkZ+dz)))blocked++;
   }
  const nodeSet=new Set();
  for(let x=ARRIVAL.x0;x<=ARRIVAL.xLast;x++)
   for(let z=25;z<=33;z++)
    if(is2wide(x,standingY,z))nodeSet.add(x+','+z);
  const starting=points[0]+','+ARRIVAL.walkZ;
  const queue=[starting],seen=new Set(queue);
  yes(nodeSet.has(starting),'ARRIVAL_HALL_NODE_NOT_WALKABLE_'+index);
  for(let p=0;p<queue.length;p++){
   const [x,z]=queue[p].split(',').map(Number);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const next=(x+dx)+','+(z+dz);
    if(nodeSet.has(next)&&!seen.has(next)){seen.add(next);queue.push(next)}
   }
  }
  for(const h of HALLS)
   yes(seen.has(h.centerX+','+ARRIVAL.walkZ),
    'HALL_UNREACHABLE_'+index+'_'+h.id);
  for(const bridge of CROSSINGS){
   const a=bridge.x+','+ARRIVAL.walkZ;
   const b=(bridge.x+bridge.span-2)+','+ARRIVAL.walkZ;
   yes(seen.has(a)&&seen.has(b),'BRIDGE_TO_HALL_SEAM_'+index+'_'+bridge.id);
   bridgeNodes.push({id:bridge.id,left:a,right:b,connectedToAllHalls:true});
  }
  tiers.push({level:index,deckY:deck,standingY,
   floorSourceSupportViolations:unsupported,
   bodyClearanceViolations:blocked,
   connectedHalls:HALLS.map(x=>x.id),
   connectedBridges:bridgeNodes,
   2WideRouteMoves:ARRIVAL.xLast-ARRIVAL.x0,
   connectedNodeCount:seen.size,
   sourceOnly:true,minecraftPlayerPathCertified:false});
  yes(unsupported===0&&blocked===0,
    'LONG_CONCOURSE_OBSTRUCTION_'+index+'_F'+unsupported+'_B'+blocked);
 }
 return {tiers,allFourLevelsConnected:tiers.length===4,
  checkedHallToBridgeConnections:tiers.reduce((n,t)=>n+t.connectedBridges.length*3,0),
  sourceOnly:true,minecraftCollisionCertified:false,
  inGameStairTransferCertified:false,
  routeSha256:H(tiers)};
}
function combine(old,addon,design){
 const map=new Map(old.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let added=0,overlap=0;
 for(const p of addon.primitives){
  const id=K(p[0],p[1],p[2]);
  if(map.has(id)){overlap++;continue}
  map.set(id,p);added++;
 }
 yes(added>=2000,'NOT_ENOUGH_NEW_VOLUMETRIC_GEOMETRY');
 // Offline clearance mask: ONLY above the four public 2-wide concourses.
 // Includes old + newly composed cells and is NOT a Minecraft deletion.
 const removedCells=[],walkZ=ARRIVAL.walkZ;
 for(const deck of TIERS)
  for(let x=ARRIVAL.x0;x<=ARRIVAL.xLast+1;x++)
   for(let z=walkZ;z<=walkZ+1;z++)
    for(let dy=1;dy<=2;dy++){
     const target=K(x,deck+dy,z);
     if(map.delete(target))removedCells.push([x,deck+dy,z]);
    }
 const removed=removedCells.length;
 yes(removed>=10&&removed<=600,'OFFLINE_CLEARANCE_BUDGET_'+removed);
 yes(map.size<=MAX_CELLS,'GLOBAL_VOXEL_LIMIT');
 const primitives=[...map.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const layers=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  layers[MATERIALS[p[3]]]++;
 }
 yes(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'OUTSIDE_SOURCE_BOUNDS');
 const sourceSha256=H({schema:SCHEMA,parent:old.sourceSha256,addon:addon.sourceSha256,
  merge:'parent-priority',airMask:'only-four-bounded-two-wide-arrival-concourses'});
 const geometrySha256=H({sourceSha256,primitives});
 return {compiled:{...old,id:'nebula-ark-four-tier-atrium-arrivals',
  title:'NEBULA ARK — FOUR TIER ATRIUM ARRIVALS / 一体型空中公共施設',
  brief:'四層の巨大アトリウム内部に実体床でつながった８本の空中橋と到着広場を持つ未来巨大建築。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...old.stats,voxels:primitives.length,layerCounts:layers,
   moduleCount:8,designOperations:[
    ...old.stats.designOperations,
    ...addon.stats.designOperations.map(o=>({...o,module:design.id}))]}},
  added,overlap,removed,airMaskSha256:H(removedCells)};
}
export function buildAtriumArrivals(){
 const parent=buildQuadTier(),design=createAtriumArrivalModule(),
  addon=compileDesign(design);
 yes(verifyCompiled(design,addon),'B143_MODULE_CERT');
 const joined=combine(parent.compiled,addon,design);
 const geometry=inspectFourTierArrivalPaths(joined.compiled);
 const bridgeProof=inspectQuadTierAccess(joined.compiled);
 yes(bridgeProof.passed===8,'INHERITED_EIGHT_BRIDGES_LOST');
 const upper=inspectPublicConcourse(joined.compiled);
 const stair=analyzeAuroraTransit(joined.compiled);
 const report={schema:SCHEMA,id:joined.compiled.id,
  sourceSha256:joined.compiled.sourceSha256,
  geometrySha256:joined.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  parentCells:parent.compiled.primitives.length,
  uniqueNewCells:joined.added,conceptualAirCells:joined.removed,
  localAirMaskSha256:joined.airMaskSha256,
  finalCells:joined.compiled.primitives.length,
  inheritedParts:parent.report.authoredElements,
  addedParts:design.elements.length,totalParts:parent.report.authoredElements+design.elements.length,
  independentModules:8,moduleCap:160,globalCellsCap:MAX_CELLS,
  4VerifiedPublicLevels:geometry.tiers.length,
  hallToBridgeConnections:geometry.checkedHallToBridgeConnections,
  arrivalRouteDigest:geometry.routeSha256,
  preserved8BridgePaths:bridgeProof.passed,
  inheritedThreeSkyPortalPaths:upper.connectedSkyPortals,
  inherited17RiserSeams:stair.newAdjacentMixedHeightSeams,
  old36Untouched:true,B172ThroughB179Untouched:true,
  minecraftWalkingCertified:false,
  realCollisionCertified:false,interfloorTransferCertified:false,
  fallAndStructuralSafetyCertified:false,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 yes(verifyAtriumArrivalReport(report),'UNSAFE_B180_REPORT');
 return {parent,design,addon,compiled:joined.compiled,geometry,report};
}
export function verifyAtriumArrivalReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-four-tier-atrium-arrivals'&&
  r.parentCells===90643&&r.uniqueNewCells>=2000&&
  r.conceptualAirCells>=10&&r.conceptualAirCells<=600&&
  r.localAirMaskSha256?.length===64&&
  r.finalCells===r.parentCells+r.uniqueNewCells-r.conceptualAirCells&&
  r.inheritedParts===590&&r.addedParts>=85&&r.addedParts<=160&&
  r.totalParts===r.inheritedParts+r.addedParts&&
  r.independentModules===8&&r.moduleCap===160&&r.globalCellsCap===MAX_CELLS&&
  r['4VerifiedPublicLevels']===4&&r.hallToBridgeConnections===24&&
  r.arrivalRouteDigest?.length===64&&r.preserved8BridgePaths===8&&
  r.inheritedThreeSkyPortalPaths===3&&r.inherited17RiserSeams===17&&
  r.sourceSha256?.length===64&&r.geometrySha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  r.old36Untouched===true&&r.B172ThroughB179Untouched===true&&
  r.minecraftWalkingCertified===false&&r.realCollisionCertified===false&&
  r.interfloorTransferCertified===false&&r.fallAndStructuralSafetyCertified===false&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
