/**
 * R190-S: evidence-grounded, ONE opt-in architectural redesign.
 * A rejected direct-B143 reply is treated as a negative example, NEVER as
 * a building or reusable geometric template. Its original bytes stay intact.
 * A new model reply is always a separate source-only HOLD study.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {STUDY_BRIEF,REPO_ROOT} from './r190n-one-click-research.mjs';
import {r190rEvidenceRoot} from './r190r-one-click-direct-study.mjs';
import {runR190Local} from './r190-local-semantic-run.mjs';

const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const ORIGINAL_BRIEF_SHA=sha(STUDY_BRIEF);
const fail=s=>{throw Error('R190S_'+s)};
const security=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const safe=r=>r?.readiness==='NOT_PREPARED'&&r.constructionApproved===false&&
 r.executionAllowed===false&&r.worldContacts===0&&r.worldWrites===0&&
 r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 Array.isArray(r.BuildPlan?.operations)&&r.BuildPlan.operations.length===0;
const R190R_BASE=r190rEvidenceRoot();
export const R190S_ROOT=path.join(path.dirname(R190R_BASE),'r190s-local-evidence');
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
function file(dir,name,limit=100000){
 const f=path.join(dir,name),s=fs.lstatSync(f);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>limit)
  fail('UNSAFE_OR_MISSING_'+name);
 return fs.readFileSync(f,'utf8');
}
const json=(dir,name)=>JSON.parse(file(dir,name,40000));
function isOrdinaryFolder(p){
 try{const s=fs.lstatSync(p);return s.isDirectory()&&!s.isSymbolicLink();}
 catch{return false;}
}
export function inspectR190SOriginal(dir){
 const folder=path.resolve(dir);
 if(!isOrdinaryFolder(folder))fail('SOURCE_DIRECTORY');
 const receipt=json(folder,'R190_I_CAPTURE_RECEIPT.json');
 const report=json(folder,'R190R_ROUTE_COMPARISON.json');
 const original=file(folder,'R190_I_ORIGINAL_RESPONSE.txt');
 const prompt=file(folder,'R190_I_ORIGINAL_BRIEF.txt',10000);
 if(receipt.schema!=='minecraftaibuilder-r190-j-capture-v1'||
  report.schema!=='minecraftaibuilder-r190r-direct-v1'||
  receipt.status!=='HOLD_MODEL_RESPONSE_OR_SPATIAL_REVIEW'||
  receipt.originalRawSha256!==sha(original)||
  report.originalDirectRawSha256!==sha(original)||
  report.directReviewStatus!==receipt.status||
  report.modelRequested!==receipt.modelRequested||
  receipt.originalRequestSha256!==ORIGINAL_BRIEF_SHA||
  report.frozenBriefSha256!==ORIGINAL_BRIEF_SHA||
  prompt!==STUDY_BRIEF||!safe(receipt)||!safe(report)||
  receipt.providerConfirmedComplete!==true||
  !MODEL.test(receipt.modelRequested??''))fail('BASELINE_EVIDENCE_CHAIN');
 let data,compiled;
 try{
  data=JSON.parse(original);
  compiled=compileDesign(data.design);
  if(!verifyCompiled(data.design,compiled))fail('B143_INTEGRITY');
 }catch{fail('BASELINE_B143_UNAVAILABLE')}
 if(data?.design?.designOnly!==true||
  compiled.sourceSha256!==receipt.unapprovedGeometryEvidence?.sourceSha256||
  compiled.geometrySha256!==receipt.unapprovedGeometryEvidence?.geometrySha256||
  compiled.primitives.length!==receipt.unapprovedGeometryEvidence?.trueB143Voxels)
  fail('BASELINE_GEOMETRY_SHA_CHAIN');
 return {directory:folder,rawSha256:sha(original),model:receipt.modelRequested,
  receipt,design:data.design,spatialPlan:data.spatialPlan,compiled};
}
export function diagnoseR190SGeometry({design,spatialPlan,compiled}){
 if(!verifyCompiled(design,compiled))fail('UNVERIFIED_GEOMETRY');
 const occupied=new Set(compiled.primitives.map(([x,y,z])=>x+','+y+','+z));
 const bbox=compiled.bounds,area=(bbox.maxX-bbox.minX+1)*(bbox.maxZ-bbox.minZ+1);
 const layers=new Map(),roof=new Map();
 for(const [x,y,z] of compiled.primitives){
  layers.set(y,(layers.get(y)||0)+1);
  const key=x+','+z;
  roof.set(key,Math.max(y,roof.get(key)??-1));
 }
 const nearlySolidLayers=[...layers].filter(([y,count])=>count>=.85*area)
  .map(([y])=>y).sort((a,b)=>a-b);
 const largePlates=design.elements.filter(e=>e.mode==='add'&&e.shape==='box'&&!e.shell&&
  e.size[0]>=.65*(bbox.maxX-bbox.minX+1)&&
  e.size[2]>=.65*(bbox.maxZ-bbox.minZ+1)&&
  e.size[1]<=4).map(e=>e.id).slice(0,12);
 const standable=([x,y,z],h=2)=>Number.isInteger(x)&&Number.isInteger(y)&&Number.isInteger(z)&&
  y>0&&y+h<=design.bounds.height&&occupied.has(x+','+(y-1)+','+z)&&
  Array.from({length:h},(_,i)=>!occupied.has(x+','+(y+i)+','+z)).every(Boolean);
 const zones=Array.isArray(spatialPlan?.functionalZones)?spatialPlan.functionalZones:[];
 const zoneChecks=zones.slice(0,8).map(zone=>{
  if(!Array.isArray(zone.origin)||!Array.isArray(zone.size)||
     !zone.origin.concat(zone.size).every(Number.isInteger)||
     zone.size.some(v=>v<1||v>128))return {id:String(zone.id).slice(0,60),invalid:true};
  let stands=0;
  const [ax,ay,az]=zone.origin,[sx,sy,sz]=zone.size;
  for(let y=ay;y<ay+sy;y++)for(let z=az;z<az+sz;z++)
   for(let x=ax;x<ax+sx;x++)if(standable([x,y,z],2))stands++;
  const minimumRequiredPositions=Number.isSafeInteger(zone.minimumReachablePositions)?
   zone.minimumReachablePositions:null;
  return {id:String(zone.id).slice(0,60),standablePositions:stands,
   modelDeclaredMinimumPositions:minimumRequiredPositions,
   belowModelDeclaredMinimum:minimumRequiredPositions===null?null:
    stands<minimumRequiredPositions};
 });
 const entrance=Array.isArray(spatialPlan?.entrance)?spatialPlan.entrance:null;
 const tops=[...new Set(roof.values())].sort((a,b)=>a-b);
 return {
  schema:'minecraftaibuilder-r190s-voxel-critique-v1',
  compiledSourceSha256:compiled.sourceSha256,
  compiledGeometrySha256:compiled.geometrySha256,
  finalVoxelCount:compiled.primitives.length,
  nearSolidHorizontalLayers:nearlySolidLayers,
  broadSourcePlateIds:largePlates,
  modelDeclaredEntranceStandable:entrance?standable(entrance,spatialPlan.headroom===3?3:2):false,
  modelDeclaredZoneSamples:zoneChecks,
  roofTopHeightLevels:tops.length,
  roofTopHeightMin:tops[0]??null,roofTopHeightMax:tops.at(-1)??null,
  actualRoomsCertified:false,actualRoofTypeCertified:false,
  realMinecraftWalkingCertified:false,qualityImprovementCertified:false
 };
}
/** This is a NEGATIVE-EVIDENCE BRIEF, not a repaired B143 source. */
export function buildR190SRedesignPrompt(critique){
 if(critique?.schema!=='minecraftaibuilder-r190s-voxel-critique-v1')
  fail('NO_TRUSTED_CRITIQUE');
 const layers=critique.nearSolidHorizontalLayers.length,rooms=critique.modelDeclaredZoneSamples,
  shortfall=rooms.filter(z=>z.belowModelDeclaredMinimum===true).length;
 return [
  STUDY_BRIEF,
  '',
  '【別設計への明示的な再挑戦】以前の案は不採用です。元の形状や座標を写したり、ホストによる修理を前提にしたりせず、建築全体をあなた自身で最初から再構想してください。',
  '前案の実際のB143幾何をコンパイルして確認したところ、広い範囲を埋め尽くす水平層'+layers+
   '段、モデル自身が申告した立脚位置の最低数に満たない機能領域'+shortfall+'/'+rooms.length+
   '件、正しく立てると確認できない入口が'+(critique.modelDeclaredEntranceStandable?'0':'1')+
   '件ありました。これはモデルの文章説明とは独立した幾何検証です。',
  '新案は展示・修理・保管を別々の中空な実用空間として作り、外部から入口を実際に貫通させ、支持床上の立脚点と連続した通行経路を設けてください。展示から修理へ直接通れるようにしてください。部屋を無垢のboxで埋めたり、階段を立体空間のない板の内部に置いたりしてはいけません。',
  '求められた鋸歯状屋根は名称や説明で済ませず、B143の実際の加算/切削形状として表現し、室内の空間を塞がずに雨水の逃げ方を説明してください。構成・非対称性・採光・用途の関係は自由に創作してください。モデル自身で寸法・形状・素材を決めてください。',
  'spatialPlanの入口と目的地は最終ボクセルに対して支持床・頭上2ブロック以上の空気を満たす立脚点にしてください。maximumPathStepsは少なくとも水平マンハッタン距離を下回らず、障害物を考慮して余裕を取ってください。自己申告だけで成立を主張しないでください。',
  '必ずB143 designとspatialPlanを1回のJSON応答で返し、失敗した旧案の局所修理ではなく、利用可能な建築を設計してください。'
 ].join('\n');
}
function candidates(){
 const list=[
  R190R_BASE,
  path.join(REPO_ROOT,'r190r-local-evidence'),
  path.resolve(REPO_ROOT,'..','MinecraftAIBuilder-R190R','r190r-local-evidence')
 ];
 const dirs=[];
 for(const root of [...new Set(list)]){
  if(!isOrdinaryFolder(root))continue;
  for(const name of fs.readdirSync(root).filter(x=>/^r190r-\d+-\d+$/.test(x)).sort().reverse()){
   const dir=path.join(root,name);
   if(isOrdinaryFolder(dir))dirs.push(dir);
  }
 }
 return dirs;
}
function chooseSource(explicit=null){
 if(explicit!==null)return inspectR190SOriginal(explicit);
 for(const dir of candidates()){try{return inspectR190SOriginal(dir)}catch{}}
 fail('NO_VERIFIED_REJECTED_R190R_SOURCE_USE_FROM_DIR');
}
function capturedRedesign(dir,sourceSha,promptSha,model){
 try{
  const m=json(dir,'R190S_COMPARISON.json');
  const r=fs.existsSync(path.join(dir,'R190_H_RECEIPT.json'))?
   json(dir,'R190_H_RECEIPT.json'):json(dir,'R190_I_CAPTURE_RECEIPT.json');
  const raw=file(dir,'R190_I_ORIGINAL_RESPONSE.txt');
  const prompt=file(dir,'R190_I_ORIGINAL_BRIEF.txt',10000);
  if(m.schema!=='minecraftaibuilder-r190s-redesign-v1'||
   m.parentOriginalRawSha256!==sourceSha||
   m.redesignPromptSha256!==promptSha||m.modelRequested!==model||
   m.redesignOriginalRawSha256!==sha(raw)||
   r.originalRawSha256!==sha(raw)||r.originalRequestSha256!==promptSha||
   promptSha!==sha(prompt)||!safe(m)||!safe(r))return null;
  return m;
 }catch{return null}
}
export function parseR190SArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 const o={from:null};
 for(let i=0;i<args.length;i++){
  if(args[i]==='--from'&&o.from===null&&args[i+1]){
   o.from=args[++i];continue;
  }
  fail('INVALID_ARGUMENT_OR_DUPLICATE');
 }
 return o;
}
export async function runR190SStudy(args=[],{
 evidenceRoot=R190S_ROOT,modelRunner=runR190Local,
 fetcher=fetch,timestamp=()=>Date.now(),transport='native'
}={}){
 const o=Array.isArray(args)?parseR190SArgs(args):args;
 if(o?.help)return {help:'RUN_R190S_REDESIGN.cmd [--from ORIGINAL_R190R_FOLDER]. No automatic retries.'};
 if(!o||o.from!==null&&typeof o.from!=='string'||!['native','openai'].includes(transport))
  fail('INVALID_OPTIONS');
 const original=chooseSource(o.from);
 const critique=diagnoseR190SGeometry(original);
 const prompt=buildR190SRedesignPrompt(critique),promptSha=sha(prompt);
 if(prompt.length>8000)fail('PROMPT_TOO_LONG');
 const root=path.resolve(evidenceRoot);
 if(process.platform==='win32'&&root===path.resolve(R190S_ROOT)){
  const project=path.dirname(root);
  if(!isOrdinaryFolder(project))fail('CANONICAL_PROJECT_MISSING');
 }
 if(fs.existsSync(root)&&!isOrdinaryFolder(root))fail('UNSAFE_RESULT_ROOT');
 if(isOrdinaryFolder(root)){
  for(const name of fs.readdirSync(root).filter(x=>/^r190s-\d+-\d+$/.test(x))){
   const dir=path.join(root,name);
   if(!isOrdinaryFolder(dir))continue;
   const prior=capturedRedesign(dir,original.rawSha256,promptSha,original.model);
   if(prior)return {status:prior.newModelStatus,reused:true,directory:dir,
    modelCalls:0,originalRawSha256:prior.redesignOriginalRawSha256,
    originalParentSha256:prior.parentOriginalRawSha256,quality:'NOT_ASSESSED',
    worldContacts:0,worldWrites:0};
  }
 }
 fs.mkdirSync(root,{recursive:true});
 const out=path.join(root,'r190s-'+String(timestamp())+'-'+String(process.pid));
 if(fs.existsSync(out))fail('REFUSE_EXISTING_RESULT');
 const options={mode:'architectural-b143',transport,model:original.model,
  prompt,out,requiredCapabilities:[],expectFile:null,replayPath:null};
 let error=null;
 try{await modelRunner(options,{fetcher});}catch(e){error=e}
 let r,newRaw;
 try{
  r=fs.existsSync(path.join(out,'R190_H_RECEIPT.json'))?
   json(out,'R190_H_RECEIPT.json'):json(out,'R190_I_CAPTURE_RECEIPT.json');
  newRaw=file(out,'R190_I_ORIGINAL_RESPONSE.txt');
  if(!safe(r)||r.originalRawSha256!==sha(newRaw)||
     r.originalRequestSha256!==promptSha||
     file(out,'R190_I_ORIGINAL_BRIEF.txt',10000)!==prompt||
     r.rawProviderBytesPreserved!==true)fail('NEW_EVIDENCE_CHAIN');
 }catch{if(error)throw error;fail('NO_VALID_CAPTURE')}
 const m={schema:'minecraftaibuilder-r190s-redesign-v1',
  parentOriginalRawSha256:original.rawSha256,
  parentCompiledGeometrySha256:original.compiled.geometrySha256,
  parentModelStatus:original.receipt.status,
  modelRequested:original.model,modelIdentityCryptographicallyVerified:false,
  parentArchitectureRejected:true,parentOriginalUnmodified:true,
  redesignOriginalRawSha256:sha(newRaw),redesignPromptSha256:promptSha,
  redesignSourceGeneratedOnlyByModel:true,hostRepairedOrGeneratedGeometry:false,
  newModelStatus:r.status,newModelCalls:1,
  sourceOnly:true,independentJapaneseRequestCoverage:'NOT_CERTIFIED',
  humanArtReview:'ART_HOLD',qualitySuperiority:'NOT_ESTABLISHED',
  trueMinecraftWalking:'NOT_TESTED',parentVoxelCritique:critique,
  ...security()};
 fs.writeFileSync(path.join(out,'R190S_COMPARISON.json'),
  JSON.stringify(m,null,2)+'\n',{flag:'wx'});
 return {status:r.status,reused:false,directory:out,modelCalls:1,
  originalRawSha256:sha(newRaw),originalParentSha256:original.rawSha256,
  baselineCritique:critique,
  quality:'NOT_ASSESSED',humanArtReview:'ART_HOLD',
  errorCaptured:error!==null,worldWrites:0,worldContacts:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190SStudy(process.argv.slice(2)).then(r=>{
  console.log(JSON.stringify(r,null,2));
  if(String(r.status).startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{console.error('R190S_HOLD',String(e?.message??e));process.exitCode=1});
}
