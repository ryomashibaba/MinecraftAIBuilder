/**
 * B181 — OCULUS ATRIUM SIGHTLINES.
 * Ninth independent strict B143 3D concept module. Source-local XYZ only.
 * Four deck levels x three halls gain *perpendicular* 2x2-supported public
 * turns and lateral floating overlook spines, with true head clearance.
 * This is not Minecraft walking, collision, construction or permissions.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildAtriumArrivals,inspectFourTierArrivalPaths,HALLS}
 from './b180-atrium-arrivals.mjs';
import {inspectQuadTierAccess,TIERS} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b181-oculus-atrium-sightlines-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const k=(x,y,z)=>x+','+y+','+z;
const need=(ok,reason)=>{if(!ok)throw Error('B181_'+reason)};
const box=(id,origin,size,material='metal')=>({id,shape:'box',mode:'add',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>({id,shape:'beam',mode:'add',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>({id,shape:'ellipsoid',mode:'add',center,radii,shell,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>({id,shape:'torus',axis:'z',mode:'add',center,majorRadius,tubeRadius,material});
export const TURNOUT={startZ:29,endZ:39,overlookZ:38,wingWidth:11};
export function oculusElements(){
 const elements=[];
 for(const [i,deck] of TIERS.entries()){
  for(const hall of HALLS){
   const id='b181-'+hall.id+'-tier-'+i, cx=hall.centerX;
   // Real 4-wide bridge physically extends 10 metres into the tall void.
   elements.push(
    box(id+'-public-inner-threshold',[cx-1,deck,31],[4,1,10],
      i%2?'glass':'concrete'),
    box(id+'-cross-shaped-belvedere',[cx-5,deck,37],[11,1,6],
      i%2?'wood':'accent'),
    box(id+'-outer-facing-glow',[cx-5,deck-2,43],[11,1,2],'glow'),
    box(id+'-underdeck-mega-spine',[cx-5,deck-3,40],[11,1,3],'metal'),
    box(id+'-viewing-wing-left',[cx-6,deck,40],[2,1,4],'glass'),
    box(id+'-viewing-wing-right',[cx+5,deck,40],[2,1,4],'glass')
   );
  }
 }
 // Twelve suspended interior walkouts plus massive, lower architectural
 // backdrop arrays. Floating lenses never cover corridor headspace.
 for(const hall of HALLS){
  const cx=hall.centerX;
  elements.push(
   ell('b181-'+hall.id+'-great-lower-glass-lens',[cx,48,17],
    [11,8,8],'glass',1),
   tor('b181-'+hall.id+'-lower-grand-occultation',[cx,46,18],9,1,'glow'),
   beam('b181-'+hall.id+'-east-upward-glass-chord',
    [cx+7,34,17],[cx+10,57,21],'accent',1),
   beam('b181-'+hall.id+'-west-upward-glass-chord',
    [cx-7,34,17],[cx-10,57,21],'metal',1),
   box('b181-'+hall.id+'-massive-entry-exterior-shelf',
    [cx-10,39,11],[21,1,7],'concrete'),
   box('b181-'+hall.id+'-outer-balcony-flare',
    [cx-9,51,9],[19,1,7],'glass'),
   box('b181-'+hall.id+'-luminous-side-crest',
    [cx-9,55,10],[19,1,3],'glow')
  );
  for(let n=0;n<5;n++){
   const x=cx-10+n*5;
   elements.push(
    beam('b181-'+hall.id+'-monumental-foreleg-'+n,
      [x,31,11],[x+1,48,13],n%2?'accent':'metal',1),
    beam('b181-'+hall.id+'-facade-riser-'+n,
      [x,39,21],[x,55,23],n%2?'glow':'metal',1)
   );
  }
 }
 // Interhall visual fins at the lower façade, beyond protected routes.
 elements.push(
  beam('b181-large-west-urban-strut',[35,43,16],[51,57,17],'accent',2),
  beam('b181-large-east-urban-strut',[90,43,16],[74,57,17],'accent',2),
  box('b181-low-west-public-flyover',[35,42,14],[17,1,7],'metal'),
  box('b181-low-east-public-flyover',[74,42,14],[18,1,7],'metal')
 );
 need(elements.length>=120&&elements.length<=160,'AUTHORING_ELEMENT_COUNT_'+elements.length);
 need(new Set(elements.map(e=>e.id)).size===elements.length,'DUPLICATE_ID');
 return elements;
}
export function createOculusModule(){
 const design={schema:DSL,id:'nebula-ark-oculus-sightlines-module',
  title:'NEBULA ARK — OCULUS ATRIUM SIGHTLINES',
  brief:'四層の長大公共回廊から3つの巨大ホール内部へ曲がる幅2の展望動線12系統、左右24箇所の展望地点、空中アトリウム床、巨大ガラスレンズと列柱を実三次元造形で追加。実機施工未認証。',
  bounds:{width:124,height:78,depth:50},elements:oculusElements(),designOnly:true};
 validateDesign(design);return design;
}
const sq=(x,z)=>[[x,z],[x+1,z],[x,z+1],[x+1,z+1]];
function occupied(scene){return new Set(scene.primitives.map(v=>k(v[0],v[1],v[2])))}
function is2wide(set,x,standingY,z){
 return sq(x,z).every(([a,b])=>
  set.has(k(a,standingY-1,b))&&!set.has(k(a,standingY,b))&&
  !set.has(k(a,standingY+1,b)));
}
export function auditOculusConnections(scene){
 const cells=occupied(scene),perTier=[];
 let fullyConnected=0,lateralArms=0;
 for(const [i,deck] of TIERS.entries()){
  const standingY=deck+1,halls=[];
  for(const hall of HALLS){
   const cx=hall.centerX,nodes=new Set();
   for(let x=cx-6;x<=cx+5;x++)for(let z=29;z<=41;z++)
    if(is2wide(cells,x,standingY,z))nodes.add(x+','+z);
   const start=cx+',29',end=cx+',39';
   need(nodes.has(start),'FRONT_CONCOURSE_LOST_'+i+'_'+hall.id);
   const queue=[start],seen=new Set(queue);
   for(let j=0;j<queue.length;j++){
    const [x,z]=queue[j].split(',').map(Number);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const key=(x+dx)+','+(z+dz);
     if(nodes.has(key)&&!seen.has(key)){seen.add(key);queue.push(key)}
    }
   }
   for(let z=29;z<=TURNOUT.endZ;z++)
    need(is2wide(cells,cx,standingY,z),
      'PERPENDICULAR_BRANCH_BREAK_'+i+'_'+hall.id+'_'+z);
   for(let x=cx-4;x<=cx+3;x++)
    need(is2wide(cells,x,standingY,TURNOUT.overlookZ),
      'LATERAL_GALLERY_BREAK_'+i+'_'+hall.id+'_'+x);
   const left=(cx-4)+','+TURNOUT.overlookZ;
   const right=(cx+3)+','+TURNOUT.overlookZ;
   need(seen.has(end)&&seen.has(left)&&seen.has(right),
    'OPEN_VIEWING_WINGS_DISCONNECTED_'+i+'_'+hall.id);
   halls.push({hall:hall.id,deckY:deck,
    originalEntry:start,innerView:end,
    lateralViewpoints:[left,right],reachableNodes:seen.size,
    sourceSupported2Wide:true,
    minecraftPlayerMovementCertified:false});
   fullyConnected++;lateralArms+=2;
  }
  perTier.push({level:i,deckY:deck,halls});
 }
 const corridorAirSamples=[];
 for(const hall of HALLS){
  let air=0,sample=0;
  for(let x=hall.centerX-4;x<=hall.centerX+4;x++)
   for(let y=61;y<=71;y++)for(let z=41;z<=46;z++){
    sample++;
    if(!cells.has(k(x,y,z)))air++;
   }
  corridorAirSamples.push({hall:hall.id,air,inspected:sample,
   openFraction:+(air/sample).toFixed(3)});
 }
 need(corridorAirSamples.every(x=>x.air>=60),'ATRIA_VIEW_VOID_LOST');
 return {levels:perTier,
  verifiedSourceTurnouts:fullyConnected,
  verifiedLateralViewpointArms:lateralArms,
  hallOpenVolumeSamples:corridorAirSamples,
  routeDigestSha256:sha(perTier),sourceOnly:true,
  realMinecraftWalkingCertified:false,realCollisionCertified:false,
  structuralAndFallSafetyCertified:false};
}
function join(old,addon,design){
 const map=new Map(old.primitives.map(p=>[k(p[0],p[1],p[2]),p]));
 let added=0,overlap=0;
 for(const p of addon.primitives){
  const id=k(p[0],p[1],p[2]);
  if(map.has(id)){overlap++;continue}
  map.set(id,p);added++;
 }
 need(added>=2000,'INSUFFICIENT_NEW_SOURCE_ARCHITECTURE');
 // Source-only bounded clearance. This mask is 4 levels x 3 halls,
 // extending into Z31..40, and cannot intersect ANY historical
 // roof/rear/ground corridor (or the B180 Z29..30 trunk).
 const carved=[];
 for(const deck of TIERS)for(const hall of HALLS){
  const cx=hall.centerX;
  const mask=new Set();
  // Turning passage: two X columns, Z31..40, standingY/y+1.
  for(let x=cx;x<=cx+1;x++)for(let z=31;z<=40;z++)
   for(let dy=1;dy<=2;dy++)mask.add(k(x,deck+dy,z));
  // Side-view belvedere: full two-high clearance, X(c-4)..(c+5)
  // covering all 2x2 footprint end columns at Z38..39.
  for(let x=cx-4;x<=cx+5;x++)for(let z=38;z<=39;z++)
   for(let dy=1;dy<=2;dy++)mask.add(k(x,deck+dy,z));
  for(const cell of mask){
   if(!map.has(cell))continue;
   map.delete(cell);carved.push(cell);
  }
 }
 need(carved.length>=5&&carved.length<=900,'BOUNDED_CLEARANCE_OVERFLOW_'+carved.length);
 need(map.size<=MAX_CELLS,'GLOBAL_B143_VOXEL_LIMIT');
 const primitives=[...map.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const layers=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  layers[MATERIALS[p[3]]]++;
 }
 need(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'MODEL_ENVELOPE');
 const sourceSha256=sha({schema:SCHEMA,parent:old.sourceSha256,
  addon:addon.sourceSha256,mask:'12-2wide-interior-thresholds'});
 const geometrySha256=sha({sourceSha256,primitives});
 return {compiled:{...old,id:'nebula-ark-oculus-atrium-sightlines',
  title:'NEBULA ARK — OCULUS / 三大天空アトリウムの展望動線',
  brief:'四層の巨大公共空間を内側の展望橋・浮遊ガラスレンズ・広場と一体にしたオリジナル都市級建築。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...old.stats,voxels:primitives.length,layerCounts:layers,
   moduleCount:9,designOperations:[
    ...old.stats.designOperations,
    ...addon.stats.designOperations.map(p=>({...p,module:design.id}))]}},
  added,overlap,carvedCount:carved.length,carvedSha256:sha(carved.sort())};
}
export function buildOculusAtrium(){
 const parent=buildAtriumArrivals(),design=createOculusModule(),
  addon=compileDesign(design);
 need(verifyCompiled(design,addon),'INVALID_INDEPENDENT_DSL_MODULE');
 const assembled=join(parent.compiled,addon,design);
 const connections=auditOculusConnections(assembled.compiled);
 const prior=inspectFourTierArrivalPaths(assembled.compiled);
 const bridges=inspectQuadTierAccess(assembled.compiled);
 need(prior.tiers.length===4&&bridges.passed===8,
  'B180_B179_SOURCE_ROUTE_REGRESSION');
 const publicSky=inspectPublicConcourse(assembled.compiled);
 const stairs=analyzeAuroraTransit(assembled.compiled);
 const report={schema:SCHEMA,id:assembled.compiled.id,
  sourceSha256:assembled.compiled.sourceSha256,
  geometrySha256:assembled.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  inheritedOccupiedCells:parent.compiled.primitives.length,
  newlyOccupiedCells:assembled.added,
  offlineClearanceCells:assembled.carvedCount,
  sourceOnlyCarveSha256:assembled.carvedSha256,
  final3dCells:assembled.compiled.primitives.length,
  inheritedElements:parent.report.totalParts,
  newElements:design.elements.length,
  totalElements:parent.report.totalParts+design.elements.length,
  independentModules:9,perModuleElementCap:160,globalCellsCap:MAX_CELLS,
  interiorTurnoutsCertifiedGeometry:connections.verifiedSourceTurnouts,
  interiorLateralArmsCertifiedGeometry:connections.verifiedLateralViewpointArms,
  atriumOpenSamples:connections.hallOpenVolumeSamples,
  routeEvidenceSha256:connections.routeDigestSha256,
  inheritedFourLongHallFloors:prior.tiers.length,
  inheritedEightBridges:bridges.passed,
  inheritedThreeSkyPortals:publicSky.connectedSkyPortals,
  inheritedSeventeenSourceStairSeams:stairs.newAdjacentMixedHeightSeams,
  original36Unmodified:true,B172ToB180SourceUnmodified:true,
  minecraftPlayerWalkingCertified:false,minecraftCollisionCertified:false,
  realInterfloorTravelCertified:false,structuralAndFallSafetyCertified:false,
  worldCoordinates:null,worldContacts:0,worldWrites:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 need(verifyOculusReport(report),'INVALID_REPORT');
 return {parent,design,addon,compiled:assembled.compiled,connections,report};
}
export function verifyOculusReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-oculus-atrium-sightlines'&&
  r.inheritedOccupiedCells===94083&&r.newlyOccupiedCells>=2000&&
  r.offlineClearanceCells>=5&&r.offlineClearanceCells<=900&&
  r.sourceOnlyCarveSha256?.length===64&&
  r.final3dCells===r.inheritedOccupiedCells+r.newlyOccupiedCells-r.offlineClearanceCells&&
  r.inheritedElements===699&&r.newElements>=120&&r.newElements<=160&&
  r.totalElements===r.inheritedElements+r.newElements&&
  r.independentModules===9&&r.perModuleElementCap===160&&
  r.globalCellsCap===MAX_CELLS&&
  r.interiorTurnoutsCertifiedGeometry===12&&r.interiorLateralArmsCertifiedGeometry===24&&
  r.atriumOpenSamples?.length===3&&r.atriumOpenSamples.every(x=>x.air>=60)&&
  r.routeEvidenceSha256?.length===64&&
  r.inheritedFourLongHallFloors===4&&r.inheritedEightBridges===8&&
  r.inheritedThreeSkyPortals===3&&r.inheritedSeventeenSourceStairSeams===17&&
  r.sourceSha256?.length===64&&r.geometrySha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  r.original36Unmodified===true&&r.B172ToB180SourceUnmodified===true&&
  r.minecraftPlayerWalkingCertified===false&&r.minecraftCollisionCertified===false&&
  r.realInterfloorTravelCertified===false&&r.structuralAndFallSafetyCertified===false&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
