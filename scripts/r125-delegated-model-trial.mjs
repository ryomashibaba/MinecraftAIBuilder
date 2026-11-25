import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {normalizeR125SpatialTreeResponse} from '../source/ai/b198g-local-model-adapter.mjs';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {resolveR125DelegatedDimensions} from './r125-delegated-dimensions-study.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

// V37.1: independent bridge. NO model transport, no lock ownership,
// no edits to the ordinary adapter, compiler, or SOURCE gates.
const fail=m=>{throw Error('R125_DELEGATED_TRIAL_'+m)};
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=x=>createHash('sha256').update(x).digest('hex');
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const FIELD='delegatedDimensions';
const instruction='OPTIONAL DIMENSION DELEGATION (single floor only): Keep the complete ordinary architecture JSON. If mechanical fit is uncertain, you MAY add delegatedDimensions, an array of 1..4 {field,choices} entries; each choices lists 2..5 distinct integers, first equal to your declared baseline. HOST tries only these allowed values and keeps your other decisions. Allowed fields: footprint.width/depth (16..32); conventional levels.0.splitPercent (30..70 step 5), levels.0.secondarySplitPercent (25..75 step 5, three rooms only, must be declared); spatial levels.0.spaces.N.volume.width/depth (6..14) or levels.0.spaces.N.volume.attach.shift (-3..3, N>0), with N=0 for rootSpace and N=1..3 for attachedSpaces in order. Keep topology, roof, windows, materials, room purpose and fixtures explicit. Omit delegatedDimensions to keep exact dimensions, or for two floors. Do not delegate user-fixed measurements. Prefer a coherent design and permit useful dimension alternatives where needed for actual geometry. Return only the single JSON object.';
const choice=(fields,min,max,step=1)=>({type:'object',additionalProperties:false,
 properties:{field:{type:'string',enum:fields},choices:{type:'array',minItems:2,maxItems:5,
 items:{type:'integer',minimum:min,maximum:max,...(step>1?{multipleOf:step}:{})}}},
 required:['field','choices']});
