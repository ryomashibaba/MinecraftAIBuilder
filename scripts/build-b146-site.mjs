/**
 * B146 -- eight independently compiled ChatGPT architecture generations,
 * topology review and local beam semantics, no physical construction.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readDesigns,compileB143Gallery,renderB143Html,verifyB143Site} from './build-b143-site.mjs';
import {readRevisionRequests,verifyB144Site} from './build-b144-site.mjs';
import {readContinuations,makeB145Bundle,verifyB145Site} from './build-b145-site.mjs';
import {applyRevision,verifyRevision} from '../source/ai/b144-design-revisions.mjs';
import {reviewVoxelTopology,TOPOLOGY_SCHEMA} from '../source/ai/b146-topology-review.mjs';
import {verifyOutput as verifyB142Output} from './build-b142-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DIR=path.join(ROOT,'b142-site-output');
const STRUCT=path.join(ROOT,'designs/ai/structural');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const H=s=>createHash('sha256').update(s).digest('hex');
const die=(b,m)=>{if(!b)throw Error('B146_'+m);};
const read=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');

export function readStructuralRequests(dir=STRUCT){
 const names=fs.readdirSync(dir).filter(x=>/^[a-z][a-z0-9-]*-r3--r4\.json$/.test(x)).sort();
 die(names.length===2,'MISSING_OR_UNKNOWN_STRUCTURAL_REQUEST');
 const requests=names.map(name=>JSON.parse(read(dir,name)));
 die(requests.every((p,i)=>names[i]===p.targetId+'--r4.json'&&p.revisionId===p.targetId.replace(/-r3$/,'-r4')),'INCORRECT_REQUEST_FILENAME');
 return requests;
}
export function makeB146Bundle(original,r2Requests,r3Requests,r4Requests){
 const parents=makeB145Bundle(original,r2Requests,r3Requests);
 die(parents.gallery.scenes.length===6,'PARENT_GALLERY_COUNT');
 const docs=[...original],byId=new Map(original.map(d=>[d.id,d]));
 for(const seq of [r2Requests,r3Requests,r4Requests]){
  const before=JSON.stringify(docs);
  for(const p of seq){
   const target=byId.get(p.targetId);
   die(target&&!byId.has(p.revisionId),'INVALID_CHAIN_TARGET');
   const proposed=applyRevision(target,p);
   die(verifyRevision(target,p,proposed),'BROKEN_SOURCE_PIN');
   docs.push(proposed.design);
   byId.set(proposed.design.id,proposed.design);
  }
  // Each prior revision is frozen and cannot be overwritten by its successor.
  die(docs.length===Object.keys(Object.fromEntries(docs.map(d=>[d.id,d]))).length,'DUPLICATE_DOCUMENT');
  die(JSON.stringify(docs.slice(0,-seq.length))===before,'ANCESTOR_MUTATION');
 }
 die(docs.length===8,'EXPECTED_8_GENERATIONS');
 const gallery=compileB143Gallery(docs,{auditCompiled:reviewVoxelTopology});
 die(gallery.scenes.length===8&&gallery.sourceHashes.length===8,'BAD_NEW_GALLERY');
 die(gallery.scenes.slice(0,6).every((s,i)=>s.geometrySha256===parents.gallery.scenes[i].geometrySha256),'B145_SOURCE_DRIFT');
 const evidence=gallery.scenes.map(s=>s.topologyReview);
 die(evidence.every(e=>e.schema===TOPOLOGY_SCHEMA&&e.readiness==='NOT_PREPARED'&&
  e.gates.length===9&&e.gates.every(x=>x==='BLOCKED')&&
  e.physicalLoadPathCertified===false&&e.structuralStabilityCertified===false&&
  e.worldWrites===0),'TOPOLOGY_SAFETY');
 const revisions=r4Requests.map(p=>applyRevision(byId.get(p.targetId),p).comparison);
 die(revisions.every(r=>r.changes.totalChanged>=25&&
  r.constructionApproved===false&&r.BuildPlan.operations.length===0),'REVISION_SAFETY');
 return {gallery,revisions,evidence,
  comparison:{beforeSha256:parents.gallery.geometryHashes,
   addedR4:gallery.geometryHashes.slice(-2),auditSha256:evidence.map(x=>x.auditSha256)},
  safety:{constructionApproved:false,readiness:'NOT_PREPARED',
   gates:Array(9).fill('BLOCKED'),worldContacts:0,worldCoordinates:null,BuildPlan:{operations:[]}}};
}
export function renderB146Html(bundle,template){
 die(bundle?.gallery?.scenes.length===8&&bundle?.evidence?.length===8,'BAD_BUNDLE');
 let html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B146 / GENERIC STRUCTURAL TOPOLOGY')
  .replace('B143 AI Architecture Studio','B146 Structural Concept Studio')
  .replace('ChatGPTが設計した新規建築','ChatGPT設計：4世代の接続構造と梁')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '2つの建築を4世代ずつ比較。任意方向の梁を追加し、各モデルの接続部品群と最下層につながらない部品群を全ボクセルから検出します。実物の構造安全性は認証していません。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const marker='<h2 style="margin-top:20px">表示設定</h2>';
 die(html.includes(marker),'TEMPLATE_FIELDS');
 html=html.replace(marker,
 '<h2 style="margin-top:20px">構造接続の検査（概念）</h2>'+
 '<div id="topologyReview" class="info" aria-live="polite"></div>'+
 '<div class="info warn">6面隣接・ローカル最下層への連結のみ検証。梁の荷重、階段、強度、実ワールド地盤、支持材、衝突、避難・施工の安全性は未検証です。<strong>9 BLOCKED / NOT_PREPARED</strong></div>'+
 marker);
 const js=' const s=scene();floor.max=';
 die(html.includes(js),'SCENE_SWITCH_HOOK');
 html=html.replace(js,[
  ' const s=scene();',
  ' const r=s.topologyReview;',
  ' document.getElementById("topologyReview").textContent=',
  '  "局所接続群: "+r.components+" 個 / 最下層に非連結: "+',
  '  r.detachedComponents+" 群 ("+r.detachedCells.toLocaleString()+',
  '  " セル) / 下側に直近セルなし: "+r.exposedOverhangCandidates.toLocaleString()+',
  '  " セル / 基準はローカルY="+r.localMinY+"。実構造の認証ではありません。";',
  ' floor.max='
 ].join('\n'));
 die(!html.includes('fetch(')&&html.includes('id="topologyReview"'),'RENDER_UNTRUSTED');
 return html;
}
const NAV_ROOT='<div id="b146-topology-navigation" style="padding:12px 24px;background:#17394e;color:#dcf7ff;border-bottom:1px solid #247a99"><strong>B146 NEW:</strong> ChatGPT設計した梁・補剛材・接続トポロジーを確認 → <a style="color:#88eaf6" href="./ai/structure/">8世代の構造レビュー</a>（耐荷重・施工は未認証）</div>';
const NAV_AI='<div id="b146-topology-navigation" class="info"><strong>B146 NEW:</strong> 梁と接続状態を確認 → <a style="color:#83f5ef" href="./structure/">8世代の構造レビュー</a></div>';
function appendNavigation(doc,marker,nav){
 die(doc.includes(marker)&&!doc.includes('id="b146-topology-navigation"'),'DUPLICATE_OR_BAD_NAV');
 return doc.replace(marker,marker+nav);
}
function updateManifest(dir,filename,update){
 const file=path.join(dir,filename),value=JSON.parse(fs.readFileSync(file,'utf8'));
 update(value);
 fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
}
export function writeB146Site(bundle,dir=DIR){
 verifyB142Output(dir);verifyB143Site(dir);verifyB144Site(dir);verifyB145Site(dir);
 const template=read(path.dirname(TEMPLATE),path.basename(TEMPLATE));
 const page=renderB146Html(bundle,template);
 fs.mkdirSync(path.join(dir,'ai/structure'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/structure/index.html'),page);
 const root=appendNavigation(read(dir,'index.html'),'</header>',NAV_ROOT);
 const ai=appendNavigation(read(dir,'ai/index.html'),'<h2>ChatGPTが設計した新規建築</h2>',NAV_AI);
 fs.writeFileSync(path.join(dir,'index.html'),root);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 updateManifest(dir,'manifest.json',m=>{m.htmlSha256=H(root);});
 updateManifest(dir,'B143_MANIFEST.json',m=>{m.rootSha256=H(root);m.gallerySha256=H(ai);});
 updateManifest(dir,'B144_MANIFEST.json',m=>{m.rootSha256=H(root);m.aiSha256=H(ai);});
 updateManifest(dir,'B145_MANIFEST.json',m=>{m.rootSha256=H(root);m.aiSha256=H(ai);});
 const b145=JSON.parse(read(dir,'B145_MANIFEST.json'));
 const manifest={schema:'minecraftaibuilder-b146-topology-site-v1',
  modelCount:bundle.gallery.scenes.length,sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  revisionsHash:H(JSON.stringify(bundle.revisions)),
  reviews:bundle.evidence.map(r=>({id:r.sourceGeometrySha256,sha256:r.auditSha256,
   components:r.components,detachedComponents:r.detachedComponents,detachedCells:r.detachedCells,
   overhangCandidates:r.exposedOverhangCandidates})),
  previewSha256:H(page),rootSha256:H(root),gallerySha256:H(ai),
  b141SourceSha256:b145.b141SourceSha256,
  constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
 fs.writeFileSync(path.join(dir,'B146_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 die(JSON.stringify(verifyB146Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB146Site(dir=DIR){
 verifyB142Output(dir);verifyB143Site(dir);verifyB144Site(dir);verifyB145Site(dir);
 const m=JSON.parse(read(dir,'B146_MANIFEST.json'));
 const bundle=makeB146Bundle(readDesigns(),readRevisionRequests(),readContinuations(),readStructuralRequests());
 const page=read(dir,'ai/structure/index.html'),template=read(path.dirname(TEMPLATE),path.basename(TEMPLATE));
 const parent=JSON.parse(read(dir,'B145_MANIFEST.json'));
 die(m.schema==='minecraftaibuilder-b146-topology-site-v1'&&
  m.modelCount===8&&m.modelCount===bundle.gallery.scenes.length&&
  m.sourceHashes.join()===bundle.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===bundle.gallery.geometryHashes.join()&&
  m.revisionsHash===H(JSON.stringify(bundle.revisions))&&
  JSON.stringify(m.reviews)===JSON.stringify(bundle.evidence.map(r=>({
   id:r.sourceGeometrySha256,sha256:r.auditSha256,components:r.components,
   detachedComponents:r.detachedComponents,detachedCells:r.detachedCells,
   overhangCandidates:r.exposedOverhangCandidates})))&&
  m.previewSha256===H(page)&&m.previewSha256===H(renderB146Html(bundle,template))&&
  m.rootSha256===H(read(dir,'index.html'))&&
  m.gallerySha256===H(read(dir,'ai/index.html'))&&
  m.b141SourceSha256===parent.b141SourceSha256&&
  read(dir,'index.html').includes('b146-topology-navigation')&&
  read(dir,'ai/index.html').includes('b146-topology-navigation')&&
  m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.BuildPlan.operations.length===0&&
  m.gates.length===9&&m.gates.every(x=>x==='BLOCKED'),'SITE_VERIFICATION_FAILED');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try {
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB146Site(),null,2));
  else{
   const bundle=makeB146Bundle(readDesigns(),readRevisionRequests(),readContinuations(),readStructuralRequests());
   console.log(JSON.stringify({site:writeB146Site(bundle),revisions:bundle.revisions},null,2));
  }
 }catch(e){console.error('B146_HOLD:',e.message);process.exitCode=1;}
}
