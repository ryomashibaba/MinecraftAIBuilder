/**
 * B182 — AERIAL SWITCHBACK / MEGAFAÇADE.
 * 10th independently strict-B143 design module for NEBULA ARK candidate #37.
 * Nine 4-riser switchback-style flight candidates climb Y60 -> 64 -> 68 -> 72,
 * while three monumental front glass lantern halls extend the skyline.
 * Local SOURCE voxel geometry only — no Minecraft world coordinates or writes.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildOculusAtrium,auditOculusConnections}
 from './b181-oculus-atrium.mjs';
import {inspectFourTierArrivalPaths,HALLS}
 from './b180-atrium-arrivals.mjs';
import {inspectQuadTierAccess,TIERS} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b182-aerial-switchback-megafacade-v1';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const check=(v,s)=>{if(!v)throw Error('B182_'+s)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>({id,mode:'add',shape:'beam',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>({id,mode:'add',shape:'ellipsoid',center,radii,material,shell});
const tor=(id,center,majorRadius,tubeRadius,material='glow',axis='z')=>({id,mode:'add',shape:'torus',center,axis,majorRadius,tubeRadius,material});
export const FLIGHTS=Object.freeze(HALLS.flatMap(h=>
 TIERS.slice(0,3).map((deck,i)=>Object.freeze({
  id:h.id+'-L'+i,hall:h.id,cx:h.centerX,deck,
  x:h.centerX+(i===1?8:-8),lane:i===1?'east':'west'
 }))));
export function aerialSwitchbackParts(){
 const a=[];
 for(const f of FLIGHTS){
  const name='b182-'+f.id;
  // Entry apron from a real hall floor, a series of four 1-high treads,
  // and a 2-wide upper return gallery. Every solid cell is genuine geometry.
  a.push(
   box(name+'-entry',[f.x,f.deck,29],[3,1,5],'concrete'),
   box(name+'-return',[f.x+3,f.deck+4,29],[3,1,16],'wood')
  );
  for(let s=0;s<4;s++)
   a.push(box(name+'-rise-'+s,[f.x,f.deck+s+1,33+3*s],[3,1,3],
    s%2?'accent':'metal'));
  if(f.lane==='east')a.push(
   box(name+'-lower-approach',[f.cx,f.deck,29],[12,1,5],'concrete'),
   box(name+'-upper-approach',[f.cx,f.deck+4,29],[15,1,4],'concrete')
  );
  // Four giant side rails, visually communicating elevation and structure,
  // are placed outside the actual 2-wide stair support columns.
  a.push(
   beam(name+'-side-stringer',[f.x-1,f.deck+1,45],
    [f.x-1,f.deck+5,47],'glow'),
   beam(name+'-outer-stringer',[f.x+6,f.deck+1,45],
    [f.x+6,f.deck+5,47],'accent')
  );
 }
 // Architectural skylines: three immense hollow glazed façade lanterns,
 // external layered crowns and luminous ring portals at city scale.
 for(const h of HALLS){
  const x=h.centerX,id='b182-'+h.id;
  a.push(
   ell(id+'-vast-outer-lantern',[x,57,16],[11,13,8],'glass',1),
   tor(id+'-grand-portal-oculus',[x,61,20],8,1,'glow','z'),
   box(id+'-external-upper-brow',[x-10,69,14],[21,1,6],'accent'),
   box(id+'-lower-mega-plaza',[x-11,33,10],[23,1,11],'concrete'),
   box(id+'-intermediate-exterior-crown',[x-9,51,10],[19,1,5],'wood'),
   beam(id+'-grand-left-spine',[x-9,31,12],[x-10,68,18],'metal',1),
   beam(id+'-grand-right-spine',[x+9,31,12],[x+10,68,18],'metal',1)
  );
  for(let n=0;n<5;n++){
   const xx=x-10+n*5;
   a.push(
    beam(id+'-vertical-frame-'+n,[xx,34,10],[xx,60,11],
      n%2?'glow':'metal'),
    beam(id+'-diagonal-frame-'+n,[xx,43,17],[xx+2,59,19],
      n%2?'accent':'metal')
   );
  }
 }
 // Cross-terminal urban roof details remain at Z <= 24, leaving existing
 // upper wide traversable floors further rear untouched.
 a.push(
  beam('b182-west-crown-pendant',[38,48,14],[55,71,18],'glow',2),
  beam('b182-east-crown-pendant',[87,48,14],[70,71,18],'glow',2),
  box('b182-west-grand-promenade-edge',[35,40,11],[18,1,6],'accent'),
  box('b182-east-grand-promenade-edge',[72,40,11],[19,1,6],'accent')
 );
 check(a.length>=110&&a.length<=160,'AUTHORING_ELEMENT_COUNT_'+a.length);
 check(new Set(a.map(e=>e.id)).size===a.length,'DUPLICATE_ELEMENT_ID');
 return a;
}
export function createSwitchbackModule(){
 const design={schema:DSL,id:'nebula-ark-aerial-switchback',
  title:'NEBULA ARK — AERIAL SWITCHBACK MEGAFAÇADE',
  brief:'巨大建築三ホールに4段の上昇路候補を9本追加し、外部に巨大ガラス塔・発光リング・列柱と都市スケールの立体外装を付与。Minecraftの階段・ジャンプ挙動は未認証。',
  bounds:{width:124,height:78,depth:50},elements:aerialSwitchbackParts(),designOnly:true};
 validateDesign(design);return design;
}
const footprint=(x,z)=>[[x,z],[x+1,z],[x,z+1],[x+1,z+1]];
const occupied=s=>new Set(s.primitives.map(p=>K(p[0],p[1],p[2])));
const clear=(cells,x,y,z)=>footprint(x,z).every(([a,b])=>
 cells.has(K(a,y-1,b))&&!cells.has(K(a,y,b))&&!cells.has(K(a,y+1,b)));
export function inspectAerialFlights(scene){
 const cells=occupied(scene),routes=[];
 for(const f of FLIGHTS){
  const checkAt=(x,y,z,where)=>{
   check(clear(cells,x,y,z),'FLIGHT_STATION_'+f.id+'_'+where+'_'+x+'_'+y+'_'+z);
  };
  // Real lower floor approach stations at standing deck+1, Z29..31.
  for(let z=29;z<=31;z++)checkAt(f.x,f.deck+1,z,'entry');
  // Four real rising 3x3 treads, each with full 2x2 support/head space.
  for(let s=0;s<4;s++){
   const y=f.deck+s+2,z=33+3*s;
   checkAt(f.x,y,z,'rise-'+s+'-start');
   checkAt(f.x,y,z+1,'rise-'+s+'-mid');
  }
  // The last tread joins an adjacent same-height return on X+3.
  checkAt(f.x+2,f.deck+5,42,'last-tread-return-seam');
  for(let z=29;z<=42;z++)checkAt(f.x+3,f.deck+5,z,'return-'+z);
  const stops=[...Array(4)].map((_,s)=>({
   sourceStandingY:f.deck+s+2,z:33+3*s,rise:1
  }));
  routes.push({id:f.id,hall:f.hall,baseDeckY:f.deck,
   destinationDeckY:f.deck+4,stairTreads:4,
   oneUnitRiserInterfaces:4,flatReturnStations:14,
   verified2x2Treads:true,verified2x2Headroom:true,
   sourceStagingFromExistingFloor:true,
   sourceLandingBackTowardUpperGallery:true,
   physicalMinecraftTraversalCertified:false,stops});
 }
 return {flightCount:routes.length,treadCount:routes.length*4,
  independentlyVerifiedOneHighRisers:routes.length*4,
  joinedTierPairs:3,perHallSourceChains:3,
  flights:routes,sourceOnly:true,
  playerStepPhysicsCertified:false,continuousInterfloorWalkingCertified:false,
  fallGuardCertified:false,flightProofSha256:H(routes)};
}
function merge(parent,addon,design){
 const m=new Map(parent.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let novel=0,overlap=0;
 for(const p of addon.primitives){
  const key=K(p[0],p[1],p[2]);
  if(m.has(key)){overlap++;continue;}
  m.set(key,p);novel++;
 }
 check(novel>=2500,'INSUFFICIENT_MAJOR_ARCHITECTURE');
 // Four step air envelopes and separate return corridors. The only
 // allowable carved SOURCE cells are in these exact 9 flights. No parent
 // module or live Minecraft world is modified or contacted.
 const cut=new Set();
 for(const f of FLIGHTS){
  for(let s=0;s<4;s++)for(let x=f.x;x<=f.x+2;x++)
   for(let z=33+3*s;z<=35+3*s;z++)for(let dy=2;dy<=3;dy++)
    cut.add(K(x,f.deck+s+dy,z));
  for(let x=f.x+3;x<=f.x+5;x++)for(let z=29;z<=44;z++)
   for(let dy=5;dy<=6;dy++)cut.add(K(x,f.deck+dy,z));
  for(let x=f.x;x<=f.x+2;x++)for(let z=29;z<=32;z++)
   for(let dy=1;dy<=2;dy++)cut.add(K(x,f.deck+dy,z));
  // The 2x2 seam spans the edge between top tread and return.
  for(let x=f.x+2;x<=f.x+3;x++)for(let z=42;z<=43;z++)
   for(let dy=5;dy<=6;dy++)cut.add(K(x,f.deck+dy,z));
  // Explicit source-only lower/upper hall approach for the east lane.
  if(f.lane==='east')for(let x=f.cx;x<=f.cx+14;x++)
   for(let z=29;z<=32;z++)for(const y of [f.deck+1,f.deck+2,
                                           f.deck+5,f.deck+6])
    cut.add(K(x,y,z));
 }
 let removed=0;const cutCells=[];
 for(const id of cut)if(m.delete(id)){removed++;cutCells.push(id)}
 check(removed>=50&&removed<=1800,'AIR_RESERVATION_BUDGET_'+removed);
 check(m.size<=MAX_CELLS,'MAX_SOURCE_VOXEL_COUNT');
 const primitives=[...m.values()].sort((a,b)=>
  a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const layerCounts=Object.fromEntries(MATERIALS.map(x=>[x,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  layerCounts[MATERIALS[p[3]]]++;
 }
 check(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'OUTSIDE_ARCH_ENVELOPE');
 const sourceSha256=H({schema:SCHEMA,parent:parent.sourceSha256,
  addon:addon.sourceSha256,carve:'source-only-switchback-body-envelopes'});
 const geometrySha256=H({sourceSha256,primitives});
 return {compiled:{...parent,
  id:'nebula-ark-aerial-switchback-megafacade',
  title:'NEBULA ARK — AERIAL SWITCHBACK / 立体上昇回廊と巨大外殻',
  brief:'三大巨大ホールに各階上昇構造・空中回廊と透明外殻を持つ独立した都市級建築。',
  sourceSha256,geometrySha256,primitives,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...parent.stats,voxels:primitives.length,layerCounts,
   moduleCount:10,designOperations:[...parent.stats.designOperations,
    ...addon.stats.designOperations.map(o=>({...o,module:design.id}))]}},
  added:novel,overlap,removed,removedSha256:H(cutCells.sort())};
}
export function buildAerialSwitchback(){
 const parent=buildOculusAtrium(),design=createSwitchbackModule(),
  addon=compileDesign(design);
 check(verifyCompiled(design,addon),'STRICT_B143_SOURCE');
 const merged=merge(parent.compiled,addon,design);
 const flights=inspectAerialFlights(merged.compiled);
 const prior=auditOculusConnections(merged.compiled);
 const publicTiers=inspectFourTierArrivalPaths(merged.compiled);
 const bridges=inspectQuadTierAccess(merged.compiled);
 const roof=inspectPublicConcourse(merged.compiled);
 const oldStairs=analyzeAuroraTransit(merged.compiled);
 const r={schema:SCHEMA,id:merged.compiled.id,
  sourceSha256:merged.compiled.sourceSha256,
  geometrySha256:merged.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  inherited3dCells:parent.compiled.primitives.length,
  newlyOccupied3dCells:merged.added,sourceAirCellsReserved:merged.removed,
  sourceAirReservationSha256:merged.removedSha256,
  total3dCells:merged.compiled.primitives.length,
  inheritedAuthoredParts:parent.report.totalElements,
  newlyAuthoredParts:design.elements.length,
  totalAuthoredParts:parent.report.totalElements+design.elements.length,
  strictModuleCount:10,b143PerModuleMax:160,combinedCellCap:MAX_CELLS,
  switchbackFlightCount:flights.flightCount,
  sourceOneHighStepCount:flights.treadCount,
  connectedFourTierCandidates:flights.joinedTierPairs,
  retainedInsideOverlooks:prior.verifiedSourceTurnouts,
  retainedSideViewpoints:prior.verifiedLateralViewpointArms,
  retainedLongHallFloors:publicTiers.tiers.length,
  retainedSkybridges:bridges.passed,
  retainedSkyPortalCount:roof.connectedSkyPortals,
  inheritedSourceStairSeams:oldStairs.newAdjacentMixedHeightSeams,
  flightGeometryHash:flights.flightProofSha256,
  historic36Unmodified:true,B172ThroughB181Unmodified:true,
  realMinecraftSteppingCertified:false,
  continuousPhysicalVerticalTraversalCertified:false,
  actualMinecraftCollisionCertified:false,
  engineeredStructuralAndFallSafetyCertified:false,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 check(verifyAerialReport(r),'UNSAFE_ARCHITECTURE_REPORT');
 return {parent,design,addon,compiled:merged.compiled,flights,report:r};
}
export function verifyAerialReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-aerial-switchback-megafacade'&&
  r.inherited3dCells===98495&&r.newlyOccupied3dCells>=2500&&
  r.sourceAirCellsReserved>=50&&r.sourceAirCellsReserved<=1800&&
  r.sourceAirReservationSha256?.length===64&&
  r.total3dCells===r.inherited3dCells+r.newlyOccupied3dCells-r.sourceAirCellsReserved&&
  r.inheritedAuthoredParts===826&&r.newlyAuthoredParts>=110&&r.newlyAuthoredParts<=160&&
  r.totalAuthoredParts===r.inheritedAuthoredParts+r.newlyAuthoredParts&&
  r.strictModuleCount===10&&r.b143PerModuleMax===160&&
  r.combinedCellCap===MAX_CELLS&&
  r.switchbackFlightCount===9&&r.sourceOneHighStepCount===36&&
  r.connectedFourTierCandidates===3&&
  r.retainedInsideOverlooks===12&&r.retainedSideViewpoints===24&&
  r.retainedLongHallFloors===4&&r.retainedSkybridges===8&&
  r.retainedSkyPortalCount===3&&r.inheritedSourceStairSeams===17&&
  r.flightGeometryHash?.length===64&&r.sourceSha256?.length===64&&
  r.geometrySha256?.length===64&&r.geometrySha256!==r.parentGeometrySha256&&
  r.historic36Unmodified===true&&r.B172ThroughB181Unmodified===true&&
  r.realMinecraftSteppingCertified===false&&
  r.continuousPhysicalVerticalTraversalCertified===false&&
  r.actualMinecraftCollisionCertified===false&&
  r.engineeredStructuralAndFallSafetyCertified===false&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(s=>s==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
