/**
 * R67: side-boundary proximity + overhead support, all from exact B143
 * final conceptual voxels; ignores self-declared destinations / spatialPlan.
 *
 * A covered 3-sided position is only a review proxy, NOT a room: columns,
 * shelves, partitions, bridges and exteriors can trigger the same geometry.
 * Neither a very large hall nor an open courtyard should be rejected by it.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198zr67-overhead-and-side-proximity-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=x=>{throw Error('B198ZR67_'+x)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
const NEAR=8,EXTENDED=24;
const bits=m=>(m&1)+((m>>1)&1)+((m>>2)&1)+((m>>3)&1);
export function assessR67SpatialContainment({raw,expectedRawSha256,
 expectedGeometrySha256}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  hash(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('ORIGINAL_AND_COMPILER_SHA_REQUIRED');
 let design,compiled;
 try{design=JSON.parse(raw).design;compiled=compileDesign(design);}
 catch{fail('STRICT_B143_FINAL_GEOMETRY_REQUIRED');}
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256!==expectedGeometrySha256)
  fail('VERIFIED_GEOMETRY_SHA_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds,
  plane=w*d,total=plane*h;
 const idx=(x,y,z)=>(y*d+z)*w+x;
 const occupied=new Uint8Array(total);
 for(const [x,y,z] of compiled.primitives)occupied[idx(x,y,z)]=1;
 const stand=new Uint8Array(total),roof=new Uint8Array(total);
 let supported=0,roofed=0;
 for(let y=1;y+1<h;y++)
  for(let z=0;z<d;z++)
   for(let x=0;x<w;x++){
    const i=idx(x,y,z);
    if(!occupied[i-plane]||occupied[i]||occupied[i+plane])continue;
    stand[i]=1;supported++;
   }
 // A higher voxel in the very same XZ column is a cover *proxy* only.
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  let above=-1;
  for(let y=h-1;y>=0;y--){
   const i=idx(x,y,z);
   if(stand[i]&&above>=y+2){roof[i]=1;roofed++;}
   if(occupied[i])above=y;
  }
 }
 const maskNear=new Uint8Array(total),maskFar=new Uint8Array(total);
 const mark=(i,dist,bit)=>{
  if(!stand[i]||dist<1||dist>EXTENDED)return;
  maskFar[i]|=bit;
  if(dist<=NEAR)maskNear[i]|=bit;
 };
 // Linear sweeps calculate the closest *opaque concept voxel* in each
 // cardinal horizontal direction, at the standing feet OR head level.
 // This avoids expensive rays over hundreds of thousands of cells.
 const solidAt=(i)=>occupied[i]||occupied[i+plane];
 for(let y=1;y+1<h;y++){
  for(let z=0;z<d;z++){
   let prior=-1;
   for(let x=0;x<w;x++){
    const i=idx(x,y,z);
    if(solidAt(i))prior=x;
    else if(prior>=0)mark(i,x-prior,1);
   }
   prior=w;
   for(let x=w-1;x>=0;x--){
    const i=idx(x,y,z);
    if(solidAt(i))prior=x;
    else if(prior<w)mark(i,prior-x,2);
   }
  }
  for(let x=0;x<w;x++){
   let prior=-1;
   for(let z=0;z<d;z++){
    const i=idx(x,y,z);
    if(solidAt(i))prior=z;
    else if(prior>=0)mark(i,z-prior,4);
   }
   prior=d;
   for(let z=d-1;z>=0;z--){
    const i=idx(x,y,z);
    if(solidAt(i))prior=z;
    else if(prior<d)mark(i,prior-z,8);
   }
  }
 }
 let nearThree=0,nearFour=0,farThree=0,farFour=0,
  shelteredNearThree=0,shelteredFarThree=0,shelteredFarFour=0,
  roofedWithAtMostTwoFar=0;
 const shelter=new Uint8Array(total);
 const heights=[];
 for(let y=1;y+1<h;y++){
  const by={feetY:y,supported:0,overhead:0,roofedWithThreeNearbySideDirections:0};
  for(let z=0;z<d;z++)for(let x=0;x<w;x++){
   const i=idx(x,y,z);
   if(!stand[i])continue;
   by.supported++;
   const n=bits(maskNear[i]),f=bits(maskFar[i]);
   if(n>=3)nearThree++;
   if(n===4)nearFour++;
   if(f>=3)farThree++;
   if(f===4)farFour++;
   if(roof[i]){
    by.overhead++;
    if(n>=3){shelteredNearThree++;by.roofedWithThreeNearbySideDirections++;}
    if(f>=3){shelteredFarThree++;shelter[i]=1;}
    if(f===4)shelteredFarFour++;
    if(f<=2)roofedWithAtMostTwoFar++;
   }
  }
  if(by.supported)heights.push(by);
 }
 let shelteredPads=0,roofedPads=0;
 for(let y=1;y+1<h;y++)
  for(let z=0;z+1<d;z++)
   for(let x=0;x+1<w;x++){
    const i=idx(x,y,z),four=[i,i+1,i+w,i+w+1];
    if(four.every(v=>roof[v]))roofedPads++;
    if(four.every(v=>shelter[v]))shelteredPads++;
   }
 if(heights.reduce((a,b)=>a+b.supported,0)!==supported||
  heights.reduce((a,b)=>a+b.overhead,0)!==roofed||
  shelteredFarThree>roofed||shelteredPads>roofedPads)
  fail('EXHAUSTIVE_METRICS_INTEGRITY');
 const metrics={dimensions:[w,h,d],nearSideHorizonCells:NEAR,
  extendedSideHorizonCells:EXTENDED,
  supportedTwoHighStandingPositions:supported,
  positionsWithOverheadVoxel:roofed,
  supportedPositionsWith3PlusSideDirectionsWithin8:nearThree,
  supportedPositionsWith4SideDirectionsWithin8:nearFour,
  supportedPositionsWith3PlusSideDirectionsWithin24:farThree,
  supportedPositionsWith4SideDirectionsWithin24:farFour,
  roofedPositionsWith3PlusSideDirectionsWithin8:shelteredNearThree,
  roofedPositionsWith3PlusSideDirectionsWithin24:shelteredFarThree,
  roofedPositionsWith4SideDirectionsWithin24:shelteredFarFour,
  roofedPositionsWithAtMost2SideDirectionsWithin24:roofedWithAtMostTwoFar,
  fullyRoofed2x2SupportedPads:roofedPads,
  roofed3Direction2x2SupportedPads:shelteredPads,
  candidateHeights:heights};
 const concerns=[];
 if(roofed>0&&shelteredFarThree===0)
  concerns.push({kind:'ROOFED_FLOORS_WITHOUT_3_NEARBY_SIDE_DIRECTIONS',
   measured:{roofedStandingPositions:roofed,
    within24AndRoofed:shelteredFarThree},
   interpretation:'Roofs or upper decks occur, but none of the covered standing positions has solids along three of four horizontal directions within 24 cells. Check where actual occupied rooms, not just canopies, would fit. A large hall or intentional open pavilion can legitimately trigger this.',
   automaticReject:false});
 else if(roofed>0&&roofedWithAtMostTwoFar/roofed>=0.8)
  concerns.push({kind:'MOST_ROOFED_POSITIONS_LACK_3_NEARBY_SIDE_DIRECTIONS',
   measured:{roofedStandingPositions:roofed,
    roofedWithAtMostTwoSidesWithin24:roofedWithAtMostTwoFar},
   interpretation:'Most overhead-covered floor locations appear horizontally open by this limited-range geometric proxy. Check whether the intended functional interiors exist, while keeping deliberate grand halls and outdoor transitions.',
   automaticReject:false});
 if(roofed>0&&shelteredPads===0)
  concerns.push({kind:'NO_ROOFED_3_DIRECTION_2X2_ROOM_PROXY',
   measured:{fullyRoofed2x2SupportedPads:roofedPads,
    roofed3Direction2x2SupportedPads:0},
   interpretation:'No 2x2 supported patch meets both overhead and three-direction solid-proximity tests. This is a review cue, not evidence that there are no rooms; large interiors and columned spaces may not match the proxy.',
   automaticReject:false});
 return {schema:SCHEMA,status:'ROOF_AND_NEARBY_SOLID_PROXY_FOR_HUMAN_REVIEW',
  originalRawSha256:expectedRawSha256,geometrySha256:expectedGeometrySha256,
  metrics,possibleConcerns:concerns,
  sourceSpatialPlanIgnored:true,sourceModelClaimedRoomsIgnored:true,
  sideSolidsMayBeFurnitureColumnsOrExterior:true,
  openAirAndMonumentalHallsNotRejected:true,
  fullyEnclosedRoomOrFunctionVerified:false,
  horizontalDoorOpeningsNotEvaluated:true,
  realMinecraftWalkingOrBuildingProven:false,
  independentHumanReview:'NOT_REVIEWED',
  allConcernsAbsentDoesNotMeanPass:true,
  modelCalls:0,worldWrites:0,safety:safe()};
}
export function writeR67SpatialContainment({raw,expectedRawSha256,
 expectedGeometrySha256,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_ORDINARY_REVIEW_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R67_SURROUNDING_SPACE_EVIDENCE.json');
 const html=path.join(destination,'R67_SURROUNDING_SPACE_REVIEW.html');
 if(fs.existsSync(json)||fs.existsSync(html))fail('REVIEW_ALREADY_EXISTS');
 const report=assessR67SpatialContainment({
  raw,expectedRawSha256,expectedGeometrySha256});
 const m=report.metrics,rows=m.candidateHeights.map(y=>
  '<tr><td>'+y.feetY+'</td><td>'+y.supported+'</td><td>'+
  y.overhead+'</td><td>'+y.roofedWithThreeNearbySideDirections+
  '</td></tr>').join('');
 const warnings=report.possibleConcerns.map(x=>'<li><b>'+esc(x.kind)+
  '</b> '+esc(x.interpretation)+'</li>').join('');
 const doc='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R67 室内らしい空間の幾何的手掛かり</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:940px;margin:30px auto;padding:0 20px;color:#243849}table{border-collapse:collapse}td,th{border:1px solid #ccd6e0;padding:8px 10px}.warn{background:#fff3dd;padding:12px}</style></head><body>'+
  '<h1>R67 屋根の下でも壁に囲まれているとは限らない</h1>'+
  '<p class="warn">頭上の固体と前後左右の固体までの距離を調べた、限定的な形状指標です。壁は家具や柱でも代用され、広い大空洞は検出から漏れます。部屋の成立・ドア・本物の室内・美術品質は人間が確認してください。</p>'+
  '<p>原本SHA '+esc(report.originalRawSha256)+'</p>'+
  '<p>立てる候補 '+m.supportedTwoHighStandingPositions+
  ' / 頭上に固体 '+m.positionsWithOverheadVoxel+
  ' / 頭上と周囲3方向以内24セル '+m.roofedPositionsWith3PlusSideDirectionsWithin24+
  ' / 同じ条件を満たす2×2床 '+m.roofed3Direction2x2SupportedPads+'</p>'+
  '<table><tr><th>足元Y</th><th>候補</th><th>屋根代理</th><th>屋根＋周囲3方向</th></tr>'+
  rows+'</table><h2>点検候補（自動不合格ではない）</h2><ul>'+
  (warnings||'<li>限定的な形状検査の注意なし。建築品質PASSではありません。</li>')+
  '</ul><p>推論0・Minecraft操作0・NOT_PREPARED・施工9ゲートBLOCKED。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,doc,{flag:'wx'});
 return {status:report.status,relativeFile:path.basename(html),
  reviewedCandidatePositions:m.supportedTwoHighStandingPositions,
  modelCalls:0,worldWrites:0};
}
