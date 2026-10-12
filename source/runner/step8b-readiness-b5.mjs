// Step8B/B5: review-only compatibility readiness matrix; never emits voxel or command plans.
import {createHash} from 'node:crypto';
const sum=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function check(v,code){if(!v){const e=new Error(code);e.code=code;throw e;}}
const programs=['hotel','apartment','office'];
const pinnedGeometry=Object.freeze({'hotel':'e8c5983a7089ed180c8c30981cf661129947e3e1dfe94f67c3b8393168ce794c','apartment':'7429de5caa540b02363873d21e18600047897e3ed82894819d55e74c1cd0de30','office':'3907e3844d77887ff969ac78a1799d8d34562906772289f5f41d8671906ee8a9'});
const orientations=['north','east','south','west'];
const shapes=['slab','L_shape','U_shape','courtyard','tower_on_podium','stepped','twin_bar','asymmetric_block'];
export function evaluateBuildReadiness(geometryReports,apiAudit,evidenceDelta){
 check(geometryReports&&typeof geometryReports==='object'&&Object.keys(geometryReports).sort().join(',')===programs.slice().sort().join(','),'B5_PROGRAMS_NOT_COMPLETE');
 check(apiAudit?.schema==='minecraftaibuilder-step8b-b4-static-source-audit-v1'&&apiAudit.status==='STATIC_SOURCE_API_REVIEW_ONLY'&&
  apiAudit.sourceFilesVerified===249&&apiAudit.snapshotManifestSha256===evidenceDelta.snapshotManifestSha256&&apiAudit.deploymentGate==='BLOCKED'&&apiAudit.BuildPlan?.status==='NOT_PREPARED'&&apiAudit.BuildPlan.commandCount===0,'B5_INVALID_STATIC_API_EVIDENCE');
 check(evidenceDelta?.schema==='minecraftaibuilder-step8b-b43-evidence-delta-v1'&&evidenceDelta.deploymentGate==='BLOCKED'&&
 evidenceDelta.runtimeIdentity==='NOT_PROVEN'&&evidenceDelta.BuildPlan?.status==='NOT_PREPARED'&&evidenceDelta.BuildPlan.commandCount===0,'B5_INVALID_RUNTIME_EVIDENCE');
 const programsView=[];
 let matrixSha=null;
 for(const program of programs){
  const r=geometryReports[program];
  check(r?.schema==='minecraftaibuilder-step8b-b3-geometry-preview-v1'&&r.sourceFilesVerified===249&&
   r.status==='STATIC_PREVIEW_COMPLETE_NOT_PREPARED'&&r.deploymentGate==='BLOCKED'&&r.BuildPlan?.status==='NOT_PREPARED'&&
   r.BuildPlan.commandCount===0&&r.BuildPlan.operations?.length===0&&r.safety?.executionAllowed===false&&
   r.styleSeedCases===288&&r.crossMatrix?.length===288&&r.candidates?.length>0&&
   JSON.stringify(r.allowedOrientations)===JSON.stringify(orientations)&&JSON.stringify(r.massings)===JSON.stringify(shapes),'B5_UNSAFE_OR_INCOMPLETE_GEOMETRY');
  check(r.candidates.every(c=>c.program===program&&c.BuildPlan?.status==='NOT_PREPARED'&&c.BuildPlan.operations?.length===0&&c.worldAnchor===null&&
   c.worldCoordinates===null&&c.safety?.executionAllowed===false),'B5_UNSAFE_CANDIDATE');
  // Verify report self-checksum rather than relying on a mutable precomputed JSON alone.
  const noDigest={...r};delete noDigest.reportSha256;
  check(r.reportSha256===sum(noDigest),'B5_GEOMETRY_CHECKSUM_MISMATCH');
  check(r.reportSha256===pinnedGeometry[program],'B5_GEOMETRY_BASELINE_CHANGED');
  const grid=JSON.stringify(r.crossMatrix);
  const digest=sum(r.crossMatrix);
  if(matrixSha!==null)check(digest===matrixSha,'B5_CROSS_MATRIX_DIVERGENCE');
  matrixSha=digest;
  const mismatches=r.candidates.filter(c=>!c.comparison?.match);
  programsView.push({program,candidateCount:r.candidates.length,staticCellsCompared:true,previewGeometryStatus:mismatches.length?'CONCEPT_SOURCE_DISAGREEMENT':'CONCEPT_SOURCE_FOOTPRINT_AGREEMENT',
   mismatchedCandidates:mismatches.map(c=>({id:c.id,massing:c.massing,orientation:c.orientation,
    addedCellsByFloor:c.comparison.newlyOccupiedCellsByFloor,removedCellsByFloor:c.comparison.noLongerOccupiedCellsByFloor})),
   previewOnly:true,realPlannerAndWorldUnverified:true});
 }
 const gates=[
  {gate:'STATIC_SOURCE_PIN',state:evidenceDelta.comparison.sourceState==='CRITICAL_DISK_SOURCES_MATCH'?'EVIDENCED_DISK_ONLY':
   evidenceDelta.comparison.sourceState==='AWAITING_WINDOWS_B42_CAPTURE'?'EVIDENCED_AT_B4_1_ONLY':'BLOCKED_SOURCE_DRIFT',requirement:'Source pin does not prove loaded code'},
  {gate:'RUNTIME_IDENTITY_AND_VERSION',state:'BLOCKED',requirement:'Live process and loaded code not independently attested'},
  {gate:'PLANNER_VOXEL_LAYER_EQUIVALENCE',state:'BLOCKED',requirement:'Real planner/voxel payload not safely established'},
  {gate:'WORLD_AND_COORDINATE_BINDING',state:'BLOCKED',requirement:'World, anchor, facing, terrain unbound'},
  {gate:'EDUCATION_MATERIAL_STATES',state:'BLOCKED',requirement:'Validated in-world block identifiers/states absent'},
  {gate:'SITE_PERMISSION_AND_CLEARANCE',state:'BLOCKED',requirement:'No scan/site clearance approval'},
  {gate:'STRUCTURE_DOORS_ACCESSIBILITY',state:'BLOCKED',requirement:'Stairs, lifts, exits and structure not verified'},
  {gate:'EXPLICIT_USER_APPROVAL',state:'BLOCKED',requirement:'Construction not authorized'}
 ];
 const out={schema:'minecraftaibuilder-step8b-b5-nonexecution-readiness-v1',status:'REVIEW_ONLY_NOT_PREPARED',
  sourceFilesVerified:249,staticGeometryCases:288,programs:programsView,staticAPISignals:apiAudit.staticAPISignals,
  runtimeEvidenceLevel:evidenceDelta.comparison.runtimeEvidenceLevel,gates,
  worldAnchor:null,worldCoordinates:null,materialBlockIds:[],blockStates:[],
  runtimeIdentity:'NOT_PROVEN',executionCompatibility:'UNKNOWN',deploymentGate:'BLOCKED',
  BuildPlan:{status:'NOT_PREPARED',operations:[],commandCount:0},
  safety:{constructionApproved:false,executionAllowed:false,noWorldMutation:true,noBridge:true,noScan:true,noPackGeneration:true},
  nextAction:'Collect a SINGLE B4.2 Windows read-only JSON if desired. Review results offline; NEVER implicitly authorize construction.'};
 out.reportSha256=sum(out);
 return out;
}
