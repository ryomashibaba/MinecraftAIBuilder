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
 'bed','desk','washbasin','electronics'];
const r125Room=r125obj({
 id:r125slug,purpose:r125text(180),
 fixture:r125enum('counter','workbench','display','storage','seating'),
 fixtures:{type:'array',items:{type:'string',enum:r125FixtureRoles},
  minItems:1,maxItems:3,uniqueItems:true},
 daylight:r125enum('wide-bay','clerestory')
},['id','purpose']);
const r125Level=r125obj({
 splitAxis:r125enum('x','z'),splitPercent:{type:'integer',enum:[40,50,60]},
 spaces:{type:'array',items:r125Room,minItems:2,maxItems:2}
},['splitAxis','splitPercent','spaces']);
// The original JSON-only Schema still permitted impossible combinations such as
// split-monitor + an upper setback + a courtyard cut. Keep every historical
// ArchitecturePlan valid; constrain only NEW local Ollama authorship, with
// alternative complete object shapes instead of prompt-only warnings.
// Disjoint alternatives preserve the model's independent form decisions.
const r125Corner=r125obj({
 width:r125int(3,5),depth:r125int(3,5),
 side:r125enum('east','west'),access:r125enum('paved')
},['width','depth']);
const r125ExpressionFields={
 setbackSide:r125enum('none','east','rear'),
 setbackDepth:{type:'integer',enum:[0,2,3,4]},
 roofProfile:r125enum('flat','ridge','sawtooth','split-monitor'),
 roofAxis:r125enum('x','z'),
 facadeLanguage:r125enum('plain','fins','screen','recessed-portico')
};
const r125ExpressionRequired=['setbackSide','setbackDepth',
 'roofProfile','roofAxis','facadeLanguage'];
const r125Expr=({roof,side,depth,axis,volume=false,corner=false,
 monitorDaylight=false}={})=>r125obj({
 ...r125ExpressionFields,
 roofProfile:r125enum(...roof),
 setbackSide:r125enum(...side),
 setbackDepth:{type:'integer',enum:depth},
 roofAxis:r125enum(...axis),
 ...(volume?{roofVolume:r125enum('raised')}:{}),
 ...(corner?{rearCornerCut:r125Corner}:{}),
 ...(monitorDaylight?{
  daylightFacade:r125enum('east-and-rear-bays'),
  roofOverhang:r125enum('one-block')
 }:{})
},[...r125ExpressionRequired,...(volume==='required'?['roofVolume']:[]),
 ...(corner==='required'?['rearCornerCut']:[])]);
