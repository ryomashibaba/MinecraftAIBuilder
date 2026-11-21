/**
 * R133: one compact local LLM response decides room relationships AND
 * semantic equipment; trusted R132 + R130 compile these into real B143.
 * Independent requirements never reach the model prompt.
 * The original real Qwen plan and all saved historical voxels stay frozen.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan} from '../source/ai/r125-architecture-plan.mjs';
import {deriveR132SpatialPlan,SCHEMA as SPATIAL_SCHEMA}
 from '../source/ai/r132-spatial-relations.mjs';
import {applyR125FeatureIntent,ASSEMBLED_SCHEMA}
 from '../source/ai/r125-functional-layer.mjs';
import {auditR129FunctionalAcceptance,SCHEMA as ACCEPT_SCHEMA}
 from '../source/ai/r125-functional-acceptance.mjs';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const ROLES=new Set(['work-surface','equipment-bank','display-stand','storage-rack','seating']);
const CORNERS=new Set(['near-left','near-right','far-left','far-right']);
const GOAL_SCHEMA='minecraftaibuilder-r133-independent-goals-v1';
const fail=s=>{throw Error('R133_ONEPASS_'+s);};
const exact=(v,fields)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
const slug=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{2,39}$/.test(s);
const bounded=(x,lo,hi)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const frozenWorld=()=>({readiness:'NOT_PREPARED',worldContacts:0,worldWrites:0,
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const SYSTEM=[
 'You are designing an original practical spatial layout and useful equipment.',
 'Choose the relationships of rooms from the building brief and their purposes.',
 'Choose equipment appropriate to the activities without genre templates.',
 'Output EXACTLY one JSON object with keys zoneOrders and objects only.',
 'zoneOrders is 1 or 2 records, each EXACTLY id,nearZoneId,farZoneId,axis.',
 'One relationship per level maximum. Zone IDs must be exact and on the same level.',
 'axis z means from entrance/front toward rear. axis x means west toward east.',
 'nearZoneId is the first zone along the specified axis; farZoneId is the second.',
 'Choose one to eight equipment records with EXACTLY id,zoneId,role,corner.',
 'Use only zone IDs and roles from the input. Valid roles: '+[...ROLES].join(', ')+'.',
 'corner must be near-left, near-right, far-left or far-right.',
 'Every id is a unique lowercase hyphenated slug with 3 to 40 characters.',
 'Never emit coordinates, scripts, extra fields, explanations or approval claims.',
 'A separate host compiler handles all voxels, paths and Minecraft safety.'
].join('\n');
export function makeR133UncoachedRequest(original){
 if(original?.schema!=='minecraftaibuilder-r125-plan-to-b143-result-v1'||
  !original?.plan||!Array.isArray(original.program))fail('ORIGINAL_REQUIRED');
 return {buildingBrief:original.plan.brief,title:original.plan.title,
  footprint:structuredClone(original.plan.footprint),
  levels:original.plan.levels.map((l,i)=>({
   level:i,spaces:l.spaces.map(x=>({id:x.id,purpose:x.purpose}))})),
  axisMeaning:{x:'west-to-east',z:'entrance-front-to-rear'},
  allowedRoles:[...ROLES],allowedCorners:[...CORNERS],
  maxRelations:original.plan.levels.length,maxEquipment:8};
}
export function parseR133UncoachedReply(raw,original){
 if(typeof raw!=='string'||raw.length<20||raw.length>20000)
  fail('MISSING_OR_OVERSIZE_OUTPUT');
 let v;
 try{v=JSON.parse(raw);}catch{fail('NOT_JSON');}
 if(!exact(v,['zoneOrders','objects'])||
  !Array.isArray(v.zoneOrders)||!bounded(v.zoneOrders.length,1,2)||
  !Array.isArray(v.objects)||!bounded(v.objects.length,1,8))
  fail('OUTPUT_CONTRACT');
 const zones=new Map(original.program.flatMap(level=>
  level.zones.map(z=>[z.id,level.level])));
 const orders=new Set(),orderLevels=new Set(),objectIds=new Set();
 for(const x of v.zoneOrders){
  if(!exact(x,['id','nearZoneId','farZoneId','axis'])||
   !slug(x.id)||orders.has(x.id)||!zones.has(x.nearZoneId)||
   !zones.has(x.farZoneId)||x.nearZoneId===x.farZoneId||
   zones.get(x.nearZoneId)!==zones.get(x.farZoneId)||
   orderLevels.has(zones.get(x.nearZoneId))||
   !['x','z'].includes(x.axis))
   fail('INVALID_RELATION');
  orders.add(x.id);orderLevels.add(zones.get(x.nearZoneId));
 }
 for(const x of v.objects){
  if(!exact(x,['id','zoneId','role','corner'])||
   !slug(x.id)||objectIds.has(x.id)||!zones.has(x.zoneId)||
   !ROLES.has(x.role)||!CORNERS.has(x.corner))
   fail('INVALID_EQUIPMENT');
  objectIds.add(x.id);
 }
 return structuredClone(v);
}
export function validateR133IndependentGoals(goals,original){
 if(goals===null)return null;
 if(!exact(goals,['schema','needs','zoneOrders'])||
  goals.schema!==GOAL_SCHEMA||!Array.isArray(goals.needs)||
  !bounded(goals.needs.length,1,16)||
  !Array.isArray(goals.zoneOrders)||goals.zoneOrders.length>16)
  fail('GOALS_CONTRACT');
 // Goals are not a model-authored certificate. Host cross-checks through
 // R129 against recomputed source geometry after the model call.
 const zones=new Set(original.program.flatMap(l=>l.zones.map(z=>z.id)));
 for(const n of goals.needs)
  if(!exact(n,['id','zoneId','role','minCount','minAddedVoxels','minReachablePads'])||
   !slug(n.id)||!zones.has(n.zoneId)||!ROLES.has(n.role)||
   !bounded(n.minCount,1,8)||!bounded(n.minAddedVoxels,1,5000)||
   !bounded(n.minReachablePads,1,5000))
   fail('INVALID_GOAL');
 for(const o of goals.zoneOrders)
  if(!exact(o,['id','nearZoneId','farZoneId','axis'])||
   !slug(o.id)||!zones.has(o.nearZoneId)||!zones.has(o.farZoneId)||
   o.nearZoneId===o.farZoneId||!['x','z'].includes(o.axis))
   fail('INVALID_GOAL_RELATION');
 return structuredClone(goals);
}
export function parseR133Args(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const allowed=new Set(['--model','--plan','--out','--goals','--endpoint']);
 const map={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i],value=argv[i+1];
  if(!allowed.has(key)||Object.hasOwn(map,key)||!value||
   value.startsWith('--'))fail('CLI_'+key);
  map[key]=value;
 }
 if(!MODEL.test(map['--model']??'')||!map['--plan']||!map['--out'])
  fail('CLI_MODEL_PLAN_OUT');
 const endpoint=map['--endpoint']??'http://127.0.0.1:11434/v1/chat/completions';
 const port=ENDPOINT.exec(endpoint);
 if(!port||!bounded(Number(port[1]),1,65535))fail('LOOPBACK_ONLY');
 return {model:map['--model'],plan:JSON.parse(fs.readFileSync(
   map['--plan'],'utf8')),outDir:path.resolve(map['--out']),endpoint,
  independentGoals:map['--goals']?JSON.parse(fs.readFileSync(
   map['--goals'],'utf8')):null};
}
export async function runR133OnePass({
 model,plan,outDir,independentGoals=null,
 endpoint='http://127.0.0.1:11434/v1/chat/completions'
}={}, {fetcher=fetch,timeoutMs=120000}={}){
 const m=ENDPOINT.exec(endpoint??''),testInjected=fetcher!==fetch;
 if(!MODEL.test(model??'')||!m||!bounded(Number(m[1]),1,65535)||
  typeof outDir!=='string'||!outDir.trim()||
  typeof fetcher!=='function'||!bounded(timeoutMs,1000,300000))
  fail('INPUT_OR_LOCAL_ENDPOINT');
 if(fs.existsSync(outDir))fail('OUTPUT_ALREADY_EXISTS');
 const original=compileArchitecturePlan(plan);
 const goals=validateR133IndependentGoals(independentGoals,original);
 const request=makeR133UncoachedRequest(original);
 const dir=path.resolve(outDir),start=Date.now();
 const report={schema:'r133-one-pass-spatial-and-equipment-v1',
  status:'HOLD_NOT_STARTED',model,modelCalls:0,
  exactInstalledModelOnly:'PREFLIGHT_REQUIRED',
  modelProviderIdentity:'NOT_INDEPENDENTLY_AUTHENTICATED',
  testInjectionPresent:testInjected,
  originalPlanSha256:original.planSha256,
  originalSourceSha256:original.sourceSha256,
  originalGeometrySha256:original.geometrySha256,
  originalVoxelCount:original.compiled.primitives.length,
  independentGoalsPassedToModel:false,
  independentResult:'NOT_EVALUATED',derivedSourceSha256:null,
  derivedVoxelCount:null,modelChoices:null,
  authorship:testInjected?'TEST_DOUBLE':'UNVERIFIED_LOCAL_PROVIDER',
  world:frozenWorld()};
 fs.mkdirSync(dir,{recursive:false});
 write(dir,'MODEL_REQUEST.json',{model,endpoint,request,
  maxTokens:1024,protocol:'SINGLE_UNCOACHED_LOCAL_MODEL_POST'});
 if(goals)write(dir,'INDEPENDENT_GOALS_NOT_SENT_TO_MODEL.json',goals);
 try{
  const preflight=await preflightR125Ollama({model,endpoint,fetcher});
  if(preflight.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_MODEL_NOT_INSTALLED';return report;
  }
  report.exactInstalledModelOnly=preflight.status;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   report.modelCalls=1;
   const r=await fetcher(endpoint,{method:'POST',redirect:'error',
    signal:controller.signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.45,
     max_tokens:1024,reasoning_effort:'none',
     response_format:{type:'json_object'},messages:[
      {role:'system',content:SYSTEM},
      {role:'user',content:JSON.stringify(request)}]})});
   if(!r||r.ok!==true)fail('MODEL_HTTP_'+String(r?.status??'UNKNOWN'));
   const body=await r.text();
   if(body.length>100000)fail('HTTP_OVERSIZE');
   let data;
   try{data=JSON.parse(body);}catch{fail('INVALID_PROVIDER_JSON');}
   if(data?.choices?.length!==1||
    data.choices[0]?.finish_reason==='length')
    fail('INCOMPLETE_PROVIDER_RESPONSE');
   const raw=data.choices[0]?.message?.content;
   if(typeof raw!=='string'||raw.length<20||raw.length>20000)
    fail('INVALID_RAW_CONTENT');
   write(dir,'MODEL_ORIGINAL_UNMODIFIED.txt',raw);
   const chosen=parseR133UncoachedReply(raw,original);
   report.modelChoices=chosen;
   const spatial=deriveR132SpatialPlan({original,requirements:{
    schema:SPATIAL_SCHEMA,basePlanSha256:original.planSha256,
    zoneOrders:chosen.zoneOrders}});
   const base=spatial.candidateBase;
   const intent={schema:ASSEMBLED_SCHEMA,basePlanSha256:base.planSha256,
    objects:chosen.objects.map(o=>({...o,detail:'assembled'}))};
   const featured=applyR125FeatureIntent({base,intent});
   const independent=goals?auditR129FunctionalAcceptance({
    base,featured,spec:{schema:ACCEPT_SCHEMA,
     basePlanSha256:base.planSha256,needs:goals.needs,
     zoneOrders:goals.zoneOrders}}):null;
   write(dir,'MODEL_SEMANTIC_CHOICES.json',chosen);
   write(dir,'DERIVED_ARCHITECTURE_PLAN.json',spatial.candidatePlan);
   write(dir,'SOURCE_SPATIAL_EVIDENCE.json',{
    before:spatial.before,after:spatial.after,
    changedLevels:spatial.changedLevels,
    entranceRepairSourceChanged:spatial.entranceRepairSourceChanged,
    originalSourceSha256:original.sourceSha256,
    derivedSourceSha256:spatial.derivedSourceSha256});
   write(dir,'DERIVED_EQUIPMENT_INTENT.json',intent);
   write(dir,'DERIVED_B143_SOURCE.json',featured.design);
   write(dir,'DERIVED_B143_SCENE.json',featured.compiled);
   write(dir,'FEATURE_PLACEMENTS.json',featured.placements);
   write(dir,'SOURCE_ROUTE_AUDIT.json',featured.sourceRouteAudit);
   if(independent)write(dir,'INDEPENDENT_ACCEPTANCE.json',independent);
   const template=fs.readFileSync(path.join(ROOT,
    'source/ai/b143-viewer-template.html'),'utf8');
   write(dir,'index.html',renderB143Html(
    compileB143Gallery([featured.design]),template));
   report.independentResult=independent?.status??'NOT_EVALUATED_NO_GOALS';
   report.derivedSourceSha256=featured.sourceSha256;
   report.derivedGeometrySha256=featured.geometrySha256;
   report.derivedVoxelCount=featured.compiled.primitives.length;
   report.assembledEquipmentCount=featured.placements.length;
   report.addedEquipmentVoxels=featured.addedVoxelCount;
   report.sourceRouteStatus=featured.sourceRouteAudit.status;
   report.spatialSourceRelationStatus=spatial.status;
   report.status=independent?.status.startsWith('HOLD_')?
    'HOLD_INDEPENDENT_FUNCTIONAL_REQUIREMENTS':
    testInjected?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
    'SOURCE_CANDIDATE_HUMAN_AND_IN_GAME_REVIEW_REQUIRED';
   return report;
  }finally{clearTimeout(timer);}
 }catch(e){
  report.status='HOLD_MODEL_OUTPUT_OR_SOURCE_CONSTRUCTION';
  report.reason=String(e?.message??e).slice(0,400);
  return report;
 }finally{
  report.elapsedMs=Date.now()-start;
  write(dir,'R133_RUN_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseR133Args(process.argv.slice(2));
  if(opts.help)console.log('node scripts/r133-spatial-onepass.mjs --model qwen3.5:2b --plan scripts/fixtures/r125-qwen14b-shop-20261024.json --goals scripts/fixtures/r133-shop-independent-goals.json --out NEW_DIR (local Ollama, zero world writes)');
  else{
   const report=await runR133OnePass(opts);
   console.log(JSON.stringify({status:report.status,
    modelCalls:report.modelCalls,
    independent:report.independentResult,reason:report.reason??null,
    worldWrites:0}));
   if(report.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error(String(e?.message??e));process.exitCode=2;}
}
