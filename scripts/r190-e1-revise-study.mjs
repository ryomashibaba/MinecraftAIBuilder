/**
 * R190 E1: evidence-locked, model-authored second attempt for an existing
 * three-use massing study. The host never edits a model plan.
 * Source-only; Minecraft world access and MakeCode are forbidden here.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {R190_E1_STUDY_BRIEFS,runR190FreeEngine,r190E1MassingSignature}
 from './r125-r190-free-engine.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {R190_SCHEMA} from '../source/ai/r190-semantic-massing.mjs';

const sha=raw=>createHash('sha256').update(raw).digest('hex');
const fail=name=>{throw Error('R190_E1_REVISION_'+name);};
const save=(p,v)=>fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function reviseR190E1Study({
 previousDir,outRoot=null
}={}, {single=runR190FreeEngine}={}){
 if(typeof previousDir!=='string'||!previousDir||typeof single!=='function')
  fail('INPUT');
 const synthetic=single!==runR190FreeEngine;
 const dir=path.resolve(previousDir);
 const priorRaw=fs.readFileSync(path.join(dir,'E1_STUDY_REPORT.json'));
 const prior=JSON.parse(priorRaw.toString('utf8'));
 if(prior.schema!=='r190-e1-three-use-source-comparison-v1'||
  prior.studyMode!=='MASSING_ONLY_WINDOWS_DEFERRED'||
  prior.revisionOfStudySha256!==undefined||
  prior.requestedUseCount!==3||
  (synthetic?prior.provenance!=='SYNTHETIC_TEST_DOUBLE_NOT_REAL_MODEL':
   prior.provenance!=='REAL_LOCAL_MODEL_ATTEMPTS')||
  !Array.isArray(prior.rows)||prior.rows.length!==3||
  !/^[A-Za-z0-9._:/-]{2,140}$/.test(prior.model))
  fail('PRIOR_REPORT_UNTRUSTED');
 const originals=new Map(),priorRows=new Map();
 // Verify ALL original evidence before sending a single new model request.
 for(const item of R190_E1_STUDY_BRIEFS){
  const row=prior.rows.find(x=>x.id===item.id);
  if(!row||priorRows.has(row.id)||row.modelRequests!==1||
   row.output!==path.join(dir,item.id)||
   !/^[a-f0-9]{64}$/.test(row.originalResponseSha256??''))
   fail('PRIOR_ROW_UNTRUSTED');
  const rawFile=path.join(dir,item.id,'model','MODEL_RESPONSE_ORIGINAL.txt');
  const raw=fs.readFileSync(rawFile);
  if(sha(raw)!==row.originalResponseSha256||raw.length>30000||raw.length<20)
   fail('ORIGINAL_SHA_MISMATCH');
  const authored=JSON.parse(raw.toString('utf8'));
  if(authored.schema!==R190_SCHEMA)fail('PRIOR_SCHEMA');
  if(row.sourceCompiled){
   const modelDir=path.join(dir,item.id,'model');
   const design=JSON.parse(fs.readFileSync(path.join(modelDir,'B143_SOURCE.json'),'utf8'));
   const scene=JSON.parse(fs.readFileSync(path.join(modelDir,'B143_SCENE.json'),'utf8'));
   if(!verifyCompiled(design,scene)||scene.sourceSha256!==row.sourceSha256||
    scene.geometrySha256!==row.geometrySha256)
    fail('CARRIED_FORWARD_SOURCE_INVALID');
  }else if(row.status!=='HOLD_OR_INCOMPLETE_SOURCE'||
   typeof row.reason!=='string'||!Array.isArray(row.validationIssues)){
   fail('PRIOR_FAILURE_EVIDENCE_INCOMPLETE');
  }
  originals.set(item.id,raw);
  priorRows.set(item.id,row);
 }
 const root=path.resolve(outRoot??path.join(path.dirname(dir),'R190-E1-Revisions'));
 fs.mkdirSync(root,{recursive:true});
 const output=fs.mkdtempSync(path.join(root,'E1-author-revision-'));
 const rows=[];
 const writeProgress=()=>fs.writeFileSync(path.join(output,'PROGRESS.json'),
  JSON.stringify({rows,worldWrites:0,modelRequestsByThisStudy:
   rows.reduce((a,v)=>a+v.modelRequests,0)},null,2)+'\n');
 for(const item of R190_E1_STUDY_BRIEFS){
  const old=priorRows.get(item.id);
  if(old.sourceCompiled){
   rows.push({...old,status:'SOURCE_READY_ART_HOLD',
    modelRequests:0,revisionAction:'CARRIED_FORWARD_VERIFIED',
    priorOriginalSha256:old.originalResponseSha256,art:'NOT_REVIEWED',worldWrites:0});
   writeProgress();continue;
  }
  const target=path.join(output,item.id);
  const context={priorOriginal:originals.get(item.id).toString('utf8'),
   priorSha256:old.originalResponseSha256,reason:old.reason,
   issues:old.validationIssues};
  let report;
  try{
   report=await single({prompt:item.brief,model:prior.model,outDir:target,
    paletteFile:path.join(path.dirname(fileURLToPath(import.meta.url)),
     '..','configs','r125-education-verified-palette-v26.33.json'),
    massingOnly:true,revisionContext:context});
  }catch(e){
   report={status:'HOLD',reason:'REVISION_EXCEPTION: '+String(e?.message??e),
    worldWrites:0,modelRequests:0};
  }
  let sourceCompiled=false,reason=report.reason??null,shapeSignature=null,
   features=null,occupancySha256=null;
  if(report.status==='SOURCE_MASSING_ART_HOLD'&&report.modelRequests===1&&
   report.worldWrites===0&&report.windows==='DEFERRED'&&
   report.makecode==='NOT_GENERATED'){
   try{
    const modelDir=path.join(target,'model');
    const original=fs.readFileSync(path.join(modelDir,'MODEL_RESPONSE_ORIGINAL.txt'));
    const plan=JSON.parse(original.toString('utf8'));
    const design=JSON.parse(fs.readFileSync(path.join(modelDir,'B143_SOURCE.json'),'utf8'));
    const scene=JSON.parse(fs.readFileSync(path.join(modelDir,'B143_SCENE.json'),'utf8'));
    if(!synthetic&&(sha(original)!==report.originalResponseSha256||
     !verifyCompiled(design,scene)||
     scene.sourceSha256!==report.sourceSha256||
     scene.geometrySha256!==report.geometrySha256||
     JSON.stringify(plan)!==JSON.stringify(JSON.parse(
      fs.readFileSync(path.join(modelDir,'ARCHITECTURE_PLAN.json'),'utf8')))))
     fail('NEW_SOURCE_SHA_MISMATCH');
    shapeSignature=r190E1MassingSignature(plan);
    occupancySha256=sha(scene.primitives.map(v=>v.slice(0,3).join(',')).sort().join('|'));
    features={roomCount:plan.spaces.length,
     roofSections:plan.roofFormIntents??(plan.roofFormIntent?[plan.roofFormIntent]:[]),
     facetedForms:plan.formIntents??(plan.formIntent?[plan.formIntent]:[]),
     openCourtSpaces:plan.spaces.filter(x=>x.spatialRole==='open-court').length,
     skyCourt:plan.skyCourtIntent??null};
    sourceCompiled=true;
   }catch(e){reason='SOURCE_EVIDENCE_INVALID: '+String(e?.message??e);}
  }
  rows.push({id:item.id,status:sourceCompiled?'SOURCE_READY_ART_HOLD':
   'HOLD_OR_INCOMPLETE_SOURCE',engineStatus:report.status,reason,
   attemptNumber:2,previousReason:old.reason,
   previousOriginalSha256:old.originalResponseSha256,
   modelRequests:report.modelRequests??0,sourceCompiled,
   originalResponseSha256:report.originalResponseSha256??null,
   sourceSha256:report.sourceSha256??null,geometrySha256:report.geometrySha256??null,
   occupancySha256,shapeSignature,features,output:target,
   windows:'DEFERRED',makecode:'NOT_GENERATED',worldWrites:0,
   art:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'});
  writeProgress();
  if(report.modelRequests===0&&/LOCAL_MODEL_NOT_LISTED/.test(reason??''))break;
 }
 // Protect all three first-attempt originals even after local model execution.
 if(sha(fs.readFileSync(path.join(dir,'E1_STUDY_REPORT.json')))!==sha(priorRaw))
  fail('PRIOR_REPORT_CHANGED');
 for(const item of R190_E1_STUDY_BRIEFS)
  if(sha(fs.readFileSync(path.join(dir,item.id,'model','MODEL_RESPONSE_ORIGINAL.txt'))) !==
   sha(originals.get(item.id)))fail('ORIGINAL_CHANGED');
 const compiled=rows.filter(x=>x.sourceCompiled);
 const signatures=new Set(compiled.map(x=>x.shapeSignature));
 const report={schema:'r190-e1-locked-model-revision-v1',
  provenance:synthetic?'SYNTHETIC_TEST_DOUBLE_NOT_REAL_MODEL':'REAL_LOCAL_MODEL_ATTEMPTS',
  model:prior.model,studyMode:'MODEL_AUTHORED_SECOND_ATTEMPT_MASSING_ONLY',
  priorReportSha256:sha(priorRaw),priorSourceCompiledCount:prior.sourceCompiledCount,
  modelRequestsInRevision:synthetic?0:rows.reduce((a,r)=>a+r.modelRequests,0),
  attemptedSecondCalls:rows.reduce((a,r)=>a+(r.modelRequests??0),0),
  sourceCompiledCount:compiled.length,requestedUseCount:3,
  distinctMassingSignatureCount:signatures.size,
  status:synthetic?'TEST_DOUBLE_ONLY':compiled.length===3?
   'THREE_SOURCE_CANDIDATES_ART_HOLD':'SOURCE_INCOMPLETE_HOLD',
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  constructionApproved:false,makecode:'NOT_GENERATED',
  worldContacts:0,worldWrites:0,rows};
 save(path.join(output,'E1_REVISION_REPORT.json'),report);
 const cards=rows.map(r=>{
  const viewer=r.sourceCompiled?path.relative(output,
   path.join(r.output,'model','index.html')).split(path.sep).map(encodeURIComponent).join('/'):null;
  return '<article><h2>'+esc(r.id)+'</h2>'+
   (viewer?'<iframe loading="lazy" src="'+viewer+'"></iframe>':
    '<div class="hold">SOURCE HOLD — genuine 3D not generated</div>')+
   '<p>Previous reason: '+esc(r.previousReason)+'</p>'+
   '<p>Second attempt: '+esc(r.status)+' / '+esc(r.reason??'none')+'</p>'+
   '<p>Original SHA: '+esc(r.originalResponseSha256)+'</p>'+
   '<p>Geometry SHA: '+esc(r.geometrySha256)+'</p></article>';
 }).join('');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>R190 E1 second model-authored attempt</title>'+
  '<style>body{font:15px system-ui;background:#102130;color:#edf4fa;margin:20px}'+
  'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}'+
  'article{background:#1c3547;padding:14px;border-radius:9px;overflow-wrap:anywhere}'+
  'iframe,.hold{height:350px;width:100%;border:0;background:#304455}'+
  '.hold{display:grid;place-items:center}</style>'+
  '<h1>Three independent architecture requests — author revision</h1>'+
  '<p>Source '+esc(compiled.length)+'/3. No host repair, no world writes, no ART approval.</p>'+
  '<main>'+cards+'</main>';
 save(path.join(output,'E1_REVISION_REVIEW.html'),html);
 return {dir:output,...report};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const task=process.argv.length===4&&process.argv[2]==='--from'?
  reviseR190E1Study({previousDir:process.argv[3]}):
  Promise.reject(Error('Usage: node scripts/r190-e1-revise-study.mjs --from <previous-E1-folder>'));
 task.then(r=>{console.log('REVISION_REPORT:',path.join(r.dir,'E1_REVISION_REPORT.json'));
  console.log('REVIEW_HTML:',path.join(r.dir,'E1_REVISION_REVIEW.html'));
  console.log('SOURCE:',r.sourceCompiledCount,'/3; modelCalls:',r.modelRequestsInRevision);
  if(r.status!=='THREE_SOURCE_CANDIDATES_ART_HOLD')process.exitCode=2;
 }).catch(e=>{console.error(String(e?.message??e));process.exitCode=2;});
}
