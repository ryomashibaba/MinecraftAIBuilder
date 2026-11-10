/**
 * R125: REAL local Ollama -> SHORT independent semantic ArchitecturePlan
 * -> trusted generic B143 geometry -> source-only QA and offline viewer.
 * No model substitution, no retry, no remote endpoints, no world writes.
 * node scripts/r125-semantic-pilot.mjs --model qwen3:14b --out NEW_DIR
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileArchitecturePlan,auditArchitecturePlanCirculation,
 assessR125ProgramGeometry,SCHEMA} from '../source/ai/r125-architecture-plan.mjs';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {inspectRoofAir} from './r125-roof-interior-study.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const LOOPBACK=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const fail=c=>{throw Error('R125_SEMANTIC_'+c);};
const file=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const PROMPT='二階建ての小型住宅を独自に構想してください。家族の日常生活、仕事や学習、休憩などの異なる機能領域があり、入口と窓、階段で上下階がつながる設計にしてください。住宅の定型配置を模倣せず、水平分割方向・面積配分・素材を自分で決定してください。';
const SYSTEM=[
 'You are an original spatial-program architect, not a voxel-coordinate writer.',
 'Return ONLY one JSON object with keys schema,id,title,brief,footprint,levels,materials, plus OPTIONAL entryZone and OPTIONAL expression. No markdown and no extra keys.',
 'schema MUST be '+SCHEMA+'. id uses lowercase letters,digits,hyphens only (3..40 chars, starts with a letter).',
 'title and brief are meaningful concise strings. footprint:{width,depth} each integer 16..32.',
 'levels is 1 or 2 items (for a two-story request, return TWO); each level has EXACT keys splitAxis,splitPercent,spaces.',
 'splitAxis is "x" or "z"; splitPercent one of 40,50,60; spaces EXACTLY two objects each with keys id,purpose.',
 'Each space id is a distinct lowercase-hyphen slug, purpose describes a truly distinct user function; NEVER output coordinates or voxel elements.',
 'OPTIONAL entryZone is "first" or "second", selecting which ground-level functional zone faces the front door. For ground splitAxis:x either is valid; for ground splitAxis:z only "first". The host chooses coordinates.',
 'materials has EXACT keys floor,wall,roof. floor: wood/stone/concrete; wall: concrete/stone/wood/metal; roof: stone/metal/wood/concrete.',
 'Generic building geometry will safely compile actual 3D floor supports, doors, glazing, internal doors, stairs, roof and air space.',
 'Your job is only concept, original functions, level-to-level zoning, footprint and palette. Do not pretend to certify walking or Minecraft building.',
 'For multi-use buildings, change real functional program and orientation, not only title. Do not copy fixed sample room names.',
 'OPTIONAL expression must include setbackSide,setbackDepth,roofProfile,roofAxis,facadeLanguage, plus OPTIONAL roofVolume and OPTIONAL rearCornerCut object with width,depth and OPTIONAL side ("east" or "west").',
 'setbackSide is "none", "east", or "rear"; setbackDepth must be 0 for none, otherwise 2,3,4 and ONLY when there are 2 levels.',
 'roofProfile is flat,ridge,sawtooth; roofAxis is x or z; facadeLanguage is plain,fins,screen.',
 'OPTIONAL roofVolume:"raised" is permitted for roofProfile:"ridge" OR "sawtooth" only. Choose when the chosen pitched roof must create genuinely taller usable interior air instead of decorative solid geometry above a flat ceiling. HOST computes the safe stepped outer skin, eaves and source air clearances.',
 'If your concept benefits from a TRUE L-shaped mass and open-air rear corner, choose rearCornerCut:{width:3..5,depth:3..5,side:"east"|"west"} (integer dimensions, side optional, default east). Decide which rear corner is removed; the compiler removes real floors and roof and encloses the new glazed faces. ONLY with setbackSide:none, setbackDepth:0, roofProfile:flat.',
 'Choose an independent, striking yet functional architectural silhouette; expressed roof and upper setback must serve your spatial concept. Do not add arbitrary scripts or coordinates.'
].join('\n');
/** Independent literal user-roof constraints, NOT general Japanese understanding.
 * Never turn a generic request for a roof into a model-authored roof intention.
 */
