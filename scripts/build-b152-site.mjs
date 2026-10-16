/**
 * B152 immutable 15-scene studio: new R4 upper observation gallery, with
 * actual local-footprint paths and source-verifiable before/after evidence.
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
import {readWideDesign,makeB151Bundle,verifyB151Site} from './build-b151-site.mjs';
import {compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from '../source/ai/b152-footprint-review.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const DESIGN=path.join(ROOT,'designs/ai/interiors/stratos-observatory-interior-r4.json');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const ok=(condition,msg)=>{if(!condition)throw Error('B152_'+msg);};
export const FOOTPRINT_WAYPOINTS={
 start:[40,13,22],destinations:[
  {id:'gallery-entry',at:[40,13,23]},
  {id:'observation-turn',at:[41,13,29]},
  {id:'observation-platform',at:[49,13,31]}
 ],width:2,depth:2,headroom:2
};
export function readLoopDesign(){return JSON.parse(fs.readFileSync(DESIGN,'utf8'));}
export function makeB152Bundle(designs,r2,r3,r4,repair,r1,interiorR2,interiorR3,interiorR4){
 const base=makeB151Bundle(designs,r2,r3,r4,repair,r1,interiorR2,interiorR3);
 ok(interiorR4?.id==='stratos-observatory-interior-r4'&&
  JSON.stringify(interiorR4.bounds)===JSON.stringify(interiorR3.bounds)&&
  JSON.stringify(interiorR4.elements.slice(0,interiorR3.elements.length))===
   JSON.stringify(interiorR3.elements)&&
  interiorR4.elements.length>interiorR3.elements.length,'SOURCE_R3_CHANGED');
 validateDesign(interiorR4);
 const before=compileDesign(interiorR3),after=compileDesign(interiorR4);
 ok(verifyCompiled(interiorR4,after)&&before.geometrySha256!==after.geometrySha256,
  'R4_GEOMETRY_NOT_CHANGED');
 const oldFootprint=analyzeFootprint(before,FOOTPRINT_WAYPOINTS);
 const newFootprint=analyzeFootprint(after,FOOTPRINT_WAYPOINTS);
 ok(verifyFootprint(before,FOOTPRINT_WAYPOINTS,oldFootprint)&&
  verifyFootprint(after,FOOTPRINT_WAYPOINTS,newFootprint)&&
  oldFootprint.targets[2].status==='INVALID_GOAL_FOOTPRINT'&&
  newFootprint.targets[2].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  newFootprint.targets[2].steps>=10&&
  newFootprint.targets[2].path.some(p=>p[0]!==40&&p[2]!==22)&&
  newFootprint.stairsCertified===false&&
  newFootprint.playerCollisionCertified===false,'REAL_GALLERY_NOT_PASSABLE');
 const {primitives,...metadata}=after,surface=surfaceOnly(after);
 ok(surface.length>50,'NO_SURFACE');
 const gallery={...base.gallery,
  scenes:[...base.gallery.scenes.slice(0,13),
   {...base.gallery.scenes[13],footprintReview:oldFootprint},
   {...metadata,surface,footprintReview:newFootprint,
    stats:{...metadata.stats,renderedSurfaceCells:surface.length}}],
  sourceHashes:[...base.gallery.sourceHashes,after.sourceSha256],
  geometryHashes:[...base.gallery.geometryHashes,after.geometrySha256]};
 ok(gallery.scenes.length===15&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'GALLERY_SAFETY');
 return {gallery,oldFootprint,newFootprint,
  parentSourceSha256:before.sourceSha256,childSourceSha256:after.sourceSha256,
  childGeometrySha256:after.geometrySha256,
  constructionApproved:false,worldWrites:0};
}
export function renderB152Html(bundle,template){
 ok(bundle?.gallery?.scenes?.length===15&&bundle.newFootprint?.targets.length===3,
  'INVALID_VIEW');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B152 / FOOTPRINT AND DOME GALLERY')
  .replace('B143 AI Architecture Studio','B152 Footprint & Dome Walkway Studio')
  .replace('ChatGPTが設計した新規建築','R3とR4：ドーム内部のL字観測回廊')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   'R3では床の途切れによって通れなかったドーム内部へ、幅5の曲がる観測回廊を増築。各地点に2×2の床支持と頭上2セルがあるかを確認します。段差・Minecraft物理は未認証。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const mark='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(mark),'MISSING_CONTROLS');
 html=html.replace(mark,
  '<div class="info"><strong>B152 実建築改修 R4</strong><p>空中デッキの先に5ブロック幅のL字回廊、展望床、手すり、照明を設計。R3/R4の切替で床の欠落と2×2占有領域の経路成立を比較できます。</p></div>'+
  '<label for="b152-target">目的地点</label><select id="b152-target"><option value="observation-platform">展望プラットフォーム</option><option value="observation-turn">L字曲がり角</option><option value="gallery-entry">回廊入口</option></select>'+
  '<label class="toggle"><input type="checkbox" id="b152-show-footprint" checked> 2×2経路と占有面を重ねて表示</label>'+
  '<div id="b152-status" role="status" aria-live="polite" class="info"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。これはローカル形状の水平経路検査です。段差上昇、実ブロックの種類、プレイヤー当たり判定、実ワールド施工は未認証。</div>'+
  mark);
 const hook=' const s=scene();floor.max=';
 ok(html.includes(hook),'MISSING_SCENE_HOOK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const target=s.footprintReview?.targets.find(r=>r.id===el("b152-target").value);',
  ' el("b152-status").textContent=target?',
  '  "2×2検査: "+target.status+" / "+',
  '  (target.steps===null?"経路未確定":target.steps+"移動")+',
  '  "。床支持・頭上2セルの水平移動のみ。階段・実機物理未認証。":',
  '  "このモデルに2×2検査はありません。R3またはR4を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(draw),'MISSING_RENDER_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const overlay=s.footprintReview?.targets.find(r=>r.id===el("b152-target").value);',
  ' if(el("b152-show-footprint").checked&&overlay?.path?.length){',
  '  ctx.save();ctx.strokeStyle="#92ffe2";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();overlay.path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.12,p[2]+1);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();',
  '  overlay.path.filter((p,i)=>i%3===0||i===overlay.path.length-1).forEach(p=>{',
  '   const q=[project(p[0],p[1]+.14,p[2]),',
  '    project(p[0]+2,p[1]+.14,p[2]),',
  '    project(p[0]+2,p[1]+.14,p[2]+2),',
  '    project(p[0],p[1]+.14,p[2]+2)];',
  '   ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));',
  '   ctx.closePath();ctx.fillStyle="rgba(146,255,226,.18)";ctx.fill();',
  '  });ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(cb),'MISSING_EVENT_HOOK');
 html=html.replace(cb,cb+
  '\nel("b152-target").addEventListener("change",setScene);'+
  '\nel("b152-show-footprint").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'MISSING_INIT');
 html=html.replace(init,'\nindex=14;select.value="14";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'EXTERNAL_SCRIPT');
 return html;
}
const ROOTNAV='<div id="b152-footprint-navigation" style="padding:12px 24px;background:#1e3b49;color:#edfaff"><strong>B152 NEW:</strong> ドーム内部L字回廊と2×2面の経路 → <a style="color:#86ffe5" href="./ai/footprint/">R3/R4の3D比較</a>（形状設計のみ）</div>';
const AINAV='<div id="b152-footprint-navigation" class="info"><strong>B152 NEW:</strong> L字回廊の2×2移動検査 → <a style="color:#86ffe5" href="./footprint/">3D比較を見る</a></div>';
function update(dir,name,fn){
 const filename=path.join(dir,name),o=JSON.parse(fs.readFileSync(filename,'utf8'));
 fn(o);fs.writeFileSync(filename,JSON.stringify(o,null,2)+'\n');
}
export function writeB152Site(bundle,dir=SITE){
 verifyB151Site(dir);
 const html=renderB152Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/footprint'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/footprint/index.html'),html);
 let root=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(root.includes('</header>')&&!root.includes('id="b152-footprint-navigation"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&!ai.includes('id="b152-footprint-navigation"'),
  'NAVIGATION_CONFLICT');
 root=root.replace('</header>','</header>'+ROOTNAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=sha(root));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json']){
  update(dir,f,m=>{
   m.rootSha256=sha(root);
   if('gallerySha256'in m)m.gallerySha256=sha(ai);
   if('aiSha256'in m)m.aiSha256=sha(ai);
  });
 }
 const last=JSON.parse(read(dir,'B151_MANIFEST.json'));
 const manifest={schema:'minecraftaibuilder-b152-footprint-gallery-v1',
  sceneCount:15,sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  parentSourceSha256:bundle.parentSourceSha256,
  childSourceSha256:bundle.childSourceSha256,
  childGeometrySha256:bundle.childGeometrySha256,
  beforeTargetStatus:bundle.oldFootprint.targets[2].status,
  afterTargetStatus:bundle.newFootprint.targets[2].status,
  afterRouteSteps:bundle.newFootprint.targets[2].steps,
  beforeProofSha256:bundle.oldFootprint.sha256,afterProofSha256:bundle.newFootprint.sha256,
  pageSha256:sha(html),rootSha256:sha(root),aiSha256:sha(ai),
  inheritedB141Sha256:last.inheritedB141Sha256,
  playerCollisionCertified:false,stairsCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B152_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB152Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB152Site(dir=SITE){
 verifyB151Site(dir);
 const b=makeB152Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign());
 const m=JSON.parse(read(dir,'B152_MANIFEST.json')),old=JSON.parse(read(dir,'B151_MANIFEST.json'));
 const root=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/footprint/index.html');
 ok(m.schema==='minecraftaibuilder-b152-footprint-gallery-v1'&&
  m.sceneCount===15&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.parentSourceSha256===b.parentSourceSha256&&m.childSourceSha256===b.childSourceSha256&&
  m.childGeometrySha256===b.childGeometrySha256&&
  m.beforeTargetStatus==='INVALID_GOAL_FOOTPRINT'&&
  m.afterTargetStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.afterRouteSteps===b.newFootprint.targets[2].steps&&m.afterRouteSteps>=10&&
  m.beforeProofSha256===b.oldFootprint.sha256&&m.afterProofSha256===b.newFootprint.sha256&&
  m.pageSha256===sha(html)&&
  m.pageSha256===sha(renderB152Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===sha(root)&&m.aiSha256===sha(ai)&&
  m.inheritedB141Sha256===old.inheritedB141Sha256&&
  m.playerCollisionCertified===false&&m.stairsCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&root.includes('id="b152-footprint-navigation"')&&
  ai.includes('id="b152-footprint-navigation"')&&html.includes('id="b152-target"'),
  'SOURCE_OR_SAFETY_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB152Site(),null,2));
  else{
   const b=makeB152Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign());
   console.log(JSON.stringify({manifest:writeB152Site(b),routes:b.newFootprint.targets.map(r=>({
    id:r.id,status:r.status,steps:r.steps}))},null,2));
  }
 }catch(e){console.error('B152_HOLD:',e.message);process.exitCode=1;}
}
