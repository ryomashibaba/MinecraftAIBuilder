import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {CREATION_CASES} from '../source/ai/b198b-benchmark-cases.mjs';
import {r32Courtyard} from './b198zr32-synthetic-geometry-fixtures.mjs';
import {createR60VisualReview}
 from './b198zr60-evidence-bound-visual-review.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const tmp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'r60-visual-'));
function crc32(b){
 let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)
  c=(c&1)?0xedb88320^(c>>>1):c>>>1}
 return (c^0xffffffff)>>>0;
}
function zip(entries){
 const locals=[],dirs=[];let offset=0,centralSize=0;
 for(const [name,value] of entries){
  const raw=Buffer.from(value),n=Buffer.from(name),data=deflateRawSync(raw);
  const h=Buffer.alloc(30),d=Buffer.alloc(46);
  h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);
  h.writeUInt16LE(8,8);h.writeUInt32LE(crc32(raw),14);
  h.writeUInt32LE(data.length,18);h.writeUInt32LE(raw.length,22);
  h.writeUInt16LE(n.length,26);locals.push(h,n,data);
  d.writeUInt32LE(0x02014b50,0);d.writeUInt16LE(20,4);
  d.writeUInt16LE(20,6);d.writeUInt16LE(8,10);
  d.writeUInt32LE(crc32(raw),16);d.writeUInt32LE(data.length,20);
  d.writeUInt32LE(raw.length,24);d.writeUInt16LE(n.length,28);
  d.writeUInt32LE(offset,42);dirs.push(d,n);
  offset+=h.length+n.length+data.length;centralSize+=d.length+n.length;
 }
 const e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);
 e.writeUInt16LE(entries.length,8);e.writeUInt16LE(entries.length,10);
 e.writeUInt32LE(centralSize,12);e.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,...dirs,e]);
}
function fixture({tag='R54',invalid=false,corrupt=false}={}){
 const p=r32Courtyard();
 if(invalid)p.design.elements.push({id:'r60-bounds-overflow',
  shape:'box',mode:'add',material:'metal',
  origin:[1,p.design.bounds.height,1],size:[2,1,2]});
 const raw=JSON.stringify(p),digest=sha(raw),c01=CREATION_CASES.find(x=>x.id==='c01');
 const root=tag+'_780917eb-b6cd-4b6c-ab61-69f923d4b672';
 const members={
  [tag+'_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt']:raw,
  [tag+'_FROZEN_REQUEST.json']:JSON.stringify({
   caseId:'c01',originalPrompt:c01.prompt,
   originalPromptSha256:sha(c01.prompt),guideSha256:'6'.repeat(64)}),
  [tag+'_CAPTURE_RESULT.json']:JSON.stringify({
   originalSaved:true,originalRawSha256:digest}),
  [tag+'_FINAL_EVIDENCE_MANIFEST.json']:JSON.stringify({
   originalRawCaptured:true,rawSha256:corrupt?'0'.repeat(64):digest,
   oneTimeLock:'CONSUMED',c01PromptSha256:sha(c01.prompt),
   model:'qwen3.8:27b',r47NativeSchemaSha256:'5'.repeat(64),
   r50ArchitectureGuideSha256:'6'.repeat(64)})
 };
 return {bytes:zip(Object.entries(members).map(([n,v])=>[root+'/'+n,v])),
  digest};
}
test('R60 failed B143 only shows R51 envelopes; keeps originals and never scores beauty',()=>{
 const dir=tmp();
 try{
  const f=fixture({invalid:true}),p=path.join(dir,'r54.zip'),
   output=path.join(dir,'review');
  fs.writeFileSync(p,f.bytes);
  const r=createR60VisualReview({r54Zip:p,destination:output});
  assert.equal(r.modelCalls,0);
  assert.equal(r.views[0].evidenceType,'UNCOMPILED_SHAPE_ENVELOPES_ONLY');
  assert(fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES',
   'R51_UNCOMPILED_SPATIAL_STORYBOARD.html')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','index.html')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R64_INDEPENDENT_FLOOR_NETWORK.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R66_OVERHEAD_SPACE_EVIDENCE.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R67_SURROUNDING_SPACE_EVIDENCE.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R68_HORIZONTAL_AIR_TOPOLOGY.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R69_VERTICAL_AIR_VS_MOTION.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R70_APPROACH_ROUTE_EVIDENCE.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R71_ROUTE_GAPS_EVIDENCE.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R72_MASS_VOID_GAP_CONTEXT.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R73_HUMAN_CIRCULATION_OPTIONS.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R74_HUMAN_COMPARISON_BLANK.json')));
  assert(!fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R75_HUMAN_DRAFT_INTAKE_GUIDE.html')));
  assert(fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R76_ARCHITECTURE_NEXT_DECISIONS.html')));
  const heldPriority=JSON.parse(fs.readFileSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R76_ARCHITECTURE_PRIORITY_REVIEW.json')));
  assert.equal(heldPriority.status,'HOLD_NO_FINAL_VOXEL_ARCHITECTURE');
  assert.equal(heldPriority.currentDecisionPackage,'01_SOURCE_TRUTH');
  assert(fs.existsSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R77_COHESIVE_LIBRARY_DESIGN_BRIEF.html')));
  const holdBrief=JSON.parse(fs.readFileSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R77_FUTURE_ARCHITECTURE_BRIEF.json')));
  assert.equal(holdBrief.status,'ARCHITECTURE_FIRST_BRIEF_B143_SOURCE_HOLD');
  assert.equal(holdBrief.executedDesign,null);
  const holdPlan=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R78_ARCHITECTURAL_SPATIAL_PROGRAM.json')));
  assert.equal(holdPlan.status,'FUTURE_HUMAN_PROGRAM_SPEC_WITH_OLD_B143_HOLD');
  assert.equal(holdPlan.programGraphAudit.geometryOrWalkabilityVerified,false);
  const holdArt=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R79_ART_STUDY_EVIDENCE.json')));
  assert.equal(holdArt.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(holdArt.originalArtNotActualQwenOutput,true);
  const holdCirculation=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R80_3D_CIRCULATION_STUDY_EVIDENCE.json')));
  assert.equal(holdCirculation.previousB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(holdCirculation.noPhysicalWalkingCertificate,true);
  const heldR81=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R81_ENVELOPE_COLLISIONS_AND_PORTALS.json')));
  assert.equal(heldR81.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR81.minecraftWalkingVerified,false);
  const heldR82=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R82_DECK_TERRACE_PORTAL_GEOMETRY.json')));
  assert.equal(heldR82.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR82.audit.sampledPortalRays,105);
  assert.equal(heldR82.noHumanMovementOrAestheticPass,true);
  const heldR83=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R83_WING_LANDINGS_AND_ROUTE_GAPS.json')));
  assert.equal(heldR83.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR83.containedLandingCount,2);
  assert.equal(heldR83.actualMinecraftWalkingVerified,false);
  const heldR84=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json')));
  assert.equal(heldR84.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR84.tiers.length,7);
  assert.equal(heldR84.minecraftActualWalkingProven,false);
  const heldR86=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R86_READING_TIER_WIDTH_SCREEN.json')));
  assert.equal(heldR86.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR86.decisions.length,7);
  assert.equal(heldR86.actualWalkingCertified,false);
  assert.equal(heldR86.humanArchitectureQuality,'NOT_REVIEWED');
  const heldR87=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R87_SEVEN_READING_ROOMS_ARCHITECTURAL_EVIDENCE.json')));
  assert.equal(heldR87.createdProgramAreaCount,7);
  assert.equal(heldR87.fullFloorStairEntryLoungeTravelProven,false);
  assert.equal(heldR87.humanArchitecturalCriteria,'NOT_REVIEWED');
  const heldR88=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R88_GALLERY_TO_SEVEN_READING_ROOMS_EVIDENCE.json')));
  assert.equal(heldR88.proposedGalleryTierCount+heldR88.unresolvedGalleryTierCount,7);
  assert.equal(heldR88.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR88.certifiedPublicRoutes,0);
  const heldR89=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R89_GALLERY_INTEGRATION_EVIDENCE.json')));
  assert.equal(heldR89.levels.length,7);
  assert.equal(heldR89.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR89.actualHumanWalkabilityCertified,false);
  const heldR90=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R90_SOURCE_SURFACE_SEAM_EVIDENCE.json')));
  assert.equal(heldR90.tiers.length,7);
  assert.equal(heldR90.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR90.fullPhysicalHumanWalkabilityProven,false);
  assert.equal(heldR90.unresolvedTrue3DSeams,1);
  const heldR91=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R91_TRUE_PAD_TAPERED_RIGHT_TIER2_EVIDENCE.json')));
  assert.equal(heldR91.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR91.sourceR90Faces,4291);
  assert.equal(heldR91.newTurnoutFaces,11);
  assert.equal(heldR91.activeModelTriangleCount,4294);
  const heldR92=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R92_LIBRARY_PUBLIC_CIRCULATION_ATLAS.json')));
  assert.equal(heldR92.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR92.graph.summary.researchGraphRoomsReached,7);
  assert.equal(heldR92.graph.summary.physicalCertifiedRoomsReached,0);
  assert.equal(heldR92.activeWholeLibraryTriangles,4306);
  const heldR93=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_EVIDENCE.json')));
  assert.equal(heldR93.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR93.longitudinalRoomsWithArchitecture,7);
  assert.equal(heldR93.totalEmittedBays,28);
  assert.equal(heldR93.newMultiBayBookGalleryTriangles,168);
  const heldR94=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R94_READING_ROOM_TRUE_TERRACE_ENTRY_EVIDENCE.json')));
  assert.equal(heldR94.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR94.connectedResearchDoorwayCount,7);
  assert.equal(heldR94.displacedFurnishingTriangles,84);
  assert.equal(heldR94.newTrueSourceFloorDoorwayTriangles,56);
  assert.equal(heldR94.newActiveArchitectureTriangles,4446);
  const heldR95=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R95_SEVEN_SOURCE_DAYLIGHT_PORTALS_EVIDENCE.json')));
  assert.equal(heldR95.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR95.proofs.length,7);
  const heldR96=JSON.parse(fs.readFileSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R96_ATRIUM_SOURCE_WINDOW_SURROUND_EVIDENCE.json')));
  assert.equal(heldR96.oldB143Status,'HOLD_B143_NOT_COMPILED');
  assert.equal(heldR96.rooms.length,7);
  assert.equal(heldR96.addedArchitecturalSurroundTriangles,84);
  assert.equal(heldR96.buildingFacadeStructuralContinuityCertified,false);
  assert(heldR96.sightlineRays.every(x=>x.after.blocked===0));
  assert.equal(heldR96.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R96_ATRIUM_SOURCE_WINDOW_SURROUND_ARCHITECTURE.obj')));
  assert(heldR95.proofs.every(x=>x.unobstructedSamples===9));
  assert.equal(heldR95.structuralCapacityOfCutWallVerified,false);
  assert.equal(heldR95.physicalSunlightIlluminationLuxMeasured,false);
  assert.equal(heldR95.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R95_SEVEN_SOURCE_DAYLIGHT_PORTALS_ARCHITECTURE.obj')));
  assert.equal(heldR94.certifiedPhysicalDoorways,0);
  assert.equal(heldR94.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R94_READING_ROOM_TRUE_TERRACE_ENTRY_ACTIVE_ARCHITECTURE.obj')));
  assert.equal(heldR93.certifiedFloorPaths,0);
  assert.equal(heldR93.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R93_ORIGINAL_SEVEN_LONG_READING_GALLERIES_ARCHITECTURE.obj')));
  assert.equal(heldR92.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R92_FOLIO_ENTRANCE_WHOLE_ARCHITECTURE.obj')));
  assert.equal(heldR91.rightTier2Alternative.chosenTaper,.75);
  assert.equal(heldR91.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R91_TRUE_PAD_TAPERED_RIGHT_TIER2_ACTIVE_VARIANT.obj')));
  assert.equal(heldR90.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R90_SOURCE_DECK_TO_PAD_3D_SEAMS.obj')));
  assert.equal(heldR89.independentArchitecturalQuality,'NOT_REVIEWED');
  assert.equal(heldR89.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R89_GALLERY_RAILS_AND_LANDING_PROPOSALS.obj')));
  assert.equal(heldR88.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R88_GALLERY_AND_SHELL_SUPPORT_STUDY.obj')));
  assert.equal(heldR87.safety.readiness,'NOT_PREPARED');
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R87_SAIL_COVE_LANTERN_GALLERY_ARCHITECTURE.obj')));
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R86_READING_DECK_WIDTH_CANDIDATES.obj')));
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R84_MULTILEVEL_BOOKSTACK_LANDINGS.obj')));
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R83_READING_WING_LANDING_STUDY.obj')));
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R81_TIDAL_LIBRARY_PORTAL_RELIEF_STUDY.obj')));
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R80_LIBRARY_RAMP_AND_SUPPORT_STUDY.obj')));
  assert(fs.existsSync(path.join(output,
   'R54_R51_UNCOMPILED_ENVELOPES','R79_TIDAL_LIGHT_ART_STUDY.obj')));
  const next=JSON.parse(fs.readFileSync(path.join(output,'R54_R51_UNCOMPILED_ENVELOPES','R62_NEXT_DESIGN_EVIDENCE.json')));
  assert(next.evidenceIssues.some(x=>x.kind==='STRICT_B143_HOLD'));
  assert(next.evidenceIssues.some(x=>x.kind==='ELEMENT_OUTSIDE_LOCAL_BOUNDS'));
  assert.equal(next.approvedForInference,false);
  assert.equal(next.modelIndependentNetworkEvidenceUsed,false);
  const m=JSON.parse(fs.readFileSync(path.join(output,'R60_MANIFEST.json')));
  assert.equal(m.views[0].originalRawSha256,f.digest);
  assert.equal(m.independentHumanReview,'NOT_PERFORMED');
  assert.equal(m.architectureQualityCertified,false);
  assert(m.safety.gates.every(x=>x==='BLOCKED'));
  assert.deepEqual(m.safety.BuildPlan.operations,[]);
  assert.deepEqual(fs.readFileSync(p),f.bytes);
  assert.throws(()=>createR60VisualReview({r54Zip:p,destination:output}),
   /FRESH_ABSOLUTE_OUTPUT_REQUIRED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R60 strict B143 PASS creates R7 actual abstract voxel 3D and B198W board',()=>{
 const dir=tmp();
 try{
  const f=fixture(),p=path.join(dir,'r54.zip'),output=path.join(dir,'review');
  fs.writeFileSync(p,f.bytes);
  const r=createR60VisualReview({r54Zip:p,destination:output});
  assert.equal(r.views[0].evidenceType,'STRICT_B143_FINAL_ABSTRACT_VOXELS');
  const folder=path.join(output,'R54_R7_FINAL_ABSTRACT_3D');
  assert(fs.existsSync(path.join(folder,'index.html')));
  assert(fs.existsSync(path.join(folder,'B198W_REVIEW_BOARD.html')));
  assert(fs.existsSync(path.join(folder,'R61_FINAL_VOXEL_SECTION_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R64_FLOOR_CONNECTIVITY_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R66_OVERHEAD_SPACE_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R67_SURROUNDING_SPACE_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R68_HUMAN_AIR_CONTINUITY_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R69_VERTICAL_CIRCULATION_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R70_APPROACH_TO_UPPER_LEVELS_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R71_ROUTE_GAP_TRIAGE_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R72_ARCHITECTURE_PRESERVATION_SECTIONS.html')));
  assert(fs.existsSync(path.join(folder,'R73_PRESERVE_ARCHITECTURE_ALTERNATIVES.html')));
  assert(fs.existsSync(path.join(folder,'R74_HUMAN_OPTION_REVIEW_SHEET.html')));
  assert(fs.existsSync(path.join(folder,'R75_HUMAN_DRAFT_INTAKE_GUIDE.html')));
  assert(fs.existsSync(path.join(folder,'R76_ARCHITECTURE_NEXT_DECISIONS.html')));
  const nextSteps=JSON.parse(fs.readFileSync(path.join(folder,'R76_ARCHITECTURE_PRIORITY_REVIEW.json')));
  assert.equal(nextSteps.currentDecisionPackage,'02_REAL_PUBLIC_USE');
  assert.equal(nextSteps.independentHumanQualityApproval,false);
  assert(fs.existsSync(path.join(folder,'R77_COHESIVE_LIBRARY_DESIGN_BRIEF.html')));
  const artBrief=JSON.parse(fs.readFileSync(path.join(folder,'R77_FUTURE_ARCHITECTURE_BRIEF.json')));
  assert.equal(artBrief.independentCriteria.length,4);
  assert.equal(artBrief.humanVisualReview,'NOT_REVIEWED');
  assert.equal(artBrief.noModelCallAuthorized,true);
  assert(fs.existsSync(path.join(folder,'R78_LIBRARY_SECTIONS_AND_ROUTE_SPEC.html')));
  const spatialPlan=JSON.parse(fs.readFileSync(path.join(folder,
   'R78_ARCHITECTURAL_SPATIAL_PROGRAM.json')));
  assert.equal(spatialPlan.programGraphAudit.programDestinationsReachableInPaperGraph,true);
  assert.equal(spatialPlan.programGraphAudit.geometryOrWalkabilityVerified,false);
  assert.equal(spatialPlan.independentHumanQualityPass,false);
  const volume=JSON.parse(fs.readFileSync(path.join(folder,
   'R79_ART_STUDY_EVIDENCE.json')));
  assert.equal(volume.actual3DArtifact,true);
  assert.equal(volume.readyForConstruction,false);
  const circulation=JSON.parse(fs.readFileSync(path.join(folder,
   'R80_3D_CIRCULATION_STUDY_EVIDENCE.json')));
  assert.equal(circulation.actualNew3DArtStudy,true);
  assert.equal(circulation.noHumanArchitecturalPass,true);
  assert.equal(circulation.modelCalls,0);
  const portal=JSON.parse(fs.readFileSync(path.join(folder,
   'R81_ENVELOPE_COLLISIONS_AND_PORTALS.json')));
  assert.equal(portal.r80RecomputedAndAuthenticated,true);
  assert.equal(portal.independentHumanQuality,'NOT_REVIEWED');
  const inspection=JSON.parse(fs.readFileSync(path.join(folder,
   'R82_DECK_TERRACE_PORTAL_GEOMETRY.json')));
  assert.equal(inspection.r81RecomputedAndAuthenticated,true);
  assert.equal(inspection.noHumanMovementOrAestheticPass,true);
  const wingLandings=JSON.parse(fs.readFileSync(path.join(folder,
   'R83_WING_LANDINGS_AND_ROUTE_GAPS.json')));
  assert.equal(wingLandings.r82RecomputedAndAuthenticated,true);
  assert.equal(wingLandings.containedLandingCount,2);
  const multilevel=JSON.parse(fs.readFileSync(path.join(folder,
   'R84_SEVEN_BOOKSTACK_LEVELS_EVIDENCE.json')));
  assert.equal(multilevel.r83RecomputedAndAuthenticated,true);
  assert.equal(multilevel.originalR83ReusedLandings,2);
  assert.equal(multilevel.newlyPlacedResearchLandings,5);
  assert.equal(multilevel.independentArchitecturalQuality,'NOT_REVIEWED');
  assert(fs.existsSync(path.join(folder,'R84_MULTILEVEL_LIBRARY_CIRCULATION_REVIEW.html')));
  assert.equal(wingLandings.independentHumanCriteria,'NOT_REVIEWED');
  assert(fs.existsSync(path.join(folder,'R83_BOOKSTACK_ACCESS_GEOMETRY_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R82_INTERIOR_CLEARANCE_AND_LANDING_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R81_ARCHITECTURE_PORTAL_AND_SUPPORT_REVIEW.html')));
  assert(fs.existsSync(path.join(folder,'R80_LIBRARY_ACCESS_AND_STRUCTURE_VIEWS.html')));
  assert(fs.existsSync(path.join(folder,'R79_ARCHITECTURE_FOUR_VIEWS_AND_SECTIONS.html')));
  assert.equal(fs.existsSync(path.join(folder,'R75_HUMAN_REVIEW_OUTSTANDING.json')),false);
  const worksheet=JSON.parse(fs.readFileSync(path.join(folder,
   'R74_HUMAN_COMPARISON_BLANK.json'),'utf8'));
  assert.equal(worksheet.independentHumanAssessment,'NOT_REVIEWED');
  assert.equal(worksheet.qualityCertification,'NOT_PERFORMED');
  const alternatives=JSON.parse(fs.readFileSync(path.join(folder,'R73_HUMAN_CIRCULATION_OPTIONS.json')));
  assert.equal(alternatives.r72RecomputedAndAuthenticated,true);
  assert.equal(alternatives.allHumanCriteria,'NOT_REVIEWED');
  const preserve=JSON.parse(fs.readFileSync(path.join(folder,'R72_MASS_VOID_GAP_CONTEXT.json')));
  assert.equal(preserve.r71RecomputedAndAuthenticated,true);
  assert.equal(preserve.independentArchitecturalQuality,'NOT_REVIEWED');
  const gap=JSON.parse(fs.readFileSync(path.join(folder,'R71_ROUTE_GAPS_EVIDENCE.json')));
  assert.equal(gap.originalSpatialPlanNotConsulted,true);
  assert.equal(gap.independentHumanReview,'NOT_REVIEWED');
  const approach=JSON.parse(fs.readFileSync(path.join(folder,'R70_APPROACH_ROUTE_EVIDENCE.json')));
  assert.equal(approach.sourceSpatialPlanAndModelEntranceIgnored,true);
  assert.equal(approach.independentHumanReview,'NOT_REVIEWED');
  const vertical=JSON.parse(fs.readFileSync(path.join(folder,'R69_VERTICAL_AIR_VS_MOTION.json')));
  assert.equal(vertical.modelSpatialPlanIgnored,true);
  assert.equal(vertical.independentHumanReview,'NOT_REVIEWED');
  const air=JSON.parse(fs.readFileSync(path.join(folder,'R68_HORIZONTAL_AIR_TOPOLOGY.json')));
  assert.equal(air.originalSpatialPlanRead,false);
  assert.equal(air.independentHumanReview,'NOT_REVIEWED');
  const perimeter=JSON.parse(fs.readFileSync(path.join(folder,'R67_SURROUNDING_SPACE_EVIDENCE.json')));
  assert.equal(perimeter.sourceSpatialPlanIgnored,true);
  assert.equal(perimeter.fullyEnclosedRoomOrFunctionVerified,false);
  const roof=JSON.parse(fs.readFileSync(path.join(folder,'R66_OVERHEAD_SPACE_EVIDENCE.json')));
  assert.equal(roof.originalSpatialPlanRead,false);
  assert.equal(roof.independentHumanReview,'NOT_REVIEWED');
  const floor=JSON.parse(fs.readFileSync(path.join(folder,'R64_INDEPENDENT_FLOOR_NETWORK.json')));
  assert.equal(floor.spatialPlanReadOrTrusted,false);
  assert(floor.metrics.supportedTwoHighStandingPositions>0);
  assert.equal(floor.independentArchitecturalQuality,'NOT_REVIEWED');
  assert(fs.existsSync(path.join(folder,'R62_NEXT_DESIGN_REVIEW.html')));
  const next=JSON.parse(fs.readFileSync(path.join(folder,'R62_NEXT_DESIGN_EVIDENCE.json')));
  assert.equal(next.independentHumanCriteria.length,4);
  assert.equal(next.realModelImprovementDemonstrated,false);
  assert.equal(next.freshConsentRequired,true);
  assert.equal(next.modelIndependentNetworkEvidenceUsed,true);
  assert.equal(next.r66OverheadSourceIndependentUsed,true);
  assert.equal(next.r67SourceIndependentUsed,true);
  assert.equal(next.r68AirTopologyIndependentUsed,true);
  assert.equal(next.r69IndependentVerticalGraphUsed,true);
  assert.equal(next.r70IndependentApproachUsed,true);
  assert.equal(next.r71SourceVerifiedRouteGapUsed,true);
  assert.equal(next.r72MassAndVoidSectionReviewUsed,true);
  assert.equal(next.r73HumanAlternativesReviewUsed,true);
  assert.equal(next.r74HumanWorksheetGenerated,true);
  assert.equal(next.r74IndependentReviewStatus,'NOT_REVIEWED');
  assert.notEqual(next.r73ConceptComparisonStatus,'NOT_INCLUDED');
  assert.notEqual(next.r72PreservationReviewStatus,'NOT_INCLUDED');
  assert.equal(next.r71HumanReviewCoordinatesOnly,true);
  assert.notEqual(next.r70ProvisionalRouteStatus,'NOT_INCLUDED');
  assert.equal(next.r69VerticalGraphStatus,
   'VERTICAL_AIR_AND_SUPPORTED_MOTION_FACTS_ONLY');
  assert.equal(next.r68HorizontalAirStatus,
   'HORIZONTAL_TWO_HIGH_AIR_TOPOLOGY_FOR_HUMAN_REVIEW');
  assert.equal(next.r67ContainmentReviewStatus,
   'ROOF_AND_NEARBY_SOLID_PROXY_FOR_HUMAN_REVIEW');
  assert.equal(next.r66OverheadAuditStatus,
   'OVERHEAD_COLUMN_PROXIES_FOR_HUMAN_REVIEW_ONLY');
  assert.equal(next.r65NetworkAuditStatus,
   'CONCEPT_NETWORK_FEEDBACK_DERIVED_NOT_APPLIED');
  assert.equal(next.independentHumanCriteria[0].assessment,'NOT_REVIEWED');
  const s=JSON.parse(fs.readFileSync(path.join(folder,'R61_FINAL_VOXEL_SPATIAL_EVIDENCE.json')));
  assert.equal(s.humanQualityReview,'NOT_REVIEWED');
  assert.equal(s.modelCriteriaAreNotIndependent,true);
  const m=JSON.parse(fs.readFileSync(path.join(folder,'R7_VISUAL_REVIEW_MANIFEST.json')));
  assert.equal(m.status,'WAITING_FOR_HUMAN_VISUAL_AND_SEMANTIC_REVIEW');
  assert.equal(m.actualMinecraftPlayerWalkingNotTested,true);
  assert.deepEqual(fs.readFileSync(p),f.bytes);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R60 refuses corrupt original SHA and never publishes a partial output folder',()=>{
 const dir=tmp();
 try{
  const f=fixture({corrupt:true}),p=path.join(dir,'bad.zip'),output=path.join(dir,'out');
  fs.writeFileSync(p,f.bytes);
  assert.throws(()=>createR60VisualReview({r54Zip:p,destination:output}),
   /B198ZR58_EVIDENCE_SHA_CHAIN_MISMATCH_OR_UNCAPTURED/);
  assert(!fs.existsSync(output));
  assert.deepEqual(fs.readFileSync(p),f.bytes);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('R60 refuses a synthetic R48 masquerading as the real historical original',()=>{
 const dir=tmp();
 try{
  const a=fixture({tag:'R48',invalid:true});
  const b=fixture({tag:'R54',invalid:true});
  const p=path.join(dir,'r48.zip'),q=path.join(dir,'r54.zip'),out=path.join(dir,'out');
  fs.writeFileSync(p,a.bytes);fs.writeFileSync(q,b.bytes);
  assert.throws(()=>createR60VisualReview({r54Zip:q,r48Zip:p,destination:out}),
   /R48_REPORTED_HISTORICAL_ORIGINAL_SHA_MISMATCH/);
  assert(!fs.existsSync(out));
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
