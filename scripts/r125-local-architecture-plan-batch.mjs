/**
 * R125 V11 bounded multi-brief author trial. ONE local model, 1..3 sequential
 * calls, one original response per brief, no retry or Minecraft world I/O.
 *
 * node scripts/r125-local-architecture-plan-batch.mjs --model qwen3:14b
 *   --pilot-three --out C:\\private\\NEW-result
 * Or supply --briefs C:\\private\\three-briefs.json for custom requests.
 *
 * BRIEFS is a private JSON array of {"id":"home","prompt":"..."} objects.
 * Uses the existing owned local model lifecycle; never launches Ollama/LM
 * Studio. Report hashes are SOURCE evidence, not ART or in-game passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createR125ArchitecturePlanLocalAdapter,DEFAULT_LOCAL_ENDPOINT}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {renderR125BatchComparison} from './r125-batch-compare.mjs';
import {runR125LocalArchitecturePlan,ensurePrivateNewDirectory}
 from './r125-local-architecture-plan-run.mjs';

const fail=code=>{throw Error('R125_BATCH_'+code)};
const exactly=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));

export function parseR125BatchBriefs(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>32000)
  fail('BRIEFS_FILE_SIZE');
 let parsed;
 try{parsed=JSON.parse(raw)}catch{fail('BRIEFS_NOT_JSON')}
 if(!Array.isArray(parsed)||parsed.length<1||parsed.length>3)
  fail('BRIEF_COUNT_1_TO_3');
 const ids=new Set(),prompts=new Set();
 for(const v of parsed){
  if(!exactly(v,['id','prompt'])||
    typeof v.id!=='string'||!/^[a-z][a-z0-9-]{2,23}$/.test(v.id)||
    typeof v.prompt!=='string'||v.prompt.length<8||v.prompt.length>8000||
    !v.prompt.trim()||ids.has(v.id)||prompts.has(v.prompt.trim()))
   fail('INVALID_DUPLICATE_OR_REPEATED_BRIEF');
  ids.add(v.id);prompts.add(v.prompt.trim());
 }
 return parsed;
}
export function parseR125BatchArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const pilot=argv.includes('--pilot-three');
 if(pilot&&argv.filter(x=>x==='--pilot-three').length!==1)
  fail('DUPLICATE_PILOT_FLAG');
 const pairs=pilot?argv.filter(x=>x!=='--pilot-three'):argv;
 if(pairs.length!== (pilot?4:6)&&pairs.length!== (pilot?6:8))
  fail('ARGS_REQUIRED');
 const o={},allowed=new Set(['--model','--briefs','--out','--endpoint']);
 for(let i=0;i<pairs.length;i+=2){
  const k=pairs[i],v=pairs[i+1];
  if(!allowed.has(k)||Object.hasOwn(o,k)||typeof v!=='string'||
     !v.trim()||v.startsWith('--'))fail('ARGS_INVALID');
  o[k]=v;
 }
 if(!o['--model']||!o['--out']||
    (pilot&&o['--briefs'])||(!pilot&&!o['--briefs'])||
    (pairs.length===(pilot?6:8)&&!o['--endpoint']))
  fail('ARGS_MISSING_OR_CONFLICT');
 return {model:o['--model'],briefsFile:pilot?null:path.resolve(o['--briefs']),
  pilotThree:pilot,outDir:path.resolve(o['--out']),
  endpoint:o['--endpoint']??DEFAULT_LOCAL_ENDPOINT};
}

/**
 * Model-authored MASSING family, deliberately excluding ID, palette, title,
 * room purpose and footprint SIZE. A different SHA, materials or floor area
 * alone is NOT evidence of a different architectural form.
 */
export function authoredFormFamily(plan){
 const e=plan?.expression;
 return {levelAxes:plan.levels.map(l=>l.splitAxis),
  roomCounts:plan.levels.map(l=>l.spaces.length),
  roofProfile:e?.roofProfile??'unexpressed-flat',
  // An unused axis on a flat roof must NOT count as creative variation.
  roofAxis:e&&e.roofProfile!=='flat'?e.roofAxis??null:null,
  roofVolume:e?.roofVolume??'flat-cap',
  roofOverhang:e?.roofOverhang??'none',
  daylightFacade:e?.daylightFacade??'none',
  setbackSide:e?.setbackSide??'none',
  setbackDepth:e?.setbackDepth??0,
  rearCornerCut:e?.rearCornerCut?
   {side:e.rearCornerCut.side??'east',
    width:e.rearCornerCut.width,depth:e.rearCornerCut.depth}:null,
  facadeLanguage:e?.facadeLanguage??'plain'};
}
const formHash=plan=>createHash('sha256')
 .update(JSON.stringify(authoredFormFamily(plan))).digest('hex');

