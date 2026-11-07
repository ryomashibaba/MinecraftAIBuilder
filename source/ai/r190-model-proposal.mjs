/**
 * R190-F: model-authored semantic design response, source-only.
 * This is a contract, NOT a model, planner, typology template, or Minecraft executor.
 * A host may declare required capabilities but must not fill room geometry/topology.
 */
import {createHash} from 'node:crypto';
import {R190_SCHEMA,validateR190SemanticPlan,compileR190SemanticPlan}
 from './r190-semantic-massing.mjs';
import {scanR190ExplicitBriefCapabilities,auditR190ExplicitProgram,
 verifyR190ProgramInCompiledSource}
 from './r190-request-coverage.mjs';

export const R190_MODEL_PROPOSAL_SCHEMA='minecraftaibuilder-r190-model-proposal-v1';
export const R190_SUPPORTED_CAPABILITIES=Object.freeze([
 'single-level-rooms','tree-adjacency','ground-entry','open-court',
 'single-faceted-wing','roof-profile-design','non-tree-adjacency'
]);
export const R190_UNSUPPORTED_CAPABILITIES=Object.freeze([
 'multiple-levels','stairs','vertical-accessibility','double-height-void',
 'multiple-exterior-entries','window-daylight-system',
 'facade-system','equipment-furniture'
]);
const known=new Set([...R190_SUPPORTED_CAPABILITIES,...R190_UNSUPPORTED_CAPABILITIES]);
const unsupported=new Set(R190_UNSUPPORTED_CAPABILITIES);
const fail=reason=>{throw Error('R190_MODEL_CONTRACT_'+reason);};
const check=(condition,reason)=>{if(!condition)fail(reason);};
const record=(v,fields)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===fields.length&&fields.every(k=>Object.hasOwn(v,k));
const text=(v,min,max)=>typeof v==='string'&&v.length>=min&&v.length<=max&&
 !/[\u0000-\u001f<>]/.test(v);
