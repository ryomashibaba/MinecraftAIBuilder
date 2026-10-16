/**
 * B151 — actual R3 widening of B150 hallway/chokepoints, plus bounded
 * generic clearance witness and flat floor-island review.
 * Design preview only: no Minecraft commands or world coordinates.
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
import {readUpperDesign,WAYPOINTS,makeB150Bundle,verifyB150Site} from './build-b150-site.mjs';
import {compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {analyzeVerticalCandidates,verifyVerticalCandidates} from '../source/ai/b150-vertical-candidates.mjs';
import {analyzeClearance,verifyClearance} from '../source/ai/b151-clearance-review.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const DESIGN=path.join(ROOT,'designs/ai/interiors/stratos-observatory-interior-r3.json');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const SHA=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const ok=(b,why)=>{if(!b)throw Error('B151_'+why);};
export function readWideDesign(){return JSON.parse(fs.readFileSync(DESIGN,'utf8'));}
export function makeB151Bundle(original,r2,r3,r4,repair,interiorR1,interiorR2,interiorR3){
 const prev=makeB150Bundle(original,r2,r3,r4,repair,interiorR1,interiorR2);
 ok(interiorR3?.id==='stratos-observatory-interior-r3'&&
  JSON.stringify(interiorR3.bounds)===JSON.stringify(interiorR2.bounds)&&
  JSON.stringify(interiorR3.elements.slice(0,interiorR2.elements.length))===
   JSON.stringify(interiorR2.elements)&&
  interiorR3.elements.length>interiorR2.elements.length,'HISTORY_MUTATED');
 validateDesign(interiorR3);
 const before=compileDesign(interiorR2),after=compileDesign(interiorR3);
 ok(verifyCompiled(interiorR3,after)&&before.geometrySha256!==after.geometrySha256,
  'INVALID_R3_VOXELS');
 const args={minWidth:5,maxWidth:24};
 const oldWidth=analyzeClearance(before,prev.newPath,args);
 const v3=analyzeVerticalCandidates(after,WAYPOINTS);
 const newWidth=analyzeClearance(after,v3,args);
 ok(verifyVerticalCandidates(after,WAYPOINTS,v3)&&
  verifyClearance(after,v3,args,newWidth)&&
  v3.routes[2].status==='STEP_CANDIDATE_ONLY'&&
  v3.routes[2].stepCandidateCount>=3&&
  oldWidth.routes[2].narrowPointCount>0&&
  newWidth.routes[2].narrowPointCount<oldWidth.routes[2].narrowPointCount&&
  newWidth.routes[2].minCrossSectionWidth>=5&&
  newWidth.routes[2].widthStatus==='PASS_WIDTH_GEOMETRY'&&
  v3.stairsCertified===false&&newWidth.stairsCertified===false,
  'REAL_R3_DOES_NOT_WIDEN_ROUTE');
 const oldScene={...prev.gallery.scenes[12],clearanceReview:oldWidth};
 const {primitives,...meta}=after,surface=surfaceOnly(after);
 ok(surface.length>50,'NO_RENDER_SURFACE');
 const scenes=[...prev.gallery.scenes.slice(0,12),oldScene,
  {...meta,surface,verticalReview:v3,clearanceReview:newWidth,
   stats:{...meta.stats,renderedSurfaceCells:surface.length}}];
 const gallery={...prev.gallery,scenes,
  sourceHashes:[...prev.gallery.sourceHashes,after.sourceSha256],
  geometryHashes:[...prev.gallery.geometryHashes,after.geometrySha256]};
 ok(gallery.scenes.length===14&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'SAFETY_HOLD');
 return {gallery,oldWidth,newWidth,oldPath:prev.newPath,newPath:v3,
  parentSourceSha256:before.sourceSha256,childSourceSha256:after.sourceSha256,
  childGeometrySha256:after.geometrySha256,constructionApproved:false,worldWrites:0};
}
export function renderB151Html(bundle,template){
 ok(bundle?.gallery?.scenes?.length===14&&bundle.newWidth.routes.length===3,'VIEW_INPUT');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B151 / CORRIDOR CLEARANCE EVIDENCE')
  .replace('B143 AI Architecture Studio','B151 Wide Corridor Studio')
  .replace('ChatGPTが設計した新規建築','格納庫R2・R3：実断面の拡幅比較')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '元の13モデルとR3拡幅改修案。赤い点は幾何学的な通路幅不足、緑系ラインは床支持と頭上2セルのある経路。段差は依然として実機未認証です。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const marker='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(marker),'MISSING_CONTROLS');
 html=html.replace(marker,
  '<div class="info"><strong>B151：幅5回廊に実改修</strong><p>R2とR3をモデル切替で比較。屋内の仕切り開口・段状連絡部・上層デッキ開口を5ブロック幅に拡張し、通路の最小幅を診断します。階段移動は未認証です。</p></div>'+
  '<label for="b151-route">幅を評価する経路</label><select id="b151-route"><option value="upper-deck">上層デッキ（高さ変化あり）</option><option value="hangar-inner">格納庫内（水平経路）</option><option value="mid-step">途中の上昇点</option></select>'+
  '<label class="toggle"><input type="checkbox" id="b151-overlay" checked> 経路・幅不足箇所を重ねる</label>'+
  '<div id="b151-status" role="status" aria-live="polite" class="info"></div>'+
  '<div class="info warn"><strong>施工不可：NOT_PREPARED / 9 BLOCKED</strong>。幅は設計セル上の経路直交方向の断面値です。実ブロックとの衝突、階段・旋回・頭上設備・強度・地盤・実機歩行は証明していません。</div>'+
  marker);
 const hook=' const s=scene();floor.max=';
 ok(html.includes(hook),'SCENE_MARK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const routeId=el("b151-route").value;',
  ' const width=s.clearanceReview?.routes.find(r=>r.id===routeId);',
  ' const vertical=s.verticalReview?.routes.find(r=>r.id===routeId);',
  ' el("b151-status").textContent=width?',
  '   "局所経路幅: "+width.widthStatus+" / 最小"+width.minCrossSectionWidth+',
  '   "セル（目標5）/ 幅不足"+width.narrowPointCount+"箇所 / "+',
  '   (vertical?.stepCandidateCount||0)+"段差候補（実機未認証）。水平床領域群: "+',
  '   s.clearanceReview.flatComponentCount: "このモデルにはB151の幅診断はありません。R2かR3を選択。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(draw),'DRAW_MARK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const review=s.clearanceReview?.routes.find(r=>r.id===el("b151-route").value);',
  ' if(el("b151-overlay").checked&&review?.routeSamples?.length){',
  '  ctx.save();ctx.lineWidth=3;ctx.lineJoin="round";ctx.strokeStyle="#7ef5c6";',
  '  ctx.beginPath();review.routeSamples.forEach((sample,i)=>{',
  '   const p=sample.at,q=project(p[0]+.5,p[1]+.1,p[2]+.5);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();',
  '  for(const sample of review.routeSamples.filter(x=>x.clearWidth<5)){',
  '   const p=sample.at,q=project(p[0]+.5,p[1]+.12,p[2]+.5);',
  '   ctx.beginPath();ctx.arc(q[0],q[1],5.5,0,Math.PI*2);',
  '   ctx.fillStyle="#ff5665";ctx.fill();',
  '  }ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(cb),'CB_HOOK');
 html=html.replace(cb,cb+
  '\nel("b151-route").addEventListener("change",setScene);'+
  '\nel("b151-overlay").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'INITIALIZE');
 html=html.replace(init,'\nindex=13;select.value="13";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_RENDER');
 return html;
}
const ROOTNAV='<div id="b151-clearance-navigation" style="padding:12px 24px;background:#233946;color:#e8f6fa"><strong>B151 NEW:</strong> 格納庫の狭い通路を5ブロック幅へ拡幅 → <a style="color:#93ffd3" href="./ai/clearance/">R2/R3の3D比較を見る</a>（設計のみ）</div>';
const AINAV='<div id="b151-clearance-navigation" class="info"><strong>B151 NEW:</strong> 幅不足と実拡幅の比較 → <a style="color:#93ffd3" href="./clearance/">幅診断3D</a></div>';
function edit(dir,name,fn){
 const file=path.join(dir,name),o=JSON.parse(fs.readFileSync(file,'utf8'));
 fn(o);fs.writeFileSync(file,JSON.stringify(o,null,2)+'\n');
}
export function writeB151Site(bundle,dir=SITE){
 verifyB150Site(dir);
 const html=renderB151Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/clearance'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/clearance/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(home.includes('</header>')&&!home.includes('id="b151-clearance-navigation"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&!ai.includes('id="b151-clearance-navigation"'),
  'NAV_CONFLICT');
 home=home.replace('</header>','</header>'+ROOTNAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=SHA(home));
 for(const name of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json']){
  edit(dir,name,m=>{m.rootSha256=SHA(home);
   if('gallerySha256'in m)m.gallerySha256=SHA(ai);
   if('aiSha256'in m)m.aiSha256=SHA(ai);
  });
 }
 const last=JSON.parse(read(dir,'B150_MANIFEST.json'));
 const manifest={schema:'minecraftaibuilder-b151-clearance-gallery-v1',
  sceneCount:14,sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  parentSourceSha256:bundle.parentSourceSha256,
  childSourceSha256:bundle.childSourceSha256,
  childGeometrySha256:bundle.childGeometrySha256,
  oldNarrowCount:bundle.oldWidth.routes[2].narrowPointCount,
  newNarrowCount:bundle.newWidth.routes[2].narrowPointCount,
  newMinimumWidth:bundle.newWidth.routes[2].minCrossSectionWidth,
  clearanceSha256:bundle.newWidth.sha256,
  oldClearanceSha256:bundle.oldWidth.sha256,
  pageSha256:SHA(html),rootSha256:SHA(home),aiSha256:SHA(ai),
  inheritedB141Sha256:last.inheritedB141Sha256,
  stairsCertified:false,constructionApproved:false,worldWrites:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B151_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB151Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB151Site(dir=SITE){
 verifyB150Site(dir);
 const bundle=makeB151Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),readWideDesign());
 const m=JSON.parse(read(dir,'B151_MANIFEST.json')),old=JSON.parse(read(dir,'B150_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/clearance/index.html');
 ok(m.schema==='minecraftaibuilder-b151-clearance-gallery-v1'&&
  m.sceneCount===14&&m.sourceHashes.join()===bundle.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===bundle.gallery.geometryHashes.join()&&
  m.parentSourceSha256===bundle.parentSourceSha256&&
  m.childSourceSha256===bundle.childSourceSha256&&
  m.childGeometrySha256===bundle.childGeometrySha256&&
  m.oldNarrowCount===bundle.oldWidth.routes[2].narrowPointCount&&m.oldNarrowCount>0&&
  m.newNarrowCount===bundle.newWidth.routes[2].narrowPointCount&&m.newNarrowCount===0&&
  m.newMinimumWidth>=5&&m.clearanceSha256===bundle.newWidth.sha256&&
  m.oldClearanceSha256===bundle.oldWidth.sha256&&
  m.pageSha256===SHA(html)&&
  m.pageSha256===SHA(renderB151Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===SHA(home)&&m.aiSha256===SHA(ai)&&
  m.inheritedB141Sha256===old.inheritedB141Sha256&&
  m.stairsCertified===false&&m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  home.includes('id="b151-clearance-navigation"')&&ai.includes('id="b151-clearance-navigation"')&&
  html.includes('id="b151-route"'),'SITE_OR_SOURCE_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB151Site(),null,2));
  else{
   const b=makeB151Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),readWideDesign());
   console.log(JSON.stringify({manifest:writeB151Site(b),before:b.oldWidth.routes[2],
    after:b.newWidth.routes[2]},null,2));
  }
 }catch(e){console.error('B151_HOLD:',e.message);process.exitCode=1;}
}
