/**
 * R190-O: inspect one saved REAL model reply without contacting a provider.
 * Differentiate model-written IR, host coordinate placement and host-only
 * counterfactual. Never "repair" the archived original or certify its design.
 */
import {createHash} from 'node:crypto';
import {R190_SCHEMA,validateR190SemanticPlan,compileR190SemanticPlan,
 R190_LAYOUT_STRATEGIES} from './r190-semantic-massing.mjs';
import {readR190ModelProposal} from './r190-model-proposal.mjs';

export const R190O_SCHEMA='minecraftaibuilder-r190o-offline-diagnostics-v1';
const hash=x=>createHash('sha256').update(x,'utf8').digest('hex');
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const knownRoot=new Set(['schema','id','title','brief','site','entrySpaceId',
 'spaces','materials','formIntent','roofFormIntent','crossConnections']);
const roomFields=new Set(['id','purpose','width','depth','height','parentId',
 'side','privacy','spatialRole']);
const fault=(code,path,message,extra={})=>({code,path,message,...extra});
const fail=x=>{throw Error('R190O_'+x);};

export function inspectR190OOriginal(raw){
 if(typeof raw!=='string'||raw.length<1||raw.length>120000)
  fail('RAW_LENGTH');
 const issues=[];
 let response;
 try{response=JSON.parse(raw);}
 catch{return {status:'HOLD_INVALID_JSON',rawSha256:hash(raw),
  strictOriginalResult:'INVALID_JSON',
  issues:[fault('INVALID_JSON','$','The original is not valid JSON')],
  extractedSemanticIntent:null,parsedResponse:null};}
 const plan=response?.semanticPlan;
 if(!record(plan))issues.push(fault('SEMANTIC_PLAN_MISSING',
  '$.semanticPlan','No semanticPlan object'));
 const rooms=Array.isArray(plan?.spaces)?plan.spaces:[];
 if(record(plan)){
  for(const name of ['schema','id','title','brief','site','entrySpaceId',
   'spaces','materials']){
   if(!Object.hasOwn(plan,name))issues.push(fault('MISSING_REQUIRED_FIELD',
    '$.semanticPlan.'+name,'Required field absent'));
  }
  for(const key of Object.keys(plan))
   if(!knownRoot.has(key))issues.push(fault('UNKNOWN_PLAN_FIELD',
    '$.semanticPlan.'+key,'Unexpected semanticPlan field; do not silently delete it'));
  if(plan.schema!==undefined&&plan.schema!==R190_SCHEMA)
   issues.push(fault('WRONG_PLAN_SCHEMA','$.semanticPlan.schema',
    'Incorrect semanticPlan schema value',{provided:plan.schema}));
  for(let i=0;i<rooms.length;i++){
   const s=rooms[i];if(!record(s))continue;
   for(const key of Object.keys(s))
    if(!roomFields.has(key))issues.push(fault(
     key==='formIntent'?'NESTED_FORM_INTENT':'UNKNOWN_SPACE_FIELD',
     '$.semanticPlan.spaces['+i+'].'+key,
     key==='formIntent'?
      'formIntent is not permitted on an individual room; moving it to plan scope may conflict with a roof':
      'Unexpected room field; do not silently ignore it',
     {roomId:s.id??null}));
  }
  const form=plan.formIntent,roof=plan.roofFormIntent;
  if(record(form)&&record(roof)&&form.spaceId===roof.spaceId)
   issues.push(fault('FACETED_ROOF_COMBINATION_UNSUPPORTED',
    '$.semanticPlan.formIntent',
    'The compiler cannot combine faceted footprint and roof section in the same wing'));
  for(let i=0;i<rooms.length;i++){
   const s=rooms[i];if(!record(s)||!record(s.formIntent))continue;
   if(record(roof)&&roof.spaceId===s.id)
    issues.push(fault('MOVED_FACET_WOULD_CONFLICT_WITH_ROOF',
     '$.semanticPlan.spaces['+i+'].formIntent',
     'Relocating this model-written facade intent to plan scope would conflict with the model roof on this room',
     {roomId:s.id}));
  }
  if(record(roof)&&record(plan.site)){
   const space=rooms.find(s=>record(s)&&s.id===roof.spaceId);
   if(space&&Number.isSafeInteger(space.height)&&Number.isSafeInteger(roof.rise)
    &&Number.isSafeInteger(plan.site.height)){
    const proposedTop=space.height+roof.rise;
    if(proposedTop>=plan.site.height)issues.push(fault('ROOF_EXCEEDS_SITE_HEIGHT',
     '$.semanticPlan.roofFormIntent',
     'Room height plus roof rise must be strictly below site height',
     {spaceId:space.id,roomHeight:space.height,rise:roof.rise,
      proposedTop,siteHeight:plan.site.height}));
   }
  }
  if(Array.isArray(plan.crossConnections)){
   const seen=new Set();
   for(let i=0;i<plan.crossConnections.length;i++){
    const pair=plan.crossConnections[i];if(!Array.isArray(pair)||pair.length!==2)continue;
    const [a,b]=pair,key=[...pair].sort().join('|');
    if(seen.has(key))issues.push(fault('DUPLICATE_CROSS_CONNECTION',
     '$.semanticPlan.crossConnections['+i+']','Repeated cross edge',{pair}));
    seen.add(key);
    if(rooms.some(s=>record(s)&&
     ((s.id===a&&s.parentId===b)||(s.id===b&&s.parentId===a))))
     issues.push(fault('CROSS_CONNECTION_DUPLICATES_TREE',
      '$.semanticPlan.crossConnections['+i+']',
      'This direct connection is already present as a parent-child edge',
      {pair}));
   }
  }
 }
 let strictOriginalResult='NOT_EVALUATED';
 try{
  readR190ModelProposal(raw);
  strictOriginalResult='STRICT_CONTRACT_ACCEPTED_NOT_HUMAN_ART_APPROVAL';
 }catch(e){strictOriginalResult=String(e?.message??e).slice(0,200);}
 return {status:issues.length||strictOriginalResult!==
  'STRICT_CONTRACT_ACCEPTED_NOT_HUMAN_ART_APPROVAL'?'HOLD_ORIGINAL':'ORIGINAL_CONTRACT_PASSED',
  rawSha256:hash(raw),strictOriginalResult,issues,
  extractedSemanticIntent:record(plan)?{
   entrySpaceId:plan.entrySpaceId??null,
   modelRoomPrograms:rooms.filter(record).map(s=>({
    id:s.id??null,purpose:s.purpose??null,width:s.width??null,
    depth:s.depth??null,height:s.height??null,
    parentId:s.parentId??null,side:s.side??null,
    privacy:s.privacy??null})),
   roofFormIntent:record(plan.roofFormIntent)?structuredClone(plan.roofFormIntent):null,
   modelWrittenExtraLinks:Array.isArray(plan.crossConnections)?
    structuredClone(plan.crossConnections):[],
   modelWrittenNestedForms:rooms.filter(s=>record(s)&&record(s.formIntent))
    .map(s=>({spaceId:s.id,formIntent:structuredClone(s.formIntent)}))
  }:null,
  parsedResponse:response};
}

