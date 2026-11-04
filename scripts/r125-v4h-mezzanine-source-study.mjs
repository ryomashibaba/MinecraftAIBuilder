/**
 * Independent R125 V4H synthetic SOURCE study: 5 author choices and true
 * 3D interior section evidence. NOT Qwen, Minecraft, or ART certification.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {syntheticFiveGenreAuthorCases}
 from './r125-v4e-cross-genre-source-study.mjs';
import {HEIGHT_SCHEMA,compileHeightAuthorIntent}
 from '../source/ai/r125-v4g-height-author-ir.mjs';
import {compileAuthoredPublicMezzanine}
 from '../source/ai/r125-v4h-authored-mezzanine.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {actualOrthographicSvg} from './r125-v4e-source-art-review.mjs';
import {actualB143MezzanineSectionSvg} from './r125-v4h-mezzanine-section.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=s=>{throw Error('R125_V4H_STUDY_'+s);};
const choices={
 housing:{side:'north',stairLane:'west',deckOffsetX:2,deckWidth:8,rise:7,
  purpose:'Elevated family learning and interactive community reading space'},
 shop:{side:'south',stairLane:'east',deckOffsetX:2,deckWidth:8,rise:7,
  purpose:'Public craft demonstration and shopping information balcony'},
 research:{side:'north',stairLane:'east',deckOffsetX:2,deckWidth:8,rise:7,
  purpose:'Scientific interpretation observation and researcher briefing gallery'},
 gallery:{side:'south',stairLane:'east',deckOffsetX:2,deckWidth:8,rise:7,
  purpose:'Public interpretive art teaching and participatory display mezzanine'},
 station:{side:'north',stairLane:'east',deckOffsetX:2,deckWidth:8,rise:7,
  purpose:'Elevated public transport guidance and information mezzanine'}
};
export function syntheticFiveAuthorMezzanineCases(){
 return syntheticFiveGenreAuthorCases().map(s=>({
  genre:s.genre,heightAuthor:{...structuredClone(s.source),schema:HEIGHT_SCHEMA,
   massing:structuredClone(s.authoredMassing),
   wing:structuredClone(s.authoredContourWing),
   floorplate:structuredClone(s.authoredFloorplate),
   atrium:structuredClone(s.authoredAtrium)},
  mezzanine:structuredClone(choices[s.genre])
 }));
}
export function exportV4HTrueMezzanineStudy(folder){
 if(typeof folder!=='string'||!path.isAbsolute(folder)||fs.existsSync(folder)||
  !fs.existsSync(path.dirname(folder))||folder===ROOT||folder.startsWith(ROOT+path.sep))
  fail('NEW_OUTSIDE_REPOSITORY_DIRECTORY_REQUIRED');
 const cases=syntheticFiveAuthorMezzanineCases();
 const before=cases.map(c=>compileHeightAuthorIntent(c.heightAuthor));
 const final=cases.map(c=>{
  try{return compileAuthoredPublicMezzanine(c.heightAuthor,c.mezzanine);}
  catch(e){fail('AUTHOR_'+c.genre+'_'+String(e.message));}
 });
 if(final.some((m,i)=>
  m.originalGeometrySha256!==before[i].b143.geometrySha256||
  m.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
  m.sourceWitness.connectedUpperProgram.reachedFromEntrance!==true||
  m.sourceWitness.connectedPublicService.reachableFromEntrance!==true||
  m.sourceWitness.physical2WideStairTreads<7||
  m.worldWrites!==0||m.worldContacts!==0||
  m.gates.length!==9||m.gates.some(x=>x!=='BLOCKED')))
  fail('FALSE_PHYSICAL_FUNCTION_OR_WORLD_GATE');
 const review=compileB143Gallery(final.map(x=>x.b143Design));
 const tpl=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const report={
  schema:'r125-v4h-true-multi-level-5-synthetic-authors-source-only-v1',
  provenance:'SYNTHETIC_EXPLICIT_FIVE_HUMAN_AUTHORS_NOT_LLM',
  realModelRuns:0,realModelGeneralization:'NOT_TESTED',
  humanArt:'NOT_REVIEWED',preliminaryArt:'ART_HOLD',
  minecraftWalking:'NOT_TESTED',worldWrites:0,
  oldHeightAuthorDefaultUnchanged:true,genreSpecificHostTemplates:false,
  cases:final.map((m,i)=>({genre:cases[i].genre,
   authorMezzanine:cases[i].mezzanine,
   previousGeometrySha256:m.originalGeometrySha256,
   currentGeometrySha256:m.finalGeometrySha256,
   actualB143VoxelCount:m.b143Compiled.primitives.length,
   actualB143ElementCount:m.b143Design.elements.length,
   trueB143MezzanineWitness:m.sourceWitness,
   sourceRoutes:m.sourceRoutes.status,
   realModel:'NOT_TESTED',worldWrites:m.worldWrites,art:'NOT_REVIEWED'
  })),
  safety:{readiness:'NOT_PREPARED',constructionApproved:false,
   executionAllowed:false,gates:Array(9).fill('BLOCKED'),
   BuildPlan:{operations:[]},worldContacts:0,worldWrites:0}
 };
 fs.mkdirSync(folder);
 fs.writeFileSync(path.join(folder,'mezzanine-3d.html'),
  renderB143Html(review,tpl),{flag:'wx'});
 for(let i=0;i<cases.length;i++){
  const {genre,heightAuthor,mezzanine}=cases[i];
  const a=heightAuthor.atrium,
   n=before[i].plan.nodes.find(x=>x.id===a.spaceId),
   x=final[i].sourceWitness.actualSectionPlaneX;
  const range={x,zStart:n.z+a.offsetZ,zEnd:n.z+a.offsetZ+a.depth-1,
   yMax:final[i].b143Design.bounds.height-2};
  fs.writeFileSync(path.join(folder,'STAIR_SECTION_BEFORE_'+genre+'.svg'),
   actualB143MezzanineSectionSvg(before[i].b143.compiled,{
    ...range,caption:'SYNTHETIC AUTHOR BEFORE upper floor - NOT real Qwen'}),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'STAIR_SECTION_AFTER_'+genre+'.svg'),
   actualB143MezzanineSectionSvg(final[i].b143Compiled,{
    ...range,caption:'SYNTHETIC AUTHOR REAL 2-WIDE STAIRS - ART HOLD'}),{flag:'wx'});
  fs.writeFileSync(path.join(folder,'MEZZANINE_FIVE_VIEWS_'+genre+'.svg'),
   actualOrthographicSvg(final[i].b143Compiled.primitives),{flag:'wx'});
 }
 fs.writeFileSync(path.join(folder,'V4H_TRUE_MEZZANINE_SOURCE_ART_HOLD.json'),
  JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===
 path.resolve(fileURLToPath(import.meta.url))){
 const out=process.argv[2];if(!out)throw Error('NEW_OUTPUT_DIR_REQUIRED');
 const r=exportV4HTrueMezzanineStudy(path.resolve(out));
 console.log(JSON.stringify({cases:r.cases.length,realModelRuns:0,worldWrites:0,
  art:r.preliminaryArt,output:path.resolve(out)}));
}
