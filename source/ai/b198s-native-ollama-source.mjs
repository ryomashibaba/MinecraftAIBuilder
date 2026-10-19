/**
 * B198S: explicit LOCAL Ollama native JSON bridge for ONE frozen architecture
 * source case. Reuses the B198G strict original model proposal grammar and
 * B143 compiler. This is never an automatic template or a Minecraft writer.
 *
 * Only literal 127.0.0.1 native /api/chat; not fetch/Undici and no redirects,
 * external hosts, credentials, shells, downloads or user-world operations.
 */
import http from 'node:http';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {prepareCapturedModelSource}
 from './b198u-bounds-only-repair.mjs';
import {R2_FREEFORM_QUALITY_GUIDE}
 from './b198zr2-generic-quality-guide.mjs';
import {R4_PLANNING_GUIDE}
 from './b198zr4-planned-source.mjs';

export const SCHEMA='minecraftaibuilder-b198s-native-single-source-json-v1';
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const requestMaxBytes=128*1024,responseMaxBytes=512*1024;
const fail=s=>{
 const e=Error('B198S_LOCAL_TRANSPORT_'+s);
 e.code='B198S_LOCAL_TRANSPORT_'+s;
 return e;
};
// Classify ONLY the failure kind. Never export arbitrary server-side text or
// user paths from Ollama's error object into source audit uploads.
export function classifyOllamaServerError(value){
 const s=typeof value==='string'?value.slice(0,32768).toLowerCase():'';
 if(/out of memory|insufficient memory|not enough (?:available )?(?:system |gpu |vram |ram )?memory|failed to alloc|cannot alloc|cublas_status_alloc_failed|cuda.*alloc/.test(s))
  return 'RESOURCE_ALLOCATION';
 if(/runner.*(?:unexpectedly stopped|terminated|exit status|exited|killed)|llama.server.*(?:terminated|exited|killed)|exit status 0x[0-9a-f]+/.test(s))
  return 'MODEL_RUNNER_STOPPED';
 if(/model.*(?:not found|does not exist|not available)|no such model/.test(s))
  return 'MODEL_NOT_FOUND';
 if(/(?:unsupported|not supported|invalid option|template error|unrecognized parameter)/.test(s))
  return 'REQUEST_OPTION_UNSUPPORTED';
 return 'UNCLASSIFIED_SERVER_FAILURE';
}
const number=x=>Number.isSafeInteger(x)&&x>=0?x:null;
const seconds=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0?
 Number((x/1e9).toFixed(3)):null;

/** Full architectural quality is not claimed; this is an *initial source* trial.
 * Output budget trims excessively verbose descriptions, NOT a generic building
 * type or fixed geometry. Whole-source B143 compiler is still authoritative.
 */