const hash=v=>createHash('sha256').update(v).digest('hex');
function capabilities(list,limit){
 check(Array.isArray(list)&&list.length<=limit,'CAPABILITY_ARRAY');
 const seen=new Set();
 for(const item of list){
  check(typeof item==='string'&&known.has(item)&&!seen.has(item),
   'UNKNOWN_OR_DUPLICATE_CAPABILITY');
  seen.add(item);
 }
 return [...seen];
}
export function readR190ModelProposal(raw,{
 requiredCapabilities=[],requestText=null,acceptanceSpec=null}={}){
 check(typeof raw==='string'&&raw.length>=100&&raw.length<=50000,'RAW_BYTES');
 const requested=capabilities(requiredCapabilities,15);
 let response;
 try{response=JSON.parse(raw);}catch{fail('INVALID_JSON');}
 check(record(response,['schema','semanticPlan','architecturalRationale',
  'assumptions','unrepresentedRequirements']),'RESPONSE_FIELDS');
 check(response.schema===R190_MODEL_PROPOSAL_SCHEMA,'RESPONSE_SCHEMA');
 check(text(response.architecturalRationale,10,1200),'RATIONALE');
 check(Array.isArray(response.assumptions)&&response.assumptions.length<=12&&
  response.assumptions.every(s=>text(s,3,250)),'ASSUMPTIONS');
 const declared=capabilities(response.unrepresentedRequirements,10);
 check(declared.every(c=>unsupported.has(c)),
  'FALSE_UNREPRESENTABLE_SUPPORTED_CAPABILITY');
 // The R190 placement tree now allows MODEL-declared additional direct
 // single-level room links, not inferred upper floors/windows/stairs.
 validateR190SemanticPlan(response.semanticPlan);
 check(response.semanticPlan.schema===R190_SCHEMA,'PLAN_SCHEMA');
 const independentlyDetectedBriefCapabilities=requestText===null?[]:
  scanR190ExplicitBriefCapabilities(requestText);
 const detected=independentlyDetectedBriefCapabilities.map(x=>x.capability);
 const missing= [...new Set([...requested,...detected])].filter(
  c=>unsupported.has(c)&&!declared.includes(c));
 const blockers=[...new Set([...declared,...missing])];
 const programAudit=auditR190ExplicitProgram(response.semanticPlan,acceptanceSpec);
 const common={
  schema:'minecraftaibuilder-r190-model-intent-audit-v1',
  responseSha256:hash(raw),
  modelProposal:structuredClone(response),
  declaredUnrepresented:declared,
  externallyRequiredCapabilities:requested,
  modelOmittedUnsupportedRequirements:missing,
  blockers,independentlyDetectedBriefCapabilities,
  originalRequestIndependentlyAudited:requestText!==null,
  userIntentCoverage:programAudit,
  blockersAreCompleteNaturalLanguageAnalysis:false,
  modelChosenPaths:[
   'semanticPlan.site','semanticPlan.entrySpaceId','semanticPlan.spaces',
   ...(response.semanticPlan.entranceFace?['semanticPlan.entranceFace']:[]),
   'semanticPlan.materials',
   ...(response.semanticPlan.formIntent?['semanticPlan.formIntent']:[]),
   ...(response.semanticPlan.roofFormIntent?['semanticPlan.roofFormIntent']:[]),
   ...(response.semanticPlan.crossConnections?['semanticPlan.crossConnections']:[]),
   ...(response.semanticPlan.glazedOpenings?['semanticPlan.glazedOpenings']:[])
  ],
  hostFilledRoomGeometry:false,hostFilledRoomTopology:false,
  modelIdentityCryptographicallyVerified:false,
  conceptsIndependentlyDesigned:1,
  actualProviderCallsByContract:0,
  minecraftPlayerWalking:'NOT_TESTED',humanArtReview:'ART_HOLD',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0
 };
 if(blockers.length) return {...common,
  status:'HOLD_UNREPRESENTABLE_REQUIREMENTS',
  sourceGenerated:false,sourceResult:null};
 // An explicit roof request must never be silently replaced by a flat roof
 // or by a different roof profile. This is limited LITERAL checking, not a
 // claim of full NL understanding; no host fills the missing shape.
 const roofPrompt=independentlyDetectedBriefCapabilities
  .find(v=>v.capability==='roof-profile-design')?.literalEvidence??'';
 const explicitRoof=/鋸歯|sawtooth/i.test(roofPrompt)?'sawtooth':
  /片流れ/i.test(roofPrompt)?'shed':
   /切妻|gabled?/i.test(roofPrompt)?'ridge':null;
 const roofRequired=requested.includes('roof-profile-design')||roofPrompt!=='';
 const selectedRoof=response.semanticPlan.roofFormIntent?.profile??null;
 if(roofRequired&&(!selectedRoof||(explicitRoof&&selectedRoof!==explicitRoof)))
  return {...common,status:'HOLD_UNSATISFIED_EXPLICIT_ROOF_PROFILE',
   expectedExplicitRoofProfile:explicitRoof,selectedRoofProfile:selectedRoof,
   sourceGenerated:false,sourceResult:null};
 if(requested.includes('non-tree-adjacency')&&
  !(response.semanticPlan.crossConnections?.length>0))
  return {...common,status:'HOLD_UNSATISFIED_EXPLICIT_NON_TREE_LINK',
   sourceGenerated:false,sourceResult:null};
 if(programAudit.issues.length)return {...common,
  status:'HOLD_UNSATISFIED_EXPLICIT_PROGRAM',
  sourceGenerated:false,sourceResult:null};
 // One solver placement is NOT an independent second architecture.
 const source=compileR190SemanticPlan(response.semanticPlan);
 check(source.worldWrites===0&&source.worldContacts===0&&
  source.gates.every(x=>x==='BLOCKED')&&
  source.BuildPlan.operations.length===0,'SOURCE_SAFETY');
 return {...common,
  userIntentCoverage:verifyR190ProgramInCompiledSource(programAudit,source),
  status:'SOURCE_VERIFIED_ART_HOLD',
  sourceGenerated:true,sourceResult:{
   layoutStrategy:source.layout.strategy,
   trueB143Voxels:source.compiled.primitives.length,
   sourceSha256:source.compiled.sourceSha256,
   geometrySha256:source.compiled.geometrySha256,
   realSourceRouteAudit:source.audit,
   B143Design:source.design
  }};
}
