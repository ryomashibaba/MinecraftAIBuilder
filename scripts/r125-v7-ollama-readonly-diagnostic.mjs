#!/usr/bin/env node
/**
 * PUBLIC, READ-ONLY V7 diagnostic for a user-authorized Windows environment.
 * Reports only allowlisted numeric status and whether qwen3:14b is listed or
 * already loaded. Does not publish model inventories, user paths or raw errors.
 * Never loads a model, sends POST, changes host settings, imports PRIVATE code,
 * writes files, contacts Minecraft or authorizes model inference / world writes.
 * This does NOT establish a calibrated inference-memory peak.
 *
 * Usage: node scripts/r125-v7-ollama-readonly-diagnostic.mjs
 *        node scripts/r125-v7-ollama-readonly-diagnostic.mjs --selftest
 * A HOLD exit code (2) is intentional; it is never a model-run permit.
 */
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const MODEL='qwen3:14b';
const ORIGIN='http://127.0.0.1:11434';
const SCHEMA='minecraftaibuilder-r125-v7-public-readonly-diagnostic-v1';
const MiB=1048576;
const safeInt=n=>Number.isSafeInteger(n)&&n>=0?n:null;

function safeReport(){
 return {
  schema:SCHEMA,status:'HOLD',reason:'NOT_STARTED',
  windowsRuntime:false,modelRequested:MODEL,
  ollamaTagsStatus:'NOT_CHECKED',ollamaPsStatus:'NOT_CHECKED',
  port11434Listening:null,modelListed:null,modelAlreadyLoaded:null,
  physicalMemory:{totalMiB:null,availableMiB:null},
  commitMemory:{committedMiB:null,limitMiB:null,headroomMiB:null},
  graphics:{gpuCount:null,minimumFreeMiB:null,minimumTotalMiB:null},
  alreadyLoadedModel:{sizeMiB:null,sizeVramMiB:null,contextLength:null},
  memoryPeakCalibrated:false,resourceSafetyCertified:false,
  modelGenerationAttempts:0,modelLoadAttempts:0,paidApiCalls:0,
  privateEngineImported:false,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')
 };
}
function runCommand(program,args){
 return execFileSync(program,args,{encoding:'utf8',timeout:12000,windowsHide:true,
  maxBuffer:200000,stdio:['ignore','pipe','ignore']}).trim();
}
const powershell=command=>runCommand('powershell.exe',[
 '-NoProfile','-NonInteractive','-Command',command]);

