/**
 * Owned, one-request lifecycle for the actual R125 ArchitecturePlan runner.
 * The existing resource sensor is an observation source, not calibration:
 * without an external, model-specific clearance this entry point always HOLDs
 * before the ArchitecturePlan runner can create output or issue a POST.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {randomBytes,createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runR125LocalArchitecturePlan,acquireLocalTrialLock,ensurePrivateNewDirectory} from './r125-local-architecture-plan-run.mjs';
import {createR125ArchitecturePlanLocalAdapter} from '../source/ai/b198g-local-model-adapter.mjs';
import {checkExactHeadCi} from './r125-v4j-safe-ci-gate.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OWNER=path.join(ROOT,'scripts/r125-windows-owned-process.py');
const SENSOR=path.join(ROOT,'scripts/research/r125-gatec-v3-1-stale-only.py');
const BRANCH='research/r125-v6-readonly-facade-diagnostic-20261111';
const HEAD_RE=/^[a-f0-9]{40}$/;
const NONCE_RE=/^[a-f0-9]{32}$/;
const MODEL='qwen3:14b';
const MODEL_DIGEST='bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8';
const MODEL_SIZE=9276198565;
const ARCHPLAN_REQUEST_SHA256='bf9185c8cb9de22480a11bcea19a83005a355627ef96f7c02f2168cd9d541844';
const PORT=11435;
export const CONTEXT_LENGTH=16384;
export const MAX_OUTPUT_TOKENS=4096;
const RESOURCE_FLOORS={pre:{ram:8192,commit:16384,gpu:14214},
 during:{ram:5120,commit:8192,gpu:2560}};
const RESOURCE_MARGIN_MIB=1024;
const SAMPLE_KEYS=['ramFreeMiB','commitHeadroomMiB','gpuTotalMiB','gpuFreeMiB','sampleMs'];
const hold=(reason,extra={})=>({schema:'r125-owned-architecture-plan-v1',
 status:'HOLD',reason,model:'qwen3:14b',modelPostCount:0,automaticRetries:0,
 worldContacts:0,worldWrites:0,constructionApproved:false,executionAllowed:false,
 BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),...extra});
const int=x=>Number.isSafeInteger(x)&&x>=0;
export const hasExited=child=>child!==null&&
 (child.exitCode!==null||child.signalCode!==null);

export function verifyOwnedArchitectureSample({session,sample,owner,headSha,
 previousSequence=0,now=Date.now()}={}){
 const d=sample?.data;
 if(!HEAD_RE.test(headSha??'')||!NONCE_RE.test(session?.nonce??'')||
    !Number.isSafeInteger(session?.monitorPid)||session.monitorPid<=0||
    sample?.nonce!==session.nonce||sample?.pid!==session.monitorPid||
    sample?.state!=='ALIVE'||!Number.isSafeInteger(sample?.seq)||
    sample.seq<=previousSequence||!d||!SAMPLE_KEYS.every(k=>int(d[k]))||
    d.gpuTotalMiB<=0||d.gpuFreeMiB>d.gpuTotalMiB||
    now<d.sampleMs||now-d.sampleMs>3000||
    owner?.port!==PORT||!Number.isSafeInteger(owner?.servicePid)||owner.servicePid<=0||
    owner?.killOnCloseJob!==true||!Number.isSafeInteger(owner?.supervisorPid)||
    owner.supervisorPid<=0)
  return {status:'HOLD',reason:'OWNED_SENSOR_OR_PROCESS_IDENTITY_UNVERIFIED',
   resourceSafetyCertified:false};
 return {status:'HOLD',reason:'QWEN_PEAK_CALIBRATION_REQUIRED',
  resourceSafetyCertified:false,independentMonitorActive:true,
  monitorId:session.nonce,monitorPid:session.monitorPid,
  monitorHeartbeatEpochMs:d.sampleMs,monitorSequence:sample.seq,
  ownedServicePort:PORT,ownedServicePid:owner.servicePid,
  ownedServiceInKillOnCloseJob:true,supervisorPid:owner.supervisorPid,
  sharedServiceIdle:null,measuredAtEpochMs:d.sampleMs,
  observedResourcesMiB:{ramFree:d.ramFreeMiB,
   commitHeadroom:d.commitHeadroomMiB,gpuFree:d.gpuFreeMiB,
   gpuTotal:d.gpuTotalMiB}};
}

function readJson(file,maxBytes=8192){
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<=0||stat.size>maxBytes)throw Error('SAMPLE_SIZE');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function removeOwnedTempDir(dir){
 const resolved=path.resolve(dir),tempRoot=path.resolve(os.tmpdir());
 if(path.dirname(resolved)!==tempRoot||
    !path.basename(resolved).startsWith('mab-r125-owned-')||
    fs.realpathSync(resolved)!==resolved)
  throw Error('OWNED_TEMP_PATH_BOUNDARY');
 fs.rmSync(resolved,{recursive:true,force:true});
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** Start only a fresh owned server on 127.0.0.1:11435 and a separate sensor. */
export async function createWindowsOwnedOllamaController({
 pythonExe,ollamaExe,expectedHead,repoRoot=ROOT,now=()=>Date.now(),
 spawnProcess=spawn
}={}){
 if(process.platform!=='win32'||!path.isAbsolute(pythonExe??'')||
    !path.isAbsolute(ollamaExe??'')||!HEAD_RE.test(expectedHead??''))
  throw Error('WINDOWS_OWNED_CONFIGURATION_REQUIRED');
 const opts={encoding:'utf8',timeout:10000,windowsHide:true};
 const head=execFileSync('git.exe',['-C',repoRoot,'rev-parse','HEAD'],opts).trim();
 const branch=execFileSync('git.exe',['-C',repoRoot,'branch','--show-current'],opts).trim();
 const dirty=execFileSync('git.exe',['-C',repoRoot,'status','--porcelain=v1',
  '--untracked-files=normal'],opts);
 if(head!==expectedHead||branch!==BRANCH||dirty!=='')
  throw Error('PINNED_CLEAN_RESEARCH_HEAD_REQUIRED');
 if(!fs.statSync(pythonExe).isFile()||!fs.statSync(ollamaExe).isFile())
  throw Error('DIRECT_EXECUTABLE_REQUIRED');
 const ollamaExecutableSha256=createHash('sha256').update(fs.readFileSync(ollamaExe)).digest('hex');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-r125-owned-'));
 const nonce=randomBytes(16).toString('hex');
 const sessionFile=path.join(dir,'session.json');
 const sampleFile=path.join(dir,'sample.json');
 fs.writeFileSync(sessionFile,JSON.stringify({nonce,headSha:head,
  ownedCalibration:true}),{flag:'wx'});
 let monitor=null,owner=null,lines=null,ownerQueue=[],ownerWaiters=[];
  let service=null,stopped=false,sequence=0,ownerStopAck=false;
 const pushLine=value=>{
  try{
   const message=JSON.parse(value);
   if(message.status==='OWNED_OLLAMA_STOPPED'&&message.jobClosed===true&&
      message.pid===service?.servicePid)ownerStopAck=true;
  }catch{}
  const waiter=ownerWaiters.shift();
  if(waiter)waiter.resolve(value);else ownerQueue.push(value);
 };
 const nextLine=(ms=10000)=>new Promise((resolve,reject)=>{
  if(ownerQueue.length)return resolve(ownerQueue.shift());
  const timer=setTimeout(()=>{
   const index=ownerWaiters.findIndex(x=>x.resolve===resolve);
   if(index>=0)ownerWaiters.splice(index,1);
   reject(Error('OWNED_SUPERVISOR_TIMEOUT'));
  },ms);
  ownerWaiters.push({resolve:value=>{clearTimeout(timer);resolve(value);}});
 });
 const stop=async reason=>{
  if(stopped)return {stopped:true,ownerStopConfirmed:ownerStopAck,
   monitorStopConfirmed:monitor===null||hasExited(monitor),
   reason,servicePid:service?.servicePid};
  stopped=true;
  let ownerStopConfirmed=ownerStopAck;
  if(owner&&!hasExited(owner)){
   try{
    owner.stdin.write('STOP\n');
    const deadline=Date.now()+8000;
    while(Date.now()<deadline){
     const line=await nextLine(Math.max(1,deadline-Date.now()));
     let value;try{value=JSON.parse(line);}catch{continue;}
     if(value.status==='OWNED_OLLAMA_STOPPED'&&
        value.pid===service?.servicePid&&value.jobClosed===true){
      ownerStopConfirmed=true;break;
     }
    }
   }catch{/* Process exit below is the only secondary proof. */}
   if(!hasExited(owner)){
    await Promise.race([new Promise(resolve=>owner.once('exit',resolve)),delay(8000)]);
   }
   if(!hasExited(owner)){
    owner.kill();
    await Promise.race([new Promise(resolve=>owner.once('exit',resolve)),delay(5000)]);
   }
  }
  let monitorStopConfirmed=monitor===null||hasExited(monitor);
  if(monitor&&!hasExited(monitor)){
   monitor.kill();
   await Promise.race([new Promise(resolve=>monitor.once('exit',resolve)),delay(5000)]);
   if(!hasExited(monitor)){
    monitor.kill('SIGKILL');
    await Promise.race([new Promise(resolve=>monitor.once('exit',resolve)),delay(5000)]);
   }
   monitorStopConfirmed=hasExited(monitor);
  }
  try{removeOwnedTempDir(dir);}catch{}
  return {stopped:true,ownerStopConfirmed:ownerStopAck,monitorStopConfirmed,
   reason,servicePid:service?.servicePid};
 };
 try{
  monitor=spawnProcess(pythonExe,[SENSOR,'--role','monitor','--folder',dir,
   '--nonce',nonce,'--max-lifetime-seconds','240'],
   {env:{...process.env,MAB_V31_PROBE_NONCE:nonce},windowsHide:true,
    stdio:'ignore'});
  if(!Number.isSafeInteger(monitor.pid)||monitor.pid<=0)
   throw Error('INDEPENDENT_MONITOR_PID_REQUIRED');
  fs.writeFileSync(sessionFile,JSON.stringify({nonce,headSha:head,
   ownedCalibration:true,monitorPid:monitor.pid}),{flag:'w'});
  let previous=0,ready=false;
  const monitorDeadline=Date.now()+15000;
  while(Date.now()<monitorDeadline&&!ready){
   if(hasExited(monitor))throw Error('INDEPENDENT_MONITOR_EXITED');
   try{
    const sample=readJson(sampleFile);
    const checked=verifyOwnedArchitectureSample({session:{nonce,monitorPid:monitor.pid},
     sample,owner:{port:PORT,servicePid:1,supervisorPid:1,killOnCloseJob:true},
     headSha:head,previousSequence:0,now:now()});
    if(checked.independentMonitorActive===true&&sample.seq>previous){previous=sample.seq;
     if(previous>=2)ready=true;}
   }catch{}
   if(!ready)await delay(150);
  }
  if(!ready)throw Error('INDEPENDENT_MONITOR_HEARTBEAT_UNAVAILABLE');
  owner=spawnProcess(pythonExe,[OWNER,'--serve-ollama',ollamaExe,dir,nonce,
   String(monitor.pid)],
   {cwd:ROOT,windowsHide:true,stdio:['pipe','pipe','ignore']});
  lines=createInterface({input:owner.stdout,crlfDelay:Infinity});
  lines.on('line',pushLine);
  const first=JSON.parse(await nextLine(15000));
  if(first.status!=='OWNED_OLLAMA_STARTED'||first.port!==PORT||
     first.killOnCloseJob!==true||!Number.isSafeInteger(first.pid)||first.pid<=0)
   throw Error('OWNED_OLLAMA_START_UNVERIFIED');
  if(first.listenerPid!==first.pid||first.monitorPid!==monitor.pid||
     first.configuredContextLength!==CONTEXT_LENGTH||
     first.configuredParallelRequests!==1||first.configuredMaxLoadedModels!==1||
     first.configuredKeepAliveSeconds!==0||first.cloudDisabled!==true||
     first.configuredFlashAttention!==false||first.configuredKvCacheType!=='f16'||
     first.configuredGpuOverheadBytes!==0||first.configuredScheduleSpread!==false||
     first.configuredMaxQueue!==1)
   throw Error('OWNED_OLLAMA_LISTENER_MONITOR_PID_MISMATCH');
  service={servicePid:first.pid,supervisorPid:owner.pid,monitorPid:monitor.pid,
   monitorId:nonce,port:PORT,killOnCloseJob:true,headSha:head,
   ollamaExecutableSha256,configuredParallelRequests:first.configuredParallelRequests,
   configuredMaxLoadedModels:first.configuredMaxLoadedModels,
   configuredKeepAliveSeconds:first.configuredKeepAliveSeconds,
   configuredFlashAttention:first.configuredFlashAttention,
   configuredKvCacheType:first.configuredKvCacheType,
   configuredGpuOverheadBytes:first.configuredGpuOverheadBytes,
   configuredScheduleSpread:first.configuredScheduleSpread,
   configuredMaxQueue:first.configuredMaxQueue,
   cloudDisabled:first.cloudDisabled};
  service.configuredContextLength=first.configuredContextLength;
  return {
   ...service,
   async checkResourceSafety({phase='PRE_POST',waitForNewSequence=false}={}){
    if(stopped||hasExited(monitor)||hasExited(owner))
     return {status:'HOLD',reason:'OWNED_PROCESS_NOT_ALIVE',resourceSafetyCertified:false};
    try{
     const sample=readJson(sampleFile);
     const result=verifyOwnedArchitectureSample({session:{nonce,monitorPid:monitor.pid},
      sample,owner:service,headSha:head,previousSequence:0,now:now()});
     if(result.independentMonitorActive!==true)return {...result,phase};
     if(sample.seq<=sequence){
      const d=sample.data,floor=phase==='PRE_POST'?RESOURCE_FLOORS.pre:RESOURCE_FLOORS.during;
      if(d.ramFreeMiB<floor.ram||d.commitHeadroomMiB<floor.commit||
         d.gpuFreeMiB<floor.gpu)
       return {status:'HOLD',reason:'RESOURCE_FLOOR_BELOW_REQUIRED',
        resourceSafetyCertified:false,independentMonitorActive:true,
        monitorSequence:sample.seq,observedResourcesMiB:{ramFree:d.ramFreeMiB,
         commitHeadroom:d.commitHeadroomMiB,gpuFree:d.gpuFreeMiB,
         gpuTotal:d.gpuTotalMiB},phase};
      if(waitForNewSequence===true)
       return {status:'HOLD',reason:'MONITOR_SEQUENCE_NOT_ADVANCED',
        resourceSafetyCertified:false,independentMonitorActive:false,
        monitorSequence:sample.seq,phase};
      return {status:'HOLD',reason:'INDEPENDENT_MONITOR_SAMPLE_INVALID',
       resourceSafetyCertified:false,phase};
     }
     sequence=sample.seq;
     return {...result,phase};
    }catch{return {status:'HOLD',reason:'INDEPENDENT_MONITOR_SAMPLE_INVALID',
     resourceSafetyCertified:false};}
   },
   async stop(reason='RUN_FINISHED'){return stop(reason);}
  };
 }catch(error){
  await stop('START_FAILED');
  throw error;
 }
}