const r125Expression={
 anyOf:[
  // Flat massing, including real outdoor court OR upper setback.
  r125Expr({roof:['flat'],side:['none'],depth:[0],axis:['x','z']}),
  r125Expr({roof:['flat'],side:['east','rear'],depth:[2,3,4],
   axis:['x','z']}),
  r125Expr({roof:['flat'],side:['none'],depth:[0],axis:['x','z'],
   corner:'required'}),
  // Pitched architecture may choose raised real roof volume. A rear
  // courtyard with a ridge is allowed only with that raised volume.
  r125Expr({roof:['ridge','sawtooth'],side:['none'],depth:[0],
   axis:['x','z'],volume:true}),
  r125Expr({roof:['ridge','sawtooth'],side:['east','rear'],
   depth:[2,3,4],axis:['x','z'],volume:true}),
  r125Expr({roof:['ridge'],side:['none'],depth:[0],
   axis:['x','z'],volume:'required',corner:'required'}),
  // Monitor requires full raised volume, x axis, NO upper setback.
  // Last-level x partition and single-level daylight variants remain
  // checked by the independent HOST; unsupported source is still HOLD.
  r125Expr({roof:['split-monitor'],side:['none'],depth:[0],
   axis:['x'],volume:'required',monitorDaylight:true})
 ]
};
export const R125_ARCHITECTURE_RESPONSE_SCHEMA=r125obj({
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
},['schema','id','title','brief','footprint','levels','materials']);

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
  'footprint EXACT {width:integer 16..32,depth:integer 16..32}. levels has 1 or 2 objects. Each level EXACT {splitAxis:"x"|"z",splitPercent:40|50|60,spaces:[{id,purpose,optional fixture OR fixtures,optional daylight},{id,purpose,optional fixture OR fixtures,optional daylight}]}. All space ids unique across levels.',
  'Functional equipment: choose OPTIONAL fixtures per room as an ARRAY of 1..3 DISTINCT roles among counter|workbench|display|storage|seating|bed|desk|washbasin|electronics. The old optional singular fixture remains supported, but NEVER use both fixture and fixtures in one space. A sleeping room needs an actual bed, not merely seating; a practical electronics laboratory may need electronics, workbench and storage; a washing zone may need a washbasin. Do not place incompatible roles in an unrelated zone just to fill a quota. The GENERIC HOST places all chosen roles in real B143 voxels with two-wide accessible service frontage or the design fails SOURCE. These are geometric equipment proxies, not working Minecraft plumbing or electronics.',
  'Optional per-room daylight: wide-bay|clerestory. To omit glazing OMIT the daylight key entirely; never emit daylight:none (4x2 or 5x1 real glass). Prefer appropriate openings for useful living, retail or workshop interiors. The generic HOST locates a true exterior wall with solid sill and lintel, unobstructed outside air and room-side air; unsupported bays HOLD with no silent fallback. No coordinates or fake daylight.',
  'materials EXACT floor:wood|stone|concrete, wall:concrete|stone|wood|metal, roof:stone|metal|wood|concrete.',
  'entryZone optional "first" or "second"; for a ground-floor z split, only "first" is possible at the front.',
  'Emit at most ONE expression object. Put roofVolume inside that SAME object alongside all mandatory fields; never append a second expression object containing only roofVolume. Optional expression EXACT mandatory fields {setbackSide,setbackDepth,roofProfile,roofAxis,facadeLanguage}. setbackSide:none|east|rear; none requires setbackDepth:0; east/rear requires two levels and setbackDepth:2|3|4.',
  'roofProfile:flat|ridge|sawtooth|split-monitor. roofAxis:x|z. facadeLanguage:plain|fins|screen|recessed-portico. For a REAL open interior under an elevated ridge or sawtooth roof choose expression roofVolume:"raised"; without it an extra flat roof remains underneath. A split-monitor MUST include roofVolume:"raised", roofAxis:"x", no setback and last level splitAxis:"x". Do not select conflicting options.',
  'Optional expression rearCornerCut:{width:3..5,depth:3..5} creates a true open-air rear notch; it requires no setback and flat roof. Do not invent unsupported expression keys.',
  'For a new design actively SELECT an expression appropriate to the requested building: a real roof profile, orientation, and a facade language, not just a different title, material, or footprint. Prefer a raised roof volume when a pitched design is functional. Plain flat boxes only if the architectural program genuinely calls for them. For residential versus retail versus research briefs seek DIFFERENT spatial organizations, not a hardcoded building-type template.',
  'Before choosing rooms, infer the actual activities and workflow in THIS brief. Match each activity to equipment that visibly enables it: electronics is an instrument bench with screen, workbench is fabrication, desk is records, storage is shelving. Storage alone cannot represent making or testing. Distribute complementary equipment across rooms according to their purposes; avoid several near-identical storage rooms. Size the footprint for the chosen equipment and circulation rather than leaving oversized empty halls. These are activity-based decisions by YOU, not a fixed building-type recipe.',
  'Compose a coherent architectural identity using the supported forms. Consider split-monitor with raised roof and upper x split for distinct roof volumes, sawtooth for repeated workshop light, or a flat rear notch for an open court; choose the form for the workflow rather than defaulting to a ridge plus east setback. Do not combine incompatible options.',
  'Prioritize usable interior rooms, a clear main entrance, actual distinctive building volume and roof, functional daylight, and credible circulation. Choose at least one optional, ROOM-APPROPRIATE fixture when feasible; a fixture without a clear two-wide service frontage will cause a SOURCE HOLD. Geometry, doorway cuts, floor supports, stairs, and glazing are generated by the shared HOST.',
  'Before emitting JSON, check: exactly TWO spaces per level; never duplicate JSON keys. For ONE level always setbackSide:none and setbackDepth:0. If rearCornerCut is present, use setbackSide:none, setbackDepth:0 and roofProfile:flat; otherwise OMIT rearCornerCut. Choose one coherent design, no retry, no filler. Output exactly the schema without explanations or assumptions fields.'
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
       sourceOnly:true,authorSemanticPlan:true})}]})
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
