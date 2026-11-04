/**
 * Opt-in ONE local Ollama model request to author a compact relative V4D
 * architecture. Never runs on CI as a real model, never uploads raw text,
 * and never contacts/changes Minecraft worlds. Test injections are always
 * stamped HOLD_TEST_DOUBLE, even when their B143 geometry compiles.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {preflightR125Ollama} from './r125-pilot.mjs';
import {RELATIVE_SCHEMA,compileRelativeAuthorIntent}
 from '../source/ai/r125-v4d-relative-author-ir.mjs';
import {COMPACT_SCHEMA,COMPACT_SYSTEM_PROMPT,compileCompactModelIntent}
 from '../source/ai/r125-v4d-compact-model-ir.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {buildV4DShareableReceipt} from './r125-v4d-shareable-receipt.mjs';
import {RANKED_SCHEMA,RANKED_SYSTEM_PROMPT,compileRankedExteriorIntent} from '../source/ai/r125-v4e-ranked-exterior-ir.mjs';
import {SECTIONED_SCHEMA,SECTIONED_SYSTEM_PROMPT,compileSectionedAuthorIntent} from '../source/ai/r125-v4e-sectioned-author-ir.mjs';
import {actualOrthographicSvg} from './r125-v4e-source-art-review.mjs';
import {auditB143ProjectedVisibility,renderB143ProjectedVisibilityDelta}
 from './r125-v4e-visibility-delta.mjs';
import {MASSING_SCHEMA,MASSING_SYSTEM_PROMPT,compileMassingAuthorIntent} from '../source/ai/r125-v4e-massing-author-ir.mjs';
import {WING_SCHEMA,WING_SYSTEM_PROMPT,compileWingAuthorIntent}
 from '../source/ai/r125-v4e-wing-author-ir.mjs';
import {FLOORPLATE_SCHEMA,FLOORPLATE_SYSTEM_PROMPT,compileFloorplateAuthorIntent}
 from '../source/ai/r125-v4f-floorplate-author-ir.mjs';
import {HEIGHT_SCHEMA,HEIGHT_SYSTEM_PROMPT,compileHeightAuthorIntent}
 from '../source/ai/r125-v4g-height-author-ir.mjs';
import {MEZZANINE_SCHEMA,MEZZANINE_SYSTEM_PROMPT,compileMezzanineAuthorIntent}
 from '../source/ai/r125-v4h-mezzanine-author-ir.mjs';
import {CIVIC_ARCADE_SCHEMA,CIVIC_ARCADE_SYSTEM_PROMPT,compileCivicArcadeAuthorIntent}
 from '../source/ai/r125-v4j-civic-author-ir.mjs';
import {actualB143MezzanineSectionSvg}
 from './r125-v4h-mezzanine-section.mjs';
import {V4J_PRECISION_PROTOCOL,V4J_PRECISION_SYSTEM_PROMPT}
 from '../source/ai/r125-v4j-precision-prompt.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MODEL=/^[A-Za-z0-9._:/-]{2,140}$/;
const ENDPOINT=/^http:\/\/127\.0\.0\.1:(\d{2,5})\/v1\/chat\/completions$/;
const fail=s=>{throw Error('R125_V4D_LOCAL_AUTHOR_'+s);};
const sha=s=>createHash('sha256').update(s).digest('hex');
const output=(dir,name,payload)=>fs.writeFileSync(path.join(dir,name),
 typeof payload==='string'?payload:JSON.stringify(payload,null,2)+'\n',{flag:'wx'});
const DEFAULT_PROMPT='小規模な公共交流施設を独創的に設計する。来訪者とスタッフの機能関係が明確で、公開庭と半屋外の滞留場所を持ち、入口と用途室を安全な動線でつなぐ建築を考える。';
const DEFAULT_ENDPOINT='http://127.0.0.1:11434/v1/chat/completions';

export const V4D_RELATIVE_SYSTEM_PROMPT=[
 'Act as the ORIGINAL architect of a complete useful Minecraft Education building, not a JSON reformatter.',
 'Return exactly ONE syntactically valid JSON object, without markdown/code/prose outside JSON.',
 'Choose the whole architecture yourself from USER brief. No standard residential/retail templates or generic labels.',
 'Top-level EXACT keys: schema,id,title,brief,materials,spaces,entry,extraLinks.',
 'schema exactly '+RELATIVE_SCHEMA+'. id and space ids: lowercase letter/digit/hyphen slugs 3..35, starts with letter.',
 'title/brief/purpose strings 3..150 characters and genuinely describe diverse functions.',
 'materials EXACT keys: floor (wood|stone|concrete), wall (stone|wood|concrete|metal), roof (stone|wood|concrete|metal), public (stone|concrete|accent).',
 'spaces ARRAY 3..5 independent room/public-volume design decisions, parent-before-child; first is the enclosed NORTH-entry reception, at least 2 covered and 1 sky.',
 'Every space EXACT keys: id,purpose,kind,width,depth,roof,facade,shelter,windows,fixture; nonfirst spaces additionally require attach.',
 'width,depth integers 18..30; kind covered|sky. Host uses relative placement; DO NOT output absolute x/z/world coordinates.',
 'For covered: roof EXACT {axis:x|z,type:shed|ridge,eaveY:10..15,peakY:eaveY+3..23,peakPercent:35..65}, facade wall|glass, shelter:null; windows ARRAY 0..2.',
 'For sky: roof:null,facade:null, windows:[], shelter EXACT {edge:north|south|east|west,depth:3..5,roofY:7..10,material:metal|wood|stone|concrete|accent}. Shelter edge MUST be shared with one authored linked covered space.',
 'Every window EXACT {side:north|south|east|west,offset:2..24,span:5..10,sillY:4..6,height:2..4}; choose an EXTERIOR side, never a side shared with another space. Stay 2 cells inside wall corners.',
 'Every fixture EXACT {id,purpose,offsetX,offsetZ,width,depth,height,material}; offsets measured from that space near its interior, usually 6..12; width/depth 2..5, height 1..3, material stone|wood|concrete|metal|accent.',
 'For nonfirst space, attach EXACT {to:<PRECEDING space id>,side:east|west|north|south,shift:integer -4..4,doorOffset:integer 2..14}. Side is the direction FROM parent TO child.',
 'HOST keeps a one-voxel shared wall and opens an actual FOUR-wide door at the AUTHOR doorOffset. Thus neighboring rooms must have at least 7 shared cells.',
 'extraLinks ARRAY 0..2 of EXACT {from,to,side,offset} for physically aligned additional closed-loop doorways. No unplanned boundary contacts, overlapping room interiors or disconnected spaces.',
 'entry EXACT {offset:4..12,plazaWidth:12..18,plazaDepth:8..13,canopyDepth:3..6}. The four-wide public NORTH entrance must not collide with any north window.',
 'Design a truly functional circulation pattern and meaningful equipment. Never invent Minecraft execution permission, completed construction, art approval or external services.',
 'The HOST NEVER corrects your decisions: unknown fields, wrong adjacency, blocked windows, incompatible roofs or routes are a SOURCE HOLD with no retry.'
].join('\n');

const blank=()=>({
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]},
 worldContacts:0,worldWrites:0
});
export function parseV4DLocalAuthorArgs(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const opt={},allowed=new Set(['--model','--out','--prompt','--endpoint']);
 for(let i=0;i<argv.length;i++){
  const k=argv[i];
  if(k==='--compact'||k==='--ranked-windows'||k==='--ranked-section'||k==='--authored-massing'||k==='--authored-wing'||k==='--authored-floorplate'||k==='--authored-atrium'||k==='--authored-mezzanine'||k==='--authored-civic-arcade'){
   if(Object.hasOwn(opt,k))fail(k==='--compact'?'DUPLICATE_COMPACT':k==='--ranked-section'?'DUPLICATE_RANKED_SECTION':k==='--authored-massing'?'DUPLICATE_AUTHORED_MASSING':'DUPLICATE_RANKED_WINDOWS');
   opt[k]=true;continue;
  }
  const v=argv[++i];
  if(!allowed.has(k)||Object.hasOwn(opt,k)||typeof v!=='string'||
   !v.trim()||v.startsWith('--'))fail('ARGUMENT_'+k);
  opt[k]=v;
 }
 if(!MODEL.test(opt['--model']??'')||
  typeof opt['--out']!=='string'||opt['--out'].length<2)
  fail('MODEL_AND_PRIVATE_OUT_REQUIRED');
 if([opt['--compact'],opt['--ranked-windows'],opt['--ranked-section'],opt['--authored-massing'],opt['--authored-wing'],opt['--authored-floorplate'],opt['--authored-atrium'],opt['--authored-mezzanine'],opt['--authored-civic-arcade']].filter(Boolean).length>1)fail('ONLY_ONE_AUTHOR_MODE');
 const endpoint=opt['--endpoint']??DEFAULT_ENDPOINT,port=ENDPOINT.exec(endpoint);
 if(!port||+port[1]<1||+port[1]>65535)fail('LOCAL_LOOPBACK_ONLY');
 const prompt=opt['--prompt']??DEFAULT_PROMPT;
 if(prompt.length<8||prompt.length>4000)fail('PROMPT_CONTRACT');
 return {model:opt['--model'],outDir:path.resolve(opt['--out']),prompt,endpoint,compact:opt['--compact']===true,rankedWindows:opt['--ranked-windows']===true,rankedSection:opt['--ranked-section']===true,authoredMassing:opt['--authored-massing']===true,authorWing:opt['--authored-wing']===true,authorFloorplate:opt['--authored-floorplate']===true,authorAtrium:opt['--authored-atrium']===true,authorMezzanine:opt['--authored-mezzanine']===true,authorArcade:opt['--authored-civic-arcade']===true};
}
function validateLaunch({model,outDir,prompt,endpoint},fetcher,timeoutMs){
 if(!MODEL.test(model??'')||typeof outDir!=='string'||!outDir.trim()||
  typeof prompt!=='string'||prompt.length<8||prompt.length>4000||
  typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||
  timeoutMs<1000||timeoutMs>300000)fail('LAUNCH');
 const m=ENDPOINT.exec(endpoint);
 if(!m||+m[1]<1||+m[1]>65535)fail('LOCAL_LOOPBACK_ONLY');
 const dest=path.resolve(outDir);
 const parent=path.dirname(dest);
 if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()||
  fs.existsSync(dest))fail('PRIVATE_OUTPUT_MUST_BE_NEW_DIR');
 const physicalParent=fs.realpathSync(parent);
 if(dest===ROOT||dest.startsWith(ROOT+path.sep)||
  physicalParent===ROOT||physicalParent.startsWith(ROOT+path.sep))
  fail('PRIVATE_OUTPUT_OUTSIDE_REPOSITORY_ONLY');
 return dest;
}
export async function runV4DLocalAuthor({
 model,outDir,prompt=DEFAULT_PROMPT,endpoint=DEFAULT_ENDPOINT,compact=false,rankedWindows=false,rankedSection=false,authoredMassing=false,authorWing=false,authorFloorplate=false,authorAtrium=false,authorMezzanine=false,authorArcade=false,precisionCivicContract=false
}={}, {fetcher=fetch,timeoutMs=180000}={}){
 if(typeof precisionCivicContract!=='boolean'||(precisionCivicContract&&!authorArcade))fail('PRECISION_CONTRACT_REQUIRES_CIVIC_AUTHOR');
 if([compact,rankedWindows,rankedSection,authoredMassing,authorWing,authorFloorplate,authorAtrium,authorMezzanine,authorArcade].some(x=>typeof x!=='boolean')||
  [compact,rankedWindows,rankedSection,authoredMassing,authorWing,authorFloorplate,authorAtrium,authorMezzanine,authorArcade].filter(Boolean).length>1)fail('AUTHOR_MODE');
 const dir=validateLaunch({model,outDir,prompt,endpoint},fetcher,timeoutMs);
 const injected=fetcher!==fetch||process.env.MAB_V4D_TEST_DOUBLE_MODE==='1',start=Date.now();
 const modelSystemPrompt=precisionCivicContract?V4J_PRECISION_SYSTEM_PROMPT:
  authorArcade?CIVIC_ARCADE_SYSTEM_PROMPT:authorMezzanine?MEZZANINE_SYSTEM_PROMPT:
  authorAtrium?HEIGHT_SYSTEM_PROMPT:authorFloorplate?FLOORPLATE_SYSTEM_PROMPT:
  authorWing?WING_SYSTEM_PROMPT:authoredMassing?MASSING_SYSTEM_PROMPT:
  rankedSection?SECTIONED_SYSTEM_PROMPT:rankedWindows?RANKED_SYSTEM_PROMPT:
  compact?COMPACT_SYSTEM_PROMPT:V4D_RELATIVE_SYSTEM_PROMPT;
 const promptProtocol=precisionCivicContract?V4J_PRECISION_PROTOCOL:'LEGACY_AUTHOR_CONTRACT';
 fs.mkdirSync(dir,{recursive:false});
 const report={
  schema:'minecraftaibuilder-r125-v4d-local-model-author-attempt-v1',
  status:'HOLD_NOT_STARTED',reason:null,modelId:model,
  declaredProvider:'LOCAL_OLLAMA_127_0_0_1_NOT_AUTHENTICATED',
  testInjectionPresent:injected,modelNameCryptographicallyAttested:false,
  promptSha256:sha(prompt),systemPromptSha256:sha(modelSystemPrompt),
  promptProtocol,responseRawSha256:null,
  authorContract:authorArcade?CIVIC_ARCADE_SCHEMA:authorMezzanine?MEZZANINE_SCHEMA:authorAtrium?HEIGHT_SCHEMA:authorFloorplate?FLOORPLATE_SCHEMA:authorWing?WING_SCHEMA:authoredMassing?MASSING_SCHEMA:rankedSection?SECTIONED_SCHEMA:rankedWindows?RANKED_SCHEMA:compact?COMPACT_SCHEMA:RELATIVE_SCHEMA,
  mechanizedExpandedIRSha256:null,
  rawCaptured:false,modelCalls:0,modelFinishReason:null,
  authoredIRSha256:null,translatedGraphSha256:null,
  sourceSha256:null,geometrySha256:null,
  actualB143VoxelCount:null,sourceRoutesStatus:'NOT_TESTED',
  humanART:'NOT_REVIEWED',minecraftWalking:'NOT_TESTED',
  mac8GBTwoB:'NOT_TESTED',...blank()
 };
 output(dir,'LOCAL_REQUEST.json',{
  model,endpoint,prompt,timeoutMs,maxOutputTokens:authorArcade||authorMezzanine?4096:3072,
  authorContract:authorArcade?CIVIC_ARCADE_SCHEMA:authorMezzanine?MEZZANINE_SCHEMA:authorAtrium?HEIGHT_SCHEMA:authorFloorplate?FLOORPLATE_SCHEMA:authorWing?WING_SCHEMA:authoredMassing?MASSING_SCHEMA:rankedSection?SECTIONED_SCHEMA:rankedWindows?RANKED_SCHEMA:compact?COMPACT_SCHEMA:RELATIVE_SCHEMA,
  systemPromptSha256:sha(modelSystemPrompt),promptProtocol,
  nModelGenerationAttemptsAllowed:1,sourceOnly:true,
  noPaidAPI:true,noWorldAccess:true
 });
 try{
  const preflight=await preflightR125Ollama({model,endpoint,fetcher});
  report.preflightModelListed=preflight.status==='LOCAL_MODEL_LISTED';
  if(!report.preflightModelListed){
   report.status='HOLD_MODEL_NOT_INSTALLED';return report;
  }
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  let parsed;
  try{
   report.modelCalls=1;
   const response=await fetcher(endpoint,{
    method:'POST',redirect:'error',signal:ctrl.signal,
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({
     model,stream:false,temperature:0.45,reasoning_effort:'none',
     max_tokens:authorArcade||authorMezzanine?4096:3072,response_format:{type:'json_object'},
     messages:[
      {role:'system',content:modelSystemPrompt},
      {role:'user',content:prompt}
     ]
    })
   });
   if(response?.ok!==true)fail('MODEL_HTTP_'+(response?.status??'UNAVAILABLE'));
   const body=await response.text();
   if(typeof body!=='string'||body.length>250000)fail('HTTP_BODY_TOO_BIG');
   let responseJson;
   try{responseJson=JSON.parse(body);}catch{fail('MODEL_HTTP_INVALID_JSON');}
   if(responseJson?.model!==undefined&&responseJson.model!==model)
    fail('SERVER_MODEL_NAME_CHANGED');
   if(!Array.isArray(responseJson?.choices)||responseJson.choices.length!==1)
    fail('MODEL_CHOICES_NOT_EXACTLY_ONE');
   const choice=responseJson.choices[0],raw=choice?.message?.content;
   report.modelFinishReason=choice?.finish_reason??null;
   // Save exact raw, including incomplete/truncated responses, before any
   // parse/semantic/B143 validation. Never publish this directory to GitHub.
   if(typeof raw==='string'&&raw.length>0&&raw.length<=250000){
    output(dir,'MODEL_RESPONSE_ORIGINAL.txt',raw);
    report.responseRawSha256=sha(raw);
    report.rawCaptured=true;
   }
   if(choice?.finish_reason==='length')fail('MODEL_TRUNCATED_NO_AUTO_RETRY');
   if(choice?.finish_reason!=='stop')
    fail('MODEL_FINISH_NOT_STOP');
   if(typeof raw!=='string'||raw.length<30||raw.length>30000)
    fail('MODEL_ORIGINAL_MISSING_OR_OVERSIZE');
   try{parsed=JSON.parse(raw);}catch{fail('MODEL_RESPONSE_NOT_PURE_JSON');}
  }finally{clearTimeout(timer);}
  const result=authorArcade?compileCivicArcadeAuthorIntent(parsed):
    authorMezzanine?compileMezzanineAuthorIntent(parsed):
   authorAtrium?compileHeightAuthorIntent(parsed):
   authorFloorplate?compileFloorplateAuthorIntent(parsed):
   authorWing?compileWingAuthorIntent(parsed):
   authoredMassing?compileMassingAuthorIntent(parsed):
    rankedSection?compileSectionedAuthorIntent(parsed):
   rankedWindows?compileRankedExteriorIntent(parsed):
   compact?compileCompactModelIntent(parsed):compileRelativeAuthorIntent(parsed);
  // Only the true model/test RESPONSE is compiled. Never substitute a fixture
  // or silently edit a failing model plan into a successful candidate.
  const gal=compileB143Gallery([result.b143.design]);
  const tpl=fs.readFileSync(
   path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  const html=renderB143Html(gal,tpl);
  let sectionPrivateArtEvidence=null;
  if(rankedSection||authoredMassing||authorWing||authorFloorplate||authorAtrium||authorMezzanine||authorArcade){
   // Derive an exact pre-section control from the SAME private model response.
   // This is a second deterministic B143 compilation, NOT an extra model POST.
   const beforeAuthor=structuredClone(parsed);
   if(rankedSection)delete beforeAuthor.section;
   else if(authorArcade)delete beforeAuthor.arcade;
    else if(authorMezzanine)delete beforeAuthor.mezzanine;
   else if(authorAtrium)delete beforeAuthor.atrium;
   else if(authorFloorplate)delete beforeAuthor.floorplate;
   else {delete beforeAuthor.massing;if(authorWing)delete beforeAuthor.wing;}
   beforeAuthor.schema=authorArcade?MEZZANINE_SCHEMA:authorMezzanine?HEIGHT_SCHEMA:
    authorAtrium?FLOORPLATE_SCHEMA:authorFloorplate?WING_SCHEMA:RANKED_SCHEMA;
   const before=authorArcade?compileMezzanineAuthorIntent(beforeAuthor):
     authorMezzanine?compileHeightAuthorIntent(beforeAuthor):
    authorAtrium?compileFloorplateAuthorIntent(beforeAuthor):
    authorFloorplate?compileWingAuthorIntent(beforeAuthor):
     compileRankedExteriorIntent(beforeAuthor);
   if(before.b143.geometrySha256!==(authorArcade?
     result.unchangedMezzanineGeometrySha256:authorMezzanine?
     result.unchangedAtriumGeometrySha256:authorAtrium?
     result.unchangedFloorplateGeometrySha256:authorFloorplate?
     result.unchangedWingGeometrySha256:result.unchangedRankedGeometrySha256)||
      before.worldWrites!==0||result.worldWrites!==0||
      before.b143.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
      result.b143.sourceRoutes.status!=='SOURCE_ROUTES_REACH_ALL_ZONES'||
      result.humanArt!=='NOT_REVIEWED'||
      result.gates.some(x=>x!=='BLOCKED'))
    fail('PRIVATE_ART_PREPOST_SOURCE_DRIFT');
   const oldVox=new Map(before.b143.compiled.primitives.map(p=>[p.slice(0,3).join(','),p[3]]));
   const newVox=new Map(result.b143.compiled.primitives.map(p=>[p.slice(0,3).join(','),p[3]]));
   let removed=0,added=0,replaced=0;
   for(const [cell,mat] of oldVox){
    if(!newVox.has(cell))removed++;
    else if(newVox.get(cell)!==mat)replaced++;
   }
   for(const cell of newVox.keys())if(!oldVox.has(cell))added++;
   if(removed+added+replaced===0)fail('PRIVATE_ART_NO_MEANINGFUL_SECTION');
   const viewKind={sourceKind:'PRIVATE_SINGLE_MODEL_ATTEMPT_UNATTESTED'};
   sectionPrivateArtEvidence={
    baselineHtml:renderB143Html(compileB143Gallery([before.b143.design]),tpl),
    baselineSvg:actualOrthographicSvg(before.b143.compiled.primitives,viewKind),
    finalSvg:actualOrthographicSvg(result.b143.compiled.primitives,viewKind),
    visibilitySvg:renderB143ProjectedVisibilityDelta(
     before.b143.compiled.primitives,result.b143.compiled.primitives,viewKind),
    report:{
     schema:authorArcade?'r125-v4j-private-one-response-civic-arcade-art-hold-v1':
       authorMezzanine?'r125-v4h-private-one-response-true-mezzanine-art-hold-v1':
      authorAtrium?'r125-v4g-private-one-response-raised-functional-hall-art-hold-v1':
      authorFloorplate?'r125-v4f-private-one-response-covered-floorplate-art-hold-v1':
      authorWing?'r125-v4e-private-one-response-exterior-wing-art-hold-v1':
      rankedSection?'r125-v4e-private-one-response-b143-geometry-delta-art-hold-v1':
      'r125-v4e-private-one-response-primary-massing-art-hold-v1',
     provenance:injected?'INJECTED_TEST_DOUBLE_NOT_REAL_MODEL':
      'LOCAL_OLLAMA_CLAIM_NOT_INDEPENDENTLY_AUTHENTICATED',
     ...(rankedSection?{authoredSection:result.authoredSection}:
      {authoredMassing:result.authoredMassing,
       massingWitness:result.authoredMassingSourceWitness,
       ...(authorWing||authorFloorplate||authorAtrium||authorMezzanine||authorArcade?{authoredWing:result.authoredWing,
        wingSourceWitness:result.authoredWingSourceWitness}:{}),
       ...(authorFloorplate||authorAtrium||authorMezzanine||authorArcade?{authoredFloorplate:result.authoredFloorplate,
        floorplateSourceWitness:result.authoredFloorplateSourceWitness}:{}),
       ...(authorAtrium||authorMezzanine||authorArcade?{authoredAtrium:result.authoredAtrium,
        tallHallSourceWitness:result.authoredTallHallSourceWitness}:{}),
        ...(authorMezzanine||authorArcade?{authoredMezzanine:result.authoredMezzanine,
         mezzanineSourceWitness:result.authoredMezzanineSourceWitness,
         interiorUpperLevelProvenByRealB143:true}:{}),
         ...(authorArcade?{authoredArcade:result.authoredArcade,
          civicArcadeSourceWitness:result.authoredArcadeSourceWitness,
          actualPublicForecourtAndUpperRoute:true}:{})}),
     originalResponseSha256:report.responseRawSha256,
     baselineGeometrySha256:before.b143.geometrySha256,
     finalGeometrySha256:result.b143.geometrySha256,
     beforeB143VoxelCount:oldVox.size,afterB143VoxelCount:newVox.size,
     actuallyRemovedCells:removed,actuallyAddedCells:added,
     changedMaterialCells:replaced,
     projectedVisibilityAudit:auditB143ProjectedVisibility(
      before.b143.compiled.primitives,result.b143.compiled.primitives),
     orthographicViews:['roof','north','south','west','east'],
     extraModelRequests:0,realModelIdentityVerified:false,
     authorSourceRoutesBeforeAndAfter:'SOURCE_ROUTES_REACH_ALL_ZONES',
     humanArchitecturalArt:'NOT_REVIEWED',
     architecturalQualityConclusion:'UNASSESSED_ART_HOLD',
     minecraftWalking:'NOT_TESTED',worldContacts:0,worldWrites:0,
     readiness:'NOT_PREPARED',constructionApproved:false,
     executionAllowed:false,gates:Array(9).fill('BLOCKED'),
     BuildPlan:{operations:[]}
    }
   };
  }
  output(dir,'AUTHOR_INTENT_ORIGINAL.json',parsed);
  if(compact||rankedWindows||rankedSection||authoredMassing||authorWing||authorFloorplate||authorAtrium||authorMezzanine||authorArcade){
   output(dir,'MECHANICALLY_EXPANDED_AUTHOR_IR.json',result.expandedMechanicalIR);
   if(compact)output(dir,'GENERIC_MECHANICAL_NORMALIZATION.json',result.normalization);
   if(rankedWindows||rankedSection||authoredMassing||authorWing||authorFloorplate||authorAtrium||authorMezzanine||authorArcade)output(dir,'RANKED_GLAZING_RESOLUTION.json',{
    schema:authorArcade?CIVIC_ARCADE_SCHEMA:authorMezzanine?MEZZANINE_SCHEMA:authorAtrium?HEIGHT_SCHEMA:authorFloorplate?FLOORPLATE_SCHEMA:authorWing?WING_SCHEMA:authoredMassing?MASSING_SCHEMA:rankedSection?SECTIONED_SCHEMA:RANKED_SCHEMA,windowFaces:result.chosenWindowFaces,
    autoRepairPerformed:false,authorSelectedPriorities:true,worldWrites:0
   });
  }
  if(rankedSection)output(dir,'AUTHORED_SECTION_SOURCE.json',{
   schema:SECTIONED_SCHEMA,authorOriginalSha256:result.sectionedAuthorSha256,
   authoredSection:result.authoredSection,
   sourceWitness:result.authoredNonrectSectionWitness,
   geometrySha256:result.b143.geometrySha256,
   worldWrites:0,humanArt:'NOT_REVIEWED'
  });
  if(authoredMassing||authorWing||authorFloorplate||authorAtrium||authorMezzanine||authorArcade)output(dir,'AUTHORED_PRIMARY_MASSING_SOURCE.json',{
    schema:MASSING_SCHEMA,authorOriginalSha256:result.massingAuthorSha256,
    authoredMassing:result.authoredMassing,
    witness:result.authoredMassingSourceWitness,
    geometrySha256:result.b143.geometrySha256,worldWrites:0,humanArt:'NOT_REVIEWED'
   });
  if(authorWing||authorFloorplate||authorAtrium||authorMezzanine||authorArcade)output(dir,'AUTHORED_EXTERIOR_WING_SOURCE.json',{
   schema:WING_SCHEMA,authorOriginalSha256:result.wingAuthorSha256,
   authoredWing:result.authoredWing,
   sourceWitness:result.authoredWingSourceWitness,
   geometrySha256:result.b143.geometrySha256,
   worldWrites:0,humanArt:'NOT_REVIEWED'
  });
  if(authorFloorplate||authorAtrium||authorMezzanine||authorArcade)output(dir,'AUTHORED_COVERED_FLOORPLATE_SOURCE.json',{
   schema:FLOORPLATE_SCHEMA,authorOriginalSha256:result.floorplateAuthorSha256,
   authorSetback:result.authoredFloorplate,
   sourceWitness:result.authoredFloorplateSourceWitness,
   geometrySha256:result.b143.geometrySha256,
   worldWrites:0,humanArt:'NOT_REVIEWED'
  });
  if(authorAtrium||authorMezzanine||authorArcade)output(dir,'AUTHORED_TALL_PUBLIC_HALL_SOURCE.json',{
   schema:HEIGHT_SCHEMA,authorOriginalSha256:result.heightAuthorSha256,
   authoredAtrium:result.authoredAtrium,
   trueB143HeightWitness:result.authoredTallHallSourceWitness,
   finalGeometrySha256:result.b143.geometrySha256,
   worldContacts:0,worldWrites:0,engineering:'NOT_TESTED',
   humanArt:'NOT_REVIEWED'
  });
  if(authorMezzanine||authorArcade)output(dir,'AUTHORED_FUNCTIONAL_UPPER_GALLERY_SOURCE.json',{
   schema:MEZZANINE_SCHEMA,
   authorOriginalSha256:result.mezzanineAuthorSha256,
   authoredMezzanine:result.authoredMezzanine,
   actualB143MezzanineWitness:result.authoredMezzanineSourceWitness,
   actualUpperProgram:result.b143.program.filter(p=>p.level>0),
   geometrySha256:result.b143.geometrySha256,
   art:'NOT_REVIEWED',realMinecraftWalking:'NOT_TESTED',
   worldContacts:0,worldWrites:0
  });
   if(authorArcade)output(dir,'AUTHORED_PUBLIC_ARCADE_SOURCE.json',{
    schema:CIVIC_ARCADE_SCHEMA,originalAuthorSha256:result.civicArcadeAuthorSha256,
    authoredArcade:result.authoredArcade,
    actualB143PublicArchitecture:result.authoredArcadeSourceWitness,
    finalGeometrySha256:result.b143.geometrySha256,
    realQwen:'NOT_TESTED',humanART:'NOT_REVIEWED',
    worldContacts:0,worldWrites:0
   });
   output(dir,'TRANSLATED_AUTHOR_GRAPH.json',result.plan);
  output(dir,'TRANSLATED_AUTHOR_ENVELOPE.json',result.envelope);
  output(dir,'TRUE_B143_SOURCE.json',result.b143.design);
  output(dir,'TWO_WIDE_ROUTES_SOURCE.json',result.b143.sourceRoutes);
  output(dir,'index.html',html);
  if(sectionPrivateArtEvidence){
   output(dir,authorArcade?'BASELINE_TWO_LEVEL_GALLERY_3D_PRIVATE.html':
     authorMezzanine?'BASELINE_TALL_HALL_3D_PRIVATE.html':
    authorAtrium?'BASELINE_FLOORPLATE_3D_PRIVATE.html':
    authorFloorplate?'BASELINE_WING_3D_PRIVATE.html':
    'BASELINE_RANKED_3D_PRIVATE.html',sectionPrivateArtEvidence.baselineHtml);
   output(dir,authorArcade?'BASELINE_TWO_LEVEL_GALLERY_FIVE_VIEWS_PRIVATE.svg':
     authorMezzanine?'BASELINE_TALL_HALL_FIVE_VIEWS_PRIVATE.svg':
    authorAtrium?'BASELINE_FLOORPLATE_FIVE_VIEWS_PRIVATE.svg':
    authorFloorplate?'BASELINE_WING_FIVE_VIEWS_PRIVATE.svg':
    'BASELINE_RANKED_FIVE_VIEWS_PRIVATE.svg',sectionPrivateArtEvidence.baselineSvg);
   output(dir,authorArcade?'FINAL_PUBLIC_ARCADE_FIVE_VIEWS_PRIVATE.svg':
     authorMezzanine?'FINAL_TWO_LEVEL_PUBLIC_GALLERY_FIVE_VIEWS_PRIVATE.svg':
    authorAtrium?'FINAL_TALL_PUBLIC_HALL_FIVE_VIEWS_PRIVATE.svg':
    authorFloorplate?'FINAL_COVERED_FLOORPLATE_FIVE_VIEWS_PRIVATE.svg':
    authorWing?'FINAL_EXTERIOR_WING_FIVE_VIEWS_PRIVATE.svg':
    authoredMassing?'FINAL_PRIMARY_MASSING_FIVE_VIEWS_PRIVATE.svg':
    'FINAL_SECTIONED_FIVE_VIEWS_PRIVATE.svg',sectionPrivateArtEvidence.finalSvg);
   output(dir,authorArcade?'PRIVATE_B143_CIVIC_ARCADE_VISIBILITY_DELTA.svg':
     authorMezzanine?'PRIVATE_B143_MEZZANINE_EXTERIOR_VISIBILITY_DELTA.svg':
    authorAtrium?'PRIVATE_B143_ATRIUM_VISIBILITY_DELTA.svg':
    authorFloorplate?'PRIVATE_B143_FLOORPLATE_VISIBILITY_DELTA.svg':
    authorWing?'PRIVATE_B143_WING_VISIBILITY_DELTA.svg':
     authoredMassing?'PRIVATE_B143_MASSING_VISIBILITY_DELTA.svg':
     'PRIVATE_B143_SECTION_VISIBILITY_DELTA.svg',sectionPrivateArtEvidence.visibilitySvg);
    output(dir,authorArcade?'PRIVATE_B143_CIVIC_ARCADE_ART_HOLD_COMPARISON.json':
     authorMezzanine?'PRIVATE_B143_MEZZANINE_ART_HOLD_COMPARISON.json':
    authorAtrium?'PRIVATE_B143_ATRIUM_ART_HOLD_COMPARISON.json':
    authorFloorplate?'PRIVATE_B143_FLOORPLATE_ART_HOLD_COMPARISON.json':
    authorWing?'PRIVATE_B143_WING_ART_HOLD_COMPARISON.json':
    authoredMassing?'PRIVATE_B143_MASSING_ART_HOLD_COMPARISON.json':
    'PRIVATE_B143_SECTION_ART_HOLD_COMPARISON.json',sectionPrivateArtEvidence.report);
  }
  if(authorMezzanine||authorArcade){
   const a=result.authoredAtrium,n=result.plan.nodes.find(q=>q.id===a.spaceId);
   if(!n)fail('PRIVATE_UPPER_ROOM_NOT_PRESENT');
   const slice={x:result.authoredMezzanineSourceWitness.actualSectionPlaneX,
    zStart:n.z+a.offsetZ,zEnd:n.z+a.offsetZ+a.depth-1,
    yMax:result.b143.design.bounds.height-2};
   const beforeAuthor=structuredClone(parsed);
    delete beforeAuthor.mezzanine;if(authorArcade)delete beforeAuthor.arcade;
   beforeAuthor.schema=HEIGHT_SCHEMA;
   const initial=compileHeightAuthorIntent(beforeAuthor);
   const beforeSlice=actualB143MezzanineSectionSvg(initial.b143.compiled,
    {...slice,caption:'REAL B143 SOURCE ONLY - NOT ART OR MINECRAFT WALKING'});
   const afterSlice=actualB143MezzanineSectionSvg(result.b143.compiled,
    {...slice,caption:'REAL B143 SOURCE ONLY - NOT ART OR MINECRAFT WALKING'});
   if(beforeSlice===afterSlice)fail('PRIVATE_TWO_LEVEL_SLICE_NO_REAL_CHANGE');
   output(dir,'PRIVATE_B143_MEZZANINE_INTERIOR_BEFORE.svg',beforeSlice);
   output(dir,'PRIVATE_B143_MEZZANINE_INTERIOR_AFTER.svg',afterSlice);
  }
  report.authoredIRSha256=authorArcade?result.civicArcadeAuthorSha256:authorMezzanine?result.mezzanineAuthorSha256:authorAtrium?result.heightAuthorSha256:authorFloorplate?result.floorplateAuthorSha256:authorWing?result.wingAuthorSha256:authoredMassing?result.massingAuthorSha256:
    rankedSection?result.sectionedAuthorSha256:
   rankedWindows?result.rankedAuthorSha256:
   compact?result.compactAuthorSha256:result.originalIntentSha256;
  report.mechanizedExpandedIRSha256=(compact||rankedWindows||rankedSection||authoredMassing||authorWing||authorFloorplate||authorAtrium||authorMezzanine||authorArcade)?result.originalIntentSha256:null;
  report.translatedGraphSha256=sha(JSON.stringify(result.plan));
  report.sourceSha256=result.b143.sourceSha256;
  report.geometrySha256=result.b143.geometrySha256;
  report.actualB143VoxelCount=result.b143.compiled.primitives.length;
  report.sourceRoutesStatus=result.b143.sourceRoutes.status;
  report.sourceProof=result.b143.sourceProof;
  report.status=injected?'HOLD_TEST_DOUBLE_NOT_REAL_MODEL':
   'SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED';
  return report;
 }catch(e){
  report.reason=String(e?.message??e).slice(0,500);
  report.status=/(AbortError|aborted)/i.test(report.reason)?
   'HOLD_MODEL_TIMEOUT_OR_ABORTED':
   !report.preflightModelListed?'HOLD_LOCAL_PREFLIGHT':
   'HOLD_MODEL_OR_SOURCE_INVALID_NO_REPAIR';
  return report;
 }finally{
  report.elapsedMs=Date.now()-start;
  output(dir,'V4D_LOCAL_AUTHOR_REPORT.json',report);
  output(dir,'REVIEW_SUMMARY_SHAREABLE.json',buildV4DShareableReceipt(report));
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const opts=parseV4DLocalAuthorArgs(process.argv.slice(2));
  if(opts.help)console.log(
   'node scripts/r125-v4d-local-architect.mjs --model qwen3:14b --out NEW_PRIVATE_FOLDER [--compact|--ranked-windows|--ranked-section|--authored-massing|--authored-wing|--authored-floorplate|--authored-atrium|--authored-mezzanine] [--prompt "日本語の独自建築依頼"] [--endpoint http://127.0.0.1:11434/v1/chat/completions] (ONE LOCAL MODEL REQUEST; NO Minecraft writes)'
  );else{
   const result=await runV4DLocalAuthor(opts);
   console.log(JSON.stringify({status:result.status,reason:result.reason,
    modelCalls:result.modelCalls,realModelAuthenticated:false,
    sourceHash:result.sourceSha256,geometryHash:result.geometrySha256,
    sourceRoutes:result.sourceRoutesStatus,rawCaptured:result.rawCaptured,
    resultFolder:opts.outDir,worldWrites:0}));
   if(result.status!=='SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED')
    process.exitCode=2;
  }
 }catch(e){console.error('R125_V4D_LOCAL_AUTHOR_HOLD',String(e?.message??e));process.exitCode=2;}
}
