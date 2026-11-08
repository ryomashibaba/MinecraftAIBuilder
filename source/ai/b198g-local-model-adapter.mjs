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
