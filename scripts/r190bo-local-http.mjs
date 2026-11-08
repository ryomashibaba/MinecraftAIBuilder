/** R190-BO: one explicit, local-only Ollama POST over Node's core HTTP client.
 * No Undici 300s header default, discovery, redirects, retries or remote hosts.
 * The BO caller owns the one-shot approval and attempt lock.
 */
import http from 'node:http';

export const BO_LOCAL_ENDPOINT='http://127.0.0.1:11434/api/chat';
export const BO_TOTAL_TIMEOUT_MS=1_800_000; // bounded 30m for up to 16k tokens
export const BO_HEADERS_TIMEOUT_MS=1_740_000; // bounded 29m, before total deadline
export const BO_BODY_IDLE_TIMEOUT_MS=120_000;
export const BO_MAX_HTTP_BODY_BYTES=4_000_000;

function errorWithCode(code,message){
 const e=new Error(message); e.code=code; return e;
}

/** requestImpl is injected only in offline unit tests: no real socket is opened. */
export function postLocalOllama(url,init,{requestImpl=http.request,
 headersTimeoutMs=BO_HEADERS_TIMEOUT_MS,bodyIdleTimeoutMs=BO_BODY_IDLE_TIMEOUT_MS,
 maxResponseBytes=BO_MAX_HTTP_BODY_BYTES}={}){
 if(url!==BO_LOCAL_ENDPOINT||init?.method!=='POST'||init?.redirect!=='error'||
  init?.headers?.['Content-Type']!=='application/json'||!(init.body instanceof Uint8Array)||
  init.body.length===0||init.body.length>64_000||!init.signal ||
  !Number.isSafeInteger(headersTimeoutMs)||headersTimeoutMs<1||
  !Number.isSafeInteger(bodyIdleTimeoutMs)||bodyIdleTimeoutMs<1||
  !Number.isSafeInteger(maxResponseBytes)||maxResponseBytes<1)
  throw errorWithCode('R190BO_UNSAFE_HTTP_REQUEST','Only one exact localhost JSON POST is supported');
 return new Promise((resolve,reject)=>{
  let settled=false,headerTimer=null,bodyTimer=null,req=null;
  const clear=()=>{
   if(headerTimer!==null)clearTimeout(headerTimer);
   if(bodyTimer!==null)clearTimeout(bodyTimer);
  };
  const finish=(error,response)=>{
   if(settled)return;
   settled=true;clear();
   if(error)reject(error);
   else resolve(response);
  };
  const destroy=(error)=>{
   if(req&&!req.destroyed)req.destroy(error);
   finish(error);
  };
  try{
   req=requestImpl(url,{
    method:'POST',agent:false,signal:init.signal,
    headers:{'Content-Type':'application/json','Content-Length':String(init.body.length)}
   },res=>{
    if(settled){res.resume?.();return;}
    if(res.statusCode>=300&&res.statusCode<400){
     destroy(errorWithCode('R190BO_REDIRECT_BLOCKED','Ollama endpoint returned HTTP redirect'));return;
    }
    if(headerTimer!==null){clearTimeout(headerTimer);headerTimer=null;}
    let bytes=0;const chunks=[];
    const resetBodyTimer=()=>{
     if(bodyTimer!==null)clearTimeout(bodyTimer);
     bodyTimer=setTimeout(()=>destroy(errorWithCode('R190BO_BODY_IDLE_TIMEOUT',
      'No body data received within the bounded body idle timeout')),bodyIdleTimeoutMs);
    };
    resetBodyTimer();
    res.on('data',chunk=>{
     if(settled)return;
     const b=Buffer.from(chunk);bytes+=b.length;
     if(bytes>maxResponseBytes){destroy(errorWithCode('R190BO_BODY_TOO_LARGE','HTTP response exceeded local evidence budget'));return;}
     chunks.push(b);resetBodyTimer();
    });
    res.on('error',finish);
    res.on('aborted',()=>destroy(errorWithCode('R190BO_RESPONSE_ABORTED','HTTP response terminated before completion')));
    res.on('end',()=>{
     if(settled)return;
     const body=Buffer.concat(chunks);
     // BO reads bytes via response.arrayBuffer; copy avoids exposing Buffer slab offsets.
     const responseBytes=Uint8Array.from(body).buffer;
     finish(null,{status:res.statusCode,ok:res.statusCode>=200&&res.statusCode<300,
      arrayBuffer:async()=>responseBytes});
    });
   });
   req.on('error',finish);
   headerTimer=setTimeout(()=>destroy(errorWithCode('R190BO_HEADERS_TIMEOUT',
    'No Ollama HTTP response headers within the bounded header wait')),headersTimeoutMs);
   req.end(init.body);
  }catch(error){if(req&&!req.destroyed)req.destroy(error);finish(error);}
 });
}

export function transportErrorFacts(error){
 const cause=error&&typeof error==='object'?error.cause:null;
 const str=v=>typeof v==='string'?v.slice(0,512):null;
 return {
  name:str(error?.name),code:str(error?.code),message:str(error?.message),
  causeName:str(cause?.name),causeCode:str(cause?.code),causeMessage:str(cause?.message)
 };
}
