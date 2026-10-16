/**
 * B154 — true local floor repair: new 4-cell-wide lower observation promenade.
 * Compare R5/R6 at constant 2x2 headroom; keep B142-B153 history intact.
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
import {readSkyDesign,makeB153Bundle,verifyB153Site} from './build-b153-site.mjs';
import {compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from '../source/ai/b152-footprint-review.mjs';
import {analyzeBypassIntervention,verifyBypassIntervention} from '../source/ai/b154-bypass-evidence.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const DESIGN=path.join(ROOT,'designs/ai/interiors/stratos-observatory-interior-r6.json');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const SHA=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,p)=>fs.readFileSync(path.join(dir,p),'utf8');
const ok=(b,msg)=>{if(!b)throw Error('B154_'+msg);};
export const BYPASS_TARGETS={
 start:[49,13,31],destinations:[
  {id:'bridge-gate',at:[55,13,31]},
  {id:'promenade-middle',at:[57,13,41]},
  {id:'lower-lookout',at:[57,13,49]}
 ],width:2,depth:2,headroom:2
};
export function readBypassDesign(){return JSON.parse(fs.readFileSync(DESIGN,'utf8'));}
export function makeB154Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i){
 const parent=makeB153Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i);
 ok(r6i?.id==='stratos-observatory-interior-r6'&&
  JSON.stringify(r6i.bounds)===JSON.stringify(r5i.bounds)&&
  JSON.stringify(r6i.elements.slice(0,r5i.elements.length))===
   JSON.stringify(r5i.elements)&&r6i.elements.length>r5i.elements.length,
  'R6_MUST_APPEND_WITH_HISTORY');
 validateDesign(r6i);
 const old=compileDesign(r5i),now=compileDesign(r6i);
 ok(verifyCompiled(r6i,now)&&old.geometrySha256!==now.geometrySha256,
  'R6_GEOMETRY_UNCHANGED');
 const before=analyzeFootprint(old,BYPASS_TARGETS),
  after=analyzeFootprint(now,BYPASS_TARGETS);
 const proof=analyzeBypassIntervention(old,now,BYPASS_TARGETS);
 ok(verifyFootprint(old,BYPASS_TARGETS,before)&&
  verifyFootprint(now,BYPASS_TARGETS,after)&&
  verifyBypassIntervention(old,now,BYPASS_TARGETS,proof)&&
  before.targets[2].status==='INVALID_GOAL_FOOTPRINT'&&
  after.targets[2].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  after.targets[2].steps>=20&&
  after.targets[2].path.every(p=>p[1]===BYPASS_TARGETS.start[1])&&
  proof.targets[2].improvedByActualVoxels===true&&
  proof.targets[2].steps===after.targets[2].steps&&
  proof.physicallyAddedVoxels>0&&proof.geometryOnly===true&&
  proof.constructionApproved===false,'R6_REAL_HOLD_AND_CLEARANCE');
 const {primitives,...meta}=now,surface=surfaceOnly(now);
 ok(surface.length>50,'R6_NO_SURFACE');
 const gallery={...parent.gallery,
  scenes:[...parent.gallery.scenes.slice(0,15),
   {...parent.gallery.scenes[15],bypassRoute:before},
   {...meta,surface,bypassRoute:after,
    stats:{...meta.stats,renderedSurfaceCells:surface.length}}],
  sourceHashes:[...parent.gallery.sourceHashes,now.sourceSha256],
  geometryHashes:[...parent.gallery.geometryHashes,now.geometrySha256]};
 ok(gallery.scenes.length===17&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'SCENE_SAFETY');
 return {gallery,before,after,proof,
  parentSourceSha256:old.sourceSha256,
  childSourceSha256:now.sourceSha256,childGeometrySha256:now.geometrySha256,
  constructionApproved:false,worldWrites:0};
}
export function renderB154Html(b,template){
 ok(b?.gallery?.scenes.length===17,'INVALID_VIEW');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B154 / TRUE SUPPORTED BYPASS')
  .replace('B143 AI Architecture Studio','B154 Lower Promenade Studio')
  .replace('ChatGPTが設計した新規建築','R5 vs R6：段差を回避する展望回廊')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '上昇1ブロックを許可せず、下層の独立した床に2×2の占有領域が通れる経路を増設。旧R5とR6の比較、目的地・中間地点・経路ハイライトを操作できます。実機物理は未認証です。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const controls='<h2 style="margin-top:20px">表示設定</h2>';
 ok(html.includes(controls),'CONTROLS_MISSING');
 html=html.replace(controls,
  '<div class="info"><strong>B154：新設した4幅プロムナード</strong>。高所スカイブリッジの段差を越えるのではなく、実際に追加した床と開口部から下層展望台へ迂回します。R5とR6をモデル切替で比較できます。</div>'+
  '<label for="b154-target">2×2移動の目的地</label><select id="b154-target"><option value="lower-lookout">下層展望台（メイン）</option><option value="promenade-middle">プロムナード中間</option><option value="bridge-gate">新設橋の入口</option></select>'+
  '<label class="toggle"><input type="checkbox" id="b154-show-route" checked> 水平経路と2×2占有面を表示</label>'+
  '<div id="b154-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED：これはMinecraft外の幾何計算です。実プレイヤーの移動、当たり判定、転落防止性能、床強度、教育版のブロック互換性は未認証。</div>'+
  controls);
 const scene=' const s=scene();floor.max=';
 ok(html.includes(scene),'SCENE_HOOK');
 html=html.replace(scene,[
  ' const s=scene();',
  ' const route=s.bypassRoute?.targets.find(r=>r.id===el("b154-target").value);',
  ' el("b154-status").textContent=route?',
  '   "2×2連続床："+route.status+" / "+',
  '   (route.steps===null?"移動未確定":route.steps+"水平移動")+',
  '   "（高度変化0、Minecraft実機移動は未認証）":',
  '   "このモデルにはB154経路検証はありません。R5かR6を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 ok(html.includes(draw),'DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const rt=s.bypassRoute?.targets.find(r=>r.id===el("b154-target").value);',
  ' if(el("b154-show-route").checked&&rt?.path?.length){',
  '  ctx.save();ctx.lineWidth=3;ctx.strokeStyle="#b3ffdd";ctx.lineJoin="round";ctx.beginPath();',
  '  rt.path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.12,p[2]+1);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();',
  '  rt.path.filter((p,i)=>i%4===0||i===rt.path.length-1).forEach(p=>{',
  '   const q=[project(p[0],p[1]+.13,p[2]),project(p[0]+2,p[1]+.13,p[2]),',
  '    project(p[0]+2,p[1]+.13,p[2]+2),project(p[0],p[1]+.13,p[2]+2)];',
  '   ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));',
  '   ctx.closePath();ctx.fillStyle="rgba(170,255,221,.16)";ctx.fill();',
  '  });ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ok(html.includes(cb),'EVENT_HOOK');
 html=html.replace(cb,cb+
  '\nel("b154-target").addEventListener("change",setScene);'+
  '\nel("b154-show-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 ok(html.includes(init),'INIT');
 html=html.replace(init,'\nindex=16;select.value="16";setScene();\n</script>');
 ok(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_RENDER');
 return html;
}
const ROOTNAV='<div id="b154-access-nav" style="padding:12px 24px;background:#23404a;color:#f2fff9"><strong>B154:</strong> 高所段差を避ける幅4の下層バイパス → <a style="color:#b5ffde" href="./ai/bypass/">3D経路比較</a>（設計・非施工）</div>';
const AINAV='<div id="b154-access-nav" class="info"><strong>B154:</strong> 2×2占有領域の迂回成功 → <a style="color:#b5ffde" href="./bypass/">R5/R6比較</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),obj=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(obj);fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');
}
export function writeB154Site(b,dir=SITE){
 verifyB153Site(dir);
 const html=renderB154Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/bypass'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/bypass/index.html'),html);
 let root=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 ok(root.includes('</header>')&&!root.includes('id="b154-access-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&!ai.includes('id="b154-access-nav"'),
  'NAVIGATION_FAILED');
 root=root.replace('</header>','</header>'+ROOTNAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=SHA(root));
 for(const file of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json']){
  edit(dir,file,m=>{
   m.rootSha256=SHA(root);
   if('gallerySha256'in m)m.gallerySha256=SHA(ai);
   if('aiSha256'in m)m.aiSha256=SHA(ai);
  });
 }
 const ancestor=JSON.parse(read(dir,'B153_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b154-verified-bypass-v1',
  sceneCount:17,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  parentSourceSha256:b.parentSourceSha256,
  childSourceSha256:b.childSourceSha256,
  childGeometrySha256:b.childGeometrySha256,
  oldStatus:b.before.targets[2].status,
  newStatus:b.after.targets[2].status,
  newRouteSteps:b.after.targets[2].steps,
  realAddedVoxels:b.proof.physicallyAddedVoxels,
  interventionSha256:b.proof.sha256,
  pageSha256:SHA(html),rootSha256:SHA(root),aiSha256:SHA(ai),
  inheritedB141Sha256:ancestor.inheritedB141Sha256,
  playerCollisionCertified:false,stairsCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.writeFileSync(path.join(dir,'B154_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ok(JSON.stringify(verifyB154Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB154Site(dir=SITE){
 verifyB153Site(dir);
 const b=makeB154Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
  readWideDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign());
 const m=JSON.parse(read(dir,'B154_MANIFEST.json')),a=JSON.parse(read(dir,'B153_MANIFEST.json'));
 const root=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/bypass/index.html');
 ok(m.schema==='minecraftaibuilder-b154-verified-bypass-v1'&&m.sceneCount===17&&
  m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.parentSourceSha256===b.parentSourceSha256&&
  m.childSourceSha256===b.childSourceSha256&&m.childGeometrySha256===b.childGeometrySha256&&
  m.oldStatus==='INVALID_GOAL_FOOTPRINT'&&
  m.newStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.newRouteSteps===b.after.targets[2].steps&&m.newRouteSteps>=20&&
  m.realAddedVoxels===b.proof.physicallyAddedVoxels&&m.realAddedVoxels>0&&
  m.interventionSha256===b.proof.sha256&&
  m.pageSha256===SHA(html)&&
  m.pageSha256===SHA(renderB154Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===SHA(root)&&m.aiSha256===SHA(ai)&&
  m.inheritedB141Sha256===a.inheritedB141Sha256&&
  m.playerCollisionCertified===false&&m.stairsCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&root.includes('id="b154-access-nav"')&&
  ai.includes('id="b154-access-nav"')&&html.includes('id="b154-target"'),
  'SITE_OR_HOLD_INVALID');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB154Site(),null,2));
  else{
   const b=makeB154Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
    readBypassDesign());
   console.log(JSON.stringify({manifest:writeB154Site(b),route:b.after.targets[2]},null,2));
  }
 }catch(e){console.error('B154_HOLD:',e.message);process.exitCode=1;}
}
