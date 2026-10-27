/**
 * R190-N: One-click, source-only local study. One real inference on the first
 * run only; later runs reuse cryptographically checked original evidence.
 * No model downloads, remote endpoints, Git mutation or Minecraft API.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseR190Arguments,runR190Local} from './r190-local-semantic-run.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT=path.resolve(here,'..');
export const EVIDENCE_ROOT=path.join(REPO_ROOT,'r190n-local-evidence');
export const INDEPENDENT_SPEC=path.join(here,'fixtures','r190n-independent-program.json');
export const STUDY_BRIEF='海辺に漂着した素材を再生する小規模な公共施設を設計してください。'+
 '独立した展示室、修理工房、資材保管室を設け、展示と修理の部屋を直接接続してください。'+
 '雨水を考えた鋸歯状の屋根を一つの室に採用し、各室の実際の目的、寸法、'+
 '外からの入り方、通行経路、立体構成を考えてください。'+
 '建築形式のテンプレートを使わずにあなた自身で設計し、'+
 'できない要件を達成済みと主張しないでください。';
export const REQUIRED_CAPABILITIES=Object.freeze(['roof-profile-design']);
const SHA=x=>createHash('sha256').update(x,'utf8').digest('hex');
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const BASE_URL='http://127.0.0.1:11434/api/tags';
const fail=reason=>{throw Error('R190N_'+reason);};
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function parseR190NArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const opts={model:null,fresh:false,replay:null};
 for(let i=0;i<args.length;i++){
  const flag=args[i];
  if(flag==='--fresh'&&!opts.fresh){opts.fresh=true;continue;}
  if(flag==='--model'&&opts.model===null&&args[i+1]){
   opts.model=args[++i];continue;
  }
  if(flag==='--replay'&&opts.replay===null&&args[i+1]){
   opts.replay=args[++i];continue;
  }
  fail('INVALID_OPTION_'+String(flag));
 }
 if(opts.model!==null&&!MODEL.test(opts.model))fail('INVALID_MODEL_ID');
 if(opts.replay&&opts.fresh)fail('REPLAY_AND_FRESH_CONFLICT');
 return opts;
}
export function chooseR190NModel(installed,requested=null){
 if(!Array.isArray(installed))fail('MISSING_INSTALLED_MODELS');
 const models=[...new Set(installed.filter(x=>typeof x==='string'&&MODEL.test(x)))];
 if(requested!==null){
  if(!MODEL.test(requested)||!models.includes(requested))
   fail('REQUESTED_MODEL_NOT_INSTALLED');
  return requested;
 }
 // Favor the previously user-tested smaller model. No implicit downloads.
 const preferred=['qwen3:14b','qwen3.8:27b','gemma4:26b','qwen3:27b'];
 for(const name of preferred)if(models.includes(name))return name;
 const other=models.filter(x=>/^(qwen|gemma)/i.test(x)).sort();
 if(other.length)return other[0];
 fail('NO_INSTALLED_QWEN_OR_GEMMA');
}
async function localModels(fetcher){
 let response;
 try{response=await fetcher(BASE_URL,{method:'GET',
  redirect:'error',signal:AbortSignal.timeout(8000)});}
 catch{fail('LOCAL_OLLAMA_UNAVAILABLE');}
 if(response?.ok!==true)fail('LOCAL_OLLAMA_TAGS_FAILED');
 let doc;
 try{doc=await response.json();}catch{fail('INVALID_OLLAMA_TAGS');}
 if(!Array.isArray(doc?.models))fail('INVALID_OLLAMA_TAGS');
 return doc.models.map(x=>x?.name);
}
const receiptFile=dir=>path.join(dir,'R190_M_EVIDENCE_RECEIPT.json');
const rawFile=dir=>path.join(dir,'R190_M_UNMODIFIED_MODEL_RESPONSE.txt');
const manifestFile=dir=>path.join(dir,'R190N_STUDY_MANIFEST.json');
function checkedReceipt(dir){
 try{
  const r=JSON.parse(fs.readFileSync(receiptFile(dir),'utf8'));
  const original=fs.readFileSync(rawFile(dir),'utf8');
  if(r.schema!=='minecraftaibuilder-r190-m-semantic-evidence-v1'||
    r.originalRawSha256!==SHA(original)||
    r.originalBriefSha256!==SHA(STUDY_BRIEF)||
    r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
    r.executionAllowed!==false||r.worldContacts!==0||r.worldWrites!==0||
    !Array.isArray(r.gates)||r.gates.length!==9||
    r.gates.some(x=>x!=='BLOCKED')||
    r.BuildPlan?.operations?.length!==0)return null;
  return r;
 }catch{return null;}
}
function findReuse(evidenceRoot,model,specSha){
 if(!fs.existsSync(evidenceRoot))return null;
 const dirs=fs.readdirSync(evidenceRoot,{withFileTypes:true})
  .filter(x=>x.isDirectory()).map(x=>x.name).sort().reverse();
 for(const name of dirs){
  const dir=path.join(evidenceRoot,name);
  try{
   const m=JSON.parse(fs.readFileSync(manifestFile(dir),'utf8'));
   if(m.schema!=='minecraftaibuilder-r190n-study-v1'||
    m.briefSha256!==SHA(STUDY_BRIEF)||m.specSha256!==specSha||
    m.schemaRevision!=='R190N_FIRST_REAL_STUDY_V1'||
    (model!==null&&m.modelRequestedOrClaimed!==model))continue;
   const receipt=checkedReceipt(dir);
   if(receipt?.originalRawSha256!==m.originalRawSha256)continue;
   return {directory:dir,manifest:m,receipt};
  }catch{continue;}
 }
 return null;
}
export async function runR190NStudy(args=[],{
 fetcher=fetch,modelRunner=runR190Local,
 evidenceRoot=EVIDENCE_ROOT,expectFile=INDEPENDENT_SPEC,
 timestamp=()=>Date.now()
}={}){
 const opts=Array.isArray(args)?parseR190NArgs(args):args;
 if(opts.help)return {help:
  'RUN_R190N_REAL_MODEL.cmd [--model <installed-tag>] [--fresh] [--replay <original-response.txt>]'+
  ' | without --fresh reuses verified evidence before making any new model request'};
 if(!opts||!isObject(opts)||opts.model!==null&&
  (typeof opts.model!=='string'||!MODEL.test(opts.model)))fail('INVALID_OPTIONS');
 // Verify the independent, non-model-authored user requirements BEFORE a
 // potentially expensive inference. This is not a full Japanese NLP judge.
 const specRaw=fs.readFileSync(expectFile,'utf8');
 const {validateR190ProgramSpec}=await import('../source/ai/r190-request-coverage.mjs');
 validateR190ProgramSpec(JSON.parse(specRaw));
 const specSha=SHA(specRaw);
 if(!opts.fresh&&!opts.replay){
  const cache=findReuse(evidenceRoot,opts.model,specSha);
  if(cache)return {status:cache.receipt.status,directory:cache.directory,
   reused:true,actualNewModelRequests:0,
   originalRawSha256:cache.receipt.originalRawSha256,
   sourceGenerated:cache.receipt.sourceGenerated,
   sourceKind:cache.receipt.sourceKind,
   independentBriefAcceptance:cache.receipt.independentBriefAcceptance,
   humanArtReview:'ART_HOLD',worldWrites:0};
 }
 let selected=opts.model??'archived-model-unknown';
 if(!opts.replay)selected=chooseR190NModel(await localModels(fetcher),opts.model);
 const base=path.resolve(evidenceRoot);
 fs.mkdirSync(base,{recursive:true});
 const dir=path.join(base,
  'r190n-'+String(timestamp())+'-'+String(process.pid));
 if(fs.existsSync(dir))fail('OUTPUT_COLLISION');
 const modelArgs=['--mode','semantic','--model',selected,
  '--prompt',STUDY_BRIEF,'--out',dir,'--expect',expectFile,
  '--required',REQUIRED_CAPABILITIES.join(',')];
 if(opts.replay)modelArgs.push('--replay',path.resolve(opts.replay));
 let capturedError=null,report;
 try{
  report=await modelRunner(parseR190Arguments(modelArgs),{fetcher});
 }catch(e){capturedError=e;}
 // On a model response HOLD the R190-M runner preserves original and reason.
 // Do not claim that a connection error produced a model run.
 const receipt=checkedReceipt(dir);
 if(!receipt){
  if(capturedError)throw capturedError;
  fail('NO_CAPTURED_OR_VERIFIED_SOURCE');
 }
 const manifest={
  schema:'minecraftaibuilder-r190n-study-v1',
  schemaRevision:'R190N_FIRST_REAL_STUDY_V1',
  status:receipt.status,
  modelRequestedOrClaimed:selected,
  modelIdentityCryptographicallyVerified:false,
  modelWasInLocalTagList:!opts.replay,
  replayOnly:!!opts.replay,
  actualNewModelRequests:opts.replay?0:1,
  briefSha256:SHA(STUDY_BRIEF),specSha256,
  originalRawSha256:receipt.originalRawSha256,
  strictIndependentProgramResult:receipt.independentBriefAcceptance,
  modelAuthoredB143:false,
  sourceKind:receipt.sourceKind,
  hostDeterminedRoomCoordinates:receipt.hostDeterminedRoomCoordinates,
  sourceGenerated:receipt.sourceGenerated,
  rejectionReason:receipt.rejectedReason,
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0
 };
 fs.writeFileSync(manifestFile(dir),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return {status:manifest.status,directory:dir,reused:false,
  actualNewModelRequests:manifest.actualNewModelRequests,
  originalRawSha256:manifest.originalRawSha256,
  sourceGenerated:manifest.sourceGenerated,sourceKind:manifest.sourceKind,
  independentBriefAcceptance:manifest.strictIndependentProgramResult,
  rejectedReason:manifest.rejectionReason,
  humanArtReview:'ART_HOLD',worldWrites:0,
  modelRunnerHOLD:capturedError!==null};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190NStudy(process.argv.slice(2)).then(r=>{
  console.log(JSON.stringify(r,null,2));
  if(r.reused)console.log('R190N: saved original reused, zero model requests.');
  else if(r.sourceGenerated)console.log('R190N: HOST-projected 3D is in the evidence directory (not direct model B143).');
  else console.log('R190N: original preserved under HOLD; no falsely approved 3D.');
  if(r.status?.startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{
  console.error('R190N_FAIL_CLOSED',String(e?.message??e));
  process.exitCode=1;
 });
}
