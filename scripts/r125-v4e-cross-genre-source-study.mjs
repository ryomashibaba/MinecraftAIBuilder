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
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=x=>{throw Error('R125_V4E_CROSS_GENRE_'+x);};
const CASES=[
 {id:'housing',title:'SYNTHETIC small home with a public-facing court',
  brief:'Compact home with arrival, shared work and a daylight outdoor meeting court.',
  entrance:'Welcoming domestic entrance and family circulation',
  room:'Shared family work and reading room',
  open:'Open air family meeting garden',
  features:['Home service and reception desk','Shared living and reading table','Outdoor gathering bench'],
  link:'west',court:'south',roof:'ridgeX',annex:'shedZ',
  materials:{floor:'wood',wall:'concrete',roof:'wood',public:'stone'}},
 {id:'shop',title:'SYNTHETIC community retail and open public yard',
  brief:'A sales and local crafts facility with customer arrival and community forecourt.',
  entrance:'Shop arrival and public customer service',
  room:'Retail workshop and independent product display',
  open:'Public courtyard and outdoor product events',
  features:['Visitor counter and payment surface','Product preparation and display bench','Public outdoor seating'],
  link:'east',court:'south',roof:'shedZ',annex:'ridgeZ',
  materials:{floor:'stone',wall:'stone',roof:'metal',public:'concrete'}},
 {id:'research',title:'SYNTHETIC civic research and outdoor forum',
  brief:'A research collaboration building and outdoor presentation court.',
  entrance:'Research reception and equipment distribution',
  room:'Instrument testing and collaboration laboratory',
  open:'Outdoor science dialogue and open air assembly',
  features:['Scientific briefing station','Shared instrument testing surface','Outdoor science presentation plinth'],
  link:'south',court:'east',roof:'ridgeZ',annex:'shedX',
  materials:{floor:'concrete',wall:'metal',roof:'metal',public:'stone'}},
 {id:'gallery',title:'SYNTHETIC small art gallery and event plaza',
  brief:'A public art learning and exhibition building with a genuine outdoor program.',
  entrance:'Visitor welcome and art orientation gallery',
  room:'Studio gallery and participatory art teaching',
  open:'Outdoor art gatherings and event court',
  features:['Gallery information and welcome','Art learning and demonstration podium','Event seating and artwork plinth'],
  link:'west',court:'east',roof:'shedX',annex:'ridgeX',
  materials:{floor:'stone',wall:'concrete',roof:'metal',public:'accent'}},
 {id:'station',title:'SYNTHETIC local transit hub and outdoor square',
  brief:'An arrival hall and staffed travel service with a public open waiting square.',
  entrance:'Transit entrance with orientation and waiting',
  room:'Ticketing and traveler service operations',
  open:'Public open-air transit meeting plaza',
  features:['Timetable and traveler orientation counter','Ticket and traveler service workplace','Outdoor commuter seating'],
  link:'east',court:'west',roof:'ridgeX',annex:'shedZ',
  materials:{floor:'concrete',wall:'stone',roof:'wood',public:'accent'}}
];
const reserved=['housing','shop','research','gallery','station'];
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
  return {genre:c.id,source:x};
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
  commonRepresentationLimitations:{
   allSpaceFootprintsAxisAlignedRectangles:true,
   noModelAuthoredNonrectangularEnvelopeOrMultiStoryCirculation:true,
   geometryShaDifferenceDoesNotCertifyArchitectureArt:true
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
 for(const [i,r] of results.entries()){
  fs.writeFileSync(path.join(folder,'FINAL_B143_'+samples[i].genre+'_FIVE_VIEWS.svg'),
   actualOrthographicSvg(r.b143.compiled.primitives),{flag:'wx'});
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
