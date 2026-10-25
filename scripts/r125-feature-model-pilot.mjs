/**
 * R127: local LLM chooses semantic equipment, generic B143 owns geometry.
 * Exactly one bounded inference. No Minecraft I/O or genre-specific templates.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {proposeR125ThresholdRepair} from '../source/ai/r125-entrance-repair.mjs';
import {applyR125FeatureIntent,SCHEMA as FEATURE_SCHEMA} from '../source/ai/r125-functional-layer.mjs';
import {auditR129FunctionalAcceptance} from '../source/ai/r125-functional-acceptance.mjs';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const ROLES=['work-surface','equipment-bank','display-stand','storage-rack','seating'];
const CORNERS=['near-left','near-right','far-left','far-right'];
const reject=c=>{throw Error('R127_FEATURE_'+c);};
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const freezeWorld=()=>({readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0,
 constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const SYSTEM=[
 'You are a category-independent architect of functioning interior spaces.',
 'Return JSON with EXACTLY one key objects, an array of 1 to 8 feature objects.',
 'Each feature object MUST have EXACTLY id,zoneId,role,corner.',
 'id is a unique lowercase hyphenated slug, 3-21 characters starting with letter.',
 'zoneId must be copied exactly from the supplied zones, never invented.',
 'role must be one of: '+ROLES.join(', ')+'.',
 'corner must be one of: '+CORNERS.join(', ')+'.',
 'Choose useful equipment based on activities and relationships, not genre templates.',
 'Design a genuine use of each space; do not merely rename a room.',
 'Never emit voxel coordinates, scripts, Minecraft commands, or prose.',
 'Safe deterministic geometry, clearances and circulation are checked by the host.',
 'Do not claim in-game safety, walking, aesthetic approval or construction.'
].join('\n');
export function makeR127FeatureRequest(base,brief=''){
 if(base?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !Array.isArray(base.program)||typeof brief!=='string'||brief.length>2000)
  reject('INVALID_BASE_OR_BRIEF');
 return {buildingBrief:base.plan.brief,functionalBrief:brief,
  zones:base.program.flatMap(l=>l.zones.map(z=>({
   id:z.id,purpose:z.purpose,level:l.level}))),
  roles:ROLES,corners:CORNERS,maxObjects:8};
}
export function parseR127ModelFeatures(raw,base){
 if(typeof raw!=='string'||raw.length<10||raw.length>15000)
  reject('MISSING_OR_OVERSIZE_RAW');
 let data;
 try{data=JSON.parse(raw);}catch{reject('RAW_NOT_JSON');}
 if(!data||typeof data!=='object'||Array.isArray(data)||
  Object.keys(data).length!==1||!Object.hasOwn(data,'objects')||
  !Array.isArray(data.objects)||data.objects.length<1||
  data.objects.length>8)reject('INVALID_OBJECT_ARRAY');
 // Small models output only intent; trusted host stamps immutable source SHA.
 return {schema:FEATURE_SCHEMA,basePlanSha256:base.planSha256,
  objects:data.objects};
}
export function parseR127Args(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const args={},allowed=new Set(['--model','--plan','--out','--brief','--endpoint','--requirements']);
 for(let i=0;i<argv.length;i++){
  const k=argv[i],v=argv[++i];
  if(!allowed.has(k)||Object.hasOwn(args,k)||!v||v.startsWith('--'))
   reject('CLI_'+k);
  args[k]=v;
 }
 if(!MODEL.test(args['--model']??'')||!args['--plan']||!args['--out'])
  reject('MODEL_PLAN_OUT_REQUIRED');
 const endpoint=args['--endpoint']??'http://127.0.0.1:11434/v1/chat/completions';
 const port=ENDPOINT.exec(endpoint);
 if(!port||Number(port[1])<1||Number(port[1])>65535)
  reject('LOOPBACK_ONLY');
 return {model:args['--model'],plan:JSON.parse(fs.readFileSync(args['--plan'],'utf8')),
  outDir:path.resolve(args['--out']),brief:args['--brief']??'',endpoint,
  ...(args['--requirements']?{independentSpec:JSON.parse(
   fs.readFileSync(args['--requirements'],'utf8'))}:{})};
}
export async function runR127FeatureModel({
 model,plan,outDir,brief='',independentSpec=null,
 endpoint='http://127.0.0.1:11434/v1/chat/completions'
}={}, {fetcher=fetch,timeoutMs=120000}={}){
 const port=ENDPOINT.exec(endpoint??'');
 if(!MODEL.test(model??'')||!port||Number(port[1])<1||
  Number(port[1])>65535||typeof outDir!=='string'||!outDir.trim()||
  typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||
  timeoutMs<1000||timeoutMs>300000)reject('BAD_INPUT');
 if(fs.existsSync(outDir))reject('OUTPUT_ALREADY_EXISTS');
 const original=compileArchitecturePlan(plan);
 const repair=proposeR125ThresholdRepair(original);
 const base=repair.candidate;
 const request=makeR127FeatureRequest(base,brief);
 const start=Date.now(),dir=path.resolve(outDir),injected=fetcher!==fetch;
 fs.mkdirSync(dir,{recursive:false});
 const report={
  schema:'r127-model-feature-to-b143-v1',
  status:'HOLD_NOT_STARTED',model,provider:'DECLARED_LOCAL_OLLAMA_NOT_INDEPENDENTLY_AUTHENTICATED',
  testInjectionPresent:injected,modelCalls:0,originalRawCaptured:false,
  originalPlanSha256:original.planSha256,
  originalSourceSha256:original.sourceSha256,
  originalGeometrySha256:original.geometrySha256,
  originalVoxelCount:original.compiled.primitives.length,
  derivedEntranceRepair:repair.sourceChanged,
  baseSourceSha256:base.sourceSha256,
  derivedSourceSha256:null,featureIntentSha256:null,
  featureCount:0,addedVoxelCount:null,sourceRouteStatus:'NOT_TESTED',
  independentAcceptance:'NOT_EVALUATED_NO_INDEPENDENT_SPEC',
  authorship:'NOT_ESTABLISHED',humanArt:'NOT_REVIEWED',
  minecraftWalking:'NOT_TESTED',world:freezeWorld()};
 write(dir,'FEATURE_REQUEST.json',{model,endpoint,request,timeoutMs,
  outputBudgetTokens:768,protocol:'ONE_LOCAL_GENERATION_NO_RETRY'});
 try{
  const pf=await preflightR125Ollama({model,endpoint,fetcher});
  if(pf.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_MODEL_NOT_INSTALLED';return report;
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   report.modelCalls=1;
   const r=await fetcher(endpoint,{method:'POST',signal:controller.signal,
    redirect:'error',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.4,
     reasoning_effort:'none',max_tokens:768,response_format:{type:'json_object'},
     messages:[{role:'system',content:SYSTEM},
      {role:'user',content:JSON.stringify(request)}]})});
   if(!r||r.ok!==true)reject('MODEL_HTTP_'+String(r?.status??'UNKNOWN'));
   const body=await r.text();
   if(body.length>100000)reject('HTTP_OVERSIZE');
   let json;
   try{json=JSON.parse(body);}catch{reject('HTTP_INVALID_JSON');}
   if(json?.choices?.length!==1||json.choices[0].finish_reason==='length')
    reject('INCOMPLETE_MODEL_OUTPUT');
   const raw=json.choices[0]?.message?.content;
   if(typeof raw!=='string'||raw.length<10||raw.length>15000)
    reject('INVALID_MODEL_CONTENT');
   write(dir,'FEATURE_MODEL_ORIGINAL.txt',raw);
   report.originalRawCaptured=true;
   const intent=parseR127ModelFeatures(raw,base);
   const built=applyR125FeatureIntent({base,intent});
   write(dir,'FEATURE_INTENT.json',intent);
   write(dir,'DERIVED_B143_SOURCE.json',built.design);
   write(dir,'DERIVED_B143_SCENE.json',built.compiled);
   write(dir,'FEATURE_PLACEMENTS.json',built.placements);
   write(dir,'SOURCE_ROUTE_AUDIT.json',built.sourceRouteAudit);
   if(independentSpec!==null){
    const verdict=auditR129FunctionalAcceptance({base,featured:built,spec:independentSpec});
    write(dir,'INDEPENDENT_FUNCTIONAL_ACCEPTANCE.json',verdict);
    report.independentAcceptance=verdict.status;
   }
   const tpl=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
   write(dir,'index.html',renderB143Html(compileB143Gallery([built.design]),tpl));
   report.derivedSourceSha256=built.sourceSha256;
   report.featureIntentSha256=built.featureIntentSha256;
   report.featureCount=built.placements.length;
   report.addedVoxelCount=built.addedVoxelCount;
   report.sourceRouteStatus=built.sourceRouteAudit.status;
   report.authorship=injected?'TEST_DOUBLE_NOT_REAL_MODEL':
    'LOCAL_PROVIDER_RESPONSE_NOT_INDEPENDENTLY_AUTHENTICATED';
   report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
    report.independentAcceptance.startsWith('HOLD_')?
     'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS':
     'FEATURE_SOURCE_CANDIDATE_HUMAN_REVIEW_REQUIRED';
   return report;
  }finally{clearTimeout(timer);}
 }catch(e){
  report.status='HOLD_FEATURE_GENERATION_OR_PLACEMENT';
  report.reason=String(e?.message??e).slice(0,450);
  return report;
 }finally{
  report.elapsedMs=Date.now()-start;
  write(dir,'R127_FEATURE_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR127Args(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-feature-model-pilot.mjs --model qwen3:14b --plan scripts/fixtures/r125-qwen14b-shop-20261024.json --out NEW_DIR [--brief TEXT] (no world writes)');
  else{
   const r=await runR127FeatureModel(args);
   console.log(JSON.stringify({status:r.status,modelCalls:r.modelCalls,
    addedVoxelCount:r.addedVoxelCount,featureCount:r.featureCount,
    reason:r.reason??null,worldWrites:0}));
   if(r.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error('R127_FEATURE_HOLD',String(e?.message??e));process.exitCode=2;}
}
