import {createHash} from 'node:crypto';
import {validateArchitecturePlan,SCHEMA as R125_PLAN_SCHEMA} from './r125-architecture-plan.mjs';
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
const r125slug={type:'string',pattern:'^[a-z][a-z0-9-]{2,39}$'};
const r125text=(maxLength)=>({type:'string',minLength:3,maxLength});
const r125FixtureRoles=['counter','workbench','display','storage','seating',
 'bed','desk','washbasin','electronics','oven'];
const r125Room=r125obj({
 id:r125slug,purpose:r125text(180),
 access:r125enum('public','shared','staff'),
 fixture:r125enum('counter','workbench','display','storage','seating'),
 fixtures:{type:'array',items:{type:'string',enum:r125FixtureRoles},
  minItems:1,maxItems:3},
 fixtureDetail:r125enum('crafted'),
 fixtureArrangement:r125enum('focal-island'),
 fixtureScale:r125enum('expanded'),
 ovenHearth:r125enum('accent'),
 daylight:r125enum('wide-bay','clerestory','paired-bays')
},['id','purpose','access']);
const r125Level=r125obj({
 splitAxis:r125enum('x','z'),splitPercent:{type:'integer',enum:[40,50,60]},
 secondarySplitPercent:{type:'integer',enum:[35,50,65]},
 thirdRoomLink:r125enum('first-and-second'),
 spaces:{type:'array',items:r125Room,minItems:2,maxItems:3}
},['splitAxis','splitPercent','spaces']);
// The original JSON-only Schema still permitted impossible combinations such as
// split-monitor + an upper setback + a courtyard cut. Keep every historical
// ArchitecturePlan valid; constrain only NEW local Ollama authorship, with
// alternative complete object shapes instead of prompt-only warnings.
// Disjoint alternatives preserve the model's independent form decisions.
const r125Corner=r125obj({
 width:r125int(3,8),depth:r125int(3,8),
 side:r125enum('east','west'),access:r125enum('paved')
},['width','depth']);
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
 ...(steepRidge?{ridgeProfile:r125enum('steep')}:{}),
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
 entryZone:r125enum('first','second'),expression:r125Expression
};
const r125PlanRequired=['schema','id','title','brief','footprint','levels','materials'];
const r125PlanVariant=(levelCount,expression)=>r125obj({
 ...r125PlanProperties,
 levels:{...r125PlanProperties.levels,
  minItems:levelCount,maxItems:levelCount},
 expression
},r125PlanRequired);
export const R125_ARCHITECTURE_RESPONSE_SCHEMA={
 anyOf:[
  r125PlanVariant(1,r125OneLevelExpression),
  r125PlanVariant(2,r125Expression)
 ]
};

export function r125ResponseFormatForEndpoint(endpoint){
 if(endpoint==='http://127.0.0.1:11434/v1/chat/completions')
  return {type:'json_schema',json_schema:{
   name:'r125_architecture_plan_v11',strict:true,
   schema:R125_ARCHITECTURE_RESPONSE_SCHEMA}};
 return {type:'json_object'};
}

