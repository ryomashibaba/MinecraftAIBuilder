/**
 * B165 35-scene offline gallery: genuine upper-level terminal interiors,
 * two precise 2x2 stair tread sequences and panoramic galleries.
 * Full B141–B164 source ancestry / world-write HOLD is inherited.
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
import {makeB164Bundle,verifyB164Site} from './build-b164-site.mjs';
import {createOrbitalInteriors,verifyOrbitalInteriors}
 from '../source/ai/b165-orbital-interiors.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const read=(dir,f)=>fs.readFileSync(path.join(dir,f),'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const need=(ok,msg)=>{if(!ok)throw Error('B165_SITE_'+msg);};
export function makeB165Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const prior=makeB164Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler);
 const interiors=createOrbitalInteriors(doppler);
 need(verifyOrbitalInteriors(doppler,interiors.report)&&
  interiors.report.interiorFlights===2&&
  interiors.report.newAuthoringElements===49&&
  interiors.report.newSolidCells===489&&
  interiors.report.removedSolidCells===88&&
  interiors.report.changedCellsOnOriginalRoute===0&&
  interiors.report.treadProofs.every(w=>
   w.rise===7&&w.intermediateTreads===7&&
   w.checks.length===9&&
   w.checks.every(c=>c.support2x2&&c.headroom2))&&
  interiors.lower.targets[0].steps===127&&
  interiors.report.physicalStairTraversalCertified===false&&
  interiors.report.structuralStrengthCertified===false&&
  interiors.report.constructionApproved===false&&
  interiors.report.BuildPlan.operations.length===0,
  'MISMATCH_STAIRS_OR_GEOMETRY_HOLD');
 const {primitives,...meta}=interiors.compiled,surface=surfaceOnly(interiors.compiled);
 need(surface.length>1000,'EMPTY_NEW_ARCHITECTURE');
 const scene={...meta,surface,
  lowerRouteReview:interiors.lower,
  upperInteriorsReview:interiors.report,
  stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 const gallery={...prior.gallery,
  scenes:[...prior.gallery.scenes,scene],
  sourceHashes:[...prior.gallery.sourceHashes,interiors.compiled.sourceSha256],
  geometryHashes:[...prior.gallery.geometryHashes,interiors.compiled.geometrySha256]};
 need(gallery.scenes.length===35&&
  gallery.scenes[33].id==='doppler-monumental-orbital-crown'&&
  gallery.scenes[34].id==='doppler-orbital-crown-inhabited-interior'&&
  new Set(gallery.scenes.map(x=>x.id)).size===35&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,
  'HISTORY_OR_WORLD_GATES');
 return {gallery,prior,interiors,constructionApproved:false,worldWrites:0};
}
export function renderB165Html(b,template){
 need(b?.gallery?.scenes.length===35,'VIEW_INPUT');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B165 / ORBITAL CROWN INTERIOR ACCESS')
  .replace('B143 AI Architecture Studio','B165 Orbital Crown Exploration')
  .replace('ChatGPTが設計した新規建築','DOPPLER — 展望回廊と南北二翼の屋内階段')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '大型リング宇宙港に2基の高低差7の屋内階段と吹抜け、屋根内部の展望ギャラリーを新設。実物の3Dセルを生成して踏面支持と頭上2セル空間を確認した設計案。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const hook='<h2 style="margin-top:20px">表示設定</h2>';
 need(html.includes(hook),'MISSING_VISUAL_CONTROL');
 html=html.replace(hook,
  '<div class="info"><strong>B165：探索可能性を考慮した内部空間</strong><p>34番目が巨大ガラス屋根の完成候補、35番目がその内部に階段2基・吹抜け2箇所・光る上層回廊を追加した構造です。</p><p>49の新しい設計部材、489追加セル、88撤去セル。南北それぞれ高低差7、9地点の2×2踏面・頭上2セル確認が済んでいます。</p></div>'+
  '<label class="toggle"><input type="checkbox" id="b165-route" checked> 下層の旧127移動経路を表示</label>'+
  '<div class="info" id="b165-status" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。階段の踏面検証はMinecraftプレイヤーの登坂実証ではありません。構造強度・手すり安全性・実施工の承認はありません。</div>'+
  hook);
 const sceneHook=' const s=scene();floor.max=';
 need(html.includes(sceneHook),'SCENE_HOOK_MISSING');
 html=html.replace(sceneHook,[
  ' const s=scene();',
  ' const v=s.upperInteriorsReview,r=v?s.lowerRouteReview?.targets[0]:null;',
  ' el("b165-status").textContent=v?',
  '  "二翼階段 "+v.interiorFlights+"基／追加 "+v.newSolidCells+"セル、吹抜け "+v.removedSolidCells+"セル。2×2踏面は南北各9地点。下層経路"+r.steps+"移動： "+r.status+"（実機移動未認証）":',
  '  "35番目の内部改築モデルを選択すると、二翼の階段と内部回廊の検査結果を表示します。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 need(html.includes(draw),'DRAW_HOOK_MISSING');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const route=s.upperInteriorsReview?s.lowerRouteReview?.targets[0]?.path:null;',
  ' if(el("b165-route").checked&&route?.length){',
  '  ctx.save();ctx.strokeStyle="#b3ffdf";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();route.forEach((p,i)=>{const q=project(p[0]+1,p[1]+.17,p[2]+1);',
  '    if(!i)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const event='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 need(html.includes(event),'INPUT_HOOK_MISSING');
 html=html.replace(event,event+'\nel("b165-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 need(html.includes(init),'INIT_MISSING');
 html=html.replace(init,'\nindex=34;select.value="34";setScene();\n</script>');
 need(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),
  'STATIC_VIEWER_ONLY');
 return html;
}
const HOME='<div id="b165-interior-nav" style="padding:12px 24px;background:#244957;color:#f0fff7"><strong>B165:</strong> 巨大宇宙港に2つの内部階段と展望ギャラリー → <a style="color:#baffec" href="./ai/orbital-interiors/">35モデル3D比較</a>（施工なし）</div>';
const AI='<div id="b165-interior-nav" class="info"><strong>B165:</strong> 屋根の内部空間・上層デッキ → <a style="color:#baffec" href="./orbital-interiors/">二翼立体アクセス3D</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),m=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(m);fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
}
export function writeB165Site(b,dir=SITE){
 verifyB164Site(dir);
 const html=renderB165Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/orbital-interiors'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/orbital-interiors/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 need(home.includes('</header>')&&!home.includes('id="b165-interior-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b165-interior-nav"'),'NAVIGATION');
 home=home.replace('</header>','</header>'+HOME);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AI);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=sha(home));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json',
  'B145_MANIFEST.json','B146_MANIFEST.json','B147_MANIFEST.json',
  'B148_MANIFEST.json','B149_MANIFEST.json','B150_MANIFEST.json',
  'B151_MANIFEST.json','B152_MANIFEST.json','B153_MANIFEST.json',
  'B154_MANIFEST.json','B155_MANIFEST.json','B156_MANIFEST.json',
  'B157_MANIFEST.json','B158_MANIFEST.json','B159_MANIFEST.json',
  'B160_MANIFEST.json','B161_MANIFEST.json','B162_MANIFEST.json',
  'B163_MANIFEST.json','B164_MANIFEST.json']){
  edit(dir,f,m=>{
   m.rootSha256=sha(home);
   if('gallerySha256'in m)m.gallerySha256=sha(ai);
   if('aiSha256'in m)m.aiSha256=sha(ai);
  });
 }
 const inherited=JSON.parse(read(dir,'B164_MANIFEST.json')),p=b.interiors.report;
 const m={
  schema:'minecraftaibuilder-b165-interior-galleries-v1',
  sceneCount:35,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  finalSourceSha256:b.interiors.compiled.sourceSha256,
  finalGeometrySha256:b.interiors.compiled.geometrySha256,
  interiorProofSha256:p.sha256,
  authoredElements:p.newAuthoringElements,
  newSolidCells:p.newSolidCells,removedSolidCells:p.removedSolidCells,
  stairFlights:p.interiorFlights,
  stairTreadChecks:p.treadProofs.map(x=>x.checks.length),
  stairHeights:p.treadProofs.map(x=>x.rise),
  existingPathConflicts:p.changedCellsOnOriginalRoute,
  oldBridgeMoves:b.interiors.lower.targets[0].steps,
  pageSha256:sha(html),rootSha256:sha(home),aiSha256:sha(ai),
  inheritedB141Sha256:inherited.inheritedB141Sha256,
  physicalStairTraversalCertified:false,structuralStrengthCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B165_MANIFEST.json'),JSON.stringify(m,null,2)+'\n');
 need(JSON.stringify(verifyB165Site(dir))===JSON.stringify(m),'POSTWRITE');
 return m;
}
export function verifyB165Site(dir=SITE){
 verifyB164Site(dir);
 const b=makeB165Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B165_MANIFEST.json')),
  inherited=JSON.parse(read(dir,'B164_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),
  html=read(dir,'ai/orbital-interiors/index.html'),p=b.interiors.report;
 need(m.schema==='minecraftaibuilder-b165-interior-galleries-v1'&&
  m.sceneCount===35&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.finalSourceSha256===b.interiors.compiled.sourceSha256&&
  m.finalGeometrySha256===b.interiors.compiled.geometrySha256&&
  m.interiorProofSha256===p.sha256&&
  m.authoredElements===49&&m.newSolidCells===489&&m.removedSolidCells===88&&
  m.stairFlights===2&&m.stairTreadChecks.join(',')==='9,9'&&
  m.stairHeights.join(',')==='7,7'&&
  m.existingPathConflicts===0&&m.oldBridgeMoves===127&&
  m.pageSha256===sha(html)&&
  m.pageSha256===sha(renderB165Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===sha(home)&&m.aiSha256===sha(ai)&&
  m.inheritedB141Sha256===inherited.inheritedB141Sha256&&
  m.physicalStairTraversalCertified===false&&
  m.structuralStrengthCertified===false&&m.constructionApproved===false&&
  m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  home.includes('id="b165-interior-nav"')&&
  ai.includes('id="b165-interior-nav"')&&
  html.includes('id="b165-route"'),'PROVENANCE_OR_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB165Site(),null,2));
  else{
   const b=makeB165Bundle(readDesigns(),readRevisionRequests(),
    readContinuations(),readStructuralRequests(),readRepairRequest(),
    readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
    readSkyDesign(),readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
    readHeliosR0(),readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB165Site(b)},null,2));
  }
 }catch(e){console.error('B165_HOLD',e.message);process.exitCode=1;}
}
