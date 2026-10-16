/**
 * B149: immutable freeform hangar interior + verified flat-geometry route review.
 * A static read-only Canvas viewer, NOT a Minecraft controller.
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
import {makeB148Bundle,verifyB148Site} from './build-b148-site.mjs';
import {compileDesign,verifyCompiled,validateDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeTraversability,verifyTraversability} from '../source/ai/b149-traversability.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const DESIGN=path.join(ROOT,'designs/ai/interiors/stratos-observatory-interior-r1.json');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const h=x=>createHash('sha256').update(x).digest('hex');
const read=(d,p)=>fs.readFileSync(path.join(d,p),'utf8');
const ok=(b,m)=>{if(!b)throw Error('B149_'+m);};
export const WAYPOINTS=Object.freeze({
 entrance:[40,10,2],
 destinations:[
  {id:'hangar-hall',at:[40,10,10]},
  {id:'hangar-inner',at:[40,10,16]},
  {id:'atrium-deck',at:[45,13,36]}
 ]
});
export function readInteriorDesign(){return JSON.parse(fs.readFileSync(DESIGN,'utf8'));}
export function makeB149Bundle(original,r2,r3,r4,repair,interior){
 const prev=makeB148Bundle(original,r2,r3,r4,repair);
 const orig=original.find(d=>d.id==='stratos-observatory');
 ok(orig&&interior?.id==='stratos-observatory-interior-r1'&&
  interior.schema===orig.schema&&interior.designOnly===true&&
  JSON.stringify(interior.bounds)===JSON.stringify(orig.bounds)&&
  JSON.stringify(interior.elements.slice(0,orig.elements.length))===JSON.stringify(orig.elements)&&
  interior.elements.length>orig.elements.length,'ORIGINAL_NOT_PRESERVED');
 validateDesign(interior);
 const before=compileDesign(orig),after=compileDesign(interior);
 ok(verifyCompiled(interior,after)&&before.geometrySha256!==after.geometrySha256,
  'NO_MEANINGFUL_INTERIOR');
 const prior=analyzeTraversability(before,WAYPOINTS);
 const improved=analyzeTraversability(after,WAYPOINTS);
 ok(verifyTraversability(after,WAYPOINTS,improved)&&
  prior.routes.every(r=>r.status==='INVALID_ENTRANCE')&&
  improved.routes.slice(0,2).every(r=>r.status==='PASS_FLAT_GEOMETRY'&&r.flatSteps>0)&&
  improved.standingCells>prior.standingCells&&
  improved.constructionApproved===false&&improved.worldContacts===0,
  'HANGAR_WALKABILITY_NOT_IMPROVED');
 const {primitives,...meta}=after;
 const surface=surfaceOnly(after);
 ok(surface.length>50,'NO_SURFACE');
 const gallery={...prev.gallery,
  scenes:[...prev.gallery.scenes,{...meta,surface,interiorReview:improved,
   stats:{...meta.stats,renderedSurfaceCells:surface.length}}],
  sourceHashes:[...prev.gallery.sourceHashes,after.sourceSha256],
  geometryHashes:[...prev.gallery.geometryHashes,after.geometrySha256]};
 ok(gallery.scenes.length===12&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'INVALID_GALLERY');
 return {gallery,improved,prior,
  sourceProof:{parentId:orig.id,parentSourceSha256:before.sourceSha256,
   childSourceSha256:after.sourceSha256,childGeometrySha256:after.geometrySha256,
   parentElementCount:orig.elements.length,childElementCount:interior.elements.length,
   originalPreserved:true,constructionApproved:false,worldWrites:0,
   readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}}};
}
export function renderB149Html(bundle,template){
 ok(bundle?.gallery?.scenes?.length===12&&bundle?.improved?.routes?.length===3,
  'INVALID_VIEW_BUNDLE');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B149 / INTERIOR WALKABILITY REVIEW')
  .replace('B143 AI Architecture Studio','B149 Interior Traversability Studio')
  .replace('ChatGPTが設計した新規建築','研究所：格納庫内部と移動経路を改修')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '旧設計を保持して、格納庫の欠損床・仕切り・ホール・通過用開口を改修。線は床上に立てる2ブロック空間を持つ同一高さの幾何学的な経路です。実機歩行や階段は未認証。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const controls='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(controls),'MISSING_CONTROLS');
 const changed='<div class="info"><strong>B149 格納庫R1：</strong> 出入口床を補修し、内部の仕切りと通過開口を設計。旧設計では入口が無効、新設計ではホールまで同じ高さの空間経路が成立しました。強度・扉・階段・実ワールド動作は未証明です。</div>'+
  '<label for="routeTarget">検証する目的地</label><select id="routeTarget"><option value="hangar-hall">格納庫ホール</option><option value="hangar-inner">奥の内部通路</option><option value="atrium-deck">中央観測施設（未連結を判別）</option></select>'+
  '<label class="toggle"><input id="showRoute" type="checkbox" checked> 幾何学経路を黄色で表示</label>'+
  '<div id="routeStatus" role="status" aria-live="polite" class="info"></div>'+
  '<div class="info warn"><strong>NOT_PREPARED / 9 BLOCKED。</strong> 1段の高さ変化は通行候補であり階段として認証していません。地下・屋根・地盤・Minecraft Educationブロック互換性・実際の歩行は未検証。ワールドへの書き込み0。</div>';
 html=html.replace(controls,changed+controls);
 const hook=' const s=scene();floor.max=';
 ok(html.includes(hook),'MISSING_SCENE_HOOK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const target=el("routeTarget").value;',
  ' const r=s.interiorReview?.routes.find(x=>x.id===target);',
  ' el("routeStatus").textContent=r?',
  '   "経路判定: "+r.status+" / "+(r.flatSteps===null?"距離未測定":r.flatSteps+" 平面ステップ")+',
  '   "。床支持セルと頭上2セルのみ判定。実機通行・階段は未認証。":',
  '   "この世代に移動判定はありません。最後の格納庫R1を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const drawHook=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(drawHook),'MISSING_DRAW_HOOK');
 html=html.replace(drawHook,[
  ' ctx.globalAlpha=1;',
  ' const activeRoute=s.interiorReview?.routes.find(r=>r.id===el("routeTarget").value);',
  ' if(el("showRoute").checked&&activeRoute?.status==="PASS_FLAT_GEOMETRY"){',
  '  ctx.save();ctx.strokeStyle="#ffe76a";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();activeRoute.path.forEach((p,i)=>{',
  '   const q=project(p[0]+.5,p[1]+.08,p[2]+.5);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const controlHook='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(controlHook),'MISSING_CONTROL_HOOK');
 html=html.replace(controlHook,controlHook+
  '\nel("routeTarget").addEventListener("change",setScene);'+
  '\nel("showRoute").addEventListener("change",drawSoon);');
 const setHook='\nsetScene();\n</script>';
 ok(html.includes(setHook),'MISSING_INITIALIZATION');
 html=html.replace(setHook,'\nindex=11;select.value="11";setScene();\n</script>');
 ok(!html.includes('__B143_GALLERY_JSON__')&&!html.includes('fetch(')&&
  html.includes('id="routeTarget"'),'INVALID_HTML');
 return html;
}
const ROOTNAV='<div id="b149-interior-navigation" style="padding:12px 24px;background:#234057;color:#edfcff;border-bottom:1px solid #318993"><strong>B149 NEW:</strong> 自由建築に入口と内部の歩行経路を追加 → <a style="color:#ffe57a" href="./ai/interiors/">格納庫の改修・経路3Dレビュー</a>（実機施工なし）</div>';
const AINAV='<div id="b149-interior-navigation" class="info"><strong>B149 NEW:</strong> 格納庫の内部歩行可能性 → <a style="color:#ffe57a" href="./interiors/">内部通路を見る</a></div>';
function touch(dir,name,fn){
 const p=path.join(dir,name),obj=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(obj);fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');
}
export function writeB149Site(bundle,dir=SITE){
 verifyB148Site(dir);
 const html=renderB149Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/interiors'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/interiors/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(home.includes('</header>')&&!home.includes('id="b149-interior-navigation"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&!ai.includes('id="b149-interior-navigation"'),
  'NAV_CONFLICT');
 home=home.replace('</header>','</header>'+ROOTNAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 touch(dir,'manifest.json',m=>m.htmlSha256=h(home));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json']){
  touch(dir,f,m=>{m.rootSha256=h(home);
   if('gallerySha256'in m)m.gallerySha256=h(ai);
   if('aiSha256'in m)m.aiSha256=h(ai);
  });
 }
 const last=JSON.parse(read(dir,'B148_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b149-interior-traversability-site-v1',
  modelCount:12,parentSourceSha256:bundle.sourceProof.parentSourceSha256,
  childSourceSha256:bundle.sourceProof.childSourceSha256,
  childGeometrySha256:bundle.sourceProof.childGeometrySha256,
  originalPreserved:bundle.sourceProof.originalPreserved,
  beforeEntranceStatus:bundle.prior.routes[0].status,
  newRouteStatuses:bundle.improved.routes.map(x=>x.status),
  travelProofSha256:bundle.improved.sha256,
  pageSha256:h(html),rootSha256:h(home),aiSha256:h(ai),
  inheritedB141Sha256:last.inheritedB141Sha256,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(path.join(dir,'B149_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB149Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB149Site(dir=SITE){
 verifyB148Site(dir);
 const b=makeB149Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign());
 const m=JSON.parse(read(dir,'B149_MANIFEST.json'));
 const prev=JSON.parse(read(dir,'B148_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),page=read(dir,'ai/interiors/index.html');
 ok(m.schema==='minecraftaibuilder-b149-interior-traversability-site-v1'&&m.modelCount===12&&
  m.parentSourceSha256===b.sourceProof.parentSourceSha256&&
  m.childSourceSha256===b.sourceProof.childSourceSha256&&
  m.childGeometrySha256===b.sourceProof.childGeometrySha256&&
  m.originalPreserved===true&&m.beforeEntranceStatus==='INVALID_ENTRANCE'&&
  JSON.stringify(m.newRouteStatuses)===JSON.stringify(b.improved.routes.map(x=>x.status))&&
  m.newRouteStatuses.slice(0,2).every(s=>s==='PASS_FLAT_GEOMETRY')&&
  m.travelProofSha256===b.improved.sha256&&
  m.pageSha256===h(page)&&
  m.pageSha256===h(renderB149Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===h(home)&&m.aiSha256===h(ai)&&
  m.inheritedB141Sha256===prev.inheritedB141Sha256&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.BuildPlan.operations.length===0&&m.gates.length===9&&
  m.gates.every(x=>x==='BLOCKED')&&
  home.includes('id="b149-interior-navigation"')&&
  ai.includes('id="b149-interior-navigation"')&&page.includes('id="routeTarget"'),
  'UNVERIFIED_SITE');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB149Site(),null,2));
  else{
   const b=makeB149Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign());
   console.log(JSON.stringify({manifest:writeB149Site(b),routeResults:b.improved.routes.map(r=>({
    id:r.id,status:r.status,steps:r.flatSteps}))},null,2));
  }
 }catch(e){console.error('B149_HOLD:',e.message);process.exitCode=1;}
}
