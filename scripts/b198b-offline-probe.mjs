/**
 * Deterministic CI test-double benchmark. DO NOT label as LLM inference.
 * The c01 fixture intentionally mismatches the c01 library request;
 * this proves that compiler PASS != natural-language semantic PASS.
 */
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {runB198Benchmark} from './b198b-quality-benchmark.mjs';
import {fixtureAmphitheater,fixtureLighthouse,candidate} from './b198a-fixtures.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(here,'../b198b-evidence');
let created=0;
const fixture=async request=>{
 if(request.mode==='revision'){
  const changed=structuredClone(request.previousDesign);
  changed.elements.push({id:'b198b-added-crown-light',shape:'box',mode:'add',
   origin:[18,27,36],size:[22,1,5],material:'glow'});
  return candidate(changed);
 }
 created++;
 return candidate(created===1?fixtureAmphitheater():fixtureLighthouse());
};
const report=await runB198Benchmark({
 provider:fixture,
 provenance:'INJECTED_TEST_DOUBLE',
 outDir:out,maxCreationCases:2,includeRevisions:true,attemptsPerCase:1
});
if(report.metrics.attemptedCaseCount!==3||
 report.metrics.humanReviewedCount!==0||
 report.liveModelQualityTestProven!==false||
 report.safety.worldWrites!==0)
 throw Error('B198B_FALSE_CI_MODEL_OR_SEMANTIC_SUCCESS');
console.log('B198B_FIXTURE_ONLY_BENCHMARK_QA_PASS',
 JSON.stringify({cases:report.metrics.expectedCaseCount,
 attempts:report.metrics.attemptedCaseCount,
 strictSourceGoalsPassed:report.metrics.sourceGoalsPassedCount,
 humanSemanticCriteriaPassed:'UNREVIEWED',
 liveAIInferencePerformed:false,
 simulatedCreationArchitectures:['crescent-amphitheater','glass-observatory-tower'],
 constructedMinecraftBlocks:0,
 manual3dInspectionEvidence:out}));
