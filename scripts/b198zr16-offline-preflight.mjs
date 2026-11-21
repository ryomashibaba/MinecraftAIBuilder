/**
 * B198Z R16: offline source test before any NEW model authorization.
 * Runs ONLY node:test fixtures; local 127.0.0.1 mock HTTP is used by tests
 * but NO Qwen/Ollama backend is ever called, loaded or downloaded here.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {runR12OfflineQA} from './b198zr12-local-offline-qa.mjs';
import {R11_COMPACT_GUIDE,R11_GUIDE_SHA256}
 from '../source/ai/b198zr11-compact-r4-output.mjs';
import {createB198SNativeBridge}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {EXPLICIT_AUTHORIZATION}
 from './b198zr6-authorized-single-r4-capture.mjs';

export const SCHEMA='minecraftaibuilder-b198zr16-preflight-fixture-only-v1';
const fail=s=>{throw Error('B198ZR16_'+s)};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const suites=[
 'scripts/b198zr6-authorized-single-r4-capture.test.mjs',
 'scripts/b198zr11-output-budget.test.mjs',
 'scripts/b198zr13-quality-decision.test.mjs',
 'scripts/b198zr15-evidence-quality-target.test.mjs'
];
export function runR16FixturePreflight({spawn=spawnSync}={}){
 if(fs.existsSync(path.join(root,'scripts','RUN_B198ZR6_ONLY_AFTER_APPROVAL.cmd')))
  fail('REAL_MODEL_LAUNCHER_MUST_NOT_BE_IN_DISTRIBUTED_MINI');
 const sha=createHash('sha256').update(R11_COMPACT_GUIDE).digest('hex');
 if(sha!==R11_GUIDE_SHA256)fail('COMPACT_GUIDE_HASH');
 if(EXPLICIT_AUTHORIZATION!=='I_APPROVE_ONE_LOCAL_MODEL_REQUEST')
  fail('LEGACY_SINGLE_POST_GATE_CHANGED');
 const bridge=createB198SNativeBridge({
  plannedSourceMode:true,compactPlannedGuide:true,
  numPredict:3072,numCtx:6144});
 if(!bridge.requestBudget?.r11CompactOutputProfileOptIn||
   bridge.requestBudget?.r11CompactGuideSha256!==sha||
   bridge.requestBudget?.numPredict!==3072||
   bridge.requestBudget?.numCtx!==6144||
   bridge.telemetry().length!==0)
  fail('R11_MODEL_PROFILE_OR_BUDGET');
 const qa=runR12OfflineQA();
 if(qa.status!=='OFFLINE_SYNTHETIC_QA_PASS'||
   qa.actualQwenInferenceCalls!==0||qa.minecraftWorldWrites!==0)
  fail('ARCHITECTURE_SOURCE_OFFLINE_QA');
 const files=suites.map(rel=>{
  const f=path.join(root,rel);
  if(!fs.existsSync(f)||!fs.statSync(f).isFile())
   fail('MISSING_TEST_'+rel);
  return f;
 });
 const result=spawn(process.execPath,['--test',...files],{
  cwd:root,encoding:'utf8',timeout:125000,maxBuffer:1024*1024,
  env:{...process.env,R16_SOURCE_TEST_ONLY:'1'}
 });
 if(result.error||result.status!==0||result.signal!==null)
  fail('MOCK_TESTS_FAILED_'+(result.error?.code??result.status??result.signal));
 const match=/(?:(?:^|\n)[^\n]*tests\s+(\d+))/g;
 const pass=/(?:(?:^|\n)[^\n]*pass\s+(\d+))/g;
 const parsedTests=[...(result.stdout??'').matchAll(match)].at(-1);
 const parsedPass=[...(result.stdout??'').matchAll(pass)].at(-1);
 if(!parsedTests||!parsedPass||
   Number(parsedTests[1])<20||parsedTests[1]!==parsedPass[1])
  fail('MOCK_TEST_SUMMARY_MISSING_OR_MISMATCH');
 return {
  schema:SCHEMA,status:'R16_OFFLINE_PREPARED_NO_QWEN',
  realModelCalls:0,syntheticLocalHttpFixturesOnly:true,
  tests:Number(parsedTests[1]),passed:Number(parsedPass[1]),
  guideSha256:sha,model:'qwen3.8:27b',
  nextAuthorizedRunRequired:true,
  codeIncludesNoDoubleClickRealInferenceLauncher:true,
  sourceGeometryValidatedByR12:true,
  outputTokensPerFutureRequest:3072,contextTokens:6144,
  futureModelTransportRequestsMadeNow:0,
  modelQualityCertified:false,
  minecraftWorldReads:0,minecraftWorldWrites:0,
  readiness:'NOT_PREPARED',
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const report=runR16FixturePreflight();
  console.log(JSON.stringify(report,null,2));
  console.log('R16_OFFLINE_PREPARED_NO_QWEN');
 }catch(e){
  console.error('R16_PREPARE_HOLD',String(e?.message??e).slice(0,180));
  process.exitCode=1;
 }
}
