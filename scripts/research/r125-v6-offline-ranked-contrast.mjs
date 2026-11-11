/**
 * One-time, local-only research on an ALREADY SAVED V6 original response.
 * Uses one immutable author answer for ranked AND full Civic Arcade V6 checks.
 * Full-V6 SOURCE research PASS is not ART, model identity, Minecraft or Gate C.
 * No model transport, network, world IO or filesystem writes.
 *
 * node scripts/research/r125-v6-offline-ranked-contrast.mjs --study PRIVATE_DIR
 * Keep PRIVATE_DIR outside the repository. Share only the printed JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CIVIC_ARCADE_SCHEMA,compileCivicArcadeAuthorIntent}
 from '../../source/ai/r125-v4j-civic-author-ir.mjs';
import {materializeV4JParentIndexAuthor,V4J_PARENT_INDEX_PROTOCOL}
 from '../../source/ai/r125-v4j-feasible-envelope.mjs';
import {RANKED_SCHEMA,compileRankedExteriorIntent,
 runWithRankedExteriorCenterStripResearch}
 from '../../source/ai/r125-v4e-ranked-exterior-ir.mjs';
import {classifyPrivateCompilerRejection}
 from '../r125-v4d-compiler-reject-codes.mjs';

const TARGET_PROMPT_SHA='d97831b3b0fcdd3af8675799a64e3e9e3842d5dd7bb124f692032fe880255111';
const BASE_ERROR=/^R125_V4E_RANKED_NO_AUTHORED_EXTERIOR_OPTION_[0-4]$/;
const sha=text=>createHash('sha256').update(text).digest('hex');
const safeReject=e=>classifyPrivateCompilerRejection(String(e?.message??e));
const safeBase=()=>({
 additionalModelCalls:0,networkCalls:0,worldContacts:0,worldWrites:0,
 originalPromptOrResponseIncluded:false,authorRoomIdsIncluded:false,
 fullV6CompilerExecuted:false,artReview:'NOT_REVIEWED',
 constructionApproved:false,modelIdentityAttested:false,
 gateCP1:'HOLD'
});
const hold=code=>{throw Error(code)};
const validFile=(p,max)=>{
 const s=fs.lstatSync(p);
 return s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=max;
};
const parseFile=(folder,name,max)=>{
 const p=path.join(folder,name);
 if(!validFile(p,max))hold('PRIVATE_FILE_NOT_REGULAR_OR_SIZE_LIMIT');
 return fs.readFileSync(p,'utf8');
};
const isWithin=(child,parent)=>{
 const relative=path.relative(parent,child);
 return relative===''||relative==='.'||
  (!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));
};

/**
 * Synthetic and PRIVATE input share this path. Nothing in the original
 * author response may be repaired. Both complete V6 outcomes are SOURCE-only;
 * neither author provenance, human ART, nor Minecraft is certified.
 */
function auditFullV6Source(callback){
 // Keep PRIVATE room IDs, exception messages and geometry SHAs internal.
 // Only finite categories and checks are included in the public result.
 try{
  const out=callback(),routes=out?.b143?.sourceRoutes;
  const worldSafe=out?.worldContacts===0&&out?.worldWrites===0&&
   out?.readiness==='NOT_PREPARED'&&
   out?.constructionApproved===false&&out?.executionAllowed===false&&
   out?.gates?.length===9&&out.gates.every(g=>g==='BLOCKED')&&
   Array.isArray(out?.BuildPlan?.operations)&&out.BuildPlan.operations.length===0;
  const sourceReachable=routes?.status==='SOURCE_ROUTES_REACH_ALL_ZONES'&&
   Array.isArray(routes.zones)&&routes.zones.every(z=>z.reachedFromEntrance)&&
   Array.isArray(routes.featureAccess)&&routes.featureAccess.every(f=>f.reachableFromEntrance);
  if(!worldSafe||!sourceReachable||typeof out?.b143?.geometrySha256!=='string')
   return {status:'HOLD',rejectCode:'RESEARCH_FULL_V6_SOURCE_SAFETY_HOLD',
    rawError:null,geometrySha:null,worldSafe:false,sourceReachable:false};
  return {status:'PASS',rejectCode:null,rawError:null,
   geometrySha:out.b143.geometrySha256,worldSafe:true,sourceReachable:true};
 }catch(e){
  const rawError=String(e?.message??e);
  return {status:'HOLD',rejectCode:safeReject(e),rawError,
   geometrySha:null,worldSafe:false,sourceReachable:false};
 }
}

