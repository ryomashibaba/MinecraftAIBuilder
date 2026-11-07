/**
 * R71 — inspect disconnected supported-motion components from R70's
 * provisional exterior-air approach seeds. Nearest geometry pairs are
 * triage coordinates ONLY, not build operations, safe bridge designs,
 * missing staircase proofs, or real Minecraft pathfinding.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {assessR70ProvisionalEntranceRoutes,SCHEMA as R70_SCHEMA}
 from './b198zr70-exterior-approach-route-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr71-abstract-route-gap-triage-v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR71_'+s)};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
export function inspectR71AbstractRouteGaps({
 raw,expectedRawSha256,expectedGeometrySha256,r70Evidence
}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  sha(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('IMMUTABLE_SOURCE_AND_GEOMETRY_SHA_REQUIRED');
 const verifiedR70=assessR70ProvisionalEntranceRoutes({
  raw,expectedRawSha256,expectedGeometrySha256});
 if(!r70Evidence||r70Evidence.schema!==R70_SCHEMA||
  r70Evidence.originalRawSha256!==expectedRawSha256||
  r70Evidence.geometrySha256!==expectedGeometrySha256||
  JSON.stringify(r70Evidence.metrics)!==
   JSON.stringify(verifiedR70.metrics)||
  JSON.stringify(r70Evidence.possibleConcerns)!==
   JSON.stringify(verifiedR70.possibleConcerns)||
  r70Evidence.status!==verifiedR70.status)
  fail('R70_AUTHENTICATED_EVIDENCE_REQUIRED');
 let design,compiled;
 try{design=JSON.parse(raw).design;compiled=compileDesign(design);}
 catch{fail('STRICT_B143_FINAL_VOXELS_REQUIRED');}
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256!==expectedGeometrySha256)
  fail('VERIFIED_B143_GEOMETRY_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds,plane=w*d,total=plane*h;
 const idx=(x,y,z)=>(y*d+z)*w+x;
 const coords=i=>[i%w,Math.floor(i/plane),Math.floor(i/w)%d];
 const solids=new Uint8Array(total),stand=new Uint8Array(total);
 for(const [x,y,z] of compiled.primitives)solids[idx(x,y,z)]=1;
 let minY=h,supportedCount=0;
 for(let y=1;y+1<h;y++)for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  const i=idx(x,y,z);
  if(solids[i-plane]&&!solids[i]&&!solids[i+plane]){
   stand[i]=1;supportedCount++;minY=Math.min(minY,y);
  }
 }
 const v=new Uint8Array(total);
 if(supportedCount>0){
  for(let y=minY;y<=Math.min(minY+1,h-2);y++){
   for(let z=0;z<d;z++){
    let clear=true;
    for(let x=0;x<w;x++){
     const i=idx(x,y,z);
     clear=clear&&!solids[i]&&!solids[i+plane];
     if(clear&&stand[i])v[i]|=1;
    }
    clear=true;
    for(let x=w-1;x>=0;x--){
     const i=idx(x,y,z);
     clear=clear&&!solids[i]&&!solids[i+plane];
     if(clear&&stand[i])v[i]|=2;
    }
   }
   for(let x=0;x<w;x++){
    let clear=true;
    for(let z=0;z<d;z++){
     const i=idx(x,y,z);
     clear=clear&&!solids[i]&&!solids[i+plane];
     if(clear&&stand[i])v[i]|=4;
    }
    clear=true;
    for(let z=d-1;z>=0;z--){
     const i=idx(x,y,z);
     clear=clear&&!solids[i]&&!solids[i+plane];
     if(clear&&stand[i])v[i]|=8;
    }
   }
  }
 }
 const canStep=(from,toY,nx,nz)=>{
  if(toY<1||toY+1>=h)return -1;
  const fromY=Math.floor(from/plane),x=from%w,z=Math.floor(from/w)%d;
  const dest=idx(nx,toY,nz),dy=toY-fromY;
  if(!stand[dest])return -1;
  if(dy===1&&(fromY+2>=h||solids[idx(x,fromY+2,z)]))return -1;
  if(dy===-1&&solids[idx(nx,toY+2,nz)])return -1;
  return dest;
 };
 const walkNeighbors=(i,cb)=>{
  const y=Math.floor(i/plane),x=i%w,z=Math.floor(i/w)%d;
  for(const [nx,nz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){
   if(nx<0||nx>=w||nz<0||nz>=d)continue;
   for(const dy of [0,1,-1]){
    const n=canStep(i,y+dy,nx,nz);
    if(n!==-1)cb(n);
   }
  }
 };
 const reached=new Uint8Array(total),queue=new Int32Array(supportedCount);
 let front=0,back=0,seedCount=0;
 for(let i=0;i<total;i++)
  if(v[i]&&stand[i]){reached[i]=1;queue[back++]=i;seedCount++;}
 while(front<back){
  const i=queue[front++];
  walkNeighbors(i,n=>{
   if(!reached[n]){reached[n]=1;queue[back++]=n;}
  });
 }
 const m70=verifiedR70.metrics;
 if(seedCount!==m70.lowLevelClearAirRayApproachCandidates||
  supportedCount!==m70.supportedTwoHighStandingPositions||
  (seedCount>0&&back!==m70.provisionallyReachedSupportedPositions)||
  (seedCount===0&&m70.provisionallyReachedSupportedPositions!==null))
  fail('R70_REACHABILITY_INTEGRITY_MISMATCH');
 // Optimistic geometry-only lower bound: nearest reached stand cell by
 // taxicab distance THROUGH solids and unsupported air. Deliberately NOT
 // a traversable route or missing-element construction instruction.
 const gridDistance=new Int32Array(total).fill(-1);
 const anchor=new Int32Array(total).fill(-1);
 if(back>0){
  const gridQueue=new Int32Array(total);
  let qf=0,qb=0;
  for(let i=0;i<total;i++)if(reached[i]){
   gridDistance[i]=0;anchor[i]=i;gridQueue[qb++]=i;
  }
  const visit=(at,n)=>{
   if(gridDistance[n]!==-1)return;
   gridDistance[n]=gridDistance[at]+1;anchor[n]=anchor[at];
   gridQueue[qb++]=n;
  };
  while(qf<qb){
   const i=gridQueue[qf++],x=i%w,y=Math.floor(i/plane),
    z=Math.floor(i/w)%d;
   if(x>0)visit(i,i-1);if(x+1<w)visit(i,i+1);
   if(z>0)visit(i,i-w);if(z+1<d)visit(i,i+w);
   if(y>0)visit(i,i-plane);if(y+1<h)visit(i,i+plane);
  }
  if(qb!==total)fail('FULL_GRID_DISTANCE_COVERAGE');
 }
 const labels=new Uint8Array(total);
 const components=[];
 let accounted=0;
 for(let root=0;root<total;root++){
  if(!stand[root]||reached[root]||labels[root])continue;
  let qf=0,qb=1;queue[0]=root;labels[root]=1;
  let minFeetY=h,maxFeetY=0,upper=0,bestDistance=null,
   bestA=null,bestB=null;
  while(qf<qb){
   const i=queue[qf++],y=Math.floor(i/plane);
   minFeetY=Math.min(minFeetY,y);maxFeetY=Math.max(maxFeetY,y);
   if(y>=minY+3)upper++;
   if(back>0&&gridDistance[i]>=0&&(
    bestDistance===null||gridDistance[i]<bestDistance)){
    bestDistance=gridDistance[i];bestA=coords(anchor[i]);
    bestB=coords(i);
   }
   walkNeighbors(i,n=>{
    if(!reached[n]&&!labels[n]){labels[n]=1;queue[qb++]=n;}
   });
  }
  accounted+=qb;
  // The two anchors are nearby in grid geometry only; don't infer
  // exactly which stair, wall, landing or roof should be edited.
  const dy=bestA===null?null:Math.abs(bestA[1]-bestB[1]);
  const flat=bestA===null?null:
   Math.abs(bestA[0]-bestB[0])+Math.abs(bestA[2]-bestB[2]);
  const label=bestDistance===null?'UNCLASSIFIED_NO_APPROACH':
   dy>=2?'HEIGHT_SEPARATION_TO_REVIEW':
   flat>=3?'HORIZONTAL_SEPARATION_TO_REVIEW':
   'NEARBY_UNJOINED_ABSTRACT_MOTION_TO_REVIEW';
  components.push({supportedPositions:qb,
   upperSupportPositions:upper,minFeetY,maxFeetY,
   closestReachedSupportedLocal:bestA,
   closestUnreachedSupportedLocal:bestB,
   optimisticManhattanCellDistance:bestDistance,
   verticalCellSeparation:dy,horizontalCellSeparation:flat,
   gapReviewCategory:label,
   bridgeGeometryProposed:false,collisionSafetyCertified:false});
 }
 if(accounted+(back||0)!==supportedCount)fail('COMPONENT_PARTITION_INTEGRITY');
 components.sort((a,b)=>b.upperSupportPositions-a.upperSupportPositions||
  b.supportedPositions-a.supportedPositions||
  a.minFeetY-b.minFeetY);
 let upperReached=0,upperCount=0;
 for(let i=0;i<total;i++){
  if(!stand[i])continue;
  if(Math.floor(i/plane)>=minY+3){
   upperCount++;if(reached[i])upperReached++;
  }
 }
 if(upperCount!==m70.upperLevelSupportedPositions||
  (seedCount>0&&upperReached!==m70.provisionallyReachedUpperPositions))
  fail('R70_UPPER_LAYER_INTEGRITY_MISMATCH');
 const metrics={bounds:[w,h,d],
  supportedTwoHighStandingPositions:supportedCount,
  originalR70ProvisionalApproachSeeds:seedCount,
  provisionallyReachedStandingPositions:seedCount?back:null,
  unreachableSupportedPositions:seedCount?supportedCount-back:null,
  unreachableSupportedMotionComponents:seedCount?components.length:null,
  unreachableUpperSupportedPositions:seedCount?upperCount-upperReached:null,
  upperSupportedPositions:upperCount,
  nearestPairGeometryOnlyNotBuildPath:true,
  topUnreachableComponents:seedCount?components.slice(0,16):[]};
 const status=!supportedCount?'HOLD_NO_SUPPORTED_STANDING_POSITIONS':
  !seedCount?'HOLD_NO_VERIFIED_ENTRY_PROXY_SEEDS':
  components.length?'HUMAN_REVIEW_DISCONNECTED_SUPPORTED_COMPONENTS':
  'NO_DISCONNECTED_SUPPORTED_COMPONENTS_FROM_PROVISIONAL_SEEDS';
 const concerns=[];
 if(seedCount===0)
  concerns.push({kind:'R71_NO_APPROACH_NO_GAP_PAIR_INFERENCE',
   measured:{supportedPositions:supportedCount},
   instructions:'No trustworthy provisional approach seed was inferred. Do not invent a gap location or assert real doors do not exist; locate the intended entrance with independent human review.',
   automaticReject:false});
 else if(components.length>0)
  concerns.push({kind:'R71_DISCONNECTED_SUPPORT_GAPS_TO_INSPECT',
   measured:{components:components.length,upperUnsupportedAccess:upperCount-upperReached},
   instructions:'Inspect the top disconnected supported regions and their nearest reached/unreached voxel coordinates in a 3D review. Their Manhattan separation passes through solid and air, so it is a geometry lower bound, never an excavate-or-build route. Preserve design and only plan genuine landing, stairs or bridge if humans confirm that access is required.',
   automaticReject:false});
 return {schema:SCHEMA,status,
  originalRawSha256:expectedRawSha256,geometrySha256:expectedGeometrySha256,
  r70EvidenceRecomputedAndAuthenticated:true,
  originalSpatialPlanNotConsulted:true,
  metrics,possibleConcerns:concerns,
  outsideOfLocalDesignGridUnknown:true,
  closestPointsDoNotRepresentWalkableRoute:true,
  noMissingStairOrWallDiagnosis:true,
  noAutomaticGeometryRepair:true,noHumanQualityCertification:true,
  realMinecraftMotionNotVerified:true,
  independentHumanReview:'NOT_REVIEWED',
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR71AbstractRouteGaps({
 raw,expectedRawSha256,expectedGeometrySha256,r70Evidence,destination
}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('ORDINARY_OUTPUT_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R71_ROUTE_GAPS_EVIDENCE.json'),
  html=path.join(destination,'R71_ROUTE_GAP_TRIAGE_REVIEW.html');
 if(fs.existsSync(json)||fs.existsSync(html))fail('NO_OVERWRITE');
 const r=inspectR71AbstractRouteGaps({raw,expectedRawSha256,
  expectedGeometrySha256,r70Evidence});
 const m=r.metrics;
 const rows=m.topUnreachableComponents.map((c,i)=>
  '<tr><td>'+(i+1)+'</td><td>'+c.supportedPositions+
  '</td><td>'+c.upperSupportPositions+'</td><td>'+
  c.minFeetY+'–'+c.maxFeetY+'</td><td>'+
  escape(JSON.stringify(c.closestReachedSupportedLocal))+' → '+
  escape(JSON.stringify(c.closestUnreachedSupportedLocal))+
  '</td><td>'+c.optimisticManhattanCellDistance+'</td><td>'+
  c.gapReviewCategory+'</td></tr>').join('');
 const notes=r.possibleConcerns.map(c=>'<li><b>'+
  escape(c.kind)+'</b> '+escape(c.instructions)+'</li>').join('');
 const markup='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R71 未到達支持床の位置関係</title>'+
  '<style>body{font:15px/1.6 system-ui;max-width:1024px;margin:28px auto;padding:0 20px;color:#273846}table{border-collapse:collapse}th,td{border:1px solid #d0dbe4;padding:7px}.warn{background:#fff2df;padding:12px}</style>'+
  '</head><body><h1>R71 支持床の分断候補と近接位置</h1>'+
  '<p class="warn">最短の2点間距離は固体・空中を貫通する純粋な格子距離です。ここに橋や階段を作れという指示ではありません。入口候補も実際の入口を保証しません。Minecraft実機の移動・当たり判定・入口の妥当性は未検証です。</p>'+
  '<p>原本SHA '+escape(r.originalRawSha256)+'</p>'+
  '<p>状態 '+r.status+' ／低層候補 '+m.originalR70ProvisionalApproachSeeds+
  ' ／未到達支持床 '+(m.unreachableSupportedPositions??'未判定')+
  ' ／未到達上層 '+(m.unreachableUpperSupportedPositions??'未判定')+
  ' ／連結していない成分 '+(m.unreachableSupportedMotionComponents??'未判定')+'</p>'+
  '<table><tr><th>成分</th><th>支持床</th><th>上層</th><th>足元y</th><th>最近傍候補 [x,y,z]</th><th>格子距離</th><th>検討種別</th></tr>'+
  rows+'</table><h2>人間が調べる課題</h2><ul>'+
  (notes||'<li>暫定入口群から到達不能な支持床成分はありません。ただし品質PASSではありません。</li>')+
  '</ul><p>NOT_PREPARED / 施工9ゲートBLOCKED / 実モデル0 / 世界操作0</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,markup,{flag:'wx'});
 return {status:r.status,relativeFile:path.basename(html),
  modelCalls:0,worldWrites:0};
}
