/**
 * R74 — a human-owned, source-anchored architectural alternative worksheet.
 * Not a voting model, benchmark pass, authenticated human signature,
 * route generation, or Minecraft build approval.
 *
 * No browser scripts: print and annotate the HTML; optionally fill the
 * separate JSON template offline. Both remain outside the review evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {compareR73CirculationConcepts,SCHEMA as R73_SCHEMA}
 from './b198zr73-preserve-concept-circulation-comparison.mjs';

export const SCHEMA='minecraftaibuilder-b198zr74-human-option-review-worksheet-v1';
const fail=s=>{throw Error('B198ZR74_'+s)};
const sha=b=>createHash('sha256').update(b).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});

export const AXES=Object.freeze([
 {id:'PUBLIC_FUNCTION',label:'要求された一般利用・目的施設の機能',
  question:'入口から要求された部屋・上層施設まで、人間が用途に適した動線を確認できたか？'},
 {id:'LANDING_AND_SUPPORT',label:'支持床・階段・踊り場',
  question:'支持床・頭上余裕・段差・階段や踊り場の実形状が成立するか？'},
 {id:'ATRIUM_AND_OPEN_SPACE',label:'大空洞・中庭・内部都市空間',
  question:'中央大空洞を埋めず、元のスケールと空間体験を保てるか？'},
 {id:'ROOF_AND_SILHOUETTE',label:'主要屋根・外観シルエット',
  question:'屋根・側翼・建築的質量のリズムと遠景の印象を維持できるか？'},
 {id:'REAL_MINECRAFT_WALKING',label:'実機のMinecraft移動可能性',
  question:'Minecraft Education実機での移動・扉・階段・衝突を確認したか？'},
 {id:'ARTISTIC_UNITY',label:'未来的造形・内外の一体感',
  question:'利用可能な公共建築と際立った未来的表現が同じ着想で成立するか？'}
]);
const ALLOWED=Object.freeze([
 'NOT_REVIEWED','NEEDS_EVIDENCE','CONCERN','PROMISING_FOR_FURTHER_STUDY'
]);
function checkR73(raw,originalSha,geometrySha,options,r73){
 if(typeof raw!=='string'||!raw||sha(raw)!==originalSha||
  !/^[0-9a-f]{64}$/.test(geometrySha??''))
  fail('IMMUTABLE_SOURCE_REQUIRED');
 const r=compareR73CirculationConcepts({raw,
  expectedRawSha256:originalSha,
  expectedGeometrySha256:geometrySha,...options});
 if(!r73||r73.schema!==R73_SCHEMA||
  r73.originalRawSha256!==originalSha||
  r73.geometrySha256!==geometrySha||
  r73.status!==r.status||
  r73.r72RecomputedAndAuthenticated!==true||
  JSON.stringify(r73.sites)!==JSON.stringify(r.sites)||
  JSON.stringify(r73.comparisonDimensions)!==
   JSON.stringify(r.comparisonDimensions))
  fail('AUTHENTICATED_R73_COMPARISON_REQUIRED');
 return r;
}
export function makeR74HumanWorksheet({
 raw,expectedRawSha256,expectedGeometrySha256,
 r70Evidence,r71Evidence,r72Evidence,r73Evidence
}={}){
 const r73=checkR73(raw,expectedRawSha256,expectedGeometrySha256,
  {r70Evidence,r71Evidence,r72Evidence},r73Evidence);
 const assessments=r73.sites.map(site=>({
  componentRank:site.componentRank,
  witnesses:{reached:site.nearestReachedFootVoxel,
   unreached:site.nearestUnreachedFootVoxel},
  directions:site.families.map(f=>({
   conceptId:f.conceptId,conceptName:f.name,
   axes:AXES.map(axis=>({axisId:axis.id,status:'NOT_REVIEWED',
    observation:'',evidenceReference:''})),
   overallHumanNotes:'',furtherDesignWorthStudying:null,
   independentHumanReview:'NOT_REVIEWED'
  })),
  humanPreferredDirection:null,selectionReason:'',
  siteStatus:'NOT_REVIEWED'
 }));
 return {schema:SCHEMA,
  status:r73.siteCount?'AWAITING_INDEPENDENT_HUMAN_COMPARISON':
   'NO_GROUNDED_SITES_TO_REVIEW',
  originalRawSha256:expectedRawSha256,
  finalConceptualGeometrySha256:expectedGeometrySha256,
  r73ComparisonStatus:r73.status,
  r73EvidenceRecomputed:true,
  formStatus:'UNFILLED_HUMAN_WORKSHEET',
  axes:AXES,assessmentChoices:ALLOWED,
  assessments,
  reviewerName:'',reviewedAtJst:'',overallReviewNotes:'',
  qualityCertification:'NOT_PERFORMED',
  reviewerIdentityAuthenticated:false,
  selectionApproved:false,
  constructionApproved:false,
  generatedDesignChanges:[],
  c01OriginalHumanRequirementsUnreviewed:true,
  independentHumanAssessment:'NOT_REVIEWED',
  sourceDataCannotProveArtisticQuality:true,
  modelCalls:0,worldWrites:0,safety:safe()};
}
/**
 * Parse-check an edited JSON *as a self-attested draft*, nothing more.
 * A fully filled draft is never equated with independent human PASS,
 * authenticated approval, validated structure or construction readiness.
 */
