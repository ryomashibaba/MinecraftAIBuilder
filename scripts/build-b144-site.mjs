/**
 * B144: Reviewable ChatGPT-authored edit proposals -> immutable revisions ->
 * before/after 3D site. A static GitHub workflow, not an always-on LLM/API.
 * Real Minecraft construction remains forbidden.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileB143Gallery,readDesigns,renderB143Html,verifyB143Site} from './build-b143-site.mjs';
import {verifyOutput as verifyB142Output} from './build-b142-site.mjs';
import {applyRevision,verifyRevision,REVISION_SCHEMA} from '../source/ai/b144-design-revisions.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REV=path.join(ROOT,'designs/ai/revisions');
const SITE=path.join(ROOT,'b142-site-output');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const H=x=>createHash('sha256').update(x).digest('hex');
const need=(condition,why)=>{if(!condition)throw Error('B144_'+why);};
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replaceAll('"','&quot;').replaceAll("'",'&#39;');
const file=(dir,name)=>path.join(dir,name);

export function readRevisionRequests(dir=REV){
 const names=fs.readdirSync(dir).filter(x=>/^[a-z][a-z0-9-]*--r[0-9]+\.json$/.test(x)).sort();
 need(names.length>=1&&names.length<=24,'REVISION_FILE_COUNT');
 const proposals=names.map(n=>JSON.parse(fs.readFileSync(file(dir,n),'utf8')));
 need(proposals.every((p,i)=>names[i]===p.targetId+'--r'+
  (p.revisionId.match(/-r([0-9]+)$/)?.[1]??'INVALID')+'.json'),'REQUEST_FILE_IDENTITY');
 return proposals;
}
export function makeB144Bundle(documents,requests){
 need(Array.isArray(documents)&&documents.length>=2,'BASE_DOCUMENTS');
 need(Array.isArray(requests)&&requests.length>=1&&requests.length<=24,'REQUEST_COUNT');
 const bases=new Map(documents.map(d=>[d.id,d]));
 need(bases.size===documents.length,'DUPLICATE_BASE');
 const results=[],ids=new Set();
 for(const proposal of requests){
  need(proposal?.schema===REVISION_SCHEMA,'REVISION_SCHEMA');
  need(!ids.has(proposal.revisionId),'DUPLICATE_REVISION');ids.add(proposal.revisionId);
  const base=bases.get(proposal.targetId);
  need(base,'UNKNOWN_REVISION_TARGET');
  const ref=H(JSON.stringify(base));
  const revised=applyRevision(base,proposal);
  need(verifyRevision(base,proposal,revised),'REVISION_PROOF_FAILED');
  need(H(JSON.stringify(base))===ref,'MUTATED_BASE');
  need(revised.comparison.sourceUnchanged===true,'SOURCE_MUTATION');
  results.push(revised);
 }
 const docs=[...documents,...results.map(r=>r.design)];
 const payload=compileB143Gallery(docs);
 need(payload.scenes.length===documents.length+results.length,'GALLERY_COUNT');
 need(payload.safety.original15BuildingSafetyGates==='9 BLOCKED'&&
  payload.safety.minecraftWrites===0&&payload.safety.BuildPlan.operations.length===0,'SAFETY');
 return {payload,reviews:results.map(r=>r.comparison)};
}
export function renderB144Html(bundle,template){
 need(bundle?.payload?.scenes?.length>=3&&bundle.reviews?.length>=1,'BAD_BUNDLE');
 let html=renderB143Html(bundle.payload,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B144 / CHATGPT-DIRECTED REVISIONS')
  .replace('B143 AI Architecture Studio','B144 AI Revision Studio')
  .replace('ChatGPTが設計した新規建築','ChatGPTによる建築の原案と改修案')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '原案を保持したまま、ChatGPTが設計した差分パッチで建物を改修。ドロップダウンで原案と R2 を切り替え、回転して見比べてください。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const cards=bundle.reviews.map(r=>
  '<div class="info" style="margin-top:9px"><strong>'+esc(r.revisionId)+'</strong>'+
  '<p style="margin:5px 0">'+esc(r.request)+'</p>'+
  '<small>追加 '+r.changes.added.toLocaleString()+' / 削除 '+r.changes.removed.toLocaleString()+
  ' / 材質変更 '+r.changes.repainted.toLocaleString()+
  ' セル。原案は書き換えていません。</small></div>').join('');
 need(html.includes('<h2 style="margin-top:20px">表示設定</h2>'),'TEMPLATE_MISMATCH');
 return html.replace('<h2 style="margin-top:20px">表示設定</h2>',
  '<h2 style="margin-top:20px">ChatGPTへの改修指示と実際の差分</h2>'+cards+
  '<h2 style="margin-top:20px">表示設定</h2>');
}
const ROOT_NAV='<div id="b144-revision-navigation" style="padding:12px 24px;background:#173753;color:#e5f4ff;border-bottom:1px solid #30719a"><strong>B144 NEW:</strong> ChatGPTへの追加指示で変化した建築を比較 → <a style="color:#88e9ff" href="./ai/revisions/">改修前 / 改修後 3D比較</a>（施工許可なし）</div>';
const AI_NAV='<div id="b144-revision-navigation" class="info"><strong>B144 NEW:</strong> ChatGPTによる設計変更の比較 → <a style="color:#7ee8fc" href="./revisions/">改修前 / 改修後 の3Dモデルを見る</a></div>';
function insert(html,needle,addition){
 need(html.includes(needle)&&!html.includes('id="b144-revision-navigation"'),'INJECTION_TARGET');
 return html.replace(needle,needle+addition);
}
export function verifyB144Site(dir=SITE){
 verifyB142Output(dir);
 verifyB143Site(dir);
 const manifest=JSON.parse(fs.readFileSync(file(dir,'B144_MANIFEST.json'),'utf8'));
 const root=fs.readFileSync(file(dir,'index.html'),'utf8');
 const ai=fs.readFileSync(file(dir,'ai/index.html'),'utf8');
 const rev=fs.readFileSync(file(dir,'ai/revisions/index.html'),'utf8');
 const old=JSON.parse(fs.readFileSync(file(dir,'B143_MANIFEST.json'),'utf8'));
 const originals=readDesigns(),requests=readRevisionRequests();
 const result=makeB144Bundle(originals,requests);
 const expected=renderB144Html(result,fs.readFileSync(TEMPLATE,'utf8'));
 need(manifest?.schema==='minecraftaibuilder-b144-revision-site-v1'&&
  manifest.modelCount===result.payload.scenes.length&&
  manifest.revisionCount===result.reviews.length&&
  manifest.sources.join()===result.payload.sourceHashes.join()&&
  manifest.geometry.join()===result.payload.geometryHashes.join()&&
  manifest.reviewHash===H(JSON.stringify(result.reviews))&&
  manifest.previewSha256===H(rev)&&manifest.previewSha256===H(expected)&&
  manifest.rootSha256===H(root)&&manifest.aiSha256===H(ai)&&
  manifest.b141SourceSha256===old.b142IntegritySha256&&
  old.sourceIds.length===originals.length&&
  root.includes('id="b144-revision-navigation"')&&
  ai.includes('id="b144-revision-navigation"')&&
  manifest.constructionApproved===false&&manifest.minecraftWrites===0&&
  manifest.gates.length===9&&manifest.gates.every(g=>g==='BLOCKED'),'VERIFY_FAILED');
 return manifest;
}
export function writeB144Site(bundle,dir=SITE){
 // Preserve and check the previously safe B143/B142 publication first.
 verifyB143Site(dir);verifyB142Output(dir);
 need(bundle?.payload?.safety?.minecraftWrites===0&&bundle?.reviews?.length>=1,'UNSAFE_INPUT');
 const page=renderB144Html(bundle,fs.readFileSync(TEMPLATE,'utf8'));
 const target=file(dir,'ai/revisions');
 fs.mkdirSync(target,{recursive:true});
 fs.writeFileSync(file(target,'index.html'),page);
 const root=insert(fs.readFileSync(file(dir,'index.html'),'utf8'),'</header>',ROOT_NAV);
 const ai=insert(fs.readFileSync(file(dir,'ai/index.html'),'utf8'),'<h2>ChatGPTが設計した新規建築</h2>',AI_NAV);
 fs.writeFileSync(file(dir,'index.html'),root);
 fs.writeFileSync(file(dir,'ai/index.html'),ai);
 const b142=JSON.parse(fs.readFileSync(file(dir,'manifest.json'),'utf8'));
 b142.htmlSha256=H(root);fs.writeFileSync(file(dir,'manifest.json'),JSON.stringify(b142,null,2)+'\n');
 const b143=JSON.parse(fs.readFileSync(file(dir,'B143_MANIFEST.json'),'utf8'));
 b143.rootSha256=H(root);b143.gallerySha256=H(ai);
 fs.writeFileSync(file(dir,'B143_MANIFEST.json'),JSON.stringify(b143,null,2)+'\n');
 const manifest={schema:'minecraftaibuilder-b144-revision-site-v1',
  modelCount:bundle.payload.scenes.length,revisionCount:bundle.reviews.length,
  sources:bundle.payload.sourceHashes,geometry:bundle.payload.geometryHashes,
  reviewHash:H(JSON.stringify(bundle.reviews)),
  previewSha256:H(page),rootSha256:H(root),aiSha256:H(ai),
  b141SourceSha256:b143.b142IntegritySha256,
  minecraftWrites:0,constructionApproved:false,gates:Array(9).fill('BLOCKED')};
 fs.writeFileSync(file(dir,'B144_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 need(JSON.stringify(verifyB144Site(dir))===JSON.stringify(manifest),'POSTWRITE_FAILED');
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB144Site(),null,2));
  else{
   const bundle=makeB144Bundle(readDesigns(),readRevisionRequests());
   console.log(JSON.stringify({site:writeB144Site(bundle),reviews:bundle.reviews},null,2));
  }
 }catch(e){console.error('B144_HOLD:',e.message);process.exitCode=1;}
}
