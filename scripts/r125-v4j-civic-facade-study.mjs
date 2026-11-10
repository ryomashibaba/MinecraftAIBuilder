/**
 * V4J: Five independently authored three-bay civic approach arcades.
 * Same universal B143 compiler. No genre template or remote model invocation.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MEZZANINE_SCHEMA,compileMezzanineAuthorIntent}
 from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {compileAuthoredCivicApproachArcade}
 from './r125-v4j-civic-arcade.mjs';
import {syntheticFiveAuthorMezzanineCases}
 from './r125-v4h-mezzanine-source-study.mjs';
import {actualOrthographicSvg}
 from './r125-v4e-source-art-review.mjs';
import {renderB143ProjectedVisibilityDelta}
 from './r125-v4e-visibility-delta.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4J_FACADE_STUDY_'+s);};
// Explicit SYNTHETIC authors choose substantially different roof heights /
// different materials / public purposes. Compiler uses NO genre-dependent
// logic, auto moves or repair rules.
const authors={
 housing:{width:12,depth:4,setback:1,roofline:[8,10,8],
  postMaterial:'wood',roofMaterial:'wood',serviceMaterial:'stone',
  purpose:'Family public porch and outdoor book exchange with covered community benches'},
 shop:{width:12,depth:4,setback:1,roofline:[8,12,9],
  postMaterial:'metal',roofMaterial:'metal',serviceMaterial:'wood',
  purpose:'Shopfront public market foyer and covered craft demonstration tables'},
 research:{width:12,depth:4,setback:1,roofline:[10,8,11],
  postMaterial:'metal',roofMaterial:'concrete',serviceMaterial:'stone',
  purpose:'Scientific community forum and under-roof interactive demonstrations'},
 gallery:{width:12,depth:4,setback:1,roofline:[9,12,10],
  postMaterial:'concrete',roofMaterial:'metal',serviceMaterial:'accent',
  purpose:'Covered forecourt for public art interpretation and hands-on creative activities'},
 station:{width:12,depth:4,setback:1,roofline:[11,9,8],
  postMaterial:'stone',roofMaterial:'wood',serviceMaterial:'metal',
  purpose:'Travel advice and accessible sheltered passenger information concourse'}
};
export function syntheticFiveV4JArcadeAuthors(){
 return syntheticFiveAuthorMezzanineCases().map(s=>({
  genre:s.genre,
  wholeBuilding:{...structuredClone(s.heightAuthor),
   schema:MEZZANINE_SCHEMA,mezzanine:structuredClone(s.mezzanine)},
  arcade:structuredClone(authors[s.genre])
 }));
}
export function exportV4JCivicFacadeStudy(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||
  fs.existsSync(folder)||!fs.existsSync(path.dirname(folder))||
  folder===ROOT||folder.startsWith(ROOT+path.sep))
  fail('FRESH_OUTSIDE_REPO_ONLY');
 const samples=syntheticFiveV4JArcadeAuthors();
 const baselines=samples.map(s=>compileMezzanineAuthorIntent(s.wholeBuilding));
 const after=samples.map(s=>compileAuthoredCivicApproachArcade(s.wholeBuilding,s.arcade));
 const caseReport=after.map((a,i)=>{
  const before=baselines[i],w=a.sourceWitness;
  if(a.priorGeometrySha256!==before.b143.geometrySha256||
   a.finalGeometrySha256===a.priorGeometrySha256||
   w.trueDistinctExteriorRoofCells!==samples[i].arcade.width*samples[i].arcade.depth||
   w.actualEightPhysicalSupportColumns!==8||
   w.actualTwoWorkstationCells!==4||
   w.realPublicFloorContinuity.width!==2||
   w.entranceToNewPublicZone.reachedFromEntrance!==true||
   w.preservedRealUpperPublicZone.reachedFromEntrance!==true||
   w.allFunctionsReachable!==true||
   w.genuineVisibleFiveViewDelta.views.find(v=>v.face==='roof')
    .depthChangedCells<48||
   a.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   a.worldWrites!==0||a.worldContacts!==0||
   a.gates.length!==9||a.gates.some(g=>g!=='BLOCKED'))
   fail('REAL_VISIBLE_ENTRY_PUBLIC_FUNCTION_NOT_PROVEN_'+samples[i].genre);
  return {genre:samples[i].genre,author:structuredClone(samples[i].arcade),
   originalGeometrySha256:before.b143.geometrySha256,
   finalGeometrySha256:a.finalGeometrySha256,
   originalB143Cells:before.b143.compiled.primitives.length,
   finalB143Cells:a.b143Compiled.primitives.length,
   finalB143Elements:a.b143Design.elements.length,
   physicallyVisibleFunctionalFrontArcade:w,
   art:'NOT_REVIEWED',realQwen:'NOT_TESTED',
   constructionApproved:false,worldWrites:0};
 });
 // The five author fixtures share the same core dimensions by construction.
 // A five-genre comparison without dimension diversity tests roof/style choices
 // but CANNOT isolate whether the generic HOST can author diverse main shells.
 // Derive this from the actual input, never infer it from the genre labels.
 const coreFootprints=samples.map(s=>({
  genre:s.genre,
  covered:s.wholeBuilding.spaces.filter(r=>r.kind==='covered').map(r=>({
   id:r.id,width:r.width,depth:r.depth,height:r.height,roof:r.roof
  }))
 }));
 const footprintSignatures=coreFootprints.map(s=>JSON.stringify(
  s.covered.map(({width,depth})=>[width,depth])));
 const distinctCoreDimensionPrograms=new Set(footprintSignatures).size;
 const report={schema:'r125-v4j-5-authored-functional-exterior-facade-study-v1',
  authorFootprintCoverage:{
   comparedGenres:coreFootprints.length,
   distinctCoreDimensionPrograms,
   coreFootprints,
   primaryShellDimensionDiversity:
    distinctCoreDimensionPrograms===1?'NOT_EXERCISED_BY_SYNTHETIC_FIXTURES':
    'EXERCISED_IN_SYNTHETIC_FIXTURES_NOT_REAL_MODEL',
   compilerCapabilityOrArtLimitationFromFiveGenreSimilarity:'NOT_DETERMINABLE',
   note:'Identical authored core footprints constrain the interpretation of cross-genre silhouette similarity. Do not label it a HOST expressivity failure.'
  },
  provenance:'INDEPENDENT_EXPLICIT_SYNTHETIC_AUTHORS_NOT_LOCAL_QWEN',
  compilerGenreSpecificStyling:false,modelRequests:0,
  previewStatus:'ART_HOLD_NOT_APPROVED',
  newPublicFunction:'TRUE_WALKABLE_2_WIDE_MAIN_ENTRANCE_TO_TWO_PUBLIC_SERVICE_POINTS',
  existingFunction:'OLD_RECEPTION_AND_UPSTAIRS_SERVICE_RETENTION_AND_SOURCE_REACH',
  visuallyDifferentFromV4H:'REAL_B143_FIVE_VIEW_DEPTH_CHANGE',
  supportsArchitectureBeautyCertification:false,
  requiresRealHuman3DReview:true,
  cases:caseReport,worldWrites:0,
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,BuildPlan:{operations:[]},
   gates:Array(9).fill('BLOCKED'),worldContacts:0,worldWrites:0}};
 fs.mkdirSync(folder);
 const gallery=compileB143Gallery(after.map(a=>a.b143Design));
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 fs.writeFileSync(path.join(folder,'V4J_TRUE_PUBLIC_FORECOURT_3D.html'),
  renderB143Html(gallery,template),{flag:'wx'});
 for(let i=0;i<samples.length;i++){
  const genre=samples[i].genre;
  fs.writeFileSync(path.join(folder,'V4J_'+genre+'_BEFORE_FIVE_VIEWS.svg'),
   actualOrthographicSvg(baselines[i].b143.compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'V4J_'+genre+'_AFTER_FIVE_VIEWS.svg'),
   actualOrthographicSvg(after[i].b143Compiled.primitives),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'V4J_'+genre+'_VISIBLE_FACADE_DELTA.svg'),
   renderB143ProjectedVisibilityDelta(baselines[i].b143.compiled.primitives,
    after[i].b143Compiled.primitives),{flag:'wx'});
 }
 fs.writeFileSync(path.join(folder,'V4J_TRUE_FORECOURT_SOURCE_ART_HOLD.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===
 path.resolve(fileURLToPath(import.meta.url))){
 if(!process.argv[2])throw Error('V4J_OUTPUT_FOLDER_REQUIRED');
 const r=exportV4JCivicFacadeStudy(path.resolve(process.argv[2]));
 console.log(JSON.stringify({cases:r.cases.length,provenance:r.provenance,
  art:r.previewStatus,worldWrites:r.worldWrites}));
}
