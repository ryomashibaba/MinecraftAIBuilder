/**
 * B198H: run the frozen 12+4 Japanese architecture suite through the original
 * B198B runner while guarding ALL inherited source material voxels and clear
 * floor/headroom, and publish independently recompiled per-case evidence.
 * No models, networking, world clients, or paid API in this module.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CREATION_CASES,REVISION_CASES} from './b198b-benchmark-cases.mjs';
import {readModelProposal} from './b198-natural-language-design.mjs';
import {compileDesign,verifyCompiled} from './b143-building-dsl.mjs';
import {inspectInheritedSource} from './b198g-autonomous-quality.mjs';
import {critiqueArchitecture} from './b198c-spatial-critic.mjs';
import {runB198Benchmark} from '../../scripts/b198b-quality-benchmark.mjs';

export const SCHEMA='minecraftaibuilder-b198h-provider-benchmark-evidence-v1';
const fail=s=>{throw Error('B198H_'+s);};
const yes=(b,s)=>{if(!b)fail(s);};
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const safe=()=>({
 readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldCoordinates:null,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
});
const expectedIds=[...CREATION_CASES,...REVISION_CASES].map(x=>x.id);
const title=x=>String(x??'').slice(0,250);

/**
 * Provider is caller-owned. Passing an injected test double must explicitly
 * retain TEST_DOUBLE provenance; only an explicit localhost CLI launcher may
 * label actual local model invocations. This is source QA, never a semantic
 * or aesthetic grade.
 */
