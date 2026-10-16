/**
 * B145 — chained ChatGPT revisions, new toroidal geometry, read-only 3D comparison.
 * Each step is SHA-pinned to the exact previous design; no world commands exist.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readDesigns,compileB143Gallery,renderB143Html,verifyB143Site} from './build-b143-site.mjs';
import {readRevisionRequests,makeB144Bundle,verifyB144Site} from './build-b144-site.mjs';
import {applyRevision,verifyRevision} from '../source/ai/b144-design-revisions.mjs';
import {verifyOutput as verifyB142Output} from './build-b142-site.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SITE=path.join(ROOT,'b142-site-output'),CONT=path.join(ROOT,'designs/ai/continuations');
const TEMPLATE=path.join(ROOT,'source/ai/b143-viewer-template.html');
const sha=s=>createHash('sha256').update(s).digest('hex');
const rd=(dir,file)=>fs.readFileSync(path.join(dir,file),'utf8');
const fatal=(ok,reason)=>{if(!ok)throw Error('B145_'+reason);};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function readContinuations(dir=CONT){
 const filenames=fs.readdirSync(dir).filter(x=>/^[a-z][a-z0-9-]*-r2--r3\.json$/.test(x)).sort();
 fatal(filenames.length>=2&&filenames.length<=24,'CONTINUATION_FILE_COUNT');
 const result=filenames.map(name=>JSON.parse(rd(dir,name)));
 fatal(result.every((r,i)=>filenames[i]===r.targetId+'--r3.json'&&r.revisionId===r.targetId.replace(/-r2$/,'-r3')),'CONTINUATION_FILENAME');
 return result;
}
export function makeB145Bundle(documents,firstProposals,continuations){
 const prior=makeB144Bundle(documents,firstProposals);
 const original=new Map(documents.map(d=>[d.id,d]));
 const r2=new Map(firstProposals.map(p=>{
  const base=original.get(p.targetId);
  fatal(base,'UNKNOWN_R2_TARGET');
  const v=applyRevision(base,p);
  fatal(verifyRevision(base,p,v),'R2_PROVENANCE');
  return [v.design.id,v.design];
 }));
 fatal(r2.size===firstProposals.length,'R2_DUPLICATE');
 const originalJson=JSON.stringify(documents),r2Json=JSON.stringify([...r2.values()]);
 const outcomes=[],seen=new Set();
 for(const p of continuations){
  const base=r2.get(p.targetId);
  fatal(base&&!seen.has(p.targetId),'UNRECOGNIZED_OR_DUPLICATE_R2_TARGET');
  seen.add(p.targetId);
  const result=applyRevision(base,p);
  fatal(verifyRevision(base,p,result),'R3_PROVENANCE');
  fatal(result.comparison.sourceSha256===prior.reviews.find(x=>x.revisionId===base.id)?.revisionSourceSha256,'R2_CHAIN_HASH_DRIFT');
  outcomes.push(result);
 }
 fatal(JSON.stringify(documents)===originalJson&&JSON.stringify([...r2.values()])===r2Json,'PARENT_MUTATION');
 const all=[...documents,...r2.values(),...outcomes.map(x=>x.design)];
 const gallery=compileB143Gallery(all);
 fatal(gallery.scenes.length===documents.length+firstProposals.length+outcomes.length,'MODEL_COUNT');
 fatal(gallery.safety.minecraftWrites===0&&gallery.safety.original15BuildingSafetyGates==='9 BLOCKED','SAFETY_DRIFT');
 fatal(outcomes.every(x=>x.comparison.changes.totalChanged>50&&
  x.comparison.beforeGeometrySha256!==x.comparison.afterGeometrySha256),'NO_MEANINGFUL_VISUAL_DIFFERENCE');
 return {gallery,changes:outcomes.map(x=>x.comparison),ancestorChanges:prior.reviews,initialDesignIds:documents.map(x=>x.id)};
}
export function renderB145Html(bundle,template){
 fatal(bundle?.gallery?.scenes?.length>=6&&bundle?.changes?.length>=2,'INVALID_BUNDLE');
 const html=renderB143Html(bundle.gallery,template)
  .replace('B143 / UNIVERSAL AI DESIGN','B145 / MULTI-TURN ARCHITECTURE')
  .replace('B143 AI Architecture Studio','B145 Iterative AI Architecture Studio')
  .replace('ChatGPTが設計した新規建築','ChatGPTの追加指示に応じた3世代の建築')
  .replace('固定の住宅・ホテル・集合住宅・オフィス・図書館カテゴリに依存しない建築データの実証。',
   '初期案・R2・R3の3世代を切替えられます。変更を前の設計に結び付け、古い案を壊さず新しいトーラス形状で拡張します。')
  .replace('href="../">既存15棟の設計レビュー →','href="../../">既存15棟の設計レビュー →');
 const cards=bundle.changes.map(x=>
  '<div class="info" style="margin-top:10px"><strong>'+escape(x.revisionId)+'</strong>'+
  '<div style="font-size:.81rem;color:#b5e4ea">'+escape(x.source)+' → '+escape(x.revisionId)+'</div>'+
  '<p style="margin:5px 0">'+escape(x.request)+'</p>'+
  '<small>追加 '+x.changes.added.toLocaleString()+' / 削除 '+x.changes.removed.toLocaleString()+
  ' / 材質変更 '+x.changes.repainted.toLocaleString()+
  ' セル｜設計原本を保全｜Minecraft施工なし</small></div>').join('');
 const marker='<h2 style="margin-top:20px">表示設定</h2>';
 fatal(html.includes(marker),'TEMPLATE_CHANGED');
 return html.replace(marker,'<h2 style="margin-top:20px">R2への追加指示（R3）</h2>'+cards+marker);
}
const ROOT_NAV='<div id="b145-iteration-navigation" style="padding:12px 24px;background:#153c49;color:#d5faff;border-bottom:1px solid #288b90"><strong>B145 NEW:</strong> ChatGPTへの2回目の追加指示で中空リング・アーチを追加 → <a style="color:#8af5dd" href="./ai/iterations/">3世代の3D建築比較</a>（未施工）</div>';
const AI_NAV='<div id="b145-iteration-navigation" class="info"><strong>B145 NEW:</strong> ChatGPTの連続改修を3Dで比較 → <a style="color:#8ef4dc" href="./iterations/">初期案 → R2 → R3</a></div>';
const REV_NAV='<div id="b145-iteration-navigation" class="info"><strong>B145 NEW:</strong> 追加指示を重ねた改修 → <a style="color:#8ef4dc" href="../iterations/">初期案・R2・R3の比較</a></div>';
function addAfter(doc,where,node){
 fatal(doc.includes(where)&&!doc.includes('id="b145-iteration-navigation"'),'NAV_INSERTION_FAILED');
 return doc.replace(where,where+node);
}
function hashUpdate(dir,filename,fn){
 const full=path.join(dir,filename),data=JSON.parse(fs.readFileSync(full,'utf8'));
 fn(data);fs.writeFileSync(full,JSON.stringify(data,null,2)+'\n');
}
export function writeB145Site(bundle,dir=SITE){
 verifyB142Output(dir);verifyB143Site(dir);verifyB144Site(dir);
 const html=renderB145Html(bundle,rd(TEMPLATE.split('/').slice(0,-1).join('/'),path.basename(TEMPLATE)));
 const out=path.join(dir,'ai/iterations');fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'index.html'),html);
 const home=addAfter(rd(dir,'index.html'),'</header>',ROOT_NAV);
 const ai=addAfter(rd(dir,'ai/index.html'),'<h2>ChatGPTが設計した新規建築</h2>',AI_NAV);
 const rev=addAfter(rd(dir,'ai/revisions/index.html'),'<h2>ChatGPTによる建築の原案と改修案</h2>',REV_NAV);
 fs.writeFileSync(path.join(dir,'index.html'),home);
 fs.writeFileSync(path.join(dir,'ai/index.html'),ai);
 fs.writeFileSync(path.join(dir,'ai/revisions/index.html'),rev);
 hashUpdate(dir,'manifest.json',m=>{m.htmlSha256=sha(home);});
 hashUpdate(dir,'B143_MANIFEST.json',m=>{m.rootSha256=sha(home);m.gallerySha256=sha(ai);});
 hashUpdate(dir,'B144_MANIFEST.json',m=>{
  m.rootSha256=sha(home);m.aiSha256=sha(ai);m.previewSha256=sha(rev);
 });
 const old=JSON.parse(rd(dir,'B144_MANIFEST.json'));
 const manifest={
  schema:'minecraftaibuilder-b145-iterative-architecture-v1',
  modelCount:bundle.gallery.scenes.length,
  revisionCount:bundle.changes.length,
  sources:bundle.gallery.sourceHashes,geometry:bundle.gallery.geometryHashes,
  comparisonSha256:sha(JSON.stringify(bundle.changes)),
  previewSha256:sha(html),rootSha256:sha(home),aiSha256:sha(ai),r2PreviewSha256:sha(rev),
  b141SourceSha256:old.b141SourceSha256,
  constructionApproved:false,minecraftWrites:0,worldCoordinates:null,
  gates:Array(9).fill('BLOCKED')};
 fs.writeFileSync(path.join(dir,'B145_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
 fatal(JSON.stringify(verifyB145Site(dir))===JSON.stringify(manifest),'POSTWRITE_MISMATCH');
 return manifest;
}
export function verifyB145Site(dir=SITE){
 verifyB142Output(dir);verifyB143Site(dir);verifyB144Site(dir);
 const m=JSON.parse(rd(dir,'B145_MANIFEST.json')),b=JSON.parse(rd(dir,'B144_MANIFEST.json'));
 const bundle=makeB145Bundle(readDesigns(),readRevisionRequests(),readContinuations());
 const html=rd(dir,'ai/iterations/index.html');
 const expected=renderB145Html(bundle,rd(path.dirname(TEMPLATE),path.basename(TEMPLATE)));
 fatal(m.schema==='minecraftaibuilder-b145-iterative-architecture-v1'&&
  m.modelCount===bundle.gallery.scenes.length&&m.revisionCount===bundle.changes.length&&
  m.modelCount===6&&m.sources.join()===bundle.gallery.sourceHashes.join()&&
  m.geometry.join()===bundle.gallery.geometryHashes.join()&&
  m.comparisonSha256===sha(JSON.stringify(bundle.changes))&&
  m.previewSha256===sha(html)&&m.previewSha256===sha(expected)&&
  m.rootSha256===sha(rd(dir,'index.html'))&&
  m.aiSha256===sha(rd(dir,'ai/index.html'))&&
  m.r2PreviewSha256===sha(rd(dir,'ai/revisions/index.html'))&&
  m.b141SourceSha256===b.b141SourceSha256&&
  m.constructionApproved===false&&m.minecraftWrites===0&&m.worldCoordinates===null&&
  m.gates?.length===9&&m.gates.every(x=>x==='BLOCKED')&&
  rd(dir,'index.html').includes('b145-iteration-navigation')&&
  rd(dir,'ai/index.html').includes('b145-iteration-navigation')&&
  rd(dir,'ai/revisions/index.html').includes('b145-iteration-navigation'),'SITE_VERIFICATION_FAILED');
 return m;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.includes('--verify'))console.log(JSON.stringify(verifyB145Site(),null,2));
  else {
   const bundle=makeB145Bundle(readDesigns(),readRevisionRequests(),readContinuations());
   console.log(JSON.stringify({manifest:writeB145Site(bundle),reviews:bundle.changes},null,2));
  }
 }catch(e){console.error('B145_HOLD:',e.message);process.exitCode=1;}
}
