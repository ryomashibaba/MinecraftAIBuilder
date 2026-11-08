/**
 * B198Z-R8: tiny READ-ONLY localhost Ollama readiness probe.
 * GET /api/tags only: never /api/generate, /api/chat, /api/pull or model load.
 * Purpose: refuse an expensive inference when model isn't already installed.
 * Not a GPU-memory test, provider identity proof, or user authorization.
 */
import http from 'node:http';
export const SCHEMA='minecraftaibuilder-b198zr8-read-only-model-preflight-v1';
const bad=x=>{throw Error('B198ZR8_'+x)};
const requireIt=(c,s)=>{if(!c)bad(s)};
export async function checkR8LocalModelAvailable({
 model,port=11434,timeoutMs=3500,transport=http
}={}){
 requireIt(typeof model==='string'&&/^[A-Za-z0-9._:/-]{2,140}$/.test(model),
  'EXPLICIT_MODEL_NAME_REQUIRED');
 requireIt(Number.isSafeInteger(port)&&port>0&&port<=65535,
  'INVALID_PORT');
 requireIt(Number.isSafeInteger(timeoutMs)&&timeoutMs>=1000&&
  timeoutMs<=10000,'INVALID_TIMEOUT');
 requireIt(typeof transport?.request==='function','TRANSPORT');
 const label={schema:SCHEMA,modelRequested:model,
  providerIdentityAuthenticated:false,
  modelActuallyLoaded:false,modelGenerationTriggered:false,
  onlyReadOnlyTagsGET:true,endpoint:'127.0.0.1:'+port};
 return new Promise(resolve=>{
  let settled=false,received=0,body='';
  const done=(status)=>{
   if(settled)return;settled=true;
   clearTimeout(timer);
   resolve({...label,status,readiness:status==='EXACT_MODEL_LISTED'?
    'READ_ONLY_MODEL_LISTED_NOT_GPU_VERIFIED':'HOLD_NO_INFERENCE',
    inferenceRequests:0,worldContacts:0,worldWrites:0});
  };
  let req;
  const timer=setTimeout(()=>{
   // Set the true timeout result BEFORE destroying the socket: destruction
   // may emit an error, and must never replace a timeout with 'unreachable'.
   done('HOLD_TAGS_TIMEOUT');
   if(req)req.destroy();
  },timeoutMs);
  try{
   req=transport.request({
    protocol:'http:',hostname:'127.0.0.1',port,path:'/api/tags',
    method:'GET',agent:false,headers:{Accept:'application/json'}
   },res=>{
    if(res.statusCode!==200){
     res.resume();return done('HOLD_TAGS_HTTP_NOT_OK');
    }
    res.on('data',chunk=>{
     received+=chunk.length;
     if(received>256000){req.destroy();return done('HOLD_TAGS_RESPONSE_TOO_LARGE')}
     body+=chunk.toString('utf8');
    });
    res.on('error',()=>done('HOLD_TAGS_STREAM_ERROR'));
    res.on('end',()=>{
     try{
      const o=JSON.parse(body);
      requireIt(Array.isArray(o.models)&&o.models.length<=1024,
       'INVALID_TAGS_SHAPE');
      const names=o.models.map(x=>x?.name??x?.model).filter(x=>typeof x==='string');
      done(names.includes(model)?'EXACT_MODEL_LISTED':'HOLD_EXACT_MODEL_MISSING');
     }catch{done('HOLD_INVALID_TAGS_JSON')}
    });
   });
   req.on('error',()=>done('HOLD_LOCAL_OLLAMA_UNREACHABLE'));
   req.end();
  }catch{done('HOLD_LOCAL_OLLAMA_UNREACHABLE')}
 });
}
