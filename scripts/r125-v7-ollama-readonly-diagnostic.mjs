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
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const MODEL='qwen3:14b';
const ORIGIN='http://127.0.0.1:11434';
const SCHEMA='minecraftaibuilder-r125-v7-public-readonly-diagnostic-v1';
const MiB=1048576;
const HISTORICAL_MANIFEST_SHA='bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8';
const QWEN3_TEMPLATE_SHA='ae370d884f108d16e7cc8fd5259ebc5773a0afa6e078b11f4ed7e39a27e0dfc4';
const digest=b=>createHash('sha256').update(b).digest('hex');
const safeInt=n=>Number.isSafeInteger(n)&&n>=0?n:null;

function safeReport(){
 return {
  schema:SCHEMA,status:'HOLD',reason:'NOT_STARTED',
  windowsRuntime:false,modelRequested:MODEL,
  ollamaTagsStatus:'NOT_CHECKED',ollamaPsStatus:'NOT_CHECKED',
  port11434Listening:null,modelListed:null,modelAlreadyLoaded:null,
  listedModelMetadata:{reportedDiskSizeMiB:null,reportedDigest:null,
   format:null,family:null,parameterSize:null,quantizationLevel:null},
  physicalMemory:{totalMiB:null,availableMiB:null},
  commitMemory:{committedMiB:null,limitMiB:null,headroomMiB:null},
  graphics:{gpuCount:null,minimumFreeMiB:null,minimumTotalMiB:null},
  alreadyLoadedModel:{sizeMiB:null,sizeVramMiB:null,contextLength:null},
  installedTemplate:{status:'NOT_CHECKED',matchesPinned:null,
   ggufTokenizerVerified:false,ollamaRuntimeVerified:false},
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
// All fields are allowlisted from Ollama GET /api/tags only.
// Disk size and quantization identify a model, NOT its inference-memory peak.
function listedMetadata(item){
 const ascii=(v,re)=>typeof v==='string'&&re.test(v)?v:null;
 const detail=item?.details&&typeof item.details==='object'&&
  !Array.isArray(item.details)?item.details:{};
 const size=safeInt(item?.size);
 return {
  reportedDiskSizeMiB:size===null?null:Math.floor(size/MiB),
  reportedDigest:ascii(item?.digest,/^[a-f0-9]{64}$/i),
  format:ascii(detail.format,/^[a-zA-Z0-9_.-]{1,40}$/),
  family:ascii(detail.family,/^[a-zA-Z0-9_.-]{1,40}$/),
  parameterSize:ascii(detail.parameter_size,/^[a-zA-Z0-9_.+-]{1,32}$/),
  quantizationLevel:ascii(detail.quantization_level,/^[a-zA-Z0-9_.+-]{1,32}$/)
 };
}
// Only the qwen3:14b Ollama manifest and its small TEMPLATE blob are read.
// No GGUF model weights or directory traversal; never reveals local paths.
function templateMatches(manifest,template,expectedManifest,expectedTemplate){
 if(!Buffer.isBuffer(manifest)||!Buffer.isBuffer(template)||
  manifest.length>65536||template.length>65536||
  manifest.length<100||template.length<50)return false;
 let obj;
 try{obj=JSON.parse(manifest.toString('utf8'));}
 catch{return false;}
 const templates=obj?.layers?.filter(x=>
  x?.mediaType==='application/vnd.ollama.image.template');
 if(!Array.isArray(obj?.layers)||!Array.isArray(templates)||
  templates.length!==1||!Number.isSafeInteger(templates[0].size)||
  templates[0].size!==template.length||
  typeof templates[0].digest!=='string'||
  !/^sha256:[a-f0-9]{64}$/.test(templates[0].digest))return false;
 return digest(manifest)===expectedManifest &&
  templates[0].digest==='sha256:'+expectedTemplate &&
  digest(template)===expectedTemplate;
}
function readSmall(file){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.size<1||st.size>65536)throw Error('NOT_SMALL_REGULAR_FILE');
 const data=fs.readFileSync(file);
 if(data.length!==st.size||data.length>65536)throw Error('FILE_CHANGED');
 return data;
}
function inspectLocalTemplate(){
 const unavailable={status:'UNKNOWN_OR_CHANGED',matchesPinned:null,
  ggufTokenizerVerified:false,ollamaRuntimeVerified:false};
 try{
  const root=process.env.OLLAMA_MODELS??path.join(os.homedir(),'.ollama','models');
  if(typeof root!=='string'||!path.isAbsolute(root))return unavailable;
  const manifest=readSmall(path.join(root,'manifests','registry.ollama.ai',
   'library','qwen3','14b'));
  if(digest(manifest)!==HISTORICAL_MANIFEST_SHA)
   return {...unavailable,matchesPinned:false};
  const parsed=JSON.parse(manifest.toString('utf8'));
  const templates=parsed?.layers?.filter(x=>
   x?.mediaType==='application/vnd.ollama.image.template');
  if(!Array.isArray(templates)||templates.length!==1||
   typeof templates[0].digest!=='string'||
   !/^sha256:[a-f0-9]{64}$/.test(templates[0].digest))
   return {...unavailable,matchesPinned:false};
  const blob=readSmall(path.join(root,'blobs',
   'sha256-'+templates[0].digest.slice(7)));
  const match=templateMatches(manifest,blob,
   HISTORICAL_MANIFEST_SHA,QWEN3_TEMPLATE_SHA);
  return {status:match?'PINNED_TEMPLATE_MATCH_READONLY':'TEMPLATE_MISMATCH_HOLD',
   matchesPinned:match,ggufTokenizerVerified:false,ollamaRuntimeVerified:false};
 }catch{return unavailable;}
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
 const fakeTemplate=Buffer.from('Qwen3 legacy template test'.repeat(4));
 const fakeManifest={schemaVersion:2,
  layers:[{mediaType:'application/vnd.ollama.image.model',
   digest:'sha256:'+'a'.repeat(64),size:9000000000},
   {mediaType:'application/vnd.ollama.image.template',
    digest:'sha256:'+digest(fakeTemplate),size:fakeTemplate.length}]};
 const manifestBytes=Buffer.from(JSON.stringify(fakeManifest));
 assert.equal(templateMatches(manifestBytes,fakeTemplate,
  digest(manifestBytes),digest(fakeTemplate)),true);
 assert.equal(templateMatches(manifestBytes,fakeTemplate,
  '0'.repeat(64),digest(fakeTemplate)),false);
 assert.equal(templateMatches(manifestBytes,fakeTemplate,
  digest(manifestBytes),'f'.repeat(64)),false);
 assert.equal(templateMatches(manifestBytes,
  Buffer.concat([fakeTemplate,Buffer.from('X')]),
  digest(manifestBytes),digest(fakeTemplate)),false);
 assert.equal(safeReport().installedTemplate.status,'NOT_CHECKED');
 assert.equal(a.resourceSafetyCertified,false);
 assert.deepEqual(a.gates,Array(9).fill('BLOCKED'));
 assert.equal(a.modelGenerationAttempts,0);
 assert.equal(a.BuildPlan.operations.length,0);
 assert.equal(classify(a),'OLLAMA_GET_NOT_VERIFIED');
 const meta=listedMetadata({size:9608350245,digest:'a'.repeat(64),
  details:{format:'gguf',family:'qwen3',parameter_size:'14.8B',quantization_level:'Q4_K_M'}});
 assert.equal(meta.reportedDiskSizeMiB,Math.floor(9608350245/MiB));
 assert.equal(meta.parameterSize,'14.8B');
 assert.equal(meta.quantizationLevel,'Q4_K_M');
 assert.equal(meta.reportedDigest,'a'.repeat(64));
 assert.equal(listedMetadata({size:-1,details:{quantization_level:'invalid\\nvalue'}}).reportedDiskSizeMiB,null);
 assert.equal(listedMetadata({size:-1,details:{quantization_level:'invalid\\nvalue'}}).quantizationLevel,null);
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
 report.installedTemplate=inspectLocalTemplate();
 report.port11434Listening=listenerStatus();
 const [tags,ps]=await Promise.all([getOllama('/api/tags'),getOllama('/api/ps')]);
 report.ollamaTagsStatus=tags.status;
 report.ollamaPsStatus=ps.status;
 if(tags.status==='OK'){
  const item=tags.data.models.find(x=>x.name===MODEL);
  report.modelListed=Boolean(item);
  if(item)report.listedModelMetadata=listedMetadata(item);
 }
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
