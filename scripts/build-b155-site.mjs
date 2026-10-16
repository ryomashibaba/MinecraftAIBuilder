/**
 * B155 19-scene gallery: demonstrate the same category-free bridge repair
 * proof on two INDEPENDENT architectural families, R5/R6 observatory and
 * AURORA transit-hub R0/R1. Geometry and code remain world-read-only.
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
import {readBypassDesign,BYPASS_TARGETS,makeB154Bundle,verifyB154Site} from './build-b154-site.mjs';
import {compileDesign,validateDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {analyzeFootprint,verifyFootprint} from '../source/ai/b152-footprint-review.mjs';
import {analyzeBypassIntervention,verifyBypassIntervention} from '../source/ai/b154-bypass-evidence.mjs';
import {proposeSkybridge,verifySkybridgeProposal} from '../source/ai/b155-bridge-proposal.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const dir=path.join(ROOT,'designs/ai/interiors');
const hash=x=>createHash('sha256').update(x).digest('hex');
const read=(folder,file)=>fs.readFileSync(path.join(folder,file),'utf8');
const check=(b,msg)=>{if(!b)throw Error('B155_'+msg);};
export const TRANSIT_ROUTE={start:[38,20,37],destinations:[{id:'east-terminal',at:[64,20,37]}],
 width:2,depth:2,headroom:2};
export const TRANSIT_PROPOSAL={start:[38,20,37],goal:[64,20,37],
 footprintWidth:2,footprintDepth:2,corridorWidth:8,maxSpan:48};
export function readInterchangeR0(){return JSON.parse(read(dir,'aurora-interchange-r0.json'));}
export function readInterchangeR1(){return JSON.parse(read(dir,'aurora-interchange-r1.json'));}
export function makeB155Bundle(original,r2,r3,r4,repair,interiorR1,r2i,r3i,r4i,r5i,r6i,t0,t1){
 const prev=makeB154Bundle(original,r2,r3,r4,repair,interiorR1,r2i,r3i,r4i,r5i,r6i);
 check(t0.id==='aurora-interchange-r0'&&t1.id==='aurora-interchange-r1'&&
  JSON.stringify(t0.bounds)===JSON.stringify(t1.bounds)&&
  JSON.stringify(t0.elements)===JSON.stringify(t1.elements.slice(0,t0.elements.length))&&
  t1.elements.length>t0.elements.length,'TRANSIT_PROVENANCE');
 validateDesign(t0);validateDesign(t1);
 const before=compileDesign(t0),after=compileDesign(t1);
 check(verifyCompiled(t0,before)&&verifyCompiled(t1,after)&&
  before.geometrySha256!==after.geometrySha256,'COMPILATION_FAIL');
 const proposal=proposeSkybridge(before,TRANSIT_PROPOSAL);
 const baseline=analyzeFootprint(before,TRANSIT_ROUTE);
 const repaired=analyzeFootprint(after,TRANSIT_ROUTE);
 const intervention=analyzeBypassIntervention(before,after,TRANSIT_ROUTE);
 check(verifyFootprint(before,TRANSIT_ROUTE,baseline)&&
  verifyFootprint(after,TRANSIT_ROUTE,repaired)&&
  verifyBypassIntervention(before,after,TRANSIT_ROUTE,intervention)&&
  verifySkybridgeProposal(before,TRANSIT_PROPOSAL,proposal)&&
  proposal.status==='GEOMETRIC_FLOOR_PROPOSAL_ONLY'&&
  proposal.proposedFloor?.mode==='add'&&
  baseline.targets[0].status==='FOOTPRINT_UNREACHABLE'&&
  repaired.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  repaired.targets[0].steps===26&&
  intervention.targets[0].improvedByActualVoxels===true,'INDEPENDENT_BUILDING_NOT_REPAIRED');
 // Validate the automatic candidate against an actual independently compiled
 // *design*, never by blindly trusting candidate coordinates or status.
 const simulatedDesign={...t0,id:'aurora-interchange-proposal-proof',
  elements:[...t0.elements,proposal.proposedFloor]};
 const simulated=compileDesign(simulatedDesign);
 const candidateRoute=analyzeFootprint(simulated,TRANSIT_ROUTE);
 check(candidateRoute.targets[0].status==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  candidateRoute.targets[0].path.every(p=>p[1]===20),
  'AUTO_CANDIDATE_NOT_GEOMETRICALLY_PLAUSIBLE');
 // A different elevation and architectural topology MUST NOT yield the same
 // straight-bridge approval from the generic suggestion routine.
 const other=compileDesign(r5i);
 const declined=proposeSkybridge(other,{start:[49,13,31],goal:[49,14,41],
  footprintWidth:2,footprintDepth:2,corridorWidth:8,maxSpan:48});
 check(declined.status==='DIFFERENT_ELEVATIONS'&&declined.proposedFloor===null&&
  declined.constructionApproved===false,'UNSAFE_OTHER_BUILDING_PROPOSAL');
 const toScene=(scene,routeReview,proposalReview)=>{
  const {primitives,...meta}=scene,surface=surfaceOnly(scene);
  check(surface.length>50,'EMPTY_SURFACE');
  return {...meta,surface,routeReview,proposalReview,
   stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 };
 const gallery={...prev.gallery,
  scenes:[...prev.gallery.scenes,
   toScene(before,baseline,proposal),toScene(after,repaired,proposal)],
  sourceHashes:[...prev.gallery.sourceHashes,before.sourceSha256,after.sourceSha256],
  geometryHashes:[...prev.gallery.geometryHashes,before.geometrySha256,after.geometrySha256]};
 check(gallery.scenes.length===19&&gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0,'GALLERY_CONSTRUCTION_BLOCKED');
 return {gallery,baseline,repaired,intervention,proposal,candidateRoute,declined,
  parentSourceSha256:before.sourceSha256,
  childSourceSha256:after.sourceSha256,childGeometrySha256:after.geometrySha256,
  constructionApproved:false,worldWrites:0};
}
export function renderB155Html(b,template){
 check(b?.gallery?.scenes.length===19,'INVALID_RENDER_DATA');
 let html=renderB143Html(b.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B155 / MULTI-BUILDING BRIDGE REPAIR')
  .replace('B143 AI Architecture Studio','B155 Cross-Architecture Bridge Studio')
  .replace('ChatGPTが設計した新規建築','オーロラ交通施設：断絶した双翼を連結')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '観測施設とは別の大規模交通建築を追加。幅8の空中連絡橋を設計し、2×2占有領域の再接続を比較。エンジンは施工せず新しい設計用床の候補を提示します。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const mark='<h2 style="margin-top:20px">表示設定</h2>';
 check(html.includes(mark),'MISSING_CONTROLS');
 html=html.replace(mark,
  '<div class="info"><strong>B155：2つ目の建築で汎用経路修復を実証</strong>。18番目の連絡橋なしR0と19番目の連絡橋ありR1を選択してください。生成した提案は設計用候補であり自動施工・強度認証はありません。</div>'+
  '<label class="toggle"><input type="checkbox" id="b155-route" checked> 経路と2×2占有領域を重ねる</label>'+
  '<div id="b155-status" class="info" role="status" aria-live="polite"></div>'+
  '<div class="info warn">NOT_PREPARED / 9 BLOCKED。完全な床支持と頭上2セルの局所ボクセル幾何検査です。Minecraft Educationでのプレイヤー衝突・橋の構造安全・施工は未認証。</div>'+
  mark);
 const scene=' const s=scene();floor.max=';
 check(html.includes(scene),'SCENE_HOOK_MISSING');
 html=html.replace(scene,[
  ' const s=scene();',
  ' const route=s.routeReview?.targets[0],repair=s.proposalReview;',
  ' el("b155-status").textContent=route?',
  '   "2×2通行: "+route.status+" / "+',
  '   (route.steps===null?"到達経路なし":route.steps+"水平移動")+',
  '   " / 自動提案: "+repair.status+"（構造・実機未認証）":',
  '   "このモデルにはB155診断はありません。R0かR1を選択してください。";',
  ' floor.max='
 ].join('\n'));
 const draw=' ctx.globalAlpha=1;\n el("meta").textContent=';
 check(html.includes(draw),'DRAW_HOOK_MISSING');
 html=html.replace(draw,[
  ' ctx.globalAlpha=1;',
  ' const rt=s.routeReview?.targets[0];',
  ' if(el("b155-route").checked&&rt?.path?.length){',
  '  ctx.save();ctx.lineWidth=3;ctx.strokeStyle="#7ff0cf";ctx.lineJoin="round";',
  '  ctx.beginPath();rt.path.forEach((p,i)=>{',
  '   const q=project(p[0]+1,p[1]+.18,p[2]+1);',
  '   if(i===0)ctx.moveTo(q[0],q[1]);else ctx.lineTo(q[0],q[1]);',
  '  });ctx.stroke();',
  '  rt.path.filter((p,i)=>i%4===0||i===rt.path.length-1).forEach(p=>{',
  '   const q=[project(p[0],p[1]+.17,p[2]),project(p[0]+2,p[1]+.17,p[2]),',
  '    project(p[0]+2,p[1]+.17,p[2]+2),project(p[0],p[1]+.17,p[2]+2)];',
  '   ctx.beginPath();q.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));',
  '   ctx.closePath();ctx.fillStyle="rgba(127,240,207,.18)";ctx.fill();',
  '  });ctx.restore();',
  ' }',
  ' el("meta").textContent='
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 check(html.includes(cb),'EVENT_HOOK_MISSING');
 html=html.replace(cb,cb+'\nel("b155-route").addEventListener("change",drawSoon);');
 const init='\nsetScene();\n</script>';
 check(html.includes(init),'INIT_HOOK_MISSING');
 html=html.replace(init,'\nindex=18;select.value="18";setScene();\n</script>');
 check(!html.includes('fetch(')&&!html.includes('__B143_GALLERY_JSON__'),'UNSAFE_HTML');
 return html;
}
const ROOTNAV='<div id="b155-multi-navigation" style="padding:12px 24px;background:#23414c;color:#ecfff6"><strong>B155:</strong> 双翼交通施設の設計用空中橋候補と経路修復 → <a style="color:#a4ffdb" href="./ai/bridge-design/">3D比較を開く</a>（未施工）</div>';
const AINAV='<div id="b155-multi-navigation" class="info"><strong>B155 NEW:</strong> 異なる大型交通施設への汎用橋提案 → <a style="color:#a4ffdb" href="./bridge-design/">R0/R1 3D比較</a></div>';
function edit(dir,file,fn){
 const p=path.join(dir,file),m=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(m);fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');
}
export function writeB155Site(b,dir=SITE){
 verifyB154Site(dir);
 const html=renderB155Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/bridge-design'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/bridge-design/index.html'),html);
 let root=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 check(root.includes('</header>')&&!root.includes('id="b155-multi-navigation"')&&
  ai.includes('<h2>ChatGPTが設計した新規建築</h2>')&&
  !ai.includes('id="b155-multi-navigation"'),'NAV_FAILED');
 root=root.replace('</header>','</header>'+ROOTNAV);
 ai=ai.replace('<h2>ChatGPTが設計した新規建築</h2>',
  '<h2>ChatGPTが設計した新規建築</h2>'+AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 edit(dir,'manifest.json',m=>m.htmlSha256=hash(root));
 for(const file of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json',
  'B146_MANIFEST.json','B147_MANIFEST.json','B148_MANIFEST.json',
  'B149_MANIFEST.json','B150_MANIFEST.json','B151_MANIFEST.json',
  'B152_MANIFEST.json','B153_MANIFEST.json','B154_MANIFEST.json']){
  edit(dir,file,m=>{
   m.rootSha256=hash(root);
   if('gallerySha256'in m)m.gallerySha256=hash(ai);
   if('aiSha256'in m)m.aiSha256=hash(ai);
  });
 }
 const parent=JSON.parse(read(dir,'B154_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b155-multibuilding-repair-v1',sceneCount:19,
  sourceHashes:b.gallery.sourceHashes,geometryHashes:b.gallery.geometryHashes,
  parentSourceSha256:b.parentSourceSha256,
  childSourceSha256:b.childSourceSha256,
  childGeometrySha256:b.childGeometrySha256,
  beforeStatus:b.baseline.targets[0].status,
  afterStatus:b.repaired.targets[0].status,
  repairedMoves:b.repaired.targets[0].steps,
  proposalStatus:b.proposal.status,
  simulatedProposalStatus:b.candidateRoute.targets[0].status,
  rejectedOtherCategoryStatus:b.declined.status,
  actualAddedVoxels:b.intervention.physicallyAddedVoxels,
  proposalSha256:b.proposal.sha256,
  interventionSha256:b.intervention.sha256,
  pageSha256:hash(html),rootSha256:hash(root),aiSha256:hash(ai),
  inheritedB141Sha256:parent.inheritedB141Sha256,
  stairsCertified:false,playerCollisionCertified:false,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}};
 fs.writeFileSync(path.join(dir,'B155_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 check(JSON.stringify(verifyB155Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAIL');
 return manifest;
}
export function verifyB155Site(dir=SITE){
 verifyB154Site(dir);
 const b=makeB155Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
  readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
  readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
  readBypassDesign(),readInterchangeR0(),readInterchangeR1());
 const m=JSON.parse(read(dir,'B155_MANIFEST.json')),p=JSON.parse(read(dir,'B154_MANIFEST.json'));
 const root=read(dir,'index.html'),ai=read(dir,'ai/index.html'),html=read(dir,'ai/bridge-design/index.html');
 check(m.schema==='minecraftaibuilder-b155-multibuilding-repair-v1'&&
  m.sceneCount===19&&
  m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.parentSourceSha256===b.parentSourceSha256&&
  m.childSourceSha256===b.childSourceSha256&&
  m.childGeometrySha256===b.childGeometrySha256&&
  m.beforeStatus==='FOOTPRINT_UNREACHABLE'&&
  m.afterStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.repairedMoves===26&&
  m.proposalStatus==='GEOMETRIC_FLOOR_PROPOSAL_ONLY'&&
  m.simulatedProposalStatus==='PASS_FLAT_FOOTPRINT_GEOMETRY'&&
  m.rejectedOtherCategoryStatus==='DIFFERENT_ELEVATIONS'&&
  m.actualAddedVoxels===b.intervention.physicallyAddedVoxels&&
  m.actualAddedVoxels>0&&
  m.proposalSha256===b.proposal.sha256&&
  m.interventionSha256===b.intervention.sha256&&
  m.pageSha256===hash(html)&&
  m.pageSha256===hash(renderB155Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===hash(root)&&m.aiSha256===hash(ai)&&
  m.inheritedB141Sha256===p.inheritedB141Sha256&&
  m.stairsCertified===false&&m.playerCollisionCertified===false&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  m.BuildPlan.operations.length===0&&
  root.includes('id="b155-multi-navigation"')&&
  ai.includes('id="b155-multi-navigation"')&&
  html.includes('id="b155-route"'),'SITE_OR_SAFETY_FAILED');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB155Site(),null,2));
  else{
   const b=makeB155Bundle(readDesigns(),readRevisionRequests(),readContinuations(),
    readStructuralRequests(),readRepairRequest(),readInteriorDesign(),
    readUpperDesign(),readWideDesign(),readLoopDesign(),readSkyDesign(),
    readBypassDesign(),readInterchangeR0(),readInterchangeR1());
   console.log(JSON.stringify({manifest:writeB155Site(b),
    before:b.baseline.targets[0].status,after:b.repaired.targets[0].status},null,2));
  }
 }catch(e){console.error('B155_HOLD',e.message);process.exitCode=1;}
}
