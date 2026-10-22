/**
 * R62 — offline evidence-bound feedback for a FUTURE separately consented
 * architectural redesign. Does not mutate the original or call any model.
 * R49 objective envelope/math hints and R61 final voxel plan-dependent
 * defects are distinct from frozen human architectural expectations.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {inspectR49GlobalConsistency}
 from '../source/ai/b198zr49-global-source-consistency.mjs';
import {SCHEMA as R61_SCHEMA}
 from './b198zr61-final-voxel-section-review.mjs';
import {bridgeR65IndependentSpatialEvidence}
 from './b198zr65-independent-network-feedback.mjs';
import {assessR66OverheadSpace,SCHEMA as R66_SCHEMA}
 from './b198zr66-overhead-space-audit.mjs';
import {assessR67SpatialContainment,SCHEMA as R67_SCHEMA}
 from './b198zr67-spatial-containment-audit.mjs';
import {inspectR68AirContinuity,SCHEMA as R68_SCHEMA}
 from './b198zr68-horizontal-air-continuity.mjs';
import {analyzeR69VerticalAirAndMotion,SCHEMA as R69_SCHEMA}
 from './b198zr69-vertical-air-vs-motion.mjs';
import {assessR70ProvisionalEntranceRoutes,SCHEMA as R70_SCHEMA}
 from './b198zr70-exterior-approach-route-review.mjs';
import {inspectR71AbstractRouteGaps,SCHEMA as R71_SCHEMA}
 from './b198zr71-abstract-route-gap-triage.mjs';
import {assessR72MassVoidGapContext,SCHEMA as R72_SCHEMA}
 from './b198zr72-mass-void-gap-context.mjs';
import {compareR73CirculationConcepts,SCHEMA as R73_SCHEMA}
 from './b198zr73-preserve-concept-circulation-comparison.mjs';
import {makeR74HumanWorksheet,SCHEMA as R74_SCHEMA}
 from './b198zr74-human-option-review-worksheet.mjs';

export const SCHEMA='minecraftaibuilder-b198zr62-evidence-backed-next-design-guidance-v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=s=>{throw Error('B198ZR62_'+s)};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safe=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},worldContacts:0,worldReads:0,
 worldWrites:0,modelCalls:0});
const c01=CREATION_CASES.find(x=>x.id==='c01');
const compiledStatus='B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS';
const notes={
 ELEMENT_OUTSIDE_LOCAL_BOUNDS:
  'Rework overall dimensions and geometry envelopes so EVERY authored shape, shell and repeat remains inside exclusive local bounds; do not silently clip.',
 POINT_OUTSIDE_LOCAL_BOUNDS:
  'Place all declared entrance/destination points inside local bounds and tie them to actual usable final geometry.',
 DECLARED_PATH_STEPS_IMPOSSIBLE:
  'Design the real entrance-to-destination circulation first; declared path limits must cover at least the proven minimum step bound and realistic detours.',
 REUSED_R3_SPATIAL_ID:
  'Give each distinct destination, protected void and functional zone an unambiguous unique identifier.',
 POSSIBLE_PROTECTED_VOID_REFILL:
  'Reconsider ADD/CUT ordering; verify claimed rooms and atria retain air in FINAL solids. Envelope intersections are only hints.',
 UNSUPPORTED_SOURCE_ENVELOPE:
  'Repair shape-specific grammar and dimensional contracts before treating any footprint projection as verified.',
 INVALID_SOURCE_ENVELOPE:
  'Return complete B143 design.bounds, elements and a coherent spatialPlan in a single parseable four-key source response.',
 UNPARSEABLE_JSON:
  'Return ONE complete four-key JSON object, without truncation or an accompanying Markdown code fence.'
};
const spatialNotes={
 PRESERVE_REQUIRED_AIR:
  'Rework the solid/void composition so the entire required air volume remains usable after ordered ADD/CUT, while preserving necessary supported floors and structural logic.',
 CONNECT_DESTINATION:
  'Design physical supporting floors, 2/3-block headroom and connected vertical transitions with aligned landings from entrance to the actual destination.',
 FREE_FUNCTIONAL_ZONE:
  'Reallocate solid furniture and structural mass around reachable air positions; keep meaningful, usable rooms rather than merely naming a solid region.'
};
function assertR61(x,rawHash,geometrySha){
 if(x===null)return fail('COMPILED_SOURCE_REQUIRES_R61_EVIDENCE');
 if(x.schema!==R61_SCHEMA||x.originalRawSha256!==rawHash||
  x.expectedGeometrySha256!==geometrySha||
  (x.r43GeometrySha256!==null&&x.r43GeometrySha256!==geometrySha))
  fail('R61_SOURCE_OR_GEOMETRY_PROVENANCE_MISMATCH');
 if(!Array.isArray(x.geometryDerivedIssues)||
  x.geometryDerivedIssues.length>100)fail('INVALID_R61_SPATIAL_ISSUES');
}
export function prepareR62FutureDesignGuidance({
 raw,expectedRawSha256,b143Status,r61Evidence=null,
 expectedGeometrySha256=null,r64Evidence=null,r66Evidence=null,
 r67Evidence=null,r68Evidence=null,r69Evidence=null,
 r70Evidence=null,r71Evidence=null,r72Evidence=null,
 r73Evidence=null,r74Evidence=null
}={}){
 if(typeof raw!=='string'||!raw||
  Buffer.byteLength(raw)>120000||
  sha(raw)!==expectedRawSha256||!c01)
  fail('FROZEN_ORIGINAL_REQUIRED');
 if(typeof b143Status!=='string'||![
  compiledStatus,'HOLD_B143_NOT_COMPILED','HOLD_B143_COMPILED_INTEGRITY'
 ].includes(b143Status))fail('KNOWN_B143_STATUS_REQUIRED');
 const compiled=b143Status===compiledStatus;
 if(compiled){
  if(!/^[a-f0-9]{64}$/.test(expectedGeometrySha256??''))
   fail('COMPILER_GEOMETRY_SHA_REQUIRED');
  assertR61(r61Evidence,expectedRawSha256,expectedGeometrySha256);
 }else if(r61Evidence!==null||expectedGeometrySha256!==null||
  r64Evidence!==null||r66Evidence!==null||r67Evidence!==null||
  r68Evidence!==null||r69Evidence!==null||r70Evidence!==null||r71Evidence!==null||
  r72Evidence!==null||r73Evidence!==null||r74Evidence!==null){
  fail('NEVER_CLAIM_FINAL_VOXELS_WHEN_B143_HOLD');
 }
 const global=inspectR49GlobalConsistency(raw);
 if(global.originalRawSha256!==expectedRawSha256)
  fail('R49_RAW_SHA_MISMATCH');
 const issues=[];
 // These mathematical contradictions do not depend on the model's preferred
 // thresholds or on human interpretation of an architectural program.
 for(const issue of global.issues??[]){
  const evidenceKind=issue.kind;
  issues.push({kind:evidenceKind,count:issue.count,
   basis:'R49_ORIGINAL_SOURCE_BOUNDS_OR_MATH_HINT',
   objectiveFinalVoxelEvidence:false,
   instructions:notes[evidenceKind]??'Inspect the original source for the precise inconsistency, without automatically repairing it.'});
 }
 if(!compiled){
  issues.unshift({kind:'STRICT_B143_HOLD',count:1,
   basis:'R58_STRICT_B143_COMPILER_HOLD',
   objectiveFinalVoxelEvidence:false,
   instructions:'Before asserting rooms or geometry, author a complete valid B143 design with truthful source bounds, materials and shape-specific fields. Preserve the creative architectural intent.'});
 }else{
  for(const item of r61Evidence.geometryDerivedIssues){
   if(!Object.hasOwn(spatialNotes,item.kind))
    fail('UNKNOWN_R61_SPATIAL_ISSUE_KIND');
   issues.push({kind:item.kind,id:String(item.id??'').slice(0,80),
    measured:item.measured??null,count:1,
    basis:'R43_FINAL_ABSTRACT_VOXELS_AGAINST_MODEL_DECLARED_PLAN',
    objectiveFinalVoxelEvidence:true,
    instructions:spatialNotes[item.kind]});
  }
  if(r61Evidence.r43Status==='HOLD_SOURCE_OR_ENTRANCE')
   issues.push({kind:'MODEL_DECLARED_PLAN_CANNOT_BE_VALIDATED',count:1,
    basis:'R43_MODEL_PLAN_HOLD',
    objectiveFinalVoxelEvidence:false,
    instructions:'Redesign entrance and spatialPlan so positions and required clearances can be independently tested against final voxels; do not claim reachability.'});
 }
 const network=r64Evidence===null?null:
  bridgeR65IndependentSpatialEvidence({raw,expectedRawSha256,
   expectedGeometrySha256,r64Evidence});
 if(network)issues.push(...network.issues);
 let overheadAudit=null;
 if(r66Evidence!==null){
  overheadAudit=assessR66OverheadSpace({raw,expectedRawSha256,
   expectedGeometrySha256});
  if(r66Evidence.schema!==R66_SCHEMA||
   r66Evidence.originalRawSha256!==expectedRawSha256||
   r66Evidence.geometrySha256!==expectedGeometrySha256||
   r66Evidence.originalSpatialPlanRead!==false||
   JSON.stringify(r66Evidence.metrics)!==JSON.stringify(overheadAudit.metrics)||
   JSON.stringify(r66Evidence.possibleConcerns)!==
    JSON.stringify(overheadAudit.possibleConcerns))
   fail('R66_OVERHEAD_EVIDENCE_RECOMPUTE_MISMATCH');
  const nextNotes={
   NO_STANDING_POSITION_HAS_ANY_OVERHEAD_SOLID:
    'The whole structure might be a deliberately open-air public space, but check whether the actual program asks for sheltered, genuinely usable rooms. Keep intentional atria and terraces; do not cover everything mechanically.',
   MOST_SUPPORTED_POSITIONS_OPEN_ABOVE:
    'Most conceptual floor positions have no overhead solid. Study the spatial balance between indoor uses, open terraces and public courtyards without forcing a roof over every meaningful void.',
   NO_COVERED_2X2_STANDING_PAD:
    'Reconsider whether enclosed-use spaces have genuinely usable clear width, while preserving slender canopies and dramatic openings where architecturally intentional.'
  };
  for(const finding of overheadAudit.possibleConcerns){
   if(!Object.hasOwn(nextNotes,finding.kind))
    fail('R66_UNKNOWN_OVERHEAD_CONCERN');
   issues.push({kind:finding.kind,count:1,
    basis:'R66_FINAL_VOXEL_OVERHEAD_COLUMN_PROXY_ONLY',
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    instructions:nextNotes[finding.kind]});
  }
 }
 let spatialContainment=null;
 if(r67Evidence!==null){
  spatialContainment=assessR67SpatialContainment({raw,
   expectedRawSha256,expectedGeometrySha256});
  if(r67Evidence.schema!==R67_SCHEMA||
   r67Evidence.originalRawSha256!==expectedRawSha256||
   r67Evidence.geometrySha256!==expectedGeometrySha256||
   r67Evidence.sourceSpatialPlanIgnored!==true||
   JSON.stringify(r67Evidence.metrics)!==
    JSON.stringify(spatialContainment.metrics)||
   JSON.stringify(r67Evidence.possibleConcerns)!==
    JSON.stringify(spatialContainment.possibleConcerns))
   fail('R67_SPATIAL_EVIDENCE_RECOMPUTE_MISMATCH');
  if(overheadAudit!==null&&
   spatialContainment.metrics.positionsWithOverheadVoxel!==
    overheadAudit.metrics.positionsWithAnyOverheadSolid)
   fail('R67_R66_ROOF_COUNT_CONTRADICTION');
  if(network!==null&&
   spatialContainment.metrics.supportedTwoHighStandingPositions!==
    r64Evidence.metrics.supportedTwoHighStandingPositions)
   fail('R67_R64_STANDING_COUNT_CONTRADICTION');
  const nextNotes={
   ROOFED_FLOORS_WITHOUT_3_NEARBY_SIDE_DIRECTIONS:
    'Roofs and standing floors exist, yet none of the roofed positions has solids nearby in three cardinal directions. Review whether library rooms and galleries are actually framed by substantial architecture rather than only broad canopies; preserve intentionally open and monumental volumes.',
   MOST_ROOFED_POSITIONS_LACK_3_NEARBY_SIDE_DIRECTIONS:
    'Check whether roofed public floors connect to properly considered enclosed or partially enclosed program areas. Avoid reducing a grand hall merely to satisfy a 24-cell proximity radius.',
   NO_ROOFED_3_DIRECTION_2X2_ROOM_PROXY:
    'Inspect adequate floor breadth, outer enclosure and internal room usability together. Walls, columns and furniture can create misleading proximity; do not blindly add box walls or block required atria.'
  };
  for(const finding of spatialContainment.possibleConcerns){
   if(!Object.hasOwn(nextNotes,finding.kind))
    fail('R67_UNKNOWN_SPATIAL_CONCERN');
   issues.push({kind:finding.kind,count:1,
    basis:'R67_FINAL_VOXEL_ROOF_AND_SIDE_SOLID_PROXY',
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    instructions:nextNotes[finding.kind]});
  }
 }
 let horizontalAir=null;
 if(r68Evidence!==null){
  horizontalAir=inspectR68AirContinuity({raw,expectedRawSha256,
   expectedGeometrySha256});
  if(r68Evidence.schema!==R68_SCHEMA||
   r68Evidence.originalRawSha256!==expectedRawSha256||
   r68Evidence.geometrySha256!==expectedGeometrySha256||
   r68Evidence.originalSpatialPlanRead!==false||
   JSON.stringify(r68Evidence.metrics)!==
    JSON.stringify(horizontalAir.metrics)||
   JSON.stringify(r68Evidence.possibleConcerns)!==
    JSON.stringify(horizontalAir.possibleConcerns))
   fail('R68_AIR_TOPOLOGY_EVIDENCE_RECOMPUTE_MISMATCH');
  if(network!==null&&
   horizontalAir.metrics.supportedTwoHighStandingPositions!==
    r64Evidence.metrics.supportedTwoHighStandingPositions)
   fail('R68_R64_SUPPORTED_FLOOR_COUNT_MISMATCH');
  if(overheadAudit!==null&&
   horizontalAir.metrics.positionsWithAnyOverheadVoxel!==
    overheadAudit.metrics.positionsWithAnyOverheadSolid)
   fail('R68_R66_OVERHEAD_COUNT_MISMATCH');
  if(spatialContainment!==null&&
   horizontalAir.metrics.positionsWithAnyOverheadVoxel!==
    spatialContainment.metrics.positionsWithOverheadVoxel)
   fail('R68_R67_OVERHEAD_COUNT_MISMATCH');
  const nextNotes={
   LATERALLY_SEALED_AIR_POCKETS_NEED_ACCESS_REVIEW:
    'The entire two-cell-high air pocket has no same-floor exit to the design boundary. Verify real supported entrances, doors or meaningful vertical transitions. Do not fill magnificent atria simply to close a heuristic gap; a closed pocket is not proof of accessible function.',
   ROOFED_SPACES_WITH_LATERAL_OPENINGS_NEED_ROOM_REVIEW:
    'Covered air reaches the design boundary along same-level two-high space. A door can make a good room boundary-connected. Review room enclosure, openings and the intended relationship between interior, courtyard and exterior rather than automatically adding walls.',
   NO_CONNECTED_2X2_ROOFED_SUPPORT_PATCH:
    'No fully roofed supported 2x2 region appears within a connected two-high-air patch. Verify room floor area and turning zones, but do not replace the architectural idea with arbitrary square boxes.'
  };
  for(const finding of horizontalAir.possibleConcerns){
   if(!Object.hasOwn(nextNotes,finding.kind))
    fail('R68_UNKNOWN_HORIZONTAL_AIR_FINDING');
   issues.push({kind:finding.kind,count:1,
    basis:'R68_ALL_TWO_HIGH_AIR_COMPONENTS_NOT_MODEL_DECLARED',
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    instructions:nextNotes[finding.kind]});
  }
 }
 let verticalGraph=null;
 if(r69Evidence!==null){
  verticalGraph=analyzeR69VerticalAirAndMotion({
   raw,expectedRawSha256,expectedGeometrySha256});
  if(r69Evidence.schema!==R69_SCHEMA||
   r69Evidence.originalRawSha256!==expectedRawSha256||
   r69Evidence.geometrySha256!==expectedGeometrySha256||
   r69Evidence.modelSpatialPlanIgnored!==true||
   JSON.stringify(r69Evidence.metrics)!==
    JSON.stringify(verticalGraph.metrics)||
   JSON.stringify(r69Evidence.possibleConcerns)!==
    JSON.stringify(verticalGraph.possibleConcerns))
   fail('R69_VERTICAL_GRAPH_RECOMPUTE_MISMATCH');
  if(network!==null&&(
   verticalGraph.metrics.supportedTwoHighStandingPositions!==
    r64Evidence.metrics.supportedTwoHighStandingPositions||
   verticalGraph.metrics.abstractSupportedMotionComponentCount!==
    r64Evidence.metrics.conceptualMotionComponents))
   fail('R69_R64_SUPPORTED_ROUTE_COUNT_MISMATCH');
  if(horizontalAir!==null&&
   verticalGraph.metrics.supportedTwoHighStandingPositions!==
    horizontalAir.metrics.supportedTwoHighStandingPositions)
   fail('R69_R68_TOTAL_SUPPORTED_COUNT_MISMATCH');
  const instructions={
   VERTICAL_AIR_CONNECTED_BUT_SUPPORTED_TRAVEL_DISCONNECTED:
    'A shared 3D atrium or air shaft does not create a usable staircase or public transfer between levels. Preserve the dramatic air volume and architectural scale while inspecting genuine supported landing-to-landing circulation. Intentionally separate wings need not be forcibly connected.',
   VERTICAL_AIR_PRESENT_WITHOUT_INTERLEVEL_SUPPORTED_MOTION:
    'The abstract final solids create multiheight air with zero supported interlevel motion edges. Review upper destinations and conceptual stairs/ramps; do not infer Minecraft stair-block collision or automatically fill the void.'
  };
  for(const finding of verticalGraph.possibleConcerns){
   if(!Object.hasOwn(instructions,finding.kind))
    fail('R69_UNKNOWN_VERTICAL_GRAPH_CONCERN');
   issues.push({kind:finding.kind,count:1,
    basis:'R69_FINAL_VOXEL_3D_AIR_VS_SUPPORTED_STEP_GRAPH',
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    measured:finding.measured,
    instructions:instructions[finding.kind]});
  }
 }
 let provisionalAccess=null;
 if(r70Evidence!==null){
  provisionalAccess=assessR70ProvisionalEntranceRoutes({
   raw,expectedRawSha256,expectedGeometrySha256});
  if(r70Evidence.schema!==R70_SCHEMA||
   r70Evidence.originalRawSha256!==expectedRawSha256||
   r70Evidence.geometrySha256!==expectedGeometrySha256||
   r70Evidence.sourceSpatialPlanAndModelEntranceIgnored!==true||
   JSON.stringify(r70Evidence.metrics)!==
    JSON.stringify(provisionalAccess.metrics)||
   JSON.stringify(r70Evidence.possibleConcerns)!==
    JSON.stringify(provisionalAccess.possibleConcerns))
   fail('R70_PROVISIONAL_APPROACH_RECOMPUTE_MISMATCH');
  if(network!==null&&
   provisionalAccess.metrics.supportedTwoHighStandingPositions!==
    r64Evidence.metrics.supportedTwoHighStandingPositions)
   fail('R70_R64_SUPPORTED_POSITION_MISMATCH');
  if(verticalGraph!==null&&
   provisionalAccess.metrics.supportedTwoHighStandingPositions!==
    verticalGraph.metrics.supportedTwoHighStandingPositions)
   fail('R70_R69_SUPPORTED_POSITION_MISMATCH');
  const guidance={
   NO_LOW_LEVEL_EXTERIOR_AIR_RAY_SEEDS:
    'No low-level supported point has a straight two-high air ray to the local design boundary. This does NOT prove there is no real entrance. Human review must identify street approach, door openings and credible access rather than equating source coordinate edges with outside terrain.',
   NO_SUPPORTED_STANDING_AIR_ANYWHERE:
    'No candidate supported two-high standing position exists in final source voxels. Revisit meaningful occupiable floors and interior air while retaining the architectural intent, without asserting Minecraft physical usability.',
   LOW_LEVEL_CANDIDATES_DO_NOT_REACH_ANY_UPPER_SUPPORT:
    'In the abstract supported-motion graph none of the high floors can be reached from low-level, boundary-visible air candidates. Check upper public rooms, stairs and continuous landings in human review; preserve the architectural skyline and grand atrium.',
   SOME_UPPER_SUPPORT_DISCONNECTED_FROM_APPROACH_CANDIDATES:
    'Some upper supported positions are disconnected from provisional exterior-air low-floor candidates. Inspect independent pavilions, intentional terraces and paths; do not enforce one fixed staircase style or silently eliminate separated buildings.'
  };
  for(const finding of provisionalAccess.possibleConcerns){
   if(!Object.hasOwn(guidance,finding.kind))
    fail('R70_UNKNOWN_APPROACH_CONCERN');
   issues.push({kind:finding.kind,count:1,
    basis:'R70_FINAL_VOXEL_LOW_LEVEL_GRID_EDGE_AIR_PROXY',
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    measured:finding.measured??null,
    instructions:guidance[finding.kind]});
  }
 }
 let gapTriage=null;
 if(r71Evidence!==null){
  if(r70Evidence===null)
   fail('R71_REQUIRES_ORIGINAL_R70_REVIEW_EVIDENCE');
  gapTriage=inspectR71AbstractRouteGaps({raw,expectedRawSha256,
   expectedGeometrySha256,r70Evidence});
  if(r71Evidence.schema!==R71_SCHEMA||
   r71Evidence.originalRawSha256!==expectedRawSha256||
   r71Evidence.geometrySha256!==expectedGeometrySha256||
   r71Evidence.r70EvidenceRecomputedAndAuthenticated!==true||
   r71Evidence.status!==gapTriage.status||
   JSON.stringify(r71Evidence.metrics)!==
    JSON.stringify(gapTriage.metrics)||
   JSON.stringify(r71Evidence.possibleConcerns)!==
    JSON.stringify(gapTriage.possibleConcerns))
   fail('R71_GAP_EVIDENCE_RECOMPUTE_MISMATCH');
  if(provisionalAccess!==null&&
   gapTriage.metrics.originalR70ProvisionalApproachSeeds!==
    provisionalAccess.metrics.lowLevelClearAirRayApproachCandidates)
   fail('R71_R70_SEED_COUNT_MISMATCH');
  const guidance={
   R71_NO_APPROACH_NO_GAP_PAIR_INFERENCE:
    'No provisional entrance was inferred: the system must not invent coordinates of a break or claim the building has no real door. Examine the intended street access, ground level and original architecture before proposing changes.',
   R71_DISCONNECTED_SUPPORT_GAPS_TO_INSPECT:
    'Review the leading disconnected upper-floor components and their nearby supported voxel pairs in the 3D viewer. Manhattan distance passes through floors, walls and air; it is NOT a buildable path or a missing-stair diagnosis. Confirm which intended rooms need public access, then design genuine landings and circulation without flattening atria, shrinking roofs, or eliminating independent wings.'
  };
  for(const finding of gapTriage.possibleConcerns){
   if(!Object.hasOwn(guidance,finding.kind))
    fail('R71_UNKNOWN_GAP_CONCERN');
   issues.push({kind:finding.kind,count:1,
    basis:'R71_AUTHENTICATED_R70_ABSTRACT_SUPPORTED_COMPONENT_TRIAGE',
    measured:finding.measured??null,
    exampleDisconnectedComponents:
     gapTriage.metrics.topUnreachableComponents.slice(0,3),
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    instructions:guidance[finding.kind]});
  }
 }
 let preservationReview=null;
 if(r72Evidence!==null){
  if(r70Evidence===null||r71Evidence===null)
   fail('R72_REQUIRES_AUTHENTICATED_R70_AND_R71');
  preservationReview=assessR72MassVoidGapContext({
   raw,expectedRawSha256,expectedGeometrySha256,
   r70Evidence,r71Evidence,r72Evidence,r73Evidence,r74Evidence});
  if(r72Evidence.schema!==R72_SCHEMA||
   r72Evidence.originalRawSha256!==expectedRawSha256||
   r72Evidence.geometrySha256!==expectedGeometrySha256||
   r72Evidence.r71RecomputedAndAuthenticated!==true||
   r72Evidence.status!==preservationReview.status||
   JSON.stringify(r72Evidence.metrics)!==
    JSON.stringify(preservationReview.metrics)||
   JSON.stringify(r72Evidence.possibleConcerns)!==
    JSON.stringify(preservationReview.possibleConcerns))
   fail('R72_SOURCE_DERIVED_PRESERVATION_REVIEW_MISMATCH');
  const guidance={
   ORIGINAL_APPROACH_UNCERTAIN_SKIP_ROUTE_OVERLAY:
    'The R71 approach seed is unresolved. Do not invent nearest pairs or corridors. Locate the intended entrance and consult the actual original architecture before proposing any structural change.',
   NEAREST_PAIR_BOXES_NOT_SAFE_PATHS:
    'R72 identifies existing FINAL voxel mass, air and long open vertical columns inside the smallest geometry-only box between R71 nearest supported points. Use its accurate plan/section drawings to preserve the intended giant atrium, roof composition and program; a box is not a missing bridge or recommended tunnel.'
  };
  for(const finding of preservationReview.possibleConcerns){
   if(!Object.hasOwn(guidance,finding.kind))
    fail('R72_UNKNOWN_PRESERVATION_CONCERN');
   issues.push({kind:finding.kind,count:1,
    basis:'R72_AUTHENTICATED_FINAL_VOXEL_MASS_VOID_SECTION_REVIEW',
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    measured:finding.measured??null,
    reviewSites:preservationReview.metrics.sites.slice(0,3).map(x=>({
     componentRank:x.componentRank,boxMinInclusive:x.boxMinInclusive,
     boxMaxInclusive:x.boxMaxInclusive,
     boxSolidVoxelCount:x.boxSolidVoxelCount,
     boxAirVoxelCount:x.boxAirVoxelCount,
     localColumnsWithAtLeast4ContinuousAirCells:
      x.localColumnsWithAtLeast4ContinuousAirCells,
     isThisAConstructibleCorridor:false})),
    instructions:guidance[finding.kind]});
  }
 }
 let alternativeReview=null;
 if(r73Evidence!==null){
  if(r70Evidence===null||r71Evidence===null||r72Evidence===null)
   fail('R73_REQUIRES_AUTHENTICATED_R70_R71_R72');
  alternativeReview=compareR73CirculationConcepts({
   raw,expectedRawSha256,expectedGeometrySha256,
   r70Evidence,r71Evidence,r72Evidence});
  if(r73Evidence.schema!==R73_SCHEMA||
   r73Evidence.originalRawSha256!==expectedRawSha256||
   r73Evidence.geometrySha256!==expectedGeometrySha256||
   r73Evidence.r72RecomputedAndAuthenticated!==true||
   r73Evidence.status!==alternativeReview.status||
   JSON.stringify(r73Evidence.sites)!==
    JSON.stringify(alternativeReview.sites)||
   JSON.stringify(r73Evidence.comparisonDimensions)!==
    JSON.stringify(alternativeReview.comparisonDimensions))
   fail('R73_HUMAN_OPTIONS_EVIDENCE_RECOMPUTE_MISMATCH');
  if(r73Evidence.sites.length>0)
   issues.push({kind:'R73_COMPARE_UNRANKED_HUMAN_DIRECTIONS',
    count:r73Evidence.sites.length,
    basis:'R73_R72_VOXEL_PRESERVATION_CONCEPT_REVIEW_ONLY',
    objectiveFinalVoxelEvidence:true,
    independentHumanReviewRequired:true,automaticReject:false,
    alternatives:r73Evidence.sites.slice(0,3).map(site=>({
     componentRank:site.componentRank,
     availableConceptIds:site.families.map(f=>f.conceptId),
     applicabilityNotYetProven:true,selectedOption:null})),
    instructions:'Do not automatically bridge nearest supported cells. Compare meaningful landing-led circulation, perimeter/side-wing detours, and preserving intentional independent wings against original user requirements, source-exact mass/void sections, real constructibility and visual quality. No preferred route or build instructions exist.'});
 }
 let blankHumanWorksheet=null;
 if(r74Evidence!==null){
  if(r70Evidence===null||r71Evidence===null||
   r72Evidence===null||r73Evidence===null)
   fail('R74_REQUIRES_AUTHENTICATED_R70_TO_R73');
  blankHumanWorksheet=makeR74HumanWorksheet({
   raw,expectedRawSha256,expectedGeometrySha256,
   r70Evidence,r71Evidence,r72Evidence,r73Evidence,r74Evidence});
  if(r74Evidence.schema!==R74_SCHEMA||
   r74Evidence.originalRawSha256!==expectedRawSha256||
   r74Evidence.finalConceptualGeometrySha256!==expectedGeometrySha256||
   r74Evidence.formStatus!=='UNFILLED_HUMAN_WORKSHEET'||
   r74Evidence.qualityCertification!=='NOT_PERFORMED'||
   r74Evidence.independentHumanAssessment!=='NOT_REVIEWED'||
   JSON.stringify(r74Evidence.assessments)!==
    JSON.stringify(blankHumanWorksheet.assessments)||
   JSON.stringify(r74Evidence.axes)!==
    JSON.stringify(blankHumanWorksheet.axes))
   fail('R74_UNFILLED_HUMAN_WORKSHEET_TAMPERED');
 }
 const human=c01.criteria.map(x=>({id:x.id,requirement:x.description,
  assessment:'NOT_REVIEWED',
  fulfilledByAnySourceMetric:false,
  inspectUsingHumanReviewOfGeometryAndUse:true}));
 // Do not let a malformed source or easily passed self-declared model plan
 // silently turn all independent program/beauty needs into PASS.
 const instructions=[
  'FUTURE CANDIDATE ONLY. Do not execute a model call automatically.',
  'Reinvent or carefully revise one cohesive architectural concept, with the exterior silhouette, interior public spaces, usable circulation and specific Japanese program all arising from the SAME design idea. Avoid template plans and fixed shape quotas.',
  'Priority 1: preserve the intended function and a striking inhabitable architecture. A solid region with a label is NOT a room. Protect genuine air volume, support floors and connect levels.',
  ...issues.map((v,i)=>'Evidence issue '+(i+1)+' ['+v.kind+']'+
   (v.id?' (declared id='+v.id+')':'')+': '+v.instructions),
  'Independent human criteria (NOT YET SCORED): '+
   human.map(x=>x.requirement).join(' / '),
  'Return one complete source-only B143 design + spatialPlan as four-key JSON; ensure all ADD/CUT and declared positions describe the same FINAL abstract geometry. Do not claim quality PASS, Minecraft construction or a successful model run.',
  'Original frozen Japanese brief: '+c01.prompt
 ].join('\n');
 return {schema:SCHEMA,status:'FUTURE_REVISION_CANDIDATE_NOT_ACTIVATED',
  caseId:'c01',originalRawSha256:expectedRawSha256,
  frozenPromptSha256:sha(c01.prompt),r49Status:global.status,
  b143Status,r61Status:r61Evidence?.r43Status??null,
  finalConceptualGeometrySha256:compiled?expectedGeometrySha256:null,
  evidenceIssues:issues,independentHumanCriteria:human,
  r65NetworkAuditStatus:network?.status??'NOT_INCLUDED',
  r65NetworkEvidenceSha256:network?.r64NetworkFactsSha256??null,
  modelIndependentNetworkEvidenceUsed:network!==null,
  networkDefectsNeedHumanReview:network?.humanDecisionBeforeRepairRequired??null,
  r66OverheadAuditStatus:overheadAudit?.status??'NOT_INCLUDED',
  r66OverheadSourceIndependentUsed:overheadAudit!==null,
  r66CoveredStandingPositions:overheadAudit?.metrics.positionsWithAnyOverheadSolid??null,
  r67ContainmentReviewStatus:spatialContainment?.status??'NOT_INCLUDED',
  r67SourceIndependentUsed:spatialContainment!==null,
  r67RoomLikeProxyPositions:spatialContainment?.metrics.roofedPositionsWith3PlusSideDirectionsWithin24??null,
  r68HorizontalAirStatus:horizontalAir?.status??'NOT_INCLUDED',
  r68AirTopologyIndependentUsed:horizontalAir!==null,
  r68BoundaryConnectedCoveredPositions:horizontalAir?.metrics.roofedStandingInLaterallyBoundaryConnectedAir??null,
  r68SealedCoveredPositions:horizontalAir?.metrics.roofedStandingInLaterallySealedAirPockets??null,
  r69VerticalGraphStatus:verticalGraph?.status??'NOT_INCLUDED',
  r69IndependentVerticalGraphUsed:verticalGraph!==null,
  r69SupportedInterlevelEdges:verticalGraph?.metrics.abstractSupportedMotionInterlevelEdges??null,
  r69AirConnectedButTravelSeparatedRegions:verticalGraph?.metrics.largeAirConnectedButSupportedMotionSeparatedRegions??null,
  r70ProvisionalRouteStatus:provisionalAccess?.status??'NOT_INCLUDED',
  r70IndependentApproachUsed:provisionalAccess!==null,
  r70LowLevelApproachCandidates:provisionalAccess?.metrics.lowLevelClearAirRayApproachCandidates??null,
  r70ReachedHigherSupportPositions:provisionalAccess?.metrics.provisionallyReachedUpperPositions??null,
  r71RouteGapTriageStatus:gapTriage?.status??'NOT_INCLUDED',
  r71SourceVerifiedRouteGapUsed:gapTriage!==null,
  r71DisconnectedComponentCount:gapTriage?.metrics.unreachableSupportedMotionComponents??null,
  r71HumanReviewCoordinatesOnly:gapTriage!==null,
  r72PreservationReviewStatus:preservationReview?.status??'NOT_INCLUDED',
  r72MassAndVoidSectionReviewUsed:preservationReview!==null,
  r72ReviewedDisconnectedComponents:preservationReview?.metrics.reviewedTopDisconnectedComponents??null,
  r73ConceptComparisonStatus:alternativeReview?.status??'NOT_INCLUDED',
  r73HumanAlternativesReviewUsed:alternativeReview!==null,
  r73HumanComparisonSiteCount:alternativeReview?.siteCount??null,
  r74HumanWorksheetGenerated:blankHumanWorksheet!==null,
  r74HumanWorksheetSiteCount:blankHumanWorksheet?.assessments.length??null,
  r74IndependentReviewStatus:'NOT_REVIEWED',
  proposedOnePassGuidance:instructions,
  generatedGeometry:false,priorModelOriginalRepaired:false,
  realModelImprovementDemonstrated:false,
  approvedForInference:false,freshConsentRequired:true,
  modelCallCount:0,minecraftContactCount:0,
  worldWrites:0,safety:safe()};
}
export function writeR62FutureDesignGuidance({
 raw,expectedRawSha256,b143Status,r61Evidence=null,
 expectedGeometrySha256=null,r64Evidence=null,r66Evidence=null,
 r67Evidence=null,r68Evidence=null,r69Evidence=null,
 r70Evidence=null,r71Evidence=null,r72Evidence=null,
 r73Evidence=null,r74Evidence=null,destination
}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  !fs.existsSync(destination)||!fs.lstatSync(destination).isDirectory()||
  fs.lstatSync(destination).isSymbolicLink())fail('ORDINARY_EVIDENCE_DIR_REQUIRED');
 const jsonPath=path.join(destination,'R62_NEXT_DESIGN_EVIDENCE.json');
 const htmlPath=path.join(destination,'R62_NEXT_DESIGN_REVIEW.html');
 const textPath=path.join(destination,'R62_FUTURE_ONLY_UNEXECUTED_GUIDANCE.txt');
 if([jsonPath,htmlPath,textPath].some(p=>fs.existsSync(p)))
  fail('NEVER_OVERWRITE_DERIVED_REVIEW');
 const report=prepareR62FutureDesignGuidance({
  raw,expectedRawSha256,b143Status,r61Evidence,expectedGeometrySha256,
  r64Evidence,r66Evidence,r67Evidence,r68Evidence,r69Evidence,
  r70Evidence,r71Evidence,r72Evidence,r73Evidence});
 const lines=report.evidenceIssues.map(x=>
  '<li><b>'+esc(x.kind)+'</b> ['+esc(x.basis)+']：'+
  esc(x.instructions)+'</li>').join('');
 const criteria=report.independentHumanCriteria.map(x=>
  '<li>'+esc(x.requirement)+'（未審査）</li>').join('');
 const html='<!doctype html><html lang="ja"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
  '<title>R62 次の建築設計へ戻す根拠</title>'+
  '<style>body{font:15px/1.7 system-ui;max-width:970px;margin:32px auto;padding:0 19px;color:#26394a}li{margin:12px 0}.warn{background:#fff4d9;padding:13px;border-left:4px solid #bb8435}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef3f7;padding:14px}</style>'+
  '</head><body><h1>建築の実証結果から次の設計へ</h1>'+
  '<p class="warn">これは未実行の次回設計候補です。モデル呼び出し・原本修復はしていません。人間の独立品質審査と施工承認は別途必須です。</p>'+
  '<h2>実際に検出された問題と修正の方向</h2><ol>'+
  (lines||'<li>自動検査で検出した問題なし。ただし建築品質の合格ではありません。</li>')+
  '</ol><h2>モデルの宣言では合格にできない日本語要求</h2><ol>'+
  criteria+'</ol><h2>将来の1回設計用の指示候補（未実行）</h2><pre>'+
  esc(report.proposedOnePassGuidance)+'</pre>'+
  '<p>原本SHA '+esc(report.originalRawSha256)+'</p>'+
  '<p>NOT_PREPARED / 9 BLOCKED / 推論0 / Minecraft操作0</p></body></html>';
 fs.writeFileSync(jsonPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(htmlPath,html,{flag:'wx'});
 fs.writeFileSync(textPath,report.proposedOnePassGuidance+'\n',{flag:'wx'});
 return {status:report.status,issues:report.evidenceIssues.length,
  relativeFile:path.basename(htmlPath),modelCalls:0,worldWrites:0};
}