/**
 * Pure HOST counterfactual. Only the four explicitly inventoried defects are
 * changed on a deep clone; the archived model bytes remain immutable. The
 * shadow is NOT an inference result, a model-compliant original, or art PASS.
 */
export function exploreR190OCounterfactual(raw){
 const inspection=inspectR190OOriginal(raw);
 const changes=[],outcomes=[],previews=[];
 const plan=inspection.parsedResponse?.semanticPlan;
 if(!record(plan)||!Array.isArray(plan.spaces))
  return {original:inspection,changes,outcomes,previews,
   counterfactualStatus:'HOLD_NO_SAFE_COUNTERFACTUAL'};
 const shadow=structuredClone(plan);
 if(!Object.hasOwn(shadow,'schema')){
  shadow.schema=R190_SCHEMA;
  changes.push({kind:'HOST_ADDED_METADATA',path:'$.semanticPlan.schema',
   from:'MISSING',to:R190_SCHEMA,modelAuthored:false});
 }
 // The faceted shape is discarded rather than falsely migrated into a
 // simultaneous faceted+profiled room, which this compiler cannot realize.
 for(let i=0;i<shadow.spaces.length;i++){
  const space=shadow.spaces[i];
  if(!record(space)||!Object.hasOwn(space,'formIntent'))continue;
  const old=structuredClone(space.formIntent);
  delete space.formIntent;
  changes.push({kind:'HOST_DISCARDED_MODEL_FORM_INTENT',
   path:'$.semanticPlan.spaces['+i+'].formIntent',
   from:old,to:'NOT_REPRESENTED_IN_SHADOW',
   modelAuthored:false,architecturalInformationLost:true});
 }
 const roof=shadow.roofFormIntent,site=shadow.site;
 if(record(roof)&&record(site)){
  const s=shadow.spaces.find(x=>record(x)&&x.id===roof.spaceId);
  if(s&&Number.isSafeInteger(s.height)&&Number.isSafeInteger(roof.rise)&&
   Number.isSafeInteger(site.height)&&s.height+roof.rise>=site.height){
   const proposed=site.height-roof.rise-1;
   if(proposed>=7&&proposed<s.height){
    changes.push({kind:'HOST_CHANGED_MODEL_ROOM_HEIGHT',
     path:'$.semanticPlan.spaces['+shadow.spaces.indexOf(s)+'].height',
     from:s.height,to:proposed,modelAuthored:false,
     architecturalInformationLost:true});
    s.height=proposed;
   }
  }
 }
 if(Array.isArray(shadow.crossConnections)){
  const prior=structuredClone(shadow.crossConnections);
  const kept=shadow.crossConnections.filter(([a,b])=>!shadow.spaces.some(s=>
   record(s)&&((s.id===a&&s.parentId===b)||(s.id===b&&s.parentId===a))));
  if(kept.length!==prior.length){
   if(kept.length===0)delete shadow.crossConnections;
   else shadow.crossConnections=kept;
   changes.push({kind:'HOST_REMOVED_REDUNDANT_CROSS_LINKS',
    path:'$.semanticPlan.crossConnections',from:prior,
    to:kept,modelAuthored:false,
    parentChildSemanticLinksRemain:true});
  }
 }
 try{validateR190SemanticPlan(shadow);}
 catch(e){return {original:inspection,changes,outcomes,previews,
  counterfactualStatus:'HOLD_SHADOW_IR_INVALID',
  counterfactualFailure:String(e?.message??e),shadowPlan:shadow};}
 for(const strategy of R190_LAYOUT_STRATEGIES){
  try{
   const candidate=compileR190SemanticPlan(shadow,{layoutStrategy:strategy});
   outcomes.push({strategy,status:'HOST_SHADOW_B143_VERIFIED',
    sourceSha256:candidate.compiled.sourceSha256,
    geometrySha256:candidate.compiled.geometrySha256,
    realVoxelCount:candidate.compiled.primitives.length,
    sourceRouteAuditPass:candidate.audit.allProgramSpacesReachable,
    modelAuthoredB143:false,humanArtReview:'ART_HOLD'});
   previews.push({strategy,design:candidate.design,compiled:candidate.compiled});
  }catch(e){outcomes.push({strategy,status:'HOLD_NO_VERIFIED_HOST_SHADOW_3D',
   failureCode:String(e?.message??e).slice(0,200),
   modelAuthoredB143:false,humanArtReview:'ART_HOLD'});}
 }
 return {original:inspection,changes,outcomes,previews,
  counterfactualStatus:previews.length?'HOST_SHADOW_ONLY_ART_HOLD':
   'HOLD_ALL_COUNTERFACTUAL_LAYOUTS',
  shadowPlan:shadow};
}
