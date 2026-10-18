/**
 * B198S: ONE live Ollama-native original B143 source from frozen B198B c01.
 * Real source is model-authored; independent B143 compiler and source critique
 * run BEFORE success. NO default model, no retries, no paid API/world calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {createB198SNativeBridge,SCHEMA as BRIDGE_SCHEMA}
 from '../source/ai/b198s-native-ollama-source.mjs';
import {runB198HBenchmark}
 from '../source/ai/b198h-model-benchmark.mjs';
import {compileDesign,verifyCompiled}
 from '../source/ai/b143-building-dsl.mjs';

export const SCHEMA='minecraftaibuilder-b198t-single-source-provenance-v1';
const fail=s=>{throw Error('B198S_SINGLE_SOURCE_'+s)};
const must=(x,y)=>{if(!x)fail(y)};
const modelId=s=>typeof s==='string'&&/^[A-Za-z0-9._:/-]{2,140}$/.test(s);
const integer=(s,min,max)=>
 typeof s==='string'&&/^(?:[1-9][0-9]*)$/.test(s)&&
 Number(s)>=min&&Number(s)<=max?Number(s):null;
export function parseB198SArgs(args=[]){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const allowed=new Set(['--model','--out','--port','--timeout-seconds',
  '--source-tokens','--context-tokens']);
 const a={};
 for(let i=0;i<args.length;i++){
  const flag=args[i];
  must(allowed.has(flag)&&a[flag]===undefined,'INVALID_OR_DUPLICATE_FLAG');
  const value=args[++i];
  must(typeof value==='string'&&!value.startsWith('--')&&value.length>0,
   'MISSING_FLAG_VALUE');
  a[flag]=value;
 }
 must(modelId(a['--model'])&&typeof a['--out']==='string',
  'EXPLICIT_MODEL_AND_OUT_REQUIRED');
 const port=integer(a['--port']??'11434',1,65535);
 const timeoutSeconds=integer(a['--timeout-seconds']??'300',60,360);
 const sourceTokens=integer(a['--source-tokens']??'3072',512,4096);
 const contextTokens=integer(a['--context-tokens']??'6144',4096,8192);
 must(port!==null&&timeoutSeconds!==null&&sourceTokens!==null&&
  contextTokens!==null,'INVALID_NUMERIC_OPTION');
 must(sourceTokens<=contextTokens-2048,'OUTPUT_CONTEXT_OVERLAP');
 return {model:a['--model'],outDir:path.resolve(a['--out']),
  port,timeoutSeconds,sourceTokens,contextTokens};
}
export async function runB198SSingleSource({
 model,outDir,port=11434,timeoutSeconds=300,
 sourceTokens=3072,contextTokens=6144,
 provider=null,bridgeFactory=createB198SNativeBridge
}={}){
 must(modelId(model),'MODEL_ID_REQUIRED');
 must(typeof outDir==='string'&&outDir.length>0,'OUT_REQUIRED');
 must(!fs.existsSync(outDir),'REFUSE_EXISTING_OUTPUT');
 must(fs.existsSync(path.dirname(outDir)),'OUTPUT_PARENT_MISSING');
 must(Number.isInteger(timeoutSeconds)&&timeoutSeconds>=60&&timeoutSeconds<=360,
  'TIMEOUT_SECONDS_RANGE');
 must(Number.isInteger(port)&&port>=1&&port<=65535,'PORT_RANGE');
 const bridge=bridgeFactory({
  numPredict:sourceTokens,numCtx:contextTokens
 });
 must(bridge&&typeof bridge.fetcher==='function'&&
  typeof bridge.telemetry==='function','NATIVE_BRIDGE_REQUIRED');
 // Allow test fixtures without accidentally labeling them as genuine LLM.
 const mock=typeof provider==='function';
 const adapter=mock?provider:createB198GLocalModelAdapter({
  model,endpoint:'http://127.0.0.1:'+port+'/v1/chat/completions',
  fetcher:bridge.fetcher,timeoutMs:timeoutSeconds*1000
 });
 const dir=path.resolve(outDir);
 const {report,native}=await runB198HBenchmark({
  provider:adapter,outDir:dir,modelId:model,
  providerOrigin:mock?'INJECTED_TEST_DOUBLE':'EXPLICIT_LOCAL_LOOPBACK',
  creationCount:1,includeRevisions:false,attemptsPerCase:1
 });
 const file=path.join(dir,'c01','source-design.json');
 let independentlyCompiled=null;
 if(fs.existsSync(file)){
  const source=JSON.parse(fs.readFileSync(file,'utf8'));
  const compiled=compileDesign(source);
  must(verifyCompiled(source,compiled),'POST_WRITE_COMPILER_SHA_FAILED');
  independentlyCompiled={
   sourceSha256:compiled.sourceSha256,
   geometrySha256:compiled.geometrySha256,
   voxels:compiled.primitives.length,
   elements:source.elements.length
  };
 }
 const original=report.cases.find(x=>x.caseId==='c01');
 const modelCalls=bridge.telemetry();
 const metadataRepair=modelCalls.find(x=>x.metadataRepair)?.metadataRepair??null;
 const metadataRepairApplied=metadataRepair?.applied===true;
 // Metadata may be shortened; real model geometry remains untouched,
 // and B143 recompile with independent SHA is still compulsory.
 if(metadataRepairApplied){
  must(metadataRepair.geometryFieldsUnchanged===true&&
   metadataRepair.unchangedElementArraySha256?.length===64,
   'REPAIRED_METADATA_GEOMETRY_GUARD');
 }
 const status=independentlyCompiled&&report.successfullyCompiledCaseCount===1?
  metadataRepairApplied?
   'SOURCE_COMPILED_AFTER_METADATA_ONLY_REPAIR_HUMAN_REVIEW_REQUIRED':
   'SOURCE_COMPILED_HUMAN_ARCHITECTURE_REVIEW_REQUIRED':
  'HOLD_NO_COMPILED_SOURCE';
 const summary={
  schema:SCHEMA,
  status,actualProviderCalled:mock?false:bridge.telemetry().length>0,
  modelRequested:model,
  providerOrigin:mock?'INJECTED_TEST_DOUBLE':'EXPLICIT_LOCAL_LOOPBACK',
  originalTaskId:'c01',
  benchmarkFrozenJapanesePrompt:true,
  full16ArchitectureBenchmarkCompleted:false,
  singleOriginalModelCallLimit:1,
  oneSourceCallWithoutPlanner:true,
  zeroArchitecturalTemplateFallbacks:true,
  architectureSemanticOrAestheticQualityCertified:false,
  originalSourceGoals:original?.status??'HOLD',
  originalSourceError:original?.error??null,
  independentlyCompiled,
  compiledSourceReview:original?.sourceReview??null,
  modelTransport:BRIDGE_SCHEMA,
  nativeRequestBudgets:bridge.requestBudget,
  originalModelMetadataOnlyRepair:{
   applied:metadataRepairApplied,
   provenance:metadataRepair,
   geometryAndSourceRequiresStrictIndependentCompiler:true,
   repairedTextRequiresHumanReview:metadataRepairApplied,
   automaticQualityCertification:false
  },
  modelCalls,
  modelWasNotReloadedInThisProcessUnverified:true,
  humanVisualReview:'NOT_REVIEWED',
  readiness:'NOT_PREPARED',safety:{
   readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,worldCoordinates:null,worldContacts:0,worldWrites:0,
   gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
  },
  nextStep:status.startsWith('SOURCE_COMPILED')?
   'Open source-study/c01/index.html, visually inspect architecture, then grade Japanese intent and iterate source-only.':
   'Inspect native model telemetry and source compilation HOLD, then adjust bounded source token budget or prompt without automatic full model retries.'
 };
 fs.writeFileSync(path.join(path.dirname(dir),'B198S_UPLOAD_THIS_SUMMARY.json'),
  JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return {summary,report,native};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=parseB198SArgs(process.argv.slice(2));
  if(a.help){
   console.log('node scripts/b198s-single-source-probe.mjs --model LOCAL_MODEL --out FRESH_SOURCE_STUDY [--port 11434] [--timeout-seconds 60..360] [--source-tokens 512..4096] [--context-tokens 4096..8192]');
  }else{
   const {summary}=await runB198SSingleSource(a);
   console.log('B198S_SINGLE_SOURCE_FINISHED',JSON.stringify({
    status:summary.status,model:summary.modelRequested,
    modelRequests:summary.modelCalls.length,
    compiled:summary.independentlyCompiled!==null,
    sourceOnly:true,sourceQualityCertified:false,worldWrites:0,
    output:a.outDir
   }));
  }
 }catch(e){
  console.error('B198S_SINGLE_SOURCE_HOLD',String(e?.message??e).slice(0,350));
  process.exitCode=1;
 }
}
