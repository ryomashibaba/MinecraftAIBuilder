/**
 * B195 — METROPOLIS TRANSIT EXCHANGE.
 * Fourth INDEPENDENT genuine B143 design-only architectural model. It is
 * a new transit district, not a viewport-only placeholder or extension
 * of the 160k-cell quota for the previous three models.
 * City reviews retain original models and never imply physical placement.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MAX_CELLS,MATERIALS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildB194,verifyB194Proof} from './b194-junction-inspector.mjs';
export const SCHEMA='minecraftaibuilder-b195-metropolis-transit-district-v1';
const H=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const demand=(c,m)=>{if(!c)throw Error('B195_'+m)};
export const BOUNDS=Object.freeze({width:80,height:78,depth:50});
export const REVIEW_OFFSET_X=194;
export const PUBLIC_STANDING_Y=Object.freeze([57,61,65,69,73]);
export const HALL_X=Object.freeze([17,40,63]);
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal')=>
 ({id,mode:'add',shape:'beam',start,end,thickness:1,material});
const ell=(id,center,radii,material='glass')=>
 ({id,mode:'add',shape:'ellipsoid',center,radii,shell:1,material});
const tor=(id,center,majorRadius,tubeRadius,axis='z',material='glow')=>
 ({id,mode:'add',shape:'torus',center,majorRadius,tubeRadius,axis,material});
/**
 * Three monumental train concourses; three-tier deep suspended gates,
 * soaring glazed indoor arrival halls, illuminated civic transverse ribs,
 * multiple broad promenades and five actual full-length 2wide skywalks.
 */
