/**
 * R190-Y: one entrypoint for an evidence-safe R190-R -> S/W -> X trial.
 * DEFAULT IS READ-ONLY/OFFLINE. New Ollama requests require --run-missing
 * plus a separate affirmative choice in RUN_R190Y_COMPARE_ALL.cmd.
 * Existing original responses, failed results and world are never modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {r190rEvidenceRoot} from './r190r-one-click-direct-study.mjs';
import {inspectR190SOriginal,runR190SStudy} from './r190s-evidence-redesign.mjs';
import {runR190WStudy} from './r190w-two-stage-study.mjs';
import {compareR190XSaved} from './r190x-saved-quality-compare.mjs';

const fail=why=>{throw Error('R190Y_'+why)};
const blocked=()=>({
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0
});
const directory=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
export function parseR190YArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const options={from:null,runMissing:false};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--run-missing'&&!options.runMissing){
   options.runMissing=true;continue;
  }
  if(args[i]==='--from'&&options.from===null&&
     typeof args[i+1]==='string'&&args[i+1].length){
   options.from=args[++i];continue;
  }
  fail('ARGUMENTS');
 }
 return options;
}
export function selectR190YOriginal(from=null){
 if(from!==null){
  const verified=inspectR190SOriginal(from);
  return {directory:verified.directory,rawSha256:verified.rawSha256,
   model:verified.model};
 }
 const root=r190rEvidenceRoot();
 if(!directory(root))fail('R190R_CANONICAL_EVIDENCE_MISSING');
 const found=fs.readdirSync(root).filter(x=>/^r190r-\d+-\d+$/.test(x)).sort().reverse();
 if(found.length===0)fail('R190R_SAVED_ORIGINAL_MISSING');
 // Do not fall back to older files if the newest source is damaged.
 const latest=path.join(root,found[0]);
 if(!directory(latest))fail('R190R_UNSAFE_DIRECTORY');
 const verified=inspectR190SOriginal(latest);
 return {directory:verified.directory,rawSha256:verified.rawSha256,model:verified.model};
}
/**
 * One comparison is observational only: S and W have different request budgets.
 * An ART winner is never selected here. Without --run-missing, NO model path
 * can be reached, including on missing/corrupt results.
 */
export async function runR190YTrial(args=[],{
 baseline=selectR190YOriginal,runS=runR190SStudy,
 runW=runR190WStudy,compare=compareR190XSaved,
 fetcher=fetch
}={}){
 const o=Array.isArray(args)?parseR190YArgs(args):args;
 if(o?.help)return {help:'Saved only: RUN_R190Y_COMPARE_ALL.cmd (C). Explicit up to 3 local requests: choose G or node scripts/r190y-comparison-pilot.mjs --run-missing.'};
 if(!o||typeof o.runMissing!=='boolean'||(o.from!==null&&typeof o.from!=='string'))
  fail('OPTIONS');
 const original=baseline(o.from);
 if(!original||!directory(original.directory)||typeof original.rawSha256!=='string'||
  !/^[0-9a-f]{64}$/.test(original.rawSha256)||
  typeof original.model!=='string'||original.model.length<2)
  fail('BASELINE_UNVERIFIED');
 const originalPath=original.directory;
 if(!o.runMissing){
  const x=compare({from:originalPath});
  return {schema:'minecraftaibuilder-r190y-pilot-v1',
   status:x.status,mode:'SAVED_ONLY',modelCalls:0,
   baselineOriginalSha256:original.rawSha256,modelClaimed:original.model,
   comparisonDirectory:x.directory??null,comparisonFile:x.report??null,
   mayContactLocalModel:false,quality:'NOT_CERTIFIED',
   humanArtReview:'ART_HOLD',...blocked()};
 }
 // Explicit path. The S/W modules each independently verify the SAME
 // archived original. They ONLY replay good cached responses or call Ollama.
 // Never pass --fresh, retry, substitute geometry, or touch a Minecraft world.
 let actualCalls=0;
 let s;
 try{
  s=await runS(['--from',originalPath],{transport:'openai',fetcher});
 }catch(e){
  fail('S_SOURCE_OR_PROVIDER_HOLD_'+String(e?.message??'FAILED').slice(0,120));
 }
 if(!Number.isSafeInteger(s?.modelCalls)||s.modelCalls<0||s.modelCalls>1)
  fail('S_MODEL_CALL_BUDGET');
 actualCalls+=s.modelCalls;
 if(typeof s.directory!=='string'||!directory(s.directory))
  fail('S_EVIDENCE_MISSING');
 let w;
 try{
  w=await runW(['--from',originalPath],{fetcher});
 }catch(e){
  fail('W_SOURCE_OR_PROVIDER_HOLD_AFTER_S_'+actualCalls+'_'+
   String(e?.message??'FAILED').slice(0,120));
 }
 if(!Number.isSafeInteger(w?.modelCalls)||w.modelCalls<0||w.modelCalls>2)
  fail('W_MODEL_CALL_BUDGET');
 actualCalls+=w.modelCalls;
 if(typeof w.directory!=='string'||!directory(w.directory))
  fail('W_EVIDENCE_MISSING');
 // Never search for an unrelated latest model result: use exactly the
 // two directories returned for this baseline.
 const x=compare({from:originalPath,s:s.directory,w:w.directory});
 return {schema:'minecraftaibuilder-r190y-pilot-v1',
  status:x.status,mode:'EXPLICIT_LOCAL_GENERATE_OR_REUSE',
  baselineOriginalSha256:original.rawSha256,modelClaimed:original.model,
  sourceS:s.directory,sourceW:w.directory,
  sourceSStatus:s.status,sourceWStatus:w.status,
  modelCallsReportedByCompletedRunners:actualCalls,
  modelCallUpperBound:3,comparisonDirectory:x.directory??null,
  comparisonFile:x.report??null,
  sameModelRequestString:true,causalWinnerCertified:false,
  quality:'NOT_CERTIFIED',humanArtReview:'ART_HOLD',...blocked()};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190YTrial(process.argv.slice(2)).then(r=>{
  console.log(JSON.stringify(r,null,2));
  if(String(r.status).startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{console.error('R190Y_HOLD',String(e?.message??e));process.exitCode=2});
}
