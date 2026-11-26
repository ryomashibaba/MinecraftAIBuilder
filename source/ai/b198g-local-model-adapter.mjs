import {createHash} from 'node:crypto';
import {inferR125ExplicitActivityRequirements}
 from './r125-explicit-activity-requirements.mjs';
import {validateArchitecturePlan,SCHEMA as R125_PLAN_SCHEMA} from './r125-architecture-plan.mjs';
import {prepareR125BlockPaletteRequest,constrainR125RoofSurfaceChoices} from './r125-block-expression.mjs';
/**
 * B198G optional LOCAL-only OpenAI-compatible chat completion adapter.
 * The model actually authors JSON B143 source. NO API key, no paid endpoint,
 * no wildcard URL, no remote HTTP, and no disguised keyword-based generator.
 * This function does not contact even localhost until directly invoked.
 */
import {readR190ModelProposal} from './r190-model-proposal.mjs';
import {readModelProposal} from './b198-natural-language-design.mjs';
import {readR4PlannedProposal,R4_PLANNING_GUIDE}
 from './b198zr4-planned-source.mjs';
export const DEFAULT_LOCAL_ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';
const MODEL_RE=/^[A-Za-z0-9._:/-]{2,140}$/;
const ENDPOINT_RE=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const refuse=msg=>{throw Error('B198G_LOCAL_'+msg);};
const SYSTEM=[
 'You are an original voxel building architect, never a fixed genre template.',
 'Return ONLY a JSON object with EXACT keys design, explanation, assumptions.',
 'Metadata contract: explanation is a plain string (3..800 chars). assumptions is an array of 0..12 PLAIN STRINGS, each at most 250 characters. Use [] when there are no assumptions.',
 'Do NOT return assumptions as an object, dictionary, single string, or array of objects. Example for metadata fields only: "explanation":"A small building has two functions.","assumptions":["Flat site","No external stairs"]. All coordinates and building elements remain your independent architectural choices.',
 'The design must comply with minecraftaibuilder-b143-building-dsl-v1.',
 'Use schema,id,title,brief,bounds,elements,designOnly as the only design fields.',
 'Set designOnly=true. Bounds width/depth 8..128,height 8..96,product<=500000.',
 'All element IDs unique; max 160 elements, max 160000 exact occupied voxels.',
 'STRICT B143 fields: design.id must match ^[a-z][a-z0-9-]{2,47}$ (hyphens, NOT underscores). Elements use mode:"add" or mode:"cut"; never use type. Every add element, including staircase, requires an allowed material. Cut elements have NO material.',
 'All box origins and sizes, and all staircase spans must fit strictly INSIDE design.bounds. For staircase, last step position = origin[axis] + direction*(steps*treadDepth-1); y top = origin.y+steps-1.',
 'Room spaces must be mostly EMPTY AIR bounded by actual walls and floors: do not add solid box volumes named room. Different storeys need usable vertical separation, not two floor slabs one voxel apart.',
 'Entrances need a CUT through the exterior wall; glazed windows need exterior wall openings before glazing. A named solid door or a glass box floating inside is not an opening.',
 'Primitive shapes: box,ellipsoid,cylinder,torus,beam,staircase. Modes: add and cut (staircase only add).',
 'Compact staircases: one add element with shape staircase, origin:[x,y,z],axis:x or z,direction:1 or -1,width:2..12,steps:2..32,treadDepth:1..3. Each step rises exactly one voxel.',
 'Use a staircase element instead of dozens of individually authored stair boxes; reserve output tokens for original composition and functional rooms.',
 'Optional repeat:{count:2..32,offset:[dx,dy,dz]} on an individual add/cut element translates it by the given integer vector each time; repeated copies must remain inside bounds and use the original shape parameters.',
 'Use repeat for columns, facade ribs and repetitive beam/void components, not fixed typology, floorplan presets or semantically unique areas.',
 'Allowed add materials: stone,concrete,metal,glass,wood,glow,accent.',
 'Use only local integer coordinates within bounds; no Minecraft commands.',
 'Original designs must be architectural and respond specifically to Japanese prompts.',
 'Include supported functional floors and voids instead of filling entire volumes.',
 'For revisions preserve prior complete design.id, source elements, materials, clear floors and headroom; introduce new meaningful elements for fixes.',
 'Explain assumptions honestly; do not claim in-game walking, artistic merit, building approval, or real construction.'
].join('\n');

export function createB198GLocalModelAdapter({
 model,endpoint=DEFAULT_LOCAL_ENDPOINT,fetcher=fetch,timeoutMs=120000,
 plannedSourceMode=false,reasoningEffort=undefined,maxOutputTokens=undefined,
 onRawModelResponse=null
}={}){
 if(typeof model!=='string'||!MODEL_RE.test(model))
  refuse('EXPLICIT_MODEL_ID_REQUIRED');
 const m=typeof endpoint==='string'?ENDPOINT_RE.exec(endpoint):null;
 if(!m||Number(m[1])>65535||Number(m[1])<1)
  refuse('ONLY_EXPLICIT_127_0_0_1_CHAT_COMPLETIONS_ALLOWED');
 if(typeof fetcher!=='function')refuse('INVALID_FETCHER');
 if(typeof plannedSourceMode!=='boolean')refuse('INVALID_PLANNED_MODE');
 if(onRawModelResponse!==null&&typeof onRawModelResponse!=='function')
  refuse('INVALID_RAW_CAPTURE_CALLBACK');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>900000)
  refuse('TIMEOUT_BOUNDS');
 if(reasoningEffort!==undefined&&!['none','low','medium','high'].includes(reasoningEffort))
  refuse('INVALID_REASONING_EFFORT');
 if(maxOutputTokens!==undefined&&(!Number.isSafeInteger(maxOutputTokens)||
  maxOutputTokens<256||maxOutputTokens>16384))
  refuse('INVALID_MAX_OUTPUT_TOKENS');
 return async function sourceGenerator({
  mode,prompt,previousDesign=null,feedback=[],attempt=1,maxAttempts=2
 }={}){
  if(!['creation','revision'].includes(mode)||typeof prompt!=='string'||
    prompt.length<8||prompt.length>8000)
    refuse('INVALID_MODEL_REQUEST');
  if(!Array.isArray(feedback)||feedback.length>3)
    refuse('FEEDBACK_BOUNDS');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const input={mode,architectural_request:prompt,previousDesign,
    strictCompilerFeedback:feedback.map(x=>String(x.reason??'').slice(0,350)),
    attempt,maxAttempts,
    output:plannedSourceMode?'R4 one-response B143 design plus model spatialPlan':
     'entire original or safely revised B143 source only'};
   const response=await fetcher(endpoint,{
    method:'POST',signal:controller.signal,redirect:'error',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.35,
     response_format:{type:'json_object'},
     ...(reasoningEffort!==undefined?{reasoning_effort:reasoningEffort}:{}),
     ...(maxOutputTokens!==undefined?{max_tokens:maxOutputTokens}:{}),
     messages:[{role:'system',content:plannedSourceMode?
      SYSTEM.replace('Return ONLY a JSON object with EXACT keys design, explanation, assumptions.',
       'Return ONLY a JSON object with EXACT keys design, explanation, assumptions, spatialPlan.')+
       '\n'+R4_PLANNING_GUIDE:SYSTEM},
       {role:'user',content:JSON.stringify(input)}]})
   });
   if(!response||response.ok!==true)
    refuse('LOCAL_HTTP_'+String(response?.status??'UNKNOWN'));
   const data=await response.json();
   if(!Array.isArray(data?.choices)||data.choices.length!==1)
    refuse('INVALID_RESPONSE_CHOICES');
   const choice=data.choices[0],raw=choice.message?.content;
   if(typeof raw!=='string'||raw.length<10||raw.length>60000)
    refuse('INVALID_MODEL_CONTENT');
   // Preserve exact provider content BEFORE JSON/source checks or truncation HOLD.
   // The callback can record rejected output for an offline review without
   // generating a second expensive model response or changing source bytes.
   if(onRawModelResponse)onRawModelResponse(raw,{finishReason:choice.finish_reason??null});
   if(choice.finish_reason==='length')refuse('TRUNCATED_MODEL_RESPONSE');
   // A local provider is never a trusted source. Reuse the real strict adapter
   // grammar, and let B198A/B143 independently compile every proposed design.
   return plannedSourceMode?readR4PlannedProposal(raw):readModelProposal(raw);
  }finally{clearTimeout(timer);}
 };
}

