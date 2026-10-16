/**
 * B150 — immutable R2 upper gallery, candidate-only height transitions,
 * and source-verifiable static 3D comparison. Minecraft writes: zero.
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
import {readInteriorDesign,makeB149Bundle,verifyB149Site} from './build-b149-site.mjs';
import {compileDesign,verifyCompiled,validateDesign} from '../source/ai/b143-building-dsl.mjs';
import {analyzeVerticalCandidates,verifyVerticalCandidates} from '../source/ai/b150-vertical-candidates.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const DESIGN=path.join(ROOT,'designs/ai/interiors/stratos-observatory-interior-r2.json');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=(d,p)=>fs.readFileSync(path.join(d,p),'utf8');
const ok=(b,m)=>{if(!b)throw Error('B150_'+m);};
export const WAYPOINTS={
 entrance:[40,10,2],destinations:[
  {id:'hangar-inner',at:[40,10,16]},
  {id:'mid-step',at:[40,12,18]},
  {id:'upper-deck',at:[40,13,22]}
 ]
};
export function readUpperDesign(){return JSON.parse(fs.readFileSync(DESIGN,'utf8'));}
export function makeB150Bundle(original,r2,r3,r4,repair,interiorR1,interiorR2){
 const parent=makeB149Bundle(original,r2,r3,r4,repair,interiorR1);
 ok(interiorR2?.id==='stratos-observatory-interior-r2'&&
  JSON.stringify(interiorR2.bounds)===JSON.stringify(interiorR1.bounds)&&
  JSON.stringify(interiorR2.elements.slice(0,interiorR1.elements.length))===
   JSON.stringify(interiorR1.elements)&&interiorR2.elements.length>interiorR1.elements.length,
  'CHILD_SOURCE_NOT_APPEND_ONLY');
 validateDesign(interiorR2);
 const before=compileDesign(interiorR1),after=compileDesign(interiorR2);
 ok(verifyCompiled(interiorR2,after)&&before.geometrySha256!==after.geometrySha256,
  'NO_COMPILED_CHANGE');
 const oldPath=analyzeVerticalCandidates(before,WAYPOINTS);
 const newPath=analyzeVerticalCandidates(after,WAYPOINTS);
 ok(verifyVerticalCandidates(after,WAYPOINTS,newPath)&&
  oldPath.routes[0].status==='PASS_FLAT_GEOMETRY'&&
  newPath.routes[0].status==='PASS_FLAT_GEOMETRY'&&
  oldPath.routes[2].status!=='STEP_CANDIDATE_ONLY'&&
  newPath.routes[1].status==='STEP_CANDIDATE_ONLY'&&
  newPath.routes[2].status==='STEP_CANDIDATE_ONLY'&&
  newPath.routes[2].stepCandidateCount>=3&&
  newPath.routes[2].stepTransitions.every(s=>s.verifiedMinecraftMotion===false)&&
  newPath.stairsCertified===false&&newPath.constructionApproved===false,
  'NO_VERIFIED_IMPROVEMENT');
 const {primitives,...meta}=after;
 const surface=surfaceOnly(after);
 ok(surface.length>50,'EMPTY_SURFACE');
 const gallery={...parent.gallery,
  scenes:[...parent.gallery.scenes,{...meta,surface,verticalReview:newPath,
   stats:{...meta.stats,renderedSurfaceCells:surface.length}}],
  sourceHashes:[...parent.gallery.sourceHashes,after.sourceSha256],
  geometryHashes:[...parent.gallery.geometryHashes,after.geometrySha256]};
 ok(gallery.scenes.length===13&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'UNSAFE_GALLERY');
 return {gallery,oldPath,newPath,sourceProof:{
  parentSourceSha256:before.sourceSha256,childSourceSha256:after.sourceSha256,
  childGeometrySha256:after.geometrySha256,priorDesignUnmodified:true,
  constructionApproved:false,readiness:'NOT_PREPARED',worldWrites:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 }};
}
export function renderB150Html(bundle,template){
 ok(bundle.gallery?.scenes?.length===13&&bundle.newPath.routes.length===3,'INVALID_GALLERY_INPUT');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B150 / VERTICAL CIRCULATION CANDIDATES')
  .replace('B143 AI Architecture Studio','B150 Upper Deck Candidate Studio')
  .replace('ChatGPTが設計した新規建築','格納庫R2：上下階の連絡通路')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '旧12モデルを保持し、格納庫後部を開口して3幅の段状ギャラリー・上層デッキ・観測施設入口へ接続。高さ変化のある経路は未認証の候補として表示します。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const mark='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(mark),'NO_VIEW_CONTROLS');
 html=html.replace(mark,
  '<div class="info"><strong>B150 実モデル改修</strong>：3ブロック幅の後方出口、2段の接続支持材、開口した上層観測デッキと連続床。平面通路と段差候補の違いを選択して確認できます。</div>'+
  '<label for="b150-route">経路を選択</label><select id="b150-route"><option value="hangar-inner">格納庫内部（平坦な経路）</option><option value="mid-step">中間ステップ（段差候補）</option><option value="upper-deck">上層デッキ入口（段差候補）</option></select>'+
  '<label class="toggle"><input type="checkbox" id="b150-overlay" checked> 経路と段差候補を重ねて表示</label>'+
  '<div id="b150-status" role="status" aria-live="polite" class="info"></div>'+
  '<div class="info warn"><strong>NOT_PREPARED / 9 BLOCKED</strong>：上昇1ブロックは物理的に登れる階段と同義ではありません。ジャンプ操作・段差衝突・幅・実ブロック・施工は未認証。Minecraft書込み0。</div>'+
  mark);
 const sceneHook=' const s=scene();floor.max=';
 ok(html.includes(sceneHook),'NO_SCENE_HOOK');
 html=html.replace(sceneHook,[
  ' const s=scene();',
  ' const target=el("b150-route").value;',
  ' const r=s.verticalReview?.routes.find(x=>x.id===target);',
  ' el("b150-status").textContent=r?',
  '   "経路: "+r.status+" / "+(r.moveCount??"未計測")+"歩 / 高さ1の候補 "+r.stepCandidateCount+',
  '   "回（実Minecraft移動未認証）":',
  '   "このモデルにはB150の段差移動診断はありません。最後のR2を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const drawHook=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(drawHook),'NO_DRAW_HOOK');
 html=html.replace(drawHook,[
  ' ctx.globalAlpha=1;',
  ' const b150Route=s.verticalReview?.routes.find(r=>r.id===el("b150-route").value);',
  ' if(el("b150-overlay").checked&&b150Route?.path?.length){',
  '  ctx.save();ctx.strokeStyle=b150Route.stepCandidateCount?"#ffab57":"#8af5d6";',
  '  ctx.lineWidth=3;ctx.lineJoin="round";ctx.beginPath();',
  '  b150Route.path.forEach((p,i)=>{',
  '   const q=project(p[0]+.5,p[1]+.12,p[2]+.5);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();',
  '  for(const e of b150Route.stepTransitions){',
  '   const q=project(e.to[0]+.5,e.to[1]+.12,e.to[2]+.5);',
  '   ctx.beginPath();ctx.arc(q[0],q[1],5,0,Math.PI*2);',
  '   ctx.fillStyle="#ff6f41";ctx.fill();',
  '  }ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(cb),'NO_TOGGLE_HOOK');
 html=html.replace(cb,cb+
  '\nel("b150-route").addEventListener("change",setScene);'+
  '\nel("b150-overlay").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'NO_INIT_HOOK');
 html=html.replace(init,'\nindex=12;select.value="12";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_RENDER');
 return html;
}
const ROOTNAV='<div id="b150-vertical-navigation" style="padding:12px 24px;background:#29404b;color:#edfcff"><strong>B150 NEW:</strong> 格納庫→上層デッキへ通路と段差候補を設計 → <a style="color:#ffc581" href="./ai/vertical/">3D経路を確認</a>（施工不可）</div>';
const AINAV='<div id="b150-vertical-navigation" class="info"><strong>B150 NEW:</strong> 上層への移動候補 → <a style="color:#ffc581" href="./vertical/">段差候補3Dビュー</a></div>';
function update(dir,name,fn){
 const f=path.join(dir,name),j=JSON.parse(fs.readFileSync(f,'utf8'));
 fn(j);fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');
}
export function writeB150Site(bundle,dir=SITE){
 verifyB149Site(dir);
 const html=renderB150Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/vertical'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/vertical/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(home.includes('</header>')&&!home.includes('id="b150-vertical-navigation"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&!ai.includes('id="b150-vertical-navigation"'),
  'NAV_CONFLICT');
 home=home.replace('</header>','</header>'+ROOTNAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=hash(home));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json','B149_MANIFEST.json']){
  update(dir,f,m=>{m.rootSha256=hash(home);
   if('gallerySha256'in m)m.gallerySha256=hash(ai);
   if('aiSha256'in m)m.aiSha256=hash(ai);
  });
 }
 const last=JSON.parse(read(dir,'B149_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b150-vertical-circulation-site-v1',
  sceneCount:13,
  sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  parentSourceSha256:bundle.sourceProof.parentSourceSha256,
  childSourceSha256:bundle.sourceProof.childSourceSha256,
  childGeometrySha256:bundle.sourceProof.childGeometrySha256,
  priorDesignUnmodified:true,sourceReportSha256:bundle.newPath.sha256,
  routeStatuses:bundle.newPath.routes.map(r=>r.status),
  stepCandidateCount:bundle.newPath.routes[2].stepCandidateCount,
  pageSha256:hash(html),rootSha256:hash(home),aiSha256:hash(ai),
  inheritedB141Sha256:last.inheritedB141Sha256,
  stairsCertified:false,constructionApproved:false,worldWrites:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 fs.writeFileSync(path.join(dir,'B150_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB150Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB150Site(dir=SITE){
 verifyB149Site(dir);
 const b=makeB150Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign());
 const m=JSON.parse(read(dir,'B150_MANIFEST.json')),old=JSON.parse(read(dir,'B149_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/vertical/index.html');
 ok(m.schema==='minecraftaibuilder-b150-vertical-circulation-site-v1'&&
  m.sceneCount===13&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.parentSourceSha256===b.sourceProof.parentSourceSha256&&
  m.childSourceSha256===b.sourceProof.childSourceSha256&&
  m.childGeometrySha256===b.sourceProof.childGeometrySha256&&
  m.priorDesignUnmodified===true&&m.sourceReportSha256===b.newPath.sha256&&
  m.routeStatuses.join()==='PASS_FLAT_GEOMETRY,STEP_CANDIDATE_ONLY,STEP_CANDIDATE_ONLY'&&
  m.stepCandidateCount>=3&&m.pageSha256===hash(html)&&
  m.pageSha256===hash(renderB150Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===hash(home)&&m.aiSha256===hash(ai)&&
  m.inheritedB141Sha256===old.inheritedB141Sha256&&
  m.stairsCertified===false&&m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(x=>x==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  home.includes('id="b150-vertical-navigation"')&&
  ai.includes('id="b150-vertical-navigation"')&&html.includes('id="b150-route"'),
  'SITE_OR_SAFETY_INTEGRITY');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB150Site(),null,2));
  else{
   const b=makeB150Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign());
   console.log(JSON.stringify({manifest:writeB150Site(b),routes:b.newPath.routes.map(r=>({
    id:r.id,status:r.status,moves:r.moveCount,steps:r.stepCandidateCount}))},null,2));
  }
 }catch(e){console.error('B150_HOLD:',e.message);process.exitCode=1;}
}
