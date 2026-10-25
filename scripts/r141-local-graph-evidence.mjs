/**
 * R141: one-command TRUE local spatial-design trial. No Qwen mock, user
 * fixture, remote API, world adapter, auto-commit or model retraining.
 *
 * node scripts/r141-local-graph-evidence.mjs
 * node scripts/r141-local-graph-evidence.mjs --model qwen3:14b
 *
 * Discovers installed Ollama Qwen/Gemma, asks ONE genuinely new brief, runs
 * the R140 one-response room-program+graph+equipment compiler and stores the
 * complete raw response, compiled 3D HTML, and independent safety/provenance
 * receipt. Source-only outcomes are NEVER gameplay or art approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {chooseR136Model} from './r136-local-evidence.mjs';
import {runR134FreshModel} from './r134-fresh-model-pilot.mjs';
import {auditR143GraphEvidence} from './r143-independent-graph-audit.mjs';

const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const fail=x=>{throw Error('R141_TRIAL_'+x);};
export const CASE=Object.freeze({
 id:'living-infrastructure-commons',
 brief:'Imagine an original small community infrastructure commons combining an inviting demonstration entry zone, a hands-on physical fabrication studio, a separate technical repair bay, and a quiet planning and discussion room. Choose which rooms need DIRECT internal connections, which useful area should face the public entrance, the comparative zone sizes, assembled functional equipment in every room, and an expressive daylight roof. Avoid merely renaming a linear hallway or selecting a known building template.'
});
const safe=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const write=(dir,file,value)=>fs.writeFileSync(path.join(dir,file),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',
 {flag:'wx'});
const iso=()=>new Date().toISOString().replace(/[:.]/g,'-');
export function parseR141Args(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const allowed=new Set(['--model','--out','--endpoint']),args={};
 if(argv.length%2)fail('PAIR_ARGS');
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i],value=argv[i+1];
  if(!allowed.has(key)||Object.hasOwn(args,key)||
   typeof value!=='string'||!value.trim()||value.startsWith('--'))
   fail('BAD_ARG_'+key);
  args[key]=value;
 }
 const endpoint=args['--endpoint']??
  'http://127.0.0.1:11434/v1/chat/completions';
 const selected=args['--model']??null;
 if(!ENDPOINT.test(endpoint)||selected!==null&&!MODEL.test(selected))
  fail('ONLY_LOCAL_EXACT_MODEL');
 const outDir=path.resolve(args['--out']??('r141-graph-real-'+iso()));
 return {model:selected,endpoint,outDir};
}
export async function runR141GraphTrial({model=null,endpoint=
 'http://127.0.0.1:11434/v1/chat/completions',outDir}={},
 {fetcher=fetch,runSingle=runR134FreshModel}={}){
 if(typeof outDir!=='string'||!outDir.trim()||
  !ENDPOINT.test(endpoint)||
  (model!==null&&!MODEL.test(model))||
  typeof fetcher!=='function'||typeof runSingle!=='function')
  fail('RUN_REQUEST');
 if(fs.existsSync(outDir))fail('NO_OVERWRITE');
 const synthetic=fetcher!==fetch||runSingle!==runR134FreshModel;
 const folder=path.resolve(outDir),started=Date.now();
 fs.mkdirSync(folder,{recursive:false});
 const report={
  schema:'r141-real-local-spatial-graph-trial-v1',
  status:'HOLD_NOT_STARTED',
  brief:CASE.brief,
  testInjectionPresent:synthetic,
  installedModelNames:null,
  selectedModel:null,modelTier:null,
  modelCalls:0,rawReplyCaptured:false,
  modelSelectedRelations:false,
  compiledGraph3D:false,sourceSha256:null,geometrySha256:null,
  modelRequestedDirectPairs:0,sourceVerifiedDirectDoors:0,
  modelRequestedEntryRoomId:null,sourceEntranceRoomVerified:false,
  spatialDecisionDemonstrated:false,
  independentVoxelAuditStatus:'NOT_CHECKED',
  roomCount:null,equipmentCount:null,
  sourceRoutes:'NOT_CHECKED',
  humanArtReview:'NOT_REVIEWED',mac8GB2B:'NOT_TESTED',
  minecraftWalking:'NOT_TESTED',
  originalWorldPreserved:true,worldContacts:0,worldWrites:0,
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]}
 };
 try{
  const discovery=await preflightR125Ollama({
   model:model??'qwen3:14b',endpoint,fetcher
  });
  report.installedModelNames=discovery.installedModels;
  const chosen=chooseR136Model(discovery.installedModels,{requested:model});
  write(folder,'R141_READONLY_MODEL_SELECTION.json',{selection:chosen,
   installedModels:discovery.installedModels,realInference:false});
  if(chosen.status!=='MODEL_FOUND'){
   report.status=chosen.status;return report;
  }
  report.selectedModel=chosen.selected;
  report.modelTier=chosen.tier;
  const result=await runSingle({
   model:chosen.selected,brief:CASE.brief,
   outDir:path.join(folder,'single-real-local-attempt'),
   equipmentMode:'assembled',topologyMode:'graph',recoveryMode:'none',
   siteWidth:32,siteDepth:32,endpoint
  },{fetcher});
  report.modelCalls=result.modelCalls;
  report.rawReplyCaptured=result.originalModelResponseCaptured;
  report.modelSelectedRelations=result.relationalIntentFromModel===true&&!synthetic;
  report.compiledGraph3D=result.realRoomGraph3D===true;
  report.sourceSha256=result.sourceSha256;
  report.geometrySha256=result.geometrySha256;
  report.roomCount=result.zoneCount;
  report.equipmentCount=result.equipmentCount;
  report.sourceRoutes=result.sourceRoutes;
  report.inferenceStatus=result.status;
  report.failureReason=result.reason??null;
  if(result.realRoomGraph3D===true){
   const base=path.join(folder,'single-real-local-attempt');
   const intent=JSON.parse(fs.readFileSync(
    path.join(base,'R139_MODEL_SPATIAL_RELATIONS.json'),'utf8'));
   const audit=JSON.parse(fs.readFileSync(
    path.join(base,'R139_GRAPH_SOURCE_AUDIT.json'),'utf8'));
   report.modelRequestedDirectPairs=intent.directAdjacencies.length;
   report.sourceVerifiedDirectDoors=audit.directDoors.length;
   report.modelRequestedEntryRoomId=intent.entryFacingZoneId;
   report.sourceEntranceRoomVerified=
    audit.entryFacing?.zoneId===intent.entryFacingZoneId&&
    audit.entryFacing?.exteriorEntranceDirectlyOpensIntoSelectedRoom===true&&
    audit.entryFacing?.interiorThresholdSupportedAndClearInB143Source===true;
   const read=file=>JSON.parse(fs.readFileSync(
    path.join(base,file),'utf8'));
   const independent=auditR143GraphEvidence({
    intent,graphAudit:audit,
    graphDesign:read('R139_HOST_GRAPH_B143_SOURCE.json'),
    finalDesign:read('DERIVED_B143_SOURCE.json'),
    finalCompiled:read('DERIVED_REAL_VOXELS.json'),
    roomProgram:read('R139_HOST_ROOM_SECTOR_PROGRAM.json'),
    featurePlacements:read('R139_HOST_GRAPH_EQUIPMENT_PLACEMENTS.json')
   });
   write(base,'R143_INDEPENDENT_VOXEL_AUDIT.json',independent);
   report.independentVoxelAuditStatus=independent.status;
   report.spatialDecisionDemonstrated=
    report.sourceEntranceRoomVerified&&
    report.sourceRoutes==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
    independent.status==='SOURCE_ROOM_GRAPH_VERIFIED'&&
    independent.directPairCount===intent.directAdjacencies.length&&
    independent.independentlyVerifiedDirectPairCount>=1;
  }
  if(synthetic)report.status='HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE';
  else if(result.status==='SOURCE_CANDIDATE_REAL_LOCAL_RESPONSE_HUMAN_REVIEW_REQUIRED'&&
   result.realRoomGraph3D&&result.relationalIntentFromModel&&
   result.sourceRoutes==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   report.spatialDecisionDemonstrated&&
   result.modelCalls===1&&result.originalModelResponseCaptured===true)
   report.status='REAL_LOCAL_ROOM_GRAPH_3D_SOURCE_REVIEW_REQUIRED';
  else report.status=result.realRoomGraph3D&&
   !report.spatialDecisionDemonstrated?
    'HOLD_GRAPH_SPATIAL_DECISION_NOT_DEMONSTRATED':
    'HOLD_REAL_LOCAL_GRAPH_OR_GEOMETRY';
  const page='<!doctype html><html lang="ja"><meta charset="utf-8">'+
   '<title>R141 source-only local model room-graph trial</title>'+
   '<style>body{font:15px/1.6 system-ui;max-width:1100px;margin:auto;'+
   'padding:24px;background:#0d1925;color:#edf6ff}iframe{height:650px;'+
   'width:100%;border:1px solid #69849f}a{color:#9bd8ff}</style>'+
   '<h1>R141｜本物のローカルモデルが選ぶ部屋の関係</h1>'+
   '<p>モデル: '+safe(chosen.selected)+' / 判定: '+safe(report.status)+
   ' / 3Dはソース由来でありMinecraft内歩行・美術品質は未認証。</p>'+
   (report.compiledGraph3D?'<iframe title="Compiled B143 3D" src="'+
    'single-real-local-attempt/index.html"></iframe>':
    '<p>モデル生成または幾何はHOLD。推論原本とレポート参照。</p>')+
   '<p><a href="R141_REPORT.json">判定根拠</a> · '+
   '<a href="single-real-local-attempt/MODEL_RAW_ORIGINAL.txt">'+
   'モデル原文（存在する場合）</a></p></html>';
  write(folder,'index.html',page);
  return report;
 }catch(e){
  report.status=synthetic?
   'HOLD_TEST_DOUBLE_OR_RUNNER_ERROR':'HOLD_PREFLIGHT_OR_TRIAL_ERROR';
  report.failureReason=String(e?.message??e).slice(0,400);
  return report;
 }finally{
  report.elapsedMs=Date.now()-started;
  write(folder,'R141_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const options=parseR141Args(process.argv.slice(2));
  if(options.help)console.log(
   'node scripts/r141-local-graph-evidence.mjs [--model EXACT_INSTALLED_QWEN_OR_GEMMA] [--out NEW_FOLDER] — one local inference, no Minecraft writes');
  else{
   const report=await runR141GraphTrial(options);
   console.log(JSON.stringify({status:report.status,
    model:report.selectedModel,modelCalls:report.modelCalls,
    sourceRoutes:report.sourceRoutes,outDir:options.outDir,
    worldWrites:report.worldWrites}));
   if(report.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