/**
 * R190-F uses the SAME local-only endpoint policy as B198G, but asks for a
 * semantic plan (not raw host-designed voxels). No inference before invocation.
 */
export function createR190SemanticModelAdapter({
 model,endpoint=DEFAULT_LOCAL_ENDPOINT,fetcher=fetch,timeoutMs=120000,
 onRawModelResponse=null
}={}){
 if(typeof model!=='string'||!MODEL_RE.test(model))
  refuse('EXPLICIT_MODEL_ID_REQUIRED');
 const m=typeof endpoint==='string'?ENDPOINT_RE.exec(endpoint):null;
 if(!m||Number(m[1])>65535||Number(m[1])<1)
  refuse('ONLY_EXPLICIT_127_0_0_1_CHAT_COMPLETIONS_ALLOWED');
 if(typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||
   timeoutMs<1000||timeoutMs>900000)refuse('INVALID_LOCAL_OPTIONS');
 if(onRawModelResponse!==null&&typeof onRawModelResponse!=='function')
  refuse('INVALID_RAW_CAPTURE_CALLBACK');
 const system=[
  'You are an independent architect. Design from the user request, NOT a template.',
  'R190 outputs ONE original semantic plan, NOT three independent concepts.',
  'Return one JSON object with EXACT keys schema,semanticPlan,architecturalRationale,assumptions,unrepresentedRequirements.',
  'schema=minecraftaibuilder-r190-model-proposal-v1.',
  'semanticPlan schema=minecraftaibuilder-r190-semantic-space-v1.',
  'semanticPlan exact fields schema,id,title,brief,site,entrySpaceId,spaces,materials; optional entranceFace, formIntent, roofFormIntent, crossConnections and glazedOpenings.',
  'site exact width 24..80,depth 24..80,height 10..32; product <=500000.',
  'spaces 2..6. Each exact id,purpose,width,depth,height,parentId,side,privacy; optional spatialRole.',
  'Each room width and depth 7..22, height 7..site.height-2, privacy public/shared/private.',
  'Root room entrySpaceId has parentId:null,side:null. Every other room must have an existing parentId and side north/south/east/west, connected without cycles.',
  'Optional entranceFace north/south/east/west, default south if omitted. No root child on chosen entranceFace. Real exterior three-cell supported landing follows selected face.',
  'Rooms must fit the site. Model independently decides room purpose, dimensions, parent, side, privacy, material and entrance.',
  'spaces.spatialRole optionally enclosed/open-court; at most one open-court; at least two enclosed spaces.',
  'Optional formIntent exact spaceId,face north/south/east/west,cornerInset 2..3; faceted ONE enclosed room only.',
  'Optional MODEL-CHOSEN roofFormIntent exact spaceId,profile ridge/shed/sawtooth,axis x/z,rise 2..5; sawtooth additionally REQUIRES toothWidth 3..8 and roof span >=2*toothWidth. The chosen room must be enclosed, not the faceted room, and its height+rise must be BELOW site.height.',
  'Optional glazedOpenings 1..8 are exactly MODEL-selected objects: spaceId, face north/south/east/west, offset along wall>=2, baseY>=5, width 2..6, height 2..4, offset+width<=wall span-2, baseY+height<=room height-1; enclosed non-faceted room only; must face actual exterior air and cannot overlap other rooms. Emits real cut-through window and glass; does NOT certify daylight/complete facade. Never infer choices when model omitted them.',
   'Optional crossConnections is 1..4 additional unordered pairs [roomIdA,roomIdB] of DISTINCT existing rooms, never a duplicate parent-child connection. The room placement solver must find a REAL shared wall with a two-wide entrance; infeasible extra links fail closed. Do not emit unless the independently conceived architecture REQUIRES direct circulation between rooms that are not parent/child in the placement tree.',
  'materials exact floor,wall,roof; each wood/stone/concrete/metal.',
  'All ids lowercase hyphenated, 3..40 chars, leading letter. All textual fields plain strings.',
  'Current compiler remains SINGLE LEVEL, uses a rooted tree for PLACEMENT, and allows explicitly model-authored non-tree room shortcuts when physically compatible. Model-authored ridge, shed and sawtooth ROOF SECTIONS are supported on one enclosed room. There are NO upper levels, stairs, double-height void, complete daylight/facade system, furniture or extra exterior doors. Limited model-authored glass windows are NOT a whole daylight system.',
  'When the request needs an unsupported capability, put its ID into unrepresentedRequirements: multiple-levels,stairs,vertical-accessibility,double-height-void,multiple-exterior-entries,window-daylight-system,facade-system,equipment-furniture. Non-tree-adjacency is supported ONLY when crossConnections is physically feasible. Roof-profile-design is supported, so if asked explicitly emit matching roofFormIntent rather than declaring it unsupported.',
  'NEVER silently flatten a 2-story design or substitute decoration for actual rooms, stairs or openings.',
  'architecturalRationale 10..1200 characters; assumptions array 0..12 plain strings each 3..250 characters; unrepresentedRequirements unique strings.',
  'No Minecraft commands, world writes, construction approvals, coordinates from any prior building, markdown, or extra JSON fields.',
  'An unsupported item causes HOLD with no source. Never claim real Minecraft walking or aesthetic success.'
 ].join('\n');
 return async function r190SourceRequest({prompt,requiredCapabilities=[],
  acceptanceSpec=null}={}){
  if(typeof prompt!=='string'||prompt.length<8||prompt.length>8000)
   refuse('INVALID_MODEL_REQUEST');
  // Validate external explicit requirement labels BEFORE provider call.
  // A synthetic invalid proposal has the same contract failure path.
  // Parsing with an empty response is not suitable for this preflight.
  if(!Array.isArray(requiredCapabilities)||requiredCapabilities.length>15)
   refuse('INVALID_REQUIRED_CAPABILITIES');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const res=await fetcher(endpoint,{method:'POST',redirect:'error',
    signal:controller.signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.35,
     response_format:{type:'json_object'},
     messages:[{role:'system',content:system},
      {role:'user',content:JSON.stringify({request:prompt,
       requiredCapabilities,sourceOnly:true})}]})});
   if(!res||res.ok!==true)refuse('LOCAL_HTTP_'+String(res?.status??'UNKNOWN'));
   const data=await res.json();
   if(!Array.isArray(data?.choices)||data.choices.length!==1)
    refuse('INVALID_RESPONSE_CHOICES');
   const choice=data.choices[0],originalRaw=choice?.message?.content;
   // Capture exact provider content BEFORE JSON and architectural validation.
   // The callback never authorizes a second request or repairs its text.
   if(onRawModelResponse&&typeof originalRaw==='string')
    onRawModelResponse(originalRaw,{finishReason:choice.finish_reason??null});
   if(choice?.finish_reason==='length')
    refuse('TRUNCATED_MODEL_RESPONSE');
   return readR190ModelProposal(originalRaw,
    {requiredCapabilities,requestText:prompt,acceptanceSpec});
  }finally{clearTimeout(timer);}
 };
}


/**
 * R125 V11 opt-in semantic ArchitecturePlan authoring, NOT B198G's direct
 * B143 generator. ONE local chat request; no repair, fallback, or Minecraft.
 * The caller MUST persist raw model bytes via onRawModelResponse before QA.
 * A successful plan validation is not a SOURCE / ART / Minecraft success.
 */

/**
 * Ollama supports `response_format: {type:"json_schema",json_schema:{schema}}`
 * on its local OpenAI-compatible chat endpoint. Use the SAME author schema
 * as the strict HOST, not a JSON-only grammar that permits duplicate
 * expression keys and silently clobbers the first authored object.
 *
 * This constrained decoding is a new model generation policy, NOT a
 * post-hoc repair, alternate author, synthetic source, or SOURCE pass.
 * Local non-Ollama-compatible ports keep the old JSON-object format.
 */