export function createR125ArchitecturePlanLocalAdapter({
 model,endpoint=DEFAULT_LOCAL_ENDPOINT,fetcher=fetch,timeoutMs=180000,
 reasoningEffort=undefined,maxOutputTokens=4096,onRawModelResponse
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
 if(typeof onRawModelResponse!=='function')
  refuse('REQUIRED_RAW_CAPTURE_CALLBACK');
 const system=[
  'You are an inventive architectural designer. From an UNKNOWN Japanese building brief, choose a genuinely original usable composition and room purposes. No fixed building-type template.',
  'Reply with ONE strict JSON object only. Do not include Markdown, rationale outside JSON, B143 elements, absolute voxel coordinates, commands, or claims of completed tests.',
  'Top-level EXACT fields: schema,id,title,brief,footprint,levels,materials. Optional: entryZone,expression.',
  'schema exactly '+R125_PLAN_SCHEMA+'. id and space ids lowercase hyphen slugs of 3..39 characters, leading letter. title,brief,purpose are meaningful strings of at least three characters.',
  "ESSENTIAL ACTIVITY COVERAGE: before choosing roof or furniture, map EACH indispensable action in the user brief to an actual room and functional equipment: bake or heat food -> oven; wash -> washbasin; sleep -> bed; operate electronics -> electronics; fabricate or prepare -> workbench; organize records -> desk; show results -> display. Storage, seating or display cannot stand in for actual heating, washing, testing or work. Choose core fixtures FIRST, then the optional complement. If the schema cannot represent an essential task, NEVER claim it is fulfilled. Public and shared rooms must be reachable without walking through staff rooms. For TWO floors, the fixed stair lands near x=3..4,z=8 on the upper west/front side: a staff-only FIRST upper room in front of a public/shared SECOND room may trap visitors behind staff unless a real independent route exists. Choose a genuinely workable room order and access, not imaginary circulation or a relabelled staff room; a front terrace is NOT a substitute path to a rear room. These are activity decisions by the model, never genre templates.",
  'ACTIVITY-LED FLOOR PROGRAM: Every storey needs a distinct observable activity. If the brief cannot justify a useful upper storey, choose ONE level instead of a mostly empty second floor. Give each public/shared working room a concrete task and equipment relevant to it. A large work room needing multiple independent stations should author the real stations, rather than one tiny symbolic object. Staff-only storage is not a substitute for visitor activities. Do not crowd two-wide routes or invent unsupported roles just to fill a room.',
  "footprint EXACT {width:integer 16..32,depth:integer 16..32}. levels has 1 or 2 objects; each level has splitAxis:x|z,splitPercent:40|50|60,spaces:2 or 3. Each room requires id,purpose,access:public|shared|staff and may have fixture OR fixtures,fixtureDetail,fixtureArrangement,fixtureScale,ovenHearth,daylight. All room IDs unique. A THREE-room T-plan: the first room occupies WEST on x-split (splitPercent is WEST share); other two occupy EAST. The first room occupies FRONT on z-split (splitPercent is FRONT share); other two occupy REAR. secondarySplitPercent 35|50|65 means FRONT share of the EAST wing for x, or WEST share of REAR wing for z. Omit on two rooms, and omission on three gives equal division. Actual two-wide doors normally connect first -> second -> third; third does NOT connect directly to first. When visitor movement would cross a staff-only second room, optionally author thirdRoomLink:\"first-and-second\" in THREE rooms to create a real two-wide opening directly from first into third. Also valid for another justified route. NEVER silently add it. Front exterior entrance faces small z; z-split enters FIRST, x-split may choose entryZone:first|second. No imaginary links, no fixed layout template.",
  "Functional equipment: choose a fixtures array of 1..3 genuine independent stations from counter|workbench|display|storage|seating|bed|desk|washbasin|electronics|oven. The legacy singular fixture is valid but must not be combined with fixtures. Each is physical B143 geometry with two-wide SOURCE service, not a functioning appliance. Optional ovenHearth:\"accent\" is the verified oven color proxy, never add without oven. Optional fixtureArrangement:\"focal-island\" requests a central focus in a spacious room with safe placement fallbacks. Optional fixtureDetail:\"crafted\" enriches visible shapes without bigger area. Optional fixtureScale:\"expanded\" requests connected extra work/display surface for EACH selected role; use only in spacious rooms with two-wide clearance. Ovens and beds do not support expansion. An impossible author-chosen scale fails SOURCE without repair. Omitted scale keeps legacy. HOST can separately study extensions but cannot claim AI authorship. No extra equipment roles or invented services.",
  'Optional per-room daylight: wide-bay|clerestory|paired-bays. Paired-bays asks the GENERIC HOST to place TWO genuine 3x2 windows in one room, preferably on separate exterior wall faces (or separated by solid wall on one face). Select only when the model-authored room actually benefits from two useful daylight or viewing positions and has adequate exposed wall; if no safe second opening is possible, the SOURCE holds instead of inventing fake glazing. To omit glazing OMIT the daylight key entirely; never emit daylight:none (4x2 or 5x1 real glass). Prefer appropriate openings for useful living, retail or workshop interiors. The generic HOST locates a true exterior wall with solid sill and lintel, unobstructed outside air and room-side air; unsupported bays HOLD with no silent fallback. No coordinates or fake daylight.',
  'materials EXACT floor:wood|stone|concrete, wall:concrete|stone|wood|metal, roof:stone|metal|wood|concrete. Choose a coherent but legible contrast between main walls, roof and flooring when useful to the brief; changing material names alone is NOT architectural originality. Materials are semantic categories: Education preview block IDs are not guaranteed user-verified.',
  'entryZone optional "first" or "second"; for a ground-floor z split, only "first" is possible at the front.',
  'Emit at most ONE expression object. Put roofVolume inside that SAME object alongside all mandatory fields; never append a second expression object containing only roofVolume. Optional expression EXACT mandatory fields {setbackSide,setbackDepth,roofProfile,roofAxis,facadeLanguage}. setbackSide:none|east|rear|front; none requires setbackDepth:0; east/rear requires two levels and setbackDepth:2|3|4|6|8. Depth 6 or 8 is for REAL stepped massing and requires footprint.width >= 28 for east or footprint.depth >= 28 for rear. Use only when the smaller upper rooms still support their authored equipment and connected stairs. front requires TWO levels and EXACT setbackDepth:2. A front setback creates a real street-facing upper terrace, low edge parapet and a two-wide opening from the upper room; it is not merely a facade color.',
  'roofProfile:flat|ridge|sawtooth|split-monitor|hip. roofAxis:x|z. facadeLanguage:plain|fins|screen|recessed-portico. For EVERY pitched roof (ridge, sawtooth, hip or split-monitor), include expression roofVolume:"raised". A flat solid cap below thick pitched bands looks heavy and hides the actual ceiling. Only flat roofs omit roofVolume. You still independently choose roof family, axis and spatial program. On a raised ridge, sawtooth or hip, you MAY explicitly choose roofOverhang:"one-block" to create real continuous eaves beyond all four exterior faces, if it improves silhouette and weather-sheltered appearance; never emit roofOverhang on flat roofs or with rearCornerCut. A split-monitor MUST include roofVolume:"raised", roofAxis:"x", no setback and last level splitAxis:"x". Do not select conflicting options.',
  'Optional expression rearCourt:{width:6..14,depth:4..10,alignment:"west"|"center"|"east",entrySide:"west"|"east",access:"paved"} is a REAL U-shaped open-air rear court; its location, wing widths, daylight and two-wide indoor entry come from YOUR design. ONE level only with flat roof (omit roofVolume) OR ridge roof with roofVolume:"raised", plain facade, no upper setback, no eaves and no other courtyard. A raised ridge is fully clipped above the open court and three inner walls are sealed to its true height. Require footprint.width >= court.width+12 and footprint.depth >= court.depth+14. It removes a central roof/wall volume, and the generic HOST must prove outdoor paving and an uninterrupted inside-to-court route. Choose U massing when a substantial shared outdoor public/work area helps the brief. It is NOT a compulsory style for retail or any other building type.',
  'Optional expression frontCornerCut:{width:3..8,depth:3..8,side:"east"|"west",access:"paved"} creates a true front open-sky L-shaped court with outdoor floor and indoor two-wide access. Use only ONE level, flat roof, plain facade, no setback or rearCornerCut, footprint width >= 2*cut.width+8, depth >= cut.depth+10. Keep the front main entrance outside the removed corner. Choose it only for a meaningful spatial program, not decoration.',
  'Optional expression rearCornerCut:{width:3..8,depth:3..8,side:"east"|"west",access:"paved"} creates a REAL open-sky rear L-shaped cut, with usable paved court and genuine two-wide doorway. It requires setbackSide:none, setbackDepth:0, and either flat roof OR roofProfile:ridge with roofVolume:"raised" (no eaves). A 6..8 deep/wide recess makes a substantial architectural courtyard only when footprint is sufficiently large (usually at least 24x24), and when it does not destroy the interior program. Smaller 3..5 recesses remain supported. Do not choose a court for mere decoration: connect it to the intended use and circulation; if the site is tight, omit the cut entirely. No sawtooth, hip or split-monitor corner in this local author schema. Do not invent unsupported expression keys.',
  'CRITICAL SETBACK CHECK: decide levels.length FIRST. For ONE level, expression.setbackSide MUST be "none" and setbackDepth MUST be 0. For TWO levels, either "none"+0, ("east"|"rear") with depth 2|3|4|6|8 (6/8 needs respective footprint dimension >= 28), or "front" with depth exactly 2. NEVER use an upper-story setback in a one-story building. The SOURCE validator refuses mismatches without a retry. This is not a template: freely select valid roof, site, program and massing.',
  'For a new design actively SELECT an expression appropriate to the requested building: a real roof profile, orientation, and a facade language, not just a different title, material, or footprint. Prefer a raised roof volume when a pitched design is functional. Plain flat boxes only if the architectural program genuinely calls for them. For residential versus retail versus research briefs seek DIFFERENT spatial organizations, not a hardcoded building-type template.',
  'Author each room access:public|shared|staff. Public rooms serve visitors; staff rooms are restricted; shared rooms can host visitor circulation. Every public or shared room must be reachable from the main entrance WITHOUT crossing staff-only rooms in x-split, z-split, or two-level plans. A z-split enters FIRST; x-split can use an explicitly authored entryZone:first or second. Choose the access labels and entryZone to match the requested activities, not a fixed template. SOURCE tests exclude staff-room standing pads; if no safe route exists, the original design is rejected without any repair. This is author-chosen use and access, NOT a hardcoded building type. SOURCE will refuse this known conflict; it cannot certify all visitor traffic or real gameplay.',
  "REAL ROOM BUDGET: T-split secondary rooms are smaller; allow two-wide doors, stair and service corridors. Most fixtures occupy 3x1, oven/electronics/seating/washbasin 3x2, bed 3x4. Each needs separately reachable service. A 16-wide two-level x-split with setback may leave a 3-wide control room. Avoid empty 30..32-wide halls and a single token object in 150+ cell work rooms: instead right-size the room, select more genuinely needed stations, or author fixtureScale:expanded where each station has 2..4 spare blocks and safe circulation. Do not shrink functional rooms or omit indispensable equipment to force SOURCE. Model chooses useful work program first.",
  "VISUAL/WEATHER DESIGN TEST: give activities recognizable exterior clues, a legible visitor entry, and appropriate natural light for occupied rooms. A recessed-portico makes a REAL 9-block-wide, 3-deep entrance; do NOT select it unless it fits entirely inside the ground entrance zone. For an x-split, compute splitCoordinate approximately round(1+(footprint.width-3)*splitPercent/100) (HOST clamps the extremes): entryZone:first requires splitCoordinate >= 11, while entryZone:second requires splitCoordinate <= footprint.width - 12. Otherwise author plain/fins/screen instead; front setback does not expand the ground entrance zone. For a z-split the doorway has the full front width available. An infeasible portico is a design SOURCE HOLD, not an aesthetic bonus. Match workbench/electronics/desk/display to authored room purpose, not a fixed building recipe. Exterior-facing windows must have real solid sill, lintel, outside air and usable inside approach. Do not claim functioning Minecraft monitors, plumbing, real climate protection or scenery the schema cannot generate.",
  "ROOF-TO-FACADE PROPORTION: select activities, volume, entrance and daylight before roofs. A wide ridge can create a broad flat-looking top and overwhelm a low box. For a raised ridge without court, optional ridgeProfile:\"steep\" narrows the plateau. Consider hip, sawtooth, split-monitor, flat or real outdoor court as relevant. Choose only compatible roof, setback and eaves; roofs never substitute for working rooms.",
  "Architectural identity: HIP roof for four slopes, sawtooth for workshop light, split-monitor for roof volumes or accessible L/U court only when useful. No fixed genre template.",
  "Prioritize a ROOM-APPROPRIATE fixture, useful rooms, daylight, clear entry and two-wide circulation. HOST creates geometry but never fakes SOURCE.",
  "Before emitting JSON: choose two or three rooms per floor; secondarySplitPercent only on three rooms; for one floor choose setback none+0. Hip requires raised roof. Courtyard cuts need compatible roofs, genuine outdoor access and sufficient room. Never duplicate JSON keys or emit a contradictory expression. One source answer, no retry.",
 ].join('\n');
 return async function authorArchitecturePlan({prompt}={}){
  if(typeof prompt!=='string'||prompt.length<8||prompt.length>8000)
   refuse('INVALID_MODEL_REQUEST');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const res=await fetcher(endpoint,{
    method:'POST',signal:controller.signal,redirect:'error',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.55,
     response_format:r125ResponseFormatForEndpoint(endpoint),max_tokens:maxOutputTokens,
     ...(reasoningEffort===undefined?{}:{reasoning_effort:reasoningEffort}),
     messages:[{role:'system',content:system},
      {role:'user',content:JSON.stringify({architecturalRequest:prompt,
       sourceOnly:true,authorSemanticPlan:true,
       crossFieldRule:'Decide levels first. With 1 level: setbackSide=none and setbackDepth=0. Only with 2 levels: east/rear may have depth 2, 3, 4, 6 or 8 (6/8 needs footprint width/depth >= 28). Invalid pair is rejected without retry.'})}]})
   });
   if(!res||res.ok!==true)
    refuse('LOCAL_HTTP_'+String(res?.status??'UNKNOWN'));
   const data=await res.json();
   if(!Array.isArray(data?.choices)||data.choices.length!==1)
    refuse('INVALID_RESPONSE_CHOICES');
   const choice=data.choices[0],raw=choice?.message?.content;
   if(typeof raw!=='string'||raw.length<1||raw.length>60000)
    refuse('INVALID_MODEL_CONTENT');
   // MUST precede parsing, validation, source compilation and length rejection.
   const reportedUsage=data.usage&&typeof data.usage==='object'?data.usage:{};
   const count=key=>Number.isSafeInteger(reportedUsage[key])&&
    reportedUsage[key]>=0&&reportedUsage[key]<=10000000?
    reportedUsage[key]:null;
   onRawModelResponse(raw,{finishReason:choice.finish_reason??null,
    usage:{promptTokens:count('prompt_tokens'),
     completionTokens:count('completion_tokens'),
     totalTokens:count('total_tokens')}});
   if(choice.finish_reason==='length')refuse('TRUNCATED_MODEL_RESPONSE');
   let plan;
   try{plan=JSON.parse(raw);}
   catch{refuse('PLAN_NOT_JSON');}
   validateArchitecturePlan(plan); // throws; absolutely no semantic repair
   return {plan,originalSha256:createHash('sha256').update(raw).digest('hex'),
    model,modelCalls:1,worldWrites:0,sourceVerified:false,
    artStatus:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED'};
  }finally{clearTimeout(timer);}
 };
}
