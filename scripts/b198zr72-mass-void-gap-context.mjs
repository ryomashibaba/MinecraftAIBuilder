/**
 * R72: preserve architectural mass and existing voids while triaging
 * R71 nearest voxel pairs. The minimum AXIS-ALIGNED BOUNDING BOX is
 * a review region, NOT a bridge, stair, path or construction proposal.
 * Do not interpret air cells as all being architecturally protected.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {inspectR71AbstractRouteGaps,SCHEMA as R71_SCHEMA}
 from './b198zr71-abstract-route-gap-triage.mjs';
export const SCHEMA='minecraftaibuilder-b198zr72-mass-void-gap-context-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR72_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
function sourceData(raw,geometrySha){
 let design,compiled;
 try{design=JSON.parse(raw).design;compiled=compileDesign(design);}
 catch{fail('B143_FINAL_VOXEL_COMPILATION_REQUIRED');}
 if(!verifyCompiled(design,compiled)||compiled.geometrySha256!==geometrySha)
  fail('EXACT_FINAL_GEOMETRY_SHA_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds,plane=w*d,
  total=w*d*h,solid=new Uint8Array(total);
 const at=(x,y,z)=>(y*d+z)*w+x;
 for(const [x,y,z] of compiled.primitives)solid[at(x,y,z)]=1;
 return {w,h,d,solid,at};
}
export function assessR72MassVoidGapContext({raw,expectedRawSha256,
 expectedGeometrySha256,r70Evidence,r71Evidence}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  hash(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('ORIGINAL_SHA_AND_GEOMETRY_SHA_REQUIRED');
 const r71=inspectR71AbstractRouteGaps({raw,
  expectedRawSha256,expectedGeometrySha256,r70Evidence});
 if(!r71Evidence||r71Evidence.schema!==R71_SCHEMA||
  r71Evidence.originalRawSha256!==expectedRawSha256||
  r71Evidence.geometrySha256!==expectedGeometrySha256||
  r71Evidence.status!==r71.status||
  r71Evidence.originalSpatialPlanNotConsulted!==true||
  JSON.stringify(r71Evidence.metrics)!==JSON.stringify(r71.metrics)||
  JSON.stringify(r71Evidence.possibleConcerns)!==
   JSON.stringify(r71.possibleConcerns))
  fail('R71_VERIFIED_GAP_EVIDENCE_REQUIRED');
 const {w,h,d,solid,at}=sourceData(raw,expectedGeometrySha256);
 const entries=[];
 const sites=r71.metrics.topUnreachableComponents.slice(0,8);
 for(const [siteIndex,site] of sites.entries()){
  const a=site.closestReachedSupportedLocal,
   b=site.closestUnreachedSupportedLocal;
  if(!Array.isArray(a)||!Array.isArray(b)||
   a.length!==3||b.length!==3||
   [...a,...b].some(n=>!Number.isInteger(n)))
   fail('TRIAGE_PAIR_COORDINATES_REQUIRED');
  const minimum=[a.map((n,i)=>Math.min(n,b[i])),
   a.map((n,i)=>Math.max(n,b[i]))];
  const [lo,hi]=minimum;
  if(lo[0]<0||lo[1]<0||lo[2]<0||
   hi[0]>=w||hi[1]>=h||hi[2]>=d)
   fail('LOCAL_COORDINATE_OUT_OF_BOUNDS');
  let solidInBox=0,clearInBox=0,supportInBox=0,
   twoHighClearInBox=0;
  for(let y=lo[1];y<=hi[1];y++)
   for(let z=lo[2];z<=hi[2];z++)
    for(let x=lo[0];x<=hi[0];x++){
     const id=at(x,y,z),occupied=solid[id]===1;
     if(occupied)solidInBox++;else clearInBox++;
     if(y>=1&&y+1<h&&!occupied&&!solid[id+w*d]){
      twoHighClearInBox++;
      if(solid[id-w*d])supportInBox++;
     }
    }
  let longAirColumns=0,maximumAirColumnLength=0;
  for(let z=lo[2];z<=hi[2];z++)
   for(let x=lo[0];x<=hi[0];x++){
    let streak=0,best=0;
    for(let y=lo[1];y<=hi[1];y++){
     streak=solid[at(x,y,z)]?0:streak+1;
     best=Math.max(best,streak);
    }
    maximumAirColumnLength=Math.max(maximumAirColumnLength,best);
    if(best>=4)longAirColumns++;
   }
  const boxCells=(hi[0]-lo[0]+1)*(hi[1]-lo[1]+1)*
   (hi[2]-lo[2]+1);
  if(solidInBox+clearInBox!==boxCells)
   fail('BOX_PARTITION_COUNT_INTEGRITY');
  entries.push({componentRank:siteIndex+1,
   supportedPositions:site.supportedPositions,
   upperSupportPositions:site.upperSupportPositions,
   gapReviewCategory:site.gapReviewCategory,
   reachedFootVoxel:a,unreachedFootVoxel:b,
   exactNearestPairDistance:site.optimisticManhattanCellDistance,
   boxMinInclusive:lo,boxMaxInclusive:hi,
   boxVoxelCount:boxCells,
   boxSolidVoxelCount:solidInBox,
   boxAirVoxelCount:clearInBox,
   boxTwoHighClearPositions:twoHighClearInBox,
   boxSupportedStandingPositions:supportInBox,
   localColumnsWithAtLeast4ContinuousAirCells:longAirColumns,
   longestContinuousAirRunInBox:maximumAirColumnLength,
   existingVoidsCouldBeArchitecturallyImportant:longAirColumns>0,
   geometryModified:false,constructionPathProposed:false,
   isThisAConstructibleCorridor:false,
   independentHumanReviewRequired:true});
 }
 const totalBoxCells=entries.reduce((n,x)=>n+x.boxVoxelCount,0);
 const m={dimensions:[w,h,d],
  disconnectedComponentCount:r71.metrics.unreachableSupportedMotionComponents,
  reviewedTopDisconnectedComponents:entries.length,
  sites:entries,
  minimumReviewBoxTotalCellCount:totalBoxCells,
  sitesWith4HighAirInsideBox:entries.filter(x=>
   x.existingVoidsCouldBeArchitecturallyImportant).length,
  r71GapStatus:r71.status,
  r71ApproachSeeds:r71.metrics.originalR70ProvisionalApproachSeeds};
 const concerns=[];
 if(r71.status.startsWith('HOLD_'))
  concerns.push({kind:'ORIGINAL_APPROACH_UNCERTAIN_SKIP_ROUTE_OVERLAY',
   instructions:'Entrance and supported-route analysis is on HOLD. Do not infer an entry, gap, corridor or route from this report; manually review the original design.',
   automaticReject:false});
 else if(entries.length>0)
  concerns.push({kind:'NEAREST_PAIR_BOXES_NOT_SAFE_PATHS',
   measured:{reviewSites:entries.length,
    sitesWithTallAir: m.sitesWith4HighAirInsideBox},
   instructions:'The nearest-pair bounding boxes include both original mass and potentially meaningful air, but are NOT actual corridor proposals. In the 3D views preserve intended atria, canopy volumes and structural rhythm; review several real circulation alternatives only if required by the brief.',
   automaticReject:false});
 return {schema:SCHEMA,status:entries.length?
  'EXISTING_MASS_AND_AIR_REVIEW_REGIONS_ONLY':
  'NO_VALID_NEAREST_PAIR_REGION_TO_RENDER',
  originalRawSha256:expectedRawSha256,
  geometrySha256:expectedGeometrySha256,
  r71RecomputedAndAuthenticated:true,
  modelDeclaredDesignIntentNotTrusted:true,
  massAndVoidRoleNotSemanticallyClassified:true,
  metrics:m,possibleConcerns:concerns,
  automatedStairsBridgesOrTunnelsSuggested:false,
  realMinecraftWalkabilityProven:false,
  independentArchitecturalQuality:'NOT_REVIEWED',
  creativeDesignRestrictionsImposed:false,
  modelCalls:0,worldWrites:0,safety:safe()};
}
// Render *actual* final-voxel orthographic slices around each witness pair.
// SVG rectangles are derived from occupancy only, not generated imagery.
function sliceSVG(data,axes,fixed,site,pad=5){
 const A=site.reachedFootVoxel,B=site.unreachedFootVoxel,
  dims=[data.w,data.h,data.d];
 const [u,v]=axes,other=[0,1,2].find(n=>n!==u&&n!==v);
 const loU=Math.max(0,Math.min(A[u],B[u])-pad),
  hiU=Math.min(dims[u]-1,Math.max(A[u],B[u])+pad);
 const loV=Math.max(0,Math.min(A[v],B[v])-pad),
  hiV=Math.min(dims[v]-1,Math.max(A[v],B[v])+pad);
 const cell=12,pixelWidth=(hiU-loU+1)*cell,
  pixelHeight=(hiV-loV+1)*cell;
 const parts=[];
 for(let vi=loV;vi<=hiV;vi++)for(let ui=loU;ui<=hiU;ui++){
  const p=[0,0,0];p[u]=ui;p[v]=vi;p[other]=fixed;
  const i=data.at(...p),blocked=data.solid[i]===1;
  const footClear=p[1]>=1&&p[1]+1<data.h&&!blocked&&
   !data.solid[i+data.w*data.d]&&data.solid[i-data.w*data.d];
  const x=(ui-loU)*cell,
   y=(v===1?hiV-vi:vi-loV)*cell;
  parts.push('<rect x="'+x+'" y="'+y+'" width="'+cell+
   '" height="'+cell+'" fill="'+(blocked?'#344c64':
   footClear?'#bfdfcb':'#f3f5f8')+
   '" stroke="#dce1e5" stroke-width=".4"/>');
 }
 for(const [pt,color,tag] of [[A,'#087ba6','A'],[B,'#ce512e','B']]){
  if(pt[other]!==fixed||pt[u]<loU||pt[u]>hiU||pt[v]<loV||pt[v]>hiV)
   continue;
  const x=(pt[u]-loU+.5)*cell,y=(v===1?
   hiV-pt[v]+.5:pt[v]-loV+.5)*cell;
  parts.push('<circle cx="'+x+'" cy="'+y+'" r="4.8" fill="'+color+
   '" stroke="#fff" stroke-width="1.2"/><text x="'+
   (x+6)+'" y="'+(y-3)+
   '" font-size="10" font-weight="bold" fill="'+color+'">'+tag+'</text>');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Exact final concept voxel section" viewBox="0 0 '+
  pixelWidth+' '+pixelHeight+'" width="'+pixelWidth+'" height="'+pixelHeight+
  '" style="max-width:100%;height:auto;border:1px solid #c7d6e3">'+
  parts.join('')+'</svg>';
}
export function writeR72MassVoidGapContext({raw,expectedRawSha256,
 expectedGeometrySha256,r70Evidence,r71Evidence,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_ORDINARY_REVIEW_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R72_MASS_VOID_GAP_CONTEXT.json'),
  html=path.join(destination,'R72_ARCHITECTURE_PRESERVATION_SECTIONS.html');
 if(fs.existsSync(json)||fs.existsSync(html))
  fail('REFUSE_OVERWRITING_PREVIOUS_EVIDENCE');
 const report=assessR72MassVoidGapContext({
  raw,expectedRawSha256,expectedGeometrySha256,r70Evidence,r71Evidence});
 const data=sourceData(raw,expectedGeometrySha256);
 const cards=report.metrics.sites.slice(0,3).map(s=>{
  const a=s.reachedFootVoxel,b=s.unreachedFootVoxel;
  const plans=[a[1],b[1]].filter((y,i,all)=>all.indexOf(y)===i)
   .map(y=>'<div><h4>平面　足元 y='+y+'</h4>'+
    sliceSVG(data,[0,2],y,s)+'</div>').join('');
  const sections='<div><h4>X–Y 断面　z='+a[2]+'</h4>'+
   sliceSVG(data,[0,1],a[2],s)+'</div>'+
   '<div><h4>Z–Y 断面　x='+b[0]+'</h4>'+
   sliceSVG(data,[2,1],b[0],s)+'</div>';
  return '<section><h2>分断領域 #'+s.componentRank+
   ' （上層支持床 '+s.upperSupportPositions+'）</h2>'+
   '<p>A='+esc(JSON.stringify(a))+
   ' / B='+esc(JSON.stringify(b))+
   ' / 格子上の下限距離='+s.exactNearestPairDistance+'</p>'+
   '<p>2点を含む最小の直方体：固体 '+s.boxSolidVoxelCount+
   '、空気 '+s.boxAirVoxelCount+
   '、高さ4セル以上の連続空気列 '+s.localColumnsWithAtLeast4ContinuousAirCells+
   '。この直方体が工事範囲を意味するわけではありません。</p>'+
   '<div class="views">'+plans+sections+'</div></section>';
 }).join('');
 const warnings=report.possibleConcerns.map(c=>
  '<li><b>'+esc(c.kind)+'</b> '+esc(c.instructions)+'</li>').join('');
 const doc='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R72 建築を守るための断面比較</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1120px;margin:25px auto;padding:0 16px;color:#263a4f}.warn{background:#fff3df;padding:14px}.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px}section{border-top:2px solid #ccd7df;padding:14px 0}h4{margin:4px 0}li{margin:8px 0}</style></head><body>'+
  '<h1>R72 動線改善の前に守るべき建築を確認</h1>'+
  '<p class="warn">これは原本のB143最終ボクセルを断面表示したものです。青Aが暫定到達床、赤Bが孤立床、紺が固体、薄緑が支持床上の候補位置、白がその他の空間。最近傍点を結ぶ経路を施工することは提案・承認していません。空気がすべて保護対象という判定もしていません。Minecraft実機と人間の美術審査は別途必要です。</p>'+
  '<p>原本SHA '+esc(report.originalRawSha256)+'</p>'+
  '<p>対象孤立領域 '+report.metrics.reviewedTopDisconnectedComponents+
  ' / 高さ4セル以上の空気を含む確認直方体 '+
  report.metrics.sitesWith4HighAirInsideBox+'</p>'+
  (cards||'<p>表示可能な2点ペアがありません。HOLDまたは分断なしのため、仮の建築経路を描画しません。</p>')+
  '<h2>審査事項</h2><ul>'+warnings+
  '</ul><p>NOT_PREPARED、9ゲートBLOCKED、モデル推論0、Minecraft世界操作0</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,doc,{flag:'wx'});
 return {status:report.status,relativeFile:path.basename(html),
  reviewedComponents:report.metrics.reviewedTopDisconnectedComponents,
  modelCalls:0,worldWrites:0};
}
