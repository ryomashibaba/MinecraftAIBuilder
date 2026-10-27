/**
 * R190-F opt-in LOCAL research. No default network call; no world API.
 * Example: node scripts/r190-local-semantic-run.mjs --model qwen3:14b
 *   --prompt "..." --out ./NEW_DIR [--required multiple-levels,stairs]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createB198SNativeBridge} from '../source/ai/b198s-native-ollama-source.mjs';
import {createR190SemanticModelAdapter,createB198GLocalModelAdapter}
 from '../source/ai/b198g-local-model-adapter.mjs';
import {reviewR4PlannedProposal} from '../source/ai/b198zr4-planned-source.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';
import {renderR164Elevation} from './r164-exterior-audit.mjs';
export const USAGE='--model MODEL --prompt REQUEST --out NEW_DIR [--mode semantic|architectural-b143] [--transport openai|native] [--endpoint http://127.0.0.1:11434/v1/chat/completions] [--required capability1,capability2] [--expect expectations.json]';
export function parseR190Arguments(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 if(!args.length||args.length%2!==0)throw Error('R190_F_ARGUMENTS '+USAGE);
 const out={},allowed=new Set(['--model','--prompt','--out','--mode','--transport','--endpoint','--required','--expect']);
 for(let i=0;i<args.length;i+=2){
  const k=args[i],v=args[i+1];
  if(!allowed.has(k)||Object.hasOwn(out,k)||!v)throw Error('R190_F_FLAG_'+k);
  out[k]=v;
 }
 for(const key of ['--model','--prompt','--out'])
  if(!out[key])throw Error('R190_F_MISSING_'+key);
 const mode=out['--mode']??'semantic';
 if(!['semantic','architectural-b143'].includes(mode))
  throw Error('R190_H_INVALID_MODE');
 if(mode==='architectural-b143'&&(out['--required']||out['--expect']))
  throw Error('R190_H_DIRECT_MODE_CANNOT_CERTIFY_R190_EXPECTATIONS');
 const transport=out['--transport']??'openai';
 if(!['openai','native'].includes(transport)||(mode!=='architectural-b143'&&transport!=='openai'))
  throw Error('R190_I_INVALID_TRANSPORT_FOR_MODE');
 return {mode,transport,model:out['--model'],prompt:out['--prompt'],out:out['--out'],
  endpoint:out['--endpoint'],
  requiredCapabilities:out['--required']?out['--required'].split(','):[],
  expectFile:out['--expect']??null};
}
/**
 * R190-H: use the already existing one-response R4 model-declared spatialPlan
 * + full B143 design. It is deliberately NOT squeezed into the old one-floor
 * R190 tree IR. Provider identity, natural-language coverage and art quality
 * remain unverified. All files are local source-only research.
 */
