/** B55 gaps-to-evidence mapping. Offline static inspection, not a production planner clone. */
import {createHash} from 'node:crypto';
import {validateSafety} from '../../b50/main/compile-b50.mjs';
import {verifyB54} from '../../b54/main/compile-b54.mjs';
import {inspectEvidenceRoot,verifySourceIntake} from './intake-b55.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw new Error('B55_'+x)};
const REQUIRED_PROOFS=[
 {id:'FACADE_GENERATION_SOURCE',files:['engine/src/architectural-quality.js'],need:'EXACT_SOURCE_BYTES'},
 {id:'MATERIAL_AND_MODULE_REGISTRY',files:['modules/architectural-library.js'],need:'EXACT_SOURCE_BYTES'},
 {id:'STYLE_AND_QUALITY_SETTINGS',files:['styles/urban_japanese.json','engine/src/architectural-quality.js'],need:'EXACT_SOURCE_BYTES'},
 {id:'REFERENCE_PLANNER_AND_GRAMMAR',files:['engine/src/general-building-planner.js','engine/src/building-grammar.js'],need:'EXACT_SOURCE_BYTES'},
 {id:'CANONICAL_OUTPUT_CASES',files:[],need:'READONLY_REFERENCE_OUTPUT_HASHES_AND_INPUT_PROVENANCE'},
 {id:'RUNNING_ENGINE_IDENTITY',files:[],need:'RUNTIME_ATTESTATION_NOT_AVAILABLE'},
 {id:'PHYSICAL_MODULE_VALIDATION',files:[],need:'ACTUAL_GAME_VALIDATION_PROHIBITED'},
 {id:'CONSTRUCTION_APPROVAL',files:[],need:'EXPLICIT_APPROVAL_NOT_GRANTED'},
];
export function compileB55(b54,b53,b52,{snapshot=inspectEvidenceRoot()}={}){
 validateSafety(b54);verifyB54(b54,b53,b52);verifySourceIntake(snapshot);
 if(b54.sourcePreflight.productionFacadeParity!=='UNVERIFIED'||b54.totals.designProfiles!==15||
  b54.totals.buildings!==5||b54.totals.levels!==30||b54.BuildPlan.operations.length!==0||
  b54.blockers.M4Gates.length!==9||b54.blockers.M4Gates.some(x=>x.status!=='BLOCKED'))fail('BASELINE');
 const files=Object.fromEntries(snapshot.files.map(f=>[f.key,f.status]));
 const gaps=REQUIRED_PROOFS.map(g=>({id:g.id,need:g.need,files:g.files,
   status:g.files.length?(g.files.every(x=>files[x]==='PINNED_MATCH')?'SOURCE_BYTES_PINNED_ONLY':
    g.files.some(x=>files[x]==='VERSION_MISMATCH')?'VERSION_DRIFT_HOLD':'MISSING_OR_UNSAFE_HOLD'):'NOT_VERIFIED_HOLD',
   allowsRuntimeExecution:false,closesProductionParity:false}));
 const pinned=gaps.filter(g=>g.status==='SOURCE_BYTES_PINNED_ONLY').length;
 const body={schema:'minecraftaibuilder-b55-production-parity-intake-v1',purpose:'OFFLINE_PRODUCTION_SOURCE_ADMISSION_AND_GAP_GATE',
  baseline:{b54ReportSha256:b54.reportSha256,buildings:b54.totals.buildings,levels:b54.totals.levels,
    facadeVisualUnits:b54.totals.facadeVisualUnits,designAlternatives:b54.totals.designProfiles},
  intake:snapshot,
  gapMatrix:gaps,counts:{evidenceTracks:gaps.length,sourceTracksPinned:pinned,
    sourceTracksUnresolved:gaps.filter(g=>g.files.length&&g.status!=='SOURCE_BYTES_PINNED_ONLY').length,
    otherTracksNotVerified:gaps.filter(g=>!g.files.length).length},
  nextAction:snapshot.snapshotStatus==='PINNED_SNAPSHOT_IDENTICAL'?'STATIC_SOURCE_DIFF_REVIEW_ONLY_NO_ENGINE_RUN':
   'OBTAIN_READONLY_PINNED_SOURCES_OR_RECORD_VERSION_DRIFT',
  productionFacadeParity:'UNVERIFIED',physicalQuality:'UNKNOWN',decision:'HOLD',
  safety:{readiness:'NOT_PREPARED',deployment:'BLOCKED',executionAllowed:false,constructionApproved:false,
   actualModulesEmitted:0,worldContact:false,bridgeContact:false,scans:0,minecraftCommands:0,
   materialIds:[],worldCoordinates:null,BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0}},
  blockers:{M4Gates:b54.blockers.M4Gates.map(g=>({...g}))},
  unchangedDesignReview:true,actualConstructionOperations:0,engineCalls:0};
 return {...body,reportSha256:hash(body)};
}
export function verifyB55(report,b54,b53,b52){
 if(!report||report.schema!=='minecraftaibuilder-b55-production-parity-intake-v1'||
  report.safety?.readiness!=='NOT_PREPARED'||report.safety?.deployment!=='BLOCKED'||
  report.safety?.executionAllowed!==false||report.safety?.constructionApproved!==false||
  report.safety?.actualModulesEmitted!==0||report.safety?.worldContact!==false||report.safety?.bridgeContact!==false||
  report.safety?.scans!==0||report.safety?.minecraftCommands!==0||report.safety?.materialIds?.length!==0||
  report.safety?.worldCoordinates!==null||report.safety?.BuildPlan?.operations?.length!==0||
  report.safety?.BuildPlan?.commandCount!==0||report.blockers?.M4Gates?.length!==9||
  report.blockers.M4Gates.some(g=>g.status!=='BLOCKED')||report.productionFacadeParity!=='UNVERIFIED'||
  report.decision!=='HOLD'||report.actualConstructionOperations!==0||report.engineCalls!==0||
  report.intake?.productionFacadeParity!=='UNVERIFIED'||report.gapMatrix?.some(g=>g.allowsRuntimeExecution!==false||g.closesProductionParity!==false))fail('SAFETY');
 const {reportSha256,...body}=report;if(hash(body)!==reportSha256)fail('HASH');
 const recomputed=compileB55(b54,b53,b52,{snapshot:report.intake});
 if(JSON.stringify(report)!==JSON.stringify(recomputed))fail('DRIFT');
 return true;
}
