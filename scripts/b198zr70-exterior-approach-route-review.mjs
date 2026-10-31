/**
 * R70 — provisional, source-independent LOW-LEVEL EXTERIOR AIR APPROACH
 * to supported final-voxel floors. This is an optimistic design review,
 * NOT a certified entrance, route, floor-level ground truth or Minecraft walk.
 * No model-declared entrance, destinations, spatialPlan or program metrics.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198zr70-exterior-approach-route-review-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR70_'+s)};
const htmlEscape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});

/**
 * An approach candidate has support beneath two free cells and a clear
 * same-height, straight cardinal AIR ray to a LOCAL DESIGN GRID boundary.
 * Only minFeetY or minFeetY+1 may be seeds. This is NOT an exterior route:
 * the ray may pass over unsupported empty ground, a window opening may look
 * like a door and the world/street elevation is unknown.
 */
export function assessR70ProvisionalEntranceRoutes({
 raw,expectedRawSha256,expectedGeometrySha256
}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  hash(raw)!==expectedRawSha256||
  !/^[a-f0-9]{64}$/.test(expectedGeometrySha256??''))
  fail('IMMUTABLE_SOURCE_AND_GEOMETRY_SHA_REQUIRED');
 let design,compiled;
 try{design=JSON.parse(raw).design;compiled=compileDesign(design);}
 catch{fail('STRICT_B143_COMPILED_FINAL_VOXELS_REQUIRED');}
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256!==expectedGeometrySha256)
  fail('STRICT_GEOMETRY_SHA_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds,plane=w*d,total=plane*h;
 const idx=(x,y,z)=>(y*d+z)*w+x;
 const solid=new Uint8Array(total),stand=new Uint8Array(total);
 for(const [x,y,z] of compiled.primitives)solid[idx(x,y,z)]=1;
 let minFeetY=h,standCount=0;
 const countByY=new Int32Array(h);
 for(let y=1;y+1<h;y++)for(let z=0;z<d;z++)
  for(let x=0;x<w;x++){
   const i=idx(x,y,z);
   if(solid[i-plane]&&!solid[i]&&!solid[i+plane]){
    stand[i]=1;countByY[y]++;standCount++;
    minFeetY=Math.min(minFeetY,y);
   }
  }
 // Candidate entrance-air exposure: straight, full 2-high free X/Z ray
 // from any side to supported low-level air, without model-supplied points.
 const visible=new Uint8Array(total);
 if(standCount>0){
  for(let y=minFeetY;y<=Math.min(minFeetY+1,h-2);y++){
   for(let z=0;z<d;z++){
    let clear=true;
    for(let x=0;x<w;x++){
     const i=idx(x,y,z);
     clear=clear&&!solid[i]&&!solid[i+plane];
     if(clear&&stand[i])visible[i]|=1;
    }
    clear=true;
    for(let x=w-1;x>=0;x--){
     const i=idx(x,y,z);
     clear=clear&&!solid[i]&&!solid[i+plane];
     if(clear&&stand[i])visible[i]|=2;
    }
   }
   for(let x=0;x<w;x++){
    let clear=true;
    for(let z=0;z<d;z++){
     const i=idx(x,y,z);
     clear=clear&&!solid[i]&&!solid[i+plane];
     if(clear&&stand[i])visible[i]|=4;
    }
    clear=true;
    for(let z=d-1;z>=0;z--){
     const i=idx(x,y,z);
     clear=clear&&!solid[i]&&!solid[i+plane];
     if(clear&&stand[i])visible[i]|=8;
    }
   }
  }
 }
 const distances=new Int32Array(total).fill(-1);
 const queue=new Int32Array(standCount);
 let queued=0,candidates=0;
 const seeds=[];
 for(let y=1;y+1<h;y++)for(let z=0;z<d;z++)
  for(let x=0;x<w;x++){
   const i=idx(x,y,z);
   if(!visible[i]||!stand[i])continue;
   candidates++;
   distances[i]=0;queue[queued++]=i;
   if(seeds.length<12)seeds.push({local:[x,y,z],
    clearAirBoundaryDirections:visible[i]});
  }
 let front=0,crossLevelEdges=0;
 while(front<queued){
  const at=queue[front++],y=Math.floor(at/plane),
   z=Math.floor(at/w)%d,x=at%w;
  for(const [nx,nz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){
   if(nx<0||nx>=w||nz<0||nz>=d)continue;
   for(const dy of [0,1,-1]){
    const ny=y+dy;
    if(ny<1||ny+1>=h)continue;
    const dest=idx(nx,ny,nz);
    if(!stand[dest])continue;
    // Existing R3/R64 extra clearance for stepped conceptual motion.
    if(dy===1&&(y+2>=h||solid[idx(x,y+2,z)]))continue;
    if(dy===-1&&solid[idx(nx,ny+2,nz)])continue;
    if(distances[dest]!==-1)continue;
    distances[dest]=distances[at]+1;
    if(dy!==0)crossLevelEdges++;
    queue[queued++]=dest;
   }
  }
 }
 if(queued>standCount||(!candidates&&queued))
  fail('REACHABILITY_QUEUE_INTEGRITY');
 const threshold=standCount?minFeetY+3:null;
 let upperCount=0,upperReached=0,reachedMaxY=null,reachedFarSteps=0;
 const rows=[];
 for(let y=1;y+1<h;y++){
  if(!countByY[y])continue;
  let reached=0,seedAtY=0;
  for(let z=0;z<d;z++)for(let x=0;x<w;x++){
   const i=idx(x,y,z);
   if(visible[i]&&stand[i])seedAtY++;
   if(distances[i]===-1)continue;
   reached++;
   reachedMaxY=Math.max(reachedMaxY??y,y);
   reachedFarSteps=Math.max(reachedFarSteps,distances[i]);
  }
  if(threshold!==null&&y>=threshold){
   upperCount+=countByY[y];upperReached+=reached;
  }
  rows.push({feetY:y,supportedPositions:countByY[y],
   provisionallyReachedPositions:candidates?reached:null,
   inferredApproachCandidates:seedAtY});
 }
 const status=!standCount?'HOLD_NO_SUPPORTED_TWO_HIGH_POSITIONS':
  candidates===0?'HOLD_NO_INFERABLE_LOW_LEVEL_AIR_APPROACH':
  'PROVISIONAL_LOW_LEVEL_APPROACH_ROUTE_FACTS_ONLY';
 const m={bounds:[w,h,d],
  supportedTwoHighStandingPositions:standCount,
  lowestSupportedFeetY:standCount?minFeetY:null,
  candidateLowestFeetBand:standCount?[minFeetY,Math.min(minFeetY+1,h-2)]:null,
  lowLevelClearAirRayApproachCandidates:candidates,
  exampleCandidateCoordinates:seeds,
  provisionallyReachedSupportedPositions:candidates?queued:null,
  provisionallyUnreachedSupportedPositions:candidates?standCount-queued:null,
  provisionallyReachedHighestFeetY:candidates?reachedMaxY:null,
  maximumAbstractStepsFromAnySeed:candidates?reachedFarSteps:null,
  upperLevelDefinitionFeetYAtOrAbove:threshold,
  upperLevelSupportedPositions:upperCount,
  provisionallyReachedUpperPositions:candidates?upperReached:null,
  upperReachShare:candidates&&upperCount?upperReached/upperCount:null,
  reachedRisingMotionTreeEdges:candidates?crossLevelEdges:null,
  positionsByFeetY:rows};
 const concerns=[];
 if(!candidates)
  concerns.push({kind:standCount?
   'NO_LOW_LEVEL_EXTERIOR_AIR_RAY_SEEDS':
   'NO_SUPPORTED_STANDING_AIR_ANYWHERE',
   humanDecisionRequired:true,automaticReject:false,
   guidance:'Do not infer failed access or a real exterior location. The local design boundary, ground elevation and actual doors are unknown; inspect the designed entrance manually.'});
 else if(upperCount>0&&upperReached===0)
  concerns.push({kind:'LOW_LEVEL_CANDIDATES_DO_NOT_REACH_ANY_UPPER_SUPPORT',
   measured:{provisionallyReachable:0,totalUpper:upperCount},
   humanDecisionRequired:true,automaticReject:false,
   guidance:'None of the higher supported positions is linked to the inferred low-level candidates by the abstract step graph. Check real program entrances, supported stairs and upper-floor landings without shrinking the architectural landmark.'});
 else if(upperCount>0&&upperReached<upperCount)
  concerns.push({kind:'SOME_UPPER_SUPPORT_DISCONNECTED_FROM_APPROACH_CANDIDATES',
   measured:{provisionallyReachable:upperReached,totalUpper:upperCount},
   humanDecisionRequired:true,automaticReject:false,
   guidance:'Some higher-level supported positions lack an abstract path from any low-level air approach seed. Intentional separate terraces and wings must be reviewed, not automatically bridged.'});
 return {schema:SCHEMA,status,originalRawSha256:expectedRawSha256,
  geometrySha256:expectedGeometrySha256,metrics:m,
  possibleConcerns:concerns,
  sourceSpatialPlanAndModelEntranceIgnored:true,
  inferredSeedsAreNotRealBuildingEntrances:true,
  clearAirRayDoesNotProveSupportedOutsideApproach:true,
  lowestLocalFeetHeightNotStreetElevation:true,
  higherFloorsNotRecognizedAsSpecificProgramDestinations:true,
  realPlayerWalkingAndDoorCollisionNotTested:true,
  unsupportedDesignAutoRejection:false,
  noHumanArchitecturalOrAestheticPass:true,
  independentHumanReview:'NOT_REVIEWED',
  modelCalls:0,worldWrites:0,safety:safety()};
}
export function writeR70ProvisionalEntranceRoutes({raw,expectedRawSha256,
 expectedGeometrySha256,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_NORMAL_OUTPUT_DIR_REQUIRED');
 const j=path.join(destination,'R70_APPROACH_ROUTE_EVIDENCE.json');
 const h=path.join(destination,'R70_APPROACH_TO_UPPER_LEVELS_REVIEW.html');
 if(fs.existsSync(j)||fs.existsSync(h))fail('NO_OUTPUT_OVERWRITE');
 const report=assessR70ProvisionalEntranceRoutes({
  raw,expectedRawSha256,expectedGeometrySha256});
 const m=report.metrics,rows=m.positionsByFeetY.map(x=>
  '<tr><td>'+x.feetY+'</td><td>'+x.supportedPositions+
  '</td><td>'+(x.provisionallyReachedPositions??'未判定')+
  '</td><td>'+x.inferredApproachCandidates+'</td></tr>').join('');
 const concerns=report.possibleConcerns.map(x=>'<li><b>'+
  htmlEscape(x.kind)+'</b> '+htmlEscape(x.guidance)+'</li>').join('');
 const html='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R70 外から上階への仮想導線</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:960px;margin:28px auto;padding:0 20px;color:#27384a}table{border-collapse:collapse}th,td{border:1px solid #cdd8e0;padding:8px}.warn{background:#fff0db;padding:12px}</style></head><body>'+
  '<h1>R70 自己申告に頼らない外側候補→上層床の抽象経路</h1>'+
  '<p class="warn">最も低い支持床付近から設計グリッド境界へ2セルの空気がまっすぐ開く場所を候補にします。現実の入口・屋外歩行路・道路高・展望ラウンジは未証明です。候補が0でも『入口がない』とは断言できません。</p>'+
  '<p>原本SHA '+htmlEscape(report.originalRawSha256)+
  '</p><p>判定 '+report.status+' / 入口に見える候補 '+
  m.lowLevelClearAirRayApproachCandidates+' / 仮到達の支持床位置 '+
  (m.provisionallyReachedSupportedPositions??'未判定')+
  ' / 高層候補到達 '+(m.provisionallyReachedUpperPositions??'未判定')+
  ' / 高層候補合計 '+m.upperLevelSupportedPositions+'</p>'+
  '<table><tr><th>足元Y</th><th>支持床位置</th><th>仮到達</th><th>アプローチ候補</th></tr>'+
  rows+'</table><h2>目視確認</h2><ul>'+
  (concerns||'<li>この代理指標では懸念なし。品質合格ではありません。</li>')+
  '</ul><p>NOT_PREPARED / 9 BLOCKED / 推論0 / Minecraft世界操作0</p></body></html>';
 fs.writeFileSync(j,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {status:report.status,relativeFile:path.basename(h),modelCalls:0,worldWrites:0};
}