const calibratedClearance=(sample,service,now,architectureRequestSha256=ARCHPLAN_REQUEST_SHA256)=>
 sample?.status==='SAFE_FOR_ONE_REQUEST'&&
 sample?.resourceSafetyCertified===true&&
 sample?.inferenceMemoryPeakCalibrated===true&&
 sample?.model===MODEL&&sample?.modelDigest===MODEL_DIGEST&&
 sample?.contextLength===CONTEXT_LENGTH&&
 sample?.maxOutputTokens===MAX_OUTPUT_TOKENS&&
 typeof sample?.calibrationProofSha256==='string'&&
 /^[a-f0-9]{64}$/.test(sample.calibrationProofSha256)&&
 sample?.architectureRequestSha256===architectureRequestSha256&&
 service.configuredContextLength===CONTEXT_LENGTH&&
 service.configuredParallelRequests===1&&
 service.configuredMaxLoadedModels===1&&
 service.configuredKeepAliveSeconds===0&&service.cloudDisabled===true&&
 service.configuredFlashAttention===false&&service.configuredKvCacheType==='f16'&&
 service.configuredGpuOverheadBytes===0&&service.configuredScheduleSpread===false&&
 service.configuredMaxQueue===1&&
 sample?.headSha===service.headSha&&
 typeof sample?.resourceCalibrationId==='string'&&
 /^[a-z0-9._:-]{8,100}$/i.test(sample.resourceCalibrationId)&&
 sample?.ownedServicePort===service.port&&
 sample?.ownedServicePid===service.servicePid&&
 sample?.ownedServiceInKillOnCloseJob===true&&
 sample?.supervisorPid===service.supervisorPid&&
 sample?.monitorPid===service.monitorPid&&
 sample?.monitorId===service.monitorId&&
 sample?.independentMonitorActive===true&&
 Number.isSafeInteger(sample.monitorHeartbeatEpochMs)&&
 sample.monitorHeartbeatEpochMs<=now&&now-sample.monitorHeartbeatEpochMs<=3000&&
 Number.isSafeInteger(sample.measuredAtEpochMs)&&
 sample.measuredAtEpochMs<=now&&now-sample.measuredAtEpochMs<=3000&&
 sample.sharedServiceIdle===true;

const jsonObject=async(fetcher,url,method='GET',signal=AbortSignal.timeout(5000))=>{
 const response=await fetcher(url,{method,redirect:'error',signal});
 if(!response?.ok)throw Error('OWNED_LOCAL_HTTP_UNAVAILABLE');
 return response.json();
};

const preflightJsonObject=async(fetcher,url,endpoint,timeoutMs=5000)=>{
 try{
  const response=await fetcher(url,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(timeoutMs)});
  if(!response?.ok){
   const status=Number.isInteger(response?.status)&&response.status>=100&&
    response.status<=599?response.status:'UNKNOWN';
   throw Error(`HTTP_${status}`);
  }
  try{return await response.json();}catch{throw Error('INVALID_JSON');}
 }catch(error){
  const message=String(error?.message??'');
  let kind;
  if(/^HTTP_(?:[1-5][0-9]{2}|UNKNOWN)$/.test(message))kind=message;
  else if(message==='INVALID_JSON')kind=message;
  else{
   const code=error?.code??error?.cause?.code;
   if(error?.name==='TimeoutError'||error?.name==='AbortError'||
      code==='ETIMEDOUT'||code==='UND_ERR_CONNECT_TIMEOUT')kind='TIMEOUT';
   else if(code==='ECONNREFUSED')kind='CONNECTION_REFUSED';
   else if(code==='ECONNRESET'||code==='UND_ERR_SOCKET')kind='CONNECTION_RESET';
   else kind='COMMUNICATION_ERROR';
  }
  throw Error(`PREFLIGHT_${endpoint}_${kind}`);
 }
};

