/**
 * B198G optional LOCAL-only OpenAI-compatible chat completion adapter.
 * The model actually authors JSON B143 source. NO API key, no paid endpoint,
 * no wildcard URL, no remote HTTP, and no disguised keyword-based generator.
 * This function does not contact even localhost until directly invoked.
 */
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
 'The design must comply with minecraftaibuilder-b143-building-dsl-v1.',
 'Use schema,id,title,brief,bounds,elements,designOnly as the only design fields.',
 'Set designOnly=true. Bounds width/depth 8..128,height 8..96,product<=500000.',
 'All element IDs unique; max 160 elements, max 160000 exact occupied voxels.',
 'Primitive shapes: box,ellipsoid,cylinder,torus,beam. Modes: add and cut.',
 'Allowed add materials: stone,concrete,metal,glass,wood,glow,accent.',
 'Use only local integer coordinates within bounds; no Minecraft commands.',
 'Original designs must be architectural and respond specifically to Japanese prompts.',
 'Include supported functional floors and voids instead of filling entire volumes.',
 'For revisions preserve prior complete design.id, source elements, materials, clear floors and headroom; introduce new meaningful elements for fixes.',
 'Explain assumptions honestly; do not claim in-game walking, artistic merit, building approval, or real construction.'
].join('\n');

export function createB198GLocalModelAdapter({
 model,endpoint=DEFAULT_LOCAL_ENDPOINT,fetcher=fetch,timeoutMs=120000,
 plannedSourceMode=false
}={}){
 if(typeof model!=='string'||!MODEL_RE.test(model))
  refuse('EXPLICIT_MODEL_ID_REQUIRED');
 const m=typeof endpoint==='string'?ENDPOINT_RE.exec(endpoint):null;
 if(!m||Number(m[1])>65535||Number(m[1])<1)
  refuse('ONLY_EXPLICIT_127_0_0_1_CHAT_COMPLETIONS_ALLOWED');
 if(typeof fetcher!=='function')refuse('INVALID_FETCHER');
 if(typeof plannedSourceMode!=='boolean')refuse('INVALID_PLANNED_MODE');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>900000)
  refuse('TIMEOUT_BOUNDS');
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
   if(choice.finish_reason==='length')refuse('TRUNCATED_MODEL_RESPONSE');
   if(typeof raw!=='string'||raw.length<10||raw.length>60000)
    refuse('INVALID_MODEL_CONTENT');
   // A local provider is never a trusted source. Reuse the real strict adapter
   // grammar, and let B198A/B143 independently compile every proposed design.
   return plannedSourceMode?readR4PlannedProposal(raw):readModelProposal(raw);
  }finally{clearTimeout(timer);}
 };
}
