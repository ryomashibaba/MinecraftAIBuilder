/**
 * R190-W opt-in research: MODEL architecture program -> MODEL direct B143.
 * No preset layout, geometry repair, remote provider, or Minecraft access.
 * Saved planning text is evidence, NEVER proof of a usable building.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190SOriginal,diagnoseR190SGeometry,
 buildR190SRedesignPrompt} from './r190s-evidence-redesign.mjs';
import {r190rEvidenceRoot} from './r190r-one-click-direct-study.mjs';
import {runR190Local} from './r190-local-semantic-run.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compareR190TSource,renderR190TPair} from './r190t-source-comparison.mjs';

const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const fail=s=>{throw Error('R190W_'+s)};
const secure=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const safe=r=>r?.readiness==='NOT_PREPARED'&&
 r.constructionApproved===false&&r.executionAllowed===false&&
 r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 r.BuildPlan?.operations?.length===0&&r.worldContacts===0&&r.worldWrites===0;
const rootOfR=r190rEvidenceRoot();
export const R190W_ROOT=path.join(path.dirname(rootOfR),'r190w-local-evidence');
const schema='minecraftaibuilder-r190w-model-plan-v1';
const isDir=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
const read=(p,max=100000)=>{const s=fs.lstatSync(p);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>max)fail('UNSAFE_FILE');
 return fs.readFileSync(p,'utf8')};
const write=(p,s)=>fs.writeFileSync(p,s,{flag:'wx'});
const json=(p,v)=>write(p,JSON.stringify(v,null,2)+'\n');
export function parseR190WArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const o={from:null,fresh:false};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--fresh'&&!o.fresh){o.fresh=true;continue}
  if(args[i]==='--from'&&o.from===null&&args[i+1]){
   o.from=args[++i];continue;
  }
  fail('ARGUMENTS');
 }
 return o;
}
export function inspectR190WPlan(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>12000)fail('PLAN_BYTES');
 let p;
 try{p=JSON.parse(raw)}catch{fail('PLAN_JSON')}
 const plain=v=>typeof v==='string'&&v.length>=12&&v.length<=850;
 if(p?.schema!==schema||!Array.isArray(p.functionalSpaces)||
  p.functionalSpaces.length<2||p.functionalSpaces.length>12||
  !['schema','architecturalThesis','massAndVoids','functionalSpaces',
   'circulation','roofAndEnvelope','unresolvedRisks'].every(k=>Object.hasOwn(p,k))||
  Object.keys(p).length!==7||
  ![p.architecturalThesis,p.massAndVoids,p.circulation,
   p.roofAndEnvelope,p.unresolvedRisks].every(plain))fail('PLAN_CONTRACT');
 const ids=new Set();
 for(const space of p.functionalSpaces){
  if(!space||Object.keys(space).length!==4||
   !['id','purpose','realVoid','access'].every(k=>Object.hasOwn(space,k))||
   typeof space.id!=='string'||!/^[a-z][a-z0-9-]{2,39}$/.test(space.id)||
   ids.has(space.id)||![space.purpose,space.realVoid,space.access].every(plain))
   fail('PLAN_SPACES');
  ids.add(space.id);
 }
 return p;
}
export function buildR190WFirstPrompt(negativePrompt){
 if(typeof negativePrompt!=='string'||negativePrompt.length<30||
  negativePrompt.length>8000)fail('BRIEF');
 // The R190-S critique ends with a *one-response B143* instruction.
 // This is the incompatible previous workflow, not a stage-one instruction.
 const context=negativePrompt.split('\n').filter(line=>
  !line.startsWith('必ずB143 designとspatialPlanを1回のJSON応答で返し')).join('\n');
 return [
  context,
  '',
  '【今回は第1段階：建築プログラムの独立考案のみ】',
  'B143の形状・座標を今は書かないでください。用途を実際に使える空洞、床、出入り、室間の動線、立体構成、屋根と雨水処理を先にあなた自身で考えてください。',
  'テンプレート、類型固定、ホストによる形状自動修理を前提にしないこと。各室の名札ではなく中空空間の位置関係を設計してください。',
  'JSONのみで返答してください。schemaは'+schema+'。',
  '厳密に7つのキー: schema,architecturalThesis,massAndVoids,functionalSpaces,circulation,roofAndEnvelope,unresolvedRisks。',
  'functionalSpacesは2～12件で各{id,purpose,realVoid,access}。idは英小文字・数字・ハイフン、先頭英小文字。各説明文字列は12～850文字。',
  '数値や形状の作り方を後でモデル自身が選べるようにし、ホストが代行して幾何を生成しない。',
  'できないことや矛盾はunresolvedRisksに明記し、完成済みと自己申告しない。'
 ].join('\n');
}
export function buildR190WGeometryPrompt(originalBrief,plan){
 const p=inspectR190WPlan(JSON.stringify(plan));
 const msg=[
  originalBrief,
  '',
  '【第2段階：あなた自身の先行建築計画を、実際のB143幾何へ変換】',
  '次は設計者であるあなた自身が寸法・形状・座標・素材・加算・切削を決めてください。ホストは設計しません。',
  '直前の計画はまだ自己申告であり、品質認証ではありません。必要なら計画の問題を自ら是正し、形状に反映してください。',
  '床の上に2ブロックの空気がある実用空洞、外部につながる入口、必要室の通行、展示と修理の直接接続、',
  '鋸歯状屋根の実形状、雨水経路、魅力ある建築全体の構成を優先。無垢の箱を「部屋」と呼ぶのは禁止。',
  'モデル独自の先行計画(JSON、ホストによる幾何投影ではない):',
  JSON.stringify(p),
  'B143 design,spatialPlan,explanation,assumptionsの4キーを返し、完成した実3Dを自己認証しないでください。'
 ].join('\n');
 if(msg.length>8000)fail('GEOMETRY_PROMPT_TOO_LONG');
 return msg;
}
function chooseOriginal(from){
 if(from!==null)return inspectR190SOriginal(from);
 if(!isDir(rootOfR))fail('NO_CANONICAL_R190R_EVIDENCE');
 for(const name of fs.readdirSync(rootOfR).filter(x=>/^r190r-\d+-\d+$/.test(x)).sort().reverse()){
  const p=path.join(rootOfR,name);
  try{return inspectR190SOriginal(p)}catch{}
 }
 fail('NO_VERIFIED_R190R_BASELINE');
}
async function planRequest(model,prompt,fetcher){
 // Inference only via a pinned loopback Ollama endpoint, NEVER remote/cloud.
 const endpoint='http://127.0.0.1:11434/v1/chat/completions';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);
 try{
  const res=await fetcher(endpoint,{method:'POST',redirect:'error',
   headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({model,stream:false,temperature:0.45,
    response_format:{type:'json_object'},messages:[
     {role:'system',content:'Design an original building PROGRAM, NOT B143 geometry. Produce exactly the requested JSON schema. No Minecraft commands, no construction claims.'},
     {role:'user',content:prompt}
    ]})});
  if(!res?.ok)fail('PLAN_HTTP_'+String(res?.status??'UNKNOWN'));
  const response=await res.json(),choice=response?.choices?.length===1?
   response.choices[0]:null;
  if(!choice||typeof choice.message?.content!=='string'||
   Buffer.byteLength(choice.message.content)>12000)fail('PROVIDER_PLAN_CONTENT');
  return {raw:choice.message.content,finishReason:choice.finish_reason};
 }finally{clearTimeout(timer)}
}
function findPrior(root,original,promptHash){
 if(!isDir(root))return null;
 for(const name of fs.readdirSync(root).filter(x=>/^r190w-\d+-\d+$/.test(x)).sort().reverse()){
  const dir=path.join(root,name);
  if(!isDir(dir))continue;
  try{
   const attempt=JSON.parse(read(path.join(dir,'R190W_ATTEMPT.json'),20000));
   if(attempt.parentRawSha256!==original.rawSha256||
    attempt.modelRequested!==original.model||attempt.planningPromptSha256!==promptHash||
    !safe(attempt))continue;
   const stage1=path.join(dir,'R190W_PLAN_RAW.txt');
   if(fs.existsSync(stage1)&&attempt.stage1RawSha256!==undefined&&
      sha(read(stage1,12000))!==attempt.stage1RawSha256)fail('PRIOR_SHA_MISMATCH');
   if(fs.existsSync(path.join(dir,'R190W_RESULT.json'))){
    const result=JSON.parse(read(path.join(dir,'R190W_RESULT.json'),20000));
    if(!safe(result)||result.parentRawSha256!==original.rawSha256||
       result.planningPromptSha256!==promptHash)fail('PRIOR_RESULT_MISMATCH');
    if(typeof result.stage1RawSha256==='string'&&
       (!fs.existsSync(stage1)||sha(read(stage1,12000))!==result.stage1RawSha256))
     fail('PRIOR_PLAN_TAMPERED');
    return {status:result.status,reused:true,modelCalls:0,directory:dir,
     beforeAfterStatus:result.beforeAfterStatus??null,...secure()};
   }
   // Never repeat a partially completed real model call without --fresh.
   return {status:'HOLD_PARTIAL_RUN_NO_AUTOMATIC_RETRY',reused:true,
    modelCalls:0,directory:dir,...secure()};
  }catch(e){if(String(e.message).startsWith('R190W_PRIOR_'))throw e}
 }
 return null;
}
export async function runR190WStudy(args=[],{
 evidenceRoot=R190W_ROOT,fetcher=fetch,
 directRunner=runR190Local,timestamp=()=>Date.now()
}={}){
 const o=Array.isArray(args)?parseR190WArgs(args):args;
 if(o?.help)return {help:'RUN_R190W_TWO_STAGE.cmd [--from SAVED_R190R_FOLDER] [--fresh] (two opt-in local model requests maximum)'};
 const original=chooseOriginal(o.from);
 const critique=diagnoseR190SGeometry(original);
 const first=buildR190WFirstPrompt(buildR190SRedesignPrompt(critique));
 const firstSha=sha(first),root=path.resolve(evidenceRoot);
 if(process.platform==='win32'&&root===path.resolve(R190W_ROOT)&&
  !isDir(path.dirname(root)))fail('CANONICAL_PROJECT_MISSING');
 if(fs.existsSync(root)&&!isDir(root))fail('UNSAFE_OUTPUT_ROOT');
 if(!o.fresh){
  const prior=findPrior(root,original,firstSha);
  if(prior)return prior;
 }
 fs.mkdirSync(root,{recursive:true});
 const dir=path.join(root,'r190w-'+timestamp()+'-'+process.pid);
 if(fs.existsSync(dir))fail('RESULT_EXISTS');
 fs.mkdirSync(dir);
 const base={schema:'minecraftaibuilder-r190w-attempt-v1',
  parentRawSha256:original.rawSha256,modelRequested:original.model,
  planningPromptSha256:firstSha,sourceOnly:true,
  providerIdentityVerified:false,hostRepairedGeometry:false,...secure()};
 json(path.join(dir,'R190W_ATTEMPT.json'),base);
 write(path.join(dir,'R190W_PLAN_PROMPT.txt'),first);
 let raw=null,finishReason=null,plan=null,stageError=null,modelCalls=1;
 try{
  const result=await planRequest(original.model,first,fetcher);
  raw=result.raw;finishReason=result.finishReason;
  write(path.join(dir,'R190W_PLAN_RAW.txt'),raw);
  if(finishReason!=='stop')fail('PLAN_PROVIDER_INCOMPLETE');
  plan=inspectR190WPlan(raw);
 }catch(e){stageError=String(e?.message??e).slice(0,180)}
 const summary={schema:'minecraftaibuilder-r190w-result-v1',
  parentRawSha256:original.rawSha256,planningPromptSha256:firstSha,
  stage1RawSha256:raw===null?null:sha(raw),
  stage1ProviderFinishReason:finishReason??null,modelRequested:original.model,
  modelCallsAttempted:modelCalls,modelIdentityCryptographicallyVerified:false,
  modelAuthoredPlanning:true,hostGeneratedGeometry:false,
  actualRoomsCertified:false,humanArtReview:'ART_HOLD',
  trueMinecraftWalking:'NOT_TESTED',qualitySuperiority:'NOT_ESTABLISHED',
  beforeAfterStatus:null,sourceOnly:true,...secure()};
 if(stageError){
  summary.status='HOLD_STAGE1_OR_PROVIDER';
  summary.failure=stageError;
  json(path.join(dir,'R190W_RESULT.json'),summary);
  return {status:summary.status,reused:false,modelCalls,directory:dir,
   failure:stageError,...secure()};
 }
 const second=buildR190WGeometryPrompt(first,plan);
 write(path.join(dir,'R190W_GEOMETRY_PROMPT.txt'),second);
 modelCalls=2;summary.modelCallsAttempted=2;
 const out=path.join(dir,'b143-model-original');
 let directError=null;
 try{
  await directRunner({mode:'architectural-b143',transport:'openai',
   model:original.model,prompt:second,out,requiredCapabilities:[],
   expectFile:null,replayPath:null},{fetcher});
 }catch(e){directError=String(e?.message??e).slice(0,180)}
 summary.stage2Failure=directError;
 summary.status='HOLD_STAGE2_B143_OR_PROVIDER';
 if(isDir(out)){
  try{
   const response=read(path.join(out,'R190_I_ORIGINAL_RESPONSE.txt'),100000);
   const receiptPath=fs.existsSync(path.join(out,'R190_H_RECEIPT.json'))?
    path.join(out,'R190_H_RECEIPT.json'):path.join(out,'R190_I_CAPTURE_RECEIPT.json');
   const receipt=JSON.parse(read(receiptPath,40000));
   if(!safe(receipt)||receipt.originalRawSha256!==sha(response)||
      receipt.originalRequestSha256!==sha(second))fail('STAGE2_EVIDENCE_CHAIN');
   summary.stage2RawSha256=sha(response);
   const candidate=JSON.parse(response),compiled=compileDesign(candidate.design);
   if(!verifyCompiled(candidate.design,compiled))fail('STAGE2_GEOMETRY');
   const expectedSource=receipt.sourceSha256??
    receipt.unapprovedGeometryEvidence?.sourceSha256;
   const expectedGeometry=receipt.geometrySha256??
    receipt.unapprovedGeometryEvidence?.geometrySha256;
   if(compiled.sourceSha256!==expectedSource||
      compiled.geometrySha256!==expectedGeometry)fail('STAGE2_HASH');
   const pair=compareR190TSource({beforeDesign:original.design,
    afterDesign:candidate.design,beforePlan:original.spatialPlan,
    afterPlan:candidate.spatialPlan});
   const template=fs.readFileSync(path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../source/ai/b143-viewer-template.html'),'utf8');
   const views=renderR190TPair(original.design,candidate.design,template);
   if(views.sourceHashes[0]!==original.compiled.sourceSha256||
      views.sourceHashes[1]!==compiled.sourceSha256)fail('VIEW_SHA');
   json(path.join(dir,'R190W_PHYSICAL_COMPARISON.json'),pair);
   write(path.join(dir,'R190W_BEFORE_3D.html'),views.beforeHtml);
   write(path.join(dir,'R190W_AFTER_3D.html'),views.afterHtml);
   // The index names match the rendered pair filenames; keep it local.
   write(path.join(dir,'R190W_VISUAL_COMPARE.html'),
    views.indexHtml.replaceAll('R190T_BEFORE_3D.html','R190W_BEFORE_3D.html')
     .replaceAll('R190T_AFTER_3D.html','R190W_AFTER_3D.html'));
   summary.status='B143_COMPARABLE_ART_HOLD';
   summary.beforeAfterStatus=pair.status;
   summary.modelArchitectureImprovementCertified=false;
  }catch(e){summary.stage2ComparisonFailure=String(e?.message??e).slice(0,160)}
 }
 json(path.join(dir,'R190W_RESULT.json'),summary);
 return {status:summary.status,reused:false,modelCalls,directory:dir,
  beforeAfterStatus:summary.beforeAfterStatus,...secure()};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190WStudy(process.argv.slice(2)).then(x=>{
  console.log(JSON.stringify(x,null,2));
  if(String(x.status).startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{console.error('R190W_HOLD',String(e?.message??e));process.exitCode=1});
}
