/**
 * B164: a monumental 34th fully compiled architectural model, not a route
 * diagram. Original 33 historical models and source SHA lineage maintained.
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
import {readPolarisR0} from './build-b159-site.mjs';
import {readDopplerR0} from './build-b160-site.mjs';
import {makeB163Bundle,verifyB163Site} from './build-b163-site.mjs';
import {createOrbitalCrown,verifyOrbitalCrown}
 from '../source/ai/b164-orbital-crown.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const SHA=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const check=(v,msg)=>{if(!v)throw Error('B164_SITE_'+msg);};
export function makeB164Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler){
 const parent=makeB163Bundle(original,r2,r3,r4,repair,r1,r2i,r3i,r4i,r5i,r6i,t0,t1,helios,polaris,doppler);
 const crown=createOrbitalCrown(doppler);
 check(verifyOrbitalCrown(doppler,crown.report)&&
  crown.report.authoredArchitecturalElements===43&&
  crown.report.distinctNewCells===13133&&
  crown.report.maxHeight===52&&
  crown.report.changedAtOrBelowBodyHeight===0&&
  crown.report.flatMoves===127&&
  crown.report.structuralStrengthCertified===false&&
  crown.report.constructionApproved===false&&
  crown.report.BuildPlan.operations.length===0,'REAL_MEGASTRUCTURE_SOURCE_PROOF');
 const {primitives,...meta}=crown.compiled,surface=surfaceOnly(crown.compiled);
 check(surface.length>1000&&meta.id==='doppler-monumental-orbital-crown','MISSING_3D_MODEL');
 const scene={...meta,surface,
  routeReview:crown.route,orbitalCrownReview:crown.report,
  stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 const gallery={...parent.gallery,
  scenes:[...parent.gallery.scenes,scene],
  sourceHashes:[...parent.gallery.sourceHashes,crown.compiled.sourceSha256],
  geometryHashes:[...parent.gallery.geometryHashes,crown.compiled.geometrySha256]};
 check(gallery.scenes.length===34&&
  gallery.scenes[32].id==='doppler-corridor-portfolio-monumental'&&
  gallery.scenes[33].id==='doppler-monumental-orbital-crown'&&
  new Set(gallery.scenes.map(x=>x.id)).size===34&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'ANCIENT_SCENES_OR_HOLD');
 return {gallery,parent,crown,constructionApproved:false,worldWrites:0};
}
export function renderB164Html(b,template){
 check(b?.gallery?.scenes.length===34,'GALLERY');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B164 / ORBITAL CROWN MEGASTRUCTURE')
  .replace('B143 AI Architecture Studio','B164 DOPPLER Orbital Crown')
  .replace('ChatGPTが設計した新規建築','DOPPLER — 巨大ガラス屋根と空中リングの未来宇宙港')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '幅8の回廊が支える巨大宇宙港に曲面ガラス大屋根・上層デッキ・都市級の空中リング・外装側翼を新たに組み込んだ本格3Dモデルです。');
 const mark='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(mark),'UNEXPECTED_BASE_VIEWER');
 html=html.replace(mark,
  '<div class="info"><strong>B164 — ORBITAL CROWN</strong><p>33番目は巨大回廊の基準モデル、34番目が巨大ガラス大屋根×2、空中光輪×1、上層デッキ×2、ファサードフィン×8、全43部材・13,133セル増設後の完成候補です。</p><p>実際の3D設計データを再コンパイルして生成しています。新しい屋根は既存の2×2経路を侵食しません。</p></div>'+
  '<label class="toggle"><input type="checkbox" id="b164-route" checked> 高架の2×2通行経路を重ねて表示</label>'+
  '<div id="b164-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。設計上の通路と形状確認です。構造強度・落下防止・プレイヤー衝突・実ワールド施工の安全性は認証していません。</div>'+
  mark);
 const hook=' const s=scene();floor.max=';
 check(html.includes(hook),'MISSING_SCENE_HOOK');
 html=html.replace(hook,[
  ' const s=scene();',
  ' const c=s.orbitalCrownReview,r=c?s.routeReview?.targets[0]:null;',
  ' el("b164-status").textContent=c?',
  '   "ORBITAL CROWN：新規"+c.distinctNewCells.toLocaleString()+"セル / "+c.authoredArchitecturalElements+"設計要素 / 高度"+c.maxHeight+" / 2×2経路"+r.steps+"移動："+r.status+"（実機未認証）":',
  '   "34番目の巨大宇宙港を選択すると、新規3Dセル・屋根と経路の再検証が表示されます。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 check(html.includes(draw),'MISSING_DRAW_HOOK');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const p=s.orbitalCrownReview?s.routeReview?.targets[0]?.path:null;',
  ' if(el("b164-route").checked&&p?.length){',
  '  ctx.save();ctx.strokeStyle="#b5ffe6";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();p.forEach((v,i)=>{const q=project(v[0]+1,v[1]+.18,v[2]+1);',
  '    if(!i)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const change='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 check(html.includes(change),'LISTENER');
 html=html.replace(change,change+'\nel("b164-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 check(html.includes(init),'STARTUP');
 html=html.replace(init,'\nindex=33;select.value="33";setScene();\n</script>');
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),
  'STATIC_ONLY');
 return html;
}
const HOME='<div id="b164-crown-nav" style="padding:12px 24px;background:#24444f;color:#f0fff7"><strong>B164:</strong> 巨大屋根・未来的空中リング・上層デッキの新設 → <a style="color:#bbffeb" href="./ai/orbital-crown/">34モデルの3D比較</a>（施工なし）</div>';
const AI='<div id="b164-crown-nav" class="info"><strong>B164:</strong> 43パーツ・13,133新規セルのメガストラクチャ → <a style="color:#bbffeb" href="./orbital-crown/">ORBITAL CROWN 3D</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),x=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(x);fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
}
export function writeB164Site(b,dir=SITE){
 verifyB163Site(dir);
 const html=renderB164Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/orbital-crown'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/orbital-crown/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 check(home.includes('</header>')&&!home.includes('id="b164-crown-nav"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b164-crown-nav"'),'NAV_FAILED');
 home=home.replace('</header>','</header>'+HOME);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AI);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=SHA(home));
 for(const file of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json',
  'B155_MANIFEST.json','B156_MANIFEST.json','B157_MANIFEST.json',
  'B158_MANIFEST.json','B159_MANIFEST.json','B160_MANIFEST.json',
  'B161_MANIFEST.json','B162_MANIFEST.json','B163_MANIFEST.json']){
  edit(dir,file,m=>{
   m.rootSha256=SHA(home);
   if('gallerySha256'in m)m.gallerySha256=SHA(ai);
   if('aiSha256'in m)m.aiSha256=SHA(ai);
  });
 }
 const previous=JSON.parse(read(dir,'B163_MANIFEST.json')),
  proof=b.crown.report;
 const m={schema:'minecraftaibuilder-b164-orbital-megastructure-v1',
  sceneCount:34,sourceHashes:b.gallery.sourceHashes,
  geometryHashes:b.gallery.geometryHashes,
  newSceneSourceSha256:b.crown.compiled.sourceSha256,
  newSceneGeometrySha256:b.crown.compiled.geometrySha256,
  orbitalCrownProofSha256:proof.sha256,
  architecturalElements:proof.authoredArchitecturalElements,
  addedGeometryCells:proof.distinctNewCells,
  highestCell:proof.maxHeight,
  roofShells:proof.visuallyDistinctRoofCount,
  mezzanines:proof.newMezzanineCount,
  haloRings:proof.newHaloCount,
  facadeFins:proof.newFacadeFinCount,
  alteredBodyCells:proof.changedAtOrBelowBodyHeight,
  preservedFlatMoves:proof.flatMoves,
  pageSha256:SHA(html),rootSha256:SHA(home),aiSha256:SHA(ai),
  inheritedB141Sha256:previous.inheritedB141Sha256,
  structuralStrengthCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B164_MANIFEST.json'),JSON.stringify(m,null,2)+'\n');
 check(JSON.stringify(verifyB164Site(dir))===JSON.stringify(m),'POSTWRITE');
 return m;
}
export function verifyB164Site(dir=SITE){
 verifyB163Site(dir);
 const b=makeB164Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1(),
  readHeliosR0(),readPolarisR0(),readDopplerR0());
 const m=JSON.parse(read(dir,'B164_MANIFEST.json')),
  old=JSON.parse(read(dir,'B163_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),
  html=read(dir,'ai/orbital-crown/index.html');
 const p=b.crown.report;
 check(m.schema==='minecraftaibuilder-b164-orbital-megastructure-v1'&&
  m.sceneCount===34&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.newSceneSourceSha256===b.crown.compiled.sourceSha256&&
  m.newSceneGeometrySha256===b.crown.compiled.geometrySha256&&
  m.orbitalCrownProofSha256===p.sha256&&
  m.architecturalElements===43&&m.addedGeometryCells===13133&&
  m.highestCell===52&&m.roofShells===2&&m.mezzanines===2&&
  m.haloRings===1&&m.facadeFins===8&&m.alteredBodyCells===0&&
  m.preservedFlatMoves===127&&
  m.pageSha256===SHA(html)&&
  m.pageSha256===SHA(renderB164Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===SHA(home)&&m.aiSha256===SHA(ai)&&
  m.inheritedB141Sha256===old.inheritedB141Sha256&&
  m.structuralStrengthCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  home.includes('id="b164-crown-nav"')&&ai.includes('id="b164-crown-nav"')&&
  html.includes('id="b164-route"'),'HASHES_OR_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB164Site(),null,2));
  else{
   const b=makeB164Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
    readWideDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign(),
    readInterchangeR0(),readInterchangeR1(),readHeliosR0(),readPolarisR0(),readDopplerR0());
   console.log(JSON.stringify({manifest:writeB164Site(b)},null,2));
  }
 }catch(e){console.error('B164_HOLD',e.message);process.exitCode=1;}
}
