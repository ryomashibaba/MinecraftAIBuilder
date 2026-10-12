/** B44-C archived evidence reconciliation, no runtime inference and no execution. */
import {createHash} from 'node:crypto';
import {validateNonExecutableIR} from './safety-validator.mjs';
const sha=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const fail=code=>{const e=new Error(`B44C_${code}`);e.code=`B44C_${code}`;throw e;};
const PINS=Object.freeze({
 b26:'2173f804b341e475b34ff97087764027bae1a60043e7a1a1011aa797727fc905',
 b28:'fe25e9a8335dc0970b26d8738228f02ca47ed6a6ffe6fd0b0bfd94a5285e4fb1',
 b29:'f3c3f5d0d29e80195c464444130fd83aa0bb32d608a0b7e0916e0d26cc7ca0c7',
 b43:'7f5137f56e7299122a6a0b3184e99e23c4a28f780f534288bb8892c92df4f9ee',
 b43graph:'3d9944fa52bac755557faa9d8b34dfc9f69e61ae45c2bf58f171d8b19fdcec1d'});
const files=Object.freeze({b26:'reports/B26_M4_READONLY_PREFLIGHT.json',b28:'reports/B28_REAL_WINDOWS_RECONCILIATION.json',b29:'reports/B29_M3_M4_ASSEMBLY_IR.json',b43:'reports/B43_BASELINE_ONLY_ASSESSMENT.json',b43graph:'reports/B43_VERTICAL_CIRCULATION.json'});
const GATES=['LOADED_ENGINE_IDENTITY','MATERIAL_ROLE_MAPPING','WALL_JUNCTION_MATERIAL_SUPPORT','DOOR_LOWER_UPPER_FACING_HINGE','EXACT_DOOR_BLOCK_STATES','STAIR_SLAB_CUTOUT_SUPPORT_AND_HEADROOM','WORLD_ANCHOR_AND_SITE_SAFETY','OFFICE02_SOURCE_VS_CONCEPT','EXPLICIT_CONSTRUCTION_APPROVAL'];
const why=[
 ['Disk files match archived bytes, not loaded Windows process identity','b28.disk; b28.runtime; b43.runtimeIdentity'],
 ['Archive catalog totals are not a live, role-specific material mapping','b26.archivedProfile; b29.materialRoleContract'],
 ['3990 shared wall voxel intents lack material, join and physical validation','b29.totals; b29.materialRoleContract'],
 ['314 door ports lack actual lower/upper, facing and hinge verification','b29.totals; b26.interior'],
 ['Archived ordinary-door exact block-state records are zero','b28.archivedCatalog; b26.interior'],
 ['25 stair interfaces have no certified slab half, direction, collision, headroom or support','b29.totals; b43graph.totals'],
 ['World anchor, physical site safety, and real movement remain unverified','b26.gate; b43graph.safety'],
 ['Office02 concept/source discrepancy requires candidate-only adjudication','b29.office02; b26.interior'],
 ['No explicit construction approval; M4 gates must remain blocked','b26.blockers; b29.unresolvedGates']];
