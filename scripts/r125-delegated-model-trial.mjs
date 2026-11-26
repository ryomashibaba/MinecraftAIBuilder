import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {normalizeR125SpatialTreeResponse} from '../source/ai/b198g-local-model-adapter.mjs';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {resolveR125DelegatedDimensions} from './r125-delegated-dimensions-study.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {prepareR125BlockPaletteRequest,buildR125BlockExpression,makeR125BlockComparisonTemplate} from '../source/ai/r125-block-expression.mjs';
import {buildR125RoofSurface,makeR125RoofSurfaceTemplate} from '../source/ai/r125-roof-surface.mjs';

// V37.1: independent bridge. NO model transport, no lock ownership,
// no edits to the ordinary adapter, compiler, or SOURCE gates.
const fail=m=>{throw Error('R125_DELEGATED_TRIAL_'+m)};
const clone=x=>JSON.parse(JSON.stringify(x));
const sha=x=>createHash('sha256').update(x).digest('hex');
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const FIELD='delegatedDimensions';
// V37.3: compact map of explicitly permitted alternative values. The
// baseline is already in the plan; never ask the model to repeat it.
const instruction='OPTIONAL DIMENSION DELEGATION (single floor only): Keep the ordinary architecture JSON. If useful, add delegatedDimensions as an object, e.g. {"width":[24,28],"split":[45,55]}. Keys are dimensions; arrays list 1..4 acceptable alternatives to the value already in your plan. HOST tries the original value first, then only these alternatives. Use at most four keys. width/depth = footprint (16..32); split = main partition (30..70 step 5); secondary = declared three-room secondary partition (25..75 step 5). For spatial-tree only: r0Width/r0Depth through r3Width/r3Depth (6..14) and r1Shift through r3Shift (-3..3), r0=rootSpace, others=attachedSpaces in order. Do not delegate user-fixed measurements. Keep all non-dimensional choices explicit. Omit this object for exact dimensions or two floors. For spatial-tree, keep both center cells of the root FRONT (small z) wall exterior: no other volume may occupy them, including a chain of attached rooms. A larger site alone does not clear a blocked entrance. Return one JSON object.';
const dimensions={
 width:['footprint.width',16,32],depth:['footprint.depth',16,32],
 split:['levels.0.splitPercent',30,70,5],
 secondary:['levels.0.secondarySplitPercent',25,75,5]
};
for(let i=0;i<4;i++){
 dimensions['r'+i+'Width']=['levels.0.spaces.'+i+'.volume.width',6,14];
 dimensions['r'+i+'Depth']=['levels.0.spaces.'+i+'.volume.depth',6,14];
 if(i>0)dimensions['r'+i+'Shift']=['levels.0.spaces.'+i+'.volume.attach.shift',-3,3];
}
function delegationSchema(spatial){
 const fields=Object.keys(dimensions).filter(k=>k==='width'||k==='depth'||
  (spatial?k.startsWith('r'):k==='split'||k==='secondary'));
 const properties=Object.fromEntries(fields.map(k=>{
  const [,minimum,maximum,step]=dimensions[k];
  return [k,{type:'array',minItems:1,maxItems:4,items:{
   type:'integer',minimum,maximum,...(step?{multipleOf:step}:{})}}];
 }));
 return {type:'object',additionalProperties:false,minProperties:1,maxProperties:4,
  properties};
}
// Existing archived array contracts remain strict and replayable. New map
// semantics are a set of explicit alternatives, not an authored baseline
// override. Repeating the baseline or an alternative is harmless redundancy;
// remove it, record it, and do not invent any value.
export function expandR125DelegationMap(plan,declared){
 if(Array.isArray(declared))return {format:'legacy-array',delegated:declared,redundancies:[]};
 if(!object(declared)||Object.keys(declared).length<1||
    Object.keys(declared).length>4)fail('DELEGATION_MAP');
 if(plan?.levels?.length!==1)fail('DELEGATION_SINGLE_FLOOR');
 const spatial=plan.levels[0].layoutMode==='spatial-tree',allowed=delegationSchema(spatial).properties;
 const delegated=[],redundancies=[];
 for(const [key,values] of Object.entries(declared)){
  if(!Object.hasOwn(allowed,key)||!Array.isArray(values)||values.length<1||values.length>4)
   fail('DELEGATION_MAP_FIELD');
  const [field,min,max,step=1]=dimensions[key];
  let baseline=plan;
  for(const part of field.split('.')){
   if(!baseline||!Object.hasOwn(baseline,part))fail('DELEGATION_MAP_FIELD_ABSENT');
   baseline=baseline[part];
  }
  const valid=v=>Number.isInteger(v)&&v>=min&&v<=max&&v%step===0;
  if(!valid(baseline)||!values.every(valid))fail('DELEGATION_MAP_VALUES');
  const choices=[baseline];
  for(const v of values){
   if(choices.includes(v))redundancies.push({key,value:v});
   else choices.push(v);
  }
  if(choices.length>1)delegated.push({field,choices});
 }
 return {format:'compact-map',delegated,redundancies};
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
 const expanded=expandR125DelegationMap(normalized.plan,delegated);
 if(expanded.format==='compact-map'&&expanded.delegated.length===0){
  const diagnostic=diagnoseR125ArchitecturePlanOriginal(JSON.stringify(normalized.plan),{requestedBrief});
  return {status:diagnostic.status,originalSha256,originalEdited:false,
   delegationSelected:true,delegationContract:expanded,changes:[],
   sourceVerified:diagnostic.sourceVerified,diagnostic,
   wireNormalization:normalized.normalization};
 }
 const result=resolveR125DelegatedDimensions({plan:normalized.plan,delegated:expanded.delegated},
  p=>diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),{requestedBrief}),
  {maxCandidates});
 return {...result,originalSha256,delegationSelected:true,delegationContract:expanded,
  sourceVerified:result.status==='DELEGATED_SOURCE_CANDIDATE_ART_HOLD',
  wireNormalization:normalized.normalization,
  baselinePlanSha256:sha(JSON.stringify(normalized.plan)),
  ...(result.candidate?{resolvedPlanSha256:sha(JSON.stringify(result.candidate))}:{})};
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const write=(dest,value)=>fs.writeFileSync(dest,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function run(argv){
 if(['prepare','prepare-materials'].includes(argv[0])&&argv.length===3){
  const body=JSON.parse(fs.readFileSync(argv[1],'utf8'));
  const prepared=prepareR125DelegatedRequest(body);
  write(argv[2],argv[0]==='prepare-materials'?prepareR125BlockPaletteRequest(prepared):prepared);
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
   const gallery=compileB143Gallery([sourceDesign]);
   write(path.join(dest,'B143_SOURCE_3D_REVIEW_ONLY.html'),renderB143Html(gallery,template));
   const selected=JSON.parse(raw).blockPalette;
   if(selected!==undefined){
    const args={design:sourceDesign,scene:compileDesign(sourceDesign),palette:selected,
     origin:'CALLER_PROVIDED_MODEL_RESPONSE_UNVERIFIED',originalRaw:raw};
    const expression=buildR125BlockExpression(args);
    write(path.join(dest,'V38_BLOCK_EXPRESSION_REVIEW_ONLY.json'),expression);
    const comparison=makeR125BlockComparisonTemplate(template,args,expression);
    write(path.join(dest,'V38_BLOCK_COMPARISON_REVIEW_ONLY.html'),renderB143Html(gallery,comparison));
    if(Object.hasOwn(JSON.parse(raw),'roofSurface')){
     const surface=buildR125RoofSurface(args,expression);
     write(path.join(dest,'V385_ROOF_SURFACE_REVIEW_ONLY.json'),surface);
     write(path.join(dest,'V385_ROOF_SURFACE_REVIEW_ONLY.html'),renderB143Html(gallery,makeR125RoofSurfaceTemplate(comparison,args,expression,surface)));
    }
   }
  }
  if(!r.sourceVerified)process.exitCode=2;
  return {status:r.status,delegationSelected:r.delegationSelected,sourceVerified:r.sourceVerified,changes:r.changes??[],attempts:r.attempts?.length??0};
 }
 fail('USAGE: prepare|prepare-materials BASE_REQUEST.json NEW_REQUEST.json | replay RAW.txt REQUEST_ORIGINAL.txt NEW_PRIVATE_DIR');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(run(process.argv.slice(2))))}
 catch(e){console.error('R125_DELEGATED_TRIAL_HOLD',String(e?.message??e));process.exitCode=2;}
}
