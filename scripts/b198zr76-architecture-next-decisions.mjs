/**
 * R76 — evidence-first architectural review priority board, NOT a generated
 * redesign, architectural score, model improvement, consent or build plan.
 * Recomputes the entire R62 evidence report from the exact original bytes.
 * Strongest prerequisite first, never ranks architecture by heuristic counts.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareR62FutureDesignGuidance,SCHEMA as R62_SCHEMA}
 from './b198zr62-evidence-backed-revision-guidance.mjs';
export const SCHEMA='minecraftaibuilder-b198zr76-architecture-next-decisions-v1';
const fail=s=>{throw Error('B198ZR76_'+s)};
const sha=s=>createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 modelCalls:0,worldContacts:0,worldReads:0,worldWrites:0});
const COMPILED='B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS';
const makePhase=(id,order,title,nextHumanDecision,protect,sourceTags,issues=[])=>({
 id,reviewOrder:order,title,nextHumanDecision,protect,
 sourceTags,observedIssueKinds:[...new Set(issues.map(x=>x.kind))],
 observedIssueRecords:issues.length,
 hasModelOnlyClaimInputs:issues.some(x=>x.basis?.includes('MODEL_')),
 userMustDecide:true,autoApply:false,visualQualityPass:false,
 projectSourceModified:false
});
export function synthesizeR76ReviewDecisions({raw,expectedRawSha256,
 b143Status,expectedGeometrySha256=null,r61Evidence=null,
 r64Evidence=null,r66Evidence=null,r67Evidence=null,r68Evidence=null,
 r69Evidence=null,r70Evidence=null,r71Evidence=null,r72Evidence=null,
 r73Evidence=null,r74Evidence=null,r62Evidence}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  sha(raw)!==expectedRawSha256)
  fail('ORIGINAL_RAW_SHA_REQUIRED');
 const verified=prepareR62FutureDesignGuidance({raw,expectedRawSha256,
  b143Status,expectedGeometrySha256,r61Evidence,
  r64Evidence,r66Evidence,r67Evidence,r68Evidence,r69Evidence,
  r70Evidence,r71Evidence,r72Evidence,r73Evidence,r74Evidence});
 if(!r62Evidence||r62Evidence.schema!==R62_SCHEMA||
  r62Evidence.originalRawSha256!==expectedRawSha256||
  r62Evidence.b143Status!==verified.b143Status||
  JSON.stringify(r62Evidence)!==JSON.stringify(verified))
  fail('R62_COMPLETE_REPORT_RECOMPUTE_MISMATCH');
 const compiled=b143Status===COMPILED;
 if(compiled!==Boolean(verified.finalConceptualGeometrySha256))
  fail('B143_COMPILATION_CONSISTENCY_REQUIRED');
 const issues=verified.evidenceIssues,source=issues.filter(x=>
  !compiled||x.basis==='R49_ORIGINAL_SOURCE_BOUNDS_OR_MATH_HINT'||
  x.kind==='STRICT_B143_HOLD');
 const mobility=compiled?issues.filter(x=>/R6[459]|R70|R71/.test(x.basis??'')||
  /R6[459]|R70|R71/.test(x.kind??'')): [];
 const mass=compiled?issues.filter(x=>
  /R66|R67|R68|R72|R73/.test(x.basis??'')||
  /R66|R67|R68|R72|R73/.test(x.kind??'')): [];
 const known=new Set([...source,...mobility,...mass]);
 const other=compiled?issues.filter(x=>!known.has(x)):[];
 const phases=[
  makePhase('01_SOURCE_TRUTH',0,'原本と最終概念ボクセルの整合性',
   compiled?
   'Check source-boundary and compiler consistency; treat B143 PASS as geometry compilation only.' :
   'The original response is not a valid B143 final voxel design. Prepare a genuinely complete, coherent source proposal on a separately authorized future generation; do not repair or relabel old evidence.',
   'Preserve the original request and meaningful design idea, not a fake voxel PASS.',
   ['R49','R58','B143'],source),
  makePhase('02_REAL_PUBLIC_USE',1,'公共施設としての移動と利用',
   compiled?'Review actual planned entrance, supported floors, staircase landings and upper destination use against real geometry. Require a future independent live-world test before confirming player reachability.':
   'BLOCKED UNTIL STRICT B143 FINAL VOXELS EXIST; no floor connectivity inference is available.',
   'Do not erase large public rooms or the central atrium just to satisfy a graph.',
   ['R61','R64','R65','R69','R70','R71'],mobility),
  makePhase('03_ARCHITECTURE_PRESERVATION',2,'巨大建築・内部空洞と外観の一体性',
   compiled?'Inspect source-derived R66–R73 sections, mass and open air with independent human aesthetic judgment; compare circulation concepts without ranking or auto-constructing.':
   'BLOCKED UNTIL STRICT B143 FINAL VOXELS EXIST; no final voxel mass/void claims are supported.',
   'Retain monumental scale, layered interior public spaces, roofs and a strong original concept.',
   ['R66','R67','R68','R72','R73'],mass),
  makePhase('04_PLAN_RECONCILIATION',3,'模型の自己申告と独立した形状証拠',
   compiled?'Inspect remaining declared-zone, plan, floor and functional claims against the compiled source. Do not treat source labels or model-set thresholds as independent quality evidence.':
   'BLOCKED; model-declared rooms and positions cannot replace compiled voxel geometry.',
   'Do not convert a model claim into independent human approval.',
   ['R43','R61','R62'],other)
 ];
 const human=verified.independentHumanCriteria.map(c=>({
  id:c.id,requirement:c.requirement,
  status:'NOT_REVIEWED',
  cannotBePassedByVoxelOrModelMetric:true,
  humanObservationRequired:true
 }));
 if(human.length!==4||human.some(c=>!c.id))
  fail('FROZEN_FOUR_HUMAN_QUALITY_CRITERIA_REQUIRED');
 const current=compiled?'02_REAL_PUBLIC_USE':'01_SOURCE_TRUTH';
 const status=compiled?
  'COMPILABLE_MODEL_SOURCE_WITH_UNVERIFIED_ARCHITECTURE':
  'HOLD_NO_FINAL_VOXEL_ARCHITECTURE';
 return {schema:SCHEMA,status,currentDecisionPackage:current,
  sourceReport:'R62_NEXT_DESIGN_EVIDENCE.json',
  originalRawSha256:expectedRawSha256,
  finalConceptualGeometrySha256:verified.finalConceptualGeometrySha256,
  sourceCompilerStatus:b143Status,
  issueRecords:issues.length,
  phaseEvidenceRecords:phases.map(x=>({id:x.id,records:x.observedIssueRecords})),
  reviewPackages:phases,
  frozenHumanQualityCriteria:human,
  classificationIsPlanningOrderNotQualitySeverity:true,
  geometricWarningsNotProofOfBadAesthetics:true,
  modelDeclaredRoomsNeverEqualVerifiedPublicFunction:true,
  noReviewerResponsesReceived:true,
  noAutomaticallyApprovedAlternatives:true,
  nextQwenRunNeedsFreshExplicitOneTimeConsent:true,
  modelQualityImprovementDemonstrated:false,
  actionInstructionsAreForHumansOnly:true,
  geometryChanges:[],independentHumanQualityApproval:false,
  modelCalls:0,worldWrites:0,safety:safe()};
}
export function writeR76ReviewPriorities({destination,...args}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('ORDINARY_EXISTING_OUTPUT_FOLDER_REQUIRED');
 const json=path.join(destination,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),
  html=path.join(destination,'R76_ARCHITECTURE_NEXT_DECISIONS.html');
 if(fs.existsSync(json)||fs.existsSync(html))
  fail('NO_OVERWRITE_OF_EXISTING_REVIEW');
 const report=synthesizeR76ReviewDecisions(args);
 const cards=report.reviewPackages.map(x=>'<section><h2>'+
  (x.reviewOrder+1)+'. '+esc(x.title)+'</h2>'+
  '<p>人間が次に判断すること：'+esc(x.nextHumanDecision)+'</p>'+
  '<p>守るもの：'+esc(x.protect)+'</p>'+
  '<p>参照する検査：'+esc(x.sourceTags.join(' / '))+
  ' ／証拠レコード '+x.observedIssueRecords+
  ' ／種類 '+esc(x.observedIssueKinds.join('・')||'該当警告なし')+
  '</p></section>').join('');
 const human=report.frozenHumanQualityCriteria.map(x=>
  '<li>'+esc(x.requirement)+' — 未審査</li>').join('');
 const document='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R76 建築の優先判断</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:980px;margin:28px auto;padding:0 20px;color:#293e50}section{border-top:1px solid #c9d3dd;padding:12px 0}.note{background:#fff0d6;padding:14px}a{color:#0877a3}</style></head><body>'+
  '<h1>R76 次の設計に必要な判断の順番</h1>'+
  '<p class="note">これは人工的な美術スコアや修復承認ではありません。B143不合格なら実際の最終ボクセルを認定せず、まず原本の成立だけを扱います。優先順は依存関係による作業順であり、警告件数は深刻度ではありません。実Minecraft歩行や人間の美術・機能品質は未確認です。</p>'+
  '<p>原本SHA '+esc(report.originalRawSha256)+
  ' ／検査 '+esc(report.sourceCompilerStatus)+
  ' ／次に注目：'+esc(report.currentDecisionPackage)+'</p>'+
  '<p><a href="R62_NEXT_DESIGN_REVIEW.html">R62：出典に紐づいた詳細</a> ／'+
  '<a href="R74_HUMAN_OPTION_REVIEW_SHEET.html">R74：人間審査票</a></p>'+
  cards+'<h2>元の要求に基づく独立審査4項目</h2><ul>'+human+
  '</ul><p>新しい推論には別の明示的な単発承認が必要です。'+
  'NOT_PREPARED / 施工9ゲートBLOCKED / モデル呼び出し0 / ワールド操作0。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,document,{flag:'wx'});
 return {relativeFile:path.basename(html),status:report.status,
  currentDecisionPackage:report.currentDecisionPackage,
  modelCalls:0,worldWrites:0};
}
