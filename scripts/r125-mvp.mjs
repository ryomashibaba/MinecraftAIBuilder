/**
 * R125: one-command, source-only first vertical slice.
 * Reuses the REAL B198G loopback adapter, B198A reviewer, B143 compiler,
 * B198C voxel critic and the existing B143 offline 3D viewer.
 * Never sends Minecraft commands, never selects building templates.
 *
 * node scripts/r125-mvp.mjs --prompt "小さな二階建て住宅..." --model qwen3.8:27b --out ./r125-house
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createB198GLocalModelAdapter} from '../source/ai/b198g-local-model-adapter.mjs';
import {proposeArchitecture} from '../source/ai/b198-natural-language-design.mjs';
import {verifyCompiled,MATERIALS} from '../source/ai/b143-building-dsl.mjs';
import {critiqueArchitecture} from '../source/ai/b198c-spatial-critic.mjs';
import {compileB143Gallery,renderB143Html} from './b143-gallery-core.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=x=>{throw Error('R125_'+x);};
const write=(dir,name,data)=>fs.writeFileSync(path.join(dir,name),
 typeof data==='string'?data:JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const worldBlock=()=>({
 readiness:'NOT_PREPARED',constructionApproved:false,executionAllowed:false,
 worldId:null,anchor:null,backupRef:null,worldContacts:0,worldWrites:0,
 gates:Array(9).fill('BLOCKED'),BuildPlan:{operations:[]}
});
const validPrompt=p=>typeof p==='string'&&p.trim().length>=8&&
 p.length<=6100&&!/[\u0000-\u0008\u000b-\u001f]/.test(p);
const validModel=m=>typeof m==='string'&&/^[A-Za-z0-9._:/-]{2,140}$/.test(m);

export function parseR125Args(argv){
 if(argv.length===1&&argv[0]==='--help')return {help:true};
 const allowed=new Set(['--prompt','--prompt-file','--model','--out','--endpoint']);
 const args={};
 for(let i=0;i<argv.length;i++){
  const flag=argv[i],value=argv[++i];
  if(!allowed.has(flag)||Object.hasOwn(args,flag)||!value||value.startsWith('--'))
   fail('INVALID_OR_REPEATED_ARGUMENT_'+flag);
  args[flag]=value;
 }
 if(Boolean(args['--prompt'])===Boolean(args['--prompt-file']))
  fail('EXACTLY_ONE_PROMPT_SOURCE_REQUIRED');
 if(!validModel(args['--model'])||!args['--out'])fail('MODEL_AND_OUTPUT_REQUIRED');
 const prompt=args['--prompt-file']?
  fs.readFileSync(path.resolve(args['--prompt-file']),'utf8'):args['--prompt'];
 if(!validPrompt(prompt))fail('PROMPT_LENGTH_OR_CONTROLS');
 const endpoint=args['--endpoint']??undefined;
 if(endpoint!==undefined&&!/^http:\/\/127\.0\.0\.1:[0-9]{2,5}\/v1\/chat\/completions$/.test(endpoint))
  fail('LOOPBACK_ENDPOINT_ONLY');
 return {prompt,model:args['--model'],outDir:path.resolve(args['--out']),endpoint};
}

/** Preview only: these local voxels are NOT executable world placements. */
export function makeUnboundWorldPreview(compiled){
 if(!compiled?.designOnly||compiled.readiness!=='NOT_PREPARED'||
  compiled.BuildPlan?.operations?.length!==0||!Array.isArray(compiled.primitives))
  fail('COMPILER_WORLD_CONTRACT_VIOLATION');
 const cellDigest=sha(JSON.stringify(compiled.primitives));
 return {
  schema:'minecraftaibuilder-r125-unbound-world-preview-v1',
  sourceSha256:compiled.sourceSha256,geometrySha256:compiled.geometrySha256,
  targetEdition:'MINECRAFT_EDUCATION',
  localBounds:compiled.bounds,localVoxelCount:compiled.primitives.length,
  palette:MATERIALS,localVoxelDataFile:'B143_SCENE.json',
  localVoxelDataSha256:cellDigest,
  materialCounts:compiled.stats.layerCounts,
  translationAllowed:false,worldId:null,anchor:null,backupRef:null,
  executableOperations:[],checksum:sha(compiled.sourceSha256+':'+cellDigest),
  blockers:['WORLD_ID_UNVERIFIED','ANCHOR_UNVERIFIED','BACKUP_AND_RESTORE_UNVERIFIED',
   'BLOCK_MAPPING_UNVERIFIED','REGION_OCCUPANCY_UNVERIFIED','WORLD_IO_UNAVAILABLE',
   'IN_WORLD_WALKABILITY_UNVERIFIED'],
  status:'UNBOUND_NO_WORLD_WRITES'
 };
}

/**
 * A generator is permitted only as an explicitly identified test double.
 * The real path uses exactly one local model request and captures the raw
 * message.content string BEFORE B198A/B143 validation, even on DSL failure.
 */