export function contrastV6RankedLayer(original,expectedOriginalError=null){
 const frozen=JSON.stringify(original);
 const materialized=materializeV4JParentIndexAuthor(original);
 const ranked={
  schema:RANKED_SCHEMA,id:materialized.id,title:materialized.title,
  brief:materialized.brief,materials:materialized.materials,
  spaces:materialized.spaces
 };
 let oldStatus='PASS',oldError=null,oldGeometry=null;
 try{
  const out=compileRankedExteriorIntent(ranked);
  oldGeometry=out.b143.geometrySha256;
 }catch(e){oldStatus='HOLD';oldError=String(e?.message??e);}
 let researchStatus='PASS',researchError=null,proof=null,proposalGeometry=null;
 try{
  const out=compileRankedExteriorIntent(ranked,{centerStripResearchV2:true});
  proof={
   windows:out.rankedPhysicalGlazingSourceProof.windowCount,
   glassCells:out.rankedPhysicalGlazingSourceProof.verifiedPanelGlassCells,
   inwardAirCells:out.rankedPhysicalGlazingSourceProof.verifiedImmediateInwardAirCells,
   outwardAirCells:out.rankedPhysicalGlazingSourceProof.verifiedImmediateOutwardAirCells,
   sourceRoutes:out.b143.sourceRoutes.status,
   allZonesReached:out.b143.sourceRoutes.zones.every(z=>z.reachedFromEntrance),
   allFeaturesReached:out.b143.sourceRoutes.featureAccess.every(f=>f.reachableFromEntrance),
   worldWrites:out.worldWrites,
   allNineGatesBlocked:out.gates.length===9&&out.gates.every(x=>x==='BLOCKED')&&
    out.BuildPlan?.operations?.length===0&&out.executionAllowed===false
  };
  proposalGeometry=out.b143.geometrySha256;
 }catch(e){researchStatus='HOLD';researchError=e;}
 const fullLegacy=auditFullV6Source(()=>
  compileCivicArcadeAuthorIntent(materialized));
 const fullResearch=auditFullV6Source(()=>
  runWithRankedExteriorCenterStripResearch(()=>
   compileCivicArcadeAuthorIntent(materialized)));
 if(JSON.stringify(original)!==frozen)hold('ORIGINAL_AUTHOR_MUTATED');
 const fullImproved=oldStatus==='HOLD'&&researchStatus==='PASS'&&
  fullLegacy.status==='HOLD'&&fullResearch.status==='PASS';
 return {
  ...safeBase(),
  status:fullLegacy.status==='PASS'&&fullResearch.status==='HOLD'?
   'HOLD_RESEARCH_FULL_V6_REGRESSION':
   fullImproved?'RESEARCH_FULL_V6_SOURCE_ONLY_PASS_NOT_ART':
   oldStatus==='HOLD'&&researchStatus==='PASS'?
   'RESEARCH_RANKED_LAYER_ONLY_PASS_NOT_V6':
   oldStatus==='PASS'&&researchStatus==='PASS'?
   'RESEARCH_RANKED_BASELINE_AND_PROPOSAL_PASS':
   'HOLD_RANKED_LAYER_NOT_PROVEN',
  legacyRankedStatus:oldStatus,
  legacyCompilerRejectCode:oldError?classifyPrivateCompilerRejection(oldError):null,
  originalCompilerErrorReproduced:
   expectedOriginalError===null?null:oldStatus==='HOLD'&&oldError===expectedOriginalError,
  researchRankedStatus:researchStatus,
  researchCompilerRejectCode:researchError?safeReject(researchError):null,
  sameRankedGeometry:oldGeometry&&proposalGeometry?
   oldGeometry===proposalGeometry:null,
  rankedPhysicalWitness:proof,
  fullV6CompilerExecuted:true,
  fullV6LegacyStatus:fullLegacy.status,
  fullV6ResearchStatus:fullResearch.status,
  fullV6LegacyRejectCode:fullLegacy.rejectCode,
  fullV6ResearchRejectCode:fullResearch.rejectCode,
  originalFullV6ErrorReproduced:expectedOriginalError===null?null:
   fullLegacy.status==='HOLD'&&fullLegacy.rawError===expectedOriginalError,
  fullV6Source:fullResearch.status==='PASS'?
   'RESEARCH_SOURCE_PASS_NOT_ART_OR_APPROVAL':'HOLD_NOT_APPROVED',
  fullV6WorldSafetyVerified:fullResearch.worldSafe,
  fullV6SourceRoutesVerified:fullResearch.sourceReachable,
  sameFullV6Geometry:fullLegacy.geometrySha&&fullResearch.geometrySha?
   fullLegacy.geometrySha===fullResearch.geometrySha:null,
  additionalModelCalls:0,worldWrites:0
 };
}
export function readSavedV6Study(folder){
 const root=path.resolve(folder);
 const s=fs.lstatSync(root);
 if(!s.isDirectory()||s.isSymbolicLink())hold('STUDY_DIR_UNSAFE');
 const repoRoot=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
 if(isWithin(fs.realpathSync(root),fs.realpathSync(repoRoot)))
  hold('PRIVATE_STUDY_INSIDE_REPO');
 const manifest=JSON.parse(parseFile(root,'V4D_LOCAL_AUTHOR_REPORT.json',400000));
 const request=JSON.parse(parseFile(root,'LOCAL_REQUEST.json',50000));
 if(manifest.schema!=='minecraftaibuilder-r125-v4d-local-model-author-attempt-v1'||
  manifest.authorContract!==CIVIC_ARCADE_SCHEMA||
  manifest.promptProtocol!==V4J_PARENT_INDEX_PROTOCOL||
  manifest.systemPromptSha256!==TARGET_PROMPT_SHA||
  manifest.status!=='HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR'||
  manifest.modelCalls!==1||manifest.rawCaptured!==true||
  manifest.testInjectionPresent!==false||
  manifest.modelFinishReason!=='stop'||!BASE_ERROR.test(manifest.reason??'')||
  manifest.worldWrites!==0||manifest.worldContacts!==0||
  manifest.readiness!=='NOT_PREPARED'||
  manifest.constructionApproved!==false||
  manifest.executionAllowed!==false||
  !Array.isArray(manifest.gates)||manifest.gates.length!==9||
  manifest.gates.some(g=>g!=='BLOCKED')||
  !Array.isArray(manifest.BuildPlan?.operations)||
  manifest.BuildPlan.operations.length!==0||
  request.sourceOnly!==true||request.noWorldAccess!==true||
  request.noPaidAPI!==true||request.nModelGenerationAttemptsAllowed!==1||
  request.authorContract!==manifest.authorContract||
  request.promptProtocol!==manifest.promptProtocol||
  request.systemPromptSha256!==manifest.systemPromptSha256||
  !/^[a-f0-9]{64}$/.test(manifest.structuredSchemaSha256??'')||
  request.structuredSchemaSha256!==manifest.structuredSchemaSha256)
  hold('ORIGINAL_STUDY_MANIFEST_NOT_VERIFIED');
 const raw=parseFile(root,'MODEL_RESPONSE_ORIGINAL.txt',250000);
 if(sha(raw)!==manifest.responseRawSha256)hold('ORIGINAL_RAW_SHA256_MISMATCH');
 return {input:JSON.parse(raw),originalError:manifest.reason};
}
function cli(){
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--study'||!args[1])
  hold('ARGS_EXPECT_EXISTING_PRIVATE_STUDY');
 const {input,originalError}=readSavedV6Study(args[1]);
 const result=contrastV6RankedLayer(input,originalError);
 if(result.originalCompilerErrorReproduced!==true||
  result.originalFullV6ErrorReproduced!==true)
  hold('ORIGINAL_COMPILER_ERROR_NOT_REPRODUCED');
 console.log(JSON.stringify({
  ...result,originalRawIntegrity:'SHA256_MATCH',
  originalModelGenerationAttempts:1
 },null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{cli()}
 catch(e){
  const allowed=new Set(['ARGS_EXPECT_EXISTING_PRIVATE_STUDY',
   'STUDY_DIR_UNSAFE','PRIVATE_STUDY_INSIDE_REPO',
   'PRIVATE_FILE_NOT_REGULAR_OR_SIZE_LIMIT',
   'ORIGINAL_STUDY_MANIFEST_NOT_VERIFIED','ORIGINAL_RAW_SHA256_MISMATCH',
   'ORIGINAL_COMPILER_ERROR_NOT_REPRODUCED','ORIGINAL_AUTHOR_MUTATED']);
  console.log(JSON.stringify({
   ...safeBase(),status:'HOLD',reason:allowed.has(e?.message)?
    e.message:'PRIVATE_OR_SOURCE_UNVERIFIED'
  },null,2));
  process.exitCode=2;
 }
}
