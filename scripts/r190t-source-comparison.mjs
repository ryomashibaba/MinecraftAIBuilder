/**
 * R190-T: compare EXACT B143 final conceptual voxels. Model geometry is never
 * repaired here. Functional proxies do not prove art, rooms, or Minecraft walking.
 */
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const fail=s=>{throw Error('R190T_'+s)};
const SHA=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const position=(x,y,z,w,d)=>(y*d+z)*w+x;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export const R190T_SCHEMA='minecraftaibuilder-r190t-actual-voxel-comparison-v1';
export function measureR190TSource(design,spatialPlan=null){
 const compiled=compileDesign(design);
 if(!verifyCompiled(design,compiled))fail('INVALID_COMPILED_SOURCE');
 const {width:w,height:h,depth:d}=design.bounds;
 const cells=new Uint8Array(w*h*d),tops=new Int16Array(w*d).fill(-1),
  layerCounts=new Int32Array(h);
 const columns=new Set();
 for(const [x,y,z] of compiled.primitives){
  cells[position(x,y,z,w,d)]=1;
  tops[z*w+x]=Math.max(tops[z*w+x],y);
  layerCounts[y]++;columns.add(z*w+x);
 }
 const bb=compiled.bounds,footprint=(bb.maxX-bb.minX+1)*(bb.maxZ-bb.minZ+1),
  vertical=bb.maxY-bb.minY+1;
 const dense=[...layerCounts].filter(n=>n>=.85*footprint).length;
 const stand=(x,y,z)=>x>=0&&x<w&&z>=0&&z<d&&y>0&&y+1<h&&
  !!cells[position(x,y-1,z,w,d)]&&
  !cells[position(x,y,z,w,d)]&&!cells[position(x,y+1,z,w,d)];
 let standable=0,covered=0;
 for(let y=1;y<h-1;y++)for(let z=0;z<d;z++)for(let x=0;x<w;x++)
  if(stand(x,y,z)){standable++;if(tops[z*w+x]>y+1)covered++}
 const entrance=spatialPlan?.entrance,validEntrance=Array.isArray(entrance)&&
  entrance.length===3&&entrance.every(Number.isSafeInteger)&&stand(...entrance);
 const seen=new Uint8Array(cells.length),queue=new Int32Array(cells.length);
 let next=0,first=0,connectedCovered=0;
 if(validEntrance){
  const idx=position(...entrance,w,d);seen[idx]=1;queue[next++]=idx;
 }
 while(first<next){
  const id=queue[first++],x=id%w,z=Math.floor(id/w)%d,y=Math.floor(id/(w*d));
  if(tops[z*w+x]>y+1)connectedCovered++;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])
   for(const dy of [0,1,-1]){
    const nx=x+dx,ny=y+dy,nz=z+dz;
    if(!stand(nx,ny,nz))continue;
    if(dy===1&&(y+2>=h||cells[position(x,y+2,z,w,d)]))continue;
    if(dy===-1&&ny+2<h&&cells[position(nx,ny+2,nz,w,d)])continue;
    const p=position(nx,ny,nz,w,d);
    if(!seen[p]){seen[p]=1;queue[next++]=p}
   }
 }
 return {sourceSha256:compiled.sourceSha256,
  compiledGeometrySha256:compiled.geometrySha256,
  finalPhysicalVoxelSha256:SHA(compiled.primitives.map(p=>p.slice(0,4))),
  finalVoxelCount:compiled.primitives.length,
  physicalBoundingFootprint:footprint,physicalVerticalSpan:vertical,
  filledBoundingVolumeFraction:Number((compiled.primitives.length/(footprint*vertical)).toFixed(5)),
  denseHorizontalLayers85Percent:dense,
  denseLayerFraction:Number((dense/vertical).toFixed(5)),
  twoBlockSupportedStandablePositions:standable,
  standablePerFootprint:Number((standable/footprint).toFixed(5)),
  roofCoveredStandableProxy:covered,
  modelDeclaredEntranceStandable:!!validEntrance,
  reachableFromModelDeclaredEntrance:next,
  roofCoveredReachableProxy:connectedCovered,
  topSurfaceDistinctHeights:[...new Set(tops)].filter(x=>x>=0).length};
}
export function compareR190TSource({beforeDesign,afterDesign,beforePlan=null,afterPlan=null}){
 const before=measureR190TSource(beforeDesign,beforePlan),
  after=measureR190TSource(afterDesign,afterPlan);
 const same=before.finalPhysicalVoxelSha256===after.finalPhysicalVoxelSha256;
 return {schema:R190T_SCHEMA,
  status:same?'NO_FINAL_VOXEL_CHANGE':'DIFFERENT_FINAL_VOXEL_GEOMETRY',
  before,after,
  samePhysicalVoxels:same,
  deltas:{
   twoBlockStandable:after.twoBlockSupportedStandablePositions-before.twoBlockSupportedStandablePositions,
   roofCoveredProxy:after.roofCoveredStandableProxy-before.roofCoveredStandableProxy,
   denseLayerFraction:Number((after.denseLayerFraction-before.denseLayerFraction).toFixed(5)),
   entranceValidityChanged:before.modelDeclaredEntranceStandable!==after.modelDeclaredEntranceStandable
  },limitations:{
   nonidenticalDimensionsAndModelDeclaredProgramsMayLimitComparison:true,
   actualEnclosedRoomsNotVerified:true,exhibitToRepairConnectionNotVerified:true,
   sawtoothRoofNotVerified:true,architecturalOriginalityNotVerified:true,
   roofCoveredIsProxyOnly:true,actualMinecraftWalking:'NOT_TESTED',
   humanArtReview:'ART_HOLD'},
  numericArchitecturalWinner:'NOT_ESTABLISHED',modelCalls:0,...safety()};
}
export function renderR190TPair(beforeDesign,afterDesign,viewerTemplate){
 const b=compileB143Gallery([beforeDesign]),a=compileB143Gallery([afterDesign]);
 const beforeHtml=renderB143Html(b,viewerTemplate),
  afterHtml=renderB143Html(a,viewerTemplate);
 const indexHtml='<!doctype html><html lang="ja"><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>R190-T original voxel comparison - ART HOLD</title>'+
 '<style>body{background:#141922;color:white;font:16px system-ui;margin:16px}'+
 'main{display:grid;grid-template-columns:1fr 1fr;gap:12px}'+
 'iframe{width:100%;height:72vh;border:1px solid #667385;background:#191f28}'+
 'p{line-height:1.6}@media(max-width:800px){main{grid-template-columns:1fr}'+
 'iframe{height:50vh}}</style><h1>R190-T 正真正銘のボクセル比較</h1>'+
 '<p>モデルの元回答と再設計回答をそれぞれ無改変でB143コンパイルしたビュー。'+
 '合格・改善・Minecraft施工を意味しません。人間の美術評価が必要です。</p>'+
 '<main><section><h2>旧案 — HOLD</h2>'+
 '<iframe title="before" src="R190T_BEFORE_3D.html"></iframe></section>'+
 '<section><h2>新案 — ART HOLD</h2>'+
 '<iframe title="after" src="R190T_AFTER_3D.html"></iframe></section></main></html>';
 return {beforeHtml,afterHtml,indexHtml,sourceHashes:[b.sourceHashes[0],a.sourceHashes[0]]};
}
