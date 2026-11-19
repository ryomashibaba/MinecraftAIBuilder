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
import {saveR125SavedThreeGenreBaseline}
 from './r125-saved-three-genre-baseline.mjs';
import {runR125LocalArchitecturePlan,ensurePrivateNewDirectory}
 from './r125-local-architecture-plan-run.mjs';

const fail=code=>{throw Error('R125_BATCH_'+code)};
const exactly=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));

/**
 * Sanitize an upstream SOURCE failure diagnosed while daylight was still
 * unplaced. This reads existing PRIVATE evidence but never copies the
 * model's original design/prompt, retries inference, or changes geometry.
 * "daylight" in the thrown error describes the detection stage, not cause.
 */
export function summarizeR125DaylightBaselineHold(diagnosis){
 const v=diagnosis?.daylightPlacement;
 if(v?.schema!=='r125-daylight-placement-failure-v1'||
    v.upstreamOfWindow!==true)return null;
 const failures=(Array.isArray(v.baselineCirculationFailures)?
  v.baselineCirculationFailures:[]).slice(0,8).map(x=>({
   code:String(x?.code??'UNKNOWN').slice(0,100),
   ...(Number.isInteger(x?.level)?{level:x.level}:{}),
   ...(typeof x?.zone==='string'?{zone:x.zone.slice(0,80)}:{})
 }));
 return {stage:'BEFORE_ROOM_DAYLIGHT',
  failedZoneId:String(v.failed?.zoneId??'unknown').slice(0,80),
  ...(Number.isInteger(v.failed?.level)?{level:v.failed.level}:{}),
  baselineCirculation:String(v.baselineCirculation??'UNKNOWN').slice(0,100),
  circulationFailures:failures,
  baselineRoutes:String(v.baselineRoutes??'UNKNOWN').slice(0,100),
  routeIssues:(Array.isArray(v.baselineRouteIssues)?
   v.baselineRouteIssues:[]).slice(0,8).map(x=>String(x).slice(0,120)),
  sourceOnly:true,originalEdited:false,modelCalls:0,worldWrites:0,
  realMinecraftWalking:'NOT_TESTED'};
}

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
 const pilot=argv.includes('--pilot-three'),repairOnce=argv.includes('--repair-once');
 if(pilot&&argv.filter(x=>x==='--pilot-three').length!==1)
  fail('DUPLICATE_PILOT_FLAG');
 if(argv.filter(x=>x==='--repair-once').length>1)fail('DUPLICATE_REPAIR_FLAG');
 const pairs=argv.filter(x=>x!=='--pilot-three'&&x!=='--repair-once');
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
 if(pilot&&repairOnce)fail('REPAIR_ONLY_EXPLICIT_SINGLE_BRIEF');
 return {model:o['--model'],briefsFile:pilot?null:path.resolve(o['--briefs']),
  pilotThree:pilot,outDir:path.resolve(o['--out']),
  endpoint:o['--endpoint']??DEFAULT_LOCAL_ENDPOINT,
  ...(repairOnce?{repairOnce:true}:{})};
}

/**
 * Model-authored MASSING family, deliberately excluding ID, palette, title,
 * room purpose and footprint SIZE. A different SHA, materials or floor area
 * alone is NOT evidence of a different architectural form.
 */
