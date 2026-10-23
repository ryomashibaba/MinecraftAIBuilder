/**
 * R60: preserve R59 original-chain evidence and supply honest offline
 * human visual review. B143 PASS -> R7 final abstract 3D.
 * B143 HOLD -> R51 uncompiled envelope diagram, never fake final voxels.
 * No model requests, world access, retries, repair or quality approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileDesign,verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {writeR7OfflineVisualReview} from './b198zr7-offline-visual-review.mjs';
import {writeR51EnvelopeStoryboard} from './b198zr51-uncompiled-envelope-storyboard.mjs';
import {writeR61FinalVoxelSections} from './b198zr61-final-voxel-section-review.mjs';
import {writeR62FutureDesignGuidance} from './b198zr62-evidence-backed-revision-guidance.mjs';
import {writeR63ArchitecturalContinuity} from './b198zr63-architectural-continuity-watch.mjs';
import {writeR64UnclaimedFloorConnectivity} from './b198zr64-unclaimed-floor-connectivity.mjs';
import {writeR66OverheadSpace} from './b198zr66-overhead-space-audit.mjs';
import {writeR67SpatialContainment} from './b198zr67-spatial-containment-audit.mjs';
import {writeR68AirContinuity} from './b198zr68-horizontal-air-continuity.mjs';
import {writeR69VerticalAirAndMotion} from './b198zr69-vertical-air-vs-motion.mjs';
import {writeR70ProvisionalEntranceRoutes} from './b198zr70-exterior-approach-route-review.mjs';
import {writeR71AbstractRouteGaps} from './b198zr71-abstract-route-gap-triage.mjs';
import {writeR72MassVoidGapContext} from './b198zr72-mass-void-gap-context.mjs';
import {writeR73CirculationComparison} from './b198zr73-preserve-concept-circulation-comparison.mjs';
import {writeR74HumanWorksheet} from './b198zr74-human-option-review-worksheet.mjs';
import {writeR75IntakeInstructions} from './b198zr75-human-review-handoff.mjs';
import {writeR76ReviewPriorities} from './b198zr76-architecture-next-decisions.mjs';
import {writeR77FutureArchitecturalBrief} from './b198zr77-cohesive-architecture-revision-brief.mjs';
import {writeR78SpatialProgramSpec} from './b198zr78-spatial-program-design-spec.mjs';
import {writeR79ParametricStudy} from './b198zr79-parametric-library-massing.mjs';
import {writeR80ResearchGeometry} from './b198zr80-supported-route-concept-study.mjs';
import {writeR81ArchitectureReview} from './b198zr81-envelope-portal-connection-review.mjs';
import {writeR82GeometryAudit} from './b198zr82-mesh-clearance-and-terrace-audit.mjs';
import {writeR83ArchitecturalLandingReview} from './b198zr83-wing-terrace-landing-prototypes.mjs';
import {writeR84MultilevelReview} from './b198zr84-multilevel-bookstack-review.mjs';
import {writeR85RouteReview} from './b198zr85-wing-route-alternatives.mjs';
import {writeR86DeckReview} from './b198zr86-finite-width-deck-study.mjs';
import {writeR87InteriorReview} from './b198zr87-seven-room-architecture.mjs';
import {writeR88GalleryReview} from './b198zr88-gallery-circulation-study.mjs';
import {writeR89AccessReview} from './b198zr89-gallery-interface-architecture.mjs';
import {writeR90SeamReview} from './b198zr90-source-surface-seams.mjs';
import {writeR91TurnoutReview} from './b198zr91-tapered-gallery-turnout.mjs';
import {writeR92WholeLibraryReview} from './b198zr92-whole-library-circulation-atlas.mjs';
import {writeR93ReadingGalleryReview} from './b198zr93-contiguous-reading-arcades.mjs';
import {writeR94DoorwayReview} from './b198zr94-seven-room-entry-redesign.mjs';
import {writeR95DaylightReview} from './b198zr95-atrium-daylight-portals.mjs';
import {writeR96WindowReview} from './b198zr96-window-structure-and-light-study.mjs';
import {inspectR59Archive,reviewR59AlreadySavedZip}
 from './b198zr59-safe-result-zip-to-review.mjs';
export const SCHEMA='minecraftaibuilder-b198zr60-visual-human-review-v1';
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Error('B198ZR60_'+s)};
const safety=()=>({readiness:'NOT_PREPARED',constructionApproved:false,
 executionAllowed:false,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]},modelCalls:0,worldContacts:0,worldWrites:0});
function visual(z,evidence,stage){
 const bytes=z.selectedFiles.find(f=>f.name===
  z.tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt')?.bytes;
 if(!bytes||hash(bytes)!==evidence?.rawSha256)
  fail('R59_REPORT_RAW_SHA_MISMATCH');
 const raw=bytes.toString('utf8');
 if(!Buffer.from(raw,'utf8').equals(bytes))fail('NON_UTF8_ORIGINAL');
 let compiled=null,design=null;
 try{
  design=JSON.parse(raw).design;
  compiled=compileDesign(design);
  if(!verifyCompiled(design,compiled))compiled=null;
 }catch{compiled=null}
 if(Boolean(compiled)!==(evidence.b143.status===
  'B143_FINAL_VOXELS_COMPILED_NOT_SPATIAL_OR_HUMAN_PASS'))
  fail('R58_B143_VERDICT_DISAGREES');
 const dirname=z.tag+(compiled?'_R7_FINAL_ABSTRACT_3D':'_R51_UNCOMPILED_ENVELOPES');
 const folder=path.join(stage,dirname);
 let kind,link,board=null,sections=null,guidance=null,independentFloor=null,overheadReview=null,containmentReview=null,airTopologyReview=null,verticalReview=null,approachReview=null,routeGapReview=null,preservationReview=null,alternativesReview=null,humanWorksheetReview=null,humanDraftGuide=null,priorityBoard=null,architectureBrief=null,spatialProgramSpec=null,parametricStudy=null,publicCirculationStudy=null,portalReviewStudy=null,interiorClearanceReview=null,readingTerraceLandingStudy=null,multilevelReadingStudy=null,wingRouteStudy=null,finiteWidthDeckStudy=null,readingRooms87=null,researchGalleries88=null,architectureInterface89=null,sourceSeams90=null,taperedTurnout91=null,wholeLibrary92=null,readingArcades93=null,readingDoors94=null,daylightR95=null,architecturalWindows96=null;
 if(compiled){
  fs.mkdirSync(folder);
  const r=writeR7OfflineVisualReview({
   design,compiled,destination:folder,caseId:'c01'});
  if(r.sourceSha256!==compiled.sourceSha256||
   r.geometrySha256!==compiled.geometrySha256)fail('R7_SHA_MISMATCH');
  const sectionReport=writeR61FinalVoxelSections({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  sections=dirname+'/'+sectionReport.relativeFile;
  const floor=writeR64UnclaimedFloorConnectivity({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  independentFloor=dirname+'/'+floor.relativeFile;
  const overhead=writeR66OverheadSpace({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  overheadReview=dirname+'/'+overhead.relativeFile;
  const containment=writeR67SpatialContainment({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  containmentReview=dirname+'/'+containment.relativeFile;
  const air=writeR68AirContinuity({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  airTopologyReview=dirname+'/'+air.relativeFile;
  const vertical=writeR69VerticalAirAndMotion({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  verticalReview=dirname+'/'+vertical.relativeFile;
  const approach=writeR70ProvisionalEntranceRoutes({raw,
   expectedRawSha256:evidence.rawSha256,
   expectedGeometrySha256:compiled.geometrySha256,destination:folder});
  approachReview=dirname+'/'+approach.relativeFile;
  kind='STRICT_B143_FINAL_ABSTRACT_VOXELS';
  link=dirname+'/index.html';
  board=dirname+'/B198W_REVIEW_BOARD.html';
 }else{
  const r=writeR51EnvelopeStoryboard({raw,destination:folder,caseId:'c01'});
  if(r.originalRawSha256!==evidence.rawSha256)fail('R51_SHA_MISMATCH');
  kind='UNCOMPILED_SHAPE_ENVELOPES_ONLY';
  link=dirname+'/R51_UNCOMPILED_SPATIAL_STORYBOARD.html';
 }
 const r61=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R61_FINAL_VOXEL_SPATIAL_EVIDENCE.json'),'utf8')):null;
 const r64=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R64_INDEPENDENT_FLOOR_NETWORK.json'),'utf8')):null;
 const r66=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R66_OVERHEAD_SPACE_EVIDENCE.json'),'utf8')):null;
 const r67=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R67_SURROUNDING_SPACE_EVIDENCE.json'),'utf8')):null;
 const r68=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R68_HORIZONTAL_AIR_TOPOLOGY.json'),'utf8')):null;
 const r69=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R69_VERTICAL_AIR_VS_MOTION.json'),'utf8')):null;
 const r70=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R70_APPROACH_ROUTE_EVIDENCE.json'),'utf8')):null;
 const r71=compiled?writeR71AbstractRouteGaps({raw,
  expectedRawSha256:evidence.rawSha256,
  expectedGeometrySha256:compiled.geometrySha256,
  r70Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R70_APPROACH_ROUTE_EVIDENCE.json'),'utf8')),
  destination:folder}):null;
 routeGapReview=r71?dirname+'/'+r71.relativeFile:null;
 const r71Evidence=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R71_ROUTE_GAPS_EVIDENCE.json'),'utf8')):null;
 const r72=compiled?writeR72MassVoidGapContext({raw,
  expectedRawSha256:evidence.rawSha256,
  expectedGeometrySha256:compiled.geometrySha256,
  r70Evidence:r70,r71Evidence,destination:folder}):null;
 preservationReview=r72?dirname+'/'+r72.relativeFile:null;
 const r72Evidence=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R72_MASS_VOID_GAP_CONTEXT.json'),'utf8')):null;
 const r73=compiled?writeR73CirculationComparison({raw,
  expectedRawSha256:evidence.rawSha256,
  expectedGeometrySha256:compiled.geometrySha256,
  r70Evidence:r70,r71Evidence,r72Evidence,destination:folder}):null;
 alternativesReview=r73?dirname+'/'+r73.relativeFile:null;
 const r73Evidence=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R73_HUMAN_CIRCULATION_OPTIONS.json'),'utf8')):null;
 const r74=compiled?writeR74HumanWorksheet({raw,
  expectedRawSha256:evidence.rawSha256,
  expectedGeometrySha256:compiled.geometrySha256,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  destination:folder}):null;
 humanWorksheetReview=r74?dirname+'/'+r74.relativeFile:null;
 const r74Evidence=compiled?JSON.parse(fs.readFileSync(path.join(folder,
  'R74_HUMAN_COMPARISON_BLANK.json'),'utf8')):null;
 const intake=compiled?writeR75IntakeInstructions({destination:folder}):null;
 humanDraftGuide=intake?dirname+'/'+intake.relativeFile:null;
 const next=writeR62FutureDesignGuidance({raw,
  expectedRawSha256:evidence.rawSha256,b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,destination:folder});
 guidance=dirname+'/'+next.relativeFile;
 const prioritized=writeR76ReviewPriorities({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  destination:folder});
 priorityBoard=dirname+'/'+prioritized.relativeFile;
 const brief=writeR77FutureArchitecturalBrief({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  destination:folder
 });
 architectureBrief=dirname+'/'+brief.relativeFile;
 const planned=writeR78SpatialProgramSpec({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  destination:folder
 });
 spatialProgramSpec=dirname+'/'+planned.relativeFile;
 const study=writeR79ParametricStudy({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  destination:folder
 });
 parametricStudy=dirname+'/'+study.relativeFile;
 const publicStudy=writeR80ResearchGeometry({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 publicCirculationStudy=dirname+'/'+publicStudy.relativeFile;
 const portalStudy=writeR81ArchitectureReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 portalReviewStudy=dirname+'/'+portalStudy.relativeFile;
 const checkedInterior=writeR82GeometryAudit({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  destination:folder
 });
 interiorClearanceReview=dirname+'/'+checkedInterior.relativeFile;
 const localLanding=writeR83ArchitecturalLandingReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  destination:folder
 });
 readingTerraceLandingStudy=dirname+'/'+localLanding.relativeFile;
 const allLayers=writeR84MultilevelReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,
  r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,
   'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  destination:folder
 });
 multilevelReadingStudy=dirname+'/'+allLayers.relativeFile;
 const alternatives85=writeR85RouteReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 wingRouteStudy=dirname+'/'+alternatives85.relativeFile;
 const widthStudy=writeR86DeckReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  destination:folder
 });
 finiteWidthDeckStudy=dirname+'/'+widthStudy.relativeFile;
 const r87=writeR87InteriorReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  destination:folder
 });
 readingRooms87=dirname+'/'+r87.relativeFile;
 const r88=writeR88GalleryReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 researchGalleries88=dirname+'/'+r88.relativeFile;
 const r89=writeR89AccessReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 architectureInterface89=dirname+'/'+r89.relativeFile;
 const r90=writeR90SeamReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  r89Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 sourceSeams90=dirname+'/'+r90.relativeFile;
 const r91=writeR91TurnoutReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  r89Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8')),
  r90Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 taperedTurnout91=dirname+'/'+r91.relativeFile;
 const r92=writeR92WholeLibraryReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  r89Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8')),
  r90Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),'utf8')),
  r91Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 wholeLibrary92=dirname+'/'+r92.relativeFile;
 const r93=writeR93ReadingGalleryReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  r89Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8')),
  r90Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),'utf8')),
  r91Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json'),'utf8')),
  r92Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R92_LIBRARY_PUBLIC_CIRCULATION_ATLAS.json'),'utf8')),
  destination:folder
 });
 readingArcades93=dirname+'/'+r93.relativeFile;
 const r94=writeR94DoorwayReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  r89Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8')),
  r90Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),'utf8')),
  r91Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json'),'utf8')),
  r92Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R92_LIBRARY_PUBLIC_CIRCULATION_ATLAS.json'),'utf8')),
  r93Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 readingDoors94=dirname+'/'+r94.relativeFile;
 const r95=writeR95DaylightReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  r89Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8')),
  r90Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),'utf8')),
  r91Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json'),'utf8')),
  r92Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R92_LIBRARY_PUBLIC_CIRCULATION_ATLAS.json'),'utf8')),
  r93Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_EVIDENCE.json'),'utf8')),
  r94Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R94_READING_ROOM_TRUE_TERRACE_ENTRY_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 daylightR95=dirname+'/'+r95.relativeFile;
 const r96=writeR96WindowReview({
  raw,expectedRawSha256:evidence.rawSha256,
  b143Status:evidence.b143.status,
  expectedGeometrySha256:compiled?.geometrySha256??null,
  r61Evidence:r61,r64Evidence:r64,r66Evidence:r66,
  r67Evidence:r67,r68Evidence:r68,r69Evidence:r69,
  r70Evidence:r70,r71Evidence,r72Evidence,r73Evidence,r74Evidence,
  r62Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json'),'utf8')),
  r76Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json'),'utf8')),
  r77Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json'),'utf8')),
  r78Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json'),'utf8')),
  r79Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R79_ART_STUDY_EVIDENCE.json'),'utf8')),
  r80Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R80_3D_CIRCULATION_STUDY_EVIDENCE.json'),'utf8')),
  r81Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json'),'utf8')),
  r82Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R82_DECK_TERRACE_PORTAL_GEOMETRY.json'),'utf8')),
  r83Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R83_WING_LANDINGS_AND_ROUTE_GAPS.json'),'utf8')),
  r84Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json'),'utf8')),
  r85Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R85_SEVEN_TIER_ROUTE_ALTERNATIVES.json'),'utf8')),
  r86Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R86_READING_TIER_WIDTH_SCREEN.json'),'utf8')),
  r87Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json'),'utf8')),
  r88Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json'),'utf8')),
  r89Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R89_GALLERY_INTEGRATION_EVIDENCE.json'),'utf8')),
  r90Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R90_SOURCE_SURFACE_SEAM_EVIDENCE.json'),'utf8')),
  r91Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json'),'utf8')),
  r92Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R92_LIBRARY_PUBLIC_CIRCULATION_ATLAS.json'),'utf8')),
  r93Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_EVIDENCE.json'),'utf8')),
  r94Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R94_READING_ROOM_TRUE_TERRACE_ENTRY_EVIDENCE.json'),'utf8')),
  r95Evidence:JSON.parse(fs.readFileSync(path.join(folder,'R95_SEVEN_SOURCE_DAYLIGHT_PORTALS_EVIDENCE.json'),'utf8')),
  destination:folder
 });
 architecturalWindows96=dirname+'/'+r96.relativeFile;
 return {tag:z.tag,originalRawSha256:evidence.rawSha256,
  evidenceType:kind,relativeViewer:link,relativeHumanBoard:board,
  relativeFunctionalSections:sections,
  relativeIndependentFloorReview:independentFloor,
  relativeOverheadSpaceReview:overheadReview,
  relativeContainmentReview:containmentReview,
  relativeAirTopologyReview:airTopologyReview,
  relativeVerticalGraphReview:verticalReview,
  relativeProvisionalApproachReview:approachReview,
  relativeRouteGapReview:routeGapReview,
  relativePreservationSections:preservationReview,
  relativeCirculationAlternatives:alternativesReview,
  relativeHumanOptionWorksheet:humanWorksheetReview,
  relativeHumanDraftIntakeGuide:humanDraftGuide,
  relativeFutureDesignGuidance:guidance,
  relativeArchitecturePriorityBoard:priorityBoard,
  relativeFutureArchitectureBrief:architectureBrief,
  relativeFutureSpatialProgramSpec:spatialProgramSpec,
  relativeOriginalArtStudy:parametricStudy,
  relativeResearchPublicCirculation:publicCirculationStudy,
  relativePortalAndSupportStudy:portalReviewStudy,
  relativeInteriorClearanceReview:interiorClearanceReview,
  relativeReadingTerraceLandingStudy:readingTerraceLandingStudy,
  relativeMultilevelBookstackStudy:multilevelReadingStudy,
  relativeWingRouteStudy:wingRouteStudy,
  relativeFiniteWidthDeckStudy:finiteWidthDeckStudy,
  relativeReadingRoomArchitectureStudy:readingRooms87,
  relativeR88GalleryAccessStudy:researchGalleries88,
  relativeR89GalleryLandingStudy:architectureInterface89,
  relativeR90SourceSeamReview:sourceSeams90,
  relativeR91TaperedTurnout:taperedTurnout91,
  relativeR92WholeLibraryAtlas:wholeLibrary92,
  relativeR93ReadingArcades:readingArcades93,
  relativeR94ReadingDoors:readingDoors94,
  relativeR95DaylightWindows:daylightR95,
  relativeR96WindowsAndWall:architecturalWindows96,
  independentHumanReview:'NOT_PERFORMED',
  actualMinecraftPlayerWalkingVerified:false};
}
export function createR60VisualReview({r54Zip,r48Zip=null,destination}={}){
 if(typeof destination!=='string'||!path.isAbsolute(destination)||
  fs.existsSync(destination))fail('FRESH_ABSOLUTE_OUTPUT_REQUIRED');
 const parent=path.dirname(destination);
 if(!fs.existsSync(parent)||!fs.lstatSync(parent).isDirectory()||
  fs.lstatSync(parent).isSymbolicLink())fail('ORDINARY_PARENT_REQUIRED');
 const a=inspectR59Archive(r54Zip,{tag:'R54'});
 const b=r48Zip===null?null:inspectR59Archive(r48Zip,{tag:'R48'});
 if(b&&path.resolve(r48Zip)===path.resolve(r54Zip))
  fail('R48_AND_R54_MUST_DIFFER');
 const stage=fs.mkdtempSync(path.join(parent,'.r60-staging-'));
 try{
  const folder=path.join(stage,'R59_ORIGINAL_REVIEW');
  reviewR59AlreadySavedZip({r54Zip,r48Zip,destination:folder});
  const report=JSON.parse(fs.readFileSync(path.join(folder,
   'R58_C01_FAIR_REVIEW_REPORT.json'),'utf8'));
  const receipt=JSON.parse(fs.readFileSync(path.join(folder,
   'R59_ZIP_REVIEW_RECEIPT.json'),'utf8'));
  if(receipt.r54ZipSHA256!==a.archiveSHA256||
   receipt.r48ZipSHA256!==(b?.archiveSHA256??null)||
   !report.candidate||Boolean(report.baseline)!==Boolean(b))
   fail('R59_EVIDENCE_RECEIPT_MISMATCH');
  const views=[visual(a,report.candidate,stage)];
  if(b)views.unshift(visual(b,report.baseline,stage));
  let continuityReview=null;
  if(b){
   // R59 verifies the historical R48 original SHA before this comparison.
   const rawOf=z=>{
    const raw=z.selectedFiles.find(f=>
     f.name===z.tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt');
    if(!raw)fail('R63_ORIGINAL_MISSING');
    return raw.bytes.toString('utf8');
   };
   const result=writeR63ArchitecturalContinuity({
    beforeRaw:rawOf(b),beforeSha256:report.baseline.rawSha256,
    afterRaw:rawOf(a),afterSha256:report.candidate.rawSha256,
    destination:stage
   });
   continuityReview=result.relativeFile;
  }
  for(const z of [a,b].filter(Boolean)){
   const now=inspectR59Archive(z.tag==='R54'?r54Zip:r48Zip,{tag:z.tag});
   if(now.archiveSHA256!==z.archiveSHA256)fail('ZIP_CHANGED_DURING_REVIEW');
  }
  const manifest={schema:SCHEMA,
   status:'READY_FOR_INDEPENDENT_HUMAN_REVIEW_NOT_YET_REVIEWED',
   frozenCase:'c01',r59ComparisonStatus:report.status,
   r54ArchiveSha256:a.archiveSHA256,r48ArchiveSha256:b?.archiveSHA256??null,
   views,relativeContinuityReview:continuityReview,
   sourceZipsUnmodified:true,actualQwenOriginAuthenticated:false,
   geometryRepairPerformed:false,architectureQualityCertified:false,
   independentHumanReview:'NOT_PERFORMED',safety:safety()};
  const items=views.map(v=>'<li>'+v.tag+': <a href="'+
   v.relativeViewer+'">図面を開く</a> ('+v.evidenceType+')'+
   (v.relativeHumanBoard?' / <a href="'+v.relativeHumanBoard+
    '">人間審査ボード</a>':'')+
   (v.relativeFunctionalSections?' / <a href="'+v.relativeFunctionalSections+
    '">モデル宣言に基づく断面</a>':'')+
   (v.relativeIndependentFloorReview?' / <a href="'+v.relativeIndependentFloorReview+
    '">R64 全体の床と空間の独立調査</a>':'')+
   (v.relativeOverheadSpaceReview?' / <a href="'+v.relativeOverheadSpaceReview+
    '">R66 屋根下と開放空間の比較</a>':'')+
   (v.relativeContainmentReview?' / <a href="'+v.relativeContainmentReview+
    '">R67 屋根・壁と内部空間の手掛かり</a>':'')+
   (v.relativeAirTopologyReview?' / <a href="'+v.relativeAirTopologyReview+
    '">R68 水平空気の連続性と閉鎖空間</a>':'')+
   (v.relativeVerticalGraphReview?' / <a href="'+v.relativeVerticalGraphReview+
    '">R69 上下空気と支持床動線の比較</a>':'')+
   (v.relativeProvisionalApproachReview?' / <a href="'+v.relativeProvisionalApproachReview+
    '">R70 外側の入口候補から上階への仮経路</a>':'')+
   (v.relativeRouteGapReview?' / <a href="'+v.relativeRouteGapReview+
    '">R71 分断領域と近接座標の調査</a>':'')+
   (v.relativePreservationSections?' / <a href="'+v.relativePreservationSections+
    '">R72 構造と大空洞を守るための断面図</a>':'')+
   (v.relativeCirculationAlternatives?' / <a href="'+v.relativeCirculationAlternatives+
    '">R73 建築を守る3つの動線検討方向</a>':'')+
   (v.relativeHumanOptionWorksheet?' / <a href="'+v.relativeHumanOptionWorksheet+
    '">R74 3方向×6軸の人間審査票</a>':'')+
   (v.relativeHumanDraftIntakeGuide?' / <a href="'+v.relativeHumanDraftIntakeGuide+
    '">R75 記入済み審査票の安全な提出手順</a>':'')+
   (v.relativeFutureDesignGuidance?' / <a href="'+v.relativeFutureDesignGuidance+
    '">次回設計への根拠</a>':'')+
   (v.relativeArchitecturePriorityBoard?' / <a href="'+v.relativeArchitecturePriorityBoard+
    '">R76 次の建築改善判断の優先順</a>':'')+
   (v.relativeFutureArchitectureBrief?' / <a href="'+v.relativeFutureArchitectureBrief+
    '">R77 未来型図書館の次期設計コンセプト</a>':'')+
   (v.relativeFutureSpatialProgramSpec?' / <a href="'+v.relativeFutureSpatialProgramSpec+
    '">R78 空間・断面・動線の設計仕様</a>':'')+
   (v.relativeOriginalArtStudy?' / <a href="'+v.relativeOriginalArtStudy+
    '">R79 原創3D形態と6図面</a>':'')+
   (v.relativeResearchPublicCirculation?' / <a href="'+v.relativeResearchPublicCirculation+
    '">R80 立体動線・支持研究と6図面</a>':'')+
   (v.relativePortalAndSupportStudy?' / <a href="'+v.relativePortalAndSupportStudy+
    '">R81 入口開口・ラウンジガラス・支持の接合研究</a>':'')+
   (v.relativeInteriorClearanceReview?' / <a href="'+v.relativeInteriorClearanceReview+
    '">R82 入口幅・頭上余裕・書架段丘接続の3D検査</a>':'')+
   (v.relativeReadingTerraceLandingStudy?' / <a href="'+v.relativeReadingTerraceLandingStudy+
    '">R83 左右書架段丘の着地点と接続候補</a>':'')+
   (v.relativeMultilevelBookstackStudy?' / <a href="'+v.relativeMultilevelBookstackStudy+
    '">R84 左右7層の書架段丘と立体動線の研究</a>':'')+
   (v.relativeWingRouteStudy?' / <a href="'+v.relativeWingRouteStudy+
    '">R85 左右7層への翼側動線代替案</a>':'')+
   (v.relativeFiniteWidthDeckStudy?' / <a href="'+v.relativeFiniteWidthDeckStudy+
    '">R86 幅を持つ研究用デッキ3D候補</a>':'')+
   (v.relativeReadingRoomArchitectureStudy?' / <a href="'+v.relativeReadingRoomArchitectureStudy+
    '">R87 左右7層の閲覧室・家具・ラウンジ3D研究</a>':'')+
   (v.relativeR88GalleryAccessStudy?' / <a href="'+v.relativeR88GalleryAccessStudy+
    '">R88 昇降路から全7層への幅付き研究用ギャラリー</a>':'')+
   (v.relativeR89GalleryLandingStudy?' / <a href="'+v.relativeR89GalleryLandingStudy+
    '">R89 7層のギャラリー側縁と着地点の3D設計</a>':'')+
   (v.relativeR90SourceSeamReview?' / <a href="'+v.relativeR90SourceSeamReview+
    '">R90 実際の昇降デッキ・着地面への3D接続と未成立箇所</a>':'')+
   (v.relativeR91TaperedTurnout?' / <a href="'+v.relativeR91TaperedTurnout+
    '">R91 右書架tier 2の着地点内へ収める改修3D案</a>':'')+
   (v.relativeR92WholeLibraryAtlas?' / <a href="'+v.relativeR92WholeLibraryAtlas+
    '">R92 入口から全7層と展望ラウンジまでの建築全館研究</a>':'')+
   (v.relativeR93ReadingArcades?' / <a href="'+v.relativeR93ReadingArcades+
    '">R93 元の床に連続した28区画の書架・読書ギャラリー5視点</a>':'')+
   (v.relativeR94ReadingDoors?' / <a href="'+v.relativeR94ReadingDoors+
    '">R94 7層の着地点を家具から解放した開口と入口デザイン</a>':'')+
   (v.relativeR95DaylightWindows?' / <a href="'+v.relativeR95DaylightWindows+
    '">R95 内壁を本当に切り抜く7層の採光・眺望スリット</a>':'')+
   (v.relativeR96WindowsAndWall?' / <a href="'+v.relativeR96WindowsAndWall+
    '">R96 源内壁と窓の周囲の立体美術・隙間・視線監査</a>':'')+'</li>').join('');
  const html='<!doctype html><html lang="ja"><meta charset="utf-8">'+
   '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;">'+
   '<title>R60 建築品質の人間審査</title>'+
   '<body style="font:16px/1.7 system-ui;max-width:850px;margin:32px auto;padding:0 18px">'+
   '<h1>R60 建築設計の実態を確認</h1>'+
   '<p>R7は最終概念ボクセルの3D。R51は未コンパイル形状の外接範囲のみ。'+
   '双方ともMinecraft施工・実際の歩行・美観・独創性の証明ではありません。</p>'+
   '<ul>'+items+'</ul>'+
   (continuityReview?'<p><a href="'+continuityReview+
    '">R63 元案から主要空間・造形が失われていないか確認</a></p>':'')+
   '<p><a href="R59_ORIGINAL_REVIEW/R58_C01_HUMAN_REVIEW.html">'+
   '原本比較と凍結した4つの人間品質審査項目</a></p>'+
   '<p>レビュー未実施。推論0、ワールド操作0、NOT_PREPARED、9 BLOCKED。</p></body></html>';
  fs.writeFileSync(path.join(stage,'R60_INDEX.html'),html,{flag:'wx'});
  fs.writeFileSync(path.join(stage,'R60_MANIFEST.json'),
   JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  if(fs.existsSync(destination))fail('OUTPUT_BECAME_OCCUPIED');
  fs.renameSync(stage,destination);
  return {status:manifest.status,views,modelCalls:0,worldWrites:0};
 }finally{if(fs.existsSync(stage))fs.rmSync(stage,{recursive:true,force:true})}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(![4,6].includes(a.length)||a[0]!=='--r54-zip'||a[2]!=='--out'||
   (a.length===6&&a[4]!=='--r48-zip'))fail('CLI_FLAGS');
  console.log(JSON.stringify(createR60VisualReview({
   r54Zip:a[1],destination:a[3],r48Zip:a.length===6?a[5]:null})));
 }catch(e){console.error(String(e?.message??e).slice(0,220));process.exitCode=2}
}
