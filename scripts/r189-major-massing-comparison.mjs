/**
 * R189 high-level massing instead of repeating shallow facade holes.
 * A bounded synthetic author EXPLICITLY supplies 4 full-volume
 * reductions; the host audits true B143 roof height + R188 functions.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeR188SyntheticReply}
 from './r188-inhabited-frontage-comparison.mjs';
import {compileR188InhabitedFrontage}
 from '../source/ai/r188-inhabited-frontage.mjs';
import {R189_SCHEMA,compileR189MajorVolumeStudy}
 from '../source/ai/r189-major-massing.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html}
 from './b143-gallery-core.mjs';
import {renderR164Elevation}
 from './r164-exterior-audit.mjs';
const fail=s=>{throw Error('R189_GENUINE_VOLUME_REVIEW_'+s)};
const validSafe=r=>r?.readiness==='NOT_PREPARED'&&
 r.constructionApproved===false&&r.executionAllowed===false&&
 r.worldWrites===0&&r.worldContacts===0&&
 r.gates?.length===9&&r.gates.every(x=>x==='BLOCKED')&&
 r.BuildPlan?.operations?.length===0;
export const R189_AUTHORED_MASSING=[
 {sector:'west-public-front',origin:[6,10,9],size:[13,6,9]},
 {sector:'west-back-quiet',origin:[6,11,33],size:[13,5,6]},
 {sector:'east-public-front',origin:[31,12,8],size:[12,10,9]},
 {sector:'east-rear-high-court',origin:[31,16,33],size:[8,6,9]}
];
export function makeR189SyntheticReply(){
 return {schema:R189_SCHEMA,base:makeR188SyntheticReply(),
  majorMassing:{architecturalIntent:
   'low-public-front-central-occupied-high-back',
   volumes:structuredClone(R189_AUTHORED_MASSING)}};
}
export function buildR189MassingReview(){
 const q=makeR189SyntheticReply();
 const b=compileR188InhabitedFrontage(JSON.stringify(q.base)),
  a=compileR189MajorVolumeStudy(JSON.stringify(q));
 if(!validSafe(b)||!validSafe(a)||
  !verifyCompiled(b.design,b.compiled)||
  !verifyCompiled(a.design,a.compiled)||
  b.compiled.geometrySha256!==a.originalR188GeometrySha256||
  a.evidence?.rooflineRegions?.length!==4||
  a.evidence?.oldCellsChangedOutsideCallerBounds!==0||
  a.evidence?.materialChanged!==0||
  a.evidence?.trulyRemovedB143Cells<1200||
  !a.evidence?.everyOriginalR188FunctionSourceVerified||
  a.modelCalls!==0||
  a.modelAuthorship!=='STATIC_SYNTHETIC_CALLER_SOURCE_NOT_REAL_LLM'||
  a.artStatus!=='ART_HOLD_HUMAN_REVIEW_REQUIRED')
  fail('SOURCE_REGRESSION_OR_MASSING_HEIGHT_NOT_VERIFIED');
 return {schema:'r189-full-volume-massing-source-comparison-v1',
  previous:b,newMassing:a,
  facts:{
   authenticity:'STATIC_SYNTHETIC_EXPLICIT_FOUR_BODY_REGIONS',
   modelCalls:0,MinecraftWrites:0,
   originalB143VoxelCount:b.compiled.primitives.length,
   rebuiltB143VoxelCount:a.compiled.primitives.length,
   removedActualB143Cells:a.evidence.trulyRemovedB143Cells,
   protectedUnselectedB143CellMutations:0,
   frontAndRearTrueHeights:a.evidence.rooflineRegions.map(x=>({
    sector:x.sector,footprintCells:x.sampledTopPlanCells,
    visiblyLoweredCells:x.realRooflineCellsLoweredAtLeast4,
    proportion:x.proportionClearlyLowered,maxDrop:x.maximumActualHeightReduction
   })),
   originalFunctionalR188R187R186SourcePass:true,
   sourceInteriorProgram:'ONLY_ONE_UPPER_ROOM_PROVEN',
   structuralEngineering:'NOT_TESTED',
   gameWalking:'NOT_TESTED',
   aesthetic:'ART_HOLD',
   safety:{readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
    BuildPlan:{operations:[]},constructionApproved:false,
    executionAllowed:false,worldContacts:0,worldWrites:0}
  }};
}
export function saveR189MassingReview(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))
  fail('OUTPUT_MUST_BE_NEW');
 const r=buildR189MassingReview(),dir=path.resolve(out),
  root=path.dirname(fileURLToPath(import.meta.url)),
  template=fs.readFileSync(path.join(root,
   '../source/ai/b143-viewer-template.html'),'utf8'),files=new Map();
 for(const [id,p] of [['r188',r.previous],['r189',r.newMassing]]){
  files.set(id+'.html',renderB143Html(compileB143Gallery([p.design]),template));
  for(const side of ['front','rear','east','west','roof'])
   files.set(id+'-'+side+'.svg',renderR164Elevation(p.compiled,p.design,side));
 }
 const qa={...r.facts,schema:r.schema,
  callerInput:r.newMassing.rawSourceReply,
  originalR188GeometrySha256:r.previous.compiled.geometrySha256,
  R189NewGeometrySha256:r.newMassing.compiled.geometrySha256,
  fullBodyRegionHeightWitnesses:r.newMassing.evidence.rooflineRegions};
 files.set('R189_SOURCE_QA.json',JSON.stringify(qa,null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R189 full-building roofline reconstruction</title>'+
  '<style>body{background:#152738;color:#edf4ff;font:15px/1.55 system-ui;padding:20px}'+
  '.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{background:#2b465b;padding:12px}'+
  'iframe{width:100%;height:520px;border:1px solid #748e9f}img{width:19%;margin:.5%}</style>'+
  '<h1>R189 — 4 major regions with different actual volume heights</h1>'+
  '<p>REAL B143 voxels. Candidate body regions are static synthetic inputs, NOT Qwen/Gemma generation.'+
  ' All existing 16 step / one room / exhibit / daylit outdoor terrace / 3 public passages source-proven.'+
  ' Not a structurally certified, player-tested or ART PASS building. No Minecraft writes.</p>'+
  '<div class="pair">'+[['r188',r.previous],['r189',r.newMassing]].map(([id,p])=>
   '<article><h2>'+id.toUpperCase()+' — '+p.compiled.primitives.length+
   ' voxels</h2><iframe src="'+id+'.html"></iframe>'+
   ['front','rear','east','west','roof'].map(v=>'<img src="'+id+'-'+v+
    '.svg" alt="'+v+'">').join('')+'</article>').join('')+'</div>');
 fs.mkdirSync(dir,{recursive:false});
 for(const [file,val] of files)fs.writeFileSync(path.join(dir,file),val,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,[
   '### R189 large-scale roofline / volumetric hierarchy source study',
   '**STATIC SYNTHETIC, ART HOLD, no world writes / real LLM calls.**',
   '- Previous: '+r.facts.originalB143VoxelCount+' real B143 voxels',
   '- Reconfigured: '+r.facts.rebuiltB143VoxelCount+' voxels',
   '- Original true B143 cells removed inside declared regions: '+r.facts.removedActualB143Cells,
   '- Unintended old cells changed: 0',
   '- Original R188 functions: inherited physical audit PASS',
   ...r.facts.frontAndRearTrueHeights.map(x=>'- '+x.sector+': '+x.visiblyLoweredCells+
    '/'+x.footprintCells+' roof samples lower by 4+'),
   '- ART PASS and game collision / load safety not claimed',''
  ].join('\n'));
 return r;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--out')fail('USAGE');
  const r=saveR189MassingReview(a[1]);
  console.log(JSON.stringify({art:'ART_HOLD',
   B143Voxels:r.facts.rebuiltB143VoxelCount,worldWrites:0}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2}
}
