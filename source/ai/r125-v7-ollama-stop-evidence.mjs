/** Point-in-time unload evidence: NEVER infer server completion from client Abort
 * or an empty /api/ps response alone. This does not authorize a model POST.
 */
export function classifyOllamaStopEvidence({
 clientAbortSignaled=false,completionResponseObserved=false,models=null
}={}){
 const aborted=clientAbortSignaled===true;
 const completed=completionResponseObserved===true;
 const modelAbsent=Array.isArray(models)&&models.length===0;
 return {
  clientAbortSignaled:aborted,
  ollamaCompletionObserved:completed,
  ollamaModelAbsentAtProbe:modelAbsent,
  serverStopEvidence:completed&&!aborted?'COMPLETION_RESPONSE_OBSERVED':
   aborted?'UNKNOWN_AFTER_CLIENT_ABORT':'UNKNOWN',
  unloadConfirmed:completed&&!aborted&&modelAbsent
 };
}
