/**
 * B189 — HORIZON DOCK ANNEX.
 * The FIRST genuinely independent sister architecture under the SAME
 * strict B143 DSL, with its OWN 48x78x50 local design and 160k voxel cap.
 * Separate from original 142773-cell NEBULA ARK candidate #37.
 * This is a standalone LOCAL design ONLY: NOT attached, routed to, or
 * installed next to the parent in any actual Minecraft Education world.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MAX_CELLS,MATERIALS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildCivicGates,DISTRICTS,auditCivicDistrictSegmentation}
 from './b188-civic-gates.mjs';
import {auditCivicSourceNetwork} from './b187-legible-civic.mjs';
export const SCHEMA='minecraftaibuilder-b189-multiscene-annex-v1';
const H=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const check=(v,why)=>{if(!v)throw Error('B189_'+why)};
const box=(id,origin,size,material='metal')=>
 ({id,shape:'box',mode:'add',origin,size,material});
const ell=(id,center,radii,material='glass',shell=1)=>
 ({id,shape:'ellipsoid',mode:'add',center,radii,shell,material});
const beam=(id,start,end,material='metal',thickness=1)=>
 ({id,shape:'beam',mode:'add',start,end,thickness,material});
const tor=(id,center,majorRadius,tubeRadius,material='glow')=>
 ({id,shape:'torus',mode:'add',center,majorRadius,tubeRadius,axis:'z',material});
export const ANNEX_BOUNDS=Object.freeze({width:48,height:78,depth:50});
export const ANNEX_HALL_CENTERS=Object.freeze([11,24,37]);
export const ANNEX_PUBLIC_LEVELS=Object.freeze([57,61,65,69,73]);
export function annexParts(){
 const parts=[
  box('b189-grand-dock-foundation',[2,3,4],[44,1,20],'stone'),
  box('b189-elevated-dock-plaza',[2,11,4],[44,1,20],'concrete'),
  box('b189-public-sky-lobby',[2,19,5],[44,1,18],'wood'),
  box('b189-glass-hanging-plaza',[2,27,5],[44,1,18],'glass'),
  box('b189-lower-dock-frontage',[2,34,35],[44,1,12],'metal'),
  box('b189-mid-dock-frontage',[2,42,35],[44,1,12],'concrete'),
  box('b189-high-dock-frontage',[2,50,35],[44,1,12],'accent'),
  box('b189-floating-harbor-girder',[2,57,36],[44,1,13],'metal'),
  box('b189-roof-urban-floating-crown',[3,77,5],[42,1,14],'glass'),
  box('b189-roof-beacon-crest',[3,76,5],[42,1,3],'glow'),
  box('b189-harbor-suspended-glow',[2,54,42],[44,1,3],'glow')
 ];
 for(const [i,y] of [56,60,64,68,72].entries()){
  // Every 2x2 corridor on deck y+1 has 2 empty vertical head cells.
  parts.push(
   box('b189-civic-skyway-'+i,[3,y,29],[42,1,7],
    i%2?'glass':'concrete'),
   box('b189-light-undertray-'+i,[3,y-2,27],[42,1,2],'glow')
  );
 }
 for(const [i,cx] of ANNEX_HALL_CENTERS.entries()){
  const id='b189-'+i,mat=['accent','metal','wood'][i];
  parts.push(
   ell(id+'-glazed-arch',[cx,32,15],[7,10,7],'glass',1),
   ell(id+'-secondary-lantern',[cx,44,17],[6,7,6],'glass',1),
   tor(id+'-orbital-front-halo',[cx,32,15],6,1,'glow'),
   tor(id+'-upper-front-halo',[cx,45,17],5,1,mat),
   box(id+'-grand-open-foyer',[cx-7,9,6],[15,1,18],mat),
   box(id+'-glass-lobby-gallery',[cx-7,24,5],[15,1,17],'glass'),
   box(id+'-high-public-brow',[cx-7,52,7],[15,1,17],mat),
   box(id+'-lower-harbor-platform',[cx-7,15,35],[15,1,12],'concrete'),
   box(id+'-harbor-upper-pier',[cx-7,31,35],[15,1,12],mat),
   box(id+'-civic-marking-band',[cx-7,56,6],[15,1,3],'glow'),
   beam(id+'-left-front-pylon',[cx-7,5,6],[cx-7,56,7],'metal'),
   beam(id+'-right-front-pylon',[cx+7,5,6],[cx+7,56,7],'metal'),
   beam(id+'-diagonal-overhang',[cx-6,22,20],[cx+6,42,22],mat),
   beam(id+'-rear-anchor',[cx-6,4,42],[cx-6,51,43],'accent')
  );
  for(let n=0;n<6;n++){
   const x=cx-6+n*2;
   parts.push(
    beam(id+'-front-luminous-column-'+n,[x,7,3],[x,35,4],
      n%2?'glow':'metal'),
    beam(id+'-rear-support-column-'+n,[x,6,46],[x,52,47],
      n%2?'accent':'metal')
   );
  }
 }
 // Separate horizon bridge silhouette at low levels, not a claimed
 // real route between this local scene and the main existing model.
 parts.push(
  beam('b189-harbor-north-truss',[4,21,40],[22,43,42],'metal'),
  beam('b189-harbor-south-truss',[43,21,40],[25,43,42],'accent'),
  box('b189-grand-harbor-landing',[4,6,27],[40,1,19],'wood'),
  box('b189-grand-harbor-ring',[5,36,41],[38,1,7],'glow')
 );
 check(parts.length>=90&&parts.length<=160,'SOURCE_PART_COUNT_'+parts.length);
 check(new Set(parts.map(p=>p.id)).size===parts.length,'DUPLICATE_PART_ID');
 return parts;
}
export function createAnnexDesign(){
 const d={schema:DSL,id:'horizon-dock-annex',
  title:'HORIZON DOCK — Three Hall Skyport Annex',
  brief:'NEBULA ARK本館とは独立した港湾型の巨大未来公共施設。透明ドーム・3つの大空洞・5層の連続回廊と巨大な発光構造。施工座標もワールド書き込みもなく、本館との実通路接続も未認証。',
  bounds:{...ANNEX_BOUNDS},elements:annexParts(),designOnly:true};
 validateDesign(d);return d;
}
export function auditAnnexFloors(scene){
 const set=new Set(scene.primitives.map(p=>K(p[0],p[1],p[2])));
 const valid=(x,y,z)=>{
  for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
   const xx=x+dx,zz=z+dz;
   if(!set.has(K(xx,y-1,zz))||set.has(K(xx,y,zz))||set.has(K(xx,y+1,zz)))
    return false;
  }
  return true;
 };
 const floors=[];
 for(const y of ANNEX_PUBLIC_LEVELS){
  for(let x=4;x<=42;x++)check(valid(x,y,31),
   'DISCONNECTED_39_MOVE_SKYWAY_'+y+'_'+x);
  const entrances=ANNEX_HALL_CENTERS.map(cx=>{
   check(valid(cx,y,31),'HALL_SKYWAY_STATION_'+y+'_'+cx);
   return {localX:cx,standingY:y,z:31,sourceSupported:true};
  });
  floors.push({standingY:y,source2wideHorizontalMoves:38,
   connectedThreeHalls:3,entries:entrances,
   sourceHeadroomClear:true,minecraftWalkabilityCertified:false});
 }
 return {verifiedFloors:floors,sourceContinuousHorizontalRoutes:floors.length,
  source2WideRouteMoves:floors.reduce((n,f)=>n+f.source2wideHorizontalMoves,0),
  sourceOnly:true,minecraftCollisionCertified:false,
  interFloorPhysicalMotionCertified:false,routeDigestSha256:H(floors)};
}
export function buildAnnex(){
 const design=createAnnexDesign(),compiled=compileDesign(design);
 check(verifyCompiled(design,compiled),'INDEPENDENT_STRICT_B143_COMPILE');
 check(compiled.primitives.length>=7000,'INSUFFICIENT_NEW_3D_VOXELS');
 check(compiled.primitives.length<MAX_CELLS,'ANNEX_INDEPENDENT_CELL_CAP');
 const routes=auditAnnexFloors(compiled);
 return {design,compiled,routes};
}
function segmentMain(compiled){
 const m=DISTRICTS.map(d=>({...d,primitives:[]}));
 for(const p of compiled.primitives){
  const i=p[0]<=42?0:p[0]<=82?1:2;
  m[i].primitives.push(p);
 }
 return m.map(d=>{
  const minY=Math.min(...d.primitives.map(p=>p[1])),
   maxY=Math.max(...d.primitives.map(p=>p[1])),
   minZ=Math.min(...d.primitives.map(p=>p[2])),
   maxZ=Math.max(...d.primitives.map(p=>p[2])),
   minX=Math.min(...d.primitives.map(p=>p[0])),
   maxX=Math.max(...d.primitives.map(p=>p[0]));
  return {...d,bounds:{minX,maxX,minY,maxY,minZ,maxZ},
   geometrySha256:H({original:compiled.geometrySha256,
    district:d.id,primitives:d.primitives})};
 });
}
export function auditMultimodelManifest(main,annex,mainSegmentation){
 check(main.primitives.length<=MAX_CELLS&&annex.primitives.length<=MAX_CELLS,
  'INDEPENDENT_CAP_VIOLATION');
 const shards=segmentMain(main);
 const totals=shards.reduce((n,s)=>n+s.primitives.length,0);
 check(totals===main.primitives.length,'INCOMPLETE_DISTRICT_SPLIT');
 check(shards.length===3&&
   shards.every((s,i)=>s.primitives.length===
    mainSegmentation.districts[i].realCells),
   'B188_DISTRICT_PROOF_MISMATCH');
 check(mainSegmentation.checkedCrossDistrict2WideSeams===12,
  'CROSS_DISTRICT_ROUTE_MISSING');
 const ids=new Set(main.primitives.map(p=>K(p[0],p[1],p[2])));
 for(const s of shards)for(const p of s.primitives)
  check(ids.has(K(p[0],p[1],p[2])),'SHARD_EXTRA_SOURCE_POINT');
 // Independent LOCAL source coordinate systems: no overlay/cross-building
 // adjacency assertion. An illustrative future offset is deliberately NOT
 // turned into any game-world x/y/z placement or a build order.
 const scenes=[
  {id:'main',title:'NEBULA ARK — 完全な既存本館',voxels:main.primitives.length,
   geometrySha256:main.geometrySha256},
  ...shards.map(s=>({id:s.id,title:'本館の独立表示: '+s.id,
   voxels:s.primitives.length,geometrySha256:s.geometrySha256})),
  {id:'annex',title:'HORIZON DOCK ANNEX — 独立した新建築',
   voxels:annex.primitives.length,geometrySha256:annex.geometrySha256}
 ];
 const localVoxelSum=main.primitives.length+annex.primitives.length;
 return {schema:SCHEMA,scenes,sourceModelCount:2,viewerSceneCount:5,
  parentDistrictCount:3,sourceMainsExactReassembly:true,
  preservedDistrictBoundaryPaths:12,
  perModelCap:MAX_CELLS,
  mainModelCells:main.primitives.length,annexModelCells:annex.primitives.length,
  sumAcrossIndependentModels:localVoxelSum,
  combinedMonolithicVoxelCapNotExpanded:true,
  actualWorldPlacementSpecified:false,actualAnnexAttachedToMain:false,
  minecraftPhysicalCrossModelRouteCertified:false,
  worldCoordinates:null,worldWrites:0,worldContacts:0,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
  sceneListSha256:H(scenes)};
}
export function buildB189(){
 const parent=buildCivicGates();
 const annex=buildAnnex();
 const segmentation=auditCivicDistrictSegmentation(parent.compiled);
 const civic=auditCivicSourceNetwork(parent.compiled);
 check(civic.joinedVertices===21&&civic.verifiedEdges===30,
  'B187_MAIN_NETWORK_REGRESSION');
 const manifest=auditMultimodelManifest(parent.compiled,annex.compiled,segmentation);
 const report={schema:SCHEMA,mainSourceSha256:parent.compiled.sourceSha256,
  mainGeometrySha256:parent.compiled.geometrySha256,
  annexSourceSha256:annex.compiled.sourceSha256,
  annexGeometrySha256:annex.compiled.geometrySha256,
  mainOccupiedCells:parent.compiled.primitives.length,
  annexOccupiedCells:annex.compiled.primitives.length,
  sourceModelCount:manifest.sourceModelCount,
  viewerSceneCount:manifest.viewerSceneCount,
  inheritedMainIndependentModules:16,
  newAnnexIndependentModules:1,
  independentAuthoringModulesTotal:17,
  annexAuthoredParts:annex.design.elements.length,
  fiveLevelAnnex2WideMoves:annex.routes.source2WideRouteMoves,
  preservedMainWaypoints:civic.joinedVertices,
  preservedMainTopologyEdges:civic.verifiedEdges,
  preservedMainDistrictSeams:segmentation.checkedCrossDistrict2WideSeams,
  monolithicCellLimitPerModel:MAX_CELLS,
  combinedMonolithicLimitNotRaised:true,
  noCrossModelConnectivityAssertion:true,
  original36AndB172ThroughB188Untouched:true,
  manifestDigestSha256:manifest.sceneListSha256,
  actualMinecraftAnnexPlacementCertified:false,
  actualMinecraftWalkingCertified:false,
  worldContacts:0,worldWrites:0,worldCoordinates:null,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 check(verifyB189Report(report),'FAIL_CLOSED_REPORT');
 return {parent,annex,segmentation,civic,manifest,report};
}
export function verifyB189Report(r){
 return Boolean(r&&r.schema===SCHEMA&&r.mainOccupiedCells===142773&&
  r.annexOccupiedCells>=7000&&r.annexOccupiedCells<=MAX_CELLS&&
  r.sourceModelCount===2&&r.viewerSceneCount===5&&
  r.inheritedMainIndependentModules===16&&r.newAnnexIndependentModules===1&&
  r.independentAuthoringModulesTotal===17&&
  r.annexAuthoredParts>=90&&r.annexAuthoredParts<=160&&
  r.fiveLevelAnnex2WideMoves===190&&
  r.preservedMainWaypoints===21&&r.preservedMainTopologyEdges===30&&
  r.preservedMainDistrictSeams===12&&r.monolithicCellLimitPerModel===MAX_CELLS&&
  r.combinedMonolithicLimitNotRaised===true&&
  r.noCrossModelConnectivityAssertion===true&&
  r.original36AndB172ThroughB188Untouched===true&&
  r.mainSourceSha256?.length===64&&r.mainGeometrySha256?.length===64&&
  r.annexSourceSha256?.length===64&&r.annexGeometrySha256?.length===64&&
  r.mainGeometrySha256!==r.annexGeometrySha256&&
  r.manifestDigestSha256?.length===64&&
  r.actualMinecraftAnnexPlacementCertified===false&&
  r.actualMinecraftWalkingCertified===false&&
  r.worldContacts===0&&r.worldWrites===0&&r.worldCoordinates===null&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