export function validateCalibrationRequest({body,expectedSha256}={}){
 let raw;
 try{raw=JSON.stringify(body);}catch{return {valid:false,reason:'REQUEST_NOT_JSON'};}
 const requestSha256=createHash('sha256').update(raw).digest('hex');
 const messages=body?.messages;
 const valid=body?.model===MODEL&&body?.stream===false&&
  body?.temperature===0.55&&body?.response_format?.type==='json_object'&&
  body?.max_tokens===MAX_OUTPUT_TOKENS&&Array.isArray(messages)&&
  messages.length===2&&messages[0]?.role==='system'&&
  messages[1]?.role==='user'&&
  messages.every(x=>typeof x.content==='string'&&x.content.length>0)&&
  /R125 RESOURCE CALIBRATION ONLY/.test(messages[0].content)&&
  !/shelterDepth|architectureplan|minecraft building/i.test(messages[1].content)&&
  /^[a-f0-9]{64}$/.test(expectedSha256??'')&&requestSha256===expectedSha256;
 return {valid,reason:valid?'OK':'CALIBRATION_REQUEST_BINDING_MISMATCH',
  requestSha256,body:valid?body:undefined};
}

function ownedSamplePass(sensor,service,phase,now){
 const r=sensor?.observedResourcesMiB;
 const floor=phase==='PRE_POST'?RESOURCE_FLOORS.pre:RESOURCE_FLOORS.during;
 return sensor?.independentMonitorActive===true&&
  sensor?.ownedServiceInKillOnCloseJob===true&&
  sensor?.ownedServicePort===PORT&&sensor?.ownedServicePid===service.servicePid&&
  sensor?.supervisorPid===service.supervisorPid&&
  sensor?.monitorPid===service.monitorPid&&sensor?.monitorId===service.monitorId&&
  Number.isSafeInteger(sensor?.monitorSequence)&&sensor.monitorSequence>0&&
  Number.isSafeInteger(sensor?.monitorHeartbeatEpochMs)&&
  sensor.monitorHeartbeatEpochMs<=now&&now-sensor.monitorHeartbeatEpochMs<=3000&&
  r&&Number.isSafeInteger(r.ramFree)&&Number.isSafeInteger(r.commitHeadroom)&&
  Number.isSafeInteger(r.gpuFree)&&Number.isSafeInteger(r.gpuTotal)&&
  r.gpuTotal>0&&r.gpuFree<=r.gpuTotal&&
  r.ramFree>=floor.ram&&r.commitHeadroom>=floor.commit&&r.gpuFree>=floor.gpu;
}

const exactLoadedModel=body=>Array.isArray(body?.models)&&body.models.length===1&&
 body.models[0]?.name===MODEL&&body.models[0]?.digest===MODEL_DIGEST&&
 body.models[0]?.context_length===CONTEXT_LENGTH&&
 Number.isSafeInteger(body.models[0]?.size)&&body.models[0].size>0&&
 Number.isSafeInteger(body.models[0]?.size_vram)&&body.models[0].size_vram>0;

/** One individually approved synthetic POST. This path does not invoke the
 * ArchitecturePlan adapter or write SOURCE/build outputs. */
