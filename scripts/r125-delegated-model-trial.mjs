import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {normalizeR125SpatialTreeResponse} from '../source/ai/b198g-local-model-adapter.mjs';
import {diagnoseR125ArchitecturePlanOriginal} from './r125-offline-replay.mjs';
import {resolveR125DelegatedDimensions} from './r125-delegated-dimensions-study.mjs';
import {resolveR125DelegatedRoomFit,r125RoomFitSchema} from './r125-delegated-room-fit.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {prepareR125BlockPaletteRequest,constrainR125RoofSurfaceChoices,buildR125BlockExpression,makeR125BlockComparisonTemplate} from '../source/ai/r125-block-expression.mjs';
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
const instruction='OPTIONAL DIMENSION DELEGATION (single floor only): Keep the ordinary architecture JSON. For spatial-tree with no user-fixed site dimensions, prefer delegatedDimensions:{"siteFit":true} when the site is merely a calculated envelope: HOST may increase ONLY footprint.width/depth to exact compiler-required minima (max 32); room sizes, positions relative to one another, windows and equipment stay fixed. For spatial-tree, roomFit permits increasing up to two room dimensions to author-selected maxima (strictly above current size, at most 14), e.g. delegatedDimensions:{"roomFit":{"r0Width":10,"r0Depth":12},"siteFit":true}. HOST searches small increases only if window or fixture placement fails in that room. siteFit may accompany roomFit, but neither mixes with numeric alternative arrays. Never delegate user-fixed dimensions. If useful, add delegatedDimensions as an object, e.g. {"width":[24,28],"split":[45,55]}. Keys are dimensions; arrays list 1..4 acceptable alternatives to the value already in your plan. HOST tries the original value first, then only these alternatives. Use at most four keys. width/depth = footprint (16..32); split = main partition (30..70 step 5); secondary = declared three-room secondary partition (25..75 step 5). For spatial-tree only: r0Width/r0Depth through r3Width/r3Depth (6..14) and r1Shift through r3Shift (-3..3), r0=rootSpace, others=attachedSpaces in order. Do not delegate user-fixed measurements. Keep all non-dimensional choices explicit. Omit this object for exact dimensions or two floors. For spatial-tree, keep both center cells of the root FRONT (small z) wall exterior: no other volume may occupy them, including a chain of attached rooms. A larger site alone does not clear a blocked entrance. Return one JSON object.';
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
 if(spatial){properties.siteFit={type:'boolean',enum:[true]};properties.roomFit=r125RoomFitSchema();}
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
export function prepareR125MaterialsTrialRequest(body){
 const next=prepareR125BlockPaletteRequest(prepareR125DelegatedRequest(body));
 const schema=next.format??next.response_format?.json_schema?.schema;
 // The ordinary adapter determines explicit required work-observation.
 // On this trial's non-required variants, prevent the decoder from
 // gratuitously selecting a relation between unrelated public rooms.
 // This is a disclosed response-form restriction, not a HOST plan edit.
 const required=schema.anyOf.some(v=>v.required.includes('observationLink'));
 if(!required){
  for(const v of schema.anyOf)delete v.properties.observationLink;
 }
 constrainR125RoofSurfaceChoices(schema);
 return next;
}
/** One request via the existing guarded transport; capture exact wire
 * body before POST. No retries, endpoint or model substitution. */
