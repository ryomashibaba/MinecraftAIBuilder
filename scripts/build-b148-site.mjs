/**
 * B148: published, non-executable AI repair recommendation options with
 * nine historic designs untouched plus two deterministic local alternatives.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readDesigns,surfaceOnly,renderB143Html,verifyB143Site} from './build-b143-site.mjs';
import {readRevisionRequests,verifyB144Site} from './build-b144-site.mjs';
import {readContinuations,verifyB145Site} from './build-b145-site.mjs';
import {readStructuralRequests,verifyB146Site} from './build-b146-site.mjs';
import {readRepairRequest,makeB147Bundle,verifyB147Site} from './build-b147-site.mjs';
import {applyRevision,verifyRevision} from '../source/ai/b144-design-revisions.mjs';
import {generateRepairOptions,verifyRepairOptions} from '../source/ai/b148-repair-options.mjs';
import {verifyOutput as verifyB142Output} from './build-b142-site.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const digest=x=>createHash('sha256').update(x).digest('hex');
const read=(dir,name)=>fs.readFileSync(path.join(dir,name),'utf8');
const ensure=(ok,reason)=>{if(!ok)throw Error('B148_'+reason);};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function originalR4(designs,revs,cont,structure){
 const docs=new Map(designs.map(x=>[x.id,x]));
 for(const stage of [revs,cont,structure]){
  for(const p of stage){
   const base=docs.get(p.targetId);
   ensure(base&&!docs.has(p.revisionId),'BAD_ANCESTOR');
   const derived=applyRevision(base,p);
   ensure(verifyRevision(base,p,derived),'BAD_REVISION_SOURCE');
   docs.set(derived.design.id,derived.design);
  }
 }
 ensure(docs.size===8,'WRONG_HISTORY');
 return docs.get('canyon-data-sanctuary-r4');
}
export function makeB148Bundle(designs,revs,cont,structure,repair){
 const old=makeB147Bundle(designs,revs,cont,structure,repair);
 const r4=originalR4(designs,revs,cont,structure);
 const choices=generateRepairOptions(r4);
 ensure(verifyRepairOptions(r4,choices.report),'SUGGESTIONS_UNVERIFIED');
 ensure(old.gallery.scenes[6].sourceSha256===choices.report.baseSourceSha256&&
  old.gallery.scenes[6].geometrySha256===choices.report.baseGeometrySha256,'BASE_CHANGED');
 const scenes=[...old.gallery.scenes];
 const sourceHashes=[...old.gallery.sourceHashes],geometryHashes=[...old.gallery.geometryHashes];
 for(const entry of choices.candidates){
  const {primitives,...meta}=entry.scene;
  const surface=surfaceOnly(entry.scene);
  ensure(surface.length>50&&entry.summary.beforeDetachedCells===390&&
   entry.summary.afterDetachedCells===0,'OPTION_NOT_REPAIRED');
  scenes.push({...meta,surface,stats:{...meta.stats,renderedSurfaceCells:surface.length},
   repairDiagnostics:entry.diagnosis,proposedRepair:entry.summary});
  sourceHashes.push(entry.scene.sourceSha256);
  geometryHashes.push(entry.scene.geometrySha256);
 }
 ensure(scenes.length===11&&scenes[6].repairDiagnostics.detachedCellCount===390&&
  scenes[8].repairDiagnostics.detachedCellCount===0&&
  scenes[9].repairDiagnostics.detachedCellCount===0&&
  scenes[10].repairDiagnostics.detachedCellCount===0,'SUGGESTION_COUNT_OR_TOPOLOGY');
 const gallery={...old.gallery,sourceHashes,geometryHashes,scenes};
 ensure(gallery.safety.original15BuildingSafetyGates==='9 BLOCKED'&&
  gallery.safety.minecraftWrites===0&&gallery.safety.BuildPlan.operations.length===0,'UNSAFE_GALLERY');
 return {gallery,optionReport:choices.report,originalRepair:old.repairEvidence};
}
export function renderB148Html(bundle,template){
 ensure(bundle?.gallery?.scenes?.length===11&&bundle?.optionReport?.options?.length===2,
  'BAD_BUNDLE');
 const report=bundle.optionReport;
 let html=renderB143Html(bundle.gallery,template)
 .replace('B143 / UNIVERSAL AI DESIGN','B148 / EVIDENCE-DRIVEN REPAIR OPTIONS')
 .replace('B143 AI Architecture Studio','B148 AI Repair Options Studio')
 .replace('ChatGPTが設計した新規建築','診断された欠陥から新しい接続候補を生成')
 .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
  '既存設計を上書きせず、接続診断から最小案・幅広の案を自動生成。R4で赤い390セルを確認し、候補A/BまたはChatGPTの既存R5修正案と比較できます。')
 .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const controls='<h2 style="margin-top:20px">表示設定</h2>';
 ensure(html.includes(controls),'NO_CONTROL_MARKER');
 const cards=report.options.map((x,i)=>
  '<div class="info"><strong>候補 '+(i===0?'A':'B')+'：'+esc(x.label)+'</strong>'+
  '<p style="margin:5px 0;font-size:.82rem">ローカル接続：'+x.beforeDetachedCells+
  ' → '+x.afterDetachedCells+' セル。修正用部品：'+
  x.localAddedElement.size.join('×')+'。追加セル：'+x.proposedBlockCount+'。</p>'+
  '<small>自動提案であり未採用。耐荷重・強度・Minecraft施工は未検証。</small></div>'
 ).join('');
 html=html.replace(controls,
  '<h2 style="margin-top:20px">修正候補（未採用）</h2>'+cards+
  '<div class="info warn">接続候補の比較専用です。候補A/Bのどちらも採用・施工承認されていません。最下層への局所6面接続のみ確認。物理強度・地盤・動線・実施工安全性は未確認。9 BLOCKED / NOT_PREPARED。</div>'+
  '<div id="repairStatus" class="info" aria-live="polite"></div>'+
  '<label class="toggle"><input id="markDisconnected" type="checkbox" checked> 非連結部品を赤色表示</label>'+
  controls);
 const sceneHook=' const s=scene();floor.max=';
 ensure(html.includes(sceneHook),'SCENE_HOOK');
 html=html.replace(sceneHook,[
  ' const s=scene();',
  ' const diag=s.repairDiagnostics;',
  ' document.getElementById("repairStatus").textContent=diag?',
  '  "局所診断: "+diag.detachedCellCount+" 非連結セル / "+diag.detachedComponentCount+',
  '  " 非連結群。"+(s.proposedRepair?" 未採用の自動提案。":""):',
  '  "この世代の診断はありません。R4、R5または候補A/Bを選択。";',
  ' floor.max='
 ].join('\n'));
 const renderHook=' let painted=0;';
 ensure(html.includes(renderHook),'RENDER_HOOK');
 html=html.replace(renderHook,[
  ' const b148Highlight=el("markDisconnected")?.checked!==false;',
  ' const b148Disconnected=new Set((s.repairDiagnostics?.detachedPoints||[]).map(p=>p.join(",")));',
  renderHook
 ].join('\n'));
 const colorHook='  const color=palette[m]||"#aabbcc",height=1;';
 ensure(html.includes(colorHook),'COLOR_HOOK');
 html=html.replace(colorHook,[
  '  const issue=b148Highlight&&b148Disconnected.has(x+","+y+","+z);',
  '  const color=issue?"#ff4c58":palette[m]||"#aabbcc",height=1;'
 ].join('\n'));
 const checkHook='all.addEventListener("change",()=>{updateFloor();drawSoon();});';
 ensure(html.includes(checkHook),'CHECKBOX_HOOK');
 html=html.replace(checkHook,checkHook+'\nel("markDisconnected").addEventListener("change",drawSoon);');
 const loadHook='\nsetScene();\n</script>';
 ensure(html.includes(loadHook),'DEFAULT_MODEL_HOOK');
 html=html.replace(loadHook,'\nindex=6;select.value="6";setScene();\n</script>');
 ensure(html.includes('id="markDisconnected"')&&!html.includes('fetch('),'UNSAFE_RENDER');
 return html;
}
const ROOT_NAV='<div id="b148-options-navigation" style="padding:12px 24px;background:#1a384a;color:#e9faff;border-bottom:1px solid #287f92"><strong>B148 NEW:</strong> 診断から2つの修正候補を自動生成 → <a style="color:#83f6e4" href="./ai/options/">候補A・BとR4/R5を比較</a>（施工禁止）</div>';
const AI_NAV='<div id="b148-options-navigation" class="info"><strong>B148 NEW:</strong> 修正候補の自動作成 → <a style="color:#81eadc" href="./options/">候補を比較</a></div>';
function nav(doc,mark,add){
 ensure(doc.includes(mark)&&!doc.includes('id="b148-options-navigation"'),'NAV_CONFLICT');
 return doc.replace(mark,mark+add);
}
function update(dir,name,fn){
 const file=path.join(dir,name),j=JSON.parse(fs.readFileSync(file,'utf8'));
 fn(j);fs.writeFileSync(file,JSON.stringify(j,null,2)+'\n');
}
export function writeB148Site(bundle,dir=SITE){
 verifyB147Site(dir); // This recursively checks every older signed source.
 const html=renderB148Html(bundle,read(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fs.mkdirSync(path.join(dir,'ai/options'),{recursive:true});
 fs.writeFileSync(path.join(dir,'ai/options/index.html'),html);
 const home=nav(read(dir,'index.html'),'</header>',ROOT_NAV);
 const ai=nav(read(dir,'ai/index.html'),'<h2>ChatGPTが設計した新規建築</h2>',AI_NAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 update(dir,'manifest.json',m=>m.htmlSha256=digest(home));
 for(const name of ['B143_MANIFEST.json','B144_MANIFEST.json','B145_MANIFEST.json','B146_MANIFEST.json','B147_MANIFEST.json']){
  update(dir,name,m=>{
   m.rootSha256=digest(home);
   if('gallerySha256'in m)m.gallerySha256=digest(ai);
   if('aiSha256'in m)m.aiSha256=digest(ai);
  });
 }
 const last=JSON.parse(read(dir,'B147_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b148-proposal-gallery-v1',
  sceneCount:bundle.gallery.scenes.length,
  sourceHashes:bundle.gallery.sourceHashes,
  geometryHashes:bundle.gallery.geometryHashes,
  proposalProof:digest(JSON.stringify(bundle.optionReport)),
  pageSha256:digest(html),rootSha256:digest(home),aiSha256:digest(ai),
  inheritedB141Sha256:last.b141SourceSha256,
  baselineDetachedCells:390,proposedDetachedCells:[0,0],
  selected:null,constructionApproved:false,worldWrites:0,readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
 fs.writeFileSync(path.join(dir,'B148_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 ensure(JSON.stringify(verifyB148Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
export function verifyB148Site(dir=SITE){
 verifyB147Site(dir); // One full recursive check; no duplicate --verify steps in CI.
 const b=makeB148Bundle(readDesigns(),readRevisionRequests(),readContinuations(),readStructuralRequests(),readRepairRequest());
 const m=JSON.parse(read(dir,'B148_MANIFEST.json')),old=JSON.parse(read(dir,'B147_MANIFEST.json'));
 const home=read(dir,'index.html'),ai=read(dir,'ai/index.html'),page=read(dir,'ai/options/index.html');
 ensure(m.schema==='minecraftaibuilder-b148-proposal-gallery-v1'&&m.sceneCount===11&&
  m.sourceHashes.join()===b.gallery.sourceHashes.join()&&
  m.geometryHashes.join()===b.gallery.geometryHashes.join()&&
  m.proposalProof===digest(JSON.stringify(b.optionReport))&&
  m.pageSha256===digest(page)&&
  m.pageSha256===digest(renderB148Html(b,read(path.dirname(TEMPLATE),path.basename(TEMPLATE))))&&
  m.rootSha256===digest(home)&&m.aiSha256===digest(ai)&&
  m.inheritedB141Sha256===old.b141SourceSha256&&
  m.baselineDetachedCells===390&&
  JSON.stringify(m.proposedDetachedCells)==='[0,0]'&&
  m.selected===null&&m.constructionApproved===false&&m.worldWrites===0&&
  m.readiness==='NOT_PREPARED'&&m.BuildPlan.operations.length===0&&
  m.gates.length===9&&m.gates.every(g=>g==='BLOCKED')&&
  home.includes('id="b148-options-navigation"')&&ai.includes('id="b148-options-navigation"')&&
  page.includes('id="markDisconnected"'),'UNVERIFIED_SITE');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try {
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB148Site(),null,2));
  else{
   const bundle=makeB148Bundle(readDesigns(),readRevisionRequests(),readContinuations(),readStructuralRequests(),readRepairRequest());
   console.log(JSON.stringify({manifest:writeB148Site(bundle),proposals:bundle.optionReport.options},null,2));
  }
 }catch(e){console.error('B148_HOLD:',e.message);process.exitCode=1;}
}