const STRUCTURAL_GUIDE=[
 'Return ORIGINAL architecture for the supplied Japanese request. Never use a fixed building template.',
 'The ONLY outer keys are design, explanation, assumptions.',
 'Inside design exactly: schema, id, title, brief, bounds, elements, designOnly.',
 'IMPORTANT: title MUST be 1..100 UTF-16 characters; brief MUST be 1..500 UTF-16 characters. Do not use <, >, control characters or line breaks in either.',
 'Prefer a concise Japanese title under 45 characters and a concise brief under 160 characters; metadata is NOT a place to serialize all geometry.',
 'Set schema "minecraftaibuilder-b143-building-dsl-v1", designOnly true.',
 'id must be a lowercase-hyphenated 3..48 character slug. bounds width/depth 8..128, height 8..96.',
 'Each element needs id (distinct), shape, mode. add requires material in stone/concrete/metal/glass/wood/glow/accent; cut omits material.',
 'For box use origin:[x,y,z],size:[sx,sy,sz]; ellipsoid uses center:[x,y,z],radii:[rx,ry,rz].',
 'For cylinder use origin:[x,y,z],axis:"x"/"y"/"z",radius,length.',
 'For torus use center:[x,y,z],axis,majorRadius,tubeRadius.',
 'For beam use start:[x,y,z],end:[x,y,z],thickness 1..3.',
 'For a straight flight of stairs use ONE staircase element: origin:[x,y,z], axis:"x"/"z", direction:1/-1, width:2..12, steps:2..32, treadDepth:1..3. Rising height is one voxel per step.',
 'staircase is a supported solid stepped wedge, not a Minecraft stair block. Ensure an open 2-voxel headroom and actually connected level landings; it does NOT prove avatar walkability.',
 'Never emit dozens of individually enumerated stair boxes when one staircase element expresses the same design. Preserve token budget for original building mass, functional rooms and circulation.',
 'Any add/cut source element can use optional repeat:{count:2..32,offset:[dx,dy,dz]} for a line of translated copies; offset integers -128..128, not [0,0,0]; ALL copies must stay inside design.bounds.',
 'Use repeat only when the same authored design feature truly appears at constant spacing (columns, ribs, facade modules, roof beams, window voids). A repetition is not an automatic building template, and must not replace distinct functional spaces.',
 'One source element with repeat is far shorter than 20 numbered nearly identical items. Preserve output budget for original massing, supported floor connections, public use and genuine circulation.',
 'Do not include fields of unrelated shapes, invented types, or Minecraft commands.',
 'All coordinates integer, nonnegative and inside bounds. Include genuine supported floors and cleared two-block headroom.',
 'Check every shape extent before finalizing bounds: box ends origin+size-1; ellipsoid center+radius; cylinder and torus also need transverse radius; beam thickness adds padding.',
 'Declare width, height, depth large enough to fully enclose all originally authored shapes, without negative domains.',
 'Use distinctive overall silhouette, multiple functional zones and a meaningful interior void when the request needs them.',
 'Make a coherent first-pass design with approximately 12..28 meaningful source elements, not hundreds of redundant decorations.',
 'Keep explanation short (under 150 characters), assumptions a short array. Prioritize complete compact JSON over verbose prose.',
 'Do not claim the design is constructed, traversable or artistically approved.'
].join('\n');

