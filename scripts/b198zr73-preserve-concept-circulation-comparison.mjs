/**
 * R73 — NON-EXECUTING, HUMAN-DECIDED circulation concept comparison.
 * Every site and number is recomputed from immutable original B143 voxels
 * through R70 -> R71 -> R72. Concepts are QUESTIONS, not feasible routes,
 * build candidates, approval, cost estimates, geometry or automatic rankings.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assessR72MassVoidGapContext,SCHEMA as R72_SCHEMA}
 from './b198zr72-mass-void-gap-context.mjs';
export const SCHEMA='minecraftaibuilder-b198zr73-preserve-concept-circulation-comparison-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR73_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
const FAMILIES=Object.freeze([
 {
  id:'LANDING_LED_VERTICAL_CIRCULATION',
  name:'支持床・踊り場を軸に上下動線を再検討',
  intent:'既存の床と構造体を読み直し、実際に支持できる階段・ランプ・踊り場を別途設計する方向',
  needToVerify:'上下階の用途、必要な高さ、十分な踊り場、実Minecraftの段差と頭上クリアランス、構造支持',
  mustPreserve:'巨大吹き抜け・主要屋根・立体的な内部広場を埋めない',
  noAssumption:'既存床の近さや高低差は階段を施工できる証明にならない'
 },{
  id:'PERIPHERAL_OR_SIDE_WING_CIRCULATION',
  name:'外周・側翼から回り込む動線を検討',
  intent:'中央の空洞を横断せず、外周や既存の側翼に沿う可能性を人間が検討する方向',
  needToVerify:'現実の外周空間、壁・屋根の干渉、支持・接合、長い回り道の実用性、外部意匠',
  mustPreserve:'建築の外形シルエットと景観、中央の大空洞・主要構造を損なわない',
  noAssumption:'最短直方体の外に通れる道が存在するとは限らない'
 },{
  id:'INTENTIONAL_SEPARATION_OR_PROGRAM_REVIEW',
  name:'独立した施設・用途配置そのものを再検討',
  intent:'分断が意図した離れや空中の展示施設か、一般利用の連絡が必要かを確認する方向',
  needToVerify:'凍結した日本語要求とユーザー審査、各上層施設の使用目的、利用者の実際の移動・出入口',
  mustPreserve:'独創的な分棟構成、都市級の空間、多視点の美しさを数値合わせで消さない',
  noAssumption:'用途の見直しは要求された上層施設の省略を許すものではない'
 }
]);
function optionsFor(site){
 const flags={
  reachedAndUnreachedLevelsDiffer:
   site.reachedFootVoxel[1]!==site.unreachedFootVoxel[1],
  containsExistingSolidInReviewBox:site.boxSolidVoxelCount>0,
  hasAtLeastFourCellHighOpenColumns:
   site.localColumnsWithAtLeast4ContinuousAirCells>0,
  reviewBoxOnlyNotActualCorridor:true
 };
 return FAMILIES.map(f=>({
  conceptId:f.id,name:f.name,planningIntent:f.intent,
  humanVerifications:f.needToVerify,
  preservationConstraint:f.mustPreserve,
  cannotInfer:f.noAssumption,
  applicability:'NOT_DETERMINED_FROM_VOXELS',
  feasibility:'NOT_ASSESSED',preferred:false,
  geometrySubmitted:false,constructionApproved:false,
  supportingObservations:flags,
  humanQuestions:[
   'この施設は実際に利用者が行けなければならないか？',
   'この方針は建築全体の造形と内部空洞を維持できるか？',
   '施工を検討する前にどの実機・人間審査が必要か？'
  ]
 }));
}
export function compareR73CirculationConcepts({raw,expectedRawSha256,
 expectedGeometrySha256,r70Evidence,r71Evidence,r72Evidence}={}){
 if(typeof raw!=='string'||!raw||Buffer.byteLength(raw)>120000||
  hash(raw)!==expectedRawSha256||
  !/^[0-9a-f]{64}$/.test(expectedGeometrySha256??''))
  fail('IMMUTABLE_ORIGINAL_AND_FINAL_SHA_REQUIRED');
 const r72=assessR72MassVoidGapContext({raw,expectedRawSha256,
  expectedGeometrySha256,r70Evidence,r71Evidence});
 if(!r72Evidence||r72Evidence.schema!==R72_SCHEMA||
  r72Evidence.originalRawSha256!==expectedRawSha256||
  r72Evidence.geometrySha256!==expectedGeometrySha256||
  r72Evidence.r71RecomputedAndAuthenticated!==true||
  r72Evidence.status!==r72.status||
  JSON.stringify(r72Evidence.metrics)!==JSON.stringify(r72.metrics)||
  JSON.stringify(r72Evidence.possibleConcerns)!==
   JSON.stringify(r72.possibleConcerns))
  fail('RECALCULATED_R72_EVIDENCE_REQUIRED');
 const sites=r72.metrics.sites.slice(0,3).map(s=>({
  componentRank:s.componentRank,
  nearestReachedFootVoxel:s.reachedFootVoxel,
  nearestUnreachedFootVoxel:s.unreachedFootVoxel,
  optimisticCellSeparation:s.exactNearestPairDistance,
  boxMinInclusive:s.boxMinInclusive,boxMaxInclusive:s.boxMaxInclusive,
  existingSolidCellsInMinimumReviewBox:s.boxSolidVoxelCount,
  airCellsInMinimumReviewBox:s.boxAirVoxelCount,
  possibleTallVoidColumns:s.localColumnsWithAtLeast4ContinuousAirCells,
  originalArchitecturalIntent:'HUMAN_REVIEW_REQUIRED',
  families:optionsFor(s),
  selectedConceptId:null,humanApproval:'NOT_REVIEWED'
 }));
 const hold=r72.metrics.r71GapStatus.startsWith('HOLD_');
 if(hold&&sites.length!==0)
  fail('HOLD_MUST_NOT_PROPOSE_ANY_COMPARISON');
 const status=hold?'HOLD_NO_GROUNDED_COMPARISON':
  sites.length?'MULTIPLE_REVIEW_DIRECTIONS_NOT_RANKED':
  'NO_DISCONNECTED_PAIR_REQUIRES_CONCEPT_REVIEW';
 return {schema:SCHEMA,status,
  originalRawSha256:expectedRawSha256,
  geometrySha256:expectedGeometrySha256,
  r72RecomputedAndAuthenticated:true,
  r72ReviewStatus:r72.status,
  siteCount:sites.length,sites,
  comparisonDimensions:[
   'requested_public_access','structural_support_and_landings',
   'grand_atrium_and_air_void_preservation',
   'major_roof_and_exterior_silhouette_preservation',
   'minecraft_live_walkability','architectural_composition'
  ],
  costEstimatesInvented:false,routeLengthsInvented:false,
  feasibilityRanksInvented:false,originalUserArtisticIntentKnown:false,
  selectedOption:null,allHumanCriteria:'NOT_REVIEWED',
  missingHumanApprovalCannotBeOverriddenByGoodMetric:true,
  executedRedesign:false,proposedVoxelChanges:[],
  modelCalls:0,worldWrites:0,safety:safe()};
}
export function writeR73CirculationComparison({raw,expectedRawSha256,
 expectedGeometrySha256,r70Evidence,r71Evidence,r72Evidence,
 destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_OUTPUT_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R73_HUMAN_CIRCULATION_OPTIONS.json'),
  html=path.join(destination,'R73_PRESERVE_ARCHITECTURE_ALTERNATIVES.html');
 if(fs.existsSync(json)||fs.existsSync(html))
  fail('NEVER_OVERWRITE_EXISTING_REVIEW');
 const r=compareR73CirculationConcepts({raw,expectedRawSha256,
  expectedGeometrySha256,r70Evidence,r71Evidence,r72Evidence});
 const cards=r.sites.map(site=>
  '<section><h2>孤立領域 #'+site.componentRank+'</h2>'+
  '<p>到達側 '+esc(JSON.stringify(site.nearestReachedFootVoxel))+
  '、孤立側 '+esc(JSON.stringify(site.nearestUnreachedFootVoxel))+
  '。単純格子距離 '+site.optimisticCellSeparation+
  '、最小確認直方体内の固体 '+site.existingSolidCellsInMinimumReviewBox+
  '・空気 '+site.airCellsInMinimumReviewBox+
  '・縦4セル以上の連続空気列 '+site.possibleTallVoidColumns+'</p>'+
  '<p><a href="R72_ARCHITECTURE_PRESERVATION_SECTIONS.html">'+
  'R72の原本ボクセル断面を確認</a></p>'+
  '<div class="cards">'+site.families.map((f,i)=>
   '<article><h3>方向 '+(i+1)+'：'+esc(f.name)+'</h3>'+
   '<p>'+esc(f.planningIntent)+'</p>'+
   '<dl><dt>維持すべきもの</dt><dd>'+esc(f.preservationConstraint)+
   '</dd><dt>検証すべきもの</dt><dd>'+esc(f.humanVerifications)+
   '</dd><dt>推定できないこと</dt><dd>'+esc(f.cannotInfer)+
   '</dd></dl><p>適用可能性：未確認 ／ 推奨順位：付けない</p></article>'
  ).join('')+'</div><p>設計意図・実Minecraftの移動・公的用途の必要性を'+
  '人間が確認するまで、どれも採択しません。</p></section>'
 ).join('');
 const explanation=r.siteCount===0?
  '<p>保存原本から審査できる分断領域がありません。入口代理候補がHOLDの場合は、その地点を捏造しません。</p>':'';
 const markup='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R73 建築を残す動線方針の比較</title>'+
  '<style>body{font:15px/1.65 system-ui;max-width:1160px;margin:24px auto;padding:0 18px;color:#293d50}section{border-top:2px solid #d2dce6;margin:26px 0;padding-top:18px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(235px,1fr));gap:12px}article{border:1px solid #b9c9d8;border-radius:9px;padding:13px}h3{font-size:1rem}dt{font-weight:700}dd{margin:2px 0 12px}.warning{background:#fff1d9;padding:13px}a{color:#086ca6}</style></head><body>'+
  '<h1>R73 建築を壊さず動線を考える3つの視点</h1>'+
  '<p class="warning">これは建設ルート3案の自動生成ではなく、人間が3方向を比較するための設計会議資料です。Minecraft Educationで歩ける、設計可能、採用済み、という意味ではありません。原本の大空洞・屋根・都市空間の美術価値は未審査です。</p>'+
  '<p>原本SHA '+esc(r.originalRawSha256)+
  ' ／ 審査状態 '+r.status+' ／ 比較対象 '+r.siteCount+'領域</p>'+
  (cards||explanation)+
  '<p>原本・施工状態を変更していません。NOT_PREPARED、9ゲートBLOCKED、推論0、ワールド操作0。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,markup,{flag:'wx'});
 return {relativeFile:path.basename(html),status:r.status,
  siteCount:r.siteCount,modelCalls:0,worldWrites:0};
}
