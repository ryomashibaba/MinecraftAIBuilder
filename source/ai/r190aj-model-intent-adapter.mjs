/** R190-AJ: one explicitly consented local AF intent -> unapproved AG B143 study.
 * No default network request, automatic repair, adoption or Minecraft I/O.
 */
import {createHash} from 'node:crypto';
import {inspectR190AFIntent,R190AF_INTENT_SCHEMA} from './r190af-program-intent.mjs';
import {studyR190AG} from './r190ag-integrated-proposals.mjs';
import {scanR190ExplicitBriefCapabilities,validateR190ProgramSpec,
 auditR190ExplicitProgram,verifyR190ProgramInCompiledSource}
 from './r190-request-coverage.mjs';
import {r190AGSemanticProjection} from './r190ag-integrated-proposals.mjs';
import {R190_UNSUPPORTED_CAPABILITIES} from './r190-model-proposal.mjs';

const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const fail=x=>{throw Error('R190AJ_'+x);};
const modelId=/^[A-Za-z0-9._:/-]{2,140}$/;
const localUrl=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const safety=()=>({readiness:'NOT_PREPARED',executionAllowed:false,
 constructionApproved:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldWrites:0,art:'ART_HOLD'});
export const R190AJ_SYSTEM_GUIDE=[
 'You are an independent original architect; do NOT use building-type templates.',
 'Return ONE JSON object ONLY, following existing schema minecraftaibuilder-r190af-program-intent-v1.',
 'Required exact fields: schema,id,title,brief,site,root,children,materials.',
 'site exact width,depth,height; width/depth 24..80 and height 10..32.',
 'root EXACT id,purpose,width,depth,height,privacy,spatialRole. Do not write parentId or side on root, even null.',
 'children 2..5, each required id,purpose,width,depth,height,privacy,spatialRole,parentId,side; optional tangentShift integer -24..24.',
 'Optional tangentShift on a child is the model-chosen signed wall-parallel offset, changing the entire building mass. No root offset; if infeasible, fail closed rather than have the host substitute a different position.',
 'id values are lowercase alphanumeric hyphen slugs beginning with letter, 3..40 chars.',
 'Room width/depth 7..22, height 7..site.height-2. privacy public/shared/private; spatialRole enclosed/open-court.',
 'Every child has a known parent, no cycles, side north/south/east/west. No child immediately south of root.',
 'At most one real unroofed open-court, at least two enclosed rooms, all rooms must fit site.',
 'materials exact floor,wall,roof, values wood/stone/concrete/metal.',
 'Optional entranceFace north/south/east/west, MODEL chosen, defaults south if absent. No root child on the entranceFace. Generate real doorway and three-cell exterior landing in chosen direction.',
 'Optional formIntent exact spaceId,face,cornerInset 2..3, for one enclosed room.',
 'Optional roofFormIntent exact spaceId,profile ridge/shed/sawtooth,axis x/z,rise 2..5; sawtooth requires toothWidth 3..8. It cannot target a faceted room. room.height + rise < site.height.',
 'Optional skyCourtIntent exact spaceId,offsetX,offsetZ,width,depth. Select an enclosed room for a genuinely open-sky internal courtyard: width/depth 4..14, offsets >=2, offset+size <= room size-2. Cannot share a room with roofFormIntent/formIntent; this is an uncovered weather-exposed void, not glass or a second room.',
 'Only choose skyCourtIntent if it genuinely improves the architectural space and daylight concept. The host generates the roof as strips, not a solid box followed by CUT.',
 'Optional skyCourtIntent.openFace north/south/east/west makes a U-shaped exterior-facing void. The court must reach exactly that exterior facade, with at least two roof cells along the other three edges. Do not overlap a root entry, parent-child direct portal, or glazing. This opening does NOT automatically certify a second playable exterior entrance.',
 'Optional additionalPassages 1..3 non-tree ID pairs; never duplicate parent-child links. Each needs a REAL shared-wall two-wide entrance.',
 'Optional daylightIntents 1..5, EXACT spaceId,face,width,height, where face is north/south/east/west, width 2..6,height 2..4, only enclosed nonfaceted rooms.',
 'Never add offset or baseY to daylightIntents. A host may only propose unapproved feasible coordinates later.',
 'PURPOSE and PRIVACY fields are labels: alone they do NOT create any physical difference in voxels.',
 'Choose parentId, side and optional additionalPassages to realize public routes and meaningful private separation. Avoid public destinations accessible only through private rooms unless deliberately intended.',
 'Select shape, courtyard, roof and glazing only when meaningful to the architectural concept, NOT as a mandatory checklist.',
 'Compiler supports one level only: no real stairs, second storeys, multi-entry system, furniture or fully certified daylight.',
 'Do not flatten unsupported major user requirements, fabricate missing room topology or claim artistic approval.',
 'Do not emit Minecraft commands, coordinates from prior buildings, extra JSON fields or markdown.'
].join('\n');
export function preflightR190AJBrief(brief){
 if(typeof brief!=='string'||brief.length<8||brief.length>8000)fail('BRIEF');
 const detected=scanR190ExplicitBriefCapabilities(brief);
 const unsupported=detected.filter(x=>R190_UNSUPPORTED_CAPABILITIES.includes(x.capability));
 return {detected,unsupported,
  completeness:'LITERAL_ONLY_NOT_COMPLETE_NATURAL_LANGUAGE_UNDERSTANDING'};
}
export function reviewR190AJOriginal(raw,{
 brief=null,maxLayoutVariantsPerStrategy=1,acceptanceSpec=null
}={}){
 if(!Number.isSafeInteger(maxLayoutVariantsPerStrategy)||
  maxLayoutVariantsPerStrategy<1||maxLayoutVariantsPerStrategy>4)fail('LAYOUT_BUDGET');
 const receipt={schema:'minecraftaibuilder-r190aj-source-review-v1',
  status:'HOLD_ORIGINAL_INTENT',originalSha256:typeof raw==='string'?hash(raw):null,
  originalUnmodified:true,modelCallsByReview:0,sourceAuthorUnverified:true,
  hostChangedSemanticFields:false,proposalAutoApplied:false,
  proposalApproved:false,geometryExpressesPurpose:'NOT_CERTIFIED',
  geometryExpressesPrivacy:'NOT_CERTIFIED',...safety()};
 // Explicit independently supplied criteria are NEVER invented from the
 // brief or transmitted to the model to coax a passing answer.
 // Validate before any source compilation, so malformed specs fail closed.
 const validatedSpec=validateR190ProgramSpec(acceptanceSpec);
 receipt.acceptanceSpecSha256=validatedSpec===null?null:
  hash(JSON.stringify(validatedSpec));
 receipt.independentProgramReview={status:'NOT_SPECIFIED',
  requirementsCount:0,independentlyVerified:false,
  semanticIssues:[],sourceChecks:[]};
 const out={originalRaw:raw,receipt,af:null,ag:null};
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>120000){
  receipt.reason='INVALID_RAW';return out;
 }
 if(brief!==null){
  const p=preflightR190AJBrief(brief);receipt.briefPreflight=p;
  if(p.unsupported.length){receipt.reason='UNSUPPORTED_EXPLICIT_BRIEF';return out;}
 }
 const af=inspectR190AFIntent(raw);out.af=af;
 if(!af.sourcePreview||af.error){receipt.reason=af.error??af.status;return out;}
 if(brief!==null){
  const p=JSON.parse(raw),c=receipt.briefPreflight.detected;
  const roof=c.find(x=>x.capability==='roof-profile-design');
  const literal=roof?.literalEvidence??'';
  const expected=/鋸歯|sawtooth/i.test(literal)?'sawtooth':
   /片流れ/i.test(literal)?'shed':/切妻|gabled?/i.test(literal)?'ridge':null;
  if(roof&&(!p.roofFormIntent||(expected&&p.roofFormIntent.profile!==expected))){
   receipt.reason='EXPLICIT_ROOF_LOST';return out;
  }
  if(c.some(x=>x.capability==='non-tree-adjacency')&&
   !(p.additionalPassages?.length>0)){
   receipt.reason='EXPLICIT_CROSS_LINK_LOST';return out;
  }
 }
 const independent= auditR190ExplicitProgram(
  r190AGSemanticProjection(JSON.parse(raw)),validatedSpec);
 receipt.independentProgramReview={
  status:independent.status,
  requirementsCount:independent.requirementsCount,
  independentlyVerified:false,
  semanticIssues:structuredClone(independent.issues),
  matchedRooms:structuredClone(independent.matchedRooms),
  sourceChecks:[]
 };
 if(independent.issues.length){
  receipt.reason='MODEL_AUTHORED_PROGRAM_DOES_NOT_MEET_EXPLICIT_SPEC';
  receipt.status='HOLD_UNSATISFIED_EXPLICIT_PROGRAM';
  return out;
 }
 const ag=studyR190AG(raw,{maxLayoutVariantsPerStrategy});out.ag=ag;
 // When daylight intents exist, the no-glass baseline does NOT satisfy the
 // complete source: only jointly verified glass trials may qualify.
 const originalPlan=JSON.parse(raw);
 const sourceCandidates=(originalPlan.daylightIntents?.length??0)>0?
  ag.proposals.map(x=>({strategy:x.strategy,variant:x.layoutVariantIndex,
   compiled:x.trial})):
  ag.baseline?[{strategy:ag.baseline.layout.strategy,
   variant:0,compiled:ag.baseline}]:[];
 if(validatedSpec!==null){
  const sourceChecks=sourceCandidates.map(candidate=>{
   try{
    const verified=verifyR190ProgramInCompiledSource(independent,
     candidate.compiled);
    return {strategy:candidate.strategy,variant:candidate.variant,
     status:verified.status,
     geometrySha256:candidate.compiled.compiled.geometrySha256,
     matchedRooms:verified.matchedRooms,
     directConnections:verified.directConnections};
   }catch(error){
    return {strategy:candidate.strategy,variant:candidate.variant,
     status:'HOLD_PHYSICAL_PROGRAM_MISMATCH',
     reason:String(error?.message??error).slice(0,160)};
   }
  });
  const verified=sourceChecks.some(x=>x.status===
   'VERIFIED_EXPLICIT_PROGRAM_IN_B143');
  receipt.independentProgramReview={
   ...receipt.independentProgramReview,sourceChecks,
   status:verified?'VERIFIED_EXPLICIT_PROGRAM_IN_B143':
    'HOLD_NO_COMPLETE_PHYSICAL_PROGRAM_PROOF',
   independentlyVerified:verified
  };
  if(sourceCandidates.length&& !verified){
   receipt.status='HOLD_EXPLICIT_PROGRAM_B143_MISMATCH';
   receipt.reason='NO_COMPILATION_SATISFIED_INDEPENDENT_REQUIREMENTS';
   return out;
  }
 }
 receipt.afStatus=af.status;receipt.agStatus=ag.report.status;
 receipt.unapprovedB143ProposalCount=ag.proposals.length;
 receipt.sourceGeometrySha256=af.sourcePreview.geometrySha256;
 receipt.publicRouteEvidence=ag.report.alternatives.map(a=>({
  strategy:a.strategy,layoutVariantIndex:a.layoutVariantIndex,
  status:a.status,meaningAudit:a.programMeaningAudit??null}));
 receipt.status=ag.proposals.length?'HOLD_UNAPPROVED_B143_PROPOSALS':
  ag.report.status==='PROVISIONAL_BASELINE_ONLY_ART_HOLD'?
   'PROVISIONAL_B143_NO_ART_APPROVAL':'HOLD_NO_FEASIBLE_INTEGRATED_3D';
 return out;
}
export function createR190AJLocalIntentAdapter({
 model,endpoint='http://127.0.0.1:11434/v1/chat/completions',
 fetcher=null,onRawModelResponse=null,timeoutMs=120000
}={}){
 if(typeof model!=='string'||!modelId.test(model))fail('MODEL');
 const m=typeof endpoint==='string'?localUrl.exec(endpoint):null;
 if(!m||Number(m[1])<1||Number(m[1])>65535)fail('LOCALHOST_ONLY');
 if(typeof fetcher!=='function')fail('EXPLICIT_FETCHER_REQUIRED');
 if(onRawModelResponse!==null&&typeof onRawModelResponse!=='function')fail('CALLBACK');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>900000)fail('TIMEOUT');
 return async function requestOne({
  brief,consentToOneModelCall=false,maxLayoutVariantsPerStrategy=1,
  acceptanceSpec=null
 }={}){
  const check=preflightR190AJBrief(brief);
  // External acceptance constraints are not model instructions.
  // Refuse malformed requirements BEFORE the one consented provider request.
  validateR190ProgramSpec(acceptanceSpec);
  if(!consentToOneModelCall)fail('NEW_CONSENT_REQUIRED');
  if(!Number.isSafeInteger(maxLayoutVariantsPerStrategy)||
   maxLayoutVariantsPerStrategy<1||maxLayoutVariantsPerStrategy>4)fail('LAYOUT_BUDGET');
  if(check.unsupported.length)return {originalRaw:null,receipt:{
   status:'HOLD_UNSUPPORTED_EXPLICIT_BRIEF',modelCalls:0,
   unsupported:check.unsupported,...safety()},af:null,ag:null};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const res=await fetcher(endpoint,{method:'POST',redirect:'error',
    signal:controller.signal,headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.35,
     response_format:{type:'json_object'},messages:[
      {role:'system',content:R190AJ_SYSTEM_GUIDE},
      {role:'user',content:JSON.stringify({request:brief,
       schema:R190AF_INTENT_SCHEMA,sourceOnly:true})}
     ]})});
   if(res?.ok!==true)fail('LOCAL_HTTP_'+String(res?.status??'UNKNOWN'));
   const data=await res.json();
   if(!Array.isArray(data?.choices)||data.choices.length!==1)fail('CHOICES');
   const choice=data.choices[0],raw=choice?.message?.content;
   if(typeof raw!=='string')fail('CONTENT');
   if(onRawModelResponse)onRawModelResponse(raw,{finishReason:choice.finish_reason??null});
   if(choice.finish_reason==='length')return {originalRaw:raw,af:null,ag:null,receipt:{
    status:'HOLD_TRUNCATED_MODEL_RESPONSE',originalSha256:hash(raw),
    modelCallsInRequest:1,...safety()}};
   const out=reviewR190AJOriginal(raw,{brief,maxLayoutVariantsPerStrategy,acceptanceSpec});
   out.receipt.modelCallsInRequest=1;
   out.receipt.transport='EXPLICIT_LOCAL_LOOPBACK_ONLY';
   return out;
  }finally{clearTimeout(timer);}
 };
}