export async function runR125ArchitecturePlanBatch({
 model,briefsRaw,outDir,endpoint=DEFAULT_LOCAL_ENDPOINT
},{fetcher=fetch,timeoutMs=180000}={}){
 const briefs=parseR125BatchBriefs(briefsRaw);
 if(typeof outDir!=='string'||!outDir)fail('OUT_REQUIRED');
 const dest=path.resolve(outDir);
 ensurePrivateNewDirectory(dest);
 // Reuse the one-shot adapter preflight before allocating ANY output paths.
 // Construction validates loopback URL, model, timeout; it does not POST.
 createR125ArchitecturePlanLocalAdapter({
  model,endpoint,fetcher,timeoutMs,onRawModelResponse:()=>{}
 });
 fs.mkdirSync(dest);
 fs.writeFileSync(path.join(dest,'BRIEFS_ORIGINAL.json'),briefsRaw,{flag:'wx'});
 const report={schema:'r125-local-plan-batch-v1',
  model,endpoint,planned:briefs.length,attempted:0,automaticRetries:0,
  requestsParallel:false,allSourceVerified:false,
  sourcePassCount:0,originalResponseCount:0,evaluatedAllBriefs:false,
  experimentOutcome:'NOT_STARTED',
  geometryHashesDistinct:null,modelAuthoredFormFamiliesDistinct:null,
  visualDiversity:'NOT_REVIEWED',
  inGameWalking:'NOT_TESTED',worldWrites:0,
  completed:[],stopReason:null};
 const save=()=>fs.writeFileSync(path.join(dest,'BATCH_REPORT.json'),
  JSON.stringify(report,null,2)+'\n');
 save();
 for(const item of briefs){
  const one=await runR125LocalArchitecturePlan({
   model,prompt:item.prompt,endpoint,outDir:path.join(dest,item.id)
  },{fetcher,timeoutMs});
  let modelAuthoredFormFamilySha256=null,authoredForm=null,authoredProgram=null;
  if(one.report.sourceVerified){
   // Read the exact ORIGINAL response (not repaired SOURCE design) so a
   // HOST-derived difference is never attributed to the local model.
   const original=JSON.parse(fs.readFileSync(path.join(dest,item.id,
    'MODEL_RESPONSE_ORIGINAL.txt'),'utf8'));
   authoredForm=authoredFormFamily(original);
   authoredProgram=original.levels.map(level=>({splitAxis:level.splitAxis,
    spaces:level.spaces.map(space=>({purpose:space.purpose,
     ...(space.fixture?{fixture:space.fixture}:{}),
     ...(space.fixtures?{fixtures:space.fixtures}:{}),
     ...(space.fixtureDetail?{fixtureDetail:space.fixtureDetail}:{}),
     ...(space.daylight?{daylight:space.daylight}:{})}))}));
   modelAuthoredFormFamilySha256=formHash(original);
  }
  const diagnosisPath=path.join(dest,item.id,'SOURCE_DIAGNOSIS.json');
  const diagnosis=fs.existsSync(diagnosisPath)?
   JSON.parse(fs.readFileSync(diagnosisPath,'utf8')):null;
  const row={id:item.id,requestSha256:one.report.requestSha256,
   modelAuthoredFormFamilySha256,authoredForm,authoredProgram,
   modelChosenDaylight:diagnosis?.modelChosenDaylight??0,
   daylightSourceWindows:diagnosis?.daylightSourceWindows??[],
   // Original plan and checked B143 SOURCE only. Never artistic certification.
   occupiedVoxels:diagnosis?.occupiedVoxels??null,
   sourceRouteStatus:diagnosis?.sourceRoutes??null,
   circulationStatus:diagnosis?.circulation??null,
   programFloorStatus:diagnosis?.programFloors??null,
   visualHighRiskCount:diagnosis?.visualHighRiskCount??null,
   modelChosenFixtures:diagnosis?.modelChosenFixtures??0,
   fixtureServiceTotal:diagnosis?.fixtureAccess?.length??0,
   fixtureServiceReached:diagnosis?.fixtureAccess?.filter(x=>
    x.reachableFromEntrance===true&&
    x.supportedTwoWideServiceWitness!==null).length??0,
   failureReason:one.report.reason??diagnosis?.compilerReason??null,
   sourceIssues:[...(diagnosis?.sourceRouteIssues??[]),
    ...(diagnosis?.circulationFailures??[])].slice(0,8),
   status:one.report.status,modelResponsesCaptured:one.report.modelResponsesCaptured,
   sourceVerified:one.report.sourceVerified,
   originalSha256:one.report.originalSha256,
   sourceSha256:one.report.sourceSha256??null,
   geometrySha256:one.report.geometrySha256??null,
   review3d:one.report.review3d??'NOT_GENERATED',
   modelRequestElapsedMs:one.report.modelRequestElapsedMs??null,
   providerReportedTokenUsage:one.report.providerReportedTokenUsage??null,
   makeCodeStatus:one.report.makeCodeStatus??'NOT_ATTEMPTED',
   makeCodeReason:one.report.makeCodeReason??null,
   makeCodeSourceSha256:one.report.makeCodeSourceSha256??null};
  report.completed.push(row);report.attempted++;
  const success=row.status==='B143_SOURCE_CANDIDATE_ART_HOLD'&&
    row.sourceVerified===true;
  if(success)report.sourcePassCount++;
  if(row.modelResponsesCaptured===1)report.originalResponseCount++;
  const geometry=report.completed.map(x=>x.geometrySha256).filter(Boolean);
  report.geometryHashesDistinct=geometry.length<2?null:
   new Set(geometry).size===geometry.length;
  const families=report.completed.map(x=>x.modelAuthoredFormFamilySha256)
   .filter(Boolean);
  report.modelAuthoredFormFamiliesDistinct=families.length<2?null:
   new Set(families).size===families.length;
  // A rejected ArchitecturePlan is valuable training/evaluation evidence,
  // NOT a failure of the service. Continue for the other unfamiliar briefs
  // without repairing or retrying the failed response. Duplicate buildings
  // likewise remain recorded, rather than hiding the third genre.
  // An absent provider original is qualitatively different: stop on that
  // transport/service failure instead of blindly issuing more POSTs.
  if(row.modelResponsesCaptured!==1){
   report.stopReason='STOP_PROVIDER_DID_NOT_RETURN_CAPTURABLE_ORIGINAL';
   save();break;
  }
  save();
 }
 report.evaluatedAllBriefs=report.attempted===report.planned;
 report.allSourceVerified=report.evaluatedAllBriefs&&
  report.sourcePassCount===report.planned;
 report.experimentOutcome=!report.evaluatedAllBriefs?
  'HOLD_PROVIDER_OR_INCOMPLETE':
  !report.allSourceVerified?
   'COMPLETE_WITH_REJECTED_ARCHITECTURES':
  report.geometryHashesDistinct===false?
   'COMPLETE_WITH_IDENTICAL_B143_GEOMETRY':
  report.modelAuthoredFormFamiliesDistinct===false?
   'COMPLETE_WITH_REPEATED_AUTHOR_FORMS':
   'ALL_SOURCE_PASS_FORM_VARIETY_CANDIDATE_ART_UNREVIEWED';
 save();
 fs.writeFileSync(path.join(dest,'BATCH_COMPARE_3D.html'),
  renderR125BatchComparison(briefs,report),{flag:'wx'});
 return {report,outputDirectory:dest};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=parseR125BatchArgs(process.argv.slice(2));
  if(a.help){
   console.log('R125 batch: --model LOCAL_ID --pilot-three --out NEW_PRIVATE_DIRECTORY (or --briefs PRIVATE_JSON_ARRAY) [--endpoint http://127.0.0.1:PORT/v1/chat/completions]');
  }else{
   // Bundled pilot is an early development trial, not a held-out final
   // generalization benchmark. Real calls require separately monitored
   // and owned Windows model services.
   const raw=fs.readFileSync(a.pilotThree?
    fileURLToPath(new URL('./r125-v11-pilot-three.json',import.meta.url)):
    a.briefsFile,'utf8');
   const {report}=await runR125ArchitecturePlanBatch({
    model:a.model,briefsRaw:raw,outDir:a.outDir,endpoint:a.endpoint});
   console.log('R125_LOCAL_BATCH',JSON.stringify(report));
   if(!report.allSourceVerified||
      report.geometryHashesDistinct===false||
      report.modelAuthoredFormFamiliesDistinct===false)process.exitCode=2;
  }
 }catch(error){
  console.error('R125_BATCH_HOLD',String(error?.message??error));
  process.exitCode=2;
 }
}
