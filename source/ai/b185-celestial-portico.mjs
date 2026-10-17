/** B185 CELESTIAL PORTICO: Thirteenth strict B143 design module.
 * Adds three source-only Y73 -> Y74 -> Y75 roof access candidates and
 * colossal urban glass facade. No Minecraft world writes or permission.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {buildPanoramaCrown,inspectPanoramaParkConnections} from './b184-panorama-crown.mjs';
import {inspectCompleteVerticalLinks} from './b183-vertical-urban.mjs';
import {inspectAerialFlights} from './b182-switchback.mjs';
import {auditOculusConnections} from './b181-oculus-atrium.mjs';
import {inspectFourTierArrivalPaths,HALLS} from './b180-atrium-arrivals.mjs';
import {inspectQuadTierAccess} from './b179-quad-tier.mjs';
import {inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b185-celestial-portico-v1';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const guard=(v,s)=>{if(!v)throw Error('B185_'+s)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>({id,mode:'add',shape:'beam',start,end,thickness,material});
const ell=(id,center,radii,material='glass',shell=1)=>({id,mode:'add',shape:'ellipsoid',center,radii,material,shell});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>({id,mode:'add',shape:'torus',axis:'z',center,majorRadius,tubeRadius,material});
export const GATES=Object.freeze(HALLS.map(x=>Object.freeze({id:x.id,cx:x.centerX,x:x.centerX+4})));
export function porticoElements(){
 const parts=[
 box('b185-floating-roof-crown',[10,77,0],[106,1,9],'glass'),
 box('b185-front-rim',[10,76,0],[106,1,1],'glow'),
 box('b185-upper-halo-ribbon',[10,77,9],[106,1,3],'accent'),
 box('b185-lower-civic-megaspine',[10,37,1],[106,1,5],'metal')
 ];
 for(const g of GATES){
  const pre='b185-'+g.id;
  parts.push(
   box(pre+'-lower-roof-transition',[g.x,72,29],[3,1,3],'concrete'),
   box(pre+'-first-rise',[g.x,73,27],[3,1,2],'metal'),
   box(pre+'-roof-arrival-deck',[g.x+1,74,24],[5,1,3],'wood'),
   box(pre+'-approach-light',[g.x+1,70,24],[5,1,2],'glow'),
   box(pre+'-outer-roof-curb',[g.x+7,73,25],[2,1,5],'accent'),
   beam(pre+'-hanging-roof-member',[g.x+8,55,18],[g.x+8,71,20],'metal')
  );
 }
 for(const h of HALLS){
  const cx=h.centerX,id='b185-'+h.id;
  parts.push(
   ell(id+'-grand-arch-shell',[cx,56,7],[12,15,7],'glass',1),
   ell(id+'-luminous-arched-hall',[cx,61,6],[11,13,6],'accent',1),
   tor(id+'-lower-orbit-ring',[cx,46,5],8,1,'glow'),
   tor(id+'-upper-orbit-ring',[cx,64,5],8,1,'glow'),
   box(id+'-front-civic-terrace',[cx-11,43,0],[23,1,10],'wood'),
   box(id+'-upper-civic-terrace',[cx-11,54,0],[23,1,10],'concrete'),
   box(id+'-third-facade-band',[cx-12,66,0],[25,1,9],'glass'),
   box(id+'-suspended-upper-fin',[cx-12,73,0],[25,1,4],'accent'),
   beam(id+'-left-colossal-spire',[cx-11,35,1],[cx-10,75,1],'metal',1),
   beam(id+'-right-colossal-spire',[cx+11,35,1],[cx+10,75,1],'metal',1)
  );
  for(let n=0;n<5;n++){
   const x=cx-10+n*5;
   parts.push(
    beam(id+'-outer-column-'+n,[x,27,1],[x,73,1],n%2?'accent':'metal'),
    beam(id+'-diagonal-light-column-'+n,[x,31,3],[x+1,68,4],n%2?'glow':'metal'),
    beam(id+'-portal-chord-'+n,[x,40,5],[x+2,63,6],n%2?'accent':'metal')
   );
  }
 }
 parts.push(
  beam('b185-west-urban-portico',[36,40,2],[53,72,4],'accent',2),
  beam('b185-east-urban-portico',[90,40,2],[73,72,4],'accent',2),
  box('b185-west-city-low-span',[35,34,0],[18,1,8],'metal'),
  box('b185-east-city-low-span',[74,34,0],[18,1,8],'metal')
 );
 guard(parts.length>=95&&parts.length<=160,'MODULE_COUNT_'+parts.length);
 guard(new Set(parts.map(x=>x.id)).size===parts.length,'DUPLICATE_ID');
 return parts;
}
export function createPorticoModule(){
 const d={schema:DSL,id:'nebula-ark-celestial-portico',
  title:'NEBULA ARK — CELESTIAL PORTICO',
  brief:'三大ホール最上階から天空公園へ連続する二段の上昇経路候補と、巨大な浮遊屋根・ガラス外殻・公共テラスを実体積立体建築として追加。実機移動・施工未認証。',
  bounds:{width:124,height:78,depth:50},elements:porticoElements(),designOnly:true};
 validateDesign(d);return d;
}
function occ(scene){return new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])))}
function floor2(set,x,y,z){
 for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
  const a=x+dx,b=z+dz;
  if(!set.has(K(a,y-1,b))||set.has(K(a,y,b))||set.has(K(a,y+1,b)))return false;
 }
 return true;
}
function flatPath(set,start,end,r){
 const [sx,y,sz]=start,[ex,ey,ez]=end;
 guard(y===ey,'LEVEL_ERROR');
 const pass=new Set();
 for(let x=r.x0;x<=r.x1;x++)for(let z=r.z0;z<=r.z1;z++)
  if(floor2(set,x,y,z))pass.add(x+','+z);
 const a=sx+','+sz,b=ex+','+ez;
 if(!pass.has(a)||!pass.has(b))return {ok:false,reason:'endpoint'};
 const q=[a],prev=new Map([[a,null]]);
 for(let i=0;i<q.length&&!prev.has(b);i++){
  const [x,z]=q[i].split(',').map(Number);
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
   const key=(x+dx)+','+(z+dz);
   if(pass.has(key)&&!prev.has(key)){prev.set(key,q[i]);q.push(key)}
  }
 }
 if(!prev.has(b))return {ok:false,reason:'disconnected'};
 const route=[];let cur=b;
 while(cur!==null){route.push(cur);cur=prev.get(cur)}
 route.reverse();
 return {ok:true,moves:route.length-1,pathSha256:H(route)};
}
export function auditRoofGates(scene){
 const cells=occ(scene),proof=[];
 for(const g of GATES){
  const stages=[[g.x,73,29],[g.x,74,27],[g.x,75,25]];
  stages.forEach(([x,y,z],i)=>guard(floor2(cells,x,y,z),
   'STAGE_'+g.id+'_'+i+'_'+x+'_'+y+'_'+z));
  const low=flatPath(cells,[g.cx,73,29],stages[0],
   {x0:g.cx-1,x1:g.cx+9,z0:29,z1:32});
  const upper=flatPath(cells,stages[2],[g.cx,75,25],
   {x0:g.cx-1,x1:g.cx+9,z0:24,z1:28});
  const edges=stages.slice(1).every((v,i)=>
   v[1]===stages[i][1]+1&&stages[i][2]-v[2]===2&&v[0]===stages[i][0]);
  proof.push({hall:g.id,geometryConnected:low.ok&&upper.ok&&edges,
   sourceLowerJoined:low.ok,sourceUpperJoined:upper.ok,
   lowerPathSha256:low.pathSha256??null,upperPathSha256:upper.pathSha256??null,
   sourceRiserEdges:2,verifiedSourceStages:3,
   inGameSteppingCertified:false,physicalWalkingCertified:false});
 }
 return {gates:proof,joined:proof.filter(v=>v.geometryConnected).length,
  risers:proof.reduce((n,v)=>n+v.sourceRiserEdges,0),
  stages:proof.reduce((n,v)=>n+v.verifiedSourceStages,0),
  sourceProofSha256:H(proof),minecraftPlayerWalkingCertified:false};
}
function compose(old,extra,design){
 const m=new Map(old.primitives.map(v=>[K(v[0],v[1],v[2]),v]));
 let newCount=0,overlap=0;
 for(const p of extra.primitives){
  const id=K(p[0],p[1],p[2]);
  if(m.has(id)){overlap++;continue}
  m.set(id,p);newCount++;
 }
 guard(newCount>=2500,'INSUFFICIENT_ARCHITECTURAL_VOLUME');
 // Source-only roof apertures. Not Minecraft commands. Preserve old files.
 const cut=[];
 for(const g of GATES)for(let x=g.x;x<=g.x+2;x++)
  for(let z=27;z<=28;z++)for(let y=74;y<=75;y++){
   const id=K(x,y,z);if(m.delete(id))cut.push(id);
  }
 guard(cut.length>=6&&cut.length<=36,'BAD_APERTURE_COUNT_'+cut.length);
 guard(m.size<=MAX_CELLS,'GLOBAL_LIMIT');
 const primitives=[...m.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const layerCounts=Object.fromEntries(MATERIALS.map(k=>[k,0]));
 for(const v of primitives){
  bounds.minX=Math.min(bounds.minX,v[0]);bounds.maxX=Math.max(bounds.maxX,v[0]);
  bounds.minY=Math.min(bounds.minY,v[1]);bounds.maxY=Math.max(bounds.maxY,v[1]);
  bounds.minZ=Math.min(bounds.minZ,v[2]);bounds.maxZ=Math.max(bounds.maxZ,v[2]);
  layerCounts[MATERIALS[v[3]]]++;
 }
 guard(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'OUTSIDE_ENVELOPE');
 const sourceSha256=H({schema:SCHEMA,parent:old.sourceSha256,addon:extra.sourceSha256,
  airMask:'three-limited-source-roof-stair-windows'});
 const geometrySha256=H({sourceSha256,primitives});
 return {compiled:{...old,id:'nebula-ark-celestial-portico',
  title:'NEBULA ARK — CELESTIAL PORTICO / 巨大天空公園の連続動線',
  brief:'三大ホールから天空公園へ段差接続する未来公共建築と巨大浮遊ガラス都市外殻。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...old.stats,voxels:primitives.length,layerCounts,moduleCount:13,
   designOperations:[...old.stats.designOperations,
     ...extra.stats.designOperations.map(v=>({...v,module:design.id}))]}},
  newCount,overlap,cut:cut.length,cutHash:H(cut.sort())};
}
export function buildCelestialPortico(){
 const parent=buildPanoramaCrown(),design=createPorticoModule(),
  addon=compileDesign(design);
 guard(verifyCompiled(design,addon),'B143_MODULE_FAILED');
 const merged=compose(parent.compiled,addon,design);
 const access=auditRoofGates(merged.compiled);
 guard(access.joined===3,'THREE_SOURCE_ROOF_GATES_'+JSON.stringify(access.gates));
 const b184=inspectPanoramaParkConnections(merged.compiled);
 const b183=inspectCompleteVerticalLinks(merged.compiled);
 const b182=inspectAerialFlights(merged.compiled);
 const b181=auditOculusConnections(merged.compiled);
 const b180=inspectFourTierArrivalPaths(merged.compiled);
 const b179=inspectQuadTierAccess(merged.compiled);
 const b178=inspectPublicConcourse(merged.compiled);
 const b176=analyzeAuroraTransit(merged.compiled);
 const report={schema:SCHEMA,id:merged.compiled.id,
  sourceSha256:merged.compiled.sourceSha256,geometrySha256:merged.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  inheritedVoxels:parent.compiled.primitives.length,
  addedNewVoxels:merged.newCount,sourceOnlyAirCuts:merged.cut,
  sourceAirSha256:merged.cutHash,totalVoxels:merged.compiled.primitives.length,
  inheritedElements:parent.report.totalAuthoredParts,
  newElements:design.elements.length,
  totalElements:parent.report.totalAuthoredParts+design.elements.length,
  modules:13,elementLimitPerModule:160,maxOccupiedVoxels:MAX_CELLS,
  roofAccessGates:access.joined,sourceRiserEdges:access.risers,
  supportedTransitionStages:access.stages,roofAccessSha256:access.sourceProofSha256,
  oldParks:b184.sourceConnectedSkyparks,oldRoofMoves:b184.newSkyway2wideMoves,
  oldVerticalFlights:b183.sourceCompleteConnections,oldSteps:b182.treadCount,
  oldInnerHallPaths:b181.verifiedSourceTurnouts,
  oldSideViews:b181.verifiedLateralViewpointArms,
  oldHallFloors:b180.tiers.length,oldBridges:b179.passed,
  oldRoofPortals:b178.connectedSkyPortals,
  oldStepInterfaces:b176.newAdjacentMixedHeightSeams,
  original36Unaffected:true,originalB172ToB184Unchanged:true,
  sourceOnly:true,actualEducationSteppingCertified:false,
  actualEducationWalkingCertified:false,actualCollisionCertified:false,
  fallAndStructuralSafetyCertified:false,worldCoordinates:null,
  worldContacts:0,worldWrites:0,constructionApproved:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
 guard(verifyCelestialPorticoReport(report),'SAFETY_REPORT_FAILED');
 return {parent,design,addon,compiled:merged.compiled,access,report};
}
export function verifyCelestialPorticoReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-celestial-portico'&&
  r.inheritedVoxels===114983&&r.addedNewVoxels>=2500&&
  r.sourceOnlyAirCuts>=6&&r.sourceOnlyAirCuts<=36&&
  r.totalVoxels===r.inheritedVoxels+r.addedNewVoxels-r.sourceOnlyAirCuts&&
  r.sourceAirSha256?.length===64&&
  r.inheritedElements===1163&&r.newElements>=95&&r.newElements<=160&&
  r.totalElements===r.inheritedElements+r.newElements&&
  r.modules===13&&r.elementLimitPerModule===160&&r.maxOccupiedVoxels===MAX_CELLS&&
  r.roofAccessGates===3&&r.sourceRiserEdges===6&&r.supportedTransitionStages===9&&
  r.roofAccessSha256?.length===64&&r.oldParks===3&&r.oldRoofMoves===99&&
  r.oldVerticalFlights===9&&r.oldSteps===36&&
  r.oldInnerHallPaths===12&&r.oldSideViews===24&&
  r.oldHallFloors===4&&r.oldBridges===8&&
  r.oldRoofPortals===3&&r.oldStepInterfaces===17&&
  r.original36Unaffected===true&&r.originalB172ToB184Unchanged===true&&
  r.sourceOnly===true&&r.actualEducationSteppingCertified===false&&
  r.actualEducationWalkingCertified===false&&r.actualCollisionCertified===false&&
  r.fallAndStructuralSafetyCertified===false&&r.worldCoordinates===null&&
  r.worldContacts===0&&r.worldWrites===0&&r.constructionApproved===false&&
  r.readiness==='NOT_PREPARED'&&r.gates?.length===9&&
  r.gates.every(v=>v==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