export async function runR125({prompt,model,outDir,endpoint}={}, {generator=null}={}){
 if(!validPrompt(prompt)||!validModel(model)||typeof outDir!=='string'||!outDir.trim())
  fail('INVALID_REQUEST');
 // Adapter validates endpoint before first HTTP call; do not create evidence
 // in an existing directory and never overwrite a prior original capture.
 if(generator!==null&&typeof generator!=='function')fail('INVALID_TEST_GENERATOR');
 if(fs.existsSync(outDir))fail('OUTPUT_ALREADY_EXISTS');
 const live=generator===null;
 const dir=path.resolve(outDir);
 fs.mkdirSync(dir,{recursive:false});
 const start=Date.now();
 write(dir,'REQUEST.json',{prompt,model,endpoint:endpoint??'DEFAULT_LOCAL_LOOPBACK',
  provider:live?'EXPLICIT_LOCAL_LOOPBACK':'INJECTED_TEST_DOUBLE',
  modelQuantization:'UNKNOWN_NOT_VERIFIED',captureStartedAt:new Date().toISOString()});
 let rawCaptured=false,modelCalls=0;
 const fetchAndCapture=async(url,options)=>{
  const response=await fetch(url,options);
  // clone does not issue another request. Preserve the exact decoded assistant
  // content (not an invented JSON reconstruction) before any DSL parsing.
  const text=await response.clone().text();
  if(text.length<=1000000){
   try{
    const raw=JSON.parse(text)?.choices?.[0]?.message?.content;
    if(typeof raw==='string'&&raw.length<=60000){
     write(dir,'MODEL_RESPONSE_ORIGINAL.txt',raw);
     rawCaptured=true;
    }
   }catch(e){
    if(e?.code==='EEXIST')throw e;
    // Malformed HTTP data is independently rejected by the real adapter.
   }
  }
  return response;
 };
 try{
  const adapter=generator??createB198GLocalModelAdapter({
   model,...(endpoint?{endpoint}:{}),fetcher:fetchAndCapture
  });
  const counted=async request=>{
   modelCalls++;
   return adapter(request);
  };
  const proposal=await proposeArchitecture({prompt,generator:counted,maxAttempts:1});
  if(!verifyCompiled(proposal.design,proposal.compiled))
   fail('COMPILER_NONDETERMINISTIC');
  const critique=critiqueArchitecture({design:proposal.design,compiled:proposal.compiled});
  const gallery=compileB143Gallery([proposal.design]);
  const template=fs.readFileSync(path.join(ROOT,'source/ai/b143-viewer-template.html'),'utf8');
  const html=renderB143Html(gallery,template);
  const preview=makeUnboundWorldPreview(proposal.compiled);
  write(dir,'B143_SOURCE.json',proposal.design);
  write(dir,'B143_SCENE.json',proposal.compiled);
  write(dir,'B143_SOURCE_REVIEW.json',proposal.review);
  write(dir,'B198C_GEOMETRY_CRITIQUE.json',critique);
  write(dir,'R125_WORLD_PREVIEW.json',preview);
  write(dir,'index.html',html);
  const status=critique.highRiskCount>0?'HOLD_SOURCE_GEOMETRY':
   'SOURCE_CANDIDATE_HUMAN_REVIEW_REQUIRED';
  const report={
   schema:'minecraftaibuilder-r125-first-slice-v1',status,
   provider:live?'EXPLICIT_LOCAL_LOOPBACK':'INJECTED_TEST_DOUBLE',
   providerIdentityVerified:false,originalRawCaptured:rawCaptured,
   modelId:model,modelCallCount:modelCalls,
   sourceSha256:proposal.compiled.sourceSha256,
   geometrySha256:proposal.compiled.geometrySha256,
   occupiedVoxels:proposal.compiled.primitives.length,
   highRiskSourceFindings:critique.highRiskCount,
   sourceReview:'B143_COMPILED_VERIFIED',
   realVoxel3D:'B143_LOCAL_SCENE_RENDERABLE',
   artisticReview:'NOT_REVIEWED',userSemanticMatch:'NOT_REVIEWED',
   minecraftWalkability:'NOT_TESTED',mac8Gb2B:'NOT_TESTED',
   elapsedMs:Date.now()-start,world:worldBlock()
  };
  write(dir,'R125_REPORT.json',report);
  return report;
 }catch(error){
  const report={schema:'minecraftaibuilder-r125-first-slice-v1',
   status:'HOLD_GENERATION_OR_REVIEW',
   reason:String(error?.message??error).slice(0,450),
   provider:live?'EXPLICIT_LOCAL_LOOPBACK':'INJECTED_TEST_DOUBLE',
   originalRawCaptured:rawCaptured,modelId:model,modelCallCount:modelCalls,
   elapsedMs:Date.now()-start,world:worldBlock(),
   sourceReview:'HOLD',realVoxel3D:'NOT_ESTABLISHED',
   artisticReview:'NOT_REVIEWED',minecraftWalkability:'NOT_TESTED'};
  write(dir,'R125_REPORT.json',report);
  return report;
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const options=parseR125Args(process.argv.slice(2));
  if(options.help)console.log('node scripts/r125-mvp.mjs --prompt "日本語の建築依頼" --model LOCAL_MODEL_ID --out NEW_DIR [--endpoint http://127.0.0.1:11434/v1/chat/completions]\nOR --prompt-file UTF8_TEXT_FILE instead of --prompt. Source-only; never writes Minecraft.');
  else{
   const report=await runR125(options);
   console.log(JSON.stringify({status:report.status,modelCalls:report.modelCallCount,
    sourceSha256:report.sourceSha256??null,output:options.outDir,
    worldWrites:0}));
   if(report.status.startsWith('HOLD'))process.exitCode=2;
  }
 }catch(error){
  console.error('R125_HOLD',String(error?.message??error));process.exitCode=2;
 }
}
