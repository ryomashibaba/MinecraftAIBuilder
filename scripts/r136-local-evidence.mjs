/**
 * R136 one-command, non-template, REAL local Ollama capability audit:
 * one installed Qwen/Gemma model, three unseen briefs, actual source+3D,
 * verbatim model responses, inspectable failure evidence and model tier.
 *
 * No simulated successes are classified as real inference; no Minecraft I/O.
 * node scripts/r136-local-evidence.mjs    # auto-pick installed model
 * node scripts/r136-local-evidence.mjs --model qwen3:14b --cases 3
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {runR134FreshModel} from './r134-fresh-model-pilot.mjs';
export const CASES=Object.freeze([
 Object.freeze({id:'resilience-center',
  brief:'Design an original compact disaster-resilience innovation center where visitors can explore prototype repairs, community engineers can build physical components, and volunteers can access emergency equipment. Arrange three or four distinct useful zones with meaningful priorities, circulation and appropriate objects; avoid an ordinary rectangular corridor of renamed identical rooms.'}),
 Object.freeze({id:'living-materials-lab',
  brief:'Create an original small living-materials research atelier with spaces for specimen observation, hands-on biomaterial fabrication and separated equipment maintenance. Add meaningful furnishings to every active area, daylight and a distinctive roof appropriate to the work, with a usable connected entry.'}),
 Object.freeze({id:'future-learning-hub',
  brief:'Conceive a compact public experimental learning pavilion with distinct activities for inventing physical mechanisms, presenting experiments and collaborative discussion, and managing shared supplies. Choose a new interior ordering, space allocation and physical equipment rather than relabeling a house.'})
]);
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const fail=x=>{throw Error('R136_EVIDENCE_'+x);};
const nowUTC=()=>new Date().toISOString().replace(/[:.]/g,'-');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const save=(dir,name,value)=>fs.writeFileSync(path.join(dir,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const isQwenGemma=s=>/^(qwen|gemma)/i.test(s);
const smallModel=s=>/(?:^|[:/_-])(?:e2b|e4b|0\.5b|0\.8b|1b|1\.5b|2b|3b|4b)(?:$|[-_.])/i.test(s);
export function chooseR136Model(installed,{requested=null}={}){
 if(!Array.isArray(installed)||installed.some(s=>typeof s!=='string'||!MODEL.test(s))||
  new Set(installed).size!==installed.length||installed.length>1000)
  fail('MODEL_LIST_UNTRUSTED');
 if(requested!==null){
  if(!MODEL.test(requested))fail('MODEL_NAME');
  if(!installed.includes(requested))return {status:'HOLD_EXACT_MODEL_NOT_INSTALLED',
   requested,selected:null,tier:'NOT_TESTED'};
  return {status:'MODEL_FOUND',requested,selected:requested,
   tier:smallModel(requested)?'SMALL_CANDIDATE_NOT_MAC_MEASURED':
    'LARGER_OR_UNKNOWN_NOT_SMALL_MODEL_PROOF'};
 }
 const candidates=installed.filter(isQwenGemma);
 if(!candidates.length)return {status:'HOLD_NO_QWEN_GEMMA_INSTALLED',
  requested:null,selected:null,tier:'NOT_TESTED'};
 const small=candidates.filter(smallModel).sort((a,b)=>{
  const weight=s=>/e2b|0\.5b|0\.8b/i.test(s)?0:
   /(?:^|:)1b\b|1\.5b/i.test(s)?1:/2b|3b/i.test(s)?2:3;
  return weight(a)-weight(b)||a.localeCompare(b);
 });
 const selected=small[0]??candidates.sort()[0];
 return {status:'MODEL_FOUND',requested:null,selected,
  tier:small.length?'SMALL_CANDIDATE_NOT_MAC_MEASURED':
   'LARGER_OR_UNKNOWN_NOT_SMALL_MODEL_PROOF'};
}
export function parseR136Args(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const allowed=new Set(['--model','--out','--cases','--endpoint']);
 const args={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i],v=argv[i+1];
  if(!allowed.has(k)||Object.hasOwn(args,k)||typeof v!=='string'||
   !v.trim()||v.startsWith('--'))fail('INVALID_ARG_'+k);
  args[k]=v;
 }
 if(args['--model']&&!MODEL.test(args['--model']))fail('MODEL_NAME');
 const endpoint=args['--endpoint']??
  'http://127.0.0.1:11434/v1/chat/completions';
 const p=ENDPOINT.exec(endpoint);
 if(!p||Number(p[1])<1||Number(p[1])>65535)
  fail('LOOPBACK_ONLY');
 const cases=args['--cases']??'3';
 if(!['1','3'].includes(cases))fail('CASES_ONE_OR_THREE');
 const out=args['--out']??path.join(process.cwd(),'r136-real-'+nowUTC());
 return {model:args['--model']??null,outDir:path.resolve(out),
  cases:Number(cases),endpoint};
}
export function compileR136Report({model,selection,runs,source}){
 const summaries=runs.map(({id,brief,report})=>({
  id,brief,status:report.status,modelCalls:report.modelCalls,
  originalModelResponseCaptured:report.originalModelResponseCaptured,
  semanticProgramFromModel:report.modelAuthoredProgram,
  zoneCount:report.zoneCount,voxels:report.voxels,
  equipmentCount:report.equipmentCount??0,
  addedEquipmentVoxels:report.addedEquipmentVoxels??0,
  sourceRoutes:report.sourceRoutes,sourceSha256:report.sourceSha256,
  geometrySha256:report.geometrySha256,
  failureReason:report.reason??null,elapsedMs:report.elapsedMs??null,
  worldWrites:report.worldWrites
 }));
 const geometryHashes=summaries.filter(x=>x.geometrySha256).map(x=>x.geometrySha256);
 const sourceReady=summaries.filter(x=>
  x.status==='SOURCE_CANDIDATE_REAL_LOCAL_RESPONSE_HUMAN_REVIEW_REQUIRED').length;
 const synthetic=source!=='LOCAL_PROVIDER_NOT_AUTHENTICATED'||runs.some(x=>
  x.report.testInjectionPresent===true||x.report.modelAuthoredProgram===false);
 let status;
 if(synthetic)status='HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE';
 else if(sourceReady!==runs.length)status='HOLD_REAL_MODEL_GENERATION_OR_GEOMETRY';
 else status='REAL_LOCAL_PROVIDER_SOURCE_CANDIDATES_VISUAL_REVIEW_REQUIRED';
 return {
  schema:'r136-real-local-3-brief-evidence-v1',status,model,
  modelSelection:selection,
  providerAuthenticity:'NOT_INDEPENDENTLY_AUTHENTICATED',
  modelTier:selection.tier,
  isAppleSilicon8GBProven:false,
  sourceOnlyValidCases:sourceReady,totalCases:runs.length,
  distinctGeometryHashes:new Set(geometryHashes).size,
  independentHumanArtReview:'NOT_REVIEWED',
  actualMinecraftWalking:'NOT_TESTED',
  userBriefToModelSourceEvidence:summaries,
  noGenreSpecificBuildingTemplate:true,
  source3DNotArtQualityCertification:true,
  constructionApproved:false,executionAllowed:false,
  readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0
 };
}
function html(report){
 const cards=report.userBriefToModelSourceEvidence.map((s,i)=>{
  const dir='case-'+String(i+1)+'-'+s.id;
  const good=s.sourceSha256!==null;
  return '<section><h2>'+esc(s.id)+'</h2><p>'+esc(s.brief)+'</p>'+
   '<p>'+esc(s.status)+' — '+(s.zoneCount??'?')+' rooms, '+
   (s.equipmentCount??0)+' equipment, '+(s.voxels??'?')+' voxels</p>'+
   (good?'<iframe loading="lazy" title="'+esc(s.id)+
    '" src="'+dir+'/index.html"></iframe>'+
    '<p><a href="'+dir+'/shell.html">設備追加前の3D</a> · '+
    '<a href="'+dir+'/index.html">設備追加後の3D</a></p>':
    '<p>HOLD: '+esc(s.failureReason??'model output unavailable')+'</p>')+
   '</section>';
 }).join('');
 return '<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>R136 actual local model evidence</title>'+
  '<style>body{font:15px/1.6 system-ui;background:#0b1725;color:#eaf4ff;'+
  'margin:0;padding:clamp(14px,2vw,32px)}h1{font-size:1.6rem}'+
  '.grid{display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));gap:12px}'+
  'section{min-width:0;background:#1b2e40;padding:12px;border-radius:12px}'+
  'iframe{width:100%;height:470px;border:1px solid #49647a}'+
  'a{color:#83d8ff}@media(max-width:920px){.grid{grid-template-columns:1fr}}</style>'+
  '</head><body><h1>R136｜実ローカルモデル3用途生成の証拠</h1>'+
  '<p>モデル：'+esc(report.model)+'. 状態：'+esc(report.status)+
  '. 出力の構造/動線はソース検証であり、美術・Minecraft内歩行は未審査。</p>'+
  '<p>各プロンプトに対する生応答・3Dソース・検査・経過時間を個別保存。'+
  'サイズ区分はモデル名からの推定であり、Mac 8GB動作の証拠ではありません。</p>'+
  '<div class="grid">'+cards+'</div>'+
  '<a href="R136_SUMMARY.json">検証サマリーJSON</a></body></html>';
}
export async function runR136Benchmark({model=null,outDir,
 cases=3,endpoint='http://127.0.0.1:11434/v1/chat/completions'}={},
 {fetcher=fetch,runSingle=runR134FreshModel}={}){
 if(typeof outDir!=='string'||!outDir.trim()||
  !ENDPOINT.test(endpoint)||![1,3].includes(cases)||
  (model!==null&&!MODEL.test(model))||typeof fetcher!=='function'||
  typeof runSingle!=='function')fail('ARG_CONTRACT');
 if(fs.existsSync(outDir))fail('OUTPUT_ALREADY_EXISTS');
 const root=path.resolve(outDir),injected=fetcher!==fetch||
  runSingle!==runR134FreshModel,started=Date.now();
 fs.mkdirSync(root,{recursive:false});
 let result;
 try{
  const discovery=await preflightR125Ollama({
   model:model??'qwen3.5:2b',endpoint,fetcher
  });
  const selection=chooseR136Model(discovery.installedModels,{requested:model});
  save(root,'LOCAL_MODEL_DISCOVERY.json',{
   modelRequested:model,installedModels:discovery.installedModels,
   selection,readOnlyPreflight:true,noGenerationYet:true
  });
  if(selection.status!=='MODEL_FOUND'){
   result={schema:'r136-real-local-3-brief-evidence-v1',
    status:selection.status,model:null,modelSelection:selection,
    totalCases:cases,modelCalls:0,
    worldWrites:0,constructionApproved:false,
    readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
    BuildPlan:{operations:[]}};
   return result;
  }
  const runs=[];
  for(const [i,row] of CASES.slice(0,cases).entries()){
   const subDir=path.join(root,'case-'+String(i+1)+'-'+row.id);
   let report;
   try{
    report=await runSingle({model:selection.selected,brief:row.brief,
     outDir:subDir,equipmentMode:'assembled',endpoint},{fetcher});
   }catch(e){
    report={status:'HOLD_THROWN_GENERATION',
     reason:String(e?.message??e).slice(0,450),
     modelCalls:0,originalModelResponseCaptured:false,
     modelAuthoredProgram:false,
     sourceSha256:null,geometrySha256:null,zoneCount:null,
     equipmentCount:0,voxels:null,sourceRoutes:'NOT_CHECKED',
     worldWrites:0,testInjectionPresent:injected};
    fs.mkdirSync(subDir,{recursive:false});
    save(subDir,'R136_CASE_ERROR.json',report);
   }
   runs.push({...row,report});
  }
  result=compileR136Report({model:selection.selected,selection,runs,
   source:injected?'TEST_DOUBLE':'LOCAL_PROVIDER_NOT_AUTHENTICATED'});
  result.elapsedMs=Date.now()-started;
  save(root,'index.html',html(result));
  return result;
 }catch(e){
  result={schema:'r136-real-local-3-brief-evidence-v1',
   status:'HOLD_PREFLIGHT_OR_EXECUTION',reason:String(e?.message??e).slice(0,450),
   modelCalls:0,worldWrites:0,constructionApproved:false,
   readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]}};
  return result;
 }finally{
  save(root,'R136_SUMMARY.json',result);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR136Args(process.argv.slice(2));
  if(args.help)console.log('node scripts/r136-local-evidence.mjs [--model EXACT_INSTALLED_QWEN_OR_GEMMA] [--cases 1|3] [--out NEW_FOLDER] (3 fresh briefs, local Ollama only, zero Minecraft writes)');
  else{
   const r=await runR136Benchmark(args);
   console.log(JSON.stringify({status:r.status,model:r.model??null,
    validCases:r.sourceOnlyValidCases??0,
    totalCases:r.totalCases??0,
    output:args.outDir,worldWrites:0}));
   if(r.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