export async function runB198HBenchmark({
 provider,outDir,modelId='UNVERIFIED',providerOrigin='INJECTED_TEST_DOUBLE',
 creationCount=12,includeRevisions=true,attemptsPerCase=1
}={}){
 yes(typeof provider==='function','EXPLICIT_PROVIDER_REQUIRED');
 yes(['INJECTED_TEST_DOUBLE','EXPLICIT_LOCAL_LOOPBACK'].includes(providerOrigin),
  'INVALID_PROVIDER_ORIGIN');
 yes(typeof modelId==='string'&&modelId.length>=2&&modelId.length<=140,
  'EXPLICIT_MODEL_PROVENANCE_REQUIRED');
 yes(typeof outDir==='string'&&outDir.length>0,'OUTPUT_REQUIRED');
 yes(Number.isSafeInteger(creationCount)&&creationCount>=1&&creationCount<=12,
  'CREATION_COUNT_RANGE');
 yes(typeof includeRevisions==='boolean','INVALID_REVISIONS_FLAG');
 yes(Number.isSafeInteger(attemptsPerCase)&&attemptsPerCase>=1&&attemptsPerCase<=2,
  'ATTEMPTS_RANGE');
 const dest=path.resolve(outDir);
 yes(!fs.existsSync(dest),'REFUSE_EXISTING_OUTPUT');
 yes(fs.existsSync(path.dirname(dest)),'OUTPUT_PARENT_MISSING');

 let requests=0,sourceGuardRejects=0;
 const guarded=async request=>{
  requests++;
  const raw=await provider(request);
  if(request.mode==='revision'){
   const parsed=readModelProposal(raw);
   const original=request.previousDesign;
   const before=compileDesign(original);
   const candidate=compileDesign(parsed.design);
   yes(verifyCompiled(original,before)&&
       verifyCompiled(parsed.design,candidate),'REVISION_COMPILE_VERIFICATION');
   const proof=inspectInheritedSource({
     beforeDesign:original,beforeCompiled:before,afterCompiled:candidate
   });
   if(!proof.exactOriginalGeometryAndClearancePreserved){
     sourceGuardRejects++;
     fail('REVISION_DAMAGES_ORIGINAL_MATERIAL_OR_CLEARANCE');
   }
  }
  return raw;
 };
 const native=await runB198Benchmark({
  provider:guarded,outDir:dest,
  provenance:providerOrigin==='EXPLICIT_LOCAL_LOOPBACK'?
   'EXPLICIT_LIVE_MODEL_ADAPTER':'INJECTED_TEST_DOUBLE',
  maxCreationCases:creationCount,includeRevisions,attemptsPerCase
 });
 const resultMap=new Map(native.individualCases.map(c=>[c.caseId,c]));
 const cases=[];
 for(const spec of [...CREATION_CASES,...REVISION_CASES]){
  const record=resultMap.get(spec.id);
  let outputSource=null,sourceReview=null;
  if(record?.attempted===true&&!record.error){
   const source=path.join(dest,spec.id,'source-design.json');
   if(fs.existsSync(source)){
     try{
      const document=JSON.parse(fs.readFileSync(source,'utf8'));
      const compiled=compileDesign(document);
      if(!verifyCompiled(document,compiled))fail('POSTWRITE_VERIFY_'+spec.id);
      outputSource={sourceSha256:compiled.sourceSha256,
       geometrySha256:compiled.geometrySha256,
       occupiedVoxels:compiled.primitives.length,
       elementCount:document.elements.length};
      const audit=critiqueArchitecture({design:document,compiled});
      sourceReview={
       verifiedTwoWideFloors:audit.objectiveAudit.verifiedTwoWideStandingSquares,
       largestSameElevationFloor:audit.objectiveAudit.largestSameLevelConnectedSquareCount,
       highRiskSourceFindings:audit.highRiskCount,
       sourceCritiqueNotMinecraftWalking:true
      };
      if(spec.kind==='revision'){
       const sourceBefore=path.join(dest,spec.baseCaseId,'source-design.json');
       yes(fs.existsSync(sourceBefore),'REVISION_PARENT_SOURCE_MISSING');
       const old=JSON.parse(fs.readFileSync(sourceBefore,'utf8'));
       const protect=inspectInheritedSource({
        beforeDesign:old,beforeCompiled:compileDesign(old),afterCompiled:compiled});
       sourceReview.inheritedGeometryProtection=protect;
       yes(protect.exactOriginalGeometryAndClearancePreserved,
        'POSTWRITE_DESTRUCTIVE_REVISION');
      }
     }catch(e){
      // Never silently present a parse/compile/audit failure as success.
      outputSource=null;
      sourceReview={auditError:title(e.message)};
     }
   }
  }
  const status=!record||!record.attempted?'NOT_RUN':
   record.error?'MODEL_OR_SOURCE_HOLD':
   !outputSource?'SOURCE_EVIDENCE_HOLD':
   spec.kind==='revision'?'REVISION_SOURCE_REVIEW_REQUIRED':
   record.sourceGoals?.status==='SOURCE_GOALS_PASS'?
    'SOURCE_GOALS_PASS_HUMAN_REVIEW_REQUIRED':
    'SOURCE_GOALS_HOLD_HUMAN_REVIEW_REQUIRED';
  cases.push({caseId:spec.id,kind:spec.kind,
    parentCaseId:spec.baseCaseId??null,
    promptSha256:sha(spec.prompt),status,
    error:record?.error??sourceReview?.auditError??null,
    actualCompiledEvidence:outputSource,sourceReview,
    humanSemantics:'UNREVIEWED',humanAesthetics:'UNREVIEWED',
    MinecraftPlayerWalking:'NOT_TESTED',worldWrites:0});
 }
 const compiled=cases.filter(x=>x.actualCompiledEvidence!==null).length;
 const report={schema:SCHEMA,
  providerOrigin,modelId,sourceBenchmarkVersion:native.schema,
  selectedCreationCount:creationCount,revisionsEnabled:includeRevisions,
  expectedFrozenCaseCount:16,
  requiredAll16Executed:creationCount===12&&includeRevisions,
  modelGeneratorInvocations:requests,
  revisionRequestsRefusedBySourceGuard:sourceGuardRejects,
  successfullyCompiledCaseCount:compiled,
  attemptedCases:cases.filter(x=>x.status!=='NOT_RUN').length,
  sourceGoalSatisfiedCreations:cases.filter(x=>
   x.kind==='creation'&&x.status==='SOURCE_GOALS_PASS_HUMAN_REVIEW_REQUIRED').length,
  humanSemanticReviewCompleted:0,
  humanAestheticReviewCompleted:0,
  automaticPromptComprehensionCertified:false,
  full16SemanticQualityCertified:false,
  modelHasBeenIndependentlyVerified:false,
  finalStatus:compiled===16&&creationCount===12&&includeRevisions?
   'ALL_16_SOURCE_COMPILED_HUMAN_QUALITY_HOLD':'INCOMPLETE_SOURCE_BENCHMARK_HOLD',
  cases,world:safe()
 };
 fs.writeFileSync(path.join(dest,'B198H_INDEPENDENT_SOURCE_EVIDENCE.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return {report,native};
}
