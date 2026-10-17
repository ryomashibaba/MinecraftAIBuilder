/**
 * B163 review studio: the same source building and endpoints but three
 * distinct real DSL skybridges (2/4/8 wide) with source/geometry proofs.
 * Preserves all 30 historical scenes and zero-world-write inherited gates.
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
import {readDopplerR0} from './build-b160-site.mjs';
import {makeB162Bundle,verifyB162Site} from './build-b162-site.mjs';
import {createCorridorPortfolio,verifyCorridorPortfolio}
 from '../source/ai/b163-corridor-portfolio.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const read=(dir,p)=>fs.readFileSync(path.join(dir,p),'utf8');
const hash=x=>createHash('sha256').update(x).digest('hex');
const requireTrue=(v,msg)=>{if(!v)throw Error('B163_SITE_'+msg);};
export function makeB163Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const previous=makeB162Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler);
 const comparison=createCorridorPortfolio(doppler);
 requireTrue(verifyCorridorPortfolio(doppler,comparison.report)&&
  comparison.report.optionCount===3&&
  comparison.report.options.map(x=>x.corridorDesignWidth).join(',')==='2,4,8'&&
  comparison.report.options.map(x=>x.flatMoves).join(',')==='101,101,127'&&
  comparison.report.options.map(x=>x.directionChanges).join(',')==='3,3,3'&&
  comparison.report.options.map(x=>x.actuallyOccupiedCellsAdded).join(',')==='825,1212,2318'&&
  comparison.report.paretoIncludingCorridorWidth.length===3&&
  comparison.report.wholeFootprintReplayedAfterFinishing===true&&
  comparison.report.constructionApproved===false&&
  comparison.report.BuildPlan.operations.length===0,
  'DISTINCT_PROFILE_PROOFS');
 const scenes=comparison.candidates.map(c=>{
  const scene=c.variant.finalScene,{primitives,...meta}=scene,
   surface=surfaceOnly(scene);
  requireTrue(surface.length>80,'MISSING_SURFACE_'+c.profile.id);
  return {...meta,surface,routeReview:c.variant.finalRoute,
   corridorReview:c.metrics,
   stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 });
 const gallery={...previous.gallery,
  scenes:[...previous.gallery.scenes,...scenes],
  sourceHashes:[...previous.gallery.sourceHashes,...comparison.candidates.map(c=>c.variant.finalScene.sourceSha256)],
  geometryHashes:[...previous.gallery.geometryHashes,...comparison.candidates.map(c=>c.variant.finalScene.geometrySha256)]};
 requireTrue(gallery.scenes.length===33&&
  gallery.scenes[29].id==='doppler-switchback-terminal-replanned-r3'&&
  gallery.scenes[30].id==='doppler-corridor-portfolio-compact'&&
  gallery.scenes[31].id==='doppler-corridor-portfolio-balanced'&&
  gallery.scenes[32].id==='doppler-corridor-portfolio-monumental'&&
  new Set(gallery.scenes.map(x=>x.id)).size===33&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,
  'HISTORIC_GALLERY_OR_GATES');
 return {gallery,previous,comparison,constructionApproved:false,worldWrites:0};
}
const SAFE=t=>String(t).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
export function renderB163Html(bundle,template){
 requireTrue(bundle?.gallery?.scenes.length===33,'GALLERY_COUNT');
 const metrics=bundle.comparison.report.options;
 const table='<div class="info"><strong>B163 — 3つの本物の回廊設計を比較</strong>'+
  '<p>同じ宇宙港・同じ出発/到着地点から自動生成。設計幅は人が安全に通行できる認証幅ではありません。</p>'+
  '<div style="overflow-x:auto"><table style="width:100%;font-size:13px;text-align:left;border-spacing:12px 7px">'+
  '<thead><tr><th>設計案</th><th>幅</th><th>移動</th><th>曲がり</th><th>追加占有セル</th></tr></thead><tbody>'+
  metrics.map((m,i)=>'<tr><td>'+SAFE(m.profileId.toUpperCase())+
   '（'+(31+i)+'番）</td><td>'+m.corridorDesignWidth+'</td><td>'+m.flatMoves+
   '</td><td>'+m.directionChanges+'</td><td>'+
   m.actuallyOccupiedCellsAdded.toLocaleString('ja-JP')+'</td></tr>').join('')+
  '</tbody></table></div>'+
  '<p>大きさ重視では幅8、効率と規模重視では幅2、幅と距離のバランスでは幅4が比較候補です。</p></div>';
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B163 / ADAPTIVE CORRIDOR PORTFOLIO')
  .replace('B143 AI Architecture Studio','B163 Skybridge Design Comparison')
  .replace('ChatGPTが設計した新規建築','DOPPLER — 3種類の幅と経路を選ぶ建築スタジオ')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '幅2・4・8の3種類を、同じ障害物と同じ端点から別々に生成した3D比較。床支持と頭上空間の再検証を実施し、巨大ターミナルの造形案を比較できます。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const control='<h2 style="margin-top:20px">表示設定</h2>';
 requireTrue(html.includes(control),'UNEXPECTED_TEMPLATE');
 html=html.replace(control,
  table+'<label class="toggle"><input type="checkbox" id="b163-route" checked> 2×2全セルの検証経路を重ねて表示</label>'+
  '<div class="info" id="b163-status" aria-live="polite" role="status"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。設計幅・手すりはゲーム内プレイヤー衝突、建築強度、転落防止、安全性の認証を意味しません。施工禁止。</div>'+
  control);
 const sceneHook=' const s=scene();floor.max=';
 requireTrue(html.includes(sceneHook),'SCENE_HOOK');
 html=html.replace(sceneHook,[
  ' const s=scene();',
  ' const p=s.corridorReview,rt=p?s.routeReview?.targets[0]:null;',
  ' el("b163-status").textContent=p?',
  '  p.profileTitle+"：幅"+p.corridorDesignWidth+"、水平"+p.flatMoves+"移動、曲がり"+p.directionChanges+"回、追加セル"+p.actuallyOccupiedCellsAdded.toLocaleString()+"。2×2検証："+rt.status+"（Minecraft実機は未認証）":',
  '  "このモデルはB163比較対象外です。設計案31〜33番を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 requireTrue(html.includes(draw),'DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const rt=s.corridorReview?s.routeReview?.targets[0]?.path:null;',
  ' if(el("b163-route").checked&&rt?.length){',
  '  ctx.save();ctx.strokeStyle="#b0ffe4";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();rt.forEach((p,i)=>{const q=project(p[0]+1,p[1]+.15,p[2]+1);',
  '    if(!i)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const listener='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 requireTrue(html.includes(listener),'EVENT_HOOK');
 html=html.replace(listener,listener+'\nel("b163-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 requireTrue(html.includes(init),'INIT_HOOK');
 html=html.replace(init,'\nindex=32;select.value="32";setScene();\n</script>');
 requireTrue(!html.includes('fetch(')&&
  !html.includes('__B143_GALLERY_JSON__'),'UNSAFE_HTML');
 return html;
}
const HOME='<div id="b163-corridor-nav" style="padding:12px 24px;background:#244452;color:#f0fff7"><strong>B163:</strong> 大型回廊の設計幅・経路を比較 → <a style="color:#bdffed" href="./ai/corridor-options/">3種類の3D比較を開く</a>（施工なし）</div>';
const AI='<div id="b163-corridor-nav" class="info"><strong>B163:</strong> 2/4/8幅の回廊を比較 → <a style="color:#bdffed" href="./corridor-options/">DOPPLER 3D比較</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),v=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(v);fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
}
export function writeB163Site(bundle,dir=SITE){
 verifyB162Site(dir);
 const html=renderB163Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/corridor-options'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/corridor-options/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 requireTrue(home.includes('</header>')&&!home.includes('id="b163-corridor-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b163-corridor-nav"'),'NAV_UNTRUSTED');
 home=home.replace('</header>','</header>'+HOME);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AI);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=hash(home));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json',
  'B155_MANIFEST.json','B156_MANIFEST.json','B157_MANIFEST.json',
  'B158_MANIFEST.json','B159_MANIFEST.json','B160_MANIFEST.json',
  'B161_MANIFEST.json','B162_MANIFEST.json']){
  edit(dir,f,m=>{
   m.rootSha256=hash(home);
   if('gallerySha256'in m)m.gallerySha256=hash(ai);
   if('aiSha256'in m)m.aiSha256=hash(ai);
  });
 }
 const prev=JSON.parse(read(dir,'B162_MANIFEST.json')),proof=bundle.comparison.report;
 const m={
  schema:'minecraftaibuilder-b163-corridor-options-v1',
  sceneCount:33,sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  portfolioSha256:proof.sha256,
  sourceBuildingSha256:proof.sourceSha256,
  profileIds:proof.options.map(x=>x.profileId),
  widths:proof.options.map(x=>x.corridorDesignWidth),
  distances:proof.options.map(x=>x.flatMoves),
  turns:proof.options.map(x=>x.directionChanges),
  addedCells:proof.options.map(x=>x.actuallyOccupiedCellsAdded),
  ParetoChoices:proof.paretoIncludingCorridorWidth,
  profilesSourceSha256:proof.options.map(x=>x.finalSourceSha256),
  profilesGeometrySha256:proof.options.map(x=>x.finalGeometrySha256),
  pageSha256:hash(html),rootSha256:hash(home),aiSha256:hash(ai),
  inheritedB141Sha256:prev.inheritedB141Sha256,
  playerCollisionCertified:false,structuralStrengthCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B163_MANIFEST.json'),JSON.stringify(m,null,2)+'\n');
 requireTrue(JSON.stringify(verifyB163Site(dir))===JSON.stringify(m),'POSTWRITE');
 return m;
}
export function verifyB163Site(dir=SITE){
 verifyB162Site(dir);
 const b=makeB163Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B163_MANIFEST.json')),
  prev=JSON.parse(read(dir,'B162_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),
  html=read(dir,'ai/corridor-options/index.html'),p=b.comparison.report;
 requireTrue(m.schema==='minecraftaibuilder-b163-corridor-options-v1'&&
  m.sceneCount===33&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.portfolioSha256===p.sha256&&m.sourceBuildingSha256===p.sourceSha256&&
  m.profileIds.join()===p.options.map(x=>x.profileId).join()&&
  m.widths.join()==='2,4,8'&&m.distances.join()==='101,101,127'&&
  m.turns.join()==='3,3,3'&&m.addedCells.join()==='825,1212,2318'&&
  m.ParetoChoices.length===3&&
  m.profilesSourceSha256.join()===p.options.map(x=>x.finalSourceSha256).join()&&
  m.profilesGeometrySha256.join()===p.options.map(x=>x.finalGeometrySha256).join()&&
  m.pageSha256===hash(html)&&
  m.pageSha256===hash(renderB163Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===hash(home)&&m.aiSha256===hash(ai)&&
  m.inheritedB141Sha256===prev.inheritedB141Sha256&&
  m.playerCollisionCertified===false&&m.structuralStrengthCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(x=>x==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  home.includes('id="b163-corridor-nav"')&&
  ai.includes('id="b163-corridor-nav"')&&
  html.includes('id="b163-route"'),'MANIFEST_OR_SAFETY');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB163Site(),null,2));
  else{
   const b=makeB163Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign(),
    readInterchangeR0(),readInterchangeR1(),readHeliosR0(),readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB163Site(b)},null,2));
  }
 }catch(e){console.error('B163_HOLD',e.message);process.exitCode=1;}
}