const r125obj=(properties,required)=>({
 type:'object',properties,required,additionalProperties:false
});
const r125enum=(...choices)=>({type:'string',enum:choices});
const r125int=(minimum,maximum)=>({type:'integer',minimum,maximum});
export const validR125RevisionDiagnosis=value=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||
  !['status','sourceVerified','compilerReason',...(Object.hasOwn(value,'spatialFootprint')?
   ['spatialFootprint']:[])].sort().every(k=>Object.hasOwn(value,k))||
  Object.keys(value).sort().join(',')!==[
   'status','sourceVerified','compilerReason',...(Object.hasOwn(value,'spatialFootprint')?
    ['spatialFootprint']:[])].sort().join(',')||
  !/^HOLD_[A-Z0-9_]{3,80}$/.test(value.status)||value.sourceVerified!==false||
  !/^R125_[A-Z0-9_]{3,100}$/.test(value.compilerReason))return false;
 if(value.spatialFootprint!==undefined){
  const f=value.spatialFootprint;
  if(!f||typeof f!=='object'||Array.isArray(f)||
   Object.keys(f).sort().join(',')!=='declared,required'||
   !f.declared||!f.required||Object.keys(f.declared).sort().join(',')!=='depth,width'||
   Object.keys(f.required).sort().join(',')!=='depth,height,width'||
   ![f.declared.width,f.declared.depth].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=32)||
   ![f.required.width,f.required.depth,f.required.height].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=32))
   return false;
 }
 return JSON.stringify(value).length<=3000;
};
const r125slug={type:'string',pattern:'^[a-z][a-z0-9-]{2,39}$'};
const r125text=(maxLength)=>({type:'string',minLength:3,maxLength});
const r125FixtureRoles=['counter','workbench','display','storage','seating',
 'bed','desk','washbasin','electronics','oven',
 'service-bay','tool-rack','teaching-board','inspection-stand','assembly-table','large-table','table'];
const r125Room=r125obj({
 id:r125slug,purpose:r125text(180),
 access:r125enum('public','shared','staff'),
 fixtures:{type:'array',items:{type:'string',enum:r125FixtureRoles},
  minItems:1,maxItems:5},
 fixtureDetail:r125enum('crafted'),
 fixtureArrangement:r125enum('focal-island','table-group'),
 ovenHearth:r125enum('accent'),
 daylight:r125enum('wide-bay','clerestory','paired-bays','panorama')
},['id','purpose','access']);
const r125SpatialVolumeProperties={
 width:r125int(6,14),depth:r125int(6,14),roofY:r125int(6,10),
 roofForm:r125enum('ridge','shed','gable','hip'),roofAxis:r125enum('x','z'),
 facadeRelief:r125enum('front-piers'),
 attach:r125obj({to:r125slug,side:r125enum('east','west','north','south'),
  shift:{type:'integer',minimum:-3,maximum:3}
 },['to','side','shift'])
};
const r125SpatialVolume=(attached)=>{
 const properties=Object.fromEntries(Object.entries(r125SpatialVolumeProperties)
  .filter(([key])=>(attached||key!=='attach')&&
   key!=='roofForm'&&key!=='roofAxis'));
 const required=['width','depth','roofY',...(attached?['attach']:[])];
 const flat=r125obj(properties,required);
 const roofed=r125obj({...properties,roofForm:r125enum('ridge','shed','gable','hip'),
  roofAxis:r125enum('x','z')},[...required,'roofForm','roofAxis']);
 return {anyOf:[flat,roofed],description:
  'Flat volume omits both roofForm and roofAxis; ridge, shed, gable or hip volume requires both.'};
};
const r125RootSpatialVolume=r125SpatialVolume(false);
const r125AttachedSpatialVolume=r125SpatialVolume(true);
const r125SpatialRoom=(volume,root=false)=>{
 const properties={...r125Room.properties,volume,
  ...(root?{access:r125enum('public','shared')}: {})};
 const required=[...r125Room.required,'volume'];
 const enclosed=r125obj(properties,required);
 if(!root)return enclosed;
 const outdoorProperties={...properties,spatialUse:r125enum('open-court'),
  volume:r125obj({width:r125int(6,14),depth:r125int(6,14),roofY:r125int(6,10)},['width','depth','roofY'])};
 delete outdoorProperties.daylight;
 const court=r125obj(outdoorProperties,[...required,'spatialUse']);
 // Complete alternatives for decoder grammars; no indoor window or roof
 // on an explicitly outdoor root. Attached rooms cannot be open-court.
 return {...r125obj({...properties,spatialUse:r125enum('open-court')},required),
  anyOf:[enclosed,court]};
};
const r125RootSpatialRoom=r125SpatialRoom(r125RootSpatialVolume,true);
const r125AttachedSpatialRoom=r125SpatialRoom(r125AttachedSpatialVolume);
const r125BayValues=[35,40,45,50,55,60,65,70];
const r125BayPair={type:'array',minItems:2,maxItems:2,
 items:{type:'integer',enum:r125BayValues},
 enum:r125BayValues.flatMap((first,i)=>
  r125BayValues.slice(i+6).map(second=>[first,second]))};
const r125Level=r125obj({
 splitAxis:r125enum('x','z'),splitPercent:{type:'integer',enum:[30,35,40,45,50,55,60,65,70]},
 secondarySplitPercent:{type:'integer',enum:[25,30,35,40,45,50,55,60,65,70,75]},
 rearBayPercentages:r125BayPair,
 sideBayPercentages:r125BayPair,
 thirdRoomLink:r125enum('first-and-second'),
 spaces:{type:'array',items:r125Room,minItems:2,maxItems:4}
},['splitAxis','splitPercent','spaces']);
// The original JSON-only Schema still permitted impossible combinations such as
// split-monitor + an upper setback + a courtyard cut. Keep every historical
// ArchitecturePlan valid; constrain only NEW local Ollama authorship, with
// alternative complete object shapes instead of prompt-only warnings.
// Disjoint alternatives preserve the model's independent form decisions.
// Match validateArchitecturePlan: an open-air rear cut may be 3x3,
// while a paved court requires >=4 in BOTH dimensions and an explicit side.
const r125Corner={...r125obj({
 width:r125int(3,8),depth:r125int(3,8),
 side:r125enum('east','west'),access:r125enum('paved')
},['width','depth']),anyOf:[
 r125obj({width:r125int(3,8),depth:r125int(3,8),
  side:r125enum('east','west')},['width','depth']),
 r125obj({width:r125int(4,8),depth:r125int(4,8),
  side:r125enum('east','west'),access:r125enum('paved')},
  ['width','depth','side','access'])
]};
const r125ExpressionFields={
 setbackSide:r125enum('none','east','rear','front'),
 setbackDepth:{type:'integer',enum:[0,2,3,4]},
 roofProfile:r125enum('flat','ridge','sawtooth','split-monitor','hip'),
 roofAxis:r125enum('x','z'),
 facadeLanguage:r125enum('plain','fins','screen','recessed-portico')
};
const r125ExpressionRequired=['setbackSide','setbackDepth',
 'roofProfile','roofAxis','facadeLanguage'];
const r125Expr=({roof,side,depth,axis,volume=false,corner=false,
 frontCourt=false,rearCourt=false,facade=null,monitorDaylight=false,
 pitchedEave=false,steepRidge=false}={})=>r125obj({
 ...r125ExpressionFields,
 roofProfile:r125enum(...roof),
 setbackSide:r125enum(...side),
 setbackDepth:{type:'integer',enum:depth},
 roofAxis:r125enum(...axis),
 ...(volume?{roofVolume:r125enum('raised')}:{}),
 ...(corner?{rearCornerCut:r125Corner}:{}),
 ...(frontCourt?{frontCornerCut:r125obj({
  width:r125int(3,8),depth:r125int(3,8),
  side:r125enum('east','west'),access:r125enum('paved')
 },['width','depth','side','access'])}:{}),
 ...(rearCourt?{rearCourt:r125obj({
  width:r125int(6,14),depth:r125int(4,10),
  alignment:r125enum('west','center','east'),
  entrySide:r125enum('west','east'),access:r125enum('paved')
 },['width','depth','alignment','entrySide','access'])}:{}),
 ...(facade?{facadeLanguage:r125enum(...facade)}:{}),
 ...(pitchedEave?{roofOverhang:r125enum('one-block')}:{}),
 ...(steepRidge?{ridgeProfile:r125enum('steep','tapered')}:{}),
 ...(monitorDaylight?{
  daylightFacade:r125enum('east-and-rear-bays'),
  roofOverhang:r125enum('one-block')
 }:{})
},[...r125ExpressionRequired,...(volume==='required'?['roofVolume']:[]),
 ...(corner==='required'?['rearCornerCut']:[]),
 ...(frontCourt?['frontCornerCut']:[]),
 ...(rearCourt?['rearCourt']:[]),
 ...(pitchedEave?['roofOverhang']:[]),
 ...(steepRidge?['ridgeProfile']:[])]);