export function createB198SNativeBridge({
 numPredict=3072,numCtx=6144,keepAlive='10m',
 transport=http,addArchitectureGuide=true,plannedSourceMode=false,
 onModelResponse=null
}={}){
 if(!Number.isSafeInteger(numPredict)||numPredict<512||numPredict>4096)
  throw fail('OUTPUT_TOKENS_512_TO_4096');
 if(!Number.isSafeInteger(numCtx)||numCtx<4096||numCtx>8192)
  throw fail('CONTEXT_4096_TO_8192');
 if(numPredict>numCtx-2048)throw fail('INSUFFICIENT_CONTEXT_ROOM');
 if(keepAlive!=='10m'&&keepAlive!=='5m')throw fail('KEEP_ALIVE_INVALID');
 if(typeof transport?.request!=='function')throw fail('TRANSPORT_REQUIRED');
 if(typeof plannedSourceMode!=='boolean')throw fail('PLANNED_MODE_INVALID');
 if(onModelResponse!==null&&typeof onModelResponse!=='function')
  throw fail('EVIDENCE_PERSISTENCE_CALLBACK_REQUIRED');
 const entries=[];
 const fetcher=(url,opts={})=>{
  const match=typeof url==='string'?ENDPOINT.exec(url):null;
  if(!match||Number(match[1])<1||Number(match[1])>65535)
   return Promise.reject(fail('LOOPBACK_URL_ONLY'));
  if(opts.method!=='POST'||opts.redirect!=='error'||
     opts.headers?.Authorization!==undefined||
     opts.headers?.authorization!==undefined||
     opts.signal?.aborted) {
   return Promise.reject(fail('UNSAFE_REQUEST_OPTIONS_OR_ALREADY_CANCELLED'));
  }
  if(typeof opts.body!=='string'||Buffer.byteLength(opts.body)>requestMaxBytes)
   return Promise.reject(fail('INVALID_OR_OVERSIZED_REQUEST'));
  let payload;
  try{payload=JSON.parse(opts.body)}
  catch{return Promise.reject(fail('INVALID_OPENAI_ADAPTER_PAYLOAD'))}
  if(!payload||!MODEL.test(payload.model??'')||
     payload.stream!==false||payload.response_format?.type!=='json_object'||
     !Array.isArray(payload.messages)||payload.messages.length!==2||
     payload.messages[0]?.role!=='system'||payload.messages[1]?.role!=='user'||
     payload.messages.some(x=>typeof x.content!=='string')) {
   return Promise.reject(fail('UNSAFE_MODEL_REQUEST'));
  }
  const messages=payload.messages.map(x=>({role:x.role,content:x.content}));
  if(addArchitectureGuide)messages[0].content+='\n'+(plannedSourceMode?
   STRUCTURAL_GUIDE.replace('The ONLY outer keys are design, explanation, assumptions.',
    'The ONLY outer keys are design, explanation, assumptions, spatialPlan.')+
    '\n'+R4_PLANNING_GUIDE:STRUCTURAL_GUIDE)+
   '\n'+R2_FREEFORM_QUALITY_GUIDE;
  const native={
   model:payload.model,messages,stream:false,format:'json',think:false,
   keep_alive:keepAlive,
   options:{num_predict:numPredict,num_ctx:numCtx,temperature:0.35}
  };
  const raw=JSON.stringify(native);
  if(Buffer.byteLength(raw)>requestMaxBytes)
   return Promise.reject(fail('NATIVE_REQUEST_TOO_LARGE'));
  return new Promise((resolve,reject)=>{
   const start=performance.now();let settled=false,received=0;
   const final=(error,value)=>{
    if(settled)return;settled=true;
    opts.signal?.removeEventListener('abort',abort);
    const elapsedMs=Math.round(performance.now()-start);
    if(error){
     const reason=String(error?.code??error?.message??error).slice(0,140);
     entries.push({outcome:'TRANSPORT_HOLD',elapsedMs,reason,
      outputTokenLimit:numPredict,contextTokenLimit:numCtx});
     reject(error?.code?.startsWith?.('B198S_LOCAL_TRANSPORT_')?
      error:fail(String(error?.code??'CONNECTION_ERROR').replace(/[^A-Z0-9_]/gi,'').slice(0,40)));
    }else{resolve(value)}
   };
   const abort=()=>req.destroy(fail('MODEL_DEADLINE_EXPIRED'));
   const req=transport.request({
    hostname:'127.0.0.1',port:Number(match[1]),path:'/api/chat',
    method:'POST',agent:false,
    headers:{'Content-Type':'application/json',
     'Content-Length':Buffer.byteLength(raw)}
   },res=>{
    let chunks=[];
    res.on('data',chunk=>{
     received+=chunk.length;
     if(received>responseMaxBytes){
      req.destroy(fail('RESPONSE_TOO_LARGE'));res.destroy();
      return;
     }
     chunks.push(chunk);
    });
    res.on('error',e=>final(e));
    res.on('end',()=>{
     const responseText=Buffer.concat(chunks).toString('utf8');
     const elapsedMs=Math.round(performance.now()-start);
     const ok=res.statusCode>=200&&res.statusCode<300;
     if(!ok){
      // Ollama error bodies may be either JSON or plain text. Previously we
      // discarded the only useful diagnostic after a 500. Never leak it raw.
      let description=responseText;
      try{
       const parsed=JSON.parse(responseText);
       if(typeof parsed?.error==='string')description=parsed.error;
      }catch{}
      entries.push({outcome:'SERVER_HTTP_HOLD',elapsedMs,status:res.statusCode,
       serverErrorClass:classifyOllamaServerError(description),
       serverErrorFingerprintSha256:createHash('sha256').update(responseText).digest('hex'),
       serverErrorTextDisclosed:false,
       outputTokenLimit:numPredict,contextTokenLimit:numCtx});
      return final(null,{ok:false,status:res.statusCode,json:async()=>({})});
     }
     let body;
     try{body=JSON.parse(responseText)}
     catch{return final(fail('INVALID_NATIVE_RESPONSE_JSON'))}
     const content=body?.message?.content;
     if(typeof content!=='string'||content.length>60000)
      return final(fail('UNEXPECTED_MODEL_CONTENT'));
     const ended=body.done===true;
     const isLength=body.done_reason==='length'||body.done_reason==='max_tokens';
     // Preserve the real model source geometry. Only an excess of B143
     // title/brief characters can be trimmed with SHA and explicit disclosure.
     let normalized;
     try{
      // R4's four-key original is primary evidence: never silently modify it.
      // Legacy three-key mode keeps bounded metadata/bounds repair unchanged.
      normalized=plannedSourceMode?{
       content,
       metadataRepair:{applied:false,status:'R4_UNMODIFIED_ORIGINAL'},
       boundsRepair:{applied:false,status:'R4_UNMODIFIED_ORIGINAL'}
      }:prepareCapturedModelSource(content);
      // Write the FULL ORIGINAL response before strict source validation.
      // Invalid geometry remains evidence; user need not spend another
      // local 27B inference just to recover the model-authored payload.
      if(onModelResponse)onModelResponse({
       originalContent:content,correctedContent:normalized.content,
       metadataRepair:normalized.metadataRepair,
       boundsRepair:normalized.boundsRepair
      });
     }catch{return final(fail('SOURCE_AUDIT_OR_EVIDENCE_PERSISTENCE_FAILED'))}
     const detail={
      outcome:ended&&!isLength?'MODEL_RETURNED':'MODEL_INCOMPLETE',
      elapsedMs,
      complete:ended&&!isLength,doneReason:typeof body.done_reason==='string'?
       body.done_reason.slice(0,50):null,
      responseCharacters:content.length,
      metadataRepair:normalized.metadataRepair,
      boundsRepair:normalized.boundsRepair,
      rawModelOutputEvidenceStored:onModelResponse!==null,
      thinkingCharacters:number(body.message?.thinking?.length),
      totalSeconds:seconds(body.total_duration),
      loadSeconds:seconds(body.load_duration),
      promptSeconds:seconds(body.prompt_eval_duration),
      promptTokens:number(body.prompt_eval_count),
      generationSeconds:seconds(body.eval_duration),
      generatedTokens:number(body.eval_count),
      outputTokenLimit:numPredict,contextTokenLimit:numCtx,
      requestedThinkingOff:true,
      thinkingActuallyDisabledUnverified:true,
      actualArchitectureQualityUnreviewed:true
     };
     if(detail.generatedTokens!==null&&detail.generationSeconds>0)
      detail.generatedTokensPerSecond=
       Number((detail.generatedTokens/detail.generationSeconds).toFixed(2));
     entries.push(detail);
     final(null,{ok:true,status:200,json:async()=>({
      choices:[{finish_reason:!ended||isLength?'length':'stop',
       message:{content:normalized.content}}]
     })});
    });
   });
   opts.signal?.addEventListener('abort',abort,{once:true});
   req.on('error',e=>final(e));
   req.end(raw);
  });
 };
 return {fetcher,telemetry:()=>structuredClone(entries),
  requestBudget:{numPredict,numCtx,keepAlive,thinkingOffRequested:true,
   thinkingOffIndependentlyVerified:false,
   nativeOllamaSourceOnly:true,
   r4PlannedSourceOptIn:plannedSourceMode,
   r4OriginalReturnedUnmodified:true,
   fourKeyR4RequiresIndependentReview:true,
    boundedMetadataRepairEnabled:true,
    geometryRepairNeverAutomatic:true,
    declaredBoundsExpansionOnlyIfNoGeometryChanges:true,
    invalidModelOutputCapturedForOfflineReview:onModelResponse!==null,
    worldWrites:0}};
}
