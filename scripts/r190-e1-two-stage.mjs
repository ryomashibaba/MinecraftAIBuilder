/**
 * E1 2-stage local Qwen research: architect authors a semantic massing plan,
 * authentic geometry determines source-audited exterior window choices,
 * architect explicitly selects ONE slot. No silent correction, extra model
 * retry, Minecraft commands, or automatically approved construction.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {R190_SCHEMA,validateR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {r190E1WindowSlotCandidates,diagnoseR190E1Plan} from './r190-e1-diagnose.mjs';
import {runR190FreeEngine,R190_E1_STUDY_BRIEFS,r190E1MassingSignature} from './r125-r190-free-engine.mjs';
import {openE1ResultFolder} from './r190-e1-open-result-folder.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUTPUT_ROOT=path.join(path.dirname(ROOT),'MinecraftAIBuilder-E1-Outputs');
const DEFAULT_PALETTE=path.join(ROOT,'configs','r125-education-verified-palette-v26.33.json');
const ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const write=(base,name,value)=>fs.writeFileSync(path.join(base,name),
 typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const errorString=e=>String(e?.message??e).slice(0,600);
const modelName=/^[A-Za-z0-9._:/-]{2,140}$/;
const STAGE_A_SYSTEM=[
 'You are an architect. Return ONE JSON object of original functional 3D spatial massing.',
 'This is phase 1 of a TWO-PHASE architecture task. NO glazedOpenings key in this phase.',
 'Required keys EXACTLY: schema,id,title,brief,site,entrySpaceId,spaces,materials.',
 'schema='+R190_SCHEMA+'. All IDs lowercase kebab-case: ^[a-z][a-z0-9-]{2,39}$. NEVER use underscores.',
 'site={width,depth,height}: width/depth 36..52, height 12..18, volume <=40000.',
 'spaces: 2..4 model-designed different functional rooms, in an authored connected tree.',
 'Each space EXACT keys id,purpose,width,depth,height,parentId,side,privacy.',
 'Every room width AND depth are each integer 7..22, height integer 7..site.height-2.',
 'First room id equals entrySpaceId and has parentId=null,side=null.',
 'Other rooms parentId=an earlier room id and side=north/south/east/west. No child on entranceFace (default south).',
 'Purpose Japanese labels may be 2 chars such as 居間, 受付 or 物置; titles and briefs must be meaningful.',
 'privacy=public/shared/private. materials EXACTLY floor,wall,roof all stone or wood.',
 'Optional entranceFace=north/south/east/west. Optional roofFormIntents: 1..2 DIFFERENT rooms with profile ridge/shed, axis x/z, rise 2..3.',
 'Roof section requires room.height+rise < site.height; cannot coexist with formIntent on the same room.',
 'Optional formIntent {spaceId,face,cornerInset:2..3} on an enclosed non-roof room. Do not add unrecognized keys.',
 'The AI (not a template or postprocessor) must choose distinctive, useful rooms and real massing.',
 'NO glazedOpenings yet. An exact layout and exterior window catalog is computed after this response.',
 'Before responding check all ID references, space constraints, site dimensions, roof clearance, and form conflicts.',
 'Return ONLY one complete JSON object; no markdown, no scripts, no Minecraft commands.'
].join('\n');
const STAGE_B_SYSTEM=[
 'You are the same building architect, finishing the window design on YOUR stage-1 massing.',
 'Choose EXACTLY ONE valid window slot from the supplied certified exterior-window catalog.',
 'Each candidate corresponds to an already SOURCE-audited B143 opening on the same plan.',
 'Respond exactly {"selectedWindowSlotIds":["win-NNNN"]} using one id present in the catalog.',
 'You must select the slot, not edit room positions/geometry/IDs or propose an unlisted offset.',
 'Prefer a window that benefits the building function and exterior composition. No templates.',
 'If no suitable certified slot is listed, return {"selectedWindowSlotIds":[]} to HOLD.',
 'No extra keys. No model explanation. No Minecraft commands.'
].join('\n');

export async function requestLocalModel({model,system,user,onAttempt,maxTokens=2800,timeoutMs=180000}){
 if(!Number.isSafeInteger(maxTokens)||maxTokens<400||maxTokens>8000||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<10000||timeoutMs>600000)
  throw Error('E1_TWO_STAGE_REQUEST_LIMITS');
 const ready=await preflightR125Ollama({model,endpoint:ENDPOINT,fetcher:fetch});
 if(ready.status!=='LOCAL_MODEL_LISTED')throw Error('E1_TWO_STAGE_LOCAL_MODEL_NOT_LISTED');
 const body={model,stream:false,temperature:0.45,reasoning_effort:'none',
  max_tokens:maxTokens,response_format:{type:'json_object'},
  messages:[{role:'system',content:system},{role:'user',content:user}]};
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),timeoutMs);
 let response;
 try{
  onAttempt();
  response=await fetch(ENDPOINT,{method:'POST',redirect:'error',
   headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify(body)});
 }finally{clearTimeout(timeout);}
 if(!response.ok)throw Error('E1_TWO_STAGE_MODEL_HTTP_'+response.status);
 const text=await response.text();
 if(text.length>250000)throw Error('E1_TWO_STAGE_HTTP_SIZE');
 const json=JSON.parse(text);
 if(json.choices?.length!==1||json.choices[0]?.finish_reason==='length')
  throw Error('E1_TWO_STAGE_TRUNCATED');
 const raw=json.choices[0]?.message?.content;
 if(typeof raw!=='string'||raw.length<20||raw.length>30000)
  throw Error('E1_TWO_STAGE_MODEL_ORIGINAL_MISSING');
 return {raw,requestBody:body};
}
export function parseStageA(raw){
 const plan=JSON.parse(raw);
 if(!plan||typeof plan!=='object'||Array.isArray(plan)||
  Object.hasOwn(plan,'glazedOpenings'))
  throw Error('E1_TWO_STAGE_STAGE_A_MUST_OMIT_WINDOWS');
 validateR190SemanticPlan(plan);
 return plan;
}
export function selectWindow(raw,catalog){
 const answer=JSON.parse(raw);
 if(!answer||typeof answer!=='object'||Array.isArray(answer)||
  Object.keys(answer).length!==1||
  !Array.isArray(answer.selectedWindowSlotIds)||
  answer.selectedWindowSlotIds.length!==1||
  typeof answer.selectedWindowSlotIds[0]!=='string')
  throw Error('E1_TWO_STAGE_WINDOW_SELECTION_FORMAT');
 const slot=catalog.slots.find(s=>s.slotId===answer.selectedWindowSlotIds[0]);
 if(!slot)throw Error('E1_TWO_STAGE_WINDOW_NOT_CERTIFIED');
 return {spaceId:slot.spaceId,face:slot.face,offset:slot.offset,
  baseY:slot.baseY,width:slot.width,height:slot.height};
}
export function originalSceneOccupancySha(scene){
 const cells=scene?.primitives;
 if(!Array.isArray(cells)||cells.length<1||cells.length>160000)
  throw Error('E1_TWO_STAGE_SCENE_INVALID');
 const min=[Infinity,Infinity,Infinity];
 for(const cell of cells)for(let k=0;k<3;k++)
  min[k]=Math.min(min[k],cell[k]);
 return sha(cells.map(c=>[c[0]-min[0],c[1]-min[1],c[2]-min[2]].join(','))
  .sort().join('|'));
}

export async function runR190E1TwoStageStudy({
 model='qwen3:14b',outRoot=OUTPUT_ROOT,paletteFile=DEFAULT_PALETTE,
 maxWindowSlots=36
}={}, {request=requestLocalModel}={}){
 if(!modelName.test(model)||typeof request!=='function'||
  !Number.isSafeInteger(maxWindowSlots)||maxWindowSlots<1||maxWindowSlots>120)
  throw Error('E1_TWO_STAGE_BAD_CONFIGURATION');
 fs.mkdirSync(outRoot,{recursive:true});
 const dir=fs.mkdtempSync(path.join(path.resolve(outRoot),'E1-two-stage-'));
 const synthetic=request!==requestLocalModel,rows=[];
 write(dir,'E1_TWO_STAGE_INTENT.json',{
  schema:'r190-e1-two-stage-study-intent-v1',model,
  requests:R190_E1_STUDY_BRIEFS,stageASystem:STAGE_A_SYSTEM,
  stageBSystem:STAGE_B_SYSTEM,
  provenance:synthetic?'TEST_DOUBLE_ONLY':'REAL_LOCAL_MODEL_REQUESTS',
  constructionApproved:false,worldWrites:0});
 let modelUnavailable=false;
 for(const item of R190_E1_STUDY_BRIEFS){
  const target=path.join(dir,item.id);
  fs.mkdirSync(target);
  const row={id:item.id,status:'HOLD',reason:null,sourceCompiled:false,
   modelRequests:0,syntheticStageCalls:0,worldWrites:0,
   stageAOriginalSha256:null,stageBOriginalSha256:null,
   compiledPlanSha256:null,sourceSha256:null,geometrySha256:null,
   occupancySha256:null,modelSelectionAuthored:false,
   humanArt:'NOT_REVIEWED',actualMinecraftBuild:'NOT_ATTEMPTED'};
  rows.push(row);
  try{
   if(modelUnavailable)throw Error('E1_TWO_STAGE_PREVIOUS_LOCAL_MODEL_UNAVAILABLE');
   const calls=()=>{if(synthetic)row.syntheticStageCalls++;else row.modelRequests++;};
   // Stage A: independent architect-designed connected massing; not a host template.
   const first=await request({stage:'A',model,system:STAGE_A_SYSTEM,
    user:item.brief,onAttempt:calls});
   if(typeof first?.raw!=='string')throw Error('E1_TWO_STAGE_STAGE_A_ORIGINAL_MISSING');
   write(target,'STAGE_A_ORIGINAL.txt',first.raw);
   row.stageAOriginalSha256=sha(first.raw);
   const plan=parseStageA(first.raw);
   write(target,'STAGE_A_VALIDATED_PLAN.json',plan);
   const catalog=r190E1WindowSlotCandidates(plan,{maxSlots:maxWindowSlots,verifySource:true});
   write(target,'WINDOW_CATALOG.json',catalog);
   row.certifiedWindowSlots=catalog.slots.length;
   row.sourcePreflight=catalog.sourcePreflight;
   if(catalog.sourcePreflight?.status==='HOLD')
    throw Error('E1_TWO_STAGE_BASE_GEOMETRY_HOLD_'+catalog.sourcePreflight.reason);
   if(!catalog.slots.length)throw Error('E1_TWO_STAGE_NO_CERTIFIED_WINDOWS');
   // Stage B is new, explicit model authorship of exactly one certified window.
   const userB=item.brief+'\nOwn semantic plan:\n'+JSON.stringify(plan)+
    '\nSOURCE-certified exterior window slots:\n'+JSON.stringify(catalog.slots);
   const second=await request({stage:'B',model,system:STAGE_B_SYSTEM,
    user:userB,slots:catalog.slots,onAttempt:calls});
   if(typeof second?.raw!=='string')throw Error('E1_TWO_STAGE_STAGE_B_ORIGINAL_MISSING');
   write(target,'STAGE_B_ORIGINAL.txt',second.raw);
   row.stageBOriginalSha256=sha(second.raw);
   const window=selectWindow(second.raw,catalog);
   row.modelSelectionAuthored=true;
   // Transparent composition, NEVER editing either captured model original.
   const finalPlan={...plan,glazedOpenings:[window]};
   const raw=JSON.stringify(finalPlan,null,2)+'\n';
   write(target,'EXPLICITLY_COMPOSED_PLAN.json',raw);
   row.compiledPlanSha256=sha(raw);
   const built=await runR190FreeEngine({
    planFile:path.join(target,'EXPLICITLY_COMPOSED_PLAN.json'),
    outDir:path.join(target,'compiled'),paletteFile
   });
   row.engineStatus=built.status;
   if(built.status!=='SOURCE_AND_MAKECODE_READY_HUMAN_REVIEW_REQUIRED'){
    row.reason=built.reason??'SOURCE_HOLD';
    row.validationIssues=built.validationIssues??[];
   }else{
    const modelDir=path.join(target,'compiled','model');
    const scene=JSON.parse(fs.readFileSync(path.join(modelDir,'B143_SCENE.json'),'utf8'));
    row.sourceCompiled=true;
    row.status='SOURCE_READY_ART_HOLD';
    row.sourceSha256=built.sourceSha256;
    row.geometrySha256=built.geometrySha256;
    row.occupancySha256=originalSceneOccupancySha(scene);
    row.massingSignature=r190E1MassingSignature(finalPlan);
    row.roomCount=finalPlan.spaces.length;
    row.roofSections=finalPlan.roofFormIntents??(
     finalPlan.roofFormIntent?[finalPlan.roofFormIntent]:[]);
    row.viewer=path.join(modelDir,'index.html');
   }
  }catch(e){
   row.reason=errorString(e);
   if(/LOCAL_MODEL_NOT_LISTED|PREVIOUS_LOCAL_MODEL_UNAVAILABLE/.test(row.reason))
    modelUnavailable=true;
   // If stage A returned a parsable but invalid plan, preserve field diagnosis.
   if(row.stageAOriginalSha256&&!row.compiledPlanSha256){
    try{
     const original=JSON.parse(fs.readFileSync(path.join(target,'STAGE_A_ORIGINAL.txt'),'utf8'));
     row.validationIssues=diagnoseR190E1Plan(original);
    }catch{row.validationIssues=[];}
   }
  }
  fs.writeFileSync(path.join(dir,'E1_TWO_STAGE_PROGRESS.json'),
   JSON.stringify({rows,worldWrites:0},null,2)+'\n');
 }
 const ready=rows.filter(x=>x.sourceCompiled);
 const summary={schema:'r190-e1-two-stage-comparison-v1',
  provenance:synthetic?'TEST_DOUBLE_ONLY':'REAL_LOCAL_MODEL_ATTEMPTS',
  model,requestedUses:3,realModelRequests:synthetic?0:rows.reduce((a,x)=>a+x.modelRequests,0),
  syntheticStageCalls:synthetic?rows.reduce((a,x)=>a+x.syntheticStageCalls,0):0,
  sourceCompiledCount:ready.length,
  distinctMassingSignatureCount:new Set(ready.map(x=>x.massingSignature)).size,
  status:synthetic?'TEST_DOUBLE_ONLY':ready.length===3?
   'THREE_SOURCE_READY_ART_HOLD':'SOURCE_INCOMPLETE_HOLD',
  worldWrites:0,worldContacts:0,constructionApproved:false,
  actualMinecraftBuild:'NOT_ATTEMPTED',humanArt:'NOT_REVIEWED',
  workflow:'A_MODEL_MASSING__CERTIFIED_WINDOW_CATALOG__B_MODEL_CHOICE__STRICT_B143',
  noSilentRepair:true,rows};
 write(dir,'E1_TWO_STAGE_REPORT.json',summary);
 write(dir,'E1_REVIEW.md','# E1 two-stage review\n\n'+
  '2 model stages per candidate building, with original SHA evidence. No world operations.\n\n'+
  rows.map(r=>'- '+r.id+': '+r.status+'; source='+r.sourceCompiled+
   '; reason='+r.reason+'; viewer='+String(r.viewer??'none')).join('\n')+
  '\n\nEvery successful SOURCE still requires human architecture and real-world evaluation.\n');
 console.log('E1 two-stage saved: '+path.join(dir,'E1_TWO_STAGE_REPORT.json'));
 console.log('E1 status: '+summary.status+'; source: '+ready.length+'/3; real model requests: '+summary.realModelRequests);
 return {dir,...summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190E1TwoStageStudy().then(s=>{
  const opened=openE1ResultFolder(path.join(s.dir,'E1_TWO_STAGE_REPORT.json'));
  if(opened.attempted)console.log('E1 result folder opening: '+opened.folder);
  if(s.status!=='THREE_SOURCE_READY_ART_HOLD')process.exitCode=2;
 }).catch(e=>{console.error(errorString(e));process.exitCode=2;});
}
