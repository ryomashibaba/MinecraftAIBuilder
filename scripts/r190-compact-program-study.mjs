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
import {R190_E1_STUDY_BRIEFS} from './r125-r190-free-engine.mjs';
import {R190_COMPACT_SCHEMA,compileR190CompactProgram}
 from '../source/ai/r190-compact-program.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
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
  (r.sourceCompiled?'<iframe loading="lazy" title="'+esc(r.id)+
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
  'iframe,.hold{height:320px;width:100%;border:0;background:#334255}'+
  '.hold{display:grid;place-items:center}</style>'+
  '<h1>Independent compact model programs — real B143 review</h1>'+
  '<p>MODEL authored program; HOST derived dimensions/sides. '+esc(ok.length)+
  '/3 source compiled. No ART or Minecraft certification.</p><main>'+cards+'</main>';
 save(path.join(dir,'E1_COMPACT_REVIEW.html'),html);
 return {dir,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--study-three'){
  console.error('Usage: node scripts/r190-compact-program-study.mjs --study-three');
  process.exitCode=2;
 }else{
  runR190CompactThreeUse().then(r=>{
   console.log('REPORT:',path.join(r.dir,'E1_COMPACT_REPORT.json'));
   console.log('REVIEW:',path.join(r.dir,'E1_COMPACT_REVIEW.html'));
   console.log('SOURCE:',r.sourceCompiledCount,'/3; realCalls:',r.modelRequests);
   if(!r.status.startsWith('THREE_'))process.exitCode=2;
  }).catch(e=>{console.error(String(e?.message??e));process.exitCode=2;});
 }
}