const sha256=value=>createHash('sha256').update(value,'utf8').digest('hex');
async function runR190ArchitecturalB143(options,target,fetcher){
 if(options.expectFile!==null||options.requiredCapabilities.length)
  throw Error('R190_H_DIRECT_MODE_CANNOT_CERTIFY_R190_EXPECTATIONS');
 // R190-I: capture the exact original response for an expensive LOCAL run.
 // Reuse B198S rather than inventing another native Ollama transport.
 let originalRaw=null;
 const native=(options.transport==='native')?createB198SNativeBridge({
  plannedSourceMode:true,
  onModelResponse:({originalContent})=>{originalRaw=originalContent;}
 }):null;
 const generator=createB198GLocalModelAdapter({
  model:options.model,plannedSourceMode:true,
  fetcher:native?.fetcher??fetcher,
  onRawModelResponse:raw=>{
   if(originalRaw!==null&&originalRaw!==raw)
    throw Error('R190_I_PROVIDER_RAW_MISMATCH');
   originalRaw=raw;
  },
  ...(options.endpoint?{endpoint:options.endpoint}:{})
 });
 const originalRequestSha256=sha256(options.prompt);
 let review;
 try{
  const modelResponse=await generator({mode:'creation',prompt:options.prompt,
   previousDesign:null,feedback:[],attempt:1,maxAttempts:1});
  review=reviewR4PlannedProposal(modelResponse);
 }catch(error){
  // A reply that failed parsing or compiling is still critical evidence:
  // keep its unchanged bytes and the brief, never synthesize replacement 3D.
  // Failed connections without model content must NOT fabricate a run record.
  if(originalRaw!==null){
   const code=String(error?.message??'REJECTED').slice(0,160);
   const hold={schema:'minecraftaibuilder-r190-i-capture-v1',
    status:'HOLD_MODEL_RESPONSE_OR_SOURCE_INVALID',
    failureCode:code,modelRequested:options.model,
    transport:options.transport??'openai',providerResponseObserved:true,
    originalRawSha256:sha256(originalRaw),originalRequestSha256,
    rawProviderBytesPreserved:true,sourceGenerated:false,
    modelIdentityCryptographicallyVerified:false,
    independentRequestCoverage:'NOT_CERTIFIED',
    humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',
    readiness:'NOT_PREPARED',constructionApproved:false,
    executionAllowed:false,gates:Array(9).fill('BLOCKED'),
    BuildPlan:{operations:[]},worldWrites:0,worldContacts:0};
   fs.mkdirSync(target);
   fs.writeFileSync(path.join(target,'R190_I_ORIGINAL_RESPONSE.txt'),originalRaw,{flag:'wx'});
   fs.writeFileSync(path.join(target,'R190_I_ORIGINAL_BRIEF.txt'),options.prompt,{flag:'wx'});
   fs.writeFileSync(path.join(target,'R190_I_CAPTURE_RECEIPT.json'),
    JSON.stringify(hold,null,2)+'\n',{flag:'wx'});
   const rejected=Error('R190_I_CAPTURED_HOLD_'+code);
   rejected.code='R190_I_CAPTURED_HOLD';throw rejected;
  }
  throw error;
 }
 const safety=review.safety;
 if(safety.readiness!=='NOT_PREPARED'||safety.constructionApproved!==false||
  safety.executionAllowed!==false||safety.worldWrites!==0||
  safety.worldContacts!==0||safety.gates.length!==9||
  safety.gates.some(g=>g!=='BLOCKED')||safety.BuildPlan.operations.length)
  throw Error('R190_H_WORLD_SAFETY_BROKEN');
 // This gallery is compiled from the model's exact B143 source, not a host
 // generated surrogate or concept image. 3D and five projections match it.
 const template=fs.readFileSync(path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../source/ai/b143-viewer-template.html'),'utf8');
 const gallery=compileB143Gallery([review.design]);
 if(gallery.sourceHashes[0]!==review.compiled.sourceSha256||
  gallery.geometryHashes[0]!==review.compiled.geometrySha256)
  throw Error('R190_H_SOURCE_PREVIEW_MISMATCH');
 const html=renderB143Html(gallery,template);
 const receipt={
  schema:'minecraftaibuilder-r190-h-direct-b143-research-v1',
  mode:'architectural-b143',status:review.status,
  declaredPlanReviewStatus:review.declaredPlanReview.status,
  independentAcceptanceReview:'NOT_SUPPLIED',
  originalRequestCoverage:'NOT_INDEPENDENTLY_CERTIFIED',
  architecturalProgramAuthorship:'PROVIDER_RESPONSE_UNVERIFIED',
  hostFilledGeometry:false,hostFilledTopology:false,
  hostModifiedModelSource:false,modelIdentityCryptographicallyVerified:false,
  actualModelCallsByThisResearchRunner:1,
  localProviderResponses:1,rawProviderBytesPreserved:true,
  originalRawSha256:sha256(originalRaw),originalRequestSha256,
  transport:options.transport??'openai',
  nativeOllamaTelemetry:native?.telemetry()??null,
  modelRequested:options.model,
  designIntent:review.plan.designIntent,
  massStrategy:review.plan.massStrategy,
  circulationStrategy:review.plan.circulationStrategy,
  sourceSha256:review.compiled.sourceSha256,
  geometrySha256:review.compiled.geometrySha256,
  trueB143Voxels:review.compiled.primitives.length,
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',constructionApproved:false,
  executionAllowed:false,gates:Array(9).fill('BLOCKED'),
  BuildPlan:{operations:[]},worldWrites:0,worldContacts:0
 };
 if(originalRaw===null)throw Error('R190_I_MISSING_ORIGINAL_RESPONSE');
 // Save even a formal spatial HOLD for inspection; this is not construction.
 const outputs=new Map([
  ['R190_I_ORIGINAL_RESPONSE.txt',originalRaw],
  ['R190_I_ORIGINAL_BRIEF.txt',options.prompt],
  ['R190_H_MODEL_DESIGNED_B143.json',JSON.stringify(review.design,null,2)+'\n'],
  ['R190_H_MODEL_SPATIAL_PLAN.json',JSON.stringify(review.plan,null,2)+'\n'],
  ['R190_H_FORMAL_SOURCE_REVIEW.json',JSON.stringify({
   status:review.status,declaredPlanReview:review.declaredPlanReview,
   independentReview:review.independentReview,
   planProvenance:review.planProvenance,
   modelExplanation:review.modelExplanation,
   modelAssumptions:review.modelAssumptions,
   sourceSha256:receipt.sourceSha256,geometrySha256:receipt.geometrySha256,
   safety:review.safety},null,2)+'\n'],
  ['R190_H_RECEIPT.json',JSON.stringify(receipt,null,2)+'\n'],
  ['R190_H_REAL_B143_3D.html',html]
 ]);
 for(const side of ['front','rear','west','east','roof'])
  outputs.set('R190_H_'+side+'.svg',
   renderR164Elevation(review.compiled,review.design,side));
 fs.mkdirSync(target);
 for(const [name,value] of outputs)
  fs.writeFileSync(path.join(target,name),value,{flag:'wx'});
 return {destination:target,...receipt};
}
export async function runR190Local(options,{fetcher=fetch}={}){
 if(options.help)return {help:USAGE};
 const target=path.resolve(options.out);
 if(fs.existsSync(target))throw Error('R190_F_REFUSE_EXISTING_OUTPUT');
 if(!fs.existsSync(path.dirname(target)))throw Error('R190_F_PARENT_MISSING');
 if((options.mode??'semantic')==='architectural-b143')
  return runR190ArchitecturalB143(options,target,fetcher);
 const acceptanceSpec=options.expectFile===null?null:
  JSON.parse(fs.readFileSync(options.expectFile,'utf8'));
 const run=createR190SemanticModelAdapter({
  model:options.model,fetcher,...(options.endpoint?{endpoint:options.endpoint}:{})
 });
 // One actual HTTP request only if the user explicitly executes this script.
 const audit=await run({prompt:options.prompt,
  requiredCapabilities:options.requiredCapabilities,acceptanceSpec});
 if(audit.worldWrites!==0||audit.worldContacts!==0||
  audit.gates.some(g=>g!=='BLOCKED')||audit.BuildPlan.operations.length)
  throw Error('R190_F_UNSAFE_AUDIT');
 fs.mkdirSync(target);
 fs.writeFileSync(path.join(target,'R190_F_MODEL_INTENT_SOURCE_ONLY.json'),
  JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 const summary={status:audit.status,modelRequested:options.model,
  localProviderResponses:1,modelIdentityCryptographicallyVerified:false,
  realModelQualityNotCertified:true,
  userIntentCoverage:audit.userIntentCoverage.status,
  sourceGenerated:audit.sourceGenerated,
  sourceSha256:audit.sourceResult?.sourceSha256??null,
  humanArtReview:'ART_HOLD',minecraftWalking:'NOT_TESTED',
  readiness:'NOT_PREPARED',worldWrites:0,worldContacts:0};
 fs.writeFileSync(path.join(target,'R190_F_RUN_RECEIPT.json'),
  JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 runR190Local(parseR190Arguments(process.argv.slice(2)))
  .then(r=>console.log(JSON.stringify(r)))
  .catch(e=>{console.error('R190_F_FAIL_CLOSED',String(e?.message??e));process.exitCode=1;});
}
