/**
 * R68: independently examine entire two-cell-clear AIR connectivity per level.
 * Unlike R67 proximity rays, horizontal air topology distinguishes wall
 * pockets from open canopies and isolated columns. Doorways joining exterior
 * make valid rooms boundary-connected; thus NO ROOM/PASS decisions are made.
 * No reliance on original model spatialPlan, claimed rooms or thresholds.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198zr68-horizontal-air-continuity-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=x=>{throw Error('B198ZR68_'+x)};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});

export function inspectR68AirContinuity({raw,expectedRawSha256,
 expectedGeometrySha256}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  hash(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('ORIGINAL_AND_FINAL_GEOMETRY_SHA_REQUIRED');
 let design,compiled;
 try{design=JSON.parse(raw).design;compiled=compileDesign(design);}
 catch{fail('B143_FINAL_GEOMETRY_REQUIRED');}
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256!==expectedGeometrySha256)
  fail('FINAL_GEOMETRY_SHA_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds;
 const plane=w*d,total=plane*h;
 const idx=(x,y,z)=>(y*d+z)*w+x;
 const occ=new Uint8Array(total),roof=new Uint8Array(total);
 const standing=new Uint8Array(total),label=new Int32Array(total);
 for(const [x,y,z] of compiled.primitives)occ[idx(x,y,z)]=1;
 // R64/R66 shared geometric meaning: one solid support below, two air
 // cells (feet+head); overhead may be arbitrarily high in the same XZ.
 let standingCount=0,roofedCount=0;
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  let nearestAbove=-1;
  for(let y=h-1;y>=1;y--){
   const i=idx(x,y,z);
   if(y+1<h&&occ[i-plane]&&!occ[i]&&!occ[i+plane]){
    standing[i]=1;
    standingCount++;
    if(nearestAbove>=y+2){roof[i]=1;roofedCount++;}
   }
   if(occ[i])nearestAbove=y;
  }
 }
 // Walkable support is NOT required while grouping AIR. Otherwise a flat
 // canopy with a narrow platform would falsely appear laterally enclosed
 // merely because there are no floors outside the platform.
 const components=[];
 const q=new Int32Array(plane);
 const clear=i=>!occ[i]&&!occ[i+plane];
 for(let y=1;y+1<h;y++){
  for(let z=0;z<d;z++)for(let x=0;x<w;x++){
   const root=idx(x,y,z);
   if(!clear(root)||label[root])continue;
   const id=components.length+1;
   const c={feetY:y,airPositionCount:0,
    supportedStandingPositions:0,roofedStandingPositions:0,
    solidFacingNeighborEdges:0,lateralGridBoundaryEdges:0,
    laterallyReachesDesignBoundary:false,
    fullyRoofed2x2SupportedPads:0};
   let head=0,tail=1;
   q[0]=root;label[root]=id;
   while(head<tail){
    const i=q[head++],cx=i%w,cz=Math.floor(i/w)%d;
    c.airPositionCount++;
    if(standing[i]){
     c.supportedStandingPositions++;
     if(roof[i])c.roofedStandingPositions++;
    }
    // Four connected directions at the same feet Y with two clear voxels.
    for(const [nx,nz] of [[cx-1,cz],[cx+1,cz],[cx,cz-1],[cx,cz+1]]){
     if(nx<0||nx>=w||nz<0||nz>=d){
      c.lateralGridBoundaryEdges++;
      c.laterallyReachesDesignBoundary=true;
      continue;
     }
     const n=idx(nx,y,nz);
     if(!clear(n)){c.solidFacingNeighborEdges++;continue;}
     if(!label[n]){
      label[n]=id;
      q[tail++]=n;
     }
    }
   }
   components.push(c);
  }
 }
 let allPads=0;
 for(let y=1;y+1<h;y++)for(let z=0;z+1<d;z++)
  for(let x=0;x+1<w;x++){
   const i=idx(x,y,z),a=[i,i+1,i+w,i+w+1];
   if(!a.every(n=>standing[n]&&roof[n]))continue;
   const id=label[i];
   if(!id||!a.every(n=>label[n]===id))
    fail('FOUR_CELL_PAD_COMPONENT_INTEGRITY');
   components[id-1].fullyRoofed2x2SupportedPads++;
   allPads++;
  }
 const withStanding=components.filter(c=>c.supportedStandingPositions>0);
 const withRoofed=components.filter(c=>c.roofedStandingPositions>0);
 const sealed=withRoofed.filter(c=>!c.laterallyReachesDesignBoundary);
 const boundaryConnected=withRoofed.filter(c=>c.laterallyReachesDesignBoundary);
 const sum=(arr,k)=>arr.reduce((n,c)=>n+c[k],0);
 if(sum(withStanding,'supportedStandingPositions')!==standingCount||
  sum(withRoofed,'roofedStandingPositions')!==roofedCount||
  sum(components,'fullyRoofed2x2SupportedPads')!==allPads)
  fail('EXHAUSTIVE_RECOMPUTATION_FAILED');
 const ordered=withRoofed.sort((a,b)=>
  b.roofedStandingPositions-a.roofedStandingPositions||
  a.feetY-b.feetY).slice(0,16);
 const m={dimensions:[w,h,d],
  supportedTwoHighStandingPositions:standingCount,
  positionsWithAnyOverheadVoxel:roofedCount,
  airComponentsAcrossAllFeetHeights:components.length,
  airComponentsContainingSupportedStanding:withStanding.length,
  airComponentsContainingRoofedStanding:withRoofed.length,
  roofedStandingInLaterallyBoundaryConnectedAir:
   sum(boundaryConnected,'roofedStandingPositions'),
  roofedStandingInLaterallySealedAirPockets:
   sum(sealed,'roofedStandingPositions'),
  boundaryConnectedRoofedComponents:boundaryConnected.length,
  laterallySealedRoofedComponents:sealed.length,
  roofed2x2SupportedPads:allPads,
  largestRoofedAirComponentPositions:
   withRoofed[0]?.roofedStandingPositions??0,
  largestRoofedAirComponentShare:roofedCount?
   (withRoofed[0]?.roofedStandingPositions??0)/roofedCount:null,
  topRoofedAirComponents:ordered};
 const concerns=[];
 if(roofedCount>0&&sealed.length>0)
  concerns.push({kind:'LATERALLY_SEALED_AIR_POCKETS_NEED_ACCESS_REVIEW',
   measured:{pockets:sealed.length,
    roofedStandingPositions:sum(sealed,'roofedStandingPositions')},
   note:'Some roof-covered, floor-supported air pockets have no same-level two-high exit to the design boundary. Check doors, stair entries and vertical transfers. Their true accessibility is NOT established or disproved.',
   automaticReject:false});
 if(roofedCount>0&&boundaryConnected.length>0)
  concerns.push({kind:'ROOFED_SPACES_WITH_LATERAL_OPENINGS_NEED_ROOM_REVIEW',
   measured:{boundaryConnectedRegions:boundaryConnected.length,
    roofedStandingPositions:sum(boundaryConnected,'roofedStandingPositions')},
   note:'Some roof-covered air connects to the design boundary in this 2D abstraction. This includes useful rooms with doors, huge halls and canopies; judge wall continuity and architectural purpose visually.',
   automaticReject:false});
 if(roofedCount>0&&allPads===0)
  concerns.push({kind:'NO_CONNECTED_2X2_ROOFED_SUPPORT_PATCH',
   measured:{roofedStandingPositions:roofedCount},
   note:'There is no 2x2 patch of roof-covered supported two-high air at the same level. Re-examine functional floor breadth, but keep intentional narrow circulation and experimental forms.',
   automaticReject:false});
 return {schema:SCHEMA,status:'HORIZONTAL_TWO_HIGH_AIR_TOPOLOGY_FOR_HUMAN_REVIEW',
  originalRawSha256:expectedRawSha256,geometrySha256:expectedGeometrySha256,
  metrics:m,possibleConcerns:concerns,
  originalSpatialPlanRead:false,modelDeclaredRoomsUsed:false,
  groupingRequiresSupportingFloor:false,
  lateralGridBoundaryIsNotActualExterior:true,
  aDoorMayConnectIndoorRoomToBoundary:true,
  enclosedAirMayHaveNoValidEntrance:true,
  verticalAirConnectivityNotAnalyzed:true,
  doorCollisionAndAccessibleUseNotProven:true,
  beautyOrOriginalityNotScored:true,independentHumanReview:'NOT_REVIEWED',
  finalGeometryNotMinecraftWorld:true,modelCalls:0,worldWrites:0,
  safety:safe()};
}
export function writeR68AirContinuity({raw,expectedRawSha256,
 expectedGeometrySha256,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('ORDINARY_OUTPUT_DIR_REQUIRED');
 const j=path.join(destination,'R68_HORIZONTAL_AIR_TOPOLOGY.json'),
  h=path.join(destination,'R68_HUMAN_AIR_CONTINUITY_REVIEW.html');
 if(fs.existsSync(j)||fs.existsSync(h))fail('NO_OUTPUT_OVERWRITE');
 const r=inspectR68AirContinuity({raw,expectedRawSha256,expectedGeometrySha256});
 const m=r.metrics;
 const componentRows=m.topRoofedAirComponents.map(c=>
  '<tr><td>'+c.feetY+'</td><td>'+c.airPositionCount+
  '</td><td>'+c.supportedStandingPositions+'</td><td>'+
  c.roofedStandingPositions+'</td><td>'+
  (c.laterallyReachesDesignBoundary?'接続':'接続なし')+
  '</td><td>'+c.solidFacingNeighborEdges+'</td><td>'+
  c.fullyRoofed2x2SupportedPads+'</td></tr>').join('');
 const warnings=r.possibleConcerns.map(c=>
  '<li><b>'+escape(c.kind)+'</b>：'+escape(c.note)+'</li>').join('');
 const html='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R68 水平空気のつながり</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:980px;margin:28px auto;padding:0 20px;color:#263b4e}table{border-collapse:collapse}th,td{padding:7px 10px;border:1px solid #c6d4e0}.warn{padding:12px;background:#fff3df}li{margin:12px 0}</style></head><body>'+
  '<h1>R68 最終概念ボクセルの空間連続性</h1>'+
  '<p class="warn">床が途切れても空気はつながり得ます。2セル高の空気を水平にまとめ、屋根下の位置を検査しました。部屋の開口部・3D上下動線・実Minecraftの歩行・美術品質は未証明です。</p>'+
  '<p>原本SHA '+escape(r.originalRawSha256)+'</p>'+
  '<p>頭上に固体のある立ち位置：'+m.positionsWithAnyOverheadVoxel+
  '、設計領域端へ水平につながる候補：'+
  m.roofedStandingInLaterallyBoundaryConnectedAir+
  '、同じ高さで閉じた空気成分：'+m.laterallySealedRoofedComponents+
  '、屋根下2×2の床パッド：'+m.roofed2x2SupportedPads+'</p>'+
  '<h2>屋根下の主要空気成分（大きい順）</h2>'+
  '<table><tr><th>足元Y</th><th>空気セル</th><th>支持床あり</th><th>屋根下</th><th>領域端</th><th>周辺固体への隣接面</th><th>2×2床</th></tr>'+
  componentRows+'</table><h2>人間が確認したい点</h2><ul>'+
  (warnings||'<li>この抽象検査では警告なし。建築品質が合格したわけではありません。</li>')+
  '</ul><p>この検査は新しい設計を生成せず、NOT_PREPARED・施工9ゲートBLOCKED・推論0・Minecraft操作0を維持します。</p></body></html>';
 fs.writeFileSync(j,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {status:r.status,relativeFile:path.basename(h),
  coveredStanding:m.positionsWithAnyOverheadVoxel,
  modelCalls:0,worldWrites:0};
}
