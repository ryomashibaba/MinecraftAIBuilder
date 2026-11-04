/**
 * V4J explicit five-genre local SOURCE-only run. No paid API or world access.
 * Distinct USER briefs, one generic compiler; sequential, at most one POST per genre.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseV4DLocalAuthorArgs,runV4DLocalAuthor}
 from './r125-v4d-local-architect.mjs';
import {buildV4DShareableReceipt}
 from './r125-v4d-shareable-receipt.mjs';
import {compileDesign} from '../source/ai/b143-building-dsl.mjs';
import {compareV4IPrivateRealB143Silhouettes}
 from './r125-v4i-architectural-art-audit.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=x=>{throw Error('R125_V4J_FIVE_GENRE_'+x);};
const within=(p,base)=>p===base||p.startsWith(base+path.sep);
export const FIVE_INDEPENDENT_BRIEFS=Object.freeze([
 {genre:'housing',prompt:'日本語の独自依頼：複数世帯が利用する小規模な共同住宅。暮らす領域と地域交流の領域を機能的に区別し、入口、独自の二層公共空間、実用的な屋外前庭を一貫した建築として設計する。'},
 {genre:'shop',prompt:'日本語の独自依頼：製作実演を行う手工芸の販売店舗。来客の見学・購入と制作の活動関係を考え、入口、上階の使用空間、屋外の公的サービス場所を含め、独自の全体建築を設計する。'},
 {genre:'research',prompt:'日本語の独自依頼：一般公開する小型の環境観測研究施設。研究と見学の用途が矛盾しない屋内外空間と上階機能を考え、入口から利用できる前庭を含めて一棟の独創的な建築を設計する。'},
 {genre:'gallery',prompt:'日本語の独自依頼：体験展示と多目的ワークショップを行う地域展示館。展示・交流・作業の異なる機能を関連づけ、公開二層空間と実際に使う屋外サービスのある独創的な建築を設計する。'},
 {genre:'station',prompt:'日本語の独自依頼：地域の小規模な駅舎。案内・待合・地域活動を安全な公共動線で結び、二層の実用空間と天候に配慮した駅前サービス前庭を含む独創的な建築を設計する。'}
]);
export function parseFiveGenreArgs(args){
 if(args.includes('--prompt'))fail('BRIEFS_ARE_FIVE_INDEPENDENT_FIXED_TASKS');
 return parseV4DLocalAuthorArgs([...args,'--authored-civic-arcade']);
}

/**
 * Extract ONLY geometry visibility counts from the already-private,
 * one-response civic ART HOLD report. This is not a second model request or
 * independent human aesthetic grading. Use after source SHA verification.
 */
export function summarizeVerifiedPrivateCivicVisibility(art,receipt){
 const failArt=()=>fail('PRIVATE_CIVIC_VISIBLE_EVIDENCE_NOT_VERIFIED');
 if(!art||typeof art!=='object'||Array.isArray(art)||
  art.schema!=='r125-v4j-private-one-response-civic-arcade-art-hold-v1'||
  art.provenance!=='LOCAL_OLLAMA_CLAIM_NOT_INDEPENDENTLY_AUTHENTICATED'||
  !receipt?.sourceCandidateVerified||
  receipt.explicitlyInjectedTestResponse!==false||
  typeof receipt.originalRawSha256!=='string'||
  art.originalResponseSha256!==receipt.originalRawSha256||
  art.finalGeometrySha256!==receipt.finalGeometrySha256||
  art.realModelIdentityVerified!==false||
  art.humanArchitecturalArt!=='NOT_REVIEWED'||
  art.architecturalQualityConclusion!=='UNASSESSED_ART_HOLD'||
  art.worldContacts!==0||art.worldWrites!==0||
  art.readiness!=='NOT_PREPARED'||
  art.constructionApproved!==false||art.executionAllowed!==false||
  !Array.isArray(art.gates)||art.gates.length!==9||
  art.gates.some(x=>x!=='BLOCKED')||
  !Array.isArray(art.BuildPlan?.operations)||art.BuildPlan.operations.length!==0||
  art.projectedVisibilityAudit?.schema!=='r125-v4e-actual-b143-projection-depth-audit-v1'||
  art.projectedVisibilityAudit?.provenance!=='TRUE_B143_COMPILED_VOXEL_ARRAYS'||
  art.projectedVisibilityAudit?.certifiedImprovement!==false)
  failArt();
 const required=['roof','north','south','west','east'];
 const views=art.projectedVisibilityAudit.views;
 if(!Array.isArray(views)||views.length!==5||
  views.some((v,i)=>v?.face!==required[i]||
   !['baselineCells','finalCells','unionCells','changedCells',
    'silhouetteChangedCells','depthChangedCells','materialChangedCells']
    .every(k=>Number.isSafeInteger(v[k])&&v[k]>=0)||
   !Number.isFinite(v.changeFraction)||v.changeFraction<0||
   v.changeFraction>1||
   v.changedCells>v.unionCells||
   v.changedCells!==v.silhouetteChangedCells+v.depthChangedCells+
    v.materialChangedCells))
   failArt();
 return {
  status:'PRIVATE_SHA_BOUND_GEOMETRY_DELTA_NOT_ART_PASS',
  fiveViews:views.map(v=>({
   face:v.face,changedCells:v.changedCells,
   silhouetteChangedCells:v.silhouetteChangedCells,
   depthChangedCells:v.depthChangedCells,
   materialChangedCells:v.materialChangedCells,
   changeFraction:v.changeFraction
  })),
  roofOutline:views[0].silhouetteChangedCells===0?
   'UNCHANGED_IN_ROOF_PROJECTION':'CHANGED_IN_ROOF_PROJECTION',
  architecturalBeauty:'NOT_REVIEWED',
  modelIdentityAuthenticated:false
 };
}

