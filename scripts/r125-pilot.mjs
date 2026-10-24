/**
 * R125 local pilot: read-only Ollama preflight followed by 1 or 3 genuine
 * independent, non-library architectural source trials, no hidden retry.
 * No world I/O, paid APIs, shell commands, template routing or auto-push.
 *
 * node scripts/r125-pilot.mjs --model qwen3.8:27b --out ./r125-live-001
 * node scripts/r125-pilot.mjs --model gemma4:26b --out ./r125-live-002 --cases 3
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEFAULT_LOCAL_ENDPOINT} from '../source/ai/b198g-local-model-adapter.mjs';
import {runR125} from './r125-mvp.mjs';

const fail=code=>{throw Error('R125_PILOT_'+code);};
const write=(dir,name,object)=>fs.writeFileSync(path.join(dir,name),
 JSON.stringify(object,null,2)+'\n',{flag:'wx'});
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
export const R125_CASES=Object.freeze([
 Object.freeze({id:'home-two-level',type:'TWO_STORY_HOME',
  prompt:'小さな二階建ての住宅を独自に構想してください。家族の生活に使える少なくとも二つの異なる機能領域、外から入れる玄関、窓、屋根、上下階の実際に連続する階段と着地点、支持された床と頭上の空間を備えてください。外形と内部動線を一体で設計し、固定テンプレートの模倣を避けてください。'}),
 Object.freeze({id:'street-shop',type:'SMALL_SHOP',
  prompt:'小さな独立店舗を独自の建築として設計してください。外部から入れる入口、客が立って移動できる販売空間、別のスタッフ作業空間、明るい窓、用途に合った屋根と外観、支持床を備えてください。二つの空間は実際の入口動線につながり、住宅の使い回しにならないよう形を考えてください。'}),
 Object.freeze({id:'research-studio',type:'COMPACT_RESEARCH_FACILITY',
  prompt:'小規模な研究施設を独自に設計してください。外部入口、作業・実験エリアと観察または記録エリアの二つの機能領域、窓、屋根、開放的な内部動線と支持床を備えてください。安全な動線の考え方と外形を用途から発想してください。店舗や住宅の同一平面のラベル変更は禁止です。'})
]);

export function parseR125PilotArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const values={},allowed=new Set(['--model','--out','--cases','--endpoint']);
 for(let i=0;i<argv.length;i++){
  const k=argv[i],v=argv[++i];
  if(!allowed.has(k)||Object.hasOwn(values,k)||!v||v.startsWith('--'))
   fail('INVALID_ARGUMENT_'+k);
  values[k]=v;
 }
 if(!MODEL.test(values['--model']??'')||!values['--out'])
  fail('MODEL_AND_OUTPUT_REQUIRED');
 const cases=values['--cases']??'1';
 if(!['1','3'].includes(cases))fail('ONLY_ONE_OR_THREE_CASES');
 const endpoint=values['--endpoint']??DEFAULT_LOCAL_ENDPOINT;
 const match=ENDPOINT.exec(endpoint);
 if(!match||Number(match[1])<1||Number(match[1])>65535)
  fail('LOCAL_LOOPBACK_ENDPOINT_ONLY');
 return {model:values['--model'],outDir:path.resolve(values['--out']),
  caseCount:Number(cases),endpoint};
}

/** GET only. This is a model-name listing, NOT proof that GPU inference works. */
export async function preflightR125Ollama({model,endpoint=DEFAULT_LOCAL_ENDPOINT,
 fetcher=fetch,timeoutMs=7000}={}){
 if(!MODEL.test(model??''))fail('INVALID_MODEL');
 const match=ENDPOINT.exec(endpoint);
 if(!match||Number(match[1])<1||Number(match[1])>65535)
  fail('LOCAL_LOOPBACK_ENDPOINT_ONLY');
 if(typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||
  timeoutMs<1000||timeoutMs>30000)fail('PREFLIGHT_OPTIONS');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 const url='http://127.0.0.1:'+match[1]+'/api/tags';
 try{
  const response=await fetcher(url,{method:'GET',redirect:'error',
   signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response||response.ok!==true)fail('OLLAMA_TAGS_HTTP_'+(response?.status??'UNKNOWN'));
  const raw=await response.text();
  if(raw.length>1000000)fail('OLLAMA_TAGS_OVERSIZE');
  let data;
  try{data=JSON.parse(raw);}catch{fail('OLLAMA_TAGS_BAD_JSON');}
  if(!Array.isArray(data?.models)||data.models.length>1000||
   data.models.some(x=>typeof x?.name!=='string'||!MODEL.test(x.name)))
   fail('OLLAMA_TAGS_BAD_SCHEMA');
  const installed=[...new Set(data.models.map(x=>x.name))].sort();
  return {status:installed.includes(model)?'LOCAL_MODEL_LISTED':'HOLD_MODEL_NOT_INSTALLED',
   exactModelRequested:model,installedModels:installed,
   inferencePerformed:false,modelLoaded:false,modelIdentityAuthenticated:false,
   worldContacts:0,worldWrites:0};
 }catch(e){
  if(String(e?.message??e).startsWith('R125_PILOT_'))throw e;
  fail('OLLAMA_TAGS_UNREACHABLE_OR_TIMEOUT');
 }finally{clearTimeout(timer);}
}

export async function runR125Pilot({model,outDir,endpoint=DEFAULT_LOCAL_ENDPOINT,
 caseCount=1}={}, {fetcher=fetch,runSingle=runR125}={}){
 if(!MODEL.test(model??'')||typeof outDir!=='string'||!outDir.trim()||
  ![1,3].includes(caseCount)||typeof runSingle!=='function')fail('INVALID_REQUEST');
 if(fs.existsSync(outDir))fail('OUTPUT_ALREADY_EXISTS');
 const selected=R125_CASES.slice(0,caseCount);
 const dir=path.resolve(outDir);
 fs.mkdirSync(dir,{recursive:false});
 const started=Date.now();
 const report={
  schema:'minecraftaibuilder-r125-local-pilot-v1',status:'HOLD_NOT_STARTED',
  modelId:model,provider:'LOCAL_OLLAMA_LOOPBACK_NOT_CRYPTOGRAPHICALLY_AUTHENTICATED',
  caseCountRequested:caseCount,modelGenerationCalls:0,caseResults:[],
  preflight:null,testInjectionPresent:fetcher!==fetch||runSingle!==runR125,
  architectureArt:'NOT_REVIEWED',
  inWorldWalkability:'NOT_TESTED',mac8Gb2B:'NOT_TESTED',
  worldContacts:0,worldWrites:0,constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED')
 };
 try{
  report.preflight=await preflightR125Ollama({model,endpoint,fetcher});
  if(report.preflight.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_MODEL_NOT_INSTALLED';
   return report;
  }
  // Never silently substitute another model or use a fixture as real evidence.
  for(const item of selected){
   let candidate;
   try{
    candidate=await runSingle({prompt:item.prompt,model,
     endpoint,outDir:path.join(dir,item.id),timeoutMs:180000,
     reasoningEffort:'none',maxOutputTokens:4096});
    if(!candidate||candidate.modelId!==model||
     !['EXPLICIT_LOCAL_LOOPBACK','INJECTED_TEST_DOUBLE'].includes(candidate.provider))
     fail('UNTRUSTED_RUN_RECEIPT');
   }catch(e){
    report.caseResults.push({id:item.id,type:item.type,
     status:'HOLD_RUNNER_ERROR',reason:String(e?.message??e).slice(0,300),
     humanAesthetics:'NOT_REVIEWED',minecraftWorld:'NOT_TESTED'});
    report.status='HOLD_RUNNER_ERROR';
    break;
   }
   const row={
    id:item.id,type:item.type,request:item.prompt,
    status:candidate.status,
    provider:candidate.provider,
    modelCalls:candidate.modelCallCount??0,
    sourceSha256:candidate.sourceSha256??null,
    geometrySha256:candidate.geometrySha256??null,
    sourceReview:candidate.sourceReview??'HOLD',
    realVoxels:candidate.occupiedVoxels??null,
    highRiskGeometryFindings:candidate.highRiskSourceFindings??null,
    localArtifactDir:item.id,
    semanticCompliance:'NOT_REVIEWED',
    humanAesthetics:'NOT_REVIEWED',
    minecraftWorld:'NOT_TESTED',
    modelAuthorship:'DECLARED_PROVIDER_ONLY',
    worldWrites:0
   };
   report.caseResults.push(row);
   report.modelGenerationCalls+=candidate.modelCallCount??0;
   if(candidate.provider!=='EXPLICIT_LOCAL_LOOPBACK'){
    report.status='HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE';
    break;
   }
   if(candidate.status==='HOLD_MODEL_TIMEOUT'){
    report.status='HOLD_MODEL_TIMEOUT';
    break;
   }
   if(candidate.status==='HOLD_GENERATION_OR_REVIEW'&&
    /(?:LOCAL_HTTP|fetch failed|UNREACHABLE|ECONNREFUSED|ABORT)/i
      .test(candidate.reason??'')){
    report.status='HOLD_LOCAL_TRANSPORT';
    break;
   }
  }
  if(report.status==='HOLD_NOT_STARTED')
   report.status=report.testInjectionPresent?
    'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
    report.caseResults.length===caseCount?
     'COMPARISON_SOURCE_RESULTS_READY_REVIEW_REQUIRED':'HOLD_INCOMPLETE';
  return report;
 }catch(e){
  report.status='HOLD_PREFLIGHT';
  report.preflight={status:'HOLD',reason:String(e?.message??e).slice(0,350),
   inferencePerformed:false};
  return report;
 }finally{
  report.elapsedMs=Date.now()-started;
  write(dir,'R125_PILOT_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125PilotArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-pilot.mjs --model qwen3.8:27b --out NEW_DIR [--cases 3] (1 by default; local Ollama only; no Minecraft writes)');
  else{
   const report=await runR125Pilot(args);
   console.log(JSON.stringify({status:report.status,cases:report.caseResults.map(x=>({
    id:x.id,status:x.status,sourceSha256:x.sourceSha256})),
    modelGenerationCalls:report.modelGenerationCalls,
    folder:args.outDir,worldWrites:0}));
   if(report.status.startsWith('HOLD_'))process.exitCode=2;
  }
 }catch(e){console.error('R125_PILOT_HOLD',String(e?.message??e));process.exitCode=2;}
}