export async function runR125ResourceCalibrationOwned({
 calibrationRequest,calibrationRequestSha256,minimumInputTokens=4777,
 evidenceWriter=null
},{controller,fetcher=fetch,approvalVerifier=null,projectLease=null,now=()=>Date.now(),
 timeoutMs=180000,pollMs=300}={}){
 const service=controller;
 const report={schema:'r125-qwen14b-owned-resource-calibration-v1',status:'HOLD',
  reason:'CALIBRATION_NOT_STARTED',model:MODEL,modelDigest:MODEL_DIGEST,
  headSha:service?.headSha??null,contextLength:CONTEXT_LENGTH,
  maxOutputTokens:MAX_OUTPUT_TOKENS,modelPostCount:0,automaticRetries:0,
  resourceSafetyCertified:false,inferenceMemoryPeakCalibrated:false,
  worldContacts:0,worldWrites:0,paidApiCalls:0,shared11434Writes:0,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},samples:[],
  loadedModelObservation:null,unloadedConfirmed:false,
  ownedServiceStopConfirmed:false,monitorStopConfirmed:false};
 const stop=async reason=>{
  try{
   const result=await service?.stop?.(reason);
   report.ownedServiceStopConfirmed=result?.ownerStopConfirmed===true;
   report.monitorStopConfirmed=result?.monitorStopConfirmed===true;
   if(report.ownedServiceStopConfirmed&&report.monitorStopConfirmed){
    report.unloadedConfirmed=true;
    report.unloadProof='OWNED_KILL_ON_CLOSE_JOB_TERMINATED';
   }
  }catch{}
 };
 const fail=async(reason)=>{
  report.reason=reason;await stop(reason);
  if(evidenceWriter)try{await evidenceWriter(report);}catch{}
  return report;
 };
 if(!service||typeof service.checkResourceSafety!=='function'||
    typeof service.stop!=='function'||service.configuredContextLength!==CONTEXT_LENGTH||
    service.configuredParallelRequests!==1||service.configuredMaxLoadedModels!==1||
    service.configuredKeepAliveSeconds!==0||service.cloudDisabled!==true||
    service.configuredFlashAttention!==false||service.configuredKvCacheType!=='f16'||
    service.configuredGpuOverheadBytes!==0||service.configuredScheduleSpread!==false||
    service.configuredMaxQueue!==1||
    !/^[a-f0-9]{64}$/.test(service.ollamaExecutableSha256??'')||
    !HEAD_RE.test(service.headSha??''))
  return fail('OWNED_CONTEXT_OR_CONTROLLER_MISMATCH');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>180000||
    !Number.isSafeInteger(pollMs)||pollMs<250||pollMs>5000)
  return fail('CALIBRATION_TIMEOUT_OR_POLL_BOUNDS_INVALID');
 const leaseHeld=async()=>{
  if(projectLease===null)return true; // injected/legacy function callers; CLI requires a lease
  try{return typeof projectLease.assertHeld==='function'&&await projectLease.assertHeld()===true;}
  catch{return false;}
 };
 if(!await leaseHeld())return fail('PROJECT_LEASE_LOST');
 const request=validateCalibrationRequest({body:calibrationRequest,
  expectedSha256:calibrationRequestSha256});
 if(!request.valid)return fail(request.reason);
 if(!Number.isSafeInteger(minimumInputTokens)||minimumInputTokens<1||
    minimumInputTokens>12000)return fail('CALIBRATION_INPUT_SCOPE_INVALID');
 const url='http://127.0.0.1:11435/v1/chat/completions';
 const sharedUrl='http://127.0.0.1:11434/api/ps';
 let previousSequence=0;
 const sample=async(phase,{waitForNewSequence=false}={})=>{
  const sequenceDeadline=waitForNewSequence?Date.now()+3000:0;
  for(;;){
   if(!await leaseHeld())throw Error('PROJECT_LEASE_LOST');
   const s=await service.checkResourceSafety({phase,model:MODEL,
    headSha:service.headSha,waitForNewSequence});
   if(s?.reason==='MONITOR_SEQUENCE_NOT_ADVANCED'&&waitForNewSequence){
    const remaining=sequenceDeadline-Date.now();
    if(remaining<=0)throw Error('PRE_POST_MONITOR_SEQUENCE_TIMEOUT');
    await delay(Math.min(50,remaining));
    continue;
   }
   if(s?.reason==='RESOURCE_FLOOR_BELOW_REQUIRED')
    throw Error('PRE_POST_RESOURCE_FLOOR_HOLD');
   const r=s?.observedResourcesMiB;
   const floor=phase==='PRE_POST'?RESOURCE_FLOORS.pre:RESOURCE_FLOORS.during;
   const underFloor=r&&Number.isSafeInteger(r.ramFree)&&
    Number.isSafeInteger(r.commitHeadroom)&&Number.isSafeInteger(r.gpuFree)&&
    (r.ramFree<floor.ram||r.commitHeadroom<floor.commit||r.gpuFree<floor.gpu);
   if(underFloor)throw Error(phase==='PRE_POST'?
    'PRE_POST_RESOURCE_FLOOR_HOLD':'RESOURCE_OR_MONITOR_GUARD');
   if(!ownedSamplePass(s,service,phase,now()))
    throw Error(phase==='PRE_POST'?'PRE_POST_MONITOR_SAMPLE_HOLD':'RESOURCE_OR_MONITOR_GUARD');
   if(s.monitorSequence<=previousSequence)
    throw Error(phase==='PRE_POST'?'PRE_POST_MONITOR_SEQUENCE_INVALID':'RESOURCE_OR_MONITOR_GUARD');
   previousSequence=s.monitorSequence;
   const d=s.observedResourcesMiB;
   report.samples.push({atEpochMs:now(),monitorHeartbeatEpochMs:s.monitorHeartbeatEpochMs,
    monitorSequence:s.monitorSequence,monitorPid:s.monitorPid,
    ownedServicePid:s.ownedServicePid,supervisorPid:s.supervisorPid,
    ramFreeMiB:d.ramFree,commitHeadroomMiB:d.commitHeadroom,
    gpuFreeMiB:d.gpuFree,gpuTotalMiB:d.gpuTotal});
   return s;
  }
 };
 let tags,ownedPs,sharedPs;
 const tagsUrl='http://127.0.0.1:11435/api/tags';
 try{
  if(projectLease===null){
   // Keep injected/legacy caller behavior unchanged.
   [tags,ownedPs,sharedPs]=await Promise.all([
    preflightJsonObject(fetcher,tagsUrl,'OWNED_TAGS'),
    preflightJsonObject(fetcher,'http://127.0.0.1:11435/api/ps','OWNED_PS'),
    preflightJsonObject(fetcher,sharedUrl,'SHARED_PS')]);
  }else{
   // LISTENING establishes ownership, not readiness. A single bounded
   // GET-only retry is allowed solely for the observed startup timeout.
   // No calibration POST, resource floor, identity check or lease is relaxed.
   try{tags=await preflightJsonObject(fetcher,tagsUrl,'OWNED_TAGS');}
   catch(error){
    if(error?.message!=='PREFLIGHT_OWNED_TAGS_TIMEOUT')throw error;
    report.ownedTagsInitialTimeout=true;
    try{await sample('PRE_POST',{waitForNewSequence:true});}
    catch(guard){return fail(guard?.message??'PRE_POST_MONITOR_SAMPLE_HOLD');}
    if(!await leaseHeld())return fail('PROJECT_LEASE_LOST');
    tags=await preflightJsonObject(fetcher,tagsUrl,'OWNED_TAGS',10000);
    report.ownedTagsReadOnlyRetrySucceeded=true;
   }
   [ownedPs,sharedPs]=await Promise.all([
    preflightJsonObject(fetcher,'http://127.0.0.1:11435/api/ps','OWNED_PS'),
    preflightJsonObject(fetcher,sharedUrl,'SHARED_PS')]);
  }
 }catch(error){return fail(/^PREFLIGHT_(?:OWNED_TAGS|OWNED_PS|SHARED_PS)_(?:HTTP_(?:[1-5][0-9]{2}|UNKNOWN)|CONNECTION_REFUSED|CONNECTION_RESET|TIMEOUT|INVALID_JSON|COMMUNICATION_ERROR)$/.test(error?.message??'')?
  error.message:'PREFLIGHT_COMMUNICATION_ERROR');}
 const models=tags?.models?.filter(x=>x?.name===MODEL)??[];
 if(models.length!==1||models[0].digest!==MODEL_DIGEST||
    models[0].size!==MODEL_SIZE||models[0].details?.quantization_level!=='Q4_K_M'||
    models[0].details?.parameter_size!=='14.8B'||
    !Array.isArray(ownedPs?.models)||ownedPs.models.length!==0||
    !Array.isArray(sharedPs?.models)||sharedPs.models.length!==0)
  return fail('MODEL_DIGEST_OR_COMPETING_MODEL_HOLD');

 try{await sample('PRE_POST',{waitForNewSequence:previousSequence>0});}
 catch(error){return fail(error?.message==='PRE_POST_RESOURCE_FLOOR_HOLD'?
  'PRE_POST_RESOURCE_FLOOR_HOLD':'PRE_POST_MONITOR_SAMPLE_HOLD');}
 try{ownedPs=await jsonObject(fetcher,'http://127.0.0.1:11435/api/ps');}
 catch{return fail('OWNED_MODEL_STATE_RECHECK_FAILED');}
 try{sharedPs=await jsonObject(fetcher,sharedUrl);}
 catch{return fail('SHARED_MODEL_STATE_RECHECK_FAILED');}
 if(!Array.isArray(ownedPs?.models))return fail('OWNED_MODEL_STATE_RECHECK_INVALID');
 if(!Array.isArray(sharedPs?.models))return fail('SHARED_MODEL_STATE_RECHECK_INVALID');
 try{await sample('PRE_POST',{waitForNewSequence:true});}
 catch(error){return fail(error?.message??'PRE_POST_MONITOR_SAMPLE_HOLD');}
 if(ownedPs.models.length!==0||sharedPs.models.length!==0)
  return fail('COMPETING_MODEL_BEFORE_CALIBRATION_POST');
 let approved=false;
 try{approved=typeof approvalVerifier==='function'&&await approvalVerifier({
  purpose:'RESOURCE_CALIBRATION',requestSha256:request.requestSha256,
  model:MODEL,modelDigest:MODEL_DIGEST,headSha:service.headSha,
  endpoint:url,maxPosts:1,automaticRetries:0,contextLength:CONTEXT_LENGTH,
  maxOutputTokens:MAX_OUTPUT_TOKENS})===true;}catch{}
 if(!approved)
  return fail('INDIVIDUAL_CALIBRATION_APPROVAL_REQUIRED');
 if(projectLease!==null){
  try{await sample('PRE_POST',{waitForNewSequence:true});}
  catch(error){return fail(error?.message??'PRE_POST_MONITOR_SAMPLE_HOLD');}
  if(!await leaseHeld())return fail('PROJECT_LEASE_LOST');
 }

 const abort=new AbortController(),started=now(),deadline=started+timeoutMs;
 report.calibrationStartedAtEpochMs=started;
 report.calibrationRequestSha256=request.requestSha256;
 report.minimumInputTokens=minimumInputTokens;
 report.runtimeSettings={ollamaHost:'127.0.0.1:11435',contextLength:CONTEXT_LENGTH,
  maxOutputTokens:MAX_OUTPUT_TOKENS,temperature:0.55,responseFormat:'json_object',
  requestEndpoint:url,timeoutMs,automaticRetries:0,
  parallelRequests:service.configuredParallelRequests,
  maxLoadedModels:service.configuredMaxLoadedModels,
  keepAliveSeconds:service.configuredKeepAliveSeconds,cloudDisabled:service.cloudDisabled,
  flashAttention:service.configuredFlashAttention,kvCacheType:service.configuredKvCacheType,
  gpuOverheadBytes:service.configuredGpuOverheadBytes,
  scheduleSpread:service.configuredScheduleSpread,maxQueue:service.configuredMaxQueue,
  ollamaExecutableSha256:service.ollamaExecutableSha256};
 report.resourceMeasurement={source:'existing independent R125 V3.1 sensor',
  sourceCadenceMs:250,observedPollMs:pollMs,
  preflightFloorsMiB:{...RESOURCE_FLOORS.pre},
  inferenceFloorsMiB:{...RESOURCE_FLOORS.during},
  historicalModelVramBytes:11682688531,historicalModelSizeBytes:11682688531,
  historicalModelPlacement:'size_equals_size_vram',
  historicalModelContextLength:CONTEXT_LENGTH,
  historicalModelDigest:MODEL_DIGEST,
  historicalModelEvidence:'V9GateC-bed0cdbc-clean-clone/evidence/r190bm/A/BM_RUNTIME_AFTER.json',
  historicalModelEvidenceSha256:'aad94f5c100fb29ab49ea4ee043771963f7d7f667965a155cf523aa36079e280',
  preflightMarginMiB:3072,
  calibrationReserveMarginMiB:RESOURCE_MARGIN_MIB};
 report.monitorIdentity={monitorPid:service.monitorPid,monitorId:service.monitorId,
  ownedServicePid:service.servicePid,supervisorPid:service.supervisorPid,
  jobPort:service.port,killOnCloseJob:service.killOnCloseJob};
 report.modelPostCount=1;
 let requestDone=false;
 const pending=Promise.resolve().then(()=>fetcher(url,{method:'POST',redirect:'error',
  headers:{'Content-Type':'application/json'},signal:abort.signal,
  body:JSON.stringify(request.body)})).then(async response=>{
   if(!response?.ok){
    // Preserve the numeric HTTP status in the PRIVATE failure receipt.
    // Never persist the response body (it may include private model data).
    report.calibrationHttpStatus=Number.isInteger(response?.status)&&
     response.status>=100&&response.status<=599?response.status:null;
    throw Error('CALIBRATION_POST_HTTP_FAILED');
   }
   const raw=await response.text();
   if(raw.length<2||raw.length>200000)throw Error('CALIBRATION_RESPONSE_SIZE_INVALID');
   return {value:JSON.parse(raw),responseSha256:createHash('sha256').update(raw).digest('hex')};
  }).then(value=>({ok:true,...value}),error=>({ok:false,error:String(error?.message??error)}))
   .finally(()=>{requestDone=true;});
 let monitorError=null,loadedSeen=false;
 while(!requestDone&&now()<deadline){
  const tick=await Promise.race([pending.then(()=>false),delay(pollMs).then(()=>true)]);
  if(!tick)break;
  try{
   const s=await sample('DURING_INFERENCE',{waitForNewSequence:true});
   const [active,shared]=await Promise.all([
    jsonObject(fetcher,'http://127.0.0.1:11435/api/ps'),
    jsonObject(fetcher,sharedUrl)]);
   if(!Array.isArray(shared?.models)||shared.models.length!==0)
    throw Error('SHARED_SERVICE_BECAME_BUSY');
   if(Array.isArray(active?.models)&&active.models.length===0){
    if(now()-started>20000)throw Error('MODEL_LOAD_NOT_OBSERVED');
   }else if(exactLoadedModel(active)){
    loadedSeen=true;
    const item=active.models[0];
    const placement={sizeBytes:item.size,sizeVramBytes:item.size_vram,
     cpuOffloadEstimateBytes:Math.max(0,item.size-item.size_vram)};
    if(report.loadedModelObservation&&
       JSON.stringify(report.loadedModelObservation.placement)!==JSON.stringify(placement))
     throw Error('MODEL_PLACEMENT_CHANGED_DURING_CALIBRATION');
    report.loadedModelObservation={digest:item.digest,contextLength:item.context_length,
     observedAtEpochMs:now(),placement,resourceSampleSequence:s.monitorSequence};
   }else throw Error('LOADED_MODEL_IDENTITY_OR_CONTEXT_MISMATCH');
  }catch(error){monitorError=String(error?.message??error);break;}
 }
 if(monitorError||!requestDone){
  monitorError=monitorError??(now()>=deadline?'CALIBRATION_TIMEOUT':'CALIBRATION_ABORTED');
  abort.abort();await stop(monitorError);
  await Promise.race([pending,delay(5000)]);
  report.reason=monitorError;
  if(evidenceWriter)try{await evidenceWriter(report);}catch{}
  return report;
 }
 const final=await pending;
 if(!await leaseHeld())return fail('PROJECT_LEASE_LOST');
 if(!final.ok)return fail(final.error);
 const choice=Array.isArray(final.value?.choices)&&final.value.choices.length===1?
  final.value.choices[0]:null;
 report.responseSha256=final.responseSha256;
 report.promptTokens=final.value?.usage?.prompt_tokens??null;
 report.generatedTokens=final.value?.usage?.completion_tokens??null;
 report.inputOutputTokensTotal=Number.isSafeInteger(report.promptTokens)&&
  Number.isSafeInteger(report.generatedTokens)?report.promptTokens+report.generatedTokens:null;
 report.finishReason=choice?.finish_reason??null;
 report.generatedCharacters=typeof choice?.message?.content==='string'?
  choice.message.content.length:null;
 if(!loadedSeen||report.loadedModelObservation?.contextLength!==CONTEXT_LENGTH||
    !Number.isSafeInteger(report.promptTokens)||report.promptTokens<minimumInputTokens||
    report.generatedTokens!==MAX_OUTPUT_TOKENS||report.finishReason!=='length'||
    typeof choice?.message?.content!=='string'||
    report.inputOutputTokensTotal>CONTEXT_LENGTH)
  report.reason='CALIBRATION_OUTPUT_OR_ACTUAL_CONTEXT_NOT_PROVEN';
 await stop('CALIBRATION_FINISHED');
 const rows=report.samples;
 if(report.reason==='CALIBRATION_NOT_STARTED'&&report.unloadedConfirmed&&
    report.ownedServiceStopConfirmed&&report.monitorStopConfirmed&&rows.length>=3){
  report.minimumObservedMiB={
   ramFree:Math.min(...rows.map(x=>x.ramFreeMiB)),
   commitHeadroom:Math.min(...rows.map(x=>x.commitHeadroomMiB)),
   gpuFree:Math.min(...rows.map(x=>x.gpuFreeMiB)),
   gpuTotal:Math.min(...rows.map(x=>x.gpuTotalMiB))};
  report.startResourcesMiB={ramFree:rows[0].ramFreeMiB,
   commitHeadroom:rows[0].commitHeadroomMiB,gpuFree:rows[0].gpuFreeMiB,
   gpuTotal:rows[0].gpuTotalMiB};
  report.status='CALIBRATION_PASS';report.reason='BOUNDED_RESOURCE_ENVELOPE_CAPTURED';
  report.resourceSafetyCertified=true;report.inferenceMemoryPeakCalibrated=true;
 }else if(report.reason==='CALIBRATION_NOT_STARTED')
  report.reason='CALIBRATION_EVIDENCE_OR_STOP_CONFIRMATION_INCOMPLETE';
 if(evidenceWriter)try{await evidenceWriter(report);}catch{
  report.status='HOLD';report.reason='PRIVATE_EVIDENCE_WRITE_FAILED';
  report.resourceSafetyCertified=false;report.inferenceMemoryPeakCalibrated=false;
 }
 return report;
}

