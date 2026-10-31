/** Japanese text -> one local Ollama response -> protected offline MakeCode.
 * World edits, original project tree edits and automatic retries: NEVER.
 */
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PALETTE=path.join(ROOT,'configs','r125-education-verified-palette-v26.33.json');
const script=path.join(ROOT,'scripts','r125-japanese-makecode.mjs');
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const warn='R125: one/two floors, 16-32 block plan, two spaces per level. '
 +'Supported structural materials: stone and oak_planks; windows: glass. '
 +'Unsupported materials or unverifiable shapes are HOLD, not silently replaced.';
export function parseFreeBuildArgs(args){
 if(!Array.isArray(args)||args.length%2!==0)throw Error('R125_FREE_BUILD_ARGS');
 const opts={model:'qwen3:14b',prompt:null,plan:null,outRoot:null};
 for(let i=0;i<args.length;i+=2){
  const name=args[i],value=args[i+1];
  if(!['--prompt','--model','--plan','--out-root'].includes(name)||
   typeof value!=='string'||!value.trim())throw Error('R125_FREE_BUILD_ARG_'+name);
  const key={'--prompt':'prompt','--model':'model','--plan':'plan','--out-root':'outRoot'}[name];
  if((key==='prompt'&&opts.prompt!==null)||(key==='plan'&&opts.plan!==null)||
   (key==='model'&&opts.model!=='qwen3:14b')||(key==='outRoot'&&opts.outRoot!==null))
   throw Error('R125_FREE_BUILD_DUPLICATE');
  opts[key]=value;
 }
 if(!MODEL.test(opts.model))throw Error('R125_FREE_BUILD_MODEL');
 if(opts.prompt!==null&&opts.plan!==null)throw Error('R125_FREE_BUILD_EXCLUSIVE');
 if(opts.prompt!==null&&(opts.prompt.trim().length<8||opts.prompt.length>4000))
  throw Error('R125_FREE_BUILD_PROMPT_LENGTH');
 return opts;
}
export async function runFreeBuild(opts,{child=spawnSync}={}){
 if(!fs.existsSync(PALETTE)||!fs.existsSync(script))throw Error('R125_FREE_BUILD_INSTALL_INCOMPLETE');
 const root=opts.outRoot?path.resolve(opts.outRoot):path.join(path.dirname(ROOT),'MinecraftAIBuilder-FreeBuild-Outputs');
 fs.mkdirSync(root,{recursive:true});
 const runDir=path.join(root,new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(4).toString('hex'));
 fs.mkdirSync(runDir,{recursive:false});
 const destination=path.join(runDir,'generated');
 const request=opts.plan?{mode:'SAVED_PLAN',plan:path.resolve(opts.plan)}:
  {mode:'ONE_LOCAL_OLLAMA_REQUEST',model:opts.model,prompt:opts.prompt};
 fs.writeFileSync(path.join(runDir,'REQUEST.json'),JSON.stringify(request,null,2)+'\n',{flag:'wx'});
 const args=[script,'--out',destination,'--palette',PALETTE];
 if(opts.plan)args.push('--plan',path.resolve(opts.plan));
 else args.push('--prompt',opts.prompt,'--model',opts.model);
 console.log('Starting one local request. No Minecraft contact and no automatic retries.');
 const result=child(process.execPath,args,{cwd:ROOT,encoding:'utf8',windowsHide:true,maxBuffer:1024*1024*4});
 const log=String(result.stdout??'')+'\n'+String(result.stderr??'');
 fs.writeFileSync(path.join(runDir,'RUN_LOG.txt'),log,{flag:'wx'});
 const reportPath=path.join(destination,'makecode','EXPORT_REPORT.json');
 const planReport=path.join(destination,'EXPORT_REPORT.json');
 const reportFile=fs.existsSync(planReport)?planReport:reportPath;
 if(result.error||result.status!==0||!fs.existsSync(reportFile)){
  const status={status:'HOLD',reason:result.error?.message??('Model or exporter did not produce an approved code; exit='+result.status),
   output:runDir,worldWrites:0,modelRequestsAllowed:opts.plan?0:1};
  fs.writeFileSync(path.join(runDir,'RESULT.json'),JSON.stringify(status,null,2)+'\n',{flag:'wx'});
  console.error('HOLD. Review '+path.join(runDir,'RUN_LOG.txt'));
  return status;
 }
 const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
 const ts=path.join(path.dirname(reportFile),'MAKECODE_EDUCATION.ts');
 const counts=report.plannedBlockCounts;
 const actualCodeSha=fs.existsSync(ts)?createHash('sha256').update(fs.readFileSync(ts)).digest('hex'):null;
 if(!fs.existsSync(ts)||report.worldWrites!==0||report.programExecuted!==false||
  report.materialMode!=='STRICT_USER_ATTESTED'||!report.verifiedPaletteSha256||
  actualCodeSha!==report.makecodeSourceSha256||
  !counts||Object.values(counts).reduce((a,b)=>a+b,0)!==report.plannedVoxelCount){
  const status={status:'HOLD_OFFLINE_REPORT',output:runDir,worldWrites:0};
  fs.writeFileSync(path.join(runDir,'RESULT.json'),JSON.stringify(status,null,2)+'\n',{flag:'wx'});
  console.error('HOLD: exporter evidence is incomplete. No world activity occurred.');
  return status;
 }
 const status={status:'MAKECODE_READY_HUMAN_REVIEW_REQUIRED',
  output:runDir,makecode:ts,plannedVoxelCount:report.plannedVoxelCount,
  plannedBlockCounts:counts,sourceSha256:report.sourceSha256,
  geometrySha256:report.geometrySha256,makecodeSourceSha256:report.makecodeSourceSha256,
  worldWrites:0,actualWorldBuild:'NOT_ATTEMPTED_BY_THIS_TOOL'};
 fs.writeFileSync(path.join(runDir,'RESULT.json'),JSON.stringify(status,null,2)+'\n',{flag:'wx'});
 console.log('MakeCode prepared (not built): '+ts);
 console.log('Planned materials: '+JSON.stringify(counts));
 console.log('Review saved design and site. ONLY a new backed-up test-world copy.');
 console.log('Then paste code, run mabset, inspect area, run mabbuild ONCE.');
 console.log('Wait for "Placing attempted" before mabverify; check entrance/rooms separately.');
 return status;
}
async function main(){
 const opts=parseFreeBuildArgs(process.argv.slice(2));
 console.log(warn);
 if(!opts.prompt&&!opts.plan){
  const rl=createInterface({input:process.stdin,output:process.stdout});
  try{opts.prompt=(await rl.question('建てたい建物を日本語で入力してください: ')).trim();}
  finally{rl.close();}
  if(opts.prompt.length<8||opts.prompt.length>4000)throw Error('R125_FREE_BUILD_PROMPT_LENGTH');
 }
 const status=await runFreeBuild(opts);
 if(status.status!=='MAKECODE_READY_HUMAN_REVIEW_REQUIRED')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error('HOLD: '+e.message);process.exitCode=2;});
}
