/**
 * R190-BF: reproducible, one-side-at-a-time, consent-gated real-model study.
 * A: user's exact Japanese original. B: exact BC design-first prompt.
 * Same existing direct B143/R4 runner, same settings, one provider request max.
 * Preflight never runs inference. Minecraft construction remains impossible.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190BDPrepared} from './r190bd-consented-design-first.mjs';
import {runR190Local} from './r190-local-semantic-run.mjs';
import {compareR190BESaved} from './r190be-saved-design-comparison.mjs';
import {createR190BGReview} from './r190bg-source-anchored-review.mjs';

export const R190BF_SCHEMA='minecraftaibuilder-r190bf-locked-pair-v1';
const H=x=>createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('R190BF_'+x)};
const ID=/^(?:qwen|gemma)[a-zA-Z0-9._:/-]{1,130}$/i;
const endpoint='http://127.0.0.1:11434/v1/chat/completions';
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,
 art:'ART_HOLD',officialArtAdoptions:0});
const directory=x=>{try{const s=fs.lstatSync(x);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
const file=(dir,name,max=100000)=>{
 if(!directory(dir))fail('UNSAFE_DIRECTORY');
 const p=path.join(dir,name),s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<2||s.size>max)fail('UNSAFE_FILE_'+name);
 return fs.readFileSync(p);
};
const fresh=dir=>{
 if(fs.existsSync(dir)||!directory(path.dirname(dir)))fail('FRESH_OUTPUT_REQUIRED');
};
const distinct=(out,parents)=>{
 for(const p of parents){
  if(out===p||out.startsWith(p+path.sep))fail('OUTPUT_INSIDE_INPUT');
 }
};
function loadProtocol(protocolDir,preparedDir){
 const bytes=file(protocolDir,'R190BF_PROTOCOL.json',15000);
 let m;try{m=JSON.parse(bytes)}catch{fail('PROTOCOL_JSON')}
 const p=inspectR190BDPrepared(preparedDir);
 if(m.schema!==R190BF_SCHEMA||!ID.test(m.model??'')||
  !Number.isSafeInteger(m.seed)||m.seed<0||m.seed>2147483647||
  !Number.isSafeInteger(m.maxTokens)||m.maxTokens<4096||
  m.maxTokens>16384||m.temperature!==0.35||m.endpoint!==endpoint||
  m.briefSha256!==p.briefSha256||m.designPromptSha256!==p.promptSha256||
  m.providerCallsAllowedPerSide!==1||m.sideA!=='EXACT_ORIGINAL_BRIEF'||
  m.sideB!=='EXACT_BC_DESIGN_FIRST_PROMPT'||m.art!=='ART_HOLD'||
  m.worldWrites!==0||m.worldContacts!==0||m.constructionApproved!==false)
  fail('PROTOCOL_INVALID_OR_DRIFT');
 const original=new TextDecoder('utf-8',{fatal:true}).decode(
  file(preparedDir,'ORIGINAL_BRIEF.txt',20000));
 if(H(Buffer.from(original))!==m.briefSha256)fail('BRIEF_DRIFT');
 return {manifest:m,protocolSha256:H(bytes),original,prepared:p};
}
export function prepareR190BF({preparedDir,outDir,model,seed=23,maxTokens=8192}){
 if(!ID.test(model??'')||!Number.isSafeInteger(seed)||seed<0||
  seed>2147483647||!Number.isSafeInteger(maxTokens)||
  maxTokens<4096||maxTokens>16384)fail('MODEL_SETTINGS');
 const prepared=path.resolve(preparedDir),out=path.resolve(outDir);
 distinct(out,[prepared]);fresh(out);
 const p=inspectR190BDPrepared(prepared);
 const manifest={schema:R190BF_SCHEMA,model,temperature:0.35,seed,maxTokens,
  endpoint,briefSha256:p.briefSha256,designPromptSha256:p.promptSha256,
  sideA:'EXACT_ORIGINAL_BRIEF',sideB:'EXACT_BC_DESIGN_FIRST_PROMPT',
  providerCallsAllowedPerSide:1,providerVersionDigest:'NOT_VERIFIED',
  samplingSeedIsRequestedNotProofOfProviderCompliance:true,
  noAutoRetries:true,experimentQuality:'NOT_ESTABLISHED',
  humanArtReview:'ART_HOLD',...safe()};
 const data=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'R190BF_PROTOCOL.json'),data,{flag:'wx'});
 return {...manifest,protocolSha256:H(data),directory:out,modelCalls:0};
}
const auditCapture=(root,m,protocolHash,briefSha,rawPrompt)=>{
 const child=path.join(root,'model-original');
 let r=null;
 try{
  if(!directory(child))return {available:false,status:'HOLD_NO_PROVIDER_CAPTURE'};
  const saved=fs.existsSync(path.join(child,'R190_H_RECEIPT.json'))?
   'R190_H_RECEIPT.json':'R190_I_CAPTURE_RECEIPT.json';
  r=JSON.parse(file(child,saved,45000));
  const raw=file(child,'R190_I_ORIGINAL_RESPONSE.txt');
  const actualPrompt=file(child,'R190_I_ORIGINAL_BRIEF.txt',25000);
  if(H(actualPrompt)!==H(Buffer.from(rawPrompt,'utf8'))||
   r.originalRequestSha256!==H(actualPrompt)||r.originalRawSha256!==H(raw)||
   r.modelRequested!==m.model||r.rawProviderBytesPreserved!==true||
   r.worldWrites!==0||r.worldContacts!==0||r.constructionApproved!==false)
   fail('CAPTURE_SHA_DRIFT');
  return {available:true,status:'SAVED_ORIGINAL_SHA_VERIFIED_NOT_ART',
   originalSha256:H(raw),promptSha256:H(actualPrompt),receiptStatus:r.status,
   modelIdentityVerified:false,providerSettingsVerifiedByResponse:false};
 }catch(e){return {available:false,status:'HOLD_CAPTURE_INTEGRITY',
  error:String(e.message??e).slice(0,160)};}
};
export async function captureR190BFSide({protocolDir,preparedDir,side,outDir,approved=false},
 {fetcher=fetch,modelRunner=runR190Local}={}){
 if(!['A','B'].includes(side)||typeof approved!=='boolean')fail('SIDE_OR_CONSENT');
 const protocol=path.resolve(protocolDir),prepared=path.resolve(preparedDir),
  out=path.resolve(outDir);
 const {manifest:m,protocolSha256:protocolHash,original,prepared:p}=
  loadProtocol(protocol,prepared);
 distinct(out,[protocol,prepared]);fresh(out);
 const prompt=side==='A'?original:p.prompt;
 const summary={schema:R190BF_SCHEMA,side,protocolSha256:protocolHash,
  modelClaim:m.model,temperatureRequested:m.temperature,seedRequested:m.seed,
  maxTokensRequested:m.maxTokens,originalBriefSha256:m.briefSha256,
  actualPromptSha256:H(Buffer.from(prompt,'utf8')),
  modelDigestVerified:false,seedComplianceVerified:false,
  modelQuality:'NOT_ESTABLISHED',modelCallsPossible:0,...safe()};
 if(!approved)return {...summary,status:'NOT_APPROVED_PREFLIGHT_ONLY',outputCreated:false};
 if(typeof fetcher!=='function'||typeof modelRunner!=='function')fail('RUNNER');
 fs.mkdirSync(out);
 fs.writeFileSync(path.join(out,'R190BF_ATTEMPT.json'),
  JSON.stringify({...summary,status:'ATTEMPT_RESERVED',
   possibleOneModelRequest:true,noAutoRetry:true},null,2)+'\n',{flag:'wx'});
 let calls=0,requestHash=null,runError=null;
 const guardedFetch=(url,init={})=>{
  if(url!==endpoint||init.method!=='POST'||init.redirect!=='error'||
   calls!==0)fail('LOCAL_ONE_REQUEST_ONLY');
  let packet;try{packet=JSON.parse(init.body)}catch{fail('REQUEST_BODY')}
  let user;try{user=JSON.parse(packet.messages?.[1]?.content)}catch{fail('REQUEST_USER')}
  if(packet.model!==m.model||packet.temperature!==m.temperature||
   packet.stream!==false||packet.response_format?.type!=='json_object'||
   packet.messages?.length!==2||typeof packet.messages[0].content!=='string'||
   !packet.messages[0].content.includes('spatialPlan')||
   user.mode!=='creation'||user.architectural_request!==prompt||
   user.previousDesign!==null||user.attempt!==1||user.maxAttempts!==1||
   !Array.isArray(user.strictCompilerFeedback)||user.strictCompilerFeedback.length)
   fail('SOURCE_REQUEST_DRIFT');
  packet.seed=m.seed;packet.max_tokens=m.maxTokens;
  const body=JSON.stringify(packet);
  requestHash=H(Buffer.from(body));
  // Exact outgoing request saved BEFORE network, not reconstructed from logs.
  fs.writeFileSync(path.join(out,'R190BF_EXACT_REQUEST.json'),body,{flag:'wx'});
  calls++;
  return fetcher(url,{...init,body});
 };
 try{
  await modelRunner({mode:'architectural-b143',transport:'openai',
   model:m.model,prompt,out:path.join(out,'model-original'),
   expectFile:null,requiredCapabilities:[],replayPath:null}, {fetcher:guardedFetch});
 }catch(e){runError=String(e?.message??e).slice(0,180);}
 const cap=auditCapture(out,m,protocolHash,m.briefSha256,prompt);
 const status=calls===0?'HOLD_NO_NETWORK_REQUEST':
  !cap.available?'HOLD_NO_VERIFIED_PROVIDER_CAPTURE':
  'ORIGINAL_CAPTURED_AWAIT_INDEPENDENT_ART_REVIEW';
 const report={...summary,status,requestCountObserved:calls,
  providerRequestSha256:requestHash,providerRequestExecuted:calls===1,
  completionOrIdentityNotProvenByRequestHash:true,
  capture:cap,runnerError:runError,noAutomaticRetry:true};
 fs.writeFileSync(path.join(out,'R190BF_CAPTURE.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return {...report,directory:out};
}
function checkSide(root,side,manifest,protocolHash,expectedPrompt){
 if(!directory(root))fail('SIDE_DIRECTORY');
 const r=JSON.parse(file(root,'R190BF_CAPTURE.json',16000));
 const p=JSON.parse(file(root,'R190BF_EXACT_REQUEST.json',45000));
 if(r.schema!==R190BF_SCHEMA||r.side!==side||
    r.protocolSha256!==protocolHash||
    r.providerRequestSha256!==H(file(root,'R190BF_EXACT_REQUEST.json',45000))||
    r.requestCountObserved!==1||r.capture?.available!==true||
    p.model!==manifest.model||p.temperature!==manifest.temperature||
    p.seed!==manifest.seed||p.max_tokens!==manifest.maxTokens||
    p.stream!==false||p.response_format?.type!=='json_object')
  fail('SIDE_CAPTURE_DRIFT');
 let user;try{user=JSON.parse(p.messages?.[1]?.content)}catch{fail('SIDE_PROMPT_JSON')}
 if(user.architectural_request!==expectedPrompt||user.mode!=='creation'||
   user.maxAttempts!==1||user.attempt!==1)fail('SIDE_PROMPT_DRIFT');
 const saved=auditCapture(root,manifest,protocolHash,manifest.briefSha256,expectedPrompt);
 if(!saved.available||saved.originalSha256!==r.capture.originalSha256)
  fail('SIDE_SOURCE_DRIFT');
 return {sourceSha256:saved.originalSha256,requestSha256:r.providerRequestSha256,
  systemPromptHash:H(Buffer.from(p.messages[0].content))};
}
export function compareR190BFPair({protocolDir,preparedDir,aDir,bDir,outDir}){
 const protocol=path.resolve(protocolDir),prepared=path.resolve(preparedDir),
  a=path.resolve(aDir),b=path.resolve(bDir),out=path.resolve(outDir);
 const {manifest,protocolSha256,original,prepared:p}=loadProtocol(protocol,prepared);
 distinct(out,[protocol,prepared,a,b]);fresh(out);
 const A=checkSide(a,'A',manifest,protocolSha256,original);
 const B=checkSide(b,'B',manifest,protocolSha256,p.prompt);
 if(A.systemPromptHash!==B.systemPromptHash)fail('SYSTEM_PROMPT_DRIFT');
 const comparison=compareR190BESaved({prepared,baseline:path.join(a,'model-original'),
  candidate:path.join(b,'model-original'),out});
 // A human-readable art review is useful even when a valid B143 has R4
 // functional HOLD. A missing/invalid B143 pair must never receive fake 3D.
 const reviewable=new Set(['SOURCE_REVIEW_AVAILABLE_ART_HOLD',
  'HOLD_R4_SOURCE_REFERENCE_ONLY','HOLD_SECTION_SOURCE_REFERENCE_ONLY']);
 const canReview=reviewable.has(comparison.A.status)&&
  reviewable.has(comparison.B.status)&&
  ['NO_PHYSICAL_CHANGE_ART_HOLD','SAVED_SOURCE_PAIR_AVAILABLE_ART_HOLD']
   .includes(comparison.status);
 const review=canReview?createR190BGReview({comparisonDir:out,
  outDir:path.join(out,'R190BG_HUMAN_REVIEW'),allowNestedChild:true}):null;
 const evidence={schema:R190BF_SCHEMA,protocolSha256,
  A,B,identicalSettingsRequested:true,
  sameModelClaimed:true,sameSystemPromptSha256:A.systemPromptHash,
  generationModelDigestVerified:false,providerSeedHonoredVerified:false,
  result:'SOURCE_PAIR_COMPARE_ONLY_ART_HOLD',
  actualHumanArtImprovement:'NOT_ESTABLISHED',
  humanReviewStatus:review?'READY_FOR_UNSCORED_HUMAN_REVIEW':
    'HOLD_NO_VALID_B143_PAIR',
  humanReviewRelativePath:review?'R190BG_HUMAN_REVIEW/R190BG_REVIEW.html':null,
  humanReviewManifestSha256:review?.manifestSha256??null,
  noModelRequestsByComparison:true,...safe()};
 fs.writeFileSync(path.join(out,'R190BF_CONTROLLED_PAIR.json'),
  JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
 return {comparisonStatus:comparison.status,qualityImprovement:'NOT_ESTABLISHED',
  ...evidence,directory:out};
}
export function parseR190BFArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 let mode=null,approved=false,opts={};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];
  if(['--prepare','--capture','--compare'].includes(a)){if(mode)fail('MODE');mode=a.slice(2);continue}
  if(a==='--confirm-one-local-request'){if(approved)fail('DUPLICATE_CONSENT');approved=true;continue}
  const key={'--prepared':'preparedDir','--protocol':'protocolDir',
   '--side':'side','--model':'model','--seed':'seed','--max-tokens':'maxTokens',
   '--a':'aDir','--b':'bDir','--out':'outDir'}[a];
  if(!key||Object.hasOwn(opts,key)||!argv[i+1])fail('FLAGS');opts[key]=argv[++i];
 }
 if(!mode||!opts.outDir||!opts.preparedDir||
    approved&&mode!=='capture')fail('FLAGS');
 if(mode==='prepare'){
  if(!opts.model||opts.protocolDir||opts.side||opts.aDir||opts.bDir)fail('FLAGS');
  return {mode,...opts,seed:opts.seed===undefined?23:Number(opts.seed),
   maxTokens:opts.maxTokens===undefined?8192:Number(opts.maxTokens)};
 }
 if(opts.model||opts.seed||opts.maxTokens||!opts.protocolDir)fail('FLAGS');
 if(mode==='capture'&&(!['A','B'].includes(opts.side)||opts.aDir||opts.bDir))fail('FLAGS');
 if(mode==='compare'&&(!opts.aDir||!opts.bDir||opts.side))fail('FLAGS');
 return {mode,...opts,approved};
}
export async function runR190BFArgs(args,deps){
 const o=parseR190BFArgs(args);
 if(o.help)return {help:'--prepare --prepared BC_DIR --model qwen3:14b --out FRESH_PROTOCOL_DIR [--seed 23] [--max-tokens 8192]; --capture --prepared BC_DIR --protocol PROTOCOL_DIR --side A|B --out FRESH_RUN_DIR [--confirm-one-local-request]; --compare --prepared BC_DIR --protocol PROTOCOL_DIR --a A_RUN_DIR --b B_RUN_DIR --out FRESH_COMPARISON_DIR'};
 if(o.mode==='prepare')return prepareR190BF(o);
 if(o.mode==='capture')return captureR190BFSide(o,deps);
 return compareR190BFPair(o);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190BFArgs(process.argv.slice(2)).then(r=>{
  console.log(JSON.stringify(r,null,2));
  if(r.status?.startsWith('HOLD')||r.comparisonStatus?.startsWith('HOLD'))
   process.exitCode=2;
 }).catch(e=>{console.error(String(e?.message??e));process.exitCode=1});
}