export function transitDesignParts(){
 const elements=[
  box('b195-foundation-north-quay',[2,3,2],[76,1,21],'stone'),
  box('b195-foundation-south-quay',[2,3,30],[76,1,18],'stone'),
  box('b195-main-civic-plaza',[2,10,4],[76,1,40],'concrete'),
  box('b195-first-gateway-floor',[2,20,4],[76,1,39],'wood'),
  box('b195-multilevel-civic-lobby',[2,30,4],[76,1,38],'glass'),
  box('b195-mid-transit-exchange',[2,40,3],[76,1,39],'concrete'),
  box('b195-skyrail-departures',[2,50,4],[76,1,38],'metal'),
  box('b195-outer-harbor-spur',[2,16,42],[76,1,6],'accent'),
  box('b195-mid-air-cross-quay',[2,35,43],[76,1,5],'concrete'),
  box('b195-roof-celestial-canopy',[3,77,6],[74,1,39],'glass'),
  box('b195-north-roof-glow',[3,76,3],[74,1,2],'glow'),
  box('b195-south-roof-glow',[3,76,46],[74,1,2],'glow'),
  box('b195-tall-harbor-exterior-wall',[2,44,45],[76,1,3],'accent'),
  box('b195-suspended-underbody-north',[3,7,5],[74,1,4],'metal'),
  box('b195-suspended-underbody-south',[3,7,39],[74,1,5],'metal'),
  box('b195-entrance-fascia',[3,53,4],[74,1,5],'glow'),
  box('b195-east-air-harbor-ribbon',[4,25,46],[72,1,2],'glow'),
  box('b195-west-civic-fascia',[4,46,2],[72,1,2],'accent')
 ];
 // Protected public skyway stations at five different real floor levels.
 // All added tall objects are outside z=29..36 and headroom Y57..74.
 for(const [i,floorY] of [56,60,64,68,72].entries()){
  elements.push(
   box('b195-public-2wide-skyway-'+i,[3,floorY,28],[74,1,9],
    i%2?'glass':'concrete'),
   box('b195-under-skyway-guide-'+i,[3,floorY-2,25],[74,1,2],
    i%2?'accent':'glow'),
   box('b195-external-rail-light-'+i,[3,floorY-3,42],[74,1,2],
    i%2?'glow':'metal')
  );
 }
 for(const [i,cx] of HALL_X.entries()){
  const id='b195-hall-'+i,material=['accent','metal','wood'][i];
  elements.push(
   ell(id+'-central-sky-dome',[cx,30,14],[10,15,9],'glass'),
   ell(id+'-upper-atrium-dome',[cx,46,13],[9,8,8],'glass'),
   tor(id+'-orbital-civic-marker',[cx,30,13],8,1,'z','glow'),
   tor(id+'-high-orbital-crown',[cx,46,12],6,1,'z',material),
   box(id+'-main-entry-brow',[cx-9,14,4],[19,1,18],material),
   box(id+'-transit-hall-upper',[cx-9,36,4],[19,1,17],'glass'),
   box(id+'-civic-side-wing',[cx-9,45,39],[19,1,7],material),
   box(id+'-roof-bracket',[cx-9,74,8],[19,1,8],'accent'),
   beam(id+'-left-great-column',[cx-9,4,4],[cx-9,68,5],'metal'),
   beam(id+'-right-great-column',[cx+9,4,4],[cx+9,68,5],'metal'),
   beam(id+'-front-angled-spar',[cx-7,12,6],[cx+7,48,6],material),
   beam(id+'-rear-angled-spar',[cx-7,11,43],[cx+7,50,43],'accent')
  );
  for(let n=0;n<5;n++){
   const x=cx-8+n*4;
   elements.push(
    beam(id+'-front-light-tower-'+n,[x,5,2],[x,53,3],
     n%2?'glow':'metal'),
    beam(id+'-rear-lattice-'+n,[x,6,47],[x,55,48],
     n%2?'accent':'metal')
   );
  }
 }
 // Distinct vast floating roof structure and four high urban towers.
 for(let i=0;i<6;i++){
  const x=8+i*12;
  elements.push(
   beam('b195-spine-roof-rib-'+i,[x,59,6],[x,76,11],'accent'),
   beam('b195-cantilever-tail-'+i,[x,45,44],[x,75,44],'metal')
  );
 }
 demand(elements.length>=110&&elements.length<=160,
  'ARCHITECTURAL_PARTS_OUT_OF_BOUNDS_'+elements.length);
 demand(new Set(elements.map(e=>e.id)).size===elements.length,'DUPLICATE_DSL_PART_IDS');
 return elements;
}
export function createTransitDesign(){
 const d={schema:DSL,id:'metropolis-transit-exchange',
  title:'METROPOLIS TRANSIT EXCHANGE — Giant Civic Skyrail Terminal',
  brief:'巨大な3つのガラス張りターミナルホール、巨大連続屋根、空中公共広場、5層の乗換回廊と列柱群を持つ完全オリジナルの大型交通拠点。既存3棟とは独立した設計で、実ワールドへの配置と物理的接続は未認証。',
  bounds:{...BOUNDS},elements:transitDesignParts(),designOnly:true};
 validateDesign(d);
 return d;
}
export function verifyFiveSkyways(compiled){
 const occupied=new Set(compiled.primitives.map(p=>K(p[0],p[1],p[2])));
 const floors=[];
 for(const y of PUBLIC_STANDING_Y){
  let stations=0;
  for(let x=4;x<=75;x++){
   for(let dx=0;dx<2;dx++)for(let dz=0;dz<2;dz++){
    const a=x+dx,z=31+dz;
    demand(occupied.has(K(a,y-1,z)),'MISSING_PUBLIC_FOOT_'+y+'_'+a+'_'+z);
    demand(!occupied.has(K(a,y,z))&&!occupied.has(K(a,y+1,z)),
     'BLOCKED_REAL_SOURCE_SKYWAY_'+y+'_'+a+'_'+z);
   }
   stations++;
  }
  for(const cx of HALL_X)demand(occupied.has(K(cx,y-1,31)) &&
    !occupied.has(K(cx,y,31)) && !occupied.has(K(cx,y+1,31)),
    'HALL_STATION_DISCONNECTED_'+y+'_'+cx);
  floors.push({standingY:y,sourceTwoWideStandingSquares:stations,
   continuousHorizontalMoves:stations-1,
   joinedHallX:[...HALL_X],footFourSupported:true,
   bodyAndHeadBothEmpty:true});
 }
 return {levels:floors,source2WideMoveEdges:floors.reduce((n,f)=>n+f.continuousHorizontalMoves,0),
  fiveDistinctElevations:true,actualMinecraftPlayerRouteCertified:false,
  sha256:H(floors)};
}
export function buildB195(){
 const historical=buildB194();
 demand(verifyB194Proof(historical.junctions),'HISTORICAL_B194_GATE');
 const design=createTransitDesign(),compiled=compileDesign(design);
 demand(verifyCompiled(design,compiled),'STRICT_NEW_B143_DESIGN_COMPILATION');
 demand(compiled.primitives.length>=12000&&compiled.primitives.length<MAX_CELLS,
  'REAL_NEW_LARGE_TERMINAL_NOT_COMPILED_'+compiled.primitives.length);
 const walkways=verifyFiveSkyways(compiled);
 const old=h=>h.readOnlyScene.primitives;
 const previous=historical.readOnlyScene.primitives;
 demand(previous.length===162816,'HISTORICAL_CITYSCAPE_GEOMETRY_CHANGED');
 const cells=new Set(previous.map(p=>K(p[0],p[1],p[2])));
 const offsetPrimitives=compiled.primitives.map(p=>[p[0]+REVIEW_OFFSET_X,p[1],p[2],p[3]]);
 let collisions=0;
 for(const p of offsetPrimitives){
  const k=K(p[0],p[1],p[2]);
  if(cells.has(k))collisions++;
  else cells.add(k);
 }
 demand(collisions===0,'NEW_TERMINAL_HITS_EXISTING_CITY_'+collisions);
 demand(cells.size===previous.length+compiled.primitives.length,'FOUR_MODEL_ASSEMBLY_NOT_EXACT');
 const newBuildings=[...historical.models,{
   id:'metropolis-transit-exchange',offset:{x:REVIEW_OFFSET_X,y:0,z:0},
   sourceVoxelCount:compiled.primitives.length,
   originalGeometrySha256:compiled.geometrySha256,
   primitives:offsetPrimitives
 }];
 demand(newBuildings.every(m=>m.sourceVoxelCount<=MAX_CELLS),'INDEPENDENT_SOURCE_LIMIT_VIOLATION');
 const layerCounts=Object.fromEntries(MATERIALS.map(name=>[name,0]));
 for(const p of [...previous,...offsetPrimitives])layerCounts[MATERIALS[p[3]]]++;
 const entire=[...previous,...offsetPrimitives],xs=entire.map(p=>p[0]);
 // Avoid Math.max(...160k) argument-limit failure.
 const bounds={...historical.readOnlyScene.bounds};
 for(const [x,y,z] of offsetPrimitives){
  bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);
  bounds.minY=Math.min(bounds.minY,y);bounds.maxY=Math.max(bounds.maxY,y);
  bounds.minZ=Math.min(bounds.minZ,z);bounds.maxZ=Math.max(bounds.maxZ,z);
 }
 const visual={
  ...historical.readOnlyScene,
  id:'b195-source-only-four-model-cityscape',
  title:'B195 四棟都市全景 / METROPOLIS TRANSIT EXCHANGE',
  brief:'元の3棟＋独立した大型交通拠点を4つの別個の設計モデルとしてオフライン表示。単一B143モデルではなく施工命令も持ちません。施設間の接続は未認証。',
  sourceSha256:H(newBuildings.map(m=>m.originalGeometrySha256)),
  geometrySha256:H({review:'B195-VIRTUAL-NON-B143',parents:historical.report.cityscapeReviewSha256,
    newModel:compiled.geometrySha256,offsetX:REVIEW_OFFSET_X}),
  bounds,primitives:entire,virtualReviewOnly:true,
  notAnIndependentB143CompiledModel:true,
  stats:{...historical.readOnlyScene.stats,voxels:entire.length,
   layerCounts,modelCount:4,virtualReviewOnly:true},
  BuildPlan:{operations:[]},worldCoordinates:null,
  worldContacts:0,worldWrites:0,constructionApproved:false,
  readiness:'NOT_PREPARED'
 };
 const report={schema:SCHEMA,
  previousThreeModelGeometrySha256:historical.report.cityscapeReviewSha256,
  previous18AuthoredDesignModulesUnchanged:true,
  independentStrictB143ModelCount:4,
  originalModelCells:[142773,19152,891],
  newTerminalOccupiedCells:compiled.primitives.length,
  newTransitSourceElements:design.elements.length,
  newTerminalSourceSha256:compiled.sourceSha256,
  newTerminalGeometrySha256:compiled.geometrySha256,
  authoredB143Modules:19,
  totalIndependentModelCells:entire.length,
  sourceReviewOnly:true,originalSingleB143Cap:MAX_CELLS,
  noCombinedB143Compilation:true,
  sourceReviewOffsets:[0,132,100,REVIEW_OFFSET_X],
  newTerminalWorldlessXOffset:REVIEW_OFFSET_X,
  originalThreeModelsOverwritten:false,
  originalModelOverlapCells:0,
  originalThreeSourceWalkStations:historical.junctions.sourceRouteStations,
  newTransitPublicFloors:walkways.levels.length,
  newTransitPublic2WideMoves:walkways.source2WideMoveEdges,
  originalSevenViewerScenesPreserved:true,
  newIndependentAndCombinedViewerScenes:2,
  totalViewerScenes:9,
  virtualBounds:bounds,
  viewOnlyCityscapeSha256:visual.geometrySha256,
  actualMinecraftBuildingPlacementCertified:false,
  actualPhysicalLinkToExistingCityCertified:false,
  actualMinecraftWalkingCertified:false,
  actualTerrainAndFallProtectionCertified:false,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),worldCoordinates:null,
  worldContacts:0,worldWrites:0,BuildPlan:{operations:[]}};
 demand(verifyB195Report(report),'GUARDED_ARCHITECTURE_REPORT_FAILED');
 return {historical,design,compiled,walkways,modelViews:newBuildings,
  readOnlyScene:visual,report};
}
export function verifyB195Report(r){
 return Boolean(r&&r.schema===SCHEMA&&
  r.previousThreeModelGeometrySha256?.length===64&&
  r.previous18AuthoredDesignModulesUnchanged===true&&
  r.independentStrictB143ModelCount===4&&
  r.originalModelCells?.join(',')==='142773,19152,891'&&
  r.newTerminalOccupiedCells>=12000&&r.newTerminalOccupiedCells<MAX_CELLS&&
  r.newTransitSourceElements>=110&&r.newTransitSourceElements<=160&&
  r.newTerminalSourceSha256?.length===64&&
  r.newTerminalGeometrySha256?.length===64&&
  r.authoredB143Modules===19&&
  r.totalIndependentModelCells===162816+r.newTerminalOccupiedCells&&
  r.sourceReviewOnly===true&&r.originalSingleB143Cap===MAX_CELLS&&
  r.noCombinedB143Compilation===true&&
  r.sourceReviewOffsets?.join(',')==='0,132,100,194'&&
  r.newTerminalWorldlessXOffset===REVIEW_OFFSET_X&&
  r.originalThreeModelsOverwritten===false&&
  r.originalModelOverlapCells===0&&
  r.originalThreeSourceWalkStations===31&&
  r.newTransitPublicFloors===5&&r.newTransitPublic2WideMoves===355&&
  r.originalSevenViewerScenesPreserved===true&&
  r.newIndependentAndCombinedViewerScenes===2&&r.totalViewerScenes===9&&
  r.virtualBounds?.minX>=0&&r.virtualBounds?.maxX>=268&&
  r.viewOnlyCityscapeSha256?.length===64&&
  r.actualMinecraftBuildingPlacementCertified===false&&
  r.actualPhysicalLinkToExistingCityCertified===false&&
  r.actualMinecraftWalkingCertified===false&&
  r.actualTerrainAndFallProtectionCertified===false&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
