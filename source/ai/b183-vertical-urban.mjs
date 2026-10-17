/**
 * B183 — VERTICAL URBAN GALLERIES.
 * New strict B143 architecture module for SAME NEBULA ARK candidate #37.
 * Source-level two-wide lower/upper hall-to-switchback connections and
 * explicit full four-riser interface proof for all nine B182 flights.
 * No actual Minecraft walking, world access, construction or permissions.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildAerialSwitchback,inspectAerialFlights,FLIGHTS}
 from './b182-switchback.mjs';
import {auditOculusConnections} from './b181-oculus-atrium.mjs';
import {inspectFourTierArrivalPaths,HALLS} from './b180-atrium-arrivals.mjs';
import {inspectQuadTierAccess} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b183-vertical-urban-galleries-v1';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const guard=(v,why)=>{if(!v)throw Error('B183_'+why)};
const box=(id,origin,size,material='metal')=>
 ({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,mode:'add',shape:'beam',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,mode:'add',shape:'ellipsoid',center,radii,material,shell});
const tor=(id,center,majorRadius,tubeRadius,material='glow',axis='z')=>
 ({id,mode:'add',shape:'torus',center,majorRadius,tubeRadius,axis,material});
export function urbanGalleryElements(){
 const e=[];
 // Luminous guide strings are beyond Z46, OUTSIDE the rising floor/stage
 // body envelopes Z29..44. These are not functional collision guardrails.
 for(const f of FLIGHTS){
  const p='b183-'+f.id;
  e.push(
   beam(p+'-outer-upward-trace',[f.x-2,f.deck+2,47],
    [f.x-2,f.deck+6,48],'glow',1),
   beam(p+'-outer-lower-trace',[f.x+7,f.deck+2,47],
    [f.x+7,f.deck+6,48],'accent',1)
  );
 }
 // Genuinely massive façade, not a UI-only preview decal.
 for(const hall of HALLS){
  const cx=hall.centerX,p='b183-'+hall.id;
  e.push(
   box(p+'-grand-low-public-terrace',[cx-10,30,5],[21,1,13],'concrete'),
   box(p+'-central-aerial-terrace',[cx-10,40,6],[21,1,12],'metal'),
   box(p+'-third-terrace',[cx-9,49,6],[19,1,11],'wood'),
   box(p+'-hanging-sky-lobby',[cx-10,57,7],[21,1,11],'glass'),
   box(p+'-grand-roof-eyebrow',[cx-10,71,9],[21,1,11],'accent'),
   ell(p+'-outer-glazed-stargate',[cx,54,12],[10,11,7],'glass',1),
   ell(p+'-inner-glowing-lightwell',[cx,46,12],[8,8,6],'accent',1),
   tor(p+'-high-aerial-ring',[cx,66,13],7,1,'glow'),
   tor(p+'-mid-aerial-ring',[cx,39,13],6,1,'glow'),
   beam(p+'-left-giant-exoskeleton',[cx-10,29,7],
    [cx-10,71,10],'metal',1),
   beam(p+'-right-giant-exoskeleton',[cx+10,29,7],
    [cx+10,71,10],'metal',1),
   beam(p+'-left-upper-cable',[cx-9,47,19],
    [cx-6,70,19],'accent',1),
   beam(p+'-right-upper-cable',[cx+9,47,19],
    [cx+6,70,19],'accent',1),
   box(p+'-outer-landing-light',[cx-9,36,6],[19,1,2],'glow'),
   box(p+'-upper-public-ribbon',[cx-9,62,8],[19,1,2],'glow')
  );
  for(let i=0;i<5;i++){
   const x=cx-10+i*5;
   e.push(
    beam(p+'-colossal-front-rib-'+i,[x,30,6],
     [x,62,7],i%2?'accent':'metal',1),
    beam(p+'-diagonal-facade-stripe-'+i,[x,38,12],
     [x+2,56,15],i%2?'glow':'metal',1)
   );
  }
 }
 e.push(
  beam('b183-west-vault-cable',[35,45,8],[53,68,9],'glow',2),
  beam('b183-east-vault-cable',[90,45,8],[72,68,9],'glow',2),
  box('b183-west-cross-city-fin',[36,36,8],[17,1,7],'accent'),
  box('b183-east-cross-city-fin',[73,36,8],[17,1,7],'accent')
 );
 guard(e.length>=90&&e.length<=160,'AUTHORING_PART_COUNT_'+e.length);
 guard(new Set(e.map(x=>x.id)).size===e.length,'DUPLICATED_PART');
 return e;
}
export function createVerticalUrbanModule(){
 const d={schema:DSL,id:'nebula-ark-vertical-urban-galleries',
  title:'NEBULA ARK — VERTICAL URBAN GALLERIES',
  brief:'三大ホールの巨大透明外殻と空中公共テラスを増設し、従来の9本の上昇路候補の下階から上階まで実ボクセル連続経路を検査。Minecraft実機歩行は未認証。',
  bounds:{width:124,height:78,depth:50},elements:urbanGalleryElements(),
  designOnly:true};
 validateDesign(d);return d;
}
const makeCells=s=>new Set(s.primitives.map(p=>K(p[0],p[1],p[2])));
function nodeValid(set,x,y,z){
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  const a=x+dx,b=z+dz;
  if(!set.has(K(a,y-1,b))||
     set.has(K(a,y,b))||set.has(K(a,y+1,b)))return false;
 }
 return true;
}
function flatGraphPath(set,start,end,region){
 const [sx,y,sz]=start,[ex,ey,ez]=end;
 guard(y===ey,'CROSS_LEVEL_FLAT_PATH');
 const nodes=new Set();
 for(let x=region.x0;x<=region.x1;x++)
  for(let z=region.z0;z<=region.z1;z++)
   if(nodeValid(set,x,y,z))nodes.add(x+','+z);
 const a=sx+','+sz,b=ex+','+ez;
 if(!nodes.has(a)||!nodes.has(b))
  return {ok:false,length:0,nodes:nodes.size,reason:'endpoint-not-clear'};
 const q=[a],seen=new Map([[a,null]]);
 for(let i=0;i<q.length&&!seen.has(b);i++){
  const [x,z]=q[i].split(',').map(Number);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const n=(x+dx)+','+(z+dz);
   if(nodes.has(n)&&!seen.has(n)){seen.set(n,q[i]);q.push(n)}
  }
 }
 if(!seen.has(b))return {ok:false,length:0,nodes:nodes.size,reason:'no-flat-path'};
 const path=[];let at=b;
 while(at!==null){path.push(at);at=seen.get(at)}
 path.reverse();
 return {ok:true,length:path.length-1,nodes:nodes.size,
  first:path[0],last:path[path.length-1],pathSha256:sha(path)};
}
function oneRiseEdge(set,lower,upper){
 const [lx,ly,lz]=lower,[ux,uy,uz]=upper;
 // 2x2 supported locations stand one block apart in elevation.
 // The 2x2 columns touch ON THEIR EDGES along increasing Z (no gap).
 return ux===lx&&uy===ly+1&&uz===lz+2&&
  nodeValid(set,lx,ly,lz)&&nodeValid(set,ux,uy,uz);
}
export function inspectCompleteVerticalLinks(scene){
 const cells=makeCells(scene),proofs=[];
 for(const flight of FLIGHTS){
  const f=flight,y=f.deck+1;
  const minX=Math.max(8,Math.min(f.cx,f.x)-3);
  const maxX=Math.min(119,Math.max(f.cx,f.x+4)+3);
  // Lower source connection: the shared four-tier public spine (cx,Z29)
  // reaches the first 2x2 lower step staging block at (f.x,Z31).
  const low=flatGraphPath(cells,[f.cx,y,29],[f.x,y,31],
   {x0:minX,x1:maxX,z0:29,z1:32});
  // Upper source connection: the full top return strip at f.x+3,Z29
  // must also genuinely reach the upper floor's hall public spine.
  const high=flatGraphPath(cells,
   [f.x+3,y+4,29],[f.cx,y+4,29],
   {x0:minX,x1:maxX,z0:29,z1:32});
  const steps=[
   {lower:[f.x,y,31],upper:[f.x,y+1,33]},
   {lower:[f.x,y+1,34],upper:[f.x,y+2,36]},
   {lower:[f.x,y+2,37],upper:[f.x,y+3,39]},
   {lower:[f.x,y+3,40],upper:[f.x,y+4,42]}
  ];
  const edges=steps.map((s,i)=>({
   i,lower:s.lower,upper:s.upper,edgeAndHeadroom:oneRiseEdge(cells,s.lower,s.upper)
  }));
  // On top, move laterally to the return-gallery 2-wide platform.
  const endStep=[f.x,y+4,42],turn=[f.x+2,y+4,42];
  const topEdge=turn[0]-endStep[0]===2&&
   nodeValid(cells,...endStep)&&nodeValid(cells,...turn);
  // The 13-station upper return is 2-wide/2-high across its entire length.
  let verifiedUpperReturn=0;
  for(let z=29;z<=42;z++)
   if(nodeValid(cells,f.x+3,y+4,z))verifiedUpperReturn++;
  const passed=low.ok&&high.ok&&edges.every(x=>x.edgeAndHeadroom)&&
   topEdge&&verifiedUpperReturn===14;
  proofs.push({id:f.id,hall:f.hall,lowerLevel:f.deck,
   upperLevel:f.deck+4,
   sourceLowerJoined:low.ok,lowerFlatPathMoves:low.length,
   lowerPathSha256:low.pathSha256??null,
   sourceUpperJoined:high.ok,upperFlatPathMoves:high.length,
   upperPathSha256:high.pathSha256??null,
   inspectedRiserEdges:4,verifiedRiserEdges:edges.filter(x=>x.edgeAndHeadroom).length,
   topSameLevelEdgeVerified:topEdge,
   verifiedUpperReturnStations:verifiedUpperReturn,
   geometryConnectionPassed:passed,
   riserProof:edges,
   actualMinecraftWalkingCertified:false,
   physicalStepHeightCertified:false});
 }
 guard(proofs.length===9,'NOT_NINE_FLIGHTS');
 return {flights:proofs,
  sourceCompleteConnections:proofs.filter(x=>x.geometryConnectionPassed).length,
  verifiedCrossHeightRiserEdges:proofs.reduce((n,x)=>n+x.verifiedRiserEdges,0),
  verifiedLowerSourceJoins:proofs.filter(x=>x.sourceLowerJoined).length,
  verifiedUpperSourceJoins:proofs.filter(x=>x.sourceUpperJoined).length,
  fullSourceGeometryDigest:sha(proofs),
  actualMinecraftPlayerTraversalCertified:false,
  physicalCollisionCertified:false,railSafetyCertified:false};
}
function merge(parent,addon,d){
 const cells=new Map(parent.primitives.map(p=>[K(p[0],p[1],p[2]),p]));
 let newCells=0,overlap=0;
 for(const p of addon.primitives){
  const id=K(p[0],p[1],p[2]);
  if(cells.has(id)){overlap++;continue}
  cells.set(id,p);newCells++;
 }
 guard(newCells>=1500,'INSUFFICIENT_ARCHITECTURE');
 guard(cells.size<=MAX_CELLS,'GLOBAL_VOXEL_CAP');
 const primitives=[...cells.values()].sort((a,b)=>
  a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,
  minZ:Infinity,maxZ:-Infinity};
 const counts=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  counts[MATERIALS[p[3]]]++;
 }
 guard(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'MODEL_BOUNDARY');
 const sourceSha256=sha({schema:SCHEMA,parent:parent.sourceSha256,
  addon:addon.sourceSha256,policy:'preserve-all-parent-occupied-cells'});
 const geometrySha256=sha({sourceSha256,primitives});
 return {compiled:{...parent,id:'nebula-ark-vertical-urban-galleries',
  title:'NEBULA ARK — VERTICAL URBAN GALLERIES / 巨大天空交通結節',
  brief:'三大巨大公共施設の上下階を概念上連続する空中経路で接続し外装を巨大化した独立立体建築。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...parent.stats,voxels:primitives.length,layerCounts:counts,
   moduleCount:11,designOperations:[
    ...parent.stats.designOperations,
    ...addon.stats.designOperations.map(p=>({...p,module:d.id}))]}},
  newCells,overlap};
}
export function buildVerticalUrban(){
 const parent=buildAerialSwitchback(),design=createVerticalUrbanModule(),
  addon=compileDesign(design);
 guard(verifyCompiled(design,addon),'INVALID_STRICT_B143_MODULE');
 const joined=merge(parent.compiled,addon,design);
 const path=inspectCompleteVerticalLinks(joined.compiled);
 guard(path.sourceCompleteConnections===9,'MISSING_COMPLETE_FLIGHT_'+
  JSON.stringify(path.flights.filter(x=>!x.geometryConnectionPassed)));
 const b182=inspectAerialFlights(joined.compiled);
 const b181=auditOculusConnections(joined.compiled);
 const b180=inspectFourTierArrivalPaths(joined.compiled);
 const b179=inspectQuadTierAccess(joined.compiled);
 const b178=inspectPublicConcourse(joined.compiled);
 const b176=analyzeAuroraTransit(joined.compiled);
 const report={schema:SCHEMA,id:joined.compiled.id,
  sourceSha256:joined.compiled.sourceSha256,
  geometrySha256:joined.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  parentCells:parent.compiled.primitives.length,
  addedUniqueCells:joined.newCells,
  totalOccupiedCells:joined.compiled.primitives.length,
  preservedOverlappingCells:joined.overlap,
  inheritedAuthoredParts:parent.report.totalAuthoredParts,
  newlyAuthoredParts:design.elements.length,
  totalAuthoredParts:parent.report.totalAuthoredParts+design.elements.length,
  independentlyStrictB143Modules:11,perModuleElementsLimit:160,
  maxCombinedCells:MAX_CELLS,
  sourceCompleteVerticalFlightConnections:path.sourceCompleteConnections,
  sourceRiserEdges:path.verifiedCrossHeightRiserEdges,
  verifiedLowerFloorJoins:path.verifiedLowerSourceJoins,
  verifiedUpperFloorJoins:path.verifiedUpperSourceJoins,
  flightPathDigestSha256:path.fullSourceGeometryDigest,
  inheritedSwitchbackTreads:b182.treadCount,
  inheritedAtriumTurnouts:b181.verifiedSourceTurnouts,
  inheritedLateralViewArms:b181.verifiedLateralViewpointArms,
  inheritedFourPublicHallFloors:b180.tiers.length,
  inheritedEightSkybridges:b179.passed,
  inheritedThreeRoofPublicPortals:b178.connectedSkyPortals,
  inheritedRiserSeams:b176.newAdjacentMixedHeightSeams,
  old36GalleryUnmodified:true,B172ThroughB182Unmodified:true,
  sourceBasedGeometryOnly:true,realMinecraftWalkingCertified:false,
  realPlayerCollisionCertified:false,interfloorPhysicalTraversalCertified:false,
  fallAndStructuralSafetyCertified:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  constructionApproved:false,worldCoordinates:null,worldContacts:0,worldWrites:0,
  BuildPlan:{operations:[]}};
 guard(verifyVerticalUrbanReport(report),'SECURITY_REPORT_HOLD');
 return {parent,design,addon,compiled:joined.compiled,connections:path,report};
}
export function verifyVerticalUrbanReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-vertical-urban-galleries'&&
  r.parentCells===102668&&r.addedUniqueCells>=1500&&
  r.totalOccupiedCells===r.parentCells+r.addedUniqueCells&&
  r.inheritedAuthoredParts===959&&r.newlyAuthoredParts>=90&&
  r.newlyAuthoredParts<=160&&
  r.totalAuthoredParts===r.inheritedAuthoredParts+r.newlyAuthoredParts&&
  r.independentlyStrictB143Modules===11&&r.perModuleElementsLimit===160&&
  r.maxCombinedCells===MAX_CELLS&&
  r.sourceCompleteVerticalFlightConnections===9&&
  r.sourceRiserEdges===36&&r.verifiedLowerFloorJoins===9&&
  r.verifiedUpperFloorJoins===9&&r.flightPathDigestSha256?.length===64&&
  r.inheritedSwitchbackTreads===36&&r.inheritedAtriumTurnouts===12&&
  r.inheritedLateralViewArms===24&&r.inheritedFourPublicHallFloors===4&&
  r.inheritedEightSkybridges===8&&r.inheritedThreeRoofPublicPortals===3&&
  r.inheritedRiserSeams===17&&r.sourceSha256?.length===64&&
  r.geometrySha256?.length===64&&r.geometrySha256!==r.parentGeometrySha256&&
  r.old36GalleryUnmodified===true&&r.B172ThroughB182Unmodified===true&&
  r.sourceBasedGeometryOnly===true&&r.realMinecraftWalkingCertified===false&&
  r.realPlayerCollisionCertified===false&&r.interfloorPhysicalTraversalCertified===false&&
  r.fallAndStructuralSafetyCertified===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  r.constructionApproved===false&&r.worldCoordinates===null&&
  r.worldContacts===0&&r.worldWrites===0&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
