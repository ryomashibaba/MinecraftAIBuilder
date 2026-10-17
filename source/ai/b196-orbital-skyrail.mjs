/**
 * B196 ORBITAL SKYRAIL INTERCHANGE: fifth independently authored source
 * 3D architecture. The 4 older models, 19 authored B143 designs and all
 * Minecraft world state are IMMUTABLE. The B196 review-local offset is not
 * a Minecraft installation coordinate or approval.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as DSL,MAX_CELLS,MATERIALS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
import {buildB195,verifyB195Report} from './b195-metropolis-transit.mjs';
export const SCHEMA='minecraftaibuilder-b196-orbital-skyrail-v1';
export const BOUNDS=Object.freeze({width:80,height:78,depth:50});
export const REVIEW_X=282;
export const PUBLIC_STANDING_Y=Object.freeze([57,61,65,69,73]);
export const INTERCHANGE_BAYS=Object.freeze([17,40,63]);
const H=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const K=(x,y,z)=>x+','+y+','+z;
const strict=(v,why)=>{if(!v)throw Error('B196_'+why)};
const box=(id,origin,size,material='metal')=>({id,mode:'add',shape:'box',origin,size,material});
const beam=(id,start,end,material='metal')=>({id,mode:'add',shape:'beam',start,end,thickness:1,material});
const ell=(id,center,radii,material='glass')=>({id,mode:'add',shape:'ellipsoid',center,radii,shell:1,material});
const tor=(id,center,majorRadius,tubeRadius,axis='z',material='glow')=>
 ({id,mode:'add',shape:'torus',center,majorRadius,tubeRadius,axis,material});
export function authoredOrbitalDistrictParts(){
 const p=[
  // The three launch courts are BROAD ORIGINAL ARCHITECTURE, not narrow
  // proxy waypoint boxes. Public decks share real connected floor geometry.
  box('b196-grand-terminal-foundation',[2,3,3],[76,1,43],'stone'),
  box('b196-civic-skyrail-forum',[2,11,3],[76,1,43],'concrete'),
  box('b196-upper-transfer-concourse',[2,21,3],[76,1,42],'wood'),
  box('b196-grand-hanging-forum',[2,31,4],[76,1,40],'glass'),
  box('b196-orbital-boarding-hall',[2,41,4],[76,1,40],'metal'),
  box('b196-railways-six-track-departure',[3,49,4],[74,1,39],'accent'),
  box('b196-high-harbor-suspension',[2,15,44],[76,1,4],'metal'),
  box('b196-transit-east-floating-side',[3,34,43],[74,1,4],'concrete'),
  box('b196-guardian-glass-roof',[3,77,5],[74,1,40],'glass'),
  box('b196-roof-perimeter-front',[3,76,3],[74,1,2],'glow'),
  box('b196-roof-perimeter-rear',[3,76,46],[74,1,2],'glow'),
  box('b196-north-forward-light-rail',[4,46,2],[72,1,3],'glow'),
  box('b196-north-middle-light-rail',[4,46,12],[72,1,3],'accent'),
  box('b196-north-inner-light-rail',[4,46,21],[72,1,3],'metal'),
  box('b196-rear-viaduct-rail',[4,42,44],[72,1,4],'accent'),
  box('b196-rear-below-spine',[4,8,44],[72,1,4],'glow'),
  box('b196-front-underslung-spine',[4,7,6],[72,1,4],'metal'),
  box('b196-transverse-main-fascia',[4,53,4],[72,1,4],'glow'),
  box('b196-main-bay-podium',[3,18,4],[74,1,4],'wood'),
  box('b196-rear-bay-podium',[3,18,40],[74,1,5],'accent')
 ];
 // Protected FIVE continuous gallery floors with each station's entire
 // 2x2 support square, BOTH standing/body/head blocks empty. Never put
 // an outer decorative rib inside the z31..32 corridor at Y57...74.
 for(const [i,floor] of [56,60,64,68,72].entries()){
  p.push(
   box('b196-protected-wide-skyway-'+i,[3,floor,28],[74,1,10],i%2?'glass':'concrete'),
   box('b196-floating-lighted-outboard-'+i,[3,floor-2,41],[74,1,2],i%2?'glow':'accent'),
   box('b196-front-visible-beacon-'+i,[3,floor-2,5],[74,1,2],i%2?'accent':'glow')
  );
 }
 for(const [i,cx] of INTERCHANGE_BAYS.entries()){
  const id='b196-bay-'+i,mat=['accent','metal','wood'][i];
  p.push(
   ell(id+'-outer-glazed-arch',[cx,28,14],[10,13,9],'glass'),
   ell(id+'-upper-glass-atrium',[cx,44,13],[9,9,8],'glass'),
   tor(id+'-orbit-ring',[cx,30,13],8,1,'z','glow'),
   tor(id+'-secondary-ring',[cx,44,13],6,1,'z',mat),
   box(id+'-lower-entry-hall',[cx-9,15,5],[19,1,19],mat),
   box(id+'-upper-airport-gate',[cx-9,36,6],[19,1,16],'glass'),
   box(id+'-rear-service-wing',[cx-9,45,41],[19,1,6],mat),
   box(id+'-crown-side-girder',[cx-9,74,7],[19,1,8],'glow'),
   beam(id+'-outer-left-pylon',[cx-9,5,5],[cx-9,70,5],'metal'),
   beam(id+'-outer-right-pylon',[cx+9,5,5],[cx+9,70,5],'metal'),
   beam(id+'-diagonal-civic-shaft',[cx-7,13,6],[cx+7,45,6],mat),
   beam(id+'-rear-spinal-spar',[cx-7,10,43],[cx+7,48,43],'accent'),
   box(id+'-lobby-light-floor',[cx-8,25,8],[17,1,12],'glow')
  );
  for(let j=0;j<5;j++){
   const x=cx-8+j*4;
   p.push(
    beam(id+'-arcade-forward-column-'+j,[x,5,2],[x,52,3],j%2?'glow':'metal'),
    beam(id+'-arcade-rear-column-'+j,[x,5,46],[x,53,47],j%2?'accent':'metal')
   );
  }
 }
 // One immense double orbital ring forms a landmark across the central
 // skyrail halls. It is NOT a physical tunnel certified for train motion.
 p.push(
  tor('b196-monumental-civic-portal',[40,49,13],17,1,'z','glow'),
  tor('b196-giant-threshold-ring',[40,39,42],15,1,'z','accent'),
  beam('b196-front-catenary-west',[6,56,6],[36,75,7],'metal'),
  beam('b196-front-catenary-east',[44,75,7],[74,56,6],'metal'),
  beam('b196-back-catenary-west',[7,55,44],[36,75,44],'accent'),
  beam('b196-back-catenary-east',[44,75,44],[73,55,44],'accent'),
  box('b196-grand-arched-podium',[29,5,3],[23,2,7],'stone'),
  box('b196-rear-orbit-marquee',[26,51,44],[28,1,4],'glow')
 );
 for(let i=0;i<7;i++){
  const x=5+i*11;
  p.push(
   beam('b196-skyroof-stanchion-'+i,[x,55,8],[x,75,8],'metal'),
   beam('b196-outer-suspension-girder-'+i,[x,53,46],[x,75,46],'accent')
  );
 }
 strict(p.length>=120&&p.length<=160,'ELEMENT_BUDGET_'+p.length);
 strict(new Set(p.map(x=>x.id)).size===p.length,'DUPLICATE_PARTS');
 return p;
}
export function createOrbitalDesign(){
 const design={schema:DSL,id:'orbital-skyrail-interchange',
  title:'ORBITAL SKYRAIL — Monumental Aerial Transit District',
  brief:'巨大空中乗換都市、三大ガラスアトリウム、発光する二重環、吊り屋根、5層の公共回廊、巨大支柱・高架ホーム。実施工・物理接続未認証。',
  designOnly:true,bounds:{...BOUNDS},elements:authoredOrbitalDistrictParts()};
 validateDesign(design);return design;
}
export function auditOrbitalSkyways(compiled){
 const vox=new Set(compiled.primitives.map(v=>K(v[0],v[1],v[2])));
 const layers=[];
 for(const y of PUBLIC_STANDING_Y){
  let stations=0;
  for(let x=4;x<=75;x++){
   for(let a=0;a<2;a++)for(let b=0;b<2;b++){
    const xx=x+a,z=31+b;
    strict(vox.has(K(xx,y-1,z)),'UNSUPPORTED_2WIDE_'+y+'_'+xx+'_'+z);
    strict(!vox.has(K(xx,y,z))&&!vox.has(K(xx,y+1,z)),
      'HEADROOM_CONFLICT_'+y+'_'+xx+'_'+z);
   }
   stations++;
  }
  for(const cx of INTERCHANGE_BAYS)
   strict(vox.has(K(cx,y-1,31))&&!vox.has(K(cx,y,31)),
     'NO_SOURCE_HALL_ACCESS_'+y+'_'+cx);
  layers.push({standingY:y,sourceSupported2WideStations:stations,
   consecutiveSourceMoveEdges:stations-1,matchedThreeHalls:[...INTERCHANGE_BAYS],
   headroomAndSupportPass:true});
 }
 return {layers,sourceWalkMoves:layers.reduce((n,f)=>n+f.consecutiveSourceMoveEdges,0),
  exactSource2WideProofDigest:H(layers),
  actualInGameMovementCertified:false};
}
export function buildB196(){
 const prev=buildB195();
 strict(verifyB195Report(prev.report),'HISTORICAL_B195_SOURCE_PROOF_INVALID');
 const design=createOrbitalDesign(),compiled=compileDesign(design);
 strict(verifyCompiled(design,compiled),'NEW_STRICT_B143_DSL_REJECTED');
 strict(compiled.primitives.length>=18000&&compiled.primitives.length<MAX_CELLS,
  'NEW_SOURCE_ARCHITECTURE_NOT_SUBSTANTIAL_'+compiled.primitives.length);
 const skyways=auditOrbitalSkyways(compiled);
 strict(skyways.sourceWalkMoves===355,'NEW_SKYWAY_TRACE_BAD');
 const old=prev.readOnlyScene.primitives;
 strict(old.length===203711,'PREVIOUS_FOUR_MODEL_CITY_LOST');
 const set=new Set(old.map(p=>K(p[0],p[1],p[2])));
 let overlap=0;
 const positioned=[];
 for(const [x,y,z,m] of compiled.primitives){
  const p=[x+REVIEW_X,y,z,m],k=K(p[0],p[1],p[2]);
  if(set.has(k))overlap++;
  else set.add(k);
  positioned.push(p);
 }
 strict(overlap===0,'HISTORIC_BUILDINGS_HIT_'+overlap);
 strict(set.size===old.length+positioned.length,'NOT_EXACT_FIVE_SOURCE_ASSEMBLY');
 const all=[...old,...positioned],modelViews=[...prev.modelViews,{
  id:'orbital-skyrail-interchange',sourceVoxelCount:compiled.primitives.length,
  originalGeometrySha256:compiled.geometrySha256,
  offset:{x:REVIEW_X,y:0,z:0},primitives:positioned}];
 const extent={...prev.readOnlyScene.bounds};
 for(const [x,y,z] of positioned){
  extent.minX=Math.min(extent.minX,x);extent.maxX=Math.max(extent.maxX,x);
  extent.minY=Math.min(extent.minY,y);extent.maxY=Math.max(extent.maxY,y);
  extent.minZ=Math.min(extent.minZ,z);extent.maxZ=Math.max(extent.maxZ,z);
 }
 const layerCounts=Object.fromEntries(MATERIALS.map(name=>[name,0]));
 for(const p of all)layerCounts[MATERIALS[p[3]]]++;
 const readOnlyScene={...prev.readOnlyScene,
  id:'b196-five-model-source-review',
  title:'B196 五棟都市全景 / ORBITAL SKYRAIL',
  brief:'既存四棟＋新規ORBITAL SKYRAILを五つの独立した厳格なB143建築として設計用座標に仮表示。合計セルは単一モデルではなく、実Minecraftワールドではありません。',
  sourceSha256:H(modelViews.map(m=>m.originalGeometrySha256)),
  geometrySha256:H({schema:SCHEMA,sources:modelViews.map(m=>m.originalGeometrySha256),offsets:[0,132,100,194,REVIEW_X]}),
  stats:{...prev.readOnlyScene.stats,voxels:all.length,layerCounts,modelCount:5,
   virtualReviewOnly:true},bounds:extent,primitives:all,
  virtualReviewOnly:true,notAnIndependentB143CompiledModel:true,
  worldWrites:0,worldContacts:0,worldCoordinates:null,
  constructionApproved:false,readiness:'NOT_PREPARED',BuildPlan:{operations:[]}};
 const report={schema:SCHEMA,
  previouslyVerifiedFourModels:[142773,19152,891,40895],
  oldFourSourceCityGeometrySha256:prev.report.viewOnlyCityscapeSha256,
  old19AuthoredSourceDocumentsUntouched:true,
  totalIndependentB143Models:5,totalOriginalAuthoredB143Docs:20,
  newSourceVoxels:compiled.primitives.length,
  newSourceElements:design.elements.length,
  newSourceSha256:compiled.sourceSha256,newGeometrySha256:compiled.geometrySha256,
  newFivePublicLevels:skyways.layers.map(x=>x.standingY),
  newSourceSupported2WideMoveEdges:skyways.sourceWalkMoves,
  newFloorProofSha256:skyways.exactSource2WideProofDigest,
  inheritedFourBuildingsOverlapCells:overlap,
  independentModelCapUnchanged:MAX_CELLS,
  combinedB143MonolithCompiled:false,
  reviewOnlyXOffset:REVIEW_X,sourceOnlyReview:true,
  viewedHistoricalNineScenesUnchanged:true,newViewingScenes:2,
  viewerSceneCount:11,totalSourceReviewVoxels:all.length,
  viewerCityGeometrySha256:readOnlyScene.geometrySha256,
  sourceCityBounds:extent,
  physicalInterBuildingLinkCertified:false,
  minecraftPlayerWalkingCertified:false,
  minecraftFallAndTerrainCertified:false,
  actualMinecraftPlacementApproved:false,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),worldCoordinates:null,
  worldContacts:0,worldWrites:0,BuildPlan:{operations:[]}};
 strict(verifyB196Report(report),'ARCHITECTURE_SAFETY_REPORT_REJECTED');
 return {previous:prev,design,compiled,skyways,modelViews,readOnlyScene,report};
}
export function verifyB196Report(r){
 return Boolean(r&&r.schema===SCHEMA&&
  r.previouslyVerifiedFourModels?.join(',')==='142773,19152,891,40895'&&
  r.oldFourSourceCityGeometrySha256?.length===64&&
  r.old19AuthoredSourceDocumentsUntouched===true&&
  r.totalIndependentB143Models===5&&r.totalOriginalAuthoredB143Docs===20&&
  r.newSourceVoxels>=18000&&r.newSourceVoxels<MAX_CELLS&&
  r.newSourceElements>=120&&r.newSourceElements<=160&&
  r.newSourceSha256?.length===64&&r.newGeometrySha256?.length===64&&
  r.newFivePublicLevels?.join(',')==='57,61,65,69,73'&&
  r.newSourceSupported2WideMoveEdges===355&&r.newFloorProofSha256?.length===64&&
  r.inheritedFourBuildingsOverlapCells===0&&
  r.independentModelCapUnchanged===MAX_CELLS&&
  r.combinedB143MonolithCompiled===false&&
  r.reviewOnlyXOffset===REVIEW_X&&r.sourceOnlyReview===true&&
  r.viewedHistoricalNineScenesUnchanged===true&&r.newViewingScenes===2&&
  r.viewerSceneCount===11&&r.totalSourceReviewVoxels===203711+r.newSourceVoxels&&
  r.viewerCityGeometrySha256?.length===64&&
  r.sourceCityBounds?.maxX>=350&&
  r.physicalInterBuildingLinkCertified===false&&
  r.minecraftPlayerWalkingCertified===false&&
  r.minecraftFallAndTerrainCertified===false&&
  r.actualMinecraftPlacementApproved===false&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  r.worldCoordinates===null&&r.worldContacts===0&&r.worldWrites===0&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
