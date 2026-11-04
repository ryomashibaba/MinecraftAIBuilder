/**
 * V4J research: ONE voluntarily started local Qwen 5-genre representative
 * study, here selecting one of the FIVE original briefs. Always one POST,
 * exactly one ORIGINAL private response, zero fallback models and no world IO.
 *
 * This tests Ollama structured-output compatibility before spending five
 * sequential Qwen runs. Fake CI responses can never be promoted.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FIVE_INDEPENDENT_BRIEFS} from './r125-v4j-five-genre-local.mjs';
import {runV4DLocalAuthor} from './r125-v4d-local-architect.mjs';
import {replayPrivateV4D} from './r125-v4d-replay-private.mjs';
import {buildV4DShareableReceipt}
 from './r125-v4d-shareable-receipt.mjs';
import {V4J_STRUCTURED_PROTOCOL}
 from '../source/ai/r125-v4j-structured-author-schema.mjs';

const fail=x=>{throw Error('R125_V4J_V3_ONE_STUDY_'+x);};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inside=(a,b)=>a===b||a.startsWith(b+path.sep);
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
export function parseV3OneArgs(args){
 if(args.length!==4&&args.length!==6)fail('ARGS_MODEL_OUT_OPTIONAL_GENRE');
 const opt=Object.create(null),keys=new Set(['--model','--out','--genre']);
 for(let i=0;i<args.length;i+=2){
  const k=args[i],v=args[i+1];
  if(!keys.has(k)||Object.hasOwn(opt,k)||typeof v!=='string'||!v||
   v.startsWith('--'))fail('ARGUMENTS');
  opt[k]=v;
 }
 if(!MODEL.test(opt['--model']??'')||
  typeof opt['--out']!=='string'||opt['--out'].length<2||
  (opt['--genre']!==undefined&&
   !FIVE_INDEPENDENT_BRIEFS.some(x=>x.genre===opt['--genre'])))
  fail('MODEL_OUTPUT_OR_GENRE');
 return {model:opt['--model'],outDir:opt['--out'],
  genre:opt['--genre']??'housing'};
}
export async function runV3OneGenreStudy(options,{
 runOne=runV4DLocalAuthor,replay=replayPrivateV4D,fetcher=fetch,
 timeoutMs=180000
}={}){
 if(!options||!MODEL.test(options.model??'')||
  typeof options.outDir!=='string'||!Number.isSafeInteger(timeoutMs)||
  timeoutMs<1000||timeoutMs>300000)fail('OPTIONS');
 const brief=FIVE_INDEPENDENT_BRIEFS.find(x=>x.genre===options.genre);
 if(!brief)fail('UNKNOWN_GENRE');
 const out=path.resolve(options.outDir),parent=path.dirname(out);
 if(fs.existsSync(out)||!fs.existsSync(parent)||
  !fs.statSync(parent).isDirectory()||fs.lstatSync(parent).isSymbolicLink()||
  inside(out,fs.realpathSync(ROOT))||inside(fs.realpathSync(parent),fs.realpathSync(ROOT)))
  fail('NEW_PRIVATE_OUTSIDE_REPOSITORY_ONLY');
 if(typeof runOne!=='function'||typeof replay!=='function')fail('RUNNER');
 const injected=runOne!==runV4DLocalAuthor||fetcher!==fetch||
  process.env.MAB_V4D_TEST_DOUBLE_MODE==='1';
 const report=await runOne({
  model:options.model,outDir:out,prompt:brief.prompt,authorArcade:true,
  precisionCivicContract:true,structuredCivicContract:true
 },{fetcher,timeoutMs});
 const receipt=buildV4DShareableReceipt(report);
 if(injected&&receipt.explicitlyInjectedTestResponse!==true)
  fail('TEST_DOUBLE_IDENTITY_MISSING');
 let replayStatus='NOT_ATTEMPTED_NO_SAVED_MODEL_RESPONSE',
  compilerRejectCode=null,replayAdditionalModelCalls=0;
 if(report.rawCaptured===true){
  try{
   const result=replay(out,out+'-replay');
   replayStatus=result.status;
   compilerRejectCode=result.compilerRejectCode??null;
   replayAdditionalModelCalls=result.additionalModelCalls;
  }catch{
   replayStatus='HOLD_OFFLINE_REPLAY_SAFE_STOP';
  }
 }
 const safe={
  schema:'minecraftaibuilder-v4j-v3-one-genre-safe-handoff-v1',
  genre:brief.genre,promptProtocol:V4J_STRUCTURED_PROTOCOL,
  reportedStatus:receipt.reportedStatus,
  sourceCandidateVerified:!injected&&receipt.sourceCandidateVerified,
  explicitlyInjectedTestResponse:receipt.explicitlyInjectedTestResponse,
  modelGenerationAttempts:receipt.modelCallAttempts,
  replayStatus,compilerRejectCode,replayAdditionalModelCalls,
  systemSchemaEnforcementNotIndependentlyVerified:true,
  noPromptOrRawSourceOrPrivatePathIncluded:true,
  humanArchitecturalArt:'NOT_REVIEWED',
  minecraftRealWalking:'NOT_TESTED',
  modelIdentityCryptographicallyAuthenticated:false,
  worldContacts:0,worldWrites:0,
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED')
 };
 fs.writeFileSync(path.join(out,'V4J_V3_ONE_SHAREABLE.json'),
  JSON.stringify(safe,null,2)+'\n',{flag:'wx'});
 return safe;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const options=parseV3OneArgs(process.argv.slice(2));
  const result=await runV3OneGenreStudy(options);
  console.log(JSON.stringify({status:result.reportedStatus,
   replay:result.replayStatus,modelCalls:result.modelGenerationAttempts,
   shareOnly:'V4J_V3_ONE_SHAREABLE.json',worldWrites:0}));
  if(!result.sourceCandidateVerified)process.exitCode=2;
 }catch{console.error('V4J_V3_ONE_SOURCE_HOLD');process.exitCode=2;}
}