/**
 * ArchitecturePlan is the actual contract used by shelterDepth:3. It is not
 * the integrated-semantic V7 IR runner. This gate refuses before POST unless
 * the PRIVATE, model-calibrated probe attests the exact owned service.
 */
const SHA256_RE=/^[a-f0-9]{64}$/;
const OWNED_ENDPOINT='http://127.0.0.1:11435/v1/chat/completions';
const shaText=text=>createHash('sha256').update(text).digest('hex');
/** Offline preparation uses the SAME adapter and settings as owned execution.
 * The injected transport only captures bytes and refuses, never calls HTTP. */
export async function prepareR125StudioNewRequest({model,prompt,headSha}={}, {onWireBody=null}={}){
 if(model!==MODEL||typeof prompt!=='string'||prompt.length<8||prompt.length>8000||
    !HEAD_RE.test(headSha??''))throw Error('STUDIO_NEW_REQUEST_INVALID');
 let exact=null;
 const author=createR125ArchitecturePlanLocalAdapter({model,endpoint:OWNED_ENDPOINT,
  maxOutputTokens:MAX_OUTPUT_TOKENS,onRawModelResponse:()=>{},
  fetcher:async(url,init)=>{
   if(exact!==null||url!==OWNED_ENDPOINT||init.method!=='POST'||init.redirect!=='error')
    throw Error('STUDIO_PREPARE_BOUNDARY');
   exact=String(init.body);return {ok:false,status:418};
  }});
 try{await author({prompt});throw Error('STUDIO_PREPARE_UNEXPECTED_SUCCESS');}
 catch(error){if(exact===null||!String(error?.message).includes('LOCAL_HTTP_418'))throw error;}
 // Only the in-process PRIVATE verifier needs the exact payload to determine
 // calibrated input scope. Never expose it in CLI stdout or the public receipt.
 if(onWireBody!==null)await onWireBody(exact);
 return {schema:'r125-studio-new-request-v1',mode:'new',headSha,model,
  briefSha256:shaText(prompt),requestSha256:shaText(exact),endpoint:OWNED_ENDPOINT,
  maxOutputTokens:MAX_OUTPUT_TOKENS,modelPostCount:0};
}
/** Receipt is emitted only after the existing owned lifecycle has settled.
 * A runner SOURCE report alone must not trigger Studio import. */
