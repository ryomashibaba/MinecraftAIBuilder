import {createHash} from 'node:crypto';

// Offline proposal only. Never authorizes a POST or certifies a memory peak.
const MiB=1048576, digest='bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8';
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const keys=['ramFree','commitHeadroom','gpuFree'];
const pre={ramFree:8192,commitHeadroom:16384,gpuFree:14214};
const during={ramFree:5120,commitHeadroom:8192,gpuFree:2560};
const validResources=r=>r&&[...keys,'gpuTotal'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&r.gpuTotal>0&&r.gpuFree<=r.gpuTotal;
const sha=s=>createHash('sha256').update(s).digest('hex');
export function estimateStudioResourceBudget({wireBody,requestSha256,runtimeSha256,tokenObservation,history,current}={}){
 const result={schema:'r125-studio-resource-budget-proposal-v1',status:'HOLD',modelPostCount:0,executionAllowed:false,resourceSafetyCertified:false,inferenceMemoryPeakCalibrated:false};
 const hold=reason=>({...result,reason});
 let body;
 try{if(typeof wireBody!=='string'||!hex(requestSha256)||sha(wireBody)!==requestSha256)throw Error();body=JSON.parse(wireBody);}catch{return hold('REQUEST_BINDING_INVALID');}
 if(body?.model!=='qwen3:14b'||body.stream!==false||body.max_tokens!==4096||body.temperature!==0.55||body.response_format?.type!=='json_schema'||!body.response_format?.json_schema?.schema||!Array.isArray(body.messages)||body.messages.length!==2||body.messages[0]?.role!=='system'||body.messages[1]?.role!=='user'||!body.messages.every(m=>typeof m.content==='string'&&m.content.length>0))return hold('REQUEST_SCOPE_MISMATCH');
 if(!hex(runtimeSha256)||history?.runtimeSha256!==runtimeSha256||history.modelDigest!==digest||history.contextLength!==16384||history.maxOutputTokens!==4096||!['json_schema','json_object'].includes(history.responseFormat)||history.kvCacheType!=='f16'||history.flashAttention!==false||history.parallel!==1||history.maxLoadedModels!==1)return hold('HISTORICAL_RUNTIME_SCOPE_UNKNOWN');
 // Token observation must cover the exact rendered input including schema/chat overhead.
 // This module checks binding only, not the provenance of the external tokenizer.
 if(tokenObservation?.requestSha256!==requestSha256||tokenObservation.modelDigest!==digest||tokenObservation.runtimeSha256!==runtimeSha256||!Number.isSafeInteger(tokenObservation.inputUpperBound)||tokenObservation.inputUpperBound<=0||tokenObservation.inputUpperBound>16384-4096)return hold('INPUT_TOKEN_BOUND_UNKNOWN_OR_TOO_LARGE');
 const {start,minimum,placement}=history;
 if(!hex(history.evidenceSha256)||!validResources(start)||!validResources(minimum)||!validResources(current)||start.gpuTotal!==minimum.gpuTotal||start.gpuTotal!==current.gpuTotal||keys.some(k=>minimum[k]>start[k])||!Number.isSafeInteger(placement?.sizeBytes)||placement.sizeBytes<9276198565||placement.sizeVramBytes!==placement.sizeBytes)return hold('HISTORICAL_RESOURCE_OBSERVATION_INVALID');
 const observedDrop=Object.fromEntries(keys.map(k=>[k,start[k]-minimum[k]]));
 // A json_object observation is a budget estimate, NOT matching schema peak evidence.
 // Preserve every original resource floor; only reduce the additional GPU reserve.
 const reserveMiB={ramFree:1024,commitHeadroom:1024,gpuFree:512};
 const responseFormatScope=history.responseFormat==='json_schema'?'SAME_FORMAT':'JSON_OBJECT_TO_JSON_SCHEMA_UNCALIBRATED';
 const required=Object.fromEntries(keys.map(k=>[k,Math.max(pre[k],during[k]+reserveMiB[k]+Math.max(observedDrop[k],k==='gpuFree'?Math.ceil(placement.sizeVramBytes/MiB):0))]));
 const deficits=Object.fromEntries(keys.map(k=>[k,Math.max(0,required[k]-current[k])]));
 return {...result,status:keys.some(k=>deficits[k]>0)?'HOLD':'ESTIMATE_ONLY',reason:keys.some(k=>deficits[k]>0)?'ESTIMATED_BUDGET_INSUFFICIENT':'OBSERVED_BUDGET_FITS_NOT_PEAK_PROOF',requestSha256,runtimeSha256,evidenceSha256:history.evidenceSha256,observedDropMiB:observedDrop,requiredMiB:required,deficitMiB:deficits,reserveMiB,responseFormatScope};
}