function delegationSchema(spatial){
 const types=[choice(['footprint.width','footprint.depth'],16,32)];
 if(spatial){
  types.push(choice(Array.from({length:4},(_,n)=>['width','depth'].map(k=>'levels.0.spaces.'+n+'.volume.'+k)).flat(),6,14));
  types.push(choice([1,2,3].map(n=>'levels.0.spaces.'+n+'.volume.attach.shift'),-3,3));
 }else{
  types.push(choice(['levels.0.splitPercent'],30,70,5));
  types.push(choice(['levels.0.secondarySplitPercent'],25,75,5));
 }
 return {type:'array',minItems:1,maxItems:4,items:{anyOf:types}};
}
// Transform the actual Windows-prepared fresh request, not a stale GitHub
// adapter copy. Preserve native schema restrictions and every user message.
export function prepareR125DelegatedRequest(body){
 if(!object(body)||!Array.isArray(body.messages)||body.messages.length!==2||
    body.messages[0]?.role!=='system'||typeof body.messages[0].content!=='string'||
    body.messages[1]?.role!=='user'||typeof body.messages[1].content!=='string'||
    body.messages[0].content.includes('OPTIONAL DIMENSION DELEGATION'))fail('FRESH_REQUEST_REQUIRED');
 let user;try{user=JSON.parse(body.messages[1].content)}catch{fail('USER_PAYLOAD_REQUIRED')}
 if(typeof user?.architecturalRequest!=='string'||!user.architecturalRequest.trim()||
    ['previousArchitecturePlan','revisionRequest','previousModelResponse'].some(k=>Object.hasOwn(user,k)))
  fail('FRESH_REQUEST_REQUIRED');
 const next=clone(body);
 const native=object(next.format),compat=object(next.response_format?.json_schema?.schema);
 if(native===compat)fail('EXACTLY_ONE_STRICT_SCHEMA_REQUIRED');
 const schema=native?next.format:next.response_format.json_schema.schema;
 if(!Array.isArray(schema.anyOf)||!schema.anyOf.length)fail('PLAN_VARIANTS_REQUIRED');
 let count=0;
 for(const variant of schema.anyOf){
  const props=variant.properties;
  if(!object(props)||!Array.isArray(variant.required)||Object.hasOwn(props,FIELD))fail('PLAN_VARIANT');
  const levels=props.levels;
  if(levels?.minItems===1&&levels?.maxItems===1){
   const spatial=Object.hasOwn(levels.items?.properties??{},'rootSpace');
   props[FIELD]=delegationSchema(spatial);count++;
  }
 }
 if(!count)fail('NO_SINGLE_FLOOR_VARIANT');
 next.messages[0].content+='\n'+instruction;
 return next;
}
export function replayR125DelegatedResponse(raw,requestedBrief,{maxCandidates=16}={}){
 if(typeof raw!=='string'||raw.length<1||raw.length>60000||
    typeof requestedBrief!=='string'||!requestedBrief.trim())fail('INPUT');
 const originalSha256=sha(raw);
 let parsed;try{parsed=JSON.parse(raw)}catch{
  return {status:'HOLD_INVALID_ORIGINAL_JSON',originalSha256,originalEdited:false,sourceVerified:false};
 }
 if(!object(parsed))fail('PLAN_REQUIRED');
 if(!Object.hasOwn(parsed,FIELD)){
  const diagnostic=diagnoseR125ArchitecturePlanOriginal(raw,{requestedBrief});
  return {status:diagnostic.status,originalSha256,originalEdited:false,
   delegationSelected:false,sourceVerified:diagnostic.sourceVerified,diagnostic};
 }
 const plan=clone(parsed),delegated=plan[FIELD];delete plan[FIELD];
 const normalized=normalizeR125SpatialTreeResponse(JSON.stringify(plan));
 // The solver receives canonical ordered spaces and can change only numeric
 // values explicitly listed by the model. No HOST observation repair.
 const result=resolveR125DelegatedDimensions({plan:normalized.plan,delegated},
  p=>diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),{requestedBrief}),
  {maxCandidates});
 return {...result,originalSha256,delegationSelected:true,
  sourceVerified:result.status==='DELEGATED_SOURCE_CANDIDATE_ART_HOLD',
  wireNormalization:normalized.normalization,
  baselinePlanSha256:sha(JSON.stringify(normalized.plan)),
  ...(result.candidate?{resolvedPlanSha256:sha(JSON.stringify(result.candidate))}:{})};
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const write=(dest,value)=>fs.writeFileSync(dest,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function run(argv){
 if(argv[0]==='prepare'&&argv.length===3){
  const body=JSON.parse(fs.readFileSync(argv[1],'utf8'));
  write(argv[2],prepareR125DelegatedRequest(body));
  return {status:'REQUEST_PREPARED_NO_POST'};
 }
 if(argv[0]==='replay'&&argv.length===4){
  const raw=fs.readFileSync(argv[1],'utf8'),brief=fs.readFileSync(argv[2],'utf8');
  const dest=path.resolve(argv[3]),parent=fs.realpathSync(path.dirname(dest));
  if(parent===root||parent.startsWith(root+path.sep)||fs.existsSync(dest))fail('NEW_PRIVATE_OUTPUT_REQUIRED');
  fs.mkdirSync(dest);
  write(path.join(dest,'MODEL_RESPONSE_ORIGINAL.txt'),raw);
  write(path.join(dest,'REQUEST_ORIGINAL.txt'),brief);
  const r=replayR125DelegatedResponse(raw,brief);
  const {sourceDesign,...diagnostic}=r.diagnostic??{};
  write(path.join(dest,'DELEGATED_SOURCE_DIAGNOSIS.json'),{...r,diagnostic:r.diagnostic?diagnostic:undefined});
  if(r.candidate)write(path.join(dest,'HOST_RESOLVED_PLAN.json'),r.candidate);
  if(r.sourceVerified&&sourceDesign){
   write(path.join(dest,'B143_SOURCE_REVIEW_ONLY.json'),sourceDesign);
   const template=fs.readFileSync(path.join(root,'source/ai/b143-viewer-template.html'),'utf8');
   write(path.join(dest,'B143_SOURCE_3D_REVIEW_ONLY.html'),renderB143Html(compileB143Gallery([sourceDesign]),template));
  }
  if(!r.sourceVerified)process.exitCode=2;
  return {status:r.status,delegationSelected:r.delegationSelected,sourceVerified:r.sourceVerified,changes:r.changes??[],attempts:r.attempts?.length??0};
 }
 fail('USAGE: prepare BASE_REQUEST.json NEW_REQUEST.json | replay RAW.txt REQUEST_ORIGINAL.txt NEW_PRIVATE_DIR');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(run(process.argv.slice(2))))}
 catch(e){console.error('R125_DELEGATED_TRIAL_HOLD',String(e?.message??e));process.exitCode=2;}
}
