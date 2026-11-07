/**
 * R66: source-independent overhead geometry of supported final-concept
 * standing positions. Overhead solid != enclosed room, safe roof or use.
 * Model-declared spatialPlan is never consulted. No model/world operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198zr66-overhead-shelter-evidence-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR66_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
export function assessR66OverheadSpace({raw,expectedRawSha256,
 expectedGeometrySha256}={}){
 if(typeof raw!=='string'||raw.length<1||
  Buffer.byteLength(raw)>120000||hash(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('SOURCE_AND_GEOMETRY_PROVENANCE_REQUIRED');
 let design,compiled;
 try{
  design=JSON.parse(raw)?.design;
  compiled=compileDesign(design);
 }catch{fail('STRICT_B143_COMPILED_REQUIRED');}
 if(!verifyCompiled(design,compiled)||
  compiled.geometrySha256!==expectedGeometrySha256)
  fail('GEOMETRY_DIGEST_MISMATCH');
 const {width:w,height:h,depth:d}=design.bounds;
 const plane=w*d,total=plane*h;
 const occ=new Uint8Array(total);
 const idx=(x,y,z)=>(y*d+z)*w+x;
 for(const [x,y,z] of compiled.primitives)occ[idx(x,y,z)]=1;
 // nearest strictly higher occupied cell in this exact XZ column.
 const nearest=new Int16Array(total);
 nearest.fill(-1);
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  let above=-1;
  for(let y=h-1;y>=0;y--){
   const i=idx(x,y,z);
   nearest[i]=above;
   if(occ[i])above=y;
  }
 }
 const stand=new Uint8Array(total),cover=new Uint8Array(total);
 let supported=0,overhead=0,open=0,tall=0;
 let maxGap=0,minGap=null;
 const byY=Array.from({length:h},(_,y)=>({
  feetY:y,supported:0,overheadProxy:0,openAbove:0}));
 for(let y=1;y+1<h;y++)for(let z=0;z<d;z++)for(let x=0;x<w;x++){
  const i=idx(x,y,z);
  if(!occ[i-plane]||occ[i]||occ[i+plane])continue;
  stand[i]=1;
  supported++;byY[y].supported++;
  // Foot and head positions are proven air; higher solid = cover proxy.
  const roof=nearest[i];
  if(roof>=y+2){
   cover[i]=1;overhead++;byY[y].overheadProxy++;
   const gap=roof-y;
   maxGap=Math.max(maxGap,gap);
   minGap=minGap===null?gap:Math.min(minGap,gap);
   if(gap>=5)tall++;
  }else{
   open++;byY[y].openAbove++;
  }
 }
 let coveredPads=0,uncoveredPads=0,mixedPads=0;
 for(let y=1;y+1<h;y++)for(let z=0;z+1<d;z++)
  for(let x=0;x+1<w;x++){
   const i=idx(x,y,z);
   const four=[i,i+1,i+w,i+w+1];
   if(!four.every(k=>stand[k]))continue;
   const n=four.reduce((s,k)=>s+cover[k],0);
   if(n===4)coveredPads++;
   else if(n===0)uncoveredPads++;
   else mixedPads++;
  }
 if(overhead+open!==supported||byY.reduce((a,b)=>a+b.supported,0)!==supported)
  fail('EXHAUSTIVE_COVERAGE_INTEGRITY');
 const findings=[];
 if(supported>0&&overhead===0)
  findings.push({kind:'NO_STANDING_POSITION_HAS_ANY_OVERHEAD_SOLID',
   explanation:'All supported clear positions are vertically open to the design-top boundary. Check whether the intended enclosed program has a meaningful sheltered volume; open plazas and courtyards may be intentional.',
   automaticReject:false});
 else if(supported>0&&open/supported>=0.8)
  findings.push({kind:'MOST_SUPPORTED_POSITIONS_OPEN_ABOVE',
   explanation:'Most supported clear-air positions have no solid directly above in the same XZ column. Assess whether indoor use was achieved; upper roofs and outdoor terraces can legitimately be open.',
   automaticReject:false});
 if(overhead>0&&coveredPads===0)
  findings.push({kind:'NO_COVERED_2X2_STANDING_PAD',
   explanation:'No horizontal 2x2 patch of supported positions is fully covered by an overhead solid-column proxy. Examine whether room-scale sheltered space exists, not just narrow overhangs.',
   automaticReject:false});
 const metrics={bounds:[w,h,d],
  totalSupportedTwoHighPositions:supported,
  positionsWithAnyOverheadSolid:overhead,
  positionsOpenToDesignTop:open,
  overheadProxyShare:supported?overhead/supported:null,
  overheadClearanceCellsMin:minGap,
  overheadClearanceCellsMax:overhead?maxGap:null,
  coveredPositionsWithAtLeast5CellVerticalGap:tall,
  fullyCovered2x2StandingPads:coveredPads,
  fullyOpen2x2StandingPads:uncoveredPads,
  mixed2x2StandingPads:mixedPads,
  candidateHeights:byY.filter(x=>x.supported>0)};
 return {schema:SCHEMA,status:'OVERHEAD_COLUMN_PROXIES_FOR_HUMAN_REVIEW_ONLY',
  originalRawSha256:expectedRawSha256,geometrySha256:expectedGeometrySha256,
  metrics,possibleConcerns:findings,
  originalSpatialPlanRead:false,
  exactFinalConceptVoxelsUsed:true,
  overheadMeansInterior:false,
  coveredMeansEnclosedRoom:false,
  roofEngineeringOrLeakProof:false,
  realMinecraftWalkingOrCollisionProven:false,
  anyArchitecturalQualityPass:false,
  independentHumanReview:'NOT_REVIEWED',
  autoRedesignRequested:false,geometryModified:false,
  modelCalls:0,worldWrites:0,safety:safe()};
}
export function writeR66OverheadSpace({raw,expectedRawSha256,
 expectedGeometrySha256,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_ORDINARY_REVIEW_DIR_REQUIRED');
 const j=path.join(destination,'R66_OVERHEAD_SPACE_EVIDENCE.json');
 const h=path.join(destination,'R66_OVERHEAD_SPACE_REVIEW.html');
 if(fs.existsSync(j)||fs.existsSync(h))fail('NO_OVERWRITE');
 const report=assessR66OverheadSpace({raw,expectedRawSha256,
  expectedGeometrySha256});
 const m=report.metrics;
 const heightRows=m.candidateHeights.map(x=>
  '<tr><td>'+x.feetY+'</td><td>'+x.supported+'</td><td>'+
  x.overheadProxy+'</td><td>'+x.openAbove+'</td></tr>').join('');
 const warnings=report.possibleConcerns.map(x=>
  '<li>'+esc(x.kind)+'：'+esc(x.explanation)+'</li>').join('');
 const html='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R66 覆われた空間と開放空間</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:920px;margin:26px auto;padding:0 20px;color:#26384a}table{border-collapse:collapse}td,th{border:1px solid #cad6e1;padding:8px}aside{padding:12px;background:#fff2dd}</style></head><body>'+
  '<h1>R66 頭上に構造物がある床と開いた床</h1>'+
  '<aside>天井・屋根らしきボクセルが真上にあるという幾何的代理指標にすぎません。覆われた床＝室内ではなく、真上が開いた床＝設計失敗でもありません。耐候性・動線・美術品質は人間が確認してください。</aside>'+
  '<p>原本SHA：'+esc(report.originalRawSha256)+'</p>'+
  '<p>支持床＋頭上2セルの空気：'+m.totalSupportedTwoHighPositions+
  '地点／真上に固体あり：'+m.positionsWithAnyOverheadSolid+
  '地点／真上は設計上端まで開放：'+m.positionsOpenToDesignTop+'地点</p>'+
  '<p>真上に固体がある2×2床パッド：'+m.fullyCovered2x2StandingPads+
  ' ／開放パッド：'+m.fullyOpen2x2StandingPads+'</p>'+
  '<table><tr><th>足元y</th><th>全候補</th><th>頭上に固体</th><th>真上に固体なし</th></tr>'+
  heightRows+'</table><h2>人間が確認する点</h2><ul>'+
  (warnings||'<li>閾値上の注意なし。品質合格ではありません。</li>')+
  '</ul><p>元原本に変更なし。推論0、Minecraftワールド操作0、NOT_PREPARED、9 BLOCKED。</p></body></html>';
 fs.writeFileSync(j,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(h,html,{flag:'wx'});
 return {relativeFile:path.basename(h),status:report.status,
  totalSupported:m.totalSupportedTwoHighPositions,modelCalls:0,worldWrites:0};
}
