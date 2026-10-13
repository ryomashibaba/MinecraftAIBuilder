/** One isolated offline source derivation. No subprocess, server, or network. */
import {Worker} from 'node:worker_threads';
export function assembleReferenceParent(){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./b113-reference-worker.mjs',import.meta.url),{
   execArgv:[]
  });
  worker.once('message',m=>{
   if(m?.sourceDerivationLocale!=='en-US'||!m.parent)reject(Error('B113_REFERENCE_LOCALE_FAILED'));
   else resolve(m.parent);
  });
  worker.once('error',reject);
  worker.once('exit',code=>{if(code!==0)reject(Error('B113_REFERENCE_WORKER_EXIT:'+code));});
 });
}
