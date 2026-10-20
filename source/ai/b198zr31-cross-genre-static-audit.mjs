/**
 * R31: offline, deterministic prompt contract audit across different genres.
 * Scenario fixtures are hypothetical briefs, NOT generated Qwen buildings.
 * This audit detects some wording risks; it does not establish actual model
 * compliance, geometric feasibility, token fit or architectural quality.
 */
import {createHash} from 'node:crypto';
import {R30_ADDITIONAL_GUIDE,R30_GUIDE_SHA256,
 R30_GENERALIZED_GUIDE,R30_GUIDANCE_CLAUSES,
 R30_FAILURE_TO_CLAUSE,inspectR30Guide}
 from './b198zr30-generalized-space-guide.mjs';
export const SCHEMA='minecraftaibuilder-b198zr31-cross-genre-static-audit-v1';
export const R31_GENRES=Object.freeze([
 {id:'vertical-library',brief:'多層の図書館と階段・吹抜け',
  routePattern:'branched-stairs',architecturalFreedom:'tall-and-asymmetric'},
 {id:'underground-museum',brief:'地下博物館と中庭、複数の展示室',
  routePattern:'loop',architecturalFreedom:'sunken-and-courtyard'},
 {id:'skybridge-market',brief:'高架回廊に並ぶ商業施設',
  routePattern:'branching-bridge',architecturalFreedom:'elevated-and-linear'},
 {id:'ring-observatory',brief:'環状の天文台と複数の観測室',
  routePattern:'ring',architecturalFreedom:'curved-and-circular'},
 {id:'floating-research-base',brief:'浮遊する研究施設、内部通路と接続塔',
  routePattern:'connected-spine',architecturalFreedom:'floating-and-separated'},
 {id:'sculptural-gallery',brief:'曲面彫刻のような美術館',
  routePattern:'multiple-routes',architecturalFreedom:'freeform-and-irregular'}
]);
const sha=s=>createHash('sha256').update(s).digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
const includesAll=(s,phrases)=>phrases.every(p=>s.includes(p));
const CHECKS=Object.freeze([
 {id:'NO_FIXED_PLAN',phrases:['Do not copy a fixed floorplan','No template replacement']},
 {id:'ACTUAL_VOID',phrases:['ADD primitive as solid','later CUT','FINAL ordered operations']},
 {id:'USABLE_ZONE',phrases:['standable air cells','beside furniture']},
 {id:'ENTRANCE_SUPPORT',phrases:['floor directly below (y-1)','entrance must have y>=1']},
 {id:'OPENING_MATCH',phrases:['Every doorway/opening must intersect','whichever coordinates your own design needs']},
 {id:'MULTIPLE_ROUTES',phrases:['ONE or MANY routes','loops, bridges or branches']},
 {id:'DESTINATIONS',phrases:['Every declared destination','reachable from the entrance']},
 {id:'HONEST_THRESHOLD',phrases:['minimumReachablePositions','minimumReachablePercent']},
 {id:'STRICT_DSL',phrases:['each ADD material','each CUT omits the material property entirely']},
 {id:'EXTERNAL_QA',phrases:['deterministic B143 voxel compiler','independent R3 route/functional contract']}
]);
const BANNED=Object.freeze([
 {id:'SINGLE_ROUTE_REQUIRED',regex:/\b(?:must|shall|required|only)\b[^.!?\n]{0,90}\b(?:exactly one|single|only one)\b[^.!?\n]{0,45}\b(?:route|corridor|path)\b/i},
 {id:'LOOPS_PROHIBITED',regex:/\b(?:no|never|forbid|prohibit)\b[^.!?\n]{0,35}\b(?:loop|branch|multiple route)s?\b/i},
 {id:'HISTORICAL_COORDINATES',regex:/\b(?:z\s*=\s*4[45]|23\s*,\s*0\s*,\s*44)\b/i},
 {id:'FIXED_TEMPLATE_REQUIRED',regex:/\b(?:must|always|required)\b[^.!?\n]{0,50}\b(?:copy|use|follow)\b[^.!?\n]{0,45}\b(?:fixed template|fixed floorplan|same layout)\b/i},
 {id:'CUT_REQUIRES_MATERIAL',regex:/\bCUT\b[^.!?\n]{0,50}\b(?:must|requires|shall)\b[^.!?\n]{0,25}\b(?:specify|include|have)\b[^.!?\n]{0,25}\bmaterial\b/i},
 {id:'MODEL_SELF_CERTIFICATION',regex:/\b(?:model|assistant)\b[^.!?\n]{0,60}\b(?:certifies|guarantees|proves)\b[^.!?\n]{0,60}\b(?:quality|walkability|construction)\b/i}
]);
export function auditR31CrossGenre({additionalGuide=R30_ADDITIONAL_GUIDE}={}){
 if(typeof additionalGuide!=='string'||additionalGuide.length>20000)
  throw Error('B198ZR31_GUIDE_INPUT');
 const coverage=CHECKS.map(x=>({id:x.id,covered:includesAll(additionalGuide,x.phrases),
  missing:x.phrases.filter(p=>!additionalGuide.includes(p))}));
 const contradictions=BANNED.filter(x=>x.regex.test(additionalGuide)).map(x=>x.id);
 // This matrix checks whether a general instruction applies to each fixture,
 // not whether a model can or did construct any of these designs.
 const genres=R31_GENRES.map(g=>({
  ...g,checks:coverage.map(x=>({id:x.id,covered:x.covered})),
  hardcodedLayoutRequired:false, // no R30 fixed geometry is prescribed
  modelWasAskedToGenerate:false,
  generatedGeometryExamined:false,
  structuralFeasibilityIndependentlyVerified:false
 }));
 const allCovered=coverage.every(x=>x.covered);
 const r30=inspectR30Guide();
 const frozen=additionalGuide===R30_ADDITIONAL_GUIDE&&
  sha(R30_GENERALIZED_GUIDE)===R30_GUIDE_SHA256;
 const status=allCovered&&contradictions.length===0&&
  r30.status==='STATIC_PROMPT_AUDIT_PASS_NOT_QUALITY_PROOF'?
   'STATIC_SCENARIO_COVERAGE_PASS_NOT_MODEL_PROOF':
   'HOLD_STATIC_GUIDE_CONTRACT';
 return {schema:SCHEMA,status,
  inputAdditionalGuideSha256:sha(additionalGuide),
  frozenR30Sha256:R30_GUIDE_SHA256,
  frozenR30Unmodified:frozen,
  r30ClauseCount:R30_GUIDANCE_CLAUSES.length,
  r27FailureMappingCount:R30_FAILURE_TO_CLAUSE.length,
  staticChecksTotal:coverage.length,
  staticChecksCovered:coverage.filter(x=>x.covered).length,
  staticChecks:coverage,
  contradictoryInstructionFlags:contradictions,
  scenarioCount:genres.length,scenarios:genres,
  limitations:[
   'Scenarios are hypothetical briefs, not Qwen responses or compiled buildings.',
   'Keyword and regex checks cannot establish semantic absence of all contradictions.',
   'Prompt applicability does not prove Qwen follows the guide or can fit its context window.',
   'Independent B143 and R3 geometry checks remain mandatory after any future separately approved inference.'
  ],
  modelQualityImprovementProven:false,
  modelCalls:0,worldContacts:0,worldWrites:0,
  activation:'NOT_ENABLED',r25OriginalStatus:'HOLD',safety:safety()};
}
