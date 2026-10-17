/**
 * B166 two-level network viewer: retained 35 scenes + one newly compiled
 * model with a genuine south upper doorway, canopy and audited routes.
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
import {makeB165Bundle,verifyB165Site} from './build-b165-site.mjs';
import {buildInterlevelNetwork,verifyInterlevelNetwork}
 from '../source/ai/b166-interlevel-network.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const read=(root,name)=>fs.readFileSync(path.join(root,name),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const guard=(v,m)=>{if(!v)throw Error('B166_SITE_'+m);};
export function makeB166Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const prior=makeB165Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler);
 const nav=buildInterlevelNetwork(doppler);
 guard(verifyInterlevelNetwork(doppler,nav.report)&&
  nav.report.stairGridPaths.length===2&&
  nav.report.upperFlatPlatforms.length===2&&
  nav.report.stairGridPaths.every(s=>s.horizontalSteps===15&&s.netHeightGain===7)&&
  nav.report.upperFlatPlatforms.map(x=>x.flatMoves).join(',')==='48,71'&&
  nav.report.upperFlatPlatforms.map(x=>x.reachableAnchors).join(',')==='221,290'&&
  nav.report.changedLowerRouteBodyCells===0&&
  nav.report.originalLowerMoves===127&&
  nav.report.mixedFootprintWholeJourneyCertified===false&&
  nav.report.physicalActorMovementCertified===false&&
  nav.report.constructionApproved===false&&
  nav.report.BuildPlan.operations.length===0,'NETWORK_PROOF');
 const {primitives,...metadata}=nav.compiled,surface=surfaceOnly(nav.compiled);
 guard(surface.length>1000,'NO_NEW_3D_SCENE');
 const scene={...metadata,surface,
  interlevelReport:nav.report,
  lower2x2Path:nav.low.targets[0].path,
  stair1x1Paths:nav.stairs.map(s=>({id:s.wing,path:s.path})),
  upper2x2Paths:nav.upper.map(u=>({id:u.wing,path:u.route.targets[0].path})),
  stats:{...metadata.stats,renderedSurfaceCells:surface.length}};
 const gallery={...prior.gallery,
  scenes:[...prior.gallery.scenes,scene],
  sourceHashes:[...prior.gallery.sourceHashes,nav.compiled.sourceSha256],
  geometryHashes:[...prior.gallery.geometryHashes,nav.compiled.geometrySha256]};
 guard(gallery.scenes.length===36&&
  gallery.scenes[34].id==='doppler-orbital-crown-inhabited-interior'&&
  gallery.scenes[35].id==='doppler-orbital-crown-navigation-network'&&
  new Set(gallery.scenes.map(s=>s.id)).size===36&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'HISTORY_OR_WORLD');
 return {gallery,prior,nav,worldWrites:0,constructionApproved:false};
}
export function renderB166Html(bundle,template){
 guard(bundle?.gallery?.scenes.length===36,'VIEW_INPUT');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B166 / ORBITAL GALLERY NAVIGATION')
  .replace('B143 AI Architecture Studio','B166 Interlevel Navigation Studio')
  .replace('ChatGPTが設計した新規建築','DOPPLER — 南北屋内階段と上階の実セル経路')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '実ボクセルの1×1離散階段と2×2上階歩行グラフを区別して検証。南翼の閉塞を開口し、北翼48移動・南翼71移動の上層経路を設計上で確認します。');
 const controls='<h2 style="margin-top:20px">表示設定</h2>';
 guard(html.includes(controls),'CONTROLS');
 html=html.replace(controls,
  '<div class="info"><strong>B166：経路を立体的に検証</strong><p>35番目は階段の踏面を個別チェックしたモデル。36番目は南翼のドーム内に実際の開口部を施工前デザインとして追加したモデルです。</p><p>北・南とも1×1格子移動で15区間／高度7上昇。上階の2×2通路は北48移動・南71移動。階段を2×2の同一幅で登れるとまでは認証していません。</p></div>'+
  '<label class="toggle"><input type="checkbox" id="b166-route" checked> 下層・階段・上層の経路を描画</label>'+
  '<div class="info" id="b166-status" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。格子上の経路とMinecraft実機の人物物理・転落防止・構造強度は別です。実ワールド施工なし。</div>'+
  controls);
 const hook=' const s=scene();floor.max=';
 guard(html.includes(hook),'SCENE_HOOK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const r=s.interlevelReport;',
  ' el("b166-status").textContent=r?',
  '  "階段 1×1：南北各"+r.stairGridPaths[0].horizontalSteps+"移動／7段上昇。上階 2×2：北"+r.upperFlatPlatforms[0].flatMoves+"移動・"+r.upperFlatPlatforms[0].reachableAnchors+"地点、南"+r.upperFlatPlatforms[1].flatMoves+"移動・"+r.upperFlatPlatforms[1].reachableAnchors+"地点。下層 "+r.originalLowerMoves+"移動（実機未認証）":',
  '  "36番目の多層通路モデルを選択すると経路グラフが表示されます。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 guard(html.includes(draw),'DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' if(el("b166-route").checked&&s.interlevelReport){',
  '  const routes=[{path:s.lower2x2Path,color:"#99ffdd"},',
  '   ...s.stair1x1Paths.map(p=>({path:p.path,color:"#ffdd89"})),',
  '   ...s.upper2x2Paths.map(p=>({path:p.path,color:"#89c8ff"}))];',
  '  routes.forEach(r=>{if(!r.path?.length)return;',
  '   ctx.save();ctx.strokeStyle=r.color;ctx.lineWidth=3;ctx.lineJoin="round";',
  '   ctx.beginPath();r.path.forEach((p,i)=>{const q=project(p[0]+1,p[1]+.12,p[2]+1);',
  '    if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '   });ctx.stroke();ctx.restore();',
  '  });',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const listener='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 guard(html.includes(listener),'INPUT_HOOK');
 html=html.replace(listener,listener+'\nel("b166-route").addEventListener("change",drawSoon);');
 const startup='\nsetScene();\n</script>';
 guard(html.includes(startup),'INIT');
 html=html.replace(startup,'\nindex=35;select.value="35";setScene();\n</script>');
 guard(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'NETWORK_FETCH');
 return html;
}
const HOMENAV='<div id="b166-interlevel-nav" style="padding:12px 24px;background:#23464d;color:#effff8"><strong>B166:</strong> 南北屋内階段・上層回廊の経路検証 → <a style="color:#bbffed" href="./ai/interlevel-navigation/">36モデル3D比較</a>（施工なし）</div>';
const AINAV='<div id="b166-interlevel-nav" class="info"><strong>B166:</strong> 上層経路グラフの立体表示 → <a style="color:#bbffed" href="./interlevel-navigation/">ナビゲーション3D</a></div>';
function edit(dir,file,fn){
 const location=path.join(dir,file),m=JSON.parse(fs.readFileSync(location,'utf8'));
 fn(m);fs.writeFileSync(location,JSON.stringify(m,null,2)+'\n');
}
export function writeB166Site(b,dir=SITE){
 verifyB165Site(dir);
 const html=renderB166Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/interlevel-navigation'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/interlevel-navigation/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 guard(home.includes('</header>')&&!home.includes('id="b166-interlevel-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b166-interlevel-nav"'),'NAV_HOLD');
 home=home.replace('</header>','</header>'+HOMENAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=hash(home));
 for(const i of Array.from({length:23},(_,k)=>k+143)){
  const file='B'+i+'_MANIFEST.json';
  if(fs.existsSync(path.join(dir,file)))edit(dir,file,m=>{
   m.rootSha256=hash(home);
   if('gallerySha256'in m)m.gallerySha256=hash(ai);
   if('aiSha256'in m)m.aiSha256=hash(ai);
  });
 }
 const prior=JSON.parse(read(dir,'B165_MANIFEST.json')),p=b.nav.report;
 const manifest={
  schema:'minecraftaibuilder-b166-multilevel-navigation-v1',
  sceneCount:36,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  sourceSha256:p.sourceSha256,finishedSha256:p.afterSourceSha256,
  finishedGeometrySha256:p.afterGeometrySha256,
  interlevelProofSha256:p.sha256,
  stair1x1Moves:p.stairGridPaths.map(x=>x.horizontalSteps),
  upper2x2Moves:p.upperFlatPlatforms.map(x=>x.flatMoves),
  upper2x2Anchors:p.upperFlatPlatforms.map(x=>x.reachableAnchors),
  lower2x2Moves:p.originalLowerMoves,
  changedLowerRouteBodyCells:p.changedLowerRouteBodyCells,
  addedElements:p.addedElements,newlyOccupiedCells:p.newlyOccupiedCells,
  pageSha256:hash(html),rootSha256:hash(home),aiSha256:hash(ai),
  inheritedB141Sha256:prior.inheritedB141Sha256,
  physicalActorMovementCertified:false,
  mixedFootprintWholeJourneyCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B166_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 guard(JSON.stringify(verifyB166Site(dir))===JSON.stringify(manifest),'POSTWRITE_HOLD');
 return manifest;
}
export function verifyB166Site(dir=SITE){
 verifyB165Site(dir);
 const b=makeB166Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B166_MANIFEST.json')),
  ancestor=JSON.parse(read(dir,'B165_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),
  html=read(dir,'ai/interlevel-navigation/index.html'),p=b.nav.report;
 guard(m.schema==='minecraftaibuilder-b166-multilevel-navigation-v1'&&
  m.sceneCount===36&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.sourceSha256===p.sourceSha256&&m.finishedSha256===p.afterSourceSha256&&
  m.finishedGeometrySha256===p.afterGeometrySha256&&
  m.interlevelProofSha256===p.sha256&&
  m.stair1x1Moves.join()==='15,15'&&
  m.upper2x2Moves.join()==='48,71'&&
  m.upper2x2Anchors.join()==='221,290'&&
  m.lower2x2Moves===127&&m.changedLowerRouteBodyCells===0&&
  m.addedElements===2&&m.newlyOccupiedCells===p.newlyOccupiedCells&&
  m.pageSha256===hash(html)&&
  m.pageSha256===hash(renderB166Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===hash(home)&&m.aiSha256===hash(ai)&&
  m.inheritedB141Sha256===ancestor.inheritedB141Sha256&&
  m.physicalActorMovementCertified===false&&
  m.mixedFootprintWholeJourneyCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(v=>v==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  home.includes('id="b166-interlevel-nav"')&&ai.includes('id="b166-interlevel-nav"')&&
  html.includes('id="b166-route"'),'REPLAY_OR_WORLD_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB166Site(),null,2));
  else{
   const b=makeB166Bundle(readDesigns(),readRevisionRequests(),
    readContinuations(),readStructuralRequests(),readRepairRequest(),
    readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
    readSkyDesign(),readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
    readHeliosR0(),readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB166Site(b)},null,2));
  }
 }catch(e){console.error('B166_HOLD',e.message);process.exitCode=1;}
}
