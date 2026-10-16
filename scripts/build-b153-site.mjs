/**
 * B153 source-verified raised observatory and discrete transition review.
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
import {readLoopDesign,makeB152Bundle,verifyB152Site} from './build-b152-site.mjs';
import {compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {analyzeTransitionEnvelopes,verifyTransitionEnvelopes} from '../source/ai/b153-transition-envelopes.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const DESIGN=path.join(ROOT,'designs/ai/interiors/stratos-observatory-interior-r5.json');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=(d,p)=>fs.readFileSync(path.join(d,p),'utf8');
const ok=(c,m)=>{if(!c)throw Error('B153_'+m);};
export const WITNESS1={
 start:[40,10,14],destinations:[{id:'sky-terrace',at:[49,14,41]}],
 width:1,depth:1,headroom:2
};
export const WITNESS2={
 start:[49,13,31],destinations:[{id:'sky-terrace',at:[49,14,41]}],
 width:2,depth:2,headroom:2
};
export function readSkyDesign(){return JSON.parse(fs.readFileSync(DESIGN,'utf8'));}
export function makeB153Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i){
 const base=makeB152Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i);
 ok(r5i?.id==='stratos-observatory-interior-r5'&&
  JSON.stringify(r5i.bounds)===JSON.stringify(r4i.bounds)&&
  JSON.stringify(r5i.elements.slice(0,r4i.elements.length))===
   JSON.stringify(r4i.elements)&&r5i.elements.length>r4i.elements.length,'HISTORY_MUTATION');
 validateDesign(r5i);
 const before=compileDesign(r4i),after=compileDesign(r5i);
 ok(verifyCompiled(r5i,after)&&before.geometrySha256!==after.geometrySha256,
  'R5_NOT_GEOMETRICALLY_CHANGED');
 const oldSingle=analyzeTransitionEnvelopes(before,WITNESS1);
 const newSingle=analyzeTransitionEnvelopes(after,WITNESS1);
 const oldLarge=analyzeTransitionEnvelopes(before,WITNESS2);
 const newLarge=analyzeTransitionEnvelopes(after,WITNESS2);
 ok(verifyTransitionEnvelopes(after,WITNESS1,newSingle)&&
  verifyTransitionEnvelopes(after,WITNESS2,newLarge)&&
  oldSingle.routes[0].status==='INVALID_DESTINATION_ENVELOPE'&&
  newSingle.routes[0].status==='VERTICAL_CANDIDATE_UNCERTIFIED'&&
  newSingle.routes[0].stepCandidateCount>=4&&
  oldLarge.routes[0].status==='INVALID_DESTINATION_ENVELOPE'&&
  newLarge.routes[0].status==='NO_PROVEN_GEOMETRIC_CONNECTION'&&
  newLarge.blockedOverlappingTransitionEdges>0&&
  newSingle.stairsCertified===false&&newSingle.jumpCertified===false&&
  newLarge.constructionApproved===false,'R5_MOTION_CONTRAST_FAILED');
 const {primitives,...meta}=after,surface=surfaceOnly(after);
 ok(surface.length>50,'R5_RENDER_EMPTY');
 const gallery={...base.gallery,
  scenes:[...base.gallery.scenes.slice(0,14),
   {...base.gallery.scenes[14],transitionReview:{small:oldSingle,large:oldLarge}},
   {...meta,surface,transitionReview:{small:newSingle,large:newLarge},
    stats:{...meta.stats,renderedSurfaceCells:surface.length}}],
  sourceHashes:[...base.gallery.sourceHashes,after.sourceSha256],
  geometryHashes:[...base.gallery.geometryHashes,after.geometrySha256]};
 ok(gallery.scenes.length===16&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'GALLERY_HOLD');
 return {gallery,oldSingle,newSingle,oldLarge,newLarge,
  parentSourceSha256:before.sourceSha256,
  childSourceSha256:after.sourceSha256,childGeometrySha256:after.geometrySha256,
  constructionApproved:false,worldWrites:0};
}
export function renderB153Html(b,template){
 ok(b?.gallery?.scenes.length===16,'VIEW_INPUT');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B153 / DISCRETE TRANSITION ENVELOPES')
  .replace('B143 AI Architecture Studio','B153 Skybridge Movement Candidates')
  .replace('ChatGPTが設計した新規建築','ドームR4から高所展望橋R5へ')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '上層観測デッキの先に広いスカイテラスと空中回廊を増築。1×1と2×2の形状的な段差遷移を区別します。Minecraftのプレイヤー衝突・ジャンプは一切認証しません。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const m='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(m),'CONTROLS_MISSING');
 html=html.replace(m,
  '<div class="info"><strong>B153：ドームに高所スカイブリッジを増築</strong>。R4とR5を選択して、段差の支持床が2×2占有面へ干渉する問題と、1×1の非認証上昇候補を比較します。</div>'+
  '<label for="b153-size">移動体の占有領域</label><select id="b153-size"><option value="small">1×1（離散上昇候補）</option><option value="large">2×2（重複支持材を厳格に除外）</option></select>'+
  '<label class="toggle"><input type="checkbox" id="b153-show-route" checked> 候補経路・上昇箇所を描画</label>'+
  '<div id="b153-status" role="status" aria-live="polite" class="info"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。1セル上昇経路の成立はMinecraft Educationのジャンプ成功を意味しません。2×2の結果は保守的な直方体占有セルであり実プレイヤーとは異なります。</div>'+
  m);
 const hook=' const s=scene();floor.max=';
 ok(html.includes(hook),'SCENE_HOOK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const side=el("b153-size").value;',
  ' const rep=s.transitionReview?.[side];',
  ' const route=rep?.routes[0];',
  ' el("b153-status").textContent=route?',
  '   "遷移: "+route.status+" / "+(route.moveCount??"未確定")+"移動 / "+',
  '   route.stepCandidateCount+"上下段差候補 / 重複で拒否した遷移"+',
  '   rep.blockedOverlappingTransitionEdges+"件（Minecraft物理未認証）":',
  '   "このモデルにB153の移動体検査はありません。R4またはR5を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(draw),'DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const review=s.transitionReview?.[el("b153-size").value]?.routes[0];',
  ' if(el("b153-show-route").checked&&review?.path?.length){',
  '  ctx.save();ctx.lineWidth=3;ctx.strokeStyle="#98ffe1";ctx.lineJoin="round";',
  '  ctx.beginPath();review.path.forEach((p,i)=>{',
  '   const q=project(p[0]+.5,p[1]+.15,p[2]+.5);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();',
  '  review.transitions.forEach(t=>{',
  '   const p=t.to,q=project(p[0]+.5,p[1]+.16,p[2]+.5);',
  '   ctx.beginPath();ctx.arc(q[0],q[1],6,0,Math.PI*2);',
  '   ctx.fillStyle="#ffbd6d";ctx.fill();',
  '  });ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(cb),'CHANGE_HOOK');
 html=html.replace(cb,cb+
  '\nel("b153-size").addEventListener("change",setScene);'+
  '\nel("b153-show-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'INIT_HOOK');
 html=html.replace(init,'\nindex=15;select.value="15";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_HTML');
 return html;
}
const ROOT_NAV='<div id="b153-transition-nav" style="padding:12px 24px;background:#243b47;color:#ecfbff"><strong>B153:</strong> 高所スカイテラスと段差干渉の可視化 → <a style="color:#a4ffdd" href="./ai/transitions/">3Dプレビュー</a>（設計のみ）</div>';
const AI_NAV='<div id="b153-transition-nav" class="info"><strong>B153 NEW:</strong> 1×1と2×2の段差比較 → <a style="color:#a4ffdd" href="./transitions/">3Dで検証</a></div>';
function update(dir,name,fn){
 const p=path.join(dir,name),m=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(m);fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
}
export function writeB153Site(b,dir=SITE){
 verifyB152Site(dir);
 const html=renderB153Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/transitions'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/transitions/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(home.includes('</header>')&&!home.includes('id="b153-transition-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b153-transition-nav"'),'NAV_CONFLICT');
 home=home.replace('</header>','</header>'+ROOT_NAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AI_NAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=sha(home));
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json','B152_MANIFEST.json']){
  update(dir,f,m=>{m.rootSha256=sha(home);
   if('gallerySha256'in m)m.gallerySha256=sha(ai);
   if('aiSha256'in m)m.aiSha256=sha(ai);
  });
 }
 const ancestor=JSON.parse(read(dir,'B152_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b153-transition-gallery-v1',
  sceneCount:16,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  parentSourceSha256:b.parentSourceSha256,
  childSourceSha256:b.childSourceSha256,
  childGeometrySha256:b.childGeometrySha256,
  r4SingleStatus:b.oldSingle.routes[0].status,
  r5SingleStatus:b.newSingle.routes[0].status,
  r5SingleRises:b.newSingle.routes[0].stepCandidateCount,
  r5LargeStatus:b.newLarge.routes[0].status,
  rejectedOverlapEdges:b.newLarge.blockedOverlappingTransitionEdges,
  smallProofSha256:b.newSingle.sha256,largeProofSha256:b.newLarge.sha256,
  pageSha256:sha(html),rootSha256:sha(home),aiSha256:sha(ai),
  inheritedB141Sha256:ancestor.inheritedB141Sha256,
  stairsCertified:false,jumpCertified:false,constructionApproved:false,
  worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B153_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB153Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB153Site(dir=SITE){
 verifyB152Site(dir);
 const b=makeB153Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
  readWideDesign(),readLoopDesign(),readSkyDesign());
 const m=JSON.parse(read(dir,'B153_MANIFEST.json')),ancestor=JSON.parse(read(dir,'B152_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/transitions/index.html');
 ok(m.schema==='minecraftaibuilder-b153-transition-gallery-v1'&&m.sceneCount===16&&
  m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.parentSourceSha256===b.parentSourceSha256&&
  m.childSourceSha256===b.childSourceSha256&&m.childGeometrySha256===b.childGeometrySha256&&
  m.r4SingleStatus==='INVALID_DESTINATION_ENVELOPE'&&
  m.r5SingleStatus==='VERTICAL_CANDIDATE_UNCERTIFIED'&&
  m.r5SingleRises>=4&&m.r5LargeStatus==='NO_PROVEN_GEOMETRIC_CONNECTION'&&
  m.rejectedOverlapEdges>0&&m.smallProofSha256===b.newSingle.sha256&&
  m.largeProofSha256===b.newLarge.sha256&&
  m.pageSha256===sha(html)&&
  m.pageSha256===sha(renderB153Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===sha(home)&&m.aiSha256===sha(ai)&&
  m.inheritedB141Sha256===ancestor.inheritedB141Sha256&&
  m.stairsCertified===false&&m.jumpCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  home.includes('id="b153-transition-nav"')&&
  ai.includes('id="b153-transition-nav"')&&
  html.includes('id="b153-size"'),'SOURCE_OR_CONSTRUCTION_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB153Site(),null,2));
  else{
   const b=makeB153Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign());
   console.log(JSON.stringify({manifest:writeB153Site(b),
    small:b.newSingle.routes[0].status,large:b.newLarge.routes[0].status},null,2));
  }
 }catch(e){console.error('B153_HOLD',e.message);process.exitCode=1;}
}
