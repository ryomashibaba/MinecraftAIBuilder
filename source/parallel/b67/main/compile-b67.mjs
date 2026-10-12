/** B67 gate: production source remains absent; verify one-click collector has safe, B56-compatible protocol. */
import {createHash} from 'node:crypto';
import {PINS} from './collect-b67.mjs';
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=x=>{throw Error('B67_'+x)};
export function compileB67(b66,b56){
 if(!b66||b66.schema!=='minecraftaibuilder-b66-local-3d-nominal-assembly-v1'||b66.reportSha256!==hash(Object.fromEntries(Object.entries(b66).filter(([k])=>k!=='reportSha256')))||b66.summary?.virtualWallPanels!==5704||b66.summary?.virtualOpeningVoids!==314||b66.summary?.physicalBlocks!==0||b66.BuildPlan?.operations?.length!==0||b66.gates?.length!==9||b66.gates.some(g=>g.status!=='BLOCKED')||b66.readiness!=='NOT_PREPARED'||b66.executionAllowed!==false)fail('B66_BASELINE');
 if(!b56||b56.schema!=='minecraftaibuilder-b56-bounded-archive-source-admission-v1'||b56.counts?.requiredFiles!==5||b56.counts?.found!==0||b56.safety?.readiness!=='NOT_PREPARED'||b56.safety?.executionAllowed!==false||b56.safety?.BuildPlan?.operations?.length!==0||b56.archiveExtracted!==false||b56.productionParity!=='UNVERIFIED'||b56.blockers?.M4Gates?.length!==9||b56.blockers.M4Gates.some(g=>g.status!=='BLOCKED'))fail('B56_BASELINE');
 const body={schema:'minecraftaibuilder-b67-source-collection-readiness-v1',purpose:'UNBLOCK_PRODUCTION_SOURCE_DEPENDENCY_WITH_ONE_CLICK_READONLY_EXPORT',
  provenance:{b66ReportSha256:b66.reportSha256,b56ReportSha256:b56.reportSha256},
  originalSourceState:{required:5,available:0,pinnedFiles:Object.entries(PINS).map(([relativePath,expectedSha256])=>({relativePath,expectedSha256,status:'NOT_PRESENT_IN_HANDOFF'})),productionFacadeParity:'UNVERIFIED',engineExecuted:false},
  createdTool:{id:'B67_STANDALONE_NODE_READONLY_COLLECTOR',requiredRuntime:'Node.js >=20',windowsLauncher:'RUN_B67_READONLY.cmd',entryPoint:'collect-b67.mjs',
   fileReadScope:'FIVE_EXACT_PINNED_PROJECT_FILES_PLUS_PACKAGE_JSON',output:'B55_CAPTURE_SUMMARY_COMPATIBLE_ZIP',status:'TESTED_WITH_SYNTHETIC_FIXTURES_ON_NON_WINDOWS',windowsRealDeviceTest:'NOT_RUN',realProductionSourceCollection:'NOT_RUN',
   sourceModification:false,sourceExecution:false,downloadsOnlyForDirectCli:true,gameAccess:false,network:false,worldScan:false},
  gateBeforePhysicalImplementation:['RECEIVE_GENUINE_B67_SOURCE_ZIP','VERIFY_FIVE_SHA256_HASHES_AND_CAPTURE_METADATA_WITH_B56','REVIEW_SOURCE_CONTENTS_FOR_SECRETS','REVIEW_ENGINE_COMPOSITION_API_CONTRACT','RECONCILE_REAL_BLOCK_STATES_MATERIAL_AND_PHYSICAL_CLEARANCE','RUN_TESTS_OFFLINE_FIRST','KEEP_CONSTRUCTION_BLOCKED_UNTIL_EXPLICIT_APPROVAL'],
  scope:{buildings:5,floors:30,conceptRooms:314,virtualWallPanels:5704,virtualDoorVoids:314,verticalReservations:25,realBlocksGenerated:0},
  unresolved:['NO_ORIGINAL_PRODUCTION_ENGINE_FILES','NO_REAL_WORLD_BLOCK_GEOMETRY','NO_REAL_DOOR_BLOCK_STATES','NO_REAL_STAIR_SUPPORT','B42_60_UPPER_DOORS_UNVERIFIED','B62_B64_CONNECTOR_NOT_APPROVED'],
  readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,sourceImported:false,sourceExecuted:false,engineCalls:0,worldContacts:0,scans:0,
  M4Gates:b66.gates.map(g=>({...g})),BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...body,reportSha256:hash(body)};
}
export function verifyB67(r,b66,b56){
 if(!r||r.reportSha256!==hash(Object.fromEntries(Object.entries(r).filter(([k])=>k!=='reportSha256')))||JSON.stringify(r)!==JSON.stringify(compileB67(b66,b56))||r.M4Gates.some(g=>g.status!=='BLOCKED')||r.BuildPlan.operations.length||r.executionAllowed!==false||r.constructionApproved!==false||r.engineCalls!==0||r.worldContacts!==0||r.originalSourceState.available!==0)fail('REPORT_INTEGRITY');
 return true;
}
