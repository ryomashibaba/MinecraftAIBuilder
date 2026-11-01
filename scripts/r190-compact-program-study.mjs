/**
 * R190 compact-program real local Qwen three-use study, independent of
 * rejected E1 numeric massing originals. One request per new use, no retries.
 * Architecture program is MODEL-authored; voxel geometry is HOST-resolved.
 * Never produces Minecraft commands or touches a world.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {requestLocalModel} from './r190-e1-two-stage.mjs';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';
import {R190_E1_STUDY_BRIEFS} from './r125-r190-free-engine.mjs';
import {R190_COMPACT_SCHEMA,compileR190CompactProgram}
 from '../source/ai/r190-compact-program.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {deriveR190CompactMinimumWindows,deriveR190CompactExpandedGlazingVariant,
 auditR190CompactInteriorEvidence,
 renderR190CompactAccessMapSvg}
 from '../source/ai/r190-compact-daylight.mjs';
import {exportB143EducationMakeCode} from '../source/ai/r125-education-makecode-export.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=x=>createHash('sha256').update(x).digest('hex');
const save=(p,x)=>fs.writeFileSync(p,typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const R190_COMPACT_SYSTEM=[
 'You are an independent architect. Author a short functional and architectural program, NOT numeric geometry or Minecraft commands.',
 'Return exactly ONE JSON object with schema='+R190_COMPACT_SCHEMA+' and EXACT top-level keys schema,id,title,brief,entranceFace,spaces,materials.',
 'id and space ids must match ASCII lowercase kebab-case ^[a-z][a-z0-9-]{2,39}$. Titles, purpose and brief are free descriptive text.',
 'entranceFace: north/south/east/west. materials has exactly floor,wall,roof each chosen from wood,stone,concrete,metal.',
 'spaces MUST contain 2..4 independently meaningful connected areas, each with EXACT keys:',
 'id,purpose,size,proportion,height,parentId,preferredSide,privacy,form.',
 'First space is an enclosed entrance with parentId=null and preferredSide=null, its id is the entrance space.',
 'For each other space, parentId references an EARLIER space and preferredSide is north/south/east/west. This side is a PREFERENCE: the host may select a different feasible side but records any change.',
 'size=compact/balanced/generous; proportion=square/wide/long; height=low/medium/high. No numeric width, depth or height; the host makes minimum-safe concrete dimensions with published rules.',
 'privacy=public/shared/private. form=plain/facet/ridge/shed/sky-court/open-court. Select form to serve actual function and daylight, never as random decoration.',
 'There may be at most 2 facet, 2 ridge-or-shed, 1 sky-court, and 1 open-court rooms. The entrance cannot be open-court.',
 'One room may have ONE form only; this prevents roof/facet/courtyard conflicts. No glazedOpenings, roofFormIntents, formIntents, site coordinates, commands, code or BuildPlan in the response.',
 'Give a functional, memorable, coherent building with entrance and meaningful relation between spaces, rather than a fixed house/shop/lab template.',
 'The output is a design PROGRAM, not finished architecture. Return JSON only.'
].join('\n');
export async function runR190CompactThreeUse({
 model='qwen3:14b',outRoot=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs')
}={}, {request=requestLocalModel}={}){
 if(typeof model!=='string'||!/^[A-Za-z0-9._:/-]{2,140}$/.test(model)||
  typeof request!=='function')throw Error('R190_COMPACT_STUDY_ARGS');
 const testDouble=request!==requestLocalModel;
 fs.mkdirSync(outRoot,{recursive:true});
 const dir=fs.mkdtempSync(path.join(path.resolve(outRoot),'E1-compact-'));
 const rows=[];
 let unavailable=false;
 const progress=()=>fs.writeFileSync(path.join(dir,'PROGRESS.json'),
  JSON.stringify({rows,worldWrites:0,synthetic:testDouble},null,2)+'\n');
 for(const item of R190_E1_STUDY_BRIEFS){
  if(unavailable){rows.push({id:item.id,status:'SKIPPED_MODEL_UNAVAILABLE',
   modelRequests:0,sourceCompiled:false,worldWrites:0});progress();continue;}
  const target=path.join(dir,item.id),modelDir=path.join(target,'model');
  fs.mkdirSync(modelDir,{recursive:true});
  let raw=null,calls=0,status='HOLD',reason=null,sourceCompiled=false,features=null,
   originalResponseSha256=null,sourceSha256=null,geometrySha256=null;
  const originalFile=path.join(modelDir,'MODEL_RESPONSE_ORIGINAL.txt');
  try{
   const r=await request({model,system:R190_COMPACT_SYSTEM,user:item.brief,
    maxTokens:1800,timeoutMs:180000,onAttempt:()=>calls++,
    onRaw:(text)=>{
     if(typeof text==='string'&&text.length>=20&&text.length<=30000&&
      !fs.existsSync(originalFile))save(originalFile,text);
    }});
   raw=r.raw;
   if(typeof raw!=='string'||raw.length<20||raw.length>30000)
    throw Error('MODEL_ORIGINAL_MISSING');
   if(fs.existsSync(originalFile)){
    if(fs.readFileSync(originalFile,'utf8')!==raw)throw Error('CAPTURE_MISMATCH');
   }else save(originalFile,raw);
   originalResponseSha256=sha(Buffer.from(raw));
   const result=compileR190CompactProgram(raw);
   if(!verifyCompiled(result.built.design,result.built.compiled)||
    result.built.worldContacts!==0||result.built.worldWrites!==0||
    result.built.constructionApproved!==false||
    result.built.BuildPlan.operations.length!==0)
    throw Error('SOURCE_SAFETY_REJECT');
   save(path.join(modelDir,'MODEL_PROGRAM.json'),result.modelProgram);
   save(path.join(modelDir,'HOST_DERIVED_PLAN.json'),result.hostDerivedPlan);
   save(path.join(modelDir,'HOST_RESOLUTION.json'),result.hostResolution);
   save(path.join(modelDir,'B143_SOURCE.json'),result.built.design);
   save(path.join(modelDir,'B143_SCENE.json'),result.built.compiled);
   save(path.join(modelDir,'R190_SOURCE_ROUTE_AUDIT.json'),result.built.audit);
   const gallery=compileB143Gallery([result.built.design]);
   const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
   save(path.join(modelDir,'index.html'),renderB143Html(gallery,template));
   sourceCompiled=true;status='SOURCE_READY_ART_HOLD';
   sourceSha256=result.built.compiled.sourceSha256;
   geometrySha256=result.built.compiled.geometrySha256;
   features={spaces:result.modelProgram.spaces.length,
    selectedForms:result.modelProgram.spaces.map(s=>[s.id,s.form]),
    actualDims:result.hostDerivedPlan.spaces.map(s=>[s.id,s.width,s.depth,s.height]),
    resolvedSideDeviations:result.hostResolution.relativeSideDeviations,
    occupiedVoxelCount:result.built.compiled.primitives.length};
  }catch(e){
   reason=String(e?.message??e).slice(0,500);
   if(/LOCAL_MODEL_NOT_LISTED|MODEL_UNAVAILABLE/.test(reason))unavailable=true;
  }
  if(raw!==null&&originalResponseSha256===null&&typeof raw==='string')
   originalResponseSha256=sha(Buffer.from(raw));
  if(fs.existsSync(originalFile)&&originalResponseSha256===null)
   originalResponseSha256=sha(fs.readFileSync(originalFile));
  rows.push({id:item.id,status,reason,
   modelRequests:calls,sourceCompiled,originalResponseSha256,
   sourceSha256,geometrySha256,features,output:target,
   authorship:'MODEL_COMPACT_PROGRAM_AND_HOST_DERIVED_GEOMETRY',
   art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
   windows:'DEFERRED',makecode:'NOT_GENERATED',worldWrites:0});
  progress();
 }
 const ok=rows.filter(r=>r.sourceCompiled);
 const distinctGeometry=new Set(ok.map(r=>r.geometrySha256)).size;
 const report={schema:'r190-e1-compact-program-three-use-v1',
  provenance:testDouble?'SYNTHETIC_TEST_DOUBLE_NOT_REAL_MODEL':'REAL_LOCAL_MODEL_ATTEMPTS',
  model,modelRequests:testDouble?0:rows.reduce((n,r)=>n+r.modelRequests,0),
  attemptedModelCalls:rows.reduce((n,r)=>n+r.modelRequests,0),
  requestedUseCount:3,sourceCompiledCount:ok.length,
  distinctGeometryHashCount:distinctGeometry,
  status:testDouble?'TEST_DOUBLE_ONLY':ok.length===3?
   'THREE_COMPACT_SOURCE_CANDIDATES_ART_HOLD':'SOURCE_INCOMPLETE_HOLD',
  authored:'COMPACT_PROGRAM_BY_MODEL',dimensions:'HOST_DERIVED_TRANSPARENT',
  art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  makecode:'NOT_GENERATED',worldContacts:0,worldWrites:0,
  constructionApproved:false,rows};
 save(path.join(dir,'E1_COMPACT_REPORT.json'),report);
 const cards=rows.map(r=>'<article><h2>'+esc(r.id)+'</h2>'+
  (r.sourceCompiled?'<a target="_blank" rel="noopener" href="'+encodeURIComponent(r.id)+
   '/model/index.html">3Dを別タブで開き、回転・拡大して美術確認</a>'+
   '<iframe loading="lazy" title="'+esc(r.id)+
   '" src="'+encodeURIComponent(r.id)+'/model/index.html"></iframe>':
   '<div class="hold">SOURCE HOLD — 3D not generated</div>')+
  '<p>'+esc(r.status)+' / '+esc(r.reason??'No source error')+'</p>'+
  '<p>AI choices: '+esc(JSON.stringify(r.features?.selectedForms??null))+'</p>'+
  '<p>Host resolved: '+esc(JSON.stringify(r.features?.resolvedSideDeviations??null))+'</p></article>').join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>R190 compact-program 3D review</title>'+
  '<style>body{font:15px system-ui;background:#101c29;color:#eef4fa;margin:20px}'+
  'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px}'+
  'article{background:#1c3043;border-radius:10px;padding:14px;overflow-wrap:anywhere}'+
  'a{color:#96dfff;display:block;margin:8px 0}iframe,.hold{height:360px;width:100%;border:0;background:#334255}'+
  '.hold{display:grid;place-items:center}</style>'+
  '<h1>Independent compact model programs — real B143 review</h1>'+
  '<p>MODEL authored program; HOST derived dimensions/sides. '+esc(ok.length)+
  '/3 source compiled. No ART or Minecraft certification.</p><main>'+cards+'</main>';
 save(path.join(dir,'E1_COMPACT_REVIEW.html'),html);
 return {dir,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length===3&&process.argv[2]==='--replay-latest'){
  const root=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs');
  const previous=fs.readdirSync(root,{withFileTypes:true})
   .filter(x=>x.isDirectory()&&x.name.startsWith('E1-compact-')&&
     fs.existsSync(path.join(root,x.name,'E1_COMPACT_REPORT.json')))
   .map(x=>({dir:path.join(root,x.name),
     time:fs.statSync(path.join(root,x.name,'E1_COMPACT_REPORT.json')).mtimeMs}))
   .sort((a,b)=>b.time-a.time)[0]?.dir;
  if(!previous)throw Error('NO_SAVED_COMPACT_STUDY');
  const result=replayR190CompactSaved({previousDir:previous});
  console.log('REPLAY_REPORT:',path.join(result.dir,'E1_COMPACT_REPLAY_REPORT.json'));
  console.log('REPLAY_VIEW:',path.join(result.dir,'E1_COMPACT_REPLAY_REVIEW.html'));
  console.log('SOURCE:',result.sourceCompiledCount,'/3; localModelRequests:0');
  // GUI convenience only. Never run from a library call, CI test, or the model.
  openE1ResultFolder(path.join(result.dir,'E1_COMPACT_REPLAY_REPORT.json'));
 }else if(process.argv.length!==3||process.argv[2]!=='--study-three'){
  console.error('Usage: node scripts/r190-compact-program-study.mjs --study-three');
  process.exitCode=2;
 }else{
  runR190CompactThreeUse().then(r=>{
   console.log('REPORT:',path.join(r.dir,'E1_COMPACT_REPORT.json'));
   console.log('REVIEW:',path.join(r.dir,'E1_COMPACT_REVIEW.html'));
   console.log('SOURCE:',r.sourceCompiledCount,'/3; realCalls:',r.modelRequests);
   openE1ResultFolder(path.join(r.dir,'E1_COMPACT_REPORT.json'));
   if(!r.status.startsWith('THREE_'))process.exitCode=2;
  }).catch(e=>{console.error(String(e?.message??e));process.exitCode=2;});
 }
}

/**
 * NO-MODEL replay from preserved real/synthetic compact model outputs.
 * Verifies every original byte SHA before invoking the deterministic compiler.
 * Reuses the existing B143 viewer without touching original study directory.
 */