function transportReason(error){
 const c=error?.cause?.code??error?.code;
 if(['EPERM','EACCES','ERR_ACCESS_DENIED','WSAEACCES'].includes(c))
  return 'PERMISSION_DENIED';
 if(['ECONNREFUSED','WSAECONNREFUSED'].includes(c))
  return 'CONNECTION_REFUSED';
 if(['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT'].includes(c)||
  error?.name==='AbortError'||error?.name==='TimeoutError')return 'TIMEOUT';
 if(['ENOTFOUND','EHOSTUNREACH','ENETUNREACH'].includes(c))
  return 'NETWORK_UNREACHABLE';
 return 'TRANSPORT_UNKNOWN';
}
async function getOllama(pathname,fetcher=fetch){
 if(pathname!=='/api/tags'&&pathname!=='/api/ps')
  throw Error('READ_ONLY_GET_PATH_REQUIRED');
 try{
  const response=await fetcher(ORIGIN+pathname,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(6000),headers:{Accept:'application/json'}});
  if(response?.ok!==true)return {status:'HTTP_ERROR',data:null};
  const length=response.headers?.get?.('content-length');
  if(length!==null&&length!==undefined&&Number(length)>500000)
   return {status:'RESPONSE_TOO_LARGE',data:null};
  const raw=await response.text();
  if(typeof raw!=='string'||raw.length>500000)
   return {status:'RESPONSE_TOO_LARGE',data:null};
  let data;
  try{data=JSON.parse(raw);}catch{return {status:'INVALID_JSON',data:null};}
  if(!Array.isArray(data?.models)||data.models.length>1000||
   data.models.some(x=>typeof x?.name!=='string'))
   return {status:'INVALID_SCHEMA',data:null};
  return {status:'OK',data};
 }catch(e){return {status:transportReason(e),data:null};}
}
function listenerStatus(){
 try{
  const script='$c=@(Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction Stop);'+
   'Write-Output $c.Count';
  const n=Number(powershell(script));
  return Number.isSafeInteger(n)&&n>=0?n>0:null;
 }catch{return null;}
}
function sampleResources(report){
 const total=safeInt(Math.floor(os.totalmem()/MiB));
 const free=safeInt(Math.floor(os.freemem()/MiB));
 report.physicalMemory={totalMiB:total,availableMiB:free};
 try{
  const script='$m=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory -ErrorAction Stop;'+
   '@{Used=[string]$m.CommittedBytes;Limit=[string]$m.CommitLimit} | ConvertTo-Json -Compress';
  const v=JSON.parse(powershell(script));
  const used=safeInt(Number(v.Used)),limit=safeInt(Number(v.Limit));
  if(used!==null&&limit!==null&&limit>=used){
   report.commitMemory={committedMiB:Math.floor(used/MiB),
    limitMiB:Math.floor(limit/MiB),headroomMiB:Math.floor((limit-used)/MiB)};
  }
 }catch{/* The unknown commit headroom stays null. */}
 try{
  const data=runCommand('nvidia-smi.exe',[
   '--query-gpu=memory.total,memory.free','--format=csv,noheader,nounits']);
  const cards=data.split(/\r?\n/).map(row=>row.split(',').map(v=>Number(v.trim())));
  if(cards.length>0&&cards.every(c=>c.length===2&&c.every(Number.isFinite)&&
   c[0]>0&&c[1]>=0&&c[1]<=c[0])){
   report.graphics={gpuCount:cards.length,
    minimumFreeMiB:Math.floor(Math.min(...cards.map(c=>c[1]))),
    minimumTotalMiB:Math.floor(Math.min(...cards.map(c=>c[0])))};
  }
 }catch{/* The unknown GPU free capacity stays null. */}
}
function classify(report){
 if(report.ollamaTagsStatus!=='OK'||report.ollamaPsStatus!=='OK')
  return 'OLLAMA_GET_NOT_VERIFIED';
 if(report.modelListed!==true)return 'MODEL_NOT_LISTED';
 return 'MODEL_INFERENCE_PEAK_UNCALIBRATED';
}
function selftest(){
 assert.equal(transportReason({cause:{code:'EACCES'}}),'PERMISSION_DENIED');
 assert.equal(transportReason({cause:{code:'ECONNREFUSED'}}),'CONNECTION_REFUSED');
 assert.equal(transportReason({name:'TimeoutError'}),'TIMEOUT');
 assert.equal(transportReason({cause:{code:'ENETUNREACH'}}),'NETWORK_UNREACHABLE');
 const a=safeReport();
 assert.equal(a.resourceSafetyCertified,false);
 assert.deepEqual(a.gates,Array(9).fill('BLOCKED'));
 assert.equal(a.modelGenerationAttempts,0);
 assert.equal(a.BuildPlan.operations.length,0);
 assert.equal(classify(a),'OLLAMA_GET_NOT_VERIFIED');
 return Promise.all(['/api/tags','/api/ps'].map(path=>getOllama(path,async(url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.equal(url,ORIGIN+path);
  return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({models:[{name:MODEL}]})};
 }))).then(([tags,ps])=>{
  assert.equal(tags.status,'OK');assert.equal(ps.status,'OK');
  console.log('SELFTEST_PASS: GET-only transport, HOLD-only report, 9 BLOCKED');
 });
}
async function main(){
 if(process.argv.length===3&&process.argv[2]==='--selftest')
  return selftest();
 const report=safeReport();
 if(process.argv.length!==2){report.reason='UNSUPPORTED_ARGUMENTS';
  console.log(JSON.stringify(report,null,2));process.exitCode=2;return;}
 if(process.platform!=='win32'){
  report.reason='WINDOWS_RUNTIME_REQUIRED';
  console.log(JSON.stringify(report,null,2));process.exitCode=2;return;
 }
 report.windowsRuntime=true;
 sampleResources(report);
 report.port11434Listening=listenerStatus();
 const [tags,ps]=await Promise.all([getOllama('/api/tags'),getOllama('/api/ps')]);
 report.ollamaTagsStatus=tags.status;
 report.ollamaPsStatus=ps.status;
 if(tags.status==='OK')report.modelListed=tags.data.models.some(x=>x.name===MODEL);
 if(ps.status==='OK'){
  const item=ps.data.models.find(x=>x.name===MODEL);
  report.modelAlreadyLoaded=Boolean(item);
  if(item){
   const size=safeInt(Number(item.size)),vram=safeInt(Number(item.size_vram));
   report.alreadyLoadedModel={sizeMiB:size===null?null:Math.floor(size/MiB),
    sizeVramMiB:vram===null?null:Math.floor(vram/MiB),
    contextLength:safeInt(item.context_length)};
  }
 }
 report.reason=classify(report);
 report.status='HOLD';report.resourceSafetyCertified=false;
 console.log(JSON.stringify(report,null,2));
 process.exitCode=2;
}
await main().catch(()=>{
 const report=safeReport();report.reason='DIAGNOSTIC_FAILED';
 console.log(JSON.stringify(report,null,2));process.exitCode=2;
});
