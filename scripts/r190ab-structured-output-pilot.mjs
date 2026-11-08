/** R190-AB: ONE opt-in local Ollama JSON-Schema response trial.
 * New immutable research only; NEVER repairs a model-authored voxel, retries,
 * contacts Minecraft, downloads a model or edits R190-AA/original evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {readR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
import {measureR190TSource} from './r190t-source-comparison.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
import {R190AA_TASKS,buildR190AAPrompt} from './r190aa-local-work-pilot.mjs';
import {R190AB_SEMANTIC_FORMAT,R190AB_SEMANTIC_FORMAT_SHA256,
 R190AB_SEMANTIC_GUIDANCE,inspectR190ABSemanticReply}
 from '../source/ai/r190ab-semantic-contract.mjs';
import {R190AD_FORMAT,R190AD_FORMAT_SHA256,
 R190AD_GUIDANCE,inspectR190ADReply}
 from '../source/ai/r190ad-expressive-semantic-contract.mjs';
import {R190AE_FORMAT,R190AE_FORMAT_SHA256,R190AE_GUIDANCE,
 inspectR190AEReply} from '../source/ai/r190ae-flexible-semantic-contract.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../r190ab-local-evidence');
const sha=s=>createHash('sha256').update(s,'utf8').digest('hex');
const fail=x=>{throw Error('R190AB_'+x)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0});
const obj=(properties,required=Object.keys(properties))=>({
 type:'object',additionalProperties:false,properties,required});
const str=(minLength=1,maxLength=400)=>({type:'string',minLength,maxLength});
const n=(minimum=0,maximum=128)=>({type:'integer',minimum,maximum});
const coords=(minimum=0,maximum=128)=>({
 type:'array',items:n(minimum,maximum),minItems:3,maxItems:3});
const arr=(items,minItems=0,maxItems=160)=>({
 type:'array',items,minItems,maxItems});
const allowed=['stone','concrete','metal','glass','wood','glow','accent'];
const repeat=obj({count:n(2,32),offset:coords(-128,128)});
function part(shape,mode){
 const p={id:str(1,40),shape:{const:shape},mode:{const:mode}};
 if(mode==='add')p.material={type:'string',enum:allowed};
 if(shape==='box'){p.origin=coords();p.size=coords(1);p.shell=n(0,4)}
 if(shape==='ellipsoid'){p.center=coords();p.radii=coords(1,64);p.shell=n(0,4)}
 if(shape==='cylinder'){
  p.origin=coords();p.axis={type:'string',enum:['x','y','z']};
  p.radius=n(1,64);p.length=n(1,128);p.shell=n(0,4);
 }
 if(shape==='torus'){
  p.center=coords();p.axis={type:'string',enum:['x','y','z']};
  p.majorRadius=n(3,45);p.tubeRadius=n(1,9);p.shell=n(0,4);
 }
 if(shape==='beam'){p.start=coords();p.end=coords();p.thickness=n(1,3)}
 if(shape==='staircase'){
  p.origin=coords();p.axis={type:'string',enum:['x','z']};
  p.direction={type:'integer',enum:[-1,1]};
  p.width=n(2,12);p.steps=n(2,32);p.treadDepth=n(1,3);
 }
 if(mode==='cut')delete p.shell;
 p.repeat=repeat;
 return obj(p,Object.keys(p).filter(k=>!['shell','repeat'].includes(k)));
}
const variants=[];
for(const shape of ['box','ellipsoid','cylinder','torus','beam']){
 for(const mode of ['add','cut'])variants.push(part(shape,mode));
}
variants.push(part('staircase','add'));
export const R190AB_FORMAT=obj({
 design:obj({
  schema:{const:'minecraftaibuilder-b143-building-dsl-v1'},
  id:{type:'string',pattern:'^[a-z][a-z0-9-]{2,47}$'},
  title:str(1,100),brief:str(1,500),
  bounds:obj({width:n(8,128),depth:n(8,128),height:n(8,96)}),
  elements:arr({oneOf:variants},1,160),
  designOnly:{const:true}
 }),
 explanation:str(3,800),
 assumptions:arr(str(1,250),0,12),
 spatialPlan:obj({
  designIntent:str(8,350),massStrategy:str(8,350),
  circulationStrategy:str(8,350),
  entrance:coords(1),headroom:{type:'integer',enum:[2,3]},
  protectedVoids:arr(obj({
   id:str(1,40),origin:coords(),size:coords(1),
   maxOccupiedCells:n(0,500000)
  }),0,30),
  destinations:arr(obj({
   id:str(1,40),point:coords(1),maximumPathSteps:n(1,100000)
  }),1,30),
  functionalZones:arr(obj({
   id:str(1,40),origin:coords(),size:coords(1),
   minimumReachablePositions:n(1,500000),
   minimumReachablePercent:{type:'number',minimum:0,maximum:100}
  }),1,30)
 })
});
const SCHEMA_HASH=sha(JSON.stringify(R190AB_FORMAT));
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/,ID=/^[a-z][a-z0-9-]{2,39}$/;
const filename=(root,p)=>path.join(root,p);
const saveJson=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const read=p=>fs.readFileSync(p,'utf8');
export function parseR190ABArgs(args){
 const opt={run:false,model:'qwen3:14b',study:'contract-01',task:'library',contract:'direct-b143'};
 if(args.length===1&&args[0]==='--help')return {help:true};
 const seen=new Set();
 for(let i=0;i<args.length;i++){
  if(args[i]==='--run'&&!opt.run){opt.run=true;continue}
  const key=args[i];
  if(!['--model','--study','--task','--contract'].includes(key)||seen.has(key)||!args[i+1])fail('ARGUMENTS');
  seen.add(key);opt[key.slice(2)]=args[++i];
 }
 if(!MODEL.test(opt.model)||!ID.test(opt.study)||
  !R190AA_TASKS.some(t=>t.id===opt.task)||
  !['direct-b143','semantic-space','semantic-space-expressive','semantic-space-flexible'].includes(opt.contract))fail('UNSAFE_OPTIONS');
 return opt;
}
export function inspectR190ABReply(raw,finishReason='stop'){
 const r={status:'HOLD_INVALID_OUTPUT',originalRawSha256:sha(raw),
  bytes:Buffer.byteLength(raw,'utf8'),strictB143:false,
  declaredPlan:false,real3D:false,physical:null,
  error:null,...safety()};
 if(finishReason!=='stop'){r.error='PROVIDER_NOT_CONFIRMED_COMPLETE';return {report:r,design:null}}
 try{
  // The original is inspected, never rewritten, cleaned or geometry-repaired.
  const parsed=readR4PlannedProposal(raw);
  r.declaredPlan=true;
  const compiled=compileDesign(parsed.design);
  if(!verifyCompiled(parsed.design,compiled))fail('SOURCE_HASH_MISMATCH');
  r.strictB143=true;
  r.sourceSha256=compiled.sourceSha256;
  r.geometrySha256=compiled.geometrySha256;
  r.real3D=true;
  try{
   r.physical=measureR190TSource(parsed.design,parsed.spatialPlan);
   r.status='B143_COMPARABLE_ART_HOLD';
  }catch(error){
   r.status='HOLD_PHYSICAL_MEASUREMENT';
   r.error=String(error?.message??error).slice(0,180);
  }
  return {report:r,design:parsed.design};
 }catch(error){
  r.error=String(error?.message??error).slice(0,180);
  return {report:r,design:null};
 }
}
export async function runR190AB(args=[],{
 evidenceRoot=ROOT,fetcher=fetch
}={}){
 const o=Array.isArray(args)?parseR190ABArgs(args):args;
 if(o?.help)return {help:'Offline by default. Direct B143: --run --study contract-01 --task library. Legacy semantic IR: --run --contract semantic-space --study semantic-workshop-01 --task tidal-workshop. Expressive SINGLE-LEVEL: --run --contract semantic-space-expressive --study expressive-workshop-01 --task tidal-workshop. Flexible: --run --contract semantic-space-flexible --study flexible-workshop-01 --task tidal-workshop. Local Work access requires user approval.'};
 if(!o||typeof o.run!=='boolean'||!MODEL.test(o.model)||!ID.test(o.study)||
  !R190AA_TASKS.some(t=>t.id===o.task)||
  !['direct-b143','semantic-space','semantic-space-expressive','semantic-space-flexible'].includes(o.contract))
  fail('OPTIONS');
 const root=path.resolve(evidenceRoot),dir=filename(root,o.study);
 if(!o.run){
  if(!fs.existsSync(dir))return {status:'NO_SAVED_STUDY',modelCalls:0,...safety()};
  const st=fs.lstatSync(dir);
  if(!st.isDirectory()||st.isSymbolicLink())fail('UNSAFE_STUDY_DIR');
  return {status:'READ_ONLY',saved:JSON.parse(read(filename(dir,'R190AB_RESULT.json'))),
   modelCalls:0,...safety()};
 }
 // The existing semantic geometry supports ONE LEVEL only. Refuse 2-level,
 // hillside, bridge or vertical-market cases BEFORE a single model request.
 // Workshop covers spatial roles and a model-selected roof, but cannot
 // certify actual weather protection or tidal engineering.
 if(['semantic-space','semantic-space-expressive','semantic-space-flexible'].includes(o.contract)&&
    o.task!=='tidal-workshop')
  fail('SEMANTIC_SINGLE_LEVEL_TASK_UNSUPPORTED');
 if(fs.existsSync(root)){
  const st=fs.lstatSync(root);
  if(!st.isDirectory()||st.isSymbolicLink())fail('UNSAFE_EVIDENCE_ROOT');
 }
 if(fs.existsSync(dir))fail('PREVIOUS_STUDY_NO_AUTOMATIC_RETRY');
 const local=async(url,body)=>{
  if(url!=='http://127.0.0.1:11434/api/tags'&&
     url!=='http://127.0.0.1:11434/api/chat')fail('REMOTE_PROVIDER_FORBIDDEN');
  return fetcher(url,{...body,redirect:'error'});
 };
 const tags=await local('http://127.0.0.1:11434/api/tags',{method:'GET'});
 if(!tags?.ok)fail('OLLAMA_UNAVAILABLE');
 const manifest=await tags.json();
 const installed=manifest?.models?.find(x=>x?.name===o.model);
 if(!installed)fail('LOCAL_MODEL_NOT_INSTALLED_NO_DOWNLOAD');
 const task=R190AA_TASKS.find(t=>t.id===o.task),
  semantic=o.contract!=='direct-b143',
  expressive=o.contract==='semantic-space-expressive',
  flexible=o.contract==='semantic-space-flexible',
  prompt=semantic?task.brief:buildR190AAPrompt(task),
  schemaHash=flexible?R190AE_FORMAT_SHA256:
   expressive?R190AD_FORMAT_SHA256:
   semantic?R190AB_SEMANTIC_FORMAT_SHA256:SCHEMA_HASH;
 const directSystem=[
  'Design the original architecture yourself, not an existing template. Return ONLY JSON matching the supplied JSON Schema.',
  'This is one architecture response, not a control envelope. NEVER output attempt or maxAttempts.',
  'Choose the 3D masses, supported floors, real air-filled rooms, usable stairs, cut openings, and original roof yourself.',
  'All cuts omit material entirely. A staircase moves horizontally on axis x or z; vertical rise comes from steps.',
  'For entrance and destinations, use supported STANDING AIR points, NEVER a solid floor cell.',
  'A void requires a prior intersecting solid volume to cut; a non-intersecting cut does nothing.',
  'Use the ordered B143 add/cut operations. Later ADDs can refill prior cuts. SpatialPlan must describe final model-authored geometry.',
  'Do not self-certify beauty, walkability or construction; source-only research.'
 ].join('\n');
 const system=flexible?R190AE_GUIDANCE:
  expressive?R190AD_GUIDANCE:
  semantic?R190AB_SEMANTIC_GUIDANCE:directSystem;
 fs.mkdirSync(root,{recursive:true});
 fs.mkdirSync(dir);
 const request={model:o.model,stream:false,
  format:flexible?R190AE_FORMAT:
   expressive?R190AD_FORMAT:
   semantic?R190AB_SEMANTIC_FORMAT:R190AB_FORMAT,
  options:{temperature:0.35,num_predict:8192},
  messages:[{role:'system',content:system},{role:'user',content:prompt}]};
 // Save exactly which immutable request was attempted BEFORE network calls.
 const requestText=JSON.stringify(request);
 saveJson(filename(dir,'R190AB_ATTEMPT.json'),{
  schema:'minecraftaibuilder-r190ab-attempt-v1',
  contract:o.contract,modelRequested:o.model,modelDigestClaimed:installed.digest??null,
  sourceTask:task.id,promptSha256:sha(prompt),
  schemaSha256:schemaHash,requestSha256:sha(requestText),
  actualProviderConsumption:'UNKNOWN_UNTIL_CAPTURED',
  providerCallsAttempted:1,quality:'NOT_CERTIFIED',...safety()
 });
 let raw=null,reason=null,error=null,providerTelemetry=null;
 const providerStartedMs=Date.now();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),180000);
 try{
  const response=await local('http://127.0.0.1:11434/api/chat',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:requestText,signal:controller.signal
  });
  if(!response?.ok)throw Error('OLLAMA_CHAT_HTTP_'+String(response?.status??'UNKNOWN'));
  const j=await response.json();
  if(typeof j?.message?.content!=='string')throw Error('OLLAMA_CONTENT_MISSING');
  raw=j.message.content;reason=j.done_reason??null;
  const boundedMetric=k=>Number.isSafeInteger(j[k])&&j[k]>=0?j[k]:null;
  providerTelemetry={modelReported:typeof j.model==='string'?j.model.slice(0,140):null,
   totalDurationNs:boundedMetric('total_duration'),
   loadDurationNs:boundedMetric('load_duration'),
   promptEvalCount:boundedMetric('prompt_eval_count'),
   promptEvalDurationNs:boundedMetric('prompt_eval_duration'),
   evalCount:boundedMetric('eval_count'),
   evalDurationNs:boundedMetric('eval_duration'),
   untrustedProviderReported:true};
  if(Buffer.byteLength(raw,'utf8')>120000)throw Error('RAW_TOO_LARGE');
  fs.writeFileSync(filename(dir,'MODEL_RESPONSE_ORIGINAL.txt'),raw,{flag:'wx'});
 }catch(e){error=String(e?.message??e).slice(0,180)}
 finally{clearTimeout(timer)}
 const providerWallMilliseconds=Math.max(0,Date.now()-providerStartedMs);
 const parsed=raw!==null&&fs.existsSync(filename(dir,'MODEL_RESPONSE_ORIGINAL.txt'))?
  (flexible?inspectR190AEReply(raw,reason):
   expressive?inspectR190ADReply(raw,reason):
   semantic?inspectR190ABSemanticReply(raw,reason):inspectR190ABReply(raw,reason)):{report:{
   status:'HOLD_PROVIDER_NO_VERIFIED_RAW',originalRawSha256:null,
   bytes:null,strictB143:false,declaredPlan:false,real3D:false,
   physical:null,error,...safety()},design:null};
 if(parsed.design){
  try{
   if(semantic){
    fs.writeFileSync(filename(dir,'HOST_DERIVED_B143_SOURCE.json'),
     JSON.stringify(parsed.design,null,2)+'\n',{flag:'wx'});
    fs.writeFileSync(filename(dir,'HOST_DERIVED_SOURCE_AUDIT.json'),
     JSON.stringify({semanticPlanSha256:parsed.report.planSha256,
      compilerSourceSha256:parsed.report.hostDerivedSourceSha256,
      compilerGeometrySha256:parsed.report.hostDerivedGeometrySha256,
      sourceRouteAudit:parsed.report.sourceRouteAudit,
      modelDidNotAuthorB143:true,minecraftWalking:'NOT_TESTED',
      humanArtReview:'ART_HOLD',...safety()},null,2)+'\n',{flag:'wx'});
   }
   const template=read(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
    '../source/ai/b143-viewer-template.html'));
   const gallery=compileB143Gallery([parsed.design]);
   fs.writeFileSync(filename(dir,semantic?'HOST_DERIVED_SOURCE_TRUE_3D.html':'MODEL_SOURCE_TRUE_3D.html'),
    renderB143Html(gallery,template),{flag:'wx'});
   const compiled=compileDesign(parsed.design);
   for(const side of ['front','rear','west','east','roof'])
    fs.writeFileSync(filename(dir,(semantic?'HOST_DERIVED_':'MODEL_')+side+'.svg'),
     renderR164Elevation(compiled,parsed.design,side),{flag:'wx'});
  }catch(e){parsed.report.real3D=false;
   parsed.report.status='HOLD_SOURCE_VIEWER_FAILED';
   parsed.report.error=String(e?.message??e).slice(0,180)}
 }
 const result={schema:flexible?'minecraftaibuilder-r190ae-flexible-study-v1':
   expressive?'minecraftaibuilder-r190ad-expressive-study-v1':
   semantic?'minecraftaibuilder-r190ab-semantic-study-v1':
   'minecraftaibuilder-r190ab-result-v1',
  study:o.study,contract:o.contract,sourceTask:task.id,modelClaimed:o.model,
  b143Authorship:semantic?'HOST_DERIVED_FROM_MODEL_SEMANTIC_IR':
    'MODEL_AUTHORED_UNVERIFIED',
  providerDoneReason:reason,providerError:error,providerCallsAttempted:1,
  providerWallMilliseconds,providerTelemetry,
  originalPromptSha256:sha(prompt),schemaSha256:schemaHash,
  pilot01OriginalSha256:'0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17',
  response:parsed.report,
  humanArtReview:'ART_HOLD',independentArtApproval:false,
  noHostGeometryRepair:true,noAutomaticRetry:true,...safety()};
 saveJson(filename(dir,'R190AB_RESULT.json'),result);
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190AB(process.argv.slice(2)).then(x=>{
  console.log(JSON.stringify(x,null,2));
  if(String(x.response?.status??x.status).startsWith('HOLD'))process.exitCode=2;
 }).catch(e=>{console.error('R190AB_HOLD',String(e?.message??e));process.exitCode=2});
}