export async function runFiveGenreLocal(opts,{runOne=runV4DLocalAuthor,
 fetcher=fetch,timeoutMs=180000}={}){
 if(!opts||!opts.authorArcade||typeof opts.outDir!=='string'||
  typeof runOne!=='function')fail('OPTIONS');
 const root=path.resolve(opts.outDir),parent=path.dirname(root);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
  fs.existsSync(root))fail('FRESH_OUTSIDE_REPOSITORY_FOLDER_REQUIRED');
 if(within(root,ROOT)||within(fs.realpathSync(parent),fs.realpathSync(ROOT)))
  fail('PRIVATE_FOLDER_MUST_BE_OUTSIDE_REPOSITORY');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000)
  fail('TIMEOUT_CONTRACT');
 fs.mkdirSync(root);
 const injected=runOne!==runV4DLocalAuthor||fetcher!==fetch||
  process.env.MAB_V4D_TEST_DOUBLE_MODE==='1';
 const outcomes=[];let knownCalls=0,stoppedReason=null;
 const independentSourceCases=[];
 let privateSourceIntegrityHOLD=false;
 const verifiedExteriorDeltaByGenre=new Map();
 for(const item of FIVE_INDEPENDENT_BRIEFS){
  let receipt;
  try{
   const report=await runOne({model:opts.model,endpoint:opts.endpoint,
    authorArcade:true,prompt:item.prompt,
    outDir:path.join(root,item.genre)},{fetcher,timeoutMs});
   receipt=buildV4DShareableReceipt(report);
   if(injected&&!receipt.explicitlyInjectedTestResponse)
    fail('INJECTED_RUN_NOT_MARKED_AS_TEST_DOUBLE');
  }catch{
   outcomes.push({genre:item.genre,status:'HOLD_UNEXPECTED_LOCAL_RUNNER_ERROR',
    attempts:'UNKNOWN',sourceCandidateVerified:false,
    failureCategory:'LOCAL_RUNNER_ERROR_PRIVATE_DIAGNOSTIC_ONLY'});
   stoppedReason='UNEXPECTED_LOCAL_RUNNER_ERROR';
   break;
  }
  knownCalls+=receipt.modelCallAttempts;
  if(!injected&&receipt.sourceCandidateVerified){
   // Recompile the exact PRIVATE final B143, never the original model text.
   // Both independent source and geometry hashes must match the local receipt.
   try{
    const file=path.join(root,item.genre,'TRUE_B143_SOURCE.json');
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||
     stat.size===0||stat.size>1000000)throw Error('UNSAFE_PRIVATE_SOURCE');
    const design=JSON.parse(fs.readFileSync(file,'utf8'));
    const compiled=compileDesign(design);
    if(compiled.sourceSha256!==receipt.compiledB143SourceSha256||
     compiled.geometrySha256!==receipt.finalGeometrySha256)
     throw Error('PRIVATE_B143_SHA_DRIFT');
    const artFile=path.join(root,item.genre,
     'PRIVATE_B143_CIVIC_ARCADE_ART_HOLD_COMPARISON.json');
    const artStat=fs.lstatSync(artFile);
    if(!artStat.isFile()||artStat.isSymbolicLink()||
     artStat.size===0||artStat.size>2000000)
     throw Error('UNSAFE_PRIVATE_VISIBILITY_REPORT');
    const art=JSON.parse(fs.readFileSync(artFile,'utf8'));
    const safeVisible=summarizeVerifiedPrivateCivicVisibility(art,receipt);
    verifiedExteriorDeltaByGenre.set(item.genre,safeVisible);
    independentSourceCases.push({genre:item.genre,primitives:compiled.primitives});
   }catch{privateSourceIntegrityHOLD=true;}
  }
  outcomes.push({genre:item.genre,status:receipt.reportedStatus,
   attempts:receipt.modelCallAttempts,
   injectedTestResponse:receipt.explicitlyInjectedTestResponse,
   sourceCandidateVerified:receipt.sourceCandidateVerified,
   sourceCirculation:receipt.sourceCirculation,
   finalGeometrySha256:receipt.finalGeometrySha256,
   failureCategory:receipt.failureCategory,
   verifiedExteriorDelta:verifiedExteriorDeltaByGenre.get(item.genre)??null});
  // HTTP/transport failures can use the generic SOURCE HOLD status.
  // Do not continue sending requests to the other four genres on an outage.
  // Preserve the more specific fail-closed terminal state first.
  // The receipt classifies MODEL_NOT_INSTALLED under transport failures too.
  if(['HOLD_MODEL_NOT_INSTALLED','HOLD_LOCAL_PREFLIGHT',
   'HOLD_MODEL_TIMEOUT_OR_ABORTED'].includes(receipt.reportedStatus)){
   stoppedReason=receipt.reportedStatus;break;
  }
  if(receipt.failureCategory==='LOCAL_MODEL_TRANSPORT_OR_TIMEOUT'){
   stoppedReason='LOCAL_TRANSPORT_FAILURE';break;
  }
 }
 let visualGeometryComparison={
  status:injected?'NOT_RUN_ON_TEST_DOUBLE':
   privateSourceIntegrityHOLD?'HOLD_PRIVATE_B143_INTEGRITY':
   independentSourceCases.length<2?'INSUFFICIENT_VERIFIED_REAL_B143_CASES':
   'PENDING_LOCAL_SOURCE_ANALYSIS',
  caseCount:independentSourceCases.length,pairCount:0,
  humanArchitecturalArt:'NOT_REVIEWED',
  visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT'
 };
 if(!injected&&!privateSourceIntegrityHOLD&&independentSourceCases.length>=2){
  try{
   visualGeometryComparison=compareV4IPrivateRealB143Silhouettes(
    independentSourceCases);
  }catch{
   visualGeometryComparison={
    status:'HOLD_PRIVATE_SOURCE_GEOMETRY_AUDIT',
    caseCount:0,pairCount:0,
    humanArchitecturalArt:'NOT_REVIEWED',
    visualMetricPassThresholds:'UNDEFINED_DO_NOT_INVENT'
   };
  }
 }
 const symptomBuckets=new Map();
 for(const o of outcomes){
  if(o.sourceCandidateVerified||o.failureCategory==='NOT_APPLICABLE')continue;
  // Repeated symptoms are NOT proof of one underlying root cause.
  if(!symptomBuckets.has(o.failureCategory))symptomBuckets.set(o.failureCategory,[]);
  symptomBuckets.get(o.failureCategory).push(o.genre);
 }
 const crossGenreSharedSymptoms=[...symptomBuckets.entries()]
  .filter(([,genres])=>genres.length>=2)
  .map(([failureCategory,genres])=>({
   failureCategory,genres,sharedRootCauseProven:false
  }));
 const noRoofOutlineChangeGenres=outcomes
  .filter(o=>o.verifiedExteriorDelta?.roofOutline==='UNCHANGED_IN_ROOF_PROJECTION')
  .map(o=>o.genre);
 const result={
  schema:'minecraftaibuilder-r125-v4j-five-genre-private-safe-batch-v1',
  provenance:injected?'INJECTED_TEST_DOUBLE_NOT_REAL_MODEL':
   'LOCAL_OLLAMA_CLAIM_UNATTESTED',
  promptContentsIncluded:false,rawResponsesIncluded:false,
  localPathsIncluded:false,fullErrorsIncluded:false,
  mode:'FIVE_DISTINCT_PROMPTS_ONE_COMMON_AUTHOR_ENGINE',
  sequentialOnly:true,oneAttemptPerGenre:true,maxModelAttempts:5,
  attemptedGenres:outcomes.length,knownModelCallAttempts:knownCalls,
  modelCallCountComplete:stoppedReason!=='UNEXPECTED_LOCAL_RUNNER_ERROR',
  sourceCandidates:outcomes.filter(r=>r.sourceCandidateVerified).length,
  stoppedReason,
  remainingUnattemptedGenres:FIVE_INDEPENDENT_BRIEFS.slice(outcomes.length).map(x=>x.genre),
  outcomes,visualGeometryComparison,
  crossGenreSharedSymptoms,
  noRoofOutlineChangeGenres,
  humanArchitecturalArt:'NOT_REVIEWED',minecraftRealWalking:'NOT_TESTED',
  modelIdentityCryptographicallyVerified:false,
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
  BuildPlan:{operations:[]},gates:Array(9).fill('BLOCKED'),
  worldContacts:0,worldWrites:0
 };
 fs.writeFileSync(path.join(root,'FIVE_GENRES_SHAREABLE_SUMMARY.json'),
  JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const r=await runFiveGenreLocal(parseFiveGenreArgs(process.argv.slice(2)));
  console.log(JSON.stringify({sourceCandidates:r.sourceCandidates,
   attemptedGenres:r.attemptedGenres,knownModelCalls:r.knownModelCallAttempts,
   stopped:r.stoppedReason??'ALL_FIVE_ATTEMPTED_ART_HOLD',
   onlyShare:'FIVE_GENRES_SHAREABLE_SUMMARY.json',worldWrites:0}));
  if(r.sourceCandidates!==5||r.attemptedGenres!==5||
   r.provenance!=='LOCAL_OLLAMA_CLAIM_UNATTESTED')process.exitCode=2;
 }catch(e){console.error('V4J_FIVE_GENRE_HOLD',String(e?.message??e));process.exitCode=2;}
}
