/**
 * B198Q: explicit 127.0.0.1-only long-running model HTTP transport.
 * Replaces Node's default fetch solely in the explicitly opted-in local CLI:
 * built-in http.request has no Undici 300-second response-header deadline.
 * Caller-supplied AbortSignal remains the *actual* end-to-end deadline.
 * NO remote addresses, proxy, redirects, credentials or Minecraft I/O.
 */
import http from 'node:http';
export const SCHEMA='minecraftaibuilder-b198q-bounded-loopback-http-v1';
const URL_RE=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const MAX_REQUEST_BYTES=128*1024;
const MAX_RESPONSE_BYTES=512*1024;
function failure(code){
 const error=Error('B198Q_LOCAL_TRANSPORT_'+code);
 error.code='B198Q_LOCAL_TRANSPORT_'+code;
 return error;
}
export function isB198QTransportFailure(e){
 return /^B198Q_LOCAL_TRANSPORT_/.test(String(e?.code??e?.message??''));
}
function mappedError(e){
 if(isB198QTransportFailure(e))return e;
 const raw=String(e?.code??'UNKNOWN').replace(/[^A-Z0-9_]/gi,'').slice(0,35);
 return failure(raw||'UNKNOWN');
}
export function createB198QLoopbackFetcher(){
 return function strictlyLocalFetch(url,options={}){
  const match=typeof url==='string'?URL_RE.exec(url):null;
  if(!match||Number(match[1])<1||Number(match[1])>65535)
   return Promise.reject(failure('NON_LOOPBACK_ENDPOINT'));
  if(options.method!=='POST'||options.redirect!=='error'||
     options.headers?.Authorization!==undefined||
     options.headers?.authorization!==undefined)
   return Promise.reject(failure('UNSAFE_REQUEST_OPTIONS'));
  if(typeof options.body!=='string'||
     Buffer.byteLength(options.body,'utf8')>MAX_REQUEST_BYTES)
   return Promise.reject(failure('REQUEST_TOO_LARGE'));
  if(options.signal?.aborted)
   return Promise.reject(failure('CANCELLED_BEFORE_START'));
  return new Promise((resolve,reject)=>{
   let finished=false;
   const settle=(err,value)=>{
    if(finished)return;
    finished=true;
    options.signal?.removeEventListener('abort',onAbort);
    if(err)reject(mappedError(err));else resolve(value);
   };
   const onAbort=()=>req.destroy(failure('MODEL_DEADLINE_EXPIRED'));
   const req=http.request({
    hostname:'127.0.0.1',port:Number(match[1]),
    path:'/v1/chat/completions',method:'POST',
    agent:false,headers:{
     'Content-Type':'application/json',
     'Content-Length':Buffer.byteLength(options.body,'utf8')
    }
   },res=>{
    const chunks=[];
    let bytes=0;
    res.on('data',chunk=>{
     bytes+=chunk.length;
     if(bytes>MAX_RESPONSE_BYTES){
      req.destroy(failure('RESPONSE_TOO_LARGE'));
      res.destroy(failure('RESPONSE_TOO_LARGE'));
      return;
     }
     chunks.push(chunk);
    });
    res.on('error',err=>settle(err));
    res.on('end',()=>{
     const text=Buffer.concat(chunks).toString('utf8');
     settle(null,{ok:res.statusCode>=200&&res.statusCode<300,
      status:res.statusCode,
      json:async()=>{
       try{return JSON.parse(text)}
       catch{throw failure('MALFORMED_SERVER_JSON')}
      }});
    });
   });
   options.signal?.addEventListener('abort',onAbort,{once:true});
   req.on('error',err=>settle(err));
   // No separate undocumented 300s header timeout. The adapter's explicit
   // AbortController deadline owns the request across headers AND body.
   req.end(options.body);
  });
 };
}
