/**
 * R134 genuinely NEW compact program from one local 2B-class model response.
 * Not a derivative of the frozen Qwen fixture; no genre template routing.
 * Source-only review, no Minecraft writes, no paid or remote API.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileR134MultiZonePlan,SCHEMA}
 from '../source/ai/r134-multi-zone-plan.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=s=>{throw Error('R134_MODEL_'+s);};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const range=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const text=s=>typeof s==='string'&&s.length>=12&&s.length<=800&&
 !/[\u0000-\u001f<>]/.test(s);
const write=(dir,name,v)=>fs.writeFileSync(path.join(dir,name),
 typeof v==='string'?v:JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const SYSTEM=[
 'You are an architect. Independently invent a small NEW multi-room building.',
 'Return ONLY JSON with EXACT keys: id,title,footprint,materials,layout,form.',
 'id and every space id: lowercase slug with letters, numbers or hyphens.',
 'title: readable building name with at least 3 characters.',
 'footprint EXACT width and depth, whole numbers between 18 and site limits.',
 'materials EXACT floor,wall,roof. floor wood/stone/concrete.',
 'wall and roof wood/stone/concrete/metal.',
 'layout EXACT axis and spaces. axis x=west-east, z=entrance-front-to-rear.',
 'spaces must have 3 or 4 distinct rooms; each EXACT id,purpose,weight.',
 'Every purpose is a meaningful description of 3-180 characters.',
 'weight is relative allocation weight 1 to 4; no voxel coordinates.',
 'For 4 zones on the layout axis, footprint along that axis MUST be >=23.',
 'For 3 zones on the layout axis, footprint along that axis MUST be >=18.',
 'form EXACT roofProfile and facadeLanguage.',
 'roofProfile flat/ridge/sawtooth; facadeLanguage plain/fins/screen.',
 'Design spatial relationships, meaningful uses and size priorities yourself.',
 'Avoid hardcoded house, shop, library category templates.',
 'The host builds exact solids, supported floors, doors and continuous paths.',
 'Do not output any code, Minecraft commands, extra keys or approval claims.'
].join('\n');
export function makeR134FreshRequest({brief,siteWidth=32,siteDepth=32}={}){
 if(!text(brief)||!range(siteWidth,18,32)||!range(siteDepth,18,32))
  fail('BRIEF_OR_SITE');
 return {naturalLanguageBrief:brief,site:{maxWidth:siteWidth,maxDepth:siteDepth},
  requiredDistinctFunctionalZones:{minimum:3,maximum:4},
  layoutAxisMeaning:{x:'west-to-east',z:'entrance-front-to-rear'},
  goal:'Make a genuinely original small functional building, not renamed rooms'};
}
export function parseR134FreshModelReply(raw,request){
 if(typeof raw!=='string'||raw.length<20||raw.length>22000)
  fail('RAW_MISSING_OR_OVERSIZE');
 let p;
 try{p=JSON.parse(raw);}catch{fail('RAW_NOT_JSON');}
 if(!exact(p,['id','title','footprint','materials','layout','form']))
  fail('MODEL_FIELDS');
 const plan={schema:SCHEMA,id:p.id,title:p.title,
  brief:request.naturalLanguageBrief,
  footprint:p.footprint,materials:p.materials,layout:p.layout,form:p.form};
 if(!plan.footprint||plan.footprint.width>request.site.maxWidth||
  plan.footprint.depth>request.site.maxDepth)
  fail('FOOTPRINT_EXCEEDS_SITE');
 // Both validation and REAL 3D run through the shared B143 compiler;
 // a plausible JSON string or room label alone cannot pass.
 return compileR134MultiZonePlan(plan);
}
export function parseR134FreshArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const allowed=new Set(['--model','--brief','--out','--site-width',
  '--site-depth','--endpoint']);
 const args={};
 for(let i=0;i<argv.length;i+=2){
  const name=argv[i],value=argv[i+1];
  if(!allowed.has(name)||Object.hasOwn(args,name)||!value||
   value.startsWith('--'))fail('CLI_'+name);
  args[name]=value;
 }
 const endpoint=args['--endpoint']??
  'http://127.0.0.1:11434/v1/chat/completions',port=ENDPOINT.exec(endpoint);
 if(!MODEL.test(args['--model']??'')||!args['--out']||
  !port||!range(Number(port[1]),1,65535))fail('CLI_LOCAL_MODEL_REQUIRED');
 const siteWidth=args['--site-width']?Number(args['--site-width']):32,
  siteDepth=args['--site-depth']?Number(args['--site-depth']):32;
 makeR134FreshRequest({brief:args['--brief'],siteWidth,siteDepth});
 return {model:args['--model'],brief:args['--brief'],
  outDir:path.resolve(args['--out']),siteWidth,siteDepth,endpoint};
}
export async function runR134FreshModel({
 model,brief,outDir,siteWidth=32,siteDepth=32,
 endpoint='http://127.0.0.1:11434/v1/chat/completions'
}={}, {fetcher=fetch,timeoutMs=120000}={}){
 const p=ENDPOINT.exec(endpoint??'');
 if(!MODEL.test(model??'')||!p||!range(Number(p[1]),1,65535)||
  typeof outDir!=='string'||!outDir.trim()||
  typeof fetcher!=='function'||!range(timeoutMs,1000,300000))
  fail('INVALID_MODEL_OR_ENDPOINT');
 const request=makeR134FreshRequest({brief,siteWidth,siteDepth});
 if(fs.existsSync(outDir))fail('OUTPUT_ALREADY_EXISTS');
 const dir=path.resolve(outDir),injected=fetcher!==fetch,start=Date.now();
 fs.mkdirSync(dir,{recursive:false});
 const report={
  schema:'r134-fresh-one-model-to-real-multizone-v1',
  status:'HOLD_NOT_STARTED',model,modelCalls:0,
  testInjectionPresent:injected,
  originalModelResponseCaptured:false,
  modelProvenance:injected?'TEST_DOUBLE':'LOCAL_RESPONSE_NOT_AUTHENTICATED',
  modelAuthoredProgram:false,
  newRealB143Source:false,sourceSha256:null,geometrySha256:null,
  voxels:null,zoneCount:null,sourceRoutes:'NOT_CHECKED',
  inGameWalking:'NOT_TESTED',artReview:'NOT_REVIEWED',
  readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0,
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 write(dir,'MODEL_REQUEST_NO_HIDDEN_GOALS.json',{model,endpoint,
  request,maxTokens:900,protocol:'ONE_LOCAL_RESPONSE_NO_RETRY'});
 try{
  const p=await preflightR125Ollama({model,endpoint,fetcher});
  if(p.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_MODEL_NOT_INSTALLED';return report;
  }
  const controller=new AbortController(),timer=setTimeout(()=>
   controller.abort(),timeoutMs);
  try{
   report.modelCalls=1;
   const response=await fetcher(endpoint,{method:'POST',redirect:'error',
    signal:controller.signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.65,
     max_tokens:900,reasoning_effort:'none',
     response_format:{type:'json_object'},messages:[
      {role:'system',content:SYSTEM},
      {role:'user',content:JSON.stringify(request)}]})});
   if(!response||response.ok!==true)
    fail('MODEL_HTTP_'+String(response?.status??'UNKNOWN'));
   const http=await response.text();
   if(http.length>100000)fail('RESPONSE_OVERSIZE');
   let reply;
   try{reply=JSON.parse(http);}catch{fail('RESPONSE_INVALID_JSON');}
   if(reply?.choices?.length!==1||
    reply.choices[0]?.finish_reason==='length')fail('INCOMPLETE_OUTPUT');
   const raw=reply.choices[0]?.message?.content;
   if(typeof raw!=='string'||raw.length<20||raw.length>22000)
    fail('NO_MODEL_CONTENT');
   write(dir,'MODEL_RAW_ORIGINAL.txt',raw);
   report.originalModelResponseCaptured=true;
   const result=parseR134FreshModelReply(raw,request);
   write(dir,'MODEL_PROGRAM_IR.json',result.plan);
   write(dir,'DERIVED_B143_SOURCE.json',result.design);
   write(dir,'DERIVED_REAL_VOXELS.json',result.compiled);
   write(dir,'SOURCE_ROUTES.json',result.sourceRouteAudit);
   const tpl=fs.readFileSync(path.join(ROOT,
    'source/ai/b143-viewer-template.html'),'utf8');
   write(dir,'index.html',renderB143Html(
    compileB143Gallery([result.design]),tpl));
   report.modelAuthoredProgram=!injected;
   report.newRealB143Source=true;
   report.sourceSha256=result.sourceSha256;
   report.geometrySha256=result.geometrySha256;
   report.voxels=result.compiled.primitives.length;
   report.zoneCount=result.program[0].zones.length;
   report.sourceRoutes=result.sourceRouteAudit.status;
   report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
    'SOURCE_CANDIDATE_REAL_LOCAL_RESPONSE_HUMAN_REVIEW_REQUIRED';
   return report;
  }finally{clearTimeout(timer);}
 }catch(e){
  report.status='HOLD_MODEL_OUTPUT_OR_GEOMETRY';
  report.reason=String(e?.message??e).slice(0,450);
  return report;
 }finally{
  report.elapsedMs=Date.now()-start;
  write(dir,'R134_MODEL_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseR134FreshArgs(process.argv.slice(2));
  if(opts.help)console.log('node scripts/r134-fresh-model-pilot.mjs --model qwen3.5:2b --brief "Invent a compact workshop with four distinct rooms" --out NEW_DIR (local Ollama only, no world writes)');
  else{
   const report=await runR134FreshModel(opts);
   console.log(JSON.stringify({status:report.status,modelCalls:report.modelCalls,
    zoneCount:report.zoneCount,voxels:report.voxels,
    reason:report.reason??null,worldWrites:0}));
   if(report.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
