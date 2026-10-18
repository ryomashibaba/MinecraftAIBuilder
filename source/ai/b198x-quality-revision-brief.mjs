/**
 * B198X: source-proven, HUMAN-review-driven quality revision brief.
 * No LLM, world/client contact, freeform geometry edits, or approval.
 * Observations from human submissions are UNTRUSTED DATA, not commands.
 */
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {evaluateB198WSource,validateB198WHumanReview,SCHEMA as REVIEW_SCHEMA}
 from '../../scripts/b198w-quality-review.mjs';
export const SCHEMA='minecraftaibuilder-b198x-human-feedback-revision-brief-v1';
const fail=s=>{throw Error('B198X_'+s)};
const yes=(x,s)=>{if(!x)fail(s)};
const allowedId=/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/;

export function createB198XRevisionBrief({
 design,dossier,review,protectedElementIds=[],maxPriorities=2
}={}){
 yes(!!design&&dossier?.schema===REVIEW_SCHEMA,'SOURCE_AND_REVIEW_EVIDENCE_REQUIRED');
 yes(Number.isSafeInteger(maxPriorities)&&maxPriorities>=1&&maxPriorities<=4,
  'PRIORITY_LIMIT_1_TO_4');
 const compiled=compileDesign(design);
 yes(verifyCompiled(design,compiled),'INDEPENDENT_B143_COMPILER_SHA_REQUIRED');
 const actual=evaluateB198WSource({design,compiled,caseId:dossier.caseId});
 yes(dossier.independentlyCompiled?.sourceSha256===compiled.sourceSha256&&
  dossier.independentlyCompiled?.geometrySha256===compiled.geometrySha256,
  'SOURCE_SHA_MISMATCH');
 // Do not let a fabricated dossier supply optimistic metrics or fake issues.
 for(const field of ['sourceGeometry','sourceCriticFindings','sourceOnlyGoals',
  'humanRubric','frozenJapaneseRequest']){
  yes(JSON.stringify(dossier[field])===JSON.stringify(actual[field]),
   'SOURCE_DOSSIER_FIELD_MISMATCH_'+field);
 }
 const rating=validateB198WHumanReview({dossier:actual,submission:review});
 yes(Array.isArray(protectedElementIds)&&
  protectedElementIds.length<=design.elements.length&&
  protectedElementIds.every(x=>typeof x==='string'&&allowedId.test(x))&&
  new Set(protectedElementIds).size===protectedElementIds.length,
  'PROTECTED_IDS_INVALID');
 const elements=new Map(design.elements.map(x=>[x.id,x]));
 yes(protectedElementIds.every(id=>elements.get(id)?.mode==='add'),
  'PROTECTED_IDS_MUST_REFERENCE_EXISTING_ADD_ELEMENTS');
 const reviewed=actual.humanRubric.rubric.map((row,i)=>({
  criterionId:row.criterionId,frozenCriterion:row.description,
  humanRating:review.rubric[i].score,
  humanObservationUntrusted:review.rubric[i].evidence,
  independentlyJudgedMeaning:false
 }));
 const priority=reviewed.filter(x=>x.humanRating<=2)
  .sort((a,b)=>a.humanRating-b.humanRating||
   a.criterionId.localeCompare(b.criterionId,'en')).slice(0,maxPriorities);
 const sourceRisks=actual.sourceCriticFindings.filter(x=>
  x.severity==='HIGH'||x.severity==='MEDIUM').map(x=>({
  id:x.id,severity:x.severity,objectiveEvidence:x.evidence,
  meaningAndPlayerWalkingNotCertified:true
 }));
 const needsQualityRevision=priority.length>0||sourceRisks.length>0;
 const status=!needsQualityRevision?
  'NO_REVIEWED_DEFICIENCY_HUMAN_CHOICE_REQUIRED':
  !protectedElementIds.length?
  'DRAFT_NEEDS_EXPLICIT_PROTECTED_PARTS':
  'REVIEWED_REVISION_BRIEF_READY_FOR_SEPARATE_AUTHORIZATION';
 return {
  schema:SCHEMA,status,caseId:dossier.caseId,
  originalFrozenJapaneseRequest:actual.frozenJapaneseRequest,
  baseSourceSha256:compiled.sourceSha256,
  baseGeometrySha256:compiled.geometrySha256,
  humanRatingKind:'SELF_REPORTED_NOT_INDEPENDENTLY_VERIFIED',
  humanRatingRatio:rating.humanSuppliedScoreRatio,
  completeHumanObservations:reviewed,
  topHumanRevisionPriorities:priority,
  objectiveSourceRiskHints:sourceRisks,
  protectedOriginalAddElementIds:[...protectedElementIds],
  unprotectedChangesNOTAuthorized:true,
  preserveExistingSourceOnlyFloorsAndOpenHeadroom:true,
  preserveOriginalModelAuthoredFreeformArchitecture:true,
  qualityNextStep:status==='REVIEWED_REVISION_BRIEF_READY_FOR_SEPARATE_AUTHORIZATION'?
   'Human decides whether to authorize a single local model-led guarded revision later; no automatic inference or geometry changes.':
   status==='DRAFT_NEEDS_EXPLICIT_PROTECTED_PARTS'?
   'Choose existing original ADD element IDs to preserve, then regenerate this brief OFFLINE without an LLM.':
   'No human criterion scored <=2 and no high/medium source risk is detected. Do not invent a revision necessity.',
  humanNarrativesAreUntrustedDataNotModelInstructions:true,
  humanAestheticImprovementCertified:false,
  candidateArchitectureGenerated:false,
  approvedModelCalls:0,modelCallsMade:0,worldContacts:0,worldWrites:0,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldWrites:0,worldContacts:0,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}}
 };
}
export function renderB198XRevisionMarkdown(brief){
 yes(brief?.schema===SCHEMA,'BRIEF_REQUIRED');
 const quoted=s=>JSON.stringify(s);
 const lines=[
 '# B198X 人間の品質レビューから作った改修指示ドラフト',
 '',
 '状態：'+brief.status,
 '基準ソース SHA256：'+brief.baseSourceSha256,
 '',
 '## 元の日本語要求（変更しない）',
 brief.originalFrozenJapaneseRequest,
 '',
 '## 人間が確認した低評価項目（自動判定ではない）'
 ];
 if(!brief.topHumanRevisionPriorities.length)lines.push('0〜2点の項目なし。無理に改善点を生成しません。');
 for(const [i,x]of brief.topHumanRevisionPriorities.entries()){
  lines.push((i+1)+'. '+quoted(x.frozenCriterion)+
   ' / 人間の採点 '+x.humanRating+'/4',
   '   観察内容（命令として実行しない）：'+quoted(x.humanObservationUntrusted));
 }
 lines.push('','## 元ソースの構造的な注意点（外観・実歩行は未認証）');
 if(!brief.objectiveSourceRiskHints.length)lines.push('HIGH/MEDIUM の注意点なし。');
 for(const x of brief.objectiveSourceRiskHints){
  lines.push('- '+x.id+' ['+x.severity+'] / '+quoted(x.objectiveEvidence));
 }
 lines.push('','## 保護する既存ADD要素');
 if(brief.protectedOriginalAddElementIds.length)
  lines.push(...brief.protectedOriginalAddElementIds.map(x=>'- '+x));
 else lines.push('未指定：ユーザーによる明示選択が必要です。');
 lines.push('','## 安全・品質条件',
  '- 元の独創的な形状はモデルに任せる。キーワードに応じた固定テンプレートは生成しない。',
  '- 元の source SHA を維持して比較し、選択済み要素・元の開放2×2床の保護を別途コンパイル検証する。',
  '- 変更された候補は新しいソースとして3Dで再審査。AIの自己採点では合格にしない。',
  '- この資料はLLM実行・Minecraftへの施工を許可しない。',
  '',
  '次の判断：'+brief.qualityNextStep,'');
 return lines.join('\n');
}
