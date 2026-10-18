/**
 * One-command opt-in LOCAL ONLY paired Japanese architectural model trial.
 * No API keys; never launches a provider; never contacts non-loopback URLs.
 *
 * node scripts/b198k-local-comparison.mjs --model MODEL_ID --out ./NEW-RESULT
 *   [--cases 1..12] [--no-revisions]
 *   [--endpoint http://127.0.0.1:11434/v1/chat/completions]
 *   [--directed-attempts 1..3] [--directed-repairs 0..2]
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {createB198ILocalPlanner}
 from '../source/ai/b198i-local-planner.mjs';
import {runB198KPairedStudy}
 from '../source/ai/b198k-paired-study.mjs';
const fail=s=>{throw Error('B198K_CLI_'+s)};
export const GUIDE='node scripts/b198k-local-comparison.mjs --model ID --out NEW_DIR [--cases 1..12] [--no-revisions] [--stop-on-timeout] [--timeout-seconds 30..900] [--endpoint http://127.0.0.1:PORT/v1/chat/completions] [--directed-attempts 1..3] [--directed-repairs 0..2]';
export function parseB198KArgs(args=[]){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const seen={};
 const values=new Set(['--model','--out','--cases','--endpoint',
  '--directed-attempts','--directed-repairs','--timeout-seconds']);
 for(let i=0;i<args.length;i++){
  const flag=args[i];
  if(flag==='--no-revisions'||flag==='--stop-on-timeout'){
   if(seen[flag])fail('DUPLICATE_FLAG');
   seen[flag]=true;continue;
  }
  if(!values.has(flag)||seen[flag]!==undefined)fail('INVALID_FLAG_'+flag);
  if(!args[i+1]||args[i+1].startsWith('--'))fail('MISSING_'+flag);
  seen[flag]=args[++i];
 }
 if(!seen['--model']||!seen['--out'])fail('EXPLICIT_MODEL_AND_OUTPUT_REQUIRED');
 const num=(name,def,re)=>{
  const raw=seen[name]??String(def);
  if(!re.test(raw))fail('INVALID_'+name);
  return Number(raw);
 };
 return {modelId:seen['--model'],outDir:path.resolve(seen['--out']),
  endpoint:seen['--endpoint']??null,
  creationCount:num('--cases',12,/^(?:[1-9]|1[0-2])$/),
  directedAttempts:num('--directed-attempts',3,/^[1-3]$/),
  directedTopologyRounds:num('--directed-repairs',1,/^[0-2]$/),
  includeRevisions:!seen['--no-revisions'],
  stopOnTimeout:!!seen['--stop-on-timeout'],
  timeoutSeconds:num('--timeout-seconds',360,/^(?:[3-9][0-9]|[1-8][0-9]{2}|900)$/)};
}
export async function runB198KCli(options,{generator=null,planner=null}={}){
 if(options.help)return {help:GUIDE};
 // Always construct the strict loopback adapters, even if test functions
 // are injected; malformed or paid endpoints must never be accepted.
 const cfg={model:options.modelId,
  timeoutMs:(options.timeoutSeconds??360)*1000,
  ...(options.endpoint?{endpoint:options.endpoint}:{})};
 const liveGenerator=createB198GLocalModelAdapter(cfg);
 const livePlanner=createB198ILocalPlanner(cfg);
 return runB198KPairedStudy({
  generator:generator??liveGenerator,planner:planner??livePlanner,
  modelId:options.modelId,outDir:options.outDir,
  creationCount:options.creationCount,
  includeRevisions:options.includeRevisions,
  directedAttempts:options.directedAttempts,
  directedTopologyRounds:options.directedTopologyRounds,
  providerOrigin:generator===null&&planner===null?
   'EXPLICIT_LOCAL_LOOPBACK':'INJECTED_TEST_DOUBLE',
  directAttempts:1,
  stopOnTimeout:options.stopOnTimeout??false,
  onModelCall:info=>console.log('B198P_MODEL_CALL',JSON.stringify(info))
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseB198KArgs(process.argv.slice(2));
  const result=await runB198KCli(opts);
  if(result.help)console.log(result.help);
  else console.log('B198K_SOURCE_ONLY_QUALITY_REVIEW_READY',JSON.stringify({
   output:opts.outDir,modelRequested:opts.modelId,
   sourcePairedCases:result.counts.directlyComparableWithBothSources,
   providerCallTimings:result.timing?.calls?.length??0,
   modelAbortCount:result.timing?.timeoutOrAbortCount??0,
   humanScores:result.counts.humanVisualRatings,
   providerOrigin:result.providerOrigin,
   readiness:result.safety.readiness,worldWrites:0,
   next:'Open index.html locally and review independent actual source 3D scenes'
  }));
 }catch(e){console.error('B198K_HOLD',String(e.message??e));process.exitCode=1;}
}
