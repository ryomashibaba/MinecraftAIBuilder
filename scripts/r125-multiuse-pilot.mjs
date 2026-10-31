/**
 * R125 two new real local-model architectural uses: shop + research studio.
 * Compare with the historical, USER-UPLOADED original 14B residential plan.
 * One CLI, 2 new inferences maximum, never contacts Minecraft.
 * No category routing: ALL case prompts call the SAME semantic pilot/compiler.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {parseR125SemanticArgs,runR125SemanticPilot}
 from './r125-semantic-pilot.mjs';
export const SUITES=Object.freeze([
 {id:'entry-shop',title:'Entranced neighborhood shop',expectedLevels:1,
  prompt:'平屋の小規模な店舗を独自に設計してください。来客が入れる売場と、従業員が使うバックヤードという異なる2つの機能領域を設けてください。入口、窓、陳列と接客のための利用空間を考え、素材、平面分割の向き、面積配分、外形寸法を独自に決めてください。家や図書館に流用せず店舗として必要な機能を考えてください。'},
 {id:'research-studio',title:'Two-level research studio',expectedLevels:2,
  prompt:'二階建ての小型研究施設を独自に構想してください。各階に異なる2つの活動領域を設け、観測・実験・記録・議論などから建物の目的に合う機能を選んでください。作業室と機材のための利用空間、入口、窓、安全に区画された動線、上下階の接続を考え、素材、階ごとの分割方向と面積配分、外形寸法を自分で決めてください。既存の住宅配置を名前だけ変えて流用しないでください。'}
]);
const BASELINE=new URL('./fixtures/r125-qwen14b-residential-2024a.json',import.meta.url);
const fail=reason=>{throw Error('R125_MULTIUSE_'+reason);};
const save=(folder,name,doc)=>fs.writeFileSync(path.join(folder,name),
 JSON.stringify(doc,null,2)+'\n',{flag:'wx'});
function historicalHome(){
 const source=JSON.parse(fs.readFileSync(BASELINE,'utf8'));
 const output=compileArchitecturePlan(source);
 if(output.planSha256!=='46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271'||
  output.sourceSha256!=='4ca2edf2eb066f2f0eecd7dfdc4a710a1e69bc7196c5f85c65483caaa0d9fbd1'||
  output.geometrySha256!=='0fc0db6814e105db62da272abb1235cce9d77d4950eab2a0e91d940283201a2e'||
  output.compiled.primitives.length!==2620)fail('HISTORICAL_SOURCE_DRIFT');
 return {id:'historical-home',source:'USER_UPLOADED_REAL_QWEN14B_PLAN_FROM_20261024',
  sourceStatus:'HISTORICAL_REPLAY_ONLY_NO_NEW_INFERENCE',
  model:'qwen3:14b',levels:source.levels.length,
  planSha256:output.planSha256,sourceSha256:output.sourceSha256,
  geometrySha256:output.geometrySha256,voxels:2620,
  earlierMeasuredElapsedMs:14613,newModelCalls:0,
  humanVisualReview:'NOT_REVIEWED',worldWalking:'NOT_TESTED'};
}
export function parseR125MultiuseArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const base=parseR125SemanticArgs(argv);
 return {model:base.model,outDir:base.outDir,endpoint:base.endpoint};
}
export async function runR125Multiuse({model,outDir,endpoint}={},
 {fetcher=fetch,runSingle=runR125SemanticPilot}={}){
 if(typeof fetcher!=='function'||typeof runSingle!=='function')fail('DEPENDENCIES');
 const args=parseR125SemanticArgs(['--model',model,'--out',outDir,
  ...(endpoint?['--endpoint',endpoint]:[])]);
 if(fs.existsSync(args.outDir))fail('OUTPUT_ALREADY_EXISTS');
 const old=historicalHome(); // check first before altering local outputs
 fs.mkdirSync(args.outDir,{recursive:false});
 const injected=fetcher!==fetch||runSingle!==runR125SemanticPilot;
 const report={
  schema:'r125-multiuse-real-source-comparison-v1',
  modelId:model,source:'ONE_ARCHITECTUREPLAN_COMPILER_FOR_ALL_USES',
  knownPreviousResidence:old,originalResidenceRetained:true,
  newModelCalls:0,reportedTrials:[],testInjectionPresent:injected,
  noHardcodedBuildingGenreRouter:true,
  worldWrites:0,constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),status:'HOLD_NOT_STARTED'
 };
 try{
  for(const suite of SUITES){
   const out=path.join(args.outDir,suite.id);
   try{
    const one=await runSingle({model,endpoint:args.endpoint,
     prompt:suite.prompt,outDir:out},{fetcher});
    const safe={
     id:suite.id,requestedLevels:suite.expectedLevels,
     status:one.status,reason:one.reason??null,
     actualModelCallCount:one.modelCalls??0,
     elapsedMs:one.elapsedMs??null,
     originalRawCaptured:one.originalRawCaptured??false,
     planSha256:one.planSha256??null,
     geometrySha256:one.geometrySha256??null,
     sourceSha256:one.sourceSha256??null,
     voxels:one.sourceVoxelCount??null,
     sourceHighRiskFindings:one.sourceHighRiskFindings??null,
     sourceCirculationStatus:one.sourceCirculationStatus??'NOT_TESTED',
     programFloorStatus:one.programFloorStatus??'NOT_TESTED',
     programFloorIssues:one.programFloorIssues??null,
     nonProgramExteriorAdvisories:one.nonProgramExteriorAdvisories??null,
     provenance:injected?'TEST_DOUBLE_NOT_REAL_MODEL':'LOCAL_LOOPBACK_MODEL_DECLARED',
     humanVisualReview:'NOT_REVIEWED',worldWalking:'NOT_TESTED',
     resultFolder:suite.id
    };
    report.reportedTrials.push(safe);
    report.newModelCalls+=safe.actualModelCallCount;
    if(report.newModelCalls>SUITES.length)fail('INFERENCE_BUDGET');
    // A broken shared transport should not consume another expensive
    // inference. Invalid artistic/geometry outputs may still be compared.
    if(['HOLD_MODEL_TIMEOUT','HOLD_MODEL_NOT_INSTALLED'].includes(one.status)||
     /(?:MODEL_HTTP_|ECONNREFUSED|ENOTFOUND|fetch failed)/i.test(safe.reason??''))break;
   }catch(e){
    report.reportedTrials.push({
     id:suite.id,status:'HOLD_RUNTIME_ERROR',reason:String(e?.message??e).slice(0,350),
     actualModelCallCount:0,sourceSha256:null,geometrySha256:null,
     humanVisualReview:'NOT_REVIEWED',worldWalking:'NOT_TESTED'});
    break;
   }
  }
  const completed=report.reportedTrials.length===SUITES.length;
  const allSources=completed&&report.reportedTrials.every(x=>
   x.status==='SOURCE_AND_3D_READY_HUMAN_REVIEW_REQUIRED'&&
   typeof x.geometrySha256==='string'&&x.geometrySha256.length===64&&
   typeof x.planSha256==='string'&&x.planSha256.length===64&&
   x.originalRawCaptured===true&&x.sourceCirculationStatus==='SOURCE_CLEARANCE_PROBES_PASS'&&
   x.programFloorIssues===0);
  const hashes=new Set([old.geometrySha256,
   ...report.reportedTrials.map(x=>x.geometrySha256)]);
  const distinct=completed&&hashes.size===3;
  report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
   !completed?'HOLD_PARTIAL_TEST_RESULTS':
   allSources&&distinct?'MULTIUSE_SOURCE_COMPARISON_READY_HUMAN_REVIEW':
   'HOLD_SOURCE_OR_FUNCTIONAL_QA';
  report.geometryDistinctFromHistorical=distinct;
  report.allSourcesCompiledAndProgramFloorQA=allSources;
  // Keep this older property conservative: general B198C HIGH warnings are
  // still present in the source evidence even when limited program floors pass.
  report.allSourcesPassSourceQA=allSources&&
   report.reportedTrials.every(x=>x.sourceHighRiskFindings===0);
  report.generalSourceHighRiskTotal=completed?
   report.reportedTrials.reduce((n,x)=>n+(x.sourceHighRiskFindings??0),0):null;
  report.semanticProgramPhysicallyRealized='NOT_ESTABLISHED';
  report.aestheticApproval=false;
  report.inGameWalkingCertified=false;
  return report;
 }finally{
  save(args.outDir,'R125_MULTIUSE_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125MultiuseArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-multiuse-pilot.mjs --model qwen3:14b --out NEW_FOLDER (TWO new local inference calls maximum, zero world writes)');
  else{
   const result=await runR125Multiuse(args);
   console.log(JSON.stringify({status:result.status,
    trials:result.reportedTrials.map(x=>({
     id:x.id,status:x.status,voxels:x.voxels??null,
     reason:x.reason??null})),newModelCalls:result.newModelCalls,
    out:args.outDir,worldWrites:0}));
   if(result.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error('R125_MULTIUSE_HOLD',String(e.message??e));process.exitCode=2;}
}
