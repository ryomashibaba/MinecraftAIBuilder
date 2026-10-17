/**
 * B187 — LEGIBLE CIVIC NETWORK / WAYFINDING MEGASTRUCTURE.
 * Fifteenth independently strict B143 module of the SAME 37th NEBULA ARK.
 * Source-backed 21-vertex, 30-evidence-edge multi-level civic topology.
 * All 30 edges require actual predecessor same-floor/stair/rise proofs.
 * New architecture is add-only and kept far from certified floor/head paths.
 * No Minecraft Education world coordinates, contacts, commands, or writing.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildCrownObservatory,auditRaisedCrown} from './b186-crown-observatory.mjs';
import {auditRoofGates} from './b185-celestial-portico.mjs';
import {inspectPanoramaParkConnections} from './b184-panorama-crown.mjs';
import {inspectCompleteVerticalLinks} from './b183-vertical-urban.mjs';
import {inspectAerialFlights} from './b182-switchback.mjs';
import {auditOculusConnections} from './b181-oculus-atrium.mjs';
import {inspectFourTierArrivalPaths,HALLS} from './b180-atrium-arrivals.mjs';
import {inspectQuadTierAccess} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b187-legible-civic-network-v1';
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const check=(v,s)=>{if(!v)throw Error('B187_'+s)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>({id,mode:'add',shape:'beam',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>({id,mode:'add',shape:'ellipsoid',center,radii,shell,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,mode:'add',shape:'torus',center,axis:'z',majorRadius,tubeRadius,material});
export const PUBLIC_LEVELS=Object.freeze([61,65,69,73,74,75,76]);
export const INTERHALL_LEVELS=Object.freeze([61,65,69,73,75,76]);
export function legibleCivicElements(){
 const e=[];
 // Architectural visual grammar: three halls repeat coherent horizontal
 // identity bands, each in FRONT of the occupied true floor route (Z29).
 // Every landmark is SOURCE voxel material, not an HTML-only indicator.
 for(const [i,deck] of [60,64,68,72].entries())for(const hall of HALLS){
  const id='b187-'+hall.id[0]+i,cx=hall.centerX;
  e.push(
   box(id+'-civic-wayfinding-brow',[cx-8,deck-4,20],[17,1,4],
     i%2?'accent':'metal'),
   box(id+'-underdeck-light-trace',[cx-7,deck-3,23],[15,1,2],'glow'),
   box(id+'-facade-observation-ribbon',[cx-8,deck-6,16],[17,1,4],
     i%2?'wood':'glass'),
   beam(id+'-left-vertical-waymark',[cx-9,deck-5,17],
     [cx-9,deck-1,17],i%2?'accent':'glow'),
   beam(id+'-right-vertical-waymark',[cx+9,deck-5,17],
     [cx+9,deck-1,17],i%2?'glow':'accent')
  );
 }
 // The first broad rear "city foundation" is a separate spatial district.
 // Fully authored lower-level floor masses under the existing Y18+ rear
 // tower; these slabs form a strong human-scale plinth under the megacity.
 for(const hall of HALLS){
  const x=hall.centerX,id='b187-'+hall.id;
  e.push(
   ell(id+'-lower-urban-lightwell',[x,12,45],[9,6,4],'glass',1),
   tor(id+'-urban-navigation-oculus',[x,13,46],6,1,'glow'),
   box(id+'-civic-ground-plate',[x-10,5,40],[21,1,10],'concrete'),
   box(id+'-civic-lower-plate',[x-10,9,42],[21,1,8],'wood'),
   box(id+'-civic-middle-plate',[x-10,13,43],[21,1,7],'metal'),
   box(id+'-civic-hanging-public-plate',[x-10,17,42],[21,1,8],'accent'),
   box(id+'-lower-light-spine',[x-9,3,47],[19,1,3],'glow'),
   beam(id+'-low-west-pylon',[x-10,3,46],[x-9,19,46],'metal'),
   beam(id+'-low-east-pylon',[x+10,3,46],[x+9,19,46],'metal'),
   beam(id+'-lower-visual-chord',[x-8,5,48],[x+8,16,48],'accent')
  );
 }
 e.push(
  box('b187-citywide-low-civic-loop',[12,7,40],[104,1,6],'concrete'),
  box('b187-citywide-glowing-ramp-ribbon',[12,11,46],[104,1,4],'glow'),
  box('b187-citywide-subterranean-plaza',[12,2,44],[104,1,6],'metal'),
  beam('b187-west-low-civic-arch',[36,4,45],[52,15,46],'accent',1),
  beam('b187-east-low-civic-arch',[90,4,45],[74,15,46],'accent',1)
 );
 check(e.length>=90&&e.length<=160,'AUTHORING_ELEMENT_COUNT_'+e.length);
 check(new Set(e.map(x=>x.id)).size===e.length,'DUPLICATED_PARTS');
 return e;
}
export function createLegibleCivicModule(){
 const d={schema:DSL,id:'nebula-ark-legible-civic-network',
  title:'NEBULA ARK — LEGIBLE CIVIC NETWORK / WAYFINDING MEGASTRUCTURE',
  brief:'三大ホールの各公共階に発光する建築的目印を持たせ、下部に都市規模の展望基壇を実ボクセルで増築。21地点の公共階を30本の既存幾何検証に基づく関係で結ぶ。実機移動・施工未認証。',
  bounds:{width:124,height:78,depth:50},elements:legibleCivicElements(),
  designOnly:true};
 validateDesign(d);return d;
}
const occupied=s=>new Set(s.primitives.map(p=>K(p[0],p[1],p[2])));
function floor2(c,x,y,z){
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++)
  if(!c.has(K(x+dx,y-1,z+dz))||c.has(K(x+dx,y,z+dz))||
     c.has(K(x+dx,y+1,z+dz)))return false;
 return true;
}
/** Real representative source-stations for all seven levels, not fabricated
 * 2D topology nodes. Y74 is the actual middle B185 stair transition at
 * x=cx+4 / Z27 (NOT the hall central X=cx).
 */