// Same response grammar, user message and transport as the full spatial trial.
const compactSpatialSystem=[
 'You are an inventive Minecraft architectural designer. Return ONE strict JSON object using the supplied schema. Design the original request, not a fixed building-type template.',
 'DESIGN: picture arrival, activity and departure; compare possible silhouettes and connected volumes before choosing. Express the idea in room proportions, varied roof heights/forms when appropriate, exterior openings and actual equipment. Do not rely on a poetic title or add decoration for its own sake. A flat roof can be deliberate; complexity is not mandatory.',
 'PROGRAM: infer essential activities and choose actual fixtures in their own rooms, including every requiredFixtureRoles item. Choose equipment by actual use: seating for sitting, table/desk for activities needing a surface, storage for storing, display for exhibiting. large-table is only for oversized objects, not a display or ordinary reading surface. Do not invent functions. Choose room sizes before the envelope.',
 'SPATIAL-TREE: rootSpace is public/shared; attachedSpaces 1..3, each attached to an earlier room by a shared wall, with >=4 common cells. No volume overlaps. Keep both center cells of root front (small z) wall exterior. Public/shared rooms must be reachable without staff-only rooms. Exterior dimensions 6..14; clear interior width/depth subtract 2. Site span plus 4 cells, plus shelterDepth on depth, within 16..32. Keep fixed user dimensions.',
 'FIT: ordinary fixtures 3x1; seating/washbasin/oven/electronics/table 3x2; bed 3x4; tool-rack/teaching-board 5x1; service-bay 5x4; inspection-stand 3x3; assembly-table 5x3; large-table 7x5. Allow two-wide connected approaches. Area alone does not guarantee fit. table-group: one table first, seating later, room for a clear gap. crafted adds detail.',
 'DAYLIGHT: wide-bay needs exposed face >=8; paired-bays two 3x2 windows, face >=7, root entrance-flanking width >=14; panorama face >=12; clerestory high window. Preserve exposed wall, jambs, sill, lintel and usable interior approach. Open-court root is outdoors, omit daylight and roofForm/roofAxis. Flat roof omits both; ridge/shed/gable/hip requires roofAxis; hip needs width>=8 and depth>=12 for x, or width>=12 and depth>=8 for z.',
 'Use actual structured fields for requested features. ObservationLink only for explicit staff-work viewing as specified by the request/schema. Do not claim construction, walking, weatherproofing or working machinery. Check that the final geometry choices serve the request.'
].join('\n');
export function prepareR125CompactSpatialRequest(body){
 const next=clone(body);
 const schema=next.format??next.response_format?.json_schema?.schema;
 if(!Array.isArray(schema?.anyOf)||schema.anyOf.length!==1||
    !Object.hasOwn(schema.anyOf[0].properties?.levels?.items?.properties??{},'rootSpace')||
    next.messages?.length!==2||next.messages[0]?.role!=='system'||next.messages[1]?.role!=='user')fail('COMPACT_SPATIAL_ONLY');
 const original=next.messages[0].content;
 // Retain the exact extension instructions from the existing preparation
 // functions. Replace only the verbose base system, never the user payload.
 const marker='\nOPTIONAL DIMENSION DELEGATION';
 const at=original.indexOf(marker);
 if(at<0||original.indexOf(marker,at+1)!==-1||
    !original.slice(at).includes('\nOPTIONAL blockPalette:'))fail('COMPACT_EXTENSION_MISSING');
 next.messages[0].content=compactSpatialSystem+original.slice(at);
 return next;
}

/** Shared by offline preparation and the actual one-shot transport.
 * Never send anything from this function; callers own lifecycle and IO. */
export function prepareR125TrialRequest(body,{compactDesign=false}={}){
 if(typeof compactDesign!=='boolean')fail('COMPACT_MODE');
 const extended=prepareR125MaterialsTrialRequest(body);
 return compactDesign?prepareR125CompactSpatialRequest(extended):extended;
}
export function createR125MaterialsTrialTransport(transport,capture,{compactDesign=false}={}){
 if(typeof transport!=='function'||typeof capture!=='function'||typeof compactDesign!=='boolean')fail('TRANSPORT');
 let attempted=false;
 return async (url,init)=>{
  if(attempted)fail('ONE_POST_ONLY');
  attempted=true;
  if(url!=='http://127.0.0.1:11434/v1/chat/completions'||
     init?.method!=='POST'||init.redirect!=='error'||typeof init.body!=='string')fail('TRANSPORT_BOUNDARY');
  const body=JSON.stringify(prepareR125TrialRequest(JSON.parse(init.body),{compactDesign}));
  capture(body);
  return transport(url,{...init,body});
 };
}
/** Mechanical site-envelope delegation, not architectural redesign.
 * Only an explicit, standalone author selection enables this. */
