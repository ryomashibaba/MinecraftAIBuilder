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
   return item?.name==='qwen3:14b'&&item.digest===digest&&item.context_length===16384&&Number.isSafeInteger(item.size)&&item.size>0&&item.size===item.size_vram&&item.size<=data.history.placement.sizeVramBytes;
  },
  responseWithinBound(value){
   const u=value?.usage;
   return Number.isSafeInteger(inputUpperBound)&&Number.isSafeInteger(u?.prompt_tokens)&&u.prompt_tokens>0&&u.prompt_tokens<=inputUpperBound&&Number.isSafeInteger(u?.completion_tokens)&&u.completion_tokens>0&&u.completion_tokens<=4096&&u.prompt_tokens+u.completion_tokens<=16384;
  }
 });
}
