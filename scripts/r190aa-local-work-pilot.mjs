/** R190-AA: explicit, bounded, local-only independent Japanese building trials.
 * All provider responses are immutable evidence. No automatic retry, world,
 * remote service, model download, quality certification or Minecraft actions.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runR190Local} from './r190-local-semantic-run.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {measureR190TSource} from './r190t-source-comparison.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
export const R190AA_ROOT=path.join(here,'..','r190aa-local-evidence');
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const fail=s=>{throw Error('R190AA_'+s)};
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0});
const safeReceipt=r=>r?.readiness==='NOT_PREPARED'&&
 r.constructionApproved===false&&r.executionAllowed===false&&
 r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 r.BuildPlan?.operations?.length===0&&r.worldContacts===0&&r.worldWrites===0;
const dir=p=>{try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink()}
 catch{return false}};
const file=(p,max=150000)=>{
 const stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>max)
  fail('UNSAFE_EVIDENCE_FILE');
 return fs.readFileSync(p,'utf8');
};
const write=(p,data)=>fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const BATCH=/^[a-z][a-z0-9-]{2,39}$/;
const TASKS=Object.freeze([
 {id:'library',brief:'山間の小さな町に、吹き抜けと二層の閲覧室を備えた公共図書館を設計してください。書庫、閲覧、階間移動を実際に接続し、外から入れる入口、採光と風雨への配慮を考えてください。'},
 {id:'tidal-workshop',brief:'干満の差が大きい海岸に、修理工房、展示室、資材保管室を備えた再生素材センターを設計してください。展示から工房へ直接移動でき、海風と雨水を処理する独創的な屋根を設けてください。'},
 {id:'observatory',brief:'急傾斜の岩場に、観測室、宿直室、機器搬入口を備えた小さな天文研究施設を設計してください。段差のある実用床、外部からの安全な進入、遮光と外形の非対称性を考えてください。'},
 {id:'bridge-hall',brief:'二つの斜面を結ぶ高架歩行橋と、その橋に統合された地域交流ホールを一体的に設計してください。橋の通行空間、ホール内の空洞、両側からの連続動線、構造の支持を考えてください。'},
 {id:'vertical-market',brief:'狭い都市敷地に、地上階の市場、上階の調理室、半屋外の休憩テラスを持つ立体公共市場を設計してください。荷物と来訪者の動線、階段の実際の空洞、雨仕舞いを考えてください。'}
]);
export const R190AA_TASKS=TASKS;
export function buildR190AAPrompt(task){
 if(!TASKS.some(t=>t.id===task?.id&&t.brief===task.brief))fail('UNKNOWN_TASK');
 return [task.brief,'',
  '【独立した新規建築設計の研究】既存建築の形状や固定テンプレートをコピーせず、寸法・質量・空洞・支持床・入口・動線・屋根をモデル自身が独立に決めてください。',
  '壁を無垢に埋めた箱を「部屋」と呼ばないこと。床上に少なくとも2ブロックの空気がある実用空間、外から進入できる開口、室間の移動を実際の加算・切削で造形してください。',
  'B143 design、spatialPlan、explanation、assumptionsを持つJSONを返してください。designOnly=true。ワールド施工は禁止。',
  '建築の美しさや機能が自己申告で証明されることはありません。できなかった要求は明記してください。'
 ].join('\n');
}
export function parseR190AAArgs(argv){
 const o={run:false,model:'qwen3:14b',batch:'pilot-01',count:3};
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(k==='--run'&&!o.run){o.run=true;continue}
  if(['--model','--batch','--count'].includes(k)&&argv[i+1]){
   const prop=k.slice(2);
   if(Object.hasOwn(o,'_seen_'+prop))fail('DUPLICATE_ARGUMENT');
   o['_seen_'+prop]=true;
   o[prop]=prop==='count'?Number(argv[++i]):argv[++i];continue;
  }
  fail('ARGUMENTS');
 }
 for(const k of Object.keys(o))if(k.startsWith('_seen_'))delete o[k];
 if(!MODEL.test(o.model)||!BATCH.test(o.batch)||![1,3,5].includes(o.count))
  fail('INVALID_MODEL_BATCH_OR_COUNT');
 return o;
}
function archived(output,model,prompt){
 const original=path.join(output,'R190_I_ORIGINAL_RESPONSE.txt');
 if(!fs.existsSync(original))return {status:'HOLD_NO_PROVIDER_ORIGINAL',rawSha256:null,physical:null};
 const raw=file(original),rawSha256=sha(raw);
 const rp=fs.existsSync(path.join(output,'R190_H_RECEIPT.json'))?
  'R190_H_RECEIPT.json':'R190_I_CAPTURE_RECEIPT.json';
 if(!fs.existsSync(path.join(output,rp)))fail('RAW_WITHOUT_RECEIPT');
 const receipt=JSON.parse(file(path.join(output,rp),40000));
 if(!safeReceipt(receipt)||receipt.originalRawSha256!==rawSha256||
    receipt.originalRequestSha256!==sha(prompt)||receipt.modelRequested!==model||
    file(path.join(output,'R190_I_ORIGINAL_BRIEF.txt'),16000)!==prompt)
  fail('ORIGINAL_PROVENANCE_OR_SAFETY');
 let physical=null;
 if(receipt.schema==='minecraftaibuilder-r190-h-direct-b143-research-v1'||
   (receipt.schema==='minecraftaibuilder-r190-j-capture-v1'&&
    receipt.providerConfirmedComplete===true)){
  try{
   const data=JSON.parse(raw),compiled=compileDesign(data.design);
   if(!verifyCompiled(data.design,compiled)||
    compiled.sourceSha256!==(receipt.sourceSha256??receipt.unapprovedGeometryEvidence?.sourceSha256)||
    compiled.geometrySha256!==(receipt.geometrySha256??receipt.unapprovedGeometryEvidence?.geometrySha256))
    fail('RAW_GEOMETRY_HASH_MISMATCH');
   physical=measureR190TSource(data.design,data.spatialPlan);
  }catch(e){
   if(String(e?.message??'').startsWith('R190AA_RAW_GEOMETRY_HASH_MISMATCH'))throw e;
  }
 }
 return {status:physical?'COMPILED_B143_ART_HOLD':'HOLD_B143_NOT_COMPARABLE',
  modelReceiptStatus:receipt.status,rawSha256,physical};
}
function archiveOverview(root){
 if(!fs.existsSync(root))return {status:'NO_LOCAL_BATCHES',batches:[],modelCalls:0,...safe()};
 if(!dir(root))fail('UNSAFE_ROOT');
 const batches=fs.readdirSync(root).filter(n=>BATCH.test(n)).sort().map(name=>{
  const p=path.join(root,name);
  if(!dir(p))fail('UNSAFE_BATCH');
  const manifest=JSON.parse(file(path.join(p,'R190AA_BATCH_MANIFEST.json'),25000));
  if(manifest.schema!=='minecraftaibuilder-r190aa-batch-v1'||!safeReceipt(manifest))
   fail('UNTRUSTED_BATCH');
  return {batch:name,model:manifest.modelRequested,count:manifest.tasks.length,
   completed:fs.existsSync(path.join(p,'R190AA_BATCH_SUMMARY.json'))};
 });
 return {status:'READ_ONLY',batches,modelCalls:0,...safe()};
}
export async function runR190AABatch(args=[],{
 evidenceRoot=R190AA_ROOT,modelRunner=runR190Local,fetcher=fetch
}={}){
 const o=Array.isArray(args)?parseR190AAArgs(args):args;
 if(o.help)return {help:'Read-only by default. Explicit local model trial: node scripts/r190aa-local-work-pilot.mjs --run --model qwen3:14b --batch pilot-01 --count 3. Count: 1, 3 or 5. Never rerun a batch name.'};
 if(!o.run)return archiveOverview(path.resolve(evidenceRoot));
 if(!MODEL.test(o.model)||!BATCH.test(o.batch)||![1,3,5].includes(o.count))fail('INVALID_OPTIONS');
 const root=path.resolve(evidenceRoot),batch=path.join(root,o.batch);
 if(fs.existsSync(root)&&!dir(root))fail('UNSAFE_ROOT');
 if(fs.existsSync(batch))fail('BATCH_ALREADY_EXISTS_NO_AUTOMATIC_RETRY');
 // Only a literal loopback Ollama endpoint; never remote, redirects or downloads.
 const localFetch=(u,options={})=>{
  if(u!=='http://127.0.0.1:11434/api/tags'&&
     u!=='http://127.0.0.1:11434/v1/chat/completions')fail('NONLOCAL_PROVIDER');
  return fetcher(u,{...options,redirect:'error'});
 };
 const tags=await localFetch('http://127.0.0.1:11434/api/tags',{method:'GET'});
 if(!tags?.ok)fail('OLLAMA_UNAVAILABLE');
 const list=await tags.json();
 if(!Array.isArray(list?.models)||!list.models.some(x=>x?.name===o.model))
  fail('MODEL_NOT_INSTALLED_NO_DOWNLOAD');
 fs.mkdirSync(root,{recursive:true});
 // A single immutable manifest claims the whole batch before any request.
 fs.mkdirSync(batch);
 const tasks=TASKS.slice(0,o.count).map(t=>({id:t.id,brief:t.brief,
  promptSha256:sha(buildR190AAPrompt(t))}));
 write(path.join(batch,'R190AA_BATCH_MANIFEST.json'),{
  schema:'minecraftaibuilder-r190aa-batch-v1',modelRequested:o.model,
  tasks,sourceOnly:true,localOllamaOnly:true,
  comparisonsAndArt:'NOT_CERTIFIED',...safe()});
 const results=[];
 for(const task of TASKS.slice(0,o.count)){
  const prompt=buildR190AAPrompt(task),out=path.join(batch,task.id);
  write(path.join(batch,task.id+'.attempt.json'),{
   schema:'minecraftaibuilder-r190aa-case-attempt-v1',caseId:task.id,
   modelRequested:o.model,promptSha256:sha(prompt),
   actualProviderConsumption:'UNKNOWN_UNTIL_CAPTURED',
   sourceOnly:true,...safe()});
  let providerError=null;
  try{
   await modelRunner({mode:'architectural-b143',transport:'openai',
    model:o.model,prompt,out,requiredCapabilities:[],expectFile:null,
    replayPath:null},{fetcher:localFetch});
  }catch(e){providerError=String(e?.message??e).slice(0,180)}
  let evidence;
  try{evidence=archived(out,o.model,prompt)}
  catch(e){evidence={status:'HOLD_UNTRUSTED_CAPTURE',rawSha256:null,physical:null};
   providerError=String(e?.message??e).slice(0,180)}
  const result={caseId:task.id,modelRequested:o.model,
   promptSha256:sha(prompt),providerError, ...evidence,
   humanArtReview:'ART_HOLD',independentBriefCoverage:'NOT_CERTIFIED',
   worldWrites:0,worldContacts:0};
  write(path.join(batch,task.id+'.observation.json'),result);
  results.push(result);
  if(evidence.status==='HOLD_NO_PROVIDER_ORIGINAL'||
     evidence.status==='HOLD_UNTRUSTED_CAPTURE')break;
 }
 const summary={schema:'minecraftaibuilder-r190aa-batch-summary-v1',
  status:results.length===o.count?'CAPTURED_ART_HOLD':'HOLD_INCOMPLETE_BATCH',
  modelRequested:o.model,caseResults:results,
  attemptedRequests:results.length,
  sourceOnly:true,actualMinecraftWalking:'NOT_TESTED',
  independentArchitectureQualityCertified:false,
  humanArtReview:'ART_HOLD',...safe()};
 write(path.join(batch,'R190AA_BATCH_SUMMARY.json'),summary);
 return {batchDirectory:batch,...summary};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190AABatch(process.argv.slice(2)).then(r=>{
  console.log(JSON.stringify(r,null,2));
  if(String(r.status).startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{console.error('R190AA_HOLD',String(e?.message??e));process.exitCode=2});
}