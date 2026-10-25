/**
 * R157 independent source-only diversity review. Different names, materials
 * and exact SHA values are NEVER treated as architectural diversity.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R156_CASES} from './r156-unknown-use-study.mjs';

const fail=s=>{throw Error('R157_'+s);};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const write=(d,n,v)=>fs.writeFileSync(path.join(d,n),
 typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
function normal(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return null;
 const spaces=p.layout?.spaces;
 if(!Array.isArray(spaces)||spaces.length===0)return null;
 const index=id=>spaces.findIndex(r=>r.id===id);
 const edges=(p.relations?.directAdjacencies??[]).map(e=>
  Array.isArray(e)?e.map(index).sort((a,b)=>a-b).join('-'):'INVALID').sort();
 const choices=p.architecture??{};
 return {
  footprint:[p.footprint?.width??null,p.footprint?.depth??null],
  roomCount:spaces.length,weightDistribution:spaces.map(x=>x.weight),
  partitionAxis:p.layout?.axis??null,entryRoomIndex:index(p.relations?.entryFacingZoneId),
  adjacency:edges,roofSilhouette:choices.roofSilhouette??null,
  volumeHierarchy:choices.volumeHierarchy??null,
  spatialBalance:choices.spatialBalance??null,
  depthBalance:choices.depthBalance??null,
  arrivalSpace:choices.arrivalSpace??null,
  roofProfile:p.form?.roofProfile??null
 };
}
const signature=x=>x===null?null:JSON.stringify(x);
const keys=['footprint','roomCount','weightDistribution','partitionAxis',
 'entryRoomIndex','adjacency','roofSilhouette','volumeHierarchy','spatialBalance','depthBalance','arrivalSpace','roofProfile'];
export function compareR157Pairs(cases){
 if(!Array.isArray(cases)||cases.length!==3)fail('CASES');
 const parsed=cases.map(x=>normal(x.parsedRaw));
 const pairs=[];
 for(let a=0;a<cases.length;a++)for(let b=a+1;b<cases.length;b++){
  const left=cases[a],right=cases[b],l=parsed[a],r=parsed[b];
  const changed=l&&r?keys.filter(k=>JSON.stringify(l[k])!==JSON.stringify(r[k])):[];
  pairs.push({pair:[left.id,right.id],hasComparableOriginals:!!l&&!!r,
   sameRoomNamesMayDiffer:true,
   sameGeometry:typeof left.geometrySha256==='string'&&left.geometrySha256===right.geometrySha256,
   sameSource:typeof left.sourceSha256==='string'&&left.sourceSha256===right.sourceSha256,
   sameSpatialStructure:!!l&&!!r&&signature(l)===signature(r),
   changedStructuralDimensions:changed,
   differenceCount:l&&r?changed.length:null,
   interpretation:!l||!r?'INSUFFICIENT_ORIGINAL_MODEL_RESPONSE':
    signature(l)===signature(r)?'CONVERGENCE_DESPITE_POSSIBLE_LABEL_MATERIAL_DIFFERENCES':
    changed.length<2?'WEAK_DIFFERENCE_ONLY':
    'STRUCTURAL_DIFFERENCES_PRESENT_ART_NOT_REVIEWED'});
 }
 return pairs;
}
export function evaluateR157Review(manifest,rawById={}){
 if(manifest?.schema!=='r156-unknown-use-v1'||!Array.isArray(manifest.cases)||
  manifest.cases.length!==3||manifest.cases.some((x,i)=>x.id!==R156_CASES[i].id))
  fail('MANIFEST_CONTRACT');
 const cases=manifest.cases.map(x=>{
  let parsedRaw=null;
  if(typeof rawById[x.id]==='string'){
   try{parsedRaw=JSON.parse(rawById[x.id]);}catch{/* unreadable genuine raw retained */ }
  }
  return {id:x.id,use:x.use,status:x.status,
   sourceSha256:x.sourceSha256,geometrySha256:x.geometrySha256,
   newLocalResponseCandidate:x.newLocalResponseCandidate===true,
   safe:x.safe===true,parsedRaw};
 });
 const comparisons=compareR157Pairs(cases);
 const valid=cases.filter(x=>x.newLocalResponseCandidate).length===3;
 const status=cases.some(x=>!x.safe)?'HOLD_SAFETY':
  !valid?'HOLD_MISSING_REAL_LOCAL_MODEL_EVIDENCE':
  comparisons.some(p=>!p.hasComparableOriginals)?'HOLD_MISSING_ORIGINAL_REPLY':
  comparisons.some(p=>p.sameGeometry||p.sameSpatialStructure)?'HOLD_SPATIAL_CONVERGENCE':
  comparisons.some(p=>p.differenceCount<2)?'HOLD_WEAK_SPATIAL_DIVERSITY':
  'HOLD_HUMAN_ART_REVIEW_REQUIRED';
 return {schema:'r157-independent-spatial-review-v1',
  status,referenceManifest:'R156_STUDY_MANIFEST.json',
  dimensionsCompared:keys,
  sourceOnly:true,realModelCandidateCases:cases.filter(x=>x.newLocalResponseCandidate).length,
  newInferenceDuringReview:0,worldWrites:0,
  humanArchitecturalArt:'ART_HOLD',minecraftRealWalking:'NOT_TESTED',
  shapeSimilarityDoesNotProveQuality:true,
  cases:cases.map(({parsedRaw,...x})=>({...x,originalJSONPresent:parsedRaw!==null})),
  pairs:comparisons};
}
function createViewer(review,base){
 const cols=review.cases.map(x=>{
  const id=x.id,use=x.use,ok=fs.existsSync(path.join(base,id,'index.html'));
  return `<section><h2>${esc(use)}</h2><p>${esc(x.status)}<br>原文JSON: ${x.originalJSONPresent?'あり':'なし'}</p>${
   ok?`<iframe loading="lazy" title="${esc(use)}真正B143" src="${id}/index.html"></iframe><p><a href="${id}/index.html">3Dを個別表示</a></p>`:
   '<p class="missing">B143ビューア未生成（HOLD）</p>'
  }</section>`;
 }).join('');
 const lines=review.pairs.map(x=>`<tr><td>${esc(x.pair.join(' / '))}</td><td>${esc(x.differenceCount??'不明')}</td><td>${esc(x.interpretation)}</td><td>${esc(x.changedStructuralDimensions.join(', '))}</td></tr>`).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R157 建築比較</title>
<style>body{margin:0;padding:24px;color:#e8edf5;background:#101722;font:15px/1.6 system-ui,sans-serif}h1{margin:0}small,.muted{color:#b3c3d5}.scenes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:22px 0}.scenes section{border:1px solid #344257;border-radius:12px;padding:12px;background:#1a2736;min-width:0}iframe{width:100%;height:420px;background:#fff;border:0;border-radius:8px}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #344257;text-align:left;vertical-align:top}a{color:#9ccaff}.missing{padding:32px;border:1px dashed #778;background:#111}.warning{max-width:78rem;background:#243243;padding:12px;border-left:3px solid #dbb56c}@media(max-width:950px){.scenes{grid-template-columns:1fr}}</style>
</head><body><h1>R157 | 未知用途・真正3D比較</h1><p class="muted">住宅・店舗・研究施設 — 同じR134/R139/R155生成エンジン。名称・装飾・色だけの違いを美術進歩とは扱わない。</p>
<p class="warning"><strong>${esc(review.status)}</strong>。これはSOURCE-ONLY監査です。美術はART HOLD、実Minecraft歩行未試験、施工禁止。CIの模擬結果は実LLM成果ではありません。</p>
<div class="scenes">${cols}</div><h2>構造上の差分（ラベル・材料を除外）</h2>
<table><thead><tr><th>比較</th><th>異なる構成項目数</th><th>監査結果</th><th>異なる項目</th></tr></thead><tbody>${lines}</tbody></table>
<p>部屋の床・屋根・入口・開口・設備・動線が実際に使用できるか、各3Dを回転・拡大して目視で評価してください。「構成が違う」だけでは現実的な建築品質を証明しません。</p>
<p><a href="R157_SPATIAL_AUDIT.json">詳細監査JSON</a></p></body></html>`;
}
export function runR157Review(dir){
 if(typeof dir!=='string'||!fs.statSync(dir).isDirectory())fail('STUDY_DIRECTORY');
 const manifestFile=path.join(dir,'R156_STUDY_MANIFEST.json');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const raws={};
 for(const c of R156_CASES){
  const raw=path.join(dir,c.id,'MODEL_RAW_ORIGINAL.txt');
  if(fs.existsSync(raw))raws[c.id]=fs.readFileSync(raw,'utf8');
 }
 const review=evaluateR157Review(manifest,raws);
 write(dir,'R157_SPATIAL_AUDIT.json',review);
 write(dir,'R157_COMPARE.html',createViewer(review,dir));
 return review;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==4||process.argv[2]!=='--study')fail('CLI_STUDY_REQUIRED');
  const r=runR157Review(path.resolve(process.argv[3]));
  console.log(JSON.stringify({status:r.status,pairwise:r.pairs.map(p=>({pair:p.pair,changed:p.differenceCount,interpretation:p.interpretation})),worldWrites:0},null,2));
  if(r.status==='HOLD_SAFETY')process.exitCode=2;
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
