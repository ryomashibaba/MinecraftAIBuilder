/**
 * R190-R: same Japanese brief as R190-N, model directly authors B143 + R4.
 * Only one explicit model request, saved raw evidence reused by default.
 * This does not repair a failed model or approve architecture.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chooseR190NModel,STUDY_BRIEF,REPO_ROOT,EVIDENCE_ROOT}
 from './r190n-one-click-research.mjs';
import {runR190Local} from './r190-local-semantic-run.mjs';

export const R190R_ROOT=path.join(REPO_ROOT,'r190r-local-evidence');
const SHA=v=>createHash('sha256').update(v,'utf8').digest('hex');
const PROMPT_SHA=SHA(STUDY_BRIEF);
const fail=x=>{throw Error('R190R_'+x)};
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const isSafe=r=>r?.readiness==='NOT_PREPARED'&&
 r.constructionApproved===false&&r.executionAllowed===false&&
 r.worldContacts===0&&r.worldWrites===0&&
 r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 r.BuildPlan?.operations?.length===0;
function readEvidence(dir,name,max=120000){
 const f=path.join(dir,name),s=fs.lstatSync(f);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>max)fail('EVIDENCE_FILE');
 return fs.readFileSync(f,'utf8');
}
const json=(d,n)=>JSON.parse(readEvidence(d,n,40000));
function capture(dir){
 try{
  const full=fs.existsSync(path.join(dir,'R190_H_RECEIPT.json'));
  const r=json(dir,full?'R190_H_RECEIPT.json':'R190_I_CAPTURE_RECEIPT.json');
  const original=readEvidence(dir,'R190_I_ORIGINAL_RESPONSE.txt');
  if(readEvidence(dir,'R190_I_ORIGINAL_BRIEF.txt')!==STUDY_BRIEF||
     SHA(original)!==r.originalRawSha256||
     r.originalRequestSha256!==PROMPT_SHA||
     r.rawProviderBytesPreserved!==true||!isSafe(r))return null;
  if(full?r.schema!=='minecraftaibuilder-r190-h-direct-b143-research-v1':
     r.schema!=='minecraftaibuilder-r190-j-capture-v1')return null;
  if(full&&r.hostModifiedModelSource!==false)return null;
  return {receipt:r,sha:SHA(original),formal:full,
   preview:fs.existsSync(path.join(dir,'R190_H_REAL_B143_3D.html'))||
    fs.existsSync(path.join(dir,'R190_J_HOLD_B143_3D.html'))};
 }catch{return null}
}
function findCached(root,model){
 if(!fs.existsSync(root))return null;
 for(const n of fs.readdirSync(root).filter(x=>/^r190r-\d+-\d+$/.test(x)).sort().reverse()){
  const dir=path.join(root,n);
  try{
   const c=capture(dir),m=json(dir,'R190R_ROUTE_COMPARISON.json');
   if(c&&m.schema==='minecraftaibuilder-r190r-direct-v1'&&
      m.frozenBriefSha256===PROMPT_SHA&&
      m.originalDirectRawSha256===c.sha&&
      m.directReviewStatus===c.receipt.status&&
      isSafe(m)&&(model===null||model===m.modelRequested))
    return {directory:dir,manifest:m};
  }catch{}
 }
 return null;
}
function semanticEvidence(root,model){
 if(fs.existsSync(root))for(const n of fs.readdirSync(root)
  .filter(x=>/^r190n-\d+-\d+$/.test(x)).sort().reverse()){
  const dir=path.join(root,n);
  try{
   const m=json(dir,'R190N_STUDY_MANIFEST.json'),
    r=json(dir,'R190_M_EVIDENCE_RECEIPT.json'),
    raw=readEvidence(dir,'R190_M_UNMODIFIED_MODEL_RESPONSE.txt');
   if(m.schema==='minecraftaibuilder-r190n-study-v1'&&
      m.modelRequestedOrClaimed===model&&m.briefSha256===PROMPT_SHA&&
      m.originalRawSha256===SHA(raw)&&r.originalRawSha256===SHA(raw)&&
      r.originalBriefSha256===PROMPT_SHA&&
      readEvidence(dir,'R190_M_ORIGINAL_BRIEF.txt')===STUDY_BRIEF&&
      isSafe(r)&&isSafe(m))
    return {status:'SAME_FROZEN_BRIEF_AND_CLAIMED_MODEL',
     rawSha256:SHA(raw),statusOfSemanticRoute:r.status,
     sourceKind:r.sourceKind,geometryWasHostPlaced:r.hostDeterminedRoomCoordinates,
     realLLMIdentityAuthenticated:false,artReview:'ART_HOLD'};
  }catch{}
 }
 return {status:'NO_VERIFIED_MATCHING_SEMANTIC_ORIGINAL'};
}
export function parseR190RArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const opt={model:null,fresh:false};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--fresh'&&!opt.fresh){opt.fresh=true;continue}
  if(args[i]==='--model'&&opt.model===null&&
     MODEL.test(args[i+1]??'')){opt.model=args[++i];continue}
  fail('INVALID_ARGUMENT_OR_DUPLICATE');
 }
 return opt;
}
async function installedModel(fetcher,requested){
 let r;
 try{r=await fetcher('http://127.0.0.1:11434/api/tags',
  {method:'GET',redirect:'error',signal:AbortSignal.timeout(8000)});}
 catch{fail('LOCAL_OLLAMA_UNAVAILABLE')}
 if(!r?.ok)fail('LOCAL_TAGS_FAILED');
 let j;
 try{j=await r.json()}catch{fail('TAGS_NOT_JSON')}
 if(!Array.isArray(j?.models))fail('INVALID_TAGS');
 return chooseR190NModel(j.models.map(v=>v?.name),requested);
}
export async function runR190RStudy(args=[],{
 evidenceRoot=R190R_ROOT,semanticEvidenceRoot=EVIDENCE_ROOT,
 fetcher=fetch,modelRunner=runR190Local,
 transport='native',timestamp=()=>Date.now()
}={}){
 const opt=Array.isArray(args)?parseR190RArgs(args):args;
 if(opt?.help)return {help:'RUN_R190R_DIRECT_B143.cmd [--model tag] [--fresh]'};
 if(!opt||typeof opt.fresh!=='boolean'||
    (opt.model!==null&&!MODEL.test(opt.model))||
    !['native','openai'].includes(transport))fail('INVALID_OPTIONS');
 const root=path.resolve(evidenceRoot);
 if(!opt.fresh){
  const cached=findCached(root,opt.model);
  if(cached)return {status:cached.manifest.directReviewStatus,reused:true,
   directory:cached.directory,actualNewModelRequests:0,
   originalDirectRawSha256:cached.manifest.originalDirectRawSha256,
   modelRequested:cached.manifest.modelRequested,
   humanArtReview:'ART_HOLD',worldContacts:0,worldWrites:0};
 }
 const model=await installedModel(fetcher,opt.model);
 fs.mkdirSync(root,{recursive:true});
 const out=path.join(root,'r190r-'+String(timestamp())+'-'+String(process.pid));
 if(fs.existsSync(out))fail('OUTPUT_COLLISION');
 const options={mode:'architectural-b143',transport,model,prompt:STUDY_BRIEF,
  out,expectFile:null,requiredCapabilities:[],replayPath:null};
 let caught=null;
 try{await modelRunner(options,{fetcher});}catch(e){caught=e}
 const c=capture(out);
 if(!c){if(caught)throw caught;fail('NO_SAVED_VERIFIED_MODEL_REPLY')}
 const r=c.receipt,reference=semanticEvidence(path.resolve(semanticEvidenceRoot),model);
 const report={schema:'minecraftaibuilder-r190r-direct-v1',
  directReviewStatus:r.status,originalDirectRawSha256:c.sha,
  frozenBriefSha256:PROMPT_SHA,modelRequested:model,
  directSourceKind:'MODEL_DECLARED_DIRECT_B143_PROVIDER_UNAUTHENTICATED',
  directB143SourceSha256:r.sourceSha256??r.unapprovedGeometryEvidence?.sourceSha256??null,
  directGeometrySha256:r.geometrySha256??r.unapprovedGeometryEvidence?.geometrySha256??null,
  formalDirectR4Receipt:c.formal,previewAvailable:c.preview,
  hostCreatedOrRepairedDirectGeometry:false,
  modelIdentityCryptographicallyVerified:false,
  independentJapaneseRequestCoverage:'NOT_CERTIFIED',
  semanticComparison:reference,
  sameFrozenJapaneseRequest:true,
  sameClaimedModelOnlyWhenSemanticMatched:reference.status==='SAME_FROZEN_BRIEF_AND_CLAIMED_MODEL',
  sameModelSamplingConditionsProven:false,
  qualitySuperiority:'NOT_ESTABLISHED',
  humanArtReview:'ART_HOLD',realMinecraftWalking:'NOT_TESTED',
  actualNewModelRequests:1,modelRunnerHOLD:caught!==null,...safe()};
 fs.writeFileSync(path.join(out,'R190R_ROUTE_COMPARISON.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return {status:r.status,reused:false,directory:out,
  actualNewModelRequests:1,modelRequested:model,
  originalDirectRawSha256:c.sha,previewAvailable:c.preview,
  semanticComparison:reference.status,modelRunnerHOLD:caught!==null,
  humanArtReview:'ART_HOLD',worldContacts:0,worldWrites:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190RStudy(process.argv.slice(2)).then(r=>{
  console.log(JSON.stringify(r,null,2));
  if(String(r.status).startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{console.error('R190R_HOLD',String(e?.message??e));process.exitCode=1});
}
