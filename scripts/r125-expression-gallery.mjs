/**
 * R125 offline artistic comparison for the exact saved real Qwen 14B plan.
 * Three variants are deterministic COMPILER-PARAMETER demonstrations,
 * NOT additional real LLM outputs. No remote services or world commands.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan,auditArchitecturePlanCirculation,
 assessR125ProgramGeometry}
 from '../source/ai/r125-architecture-plan.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fail=x=>{throw Error('R125_EXPRESSION_GALLERY_'+x);};
const PLAN=new URL('./fixtures/r125-qwen14b-residential-2024a.json',import.meta.url);
const PINNED='46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271';
const CHOICES=[
 {label:'A: Original Qwen 14B · baseline',
  id:null,expression:null,
  provenance:'ACTUAL_QWEN14B_ORIGINAL_SEMANTIC_PLAN'},
 {label:'B: East setback · ridged roof · front fins',
  id:'lumina-ridge-fins',
  expression:{setbackSide:'east',setbackDepth:3,
   roofProfile:'ridge',roofAxis:'x',facadeLanguage:'fins'},
  provenance:'COMPILER_FORM_DEMONSTRATION_NOT_NEW_MODEL_OUTPUT'},
 {label:'C: Rear setback · sawtooth roof · side screen',
  id:'lumina-sawtooth-screen',
  expression:{setbackSide:'rear',setbackDepth:4,
   roofProfile:'sawtooth',roofAxis:'z',facadeLanguage:'screen'},
  provenance:'COMPILER_FORM_DEMONSTRATION_NOT_NEW_MODEL_OUTPUT'},
 {label:'D: No setback · transverse ridge · vertical fins',
  id:'lumina-ridge-cross',
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:'z',facadeLanguage:'fins'},
  provenance:'COMPILER_FORM_DEMONSTRATION_NOT_NEW_MODEL_OUTPUT'}
];

export function buildR125ExpressionComparison(){
 const original=JSON.parse(fs.readFileSync(PLAN,'utf8'));
 const baseline=compileArchitecturePlan(original);
 if(baseline.planSha256!==PINNED||
  baseline.compiled.primitives.length!==2620)
  fail('SAVED_REAL_QWEN_REFERENCE_DRIFT');
 const sources=[],rows=[],plans=[];
 for(const choice of CHOICES){
  const p=structuredClone(original);
  if(choice.expression){
   p.id=choice.id;
   p.title=choice.label;
   p.expression=structuredClone(choice.expression);
  }
  const r=compileArchitecturePlan(p);
  const circulation=auditArchitecturePlanCirculation(r);
  const qa=critiqueArchitecture({design:r.design,compiled:r.compiled});
  const programRisk=assessR125ProgramGeometry(r,qa);
  sources.push(r.design);
  plans.push(p);
  rows.push({
   label:choice.label,id:p.id,provenance:choice.provenance,
   sourceSha256:r.sourceSha256,geometrySha256:r.geometrySha256,
   voxels:r.compiled.primitives.length,
   actualB143SourceVerified:true,
   newLLMInvocation:false,
   highRiskSourceFindings:qa.highRiskCount,
   highRiskIds:qa.findings.filter(x=>x.severity==='HIGH').map(x=>x.id),
   programFloors:programRisk.status,
   programFloorIssues:programRisk.programFloorIssues,
   nonProgramExteriorAdvisories:programRisk.exteriorSurfaceAdvisories,
   sourceCirculation:circulation.status,
   actualMinecraftWalking:'NOT_TESTED',
   humanAestheticReview:'NOT_REVIEWED',worldWrites:0
  });
 }
 const payload=compileB143Gallery(sources);
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const html=renderB143Html(payload,template);
 if(new Set(rows.map(x=>x.geometrySha256)).size!==4)
  fail('NO_DISTINCT_REAL_GEOMETRY');
 const report={
  schema:'r125-expression-visual-comparison-v1',
  basedOnRealQwenModel:'qwen3:14b',
  exactOriginalPlanSha256:PINNED,
  originalPlanNeverEdited:true,
  prototypesNotNewModelOutputs:true,
  scenes:rows,
  sourceOnly:true,worldContact:false,worldWrites:0,
  constructionApproved:false,executionAllowed:false,
  gates:Array(9).fill('BLOCKED')
 };
 return {report,html,plans};
}
export function saveR125ExpressionComparison(outDir){
 if(typeof outDir!=='string'||!outDir.trim())fail('MISSING_OUTPUT');
 const dir=path.resolve(outDir);
 if(fs.existsSync(dir))fail('OUTPUT_ALREADY_EXISTS');
 const built=buildR125ExpressionComparison();
 fs.mkdirSync(dir,{recursive:false});
 for(const [name,value] of [
  ['index.html',built.html],
  ['R125_EXPRESSION_COMPARISON.json',built.report],
  ['ARCHITECTURE_PLANS.json',built.plans]
 ]){
  fs.writeFileSync(path.join(dir,name),
   typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 }
 return built.report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const flags=process.argv.slice(2);
  if(flags.length!==2||flags[0]!=='--out')fail('REQUIRE_OUT');
  const report=saveR125ExpressionComparison(flags[1]);
  console.log(JSON.stringify({status:'SOURCE_ONLY_PREVIEW_READY',
   scenes:report.scenes.length,highRisk:report.scenes.map(s=>s.highRiskSourceFindings),
   worldWrites:0}));
 }catch(e){console.error('R125_EXPRESSION_GALLERY_HOLD',String(e.message??e));process.exitCode=2;}
}
