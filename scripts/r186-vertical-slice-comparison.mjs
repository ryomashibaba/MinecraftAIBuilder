/**
 * R186 source-only upper room + materialised 16-step staircase, matched
 * against ORIGINAL R185 elevated crossing, one synthetic program.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R184_EXPLICIT_STATIC_CHOICES,makeR184ResearchHypothesis}
 from './r184-composition-options.mjs';
import {R185_SCHEMA,compileR185PublicExperience}
 from '../source/ai/r185-public-experience.mjs';
import {R186_SCHEMA,compileR186VerticalSlice}
 from '../source/ai/r186-vertical-public-slice.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {renderB143Html,compileB143Gallery} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const fail=s=>{throw Error('R186_SLICED_COMPARISON_'+s);};
export function makeR186SyntheticReply(){
 const choice=R184_EXPLICIT_STATIC_CHOICES.find(c=>
  c.grammar==='elevated-crossing');
 if(!choice)fail('R184_SOURCE_NOT_FOUND');
 const base={schema:R185_SCHEMA,base:makeR184ResearchHypothesis(choice),
  experience:{entranceAxis:'south-to-north',entranceWidth:4,
   publicSpace:'underpass',targetUseId:'assembly'}};
 return {schema:R186_SCHEMA,base,slice:{
  sourceHall:'west-civic-hall',ascent:'straight-stair',
  upperUseId:'assembly',upperFloorY:17,serviceRole:'display-stand'}};
}
export function buildR186UpperGalleryReview(){
 const r=makeR186SyntheticReply(),
  baseline=compileR185PublicExperience(JSON.stringify(r.base)),
  result=compileR186VerticalSlice(JSON.stringify(r));
 if(!verifyCompiled(baseline.design,baseline.compiled)||
  !verifyCompiled(result.design,result.compiled)||
  result.verticalSourceAudit?.reachedAllRequestedZones!==true||
  result.verticalSourceAudit?.connectedTwoWideStairSteps!==16||
  result.verticalSourceAudit?.actualFurnishedServicePads!==1||
  result.verticalSourceAudit?.zoneWitnesses?.length!==2||
  result.verticalSourceAudit?.sourceRouteStatus!==
   'SOURCE_ROUTES_REACH_ALL_ZONES'||
  result.verticalSourceAudit?.sourceOnly!==true||
  result.artDecision!=='ART_HOLD_UNTIL_REAL_3D_CRITIQUE'||
  result.readiness!=='NOT_PREPARED'||result.worldWrites!==0||
  result.worldContacts!==0||result.constructionApproved!==false||
  result.executionAllowed!==false||
  !Array.isArray(result.gates)||result.gates.length!==9||
  result.gates.some(s=>s!=='BLOCKED')||
  result.BuildPlan?.operations?.length!==0||
  result.modelCalls!==0)
  fail('SAFETY_OR_GEOMETRIC_STAIR_PROOF_NOT_MET');
 return {schema:'r186-r185-matched-true-source-functional-slice-v1',
  baseline,result,sourceOnly:true,realModelCalls:0,
  minecraftWorldWrites:0,artStatus:'ART_HOLD',
  comparison:{
   matchedProgram:'assembly-focused-backstage',
   actualVoxelCountR185:baseline.compiled.primitives.length,
   actualVoxelCountR186:result.compiled.primitives.length,
   originalR185GeometryHash:baseline.compiled.geometrySha256,
   newR186GeometryHash:result.compiled.geometrySha256,
   verticalSourceAudit:result.verticalSourceAudit,
   realityLimits:['ONE_UPPER_ROOM_ONLY','ONE_STATIC_DISPLAY_ONLY',
    'NO_UPPER_MINECRAFT_PLAYER_PATH_VALIDATION',
    'NO_ENGINEERING_LOAD_CALCULATION',
    'OTHER_BUILDING_ROOMS_NOT_MODELED',
    'SOURCE_AESTHETIC_HOLD']
  }};
}
function stairSectionSvg(report){
 const s=report.result.verticalSourceAudit.ascendingSupportedPads;
 const w=16*28+80,h=17*19+55;
 const boxes=s.map(([x,y,z],i)=>{
  const px=38+i*28,py=18+(17-y)*19;
  return '<rect x="'+px+'" y="'+py+
   '" width="24" height="15" fill="#6fb6e3"/>'+
   '<text x="'+(px+5)+'" y="'+(py+12)+
   '" font-size="10" fill="#142030">'+y+'</text>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="16 actual B143 connected staircase standing pads" viewBox="0 0 '+w+' '+h+'">'+
  '<rect width="100%" height="100%" fill="#152336"/>'+
  '<text x="20" y="22" fill="#edf4fa" font-size="13">'+
  '16 strictly source-supported stair pad heights, y2 to y17 (not Minecraft game physics)</text>'+
  boxes+'</svg>';
}
export function saveR186UpperGalleryReview(folder){
 if(typeof folder!=='string'||!folder||fs.existsSync(folder))
  fail('OUTPUT_MUST_BE_NEW');
 const report=buildR186UpperGalleryReview(),
  root=path.dirname(fileURLToPath(import.meta.url)),
  template=fs.readFileSync(path.join(root,
   '../source/ai/b143-viewer-template.html'),'utf8'),
  dir=path.resolve(folder),files=new Map();
 for(const [id,product] of [['r185',report.baseline],['r186',report.result]]){
  files.set(id+'.html',renderB143Html(
   compileB143Gallery([product.design]),template));
  for(const view of ['front','rear','east','west','roof'])
   files.set(id+'-'+view+'.svg',
    renderR164Elevation(product.compiled,product.design,view));
 }
 files.set('r186-stair-source-section.svg',stairSectionSvg(report));
 files.set('R186_SOURCE_QA.json',JSON.stringify({
  schema:report.schema,sourceOnly:true,realModelCalls:0,
  minecraftWorldWrites:0,artStatus:report.artStatus,
  ...report.comparison},null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R186 real upper room & supported stair source comparison</title>'+
  '<style>body{font:15px/1.55 system-ui;background:#152536;color:#edf4ff;padding:20px}'+
  '.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{background:#2d465a;padding:12px}'+
  'iframe{width:100%;height:510px;border:1px solid #718a9b}img{width:19%;margin:.5%}'+
  '.note{background:#3b4f60;padding:12px}</style>'+
  '<h1>R186 — one genuinely enclosed and connected upper display gallery</h1>'+
  '<p class="note">STATIC SYNTHETIC source research. ART HOLD. Exactly one upper room with one display.'+
  ' Ground stair & upper entry physically reached using the 2-wide B143/R125 SOURCE graph.'+
  ' Minecraft player physics, full building services, load safety and real LLM-generated design NOT VERIFIED.</p>'+
  '<div class="pair">'+[['r185',report.baseline],['r186',report.result]].map(([id,p])=>
   '<article><h2>'+id.toUpperCase()+' — '+p.compiled.primitives.length+
   ' B143 voxels</h2><iframe loading="lazy" src="'+id+'.html"></iframe>'+
   ['front','rear','east','west','roof'].map(v=>'<img src="'+id+'-'+v+
    '.svg" alt="'+v+'">').join('')+'</article>').join('')+
  '</div><h2>16-step material and two-wide climbing source witness</h2>'+
  '<img style="width:100%" src="r186-stair-source-section.svg" alt="Stair pads source witness">');
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,content] of files)
  fs.writeFileSync(path.join(dir,name),content,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R186 one upper room connected by true physical B143 stair',
    '**STATIC SYNTHETIC only; ART HOLD; zero Minecraft writes.**',
    '- Stair tread support/clear: 16 levels, y2 through y17',
    '- R125 verified public doorway -> ground underpass -> upper room -> one display service',
    '- Other rooms, real human player movement and structural load: NOT TESTED',
    '- B143 true voxels before: '+report.comparison.actualVoxelCountR185,
    '- B143 true voxels after: '+report.comparison.actualVoxelCountR186,
    ''].join('\n'));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  const result=saveR186UpperGalleryReview(args[1]);
  console.log(JSON.stringify({sourceOnly:true,worldWrites:0,
   modelCalls:0,stairSteps:result.result.verticalSourceAudit.connectedTwoWideStairSteps}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2;}
}
