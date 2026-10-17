/**
 * B198B quality evaluation runner — no default model / token spending.
 * Missing key -> no live tests. Only an explicit adapter can generate.
 * Results label source facts vs HUMAN semantic scoring separately.
 */
import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CREATION_CASES,REVISION_CASES,verifyBenchmark,SUITE_VERSION}
 from '../source/ai/b198b-benchmark-cases.mjs';
import {inspectSourceGeometry,inspectProtectedVoxelFidelity,
 evaluateSourceGoals,emptyHumanRubric,summarizeQualityResults}
 from '../source/ai/b198b-architecture-quality.mjs';
import {proposeArchitecture} from '../source/ai/b198-natural-language-design.mjs';
import {createB198OpenAIAdapter} from '../source/ai/b198-openai-provider.mjs';
import {compileB143Gallery,renderB143Html,verifyB143Payload}
 from './build-b143-site.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const requireIt=(c,s)=>{if(!c)throw Error('B198B_'+s)};
const plain=s=>String(s??'').slice(0,350);
function writeJSON(file,data){fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'})}
function escapeHtml(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function makeReviewedHtml({design,provenance}){
 const gallery=compileB143Gallery([design]);
 requireIt(verifyB143Payload(gallery),'RENDER_SAFETY');
 const template=fs.readFileSync(path.join(root,'source/ai/b143-viewer-template.html'),'utf8');
 const base=renderB143Html(gallery,template);
 const banner=provenance==='FIXTURE_ONLY_NOT_NATURAL_LANGUAGE_PROOF'?
  'B198B TEST FIXTURE — 模擬モデル出力。AIの日本語理解・建築品質の合格を意味しません。':
  'B198B MODEL PROPOSAL — 意味の一致・建築品質・Minecraft実機歩行は未評価。';
 const bodyStart=base.match(/<body\b[^>]*>/i)?.[0];
 requireIt(Boolean(bodyStart),'OFFLINE_VIEWER_BODY_NOT_PRESENT');
 return base.replace(bodyStart,bodyStart+
  '<div id="b198b-inference-disclaimer" style="padding:12px 18px;background:#51371f;color:#fff;font-weight:700">'+
  escapeHtml(banner)+' / NOT_PREPARED・Minecraft施工禁止</div>');
}
/**
 * provider is a real LLM adapter OR a test-double injected by the caller.
 * Returns honest detailed results. No real-world execution tools reachable.
 * Case IDs are stable across human rating and later model comparisons.
 */
export async function runB198Benchmark({
 provider,provenance='INJECTED_TEST_DOUBLE',
 outDir,maxCreationCases=2,includeRevisions=false,
 attemptsPerCase=1
}={}){
 requireIt(verifyBenchmark(),'SUITE_NOT_FROZEN');
 requireIt(typeof provider==='function','REAL_OR_TEST_ADAPTER_REQUIRED');
 requireIt(['INJECTED_TEST_DOUBLE','EXPLICIT_LIVE_MODEL_ADAPTER'].includes(provenance),
  'UNKNOWN_MODEL_PROVENANCE');
 requireIt(typeof outDir==='string'&&outDir.length>0,'OUTPUT_FOLDER');
 requireIt(Number.isSafeInteger(maxCreationCases)&&maxCreationCases>=1&&
  maxCreationCases<=12,'CASE_LIMIT_1_TO_12');
 requireIt(Number.isSafeInteger(attemptsPerCase)&&attemptsPerCase>=1&&
  attemptsPerCase<=2,'MAX_2_LLM_ATTEMPTS');
 requireIt(typeof includeRevisions==='boolean','INVALID_REVISION_MODE');
 const destination=path.resolve(outDir);
 requireIt(!fs.existsSync(destination),'NEVER_OVERWRITE_EXISTING_QA');
 const selected=CREATION_CASES.slice(0,maxCreationCases);
 const selectedRev=includeRevisions?REVISION_CASES.filter(c=>
  selected.some(b=>b.id===c.baseCaseId)):[];
 const expected=[...selected.map(c=>c.id),...selectedRev.map(c=>c.id)];
 const temp=fs.mkdtempSync(path.join(path.dirname(destination),
  '.b198b-quality-review-'));
 const results=[],saved=new Map();
 try{
  for(const spec of selected){
   let data,quality;
   try{
    data=await proposeArchitecture({prompt:spec.prompt,generator:provider,
     maxAttempts:attemptsPerCase});
    const audit=inspectSourceGeometry(data);
    const sourceGoals=evaluateSourceGoals(spec,audit);
    const caseDir=path.join(temp,spec.id);fs.mkdirSync(caseDir);
    writeJSON(path.join(caseDir,'source-design.json'),data.design);
    writeJSON(path.join(caseDir,'source-audit.json'),{
     audit,sourceGoals,modelAttemptCount:data.review.attemptCount,
     sourceOnlyHumanReviewRequired:true,
     semanticComplianceNotAutomaticallyCertified:true,
     worldWrites:0,readiness:'NOT_PREPARED'});
    fs.writeFileSync(path.join(caseDir,'index.html'),
     makeReviewedHtml({design:data.design,provenance}),{flag:'wx'});
    saved.set(spec.id,data);
    quality={caseId:spec.id,attempted:true,error:null,
     auditedSourceSha256:data.compiled.sourceSha256,
     geometrySha256:data.compiled.geometrySha256,sourceGoals,
     humanRubric:emptyHumanRubric(spec),humanRating:null,
     actualMinecraftWalkingCertified:false,
     individualBuildingNotWorldApproved:true,
     sourceOnly:true};
   }catch(e){
    quality={caseId:spec.id,attempted:true,
     error:plain(e.message),
     sourceGoals:null,humanRubric:emptyHumanRubric(spec),
     humanRating:null,sourceOnly:true};
   }
   results.push(quality);
  }
  for(const spec of selectedRev){
   const base=saved.get(spec.baseCaseId);
   if(!base){
    results.push({caseId:spec.id,attempted:false,
     error:'BASE_CREATION_DID_NOT_COMPILE',
     humanRubric:emptyHumanRubric(spec),sourceOnly:true});continue;
   }
   const protectedId=base.design.elements.find(e=>e.mode==='add')?.id;
   requireIt(protectedId,'REVISION_BASE_NO_PROTECTABLE_STRUCTURE');
   try{
    const data=await proposeArchitecture({prompt:spec.prompt,generator:provider,
     baseDesign:base.design,
     expectedBaseSha256:base.compiled.sourceSha256,
     protectedElementIds:[protectedId],
     maxChangedElements:spec.maxChangedElements,
     maxAttempts:attemptsPerCase});
    const fidelity=inspectProtectedVoxelFidelity({
     baseDesign:base.design,revisionDesign:data.design,
     protectedElementIds:[protectedId]});
    const audit=inspectSourceGeometry(data);
    const reviewStatus=fidelity.exactProtectedVoxelPreservationPassed?
     'SOURCE_REVISION_FIDELITY_PASS':'HOLD_PROTECTED_VOXEL_LOSS';
    const dir=path.join(temp,spec.id);fs.mkdirSync(dir);
    writeJSON(path.join(dir,'source-audit.json'),{
     audit,fidelity,sourceChangeDiff:data.review.revisionDiff,
     sourceReviewStatus:reviewStatus,
     sourceOnly:true,worldWrites:0,readiness:'NOT_PREPARED'});
    if(fidelity.exactProtectedVoxelPreservationPassed){
     writeJSON(path.join(dir,'source-design.json'),data.design);
     fs.writeFileSync(path.join(dir,'index.html'),
      makeReviewedHtml({design:data.design,provenance}),{flag:'wx'});
    }
    results.push({caseId:spec.id,attempted:true,error:reviewStatus==='SOURCE_REVISION_FIDELITY_PASS'?null:reviewStatus,
     protectedId,sourceGoals:{status:reviewStatus},
     protection:fidelity,humanRubric:emptyHumanRubric(spec),
     humanRating:null,sourceOnly:true});
   }catch(e){
    results.push({caseId:spec.id,attempted:true,error:plain(e.message),
     sourceGoals:null,humanRubric:emptyHumanRubric(spec),
     humanRating:null,sourceOnly:true});
   }
  }
  const metrics=summarizeQualityResults(results,expected);
  const run={schema:SUITE_VERSION,
   sourceQARevision:'b198b-source-benchmark-v1',
   provenance,liveModelQualityTestClaimed:provenance==='EXPLICIT_LIVE_MODEL_ADAPTER',
   liveModelQualityTestProven:false,
   kind:'ARCHITECTURE_QUALITY_RESEARCH_SOURCE_ONLY',
   attemptedCreationCases:selected.length,
   eligibleRevisionCases:selectedRev.length,
   individualCases:results,metrics,
   allHumanSemanticCriteriaRated:false,
   userFacingPassLabel:'PIPELINE_TEST_ONLY_NOT_SEMANTIC_PASS',
   safety:{readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
    worldWrites:0,worldContacts:0,worldCoordinates:null,
    constructionApproved:false,BuildPlan:{operations:[]}}
  };
  writeJSON(path.join(temp,'B198B_RESULTS.json'),run);
  fs.renameSync(temp,destination);
  return run;
 }catch(e){
  fs.rmSync(temp,{recursive:true,force:true});
  throw e;
 }
}
function parseArgs(argv){
 const a={};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(k==='--with-revisions'){a.revisions=true;continue}
  if(!['--model','--out','--case-limit','--attempts'].includes(k))
   throw Error('B198B_UNKNOWN_ARG_'+k);
  if(!argv[i+1])throw Error('B198B_MISSING_ARG_'+k);
  a[k.slice(2)]=argv[++i];
 }
 requireIt(typeof a.model==='string','EXPLICIT_MODEL_REQUIRED');
 requireIt(typeof a.out==='string','OUTPUT_PATH_REQUIRED');
 return a;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opt=parseArgs(process.argv.slice(2));
  // Intentionally no GitHub Actions real API token. Runtime requires the
  // user explicitly provide OPENAI_API_KEY and the chosen model ID.
  const adapter=createB198OpenAIAdapter({model:opt.model});
  const result=await runB198Benchmark({
   provider:adapter,provenance:'EXPLICIT_LIVE_MODEL_ADAPTER',
   outDir:opt.out,maxCreationCases:Number(opt['case-limit']??2),
   includeRevisions:Boolean(opt.revisions),attemptsPerCase:Number(opt.attempts??1)
  });
  console.log('B198B_LIVE_SOURCE_RESULTS_NOT_SEMANTIC_CERTIFICATION',
   JSON.stringify({attempted:result.metrics.attemptedCaseCount,
    sourceGoalsPass:result.metrics.sourceGoalsPassedCount,
    humanReviewed:result.metrics.humanReviewedCount,
    output:path.resolve(opt.out),
    minecraftWrites:0}));
 }catch(e){console.error(plain(e.message));process.exitCode=1}
}
