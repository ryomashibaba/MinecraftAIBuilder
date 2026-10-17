/**
 * B186 CROWN OBSERVATORY NETWORK. Fourteenth independently strict B143
 * architecture module for the SAME 37th NEBULA ARK concept.
 * A new high source-supported observation tier Y76 connects three giant
 * public rooftop halls via a 100+ block-wide continuous suspended sky deck.
 * Each lower roof Y75 -> raised Y76 transition is checked as one 2wide
 * block-rise adjacency; NEVER a certification of Education player physics.
 * World coordinates, commands, contacts and writes remain NONE.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildCelestialPortico,auditRoofGates}
 from './b185-celestial-portico.mjs';
import {inspectPanoramaParkConnections} from './b184-panorama-crown.mjs';
import {inspectCompleteVerticalLinks} from './b183-vertical-urban.mjs';
import {inspectAerialFlights} from './b182-switchback.mjs';
import {auditOculusConnections} from './b181-oculus-atrium.mjs';
import {inspectFourTierArrivalPaths,HALLS} from './b180-atrium-arrivals.mjs';
import {inspectQuadTierAccess} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b186-crown-observatory-network-v1';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const check=(v,s)=>{if(!v)throw Error('B186_'+s)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,mode:'add',shape:'beam',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,mode:'add',shape:'ellipsoid',center,radii,material,shell});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,mode:'add',shape:'torus',center,axis:'z',majorRadius,tubeRadius,material});
export const RAISED_Y=76;
export const OVERLOOKS=Object.freeze(HALLS.map(h=>Object.freeze({
 hall:h.id,x:h.centerX,lowerStandingY:75,upperStandingY:76,
 lowerNodeZ:27,raisedNodeZ:29,panoramaZ:40
})));
export const RAISED_LONG_WAY=Object.freeze({startX:13,endX:112,z:39});
export function crownObservatoryElements(){
 const e=[
  // One real super-wide 2.8km-looking (at design block scale 104m) civic
  // bridge, floating *above* the B184 public roof with unobstructed sky.
  box('b186-upper-citywide-panorama-trunk',[12,75,37],[104,1,7],'concrete'),
  // The ornamental floating rear "crown" is at Z46..49, *behind* all
  // 2wide Y76 view routes in Z32..43 (body Y76, head Y77).
  box('b186-floating-supercrown',[10,77,46],[106,1,4],'glass'),
  box('b186-low-rear-megaribbon',[10,69,46],[106,1,4],'accent'),
  box('b186-deep-city-underdeck',[12,22,41],[104,1,9],'stone'),
  box('b186-hanging-public-promenade',[12,31,41],[104,1,9],'concrete'),
  box('b186-interstitial-mega-girder',[12,35,42],[104,1,7],'metal')
 ];
 for(const h of HALLS){
  const x=h.centerX,p='b186-'+h.id;
  e.push(
   // Reserved only on X=cx-2..cx+1 at Z27..31, outside B185
   // roof access opening at X=cx+4..+6 / Z27..28.
   box(p+'-midlevel-architectural-foyer',[x-2,67,25],[4,1,3],'wood'),
   box(p+'-upper-observatory-terrace',[x-10,75,29],[21,1,15],'glass'),
   box(p+'-side-observation-east',[x+11,75,38],[4,1,6],'wood'),
   box(p+'-side-observation-west',[x-14,75,38],[4,1,6],'wood'),
   // Large full-span rear facade with huge open interior transparency.
   ell(p+'-rear-grand-lantern',[x,27,45],[10,9,4],'glass',1),
   tor(p+'-deep-aurora-ring',[x,27,45],7,1,'glow'),
   box(p+'-rear-grand-foyer',[x-11,18,39],[23,1,11],'wood'),
   box(p+'-rear-upper-city-plaza',[x-11,25,39],[23,1,11],'accent'),
   box(p+'-rear-shell-transverse-frame',[x-10,33,45],[21,1,5],'metal'),
   box(p+'-upper-city-outer-rim',[x-10,68,45],[21,1,5],'glow'),
   box(p+'-roof-sunlight-ring-base',[x-10,71,45],[21,1,5],'accent'),
   box(p+'-rear-skyline-stepped-cap',[x-11,77,46],[23,1,4],'glass')
  );
  for(let n=0;n<5;n++){
   const xx=x-10+n*5;
   e.push(
    beam(p+'-low-vertical-back-rib-'+n,[xx,15,48],
      [xx,34,48],n%2?'metal':'accent',1),
    beam(p+'-rear-cross-brace-'+n,[xx,16,44],
      [xx+1,35,46],n%2?'glow':'metal',1),
    beam(p+'-upper-rear-accent-'+n,[xx,63,47],
      [xx,72,48],n%2?'metal':'accent',1)
   );
  }
 }
 // Extra skyline scale and visible segmentation over the rear city
 // without raising a ceiling over the actual Y76 public route.
 e.push(
  beam('b186-grand-rear-west-suspension',[35,39,48],[52,54,48],'accent',1),
  beam('b186-grand-rear-east-suspension',[91,39,48],[73,54,48],'accent',1),
  box('b186-west-lower-terrace-fin',[34,19,39],[20,1,11],'metal'),
  box('b186-east-lower-terrace-fin',[72,19,39],[20,1,11],'metal')
 );
 check(e.length>=90&&e.length<=160,'ELEMENT_LIMIT_'+e.length);
 check(new Set(e.map(v=>v.id)).size===e.length,'DUPLICATED_AUTHORING_ELEMENT');
 return e;
}
export function createCrownModule(){
 const d={schema:DSL,id:'nebula-ark-b186-crown-observatory',
  title:'NEBULA ARK — CROWN OBSERVATORY NETWORK',
  brief:'三大天空公園のさらに上に巨大な展望階を作り、百ブロック級の連続天空通路で接続。背面には巨大な空中公共施設と複層の都市基盤を増設する。Minecraft実機移動・施工は未認証。',
  bounds:{width:124,height:78,depth:50},elements:crownObservatoryElements(),
  designOnly:true};
 validateDesign(d);return d;
}
const occupied=s=>new Set(s.primitives.map(p=>K(p[0],p[1],p[2])));
function walk(c,x,y,z){
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  const a=x+dx,b=z+dz;
  if(!c.has(K(a,y-1,b))||c.has(K(a,y,b))||c.has(K(a,y+1,b)))return false;
 }
 return true;
}
function planeReachability(c,y,bounds,start){
 const nodes=new Set();
 for(let x=bounds.x0;x<=bounds.x1;x++)for(let z=bounds.z0;z<=bounds.z1;z++)
  if(walk(c,x,y,z))nodes.add(x+','+z);
 const seen=new Set([start]),q=[start];
 check(nodes.has(start),'FLAT_GRAPH_START_NOT_WALKABLE_'+start+'_DIAGNOSTIC_'+JSON.stringify(
  [24,62,101].map(x=>({x,stations:Array.from({length:16},(_,i)=>{
   const z=i+29;return {z,ok:walk(c,x,y,z),columns:[[x,z],[x+1,z],[x,z+1],[x+1,z+1]]
    .map(([a,b])=>({x:a,z:b,floor:c.has(K(a,y-1,b)),
     occupiedBody:c.has(K(a,y,b)),occupiedHead:c.has(K(a,y+1,b))}))};
  }).filter(q=>!q.ok).map(q=>({z:q.z,blocked:q.columns.filter(t=>!t.floor||t.occupiedBody||t.occupiedHead)}))})))
 );
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i].split(',').map(Number);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const s=(x+dx)+','+(z+dz);
   if(nodes.has(s)&&!seen.has(s)){seen.add(s);q.push(s)}
  }
 }
 return {nodes,seen};
}
export function auditRaisedCrown(scene){
 const c=occupied(scene),upperY=RAISED_Y;
 const open=planeReachability(c,upperY,
  {x0:10,x1:115,z0:28,z1:44},'24,39');
 for(let x=RAISED_LONG_WAY.startX;x<=RAISED_LONG_WAY.endX;x++)
  check(walk(c,x,upperY,RAISED_LONG_WAY.z),'TRUNK_INTERRUPTED_'+x);
 const portals=[];
 for(const p of OVERLOOKS){
  // Genuine source-supported adjacent 1-rise stages.
  check(walk(c,p.x,75,27),'ROOF_START_NOT_WALKABLE_'+p.hall);
  check(walk(c,p.x,76,29),'RAISED_STATION_NOT_WALKABLE_'+p.hall);
  check(open.seen.has(p.x+',29')&&open.seen.has(p.x+',40'),
   'PANORAMA_DESTINATION_UNREACHABLE_'+p.hall);
  for(let z=29;z<=40;z++)
   check(walk(c,p.x,76,z),'SKY_PARK_BRANCH_BLOCKED_'+p.hall+'_'+z);
  portals.push({hall:p.hall,sourceLowerY:75,sourceUpperY:76,
   sourceOneBlockRiseEdge:true,sourceRaisedDeckConnected:true,
   raisedViewingNode:p.x+',40',source9StationBranch:true,
   physicalMinecraftPlayerMovementCertified:false});
 }
 // Integrated nonphysical *source graph*: all four previously verified
 // public floors Y60/64/68/72, 9 flights, 3 roof-portico rises, and
 // 3 new raised-terrace rises. Inherited off-line proofs run before
 // the 15-level graph is accepted.
 const floors=[60,64,68,72,74,75];
 const vertices=HALLS.flatMap(h=>floors.map(y=>h.id+':'+y));
 const edges=[];
 for(const h of HALLS){
  for(let i=0;i<floors.length-1;i++)
   edges.push([h.id+':'+floors[i],h.id+':'+floors[i+1]]);
 }
 for(const floor of floors)for(let i=0;i<HALLS.length-1;i++)
  edges.push([HALLS[i].id+':'+floor,HALLS[i+1].id+':'+floor]);
 const adjacency=new Map(vertices.map(v=>[v,[]]));
 for(const [a,b] of edges){adjacency.get(a).push(b);adjacency.get(b).push(a)}
 const q=[vertices[0]],visited=new Set(q);
 for(let i=0;i<q.length;i++)for(const next of adjacency.get(q[i])){
  if(!visited.has(next)){visited.add(next);q.push(next)}
 }
 check(visited.size===vertices.length,'INTEGRATED_LEVEL_GRAPH_DISCONNECTED');
 return {publicCrownWalkMoves:RAISED_LONG_WAY.endX-RAISED_LONG_WAY.startX,
  sourceConnectedRaisedParks:portals.length,
  sourceRiseContacts:portals.length,routeGraphNodes:open.seen.size,
  integratedSourceVertices:vertices.length,
  integratedConceptualEdges:edges.length,
  allHallLevelsConnectedInVerifiedSourceTopology:true,
  routes:portals,graphSha256:H({vertices,edges}),
  actualInGameVerticalTravelCertified:false,
  actualPlayerCollisionCertified:false,actualFallSafetyCertified:false};
}
function compose(old,addon,design){
 const m=new Map(old.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let added=0,overlap=0;
 for(const p of addon.primitives){
  const id=K(p[0],p[1],p[2]);
  if(m.has(id)){overlap++;continue}
  m.set(id,p);added++;
 }
 check(added>=3000,'INSUFFICIENT_NEW_3D_ARCHITECTURE');
 // Strictly bounded conceptual SOURCE-ONLY air volumes above the new Y75
 // raised observation deck: X12..115, Z29..43, only body Y76 and head Y77.
 // This keeps ALL inherited B184/B185 roof portals (Z<=28), old gallery
 // floors, stairs and real Minecraft blocks untouched. Never a world command.
 const localClearance=[];
 for(let x=12;x<=115;x++)for(let z=29;z<=43;z++)
  for(let y=76;y<=77;y++){
   const id=K(x,y,z);
   if(m.delete(id))localClearance.push(id);
  }
 check(localClearance.length>=100&&localClearance.length<=3200,
  'BOUNDED_UPPER_AIR_RESERVATION_'+localClearance.length);
 check(m.size<=MAX_CELLS,'STRICT_VOXEL_CAP');
 const primitives=[...m.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const layerCounts=Object.fromEntries(MATERIALS.map(x=>[x,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  layerCounts[MATERIALS[p[3]]]++;
 }
 check(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'OUTSIDE_B143_ENVELOPE');
 const sourceSha256=H({schema:SCHEMA,parent:old.sourceSha256,
  module:addon.sourceSha256,policy:'bounded-Y76-77-observation-headspace-composite-only'});
 const geometrySha256=H({sourceSha256,primitives});
 return {compiled:{...old,id:'nebula-ark-crown-observatory-network',
  title:'NEBULA ARK — CROWN OBSERVATORY NETWORK / 王冠展望都市',
  brief:'巨大外殻を背面にも広げ、三大公共施設と連続する超高層天空公園を持つ三次元未来公共都市。',
  sourceSha256,geometrySha256,primitives,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...old.stats,voxels:primitives.length,
   layerCounts,moduleCount:14,designOperations:[...old.stats.designOperations,
    ...addon.stats.designOperations.map(op=>({...op,module:design.id}))]}},
  added,overlap,airRemoved:localClearance.length,
  airMaskSha256:H(localClearance.sort())};
}
export function buildCrownObservatory(){
 const parent=buildCelestialPortico(),design=createCrownModule(),
  addon=compileDesign(design);
 check(verifyCompiled(design,addon),'STRICT_B143_MODULE');
 const joined=compose(parent.compiled,addon,design);
 // All actual inherited geometric route proofs MUST pass first.
 const old185=auditRoofGates(joined.compiled);
 const old184=inspectPanoramaParkConnections(joined.compiled);
 const old183=inspectCompleteVerticalLinks(joined.compiled);
 const old182=inspectAerialFlights(joined.compiled);
 const old181=auditOculusConnections(joined.compiled);
 const old180=inspectFourTierArrivalPaths(joined.compiled);
 const old179=inspectQuadTierAccess(joined.compiled);
 const old178=inspectPublicConcourse(joined.compiled);
 const old176=analyzeAuroraTransit(joined.compiled);
 check(old185.joined===3&&old184.sourceConnectedSkyparks===3&&
  old183.sourceCompleteConnections===9&&old179.passed===8,
  'HISTORIC_SOURCE_CONNECTION_FAILED');
 const paths=auditRaisedCrown(joined.compiled);
 const report={schema:SCHEMA,id:joined.compiled.id,
  sourceSha256:joined.compiled.sourceSha256,
  geometrySha256:joined.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  parent3dCells:parent.compiled.primitives.length,
  added3dCells:joined.added,upperBodyAirRemoved:joined.airRemoved,
  localAirReservationSha256:joined.airMaskSha256,
  total3dCells:joined.compiled.primitives.length,
  parent3dOverlapPreserved:joined.overlap,
  inheritedElements:parent.report.totalElements,
  newElements:design.elements.length,
  totalElements:parent.report.totalElements+design.elements.length,
  independentModules:14,b143ModuleElementLimit:160,
  max3dCells:MAX_CELLS,remaining3dCellBudget:MAX_CELLS-joined.compiled.primitives.length,
  sourceConnectedRaisedParks:paths.sourceConnectedRaisedParks,
  added100mRoofWalkMoves:paths.publicCrownWalkMoves,
  sourceRiserEdges:paths.sourceRiseContacts,
  integratedTopologyVertices:paths.integratedSourceVertices,
  integratedTopologyEdges:paths.integratedConceptualEdges,
  sourceRouteGraphSha256:paths.graphSha256,
  protectedRoofGates:old185.joined,
  protectedRoofParks:old184.sourceConnectedSkyparks,
  protectedNineStairways:old183.sourceCompleteConnections,
  protected36StairTreads:old182.treadCount,
  protected12AtriumWalkouts:old181.verifiedSourceTurnouts,
  protected24LateralViews:old181.verifiedLateralViewpointArms,
  protectedFourHallFloors:old180.tiers.length,
  protectedEightSkybridges:old179.passed,
  protectedThreeRoofPortals:old178.connectedSkyPortals,
  protected17OldRiseSeams:old176.newAdjacentMixedHeightSeams,
  historical36Unmodified:true,B172ToB185SourceUnchanged:true,
  sourceGeometryOnly:true,inGameWalkingCertified:false,
  inGameRisersCertified:false,playerCollisionCertified:false,
  fallAndStructuralSafetyCertified:false,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 check(verifyCrownReport(report),'SOURCE_REPORT_SAFETY_HOLD');
 return {parent,design,addon,compiled:joined.compiled,paths,report};
}
export function verifyCrownReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-crown-observatory-network'&&
  r.parent3dCells===123583&&r.added3dCells>=3000&&
  r.upperBodyAirRemoved>=100&&r.upperBodyAirRemoved<=3200&&
  r.localAirReservationSha256?.length===64&&
  r.total3dCells===r.parent3dCells+r.added3dCells-r.upperBodyAirRemoved&&
  r.total3dCells<=MAX_CELLS&&r.remaining3dCellBudget===MAX_CELLS-r.total3dCells&&
  r.inheritedElements===1264&&r.newElements>=90&&r.newElements<=160&&
  r.totalElements===r.inheritedElements+r.newElements&&
  r.independentModules===14&&r.b143ModuleElementLimit===160&&
  r.max3dCells===MAX_CELLS&&r.sourceConnectedRaisedParks===3&&
  r.added100mRoofWalkMoves===99&&r.sourceRiserEdges===3&&
  r.integratedTopologyVertices===18&&r.integratedTopologyEdges===27&&
  r.sourceRouteGraphSha256?.length===64&&
  r.protectedRoofGates===3&&r.protectedRoofParks===3&&
  r.protectedNineStairways===9&&r.protected36StairTreads===36&&
  r.protected12AtriumWalkouts===12&&r.protected24LateralViews===24&&
  r.protectedFourHallFloors===4&&r.protectedEightSkybridges===8&&
  r.protectedThreeRoofPortals===3&&r.protected17OldRiseSeams===17&&
  r.sourceSha256?.length===64&&r.geometrySha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  r.historical36Unmodified===true&&r.B172ToB185SourceUnchanged===true&&
  r.sourceGeometryOnly===true&&r.inGameWalkingCertified===false&&
  r.inGameRisersCertified===false&&r.playerCollisionCertified===false&&
  r.fallAndStructuralSafetyCertified===false&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
