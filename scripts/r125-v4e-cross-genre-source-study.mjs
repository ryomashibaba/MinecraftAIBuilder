/**
 * Cross-genre SOURCE bottleneck study, NOT an architecture template system.
 * Five separately authored synthetic architectural briefs use precisely the
 * SAME optional V4E compiler and B143 gallery. No model inference/changes
 * to R125 Education or false ART claims.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeV4DCompactSynthetic} from './r125-v4d-compact-model-fixture.mjs';
import {RANKED_SCHEMA,compileRankedExteriorIntent}
 from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
import {actualOrthographicSvg} from './r125-v4e-source-art-review.mjs';
import {auditB143ProjectedVisibility,renderB143ProjectedVisibilityDelta}
 from './r125-v4e-visibility-delta.mjs';
import {compileAuthoredPublicLoggia} from '../source/ai/r125-v4e-authored-public-loggia.mjs';
import {compileAuthoredPrimaryMassingVoid} from '../source/ai/r125-v4e-authored-primary-massing-void.mjs';
import {compileAuthoredExteriorWing} from '../source/ai/r125-v4e-authored-exterior-wing.mjs';
import {compileAuthoredCoveredFloorplateSetback} from '../source/ai/r125-v4e-authored-covered-floorplate-setback.mjs';
import {compileAuthoredTallPublicHall} from '../source/ai/r125-v4g-authored-atrium-height.mjs';
import {FLOORPLATE_SCHEMA} from '../source/ai/r125-v4f-floorplate-author-ir.mjs';
import {WING_SCHEMA,compileWingAuthorIntent} from '../source/ai/r125-v4e-wing-author-ir.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=x=>{throw Error('R125_V4E_CROSS_GENRE_'+x);};
const CASES=[
 {id:'housing',title:'SYNTHETIC small home with a public-facing court',
  brief:'Compact home with arrival, shared work and a daylight outdoor meeting court.',
  entrance:'Welcoming domestic entrance and family circulation',
  room:'Shared family work and reading room',
  open:'Open air family meeting garden',
  features:['Home service and reception desk','Shared living and reading table','Outdoor gathering bench'],
  link:'west',court:'south',roof:'ridgeX',annex:'shedZ',sectionRoom:'welcome',sectionCorner:'NE',
  materials:{floor:'wood',wall:'concrete',roof:'wood',public:'stone'}},
 {id:'shop',title:'SYNTHETIC community retail and open public yard',
  brief:'A sales and local crafts facility with customer arrival and community forecourt.',
  entrance:'Shop arrival and public customer service',
  room:'Retail workshop and independent product display',
  open:'Public courtyard and outdoor product events',
  features:['Visitor counter and payment surface','Product preparation and display bench','Public outdoor seating'],
  link:'east',court:'south',roof:'shedZ',annex:'ridgeZ',sectionRoom:'welcome',sectionCorner:'NW',
  materials:{floor:'stone',wall:'stone',roof:'metal',public:'concrete'}},
 {id:'research',title:'SYNTHETIC civic research and outdoor forum',
  brief:'A research collaboration building and outdoor presentation court.',
  entrance:'Research reception and equipment distribution',
  room:'Instrument testing and collaboration laboratory',
  open:'Outdoor science dialogue and open air assembly',
  features:['Scientific briefing station','Shared instrument testing surface','Outdoor science presentation plinth'],
  link:'south',court:'east',roof:'ridgeZ',annex:'shedX',sectionRoom:'welcome',sectionCorner:'NW',
  materials:{floor:'concrete',wall:'metal',roof:'metal',public:'stone'}},
 {id:'gallery',title:'SYNTHETIC small art gallery and event plaza',
  brief:'A public art learning and exhibition building with a genuine outdoor program.',
  entrance:'Visitor welcome and art orientation gallery',
  room:'Studio gallery and participatory art teaching',
  open:'Outdoor art gatherings and event court',
  features:['Gallery information and welcome','Art learning and demonstration podium','Event seating and artwork plinth'],
  link:'west',court:'east',roof:'shedX',annex:'ridgeX',sectionRoom:'learning',sectionCorner:'NW',
  materials:{floor:'stone',wall:'concrete',roof:'metal',public:'accent'}},
 {id:'station',title:'SYNTHETIC local transit hub and outdoor square',
  brief:'An arrival hall and staffed travel service with a public open waiting square.',
  entrance:'Transit entrance with orientation and waiting',
  room:'Ticketing and traveler service operations',
  open:'Public open-air transit meeting plaza',
  features:['Timetable and traveler orientation counter','Ticket and traveler service workplace','Outdoor commuter seating'],
  link:'east',court:'west',roof:'ridgeX',annex:'shedZ',sectionRoom:'learning',sectionCorner:'NE',
  materials:{floor:'concrete',wall:'stone',roof:'wood',public:'accent'}}
];
const reserved=['housing','shop','research','gallery','station'];
// Explicit independent SYNTHETIC author choices, NEVER per-genre HOST geometry.
// Former loggia corner choices would damage original two-wide public access
// when reused for FULL-height principal massing; do not silently repair them.
const MASSING_AUTHOR_SAMPLES={
 housing:{spaceId:'welcome',corner:'NE'},
 shop:{spaceId:'learning',corner:'NE'},
 research:{spaceId:'learning',corner:'SW'},
 gallery:{spaceId:'learning',corner:'NW'},
 station:{spaceId:'learning',corner:'NE'}
};
const CONTOUR_AUTHOR_SAMPLES={
 housing:[6,9,7],shop:[7,9,6],research:[6,8,9],
 gallery:[9,6,7],station:[7,9,6]
};
const FLOORPLATE_AUTHOR_SAMPLES={
 housing:{spaceId:'learning',corner:'NW',width:7,depth:7},
 shop:{spaceId:'learning',corner:'SE',width:7,depth:7},
 research:{spaceId:'learning',corner:'SE',width:7,depth:7},
 gallery:{spaceId:'learning',corner:'SW',width:7,depth:7},
 station:{spaceId:'learning',corner:'SE',width:7,depth:7}
};
const ATRIUM_AUTHOR_SAMPLES={
 housing:{spaceId:'welcome',offsetX:4,offsetZ:7,
  width:12,depth:12,lift:9,roofForm:'ridgeX'},
 shop:{spaceId:'welcome',offsetX:5,offsetZ:5,
  width:14,depth:14,lift:9,roofForm:'ridgeZ'},
 research:{spaceId:'welcome',offsetX:5,offsetZ:5,
  width:14,depth:14,lift:10,roofForm:'shedX'},
 gallery:{spaceId:'welcome',offsetX:5,offsetZ:5,
  width:14,depth:14,lift:8,roofForm:'shedZ'},
 station:{spaceId:'welcome',offsetX:5,offsetZ:5,
  width:14,depth:14,lift:11,roofForm:'ridgeX'}
};
export function syntheticFiveGenreAuthorCases(){
 return CASES.map(c=>{
  const x=makeV4DCompactSynthetic();
  x.schema=RANKED_SCHEMA;
  x.id='author-cross-'+c.id+'-study';
  x.title=c.title;x.brief=c.brief;x.materials={...c.materials};
  const [a,b,sky]=x.spaces;
  a.purpose=c.entrance;b.purpose=c.room;sky.purpose=c.open;
  a.feature=c.features[0];b.feature=c.features[1];sky.feature=c.features[2];
  a.roof=c.roof;b.roof=c.annex;
  b.attach={to:a.id,side:c.link,shift:0};
  sky.attach={to:a.id,side:c.court,shift:0};
  a.facade=c.id==='research'?'glass':'wall';
  for(const [i,s] of x.spaces.entries()){
   delete s.windowSide;
   s.windowPriority=s.kind==='sky'?null:
    (i===0?['north','south','east','west']:['south','east','north','west']);
  }
  const wing={spaceId:'learning',
   side:c.id==='shop'?'north':c.id==='research'?'west':c.link,
   start:4,span:12,reach:7,roofY:9,purpose:c.open};
  return {genre:c.id,source:x,
   authoredSection:{spaceId:c.sectionRoom,corner:c.sectionCorner,recessDepth:6},
   authoredMassing:{...MASSING_AUTHOR_SAMPLES[c.id],
    cutWidth:7,cutDepth:7,publicAccessSide:'X'},
   authoredWing:wing,
   authoredContourWing:{...wing,reach:9,
    outline:CONTOUR_AUTHOR_SAMPLES[c.id].slice()},
   authoredFloorplate:structuredClone(FLOORPLATE_AUTHOR_SAMPLES[c.id]),
   authoredAtrium:structuredClone(ATRIUM_AUTHOR_SAMPLES[c.id])};
 });
}
export function exportV4ECrossGenreSource(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||fs.existsSync(folder)||
  !fs.existsSync(path.dirname(folder))||folder===ROOT||folder.startsWith(ROOT+path.sep))
  fail('OUTPUT_MUST_BE_NEW_OUTSIDE_REPO');
 const samples=syntheticFiveGenreAuthorCases();
 if(samples.length!==reserved.length||samples.some((s,i)=>s.genre!==reserved[i]))
  fail('FIVE_GENRE_CONTRACT');
 const results=samples.map(s=>compileRankedExteriorIntent(s.source));
 const hashes=results.map(r=>r.b143.geometrySha256);
 if(new Set(hashes).size!==5)fail('GENRE_GEOMETRY_NOT_DISTINCT');
 if(results.some(r=>r.b143.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  r.b143.sourceRoutes.zones.some(z=>!z.reachedFromEntrance)||
  r.worldWrites!==0||r.worldContacts!==0||
  r.readiness!=='NOT_PREPARED'||r.constructionApproved!==false||
  r.executionAllowed!==false||r.BuildPlan.operations.length!==0||
  r.gates.length!==9||r.gates.some(x=>x!=='BLOCKED')||
  r.rankedPhysicalGlazingSourceProof.verifiedPanelGlassCells!==36||
  r.rankedPhysicalGlazingSourceProof.verifiedImmediateInwardAirCells!==36||
  r.rankedPhysicalGlazingSourceProof.verifiedImmediateOutwardAirCells!==36))
  fail('FUNCTION_SOURCE_OR_WORLD_SAFETY');
 const sectioned=samples.map(s=>compileAuthoredPublicLoggia(s.source,s.authoredSection));
 if(sectioned.some(s=>s.sectionedRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  s.trueSectionSourceWitness.actualDiagonalWallCells<30||
  s.worldWrites!==0||s.readiness!=='NOT_PREPARED'))
  fail('NONRECT_SECTION_SOURCE_FAIL_CLOSED');
 const massing=samples.map(s=>compileAuthoredPrimaryMassingVoid(s.source,s.authoredMassing));
 const visibility=massing.map((m,i)=>auditB143ProjectedVisibility(
  results[i].b143.compiled.primitives,m.b143Compiled.primitives));
 if(visibility.some(v=>v.views.find(x=>x.face==='roof').depthChangedCells<1))
  fail('MASSING_ROOF_HEIGHT_DIFFERENCE_NOT_VISIBLE');
 const wings=samples.map(s=>{
  try{return compileAuthoredExteriorWing(s.source,s.authoredMassing,s.authoredWing);}
  catch(e){fail('SYNTHETIC_WING_'+s.genre+'_'+String(e.message));}
 });
 const fullRectangleControls=samples.map(s=>compileAuthoredExteriorWing(
  s.source,s.authoredMassing,{...s.authoredWing,reach:9}));
 const contoured=samples.map(s=>{
  try{return compileAuthoredExteriorWing(s.source,s.authoredMassing,s.authoredContourWing);}
  catch(e){fail('SYNTHETIC_CONTOUR_'+s.genre+'_'+String(e.message));}
 });
 const contourAudit=contoured.map((c,i)=>auditB143ProjectedVisibility(
  fullRectangleControls[i].b143Compiled.primitives,c.b143Compiled.primitives));
 if(contoured.some((c,i)=>!c.sourceWingWitness.authorContourExplicit||
   c.sourceWingWitness.actualVerifiedDistinctStepDepths<2||
   c.sourceWingWitness.physicallyVerifiedSupportPostCount<4||
   contourAudit[i].views.find(v=>v.face==='roof').silhouetteChangedCells<12))
  fail('REAL_NONRECTANGULAR_OUTER_CONTOUR_NOT_VERIFIED');
 const wingAuthors=samples.map(s=>({...structuredClone(s.source),
  schema:WING_SCHEMA,massing:structuredClone(s.authoredMassing),
  wing:structuredClone(s.authoredContourWing)}));
 const floorplates=samples.map((s,i)=>{
  try{return compileAuthoredCoveredFloorplateSetback(wingAuthors[i],s.authoredFloorplate);}
  catch(e){fail('SYNTHETIC_COVERED_FLOORPLATE_'+s.genre+'_'+String(e.message));}
 });
 if(floorplates.some(f=>f.actualSourceWitness.entire3dRemovedColumns<36||
  f.actualSourceWitness.roofSilhouetteComparison.views
   .find(v=>v.face==='roof').silhouetteChangedCells<36||
  f.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||f.worldWrites!==0))
  fail('REAL_NONRECTANGULAR_COVERED_ROOM_NOT_VERIFIED');
 // A separate independent synthetic author changes the chosen SKY corner,
 // allowing the FIRST reception building to own its REAL nonrectangular floor.
 const rootHousing=structuredClone(wingAuthors[0]);
 rootHousing.massing={spaceId:'learning',corner:'NW',
  cutWidth:7,cutDepth:7,publicAccessSide:'X'};
 const rootBefore=compileWingAuthorIntent(rootHousing);
 const rootMain=compileAuthoredCoveredFloorplateSetback(rootHousing,
  {spaceId:'welcome',corner:'NE',width:7,depth:7});
 if(!rootMain.actualSourceWitness.rootMainRoomModified||
  rootMain.actualSourceWitness.roofSilhouetteComparison.views
   .find(v=>v.face==='roof').silhouetteChangedCells<49||
  rootMain.worldWrites!==0)fail('ROOT_RECEPTION_FLOORPLATE_NOT_REAL');
 const floorplateAuthors=samples.map((s,i)=>({
  ...structuredClone(wingAuthors[i]),schema:FLOORPLATE_SCHEMA,
  floorplate:structuredClone(s.authoredFloorplate)
 }));
 const atriums=samples.map((s,i)=>{
  try{return compileAuthoredTallPublicHall(floorplateAuthors[i],s.authoredAtrium);}
  catch(e){fail('SYNTHETIC_TALL_HALL_'+s.genre+'_'+String(e.message));}
 });
 if(atriums.some((v,i)=>
   v.actualSourceWitness.usableGroundLevelAtriumFloorColumns<
    samples[i].authoredAtrium.width*samples[i].authoredAtrium.depth||
   v.actualSourceWitness.actualGainAtHighestVoxel<5||
   v.actualSourceWitness.physicallyGlazedClerestoryCells<96||
   v.actualSourceWitness.verifiedTallHallCenterVerticalAirCells<18||
   v.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   v.worldWrites!==0||v.gates.length!==9))
  fail('REAL_DOUBLE_HEIGHT_FUNCTIONAL_HALL_NOT_PROVEN');
 const atriumReview=compileB143Gallery(atriums.map(x=>x.b143Design));
 const floorplateReview=compileB143Gallery(floorplates.map(f=>f.b143Design));
 const rootReview=compileB143Gallery([rootMain.b143Design]);
 const contourReview=compileB143Gallery(contoured.map(c=>c.b143Design));
 const wingReview=compileB143Gallery(wings.map(w=>w.b143Design));
 if(wings.some(w=>w.sourceWingWitness.independentRoofSilhouette.views
   .find(v=>v.face==='roof').silhouetteChangedCells<84))
  fail('REAL_OUTSIDE_SILHOUETTE_WING_NOT_VISIBLE');
 const massingReview=compileB143Gallery(massing.map(s=>s.b143Design));
 const sectionReview=compileB143Gallery(sectioned.map(s=>s.sectionedB143Design));
 const review=compileB143Gallery(results.map(r=>r.b143.design));
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const report={
  schema:'minecraftaibuilder-r125-v4e-five-synthetic-genres-true-b143-v1',
  studyPurpose:'CROSS_GENRE_COMMON_ENGINE_CAPABILITY_AND_ART_BOTTLENECK',
  authorProvenance:'FIVE_HAND_AUTHORED_SYNTHETIC_FIXTURES_NOT_LLM',
  genreSpecificHostGeometryTemplates:false,
  modelRequests:0,realModelGeneralization:'NOT_TESTED',sourceStatus:'SOURCE_TECH_ONLY',
  humanArt:'NOT_REVIEWED',preliminaryArt:'HOLD_PENDING_REAL_3D_REVIEW',
  minecraftWorldWrites:0,minecraftWalking:'NOT_TESTED',
  primaryMassingResearch:{
   status:'SOURCE_ONLY_HUMAN_ART_HOLD',
   authorProvenance:'SYNTHETIC_EXPLICIT_MASSING_PARAMETERS_NOT_REAL_LLM',
   genreSpecificPrescriptions:false,
   openToSkyVolumeCutNotFacadePaint:true,
   cases:massing.map((m,i)=>({
    genre:samples[i].genre,authoredVoid:m.authoredVoid,
    baselineGeometrySha256:m.baselineGeometrySha256,
    finalGeometrySha256:m.finalGeometrySha256,
    finalB143Voxels:m.b143Compiled.primitives.length,
    visibilityEvidence:visibility[i],
    sourceWitness:m.sourceMassingWitness,
    sourceRoutes:m.sourceRoutes.status,
    humanArt:m.architectureQuality,
    worldWrites:m.worldWrites
   }))
  },
  exteriorWingResearch:{
   status:'SOURCE_ONLY_HUMAN_ART_HOLD',
   newOutsideSupportedPublicWing:true,modelRuns:0,
   cases:wings.map((w,i)=>({genre:samples[i].genre,
    authoredWing:w.authoredWing,sourceWitness:w.sourceWingWitness,
    finalGeometrySha256:w.newGeometrySha256,
    sourceRoutes:w.sourceRoutes.status,worldWrites:w.worldWrites}))
  },
  contouredExteriorWingResearch:{
   status:'SOURCE_ONLY_HUMAN_ART_HOLD',
   authorProvenance:'SYNTHETIC_EXPLICIT_THREE_BAND_DEPTHS_NOT_QWEN',
   noGenreSpecificHostGeometryPrescriptions:true,
   fullDepthRectangleControlUsed:true,
   cases:contoured.map((c,i)=>({
    genre:samples[i].genre,authoredWing:c.authoredWing,
    actualB143VoxelCount:c.b143Compiled.primitives.length,
    realB143ContourWitness:c.sourceWingWitness,
    originalRectangleControlGeometrySha256:fullRectangleControls[i].newGeometrySha256,
    finalContourGeometrySha256:c.newGeometrySha256,
    actualRectangleVsContourVisibility:contourAudit[i],
    sourceRoutes:c.sourceRoutes.status,worldWrites:c.worldWrites,
    humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED'
   }))
  },
  coveredFloorplateResearch:{
   status:'SOURCE_ONLY_ARCHITECTURAL_ART_HOLD',
   originalModelCalls:0,modelProvenance:'INDEPENDENT_SYNTHETIC_AUTHORS_NOT_QWEN',
   sameEngineForEntryOrAnyCoveredRoom:true,
   cases:floorplates.map((f,i)=>({
    genre:samples[i].genre,authorSelection:samples[i].authoredFloorplate,
    beforeGeometrySha256:f.unmodifiedPriorGeometrySha256,
    afterGeometrySha256:f.finalGeometrySha256,
    trueB143SourceWitness:f.actualSourceWitness,
    sourceRoutes:f.sourceRoutes.status,worldWrites:f.worldWrites,
    humanArt:f.humanArt,realModel:f.realModel
   })),
   independentlyAuthoredEntryMainVolumeCase:{
    genre:'housing-main-entry-alternative-authorship',
    changedMassingSelection:rootHousing.massing,
    authorFloorplate:{spaceId:'welcome',corner:'NE',width:7,depth:7},
    originalGeometrySha256:rootBefore.b143.geometrySha256,
    finalGeometrySha256:rootMain.finalGeometrySha256,
    witness:rootMain.actualSourceWitness,
    sourceRoutes:rootMain.sourceRoutes.status,worldWrites:rootMain.worldWrites,
    art:'NOT_REVIEWED',model:'NOT_TESTED'
   }
  },
  trueInhabitedElevatedPublicHallResearch:{
   status:'SOURCE_ONLY_HUMAN_ART_HOLD',realModelCalls:0,
   genreSpecificTemplates:false,
   provenance:'INDEPENDENT_EXPLICIT_SYNTHETIC_5_AUTHOR_HEIGHT_CHOICES_NOT_LLM',
   architecturalSection:'REAL_OLD_ROOF_REMOVED_AND_NEW_HIGH_WALL_CLERESTORY_ROOF',
   noSecondStoreyOrEngineeringCertification:true,
   cases:atriums.map((a,i)=>({
    genre:samples[i].genre,authorSelection:samples[i].authoredAtrium,
    priorGeometrySha256:a.priorGeometrySha256,
    finalGeometrySha256:a.finalGeometrySha256,
    B143FinalVoxels:a.b143Compiled.primitives.length,
    B143FinalElements:a.b143Design.elements.length,
    realRoofWallGlassAirWitness:a.actualSourceWitness,
    sourceRoutes:a.sourceRoutes.status,worldWrites:a.worldWrites,
    humanArt:'NOT_REVIEWED',realQwen:'NOT_TESTED'
   }))
  },
  sectionResearch:{
   status:'SOURCE_TECH_ONLY_NOT_GENERAL_IRREGULAR_ARCHITECTURE',
   genreSpecificHostPrescriptions:false,
   authorSelectedCorners:true,
   sectionedCases:sectioned.map((s,i)=>({
    genre:samples[i].genre,authorSelection:s.authoredSection,
    oldGeometrySha256:s.unchangedV4EBaseGeometrySha256,
    newGeometrySha256:s.finalGeometrySha256,
    actualNewVoxels:s.sectionedCompiled.primitives.length,
    nonrectSourceWitness:s.trueSectionSourceWitness,
    physicalSourceRouteStatus:s.sectionedRoutes.status,
    worldWrites:0,art:'NOT_REVIEWED'
   }))
  },
  commonRepresentationLimitations:{
   originalAuthorGraphRoomFootprintsRectangular:true,
   nowSupportsOneModelAuthoredCoveredRoomFootprintSetback:true,
   arbitraryBuildingWideFreeformContourAndMultiStoryCirculationNotYetSupported:true,
   geometryShaDifferenceDoesNotCertifyArchitectureArt:true,
   newResearchPrimaryVolumeCornerOpenSkyVoid:true,
   newResearchPublicWingBeyondOriginalFootprint:true,
   newResearchThreeBandAuthorSpecifiedIrregularWing:true,
   trueNonrectangularSingleCoveredRoomFloorplateNowResearchSupported:true,
   mainEntryMainVolumeDemonstratedInAlternateIndependentSyntheticPlan:true,
   architecturalQualityStillNotCertified:true,
   trueAuthorSelectedDoubleHeightFunctionalHallNowResearchSupported:true,
   multiStoryFunctionalCirculationStillNotSupported:true,
   trueLocalQwenHeightArchitectureStillNotTested:true,
   existingDefaultArchitectureStillRectangular:true
  },
  cases:samples.map((s,i)=>({
   genre:s.genre,
   intentSha256:results[i].rankedAuthorSha256,
   sourceSha256:results[i].b143.sourceSha256,
   geometrySha256:hashes[i],
   totalFinalB143Voxels:results[i].b143.compiled.primitives.length,
   separateSpaceCount:results[i].plan.nodes.length,
   physicalSourceRoutes:results[i].b143.sourceRoutes.status,
   actualWindowProof:results[i].rankedPhysicalGlazingSourceProof,
   humanArt:'NOT_REVIEWED',realModel:'NOT_TESTED'
  })),
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]},worldContacts:0,worldWrites:0}
 };
 fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'index.html'),renderB143Html(review,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'massing.html'),
  renderB143Html(massingReview,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'sectioned.html'),
  renderB143Html(sectionReview,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'exterior-wing.html'),
  renderB143Html(wingReview,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'contoured-wing.html'),
  renderB143Html(contourReview,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'covered-floorplate.html'),
  renderB143Html(floorplateReview,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'tall-public-hall.html'),
  renderB143Html(atriumReview,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'main-entry-floorplate.html'),
  renderB143Html(rootReview,template),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'MAIN_ENTRY_FLOORPLATE_FIVE_VIEWS.svg'),
  actualOrthographicSvg(rootMain.b143Compiled.primitives),{flag:'wx'});
 fs.writeFileSync(path.join(folder,'MAIN_ENTRY_FLOORPLATE_VISIBLE_DELTA.svg'),
  renderB143ProjectedVisibilityDelta(
   rootBefore.b143.compiled.primitives,rootMain.b143Compiled.primitives),{flag:'wx'});
 for(const [i,r] of results.entries()){
  fs.writeFileSync(path.join(folder,'FINAL_B143_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(r.b143.compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'MASSING_B143_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(massing[i].b143Compiled.primitives),{flag:'wx'});
   fs.writeFileSync(path.join(folder,'MASSING_B143_'+samples[i].genre+'_VISIBILITY_DELTA.svg'),
    renderB143ProjectedVisibilityDelta(r.b143.compiled.primitives,
     massing[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'WING_B143_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(wings[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'WING_B143_'+samples[i].genre+'_SILHOUETTE_DELTA.svg'),
   renderB143ProjectedVisibilityDelta(massing[i].b143Compiled.primitives,
    wings[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'CONTOURED_WING_B143_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(contoured[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'CONTOUR_VS_RECTANGLE_B143_'+samples[i].genre+'_VISIBLE_DELTA.svg'),
   renderB143ProjectedVisibilityDelta(
    fullRectangleControls[i].b143Compiled.primitives,
    contoured[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'COVERED_FLOORPLATE_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(floorplates[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'COVERED_FLOORPLATE_'+samples[i].genre+'_VISIBLE_DELTA.svg'),
   renderB143ProjectedVisibilityDelta(
    contoured[i].b143Compiled.primitives,floorplates[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'ATRIUM_B143_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(atriums[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'ATRIUM_B143_'+samples[i].genre+'_VISIBLE_DELTA.svg'),
   renderB143ProjectedVisibilityDelta(
    floorplates[i].b143Compiled.primitives,atriums[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'SECTION_B143_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(sectioned[i].sectionedCompiled.primitives),{flag:'wx'});
 }
 fs.writeFileSync(path.join(folder,'FIVE_GENRE_SOURCE_ART_HOLD.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('ARGS');
  console.log(JSON.stringify(exportV4ECrossGenreSource(path.resolve(a[1])),null,2));
 }catch(e){console.error('R125_V4E_CROSS_GENRE_HOLD',String(e));process.exitCode=2;}
}
