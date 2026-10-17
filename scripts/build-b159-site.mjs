/**
 * B159: 25-scene offline gallery for disconnected POLARIS and automatically
 * selected non-obstructed L-shaped bridge. Full source pinning to B141.
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
import {readHeliosR0,makeB158Bundle,verifyB158Site} from './build-b158-site.mjs';
import {buildFinishedBentBridge,verifyFinishedBentBridge} from '../source/ai/b159-bent-skybridge.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const POLARIS=path.join(ROOT,'designs/ai/interiors/polaris-orbital-switchyard-r0.json');
const SHA=s=>createHash('sha256').update(s).digest('hex');
const read=(dir,f)=>fs.readFileSync(path.join(dir,f),'utf8');
const check=(v,msg)=>{if(!v)throw Error('B159_'+msg);};
export const POLARIS_ROUTE={start:[25,19,28],goal:[62,19,64],
 footprintWidth:2,footprintDepth:2,corridorWidth:8};
export function readPolarisR0(){return JSON.parse(fs.readFileSync(POLARIS,'utf8'));}
export function makeB159Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris){
 const parent=makeB158Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios);
 check(polaris?.id==='polaris-orbital-switchyard-r0'&&
  polaris?.designOnly===true&&polaris?.elements?.length>=25&&
  polaris.id!==helios.id&&polaris.id!==t0.id,'NOT_AN_INDEPENDENT_BUILDING');
 const result=buildFinishedBentBridge(polaris,POLARIS_ROUTE);
 check(verifyFinishedBentBridge(polaris,POLARIS_ROUTE,result.finishReport)&&
  result.attempts.length===2&&
  result.attempts[0].status==='FOOTPRINT_UNREACHABLE'&&
  result.attempts[1].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  result.selected.bend==='Z_THEN_X'&&
  result.route.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  result.route.targets[0].steps===73&&
  result.finishReport.finishingElements===16&&
  result.finishReport.playerCollisionCertified===false&&
  result.finishReport.structuralStrengthCertified===false&&
  result.finishReport.constructionApproved===false,'BEND_SELECTION_OR_HOLD');
 const asScene=(compiled,proof,plan)=>{
  const {primitives,...meta}=compiled,surface=surfaceOnly(compiled);
  check(surface.length>60,'GALLERY_SURFACE_MISSING');
  return {...meta,surface,routeReview:proof,
   ...(plan?{bendReview:plan}:{}),
   stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 };
 const gallery={...parent.gallery,
  scenes:[...parent.gallery.scenes,
   asScene(result.source,result.before,null),
   asScene(result.compiled,result.route,result.finishReport)],
  sourceHashes:[...parent.gallery.sourceHashes,
   result.source.sourceSha256,result.compiled.sourceSha256],
  geometryHashes:[...parent.gallery.geometryHashes,
   result.source.geometrySha256,result.compiled.geometrySha256]};
 check(gallery.scenes.length===25&&
  gallery.scenes[22].id==='helios-freight-harbor-generated-finished'&&
  gallery.scenes[23].id==='polaris-orbital-switchyard-r0'&&
  gallery.scenes[24].id==='polaris-orbital-switchyard-generated-bent'&&
  gallery.safety.minecraftWrites===0&&gallery.safety.BuildPlan.operations.length===0,
  'ANCESTOR_GALLERY_MODIFIED');
 return {gallery,parent,result,constructionApproved:false,worldWrites:0};
}
export function renderB159Html(b,template){
 check(b?.gallery?.scenes?.length===25,'BAD_RENDER_INPUT');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B159 / ORTHOGONAL SKYBRIDGE REPAIR')
  .replace('B143 AI Architecture Studio','B159 POLARIS Switchyard')
  .replace('ChatGPTが設計した新規建築','POLARIS — 閉塞したL字経路から通れる側を自動選択')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '巨大光輪と研究ドームの対角線上のターミナルを、L字連絡回廊で接続。2つの曲がり方を試して安全な床占有領域だけを選択する設計用エンジン。橋梁強度・実機移動は未認証。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const control='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(control),'CONTROLS_NOT_FOUND');
 html=html.replace(control,
  '<div class="info"><strong>B159：迂回の自動選択</strong><p>24番目はPOLARIS分断モデル、25番目は採用されたL字橋。南東側の曲がり角は巨大マストで閉塞するため、北西側を回る経路を生成します。床や柵のデザインは施工指示ではありません。</p></div>'+
  '<label class="toggle"><input type="checkbox" id="b159-route" checked> 2×2全セル経路を表示</label>'+
  '<div id="b159-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED：Minecraftプレイヤーの移動、転落防止・構造計算・実ワールド施工を認証していません。</div>'+
  control);
 const sceneHook=' const s=scene();floor.max=';
 check(html.includes(sceneHook),'SCENE_HOOK_MISSING');
 html=html.replace(sceneHook,[
  ' const s=scene();',
  ' const isPolaris=s.id===\"polaris-orbital-switchyard-r0\"||s.id===\"polaris-orbital-switchyard-generated-bent\";',
  ' const r=isPolaris?s.routeReview?.targets[0]:null,b=isPolaris?s.bendReview:null;',
  ' el("b159-status").textContent=r?',
  '  "2×2経路："+r.status+" / "+(r.steps===null?"接続経路なし":r.steps+"水平移動")+',
  '  (b?" / 採用："+b.selectedBend+"・仕上げ"+b.finishingElements+"部材":" / 基準の未連結ターミナル")+',
  '  "（Minecraft実機は未認証）":',
  '  "このモデルにはB159の経路診断はありません。POLARISのR0か自動修復案を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const drawing=' ctx.globalAlpha=1;\n el("meta").textContent=';
 check(html.includes(drawing),'DRAW_HOOK_MISSING');
 html=html.replace(drawing,[
  ' ctx.globalAlpha=1;',
  ' const rt=isPolaris?s.routeReview?.targets[0]:null;',
  ' if(el("b159-route").checked&&rt?.path?.length){',
  '  ctx.save();ctx.lineWidth=3;ctx.strokeStyle="#a5ffde";ctx.lineJoin="round";',
  '  ctx.beginPath();rt.path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.15,p[2]+1);',
  '   if(!i)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const change='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 check(html.includes(change),'EVENT_HOOK_MISSING');
 html=html.replace(change,change+'\nel("b159-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 check(html.includes(init),'STARTUP_HOOK_MISSING');
 html=html.replace(init,'\nindex=24;select.value="24";setScene();\n</script>');
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'NOT_A_STATIC_PAGE');
 return html;
}
const NAV_HOME='<div id="b159-polaris-nav" style="padding:12px 24px;background:#26444b;color:#f4fff9"><strong>B159:</strong> 巨大POLARIS宇宙港のL字連絡回廊を自動修復 → <a style="color:#b5ffe2" href="./ai/polaris/">3D比較を開く</a>（未施工）</div>';
const NAV_AI='<div id="b159-polaris-nav" class="info"><strong>B159:</strong> 障害物を避けたL字空中回廊 → <a style="color:#b5ffe2" href="./polaris/">POLARIS 3D</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),m=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(m);fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
}
export function writeB159Site(b,dir=SITE){
 verifyB158Site(dir);
 const html=renderB159Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/polaris'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/polaris/index.html'),html);
 let root=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 check(root.includes('</header>')&&!root.includes('id="b159-polaris-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b159-polaris-nav"'),'NAVIGATION_FAILED');
 root=root.replace('</header>','</header>'+NAV_HOME);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+NAV_AI);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=SHA(root));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json',
  'B155_MANIFEST.json','B156_MANIFEST.json','B157_MANIFEST.json','B158_MANIFEST.json']){
  edit(dir,f,m=>{
   m.rootSha256=SHA(root);
   if('gallerySha256'in m)m.gallerySha256=SHA(ai);
   if('aiSha256'in m)m.aiSha256=SHA(ai);
  });
 }
 const parent=JSON.parse(read(dir,'B158_MANIFEST.json'));
 const x=b.result,y=x.finishReport;
 const manifest={
  schema:'minecraftaibuilder-b159-orthogonal-bend-v1',
  sceneCount:25,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  sourceSha256:x.source.sourceSha256,
  chosenSourceSha256:x.compiled.sourceSha256,
  chosenGeometrySha256:x.compiled.geometrySha256,
  candidateReviewSha256:x.report.sha256,finishingProofSha256:y.sha256,
  rejectedBend:x.attempts[0].bend,
  rejectedBendStatus:x.attempts[0].status,
  selectedBend:x.selected.bend,
  selectedBendStatus:x.attempts[1].status,
  moves:y.moves,finishingElements:y.finishingElements,
  twoFloorBoxes:y.floorBoxes,
  pageSha256:SHA(html),rootSha256:SHA(root),aiSha256:SHA(ai),
  inheritedB141Sha256:parent.inheritedB141Sha256,
  structuralStrengthCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(path.join(dir,'B159_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 check(JSON.stringify(verifyB159Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB159Site(dir=SITE){
 verifyB158Site(dir);
 const b=makeB159Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0());
 const m=JSON.parse(read(dir,'B159_MANIFEST.json')),p=JSON.parse(read(dir,'B158_MANIFEST.json'));
 const root=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/polaris/index.html');
 check(m.schema==='minecraftaibuilder-b159-orthogonal-bend-v1'&&
  m.sceneCount===25&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.sourceSha256===b.result.source.sourceSha256&&
  m.chosenSourceSha256===b.result.compiled.sourceSha256&&
  m.chosenGeometrySha256===b.result.compiled.geometrySha256&&
  m.candidateReviewSha256===b.result.report.sha256&&
  m.finishingProofSha256===b.result.finishReport.sha256&&
  m.rejectedBend==='X_THEN_Z'&&m.rejectedBendStatus==='FOOTPRINT_UNREACHABLE'&&
  m.selectedBend==='Z_THEN_X'&&
  m.selectedBendStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.moves===73&&m.finishingElements===16&&m.twoFloorBoxes===2&&
  m.pageSha256===SHA(html)&&
  m.pageSha256===SHA(renderB159Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===SHA(root)&&m.aiSha256===SHA(ai)&&
  m.inheritedB141Sha256===p.inheritedB141Sha256&&
  m.structuralStrengthCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(x=>x==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  root.includes('id="b159-polaris-nav"')&&ai.includes('id="b159-polaris-nav"')&&
  html.includes('id="b159-route"'),'SOURCE_PROOF_OR_SAFETY_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB159Site(),null,2));
  else{
   const b=makeB159Bundle(readDesigns(),readRevisionRequests(),
    readContinuations(),readStructuralRequests(),readRepairRequest(),
    readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
    readSkyDesign(),readBypassDesign(),readInterchangeR0(),
    readInterchangeR1(),readHeliosR0(),readPolarisR0());
   console.log(JSON.stringify({manifest:writeB159Site(b),
    status:b.result.route.targets[0].status},null,2));
  }
 }catch(e){console.error('B159_HOLD:',e.message);process.exitCode=1;}
}
