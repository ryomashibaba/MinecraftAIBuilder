/**
 * R63: compare two SHA-pinned ORIGINAL proposals without running a model.
 * Even exact local-voxel overlap cannot prove a common architectural frame,
 * intended authorship, design continuity, user experience or aesthetics.
 * Missing B143 compilation NEVER becomes zero-floor/zero-height evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';

export const SCHEMA='minecraftaibuilder-b198zr63-architectural-continuity-watch-v1';
const fail=s=>{throw Error('B198ZR63_'+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldReads:0,worldWrites:0,
 modelCalls:0});
const c01=CREATION_CASES.find(c=>c.id==='c01');
const int3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isSafeInteger);
function inspectOne(raw,expectedSha){
 if(typeof raw!=='string'||Buffer.byteLength(raw)<1||
  Buffer.byteLength(raw)>120000||!expectedSha||sha(raw)!==expectedSha)
  fail('ORIGINAL_RAW_SHA_REQUIRED');
 let parsed;
 try{parsed=JSON.parse(raw)}catch{
  return {originalRawSha256:expectedSha,b143:'HOLD_INVALID_JSON',
   sourceGeometryAvailable:false,measures:null,designSummary:null};
 }
 const design=parsed?.design;
 let compiled;
 try{
  compiled=compileDesign(design);
  if(!verifyCompiled(design,compiled))throw Error('B143_INTEGRITY');
 }catch{
  return {originalRawSha256:expectedSha,b143:'HOLD_UNCOMPILED_B143',
   sourceGeometryAvailable:false,measures:null,
   designSummary:{title:typeof design?.title==='string'?
    design.title.slice(0,100):null}};
 }
 const vox=compiled.primitives;
 const {width:w,height:h,depth:d}=design.bounds;
 const xyz=new Set(),footprint=new Set(),levels=new Set();
 let minY=h,maxY=-1;
 for(const [x,y,z] of vox){
  xyz.add((y*d+z)*w+x);
  footprint.add(z*w+x);
  levels.add(y);
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 // This is ONLY single-cell standing with two clear head cells.
 // It is NOT a navigable continuous 2-wide public route.
 let standing=0;
 for(const [x,y,z] of vox){
  const feet=y+1;
  if(feet+1>=h)continue;
  const k=(feet*d+z)*w+x;
  const k2=((feet+1)*d+z)*w+x;
  if(!xyz.has(k)&&!xyz.has(k2))standing++;
 }
 return {originalRawSha256:expectedSha,
  b143:'STRICT_B143_COMPILED_NOT_HUMAN_PASS',
  sourceGeometryAvailable:true,
  designSummary:{title:typeof design.title==='string'?
   design.title.slice(0,100):null},
  measures:{bounds:[w,h,d],occupiedConceptVoxelCells:vox.length,
   horizontalOccupiedColumns:footprint.size,
   occupiedYLayers:levels.size,
   occupiedHeightSpan:maxY>=minY?maxY-minY+1:0,
   singleCellTwoHighStandingCandidates:standing,
   walkingRouteOrHumanUsabilityCertified:false},
  // In-memory only. Do not put the potentially large Set in exported JSON.
  _xyz:xyz};
}
const change=(before,after)=>({
 before,after,delta:after-before,
 ratioToBefore:before>0?after/before:null
});
export function compareR63ArchitecturalContinuity({
 beforeRaw,beforeSha256,afterRaw,afterSha256
}={}){
 if(!c01||typeof beforeRaw!=='string'||typeof afterRaw!=='string')
  fail('TWO_IMMUTABLE_SOURCES_REQUIRED');
 const a=inspectOne(beforeRaw,beforeSha256);
 const b=inspectOne(afterRaw,afterSha256);
 const human=c01.criteria.map(k=>({id:k.id,requirement:k.description,
  assessment:'NOT_REVIEWED',
  mustInspectBeforeAndAfter:true,automaticComplianceCertified:false}));
 const valid=a.sourceGeometryAvailable&&b.sourceGeometryAvailable;
 const before=a.measures,after=b.measures;
 const metrics=valid?{
  occupiedConceptVoxelCells:change(before.occupiedConceptVoxelCells,
   after.occupiedConceptVoxelCells),
  horizontalOccupiedColumns:change(before.horizontalOccupiedColumns,
   after.horizontalOccupiedColumns),
  occupiedHeightSpan:change(before.occupiedHeightSpan,
   after.occupiedHeightSpan),
  singleCellTwoHighStandingCandidates:change(
   before.singleCellTwoHighStandingCandidates,
   after.singleCellTwoHighStandingCandidates)
 }:null;
 const risks=[];
 if(valid){
  for(const [metric,description] of [
   ['occupiedConceptVoxelCells','Large loss of design mass; confirm this is intended and not a cheap fix.'],
   ['horizontalOccupiedColumns','Large loss of footprint; verify public rooms, levels and circulation remain.'],
   ['occupiedHeightSpan','Large drop in vertical scale; verify upper functions and silhouette remain.'],
   ['singleCellTwoHighStandingCandidates','Large drop in supported clear-air candidates; assess usable interior space.']
  ]){
   const x=metrics[metric];
   if(x.before>0&&x.ratioToBefore<0.7)
    risks.push({kind:'POSSIBLE_DESIGN_LOSS_'+metric,
     before:x.before,after:x.after,
     humanDecisionRequired:true,automaticReject:false,
     rationale:description});
  }
 }
 const sameBounds=valid&&before.bounds.every((v,i)=>v===after.bounds[i]);
 let exactGridOverlap=null;
 if(sameBounds){
  let common=0;
  for(const k of a._xyz)if(b._xyz.has(k))common++;
  exactGridOverlap={
   meaningfulOnlyIfSameLocalArchitecturalFrameConfirmedByHuman:true,
   localFrameIndependentlyVerified:false,
   commonOccupiedCells:common,
   beforeOccupiedCells:a._xyz.size,afterOccupiedCells:b._xyz.size,
   beforeRetentionShare:a._xyz.size?common/a._xyz.size:null,
   afterOverlapShare:b._xyz.size?common/b._xyz.size:null
  };
  if(a._xyz.size>0&&common/a._xyz.size<0.45)
   risks.push({kind:'POSSIBLE_MAJOR_LOCAL_VOXEL_REPLACEMENT',
    commonOccupiedCells:common,
    originalOccupiedCells:a._xyz.size,
    automaticReject:false,humanDecisionRequired:true,
    rationale:'Local-grid overlap is small. If the same architectural frame was intended, inspect whether key spaces disappeared.'});
 }
 const status=!valid?'HOLD_ONE_OR_BOTH_B143_NOT_COMPILED':
  'GEOMETRIC_DRIFT_FACTS_READY_HUMAN_CONCEPT_REVIEW_REQUIRED';
 const strip=x=>{const {_xyz,...rest}=x;return rest};
 return {schema:SCHEMA,status,caseId:'c01',
  frozenJapaneseBrief:c01.prompt,frozenCriterionCount:human.length,
  before:strip(a),after:strip(b),
  numericComparisonValid:valid,comparisons:metrics,
  sameDeclaredBounds:sameBounds,localGridOverlap:exactGridOverlap,
  possibleRegressionRisks:risks,
  independentHumanRequirements:human,
  importantHumanQuestions:[
   'Are the architectural concept, exterior and inhabitable internal city/rooms still one coherent idea?',
   'Have essential functional destinations, circulation, atrium and upper landmark genuinely survived?',
   'Are reductions, structural changes and aesthetic changes deliberate improvements rather than optimizing for tests?',
   'Is the revised architecture recognizably responsive to the original Japanese request, and genuinely original?'
  ],
  noFixedStyleOrMinimumHeightMandate:true,
  smallerDoesNotAutomaticallyMeanWorse:true,
  largerDoesNotAutomaticallyMeanBetter:true,
  authorIdentityVerified:false,
  humanReviewPerformed:false,
  anyQualityPassCertified:false,
  compiledGeometryNotMinecraftConstruction:true,
  noModelCalls:true,noGeometryGeneratedOrRepaired:true,
  constructionApproved:false,worldWrites:0,safety:safe()};
}
export function writeR63ArchitecturalContinuity({
 beforeRaw,beforeSha256,afterRaw,afterSha256,destination
}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('ORDINARY_EXISTING_OUTPUT_REQUIRED');
 const reportFile=path.join(destination,'R63_CONTINUITY_RISKS.json');
 const htmlFile=path.join(destination,'R63_CONCEPT_PRESERVATION_REVIEW.html');
 if(fs.existsSync(reportFile)||fs.existsSync(htmlFile))
  fail('NEVER_OVERWRITE_CONTINUITY_REVIEW');
 const report=compareR63ArchitecturalContinuity({
  beforeRaw,beforeSha256,afterRaw,afterSha256});
 const rows=report.possibleRegressionRisks.map(v=>
  '<li><b>'+esc(v.kind)+'</b>: '+esc(v.rationale)+'</li>').join('');
 const criteria=report.independentHumanRequirements.map(v=>
  '<li>'+esc(v.requirement)+' — <b>未審査</b></li>').join('');
 const summary=report.numericComparisonValid?
  Object.entries(report.comparisons).map(([k,v])=>
   '<tr><th>'+esc(k)+'</th><td>'+v.before+'</td><td>'+
   v.after+'</td></tr>').join(''):
  '<tr><td colspan="3">原本または改訂案のB143コンパイル不合格。数値比較を行いません。</td></tr>';
 const html='<!doctype html><html lang="ja"><head><meta charset="UTF-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R63 建築構想の損失監視</title>'+
  '<style>body{font:15px/1.6 system-ui,sans-serif;max-width:980px;margin:30px auto;padding:0 20px;color:#203246}table{border-collapse:collapse;width:100%}th,td{padding:9px;border:1px solid #ccd6e0}li{margin:11px 0}.note{background:#fff4e4;padding:12px;border-left:4px solid #b78a47}</style></head><body>'+
  '<h1>R63 設計改善で元の建築構想が失われていないか</h1>'+
  '<p class="note">大きさや形状を変えることは自由です。縮小・形状差は自動失格ではなく、人間が意図を確認する材料です。B143合格も建築品質PASSではありません。</p>'+
  '<p>同じ凍結日本語課題：'+esc(report.frozenJapaneseBrief)+'</p>'+
  '<p>原本SHA：'+esc(report.before.originalRawSha256)+
  ' / 改訂SHA：'+esc(report.after.originalRawSha256)+'</p>'+
  '<h2>抽象ボクセルの比較</h2><table><tr><th>指標</th><th>元案</th><th>改訂案</th></tr>'+
  summary+'</table><p>同一座標系と建築の対応関係は人間が確認する必要があります。</p>'+
  '<h2>退行の可能性（自動棄却ではありません）</h2><ul>'+
  (rows||'<li>閾値を超える変化は未検出。品質合格ではありません。</li>')+
  '</ul><h2>元の独立要求</h2><ol>'+criteria+'</ol>'+
  '<p>レビュー未実施。実モデル要求0、Minecraft接続0、NOT_PREPARED、9 BLOCKED。</p></body></html>';
 fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(htmlFile,html,{flag:'wx'});
 return {status:report.status,relativeFile:path.basename(htmlFile),
  modelCalls:0,worldWrites:0};
}
