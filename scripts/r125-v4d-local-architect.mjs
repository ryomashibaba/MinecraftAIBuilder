/**
 * Opt-in ONE local Ollama model request to author a compact relative V4D
 * architecture. Never runs on CI as a real model, never uploads raw text,
 * and never contacts/changes Minecraft worlds. Test injections are always
 * stamped HOLD_TEST_DOUBLE, even when their B143 geometry compiles.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {RELATIVE_SCHEMA,compileRelativeAuthorIntent}
 from '../source/ai/r125-v4d-relative-author-ir.mjs';
import {COMPACT_SCHEMA,COMPACT_SYSTEM_PROMPT,compileCompactModelIntent}
 from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {buildV4DShareableReceipt} from './r125-v4d-shareable-receipt.mjs';
import {RANKED_SCHEMA,RANKED_SYSTEM_PROMPT,compileRankedExteriorIntent} from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const fail=s=>{throw Error('R125_V4D_LOCAL_AUTHOR_'+s);};
const sha=s=>createHash('sha256').update(s).digest('hex');
const output=(dir,name,payload)=>fs.writeFileSync(path.join(dir,name),
 typeof payload==='string'?payload:JSON.stringify(payload,null,2)+'\n',{flag:'wx'});
const DEFAULT_PROMPT='小規模な公共交流施設を独創的に設計する。来訪者とスタッフの機能関係が明確で、公開庭と半屋外の滞留場所を持ち、入口と用途室を安全な動線でつなぐ建築を考える。';
const DEFAULT_ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';

export const V4D_RELATIVE_SYSTEM_PROMPT=[
 'Act as the ORIGINAL architect of a complete useful Minecraft Education building, not a JSON reformatter.',
 'Return exactly ONE syntactically valid JSON object, without markdown/code/prose outside JSON.',
 'Choose the whole architecture yourself from USER brief. No standard residential/retail templates or generic labels.',
 'Top-level EXACT keys: schema,id,title,brief,materials,spaces,entry,extraLinks.',
 'schema exactly '+RELATIVE_SCHEMA+'. id and space ids: lowercase letter/digit/hyphen slugs 3..35, starts with letter.',
 'title/brief/purpose strings 3..150 characters and genuinely describe diverse functions.',
 'materials EXACT keys: floor (wood|stone|concrete), wall (stone|wood|concrete|metal), roof (stone|wood|concrete|metal), public (stone|concrete|accent).',
 'spaces ARRAY 3..5 independent room/public-volume design decisions, parent-before-child; first is the enclosed NORTH-entry reception, at least 2 covered and 1 sky.',
 'Every space EXACT keys: id,purpose,kind,width,depth,roof,facade,shelter,windows,fixture; nonfirst spaces additionally require attach.',
 'width,depth integers 18..30; kind covered|sky. Host uses relative placement; DO NOT output absolute x/z/world coordinates.',
 'For covered: roof EXACT {axis:x|z,type:shed|ridge,eaveY:10..15,peakY:eaveY+3..23,peakPercent:35..65}, facade wall|glass, shelter:null; windows ARRAY 0..2.',
 'For sky: roof:null,facade:null, windows:[], shelter EXACT {edge:north|south|east|west,depth:3..5,roofY:7..10,material:metal|wood|stone|concrete|accent}. Shelter edge MUST be shared with one authored linked covered space.',
 'Every window EXACT {side:north|south|east|west,offset:2..24,span:5..10,sillY:4..6,height:2..4}; choose an EXTERIOR side, never a side shared with another space. Stay 2 cells inside wall corners.',
 'Every fixture EXACT {id,purpose,offsetX,offsetZ,width,depth,height,material}; offsets measured from that space near its interior, usually 6..12; width/depth 2..5, height 1..3, material stone|wood|concrete|metal|accent.',
 'For nonfirst space, attach EXACT {to:<PRECEDING space id>,side:east|west|north|south,shift:integer -4..4,doorOffset:integer 2..14}. Side is the direction FROM parent TO child.',
 'HOST keeps a one-voxel shared wall and opens an actual FOUR-wide door at the AUTHOR doorOffset. Thus neighboring rooms must have at least 7 shared cells.',
 'extraLinks ARRAY 0..2 of EXACT {from,to,side,offset} for physically aligned additional closed-loop doorways. No unplanned boundary contacts, overlapping room interiors or disconnected spaces.',
 'entry EXACT {offset:4..12,plazaWidth:12..18,plazaDepth:8..13,canopyDepth:3..6}. The four-wide public NORTH entrance must not collide with any north window.',
 'Design a truly functional circulation pattern and meaningful equipment. Never invent Minecraft execution permission, completed construction, art approval or external services.',
 'The HOST NEVER corrects your decisions: unknown fields, wrong adjacency, blocked windows, incompatible roofs or routes are a SOURCE HOLD with no retry.'
].join('\n');

const blank=()=>({
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0
});
export function parseV4DLocalAuthorArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const opt={},allowed=new Set(['--model','--out','--prompt','--endpoint']);
 for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(k==='--compact'||k==='--ranked-windows'){
   if(Object.hasOwn(opt,k))fail(k==='--compact'?'DUPLICATE_COMPACT':'DUPLICATE_RANKED_WINDOWS');
   opt[k]=true;continue;
  }
  const v=argv[++i];
  if(!allowed.has(k)||Object.hasOwn(opt,k)||typeof v!=='string'||
   !v.trim()||v.startsWith('--'))fail('ARGUMENT_'+k);
  opt[k]=v;
 }
 if(!MODEL.test(opt['--model']??'')||
  typeof opt['--out']!=='string'||opt['--out'].length<2)
  fail('MODEL_AND_PRIVATE_OUT_REQUIRED');
 if(opt['--compact']&&opt['--ranked-windows'])fail('ONLY_ONE_AUTHOR_MODE');
 const endpoint=opt['--endpoint']??DEFAULT_ENDPOINT,port=ENDPOINT.exec(endpoint);
 if(!port||+port[1]<1||+port[1]>65535)fail('LOCAL_LOOPBACK_ONLY');
 const prompt=opt['--prompt']??DEFAULT_PROMPT;
 if(prompt.length<8||prompt.length>4000)fail('PROMPT_CONTRACT');
 return {model:opt['--model'],outDir:path.resolve(opt['--out']),prompt,endpoint,compact:opt['--compact']===true,rankedWindows:opt['--ranked-windows']===true};
}
function validateLaunch({model,outDir,prompt,endpoint},fetcher,timeoutMs){
 if(!MODEL.test(model??'')||typeof outDir!=='string'||!outDir.trim()||
  typeof prompt!=='string'||prompt.length<8||prompt.length>4000||
  typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||
  timeoutMs<1000||timeoutMs>300000)fail('LAUNCH');
 const m=ENDPOINT.exec(endpoint);
 if(!m||+m[1]<1||+m[1]>65535)fail('LOCAL_LOOPBACK_ONLY');
 const dest=path.resolve(outDir);
 const parent=path.dirname(dest);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
  fs.existsSync(dest))fail('PRIVATE_OUTPUT_MUST_BE_NEW_DIR');
 const physicalParent=fs.realpathSync(parent);
 if(dest===ROOT||dest.startsWith(ROOT+path.sep)||
  physicalParent===ROOT||physicalParent.startsWith(ROOT+path.sep))
  fail('PRIVATE_OUTPUT_OUTSIDE_REPOSITORY_ONLY');
 return dest;
}
export async function runV4DLocalAuthor({
 model,outDir,prompt=DEFAULT_PROMPT,endpoint=DEFAULT_ENDPOINT,compact=false,rankedWindows=false
}={}, {fetcher=fetch,timeoutMs=180000}={}){
 if(typeof compact!=='boolean'||typeof rankedWindows!=='boolean'||
  (compact&&rankedWindows))fail('AUTHOR_MODE');
 const dir=validateLaunch({model,outDir,prompt,endpoint},fetcher,timeoutMs);
 const injected=fetcher!==fetch||process.env.MAB_V4D_TEST_DOUBLE_MODE==='1',start=Date.now();
 fs.mkdirSync(dir,{recursive:false});
 const report={
  schema:'minecraftaibuilder-r125-v4d-local-model-author-attempt-v1',
  status:'HOLD_NOT_STARTED',reason:null,modelId:model,
  declaredProvider:'LOCAL_OLLAMA_127_0_0_1_NOT_AUTHENTICATED',
  testInjectionPresent:injected,modelNameCryptographicallyAttested:false,
  promptSha256:sha(prompt),responseRawSha256:null,
  authorContract:rankedWindows?RANKED_SCHEMA:compact?COMPACT_SCHEMA:RELATIVE_SCHEMA,
  mechanizedExpandedIRSha256:null,
  rawCaptured:false,modelCalls:0,modelFinishReason:null,
  authoredIRSha256:null,translatedGraphSha256:null,
  sourceSha256:null,geometrySha256:null,
  actualB143VoxelCount:null,sourceRoutesStatus:'NOT_TESTED',
  humanART:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  mac8GBTwoB:'NOT_TESTED',...blank()
 };
 output(dir,'LOCAL_REQUEST.json',{
  model,endpoint,prompt,timeoutMs,maxOutputTokens:3072,
  authorContract:rankedWindows?RANKED_SCHEMA:compact?COMPACT_SCHEMA:RELATIVE_SCHEMA,
  nModelGenerationAttemptsAllowed:1,sourceOnly:true,
  noPaidAPI:true,noWorldAccess:true
 });
 try{
  const preflight=await preflightR125Ollama({model,endpoint,fetcher});
  report.preflightModelListed=preflight.status==='LOCAL_MODEL_LISTED';
  if(!report.preflightModelListed){
   report.status='HOLD_MODEL_NOT_INSTALLED';return report;
  }
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  let parsed;
  try{
   report.modelCalls=1;
   const response=await fetcher(endpoint,{
    method:'POST',redirect:'error',signal:ctrl.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({
     model,stream:false,temperature:0.45,reasoning_effort:'none',
     max_tokens:3072,response_format:{type:'json_object'},
     messages:[
      {role:'system',content:rankedWindows?RANKED_SYSTEM_PROMPT:compact?COMPACT_SYSTEM_PROMPT:V4D_RELATIVE_SYSTEM_PROMPT},
      {role:'user',content:prompt}
     ]
    })
   });
   if(response?.ok!==true)fail('MODEL_HTTP_'+(response?.status??'UNAVAILABLE'));
   const body=await response.text();
   if(typeof body!=='string'||body.length>250000)fail('HTTP_BODY_TOO_BIG');
   let responseJson;
   try{responseJson=JSON.parse(body);}catch{fail('MODEL_HTTP_INVALID_JSON');}
   if(responseJson?.model!==undefined&&responseJson.model!==model)
    fail('SERVER_MODEL_NAME_CHANGED');
   if(!Array.isArray(responseJson?.choices)||responseJson.choices.length!==1)
    fail('MODEL_CHOICES_NOT_EXACTLY_ONE');
   const choice=responseJson.choices[0],raw=choice?.message?.content;
   report.modelFinishReason=choice?.finish_reason??null;
   // Save exact raw, including incomplete/truncated responses, before any
   // parse/semantic/B143 validation. Never publish this directory to GitHub.
   if(typeof raw==='string'&&raw.length>0&&raw.length<=250000){
    output(dir,'MODEL_RESPONSE_ORIGINAL.txt',raw);
    report.responseRawSha256=sha(raw);
    report.rawCaptured=true;
   }
   if(choice?.finish_reason==='length')fail('MODEL_TRUNCATED_NO_AUTO_RETRY');
   if(choice?.finish_reason!=='stop')
    fail('MODEL_FINISH_NOT_STOP');
   if(typeof raw!=='string'||raw.length<30||raw.length>30000)
    fail('MODEL_ORIGINAL_MISSING_OR_OVERSIZE');
   try{parsed=JSON.parse(raw);}catch{fail('MODEL_RESPONSE_NOT_PURE_JSON');}
  }finally{clearTimeout(timer);}
  const result=rankedWindows?compileRankedExteriorIntent(parsed):
   compact?compileCompactModelIntent(parsed):compileRelativeAuthorIntent(parsed);
  // Only the true model/test RESPONSE is compiled. Never substitute a fixture
  // or silently edit a failing model plan into a successful candidate.
  const gal=compileB143Gallery([result.b143.design]);
  const tpl=fs.readFileSync(
   path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  const html=renderB143Html(gal,tpl);
  output(dir,'AUTHOR_INTENT_ORIGINAL.json',parsed);
  if(compact||rankedWindows){
   output(dir,'MECHANICALLY_EXPANDED_AUTHOR_IR.json',result.expandedMechanicalIR);
   if(compact)output(dir,'GENERIC_MECHANICAL_NORMALIZATION.json',result.normalization);
   if(rankedWindows)output(dir,'RANKED_GLAZING_RESOLUTION.json',{
    schema:RANKED_SCHEMA,windowFaces:result.chosenWindowFaces,
    autoRepairPerformed:false,authorSelectedPriorities:true,worldWrites:0
   });
  }
  output(dir,'TRANSLATED_AUTHOR_GRAPH.json',result.plan);
  output(dir,'TRANSLATED_AUTHOR_ENVELOPE.json',result.envelope);
  output(dir,'TRUE_B143_SOURCE.json',result.b143.design);
  output(dir,'TWO_WIDE_ROUTES_SOURCE.json',result.b143.sourceRoutes);
  output(dir,'index.html',html);
  report.authoredIRSha256=rankedWindows?result.rankedAuthorSha256:
   compact?result.compactAuthorSha256:result.originalIntentSha256;
  report.mechanizedExpandedIRSha256=(compact||rankedWindows)?result.originalIntentSha256:null;
  report.translatedGraphSha256=sha(JSON.stringify(result.plan));
  report.sourceSha256=result.b143.sourceSha256;
  report.geometrySha256=result.b143.geometrySha256;
  report.actualB143VoxelCount=result.b143.compiled.primitives.length;
  report.sourceRoutesStatus=result.b143.sourceRoutes.status;
  report.sourceProof=result.b143.sourceProof;
  report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
   'SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED';
  return report;
 }catch(e){
  report.reason=String(e?.message??e).slice(0,500);
  report.status=/(AbortError|aborted)/i.test(report.reason)?
   'HOLD_MODEL_TIMEOUT_OR_ABORTED':
   !report.preflightModelListed?'HOLD_LOCAL_PREFLIGHT':
   'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR';
  return report;
 }finally{
  report.elapsedMs=Date.now()-start;
  output(dir,'V4D_LOCAL_AUTHOR_REPORT.json',report);
  output(dir,'REVIEW_SUMMARY_SHAREABLE.json',buildV4DShareableReceipt(report));
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseV4DLocalAuthorArgs(process.argv.slice(2));
  if(opts.help)console.log(
   'node scripts/r125-v4d-local-architect.mjs --model qwen3:14b --out NEW_PRIVATE_FOLDER [--compact|--ranked-windows] [--prompt "日本語の独自建築依頼"] [--endpoint http://127.0.0.1:11434/v1/chat/completions] (ONE LOCAL MODEL REQUEST; NO Minecraft writes)'
  );else{
   const result=await runV4DLocalAuthor(opts);
   console.log(JSON.stringify({status:result.status,reason:result.reason,
    modelCalls:result.modelCalls,realModelAuthenticated:false,
    sourceHash:result.sourceSha256,geometryHash:result.geometrySha256,
    sourceRoutes:result.sourceRoutesStatus,rawCaptured:result.rawCaptured,
    resultFolder:opts.outDir,worldWrites:0}));
   if(result.status!=='SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED')
    process.exitCode=2;
  }
 }catch(e){console.error('R125_V4D_LOCAL_AUTHOR_HOLD',String(e?.message??e));process.exitCode=2;}
}
