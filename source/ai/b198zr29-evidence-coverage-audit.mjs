/** R29: deterministic audit of frozen R27 findings against R28 future advisory.
 * No model invocation, world access, prompt mutation, or source repair.
 */
import {createHash} from 'node:crypto';
import {R28_ADDITIONAL_GUIDE,R28_SPACE_FIRST_GUIDE_SHA256,
 inspectR28Advisory} from './b198zr28-space-first-future-guide.mjs';
export const SCHEMA='minecraftaibuilder-b198zr29-evidence-coverage-audit-v1';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}});
export const R27_OBSERVED_FACTS=Object.freeze([
 {id:'R27_CUT_MATERIAL_5',metric:5,unit:'invalid CUT materials',
  checks:['each CUT MUST omit the material field entirely'],severity:'CRITICAL'},
 {id:'R27_SOLID_BASE_SHELL',metric:58080,unit:'filled conceptual BOX cells',
  checks:['A solid ADD box is entirely filled','base-shell'],severity:'CRITICAL'},
 {id:'R27_READING_WEST_FULL',metric:1200,unit:'occupied of 1200',
  checks:['functionalZones as AIR-AND-FLOOR','never fill 100%'],severity:'CRITICAL'},
 {id:'R27_READING_EAST_FULL',metric:1200,unit:'occupied of 1200',
  checks:['functionalZones as AIR-AND-FLOOR','never fill 100%'],severity:'CRITICAL'},
 {id:'R27_STAR_LOUNGE_FULL',metric:144,unit:'occupied of 144',
  checks:['functionalZones as AIR-AND-FLOOR','never fill 100%'],severity:'CRITICAL'},
 {id:'R27_ENTRANCE_INVALID',metric:[23,0,44],unit:'declared entrance',
  checks:['y>=1','floor at y-1','headroom cells clear'],severity:'CRITICAL'},
 {id:'R27_DOOR_Z_MISMATCH',metric:[44,45],unit:'entrance and door z',
  checks:['door CUT must actually intersect the entrance route'],severity:'HIGH'},
 {id:'R27_DISCONNECTED_GRAPH',metric:6,unit:'standable components',
  checks:['route from the declared entrance to each declared destination'],severity:'CRITICAL'},
 {id:'R27_STANDABLE_POSITIONS',metric:256,unit:'standable conceptual positions',
  checks:['supported, empty, connected standing cells'],severity:'HIGH'},
 {id:'R27_LARGEST_COMPONENT',metric:100,unit:'positions in largest component',
  checks:['each declared destination'],severity:'HIGH'}
]);
export const R29_GUARDRAIL_REVIEWS=Object.freeze([
 {id:'OVERFIT_LITERAL_DOOR_COORDINATES',phrase:'z=45',judgment:'IMPROVE',
  reason:'An example may anchor a future model to the historical exact location. Prefer a general coordinate-consistency rule.'},
 {id:'OVERCONSTRAIN_SINGLE_ROUTE',phrase:'Design ONE continuous abstract route',
  judgment:'IMPROVE',reason:'A connected network may have many paths; require reachability, not exactly one route.'},
 {id:'MISSING_PRECISE_FINAL_VOXEL_MENTAL_CHECK',phrase:'privately count',
  judgment:'ADVISORY',reason:'Mental counts are unreliable for dense overlapped solids; only authoritative voxel compiler can certify.'},
 {id:'ORIGINALITY_PRESERVED',phrase:'do not copy any fixed template',
  judgment:'RETAIN',reason:'Model must remain architect; no hardcoded building geometry.'},
 {id:'CONSERVATIVE_QA',phrase:'never claim independent validation',
  judgment:'RETAIN',reason:'Text assertions cannot replace B143 and R3 verification.'}
]);
export function auditR29SpaceFirstGuide({additionalGuide=R28_ADDITIONAL_GUIDE}={}){
 if(typeof additionalGuide!=='string'||additionalGuide.length>20000)
  throw Error('B198ZR29_GUIDE_SIZE');
 const facts=R27_OBSERVED_FACTS.map(f=>{
  const absent=f.checks.filter(needle=>!additionalGuide.includes(needle));
  return {id:f.id,metric:f.metric,unit:f.unit,severity:f.severity,
   checks:f.checks,coveredByExactGuidePhrases:absent.length===0,
   missingGuidePhrases:absent,actualGeometryValidated:false};
 });
 const guardrails=R29_GUARDRAIL_REVIEWS.map(x=>({...x,
  present:additionalGuide.includes(x.phrase)}));
 const advisory=inspectR28Advisory();
 return {schema:SCHEMA,source:'USER_REPORTED_R27_MEASUREMENTS_NOT_RELOADED',
  inputGuideSha256:SHA(additionalGuide),
  pinnedCandidateGuideSha256:R28_SPACE_FIRST_GUIDE_SHA256,
  candidateUnmodified:additionalGuide===R28_ADDITIONAL_GUIDE,
  historicalR21GuideSha256:advisory.parentGuideSha256,
  status:facts.every(x=>x.coveredByExactGuidePhrases)?
   'COVERAGE_STATIC_PASS_REVIEW_NOT_ACTIVATED':'HOLD_GUIDE_COVERAGE',
  coveredFactCount:facts.filter(x=>x.coveredByExactGuidePhrases).length,
  totalFactCount:facts.length,facts,guardrails,
  recommendations:[
   'Generalize the door coordinate example; do not teach historical coordinates as a design requirement.',
   'Permit any connected network that reaches every declared destination; not exactly one corridor.',
   'Keep final voxel compile and R3 reachability independently authoritative. Prompt self-checks are advisory.',
   'Never weaken the strict ADD/CUT grammar or hardcode building styles to improve static coverage.'
  ],
  modelQualityImprovementProven:false,
  historicalR25SourceStillHold:true,
  profileActivation:'NOT_ENABLED',modelCalls:0,
  worldContacts:0,worldWrites:0,safety:safety()};
}