const r125Expression={
 anyOf:[
  // Flat massing, including real outdoor court OR upper setback.
  r125Expr({roof:['flat'],side:['none'],depth:[0],axis:['x','z']}),
  r125Expr({roof:['flat'],side:['east','rear'],depth:[2,3,4,6,8],
   axis:['x','z']}),
  // New author-selected front-facing two-cell upper terrace, real parapet.
  r125Expr({roof:['flat'],side:['front'],depth:[2],axis:['x','z']}),
  r125Expr({roof:['flat'],side:['none'],depth:[0],axis:['x','z'],
   corner:'required'}),
  // Author-owned front-corner massing with supported open-sky floor.
  r125Expr({roof:['flat'],side:['none'],depth:[0],axis:['x','z'],
   frontCourt:true,facade:['plain']}),
  // Model-placed central opening creates genuine U-shaped primary mass.
  r125Expr({roof:['flat'],side:['none'],depth:[0],axis:['x','z'],
   rearCourt:true,facade:['plain']}),
  // The AUTHOR may choose a true pitched roof for the U mass.
  r125Expr({roof:['ridge'],side:['none'],depth:[0],axis:['x','z'],
   volume:'required',rearCourt:true,facade:['plain']}),
  // Local model authors MUST choose a thin, raised skin for every pitched
  // roof. A solid flat cap plus thick pitched ribs concealed the interior
  // in a genuine unseen weather exhibition trial (SOURCE PASS, ART HOLD).
  // Preserves genre-independent choice of profile, axis, setbacks and program.
  // Saved original plans and the deterministic B143 HOST are unchanged.
  // A rear courtyard with a ridge also requires that raised volume.
  r125Expr({roof:['ridge','sawtooth'],side:['none'],depth:[0],
   axis:['x','z'],volume:'required'}),
  r125Expr({roof:['ridge','sawtooth'],side:['east','rear'],
   depth:[2,3,4,6,8],axis:['x','z'],volume:'required'}),
  r125Expr({roof:['ridge','sawtooth','hip'],side:['front'],
   depth:[2],axis:['x','z'],volume:'required'}),
  // Explicit AI-authored narrow-ridge geometry: no automatic changes to
  // broad-roof historical designs, and no unsupported corner seams.
  r125Expr({roof:['ridge'],side:['none'],depth:[0],
   axis:['x','z'],volume:'required',steepRidge:true}),
  r125Expr({roof:['ridge'],side:['east','rear'],
   depth:[2,3,4,6,8],axis:['x','z'],volume:'required',steepRidge:true}),
  r125Expr({roof:['ridge'],side:['none'],depth:[0],
   axis:['x','z'],volume:'required',corner:'required'}),
  // Raised pitched eaves are a DISTINCT author-selected geometry variant;
  // old bare roofs remain valid and byte-for-byte unchanged.
  r125Expr({roof:['ridge','sawtooth'],side:['none'],depth:[0],
   axis:['x','z'],volume:'required',pitchedEave:true}),
  r125Expr({roof:['ridge','sawtooth'],side:['east','rear'],
   depth:[2,3,4,6,8],axis:['x','z'],volume:'required',pitchedEave:true}),
  // Author-selected hipped roof, not a housing-only fixed template.
  r125Expr({roof:['hip'],side:['none'],depth:[0],axis:['x','z'],volume:'required'}),
  r125Expr({roof:['hip'],side:['east','rear'],depth:[2,3,4,6,8],axis:['x','z'],volume:'required'}),
  r125Expr({roof:['hip'],side:['none'],depth:[0],axis:['x','z'],volume:'required',pitchedEave:true}),
  r125Expr({roof:['hip'],side:['east','rear'],depth:[2,3,4,6,8],axis:['x','z'],volume:'required',pitchedEave:true}),
  // Monitor requires full raised volume, x axis, NO upper setback.
  // Last-level x partition and single-level daylight variants remain
  // checked by the independent HOST; unsupported source is still HOLD.
  r125Expr({roof:['split-monitor'],side:['none'],depth:[0],
   axis:['x'],volume:'required',monitorDaylight:true})
 ]
};
// Bind number of storeys to possible upper-storey setbacks at GENERATION.
// Root alternatives must be disjoint and complete: conditional if/then/else
// is not reliably honored by llama.cpp-backed constrained JSON decoding.
// This changes only the local author's grammar, never its original response,
// the independent HOST validation, or the frozen B143 compiler.
const r125OneLevelExpression={anyOf:r125Expression.anyOf.filter(v=>
 v.properties.setbackSide.enum.length===1&&
 v.properties.setbackSide.enum[0]==='none'&&
 v.properties.setbackDepth.enum.length===1&&
 v.properties.setbackDepth.enum[0]===0)};
const r125PlanProperties={
 schema:{type:'string',enum:[R125_PLAN_SCHEMA]},
 id:r125slug,title:r125text(180),brief:r125text(500),
 footprint:r125obj({width:r125int(16,32),depth:r125int(16,32)},
  ['width','depth']),
 levels:{type:'array',items:r125Level,minItems:1,maxItems:2},
 materials:r125obj({
  floor:r125enum('wood','stone','concrete'),
  wall:r125enum('concrete','stone','wood','metal'),
  roof:r125enum('stone','metal','wood','concrete')
 },['floor','wall','roof']),
 entryZone:r125enum('first','second'),expression:r125Expression,
 observationLink:r125obj({viewerSpaceId:r125slug,workSpaceId:r125slug},
  ['viewerSpaceId','workSpaceId'])
};
const r125PlanRequired=['schema','id','title','brief','footprint','levels','materials'];
// Room-count-specific closed shapes prevent irrelevant partition controls
// from reaching the strict planner (e.g. rear bays on a three-room floor).
// Four-room bay pairs are optional only where the corresponding partition
// exists, and their grammar admits strictly ascending percentages only.
const r125LevelShape=(roomCount,axisChoices,percentChoices,
 {secondary=false,bay=null}={})=>{
 const properties={
  splitAxis:r125enum(...axisChoices),
  splitPercent:{type:'integer',enum:percentChoices},
  spaces:{type:'array',items:r125Room,minItems:roomCount,maxItems:roomCount},
  ...(secondary?{
   secondarySplitPercent:{type:'integer',enum:[25,30,35,40,45,50,55,60,65,70,75]},
   thirdRoomLink:r125enum('first-and-second')}:{}),
  ...(bay==='rear'?{rearBayPercentages:r125BayPair}:{}),
  ...(bay==='side'?{sideBayPercentages:r125BayPair}:{})
 };
 return r125obj(properties,['splitAxis','splitPercent','spaces']);
};
const r125RegularSplit=[30,35,40,45,50,55,60,65,70];
const r125CompactSplit=[20,25,...r125RegularSplit];
// New model authors must leave real minimum clear spans in 4-room layouts.
// The independent HOST still accepts historical 20/25% authored proposals;
// neither saved designs nor their compiled geometry are touched.
const r125FourRoomFrontSafeSplit=[30,35,40,45,50];
const r125FourRoomSideSafeSplit=[30,35,40,45,50,55,60];
const r125OneLevel={...r125Level,
 properties:{...r125Level.properties,
  splitPercent:{type:'integer',enum:r125CompactSplit},
  spaces:{...r125Level.properties.spaces,maxItems:4}},
 anyOf:[
  r125LevelShape(2,['x','z'],r125RegularSplit),
  r125LevelShape(3,['x','z'],r125RegularSplit,{secondary:true}),
  r125LevelShape(4,['z'],r125FourRoomFrontSafeSplit,{bay:'rear'}),
  r125LevelShape(4,['x'],r125FourRoomSideSafeSplit,{bay:'side'})
 ]};
const r125LevelTwo={...r125Level,
 properties:{...r125Level.properties,
  spaces:{...r125Level.properties.spaces,maxItems:3}},
 anyOf:[
  r125LevelShape(2,['x','z'],r125RegularSplit),
  r125LevelShape(3,['x','z'],r125RegularSplit,{secondary:true})
 ]};
const r125SpatialLevel={...r125obj({
 layoutMode:r125enum('spatial-tree'),rootSpace:r125RootSpatialRoom,
 attachedSpaces:{type:'array',items:r125AttachedSpatialRoom,minItems:1,maxItems:3}
},['layoutMode','rootSpace','attachedSpaces']),description:'Separate model-authored attached room volumes with individual footprints and roof heights; choose only when distinct functions benefit from separate massing.'};
const r125SpatialPlanVariant=()=>{
 const properties={...r125PlanProperties,
  entry:r125obj({shelterDepth:{type:'integer',enum:[1,2,3]},
   portalStyle:r125enum('projecting-frame')},['shelterDepth'])};
 delete properties.expression;delete properties.entryZone;
 return {...r125obj({...properties,
  levels:{...properties.levels,items:r125SpatialLevel,minItems:1,maxItems:1}
 },r125PlanRequired),description:'Model-authored separate connected room volumes; select only when independent functions benefit from distinct footprints or roof heights.'};
};
const r125OneLevelShelteredExpression={anyOf:r125OneLevelExpression.anyOf
 .filter(v=>!['rearCornerCut','frontCornerCut','rearCourt']
  .some(k=>Object.hasOwn(v.properties,k)))
 .map(v=>({...v,properties:{...v.properties,
  facadeLanguage:r125enum(...v.properties.facadeLanguage.enum
   .filter(value=>value!=='recessed-portico'))}}))};
