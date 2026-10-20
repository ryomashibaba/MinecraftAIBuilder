/**
 * R33: offline-only FUTURE model trial readiness report.
 * This file cannot start a model, create an authorization, access Minecraft,
 * or change the consumed R25 one-shot permission. No network dependencies.
 */
import {createHash} from 'node:crypto';
import {R30_GENERALIZED_GUIDE,R30_GUIDE_SHA256,inspectR30Guide}
 from '../source/ai/b198zr30-generalized-space-guide.mjs';
import {auditR31CrossGenre}
 from '../source/ai/b198zr31-cross-genre-static-audit.mjs';
import {auditR32SyntheticGeometry}
 from './b198zr32-synthetic-geometry-fixtures.mjs';

export const SCHEMA='minecraftaibuilder-b198zr33-future-trial-readiness-v1';
export const R25_ORIGINAL_SHA256=
 '444b14eaedf1136a1cee5eeab94c7b76db51fcd2d3519820ba807727e55817d6';
export const R33_TRIAL_CONDITIONS=Object.freeze([
 {id:'NEW_AUTHORIZATION',requirement:'A new explicit user approval is required for exactly one future local Qwen invocation; R25 permission is consumed.',state:'NOT_GRANTED'},
 {id:'ONE_SHOT_BUDGET',requirement:'One invocation maximum; zero automatic retries, fallback calls, repair calls, or hidden warm-up inference.',state:'REQUIRED_IF_LATER_APPROVED'},
 {id:'SOURCE_PIN',requirement:'Pin reviewed GitHub commit and full prompt SHA before any separately approved run.',state:'REQUIRED_IF_LATER_APPROVED'},
 {id:'RAW_CAPTURE',requirement:'Save the original unmodified UTF-8 model response and SHA256 before parsing, normalization, or diagnostics.',state:'REQUIRED_IF_LATER_APPROVED'},
 {id:'PARSER_GATE',requirement:'Strictly parse four-key R4 JSON and B143 ADD/CUT grammar. Any invalid syntax means HOLD; do not silently fix it.',state:'REQUIRED_IF_LATER_APPROVED'},
 {id:'FUNCTIONAL_GATE',requirement:'Evaluate final ordered B143 voxels and independently authored R3 spatial contract; do not trust model-declared thresholds alone.',state:'REQUIRED_IF_LATER_APPROVED'},
 {id:'QUALITY_REVIEW',requirement:'Evaluate architectural originality, usability and requested brief separately from B143/R3 formal constraints.',state:'REQUIRED_IF_LATER_APPROVED'},
 {id:'WORLD_ISOLATION',requirement:'No Minecraft connection, world read, build command, or build permission is included in any model trial.',state:'ALWAYS_BLOCKED'},
 {id:'NO_AUTO_ACTIVATION',requirement:'Offline readiness results must never enable a model runner, change safety gates, or constitute approval.',state:'ALWAYS_BLOCKED'}
]);
const sha=s=>createHash('sha256').update(s).digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});

/** ciAttestation is explicitly untrusted metadata, not a permission or proof.
 * This report makes no network requests to validate its claims.
 */
export function assessR33FutureTrial({ciAttestation=null,
 frozenGuideSha256=R30_GUIDE_SHA256,
 originalR25Sha256=R25_ORIGINAL_SHA256}={}){
 const r30=inspectR30Guide(),r31=auditR31CrossGenre();
 const r32=auditR32SyntheticGeometry();
 const cases=r32.scenarios.map(s=>({
  id:s.id,voxels:s.finalConceptVoxels,sourceSha256:s.sourceSha256,
  b143R3FormalPass:s.r3Status==='FORMAL_GEOMETRY_AND_ROUTE_CONSTRAINTS_PASS',
  r4FormalPass:s.r4Status==='SOURCE_AND_DECLARED_SPATIAL_CLAIMS_FORMALLY_PASS',
  fixtureOnly:s.independentContractAuthorship==='TEST_FIXTURE'
 }));
 const checks=[
  {id:'R30_HASH',passed:sha(R30_GENERALIZED_GUIDE)===R30_GUIDE_SHA256&&
    frozenGuideSha256===R30_GUIDE_SHA256},
  {id:'R30_STATIC',passed:r30.status==='STATIC_PROMPT_AUDIT_PASS_NOT_QUALITY_PROOF'},
  {id:'R31_STATIC',passed:r31.status==='STATIC_SCENARIO_COVERAGE_PASS_NOT_MODEL_PROOF'},
  {id:'R32_THREE_FORMAL_FIXTURES',passed:cases.length===3&&
    cases.every(c=>c.b143R3FormalPass&&c.r4FormalPass&&c.fixtureOnly)},
  {id:'R25_ORIGINAL_PIN',passed:originalR25Sha256===R25_ORIGINAL_SHA256}
 ];
 const staticPreflightPassed=checks.every(x=>x.passed);
 const claimedCI=ciAttestation===null?null:{
  evidenceType:'USER_SUPPLIED_UNVERIFIED',
  details:structuredClone(ciAttestation)
 };
 return {schema:SCHEMA,
  status:staticPreflightPassed?
   'OFFLINE_STATIC_PREFLIGHT_PASS_NO_EXECUTION_AUTHORIZATION':
   'HOLD_OFFLINE_PREFLIGHT',
  staticPreflightPassed,checks,
  frozenR30GuideSha256:R30_GUIDE_SHA256,
  r25OriginalSha256:R25_ORIGINAL_SHA256,
  r25OriginalReRead:false,
  r25OriginalStatus:'HOLD',
  r32GeometryCases:cases,
  ciAttestation:claimedCI,
  ciVerifiedByThisTool:false,
  trialConditions:R33_TRIAL_CONDITIONS,
  futureTrialEvaluationAxes:[
   'Strict four-key R4 response syntax and B143 material validity',
   'Final conceptual voxel occupancy and entrance support/headroom',
   'Independent R3 reachability of each meaningful functional zone and destination',
   'Design originality and user brief satisfaction: requires separate human assessment',
   'Provenance and raw response immutability with SHA256'
  ],
  futureTrialNotExecuted:true,
  consumedR25AuthorizationRestored:false,
  userAuthorizationGrantedByThisTool:false,
  executionDecision:'BLOCKED_NO_NEW_EXPLICIT_USER_AUTHORIZATION',
  noRetryPolicy:true,
  modelCalls:0,worldContacts:0,worldWrites:0,
  constructionApproved:false,
  safety:safety()};
}
