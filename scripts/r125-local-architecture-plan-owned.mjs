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
import {runR125LocalArchitecturePlan} from './r125-local-architecture-plan-run.mjs';
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
const PORT=11435;
const SAMPLE_KEYS=['ramFreeMiB','commitHeadroomMiB','gpuTotalMiB','gpuFreeMiB','sampleMs'];
const hold=(reason,extra={})=>({schema:'r125-owned-architecture-plan-v1',
 status:'HOLD',reason,model:'qwen3:14b',modelPostCount:0,automaticRetries:0,
 worldContacts:0,worldWrites:0,constructionApproved:false,executionAllowed:false,
 BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),...extra});
const int=x=>Number.isSafeInteger(x)&&x>=0;

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
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mab-r125-owned-'));
 const nonce=randomBytes(16).toString('hex');
 const sessionFile=path.join(dir,'session.json');
 const sampleFile=path.join(dir,'sample.json');
 fs.writeFileSync(sessionFile,JSON.stringify({nonce,headSha:head}),{flag:'wx'});
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
   monitorStopConfirmed:monitor===null||monitor.exitCode!==null,
   reason,servicePid:service?.servicePid};
  stopped=true;
  let ownerStopConfirmed=ownerStopAck;
  if(owner&&owner.exitCode===null){
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
   if(owner.exitCode===null){
    await Promise.race([new Promise(resolve=>owner.once('exit',resolve)),delay(8000)]);
   }
   if(owner.exitCode===null){
    owner.kill();
    await Promise.race([new Promise(resolve=>owner.once('exit',resolve)),delay(5000)]);
   }
  }
  let monitorStopConfirmed=monitor===null||monitor.exitCode!==null;
  if(monitor&&monitor.exitCode===null){
   monitor.kill();
   await Promise.race([new Promise(resolve=>monitor.once('exit',resolve)),delay(5000)]);
   if(monitor.exitCode===null){
    monitor.kill('SIGKILL');
    await Promise.race([new Promise(resolve=>monitor.once('exit',resolve)),delay(5000)]);
   }
   monitorStopConfirmed=monitor.exitCode!==null;
  }
  try{removeOwnedTempDir(dir);}catch{}
  return {stopped:true,ownerStopConfirmed:ownerStopAck,monitorStopConfirmed,
   reason,servicePid:service?.servicePid};
 };
 try{
  monitor=spawnProcess(pythonExe,[SENSOR,'--role','monitor','--folder',dir,'--nonce',nonce],
   {env:{...process.env,MAB_V31_PROBE_NONCE:nonce},windowsHide:true,
    stdio:'ignore'});
  if(!Number.isSafeInteger(monitor.pid)||monitor.pid<=0)
   throw Error('INDEPENDENT_MONITOR_PID_REQUIRED');
  fs.writeFileSync(sessionFile,JSON.stringify({nonce,headSha:head,
   monitorPid:monitor.pid}),{flag:'w'});
  let previous=0,ready=false;
  const monitorDeadline=Date.now()+15000;
  while(Date.now()<monitorDeadline&&!ready){
   if(monitor.exitCode!==null)throw Error('INDEPENDENT_MONITOR_EXITED');
   try{
    const sample=readJson(sampleFile);
    const checked=verifyOwnedArchitectureSample({session:{nonce,monitorPid:monitor.pid},
     sample,owner:{port:PORT,servicePid:1,supervisorPid:1,killOnCloseJob:true},
     headSha:head,previousSequence:previous,now:now()});
    if(checked.independentMonitorActive===true){previous=sample.seq;
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
  if(first.listenerPid!==first.pid||first.monitorPid!==monitor.pid)
   throw Error('OWNED_OLLAMA_LISTENER_MONITOR_PID_MISMATCH');
  service={servicePid:first.pid,supervisorPid:owner.pid,monitorPid:monitor.pid,
   monitorId:nonce,port:PORT,killOnCloseJob:true,headSha:head};
  return {
   ...service,
   async checkResourceSafety({phase='PRE_POST'}={}){
    if(stopped||monitor.exitCode!==null||owner.exitCode!==null)
     return {status:'HOLD',reason:'OWNED_PROCESS_NOT_ALIVE',resourceSafetyCertified:false};
    try{
     const sample=readJson(sampleFile);
     const result=verifyOwnedArchitectureSample({session:{nonce,monitorPid:monitor.pid},
      sample,owner:service,headSha:head,previousSequence:sequence,now:now()});
     if(result.independentMonitorActive===true)sequence=sample.seq;
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

const calibratedClearance=(sample,service,now)=>
 sample?.status==='SAFE_FOR_ONE_REQUEST'&&
 sample?.resourceSafetyCertified===true&&
 sample?.inferenceMemoryPeakCalibrated===true&&
 sample?.model===MODEL&&sample?.modelDigest===MODEL_DIGEST&&
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

/**
 * ArchitecturePlan is the actual contract used by shelterDepth:3. It is not
 * the integrated-semantic V7 IR runner. This gate refuses before POST unless
 * the PRIVATE, model-calibrated probe attests the exact owned service.
 */
export async function runR125ArchitecturePlanOwned(args,{
 controller,calibratedResourceProbe=null,runner=runR125LocalArchitecturePlan,
 fetcher=fetch,exactRequestApprovalVerifier=null,now=()=>Date.now(),timeoutMs=180000
}={}){
 if(args?.repairOnce===true)return hold('OWNED_RUNNER_RETRY_FORBIDDEN');
 if(typeof args?.prompt!=='string'||!/(?:entry\s*[.:]\s*shelterDepth\s*[:=：]\s*3|entry\.shelterDepth\s*[:=：]\s*3)/i.test(args.prompt))
  return hold('SHELTER_DEPTH_3_MUST_BE_IN_ORIGINAL_BRIEF');
 if(!controller||typeof controller.checkResourceSafety!=='function'||
    typeof controller.stop!=='function'||!Number.isSafeInteger(controller.servicePid))
  return hold('OWNED_SERVICE_CONTROLLER_REQUIRED');
 const service=controller;
 const attest=async phase=>{
  const sensor=await service.checkResourceSafety({phase,model:MODEL,
   headSha:service.headSha});
  if(!calibratedResourceProbe)return sensor;
  const calibrated=await calibratedResourceProbe({sensor,service,phase,model:MODEL,
   headSha:service.headSha});
  if(!calibratedClearance(calibrated,service,now()))return sensor;
  return calibrated;
 };
 let pre;
 try{pre=await attest('PRE_POST');}catch{pre=null;}
 if(!calibratedClearance(pre,service,now())){
  const stopped=await service.stop('UNCALIBRATED_PRE_POST_HOLD');
  return hold(pre?.reason??'QWEN_PEAK_CALIBRATION_REQUIRED',{
   observedResourcesMiB:pre?.observedResourcesMiB??null,
   ownedServiceStopConfirmed:stopped?.ownerStopConfirmed===true,
   monitorStopConfirmed:stopped?.monitorStopConfirmed===true});
 }
 // Identity and idle checks are GET-only against the owned endpoint. The
 // shared 11434 daemon is never queried or stopped by this path.
 try{
  const tagsResponse=await fetcher('http://127.0.0.1:11435/api/tags',
   {method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
  const tags=tagsResponse?.ok?await tagsResponse.json():null;
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
 }catch{
  const stopped=await service.stop('OWNED_MODEL_PREFLIGHT_FAILED');
  return hold('OWNED_MODEL_PREFLIGHT_UNAVAILABLE',{
   ownedServiceStopConfirmed:stopped?.ownerStopConfirmed===true,
   monitorStopConfirmed:stopped?.monitorStopConfirmed===true});
 }
 let posts=0,monitorFault=false,previous=pre;
 const monitoredFetch=async(url,init={})=>{
  if(url!=='http://127.0.0.1:11435/v1/chat/completions'||
     init.method!=='POST'||posts!==0){
   monitorFault=true;await service.stop('REQUEST_BOUNDARY_VIOLATION');
   throw Error('OWNED_ARCHPLAN_ONE_POST_BOUNDARY');
  }
  const requestSha256=createHash('sha256').update(String(init.body??'')).digest('hex');
  if(typeof exactRequestApprovalVerifier!=='function'||
     await exactRequestApprovalVerifier({requestSha256,model:MODEL,
      headSha:service.headSha,endpoint:url,maxPosts:1,automaticRetries:0})!==true){
   await service.stop('EXACT_REQUEST_APPROVAL_REQUIRED');
   throw Error('EXACT_ARCHPLAN_REQUEST_APPROVAL_REQUIRED');
  }
  posts++;
  const stopController=new AbortController();
  const signal=init.signal?AbortSignal.any([init.signal,stopController.signal]):stopController.signal;
  let pending=false,closed=false;
  const fault=reason=>{
   if(closed)return;
   monitorFault=true;stopController.abort();
   void service.stop(reason);
  };
  if(init.signal){
   if(init.signal.aborted)fault('MODEL_REQUEST_ABORTED');
   else init.signal.addEventListener('abort',()=>fault('MODEL_REQUEST_ABORTED'),{once:true});
  }
  const pulse=setInterval(()=>{
   if(pending||closed)return;
   pending=true;
   Promise.resolve().then(()=>attest('DURING_INFERENCE')).then(sample=>{
    if(!calibratedClearance(sample,service,now())||
       sample.monitorHeartbeatEpochMs<=previous.monitorHeartbeatEpochMs||
       sample.monitorSequence<=previous.monitorSequence)
     fault('RESOURCE_OR_HEARTBEAT_HOLD');
    else previous=sample;
   }).catch(()=>fault('RESOURCE_MONITOR_FAILED')).finally(()=>{pending=false;});
  },1000);
  try{return await fetcher(url,{...init,signal});}
  finally{closed=true;clearInterval(pulse);}
 };
 let result;
 try{
  result=await runner({...args,model:MODEL,endpoint:'http://127.0.0.1:11435/v1/chat/completions',
   repairOnce:false},{fetcher:monitoredFetch,timeoutMs});
 }catch(error){
  result=hold('ARCHITECTURE_PLAN_RUN_FAILED',{reasonDetail:String(error?.message??error).slice(0,160)});
 }
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
 const stop=await service.stop(unloadConfirmed?'POST_COMPLETE_UNLOADED':'UNLOAD_UNCONFIRMED');
 if(posts>1||monitorFault||!unloadConfirmed||
    stop?.ownerStopConfirmed!==true||stop?.monitorStopConfirmed!==true){
  return hold(monitorFault?'MONITOR_INTERRUPTED':!unloadConfirmed?
   'MODEL_UNLOAD_UNCONFIRMED':'OWNED_SERVICE_STOP_UNCONFIRMED',{
    modelPostCount:posts,unloadConfirmed,ownedServiceStopConfirmed:stop?.ownerStopConfirmed===true,
    monitorStopConfirmed:stop?.monitorStopConfirmed===true,
    sourceStatus:result?.status??null});
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

function parseOwnedArgs(argv){
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
 const args=parseOwnedArgs(argv);
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

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await runOwnedCli(process.argv.slice(2));}
 catch{console.error('R125_OWNED_ARCHPLAN_HOLD');process.exitCode=2;}
}
