#!/usr/bin/env node
/**
 * Qwen3:14b no-generation LOAD-ONLY observation (explicit opt-in).
 * Never infer/authorize runtime inference safety from preload-only samples.
 * Never imports PRIVATE sources, accesses Minecraft, or calls paid APIs.
 * An approved Work operator must provide:
 * MAB_V7_LOAD_ONLY_APPROVED=1, MAB_EXPECTED_QWEN_DIGEST=<64 hex>,
 * MAB_PRIOR_QWEN_VRAM_BYTES=<prior size_vram> and --load-only.
 * No arguments is a HOLD. --selftest is offline and does not contact Ollama.
 * The only POSTs are empty-prompt /api/generate preload and unload.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {checkExactHeadCi} from './r125-v4j-safe-ci-gate.mjs';

const MODEL='qwen3:14b',URL='http://127.0.0.1:11434',MiB=1048576;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BRANCH='feature/b198zr1-protected-architectural-revision';
const HOLD=()=>({schema:'mab-v9-qwen14b-preload-only-v1',status:'HOLD',
 reason:'NOT_STARTED',headVerified:false,ciVerified:false,modelVerified:false,
 preloadCalls:0,unloadCalls:0,modelGenerationAttempts:0,
 nonemptyModelResponse:false,unloadedVerified:false,preloadSamples:0,
 memoryAtStart:null,minimumObserved:null,contextRequested:2048,
 contextObserved:null,inferencePeakCalibrated:false,resourceSafetyCertified:false,
 worldContacts:0,worldWrites:0,paidApiCalls:0,readiness:'NOT_PREPARED',
 constructionApproved:false,executionAllowed:false,
 BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')});
const safeInteger=n=>Number.isSafeInteger(n)&&n>=0;
function command(bin,args){
 return execFileSync(bin,args,{encoding:'utf8',timeout:12000,windowsHide:true,
  stdio:['ignore','pipe','ignore'],maxBuffer:200000}).trim();
}
function head(){
 const pre=['-C',ROOT];
 const branch=command('git.exe',[...pre,'branch','--show-current']);
 const clean=command('git.exe',[...pre,'status','--porcelain=v1',
  '--untracked-files=normal','--ignore-submodules=none']);
 const sha=command('git.exe',[...pre,'rev-parse','HEAD']);
 if(branch!==BRANCH||clean!==''||!/^[a-f0-9]{40}$/.test(sha))
  throw Error('RESEARCH_CLONE_NOT_CLEAN');
 return sha;
}
function snapshot(){
 const q=command('nvidia-smi.exe',['--query-gpu=memory.total,memory.used,memory.free',
  '--format=csv,noheader,nounits']).split(/\r?\n/);
 if(q.length!==1)throw Error('ONE_NVIDIA_GPU_REQUIRED');
 const gpu=q[0].split(',').map(x=>Number(x.trim()));
 if(gpu.length!==3||gpu.some(x=>!safeInteger(x))||
  gpu[0]<gpu[1]||gpu[0]<gpu[2])throw Error('GPU_UNKNOWN');
 const script='$m=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop;'+
  '@{Used=[string]$m.CommittedBytes;Limit=[string]$m.CommitLimit}|ConvertTo-Json -Compress';
 const c=JSON.parse(command('powershell.exe',['-NoProfile','-NonInteractive',
  '-Command',script]));
 const used=Number(c.Used),limit=Number(c.Limit);
 if(!safeInteger(used)||!safeInteger(limit)||limit<used)
  throw Error('COMMIT_UNKNOWN');
 return {freeRamMiB:Math.floor(os.freemem()/MiB),
  freeGpuMiB:Math.floor(gpu[2]),
  usedGpuMiB:Math.floor(gpu[1]),
  commitHeadroomMiB:Math.floor((limit-used)/MiB)};
}
function allowed(v,priorMiB,pre){
 return v&&v.freeRamMiB>=(pre?9216:5120)&&
  v.commitHeadroomMiB>=(pre?16384:8192)&&
  v.freeGpuMiB>=(pre?priorMiB+3072:2560);
}
function minimum(min,v){
 return min?{
  freeRamMiB:Math.min(min.freeRamMiB,v.freeRamMiB),
  freeGpuMiB:Math.min(min.freeGpuMiB,v.freeGpuMiB),
  commitHeadroomMiB:Math.min(min.commitHeadroomMiB,v.commitHeadroomMiB),
  usedGpuMiBMaximum:Math.max(min.usedGpuMiBMaximum,v.usedGpuMiB)
 }:{freeRamMiB:v.freeRamMiB,freeGpuMiB:v.freeGpuMiB,
  commitHeadroomMiB:v.commitHeadroomMiB,usedGpuMiBMaximum:v.usedGpuMiB};
}
async function get(route){
 if(route!=='/api/tags'&&route!=='/api/ps')throw Error('UNSUPPORTED_GET');
 const res=await fetch(URL+route,{method:'GET',redirect:'error',
  signal:AbortSignal.timeout(7500)});
 if(!res.ok)throw Error('LOCAL_GET_FAILED');
 const raw=await res.text();
 if(raw.length>500000)throw Error('LOCAL_GET_TOO_LARGE');
 const json=JSON.parse(raw);
 if(!Array.isArray(json.models)||json.models.length>1000)
  throw Error('LOCAL_GET_INVALID');
 return json.models;
}
async function emptyRequest(unload,signal){
 const body={model:MODEL,prompt:'',stream:false,keep_alive:unload?0:35};
 if(!unload)body.options={num_ctx:2048};
 const res=await fetch(URL+'/api/generate',{method:'POST',redirect:'error',
  headers:{'Content-Type':'application/json'},signal,
  body:JSON.stringify(body)});
 if(!res.ok)throw Error('PRELOAD_HTTP_FAILED');
 const raw=await res.text();
 if(raw.length>10000)throw Error('PRELOAD_RESPONSE_TOO_LARGE');
 return JSON.parse(raw);
}
async function verifyHead(){
 const sha=head();
 if(!(await checkExactHeadCi(sha)).safeToRunModel)throw Error('CI_HOLD');
 return sha;
}
function selftest(){
 const previous=11141;
 assert(allowed({freeRamMiB:12000,freeGpuMiB:16000,
  commitHeadroomMiB:20000},previous,true));
 assert(!allowed({freeRamMiB:12000,freeGpuMiB:12000,
  commitHeadroomMiB:20000},previous,true));
 assert(!allowed({freeRamMiB:3000,freeGpuMiB:16000,
  commitHeadroomMiB:20000},previous,false));
 assert.deepEqual(HOLD().gates,Array(9).fill('BLOCKED'));
 assert.equal(HOLD().inferencePeakCalibrated,false);
 console.log('SELFTEST_PASS: load-only, guarded, fail-closed');
}
async function main(){
 if(process.argv.length===3&&process.argv[2]==='--selftest')return selftest();
 const r=HOLD();
 let issued=false,privateDir=null;
 try{
  if(process.argv.length!==3||process.argv[2]!=='--load-only'||
    process.env.MAB_V7_LOAD_ONLY_APPROVED!=='1')
   throw Error('LOAD_ONLY_OPT_IN_REQUIRED');
  if(process.platform!=='win32'||!process.env.LOCALAPPDATA)
   throw Error('WINDOWS_PRIVATE_HOST_REQUIRED');
  const digest=process.env.MAB_EXPECTED_QWEN_DIGEST;
  const rawPrior=process.env.MAB_PRIOR_QWEN_VRAM_BYTES;
  if(!/^[a-f0-9]{64}$/.test(digest??'')||
   !/^[1-9]\d{6,14}$/.test(rawPrior??''))throw Error('MODEL_EVIDENCE_REQUIRED');
  const prior=Number(rawPrior);
  if(!safeInteger(prior)||prior<MiB*1000||prior>MiB*25000)
   throw Error('VRAM_EVIDENCE_INVALID');
  const priorMiB=Math.ceil(prior/MiB);
  const sha=await verifyHead();r.headVerified=true;r.ciVerified=true;
  const [tags,ps]=await Promise.all([get('/api/tags'),get('/api/ps')]);
  const model=tags.find(x=>x.name===MODEL);
  if(!model||model.digest!==digest||model.details?.family!=='qwen3'||
    model.details?.quantization_level!=='Q4_K_M'||
    model.details?.parameter_size!=='14.8B')
   throw Error('MODEL_IDENTITY_MISMATCH');
  if(ps.length!==0)throw Error('ANOTHER_MODEL_ALREADY_LOADED');
  r.modelVerified=true;
  const before=snapshot();r.memoryAtStart=before;
  if(!allowed(before,priorMiB,true))throw Error('PRELOAD_RESERVE_LOW');
  // Revalidate clone/CI/contending models/physical capacity before POST.
  if(await verifyHead()!==sha||(await get('/api/ps')).length!==0)
   throw Error('PRELOAD_STATE_CHANGED');
  if(!allowed(snapshot(),priorMiB,true))throw Error('PRELOAD_RESERVE_CHANGED');
  const parent=path.join(process.env.LOCALAPPDATA,'MinecraftAIBuilder','PrivateModelStudies');
  fs.mkdirSync(parent,{recursive:true});
  privateDir=path.join(parent,'V9_LOAD_ONLY_'+randomUUID());
  fs.mkdirSync(privateDir,{recursive:false});
  const controller=new AbortController();
  r.preloadCalls++;issued=true;
  let finished=false,loaded=null;
  const request=emptyRequest(false,controller.signal).then(x=>{
   loaded={ok:true,data:x};finished=true;
  }).catch(()=>{loaded={ok:false};finished=true;});
  const started=Date.now();
  while(!finished&&Date.now()-started<90000){
   const sample=snapshot();
   r.minimumObserved=minimum(r.minimumObserved,sample);r.preloadSamples++;
   if(!allowed(sample,priorMiB,false)){
    r.reason='MEMORY_GUARD_TRIGGERED';controller.abort();break;
   }
   await new Promise(resolve=>setTimeout(resolve,750));
  }
  if(!finished){controller.abort();if(r.reason==='NOT_STARTED')r.reason='PRELOAD_TIMEOUT';}
  await Promise.race([request,new Promise(resolve=>setTimeout(resolve,5000))]);
  if(loaded?.ok&&r.reason==='NOT_STARTED'){
   const response=loaded.data;
   r.nonemptyModelResponse=response?.response!==''||
    (Number(response?.eval_count)||0)>0;
   if(r.nonemptyModelResponse)throw Error('NONEMPTY_RESPONSE_HOLD');
   const present=(await get('/api/ps')).find(x=>x.name===MODEL);
   if(!present)throw Error('LOADED_MODEL_NOT_FOUND');
   r.contextObserved=present.context_length??null;
   if(r.contextObserved!==2048)throw Error('CONTEXT_NOT_CONFIRMED');
   const until=Date.now()+5000;
   while(Date.now()<until){
    const v=snapshot();
    r.minimumObserved=minimum(r.minimumObserved,v);r.preloadSamples++;
    if(!allowed(v,priorMiB,false))throw Error('MEMORY_GUARD_TRIGGERED');
    await new Promise(resolve=>setTimeout(resolve,750));
   }
   r.reason='PRELOAD_OBSERVED_INFERENCE_PEAK_UNCALIBRATED';
  }
 }catch(e){
  if(r.reason==='NOT_STARTED'){
   const m=String(e?.message??'');
   const codes=['LOAD_ONLY_OPT_IN_REQUIRED','WINDOWS_PRIVATE_HOST_REQUIRED',
    'MODEL_EVIDENCE_REQUIRED','VRAM_EVIDENCE_INVALID','RESEARCH_CLONE_NOT_CLEAN',
    'CI_HOLD','MODEL_IDENTITY_MISMATCH','ANOTHER_MODEL_ALREADY_LOADED',
    'PRELOAD_RESERVE_LOW','PRELOAD_STATE_CHANGED','PRELOAD_RESERVE_CHANGED',
    'NONEMPTY_RESPONSE_HOLD','LOADED_MODEL_NOT_FOUND','CONTEXT_NOT_CONFIRMED',
    'MEMORY_GUARD_TRIGGERED'];
   r.reason=codes.includes(m)?m:'UNVERIFIED_OR_FAILED_HOLD';
  }
 }finally{
  if(issued){
   r.unloadCalls++;
   try{
    await emptyRequest(true,AbortSignal.timeout(15000));
    r.unloadedVerified=!(await get('/api/ps')).some(m=>m.name===MODEL);
    if(!r.unloadedVerified)r.reason='UNLOAD_UNVERIFIED';
   }catch{r.reason='UNLOAD_UNVERIFIED';}
  }
  // PRIVATE output only; public stdout contains no paths, digests or inventory.
  if(privateDir)try{
   fs.writeFileSync(path.join(privateDir,'PRIVATE_LOAD_ONLY.json'),
    JSON.stringify(r,null,2)+'\n',{flag:'wx'});
  }catch{r.reason='PRIVATE_EVIDENCE_WRITE_HOLD';}
  console.log(JSON.stringify({status:'HOLD',reason:r.reason,
   preloadCalls:r.preloadCalls,unloadCalls:r.unloadCalls,
   unloadedVerified:r.unloadedVerified,observedSamples:r.preloadSamples,
   generationAttempts:0,inferencePeakCalibrated:false,
   resourceSafetyCertified:false,worldWrites:0,gates:Array(9).fill('BLOCKED')}));
  process.exitCode=2;
 }
}
await main();