export function authoredFormFamily(plan){
 // For model-authored spatial trees, a splitPercent/roof expression does not
 // exist. Compare actual authored room dimensions and attachment topology
 // instead. Without this branch independent spatial volumes all falsely look
 // like the SAME form and a genuine multi-brief Windows pilot exits 2.
 if(plan?.levels?.length===1&&
    plan.levels[0]?.layoutMode==='spatial-tree'){
  const spaces=plan.levels[0].spaces;
  const indexById=new Map(spaces.map((s,i)=>[s.id,i]));
  return {layoutMode:'spatial-tree',roomCounts:[spaces.length],
   roomVolumes:spaces.map(room=>{
    const v=room.volume;
    return {width:v.width,depth:v.depth,roofY:v.roofY,
     attach:v.attach?{parentIndex:indexById.get(v.attach.to),
      side:v.attach.side,shift:v.attach.shift}:null,
     spatialUse:room.spatialUse??'enclosed',
     roofProfile:v.roofForm??'flat',
     roofAxis:v.roofForm==='ridge'?v.roofAxis:null};
   })};
 }
 const e=plan?.expression;
 return {levelAxes:plan.levels.map(l=>l.splitAxis),
  roomCounts:plan.levels.map(l=>l.spaces.length),
  roomPartitions:plan.levels.map(l=>({
   primary:l.splitPercent,
   secondary:l.spaces.length===3?l.secondarySplitPercent??50:null
  })),
  roofProfile:e?.roofProfile??'unexpressed-flat',
  ...(e?.ridgeProfile?{ridgeProfile:e.ridgeProfile}:{}),
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
  ...(e?.frontCornerCut?{frontCornerCut:{
    side:e.frontCornerCut.side,width:e.frontCornerCut.width,
    depth:e.frontCornerCut.depth}}:{}),
   ...(e?.rearCourt?{rearCourt:{
    width:e.rearCourt.width,depth:e.rearCourt.depth,
    alignment:e.rearCourt.alignment,entrySide:e.rearCourt.entrySide}}:{}),
   facadeLanguage:e?.facadeLanguage??'plain'};
}
const formHash=plan=>createHash('sha256')
 .update(JSON.stringify(authoredFormFamily(plan))).digest('hex');

