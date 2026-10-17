/** B178 CONNECTED SKY CONCOURSE: true 3D source-based public connectors.
 * Independent strict B143 module, additive voxel composition only.
 * DESIGN LOCAL coordinates; no world writes, approval or Minecraft contact.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {buildTripleAtrium,auditTripleAtrium} from './b177-triple-atrium.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b178-connected-sky-concourse-v1';
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const k=(x,y,z)=>x+','+y+','+z;
const ok=(v,s)=>{if(!v)throw Error('B178_'+s)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>({id,mode:'add',shape:'beam',start,end,thickness,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>({id,mode:'add',shape:'torus',axis:'z',center,majorRadius,tubeRadius,material});
export const PORTALS=Object.freeze([
 {id:'north',x:24,left:13,w:25},{id:'core',x:62,left:48,w:29},{id:'south',x:101,left:89,w:25}
].map(v=>Object.freeze(v)));
export const GALLERY_TIERS=Object.freeze([60,64,68,72]);
export function connectedSkyElements(){
 const e=[
  box('b178-main-sky-concourse',[9,74,7],[108,1,8],'concrete'),
  box('b178-horizontal-eaves',[9,73,13],[108,1,3],'accent'),
  box('b178-grand-light-edge',[9,72,16],[108,2,1],'glow')
 ];
 for(const p of PORTALS){
  e.push(
   box('b178-'+p.id+'-roof-arrival',[p.left,74,14],[p.w,1,8],'concrete'),
   box('b178-'+p.id+'-inner-overlook',[p.left+3,70,19],[p.w-6,1,8],'wood'),
   box('b178-'+p.id+'-portal-glow',[p.left,73,21],[p.w,1,2],'glow'),
   box('b178-'+p.id+'-luminous-hall-edge',[p.left+2,68,18],[p.w-4,1,3],'accent'),
   tor('b178-'+p.id+'-orbital-reveal',[p.x,64,22],7,1,'glow'),
   beam('b178-'+p.id+'-left-megachord',[p.left,52,24],[p.x-3,70,26],'metal',1),
   beam('b178-'+p.id+'-right-megachord',[p.left+p.w-1,52,24],[p.x+3,70,26],'accent',1)
  );
  for(let n=0;n<5;n++){
   const x=p.left+2+n*5;
   e.push(
    beam('b178-'+p.id+'-lower-pier-'+n,[x,34,23],[x,57,24],n%2?'metal':'accent',1),
    beam('b178-'+p.id+'-upper-pier-'+n,[x,53,25],[x,69,27],n%2?'glow':'metal',1)
   );
  }
 }
 // Four real bridge-floor tiers between the three historic hollow halls.
 for(const [i,y] of GALLERY_TIERS.entries()){
  e.push(
   box('b178-west-gallery-link-'+i,[35,y,28],[17,1,4],i%2?'glass':'concrete'),
   box('b178-east-gallery-link-'+i,[74,y,28],[18,1,4],i%2?'glass':'concrete')
  );
 }
 e.push(
  box('b178-central-observation-gallery',[49,67,19],[27,1,8],'wood'),
  box('b178-central-floating-mezzanine',[53,71,19],[20,1,8],'glass'),
  box('b178-northern-sky-mezzanine',[17,67,19],[16,1,8],'wood'),
  box('b178-southern-sky-mezzanine',[92,67,19],[16,1,8],'wood'),
  beam('b178-west-exterior-hanging-rib',[36,57,19],[54,70,21],'metal',2),
  beam('b178-east-exterior-hanging-rib',[89,57,19],[74,70,21],'metal',2)
 );
 ok(e.length>=65&&e.length<=160,'MODULE_ELEMENT_COUNT');
 ok(new Set(e.map(x=>x.id)).size===e.length,'DUPLICATE_ID');
 return e;
}
export function createConnectedSkyModule(){
 const d={schema:DSL,id:'nebula-ark-connected-sky-module',
 title:'NEBULA ARK — CONNECTED SKY CONCOURSE',
 brief:'三大巨大アトリウムを実三次元の天空回廊と四層の連絡橋でつなぎ、大規模展望広場と構造フレームを追加。実機歩行と施工は未認証。',
 bounds:{width:124,height:78,depth:50},elements:connectedSkyElements(),designOnly:true};
 validateDesign(d);return d;
}
const occupied=s=>new Set(s.primitives.map(p=>k(p[0],p[1],p[2])));
const square=(x,z)=>[[x,z],[x+1,z],[x,z+1],[x+1,z+1]];
export function inspectPublicConcourse(scene){
 const c=occupied(scene);
 const walk=(x,y,z)=>square(x,z).every(([a,b])=>
  c.has(k(a,y-1,b))&&!c.has(k(a,y,b))&&!c.has(k(a,y+1,b)));
 const original=[
  {a:10,b:112,y:14,z:7},{a:12,b:110,y:26,z:20},
  {a:12,b:112,y:60,z:3},{a:12,b:118,y:57,z:45},
  {a:12,b:112,y:75,z:2}
 ];
 for(const r of original)for(let x=r.a;x<=r.b;x++)
  ok(walk(x,r.y,r.z),'HISTORIC_ROUTE_'+r.y+'_'+r.z+'_'+x);
 const nodes=new Set();
 for(let x=9;x<=115;x++)for(let z=1;z<=22;z++)
  if(walk(x,75,z))nodes.add(x+','+z);
 const begin='12,2',seen=new Set([begin]),q=[begin];
 ok(nodes.has(begin),'START_NOT_WALKABLE');
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i].split(',').map(Number);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const w=(x+dx)+','+(z+dz);
   if(nodes.has(w)&&!seen.has(w)){seen.add(w);q.push(w)}
  }
 }
 for(let x=12;x<=112;x++)ok(walk(x,75,9),'LONG_ROUTE_MISSING_'+x);
 for(const p of PORTALS){
  ok(seen.has(p.x+',18'),'UNREACHABLE_PORTAL_'+p.id);
  for(let z=8;z<=18;z++)ok(walk(p.x,75,z),'PORTAL_BRANCH_'+p.id+'_'+z);
 }
 return {inheritedMoves:[102,98,100,106,100],transverseMoves:100,
  connectedSkyPortals:3,walkable2WideNodes:nodes.size,
  reachable2WideNodes:seen.size,portalIds:PORTALS.map(p=>p.id),
  physicalWalkingCertified:false,stepCollisionCertified:false,
  safetyRailCertified:false};
}
function union(parent,addon,design){
 const cells=new Map(parent.primitives.map(p=>[k(p[0],p[1],p[2]),p]));
 let fresh=0,overlap=0;
 for(const p of addon.primitives){
  const id=k(p[0],p[1],p[2]);
  if(cells.has(id)){overlap++;continue}
  cells.set(id,p);fresh++;
 }
 ok(fresh>=1500,'NO_MEANINGFUL_NEW_ARCHITECTURE');
 ok(cells.size<=MAX_CELLS,'GLOBAL_VOXEL_CAP');
 const primitives=[...cells.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 const layers=Object.fromEntries(MATERIALS.map(m=>[m,0]));
 for(const p of primitives){
  for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
  layers[MATERIALS[p[3]]]++;
 }
 ok(max[0]<124&&max[1]<78&&max[2]<50,'MODEL_BOUNDARY');
 const sourceSha256=sha({schema:SCHEMA,parent:parent.sourceSha256,
  addon:addon.sourceSha256,merge:'parent-precedence'});
 const geometrySha256=sha({sourceSha256,primitives});
 return {compiled:{...parent,
  id:'nebula-ark-connected-sky-concourse',
  title:'NEBULA ARK — CONNECTED SKY CONCOURSE / 天空連絡広場',
  brief:'三大未来公共施設を実ボクセルの大規模天空回廊で接続。',
  primitives,sourceSha256,geometrySha256,
  bounds:{minX:min[0],maxX:max[0],minY:min[1],maxY:max[1],
   minZ:min[2],maxZ:max[2]},
  levels:Math.floor(max[1]/5)+1,
  stats:{...parent.stats,voxels:primitives.length,layerCounts:layers,
   moduleCount:6,designOperations:[
    ...parent.stats.designOperations,
    ...addon.stats.designOperations.map(v=>({...v,module:design.id}))]}},
  fresh,overlap};
}
export function buildConnectedSky(){
 const parent=buildTripleAtrium(),design=createConnectedSkyModule(),
  addon=compileDesign(design);
 ok(verifyCompiled(design,addon),'STRICT_B143_MODULE');
 const merged=union(parent.compiled,addon,design);
 const traffic=inspectPublicConcourse(merged.compiled);
 const inherited=auditTripleAtrium(merged.compiled);
 const transit=analyzeAuroraTransit(merged.compiled);
 const report={schema:SCHEMA,modelId:merged.compiled.id,
  sourceSha256:merged.compiled.sourceSha256,
  geometrySha256:merged.compiled.geometrySha256,
  parentGeometrySha256:parent.compiled.geometrySha256,
  originalVoxels:parent.compiled.primitives.length,
  newlyOccupiedVoxels:merged.fresh,total3dVoxels:merged.compiled.primitives.length,
  parentOverlapPreserved:merged.overlap,
  inheritedElements:parent.report.totalElements,
  newElements:design.elements.length,
  totalElements:parent.report.totalElements+design.elements.length,
  independentModules:6,moduleElementCap:160,voxelCap:MAX_CELLS,
  old2WideMoves:traffic.inheritedMoves,
  newFlat2WideMoves:traffic.transverseMoves,
  reachablePublicPortals:traffic.connectedSkyPortals,
  accessibleGraphNodes:traffic.reachable2WideNodes,
  inheritedAtriumVoids:inherited.atriumHollowMetrics.length===3,
  inheritedStairSeams:transit.newAdjacentMixedHeightSeams,
  sourceGeometryOnly:true,realPlayerMovementCertified:false,
  actualCollisionCertified:false,structuralStabilityCertified:false,
  fallSafetyCertified:false,original36Unmodified:true,
  B172ThroughB177Unmodified:true,worldCoordinates:null,
  worldContacts:0,worldWrites:0,constructionApproved:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
 ok(verifyConnectedSkyReport(report),'UNSAFE_REPORT');
 return {parent,design,addon,compiled:merged.compiled,traffic,report};
}
export function verifyConnectedSkyReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.modelId==='nebula-ark-connected-sky-concourse'&&
  r.independentModules===6&&r.moduleElementCap===160&&r.voxelCap===MAX_CELLS&&
  r.originalVoxels===83531&&r.newlyOccupiedVoxels>=1500&&
  r.total3dVoxels===r.originalVoxels+r.newlyOccupiedVoxels&&
  r.inheritedElements===451&&r.newElements>=65&&r.newElements<=160&&
  r.totalElements===r.inheritedElements+r.newElements&&
  r.sourceSha256?.length===64&&r.geometrySha256?.length===64&&
  r.geometrySha256!==r.parentGeometrySha256&&
  JSON.stringify(r.old2WideMoves)==='[102,98,100,106,100]'&&
  r.newFlat2WideMoves===100&&r.reachablePublicPortals===3&&
  r.accessibleGraphNodes>=150&&r.inheritedAtriumVoids===true&&
  r.inheritedStairSeams===17&&r.sourceGeometryOnly===true&&
  r.realPlayerMovementCertified===false&&r.actualCollisionCertified===false&&
  r.structuralStabilityCertified===false&&r.fallSafetyCertified===false&&
  r.original36Unmodified===true&&r.B172ThroughB177Unmodified===true&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