const r125ShelteredPlanVariant=()=>({...r125obj({
 ...r125PlanProperties,
 entry:r125obj({shelterDepth:{type:'integer',enum:[3]}},['shelterDepth']),
 levels:{...r125PlanProperties.levels,
  items:r125OneLevel,minItems:1,maxItems:1},
 expression:r125OneLevelShelteredExpression
},[...r125PlanRequired,'entry','expression']),
 description:'One-storey model-authored conventional plan with an explicit 6-wide, 3-deep recessed roofed entry; the authored room count, footprint and roof remain model-selected.'});
// Bind the four-room conventional hub/spine to compatible envelope choices.
const r125OneLevelRoomRange=(min,max)=>({...r125OneLevel,
 properties:{...r125OneLevel.properties,spaces:{
  ...r125OneLevel.properties.spaces,minItems:min,maxItems:max}},
 anyOf:r125OneLevel.anyOf.filter(v=>
  v.properties.spaces.minItems>=min&&v.properties.spaces.maxItems<=max)
});
const r125PlanVariant=(levelCount,expression,levelShape=levelCount===2?r125LevelTwo:r125OneLevel)=>({...r125obj({
 ...r125PlanProperties,
 levels:{...r125PlanProperties.levels,
  items:levelShape,
  minItems:levelCount,maxItems:levelCount},
 expression
},[...r125PlanRequired,'expression']),description:'Conventional shared-envelope room splits for programs better served by one coherent outer form.'});
export const R125_ARCHITECTURE_RESPONSE_SCHEMA={
 anyOf:[
  // JSON-schema decoders tend to favor earlier disjoint variants. Put the
  // authored per-room massing grammar first so activity-led volumes are a real
  // default option, while preserving both compatible rectangular fallbacks.
  r125SpatialPlanVariant(),
  r125PlanVariant(1,r125OneLevelExpression,r125OneLevelRoomRange(2,3)),
  r125ShelteredPlanVariant(),
  r125PlanVariant(2,r125Expression),
  r125PlanVariant(1,r125OneLevelShelteredExpression,r125OneLevelRoomRange(4,4))
 ]
};

/** Deterministic wire-format conversion for the position-dependent spatial
 * attachment rule. Raw provider bytes are never changed. Only explicit room
 * objects are moved into the legacy compiler's ordered `spaces` array.
 */
export function normalizeR125SpatialTreeResponse(raw){
 if(typeof raw!=='string'||raw.length<1||raw.length>60000)
  refuse('SPATIAL_NORMALIZATION_RAW_SIZE');
 const originalSha256=createHash('sha256').update(raw).digest('hex');
 let parsed;
 try{parsed=JSON.parse(raw);}catch{refuse('PLAN_NOT_JSON');}
 let plan=parsed,applied=false,roomMapping=[];
 const level=parsed?.levels?.[0];
 if(level?.layoutMode==='spatial-tree'&&
   (Object.hasOwn(level,'rootSpace')||Object.hasOwn(level,'attachedSpaces'))){
  if(Object.hasOwn(level,'rootSpace')&&Array.isArray(level.attachedSpaces)){
   if(Object.hasOwn(level,'spaces'))
    refuse('SPATIAL_NORMALIZATION_AMBIGUOUS_FORMAT');
   plan=structuredClone(parsed);
   const target=plan.levels[0];
   const authoredRooms=[target.rootSpace,...target.attachedSpaces];
   roomMapping=authoredRooms.map((room,index)=>({
    sourcePath:index===0?'levels[0].rootSpace':`levels[0].attachedSpaces[${index-1}]`,
    targetPath:`levels[0].spaces[${index}]`,id:room?.id??null,
    ...(index>0?{attach:structuredClone(room?.volume?.attach??null)}:{})
   }));
   delete target.rootSpace;delete target.attachedSpaces;
   target.spaces=authoredRooms;
   applied=true;
  }
 }
 const normalizedPlanJson=JSON.stringify(plan,null,2)+'\n';
 return {plan,normalizedPlanJson,normalization:{
  schema:'r125-spatial-tree-wire-normalization-v1',applied,
  originalResponseSha256:originalSha256,normalizedPlanSha256:
   createHash('sha256').update(normalizedPlanJson).digest('hex'),
  conversion:applied?'rootSpace_attachedSpaces_to_ordered_spaces':'none',
  roomMapping,roomsAdded:0,roomsDropped:0,roomFieldsInferred:0,
  attachmentFieldsInferred:0,originalEdited:false
 }};
}

export function r125RequiresWorkObservation(prompt){
 return typeof prompt==='string'&&
  /(?:組立|組み立て|製作|制作|点検|作業).{0,48}(?:ガラス|窓).{0,48}(?:見学|見学でき|見える|見る|観察)|(?:ガラス|窓).{0,48}(?:組立|組み立て|製作|制作|点検|作業).{0,48}(?:見学|見学でき|見える|見る|観察)|(?:組立|組み立て|製作|制作|点検|作業).{0,24}(?:見学|観察|見える).{0,32}(?:作業|様子|工程)/i.test(prompt);
}

/** Revision preserves access to previously authored extensions, not a
 * requirement to keep every decoration when the author redesigns. */
export function r125RevisionResponseFormat(format,previous,{observationRequired=false}={}){
 if(format?.type!=='json_schema')return format;
 const next=structuredClone(format),schema=next.json_schema.schema;
 const allowedObservation=observationRequired||Object.hasOwn(previous,'observationLink');
 if(!allowedObservation)for(const v of schema.anyOf)delete v.properties.observationLink;
 const extensions=['blockPalette','windowRelief','wallRelief','roofSurface'];
 const allowed=extensions.filter(k=>Object.hasOwn(previous,k));
 if(!allowed.length)return next;
 if(allowed.includes('roofSurface')&&!allowed.includes('blockPalette'))refuse('REVISION_ROOF_PALETTE_REQUIRED');
 // Use the same catalog as fresh generation, but do not add unrelated
 // choices to this revision or alter the archived author plan.
 const prepared=prepareR125BlockPaletteRequest({response_format:next,messages:[{role:'system',content:'Revision extension choices'}]});
 const result=prepared.response_format;
 for(const v of result.json_schema.schema.anyOf)
  for(const k of extensions)if(!allowed.includes(k))delete v.properties[k];
 if(allowed.includes('roofSurface'))constrainR125RoofSurfaceChoices(result.json_schema.schema);
 return result;
}
export function r125ResponseFormatForEndpoint(endpoint,{observationRequired=false,spatialTreeOnly=false,revisionBase=null}={}){
 if(endpoint==='http://127.0.0.1:11434/v1/chat/completions'){
  const schema=structuredClone(R125_ARCHITECTURE_RESPONSE_SCHEMA);
  if(spatialTreeOnly)schema.anyOf=[schema.anyOf[0]];
  if(observationRequired){
   for(const variant of schema.anyOf){
    if(!variant.required.includes('observationLink'))
     variant.required.push('observationLink');
    // A narrow rear bay can physically fit fixtures yet leave no reachable
    // visitor pad or eye-level ray across the authored glass. Balance all
    // model-selected three-room T wings before generation; SOURCE remains
    // the exact final gate for the actual equipment and sightline.
    const shapes=variant.properties.levels.items.anyOf??[];
    for(const shape of shapes){
     if(shape.properties?.secondarySplitPercent)
      shape.properties.secondarySplitPercent.enum=[45,50,55];
    }
   }
  }
  const format={type:'json_schema',json_schema:{
   name:'r125_architecture_plan_v11',strict:true,schema}};
  return revisionBase===null?format:r125RevisionResponseFormat(format,revisionBase,{observationRequired});
 }
 return {type:'json_object'};
}

