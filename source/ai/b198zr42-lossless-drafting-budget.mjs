/**
 * R42 — Offline, lossless B143 authoring-budget inspection.
 * Identifies contiguous repeated authored geometry and TESTS a source-level
 * repeat suggestion against the exact final conceptual voxels. Neither a
 * production auto-rewriter nor a model prompt/live service; no Minecraft.
 */
import {createHash} from 'node:crypto';
import {compileDesign} from './b143-building-dsl.mjs';
import {readR4PlannedProposal} from './b198zr4-planned-source.mjs';

export const SCHEMA='minecraftaibuilder-b198zr42-lossless-drafting-budget-v1';
export const PROFILE='r42-source-budget-OFFLINE_NOT_ENABLED';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=x=>Buffer.byteLength(typeof x==='string'?x:JSON.stringify(x),'utf8');
const VEC=['origin','center','start','end'];
const MAX_GROUPS_TO_PROVE=6;
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const plain=(value)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const positionalKey=e=>VEC.find(k=>Array.isArray(e?.[k]));
const stripPositions=e=>JSON.stringify(
 Object.fromEntries(Object.entries(e).filter(([key])=>
  key!=='id'&&!VEC.includes(key)).sort(([a],[b])=>a.localeCompare(b))));
const translated=(a,b,delta)=>{
 if(!plain(a)||!plain(b)||a.repeat!==undefined||b.repeat!==undefined ||
  a.shape!==b.shape||stripPositions(a)!==stripPositions(b))return false;
 for(const key of VEC){
  if((a[key]===undefined)!==(b[key]===undefined))return false;
  if(a[key]===undefined)continue;
  if(!Array.isArray(a[key])||!Array.isArray(b[key])||
   a[key].length!==3||b[key].length!==3||
   a[key].some((n,i)=>!Number.isSafeInteger(n)||
    !Number.isSafeInteger(b[key][i])||b[key][i]!==n+delta[i]))
   return false;
 }
 return true;
};
function runs(elements){
 const result=[];
 for(let i=0;i<elements.length-2;){
  const a=elements[i],b=elements[i+1],key=positionalKey(a);
  if(!key||!Array.isArray(b?.[key])||a.repeat!==undefined||b.repeat!==undefined){
   i++;continue;
  }
  const delta=a[key].map((v,j)=>b[key][j]-v);
  if(!delta.some(n=>n!==0)||!translated(a,b,delta)){
   i++;continue;
  }
  let count=2;
  while(count<32&&i+count<elements.length&&
    translated(elements[i+count-1],elements[i+count],delta))count++;
  if(count>=3)result.push({startIndex:i,count,offset:delta});
  i+=count>=3?count:1;
 }
 return result;
}
function parity(a,b){
 if(a.primitives.length!==b.primitives.length)return false;
 // Geometry SHA contains SOURCE and is not suitable for lossless parity.
 // The sorted, material-coded final conceptual cells ARE authoritative.
 for(let i=0;i<a.primitives.length;i++){
  const p=a.primitives[i],q=b.primitives[i];
  if(p.length!==q.length||p.some((v,j)=>v!==q[j]))return false;
 }
 return true;
}
function code(error){
 return String(error?.message??'').match(/\b(?:B143|B198ZR4)_[A-Z0-9_]+/)?.[0] ??
  'OFFLINE_SOURCE_REJECTED';
}
/**
 * Analyze an immutable raw response. Candidate source exists only in memory
 * to verify identical final primitives; it is NEVER written, submitted to a
 * model, or treated as the model's original. Byte savings refer to CANONICAL
 * JSON.stringify UTF-8, not the tokenizer or original pretty-print spacing.
 */
export function inspectR42AuthoringBudget(raw){
 if(typeof raw!=='string'||!raw.length||bytes(raw)>120000)
  throw Error('B198ZR42_RAW_SIZE');
 const common={schema:SCHEMA,profile:PROFILE,rawSha256:hash(raw),
  originalBytes:bytes(raw),originalUntouched:true,originalAuthorshipVerified:false,
  sourceAutoRepaired:false,liveProfileEnabled:false,
  outputTokensMeasured:false,contextFitVerified:false,
  modelArchitecturalImprovementProven:false,humanAestheticApproval:false,
  minecraftWalkingVerified:false,modelCalls:0,worldContacts:0,worldWrites:0,
  safety:safety()};
 let obj,proposal,base;
 try{
  obj=JSON.parse(raw);
  proposal=readR4PlannedProposal(obj);
  base=compileDesign(proposal.design);
 }catch(e){
  return {...common,status:'HOLD_SOURCE_NOT_ANALYZABLE',
   sourceErrorCode:code(e),parityVerifiedSuggestions:[],
   noSilentRepair:true};
 }
 const elements=proposal.design.elements;
 const canonicalBytes=bytes(obj);
 const elementBytes=elements.map((e,index)=>({
  index,id:e.id,shape:e.shape,bytes:bytes(e),
  repeatedInstances:e.repeat?.count??1
 })).sort((a,b)=>b.bytes-a.bytes||a.index-b.index);
 const runsFound=runs(elements);
 const suggestions=[];
 for(const group of runsFound.slice(0,MAX_GROUPS_TO_PROVE)){
  const prior=elements[group.startIndex],compressed=structuredClone(prior);
  compressed.repeat={count:group.count,offset:group.offset};
  const nextDesign={...proposal.design,elements:[
   ...elements.slice(0,group.startIndex),compressed,
   ...elements.slice(group.startIndex+group.count)]};
  const saving=bytes(proposal.design)-bytes(nextDesign);
  if(saving<=0)continue;
  try{
   const alternative=compileDesign(nextDesign);
   if(!parity(base,alternative))continue;
   suggestions.push({
    startIndex:group.startIndex,consecutiveCount:group.count,
    originalElementIds:elements.slice(group.startIndex,
     group.startIndex+group.count).map(e=>e.id),
    firstElementId:prior.id,offset:group.offset,
    proposedRepeat:{count:group.count,offset:group.offset},
    savedCanonicalDesignBytes:saving,
    exactFinalPrimitivesParity:true,
    independentHumanQualityProven:false,
    originalSourceUnchanged:true
   });
  }catch{
   // Never suggest a shorthand that fails the actual B143 compiler.
  }
 }
 return {...common,status:'OFFLINE_DRAFTING_EFFICIENCY_INSPECTED',
  designSourceSha256:base.sourceSha256,
  canonicalWholeResponseBytes:canonicalBytes,
  canonicalDesignBytes:bytes(proposal.design),
  canonicalSpatialPlanBytes:bytes(proposal.spatialPlan),
  elementCount:elements.length,
  existingRepeatElements:elements.filter(e=>e.repeat).length,
  staircaseElements:elements.filter(e=>e.shape==='staircase').length,
  finalConceptualVoxelCount:base.primitives.length,
  largestElementByteCosts:elementBytes.slice(0,5),
  consecutiveRepeatCandidateGroups:runsFound.length,
  evaluatedCandidateGroups:Math.min(runsFound.length,MAX_GROUPS_TO_PROVE),
  parityVerifiedSuggestions:suggestions,
  totalSavingsCannotBeAddedWithoutJointValidation:true,
  noModificationWasApplied:true,
  actualOutputTokenReductionVerified:false,
  actualArchitectureQualityVerified:false};
}