export function summarizeR125StudioRun(request,result,runPath,lockReleased){
 const settled=result?.modelPostCount===1&&result.unloadConfirmed===true&&
  result.ownedServiceStopConfirmed===true&&result.monitorStopConfirmed===true&&
  result.loadedModelObserved===true&&lockReleased===true;
 const ready=settled&&result.sourceVerified===true&&
  result.requestSha256===request.briefSha256&&result.model===request.model&&
  SHA256_RE.test(result.sourceSha256??'')&&SHA256_RE.test(result.geometrySha256??'');
 return {schema:'r125-studio-owned-result-v1',mode:'new',
  status:ready?'SOURCE_READY_REVIEW_ONLY':result?.reason==='MONITOR_INTERRUPTED'?'INTERRUPTED':'HOLD',
  reason:ready?null:result?.reason??result?.status??'EXECUTION_NOT_SETTLED',
  headSha:request.headSha,model:request.model,modelDigest:MODEL_DIGEST,
  briefSha256:request.briefSha256,requestSha256:request.requestSha256,
  runPath:ready?runPath:null,sourceVerified:ready,
  sourceSha256:ready?result.sourceSha256:null,geometrySha256:ready?result.geometrySha256:null,
  modelPostCount:result?.modelPostCount??0,automaticRetries:0,
  loadedModelObserved:result?.loadedModelObserved===true,
  unloadConfirmed:result?.unloadConfirmed===true,ownedServiceStopConfirmed:result?.ownedServiceStopConfirmed===true,
  monitorStopConfirmed:result?.monitorStopConfirmed===true,projectLockReleased:lockReleased===true,
  artStatus:'NOT_REVIEWED',worldContacts:0,worldWrites:0,constructionApproved:false,
  executionAllowed:false,BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED')};
}

export async function runR125ArchitecturePlanOwned(args,{
 controller,calibratedResourceProbe=null,runner=runR125LocalArchitecturePlan,
 fetcher=fetch,exactRequestApprovalVerifier=null,now=()=>Date.now(),timeoutMs=180000,
 studioRequest=null,projectLease=null
}={}){
 if(args?.repairOnce===true)return hold('OWNED_RUNNER_RETRY_FORBIDDEN');
 if(studioRequest===null&&(typeof args?.prompt!=='string'||!/(?:entry\s*[.:]\s*shelterDepth\s*[:=：]\s*3|entry\.shelterDepth\s*[:=：]\s*3)/i.test(args.prompt)))
  return hold('SHELTER_DEPTH_3_MUST_BE_IN_ORIGINAL_BRIEF');
 if(!controller||typeof controller.checkResourceSafety!=='function'||
    typeof controller.stop!=='function'||!Number.isSafeInteger(controller.servicePid))
  return hold('OWNED_SERVICE_CONTROLLER_REQUIRED');
 const service=controller;
 const studio=studioRequest!==null;
 const expectedRequest=studio?studioRequest.requestSha256:ARCHPLAN_REQUEST_SHA256;
 let studioWireBody=null;
 if(studio){
  let valid=false;
  try{
   const prepared=await prepareR125StudioNewRequest({model:args.model,prompt:args.prompt,headSha:service.headSha},
    {onWireBody:body=>{studioWireBody=body;}});
   valid=JSON.stringify(prepared)===JSON.stringify(studioRequest)&&
    Object.keys(args).every(k=>['model','prompt','outDir'].includes(k))&&
    typeof projectLease?.assertHeld==='function'&&await projectLease.assertHeld()===true;
  }catch{}
  if(!valid){
   const stopped=await service.stop('STUDIO_REQUEST_OR_PROJECT_LEASE_UNVERIFIED');
   return hold('STUDIO_REQUEST_OR_PROJECT_LEASE_UNVERIFIED',{
    ownedServiceStopConfirmed:stopped?.ownerStopConfirmed===true,
    monitorStopConfirmed:stopped?.monitorStopConfirmed===true});
  }
 }
 const attest=async (phase,{waitForNewSequence=false}={})=>{
  let sensor;
  const deadline=Date.now()+3000;
  for(;;){
   if(studio&&await projectLease.assertHeld()!==true)throw Error('PROJECT_LEASE_LOST');
   sensor=await service.checkResourceSafety({phase,model:MODEL,headSha:service.headSha,waitForNewSequence});
   if(!waitForNewSequence||sensor?.reason!=='MONITOR_SEQUENCE_NOT_ADVANCED')break;
   if(Date.now()>=deadline)throw Error('PRE_POST_MONITOR_SEQUENCE_TIMEOUT');
   await delay(50);
  }
  if(studio&&!ownedSamplePass(sensor,service,phase,now()))return hold('RESOURCE_OR_HEARTBEAT_HOLD');
  if(!calibratedResourceProbe)return sensor;
  const calibrated=await calibratedResourceProbe({sensor,service,phase,model:MODEL,
   headSha:service.headSha,...(studio?{architectureRequestSha256:expectedRequest,
    wireBody:studioWireBody,mode:'new'}: {})});
  if(!calibratedClearance(calibrated,service,now(),expectedRequest))return sensor;
  return calibrated;
 };
 let pre;
 try{pre=await attest('PRE_POST');}catch{pre=null;}
 if(!calibratedClearance(pre,service,now(),expectedRequest)){
  const stopped=await service.stop('UNCALIBRATED_PRE_POST_HOLD');
  return hold(pre?.reason??'QWEN_PEAK_CALIBRATION_REQUIRED',{
   observedResourcesMiB:pre?.observedResourcesMiB??null,
   ownedServiceStopConfirmed:stopped?.ownerStopConfirmed===true,
   monitorStopConfirmed:stopped?.monitorStopConfirmed===true});
 }
  // Identity and idle checks are GET-only. Shared 11434 is queried read-only
  // for an idle check; this path never posts to or stops that service.
 try{
  let tags;
  if(studio){
   try{tags=await preflightJsonObject(fetcher,'http://127.0.0.1:11435/api/tags','OWNED_TAGS');}
   catch(error){
    if(error?.message!=='PREFLIGHT_OWNED_TAGS_TIMEOUT')throw error;
    const fresh=await attest('PRE_POST',{waitForNewSequence:true});
    if(!calibratedClearance(fresh,service,now(),expectedRequest)||
       fresh.monitorSequence<=pre.monitorSequence)throw Error('RESOURCE_OR_HEARTBEAT_HOLD');
    pre=fresh;
    if(await projectLease.assertHeld()!==true)throw Error('PROJECT_LEASE_LOST');
    tags=await preflightJsonObject(fetcher,'http://127.0.0.1:11435/api/tags','OWNED_TAGS',10000);
   }
  }else{
   const tagsResponse=await fetcher('http://127.0.0.1:11435/api/tags',
    {method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
   tags=tagsResponse?.ok?await tagsResponse.json():null;
  }
  const matches=tags?.models?.filter(entry=>entry?.name===MODEL)??[];
  const psResponse=await fetcher('http://127.0.0.1:11435/api/ps',
   {method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
  const ps=psResponse?.ok?await psResponse.json():null;
  const sharedResponse=await fetcher('http://127.0.0.1:11434/api/ps',
   {method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
  const shared=sharedResponse?.ok?await sharedResponse.json():null;
  if(matches.length!==1||matches[0].digest!==MODEL_DIGEST||
     matches[0].size!==MODEL_SIZE||matches[0].details?.quantization_level!=='Q4_K_M'||
     !Array.isArray(ps?.models)||ps.models.length!==0||
     !Array.isArray(shared?.models)||shared.models.length!==0){
   const stopped=await service.stop('OWNED_MODEL_IDENTITY_OR_IDLE_HOLD');
   return hold('OWNED_MODEL_IDENTITY_OR_IDLE_UNVERIFIED',{
    ownedServiceStopConfirmed:stopped?.ownerStopConfirmed===true,
    monitorStopConfirmed:stopped?.monitorStopConfirmed===true,
    sharedServiceTouched:false});
  }
  // GET readiness can outlast the three-second clearance. Obtain a new
  // independently measured clearance; never extend the old one.
  if(studio){
   const fresh=await attest('PRE_POST',{waitForNewSequence:true});
   if(!calibratedClearance(fresh,service,now(),expectedRequest)||
      fresh.monitorSequence<=pre.monitorSequence)throw Error('RESOURCE_OR_HEARTBEAT_HOLD');
   pre=fresh;
  }
 }catch{
  const stopped=await service.stop('OWNED_MODEL_PREFLIGHT_FAILED');
  return hold('OWNED_MODEL_PREFLIGHT_UNAVAILABLE',{
   ownedServiceStopConfirmed:stopped?.ownerStopConfirmed===true,
   monitorStopConfirmed:stopped?.monitorStopConfirmed===true});
 }
 let posts=0,monitorFault=false,previous=pre,loadedSeen=false,faultStop=null;
 const monitoredFetch=async(url,init={})=>{
  if(url!=='http://127.0.0.1:11435/v1/chat/completions'||
     init.method!=='POST'||posts!==0){
   monitorFault=true;await service.stop('REQUEST_BOUNDARY_VIOLATION');
   throw Error('OWNED_ARCHPLAN_ONE_POST_BOUNDARY');
  }
  const requestSha256=createHash('sha256').update(String(init.body??'')).digest('hex');
   let outgoing;
   try{outgoing=JSON.parse(String(init.body??''));}catch{outgoing=null;}
   if(typeof exactRequestApprovalVerifier!=='function'||
      requestSha256!==expectedRequest||
      outgoing?.model!==MODEL||outgoing?.max_tokens!==MAX_OUTPUT_TOKENS||
     await exactRequestApprovalVerifier({requestSha256,model:MODEL,
       headSha:service.headSha,endpoint:url,maxPosts:1,automaticRetries:0,
       purpose:'ARCHITECTURE_PLAN',...(studio?{briefSha256:studioRequest.briefSha256,outDir:args.outDir,
        mode:'new',wireBody:studioWireBody,modelDigest:MODEL_DIGEST}:{}),contextLength:CONTEXT_LENGTH,
       maxOutputTokens:MAX_OUTPUT_TOKENS,
       calibrationProofSha256:pre.calibrationProofSha256})!==true){
   await service.stop('EXACT_REQUEST_APPROVAL_REQUIRED');
   throw Error('EXACT_ARCHPLAN_REQUEST_APPROVAL_REQUIRED');
  }
  if(studio){
   if(await projectLease.assertHeld()!==true)throw Error('PROJECT_LEASE_LOST');
   if(init.signal?.aborted)throw Error('MODEL_REQUEST_ABORTED');
   if(!calibratedClearance(previous,service,now(),expectedRequest))throw Error('PRE_POST_CLEARANCE_EXPIRED');
  }
  posts++;
  const stopController=new AbortController();
  const signal=init.signal?AbortSignal.any([init.signal,stopController.signal]):stopController.signal;
  let pending=null,closed=false;
  const fault=reason=>{
   if(closed||monitorFault)return;
   monitorFault=true;stopController.abort();
   faultStop=Promise.resolve(service.stop(reason)).catch(()=>null);
  };
  const abortFromCaller=()=>fault('MODEL_REQUEST_ABORTED');
  if(init.signal){
   if(init.signal.aborted)abortFromCaller();
   else init.signal.addEventListener('abort',abortFromCaller,{once:true});
  }
  const pulse=setInterval(()=>{
   if(pending||closed)return;
   pending=Promise.resolve().then(()=>attest('DURING_INFERENCE')).then(async sample=>{
    if(studio){
     const [active,shared]=await Promise.all([
      jsonObject(fetcher,'http://127.0.0.1:11435/api/ps'),
      jsonObject(fetcher,'http://127.0.0.1:11434/api/ps')]);
     if(!Array.isArray(shared?.models)||shared.models.length!==0)throw Error('SHARED_SERVICE_BECAME_BUSY');
     if(exactLoadedModel(active))loadedSeen=true;
     else if(!Array.isArray(active?.models)||active.models.length!==0)throw Error('LOADED_MODEL_IDENTITY_MISMATCH');
    }
    if(!calibratedClearance(sample,service,now(),expectedRequest)||
       sample.monitorHeartbeatEpochMs<=previous.monitorHeartbeatEpochMs||
       sample.monitorSequence<=previous.monitorSequence)
     fault('RESOURCE_OR_HEARTBEAT_HOLD');
    else previous=sample;
   }).catch(()=>fault('RESOURCE_MONITOR_FAILED')).finally(()=>{pending=null;});
  },1000);
  try{
   const response=await fetcher(url,{...init,signal});
   if(!studio)return response;
   // Fetch resolves at headers. Keep the EXISTING monitor alive until the
   // entire response body has arrived, not just until headers are returned.
   const raw=await response.text();
   clearInterval(pulse);
   // A sample already in flight must settle before accepting the body.
   // Otherwise a late lease/resource failure can be ignored at completion.
   if(pending)await pending;
   if(await projectLease.assertHeld()!==true)fault('PROJECT_LEASE_LOST');
   if(monitorFault||signal.aborted)throw Error('OWNED_MODEL_RESPONSE_INTERRUPTED');
   return {ok:response.ok,status:response.status,json:async()=>JSON.parse(raw)};
  }finally{
   clearInterval(pulse);
   if(studio&&pending)await pending;
   closed=true;
   if(studio)init.signal?.removeEventListener('abort',abortFromCaller);
  }

 };
 let result;
 try{
  const run=await runner({...args,model:MODEL,endpoint:'http://127.0.0.1:11435/v1/chat/completions',
   repairOnce:false},{fetcher:monitoredFetch,timeoutMs});
  // The existing runner returns {report, outputDirectory}, not report itself.
  result=run?.report??run;
  if(studio&&(!run?.report||path.resolve(run.outputDirectory??'')!==path.resolve(args.outDir)))
   result=hold('OWNED_RUNNER_OUTPUT_DIRECTORY_MISMATCH');
 }catch(error){
  result=hold('ARCHITECTURE_PLAN_RUN_FAILED',{reasonDetail:String(error?.message??error).slice(0,160)});
 }
 if(faultStop)await faultStop;
 let unloadConfirmed=false;
 if(posts===1&&!monitorFault){
  try{
   const response=await fetcher('http://127.0.0.1:11435/api/ps',
    {method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
   const body=response.ok?await response.json():null;
   unloadConfirmed=Array.isArray(body?.models)&&
    !body.models.some(entry=>entry?.name===MODEL);
  }catch{}
 }
 let stop;
 try{stop=await service.stop(unloadConfirmed?'POST_COMPLETE_UNLOADED':'UNLOAD_UNCONFIRMED');}
 catch{stop=null;}
 if(studio&&posts===0)
  return hold(result?.reason??'NO_MODEL_POST',{
   modelPostCount:0,unloadConfirmed:false,ownedServiceStopConfirmed:stop?.ownerStopConfirmed===true,
   monitorStopConfirmed:stop?.monitorStopConfirmed===true,sourceStatus:result?.status??null});
 if(posts>1||monitorFault||!unloadConfirmed||
    stop?.ownerStopConfirmed!==true||stop?.monitorStopConfirmed!==true){
  return hold(monitorFault?'MONITOR_INTERRUPTED':!unloadConfirmed?
   'MODEL_UNLOAD_UNCONFIRMED':'OWNED_SERVICE_STOP_UNCONFIRMED',{
    modelPostCount:posts,unloadConfirmed,ownedServiceStopConfirmed:stop?.ownerStopConfirmed===true,
    monitorStopConfirmed:stop?.monitorStopConfirmed===true,
    sourceStatus:result?.status??null});
 }
 if(studio){
  if(!loadedSeen)return hold('ACTUAL_LOADED_MODEL_NOT_OBSERVED',{modelPostCount:posts,unloadConfirmed:true,ownedServiceStopConfirmed:true,monitorStopConfirmed:true,sourceStatus:result?.status??null});
  return {...result,modelPostCount:posts,unloadConfirmed:true,ownedServiceStopConfirmed:true,monitorStopConfirmed:true,loadedModelObserved:true};
 }
 try{
  const raw=fs.readFileSync(path.join(args.outDir,'MODEL_RESPONSE_ORIGINAL.txt'),'utf8');
  const author=JSON.parse(raw);
  if(author?.entry?.shelterDepth!==3)
   return hold('MODEL_DID_NOT_AUTHOR_SHELTER_DEPTH_3',{
    modelPostCount:posts,unloadConfirmed:true,ownedServiceStopConfirmed:true,
    sourceStatus:result?.status??null});
 }catch{return hold('ORIGINAL_ARCHITECTURE_PLAN_UNAVAILABLE',{
  modelPostCount:posts,unloadConfirmed:true,ownedServiceStopConfirmed:true});}
 return {...result,modelPostCount:posts,unloadConfirmed:true,
  ownedServiceStopConfirmed:true};
}

export function parseOwnedArgs(argv){
 const values={};
 if(argv.length!==6)throw Error('USAGE --model qwen3:14b --prompt TEXT --out PRIVATE_NEW_DIR');
 for(let i=0;i<argv.length;i+=2){
  if(!['--model','--prompt','--out'].includes(argv[i])||values[argv[i]]||!argv[i+1])
   throw Error('OWNED_ARCHPLAN_ARGUMENTS_INVALID');
  values[argv[i]]=argv[i+1];
 }
 if(values['--model']!==MODEL)throw Error('OWNED_ARCHPLAN_MODEL_NOT_APPROVED');
 return {model:values['--model'],prompt:values['--prompt'],outDir:values['--out']};
}

async function runOwnedCli(argv){
 const studio=argv[0]==='--studio-new';
 const requestSha256=studio?argv[1]:null;
 if(studio&&!SHA256_RE.test(requestSha256??''))throw Error('STUDIO_EXACT_REQUEST_SHA_REQUIRED');
 const args=parseOwnedArgs(studio?argv.slice(2):argv);
 const privateModule=process.env.MAB_V7_PRIVATE_HOST_MODULE;
 const expectedHead=process.env.MAB_HEAD;
 const pythonExe=process.env.MAB_PYTHON_EXE;
 const ollamaExe=process.env.MAB_OLLAMA_EXE;
 if(!path.isAbsolute(privateModule??'')||!HEAD_RE.test(expectedHead??'')||
    !path.isAbsolute(pythonExe??'')||!path.isAbsolute(ollamaExe??''))
  throw Error('PRIVATE_CALIBRATION_AND_DIRECT_EXECUTABLES_REQUIRED');
 const opts={encoding:'utf8',timeout:10000,windowsHide:true};
 const observed=execFileSync('git.exe',['-C',ROOT,'rev-parse','HEAD'],opts).trim();
 const branch=execFileSync('git.exe',['-C',ROOT,'branch','--show-current'],opts).trim();
 const dirty=execFileSync('git.exe',['-C',ROOT,'status','--porcelain=v1',
  '--untracked-files=normal'],opts);
 if(observed!==expectedHead||branch!==BRANCH||dirty!=='')
  throw Error('PINNED_CLEAN_RESEARCH_HEAD_REQUIRED');
 const ci=await checkExactHeadCi(expectedHead);
 if(ci?.safeToRunModel!==true)throw Error('EXACT_HEAD_REQUIRED_CI_NOT_SUCCESS');
 const actual=fs.realpathSync(privateModule);
 if(actual===ROOT||actual.startsWith(ROOT+path.sep)||!fs.statSync(actual).isFile())
  throw Error('PRIVATE_MODULE_MUST_BE_EXTERNAL');
 const bindings=await import(pathToFileURL(actual).href);
 if(typeof bindings.calibratedResourceProbe!=='function'||
    typeof bindings.verifyExactRequestApproval!=='function')
  throw Error('PRIVATE_CALIBRATION_AND_REQUEST_APPROVAL_REQUIRED');
 if(studio){
  const request=await prepareR125StudioNewRequest({...args,headSha:expectedHead});
  if(request.requestSha256!==requestSha256)throw Error('STUDIO_REQUEST_SHA_MISMATCH');
  args.outDir=path.resolve(args.outDir);ensurePrivateNewDirectory(args.outDir);
  // Thin binding to the ALREADY EXISTING cross-project operator lock.
  // No new lease store/monitor; no GET-only substitute. Absent binding HOLD.
  if(typeof bindings.acquireProjectModelLock!=='function')
   throw Error('EXISTING_PROJECT_MODEL_LOCK_BINDING_REQUIRED');
  let lease=null,controller=null,result=hold('STUDIO_NOT_STARTED'),released=false;
  const releaseLocal=acquireLocalTrialLock();
  try{
   lease=await bindings.acquireProjectModelLock(request);
   if(typeof lease?.assertHeld!=='function'||typeof lease?.release!=='function'||await lease.assertHeld()!==true)
    throw Error('PROJECT_MODEL_LOCK_NOT_ACQUIRED');
   controller=await createWindowsOwnedOllamaController({pythonExe,ollamaExe,expectedHead,repoRoot:ROOT});
   result=await runR125ArchitecturePlanOwned(args,{controller,studioRequest:request,projectLease:lease,
    calibratedResourceProbe:bindings.calibratedResourceProbe,exactRequestApprovalVerifier:bindings.verifyExactRequestApproval});
  }catch(error){
   if(controller)try{await controller.stop('STUDIO_RUN_EXCEPTION');}catch{}
   result=hold(String(error?.message??'STUDIO_RUN_EXCEPTION').slice(0,160));
  }finally{
   const localReleased=releaseLocal()===true;
   // The existing external operator must verify safe release. It must not
   // release a live shared slot on an unconfirmed stop; it may return false.
   if(lease&&typeof lease.release==='function')try{
    released=await lease.release({modelPostCount:result.modelPostCount,
     unloadConfirmed:result.unloadConfirmed===true,
     ownedServiceStopConfirmed:result.ownedServiceStopConfirmed===true,
     monitorStopConfirmed:result.monitorStopConfirmed===true})===true&&localReleased;
   }catch{}
  }
  // Confirm the actual completed runner artifact, not a fabricated receipt.
  if(result.sourceVerified===true)try{
   const saved=readJson(path.join(args.outDir,'RUN_REPORT.json'),1000000);
   if(saved.sourceVerified!==true||saved.model!==request.model||saved.requestSha256!==request.briefSha256||
      saved.sourceSha256!==result.sourceSha256||saved.geometrySha256!==result.geometrySha256||
      shaText(fs.readFileSync(path.join(args.outDir,'REQUEST_ORIGINAL.txt'),'utf8'))!==request.briefSha256||
      !fs.statSync(path.join(args.outDir,'B143_SOURCE_REVIEW_ONLY.json')).isFile())
    throw Error('STUDIO_RUN_ARTIFACT_MISMATCH');
  }catch{result={...result,sourceVerified:false,reason:'STUDIO_RUN_ARTIFACT_MISMATCH'};}
  const receipt=summarizeR125StudioRun(request,result,args.outDir,released);
  console.log(JSON.stringify(receipt));if(receipt.status!=='SOURCE_READY_REVIEW_ONLY')process.exitCode=2;
  return;
 }
 const controller=await createWindowsOwnedOllamaController({
  pythonExe,ollamaExe,expectedHead,repoRoot:ROOT});
 const result=await runR125ArchitecturePlanOwned(args,{controller,
  calibratedResourceProbe:bindings.calibratedResourceProbe,
  exactRequestApprovalVerifier:bindings.verifyExactRequestApproval});
 console.log(JSON.stringify({schema:result.schema,status:result.status,
  reason:result.reason??null,modelPostCount:result.modelPostCount,
  sourceStatus:result.sourceStatus??null,sourceVerified:result.sourceVerified===true,
  worldWrites:result.worldWrites??0,art:'NOT_REVIEWED'}));
 if(result.status==='HOLD')process.exitCode=2;
}

async function runOwnedCalibrationCli(argv){
 if(argv.length!==0)throw Error('USAGE --calibrate');
 const privateModule=process.env.MAB_V7_PRIVATE_HOST_MODULE;
 const expectedHead=process.env.MAB_HEAD;
 const pythonExe=process.env.MAB_PYTHON_EXE;
 const ollamaExe=process.env.MAB_OLLAMA_EXE;
 if(!path.isAbsolute(privateModule??'')||!HEAD_RE.test(expectedHead??'')||
    !path.isAbsolute(pythonExe??'')||!path.isAbsolute(ollamaExe??''))
  throw Error('PRIVATE_CALIBRATION_AND_DIRECT_EXECUTABLES_REQUIRED');
 const opts={encoding:'utf8',timeout:10000,windowsHide:true};
 const observed=execFileSync('git.exe',['-C',ROOT,'rev-parse','HEAD'],opts).trim();
 const branch=execFileSync('git.exe',['-C',ROOT,'branch','--show-current'],opts).trim();
 const dirty=execFileSync('git.exe',['-C',ROOT,'status','--porcelain=v1',
  '--untracked-files=normal'],opts);
 if(observed!==expectedHead||branch!==BRANCH||dirty!=='')
  throw Error('PINNED_CLEAN_RESEARCH_HEAD_REQUIRED');
 const ci=await checkExactHeadCi(expectedHead);
 if(ci?.safeToRunModel!==true)throw Error('EXACT_HEAD_REQUIRED_CI_NOT_SUCCESS');
 const actual=fs.realpathSync(privateModule);
 if(actual===ROOT||actual.startsWith(ROOT+path.sep)||!fs.statSync(actual).isFile())
  throw Error('PRIVATE_MODULE_MUST_BE_EXTERNAL');
 const bindings=await import(pathToFileURL(actual).href);
 if(!bindings.calibrationRequest||
    typeof bindings.verifyCalibrationRequestApproval!=='function'||
    typeof bindings.saveCalibrationEvidence!=='function')
  throw Error('PRIVATE_CALIBRATION_BINDING_INCOMPLETE');
 if(typeof bindings.acquireProjectModelLock!=='function')
  throw Error('EXISTING_PROJECT_MODEL_LOCK_BINDING_REQUIRED');
 const request=validateCalibrationRequest({body:bindings.calibrationRequest,
  expectedSha256:bindings.calibrationRequestSha256});
 if(!request.valid)throw Error(request.reason);
 const lockRequest={schema:'r125-resource-calibration-request-v1',mode:'calibration',
  headSha:expectedHead,model:MODEL,modelDigest:MODEL_DIGEST,requestSha256:request.requestSha256,
  endpoint:OWNED_ENDPOINT,maxOutputTokens:MAX_OUTPUT_TOKENS,modelPostCount:0};
 let lease=null,controller=null,released=false;
 let result=hold('CALIBRATION_NOT_STARTED',{resourceSafetyCertified:false,inferenceMemoryPeakCalibrated:false});
 const releaseLocal=acquireLocalTrialLock();
 try{
  lease=await bindings.acquireProjectModelLock(lockRequest);
  if(typeof lease?.assertHeld!=='function'||typeof lease?.release!=='function'||await lease.assertHeld()!==true)
   throw Error('PROJECT_MODEL_LOCK_NOT_ACQUIRED');
  controller=await createWindowsOwnedOllamaController({pythonExe,ollamaExe,expectedHead,repoRoot:ROOT});
  result=await runR125ResourceCalibrationOwned({
   calibrationRequest:bindings.calibrationRequest,calibrationRequestSha256:request.requestSha256,
   minimumInputTokens:bindings.minimumInputTokens},{controller,projectLease:lease,
   approvalVerifier:bindings.verifyCalibrationRequestApproval});
 }catch(error){
  result={...result,status:'HOLD',reason:String(error?.message??'CALIBRATION_EXCEPTION').slice(0,160),
   resourceSafetyCertified:false,inferenceMemoryPeakCalibrated:false};
  if(controller)try{await controller.stop('CALIBRATION_EXCEPTION');}catch{}
 }finally{
  const localReleased=releaseLocal()===true;
  if(lease&&typeof lease.release==='function')try{
   released=await lease.release({modelPostCount:result.modelPostCount,
    unloadConfirmed:result.unloadedConfirmed===true,
    ownedServiceStopConfirmed:result.ownedServiceStopConfirmed===true,
    monitorStopConfirmed:result.monitorStopConfirmed===true})===true&&localReleased;
  }catch{}
 }
 result.projectLockReleased=released;
 if(!released&&result.status==='CALIBRATION_PASS'){
  result.status='HOLD';result.reason='PROJECT_LOCK_RELEASE_UNCONFIRMED';
  result.resourceSafetyCertified=false;result.inferenceMemoryPeakCalibrated=false;
 }
 // Persist the evidence only after the actual project lease settlement.
 // A lock/launch failure must not overwrite any previously valid evidence.
 if(result.calibrationRequestSha256)try{await bindings.saveCalibrationEvidence(result);}catch{
  result.status='HOLD';result.reason='PRIVATE_EVIDENCE_WRITE_FAILED';
  result.resourceSafetyCertified=false;result.inferenceMemoryPeakCalibrated=false;
 }
 console.log(JSON.stringify({schema:result.schema,status:result.status,
  reason:result.reason,calibrationRequestSha256:result.calibrationRequestSha256??
   bindings.calibrationRequestSha256,modelPostCount:result.modelPostCount,
  automaticRetries:result.automaticRetries,contextLength:result.contextLength,
  maxOutputTokens:result.maxOutputTokens,unloadedConfirmed:result.unloadedConfirmed,
  ownedServiceStopConfirmed:result.ownedServiceStopConfirmed,
  monitorStopConfirmed:result.monitorStopConfirmed,projectLockReleased:released,
  ownedTagsInitialTimeout:result.ownedTagsInitialTimeout===true,
  ownedTagsReadOnlyRetrySucceeded:result.ownedTagsReadOnlyRetrySucceeded===true,worldWrites:0}));
 if(result.status!=='CALIBRATION_PASS')process.exitCode=2;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const argv=process.argv.slice(2);
  if(argv[0]==='--calibrate')await runOwnedCalibrationCli(argv.slice(1));
  else if(argv[0]==='--prepare-studio-new'){
   const args=parseOwnedArgs(argv.slice(1));
   console.log(JSON.stringify(await prepareR125StudioNewRequest({...args,headSha:process.env.MAB_HEAD})));
  }else await runOwnedCli(argv);
 }
 catch(error){
  if(['--studio-new','--prepare-studio-new'].includes(process.argv[2]))
   console.log(JSON.stringify({schema:'r125-studio-owned-result-v1',mode:'new',status:'HOLD',
    reason:String(error?.message??'R125_OWNED_ARCHPLAN_HOLD').slice(0,160),runPath:null,sourceVerified:false,
    modelPostCount:0,automaticRetries:0,worldContacts:0,worldWrites:0}));
  else console.error('R125_OWNED_ARCHPLAN_HOLD');
  process.exitCode=2;
 }
}
