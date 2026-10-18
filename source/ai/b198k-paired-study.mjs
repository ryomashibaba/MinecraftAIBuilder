/**
 * B198K: same frozen Japanese requests, TWO actual model workflows.
 *
 * DIRECT: existing B198H source-only benchmark.
 * DIRECTED: original B198I+B198J plan -> compiled B143 -> source feedback,
 *           then strict guarded dependent source revisions.
 *
 * Models are entirely caller-supplied. Default test doubles are NEVER
 * represented as live model runs, and neither source score implies aesthetics.
 * Only original source and reviewed offline 3D assets; never Minecraft writes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CREATION_CASES,REVISION_CASES,verifyBenchmark,SUITE_VERSION}
 from './b198b-benchmark-cases.mjs';
import {generateModelDirectedArchitecture}
 from './b198i-design-director.mjs';
import {proposeArchitecture} from './b198-natural-language-design.mjs';
import {inspectInheritedSource} from './b198g-autonomous-quality.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {inspectSourceGeometry,evaluateSourceGoals,emptyHumanRubric}
 from './b198b-architecture-quality.mjs';
import {critiqueArchitecture} from './b198c-spatial-critic.mjs';
import {runB198HBenchmark} from './b198h-model-benchmark.mjs';
import {compileB143Gallery,renderB143Html,verifyB143Payload}
 from '../../scripts/build-b143-site.mjs';

export const SCHEMA='minecraftaibuilder-b198k-paired-source-study-v1';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=s=>{throw Error('B198K_'+s)};
const check=(x,s)=>{if(!x)fail(s)};
const safety=()=>({readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
 constructionApproved:false,executionAllowed:false,
 worldCoordinates:null,worldContacts:0,worldWrites:0,BuildPlan:{operations:[]}});
const short=x=>String(x?.message??x).slice(0,350);
const root=path.resolve(import.meta.dirname??'.','../..');
const clean=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const write=(dest,data)=>fs.writeFileSync(dest,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const chooseBlindA=id=>Number.parseInt(createHash('sha256').update('b198k:'+id)
 .digest('hex').slice(0,2),16)%2===0?'direct':'directed';

function saveSource(dir,design,compiled,info,template){
 check(verifyCompiled(design,compiled),'SOURCE_NOT_VERIFIED_BEFORE_SAVE');
 fs.mkdirSync(dir);
 write(path.join(dir,'source-design.json'),design);
 write(path.join(dir,'source-evidence.json'),info);
 const payload=compileB143Gallery([design]);
 check(verifyB143Payload(payload),'UNSAFE_THREE_D_PAYLOAD');
 check(payload.sourceHashes[0]===compiled.sourceSha256,'SCENE_SOURCE_SHA_NOT_MATCHED');
 const base=renderB143Html(payload,template),needle=base.match(/<body\b[^>]*>/i)?.[0];
 check(needle,'HTML_VIEWER_MISSING_BODY');
 const html=base.replace(needle,needle+
  '<div style="padding:12px;background:#193a52;color:white;font-weight:bold">'+
  'B198K REAL B143 SOURCE VIEW — '+clean(info.caseId)+
  ' — candidate only; aesthetics and Japanese intent UNREVIEWED; world NOT_PREPARED</div>');
 fs.writeFileSync(path.join(dir,'index.html'),html,{flag:'wx'});
}
function sourceMetrics(spec,result){
 const {design,compiled}=result;
 const graph=critiqueArchitecture({design,compiled});
 const geometric=inspectSourceGeometry({design,compiled});
 const sourceGoals=spec.kind==='creation'?evaluateSourceGoals(spec,geometric):null;
 return {sourceSha256:compiled.sourceSha256,
  geometrySha256:compiled.geometrySha256,
  occupiedVoxels:compiled.primitives.length,
  authoredElements:design.elements.length,
  sourceGoalStatus:sourceGoals?.status??'NOT_APPLICABLE_TO_REVISION',
  sourceGoals,sourceTopologyHighRisks:graph.highRiskCount,
  verifiedTwoWideSourceSquares:graph.objectiveAudit.verifiedTwoWideStandingSquares,
  largestConnectedSameLevelSourceSquares:
   graph.objectiveAudit.largestSameLevelConnectedSquareCount,
  sourceGoalDoesNotProveHumanQuality:true};
}
function recordFor(spec,arm,kind='NOT_RUN'){
 return {caseId:spec.id,kind:spec.kind,parentCaseId:spec.baseCaseId??null,
  arm,promptSha256:sha(spec.prompt),
  status:kind,sourceMetrics:null,architectureProgramSha256:null,
  qualityAssessment:'UNREVIEWED',
  humanSemanticCriteria:spec.criteria.map(x=>({criterionId:x.id,
   description:x.description,score:null,evidence:null})),
  providerRequests:0,modelOutputAuthenticated:false,
  actualMinecraftWalkingCertified:false,worldWrites:0};
}
/** Comparison cases use true frozen B198B prompts and no fake human grade. */
export async function runB198KPairedStudy({
 generator,planner,outDir,modelId,providerOrigin='INJECTED_TEST_DOUBLE',
 creationCount=12,includeRevisions=true,directedAttempts=3,
 directedTopologyRounds=1,directAttempts=1
}={}){
 check(verifyBenchmark(),'FROZEN_12_PLUS_4_TAMPERED');
 check(typeof generator==='function'&&typeof planner==='function',
  'TWO_EXPLICIT_MODEL_FUNCTIONS_REQUIRED');
 check(['INJECTED_TEST_DOUBLE','EXPLICIT_LOCAL_LOOPBACK'].includes(providerOrigin),
  'INVALID_PROVIDER_ORIGIN');
 check(typeof modelId==='string'&&modelId.length>=2&&modelId.length<=140,
  'EXPLICIT_MODEL_ID_REQUIRED');
 check(typeof outDir==='string'&&outDir.length>0,'OUTPUT_REQUIRED');
 check(Number.isInteger(creationCount)&&creationCount>=1&&creationCount<=12,
  'CREATION_COUNT_RANGE');
 check(typeof includeRevisions==='boolean','REVISIONS_MUST_BE_EXPLICIT_BOOLEAN');
 check(Number.isInteger(directedAttempts)&&directedAttempts>=1&&directedAttempts<=3,
  'DIRECTED_ATTEMPT_LIMIT');
 check(Number.isInteger(directedTopologyRounds)&&directedTopologyRounds>=0&&
  directedTopologyRounds<=2,'DIRECTED_TOPOLOGY_ROUND_LIMIT');
 check(Number.isInteger(directAttempts)&&directAttempts>=1&&directAttempts<=2,
  'DIRECT_ATTEMPTS_LIMIT');
 const dir=path.resolve(outDir),parent=path.dirname(dir);
 check(!fs.existsSync(dir),'REFUSE_EXISTING_OUTPUT_DIRECTORY');
 check(fs.existsSync(parent),'OUTPUT_PARENT_MISSING');
 const scratch=fs.mkdtempSync(path.join(parent,'.b198k-paired-'));
 const selected=CREATION_CASES.slice(0,creationCount);
 const revisions=includeRevisions?REVISION_CASES.filter(x=>
  selected.some(s=>s.id===x.baseCaseId)):[];
 const ids=[...selected,...revisions].map(x=>x.id);
 const template=fs.readFileSync(path.join(root,
  'source/ai/b143-viewer-template.html'),'utf8');
 const results=new Map(),directedBase=new Map();
 let plannerCalls=0,directedSourceRequests=0;
 try{
  const direct=await runB198HBenchmark({
   provider:generator,outDir:path.join(scratch,'direct'),
   modelId,providerOrigin,creationCount,
   includeRevisions,attemptsPerCase:directAttempts
  });
  for(const spec of [...CREATION_CASES,...REVISION_CASES]){
   const matched=direct.report.cases.find(x=>x.caseId===spec.id);
   const r=recordFor(spec,'direct',matched?.status??'NOT_RUN');
   r.error=matched?.error??null;
   if(matched?.actualCompiledEvidence){
    r.sourceMetrics={...matched.actualCompiledEvidence,
     sourceGoalStatus:matched.status,
     sourceGoals:matched.sourceReview,
     sourceGeometryIsNotHumanQuality:true};
   }
   results.set('direct:'+spec.id,r);
  }
  fs.mkdirSync(path.join(scratch,'directed'));
  for(const spec of selected){
   const row=recordFor(spec,'directed');
   try{
    const generated=await generateModelDirectedArchitecture({
     prompt:spec.prompt,
     planner:async input=>{plannerCalls++;return planner(input);},
     generator:async input=>{directedSourceRequests++;return generator(input);},
     maxSourceAttempts:directedAttempts,maxRepairRounds:directedTopologyRounds
    });
    const metrics=sourceMetrics(spec,generated);
    row.status=generated.report.status;
    row.sourceMetrics=metrics;
    row.architectureProgramSha256=generated.report.planSha256;
    row.generatorReport=generated.report;
    row.providerRequests=generated.report.designModelCalls+
      generated.report.plannerCalls;
    row.modelOutputAuthenticated=false;
    saveSource(path.join(scratch,'directed',spec.id),
     generated.design,generated.compiled,
     {caseId:spec.id,providerOrigin,mode:'directed',
      actualCompiledSource:metrics,architectureProgram:generated.plan,
      modelWorkflowReport:generated.report,safety:safety()},template);
    directedBase.set(spec.id,generated);
   }catch(e){
    row.status='HOLD_MODEL_OR_SOURCE';
    row.error=short(e);
   }
   results.set('directed:'+spec.id,row);
  }
  for(const spec of revisions){
   const row=recordFor(spec,'directed');
   const base=directedBase.get(spec.baseCaseId);
   if(!base){
    row.status='NOT_RUN_MISSING_BASE';
    row.error='BASE_SOURCE_CREATION_FAILED';
    results.set('directed:'+spec.id,row);continue;
   }
   try{
    const protectedIds=base.design.elements.filter(e=>e.mode==='add')
     .slice(0,1).map(e=>e.id);
    check(protectedIds.length>0,'NO_PROTECTABLE_SOURCE_ELEMENT');
    let attemptedCalls=0;
    const changed=await proposeArchitecture({
     prompt:spec.prompt,
     generator:async input=>{directedSourceRequests++;attemptedCalls++;
      return generator(input);},
     baseDesign:base.design,
     expectedBaseSha256:base.compiled.sourceSha256,
     protectedElementIds:protectedIds,
     maxChangedElements:spec.maxChangedElements,
     allowRemovals:false,maxAttempts:directAttempts
    });
    row.providerRequests=attemptedCalls;
    const protection=inspectInheritedSource({
     beforeDesign:base.design,beforeCompiled:base.compiled,
     afterCompiled:changed.compiled
    });
    check(protection.exactOriginalGeometryAndClearancePreserved,
     'REVISION_LOST_EXISTING_SOURCE_MATERIAL_OR_HEADROOM');
    row.status='SOURCE_REVISION_PROTECTED_HUMAN_REVIEW_REQUIRED';
    row.sourceMetrics=sourceMetrics(spec,changed);
    row.revisionInheritedSourceProof=protection;
    saveSource(path.join(scratch,'directed',spec.id),
     changed.design,changed.compiled,
     {caseId:spec.id,providerOrigin,mode:'directed',
      modelWorkflowReport:changed.review,
      originalSourceSha256:base.compiled.sourceSha256,
      revisionInheritedSourceProof:protection,
      actualCompiledSource:row.sourceMetrics,safety:safety()},template);
   }catch(e){row.status='HOLD_MODEL_OR_SOURCE';row.error=short(e);}
   results.set('directed:'+spec.id,row);
  }
  const comparisons=[];
  for(const spec of [...CREATION_CASES,...REVISION_CASES]){
   const left=results.get('direct:'+spec.id),right=results.get('directed:'+spec.id);
   const a=chooseBlindA(spec.id),b=a==='direct'?'directed':'direct';
   comparisons.push({caseId:spec.id,kind:spec.kind,
    frozenJapanesePrompt:spec.prompt,
    promptSha256:sha(spec.prompt),criteria:spec.criteria,
    armA:a,armB:b,
    armARecord:results.get(a+':'+spec.id),
    armBRecord:results.get(b+':'+spec.id),
    humanReviewStatus:'NOT_REVIEWED',
    winnerNotAutomaticallyDeclared:true,
    both3DScenesAvailable:!!(left?.sourceMetrics&&right?.sourceMetrics)});
  }
  const manifest={
   schema:SCHEMA,sourceSuite:SUITE_VERSION,modelId,providerOrigin,
   localModelIdentityNotIndependentlyAuthenticated:true,
   counts:{selectedCreationTasks:selected.length,
    selectedRevisionTasks:revisions.length,allFrozenCaseIds:16,
    directCompiled:comparisons.filter(c=>results.get('direct:'+c.caseId)?.sourceMetrics).length,
    directedCompiled:comparisons.filter(c=>results.get('directed:'+c.caseId)?.sourceMetrics).length,
    directlyComparableWithBothSources:comparisons.filter(c=>c.both3DScenesAvailable).length,
    humanVisualRatings:0},
   budgets:{directMaxInvalidSourceAttempts:directAttempts,
    directedMaxOriginalSourceAttempts:directedAttempts,
    directedMaxTopologyRepairRoundsPerOriginalAttempt:directedTopologyRounds,
    note:'Different search budgets and extra planner calls: NOT a controlled equal-token causal trial'},
   providerRequestCounts:{direct:direct.report.modelGeneratorInvocations,
    directedPlanning:plannerCalls,directedSource:directedSourceRequests},
   runStatus:'SOURCE_ONLY_HUMAN_QUALITY_UNREVIEWED',
   crossArmAutomaticWinner:null,
   trueIndependentHumanPreferenceMeasured:false,
   realMinecraftPlayerWalkabilityNotTested:true,
   visualScenesUseIndependentCameraControls:true,
   cases:comparisons,
   safety:safety()
  };
  write(path.join(scratch,'B198K_PAIRED_SOURCE_COMPARISON.json'),manifest);
  fs.writeFileSync(path.join(scratch,'index.html'),
   makeB198KReviewHtml(manifest),{flag:'wx'});
  check(!fs.existsSync(dir),'OUTPUT_RACE_REFUSE_OVERWRITE');
  fs.renameSync(scratch,dir);
  return manifest;
 }catch(e){fs.rmSync(scratch,{recursive:true,force:true});throw e;}
}

