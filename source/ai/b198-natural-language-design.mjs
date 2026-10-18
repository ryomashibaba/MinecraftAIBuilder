/**
 * B198A — category-neutral natural-language -> true B143 source design.
 *
 * The architectural reasoning is performed by an injected language-model
 * adapter, NOT by a hard-coded keyword parser or fabricated 'AI' fallback.
 * No API key, world coordinate, executable code, or Minecraft write in
 * any returned candidate. Every model response is adversarial input.
 */
import {createHash} from 'node:crypto';
import {SCHEMA as B143,MAX_CELLS,validateDesign,compileDesign,verifyCompiled}
 from './b143-building-dsl.mjs';
export const SCHEMA='minecraftaibuilder-b198a-generic-architect-v1';
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const reject=(why)=>{throw Error('B198A_'+why)};
const requireThat=(b,why)=>{if(!b)reject(why)};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).every(k=>keys.includes(k));
const validPrompt=s=>typeof s==='string'&&s.trim().length>=8&&
 s.length<=8000&&!/[\u0000-\u0008\u000b-\u001f]/.test(s);
const limitedText=(s,max)=>typeof s==='string'&&s.length<=max&&
 !/[\u0000-\u0008\u000b-\u001f]/.test(s);
const MAX_ATTEMPTS=2;
const immutableBlank=()=>({
 constructionApproved:false,executionAllowed:false,readiness:'NOT_PREPARED',
 worldCoordinates:null,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
});
/** Never call a model without a real supplied adapter.
 * AI candidate JSON has exactly design, explanation, assumptions fields.
 */
export function readModelProposal(raw){
 if(typeof raw==='string'){
  requireThat(raw.length>0&&raw.length<=60000,'MODEL_RESPONSE_SIZE');
  try{raw=JSON.parse(raw)}catch{reject('MODEL_RESPONSE_NOT_JSON')}
 }
 requireThat(exact(raw,['design','explanation','assumptions'])&&
  Object.keys(raw).length===3,'UNTRUSTED_MODEL_PROPOSAL_FIELDS');
 requireThat(limitedText(raw.explanation,800)&&
  raw.explanation.length>=3,'EXPLANATION_MISSING');
 requireThat(Array.isArray(raw.assumptions)&&raw.assumptions.length<=12&&
  raw.assumptions.every(s=>limitedText(s,250)),'UNTRUSTED_ASSUMPTIONS');
 requireThat(raw.design!==null&&typeof raw.design==='object'&&
  !Array.isArray(raw.design),'MISSING_DESIGN_OBJECT');
 validateDesign(raw.design);
 return raw;
}
/** Source-specific diff: preserves independent IDs and verifies actual
 * coordinate/material operations; no string-based pseudo-revision. */
export function diffSourceDesigns(before,after){
 validateDesign(before);validateDesign(after);
 requireThat(before.id===after.id,'DESIGN_ID_CHANGED');
 const was=new Map(before.elements.map(e=>[e.id,e]));
 const now=new Map(after.elements.map(e=>[e.id,e]));
 const added=[...now.keys()].filter(id=>!was.has(id));
 const removed=[...was.keys()].filter(id=>!now.has(id));
 const changed=[...now.keys()].filter(id=>
  was.has(id)&&JSON.stringify(was.get(id))!==JSON.stringify(now.get(id)));
 const unchanged=[...now.keys()].filter(id=>
  was.has(id)&&JSON.stringify(was.get(id))===JSON.stringify(now.get(id)));
 const metadataChanged=['title','brief','bounds'].some(k=>
  JSON.stringify(before[k])!==JSON.stringify(after[k]));
 return {added,removed,changed,unchanged:unchanged.length,
  metadataChanged,totalTouched:added.length+removed.length+changed.length,
  beforeSourceSha256:sha(before),afterSourceSha256:sha(after)};
}
export function validateB198Review(review){
 return Boolean(review&&review.schema===SCHEMA&&
  ['creation','revision'].includes(review.action)&&
  review.mode==='MODEL_AUTHORED_B143_SOURCE'&&
  review.sourceOnlyHumanReviewRequired===true&&
  review.semanticComplianceNotAutomaticallyCertified===true&&
  review.physicalMinecraftWalkingNotCertified===true&&
  review.actualMinecraftPlacementNotCertified===true&&
  review.promptDigest?.length===64&&
  review.sourceSha256?.length===64&&review.geometrySha256?.length===64&&
  review.voxels>0&&review.voxels<=MAX_CELLS&&
  review.authoredElements>=1&&review.authoredElements<=160&&
  review.attemptCount>=1&&review.attemptCount<=MAX_ATTEMPTS&&
  review.revisionsAtomic===true&&
  review.safety?.readiness==='NOT_PREPARED'&&
  review.safety.constructionApproved===false&&
  review.safety.executionAllowed===false&&
  review.safety.worldCoordinates===null&&
  review.safety.worldContacts===0&&review.safety.worldWrites===0&&
  review.safety.gates?.length===9&&
  review.safety.gates.every(s=>s==='BLOCKED')&&
  Array.isArray(review.safety.BuildPlan?.operations)&&
  review.safety.BuildPlan.operations.length===0);
}
/**
 * generator: async function({mode,prompt,previousDesign,feedback,attempt})
 * -> {design,explanation,assumptions} or its complete JSON string.
 *
 * The generic design capabilities belong to the MODEL. No design types,
 * genre keyword routing or fixed templates are baked into this engine.
 * Review every output via the older STRICT B143 deterministic compiler.
 */