export function resolveR125DelegatedSiteFit(plan,requestedBrief,evaluate){
 if(!object(plan)||plan.levels?.length!==1||plan.levels[0]?.layoutMode!=='spatial-tree'||
    !object(plan.footprint)||!['width','depth'].every(k=>Number.isInteger(plan.footprint[k])&&plan.footprint[k]>=16&&plan.footprint[k]<=32)||
    typeof requestedBrief!=='string'||typeof evaluate!=='function')fail('SITE_FIT_SCOPE');
 const original=clone(plan),attempts=[];
 const reportFor=p=>{
  const raw=JSON.stringify(p),r=evaluate(p);
  if(raw!==JSON.stringify(p)||JSON.stringify(plan)!==JSON.stringify(original)||
     typeof r?.sourceVerified!=='boolean'||typeof r.status!=='string'||
     r.worldContacts!==0||r.worldWrites!==0||r.modelCalls!==0||
     r.originalEdited!==false||r.constructionApproved!==false||r.executionAllowed!==false||
     r.worldGates?.length!==9||r.worldGates.some(v=>v!=='BLOCKED'))fail('SITE_FIT_DIAGNOSTIC');
  return r;
 };
 const baseline=reportFor(clone(original));
 attempts.push({changes:[],status:baseline.status,reason:baseline.compilerReason??null});
 const finish=(diagnostic,candidate,changes,reason)=>({
  schema:'r125-explicit-site-fit-study-v1',
  status:diagnostic.sourceVerified?'DELEGATED_SOURCE_CANDIDATE_ART_HOLD':'HOLD_NO_VERIFIED_DELEGATED_CANDIDATE',
  sourceVerified:diagnostic.sourceVerified,candidate:diagnostic.sourceVerified?candidate:null,
  changes,attempts,diagnostic,siteFitReason:reason,originalEdited:false,
  modelAuthorship:'MODEL_INTENT_HOST_RESOLVED_NOT_RAW_MODEL_SOURCE',
  modelCalls:0,worldWrites:0,artStatus:'NOT_REVIEWED'});
 if(baseline.sourceVerified)return finish(baseline,original,[],'BASELINE_ALREADY_FITS');
 // Conservatively refuse explicit numerical site/size restrictions when
 // recognizable; model instruction separately prohibits fixed constraints.
 // This guard is not a complete natural-language measurement parser.
 if(/(?:\d+\s*(?:[xX×＊*]|ブロック|マス|メートル|m\b)|(?:幅|奥行(?:き)?|敷地|横幅|縦幅|上限|以内)\s*(?:は|が|を|：|:)?\s*\d+)/i.test(requestedBrief))
  return finish(baseline,null,[],'EXPLICIT_DIMENSION_TEXT_GUARD');
 if(baseline.compilerReason!=='R125_PLAN_SPATIAL_VOLUMES_EXCEED_FOOTPRINT')return finish(baseline,null,[],'NOT_SITE_FAILURE');
 const f=baseline.spatialFootprint;
 if(!f||!['width','depth'].every(k=>f.declared?.[k]===original.footprint[k]&&Number.isSafeInteger(f.required?.[k])&&f.required[k]>0))
  fail('SITE_FIT_EVIDENCE');
 const candidate=clone(original),changes=[];
 for(const k of ['width','depth']){
  const from=original.footprint[k],to=Math.max(from,f.required[k]);
  if(to>32)return finish(baseline,null,[],'SITE_LIMIT_32');
  if(to!==from){candidate.footprint[k]=to;changes.push({field:'footprint.'+k,from,to});}
 }
 if(!changes.length)fail('SITE_FIT_NO_CHANGE');
 const diagnostic=reportFor(candidate);
 attempts.push({changes,status:diagnostic.status,reason:diagnostic.compilerReason??null});
 if(diagnostic.sourceVerified&&diagnostic.structuralComposition?.status!=='NOT_REQUIRED')fail('SITE_FIT_COMPOSITION');
 return finish(diagnostic,candidate,changes,diagnostic.sourceVerified?'EXACT_REQUIRED_ENVELOPE':'OTHER_SOURCE_FAILURE');
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
 if(object(delegated)&&Object.hasOwn(delegated,'roomFit')){
  const result=resolveR125DelegatedRoomFit(normalized.plan,delegated,requestedBrief,
   p=>diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),{requestedBrief}),{maxCandidates});
  return {...result,originalSha256,delegationSelected:true,
   delegationContract:{format:'room-fit',...clone(delegated)},wireNormalization:normalized.normalization,
   baselinePlanSha256:sha(JSON.stringify(normalized.plan)),
   ...(result.candidate?{resolvedPlanSha256:sha(JSON.stringify(result.candidate))}:{})};
 }
 if(object(delegated)&&Object.hasOwn(delegated,'siteFit')){
  if(delegated.siteFit!==true||Object.keys(delegated).length!==1)fail('SITE_FIT_STANDALONE');
  const result=resolveR125DelegatedSiteFit(normalized.plan,requestedBrief,
   p=>diagnoseR125ArchitecturePlanOriginal(JSON.stringify(p),{requestedBrief}));
  return {...result,originalSha256,delegationSelected:true,
   delegationContract:{format:'site-fit',siteFit:true},wireNormalization:normalized.normalization,
   baselinePlanSha256:sha(JSON.stringify(normalized.plan)),
   ...(result.candidate?{resolvedPlanSha256:sha(JSON.stringify(result.candidate))}:{})};
 }
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
 if(['prepare','prepare-materials','prepare-compact'].includes(argv[0])&&argv.length===3){
  const body=JSON.parse(fs.readFileSync(argv[1],'utf8'));
  const prepared=argv[0]==='prepare'?prepareR125DelegatedRequest(body):
   prepareR125TrialRequest(body,{compactDesign:argv[0]==='prepare-compact'});
  // Exact wire serialization, not pretty-printed or newline-terminated.
  write(argv[2],JSON.stringify(prepared));
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
 fail('USAGE: prepare|prepare-materials|prepare-compact BASE_REQUEST.json NEW_REQUEST.json | replay RAW.txt REQUEST_ORIGINAL.txt NEW_PRIVATE_DIR');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(run(process.argv.slice(2))))}
 catch(e){console.error('R125_DELEGATED_TRIAL_HOLD',String(e?.message??e));process.exitCode=2;}
}
