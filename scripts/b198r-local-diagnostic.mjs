/**
 * B198R diagnostic — one small ACTUAL local Ollama generation, not a building.
 * No GitHub/network outside literal 127.0.0.1, model downloads, APIs or worlds.
 * Saves performance and device load evidence WITHOUT generated prompt text.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';

export const SCHEMA='minecraftaibuilder-b198r-ollama-local-speed-probe-v1';
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=x=>{throw Error('B198R_'+x)};
const check=(x,y)=>{if(!x)fail(y)};
const err=e=>String(e?.code??e?.message??e).slice(0,180);
const seconds=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?
 Number((x/1e9).toFixed(3)):null;
const numeric=x=>Number.isSafeInteger(x)&&x>=0?x:null;
const safety=()=>({readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0,
 constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
function localhostJson({port,path:route,method='GET',body=null,deadlineMs=3000}){
 check(Number.isInteger(port)&&port>=1&&port<=65535,'INVALID_LOCAL_PORT');
 check(['/api/chat','/api/ps','/api/show'].includes(route),'INVALID_NATIVE_PATH');
 check(['GET','POST'].includes(method),'INVALID_METHOD');
 const raw=body===null?'':JSON.stringify(body);
 check(Buffer.byteLength(raw,'utf8')<=16384,'REQUEST_TOO_LARGE');
 return new Promise((resolve,reject)=>{
  let done=false;
  const finish=(e,value)=>{
   if(done)return;
   done=true;clearTimeout(timer);e?reject(e):resolve(value);
  };
  const req=http.request({
   hostname:'127.0.0.1',port,path:route,method,agent:false,
   headers:method==='POST'?{
    'Content-Type':'application/json',
    'Content-Length':Buffer.byteLength(raw,'utf8')
   }:{}
  },res=>{
   let bytes=0;const chunks=[];
   res.on('data',chunk=>{
    bytes+=chunk.length;
    if(bytes>131072){
     req.destroy(Error('B198R_RESPONSE_TOO_LARGE'));
     return;
    }
    chunks.push(chunk);
   });
   res.on('error',e=>finish(e));
   res.on('end',()=>{
    try{
     const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));
     if(res.statusCode<200||res.statusCode>=300)
      throw Error('B198R_HTTP_'+res.statusCode+'_'+
        String(parsed.error??'UNKNOWN').slice(0,110));
     finish(null,parsed);
    }catch(e){finish(e)}
   });
  });
  const timer=setTimeout(()=>req.destroy(Error('B198R_DEADLINE_EXPIRED')),
   deadlineMs);
  req.on('error',e=>finish(e));
  req.end(raw);
 });
}
function modelMemory(ps,id){
 const all=Array.isArray(ps?.models)?ps.models:[];
 const m=all.find(x=>x?.name===id||x?.model===id);
 if(!m)return {loaded:false,sizeBytes:null,vramBytes:null,
  gpuFractionOfModelSize:null};
 const size=numeric(m.size),vram=numeric(m.size_vram);
 return {loaded:true,sizeBytes:size,vramBytes:vram,
  gpuFractionOfModelSize:size>0&&vram!==null?
   Number((vram/size).toFixed(3)):null,
  gpuFractionIsOnlyAnEstimate:true,
  loadedContextLength:numeric(m.context_length)};
}
async function optionalInfo({port,route,method='GET',body}){
 try{return await localhostJson({port,path:route,method,body,deadlineMs:3000})}
 catch{return null}
}
export async function runB198RDiagnostic({
 model,port=11434,timeoutSeconds=60,request=localhostJson,
 getDeviceInfo=true
}={}){
 check(typeof model==='string'&&MODEL.test(model),'EXPLICIT_LOCAL_MODEL_REQUIRED');
 check(Number.isInteger(port)&&port>=1&&port<=65535,'INVALID_LOCAL_PORT');
 check(Number.isInteger(timeoutSeconds)&&timeoutSeconds>=15&&
  timeoutSeconds<=120,'TIMEOUT_SECONDS_15_TO_120');
 const params={model,port,timeoutSeconds};
 const first=getDeviceInfo?await optionalInfo({
  port,route:'/api/ps'}):null;
 const meta=getDeviceInfo?await optionalInfo({
  port,route:'/api/show',method:'POST',body:{model}}):null;
 const advertised=meta?.thinking?.values;
 let result=null,failure=null;
 const start=performance.now();
 const probeBody={
  model,stream:false,think:false,format:'json',keep_alive:'5m',
  options:{num_predict:128,num_ctx:2048,temperature:0},
  messages:[
   {role:'system',content:'Return only valid JSON. Reply briefly, with no thinking text.'},
   {role:'user',content:'Return exactly this JSON object: {"ready":true,"parts":["floor","wall","roof"]}. No other text.'}
  ]
 };
 try{
  result=await request({
   port,path:'/api/chat',method:'POST',
   body:probeBody,deadlineMs:timeoutSeconds*1000
  });
 }catch(e){failure=err(e)}
 const elapsedMs=Math.round(performance.now()-start);
 const after=getDeviceInfo?await optionalInfo({port,route:'/api/ps'}):null;
 let reply=null,jsonOk=false;
 if(result){
  try{
   reply=JSON.parse(result.message?.content??'');
   jsonOk=reply?.ready===true&&
    Array.isArray(reply.parts)&&
    ['floor','wall','roof'].every(x=>reply.parts.includes(x));
  }catch{jsonOk=false}
 }
 const evalCount=numeric(result?.eval_count);
 const evalDuration=seconds(result?.eval_duration);
 const tokensPerSecond=evalCount!==null&&evalDuration>0?
  Number((evalCount/evalDuration).toFixed(2)):null;
 const modelRunning=after??first;
 return {
  schema:SCHEMA,status:failure?'HOLD_MODEL_REQUEST':jsonOk?
   'LOCAL_SMALL_JSON_PROBE_PASS':'HOLD_SMALL_JSON_VALIDATION',
  requestedModel:model,server:'127.0.0.1',port,
  genuineLocalInferenceRequested:true,
  providerIdentityNotIndependentlyAuthenticated:true,
  completedShortProbe:!failure&&!!result,
  didNotAttemptFullBuilding:true,
  frozenArchitectureCasesAttempted:0,
  thinkingDisabledRequested:true,
  thinkingDisabledGuaranteed:false,
  thinkingAdvertisedValues:Array.isArray(advertised)?
   advertised.filter(x=>typeof x==='boolean'||typeof x==='string').slice(0,12):null,
  maxOutputTokensRequested:128,
  requestedContextSize:2048,
  explicitlyBoundedWaitSeconds:timeoutSeconds,
  elapsedMs,problem:failure,
  response:{jsonMatchedExpectedShape:jsonOk,
   generatedTextCharacters:numeric(result?.message?.content?.length),
   thinkingTextCharacters:numeric(result?.message?.thinking?.length),
   modelReportedDone:result?.done===true,
   completionReason:typeof result?.done_reason==='string'?
    result.done_reason.slice(0,60):null},
  telemetry:{
   totalSeconds:seconds(result?.total_duration),
   loadSeconds:seconds(result?.load_duration),
   promptEvalSeconds:seconds(result?.prompt_eval_duration),
   promptTokenCount:numeric(result?.prompt_eval_count),
   promptCacheTokens:numeric(result?.prompt_eval_cached_count),
   generatedTokens:evalCount,
   generationSeconds:evalDuration,
   generatedTokensPerSecond:tokensPerSecond},
  modelResidency:modelMemory(modelRunning,model),
  modelResidencyProbeAvailable:!!modelRunning,
  diagnosticsOnlyNoSourceOrModelQualityClaim:true,
  nextAction:failure?
   'Check Ollama health, available memory and logs; do not retry a 360s full design.':
   jsonOk?
   'Compare observed generation speed with expected B143 JSON size before attempting full source generation.':
   'Investigate JSON/thinking support before starting full architecture generation.',
  safety:safety()
 };
}
export function parseB198RArgs(args=[]){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const valid=new Set(['--model','--out','--port','--timeout-seconds']);
 const opts={};
 for(let i=0;i<args.length;i++){
  const k=args[i];check(valid.has(k)&&opts[k]===undefined,'UNKNOWN_OR_DUPLICATE_FLAG');
  const v=args[++i];check(!!v&&!v.startsWith('--'),'MISSING_VALUE');
  opts[k]=v;
 }
 check(!!opts['--model']&&!!opts['--out'],'MODEL_AND_OUTPUT_REQUIRED');
 const strict=(v,exp,why)=>{check(exp.test(v),why);return Number(v)};
 const port=strict(opts['--port']??'11434',/^[0-9]{2,5}$/,'INVALID_LOCAL_PORT');
 check(port>=1&&port<=65535,'INVALID_LOCAL_PORT');
 return {
  model:opts['--model'],outDir:path.resolve(opts['--out']),
  port,
  timeoutSeconds:strict(opts['--timeout-seconds']??'60',
   /^(?:1[5-9]|[2-9][0-9]|1[01][0-9]|120)$/,'INVALID_WAIT')};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=parseB198RArgs(process.argv.slice(2));
  if(a.help)console.log('node scripts/b198r-local-diagnostic.mjs --model EXACT_INSTALLED_ID --out NEW_JSON [--port 11434] [--timeout-seconds 15..120]');
  else{
   check(!fs.existsSync(a.outDir),'OUTPUT_ALREADY_EXISTS');
   check(fs.existsSync(path.dirname(a.outDir)),'OUTPUT_PARENT_MISSING');
   const result=await runB198RDiagnostic(a);
   fs.writeFileSync(a.outDir,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
   console.log('B198R_DIAGNOSE_FINISHED',JSON.stringify({
    status:result.status,model:result.requestedModel,elapsedMs:result.elapsedMs,
    generatedTokens:result.telemetry.generatedTokens,
    tokensPerSecond:result.telemetry.generatedTokensPerSecond,
    vramBytes:result.modelResidency.vramBytes,
    output:a.outDir,modelQualityCertified:false,worldWrites:0}));
  }
 }catch(e){
  console.error('B198R_HOLD',err(e));process.exitCode=1;
 }
}
