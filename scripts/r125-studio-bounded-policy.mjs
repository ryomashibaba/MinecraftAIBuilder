import {createHash} from 'node:crypto';
import {estimateStudioResourceBudget} from './r125-studio-resource-budget.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const digest='bdbd181c33f2ed1b31c972991882db3cf4d192569092138a7d29e973cd9debe8';
const settings=s=>s?.port===11435&&s.killOnCloseJob===true&&s.configuredContextLength===16384&&s.configuredParallelRequests===1&&s.configuredMaxLoadedModels===1&&s.configuredKeepAliveSeconds===0&&s.cloudDisabled===true&&s.configuredFlashAttention===false&&s.configuredKvCacheType==='f16'&&s.configuredGpuOverheadBytes===0&&s.configuredScheduleSpread===false&&s.configuredMaxQueue===1&&hex(s.ollamaExecutableSha256);

// The trusted external PRIVATE binding must verify the original measurement,
// same machine/runtime/model and exact rendered token upper bound. This
// module does not establish provenance, certify peak, or authorize a POST.
export function createStudioBoundedPolicy({request,wireBody,service,evidence}={}){
 if(!settings(service)||request?.headSha!==service.headSha||request?.model!=='qwen3:14b'||request?.endpoint!=='http://127.0.0.1:11435/v1/chat/completions'||request?.maxOutputTokens!==4096||!hex(request?.requestSha256)||typeof wireBody!=='string'||sha(wireBody)!==request.requestSha256)throw Error('BOUNDED_REQUEST_OR_RUNTIME_UNVERIFIED');
 if(evidence?.schema!=='r125-studio-bounded-private-evidence-v1'||evidence.provenanceVerified!==true||evidence.headSha!==request.headSha||evidence.requestSha256!==request.requestSha256||!hex(evidence.history?.evidenceSha256))throw Error('BOUNDED_PRIVATE_EVIDENCE_REQUIRED');
 const data=structuredClone({history:evidence.history,tokenObservation:evidence.tokenObservation});
 const evidenceSha256=sha(JSON.stringify(data));
 const evaluate=current=>estimateStudioResourceBudget({wireBody,requestSha256:request.requestSha256,runtimeSha256:service.ollamaExecutableSha256,...data,current});
 const inputUpperBound=data.tokenObservation?.inputUpperBound;
 return Object.freeze({
  evidenceSha256,
  evaluate,
  placementMatches(item){
   return item?.name==='qwen3:14b'&&item.digest===digest&&item.context_length===16384&&Number.isSafeInteger(item.size)&&item.size>=9276198565&&item.size===item.size_vram&&item.size<=data.history.placement.sizeVramBytes;
  },
  assessResponseUsage(value){
   const u=value?.usage;
   const count=k=>Number.isSafeInteger(u?.[k])&&u[k]>=0?u[k]:null;
   const promptTokens=count('prompt_tokens'),completionTokens=count('completion_tokens'),totalTokens=count('total_tokens');
   const actual={promptTokens,completionTokens,totalTokens};
   const choice=value?.choices?.[0];
   const base={inputUpperBound,actual,finishReason:typeof choice?.finish_reason==='string'?choice.finish_reason.slice(0,80):null};
   const answer=(status,reason,allow,usageVerified)=>({...base,status,reason,allow,usageVerified});
   if(!Number.isSafeInteger(inputUpperBound)||inputUpperBound<=0||inputUpperBound>12288)
    return answer('HOLD','INPUT_BOUND_INVALID',false,false);
   // The rendered-input estimate gates PRE-POST only. A completed response
   // can exceed that estimate without exceeding the configured context.
   if(promptTokens>12288||completionTokens>4096||totalTokens>16384||
      (promptTokens!==null&&completionTokens!==null&&promptTokens+completionTokens>16384))
    return answer('HOLD','REPORTED_HARD_TOKEN_LIMIT_EXCEEDED',false,false);
   if(['prompt_tokens','completion_tokens','total_tokens'].some(k=>u?.[k]!=null&&count(k)===null))
    return answer('HOLD','INVALID_REPORTED_TOKEN_COUNT',false,false);
   if(promptTokens>0&&completionTokens>0)
    return answer(promptTokens>inputUpperBound?'ESTIMATE_EXCEEDED':'WITHIN_ESTIMATE',
     promptTokens>inputUpperBound?'ACTUAL_PROMPT_EXCEEDS_ESTIMATE_NOT_CONTEXT':'REPORTED_COUNTS_WITHIN_LIMITS',true,true);
   // Missing/zero telemetry alone does not discard a normal completed answer.
   // This is NOT actual-token attestation; the adapter still checks the
   // response and B143, and the owned runtime/monitor still enforce the limits.
   if(Array.isArray(value?.choices)&&value.choices.length===1&&choice?.finish_reason==='stop'&&
      typeof choice?.message?.content==='string'&&choice.message.content.length>0)
    return answer('USAGE_UNVERIFIED','MISSING_OR_ZERO_PROVIDER_USAGE',true,false);
   return answer('HOLD','USAGE_UNVERIFIED_AND_RESPONSE_NOT_COMPLETE',false,false);
  }
 });
}
