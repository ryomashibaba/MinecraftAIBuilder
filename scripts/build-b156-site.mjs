/**
 * B156 design-only generative gallery, preserving every B142-B155 model.
 * The 20th scene is compiled from the inert candidate engine, NOT hardcoded.
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
import {readInterchangeR0,readInterchangeR1,TRANSIT_PROPOSAL,
 makeB155Bundle,verifyB155Site} from './build-b155-site.mjs';
import {buildBridgeCandidate,verifyBridgeCandidate} from '../source/ai/b156-candidate-proof.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const yes=(condition,why)=>{if(!condition)throw Error('B156_'+why);};
export function makeB156Bundle(original,r2,r3,r4,repair,interiorR1,r2i,r3i,r4i,r5i,r6i,t0,t1){
 const previous=makeB155Bundle(original,r2,r3,r4,repair,interiorR1,r2i,r3i,r4i,r5i,r6i,t0,t1);
 const candidate=buildBridgeCandidate(t0,TRANSIT_PROPOSAL);
 yes(verifyBridgeCandidate(t0,TRANSIT_PROPOSAL,candidate.report)&&
  candidate.report.candidateStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  candidate.report.originalStatus==='FOOTPRINT_UNREACHABLE'&&
  candidate.report.addedFloorCellCount>0&&
  candidate.report.candidateMoves===26&&
  candidate.compiled.sourceSha256!==previous.gallery.sourceHashes[17]&&
  candidate.compiled.sourceSha256!==previous.gallery.sourceHashes[18]&&
  candidate.report.structuralReviewRequired===true,'CANDIDATE_NOT_VERIFIED');
 const {primitives,...meta}=candidate.compiled,surface=surfaceOnly(candidate.compiled);
 yes(surface.length>50,'NO_NEW_SURFACE');
 const scene={...meta,surface,routeReview:candidate.after,
  generationProof:candidate.report,
  stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 const gallery={...previous.gallery,
  scenes:[...previous.gallery.scenes,scene],
  sourceHashes:[...previous.gallery.sourceHashes,candidate.compiled.sourceSha256],
  geometryHashes:[...previous.gallery.geometryHashes,candidate.compiled.geometrySha256]};
 yes(gallery.scenes.length===20&&
  gallery.scenes[17].id==='aurora-interchange-r0'&&
  gallery.scenes[18].id==='aurora-interchange-r1'&&
  gallery.scenes[19].id==='aurora-interchange-generated-candidate'&&
  gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'GALLERY_SAFETY');
 return {gallery,candidate,manual:previous.repaired,
  initial:previous.baseline,previous,
  constructionApproved:false,worldWrites:0};
}
export function renderB156Html(bundle,template){
 yes(bundle?.gallery?.scenes.length===20,'RENDER_INPUT');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B156 / GENERATED DESIGN CANDIDATE')
  .replace('B143 AI Architecture Studio','B156 Auto Bridge Candidate Studio')
  .replace('ChatGPTが設計した新規建築','自動橋案と建築家設計の高架連絡橋を比較')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '双翼交通施設R0、仕上げ付きR1、エンジンが自動生成した床だけの設計候補R2を切り替え。再コンパイルにより床支持と2×2通路の幾何成立を検証します。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const hook='<h2 style="margin-top:20px">表示設定</h2>';
 yes(html.includes(hook),'CONTROLS_MISSING');
 html=html.replace(hook,
  '<div class="info"><strong>B156：自動生成を実モデルとして比較</strong>。R0は未連結、R1は人が設計した完成形の橋、R2は自動提案の床のみです。床の幾何接続に合格しても安全柵・橋梁強度は必ず別途設計してください。</div>'+
  '<label class="toggle"><input type="checkbox" id="b156-route" checked> 2×2の経路を重ねて表示</label>'+
  '<div id="b156-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">実ブロック・歩行・荷重を未認証。NOT_PREPARED / 9 BLOCKED / BuildPlan空。自動設計候補を実ワールドへ転送しません。</div>'+
  hook);
 const scene=' const s=scene();floor.max=';
 yes(html.includes(scene),'SCENE_HOOK_MISSING');
 html=html.replace(scene,[
  ' const s=scene();',
  ' const r=s.routeReview?.targets[0],p=s.generationProof;',
  ' el("b156-status").textContent=r?',
  '   "2×2幾何検査: "+r.status+" / "+',
  '   (r.steps===null?"経路なし":r.steps+"水平移動")+',
  '   (p?" / 自動床 "+p.addedFloorCellCount+"セル追加・欄干/荷重要審査":" / 既存建築デザイン")+',
  '   "（実機未認証）":',
  '   "このモデルにB156の経路評価はありません。双翼交通施設のR0、R1または自動床案を選択。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 yes(html.includes(draw),'DRAW_HOOK_MISSING');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const rt=s.routeReview?.targets[0];',
  ' if(el("b156-route").checked&&rt?.path?.length){',
  '  ctx.save();ctx.strokeStyle="#83ffdb";ctx.lineWidth=3;ctx.lineJoin="round";',
  '  ctx.beginPath();rt.path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.2,p[2]+1);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const callback='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 yes(html.includes(callback),'EVENT_HOOK_MISSING');
 html=html.replace(callback,callback+
  '\nel("b156-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 yes(html.includes(init),'INIT_HOOK_MISSING');
 html=html.replace(init,'\nindex=19;select.value="19";setScene();\n</script>');
 yes(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'HTML_POLICY');
 return html;
}
const HOME_NAV='<div id="b156-candidate-navigation" style="padding:12px 24px;background:#24434b;color:#edfff6"><strong>B156:</strong> 自動生成した橋案と完成建築を比較 → <a style="color:#a4ffe1" href="./ai/auto-bridge/">3D検証</a>（設計のみ）</div>';
const AI_NAV='<div id="b156-candidate-navigation" class="info"><strong>B156:</strong> 自動提案の橋と手動設計案 → <a style="color:#a4ffe1" href="./auto-bridge/">20番目の3Dモデル</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),m=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(m);fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
}
export function writeB156Site(bundle,dir=SITE){
 verifyB155Site(dir);
 const html=renderB156Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/auto-bridge'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/auto-bridge/index.html'),html);
 let home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 yes(home.includes('</header>')&&!home.includes('id="b156-candidate-navigation"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b156-candidate-navigation"'),'NAVIGATION_FAILED');
 home=home.replace('</header>','</header>'+HOME_NAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AI_NAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=sha(home));
 for(const file of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json',
  'B155_MANIFEST.json']){
  edit(dir,file,m=>{
   m.rootSha256=sha(home);
   if('gallerySha256'in m)m.gallerySha256=sha(ai);
   if('aiSha256'in m)m.aiSha256=sha(ai);
  });
 }
 const ancestor=JSON.parse(read(dir,'B155_MANIFEST.json')),p=bundle.candidate.report;
 const manifest={schema:'minecraftaibuilder-b156-generated-design-v1',
  sceneCount:20,sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  candidateSourceSha256:p.candidateSourceSha256,
  candidateGeometrySha256:p.candidateGeometrySha256,
  candidateProposalSha256:p.proposalSha256,
  candidateValidationSha256:p.sha256,
  originallyDisconnected:p.originalStatus,
  candidateConnected:p.candidateStatus,
  autoFloorVoxels:p.addedFloorCellCount,candidateMoves:p.candidateMoves,
  manualMoves:bundle.manual.targets[0].steps,
  pageSha256:sha(html),rootSha256:sha(home),aiSha256:sha(ai),
  inheritedB141Sha256:ancestor.inheritedB141Sha256,
  structuralReviewRequired:true,railingReviewRequired:true,
  playerCollisionCertified:false,constructionApproved:false,
  worldWrites:0,readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B156_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 yes(JSON.stringify(verifyB156Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB156Site(dir=SITE){
 verifyB155Site(dir);
 const b=makeB156Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),readUpperDesign(),
  readWideDesign(),readLoopDesign(),readSkyDesign(),readBypassDesign(),
  readInterchangeR0(),readInterchangeR1());
 const m=JSON.parse(read(dir,'B156_MANIFEST.json')),old=JSON.parse(read(dir,'B155_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/auto-bridge/index.html');
 const p=b.candidate.report;
 yes(m.schema==='minecraftaibuilder-b156-generated-design-v1'&&
  m.sceneCount===20&&m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.candidateSourceSha256===p.candidateSourceSha256&&
  m.candidateGeometrySha256===p.candidateGeometrySha256&&
  m.candidateProposalSha256===p.proposalSha256&&m.candidateValidationSha256===p.sha256&&
  m.originallyDisconnected==='FOOTPRINT_UNREACHABLE'&&
  m.candidateConnected==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.autoFloorVoxels===p.addedFloorCellCount&&m.autoFloorVoxels>0&&
  m.candidateMoves===26&&m.manualMoves===26&&
  m.pageSha256===sha(html)&&
  m.pageSha256===sha(renderB156Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===sha(home)&&m.aiSha256===sha(ai)&&
  m.inheritedB141Sha256===old.inheritedB141Sha256&&
  m.structuralReviewRequired===true&&m.railingReviewRequired===true&&
  m.playerCollisionCertified===false&&m.constructionApproved===false&&
  m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&m.gates.length===9&&
  m.gates.every(s=>s==='BLOCKED')&&m.BuildPlan.operations.length===0&&
  home.includes('id="b156-candidate-navigation"')&&
  ai.includes('id="b156-candidate-navigation"')&&
  html.includes('id="b156-route"'),'SOURCE_OR_SAFETY_HOLD');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB156Site(),null,2));
  else{
   const b=makeB156Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
    readBypassDesign(),readInterchangeR0(),readInterchangeR1());
   console.log(JSON.stringify({manifest:writeB156Site(b),candidate:b.candidate.report},null,2));
  }
 }catch(e){console.error('B156_HOLD:',e.message);process.exitCode=1;}
}
