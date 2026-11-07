/**
 * R61: offline architectural sections from strict final B143 concept voxels.
 * R43 uses model-declared spatial criteria, never independent human approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectR43ArchitecturalSections} from '../source/ai/b198zr43-sectional-architecture-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr61-final-voxel-section-review-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR61_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldReads:0,worldWrites:0,modelCalls:0});
export function prepareR61Sections({raw,expectedRawSha256,expectedGeometrySha256}={}){
 if(typeof raw!=='string'||raw.length<1||Buffer.byteLength(raw)>120000||
  typeof expectedRawSha256!=='string'||hash(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('SOURCE_AND_COMPILER_HASH_REQUIRED');
 const r=inspectR43ArchitecturalSections(raw);
 if(r.originalRawSha256!==expectedRawSha256)fail('R43_SOURCE_HASH_MISMATCH');
 if(r.strictGeometrySha256!==undefined&&r.strictGeometrySha256!==expectedGeometrySha256)
  fail('R43_GEOMETRY_HASH_MISMATCH');
 const sections=r.crossSections??[];
 return {schema:SCHEMA,originalRawSha256:expectedRawSha256,
  expectedGeometrySha256,r43Status:r.status,
  r43GeometrySha256:r.strictGeometrySha256??null,
  finalVoxelSectionsAvailable:sections.length>0,
  sections:sections.map(s=>({kind:s.kind,id:s.id,anchor:s.anchor,atY:s.atY,
   originXZ:s.originXZ,dimensionsXZ:s.dimensionsXZ,rows:s.rows,
   anchorOccupied:s.anchorOccupied,anchorStandable:s.anchorStandable})),
  geometryDerivedIssues:r.improvementFindings??[],
  modelDeclaredFunctionalStatus:r.abstractFunctionalContractStatus??null,
  modelCriteriaAreNotIndependent:true,
  humanQualityReview:'NOT_REVIEWED',modelIdentityProven:false,
  minecraftWalkingProven:false,architectureRepaired:false,
  aestheticScoreCertified:false,modelCalls:0,worldWrites:0,safety:safety()};
}
export function renderR61SectionsHtml(r){
 if(r?.schema!==SCHEMA)fail('R61_REPORT_REQUIRED');
 const figures=r.sections.map(s=>
  '<section><h3>'+esc(s.kind)+' / '+esc(s.id)+'</h3>'+
  '<p>座標 '+esc(s.anchor.join(','))+'、足場と頭上空間：'+
  (s.anchorStandable?'あり':'なし')+'、注目点占有：'+
  (s.anchorOccupied?'あり':'なし')+'</p><pre>'+esc(s.rows.join('\n'))+'</pre></section>').join('');
 const issues=r.geometryDerivedIssues.map(i=>
  '<li>'+esc(i.kind)+' / '+esc(i.id)+'：'+esc(i.guidance)+
  ' '+esc(JSON.stringify(i.measured))+'</li>').join('');
 return '<!doctype html><html lang="ja"><head><meta charset="UTF-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R61 最終ボクセル内部断面</title>'+
  '<style>body{font:15px/1.6 system-ui,sans-serif;max-width:960px;margin:30px auto;padding:0 20px;color:#203246}section{border:1px solid #d3dde6;border-radius:8px;padding:12px;margin:15px 0}pre{background:#eff4f7;display:inline-block;padding:12px;line-height:1.2;letter-spacing:2px;max-width:100%;overflow:auto}.warn{background:#fff4dd;padding:12px}</style></head><body>'+
  '<small>MinecraftAIBuilder R61 / 原本SHA '+esc(r.originalRawSha256)+'</small>'+
  '<h1>内部の空気・床・移動の実測断面</h1>'+
  '<p class="warn">B143最終概念ボクセルの断面です。位置・達成閾値はモデル自身の宣言で、独立した人間審査基準ではありません。Minecraftでの物理歩行・施工、美しさと独創性の証明ではありません。</p>'+
  '<p>R43判定：'+esc(r.r43Status)+'</p>'+
  (r.finalVoxelSectionsAvailable?
   '<p>凡例：# 占有、o 支持床のある空気、. その他の空気。E/D/Z/Vは宣言上の注目点です。</p>'+figures:
   '<p>モデルの空間宣言を検証できないため、断面を表示していません。</p>')+
  '<h2>機能と動線の問題</h2><ul>'+
  (issues||'<li>この監査で指摘なし（独立した建築品質認定ではない）。</li>')+
  '</ul><p>原本修復なし、推論0、Minecraft操作0、NOT_PREPARED、9 BLOCKED。</p></body></html>';
}
export function writeR61FinalVoxelSections({raw,expectedRawSha256,expectedGeometrySha256,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('ORDINARY_REVIEW_DIR_REQUIRED');
 const a=path.join(destination,'R61_FINAL_VOXEL_SPATIAL_EVIDENCE.json');
 const b=path.join(destination,'R61_FINAL_VOXEL_SECTION_REVIEW.html');
 if(fs.existsSync(a)||fs.existsSync(b))fail('REVIEW_ALREADY_EXISTS_NO_OVERWRITE');
 const report=prepareR61Sections({raw,expectedRawSha256,expectedGeometrySha256});
 fs.writeFileSync(a,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(b,renderR61SectionsHtml(report),{flag:'wx'});
 return {relativeFile:path.basename(b),status:report.r43Status,
  sections:report.sections.length,modelCalls:0,worldWrites:0};
}
