/**
 * B184 — PANORAMA CROWN / SKY PARKS.
 * Twelve independent strict B143 modules now compose the 37th NEBULA ARK
 * architectural concept. The extra module adds three grand rooftop panoramic
 * skyparks and one genuinely wide shared roof concourse, plus a monumental
 * front megafacade. All geometry is SOURCE-LOCAL: zero Minecraft world work.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildVerticalUrban,inspectCompleteVerticalLinks}
 from './b183-vertical-urban.mjs';
import {inspectAerialFlights} from './b182-switchback.mjs';
import {auditOculusConnections} from './b181-oculus-atrium.mjs';
import {inspectFourTierArrivalPaths,HALLS} from './b180-atrium-arrivals.mjs';
import {inspectQuadTierAccess} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b184-panorama-crown-skyparks-v1';
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const guard=(ok,why)=>{if(!ok)throw Error('B184_'+why)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>({id,mode:'add',shape:'beam',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>({id,mode:'add',shape:'ellipsoid',center,radii,shell,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow',axis='z')=>
 ({id,mode:'add',shape:'torus',center,axis,majorRadius,tubeRadius,material});
export const ROOF_Y=75;
export const ROOF_SPINE=Object.freeze({x0:13,x1:112,z:25});
export const ROOF_PARKS=Object.freeze(HALLS.map(h=>
 Object.freeze({id:h.id,cx:h.centerX,entryZ:18,innerZ:27})));
export function panoramaCrownElements(){
 const e=[
  // One continuous public skyway (Y74 floor, Y75 standing).
  box('b184-102m-connected-panoramic-spine',[12,74,24],[104,1,5],'concrete'),
  box('b184-citywide-outer-glass-rim',[12,72,29],[104,1,3],'glass'),
  box('b184-citywide-luminous-front-trim',[12,71,23],[104,1,2],'glow'),
  box('b184-lower-front-transverse-connector',[12,45,0],[104,1,3],'metal')
 ];
 for(const h of HALLS){
  const p='b184-'+h.id,cx=h.centerX;
  e.push(
   // Three much larger 21 x 12 rooftop observation parks, physically
   // joined to already source-supported B178 portal arrival Z18.
   box(p+'-grand-skypark-deck',[cx-10,74,17],[21,1,12],'wood'),
   box(p+'-outer-terrace-lip',[cx-10,73,22],[21,1,2],'accent'),
   box(p+'-hanging-foundation-ridge',[cx-10,69,22],[21,1,2],'metal'),
   box(p+'-front-garden-outline',[cx-9,72,15],[19,1,2],'glow'),
   box(p+'-rear-architectural-brow',[cx-9,68,21],[19,1,2],'glass'),
   ell(p+'-monumental-front-lantern',[cx,52,15],[12,10,6],'glass',1),
   ell(p+'-internal-public-oculus',[cx,46,15],[9,7,5],'accent',1),
   tor(p+'-halo-one',[cx,61,14],8,1,'glow','z'),
   tor(p+'-halo-two',[cx,42,14],7,1,'glow','z'),
   box(p+'-wide-exterior-observation',[cx-11,33,9],[23,1,12],'concrete'),
   box(p+'-middle-flight-terrace',[cx-11,47,9],[23,1,11],'wood'),
   box(p+'-high-exterior-mezzanine',[cx-11,57,10],[23,1,9],'glass'),
   box(p+'-midlevel-light-crown',[cx-10,68,11],[21,1,9],'accent'),
   beam(p+'-lower-east-aerial-cable',[cx+10,29,11],[cx+11,51,12],'metal'),
   beam(p+'-lower-west-aerial-cable',[cx-10,29,11],[cx-11,51,12],'accent')
  );
  for(let n=0;n<6;n++){
   const x=cx-11+n*4;
   e.push(
    beam(p+'-grand-external-rib-'+n,[x,28,9],[x,68,10],
      n%2?'accent':'metal',1),
    beam(p+'-front-light-diagonal-'+n,[x,38,13],[x+2,58,15],
      n%2?'glow':'metal',1),
    beam(p+'-lower-suspended-member-'+n,[x,28,19],[x,49,20],
      n%2?'metal':'accent',1)
   );
  }
 }
 // A city-scale silhouette: two huge hanging transition trusses below
 // the public roof corridor, not in its occupied pedestrian head space.
 e.push(
  beam('b184-west-mega-vault-cable',[34,41,14],[53,69,17],'metal',2),
  beam('b184-east-mega-vault-cable',[91,41,14],[73,69,17],'accent',2),
  box('b184-west-broad-low-skyrail',[35,40,9],[18,1,8],'accent'),
  box('b184-east-broad-low-skyrail',[73,40,9],[18,1,8],'accent')
 );
 guard(e.length>=105&&e.length<=160,'PART_COUNT_'+e.length);
 guard(new Set(e.map(x=>x.id)).size===e.length,'DUPLICATE_ID');
 return e;
}
export function createPanoramaCrownModule(){
 const d={schema:DSL,id:'nebula-ark-panorama-crown',
  title:'NEBULA ARK — PANORAMA CROWN SKY PARKS',
  brief:'三大巨大公共ホールの上部に空中展望公園を新設し、100ブロック超の連続回廊で一体化する。さらに巨大ガラス外殻・発光構造を立体で増築。実機の歩行・施工は未認証。',
  bounds:{width:124,height:78,depth:50},elements:panoramaCrownElements(),
  designOnly:true};
 validateDesign(d);return d;
}
const occupied=s=>new Set(s.primitives.map(p=>K(p[0],p[1],p[2])));
const footprint=(x,z)=>[[x,z],[x+1,z],[x,z+1],[x+1,z+1]];
function source2wide(c,x,y,z){
 return footprint(x,z).every(([a,b])=>
  c.has(K(a,y-1,b))&&!c.has(K(a,y,b))&&!c.has(K(a,y+1,b)));
}
export function inspectPanoramaParkConnections(scene){
 const c=occupied(scene),nodes=new Set(),y=ROOF_Y;
 for(let x=12;x<=115;x++)for(let z=17;z<=30;z++)
  if(source2wide(c,x,y,z))nodes.add(x+','+z);
 const start='24,18',queue=[start],seen=new Set(queue);
 guard(nodes.has(start),'INHERITED_PUBLIC_PORTAL_NOT_CLEAR');
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i].split(',').map(Number);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=(x+dx)+','+(z+dz);
   if(nodes.has(next)&&!seen.has(next)){seen.add(next);queue.push(next)}
  }
 }
 const checks=[];
 for(let x=ROOF_SPINE.x0;x<=ROOF_SPINE.x1;x++)
  guard(source2wide(c,x,y,ROOF_SPINE.z),'SKYWAY_X_'+x);
 for(const h of ROOF_PARKS){
  for(let z=h.entryZ;z<=h.innerZ;z++)
   guard(source2wide(c,h.cx,y,z),'PARK_BRANCH_'+h.id+'_'+z);
  const entry=h.cx+',18',panorama=h.cx+',27';
  guard(seen.has(entry)&&seen.has(panorama),
   'SKYPARK_GRAPH_DISCONNECTED_'+h.id);
  checks.push({hall:h.id,sourceConnected:true,
   entry,panorama,branch2wideMoves:9,
   physicalPlayerWalkingCertified:false});
 }
 const goal='101,27';
 guard(seen.has(goal),'SOUTH_PARK_NOT_CONNECTED');
 return {newSkyway2wideMoves:ROOF_SPINE.x1-ROOF_SPINE.x0,
  sourceConnectedSkyparks:checks.length,
  reachable2wideNodes:seen.size,
  parks:checks,connectedRouteSha256:sha([...seen].sort()),
  sourceOnly:true,actualMinecraftWalkingCertified:false,
  actualMinecraftCollisionCertified:false,
  roofFallSafetyCertified:false};
}
function compose(parent,addon,design){
 const map=new Map(parent.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let unique=0,overlap=0;
 for(const p of addon.primitives){
  const id=K(p[0],p[1],p[2]);
  if(map.has(id)){overlap++;continue}
  map.set(id,p);unique++;
 }
 guard(unique>=3000,'INSUFFICIENT_ARCHITECTURAL_CHANGE');
 // Explicit SOURCE-only two-high skyway and park branch air clearance.
 // The mask includes no source corridor floor cell, never edits B172-B183
 // documents and is NOT permission to remove real-world Minecraft blocks.
 const airMask=new Set();
 for(let x=12;x<=115;x++)for(let z=25;z<=27;z++)
  for(let y=75;y<=76;y++)airMask.add(K(x,y,z));
 for(const h of ROOF_PARKS)
  for(let x=h.cx;x<=h.cx+1;x++)for(let z=19;z<=28;z++)
   for(let y=75;y<=76;y++)airMask.add(K(x,y,z));
 const removed=[];
 for(const key of airMask)if(map.delete(key))removed.push(key);
 guard(removed.length>=5&&removed.length<=1300,
  'SKYWAY_CLEARANCE_BUDGET_'+removed.length);
 guard(map.size<=MAX_CELLS,'GLOBAL_160K_CELL_CAP');
 const primitives=[...map.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,
  minZ:Infinity,maxZ:-Infinity};
 const layers=Object.fromEntries(MATERIALS.map(n=>[n,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  layers[MATERIALS[p[3]]]++;
 }
 guard(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,
  'COMPOSITE_OUTSIDE_DESIGN_ENVELOPE');
 const sourceSha256=sha({schema:SCHEMA,parent:parent.sourceSha256,
  addon:addon.sourceSha256,mask:'limited-roof-2wide-aerial-gallery'});
 const geometrySha256=sha({sourceSha256,primitives});
 return {compiled:{...parent,id:'nebula-ark-panorama-crown-skyparks',
  title:'NEBULA ARK — PANORAMA CROWN / 巨大天空展望公共都市',
  brief:'三大巨大天空公園と100ブロック級の連続屋上公共回廊、壮大な透明外殻を備える近未来立体建築。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...parent.stats,voxels:primitives.length,layerCounts:layers,
   moduleCount:12,designOperations:[...parent.stats.designOperations,
    ...addon.stats.designOperations.map(x=>({...x,module:design.id}))]}},
  unique,overlap,removed:removed.length,removedSha256:sha(removed.sort())};
}
export function buildPanoramaCrown(){
 const parent=buildVerticalUrban(),design=createPanoramaCrownModule(),
  addon=compileDesign(design);
 guard(verifyCompiled(design,addon),'INVALID_STRICT_B143_SOURCE');
 const merged=compose(parent.compiled,addon,design);
 const panorama=inspectPanoramaParkConnections(merged.compiled);
 const vertical=inspectCompleteVerticalLinks(merged.compiled);
 const stair=inspectAerialFlights(merged.compiled);
 const inward=auditOculusConnections(merged.compiled);
 const longFloors=inspectFourTierArrivalPaths(merged.compiled);
 const bridges=inspectQuadTierAccess(merged.compiled);
 const upper=inspectPublicConcourse(merged.compiled);
 const prior=analyzeAuroraTransit(merged.compiled);
 guard(vertical.sourceCompleteConnections===9,'NINE_FLIGHTS_LOST');
 const report={schema:SCHEMA,id:merged.compiled.id,
  sourceSha256:merged.compiled.sourceSha256,
  geometrySha256:merged.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  inheritedCells:parent.compiled.primitives.length,
  addedUniqueCells:merged.unique,skywaySourceAirCells:merged.removed,
  skywayAirMaskSha256:merged.removedSha256,
  finalOccupiedCells:merged.compiled.primitives.length,
  inheritedParts:parent.report.totalAuthoredParts,
  newParts:design.elements.length,
  totalAuthoredParts:parent.report.totalAuthoredParts+design.elements.length,
  independentStrictModules:12,b143MaxPartsPerModule:160,
  globalOccupiedCellLimit:MAX_CELLS,
  skyparksWithConnected2wideSourcePaths:panorama.sourceConnectedSkyparks,
  newPanoramaSkyway2wideMoves:panorama.newSkyway2wideMoves,
  reachableRoofSourceNodes:panorama.reachable2wideNodes,
  panoramaRouteDigest:panorama.connectedRouteSha256,
  protectedVerticalFlights:vertical.sourceCompleteConnections,
  protectedStairTreads:stair.treadCount,
  protectedInteriorHallTurnouts:inward.verifiedSourceTurnouts,
  protectedLateralOverlooks:inward.verifiedLateralViewpointArms,
  protectedLongFloors:longFloors.tiers.length,
  protectedSkybridges:bridges.passed,
  protectedThreeRoofPortals:upper.connectedSkyPortals,
  protectedOlderRiserSeams:prior.newAdjacentMixedHeightSeams,
  original36Unmodified:true,B172ThroughB183SourceUnmodified:true,
  sourceOnlyGeometry:true,minecraftWalkingCertified:false,
  playerCollisionCertified:false,verticalPhysicalTraversalCertified:false,
  railAndStructuralSafetyCertified:false,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 guard(verifyPanoramaReport(report),'UNSAFE_REPORT');
 return {parent,design,addon,compiled:merged.compiled,panorama,report};
}
export function verifyPanoramaReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-panorama-crown-skyparks'&&
  r.inheritedCells===110160&&r.addedUniqueCells>=3000&&
  r.skywaySourceAirCells>=5&&r.skywaySourceAirCells<=1300&&
  r.skywayAirMaskSha256?.length===64&&
  r.finalOccupiedCells===r.inheritedCells+r.addedUniqueCells-r.skywaySourceAirCells&&
  r.inheritedParts===1056&&r.newParts>=105&&r.newParts<=160&&
  r.totalAuthoredParts===r.inheritedParts+r.newParts&&
  r.independentStrictModules===12&&r.b143MaxPartsPerModule===160&&
  r.globalOccupiedCellLimit===MAX_CELLS&&
  r.skyparksWithConnected2wideSourcePaths===3&&
  r.newPanoramaSkyway2wideMoves===99&&
  r.reachableRoofSourceNodes>=100&&
  r.panoramaRouteDigest?.length===64&&
  r.protectedVerticalFlights===9&&r.protectedStairTreads===36&&
  r.protectedInteriorHallTurnouts===12&&r.protectedLateralOverlooks===24&&
  r.protectedLongFloors===4&&r.protectedSkybridges===8&&
  r.protectedThreeRoofPortals===3&&r.protectedOlderRiserSeams===17&&
  r.original36Unmodified===true&&r.B172ThroughB183SourceUnmodified===true&&
  r.sourceOnlyGeometry===true&&r.minecraftWalkingCertified===false&&
  r.playerCollisionCertified===false&&r.verticalPhysicalTraversalCertified===false&&
  r.railAndStructuralSafetyCertified===false&&r.worldCoordinates===null&&
  r.worldContacts===0&&r.worldWrites===0&&r.constructionApproved===false&&
  r.readiness==='NOT_PREPARED'&&r.gates?.length===9&&
  r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