export async function proposeArchitecture({
 prompt,generator,baseDesign=null,expectedBaseSha256=null,
 protectedElementIds=[],allowRemovals=false,maxChangedElements=24,
 maxAttempts=MAX_ATTEMPTS
}={}){
 requireThat(validPrompt(prompt),'INVALID_NATURAL_LANGUAGE_PROMPT');
 requireThat(typeof generator==='function','ACTUAL_MODEL_ADAPTER_REQUIRED');
 requireThat(Number.isSafeInteger(maxAttempts)&&maxAttempts>=1&&
  maxAttempts<=MAX_ATTEMPTS,'ATTEMPT_LIMIT');
 const action=baseDesign===null?'creation':'revision';
 let frozenBase=null;
 if(action==='revision'){
  validateDesign(baseDesign);
  requireThat(typeof expectedBaseSha256==='string'&&
   expectedBaseSha256===sha(baseDesign),'STALE_REVISION_REJECTED');
  frozenBase=structuredClone(baseDesign);
  requireThat(Number.isSafeInteger(maxChangedElements)&&
   maxChangedElements>=1&&maxChangedElements<=60,'REVISION_CHANGE_LIMIT');
  requireThat(Array.isArray(protectedElementIds)&&
   new Set(protectedElementIds).size===protectedElementIds.length&&
   protectedElementIds.every(id=>baseDesign.elements.some(e=>e.id===id)),
   'INVALID_PROTECTED_SOURCE_ELEMENTS');
 }
 const errors=[];let final=null;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  let candidate;
  try{
   const message={
    mode:action,prompt,previousDesign:frozenBase===null?null:structuredClone(frozenBase),
    feedback:[...errors],attempt,maxAttempts
   };
   const raw=await generator(message);
   candidate=readModelProposal(raw);
   const d=candidate.design;
   requireThat(d.schema===B143&&d.designOnly===true,'DESIGN_SOURCE_ONLY');
   let changes=null;
   if(frozenBase!==null){
    changes=diffSourceDesigns(frozenBase,d);
    requireThat(changes.totalTouched>0||changes.metadataChanged,
     'EMPTY_REVISION_NO_ACTUAL_CHANGE');
    requireThat(changes.totalTouched<=maxChangedElements,'REVISION_EXCESSIVE_CHANGE');
    requireThat(allowRemovals||changes.removed.length===0,'REVISION_REMOVAL_NOT_APPROVED');
    for(const id of protectedElementIds){
     requireThat(changes.removed.every(x=>x!==id)&&
      changes.changed.every(x=>x!==id),
      'PROTECTED_ELEMENT_CHANGED_'+id);
    }
    requireThat(d.bounds.width>=frozenBase.bounds.width&&
     d.bounds.height>=frozenBase.bounds.height&&
     d.bounds.depth>=frozenBase.bounds.depth,
     'REVISION_SHRANK_LOCAL_BUILDING_BOUNDS');
   }
   const compiled=compileDesign(d);
   requireThat(verifyCompiled(d,compiled),'COMPILED_SOURCE_NOT_DETERMINISTIC');
   const review={schema:SCHEMA,action,mode:'MODEL_AUTHORED_B143_SOURCE',
    sourceOnlyHumanReviewRequired:true,
    semanticComplianceNotAutomaticallyCertified:true,
    physicalMinecraftWalkingNotCertified:true,
    actualMinecraftPlacementNotCertified:true,
    promptDigest:sha(prompt),sourceSha256:compiled.sourceSha256,
    geometrySha256:compiled.geometrySha256,
    voxels:compiled.primitives.length,
    authoredElements:d.elements.length,
    sourceBounds:compiled.bounds,
    materialsUsed:Object.entries(compiled.stats.layerCounts)
     .filter(([_,count])=>count>0).map(([name,count])=>({name,count})),
    attemptCount:attempt,revisionDiff:changes,
    revisionsAtomic:true,
    modelExplanation:candidate.explanation,
    modelAssumptions:candidate.assumptions,
    failedAttempts:errors.map(e=>e.reason),
    safety:immutableBlank()};
   requireThat(validateB198Review(review),'REVIEW_RELEASE_GUARD');
   final={design:structuredClone(d),compiled,review};break;
  }catch(e){
   // Model errors, timeouts, malformed geometry, stale inputs fail closed.
   // The retry feedback includes ONLY bounded diagnostic text, never API
   // keys or complete raw prior model output.
   const reason=String(e?.message??e).slice(0,350);
   errors.push({attempt,reason});
   // Transport/connection failure is not a malformed B143 proposal. Never
   // repeat an expensive local request for the identical broken connection.
   if(reason.includes('B198Q_LOCAL_TRANSPORT_'))throw e;
   if(attempt===maxAttempts){
    const err=Error('B198A_CANDIDATE_REJECTED_AFTER_'+maxAttempts+
      '_ATTEMPTS_'+reason);
    err.code='B198A_SOURCE_REVIEW_HOLD';
    err.attempts=errors;throw err;
   }
  }
 }
 requireThat(final!==null,'NO_REVIEWED_SOURCE');
 return final;
}
