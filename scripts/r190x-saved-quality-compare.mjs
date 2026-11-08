/**
 * R190-X: observational three-way review of SAVED R/S/W model originals.
 * Zero model, network, Minecraft/world calls. No geometric repair or winner.
 * Outputs are derivative SHA-bound measurements and truly compiled 3D views.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectR190SOriginal,diagnoseR190SGeometry,
 buildR190SRedesignPrompt,R190S_ROOT} from './r190s-evidence-redesign.mjs';
import {R190W_ROOT,inspectR190WPlan,buildR190WFirstPrompt,
 buildR190WGeometryPrompt} from './r190w-two-stage-study.mjs';
import {r190rEvidenceRoot} from './r190r-one-click-direct-study.mjs';
import {compareR190TSource,measureR190TSource} from './r190t-source-comparison.mjs';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const sha=v=>createHash('sha256').update(v,'utf8').digest('hex');
const error=v=>{throw Error('R190X_'+v)};
const safe=r=>r?.readiness==='NOT_PREPARED'&&
 r.constructionApproved===false&&r.executionAllowed===false&&
 r.worldContacts===0&&r.worldWrites===0&&r.gates?.length===9&&
 r.gates.every(x=>x==='BLOCKED')&&Array.isArray(r.BuildPlan?.operations)&&
 r.BuildPlan.operations.length===0;
const folder=p=>{try{const stat=fs.lstatSync(p);
 return stat.isDirectory()&&!stat.isSymbolicLink()}catch{return false}};
const read=(d,n,limit=160000)=>{
 if(!folder(d))error('UNSAFE_DIRECTORY');
 const p=path.join(d,n);
 let stat;
 try{stat=fs.lstatSync(p)}catch{error('MISSING_'+n)}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>limit)
  error('UNSAFE_FILE_'+n);
 return fs.readFileSync(p,'utf8');
};
const data=(d,n,limit)=>{try{return JSON.parse(read(d,n,limit))}
 catch(e){error('INVALID_JSON_'+n)}};
const root=path.dirname(r190rEvidenceRoot());
export const R190X_ROOT=path.join(root,'r190x-local-evidence');
const find=(dir,re,key,parent,model)=>{
 if(!folder(dir))return null;
 for(const name of fs.readdirSync(dir).filter(x=>re.test(x)).sort().reverse()){
  const loc=path.join(dir,name);
  if(!folder(loc))error('UNSAFE_CANDIDATE_DIRECTORY');
  const mfile=key==='parentOriginalRawSha256'?'R190S_COMPARISON.json':'R190W_RESULT.json';
  const m=data(loc,mfile,30000);
  if(m[key]===parent&&m.modelRequested===model)return loc;
 }
 return null;
};
function chooseBase(explicit){
 if(explicit)return inspectR190SOriginal(explicit);
 const home=r190rEvidenceRoot();
 if(!folder(home))error('MISSING_R190R_LOCAL_EVIDENCE');
 for(const name of fs.readdirSync(home).filter(x=>/^r190r-\d+-\d+$/.test(x)).sort().reverse()){
  const dir=path.join(home,name);
  try{return inspectR190SOriginal(dir)}catch{}
 }
 error('NO_VERIFIED_R190R_ORIGINAL');
}
function captureR190XSource(d,expectedModel,expectedRequest){
 const receiptName=fs.existsSync(path.join(d,'R190_H_RECEIPT.json'))?
  'R190_H_RECEIPT.json':'R190_I_CAPTURE_RECEIPT.json';
 const r=data(d,receiptName,40000),raw=read(d,'R190_I_ORIGINAL_RESPONSE.txt');
 const prompt=read(d,'R190_I_ORIGINAL_BRIEF.txt',15000);
 if(!safe(r)||r.modelRequested!==expectedModel||
  !['minecraftaibuilder-r190-h-direct-b143-research-v1',
    'minecraftaibuilder-r190-j-capture-v1'].includes(r.schema)||
  r.originalRawSha256!==sha(raw)||r.originalRequestSha256!==sha(prompt)||
  prompt!==expectedRequest||r.rawProviderBytesPreserved!==true)
  error('SOURCE_RECEIPT_OR_PROMPT');
 if(r.schema==='minecraftaibuilder-r190-j-capture-v1'&&
    r.providerConfirmedComplete!==true)
  error('SOURCE_PROVIDER_INCOMPLETE');
 let doc,compiled;
 try{doc=JSON.parse(raw);compiled=compileDesign(doc.design)}
 catch{error('SOURCE_NOT_VALID_B143')}
 if(!verifyCompiled(doc.design,compiled))error('SOURCE_COMPILER_FIDELITY');
 const expectedSource=r.sourceSha256??r.unapprovedGeometryEvidence?.sourceSha256;
 const expectedGeometry=r.geometrySha256??r.unapprovedGeometryEvidence?.geometrySha256;
 if(expectedSource!==compiled.sourceSha256||
    expectedGeometry!==compiled.geometrySha256)
  error('SOURCE_B143_HASH_CHAIN');
 return {rawSha256:sha(raw),design:doc.design,spatialPlan:doc.spatialPlan,
  compiled,receipt:r};
}
export function compareR190XSaved({from=null,s=null,w=null,out=null}={}){
 const baseline=chooseBase(from);
 const negative=buildR190SRedesignPrompt(diagnoseR190SGeometry(baseline));
 const first=buildR190WFirstPrompt(negative);
 const sPath=s??find(R190S_ROOT,/^r190s-\d+-\d+$/,'parentOriginalRawSha256',
  baseline.rawSha256,baseline.model);
 const wPath=w??find(R190W_ROOT,/^r190w-\d+-\d+$/,'parentRawSha256',
  baseline.rawSha256,baseline.model);
 if(!sPath||!wPath)return {status:'HOLD_SAVED_REAL_MODEL_RESULTS_MISSING',
  missingS:!sPath,missingW:!wPath,modelCalls:0,worldContacts:0,worldWrites:0};
 const sm=data(sPath,'R190S_COMPARISON.json',30000);
 const sp=read(sPath,'R190_I_ORIGINAL_BRIEF.txt',15000);
 if(!safe(sm)||sm.schema!=='minecraftaibuilder-r190s-redesign-v1'||
    sm.parentOriginalRawSha256!==baseline.rawSha256||
    sm.modelRequested!==baseline.model||
    sm.redesignPromptSha256!==sha(negative)||
    sp!==negative||sm.hostRepairedOrGeneratedGeometry!==false||
    sm.parentOriginalUnmodified!==true)
  error('R190S_PROVENANCE');
 const S=captureR190XSource(sPath,baseline.model,negative);
 if(S.rawSha256!==sm.redesignOriginalRawSha256||
    S.receipt.status!==sm.newModelStatus)error('R190S_ORIGINAL_MISMATCH');
 const wm=data(wPath,'R190W_RESULT.json',30000);
 if(!safe(wm)||wm.schema!=='minecraftaibuilder-r190w-result-v1'||
    wm.parentRawSha256!==baseline.rawSha256||
    wm.modelRequested!==baseline.model||
    wm.planningPromptSha256!==sha(first)||
    !['B143_COMPARABLE_ART_HOLD','NO_NEW_VOXEL_GEOMETRY_ART_HOLD'].includes(wm.status)||
    wm.modelCallsAttempted!==2||wm.stage1ProviderFinishReason!=='stop'||
    wm.hostGeneratedGeometry!==false)
  error('R190W_PROVENANCE');
 const planRaw=read(wPath,'R190W_PLAN_RAW.txt',12000);
 if(wm.stage1RawSha256!==sha(planRaw)||read(wPath,'R190W_PLAN_PROMPT.txt',15000)!==first)
  error('R190W_PLAN_SHA');
 const plan=inspectR190WPlan(planRaw);
 const second=buildR190WGeometryPrompt(negative,plan);
 if(wm.stage2PromptSha256!==sha(second)||
    read(wPath,'R190W_GEOMETRY_PROMPT.txt',15000)!==second)
  error('R190W_SECOND_PROMPT_SHA');
 const W=captureR190XSource(path.join(wPath,'b143-model-original'),
  baseline.model,second);
 if(wm.stage2RawSha256!==W.rawSha256)error('R190W_ORIGINAL_MISMATCH');
 const bToS=compareR190TSource({beforeDesign:baseline.design,
  afterDesign:S.design,beforePlan:baseline.spatialPlan,afterPlan:S.spatialPlan});
 const bToW=compareR190TSource({beforeDesign:baseline.design,
  afterDesign:W.design,beforePlan:baseline.spatialPlan,afterPlan:W.spatialPlan});
 const sToW=compareR190TSource({beforeDesign:S.design,afterDesign:W.design,
  beforePlan:S.spatialPlan,afterPlan:W.spatialPlan});
 // Existing W evidence is not an independent authority: recompute it here.
 const prev=data(wPath,'R190W_PHYSICAL_COMPARISON.json',60000);
 if(JSON.stringify(prev)!==JSON.stringify(bToW)||
    wm.beforeAfterStatus!==bToW.status||
    wm.status!==(bToW.samePhysicalVoxels?
     'NO_NEW_VOXEL_GEOMETRY_ART_HOLD':'B143_COMPARABLE_ART_HOLD'))
  error('R190W_COMPARISON_TAMPER');
 const dto={schema:'minecraftaibuilder-r190x-offline-comparison-v1',
  status:'THREE_SAVED_B143_SOURCES_COMPARABLE_ART_HOLD',
  baseline:{originalSha256:baseline.rawSha256,modelClaimed:baseline.model,
   geometrySha256:baseline.compiled.geometrySha256},
  r190s:{originalSha256:S.rawSha256,modelClaimed:baseline.model,
   geometrySha256:S.compiled.geometrySha256,reportedModelCalls:sm.newModelCalls},
  r190w:{originalSha256:W.rawSha256,modelClaimed:baseline.model,
   geometrySha256:W.compiled.geometrySha256,reportedModelCalls:wm.modelCallsAttempted,
   planningOriginalSha256:wm.stage1RawSha256},
  samePhysicalVoxels:{baselineToS:bToS.samePhysicalVoxels,
   baselineToW:bToW.samePhysicalVoxels,SvsW:sToW.samePhysicalVoxels},
  physicalObservations:{baseline:measureR190TSource(baseline.design,baseline.spatialPlan),
   r190s:bToS.after,r190w:bToW.after},
  comparison:{baselineToS:bToS.status,baselineToW:bToW.status,SvsW:sToW.status},
  modelIdentityCryptographicallyVerified:false,
  unequalModelRequestCounts:true,providersAndSamplingNotNecessarilyMatched:true,
  causalArchitecturalImprovementCertified:false,
  independentRoomOrSawtoothCertification:false,
  humanArtReview:'ART_HOLD',winner:'NOT_ESTABLISHED',
  modelCalls:0,sourceOnly:true,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldContacts:0,worldWrites:0};
 const dest=path.resolve(out??path.join(R190X_ROOT,'r190x-'+Date.now()+'-'+process.pid));
 if(fs.existsSync(dest))error('OUTPUT_ALREADY_EXISTS');
 // First-use one-click creates only a fresh evidence directory beneath the
 // existing canonical project, NEVER another checkout or world directory.
 if(!folder(path.dirname(dest))){
  if(out!==null||!folder(path.dirname(R190X_ROOT)))
   error('OUTPUT_PARENT_MISSING');
  fs.mkdirSync(R190X_ROOT);
 }
 if(!folder(path.dirname(dest)))error('OUTPUT_PARENT_MISSING');
 const template=read(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai'),'b143-viewer-template.html',150000);
 const scenes=[['BASELINE',baseline.design],['R190S',S.design],['R190W',W.design]];
 const views=scenes.map(([id,design])=>{
  const compiled=compileB143Gallery([design]);
  return [id+'_3D.html',renderB143Html(compiled,template)];
 });
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R190-X saved model comparison — ART HOLD</title>'+
  '<style>body{background:#151a23;color:#fff;font:15px system-ui;margin:18px}'+
  'main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}'+
  'iframe{width:100%;height:70vh;border:1px solid #737f91}'+
  '@media(max-width:950px){main{grid-template-columns:1fr}iframe{height:52vh}}</style>'+
  '<h1>R190-X 保存済みモデル原文・真正B143比較</h1>'+
  '<p>旧案／R190-S／R190-Wを同じボクセル測定器で比較。'+
  '実モデルの身份・美術品質・独立室・実機歩行は未認証。'+
  'R190-Sは1回、R190-Wは2回のモデル呼び出しを想定した観察比較で、'+
  '因果的な勝敗を認定しません。</p>'+
  '<main>'+scenes.map(([id])=>'<section><h2>'+id+
   '</h2><iframe title="'+id+'" src="'+id+'_3D.html"></iframe></section>').join('')+
  '</main></html>';
 fs.mkdirSync(dest);
 const save=(name,content)=>fs.writeFileSync(path.join(dest,name),content,{flag:'wx'});
 for(const [name,content] of views)save(name,content);
 save('R190X_VISUAL_REVIEW.html',html);
 save('R190X_OFFLINE_COMPARE.json',JSON.stringify(dto,null,2)+'\n');
 return {status:dto.status,directory:dest,report:'R190X_OFFLINE_COMPARE.json',
  visual:'R190X_VISUAL_REVIEW.html',modelCalls:0,worldContacts:0,worldWrites:0,
  art:'ART_HOLD'};
}
function args(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 if(argv.length%2)error('ARGUMENTS');
 const keys={'--from':'from','--s':'s','--w':'w','--out':'out'},o={};
 for(let i=0;i<argv.length;i+=2){
  const k=keys[argv[i]];
  if(!k||Object.hasOwn(o,k)||!argv[i+1])error('ARGUMENTS');
  o[k]=argv[i+1];
 }
 return o;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const opts=args(process.argv.slice(2));
  const r=opts.help?{help:'Zero-model source comparison: [--from DIR --s DIR --w DIR --out NEW_DIR]'}:
   compareR190XSaved(opts);
  console.log(JSON.stringify(r,null,2));
  if(String(r.status).startsWith('HOLD'))process.exitCode=2;
 }catch(e){console.error('R190X_HOLD',String(e?.message??e));process.exitCode=2}
}
