/**
 * B160 static gallery: historical 25 frozen scenes and two genuinely new
 * DOPPLER switchback models. Four corridor legs are generated from geometry,
 * not hard-coded into this viewer.
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
import {readPolarisR0,makeB159Bundle,verifyB159Site} from './build-b159-site.mjs';
import {planMultiturnSkybridge,DOPPLER_ROUTE,verifyMultiturnSkybridge} from '../source/ai/b160-multiturn-router.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const DOPPLER=path.join(ROOT,'designs/ai/interiors/doppler-switchback-terminal-r0.json');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const sha=t=>createHash('sha256').update(t).digest('hex');
const yes=(x,reason)=>{if(!x)throw Error('B160_SITE_'+reason);};
export function readDopplerR0(){return JSON.parse(fs.readFileSync(DOPPLER,'utf8'));}
export function makeB160Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const prev=makeB159Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris);
 yes(doppler?.id==='doppler-switchback-terminal-r0'&&
  doppler?.designOnly===true&&doppler.id!==polaris.id&&doppler.id!==helios.id&&
  doppler.elements.length>=20,'DOPPLER_SOURCE');
 const result=planMultiturnSkybridge(doppler,DOPPLER_ROUTE);
 yes(verifyMultiturnSkybridge(doppler,DOPPLER_ROUTE,result.report)&&
  result.before.targets[0].status==='FOOTPRINT_UNREACHABLE'&&
  result.after.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  result.report.verifiedFlatMoves===117&&
  result.report.verifiedPathDirectionChanges>=3&&
  result.report.floorSegments===4&&
  result.report.finishingElements===16&&
  result.report.structuralStrengthCertified===false&&
  result.report.playerCollisionCertified===false&&
  result.report.constructionApproved===false&&
  result.report.BuildPlan.operations.length===0&&
  result.report.gates.every(v=>v==='BLOCKED'),'DETOUR_NOT_PROVEN');
 const scene=(compiled,r,extra)=>{
  const {primitives,...meta}=compiled,surface=surfaceOnly(compiled);
  yes(surface.length>50,'EMPTY_SCENE');
  return {...meta,surface,routeReview:r,
   ...(extra?{multiTurnReview:extra}:{}),
   stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 };
 const gallery={...prev.gallery,
  scenes:[...prev.gallery.scenes,scene(result.source,result.before,null),
   scene(result.compiled,result.after,result.report)],
  sourceHashes:[...prev.gallery.sourceHashes,
   result.source.sourceSha256,result.compiled.sourceSha256],
  geometryHashes:[...prev.gallery.geometryHashes,
   result.source.geometrySha256,result.compiled.geometrySha256]};
 yes(gallery.scenes.length===27&&
  gallery.scenes[24].id==='polaris-orbital-switchyard-generated-bent'&&
  gallery.scenes[25].id==='doppler-switchback-terminal-r0'&&
  gallery.scenes[26].id==='doppler-switchback-terminal-generated-detour'&&
  gallery.safety.minecraftWrites===0&&gallery.safety.BuildPlan.operations.length===0,
  'HISTORY_NOT_IMMUTABLE');
 return {gallery,prev,result,constructionApproved:false,worldWrites:0};
}
export function renderB160Html(b,template){
 yes(b?.gallery?.scenes.length===27,'RENDER_INPUT');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B160 / MULTITURN 3D SKYBRIDGE')
  .replace('B143 AI Architecture Studio','B160 DOPPLER Switchback')
  .replace('ChatGPTが設計した新規建築','DOPPLER — 3回曲がる巨大空中連絡回廊')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '3本の巨大妨害塔に隔てられた宇宙港の南北2施設を、実際の床支持・頭上クリアランスを再検証した四区間の回廊で結びます。ワールド施工はありません。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const control='<h2 style="margin-top:20px">表示設定</h2>';
 yes(html.includes(control),'MISSING_CONTROL_ANCHOR');
 html=html.replace(control,
  '<div class="info"><strong>B160: 候補を実ブロックモデルへ変換してから再検証</strong>。26番目がDOPPLERの分断状態、27番目が自動生成された多重折返し回廊です。直線4区間、方向変化3回、欄干・照明・支柱を備える設計用モデルです。</div>'+
  '<label class="toggle"><input type="checkbox" id="b160-route" checked> 2×2領域の経路を重ねて描画</label>'+
  '<div id="b160-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。これはローカル全セルの経路幾何確認であり、Minecraftのキャラクター衝突・建築強度・転落防止・施工を証明するものではありません。</div>'+
  control);
 const scene=' const s=scene();floor.max=';
 yes(html.includes(scene),'SCENE_HOOK');
 html=html.replace(scene,[
  ' const s=scene();',
  ' const isDoppler=s.id===\"doppler-switchback-terminal-r0\"||s.id===\"doppler-switchback-terminal-generated-detour\";',
  ' const r=isDoppler?s.routeReview?.targets[0]:null,p=isDoppler?s.multiTurnReview:null;',
  ' el("b160-status").textContent=r?',
  '  "2×2床支持経路: "+r.status+" / "+(r.steps===null?"接続できない":"水平"+r.steps+"移動")+',
  '  (p?" / 方向転換"+p.verifiedPathDirectionChanges+"回 / 4区間・仕上げ"+p.finishingElements+"部材":" / 分断した元設計")+',
  '  "（実機未認証）":',
  '  "このモデルはB160の経路検査対象外です。DOPPLERのR0と自動回廊案を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 yes(html.includes(draw),'DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const isDoppler=s.id===\"doppler-switchback-terminal-r0\"||s.id===\"doppler-switchback-terminal-generated-detour\";',
  ' const path=isDoppler?s.routeReview?.targets[0]?.path:null;',
  ' if(el("b160-route").checked&&path?.length){',
  '  ctx.save();ctx.strokeStyle="#a4ffdc";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.17,p[2]+1);',
  '   if(!i)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const event='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 yes(html.includes(event),'INPUT_LISTENER');
 html=html.replace(event,event+'\nel("b160-route").addEventListener("change",drawSoon);');
 const initial='\nsetScene();\n</script>';
 yes(html.includes(initial),'VIEWER_INIT');
 html=html.replace(initial,'\nindex=26;select.value="26";setScene();\n</script>');
 yes(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_NETWORK');
 return html;
}
const NAV_HOME='<div id="b160-doppler-nav" style="padding:12px 24px;background:#24424c;color:#f0fff7"><strong>B160:</strong> 3回曲がる空中回廊の新規実証 → <a style="color:#b7ffe0" href="./ai/doppler/">27モデルの3D比較</a>（施工なし）</div>';
const NAV_AI='<div id="b160-doppler-nav" class="info"><strong>B160:</strong> 自動多重折返し回廊 → <a style="color:#b7ffe0" href="./doppler/">DOPPLER比較3D</a></div>';
function update(dir,file,callback){
 const p=path.join(dir,file),m=JSON.parse(fs.readFileSync(p,'utf8'));
 callback(m);fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
}
export function writeB160Site(b,dir=SITE){
 verifyB159Site(dir);
 const html=renderB160Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/doppler'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/doppler/index.html'),html);
 let root=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 yes(root.includes('</header>')&&!root.includes('id="b160-doppler-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b160-doppler-nav"'),'NAV_HOLD');
 root=root.replace('</header>','</header>'+NAV_HOME);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+NAV_AI);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=sha(root));
 for(const file of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json',
  'B155_MANIFEST.json','B156_MANIFEST.json','B157_MANIFEST.json',
  'B158_MANIFEST.json','B159_MANIFEST.json']){
  update(dir,file,m=>{
   m.rootSha256=sha(root);
   if('gallerySha256'in m)m.gallerySha256=sha(ai);
   if('aiSha256'in m)m.aiSha256=sha(ai);
  });
 }
 const parent=JSON.parse(read(dir,'B159_MANIFEST.json')),proof=b.result.report;
 const m={schema:'minecraftaibuilder-b160-multiturn-gallery-v1',
  sceneCount:27,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  baselineSha256:b.result.source.sourceSha256,
  finishSha256:b.result.compiled.sourceSha256,
  finishGeometrySha256:b.result.compiled.geometrySha256,
  multiTurnProofSha256:proof.sha256,
  initialStatus:b.result.before.targets[0].status,
  afterStatus:b.result.after.targets[0].status,
  directionChanges:proof.verifiedPathDirectionChanges,
  horizontalMoves:proof.verifiedFlatMoves,
  corridorSegments:proof.floorSegments,finishingElements:proof.finishingElements,
  candidateCount:proof.examinedCandidateCount,
  pageSha256:sha(html),rootSha256:sha(root),aiSha256:sha(ai),
  inheritedB141Sha256:parent.inheritedB141Sha256,
  structuralStrengthCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B160_MANIFEST.json'),JSON.stringify(m,null,2)+'\n');
 yes(JSON.stringify(verifyB160Site(dir))===JSON.stringify(m),'POSTWRITE_HOLD');
 return m;
}
export function verifyB160Site(dir=SITE){
 verifyB159Site(dir);
 const b=makeB160Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),readHeliosR0(),
  readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B160_MANIFEST.json')),p=JSON.parse(read(dir,'B159_MANIFEST.json'));
 const root=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/doppler/index.html');
 const r=b.result.report;
 yes(m.schema==='minecraftaibuilder-b160-multiturn-gallery-v1'&&
  m.sceneCount===27&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.baselineSha256===b.result.source.sourceSha256&&
  m.finishSha256===b.result.compiled.sourceSha256&&
  m.finishGeometrySha256===b.result.compiled.geometrySha256&&
  m.multiTurnProofSha256===r.sha256&&
  m.initialStatus==='FOOTPRINT_UNREACHABLE'&&
  m.afterStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.directionChanges>=3&&m.horizontalMoves===117&&
  m.corridorSegments===4&&m.finishingElements===16&&
  m.candidateCount>1&&
  m.pageSha256===sha(html)&&
  m.pageSha256===sha(renderB160Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===sha(root)&&m.aiSha256===sha(ai)&&
  m.inheritedB141Sha256===p.inheritedB141Sha256&&
  m.structuralStrengthCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  root.includes('id="b160-doppler-nav"')&&ai.includes('id="b160-doppler-nav"')&&
  html.includes('id="b160-status"'),'SOURCE_OR_WORLD_GATES_FAILED');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB160Site(),null,2));
  else{
   const b=makeB160Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
    readBypassDesign(),readInterchangeR0(),readInterchangeR1(),readHeliosR0(),
    readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB160Site(b),
    route:b.result.after.targets[0].status},null,2));
  }
 }catch(e){console.error('B160_HOLD',e.message);process.exitCode=1;}
}
