/**
 * R185 matched R184 public-arrival quality research.
 * Two genuinely different geometric modifications, identical abstract
 * public + focused + support semantic program. Every input SYNTHETIC.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R184_EXPLICIT_STATIC_CHOICES,makeR184ResearchHypothesis}
 from './r184-composition-options.mjs';
import {compileR184Hypothesis} from '../source/ai/r184-composition-grammar.mjs';
import {R185_SCHEMA,compileR185PublicExperience}
 from '../source/ai/r185-public-experience.mjs';
import {verifyCompiled} from '../source/ai/b143-building-dsl.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';

const fail=s=>{throw Error('R185_REVIEW_'+s);};
const safe=x=>x.readiness==='NOT_PREPARED'&&
 x.constructionApproved===false&&x.executionAllowed===false&&
 x.worldContacts===0&&x.worldWrites===0&&
 x.gates.length===9&&x.gates.every(v=>v==='BLOCKED')&&
 x.BuildPlan.operations.length===0;
export const R185_EXPLICIT_RESEARCH_CHOICES=Object.freeze([
 {id:'curved-public-court',grammar:'inhabited-rotunda',publicSpace:'central-court'},
 {id:'elevated-crossing',grammar:'elevated-crossing',publicSpace:'underpass'}
]);
export function makeR185SyntheticReply(choice){
 const old=R184_EXPLICIT_STATIC_CHOICES.find(x=>x.id===choice?.id);
 if(!old||old.grammar!==choice.grammar||
  old.publicSpace!==choice.publicSpace)
  fail('RESEARCH_CHOICES_ONLY');
 const base=makeR184ResearchHypothesis(old);
 return {schema:R185_SCHEMA,base,experience:{
  entranceAxis:'south-to-north',entranceWidth:4,
  publicSpace:choice.publicSpace,targetUseId:'assembly'}};
}
export function buildR185PublicExperienceReview(){
 const cases=R185_EXPLICIT_RESEARCH_CHOICES.map(choice=>{
  const reply=makeR185SyntheticReply(choice),raw=JSON.stringify(reply);
  const before=compileR184Hypothesis(JSON.stringify(reply.base));
  const after=compileR185PublicExperience(raw);
  const exp=after.publicExperience;
  if(!safe(before)||!safe(after)||
   !verifyCompiled(before.design,before.compiled)||
   !verifyCompiled(after.design,after.compiled)||
   exp.actualSourceGraphStatus!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
   !exp.actualSourceGraphWitness||
   exp.directTwoWideGroundedAirCells<40||
   after.comparison.trueVoxelSymmetricDifferenceRatio<0.20||
   exp.furnishedRoomAccess!=='NOT_TESTED'||
   exp.upperFloorTraversal!=='NOT_TESTED'||
   after.modelCalls!==0||
   after.artStatus!=='ART_HOLD_HUMAN_REVIEW_REQUIRED'||
   after.originalRawIR!==raw)
   fail('PHYSICAL_SOURCE_OR_UNPROVEN_ACCESS_'+choice.id);
  return {id:choice.id,name:reply.base.title,
   previous:before,now:after,
   audit:{id:choice.id,grammar:choice.grammar,
    previousHash:before.compiled.geometrySha256,
    currentHash:after.compiled.geometrySha256,
    actualPreviousVoxels:before.compiled.primitives.length,
    actualCurrentVoxels:after.compiled.primitives.length,
    sourceVoxelDifferenceRatio:after.comparison.trueVoxelSymmetricDifferenceRatio,
    supportedActualTwoWideAirCells:exp.directTwoWideGroundedAirCells,
    actualGroundPublicRouteReached:exp.actualSourceGraphStatus,
    publicTargetWitness:exp.actualSourceGraphWitness,
    newSourceModelCalls:0,provenance:'STATIC_SYNTHETIC',
    upperFloorTraversal:'NOT_TESTED',usableRooms:'NOT_TESTED',
    minecraftWalking:'NOT_TESTED',art:'ART_HOLD',
    readiness:'NOT_PREPARED',gates:Array(9).fill('BLOCKED'),
    BuildPlan:{operations:[]},worldContacts:0,worldWrites:0}};
 });
 if(cases.length!==2||new Set(cases.map(c=>c.now.compiled.geometrySha256)).size!==2)
  fail('DUPLICATED_GEOMETRIES');
 const fingerprints=cases.map(c=>c.now.originalRawIR);
 if(new Set(fingerprints).size!==2)fail('NO_AUTHORED_VARIATION');
 return {schema:'r185-matched-public-experience-source-review-v1',
  totalResearchForms:2,realModelCalls:0,
  totalWorldWrites:0,aestheticStatus:'ART_HOLD',cases};
}
export function saveR185PublicExperienceReview(out){
 if(typeof out!=='string'||!out||fs.existsSync(out))
  fail('OUTPUT_MUST_BE_NEW');
 const report=buildR185PublicExperienceReview(),
  root=path.dirname(fileURLToPath(import.meta.url)),target=path.resolve(out);
 const template=fs.readFileSync(path.join(root,'../source/ai/b143-viewer-template.html'),'utf8');
 const files=new Map();
 for(const c of report.cases)
  for(const [v,result] of [['r184',c.previous],['r185',c.now]]){
   const name=c.id+'-'+v,design=result.design,compiled=result.compiled;
   files.set(name+'.html',renderB143Html(compileB143Gallery([design]),template));
   for(const side of ['front','rear','east','west','roof'])
    files.set(name+'-'+side+'.svg',renderR164Elevation(compiled,design,side));
  }
 files.set('R185_SOURCE_QA.json',JSON.stringify({
  ...report,cases:report.cases.map(c=>c.audit)
 },null,2)+'\n');
 files.set('index.html','<!doctype html><html lang="ja"><meta charset="utf-8">'+
  '<title>R185 public experience against R184 original source</title>'+
  '<style>body{background:#152638;color:#ebf3fb;font:15px/1.55 system-ui;'+
  'padding:22px}section{background:#294358;padding:14px;margin:16px 0}'+
  '.compare{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
  'iframe{width:100%;height:430px;border:1px solid #89a2b0}img{width:19%;margin:.5%}</style>'+
  '<h1>R185 — arrival path, public space and structural legibility</h1>'+
  '<p>STATIC SYNTHETIC physical B143 review. NOT actual Qwen/Gemma.'+
  ' Ground public route SOURCE audit only; enclosed rooms, furniture and upper-floor movement NOT TESTED.'+
  ' ART HOLD / no Minecraft world writes.</p>'+
  report.cases.map(c=>'<section><h2>'+c.name+'</h2><div class="compare">'+
   [['r184',c.previous],['r185',c.now]].map(([id,p])=>
    '<article><h3>'+id.toUpperCase()+' — '+p.compiled.primitives.length+
    ' real voxels</h3><iframe loading="lazy" src="'+c.id+'-'+id+'.html"></iframe>'+
    ['front','rear','east','west','roof'].map(side=>'<img loading="lazy" src="'+
     c.id+'-'+id+'-'+side+'.svg" alt="'+side+'">').join('')+'</article>').join('')+
   '</div></section>').join(''));
 fs.mkdirSync(target,{recursive:false});
 for(const [name,value] of files)
  fs.writeFileSync(path.join(target,name),value,{flag:'wx'});
 if(process.env.GITHUB_STEP_SUMMARY)
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   ['### R185 SOURCE-only human-scale public experience','**ART HOLD; STATIC SYNTHETIC; no local model or Minecraft calls.**',
   '| Study | R184 voxels | R185 voxels | Public grounded 2-wide axis cells |',
   '|---|---:|---:|---:|',
   ...report.cases.map(c=>'| '+c.id+' | '+c.audit.actualPreviousVoxels+
    ' | '+c.audit.actualCurrentVoxels+' | '+
    c.audit.supportedActualTwoWideAirCells+' |'),''].join('\n'));
 return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--out')fail('USAGE');
  const r=saveR185PublicExperienceReview(args[1]);
  console.log(JSON.stringify({cases:r.cases.length,worldWrites:0,realModelCalls:0}));
 }catch(e){console.error(String(e?.stack??e));process.exitCode=2}
}