export function replayR190CompactSaved({previousDir,outRoot=null}={}){
 if(typeof previousDir!=='string'||previousDir.length<1)
  throw Error('R190_COMPACT_REPLAY_INPUT');
 const previous=path.resolve(previousDir);
 const sourceReport=fs.readFileSync(path.join(previous,'E1_COMPACT_REPORT.json'));
 const prior=JSON.parse(sourceReport.toString('utf8'));
 if(prior.schema!=='r190-e1-compact-program-three-use-v1'||
  !['SYNTHETIC_TEST_DOUBLE_NOT_REAL_MODEL','REAL_LOCAL_MODEL_ATTEMPTS'].includes(prior.provenance)||
  prior.requestedUseCount!==3||!Array.isArray(prior.rows)||prior.rows.length!==3)
  throw Error('R190_COMPACT_REPLAY_UNTRUSTED_REPORT');
 const originals=new Map(),priorRows=new Map();
 // Validate all previous model answers and their hashes before creating a new output.
 for(const item of R190_E1_STUDY_BRIEFS){
  const row=prior.rows.find(x=>x.id===item.id);
  if(!row||priorRows.has(item.id)||row.output!==path.join(previous,item.id)||
   !/^[a-f0-9]{64}$/.test(row.originalResponseSha256??''))
   throw Error('R190_COMPACT_REPLAY_UNTRUSTED_ROW');
  const original=fs.readFileSync(path.join(previous,item.id,'model',
   'MODEL_RESPONSE_ORIGINAL.txt'));
  if(sha(original)!==row.originalResponseSha256)
   throw Error('R190_COMPACT_REPLAY_ORIGINAL_SHA_MISMATCH');
  if(row.sourceCompiled){
   const model=path.join(previous,item.id,'model');
   const oldSource=JSON.parse(fs.readFileSync(path.join(model,'B143_SOURCE.json')));
   const oldScene=JSON.parse(fs.readFileSync(path.join(model,'B143_SCENE.json')));
   if(!verifyCompiled(oldSource,oldScene)||
    oldScene.sourceSha256!==row.sourceSha256||
    oldScene.geometrySha256!==row.geometrySha256)
    throw Error('R190_COMPACT_REPLAY_PRIOR_3D_INVALID');
  }
  originals.set(item.id,original);
  priorRows.set(item.id,row);
 }
 const root=path.resolve(outRoot??path.dirname(previous));
 fs.mkdirSync(root,{recursive:true});
 const dir=fs.mkdtempSync(path.join(root,'R190-COMPACT-REPLAY-'));
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const rows=[];
 for(const item of R190_E1_STUDY_BRIEFS){
  const row=priorRows.get(item.id),original=originals.get(item.id);
  let sourceCompiled=false,reason=null,diagnostics=null,
   sourceSha256=null,geometrySha256=null,viewer=null,hostResolution=null,
   educationExport={status:'NOT_ATTEMPTED_SOURCE_HOLD'},
   windowResearch={status:'NOT_ATTEMPTED_SOURCE_HOLD'},
   expandedGlazingResearch={status:'NOT_ATTEMPTED_SOURCE_HOLD'};
  try{
   const x=compileR190CompactProgram(original.toString('utf8'));
   sourceSha256=x.built.compiled.sourceSha256;
   geometrySha256=x.built.compiled.geometrySha256;
   if(row.sourceCompiled&&
    (sourceSha256!==row.sourceSha256||geometrySha256!==row.geometrySha256))
    throw Error('PREVIOUSLY_PASSED_GEOMETRY_CHANGED_REQUIRES_REVIEW');
   sourceCompiled=true;
   hostResolution=x.hostResolution;
   const folder=path.join(dir,item.id,'model');
   fs.mkdirSync(folder,{recursive:true});
   const gallery=compileB143Gallery([x.built.design]);
   save(path.join(folder,'index.html'),renderB143Html(gallery,template));
   save(path.join(folder,'HOST_RESOLUTION.json'),hostResolution);
   viewer=item.id+'/model/index.html';
   // Separate, strict palette-only Minecraft Education SHELL research packet.
   // This does NOT certify windows, interiors, world identity or actual walking.
   // Failure must not invalidate a valid design/source.
   try{
    const palette=JSON.parse(fs.readFileSync(path.join(ROOT,'configs',
     'r125-education-verified-palette-v26.33.json'),'utf8'));
    const packet=exportB143EducationMakeCode({
     design:x.built.design,scene:x.built.compiled,
     verifiedPalette:palette,provenance:'LOCAL_MODEL_CAPTURE',
     tightVoxelEnvelope:true,groundLowestLayer:true
    });
    if(packet.sourceSha256!==sourceSha256||
     packet.geometrySha256!==geometrySha256||
     packet.worldWrites!==0||packet.programExecuted!==false||
     packet.constructionApproved!==false||
     packet.BuildPlan.operations.length!==0)
     throw Error('SHELL_PROVENANCE_OR_SAFETY_MISMATCH');
    const shell=path.join(dir,item.id,'EDUCATION_SHELL_RESEARCH_ONLY');
    fs.mkdirSync(shell,{recursive:true});
    save(path.join(shell,'MAKECODE_EDUCATION.ts'),packet.code);
    const {code,...meta}=packet;
    const exportRecord={...meta,
     researchStage:'UNFINISHED_SHELL_NO_WINDOWS_OR_ART_APPROVAL',
     originalModelProgramSha256:sha(original),
     humanMinecraftBuild:'NOT_EXECUTED',
     worldIdentity:'NOT_VERIFIED',
     constructionApproved:false,worldWrites:0,
     readiness:'NOT_PREPARED',
     BuildPlan:{operations:[]},
     gates:Array(9).fill('BLOCKED')};
    save(path.join(shell,'SHELL_EXPORT_REPORT.json'),exportRecord);
    save(path.join(shell,'READ_FIRST_JA.txt'),
     '研究用の建物外殻だけです。窓・室内・建築美術・実歩行は未検証。\n'+
     'Minecraftへの自動施工・ワールドID/バックアップの自動確認は行われません。\n'+
     'もし試験する場合も、バックアップ済みの空き試験ワールドだけで\n'+
     'Code Builderに貼り付け、mabset→mabbuild→mabverifyを人間が実行します。\n'+
     '新たな本番施工・MVP完成と認定しないでください。\n');
    educationExport={status:'OFFLINE_SHELL_RESEARCH_PACKET_ONLY',
     output:path.join(shell,'MAKECODE_EDUCATION.ts'),
     report:path.join(shell,'SHELL_EXPORT_REPORT.json'),
     cuboids:packet.plannedCuboids,voxels:packet.plannedVoxelCount,
     bounds:packet.bounds,materialMode:packet.materialMode,
     worldWrites:0,windows:'NOT_VERIFIED',minecraftWalking:'NOT_TESTED'};
   }catch(e){
    educationExport={status:'HOLD_NO_SHELL_PACKET',
     reason:String(e?.message??e).slice(0,400),worldWrites:0};
   }
  // Optional host-origin glazing study: never edit the frozen Qwen source
  // or the original 3D/MakeCode shell. Separate source SHA and output dir.
  try{
   const v=deriveR190CompactMinimumWindows(x);
   if(v.status!=='HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD')
    throw Error(v.reason??'NO_VERIFIED_WINDOW');
   if(v.originalGeometrySha256!==geometrySha256||
    v.originalSourceSha256!==sourceSha256||
    !verifyCompiled(v.current.design,v.current.compiled))
    throw Error('WINDOW_PROVENANCE_MISMATCH');
   const target=path.join(dir,item.id,'WINDOWS_HOST_DERIVED_RESEARCH_ONLY');
   fs.mkdirSync(target,{recursive:true});
   save(path.join(target,'index.html'),
    renderB143Html(compileB143Gallery([v.current.design]),template));
   save(path.join(target,'HOST_DERIVED_PLAN.json'),v.plan);
   save(path.join(target,'B143_SOURCE.json'),v.current.design);
   save(path.join(target,'B143_SCENE.json'),v.current.compiled);
   const interior=auditR190CompactInteriorEvidence(v.current);
   save(path.join(target,'ROOM_SOURCE_FLOOR_REVIEW.json'),interior);
   save(path.join(target,'SOURCE_FLOOR_ACCESS_MAP.svg'),
    renderR190CompactAccessMapSvg(v.current));
   const record={status:v.status,author:'HOST_DERIVED_NOT_MODEL',
    originalModelProgramSha256:sha(original),
    originalSourceSha256:sourceSha256,originalGeometrySha256:geometrySha256,
    derivedSourceSha256:v.current.compiled.sourceSha256,
    derivedGeometrySha256:v.current.compiled.geometrySha256,
    applied:v.applied,skipped:v.skipped,numberOfRealWindows:v.applied.length,
    modelCalls:0,worldWrites:0,art:'NOT_REVIEWED',
    minecraftWalking:'NOT_TESTED',constructionApproved:false};
   save(path.join(target,'WINDOW_RESEARCH_REPORT.json'),record);
   let makecodeStatus='NOT_EXPORTED',makecodeReason=null;
   try{
    const palette=JSON.parse(fs.readFileSync(path.join(ROOT,'configs',
     'r125-education-verified-palette-v26.33.json'),'utf8'));
    const makecode=exportB143EducationMakeCode({
     design:v.current.design,scene:v.current.compiled,
     verifiedPalette:palette,provenance:'LOCAL_MODEL_CAPTURE',
     tightVoxelEnvelope:true,groundLowestLayer:true});
    if(makecode.geometrySha256!==v.current.compiled.geometrySha256||
     makecode.worldWrites!==0||makecode.constructionApproved!==false)
     throw Error('WINDOW_EXPORT_PROVENANCE_MISMATCH');
    save(path.join(target,'MAKECODE_WINDOWS_RESEARCH_ONLY.ts'),makecode.code);
    const {code,...meta}=makecode;
    save(path.join(target,'WINDOW_MAKECODE_REPORT.json'),{
     ...meta,researchStage:'HOST_WINDOWS_UNCERTIFIED',
     originalModelProgramSha256:sha(original)});
    makecodeStatus='OFFLINE_RESEARCH_ONLY';
   }catch(e){makecodeStatus='HOLD';makecodeReason=String(e?.message??e).slice(0,350);}
   save(path.join(target,'READ_FIRST_JA.txt'),
    'Qwenの原設計は未変更。窓だけホストが決定した別案です。\n'+
    '窓の真正3DとSOURCE動線のみ検証済み。ART/実歩行/ワールドIDは未確認。\n'+
    'MakeCodeはバックアップ済みの試験ワールドで明示操作が必要です。\n');
   windowResearch={status:v.status,output:path.join(target,'index.html'),
    report:path.join(target,'WINDOW_RESEARCH_REPORT.json'),
    numberOfRealWindows:v.applied.length,makecodeStatus,makecodeReason,
    clearRoomFloorCells:interior.rooms.map(r=>({id:r.spaceId,
     clearCells:r.supportedClearFloorCells,pads2x2:r.twoByTwoSupportedClearPads,
     padsReachableFromEntrance:r.reachableTwoWidePadsFromEntrance,
     disconnectedPads:r.disconnectedTwoWidePads,
     reachablePadFraction:r.reachableTwoWidePadFraction})),
    worldWrites:0};
   // Compare an additional, explicitly HOST-created enlarged-glass option.
   // It never overwrites either the model or minimum-window result.
   try{
    const large=deriveR190CompactExpandedGlazingVariant(v);
    if(large.status!=='HOST_DERIVED_LARGER_WINDOWS_ART_HOLD')
     throw Error(large.reason??'NO_SAFE_ENLARGEMENT');
    if(large.minimumWindowSourceSha256!==v.current.compiled.sourceSha256||
     !verifyCompiled(large.current.design,large.current.compiled))
     throw Error('LARGE_GLAZING_SOURCE_MISMATCH');
    const folder=path.join(dir,item.id,'HOST_LARGER_GLAZING_RESEARCH_ONLY');
    fs.mkdirSync(folder,{recursive:true});
    save(path.join(folder,'index.html'),
     renderB143Html(compileB143Gallery([large.current.design]),template));
    save(path.join(folder,'B143_SOURCE.json'),large.current.design);
    save(path.join(folder,'B143_SCENE.json'),large.current.compiled);
    save(path.join(folder,'GLAZING_RESEARCH_REPORT.json'),{
     status:large.status,authorship:large.authorship,
     originalModelResponseSha256:sha(original),
     modelOriginalSourceSha256:sourceSha256,
     minimumWindowSourceSha256:large.minimumWindowSourceSha256,
     expandedSourceSha256:large.expandedSourceSha256,
     expandedGeometrySha256:large.expandedGeometrySha256,
     originalGlassCells:large.originalGlassCells,
     expandedGlassCells:large.expandedGlassCells,
     accepted:large.accepted,skipped:large.skipped,
     attemptedCandidates:large.attemptedCandidates,
     modelCalls:0,worldContacts:0,worldWrites:0,
     constructionApproved:false,art:'NOT_REVIEWED',
     minecraftWalking:'NOT_TESTED'});
    save(path.join(folder,'READ_FIRST_JA.txt'),
     '大窓はホストが試した独立意匠案です。Qwen自身の窓設計ではありません。\n'+
     '元外殻・小窓案は変更していません。Minecraft施工も実歩行も未実行です。\n'+
     'SOURCE PASSでも建築美術はART HOLDです。\n');
    expandedGlazingResearch={status:large.status,
     viewer:item.id+'/HOST_LARGER_GLAZING_RESEARCH_ONLY/index.html',
     originalGlassCells:large.originalGlassCells,
     expandedGlassCells:large.expandedGlassCells,
     enlargedWindows:large.accepted.length,
     modelCalls:0,worldWrites:0};
   }catch(e){
    expandedGlazingResearch={status:'HOLD_NO_SAFE_LARGE_WINDOW',
     reason:String(e?.message??e).slice(0,350),modelCalls:0,worldWrites:0};
   }
  }catch(e){
   windowResearch={status:'HOLD_NO_VERIFIED_WINDOWS',
    reason:String(e?.message??e).slice(0,350),worldWrites:0};
  }
  }catch(e){
   reason=String(e?.message??e).slice(0,900);
   diagnostics=e?.diagnostics??null;
  }
  rows.push({id:item.id,originalSourceCompiled:row.sourceCompiled,
   status:sourceCompiled?'REPLAY_SOURCE_VALID_ART_HOLD':'REPLAY_SOURCE_HOLD',
   sourceCompiled,reason,diagnostics,originalResponseSha256:sha(original),
   sourceSha256,geometrySha256,viewer,hostResolution,educationExport,windowResearch,
   expandedGlazingResearch,modelRequests:0,
   provenance:'SAVED_MODEL_PROGRAM_READ_ONLY_REPLAY',
   art:'NOT_REVIEWED',worldWrites:0});
 }
 if(sha(fs.readFileSync(path.join(previous,'E1_COMPACT_REPORT.json')))!==sha(sourceReport))
  throw Error('R190_COMPACT_REPLAY_PRIOR_REPORT_MODIFIED');
 for(const item of R190_E1_STUDY_BRIEFS){
  const original=fs.readFileSync(path.join(previous,item.id,'model','MODEL_RESPONSE_ORIGINAL.txt'));
  if(sha(original)!==sha(originals.get(item.id)))
   throw Error('R190_COMPACT_REPLAY_ORIGINAL_CHANGED');
 }
 const count=rows.filter(x=>x.sourceCompiled).length;
 const shellPacketCount=rows.filter(x=>
  x.educationExport.status==='OFFLINE_SHELL_RESEARCH_PACKET_ONLY').length;
 const windowCandidateCount=rows.filter(x=>x.windowResearch.status===
  'HOST_DERIVED_WINDOWS_SOURCE_ART_HOLD').length;
 const report={schema:'r190-compact-readonly-replay-v1',
  previousReportSha256:sha(sourceReport),previousProvenance:prior.provenance,
  localModelRequests:0,sourceCompiledCount:count,requestedUseCount:3,
  status:count===3?'THREE_SOURCE_REPLAY_CANDIDATES_ART_HOLD':'SOURCE_REPLAY_INCOMPLETE_HOLD',
  makecode:'SHELL_RESEARCH_ONLY_NOT_APPROVED',
  shellPacketCount,windowCandidateCount,
  largerGlazingCandidateCount:rows.filter(r=>r.expandedGlazingResearch.status===
   'HOST_DERIVED_LARGER_WINDOWS_ART_HOLD').length,
  minecraftWalking:'NOT_TESTED',
  constructionApproved:false,worldContacts:0,worldWrites:0,
  art:'NOT_REVIEWED',rows};
 save(path.join(dir,'E1_COMPACT_REPLAY_REPORT.json'),report);
 const cards=rows.map(x=>'<article><h2>'+esc(x.id)+'</h2>'+
  '<div class="views"><section><h3>Qwen原設計の外殻</h3>'+
  (x.viewer?'<a target="_blank" rel="noopener" href="'+x.viewer+
   '">元の真正3Dを開く</a><iframe title="元の外殻" loading="lazy" src="'+x.viewer+'"></iframe>':
   '<div class="hold">SOURCE HOLD — 3Dなし</div>')+'</section>'+
  '<section><h3>HOST派生・窓付き研究案</h3>'+
  (x.windowResearch.output?'<a target="_blank" rel="noopener" href="'+
   encodeURIComponent(x.id)+'/WINDOWS_HOST_DERIVED_RESEARCH_ONLY/index.html">窓付き真正3Dを開く</a>'+
   '<iframe title="窓付き研究案" loading="lazy" src="'+encodeURIComponent(x.id)+
   '/WINDOWS_HOST_DERIVED_RESEARCH_ONLY/index.html"></iframe>':
   '<div class="hold">窓付き案 HOLD</div>')+'</section></div>'+
  (x.expandedGlazingResearch.viewer?
   '<p><a target="_blank" rel="noopener" href="'+
   encodeURIComponent(x.id)+'/HOST_LARGER_GLAZING_RESEARCH_ONLY/index.html">'+
   '別案：実ガラス窓を大きくした3D外観を比較</a> ('+
   esc(x.expandedGlazingResearch.originalGlassCells)+'→'+
   esc(x.expandedGlazingResearch.expandedGlassCells)+'セル)</p>':
   '<p>大窓の別案: '+esc(x.expandedGlazingResearch.status)+'</p>')+
  '<p>SOURCE状態: '+esc(x.status)+' / 窓: '+esc(x.windowResearch.status)+'</p>'+
  '<p>各室SOURCE床セルと2×2床候補（実歩行認証ではない）: '+
   esc(JSON.stringify(x.windowResearch.clearRoomFloorCells??'未測定'))+'</p>'+
  (x.windowResearch.output?'<p><a href="'+encodeURIComponent(x.id)+
   '/WINDOWS_HOST_DERIVED_RESEARCH_ONLY/ROOM_SOURCE_FLOOR_REVIEW.json">実ボクセル室内床の詳細</a></p>':'')+
  (x.windowResearch.output?'<p><a href="'+encodeURIComponent(x.id)+
   '/WINDOWS_HOST_DERIVED_RESEARCH_ONLY/SOURCE_FLOOR_ACCESS_MAP.svg">入口からの連続床マップ</a></p>':'')+
  '<p>教育版の外殻研究: '+esc(x.educationExport.status)+'</p>'+
  (x.educationExport.output?
   '<p><a href="'+encodeURIComponent(x.id)+
   '/EDUCATION_SHELL_RESEARCH_ONLY/READ_FIRST_JA.txt">安全説明と外殻出力</a></p>':'')+
  '<p>理由: '+esc(x.reason??'なし')+'</p>'+
  '<p>候補失敗集計: '+esc(JSON.stringify(x.diagnostics?.allReasons??{}))+'</p>'+
  '<p>AI原文 SHA: '+esc(x.originalResponseSha256)+'</p></article>').join('');
 save(path.join(dir,'E1_COMPACT_REPLAY_REVIEW.html'),
  '<!doctype html><html lang="ja"><meta charset="utf-8"><title>R190 3用途保存済み原文再検証</title>'+
  '<style>body{font:15px system-ui;background:#102030;color:#edf4fa;margin:20px}'+
  'a{color:#a5e6ff}main{display:grid;grid-template-columns:1fr;gap:14px}'+
  '.views{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px}'+
  'h3{font-size:16px;margin:8px 0}section{min-width:0}'+
  'article{padding:14px;background:#1c3547;border-radius:10px;overflow-wrap:anywhere}'+
  'iframe,.hold{height:400px;width:100%;border:0;background:#2d4052}'+
  '.hold{display:grid;place-items:center}</style>'+
  '<h1>同一Qwen原文・新しい配置エンジンの再検証</h1>'+
  '<p>真正SOURCE '+count+'/3。元の外殻と窓付き別案を回転比較できます。床計測は実歩行・家具・美術の認定ではありません。モデル再要求0、原文変更0、Minecraft書込0。</p>'+
  '<main>'+cards+'</main>');
 return {dir,...report};
}