const pos=(cx,y)=>y===74?[cx+4,74,27]:
 y===75?[cx,75,25]:y===76?[cx,76,39]:[cx,y,29];
export function auditCivicSourceNetwork(scene){
 const c=occupied(scene);
 // Directly recompute the previously accepted source circulation proofs.
 const b186=auditRaisedCrown(scene);
 const b185=auditRoofGates(scene);
 const b184=inspectPanoramaParkConnections(scene);
 const b183=inspectCompleteVerticalLinks(scene);
 const b180=inspectFourTierArrivalPaths(scene);
 check(b186.sourceConnectedRaisedParks===3,'B186_SOURCE_CONNECTION_LOST');
 check(b185.joined===3,'B185_SOURCE_CONNECTION_LOST');
 check(b184.sourceConnectedSkyparks===3,'B184_SOURCE_CONNECTION_LOST');
 check(b183.sourceCompleteConnections===9,'B183_SOURCE_CONNECTION_LOST');
 check(b180.tiers.length===4,'B180_SHARED_CORRIDORS_LOST');
 const vertices=[];
 for(const h of HALLS)for(const y of PUBLIC_LEVELS){
  const [x,sy,z]=pos(h.centerX,y);
  check(floor2(c,x,sy,z),'SOURCE_STATION_NOT_A_REAL_2WIDE_FLOOR_'+h.id+'_'+y);
  vertices.push({id:h.id+':'+y,hall:h.id,standingY:y,
   sourceNode:[x,sy,z],supportedHeadroom2x2:true});
 }
 // Every edge explicitly cites a measured predecessor proof family
 // before admission, not merely equal coordinates or a drawn connector.
 const edges=[];
 const append=(hallA,yA,hallB,yB,proofName)=>{
  const a=hallA+':'+yA,b=hallB+':'+yB;
  check(vertices.some(x=>x.id===a)&&vertices.some(x=>x.id===b),
   'INVALID_ROUTING_NODE');
  edges.push({a,b,proofName,sourceGeometryOnly:true});
 };
 for(const h of HALLS){
  const name=h.id;
  for(let i=0;i<3;i++){
   const r=b183.flights.find(v=>v.id===name+'-L'+i);
   check(r?.geometryConnectionPassed&&r.verifiedRiserEdges===4&&
     r.sourceLowerJoined&&r.sourceUpperJoined,
     'FLIGHT_EVIDENCE_MISSING_'+name+'_'+i);
   append(name,PUBLIC_LEVELS[i],name,PUBLIC_LEVELS[i+1],
    'B183_4_riser_full_source_path_'+r.id);
  }
  const roof=b185.gates.find(x=>x.hall===name);
  check(roof?.geometryConnected&&roof.sourceLowerJoined&&roof.sourceUpperJoined,
    'ROOF_GATE_EVIDENCE_MISSING_'+name);
  append(name,73,name,74,'B185_hall_roof_riser_A_'+name);
  append(name,74,name,75,'B185_hall_roof_riser_B_'+name);
  const raised=b186.routes.find(x=>x.hall===name);
  check(raised?.sourceOneBlockRiseEdge&&raised.sourceRaisedDeckConnected,
    'RAISED_OBSERVATORY_EVIDENCE_MISSING_'+name);
  append(name,75,name,76,'B186_raised_observation_riser_'+name);
 }
 for(const y of INTERHALL_LEVELS){
  if(y<=73){
   const tier=b180.tiers.find(v=>v.standingY===y);
   check(tier&&tier.connectedHalls.length===3&&
    HALLS.every(h=>tier.connectedHalls.includes(h.id))&&
    tier.floorSourceSupportViolations===0&&tier.bodyClearanceViolations===0,
    'INTERHALL_FLOOR_EVIDENCE_LOST_'+y);
  }else if(y===75){
   check(b184.sourceConnectedSkyparks===3,
    'INTERHALL_ROOFTOP_GRAPH_UNPROVED');
  }else{
   check(b186.sourceConnectedRaisedParks===3,
    'INTERHALL_RAISED_ROOFTOP_GRAPH_UNPROVED');
  }
  for(let i=0;i<2;i++)append(HALLS[i].id,y,HALLS[i+1].id,y,
   'source_supported_interhall_level_'+y);
 }
 check(vertices.length===21&&edges.length===30,
  'ROUTING_GRAPH_SIZE_'+vertices.length+'_'+edges.length);
 const adj=new Map(vertices.map(x=>[x.id,[]]));
 for(const edge of edges){
  adj.get(edge.a).push(edge.b);adj.get(edge.b).push(edge.a);
 }
 const origin='north:61',destination='south:76';
 const q=[origin],parents=new Map([[origin,null]]);
 for(let i=0;i<q.length;i++)for(const next of adj.get(q[i])){
  if(!parents.has(next)){parents.set(next,q[i]);q.push(next)}
 }
 check(parents.size===21&&parents.has(destination),
  'VERIFIED_SOURCE_ROUTING_GRAPH_DISCONNECTED');
 const route=[];let current=destination;
 while(current!==null){route.push(current);current=parents.get(current)}
 route.reverse();
 return {schema:'b187-source-topology-proof-v1',
  vertices,edges,joinedVertices:parents.size,verifiedEdges:edges.length,
  allHallsAllSevenLevelsReachable:true,
  exampleFloorToRoofRoute:route,
  sourceRoutingGraphSha256:H({vertices,edges,route}),
  inheritedB183VerticalFlights:b183.sourceCompleteConnections,
  inheritedB185RoofGates:b185.joined,
  inheritedB186RaisedParks:b186.sourceConnectedRaisedParks,
  sourceOnly:true,realMinecraftPlayerTraversalCertified:false,
  actualStepPhysicsCertified:false,collisionAndFallSafetyCertified:false};
}
function merge(old,addon,design){
 const map=new Map(old.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let unique=0,overlap=0;
 for(const p of addon.primitives){
  const id=K(p[0],p[1],p[2]);if(map.has(id)){overlap++;continue}
  map.set(id,p);unique++;
 }
 check(unique>=1200,'INSUFFICIENT_REAL_VOXEL_ARCHITECTURE');
 check(map.size<=MAX_CELLS,'GLOBAL_160K_MAX');
 const primitives=[...map.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const layers=Object.fromEntries(MATERIALS.map(x=>[x,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  layers[MATERIALS[p[3]]]++;
 }
 check(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'OUT_OF_SITE_ENVELOPE');
 const sourceSha256=H({schema:SCHEMA,old:old.sourceSha256,
  newModule:addon.sourceSha256,merge:'strictly-add-only'});
 const geometrySha256=H({sourceSha256,primitives});
 return {compiled:{...old,id:'nebula-ark-legible-civic-network',
  title:'NEBULA ARK — LEGIBLE CIVIC NETWORK / 空中都市の案内広場',
  brief:'各公共階の建築的目印と巨大な下部公共基盤を追加し全三大ホール七層を統合設計で結ぶ。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...old.stats,voxels:primitives.length,layerCounts:layers,
   moduleCount:15,designOperations:[...old.stats.designOperations,
     ...addon.stats.designOperations.map(x=>({...x,module:design.id}))]}},
  unique,overlap};
}
export function buildLegibleCivic(){
 const parent=buildCrownObservatory(),design=createLegibleCivicModule(),
  addon=compileDesign(design);
 check(verifyCompiled(design,addon),'STRICT_DSL_MODULE');
 const joined=merge(parent.compiled,addon,design);
 const civic=auditCivicSourceNetwork(joined.compiled);
 const old182=inspectAerialFlights(joined.compiled);
 const old181=auditOculusConnections(joined.compiled);
 const old179=inspectQuadTierAccess(joined.compiled);
 const old178=inspectPublicConcourse(joined.compiled);
 const old176=analyzeAuroraTransit(joined.compiled);
 check(old179.passed===8&&old181.verifiedSourceTurnouts===12,
  'PROTECTED_PREDECESSOR_ROUTE_HOLD');
 const r={schema:SCHEMA,id:joined.compiled.id,
  sourceSha256:joined.compiled.sourceSha256,
  geometrySha256:joined.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  inheritedSourceCells:parent.compiled.primitives.length,
  additionalReal3dCells:joined.unique,
  totalSourceCells:joined.compiled.primitives.length,
  old3dCellsPreserved:true,
  inheritedAuthoredElements:parent.report.totalElements,
  newAuthoredElements:design.elements.length,
  totalAuthoredElements:parent.report.totalElements+design.elements.length,
  independentlyStrictModules:15,perModuleMaxElements:160,
  globalMaxSourceCells:MAX_CELLS,
  remainingSourceCells:MAX_CELLS-joined.compiled.primitives.length,
  verifiedSourceWaypoints:civic.joinedVertices,
  sourceGeometrySupportedEdges:civic.verifiedEdges,
  integratedWayfindingRouteSha256:civic.sourceRoutingGraphSha256,
  fullSourceNetworkReachable:civic.allHallsAllSevenLevelsReachable,
  protectedNineVerticalFlights:civic.inheritedB183VerticalFlights,
  protectedThreeRoofGates:civic.inheritedB185RoofGates,
  protectedThreeRaisedDecks:civic.inheritedB186RaisedParks,
  protected36Treads:old182.treadCount,
  protected12InteriorTurnouts:old181.verifiedSourceTurnouts,
  protected24ViewingArms:old181.verifiedLateralViewpointArms,
  protectedEightBridges:old179.passed,
  protectedThreeRoofPortals:old178.connectedSkyPortals,
  protected17OldRiseSeams:old176.newAdjacentMixedHeightSeams,
  original36GalleryModelsUntouched:true,B172ThroughB186OriginalsUntouched:true,
  sourceGeometryOnly:true,physicalWalkingCertified:false,
  minecraftJumpPhysicsCertified:false,realMinecraftCollisionCertified:false,
  fallAndStructuralSafetyCertified:false,
  worldContacts:0,worldWrites:0,worldCoordinates:null,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 check(verifyLegibleCivicReport(r),'SAFETY_REPORT_HOLD');
 return {parent,design,addon,compiled:joined.compiled,civic,report:r};
}
export function verifyLegibleCivicReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-legible-civic-network'&&
  r.inheritedSourceCells===130647&&r.additionalReal3dCells>=1200&&
  r.totalSourceCells===r.inheritedSourceCells+r.additionalReal3dCells&&
  r.totalSourceCells<=MAX_CELLS&&
  r.old3dCellsPreserved===true&&
  r.inheritedAuthoredElements===1355&&r.newAuthoredElements>=90&&
  r.newAuthoredElements<=160&&
  r.totalAuthoredElements===r.inheritedAuthoredElements+r.newAuthoredElements&&
  r.independentlyStrictModules===15&&r.perModuleMaxElements===160&&
  r.globalMaxSourceCells===MAX_CELLS&&
  r.remainingSourceCells===MAX_CELLS-r.totalSourceCells&&
  r.verifiedSourceWaypoints===21&&r.sourceGeometrySupportedEdges===30&&
  r.integratedWayfindingRouteSha256?.length===64&&
  r.fullSourceNetworkReachable===true&&
  r.protectedNineVerticalFlights===9&&
  r.protectedThreeRoofGates===3&&r.protectedThreeRaisedDecks===3&&
  r.protected36Treads===36&&r.protected12InteriorTurnouts===12&&
  r.protected24ViewingArms===24&&r.protectedEightBridges===8&&
  r.protectedThreeRoofPortals===3&&r.protected17OldRiseSeams===17&&
  r.sourceSha256?.length===64&&r.geometrySha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  r.original36GalleryModelsUntouched===true&&
  r.B172ThroughB186OriginalsUntouched===true&&
  r.sourceGeometryOnly===true&&r.physicalWalkingCertified===false&&
  r.minecraftJumpPhysicsCertified===false&&
  r.realMinecraftCollisionCertified===false&&r.fallAndStructuralSafetyCertified===false&&
  r.worldContacts===0&&r.worldWrites===0&&r.worldCoordinates===null&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(s=>s==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
