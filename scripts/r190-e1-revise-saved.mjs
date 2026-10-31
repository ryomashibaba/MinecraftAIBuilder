/**
 * Explicit, OPT-IN saved stage-A revision; zero hidden retries.
 * Uses original captured Qwen plan + read-only failure evidence; asks the
 * SAME local model to AUTHOR a revised plan once per use, then select one
 * source-certified window once. Old originals are NEVER changed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditR190E1SavedTwoStage,locateLatestTwoStage} from './r190-e1-stage-a-audit.mjs';
import {r190E1WindowSlotCandidates,diagnoseR190E1Plan} from './r190-e1-diagnose.mjs';
import {requestLocalModel,parseStageA,selectWindow,originalSceneOccupancySha} from './r190-e1-two-stage.mjs';
import {runR190FreeEngine,R190_E1_STUDY_BRIEFS,r190E1MassingSignature} from './r125-r190-free-engine.mjs';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs');
const PALETTE=path.join(ROOT,'configs','r125-education-verified-palette-v26.33.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
const save=(folder,name,data)=>fs.writeFileSync(path.join(folder,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const reason=e=>String(e?.message??e).slice(0,500);
const REVISION_SYSTEM=[
 'You are the original creative architect REVISING YOUR OWN previously saved original architecture.',
 'A verified independent geometry checker rejected your original. Respond with a NEW complete STAGE-A JSON design.',
 'Keep the recognizable use and artistic direction; freely redesign dimensions, room arrangement, roof profiles, facade massing to resolve the actual issue.',
 'Do not copy a named-building template or delegate authorship of structure to the host.',
 'Use the required schema minecraftaibuilder-r190-semantic-space-v1.',
 'Required keys: schema,id,title,brief,site,entrySpaceId,spaces,materials.',
 'ID must be lowercase ASCII kebab-case, never underscores. All room IDs and reference fields must agree.',
 'site width/depth 36..52, height 12..18; site volume <=40000.',
 'Model chooses functional connected 2..4 spaces, each with exact fields id,purpose,width,depth,height,parentId,side,privacy.',
 'EVERY room width and depth 7..22, height 7..site.height-2; window-ready rooms need height >=8.',
 'First room is entrance: parentId=null,side=null; all others parentId points at preceding room, side north/south/east/west.',
 'No child on entranceFace (default south). Distinct spaces MUST physically fit with entrance approach within site footprint.',
 'To allow a usable exterior window catalog: include at least one enclosed room with height>=8 that is NOT faceted by formIntent, and a true exterior facade not covered by another space.',
 'Architect may pick alternative layout edges, room dimensions and site to satisfy that design. Do not invent a window offset.',
 'glazedOpenings is FORBIDDEN in this stage; stage B separately selects SOURCE-certified exterior window(s).',
 'materials exactly floor,wall,roof with values stone or wood.',
 'If selecting roofFormIntents, room must exist, be enclosed, distinct and not in formIntent; room.height+rise < site.height. Avoid conflicting optional geometry.',
 'Two-Japanese-script-character purpose names are valid (居間, 受付, 物置).',
 'Read feedback carefully. Model authors ALL changes, host never automatically repairs your geometry.',
 'Output one new complete JSON object, not a patch, no explanations or commands.'
].join('\n');
const CHOICE_SYSTEM=[
 'You are the same author selecting the daylight/window opening for your revised spatial design.',
 'Choose EXACTLY ONE window SLOT ID from the supplied SOURCE-certified candidates.',
 'Return only JSON {"selectedWindowSlotIds":["win-NNNN"]}; use a listed ID exactly.',
 'You may not edit geometry, dimensions or move the window. No extra keys or prose.',
 'If none is desirable return {"selectedWindowSlotIds":[]} and the experiment will HOLD.'
].join('\n');

export async function runR190E1ReviseSaved({
 savedRunDir=null,outRoot=OUT,model='qwen3:14b',paletteFile=PALETTE,maxWindowSlots=36
}={}, {request=requestLocalModel}={}){
 if(typeof request!=='function'||!/^[A-Za-z0-9._:/-]{2,140}$/.test(model)||
  !Number.isSafeInteger(maxWindowSlots)||maxWindowSlots<1||maxWindowSlots>120)
  throw Error('E1_REVISION_BAD_CONFIGURATION');
 const source=savedRunDir?path.resolve(savedRunDir):locateLatestTwoStage(outRoot);
 const originalReport=JSON.parse(fs.readFileSync(path.join(source,'E1_TWO_STAGE_REPORT.json'),'utf8'));
 if(originalReport.schema!=='r190-e1-two-stage-comparison-v1'||
   originalReport.rows?.length!==3)throw Error('E1_REVISION_ORIGINAL_SCHEMA');
 const originalAudit=auditR190E1SavedTwoStage(source,{maxWindowSlots});
 fs.mkdirSync(outRoot,{recursive:true});
 const directory=fs.mkdtempSync(path.join(path.resolve(outRoot),'E1-revise-saved-'));
 const synthetic=request!==requestLocalModel,rows=[];
 save(directory,'REVISION_INTENT.json',{schema:'r190-e1-explicit-revision-intent-v1',
  fromRun:source,originalRunStatus:originalReport.status,
  provenance:synthetic?'TEST_DOUBLE_ONLY':'REAL_LOCAL_MODEL_REQUESTS',
  model,revisionSystem:REVISION_SYSTEM,choiceSystem:CHOICE_SYSTEM,
  maxModelRevisionCallsPerUse:1,maxModelWindowChoiceCallsPerUse:1,
  automaticRetry:false,worldWrites:0,constructionApproved:false});
 let modelUnavailable=false;
 for(const item of R190_E1_STUDY_BRIEFS){
  const row={id:item.id,status:'HOLD',reason:null,originalShaVerified:false,
   originalPlanSha256:null,revisionOriginalSha256:null,windowChoiceOriginalSha256:null,
   composedPlanSha256:null,modelRequests:0,syntheticStageCalls:0,
   sourceCompiled:false,worldWrites:0,modelWindowSelected:false,
   humanArt:'NOT_REVIEWED',actualMinecraftBuild:'NOT_ATTEMPTED'};
  rows.push(row);
  const folder=path.join(directory,item.id);fs.mkdirSync(folder);
  try{
   if(modelUnavailable)throw Error('E1_REVISION_PREVIOUS_MODEL_UNAVAILABLE');
   const previous=originalReport.rows.find(r=>r.id===item.id);
   const evidence=originalAudit.rows.find(r=>r.id===item.id);
   if(!previous||!evidence)throw Error('E1_REVISION_EVIDENCE_MISSING');
   const origPath=path.join(source,item.id,'STAGE_A_ORIGINAL.txt');
   const original=fs.readFileSync(origPath,'utf8');
   row.originalPlanSha256=sha(original);
   row.originalShaVerified=row.originalPlanSha256===previous.stageAOriginalSha256;
   if(!row.originalShaVerified)throw Error('E1_REVISION_ORIGINAL_HASH_MISMATCH');
   const failures={
    reason:previous.reason,
    issues:evidence.issues,
    layoutStrategies:evidence.layoutStrategies.map(x=>({name:x.strategy,status:x.status,
     ...(x.reason?{reason:x.reason}:{})})),
    windowCatalog:evidence.windowCatalog,
    auditDecision:evidence.reason
   };
   save(folder,'ORIGINAL_PROVENANCE.json',{
    sourcePath:origPath,originalSha256:row.originalPlanSha256,
    priorReason:previous.reason,author:'ORIGINAL_REAL_LOCAL_QWEN',
    originalUnchanged:true});
   save(folder,'MODEL_REVISION_FEEDBACK.json',failures);
   const count=()=>{if(synthetic)row.syntheticStageCalls++;else row.modelRequests++};
   const userA='Original Japanese brief:\n'+item.brief+
    '\nYOUR ORIGINAL plan (preserve creative intention, correct contract and physical feasibility):\n'+original+
    '\nVerified error feedback (model must author the revision; no host correction):\n'+JSON.stringify(failures)+
    '\nReturn NEW revised complete stage-A JSON without glazedOpenings.';
   // Precisely ONE explicit revision authoring call. No hidden retry.
   const revision=await request({stage:'A_REVISION',model,system:REVISION_SYSTEM,
    user:userA,onAttempt:count,original:original,feedback:failures});
   if(typeof revision?.raw!=='string')throw Error('E1_REVISION_MODEL_RESPONSE_MISSING');
   save(folder,'REVISION_MODEL_ORIGINAL.txt',revision.raw);
   row.revisionOriginalSha256=sha(revision.raw);
   const revised=parseStageA(revision.raw);
   save(folder,'REVISED_AUTHORED_PLAN.json',revised);
   const catalog=r190E1WindowSlotCandidates(revised,{maxSlots:maxWindowSlots,verifySource:true});
   save(folder,'REVISED_WINDOW_CATALOG.json',catalog);
   row.windowCatalog={totalPossibleSlots:catalog.totalPossibleSlots,
    testedRepresentativeSlots:catalog.testedRepresentativeSlots,
    certified:catalog.slots.length,
    sourceRejectionCounts:catalog.rejectedSourceReasonCounts};
   if(!catalog.slots.length)throw Error('E1_REVISION_NO_CERTIFIED_WINDOWS');
   // Model chooses one certified slot. No host default window.
   const userB='Original building brief:\n'+item.brief+
    '\nYour revised spatial architecture:\n'+JSON.stringify(revised)+
    '\nVerified exterior window slots:\n'+JSON.stringify(catalog.slots);
   const choice=await request({stage:'B_CHOICE',model,system:CHOICE_SYSTEM,
    user:userB,slots:catalog.slots,onAttempt:count});
   if(typeof choice?.raw!=='string')throw Error('E1_REVISION_WINDOW_CHOICE_MISSING');
   save(folder,'WINDOW_CHOICE_MODEL_ORIGINAL.txt',choice.raw);
   row.windowChoiceOriginalSha256=sha(choice.raw);
   const window=selectWindow(choice.raw,catalog);
   row.modelWindowSelected=true;
   const final={...revised,glazedOpenings:[window]};
   const finalRaw=JSON.stringify(final,null,2)+'\n';
   save(folder,'MODEL_AUTHORED_EXPLICIT_COMPOSITION.json',finalRaw);
   row.composedPlanSha256=sha(finalRaw);
   const out=await runR190FreeEngine({planFile:path.join(folder,'MODEL_AUTHORED_EXPLICIT_COMPOSITION.json'),
    outDir:path.join(folder,'compiled'),paletteFile});
   row.engineStatus=out.status;
   if(out.status!=='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED'){
    row.reason=out.reason??'E1_REVISION_SOURCE_HOLD';
    row.validationIssues=out.validationIssues??[];
   }else{
    const modelDir=path.join(folder,'compiled','model');
    const scene=JSON.parse(fs.readFileSync(path.join(modelDir,'B143_SCENE.json'),'utf8'));
    row.occupancySha256=originalSceneOccupancySha(scene);
    row.massingSignature=r190E1MassingSignature(final);
    row.sourceSha256=out.sourceSha256;row.geometrySha256=out.geometrySha256;
    row.status='SOURCE_READY_ART_HOLD';row.sourceCompiled=true;
    row.viewer=path.join(modelDir,'index.html');
   }
  }catch(e){
   row.reason=reason(e);
   if(/MODEL_NOT_LISTED|PREVIOUS_MODEL_UNAVAILABLE/.test(row.reason))modelUnavailable=true;
   if(row.revisionOriginalSha256&&!row.composedPlanSha256){
    try{row.validationIssues=diagnoseR190E1Plan(JSON.parse(
     fs.readFileSync(path.join(folder,'REVISION_MODEL_ORIGINAL.txt'),'utf8')));}
    catch{row.validationIssues=[];}
   }
  }
  fs.writeFileSync(path.join(directory,'E1_REVISION_PROGRESS.json'),
   JSON.stringify({rows,worldWrites:0},null,2)+'\n');
 }
 const ready=rows.filter(x=>x.sourceCompiled);
 const summary={schema:'r190-e1-explicit-revision-v1',
  provenance:synthetic?'TEST_DOUBLE_ONLY':'REAL_LOCAL_MODEL_ATTEMPTS',
  sourceRun:source,model,uses:3,
  realModelRequests:synthetic?0:rows.reduce((s,r)=>s+r.modelRequests,0),
  syntheticStageCalls:synthetic?rows.reduce((s,r)=>s+r.syntheticStageCalls,0):0,
  sourceCompiledCount:ready.length,
  distinctMassingSignatureCount:new Set(ready.map(r=>r.massingSignature)).size,
  status:synthetic?'TEST_DOUBLE_ONLY':ready.length===3?'THREE_SOURCE_READY_ART_HOLD':'SOURCE_INCOMPLETE_HOLD',
  constructionApproved:false,humanArt:'NOT_REVIEWED',actualMinecraftBuild:'NOT_ATTEMPTED',
  actualMinecraftWalking:'NOT_TESTED',worldWrites:0,worldContacts:0,
  noSilentRepair:true,automaticRetries:0,rows};
 save(directory,'E1_REVISION_REPORT.json',summary);
 console.log('E1 explicit revision saved: '+path.join(directory,'E1_REVISION_REPORT.json'));
 console.log('E1 status: '+summary.status+'; source: '+ready.length+'/3; real model requests: '+summary.realModelRequests);
 return {dir:directory,...summary};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const opt=process.argv.slice(2);
 const args=opt.length===0?{}:opt.length===1?{savedRunDir:opt[0]}:null;
 if(!args){console.error('Usage: node scripts/r190-e1-revise-saved.mjs [previous E1-two-stage-folder]');process.exitCode=2;}
 else runR190E1ReviseSaved(args).then(r=>{
  const opened=openE1ResultFolder(path.join(r.dir,'E1_REVISION_REPORT.json'));
  if(opened.attempted)console.log('E1 result folder opening: '+opened.folder);
  if(r.status!=='THREE_SOURCE_READY_ART_HOLD')process.exitCode=2;
 }).catch(e=>{console.error(reason(e));process.exitCode=2;});
}