export function explicitR125RoofRequest(prompt,requireUsableRoofVolume=false){
 if(typeof prompt!=='string'||typeof requireUsableRoofVolume!=='boolean')
  fail('ROOF_REQUEST_INPUT');
 const profile=/鋸歯|sawtooth/i.test(prompt)?'sawtooth':
  /切妻|gabled?|\bridge\b/i.test(prompt)?'ridge':null;
 const explicitHigh=/高天井|屋根裏空間|屋根下の空間|vaulted ceiling|raised roof|usable roof volume/i.test(prompt);
 return {profile,usableInteriorRequired:requireUsableRoofVolume||explicitHigh,
  basis:requireUsableRoofVolume?'EXPLICIT_CLI_REQUIREMENT':
   explicitHigh?'EXPLICIT_TEXT_KEYWORD':'NOT_REQUIRED',
  literalKeywordsNotCompleteNaturalLanguageReview:true};
}
const blank=()=>({
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 worldContacts:0,worldWrites:0,gates:Array(9).fill('BLOCKED'),
 BuildPlan:{operations:[]}
});
export function parseR125SemanticArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const opts={},allowed=new Set(['--model','--out','--prompt','--endpoint']);
 for(let i=0;i<argv.length;i++){
  const flag=argv[i];
  if(flag==='--require-usable-roof-volume'){
   if(Object.hasOwn(opts,flag))fail('INVALID_ARGUMENT_'+flag);
   opts[flag]=true;continue;
  }
  const value=argv[++i];
  if(!allowed.has(flag)||Object.hasOwn(opts,flag)||!value||value.startsWith('--'))
   fail('INVALID_ARGUMENT_'+flag);
  opts[flag]=value;
 }
 if(!MODEL.test(opts['--model']??'')||!opts['--out'])fail('MODEL_AND_OUTPUT_REQUIRED');
 const endpoint=opts['--endpoint']??'http://127.0.0.1:11434/v1/chat/completions';
 const match=LOOPBACK.exec(endpoint);
 if(!match||Number(match[1])>65535||Number(match[1])<1)
  fail('LOOPBACK_ONLY');
 const prompt=opts['--prompt']??PROMPT;
 if(typeof prompt!=='string'||prompt.length<8||prompt.length>4000)
  fail('PROMPT_LENGTH');
 return {model:opts['--model'],outDir:path.resolve(opts['--out']),prompt,endpoint,
  requireUsableRoofVolume:opts['--require-usable-roof-volume']===true};
}
export async function runR125SemanticPilot({model,outDir,prompt=PROMPT,
 endpoint='http://127.0.0.1:11434/v1/chat/completions',
 requireUsableRoofVolume=false}={},
 {fetcher=fetch,timeoutMs=120000}={}){
 if(!MODEL.test(model??'')||typeof outDir!=='string'||!outDir.trim()||
  typeof prompt!=='string'||prompt.length<8||prompt.length>4000||
  !Number.isSafeInteger(timeoutMs)||timeoutMs<1000||timeoutMs>300000||
  typeof fetcher!=='function'||typeof requireUsableRoofVolume!=='boolean')fail('BAD_INPUT');
 const match=LOOPBACK.exec(endpoint);
 if(!match||Number(match[1])>65535||Number(match[1])<1)
  fail('LOOPBACK_ONLY');
 if(fs.existsSync(outDir))fail('OUTPUT_ALREADY_EXISTS');
 const roofRequest=explicitR125RoofRequest(prompt,requireUsableRoofVolume);
 const dir=path.resolve(outDir),start=Date.now();
 fs.mkdirSync(dir,{recursive:false});
 const report={
  schema:'r125-real-semantic-pilot-v1',status:'HOLD_NOT_STARTED',
  model,provider:'DECLARED_LOCAL_LOOPBACK_NOT_INDEPENDENTLY_VERIFIED',
  testInjectionPresent:fetcher!==fetch,
  prompt,timeoutMs,maxOutputTokens:1536,reasoningEffort:'none',
  originalRawCaptured:false,modelCalls:0,
  planSha256:null,sourceSha256:null,geometrySha256:null,
  sourceVoxelCount:null,sourceHighRiskFindings:null,
  sourceCirculationStatus:'NOT_TESTED',sourceCirculationFindings:null,
  programFloorStatus:'NOT_TESTED',programFloorIssues:null,
  nonProgramExteriorAdvisories:null,
  roofRequest,modelSelectedRoof:null,roofInteriorSourceEvidence:null,
  semanticMatch:'NOT_REVIEWED',humanArt:'NOT_REVIEWED',
  architectureProgramUsability:'NOT_TESTED_IN_MINECRAFT',world:blank()
 };
 const put=(name,value)=>file(dir,name,value);
 put('REQUEST.json',{model,prompt,endpoint,roofRequest,
  inference:'ONE_REAL_LOCAL_REQUEST_OR_HOLD',
  requestProtocol:'OPENAI_COMPATIBLE_JSON_OBJECT',
  ...{timeoutMs,maxOutputTokens:1536,reasoningEffort:'none'}});
 try{
  // Gate C P1 remains HOLD on this research branch. The legacy R125
  // standalone CLI and MakeCode --prompt entry MUST NOT reach either
  // /api/tags GET or a model-generation POST without the separately
  // attested Windows PRIVATE resource/monitor and exact-HEAD CI gates.
  // Test-injected fetchers remain offline source test doubles only.
  if(!report.testInjectionPresent){
   report.status='HOLD_GATE_C_P1_REAL_MODEL_NOT_AUTHORIZED';
   report.reason='REQUIRES_PRIVATE_MONITOR_RESOURCE_CALIBRATION_AND_EXACT_HEAD_CI';
   return report;
  }
  const available=await preflightR125Ollama({model,endpoint,fetcher});
  if(available.status!=='LOCAL_MODEL_LISTED'){
   report.status='HOLD_MODEL_NOT_INSTALLED';return report;
  }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  let response;
  try{
   report.modelCalls++;
   response=await fetcher(endpoint,{
    method:'POST',signal:controller.signal,redirect:'error',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model,stream:false,temperature:0.4,
     reasoning_effort:'none',max_tokens:1536,
     response_format:{type:'json_object'},
     messages:[{role:'system',content:SYSTEM+
      (roofRequest.usableInteriorRequired?'\\nREQUIRED: Return expression with roofVolume:"raised" and roofProfile "ridge" or "sawtooth". Do not omit it or relabel a decorative flat cap.':'')+
      (roofRequest.profile?'\\nREQUIRED model-selected roofProfile: '+roofRequest.profile+'.':'')},
      {role:'user',content:prompt}]})
   });
   if(!response||response.ok!==true)
    fail('MODEL_HTTP_'+String(response?.status??'UNKNOWN'));
   const body=await response.text();
   if(body.length>250000)fail('MODEL_HTTP_TOO_LARGE');
   let parsed;
   try{parsed=JSON.parse(body);}catch{fail('MODEL_HTTP_INVALID_JSON');}
   if(parsed?.choices?.length!==1)
    fail('MODEL_OUTPUT_TRUNCATED_OR_CHOICES');
   const choice=parsed.choices[0];
   report.providerFinishReason=typeof choice.finish_reason==='string'?
    choice.finish_reason:null;
   const raw=choice?.message?.content;
   // Preserve the exact partial text before rejecting a truncated response.
   // A saved fragment is diagnostic evidence, NEVER a valid model design.
   if(typeof raw==='string'&&raw.length>0&&raw.length<=15000){
    put('MODEL_RESPONSE_ORIGINAL.txt',raw);
    report.originalRawCaptured=true;
   }
   if(choice?.finish_reason==='length')
    fail('MODEL_OUTPUT_TRUNCATED_OR_CHOICES');
   if(choice?.finish_reason!=='stop')
    fail('MODEL_OUTPUT_INCOMPLETE_FINISH_REASON');
   if(typeof raw!=='string'||raw.length<20||raw.length>15000)
    fail('RAW_PLAN_MISSING_OR_OVERSIZE');
   let plan;
   try{plan=JSON.parse(raw);}catch{fail('PLAN_NOT_JSON');}
   report.modelSelectedRoof=plan?.expression?{
    profile:plan.expression.roofProfile??null,
    axis:plan.expression.roofAxis??null,
    volume:plan.expression.roofVolume??'DECORATIVE_FLAT_CAP'
   }:null;
   if(roofRequest.profile&&plan?.expression?.roofProfile!==roofRequest.profile)
    fail('MODEL_DID_NOT_DESIGN_REQUESTED_ROOF_PROFILE');
   if(roofRequest.usableInteriorRequired&&
    plan?.expression?.roofVolume!=='raised')
    fail('MODEL_DID_NOT_DESIGN_REQUIRED_REAL_ROOF_VOLUME');
   // True geometry must come from the original model-authored plan unchanged.
   const product=compileArchitecturePlan(plan);
   if(plan.expression?.roofVolume==='raised'){
    // A separate HOST counterfactual only measures what the model roof changes;
    // it is NEVER promoted as a second AI-designed candidate.
    const baselinePlan=structuredClone(plan);
    delete baselinePlan.expression.roofVolume;
    const decorative=compileArchitecturePlan(baselinePlan);
    const audit=inspectRoofAir(decorative,product);
    if(audit.flatRoofBaseRetained||audit.newCeilingAirCells<=0||
     audit.highAirColumns<=0||audit.twoWideHighRoofPads<=0||
     audit.verticallyConnectedTwoWideRoofPads<=0||
     audit.unclosedEaveOrEndCells!==0||audit.unclosedStepCells!==0)
     fail('MODEL_ROOF_HAS_NO_VERIFIED_SUPPORTED_HIGH_INTERIOR');
    report.roofInteriorSourceEvidence={
     ...audit,modelPlanSha256:product.planSha256,
     actualModelPlanGeometrySha256:product.geometrySha256,
     hostCounterfactualDecorativeGeometrySha256:decorative.geometrySha256,
     actualAuthorship:'MODEL_CHOSE_ROOF_INTENT_HOST_BUILT_GEOMETRY',
     comparisonAuthorship:'HOST_ONLY_NOT_SECOND_MODEL_OUTPUT',
     humanArt:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
     constructionApproved:false,worldWrites:0};
    put('R125_MODEL_ROOF_INTERIOR_SOURCE_EVIDENCE.json',
     report.roofInteriorSourceEvidence);
   }
   const critique=critiqueArchitecture({
    design:product.design,compiled:product.compiled});
   const circulation=auditArchitecturePlanCirculation(product);
   const programRisk=assessR125ProgramGeometry(product,critique);
   const gallery=compileB143Gallery([product.design]);
   const tpl=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
   const html=renderB143Html(gallery,tpl);
   put('ARCHITECTURE_PLAN.json',product.plan);
   put('B143_SOURCE.json',product.design);
   put('B143_SCENE.json',product.compiled);
   put('B198C_GEOMETRY_CRITIQUE.json',critique);
   put('R125_SOURCE_CIRCULATION_AUDIT.json',circulation);
   put('R125_PROGRAM_FLOOR_RISK.json',programRisk);
   put('ZONE_PROGRAM.json',product.program);
   put('index.html',html);
   report.planSha256=product.planSha256;
   report.sourceSha256=product.sourceSha256;
   report.geometrySha256=product.geometrySha256;
   report.sourceVoxelCount=product.compiled.primitives.length;
   report.sourceHighRiskFindings=critique.highRiskCount;
   report.sourceCirculationStatus=circulation.status;
   report.sourceCirculationFindings=circulation.failures.length;
   report.programFloorStatus=programRisk.status;
   report.programFloorIssues=programRisk.programFloorIssues.length;
   report.nonProgramExteriorAdvisories=programRisk.exteriorSurfaceAdvisories.length;
   report.status=report.testInjectionPresent?'HOLD_TEST_DOUBLE_NOT_REAL_INFERENCE':
    programRisk.programFloorIssues.length>0?'HOLD_PROGRAM_FLOORS':
    circulation.status!=='SOURCE_CLEARANCE_PROBES_PASS'?
     'HOLD_SOURCE_CIRCULATION':
     'SOURCE_AND_3D_READY_HUMAN_REVIEW_REQUIRED';
   return report;
  }finally{clearTimeout(timer);}
 }catch(error){
  report.reason=String(error?.message??error).slice(0,480);
  const duration=Date.now()-start;
  report.status=/(?:aborted|AbortError)/i.test(report.reason)&&
   Math.abs(duration-timeoutMs)<5000?'HOLD_MODEL_TIMEOUT':'HOLD_SEMANTIC_PLAN';
  return report;
 }finally{
  report.elapsedMs=Date.now()-start;
  put('R125_SEMANTIC_REPORT.json',report);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const args=parseR125SemanticArgs(process.argv.slice(2));
  if(args.help)console.log('node scripts/r125-semantic-pilot.mjs --model qwen3:14b --out NEW_DIR [--prompt "NEW REQUEST"] [--require-usable-roof-volume] (LOCAL ONLY, NO MINECRAFT WRITES)');
  else{
   const r=await runR125SemanticPilot(args);
   console.log(JSON.stringify({status:r.status,reason:r.reason??null,
    elapsedMs:r.elapsedMs,planSha256:r.planSha256,
    occupiedVoxels:r.sourceVoxelCount,folder:args.outDir,worldWrites:0}));
   if(r.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(e){console.error('R125_SEMANTIC_HOLD',String(e?.message??e));process.exitCode=2;}
}
