/**
 * B179 NEBULA ARK — QUAD TIER SKYBRIDGES.
 * Seventh independently strict-B143 offline architecture module.
 * Four actual multi-metre atrium-to-atrium bridge corridors are audited
 * at 2x2 support/headroom, excluding source-only stepped traversability.
 * Never authorizes Minecraft world contact, deletes or construction.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MATERIALS,MAX_CELLS,validateDesign,compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {buildConnectedSky,inspectPublicConcourse} from './b178-connected-sky.mjs';
import {analyzeAuroraTransit} from './b176-aurora-cathedral.mjs';
export const SCHEMA='minecraftaibuilder-b179-quad-tier-skybridges-v1';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const k=(x,y,z)=>x+','+y+','+z;
const fail=(v,r)=>{if(!v)throw Error('B179_'+r)};
const box=(id,origin,size,material='metal')=>({id,shape:'box',mode:'add',origin,size,material});
const beam=(id,start,end,material='metal',thickness=1)=>({id,shape:'beam',mode:'add',start,end,thickness,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>({id,shape:'torus',mode:'add',center,axis:'z',majorRadius,tubeRadius,material});
const ell=(id,center,radii,material='glass',shell=1)=>({id,shape:'ellipsoid',mode:'add',center,radii,shell,material});
export const TIERS=Object.freeze([60,64,68,72]);
export const CROSSINGS=Object.freeze([{id:'west',x:35,span:17},{id:'east',x:74,span:18}].map(Object.freeze));
export function quadTierParts(){
 const e=[];
 for(const [i,y] of TIERS.entries()){
  // True 7-block-deep physical bridge decks at four heights. The bridge
  // footpaths use the inherited source-occupied subset Z29..30.
  for(const v of CROSSINGS){
   const name='b179-'+v.id+'-level-'+i;
   e.push(
    box(name+'-grand-floor',[v.x,y,27],[v.span,1,7],
      i%2?'glass':'concrete'),
    box(name+'-front-outline',[v.x,y,25],[v.span,1,2],'glow'),
    box(name+'-rear-buttress',[v.x,y-2,34],[v.span,1,2],'accent')
   );
  }
  // Monumental public-floor balconies through the hall edges; no filled
  // centre slabs, so the existing three huge interior voids remain legible.
  for(const v of [
   {id:'north',x:14,w:18},{id:'core',x:53,w:20},{id:'south',x:93,w:18}
  ])e.push(
   box('b179-'+v.id+'-side-balcony-'+i,[v.x,y,25],[v.w,1,5],
     i%2?'wood':'metal'),
   box('b179-'+v.id+'-light-face-'+i,[v.x,y-2,24],[v.w,1,2],
     'glow')
  );
 }
 // Intrinsically architectural support rhythm, industrial sky-harbour scale.
 for(const v of CROSSINGS){
  for(let n=0;n<4;n++){
   const x=v.x+2+n*4;
   e.push(
    beam('b179-'+v.id+'-suspended-aerial-leg-'+n,[x,31,29],
      [x+1,56,31],n%2?'accent':'metal'),
    beam('b179-'+v.id+'-outer-diagonal-'+n,[x,35,35],
      [x+2,56,36],n%2?'glow':'metal')
   );
  }
 }
 // Skybridge sculptural upper halo-like hubs, built as actual shell cells,
 // positioned away from protected existing 2x2 walking corridors.
 e.push(
  ell('b179-grand-west-hall-canopy',[43,53,31],[10,6,8],'glass',1),
  ell('b179-grand-east-hall-canopy',[82,53,31],[10,6,8],'glass',1),
  tor('b179-west-magnificent-ring',[43,53,32],7,1,'glow'),
  tor('b179-east-magnificent-ring',[82,53,32],7,1,'glow'),
  beam('b179-front-portal-ribbon',[36,43,23],[53,64,25],'accent',2),
  beam('b179-rear-portal-ribbon',[90,43,23],[73,64,25],'accent',2)
 );
 fail(e.length>=65&&e.length<=160,'MODULE_ELEMENTS');
 fail(new Set(e.map(a=>a.id)).size===e.length,'DUPLICATE_ID');
 return e;
}
export function createQuadTierModule(){
 const design={schema:DSL,id:'nebula-ark-quad-tier-bridge-module',
  title:'NEBULA ARK — QUAD TIER SKYBRIDGE NETWORK',
  brief:'三大アトリウムの間に4層×左右2本の広い空中連絡橋、堂々たる柱列、層ごとの展望バルコニー、巨大ガラスキャノピーを実三次元モデルとして増設。実機施工は未認証。',
  bounds:{width:124,height:78,depth:50},elements:quadTierParts(),
  designOnly:true};
 validateDesign(design);return design;
}
function vox(scene){return new Set(scene.primitives.map(p=>k(p[0],p[1],p[2])))}
export function inspectQuadTierAccess(scene){
 const occupied=vox(scene),proof=[];
 for(const [i,y] of TIERS.entries())for(const c of CROSSINGS){
  const errors=[];
  // One source-true 2x2 footprint per increment of X. The end areas must
  // be supported too, rather than assuming a visually contiguous bridge.
  for(let x=c.x;x<c.x+c.span-1;x++)for(let dz=0;dz<2;dz++){
   if(!occupied.has(k(x, y,29+dz)))errors.push('floor:'+k(x,y,29+dz));
   for(let dy=1;dy<=2;dy++)if(occupied.has(k(x,y+dy,29+dz)))
    errors.push('body:'+k(x,y+dy,29+dz));
  }
  const unique=[...new Set(errors)];
  proof.push({level:i,deckY:y,standingY:y+1,bridge:c.id,
   x0:c.x,xLast:c.x+c.span-2,z:29,
   spanMoves:c.span-2,
   supported2x2:unique.length===0,
   violations:unique.slice(0,32),violationsTotal:unique.length});
 }
 return {count:proof.length,passed:proof.filter(x=>x.supported2x2).length,
  bridges:proof,allClear:proof.every(x=>x.supported2x2),
  isTrueMinecraftWalkingCertified:false};
}
function combine(old,extra,d){
 const m=new Map(old.primitives.map(p=>[k(p[0],p[1],p[2]),p]));
 let fresh=0,overlap=0;
 for(const p of extra.primitives){
  const id=k(p[0],p[1],p[2]);
  if(m.has(id)){overlap++;continue}
  m.set(id,p);fresh++;
 }
 fail(fresh>=1400,'INSUFFICIENT_ARCHITECTURE_ADDED');
 fail(m.size<=MAX_CELLS,'MAX_CELLS');
 const primitives=[...m.values()].sort((a,b)=>a[1]-b[1]||a[2]-b[2]||a[0]-b[0]);
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
 const counts=Object.fromEntries(MATERIALS.map(x=>[x,0]));
 for(const p of primitives){
  bounds.minX=Math.min(bounds.minX,p[0]);bounds.maxX=Math.max(bounds.maxX,p[0]);
  bounds.minY=Math.min(bounds.minY,p[1]);bounds.maxY=Math.max(bounds.maxY,p[1]);
  bounds.minZ=Math.min(bounds.minZ,p[2]);bounds.maxZ=Math.max(bounds.maxZ,p[2]);
  counts[MATERIALS[p[3]]]++;
 }
 fail(bounds.maxX<124&&bounds.maxY<78&&bounds.maxZ<50,'BOUNDS');
 const sourceSha256=hash({schema:SCHEMA,parent:old.sourceSha256,addon:extra.sourceSha256,policy:'parent-first'});
 const geometrySha256=hash({sourceSha256,primitives});
 return {compiled:{...old,id:'nebula-ark-quad-tier-skybridges',
  title:'NEBULA ARK — QUAD TIER SKYBRIDGES / 四層天空空中橋',
  brief:'巨大空洞を貫く四層・左右の実体積立体渡り廊下と天空キャノピー。',
  primitives,sourceSha256,geometrySha256,bounds,
  levels:Math.floor(bounds.maxY/5)+1,
  stats:{...old.stats,voxels:primitives.length,
   layerCounts:counts,moduleCount:7,designOperations:[
    ...old.stats.designOperations,
    ...extra.stats.designOperations.map(p=>({...p,module:d.id}))]}},
  fresh,overlap};
}
export function buildQuadTier(){
 const parent=buildConnectedSky();
 const design=createQuadTierModule(),addon=compileDesign(design);
 fail(verifyCompiled(design,addon),'B143_MODULE_INTEGRITY');
 const joined=combine(parent.compiled,addon,design);
 const bridges=inspectQuadTierAccess(joined.compiled);
 fail(bridges.allClear,'BRIDGE_CLEARANCE_'+JSON.stringify(bridges.bridges.filter(x=>!x.supported2x2)));
 const oldTraffic=inspectPublicConcourse(joined.compiled);
 const stairs=analyzeAuroraTransit(joined.compiled);
 const r={schema:SCHEMA,id:joined.compiled.id,
  sourceSha256:joined.compiled.sourceSha256,
  geometrySha256:joined.compiled.geometrySha256,
  previousGeometrySha256:parent.compiled.geometrySha256,
  oldVoxels:parent.compiled.primitives.length,
  addedUniqueVoxels:joined.fresh,voxels:joined.compiled.primitives.length,
  preservedOverlaps:joined.overlap,
  baseAuthoredElements:parent.report.totalElements,
  addonAuthoredElements:design.elements.length,
  authoredElements:parent.report.totalElements+design.elements.length,
  moduleCount:7,perModuleElementMax:160,voxelLimit:MAX_CELLS,
  bridgeInterfacesChecked:bridges.count,
  bridgeInterfacesVerified:bridges.passed,
  bridgeGeometryDigest:hash(bridges.bridges.map(p=>({...p,violations:[]}))),
  preexistingRoofPortals:oldTraffic.connectedSkyPortals,
  inheritedStairInterfaces:stairs.newAdjacentMixedHeightSeams,
  original36Unmodified:true,B172ThroughB178Unmodified:true,
  physicalMinecraftWalkingVerified:false,
  actualMinecraftCollisionCertified:false,
  structuralOrFallSafetyCertified:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  constructionApproved:false,worldContacts:0,worldWrites:0,
  worldCoordinates:null,BuildPlan:{operations:[]}};
 fail(verifyQuadTierReport(r),'SAFETY_REPORT');
 return {parent,design,addon,compiled:joined.compiled,bridges,report:r};
}
export function verifyQuadTierReport(r){
 return Boolean(r&&r.schema===SCHEMA&&r.id==='nebula-ark-quad-tier-skybridges'&&
  r.moduleCount===7&&r.perModuleElementMax===160&&r.voxelLimit===MAX_CELLS&&
  r.oldVoxels===87878&&r.addedUniqueVoxels>=1400&&
  r.voxels===r.oldVoxels+r.addedUniqueVoxels&&
  r.baseAuthoredElements===520&&r.addonAuthoredElements>=65&&r.addonAuthoredElements<=160&&
  r.authoredElements===r.baseAuthoredElements+r.addonAuthoredElements&&
  r.bridgeInterfacesChecked===8&&r.bridgeInterfacesVerified===8&&
  r.bridgeGeometryDigest?.length===64&&r.preexistingRoofPortals===3&&
  r.inheritedStairInterfaces===17&&r.sourceSha256?.length===64&&
  r.geometrySha256?.length===64&&r.geometrySha256!==r.previousGeometrySha256&&
  r.original36Unmodified===true&&r.B172ThroughB178Unmodified===true&&
  r.physicalMinecraftWalkingVerified===false&&r.actualMinecraftCollisionCertified===false&&
  r.structuralOrFallSafetyCertified===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  r.constructionApproved===false&&r.worldContacts===0&&r.worldWrites===0&&
  r.worldCoordinates===null&&Array.isArray(r.BuildPlan?.operations)&&
  r.BuildPlan.operations.length===0);
}