export async function runR125ArchitecturePlanBatch({
 model,briefsRaw,outDir,endpoint=DEFAULT_LOCAL_ENDPOINT,repairOnce=false
},{fetcher=fetch,timeoutMs=180000}={}){
 const briefs=parseR125BatchBriefs(briefsRaw);
 if(typeof repairOnce!=='boolean'||(repairOnce&&briefs.length!==1))
  fail('REPAIR_ONLY_EXPLICIT_SINGLE_BRIEF');
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
  modelRevisionLimit:repairOnce?1:0,modelRevisionCount:0,
  totalModelCallAttempts:0,
  experimentOutcome:'NOT_STARTED',
  geometryHashesDistinct:null,modelAuthoredFormFamiliesDistinct:null,
  visualDiversity:'NOT_REVIEWED',
  inGameWalking:'NOT_TESTED',worldWrites:0,
  completed:[],stopReason:null};
 const save=()=>fs.writeFileSync(path.join(dest,'BATCH_REPORT.json'),
  JSON.stringify(report,null,2)+'\n');
 save();
 // The default local qwen3:14b pilot needs its small semantic JSON, not
 // thousands of hidden thinking tokens competing for the 4096-token cap.
 // Ollama's OpenAI-compatible /v1 endpoint uses reasoning_effort:"none";
 // "think:false" is a DIFFERENT (native /api/chat) protocol parameter.
 // Keep non-default/custom LM Studio models and direct adapter callers
 // unchanged: this is an explicit policy only for the bounded V11 batch.
 const pilotReasoningEffort=endpoint===DEFAULT_LOCAL_ENDPOINT&&
  model==='qwen3:14b'?'none':undefined;
 for(const item of briefs){
  const one=await runR125LocalArchitecturePlan({
   model,prompt:item.prompt,endpoint,outDir:path.join(dest,item.id),
   reasoningEffort:pilotReasoningEffort,repairOnce
  },{fetcher,timeoutMs});
  let modelAuthoredFormFamilySha256=null,authoredForm=null,authoredProgram=null;
  let modelAuthoredObservationLink=null;
  const selectedRevision=one.report.modelRevisionApplied===true;
  const selectedRawName=selectedRevision?'MODEL_RESPONSE_REVISED.txt':
   'MODEL_RESPONSE_ORIGINAL.txt';
  if(one.report.sourceVerified){
   // An accepted revision is the genuine SECOND model response, not a HOST
   // repair. The first original remains available under its original SHA.
   const original=JSON.parse(fs.readFileSync(path.join(dest,item.id,
    selectedRawName),'utf8'));
   authoredForm=authoredFormFamily(original);
   modelAuthoredObservationLink=original.observationLink??null;
   authoredProgram=original.levels.map(level=>({splitAxis:level.splitAxis,
    splitPercent:level.splitPercent,
    ...(level.secondarySplitPercent!==undefined?
     {secondarySplitPercent:level.secondarySplitPercent}:{}),
    spaces:level.spaces.map(space=>({id:space.id,purpose:space.purpose,
     ...(space.access?{access:space.access}:{}),
     ...(space.fixture?{fixture:space.fixture}:{}),
     ...(space.fixtures?{fixtures:space.fixtures}:{}),
     ...(space.fixtureDetail?{fixtureDetail:space.fixtureDetail}:{}),
     ...(space.fixtureArrangement?{fixtureArrangement:space.fixtureArrangement}:{}),
     ...(space.ovenHearth?{ovenHearth:space.ovenHearth}:{}),
     ...(space.daylight?{daylight:space.daylight}:{})}))}));
   modelAuthoredFormFamilySha256=formHash(original);
  }
  const diagnosisPath=path.join(dest,item.id,selectedRevision?
   'SOURCE_DIAGNOSIS_REVISED.json':'SOURCE_DIAGNOSIS.json');
  const diagnosis=fs.existsSync(diagnosisPath)?
   JSON.parse(fs.readFileSync(diagnosisPath,'utf8')):null;
  const daylightBaseline=summarizeR125DaylightBaselineHold(diagnosis);
  const row={id:item.id,requestSha256:one.report.requestSha256,
   modelAuthoredFormFamilySha256,authoredForm,authoredProgram,
   modelAuthoredObservationLink,
   modelChosenDaylight:diagnosis?.modelChosenDaylight??0,
   daylightSourceWindows:diagnosis?.daylightSourceWindows??[],
   ...(diagnosis?.pairedWindowApproach?
    {pairedWindowApproach:diagnosis.pairedWindowApproach}:{}),
   // Original plan and checked B143 SOURCE only. Never artistic certification.
   occupiedVoxels:diagnosis?.occupiedVoxels??null,
   sourceRouteStatus:diagnosis?.sourceRoutes??null,
   visitorCirculation:diagnosis?.visitorCirculation??null,
   observationSource:diagnosis?.observationSource??null,
   circulationStatus:diagnosis?.circulation??null,
   programFloorStatus:diagnosis?.programFloors??null,
   visualHighRiskCount:diagnosis?.visualHighRiskCount??null,
   explicitActivityProxy:diagnosis?.explicitActivityProxy??null,
   roomArtAdvisory:diagnosis?.roomUseEvidence?.artAdvisory??null,
   requestedActivityCoverage:diagnosis?.requestedActivityCoverage??
    'NOT_INDEPENDENTLY_VERIFIED_BY_SOURCE',
   modelChosenFixtures:diagnosis?.modelChosenFixtures??0,
   fixtureServiceTotal:diagnosis?.fixtureAccess?.length??0,
   fixtureServiceReached:diagnosis?.fixtureAccess?.filter(x=>
    x.reachableFromEntrance===true&&
    x.supportedTwoWideServiceWitness!==null).length??0,
   failureReason:one.report.reason??diagnosis?.compilerReason??null,
   ...(daylightBaseline?{baselineSourceHold:daylightBaseline}:{}),
   ...(one.report.invalidSetbackOriginal?
    {invalidSetbackOriginal:one.report.invalidSetbackOriginal}:{}),
   sourceIssues:[...(diagnosis?.sourceRouteIssues??[]),
    ...(diagnosis?.circulationFailures??[]),
    ...(daylightBaseline?.routeIssues??[]),
    ...(daylightBaseline?.circulationFailures??[])].slice(0,8),
   status:one.report.status,modelResponsesCaptured:one.report.modelResponsesCaptured,
   sourceVerified:one.report.sourceVerified,
   modelCallAttempts:one.report.modelCallAttempts,
   modelRevisionAttempted:one.report.modelRevisionAttempted===true,
   modelRevisionApplied:selectedRevision,
   originalSha256:one.report.originalSha256,
   ...(selectedRevision?{revisedOriginalSha256:one.report.revisedOriginalSha256,
    initialStatus:one.report.initialStatus}:{}),
   sourceSha256:one.report.sourceSha256??null,
   geometrySha256:one.report.geometrySha256??null,
   review3d:one.report.review3d??'NOT_GENERATED',
   modelRequestElapsedMs:one.report.modelRequestElapsedMs??null,
   providerReportedTokenUsage:one.report.providerReportedTokenUsage??null,
   makeCodeStatus:one.report.makeCodeStatus??'NOT_ATTEMPTED',
   makeCodeReason:one.report.makeCodeReason??null,
   makeCodeSourceSha256:one.report.makeCodeSourceSha256??null};
  report.completed.push(row);report.attempted++;
  report.totalModelCallAttempts+=row.modelCallAttempts??1;
  if(row.modelRevisionAttempted)report.modelRevisionCount++;
  const success=row.status==='B143_SOURCE_CANDIDATE_ART_HOLD'&&
    row.sourceVerified===true;
  if(success)report.sourcePassCount++;
  if(fs.existsSync(path.join(dest,item.id,'MODEL_RESPONSE_ORIGINAL.txt')))
   report.originalResponseCount++;
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
  if(!fs.existsSync(path.join(dest,item.id,'MODEL_RESPONSE_ORIGINAL.txt'))){
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
  report.planned===1?
   'ONE_UNSEEN_BRIEF_SOURCE_PASS_ART_UNREVIEWED_NO_DIVERSITY_CLAIM':
   'ALL_SOURCE_PASS_FORM_VARIETY_CANDIDATE_ART_UNREVIEWED';
 // A real three-genre pilot is useful only if the USER can compare it with
 // the three SAVED genuine Qwen baselines from earlier runs. Build an
 // independent pinned B143 viewer from the already-public original plans;
 // never replace or repair model outputs and never claim a same-prompt A/B.
 // Custom one-to-three-brief trials remain unchanged.
 if(briefs.length===3&&
    briefs.map(x=>x.id).join(',')==='housing,retail,research'){
  const archived=saveR125SavedThreeGenreBaseline(
   path.join(dest,'ARCHIVED_QWEN_BASELINE'));
  report.archivedComparison={
   baselineViewer:'./ARCHIVED_QWEN_BASELINE/index.html',
   basis:'ARCHIVED_PREVIOUSLY_AUTHORED_QWEN14B_NOT_NEW_OR_SAME_PROMPT',
   exactSamePrompt:false,
   countsAreNotArtScores:true,
   baselineNewModelCalls:0,
   comparisonRows:archived.scenes.map(old=>{
    const fresh=report.completed.find(x=>x.id===old.genre);
    const verified=fresh?.sourceVerified===true;
    return {genre:old.genre,archivedB143Voxels:old.voxels,
     archivedSelectedFixtures:old.modelChosenEquipment,
     archivedSourceRoutes:old.sourceRouteStatus,
     newStatus:fresh?.status??'NOT_ATTEMPTED',
     newSourceVerified:verified,
     newB143Voxels:verified?fresh.occupiedVoxels:null,
     newSelectedFixtures:verified?fresh.modelChosenFixtures:null,
     newSourceRoutes:verified?fresh.sourceRouteStatus:null,
     voxelCountDelta:verified?fresh.occupiedVoxels-old.voxels:null};
   })
  };
 }
 save();
 fs.writeFileSync(path.join(dest,'BATCH_COMPARE_3D.html'),
  renderR125BatchComparison(briefs,report),{flag:'wx'});
 return {report,outputDirectory:dest};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=parseR125BatchArgs(process.argv.slice(2));
  if(a.help){
   console.log('R125 batch: --model LOCAL_ID --pilot-three --out NEW_PRIVATE_DIRECTORY (or --briefs PRIVATE_JSON_ARRAY) [--endpoint http://127.0.0.1:PORT/v1/chat/completions] [--repair-once for ONE supplied brief]');
  }else{
   // Bundled pilot is an early development trial, not a held-out final
   // generalization benchmark. Real calls require separately monitored
   // and owned Windows model services.
   const raw=fs.readFileSync(a.pilotThree?
    fileURLToPath(new URL('./r125-v11-pilot-three.json',import.meta.url)):
    a.briefsFile,'utf8');
   const {report}=await runR125ArchitecturePlanBatch({
    model:a.model,briefsRaw:raw,outDir:a.outDir,endpoint:a.endpoint,
    repairOnce:a.repairOnce===true});
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
