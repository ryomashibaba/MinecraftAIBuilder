/**
 * B198I opt-in model-created architecture PROGRAM (separate from actual B143
 * source authoring). Compatible with an explicitly running local chat server.
 * NO remote addresses, redirect, credentials, Minecraft sockets, or network
 * calls until the caller explicitly invokes the returned function.
 */
import {readArchitecturalProgram,PLAN_SCHEMA}
 from './b198i-design-director.mjs';

export const DEFAULT_DIRECTOR_ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';
const fail=s=>{throw Error('B198I_LOCAL_'+s)};
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const URL_PATTERN=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const SYSTEM=[
 'Design an original architectural program matching the Japanese user request.',
 'Do NOT output source B143 design and do NOT assume any existing fixed building template.',
 'Output ONLY a JSON object with EXACT fields schema,id,title,designIntent,visualDirection,bounds,zones,anchors.',
 'schema='+PLAN_SCHEMA+'; id lower-case hyphenated 3..48 characters.',
 'bounds {width,height,depth}: width 8..128 height 8..96 depth 8..128, product <=500000.',
 'Use zones as an array of 3..12 unique {id,name,purpose}, each with genuine distinct roles.',
 'Use anchors as an array of 5..18 unique {id,zoneId,point,expect,purpose}.',
 'Each anchor point is [x,y,z] inside bounds; zoneId must match a zone id.',
 'anchor expect must be SOLID or AIR or SUPPORTED_FLOOR.',
 'A SUPPORTED_FLOOR anchor at [x,y,z] represents solid 2x2 area at y,',
 'with EMPTY 2x2 areas directly at y+1 and y+2, all inside bounds.',
 'Include at least one SOLID, one AIR, one SUPPORTED_FLOOR anchor;',
 'make several each to test key architectural intent, not random points.',
 'Include central voids as AIR anchors and genuine occupiable floors as',
 'SUPPORTED_FLOOR. A model cannot claim actual B143 result until generated.',
 'Keep program short enough for subsequent full B143 synthesis. Emphasize',
 'usable space, distinctive silhouette, coherent scale and culturally faithful form.',
 'No code, no execution instructions, no Minecraft world operations.',
 'The final plan is a speculative design intent, not independently verified quality.'
].join('\n');

export function createB198ILocalPlanner({
 model,endpoint=DEFAULT_DIRECTOR_ENDPOINT,fetcher=fetch,timeoutMs=120000
}={}){
 if(typeof model!=='string'||!MODEL.test(model))
  fail('EXPLICIT_SUPPORTED_LOCAL_MODEL_REQUIRED');
 const match=typeof endpoint==='string'?URL_PATTERN.exec(endpoint):null;
 if(!match||Number(match[1])<1||Number(match[1])>65535)
  fail('STRICT_LOOPBACK_ENDPOINT_ONLY');
 if(typeof fetcher!=='function')fail('FETCHER_REQUIRED');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>900000)
  fail('TIMEOUT_RANGE');
 return async function localArchitecturePlanner({prompt}={}){
  if(typeof prompt!=='string'||prompt.trim().length<8||prompt.length>3500)
   fail('INVALID_ARCHITECTURE_PROMPT');
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
   const r=await fetcher(endpoint,{
    method:'POST',signal:ctrl.signal,redirect:'error',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.35,
     response_format:{type:'json_object'},
     messages:[{role:'system',content:SYSTEM},
       {role:'user',content:JSON.stringify({
        phase:'B198I_ARCHITECTURAL_PROGRAM',
        request:prompt,
        format:'independent source-checkable architectural program'
       })}]})
   });
   if(r?.ok!==true)fail('HTTP_'+String(r?.status??'UNKNOWN'));
   const data=await r.json();
   if(!Array.isArray(data?.choices)||data.choices.length!==1||
    data.choices[0]?.finish_reason==='length')
    fail('INCOMPLETE_MODEL_PLAN');
   const raw=data.choices[0]?.message?.content;
   if(typeof raw!=='string'||raw.length<30||raw.length>18000)
    fail('UNTRUSTED_PLAN_RESPONSE');
   return readArchitecturalProgram(raw);
  }finally{clearTimeout(timer)}
 };
}
