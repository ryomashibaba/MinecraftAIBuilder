/**
 * R75 — accept a separately edited R74 review draft without rewriting the
 * frozen source, architectural evidence, quality gates or permissions.
 * This module validates provenance, allows ONLY review annotation fields,
 * and extracts unresolved human decisions. It cannot authenticate who wrote
 * the review or certify aesthetic/functional/Minecraft quality.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {makeR74HumanWorksheet,inspectR74HumanDraft,SCHEMA as R74_SCHEMA}
 from './b198zr74-human-option-review-worksheet.mjs';
export const SCHEMA='minecraftaibuilder-b198zr75-unresolved-human-review-handoff-v1';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR75_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,
 worldReads:0,worldWrites:0});
const bounded=(v,n)=>typeof v==='string'&&v.length<=n;
function ensureExactWritableFields(template,submitted){
 if(!submitted||submitted.schema!==R74_SCHEMA)
  fail('R74_SUBMISSION_REQUIRED');
 // Source and every machine-authored label/claim must match the
 // verified blank template. Permit ONLY preidentified annotation fields.
 const projected=structuredClone(template);
 if(!bounded(submitted.reviewerName,160)||
  !bounded(submitted.reviewedAtJst,100)||
  !bounded(submitted.overallReviewNotes,8000))
  fail('REVIEWER_TEXT_INVALID');
 projected.reviewerName=submitted.reviewerName;
 projected.reviewedAtJst=submitted.reviewedAtJst;
 projected.overallReviewNotes=submitted.overallReviewNotes;
 if(!Array.isArray(submitted.assessments)||
  submitted.assessments.length!==projected.assessments.length)
  fail('SITE_COUNT_CHANGED');
 for(let i=0;i<projected.assessments.length;i++){
  const a=projected.assessments[i],s=submitted.assessments[i];
  if(!s||!Array.isArray(s.directions)||
   s.directions.length!==a.directions.length||
   !bounded(s.selectionReason,4000)||
   (s.humanPreferredDirection!==null&&
    !a.directions.some(d=>d.conceptId===s.humanPreferredDirection)))
   fail('INVALID_SITE_REVIEW_FIELDS');
  a.selectionReason=s.selectionReason;
  a.humanPreferredDirection=s.humanPreferredDirection;
  for(let j=0;j<a.directions.length;j++){
   const d=a.directions[j],v=s.directions[j];
   if(!v||!Array.isArray(v.axes)||v.axes.length!==d.axes.length||
    !bounded(v.overallHumanNotes,4000)||
    ![null,true,false].includes(v.furtherDesignWorthStudying))
    fail('INVALID_DIRECTION_REVIEW_FIELDS');
   d.overallHumanNotes=v.overallHumanNotes;
   d.furtherDesignWorthStudying=v.furtherDesignWorthStudying;
   for(let k=0;k<d.axes.length;k++){
    const input=v.axes[k];
    if(!input||!bounded(input.observation,4000)||
     !bounded(input.evidenceReference,1000))
     fail('INVALID_CRITERION_NOTES');
    d.axes[k].status=input.status;
    d.axes[k].observation=input.observation;
    d.axes[k].evidenceReference=input.evidenceReference;
   }
  }
 }
 if(!isDeepStrictEqual(projected,submitted))
  fail('IMMUTABLE_TEMPLATE_FIELDS_CHANGED');
}
/** Returns *review requests*, not proposed routes or approval. */
export function reviewR75SubmittedDraft({
 raw,expectedRawSha256,expectedGeometrySha256,
 r70Evidence,r71Evidence,r72Evidence,r73Evidence,
 r74BlankEvidence,submittedDraft
}={}){
 if(typeof raw!=='string'||!raw||
  Buffer.byteLength(raw)>120000||hash(raw)!==expectedRawSha256||
  !/^[a-f0-9]{64}$/.test(expectedGeometrySha256??''))
  fail('IMMUTABLE_ORIGINAL_SOURCE_REQUIRED');
 const template=makeR74HumanWorksheet({
  raw,expectedRawSha256,expectedGeometrySha256,
  r70Evidence,r71Evidence,r72Evidence,r73Evidence});
 if(!r74BlankEvidence||
  JSON.stringify(r74BlankEvidence)!==JSON.stringify(template))
  fail('ORIGINAL_BLANK_WORKSHEET_PROVENANCE_MISMATCH');
 const inspected=inspectR74HumanDraft({template,submitted:submittedDraft});
 ensureExactWritableFields(template,submittedDraft);
 const open=[];
 const push=(kind,ctx,note)=>open.push({kind,...ctx,
  reviewRequired:true,canAuthorizeConstruction:false,
  note});
 let filled=0,unreviewed=0,evidenceNeeded=0,concerns=0,promising=0;
 for(const [i,site] of template.assessments.entries()){
  const answer=submittedDraft.assessments[i];
  const context={componentRank:site.componentRank};
  for(const [j,d] of site.directions.entries()){
   const res=answer.directions[j];
   for(const [k,axis] of d.axes.entries()){
    const item=res.axes[k],loc={...context,conceptId:d.conceptId,
     axisId:axis.axisId};
    if(item.status==='NOT_REVIEWED'){
     unreviewed++;
     push('HUMAN_CRITERION_NOT_REVIEWED',loc,'Human reviewer must examine actual evidence; no machine PASS is possible.');
    }else{
     filled++;
     if(item.status==='NEEDS_EVIDENCE'){
      evidenceNeeded++;
      push('SUPPORTING_EVIDENCE_REQUIRED',loc,
       item.observation||axis.axisId+' needs documented evidence.');
     }else if(item.status==='CONCERN'){
      concerns++;
      push('UNRESOLVED_HUMAN_CONCERN',loc,
       item.observation||'Human concern was selected without notes.');
     }else if(item.status==='PROMISING_FOR_FURTHER_STUDY'){
      promising++;
      if(!item.observation.trim()||!item.evidenceReference.trim()){
       evidenceNeeded++;
       push('PROMISING_CLAIM_NEEDS_SOURCE',loc,
        'A promising self-report still needs an observation and its evidence reference.');
      }
     }
    }
   }
  }
  if(answer.humanPreferredDirection&&!answer.selectionReason.trim())
   push('PREFERRED_DIRECTION_MISSING_RATIONALE',context,
    'Human wrote a further-study preference without its reasoning.');
 }
 // The four frozen human architectural requirements have NOT been marked
 // PASS by any R74/R75 fields, even if every subcriterion was marked promising.
 const status=inspected.status==='UNFILLED'?
  'HOLD_NO_HUMAN_CRITERIA_FILLED':
  inspected.status==='PARTIAL_SELF_ATTESTED'?
   'PARTIAL_HUMAN_DRAFT_OPEN_REVIEW':
   'COMPLETE_SELF_ATTESTED_NOT_QUALITY_CERTIFIED';
 return {schema:SCHEMA,status,
  originalRawSha256:expectedRawSha256,
  geometrySha256:expectedGeometrySha256,
  submittedDraftSha256:hash(JSON.stringify(submittedDraft)),
  originalBlankEvidenceRecomputed:true,
  templateUnmodified:true,
  submittedFieldsRestrictedToHumanAnnotations:true,
  humanReviewStatus:inspected.status,
  siteCount:template.assessments.length,
  totalAxes:inspected.totalHumanCriteria,
  humanMarkedAxes:filled,unreviewedAxes:unreviewed,
  needsEvidenceAxes:evidenceNeeded,concernAxes:concerns,
  furtherStudyAxes:promising,
  unresolvedReviewItems:open,
  preferredDirectionSelectionIsNotApproval:true,
  reviewerIdentityAuthenticated:false,
  independentC01HumanCriteria:'NOT_REVIEWED',
  actualMinecraftWalkingVerified:false,
  architecturalQualityApproved:false,
  modelInferenceApproved:false,
  constructionApproved:false,
  generatedGeometryChanges:[],
  modelCalls:0,worldWrites:0,safety:safe()};
}
export function writeR75SubmittedDraftHandoff({
 destination,...args
}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_ORDINARY_OUTPUT_DIRECTORY_REQUIRED');
 const json=path.join(destination,'R75_HUMAN_REVIEW_OUTSTANDING.json');
 const html=path.join(destination,'R75_HUMAN_REVIEW_OUTSTANDING.html');
 if(fs.existsSync(json)||fs.existsSync(html))
  fail('NO_REVIEW_OVERWRITE');
 const report=reviewR75SubmittedDraft(args);
 const list=report.unresolvedReviewItems.map(x=>
  '<li><b>'+esc(x.kind)+'</b> 領域'+x.componentRank+
  (x.conceptId?' '+esc(x.conceptId):'')+
  (x.axisId?' '+esc(x.axisId):'')+
  ': '+esc(x.note)+'</li>').join('');
 const doc='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R75 人間審査の未解決事項</title>'+
  '<style>body{font:15px/1.6 system-ui;max-width:970px;margin:25px auto;padding:0 18px;color:#293a4b}.warn{background:#fff0da;padding:13px}li{margin:12px 0}</style></head><body>'+
  '<h1>R75 既存原本に紐づく、人間審査で残った論点</h1>'+
  '<p class="warn">これは人間が自己申告した審査票の未解決事項です。審査者の本人確認・独立した建築品質の合格・実Minecraft動線の検証・設計改修や施工承認は一切行っていません。入力したコメントの優劣で自動的に案を選びません。</p>'+
  '<p>原本SHA '+esc(report.originalRawSha256)+
  ' ／状態 '+report.status+
  ' ／記入済み '+report.humanMarkedAxes+
  ' ／未審査 '+report.unreviewedAxes+
  ' ／未解決論点 '+report.unresolvedReviewItems.length+'</p>'+
  '<h2>未解決事項</h2><ul>'+
  (list||'<li>未解決論点を記述する入力がありません。品質合格を意味しません。</li>')+
  '</ul><p>NOT_PREPARED、9ゲートBLOCKED、推論0、Minecraft世界操作0。</p></body></html>';
 fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(html,doc,{flag:'wx'});
 return {relativeFile:path.basename(html),status:report.status,
  outstanding:report.unresolvedReviewItems.length,
  modelCalls:0,worldWrites:0};
}
/** Created by R60 immediately; never impersonates a submitted human review. */
export function writeR75IntakeInstructions({destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())
  fail('EXISTING_INTAKE_DIRECTORY_REQUIRED');
 const target=path.join(destination,'R75_HUMAN_DRAFT_INTAKE_GUIDE.html');
 if(fs.existsSync(target))fail('INTAKE_GUIDE_ALREADY_EXISTS');
 const doc='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R75 審査票の安全な提出手順</title></head><body>'+
  '<h1>R75 記入済みの人間審査票を引き継ぐ方法</h1>'+
  '<p>R74_HUMAN_OPTION_REVIEW_SHEET.htmlを見て人間が審査する。'+
  'R74_HUMAN_COMPARISON_BLANK.jsonは原本として保存し、コピーにだけ記入する。'+
  '各方向の六つの評価軸のstatus/observation/evidenceReference、必要なら'+
  'humanPreferredDirection/selectionReason と reviewerName を書く。'+
  '評価欄やコメント以外の識別情報・安全ゲート・合格欄は編集しない。</p>'+
  '<p>別途書き込んだコピーをR75審査処理に提出する。その時点で原本ZIPと'+
  'R70–R74の一致した証拠を再照合して未解決事項のみを抽出する。'+
  '元の未記入JSONを上書きしない。入力だけで実機試験や施工承認にはならない。</p>'+
  '<p>R74審査未実施のため、R75の人間レビュー結果は未作成。'+
  'モデル推論0、Minecraft操作0、NOT_PREPARED、9ゲートBLOCKED。</p>'+
  '</body></html>';
 fs.writeFileSync(target,doc,{flag:'wx'});
 return {relativeFile:path.basename(target),
  status:'GUIDE_ONLY_NO_HUMAN_DRAFT_SUBMITTED',
  modelCalls:0,worldWrites:0};
}
