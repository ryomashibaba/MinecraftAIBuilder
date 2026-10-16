/**
 * B157 — compare R0 empty gap / manual R1 / generated floor R2 /
 * generated visually finished bridge R3. All B142-B156 scenes are retained.
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
import {readInterchangeR0,readInterchangeR1,TRANSIT_PROPOSAL} from './build-b155-site.mjs';
import {makeB156Bundle,verifyB156Site} from './build-b156-site.mjs';
import {designFinishedBridge,verifyFinishedBridge} from '../source/ai/b157-finished-bridge.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const SHA=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,p)=>fs.readFileSync(path.join(dir,p),'utf8');
const ok=(b,s)=>{if(!b)throw Error('B157_'+s);};

export function makeB157Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1){
 const prev=makeB156Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1);
 const finish=designFinishedBridge(t0,TRANSIT_PROPOSAL);
 ok(verifyFinishedBridge(t0,TRANSIT_PROPOSAL,finish.report)&&
  finish.report.constructionApproved===false&&
  finish.report.structuralStrengthCertified===false&&
  finish.report.connectedFlatMoves===26&&
  finish.report.finishingElementCount===14&&
  finish.report.foundationPiers===2&&finish.report.guardrailPieces===2&&
  finish.report.railStrengthCertified===false&&
  finish.finished.elements.length===prev.candidate.candidate.elements.length+14&&
  JSON.stringify(finish.finished.elements.slice(0,prev.candidate.candidate.elements.length))===
   JSON.stringify(prev.candidate.candidate.elements)&&
  finish.compiled.sourceSha256!==prev.candidate.compiled.sourceSha256,
  'GENERATED_FINISH_NOT_VALID');
 const {primitives,...meta}=finish.compiled,surface=surfaceOnly(finish.compiled);
 ok(surface.length>50,'EMPTY_FINISHED_SCENE');
 const finalScene={...meta,surface,
  routeReview:finish.reroute,finishReview:finish.report,
  stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 const gallery={...prev.gallery,
  scenes:[...prev.gallery.scenes,finalScene],
  sourceHashes:[...prev.gallery.sourceHashes,finish.compiled.sourceSha256],
  geometryHashes:[...prev.gallery.geometryHashes,finish.compiled.geometrySha256]};
 ok(gallery.scenes.length===21&&
  gallery.scenes[17].id==='aurora-interchange-r0'&&
  gallery.scenes[18].id==='aurora-interchange-r1'&&
  gallery.scenes[19].id==='aurora-interchange-generated-candidate'&&
  gallery.scenes[20].id==='aurora-interchange-generated-finished'&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'HISTORICAL_GALLERY_OR_SAFETY');
 return {gallery,finish,previous:prev,constructionApproved:false,worldWrites:0};
}
export function renderB157Html(b,template){
 ok(b?.gallery?.scenes?.length===21,'VIEW_INPUT');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B157 / ARCHITECTURAL BRIDGE FINISH')
  .replace('B143 AI Architecture Studio','B157 Generated Bridge Architecture')
  .replace('ChatGPTが設計した新規建築','自動生成した空中橋 — 床・柵・支柱・立体ゲート')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   'R0断絶／R1人間設計／R2自動床だけ／R3自動仕上げ案の4段階を比較。自動設計の橋にガラス欄干・桁下支柱・照明・ゲートを追加し、経路に障害物がないことを再計算しました。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const marker='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(marker),'CONTROLS_MISSING');
 html=html.replace(marker,
  '<div class="info"><strong>B157：アルゴリズムによる建築仕上げ</strong><p>交通施設の19番目=手動完成案、20番目=自動床だけ、21番目=自動仕上げ案を比較できます。追加部材の存在は確認できますが、人の転落防止・支柱基礎・耐荷重は認証していません。</p></div>'+
  '<label class="toggle"><input type="checkbox" id="b157-route" checked> 2×2経路を重ねて表示</label>'+
  '<div id="b157-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。これは設計ボクセルと視覚化の検証です。Minecraftの実際のプレイヤー物理・ブロック互換・安全・施工は未認証。</div>'+
  marker);
 const sceneHook=' const s=scene();floor.max=';
 ok(html.includes(sceneHook),'SCENE_HOOK_MISSING');
 html=html.replace(sceneHook,[
  ' const s=scene();',
  ' const r=s.routeReview?.targets[0],f=s.finishReview,g=s.generationProof;',
  ' el("b157-status").textContent=r?',
  '   "2×2幾何検査："+r.status+" / "+(r.steps===null?"到達経路なし":r.steps+"水平移動")+',
  '   (f?" / 自動仕上げ"+f.finishingElementCount+"部材・柵"+f.guardrailPieces+"・支柱"+f.foundationPiers+"（安全未認証）":',
  '    g?" / 自動床のみ（構造・欄干要設計）":" / 手動設計モデル")+',
  '   "。Minecraft実機未認証。":',
  '   "このモデルにB157の経路評価はありません。交通施設R0・R1・R2・R3を選択。";',
  ' floor.max='
 ].join('\n'));
 const drawHook=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(drawHook),'DRAW_HOOK_MISSING');
 html=html.replace(drawHook,[
  ' ctx.globalAlpha=1;',
  ' const rt=s.routeReview?.targets[0];',
  ' if(el("b157-route").checked&&rt?.path?.length){',
  '  ctx.save();ctx.lineJoin="round";ctx.lineWidth=3;ctx.strokeStyle="#c4ffe1";',
  '  ctx.beginPath();rt.path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.18,p[2]+1);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(cb),'MISSING_EVENT');
 html=html.replace(cb,cb+
  '\nel("b157-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'INITIALIZATION');
 html=html.replace(init,'\nindex=20;select.value="20";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'NOT_STATIC');
 return html;
}
const HNAV='<div id="b157-finish-nav" style="padding:12px 24px;background:#22404c;color:#eefaf4"><strong>B157:</strong> 自動生成した橋の構造・欄干・照明仕上げ → <a style="color:#bbffe1" href="./ai/finished-bridge/">4段階の3D比較</a>（施工なし）</div>';
const ANAV='<div id="b157-finish-nav" class="info"><strong>B157:</strong> 空中橋の自動仕上げデザイン → <a style="color:#bbffe1" href="./finished-bridge/">4段階の3D比較</a></div>';
function update(dir,file,fn){
 const p=path.join(dir,file),v=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(v);fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
}
export function writeB157Site(b,dir=SITE){
 verifyB156Site(dir);
 const html=renderB157Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/finished-bridge'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/finished-bridge/index.html'),html);
 let root=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(root.includes('</header>')&&!root.includes('id="b157-finish-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b157-finish-nav"'),'NAV_CONFLICT');
 root=root.replace('</header>','</header>'+HNAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+ANAV);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=SHA(root));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json',
  'B155_MANIFEST.json','B156_MANIFEST.json']){
  update(dir,f,m=>{
   m.rootSha256=SHA(root);
   if('gallerySha256'in m)m.gallerySha256=SHA(ai);
   if('aiSha256'in m)m.aiSha256=SHA(ai);
  });
 }
 const parent=JSON.parse(read(dir,'B156_MANIFEST.json'));
 const report=b.finish.report;
 const manifest={
  schema:'minecraftaibuilder-b157-finished-bridge-gallery-v1',
  sceneCount:21,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  parentGeneratedSha256:report.parentCandidateSha256,
  finishSourceSha256:report.finishedSourceSha256,
  finishGeometrySha256:report.finishedGeometrySha256,
  finishProofSha256:report.sha256,
  addedElements:report.finishingElementCount,
  railingPieces:report.guardrailPieces,
  supportPiers:report.foundationPiers,
  portalFrames:report.portalFrames,lightStrips:report.lightingStrips,
  connectedFlatMoves:report.connectedFlatMoves,
  pageSha256:SHA(html),rootSha256:SHA(root),aiSha256:SHA(ai),
  inheritedB141Sha256:parent.inheritedB141Sha256,
  structuralStrengthCertified:false,
  playerCollisionCertified:false,constructionApproved:false,
  worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B157_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB157Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAIL');
 return manifest;
}
export function verifyB157Site(dir=SITE){
 verifyB156Site(dir);
 const b=makeB157Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1());
 const m=JSON.parse(read(dir,'B157_MANIFEST.json')),p=JSON.parse(read(dir,'B156_MANIFEST.json'));
 const root=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/finished-bridge/index.html');
 const proof=b.finish.report;
 ok(m.schema==='minecraftaibuilder-b157-finished-bridge-gallery-v1'&&
  m.sceneCount===21&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.parentGeneratedSha256===proof.parentCandidateSha256&&
  m.finishSourceSha256===proof.finishedSourceSha256&&
  m.finishGeometrySha256===proof.finishedGeometrySha256&&
  m.finishProofSha256===proof.sha256&&m.addedElements===14&&
  m.railingPieces===2&&m.supportPiers===2&&
  m.portalFrames===2&&m.lightStrips===2&&
  m.connectedFlatMoves===26&&
  m.pageSha256===SHA(html)&&
  m.pageSha256===SHA(renderB157Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===SHA(root)&&m.aiSha256===SHA(ai)&&
  m.inheritedB141Sha256===p.inheritedB141Sha256&&
  m.structuralStrengthCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  root.includes('id="b157-finish-nav"')&&ai.includes('id="b157-finish-nav"')&&
  html.includes('id="b157-status"'),'SITE_OR_SAFETY_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB157Site(),null,2));
  else{
   const bundle=makeB157Bundle(readDesigns(),readRevisionRequests(),
    readContinuations(),readStructuralRequests(),readRepairRequest(),
    readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
    readSkyDesign(),readBypassDesign(),readInterchangeR0(),readInterchangeR1());
   console.log(JSON.stringify({manifest:writeB157Site(bundle),status:bundle.finish.reroute.targets[0].status},null,2));
  }
 }catch(e){console.error('B157_HOLD:',e.message);process.exitCode=1;}
}
