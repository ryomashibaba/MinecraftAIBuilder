/** R190-AJ: one explicitly consented local AF intent -> unapproved AG B143 study.
 * No default network request, automatic repair, adoption or Minecraft I/O.
 */
import {createHash} from 'node:crypto';
import {inspectR190AFIntent,R190AF_INTENT_SCHEMA} from './r190af-program-intent.mjs';
import {studyR190AG} from './r190ag-integrated-proposals.mjs';
import {scanR190ExplicitBriefCapabilities} from './r190-request-coverage.mjs';
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
 'children 2..5, each EXACT id,purpose,width,depth,height,privacy,spatialRole,parentId,side.',
 'id values are lowercase alphanumeric hyphen slugs beginning with letter, 3..40 chars.',
 'Room width/depth 7..22, height 7..site.height-2. privacy public/shared/private; spatialRole enclosed/open-court.',
 'Every child has a known parent, no cycles, side north/south/east/west. No child immediately south of root.',
 'At most one real unroofed open-court, at least two enclosed rooms, all rooms must fit site.',
 'materials exact floor,wall,roof, values wood/stone/concrete/metal.',
 'Optional formIntent exact spaceId,face,cornerInset 2..3, for one enclosed room.',
 'Optional roofFormIntent exact spaceId,profile ridge/shed/sawtooth,axis x/z,rise 2..5; sawtooth requires toothWidth 3..8. It cannot target a faceted room. room.height + rise < site.height.',
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
export function reviewR190AJOriginal(raw,{brief=null,maxLayoutVariantsPerStrategy=1}={}){
 if(!Number.isSafeInteger(maxLayoutVariantsPerStrategy)||
  maxLayoutVariantsPerStrategy<1||maxLayoutVariantsPerStrategy>4)fail('LAYOUT_BUDGET');
 const receipt={schema:'minecraftaibuilder-r190aj-source-review-v1',
  status:'HOLD_ORIGINAL_INTENT',originalSha256:typeof raw==='string'?hash(raw):null,
  originalUnmodified:true,modelCallsByReview:0,sourceAuthorUnverified:true,
  hostChangedSemanticFields:false,proposalAutoApplied:false,
  proposalApproved:false,geometryExpressesPurpose:'NOT_CERTIFIED',
  geometryExpressesPrivacy:'NOT_CERTIFIED',...safety()};
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
 const ag=studyR190AG(raw,{maxLayoutVariantsPerStrategy});out.ag=ag;
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
  brief,consentToOneModelCall=false,maxLayoutVariantsPerStrategy=1
 }={}){
  const check=preflightR190AJBrief(brief);
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
   const out=reviewR190AJOriginal(raw,{brief,maxLayoutVariantsPerStrategy});
   out.receipt.modelCallsInRequest=1;
   out.receipt.transport='EXPLICIT_LOCAL_LOOPBACK_ONLY';
   return out;
  }finally{clearTimeout(timer);}
 };
}