export function inspectR74HumanDraft({template,submitted}={}){
 if(!template||template.schema!==SCHEMA||
  template.formStatus!=='UNFILLED_HUMAN_WORKSHEET'||
  !submitted||submitted.schema!==SCHEMA||
  submitted.originalRawSha256!==template.originalRawSha256||
  submitted.finalConceptualGeometrySha256!==
   template.finalConceptualGeometrySha256)
  fail('WORKSHEET_SOURCE_BINDING_REQUIRED');
 if(!Array.isArray(submitted.assessments)||
  submitted.assessments.length!==template.assessments.length)
  fail('SITE_COUNT_OR_ORDER_CHANGED');
 let marked=0,expected=0;
 for(const [i,site] of template.assessments.entries()){
  const entered=submitted.assessments[i];
  if(entered.componentRank!==site.componentRank||
   JSON.stringify(entered.witnesses)!==
    JSON.stringify(site.witnesses)||
   !Array.isArray(entered.directions)||
   entered.directions.length!==site.directions.length)
   fail('SITE_IDENTITY_CHANGED');
  for(const [j,direction] of site.directions.entries()){
   const u=entered.directions[j];
   if(u.conceptId!==direction.conceptId||
    !Array.isArray(u.axes)||u.axes.length!==AXES.length)
    fail('DIRECTION_IDENTITY_CHANGED');
   for(const [k,criterion] of AXES.entries()){
    const item=u.axes[k];
    if(item.axisId!==criterion.id||!ALLOWED.includes(item.status)||
     typeof item.observation!=='string'||
     typeof item.evidenceReference!=='string'||
     item.observation.length>4000||item.evidenceReference.length>1000)
     fail('CRITERION_RESPONSE_INVALID');
    expected++;
    if(item.status!=='NOT_REVIEWED')marked++;
   }
  }
  if(entered.humanPreferredDirection!==null&&
   !site.directions.some(f=>
    f.conceptId===entered.humanPreferredDirection))
   fail('UNKNOWN_PREFERRED_DIRECTION');
 }
 return {schema:'minecraftaibuilder-b198zr74-draft-inspection-v1',
  status:marked===0?'UNFILLED':marked<expected?'PARTIAL_SELF_ATTESTED':
   'COMPLETE_SELF_ATTESTED_NOT_CERTIFIED',
  checkedHumanCriteria:marked,totalHumanCriteria:expected,
  claimsOfCertificationAccepted:false,
  humanIdentityVerified:false,qualityPass:false,
  liveMinecraftVerification:false,
  approvedForModelInference:false,
  constructionApproved:false,geometryModified:false,
  safety:safe()};
}
export function writeR74HumanWorksheet({
 raw,expectedRawSha256,expectedGeometrySha256,
 r70Evidence,r71Evidence,r72Evidence,r73Evidence,destination
}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('NORMAL_EXISTING_OUTPUT_FOLDER_REQUIRED');
 const json=path.join(destination,'R74_HUMAN_COMPARISON_BLANK.json'),
  html=path.join(destination,'R74_HUMAN_OPTION_REVIEW_SHEET.html');
 if(fs.existsSync(json)||fs.existsSync(html))
  fail('PREVIOUS_REVIEW_NO_OVERWRITE');
 const sheet=makeR74HumanWorksheet({raw,expectedRawSha256,
  expectedGeometrySha256,r70Evidence,r71Evidence,r72Evidence,r73Evidence});
 const cards=sheet.assessments.map(site=>
  '<section><h2>孤立領域 #'+site.componentRank+
  ' ／ 到達側 '+esc(JSON.stringify(site.witnesses.reached))+
  ' ／ 孤立側 '+esc(JSON.stringify(site.witnesses.unreached))+'</h2>'+
  '<p><a href="R72_ARCHITECTURE_PRESERVATION_SECTIONS.html">R72：原本ボクセル断面</a> ／ '+
  '<a href="R73_PRESERVE_ARCHITECTURE_ALTERNATIVES.html">R73：比較方向の説明</a></p>'+
  site.directions.map(dir=>
   '<article><h3>'+esc(dir.conceptName)+'</h3><table><thead><tr>'+
   '<th>独立審査軸</th><th>判定</th><th>実際に確認した根拠と未解決事項</th></tr></thead><tbody>'+
   AXES.map(ax=>'<tr><td>'+esc(ax.label)+
    '<small>'+esc(ax.question)+'</small></td>'+
    '<td>□ 未審査　□ 追加証拠要　□ 懸念あり　□ 追加検討に値する</td>'+
    '<td><div class="lines"></div></td></tr>').join('')+
   '</tbody></table></article>').join('')+
  '<p>この領域で追加検討する方向／理由：'+
  '________________________________________</p></section>'
 ).join('');
 const doc='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R74 人間の建築比較審査票</title>'+
  '<style>body{font:14px/1.6 system-ui;max-width:1170px;margin:25px auto;padding:0 18px;color:#243648}section{margin:28px 0}article{margin:20px 0;border-top:2px solid #cad5de;padding-top:8px}table{border-collapse:collapse;width:100%}td,th{padding:9px;border:1px solid #becdd8;vertical-align:top}small{display:block;color:#5a6772}.lines{height:36px;border-bottom:1px dotted #889ba9}.warn{background:#fff2d8;padding:13px}a{color:#076fa4}@media print{body{padding:0;font-size:11px}article{break-inside:avoid}section{break-before:page}}</style></head><body>'+
  '<h1>R74 動線3方向 × 6つの独立審査軸</h1>'+
  '<p class="warn">これは印刷・手書き用の審査票です。チェックしても自動保存されません。別のJSONテンプレートも初期状態は全項目「未審査」です。実Minecraftの移動確認、設計の品質承認、施工許可は別に必要です。表の評価が良好でも自動的にPASSや施工承認にはなりません。</p>'+
  '<p>原本SHA：'+esc(sheet.originalRawSha256)+
  ' ／ 対象：'+sheet.assessments.length+'領域。審査者：________　確認日時：________</p>'+
  (cards||'<p>比較対象となる分断領域は確定していません。入口の根拠がHOLDの場合、評価対象を捏造しません。</p>')+
  '<h2>総括（未記入）</h2><p>元の日本語要求・機能・造形・大空洞・実機を確認し、未解決事項を記録：</p>'+
  '<div class="lines"></div><div class="lines"></div>'+
  '<p>NOT_PREPARED ／ 9 BLOCKED ／ 推論0 ／ Minecraft世界操作0。人間の判断は未実施。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(sheet,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,doc,{flag:'wx'});
 return {relativeFile:path.basename(html),status:sheet.status,
  sites:sheet.assessments.length,modelCalls:0,worldWrites:0};
}
