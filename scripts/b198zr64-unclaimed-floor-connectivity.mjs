/**
 * R64: source-independent conceptual-voxel support/headroom connectivity.
 * Deliberately ignores MODEL-DECLARED spatialPlan, destinations and thresholds.
 * Never certifies architectural function, real Minecraft walkability or quality.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198zr64-unclaimed-floor-connectivity-v1';
const digest=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR64_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldReads:0,worldWrites:0,modelCalls:0});
/**
 * Examine ALL concept voxels, not the model's cherry-picked locations.
 * Motion edges mirror the abstract one-cell horizontal and +/-1 Y rule used
 * by R3 with headroom=2. They are NOT Minecraft physical avatar edges.
 * Horizontal same-level 2x2 pads are separately counted as width evidence.
 */
export function analyzeR64UnclaimedFloorConnectivity({
 raw,expectedRawSha256,expectedGeometrySha256
}={}){
 if(typeof raw!=='string'||raw.length===0||
  Buffer.byteLength(raw)>120000||digest(raw)!==expectedRawSha256||
  !/^[a-f0-9]{64}$/.test(expectedGeometrySha256??''))
  fail('IMMUTABLE_SOURCE_AND_GEOMETRY_SHA_REQUIRED');
 let parsed,compiled;
 try{parsed=JSON.parse(raw);compiled=compileDesign(parsed.design);}
 catch{fail('B143_FINAL_GEOMETRY_REQUIRED');}
 if(!verifyCompiled(parsed.design,compiled)||compiled.geometrySha256!==expectedGeometrySha256)
  fail('B143_VERIFIED_GEOMETRY_SHA_MISMATCH');
 const {width:w,height:h,depth:d}=parsed.design.bounds;
 const total=w*h*d,plane=w*d;
 const occupied=new Uint8Array(total);
 const index=(x,y,z)=>(y*d+z)*w+x;
 for(const [x,y,z] of compiled.primitives)occupied[index(x,y,z)]=1;
 const stand=new Uint8Array(total);
 const countByFeetHeight=new Int32Array(h);
 let standCount=0,groundLike=0,padCount=0;
 for(let y=1;y+1<h;y++)for(let z=0;z<d;z++)
  for(let x=0;x<w;x++){
   const i=index(x,y,z);
   if(occupied[i-plane]||false){
    if(!occupied[i]&&!occupied[i+plane]){
     stand[i]=1;standCount++;countByFeetHeight[y]++;
     if(y<=2)groundLike++;
    }
   }
  }
 // A pad is four standable positions on the same feet level.
 for(let y=1;y+1<h;y++)for(let z=0;z+1<d;z++)
  for(let x=0;x+1<w;x++){
   const i=index(x,y,z);
   if(stand[i]&&stand[i+1]&&stand[i+w]&&stand[i+w+1])
    padCount++;
  }
 const visited=new Uint8Array(total),queue=new Int32Array(standCount);
 const components=[];
 for(let root=0;root<total;root++){
  if(!stand[root]||visited[root])continue;
  let head=0,tail=1;queue[0]=root;visited[root]=1;
  let minY=h,maxY=0,hasLowApproach=false,pads=0;
  while(head<tail){
   const cur=queue[head++],y=Math.floor(cur/plane),
    z=Math.floor(cur/w)%d,x=cur%w;
   minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   if(y<=2)hasLowApproach=true;
   if(x+1<w&&z+1<d&&stand[cur+1]&&stand[cur+w]&&stand[cur+w+1])pads++;
   const around=[
    x>0?[x-1,z]:null,
    x+1<w?[x+1,z]:null,
    z>0?[x,z-1]:null,
    z+1<d?[x,z+1]:null
   ];
   for(const neighbor of around){
    if(!neighbor)continue;
    const [nx,nz]=neighbor;
    for(const dy of [0,1,-1]){
     const ny=y+dy;
     if(ny<1||ny+1>=h)continue;
     const next=index(nx,ny,nz);
     if(!stand[next]||visited[next])continue;
     // Model R3's conservative extra clearance around height changes.
     if(dy===1&&(y+2>=h||occupied[index(x,y+2,z)]))continue;
     if(dy===-1&&occupied[index(nx,ny+2,nz)])continue;
     visited[next]=1;queue[tail++]=next;
    }
   }
  }
  components.push({size:tail,lowestFeetY:minY,highestFeetY:maxY,
   hasLowLevelCandidate:hasLowApproach,
   horizontal2x2Pads:pads,possibleInterlevelMovement:maxY>minY});
 }
 components.sort((a,b)=>b.size-a.size||a.lowestFeetY-b.lowestFeetY);
 const represented=components.reduce((n,c)=>n+c.size,0);
 if(represented!==standCount)fail('COMPONENT_COVERAGE_INTEGRITY');
 const isolatedUpper=components.filter(c=>!c.hasLowLevelCandidate)
  .reduce((n,c)=>n+c.size,0);
 const concerns=[];
 if(components.length>1&&standCount>0&&components[0].size/standCount<0.7)
  concerns.push({kind:'MANY_DISCONNECTED_ABSTRACT_WALKING_COMPONENTS',
   measured:{components:components.length,
    largestComponentPositions:components[0].size,
    allSupportedClearPositions:standCount},
   interpretation:'Several regions are disconnected under a one-cell abstract movement model. This may be deliberate; examine doors, landings, and independent wings.',
   automaticReject:false});
 if(standCount>0&&padCount===0)
  concerns.push({kind:'NO_SAME_LEVEL_2X2_CLEAR_STANDING_PAD',
   measured:{supportedClearPositions:standCount,padCount:0},
   interpretation:'No 2x2 supported clear pad appears in final concept voxels; inspect whether rooms and circulation are genuinely usable.',
   automaticReject:false});
 if(isolatedUpper>0)
  concerns.push({kind:'NO_LOW_LEVEL_CANDIDATE_IN_SOME_COMPONENTS',
   measured:{upperOrIsolatedComponentPositions:isolatedUpper},
   interpretation:'Some movement components have no foot positions at local y<=2. A genuine entrance or stairs have NOT been established or ruled out.',
   automaticReject:false});
 const metrics={dimensions:[w,h,d],
  finalConceptVoxelCount:compiled.primitives.length,
  supportedTwoHighStandingPositions:standCount,
  sameLevel2x2ClearPadCount:padCount,
  conceptualMotionComponents:components.length,
  largestComponentPositions:components[0]?.size??0,
  largestComponentShare:standCount>0?(components[0]?.size??0)/standCount:null,
  lowLevelStandingCandidates:groundLike,
  positionsInComponentsWithoutLowLevelCandidates:isolatedUpper,
  candidateStandingByY:[...countByFeetHeight].map((count,y)=>({y,count}))
   .filter(v=>v.count>0),topComponents:components.slice(0,12)};
 return {schema:SCHEMA,status:'SOURCE_INDEPENDENT_ABSTRACT_SPATIAL_FACTS_ONLY',
  rawSha256:expectedRawSha256,geometrySha256:expectedGeometrySha256,
  spatialPlanReadOrTrusted:false,
  independentlyChosenModelDestinationUsed:false,
  independentReviewerThresholdsUsed:false,
  metrics,possibleSpatialConcerns:concerns,
  exhaustiveStandingCellCoverageVerified:true,
  noAestheticScore:true,
  interiorVsExteriorNotClassified:true,
  publicAccessNotVerified:true,
  minecraftCollisionOrWalkingNotVerified:true,
  stairAndDoorPhysicalSafetyNotCertified:true,
  independentArchitecturalQuality:'NOT_REVIEWED',
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR64UnclaimedFloorConnectivity({
 raw,expectedRawSha256,expectedGeometrySha256,destination
}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('ORDINARY_EXISTING_OUTPUT_DIR_REQUIRED');
 const j=path.join(destination,'R64_INDEPENDENT_FLOOR_NETWORK.json');
 const h=path.join(destination,'R64_FLOOR_CONNECTIVITY_REVIEW.html');
 if(fs.existsSync(j)||fs.existsSync(h))fail('REVIEW_OUTPUT_EXISTS');
 const report=analyzeR64UnclaimedFloorConnectivity({
  raw,expectedRawSha256,expectedGeometrySha256});
 const {metrics:m}=report;
 const perY=m.candidateStandingByY.map(v=>'<tr><td>'+v.y+
  '</td><td>'+v.count+'</td></tr>').join('');
 const concerns=report.possibleSpatialConcerns.map(v=>
  '<li><b>'+esc(v.kind)+'</b>：'+esc(v.interpretation)+'</li>').join('');
 const html='<!doctype html><html lang="ja"><head><meta charset="UTF-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R64 自己申告に頼らない床・空間調査</title>'+
  '<style>body{font:15px/1.6 system-ui;max-width:1000px;margin:30px auto;padding:0 20px;color:#273949}table{border-collapse:collapse}th,td{padding:8px 14px;border:1px solid #ccd7e3}.warn{background:#fff4e4;padding:12px;border-left:4px solid #bf8846}</style>'+
  '</head><body><h1>R64 最終ボクセル全体の床・空間ネットワーク</h1>'+
  '<p class="warn">AI自身のspatialPlanは検査対象に使っていません。1セル幅の抽象移動と頭上2セルの空気条件で算出した候補であり、建築用途・外部/内部・Minecraft衝突・実機歩行の証明ではありません。</p>'+
  '<p>原本SHA '+esc(report.rawSha256)+'</p>'+
  '<p>支持床＋頭上2セルの候補：<b>'+m.supportedTwoHighStandingPositions+
  '</b>、抽象的な移動成分：<b>'+m.conceptualMotionComponents+
  '</b>、最大成分：<b>'+m.largestComponentPositions+'</b>、同じ高さの2×2空間：<b>'+
  m.sameLevel2x2ClearPadCount+'</b></p>'+
  '<h2>階ごとの候補地点（ローカルy）</h2><table><tr><th>y</th><th>候補数</th></tr>'+
  perY+'</table><h2>注意して確認したい箇所</h2><ul>'+
  (concerns||'<li>この抽象ルール上の注意項目は検出されていません。品質合格ではありません。</li>')+
  '</ul><p>人間が用途・本物の動線・造形・独創性を判断する必要があります。</p>'+
  '<p>NOT_PREPARED、施工9ゲートBLOCKED、実モデル呼出0、Minecraft操作0</p></body></html>';
 fs.writeFileSync(j,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {status:report.status,relativeFile:path.basename(h),
  standingPositions:m.supportedTwoHighStandingPositions,
  components:m.conceptualMotionComponents,modelCalls:0,worldWrites:0};
}
