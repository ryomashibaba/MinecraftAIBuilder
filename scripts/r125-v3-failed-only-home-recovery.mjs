/**
 * R125 V3: ONE-HOME ONLY recovery of a genuine 4/5 five-genre local-Qwen run.
 * Rechecks source V1/V2, FOUR original V3 responses, all case receipts and
 * their actual B143 material/service geometry BEFORE any further model POST.
 * Preserves original TOP_LEVEL failure, four successes and private evidence.
 * No retries, normalizing bad model JSON, world APIs, or hidden corrections.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectPreservedFiveGenreSources,projectExactSourceVoxels}
 from './r125-five-genre-source-comparison.mjs';
import {verifySavedEnvelope,classifyFunctionFailure}
 from './r125-five-genre-real-functions-pilot.mjs';
import {FUNCTION_SCHEMA,compileFunctionalFacadeV3,
 surveyFunctionalFacadeOpenings,surveyFunctionalFixturePlacements}
 from '../source/ai/r125-functional-facade-v3.mjs';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderFiveGenreSourceEvidence} from './r125-five-genre-source-art-overview.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';
const MODEL='qwen3:14b';
const digest=s=>createHash('sha256').update(s).digest('hex');
const stop=code=>{throw Error('R125_FAILED_ONLY_'+code)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const write=(folder,name,value)=>fs.writeFileSync(path.join(folder,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function read(folder,name,limit=700000){
 const f=path.join(folder,name),st=fs.lstatSync(f);
 if(st.isSymbolicLink()||!st.isFile()||st.size<1||st.size>limit)
  stop('EVIDENCE_FILE_'+name);
 return fs.readFileSync(f,'utf8');
}
function plainFolder(folder){
 const st=fs.lstatSync(folder);
 if(!st.isDirectory()||st.isSymbolicLink())stop('EVIDENCE_FOLDER_SYMLINK');
 return fs.realpathSync(folder);
}
/** Diagnostics, not model repair. Raw input stays byte-for-byte preserved. */
export function auditOriginalHomeTopLevel(raw,planId,roomCount){
 let parsed=null,jsonError=null;
 try{parsed=JSON.parse(raw)}catch(e){jsonError=String(e.message).slice(0,160)}
 const topKeys=parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?
  Object.keys(parsed):[];
 const expected=['schema','planId','rooms'];
 return {
  originalJsonValid:!jsonError,
  parseError:jsonError,
  actualKeys:topKeys,
  expectedKeys:expected,
  missingKeys:expected.filter(k=>!topKeys.includes(k)),
  additionalKeys:topKeys.filter(k=>!expected.includes(k)),
  schemaMatches:parsed?.schema===FUNCTION_SCHEMA,
  planIdMatches:parsed?.planId===planId,
  roomCountMatches:Array.isArray(parsed?.rooms)&&parsed.rooms.length===roomCount,
  rawEdited:false,oldHoldRetained:true};
}
export function inspectFailedOnlyV3Evidence(
 {studyDir,diagnosticFile,envelopeDir,functionsDir}={}){
 if(![studyDir,diagnosticFile,envelopeDir,functionsDir].every(
  s=>typeof s==='string'&&path.isAbsolute(s)))
  stop('ABSOLUTE_INPUTS_REQUIRED');
 const source=inspectPreservedFiveGenreSources({
  studyDir,diagnosticReportFile:diagnosticFile});
 const envelopes=verifySavedEnvelope(source,envelopeDir);
 const oldFolder=plainFolder(functionsDir);
 if(path.dirname(oldFolder)!==path.dirname(source.study)||
    path.dirname(envelopes.folder)!==path.dirname(source.study))
  stop('PRIVATE_EVIDENCE_PARENT_MISMATCH');
 const oldReportRaw=read(oldFolder,'FUNCTIONAL_FACADE_REPORT.json');
 const old=JSON.parse(oldReportRaw);
 if(old.schema!=='r125-five-genre-functional-author-study-v1'||
    old.status!=='HOLD_PARTIAL_FUNCTIONS'||
    old.model!==MODEL||old.testInjectionPresent!==false||
    old.modelCalls!==5||old.worldWrites!==0||
    old.originalProgramsPreserved!==5||old.originalEnvelopesPreserved!==5||
    old.originalStudySha256!==source.originalReportSha256||
    old.previousDiagnosticSha256!==source.diagnosticSha256||
    old.frozenEnvelopeReportSha256!==digest(
     read(envelopes.folder,'EXPRESSIVE_ENVELOPE_REPORT.json'))||
    old.cases?.length!==5||old.summary?.sourcePass!==4||
    old.summary?.technicallyCompiled!==4||
    old.summary?.sharedSymptoms?.length!==0)
  stop('ORIGINAL_REPORT_STATUS_OR_SHA');
 const verified=[];
 for(const [i,c] of envelopes.cases.entries()){
  const row=old.cases[i];
  if(row?.id!==c.id||row.genre!==c.genre||
     row.preservedSpatialGeometrySha256!==c.product.geometrySha256||
     row.preservedRoofGeometrySha256!==c.envelope.geometrySha256||
     row.originalRoofRawSha256!==c.originalRoofRawSha256||
     row.worldWrites!==0||row.modelCalls!==1||
     typeof row.rawSha256!=='string')
   stop('CASE_FROZEN_IDENTITY_'+c.id);
  const folder=plainFolder(path.join(oldFolder,'cases',c.id));
  const receipt=JSON.parse(read(folder,'CASE_REPORT.json',60000));
  for(const key of ['id','status','rawSha256','newGeometrySha256',
    'newSourceSha256','sourceServiceAccess','newGlazingCells','physicalFeatureCells']){
   if((receipt[key]??null)!==(row[key]??null))
    stop('CASE_RECEIPT_DRIFT_'+c.id+'_'+key);
  }
  const originalRaw=read(folder,'MODEL_FUNCTION_RESPONSE_ORIGINAL.txt',35000);
  if(digest(originalRaw)!==row.rawSha256)stop('MODEL_RAW_SHA_'+c.id);
  let compiled=null;
  if(c.id==='home'){
   if(i!==0||row.status!=='HOLD_MODEL_FUNCTION_IR'||
     row.reason!=='R125_FUNCTIONAL_TOP_LEVEL'||
     row.failureCategory!=='MODEL_FUNCTION_IR'||
     row.newGeometrySha256!==null)
    stop('HOME_NOT_THE_SOLE_ORIGINAL_HOLD');
  }else{
   if(row.status!=='NEW_FUNCTIONAL_SOURCE_ART_HOLD'||
      row.reason!==null||row.failureCategory!==null||
      typeof row.newGeometrySha256!=='string'||row.newSourceSha256===undefined)
    stop('FOUR_ORIGINAL_PASS_STATUS_'+c.id);
   let intent;
   try{intent=JSON.parse(originalRaw)}catch{stop('GOOD_RAW_NOT_JSON_'+c.id)}
   compiled=compileFunctionalFacadeV3({
    originalPlan:c.product.plan,envelopeIntent:c.envelopeIntent,
    functionalIntent:intent});
   if(compiled.finalGeometrySha256!==row.newGeometrySha256||
      compiled.finalSourceSha256!==row.newSourceSha256||
      compiled.originalEnvelopeGeometrySha256!==c.envelope.geometrySha256||
      compiled.sourceRoutes.featureAccess.filter(x=>x.reachableFromEntrance).length!==
       row.sourceServiceAccess||
      compiled.physicalProgram.independentlyAddedGlassCells!==row.newGlazingCells||
      compiled.physicalProgram.physicallyVerifiedFixtureCells!==row.physicalFeatureCells)
    stop('FOUR_VERIFIED_SOURCE_DRIFT_'+c.id);
  }
  verified.push({id:c.id,genre:c.genre,folder,rawSha256:row.rawSha256,
   old:row,spatial:c.product,envelope:c.envelope,
   envelopeIntent:c.envelopeIntent,originalRaw,compiled});
 }
 if(verified.length!==5||verified.filter(x=>x.compiled).length!==4)
  stop('UNEXPECTED_VERIFIED_COUNT');
 return {source,envelopes,oldFolder,oldReportSha256:digest(oldReportRaw),
  cases:verified};
}
function renderReview(cases,report){
 const bounds={width:0,height:0,depth:0};
 for(const c of cases)for(const shape of [c.envelope,c.compiled].filter(Boolean))
  for(const key of Object.keys(bounds))
   bounds[key]=Math.max(bounds[key],shape.design.bounds[key]);
 const cards=cases.map(c=>{
  const current=c.compiled||c.envelope,kind=c.id==='home'?
   (c.compiled?'REPAIRED_SINGLE_NEW_MODEL_ANSWER':'ORIGINAL_HOLD_NOT_REPAIRED'):
   'REUSED_SHA_VERIFIED_ORIGINAL';
  const imgs=['front','side','top'].map(view=>
   '<figure><figcaption>'+view+'</figcaption>'+
    projectExactSourceVoxels(current.compiled,view,bounds)+'</figure>').join('');
  return '<article><h2>'+esc(c.genre)+' — '+esc(kind)+'</h2>'+
   '<div class="views">'+imgs+'</div>'+
   '<p>形状SHA: '+esc(c.compiled?
    c.id==='home'?report.homeRecoveredGeometrySha256:c.old.newGeometrySha256:
    c.envelope.geometrySha256)+'</p>'+
   '<p>元原文SHAを照合済み／元4成功は再推論せず保存。'+
   (c.id==='home'&&!c.compiled?'元の住宅失敗を消していません。':'')+'</p>'+
   (c.compiled?'<p><a href="cases/'+esc(c.id)+'/index.html">真正3Dを開く</a></p>':'')+
   '</article>';
 }).join('');
 return '<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>MAB failed-only five-source recovery</title>'+
  '<style>body{background:#0c1b28;color:#edf4f8;font:15px system-ui;max-width:1580px;margin:auto;padding:24px;line-height:1.55}'+
  'article{border:1px solid #456;padding:15px;border-radius:12px;margin:15px 0;background:#132837}'+
  '.views{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}'+
  'svg{width:100%;image-rendering:pixelated}figure{min-width:0;margin:0}'+
  'figcaption{color:#88dbe3}a{color:#84e4ee}p{color:#d2e0e6}</style>'+
  '<h1>V3 4件再利用＋住宅だけの独立再検証</h1>'+
  '<p>技術状態: '+esc(report.status)+'。今回のQwen POST: '+report.modelCalls+
  '。元4件の新規推論: 0。Minecraft world writes: 0。</p>'+
  '<p>全5件についてART・実機は未認証。旧HOMEのTOP_LEVEL HOLDと生回答は保存。</p>'+
  (report.artOverview?.imageFile?'<p><a href="SOURCE_ART_OVERVIEW.png">自動生成の5ジャンル比較画像（PNG・スクショ不要）を開く</a></p>':'')+
  cards+'</html>';
}
export async function runFailedOnlyV3(
 {studyDir,diagnosticFile,envelopeDir,functionsDir,outDir,
  model=MODEL,endpoint=ENDPOINT,timeoutMs=180000}={},
 {fetcher=fetch}={}){
 if(typeof outDir!=='string'||!path.isAbsolute(outDir)||
    fs.existsSync(outDir)||model!==MODEL||endpoint!==ENDPOINT||
    typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||
    timeoutMs<1000||timeoutMs>300000)stop('ARGS');
 // All five original records are verified before creating even a new output.
 const evidence=inspectFailedOnlyV3Evidence({
  studyDir,diagnosticFile,envelopeDir,functionsDir});
 const out=path.resolve(outDir);
 if(fs.realpathSync(path.dirname(out))!==path.dirname(evidence.source.study))
  stop('NON_PRIVATE_DESTINATION');
 const injected=fetcher!==fetch;
 const home=evidence.cases[0],cases=evidence.cases.map(c=>({...c}));
 const diagnostic=auditOriginalHomeTopLevel(home.originalRaw,
  home.spatial.plan.id,home.spatial.plan.rooms.length);
 const report={schema:'r125-v3-failed-only-single-home-v1',
  status:'HOLD_NOT_STARTED',
  sourceStudySha256:evidence.source.originalReportSha256,
  diagnosticSha256:evidence.source.diagnosticSha256,
  originalFailedBatchSha256:evidence.oldReportSha256,
  originalModelCalls:evidence.cases.length,modelCalls:0,
  testInjectionPresent:injected,model,provider:'LOCAL_LOOPBACK_DECLARED_NOT_INDEPENDENTLY_ATTESTED',
  protectedSourceSuccesses:['retail','laboratory','gallery','station'],
  originalHomeStatus:home.old.status,originalHomeReason:home.old.reason,
  originalHomeRawSha256:home.rawSha256,
  originalHomeOriginalRawNeverEdited:true,
  reusedVerifiedSources:4,homeRecoveredGeometrySha256:null,
  oldHomeStatusPreserved:true,worldContacts:0,worldWrites:0,
  art:'NOT_REVIEWED',minecraft:'NOT_TESTED',readiness:'NOT_PREPARED',
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  cases:evidence.cases.map(c=>({id:c.id,genre:c.genre,
   status:c.compiled?'REUSED_SHA_VERIFIED_ART_HOLD':'ORIGINAL_HOME_TOP_LEVEL_HOLD',
   originalRawSha256:c.rawSha256,
   geometrySha256:c.compiled?.finalGeometrySha256??null,
   sourceSha256:c.compiled?.finalSourceSha256??null,
   newModelCalls:0,art:'NOT_REVIEWED',worldWrites:0}))};
 fs.mkdirSync(out);
 const homeDir=path.join(out,'cases','home');
 fs.mkdirSync(path.join(out,'cases'));
 fs.mkdirSync(homeDir);
 try{
  write(homeDir,'ORIGINAL_HOME_IR_DIAGNOSTIC.json',diagnostic);
  const facade=surveyFunctionalFacadeOpenings({
   originalPlan:home.spatial.plan,envelopeIntent:home.envelopeIntent});
  const fixtures=surveyFunctionalFixturePlacements({
   originalPlan:home.spatial.plan,envelopeIntent:home.envelopeIntent});
  write(homeDir,'SOURCE_AUTHOR_OPTIONS.json',{
   facadeChoiceSurvey:facade,fixtureChoiceSurvey:fixtures,
   localSourceOnly:true,worldWrites:0});
  if(fixtures.some(r=>r.availableFunctionalFixturePlacements.length===0))
   stop('NO_VALID_HOME_FIXTURE_SITE');
  if(facade.every(r=>r.availableLargeExteriorOpenings.length===0))
   stop('NO_VALID_HOME_EXTERIOR_GLAZING_SITE');
  const ready=await preflightR125Ollama({model,endpoint,fetcher});
  if(ready.status!=='LOCAL_MODEL_LISTED')stop('EXACT_LOCAL_MODEL_NOT_READY');
  const top={
   schema:FUNCTION_SCHEMA,planId:home.spatial.plan.id,
   rooms:'ARRAY_CONTAINING_EXACTLY_'+home.spatial.plan.rooms.length+'_ROOMS'
  };
  const system=[
   'You are a building FUNCTION and FACADE DESIGN AUTHOR, not a JSON inspector.',
   'Output ONE AND ONLY ONE JSON OBJECT. No markdown, no explanation.',
   'The top-level object MUST have exactly THREE keys: schema,planId,rooms.',
   'These keys are at the ROOT: not inside plan,design,answer,result or metadata.',
   'schema is exactly '+FUNCTION_SCHEMA+'.',
   'planId is exactly '+home.spatial.plan.id+'.',
   'rooms must be an array, one object per room, in the same order as the plan.',
   'Every room entry has EXACTLY roomId,fixture,opening. Do not add other keys.',
   'fixture EXACT keys: kind,side,offset,material,purpose.',
   'Select kind/side/offset from one availableFunctionalFixturePlacements entry for that SAME room.',
   'Available kinds: counter,worktable,bench,display,storage.',
   'fixture.material wood|stone|metal|accent; purpose an actual useful functional action, not a room name.',
   'opening is null if no exterior window is needed, otherwise EXACT keys side,offset,width,height.',
   'Non-null opening MUST equal one listed availableLargeExteriorOpenings candidate for THAT room.',
   'At least one exterior window for the building must be non-null.',
   'Do not modify the original room ids, roof, floor plan or full-building structure.',
   'Do not copy a fixed residential template. You choose appropriate real uses, daylight and functional equipment.',
   'The HOST validates TRUE B143 voxel supports, daylight and 2-wide access, never silently repairs output.'
  ].join('\n');
  const user=JSON.stringify({architecturalGenre:'平屋住宅',
   requiredRootShape:top,
   exactRoomIds:home.spatial.plan.rooms.map(r=>r.id),
   originalModelWrittenPlan:home.spatial.plan,
   originalModelWrittenRoof:home.envelopeIntent,
   facadeChoiceSurvey:facade,fixtureChoiceSurvey:fixtures});
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let response;
  try{
   report.modelCalls=1;
   report.cases[0].newModelCalls=1;
   response=await fetcher(endpoint,{method:'POST',redirect:'error',
    signal:controller.signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.2,
     max_tokens:1900,response_format:{type:'json_object'},
     messages:[{role:'system',content:system},{role:'user',content:user}]})});
   if(!response?.ok)stop('MODEL_HTTP_'+response?.status);
   const wireText=await response.text();
   if(wireText.length>100000)stop('MODEL_RESPONSE_TOO_LARGE');
   let wire;try{wire=JSON.parse(wireText)}catch{stop('MODEL_PROTOCOL_JSON')}
   if(wire?.choices?.length!==1)stop('MODEL_CHOICES');
   const answer=wire.choices[0],raw=answer?.message?.content;
   if(typeof raw==='string'&&raw.length>0&&raw.length<=30000){
    write(homeDir,'NEW_HOME_MODEL_RESPONSE_ORIGINAL.txt',raw);
    report.newHomeRawSha256=digest(raw);
   }
   if(answer?.finish_reason==='length')stop('MODEL_TRUNCATED');
   if(answer?.finish_reason!=='stop')stop('MODEL_FINISH');
   if(typeof raw!=='string'||raw.length<30||raw.length>30000)
    stop('MODEL_RAW_NOT_CAPTURED');
   let intent;try{intent=JSON.parse(raw)}catch{stop('MODEL_JSON_INVALID')}
   const newer=compileFunctionalFacadeV3({
    originalPlan:home.spatial.plan,envelopeIntent:home.envelopeIntent,
    functionalIntent:intent});
   if(newer.baseSpatialGeometrySha256!==home.spatial.geometrySha256||
      newer.originalEnvelopeGeometrySha256!==home.envelope.geometrySha256||
      newer.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
      newer.sourceRoutes.featureAccess.length!==home.spatial.plan.rooms.length||
      newer.sourceRoutes.featureAccess.some(r=>!r.reachableFromEntrance||
       !r.supportedTwoWideServiceWitness))stop('FINAL_HOME_SOURCE_DRIFT');
   const template=fs.readFileSync(
    path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
   write(homeDir,'NEW_HOME_FUNCTION_INTENT.json',intent);
   write(homeDir,'NEW_HOME_SOURCE_DESIGN.json',newer.design);
   write(homeDir,'NEW_HOME_ROUTES.json',newer.sourceRoutes);
   write(homeDir,'NEW_HOME_PHYSICAL_FEATURES.json',newer.physicalProgram);
   write(homeDir,'index.html',renderB143Html(
    compileB143Gallery([newer.design]),template));
   cases[0].compiled=newer;
   report.homeRecoveredGeometrySha256=newer.finalGeometrySha256;
   report.cases[0].geometrySha256=newer.finalGeometrySha256;
   report.cases[0].sourceSha256=newer.finalSourceSha256;
   report.cases[0].status=injected?
    'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':'NEW_FUNCTIONAL_SOURCE_ART_HOLD';
   report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
    'FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD';
  }finally{clearTimeout(timer)}
 }catch(e){
  report.error=String(e?.message??e).slice(0,240);
  report.failureCategory=classifyFunctionFailure(report.error);
  report.status='HOLD_FAILED_ONLY_HOME';
  report.cases[0].status='HOLD_FAILED_ONLY_HOME';
 }finally{
  // Regenerate four visually equivalent views from VERIFIED original 3D data,
  // not from altered originals, and no extra model calls.
  try{
   const template=fs.readFileSync(
    path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
   for(const c of cases.slice(1)){
    const sub=path.join(out,'cases',c.id);
    fs.mkdirSync(sub);
    write(sub,'index.html',renderB143Html(
     compileB143Gallery([c.compiled.design]),template));
   }
  }catch(e){
   report.status='HOLD_REVIEW_EXPORT';
   report.exportError=String(e.message).slice(0,160);
  }
  report.sourceReadyCount=cases.filter(c=>c.compiled).length;
  try{
   const art=renderFiveGenreSourceEvidence(cases.map(c=>({
    id:c.id,base:c.envelope,final:c.compiled,
    status:c.id==='home'?report.cases[0].status:'REUSED_SHA_VERIFIED_ART_HOLD',
    finalGeometrySha256:c.compiled?.finalGeometrySha256??null
   })),report);
   fs.writeFileSync(path.join(out,'SOURCE_ART_OVERVIEW.png'),art.png,{flag:'wx'});
   report.artOverview={imageFile:'SOURCE_ART_OVERVIEW.png',
    imageSha256:art.sha256,width:art.width,height:art.height,
    source:'ACTUAL_B143_ONLY',modelCallsAdditional:0,worldWrites:0};
  }catch(e){report.artOverviewError=String(e.message??e).slice(0,180)}
  write(out,'FAILED_ONLY_RECOVERY_REPORT.json',report);
  write(out,'index.html',renderReview(cases,report));
 }
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==10||a[0]!=='--study'||a[2]!=='--diagnostic'||
     a[4]!=='--envelopes'||a[6]!=='--original-functions'||a[8]!=='--out')
   stop('CLI_ARGUMENTS');
  const report=await runFailedOnlyV3({studyDir:path.resolve(a[1]),
   diagnosticFile:path.resolve(a[3]),envelopeDir:path.resolve(a[5]),
   functionsDir:path.resolve(a[7]),outDir:path.resolve(a[9])});
  console.log(JSON.stringify({status:report.status,
   originalFourReused:report.reusedVerifiedSources,
   sourceReady:report.sourceReadyCount,modelCalls:report.modelCalls,
   reportFile:path.join(path.resolve(a[9]),'FAILED_ONLY_RECOVERY_REPORT.json'),
   worldWrites:report.worldWrites},null,2));
  if(report.status!=='FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD')
   process.exitCode=2;
 }catch(e){console.error('R125_FAILED_ONLY_HOLD',String(e.message??e));
  process.exitCode=2}
}
