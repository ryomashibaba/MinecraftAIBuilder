/**
 * R190-BD: optional ONE model request from an already SHA-pinned R190-BC
 * Japanese brief. Reuses the existing direct-B143/R4 provider runner.
 * DEFAULT IS PREFLIGHT-ONLY. No auto retry, no world/placement operations.
 * The provider response is not model identity or architectural approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildR190BCDesignFirstPrompt,reviewR190BCOriginal,
 renderR190BCSectionSVG} from './r190bc-design-first-section.mjs';
import {runR190Local} from './r190-local-semantic-run.mjs';
import {inspectR190BJPrepared} from './r190bj-failure-informed-prompt.mjs';

export const R190BD_SCHEMA='minecraftaibuilder-r190bd-consented-design-first-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190BD_'+x)};
const MODEL=/^(?:qwen|gemma)[A-Za-z0-9._:/-]{1,130}$/i;
const sha=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 constructionAllowed:false,art:'ART_HOLD',officialArtAdoptions:0});
const dir=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
const readFile=(root,name,max=120000)=>{
 const filename=path.join(root,name),st=fs.lstatSync(filename);
 if(!st.isFile()||st.isSymbolicLink()||st.size<1||st.size>max)fail('UNSAFE_INPUT_'+name);
 return fs.readFileSync(filename);
};
const expectedSafety=m=>m?.readiness==='NOT_PREPARED'&&
 m.constructionApproved===false&&m.executionAllowed===false&&
 m.worldContacts===0&&m.worldWrites===0&&
 Array.isArray(m.gates)&&m.gates.length===9&&m.gates.every(x=>x==='BLOCKED')&&
 Array.isArray(m.BuildPlan?.operations)&&m.BuildPlan.operations.length===0;
export function inspectR190BDPrepared(sourceDir){
 if(typeof sourceDir!=='string'||!path.isAbsolute(sourceDir)||!dir(sourceDir))
  fail('PREPARED_DIRECTORY');
 if(fs.existsSync(path.join(sourceDir,'R190BJ_PROMPT_RECEIPT.json')))
  return inspectR190BJPrepared(sourceDir);
 const brief=readFile(sourceDir,'ORIGINAL_BRIEF.txt',20000);
 const prompt=readFile(sourceDir,'DESIGN_FIRST_PROMPT.txt',25000);
 const m=JSON.parse(readFile(sourceDir,'R190BC_PROMPT_RECEIPT.json',12000));
 if(m.schema!=='minecraftaibuilder-r190bc-offline-prompt-v1'||
    !expectedSafety(m)||m.newModelRequests!==0||m.originalUnmodified!==true||
    m.hostGeneratedGeometry!==false||!sha(m.originalBriefSha256)||
    !sha(m.modelRequestPromptSha256)||H(brief)!==m.originalBriefSha256||
    H(prompt)!==m.modelRequestPromptSha256)fail('PREPARED_SHA_OR_SAFETY');
 const briefString=new TextDecoder('utf-8',{fatal:true}).decode(brief);
 const exact=buildR190BCDesignFirstPrompt(briefString);
 if(!Buffer.from(exact,'utf8').equals(prompt))fail('PREPARED_PROMPT_MISMATCH');
 return {briefSha256:H(brief),promptSha256:H(prompt),prompt:exact,
  promptKind:'BC_DESIGN_FIRST'};
}
export function parseR190BDArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length!==6&&argv.length!==7)fail('ARGS');
 const opts={approved:false};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(k==='--confirm-one-local-request'&&!opts.approved){opts.approved=true;continue;}
  const field={'--from':'sourceDir','--model':'model','--out':'outputDir'}[k];
  if(!field||Object.hasOwn(opts,field)||!argv[i+1])fail('FLAG');
  opts[field]=argv[++i];
 }
 if(!opts.sourceDir||!opts.model||!opts.outputDir||
    !MODEL.test(opts.model))fail('INPUTS');
 return opts;
}
export async function runR190BDStudy(opts,{
 modelRunner=runR190Local,fetcher=fetch
}={}){
 if(Array.isArray(opts))opts=parseR190BDArgs(opts);
 if(opts?.help)return {help:
  'node scripts/r190bd-consented-design-first.mjs --from PREPARED_DIR --model INSTALLED_QWEN_OR_GEMMA --out FRESH_DIR [--confirm-one-local-request]. Without confirm: no model request, no filesystem writes.'};
 if(!opts||!MODEL.test(opts.model??'')||
   typeof opts.sourceDir!=='string'||typeof opts.outputDir!=='string'||
   typeof opts.approved!=='boolean')fail('OPTIONS');
 const source=path.resolve(opts.sourceDir),out=path.resolve(opts.outputDir);
 if(source===out||out.startsWith(source+path.sep))fail('OUTPUT_INSIDE_SOURCE');
 const prepared=inspectR190BDPrepared(source);
 const summary={schema:R190BD_SCHEMA,modelRequested:opts.model,
  claimedProviderIdentityNotCryptographicallyVerified:true,
  originalBriefSha256:prepared.briefSha256,
  exactDesignFirstPromptSha256:prepared.promptSha256,
  directModelAuthoredB143Requested:true,hostRepairs:0,
  actualMinecraftWalking:'NOT_TESTED',
  independentJapaneseRequirementCoverage:'NOT_CERTIFIED',
  independentHumanArtReview:'ART_HOLD',...safety()};
 // Preflight never calls fetch, creates directories or consumes model quota.
 if(!opts.approved)return {...summary,status:'NOT_APPROVED_NO_PROVIDER_CALL',
  newModelRequests:0,outputDirectoryCreated:false};
 if(fs.existsSync(out)||!dir(path.dirname(out)))fail('FRESH_OUTPUT_REQUIRED');
 if(typeof modelRunner!=='function'||typeof fetcher!=='function')fail('RUNNER');
 // A provider request may consume tokens even if no response is captured.
 // Reserve this folder BEFORE any network call. Do not auto retry after crash.
 fs.mkdirSync(out);
 const attempt={...summary,status:'ATTEMPT_RESERVED_CONSUMPTION_UNKNOWN',
  maxPermittedModelRequests:1,newModelRequestsMayHaveBeenConsumed:true};
 fs.writeFileSync(path.join(out,'R190BD_ATTEMPT.json'),
  JSON.stringify(attempt,null,2)+'\n',{flag:'wx'});
 const onlyLocalFetch=(url,options={})=>{
  if(url!=='http://127.0.0.1:11434/v1/chat/completions'||
     options.redirect!=='error')fail('ONLY_LOCAL_OLLAMA_ALLOWED');
  return fetcher(url,options);
 };
 const child=path.join(out,'model-original');
 let error=null;
 try{
  await modelRunner({mode:'architectural-b143',transport:'openai',
   model:opts.model,prompt:prepared.prompt,out:child,
   expectFile:null,requiredCapabilities:[],replayPath:null},
   {fetcher:onlyLocalFetch});
 }catch(e){error=String(e?.message??e).slice(0,180);}
 let raw,receipt;
 try{
  if(!dir(child))throw Error('NO_CAPTURE_FOLDER');
  raw=readFile(child,'R190_I_ORIGINAL_RESPONSE.txt');
  const receiptName=fs.existsSync(path.join(child,'R190_H_RECEIPT.json'))?
   'R190_H_RECEIPT.json':'R190_I_CAPTURE_RECEIPT.json';
  receipt=JSON.parse(readFile(child,receiptName,45000));
 }catch{
  const report={...summary,status:'HOLD_NO_VERIFIED_PROVIDER_CAPTURE',
   possibleProviderConsumption:true,modelRunnerError:error,
   modelResponseAvailable:false,noAutomaticRetry:true};
  fs.writeFileSync(path.join(out,'R190BD_REPORT.json'),
   JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return report;
 }
 const receiptValid=expectedSafety(receipt)&&
  receipt.modelRequested===opts.model&&
  receipt.originalRequestSha256===prepared.promptSha256&&
  receipt.originalRawSha256===H(raw)&&
  receipt.rawProviderBytesPreserved===true&&
  Buffer.from(prepared.prompt).equals(readFile(child,'R190_I_ORIGINAL_BRIEF.txt',25000));
 if(!receiptValid)fail('CAPTURE_INTEGRITY_HOLD_NO_RETRY');
 const complete=receipt.schema==='minecraftaibuilder-r190-h-direct-b143-research-v1'||
  (receipt.schema==='minecraftaibuilder-r190-j-capture-v1'&&
   receipt.providerConfirmedComplete===true);
 const review=complete?reviewR190BCOriginal(raw,{expectedSha256:H(raw)}):null;
 const verifiedR4=receipt.schema==='minecraftaibuilder-r190-h-direct-b143-research-v1'&&
  receipt.status==='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS';
 const report={...summary,
  status:!complete?'HOLD_PROVIDER_COMPLETION_UNPROVEN':
   !verifiedR4?'HOLD_MODEL_R4_SPATIAL_REVIEW':
   review?.status!=='SOURCE_SECTION_PROXIES_AVAILABLE_ART_HOLD'?
    'HOLD_MODEL_SOURCE_SECTION_OR_ACCESS':'CAPTURED_SOURCE_ONLY_ART_HOLD',
  modelResponseAvailable:true,modelRawSha256:H(raw),
  modelReceiptStatus:receipt.status,providerResponseComplete:complete,
  sourceSectionStatus:review?.status??'NOT_RUN_INCOMPLETE_PROVIDER',
  originalSourceGeometrySha256:review?.geometrySha256??null,
  modelRunnerError:error,modelCallsInThisAttemptAtMost:1,
  noAutomaticRetry:true,sourceEvidenceNeverMeansArtPass:true};
 fs.writeFileSync(path.join(out,'R190BD_REPORT.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 if(review){
  fs.writeFileSync(path.join(out,'R190BD_SECTION_AUDIT.json'),
   JSON.stringify(review,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(out,'R190BD_SOURCE_SECTION.svg'),
   renderR190BCSectionSVG(review),{flag:'wx'});
 }
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190BDStudy(process.argv.slice(2)).then(x=>{
  console.log(JSON.stringify(x,null,2));
  if(x.status?.startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{console.error(String(e?.message??e));process.exitCode=1;});
}
