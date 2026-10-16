/**
 * B147: source-pinned ChatGPT repair of a proven isolated 390-cell roof beam.
 * Published content is a local conceptual model, not Minecraft operations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readDesigns,surfaceOnly,renderB143Html,verifyB143Site} from './build-b143-site.mjs';
import {readRevisionRequests,verifyB144Site} from './build-b144-site.mjs';
import {readContinuations,verifyB145Site} from './build-b145-site.mjs';
import {makeB146Bundle,readStructuralRequests,verifyB146Site} from './build-b146-site.mjs';
import {applyRevision,verifyRevision} from '../source/ai/b144-design-revisions.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {reviewVoxelTopology,verifyTopology} from '../source/ai/b146-topology-review.mjs';
import {diagnoseDetached,verifyDiagnosis} from '../source/ai/b147-detachment-diagnosis.mjs';
import {verifyOutput as verifyB142Output} from './build-b142-site.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const REPAIR=path.join(ROOT,'designs/ai/repairs/canyon-data-sanctuary-r4--r5.json');
const digest=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8');
const good=(b,m)=>{if(!b)throw Error('B147_'+m);};
export function readRepairRequest(){return JSON.parse(fs.readFileSync(REPAIR,'utf8'));}
export function makeB147Bundle(original,r2,r3,r4,repair){
 const base=makeB146Bundle(original,r2,r3,r4);
 good(base.gallery.scenes.length===8,'B146_SOURCE_CHANGED');
 const byId=new Map(original.map(d=>[d.id,d]));
 const origJson=JSON.stringify(original);
 for(const proposals of [r2,r3,r4]){
  for(const p of proposals){
   const parent=byId.get(p.targetId);
   good(parent&&!byId.has(p.revisionId),'BAD_ANCESTOR');
   const revised=applyRevision(parent,p);
   good(verifyRevision(parent,p,revised),'INVALID_PARENT_REVISION');
   byId.set(revised.design.id,revised.design);
  }
 }
 good(JSON.stringify(original)===origJson,'SOURCE_MUTATION');
 good(repair?.targetId==='canyon-data-sanctuary-r4'&&
  repair?.revisionId==='canyon-data-sanctuary-r5'&&!byId.has(repair.revisionId),'REPAIR_TARGET');
 const predecessor=byId.get(repair.targetId);
 good(predecessor,'NO_REPAIR_BASE');
 const source=compileDesign(predecessor);
 good(verifyCompiled(predecessor,source),'UNVERIFIED_R4');
 good(base.gallery.scenes[6].id===predecessor.id&&
  base.gallery.scenes[6].geometrySha256===source.geometrySha256,'B146_R4_GEOMETRY_DRIFT');
 const issue=diagnoseDetached(source);
 good(verifyDiagnosis(source,issue),'ISSUE_PROOF_FAILED');
 good(issue.detachedCellCount===390&&issue.components.length===1&&
  JSON.stringify(issue.components[0].bounds)===JSON.stringify({
   min:[24,48,57],max:[62,49,61]})&&
  issue.components[0].nearestBasalConnectedWitness?.manhattanDistance===2,
  'ORIGINAL_KNOWN_390_ISSUE_CHANGED');
 const r5=applyRevision(predecessor,repair);
 good(verifyRevision(predecessor,repair,r5),'UNTRUSTED_R5_PATCH');
 const revised=compileDesign(r5.design);
 good(verifyCompiled(r5.design,revised)&&
  r5.comparison.changes.totalChanged>=25,'R5_NO_MEANINGFUL_DIFFERENCE');
 const after=diagnoseDetached(revised),audit=reviewVoxelTopology(revised);
 good(verifyDiagnosis(revised,after)&&verifyTopology(revised,audit),'REPAIR_AUDIT_FAILED');
 good(after.detachedComponentCount===0&&after.detachedCellCount===0,'REPAIR_NOT_CONNECTED');
 good(audit.physicalLoadPathCertified===false&&audit.structuralStabilityCertified===false,'INVALID_CERTIFICATION');
 const {primitives,...meta}=revised;
 const surface=surfaceOnly(revised);
 good(surface.length>50,'R5_NO_SURFACE');
 const scene={...meta,surface,topologyReview:audit,repairDiagnostics:after,
  stats:{...meta.stats,renderedSurfaceCells:surface.length}};
 const scenes=[...base.gallery.scenes,scene];
 scenes[6]={...scenes[6],repairDiagnostics:issue};
 good(scenes.length===9&&scenes[8].id==='canyon-data-sanctuary-r5','MODEL_COUNT');
 const gallery={...base.gallery,
  sourceHashes:[...base.gallery.sourceHashes,scene.sourceSha256],
  geometryHashes:[...base.gallery.geometryHashes,scene.geometrySha256],scenes};
 good(gallery.safety.minecraftWrites===0&&
  gallery.safety.BuildPlan.operations.length===0&&
  gallery.safety.original15BuildingSafetyGates==='9 BLOCKED','GALLERY_SAFETY');
 return {gallery,repairEvidence:{
  schema:'minecraftaibuilder-b147-verifiable-repair-v1',
  request:repair.request,target:repair.targetId,revision:repair.revisionId,
  beforeSourceSha256:source.sourceSha256,afterSourceSha256:revised.sourceSha256,
  beforeGeometrySha256:source.geometrySha256,afterGeometrySha256:revised.geometrySha256,
  diff:r5.comparison.changes,
  beforeDetachedCells:issue.detachedCellCount,afterDetachedCells:after.detachedCellCount,
  beforeDetachedGroups:issue.detachedComponentCount,afterDetachedGroups:after.detachedComponentCount,
  diagnosisSha256:issue.sha256,repairedDiagnosisSha256:after.sha256,
  witness:issue.components[0].nearestBasalConnectedWitness,
  originalPreserved:true,physicsCertified:false,
  constructionApproved:false,worldContacts:0,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 }};
}
export function renderB147Html(bundle,template){
 good(bundle?.gallery?.scenes?.length===9&&bundle?.repairEvidence?.afterDetachedCells===0,'BAD_REVIEW_BUNDLE');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B147 / CHATGPT GEOMETRIC REPAIR')
  .replace('B143 AI Architecture Studio','B147 Topology Repair Studio')
  .replace('ChatGPTが設計した新規建築','ChatGPT修正前後：切断された梁を接続')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
    '原案からR5まで選択できます。峡谷のR4には背面横梁の非連結390セルがあります。赤色表示で場所を確認し、R5へ切り替えて接続修正後と比較してください。構造安全性は未認証です。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const marker='<h2 style="margin-top:20px">表示設定</h2>';
 good(html.includes(marker),'RENDER_MARKER');
 const diagnosticMarkup=[
 '<h2 style="margin-top:20px">接続問題と修正の証拠</h2>',
 '<div class="info"><strong>R4 → R5 修正</strong>',
 '<p>R4: 背面横梁390セルが非連結（ローカル X24–62、Y48–49、Z57–61） → R5: 0セル。</p>',
 '<p>ChatGPTが支持材3本を設計し、旧版を保存したままR5として追加しました。</p>',
 '<p style="font-size:.78rem">接続点候補: (24,47,57)。ローカル座標の形状上の候補であり、強度を保証しません。</p></div>',
 '<div id="diagnosticStatus" class="info" aria-live="polite"></div>',
 '<label class="toggle"><input type="checkbox" id="highlightDetached" checked> 未接続セルを赤色で強調</label>',
 '<div class="info warn">6方向接続だけの概念検査。荷重・強度・地盤・通路・施工は未検証。NOT_PREPARED・9 BLOCKED。</div>'
 ].join('\n');
 html=html.replace(marker,diagnosticMarkup+'\n'+marker);
 const src=' const s=scene();floor.max=';
 good(html.includes(src),'SET_SCENE_HOOK');
 html=html.replace(src,[
 ' const s=scene();',
 ' const issue=s.repairDiagnostics;',
 ' document.getElementById("diagnosticStatus").textContent=issue?',
 '   "診断: "+issue.detachedComponentCount+" 非連結群 / "+issue.detachedCellCount+',
 '   " セル。"+(issue.detachedCellCount?"赤い部品を確認してください。":"非連結セルなし（局所接続のみ）。"):',
 '   "この世代の問題箇所表示はありません。R4とR5を選択してください。";',
 ' floor.max='
 ].join('\n'));
 const draw=' let painted=0;';
 good(html.includes(draw),'DRAW_MARKER');
 html=html.replace(draw,[
 ' const b147Highlighted=document.getElementById("highlightDetached")?.checked!==false;',
 ' const b147Missing=new Set((s.repairDiagnostics?.detachedPoints||[]).map(p=>p.join(",")));',
 draw
 ].join('\n'));
 const col='  const color=palette[m]||"#aabbcc",height=1;';
 good(html.includes(col),'PALETTE_MARKER');
 html=html.replace(col,[
 '  const problem=b147Highlighted&&b147Missing.has(x+","+y+","+z);',
 '  const color=problem?"#ff4c58":palette[m]||"#aabbcc",height=1;'
 ].join('\n'));
 const cb='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 good(html.includes(cb),'TOGGLE_MARKER');
 html=html.replace(cb,cb+'\n'+'el("highlightDetached").addEventListener("change",drawSoon);');
 good(html.includes('id="diagnosticStatus"')&&
  html.includes('b147Missing')&&!html.includes('fetch('),'UNSAFE_VIEW');
 return html;
}
const ROOTNAV='<div id="b147-repair-navigation" style="padding:12px 24px;background:#183943;color:#edfcff;border-bottom:1px solid #278b93"><strong>B147 NEW:</strong> ChatGPTが非連結390セルの梁を診断・R5で修正 → <a style="color:#8df5df" href="./ai/repairs/">修正前後の赤色ハイライト比較</a>（局所接続のみ検証）</div>';
const AINAV='<div id="b147-repair-navigation" class="info"><strong>B147 NEW:</strong> 非連結部品を検出し修正 → <a style="color:#8cf5e0" href="./repairs/">R4とR5の3D比較</a></div>';
function nav(doc,marker,node){
 good(doc.includes(marker)&&!doc.includes('id="b147-repair-navigation"'),'NAV_CONFLICT');
 return doc.replace(marker,marker+node);
}
function manifestChange(dir,name,fn){
 const p=path.join(dir,name),obj=JSON.parse(fs.readFileSync(p,'utf8'));
 fn(obj);fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n');
}
export function writeB147Site(bundle,dir=SITE){
 verifyB142Output(dir);verifyB143Site(dir);verifyB144Site(dir);verifyB145Site(dir);verifyB146Site(dir);
 const html=renderB147Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 const sub=path.join(dir,'ai/repairs');fs.mkdirSync(sub,{recursive:true});
 fs.writeFileSync(path.join(sub,'index.html'),html);
 const root=nav(read(dir,'index.html'),'</header>',ROOTNAV);
 const ai=nav(read(dir,'ai/index.html'),'<h2>ChatGPTが設計した新規建築</h2>',AINAV);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 manifestChange(dir,'manifest.json',m=>{m.htmlSha256=digest(root);});
 for(const f of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json','B146_MANIFEST.json'])
  manifestChange(dir,f,m=>{m.rootSha256=digest(root);
   if('gallerySha256'in m)m.gallerySha256=digest(ai);
   if('aiSha256'in m)m.aiSha256=digest(ai);});
 const prev=JSON.parse(read(dir,'B146_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b147-ai-topology-repair-site-v1',
  modelCount:bundle.gallery.scenes.length,
  sources:bundle.gallery.sourceHashes,geometries:bundle.gallery.geometryHashes,
  repairDigest:digest(JSON.stringify(bundle.repairEvidence)),
  pageSha256:digest(html),rootSha256:digest(root),aiSha256:digest(ai),
  b141SourceSha256:prev.b141SourceSha256,
  beforeDetachedCells:bundle.repairEvidence.beforeDetachedCells,
  afterDetachedCells:bundle.repairEvidence.afterDetachedCells,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
 fs.writeFileSync(path.join(dir,'B147_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 good(JSON.stringify(verifyB147Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB147Site(dir=SITE){
 verifyB142Output(dir);verifyB143Site(dir);verifyB144Site(dir);verifyB145Site(dir);verifyB146Site(dir);
 const bundle=makeB147Bundle(readDesigns(),readRevisionRequests(),readContinuations(),readStructuralRequests(),readRepairRequest());
 const m=JSON.parse(read(dir,'B147_MANIFEST.json')),ref=JSON.parse(read(dir,'B146_MANIFEST.json'));
 const p=read(dir,'ai/repairs/index.html'),home=read(dir,'index.html'),ai=read(dir,'ai/index.html');
 good(m.schema==='minecraftaibuilder-b147-ai-topology-repair-site-v1'&&
  m.modelCount===9&&m.sources.join()===bundle.gallery.sourceHashes.join()&&
  m.geometries.join()===bundle.gallery.geometryHashes.join()&&
  m.repairDigest===digest(JSON.stringify(bundle.repairEvidence))&&
  m.pageSha256===digest(p)&&
  m.pageSha256===digest(renderB147Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===digest(home)&&m.aiSha256===digest(ai)&&
  m.b141SourceSha256===ref.b141SourceSha256&&
  m.beforeDetachedCells===390&&m.afterDetachedCells===0&&
  m.constructionApproved===false&&m.worldWrites===0&&m.readiness==='NOT_PREPARED'&&
  m.BuildPlan.operations.length===0&&m.gates.length===9&&
  m.gates.every(x=>x==='BLOCKED')&&
  home.includes('id="b147-repair-navigation"')&&ai.includes('id="b147-repair-navigation"')&&
  p.includes('id="highlightDetached"'),'FAILED_SAFETY_OR_SOURCE_AUDIT');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB147Site(),null,2));
  else{
   const result=makeB147Bundle(readDesigns(),readRevisionRequests(),readContinuations(),readStructuralRequests(),readRepairRequest());
   console.log(JSON.stringify({site:writeB147Site(result),repair:result.repairEvidence},null,2));
  }
 }catch(e){console.error('B147_HOLD:',e.message);process.exitCode=1;}
}