/** Offline human-first pair reviewer; no external scripts, automatic scores or Minecraft calls. */
export function makeB198KReviewHtml(manifest){
 check(manifest?.schema===SCHEMA,'INVALID_REVIEW_MANIFEST');
 const active=manifest.cases.map(c=>({
  id:c.caseId,prompt:c.frozenJapanesePrompt,
  criteria:c.criteria.map(q=>({id:q.id,description:q.description})),
  armA:c.armA,armB:c.armB,
  A:c.armARecord?.sourceMetrics?
   c.armA+'/'+c.caseId+'/index.html':null,
  B:c.armBRecord?.sourceMetrics?
   c.armB+'/'+c.caseId+'/index.html':null,
  hashes:{
   A:c.armARecord?.sourceMetrics?.sourceSha256??null,
   B:c.armBRecord?.sourceMetrics?.sourceSha256??null
  }
 }));
 const json=JSON.stringify(active).replaceAll('<','\\u003c')
  .replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>B198K 独立3D建築比較レビュー</title><style>'+
 'body{margin:0;background:#f6f8fc;color:#1e3448;font:15px system-ui,sans-serif}'+
 'header,main{max-width:1500px;margin:auto;padding:18px}'+
 '.frames{display:grid;grid-template-columns:1fr 1fr;gap:12px}'+
 'iframe{width:100%;height:520px;border:1px solid #b9c8d8;border-radius:8px;background:#fff}'+
 '.note{background:#e5ebf4;padding:12px;border-radius:8px}'+
 'label{display:block;margin-top:10px;font-weight:600}'+
 'input,select,textarea,button{font:inherit;padding:8px;max-width:100%}'+
 'textarea{display:block;width:96%;min-height:62px}button{margin-top:14px}'+
 '@media(max-width:850px){.frames{grid-template-columns:1fr}iframe{height:430px}}'+
 '</style></head><body><header><h1>B198K — 3D建築の人間による比較</h1>'+
 '<p class="note">A/Bの位置は課題ごとに固定で入れ替わります。両画面のカメラ操作は独立です。'+
 'これはモデル出力のソース形状であり、品質・指示理解・実Minecraft歩行は未認証です。'+
 '自動勝者はありません。根拠を書いた採点はローカルJSONにのみ保存されます。</p></header>'+
 '<main><label>評価対象 <select id="case"></select></label><p id="prompt"></p>'+
 '<div class="frames"><section><h2>候補 A</h2><iframe id="armA" title="候補Aの実B143ソース3D"></iframe></section>'+
 '<section><h2>候補 B</h2><iframe id="armB" title="候補Bの実B143ソース3D"></iframe></section></div>'+
 '<h2>個別の人間評価（任意）</h2><div id="rubric"></div>'+
 '<label>総合的にどちらが優れているか<select id="choice">'+
 '<option value="">未選択</option><option>A</option><option>B</option>'+
 '<option value="TIE">同点</option><option value="NEITHER">両方不十分</option></select></label>'+
 '<label>選択理由（25文字以上）<textarea id="why"></textarea></label>'+
 '<button id="export" disabled>根拠付きレビューをJSON保存</button>'+
 '<p id="status" aria-live="polite">未評価</p></main><script>'+
 '"use strict";const DATA='+json+';const $=id=>document.getElementById(id);'+
 'const opts=DATA.map(v=>{const el=document.createElement("option");el.value=v.id;el.textContent=v.id;return el});'+
 '$("case").append(...opts);let current=null;'+
 'function selected(){return DATA.find(x=>x.id===$("case").value)}'+
 'function attach(){current=selected();if(!current)return;'+
 '$("prompt").textContent=current.prompt;'+
 'for(const arm of ["A","B"]){const u=current[arm];'+
 '$("arm"+arm).src=u??"about:blank";}'+
 '$("rubric").replaceChildren();'+
 'for(const q of current.criteria){const el=document.createElement("section");'+
 'const label=document.createElement("label");label.textContent=q.description;'+
 'el.append(label);for(const arm of ["A","B"]){const sel=document.createElement("select");'+
 'sel.dataset.arm=arm;sel.dataset.criterion=q.id;'+
 'const empty=document.createElement("option");empty.value="";empty.textContent=arm+"：未評価";sel.append(empty);'+
 'for(let n=0;n<=4;n++){const o=document.createElement("option");o.value=String(n);o.textContent=arm+"："+n+"/4";sel.append(o)}'+
 'const note=document.createElement("textarea");note.dataset.note=arm+":"+q.id;'+
 'note.placeholder=arm+" の実際の3Dを見た根拠（25文字以上）";'+
 'el.append(sel,note);sel.addEventListener("change",valid);note.addEventListener("input",valid)}'+
 '$("rubric").append(el)}$("choice").value="";$("why").value="";valid()}'+
 'function values(){const arr=[];if(!current)return null;'+
 'for(const q of current.criteria){for(const arm of ["A","B"]){'+
 'const score=[...document.querySelectorAll("select[data-criterion]")].find(e=>e.dataset.criterion===q.id&&e.dataset.arm===arm);'+
 'const note=[...document.querySelectorAll("textarea[data-note]")].find(e=>e.dataset.note===arm+":"+q.id);'+
 'if(!score||score.value===""||!note||note.value.trim().length<25)return null;'+
 'arr.push({criterionId:q.id,arm,score:Number(score.value),notes:note.value.trim()})}}'+
 'return arr}'+
 'function valid(){const ok=!!(current?.A&&current?.B&&values()&&'+
 '$("choice").value&&$("why").value.trim().length>=25);'+
 '$("export").disabled=!ok;$("status").textContent=ok?'根拠付きで保存可能':'UNREVIEWED：A/B全基準の0〜4点・各25文字以上の根拠と比較理由が必要';}'+
 '$("case").addEventListener("change",attach);'+
 '$("choice").addEventListener("change",valid);$("why").addEventListener("input",valid);'+
 '$("export").addEventListener("click",()=>{const criteria=values();if(!criteria||$("export").disabled)return;'+
 'const body={schema:"b198k-self-reported-human-pair-review-v1",caseId:current.id,'+
 'sourceSha256:current.hashes,criteria,winnerArm:$("choice").value,'+
 'justification:$("why").value.trim(),viewerScenes:["A","B"],'+
 'reviewerClaims3DInspection:true,reviewerIdentityIndependentlyVerified:false,'+
 'humanReviewNotModelScoring:true,worldWrites:0};'+
 'const blob=new Blob([JSON.stringify(body,null,2)],{type:"application/json"});'+
 'const url=URL.createObjectURL(blob),a=document.createElement("a");'+
 'a.href=url;a.download="B198K_HUMAN_"+current.id+".json";document.body.append(a);a.click();a.remove();'+
 'setTimeout(()=>URL.revokeObjectURL(url),1000)});attach();</script></body></html>';
}
