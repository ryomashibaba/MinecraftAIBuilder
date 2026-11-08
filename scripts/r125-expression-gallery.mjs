/**
 * R125 offline artistic comparison for the exact saved real Qwen 14B plan.
 * Four variants are deterministic COMPILER-PARAMETER demonstrations,
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
  provenance:'COMPILER_FORM_DEMONSTRATION_NOT_NEW_MODEL_OUTPUT'},
 {label:'E: Same ridge · true interior roof volume',
  id:'lumina-loft-roof',
  expression:{setbackSide:'none',setbackDepth:0,
   roofProfile:'ridge',roofAxis:'z',facadeLanguage:'fins',
   roofVolume:'raised'},
  provenance:'HOST_DERIVED_NOT_ADDITIONAL_QWEN_RESPONSE'}
];

// A single roof-axis section: each displayed cell is an occupied voxel
// from the final B143 compiled SOURCE, never an artist's simulated outline.
function renderSourceRoofSlice(product,caption){
 const {width:w,depth:d}=product.plan.footprint;
 const top=1+5*product.plan.levels.length,cutX=Math.floor(w/2);
 const occupied=new Set(product.compiled.primitives.filter(v=>v[0]===cutX)
  .map(v=>v[1]+','+v[2]));
 const squares=[];
 for(let y=top-2;y<=top+5;y++)for(let z=1;z<d-1;z++)
  if(occupied.has(y+','+z))
   squares.push('<rect x="'+(10+(z-1)*11)+'" y="'+(10+(top+5-y)*11)+
    '" width="11" height="11" fill="#486e87"/>');
 const width=20+(d-2)*11,height=108;
 return '<figure><figcaption>'+caption+'</figcaption>'+
  '<svg role="img" aria-label="'+caption+' B143 final voxel section" '+
  'viewBox="0 0 '+width+' '+height+'" style="width:100%;max-width:500px;background:#eaf1f6">'+
  '<title>'+caption+' genuine SOURCE only</title>'+squares.join('')+'</svg></figure>';
}

export function buildR125ExpressionComparison(){
 const original=JSON.parse(fs.readFileSync(PLAN,'utf8'));
 const baseline=compileArchitecturePlan(original);
 if(baseline.planSha256!==PINNED||
  baseline.compiled.primitives.length!==2620)
  fail('SAVED_REAL_QWEN_REFERENCE_DRIFT');
 const sources=[],rows=[],plans=[],products=[];
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
  products.push(r);
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
 // D and E have identical spatial programs and all non-roof geometry intent.
 // They differ only in the opt-in raised roof, NEVER in the real Qwen original.
 const old=products[3],raised=products[4],top=1+5*old.plan.levels.length;
 const before=new Set(old.compiled.primitives.map(v=>v.slice(0,3).join(',')));
 const after=new Set(raised.compiled.primitives.map(v=>v.slice(0,3).join(',')));
 let clearedCeilingCells=0,raisedAirColumns=0;
 const {width:w,depth:d}=old.plan.footprint;
 for(let x=2;x<w-2;x++)for(let z=2;z<d-2;z++){
  const k=x+','+top+','+z;
  if(before.has(k)&&!after.has(k))clearedCeilingCells++;
  if(!after.has(k)&&!after.has(x+','+(top+1)+','+z))
   raisedAirColumns++;
 }
 const a={...old.plan.expression},b={...raised.plan.expression};
 delete b.roofVolume;
 if(JSON.stringify(a)!==JSON.stringify(b)||
  JSON.stringify(old.plan.levels)!==JSON.stringify(raised.plan.levels)||
  clearedCeilingCells<=0||raisedAirColumns<=0)
  fail('REAL_INTERIOR_VOLUME_NOT_PROVEN');
 const roofSectionEvidence={
  schema:'r125-source-roof-section-v1',oldSceneIndex:3,raisedSceneIndex:4,
  oldSourceSha256:old.sourceSha256,raisedSourceSha256:raised.sourceSha256,
  formerCeilingY:top,clearedFormerCeilingCells:clearedCeilingCells,
  raisedAirColumns,source:'FINAL_B143_VOXELS',
  provenance:'HOST_DERIVED_VARIANTS_NOT_NEW_QWEN_OUTPUT',
  humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',worldWrites:0
 };
 const payload=compileB143Gallery(sources);
 const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
 const baseHtml=renderB143Html(payload,template);
 if(baseHtml.split('</body>').length!==2)fail('SECTION_HTML_SLOT');
 const section='<section id="source-roof-section" style="padding:20px;margin:20px auto;max-width:1020px;background:#f5f8fb;color:#142b3c">'+
  '<h2>TRUE B143 SOURCE: decorative roof vs interior roof</h2>'+
  '<p>Saved Qwen plan, two HOST-derived alternatives; dark = real solids, light = air. '+
  clearedCeilingCells+' former ceiling voxels now air; ART / game walking NOT REVIEWED.</p>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">'+
  renderSourceRoofSlice(old,'D: legacy decorative ridge')+
  renderSourceRoofSlice(raised,'E: raised interior ridge')+'</div></section>';

 // Read-only review facts follow the selected real B143 scene. This never
 // certifies Minecraft walking or author attribution beyond saved evidence.
 const reviewFacts=rows.map(x=>({
  sceneId:x.id,provenance:x.provenance,programFloors:x.programFloors,
  programFloorIssues:x.programFloorIssues.map(z=>z.code+' @ Y='+z.standingY),
  exteriorAdvisories:x.nonProgramExteriorAdvisories.map(z=>z.code+' @ Y='+z.standingY),
  highRiskIds:x.highRiskIds,
  sourceCirculation:x.sourceCirculation,
  actualMinecraftWalking:'NOT_TESTED',humanAestheticReview:'NOT_REVIEWED'
 }));
 const reviewPanel='<section id="r125-source-review" aria-live="polite" '+
  'style="padding:12px;border:1px solid #426079;border-radius:10px;background:#132b3c;margin-top:16px;line-height:1.5">'+
  '<h2 style="font-size:1rem">選択案のSOURCE品質と作者</h2>'+
  '<p id="r125-review-status"></p><p id="r125-review-provenance"></p>'+
  '<p id="r125-review-faults"></p>'+
  '<p style="font-size:.76rem;color:#b5cfdf">ART HOLD／Minecraft歩行 NOT_TESTED／施工不可。'+
  'モデルの意味設計とホストの幾何・改変を混同しません。</p></section>';
 const safeFacts=JSON.stringify(reviewFacts).replaceAll('<','\\u003c');
 const bindFacts='<script>(function(){const facts='+safeFacts+';'+
  'const select=document.getElementById("building");'+
  'const status=document.getElementById("r125-review-status");'+
  'const provenance=document.getElementById("r125-review-provenance");'+
  'const faults=document.getElementById("r125-review-faults");'+
  'function show(){const f=facts[Number(select.value)];if(!f)return;'+
   'const blocked=f.programFloors==="HOLD_PROGRAM_FLOORS";'+
   'status.style.color=blocked?"#ffac88":"#abebd3";'+
   'status.textContent=blocked?"SOURCE HOLD — プログラム床の連結不良":'+
    '(f.programFloors==="PROGRAM_FLOORS_CLEAR"?"プログラム床のSOURCE検査：指摘なし":'+
    '"プログラム床は成立／外部屋根のSOURCE確認要");'+
   'provenance.textContent=f.provenance==="ACTUAL_QWEN14B_ORIGINAL_SEMANTIC_PLAN"?'+
    '"作者：保存済み実Qwenの意味設計。最終ボクセルはホスト生成。":'+
    '"作者：Qwenの元プログラムを再利用したHOST派生形状（新モデル出力ではありません）。";'+
   'faults.textContent="プログラム床："+(f.programFloorIssues.join("、")||"指摘なし")+'+
    '" ／ 外部SOURCE："+(f.exteriorAdvisories.join("、")||"指摘なし")+'+
    '" ／ 監査HIGH："+(f.highRiskIds.join("、")||"なし");'+
  '}select.addEventListener("change",show);show();})();</script>';
 let html=baseHtml.replace('<h2 style="margin-top:20px">表示設定</h2>',
  reviewPanel+'<h2 style="margin-top:20px">表示設定</h2>');
 html=html.replace('</body>',section+bindFacts+'</body>');
 if(new Set(rows.map(x=>x.geometrySha256)).size!==5)
  fail('NO_DISTINCT_REAL_GEOMETRY');
 const report={
  schema:'r125-expression-visual-comparison-v1',
  basedOnRealQwenModel:'qwen3:14b',
  exactOriginalPlanSha256:PINNED,
  originalPlanNeverEdited:true,
  prototypesNotNewModelOutputs:true,
  scenes:rows,roofSectionEvidence,
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