function pinned(name,obj,expectedSchema){
 if(!obj||obj.schema!==expectedSchema||obj.reportSha256!==PINS[name])fail(`${name.toUpperCase()}_PIN`);
 const {reportSha256,...body}=obj;
 if(sha(body)!==obj.reportSha256)fail(`${name.toUpperCase()}_HASH`);
}
function checked(v,n){if(!v)fail(`MISSING_${n}`);}
export function compileB44CPreflight(inputs){
 const {b26,b28,b29,b43,b43graph}=inputs??{};
 pinned('b26',b26,'minecraftaibuilder-step8b-b26-m4-offline-gate-v1');
 pinned('b28',b28,'minecraftaibuilder-step8b-b28-real-evidence-reconciliation-v1');
 pinned('b29',b29,'minecraftaibuilder-b29-m3-m4-assembly-ir-v1');
 pinned('b43',b43,'minecraftaibuilder-step8b-b43-evidence-delta-v1');
 pinned('b43graph',b43graph,'minecraftaibuilder-step8b-b43-whole-building-circulation-v1');
 checked(b26.gate?.deployment==='BLOCKED'&&b26.gate?.readiness==='NOT_PREPARED'&&b26.gate?.runtimeProven===false&&b26.gate?.constructionApproved===false,'B26_SAFETY');
 checked(b26.allBlockersOpen===true&&b26.blockers?.length===9&&b26.blockers.every((g,i)=>g.id===`M4-0${i+1}`&&g.confirmed===false),'B26_BLOCKERS');
 checked(b28.remainingBlockers===9&&b28.blockers?.length===9&&b28.blockers.every((g,i)=>g.id===`M4-0${i+1}`&&g.status==='BLOCKED'),'B28_BLOCKERS');
 checked(b29.unresolvedGates?.length===9&&b29.unresolvedGates.every((g,i)=>g.id===`M4-0${i+1}`&&g.reason===GATES[i]&&g.status==='BLOCKED'&&g.physicalValidation===false),'B29_GATES');
 checked(b43graph.blockers?.length===9&&b43graph.blockers.every((g,i)=>g.id===`M4-0${i+1}`&&g.status==='BLOCKED'),'B43_GATES');
 checked(b26.source.educationVersion==='v26.3'&&b28.disk.checked===9&&b28.disk.matched===9&&b28.disk.engineLoadedHashAttested===false&&b28.runtime.identityAttested===false&&b43.runtimeIdentity==='NOT_PROVEN'&&b43.executionCompatibility==='UNKNOWN'&&b43.current.status==='NOT_COLLECTED','RUNTIME_NOT_PROVEN');
 checked(b28.archivedCatalog.records===966&&b28.archivedCatalog.archivedVerified===827&&b28.archivedCatalog.archivedUnsupported===139&&b28.archivedCatalog.ordinaryDoorExactStateEvidenceRecords===0&&b28.archivedCatalog.liveMinecraftAcceptanceProven===false,'CATALOG_SCOPE');
 checked(b29.totals.doorPorts===314&&b29.totals.stairInterfaces===25&&b29.totals.physicalDoorsVerified===0&&b29.totals.physicalStairsVerified===0&&b29.totals.commandsEmitted===0&&b43graph.totals.buildOperations===0,'PHYSICAL_SCOPE');
 for(const obj of [b26,b28,b29,b43,b43graph]){
  if(!obj.BuildPlan||obj.BuildPlan.status!=='NOT_PREPARED'||obj.BuildPlan.operations?.length!==0||
   ('commandCount' in obj.BuildPlan && obj.BuildPlan.commandCount!==0)||
   ('worldCoordinates' in obj.BuildPlan && obj.BuildPlan.worldCoordinates!==null)||
   ('materialIds' in obj.BuildPlan && obj.BuildPlan.materialIds?.length!==0))fail('UNSAFE_ARCHIVE_PLAN');
 }
 checked(b43.deploymentGate==='BLOCKED'&&b29.deployment==='BLOCKED'&&b29.readiness==='NOT_PREPARED'&&b43graph.deployment==='BLOCKED'&&b43graph.readiness==='NOT_PREPARED','ARCHIVE_DEPLOYMENT');
 const gates=GATES.map((name,i)=>({id:`M4-0${i+1}`,name,status:'BLOCKED',physicalVerified:false,
  reason:why[i][0],evidencePaths:why[i][1].split('; '),missingProof:
   ['Loaded process identity and module attestation','Validated live material role mapping','Physically valid wall joins','Observed exact ordinary door lower/upper, hinge, facing','Accepted Education exact ordinary door states','Physical stair, half-slab, headroom, collision and load-bearing support','Authorized world anchor and site clearance','Approved structural/corridor design delta','Explicit authorization and other eight proofs'][i]}));
 const checks=[
  ['archive-v26.3-profile','verified','HISTORICAL_ARCHIVE_ONLY','b28.archivedCatalog',`966 archived records (827 verified, 139 unsupported), cannot transfer to live game`],
  ['current-education-version','unknown','RUNTIME','b26.source.educationVersion','v26.3 appears in historical capture only'],
  ['loaded-engine-identity','unknown','RUNTIME','b43.runtimeIdentity','Source hashes and process counts are not loaded module attestation'],
  ['ordinary-door-exact-state','unknown','BLOCK_STATE','b28.archivedCatalog.ordinaryDoorExactStateEvidenceRecords','Zero exact ordinary door state records; NOT equal to unsupported'],
  ['door-upper-lower','unknown','BLOCK_STATE','b26.interior.lowerAndUpperDoorStatesVerified','Zero certified port states'],
  ['door-facing-hinge','unknown','BLOCK_STATE','b29.totals.physicalDoorsVerified','No physical facing or hinge attested'],
  ['door-open-close-and-collision','unknown','PHYSICS','b29.totals.physicalDoorsVerified','No physical passage testing'],
  ['stair-facing-shape','unknown','BLOCK_STATE','b29.totals.physicalStairsVerified','272 archived stair-form records are not selected exact states'],
  ['slab-half-and-upper-lower','unknown','BLOCK_STATE','b26.archivedProfile.materials','134 archived slab-form records; no supported role/state chosen'],
  ['stair-collision-support-headroom','unknown','PHYSICS','b29.totals.physicalStairsVerified','No physical cutout or support validation'],
  ['wall-material-joints','unknown','PHYSICS','b29.totals.sharedWallVoxelIntents','3990 conceptual overlaps are not validated physical connections'],
  ['world-site-anchor','unknown','WORLD','b26.gate.worldAccess','No world read, site inspection or placement approval']
 ].map(([id,status,scope,evidencePath,explanation])=>({id,status,scope,evidencePath,explanation}));
 const historic=b26.archivedProfile.materials.map(m=>({form:m.category,evidenceScope:'ARCHIVED_CATALOG_ONLY',
  verifiedRecords:m.archivedVerifiedRecords,unsupportedRecords:m.archivedUnsupportedRecords,totalRecords:m.archivedRecordCount,
  actualItemEligibility:'unknown',selectedBlockId:null,selectedState:null,
  warning:'Historical verified/unsupported counts are NOT per-IR material/state compatibility or game acceptance'}));
 const data={schema:'minecraftaibuilder-b44c-offline-m4-preflight-v1',kind:'PINNED_EVIDENCE_RECONCILIATION_NO_EXECUTION',
  evidencePins:Object.fromEntries(Object.entries(PINS).map(([k,v])=>[files[k],v])),
  educationEdition:{historicalVersion:'v26.3',liveVersion:'unknown',runtimeIdentity:'NOT_PROVEN',
   diskMatches:9,loadedRuntimeAttested:false,liveBlockStateProof:false},
  archivedCatalog:{records:966,archiveVerified:827,archiveUnsupported:139,exactOrdinaryDoorRecords:0,scope:'ARCHIVED_ONLY',forms:historic},
  capabilityChecks:checks,gates,blockedGateCount:9,readiness:'NOT_PREPARED',deployment:'BLOCKED',
  reviewOnly:true,constructionApproved:false,executionAllowed:false,engineCalls:0,buildOperations:0,
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0,worldCoordinates:null,materialIds:[]}};
 return {...data,reportSha256:sha(data)};
}
export function reviewCandidateIR(input,role) {
 const assessment=validateNonExecutableIR(input,{role});
 return {schema:'minecraftaibuilder-b44c-ir-review-v1',...assessment,authorization:'NEVER_FROM_OFFLINE_IR'};
}
export {files as BASELINE_REPORT_PATHS};
