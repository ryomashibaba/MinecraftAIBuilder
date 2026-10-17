/**
 * B193 -- independently authored THREE-model, read-only CITYSCAPE REVIEW.
 * NOT a new B143 building; NOT a monolithic 162816 voxel compile. Each
 * original capped B143 source model stays strictly independent. The only
 * transformation is source-review-local x+132 ANNEX, x+100 bridge, x+0 main.
 * This module never makes Minecraft world location or construction objects.
 */
import {createHash} from 'node:crypto';
import {MAX_CELLS,MATERIALS} from './b143-building-dsl.mjs';
import {buildB192,verifyB192Report} from './b192-skybridge-architecture.mjs';
export const SCHEMA='minecraftaibuilder-b193-virtual-cityscape-review-v1';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const key=(x,y,z)=>x+','+y+','+z;
const must=(p,s)=>{if(!p)throw Error('B193_'+s)};
export const OFFSETS=Object.freeze({
 main:Object.freeze({x:0,y:0,z:0}),
 annex:Object.freeze({x:132,y:0,z:0}),
 skybridge:Object.freeze({x:100,y:0,z:0}),
 coordinateSystem:'OFFLINE_REVIEW_COORDINATES',
 isMinecraftWorldLocation:false
});
function shifted(scene,offset,id){
 const originalCount=scene.primitives.length;
 const primitives=scene.primitives.map(([x,y,z,m])=>[
  x+offset.x,y+offset.y,z+offset.z,m]);
 must(primitives.length===originalCount,'TRANSFORM_DROPPED_CELLS_'+id);
 const extents={
  minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,
  minZ:Infinity,maxZ:-Infinity};
 for(const [x,y,z] of primitives){
  extents.minX=Math.min(extents.minX,x);extents.maxX=Math.max(extents.maxX,x);
  extents.minY=Math.min(extents.minY,y);extents.maxY=Math.max(extents.maxY,y);
  extents.minZ=Math.min(extents.minZ,z);extents.maxZ=Math.max(extents.maxZ,z);
 }
 return {id,offset,originalGeometrySha256:scene.geometrySha256,
  sourceVoxelCount:originalCount,primitives,bounds:extents,
  transformedVoxelSha256:sha(primitives)};
}
export function inspectCityscapeAssembly(b192){
 must(b192&&verifyB192Report(b192.report),'PREVIOUS_SOURCE_SAFETY_GATE');
 const models=[
  shifted(b192.parent.compiled,OFFSETS.main,'nebula-ark-main'),
  shifted(b192.annex.compiled,OFFSETS.annex,'horizon-dock-annex'),
  shifted(b192.bridge.compiled,OFFSETS.skybridge,'celestial-skybridge')
 ];
 must(models.map(x=>x.sourceVoxelCount).join(',')==='142773,19152,891',
  'UNEXPECTED_PROTECTED_MODEL_VOLUMES');
 must(models.every(x=>x.sourceVoxelCount<MAX_CELLS),'PER_MODEL_SOURCE_CAP');
 const coordinates=new Set(),seenPerModel=new Map(),joint=[];
 let overlaps=0;
 for(const model of models){
  let count=0;
  for(const p of model.primitives){
   const k=key(p[0],p[1],p[2]);
   if(coordinates.has(k)){overlaps++;continue}
   coordinates.add(k);joint.push(p);count++;
  }
  seenPerModel.set(model.id,count);
 }
 must(overlaps===0,'MODEL_INTERSECTION_REVIEW_HOLD_'+overlaps);
 must(seenPerModel.size===3&&models.every(x=>
  seenPerModel.get(x.id)===x.sourceVoxelCount),'INDEPENDENT_ORIGINAL_VOLUME_LOST');
 const sum=models.reduce((v,x)=>v+x.sourceVoxelCount,0);
 must(sum===162816&&joint.length===sum,'VIRTUAL_REVIEW_CELL_TOTAL_MISMATCH');
 const bounds={
  minX:Math.min(...models.map(x=>x.bounds.minX)),
  maxX:Math.max(...models.map(x=>x.bounds.maxX)),
  minY:Math.min(...models.map(x=>x.bounds.minY)),
  maxY:Math.max(...models.map(x=>x.bounds.maxY)),
  minZ:Math.min(...models.map(x=>x.bounds.minZ)),
  maxZ:Math.max(...models.map(x=>x.bounds.maxZ))
 };
 must(bounds.minX>=0&&bounds.maxX<=179&&bounds.maxY<=77&&bounds.maxZ<50,
  'REVIEW_GEOMETRIC_ENVELOPE');
 must(b192.bridge.proof.parentOrAnnexOverlapCells===0&&
  b192.bridge.proof.blockedTravellerCells===0&&
  b192.bridge.proof.unsupportedFootCells===0&&
  b192.bridge.proof.source2WideStations===31,'B192_31_SOURCE_STATIONS_FAIL');
 const groups=models.map((g,i)=>({
  id:g.id,sourceCellCount:g.sourceVoxelCount,
  sourceGeometrySha256:g.originalGeometrySha256,
  transformedVoxelSha256:g.transformedVoxelSha256,
  xOffset:g.offset.x,
  bounds:g.bounds,
  // True B143 model origins are preserved. This is only DISPLAY metadata.
  sourceOnlyReview:true,actualMinecraftWorldCoordinates:null,
  worldWrites:0,constructionApproved:false
 }));
 const layerCounts=Object.fromEntries(MATERIALS.map(x=>[x,0]));
 for(const p of joint)layerCounts[MATERIALS[p[3]]]++;
 const compSha256=sha({schema:SCHEMA,groups,originalReviewBridge:b192.bridge.proof.geometricBridgeCellsSha256});
 const readOnlyScene={
  id:'b193-view-only-source-cityscape',
  title:'B193 / 3棟同時に見る都市全景 — 仮の設計配置（施工禁止）',
  brief:'本館・HORIZON DOCK・独立橋の3つのB143原本を、設計レビュー専用の相対座標に置いた全景。162,816セルは3モデルの合算であり単一B143モデルではありません。接続・地形・Minecraft実機歩行は未認証。',
  sourceSha256:sha({schema:SCHEMA,sourceOriginals:groups.map(x=>x.sourceGeometrySha256)}),
  geometrySha256:compSha256,
  designOnly:true,readiness:'NOT_PREPARED',worldCoordinates:null,worldContacts:0,
  BuildPlan:{operations:[]},
  layerNames:b192.parent.compiled.layerNames,
  bounds,levels:Math.floor(bounds.maxY/5)+1,
  primitives:joint,
  stats:{voxels:sum,layerCounts,designOperations:[
   ...b192.parent.compiled.stats.designOperations,
   ...b192.annex.compiled.stats.designOperations,
   ...b192.bridge.compiled.stats.designOperations
  ],modelCount:3,virtualReviewOnly:true},
  virtualReviewOnly:true,notAnIndependentB143CompiledModel:true
 };
 const totalReviewSpan=bounds.maxX-bounds.minX+1;
 const sourceMainSpan=models[0].bounds.maxX-models[0].bounds.minX+1;
 const sourceAnnexSpan=models[1].bounds.maxX-models[1].bounds.minX+1;
 const minBuildingXGap=models[1].bounds.minX-models[0].bounds.maxX-1;
 must(minBuildingXGap>=0,'BUILDING_ENVELOPES_CROSS');
 const report={schema:SCHEMA,sourceOnlyReview:true,
  coordinateSystem:OFFSETS.coordinateSystem,
  wholeSceneActualMinecraftPlacement:false,
  virtualIndependentBuildings:3,
  preserveOriginalB143Documents:18,
  previousViewerScenes:6,viewerScenesWithOneReview:7,
  originalMainCells:models[0].sourceVoxelCount,
  originalAnnexCells:models[1].sourceVoxelCount,
  originalBridgeCells:models[2].sourceVoxelCount,
  virtualViewCells:sum,
  unchangedSeparateMaxCells:MAX_CELLS,
  monolithicB143CompilePerformed:false,
  reviewSceneIndependentArchitecturalModel:false,
  originalSourceVoxelIntersectionCount:overlaps,
  horizontalTotalReviewSpan:totalReviewSpan,
  mainLocalHorizontalSpan:sourceMainSpan,
  annexLocalHorizontalSpan:sourceAnnexSpan,
  buildingEnvelopeEmptyXGap:minBuildingXGap,
  reviewRelativeAnnexX:OFFSETS.annex.x,
  reviewRelativeBridgeX:OFFSETS.skybridge.x,
  originalY69Route2WideStations:b192.bridge.proof.source2WideStations,
  sourceModelSha256:groups.map(g=>g.sourceGeometrySha256),
  cityscapeReviewSha256:compSha256,
  viewportGroupNames:groups.map(g=>g.id),
  originalBuildingsNeverMutated:true,
  realWorldTerrainChecked:false,
  actualMinecraftWalkingCertified:false,
  actualMinecraftStructuralSafetyCertified:false,
  worldWrites:0,worldContacts:0,worldCoordinates:null,
  constructionApproved:false,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 must(verifyB193Report(report),'HARD_SOURCE_CONSTRUCTION_HOLD');
 return {b192,models,groups,readOnlyScene,report};
}
export function buildB193(){
 return inspectCityscapeAssembly(buildB192());
}
export function verifyB193Report(r){
 return Boolean(r&&r.schema===SCHEMA&&r.sourceOnlyReview===true&&
  r.coordinateSystem==='OFFLINE_REVIEW_COORDINATES'&&
  r.wholeSceneActualMinecraftPlacement===false&&
  r.virtualIndependentBuildings===3&&r.preserveOriginalB143Documents===18&&
  r.previousViewerScenes===6&&r.viewerScenesWithOneReview===7&&
  r.originalMainCells===142773&&r.originalAnnexCells===19152&&
  r.originalBridgeCells===891&&r.virtualViewCells===162816&&
  r.virtualViewCells===r.originalMainCells+r.originalAnnexCells+r.originalBridgeCells&&
  r.unchangedSeparateMaxCells===MAX_CELLS&&
  r.monolithicB143CompilePerformed===false&&
  r.reviewSceneIndependentArchitecturalModel===false&&
  r.originalSourceVoxelIntersectionCount===0&&
  r.horizontalTotalReviewSpan>=170&&r.horizontalTotalReviewSpan<=180&&
  r.mainLocalHorizontalSpan>=100&&r.annexLocalHorizontalSpan>=30&&
  r.buildingEnvelopeEmptyXGap>=0&&
  r.reviewRelativeAnnexX===132&&r.reviewRelativeBridgeX===100&&
  r.originalY69Route2WideStations===31&&
  r.sourceModelSha256?.length===3&&
  r.sourceModelSha256.every(v=>/^[a-f0-9]{64}$/.test(v))&&
  /^[a-f0-9]{64}$/.test(r.cityscapeReviewSha256)&&
  r.viewportGroupNames?.join(',')==='nebula-ark-main,horizon-dock-annex,celestial-skybridge'&&
  r.originalBuildingsNeverMutated===true&&
  r.realWorldTerrainChecked===false&&
  r.actualMinecraftWalkingCertified===false&&
  r.actualMinecraftStructuralSafetyCertified===false&&
  r.worldWrites===0&&r.worldContacts===0&&r.worldCoordinates===null&&
  r.constructionApproved===false&&r.readiness==='NOT_PREPARED'&&
  r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
  Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0);
}