export function createR125ArchitecturePlanLocalAdapter({
 model,endpoint=DEFAULT_LOCAL_ENDPOINT,fetcher=fetch,timeoutMs=180000,
reasoningEffort=undefined,maxOutputTokens=4096,spatialTreeOnly=false,onRawModelResponse,
onNormalizedModelPlan=null,signal,allowDelegatedDimensions=false
}={}){
 if(typeof model!=='string'||!MODEL_RE.test(model))
  refuse('EXPLICIT_MODEL_ID_REQUIRED');
 const port=typeof endpoint==='string'?ENDPOINT_RE.exec(endpoint):null;
 if(!port||Number(port[1])<1||Number(port[1])>65535)
  refuse('ONLY_EXPLICIT_127_0_0_1_CHAT_COMPLETIONS_ALLOWED');
 if(typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||
    timeoutMs<1000||timeoutMs>900000)refuse('INVALID_LOCAL_OPTIONS');
 if(reasoningEffort!==undefined&&!['none','low','medium','high'].includes(reasoningEffort))
  refuse('INVALID_REASONING_EFFORT');
 if(!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<256||
    maxOutputTokens>16384)refuse('INVALID_MAX_OUTPUT_TOKENS');
 if(typeof spatialTreeOnly!=='boolean')refuse('INVALID_SPATIAL_TREE_MODE');
 if(typeof allowDelegatedDimensions!=='boolean')refuse('INVALID_DELEGATION_MODE');
 if(typeof onRawModelResponse!=='function')
  refuse('REQUIRED_RAW_CAPTURE_CALLBACK');
 if(onNormalizedModelPlan!==null&&typeof onNormalizedModelPlan!=='function')
  refuse('INVALID_NORMALIZED_CAPTURE_CALLBACK');
 if(signal!==undefined&&typeof signal?.addEventListener!=='function')
  refuse('INVALID_ABORT_SIGNAL');
 const system=[
  "You are an inventive architectural designer. Turn the original Japanese request into a beautiful, useful, coherent building. No fixed building-type template. Return ONE strict JSON object, no Markdown, B143 elements, commands, absolute voxel coordinates or claims of testing.",
  "DESIGN STRATEGY FIRST: Imagine arrival, use and departure. Choose one memorable architectural idea and express it through actual supported roof, volume, facade and daylight fields, not a poetic title. Before choosing the geometry, compare at least two feasible silhouettes or spatial compositions in your reasoning: how would each change arrival, light, use or character? Select the one that best serves the request, not merely the easiest JSON. Choose the simplest adequate spatial program, not the simplest shell: combine compatible activities; add a separate room, floor or specialist station only when it genuinely helps the brief. Small means compact but usable, not minimum footprint regardless of fit. Prefer fewer generous usable spaces over many cramped ones. Neither flat nor pitched roofs, conventional nor spatial-tree, are mandatory styles.",
  "ESSENTIAL ACTIVITY COVERAGE: Infer necessary activities even when equipment is unnamed. Match activities and actual fixtures in the same room: bake or heat food -> oven; wash -> washbasin; sleep -> bed; fabrication -> workbench/assembly-table; repair -> service-bay/tool-rack; instruction -> teaching-board; inspection -> inspection-stand; records -> desk; large charts -> large-table; exhibit -> display. For each room choose the complete set of fixtures needed for its own purpose, not one token object. Seated reading, meals or seated work need both seating and a suitable table or desk; storing objects needs storage. Do not add unrelated functions or substitute decorative labels for real geometry.",
  "ACTIVITY-LED FLOOR PROGRAM / AREA-BEFORE-ENVELOPE: Plan furniture, two-wide access and room sizes before deciding the smallest useful overall footprint. Never invent equipment roles; HOST must not automatically shrink authored rooms or add furniture. Avoid a mostly empty second floor or excessive subdivision; genuinely busy rooms may need multiple stations. Keep rooms appropriate to their purpose, not arbitrary maximization of equipment.",
  "REAL ROOM BUDGET: ordinary fixtures 3x1; seating/washbasin/oven/electronics/table 3x2; bed 3x4; tool-rack/teaching-board 5x1; service-bay 5x4; inspection-stand 3x3; assembly-table 5x3; large-table 7x5. A 3-wide control room cannot hold large machines. Before choosing fixtures, compare their summed minimum footprints against clear interior area; each must fit in at least one orientation and leave connected two-wide circulation and an approach. Area alone does not prove fit. large-table is for oversized objects, not ordinary reading or dining; service-bay is machine service, not customer service.",
  "ACCESS: Model-check the entry/door/attach graph with staff-only rooms removed; every public/shared room must remain reachable from the entrance. Front (small z) entry reaches first room on z-split; x-split entryZone:first|second chooses the entered public/shared room. If three rooms form a chain, if room 2 is staff and room 3 is public/shared, set thirdRoomLink:\"first-and-second\". Never relabel staff to fake access.",
  "STAIRS: Two floors only when distinct vertical use warrants them; keep x=3..4,z=3..7 shaft/treads and x=3..4,z=8..9 landing unobstructed by walls, doors and fixtures. For z-split a ground-floor front room must extend past z=9 if it contains the stair. For upstairs public rooms the landing must be public/shared; a staff-only FIRST upper room can block guests. A front terrace is NOT a substitute path. Prefer a single floor when it meets the brief better.",
  "JSON: schema exactly minecraftaibuilder-r125-architecture-plan-v1. Top-level schema,id,title,brief,footprint,levels,materials, plus permitted entry,entryZone,expression,observationLink. IDs lowercase hyphen slugs 3..39 characters; title/brief/purpose meaningful strings. Room requires id,purpose,access:public|shared|staff. Optional fixtures array 1..5; fixtureDetail:\"crafted\", fixtureArrangement:\"focal-island\" or \"table-group\" (one table first, seating later in fixtures; keep usable space between them), ovenHearth:\"accent\" only with oven, daylight. Never output legacy fixture or fixtureScale. Use structured fields for every claimed shape; prose does not generate geometry.",
  "footprint EXACT {width:integer 16..32,depth:integer 16..32}. Conventional levels:1 or 2; 2..3 rooms per floor, 4 only on a single floor. splitAxis:x|z; splitPercent 30..70 step 5. first room occupies WEST for x; first room occupies FRONT for z. For 3 rooms optional secondarySplitPercent 25..75 step 5 is FRONT share of the EAST wing for x, WEST share of rear wing for z. Omit on 2 rooms.",
  "FOUR rooms: z front hub (width>=22,depth>=18,splitPercent 30..50), or x west spine (width>=20,depth>=22,splitPercent 30..60,entryZone:first). First public/shared; direct two-wide doors to three rooms. Optional rearBayPercentages (z) or sideBayPercentages (x): two values 35..70 step 5, gap>=30. Omit for equal bays. Hub/spine >=4 clear cells, rear >=6 or east >=5. No courts/recessed-portico.",
  "SPATIAL-TREE: layoutMode:\"spatial-tree\" on a single level. rootSpace is public/shared and its volume MUST OMIT attach. attachedSpaces contains 1..3 rooms; EVERY room MUST include volume.attach to an earlier authored room ID, side east/west/north/south, shift -3..3. Width/depth 6..14, roofY 6..10 (clear interior = dimensions minus 2). Join on one shared wall with >=4 common cells for a real two-wide door. No volume overlaps; allow exterior entry and real windows. For spatial-tree OMIT expression and entryZone; use optional entry.shelterDepth:1..3 and portalStyle:\"projecting-frame\", volume.facadeRelief:\"front-piers\", roofForm:ridge|shed|gable|hip with roofAxis:x|z (omit both for flat). Hip needs width>=8/depth>=12 for x, width>=12/depth>=8 for z. Vary connected volumes and heights only as useful. Site width/depth must cover the bounding span of connected volumes plus four cells; depth also includes shelterDepth. HOST does not enlarge an undersized footprint unless the explicit experimental siteFit delegation is selected.",
  "Optional spatial-tree root spatialUse:\"open-court\" for genuine outdoor activity: keep roofY, omit daylight, roofForm, roofAxis; other rooms enclosed. Not an indoor substitute.",
  "Fixtures: counter|workbench|display|storage|seating|bed|desk|washbasin|electronics|oven|service-bay|tool-rack|teaching-board|inspection-stand|assembly-table|large-table|table. Crafted/focal-island need fixtures. table-group places seating facing the single authored table with a clear gap; choose it only for a genuinely shared activity. Equipment is a physical proxy, not working machinery. Select ROOM-APPROPRIATE fixture, not filler.",
  "DAYLIGHT: wide-bay is exactly 4 blocks (requires an exposed wall at least 8 blocks long; a 6x6 volume cannot use it); paired-bays two 3x2 windows (faces >=7), root entrance-flanking paired-bays needs width at least 14. panorama exact 8x2 (face >=12); clerestory high window. Leave sill, lintel, exterior air and usable interior approach; no entrance, attached joint or door may overlap it. If none fits, omit daylight for that room only if compatible with the brief; otherwise reconsider room geometry. Never emit daylight:none.",
  "Materials floor:wood|stone|concrete; wall:concrete|stone|wood|metal; roof:stone|metal|wood|concrete. Use coherent contrast rather than mere color changes.",
  "CONVENTIONAL: actively SELECT an expression with setbackSide,setbackDepth,roofProfile,roofAxis,facadeLanguage. One expression only. roofProfile:flat|ridge|sawtooth|split-monitor|hip; roofAxis:x|z; facadeLanguage:plain|fins|screen|recessed-portico. All pitched roofs require raised roof volume via roofVolume:\"raised\"; omit for flat. ridgeProfile:\"steep\" or \"tapered\" only with raised ridge, no courts/corner cuts. roofOverhang:\"one-block\" on compatible raised ridge/sawtooth/hip (not rearCornerCut). split-monitor requires raised roof, x axis, no setback, last-level x split.",
  "SETBACK: one floor none+0. Two floors none+0, east/rear with depth 2|3|4|6|8 (6/8 requires footprint.width >= 28 for east or footprint.depth >= 28 for rear), or front+2 for a street-facing upper terrace. Keep stairs and room program viable.",
  "COURTS: rearCourt:{width:6..14,depth:4..10,alignment:west|center|east,entrySide:west|east,access:paved}: one floor, flat or ridge roof with roofVolume:\"raised\", plain, no setback/eaves/cuts; footprint >= court.width+12 by court.depth+14. frontCornerCut:{width:3..8,depth:3..8,side:east|west,access:paved}: one floor, flat, plain, no setback/other cut; width>=2*cut.width+8, depth>=cut.depth+10. rearCornerCut: width/depth 3..8 without access, or BOTH 4..8 with explicit side and access:paved; none+0, flat or raised ridge without eaves; 6..8 deep/wide recess needs adequate site and actual access. No sawtooth/hip/monitor corner cuts. Choose outdoor space only when it serves the brief.",
  "VISUAL/WEATHER DESIGN TEST: recessed-portico REAL 9-block-wide, 3-deep entrance needs x split entryZone:first with splitCoordinate >= 11 or second with splitCoordinate <= footprint.width - 12; otherwise use plain/fins/screen. Conventional one-storey optional entry:{shelterDepth:3} is a six-wide three-deep recessed roofed entry; do not combine with recessed-portico or courts. One-block cover is not rain shelter.",
  "ROOF-TO-FACADE PROPORTION: a RAISED ridge roof can have a broad flat-looking top; tapered produces a narrow crest. Choose proportion, sunlight and silhouette together. A plain rectangular flat-roofed shell is a baseline, not an automatic answer. A deliberate flat design with strong window rhythm or coherent massing can be excellent; a raised roof can give a distinct silhouette; attached volumes can distinguish activities. Choose only compatible features that serve the concept, never add complexity for its own sake. Compare the selected fields against that concept before finalizing. Before returning JSON compare each room purpose with its own fixture array; check that requested light and views appear in actual daylight fields where people need them. Omit optional details if they cannot fit. Check actual access, clear stairs, equipment fit, usable windows, footprint and whether the design still meets the original request. Do not claim Minecraft walking, weatherproofing or equipment operation.",
 ].join('\n');
 return async function authorArchitecturePlan({prompt,repairContext=null,
  revisionContext=null}={}){
  if(typeof prompt!=='string'||prompt.length<8||prompt.length>8000)
   refuse('INVALID_MODEL_REQUEST');
  const revisionSystem=system+(spatialTreeOnly?'\nHOST-SELECTED EXPERIMENTAL RESPONSE FORM: This one trial is constrained to the existing spatial-tree JSON variant. This selects only the representation; it does not prescribe room count beyond the brief, room dimensions, attachment directions/shifts, roof heights/forms, or fixture choices. The author must choose those. The conventional variants are unavailable in this explicitly constrained experiment.':'')+(revisionContext?.sourceDiagnosis?'\nSOURCE DIAGNOSTIC REVISION: The supplied previousSourceDiagnosis is deterministic R125 compiler evidence, not a HOST proposal. Correct the named failure in your own complete R125 plan, preserve useful authored geometry and equipment when possible, and never report a diagnostic-only or HOST-adjusted result as your source.':'')+(revisionContext===null?'':'\n'+[
  'REVISION MODE — HIGHEST PRIORITY: this is NOT a fresh unknown brief and NOT a minor restyle. Read previousArchitecturePlan and revisionRequest in the user payload. Preserve the project identity and useful intent, then make a real whole-building revision that satisfies every requested function. When revisionRequest calls for independent activities or rooms, represent them with independently authored spaces and purposes; do not combine them in a way the request rejects. A response that changes only title, footprint, materials, or facade while keeping a deficient program is a failed revision.',
  'When revisionRequest asks for richer function, explicitly place the needed equipment in the model-authored fixture arrays, size its spaces for the stations, and keep clear two-wide routes. When it asks for a less box-like building or a new spatial composition, choose and declare a supported R125 massing/topology feature that changes the actual authored volumes or plan shape; decorative fins or a roof profile alone do not change a rectangular shell. Select any supported geometry that fits—spatial-tree is optional, never mandatory—and do not claim geometry that is absent from your JSON.',
  'Before answering, compare the complete proposed JSON to both previousArchitecturePlan and every requirement in revisionRequest. Do not return the same deficient structure. Return only one complete R125 ArchitecturePlan JSON; do not claim it passed source, walking, or art review.'
  ].join('\n'));
  if(repairContext!==null&&(
   typeof repairContext!=='object'||Array.isArray(repairContext)||
   Object.keys(repairContext).sort().join(',')!==
    'missingRequiredFixtureRoles,previousModelResponse,sourceIssueCodes'||
   typeof repairContext.previousModelResponse!=='string'||
   repairContext.previousModelResponse.length<10||
   repairContext.previousModelResponse.length>12000||
   !Array.isArray(repairContext.sourceIssueCodes)||
   repairContext.sourceIssueCodes.length<1||
   repairContext.sourceIssueCodes.length>5||
   repairContext.sourceIssueCodes.some(x=>typeof x!=='string'||!/^[-A-Z0-9_]{3,90}$/.test(x))||
   !Array.isArray(repairContext.missingRequiredFixtureRoles)||
   repairContext.missingRequiredFixtureRoles.length>10||
   repairContext.missingRequiredFixtureRoles.some(x=>
    typeof x!=='string'||!r125FixtureRoles.includes(x))))
   refuse('INVALID_MODEL_REPAIR_CONTEXT');
  if(revisionContext!==null&&(
   repairContext!==null||typeof revisionContext!=='object'||
   Array.isArray(revisionContext)||
   !['previousArchitecturePlan,revisionRequest',
    'previousArchitecturePlan,revisionRequest,sourceDiagnosis']
    .includes(Object.keys(revisionContext).sort().join(','))||
   typeof revisionContext.previousArchitecturePlan!=='object'||
   revisionContext.previousArchitecturePlan===null||
   Array.isArray(revisionContext.previousArchitecturePlan)||
   JSON.stringify(revisionContext.previousArchitecturePlan).length>20000||
   typeof revisionContext.revisionRequest!=='string'||
   revisionContext.revisionRequest.length<8||
   revisionContext.revisionRequest.length>8000||
   (Object.hasOwn(revisionContext,'sourceDiagnosis')&&
    !validR125RevisionDiagnosis(revisionContext.sourceDiagnosis))))
   refuse('INVALID_MODEL_REVISION_CONTEXT');
  const controller=new AbortController();
  const abortFromCaller=()=>controller.abort();
  if(signal?.aborted)controller.abort();
  else signal?.addEventListener('abort',abortFromCaller,{once:true});
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const res=await fetcher(endpoint,{
    method:'POST',signal:controller.signal,redirect:'error',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.55,
     response_format:r125ResponseFormatForEndpoint(endpoint,{
      observationRequired:r125RequiresWorkObservation(prompt),spatialTreeOnly,
      revisionBase:revisionContext?.previousArchitecturePlan??null}),max_tokens:maxOutputTokens,
     ...(reasoningEffort===undefined?{}:{reasoning_effort:reasoningEffort}),
     messages:[{role:'system',content:revisionSystem},
      {role:'user',content:JSON.stringify({
       // Literal task requirements are hints to the genuine author, not
       // a generated building plan, hidden role repair, or genre template.
       requiredFixtureRoles:inferR125ExplicitActivityRequirements(prompt)
        .map(x=>x.requiredRole),
       essentialTaskPlacementRule:'最優先: requiredFixtureRoles の全設備を必ず部屋の fixtures 配列に明記する。例えば組立と点検が同じ作業室なら fixtures:["assembly-table","inspection-stand"] とし、workbench だけでは代用不可。展示はdisplay、記録はdesk、広げて見る海図はlarge-table。必須設備を先に部屋へ割り当て、その部屋に十分な面積と2ブロック幅の利用経路を確保してから屋根・外観を設計する。fixtureScale は出力禁止。設備を勝手に省いたり、職員室を通る公開経路にしない。',
       observationRelationRule:r125RequiresWorkObservation(prompt)?
        'REQUIRED BY THIS BRIEF: include observationLink:{viewerSpaceId,workSpaceId}. Choose adjacent same-floor public/shared and staff/shared rooms, the latter with a real work fixture. HOST cuts actual 2x2 internal glass and proves reachable public standing access plus a clear ray to that fixture. Do not claim an unverified view; impossible geometry must remain SOURCE HOLD.':
        revisionContext&&Object.hasOwn(revisionContext.previousArchitecturePlan,'observationLink')?
        'Preserve the useful previously authored work-view relation when still required by the project; update its room IDs if needed. Do not invent unrelated viewing relations.':
        revisionContext?'Omit observationLink: no explicit work-view request or previous work-view relation is present.':
        allowDelegatedDimensions?'Omit observationLink unless the original request explicitly calls for visitors to watch actual staff work through an internal boundary. Ordinary shared/public rooms, bookshelves, displays, kitchens, natural light and views do not imply this relation. If explicitly requested, use adjacent same-floor public/shared viewer and staff/shared work room with a real work fixture. Otherwise use ordinary daylight and access fields.':
        'If visitors must watch actual staff WORK, not just view an exhibit, choose optional observationLink:{viewerSpaceId,workSpaceId}. Choose adjacent same-floor public/shared and staff/shared rooms, the latter with a work fixture. HOST cuts a real 2x2 internal glass panel and proves visitor standing access and a clear ray to work equipment; impossible choices HOLD. No automatic doors or false visibility claims. Omit for display-only requests.',
       architecturalRequest:prompt,
       sourceOnly:true,authorSemanticPlan:true,
       explicitLiteralEquipment:inferR125ExplicitActivityRequirements(prompt),
       explicitEquipmentRule:'Literal requirements are a minimum, never the complete task list. An empty list still requires you to infer essential building activities and select suitable supported fixtures. Every requiredRole string is an exact physical fixture, not a synonym: assembly-table is NOT workbench, inspection-stand is NOT workbench, and desk is NOT workbench. Place each required role in the model-chosen room performing its activity; keep two-wide approaches. No filler equipment.',
       groundFloorEntryRouteRule:'When a ground-floor z-split has ANY public/shared later room, spaces[0] MUST be public/shared; first staff then rear public is rejected. In x-splits with visitors, entryZone must enter a public/shared room. Preserve genuine staff-only functions and two-wide public access. Never fake a safe route.',
       upperFloorAccessRule:'Two floors are optional. If a ground-floor one-story public hub or side spine can serve every public function and separate staff tasks, prefer that plan. If two floors are authored with ANY upstairs public/shared room, the actual stair landing near x=3..4,z=8 and every approach to upstairs public rooms must stay in public/shared rooms, never through staff-only rooms. Make the upper stair landing part of the first public/shared room: choose splitAxis:x with spaces[0] public/shared (the west room contains x=3..4), or splitAxis:z with spaces[0] public/shared and a boundary beyond z=9 (the front room contains landing rows z=8..9). Do not assign either landing row to staff space. A room being public in JSON is not a safe path. If uncertain, keep visitors downstairs, staff upstairs.',
       crossFieldRule:'Decide levels first. With 1 level: setbackSide=none and setbackDepth=0. Only with 2 levels: east/rear may have depth 2, 3, 4, 6 or 8 (6/8 needs footprint width/depth >= 28). Invalid pair is rejected without retry.',
       ...(repairContext?{
        previousModelResponse:repairContext.previousModelResponse,
        originalSourceHoldCodes:repairContext.sourceIssueCodes,
        missingRequiredFixtureRoles:repairContext.missingRequiredFixtureRoles,
        modelRevisionRule:'You are making the ONLY allowed model-authored revision of your previous response. Repair missing literal equipment and invalid fixtureDetail/fixtureArrangement declarations in the correct functional rooms. Preserve an intelligible architectural design, room use, access, two-wide routes, and valid fields. You may revise room sizes/topology where necessary. Do not simply remove required rooms, equipment, or details to silence SOURCE errors. Return one complete revised ArchitecturePlan JSON; no HOST fixes, no tests claimed.'
       }:{}),
       ...(revisionContext?{
        previousArchitecturePlan:revisionContext.previousArchitecturePlan,
        revisionRequest:revisionContext.revisionRequest,
        revisionFeatureRule:'Preserve useful material and architectural intent from the previous plan. Previously selected blockPalette, windowRelief, wallRelief and roofSurface may be retained or changed when supported by the response schema; they are not mandatory ornaments. Do not silently remove user-required functions. Review-only block shapes are not proof of construction.',
        ...(revisionContext.sourceDiagnosis?{
         previousSourceDiagnosis:revisionContext.sourceDiagnosis,
         sourceDiagnosisRule:'Use this exact compiler diagnosis to correct the model-authored plan. No HOST geometry edits; no SOURCE pass claims.'
        }:{}),
        modelRevisionRule:'This is a new, complete model-authored revision of the supplied ArchitecturePlan. Treat the supplied plan as the design being revised, preserve its identity and all useful intent, and address every revision request through the architecture as a whole. You may change massing, number and arrangement of rooms, proportions, connections, roof, facade, and authored equipment when that improves the brief. Return exactly one complete valid ArchitecturePlan JSON. Do not return a patch, explanation, or host-side repair; do not claim unperformed tests.'
       }:{})})}]})
   });
   if(!res||res.ok!==true)
    refuse('LOCAL_HTTP_'+String(res?.status??'UNKNOWN'));
   const data=await res.json();
   if(!Array.isArray(data?.choices)||data.choices.length!==1)
    refuse('INVALID_RESPONSE_CHOICES');
   const choice=data.choices[0],raw=choice?.message?.content;
   if(typeof raw!=='string'||raw.length<1||raw.length>60000){
    // Preserve the full provider envelope privately when no usable content
    // string exists. This is diagnostic evidence, never ArchitecturePlan.
    onRawModelResponse(JSON.stringify(data),{
     finishReason:choice.finish_reason??null,
     usage:{promptTokens:null,completionTokens:null,totalTokens:null},
     captureKind:'provider-envelope-invalid-content'});
    refuse('INVALID_MODEL_CONTENT');
   }
   // MUST precede parsing, validation, source compilation and length rejection.
   const reportedUsage=data.usage&&typeof data.usage==='object'?data.usage:{};
   const count=key=>Number.isSafeInteger(reportedUsage[key])&&
    reportedUsage[key]>=0&&reportedUsage[key]<=10000000?
    reportedUsage[key]:null;
   onRawModelResponse(raw,{finishReason:choice.finish_reason??null,
    usage:{promptTokens:count('prompt_tokens'),
     completionTokens:count('completion_tokens'),
     totalTokens:count('total_tokens')},captureKind:'model-message-content'});
   if(choice.finish_reason==='length')refuse('TRUNCATED_MODEL_RESPONSE');
   const normalized=normalizeR125SpatialTreeResponse(raw);
   if(onNormalizedModelPlan)onNormalizedModelPlan(normalized);
   const plan=normalized.plan;
   // Opt-in caller must validate explicit delegation in SOURCE replay.
   const ordinary=allowDelegatedDimensions&&Object.hasOwn(plan,'delegatedDimensions')?
    Object.fromEntries(Object.entries(plan).filter(([k])=>k!=='delegatedDimensions')):plan;
   validateArchitecturePlan(ordinary); // no semantic repair
   return {plan,originalSha256:createHash('sha256').update(raw).digest('hex'),
    normalizedPlanSha256:normalized.normalization.normalizedPlanSha256,
    normalization:normalized.normalization,
    model,modelCalls:1,worldWrites:0,sourceVerified:false,
    artStatus:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'};
  }finally{
   clearTimeout(timer);
   signal?.removeEventListener('abort',abortFromCaller);
  }
 };
}

