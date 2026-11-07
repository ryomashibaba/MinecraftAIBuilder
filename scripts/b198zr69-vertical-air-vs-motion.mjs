/**
 * R69: independently compare 3D two-clear-cell air connectivity with
 * supported abstract step-constrained travel across floors.
 * Air shafts are NOT stairs, accessible entrances or player navigation.
 * Exact immutable B143 final voxels only; no model-declared spatialPlan.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198zr69-vertical-air-versus-supported-motion-v1';
const digest=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('B198ZR69_'+x)};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
export function analyzeR69VerticalAirAndMotion({raw,expectedRawSha256,
 expectedGeometrySha256}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  digest(raw)!==expectedRawSha256||
  !/^[a-f0-9]{64}$/.test(expectedGeometrySha256??''))
  fail('IMMUTABLE_SOURCE_AND_GEOMETRY_REQUIRED');
 let design,compiled;
 try{design=JSON.parse(raw).design;compiled=compileDesign(design);}
 catch{fail('STRICT_B143_FINAL_VOXELS_REQUIRED');}
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256!==expectedGeometrySha256)
  fail('STRICT_COMPILER_GEOMETRY_SHA_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds,plane=w*d,
  total=plane*h,index=(x,y,z)=>(y*d+z)*w+x;
 const solid=new Uint8Array(total),air=new Uint8Array(total),
  stand=new Uint8Array(total);
 for(const [x,y,z] of compiled.primitives)solid[index(x,y,z)]=1;
 let supported=0,clear=0;
 for(let y=1;y+1<h;y++)for(let z=0;z<d;z++)
  for(let x=0;x<w;x++){
   const at=index(x,y,z);
   if(solid[at]||solid[at+plane])continue;
   air[at]=1;clear++;
   if(solid[at-plane]){stand[at]=1;supported++;}
  }
 const neighbors=(i,callback)=>{
  const y=Math.floor(i/plane),z=Math.floor(i/w)%d,x=i%w;
  if(x>0)callback(i-1);
  if(x+1<w)callback(i+1);
  if(z>0)callback(i-w);
  if(z+1<d)callback(i+w);
  if(y>1)callback(i-plane);
  if(y+2<h)callback(i+plane);
 };
 // Graph 1: 3D two-high air. This allows unsupported shafts and vertical
 // open air. Its components can NEVER prove climbable transitions.
 const airLabel=new Int32Array(total),queue=new Int32Array(clear),
  airComponents=[];
 for(let root=0;root<total;root++){
  if(!air[root]||airLabel[root])continue;
  const id=airComponents.length+1;
  let front=0,back=1;queue[0]=root;airLabel[root]=id;
  let minY=h,maxY=-1,standingPositions=0;
  while(front<back){
   const at=queue[front++],y=Math.floor(at/plane);
   minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   standingPositions+=stand[at];
   neighbors(at,n=>{
    if(!air[n]||airLabel[n])return;
    airLabel[n]=id;queue[back++]=n;
   });
  }
  airComponents.push({id,clearTwoHighPositions:back,
   supportedStandingPositions:standingPositions,
   minFeetY:minY,maxFeetY:maxY,
   supportMotionComponentCount:0,
   distinctSupportedTravelAreas:0,hasInterlevelAir:maxY>minY});
 }
 // Graph 2: R64-compatible abstract motion, with physical support below
 // each position, horizontal offsets of one, and a one-cell elevation change.
 // Diagonal x/y or z/y moves additionally honor R3's clearance restrictions.
 const travelLabel=new Int32Array(total),travelComponents=[];
 let crossLevelEdges=0;
 for(let root=0;root<total;root++){
  if(!stand[root]||travelLabel[root])continue;
  const id=travelComponents.length+1;
  let front=0,back=1;queue[0]=root;travelLabel[root]=id;
  let minY=h,maxY=-1,airRegion=airLabel[root],sameAirRegion=true;
  while(front<back){
   const at=queue[front++],y=Math.floor(at/plane),
    z=Math.floor(at/w)%d,x=at%w;
   minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   if(airLabel[at]!==airRegion)sameAirRegion=false;
   for(const [nx,nz] of [
    [x-1,z],[x+1,z],[x,z-1],[x,z+1]]){
    if(nx<0||nx>=w||nz<0||nz>=d)continue;
    for(const dy of [0,1,-1]){
     const ny=y+dy;
     if(ny<1||ny+1>=h)continue;
     const dest=index(nx,ny,nz);
     if(!stand[dest])continue;
     if(dy===1&&(y+2>=h||solid[index(x,y+2,z)]))continue;
     if(dy===-1&&solid[index(nx,ny+2,nz)])continue;
     if(dy!==0&&dest>at)crossLevelEdges++;
     if(travelLabel[dest])continue;
     travelLabel[dest]=id;queue[back++]=dest;
    }
   }
  }
  travelComponents.push({id,supportedPositions:back,
   minFeetY:minY,maxFeetY:maxY,
   spansMultipleFeetHeights:maxY>minY,
   withinOneContinuousAirComponent:sameAirRegion});
 }
 const supportIds=airComponents.map(()=>new Set());
 for(let i=0;i<total;i++){
  if(stand[i]){
   const id=airLabel[i]-1,travelId=travelLabel[i];
   if(id<0||travelId<=0)fail('LABEL_COVERAGE_ERROR');
   supportIds[id].add(travelId);
  }
 }
 airComponents.forEach((c,i)=>{
  c.supportMotionComponentCount=supportIds[i].size;
  c.distinctSupportedTravelAreas=supportIds[i].size;
 });
 const ambiguous=airComponents.filter(c=>
  c.hasInterlevelAir&&c.supportMotionComponentCount>=2&&
  c.supportedStandingPositions>1);
 const airWithSupported=airComponents.filter(c=>c.supportedStandingPositions>0);
 const multiLevelMotion=travelComponents.filter(c=>c.spansMultipleFeetHeights);
 const motionLargest=travelComponents.reduce((m,c)=>Math.max(m,c.supportedPositions),0);
 const airSum=airComponents.reduce((n,c)=>n+c.clearTwoHighPositions,0);
 const standSum=travelComponents.reduce((n,c)=>n+c.supportedPositions,0);
 if(airSum!==clear||standSum!==supported)
  fail('GRAPH_COVERAGE_INTEGRITY');
 const metrics={dimensions:[w,h,d],allTwoHighAirPositions:clear,
  supportedTwoHighStandingPositions:supported,
  threeDimensionalAirComponentCount:airComponents.length,
  airComponentsWithSupportedPositions:airWithSupported.length,
  airComponentsSpanningMultipleHeights:
   airComponents.filter(c=>c.hasInterlevelAir).length,
  abstractSupportedMotionComponentCount:travelComponents.length,
  abstractSupportedMotionInterlevelEdges:crossLevelEdges,
  supportedMotionComponentsSpanningMultipleHeights:multiLevelMotion.length,
  largestSupportedMotionComponentPositions:motionLargest,
  largeAirConnectedButSupportedMotionSeparatedRegions:ambiguous.length,
  affectedSupportedPositionsInThoseRegions:ambiguous.reduce(
   (n,c)=>n+c.supportedStandingPositions,0),
  topAirComponents:airComponents.slice()
   .sort((a,b)=>b.supportedStandingPositions-a.supportedStandingPositions)
   .slice(0,12),
  topSupportedMotionComponents:travelComponents.slice()
   .sort((a,b)=>b.supportedPositions-a.supportedPositions).slice(0,12)};
 const concerns=[];
 if(ambiguous.length>0)
  concerns.push({kind:'VERTICAL_AIR_CONNECTED_BUT_SUPPORTED_TRAVEL_DISCONNECTED',
   measured:{airRegions:ambiguous.length,
    supportedPositions:metrics.affectedSupportedPositionsInThoseRegions},
   humanDecisionRequired:true,automaticReject:false,
   guidance:'Air shafts, courtyards and atria may connect floors visually while supported abstract travel remains disconnected. Inspect landings and transitions without filling the grand void or forcing one circulation pattern.'});
 if(supported>0&&travelComponents.length>1&&
  multiLevelMotion.length===0&&
  metrics.airComponentsSpanningMultipleHeights>0)
  concerns.push({kind:'VERTICAL_AIR_PRESENT_WITHOUT_INTERLEVEL_SUPPORTED_MOTION',
   measured:{airComponentsAcrossFeetY:
    metrics.airComponentsSpanningMultipleHeights,
    motionInterlevelEdges:crossLevelEdges},
   humanDecisionRequired:true,automaticReject:false,
   guidance:'Multiple heights of unobstructed air do not prove an accessible upper library or sky lounge. Consider genuinely supported stairs, ramps and landing continuity if intended.'});
 return {schema:SCHEMA,
  status:'VERTICAL_AIR_AND_SUPPORTED_MOTION_FACTS_ONLY',
  originalRawSha256:expectedRawSha256,
  geometrySha256:expectedGeometrySha256,
  metrics,possibleConcerns:concerns,
  modelSpatialPlanIgnored:true,allAirAndSupportComputedFromFinalVoxels:true,
  floatThroughAirNotInterpretedAsWalking:true,
  noMinecraftAvatarPhysicsOrCollisionTesting:true,
  noFunctionalOrArtisticQualityPass:true,
  deliberateAtriumOrSeparatePavilionsNotRejected:true,
  independentHumanReview:'NOT_REVIEWED',
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR69VerticalAirAndMotion({raw,expectedRawSha256,
 expectedGeometrySha256,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_REVIEW_DIR_REQUIRED');
 const json=path.join(destination,'R69_VERTICAL_AIR_VS_MOTION.json');
 const html=path.join(destination,'R69_VERTICAL_CIRCULATION_REVIEW.html');
 if(fs.existsSync(json)||fs.existsSync(html))fail('NO_REVIEW_OVERWRITE');
 const r=analyzeR69VerticalAirAndMotion({raw,expectedRawSha256,
  expectedGeometrySha256}),m=r.metrics;
 const rows=m.topAirComponents.map(x=>
  '<tr><td>'+x.id+'</td><td>'+x.clearTwoHighPositions+
  '</td><td>'+x.supportedStandingPositions+'</td><td>'+
  x.minFeetY+'–'+x.maxFeetY+'</td><td>'+
  x.supportMotionComponentCount+'</td></tr>').join('');
 const flagged=r.possibleConcerns.map(x=>'<li><b>'+
  esc(x.kind)+'</b>：'+esc(x.guidance)+'</li>').join('');
 const markup='<!doctype html><html lang="ja"><head><meta charset="UTF-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R69 立体空気と支持床経路の比較</title>'+
  '<style>body{font:15px/1.6 system-ui;max-width:960px;margin:28px auto;padding:0 20px;color:#263a4b}table{border-collapse:collapse}th,td{border:1px solid #cad5df;padding:8px}aside{background:#fff1dc;padding:13px}</style>'+
  '</head><body><h1>R69 上下に続く吹き抜け ≠ 上下を歩ける道</h1>'+
  '<aside>上下方向の空気の連続と、支持床がある抽象移動を別グラフで解析。空気の連続は階段やランプを意味しません。物理歩行・Minecraft動作・美観・本物の入口も認証していません。</aside>'+
  '<p>原本SHA '+esc(r.originalRawSha256)+'</p>'+
  '<p>頭上2セルの空気 '+m.allTwoHighAirPositions+
  ' / 立てる候補 '+m.supportedTwoHighStandingPositions+
  ' / 3D空気成分 '+m.threeDimensionalAirComponentCount+
  ' / 支持床つき抽象移動成分 '+m.abstractSupportedMotionComponentCount+
  ' / 上下を結ぶ支持床移動辺 '+m.abstractSupportedMotionInterlevelEdges+
  '</p><h2>主要空気成分</h2><table><tr><th>ID</th><th>空気</th><th>足場候補</th><th>y範囲</th><th>支持床移動成分</th></tr>'+
  rows+'</table><h2>人間の検討課題</h2><ul>'+
  (flagged||'<li>この幾何条件では警告なし。品質認定ではありません。</li>')+
  '</ul><p>NOT_PREPARED、9ゲートBLOCKED、推論0、Minecraft操作0。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,markup,{flag:'wx'});
 return {status:r.status,relativeFile:path.basename(html),
  modelCalls:0,worldWrites:0};
}
