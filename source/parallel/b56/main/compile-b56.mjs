/** B56: non-executing evidence ZIP admission and parity dependency gate. */
import {createHash} from 'node:crypto';
import {compileB55,verifyB55} from '../../b55/main/compile-b55.mjs';
import {inspectEvidenceRoot} from '../../b55/main/intake-b55.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('B56_'+x)};
export function compileB56(b55,b54,b53,b52,{archive=null}={}){
 verifyB55(b55,b54,b53,b52);
 if(b55.productionFacadeParity!=='UNVERIFIED'||b55.decision!=='HOLD'||b55.intake.sourceModulesImported!==false||
    b55.safety?.readiness!=='NOT_PREPARED'||b55.blockers.M4Gates.filter(g=>g.status==='BLOCKED').length!==9)fail('BASELINE');
 if(archive!==null&&(archive.neverExtracted!==true||archive.sourceExecuted!==false||archive.sourceImported!==false||archive.worldAccess!==false||
   archive.archive?.metadata==='INCONSISTENT'||!['CONSISTENT','ABSENT'].includes(archive.archive?.metadata)||
   JSON.stringify(archive.snapshot)!==JSON.stringify(b55.intake)))fail('ARCHIVE_SCOPE');
 const files=b55.intake.files.map(f=>({key:f.key,hashStatus:f.status,
   requirement:f.key==='engine/src/architectural-quality.js'?'PRODUCTION_FACADE_IMPLEMENTATION':
    f.key==='modules/architectural-library.js'?'ARCHITECTURE_MODULE_DEFINITIONS':
    f.key==='styles/urban_japanese.json'?'STYLE_PARAMETERS':'PLANNER_DEPENDENCY',
   staticReviewReady:f.status==='PINNED_MATCH',
   sourceExecuted:false}));
 const readiness=files.every(f=>f.staticReviewReady)?'CAN_BEGIN_STATIC_SOURCE_REVIEW':'WAITING_FOR_VERIFIED_SOURCE_BYTES';
 const body={schema:'minecraftaibuilder-b56-bounded-archive-source-admission-v1',
  purpose:'DIRECT_ZIP_EVIDENCE_VALIDATION_WITHOUT_EXTRACTION_OR_ENGINE_EXECUTION',
  baseline:{b55ReportSha256:b55.reportSha256,b54ReportSha256:b54.reportSha256},
  archive:archive?{...archive.archive}: {status:'NOT_SUPPLIED',sourceFilesFound:0,metadata:'ABSENT'},
  requiredSourceFiles:files,
  counts:{requiredFiles:5,found:files.filter(f=>!['MISSING','UNSAFE_LINK','UNSAFE_NONFILE','OVERSIZE'].includes(f.hashStatus)).length,
   pinned:files.filter(f=>f.hashStatus==='PINNED_MATCH').length,versionMismatch:files.filter(f=>f.hashStatus==='VERSION_MISMATCH').length},
  staticContractReview:{readiness,eligibleSourceFiles:files.filter(f=>f.staticReviewReady).map(f=>f.key),
   sourceCodeParsed:false,executionSafeReviewOnly:true,productionComposeFacadeParity:'UNVERIFIED',
   materialAndQualityParity:'UNVERIFIED',canonicalOutputParity:'UNVERIFIED'},
  dependency:{sourceEvidence:readiness,canonicalReferenceOutputs:'MISSING',runningEngineIdentity:'UNVERIFIED',
   physicalBlockStateValidation:'NOT_ATTEMPTED',nextStep:readiness==='CAN_BEGIN_STATIC_SOURCE_REVIEW'?
     'STATIC_DIFF_AND_REFERENCE_OUTPUT_EVIDENCE_WITHOUT_RUNNING_ENGINE':
     'SUPPLY_B55_READONLY_SOURCE_EVIDENCE_ZIP'},
  safety:{readiness:'NOT_PREPARED',constructionApproval:'HOLD',executionAllowed:false,worldContact:false,
   bridgeContact:false,scans:0,commands:0,sourceImports:0,sourceExecution:0,actualBuildOperations:0,
   BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}},
  blockers:{M4Gates:b55.blockers.M4Gates.map(g=>({...g}))},
  productionParity:'UNVERIFIED',physicalQuality:'UNKNOWN',plannerExecuted:false,
  archiveExtracted:false,existingConstructionModified:false,priorEvidenceFrozen:true};
 return {...body,reportSha256:hash(body)};
}
export function verifyB56(r,b55,b54,b53,b52,{archive=null}={}){
 if(r?.schema!=='minecraftaibuilder-b56-bounded-archive-source-admission-v1'||r.safety?.readiness!=='NOT_PREPARED'||
  r.safety?.constructionApproval!=='HOLD'||r.safety?.executionAllowed!==false||r.safety?.BuildPlan?.status!=='NOT_PREPARED'||
  r.safety?.BuildPlan?.operations?.length!==0||r.safety?.BuildPlan?.commandCount!==0||r.safety?.actualBuildOperations!==0||
  r.safety?.sourceImports!==0||r.safety?.sourceExecution!==0||r.safety?.worldContact!==false||r.safety?.bridgeContact!==false||
  r.safety?.scans!==0||r.safety?.commands!==0||r.blockers?.M4Gates?.length!==9||r.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||
  r.productionParity!=='UNVERIFIED'||r.plannerExecuted!==false||r.archiveExtracted!==false||
  r.staticContractReview?.sourceCodeParsed!==false||r.staticContractReview?.productionComposeFacadeParity!=='UNVERIFIED'||
  r.existingConstructionModified!==false||r.priorEvidenceFrozen!==true)fail('SAFETY');
 const {reportSha256,...body}=r;
 if(hash(body)!==reportSha256)fail('HASH');
 if(JSON.stringify(r)!==JSON.stringify(compileB56(b55,b54,b53,b52,{archive})))fail('DRIFT');
 return true;
}
