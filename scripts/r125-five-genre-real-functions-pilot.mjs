/**
 * Opt-in real local Qwen follow-on to FIVE original cross-genre sources + FIVE
 * independently model-authored expressive roofs. One further Qwen request per
 * genre for actual physical room features and model-selected exterior openings.
 * Fail closed, one POST at a time, never modify the model originals or world.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectPreservedFiveGenreSources,projectExactSourceVoxels}
 from './r125-five-genre-source-comparison.mjs';
import {compileExpressiveEnvelopeV2}
 from '../source/ai/r125-expressive-envelope-v2.mjs';
import {FUNCTION_SCHEMA,compileFunctionalFacadeV3,surveyFunctionalFacadeOpenings}
 from '../source/ai/r125-functional-facade-v3.mjs';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('R125_FUNCTION_BATCH_'+s)};
const write=(d,n,x)=>fs.writeFileSync(path.join(d,n),
 typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const safeText=(d,n,max=400000)=>{
 const stat=fs.lstatSync(path.join(d,n));
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size>max||stat.size<1)
  fail('UNSAFE_EVIDENCE_FILE_'+n);
 return fs.readFileSync(path.join(d,n),'utf8');
};
const SYSTEM=[
 'You are the architect authoring real physical FUNCTION and FACADE, not just labels.',
 'Return exactly one compact JSON object. NO markdown, filler, world coordinates or commands.',
 'Top-level EXACT keys schema,planId,rooms; schema='+FUNCTION_SCHEMA+'.',
 'planId must be given original plan id. rooms must have one entry per provided room.',
 'Each room entry EXACT keys roomId,fixture,opening; opening may be null for a room without needed exterior daylight.',
 'roomId must be the exact existing id.',
 'fixture EXACT keys kind,side,offset,material,purpose.',
 'fixture.kind counter|worktable|bench|display|storage; side north|south|east|west;',
 'fixture.offset integer 0..4; material wood|stone|metal|accent;',
 'purpose 3..100 characters explaining a REAL functional use (not a room label).',
 'opening EXACT keys side,offset,width,height.',
 'opening.side north|south|east|west; offset integer 0..4;',
 'opening.width integer 3 or 4, opening.height integer 2 or 3.',
 'Wall position is relative to the EXISTING room, never absolute.',
 'The HOST generates actual blocks, validates a truly exterior opening and clear',
 '2-wide service access to EACH fixture from the public exterior entrance.',
 'Choose open EXTERIOR walls, never a shared wall or an exterior doorway.',
 'The user prompt includes genre-neutral availableLargeExteriorOpenings for each room.',
 'For a room with an exterior window, opening.side/offset/width/height MUST EXACTLY match ONE availableLargeExteriorOpenings choice.',
 'If the room has zero choices, opening MUST be null. Interior storage or display rooms may choose null when daylight is inappropriate.',
 'Choose at least one valid new exterior opening for the building when available; never fabricate one in an internal wall.',
 'The options are actual geometry-derived 3x2 and 4x2 openings, not HOST-chosen designs. Do not enlarge height or width.',
 'Do not copy the same kinds/arrangement for all genres. Express what each room actually does.',
 'Host may reject a design but MUST NOT invent or silently move your authored geometry.',
 'This is not completion of full furniture, accessibility, art or Minecraft gameplay.'
].join('\n');

export function classifyFunctionFailure(s){
 s=String(s??'');
 if(/MODEL_TRUNCATED|MODEL_FINISH|MODEL_CHOICES/.test(s))return 'MODEL_COMPLETENESS';
 if(/MODEL_JSON|MODEL_RAW/.test(s))return 'MODEL_FORMAT';
 if(/MODEL_HTTP|abort|TIMEOUT/i.test(s))return 'LOCAL_MODEL_TRANSPORT';
 if(/R125_FUNCTIONAL_(TOP_LEVEL|ROOM_CONTRACT|ROOM_INTENT)/.test(s))
  return 'MODEL_FUNCTION_IR';
 if(/R125_FUNCTIONAL_NO_NEW_REAL_FACADE_GLAZING_BUILDING/.test(s))
  return 'MODEL_FUNCTION_PROGRAM_NO_NEW_DAYLIGHT';
 if(/R125_FUNCTION_BATCH_NO_EXTERIOR_OPENING_OPTION_IN_BUILDING/.test(s))
  return 'SHARED_SPATIAL_NO_EXTERIOR_GLAZING_SITE';
 if(/R125_FUNCTIONAL_(OPENING_TO_OTHER_ROOM|OPENING_PARTLY_SHARED|WINDOW_BLOCKS_DOOR|REAL_SOURCE_FUNCTION_ACCESS_HOLD)/.test(s))
  return 'SHARED_PHYSICAL_RELATIONSHIP';
 if(/R125_FUNCTIONAL_|B143_|R125_ROUTE_/.test(s))
  return 'SHARED_COMPILER_OR_GEOMETRY';
 return 'UNCLASSIFIED_HOLD';
}
export function summarizeFunctionBatch(rows){
 const cats=new Map();
 for(const row of rows)if(row.failureCategory){
  const c=cats.get(row.failureCategory)??new Set();
  c.add(row.genre);cats.set(row.failureCategory,c);
 }
 return {requestedGenres:5,completedCases:rows.length,
  sourcePass:rows.filter(r=>r.status==='NEW_FUNCTIONAL_SOURCE_ART_HOLD').length,
  technicallyCompiled:rows.filter(r=>r.newGeometrySha256).length,
  sharedSymptoms:[...cats].filter(([,v])=>v.size>1).map(([category,v])=>({
   category,genres:[...v],sharedRootCause:'NOT_YET_PROVEN'})),
  humanArt:'NOT_REVIEWED',minecraft:'NOT_TESTED',worldWrites:0};
}
function verifySavedEnvelope(evidence,envelopeDir){
 if(typeof envelopeDir!=='string'||!path.isAbsolute(envelopeDir)||
    fs.lstatSync(envelopeDir).isSymbolicLink())fail('ENVELOPE_DIR');
 const folder=fs.realpathSync(envelopeDir);
 const r=JSON.parse(safeText(folder,'EXPRESSIVE_ENVELOPE_REPORT.json'));
 if(r.schema!=='r125-real-five-genre-envelope-pilot-v1'||
  r.source!=='FROZEN_VERIFIED_FIVE_GENRES'||
  r.testInjectionPresent!==false||r.model!=='qwen3:14b'||
  r.modelCalls!==5||r.cases?.length!==5||
  r.originalStudySha256!==evidence.originalReportSha256||
  r.previousDiagnosticSha256!==evidence.diagnosticSha256)
  fail('SAVED_ENVELOPE_PROVENANCE');
 const pairs=[];
 for(const [i,c] of evidence.results.entries()){
  const row=r.cases[i];
  if(row.id!==c.id||row.genre!==c.genre||
   row.originalGeometrySha256!==c.product.geometrySha256||
   row.frozenOriginalRawSha256!==c.rawSha256||
   row.status!=='NEW_SOURCE_ENVELOPE_ART_HOLD')
   fail('SAVED_ENVELOPE_RECEIPT_'+c.id);
  const sub=path.join(folder,'cases',c.id);
  if(fs.lstatSync(sub).isSymbolicLink())fail('SAVED_ENVELOPE_CASE_SYMLINK');
  const receipt=JSON.parse(safeText(sub,'CASE_REPORT.json'));
  if(receipt.modelRawSha256!==row.modelRawSha256||
   receipt.newGeometrySha256!==row.newGeometrySha256||
   receipt.newSourceSha256!==row.newSourceSha256)
   fail('ENVELOPE_CASE_DRIFT_'+c.id);
  const original=safeText(sub,'MODEL_ENVELOPE_RESPONSE_ORIGINAL.txt',30000);
  if(sha(original)!==row.modelRawSha256)fail('ENVELOPE_RAW_DRIFT_'+c.id);
  let intent;try{intent=JSON.parse(original)}catch{fail('ENVELOPE_RAW_JSON_'+c.id)}
  const compiled=compileExpressiveEnvelopeV2({
   originalPlan:c.product.plan,intent});
  if(compiled.geometrySha256!==row.newGeometrySha256||
     compiled.sourceSha256!==row.newSourceSha256||
     compiled.originalGeometrySha256!==c.product.geometrySha256)
    fail('ENVELOPE_GEOMETRY_DRIFT_'+c.id);
  pairs.push({...c,envelopeIntent:intent,envelope:compiled,
   originalRoofRawSha256:row.modelRawSha256});
 }
 return {cases:pairs,sourceReport:r,folder};
}
export async function runFiveGenreFunctions(
 {studyDir,diagnosticFile,envelopeDir,outDir,model='qwen3:14b',
  endpoint=ENDPOINT,timeoutMs=180000}={},{fetcher=fetch}={}){
 if(![studyDir,diagnosticFile,envelopeDir,outDir].every(s=>typeof s==='string'&&path.isAbsolute(s))||
   model!=='qwen3:14b'||endpoint!==ENDPOINT||
   !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000||
   typeof fetcher!=='function'||fs.existsSync(outDir))fail('OPTIONS');
 const evidence=inspectPreservedFiveGenreSources({studyDir,diagnosticReportFile:diagnosticFile});
 const preserved=verifySavedEnvelope(evidence,envelopeDir);
 const dest=path.resolve(outDir);
 if(fs.realpathSync(path.dirname(dest))!==fs.realpathSync(path.dirname(evidence.study))||
    dest===evidence.study||dest.startsWith(evidence.study+path.sep))
  fail('DESTINATION');
 const injected=fetcher!==fetch;
 fs.mkdirSync(dest);
 const report={schema:'r125-five-genre-functional-author-study-v1',
  originalStudySha256:evidence.originalReportSha256,
  previousDiagnosticSha256:evidence.diagnosticSha256,
  frozenEnvelopeReportSha256:sha(safeText(preserved.folder,'EXPRESSIVE_ENVELOPE_REPORT.json')),
  originalProgramsPreserved:5,originalEnvelopesPreserved:5,
  provider:'LOCAL_LOOPBACK_DECLARED_NOT_INDEPENDENTLY_ATTESTED',
  model,modelCalls:0,testInjectionPresent:injected,cases:[],
  status:'HOLD_NOT_STARTED',worldWrites:0,worldContacts:0,
  humanArt:'NOT_REVIEWED',minecraft:'NOT_TESTED',
  readiness:'NOT_PREPARED',BuildPlan:{operations:[]},
  gates:Array(9).fill('BLOCKED')};
 const reviews=[];
 try{
  const available=await preflightR125Ollama({model,endpoint,fetcher});
  if(available.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_LOCAL_MODEL_NOT_READY';return report;
  }
  const template=fs.readFileSync(
   path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  for(const c of preserved.cases){
   const folder=path.join(dest,'cases',c.id);
   fs.mkdirSync(folder,{recursive:true});
   const row={id:c.id,genre:c.genre,status:'HOLD_NOT_STARTED',
    preservedSpatialGeometrySha256:c.product.geometrySha256,
    preservedRoofGeometrySha256:c.envelope.geometrySha256,
    originalRoofRawSha256:c.originalRoofRawSha256,
    rawSha256:null,newGeometrySha256:null,sourceServiceAccess:null,
    newGlazingCells:null,physicalFeatureCells:null,modelCalls:0,
    failureCategory:null,reason:null,art:'NOT_REVIEWED',worldWrites:0};
   let product=null;
   try{
    const facadeChoiceSurvey=surveyFunctionalFacadeOpenings({
     originalPlan:c.product.plan,envelopeIntent:c.envelopeIntent});
    if(facadeChoiceSurvey.every(x=>x.availableLargeExteriorOpenings.length===0))
     fail('NO_EXTERIOR_OPENING_OPTION_IN_BUILDING');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    let wire;
    try{
     report.modelCalls++;row.modelCalls++;
     const response=await fetcher(endpoint,{method:'POST',redirect:'error',
      signal:controller.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model,stream:false,temperature:0.55,
       reasoning_effort:'none',max_tokens:1600,response_format:{type:'json_object'},
       messages:[{role:'system',content:SYSTEM},
        {role:'user',content:'ジャンル: '+c.genre+
         '。以下の既存Qwen空間設計と屋根著作の原形は絶対変更しない。'+
         '各室が実際の機能を持つよう設備の種類・位置・外壁の大きな採光開口を'+
         '部屋ごとに独立決定し、指定スキーマの短いJSONで返す。\n'+
         JSON.stringify({plan:c.product.plan,
          envelopeIntent:c.envelopeIntent,layout:c.product.layout,
          facadeChoiceSurvey})}]})
     });
     if(!response?.ok)fail('MODEL_HTTP_'+response?.status);
     const text=await response.text();
     if(text.length>100000)fail('MODEL_HTTP_SIZE');
     try{wire=JSON.parse(text)}catch{fail('MODEL_HTTP_BAD_JSON')}
    }finally{clearTimeout(timer)}
    if(wire?.choices?.length!==1)fail('MODEL_CHOICES');
    const choice=wire.choices[0],raw=choice?.message?.content;
    if(typeof raw==='string'&&raw.length>0&&raw.length<30000){
     write(folder,'MODEL_FUNCTION_RESPONSE_ORIGINAL.txt',raw);
     row.rawSha256=sha(raw);
    }
    if(choice?.finish_reason==='length')fail('MODEL_TRUNCATED');
    if(choice?.finish_reason!=='stop')fail('MODEL_FINISH');
    if(typeof raw!=='string'||raw.length<30||raw.length>=30000)
     fail('MODEL_RAW');
    let intent;try{intent=JSON.parse(raw)}catch{fail('MODEL_JSON')}
    product=compileFunctionalFacadeV3({
     originalPlan:c.product.plan,
     envelopeIntent:c.envelopeIntent,functionalIntent:intent});
    if(product.originalEnvelopeGeometrySha256!==c.envelope.geometrySha256)
     fail('ROOF_BASE_DRIFT');
    write(folder,'FUNCTION_INTENT.json',intent);
    write(folder,'FUNCTIONAL_B143_SOURCE.json',product.design);
    write(folder,'FUNCTION_SOURCE_ACCESS.json',product.sourceRoutes);
    write(folder,'PHYSICAL_FEATURE_REPORT.json',product.physicalProgram);
    write(folder,'index.html',renderB143Html(
     compileB143Gallery([product.design]),template));
    row.newGeometrySha256=product.finalGeometrySha256;
    row.newSourceSha256=product.finalSourceSha256;
    row.sourceServiceAccess=product.sourceRoutes.featureAccess.filter(
     x=>x.reachableFromEntrance).length;
    row.newGlazingCells=product.physicalProgram.independentlyAddedGlassCells;
    row.physicalFeatureCells=product.physicalProgram.physicallyVerifiedFixtureCells;
    row.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
     'NEW_FUNCTIONAL_SOURCE_ART_HOLD';
   }catch(e){
    row.reason=String(e?.message??e).slice(0,240);
    row.failureCategory=classifyFunctionFailure(row.reason);
    row.status='HOLD_'+row.failureCategory;
   }finally{
    write(folder,'CASE_REPORT.json',row);report.cases.push(row);
    reviews.push({id:c.id,genre:c.genre,base:c.envelope,product,report:row});
   }
  }
  report.summary=summarizeFunctionBatch(report.cases);
  report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
   report.summary.sourcePass===5?
    'FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD':'HOLD_PARTIAL_FUNCTIONS';
  return report;
 }catch(e){
  report.status='HOLD_BATCH_RUNTIME';report.batchReason=String(e?.message??e).slice(0,240);
  return report;
 }finally{
  report.summary??=summarizeFunctionBatch(report.cases);
  write(dest,'FUNCTIONAL_FACADE_REPORT.json',report);
  if(reviews.length){
   const ext={width:0,height:0,depth:0};
   for(const p of reviews)for(const d of [p.base,p.product].filter(Boolean))
    for(const k of Object.keys(ext))
     ext[k]=Math.max(ext[k],d.design.bounds[k]);
   const cards=reviews.map(p=>{
    const figs=(d,title)=>'<section><h3>'+esc(title)+'</h3><div class="views">'+
     ['front','side','top'].map(v=>'<figure>'+esc(v)+projectExactSourceVoxels(
      d.compiled,v,ext)+'</figure>').join('')+'</div></section>';
    return '<article><h2>'+esc(p.genre)+' — '+esc(p.report.status)+'</h2>'+
     '<div class="pair">'+figs(p.base,'元のQwen屋根・外形')+
     (p.product?figs(p.product,'Qwenによる主要採光・実設備の追加'):'')+'</div>'+
     (p.product?'<p>新しい実ガラスセル '+p.report.newGlazingCells+
      '／設備のSOURCEサービス到達 '+p.report.sourceServiceAccess+
      '／<a href="cases/'+p.id+'/index.html">真正3Dを開く</a></p>':'')+
     '</article>';
   }).join('');
   write(dest,'index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>MAB 五ジャンル機能とファサード比較</title>'+
    '<style>body{background:#0e1b29;color:#f2f5f8;font:15px system-ui;margin:25px auto;max-width:1500px}'+
    'article{background:#132737;padding:18px;margin:15px 0;border:1px solid #456;border-radius:12px}'+
    '.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}'+
    '.views{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}'+
    'figure{min-width:0;margin:0}svg{width:100%;image-rendering:pixelated}'+
    'a{color:#78deeb}@media(max-width:750px){.pair{grid-template-columns:1fr}}</style>'+
    '<h1>5ジャンル — Qwenの屋根設計から実際の用途・採光へ</h1>'+
    '<p>保存済み建物と屋根を凍結。機能と開口のSOURCE試験のみ。建築ART・設備実用性・Minecraft実機は未認証。</p>'+
    '<p>結果: '+esc(report.status)+'。Model calls: '+report.modelCalls+
    '。World writes: 0。</p>'+cards+'</html>');
  }
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==8||args[0]!=='--study'||args[2]!=='--diagnostic'||
   args[4]!=='--envelopes'||args[6]!=='--out')fail('CLI_ARGS');
  const p=await runFiveGenreFunctions({
   studyDir:path.resolve(args[1]),diagnosticFile:path.resolve(args[3]),
   envelopeDir:path.resolve(args[5]),outDir:path.resolve(args[7])});
  console.log(JSON.stringify({status:p.status,modelCalls:p.modelCalls,
   sourcePass:p.summary?.sourcePass,sourceCompiled:p.summary?.technicallyCompiled,
   sharedSymptoms:p.summary?.sharedSymptoms,worldWrites:0},null,2));
  if(p.status!=='FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD')process.exitCode=2;
 }catch(e){console.error('R125_FUNCTION_BATCH_HOLD',String(e?.message??e));process.exitCode=2}
}
