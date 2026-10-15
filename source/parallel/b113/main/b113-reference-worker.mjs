/** Separate JS realm: reproduce the en-US ordering used by the authoritative B112 CI. */
import {parentPort} from 'node:worker_threads';
import {assembleB111} from '../../b111/main/compile-b111.mjs';
const nativeCompare=String.prototype.localeCompare;
try{
 // B102/B104 use localeCompare without a locale. Windows ja-JP and Linux en-US
 // select different tied room layouts. Confine the explicit locale to this worker.
 String.prototype.localeCompare=function(other,locales,options){
  return nativeCompare.call(this,other,locales??'en-US',options);
 };
 const parent=assembleB111();
 parentPort.postMessage({parent,sourceDerivationLocale:'en-US'});
}finally{
 String.prototype.localeCompare=nativeCompare;
 parentPort.close();
}
