/**
 * R190-P offline source-only comparison, SYNTHETIC authored IR.
 * A functional roof/window compiler proof, NOT a live Qwen/Gemma proposal,
 * NOT a new human-accepted architecture, NOT a daylight calculation.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R190_STATIC_SYNTHETIC_CASES} from './r190-semantic-fixtures.mjs';
import {compileR190SemanticPlan} from '../source/ai/r190-semantic-massing.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export function buildR190PGlazingComparison({out='r190p-synthetic-glazing-comparison'}={}){
 const target=path.resolve(out);
 if(fs.existsSync(target))throw Error('R190P_REFUSE_EXISTING_OUTPUT');
 if(!fs.existsSync(path.dirname(target)))throw Error('R190P_OUTPUT_PARENT_MISSING');
 const basic=structuredClone(R190_STATIC_SYNTHETIC_CASES[1]);
 const glazed=structuredClone(basic);
 glazed.id='r190p-synthetic-glazed-shop';
 glazed.title='SYNTHETIC MODEL-SHAPED WINDOW RESEARCH (not real Qwen output)';
 glazed.glazedOpenings=[{spaceId:'showroom',face:'south',
  offset:3,baseY:6,width:4,height:3}];
 const base=compileR190SemanticPlan(basic),
  candidate=compileR190SemanticPlan(glazed);
 if(base.worldWrites!==0||candidate.worldWrites!==0||
  base.worldContacts!==0||candidate.worldContacts!==0||
  !candidate.audit.allProgramSpacesReachable||
  candidate.audit.realGlazingCells!==12||
  candidate.compiled.stats.layerCounts.glass!==12||
  base.compiled.stats.layerCounts.glass!==0||
  candidate.compiled.geometrySha256===base.compiled.geometrySha256)
  throw Error('R190P_UNVERIFIED_GLAZING_COMPARISON');
 const gallery=compileB143Gallery([base.design,candidate.design]);
 if(gallery.geometryHashes[0]!==base.compiled.geometrySha256||
  gallery.geometryHashes[1]!==candidate.compiled.geometrySha256)
  throw Error('R190P_SOURCE_HASH_MISMATCH');
 const template=fs.readFileSync(path.resolve(here,
  '../source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(gallery,template);
 const manifest={
  schema:'minecraftaibuilder-r190p-synthetic-glazing-comparison-v1',
  sourceOnly:true,syntheticAuthoring:true,genuineModelRun:false,
  actualLocalModelCalls:0,modelAuthoredGlazingInThisTest:false,
  baselineSourceSha256:base.compiled.sourceSha256,
  baselineGeometrySha256:base.compiled.geometrySha256,
  glazedSourceSha256:candidate.compiled.sourceSha256,
  glazedGeometrySha256:candidate.compiled.geometrySha256,
  modelShapeChoice:'EXPLICIT_IN_SYNTHETIC_IR_NOT_HOST_TYPOLOGY',
  originalRoomProgramPreserved:JSON.stringify(basic.spaces)===
   JSON.stringify(glazed.spaces),
  trueGlazingCells:candidate.audit.realGlazingCells,
  realExteriorWallCutAndGlass:candidate.audit.glazedOpenings,
  daylightQuality:'NOT_SIMULATED',wholeFacadeQuality:'NOT_EVALUATED',
  geometryIsNotArtAcceptance:true,art:'ART_HOLD',
  realMinecraftPlayerWalking:'NOT_TESTED',
  worldContacts:0,worldWrites:0,readiness:'NOT_PREPARED',
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
 };
 fs.mkdirSync(target);
 const write=(name,content)=>fs.writeFileSync(path.join(target,name),content,{flag:'wx'});
 write('R190P_SYNTHETIC_WINDOW_COMPARISON_3D.html',html);
 write('R190P_SYNTHETIC_COMPARISON_RECEIPT.json',
  JSON.stringify(manifest,null,2)+'\n');
 for(const [label,source] of [['NO_GLAZING',base],['MODEL_SHAPED_GLAZING',candidate]]){
  write('R190P_'+label+'_B143.json',
   JSON.stringify(source.design,null,2)+'\n');
  for(const dir of ['front','rear','west','east','roof'])
   write('R190P_'+label+'_'+dir+'.svg',
    renderR164Elevation(source.compiled,source.design,dir));
 }
 return {outputDirectory:target,...manifest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')throw Error('R190P_OUT_REQUIRED');
  console.log(JSON.stringify(buildR190PGlazingComparison({out:args[1]}),null,2));
 }catch(e){console.error('R190P_HOLD',String(e?.message??e));process.exitCode=1;}
}
