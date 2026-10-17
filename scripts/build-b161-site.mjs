/**
 * B161 adaptive A* architecture: one genuinely algorithmically optimized
 * 28th design scene, preserving every B142-B160 gallery and B141 HOLD gate.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readDesigns,surfaceOnly,renderB143Html} from './build-b143-site.mjs';
import {readRevisionRequests} from './build-b144-site.mjs';
import {readContinuations} from './build-b145-site.mjs';
import {readStructuralRequests} from './build-b146-site.mjs';
import {readRepairRequest} from './build-b147-site.mjs';
import {readInteriorDesign} from './build-b149-site.mjs';
import {readUpperDesign} from './build-b150-site.mjs';
import {readWideDesign} from './build-b151-site.mjs';
import {readLoopDesign} from './build-b152-site.mjs';
import {readSkyDesign} from './build-b153-site.mjs';
import {readBypassDesign} from './build-b154-site.mjs';
import {readInterchangeR0,readInterchangeR1} from './build-b155-site.mjs';
import {readHeliosR0} from './build-b158-site.mjs';
import {readPolarisR0} from './build-b159-site.mjs';
import {readDopplerR0,makeB160Bundle,verifyB160Site} from './build-b160-site.mjs';
import {DEFAULT_ROUTE,planAdaptiveSkybridge,verifyAdaptiveSkybridge} from '../source/ai/b161-adaptive-skybridge.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const read=(dir,p)=>fs.readFileSync(path.join(dir,p),'utf8');
const SHA=v=>createHash('sha256').update(v).digest('hex');
const need=(v,msg)=>{if(!v)throw Error('B161_SITE_'+msg);};
export function makeB161Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const before=makeB160Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler);
 const result=planAdaptiveSkybridge(doppler,DEFAULT_ROUTE);
 need(verifyAdaptiveSkybridge(doppler,DEFAULT_ROUTE,result.report)&&
  result.report.centerlineSteps===101&&
  result.report.centerlineTurns>=3&&
  result.report.corridorSegments===4&&
  result.report.final2x2FlatMoves===101&&
  result.report.finishingElementCount===32&&
  result.report.sourceAtStandingLevel>0&&
  result.report.structuralStrengthCertified===false&&
  result.report.constructionApproved===false&&
  result.report.gates.length===9&&
  result.report.BuildPlan.operations.length===0&&
  result.finalScene.id==='doppler-switchback-terminal-adaptive-r2',
  'ALGORITHM_NOT_PROVEN');
 need(result.report.final2x2FlatMoves<before.result.report.verifiedFlatMoves,
  'NO_REAL_IMPROVEMENT_OVER_B160');
 const {primitives,...meta}=result.finalScene,surface=surfaceOnly(result.finalScene);
 need(surface.length>=50,'NO_SURFACE');
 const newScene={...meta,surface,
  routeReview:result.finalRoute,
  adaptiveReview:result.report,
  stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 const gallery={...before.gallery,
  scenes:[...before.gallery.scenes,newScene],
  sourceHashes:[...before.gallery.sourceHashes,result.finalScene.sourceSha256],
  geometryHashes:[...before.gallery.geometryHashes,result.finalScene.geometrySha256]};
 need(gallery.scenes.length===28&&
  gallery.scenes[25].id==='doppler-switchback-terminal-r0'&&
  gallery.scenes[26].id==='doppler-switchback-terminal-generated-detour'&&
  gallery.scenes[27].id==='doppler-switchback-terminal-adaptive-r2'&&
  gallery.safety.minecraftWrites===0&&gallery.safety.BuildPlan.operations.length===0,
  'GALLERY_OR_HOLD');
 return {gallery,before,result,constructionApproved:false,worldWrites:0};
}
export function renderB161Html(bundle,template){
 need(bundle?.gallery?.scenes.length===28,'RENDER');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B161 / ADAPTIVE A-STAR SKYBRIDGE')
  .replace('B143 AI Architecture Studio','B161 Dynamic Route Architect')
  .replace('ChatGPTが設計した新規建築','DOPPLER — AI適応探索による最短空中回廊')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   'DOPPLERの分断された貨物宇宙港を3D比較。4区間固定候補に対して、B161は障害物に応じてA*が全方向探索。床とクリアランスの検証後、梁・ガラス柵・照明と支柱を追加します。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const mark='<h2 style="margin-top:20px">表示設定</h2>';
 need(html.includes(mark),'MISSING_OPTIONS');
 html=html.replace(mark,
  '<div class="info"><strong>B161 A* 自動設計</strong>：26番目は未接続、27番目は従来4区間の117移動、28番目は一般化した経路探索による101移動の設計案。3回の曲がりをルート表示で確認できます。エンジンは設計データのみを出力し、実ブロックの施工は行いません。</div>'+
  '<label class="toggle"><input type="checkbox" id="b161-route" checked> 2×2の検証経路を表示</label>'+
  '<div id="b161-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。経路は局所ボクセルの幾何結果で、Minecraftのプレイヤー物理、橋梁安全、転落対策および施工を認証しません。</div>'+mark);
 const hook=' const s=scene();floor.max=';
 need(html.includes(hook),'NO_SCENE_HOOK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const isDoppler=s.id===\"doppler-switchback-terminal-r0\"||s.id===\"doppler-switchback-terminal-generated-detour\"||s.id===\"doppler-switchback-terminal-adaptive-r2\";',
  ' const r=isDoppler?s.routeReview?.targets[0]:null,proof=isDoppler?s.adaptiveReview:null;',
  ' el("b161-status").textContent=r?',
  '  "2×2検証経路："+r.status+" / "+(r.steps===null?"通路なし":r.steps+"水平移動")+',
  '  (proof?" / A*中心線"+proof.centerlineSteps+"移動・曲がり"+proof.centerlineTurns+"回・"+proof.searchExpansionCount+"状態探索":" / 従来設計")+',
  '  "（Minecraft実機未認証）":',
  '  "このモデルはB161の通路レビュー対象外です。DOPPLER R0/R1/R2を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 need(html.includes(draw),'DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const isDoppler=s.id===\"doppler-switchback-terminal-r0\"||s.id===\"doppler-switchback-terminal-generated-detour\"||s.id===\"doppler-switchback-terminal-adaptive-r2\";',
  ' const route=isDoppler?s.routeReview?.targets[0]?.path:null;',
  ' if(el("b161-route").checked&&route?.length){',
  '  ctx.save();ctx.strokeStyle="#b1ffe5";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();route.forEach((p,i)=>{const q=project(p[0]+1,p[1]+.15,p[2]+1);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const change='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 need(html.includes(change),'CHANGE_HOOK');
 html=html.replace(change,change+'\nel("b161-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 need(html.includes(init),'INIT');
 html=html.replace(init,'\nindex=27;select.value="27";setScene();\n</script>');
 need(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'NOT_STATIC');
 return html;
}
const HOMENAV='<div id="b161-astar-nav" style="padding:12px 24px;background:#244452;color:#f2fff8"><strong>B161:</strong> 障害物に応じて自動経路を探索 → <a style="color:#baffec" href="./ai/adaptive-route/">117移動と101移動の3D比較</a>（施工なし）</div>';
const AINAV='<div id="b161-astar-nav" class="info"><strong>B161:</strong> 多重折返しの最適化 → <a style="color:#baffec" href="./adaptive-route/">自動回廊3D比較</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),x=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(x);fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
}
export function writeB161Site(bundle,dir=SITE){
 verifyB160Site(dir);
 const html=renderB161Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/adaptive-route'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/adaptive-route/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 need(home.includes('</header>')&&!home.includes('id="b161-astar-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b161-astar-nav"'),'NAV');
 home=home.replace('</header>','</header>'+HOMENAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=SHA(home));
 for(const file of ['B143_MANIFEST.json','B144_MANIFEST.json',
  'B145_MANIFEST.json','B146_MANIFEST.json','B147_MANIFEST.json',
  'B148_MANIFEST.json','B149_MANIFEST.json','B150_MANIFEST.json',
  'B151_MANIFEST.json','B152_MANIFEST.json','B153_MANIFEST.json',
  'B154_MANIFEST.json','B155_MANIFEST.json','B156_MANIFEST.json',
  'B157_MANIFEST.json','B158_MANIFEST.json','B159_MANIFEST.json',
  'B160_MANIFEST.json']){
  edit(dir,file,m=>{
   m.rootSha256=SHA(home);
   if('gallerySha256'in m)m.gallerySha256=SHA(ai);
   if('aiSha256'in m)m.aiSha256=SHA(ai);
  });
 }
 const parent=JSON.parse(read(dir,'B160_MANIFEST.json')),proof=bundle.result.report;
 const manifest={schema:'minecraftaibuilder-b161-general-astar-v1',
  sceneCount:28,sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  finishedDesignSha256:proof.finishedSourceSha256,
  finishedGeometrySha256:proof.finishedGeometrySha256,
  adaptiveProofSha256:proof.sha256,
  predecessorFlatMoves:bundle.before.result.report.verifiedFlatMoves,
  improvedFlatMoves:proof.final2x2FlatMoves,
  centerlineSteps:proof.centerlineSteps,
  centerlineTurns:proof.centerlineTurns,
  searchExpanded:proof.searchExpansionCount,
  floorParts:proof.corridorSegments,
  architecturalParts:proof.finishingElementCount,
  pageSha256:SHA(html),rootSha256:SHA(home),aiSha256:SHA(ai),
  inheritedB141Sha256:parent.inheritedB141Sha256,
  structuralStrengthCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B161_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 need(JSON.stringify(verifyB161Site(dir))===JSON.stringify(manifest),'POSTWRITE');
 return manifest;
}
export function verifyB161Site(dir=SITE){
 verifyB160Site(dir);
 const bundle=makeB161Bundle(readDesigns(),readRevisionRequests(),
  readContinuations(),readStructuralRequests(),readRepairRequest(),
  readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
  readSkyDesign(),readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B161_MANIFEST.json')),
  inherited=JSON.parse(read(dir,'B160_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),
  html=read(dir,'ai/adaptive-route/index.html'),p=bundle.result.report;
 need(m.schema==='minecraftaibuilder-b161-general-astar-v1'&&
  m.sceneCount===28&&m.sourceHashes.join()===bundle.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===bundle.gallery.geometryHashes.join()&&
  m.finishedDesignSha256===p.finishedSourceSha256&&
  m.finishedGeometrySha256===p.finishedGeometrySha256&&
  m.adaptiveProofSha256===p.sha256&&
  m.predecessorFlatMoves===117&&m.improvedFlatMoves===101&&
  m.centerlineSteps===101&&m.centerlineTurns===3&&
  m.searchExpanded>0&&m.floorParts===4&&m.architecturalParts===32&&
  m.pageSha256===SHA(html)&&
  m.pageSha256===SHA(renderB161Html(bundle,
   read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===SHA(home)&&m.aiSha256===SHA(ai)&&
  m.inheritedB141Sha256===inherited.inheritedB141Sha256&&
  m.structuralStrengthCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  home.includes('id="b161-astar-nav"')&&ai.includes('id="b161-astar-nav"')&&
  html.includes('id="b161-route"'),'SOURCE_PROOF_OR_GATE');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB161Site(),null,2));
  else{
   const bundle=makeB161Bundle(readDesigns(),readRevisionRequests(),
    readContinuations(),readStructuralRequests(),readRepairRequest(),
    readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
    readSkyDesign(),readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
    readHeliosR0(),readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB161Site(bundle)},null,2));
  }
 }catch(e){console.error('B161_HOLD:',e.message);process.exitCode=1;}
}
