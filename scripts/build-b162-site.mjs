/**
 * B162 gallery: compare original optimized bridge, revised disconnected
 * terminal and genuinely REPLANNED supported 2x2 skybridge.
 * Preserve every B142–B161 scene and the B141 safety lineage.
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
import {makeB161Bundle,verifyB161Site} from './build-b161-site.mjs';
import {reviewSkyportRevision,REVISIONS,verifySkyportRevision}
 from '../source/ai/b162-revision-replan.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const ok=(v,msg)=>{if(!v)throw Error('B162_SITE_'+msg);};
export function makeB162Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const previous=makeB161Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler);
 const updated=reviewSkyportRevision(doppler,previous.result,REVISIONS.alpha);
 ok(verifySkyportRevision(doppler,previous.result,REVISIONS.alpha,updated.report)&&
  updated.report.originalMoves===101&&updated.report.revisedMoves===113&&
  updated.report.oldRouteObstructedAnchors>0&&
  updated.report.newRouteObstructedAnchors===0&&
  updated.rebuilt.report.centerlineTurns===4&&
  updated.rebuilt.report.corridorSegments===5&&
  updated.rebuilt.finalRoute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  updated.rebuilt.finalRoute.targets[0].path.every(p=>p[1]===19)&&
  updated.report.structuralStrengthCertified===false&&
  updated.report.playerCollisionCertified===false&&
  updated.report.constructionApproved===false&&
  updated.report.BuildPlan.operations.length===0,'REVISION_REPLAY');
 const scene=(compiled,route,proof)=>{
  const {primitives,...metadata}=compiled,surface=surfaceOnly(compiled);
  ok(surface.length>50,'EMPTY_SURFACE');
  return {...metadata,surface,routeReview:route,
   ...(proof?{revisionReview:proof}:{}),
   stats:{...metadata.stats,renderedSurfaceCells:surface.length}};
 };
 const gallery={...previous.gallery,
  scenes:[...previous.gallery.scenes,
   scene(updated.revisedSource,updated.rebuilt.before,null),
   scene(updated.rebuilt.finalScene,updated.rebuilt.finalRoute,updated.report)],
  sourceHashes:[...previous.gallery.sourceHashes,
   updated.revisedSource.sourceSha256,updated.rebuilt.finalScene.sourceSha256],
  geometryHashes:[...previous.gallery.geometryHashes,
   updated.revisedSource.geometrySha256,updated.rebuilt.finalScene.geometrySha256]};
 ok(gallery.scenes.length===30&&
  gallery.scenes[27].id==='doppler-switchback-terminal-adaptive-r2'&&
  gallery.scenes[28].id===updated.revised.id&&
  gallery.scenes[29].id==='doppler-switchback-terminal-replanned-r3'&&
  new Set(gallery.scenes.map(s=>s.id)).size===gallery.scenes.length&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'HISTORY_OR_WORLD_SAFETY');
 return {gallery,previous,updated,constructionApproved:false,worldWrites:0};
}
export function renderB162Html(b,template){
 ok(b?.gallery?.scenes.length===30,'VIEW_INPUT');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B162 / REVISED BUILDING REPLANNING')
  .replace('B143 AI Architecture Studio','B162 Revision Resilience Studio')
  .replace('ChatGPTが設計した新規建築','DOPPLER — 建築物変更に対応する自動回廊再設計')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '当初の101移動の空中回廊が追加された遮蔽塔に阻まれた場合、設計中の全ボクセルを検査し直して新しい回廊を再設計。未接続モデルと再計算した連絡橋を比較できます。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const control='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(control),'MISSING_CONTROLS');
 html=html.replace(control,
  '<div class="info"><strong>B162：設計変更への自動対応</strong><p>28番目は旧回廊（101移動）、29番目は新しい塔を追加して経路が再び遮断された建築、30番目は新しい障害物を避けて再生成された回廊です。過去のルートが実際に通れなくなったことを検証しています。</p></div>'+
  '<label class="toggle"><input type="checkbox" id="b162-route" checked> 通行可能と判定された2×2全セル経路を表示</label>'+
  '<div id="b162-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。経路は設計用ボクセルによる幾何評価のみ。Minecraftでのプレイヤー物理、強度、転落防止、実ワールドの施工は未認証。</div>'+
  control);
 const sceneHook=' const s=scene();floor.max=';
 ok(html.includes(sceneHook),'MISSING_SCENE_HOOK');
 html=html.replace(sceneHook,[
  ' const s=scene();',
  ' const isDemo=s.id==="doppler-switchback-terminal-adaptive-r2"||s.id==="doppler-switchback-terminal-replanned-r3"||s.id.endsWith("-revised-alpha");',
  ' const r=isDemo?s.routeReview?.targets[0]:null,b=isDemo?s.revisionReview:null;',
  ' el("b162-status").textContent=r?',
  '  "2×2経路："+r.status+" / "+(r.steps===null?"接続されていない":r.steps+"水平移動")+',
  '  (b?" / 旧回廊の遮断 "+b.oldRouteObstructedAnchors+"地点 / 新ルートは遮断 0地点":"" )+',
  '  "（Minecraft実機は未認証）":',
  '  "B162はDOPPLERの旧設計・変更後の未連結・自動再設計を比較してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(draw),'MISSING_DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const isDemo=s.id==="doppler-switchback-terminal-adaptive-r2"||s.id==="doppler-switchback-terminal-replanned-r3"||s.id.endsWith("-revised-alpha");',
  ' const rt=isDemo?s.routeReview?.targets[0]?.path:null;',
  ' if(el("b162-route").checked&&rt?.length){',
  '  ctx.save();ctx.strokeStyle="#aeffe3";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();rt.forEach((p,i)=>{const q=project(p[0]+1,p[1]+.15,p[2]+1);',
  '    if(!i)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const listener='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(listener),'MISSING_EVENT_HOOK');
 html=html.replace(listener,listener+'\nel("b162-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'MISSING_INIT_HOOK');
 html=html.replace(init,'\nindex=29;select.value="29";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_HTML');
 return html;
}
const HOME='<div id="b162-revision-nav" style="padding:12px 24px;background:#264452;color:#f0fff7"><strong>B162:</strong> 建築変更で塞がれた空中回廊を自動再設計 → <a style="color:#baffed" href="./ai/revised-bridge/">30モデルの3D比較</a>（施工なし）</div>';
const AI='<div id="b162-revision-nav" class="info"><strong>B162:</strong> 動線を再生成する建築変更テスト → <a style="color:#baffed" href="./revised-bridge/">DOPPLER R3 3D比較</a></div>';
function update(dir,file,edit){
 const name=path.join(dir,file),o=JSON.parse(fs.readFileSync(name,'utf8'));
 edit(o);fs.writeFileSync(name,JSON.stringify(o,null,2)+'\n');
}
export function writeB162Site(bundle,dir=SITE){
 verifyB161Site(dir);
 const html=renderB162Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/revised-bridge'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/revised-bridge/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(home.includes('</header>')&&!home.includes('id="b162-revision-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b162-revision-nav"'),'NAV_NOT_SAFE');
 home=home.replace('</header>','</header>'+HOME);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AI);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=sha(home));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json',
  'B145_MANIFEST.json','B146_MANIFEST.json','B147_MANIFEST.json',
  'B148_MANIFEST.json','B149_MANIFEST.json','B150_MANIFEST.json',
  'B151_MANIFEST.json','B152_MANIFEST.json','B153_MANIFEST.json',
  'B154_MANIFEST.json','B155_MANIFEST.json','B156_MANIFEST.json',
  'B157_MANIFEST.json','B158_MANIFEST.json','B159_MANIFEST.json',
  'B160_MANIFEST.json','B161_MANIFEST.json']){
  update(dir,f,m=>{
   m.rootSha256=sha(home);
   if('gallerySha256'in m)m.gallerySha256=sha(ai);
   if('aiSha256'in m)m.aiSha256=sha(ai);
  });
 }
 const prior=JSON.parse(read(dir,'B161_MANIFEST.json')),p=bundle.updated.report;
 const manifest={
  schema:'minecraftaibuilder-b162-stale-route-repair-v1',
  sceneCount:30,sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  revisionSourceSha256:p.revisedSourceSha256,
  repairedSourceSha256:p.revisedFinishedSha256,
  repairedGeometrySha256:p.revisedFinishedGeometrySha256,
  revisionReviewSha256:p.sha256,
  oldRouteMoves:p.originalMoves,newRouteMoves:p.revisedMoves,
  staleObstructedAnchors:p.oldRouteObstructedAnchors,
  repairedObstructedAnchors:p.newRouteObstructedAnchors,
  replanBends:bundle.updated.rebuilt.report.centerlineTurns,
  newFloorSegments:bundle.updated.rebuilt.report.corridorSegments,
  pageSha256:sha(html),rootSha256:sha(home),aiSha256:sha(ai),
  inheritedB141Sha256:prior.inheritedB141Sha256,
  structuralStrengthCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(path.join(dir,'B162_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB162Site(dir))===JSON.stringify(manifest),'POSTWRITE_HOLD');
 return manifest;
}
export function verifyB162Site(dir=SITE){
 verifyB161Site(dir);
 const bundle=makeB162Bundle(readDesigns(),readRevisionRequests(),
  readContinuations(),readStructuralRequests(),readRepairRequest(),
  readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
  readSkyDesign(),readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B162_MANIFEST.json')),
  p=JSON.parse(read(dir,'B161_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),
  html=read(dir,'ai/revised-bridge/index.html'),rev=bundle.updated.report;
 ok(m.schema==='minecraftaibuilder-b162-stale-route-repair-v1'&&
  m.sceneCount===30&&m.sourceHashes.join()===bundle.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===bundle.gallery.geometryHashes.join()&&
  m.revisionSourceSha256===rev.revisedSourceSha256&&
  m.repairedSourceSha256===rev.revisedFinishedSha256&&
  m.repairedGeometrySha256===rev.revisedFinishedGeometrySha256&&
  m.revisionReviewSha256===rev.sha256&&
  m.oldRouteMoves===101&&m.newRouteMoves===113&&
  m.staleObstructedAnchors>0&&m.repairedObstructedAnchors===0&&
  m.replanBends===4&&m.newFloorSegments===5&&
  m.pageSha256===sha(html)&&
  m.pageSha256===sha(renderB162Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===sha(home)&&m.aiSha256===sha(ai)&&
  m.inheritedB141Sha256===p.inheritedB141Sha256&&
  m.structuralStrengthCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  home.includes('id="b162-revision-nav"')&&ai.includes('id="b162-revision-nav"')&&
  html.includes('id="b162-route"'),'REPLAY_OR_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB162Site(),null,2));
  else{
   const b=makeB162Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
    readBypassDesign(),readInterchangeR0(),readInterchangeR1(),readHeliosR0(),
    readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB162Site(b)},null,2));
  }
 }catch(e){console.error('B162_HOLD',e.message);process.exitCode=1;}
}
