/**
 * B158 static 3D design gallery: 21 preserved architectural scenes, and two
 * NEW Helios Freight Harbor designs: disconnected R0 and north-south fully
 * parametric B157 finisher R1. No executable game-world instructions.
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
import {makeB157Bundle,verifyB157Site} from './build-b157-site.mjs';
import {reviewAxisTransfer,verifyAxisTransfer} from '../source/ai/b158-axis-transfer.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const ARCH=path.join(ROOT,'designs/ai/interiors/helios-freight-harbor-r0.json');
const read=(dir,p)=>fs.readFileSync(path.join(dir,p),'utf8');
const SHA=x=>createHash('sha256').update(x).digest('hex');
const ok=(v,id)=>{if(!v)throw Error('B158_'+id);};
export const HELIOS_PROPOSAL={
 start:[44,19,31],goal:[44,19,69],
 footprintWidth:2,footprintDepth:2,corridorWidth:8,maxSpan:48
};
export function readHeliosR0(){return JSON.parse(fs.readFileSync(ARCH,'utf8'));}
export function makeB158Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios){
 const parent=makeB157Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1);
 ok(helios?.id==='helios-freight-harbor-r0'&&
  helios?.designOnly===true&&
  helios?.bounds?.depth>helios?.bounds?.width&&
  JSON.stringify(helios)!==JSON.stringify(t0),'NEW_ARCHITECTURE_MISSING');
 const axis=reviewAxisTransfer(t0,TRANSIT_PROPOSAL,helios,HELIOS_PROPOSAL);
 ok(verifyAxisTransfer(t0,TRANSIT_PROPOSAL,helios,HELIOS_PROPOSAL,axis.report)&&
  axis.east.report.sha256===parent.finish.report.sha256&&
  axis.report.bridgeAxes.join(',')==='x,z'&&axis.report.testedBuildingCount===2&&
  axis.north.report.connectedFlatMoves===38&&
  axis.north.report.finishingElementCount===14&&
  axis.north.generated.before.targets[0].status==='FOOTPRINT_UNREACHABLE'&&
  axis.north.reroute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  axis.north.reroute.targets[0].path.every(p=>p[1]===HELIOS_PROPOSAL.start[1])&&
  axis.north.report.structuralStrengthCertified===false&&
  axis.north.report.playerCollisionCertified===false&&
  axis.north.report.constructionApproved===false,'Z_AXIS_DISCONNECTED_OR_FAILED');
 const makeScene=(compiled,route,proof)=>{
  const {primitives,...meta}=compiled,surface=surfaceOnly(compiled);
  ok(surface.length>50,'EMPTY_RENDERED_SCENE');
  return {...meta,surface,routeReview:route,
   ...(proof?{finishReview:proof}:{}),
   stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 };
 const before=makeScene(axis.north.generated.baseline,axis.north.generated.before);
 const after=makeScene(axis.north.compiled,axis.north.reroute,axis.north.report);
 const gallery={...parent.gallery,
  scenes:[...parent.gallery.scenes,before,after],
  sourceHashes:[...parent.gallery.sourceHashes,
   axis.north.generated.baseline.sourceSha256,axis.north.compiled.sourceSha256],
  geometryHashes:[...parent.gallery.geometryHashes,
   axis.north.generated.baseline.geometrySha256,axis.north.compiled.geometrySha256]};
 ok(gallery.scenes.length===23&&
  gallery.scenes[20].id==='aurora-interchange-generated-finished'&&
  gallery.scenes[21].id==='helios-freight-harbor-r0'&&
  gallery.scenes[22].id==='helios-freight-harbor-generated-finished'&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'GALLERY_HISTORY_OR_SAFETY');
 return {gallery,parent,axis,constructionApproved:false,worldWrites:0};
}
export function renderB158Html(b,template){
 ok(b?.gallery?.scenes.length===23,'INVALID_VIEW');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B158 / CROSS-AXIS FREIGHT SKYBRIDGE')
  .replace('B143 AI Architecture Studio','B158 Helios Freight Harbor')
  .replace('ChatGPTが設計した新規建築','HELIOS — 南北貨物宇宙港と自動生成スカイブリッジ')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   'HELIOS R0の分断された南北ターミナルと、R1の自動生成した貨物連絡橋を3Dで比較。以前の東西AURORA橋と同じ設計エンジンがZ方向にも機能するかを検査します。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const marker='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(marker),'MISSING_GALLERY_CONTROLS');
 html=html.replace(marker,
  '<div class="info"><strong>B158：東西・南北の独立した大型建築2例</strong>。22番目のHELIOS分断モデルから23番目の自動橋完成案に切り替えると、ガラス柵・橋桁・支柱・照明が追加されます。東西型は21番目のAURORA完成案です。</div>'+
  '<label class="toggle"><input type="checkbox" id="b158-route" checked> 2×2占有領域の水平経路を表示</label>'+
  '<div id="b158-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。床支持と空間を表す局所ボクセルの設計結果です。強度、転落防止、プレイヤー物理、ワールド施工は未認証。</div>'+
  marker);
 const hook=' const s=scene();floor.max=';
 ok(html.includes(hook),'SCENE_EVENT_MISSING');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const route=s.routeReview?.targets[0],finish=s.finishReview;',
  ' el("b158-status").textContent=route?',
  '   "2×2連絡経路: "+route.status+" / "+',
  '   (route.steps===null?"到達経路なし":route.steps+"水平移動")+',
  '   (finish?" / 自動仕上げ "+finish.finishingElementCount+"部材、橋の強度は未認証":" / 連絡橋なし")+',
  '   "（Minecraft実機未認証）":',
  '   "このモデルにB158の経路検証はありません。HELIOS R0/R1を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(draw),'DRAW_EVENT_MISSING');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const route=s.routeReview?.targets[0];',
  ' if(el("b158-route").checked&&route?.path?.length){',
  '  ctx.save();ctx.strokeStyle="#b8fce5";ctx.lineWidth=3;',
  '  ctx.beginPath();route.path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.15,p[2]+1);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(cb),'CONTROLS_LISTENER_MISSING');
 html=html.replace(cb,cb+'\nel("b158-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'GALLERY_INIT_MISSING');
 html=html.replace(init,'\nindex=22;select.value="22";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_HTML');
 return html;
}
const ROOT_NAV='<div id="b158-helios-nav" style="padding:12px 24px;background:#244250;color:#eaffe9"><strong>B158:</strong> 新規巨大南北貨物ハーバーと自動設計の完成橋 → <a style="color:#b7ffde" href="./ai/helios/">3D比較</a>（施工なし）</div>';
const AI_NAV='<div id="b158-helios-nav" class="info"><strong>B158:</strong> 南北HELIOS自動連絡橋 → <a style="color:#b7ffde" href="./helios/">3D表示</a></div>';
const update=(dir,file,cb)=>{
 const loc=path.join(dir,file),m=JSON.parse(fs.readFileSync(loc,'utf8'));
 cb(m);fs.writeFileSync(loc,JSON.stringify(m,null,2)+'\n');
};
export function writeB158Site(b,dir=SITE){
 verifyB157Site(dir);
 const html=renderB158Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/helios'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/helios/index.html'),html);
 let root=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(root.includes('</header>')&&!root.includes('id="b158-helios-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b158-helios-nav"'),'NAVIGATION_NOT_SAFE');
 root=root.replace('</header>','</header>'+ROOT_NAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AI_NAV);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=SHA(root));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json',
  'B155_MANIFEST.json','B156_MANIFEST.json','B157_MANIFEST.json']){
  update(dir,f,m=>{
   m.rootSha256=SHA(root);
   if('gallerySha256'in m)m.gallerySha256=SHA(ai);
   if('aiSha256'in m)m.aiSha256=SHA(ai);
  });
 }
 const prior=JSON.parse(read(dir,'B157_MANIFEST.json'));
 const m={
  schema:'minecraftaibuilder-b158-multiaxis-helios-v1',
  sceneCount:23,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  crossAxisProofSha256:b.axis.report.sha256,
  eastProofSha256:b.axis.east.report.sha256,
  northProofSha256:b.axis.north.report.sha256,
  northSourceSha256:b.axis.north.compiled.sourceSha256,
  northGeometrySha256:b.axis.north.compiled.geometrySha256,
  missingBridgeStatus:b.axis.north.generated.before.targets[0].status,
  finishedBridgeStatus:b.axis.north.reroute.targets[0].status,
  eastPathMoves:b.axis.east.report.connectedFlatMoves,
  northPathMoves:b.axis.north.report.connectedFlatMoves,
  addedFinishingElements:b.axis.north.report.finishingElementCount,
  testedAxes:b.axis.report.bridgeAxes,
  pageSha256:SHA(html),rootSha256:SHA(root),aiSha256:SHA(ai),
  inheritedB141Sha256:prior.inheritedB141Sha256,
  structuralStrengthCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(path.join(dir,'B158_MANIFEST.json'),JSON.stringify(m,null,2)+'\n');
 ok(JSON.stringify(verifyB158Site(dir))===JSON.stringify(m),'POSTWRITE_VERIFY');
 return m;
}
export function verifyB158Site(dir=SITE){
 verifyB157Site(dir);
 const b=makeB158Bundle(readDesigns(),readRevisionRequests(),
  readContinuations(),readStructuralRequests(),readRepairRequest(),
  readInteriorDesign(),readUpperDesign(),readWideDesign(),readLoopDesign(),
  readSkyDesign(),readBypassDesign(),readInterchangeR0(),readInterchangeR1(),readHeliosR0());
 const m=JSON.parse(read(dir,'B158_MANIFEST.json')),p=JSON.parse(read(dir,'B157_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/helios/index.html');
 ok(m.schema==='minecraftaibuilder-b158-multiaxis-helios-v1'&&
  m.sceneCount===23&&
  m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.crossAxisProofSha256===b.axis.report.sha256&&
  m.eastProofSha256===b.axis.east.report.sha256&&
  m.northProofSha256===b.axis.north.report.sha256&&
  m.northSourceSha256===b.axis.north.compiled.sourceSha256&&
  m.northGeometrySha256===b.axis.north.compiled.geometrySha256&&
  m.missingBridgeStatus==='FOOTPRINT_UNREACHABLE'&&
  m.finishedBridgeStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.eastPathMoves===26&&m.northPathMoves===38&&
  m.addedFinishingElements===14&&m.testedAxes.join(',')==='x,z'&&
  m.pageSha256===SHA(html)&&
  m.pageSha256===SHA(renderB158Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===SHA(home)&&m.aiSha256===SHA(ai)&&
  m.inheritedB141Sha256===p.inheritedB141Sha256&&
  m.structuralStrengthCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(x=>x==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  home.includes('id="b158-helios-nav"')&&
  ai.includes('id="b158-helios-nav"')&&
  html.includes('id="b158-route"'),'SOURCE_GATES_OR_HTML');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB158Site(),null,2));
  else{
   const b=makeB158Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
    readBypassDesign(),readInterchangeR0(),readInterchangeR1(),readHeliosR0());
   console.log(JSON.stringify({manifest:writeB158Site(b),
    path:b.axis.north.reroute.targets[0].status},null,2));
  }
 }catch(e){console.error('B158_HOLD',e.message);process.exitCode=1;}
}
